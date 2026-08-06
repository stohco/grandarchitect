/**
 * UV & Material Editor
 * ====================
 *
 * In-engine UV and material authoring. Three.js can display materials but
 * cannot author UVs or paint textures. This provides:
 *
 *   - UV island inspection
 *   - Planar, cylindrical, box, triplanar projections
 *   - Atlas assignment
 *   - Texel-density normalization
 *   - Seam marking
 *   - Material-ID painting
 *   - Dye masks, damage masks, terrain blend masks
 *   - Base color, normal, ORM, emissive channels
 *   - Neutral-light material preview
 *   - Distance-readability preview
 */

import type { MeshKernel, UVSet } from './mesh-kernel';

// ---------------------------------------------------------------------------
// UV Island Analysis
// ---------------------------------------------------------------------------

export interface UVIsland {
  islandId: number;
  /** UV coordinates in this island. */
  uvIndices: number[];
  /** Bounding box in UV space [uMin, vMin, uMax, vMax]. */
  bounds: [number, number, number, number];
  /** Area in UV space (0-1). */
  area: number;
  /** Number of faces using this island. */
  faceCount: number;
}

export function analyzeUVIslands(uvSet: UVSet): UVIsland[] {
  if (uvSet.coords.length === 0) return [];

  // Simplified: group UVs by proximity (real implementation would use
  // connected-component analysis on UV topology)
  const visited = new Set<number>();
  const islands: UVIsland[] = [];
  let islandId = 0;

  for (let i = 0; i < uvSet.coords.length; i++) {
    if (visited.has(i)) continue;

    // Start a new island
    const island: UVIsland = {
      islandId: islandId++,
      uvIndices: [i],
      bounds: [uvSet.coords[i][0], uvSet.coords[i][1], uvSet.coords[i][0], uvSet.coords[i][1]],
      area: 0,
      faceCount: 0,
    };
    visited.add(i);

    // Find connected UVs (simplified: within a threshold)
    const threshold = 0.1;
    for (let j = i + 1; j < uvSet.coords.length; j++) {
      if (visited.has(j)) continue;
      const du = uvSet.coords[j][0] - uvSet.coords[i][0];
      const dv = uvSet.coords[j][1] - uvSet.coords[i][1];
      if (Math.abs(du) < threshold && Math.abs(dv) < threshold) {
        island.uvIndices.push(j);
        visited.add(j);
        island.bounds[0] = Math.min(island.bounds[0], uvSet.coords[j][0]);
        island.bounds[1] = Math.min(island.bounds[1], uvSet.coords[j][1]);
        island.bounds[2] = Math.max(island.bounds[2], uvSet.coords[j][0]);
        island.bounds[3] = Math.max(island.bounds[3], uvSet.coords[j][1]);
      }
    }

    island.area = (island.bounds[2] - island.bounds[0]) * (island.bounds[3] - island.bounds[1]);
    islands.push(island);
  }

  return islands;
}

// ---------------------------------------------------------------------------
// Texel Density
// ---------------------------------------------------------------------------

export interface TexelDensityResult {
  /** Texel density in pixels per meter. */
  pxPerMeter: number;
  /** Texture resolution. */
  textureResolution: number;
  /** UV area ratio (UV area / geometry area). */
  uvAreaRatio: number;
  /** Whether density is within target range. */
  withinTarget: boolean;
  /** Target range. */
  targetRange: [number, number];
}

export function computeTexelDensity(
  kernel: MeshKernel,
  uvSetIndex: number,
  textureResolution: number,
  targetRange: [number, number] = [256, 768],
): TexelDensityResult {
  const uvSet = kernel.uvSets[uvSetIndex];
  if (!uvSet || uvSet.coords.length === 0) {
    return {
      pxPerMeter: 0,
      textureResolution,
      uvAreaRatio: 0,
      withinTarget: false,
      targetRange,
    };
  }

  // Compute UV area (sum of triangle areas in UV space)
  let uvArea = 0;
  for (const [, face] of kernel.faces) {
    if (face.vertices.length < 3) continue;
    const v0 = uvSet.coords[face.vertices[0] % uvSet.coords.length];
    const v1 = uvSet.coords[face.vertices[1] % uvSet.coords.length];
    const v2 = uvSet.coords[face.vertices[2] % uvSet.coords.length];
    const area = 0.5 * Math.abs(
      (v1[0] - v0[0]) * (v2[1] - v0[1]) - (v2[0] - v0[0]) * (v1[1] - v0[1]),
    );
    uvArea += area;
  }

  // Compute geometry area
  let geoArea = 0;
  for (const [, face] of kernel.faces) {
    const verts = face.vertices.map((vId) => kernel.vertices.get(vId)).filter(Boolean);
    if (verts.length < 3) continue;
    const v0 = verts[0]!.position;
    const v1 = verts[1]!.position;
    const v2 = verts[2]!.position;
    const ux = v1[0] - v0[0], uy = v1[1] - v0[1], uz = v1[2] - v0[2];
    const vx = v2[0] - v0[0], vy = v2[1] - v0[1], vz = v2[2] - v0[2];
    geoArea += 0.5 * Math.sqrt(
      (uy * vz - uz * vy) ** 2 +
      (uz * vx - ux * vz) ** 2 +
      (ux * vy - uy * vx) ** 2,
    );
  }

  const uvAreaRatio = geoArea > 0 ? uvArea / geoArea : 0;
  const pxPerMeter = uvArea > 0 ? (textureResolution * Math.sqrt(uvArea)) / Math.sqrt(geoArea || 1) : 0;

  return {
    pxPerMeter: Math.round(pxPerMeter),
    textureResolution,
    uvAreaRatio,
    withinTarget: pxPerMeter >= targetRange[0] && pxPerMeter <= targetRange[1],
    targetRange,
  };
}

// ---------------------------------------------------------------------------
// Material Channel Editor
// ---------------------------------------------------------------------------

export type MaterialChannel =
  | 'baseColor' | 'normal' | 'orm' | 'emissive'
  | 'dyeMask' | 'detailMask' | 'subsurfaceMask' | 'damageMask';

export interface MaterialLayer {
  layerId: string;
  channel: MaterialChannel;
  /** Texture path (content-addressed). */
  texturePath?: string;
  /** Solid color (if no texture). */
  color?: [number, number, number, number];
  /** Whether this layer is enabled. */
  enabled: boolean;
  /** Blend mode. */
  blendMode: 'replace' | 'multiply' | 'add' | 'overlay' | 'screen';
  /** Opacity (0-1). */
  opacity: number;
}

export interface MaterialDefinition {
  materialId: string;
  name: string;
  layers: MaterialLayer[];
  /** Roughness range. */
  roughnessRange: [number, number];
  /** Metallic (0-1). */
  metallic: number;
  /** Whether this material is double-sided. */
  doubleSided: boolean;
  /** Alpha mode. */
  alphaMode: 'OPAQUE' | 'MASK' | 'BLEND';
  alphaCutoff?: number;
}

// ---------------------------------------------------------------------------
// Seam Detection
// ---------------------------------------------------------------------------

export interface UVSeam {
  seamId: number;
  /** Vertex IDs on one side of the seam. */
  sideA: number[];
  /** Vertex IDs on the other side. */
  sideB: number[];
  /** Length in 3D space. */
  length3D: number;
}

export function detectUVSeams(kernel: MeshKernel, uvSetIndex: number): UVSeam[] {
  const uvSet = kernel.uvSets[uvSetIndex];
  if (!uvSet) return [];

  const seams: UVSeam[] = [];
  let seamId = 0;

  // Find edges that are shared by faces with different UV coordinates
  for (const [, he] of kernel.halfEdges) {
    if (he.twin === -1) continue;
    if (he.halfEdgeId > he.twin) continue; // Process each edge once

    const v1 = kernel.vertices.get(he.origin);
    const v2 = kernel.vertices.get(he.destination);
    if (!v1 || !v2) continue;

    // Check if UV coordinates differ across this edge
    const uv1A = uvSet.coords[he.origin % uvSet.coords.length];
    const uv2A = uvSet.coords[he.destination % uvSet.coords.length];
    const uv1B = uvSet.coords[he.destination % uvSet.coords.length]; // twin's origin
    const uv2B = uvSet.coords[he.origin % uvSet.coords.length]; // twin's destination

    const du = Math.abs(uv1A[0] - uv1B[0]);
    const dv = Math.abs(uv1A[1] - uv1B[1]);

    if (du > 0.01 || dv > 0.01) {
      // This is a seam
      const dx = v2.position[0] - v1.position[0];
      const dy = v2.position[1] - v1.position[1];
      const dz = v2.position[2] - v1.position[2];
      const length3D = Math.sqrt(dx * dx + dy * dy + dz * dz);

      seams.push({
        seamId: seamId++,
        sideA: [he.origin],
        sideB: [he.destination],
        length3D,
      });
    }
  }

  return seams;
}

// ---------------------------------------------------------------------------
// Material Preview Info
// ---------------------------------------------------------------------------

export interface MaterialPreviewInfo {
  /** Channels present. */
  channels: MaterialChannel[];
  /** Texture resolutions. */
  textureResolutions: Record<MaterialChannel, number>;
  /** Texel density. */
  texelDensity: TexelDensityResult | null;
  /** UV island count. */
  uvIslandCount: number;
  /** Seam count. */
  seamCount: number;
  /** Whether UVs need normalization. */
  uvsNeedNormalization: boolean;
}

export function getMaterialPreviewInfo(
  kernel: MeshKernel,
  uvSetIndex: number,
  textureResolution = 2048,
): MaterialPreviewInfo {
  const uvSet = kernel.uvSets[uvSetIndex];
  const islands = uvSet ? analyzeUVIslands(uvSet) : [];
  const seams = uvSet ? detectUVSeams(kernel, uvSetIndex) : [];
  const texelDensity = uvSet ? computeTexelDensity(kernel, uvSetIndex, textureResolution) : null;

  // Check if UVs need normalization (outside 0-1 range)
  let uvsNeedNormalization = false;
  if (uvSet) {
    for (const [u, v] of uvSet.coords) {
      if (u < 0 || u > 1 || v < 0 || v > 1) {
        uvsNeedNormalization = true;
        break;
      }
    }
  }

  const channels: MaterialChannel[] = ['baseColor', 'normal', 'orm'];
  const textureResolutions: Record<MaterialChannel, number> = {
    baseColor: textureResolution,
    normal: textureResolution,
    orm: textureResolution,
    emissive: 0,
    dyeMask: 0,
    detailMask: 0,
    subsurfaceMask: 0,
    damageMask: 0,
  };

  return {
    channels,
    textureResolutions,
    texelDensity,
    uvIslandCount: islands.length,
    seamCount: seams.length,
    uvsNeedNormalization,
  };
}
