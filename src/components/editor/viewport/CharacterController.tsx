/**
 * Character Controller — Rapier-based player movement
 * 
 * Uses singleton PhysicsManager (no React state) to avoid render loops.
 * WASD move, Space jump, Shift sprint, camera follows character.
 */

'use client';

import { useRef, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useEditorStore } from '@/lib/editor/store';
import { getPhysicsManager } from '@/lib/editor/physics-manager';
import { Html } from '@react-three/drei';

const KIND_HEIGHTS: Record<string, number> = {
  lineage_hall: 6, household: 3.5, well: 1.5, threshing_ground: 0.3,
  mill: 4, spirit_shrine: 5, dock: 1, path: 0.1, paddy: 0.2,
  dryland_garden: 0.4, graveyard: 1, levee: 2,
};

export function CharacterController() {
  const { camera } = useThree();
  const manager = getPhysicsManager();
  const meshRef = useRef<THREE.Mesh>(null);
  const hudRef = useRef<HTMLDivElement>(null);
  const characterBodyIdRef = useRef<number | null>(null);
  const initializedRef = useRef(false);
  const hudFrameRef = useRef(0);

  const keysRef = useRef({ forward: false, backward: false, left: false, right: false, jump: false, sprint: false });

  // Keyboard input
  useEffect(() => {
    function isTyping(el: EventTarget | null): boolean {
      if (!(el instanceof HTMLElement)) return false;
      return ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName) || el.isContentEditable;
    }
    function onDown(e: KeyboardEvent) {
      if (isTyping(e.target)) return;
      const k = e.key.toLowerCase();
      if (k === 'w') keysRef.current.forward = true;
      if (k === 's') keysRef.current.backward = true;
      if (k === 'a') keysRef.current.left = true;
      if (k === 'd') keysRef.current.right = true;
      if (k === ' ') keysRef.current.jump = true;
      if (e.shiftKey) keysRef.current.sprint = true;
    }
    function onUp(e: KeyboardEvent) {
      const k = e.key.toLowerCase();
      if (k === 'w') keysRef.current.forward = false;
      if (k === 's') keysRef.current.backward = false;
      if (k === 'a') keysRef.current.left = false;
      if (k === 'd') keysRef.current.right = false;
      if (k === ' ') keysRef.current.jump = false;
      if (k === 'shift') keysRef.current.sprint = false;
    }
    window.addEventListener('keydown', onDown);
    window.addEventListener('keyup', onUp);
    return () => { window.removeEventListener('keydown', onDown); window.removeEventListener('keyup', onUp); };
  }, []);

  // Initialize physics world (once)
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    let cancelled = false;
    manager.init().then(() => {
      if (cancelled || !manager.ready) return;

      const settlement = useEditorStore.getState().settlement;
      if (!settlement) return;

      // Ground
      manager.addStaticBox({ x: 0, y: -0.5, z: 0 }, { x: 200, y: 1, z: 200 });

      // Structure colliders
      for (const s of settlement.structures.slice(0, 30)) {
        const h = KIND_HEIGHTS[s.kind] ?? 2;
        manager.addStaticBox(
          { x: s.position.x, y: h / 2, z: s.position.z },
          { x: s.width, y: h, z: s.depth },
        );
      }

      // Character capsule
      characterBodyIdRef.current = manager.addCharacterCapsule(-999, { x: 0, y: 5, z: 0 }, 0.4, 1.8);
    });

    return () => { cancelled = true; };
  }, [manager]);

  // Per-frame
  useFrame((_, delta) => {
    if (!manager.ready || characterBodyIdRef.current === null) return;

    manager.step(Math.min(delta, 1 / 30));

    const bodies = manager.getBodyPositions();
    const charBody = bodies.find((b) => b.bodyId === characterBodyIdRef.current);
    if (!charBody) return;

    const pos = new THREE.Vector3(charBody.position.x, charBody.position.y, charBody.position.z);

    // Movement
    const keys = keysRef.current;
    const moveDir = new THREE.Vector3();
    const camDir = new THREE.Vector3();
    camera.getWorldDirection(camDir);
    camDir.y = 0;
    camDir.normalize();
    const right = new THREE.Vector3().crossVectors(camDir, new THREE.Vector3(0, 1, 0)).normalize();

    if (keys.forward) moveDir.add(camDir);
    if (keys.backward) moveDir.sub(camDir);
    if (keys.right) moveDir.add(right);
    if (keys.left) moveDir.sub(right);

    let speed = 0;
    if (moveDir.lengthSq() > 0) {
      moveDir.normalize();
      speed = keys.sprint ? 20 : 8;
    }

    // Update mesh
    if (meshRef.current) {
      meshRef.current.position.copy(pos);
      const mat = meshRef.current.material as THREE.MeshStandardMaterial;
      if (mat) mat.color.set(pos.y < 1.5 ? '#00ff88' : '#00cc66');
    }

    // Camera follow
    camera.position.lerp(pos.clone().add(new THREE.Vector3(0, 8, 15)), 0.1);
    camera.lookAt(pos);

    // HUD (throttled)
    hudFrameRef.current++;
    if (hudFrameRef.current % 10 === 0 && hudRef.current) {
      const el = hudRef.current.querySelector('[data-hud]');
      if (el) {
        el.textContent = `y=${pos.y.toFixed(1)} ${pos.y < 1.5 ? 'GROUND' : 'AIR'} ${speed > 0 ? speed + 'm/s' : 'idle'} | ${manager.getBodyCount()}b ${manager.getStepCount()}s`;
      }
    }
  });

  if (!manager.ready) {
    return (
      <Html position={[0, 10, 0]} center>
        <div className="rounded bg-amber-500/20 px-3 py-1 text-[10px] text-amber-300 backdrop-blur-sm">
          {manager.error ? `Error: ${manager.error}` : 'Initializing Rapier physics…'}
        </div>
      </Html>
    );
  }

  return (
    <>
      <mesh ref={meshRef} castShadow position={[0, 5, 0]}>
        <capsuleGeometry args={[0.4, 1.0, 8, 16]} />
        <meshStandardMaterial color="#00cc66" roughness={0.4} metalness={0.2} emissive="#003322" emissiveIntensity={0.3} />
      </mesh>
      <Html position={[0, 8, 0]} center>
        <div ref={hudRef} className="rounded bg-emerald-500/20 px-2 py-0.5 text-[9px] text-emerald-300 backdrop-blur-sm">
          <div>WASD move · Space jump · Shift sprint</div>
          <div data-hud className="text-[8px] text-[#aaaacc]">y=5.0 AIR idle</div>
        </div>
      </Html>
    </>
  );
}
