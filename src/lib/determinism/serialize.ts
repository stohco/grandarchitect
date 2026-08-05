/**
 * Deterministic serialization: CBOR (RFC 8949 deterministic encoding).
 *
 * Why CBOR:
 *   - RFC 8949 §4.2 mandates "Deterministic Encoding": length-first map key
 *     ordering, shortest int encoding, sorted keys. This is the only
 *     widely-adopted binary format with spec-defined cross-implementation
 *     byte stability.
 *   - JSON is NOT deterministic (key ordering is unspecified across engines).
 *   - MessagePack has no canonical form (key ordering unspecified).
 *   - Protobuf has partial determinism but is weaker than CBOR.
 *
 * Why cbor-x:
 *   - Pure JS/TS, fast, MIT, actively maintained.
 *   - Supports the deterministic mode via options.
 *
 * The wrapper below configures cbor-x for deterministic output:
 *   - useRecords: false (records are a non-deterministic cbor-x extension)
 *   - mapsAsObjects: false (use Map instead of Object, preserving key order)
 *
 * The hash input is the CBOR-encoded bytes of the state object.
 */

import { encode as cborEncode, decode as cborDecode, Encoder } from 'cbor-x';

// Deterministic encoder: useRecords: false ensures stable key ordering
// (RFC 8949 §4.2). We use a single Encoder instance to avoid creating
// a new one per call.
const deterministicEncoder = new Encoder({ useRecords: false });

/**
 * Encode a state object to deterministic CBOR bytes.
 *
 * The state object MUST be a plain object (or Map) whose values are:
 *   - numbers (doubles or integers)
 *   - strings
 *   - arrays
 *   - plain objects (recursively)
 *   - Uint8Array (for binary blobs)
 *   - null
 *
 * BigInt is NOT directly supported by cbor-x. Convert BigInts to hex strings
 * before encoding (see rng.ts snapshotState, fixed-point.ts snapshot).
 */
export function encodeState(state: unknown): Uint8Array {
  const bytes = deterministicEncoder.encode(state);
  return bytes as Uint8Array;
}

/**
 * Decode CBOR bytes back to a state object.
 */
export function decodeState(bytes: Uint8Array): unknown {
  return cborDecode(bytes);
}

export const SERIALIZATION_VERSION = '0.1.0';
export const SERIALIZATION_METHOD = 'CBOR RFC 8949 deterministic encoding (cbor-x)';
