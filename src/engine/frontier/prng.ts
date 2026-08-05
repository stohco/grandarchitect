/**
 * frontier/prng.ts — Deterministic LCG PRNG for the frontier engine.
 *
 * Why a separate PRNG from src/lib/determinism/rng.ts?
 *   - The kernel RNG uses xoshiro256** with BigInt — bit-perfect but slow.
 *   - The frontier engine generates many small random numbers per tick
 *     (terrain noise, jitter). We need an order of magnitude more throughput.
 *   - LCG (Numerical Recipes constants) is bit-deterministic across all JS
 *     runtimes because Math.imul is defined as 32-bit integer multiply.
 *
 * Determinism contract:
 *   - Same seed → same sequence, every run, every runtime.
 *   - No use of Math.random anywhere in this module.
 *   - Math.imul is the only "non-pure" operation; it is defined to compute
 *     the 32-bit two's complement multiply, which is deterministic.
 *
 * Reference:
 *   Press, W.H. et al. (2007). Numerical Recipes 3rd Edition, §7.1.
 *   Knuth, D.E. (TAOCP Vol. 2) for the linear congruential theory.
 *
 * Constants: a = 1664525, c = 1013904223, m = 2^32.
 *   - Period: 2^32 (full period for any seed).
 *   - Quality: passes small-crush for our use (terrain noise). Not crypto.
 */

/** A deterministic LCG state. Wrap in a class for ergonomics. */
export class LCG {
  private state: number;

  constructor(seed: number) {
    // Coerce to uint32. Seed 0 is permitted (LCG still produces a full period).
    this.state = seed >>> 0;
  }

  /** Advance state and return a uint32 in [0, 2^32). */
  nextUint32(): number {
    // Numerical Recipes LCG: state = a*state + c (mod 2^32).
    // Math.imul gives the low 32 bits of the product, exactly.
    this.state = (Math.imul(this.state, 1664525) + 1013904223) >>> 0;
    return this.state;
  }

  /** Return a float in [0, 1). Deterministic — division of uint32 by 2^32. */
  nextFloat(): number {
    // Divide by 2^32 (4294967296). IEEE-754 division is deterministic.
    return this.nextUint32() / 4294967296;
  }

  /** Return a float in [min, max). Deterministic. */
  nextRange(min: number, max: number): number {
    return min + (max - min) * this.nextFloat();
  }

  /** Return an integer in [min, max] inclusive. Deterministic. */
  nextInt(min: number, max: number): number {
    const range = max - min + 1;
    return min + Math.floor(this.nextFloat() * range);
  }

  /** Snapshot the state so it can be restored later. */
  snapshot(): number {
    return this.state;
  }

  /** Restore from a snapshot. */
  restore(state: number): void {
    this.state = state >>> 0;
  }
}

/**
 * Hash a sequence of bytes deterministically (FNV-1a).
 * Used for trajectory hashing before SHA-256 (which is async via noble).
 * FNV-1a is synchronous, deterministic, and tiny.
 *
 * For replay verification, we use FNV-1a as the in-loop hash and then
 * SHA-256 once at the end (see character-controller.ts).
 */
export function fnv1aHash(data: Uint8Array): string {
  // FNV-1a 32-bit. Offset basis and prime from the spec.
  let hash = 0x811c9dc5;
  for (let i = 0; i < data.length; i++) {
    hash ^= data[i];
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, '0');
}

/**
 * Encode a Float32Array as a UTF-8 string deterministically (for SHA-256 input).
 * We use a fixed-precision formatter to avoid Float64→string nondeterminism.
 */
export function encodeFloatsForHash(values: Float32Array | number[]): string {
  let out = '';
  const len = values.length;
  for (let i = 0; i < len; i++) {
    const v = values[i];
    // isNaN check is deterministic. If NaN, emit literal "nan".
    if (Number.isNaN(v)) {
      out += 'nan;';
      continue;
    }
    // toFixed(6) is deterministic (IEEE-754 round-half-to-even).
    out += v.toFixed(6) + ';';
  }
  return out;
}
