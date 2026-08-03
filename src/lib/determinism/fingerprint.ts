/**
 * The DeterminismFingerprint.
 *
 * A save file is only valid in an engine that produced it. The fingerprint
 * records the exact versions of every determinism-affecting component, so
 * a save from fingerprint X loads only in engine fingerprint X (or via a
 * documented migration path).
 *
 * This solves the "release-pinned determinism is incompatible with patching"
 * problem: when a component version changes, the fingerprint changes, and
 * old saves are flagged for migration rather than silently mis-loaded.
 */

export interface DeterminismFingerprint {
  /** The overall fingerprint version (this struct's schema). */
  schemaVersion: string;
  /** The RNG algorithm and version. */
  rng: { algorithm: string; version: string };
  /** The transcendentals method and version. */
  transcendentals: { method: string; version: string };
  /** The fixed-point method and version. */
  fixedPoint: { method: string; version: string };
  /** The serialization format and version. */
  serialization: { format: string; version: string };
  /** The hash algorithm. */
  hash: { algorithm: string; libraries: string };
  /** The timestamp the fingerprint was generated (for debugging only,
   * not part of the determinism check). */
  generatedAt: string;
}

/**
 * Get the current engine's fingerprint.
 * This is computed once per session and embedded in every save.
 */
export function getFingerprint(): DeterminismFingerprint {
  return {
    schemaVersion: '0.1.0',
    rng: {
      algorithm: 'xoshiro256** + splitmix64 (BigInt-backed)',
      version: '0.1.0',
    },
    transcendentals: {
      method: 'Cody-Waite range reduction + minimax polynomials (fdlibm-derived), pure TS',
      version: '0.1.0',
    },
    fixedPoint: {
      method: 'Q32.32 fixed-point, BigInt-backed',
      version: '0.1.0',
    },
    serialization: {
      format: 'CBOR RFC 8949 deterministic encoding (cbor-x)',
      version: '0.1.0',
    },
    hash: {
      algorithm: 'SHA-256',
      libraries: 'crypto.subtle (async) + @noble/hashes (sync)',
    },
    generatedAt: new Date().toISOString(),
  };
}

/**
 * Check whether two fingerprints are compatible (i.e., a save from one
 * can be loaded in the other). For the prototype, this is strict equality
 * of all fields except generatedAt. A future migration system would allow
 * documented version transitions.
 */
export function fingerprintsCompatible(
  a: DeterminismFingerprint,
  b: DeterminismFingerprint,
): { compatible: boolean; differences: string[] } {
  const differences: string[] = [];
  if (a.schemaVersion !== b.schemaVersion) differences.push('schemaVersion');
  if (a.rng.algorithm !== b.rng.algorithm) differences.push('rng.algorithm');
  if (a.rng.version !== b.rng.version) differences.push('rng.version');
  if (a.transcendentals.method !== b.transcendentals.method) differences.push('transcendentals.method');
  if (a.transcendentals.version !== b.transcendentals.version) differences.push('transcendentals.version');
  if (a.fixedPoint.method !== b.fixedPoint.method) differences.push('fixedPoint.method');
  if (a.fixedPoint.version !== b.fixedPoint.version) differences.push('fixedPoint.version');
  if (a.serialization.format !== b.serialization.format) differences.push('serialization.format');
  if (a.serialization.version !== b.serialization.version) differences.push('serialization.version');
  if (a.hash.algorithm !== b.hash.algorithm) differences.push('hash.algorithm');
  return {
    compatible: differences.length === 0,
    differences,
  };
}
