/**
 * Deterministic RNG: xoshiro256** + splitmix64
 *
 * Why this exists:
 *   Math.random() is not deterministic across runs or engines.
 *   A century-spanning deterministic simulation requires an RNG whose
 *   output sequence is bit-identical given the same seed, across every
 *   browser and runtime. xoshiro256** (with splitmix64 for seed expansion)
 *   is a well-specified, fast, high-quality PRNG whose reference C
 *   implementation is trivially portable to JavaScript using BigInt for
 *   the 64-bit state.
 *
 * Why BigInt:
 *   JS bitwise operators (^, <<, >>) operate on 32-bit integers.
 *   xoshiro256** uses 64-bit state. The options are:
 *     (a) BigInt — correct, slower, but bit-identical across engines
 *     (b) Two Int32 halves with imul — faster, error-prone, hard to verify
 *   For a research artifact proving determinism, correctness > speed.
 *
 * References:
 *   Vigna, S. (2019). xoshiro256** PRNG. https://prng.di.unimi.it/
 *   SplitMix64 reference impl (Sebastiano Vigna, 2015).
 */

/** 64-bit mask as a BigInt. */
const MASK64 = 0xFFFFFFFFFFFFFFFFn;

/** The golden ratio fraction, used by splitmix64. Pinned constant. */
const SPLITMIX_GAMMA = 0x9E3779B97F4A7C15n;

/**
 * splitmix64: derive a 64-bit output from a 64-bit state, mutating state in place.
 * Used for seed expansion (hashing an arbitrary 64-bit seed into 4 × 64-bit state words).
 */
export function splitmix64_next(state: { z: bigint }): bigint {
  state.z = (state.z + SPLITMIX_GAMMA) & MASK64;
  let z = state.z;
  z = ((z ^ (z >> 30n)) * 0xBF58476D1CE4E5B9n) & MASK64;
  z = ((z ^ (z >> 27n)) * 0x94D049BB133111EBn) & MASK64;
  z = z ^ (z >> 31n);
  return z;
}

/** The xoshiro256** state: four 64-bit words. */
export interface XoshiroState {
  s0: bigint;
  s1: bigint;
  s2: bigint;
  s3: bigint;
}

/** Initialize from a 64-bit BigInt seed via splitmix64 expansion. */
export function seedFromBigInt(seed: bigint): XoshiroState {
  const z0 = { z: seed & MASK64 };
  const s0 = splitmix64_next(z0);
  const s1 = splitmix64_next(z0);
  const s2 = splitmix64_next(z0);
  const s3 = splitmix64_next(z0);
  return { s0, s1, s2, s3 };
}

/**
 * Initialize from a SHA-256 hash of a string seed.
 *
 * Uses @noble/hashes (pure JS, no secure-context requirement) as the primary
 * path, with crypto.subtle as an optional fast path when available.
 * crypto.subtle is undefined in non-secure HTTP contexts (e.g., when the page
 * is served through a gateway on a non-localhost origin), so we cannot rely
 * on it. @noble/hashes works everywhere.
 */
import { sha256 as nobleSha256 } from '@noble/hashes/sha2.js';

export async function seedFromString(seedString: string): Promise<{
  state: XoshiroState;
  seedHash: Uint8Array;
}> {
  const encoder = new TextEncoder();
  const data = encoder.encode(seedString);
  // Use @noble/hashes synchronously — works in all contexts.
  const seedHash = nobleSha256(data);
  // Use the first 8 bytes as the 64-bit seed for splitmix64 expansion.
  let seed64 = 0n;
  for (let i = 0; i < 8; i++) {
    seed64 = (seed64 << 8n) | BigInt(seedHash[i]);
  }
  return { state: seedFromBigInt(seed64), seedHash };
}

/** rotl64: rotate a 64-bit value left by k bits. */
function rotl(x: bigint, k: bigint): bigint {
  return ((x << k) | (x >> (64n - k))) & MASK64;
}

/** xoshiro256**: produce the next 64-bit random number and advance state. */
export function xoshiro256starstar_next(state: XoshiroState): bigint {
  const { s0, s1, s2, s3 } = state;
  const result = (rotl((s1 * 5n) & MASK64, 7n) * 9n) & MASK64;

  const t = (s1 << 17n) & MASK64;

  state.s2 = (state.s2 ^ state.s0) & MASK64;
  state.s3 = (state.s3 ^ state.s1) & MASK64;
  state.s1 = (state.s1 ^ state.s2) & MASK64;
  state.s0 = (state.s0 ^ state.s3) & MASK64;

  state.s2 = (state.s2 ^ t) & MASK64;
  state.s3 = rotl(state.s3, 45n) & MASK64;

  return result;
}

/**
 * Produce a uniform double in [0, 1) from the 64-bit output.
 *
 * Canonical method (Vigna): take the upper 53 bits, convert to Number,
 * multiply by 1/2^53. The multiply is IEEE-754 round-to-nearest-even,
 * deterministic across engines.
 *
 * 1/2^53 as a double = 1.1102230246251565e-16 (the nearest double to 2^-53).
 * This constant is PINNED; do not replace with Math.pow(2, -53) which could
 * theoretically differ (though in practice it does not).
 */
const INV_2_POW_53 = 1.1102230246251565e-16;

export function nextDouble(state: XoshiroState): number {
  const x = xoshiro256starstar_next(state);
  const upper53 = x >> 11n;
  return Number(upper53) * INV_2_POW_53;
}

/** Produce a uniform uint32 in [0, 2^32). */
export function nextUint32(state: XoshiroState): number {
  const x = xoshiro256starstar_next(state);
  return Number(x >> 32n);
}

/** Produce a boolean with probability p of being true. */
export function nextBoolean(state: XoshiroState, p: number): boolean {
  return nextDouble(state) < p;
}

/**
 * Produce a deterministic integer in [min, max] inclusive.
 * Uses nextDouble * range + min, floored. Math.floor is deterministic
 * (IEEE-754 round-toward-negative-infinity).
 */
export function nextIntRange(state: XoshiroState, min: number, max: number): number {
  const range = max - min + 1;
  const d = nextDouble(state) * range;
  return min + Math.floor(d);
}

/** Snapshot the state as hex strings (BigInt is not directly CBOR-serializable). */
export function snapshotState(state: XoshiroState): {
  s0: string;
  s1: string;
  s2: string;
  s3: string;
} {
  const toHex = (x: bigint): string => x.toString(16).padStart(16, '0');
  return {
    s0: toHex(state.s0),
    s1: toHex(state.s1),
    s2: toHex(state.s2),
    s3: toHex(state.s3),
  };
}

/** Restore state from a hex-string snapshot. */
export function restoreState(snap: {
  s0: string;
  s1: string;
  s2: string;
  s3: string;
}): XoshiroState {
  return {
    s0: BigInt('0x' + snap.s0),
    s1: BigInt('0x' + snap.s1),
    s2: BigInt('0x' + snap.s2),
    s3: BigInt('0x' + snap.s3),
  };
}
