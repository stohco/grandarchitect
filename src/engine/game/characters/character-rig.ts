/**
 * game/characters/character-rig.ts — the villager body lives.
 *
 * The Blender-built villager (GATE 3) gets a procedural walk here: a bob
 * that follows the step rhythm, a forward lean when moving, a micro-sway
 * of the robe, and a heading that faces the walk. Deterministic — driven
 * by a fixed clock and the movement speed, never Math.random. The robe
 * material can be tinted per character (the villagers wear their roles).
 */

import * as THREE from 'three';

export class CharacterRig {
  /** The world-facing group (position + heading). */
  readonly root: THREE.Group;
  /** The walk group: bob + lean + sway (rides on root). */
  private inner: THREE.Group;
  private robe: THREE.MeshStandardMaterial | null = null;
  private clock = 0;
  private phase = 0;

  constructor(model: THREE.Object3D, robeColor?: THREE.ColorRepresentation) {
    this.root = new THREE.Group();
    this.inner = new THREE.Group();
    this.inner.add(model);
    this.root.add(this.inner);
    model.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (mesh.isMesh) {
        mesh.castShadow = true;
        const m = mesh.material as THREE.MeshStandardMaterial;
        if (m && m.name && m.name.startsWith('villager_robe')) {
          this.robe = m;
          if (robeColor) m.color.set(robeColor);
        }
      }
    });
  }

  /** The robe material (for editor tinting / role colors). */
  get robeMaterial(): THREE.MeshStandardMaterial | null {
    return this.robe;
  }

  /** Advance the walk: bob, lean, robe sway, all from the step rhythm. */
  update(dt: number, speed: number, heading: number): void {
    this.clock += dt;
    const moving = speed > 0.2;
    if (moving) this.phase += dt * 2.4 * Math.min(2, speed);
    this.root.rotation.y = heading;
    const step = Math.sin(this.phase * 2 * Math.PI);
    const bob = moving ? Math.abs(step) * 0.05 * Math.min(1.6, speed) : 0;
    this.inner.position.y = bob;
    this.inner.rotation.x = moving ? 0.05 : 0;
    // the robe breathes with the walk (a micro-sway of the cloth)
    this.inner.rotation.z = moving ? Math.sin(this.phase * 4 * Math.PI) * 0.02 : 0;
  }

  /** A deterministic hash of the walk state (evidence). */
  stateHash(): string {
    return `${this.clock.toFixed(2)}|${this.phase.toFixed(2)}`;
  }
}
