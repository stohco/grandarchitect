import { NextRequest, NextResponse } from 'next/server';
import { requireDevMode } from '@/lib/editor/api-guards';
import { getEngineRuntime } from '@/engine/runtime/engine-runtime';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/engine/runtime
 *   Returns the engine runtime state — the single authoritative path.
 *
 * POST /api/engine/runtime
 *   Executes a runtime action: start, stop, step, submitCommand.
 */

export async function GET() {
  const devGuard = requireDevMode();
  if (devGuard) return devGuard;

  const runtime = getEngineRuntime();
  const info = runtime.getInfo();
  const transactions = runtime.world.getTransactions();
  const auditTrail = runtime.gateway.getAuditTrail();

  return NextResponse.json({
    info,
    transactions: transactions.slice(-10),
    auditTrail: auditTrail.slice(-10),
    cells: runtime.world.listCells().map((c) => ({
      cellId: c.cellId,
      revision: c.revision,
      activeLayers: c.activeLayers,
    })),
  });
}

export async function POST(req: NextRequest) {
  const devGuard = requireDevMode();
  if (devGuard) return devGuard;

  try {
    const body = await req.json();
    const { action, params } = body as { action: string; params?: Record<string, unknown> };
    const runtime = getEngineRuntime();

    switch (action) {
      case 'start':
        runtime.scheduler.start();
        return NextResponse.json({ ok: true, running: true });

      case 'stop':
        runtime.scheduler.stop();
        return NextResponse.json({ ok: true, running: false });

      case 'step':
        runtime.scheduler.step();
        return NextResponse.json({ ok: true, tick: runtime.scheduler.getTick() });

      case 'submitCommand': {
        const { type, payload, principalId } = params as {
          type: string;
          payload: Record<string, unknown>;
          principalId: string;
        };

        // Authenticate
        const session = runtime.gateway.authenticate({
          principalId: principalId ?? 'user',
          token: 'dev-token',
        });
        if (!session) {
          return NextResponse.json({ error: 'Authentication failed' }, { status: 403 });
        }

        // Create command
        const command = {
          commandId: `cmd-${Date.now().toString(36)}`,
          type,
          payload,
          requestedBy: session.principal,
          baseRevision: runtime.world.getRevision(),
        };

        // Authorize
        if (!runtime.gateway.authorize(session, command)) {
          return NextResponse.json({ error: 'Authorization denied' }, { status: 403 });
        }

        // Submit
        const tx = await runtime.commands.submit(command);

        // Invalidate derived artifacts for affected cells
        for (const cellId of tx.affectedCells) {
          runtime.coordinator.invalidateCell(cellId, tx.invalidatedArtifacts);
        }

        return NextResponse.json({ ok: true, transaction: tx });
      }

      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Invalid request' },
      { status: 400 },
    );
  }
}
