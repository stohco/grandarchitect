/**
 * PlaytestController — Simple third-person character controller
 * ==============================================================
 *
 * This provides the "in-game" experience without requiring Rapier WASM:
 * - WASD movement (camera-relative)
 * - Shift to sprint
 * - Space to jump (simple parabolic arc, no physics)
 * - Third-person over-the-shoulder camera
 * - In-game HUD overlay
 * - Tab key to summon Grand Architect
 *
 * When Rapier is available, this can be upgraded to use real physics.
 * For now, this gives the user the "I'm in the game" feeling they asked for.
 */

'use client';

import { useRef, useEffect, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { Html } from '@react-three/drei';
import { useEditorStore } from '@/lib/editor/store';

const WALK_SPEED = 5.0;
const SPRINT_SPEED = 10.0;
const JUMP_HEIGHT = 2.5;
const JUMP_DURATION = 0.6; // seconds
const CAMERA_HEIGHT = 3.5;
const CAMERA_DISTANCE = 8.0;
const CAMERA_LERP = 0.12;

export function PlaytestController() {
  const { camera } = useThree();
  const meshRef = useRef<THREE.Mesh>(null);
  const hudRef = useRef<HTMLDivElement>(null);
  const hudFrameRef = useRef(0);

  // Player state (refs — no React re-renders).
  const posRef = useRef(new THREE.Vector3(0, 0, 0));
  const velRef = useRef(new THREE.Vector3(0, 0, 0));
  const yawRef = useRef(0); // Player facing direction
  const jumpTimeRef = useRef(-1); // -1 = not jumping, >= 0 = jump progress
  const groundedRef = useRef(true);

  // Camera orbit state.
  const camYawRef = useRef(0);
  const camPitchRef = useRef(0.4);

  // Input state.
  const keysRef = useRef({ w: false, a: false, s: false, d: false, space: false, shift: false });
  const [showArchitect, setShowArchitect] = useState(false);

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
      // Tab to summon Grand Architect.
      if (k === 'tab') {
        e.preventDefault();
        setShowArchitect((prev) => !prev);
      }
      // Escape exits playtest.
      if (k === 'escape') {
        const store = useEditorStore.getState();
        store.setPlaytestMode(false);
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

    // Mouse look (pointer lock style — right-click to look).
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
      camYawRef.current -= dx * 0.005;
      camPitchRef.current = Math.max(0.1, Math.min(1.4, camPitchRef.current + dy * 0.005));
    }

    function onMouseUp(e: MouseEvent) {
      if (e.button === 2) isLooking = false;
    }

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    window.addEventListener('contextmenu', (e) => e.preventDefault());

    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, []);

  // Per-frame: movement + camera.
  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05); // Cap delta
    const keys = keysRef.current;

    // Camera-relative movement.
    const cosYaw = Math.cos(camYawRef.current);
    const sinYaw = Math.sin(camYawRef.current);

    // Forward direction (camera forward projected on XZ plane).
    const forwardX = -sinYaw;
    const forwardZ = -cosYaw;
    // Right direction.
    const rightX = cosYaw;
    const rightZ = -sinYaw;

    let moveX = 0;
    let moveZ = 0;
    if (keys.w) { moveX += forwardX; moveZ += forwardZ; }
    if (keys.s) { moveX -= forwardX; moveZ -= forwardZ; }
    if (keys.d) { moveX += rightX; moveZ += rightZ; }
    if (keys.a) { moveX -= rightX; moveZ -= rightZ; }

    const speed = keys.shift ? SPRINT_SPEED : WALK_SPEED;
    const moveLen = Math.sqrt(moveX * moveX + moveZ * moveZ);

    if (moveLen > 0.01) {
      moveX = (moveX / moveLen) * speed;
      moveZ = (moveZ / moveLen) * speed;
      // Update player facing.
      yawRef.current = Math.atan2(moveX, moveZ);
    }

    // Apply movement.
    posRef.current.x += moveX * dt;
    posRef.current.z += moveZ * dt;

    // Jump (simple parabolic arc).
    if (keys.space && groundedRef.current) {
      jumpTimeRef.current = 0;
      groundedRef.current = false;
    }

    if (jumpTimeRef.current >= 0) {
      jumpTimeRef.current += dt;
      const t = jumpTimeRef.current / JUMP_DURATION;
      if (t >= 1) {
        jumpTimeRef.current = -1;
        posRef.current.y = 0;
        groundedRef.current = true;
      } else {
        // Parabolic: y = 4 * h * t * (1 - t)
        posRef.current.y = 4 * JUMP_HEIGHT * t * (1 - t);
      }
    }

    // Update mesh.
    if (meshRef.current) {
      meshRef.current.position.set(posRef.current.x, posRef.current.y, posRef.current.z);
      meshRef.current.rotation.y = yawRef.current;

      // Color based on state.
      const mat = meshRef.current.material as THREE.MeshStandardMaterial;
      if (mat) {
        if (!groundedRef.current) {
          mat.color.set('#44aaff'); // Blue when jumping
        } else if (moveLen > 0.01) {
          mat.color.set(keys.shift ? '#00ff44' : '#00cc66'); // Green when moving
        } else {
          mat.color.set('#00aa55'); // Dark green when idle
        }
      }
    }

    // Third-person camera (over-the-shoulder).
    const camDist = CAMERA_DISTANCE;
    const camHeight = CAMERA_HEIGHT;
    const camX = posRef.current.x - sinYaw * camDist * Math.cos(camPitchRef.current);
    const camY = posRef.current.y + camHeight + Math.sin(camPitchRef.current) * camDist;
    const camZ = posRef.current.z - cosYaw * camDist * Math.cos(camPitchRef.current);

    camera.position.lerp(new THREE.Vector3(camX, camY, camZ), CAMERA_LERP);
    camera.lookAt(posRef.current.x, posRef.current.y + 1.5, posRef.current.z);

    // HUD update (throttled).
    hudFrameRef.current++;
    if (hudFrameRef.current % 6 === 0 && hudRef.current) {
      const el = hudRef.current.querySelector('[data-hud]');
      if (el) {
        const mode = !groundedRef.current ? 'AIR' : moveLen > 0.01 ? (keys.shift ? 'SPRINT' : 'WALK') : 'IDLE';
        el.textContent =
          `${mode} | pos=(${posRef.current.x.toFixed(1)}, ${posRef.current.y.toFixed(1)}, ${posRef.current.z.toFixed(1)}) | ` +
          `WASD move · Shift sprint · Space jump · RMB look · Tab architect · Esc exit`;
      }
    }
  });

  return (
    <>
      {/* Player character mesh */}
      <mesh ref={meshRef} castShadow position={[0, 0, 0]}>
        <capsuleGeometry args={[0.4, 0.9, 8, 16]} />
        <meshStandardMaterial
          color="#00cc66"
          roughness={0.4}
          metalness={0.2}
          emissive="#003322"
          emissiveIntensity={0.3}
        />
      </mesh>

      {/* In-game HUD */}
      <Html position={[0, 2.5, 0]} center distanceFactor={15} occlude={false}>
        <div ref={hudRef} className="pointer-events-none select-none whitespace-nowrap rounded bg-black/60 px-3 py-1 text-[10px] text-emerald-300 backdrop-blur-sm">
          <div data-hud className="font-mono">IDLE | pos=(0, 0, 0) | WASD move · Shift sprint · Space jump · RMB look · Tab architect · Esc exit</div>
        </div>
      </Html>

      {/* Grand Architect overlay (Tab to summon) */}
      {showArchitect && (
        <Html fullscreen>
          <div className="flex h-full w-full items-end justify-center p-8">
            <div className="w-full max-w-2xl rounded-lg border border-purple-500/30 bg-[#12122a]/95 p-4 shadow-2xl backdrop-blur-md">
              <div className="mb-2 flex items-center gap-2">
                <div className="relative flex h-4 w-4 items-center justify-center">
                  <div className="absolute inset-0 rounded-full bg-purple-500/30 animate-ping opacity-60" />
                  <svg className="relative h-3.5 w-3.5 text-purple-400" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2l1.5 5h5l-4 3.5 1.5 5L12 12l-4 3.5 1.5-5-4-3.5h5z" />
                  </svg>
                </div>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-purple-300">Grand Architect</span>
                <span className="ml-auto text-[9px] text-[#5a5a7a]">Tab to close</span>
              </div>
              <ArchitectQuickInput onSend={(msg) => {
                // Route to the architect panel's send function via store.
                // For now, show the message in the overlay.
                setShowArchitect(false);
              }} />
            </div>
          </div>
        </Html>
      )}
    </>
  );
}

/** Quick input for the Grand Architect overlay during playtest. */
function ArchitectQuickInput({ onSend }: { onSend: (msg: string) => void }) {
  const [text, setText] = useState('');
  return (
    <div className="flex gap-2">
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter' && text.trim()) { onSend(text); setText(''); } }}
        placeholder="Speak to the Architect…"
        className="h-8 flex-1 rounded border border-[#2a2a4a] bg-[#1a1a2e] px-3 text-[11px] text-[#c8c8e0] placeholder:text-[#4a4a6a] focus:border-purple-500/50 focus:outline-none"
        autoFocus
      />
      <button
        onClick={() => { if (text.trim()) { onSend(text); setText(''); } }}
        className="rounded bg-purple-600 px-3 text-[11px] text-white hover:bg-purple-500"
      >
        Send
      </button>
    </div>
  );
}
