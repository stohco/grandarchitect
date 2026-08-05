import { NextRequest, NextResponse } from 'next/server';
import { requireDevMode } from '@/lib/editor/api-guards';
import { getAssetForge } from '@/engine/assets/asset-forge';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/assets/forge
 *   Lists all registered AI asset providers and their capabilities.
 *
 * POST /api/assets/forge
 *   Submits a job to the Asset Forge. Body:
 *   { capability: 'understand'|'generate'|'edit'|'extract-parts', ... }
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
    const { capability, request, providerId } = body as {
      capability: 'understand' | 'generate' | 'edit' | 'extract-parts';
      request: Record<string, unknown>;
      providerId?: string;
    };

    if (!capability || !request) {
      return NextResponse.json(
        { error: 'Missing capability or request' },
        { status: 400 },
      );
    }

    const forge = getAssetForge();

    // Note: these are mock calls — no real AI inference is performed.
    // The Asset Forge tracks jobs and returns candidate assets.
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
