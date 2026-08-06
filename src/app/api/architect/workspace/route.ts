import { NextRequest, NextResponse } from 'next/server';
import { requireDevMode } from '@/lib/editor/api-guards';
import { getWorkspaceProvider } from '@/engine/architect/workspace/prime-agent-provider';
import { ACCEPTANCE_GATES, EDITOR_RELIABILITY_WORKFLOW } from '@/engine/architect/workspace/acceptance-gates';
import { EVALUATION_METRICS, CANONICAL_EVALUATION_TASK } from '@/engine/architect/workspace/evaluation';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/architect/workspace
 *   Returns workspace agent provider info, sessions, acceptance gates,
 *   evaluation metrics, and skills.
 *
 * POST /api/architect/workspace
 *   Starts a session, sends instruction, or lists sessions.
 */

export async function GET() {
  const devGuard = requireDevMode();
  if (devGuard) return devGuard;

  const provider = getWorkspaceProvider();
  const sessions = await provider.listSessions();

  return NextResponse.json({
    provider: {
      providerId: provider.providerId,
      displayName: provider.displayName,
      available: provider.available,
    },
    sessions,
    acceptanceGates: ACCEPTANCE_GATES,
    editorReliabilityWorkflow: EDITOR_RELIABILITY_WORKFLOW,
    evaluationMetrics: EVALUATION_METRICS,
    canonicalTask: CANONICAL_EVALUATION_TASK,
    skills: [
      'repo-truth',
      'browser-reliability',
      'evidence-bundle',
      'capability-promotion',
      'worktree-safety',
      'architecture-conformance',
    ],
    summary: {
      totalSessions: sessions.length,
      activeSessions: sessions.filter((s) => s.status === 'running').length,
      totalGates: ACCEPTANCE_GATES.length,
      totalSkills: 6,
    },
  });
}

export async function POST(req: NextRequest) {
  const devGuard = requireDevMode();
  if (devGuard) return devGuard;

  try {
    const body = await req.json();
    const { action, params } = body as { action: string; params?: Record<string, unknown> };
    const provider = getWorkspaceProvider();

    switch (action) {
      case 'startSession': {
        const request = params as {
          instruction: string;
          role: string;
          worktreePath: string;
          baseCommitSha: string;
          model?: string;
        };

        // SAFETY: Validate worktree is not the main repo
        if (!request.worktreePath || request.worktreePath === '/home/z/my-project') {
          return NextResponse.json(
            { error: 'SAFETY: worktreePath must be an isolated worktree, not the main repo' },
            { status: 400 },
          );
        }

        const session = await provider.startSession({
          requestId: `req-${Date.now().toString(36)}`,
          instruction: request.instruction,
          role: request.role as never,
          worktreePath: request.worktreePath,
          baseCommitSha: request.baseCommitSha,
          model: request.model,
        });
        return NextResponse.json({ ok: true, session });
      }

      case 'sendInstruction': {
        const { sessionId, instruction } = params as { sessionId: string; instruction: string };
        await provider.sendInstruction(sessionId, instruction);
        return NextResponse.json({ ok: true });
      }

      case 'listSessions': {
        const sessions = await provider.listSessions();
        return NextResponse.json({ ok: true, sessions });
      }

      case 'getEvidence': {
        const { sessionId } = params as { sessionId: string };
        const evidence = await provider.getEvidence(sessionId);
        return NextResponse.json({ ok: true, evidence });
      }

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 },
        );
    }
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Invalid request' },
      { status: 400 },
    );
  }
}
