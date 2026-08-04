/**
 * POST /api/editor/step
 *
 * Advance the world simulation by one tick. This is a stub: a real kernel
 * would re-simulate every enabled domain. For now we mutate the settlement
 * deterministically (nudge a few entity positions, bump the tick) so the
 * editor's "Step" button visibly does something.
 *
 * Body: { settlement: SerializableSettlement, domains: SimulationDomain[] }
 * Returns: { settlement: SerializableSettlement, advancedTick: number }
 */

import { NextRequest, NextResponse } from 'next/server';
import { seedFromString, nextDouble, XoshiroState } from '@/lib/determinism/rng';
import { SerializableSettlement, SimulationDomain } from '@/lib/editor/types';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const settlement = body.settlement as SerializableSettlement | undefined;
  const domains = (body.domains as SimulationDomain[] | undefined) ?? [];

  if (!settlement || !Array.isArray(settlement.structures)) {
    return NextResponse.json({ error: 'Missing settlement' }, { status: 400 });
  }

  // Re-seed from the settlement seed + the new tick so the step is deterministic
  // and reproducible across reloads.
  const nextTick = settlement.tick + 1;
  const { state } = await seedFromString(`${settlement.seed}::tick${nextTick}`);

  const stepped: SerializableSettlement = {
    ...settlement,
    tick: nextTick,
    structures: settlement.structures.map((s) => {
      // Only physics + ecology domains nudge structures, and only non-path
      // non-levee ones (those are static earthworks).
      if (s.kind === 'path' || s.kind === 'levee' || s.kind === 'graveyard') {
        return s;
      }
      if (!domains.includes('physics') && !domains.includes('ecology')) {
        return s;
      }
      const jitter = nextDouble(state) - 0.5;
      // Subtle 0.05-unit drift, deterministic per tick.
      return {
        ...s,
        position: {
          x: Math.round((s.position.x + jitter * 0.05) * 100) / 100,
          z: Math.round((s.position.z + (nextDouble(state) - 0.5) * 0.05) * 100) / 100,
        },
      };
    }),
  };

  return NextResponse.json(
    { settlement: stepped, advancedTick: nextTick },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}

// Silence unused-import warning in some build configs.
export const _xoshiro = (s: XoshiroState) => nextDouble(s);
