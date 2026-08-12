/**
 * game/editor/fly-camera.ts — the god's-eye flight camera.
 *
 * In edit mode you FLY: WASD moves, mouse-drag looks, Q/E descend/ascend,
 * Shift sprints, wheel speeds up. No gravity, no collision — the editor's
 * eye is outside the physics. There is also a programmatic flyTo for the
 * architect's own inspections (evidence harnesses and I use it to check
 * the world from anywhere).
 */

import * as THREE from 'three';

export class FlyCamera {
  private yaw = 0;
  private pitch = -0.3;
  private speed = 24;
  private keys = new Set<string>();
  private dom: HTMLElement;
  private dragging = false;
  private lastX = 0;
  private lastY = 0;

  constructor(camera: THREE.PerspectiveCamera, dom: HTMLElement) {
    this.camera = camera;
    this.dom = dom;

    window.addEventListener('keydown', (e) => {
      if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') return;
      this.keys.add(e.code);
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
    window.addEventListener('blur', () => this.keys.clear());
    dom.addEventListener('mousedown', (e) => {
      if (e.button === 0) { this.dragging = true; this.lastX = e.clientX; this.lastY = e.clientY; }
    });
    window.addEventListener('mouseup', () => { this.dragging = false; });
    window.addEventListener('mousemove', (e) => {
      if (!this.dragging) return;
      this.yaw -= (e.clientX - this.lastX) * 0.004;
      this.pitch = Math.max(-1.5, Math.min(1.5, this.pitch + (e.clientY - this.lastY) * 0.003));
      this.lastX = e.clientX; this.lastY = e.clientY;
    });
  }

  camera: THREE.PerspectiveCamera;

  /** Enable/disable the fly camera (edit mode). */
  setEnabled(on: boolean): void {
    this.enabled = on;
  }
  enabled = false;

  /** Advance the flight. */
  update(dt: number): void {
    if (!this.enabled) return;
    const dir = new THREE.Vector3();
    this.camera.getWorldDirection(dir);
    const right = new THREE.Vector3().crossVectors(dir, this.camera.up).normalize();
    const up = this.camera.up;

    const k = this.keys;
    let mx = 0, my = 0, mz = 0;
    if (k.has('KeyW') || k.has('ArrowUp')) mz += 1;
    if (k.has('KeyS') || k.has('ArrowDown')) mz -= 1;
    if (k.has('KeyA') || k.has('ArrowLeft')) mx -= 1;
    if (k.has('KeyD') || k.has('ArrowRight')) mx += 1;
    if (k.has('KeyE') || k.has('Space')) my += 1;
    if (k.has('KeyQ') || k.has('ControlLeft')) my -= 1;
    if (mx === 0 && my === 0 && mz === 0) return;

    const speed = this.speed * (k.has('ShiftLeft') || k.has('ShiftRight') ? 4 : 1);
    const move = new THREE.Vector3()
      .addScaledVector(right, mx)
      .addScaledVector(up, my)
      .addScaledVector(dir, mz)
      .normalize()
      .multiplyScalar(speed * dt);
    this.camera.position.add(move);
    this.camera.lookAt(this.camera.position.clone().addScaledVector(dir, 10));
  }

  /** Wheel: adjust flight speed. */
  wheel(deltaY: number): void {
    this.speed = Math.max(4, Math.min(600, this.speed * (deltaY > 0 ? 1.15 : 0.87)));
  }

  /** Programmatic teleport (the architect's eye — evidence + inspections). */
  flyTo(x: number, y: number, z: number, lookX: number, lookY: number, lookZ: number): void {
    this.camera.position.set(x, y, z);
    this.camera.lookAt(lookX, lookY, lookZ);
    const dir = new THREE.Vector3(lookX - x, lookY - y, lookZ - z);
    this.yaw = Math.atan2(dir.x, dir.z);
    this.pitch = Math.asin(Math.max(-1, Math.min(1, dir.y / (dir.length() || 1))));
  }
}
