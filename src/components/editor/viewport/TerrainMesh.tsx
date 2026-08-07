/**
 * Live Architect Studio — Terrain Mesh
 *
 * Renders the frontier terrain pipeline's surface mesh (marching cubes over
 * the deterministic density field) inside the viewport Canvas. Mounted
 * additively next to the ground plane — it does not touch structure meshes,
 * the playtest HUD, or the canonical action wiring.
 *
 * The mesh and the playtest collision derive from the IDENTICAL pipeline:
 * both use `terrainSeedFromSettlementSeed(seed)` and the same
 * TerrainPipeline defaults, so the rendered surface and the Rapier
 * heightfield agree by construction (see terrain-conformance-test.ts,
 * section 4: maxDiff = 0).
 *
 * Material regions: base earth / mountain rock / darker tunnel interior,
 * painted as per-vertex colors (one indexed mesh, one draw call).
 */

'use client';

import { useMemo, useEffect } from 'react';
import * as THREE from 'three';
import {
  TerrainPipeline,
  terrainSeedFromSettlementSeed,
  SURFACE_MATERIAL_EARTH,
  SURFACE_MATERIAL_MOUNTAIN,
  SURFACE_MATERIAL_TUNNEL,
} from '@/engine/frontier/terrain-plugin';

/** Painterly earthy xianxia palette per region. */
const MATERIAL_COLORS: Record<number, [number, number, number]> = {
  [SURFACE_MATERIAL_EARTH]: [0.55, 0.48, 0.33],      // loess plain
  [SURFACE_MATERIAL_MOUNTAIN]: [0.43, 0.40, 0.33],   // grey-brown rock
  [SURFACE_MATERIAL_TUNNEL]: [0.25, 0.22, 0.17],     // dark cave interior
};

export function TerrainMesh({ seed }: { seed: string | null }) {
  const geometry = useMemo(() => {
    if (!seed) return null;
    const terrainSeed = terrainSeedFromSettlementSeed(seed);
    const pipeline = new TerrainPipeline({ seed: terrainSeed });
    pipeline.generate();
    // Full grid resolution — same lattice as the collision heightmap.
    const mesh = pipeline.getSurfaceMesh();

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(mesh.positions, 3));
    geo.setAttribute('normal', new THREE.BufferAttribute(mesh.normals, 3));

    const colors = new Float32Array(mesh.vertexCount * 3);
    for (let v = 0; v < mesh.vertexCount; v++) {
      const c = MATERIAL_COLORS[mesh.materialIds[v]] ?? MATERIAL_COLORS[SURFACE_MATERIAL_EARTH];
      colors[v * 3] = c[0];
      colors[v * 3 + 1] = c[1];
      colors[v * 3 + 2] = c[2];
    }
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.setIndex(new THREE.BufferAttribute(mesh.indices, 1));

    return geo;
  }, [seed]);

  useEffect(() => {
    return () => {
      geometry?.dispose();
    };
  }, [geometry]);

  if (!geometry) return null;

  return (
    <mesh geometry={geometry} position={[0, 0, 0]} receiveShadow>
      <meshStandardMaterial vertexColors roughness={0.95} metalness={0} />
    </mesh>
  );
}
