/**
 * POST /api/architect/authorial/undo
 * -----------------------------------
 * Undoes a specific transaction from the most recent vertical slice by
 * submitting a `transaction.undo` command through executeCommand().
 *
 * This is a REAL undo — it applies the inverse operations from the
 * transaction, restoring the world to the prior revision.
 *
 * Body: { transactionId?: string }
 *   - If transactionId is omitted, undoes the LAST transaction from the
 *     most recent slice.
 *
 * Returns: { ok, undoResult }
 *   - undoResult.success — whether the undo command was accepted
 *   - undoResult.restoredRevision — the world revision after undo
 *   - undoResult.error — if the undo failed
 */

import { NextResponse } from 'next/server';
import { listSliceTraces } from '@/engine/architect/authorial/vertical-slice';
import { getEngineRuntime } from '@/engine/runtime/engine-runtime';
import type { WorldCommand } from '@/engine/runtime/types';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({})) as { transactionId?: string };

    const traces = await listSliceTraces();
    if (traces.length === 0) {
      return NextResponse.json(
        { ok: false, error: 'No vertical slices have been run. Nothing to undo.' },
        { status: 400 },
      );
    }

    const mostRecent = traces[0];
    const details = mostRecent.transactionDetails ?? [];
    if (details.length === 0) {
      return NextResponse.json(
        { ok: false, error: 'Most recent slice has no recorded transactions.' },
        { status: 400 },
      );
    }

    // Find the transaction to undo.
    const target = body.transactionId
      ? details.find((d) => d.transactionId === body.transactionId)
      : details[details.length - 1];

    if (!target) {
      return NextResponse.json(
        { ok: false, error: `Transaction ${body.transactionId} not found in most recent slice.` },
        { status: 404 },
      );
    }

    const runtime = getEngineRuntime();

    // Authenticate through the gateway.
    const session = runtime.gateway.authenticate({
      principalId: 'authorial-grand-architect',
      token: 'authorial-undo-token',
    });
    if (!session) {
      return NextResponse.json(
        { ok: false, error: 'Authentication failed.' },
        { status: 403 },
      );
    }

    // Submit the undo command through the single authoritative path.
    const undoCommand: WorldCommand = {
      commandId: `cmd-undo-${target.transactionId}-${Date.now().toString(36)}`,
      type: 'transaction.undo',
      payload: {
        transactionId: target.transactionId,
      },
      requestedBy: session.principal,
      baseRevision: runtime.getInfo().revision,
    };

    const beforeRev = runtime.getInfo().revision;
    let undoResult: { success: boolean; restoredRevision: number; error?: string };

    try {
      const result = await runtime.executeCommand(session, undoCommand);
      const afterRev = runtime.getInfo().revision;
      undoResult = {
        success: true,
        restoredRevision: afterRev,
      };

      // Update the transaction detail's undoResult in the persisted trace.
      target.undoResult = undoResult;

      return NextResponse.json({
        ok: true,
        undoResult,
        beforeRevision: beforeRev,
        afterRevision: afterRev,
        undoneTransactionId: target.transactionId,
        invalidatedCells: result.invalidatedCells,
      });
    } catch (err) {
      undoResult = {
        success: false,
        restoredRevision: beforeRev,
        error: (err as Error).message,
      };
      return NextResponse.json({
        ok: false,
        undoResult,
        error: (err as Error).message,
      }, { status: 500 });
    }
  } catch (err) {
    return NextResponse.json({ ok: false, error: (err as Error).message }, { status: 500 });
  }
}
