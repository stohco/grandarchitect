/**
 * game/planet/merge-meshes.ts — merge the resident chunk meshes into one
 * collision MeshData for the frontier CharacterController (BVH over the
 * SAME meshes the renderer draws — render and collision cannot disagree).
 */

import type { MeshData } from '../../frontier/types';
import type { PlanetMount } from './planet-mount';
import type * as THREE from 'three';

/** Merge all resident chunk geometries into a single MeshData. */
export function mergeChunkMeshes(chunks: Map<string, THREE.Mesh>, planet: PlanetMount): MeshData {
  const positions: number[] = [];
  const normals: number[] = [];
  const indices: number[] = [];
  let base = 0;

  for (const mesh of chunks.values()) {
    const geo = mesh.geometry;
    const pos = geo.attributes.position;
    const nor = geo.attributes.normal;
    const idx = geo.index;
    if (!pos || !idx) continue;

    const vertexCount = pos.count;
    const ox = mesh.position.x, oz = mesh.position.z;
    for (let i = 0; i < vertexCount; i++) {
      positions.push(pos.getX(i) + ox, pos.getY(i), pos.getZ(i) + oz);
      normals.push(nor.getX(i), nor.getY(i), nor.getZ(i));
    }
    for (let i = 0; i < idx.count; i++) {
      indices.push(idx.getX(i) + base);
    }
    base += vertexCount;
  }

  return {
    positions: Float32Array.from(positions),
    normals: Float32Array.from(normals),
    indices: Uint32Array.from(indices),
  };
}
