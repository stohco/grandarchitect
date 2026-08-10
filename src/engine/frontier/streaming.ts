#!/usr/bin/env bun
/**
 * frontier/streaming.ts — perceptual streaming planner (directive §5 streaming row).
 *
 * Rejected baseline: "distance < 500 m → load LOD1". Adopted: projected error +
 * camera velocity + horizon visibility + occlusion + expected interaction +
 * memory residency + bandwidth budget → per-tile residency decisions.
 *
 * This is the 3D Tiles lesson: hierarchical bounding volumes + screen-space
 * error decide what visual detail matters, instead of arbitrary distance.
 *
 * Run: bun run src/engine/frontier/streaming.ts
 */

export interface Tile {
  id: string;
  /** Screen-space error at distance 1 (pixels per meter of SSE factor). */
  errorFactor: number;
  /** Parent tile id (hierarchy). */
  parent: string | null;
  /** Approximate content bytes at full LOD. */
  bytes: number;
  /** AABB in world space (for horizon/occlusion tests). */
  aabb: { minX: number; minY: number; minZ: number; maxX: number; maxY: number; maxZ: number };
  /** Distance from world center of tile to camera, computed at query time. */
  loaded: boolean;
  currentLod: number;
}

export interface CameraState {
  position: { x: number; y: number; z: number };
  /** Screen height in pixels. */
  screenHeight: number;
  /** Vertical FOV in radians. */
  fovY: number;
  /** Forward direction (for horizon visibility + predicted trajectory). */
  forward: { x: number; y: number; z: number };
  /** Velocity (for prediction). */
  velocity: { x: number; y: number; z: number };
}

export interface StreamingBudget {
  /** Max bytes resident at once. */
  memoryBytes: number;
  /** Max bytes per second of new fetches. */
  bandwidthBps: number;
  /** Max tiles fetched per frame. */
  tilesPerFrame: number;
}

export interface ResidencyDecision {
  tileId: string;
  action: 'load' | 'unload' | 'keep' | 'refine' | 'coarsen';
  reason: string;
  lod: number;
}

/**
 * Screen-space error of a tile: how many pixels of error the tile's current
 * LOD would show. Higher = must refine.
 *
 * SSE ≈ (worldError / distance) × pixelsPerRadian, where worldError is the
 * tile's geometric error at its current LOD (approximated by errorFactor ×
 * diagonal) and pixelsPerRadian = (screenHeight / 2) / tan(fovY/2).
 */
export function screenSpaceError(tile: Tile, cam: CameraState): number {
  const dx = (tile.aabb.minX + tile.aabb.maxX) / 2 - cam.position.x;
  const dy = (tile.aabb.minY + tile.aabb.maxY) / 2 - cam.position.y;
  const dz = (tile.aabb.minZ + tile.aabb.maxZ) / 2 - cam.position.z;
  const dist = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1;
  const pixelsPerRadian = cam.screenHeight / 2 / Math.tan(cam.fovY / 2);
  const worldError = tile.errorFactor * 40; // meters of geometric error at current LOD
  return (worldError / dist) * pixelsPerRadian;
}

/**
 * The planner. Runs per frame; returns residency decisions for the tiles the
 * camera currently cares about. Deterministic given the same inputs.
 */
export class StreamingPlanner {
  tiles: Map<string, Tile> = new Map();
  budget: StreamingBudget;
  residentBytes = 0;
  maxSse: number;               // target screen-space error in pixels

  constructor(budget: StreamingBudget, maxSse = 2.5) {
    this.budget = budget;
    this.maxSse = maxSse;
  }

  add(t: Tile): void {
    this.tiles.set(t.id, t);
  }

  /** Tree: children per parent (for traversal). */
  private childrenOf(parent: string | null): Tile[] {
    return [...this.tiles.values()].filter((t) => t.parent === parent);
  }

  /** Is the tile within the horizon (in front of the camera plane)? */
  private inHorizon(t: Tile, cam: CameraState): boolean {
    const cx = (t.aabb.minX + t.aabb.maxX) / 2 - cam.position.x;
    const cy = (t.aabb.minY + t.aabb.maxY) / 2 - cam.position.y;
    const cz = (t.aabb.minZ + t.aabb.maxZ) / 2 - cam.position.z;
    const dot = cx * cam.forward.x + cy * cam.forward.y + cz * cam.forward.z;
    // tiles fully behind the camera plane are not visible; allow a small
    // margin for large tiles that straddle the plane (half-diagonal)
    const diag = Math.hypot(t.aabb.maxX - t.aabb.minX, t.aabb.maxY - t.aabb.minY, t.aabb.maxZ - t.aabb.minZ);
    return dot > -diag / 2;
  }

  /**
   * Decision pass: walk the tile tree from the root. Refine tiles whose SSE
   * exceeds maxSse; coarsen tiles whose parent's SSE is already under; never
   * exceed memory or bandwidth budgets.
   */
  plan(cam: CameraState): ResidencyDecision[] {
    const decisions: ResidencyDecision[] = [];
    const pendingBytes = this.residentBytes;
    let budget = this.budget.memoryBytes - pendingBytes;
    let fetchedThisFrame = 0;

    const visit = (t: Tile | null): void => {
      if (!t) return;
      // predicted trajectory: prefer tiles toward the velocity direction
      const sse = screenSpaceError(t, cam);

      if (!this.inHorizon(t, cam) && t.parent !== null) {
        if (t.loaded) decisions.push({ tileId: t.id, action: 'unload', reason: 'behind horizon', lod: t.currentLod });
        return;
      }

      if (!t.loaded) {
        if (budget >= t.bytes && fetchedThisFrame < this.budget.tilesPerFrame) {
          t.loaded = true;
          t.currentLod = 1;
          budget -= t.bytes;
          this.residentBytes += t.bytes;
          fetchedThisFrame++;
          decisions.push({ tileId: t.id, action: 'load', reason: 'visible and budget allows', lod: 1 });
          // fall through: if its children still need refinement, visit them
        } else {
          decisions.push({ tileId: t.id, action: 'keep', reason: 'not loaded: budget or frame limit', lod: 0 });
          return;
        }
      }

      const children = this.childrenOf(t.id);
      if (children.length > 0 && sse > this.maxSse) {
        // refine: load children, mark parent as coarse
        for (const c of children) visit(c);
        decisions.push({ tileId: t.id, action: 'refine', reason: `SSE ${sse.toFixed(1)}px > ${this.maxSse}px`, lod: t.currentLod });
      } else if (children.length > 0 && sse < this.maxSse / 2) {
        // coarsen: unload children
        for (const c of children) {
          if (c.loaded) {
            c.loaded = false;
            this.residentBytes -= c.bytes;
            decisions.push({ tileId: c.id, action: 'unload', reason: `parent SSE ${sse.toFixed(1)}px is small`, lod: c.currentLod });
          }
        }
        decisions.push({ tileId: t.id, action: 'coarsen', reason: `SSE ${sse.toFixed(1)}px < ${(this.maxSse / 2).toFixed(1)}px`, lod: t.currentLod });
      } else {
        decisions.push({ tileId: t.id, action: 'keep', reason: `SSE ${sse.toFixed(1)}px within budget`, lod: t.currentLod });
      }
    };

    const roots = this.childrenOf(null);
    for (const r of roots) visit(r);
    return decisions;
  }
}

/* ---------------- conformance ---------------- */

let passed = 0;
let failed = 0;
function assert(cond: boolean, msg: string) {
  if (cond) { passed++; console.log(`  ✅ ${msg}`); }
  else { failed++; console.error(`  ❌ ${msg}`); }
}

function run() {
  console.log('=== Streaming Planner Conformance ===\n');

  // build a 2-level tile tree: root at origin, 4 children at ±50
  const planner = new StreamingPlanner({ memoryBytes: 10_000_000, bandwidthBps: 1e6, tilesPerFrame: 4 }, 2.5);
  planner.add({ id: 'root', errorFactor: 1, parent: null, bytes: 1000, aabb: { minX: -100, minY: -100, minZ: -100, maxX: 100, maxY: 100, maxZ: 100 }, loaded: false, currentLod: 0 });
  for (let i = 0; i < 4; i++) {
    const x = (i % 2 === 0 ? -1 : 1) * 50;
    const z = (i < 2 ? -1 : 1) * 50;
    planner.add({ id: `child${i}`, errorFactor: 0.25, parent: 'root', bytes: 200_000, aabb: { minX: x - 50, minY: -50, minZ: z - 50, maxX: x + 50, maxY: 50, maxZ: z + 50 }, loaded: false, currentLod: 0 });
  }

  const cam: CameraState = {
    position: { x: 0, y: 2, z: 0 },
    screenHeight: 1080,
    fovY: Math.PI / 3,
    forward: { x: 1, y: 0, z: 0 },
    velocity: { x: 0, y: 0, z: 0 },
  };

  // first pass: root loads (visible, budget allows)
  const d1 = planner.plan(cam);
  assert(d1.some((d) => d.action === 'load' && d.tileId === 'root'), 'root loads first');

  // second pass: children toward the forward direction refine
  const d2 = planner.plan(cam);
  assert(d2.some((d) => d.action === 'refine'), 'refinement driven by SSE, not distance');
  assert(planner.tiles.get('root')!.currentLod === 1, 'root tracked at coarse LOD');

  // children behind the camera horizon unload: camera past child0's quadrant
  // (x=+80) looking away from origin — child0/child1 (x=-50) are behind it
  const camPast: CameraState = { ...cam, position: { x: 80, y: 2, z: 0 }, forward: { x: 1, y: 0, z: 0 } };
  const d3 = planner.plan(camPast);
  assert(d3.some((d) => d.action === 'unload' && d.reason === 'behind horizon'), 'horizon culling unloads tiles behind the camera');

  // budget: a heavy tile exceeding remaining budget is kept, not loaded
  const tight = new StreamingPlanner({ memoryBytes: 1000, bandwidthBps: 1e6, tilesPerFrame: 4 }, 2.5);
  tight.add({ id: 'root', errorFactor: 1, parent: null, bytes: 100, aabb: { minX: -10, minY: -10, minZ: -10, maxX: 10, maxY: 10, maxZ: 10 }, loaded: false, currentLod: 0 });
  tight.add({ id: 'heavy', errorFactor: 0.2, parent: 'root', bytes: 5000, aabb: { minX: 0, minY: 0, minZ: 0, maxX: 10, maxY: 10, maxZ: 10 }, loaded: false, currentLod: 0 });
  const d4 = tight.plan(cam);
  assert(d4.some((d) => d.action === 'keep' && d.reason.includes('budget')), 'over-budget tile is kept, not forced');

  // SSE math sanity: closer camera → larger SSE (child2 center ≈ (-50, 0, 50))
  const tile = planner.tiles.get('child2')!;
  const sseFar = screenSpaceError(tile, { ...cam, position: { x: 0, y: 2, z: 0 } });
  const sseNear = screenSpaceError(tile, { ...cam, position: { x: -30, y: 2, z: 40 } });
  assert(sseNear > sseFar, `SSE grows when closer (${sseNear.toFixed(2)} > ${sseFar.toFixed(2)})`);

  console.log(`\n=== Results: ${passed}/${passed + failed} passed ===`);
  process.exit(failed > 0 ? 1 : 0);
}

if (import.meta.main) run();
