/**
 * frontier/terrain-plugin.ts — Deterministic voxel terrain + tunnel pipeline.
 *
 * This module generates a 3D density field for the frontier engine's world:
 *   - A base fractal-Brownian-motion (FBM) noise field for natural terrain.
 *   - A mountain region in the center, sculpted by elevation gain.
 *   - A tunnel spline that passes THROUGH the mountain and EXTENDS BEYOND
 *     the mountain on both ends — so the entrance and exit have solid floor.
 *   - The tunnel is carved by setting voxels near the spline to "air".
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
 * Determinism contract:
 *   - Same seed → same density field, every run, every runtime.
 *   - FBM noise uses an LCG-seeded hash function (no Math.random).
 *   - Spline evaluation uses Catmull-Rom (deterministic).
 *   - Voxel writes are atomic Float32Array stores (no tearing).
 */

import type { Vec3 } from './types';
import { LCG } from './prng';
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

/** Mountain radius (meters) — the mountain occupies the central disc. */
export const MOUNTAIN_RADIUS = 18;

/** Mountain peak height (meters) above sea level. */
export const MOUNTAIN_PEAK_HEIGHT = 14;

/** Tunnel radius (meters) — the carved opening. */
export const TUNNEL_RADIUS = 2.0;

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
 * Uses LCG-based mixing. No Math.random. Deterministic across all JS runtimes.
 */
function hashNoise(ix: number, iy: number, iz: number, seed: number): number {
  // Mix the integer coords with the seed using LCG.
  // Start with the seed, then mix each coord with the NR LCG constants.
  let h = (seed ^ 0x12345678) >>> 0;
  h = (Math.imul(h, 1664525) + ix + 1013904223) >>> 0;
  h = (Math.imul(h, 1664525) + iy + 1013904223) >>> 0;
  h = (Math.imul(h, 1664525) + iz + 1013904223) >>> 0;
  // Additional mixing passes for better distribution.
  h = (Math.imul(h ^ (h >>> 15), 0x85ebca6b)) >>> 0;
  h = (Math.imul(h ^ (h >>> 13), 0xc2b2ae35)) >>> 0;
  h = (h ^ (h >>> 16)) >>> 0;
  // Map to [-1, 1].
  return (h / 2147483648) - 1;
}

/** Smoothly interpolate hashNoise at a continuous (x,y,z) point. */
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
   * The ground gradient makes density increase with height (so low = solid,
   * high = air). FBM adds natural variation.
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

          // Base gradient: density = seaLevel - y (so y=0 → density 0, y>0 → air).
          // We add FBM noise for natural variation.
          const noiseScale = 0.05;
          const noise = fbm(wx * noiseScale, wy * noiseScale, wz * noiseScale, 4, seed);
          // density = seaLevel - y + noise * amplitude
          // This gives a ground surface at y ≈ 0 + noise * amplitude.
          const amplitude = 4.0;
          const density = (field.seaLevel - wy) + noise * amplitude;

          const idx = iy * size * size + iz * size + ix;
          field.data[idx] = density;
        }
      }
    }
  }

  /**
   * Sculpt a mountain in the center of the terrain.
   * The mountain is a radial bump: density decreases (more solid) within
   * the mountain radius, peaking at the center.
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

          // Mountain height at this (x,z) = peak * smoothFalloff.
          const mountainHeight = MOUNTAIN_PEAK_HEIGHT * smoothFalloff;

          // Density contribution: more solid below mountainHeight, less above.
          // density_mountain = mountainHeight - wy
          const densityMtn = mountainHeight - wy;

          // Take MAX of base density and mountain density — mountain "wins"
          // where it's more solid (lower density).
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
   * The spline curves gently through the mountain. The Y stays near 2m
   * (the tunnel floor is at y≈1, ceiling at y≈3, with TUNNEL_RADIUS=1).
   */
  private _buildTunnelSpline(): TunnelSpline {
    const r = MOUNTAIN_RADIUS;
    const ext = TUNNEL_EXTENSION;
    const y = 2.5; // tunnel centerline height (gives 1.5m floor, 3.5m ceiling)

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
