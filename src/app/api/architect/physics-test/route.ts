/**
 * GET /api/architect/physics-test
 * ---------------------------------
 * Tests Rapier WASM initialization and reports physics readiness for
 * Bake-off 5+7.
 */

import { NextResponse } from 'next/server';
import { getPhysicsAdapter } from '@/engine/architect/physics-runtime';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const adapter = getPhysicsAdapter();
    const status = await adapter.getStatus();

    // Try to actually create a world if available.
    let worldCreated = false;
    let worldError: string | undefined;
    if (status.available) {
      try {
        await adapter.createWorld();
        worldCreated = true;
      } catch (err) {
        worldError = (err as Error).message;
      }
    }

    return NextResponse.json({
      ok: true,
      available: status.available,
      reason: status.reason,
      useCases: status.useCases,
      bakeOff: status.bakeOff,
      nativeAlternative: status.nativeAlternative,
      worldCreated,
      worldError,
      proof: {
        installed: status.available,
        adapterCreated: true,
        worldCreationTest: worldCreated ? 'PASS' : 'PENDING',
        readyForBakeOff5: status.available && worldCreated,
        readyForBakeOff7: status.available && worldCreated,
        note: 'Bake-off 5: physics continuity. Bake-off 7: destructible terrain collision.',
      },
    });
  } catch (err) {
    return NextResponse.json({ ok: false, error: (err as Error).message }, { status: 500 });
  }
}
