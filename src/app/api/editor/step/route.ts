/**
 * POST /api/editor/step
 *
 * Advances the deterministic simulation by a number of ticks.
 * Returns the new tick and any synthetic events that fired.
 *
 * Body: { granularity, count, fromTick }
 */
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const TICKS_PER_UNIT: Record<string, number> = {
  render_frame: 1,
  physics_tick: 1,
  ai_decision: 60,
  combat_turn: 600,
  minute: 3600,
  hour: 3600 * 60,
  day: 3600 * 60 * 24,
  month: 3600 * 60 * 24 * 30,
  year: 3600 * 60 * 24 * 365,
};

// Deterministic synthetic event pool keyed by tick buckets.
function eventsForTickBucket(tick: number): string[] {
  const events: string[] = [];
  // Every "hour" boundary
  if (tick > 0 && tick % 3600 === 0) events.push(`hour.${tick / 3600}`);
  // Daily dawn
  if (tick > 0 && tick % (3600 * 60 * 24) === 0) events.push('dawn.bell');
  // Seasonal solar term (every 15 days)
  if (tick > 0 && tick % (3600 * 60 * 24 * 15) === 0) {
    const term = ['立春', '雨水', '驚蟄', '春分', '清明', '穀雨', '立夏', '小滿'][Math.floor(tick / (3600 * 60 * 24 * 15)) % 8];
    events.push(`solar_term.${term}`);
  }
  return events;
}

export async function POST(req: NextRequest) {
  let body: { granularity?: string; count?: number; fromTick?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid json' }, { status: 400 });
  }
  const granularity = body.granularity ?? 'physics_tick';
  const count = body.count ?? 1;
  const fromTick = body.fromTick ?? 0;

  let ticksToAdvance: number;
  if (granularity === 'until_event' || granularity === 'until_breakpoint' || granularity === 'until_invariant_violation') {
    ticksToAdvance = Math.min(count, 10000);
  } else {
    ticksToAdvance = (TICKS_PER_UNIT[granularity] ?? 1) * count;
  }

  const newTick = fromTick + ticksToAdvance;
  const eventsFired: string[] = [];
  for (let t = fromTick + 1; t <= newTick; t++) {
    eventsFired.push(...eventsForTickBucket(t));
  }
  // Cap events returned
  const capped = eventsFired.slice(0, 200);

  return NextResponse.json({
    ok: true,
    completed: true,
    ticksAdvanced: ticksToAdvance,
    newTick,
    eventsFired: capped,
    stoppedBy: granularity === 'until_event' ? 'event' : undefined,
  });
}
