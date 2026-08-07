/**
 * settlement-day — Deterministic daily settlement simulation
 *
 * One real causal day for a generated settlement (Wang Family Bend).
 *
 * Model:
 *   - 1 sim hour = HOUR_TICKS engine ticks (matches TICKS_PER_UNIT.hour).
 *   - Households are derived deterministically from the seed via
 *     ga:gen-settlement (generateSettlement).
 *   - Schedules are pure functions of hour-of-day (wake 6, field work 7-11,
 *     13-17, noon rest 12, dusk harvest 18, evening meal 19, night 21-6).
 *   - Per-household productivity comes from the determinism RNG
 *     (xoshiro256** seeded from seed+household index) — the ONLY stochastic
 *     input, stable across runs and machines.
 *   - Every state transition is pure arithmetic. No Math.random, no Date.now.
 *
 * The simulation is a PURE FUNCTION of (seed, fromHour, hours): state is
 * recomputed from hour 0 on every call, so replays are bit-exact and there is
 * no server-side mutable state to drift or corrupt. A 720-hour advance over
 * ~31 households costs a few milliseconds.
 */

import { generateSettlement } from '../plugins/simulation/ga-gen-settlement';
import type { HouseholdData } from '../plugins/simulation/ga-gen-settlement';
import { seedFromBigInt, nextDouble } from '../../lib/determinism/rng';

// ============================================================================
// Time model
// ============================================================================

export const HOUR_TICKS = 3600 * 60; // engine ticks per sim hour
export const HOURS_PER_DAY = 24;

export type DayPhase =
  | 'night' | 'dawn' | 'morning_work' | 'noon_rest'
  | 'afternoon_work' | 'dusk' | 'evening';

export function hoursFromEngineTicks(ticks: number): number {
  return Math.max(0, Math.ceil(ticks / HOUR_TICKS));
}

export function dayOfHour(hour: number): number {
  return Math.floor(hour / HOURS_PER_DAY);
}

export function hourOfDay(hour: number): number {
  return hour % HOURS_PER_DAY;
}

export function phaseForHour(hour: number): DayPhase {
  const hod = hourOfDay(hour);
  if (hod >= 0 && hod <= 5) return 'night';
  if (hod === 6) return 'dawn';
  if (hod >= 7 && hod <= 11) return 'morning_work';
  if (hod === 12) return 'noon_rest';
  if (hod >= 13 && hod <= 17) return 'afternoon_work';
  if (hod === 18) return 'dusk';
  if (hod >= 19 && hod <= 20) return 'evening';
  return 'night';
}

// ============================================================================
// Tunables (deterministic constants — the model's "physics")
// ============================================================================

const MEAL_RATES: Record<number, number> = { 7: 0.15, 12: 0.3, 19: 0.35 };
const PADDY_RATE = 0.6;        // grain per work-hour per mu (owned + tenanted)
const DRYLAND_RATE = 0.25;     // grain per work-hour per mu
const TENANT_SHARE = 0.5;      // fraction of tenanted harvest owed as rent
const WORK_DRAIN = 0.06;       // energy per work hour
const SLEEP_RESTORE = 0.11;    // energy per sleeping hour
const NOON_REST = 0.05;
const EVE_REST = 0.03;
const VIGIL_DRAIN = 0.04;      // energy per vigil hour
const TIRED_THRESHOLD = 0.25;  // energy below this halves output
const TIRED_OUTPUT = 0.5;
const DAWN_QI = 0.2;           // lineage head dawn breath-cultivation, qi units
const LABOR_WAGE = 1.2;        // grain/day for a laborer household
const WATCH_WAGE = 0.5;        // grain/day for the night-watch household
const TRADE_STIPEND: Record<string, number> = {
  salt_merchant: 3.0,
  carpenter: 2.0,
  weaver: 1.5,
};
const COMMONS_START = 60;      // lineage hall grain reserve

// ============================================================================
// Types
// ============================================================================

export type HouseholdLocation = 'home' | 'field' | 'shrine' | 'market' | 'hall';

export interface HouseholdDayState {
  index: number;
  headName: string;
  headNameHanzi: string;
  isWang: boolean;
  wealthTier: 'rich' | 'comfortable' | 'poor' | 'destitute';
  role: string;
  members: number;
  paddyMu: number;
  tenantedMu: number;
  drylandMu: number;
  productivity: number;
  energy: number;
  foodStored: number;
  workHoursToday: number;
  foodProducedToday: number;
  foodConsumedToday: number;
  qiMeditatedToday: number;
  tired: boolean;
  hungry: boolean;
  asleep: boolean;
  location: HouseholdLocation;
  onWatch: boolean;
}

export interface DayAggregates {
  foodStored: number;
  commonsBalance: number;
  population: number;
  today: {
    workHours: number;
    foodProduced: number;
    foodConsumed: number;
    qiMeditated: number;
    rentPaid: number;
    wagesPaid: number;
    tradePaid: number;
    watchPaid: number;
    peopleHungry: number;
    peopleAsleep: number;
    peopleAwake: number;
  };
  window: {
    hoursAdvanced: number;
    foodProduced: number;
    foodConsumed: number;
    workHours: number;
    qiMeditated: number;
  };
}

export type DayEventType =
  | 'dawn.bell' | 'work.begins' | 'noon.rest' | 'dusk.bell'
  | 'night.fall' | 'hunger.warning' | 'grain.low';

export interface DayEvent {
  hour: number;
  hourOfDay: number;
  type: DayEventType;
  text: string;
}

export interface SettlementDayState {
  seed: string;
  hour: number;
  day: number;
  hourOfDay: number;
  phase: DayPhase;
  villageName: string;
  population: number;
  households: HouseholdDayState[];
  aggregates: DayAggregates;
  events: DayEvent[];
}

// ============================================================================
// Internals
// ============================================================================

interface SimHousehold {
  data: HouseholdData;
  productivity: number;
  energy: number;
  stored: number;
  workToday: number;
  paddyToday: number;
  dryToday: number;
  consumedToday: number;
  qiToday: number;
  hungry: boolean;
  asleep: boolean;
  location: HouseholdLocation;
}

interface SimState {
  households: SimHousehold[];
  commons: number;
  cumProduced: number;
  cumConsumed: number;
  cumWork: number;
  cumQi: number;
  rentPaid: number;
  wagesPaid: number;
  tradePaid: number;
  watchPaid: number;
  events: DayEvent[];
}

function hashToU64(seed: string): bigint {
  let h = 0n;
  for (let i = 0; i < seed.length; i++) {
    h = ((h << 5n) - h + BigInt(seed.charCodeAt(i))) & 0xffffffffffffffffn;
  }
  return h;
}

function round2(x: number): number {
  return Math.round(x * 100) / 100;
}

function round3(x: number): number {
  return Math.round(x * 1000) / 1000;
}

function productivityFor(seed: string, index: number): number {
  const state = seedFromBigInt(hashToU64(`${seed}:productivity:${index}`));
  return round3(0.9 + nextDouble(state) * 0.2);
}

function initialStore(data: HouseholdData): number {
  const base = Math.max(10, data.paddyMu * 14 + data.tenantedMu * 9 + data.drylandMu * 3);
  const mult = data.wealthTier === 'rich' ? 1.5
    : data.wealthTier === 'comfortable' ? 1.2
    : data.wealthTier === 'poor' ? 1.0 : 0.8;
  const advance = data.wealthTier === 'destitute' ? 6 : 0;
  return round2(base * mult + advance);
}

function initHouseholds(seed: string, layoutHouseholds: HouseholdData[]): SimHousehold[] {
  return layoutHouseholds.map((data, index) => ({
    data,
    productivity: productivityFor(seed, index),
    energy: 0.8,
    stored: initialStore(data),
    workToday: 0,
    paddyToday: 0,
    dryToday: 0,
    consumedToday: 0,
    qiToday: 0,
    hungry: false,
    asleep: false,
    location: 'home' as HouseholdLocation,
  }));
}

function isLandWorker(data: HouseholdData): boolean {
  return data.headRole === 'farmer' || data.headRole === 'tenant_farmer'
    || data.headRole === 'laborer' || data.headRole === 'lineage_head';
}

function isCraftWorker(data: HouseholdData): boolean {
  return data.headRole === 'carpenter' || data.headRole === 'weaver'
    || data.headRole === 'salt_merchant';
}

function landsMu(data: HouseholdData): number {
  return data.paddyMu + data.tenantedMu + data.drylandMu;
}

function meal(sim: SimState, hh: SimHousehold, rate: number): void {
  const required = round3(rate * hh.data.memberCount);
  const actual = Math.min(required, hh.stored);
  hh.stored -= actual;
  hh.consumedToday += actual;
  sim.cumConsumed += actual;
  if (actual < required - 1e-9) hh.hungry = true;
}

function workHour(sim: SimState, hh: SimHousehold): void {
  hh.workToday++;
  sim.cumWork++;
  hh.energy = Math.max(0, hh.energy - WORK_DRAIN);
  if (!isLandWorker(hh.data) || landsMu(hh.data) <= 0) {
    hh.location = isCraftWorker(hh.data) ? 'market' : 'field';
    return; // craft/labor income is settled at harvest; no land = no grain
  }
  const output = hh.energy < TIRED_THRESHOLD ? TIRED_OUTPUT : 1;
  const paddyMu = hh.data.paddyMu + hh.data.tenantedMu;
  hh.paddyToday += round3(paddyMu * PADDY_RATE * hh.productivity * output);
  hh.dryToday += round3(hh.data.drylandMu * DRYLAND_RATE * hh.productivity * output);
  sim.cumProduced += round3(
    (paddyMu * PADDY_RATE + hh.data.drylandMu * DRYLAND_RATE) * hh.productivity * output
  );
  hh.location = 'field';
}

function harvest(sim: SimState, hh: SimHousehold, onWatchToday: boolean): void {
  const paddy = hh.paddyToday;
  const dry = hh.dryToday;
  const tenantedFrac = hh.data.tenantedMu > 0 && hh.data.paddyMu + hh.data.tenantedMu > 0
    ? hh.data.tenantedMu / (hh.data.paddyMu + hh.data.tenantedMu)
    : 0;
  const rent = round3(paddy * TENANT_SHARE * tenantedFrac);
  let kept = paddy + dry - rent;
  if (hh.data.headRole === 'laborer') {
    sim.commons -= LABOR_WAGE;
    sim.wagesPaid += LABOR_WAGE;
    kept += LABOR_WAGE;
  }
  const stipend = TRADE_STIPEND[hh.data.headRole] ?? 0;
  if (stipend > 0) {
    sim.commons -= stipend;
    sim.tradePaid += stipend;
    kept += stipend;
  }
  if (onWatchToday) {
    sim.commons -= WATCH_WAGE;
    sim.watchPaid += WATCH_WAGE;
    kept += WATCH_WAGE;
  }
  hh.stored = round2(hh.stored + kept);
  sim.commons = round2(sim.commons + rent);
  sim.rentPaid += rent;
}

function isWatchHousehold(hour: number, count: number, index: number): boolean {
  const watch = dayOfHour(hour) % count;
  return index === watch;
}

function stepHour(sim: SimState, hour: number, fromHour: number): void {
  const hod = hourOfDay(hour);
  const n = sim.households.length;
  const phase = phaseForHour(hour);

  if (hod === 6) {
    for (const hh of sim.households) {
      hh.workToday = 0;
      hh.paddyToday = 0;
      hh.dryToday = 0;
      hh.consumedToday = 0;
      hh.qiToday = 0;
      hh.hungry = false;
    }
  }

  for (let i = 0; i < sim.households.length; i++) {
    const hh = sim.households[i];
    const onWatch = isWatchHousehold(hour, n, i);

    if (phase === 'night') {
      if (onWatch && (hod >= 23 || hod <= 5)) {
        hh.asleep = false;
        hh.location = 'hall';
        hh.energy = Math.max(0, hh.energy - VIGIL_DRAIN);
      } else {
        hh.asleep = true;
        hh.location = 'home';
        hh.energy = Math.min(1, hh.energy + SLEEP_RESTORE);
      }
      continue;
    }

    if (phase === 'dawn') {
      hh.asleep = false;
      hh.location = 'home';
      if (i === 0 && hh.data.headRole === 'lineage_head') {
        hh.qiToday += DAWN_QI;
        sim.cumQi += DAWN_QI;
        hh.location = 'shrine';
      }
      continue;
    }

    if (phase === 'morning_work') {
      if (hod === 7) meal(sim, hh, MEAL_RATES[7]);
      workHour(sim, hh);
      continue;
    }

    if (phase === 'noon_rest') {
      hh.asleep = false;
      hh.location = 'home';
      meal(sim, hh, MEAL_RATES[12]);
      hh.energy = Math.min(1, hh.energy + NOON_REST);
      continue;
    }

    if (phase === 'afternoon_work') {
      if (onWatch && (hod === 13 || hod === 14)) {
        hh.location = 'home';
        hh.energy = Math.min(1, hh.energy + NOON_REST);
        continue;
      }
      workHour(sim, hh);
      continue;
    }

    if (phase === 'dusk') {
      hh.asleep = false;
      hh.location = 'home';
      harvest(sim, hh, isWatchHousehold(hour, n, i));
      continue;
    }

    if (phase === 'evening') {
      if (hod === 19) meal(sim, hh, MEAL_RATES[19]);
      hh.asleep = false;
      hh.location = 'home';
      hh.energy = Math.min(1, hh.energy + EVE_REST);
      continue;
    }
  }

  if (phase === 'dawn' && hour >= fromHour) {
    sim.events.push({
      hour, hourOfDay: 6, type: 'dawn.bell',
      text: `Day ${dayOfHour(hour)}: dawn bell rings from the village gate — the bend wakes (拂曉)`,
    });
  }
  if (phase === 'morning_work' && hod === 7 && hour >= fromHour) {
    sim.events.push({
      hour, hourOfDay: 7, type: 'work.begins',
      text: 'Farmers set out to the paddies; the mill begins to turn (晨耕)',
    });
  }
  if (phase === 'noon_rest' && hour >= fromHour) {
    sim.events.push({
      hour, hourOfDay: 12, type: 'noon.rest',
      text: 'Noon rest — households gather for the midday meal (午歇)',
    });
  }
  if (phase === 'dusk' && hour >= fromHour) {
    const produced = round2(sim.households.reduce((s, hh) => s + hh.paddyToday + hh.dryToday, 0));
    sim.events.push({
      hour, hourOfDay: 18, type: 'dusk.bell',
      text: `Dusk bell — today's grain is stored (${produced} liang produced) (黃昏)`,
    });
    const stored = round2(sim.commons + sim.households.reduce((s, hh) => s + hh.stored, 0));
    const dailyNeed = 0.8 * sim.households.reduce((s, hh) => s + hh.data.memberCount, 0);
    if (stored < dailyNeed * 2) {
      sim.events.push({
        hour, hourOfDay: 18, type: 'grain.low',
        text: `Grain low — village stores (${stored}) cover under two days (糧倉告急)`,
      });
    }
  }
  if (hod === 19 && hour >= fromHour) {
    const hungry = sim.households.filter((hh) => hh.hungry);
    if (hungry.length > 0) {
      sim.events.push({
        hour, hourOfDay: 19, type: 'hunger.warning',
        text: `${hungry.length} household(s) short of grain this day (饑)`,
      });
    }
  }
  if (hod === 21 && hour >= fromHour) {
    sim.events.push({
      hour, hourOfDay: 21, type: 'night.fall',
      text: 'Night falls — lamps out, the watch takes the gate (夜深)',
    });
  }
}

function snapshot(sim: SimState, seed: string, layout: ReturnType<typeof generateSettlement>, toHour: number, fromHour: number, windowCum: { produced: number; consumed: number; work: number; qi: number }): SettlementDayState {
  const population = layout.population;
  const asleep = sim.households.reduce((s, hh) => s + (hh.asleep ? hh.data.memberCount : 0), 0);
  const hungryPeople = sim.households.reduce((s, hh) => s + (hh.hungry ? hh.data.memberCount : 0), 0);
  const workHours = sim.households.reduce((s, hh) => s + hh.workToday, 0);
  const foodProduced = sim.households.reduce((s, hh) => s + hh.paddyToday + hh.dryToday, 0);
  const foodConsumed = sim.households.reduce((s, hh) => s + hh.consumedToday, 0);
  const qiMeditated = sim.households.reduce((s, hh) => s + hh.qiToday, 0);
  const foodStored = round2(sim.commons + sim.households.reduce((s, hh) => s + hh.stored, 0));

  return {
    seed,
    hour: toHour,
    day: dayOfHour(toHour),
    hourOfDay: hourOfDay(toHour),
    phase: phaseForHour(toHour),
    villageName: layout.villageName,
    population,
    households: sim.households.map((hh, index) => ({
      index,
      headName: hh.data.headName,
      headNameHanzi: hh.data.headNameHanzi,
      isWang: hh.data.isWang,
      wealthTier: hh.data.wealthTier,
      role: hh.data.headRole,
      members: hh.data.memberCount,
      paddyMu: hh.data.paddyMu,
      tenantedMu: hh.data.tenantedMu,
      drylandMu: hh.data.drylandMu,
      productivity: hh.productivity,
      energy: round3(hh.energy),
      foodStored: round2(hh.stored),
      workHoursToday: hh.workToday,
      foodProducedToday: round2(hh.paddyToday + hh.dryToday),
      foodConsumedToday: round2(hh.consumedToday),
      qiMeditatedToday: round2(hh.qiToday),
      tired: hh.energy < TIRED_THRESHOLD,
      hungry: hh.hungry,
      asleep: hh.asleep,
      location: hh.location,
      onWatch: isWatchHousehold(toHour, sim.households.length, index),
    })),
    aggregates: {
      foodStored,
      commonsBalance: round2(sim.commons),
      population,
      today: {
        workHours,
        foodProduced: round2(foodProduced),
        foodConsumed: round2(foodConsumed),
        qiMeditated: round2(qiMeditated),
        rentPaid: round2(sim.rentPaid),
        wagesPaid: round2(sim.wagesPaid),
        tradePaid: round2(sim.tradePaid),
        watchPaid: round2(sim.watchPaid),
        peopleHungry: hungryPeople,
        peopleAsleep: asleep,
        peopleAwake: population - asleep,
      },
      window: {
        hoursAdvanced: toHour - fromHour,
        foodProduced: round2(sim.cumProduced - windowCum.produced),
        foodConsumed: round2(sim.cumConsumed - windowCum.consumed),
        workHours: sim.cumWork - windowCum.work,
        qiMeditated: round2(sim.cumQi - windowCum.qi),
      },
    },
    events: sim.events.filter((e) => e.hour >= fromHour),
  };
}

/**
 * Advance the settlement simulation from an absolute hour and return a state
 * snapshot at the end of the window. Pure function of (seed, fromHour, hours).
 */
export function advanceSettlementHours(seed: string, fromHour: number, hours: number): SettlementDayState {
  const toHour = fromHour + Math.max(0, Math.floor(hours));
  const layout = generateSettlement({ seed });
  const sim: SimState = {
    households: initHouseholds(seed, layout.households),
    commons: COMMONS_START,
    cumProduced: 0,
    cumConsumed: 0,
    cumWork: 0,
    cumQi: 0,
    rentPaid: 0,
    wagesPaid: 0,
    tradePaid: 0,
    watchPaid: 0,
    events: [],
  };
  const windowCum = { produced: 0, consumed: 0, work: 0, qi: 0 };
  for (let h = 0; h < toHour; h++) {
    if (h === fromHour) {
      windowCum.produced = sim.cumProduced;
      windowCum.consumed = sim.cumConsumed;
      windowCum.work = sim.cumWork;
      windowCum.qi = sim.cumQi;
    }
    stepHour(sim, h, fromHour);
  }
  return snapshot(sim, seed, layout, toHour, fromHour, windowCum);
}
