/**
 * game/village/house-kit.ts — the mortal house, per the art bible.
 *
 * Stucco plaster walls (#dedad3) with a dark timber post-and-lintel frame
 * (#7a6652), slate tile roof (#4a5565) with upturned eave corners, stone
 * plinth, timber double door, windows flanking the door (dark panes that
 * glow lantern-warm at night), and a red lantern by the door.
 *
 * Deterministic: identical inputs → identical geometry. Houses ground
 * themselves at the MAX terrain height under their footprint (the high side
 * buries into the dirt — stone in dirt reads natural; the low side never
 * floats).
 */

import * as THREE from 'three';
import type { PlanetHeightField } from '../planet/height-field';
import type { HouseNode } from './village-authoring';

export interface HouseKitOptions {
  field: PlanetHeightField;
  /** Shared materials (one set for all houses — the village's palette). */
  materials: VillageMaterials;
}

export interface VillageMaterials {
  stucco: THREE.MeshStandardMaterial;
  timber: THREE.MeshStandardMaterial;
  slate: THREE.MeshStandardMaterial;
  stone: THREE.MeshStandardMaterial;
  lantern: THREE.MeshStandardMaterial;
  window: THREE.MeshStandardMaterial;
}

/** Build the village's shared material palette (art bible colors). */
export function buildVillageMaterials(): VillageMaterials {
  return {
    stucco: new THREE.MeshStandardMaterial({ color: 0xdedad3, roughness: 0.92 }),
    timber: new THREE.MeshStandardMaterial({ color: 0x7a6652, roughness: 0.88 }),
    slate: new THREE.MeshStandardMaterial({ color: 0x4a5565, roughness: 0.95 }),
    stone: new THREE.MeshStandardMaterial({ color: 0x8d8982, roughness: 0.95 }),
    lantern: new THREE.MeshStandardMaterial({ color: 0x8c1a1a, emissive: 0xffa050, emissiveIntensity: 0.6 }),
    window: new THREE.MeshStandardMaterial({ color: 0x241a12, roughness: 0.4, emissive: 0xffb060, emissiveIntensity: 0 }),
  };
}

/** Build one house at its authored village offset. Returns the group. */
export function buildHouse(
  house: HouseNode,
  centerX: number,
  centerZ: number,
  opts: HouseKitOptions,
): THREE.Group {
  const group = new THREE.Group();
  group.name = house.id;

  const mk = (geo: THREE.BufferGeometry, mat: THREE.Material, px: number, py: number, pz: number, name = ''): THREE.Mesh => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(px, py, pz);
    m.name = name;
    m.castShadow = true;
    m.receiveShadow = true;
    group.add(m);
    return m;
  };

  const s = house.scale;
  // ---- stone foundation ----
  mk(new THREE.BoxGeometry(7.4 * s, 0.6 * s, 6.4 * s), opts.materials.stone, 0, 0.3 * s, 0, 'foundation');
  // ---- stucco walls (door gap south) ----
  mk(new THREE.BoxGeometry(7 * s, 3 * s, 0.4 * s), opts.materials.stucco, 0, 2.1 * s, -2.8 * s, 'wall');
  mk(new THREE.BoxGeometry(7 * s, 3 * s, 0.4 * s), opts.materials.stucco, 0, 2.1 * s, 2.8 * s, 'wall');
  mk(new THREE.BoxGeometry(0.4 * s, 3 * s, 5.6 * s), opts.materials.stucco, -3.3 * s, 2.1 * s, 0, 'wall');
  mk(new THREE.BoxGeometry(0.4 * s, 3 * s, 5.6 * s), opts.materials.stucco, 3.3 * s, 2.1 * s, 0, 'wall');
  mk(new THREE.BoxGeometry(2.2 * s, 3 * s, 0.4 * s), opts.materials.stucco, 1.4 * s, 2.1 * s, -2.8 * s, 'wall');
  mk(new THREE.BoxGeometry(1.6 * s, 3 * s, 0.4 * s), opts.materials.stucco, -2.6 * s, 2.1 * s, -2.8 * s, 'wall');
  // ---- timber corner posts ----
  for (const [px, pz] of [[-3.4, -2.9], [3.4, -2.9], [-3.4, 2.9], [3.4, 2.9]] as const) {
    mk(new THREE.BoxGeometry(0.3 * s, 3.6 * s, 0.3 * s), opts.materials.timber, px * s, 1.8 * s, pz * s, 'post');
  }
  // ---- post-and-lintel: beams cap every wall ----
  for (const [px, pz] of [[0, -2.8], [0, 2.8], [-3.3, 0], [3.3, 0]] as const) {
    mk(
      new THREE.BoxGeometry((px === 0 ? 7.1 : 0.28) * s, 0.24 * s, (px === 0 ? 0.34 : 5.9) * s),
      opts.materials.timber, px * s, 3.42 * s, pz * s, 'lintel',
    );
  }
  // ---- door frame + double door ----
  mk(new THREE.BoxGeometry(0.22 * s, 2.6 * s, 0.3 * s), opts.materials.timber, 0, 1.3 * s, -2.95 * s, 'frame');
  mk(new THREE.BoxGeometry(0.9 * s, 2.3 * s, 0.1 * s), opts.materials.timber, -0.5 * s, 1.15 * s, -2.98 * s, 'door');
  mk(new THREE.BoxGeometry(0.9 * s, 2.3 * s, 0.1 * s), opts.materials.timber, 0.5 * s, 1.15 * s, -2.98 * s, 'door');
  mk(new THREE.BoxGeometry(1.6 * s, 0.16 * s, 0.34 * s), opts.materials.timber, 0, 2.6 * s, -2.95 * s, 'lintel');
  // ---- windows flanking the door ----
  for (const wx of [-2.6, 1.4] as const) {
    mk(new THREE.BoxGeometry(1.1 * s, 1.35 * s, 0.06 * s), opts.materials.window, wx * s, 2.15 * s, -2.99 * s, 'windowPane');
    mk(new THREE.BoxGeometry(0.08 * s, 1.35 * s, 0.08 * s), opts.materials.timber, (wx - 0.58) * s, 2.15 * s, -2.99 * s, 'windowFrame');
    mk(new THREE.BoxGeometry(0.08 * s, 1.35 * s, 0.08 * s), opts.materials.timber, (wx + 0.58) * s, 2.15 * s, -2.99 * s, 'windowFrame');
    mk(new THREE.BoxGeometry(1.24 * s, 0.08 * s, 0.08 * s), opts.materials.timber, wx * s, 1.5 * s, -2.99 * s, 'windowFrame');
    mk(new THREE.BoxGeometry(1.24 * s, 0.08 * s, 0.08 * s), opts.materials.timber, wx * s, 2.8 * s, -2.99 * s, 'windowFrame');
  }
  // ---- pitched slate roof with upturned eaves ----
  const roofW = 8.2 * s, roofD = 6.6 * s, ridgeY = 4.9 * s, eaveY = 3.55 * s;
  const rp: number[] = [];
  const pushSlope = (zSign: number) => {
    const eaveZ = (roofD / 2) * zSign;
    rp.push(-roofW / 2, eaveY, eaveZ, roofW / 2, eaveY, eaveZ, roofW / 2, ridgeY, 0, -roofW / 2, ridgeY, 0);
  };
  pushSlope(1); pushSlope(-1);
  const roofGeo = new THREE.BufferGeometry();
  roofGeo.setAttribute('position', new THREE.Float32BufferAttribute(rp, 3));
  roofGeo.setIndex([0, 1, 2, 0, 2, 3, 4, 5, 6, 4, 6, 7]);
  roofGeo.computeVertexNormals();
  const roof = new THREE.Mesh(roofGeo, opts.materials.slate);
  roof.name = 'roof';
  roof.castShadow = roof.receiveShadow = true;
  group.add(roof);
  for (const [cx2, cz2] of [[-roofW / 2, roofD / 2], [roofW / 2, roofD / 2], [-roofW / 2, -roofD / 2], [roofW / 2, -roofD / 2]] as const) {
    const cap = mk(new THREE.BoxGeometry(0.44 * s, 0.14 * s, 0.44 * s), opts.materials.slate, cx2, eaveY + 0.14 * s, cz2, 'eaveCap');
    cap.rotation.z = (cx2 < 0 ? 1 : -1) * 0.5;
    cap.rotation.x = (cz2 < 0 ? 1 : -1) * 0.35;
  }
  mk(new THREE.BoxGeometry(roofW + 0.3 * s, 0.22 * s, 0.4 * s), opts.materials.timber, 0, ridgeY + 0.1 * s, 0, 'ridge');
  mk(new THREE.SphereGeometry(0.14 * s, 6, 5), opts.materials.lantern, -0.9 * s, 1.9 * s, -3.0 * s, 'lantern');

  // ---- ground at the MAX terrain under the footprint ----
  const x = centerX + house.dx;
  const z = centerZ + house.dz;
  let gy = opts.field.evaluate(x, z).height;
  for (let sx = -3.6 * s; sx <= 3.6 * s; sx += 1.8 * s) {
    for (let sz = -3.2 * s; sz <= 3.2 * s; sz += 1.6 * s) {
      gy = Math.max(gy, opts.field.evaluate(x + sx, z + sz).height);
    }
  }
  group.position.set(x, gy, z);
  group.rotation.y = house.facing;
  return group;
}
