/**
 * game/player-mount.ts — the frontier CharacterController in the game.
 *
 * The controller (frontier/character-controller.ts) is a deterministic
 * capsule walking the BVH of the SAME terrain mesh the renderer draws —
 * render and movement can never disagree. This module maps keyboard input
 * to ControllerInput and the controller state to the three.js camera/body.
 */

import * as THREE from 'three';
import { CharacterController, type ControllerInput } from '../frontier/character-controller';
import { BVH } from '../frontier/bvh';
import type { MeshData, Vec3 } from '../frontier/types';
import { CharacterRig } from './characters/character-rig';

/** Deterministic keyboard → ControllerInput (no Math.random anywhere). */
export class GameInput {
  private keys = new Set<string>();

  constructor(target: Window) {
    target.addEventListener('keydown', (e) => this.keys.add(e.code));
    target.addEventListener('keyup', (e) => this.keys.delete(e.code));
    target.addEventListener('blur', () => this.keys.clear());
  }

  /** Build the controller input for this frame. */
  read(dt: number, walkSpeed: number, jumpStrength: number): ControllerInput {
    let ix = 0;
    let iz = 0;
    if (this.keys.has('KeyW') || this.keys.has('ArrowUp')) iz -= 1;
    if (this.keys.has('KeyS') || this.keys.has('ArrowDown')) iz += 1;
    if (this.keys.has('KeyA') || this.keys.has('ArrowLeft')) ix -= 1;
    if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) ix += 1;
    const len = Math.hypot(ix, iz) || 1;
    return {
      moveX: ix / len,
      moveZ: iz / len,
      moveSpeed: (ix !== 0 || iz !== 0) ? walkSpeed : 0,
      jump: this.keys.has('Space'),
      jumpStrength,
    };
  }
}

/** The in-game body: frontier controller + three.js representation. */
export class GamePlayer {
  controller: CharacterController;
  readonly body: THREE.Group;
  rig: CharacterRig | null = null;
  private cameraTarget = new THREE.Vector3();
  private lastHeading = 0;
  /** Terrain height lookup (the rig anchors its feet to the ground). */
  heightAt: (x: number, z: number) => number = () => 0;

  constructor(mesh: MeshData, spawn: Vec3) {
    this.controller = new CharacterController({ mesh, spawn });
    this.body = new THREE.Group();
    // the capsule is the placeholder until the Blender-built villager
    // (character-rig) arrives — the controller rests the capsule up to a
    // probe-depth above the surface, so the body sits 0.5 m low
    const capsule = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.35, 0.7, 4, 8),
      new THREE.MeshStandardMaterial({ color: 0xf2f2f2, roughness: 0.75 }),
    );
    capsule.position.y = -0.65;
    capsule.castShadow = true;
    this.body.add(capsule);
  }

  /** Swap the placeholder capsule for the authored villager model. */
  setModel(model: THREE.Object3D): void {
    this.body.clear();
    this.rig = new CharacterRig(model);
    this.body.add(this.rig.root);
  }

  /**
   * Rebuild the controller over a NEW mesh (streaming: the resident chunk
   * set changed) while preserving position/velocity — the player does not
   * teleport when a chunk streams in.
   */
  rebuild(mesh: MeshData): void {
    const pos = { ...this.controller.position };
    const vel = { ...this.controller.velocity };
    const grounded = this.controller.grounded;
    this.controller = new CharacterController({ mesh, spawn: pos });
    this.controller.position = pos;
    this.controller.velocity = vel;
    this.controller.grounded = grounded;
  }

  /** Advance the deterministic controller and sync the three.js body. */
  update(dt: number, input: ControllerInput): void {
    this.controller.update(dt, input);
    const p = this.controller.position;
    this.body.position.set(p.x, p.y, p.z);
    this.cameraTarget.set(p.x, p.y + 1.6, p.z);
    if (this.rig) {
      // the walk faces the movement (smoothly); the rig's feet anchor to
      // the terrain — the controller rests its capsule ~1.2 m high by
      // design, so the authored model rides the GROUND, not the capsule
      const ground = this.heightAt(p.x, p.z);
      this.rig.root.position.y = ground - p.y + 0.05;
      const vx = this.controller.velocity.x;
      const vz = this.controller.velocity.z;
      const speed = Math.hypot(vx, vz);
      if (speed > 0.5) this.lastHeading = Math.atan2(vx, vz);
      this.rig.update(dt, speed, this.lastHeading);
    }
  }

  /** Where the over-the-shoulder camera should look. */
  get lookTarget(): THREE.Vector3 {
    return this.cameraTarget;
  }
}
