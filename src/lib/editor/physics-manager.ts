/**
 * Rapier Physics Manager — singleton, no React state
 * ====================================================
 *
 * This avoids all React render-loop issues by using a plain singleton
 * class with callbacks. Components read physics state via refs, not state.
 */

'use client';

import { useRef, useEffect } from 'react';

interface PhysicsBody {
  bodyId: number;
  entityId: number;
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number; w: number };
}

class PhysicsManager {
  private world: any = null;
  private Rapier: any = null;
  private bodies = new Map<number, { body: any; entityId: number }>();
  private nextBodyId = 0;
  private stepCount = 0;
  ready = false;
  error: string | null = null;
  version: string | null = null;

  async init(): Promise<void> {
    if (this.ready) return;
    try {
      const mod = await import('@dimforge/rapier3d-compat');
      this.Rapier = (mod as any).default ?? mod;
      await this.Rapier.init();
      const gravity = { x: 0, y: -9.81, z: 0 };
      this.world = new this.Rapier.World(gravity);
      this.ready = true;
      this.version = typeof this.Rapier.version === 'function' ? this.Rapier.version() : 'unknown';
    } catch (err) {
      this.error = (err as Error).message;
    }
  }

  addCharacterCapsule(entityId: number, pos: { x: number; y: number; z: number }, radius = 0.4, height = 1.8): number | null {
    if (!this.Rapier || !this.world) return null;
    const bodyDesc = this.Rapier.RigidBodyDesc.dynamic().setTranslation(pos.x, pos.y, pos.z);
    const body = this.world.createRigidBody(bodyDesc);
    const colliderDesc = this.Rapier.ColliderDesc.capsule(height / 2, radius);
    this.world.createCollider(colliderDesc, body);
    const id = ++this.nextBodyId;
    this.bodies.set(id, { body, entityId });
    return id;
  }

  addStaticBox(pos: { x: number; y: number; z: number }, size: { x: number; y: number; z: number }): number | null {
    if (!this.Rapier || !this.world) return null;
    const bodyDesc = this.Rapier.RigidBodyDesc.fixed().setTranslation(pos.x, pos.y, pos.z);
    const body = this.world.createRigidBody(bodyDesc);
    const colliderDesc = this.Rapier.ColliderDesc.cuboid(size.x / 2, size.y / 2, size.z / 2);
    this.world.createCollider(colliderDesc, body);
    const id = ++this.nextBodyId;
    this.bodies.set(id, { body, entityId: -1 });
    return id;
  }

  step(dt: number): void {
    if (!this.world) return;
    try { this.world.timestep = dt; } catch {}
    try { this.world.step(); } catch {}
    this.stepCount++;
  }

  getBodyPositions(): PhysicsBody[] {
    const result: PhysicsBody[] = [];
    for (const [id, { body, entityId }] of this.bodies) {
      try {
        const pos = body.translation();
        const rot = body.rotation();
        result.push({
          bodyId: id, entityId,
          position: { x: pos.x, y: pos.y, z: pos.z },
          rotation: { x: rot.x, y: rot.y, z: rot.z, w: rot.w },
        });
      } catch {}
    }
    return result;
  }

  getBodyCount(): number { return this.bodies.size; }
  getStepCount(): number { return this.stepCount; }

  reset(): void {
    this.bodies.clear();
    this.nextBodyId = 0;
    this.stepCount = 0;
  }
}

// Singleton
let manager: PhysicsManager | null = null;
export function getPhysicsManager(): PhysicsManager {
  if (!manager) manager = new PhysicsManager();
  return manager;
}

// React hook that reads the singleton — NO React state, NO render loops.
export function usePhysicsManager(enabled: boolean) {
  const manager = getPhysicsManager();
  const readyRef = useRef(manager.ready);

  useEffect(() => {
    if (!enabled) return;
    if (!manager.ready) {
      manager.init().then(() => {
        readyRef.current = manager.ready;
      });
    }
  }, [enabled, manager]);

  return { manager, readyRef };
}
