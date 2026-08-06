/**
 * Rapier Physics Hook — Browser-side physics integration
 * ========================================================
 *
 * Per FRONTIER_TECHNOLOGY_MATRIX.md, Rapier is the S-tier candidate for
 * browser-facing physics. This hook initializes Rapier and provides
 * a physics world that the viewport can use for real collision detection,
 * character capsules, and rigid body simulation.
 *
 * Usage in Viewport3D:
 *   const physics = useRapierPhysics();
 *   if (physics.ready) {
 *     physics.addCharacterCapsule(entityId, position, radius, height);
 *     physics.step(dt);
 *   }
 */

'use client';

import { useEffect, useRef, useState } from 'react';
import type * as RapierType from '@dimforge/rapier3d-compat';

export interface PhysicsBody {
  bodyId: number;
  entityId: number;
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number; w: number };
  colliding: boolean;
}

export interface RapierPhysicsState {
  ready: boolean;
  error: string | null;
  version: string | null;
  bodyCount: number;
  stepCount: number;
}

export function useRapierPhysics(enabled: boolean) {
  const [state, setState] = useState<RapierPhysicsState>({
    ready: false,
    error: null,
    version: null,
    bodyCount: 0,
    stepCount: 0,
  });

  const worldRef = useRef<RapierType.World | null>(null);
  const RapierRef = useRef<typeof RapierType | null>(null);
  const bodiesRef = useRef<Map<number, { body: RapierType.RigidBody; entityId: number }>>(new Map());
  const nextBodyIdRef = useRef(0);
  const stepCountRef = useRef(0);

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;

    async function init() {
      try {
        const mod = await import('@dimforge/rapier3d-compat');
        // The compat package may export via default or named exports.
        const Rapier = (mod as any).default ?? mod;
        await Rapier.init();
        if (cancelled) return;

        RapierRef.current = Rapier;
        const gravity = { x: 0, y: -9.81, z: 0 };
        worldRef.current = new Rapier.World(gravity);

        setState((s) => ({
          ...s,
          ready: true,
          version: (Rapier as unknown as { version?: string }).version ?? 'unknown',
          error: null,
        }));
      } catch (err) {
        if (cancelled) return;
        // Try fallback without wasmUrl (may work in some environments).
        try {
          const mod2 = await import('@dimforge/rapier3d-compat');
          const Rapier2 = (mod2 as any).default ?? mod2;
          await Rapier2.init();
          if (cancelled) return;
          RapierRef.current = Rapier2;
          const gravity = { x: 0, y: -9.81, z: 0 };
          worldRef.current = new Rapier2.World(gravity);
          setState((s) => ({
            ...s,
            ready: true,
            version: (Rapier as unknown as { version?: string }).version ?? 'unknown',
            error: null,
          }));
        } catch (err2) {
          if (cancelled) return;
          setState((s) => ({ ...s, ready: false, error: (err2 as Error).message }));
        }
      }
    }

    void init();

    return () => {
      cancelled = true;
      if (worldRef.current) {
        worldRef.current.free();
        worldRef.current = null;
      }
      bodiesRef.current.clear();
    };
  }, [enabled]);

  const addCharacterCapsule = (
    entityId: number,
    position: { x: number; y: number; z: number },
    radius = 0.4,
    height = 1.8,
  ): number | null => {
    const Rapier = RapierRef.current;
    const world = worldRef.current;
    if (!Rapier || !world) return null;

    const bodyDesc = Rapier.RigidBodyDesc.dynamic().setTranslation(position.x, position.y, position.z);
    const body = world.createRigidBody(bodyDesc);
    const colliderDesc = Rapier.ColliderDesc.capsule(height / 2, radius);
    world.createCollider(colliderDesc, body);

    const bodyId = ++nextBodyIdRef.current;
    bodiesRef.current.set(bodyId, { body, entityId });
    // Don't call setState here — it causes render loops when adding many bodies.
    // Body count is read via getBodyPositions().length instead.
    return bodyId;
  };

  const addStaticBox = (
    position: { x: number; y: number; z: number },
    size: { x: number; y: number; z: number },
  ): number | null => {
    const Rapier = RapierRef.current;
    const world = worldRef.current;
    if (!Rapier || !world) return null;

    const bodyDesc = Rapier.RigidBodyDesc.fixed().setTranslation(position.x, position.y, position.z);
    const body = world.createRigidBody(bodyDesc);
    const colliderDesc = Rapier.ColliderDesc.cuboid(size.x / 2, size.y / 2, size.z / 2);
    world.createCollider(colliderDesc, body);

    const bodyId = ++nextBodyIdRef.current;
    bodiesRef.current.set(bodyId, { body, entityId: -1 });
    // Don't call setState here — it causes render loops when adding many bodies.
    return bodyId;
  };

  const removeBody = (bodyId: number): void => {
    const Rapier = RapierRef.current;
    const world = worldRef.current;
    if (!Rapier || !world) return;
    const entry = bodiesRef.current.get(bodyId);
    if (entry) {
      world.removeRigidBody(entry.body);
      bodiesRef.current.delete(bodyId);
    }
  };

  const step = (dt: number): void => {
    const world = worldRef.current;
    if (!world) return;
    // Rapier's World.timestep is optional — only set if the property exists.
    try {
      (world as unknown as { timestep: number }).timestep = dt;
    } catch {
      // If timestep can't be set, use the default.
    }
    try {
      world.step();
    } catch {
      // Step may fail if world is not fully initialized.
    }
    stepCountRef.current++;
    // Don't call setState here — stepCount is read via ref, not state.
    // Calling setState every 60 frames causes render loops with useFrame.
  };

  const getBodyPositions = (): PhysicsBody[] => {
    const bodies: PhysicsBody[] = [];
    for (const [bodyId, { body, entityId }] of bodiesRef.current) {
      const pos = body.translation();
      const rot = body.rotation();
      bodies.push({
        bodyId,
        entityId,
        position: { x: pos.x, y: pos.y, z: pos.z },
        rotation: { x: rot.x, y: rot.y, z: rot.z, w: rot.w },
        colliding: false,
      });
    }
    return bodies;
  };

  return {
    state,
    addCharacterCapsule,
    addStaticBox,
    removeBody,
    step,
    getBodyPositions,
  };
}
