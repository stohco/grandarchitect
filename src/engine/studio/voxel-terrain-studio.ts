/**
 * Voxel Terrain Studio
 * ====================
 *
 * Authoritative volumetric terrain editing. The terrain's source of truth
 * is a density field — NOT a mesh. The extracted triangle mesh is a derived
 * artifact.
 *
 * Pipeline:
 *   Volumetric density field (authoritative)
 *     → Surface extraction (Marching Cubes)
 *     → Render mesh (derived)
 *     → Collision mesh (derived)
 *     → Navigation (derived)
 *     → Vegetation/water updates (derived)
 *     → Atomic activation
 *
 * The studio provides brushes for density modification, material painting,
 * tunnel carving, and preview of dirty cells.
 */

// ---------------------------------------------------------------------------
// Density Field
// ---------------------------------------------------------------------------

export interface DensityField {
  fieldId: string;
  /** Grid resolution (samples per meter). */
  resolution: number;
  /** World-space bounds. */
  bounds: { min: [number, number, number]; max: [number, number, number] };
  /** Grid dimensions [nx, ny, nz]. */
  dimensions: [number, number, number];
  /** Density values: positive = solid, negative = empty. */
  data: Float32Array;
  /** Material IDs per voxel (index into material palette). */
  materialIds: Uint8Array;
  /** Hardness per voxel (0-1, affects destruction resistance). */
  hardness: Float8Array;
  /** Revision number. */
  revision: number;
}

/** Float8Array shim — use Uint8Array for hardness (0-255 → 0-1). */
type Float8Array = Uint8Array;

// ---------------------------------------------------------------------------
// Material Palette
// ---------------------------------------------------------------------------

export interface TerrainMaterialEntry {
  materialId: number;
  name: string;
  color: [number, number, number];
  hardness: number;
  debrisFamily: string;
}

export const DEFAULT_MATERIAL_PALETTE: TerrainMaterialEntry[] = [
  { materialId: 0, name: 'topsoil', color: [0.35, 0.25, 0.15], hardness: 0.3, debrisFamily: 'brown_dirt' },
  { materialId: 1, name: 'grass', color: [0.2, 0.5, 0.2], hardness: 0.2, debrisFamily: 'grass_turf' },
  { materialId: 2, name: 'stone', color: [0.45, 0.42, 0.38], hardness: 0.7, debrisFamily: 'grey_stone' },
  { materialId: 3, name: 'granite', color: [0.6, 0.58, 0.55], hardness: 0.85, debrisFamily: 'pale_granite' },
  { materialId: 4, name: 'sand', color: [0.76, 0.68, 0.42], hardness: 0.15, debrisFamily: 'sand' },
  { materialId: 5, name: 'snow', color: [0.9, 0.92, 0.95], hardness: 0.1, debrisFamily: 'snow' },
  { materialId: 6, name: 'ice', color: [0.6, 0.75, 0.9], hardness: 0.4, debrisFamily: 'ice_shards' },
  { materialId: 7, name: 'obsidian', color: [0.08, 0.06, 0.08], hardness: 0.9, debrisFamily: 'black_glass' },
  { materialId: 8, name: 'spirit_vein', color: [0.5, 0.3, 0.8], hardness: 0.5, debrisFamily: 'crystal' },
  { materialId: 9, name: 'corrupted', color: [0.3, 0.1, 0.15], hardness: 0.3, debrisFamily: 'corrupted_earth' },
];

// ---------------------------------------------------------------------------
// Field Operations
// ---------------------------------------------------------------------------

export function createDensityField(
  fieldId: string,
  bounds: { min: [number, number, number]; max: [number, number, number] },
  resolution: number,
): DensityField {
  const nx = Math.ceil((bounds.max[0] - bounds.min[0]) * resolution);
  const ny = Math.ceil((bounds.max[1] - bounds.min[1]) * resolution);
  const nz = Math.ceil((bounds.max[2] - bounds.min[2]) * resolution);
  const total = nx * ny * nz;

  return {
    fieldId,
    resolution,
    bounds,
    dimensions: [nx, ny, nz],
    data: new Float32Array(total),
    materialIds: new Uint8Array(total),
    hardness: new Uint8Array(total),
    revision: 0,
  };
}

/**
 * Initialize the density field with a basic terrain shape (mountain).
 */
export function initializeMountainField(
  field: DensityField,
  peakHeight: number,
  peakPosition: [number, number, number],
  baseRadius: number,
): void {
  const [nx, ny, nz] = field.dimensions;
  const [minX, minY, minZ] = field.bounds.min;
  const [maxX, maxY, maxZ] = field.bounds.max;
  const res = field.resolution;

  for (let ix = 0; ix < nx; ix++) {
    for (let iy = 0; iy < ny; iy++) {
      for (let iz = 0; iz < nz; iz++) {
        const idx = ix * ny * nz + iy * nz + iz;
        const wx = minX + ix / res;
        const wy = minY + iy / res;
        const wz = minZ + iz / res;

        // Distance from peak horizontally
        const dx = wx - peakPosition[0];
        const dz = wz - peakPosition[2];
        const distH = Math.sqrt(dx * dx + dz * dz);

        // Mountain profile: cone with noise
        const mountainHeight = Math.max(0, peakHeight * (1 - distH / baseRadius));
        const surfaceY = peakPosition[1] + mountainHeight;

        // Density: positive below surface, negative above
        const density = surfaceY - wy;

        field.data[idx] = density;

        // Material assignment based on height
        if (wy < peakPosition[1] + 0.5) {
          field.materialIds[idx] = 2; // stone at base
        } else if (wy < peakPosition[1] + mountainHeight * 0.3) {
          field.materialIds[idx] = 0; // topsoil
        } else if (wy < peakPosition[1] + mountainHeight * 0.7) {
          field.materialIds[idx] = 3; // granite mid
        } else {
          field.materialIds[idx] = 1; // grass near top
        }

        field.hardness[idx] = Math.round(0.7 * 255);
      }
    }
  }
  field.revision++;
}

// ---------------------------------------------------------------------------
// Density Brushes
// ---------------------------------------------------------------------------

export type BrushType = 'add' | 'subtract' | 'smooth' | 'flatten' | 'paint_material';

export interface BrushParams {
  type: BrushType;
  /** Brush center in world space. */
  center: [number, number, number];
  /** Brush radius in meters. */
  radiusM: number;
  /** Brush strength (0-1). */
  strength: number;
  /** For paint_material: material ID to paint. */
  materialId?: number;
  /** For flatten: target height. */
  targetHeight?: number;
}

export function applyBrush(field: DensityField, params: BrushParams): { voxelsModified: number } {
  const { type, center, radiusM, strength } = params;
  const [nx, ny, nz] = field.dimensions;
  const [minX, minY, minZ] = field.bounds.min;
  const res = field.resolution;
  const radiusSq = radiusM * radiusM;

  let modified = 0;

  // Compute voxel range to check
  const ixMin = Math.max(0, Math.floor((center[0] - radiusM - minX) * res));
  const ixMax = Math.min(nx - 1, Math.ceil((center[0] + radiusM - minX) * res));
  const iyMin = Math.max(0, Math.floor((center[1] - radiusM - minY) * res));
  const iyMax = Math.min(ny - 1, Math.ceil((center[1] + radiusM - minY) * res));
  const izMin = Math.max(0, Math.floor((center[2] - radiusM - minZ) * res));
  const izMax = Math.min(nz - 1, Math.ceil((center[2] + radiusM - minZ) * res));

  for (let ix = ixMin; ix <= ixMax; ix++) {
    for (let iy = iyMin; iy <= iyMax; iy++) {
      for (let iz = izMin; iz <= izMax; iz++) {
        const wx = minX + ix / res;
        const wy = minY + iy / res;
        const wz = minZ + iz / res;

        const dx = wx - center[0];
        const dy = wy - center[1];
        const dz = wz - center[2];
        const distSq = dx * dx + dy * dy + dz * dz;

        if (distSq > radiusSq) continue;

        const idx = ix * ny * nz + iy * nz + iz;
        const falloff = 1 - Math.sqrt(distSq) / radiusM; // Linear falloff
        const influence = falloff * strength;

        switch (type) {
          case 'add':
            field.data[idx] += influence;
            modified++;
            break;
          case 'subtract':
            field.data[idx] -= influence;
            modified++;
            break;
          case 'smooth': {
            // Average with neighbors
            let sum = 0;
            let count = 0;
            for (let dx2 = -1; dx2 <= 1; dx2++) {
              for (let dy2 = -1; dy2 <= 1; dy2++) {
                for (let dz2 = -1; dz2 <= 1; dz2++) {
                  const nix = ix + dx2;
                  const niy = iy + dy2;
                  const niz = iz + dz2;
                  if (nix >= 0 && nix < nx && niy >= 0 && niy < ny && niz >= 0 && niz < nz) {
                    sum += field.data[nix * ny * nz + niy * nz + niz];
                    count++;
                  }
                }
              }
            }
            if (count > 0) {
              const avg = sum / count;
              field.data[idx] += (avg - field.data[idx]) * influence;
              modified++;
            }
            break;
          }
          case 'flatten':
            if (params.targetHeight !== undefined) {
              const target = params.targetHeight - wy;
              field.data[idx] += (target - field.data[idx]) * influence;
              modified++;
            }
            break;
          case 'paint_material':
            if (params.materialId !== undefined) {
              field.materialIds[idx] = params.materialId;
              modified++;
            }
            break;
        }
      }
    }
  }

  field.revision++;
  return { voxelsModified: modified };
}

// ---------------------------------------------------------------------------
// Tunnel Carving
// ---------------------------------------------------------------------------

export interface TunnelParams {
  /** Start point in world space. */
  start: [number, number, number];
  /** End point in world space. */
  end: [number, number, number];
  /** Tunnel radius in meters. */
  radiusM: number;
}

export function carveTunnel(field: DensityField, params: TunnelParams): { voxelsModified: number } {
  const { start, end, radiusM } = params;
  const [nx, ny, nz] = field.dimensions;
  const [minX, minY, minZ] = field.bounds.min;
  const res = field.resolution;

  // Direction along tunnel
  const dx = end[0] - start[0];
  const dy = end[1] - start[1];
  const dz = end[2] - start[2];
  const tunnelLen = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1;
  const dirX = dx / tunnelLen;
  const dirY = dy / tunnelLen;
  const dirZ = dz / tunnelLen;
  const radiusSq = radiusM * radiusM;

  let modified = 0;

  // Compute bounding box of tunnel
  const minXBound = Math.min(start[0], end[0]) - radiusM;
  const maxXBound = Math.max(start[0], end[0]) + radiusM;
  const minYBound = Math.min(start[1], end[1]) - radiusM;
  const maxYBound = Math.max(start[1], end[1]) + radiusM;
  const minZBound = Math.min(start[2], end[2]) - radiusM;
  const maxZBound = Math.max(start[2], end[2]) + radiusM;

  const ixMin = Math.max(0, Math.floor((minXBound - minX) * res));
  const ixMax = Math.min(nx - 1, Math.ceil((maxXBound - minX) * res));
  const iyMin = Math.max(0, Math.floor((minYBound - minY) * res));
  const iyMax = Math.min(ny - 1, Math.ceil((maxYBound - minY) * res));
  const izMin = Math.max(0, Math.floor((minZBound - minZ) * res));
  const izMax = Math.min(nz - 1, Math.ceil((maxZBound - minZ) * res));

  for (let ix = ixMin; ix <= ixMax; ix++) {
    for (let iy = iyMin; iy <= iyMax; iy++) {
      for (let iz = izMin; iz <= izMax; iz++) {
        const wx = minX + ix / res;
        const wy = minY + iy / res;
        const wz = minZ + iz / res;

        // Distance from point to tunnel line segment
        const px = wx - start[0];
        const py = wy - start[1];
        const pz = wz - start[2];

        // Project onto tunnel direction
        const t = Math.max(0, Math.min(tunnelLen, px * dirX + py * dirY + pz * dirZ));

        // Closest point on tunnel line
        const closestX = start[0] + dirX * t;
        const closestY = start[1] + dirY * t;
        const closestZ = start[2] + dirZ * t;

        // Distance from voxel to tunnel center
        const distX = wx - closestX;
        const distY = wy - closestY;
        const distZ = wz - closestZ;
        const distSq = distX * distX + distY * distY + distZ * distZ;

        if (distSq < radiusSq) {
          const idx = ix * ny * nz + iy * nz + iz;
          // Set density to very negative (empty)
          const influence = 1 - Math.sqrt(distSq) / radiusM;
          field.data[idx] = Math.min(field.data[idx], -influence * 2);
          modified++;
        }
      }
    }
  }

  field.revision++;
  return { voxelsModified: modified };
}

// ---------------------------------------------------------------------------
// Surface Extraction (simplified Marching Cubes)
// ---------------------------------------------------------------------------

export interface ExtractedMesh {
  positions: Float32Array;
  normals: Float32Array;
  indices: Uint32Array;
  materialIds: Float32Array;
  vertexCount: number;
  triangleCount: number;
  sourceRevision: number;
}

export function extractSurface(field: DensityField, isoLevel = 0): ExtractedMesh {
  const [nx, ny, nz] = field.dimensions;
  const [minX, minY, minZ] = field.bounds.min;
  const res = field.resolution;

  const positions: number[] = [];
  const indices: number[] = [];
  const materialIds: number[] = [];
  let vertexCount = 0;

  // Simplified Marching Cubes: for each voxel, check if the surface crosses it
  for (let ix = 0; ix < nx - 1; ix++) {
    for (let iy = 0; iy < ny - 1; iy++) {
      for (let iz = 0; iz < nz - 1; iz++) {
        const idx000 = ix * ny * nz + iy * nz + iz;
        const idx100 = (ix + 1) * ny * nz + iy * nz + iz;
        const idx010 = ix * ny * nz + (iy + 1) * nz + iz;
        const idx110 = (ix + 1) * ny * nz + (iy + 1) * nz + iz;
        const idx001 = ix * ny * nz + iy * nz + (iz + 1);
        const idx101 = (ix + 1) * ny * nz + iy * nz + (iz + 1);
        const idx011 = ix * ny * nz + (iy + 1) * nz + (iz + 1);
        const idx111 = (ix + 1) * ny * nz + (iy + 1) * nz + (iz + 1);

        const d000 = field.data[idx000];
        const d100 = field.data[idx100];
        const d010 = field.data[idx010];
        const d110 = field.data[idx110];
        const d001 = field.data[idx001];
        const d101 = field.data[idx101];
        const d011 = field.data[idx011];
        const d111 = field.data[idx111];

        // Simplified: if any corner is solid and any is empty, create a face
        const solid = [d000, d100, d010, d110, d001, d101, d011, d111].map((d) => d > isoLevel);
        const hasSolid = solid.some((s) => s);
        const hasEmpty = solid.some((s) => !s);

        if (!hasSolid || !hasEmpty) continue;

        // Create a simple quad at the voxel center
        const cx = minX + (ix + 0.5) / res;
        const cy = minY + (iy + 0.5) / res;
        const cz = minZ + (iz + 0.5) / res;
        const halfSize = 0.5 / res;

        // Use the dominant material of solid corners
        let matId = 0;
        let matCount = 0;
        const matCounts: Record<number, number> = {};
        if (solid[0]) { matCounts[field.materialIds[idx000]] = (matCounts[field.materialIds[idx000]] ?? 0) + 1; }
        if (solid[1]) { matCounts[field.materialIds[idx100]] = (matCounts[field.materialIds[idx100]] ?? 0) + 1; }
        if (solid[2]) { matCounts[field.materialIds[idx010]] = (matCounts[field.materialIds[idx010]] ?? 0) + 1; }
        if (solid[3]) { matCounts[field.materialIds[idx110]] = (matCounts[field.materialIds[idx110]] ?? 0) + 1; }
        if (solid[4]) { matCounts[field.materialIds[idx001]] = (matCounts[field.materialIds[idx001]] ?? 0) + 1; }
        if (solid[5]) { matCounts[field.materialIds[idx101]] = (matCounts[field.materialIds[idx101]] ?? 0) + 1; }
        if (solid[6]) { matCounts[field.materialIds[idx011]] = (matCounts[field.materialIds[idx011]] ?? 0) + 1; }
        if (solid[7]) { matCounts[field.materialIds[idx111]] = (matCounts[field.materialIds[idx111]] ?? 0) + 1; }
        for (const [id, count] of Object.entries(matCounts)) {
          if (count > matCount) {
            matCount = count;
            matId = Number(id);
          }
        }

        // Create 2 triangles for the surface
        const v0 = vertexCount++;
        const v1 = vertexCount++;
        const v2 = vertexCount++;
        const v3 = vertexCount++;

        positions.push(cx - halfSize, cy - halfSize, cz - halfSize);
        positions.push(cx + halfSize, cy - halfSize, cz - halfSize);
        positions.push(cx + halfSize, cy + halfSize, cz - halfSize);
        positions.push(cx - halfSize, cy + halfSize, cz - halfSize);

        indices.push(v0, v1, v2, v0, v2, v3);
        materialIds.push(matId, matId, matId, matId);
      }
    }
  }

  // Compute simple normals (all up for now)
  const normals = new Float32Array(vertexCount * 3);
  for (let i = 0; i < vertexCount; i++) {
    normals[i * 3] = 0;
    normals[i * 3 + 1] = 1;
    normals[i * 3 + 2] = 0;
  }

  return {
    positions: new Float32Array(positions),
    normals,
    indices: new Uint32Array(indices),
    materialIds: new Float32Array(materialIds),
    vertexCount,
    triangleCount: indices.length / 3,
    sourceRevision: field.revision,
  };
}

// ---------------------------------------------------------------------------
// Field Stats
// ---------------------------------------------------------------------------

export function getFieldStats(field: DensityField): {
  totalVoxels: number;
  solidVoxels: number;
  emptyVoxels: number;
  surfaceVoxels: number;
  materialCounts: Record<number, number>;
  revision: number;
} {
  const total = field.data.length;
  let solid = 0;
  let empty = 0;
  let surface = 0;
  const materialCounts: Record<number, number> = {};

  for (let i = 0; i < total; i++) {
    if (field.data[i] > 0) {
      solid++;
      const matId = field.materialIds[i];
      materialCounts[matId] = (materialCounts[matId] ?? 0) + 1;
    } else {
      empty++;
    }
  }

  // Count surface voxels (solid with at least one empty neighbor)
  const [nx, ny, nz] = field.dimensions;
  for (let ix = 0; ix < nx; ix++) {
    for (let iy = 0; iy < ny; iy++) {
      for (let iz = 0; iz < nz; iz++) {
        const idx = ix * ny * nz + iy * nz + iz;
        if (field.data[idx] <= 0) continue;

        // Check neighbors
        const neighbors = [
          ix > 0 ? field.data[(ix - 1) * ny * nz + iy * nz + iz] : 1,
          ix < nx - 1 ? field.data[(ix + 1) * ny * nz + iy * nz + iz] : 1,
          iy > 0 ? field.data[ix * ny * nz + (iy - 1) * nz + iz] : 1,
          iy < ny - 1 ? field.data[ix * ny * nz + (iy + 1) * nz + iz] : 1,
          iz > 0 ? field.data[ix * ny * nz + iy * nz + (iz - 1)] : 1,
          iz < nz - 1 ? field.data[ix * ny * nz + iy * nz + (iz + 1)] : 1,
        ];

        if (neighbors.some((n) => n <= 0)) {
          surface++;
        }
      }
    }
  }

  return {
    totalVoxels: total,
    solidVoxels: solid,
    emptyVoxels: empty,
    surfaceVoxels: surface,
    materialCounts,
    revision: field.revision,
  };
}
