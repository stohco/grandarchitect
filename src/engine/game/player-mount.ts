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
  readonly controller: CharacterController;
  readonly body: THREE.Group;
  private cameraTarget = new THREE.Vector3();

  constructor(mesh: MeshData, spawn: Vec3) {
    this.controller = new CharacterController({ mesh, spawn });
    this.body = new THREE.Group();
    // a simple capsule body so the player is visible in the world
    const capsule = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.35, 0.7, 4, 8),
      new THREE.MeshStandardMaterial({ color: 0xf2f2f2, roughness: 0.75 }),
    );
    capsule.castShadow = true;
    this.body.add(capsule);
  }

  /** Advance the deterministic controller and sync the three.js body. */
  update(dt: number, input: ControllerInput): void {
    this.controller.update(dt, input);
    const p = this.controller.position;
    this.body.position.set(p.x, p.y, p.z);
    this.cameraTarget.set(p.x, p.y + 1.6, p.z);
  }

  /** Where the over-the-shoulder camera should look. */
  get lookTarget(): THREE.Vector3 {
    return this.cameraTarget;
  }
}
