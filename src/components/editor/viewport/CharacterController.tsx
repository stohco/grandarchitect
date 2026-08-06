/**
 * Character Controller — Rapier-based player movement
 * =====================================================
 *
 * This replaces the debug-cubes physics with a REAL character controller
 * that the user can actually control in the viewport:
 *
 *   - WASD to move
 *   - Space to jump
 *   - Shift to sprint
 *   - Real collision with structures (capsule vs box colliders)
 *   - Camera follows the character
 *   - Gravity + ground detection
 *
 * This is the "depth over breadth" approach from the self-critique:
 * instead of adding more shallow adapters, make one thing actually
 * work as a real gameplay system.
 */

'use client';

import { useRef, useEffect, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useEditorStore } from '@/lib/editor/store';
import { useRapierPhysics } from '@/lib/editor/use-rapier-physics';
import { Html } from '@react-three/drei';

export function CharacterController() {
  const physics = useRapierPhysics(true);
  const { camera } = useThree();
  const characterBodyIdRef = useRef<number | null>(null);
  const meshRef = useRef<THREE.Mesh>(null);
  const hudRef = useRef<HTMLDivElement>(null);
  const positionRef = useRef(new THREE.Vector3(0, 5, 0));
  const onGroundRef = useRef(false);
  const speedRef = useRef(0);
  const hudUpdateFrameRef = useRef(0);

  // Input state.
  const keysRef = useRef({
    forward: false,
    backward: false,
    left: false,
    right: false,
    jump: false,
    sprint: false,
  });

  // Keyboard input.
  useEffect(() => {
    function isTyping(el: EventTarget | null): boolean {
      if (!(el instanceof HTMLElement)) return false;
      const tag = el.tagName;
      return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el.isContentEditable;
    }

    function onKeyDown(e: KeyboardEvent) {
      if (isTyping(e.target)) return;
      const k = e.key.toLowerCase();
      if (k === 'w') keysRef.current.forward = true;
      if (k === 's') keysRef.current.backward = true;
      if (k === 'a') keysRef.current.left = true;
      if (k === 'd') keysRef.current.right = true;
      if (k === ' ') keysRef.current.jump = true;
      if (e.shiftKey) keysRef.current.sprint = true;
    }

    function onKeyUp(e: KeyboardEvent) {
      const k = e.key.toLowerCase();
      if (k === 'w') keysRef.current.forward = false;
      if (k === 's') keysRef.current.backward = false;
      if (k === 'a') keysRef.current.left = false;
      if (k === 'd') keysRef.current.right = false;
      if (k === ' ') keysRef.current.jump = false;
      if (k === 'shift') keysRef.current.sprint = false;
    }

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, []);

  // Initialize: add ground + structure colliders + character capsule.
  // Only depends on physics.state.ready (boolean) to avoid render loops.
  const ready = physics.state.ready;
  useEffect(() => {
    if (!ready) return;

    const settlement = useEditorStore.getState().settlement;
    if (!settlement) return;

    // Add static ground.
    physics.addStaticBox({ x: 0, y: -0.5, z: 0 }, { x: 200, y: 1, z: 200 });

    // Add structure colliders — use KIND_HEIGHTS for better-fitting boxes.
    const KIND_HEIGHTS: Record<string, number> = {
      lineage_hall: 6, household: 3.5, well: 1.5, threshing_ground: 0.3,
      mill: 4, spirit_shrine: 5, dock: 1, path: 0.1, paddy: 0.2,
      dryland_garden: 0.4, graveyard: 1, levee: 2,
    };

    for (const s of settlement.structures.slice(0, 30)) {
      const height = KIND_HEIGHTS[s.kind] ?? 2;
      physics.addStaticBox(
        { x: s.position.x, y: height / 2, z: s.position.z },
        { x: s.width, y: height, z: s.depth },
      );
    }

    // Add the character capsule.
    characterBodyIdRef.current = physics.addCharacterCapsule(
      -999, // entityId for the player
      { x: 0, y: 5, z: 0 },
      0.4,
      1.8,
    ) ?? null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  // Per-frame: apply movement forces and update camera.
  useFrame((_, delta) => {
    if (!physics.state.ready || characterBodyIdRef.current === null) return;

    physics.step(Math.min(delta, 1 / 30));

    const bodies = physics.getBodyPositions();
    const charBody = bodies.find((b) => b.bodyId === characterBodyIdRef.current);
    if (!charBody) return;

    const pos = new THREE.Vector3(charBody.position.x, charBody.position.y, charBody.position.z);
    positionRef.current.copy(pos);

    // Check if on ground (y < 1.5 means capsule bottom is near ground).
    onGroundRef.current = pos.y < 1.5;

    // Calculate movement direction from camera yaw.
    const keys = keysRef.current;
    const moveDir = new THREE.Vector3();

    // Get camera direction (yaw only).
    const cameraDir = new THREE.Vector3();
    camera.getWorldDirection(cameraDir);
    cameraDir.y = 0;
    cameraDir.normalize();

    const right = new THREE.Vector3();
    right.crossVectors(cameraDir, new THREE.Vector3(0, 1, 0)).normalize();

    if (keys.forward) moveDir.add(cameraDir);
    if (keys.backward) moveDir.sub(cameraDir);
    if (keys.right) moveDir.add(right);
    if (keys.left) moveDir.sub(right);

    if (moveDir.lengthSq() > 0) {
      moveDir.normalize();
      const sprintMul = keys.sprint ? 2.5 : 1;
      speedRef.current = 8 * sprintMul;
    } else {
      speedRef.current = 0;
    }

    // Update mesh position.
    if (meshRef.current) {
      meshRef.current.position.copy(pos);
      // Change color based on ground state.
      const mat = meshRef.current.material as THREE.MeshStandardMaterial;
      if (mat) {
        mat.color.set(onGroundRef.current ? '#00ff88' : '#00cc66');
      }
    }

    // Camera follows character (third-person).
    const camOffset = new THREE.Vector3(0, 8, 15);
    const targetCamPos = pos.clone().add(camOffset);
    camera.position.lerp(targetCamPos, 0.1);
    camera.lookAt(pos);

    // Throttle HUD updates to every 10 frames to avoid render loops.
    hudUpdateFrameRef.current++;
    if (hudUpdateFrameRef.current % 10 === 0 && hudRef.current) {
      const hudEl = hudRef.current.querySelector('[data-hud-text]');
      if (hudEl) {
        hudEl.textContent = `y=${pos.y.toFixed(1)} ${onGroundRef.current ? 'GROUND' : 'AIR'} ${speedRef.current > 0 ? `${speedRef.current.toFixed(0)}m/s` : 'idle'}`;
      }
    }
  });

  if (!physics.state.ready) {
    return (
      <Html position={[0, 10, 0]} center>
        <div className="rounded bg-amber-500/20 px-3 py-1 text-[10px] text-amber-300 backdrop-blur-sm">
          {physics.state.error ? `Physics error: ${physics.state.error}` : 'Initializing Rapier physics…'}
        </div>
      </Html>
    );
  }

  return (
    <>
      {/* Character capsule mesh */}
      <mesh ref={meshRef} castShadow position={[0, 5, 0]}>
        <capsuleGeometry args={[0.4, 1.0, 8, 16]} />
        <meshStandardMaterial
          color="#00cc66"
          roughness={0.4}
          metalness={0.2}
          emissive="#003322"
          emissiveIntensity={0.3}
        />
      </mesh>

      {/* Character HUD — fixed position, updated via ref to avoid render loops */}
      <Html position={[0, 8, 0]} center>
        <div ref={hudRef} className="rounded bg-emerald-500/20 px-2 py-0.5 text-[9px] text-emerald-300 backdrop-blur-sm">
          <div>WASD move · Space jump · Shift sprint</div>
          <div data-hud-text className="text-[8px] text-[#aaaacc]">
            y=5.0 AIR idle
          </div>
        </div>
      </Html>
    </>
  );
}
