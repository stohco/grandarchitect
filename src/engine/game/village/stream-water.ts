/**
 * game/village/stream-water.ts — the streams' water.
 *
 * Each river's water level is LOCAL: it fills its carved channel up to
 * ~1.2 m of depth at the deepest point, so a stream reads as a stream
 * (water near the bank tops) instead of a canyon trench with a far-away
 * blue sliver at the bottom. The old design pinned every river at the
 * global sea level — the village stream's water sat 8.75 m below the
 * valley floor, invisible from the banks, and players walked off the
 * bank through a terrain-colored "floor" into the channel.
 */

import * as THREE from 'three';
import { RIVERS } from '../planet/world-authoring';
import type { PlanetHeightField } from '../planet/height-field';

/** Water depth at the deepest point of each carved channel. */
export const WATER_DEPTH = 1.2;

/**
 * The water level of one river: the LOWEST carved bed along its course
 * plus the water depth. A river's surface sits at its lowest crossing —
 * upstream it is buried in the channel walls (invisible), and at the
 * lowest point it reads ~1.2 m deep. The mean would be pulled up by
 * high headwaters and float the water above the village banks.
 */
export function waterLevelFor(field: PlanetHeightField, river: { id: string; points: [number, number][]; depth: number }): number {
  let min = Infinity;
  for (const [x, z] of river.points) min = Math.min(min, field.evaluate(x, z).height);
  return min + WATER_DEPTH;
}

/** Build water ribbons for every authored river (each at its own level). */
export function buildRiverWater(scene: THREE.Scene, field: PlanetHeightField): THREE.Mesh[] {
  const meshes: THREE.Mesh[] = [];
  for (const river of RIVERS) {
    const pts = river.points;
    const positions: number[] = [];
    const indices: number[] = [];
    const w = river.width * 0.5 + 0.4; // slightly proud of the cut walls
    const waterY = waterLevelFor(field, river);
    for (let i = 0; i < pts.length; i++) {
      const p0 = pts[Math.max(0, i - 1)];
      const p1 = pts[Math.min(pts.length - 1, i + 1)];
      let tx = p1[0] - p0[0], tz = p1[1] - p0[1];
      const tl = Math.hypot(tx, tz) || 1;
      tx /= tl; tz /= tl;
      const lx = -tz, lz = tx;
      positions.push(pts[i][0] - lx * w, waterY, pts[i][1] - lz * w);
      positions.push(pts[i][0] + lx * w, waterY, pts[i][1] + lz * w);
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
      color: 0x2a6a88, transparent: true, opacity: 0.9,
      roughness: 0.2, metalness: 0.05,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.name = `water_${river.id}`;
    mesh.frustumCulled = false;
    scene.add(mesh);
    meshes.push(mesh);
  }
  return meshes;
}
