/**
 * game/bootstrap.ts — the game: frontier engine + three.js, nothing else.
 *
 * This is the whole game loop in one place: terrain from the canonical
 * pipeline, player from the canonical controller, world gated by the WQC +
 * Planet Constitution before a single frame is shown. The studio is dead —
 * this is the product.
 */

import * as THREE from 'three';
import { buildWorldTerrain } from './terrain-mount';
import { GamePlayer, GameInput } from './player-mount';
import { runWorldQualityGate } from './world-quality-gate';

export const GAME_SEED = 89274613;

export interface GameHandle {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  player: GamePlayer;
  input: GameInput;
  terrain: ReturnType<typeof buildWorldTerrain>;
  gate: ReturnType<typeof runWorldQualityGate>;
  dispose: () => void;
}

/** Boot the game. Returns the live handle (null if the world fails its gate). */
export function bootGame(container: HTMLElement): GameHandle | null {
  // 1. THE GATE — the world must pass before it renders.
  const gate = runWorldQualityGate(GAME_SEED);
  if (gate.decision.disposition === 'REJECT') {
    console.error('[game] world REJECTED by quality gate:', gate.decision);
    return null;
  }

  // 2. Canonical terrain → three.js.
  const terrain = buildWorldTerrain(GAME_SEED);

  // 3. Renderer + scene.
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(62, container.clientWidth / container.clientHeight, 0.1, 400);

  const terrainMesh = new THREE.Mesh(terrain.geometry, terrain.material);
  terrainMesh.castShadow = true;
  terrainMesh.receiveShadow = true;
  scene.add(terrainMesh);

  // 4. Light (deterministic; no atmosphere pass yet — Phase 1).
  const sun = new THREE.DirectionalLight(0xffe4c0, 2.6);
  sun.position.set(40, 60, 30);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  scene.add(sun);
  scene.add(new THREE.HemisphereLight(0xbfd8ff, 0x3a2a1a, 1.1));
  scene.add(new THREE.AmbientLight(0xffffff, 0.7));

  // 5. Player on the SAME mesh the renderer draws.
  const player = new GamePlayer(terrain.meshData, terrain.result.spawn);
  scene.add(player.body);

  // 6. Input + loop.
  const input = new GameInput(window);
  const clock = new THREE.Clock();
  let disposed = false;

  const loop = () => {
    if (disposed) return;
    requestAnimationFrame(loop);
    const dt = Math.min(0.05, clock.getDelta());
    player.update(dt, input.read(dt, 4.5, 6.5));

    // over-the-shoulder camera, deterministic
    const p = player.controller.position;
    camera.position.set(p.x - 3.2, p.y + 2.0, p.z - 3.2);
    camera.lookAt(player.lookTarget);
    renderer.render(scene, camera);
  };
  loop();

  return {
    scene,
    camera,
    renderer,
    player,
    input,
    terrain,
    gate,
    dispose: () => {
      disposed = true;
      renderer.dispose();
      if (renderer.domElement.parentElement === container) container.removeChild(renderer.domElement);
    },
  };
}
