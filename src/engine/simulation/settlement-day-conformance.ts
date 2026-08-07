/**
 * settlement-day conformance — proves the one-causal-day vertical slice.
 *
 * Standalone: `bun run src/engine/simulation/settlement-day-conformance.ts`
 *
 * Proves:
 *   1. Determinism   — same (seed, hour) => bit-identical state; different
 *                      seeds diverge.
 *   2. Causality     — eating reduces stores; working produces food;
 *                      sleeping restores energy; working drains it.
 *   3. One causal day — a 24-hour advance emits the canonical phase sequence
 *                      (dawn.bell → work.begins → noon.rest → dusk.bell →
 *                      night.fall) and grain is conserved within rounding
 *                      tolerance.
 *   4. Route wiring  — the exact mapping the step route uses
 *                      (engine ticks → sim hours → advanceSettlementHours).
 */

import {
  advanceSettlementHours,
  hoursFromEngineTicks,
  HOUR_TICKS,
} from './settlement-day';

let passed = 0;
let failed = 0;

function assert(condition: boolean, label: string) {
  if (condition) {
    passed++;
    console.log(`  \u2705 ${label}`);
  } else {
    failed++;
    console.error(`  \u274c ${label}`);
  }
}

const SEED = 'wang-family-bend-1108';
const OTHER_SEED = 'jade-city-market-9';

function canonicalTypes(events: { type: string }[]): string[] {
  const wanted = ['dawn.bell', 'work.begins', 'noon.rest', 'dusk.bell', 'night.fall'];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const e of events) {
    if (wanted.includes(e.type) && !seen.has(e.type)) {
      seen.add(e.type);
      out.push(e.type);
    }
  }
  return out;
}

console.log('=== Settlement Day Conformance — One Causal Day ===');
console.log('');

// ============================================================================
// 1. Determinism
// ============================================================================

console.log('Section 1: Determinism');
{
  const a = advanceSettlementHours(SEED, 0, 24);
  const b = advanceSettlementHours(SEED, 0, 24);
  assert(JSON.stringify(a) === JSON.stringify(b), 'Same seed+hours → identical full state');
  const c = advanceSettlementHours(SEED, 5, 19); // shifted window, same end hour
  const d = advanceSettlementHours(SEED, 0, 24);
  const stripWindow = (s: ReturnType<typeof advanceSettlementHours>) => {
    const { window, ...rest } = s.aggregates;
    return JSON.stringify({ ...s, aggregates: rest });
  };
  assert(stripWindow(c) === stripWindow(d), 'State at hour 24 is window-independent (pure function)');
  const e = advanceSettlementHours(OTHER_SEED, 0, 24);
  assert(JSON.stringify(a) !== JSON.stringify(e), 'Different seeds → different states');
  const f = advanceSettlementHours(SEED, 0, 720); // full month
  assert(f.hour === 720 && f.day === 30, '720-hour advance lands on day 30, hour 720');
  const g = advanceSettlementHours(SEED, 0, 720);
  assert(JSON.stringify(f) === JSON.stringify(g), 'Month-long run also deterministic');
  console.log('');
}

// ============================================================================
// 2. Causality
// ============================================================================

console.log('Section 2: Causality (food, work, energy)');
{
  // 2a. Eating reduces stores: noon meal at hour 12 (state at hour 12 is
  // BEFORE the meal; state at hour 13 is AFTER it).
  const beforeNoon = advanceSettlementHours(SEED, 0, 12);
  const afterNoon = advanceSettlementHours(SEED, 0, 13);
  const farmer = beforeNoon.households.find((h) => h.workHoursToday > 0 && h.members > 0);
  assert(farmer !== undefined, 'Found a working household for meal causality');
  if (farmer) {
    const after = afterNoon.households[farmer.index];
    const expectedMeal = 0.3 * farmer.members;
    const delta = farmer.foodStored - after.foodStored;
    assert(delta > 0, `Noon meal consumed food (Δ=${delta.toFixed(2)})`);
    assert(Math.abs(delta - Math.min(expectedMeal, farmer.foodStored)) < 0.05,
      `Consumption equals 0.3/member (or capped by stores)`);
    assert(afterNoon.aggregates.today.foodConsumed > beforeNoon.aggregates.today.foodConsumed,
      'Village food-consumed aggregate rises across the meal');
  }

  // 2b. Work produces food: land-working households harvest at dusk.
  const day = advanceSettlementHours(SEED, 0, 24);
  const landWorkerRoles = ['farmer', 'tenant_farmer', 'laborer', 'lineage_head'];
  const landHouseholds = day.households.filter(
    (h) => h.paddyMu + h.tenantedMu + h.drylandMu > 0 && landWorkerRoles.includes(h.role)
  );
  assert(landHouseholds.length > 0, 'Village has land-working households');
  assert(landHouseholds.every((h) => h.foodProducedToday > 0),
    'Every land-working household produced grain today');
  assert(day.aggregates.today.foodProduced > 0, 'Village produced food today');
  assert(day.aggregates.today.workHours > 0, 'Village logged work hours today');

  // 2c. Sleeping restores energy; work drains it.
  const dawn = advanceSettlementHours(SEED, 0, 6);
  const duskEnergy = advanceSettlementHours(SEED, 0, 17);
  const sleeper = dawn.households[1]; // household 0 is tonight's watch
  assert(sleeper.energy > 0.8, `Sleep restores energy 0.8 → ${sleeper.energy.toFixed(3)} at dawn`);
  const worked = duskEnergy.households[1];
  assert(worked.energy < sleeper.energy, 'A full work day drains energy below dawn value');

  // 2d. The watch household behaves differently: awake at night, extra noon rest.
  const night3 = advanceSettlementHours(SEED, 0, 3);
  const watch = night3.households.find((h) => h.onWatch);
  assert(watch !== undefined, 'Night watch household exists on day 0');
  if (watch) {
    assert(watch.asleep === false && watch.location === 'hall', 'Watch household guards the hall at 3am');
    const sleeperAt3 = night3.households.find((h) => h.index !== watch.index && h.asleep);
    assert(sleeperAt3 !== undefined && watch.energy < sleeperAt3!.energy,
      'Vigil drains the watch\'s energy below a sleeping household');
    const watchNoon = advanceSettlementHours(SEED, 0, 13);
    assert(watchNoon.households[watch.index].location === 'home' && watchNoon.households[watch.index].workHoursToday === 5,
      'Watch rests through noon (no work hours added during 12-14)');
  }
  console.log('');
}

// ============================================================================
// 3. One causal day
// ============================================================================

console.log('Section 3: One causal day');
{
  const start = advanceSettlementHours(SEED, 0, 0);
  const end = advanceSettlementHours(SEED, 0, 24);

  assert(end.hourOfDay === 0 && end.day === 1, '24 hours → day 1, hour 0');
  const canon = canonicalTypes(end.events);
  const expected = ['dawn.bell', 'work.begins', 'noon.rest', 'dusk.bell', 'night.fall'];
  assert(JSON.stringify(canon) === JSON.stringify(expected),
    `Phase sequence exactly canonical (${canon.join(' → ')})`);
  const dawnEv = end.events.find((e) => e.type === 'dawn.bell');
  const duskEv = end.events.find((e) => e.type === 'dusk.bell');
  assert(dawnEv?.hourOfDay === 6 && duskEv?.hourOfDay === 18,
    'dawn.bell at hour 6, dusk.bell at hour 18');
  for (const e of end.events) {
    assert(e.hour >= 0 && e.hour < 24, `All day events inside the window (${e.type}@${e.hourOfDay})`);
  }

  // Conservation: stored_end = stored_start + produced − consumed (rounding tolerance).
  const produced = end.aggregates.window.foodProduced;
  const consumed = end.aggregates.window.foodConsumed;
  const expectedEnd = start.aggregates.foodStored + produced - consumed;
  assert(Math.abs(end.aggregates.foodStored - expectedEnd) < 0.1,
    `Grain conserved: ${start.aggregates.foodStored} + ${produced} − ${consumed} ≈ ${end.aggregates.foodStored} (tol 0.1)`);

  // Window aggregates agree with per-household sums.
  const sumWork = end.households.reduce((s, h) => s + h.workHoursToday, 0);
  const sumProduced = end.households.reduce((s, h) => s + h.foodProducedToday, 0);
  const sumConsumed = end.households.reduce((s, h) => s + h.foodConsumedToday, 0);
  assert(end.aggregates.window.workHours === sumWork, 'Window work hours = Σ household work hours');
  assert(Math.abs(end.aggregates.window.foodProduced - sumProduced) < 0.05, 'Window production = Σ household production');
  assert(Math.abs(end.aggregates.window.foodConsumed - sumConsumed) < 0.05, 'Window consumption = Σ household consumption');

  // Population accounting: everyone is accounted for at night.
  const night = advanceSettlementHours(SEED, 0, 3);
  assert(night.aggregates.today.peopleAsleep + night.aggregates.today.peopleAwake === night.population,
    'Asleep + awake = population at night');
  assert(night.aggregates.today.peopleAsleep > 0, 'Most of the village is asleep at 3am');

  // Day-0 watch wage: the watch household received its wage at dusk.
  const watchIdx = end.households.find((h) => h.onWatch)?.index;
  if (watchIdx !== undefined && end.households[watchIdx].headRole !== 'salt_merchant') {
    assert(end.aggregates.today.watchPaid > 0, 'Watch wage paid at dusk');
  }
  console.log('');
}

// ============================================================================
// 4. Step-route wiring (same code path as POST /api/editor/step)
// ============================================================================

console.log('Section 4: Step-route integration');
{
  // One "hour" step: TICKS_PER_UNIT.hour = 3600*60 = HOUR_TICKS.
  const hourTicks = HOUR_TICKS;
  assert(hoursFromEngineTicks(hourTicks) === 1, '1 engine-hour step → 1 sim hour');
  assert(hoursFromEngineTicks(hourTicks * 24) === 24, '1 engine-day step → 24 sim hours');
  assert(hoursFromEngineTicks(1) === 1, '1 physics tick → ceil → 1 sim hour (min resolution)');
  assert(hoursFromEngineTicks(hourTicks * 24 * 30) === 720, '1 engine-month step → 720 sim hours');

  // Two consecutive hour steps land exactly where one 2-hour step lands.
  const s1 = advanceSettlementHours(SEED, 0, 1);
  const s2 = advanceSettlementHours(SEED, s1.hour, 1);
  const s3 = advanceSettlementHours(SEED, 0, 2);
  const stripWindow = (s: ReturnType<typeof advanceSettlementHours>) => {
    const { window, ...rest } = s.aggregates;
    return JSON.stringify({ ...s, aggregates: rest });
  };
  assert(s2.hour === s3.hour && stripWindow(s2) === stripWindow(s3),
    'Incremental steps ≡ single jump (stateless pure function)');

  // A mid-day "day" step: fromTick = noon, advance 24h → next day noon.
  const noonStart = hoursFromEngineTicks(HOUR_TICKS * 12);
  const mid = advanceSettlementHours(SEED, noonStart, 24);
  assert(mid.hourOfDay === 12, 'Day step from noon lands on noon');
  assert(mid.events[0]?.type === 'noon.rest', 'First event in window is the noon bell');

  // Sub-hour request (fromTick == newTick) yields zero hours, no events.
  const zero = advanceSettlementHours(SEED, noonStart, 0);
  assert(zero.events.length === 0, 'Zero-hour advance emits no events');
  console.log('');
}

// ============================================================================
// Results
// ============================================================================

console.log('=== Results ===');
console.log(`Passed: ${passed}`);
console.log(`Failed: ${failed}`);
if (failed === 0) {
  console.log('\n\u2705 ALL TESTS PASSED — one real causal day proven');
} else {
  console.error(`\n\u274c ${failed} TESTS FAILED`);
  process.exit(1);
}
