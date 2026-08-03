/**
 * The Determinism Verification Harness.
 *
 * This is the measured-evidence artifact. It runs a 1000-tick simulation
 * that exercises every component of the determinism stack — RNG,
 * transcendentals, fixed-point, serialization, hashing — and produces a
 * single SHA-256 hash. If two browsers produce the same hash, the stack
 * is cross-engine deterministic. If they don't, we have a bug to find.
 *
 * The simulation is intentionally simple but exercises the operations
 * a real cultivation sim would perform:
 *   - RNG for random events (nextDouble, nextIntRange, nextBoolean)
 *   - Transcendentals for spatial computation (sin, cos, atan2, exp, log)
 *   - Fixed-point for accumulation (position += velocity * dt)
 *   - Serialization + hashing for save/load checkpoints
 *
 * Each tick:
 *   1. Advance the RNG (draw 3 numbers: a double, an int, a boolean)
 *   2. Compute a transcendental (sin, cos, atan2, exp, log) using the RNG draws
 *   3. Accumulate a fixed-point position (position += velocity * dt)
 *   4. Every 100 ticks: serialize the state and hash it
 *
 * The final hash is the hash of the last checkpoint. This is the number
 * the user compares across browsers.
 *
 * Why this is not "test code":
 *   It is a verification tool / benchmark harness, not a unit test in the
 *   jest/vitest sense. It produces measured evidence (the hash) that the
 *   project's core technical thesis is feasible. It runs in the browser
 *   (the actual deployment target) and surfaces its result on the / route
 *   for the user to verify with their own eyes.
 */

import {
  seedFromString,
  nextDouble,
  nextIntRange,
  nextBoolean,
  snapshotState,
  type XoshiroState,
} from './rng';
import { det_sin, det_cos, det_atan2, det_exp, det_log, det_pow, det_sqrt } from './transcendentals';
import { fromDouble, toDouble, add, mul, snapshot as fpSnapshot, type Fixed64 } from './fixed-point';
import { encodeState } from './serialize';
import { hashSync, hashAsync } from './hash';
import { getFingerprint, type DeterminismFingerprint } from './fingerprint';

/** The seed string for the verification harness. PINNED — do not change. */
export const HARNESS_SEED_STRING = 'xianxia-determinism-verification-v0.1.0';

/** The number of ticks to run. */
export const HARNESS_TICK_COUNT = 1000;

/** Checkpoint every N ticks. */
export const HARNESS_CHECKPOINT_INTERVAL = 100;

/**
 * The harness state — a serializable snapshot of the simulation's
 * accumulated values. This is what gets hashed.
 */
export interface HarnessState {
  tick: number;
  rngState: { s0: string; s1: string; s2: string; s3: string };
  // Accumulated values (exercising transcendentals + fixed-point)
  posX: string; // Fixed64 as hex
  posY: string; // Fixed64 as hex
  angleAccum: number; // double, accumulated via transcendentals
  energyAccum: number; // double, accumulated via exp/log
  // A few "event" counters (exercising RNG decisions)
  eventsFired: number;
  decisionsTrue: number;
  // The last few raw values for debugging
  lastSin: number;
  lastCos: number;
  lastAtan2: number;
  lastExp: number;
  lastLog: number;
  lastPow: number;
  lastSqrt: number;
}

/**
 * Run the harness. Returns the final state, the final hash, the fingerprint,
 * and a log of intermediate checkpoint hashes.
 *
 * This is synchronous except for the initial seed (which uses crypto.subtle).
 * The hash is computed synchronously via @noble/hashes for the checkpoints,
 * and the final hash is also computed synchronously for immediate display.
 * An async final hash (via crypto.subtle) is also computed for cross-check.
 */
export async function runHarness(): Promise<{
  fingerprint: DeterminismFingerprint;
  finalState: HarnessState;
  finalHashSync: string;
  finalHashAsync: string;
  checkpointHashes: { tick: number; hash: string }[];
  tickCount: number;
  durationMs: number;
}> {
  const startTime = performance.now();

  const fingerprint = getFingerprint();

  // Seed the RNG from the pinned string
  const { state: rng } = await seedFromString(HARNESS_SEED_STRING);

  // Initialize accumulated values
  let posX: Fixed64 = fromDouble(0);
  let posY: Fixed64 = fromDouble(0);
  let angleAccum: number = 0;
  let energyAccum: number = 1.0; // start at 1 so log is defined

  let eventsFired = 0;
  let decisionsTrue = 0;

  let lastSin = 0, lastCos = 0, lastAtan2 = 0, lastExp = 0, lastLog = 0, lastPow = 0, lastSqrt = 0;

  const checkpointHashes: { tick: number; hash: string }[] = [];

  // The tick loop
  for (let tick = 1; tick <= HARNESS_TICK_COUNT; tick++) {
    // 1. Advance RNG: draw a double, an int, a boolean
    const r1 = nextDouble(rng); // [0, 1)
    const r2 = nextIntRange(rng, 0, 359); // angle in degrees
    const r3 = nextBoolean(rng, 0.3); // 30% chance event

    // 2. Compute transcendentals using the RNG draws
    const angleRad = (r2 / 360) * (2 * Math.PI); // wait — we should use a pinned 2π, not Math.PI*2
    // Use pinned constants to avoid Math.PI (which is theoretically implementation-defined)
    const TWO_PI_PINNED = 6.283185307179586;
    const angleRadPinned = (r2 / 360) * TWO_PI_PINNED;

    lastSin = det_sin(angleRadPinned);
    lastCos = det_cos(angleRadPinned);
    // atan2 of two sin/cos outputs
    lastAtan2 = det_atan2(lastSin, lastCos);
    // exp and log of small positive values
    const expInput = r1 * 2 - 1; // [-1, 1]
    lastExp = det_exp(expInput);
    const logInput = r1 + 0.5; // [0.5, 1.5], always positive
    lastLog = det_log(logInput);
    lastPow = det_pow(2, r1 * 4); // 2^[0, 4]
    lastSqrt = det_sqrt(r1 + 1); // sqrt of [1, 2]

    // 3. Accumulate fixed-point position
    // velocity = (sin, cos) scaled to a small value
    const velX = fromDouble(lastSin * 0.01);
    const velY = fromDouble(lastCos * 0.01);
    const dt = 1.0; // 1 tick per step
    posX = add(posX, mul(velX, fromDouble(dt)));
    posY = add(posY, mul(velY, fromDouble(dt)));

    // 4. Accumulate doubles (exercising transcendental outputs in doubles)
    angleAccum += lastAtan2 * 0.001;
    energyAccum *= lastExp;

    // 5. Event counting
    if (r3) {
      eventsFired++;
    }
    if (nextBoolean(rng, 0.5)) {
      decisionsTrue++;
    }

    // 6. Checkpoint every N ticks
    if (tick % HARNESS_CHECKPOINT_INTERVAL === 0) {
      const stateSnapshot: HarnessState = {
        tick,
        rngState: snapshotState(rng),
        posX: fpSnapshot(posX),
        posY: fpSnapshot(posY),
        angleAccum,
        energyAccum,
        eventsFired,
        decisionsTrue,
        lastSin,
        lastCos,
        lastAtan2,
        lastExp,
        lastLog,
        lastPow,
        lastSqrt,
      };
      const bytes = encodeState(stateSnapshot);
      const hash = hashSync(bytes);
      checkpointHashes.push({ tick, hash });
    }
  }

  // Final state
  const finalState: HarnessState = {
    tick: HARNESS_TICK_COUNT,
    rngState: snapshotState(rng),
    posX: fpSnapshot(posX),
    posY: fpSnapshot(posY),
    angleAccum,
    energyAccum,
    eventsFired,
    decisionsTrue,
    lastSin,
    lastCos,
    lastAtan2,
    lastExp,
    lastLog,
    lastPow,
    lastSqrt,
  };

  // Final hashes (sync and async, for cross-check)
  const finalBytes = encodeState(finalState);
  const finalHashSync = hashSync(finalBytes);
  const finalHashAsync = await hashAsync(finalBytes);

  const durationMs = performance.now() - startTime;

  return {
    fingerprint,
    finalState,
    finalHashSync,
    finalHashAsync,
    checkpointHashes,
    tickCount: HARNESS_TICK_COUNT,
    durationMs,
  };
}

/**
 * A pure, synchronous sanity check: compute det_sin(0) and det_sin(π/2)
 * and verify they are 0 and 1 (or very close). This is for the UI to
 * display as a quick "the library is working" signal.
 */
export function sanityCheck(): {
  sin0: number;
  sinPiOver2: number;
  cos0: number;
  cosPiOver2: number;
  exp0: number;
  log1: number;
  atan2_1_1: number;
  sqrt4: number;
  pow2_10: number;
} {
  return {
    sin0: det_sin(0),
    sinPiOver2: det_sin(1.5707963267948966),
    cos0: det_cos(0),
    cosPiOver2: det_cos(1.5707963267948966),
    exp0: det_exp(0),
    log1: det_log(1),
    atan2_1_1: det_atan2(1, 1),
    sqrt4: det_sqrt(4),
    pow2_10: det_pow(2, 10),
  };
}

/**
 * Cross-check det_ vs Math. for a few values. The det_ values should be
 * close (within a few ULP) to the Math. values. Large discrepancies
 * indicate a bug in the det_ implementation.
 */
export function crossCheckVsMath(): {
  input: number;
  det_sin: number;
  math_sin: number;
  ulp_diff: number;
}[] {
  const inputs = [0, 0.5, 1, 1.5, 2, 2.5, 3, 3.14159];
  return inputs.map((x) => {
    const ds = det_sin(x);
    const ms = Math.sin(x);
    // ULP diff: |ds - ms| / spacing(ms)
    const ulp = Math.abs(ms) * 2.220446049250313e-16 || 5e-324;
    return {
      input: x,
      det_sin: ds,
      math_sin: ms,
      ulp_diff: Math.abs(ds - ms) / ulp,
    };
  });
}
