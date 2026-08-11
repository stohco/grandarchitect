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
import { mountVillage } from './village/village-mount';
import { buildVillagers, nearestVillager, broadcastRaid } from './village/villagers';
import { GameClock } from './game-clock';
import { Inventory, ITEMS } from './inventory';

export const GAME_SEED = 89274613;

export interface GameHandle {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  player: GamePlayer;
  input: GameInput;
  planet: PlanetMount;
  village: ReturnType<typeof mountVillage>;
  villagers: ReturnType<typeof buildVillagers>;
  clock: GameClock;
  inventory: Inventory;
  gate: ReturnType<typeof runWorldQualityGate>;
  /** Last interaction line (HUD). */
  lastLine: string;
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
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -90;
  sun.shadow.camera.right = 90;
  sun.shadow.camera.top = 90;
  sun.shadow.camera.bottom = -90;
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

  // 5b. The village — the mundane world on the valley floor.
  const village = mountVillage(planet, scene);

  // 5c. The village's people — on the frontier cognition.
  const engineClock = new GameClock();
  const inventory = new Inventory();
  const villagers = buildVillagers(planet.field, scene);
  // the player begins with the seed of a good deed
  inventory.add('wolf_fang', 3);

  // 6. Input + loop.
  const input = new GameInput(window);
  const clock = new THREE.Clock();
  let disposed = false;
  let lastChunk = planet.playerChunk(spawn.x, spawn.z);
  let rebuildTimer = 0;
  let lastLine = '';
  let tick = 0;

  // E: talk to the nearest villager (favor first, then plain talk)
  window.addEventListener('keydown', (e) => {
    if (disposed || e.code !== 'KeyE') return;
    const p = player.controller.position;
    const v = nearestVillager(villagers, p.x, p.z, 4);
    if (!v) return;
    if (v.favor) {
      const r = v.fulfill(inventory);
      lastLine = r.line;
    } else {
      lastLine = `${v.name} (${v.role}): "${v.talk()}"`;
    }
  });

  const loop = () => {
    if (disposed) return;
    requestAnimationFrame(loop);
    const dt = Math.min(0.05, clock.getDelta());
    tick++;
    player.update(dt, input.read(dt, 4.5, 6.5));

    // the day advances; the village lives it
    const tod = engineClock.update(dt);
    const phase = engineClock.phase;
    for (const v of villagers) v.update(dt, phase, tick);
    // nightfall: the wolves test the fence (once per night)
    if (engineClock.isNight && tick % 600 === 0) {
      broadcastRaid(villagers, tick);
    }

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
    village,
    villagers,
    clock: engineClock,
    inventory,
    gate,
    lastLine,
    dispose: () => {
      disposed = true;
      renderer.dispose();
      if (renderer.domElement.parentElement === container) container.removeChild(renderer.domElement);
    },
  };
}
