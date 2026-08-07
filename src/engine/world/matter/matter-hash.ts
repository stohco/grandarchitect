/**
 * Stable String Hashing — FNV-1a 64
 * ===================================
 *
 * Internal helper for the matter-conservation subsystem. Produces a
 * deterministic 64-bit BigInt (and hex string) from an ASCII string,
 * without importing node:crypto or the (currently type-erroring) hash
 * module. FNV-1a over char codes is bit-identical across runtimes for
 * ASCII inputs, which is all we feed it (material ids, seed strings,
 * operation ids).
 */

const FNV_OFFSET = 0xcbf29ce484222325n;
const FNV_PRIME = 0x100000001b3n;
const MASK64 = 0xffffffffffffffffn;

/** FNV-1a 64-bit hash of an ASCII string, as a BigInt. */
export function stableHash64(input: string): bigint {
  let h = FNV_OFFSET;
  for (let i = 0; i < input.length; i++) {
    h ^= BigInt(input.charCodeAt(i));
    h = (h * FNV_PRIME) & MASK64;
  }
  return h;
}

/** FNV-1a 64-bit hash as a 16-char hex string. */
export function stableHashHex(input: string): string {
  return stableHash64(input).toString(16).padStart(16, '0');
}
