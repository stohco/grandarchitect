/**
 * cosmic-hash — Deterministic hashing primitives for the cosmos modules.
 *
 * The cosmos subsystem is deterministic by construction: no Math.random(),
 * no Date.now(), no engine-dependent rounding. All ids and stochastic
 * outcomes derive from FNV-1a string hashes and a Park-Miller LCG.
 *
 * FNV-1a 32-bit: bit-specified, portable across every JS engine
 * (Math.imul + unsigned shift are ECMA-specified).
 */

/** FNV-1a 32-bit hash of a string, returned as an 8-char lowercase hex. */
export function fnv1a(input: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}

/** Deterministic 32-bit number from a string (parse of fnv1a). */
export function hashToNumber(input: string): number {
  return parseInt(fnv1a(input), 16) >>> 0;
}

/**
 * Park-Miller LCG step. One step per call; the caller keeps the state.
 * 48271 × (2^31 − 1) ≈ 1.04e14 < 2^53, so plain number arithmetic is exact.
 */
export function lcgStep(state: number): number {
  return Math.imul(state, 48271) % 2147483647;
}

/** Deterministic cord/incarnation id: `prefix_<fnv1a(seed|inputs)>`. */
export function deterministicId(prefix: string, seed: string, parts: Array<string | number>): string {
  const joined = parts.map((p) => String(p)).join('|');
  return `${prefix}_${fnv1a(`${seed}|${joined}`)}`;
}
