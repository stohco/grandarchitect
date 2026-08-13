/**
 * gym/gym-main.ts — THE CHARACTER GYM.
 *
 * A tiny isolated scene for iterating on the character in a tight causal
 * loop: one model, a studio ground, deterministic lights, and a free
 * camera that is ALWAYS unlocked (drag orbits, wheel dollies, presets
 * 1-6 frame every canonical angle). No village, no physics, no noise —
 * perfect the asset here, ship it to the game.
 *
 * Keys:
 *   1-6   angle presets (front / back / left / right / 3-4 / face)
 *   T     turntable
 *   W     walk cycle (CharacterRig) / idle
 *   R     robe (the OUTER_ROBE wearable) on/off — the base hides under it
 *   Z     cycle the body-hide zones (prove the zone system)
 *   Q/E   camera height nudge
 */

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { CharacterRig } from '../game/characters/character-rig';
import { SLOT_MASKS, ALL_ZONES as SLOT_ALL_ZONES, zoneIdOf } from '../game/characters/slots';
import { buildBody, buildBodyMaterials, bodyLandmarks, BODY_DEFAULTS } from '../game/characters/body-factory';

const container = document.getElementById('hud')!;

// ---- the studio ----
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x14161a);

const camera = new THREE.PerspectiveCamera(45, innerWidth / innerHeight, 0.05, 200);
camera.position.set(0, 1.15, 4.2);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(Math.min(2, devicePixelRatio));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
document.body.appendChild(renderer.domElement);

// ---- the painterly lighting pass (img2threejs): warm key, cool rim
// for silhouette separation, gentle fill, soft shadows ----
const key = new THREE.DirectionalLight(0xffd9a0, 2.6);
key.position.set(-2.5, 3.2, 2.0);
key.castShadow = true;
key.shadow.mapSize.set(1024, 1024);
key.shadow.radius = 6; // soft contact shadows
scene.add(key);
const rim = new THREE.DirectionalLight(0x8fc4ff, 2.4);
rim.position.set(2.6, 2.2, -2.4);
scene.add(rim);
const fill = new THREE.HemisphereLight(0xd8dce2, 0x2a2430, 0.9);
scene.add(fill);

// ---- the studio ground: a clean neutral disc ----
const ground = new THREE.Mesh(
  new THREE.CircleGeometry(3.2, 48),
  new THREE.MeshStandardMaterial({ color: 0x2a2e34, roughness: 0.9 }),
);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);
const ring = new THREE.Mesh(
  new THREE.RingGeometry(3.22, 3.26, 48),
  new THREE.MeshStandardMaterial({ color: 0x3a4048, roughness: 1 }),
);
ring.rotation.x = -Math.PI / 2;
scene.add(ring);

// ---- the character ----
const robeLoader = new GLTFLoader();
// the TripoSR-generated figure (the generator comparison lane — it stands
// to the side; preset 7 frames it)
const triposrLoader = new GLTFLoader();
const triposrFigure = new THREE.Group();
triposrFigure.position.set(4.5, 0, 0);
scene.add(triposrFigure);
triposrLoader.load('/src/engine/game/assets/models/CHR_TripoSR_A01.glb', (gltf) => {
  gltf.scene.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (mesh.isMesh) {
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      if (mesh.material) {
        const m = mesh.material as THREE.MeshStandardMaterial;
        m.side = THREE.DoubleSide; // generated meshes have no guaranteed winding
        m.roughness = 0.8;
      }
    }
  });
  // LOCAL bounds before parenting: scale to ~1.83 m tall, then place the
  // LOCAL center at the lane position (4.5, 0, 0) with feet on the floor
  const localBox = new THREE.Box3().setFromObject(gltf.scene);
  const localSize = localBox.getSize(new THREE.Vector3());
  const localCenter = localBox.getCenter(new THREE.Vector3());
  const s = 1.83 / Math.max(0.001, localSize.y);
  triposrFigure.add(gltf.scene);
  triposrFigure.scale.setScalar(s);
  triposrFigure.position.set(
    4.5 - localCenter.x * s,
    -localBox.min.y * s, // feet on the floor
    0 - localCenter.z * s,
  );
}, undefined, (e) => console.error('[triposr]', e));

let hairOn = true;

const character = new THREE.Group();
scene.add(character);

let rig: CharacterRig | null = null;
let robe: THREE.Group | null = null;
let robeOn = false;
let walking = false;
let turntable = false;
let zoneCycle = 0;

/** The zones the robe covers (the poster's OUTER_ROBE slot mask — §2). */
const ROBE_HIDES = SLOT_MASKS.OUTER_ROBE ?? [];
/** Every zone, for the Z-cycle demo. */
const ALL_ZONES: string[] = [...SLOT_ALL_ZONES];
const zoneGroups: Record<string, THREE.Object3D[]> = {};
const charFace: THREE.Object3D[] = [];

function zoneParts(root: THREE.Object3D): Map<string, THREE.Object3D[]> {
  const m = new Map<string, THREE.Object3D[]>();
  root.traverse((o) => {
    // normalize Blender dedup + feature suffixes to the zone ID
    const zone = o.name && o.name.startsWith('zone_') ? zoneIdOf(o.name) : null;
    if (zone) {
      if (!m.has(zone)) m.set(zone, []);
      m.get(zone)!.push(o);
    }
  });
  return m;
}

function applyZones(parts: Map<string, THREE.Object3D[]>): void {
  for (const [zone, objs] of parts) {
    const hiddenByRobe = robeOn && ROBE_HIDES.includes(zone);
    const hiddenByHair = hairOn && zone === 'zone_HEAD_SCALP';
    for (const o of objs) o.visible = !hiddenByRobe && !hiddenByHair;
  }
  if (zoneCycle > 0) {
    // the Z-cycle: hide everything EXCEPT one zone (prove the zones)
    const zones = ALL_ZONES;
    const target = zones[zoneCycle - 1];
    for (const [zone, objs] of parts) {
      for (const o of objs) o.visible = zone === target;
    }
  }
}

// ---- THE BODY: built from scratch in code, three.js primitives only
// (nothing custom to break) — the default body, iterated nonstop ----
const bodyMats = buildBodyMaterials();
bodyMats.skin.vertexColors = true;
function buildCharacter(): void {
  if (rig) {
    character.remove(rig.root);
    rig.root.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (mesh.isMesh) mesh.geometry.dispose();
    });
  }
  const body = buildBody(BODY_DEFAULTS, bodyMats);
  const parts = zoneParts(body);
  charFace.length = 0;
  body.traverse((o) => {
    if ((o as THREE.Mesh).isMesh && o.name.startsWith('char_face')) charFace.push(o);
  });
  rig = new CharacterRig(body);
  character.add(rig.root);
  applyZones(parts);
  (window as unknown as Record<string, unknown>).__gymParts = parts;
}
buildCharacter();

// the reference pane: the CANONICAL reference (eeeeeeeeeee.png → the
// character-reference), ghosted beside ours for the forge loop
const refPane = document.createElement('img');
refPane.src = '/evidence/refs/character-reference.png';
refPane.style.cssText = 'position:fixed;left:270px;top:12px;z-index:8;height:88vh;opacity:0.35;pointer-events:none;filter:brightness(1.1);display:none;';
document.body.appendChild(refPane);
window.addEventListener('keydown', (e) => {
  if (e.code === 'KeyG') refPane.style.display = refPane.style.display === 'none' ? 'block' : 'none';
});

robeLoader.load('/src/engine/game/assets/models/CHR_Robe_Outer_Indigo_A01.glb', (gltf) => {
  robe = gltf.scene as THREE.Group;
  robe.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (mesh.isMesh) {
      mesh.castShadow = true;
      mesh.receiveShadow = true;
    }
  });
  robe.visible = false;
  character.add(robe);
});
// the hair is now CODE (the factory's fitted scalp cap + compact topknot,
// per the canonical reference) — no oversized GLB wearable. The H key
// still toggles the whole HEAD_SCALP group.

// ---- the free camera: orbit always unlocked ----
const orbit = {
  yaw: 0.65,
  pitch: 0.14,
  dist: 4.2,
  target: new THREE.Vector3(0, 1.0, 0),
};
function applyOrbit(): void {
  const cp = Math.cos(orbit.pitch);
  camera.position.set(
    orbit.target.x + Math.sin(orbit.yaw) * cp * orbit.dist,
    orbit.target.y + Math.sin(orbit.pitch) * orbit.dist,
    orbit.target.z + Math.cos(orbit.yaw) * cp * orbit.dist,
  );
  camera.lookAt(orbit.target);
}
applyOrbit();

let dragging = false;
let lastX = 0;
let lastY = 0;
renderer.domElement.addEventListener('mousedown', (e) => {
  dragging = true;
  lastX = e.clientX;
  lastY = e.clientY;
});
window.addEventListener('mouseup', () => { dragging = false; });
window.addEventListener('mousemove', (e) => {
  if (!dragging) return;
  orbit.yaw -= (e.clientX - lastX) * 0.005;
  orbit.pitch = Math.max(-1.2, Math.min(1.2, orbit.pitch + (e.clientY - lastY) * 0.004));
  lastX = e.clientX;
  lastY = e.clientY;
  applyOrbit();
});
window.addEventListener('wheel', (e) => {
  orbit.dist = Math.max(1.2, Math.min(12, orbit.dist * (e.deltaY > 0 ? 1.08 : 0.93)));
  applyOrbit();
}, { passive: true });

/** Canonical angle presets (tight framing — the character fills the frame). */
const PRESETS: Array<[number, number, number]> = [
  [0.65, 0.12, 2.6],   // 1 front (slight 3-4)
  [-2.5, 0.12, 2.6],   // 2 back
  [Math.PI / 2, 0.12, 2.6], // 3 left
  [-Math.PI / 2, 0.12, 2.6], // 4 right
  [1.9, 0.12, 2.9],    // 5 three-quarter
  [0.65, 0.0, 0.9],    // 6 face close-up
  [0.65, 0.1, 2.9],    // 7 the TripoSR comparison figure
];
window.addEventListener('keydown', (e) => {
  if (e.code >= 'Digit1' && e.code <= 'Digit6') {
    const p = PRESETS[Number(e.code.slice(5)) - 1];
    orbit.yaw = p[0]; orbit.pitch = p[1]; orbit.dist = p[2];
    applyOrbit();
  }
  if (e.code === 'KeyT') turntable = !turntable;
  if (e.code === 'KeyW') walking = !walking;
  if (e.code === 'KeyH') {
    hairOn = !hairOn;
    const parts = (window as unknown as Record<string, unknown>).__gymParts as Map<string, THREE.Object3D[]> | undefined;
    if (parts) applyZones(parts);
  }
  if (e.code === 'KeyR' && robe) {
    robeOn = !robeOn;
    robe.visible = robeOn;
    const parts = (window as unknown as Record<string, unknown>).__gymParts as Map<string, THREE.Object3D[]> | undefined;
    if (parts) applyZones(parts);
  }
  if (e.code === 'KeyZ') {
    zoneCycle = (zoneCycle + 1) % (ALL_ZONES.length + 1);
    const parts = (window as unknown as Record<string, unknown>).__gymParts as Map<string, THREE.Object3D[]> | undefined;
    if (parts) applyZones(parts);
  }
  if (e.code === 'KeyQ') { orbit.target.y -= 0.15; applyOrbit(); }
  if (e.code === 'KeyE') { orbit.target.y += 0.15; applyOrbit(); }
});

// ---- the loop ----
const clock = new THREE.Clock();
let elapsed = 0;
function loop(): void {
  requestAnimationFrame(loop);
  const dt = Math.min(0.05, clock.getDelta());
  elapsed += dt;
  if (turntable) {
    orbit.yaw += dt * 0.35;
    applyOrbit();
  }
  if (rig) rig.update(dt, walking ? 1.4 : 0, 0);
  renderer.render(scene, camera);
  const robeState = robeOn ? 'robe ON' : 'robe OFF';
  const walkState = walking ? 'walking' : 'idle';
  const zoneState = zoneCycle > 0 ? `zone ${ALL_ZONES[zoneCycle - 1]} only` : 'all zones';
  container.innerHTML =
    `<b>CHARACTER GYM</b> — perfect the base, ship it\n` +
    `1-6 angles · T turntable · W walk · R ${robeState} · Z zones (${zoneState}) · Q/E height\n` +
    `drag orbit · wheel dolly · ${walkState}`;
  (window as unknown as Record<string, unknown>).__gymElapsed = elapsed;
}
loop();

window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

/** The authored anatomy landmarks — DERIVED from the live body params
 * (img2threejs: measured head-units, not assumed ones). */
function landmarkList(): Array<[string, number]> {
  return bodyLandmarks(BODY_DEFAULTS).map((l) => [l.name, l.y]);
}

/** Project the landmarks through the camera → screen space (for the
 * proportion overlay: the fashion-croquis head-unit check). */
function landmarkScreenPositions(): Array<{ name: string; y: number; headUnits: number }> {
  const v = new THREE.Vector3();
  const out: Array<{ name: string; y: number; headUnits: number }> = [];
  camera.updateMatrixWorld();
  for (const [name, worldY] of landmarkList()) {
    v.set(0, worldY, 0).project(camera);
    out.push({
      name,
      y: (0.5 - v.y * 0.5) * innerHeight,
      headUnits: worldY / 0.235,
    });
  }
  return out;
}

// ---- the evidence harness surface ----
const gym = {
  scene, camera, renderer, character,
  /** The rig arrives async — expose it as a getter, not a stale value. */
  get rig(): CharacterRig | null { return rig; },
  orbit,
  setAngle: (i: number) => {
    const p = PRESETS[i - 1];
    orbit.yaw = p[0]; orbit.pitch = p[1]; orbit.dist = p[2];
    // preset 7 frames the TripoSR comparison figure
    orbit.target.set(i === 7 ? 4.5 : 0, 1.0, 0);
    applyOrbit();
  },
  setRobe: (on: boolean) => {
    if (!robe) return;
    robeOn = on;
    robe.visible = on;
    const parts = (window as unknown as Record<string, unknown>).__gymParts as Map<string, THREE.Object3D[]> | undefined;
    if (parts) applyZones(parts);
  },
  setWalk: (on: boolean) => { walking = on; },
  get walkState() { return rig ? rig.stateHash() : 'no-rig'; },
  get zones(): string[] {
    const parts = (window as unknown as Record<string, unknown>).__gymParts as Map<string, THREE.Object3D[]> | undefined;
    return parts ? [...parts.keys()] : [];
  },
  /** The head-unit proportion check (fashion-croquis method). */
  get landmarks() { return landmarkScreenPositions(); },
  get headUnits(): number {
    return landmarkList().reduce((max, [, y]) => Math.max(max, y), 0) / 0.235;
  },
};
(window as unknown as Record<string, unknown>).__gym = gym;
(window as unknown as Record<string, unknown>).__GYM_READY = true;
