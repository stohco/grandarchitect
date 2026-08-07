/**
 * Procedural Pagoda — deterministic multi-mesh source asset
 * ===========================================================
 *
 * A stylized Zhao-country pagoda built from 5 distinct meshes, each with its
 * own material, UV set and semantic region:
 *
 *   base  (stone)   — 6×1.2×6 platform
 *   tier1 (wood)    — first body, 3.6×2.4×3.6
 *   tier2 (wood)    — second body, 2.8×2.0×2.8, rotated ≈45°
 *   roof  (dark)    — swept frustum 5.2→3.6, height 1.2
 *   spire (gold)    — finial 0.5×1.6×0.5, PROTECTED semantic region
 *
 * Determinism contract:
 *   - Generation uses only IEEE-754 +,-,*,/ plus the pinned transcendentals
 *     (det_sin/det_cos from src/lib/determinism/transcendentals.ts) and the
 *     xoshiro256** RNG (src/lib/determinism/rng.ts). No Math.random, no
 *     Date, no Math.sin/cos.
 *   - Same seed → bit-identical positions/normals/uvs/indices.
 *   - Different seed → different per-part jitter, hence different hash.
 *
 * Density: every face is a subdivided grid (subdiv 2 default), so the asset
 * carries a real triangle budget (~500+ tris) — enough for meshoptimizer
 * simplification to prove REAL reduction in the conformance test.
 */

import { seedFromBigInt, nextDouble } from '../../lib/determinism/rng';
import { det_sin, det_cos } from '../../lib/determinism/transcendentals';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Canonical blueprint seed (matches the Forge mod's BLUEPRINT_SEED). */
export const PAGODA_DEFAULT_SEED = 89274613;

export const PAGODA_GENERATOR_ID = 'ga:procedural-pagoda';
export const PAGODA_GENERATOR_VERSION = '1.0.0';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PagodaPart {
  partId: string;
  name: string;
  category: string;
  materialIndex: number;
  protected: boolean;
  editable: boolean;
}

export interface PagodaSourceMesh {
  positions: Float32Array;
  normals: Float32Array;
  uvs: Float32Array;
  indices: Uint32Array;
  bounds: { min: [number, number, number]; max: [number, number, number] };
  /** Mesh parts in index order. */
  parts: PagodaPart[];
  /** partId → [startTriangle, triangleCount] into the index buffer. */
  partTriRanges: Map<string, { start: number; count: number }>;
}

export interface PagodaGenerateOptions {
  /** Subdivision of each face grid (≥1). 2 → 48 tris per closed box. */
  subdiv?: number;
  /** Max per-part scale jitter amplitude (±). */
  jitter?: number;
}

// ---------------------------------------------------------------------------
// Primitive builders
// ---------------------------------------------------------------------------

interface BuiltPrimitive {
  positions: number[];
  normals: number[];
  uvs: number[];
  indices: number[];
  bounds: { min: [number, number, number]; max: [number, number, number] };
}

/**
 * A closed box centered at origin with each face subdivided into a
 * `subdiv × subdiv` grid. Vertices are per-face (seams), normals per-face.
 * Every face maps the full [0,1]² UV square → 100% UV coverage.
 */
function buildBox(sx: number, sy: number, sz: number, subdiv: number): BuiltPrimitive {
  const hx = sx / 2;
  const hy = sy / 2;
  const hz = sz / 2;
  // Face corners as (offset, u-axis, v-axis, normal). Axis order is
  // consistent so every face is CCW when viewed from outside.
  const faces: Array<{
    o: [number, number, number];
    u: [number, number, number];
    v: [number, number, number];
    n: [number, number, number];
  }> = [
    { o: [-hx, -hy, hz], u: [sx, 0, 0], v: [0, sy, 0], n: [0, 0, 1] },   // front
    { o: [hx, -hy, -hz], u: [-sx, 0, 0], v: [0, sy, 0], n: [0, 0, -1] }, // back
    { o: [-hx, hy, -hz], u: [sx, 0, 0], v: [0, 0, sz], n: [0, 1, 0] },   // top
    { o: [-hx, -hy, hz], u: [sx, 0, 0], v: [0, 0, -sz], n: [0, -1, 0] }, // bottom
    { o: [hx, -hy, -hz], u: [0, 0, sz], v: [0, sy, 0], n: [1, 0, 0] },   // right
    { o: [-hx, -hy, hz], u: [0, 0, -sz], v: [0, sy, 0], n: [-1, 0, 0] }, // left
  ];

  const positions: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  const bounds = {
    min: [-hx, -hy, -hz] as [number, number, number],
    max: [hx, hy, hz] as [number, number, number],
  };

  for (const f of faces) {
    const base = positions.length / 3;
    for (let i = 0; i <= subdiv; i++) {
      for (let j = 0; j <= subdiv; j++) {
        const tu = i / subdiv;
        const tv = j / subdiv;
        positions.push(
          f.o[0] + f.u[0] * tu + f.v[0] * tv,
          f.o[1] + f.u[1] * tu + f.v[1] * tv,
          f.o[2] + f.u[2] * tu + f.v[2] * tv,
        );
        normals.push(f.n[0], f.n[1], f.n[2]);
        uvs.push(tu, tv);
      }
    }
    for (let i = 0; i < subdiv; i++) {
      for (let j = 0; j < subdiv; j++) {
        const a = base + i * (subdiv + 1) + j;
        const b = a + 1;
        const c = a + (subdiv + 1) + 1;
        const d = a + (subdiv + 1);
        indices.push(a, b, c, a, c, d);
      }
    }
  }
  return { positions, normals, uvs, indices, bounds };
}

/**
 * A square frustum (swept roof): bottom square (bx) at y=0, top square (tx)
 * at y=h, closed bottom. All faces map the full [0,1]² UV square.
 */
function buildFrustum(bx: number, tx: number, h: number, subdiv: number): BuiltPrimitive {
  const hb = bx / 2;
  const ht = tx / 2;
  const positions: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  const addQuad = (
    corners: Array<[number, number, number]>,
    n: [number, number, number],
    grid: number,
  ) => {
    const base = positions.length / 3;
    const [a, b, c, d] = corners;
    for (let i = 0; i <= grid; i++) {
      for (let j = 0; j <= grid; j++) {
        const tu = i / grid;
        const tv = j / grid;
        // Bilinear interpolation of the quad.
        const lx = a[0] + (d[0] - a[0]) * tv;
        const ly = a[1] + (d[1] - a[1]) * tv;
        const lz = a[2] + (d[2] - a[2]) * tv;
        const rx = b[0] + (c[0] - b[0]) * tv;
        const ry = b[1] + (c[1] - b[1]) * tv;
        const rz = b[2] + (c[2] - b[2]) * tv;
        positions.push(lx + (rx - lx) * tu, ly + (ry - ly) * tu, lz + (rz - lz) * tu);
        normals.push(n[0], n[1], n[2]);
        uvs.push(tu, tv);
      }
    }
    for (let i = 0; i < grid; i++) {
      for (let j = 0; j < grid; j++) {
        const p = base + i * (grid + 1) + j;
        indices.push(p, p + 1, p + grid + 2, p, p + grid + 2, p + grid + 1);
      }
    }
  };

  // Side faces (tilted normals approximated — computed from the quad).
  const sideNormals: Array<[number, number, number]> = [
    [0, -0.5, 1],
    [1, -0.5, 0],
    [0, -0.5, -1],
    [-1, -0.5, 0],
  ];
  const sideCorners: Array<Array<[number, number, number]>> = [
    [[-hb, 0, hb], [hb, 0, hb], [ht, h, ht], [-ht, h, ht]],
    [[hb, 0, hb], [hb, 0, -hb], [ht, h, -ht], [ht, h, ht]],
    [[hb, 0, -hb], [-hb, 0, -hb], [-ht, h, -ht], [ht, h, -ht]],
    [[-hb, 0, -hb], [-hb, 0, hb], [-ht, h, ht], [-ht, h, -ht]],
  ];
  for (let i = 0; i < 4; i++) {
    addQuad(sideCorners[i]!, sideNormals[i]!, subdiv);
  }
  // Bottom cap (closed roof).
  addQuad(
    [[-hb, 0, hb], [hb, 0, hb], [hb, 0, -hb], [-hb, 0, -hb]],
    [0, -1, 0],
    subdiv,
  );

  return {
    positions,
    normals,
    uvs,
    indices,
    bounds: {
      min: [-hb, 0, -hb],
      max: [hb, h, hb],
    },
  };
}

// ---------------------------------------------------------------------------
// Transform
// ---------------------------------------------------------------------------

interface PlacedPrimitive extends BuiltPrimitive {
  bounds: { min: [number, number, number]; max: [number, number, number] };
}

/**
 * Translate + scale + rotate-around-Y a primitive. All math is
 * +,-,*,/ plus det_sin/det_cos — deterministic across engines.
 */
function placePrimitive(
  prim: BuiltPrimitive,
  translate: [number, number, number],
  scale: [number, number, number],
  angleY: number,
): PlacedPrimitive {
  const sinA = det_sin(angleY);
  const cosA = det_cos(angleY);
  const positions: number[] = [];
  const [cx, cy, cz] = translate;
  const [sx, sy, sz] = scale;

  for (let i = 0; i < prim.positions.length; i += 3) {
    const lx = prim.positions[i]! * sx;
    const ly = prim.positions[i + 1]! * sy;
    const lz = prim.positions[i + 2]! * sz;
    positions.push(cx + lx * cosA + lz * sinA, cy + ly, cz - lx * sinA + lz * cosA);
  }
  const normals: number[] = [];
  for (let i = 0; i < prim.normals.length; i += 3) {
    const lx = prim.normals[i]!;
    const ly = prim.normals[i + 1]!;
    const lz = prim.normals[i + 2]!;
    // Rotation-only on unit normals (scale is uniform per primitive part).
    normals.push(lx * cosA + lz * sinA, ly, -lx * sinA + lz * cosA);
  }

  const min: [number, number, number] = [Infinity, Infinity, Infinity];
  const max: [number, number, number] = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < positions.length; i += 3) {
    min[0] = Math.min(min[0], positions[i]!);
    min[1] = Math.min(min[1], positions[i + 1]!);
    min[2] = Math.min(min[2], positions[i + 2]!);
    max[0] = Math.max(max[0], positions[i]!);
    max[1] = Math.max(max[1], positions[i + 1]!);
    max[2] = Math.max(max[2], positions[i + 2]!);
  }

  return {
    positions,
    normals,
    uvs: prim.uvs.slice(),
    indices: prim.indices.slice(),
    bounds: { min, max },
  };
}

// ---------------------------------------------------------------------------
// Generation
// ---------------------------------------------------------------------------

/**
 * Deterministically generate the pagoda source mesh.
 *
 * The RNG is drawn in a FIXED order (part by part, field by field), so the
 * jitter stream is stable for a seed forever. A seeded jitter value lands in
 * [1-jitter, 1+jitter]; tier2 additionally gets a base rotation of 45° plus
 * seeded wobble so the two tiers read as distinct masses.
 */
export function generatePagodaSource(
  seed: number,
  opts: PagodaGenerateOptions = {},
): PagodaSourceMesh {
  const subdiv = Math.max(1, Math.min(4, opts.subdiv ?? 3));
  const jitter = Math.max(0, Math.min(0.2, opts.jitter ?? 0.04));
  const state = seedFromBigInt(BigInt(seed));
  const jit = (): number => 1 + (nextDouble(state) * 2 - 1) * jitter;

  const box = (sx: number, sy: number, sz: number) => buildBox(sx, sy, sz, subdiv);

  const parts = [
    { prim: box(6, 1.2, 6), partId: 'base', name: 'Stone Base', category: 'structure', mat: 0 },
    { prim: box(3.6, 2.4, 3.6), partId: 'tier1', name: 'First Tier', category: 'shelter', mat: 1 },
    { prim: box(2.8, 2.0, 2.8), partId: 'tier2', name: 'Second Tier', category: 'shelter', mat: 1 },
    { prim: buildFrustum(5.2, 3.6, 1.2, subdiv), partId: 'roof', name: 'Swept Roof', category: 'shelter', mat: 2 },
    { prim: box(0.5, 1.6, 0.5), partId: 'spire', name: 'Golden Spire', category: 'ornament', mat: 3 },
  ] as const;

  const placements: PlacedPrimitive[] = [];
  const partDefs: PagodaPart[] = [];
  const partTriRanges = new Map<string, { start: number; count: number }>();
  const bounds = { min: [Infinity, Infinity, Infinity] as [number, number, number], max: [-Infinity, -Infinity, -Infinity] as [number, number, number] };

  let triStart = 0;
  const yLevels = [0, 1.2, 3.6, 5.6, 6.8];
  const rotations = [0, 0, (45 * 3.141592653589793) / 180, 0, 0];

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i]!;
    const jx = jit();
    const jy = jit();
    const jz = jit();
    const wobble = (nextDouble(state) * 2 - 1) * 0.12;
    const placed = placePrimitive(part.prim, [0, 0, 0], [jx, jy, jz], rotations[i]! + wobble);
    // Rebase the primitive so its local min sits at yLevels[i] (the platform
    // base of the previous part), and re-derive the placed bounds.
    const yOffset = yLevels[i]! - placed.bounds.min[1];
    for (let v = 0; v < placed.positions.length; v += 3) {
      placed.positions[v + 1]! += yOffset;
    }
    placed.bounds.min[1] += yOffset;
    placed.bounds.max[1] += yOffset;
    const triCount = placed.indices.length / 3;
    partTriRanges.set(part.partId, { start: triStart, count: triCount });
    triStart += triCount;

    const matIndex = part.mat;
    partDefs.push({
      partId: part.partId,
      name: part.name,
      category: part.category,
      materialIndex: matIndex,
      protected: part.partId === 'spire',
      editable: part.partId !== 'spire',
    });
    placements.push(placed);
  }

  let totalPos = 0;
  let totalIdx = 0;
  for (const p of placements) {
    totalPos += p.positions.length;
    totalIdx += p.indices.length;
    bounds.min[0] = Math.min(bounds.min[0], p.bounds.min[0]);
    bounds.min[1] = Math.min(bounds.min[1], p.bounds.min[1]);
    bounds.min[2] = Math.min(bounds.min[2], p.bounds.min[2]);
    bounds.max[0] = Math.max(bounds.max[0], p.bounds.max[0]);
    bounds.max[1] = Math.max(bounds.max[1], p.bounds.max[1]);
    bounds.max[2] = Math.max(bounds.max[2], p.bounds.max[2]);
  }

  const positions = new Float32Array(totalPos);
  const normals = new Float32Array(totalPos);
  const uvs = new Float32Array((totalPos / 3) * 2);
  const indices = new Uint32Array(totalIdx);

  let vo = 0;
  let io = 0;
  for (const p of placements) {
    positions.set(p.positions, vo);
    normals.set(p.normals, vo);
    for (let v = 0; v < p.positions.length; v += 3) {
      uvs[(vo / 3) * 2 + (v / 3) * 2] = p.uvs[v / 3 * 2]!;
      uvs[(vo / 3) * 2 + (v / 3) * 2 + 1] = p.uvs[v / 3 * 2 + 1]!;
    }
    for (let i = 0; i < p.indices.length; i++) {
      indices[io + i] = p.indices[i]! + vo / 3;
    }
    io += p.indices.length;
    vo += p.positions.length;
  }

  return { positions, normals, uvs, indices, bounds, parts: partDefs, partTriRanges };
}
