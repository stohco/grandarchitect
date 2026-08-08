/**
 * time-engine — Non-linear, elastic time
 *
 * The project lead's brief: time is non-linear and elastic — grotto-heaven
 * dilation (a day in a higher plane can equal a century below), Samsara
 * recasting via the River of Time, time essence that can age a galaxy or
 * rewind an ultimate technique.
 *
 * Canon anchors:
 *   - doc 15 §7: the time-debt is lawful and symmetric — 1 Precelestial day
 *     = 1 Acquired year (1:365). Not an illusion, not negotiable.
 *   - doc 40 §2.8: one Law Reach distorts the debt to 1:36,500 (1 reach-day
 *     = 100 Acquired years) — the brief's "day in a higher plane equals a
 *     century below".
 *   - doc 43: grotto time-rates from 1:2 to 1:20 (interior faster).
 *   - engine-architecture: fixed timestep 60 Hz.
 *
 * Determinism: all tick math is integer-exact via rational dilation ratios;
 * Samsara outcomes come from the Park-Miller LCG seeded by (subject, river
 * tick, seed). No Math.random, no Date.now.
 */

import { REALM_INDEX, type Realm } from '../plugins/simulation/ga-cultivation';
import { fnv1a, hashToNumber, lcgStep } from '../../lib/determinism/primitives';

/** Engine fixed timestep (60 Hz) × 60 s × 24 h — canonical simulation day. */
export const TICKS_PER_DAY = 60 * 60 * 24; // 86_400

/** The corpus year is 365 days (the 1:365 time-debt is built on it). */
export const DAYS_PER_YEAR = 365;

/** The canonical Samsara river region id (brief: "Samsara recasting via the River of Time"). */
export const RIVER_OF_TIME_REGION = 'river_of_time';

// ---------------------------------------------------------------------------
// Region clocks
// ---------------------------------------------------------------------------

export interface ClockRate {
  regionId: string;
  /** dilation = interior ticks per exterior tick, as an exact rational num/den. */
  dilation: { num: number; den: number };
}

export function clockFromDilation(regionId: string, ratio: [number, number]): ClockRate {
  return { regionId, dilation: { num: ratio[0], den: ratio[1] } };
}

/**
 * Exterior ticks elapsed while `interiorTicks` pass inside the region.
 * Integer-exact: exteriorTicks = interiorTicks × den / num.
 * Returns null when the result is not an exact integer (callers that need
 * exactness must use divisible tick counts).
 */
export function exteriorTicks(clock: ClockRate, interiorTicks: number): number | null {
  const numerator = interiorTicks * clock.dilation.den;
  if (numerator % clock.dilation.num !== 0) return null;
  return numerator / clock.dilation.num;
}

/** Interior ticks elapsed while `exteriorTicks` pass outside. Integer-exact similarly. */
export function interiorTicks(clock: ClockRate, exteriorTicksN: number): number | null {
  const numerator = exteriorTicksN * clock.dilation.num;
  if (numerator % clock.dilation.den !== 0) return null;
  return numerator / clock.dilation.den;
}

export function ticksToDays(ticks: number): number {
  return ticks / TICKS_PER_DAY;
}

export function daysToYears(days: number): number {
  return days / DAYS_PER_YEAR;
}

export interface ClockAdvance {
  regionId: string;
  localTicks: number;
  localDays: number;
  observerTicks: number;
  observerDays: number;
}

/**
 * Advance `ticks` of the entity's own clock inside `regionId` and report
 * what the observer region's clock sees. (The entity ages by its own clock —
 * the time-debt is symmetric, doc 15 §7.)
 */
export function advanceRegionClock(
  region: ClockRate,
  ticks: number,
  observer: ClockRate,
): ClockAdvance | null {
  const observerTicksN = exteriorTicks(region, ticks);
  if (observerTicksN === null) return null;
  const observerTicksInObserver = exteriorTicks(observer, observerTicksN);
  if (observerTicksInObserver === null) return null;
  return {
    regionId: region.regionId,
    localTicks: ticks,
    localDays: ticksToDays(ticks),
    observerTicks: observerTicksInObserver,
    observerDays: ticksToDays(observerTicksInObserver),
  };
}

// ---------------------------------------------------------------------------
// Time essence — technique rewind
// ---------------------------------------------------------------------------

export interface TechniqueSnapshotRecord {
  entityId: string;
  techniqueId: string;
  tick: number;
  /** Opaque serialized technique state (JSON-able). */
  snapshot: unknown;
}

export interface TechniqueBuffer {
  records: TechniqueSnapshotRecord[];
  /** essence cost per tick rewound (deterministic constant per technique). */
  essencePerTick: number;
}

export function createTechniqueBuffer(essencePerTick = 1): TechniqueBuffer {
  return { records: [], essencePerTick };
}

export function recordTechniqueSnapshot(
  buffer: TechniqueBuffer,
  record: TechniqueSnapshotRecord,
): TechniqueBuffer {
  const updated: TechniqueBuffer = {
    ...buffer,
    records: [...buffer.records, record],
  };
  return updated;
}

export interface RewindResult {
  restored: unknown;
  restoredTick: number;
  rewoundTicks: number;
  essenceSpent: number;
}

/**
 * Rewind a technique to the latest snapshot at or before `targetTick`.
 * Refuses to rewind below the technique's cast tick (the earliest recorded
 * snapshot — the causality floor). Deterministic: exact tick lookup, integer
 * essence cost.
 */
export function rewindTechnique(
  buffer: TechniqueBuffer,
  input: { entityId: string; techniqueId: string; targetTick: number },
): RewindResult | null {
  const candidates = buffer.records
    .filter((r) => r.entityId === input.entityId && r.techniqueId === input.techniqueId && r.tick <= input.targetTick)
    .sort((a, b) => b.tick - a.tick);
  if (candidates.length === 0) return null;
  const restored = candidates[0];
  const castTick = buffer.records
    .filter((r) => r.entityId === input.entityId && r.techniqueId === input.techniqueId)
    .reduce((min, r) => (r.tick < min ? r.tick : min), Infinity);
  const rewoundTicks = restored.tick - castTick;
  if (rewoundTicks < 0) return null;
  return {
    restored: restored.snapshot,
    restoredTick: restored.tick,
    rewoundTicks,
    essenceSpent: rewoundTicks * buffer.essencePerTick,
  };
}

// ---------------------------------------------------------------------------
// Time essence — samsara recast
// ---------------------------------------------------------------------------

/**
 * Resistance of a realm to Samsara recasting. Higher realms recast more
 * reliably (the River bends for the strong); mortals are pushed along by it.
 * [DERIVED] — the brief's probability rule, sized for conformance.
 */
export function realmSamsaraResistance(realm: Realm): number {
  return 10 * (10 - REALM_INDEX[realm]) + 1;
}

/**
 * Probability that a recast attempt succeeds:
 *   p = clamp(authority × (REALM_INDEX + 1) / 10, 0, 1)
 * authority 0 → 0; a Mahayana with authority 1 → 1.
 */
export function samsaraProbability(authority: number, realm: Realm): number {
  const realmFactor = (REALM_INDEX[realm] + 1) / 10;
  const p = authority * realmFactor;
  if (p < 0) return 0;
  if (p > 1) return 1;
  return p;
}

export interface SamsaraAttempt {
  subjectId: string;
  authority: number;
  subjectRealm: Realm;
  riverTick: number;
  seed: string;
}

export interface SamsaraResult {
  success: boolean;
  probability: number;
  newIncarnationId: string | null;
}

/**
 * Attempt a Samsara recast via the River of Time. The outcome is a
 * deterministic draw from a Park-Miller LCG seeded by (subject, river tick,
 * seed): same inputs → same incarnation, always.
 */
export function samsaraRecast(attempt: SamsaraAttempt): SamsaraResult {
  const probability = samsaraProbability(attempt.authority, attempt.subjectRealm);
  if (probability <= 0) {
    return { success: false, probability, newIncarnationId: null };
  }
  if (probability >= 1) {
    return {
      success: true,
      probability,
      newIncarnationId: `incarnation_${fnv1a(
        `${attempt.seed}|${attempt.subjectId}|${attempt.riverTick}`,
      )}`,
    };
  }
  let lcg = hashToNumber(`${attempt.seed}|${attempt.subjectId}|${attempt.riverTick}`);
  lcg = lcgStep(lcg);
  const draw = (lcg % 1000000) / 1000000; // [0, 1)
  const success = draw < probability;
  return {
    success,
    probability,
    newIncarnationId: success
      ? `incarnation_${fnv1a(`${attempt.seed}|${attempt.subjectId}|${attempt.riverTick}`)}`
      : null,
  };
}
