/**
 * game/assets/gltf-assets.ts — GATE 5: the imported stylized assets.
 *
 * The Blender-built GLBs (GATE 3) load here, register as selectable
 * editable components, and submit to the world law-checker. Placement is
 * authored data — each asset has a cause and a spot.
 */

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import type { EditorRegistry, SelectableComponent } from '../editor/types';
import type { PlanetMount } from '../planet/planet-mount';
import type { AssetAnimation } from './asset-animation';

export interface PlacedAssetDef {
  id: string;
  label: string;
  modelUrl: string;
  /** World position. */
  x: number;
  z: number;
  scale?: number;
  /** Yaw (radians, three.js Y-up). */
  ry?: number;
  /** Component kind for the editor + law-checker. */
  kind: string;
  cause: string;
}

/** The authored placements (each asset at its lawful spot). */
export const PLACED_ASSETS: PlacedAssetDef[] = [
  {
    id: 'sacred_pine',
    label: 'The Sacred Pine',
    modelUrl: '/src/engine/game/assets/models/sacred_pine.glb',
    x: 244, z: -130, scale: 1, kind: 'tree',
    cause: 'The wind-bent pine at the shrine — the village was built around the spirit node, and the tree marks the spot they would never cut.',
  },
  {
    id: 'family_shrine',
    label: 'The Family Shrine',
    modelUrl: '/src/engine/game/assets/models/family_shrine.glb',
    x: 248, z: -128, scale: 1, ry: -Math.PI / 2, kind: 'shrine',
    cause: 'The Wang lineage\'s ancestor shrine — incense for the ancestors and the mountain dao, with the sacred pine at its spirit node and its door to the village square.',
  },
];

export class GltfAssetLibrary {
  private static loader = new GLTFLoader();

  /** Load one placed asset, ground it, animate it, register it. */
  static async place(
    def: PlacedAssetDef,
    scene: THREE.Scene,
    planet: PlanetMount,
    registry: EditorRegistry,
    animation?: AssetAnimation,
  ): Promise<SelectableComponent | null> {
    const gltf = await GltfAssetLibrary.loader.loadAsync(def.modelUrl);
    const root = gltf.scene;
    root.name = def.id;
    root.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (mesh.isMesh) {
        mesh.castShadow = true;
        mesh.receiveShadow = true;
      }
    });
    const gy = planet.heightAt(def.x, def.z);
    root.position.set(def.x, gy, def.z);
    if (def.scale) root.scale.setScalar(def.scale);
    if (def.ry) root.rotation.y = def.ry;
    scene.add(root);
    // the asset lives: wind + glow
    if (animation) animation.attach(def.id, root, 0.6);

    // register as an editable component (move/scale + material params)
    const mats: THREE.MeshStandardMaterial[] = [];
    root.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (mesh.isMesh && mesh.material) {
        const m = mesh.material as THREE.MeshStandardMaterial;
        if (!mats.includes(m)) mats.push(m);
      }
    });
    const comp: SelectableComponent = {
      id: def.id,
      type: def.kind,
      label: def.label,
      root,
      bounds: new THREE.Box3().setFromObject(root),
      params: [
        { id: 'posX', label: 'Position X', kind: 'number', min: -1e6, max: 1e6, step: 0.1,
          get: () => root.position.x, set: (v) => { root.position.x = v as number; registry.refreshBounds(def.id); } },
        { id: 'posZ', label: 'Position Z', kind: 'number', min: -1e6, max: 1e6, step: 0.1,
          get: () => root.position.z, set: (v) => { root.position.z = v as number; registry.refreshBounds(def.id); } },
        { id: 'scale', label: 'Scale', kind: 'number', min: 0.3, max: 4, step: 0.05,
          get: () => root.scale.x, set: (v) => { const s = v as number; root.scale.setScalar(s); registry.refreshBounds(def.id); } },
        ...mats.map((m, i) => ({
          id: `glow${i}`, label: `${m.name || 'Material'} Glow`, kind: 'number' as const,
          min: 0, max: 3, step: 0.05,
          get: () => m.emissiveIntensity,
          set: (v) => { m.emissiveIntensity = v as number; },
        })),
        { id: 'wind', label: 'Wind', kind: 'number', min: 0, max: 3, step: 0.05,
          get: () => animation?.getWind(def.id) ?? 0,
          set: (v) => { animation?.setWind(def.id, v as number); } },
      ],
    };
    registry.register(comp);
    return comp;
  }
}
