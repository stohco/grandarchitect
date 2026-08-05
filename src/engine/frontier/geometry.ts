/**
 * frontier/geometry.ts — Low-level geometric primitives.
 *
 * These functions are the math core of the frontier collision system.
 * They are pure (no state, no allocation beyond the return value), and they
 * are deterministic across JS runtimes (IEEE-754 + libc sin/cos/sqrt are
 * deterministic for the operations used here).
 *
 * The two heavy operations are:
 *   1. closestPointOnTriangle — Ericson RTCD §5.1.5
 *   2. segmentVsSegmentClosest — Ericson RTCD §5.1.9 (Lloyd's algorithm)
 *   3. capsuleVsTriangle — combines (1) and (2)
 *
 * Reference: Ericson, C. (2004). Real-Time Collision Detection. Morgan Kaufmann.
 */

import type { Vec3, Triangle, Capsule, SweepHit } from './types';
import { dot, sub, cross, clone } from './vec3';

// ============================================================================
// Triangle geometry
// ============================================================================

/** Compute the (unnormalized) normal of a triangle using CCW winding. */
export function triangleNormal(t: Triangle): Vec3 {
  const e1 = sub(t.v1, t.v0);
  const e2 = sub(t.v2, t.v0);
  return cross(e1, e2);
}

/** Compute the unit normal of a triangle. */
export function triangleNormalNormalized(t: Triangle): Vec3 {
  const n = triangleNormal(t);
  const len = Math.sqrt(n.x * n.x + n.y * n.y + n.z * n.z);
  if (len < 1e-12) return { x: 0, y: 1, z: 0 };
  return { x: n.x / len, y: n.y / len, z: n.z / len };
}

// ============================================================================
// Closest point on a triangle to a point — Ericson §5.1.5
// ============================================================================

/**
 * Returns the closest point on triangle (a,b,c) to point p.
 * Also returns the barycentric coordinates (u, v, w) via the out object.
 */
export function closestPointOnTriangle(
  a: Vec3,
  b: Vec3,
  c: Vec3,
  p: Vec3,
): Vec3 {
  const ab = sub(b, a);
  const ac = sub(c, a);
  const ap = sub(p, a);

  const d1 = dot(ab, ap);
  const d2 = dot(ac, ap);
  if (d1 <= 0 && d2 <= 0) return clone(a); // barycentric (1,0,0)

  const bp = sub(p, b);
  const d3 = dot(ab, bp);
  const d4 = dot(ac, bp);
  if (d3 >= 0 && d4 <= d3) return clone(b); // barycentric (0,1,0)

  const vc = d1 * d4 - d3 * d2;
  if (vc <= 0 && d1 >= 0 && d3 <= 0) {
    const v = d1 / (d1 - d3);
    return { x: a.x + v * ab.x, y: a.y + v * ab.y, z: a.z + v * ab.z };
  }

  const cp = sub(p, c);
  const d5 = dot(ab, cp);
  const d6 = dot(ac, cp);
  if (d6 >= 0 && d5 <= d6) return clone(c); // barycentric (0,0,1)

  const vb = d5 * d2 - d1 * d6;
  if (vb <= 0 && d2 >= 0 && d6 <= 0) {
    const w = d2 / (d2 - d6);
    return { x: a.x + w * ac.x, y: a.y + w * ac.y, z: a.z + w * ac.z };
  }

  const va = d3 * d6 - d5 * d4;
  if (va <= 0 && (d4 - d3) >= 0 && (d5 - d6) >= 0) {
    const w = (d4 - d3) / ((d4 - d3) + (d5 - d6));
    return {
      x: b.x + w * (c.x - b.x),
      y: b.y + w * (c.y - b.y),
      z: b.z + w * (c.z - b.z),
    };
  }

  // Face region — project p onto the triangle plane.
  const denom = 1 / (va + vb + vc);
  const v = vb * denom;
  const w = vc * denom;
  return {
    x: a.x + ab.x * v + ac.x * w,
    y: a.y + ab.y * v + ac.y * w,
    z: a.z + ab.z * v + ac.z * w,
  };
}

// ============================================================================
// Closest points between two segments — Ericson §5.1.9
// ============================================================================

/**
 * Returns the closest points on segments S1=(p1,q1) and S2=(p2,q2).
 * Returns { s1: point on S1, s2: point on S2, t: param on S1 in [0,1] }.
 */
export function closestPointsBetweenSegments(
  p1: Vec3, q1: Vec3,
  p2: Vec3, q2: Vec3,
): { s1: Vec3; s2: Vec3; t: number; distance: number } {
  const d1 = sub(q1, p1);
  const d2 = sub(q2, p2);
  const r = sub(p1, p2);

  const a = dot(d1, d1); // |d1|^2
  const e = dot(d2, d2); // |d2|^2
  const f = dot(d2, r);

  let s: number;
  let t: number;

  if (a <= 1e-12 && e <= 1e-12) {
    // Both segments degenerate to points.
    return { s1: clone(p1), s2: clone(p2), t: 0, distance: Math.sqrt(dot(r, r)) };
  }
  if (a <= 1e-12) {
    // First segment is a point.
    s = 0;
    t = clamp(f / e, 0, 1);
  } else {
    const c = dot(d1, r);
    if (e <= 1e-12) {
      // Second segment is a point.
      t = 0;
      s = clamp(-c / a, 0, 1);
    } else {
      // General case.
      const b = dot(d1, d2);
      const denom = a * e - b * b;
      if (denom !== 0) {
        s = clamp((b * f - c * e) / denom, 0, 1);
      } else {
        s = 0;
      }
      t = (b * s + f) / e;
      if (t < 0) {
        t = 0;
        s = clamp(-c / a, 0, 1);
      } else if (t > 1) {
        t = 1;
        s = clamp((b - c) / a, 0, 1);
      }
    }
  }

  const s1: Vec3 = {
    x: p1.x + d1.x * s,
    y: p1.y + d1.y * s,
    z: p1.z + d1.z * s,
  };
  const s2: Vec3 = {
    x: p2.x + d2.x * t,
    y: p2.y + d2.y * t,
    z: p2.z + d2.z * t,
  };
  const dx = s1.x - s2.x;
  const dy = s1.y - s2.y;
  const dz = s1.z - s2.z;
  return { s1, s2, t: s, distance: Math.sqrt(dx * dx + dy * dy + dz * dz) };
}

function clamp(x: number, lo: number, hi: number): number {
  if (x < lo) return lo;
  if (x > hi) return hi;
  return x;
}

// ============================================================================
// Capsule-vs-triangle closest distance + penetration
// ============================================================================

/**
 * Compute the closest distance between a capsule (segment + radius) and a
 * triangle. Returns the closest pair, the push direction (normalized, pointing
 * from triangle → capsule), and the penetration (radius - distance, positive
 * if overlapping).
 *
 * Algorithm:
 *   1. Find the closest pair between the capsule segment and the triangle.
 *      This is the minimum over:
 *        - closest point on triangle to each segment endpoint (2 cases)
 *        - closest pair between segment and each triangle edge (3 cases)
 *   2. The 5 candidate distances are computed; the minimum wins.
 *
 * This is a simplification of Ericson §5.1.5 + §5.1.9. For our use
 * (character controller) it is robust enough and avoids per-frame allocations.
 */
export function capsuleVsTriangle(
  capsule: Capsule,
  tri: Triangle,
  triIndex: number,
): SweepHit | null {
  // Candidate 1: closest point on triangle to capsule top.
  const topTri = closestPointOnTriangle(tri.v0, tri.v1, tri.v2, capsule.top);
  const dxT = capsule.top.x - topTri.x;
  const dyT = capsule.top.y - topTri.y;
  const dzT = capsule.top.z - topTri.z;
  const distTopSq = dxT * dxT + dyT * dyT + dzT * dzT;

  // Candidate 2: closest point on triangle to capsule bottom.
  const botTri = closestPointOnTriangle(tri.v0, tri.v1, tri.v2, capsule.bottom);
  const dxB = capsule.bottom.x - botTri.x;
  const dyB = capsule.bottom.y - botTri.y;
  const dzB = capsule.bottom.z - botTri.z;
  const distBotSq = dxB * dxB + dyB * dyB + dzB * dzB;

  // Candidate 3-5: closest pair between capsule segment and triangle edges.
  const edge1 = closestPointsBetweenSegments(capsule.top, capsule.bottom, tri.v0, tri.v1);
  const edge2 = closestPointsBetweenSegments(capsule.top, capsule.bottom, tri.v1, tri.v2);
  const edge3 = closestPointsBetweenSegments(capsule.top, capsule.bottom, tri.v2, tri.v0);

  // Find the minimum. We compare squared distances to avoid sqrt.
  const edge1DistSq = edge1.distance * edge1.distance;
  const edge2DistSq = edge2.distance * edge2.distance;
  const edge3DistSq = edge3.distance * edge3.distance;

  let bestDistSq = distTopSq;
  let bestCapsulePt = capsule.top;
  let bestTrianglePt = topTri;
  let bestT = 0; // top

  if (distBotSq < bestDistSq) {
    bestDistSq = distBotSq;
    bestCapsulePt = capsule.bottom;
    bestTrianglePt = botTri;
    bestT = 1;
  }
  if (edge1DistSq < bestDistSq) {
    bestDistSq = edge1DistSq;
    bestCapsulePt = edge1.s1;
    bestTrianglePt = edge1.s2;
    bestT = edge1.t;
  }
  if (edge2DistSq < bestDistSq) {
    bestDistSq = edge2DistSq;
    bestCapsulePt = edge2.s1;
    bestTrianglePt = edge2.s2;
    bestT = edge2.t;
  }
  if (edge3DistSq < bestDistSq) {
    bestDistSq = edge3DistSq;
    bestCapsulePt = edge3.s1;
    bestTrianglePt = edge3.s2;
    bestT = edge3.t;
  }

  const bestDist = Math.sqrt(bestDistSq);
  const penetration = capsule.radius - bestDist;

  // Compute push direction (triangle → capsule).
  let pushDir: Vec3;
  if (bestDist > 1e-9) {
    pushDir = {
      x: (bestCapsulePt.x - bestTrianglePt.x) / bestDist,
      y: (bestCapsulePt.y - bestTrianglePt.y) / bestDist,
      z: (bestCapsulePt.z - bestTrianglePt.z) / bestDist,
    };
  } else {
    // Capsule and triangle are coincident — use triangle face normal as push dir.
    pushDir = triangleNormalNormalized(tri);
  }

  return {
    capsulePoint: bestCapsulePt,
    trianglePoint: bestTrianglePt,
    normal: pushDir,
    penetration,
    segmentParam: bestT,
    triangleIndex: triIndex,
  };
}

// ============================================================================
// Ray-vs-triangle (Möller-Trumbore)
// ============================================================================

/**
 * Möller-Trumbore ray-vs-triangle test.
 * Returns the hit distance (along the normalized ray dir) or -1 if missed.
 * Backface culling is OFF (we want both sides for character collision).
 */
export function rayVsTriangle(
  origin: Vec3,
  dir: Vec3,
  v0: Vec3,
  v1: Vec3,
  v2: Vec3,
  maxDist: number,
): { distance: number; u: number; v: number } | null {
  const edge1 = sub(v1, v0);
  const edge2 = sub(v2, v0);
  const h = cross(dir, edge2);
  const a = dot(edge1, h);
  if (a > -1e-9 && a < 1e-9) return null; // parallel

  const f = 1 / a;
  const s = sub(origin, v0);
  const u = f * dot(s, h);
  if (u < 0 || u > 1) return null;

  const q = cross(s, edge1);
  const v = f * dot(dir, q);
  if (v < 0 || u + v > 1) return null;

  const t = f * dot(edge2, q);
  if (t < 0 || t > maxDist) return null;

  return { distance: t, u, v };
}

/**
 * Compute the geometric normal of a triangle hit, oriented to face the ray.
 * (For character collision we want the normal pointing TOWARD the ray origin
 * so the push direction is correct.)
 */
export function triangleNormalFacingRay(
  v0: Vec3, v1: Vec3, v2: Vec3,
  rayDir: Vec3,
): Vec3 {
  const e1 = sub(v1, v0);
  const e2 = sub(v2, v0);
  const n = cross(e1, e2);
  const len = Math.sqrt(n.x * n.x + n.y * n.y + n.z * n.z);
  if (len < 1e-12) return { x: 0, y: 1, z: 0 };
  const nx = n.x / len;
  const ny = n.y / len;
  const nz = n.z / len;
  // Flip if facing same direction as ray.
  if (nx * rayDir.x + ny * rayDir.y + nz * rayDir.z > 0) {
    return { x: -nx, y: -ny, z: -nz };
  }
  return { x: nx, y: ny, z: nz };
}
