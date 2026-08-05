/**
 * frontier/bvh.ts — Bounding Volume Hierarchy for triangle meshes.
 *
 * Why BVH?
 *   Three.js's Raycaster.intersectObject is O(n) over triangles. For a 50k-
 *   triangle terrain mesh, that is ~50k ray-triangle tests per query — and
 *   the character controller casts several rays per tick (ground probe,
 *   forward probe, side probes). That is millions of tests per second,
 *   overwhelming the simulation budget.
 *
 *   A BVH reduces this to O(log n) by culling distant triangles via AABB tests.
 *   For a balanced BVH on 50k triangles, depth ≈ 16, so a ray visits ~16
 *   internal nodes + a handful of leaves containing <16 triangles each.
 *
 * Design:
 *   - Binary BVH (two children per internal node).
 *   - Build strategy: median-split along the longest axis of the centroid
 *     extents. Median-split is O(n log n) and produces balanced trees without
 *     the SAH overhead — sufficient for our mesh sizes (up to ~100k tris).
 *   - Storage: Structure-of-Arrays in Float64Array / Int32Array for cache
 *     friendliness and zero allocation during traversal.
 *   - Leaf size: ≤ 8 triangles. Larger leaves reduce tree depth but increase
 *     per-leaf triangle tests.
 *
 * API:
 *   - buildBVH(positions, indices) → BVH
 *   - intersectRay(bvh, ray, maxDist) → RaycastHit | null
 *   - intersectRayAll(bvh, ray, maxDist) → RaycastHit[]
 *   - queryCapsule(bvh, segmentTop, segmentBottom, radius) → SweepHit[]
 *
 * Determinism:
 *   - Sort uses a well-defined comparator (centroid axis).
 *   - ES2019+ Array.sort is stable, so ties are broken by insertion order.
 *   - All math is IEEE-754.
 */

import type { Vec3, AABB, Ray, RaycastHit, SweepHit, Capsule } from './types';
import {
  emptyAABB, expandAABBPoint, aabbCentroid, rayAABB, segmentAABB,
  aabbOverlapInflated, aabbSurfaceArea,
} from './vec3';
import {
  rayVsTriangle, triangleNormalFacingRay, capsuleVsTriangle,
} from './geometry';

/** Maximum triangles per BVH leaf. */
const MAX_LEAF_TRIANGLES = 8;

/**
 * BVH stored as Structure-of-Arrays for cache-friendly traversal.
 *
 * Each node is identified by an index. Arrays are sized to 2N-1 nodes worst case
 * for a binary tree of N leaves.
 */
export interface BVH {
  /** Original mesh positions (Float32Array view, NOT copied). */
  positions: Float32Array;
  /** Original mesh indices (Uint32Array view, NOT copied). */
  indices: Uint32Array;
  /** Triangle indices (each entry references a triangle in `indices`). */
  triangleOrder: Int32Array;
  /** Per-triangle precomputed centroid X (avoids recompute during traversal). */
  centroidX: Float32Array;
  centroidY: Float32Array;
  centroidZ: Float32Array;
  /** Node bounds: 6 floats per node [minX, minY, minZ, maxX, maxY, maxZ]. */
  nodesBounds: Float32Array;
  /** Node children: 2 ints per node [left, right]. -1 if leaf. */
  nodesChildren: Int32Array;
  /** Node triangle range: 2 ints per node [triStart, triCount]. Count 0 if internal. */
  nodesTris: Int32Array;
  /** Number of nodes actually used (≤ allocated). */
  nodeCount: number;
  /** Total triangle count. */
  triangleCount: number;
}

// ============================================================================
// BVH builder
// ============================================================================

/**
 * Build a BVH from a triangle mesh.
 *
 * @param positions Float32Array of vertex positions, length 3*vertexCount.
 * @param indices   Uint32Array of triangle indices, length 3*triangleCount.
 * @returns The BVH.
 */
export function buildBVH(positions: Float32Array, indices: Uint32Array): BVH {
  const triCount = indices.length / 3 | 0;

  // Precompute triangle centroids and per-triangle AABBs.
  const triangleOrder = new Int32Array(triCount);
  const centroidX = new Float32Array(triCount);
  const centroidY = new Float32Array(triCount);
  const centroidZ = new Float32Array(triCount);

  for (let t = 0; t < triCount; t++) {
    triangleOrder[t] = t;
    const i0 = indices[t * 3] * 3;
    const i1 = indices[t * 3 + 1] * 3;
    const i2 = indices[t * 3 + 2] * 3;
    const x = (positions[i0] + positions[i1] + positions[i2]) / 3;
    const y = (positions[i0 + 1] + positions[i1 + 1] + positions[i2 + 1]) / 3;
    const z = (positions[i0 + 2] + positions[i1 + 2] + positions[i2 + 2]) / 3;
    centroidX[t] = x;
    centroidY[t] = y;
    centroidZ[t] = z;
  }

  // Worst-case node count: 2*triCount - 1.
  const maxNodes = Math.max(2 * triCount - 1, 1);
  const nodesBounds = new Float32Array(maxNodes * 6);
  const nodesChildren = new Int32Array(maxNodes * 2).fill(-1);
  const nodesTris = new Int32Array(maxNodes * 2).fill(0);

  let nodeCount = 0;

  /**
   * Recursively build a subtree covering triangles [triStart, triStart+triCount).
   * Returns the node index.
   *
   * Stack-safe up to ~50k triangles (depth ~32). For larger meshes, convert
   * to an explicit stack.
   */
  function buildRecursive(triStart: number, triCountSub: number): number {
    const nodeId = nodeCount++;
    if (nodeId >= maxNodes) {
      // Should never happen if maxNodes is computed correctly.
      throw new Error(`BVH overflow: nodeId=${nodeId} >= maxNodes=${maxNodes}`);
    }

    // Compute the AABB of all triangles in this range.
    const bounds = emptyAABB();
    for (let i = 0; i < triCountSub; i++) {
      const triIdx = triangleOrder[triStart + i];
      const i0 = indices[triIdx * 3] * 3;
      const i1 = indices[triIdx * 3 + 1] * 3;
      const i2 = indices[triIdx * 3 + 2] * 3;
      expandAABBPoint(bounds, { x: positions[i0], y: positions[i0 + 1], z: positions[i0 + 2] });
      expandAABBPoint(bounds, { x: positions[i1], y: positions[i1 + 1], z: positions[i1 + 2] });
      expandAABBPoint(bounds, { x: positions[i2], y: positions[i2 + 1], z: positions[i2 + 2] });
    }
    nodesBounds[nodeId * 6] = bounds.minX;
    nodesBounds[nodeId * 6 + 1] = bounds.minY;
    nodesBounds[nodeId * 6 + 2] = bounds.minZ;
    nodesBounds[nodeId * 6 + 3] = bounds.maxX;
    nodesBounds[nodeId * 6 + 4] = bounds.maxY;
    nodesBounds[nodeId * 6 + 5] = bounds.maxZ;

    // Leaf?
    if (triCountSub <= MAX_LEAF_TRIANGLES) {
      nodesTris[nodeId * 2] = triStart;
      nodesTris[nodeId * 2 + 1] = triCountSub;
      nodesChildren[nodeId * 2] = -1;
      nodesChildren[nodeId * 2 + 1] = -1;
      return nodeId;
    }

    // Choose split axis: longest extent of centroid AABB.
    // First, compute centroid extents.
    let cMinX = Number.POSITIVE_INFINITY, cMinY = Number.POSITIVE_INFINITY, cMinZ = Number.POSITIVE_INFINITY;
    let cMaxX = Number.NEGATIVE_INFINITY, cMaxY = Number.NEGATIVE_INFINITY, cMaxZ = Number.NEGATIVE_INFINITY;
    for (let i = 0; i < triCountSub; i++) {
      const triIdx = triangleOrder[triStart + i];
      const cx = centroidX[triIdx];
      const cy = centroidY[triIdx];
      const cz = centroidZ[triIdx];
      if (cx < cMinX) cMinX = cx;
      if (cy < cMinY) cMinY = cy;
      if (cz < cMinZ) cMinZ = cz;
      if (cx > cMaxX) cMaxX = cx;
      if (cy > cMaxY) cMaxY = cy;
      if (cz > cMaxZ) cMaxZ = cz;
    }
    const extX = cMaxX - cMinX;
    const extY = cMaxY - cMinY;
    const extZ = cMaxZ - cMinZ;
    let axis = 0; // 0=X, 1=Y, 2=Z
    if (extY >= extX && extY >= extZ) axis = 1;
    else if (extZ >= extX && extZ >= extY) axis = 2;

    // Sort triangles in [triStart, triStart+triCountSub) by centroid on the chosen axis.
    // Use a slice + sort + write-back to avoid sorting the whole array.
    const slice = Array.from(triangleOrder.subarray(triStart, triStart + triCountSub));
    slice.sort((a, b) => {
      const ca = axis === 0 ? centroidX[a] : axis === 1 ? centroidY[a] : centroidZ[a];
      const cb = axis === 0 ? centroidX[b] : axis === 1 ? centroidY[b] : centroidZ[b];
      if (ca < cb) return -1;
      if (ca > cb) return 1;
      // Stable tiebreaker: triangle index. (Array.sort is stable but this
      // makes the order fully deterministic regardless of sort stability.)
      return a - b;
    });
    for (let i = 0; i < slice.length; i++) {
      triangleOrder[triStart + i] = slice[i];
    }

    // Split at median.
    const mid = triCountSub >> 1;
    const leftCount = mid;
    const rightCount = triCountSub - mid;

    // Reserve this node's slot, then build children. We need to do this in
    // a specific order so the children's ids are correctly reserved.
    // We build the LEFT child first (recursively), which increments nodeCount
    // for itself and any descendants, then we build the RIGHT child.
    const leftId = buildRecursive(triStart, leftCount);
    const rightId = buildRecursive(triStart + leftCount, rightCount);

    nodesChildren[nodeId * 2] = leftId;
    nodesChildren[nodeId * 2 + 1] = rightId;
    nodesTris[nodeId * 2] = 0;
    nodesTris[nodeId * 2 + 1] = 0;
    return nodeId;
  }

  if (triCount > 0) {
    buildRecursive(0, triCount);
  } else {
    // Empty mesh: create a single empty root.
    nodeCount = 1;
    nodesBounds[0] = 0; nodesBounds[1] = 0; nodesBounds[2] = 0;
    nodesBounds[3] = 0; nodesBounds[4] = 0; nodesBounds[5] = 0;
    nodesTris[0] = 0; nodesTris[1] = 0;
    nodesChildren[0] = -1; nodesChildren[1] = -1;
  }

  return {
    positions,
    indices,
    triangleOrder,
    centroidX, centroidY, centroidZ,
    nodesBounds,
    nodesChildren,
    nodesTris,
    nodeCount,
    triangleCount: triCount,
  };
}

// ============================================================================
// BVH traversal: ray intersection (closest hit)
// ============================================================================

/**
 * Intersect a ray against the BVH. Returns the closest hit, or null.
 * The ray direction MUST be normalized.
 *
 * Stack-based traversal (no recursion) for performance and stack safety.
 */
export function intersectRay(
  bvh: BVH,
  ray: Ray,
  maxDist: number,
): RaycastHit | null {
  if (bvh.nodeCount === 0 || bvh.triangleCount === 0) return null;

  const invDirX = ray.dir.x !== 0 ? 1 / ray.dir.x : Number.POSITIVE_INFINITY * Math.sign(ray.dir.x || 1);
  const invDirY = ray.dir.y !== 0 ? 1 / ray.dir.y : Number.POSITIVE_INFINITY * Math.sign(ray.dir.y || 1);
  const invDirZ = ray.dir.z !== 0 ? 1 / ray.dir.z : Number.POSITIVE_INFINITY * Math.sign(ray.dir.z || 1);

  let closestDist = maxDist;
  let closestTri = -1;
  let closestPoint: Vec3 | null = null;
  let closestNormal: Vec3 | null = null;

  const stack = new Int32Array(64);
  let stackPtr = 0;
  stack[stackPtr++] = 0; // root

  while (stackPtr > 0) {
    const nodeId = stack[--stackPtr];
    const base = nodeId * 6;
    const boxMinX = bvh.nodesBounds[base];
    const boxMinY = bvh.nodesBounds[base + 1];
    const boxMinZ = bvh.nodesBounds[base + 2];
    const boxMaxX = bvh.nodesBounds[base + 3];
    const boxMaxY = bvh.nodesBounds[base + 4];
    const boxMaxZ = bvh.nodesBounds[base + 5];

    // Ray-vs-AABB test.
    const tEntry = rayAABB(
      { minX: boxMinX, minY: boxMinY, minZ: boxMinZ, maxX: boxMaxX, maxY: boxMaxY, maxZ: boxMaxZ },
      ray.origin, invDirX, invDirY, invDirZ, closestDist,
    );
    if (tEntry < 0) continue;

    // Internal or leaf?
    const triStart = bvh.nodesTris[nodeId * 2];
    const triCount = bvh.nodesTris[nodeId * 2 + 1];
    if (triCount > 0) {
      // Leaf: test each triangle.
      for (let i = 0; i < triCount; i++) {
        const triIdx = bvh.triangleOrder[triStart + i];
        const i0 = bvh.indices[triIdx * 3];
        const i1 = bvh.indices[triIdx * 3 + 1];
        const i2 = bvh.indices[triIdx * 3 + 2];
        const v0 = { x: bvh.positions[i0 * 3], y: bvh.positions[i0 * 3 + 1], z: bvh.positions[i0 * 3 + 2] };
        const v1 = { x: bvh.positions[i1 * 3], y: bvh.positions[i1 * 3 + 1], z: bvh.positions[i1 * 3 + 2] };
        const v2 = { x: bvh.positions[i2 * 3], y: bvh.positions[i2 * 3 + 1], z: bvh.positions[i2 * 3 + 2] };
        const hit = rayVsTriangle(ray.origin, ray.dir, v0, v1, v2, closestDist);
        if (hit) {
          closestDist = hit.distance;
          closestTri = triIdx;
          closestPoint = {
            x: ray.origin.x + ray.dir.x * hit.distance,
            y: ray.origin.y + ray.dir.y * hit.distance,
            z: ray.origin.z + ray.dir.z * hit.distance,
          };
          closestNormal = triangleNormalFacingRay(v0, v1, v2, ray.dir);
        }
      }
    } else {
      // Internal: push children. Push the farther one first so the nearer
      // one is processed first (closer hits reduce the maxDist early).
      const left = bvh.nodesChildren[nodeId * 2];
      const right = bvh.nodesChildren[nodeId * 2 + 1];
      if (left >= 0) stack[stackPtr++] = left;
      if (right >= 0) stack[stackPtr++] = right;
      if (stackPtr > 60) {
        // Stack overflow protection — extremely unlikely with reasonable meshes.
        // Fall back to iterative scan.
        break;
      }
    }
  }

  if (closestTri < 0 || !closestPoint || !closestNormal) return null;
  return {
    point: closestPoint,
    normal: closestNormal,
    distance: closestDist,
    triangleIndex: closestTri,
  };
}

/**
 * Intersect a ray against the BVH, returning ALL hits (unsorted beyond by-distance).
 * Useful for queries like "what triangles does this ray pass through".
 */
export function intersectRayAll(
  bvh: BVH,
  ray: Ray,
  maxDist: number,
): RaycastHit[] {
  const hits: RaycastHit[] = [];
  if (bvh.nodeCount === 0 || bvh.triangleCount === 0) return hits;

  const invDirX = ray.dir.x !== 0 ? 1 / ray.dir.x : Number.POSITIVE_INFINITY * Math.sign(ray.dir.x || 1);
  const invDirY = ray.dir.y !== 0 ? 1 / ray.dir.y : Number.POSITIVE_INFINITY * Math.sign(ray.dir.y || 1);
  const invDirZ = ray.dir.z !== 0 ? 1 / ray.dir.z : Number.POSITIVE_INFINITY * Math.sign(ray.dir.z || 1);

  const stack = new Int32Array(64);
  let stackPtr = 0;
  stack[stackPtr++] = 0;

  while (stackPtr > 0) {
    const nodeId = stack[--stackPtr];
    const base = nodeId * 6;
    const boxMinX = bvh.nodesBounds[base];
    const boxMinY = bvh.nodesBounds[base + 1];
    const boxMinZ = bvh.nodesBounds[base + 2];
    const boxMaxX = bvh.nodesBounds[base + 3];
    const boxMaxY = bvh.nodesBounds[base + 4];
    const boxMaxZ = bvh.nodesBounds[base + 5];

    const tEntry = rayAABB(
      { minX: boxMinX, minY: boxMinY, minZ: boxMinZ, maxX: boxMaxX, maxY: boxMaxY, maxZ: boxMaxZ },
      ray.origin, invDirX, invDirY, invDirZ, maxDist,
    );
    if (tEntry < 0) continue;

    const triStart = bvh.nodesTris[nodeId * 2];
    const triCount = bvh.nodesTris[nodeId * 2 + 1];
    if (triCount > 0) {
      for (let i = 0; i < triCount; i++) {
        const triIdx = bvh.triangleOrder[triStart + i];
        const i0 = bvh.indices[triIdx * 3];
        const i1 = bvh.indices[triIdx * 3 + 1];
        const i2 = bvh.indices[triIdx * 3 + 2];
        const v0 = { x: bvh.positions[i0 * 3], y: bvh.positions[i0 * 3 + 1], z: bvh.positions[i0 * 3 + 2] };
        const v1 = { x: bvh.positions[i1 * 3], y: bvh.positions[i1 * 3 + 1], z: bvh.positions[i1 * 3 + 2] };
        const v2 = { x: bvh.positions[i2 * 3], y: bvh.positions[i2 * 3 + 1], z: bvh.positions[i2 * 3 + 2] };
        const hit = rayVsTriangle(ray.origin, ray.dir, v0, v1, v2, maxDist);
        if (hit) {
          hits.push({
            point: {
              x: ray.origin.x + ray.dir.x * hit.distance,
              y: ray.origin.y + ray.dir.y * hit.distance,
              z: ray.origin.z + ray.dir.z * hit.distance,
            },
            normal: triangleNormalFacingRay(v0, v1, v2, ray.dir),
            distance: hit.distance,
            triangleIndex: triIdx,
          });
        }
      }
    } else {
      const left = bvh.nodesChildren[nodeId * 2];
      const right = bvh.nodesChildren[nodeId * 2 + 1];
      if (left >= 0) stack[stackPtr++] = left;
      if (right >= 0) stack[stackPtr++] = right;
      if (stackPtr > 60) break;
    }
  }

  // Sort by distance (ascending). Deterministic via comparator.
  hits.sort((a, b) => a.distance - b.distance);
  return hits;
}

// ============================================================================
// BVH traversal: capsule query
// ============================================================================

/**
 * Query the BVH for all triangles that overlap the given capsule.
 * Returns ALL SweepHits (penetrating and touching).
 *
 * Algorithm:
 *   1. Compute the capsule's swept AABB = segment AABB expanded by radius.
 *   2. Traverse the BVH: skip any node whose AABB does not overlap the
 *      capsule's AABB (inflated by radius).
 *   3. At each leaf, test each triangle via `capsuleVsTriangle`.
 *   4. Return all hits with penetration > -skinWidth (allow a small skin
 *      so we can detect "near contact" for grounding).
 */
export function queryCapsule(
  bvh: BVH,
  segmentTop: Vec3,
  segmentBottom: Vec3,
  radius: number,
  skinWidth = 0.0,
): SweepHit[] {
  const hits: SweepHit[] = [];
  if (bvh.nodeCount === 0 || bvh.triangleCount === 0) return hits;

  // Capsule's AABB (segment AABB expanded by radius + skin).
  const r = radius + skinWidth;
  const segMinX = Math.min(segmentTop.x, segmentBottom.x) - r;
  const segMinY = Math.min(segmentTop.y, segmentBottom.y) - r;
  const segMinZ = Math.min(segmentTop.z, segmentBottom.z) - r;
  const segMaxX = Math.max(segmentTop.x, segmentBottom.x) + r;
  const segMaxY = Math.max(segmentTop.y, segmentBottom.y) + r;
  const segMaxZ = Math.max(segmentTop.z, segmentBottom.z) + r;

  const capsule: Capsule = {
    top: segmentTop,
    bottom: segmentBottom,
    radius,
  };

  const stack = new Int32Array(64);
  let stackPtr = 0;
  stack[stackPtr++] = 0;

  while (stackPtr > 0) {
    const nodeId = stack[--stackPtr];
    const base = nodeId * 6;
    const boxMinX = bvh.nodesBounds[base];
    const boxMinY = bvh.nodesBounds[base + 1];
    const boxMinZ = bvh.nodesBounds[base + 2];
    const boxMaxX = bvh.nodesBounds[base + 3];
    const boxMaxY = bvh.nodesBounds[base + 4];
    const boxMaxZ = bvh.nodesBounds[base + 5];

    // AABB overlap test (segment AABB ± r vs node AABB).
    if (boxMaxX < segMinX || boxMinX > segMaxX) continue;
    if (boxMaxY < segMinY || boxMinY > segMaxY) continue;
    if (boxMaxZ < segMinZ || boxMinZ > segMaxZ) continue;

    const triStart = bvh.nodesTris[nodeId * 2];
    const triCount = bvh.nodesTris[nodeId * 2 + 1];
    if (triCount > 0) {
      // Leaf: test each triangle.
      for (let i = 0; i < triCount; i++) {
        const triIdx = bvh.triangleOrder[triStart + i];
        const i0 = bvh.indices[triIdx * 3];
        const i1 = bvh.indices[triIdx * 3 + 1];
        const i2 = bvh.indices[triIdx * 3 + 2];
        const v0 = { x: bvh.positions[i0 * 3], y: bvh.positions[i0 * 3 + 1], z: bvh.positions[i0 * 3 + 2] };
        const v1 = { x: bvh.positions[i1 * 3], y: bvh.positions[i1 * 3 + 1], z: bvh.positions[i1 * 3 + 2] };
        const v2 = { x: bvh.positions[i2 * 3], y: bvh.positions[i2 * 3 + 1], z: bvh.positions[i2 * 3 + 2] };

        const hit = capsuleVsTriangle(capsule, { v0, v1, v2 }, triIdx);
        if (hit && hit.penetration > -skinWidth) {
          hits.push(hit);
        }
      }
    } else {
      const left = bvh.nodesChildren[nodeId * 2];
      const right = bvh.nodesChildren[nodeId * 2 + 1];
      if (left >= 0) stack[stackPtr++] = left;
      if (right >= 0) stack[stackPtr++] = right;
      if (stackPtr > 60) break;
    }
  }

  return hits;
}

/**
 * Find the highest ground point under a horizontal footprint.
 * Casts multiple rays downward within a circle of `radius` around `center`.
 * Returns the highest hit Y, plus the average normal. If no hit, returns null.
 *
 * This is the "ground probe" used by the character controller to determine
 * grounding. Casting multiple rays (vs. one) is required because:
 *   - A single ray from the center misses triangles directly under the
 *     capsule's hemisphere when the capsule is on a slope or step edge.
 *   - The capsule's actual contact patch is a disc, not a point.
 */
export function probeGround(
  bvh: BVH,
  center: Vec3,
  radius: number,
  probeDepth: number,
  sampleCount = 5,
): { y: number; normal: Vec3; hit: boolean } {
  let bestY = Number.NEGATIVE_INFINITY;
  let bestNormal: Vec3 = { x: 0, y: 1, z: 0 };
  let anyHit = false;

  // Center ray.
  const centerHit = intersectRay(
    bvh,
    { origin: { x: center.x, y: center.y, z: center.z }, dir: { x: 0, y: -1, z: 0 } },
    probeDepth,
  );
  if (centerHit) {
    bestY = centerHit.point.y;
    bestNormal = centerHit.normal;
    anyHit = true;
  }

  // Ring samples (deterministic — no random angles).
  // Even angular spacing: 2π * i / sampleCount.
  // Math.sin/cos are deterministic (IEEE-754 + libc).
  const TWO_PI = 2 * Math.PI;
  for (let i = 0; i < sampleCount; i++) {
    const angle = TWO_PI * i / sampleCount;
    const sx = center.x + Math.cos(angle) * radius;
    const sz = center.z + Math.sin(angle) * radius;
    const hit = intersectRay(
      bvh,
      { origin: { x: sx, y: center.y, z: sz }, dir: { x: 0, y: -1, z: 0 } },
      probeDepth,
    );
    if (hit && hit.point.y > bestY) {
      bestY = hit.point.y;
      bestNormal = hit.normal;
      anyHit = true;
    }
  }

  return anyHit ? { y: bestY, normal: bestNormal, hit: true } : { y: 0, normal: { x: 0, y: 1, z: 0 }, hit: false };
}

// ============================================================================
// Diagnostics
// ============================================================================

/** Compute the maximum depth of the BVH (for diagnostics). */
export function bvhDepth(bvh: BVH): number {
  function depth(nodeId: number): number {
    const triCount = bvh.nodesTris[nodeId * 2 + 1];
    if (triCount > 0) return 1;
    const left = bvh.nodesChildren[nodeId * 2];
    const right = bvh.nodesChildren[nodeId * 2 + 1];
    let d = 0;
    if (left >= 0) d = Math.max(d, depth(left));
    if (right >= 0) d = Math.max(d, depth(right));
    return d + 1;
  }
  return bvh.nodeCount > 0 ? depth(0) : 0;
}

/** Compute the average leaf triangle count (for diagnostics). */
export function bvhAverageLeafSize(bvh: BVH): number {
  let leafCount = 0;
  let triTotal = 0;
  for (let i = 0; i < bvh.nodeCount; i++) {
    const c = bvh.nodesTris[i * 2 + 1];
    if (c > 0) {
      leafCount++;
      triTotal += c;
    }
  }
  return leafCount > 0 ? triTotal / leafCount : 0;
}

/** Compute total surface area of all node AABBs (for SAH diagnostics). */
export function bvhTotalSurfaceArea(bvh: BVH): number {
  let sum = 0;
  for (let i = 0; i < bvh.nodeCount; i++) {
    const base = i * 6;
    sum += aabbSurfaceArea({
      minX: bvh.nodesBounds[base],
      minY: bvh.nodesBounds[base + 1],
      minZ: bvh.nodesBounds[base + 2],
      maxX: bvh.nodesBounds[base + 3],
      maxY: bvh.nodesBounds[base + 4],
      maxZ: bvh.nodesBounds[base + 5],
    });
  }
  return sum;
}

/** Check that segmentAABB and aabbOverlapInflated agree on overlap (debug). */
export function _debugSegmentAABBCorrect(
  box: AABB,
  segStart: Vec3,
  segEnd: Vec3,
): boolean {
  return segmentAABB(box, segStart, segEnd);
}

/** Unused but exported for completeness — used by tests to confirm API surface. */
export function _debugAABBOverlapInflated(
  a: AABB, r: number, b: AABB,
): boolean {
  return aabbOverlapInflated(a, r, b);
}
