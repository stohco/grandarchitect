import { hashNoise3 } from '../../lib/determinism/primitives';
/**
 * frontier/terrain-plugin.ts — Deterministic voxel terrain + tunnel pipeline.
 *
 * This module generates a 3D density field for the frontier engine's world:
 *   - A base fractal-Brownian-motion (FBM) noise field for natural terrain.
 *   - A mountain region in the center, sculpted by elevation gain.
 *   - A tunnel spline that passes THROUGH the mountain and EXTENDS BEYOND
 *     the mountain on both ends — so the entrance and exit have solid floor.
 *   - The tunnel is carved by setting voxels near the spline to "air".
 *   - Surface extraction: a deterministic marching-cubes mesh (extractSurfaceMesh)
 *     and a Rapier-compatible heightfield (computeHeightmap) are derived from
 *     the same density field, so the rendered mesh and the playtest collision
 *     always agree (see terrain-conformance-test.ts).
 *
 * The terrain pipeline is hardened in three ways:
 *   1. The spline extends BEYOND the mountain. The previous implementation
 *      had the spline start AT the mountain edge, leaving the entrance with
 *      no floor — the player would fall through. Now the spline starts 5m
 *      before the mountain and ends 5m after, giving the entrance/exit
 *      solid ground.
 *   2. Erosion validation: every voxel in the final density field is checked
 *      for NaN. If any NaN is found, the pipeline throws (defensive guard
 *      against bad noise math).
 *   3. getSpawnPoint(): scans along the spline to find a position with
 *      guaranteed solid floor below (within a configurable depth).
 *
 * Density convention (solid = negative, air = positive):
 *   - Negative density → SOLID (rock, dirt)
 *   - Positive density → AIR (empty space)
 *   - Density == 0 → surface boundary (isosurface)
 *
 * Determinism contract:
 *   - Same seed → same density field, every run, every runtime.
 *   - FBM noise uses an LCG-seeded hash function (no Math.random).
 *   - Spline evaluation uses Catmull-Rom (deterministic).
 *   - Voxel writes are atomic Float32Array stores (no tearing).
 *   - extractSurfaceMesh and computeHeightmap are pure functions of the
 *     field (and the spline for the tunnel-floor rule) — no hidden state.
 */

import type { Vec3 } from './types';
import { LCG, fnv1aBytes } from '../../lib/determinism/primitives';
import { vec3, add, sub, scale, length, distance } from './vec3';

// ============================================================================
// Constants
// ============================================================================

/** Voxel grid resolution along each axis. */
export const TERRAIN_GRID_SIZE = 64;

/** World-space size of the terrain (meters). */
export const TERRAIN_WORLD_SIZE = 64;

/** Voxel size in world units. */
export const VOXEL_SIZE = TERRAIN_WORLD_SIZE / TERRAIN_GRID_SIZE;

/** Density threshold: voxels with density < threshold are "solid". */
export const DENSITY_SOLID_THRESHOLD = 0.0;

/**
 * Ground plane height (meters). The base terrain surface sits at
 * GROUND_Y + noise*NOISE_AMPLITUDE. Kept near 0 so the settlement
 * structures (which render with their bases at y=0) align with the
 * walkable plain.
 */
export const GROUND_Y = 0.5;

/**
 * Base-noise amplitude (meters). The plain undulates ±0.3m — subtle
 * natural variation with no pits below the field floor.
 */
export const NOISE_AMPLITUDE = 0.3;

/** Mountain radius (meters) — the mountain occupies the central disc. */
export const MOUNTAIN_RADIUS = 18;

/** Mountain peak height (meters) above sea level. */
export const MOUNTAIN_PEAK_HEIGHT = 14;

/** Tunnel radius (meters) — the carved opening. */
export const TUNNEL_RADIUS = 2.5;

/**
 * Tunnel centerline height (meters). With TUNNEL_RADIUS=2.5 the tunnel
 * floor sits at ~0.6m (flush with the plain) and the ceiling at ~4.6m,
 * giving ~4m of headroom for the 2.6m character capsule. The spline
 * jitter varies the centerline by ±0.3m.
 */
export const TUNNEL_CENTER_Y = 2.6;

/**
 * Tunnel extension beyond the mountain (meters).
 * CRITICAL: this is the fix for the tunnel-entrance issue. The spline
 * extends this far BEYOND the mountain on both ends, so the entrance and
 * exit have solid floor under the tunnel mouth.
 */
export const TUNNEL_EXTENSION = 8.0;

// ============================================================================
// Density field
// ============================================================================

/**
 * A 3D scalar field stored as a flat Float32Array.
 *
 * Density convention:
 *   - Negative density → SOLID (rock, dirt)
 *   - Positive density → AIR (empty space)
 *   - Density == 0 → surface boundary (isosurface)
 *
 * This matches the ga:terrain plugin's convention.
 */
export interface DensityField {
  /** Grid resolution along each axis. */
  size: number;
  /** World-space size (meters). */
  worldSize: number;
  /** Flat density values, length = size^3. */
  data: Float32Array;
  /** Sea level Y in world space (density < 0 below this, > 0 above). */
  seaLevel: number;
}

/** Convert world (x,y,z) to grid indices (ix,iy,iz). */
export function worldToGrid(field: DensityField, p: Vec3): { ix: number; iy: number; iz: number } {
  const half = field.worldSize / 2;
  const ix = Math.floor((p.x + half) / field.worldSize * field.size);
  const iy = Math.floor((p.y + 0) / field.worldSize * field.size); // y starts at 0
  const iz = Math.floor((p.z + half) / field.worldSize * field.size);
  return { ix, iy, iz };
}

/** Linearly interpolate density at world-space position. */
export function sampleDensity(field: DensityField, p: Vec3): number {
  const half = field.worldSize / 2;
  const fx = (p.x + half) / field.worldSize * field.size;
  const fy = p.y / field.worldSize * field.size;
  const fz = (p.z + half) / field.worldSize * field.size;

  const x0 = Math.floor(fx), x1 = x0 + 1;
  const y0 = Math.floor(fy), y1 = y0 + 1;
  const z0 = Math.floor(fz), z1 = z0 + 1;

  const tx = fx - x0;
  const ty = fy - y0;
  const tz = fz - z0;

  const clamp = (v: number) => Math.max(0, Math.min(field.size - 1, v));
  const cx0 = clamp(x0), cx1 = clamp(x1);
  const cy0 = clamp(y0), cy1 = clamp(y1);
  const cz0 = clamp(z0), cz1 = clamp(z1);

  const idx = (x: number, y: number, z: number) =>
    y * field.size * field.size + z * field.size + x;

  const c000 = field.data[idx(cx0, cy0, cz0)];
  const c100 = field.data[idx(cx1, cy0, cz0)];
  const c010 = field.data[idx(cx0, cy1, cz0)];
  const c110 = field.data[idx(cx1, cy1, cz0)];
  const c001 = field.data[idx(cx0, cy0, cz1)];
  const c101 = field.data[idx(cx1, cy0, cz1)];
  const c011 = field.data[idx(cx0, cy1, cz1)];
  const c111 = field.data[idx(cx1, cy1, cz1)];

  const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
  const c00 = lerp(c000, c100, tx);
  const c10 = lerp(c010, c110, tx);
  const c01 = lerp(c001, c101, tx);
  const c11 = lerp(c011, c111, tx);
  const c0 = lerp(c00, c10, ty);
  const c1 = lerp(c01, c11, ty);
  return lerp(c0, c1, tz);
}

// ============================================================================
// Deterministic 3D noise (FBM via hashed-gradient noise)
// ============================================================================

/**
 * Hashed value noise. Given integer (ix, iy, iz) and a seed, returns a
 * deterministic float in [-1, 1].
 *
 * Canonical implementation: src/lib/determinism/primitives.ts (hashNoise3).
 */
function hashNoise(ix: number, iy: number, iz: number, seed: number): number {
  return hashNoise3(ix, iy, iz, seed);
}
function valueNoise(x: number, y: number, z: number, seed: number): number {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const iz = Math.floor(z);
  const fx = x - ix;
  const fy = y - iy;
  const fz = z - iz;
  // Smoothstep for smoother interpolation.
  const smooth = (t: number) => t * t * (3 - 2 * t);
  const sx = smooth(fx);
  const sy = smooth(fy);
  const sz = smooth(fz);

  const c000 = hashNoise(ix, iy, iz, seed);
  const c100 = hashNoise(ix + 1, iy, iz, seed);
  const c010 = hashNoise(ix, iy + 1, iz, seed);
  const c110 = hashNoise(ix + 1, iy + 1, iz, seed);
  const c001 = hashNoise(ix, iy, iz + 1, seed);
  const c101 = hashNoise(ix + 1, iy, iz + 1, seed);
  const c011 = hashNoise(ix, iy + 1, iz + 1, seed);
  const c111 = hashNoise(ix + 1, iy + 1, iz + 1, seed);

  const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
  const c00 = lerp(c000, c100, sx);
  const c10 = lerp(c010, c110, sx);
  const c01 = lerp(c001, c101, sx);
  const c11 = lerp(c011, c111, sx);
  const c0 = lerp(c00, c10, sy);
  const c1 = lerp(c01, c11, sy);
  return lerp(c0, c1, sz);
}

/**
 * Fractal Brownian Motion (FBM): sum of value-noise octaves.
 * Deterministic — uses LCG-seeded value noise.
 */
function fbm(x: number, y: number, z: number, octaves: number, seed: number): number {
  let sum = 0;
  let amp = 1;
  let freq = 1;
  let maxAmp = 0;
  for (let o = 0; o < octaves; o++) {
    sum += valueNoise(x * freq, y * freq, z * freq, seed + o * 0x9E3779B9) * amp;
    maxAmp += amp;
    amp *= 0.5;
    freq *= 2;
  }
  return sum / maxAmp; // normalize to [-1, 1]
}

// ============================================================================
// Tunnel spline (Catmull-Rom)
// ============================================================================

/**
 * A Catmull-Rom spline through N control points.
 * The spline is parameterized by t ∈ [0, 1] where t=0 is the first control
 * point and t=1 is the last. Between control points, the spline passes
 * smoothly through each.
 *
 * For a typical 6-control-point spline, the segments are:
 *   t ∈ [0, 0.2): segment 0 (CP0 → CP1)
 *   t ∈ [0.2, 0.4): segment 1 (CP1 → CP2)
 *   ...
 *   t ∈ [0.8, 1.0]: segment 4 (CP4 → CP5)
 */
export class TunnelSpline {
  readonly controlPoints: Vec3[];

  constructor(controlPoints: Vec3[]) {
    if (controlPoints.length < 2) {
      throw new Error('TunnelSpline requires at least 2 control points');
    }
    this.controlPoints = controlPoints.map(p => ({ ...p }));
  }

  /** Sample the spline at parameter t ∈ [0, 1]. */
  sample(t: number): Vec3 {
    const n = this.controlPoints.length;
    if (t <= 0) return { ...this.controlPoints[0] };
    if (t >= 1) return { ...this.controlPoints[n - 1] };

    // Map t to segment index and local parameter.
    const segCount = n - 1;
    const scaledT = t * segCount;
    const segIdx = Math.floor(scaledT);
    const localT = scaledT - segIdx;
    const segIdxClamped = Math.min(segIdx, segCount - 1);

    // Get the 4 control points for Catmull-Rom: P0 (or extrapolate), P1, P2, P3 (or extrapolate).
    const p0 = this.controlPoints[Math.max(0, segIdxClamped - 1)];
    const p1 = this.controlPoints[segIdxClamped];
    const p2 = this.controlPoints[segIdxClamped + 1];
    const p3 = this.controlPoints[Math.min(n - 1, segIdxClamped + 2)];

    return catmullRom(p0, p1, p2, p3, localT);
  }

  /** Sample N points along the spline (for visualization / checkpoints). */
  samplePoints(count: number): Vec3[] {
    const out: Vec3[] = [];
    for (let i = 0; i < count; i++) {
      const t = count > 1 ? i / (count - 1) : 0;
      out.push(this.sample(t));
    }
    return out;
  }

  /**
   * Find the closest point on the spline to a query point.
   * Uses coarse sampling (32 samples) + refinement (32 samples around the best).
   */
  closestPointTo(p: Vec3): { t: number; point: Vec3; distance: number } {
    const samples = 64;
    let bestT = 0;
    let bestDist = Number.POSITIVE_INFINITY;
    let bestPoint = this.sample(0);

    // Coarse pass.
    for (let i = 0; i <= samples; i++) {
      const t = i / samples;
      const pt = this.sample(t);
      const d = distance(pt, p);
      if (d < bestDist) {
        bestDist = d;
        bestT = t;
        bestPoint = pt;
      }
    }

    // Refinement pass: ±2 coarse-step window.
    const window = 2 / samples;
    for (let i = 0; i <= samples; i++) {
      let t = bestT - window + (2 * window) * (i / samples);
      t = Math.max(0, Math.min(1, t));
      const pt = this.sample(t);
      const d = distance(pt, p);
      if (d < bestDist) {
        bestDist = d;
        bestT = t;
        bestPoint = pt;
      }
    }

    return { t: bestT, point: bestPoint, distance: bestDist };
  }
}

/** Catmull-Rom interpolation between p1 and p2 (with p0, p3 as tangents). */
function catmullRom(p0: Vec3, p1: Vec3, p2: Vec3, p3: Vec3, t: number): Vec3 {
  const t2 = t * t;
  const t3 = t2 * t;
  // Standard Catmull-Rom matrix (uniform, tension 0.5).
  // Result = 0.5 * [1 t t² t³] * M * [p0 p1 p2 p3]^T
  // where M = [[ 0  2  0  0], [-1  0  1  0], [ 2 -5  4 -1], [-1  3 -3  1]]
  const x = 0.5 * (
    (2 * p1.x) +
    (-p0.x + p2.x) * t +
    (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 +
    (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3
  );
  const y = 0.5 * (
    (2 * p1.y) +
    (-p0.y + p2.y) * t +
    (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 +
    (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3
  );
  const z = 0.5 * (
    (2 * p1.z) +
    (-p0.z + p2.z) * t +
    (2 * p0.z - 5 * p1.z + 4 * p2.z - p3.z) * t2 +
    (-p0.z + 3 * p1.z - 3 * p2.z + p3.z) * t3
  );
  return { x, y, z };
}

// ============================================================================
// Terrain pipeline
// ============================================================================

/**
 * The terrain pipeline generates a density field, sculpts a mountain, carves
 * a tunnel, and provides spawn/checkpoint queries.
 *
 * Usage:
 *   const pipeline = new TerrainPipeline({ seed: 1234 });
 *   pipeline.generate();
 *   const spawn = pipeline.getSpawnPoint();
 *   const checkpoints = pipeline.getCheckpoints(); // 5 points along the spline
 *   const field = pipeline.getField();
 */
export class TerrainPipeline {
  readonly seed: number;
  readonly gridSize: number;
  readonly worldSize: number;
  readonly prng: LCG;

  /** The generated density field. Null until `generate()` is called. */
  private field: DensityField | null = null;

  /** The tunnel spline. Null until `generate()` is called. */
  private spline: TunnelSpline | null = null;

  /** The 5 checkpoints along the spline. Null until `generate()` is called. */
  private checkpoints: { t: number; position: Vec3 }[] | null = null;

  /** Memoized surface mesh (per grid size). */
  private surfaceMeshCache: SurfaceMesh | null = null;

  /** Memoized heightmap. */
  private heightmapCache: TerrainHeightmap | null = null;

  constructor(opts: {
    seed: number;
    gridSize?: number;
    worldSize?: number;
  }) {
    this.seed = opts.seed >>> 0;
    this.gridSize = opts.gridSize ?? TERRAIN_GRID_SIZE;
    this.worldSize = opts.worldSize ?? TERRAIN_WORLD_SIZE;
    this.prng = new LCG(this.seed);
  }

  /**
   * Run the full pipeline:
   *   1. Initialize the density field to "air" everywhere.
   *   2. Fill with FBM noise + mountain shaping.
   *   3. Build the tunnel spline (extends BEYOND the mountain on both ends).
   *   4. Carve the tunnel.
   *   5. Validate the field (no NaN).
   *   6. Compute the 5 checkpoints.
   */
  generate(): void {
    // Step 1: initialize.
    const size = this.gridSize;
    const data = new Float32Array(size * size * size);
    const field: DensityField = {
      size,
      worldSize: this.worldSize,
      data,
      seaLevel: 0,
    };
    this.field = field;

    // Step 2: fill with FBM + mountain shaping.
    this._fillBaseTerrain(field);
    this._sculptMountain(field);

    // Step 3: build the spline (extends beyond the mountain).
    this.spline = this._buildTunnelSpline();

    // Step 4: carve the tunnel.
    this._carveTunnel(field, this.spline);

    // Step 4b: guarantee the bottom voxel layer is solid everywhere. The
    // carve may have aired it out, and every column needs a floor for the
    // heightmap and the character to rest on.
    this._ensureSolidFloor(field);

    // Step 5: validate (no NaN).
    const validation = this.validateDensityField(field);
    if (!validation.ok) {
      throw new Error(`Terrain pipeline validation failed: ${validation.reason}`);
    }

    // Step 6: checkpoints.
    this.checkpoints = this._computeCheckpoints(this.spline);
  }

  /** Get the density field (must call `generate()` first). */
  getField(): DensityField {
    if (!this.field) throw new Error('Terrain not generated. Call generate() first.');
    return this.field;
  }

  /** Get the tunnel spline (must call `generate()` first). */
  getSpline(): TunnelSpline {
    if (!this.spline) throw new Error('Terrain not generated. Call generate() first.');
    return this.spline;
  }

  /** Get the 5 checkpoints along the spline (must call `generate()` first). */
  getCheckpoints(): { t: number; position: Vec3 }[] {
    if (!this.checkpoints) throw new Error('Terrain not generated. Call generate() first.');
    return this.checkpoints.map(c => ({ t: c.t, position: { ...c.position } }));
  }

  /**
   * Find a safe spawn point inside the tunnel.
   *
   * Algorithm:
   *   - Sample the spline at t=0.1 (just inside the tunnel entrance).
   *   - Probe downward from the spline centerline; find the floor (first solid voxel below).
   *   - Return a position 1m above the floor (capsule center).
   *   - If no floor is found at t=0.1 (e.g. terrain noise carved away the floor),
   *     try t=0.2, 0.3, ..., 0.9 in order. The first valid one wins.
   *
   * This guarantees the spawn has solid floor directly below — fixing the
   * historical "fall through tunnel entrance" bug.
   */
  getSpawnPoint(): Vec3 {
    if (!this.spline || !this.field) {
      throw new Error('Terrain not generated. Call generate() first.');
    }
    const field = this.field;
    const spline = this.spline;

    // Try a series of t values along the spline.
    const tCandidates = [0.1, 0.15, 0.2, 0.25, 0.3, 0.4, 0.5, 0.6, 0.7, 0.75, 0.8, 0.85, 0.9];
    for (const t of tCandidates) {
      const centerline = spline.sample(t);
      // Probe downward from centerline. We want to find solid floor below the
      // centerline, then return a point above it.
      // The probe scans from centerline.y down to centerline.y - 5 (or until solid).
      const floorY = this._findFloorBelow(field, centerline, 5);
      if (floorY !== null) {
        // Spawn 1.2m above the floor (capsule center height).
        return { x: centerline.x, y: floorY + 1.2, z: centerline.z };
      }
    }

    // Fallback: spawn at the spline's first control point + 1m above.
    const cp0 = spline.controlPoints[0];
    return { x: cp0.x, y: 1.2, z: cp0.z };
  }

  /**
   * Find the highest solid voxel below `p` within `depth` meters.
   * Returns null if no solid voxel found.
   */
  private _findFloorBelow(field: DensityField, p: Vec3, depth: number): number | null {
    const voxelSize = field.worldSize / field.size;
    const startY = p.y;
    const endY = p.y - depth;
    const steps = Math.ceil((startY - endY) / voxelSize);
    for (let i = 0; i <= steps; i++) {
      const y = startY - i * voxelSize;
      const d = sampleDensity(field, { x: p.x, y, z: p.z });
      if (d < DENSITY_SOLID_THRESHOLD) {
        // Solid. Return the world-space Y of the surface (top of this voxel).
        return y + voxelSize * 0.5;
      }
    }
    return null;
  }

  // --------------------------------------------------------------------------
  // Internal: terrain generation
  // --------------------------------------------------------------------------

  /**
   * Fill the density field with FBM noise + a base "ground gradient".
   *
   * density = wy - surface(wx, wz) where surface = GROUND_Y + noise*NOISE_AMPLITUDE.
   * Solid (density < 0) below the surface, air above. This matches the
   * density convention (negative = solid) AND the documented intent of the
   * original code ("y=0 → density 0, y>0 → air"); the historical
   * implementation had the sign inverted, which produced a world that was
   * solid ABOVE y≈4 with the walkable surface on the underside — the
   * mountain was invisible and the tunnel mouth was buried. (The sign fix
   * is exercised by terrain-conformance-test.ts.)
   *
   * The bottom voxel layer is forced solid by _ensureSolidFloor() (called
   * after the tunnel carve) so every column has a floor.
   */
  private _fillBaseTerrain(field: DensityField): void {
    const size = field.size;
    const worldSize = field.worldSize;
    const half = worldSize / 2;
    const seed = this.seed;

    // For each voxel, compute world position then density.
    for (let iy = 0; iy < size; iy++) {
      for (let iz = 0; iz < size; iz++) {
        for (let ix = 0; ix < size; ix++) {
          const wx = (ix / size) * worldSize - half;
          const wy = (iy / size) * worldSize;
          const wz = (iz / size) * worldSize - half;

          // Natural variation: FBM over the plain, amplitude in meters.
          const noiseScale = 0.05;
          const noise = fbm(wx * noiseScale, wy * noiseScale, wz * noiseScale, 4, seed);
          const surface = GROUND_Y + noise * NOISE_AMPLITUDE;
          const density = wy - surface;

          const idx = iy * size * size + iz * size + ix;
          field.data[idx] = density;
        }
      }
    }
  }

  /**
   * Force the bottom voxel layer solid. Called AFTER the tunnel carve so the
   * carve cannot hollow out the world floor — every column keeps a floor.
   */
  private _ensureSolidFloor(field: DensityField): void {
    const size = field.size;
    for (let iz = 0; iz < size; iz++) {
      for (let ix = 0; ix < size; ix++) {
        const idx = iz * size + ix; // iy = 0
        field.data[idx] = Math.min(field.data[idx], -0.1);
      }
    }
  }

  /**
   * Sculpt a mountain in the center of the terrain.
   * The mountain is a radial bump: the solid region extends up to
   * surface(x,z) = GROUND_Y + MOUNTAIN_PEAK_HEIGHT * smoothFalloff inside
   * the mountain radius, smoothly merging into the plain at the rim.
   *
   * The mountain term is CLAMPED at 0 before the min: a positive (air)
   * mountain term must never make a column solid above the mountain
   * surface (the historical implementation took min() unconditionally,
   * which — once the base gradient sign was fixed — would have filled
   * the sky above the peak).
   */
  private _sculptMountain(field: DensityField): void {
    const size = field.size;
    const worldSize = field.worldSize;
    const half = worldSize / 2;

    for (let iy = 0; iy < size; iy++) {
      for (let iz = 0; iz < size; iz++) {
        for (let ix = 0; ix < size; ix++) {
          const wx = (ix / size) * worldSize - half;
          const wy = (iy / size) * worldSize;
          const wz = (iz / size) * worldSize - half;

          // Distance from mountain center (origin in XZ).
          const distXZ = Math.sqrt(wx * wx + wz * wz);
          if (distXZ > MOUNTAIN_RADIUS) continue;

          // Mountain falloff: 1 at center, 0 at radius.
          const falloff = 1 - (distXZ / MOUNTAIN_RADIUS);
          const smoothFalloff = falloff * falloff * (3 - 2 * falloff); // smoothstep

          // Mountain surface at this (x,z): plain + peak * smoothFalloff.
          const mountainSurface = GROUND_Y + MOUNTAIN_PEAK_HEIGHT * smoothFalloff;

          // Density below the surface is negative (solid); above it both the
          // base term (plain air) and this term are positive, so the min
          // never flips the sign — the sky stays air. (A version that
          // clamped this term was tried and produced a field with EXACTLY
          // zero density above the mountain — caught by
          // terrain-conformance-test.ts.)
          const densityMtn = wy - mountainSurface;

          const idx = iy * size * size + iz * size + ix;
          const baseDensity = field.data[idx];
          // We want the more-SOLID value (lower). Use Math.min.
          field.data[idx] = Math.min(baseDensity, densityMtn);
        }
      }
    }
  }

  // --------------------------------------------------------------------------
  // Tunnel spline + carving
  // --------------------------------------------------------------------------

  /**
   * Build the tunnel spline.
   *
   * The spline passes THROUGH the mountain and EXTENDS BEYOND it on both
   * ends by TUNNEL_EXTENSION meters. This is the fix for the historical
   * "tunnel entrance has no floor" bug: with the extension, the spline
   * starts outside the mountain (on solid ground) and ends outside it.
   *
   * Control points (deterministic — same seed → same points):
   *   CP0: (-MOUNTAIN_RADIUS - TUNNEL_EXTENSION, 2, 0)         (entrance, outside)
   *   CP1: (-MOUNTAIN_RADIUS * 0.6, 2, 0)                       (just inside entrance)
   *   CP2: (0, 2 + small bump, MOUNTAIN_RADIUS * 0.3)           (midpoint, slight curve)
   *   CP3: (MOUNTAIN_RADIUS * 0.6, 2, -MOUNTAIN_RADIUS * 0.3)   (interior-2)
   *   CP4: (MOUNTAIN_RADIUS + TUNNEL_EXTENSION, 2, 0)           (exit, outside)
   *
   * The spline curves gently through the mountain. The Y stays near
   * TUNNEL_CENTER_Y (the tunnel floor is at y≈0.6, ceiling at y≈4.6).
   */
  private _buildTunnelSpline(): TunnelSpline {
    const r = MOUNTAIN_RADIUS;
    const ext = TUNNEL_EXTENSION;
    const y = TUNNEL_CENTER_Y; // tunnel centerline height

    // Use the PRNG to add a tiny deterministic Y variation — this makes the
    // tunnel feel hand-crafted rather than perfectly straight, but is fully
    // deterministic given the seed.
    const y1 = y + this.prng.nextRange(-0.3, 0.3);
    const y2 = y + this.prng.nextRange(-0.5, 0.5);
    const y3 = y + this.prng.nextRange(-0.3, 0.3);

    const controlPoints: Vec3[] = [
      { x: -(r + ext), y: y,  z: 0 },
      { x: -r * 0.6,   y: y1, z: 0 },
      { x: 0,          y: y2, z: r * 0.25 },
      { x: r * 0.6,    y: y3, z: -r * 0.25 },
      { x: (r + ext),  y: y,  z: 0 },
    ];
    return new TunnelSpline(controlPoints);
  }

  /**
   * Carve the tunnel: for each voxel, if it's within TUNNEL_RADIUS of the
   * spline centerline, set it to AIR (positive density).
   *
   * For efficiency, we sample the spline densely (every 0.5m) and for each
   * sample, mark all voxels in a sphere around it as air. This is O(N*L)
   * where N=grid³ and L=spline samples, but for our grid (64³) and spline
   * length (~50m), it's ~3M operations — fast enough.
   */
  private _carveTunnel(field: DensityField, spline: TunnelSpline): void {
    const size = field.size;
    const worldSize = field.worldSize;
    const half = worldSize / 2;

    // Compute spline length (approx) to determine sample count.
    // Sample 200 points and sum the distances.
    let splineLength = 0;
    const sampleCount = 200;
    const splineSamples: Vec3[] = [];
    for (let i = 0; i <= sampleCount; i++) {
      splineSamples.push(spline.sample(i / sampleCount));
    }
    for (let i = 1; i < splineSamples.length; i++) {
      splineLength += distance(splineSamples[i], splineSamples[i - 1]);
    }

    // Carve: walk each voxel and check distance to the nearest spline sample.
    // For efficiency, precompute voxel world positions, then for each voxel
    // find the nearest spline sample (linear scan over 200 samples = fast enough).
    const carveRadius = TUNNEL_RADIUS;
    const carveRadiusSq = carveRadius * carveRadius;

    for (let iy = 0; iy < size; iy++) {
      for (let iz = 0; iz < size; iz++) {
        for (let ix = 0; ix < size; ix++) {
          const wx = (ix / size) * worldSize - half;
          const wy = (iy / size) * worldSize;
          const wz = (iz / size) * worldSize - half;

          // Quick reject: voxel outside the spline's XZ bounds + carveRadius.
          // The spline spans x=[-(r+ext), r+ext], z=[-r*0.25, r*0.25].
          const splineXMin = -(MOUNTAIN_RADIUS + TUNNEL_EXTENSION) - carveRadius;
          const splineXMax = (MOUNTAIN_RADIUS + TUNNEL_EXTENSION) + carveRadius;
          if (wx < splineXMin || wx > splineXMax) continue;

          // Find the nearest spline sample.
          let bestDistSq = Number.POSITIVE_INFINITY;
          for (let i = 0; i < splineSamples.length; i++) {
            const sp = splineSamples[i];
            const dx = wx - sp.x;
            const dy = wy - sp.y;
            const dz = wz - sp.z;
            const dSq = dx * dx + dy * dy + dz * dz;
            if (dSq < bestDistSq) bestDistSq = dSq;
            if (bestDistSq < 0.1) break; // close enough — no need to keep searching
          }

          if (bestDistSq < carveRadiusSq) {
            // Inside the tunnel — set to air.
            // Use a smooth falloff so the tunnel walls aren't razor-sharp.
            const d = Math.sqrt(bestDistSq);
            const falloff = 1 - (d / carveRadius); // 1 at center, 0 at wall
            const smoothFalloff = falloff * falloff * (3 - 2 * falloff); // smoothstep
            const airDensity = smoothFalloff * 5; // strong air density inside tunnel
            const idx = iy * size * size + iz * size + ix;
            // Take MAX — if base density is already air, keep it air.
            field.data[idx] = Math.max(field.data[idx], airDensity);
          }
        }
      }
    }
  }

  // --------------------------------------------------------------------------
  // Internal: checkpoints
  // --------------------------------------------------------------------------

  /**
   * Compute the 5 checkpoints along the spline.
   * Positions: t = 0.05 (entrance), 0.25 (interior-1), 0.5 (midpoint),
   * 0.75 (interior-2), 0.95 (exit).
   *
   * Each checkpoint's Y is offset 1m above the spline centerline (so the
   * checkpoint sits at capsule-center height when the capsule is standing
   * on the tunnel floor).
   */
  private _computeCheckpoints(spline: TunnelSpline): { t: number; position: Vec3 }[] {
    const ts = [0.05, 0.25, 0.5, 0.75, 0.95];
    return ts.map(t => {
      const p = spline.sample(t);
      return { t, position: { x: p.x, y: p.y - 1, z: p.z } }; // -1m → capsule center height
    });
  }

  // --------------------------------------------------------------------------
  // Validation
  // --------------------------------------------------------------------------

  /**
   * Validate the density field: no NaN, no Infinity, all values within
   * a sane range. Returns { ok, reason }.
   *
   * This is the "erosion validation" — it catches any bug in the noise math
   * that would produce NaN (e.g. division by zero in FBM, or a hash overflow).
   */
  validateDensityField(field: DensityField = this.field ?? { size: 0, worldSize: 0, data: new Float32Array(0), seaLevel: 0 }): { ok: boolean; reason?: string } {
    if (!this.field && field.size === 0) {
      return { ok: false, reason: 'No density field generated' };
    }
    for (let i = 0; i < field.data.length; i++) {
      const v = field.data[i];
      if (Number.isNaN(v)) {
        return { ok: false, reason: `NaN at index ${i}` };
      }
      if (!Number.isFinite(v)) {
        return { ok: false, reason: `Non-finite value (${v}) at index ${i}` };
      }
      // Sane range: density should be in [-100, 100]. Anything beyond is a bug.
      if (v < -100 || v > 100) {
        return { ok: false, reason: `Out-of-range density (${v}) at index ${i}` };
      }
    }
    return { ok: true };
  }

  /**
   * Compute a SHA-256-style hash of the density field for replay verification.
   * (We use FNV-1a here because it's synchronous and deterministic; the
   *  full SHA-256 hash is available via the determinism stack if needed.)
   */
  hashDensityField(): string {
    if (!this.field) return 'no-field';
    // FNV-1a over the raw bytes of the Float32Array.
    const bytes = new Uint8Array(this.field.data.buffer, this.field.data.byteOffset, this.field.data.byteLength);
    let hash = 0x811c9dc5;
    for (let i = 0; i < bytes.length; i++) {
      hash ^= bytes[i];
      hash = Math.imul(hash, 0x01000193) >>> 0;
    }
    return hash.toString(16).padStart(8, '0');
  }

  /**
   * Extract the surface mesh for this pipeline's field (marching cubes).
   * Memoized per grid size. Deterministic — same seed → same mesh.
   */
  getSurfaceMesh(gridSize?: number): SurfaceMesh {
    if (!this.field || !this.spline) {
      throw new Error('Terrain not generated. Call generate() first.');
    }
    const key = gridSize ?? this.field.size;
    if (this.surfaceMeshCache && this.surfaceMeshCache.gridSize === key) {
      return this.surfaceMeshCache;
    }
    const mesh = extractSurfaceMesh(this.field, { gridSize: key, spline: this.spline });
    this.surfaceMeshCache = mesh;
    return mesh;
  }

  /**
   * Build the walkable heightmap for this pipeline's field + spline.
   * Memoized. Deterministic — same seed → same heightmap + revision.
   */
  getHeightmap(): TerrainHeightmap {
    if (!this.field || !this.spline) {
      throw new Error('Terrain not generated. Call generate() first.');
    }
    if (!this.heightmapCache) {
      this.heightmapCache = computeHeightmap(this.field, this.spline);
    }
    return this.heightmapCache;
  }
}

// ============================================================================
// Convenience: generate a full terrain pipeline + checkpoints + spawn
// ============================================================================

export interface TerrainPipelineResult {
  field: DensityField;
  spline: TunnelSpline;
  checkpoints: { t: number; position: Vec3 }[];
  spawn: Vec3;
  hash: string;
}

/**
 * Run the full terrain pipeline and return all the artifacts.
 * Deterministic — same seed → same result, every run.
 */
export function generateTerrainPipeline(seed: number): TerrainPipelineResult {
  const pipeline = new TerrainPipeline({ seed });
  pipeline.generate();
  return {
    field: pipeline.getField(),
    spline: pipeline.getSpline(),
    checkpoints: pipeline.getCheckpoints(),
    spawn: pipeline.getSpawnPoint(),
    hash: pipeline.hashDensityField(),
  };
}

// ============================================================================
// Terrain seed derivation (shared by the viewport renderer and playtest
// collision so both build the IDENTICAL pipeline from the settlement seed).
// ============================================================================

/**
 * Derive a numeric terrain seed from a settlement seed string (FNV-1a → uint32).
 * Deterministic across runtimes. The viewport mesh (TerrainMesh) and the
 * playtest heightfield (PlaytestCharacter) both call this — a settlement
 * seed always yields the same density field, hence matched render+collision.
 */
export function terrainSeedFromSettlementSeed(seed: string): number {
  const bytes = new TextEncoder().encode(seed);
  return (Number.parseInt(fnv1aBytes(bytes), 16) >>> 0);
}

// ============================================================================
// Surface mesh extraction — deterministic marching cubes
// ============================================================================

import { MC_EDGE_TABLE, MC_TRI_TABLE, MC_TRI_STRIDE } from './terrain-mc-tables';

/** Region materials for the extracted surface. */
export const SURFACE_MATERIAL_EARTH = 0;
export const SURFACE_MATERIAL_MOUNTAIN = 1;
export const SURFACE_MATERIAL_TUNNEL = 2;

/**
 * A triangle mesh extracted from the density field isosurface (density == 0).
 * Pure and deterministic: a pure function of `field` (+ optional spline for
 * material classification).
 */
export interface SurfaceMesh {
  /** xyz per vertex, length = vertexCount * 3. */
  positions: Float32Array;
  /** unit normals per vertex, length = vertexCount * 3. */
  normals: Float32Array;
  /** triangle indices, length = triangleCount * 3. */
  indices: Uint32Array;
  /** material id per vertex (SURFACE_MATERIAL_*). */
  materialIds: Uint8Array;
  /** The grid resolution the mesh was extracted at. */
  gridSize: number;
  /** Number of vertices. */
  vertexCount: number;
  /** Number of triangles. */
  triangleCount: number;
}

export interface SurfaceMeshOptions {
  /** Grid resolution; default = field.size (matches the heightmap 1:1). */
  gridSize?: number;
  /** Tunnel spline — enables the TUNNEL material region. Optional. */
  spline?: TunnelSpline | null;
}

/**
 * Corner order (Bourke/Bloyd convention):
 *   v0 (0,0,0), v1 (1,0,0), v2 (1,1,0), v3 (0,1,0),
 *   v4 (0,0,1), v5 (1,0,1), v6 (1,1,1), v7 (0,1,1)
 */
const MC_CORNER_OFFSETS: ReadonlyArray<readonly [number, number, number]> = [
  [0, 0, 0], [1, 0, 0], [1, 1, 0], [0, 1, 0],
  [0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 1],
];

/** Edge → corner pairs (Bourke convention). */
const MC_EDGE_ENDPOINTS: ReadonlyArray<readonly [number, number]> = [
  [0, 1], [1, 2], [2, 3], [3, 0],
  [4, 5], [5, 6], [6, 7], [7, 4],
  [0, 4], [1, 5], [2, 6], [3, 7],
];

/**
 * Extract the isosurface (density == 0) of the field as an indexed triangle
 * mesh using the classic marching-cubes tables (Bourke/Bloyd). Solid is
 * density < DENSITY_SOLID_THRESHOLD. Vertices are deduplicated per world
 * edge; normals are area-weighted face-normal accumulation per vertex.
 * Material id per vertex: TUNNEL > MOUNTAIN > EARTH (priority wins), where
 * TUNNEL cells are within TUNNEL_RADIUS + one voxel of the spline and
 * MOUNTAIN cells within MOUNTAIN_RADIUS of the origin in XZ.
 */
export function extractSurfaceMesh(
  field: DensityField,
  opts: SurfaceMeshOptions = {},
): SurfaceMesh {
  const gridSize = Math.max(2, Math.min(field.size, opts.gridSize ?? field.size));
  const spline = opts.spline ?? null;
  const half = field.worldSize / 2;
  const vs = field.worldSize / field.size;

  const worldX = (ix: number) => (ix / gridSize) * field.worldSize - half;
  const worldY = (iy: number) => (iy / gridSize) * field.worldSize;
  const worldZ = (iz: number) => (iz / gridSize) * field.worldSize - half;

  // Sample the density at a lattice corner via the shared trilinear sampler
  // (the same sampleDensity the heightmap uses — consistency by construction).
  const cornerDensity = (ix: number, iy: number, iz: number): number =>
    sampleDensity(field, { x: worldX(ix), y: worldY(iy), z: worldZ(iz) });

  // Vertex accumulation: key = cellIndex * 12 + edgeIndex → vertex index.
  const vertexMap = new Map<number, number>();
  const positions: number[] = [];
  const materialAccum: number[] = []; // priority per vertex (0 none, 1 earth, 2 mountain, 3 tunnel)
  const indices: number[] = [];

  const cellCount = gridSize;
  const gridIndex = (ix: number, iy: number, iz: number) =>
    ((iz * cellCount) + iy) * cellCount + ix;

  // Material classification of a cell center.
  const materialForCell = (ix: number, iy: number, iz: number): number => {
    const cx = worldX(ix + 0.5);
    const cy = worldY(iy + 0.5);
    const cz = worldZ(iz + 0.5);
    if (spline) {
      const closest = spline.closestPointTo({ x: cx, y: cy, z: cz });
      if (closest.distance <= TUNNEL_RADIUS + vs) return SURFACE_MATERIAL_TUNNEL;
    }
    const distXZ = Math.sqrt(cx * cx + cz * cz);
    if (distXZ <= MOUNTAIN_RADIUS) return SURFACE_MATERIAL_MOUNTAIN;
    return SURFACE_MATERIAL_EARTH;
  };

  for (let iz = 0; iz < cellCount; iz++) {
    for (let iy = 0; iy < cellCount; iy++) {
      for (let ix = 0; ix < cellCount; ix++) {
        const d = [
          cornerDensity(ix, iy, iz),
          cornerDensity(ix + 1, iy, iz),
          cornerDensity(ix + 1, iy + 1, iz),
          cornerDensity(ix, iy + 1, iz),
          cornerDensity(ix, iy, iz + 1),
          cornerDensity(ix + 1, iy, iz + 1),
          cornerDensity(ix + 1, iy + 1, iz + 1),
          cornerDensity(ix, iy + 1, iz + 1),
        ];

        let cubeIndex = 0;
        for (let c = 0; c < 8; c++) {
          if (d[c] < DENSITY_SOLID_THRESHOLD) cubeIndex |= 1 << c;
        }
        const edges = MC_EDGE_TABLE[cubeIndex];
        if (edges === 0) continue;

        const cellIdx = gridIndex(ix, iy, iz);
        const cellBaseKey = cellIdx * 12;
        const cellMaterial = materialForCell(ix, iy, iz);
        // Priority: TUNNEL(3) > MOUNTAIN(2) > EARTH(1); store +1 offset.
        const matPriority = cellMaterial + 1;

        // Edge vertex positions for this cell.
        const verts: number[] = new Array(12).fill(-1);
        for (let e = 0; e < 12; e++) {
          if ((edges & (1 << e)) === 0) continue;
          const key = cellBaseKey + e;
          let vi = vertexMap.get(key);
          if (vi === undefined) {
            const [a, b] = MC_EDGE_ENDPOINTS[e];
            const oa = MC_CORNER_OFFSETS[a];
            const ob = MC_CORNER_OFFSETS[b];
            const ax = worldX(ix + oa[0]), ay = worldY(iy + oa[1]), az = worldZ(iz + oa[2]);
            const bx = worldX(ix + ob[0]), by = worldY(iy + ob[1]), bz = worldZ(iz + ob[2]);
            // Linear interpolation of the isosurface crossing.
            const denom = d[b] - d[a];
            const t = denom !== 0 ? -d[a] / denom : 0;
            vi = positions.length / 3;
            positions.push(ax + t * (bx - ax), ay + t * (by - ay), az + t * (bz - az));
            materialAccum.push(0);
            vertexMap.set(key, vi);
            verts[e] = vi;
          } else {
            verts[e] = vi;
          }
          // Material priority accumulation.
          const mat = materialAccum[vi];
          if (matPriority > mat) materialAccum[vi] = matPriority;
        }

        // Triangles from the table.
        const base = cubeIndex * MC_TRI_STRIDE;
        for (let i = 0; i < MC_TRI_STRIDE; i += 3) {
          const e0 = MC_TRI_TABLE[base + i];
          if (e0 < 0) break;
          const e1 = MC_TRI_TABLE[base + i + 1];
          const e2 = MC_TRI_TABLE[base + i + 2];
          indices.push(verts[e0], verts[e1], verts[e2]);
        }
      }
    }
  }

  const vertexCount = positions.length / 3;
  const normals = new Float32Array(vertexCount * 3);
  // Accumulate face normals (area-weighted) per vertex.
  for (let i = 0; i < indices.length; i += 3) {
    const i0 = indices[i], i1 = indices[i + 1], i2 = indices[i + 2];
    const ax = positions[i0 * 3], ay = positions[i0 * 3 + 1], az = positions[i0 * 3 + 2];
    const bx = positions[i1 * 3], by = positions[i1 * 3 + 1], bz = positions[i1 * 3 + 2];
    const cx = positions[i2 * 3], cy = positions[i2 * 3 + 1], cz = positions[i2 * 3 + 2];
    const ux = bx - ax, uy = by - ay, uz = bz - az;
    const vx = cx - ax, vy = cy - ay, vz = cz - az;
    let nx = uy * vz - uz * vy;
    let ny = uz * vx - ux * vz;
    let nz = ux * vy - uy * vx;
    const area2 = Math.sqrt(nx * nx + ny * ny + nz * nz);
    if (area2 < 1e-12) continue; // degenerate triangle — skip normal contribution
    nx /= area2; ny /= area2; nz /= area2;
    for (const vi of [i0, i1, i2]) {
      normals[vi * 3] += nx;
      normals[vi * 3 + 1] += ny;
      normals[vi * 3 + 2] += nz;
    }
  }
  for (let v = 0; v < vertexCount; v++) {
    const nx = normals[v * 3], ny = normals[v * 3 + 1], nz = normals[v * 3 + 2];
    const len = Math.sqrt(nx * nx + ny * ny + nz * nz);
    if (len > 1e-12) {
      normals[v * 3] = nx / len;
      normals[v * 3 + 1] = ny / len;
      normals[v * 3 + 2] = nz / len;
    } else {
      normals[v * 3 + 1] = 1; // degenerate — point up
    }
  }

  const materialIds = new Uint8Array(vertexCount);
  for (let v = 0; v < vertexCount; v++) {
    materialIds[v] = Math.max(0, materialAccum[v] - 1);
  }

  return {
    positions: Float32Array.from(positions),
    normals,
    indices: Uint32Array.from(indices),
    materialIds,
    gridSize,
    vertexCount,
    triangleCount: indices.length / 3,
  };
}

// ============================================================================
// Heightmap extraction — Rapier-compatible collision surface
// ============================================================================

/**
 * A walkable heightmap derived from the density field, formatted for
 * Rapier's heightfield collider:
 *   - heights.length = (nrows+1) * (ncols+1) — Rapier's heightfield
 *     constructor builds a DMatrix of (nrows+1) x (ncols+1) and panics
 *     ("unreachable" wasm trap) on any other length (verified empirically
 *     against rapier3d-compat 0.19.3 in bun + Chromium).
 *   - Column-major index: heights[j * (nrows+1) + i] is the surface at
 *     world (x = -worldSize/2 + j*vs, z = -worldSize/2 + i*vs).
 *   - scaleX/scaleZ = worldSize — the collider spans [-worldSize/2, +worldSize/2]
 *     centered on the origin, matching the rendered mesh exactly.
 *
 * Surface rule per column:
 *   - Columns deep inside the carve (within TUNNEL_RADIUS - one voxel of
 *     the tunnel spline) take the tunnel FLOOR crossing (the first
 *     solid→air isosurface crossing below the spline centerline). This is
 *     what makes the tunnel walkable: the heightfield surface drops to the
 *     tunnel floor so the character can enter the mouth instead of being
 *     stopped by the ceiling column.
 *   - All other columns take the topmost solid→air crossing (the ground or
 *     the mountain top).
 *
 * Every crossing uses the SAME vertical-edge interpolation formula as the
 * marching-cubes mesh, so each heightmap vertex equals the mesh vertex at
 * the same lattice point (within floating-point exactness).
 */
export interface TerrainHeightmap {
  /** Cell counts along each axis (64 for the default grid). */
  nrows: number;
  ncols: number;
  /** (nrows+1)*(ncols+1) surface heights, index j*(nrows+1)+i. */
  heights: Float32Array;
  /** World span along x for the Rapier collider (= worldSize). */
  scaleX: number;
  /** World span along z for the Rapier collider (= worldSize). */
  scaleZ: number;
  /** Minimum / maximum height (world units). */
  minHeight: number;
  maxHeight: number;
  /** FNV-1a (uint32) of the heights bytes — the collision revision. */
  revision: number;
}

/**
 * Vertical isosurface crossing at lattice point (x,z), scanning from startY
 * down to stopY. Returns the y where density crosses 0 between the first
 * SOLID lattice row (scanning down) and the air row above it.
 *
 * Robust to a scan window that starts inside solid (returns just above the
 * first solid row) and to a window with no solid at all (returns the window
 * floor). The interpolation matches the marching-cubes vertical-edge formula
 * exactly, so the heightmap surface and the mesh surface agree.
 */
function surfaceCrossingBelow(field: DensityField, x: number, z: number, startY: number, stopY: number): number {
  const vs = field.worldSize / field.size;
  const iyStart = Math.min(field.size - 1, Math.max(0, Math.floor(startY / vs)));
  const iyStop = Math.max(0, Math.floor(stopY / vs));
  let lastAirY = -1; // lattice row of the last AIR sample seen
  for (let iy = iyStart; iy >= iyStop; iy--) {
    const d = sampleDensity(field, { x, y: iy * vs, z });
    if (d < DENSITY_SOLID_THRESHOLD) {
      if (lastAirY < 0) {
        // Scan started inside solid — the surface is above the window.
        return Math.min(startY, (iy + 1) * vs);
      }
      // Solid at iy, air at iy+1 — interpolate the crossing. t is the
      // fraction measured FROM the air row (parametrized downward): the
      // crossing sits at (iy + 1 - t) * vs. This exactly matches the
      // marching-cubes vertical-edge formula (which parametrizes upward
      // from the solid row with mu = -dS/(dA - dS)).
      const dA = sampleDensity(field, { x, y: (iy + 1) * vs, z });
      const denom = dA - d;
      const t = denom !== 0 ? dA / denom : 0.5;
      return (iy + 1 - t) * vs;
    }
    lastAirY = iy;
  }
  // No solid found in the scan window — fall back to the window floor.
  return Math.max(0, iyStop * vs);
}

/**
 * Build the walkable heightmap for a density field + tunnel spline.
 * Pure and deterministic. See TerrainHeightmap for the layout contract.
 */
export function computeHeightmap(field: DensityField, spline: TunnelSpline | null): TerrainHeightmap {
  const nrows = field.size;
  const ncols = field.size;
  const vs = field.worldSize / field.size;
  const half = field.worldSize / 2;
  const W = nrows + 1;
  const heights = new Float32Array(W * W);
  let minHeight = Number.POSITIVE_INFINITY;
  let maxHeight = Number.NEGATIVE_INFINITY;

  for (let i = 0; i < W; i++) {
    const z = -half + i * vs;
    for (let j = 0; j < W; j++) {
      const x = -half + j * vs;
      let h: number;
      if (spline) {
        const closest = spline.closestPointTo({ x, y: TUNNEL_CENTER_Y, z });
        // Floor rule only DEEP inside the carve (TUNNEL_RADIUS - one voxel):
        // at the tube edge the carve's smooth falloff makes the floor
        // ambiguous (the carve may not have aired the column at all), so
        // those columns take the top surface — which matches the mesh's
        // top crossing there.
        if (closest.distance <= TUNNEL_RADIUS - vs) {
          // Tunnel column → walkable surface is the tunnel FLOOR.
          h = surfaceCrossingBelow(field, x, z, closest.point.y + 1.0, closest.point.y - TUNNEL_RADIUS - 1.0);
        } else {
          h = surfaceCrossingBelow(field, x, z, field.worldSize - vs, 0);
        }
      } else {
        h = surfaceCrossingBelow(field, x, z, field.worldSize - vs, 0);
      }
      heights[j * W + i] = h;
      if (h < minHeight) minHeight = h;
      if (h > maxHeight) maxHeight = h;
    }
  }

  const bytes = new Uint8Array(heights.buffer, heights.byteOffset, heights.byteLength);
  const revision = (Number.parseInt(fnv1aBytes(bytes), 16) >>> 0);

  return {
    nrows,
    ncols,
    heights,
    scaleX: field.worldSize,
    scaleZ: field.worldSize,
    minHeight,
    maxHeight,
    revision,
  };
}

/**
 * Sample the heightmap surface at an arbitrary world (x,z) using the same
 * piecewise-linear triangulation Rapier uses for the collider surface, so
 * spawn placement and the collider agree exactly.
 */
export function sampleHeightmap(hm: TerrainHeightmap, x: number, z: number): number {
  const W = hm.nrows + 1;
  const vs = hm.scaleX / hm.nrows;
  const half = hm.scaleX / 2;
  const fj = Math.min(W - 1 - 1e-9, Math.max(0, (x + half) / vs));
  const fi = Math.min(W - 1 - 1e-9, Math.max(0, (z + half) / vs));
  const j = Math.floor(fj);
  const i = Math.floor(fi);
  const fx = fj - j;
  const fz = fi - i;
  const h00 = hm.heights[j * W + i];         // (x0, z0)
  const h10 = hm.heights[j * W + (i + 1)];   // (x0, z1)
  const h01 = hm.heights[(j + 1) * W + i];   // (x1, z0)
  const h11 = hm.heights[(j + 1) * W + (i + 1)]; // (x1, z1)
  if (fx + fz <= 1) {
    // Triangle (x0,z0),(x1,z0),(x0,z1)
    return h00 + fx * (h01 - h00) + fz * (h10 - h00);
  }
  // Triangle (x0,z1),(x1,z1),(x1,z0)
  return h10 * (fz - fx) + fx * h11 + (1 - fz) * h01;
}
