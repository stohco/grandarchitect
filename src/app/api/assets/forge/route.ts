import { NextRequest, NextResponse } from 'next/server';
import { requireDevMode } from '@/lib/editor/api-guards';
import { getAssetForge } from '@/engine/assets/asset-forge';
import { AssetPipeline } from '@/engine/assets/pipeline';
import { getAssetRegistry } from '@/engine/studio/asset-registry';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * /api/assets/forge — Asset Forge API
 * ====================================
 *
 * REQUEST / RESPONSE CONTRACT (dev-guarded; 403 outside development):
 *
 * GET  → { providers, jobs, summary }
 *        Lists registered AI providers, their capabilities, and job history.
 *
 * POST → two operations:
 *
 *   1. Provider capability dispatch (mock AI providers):
 *      Body: { capability: 'understand'|'generate'|'edit'|'extract-parts',
 *              request: object, providerId?: string }
 *      Response: { ok: true, capability, result, jobs } | { error, status }
 *
 *   2. REAL pipeline: { op: 'run-pipeline', request: PipelineRequest }
 *      PipelineRequest: {
 *        seed: number,                    // deterministic generator seed
 *        name?: string,                   // asset id (default 'ga:pagoda')
 *        lodRatios?: number[],            // default [0.5, 0.25]
 *        protectedParts?: string[],       // default ['spire']
 *        instantiate?: number,            // entity instances to create
 *        gateConfig?: object,             // AcceptanceGateConfig overrides
 *        instruction?: string
 *      }
 *      Response on success (200):
 *      {
 *        ok: true,
 *        op: 'run-pipeline',
 *        pipeline: {
 *          assetId, seed,
 *          validation: { passed, summary, checks, defects },
 *          revision: { revision, contentHash, semanticHash, triangleCount, materialCount },
 *          glb: { sizeBytes, hash, meshCount, primitiveCount, triangleCount, vertexCount },
 *          roundTrip: { meshCount, primitiveCount, triangleCount, vertexCount, materialCount, ok },
 *          lodChain: { sourceTriangleCount, sourceHash, protectedPartIds, levels },
 *          collision: { boxes, triangleCount, hash, maxTrisPerBox, maxBoxes },
 *          instances, registrySummary
 *        }
 *      }
 *      Response on gate failure (200, ok:false + defects) or server error (500).
 *
 * NOTE: provider capabilities remain MOCK (no real inference). The
 * 'run-pipeline' op is the REAL asset path: deterministic procedural
 * source → acceptance gate → revision registration → LOD/collision
 * derivation → GLB export → round-trip validation → entity instantiation.
 */

export async function GET() {
  const devGuard = requireDevMode();
  if (devGuard) return devGuard;

  const forge = getAssetForge();
  const providers = forge.listProviders();
  const jobs = forge.getJobs();

  return NextResponse.json({
    providers,
    jobs: jobs.slice(0, 20),
    summary: {
      totalProviders: providers.length,
      availableProviders: providers.filter((p) => p.available).length,
      totalJobs: jobs.length,
    },
  });
}

export async function POST(req: NextRequest) {
  const devGuard = requireDevMode();
  if (devGuard) return devGuard;

  try {
    const body = await req.json();

    // --- REAL pipeline operation ---
    if (body.op === 'run-pipeline') {
      const request = body.request ?? {};
      if (typeof request.seed !== 'number') {
        return NextResponse.json(
          { error: 'run-pipeline requires request.seed (number)' },
          { status: 400 },
        );
      }
      try {
        const pipeline = new AssetPipeline(getAssetRegistry());
        const result = await pipeline.run({
          seed: request.seed,
          name: typeof request.name === 'string' ? request.name : undefined,
          lodRatios: Array.isArray(request.lodRatios) ? request.lodRatios : undefined,
          protectedParts: Array.isArray(request.protectedParts) ? request.protectedParts : undefined,
          instantiate: typeof request.instantiate === 'number' ? request.instantiate : undefined,
          gateConfig: typeof request.gateConfig === 'object' ? request.gateConfig : undefined,
          instruction: typeof request.instruction === 'string' ? request.instruction : undefined,
        });
        return NextResponse.json({ ok: true, op: 'run-pipeline', pipeline: result });
      } catch (err) {
        return NextResponse.json(
          { ok: false, op: 'run-pipeline', error: err instanceof Error ? err.message : String(err) },
          { status: 500 },
        );
      }
    }

    // --- Provider capability dispatch (mock) ---
    const { capability, request, providerId } = body as {
      capability: 'understand' | 'generate' | 'edit' | 'extract-parts';
      request: Record<string, unknown>;
      providerId?: string;
    };

    if (!capability || !request) {
      return NextResponse.json(
        { error: 'Missing capability or request (or use op: "run-pipeline")' },
        { status: 400 },
      );
    }

    const forge = getAssetForge();

    let result: unknown;
    try {
      switch (capability) {
        case 'generate':
          result = await forge.generate(request as never, providerId);
          break;
        case 'edit':
          result = await forge.edit(request as never, providerId);
          break;
        case 'understand':
          result = await forge.understand(request as never, providerId);
          break;
        case 'extract-parts':
          result = await forge.extractParts(request as never, providerId);
          break;
        default:
          return NextResponse.json(
            { error: `Unknown capability: ${capability}` },
            { status: 400 },
          );
      }
    } catch (err) {
      return NextResponse.json(
        { error: err instanceof Error ? err.message : String(err) },
        { status: 500 },
      );
    }

    return NextResponse.json({
      ok: true,
      capability,
      result,
      jobs: forge.getJobs().slice(0, 10),
    });
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON body' },
      { status: 400 },
    );
  }
}
