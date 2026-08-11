/**
 * game/planet/height-field.ts — the deterministic planet height field.
 *
 * Terrain Graph Directive §0: noise must never decide the major shape.
 * The landscape is a pure function of the authored semantic nodes
 * (regions → peaks/valleys → rivers) plus micro detail from a
 * deterministic hash (frontier prng — no Math.random anywhere).
 *
 * Same seed → identical field, every runtime, every browser.
 */

import { LCG, fnv1aHash } from '../../frontier/prng';
import {
  PLANETARY_DATUM, SEA_LEVEL,
  REGIONS, PEAKS, VALLEYS, RIVERS,
  type RegionNode, type PeakNode, type ValleyNode, type RiverNode,
} from './world-authoring';

/** Smooth 0..1 falloff of a node with radius r (exponent p). */
function falloff(d: number, r: number, p: number): number {
  if (d >= r) return 0;
  const t = 1 - d / r;
  return Math.pow(t, p);
}

/** Distance from a point to a segment (2D). */
function pointSegDist(x: number, z: number, ax: number, az: number, bx: number, bz: number): number {
  const dx = bx - ax, dz = bz - az;
  const len2 = dx * dx + dz * dz || 1;
  let t = ((x - ax) * dx + (z - az) * dz) / len2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(x - (ax + dx * t), z - (az + dz * t));
}

export type Biome =
  | 'ocean' | 'coast' | 'plains' | 'marsh' | 'highland' | 'mountain' | 'snow' | 'desert';

export interface HeightSample {
  height: number;
  biome: Biome;
  /** Material region: 0 earth, 1 rock, 2 sand, 3 snow, 4 deep stone. */
  material: number;
}

/** The deterministic height field over the authored planet. */
export class PlanetHeightField {
  readonly seed: number;
  private rng: LCG;

  constructor(seed: number) {
    this.seed = seed;
    this.rng = new LCG(seed);
    // warm the deterministic stream (never affects the field — micro detail
    // uses the positional hash, not the sequence)
    this.rng.nextUint32();
  }

  /** The full semantic evaluation at a world point. */
  evaluate(wx: number, wz: number): HeightSample {
    let h = PLANETARY_DATUM;
    let biome: Biome = 'plains';
    let material = 0;

    /* ---- 1. Planetary form: continental provinces ---- */
    let bestRegion: RegionNode | null = null;
    let bestRegionD = Infinity;
    for (const r of REGIONS) {
      const d = Math.hypot(wx - r.x, wz - r.z);
      if (d < r.radius && d < bestRegionD) { bestRegion = r; bestRegionD = d; }
    }
    if (bestRegion) {
      const f = falloff(bestRegionD, bestRegion.radius, 2.0);
      if (bestRegion.type === 'ocean') {
        h += (bestRegion.base - PLANETARY_DATUM) * f * 1.6;
        biome = 'ocean';
        material = 2;
      } else if (bestRegion.type === 'mountain' || bestRegion.type === 'volcanic' || bestRegion.type === 'coastal') {
        h += (bestRegion.rise || 0) * f;
      } else if (bestRegion.type === 'basin' || bestRegion.type === 'dead') {
        h += (bestRegion.base - PLANETARY_DATUM) * f;
        if (bestRegion.type === 'dead') biome = 'desert';
      }
    }

    /* ---- 2. Peaks: sharp cones with a ridge line (ranges, not blobs) ---- */
    for (const pk of PEAKS) {
      const d = Math.hypot(wx - pk.x, wz - pk.z);
      const base = falloff(d, pk.baseRadius, pk.p);
      if (base <= 0) continue;
      const dirx = Math.cos(pk.angle || 0.7), dirz = Math.sin(pk.angle || 0.7);
      const ridgeLen = pk.baseRadius * 1.6;
      const ridgeD = pointSegDist(wx, wz, pk.x, pk.z, pk.x - dirx * ridgeLen, pk.z - dirz * ridgeLen);
      const ridge = falloff(ridgeD, pk.baseRadius * 0.55, 1.2) * base;
      const cone = falloff(d, pk.baseRadius * 0.92, Math.max(1.4, pk.p - 0.4));
      const shape = Math.max(cone * 1.15, ridge);
      h += pk.height * shape;
    }

    /* ---- 3. Valleys: sheltered depressions with flat floors ---- */
    for (const v of VALLEYS) {
      const d = Math.hypot(wx - v.x, wz - v.z);
      const f = falloff(d, v.radius, v.exponent);
      h -= v.depth * f;
    }

    /* ---- 4. Rivers: carve V-grooves along their polylines ---- */
    for (const rv of RIVERS) {
      let bestD = Infinity;
      for (let i = 0; i < rv.points.length - 1; i++) {
        const d = pointSegDist(wx, wz, rv.points[i][0], rv.points[i][1], rv.points[i + 1][0], rv.points[i + 1][1]);
        if (d < bestD) bestD = d;
      }
      if (bestD < rv.width) {
        // V-groove: deepest at the centerline, feathering to the banks
        const t = 1 - bestD / rv.width;
        h -= rv.depth * t * t;
      }
    }

    /* ---- 5. Micro detail — the ONLY noise, ±0.1 m, never shaping ---- */
    h += this.microRough(wx, wz);

    /* ---- biome fallback by elevation ---- */
    if (biome === 'plains') {
      if (h > PLANETARY_DATUM + 56) biome = 'snow';
      else if (h > PLANETARY_DATUM + 18) biome = 'mountain';
      else if (h > PLANETARY_DATUM + 8) biome = 'highland';
    }
    if (biome === 'plains') {
      // the tidal band: sandy beaches along the seas
      let oceanD = Infinity;
      for (const r of REGIONS) {
        if (r.type !== 'ocean') continue;
        const d = Math.hypot(wx - r.x, wz - r.z);
        if (d < r.radius + 3000 && d < oceanD) oceanD = d;
      }
      if (oceanD < Infinity && h < SEA_LEVEL + 6) { biome = 'coast'; material = 2; }
    }
    if (biome === 'ocean') material = 2;
    if (biome === 'snow') material = 3;
    if (biome === 'mountain' || biome === 'highland') material = h > PLANETARY_DATUM + 30 ? 1 : 4;
    if (biome === 'desert') material = 2;

    return { height: Math.max(2, h), biome, material };
  }

  /** Deterministic positional micro-roughness: ±0.1 m. */
  private microRough(wx: number, wz: number): number {
    const bytes = new Uint8Array(12);
    const dv = new DataView(bytes.buffer);
    dv.setFloat32(0, wx * 0.37, true);
    dv.setFloat32(4, wz * 0.91, true);
    dv.setFloat32(8, this.seed, true);
    const hash = fnv1aHash(bytes);
    const u = (parseInt(hash.slice(0, 8), 16) % 100000) / 100000; // 0..1
    return (u - 0.5) * 0.2;
  }

  /** Water surface height for rivers (they are cut below sea level). */
  get waterLevel(): number { return SEA_LEVEL + 0.1; }

  /** Skip unused warnings on the warm-up rng (determinism anchor only). */
  get rngState(): number { return this.rng.nextUint32(); }
}
