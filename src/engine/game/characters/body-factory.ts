/**
 * game/characters/body-factory.ts — the character body as PURE CODE.
 *
 * The img2threejs method: rebuild the reference as a code-only procedural
 * three.js model, driven by MEASURED parameters (head-units, widths,
 * tapers), editable live in the gym's asset editor. The body is a lofted
 * profile — elliptical rings at every landmark, quads between them,
 * smooth normals — deterministic for a given param set. Zones carry the
 * bible's body-hide IDs so the rig and the equipment masks keep working.
 */

import * as THREE from 'three';

export interface Slice {
  /** ring height (meters) */
  y: number;
  /** radius along X (side-to-side) */
  rx: number;
  /** radius along Z (front-to-back) */
  rd: number;
  /** forward shift (+Z — the face direction) */
  yf: number;
}

export interface BodyParams {
  height: number;
  /** acromion-to-acromion */
  shoulderWidth: number;
  chestRadius: number;
  waistRadius: number;
  hipRadius: number;
  thighRadius: number;
  calfRadius: number;
  upperArmRadius: number;
  forearmRadius: number;
  headSize: number;
  neckRadius: number;
}

/** The MEASURED defaults (the reference figure: ~8.3 HU, slender, lean —
 * widths and tapers measured from the reference crop, in fractions of
 * height; see evidence/character-forge/intake.md). */
export const BODY_DEFAULTS: BodyParams = {
  height: 1.82,
  shoulderWidth: 0.4,   // ref: 0.22 × height
  chestRadius: 0.164,   // ref: 0.18 × height / 2
  waistRadius: 0.109,   // ref: 0.12 × height / 2 — the dramatic pinch
  hipRadius: 0.136,     // ref: 0.15 × height / 2
  thighRadius: 0.073,   // ref: 0.08 × height / 2
  calfRadius: 0.055,    // ref: 0.06 × height / 2
  upperArmRadius: 0.054,
  forearmRadius: 0.044,
  headSize: 0.105,      // ref: ~8.3 HU — a longer, narrower head
  neckRadius: 0.045,
};

export interface BodyMaterials {
  skin: THREE.MeshStandardMaterial;
  hair: THREE.MeshStandardMaterial;
  eye: THREE.MeshStandardMaterial;
  brow: THREE.MeshStandardMaterial;
  under: THREE.MeshStandardMaterial;
}

export function buildBodyMaterials(): BodyMaterials {
  return {
    // the reference: fair/pale cool skin (#F5E8D3 measured), black hair,
    // WHITE underwear (the reference's briefs are white, down the thigh)
    skin: new THREE.MeshStandardMaterial({ color: 0xf5e8d3, roughness: 0.7 }),
    hair: new THREE.MeshStandardMaterial({ color: 0x1c1816, roughness: 0.88 }),
    eye: new THREE.MeshStandardMaterial({ color: 0x070707, roughness: 0.2 }),
    brow: new THREE.MeshStandardMaterial({ color: 0x181512, roughness: 0.9 }),
    under: new THREE.MeshStandardMaterial({ color: 0xe6e2da, roughness: 0.9 }),
  };
}

/** Loft a profile of elliptical rings into a smooth BufferGeometry.
 * half: null | 'front' | 'back' — the torso splits into chest/back. */
function loftGeometry(
  slices: Slice[],
  segments: number,
  half: 'front' | 'back' | null,
  xo = 0,
): THREE.BufferGeometry {
  let idx: number[];
  if (half === null) idx = Array.from({ length: segments }, (_, i) => i);
  else if (half === 'front') idx = Array.from({ length: segments / 2 + 2 }, (_, i) => i);
  else {
    const list: number[] = [];
    for (let i = segments / 2 - 1; i < segments; i++) list.push(i);
    list.push(0, 1);
    idx = list;
  }
  const rings: THREE.Vector3[][] = slices.map((s) =>
    idx.map((i) => {
      const a = (i / segments) * Math.PI * 2;
      return new THREE.Vector3(xo + s.rx * Math.cos(a), s.y, s.yf + s.rd * Math.sin(a));
    }),
  );
  const verts: number[] = [];
  const faces: number[] = [];
  const ringStart: number[] = [];
  for (const ring of rings) {
    ringStart.push(verts.length / 3);
    for (const v of ring) verts.push(v.x, v.y, v.z);
  }
  for (let k = 0; k < rings.length - 1; k++) {
    const lo = ringStart[k], hi = ringStart[k + 1], n = idx.length - 1;
    for (let i = 0; i < n; i++) {
      faces.push(lo + i, lo + i + 1, hi + i + 1, hi + i);
    }
  }
  // caps: fan-triangulated around a pole at the ring center
  for (const k of [0, rings.length - 1]) {
    const pole = verts.length / 3;
    const s = slices[k];
    verts.push(xo, s.y, s.yf);
    const start = ringStart[k], n = idx.length;
    if (half === null) {
      for (let i = 0; i < n; i++) {
        const a = start + (i % n), b = start + ((i + 1) % n);
        faces.push(pole, a, b);
      }
    } else {
      for (let i = 0; i < n - 1; i++) faces.push(pole, start + i, start + i + 1);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
  geo.setIndex(faces);
  geo.computeVertexNormals();
  return geo;
}

function part(group: THREE.Group, name: string, geo: THREE.BufferGeometry, mat: THREE.Material): void {
  const mesh = new THREE.Mesh(geo, mat);
  mesh.name = name;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  group.add(mesh);
}

/**
 * Build the whole body as code. Deterministic: same params → same mesh.
 * All 22 zone IDs are present so the rig + SLOT_MASKS work unchanged.
 */
export function buildBody(params: BodyParams, mats: BodyMaterials): THREE.Group {
  const H = params.height;
  const f = (v: number) => v * H / 1.82; // profile is authored at 1.82 m
  const g = new THREE.Group();
  g.name = 'body_code';

  const S = f(0.095); // leg half-spacing
  const A = params.shoulderWidth / 2; // acromion half-width
  const make = (
    name: string, slices: Slice[], mat: THREE.Material,
    half: 'front' | 'back' | null = null, xo = 0, segments = 16,
  ) => part(g, name, loftGeometry(slices, segments, half, xo), mat);

  const skin = mats.skin, hair = mats.hair, eye = mats.eye, brow = mats.brow, under = mats.under;

  // feet: sloped wedges, toes forward
  for (const [side, sgn] of [['L', -1], ['R', 1]] as const) {
    make(`zone_FOOT_${side}`, [
      { y: f(0.0), rx: f(0.046), rd: f(0.036), yf: f(0.16) },
      { y: f(0.03), rx: f(0.048), rd: f(0.04), yf: f(0.1) },
      { y: f(0.06), rx: f(0.05), rd: f(0.042), yf: f(0.05) },
      { y: f(0.09), rx: f(0.046), rd: f(0.04), yf: 0 },
    ], skin, null, sgn * S);
  }
  // calves (overlap the thighs at the knee — no seam spheres)
  for (const [side, sgn] of [['L', -1], ['R', 1]] as const) {
    make(`zone_CALF_${side}`, [
      { y: f(0.09), rx: f(0.044), rd: f(0.04), yf: 0 },
      { y: f(0.26), rx: params.calfRadius, rd: params.calfRadius * 0.9, yf: 0 },
      { y: f(0.55), rx: f(0.062), rd: f(0.056), yf: 0 },
    ], skin, null, sgn * S);
  }
  // thighs
  for (const [side, sgn] of [['L', -1], ['R', 1]] as const) {
    make(`zone_THIGH_${side}`, [
      { y: f(0.5), rx: f(0.062), rd: f(0.056), yf: 0 },
      { y: f(0.74), rx: params.thighRadius, rd: params.thighRadius * 0.94, yf: 0 },
      { y: f(0.94), rx: f(0.105), rd: f(0.095), yf: 0 },
    ], skin, null, sgn * S);
  }
  // pelvis + glutes
  make('zone_PELVIS', [
    { y: f(0.85), rx: f(0.15), rd: f(0.14), yf: 0 },
    { y: f(0.95), rx: params.hipRadius * 0.98, rd: params.hipRadius * 0.9, yf: 0 },
    { y: f(1.07), rx: params.hipRadius, rd: params.hipRadius * 0.9, yf: 0 },
  ], skin);
  for (const [side, sgn] of [['L', -1], ['R', 1]] as const) {
    const geo = new THREE.SphereGeometry(f(0.105), 10, 7);
    const m = new THREE.Mesh(geo, skin);
    m.name = `zone_GLUTE_${side}`;
    m.position.set(sgn * f(0.115), f(0.99), -f(0.06));
    m.scale.set(1, 0.9, 0.8);
    m.castShadow = true;
    g.add(m);
  }
  // torso: front (chest) + back halves with the waist pinch
  const chestLower: Slice[] = [
    { y: f(1.02), rx: params.hipRadius * 0.99, rd: params.hipRadius * 0.89, yf: 0 },
    { y: f(1.16), rx: params.waistRadius, rd: params.waistRadius * 0.9, yf: 0 },
    { y: f(1.24), rx: f(0.14), rd: f(0.124), yf: 0 },
  ];
  // the reference's chest mass sits LOWER (nipple line at 0.74 from the
  // bottom ≈ y 1.35 — not 1.42)
  const chestUpper: Slice[] = [
    { y: f(1.24), rx: f(0.14), rd: f(0.124), yf: 0 },
    { y: f(1.34), rx: params.chestRadius * 0.96, rd: params.chestRadius * 0.81, yf: 0 },
    { y: f(1.46), rx: params.chestRadius, rd: params.chestRadius * 0.83, yf: 0 },
  ];
  make('zone_CHEST_LOWER', chestLower, skin, 'front');
  make('zone_BACK_LOWER', chestLower, skin, 'back');
  make('zone_CHEST_UPPER', chestUpper, skin, 'front');
  make('zone_BACK_UPPER', chestUpper, skin, 'back');
  // shoulders (deltoids + traps) — the shoulder line sits at ~1.49
  for (const [side, sgn] of [['L', -1], ['R', 1]] as const) {
    const geo = new THREE.SphereGeometry(f(0.07), 10, 7);
    const m = new THREE.Mesh(geo, skin);
    m.name = `zone_SHOULDER_${side}`;
    m.position.set(sgn * A, f(1.48), f(0.02));
    m.scale.set(1, 0.85, 0.9);
    m.castShadow = true;
    g.add(m);
    const geo2 = new THREE.SphereGeometry(f(0.05), 10, 6);
    const m2 = new THREE.Mesh(geo2, skin);
    m2.name = `zone_BACK_UPPER_trap${side}`;
    m2.position.set(sgn * f(0.13), f(1.52), -f(0.045));
    m2.scale.set(1.1, 0.7, 0.8);
    m2.castShadow = true;
    g.add(m2);
  }
  // arms: upper + forearm overlapping at the elbow
  for (const [side, sgn] of [['L', -1], ['R', 1]] as const) {
    make(`zone_UPPER_ARM_${side}`, [
      { y: f(1.2), rx: f(0.048), rd: f(0.044), yf: f(0.03) },
      { y: f(1.36), rx: params.upperArmRadius, rd: params.upperArmRadius * 0.9, yf: f(0.02) },
      { y: f(1.52), rx: params.upperArmRadius, rd: params.upperArmRadius * 0.94, yf: f(0.02) },
    ], skin, null, sgn * A, 12);
    make(`zone_FOREARM_${side}`, [
      { y: f(1.0), rx: f(0.036), rd: f(0.032), yf: f(0.05) },
      { y: f(1.12), rx: params.forearmRadius * 0.92, rd: params.forearmRadius * 0.84, yf: f(0.05) },
      { y: f(1.24), rx: params.forearmRadius, rd: params.forearmRadius * 0.92, yf: f(0.04) },
    ], skin, null, sgn * (A + f(0.012)), 12);
    // hands: palm loft + fingers
    make(`zone_HAND_${side}`, [
      { y: f(0.94), rx: f(0.038), rd: f(0.028), yf: f(0.06) },
      { y: f(1.02), rx: f(0.036), rd: f(0.026), yf: f(0.07) },
    ], skin, null, sgn * (A + f(0.012)), 10);
    for (let k = 0; k < 4; k++) {
      const dx = [-0.026, -0.008, 0.008, 0.026][k];
      const geo = new THREE.CylinderGeometry(f(0.01), f(0.01), f(0.055), 6);
      const m = new THREE.Mesh(geo, skin);
      m.name = `zone_HAND_${side}_finger${k}`;
      m.position.set(sgn * (A + f(0.012)) + f(dx), f(0.92), f(0.115));
      m.castShadow = true;
      g.add(m);
    }
  }
  // neck + head (lathe profile)
  make('zone_NECK', [
    { y: f(1.56), rx: params.neckRadius, rd: params.neckRadius * 0.91, yf: 0 },
    { y: f(1.62), rx: f(0.05), rd: f(0.046), yf: 0 },
  ], skin);
  make('char_head', [
    { y: f(1.5), rx: f(0.042), rd: f(0.04), yf: 0 },
    { y: f(1.58), rx: f(0.052), rd: f(0.048), yf: 0 },
    { y: f(1.66), rx: params.headSize * 0.62, rd: params.headSize * 0.6, yf: 0 },
    { y: f(1.72), rx: params.headSize * 0.72, rd: params.headSize * 0.68, yf: 0 },
    { y: f(1.78), rx: params.headSize * 0.68, rd: params.headSize * 0.64, yf: 0 },
    { y: f(1.83), rx: params.headSize * 0.56, rd: params.headSize * 0.54, yf: 0 },
  ], skin, null, 0, 20);
  // face: eyes, brows, nose, mouth (stylized, must READ)
  for (const [side, sgn] of [['L', -1], ['R', 1]] as const) {
    const geo = new THREE.SphereGeometry(f(0.024), 8, 5);
    const m = new THREE.Mesh(geo, eye);
    m.name = `char_face_eye${side}`;
    m.position.set(sgn * f(0.04), f(1.71), f(0.104));
    m.scale.set(0.75, 0.65, 1);
    m.castShadow = true;
    g.add(m);
    const geo2 = new THREE.BoxGeometry(f(0.038), f(0.009), f(0.009));
    const m2 = new THREE.Mesh(geo2, brow);
    m2.name = `char_face_brow${side}`;
    m2.position.set(sgn * f(0.04), f(1.716), f(0.117));
    g.add(m2);
  }
  const nose = new THREE.ConeGeometry(f(0.014), f(0.03), 8);
  const nm = new THREE.Mesh(nose, skin);
  nm.name = 'char_face_nose';
  nm.position.set(0, f(1.678), f(0.106));
  nm.rotation.x = Math.PI / 2;
  g.add(nm);
  const mouth = new THREE.Mesh(new THREE.BoxGeometry(f(0.036), f(0.008), f(0.007)), brow);
  mouth.name = 'char_face_mouth';
  mouth.position.set(0, f(1.665), f(0.088));
  g.add(mouth);
  // scalp cap (HEAD_SCALP zone — the hair wearable covers it)
  const scalp = new THREE.Mesh(new THREE.SphereGeometry(f(0.113), 14, 8), hair);
  scalp.name = 'zone_HEAD_SCALP';
  scalp.position.set(0, f(1.745), -f(0.01));
  scalp.scale.set(1, 0.72, 0.98);
  g.add(scalp);
  // the modest undergarments: briefs (the reference's are white and reach
  // ~0.15 down the thigh — a short brief, not long shorts)
  make('underwear_briefs', [
    { y: f(0.76), rx: f(0.146), rd: f(0.124), yf: 0 },
    { y: f(0.88), rx: f(0.158), rd: f(0.136), yf: 0 },
    { y: f(0.95), rx: params.hipRadius, rd: params.hipRadius * 0.88, yf: 0 },
    { y: f(1.06), rx: params.hipRadius * 1.01, rd: params.hipRadius * 0.89, yf: 0 },
  ], under);

  return g;
}

/** The landmark heights for the croquis overlay, derived from the params. */
export function bodyLandmarks(params: BodyParams): Array<{ name: string; y: number }> {
  const H = params.height;
  const f = (v: number) => v * H / 1.82;
  return [
    { name: 'head_top', y: f(1.83) },
    { name: 'eye', y: f(1.71) },
    { name: 'chin', y: f(1.64) },
    { name: 'shoulder', y: f(1.52) },
    { name: 'chest', y: f(1.42) },
    { name: 'navel', y: f(1.12) },
    { name: 'hip', y: f(1.0) },
    { name: 'crotch', y: f(0.94) },
    { name: 'knee', y: f(0.52) },
    { name: 'ankle', y: f(0.09) },
    { name: 'feet', y: f(0.0) },
  ];
}
