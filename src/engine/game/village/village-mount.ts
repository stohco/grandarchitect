/**
 * game/village/village-mount.ts — the village in the world.
 *
 * Mounts the authored village into the planet: houses, well, shrine, gate,
 * terrain-following painted ground (square, cart road, fields, graveyard).
 * Everything grounds itself at its own terrain height — nothing floats,
 * nothing clips.
 */

import * as THREE from 'three';
import type { PlanetMount } from '../planet/planet-mount';
import { villageCenter, HOUSES, FEATURES, GROUND_STRIPS, type HouseNode } from './village-authoring';
import { buildHouse, buildVillageMaterials } from './house-kit';

export interface VillageMount {
  group: THREE.Group;
  houses: Map<string, THREE.Group>;
  materials: ReturnType<typeof buildVillageMaterials>;
  /** Painted ground meshes (for evidence). */
  grounds: THREE.Mesh[];
}

/** Mount the village; returns a handle for updates/evidence. */
export function mountVillage(planet: PlanetMount, scene: THREE.Scene): VillageMount {
  const center = villageCenter();
  const materials = buildVillageMaterials();
  const group = new THREE.Group();
  group.name = 'wang_village';
  scene.add(group);

  const houses = new Map<string, THREE.Group>();
  for (const house of HOUSES) {
    const g = buildHouse(house, center.x, center.z, { field: planet.field, materials });
    group.add(g);
    houses.set(house.id, g);
  }

  // fixed features: well (stone ring + water), shrine, gate
  const well = new THREE.Group();
  const wellRing = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 1.0, 1.1, 10), materials.stone);
  wellRing.castShadow = wellRing.receiveShadow = true;
  well.add(wellRing);
  const wellWater = new THREE.Mesh(
    new THREE.CircleGeometry(0.72, 10),
    new THREE.MeshStandardMaterial({ color: 0x2a5a70, roughness: 0.2 }),
  );
  wellWater.rotation.x = -Math.PI / 2;
  wellWater.position.y = 0.75;
  well.add(wellWater);
  const fWell = FEATURES.find((f) => f.id === 'well')!;
  well.position.set(center.x + fWell.dx, planet.field.evaluate(center.x + fWell.dx, center.z + fWell.dz).height, center.z + fWell.dz);
  group.add(well);

  const shrine = new THREE.Group();
  const shrineBase = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.4, 1.2), materials.stone);
  shrineBase.castShadow = shrineBase.receiveShadow = true;
  shrine.add(shrineBase);
  const shrinePillar = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 2.0, 8), materials.timber);
  shrinePillar.position.y = 1.2;
  shrinePillar.castShadow = true;
  shrine.add(shrinePillar);
  const shrineRoof = new THREE.Mesh(new THREE.ConeGeometry(0.9, 0.7, 8), materials.slate);
  shrineRoof.position.y = 2.4;
  shrineRoof.castShadow = true;
  shrine.add(shrineRoof);
  const fShrine = FEATURES.find((f) => f.id === 'shrine')!;
  shrine.position.set(center.x + fShrine.dx, planet.field.evaluate(center.x + fShrine.dx, center.z + fShrine.dz).height, center.z + fShrine.dz);
  group.add(shrine);

  const gate = new THREE.Group();
  for (const sx of [-3, 3] as const) {
    const p = new THREE.Mesh(new THREE.BoxGeometry(0.5, 4.5, 0.5), materials.timber);
    p.position.set(sx, 2.25, 0);
    p.castShadow = true;
    gate.add(p);
  }
  const lintel = new THREE.Mesh(new THREE.BoxGeometry(7, 0.5, 0.6), materials.timber);
  lintel.position.set(0, 4.6, 0);
  lintel.castShadow = true;
  gate.add(lintel);
  const fGate = FEATURES.find((f) => f.id === 'gate')!;
  gate.position.set(center.x + fGate.dx, planet.field.evaluate(center.x + fGate.dx, center.z + fGate.dz).height, center.z + fGate.dz);
  group.add(gate);

  // painted ground: terrain-following strips (1 m cells — a coarse plane
  // BRIDGES the stream channel and reads as a slab over the valley; fine
  // cells follow the V-cut and the swells like real ground)
  const grounds: THREE.Mesh[] = [];
  for (const strip of GROUND_STRIPS) {
    const sub = Math.max(1, Math.round(Math.max(strip.w, strip.d)));
    const geo = new THREE.PlaneGeometry(strip.w, strip.d, sub, sub);
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const wx = center.x + strip.dx + pos.getX(i);
      const wz = center.z + strip.dz + pos.getZ(i);
      pos.setY(i, planet.field.evaluate(wx, wz).height + 0.06);
    }
    pos.needsUpdate = true;
    geo.computeVertexNormals();
    const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: strip.color, roughness: 1 }));
    mesh.rotation.x = -Math.PI / 2;
    mesh.receiveShadow = true;
    group.add(mesh);
    grounds.push(mesh);
  }

  return { group, houses, materials, grounds };
}
