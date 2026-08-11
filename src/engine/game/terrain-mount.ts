/**
 * game/terrain-mount.ts — the frontier terrain mounted in three.js.
 *
 * THE canonical terrain pipeline (frontier/terrain-plugin.ts) is the only
 * terrain: same density field → marching-cubes mesh for RENDERING, same
 * field → heightmap for COLLISION, identical by construction (the
 * terrain-conformance-test proves maxDiff == 0). This module bridges the
 * engine's MeshData/SurfaceMesh into THREE geometry — nothing else.
 *
 * The game consumes the ENGINE. It does not re-author terrain.
 */

import * as THREE from 'three';
import {
  generateTerrainPipeline,
  extractSurfaceMesh,
  computeHeightmap,
  SURFACE_MATERIAL_EARTH,
  SURFACE_MATERIAL_MOUNTAIN,
  SURFACE_MATERIAL_TUNNEL,
  type TerrainPipelineResult,
  type SurfaceMesh,
} from '../frontier/terrain-plugin';
import type { MeshData } from '../frontier/types';

/** Art-bible palette for the three surface regions (linear working space). */
export const SURFACE_COLORS: Record<number, THREE.Color> = {
  [SURFACE_MATERIAL_EARTH]: new THREE.Color(0x5e6c54),    // moss/grass green
  [SURFACE_MATERIAL_MOUNTAIN]: new THREE.Color(0x6d6a64), // cool grey rock
  [SURFACE_MATERIAL_TUNNEL]: new THREE.Color(0x4a453f),   // deep stone
};

/** Build the world's terrain artifacts from the canonical pipeline. */
export function buildWorldTerrain(seed: number): {
  result: TerrainPipelineResult;
  mesh: SurfaceMesh;
  geometry: THREE.BufferGeometry;
  material: THREE.MeshStandardMaterial;
  meshData: MeshData;
} {
  const result = generateTerrainPipeline(seed);
  const mesh = extractSurfaceMesh(result.field, { spline: result.spline });

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(mesh.positions, 3));
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(mesh.normals, 3));
  geometry.setIndex(new THREE.BufferAttribute(mesh.indices, 1));

  // per-vertex color from the region material id (linear-space colors)
  const colors = new Float32Array(mesh.vertexCount * 3);
  for (let i = 0; i < mesh.vertexCount; i++) {
    const c = SURFACE_COLORS[mesh.materialIds[i]] ?? SURFACE_COLORS[SURFACE_MATERIAL_EARTH];
    colors[i * 3] = c.r;
    colors[i * 3 + 1] = c.g;
    colors[i * 3 + 2] = c.b;
  }
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geometry.computeBoundingSphere();

  const material = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.92,
    metalness: 0.02,
    flatShading: true,
  });

  return {
    result,
    mesh,
    geometry,
    material,
    meshData: {
      positions: mesh.positions,
      indices: mesh.indices,
      normals: mesh.normals,
    },
  };
}

/** Collision heightfield from the SAME density field (agrees with the mesh). */
export function buildHeightfield(seed: number): Float32Array {
  const result = generateTerrainPipeline(seed);
  const hm = computeHeightmap(result.field, result.spline);
  return hm.heights;
}
