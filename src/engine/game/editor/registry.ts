/**
 * game/editor/registry.ts — registers every authored component as editable.
 *
 * Houses, well, shrine, gate, ground strips, water, villagers, and the
 * terrain chunks all get parameter schemas. The stylized palette (roof,
 * wall, timber, water, lantern) is editable at the village level; every
 * component is movable with gizmos; terrain gets a brush.
 */

import * as THREE from 'three';
import type { EditorRegistry, SelectableComponent } from './types';
import type { VillageMount } from '../village/village-mount';
import type { VillagerHandle } from '../village/villagers';
import { GROUND_STRIPS, HOUSES } from '../village/village-authoring';
import { villageCenter } from '../village/village-authoring';

/** World bounds of an object (respecting parents' world transforms). */
function worldBounds(root: THREE.Object3D): THREE.Box3 {
  const box = new THREE.Box3();
  root.updateWorldMatrix(true, false);
  root.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh) return;
    const g = mesh.geometry as THREE.BufferGeometry;
    if (!g.boundingBox) g.computeBoundingBox();
    box.expandByObject(o);
  });
  return box;
}

export function registerVillageComponents(
  registry: EditorRegistry,
  village: VillageMount,
  center: { x: number; z: number },
): void {
  const mat = village.materials;

  // --- houses: move/rotate/scale + the shared stylized palette ---
  for (const house of HOUSES) {
    const g = village.houses.get(house.id);
    if (!g) continue;
    registry.register({
      id: house.id,
      type: 'house',
      label: `${house.name} (${house.role})`,
      root: g,
      bounds: worldBounds(g),
      onTransform: () => registry.refreshBounds(house.id),
      params: [
        { id: 'posX', label: 'Position X', kind: 'number', min: -100000, max: 100000, step: 0.1,
          get: () => g.position.x, set: (v) => { g.position.x = v as number; registry.refreshBounds(house.id); } },
        { id: 'posZ', label: 'Position Z', kind: 'number', min: -100000, max: 100000, step: 0.1,
          get: () => g.position.z, set: (v) => { g.position.z = v as number; registry.refreshBounds(house.id); } },
        { id: 'facing', label: 'Facing', kind: 'number', min: -Math.PI, max: Math.PI, step: 0.05,
          get: () => g.rotation.y, set: (v) => { g.rotation.y = v as number; registry.refreshBounds(house.id); } },
        { id: 'scale', label: 'Scale', kind: 'number', min: 0.5, max: 2, step: 0.05,
          get: () => g.scale.x, set: (v) => { const s = v as number; g.scale.setScalar(s); registry.refreshBounds(house.id); } },
        { id: 'wallColor', label: 'Stucco Color', kind: 'color',
          get: () => '#' + mat.stucco.color.getHexString(),
          set: (v) => mat.stucco.color.set(v as string) },
        { id: 'roofColor', label: 'Slate Color', kind: 'color',
          get: () => '#' + mat.slate.color.getHexString(),
          set: (v) => mat.slate.color.set(v as string) },
        { id: 'timberColor', label: 'Timber Color', kind: 'color',
          get: () => '#' + mat.timber.color.getHexString(),
          set: (v) => mat.timber.color.set(v as string) },
        { id: 'lanternGlow', label: 'Lantern Glow', kind: 'number', min: 0, max: 2, step: 0.05,
          get: () => mat.lantern.emissiveIntensity,
          set: (v) => { mat.lantern.emissiveIntensity = v as number; } },
      ],
    });
  }

  // --- fixed features: well, shrine, gate ---
  const featureRoots: Record<string, THREE.Object3D | undefined> = {
    well: village.group.children.find((c) => c.type === 'Group' && c.position.distanceTo(new THREE.Vector3(center.x + 1.5, 0, center.z + 1.5)) < 2),
  };
  for (const [id, root] of Object.entries(featureRoots)) {
    if (!root) continue;
    registry.register({
      id, type: id, label: id === 'well' ? 'The Well' : id,
      root,
      bounds: worldBounds(root),
      params: [
        { id: 'posX', label: 'Position X', kind: 'number', min: -100000, max: 100000, step: 0.1,
          get: () => root.position.x, set: (v) => { root.position.x = v as number; registry.refreshBounds(id); } },
        { id: 'posZ', label: 'Position Z', kind: 'number', min: -100000, max: 100000, step: 0.1,
          get: () => root.position.z, set: (v) => { root.position.z = v as number; registry.refreshBounds(id); } },
      ],
    });
  }

  // --- painted ground strips: size + color ---
  for (const strip of GROUND_STRIPS) {
    const mesh = village.grounds.find((m) => m.userData.stripId === strip.id);
    if (!mesh) continue;
    registry.register({
      id: `ground_${strip.id}`,
      type: 'ground',
      label: strip.name,
      root: mesh,
      bounds: worldBounds(mesh),
      params: [
        { id: 'color', label: 'Ground Color', kind: 'color',
          get: () => '#' + (mesh.material as THREE.MeshStandardMaterial).color.getHexString(),
          set: (v) => (mesh.material as THREE.MeshStandardMaterial).color.set(v as string) },
        { id: 'opacity', label: 'Opacity', kind: 'number', min: 0, max: 1, step: 0.05,
          get: () => (mesh.material as THREE.MeshStandardMaterial).opacity,
          set: (v) => { const m = mesh.material as THREE.MeshStandardMaterial; m.opacity = v as number; m.transparent = (v as number) < 1; } },
      ],
    });
  }

  // --- water ribbons: color + opacity ---
  for (const mesh of village.water) {
    const id = mesh.name.replace('water_', '');
    registry.register({
      id: `water_${id}`,
      type: 'water',
      label: `Water: ${id}`,
      root: mesh,
      bounds: worldBounds(mesh),
      params: [
        { id: 'color', label: 'Water Color', kind: 'color',
          get: () => '#' + (mesh.material as THREE.MeshStandardMaterial).color.getHexString(),
          set: (v) => (mesh.material as THREE.MeshStandardMaterial).color.set(v as string) },
        { id: 'opacity', label: 'Water Opacity', kind: 'number', min: 0, max: 1, step: 0.05,
          get: () => (mesh.material as THREE.MeshStandardMaterial).opacity,
          set: (v) => { (mesh.material as THREE.MeshStandardMaterial).opacity = v as number; } },
      ],
    });
  }
}

export function registerVillagerComponents(registry: EditorRegistry, villagers: VillagerHandle[]): void {
  for (const v of villagers) {
    registry.register({
      id: v.id,
      type: 'villager',
      label: `${v.name} (${v.role})`,
      root: v.body,
      bounds: worldBounds(v.body),
      params: [
        { id: 'posX', label: 'Position X', kind: 'number', min: -100000, max: 100000, step: 0.1,
          get: () => v.body.position.x, set: (val) => { v.body.position.x = val as number; registry.refreshBounds(v.id); } },
        { id: 'posZ', label: 'Position Z', kind: 'number', min: -100000, max: 100000, step: 0.1,
          get: () => v.body.position.z, set: (val) => { v.body.position.z = val as number; registry.refreshBounds(v.id); } },
      ],
    });
  }
}
