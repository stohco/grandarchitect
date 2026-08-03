/**
 * ga:terrain — Terrain Plugin
 *
 * Manages the voxel terrain field with chunk-based density storage.
 * The headless stub stores density in Float32Arrays without meshing or rendering.
 * Real implementation will use WASM meshing pipeline (transvoxel/dual contour).
 *
 * Capabilities provided:
 *   - terrain.field: TerrainField — chunk CRUD, density read/write, dirty tracking.
 *   - terrain.query: TerrainQuery — height sampling, ray marching, region queries.
 */

import type { Plugin, PluginHost } from '../../kernel/plugin-host';
import type { PluginManifest } from '../../kernel/types';

// ============================================================================
// Terrain Types (from architecture doc 21)
// ============================================================================

export type ChunkId = string; // "${x}_${y}_${z}"

export const CHUNK_SIZE = 16; // 16x16x16 voxels per chunk
export const VOXEL_COUNT = CHUNK_SIZE * CHUNK_SIZE * CHUNK_SIZE; // 4096

export type MeshAlgorithm = 'transvoxel' | 'dual_contour';
export type LodLevel = 0 | 1 | 2 | 3;

export interface ChunkData {
  id: ChunkId;
  x: number;
  y: number;
  z: number;
  density: Float32Array;     // 4096 floats, range [-1, 1], negative = solid
  material: Uint8Array;       // 4096 indices into MaterialTable
  revision: number;
  initialized: boolean;
  dirty: boolean;
}

export interface TerrainDelta {
  chunkId: ChunkId;
  revision: number;
  localPos: [number, number, number];
  oldDensity: number;
  newDensity: number;
  oldMaterial: number;
  newMaterial: number;
}

export interface TerrainStats {
  chunkCount: number;
  dirtyChunkCount: number;
  totalVoxels: number;
  solidVoxels: number;
}

export interface WorldPos {
  x: number;
  y: number;
  z: number;
}

// ============================================================================
// TerrainField Interface
// ============================================================================

export interface TerrainField {
  createChunk(x: number, y: number, z: number): ChunkData;
  getChunk(id: ChunkId): ChunkData | undefined;
  getChunkAt(x: number, y: number, z: number): ChunkData | undefined;
  destroyChunk(id: ChunkId): boolean;
  listChunks(): ChunkData[];
  listDirtyChunks(): ChunkData[];
  getDensity(worldX: number, worldY: number, worldZ: number): number;
  setDensity(worldX: number, worldY: number, worldZ: number, density: number): void;
  getMaterial(worldX: number, worldY: number, worldZ: number): number;
  setMaterial(worldX: number, worldY: number, worldZ: number, mat: number): void;
  markDirty(id: ChunkId): void;
  markClean(id: ChunkId): void;
  clearDirty(): void;
  getStats(): TerrainStats;
  chunkCount(): number;
}

// ============================================================================
// Terrain Query Interface
// ============================================================================

export interface TerrainQuery {
  sampleHeight(worldX: number, worldZ: number): number | null;
  isSolid(worldX: number, worldY: number, worldZ: number): boolean;
  getRegion(minX: number, minY: number, minZ: number, maxX: number, maxY: number, maxZ: number): { density: number; material: number }[];
}

// ============================================================================
// Chunk ID helpers
// ============================================================================

function chunkId(x: number, y: number, z: number): ChunkId {
  return `${x}_${y}_${z}`;
}

function localIndex(lx: number, ly: number, lz: number): number {
  return ly * CHUNK_SIZE * CHUNK_SIZE + lz * CHUNK_SIZE + lx;
}

// ============================================================================
// Terrain Field Implementation (headless, in-memory)
// ============================================================================

function createTerrainField(): TerrainField {
  const chunks = new Map<ChunkId, ChunkData>();
  const dirtyChunks = new Set<ChunkId>();
  let revisionCounter = 0;

  function createChunk(x: number, y: number, z: number): ChunkData {
    const id = chunkId(x, y, z);
    if (chunks.has(id)) return chunks.get(id)!;

    const data: ChunkData = {
      id,
      x, y, z,
      density: new Float32Array(VOXEL_COUNT), // default 0 = empty
      material: new Uint8Array(VOXEL_COUNT),     // default 0 = air
      revision: 0,
      initialized: true,
      dirty: false,
    };
    chunks.set(id, data);
    return data;
  }

  function getChunk(id: ChunkId): ChunkData | undefined {
    return chunks.get(id);
  }

  function getChunkAt(x: number, y: number, z: number): ChunkData | undefined {
    return chunks.get(chunkId(x, y, z));
  }

  function destroyChunk(id: ChunkId): boolean {
    dirtyChunks.delete(id);
    return chunks.delete(id);
  }

  function listChunks(): ChunkData[] {
    return Array.from(chunks.values());
  }

  function listDirtyChunks(): ChunkData[] {
    return Array.from(dirtyChunks).map(id => chunks.get(id)!).filter(Boolean);
  }

  function getDensity(worldX: number, worldY: number, worldZ: number): number {
    const cx = Math.floor(worldX / CHUNK_SIZE);
    const cy = Math.floor(worldY / CHUNK_SIZE);
    const cz = Math.floor(worldZ / CHUNK_SIZE);
    const chunk = chunks.get(chunkId(cx, cy, cz));
    if (!chunk) return 0;

    const lx = ((worldX % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
    const ly = ((worldY % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
    const lz = ((worldZ % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
    return chunk.density[localIndex(lx, ly, lz)];
  }

  function setDensity(worldX: number, worldY: number, worldZ: number, density: number): void {
    const cx = Math.floor(worldX / CHUNK_SIZE);
    const cy = Math.floor(worldY / CHUNK_SIZE);
    const cz = Math.floor(worldZ / CHUNK_SIZE);
    let chunk = chunks.get(chunkId(cx, cy, cz));
    if (!chunk) chunk = createChunk(cx, cy, cz);

    const lx = ((worldX % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
    const ly = ((worldY % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
    const lz = ((worldZ % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
    chunk.density[localIndex(lx, ly, lz)] = density;
    chunk.revision = ++revisionCounter;
    chunk.dirty = true;
    dirtyChunks.add(chunk.id);
  }

  function getMaterial(worldX: number, worldY: number, worldZ: number): number {
    const cx = Math.floor(worldX / CHUNK_SIZE);
    const cy = Math.floor(worldY / CHUNK_SIZE);
    const cz = Math.floor(worldZ / CHUNK_SIZE);
    const chunk = chunks.get(chunkId(cx, cy, cz));
    if (!chunk) return 0;

    const lx = ((worldX % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
    const ly = ((worldY % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
    const lz = ((worldZ % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
    return chunk.material[localIndex(lx, ly, lz)];
  }

  function setMaterial(worldX: number, worldY: number, worldZ: number, mat: number): void {
    const cx = Math.floor(worldX / CHUNK_SIZE);
    const cy = Math.floor(worldY / CHUNK_SIZE);
    const cz = Math.floor(worldZ / CHUNK_SIZE);
    let chunk = chunks.get(chunkId(cx, cy, cz));
    if (!chunk) chunk = createChunk(cx, cy, cz);

    const lx = ((worldX % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
    const ly = ((worldY % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
    const lz = ((worldZ % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
    chunk.material[localIndex(lx, ly, lz)] = mat;
    chunk.revision = ++revisionCounter;
    chunk.dirty = true;
    dirtyChunks.add(chunk.id);
  }

  function markDirty(id: ChunkId): void {
    dirtyChunks.add(id);
    const chunk = chunks.get(id);
    if (chunk) chunk.dirty = true;
  }

  function markClean(id: ChunkId): void {
    dirtyChunks.delete(id);
    const chunk = chunks.get(id);
    if (chunk) chunk.dirty = false;
  }

  function clearDirty(): void {
    for (const id of dirtyChunks) {
      const chunk = chunks.get(id);
      if (chunk) chunk.dirty = false;
    }
    dirtyChunks.clear();
  }

  function getStats(): TerrainStats {
    let solidVoxels = 0;
    for (const chunk of chunks.values()) {
      for (let i = 0; i < VOXEL_COUNT; i++) {
        if (chunk.density[i] < 0) solidVoxels++;
      }
    }
    return {
      chunkCount: chunks.size,
      dirtyChunkCount: dirtyChunks.size,
      totalVoxels: chunks.size * VOXEL_COUNT,
      solidVoxels,
    };
  }

  function chunkCount(): number {
    return chunks.size;
  }

  return {
    createChunk, getChunk, getChunkAt, destroyChunk,
    listChunks, listDirtyChunks,
    getDensity, setDensity, getMaterial, setMaterial,
    markDirty, markClean, clearDirty,
    getStats, chunkCount,
  };
}

// ============================================================================
// Terrain Query Implementation
// ============================================================================

function createTerrainQuery(field: TerrainField): TerrainQuery {
  return {
    sampleHeight(worldX: number, worldZ: number): number | null {
      // Walk from top to bottom to find first solid voxel
      for (let y = 255; y >= 0; y--) {
        if (field.getDensity(worldX, y, worldZ) < 0) {
          return y;
        }
      }
      return null;
    },

    isSolid(worldX: number, worldY: number, worldZ: number): boolean {
      return field.getDensity(worldX, worldY, worldZ) < 0;
    },

    getRegion(minX: number, minY: number, minZ: number, maxX: number, maxY: number, maxZ: number): { density: number; material: number }[] {
      const results: { density: number; material: number }[] = [];
      for (let x = minX; x <= maxX; x++) {
        for (let y = minY; y <= maxY; y++) {
          for (let z = minZ; z <= maxZ; z++) {
            results.push({
              density: field.getDensity(x, y, z),
              material: field.getMaterial(x, y, z),
            });
          }
        }
      }
      return results;
    },
  };
}

// ============================================================================
// The Plugin
// ============================================================================

function createTerrainPlugin(): Plugin & {
  field: TerrainField;
  query: TerrainQuery;
} {
  const field = createTerrainField();
  const query = createTerrainQuery(field);

  const plugin: Plugin & {
    field: TerrainField;
    query: TerrainQuery;
  } = {
    id: 'ga:terrain',
    version: '0.1.0',
    dependencies: [],

    init(h) {
      h.capabilities.register({ capability: 'terrain.field', provider: 'ga:terrain', version: '0.1.0', instance: field });
      h.capabilities.register({ capability: 'terrain.query', provider: 'ga:terrain', version: '0.1.0', instance: query });
      console.log('[ga:terrain] Initialized — 2 capabilities registered (headless backend)');
    },

    destroy(_h) {
      console.log('[ga:terrain] Destroyed');
    },

    field,
    query,
  };

  return plugin;
}

export const TerrainPlugin = createTerrainPlugin();

export const TerrainPluginManifest: PluginManifest = {
  id: 'ga:terrain',
  version: '0.1.0',
  engineVersionRange: '>=0.1.0',
  dependencies: [],
  optionalDependencies: [],
  provides: ['terrain.field', 'terrain.query'],
  requires: [],
  permissions: ['physics'],
  deterministicMode: 'required',
  workerCompatible: true,
};
