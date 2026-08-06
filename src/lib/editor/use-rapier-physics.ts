/**
 * Rapier Physics Hook — Browser-side physics integration
 * ========================================================
 *
 * Per FRONTIER_TECHNOLOGY_MATRIX.md, Rapier is the S-tier candidate for
 * browser-facing physics.
 *
 * CRITICAL: This hook uses refs for ALL mutable state to prevent render
 * loops. The only React state is `ready` (boolean) and `error` (string),
 * which change once during initialization. Everything else (body count,
 * step count, positions) is read via refs, not state.
 */

'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

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
}

export function useRapierPhysics(enabled: boolean) {
  // Only `ready` and `error` are React state — they change ONCE during init.
  const [state, setState] = useState<RapierPhysicsState>({
    ready: false,
    error: null,
    version: null,
  });

  // ALL hot-path data is in refs — never triggers re-render.
  const worldRef = useRef<unknown>(null);
  const RapierRef = useRef<unknown>(null);
  const bodiesRef = useRef<Map<number, { body: unknown; entityId: number }>>(new Map());
  const nextBodyIdRef = useRef(0);
  const stepCountRef = useRef(0);

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;

    async function init() {
      try {
        const mod = await import('@dimforge/rapier3d-compat');
        const Rapier = (mod as any).default ?? mod;
        await Rapier.init();
        if (cancelled) return;

        RapierRef.current = Rapier;
        const gravity = { x: 0, y: -9.81, z: 0 };
        worldRef.current = new Rapier.World(gravity);

        setState({
          ready: true,
          error: null,
          version: typeof Rapier.version === 'function' ? Rapier.version() : 'unknown',
        });
      } catch (err) {
        if (cancelled) return;
        setState({ ready: false, error: (err as Error).message, version: null });
      }
    }

    void init();

    return () => {
      cancelled = true;
      if (worldRef.current) {
        try {
          (worldRef.current as { free?: () => void }).free?.();
        } catch {
          // ignore
        }
        worldRef.current = null;
      }
      bodiesRef.current.clear();
    };
  }, [enabled]);

  const addCharacterCapsule = useCallback((
    entityId: number,
    position: { x: number; y: number; z: number },
    radius = 0.4,
    height = 1.8,
  ): number | null => {
    const Rapier = RapierRef.current as any;
    const world = worldRef.current as any;
    if (!Rapier || !world) return null;

    const bodyDesc = Rapier.RigidBodyDesc.dynamic().setTranslation(position.x, position.y, position.z);
    const body = world.createRigidBody(bodyDesc);
    const colliderDesc = Rapier.ColliderDesc.capsule(height / 2, radius);
    world.createCollider(colliderDesc, body);

    const bodyId = ++nextBodyIdRef.current;
    bodiesRef.current.set(bodyId, { body, entityId });
    return bodyId;
  }, []);

  const addStaticBox = useCallback((
    position: { x: number; y: number; z: number },
    size: { x: number; y: number; z: number },
  ): number | null => {
    const Rapier = RapierRef.current as any;
    const world = worldRef.current as any;
    if (!Rapier || !world) return null;

    const bodyDesc = Rapier.RigidBodyDesc.fixed().setTranslation(position.x, position.y, position.z);
    const body = world.createRigidBody(bodyDesc);
    const colliderDesc = Rapier.ColliderDesc.cuboid(size.x / 2, size.y / 2, size.z / 2);
    world.createCollider(colliderDesc, body);

    const bodyId = ++nextBodyIdRef.current;
    bodiesRef.current.set(bodyId, { body, entityId: -1 });
    return bodyId;
  }, []);

  const removeBody = useCallback((bodyId: number): void => {
    const Rapier = RapierRef.current as any;
    const world = worldRef.current as any;
    if (!Rapier || !world) return;
    const entry = bodiesRef.current.get(bodyId);
    if (entry) {
      world.removeRigidBody(entry.body);
      bodiesRef.current.delete(bodyId);
    }
  }, []);

  const step = useCallback((dt: number): void => {
    const world = worldRef.current as any;
    if (!world) return;
    try {
      world.timestep = dt;
    } catch {
      // default timestep
    }
    try {
      world.step();
    } catch {
      // not initialized
    }
    stepCountRef.current++;
  }, []);

  const getBodyPositions = useCallback((): PhysicsBody[] => {
    const bodies: PhysicsBody[] = [];
    for (const [bodyId, { body, entityId }] of bodiesRef.current) {
      const b = body as any;
      try {
        const pos = b.translation();
        const rot = b.rotation();
        bodies.push({
          bodyId,
          entityId,
          position: { x: pos.x, y: pos.y, z: pos.z },
          rotation: { x: rot.x, y: rot.y, z: rot.z, w: rot.w },
          colliding: false,
        });
      } catch {
        // body may be freed
      }
    }
    return bodies;
  }, []);

  const getBodyCount = useCallback((): number => bodiesRef.current.size, []);
  const getStepCount = useCallback((): number => stepCountRef.current, []);

  return {
    state,
    addCharacterCapsule,
    addStaticBox,
    removeBody,
    step,
    getBodyPositions,
    getBodyCount,
    getStepCount,
  };
}
