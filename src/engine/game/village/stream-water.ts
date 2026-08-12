/**
 * game/village/stream-water.ts — the stream's water.
 *
 * The village stream is carved below sea level; without water the channel
 * shows its green floor and reads as "a green sheet covering the stream."
 * This ribbons actual water along the authored course at the water level —
 * blue, slightly transparent, world-aligned, deterministic.
 */

import * as THREE from 'three';
import { RIVERS } from '../planet/world-authoring';
import { SEA_LEVEL } from '../planet/world-authoring';

export const WATER_Y = SEA_LEVEL + 0.1;

/** Build water ribbons for every authored river. */
export function buildRiverWater(scene: THREE.Scene): THREE.Mesh[] {
  const meshes: THREE.Mesh[] = [];
  for (const river of RIVERS) {
    const pts = river.points;
    const positions: number[] = [];
    const indices: number[] = [];
    const w = river.width * 0.5 + 0.4; // slightly proud of the cut walls
    for (let i = 0; i < pts.length; i++) {
      const p0 = pts[Math.max(0, i - 1)];
      const p1 = pts[Math.min(pts.length - 1, i + 1)];
      let tx = p1[0] - p0[0], tz = p1[1] - p0[1];
      const tl = Math.hypot(tx, tz) || 1;
      tx /= tl; tz /= tl;
      const lx = -tz, lz = tx;
      positions.push(pts[i][0] - lx * w, WATER_Y, pts[i][1] - lz * w);
      positions.push(pts[i][0] + lx * w, WATER_Y, pts[i][1] + lz * w);
      if (i < pts.length - 1) {
        const a = i * 2, b = i * 2 + 1, c = (i + 1) * 2, d = (i + 1) * 2 + 1;
        indices.push(a, c, b, b, c, d);
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setIndex(indices);
    geo.computeVertexNormals();
    const mat = new THREE.MeshStandardMaterial({
      color: 0x2a5a70, transparent: true, opacity: 0.95,
      roughness: 0.4, metalness: 0.05,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.name = `water_${river.id}`;
    mesh.frustumCulled = false;
    scene.add(mesh);
    meshes.push(mesh);
  }
  return meshes;
}
