/**
 * GET /api/architect/planetary-test
 * ----------------------------------
 * Tests 3DTilesRendererJS initialization and reports planetary streaming
 * readiness for Bake-off 5.
 */

import { NextResponse } from 'next/server';
import { getPlanetaryStreamingAdapter } from '@/engine/architect/planetary-streaming';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const adapter = getPlanetaryStreamingAdapter();
    const status = await adapter.getStatus();
    const frames = adapter.getCoordinateFrames();

    return NextResponse.json({
      ok: true,
      available: status.available,
      reason: status.reason,
      tileSets: status.tileSets,
      bakeOff: status.bakeOff,
      coordinateFrames: frames,
      proof: {
        installed: status.available,
        adapterCreated: true,
        readyForBakeOff5: status.available,
        note: 'Bake-off 5: stand on surface → fly → cross atmosphere → orbital frame → travel globe → descend',
      },
    });
  } catch (err) {
    return NextResponse.json({ ok: false, error: (err as Error).message }, { status: 500 });
  }
}
