import { NextRequest, NextResponse } from 'next/server';
import { requireDevMode } from '@/lib/editor/api-guards';
import { validateCandidate, DEFAULT_GATE_CONFIG } from '@/engine/assets/acceptance-gate';
import type { CandidateAsset } from '@/engine/assets/semantic-asset';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * POST /api/assets/validate
 *
 * Runs the Asset Acceptance Gate on a candidate asset. Returns the
 * validation result with all checks and defects.
 *
 * Body: { candidate: CandidateAsset, config?: Partial<AcceptanceGateConfig> }
 */

export async function POST(req: NextRequest) {
  const devGuard = requireDevMode();
  if (devGuard) return devGuard;

  try {
    const body = await req.json();
    const { candidate, config } = body as {
      candidate: CandidateAsset;
      config?: Record<string, unknown>;
    };

    if (!candidate || !candidate.asset) {
      return NextResponse.json(
        { error: 'Missing candidate asset' },
        { status: 400 },
      );
    }

    const gateConfig = { ...DEFAULT_GATE_CONFIG, ...config };
    const result = validateCandidate(candidate, gateConfig);

    return NextResponse.json({
      ok: true,
      passed: result.passed,
      summary: result.summary,
      checks: result.checks,
      defects: result.defects,
    });
  } catch {
    return NextResponse.json(
      { error: 'Invalid request body' },
      { status: 400 },
    );
  }
}
