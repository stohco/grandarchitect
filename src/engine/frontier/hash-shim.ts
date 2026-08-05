/**
 * frontier/hash-shim.ts — SHA-256 wrapper for the frontier engine.
 *
 * Why a shim:
 *   The frontier engine is used both in the browser (Three.js viewport) and
 *   in API routes (Node.js). The determinism stack in src/lib/determinism
 *   uses @noble/hashes for cross-context determinism (no secure-context
 *   requirement, pure JS, deterministic across all runtimes).
 *
 *   We re-export the SHA-256 function here so the frontier code has a single
 *   import path that does not depend on the kernel.
 */

import { sha256 } from '@noble/hashes/sha2.js';

/** Compute SHA-256 of a Uint8Array. Returns 32 raw bytes. Deterministic. */
export const nobleSha256 = sha256;

/** Convenience: SHA-256 of a UTF-8 string, returned as hex. */
export function sha256Hex(input: string): string {
  const bytes = new TextEncoder().encode(input);
  const hash = sha256(bytes);
  let hex = '';
  for (let i = 0; i < hash.length; i++) {
    hex += hash[i].toString(16).padStart(2, '0');
  }
  return hex;
}
