import { NextRequest, NextResponse } from 'next/server';
import { requireDevMode } from '@/lib/editor/api-guards';
import { PrimeAgentAdapter } from '@/engine/architect/rlm/prime-agent-adapter';
import type { RLMProvider } from '@/engine/architect/rlm/types';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/architect/rlm
 *   Returns RLM provider info, children, skills, harness state, goals.
 *
 * POST /api/architect/rlm
 *   Executes an RLM action: spawnChild, sendMessage, refine, setGoal, etc.
 *
 * All actions are currently MOCKED — Prime Agent requires a Python runtime
 * that cannot run in the browser/Next.js. The interface is real; the
 * implementation returns mock results for testing.
 */

let providerInstance: RLMProvider | null = null;

function getProvider(): RLMProvider {
  if (!providerInstance) {
    providerInstance = new PrimeAgentAdapter();
  }
  return providerInstance;
}

export async function GET() {
  const devGuard = requireDevMode();
  if (devGuard) return devGuard;

  const provider = getProvider();
  const [children, skills, harness, goals] = await Promise.all([
    provider.listChildren(),
    provider.listSkills(),
    provider.getHarnessState(),
    provider.getGoals(),
  ]);

  return NextResponse.json({
    provider: {
      providerId: provider.providerId,
      displayName: provider.displayName,
      modelVersion: provider.modelVersion,
      available: provider.available,
    },
    children,
    skills,
    harness,
    goals,
    summary: {
      totalChildren: children.length,
      totalSkills: skills.length,
      totalHarnessEntries:
        harness.supplementalPrompts.length +
        harness.memories.length +
        harness.skillDescriptions.length +
        harness.subagentSpecs.length,
      activeGoals: goals.filter((g) => g.status === 'active').length,
    },
  });
}

export async function POST(req: NextRequest) {
  const devGuard = requireDevMode();
  if (devGuard) return devGuard;

  try {
    const body = await req.json();
    const { action, params } = body as { action: string; params?: Record<string, unknown> };
    const provider = getProvider();

    switch (action) {
      case 'spawnChild': {
        const task = params as { instruction: string; model?: string };
        const handle = await provider.spawnChild({
          taskId: `task-${Date.now().toString(36)}`,
          instruction: task.instruction,
          model: task.model,
        });
        return NextResponse.json({ ok: true, handle });
      }
      case 'refine': {
        const result = await provider.refine();
        return NextResponse.json({ ok: true, result });
      }
      case 'setGoal': {
        const objective = (params as { objective: string }).objective;
        const goal = await provider.setGoal(objective);
        return NextResponse.json({ ok: true, goal });
      }
      case 'getHarnessState': {
        const state = await provider.getHarnessState();
        return NextResponse.json({ ok: true, harness: state });
      }
      case 'getGoals': {
        const goals = await provider.getGoals();
        return NextResponse.json({ ok: true, goals });
      }
      case 'listChildren': {
        const children = await provider.listChildren();
        return NextResponse.json({ ok: true, children });
      }
      case 'listSkills': {
        const skills = await provider.listSkills();
        return NextResponse.json({ ok: true, skills });
      }
      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 },
        );
    }
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
}
