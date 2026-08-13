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
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { buildBody, buildBodyMaterials, BODY_DEFAULTS } from './characters/body-factory';
import { PlanetMount, villageSpawn } from './planet/planet-mount';
import { GamePlayer, GameInput } from './player-mount';
import { runWorldQualityGate } from './world-quality-gate';
import { mergeChunkMeshes } from './planet/merge-meshes';
import { mountVillage } from './village/village-mount';
import { buildVillagers, nearestVillager, broadcastRaid } from './village/villagers';
import { RaidVisuals } from './village/raid-visuals';
import { SkyDome } from './sky';
import { PlanetTimeSystem } from './time/planet-time';
import { Inventory, ITEMS } from './inventory';
import { EditorRegistry } from './editor/types';
import { registerVillageComponents, registerVillagerComponents } from './editor/registry';
import { SelectionManager } from './editor/selection';
import { TerrainEditStore } from './editor/terrain-edit';
import { EditorPanel } from './editor/panel';
import { FlyCamera } from './editor/fly-camera';
import { GltfAssetLibrary, PLACED_ASSETS } from './assets/gltf-assets';
import { AssetAnimation } from './assets/asset-animation';
import { WorldValidator, BurialLedger } from './editor/world-validator';
import { exportWorld, downloadWorld } from './editor/world-export';
import { Cinematic } from './cinematic/cinematic';
import { TRAILER_SHOTS } from './cinematic/trailer';
import { Director } from './cinematic/director';
import { recordTrailer, downloadTrailer } from './cinematic/recording';

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
  time: PlanetTimeSystem;
  inventory: Inventory;
  sky: SkyDome;
  raidVisuals: RaidVisuals;
  editor: { on: boolean; registry: InstanceType<typeof EditorRegistry>; selection: SelectionManager; terrain: TerrainEditStore; panel: EditorPanel; dragging: boolean };
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
  const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;
  container.appendChild(renderer.domElement);

  const camera = new THREE.PerspectiveCamera(62, container.clientWidth / container.clientHeight, 0.1, 6000);

  // 3b. The living sky, driven by LOCAL solar time.
  const sky = new SkyDome(scene);

  // 4. Light (the sun follows the local sky each frame).
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
  // radius, so the world's edge is fully fogged into the horizon sky.
  // The fog color follows the sky's horizon band (day/dusk/night).
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

  // 5c. The village's people — on the frontier cognition. The planet's time
  // is LOCAL: villagers live by the time at their own longitude.
  const time = new PlanetTimeSystem();
  const inventory = new Inventory();
  const villagers = buildVillagers(planet.field, scene);
  // the player begins with the seed of a good deed
  inventory.add('wolf_fang', 3);

  // 5d. The wolves at the fence — visible when the raid fires.
  const raidVisuals = new RaidVisuals(scene, planet.field);
  let raidActive = false;

  // 5e. THE EDITOR — Blender-style in-world editing (Tab to toggle).
  // Every authored component is selectable and parameter-editable; the
  // terrain has a brush with replayable deltas; gizmos move things.
  const editorRegistry = new EditorRegistry();
  registerVillageComponents(editorRegistry, village, { x: spawn.x, z: spawn.z });
  // the character: the player wears the BASE BODY (nothing equipped) —
  // the player wears the code-built DEFAULT BODY (the forge's current
  // pass — measured proportions, painterly shading, continuous lofts)
  player.heightAt = (x, z) => planet.heightAt(x, z);
  const bodyMats = buildBodyMaterials();
  bodyMats.skin.vertexColors = true;
  const body = buildBody(BODY_DEFAULTS, bodyMats);
  player.setModel(body);
  // the villagers keep the clothed villager (they are NPCs; the base is
  // the player's staging)
  const villagerClothLoader = new GLTFLoader();
  villagerClothLoader.load('/src/engine/game/assets/models/CHR_Villager_Robe_A01.glb', (gltf) => {
    for (const v of villagers) v.wearModel(gltf.scene);
  }, undefined, (err) => console.error('[villager]', err));
  registerVillagerComponents(editorRegistry, villagers);
  // GATE 5: the Blender-built assets enter the world (sacred pine at the
  // shrine's spirit node), animated by the wind + the dusk glow
  const assetAnimation = new AssetAnimation();
  const placedAssets: Array<Awaited<ReturnType<typeof GltfAssetLibrary.place>>> = [];
  (async () => {
    for (const def of PLACED_ASSETS) {
      try {
        const comp = await GltfAssetLibrary.place(def, scene, planet, editorRegistry, assetAnimation);
        if (comp) placedAssets.push(comp);
      } catch (err) {
        console.error('[assets]', def.id, err);
      }
    }
  })();
  const selection = new SelectionManager(editorRegistry, scene, camera, renderer.domElement);
  const terrainStore = new TerrainEditStore(planet.field, planet);
  const editorPanel = new EditorPanel(selection, editorRegistry, terrainStore, planet, camera, renderer.domElement);
  const editor = {
    registry: editorRegistry,
    selection,
    terrain: terrainStore,
    panel: editorPanel,
    on: false,
    /** Set true while the gizmo drags (the loop pauses player input). */
    dragging: false,
  };
  (editor as unknown as { animation: AssetAnimation }).animation = assetAnimation;
  // the multiverse law-checker + the world-as-data export
  const burialLedger = new BurialLedger();
  const validator = new WorldValidator(editorRegistry, planet, terrainStore, burialLedger);
  let lastValidation: ReturnType<typeof validator.validate> | null = null;
  (editor as unknown as { validator: WorldValidator; ledger: BurialLedger; exportWorld: () => string }).validator = validator;
  (editor as unknown as { validator: WorldValidator; ledger: BurialLedger; exportWorld: () => string }).ledger = burialLedger;
  (editor as unknown as { validator: WorldValidator; ledger: BurialLedger; exportWorld: () => string }).exportWorld = () => {
    const report = validator.validate();
    lastValidation = report;
    const json = exportWorld(editorRegistry, terrainStore, burialLedger, report);
    return downloadWorld(json);
  };
  editorPanel.setValidator(validator, burialLedger);

  // rebuild the player's collision after a terrain edit
  const rebuildCollision = () => {
    const merged = mergeChunkMeshes(planet.chunks, planet);
    if (merged.positions.length > 0) player.rebuild(merged);
  };
  selection.onDragging = (d) => { editor.dragging = d; };
  selection.onChanged = () => { if (editor.dragging) rebuildCollision(); };
  let lastPaint = 0;
  // the god's-eye flight camera (edit mode): WASD fly, left-drag look,
  // Q/E up/down, Shift sprint, wheel speed. Replaces the old orbit pivot.
  const flyCamera = new FlyCamera(camera, renderer.domElement);
  (editor as unknown as { fly: FlyCamera }).fly = flyCamera;
  (editor as unknown as { fly: FlyCamera; flyTo: (x: number, y: number, z: number, lx: number, ly: number, lz: number) => void }).flyTo = (x, y, z, lx, ly, lz) => {
    flyCamera.flyTo(x, y, z, lx, ly, lz);
  };
  // the free camera: press V anywhere to unlock the camera and fly (WASD
  // move, left-drag look, Q/E down/up, Shift sprint, wheel speed; V or ESC
  // returns to the over-the-shoulder camera). The god's eye is how we
  // look at the world from every angle — for edits and for inspections.
  let freeCameraActive = false;
  const freeHint = document.createElement('div');
  freeHint.style.cssText = 'position:fixed;left:12px;bottom:12px;z-index:99;font:12px/1.6 ui-monospace,monospace;color:#ffd9a0;background:#1a1612e0;padding:6px 10px;border-radius:6px;pointer-events:none;display:none;';
  freeHint.textContent = 'FREE CAMERA — WASD move · drag look · Q/E down/up · Shift sprint · wheel speed · V/ESC to return';
  document.body.appendChild(freeHint);
  window.addEventListener('keydown', (e) => {
    if (e.code === 'KeyV' && !editor.on) {
      freeCameraActive = !freeCameraActive;
      flyCamera.setEnabled(freeCameraActive);
      freeHint.style.display = freeCameraActive ? 'block' : 'none';
      if (freeCameraActive) flyCamera.flyTo(
        camera.position.x, camera.position.y, camera.position.z,
        player.lookTarget.x, player.lookTarget.y, player.lookTarget.z,
      );
    }
    if (e.code === 'Escape' && freeCameraActive) {
      freeCameraActive = false;
      flyCamera.setEnabled(false);
      freeHint.style.display = 'none';
    }
    if (freeCameraActive) return; // while flying, the editor keys stand down
    if (e.code === 'Tab') {
      e.preventDefault();
      editor.on = !editor.on;
      selection.setEnabled(editor.on);
      flyCamera.setEnabled(editor.on);
      editorPanel.setEditMode(editor.on);
      if (editor.on) {
        // rise into the god's eye above the selection or the village
        const pivot = selection.selected[0]
          ? selection.selected[0].bounds.getCenter(new THREE.Vector3())
          : new THREE.Vector3(spawn.x, spawnY, spawn.z);
        flyCamera.flyTo(pivot.x, pivot.y + 26, pivot.z - 14, pivot.x, pivot.y, pivot.z + 4);
      }
    }
    if (!editor.on) return;
    if (e.code === 'KeyW') selection.setMode('translate');
    if (e.code === 'KeyE') selection.setMode('rotate');
    if (e.code === 'KeyR') selection.setMode('scale');
    if (e.code === 'KeyU') { terrainStore.undo(); rebuildCollision(); }
    if (e.code === 'F6') {
      e.preventDefault();
      const report = validator.validate();
      lastValidation = report;
      editorPanel.showValidation(report);
    }
    if (e.code === 'KeyS' && e.ctrlKey) {
      e.preventDefault();
      (editor as unknown as { exportWorld: () => string }).exportWorld();
    }
    if (e.code === 'KeyB') {
      // B: bury the selected component (legitimate burial — emergence)
      for (const c of selection.selected) {
        burialLedger.bury(c.id, 'buried by the user in edit mode (emergence)');
      }
    }
  });
  renderer.domElement.addEventListener('dblclick', (e) => {
    if (!editor.on) return;
    const c = selection.click((e.clientX / window.innerWidth) * 2 - 1, -(e.clientY / window.innerHeight) * 2 + 1);
    if (c) editorPanel.render();
  });
  renderer.domElement.addEventListener('mousedown', (e) => {
    if (!editor.on) return;
    if (e.button === 2) { selection.startMarquee(e.clientX, e.clientY); return; }
    if (e.button === 0) {
      const c = selection.click((e.clientX / window.innerWidth) * 2 - 1, -(e.clientY / window.innerHeight) * 2 + 1);
      if (!c) { /* empty ground: fly-look drag handles it */ }
    }
  });
  window.addEventListener('mousemove', (e) => {
    if (!editor.on) return;
    if (e.buttons & 2) { selection.updateMarquee(e.clientX, e.clientY); return; }
    if (editor.dragging) return;
    if ((e.buttons & 1) === 0) return;
    // painting the terrain brush with the left button on empty ground
    const now = performance.now();
    if (now - lastPaint > 90) {
      lastPaint = now;
      editorPanel.paintAt(e.clientX, e.clientY);
      rebuildCollision();
    }
  });
  window.addEventListener('mouseup', (e) => {
    if (!editor.on) return;
    if (e.button === 2) selection.endMarquee(e.clientX, e.clientY);
  });
  window.addEventListener('wheel', (e) => {
    if (!editor.on && !freeCameraActive) return;
    flyCamera.wheel(e.deltaY);
  }, { passive: true });

  // 6. Input + loop.
  const input = new GameInput(window);
  const clock = new THREE.Clock();
  let disposed = false;
  let lastChunk = planet.playerChunk(spawn.x, spawn.z);
  let rebuildTimer = 0;
  let lastLine = '';
  let tick = 0;
  // the poster's render budget counter (IMAGE_DIRECTIVES §5: <1500 draw
  // calls, <5M tris) — absent in pages without the HUD (the gym)
  const perfEl = document.getElementById('perf');

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
    // camera-relative movement: W always walks away from the camera, D
    // strafes to the camera's right — the controls follow your eyes
    const raw = input.read(dt, 4.5, 6.5);
    if (freeCameraActive) {
      player.update(dt, { ...raw, moveSpeed: 0, moveX: 0, moveZ: 0 }); // the fly cam owns the keys
    } else {
      const fwd = new THREE.Vector3();
      camera.getWorldDirection(fwd);
      fwd.y = 0;
      fwd.normalize();
      const rx = -fwd.z, rz = fwd.x;
      player.update(dt, {
        ...raw,
        moveX: rx * raw.moveX - fwd.x * raw.moveZ,
        moveZ: rz * raw.moveX - fwd.z * raw.moveZ,
      });
    }

    // the planet turns; the village lives by its local sky
    const tod = time.update(dt);
    for (const v of villagers) v.update(dt, time);
    // streaming: update residency, rebuild the controller's BVH when the
    // resident set changes (throttled — the BVH rebuild is bounded work)
    const p = player.controller.position;
    // the sun follows the player's LOCAL solar time (physics: the sun is
    // fixed; the planet turns under it — longitude shifts the local day)
    const localDir = time.sunDirectionAt(p.x, p.z);
    const localElev = time.sunElevationAt(p.x, p.z);
    sun.position.set(p.x + localDir.x * 300, Math.max(localDir.y, 0.05) * 300 + 40, p.z + localDir.z * 300);
    sun.intensity = 0.15 + Math.max(0, localElev) * 3.0;
    sun.color.setRGB(1.0, Math.max(0.4, 0.62 * Math.max(0.2, localElev)), Math.max(0.2, 0.25 * Math.max(0.2, localElev)));
    // the sky + fog follow the local sky; night brings the stars, the moon,
    // and lantern-warm windows
    const localTime = time.localTimeAt(p.x, p.z);
    sky.update(localTime, localDir);
    scene.fog!.color.copy(sky.fogColor(localTime, localElev));
    const nightFactor = 1 - THREE.MathUtils.smoothstep(localElev, -0.04, 0.18);
    village.materials.window.emissiveIntensity = nightFactor * 0.9;
    // nightfall: the wolves test the fence (once per night, local)
    if (time.isNightAt(p.x, p.z) && tick % 600 === 0) {
      broadcastRaid(villagers, tick);
      raidVisuals.trigger();
      raidActive = true;
    }
    if (raidActive && !time.isNightAt(p.x, p.z)) {
      raidVisuals.end();
      raidActive = false;
    }
    raidVisuals.update(dt);

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

    // over-the-shoulder camera (skip when a harness or the free camera holds it)
    if (!(window as unknown as { __FREE_CAMERA?: boolean }).__FREE_CAMERA && !editor.on && !freeCameraActive) {
      camera.position.set(p.x - 3.2, p.y + 2.0, p.z - 3.2);
      // ground clamp: the chase cam never dives under the terrain on a
      // slope or bank — it rides just above the ground beneath it
      const camGround = planet.heightAt(camera.position.x, camera.position.z) + 0.5;
      if (camera.position.y < camGround) camera.position.y = camGround;
      camera.lookAt(player.lookTarget);
    }
    if (editor.on || freeCameraActive) {
      flyCamera.setEnabled(true);
      flyCamera.update(dt);
    } else {
      flyCamera.setEnabled(false);
    }
    // the placed assets live: wind + the dusk glow
    if (assetAnimation) {
      const elev = Math.max(0, time.sunElevationAt(p.x, p.z));
      const duskFactor = Math.exp(-(elev * elev) * 120) * (1 - elev * 0.5);
      assetAnimation.update(dt, duskFactor);
    }

    if (activeCinematic && activeCinematic.active) {
      activeCinematic.update(dt);
      // the cinematic owns the camera and the shot clock
    }
    renderer.render(scene, camera);
    // poster budget readout (IMAGE_DIRECTIVES §5) — every 30 ticks
    if (perfEl && tick % 30 === 0) {
      perfEl.textContent = `draws ${renderer.info.render.calls} · tris ${renderer.info.render.triangles}`;
    }
  };
  const handle: GameHandle = {
    scene,
    camera,
    renderer,
    player,
    input,
    planet,
    village,
    villagers,
    time,
    inventory,
    sky,
    raidVisuals,
    editor,
    gate,
    lastLine,
    dispose: () => {
      disposed = true;
      renderer.dispose();
      if (renderer.domElement.parentElement === container) container.removeChild(renderer.domElement);
    },
  };
  // 5f. THE TRAILER — the draft film for the video model. F7 records the
  // panoramic to a WebM download; F8 is the DIRECTOR'S CUT: compose ->
  // record -> review -> director's notes (the video model's briefing).
  let activeCinematic: Cinematic | null = null;
  const director = new Director();
  const cinematic = new Cinematic(director.compose());
  (editor as unknown as { cinematic: Cinematic; director: Director; play: (c: Cinematic) => void }).cinematic = cinematic;
  (editor as unknown as { cinematic: Cinematic; director: Director; play: (c: Cinematic) => void }).director = director;
  (editor as unknown as { cinematic: Cinematic; director: Director; play: (c: Cinematic) => void }).play = (c) => { activeCinematic = c; };
  // recordDirectorCut: compose -> record -> review, returns the draft for
  // the video model (used by F8 and by the evidence harness). Fire-and-
  // forget: startDirectorCut sets editor.cutDone when finished.
  const cutState: { active: boolean; done: { blob: Blob; blobBase64: string; manifest: unknown; notes: unknown; samples: number } | null } = { active: false, done: null };
  (editor as unknown as { cutState: typeof cutState }).cutState = cutState;
  (editor as unknown as { startDirectorCut: (scale?: number, maxShots?: number) => void }).startDirectorCut = (scale = 0.3, maxShots = Infinity) => {
    if (cutState.active) return;
    cutState.active = true;
    cutState.done = null;
    editor.on = false;
    selection.setEnabled(false);
    flyCamera.setEnabled(false);
    editorPanel.setEditMode(false);
    const shots = director.compose(scale).slice(0, maxShots);
    const cutCinematic = new Cinematic(shots);
    activeCinematic = cutCinematic;
    recordTrailer(handle, cutCinematic, 10).then(async ({ blob, manifest, samples }) => {
      const notes = director.review(samples);
      const buf = await blob.arrayBuffer();
      const bytes = new Uint8Array(buf);
      let bin = '';
      for (let i = 0; i < bytes.length; i += 8192) {
        bin += String.fromCharCode(...bytes.subarray(i, i + 8192));
      }
      cutState.done = { blob, blobBase64: btoa(bin), manifest, notes, samples: samples.length };
      cutState.active = false;
    }).catch((err) => { console.error('[director]', err); cutState.active = false; });
  };
  let recording = false;
  window.addEventListener('keydown', (e) => {
    if (recording) return;
    if (e.code === 'F7') {
      e.preventDefault();
      recording = true;
      editor.on = false;
      selection.setEnabled(false);
      flyCamera.setEnabled(false);
      editorPanel.setEditMode(false);
      recordTrailer(handle, cinematic, 30).then(({ blob, manifest }) => {
        downloadTrailer(blob, manifest);
        recording = false;
      }).catch((err) => { console.error('[trailer]', err); recording = false; });
    }
    if (e.code === 'F8') {
      e.preventDefault();
      recording = true;
      editor.on = false;
      selection.setEnabled(false);
      flyCamera.setEnabled(false);
      editorPanel.setEditMode(false);
      const cutCinematic = new Cinematic(director.compose());
      recordTrailer(handle, cutCinematic, 30).then(({ blob, manifest, samples }) => {
        const notes = director.review(samples);
        downloadTrailer(blob, manifest, notes);
        const passCount = notes.filter((n) => n.verdict === 'pass').length;
        const issues = notes.filter((n) => n.verdict === 'note').length;
        console.log(`[director] cut recorded: ${passCount}/${notes.length} beats pass, ${issues} with notes.`);
        for (const n of notes) {
          if (n.notes.length) console.log(`[director] ${n.shotId}: ${n.notes.join(' | ')}`);
        }
        recording = false;
      }).catch((err) => { console.error('[director]', err); recording = false; });
    }
  });
  loop();
  return handle;
}
