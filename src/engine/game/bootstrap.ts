/**
 * game/bootstrap.ts — the game: frontier engine + three.js, nothing else.
 *
 * This is the whole game loop in one place: the planet streams in from the
 * authored world (semantic landforms, deterministic field, watertight
 * chunks), the player is the canonical controller over the SAME resident
 * meshes, and the world is gated by the WQC + Planet Constitution before a
 * single frame shows. The studio is dead — this is the product.
 */

import * as THREE from 'three';
import { PlanetMount, villageSpawn } from './planet/planet-mount';
import { GamePlayer, GameInput } from './player-mount';
import { runWorldQualityGate } from './world-quality-gate';
import { mergeChunkMeshes } from './planet/merge-meshes';

export const GAME_SEED = 89274613;

export interface GameHandle {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  player: GamePlayer;
  input: GameInput;
  planet: PlanetMount;
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

  // 2. The planet.
  const scene = new THREE.Scene();
  const planet = new PlanetMount(scene, { seed: GAME_SEED });

  // 3. Renderer + camera.
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;
  container.appendChild(renderer.domElement);

  const camera = new THREE.PerspectiveCamera(62, container.clientWidth / container.clientHeight, 0.1, 6000);

  // 4. Light.
  const sun = new THREE.DirectionalLight(0xffe4c0, 2.6);
  sun.position.set(40, 60, 30);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.camera.left = -160;
  sun.shadow.camera.right = 160;
  sun.shadow.camera.top = 160;
  sun.shadow.camera.bottom = -160;
  sun.shadow.bias = -0.0005;      // kills heightfield self-shadow acne
  sun.shadow.normalBias = 0.03;   // softens the acne further on slopes
  scene.add(sun);
  scene.add(new THREE.HemisphereLight(0xbfd8ff, 0x3a2a1a, 1.1));
  scene.add(new THREE.AmbientLight(0xffffff, 0.7));
  // atmospheric distance blending (spec 14 placeholder until the aerial
  // perspective pass): the fog far plane sits INSIDE the far-LOD ring
  // radius, so the world's edge is fully fogged into the horizon sky
  scene.fog = new THREE.Fog(0xdde5eb, 600, 2000);

  // 5. Player at the village, on the resident chunk meshes. The residency
  // must run FIRST so the spawn chunk exists before the controller's BVH.
  const spawn = villageSpawn();
  planet.update(spawn.x, spawn.z);
  const spawnY = planet.heightAt(spawn.x, spawn.z) + 1.4;
  const collisionMesh = mergeChunkMeshes(planet.chunks, planet);
  const player = new GamePlayer(collisionMesh, { x: spawn.x, y: spawnY, z: spawn.z });
  scene.add(player.body);

  // 6. Input + loop.
  const input = new GameInput(window);
  const clock = new THREE.Clock();
  let disposed = false;
  let lastChunk = planet.playerChunk(spawn.x, spawn.z);
  let rebuildTimer = 0;

  const loop = () => {
    if (disposed) return;
    requestAnimationFrame(loop);
    const dt = Math.min(0.05, clock.getDelta());
    player.update(dt, input.read(dt, 4.5, 6.5));

    // streaming: update residency, rebuild the controller's BVH when the
    // resident set changes (throttled — the BVH rebuild is bounded work)
    const p = player.controller.position;
    const chunk = planet.playerChunk(p.x, p.z);
    if (chunk !== lastChunk) {
      lastChunk = chunk;
      rebuildTimer = 0.5;
    }
    const streamResult = planet.update(p.x, p.z);
    if (rebuildTimer > 0) {
      rebuildTimer -= dt;
      if (rebuildTimer <= 0) {
        const merged = mergeChunkMeshes(planet.chunks, planet);
        if (merged.positions.length > 0) player.rebuild(merged);
      }
    }

    // over-the-shoulder camera (skip when an evidence harness holds the camera)
    if (!(window as unknown as { __FREE_CAMERA?: boolean }).__FREE_CAMERA) {
      camera.position.set(p.x - 3.2, p.y + 2.0, p.z - 3.2);
      camera.lookAt(player.lookTarget);
    }
    renderer.render(scene, camera);
  };
  loop();

  return {
    scene,
    camera,
    renderer,
    player,
    input,
    planet,
    gate,
    dispose: () => {
      disposed = true;
      renderer.dispose();
      if (renderer.domElement.parentElement === container) container.removeChild(renderer.domElement);
    },
  };
}
