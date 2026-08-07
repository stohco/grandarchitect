/**
 * POST /api/editor/step
 *
 * Advances the settlement day simulation by a number of ticks.
 * The engine tick counter (newTick) is the UI's clock; the real
 * simulation (settlement-day) advances in whole hours, one sim hour
 * = HOUR_TICKS engine ticks. State is a pure function of
 * (seed, fromHour, hours) — recomputed server-side on every request,
 * so replays are exact and no server-side state can drift.
 *
 * Body: { granularity, count, fromTick, seed }
 */
import { NextRequest, NextResponse } from 'next/server';
import { advanceSettlementHours, hoursFromEngineTicks } from '@/engine/simulation/settlement-day';

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

export async function POST(req: NextRequest) {
  let body: { granularity?: string; count?: number; fromTick?: number; seed?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid json' }, { status: 400 });
  }
  const granularity = body.granularity ?? 'physics_tick';
  const count = body.count ?? 1;
  const fromTick = body.fromTick ?? 0;
  const seed = body.seed ?? 'wang-family-bend-1108';

  let ticksToAdvance: number;
  if (granularity === 'until_event' || granularity === 'until_breakpoint' || granularity === 'until_invariant_violation') {
    ticksToAdvance = Math.min(count, 10000);
  } else {
    ticksToAdvance = (TICKS_PER_UNIT[granularity] ?? 1) * count;
  }

  const newTick = fromTick + ticksToAdvance;
  const fromHour = hoursFromEngineTicks(fromTick);
  const toHour = hoursFromEngineTicks(newTick);
  const hoursAdvanced = Math.max(0, toHour - fromHour);

  // Real deterministic settlement simulation (pure function of seed+hours).
  const day = advanceSettlementHours(seed, fromHour, hoursAdvanced);

  // Event log strings derived from REAL sim events (no canned ticks).
  const eventsFired = day.events.map((e) => `${e.type} @h${e.hourOfDay}: ${e.text}`);
  const capped = eventsFired.slice(0, 200);

  return NextResponse.json({
    ok: true,
    completed: true,
    ticksAdvanced: ticksToAdvance,
    newTick,
    hoursAdvanced,
    fromHour,
    toHour,
    eventsFired: capped,
    day,
    stoppedBy: granularity === 'until_event' ? 'event' : undefined,
  });
}
