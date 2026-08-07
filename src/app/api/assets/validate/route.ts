import { NextRequest, NextResponse } from 'next/server';
import { requireDevMode } from '@/lib/editor/api-guards';
import { validateCandidate, validateSemanticAsset, DEFAULT_GATE_CONFIG } from '@/engine/assets/acceptance-gate';
import type { CandidateAsset, SemanticAsset } from '@/engine/assets/semantic-asset';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * /api/assets/validate — Asset Acceptance Gate API
 * =================================================
 *
 * REQUEST / RESPONSE CONTRACT (dev-guarded; 403 outside development):
 *
 * POST body (either form):
 *
 *   A) Direct asset: { asset: SemanticAsset, config?: Partial<AcceptanceGateConfig> }
 *      Runs the gate directly on a semantic asset (pipeline path).
 *
 *   B) Candidate:    { candidate: CandidateAsset, config?: Partial<AcceptanceGateConfig> }
 *      Runs the gate on an AI-provider candidate (provider path).
 *
 *   config overrides DEFAULT_GATE_CONFIG:
 *   { maxTriangles, maxVertices, requireManifold, maxProtectedDeviation,
 *     minUVCoverage, requireNormals, maxBoundsExtent }
 *
 * Response (200):
 * {
 *   ok: true,
 *   passed: boolean,
 *   summary: string,          // "PASSED — N checks, M warnings" | "FAILED — ..."
 *   checks: ValidationCheck[],// { checkId, name, passed, message?, value?, threshold? }
 *   defects: AssetDefect[]    // { defectId, severity, category, description }
 * }
 *
 * Gate is deterministic — same asset always yields the same verdict.
 * Checks include: finite geometry, valid indices, real zero-area triangle
 * detection (cross-product area), budgets, normals, bounds, UV coverage,
 * semantic-region coverage, provenance.
 */
export async function POST(req: NextRequest) {
  const devGuard = requireDevMode();
  if (devGuard) return devGuard;

  try {
    const body = await req.json();
    const { asset, candidate, config } = body as {
      asset?: SemanticAsset;
      candidate?: CandidateAsset;
      config?: Record<string, unknown>;
    };

    const gateConfig = { ...DEFAULT_GATE_CONFIG, ...config };

    let result;
    if (asset && asset.geometry) {
      result = validateSemanticAsset(asset, gateConfig);
    } else if (candidate && candidate.asset) {
      result = validateCandidate(candidate, gateConfig);
    } else {
      return NextResponse.json(
        { error: 'Missing "asset" or "candidate" in body' },
        { status: 400 },
      );
    }

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
