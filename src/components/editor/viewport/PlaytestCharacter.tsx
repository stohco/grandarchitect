/**
 * PlaytestMode — Real embodied character controller
 * ==================================================
 *
 * Per auditor: "Use Rapier's KinematicCharacterController for the first
 * production candidate."
 *
 * Architecture:
 *   Input Sampling → Character Intent → Rapier KinematicCharacterController
 *   → Resolved movement → Authoritative snapshot → Interpolated render
 *   → Camera follow
 *
 * EDITOR mode: OrbitControls enabled, character disabled.
 * PLAYTEST mode: OrbitControls disabled, character enabled.
 *
 * Only one writer to camera transform per mode.
 *
 * Playtest entry is idempotent: PhysicsRuntime.resetWorld() removes every
 * fixture and the character before rebuilding, so toggling playtest on and
 * off repeatedly never piles up duplicate colliders.
 */

'use client';

import { useRef, useEffect, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useEditorStore } from '@/lib/editor/store';
import { getPhysicsRuntime, type CharacterIntent } from '@/engine/runtime/physics-runtime';

// Camera orbit parameters (right-drag look).
const CAM_DISTANCE = 14;
const CAM_PITCH_MIN = 0.1;
const CAM_PITCH_MAX = 1.3;
const CAM_LERP = 0.15;
const LOOK_SPEED = 0.005;

// ---------------------------------------------------------------------------
// Idempotent world builder.
//
// Playtest may mount/unmount repeatedly (toggle P, React StrictMode double
// effects, world regeneration). A module-level promise + fingerprint make
// world construction happen exactly once per settlement, and rebuild only
// when the settlement actually changes.
// ---------------------------------------------------------------------------

let buildPromise: Promise<void> | null = null;
let builtFingerprint = '';

function ensurePlaytestWorld(
  runtime: ReturnType<typeof getPhysicsRuntime>,
  settlement: { seed?: string | number; structures: unknown[] } | null,
): Promise<void> {
  const fp = settlement ? `${String(settlement.seed)}:${settlement.structures.length}` : '';

  if (buildPromise) return buildPromise;

  if (builtFingerprint === fp && runtime.ready) {
    if (!runtime.running) runtime.resume();
    return Promise.resolve();
  }

  builtFingerprint = fp;

  buildPromise = runtime.initialize()
    .then(() => {
      if (!runtime.ready) return;

      // Reset any fixtures left over from a previous playtest session.
      runtime.resetWorld();

      // Add ground plane matching the rendered GroundPlane (200x200 at y=0).
      // NOTE: the settlement model carries no terrain heightmap yet, so the
      // rendered ground is flat and the collision must match it. The runtime
      // API for real terrain (addTerrainHeightfield) is ready for when a
      // heightmap source exists — collision always mirrors what is rendered.
      runtime.addCuboidCollider(
        { x: 0, y: -0.5, z: 0 },
        { x: 200, y: 1, z: 200 },
        undefined,
        'Ground plane',
      );

      // Add shape-aware structure colliders (mirrors StructureMesh render).
      let spawn = { x: 0, z: 0 };
      if (settlement) {
        const all = (settlement as { structures: Array<{
          kind: string; position: { x: number; z: number }; width: number;
          depth: number; entityId: number; name: string;
        }> }).structures;
        for (const s of all) {
          runtime.addStructureCollider(
            s.kind,
            s.position,
            s.width,
            s.depth,
            s.entityId,
            s.name,
          );
        }

        // Spawn on a flat walkable surface (path/threshing ground/paddy)
        // whose center is not inside any building footprint — the village
        // center itself may be occupied (e.g. the lineage hall).
        const FLAT_KINDS = new Set(['path', 'threshing_ground', 'dryland_garden', 'paddy']);
        const isInsideBuilding = (x: number, z: number): boolean =>
          all.some((s) => {
            if (FLAT_KINDS.has(s.kind)) return false;
            return Math.abs(x - s.position.x) < s.width / 2
              && Math.abs(z - s.position.z) < s.depth / 2;
          });
        const candidates = all
          .filter((s) => FLAT_KINDS.has(s.kind))
          .sort((a, b) =>
            Math.hypot(a.position.x, a.position.z) - Math.hypot(b.position.x, b.position.z));
        for (const cand of candidates) {
          if (!isInsideBuilding(cand.position.x, cand.position.z)) {
            spawn = { x: cand.position.x, z: cand.position.z };
            break;
          }
        }
      }

      // Create the character (capsule center 1.3m above the flat ground top).
      runtime.createCharacter({ x: spawn.x, y: 1.3, z: spawn.z });
      // NOTE: start() is intentionally NOT called here — the frame loop
      // starts the runtime the moment playtest mode engages, so `running`
      // never leaks true while the editor is idle.
    })
    .finally(() => {
      buildPromise = null;
    });

  return buildPromise;
}

export function PlaytestCharacter() {
  const { camera } = useThree();
  const meshRef = useRef<THREE.Mesh>(null);
  const initializedRef = useRef(false);

  // Input state (refs, NOT state — no re-renders).
  const keysRef = useRef({ w: false, a: false, s: false, d: false, space: false, shift: false });

  // Camera orbit state (right-drag look).
  const camYawRef = useRef(0);
  const camPitchRef = useRef(0.6);

  // Keyboard input.
  useEffect(() => {
    function isTyping(el: EventTarget | null): boolean {
      if (!(el instanceof HTMLElement)) return false;
      return ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName) || el.isContentEditable;
    }

    function onKeyDown(e: KeyboardEvent) {
      if (isTyping(e.target)) return;
      const k = e.key.toLowerCase();
      if (k === 'w') keysRef.current.w = true;
      if (k === 's') keysRef.current.s = true;
      if (k === 'a') keysRef.current.a = true;
      if (k === 'd') keysRef.current.d = true;
      if (k === ' ') { keysRef.current.space = true; e.preventDefault(); }
      if (e.shiftKey) keysRef.current.shift = true;
      // Escape exits playtest back to the editor.
      if (k === 'escape') {
        useEditorStore.getState().setPlaytestMode(false);
      }
    }

    function onKeyUp(e: KeyboardEvent) {
      const k = e.key.toLowerCase();
      if (k === 'w') keysRef.current.w = false;
      if (k === 's') keysRef.current.s = false;
      if (k === 'a') keysRef.current.a = false;
      if (k === 'd') keysRef.current.d = false;
      if (k === ' ') keysRef.current.space = false;
      if (k === 'shift') keysRef.current.shift = false;
    }

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, []);

  // Right-drag mouse look.
  useEffect(() => {
    let isLooking = false;
    let lastX = 0;
    let lastY = 0;

    function onMouseDown(e: MouseEvent) {
      if (e.button === 2) {
        isLooking = true;
        lastX = e.clientX;
        lastY = e.clientY;
        e.preventDefault();
      }
    }

    function onMouseMove(e: MouseEvent) {
      if (!isLooking) return;
      const dx = e.clientX - lastX;
      const dy = e.clientY - lastY;
      lastX = e.clientX;
      lastY = e.clientY;
      camYawRef.current -= dx * LOOK_SPEED;
      camPitchRef.current = Math.max(CAM_PITCH_MIN, Math.min(CAM_PITCH_MAX, camPitchRef.current + dy * LOOK_SPEED));
    }

    function onMouseUp(e: MouseEvent) {
      if (e.button === 2) isLooking = false;
    }

    function onContextMenu(e: MouseEvent) {
      e.preventDefault();
    }

    window.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    window.addEventListener('contextmenu', onContextMenu);
    return () => {
      window.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('contextmenu', onContextMenu);
    };
  }, []);

  // Initialize physics world (idempotent per settlement — see builder above).
  // The component is always mounted; the store is read via getState() (no
  // subscription — the playtest hot path must not depend on React update
  // scheduling, which Firefox can stall).
  useEffect(() => {
    const rt = getPhysicsRuntime();
    if (!initializedRef.current) {
      initializedRef.current = true;

      // Diagnostic hooks for the browser evidence harness (read-only access
      // to the authoritative runtime + store; harmless in production).
      (window as unknown as { __physicsRuntime?: unknown }).__physicsRuntime = rt;
      (window as unknown as { __editorStore?: unknown }).__editorStore = useEditorStore;
    }

    // Build the world on the first mount regardless of playtest state — the
    // frame loop gates stepping on the store value directly.
    void ensurePlaytestWorld(rt, useEditorStore.getState().settlement);
  }, []);

  // Per-frame: sample input, step physics, update render.
  useFrame((_, delta) => {
    // Camera yaw diagnostic for the evidence harness (head-on aim steering).
    (window as unknown as { __camYaw?: number }).__camYaw = camYawRef.current;
    // Prefer the runtime instance the mount effect built and exposed
    // (module-instance duplication in some bundles can otherwise give the
    // frame loop a never-initialized singleton, notably in Firefox).
    const runtime = (window as unknown as { __physicsRuntime?: ReturnType<typeof getPhysicsRuntime> }).__physicsRuntime
      ?? getPhysicsRuntime();
    const store = useEditorStore.getState();
    if (!store.playtestMode) return;
    if (!runtime.ready) return;
    if (!runtime.running) runtime.start();

    // Build character intent from input. Forward intent (W) is +moveZ and is
    // rotated into world space by the runtime using the camera yaw, so
    // movement is always camera-relative.
    const keys = keysRef.current;
    const intent: CharacterIntent = {
      moveX: (keys.d ? 1 : 0) - (keys.a ? 1 : 0),
      moveZ: (keys.w ? 1 : 0) - (keys.s ? 1 : 0),
      cameraYaw: camYawRef.current + Math.PI,
      sprint: keys.shift,
      jump: keys.space,
    };

    // Step physics with fixed timestep.
    runtime.step(delta, intent);

    // Get interpolated snapshot for rendering.
    const snapshot = runtime.getCharacterSnapshot();
    if (snapshot && meshRef.current) {
      meshRef.current.position.set(snapshot.position.x, snapshot.position.y, snapshot.position.z);

      // Change color based on state.
      const mat = meshRef.current.material as THREE.MeshStandardMaterial;
      if (mat) {
        if (snapshot.grounded) {
          mat.color.set(snapshot.movementMode === 'sprinting' ? '#00ff44' : '#00cc66');
        } else {
          mat.color.set(snapshot.movementMode === 'jumping' ? '#44aaff' : '#ff8800');
        }
        mat.emissiveIntensity = snapshot.grounded ? 0.2 : 0.4;
      }
    }

    // Camera follow (only in PLAYTEST mode — OrbitControls is disabled).
    if (snapshot) {
      const camTarget = new THREE.Vector3(
        snapshot.position.x,
        snapshot.position.y + 2,
        snapshot.position.z,
      );
      const cosP = Math.cos(camPitchRef.current);
      const sinP = Math.sin(camPitchRef.current);
      const camOffset = new THREE.Vector3(
        Math.sin(camYawRef.current) * cosP * CAM_DISTANCE,
        sinP * CAM_DISTANCE,
        Math.cos(camYawRef.current) * cosP * CAM_DISTANCE,
      );
      const desiredCamPos = camTarget.clone().add(camOffset);

      // Smooth camera follow.
      camera.position.lerp(desiredCamPos, CAM_LERP);
      camera.lookAt(camTarget);
    }
  });

  return (
    <>
      {/* Character capsule mesh */}
      <mesh ref={meshRef} castShadow position={[0, 1.3, 0]}>
        <capsuleGeometry args={[0.4, 0.9, 8, 16]} />
        <meshStandardMaterial
          color="#00cc66"
          roughness={0.4}
          metalness={0.2}
          emissive="#003322"
          emissiveIntensity={0.3}
        />
      </mesh>
    </>
  );
}
