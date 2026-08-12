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
import { SLOT_MASKS } from '../game/characters/slots';

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

// ---- deterministic studio lights: warm key, cool rim, soft fill ----
const key = new THREE.DirectionalLight(0xffe4c0, 3.2);
key.position.set(-2.5, 3.2, 2.0);
key.castShadow = true;
key.shadow.mapSize.set(1024, 1024);
scene.add(key);
const rim = new THREE.DirectionalLight(0x7fb4e8, 1.6);
rim.position.set(2.6, 2.2, -2.4);
scene.add(rim);
const fill = new THREE.HemisphereLight(0xcfd6de, 0x1a1e24, 0.5);
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
const baseLoader = new GLTFLoader();
const robeLoader = new GLTFLoader();

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
const ALL_ZONES = [
  'zone_HEAD_SCALP', 'zone_NECK', 'zone_CHEST_UPPER', 'zone_CHEST_LOWER',
  'zone_BACK_UPPER', 'zone_BACK_LOWER', 'zone_SHOULDER_L', 'zone_SHOULDER_R',
  'zone_UPPER_ARM_L', 'zone_UPPER_ARM_R', 'zone_FOREARM_L', 'zone_FOREARM_R',
  'zone_HAND_L', 'zone_HAND_R', 'zone_PELVIS', 'zone_GLUTE',
  'zone_THIGH_L', 'zone_THIGH_R', 'zone_CALF_L', 'zone_CALF_R', 'zone_FOOT_L', 'zone_FOOT_R',
];
const zoneGroups: Record<string, THREE.Object3D[]> = {};
const charFace: THREE.Object3D[] = [];

function zoneParts(root: THREE.Object3D): Map<string, THREE.Object3D[]> {
  const m = new Map<string, THREE.Object3D[]>();
  root.traverse((o) => {
    // Blender dedupes repeated names with a '.001'/'-001' suffix —
    // normalize to the zone ID
    const zone = o.name && o.name.startsWith('zone_') ? o.name.replace(/[.-]?\d+$/, '') : null;
    if (zone) {
      if (!m.has(zone)) m.set(zone, []);
      m.get(zone)!.push(o);
    }
  });
  return m;
}

function applyZones(parts: Map<string, THREE.Object3D[]>): void {
  for (const [zone, objs] of parts) {
    const visible = !robeOn || !ROBE_HIDES.includes(zone);
    for (const o of objs) o.visible = visible;
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

baseLoader.load('/src/engine/game/assets/models/CHR_BaseBody_Male_A01.glb', (gltf) => {
  const base = gltf.scene;
  const parts = zoneParts(base);
  base.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (mesh.isMesh) {
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      if (mesh.name.startsWith('char_face')) charFace.push(mesh);
    }
  });
  rig = new CharacterRig(base);
  character.add(rig.root);
  applyZones(parts);
  (window as unknown as Record<string, unknown>).__gymParts = parts;
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
  [0.65, 0.0, 1.1],    // 6 face close-up
];
window.addEventListener('keydown', (e) => {
  if (e.code >= 'Digit1' && e.code <= 'Digit6') {
    const p = PRESETS[Number(e.code.slice(5)) - 1];
    orbit.yaw = p[0]; orbit.pitch = p[1]; orbit.dist = p[2];
    applyOrbit();
  }
  if (e.code === 'KeyT') turntable = !turntable;
  if (e.code === 'KeyW') walking = !walking;
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

/** The authored anatomy landmarks (world Y, meters — the builder's layout).
 * Ideal proportions (bible §3 + human canon, ~7.75 heads of 0.235 m): */
const LANDMARKS: Array<[string, number]> = [
  ['head_top', 1.83],
  ['eye', 1.71],
  ['chin', 1.64],
  ['shoulder', 1.52],
  ['chest', 1.42],
  ['navel', 1.12],
  ['hip', 1.0],
  ['crotch', 0.94],
  ['knee', 0.52],
  ['ankle', 0.09],
  ['feet', 0.0],
];

/** Project the landmarks through the camera → screen space (for the
 * proportion overlay: the fashion-croquis head-unit check). */
function landmarkScreenPositions(): Array<{ name: string; y: number; headUnits: number }> {
  const v = new THREE.Vector3();
  const out: Array<{ name: string; y: number; headUnits: number }> = [];
  camera.updateMatrixWorld();
  for (const [name, worldY] of LANDMARKS) {
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
  scene, camera, renderer, rig, character,
  orbit,
  setAngle: (i: number) => {
    const p = PRESETS[i - 1];
    orbit.yaw = p[0]; orbit.pitch = p[1]; orbit.dist = p[2];
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
    return LANDMARKS.reduce((max, [n, y]) => Math.max(max, y), 0) / 0.235;
  },
};
(window as unknown as Record<string, unknown>).__gym = gym;
(window as unknown as Record<string, unknown>).__GYM_READY = true;
