/**
 * primitives.ts — canonical deterministic string-hash and LCG primitives.
 *
 * THE ONLY AUTHORIZED home for these primitives. Subsystems MUST import
 * from here (or from ./rng.ts) — subsystem-local PRNG/hash implementations
 * are forbidden (AGENTS.md rule DET-1). See primitives-conformance.ts for
 * the golden vectors that pin these algorithms.
 */

/**
 * FNV-1a 32-bit string hash, returned as 8-char lowercase hex.
 * Bit-specified; portable across every JS engine (Math.imul + unsigned
 * shift are ECMA-specified).
 *
 * Golden vectors (well-known FNV-1a references):
 *   fnv1a('')      -> '811c9dc5'
 *   fnv1a('a')     -> 'e40c292c'
 *   fnv1a('foobar') -> 'bf9cf968'
 */
export function fnv1a(input: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}

/**
 * FNV-1a 32-bit over raw bytes (Uint8Array), returned as 8-char hex.
 * Same algorithm as fnv1a() with byte input.
 */
export function fnv1aBytes(data: Uint8Array): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < data.length; i++) {
    h ^= data[i];
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}

/**
 * Numerical-Recipes style 32-bit hash mix over (seed, x, y, z) — the
 * canonical deterministic per-voxel hash used by terrain worldgen.
 * 32-bit truncation is INTENDED here (hash mixing, not a sequence LCG).
 * Pinned by golden vectors in primitives-conformance.ts.
 */
export function nrHashMix(seed: number, x: number, y: number, z: number): number {
  let h = (seed ^ 0x12345678) >>> 0;
  h = (Math.imul(h, 1664525) + x + 1013904223) >>> 0;
  h = (Math.imul(h, 1664525) + y + 1013904223) >>> 0;
  h = (Math.imul(h, 1664525) + z + 1013904223) >>> 0;
  return h >>> 0;
}

/**
 * LCG — Numerical-Recipes 32-bit LCG (a = 1664525, c = 1013904223, mod 2^32).
 * Deliberately mod-2^32: Math.imul's truncation is CORRECT here (this is a
 * full-period sequence LCG, not Park-Miller). The canonical home of the
 * project's linear-congruential generators.
 */
export class LCG {
  private state: number;

  constructor(seed: number) {
    this.state = seed >>> 0;
  }

  /** Advance state and return a uint32 in [0, 2^32). */
  nextUint32(): number {
    this.state = (Math.imul(this.state, 1664525) + 1013904223) >>> 0;
    return this.state;
  }

  /** Return a float in [0, 1). Deterministic — division of uint32 by 2^32. */
  nextFloat(): number {
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
}

/**
 * hashNoise3 — the canonical terrain noise hash: NR-LCG mix over
 * (ix, iy, iz, seed) plus a Murmur-style avalanche finalizer, mapped to
 * [-1, 1]. This is the EXACT algorithm previously inlined in
 * terrain-plugin.ts; migrated here so all deterministic primitives live in
 * one package. Pinned by golden vectors (bit-identical output).
 */
export function hashNoise3(ix: number, iy: number, iz: number, seed: number): number {
  let h = (seed ^ 0x12345678) >>> 0;
  h = (Math.imul(h, 1664525) + ix + 1013904223) >>> 0;
  h = (Math.imul(h, 1664525) + iy + 1013904223) >>> 0;
  h = (Math.imul(h, 1664525) + iz + 1013904223) >>> 0;
  h = (Math.imul(h ^ (h >>> 15), 0x85ebca6b)) >>> 0;
  h = (Math.imul(h ^ (h >>> 13), 0xc2b2ae35)) >>> 0;
  h = (h ^ (h >>> 16)) >>> 0;
  return (h / 2147483648) - 1;
}

/** Deterministic 32-bit number from a string (parse of fnv1a). */
export function hashToNumber(input: string): number {
  return parseInt(fnv1a(input), 16) >>> 0;
}

/**
 * Park-Miller LCG step. One step per call; the caller keeps the state.
 *
 * IMPORTANT: use plain number multiplication, NOT Math.imul.
 * 48271 × (2^31 − 1) ≈ 1.04e14 < 2^53, so plain number arithmetic is
 * exact; Math.imul performs a 32-bit truncating multiply and diverges from
 * the algorithm (a silent determinism-corruption bug that replays forever).
 *
 * Golden vectors (state starts at 1):
 *   lcgStep(1)             -> 48271
 *   lcgStep(48271)         -> 182605794
 *   lcgStep(182605794)     -> 1291394886
 *   lcgStep(1291394886)    -> 1914720637
 *   lcgStep(1914720637)    -> 2078669041
 */
export function lcgStep(state: number): number {
  return (state * 48271) % 2147483647;
}

/** Deterministic id: `prefix_<fnv1a(seed|parts)>`. */
export function deterministicId(prefix: string, seed: string, parts: Array<string | number>): string {
  const joined = parts.map((p) => String(p)).join('|');
  return `${prefix}_${fnv1a(`${seed}|${joined}`)}`;
}

/**
 * encodeFloatsForHash — fixed-precision float encoding for deterministic
 * hashing input (Float64 -> string without locale/rounding nondeterminism).
 */
export function encodeFloatsForHash(values: Float32Array | number[]): string {
  let out = '';
  const len = values.length;
  for (let i = 0; i < len; i++) {
    const v = values[i];
    if (Number.isNaN(v)) { out += 'nan;'; continue; }
    out += v.toFixed(6) + ';';
  }
  return out;
}