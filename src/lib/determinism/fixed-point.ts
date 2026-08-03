/**
 * Q32.32 fixed-point math.
 *
 * Why this exists:
 *   IEEE-754 doubles are fine for storage but risky for accumulation.
 *   A `position += velocity * dt` loop with non-representable dt will drift
 *   across engines if any FMA fusion occurs. Fixed-point eliminates the
 *   entire class of "did the FMA fuse this multiply?" issues.
 *
 * Representation:
 *   A Q32.32 value is a 64-bit integer representing a real number as
 *   (int64 / 2^32). The integer part is the high 32 bits; the fractional
 *   part is the low 32 bits. Range: ±2^31 ≈ ±2.1 billion. Resolution:
 *   2^-32 ≈ 2.3e-10.
 *
 * Implementation note:
 *   JS does not have native 64-bit integers in arithmetic (BigInt is correct
 *   but slow). For the prototype's verification harness, we use BigInt-backed
 *   Q32.32 to guarantee correctness. A future hot-loop optimization would
 *   use two Int32 halves with imul.
 *
 * The BigInt approach is bit-deterministic across all engines because
 * BigInt arithmetic is exact integer arithmetic (no rounding, no FMA).
 */

export type Fixed64 = bigint;

/** The scaling factor: 2^32. */
const SCALE: bigint = 1n << 32n;
const SCALE_F: number = 4294967296; // 2^32 as a double, for conversions

/** Convert a double to Q32.32. Clamps to the representable range. */
export function fromDouble(x: number): Fixed64 {
  if (x !== x) return 0n; // NaN → 0
  if (x === Infinity) return 0x7FFFFFFFFFFFFFFFFFFFn;
  if (x === -Infinity) return -0x8000000000000000n;
  // Multiply by 2^32 and round to nearest integer (round-half-to-even).
  // BigInt truncation is round-toward-zero, so we add a bias for rounding.
  const scaled = x * SCALE_F;
  // Math.round is ES2019+ round-half-up-toward-positive-infinity for ties.
  // For determinism, use Math.floor(scaled + 0.5) for positive, Math.ceil(scaled - 0.5) for negative.
  // Actually, for fixed-point conversion, round-half-to-even is preferable
  // but more complex. For the prototype, round-half-away-from-zero is
  // deterministic and sufficient.
  let rounded: number;
  if (scaled >= 0) {
    rounded = Math.floor(scaled + 0.5);
  } else {
    rounded = Math.ceil(scaled - 0.5);
  }
  // Clamp to int64 range
  const clamped = Math.max(-9223372036854775808, Math.min(9223372036854775807, rounded));
  return BigInt(clamped);
}

/** Convert Q32.32 to a double. This is exact for representable values. */
export function toDouble(x: Fixed64): number {
  return Number(x) / SCALE_F;
}

/** Add two Q32.32 values. BigInt addition is exact. */
export function add(a: Fixed64, b: Fixed64): Fixed64 {
  return a + b;
}

/** Subtract two Q32.32 values. */
export function sub(a: Fixed64, b: Fixed64): Fixed64 {
  return a - b;
}

/** Negate a Q32.32 value. */
export function neg(a: Fixed64): Fixed64 {
  return -a;
}

/**
 * Multiply two Q32.32 values. The result is Q32.32.
 * (a * b) in raw BigInt gives a Q64.64 result; we shift right by 32 to get Q32.32.
 *
 * Rounding: we use round-half-to-even (banker's rounding) via:
 *   shift = (raw + (rounding bias)) >> 32
 * For round-half-to-even, the bias depends on the low bit of the result.
 * For the prototype, we use round-half-up (simpler, still deterministic).
 */
export function mul(a: Fixed64, b: Fixed64): Fixed64 {
  const raw = a * b; // Q64.64
  // Round half up: add 2^31 before shifting
  const bias = 1n << 31n;
  const positive = a < 0n !== b < 0n ? false : true; // result sign
  // For round-half-up (toward positive infinity), always add bias.
  // For round-half-away-from-zero, add bias if positive, subtract if negative.
  // We use round-half-away-from-zero for symmetry.
  if (raw >= 0n) {
    return (raw + bias) >> 32n;
  } else {
    return -(((-raw) + bias) >> 32n);
  }
}

/**
 * Divide two Q32.32 values. The result is Q32.32.
 * (a << 32) / b gives the quotient in Q32.32.
 */
export function div(a: Fixed64, b: Fixed64): Fixed64 {
  if (b === 0n) {
    throw new Error('Fixed-point division by zero');
  }
  const scaled = a << 32n;
  // Round half away from zero
  if ((scaled >= 0n) === (b >= 0n)) {
    // Positive result
    const absScaled = scaled < 0n ? -scaled : scaled;
    const absB = b < 0n ? -b : b;
    const half = absB >> 1n;
    return (absScaled + half) / absB;
  } else {
    // Negative result
    const absScaled = scaled < 0n ? -scaled : scaled;
    const absB = b < 0n ? -b : b;
    const half = absB >> 1n;
    return -((absScaled + half) / absB);
  }
}

/**
 * Accumulate: add a delta scaled by a double multiplier.
 * This is the canonical `position += velocity * dt` operation,
 * implemented as fixed-point for determinism.
 */
export function accumulateAdd(base: Fixed64, delta: Fixed64, dt: number): Fixed64 {
  const dtFixed = fromDouble(dt);
  return add(base, mul(delta, dtFixed));
}

/** Compare two Q32.64 values. Returns -1, 0, or 1. */
export function cmp(a: Fixed64, b: Fixed64): number {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}

/** Snapshot for serialization (as a hex string for portability). */
export function snapshot(x: Fixed64): string {
  // Two's complement hex, 16 chars
  const hex = (x < 0n ? (x + (1n << 64n)) : x).toString(16).padStart(16, '0');
  return hex;
}

/** Restore from a hex-string snapshot. */
export function restore(hex: string): Fixed64 {
  const u = BigInt('0x' + hex);
  // Interpret as signed two's complement
  if (u >= (1n << 63n)) {
    return u - (1n << 64n);
  }
  return u;
}

export const FIXED_POINT_VERSION = '0.1.0';
export const FIXED_POINT_METHOD = 'Q32.32 fixed-point, BigInt-backed';
