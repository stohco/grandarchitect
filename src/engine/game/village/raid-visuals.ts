/**
 * game/village/raid-visuals.ts — the wolves at the fence, made visible.
 *
 * When the raid fires (the belief system already knows), three grey wolves
 * appear at the east fence line — authored spots, deterministic. They pace
 * the fence; at dawn they slip away. Pure visuals for now; combat meets
 * them in a later phase.
 */

import * as THREE from 'three';
import type { PlanetHeightField } from '../planet/height-field';
import { villageCenter } from './village-authoring';

/** Authored fence-line den spots (east ring, clear of houses). */
const RAID_SPOTS: Array<[number, number]> = [
  [288, -96], [294, -112], [287, -130],
];

export class RaidVisuals {
  private wolves: THREE.Group[] = [];
  private field: PlanetHeightField;
  private active = false;
  private time = 0;

  constructor(scene: THREE.Scene, field: PlanetHeightField) {
    this.field = field;
    for (const [x, z] of RAID_SPOTS) {
      const w = this.buildWolf();
      const gy = field.evaluate(x, z).height;
      w.position.set(x, gy, z);
      w.visible = false;
      scene.add(w);
      this.wolves.push(w);
    }
  }

  private buildWolf(): THREE.Group {
    const g = new THREE.Group();
    const grey = new THREE.MeshStandardMaterial({ color: 0x6a6a70, roughness: 0.9 });
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.45, 0.35), grey);
    body.position.y = 0.45;
    body.castShadow = true;
    g.add(body);
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.28, 0.24), grey);
    head.position.set(0.55, 0.62, 0);
    head.castShadow = true;
    g.add(head);
    const tail = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.34, 0.08), grey);
    tail.position.set(-0.5, 0.6, 0);
    tail.rotation.x = 0.6;
    g.add(tail);
    for (const lx of [-0.3, 0.25] as const) {
      for (const lz of [-0.16, 0.16] as const) {
        const leg = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.3, 0.09), grey);
        leg.position.set(lx, 0.15, lz);
        g.add(leg);
      }
    }
    return g;
  }

  /** Show the wolves at the fence. */
  trigger(): void {
    this.active = true;
    for (const w of this.wolves) w.visible = true;
  }

  /** End the raid: the wolves slip away at dawn. */
  end(): void {
    this.active = false;
    for (const w of this.wolves) w.visible = false;
  }

  get isActive(): boolean {
    return this.active;
  }

  /** Pace the fence line (deterministic small oscillation). */
  update(dt: number): void {
    if (!this.active) return;
    this.time += dt;
    for (let i = 0; i < this.wolves.length; i++) {
      const w = this.wolves[i];
      const [x, z] = RAID_SPOTS[i];
      const phase = this.time * 0.7 + i * 1.3;
      const nx = x + Math.sin(phase) * 2.5;
      const nz = z + Math.cos(phase * 0.8) * 1.2;
      const gy = this.field.evaluate(nx, nz).height;
      w.position.set(nx, gy, nz);
      w.rotation.y = Math.atan2(x - nx, z - nz);
    }
  }
}
