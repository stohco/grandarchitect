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
 */

'use client';

import { useRef, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { Html } from '@react-three/drei';
import { useEditorStore } from '@/lib/editor/store';
import { getPhysicsRuntime, type CharacterIntent } from '@/engine/runtime/physics-runtime';

const KIND_HEIGHTS: Record<string, number> = {
  lineage_hall: 6, household: 3.5, well: 1.5, threshing_ground: 0.3,
  mill: 4, spirit_shrine: 5, dock: 1, path: 0.1, paddy: 0.2,
  dryland_garden: 0.4, graveyard: 1, levee: 2,
};

export function PlaytestCharacter() {
  const { camera } = useThree();
  const meshRef = useRef<THREE.Mesh>(null);
  const hudRef = useRef<HTMLDivElement>(null);
  const hudFrameRef = useRef(0);
  const initializedRef = useRef(false);

  // Input state (refs, NOT state — no re-renders).
  const keysRef = useRef({ w: false, a: false, s: false, d: false, space: false, shift: false });

  // Camera yaw (read from OrbitControls target/camera direction).
  const cameraYawRef = useRef(0);

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

  // Initialize physics world (once).
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    const runtime = getPhysicsRuntime();

    runtime.initialize().then(() => {
      if (!runtime.ready) return;

      const settlement = useEditorStore.getState().settlement;
      if (!settlement) return;

      // Add ground plane as a flat heightfield (temporary — will be replaced
      // by real terrain heightfield).
      // Use a large cuboid for now since we need a heightfield from actual
      // terrain data, which isn't available yet.
      runtime.addCuboidCollider(
        { x: 0, y: -0.5, z: 0 },
        { x: 200, y: 1, z: 200 },
        undefined,
        'Ground plane',
      );

      // Add shape-aware structure colliders.
      for (const s of settlement.structures) {
        runtime.addStructureCollider(
          s.kind,
          s.position,
          s.width,
          s.depth,
          s.entityId,
          s.name,
        );
      }

      // Create the character.
      runtime.createCharacter({ x: 0, y: 5, z: 0 });
      runtime.start();
    });
  }, []);

  // Per-frame: sample input, step physics, update render.
  useFrame((_, delta) => {
    const runtime = getPhysicsRuntime();
    if (!runtime.ready || !runtime.running) return;

    // Compute camera yaw from current camera position.
    const camDir = new THREE.Vector3();
    camera.getWorldDirection(camDir);
    cameraYawRef.current = Math.atan2(camDir.x, camDir.z);

    // Build character intent from input.
    const keys = keysRef.current;
    const intent: CharacterIntent = {
      moveX: (keys.d ? 1 : 0) - (keys.a ? 1 : 0),
      moveZ: (keys.s ? 1 : 0) - (keys.w ? 1 : 0), // Forward is -Z, so W = forward = moveZ=-1... actually W=forward=+1 and we negate in runtime
      cameraYaw: cameraYawRef.current,
      sprint: keys.shift,
      jump: keys.space,
    };

    // Fix: W should move forward. Forward in camera space is -Z.
    // In the runtime, moveZ=1 means forward. So W → moveZ=1.
    intent.moveZ = (keys.w ? 1 : 0) - (keys.s ? 1 : 0);

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
      const camOffset = new THREE.Vector3(0, 6, 12);
      const desiredCamPos = camTarget.clone().add(camOffset);

      // Smooth camera follow.
      camera.position.lerp(desiredCamPos, 0.1);
      camera.lookAt(camTarget);
    }

    // HUD update (throttled — every 6 frames ≈ 10Hz).
    hudFrameRef.current++;
    if (hudFrameRef.current % 6 === 0 && hudRef.current) {
      const el = hudRef.current.querySelector('[data-hud]');
      if (el && snapshot) {
        const diag = runtime.getDiagnostics();
        el.textContent =
          `${snapshot.movementMode} | y=${snapshot.position.y.toFixed(1)} ` +
          `${snapshot.grounded ? 'GROUND' : 'AIR'} ` +
          `vel=(${snapshot.horizontalVelocity.x.toFixed(1)},${snapshot.horizontalVelocity.z.toFixed(1)}) ` +
          `vy=${snapshot.verticalVelocity.toFixed(1)} ` +
          `slope=${(snapshot.slopeAngle * 180 / Math.PI).toFixed(0)}° ` +
          `| ${diag.colliderCount} colliders, ${diag.stepCount} steps`;
      }
    }
  });

  const runtime = getPhysicsRuntime();

  if (!runtime.ready) {
    return (
      <Html position={[0, 10, 0]} center>
        <div className="rounded bg-amber-500/20 px-3 py-1 text-[10px] text-amber-300 backdrop-blur-sm">
          {runtime.error ? `Physics error: ${runtime.error}` : 'Initializing Rapier physics…'}
        </div>
      </Html>
    );
  }

  return (
    <>
      {/* Character capsule mesh */}
      <mesh ref={meshRef} castShadow position={[0, 5, 0]}>
        <capsuleGeometry args={[0.4, 0.9, 8, 16]} />
        <meshStandardMaterial
          color="#00cc66"
          roughness={0.4}
          metalness={0.2}
          emissive="#003322"
          emissiveIntensity={0.3}
        />
      </mesh>

      {/* Character HUD */}
      <Html position={[0, 8, 0]} center>
        <div ref={hudRef} className="rounded bg-emerald-500/20 px-2 py-0.5 text-[9px] text-emerald-300 backdrop-blur-sm">
          <div>WASD move · Space jump · Shift sprint · Esc → Editor</div>
          <div data-hud className="text-[8px] text-[#aaaacc]">idle | y=5.0 GROUND vel=(0,0) vy=0 slope=0°</div>
        </div>
      </Html>
    </>
  );
}
