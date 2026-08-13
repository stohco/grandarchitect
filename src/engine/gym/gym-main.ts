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
import { buildBody, buildBodyMaterials, bodyLandmarks, BODY_DEFAULTS, type BodyParams } from '../game/characters/body-factory';
import { buildWeldedBody } from '../game/characters/sdf-body';

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

// ---- deterministic studio lights: soft key, cool rim, generous fill ----
const key = new THREE.DirectionalLight(0xffe4c0, 2.4);
key.position.set(-2.5, 3.2, 2.0);
key.castShadow = true;
key.shadow.mapSize.set(1024, 1024);
scene.add(key);
const rim = new THREE.DirectionalLight(0x7fb4e8, 2.0);
rim.position.set(2.6, 2.2, -2.4);
scene.add(rim);
const fill = new THREE.HemisphereLight(0xcfd6de, 0x1a1e24, 0.85);
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

// ---- THE CODE-ONLY BODY (img2threejs method): the base is built from
// BODY_DEFAULTS at runtime — the asset editor sliders rebuild it live ----
let bodyParams: BodyParams = { ...BODY_DEFAULTS };
const bodyMats = buildBodyMaterials();

function rebuildBody(): void {
  if (rig) {
    character.remove(rig.root);
    rig.root.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (mesh.isMesh) mesh.geometry.dispose();
    });
  }
  // the img2threejs L0 core: ONE welded implicit surface (visual hull +
  // smooth SDF unions) split into zones that share a single normal pass
  const welded = buildWeldedBody(bodyParams, bodyMats);
  charFace.length = 0;
  welded.root.traverse((o) => {
    if ((o as THREE.Mesh).isMesh && o.name.startsWith('char_face')) charFace.push(o);
  });
  rig = new CharacterRig(welded.root);
  character.add(rig.root);
  applyZones(welded.zoneParts);
  (window as unknown as Record<string, unknown>).__gymParts = welded.zoneParts;
  (window as unknown as Record<string, unknown>).__gymTris = welded.triCount;
}
rebuildBody();

// ---- the ASSET EDITOR panel: live parameters + the reference pane ----
const panel = document.createElement('div');
panel.id = 'asset-editor';
panel.style.cssText = 'position:fixed;left:12px;top:12px;z-index:9;font:11px/1.5 ui-monospace,monospace;color:#cfd6de;background:#141a18e8;padding:8px 10px;border-radius:6px;border-left:2px solid #2f9a8a;max-width:230px;';
panel.innerHTML = '<b>BODY PARAMS (code-only)</b><br/><span style="color:#7ae8d0">G</span> reference pane · sliders rebuild live';
const SLIDERS: Array<[keyof BodyParams, string, number, number, number]> = [
  ['height', 'height', 1.5, 2.0, 0.01],
  ['shoulderWidth', 'shoulders', 0.36, 0.56, 0.005],
  ['chestRadius', 'chest', 0.13, 0.24, 0.005],
  ['waistRadius', 'waist', 0.1, 0.21, 0.005],
  ['hipRadius', 'hips', 0.13, 0.23, 0.005],
  ['thighRadius', 'thighs', 0.06, 0.13, 0.005],
  ['calfRadius', 'calves', 0.04, 0.09, 0.002],
  ['upperArmRadius', 'upper arm', 0.04, 0.09, 0.002],
  ['forearmRadius', 'forearm', 0.03, 0.07, 0.002],
  ['headSize', 'head', 0.09, 0.15, 0.002],
];
for (const [key, label, min, max, step] of SLIDERS) {
  const row = document.createElement('div');
  row.style.cssText = 'display:flex;align-items:center;gap:6px;margin-top:3px;';
  const name = document.createElement('span');
  name.style.cssText = 'width:62px;color:#8a7f6d;';
  name.textContent = label;
  const slider = document.createElement('input');
  slider.type = 'range';
  slider.min = String(min); slider.max = String(max); slider.step = String(step);
  slider.value = String(bodyParams[key]);
  slider.style.cssText = 'flex:1;accent-color:#2f9a8a;';
  const val = document.createElement('span');
  val.style.cssText = 'width:34px;text-align:right;color:#7ae8d0;';
  val.textContent = Number(bodyParams[key]).toFixed(3);
  slider.addEventListener('input', () => {
    (bodyParams as unknown as Record<string, number>)[key] = parseFloat(slider.value);
    val.textContent = parseFloat(slider.value).toFixed(3);
    rebuildBody();
  });
  row.append(name, slider, val);
  panel.appendChild(row);
}
document.body.appendChild(panel);

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
  return bodyLandmarks(bodyParams).map((l) => [l.name, l.y]);
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
