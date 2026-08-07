import { NextRequest, NextResponse } from 'next/server';
import { requireDevMode } from '@/lib/editor/api-guards';
import { getUiActionRegistry } from '@/lib/studio-ui/action-registry';
import { buildCapabilityAccessMatrix } from '@/lib/studio-ui/action-registry';
import '@/lib/studio-ui/action-registrations'; // Ensures all actions are registered
import { WORKSPACES } from '@/lib/studio-ui/workspaces';
import { getJobCenter } from '@/lib/studio-ui/workspaces';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/studio-ui
 *   Returns the UI Action Registry, workspaces, and capability matrix.
 *
 * POST /api/studio-ui
 *   Searches actions or invokes one.
 */

export async function GET() {
  const devGuard = requireDevMode();
  if (devGuard) return devGuard;

  const registry = getUiActionRegistry();
  const stats = registry.getStats();
  const matrix = buildCapabilityAccessMatrix(registry);
  const jobs = getJobCenter().list();

  return NextResponse.json({
    workspaces: WORKSPACES.map((w) => ({
      id: w.id,
      name: w.name,
      description: w.description,
      icon: w.icon,
      bottomDockTabs: w.bottomDockTabs,
    })),
    actions: registry.list().map((a) => ({
      id: a.id,
      label: a.label,
      description: a.description,
      category: a.category,
      workspace: a.workspace,
      maturity: a.maturity,
      shortcut: a.shortcut,
      keywords: a.keywords,
      undoable: a.undoable,
      dangerous: a.dangerous,
      capabilityId: a.capabilityId,
      disabledReason: a.disabledReason,
    })),
    shortcuts: registry.getShortcuts(),
    capabilityMatrix: matrix,
    stats,
    jobs: jobs.slice(0, 20),
    summary: {
      totalActions: stats.totalActions,
      totalWorkspaces: WORKSPACES.length,
      totalCapabilities: matrix.length,
      activeJobs: jobs.filter((j) => j.status === 'running' || j.status === 'queued').length,
    },
  });
}

export async function POST(req: NextRequest) {
  const devGuard = requireDevMode();
  if (devGuard) return devGuard;

  try {
    const body = await req.json();
    const { action, query, actionId, context } = body as {
      action: 'search' | 'invoke' | 'available';
      query?: string;
      actionId?: string;
      context?: Record<string, unknown>;
    };

    const registry = getUiActionRegistry();

    if (action === 'search') {
      const results = registry.search(query ?? '');
      return NextResponse.json({
        ok: true,
        results: results.map((a) => ({
          id: a.id,
          label: a.label,
          description: a.description,
          category: a.category,
          workspace: a.workspace,
          maturity: a.maturity,
          shortcut: a.shortcut,
        })),
        count: results.length,
      });
    }

    if (action === 'invoke') {
      const def = registry.get(actionId!);
      if (!def) {
        return NextResponse.json({ error: `Action not found: ${actionId}` }, { status: 404 });
      }

      const ctx = {
        selectedEntityIds: [],
        selectedAssetIds: [],
        activeWorkspace: 'world' as const,
        worldLoaded: true,
        inPlaytestMode: false,
        worldRevision: 0,
        data: context,
      };

      const availCheck = def.availability(ctx);
      if (!availCheck.available) {
        return NextResponse.json({
          error: `Action unavailable: ${availCheck.reason}`,
          remediation: availCheck.remediation,
        }, { status: 403 });
      }

      const controller = new AbortController();
      const result = await def.invoke(ctx, controller.signal);
      return NextResponse.json({ ok: true, result });
    }

    if (action === 'available') {
      const ctx = {
        selectedEntityIds: [],
        selectedAssetIds: [],
        activeWorkspace: 'world' as const,
        worldLoaded: true,
        inPlaytestMode: false,
        worldRevision: 0,
        data: context,
      };
      const available = registry.getAvailable(ctx);
      return NextResponse.json({
        ok: true,
        actions: available.map((a) => ({
          id: a.id,
          label: a.label,
          available: a.available,
          reason: a.reason,
        })),
      });
    }

    return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Invalid request' },
      { status: 400 },
    );
  }
}
