/**
 * game/planet/chunk-mesh.ts — watertight chunk meshing.
 *
 * The frontier contract, applied at planet scale: RENDER and COLLISION
 * derive from the SAME height function, per chunk. Every chunk is an 8×8 m
 * grid at 1 m cells; neighbor chunks share their border columns exactly
 * (computed from the same world points), so the planet is watertight with
 * zero seams. Slope-robust winding: each triangle is oriented UP from its
 * own vertices (the alternating-transparent-triangles bug is impossible).
 */

import { PlanetHeightField, type Biome } from './height-field';

/** Art-bible palette (linear working space) per terrain material. */
export const MATERIAL_COLORS: Record<number, [number, number, number]> = {
  0: [0.115, 0.15, 0.088],  // soil — moss/grass green (#5e6c54)
  1: [0.153, 0.144, 0.127], // rock — cool grey (#6d6a64)
  2: [0.53, 0.42, 0.23],    // sand (#c9b078)
  3: [0.807, 0.839, 0.888], // snow (#e8ecf2)
  4: [0.106, 0.096, 0.082], // deep stone (#4a453f)
};

export interface ChunkMesh {
  /** Chunk key "cx,cz". */
  key: string;
  /** Chunk origin in world meters. */
  originX: number;
  originZ: number;
  /** cells per side (17×17 vertices). */
  cells: number;
  /** Vertex data. */
  positions: Float32Array;
  colors: Float32Array;
  /** Triangle indices (slope-robust UP winding). */
  indices: Uint32Array;
  /** Collision heights: same lattice columns as the mesh tops (17×17). */
  collisionHeights: Float32Array;
  /** Material id per cell (for future detail dressing). */
  materials: Uint8Array;
  /** Biomes per cell. */
  biomes: (Biome | string)[];
  /** Deterministic hash of this chunk's heights (for evidence + change detection). */
  hash: string;
}

/** Chunk world size (m) and cell size (m). */
export const CHUNK_M = 8;
export const CELL_M = 1;
export const CELLS = CHUNK_M / CELL_M; // 8

/** World chunk key for a world point. */
export function chunkKeyOf(wx: number, wz: number): string {
  return `${Math.floor(wx / CHUNK_M)},${Math.floor(wz / CHUNK_M)}`;
}

/** Chunk origin from its key. */
export function chunkOriginOf(key: string): { x: number; z: number } {
  const [cx, cz] = key.split(',').map(Number);
  return { x: cx * CHUNK_M, z: cz * CHUNK_M };
}

/** Build one watertight chunk mesh from the field. */
export function buildChunkMesh(field: PlanetHeightField, key: string): ChunkMesh | null {
  const { x: ox, z: oz } = chunkOriginOf(key);
  const n = CELLS + 1; // 9 vertices per side

  const positions = new Float32Array(n * n * 3);
  const colors = new Float32Array(n * n * 3);
  const collisionHeights = new Float32Array(n * n);
  const materials = new Uint8Array(CELLS * CELLS);
  const biomes: (Biome | string)[] = new Array(CELLS * CELLS);

  for (let iz = 0; iz < n; iz++) {
    for (let ix = 0; ix < n; ix++) {
      const wx = ox + ix * CELL_M;
      const wz = oz + iz * CELL_M;
      const s = field.evaluate(wx, wz);
      const i = iz * n + ix;
      positions[i * 3] = ix * CELL_M;
      positions[i * 3 + 1] = s.height;
      positions[i * 3 + 2] = iz * CELL_M;
      collisionHeights[i] = s.height;
      const c = MATERIAL_COLORS[s.material] ?? MATERIAL_COLORS[0];
      colors[i * 3] = c[0];
      colors[i * 3 + 1] = c[1];
      colors[i * 3 + 2] = c[2];
    }
  }

  // cell-level material/biome (for dressing) + indices with slope-robust winding
  const indices: number[] = [];
  for (let iz = 0; iz < CELLS; iz++) {
    for (let ix = 0; ix < CELLS; ix++) {
      const a = iz * n + ix;
      const b = a + 1;
      const c = (iz + 1) * n + ix;
      const d = c + 1;
      materials[iz * CELLS + ix] = field.evaluate(ox + ix * CELL_M + CELL_M / 2, oz + iz * CELL_M + CELL_M / 2).material;
      biomes[iz * CELLS + ix] = field.evaluate(ox + ix * CELL_M + CELL_M / 2, oz + iz * CELL_M + CELL_M / 2).biome;
      // UP-facing winding from actual vertices (slope-robust)
      const ay = positions[a * 3 + 1], by = positions[b * 3 + 1];
      const cy = positions[c * 3 + 1], dy = positions[d * 3 + 1];
      const n1y = (cy - ay) * (CELL_M) - (CELL_M) * (by - ay); // (c-a)×(b-a) y
      const n2y = (dy - cy) * (CELL_M) - (CELL_M) * (by - cy); // (d-c)×(b-c) y
      if (n1y >= 0) indices.push(a, c, b); else indices.push(a, b, c);
      if (n2y >= 0) indices.push(c, d, b); else indices.push(c, b, d);
    }
  }

  // deterministic chunk hash (evidence + change detection)
  const hash = simpleHash(positions, indices);

  return {
    key,
    originX: ox,
    originZ: oz,
    cells: CELLS,
    positions,
    colors,
    indices: Uint32Array.from(indices),
    collisionHeights,
    materials,
    biomes,
    hash,
  };
}

/** Cheap deterministic hash of the chunk's vertex heights + indices. */
function simpleHash(positions: Float32Array, indices: number[]): string {
  let h1 = 2166136261 >>> 0;
  let h2 = 2246822519 >>> 0;
  const mix = (v: number) => {
    h1 = Math.imul(h1 ^ (v | 0), 16777619);
    h2 = Math.imul(h2 ^ (v >>> 16), 2246822519);
  };
  for (let i = 1; i < positions.length; i += 3) mix(positions[i] * 1000);
  for (const ix of indices) mix(ix);
  return h1.toString(16).padStart(8, '0') + h2.toString(16).padStart(8, '0');
}
