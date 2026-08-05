/**
 * frontier/vec3.ts — Pure-function Vec3 math.
 *
 * We use plain {x,y,z} objects (no class) for two reasons:
 *   1. Allocation-free hot paths: callers can reuse scratch objects via the
 *      `*InPlace` family of functions.
 *   2. Determinism: no hidden state, no prototype mutation, no GC nondeterminism.
 *
 * All operations are IEEE-754 deterministic across JS runtimes.
 */

import type { Vec3, AABB } from './types';

/** Zero vector constant. Callers MUST NOT mutate. */
export const VEC3_ZERO: Vec3 = Object.freeze({ x: 0, y: 0, z: 0 }) as Vec3;
/** Up vector constant. */
export const VEC3_UP: Vec3 = Object.freeze({ x: 0, y: 1, z: 0 }) as Vec3;

/** Construct a new Vec3. */
export function vec3(x: number, y: number, z: number): Vec3 {
  return { x, y, z };
}

/** Clone a vector. */
export function clone(v: Vec3): Vec3 {
  return { x: v.x, y: v.y, z: v.z };
}

/** Add: returns a + b. */
export function add(a: Vec3, b: Vec3): Vec3 {
  return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z };
}

/** Add in-place: a += b, returns a. */
export function addInPlace(a: Vec3, b: Vec3): Vec3 {
  a.x += b.x;
  a.y += b.y;
  a.z += b.z;
  return a;
}

/** Subtract: returns a - b. */
export function sub(a: Vec3, b: Vec3): Vec3 {
  return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
}

/** Scale: returns v * s. */
export function scale(v: Vec3, s: number): Vec3 {
  return { x: v.x * s, y: v.y * s, z: v.z * s };
}

/** Scale in-place: v *= s, returns v. */
export function scaleInPlace(v: Vec3, s: number): Vec3 {
  v.x *= s;
  v.y *= s;
  v.z *= s;
  return v;
}

/** Dot product. */
export function dot(a: Vec3, b: Vec3): number {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}

/** Cross product: a × b. */
export function cross(a: Vec3, b: Vec3): Vec3 {
  return {
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x,
  };
}

/** Length. */
export function length(v: Vec3): number {
  return Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
}

/** Squared length (no sqrt — fast for comparisons). */
export function lengthSq(v: Vec3): number {
  return v.x * v.x + v.y * v.y + v.z * v.z;
}

/** Distance between two points. */
export function distance(a: Vec3, b: Vec3): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const dz = a.z - b.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

/** Squared distance. */
export function distanceSq(a: Vec3, b: Vec3): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const dz = a.z - b.z;
  return dx * dx + dy * dy + dz * dz;
}

/** Normalize: returns v / |v|. Returns zero vector if |v| < epsilon. */
export function normalize(v: Vec3, epsilon = 1e-12): Vec3 {
  const len = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
  if (len < epsilon) return { x: 0, y: 0, z: 0 };
  const inv = 1 / len;
  return { x: v.x * inv, y: v.y * inv, z: v.z * inv };
}

/** Normalize in-place. */
export function normalizeInPlace(v: Vec3, epsilon = 1e-12): Vec3 {
  const len = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
  if (len < epsilon) {
    v.x = 0; v.y = 0; v.z = 0;
    return v;
  }
  const inv = 1 / len;
  v.x *= inv; v.y *= inv; v.z *= inv;
  return v;
}

/** Linear interpolation: a + (b - a) * t. */
export function lerp(a: Vec3, b: Vec3, t: number): Vec3 {
  return {
    x: a.x + (b.x - a.x) * t,
    y: a.y + (b.y - a.y) * t,
    z: a.z + (b.z - a.z) * t,
  };
}

/** Negate: returns -v. */
export function negate(v: Vec3): Vec3 {
  return { x: -v.x, y: -v.y, z: -v.z };
}

/** Component-wise min. */
export function minComponents(a: Vec3, b: Vec3): Vec3 {
  return {
    x: Math.min(a.x, b.x),
    y: Math.min(a.y, b.y),
    z: Math.min(a.z, b.z),
  };
}

/** Component-wise max. */
export function maxComponents(a: Vec3, b: Vec3): Vec3 {
  return {
    x: Math.max(a.x, b.x),
    y: Math.max(a.y, b.y),
    z: Math.max(a.z, b.z),
  };
}

/** True if any component is NaN. */
export function hasNaN(v: Vec3): boolean {
  return Number.isNaN(v.x) || Number.isNaN(v.y) || Number.isNaN(v.z);
}

// ============================================================================
// AABB helpers
// ============================================================================

/** Construct an empty AABB (inverted bounds). */
export function emptyAABB(): AABB {
  return {
    minX: Number.POSITIVE_INFINITY,
    minY: Number.POSITIVE_INFINITY,
    minZ: Number.POSITIVE_INFINITY,
    maxX: Number.NEGATIVE_INFINITY,
    maxY: Number.NEGATIVE_INFINITY,
    maxZ: Number.NEGATIVE_INFINITY,
  };
}

/** Expand an AABB in place to include a point. Returns the same AABB. */
export function expandAABBPoint(box: AABB, p: Vec3): AABB {
  if (p.x < box.minX) box.minX = p.x;
  if (p.y < box.minY) box.minY = p.y;
  if (p.z < box.minZ) box.minZ = p.z;
  if (p.x > box.maxX) box.maxX = p.x;
  if (p.y > box.maxY) box.maxY = p.y;
  if (p.z > box.maxZ) box.maxZ = p.z;
  return box;
}

/** Expand an AABB in place to include another AABB. Returns the same AABB. */
export function expandAABBBounds(box: AABB, other: AABB): AABB {
  if (other.minX < box.minX) box.minX = other.minX;
  if (other.minY < box.minY) box.minY = other.minY;
  if (other.minZ < box.minZ) box.minZ = other.minZ;
  if (other.maxX > box.maxX) box.maxX = other.maxX;
  if (other.maxY > box.maxY) box.maxY = other.maxY;
  if (other.maxZ > box.maxZ) box.maxZ = other.maxZ;
  return box;
}

/** Compute the surface area of an AABB (used by BVH SAH). */
export function aabbSurfaceArea(box: AABB): number {
  const dx = box.maxX - box.minX;
  const dy = box.maxY - box.minY;
  const dz = box.maxZ - box.minZ;
  return 2 * (dx * dy + dy * dz + dz * dx);
}

/** Compute the centroid of an AABB. */
export function aabbCentroid(box: AABB): Vec3 {
  return {
    x: (box.minX + box.maxX) * 0.5,
    y: (box.minY + box.maxY) * 0.5,
    z: (box.minZ + box.maxZ) * 0.5,
  };
}

/** Test whether two AABBs overlap (touching counts as overlap). */
export function aabbOverlap(a: AABB, b: AABB): boolean {
  return !(a.maxX < b.minX || a.minX > b.maxX ||
           a.maxY < b.minY || a.minY > b.maxY ||
           a.maxZ < b.minZ || a.minZ > b.maxZ);
}

/** Test whether a point is inside an AABB. */
export function aabbContainsPoint(box: AABB, p: Vec3): boolean {
  return p.x >= box.minX && p.x <= box.maxX &&
         p.y >= box.minY && p.y <= box.maxY &&
         p.z >= box.minZ && p.z <= box.maxZ;
}

/**
 * Ray-vs-AABB intersection (slab method). Returns the entry distance or -1
 * if no hit. Deterministic.
 */
export function rayAABB(
  box: AABB,
  origin: Vec3,
  invDirX: number,
  invDirY: number,
  invDirZ: number,
  maxDist: number,
): number {
  // X slab
  let tmin = (box.minX - origin.x) * invDirX;
  let tmax = (box.maxX - origin.x) * invDirX;
  if (invDirX < 0) {
    const tmp = tmin; tmin = tmax; tmax = tmp;
  }

  // Y slab
  let tymin = (box.minY - origin.y) * invDirY;
  let tymax = (box.maxY - origin.y) * invDirY;
  if (invDirY < 0) {
    const tmp = tymin; tymin = tymax; tymax = tmp;
  }
  if (tmin > tymax || tymin > tmax) return -1;
  if (tymin > tmin) tmin = tymin;
  if (tymax < tmax) tmax = tymax;

  // Z slab
  let tzmin = (box.minZ - origin.z) * invDirZ;
  let tzmax = (box.maxZ - origin.z) * invDirZ;
  if (invDirZ < 0) {
    const tmp = tzmin; tzmin = tzmax; tzmax = tmp;
  }
  if (tmin > tzmax || tzmin > tmax) return -1;
  if (tzmin > tmin) tmin = tzmin;
  if (tzmax < tmax) tmax = tzmax;

  if (tmin > maxDist) return -1;
  if (tmax < 0) return -1;
  return tmin < 0 ? 0 : tmin;
}

/**
 * Segment-vs-AABB intersection. Returns true if the segment intersects the box.
 * Used by the capsule query to cull BVH nodes.
 */
export function segmentAABB(
  box: AABB,
  segStart: Vec3,
  segEnd: Vec3,
): boolean {
  // Liang-Barsky clip the segment against the box.
  let tmin = 0;
  let tmax = 1;
  const dx = segEnd.x - segStart.x;
  const dy = segEnd.y - segStart.y;
  const dz = segEnd.z - segStart.z;

  // For each axis: clip [tmin, tmax] against the slab.
  // X
  if (Math.abs(dx) < 1e-12) {
    if (segStart.x < box.minX || segStart.x > box.maxX) return false;
  } else {
    let t1 = (box.minX - segStart.x) / dx;
    let t2 = (box.maxX - segStart.x) / dx;
    if (t1 > t2) { const tmp = t1; t1 = t2; t2 = tmp; }
    if (t1 > tmin) tmin = t1;
    if (t2 < tmax) tmax = t2;
    if (tmin > tmax) return false;
  }
  // Y
  if (Math.abs(dy) < 1e-12) {
    if (segStart.y < box.minY || segStart.y > box.maxY) return false;
  } else {
    let t1 = (box.minY - segStart.y) / dy;
    let t2 = (box.maxY - segStart.y) / dy;
    if (t1 > t2) { const tmp = t1; t1 = t2; t2 = tmp; }
    if (t1 > tmin) tmin = t1;
    if (t2 < tmax) tmax = t2;
    if (tmin > tmax) return false;
  }
  // Z
  if (Math.abs(dz) < 1e-12) {
    if (segStart.z < box.minZ || segStart.z > box.maxZ) return false;
  } else {
    let t1 = (box.minZ - segStart.z) / dz;
    let t2 = (box.maxZ - segStart.z) / dz;
    if (t1 > t2) { const tmp = t1; t1 = t2; t2 = tmp; }
    if (t1 > tmin) tmin = t1;
    if (t2 < tmax) tmax = t2;
    if (tmin > tmax) return false;
  }
  return true;
}

/**
 * Test whether an AABB (a) expanded by `r` on all sides overlaps AABB (b).
 * Used to cull BVH nodes against a capsule (whose bounds = segment AABB + r).
 */
export function aabbOverlapInflated(a: AABB, r: number, b: AABB): boolean {
  return !(a.maxX + r < b.minX || a.minX - r > b.maxX ||
           a.maxY + r < b.minY || a.minY - r > b.maxY ||
           a.maxZ + r < b.minZ || a.minZ - r > b.maxZ);
}
