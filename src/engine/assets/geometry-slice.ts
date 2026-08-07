/**
 * Geometry Slicing — per-semantic-part geometry extraction
 * ==========================================================
 *
 * Both the LOD deriver and the GLB exporter need the geometry of ONE
 * semantic part: a compact vertex/index set remapped from the asset's
 * global buffers. Slicing is deterministic (fixed triangle order, stable
 * remap order — first-seen vertex order).
 */

import type { SemanticAsset } from './semantic-asset';

export interface PartSlice {
  partId: string;
  positions: Float32Array<ArrayBuffer>;
  normals: Float32Array<ArrayBuffer> | null;
  uvs: Float32Array<ArrayBuffer> | null;
  indices: Uint32Array<ArrayBuffer>;
  /** Global vertex indices of this part (local i → global g). */
  vertexRemap: Map<number, number>;
}

/**
 * Extract one part's geometry as a compact, remapped slice.
 */
export function slicePartGeometry(asset: SemanticAsset, partId: string): PartSlice {
  const part = asset.semanticParts.parts.find((p) => p.partId === partId);
  if (!part) throw new Error(`Unknown semantic part: ${partId}`);
  const geo = asset.geometry;
  const globalToLocal = new Map<number, number>();
  const localToGlobal = new Map<number, number>();
  const remap: number[] = [];

  for (let t = 0; t < part.triangleIndices.length; t++) {
    const tri = part.triangleIndices[t]!;
    for (let c = 0; c < 3; c++) {
      const g = geo.indices[tri * 3 + c]!;
      let l = globalToLocal.get(g);
      if (l === undefined) {
        l = globalToLocal.size;
        globalToLocal.set(g, l);
        localToGlobal.set(l, g);
      }
      remap.push(l);
    }
  }

  const vertexCount = globalToLocal.size;
  const positions = new Float32Array(vertexCount * 3);
  const normals = geo.normals ? new Float32Array(vertexCount * 3) : null;
  const uvs = geo.uvs ? new Float32Array(vertexCount * 2) : null;
  for (const [l, g] of localToGlobal) {
    positions[l * 3] = geo.positions[g * 3]!;
    positions[l * 3 + 1] = geo.positions[g * 3 + 1]!;
    positions[l * 3 + 2] = geo.positions[g * 3 + 2]!;
    if (normals && geo.normals) {
      normals[l * 3] = geo.normals[g * 3]!;
      normals[l * 3 + 1] = geo.normals[g * 3 + 1]!;
      normals[l * 3 + 2] = geo.normals[g * 3 + 2]!;
    }
    if (uvs && geo.uvs) {
      uvs[l * 2] = geo.uvs[g * 2]!;
      uvs[l * 2 + 1] = geo.uvs[g * 2 + 1]!;
    }
  }

  return {
    partId,
    positions,
    normals,
    uvs,
    indices: new Uint32Array(remap),
    vertexRemap: localToGlobal,
  };
}
