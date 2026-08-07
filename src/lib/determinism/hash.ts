/**
 * SHA-256 hashing for determinism verification.
 *
 * Two paths:
 *   1. crypto.subtle.digest('SHA-256') — async, native-speed, browser built-in.
 *      Used for full-state checkpoints and save/load.
 *   2. @noble/hashes/sha2 — synchronous, pure-JS, for in-worker hot validation.
 *
 * Both produce identical output for the same input bytes (SHA-256 is a
 * well-specified algorithm). The choice is about async-vs-sync, not correctness.
 */

import { sha256 as nobleSha256 } from '@noble/hashes/sha2.js';

/**
 * Async SHA-256. Uses crypto.subtle when available (native-speed, secure
 * contexts only); falls back to @noble/hashes (pure JS, works everywhere)
 * in non-secure contexts (e.g., HTTP gateways on non-localhost origins).
 *
 * Both produce identical output for the same input bytes (SHA-256 is a
 * well-specified algorithm). The choice is about speed, not correctness.
 */
export async function hashAsync(bytes: Uint8Array): Promise<string> {
  if (typeof crypto !== 'undefined' && crypto.subtle && crypto.subtle.digest) {
    try {
      const hashBuffer = await crypto.subtle.digest('SHA-256', bytes as unknown as BufferSource);
      return toHex(new Uint8Array(hashBuffer));
    } catch {
      // Fall through to noble if crypto.subtle fails at runtime
    }
  }
  return hashSync(bytes);
}

/**
 * Sync SHA-256 via @noble/hashes. For in-worker validation where async
 * would require yielding. Returns a hex string (64 chars).
 */
export function hashSync(bytes: Uint8Array): string {
  const hashBytes = nobleSha256(bytes);
  return toHex(hashBytes);
}

/** Convert bytes to a lowercase hex string. */
function toHex(bytes: Uint8Array): string {
  let hex = '';
  for (let i = 0; i < bytes.length; i++) {
    hex += bytes[i].toString(16).padStart(2, '0');
  }
  return hex;
}

export const HASH_ALGORITHM_VERSION = 'SHA-256';
export const HASH_LIBRARIES = 'crypto.subtle (async) + @noble/hashes (sync)';
