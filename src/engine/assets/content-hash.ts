/**
 * Content Hash — deterministic asset hashing
 * ============================================
 *
 * Every asset artifact (source geometry, LOD level, GLB binary, collision
 * hierarchy) is content-addressed by a SHA-256 over its canonical bytes.
 *
 * Determinism contract:
 *   - @noble/hashes sha256 is pure JS — bit-identical across Node, Bun and
 *     every browser engine (no crypto.subtle dependency).
 *   - Float32Array → byte views are IEEE-754 round-trip exact; hashing the
 *     raw bytes (not the JSON stringification) keeps hashes stable across
 *     serialization layers.
 *   - Buffers are always hashed in a pinned field order so a hash is a hash
 *     of CONTENT, not of an object shape.
 */

import { sha256 } from '@noble/hashes/sha2.js';

/** Hex-encode a Uint8Array SHA-256 digest. */
export function sha256Hex(bytes: Uint8Array): string {
  return Buffer.from(sha256(bytes)).toString('hex');
}

/** Length-prefixed canonical buffer for a typed array (prevents ambiguity). */
function canonicalBytes(label: string, bytes: Uint8Array): Uint8Array {
  const labelBytes = new TextEncoder().encode(label);
  const len = new Uint8Array(4);
  new DataView(len.buffer).setUint32(0, bytes.byteLength, true);
  const out = new Uint8Array(labelBytes.length + 4 + bytes.byteLength);
  out.set(labelBytes, 0);
  out.set(len, labelBytes.length);
  out.set(bytes, labelBytes.length + 4);
  return out;
}

export interface HashableGeometry {
  positions: Float32Array;
  uvs: Float32Array | null;
  normals: Float32Array | null;
  indices: Uint32Array;
}

/**
 * Hash a geometry artifact. Field order is pinned: positions, uvs, normals,
 * indices. Null UVs/normals hash as empty buffers with their label present,
 * so a mesh without UVs can never collide with a mesh whose UV buffer is
 * legitimately empty.
 */
export function hashGeometry(geo: HashableGeometry): string {
  const parts = [
    canonicalBytes('positions', new Uint8Array(geo.positions.buffer, geo.positions.byteOffset, geo.positions.byteLength)),
    canonicalBytes('uvs', geo.uvs ? new Uint8Array(geo.uvs.buffer, geo.uvs.byteOffset, geo.uvs.byteLength) : new Uint8Array(0)),
    canonicalBytes('normals', geo.normals ? new Uint8Array(geo.normals.buffer, geo.normals.byteOffset, geo.normals.byteLength) : new Uint8Array(0)),
    canonicalBytes('indices', new Uint8Array(geo.indices.buffer, geo.indices.byteOffset, geo.indices.byteLength)),
  ];
  let total = 0;
  for (const p of parts) total += p.byteLength;
  const out = new Uint8Array(total);
  let offset = 0;
  for (const p of parts) {
    out.set(p, offset);
    offset += p.byteLength;
  }
  return sha256Hex(out);
}

/**
 * Hash an arbitrary JSON-serializable value. Keys are serialized in
 * insertion order — callers must build the value in a canonical order.
 */
export function hashJson(value: unknown): string {
  return sha256Hex(new TextEncoder().encode(JSON.stringify(value)));
}
