/**
 * game/characters/body-factory.ts — the DEFAULT BODY.
 *
 * The definitive construction, combining everything the harsh-critic
 * loop demanded: ONE continuous loft profile per body region (torso,
 * head, each leg, each arm, each foot) — no junction stacks, no seam
 * rings — with triangulated outward-wound faces, ONE shared vertex pool
 * and ONE normal pass, then the body-hide zones as index subsets of the
 * same surface (no zone seams either). The painterly global gradient
 * rides on the shared vertex colors.
 */

import * as THREE from 'three';

export interface BodyParams {
  height: number;
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

export const BODY_DEFAULTS: BodyParams = {
  height: 1.82,
  shoulderWidth: 0.47,
  chestRadius: 0.17,
  waistRadius: 0.12,
  hipRadius: 0.165,
  thighRadius: 0.078,
  calfRadius: 0.055,
  upperArmRadius: 0.055,
  forearmRadius: 0.045,
  headSize: 0.118,
  neckRadius: 0.05,
};

export interface BodyMaterials {
  skin: THREE.MeshStandardMaterial;
  hair: THREE.MeshStandardMaterial;
  eye: THREE.MeshStandardMaterial;
  brow: THREE.MeshStandardMaterial;
  under: THREE.MeshStandardMaterial;
}

export function buildBodyMaterials(): BodyMaterials {
  // the style bible §8: skin roughness 0.42–0.62 (subtle subsurface,
  // never waxy), hair 0.30–0.55 (sheen), matte black undergarments
  const mats: BodyMaterials = {
    skin: new THREE.MeshStandardMaterial({ color: 0xd0a683, roughness: 0.55 }),
    hair: new THREE.MeshStandardMaterial({ color: 0x1d150e, roughness: 0.45 }),
    eye: new THREE.MeshStandardMaterial({ color: 0x070707, roughness: 0.2 }),
    brow: new THREE.MeshStandardMaterial({ color: 0x1d150e, roughness: 0.55 }),
    under: new THREE.MeshStandardMaterial({ color: 0x1c1b1a, roughness: 0.85 }),
  };
  for (const m of Object.values(mats)) m.side = THREE.DoubleSide;
  return mats;
}

/** The painterly vertex shade (img2threejs + the bible's weathered
 * language): front-bright, cavity-dark — underside surfaces (under the
 * pecs, the armpits, the glutes) pick up a normal-aware AO term so the
 * body reads as hand-painted volume, not flat PBR. */
export function paintSkin(geo: THREE.BufferGeometry, bodyHeight = 1.82): void {
  const pos = geo.attributes.position as THREE.BufferAttribute;
  const norm = geo.attributes.normal as THREE.BufferAttribute;
  geo.computeBoundingBox();
  const bb = geo.boundingBox!;
  const cx = (bb.min.x + bb.max.x) / 2;
  const cz = (bb.min.z + bb.max.z) / 2;
  const cols = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    const a = Math.atan2(z - cz, x - cx);
    const front = Math.max(0, Math.sin(a));
    const yNorm = Math.max(0, Math.min(1, y / bodyHeight));
    // normal-aware cavity AO: undersides are darker (hand-painted wear)
    const ny = norm ? norm.getY(i) : 0;
    const underside = Math.max(0, -ny);
    const shade = 0.74 + 0.26 * front - 0.14 * yNorm - 0.16 * underside;
    cols[i * 3] = shade;
    cols[i * 3 + 1] = shade * (1 - 0.03 * (1 - front));
    cols[i * 3 + 2] = shade * (1 - 0.06 * (1 - front));
  }
  geo.setAttribute('color', new THREE.BufferAttribute(cols, 3));
}

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

interface Slice { y: number; rx: number; rd: number; yf: number; }
interface LoftPart { name: string; slices: Slice[]; zone: string; xo: number; segments: number; }

/** One continuous loft: elliptical rings → triangulated outward faces. */
function loftGeometry(slices: Slice[], segments: number, xo: number): THREE.BufferGeometry {
  const rings: number[][] = [];
  const verts: number[] = [];
  for (const s of slices) {
    const ring: number[] = [];
    for (let i = 0; i < segments; i++) {
      const a = (i / segments) * Math.PI * 2;
      ring.push(verts.length / 3);
      verts.push(xo + s.rx * Math.cos(a), s.y, s.yf + s.rd * Math.sin(a));
    }
    rings.push(ring);
  }
  const faces: number[] = [];
  for (let k = 0; k < rings.length - 1; k++) {
    const lo = rings[k], hi = rings[k + 1];
    for (let i = 0; i < segments; i++) {
      const j = (i + 1) % segments;
      faces.push(lo[i], hi[i], hi[j]);
      faces.push(lo[i], hi[j], lo[j]);
    }
  }
  // caps: fan around a pole, bottom reversed
  for (const k of [0, rings.length - 1]) {
    const s = slices[k];
    const pole = verts.length / 3;
    verts.push(xo, s.y, s.yf);
    const ring = rings[k];
    for (let i = 0; i < segments; i++) {
      const a = ring[i], b = ring[(i + 1) % segments];
      if (k === 0) faces.push(pole, b, a);
      else faces.push(pole, a, b);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
  geo.setIndex(faces);
  return geo;
}

/** Build the body: continuous lofts → one pool → one normal pass →
 * zone index subsets. */
export function buildBody(params: BodyParams, mats: BodyMaterials): THREE.Group {
  const H = params.height;
  const f = (v: number) => v * H / 1.82;
  const S = f(0.095);
  const A = params.shoulderWidth / 2;

  const parts: LoftPart[] = [
    // the TORSO: ONE profile from the hips up through the neck — the
    // waist pinch and the chest/lat flare are rings, not junctions
    {
      name: 'torso', zone: 'torso', xo: 0, segments: 20,
      slices: [
        { y: f(0.85), rx: f(0.135), rd: f(0.12), yf: 0 },
        { y: f(0.97), rx: params.hipRadius, rd: params.hipRadius * 0.92, yf: -f(0.02) }, // glutes bulge back
        { y: f(1.05), rx: f(0.15), rd: f(0.135), yf: -f(0.01) },
        { y: f(1.15), rx: params.waistRadius, rd: params.waistRadius * 0.9, yf: 0 }, // the waist, the S-curve in
        { y: f(1.26), rx: f(0.155), rd: f(0.138), yf: f(0.01) },
        { y: f(1.38), rx: params.chestRadius, rd: params.chestRadius * 0.84, yf: f(0.028) }, // the chest thrusts forward
        { y: f(1.47), rx: params.chestRadius * 0.98, rd: params.chestRadius * 0.8, yf: f(0.022) },
        // the DELTOID mass: the shoulders WIDEN for a real band, then
        // taper into the neck (the reference's broad-shouldered read)
        { y: f(1.49), rx: params.shoulderWidth * 0.47, rd: params.chestRadius * 0.75, yf: f(0.015) },
        { y: f(1.53), rx: params.shoulderWidth * 0.5, rd: params.chestRadius * 0.72, yf: f(0.012) },
        { y: f(1.56), rx: params.shoulderWidth * 0.44, rd: params.chestRadius * 0.7, yf: f(0.01) },
        { y: f(1.59), rx: f(0.085), rd: f(0.075), yf: f(0.005) },
        { y: f(1.62), rx: f(0.05), rd: f(0.045), yf: 0 }, // the neck, same loft
      ],
    },
    // the HEAD (overlaps the neck)
    {
      name: 'head', zone: 'head', xo: 0, segments: 20,
      slices: [
        { y: f(1.56), rx: f(0.045), rd: f(0.042), yf: 0 },
        { y: f(1.62), rx: f(0.06), rd: f(0.055), yf: f(0.002) }, // jaw base
        { y: f(1.68), rx: params.headSize * 0.9, rd: params.headSize * 0.86, yf: f(0.004) },
        { y: f(1.74), rx: params.headSize, rd: params.headSize * 0.95, yf: f(0.004) },
        { y: f(1.79), rx: params.headSize * 0.82, rd: params.headSize * 0.78, yf: f(0.003) },
        { y: f(1.83), rx: params.headSize * 0.6, rd: params.headSize * 0.58, yf: f(0.002) },
      ],
    },
  ];
  for (const [side, sgn] of [['L', -1], ['R', 1]] as const) {
    const s = side;
    parts.push(
      // each LEG: thigh → knee → calf → ankle, ONE loft
      {
        name: `leg_${s}`, zone: `leg_${s}`, xo: sgn * S, segments: 14,
        slices: [
          { y: f(0.02), rx: f(0.042), rd: f(0.038), yf: f(0.06) },
          { y: f(0.09), rx: f(0.045), rd: f(0.04), yf: f(0.02) },
          { y: f(0.3), rx: f(0.06), rd: f(0.054), yf: 0 }, // the CALF bulge
          { y: f(0.42), rx: f(0.052), rd: f(0.048), yf: f(0.003) },
          { y: f(0.5), rx: f(0.056), rd: f(0.05), yf: f(0.006) }, // the knee
          { y: f(0.74), rx: params.thighRadius, rd: params.thighRadius * 0.94, yf: 0 },
          { y: f(0.94), rx: f(0.1), rd: f(0.09), yf: 0 },
        ],
      },
      // each ARM: shoulder → elbow → wrist, ONE loft, slightly out
      {
        name: `arm_${s}`, zone: `arm_${s}`, xo: sgn * (A + f(0.005)), segments: 12,
        slices: [
          { y: f(0.98), rx: f(0.036), rd: f(0.032), yf: f(0.06) }, // hand-ish base
          { y: f(1.12), rx: params.forearmRadius, rd: params.forearmRadius * 0.9, yf: f(0.05) },
          { y: f(1.24), rx: f(0.048), rd: f(0.044), yf: f(0.04) }, // elbow
          { y: f(1.42), rx: params.upperArmRadius, rd: params.upperArmRadius * 0.9, yf: f(0.02) },
          { y: f(1.5), rx: f(0.058), rd: f(0.054), yf: f(0.015) },
        ],
      },
      // each FOOT: one tapered wedge, 0.27 m long per the bible §3
      {
        name: `foot_${s}`, zone: `foot_${s}`, xo: sgn * S, segments: 10,
        slices: [
          { y: f(0.0), rx: f(0.046), rd: f(0.034), yf: f(0.24) },
          { y: f(0.03), rx: f(0.049), rd: f(0.038), yf: f(0.17) },
          { y: f(0.06), rx: f(0.05), rd: f(0.04), yf: f(0.1) },
          { y: f(0.09), rx: f(0.045), rd: f(0.038), yf: f(0.03) },
        ],
      },
    );
  }

  // ---- one pool, one normal pass, zone index subsets ----
  const pool: number[] = [];
  const triZones: Array<{ zone: string; tris: number[] }> = [];
  const matOf = new Map<string, THREE.Material>();
  for (const part of parts) {
    const geo = loftGeometry(part.slices, part.segments, part.xo);
    geo.computeVertexNormals();
    const posAttr = geo.attributes.position as THREE.BufferAttribute;
    const normAttr = geo.attributes.normal as THREE.BufferAttribute;
    const idx = Array.from(geo.index!.array as ArrayLike<number>);
    const base = pool.length / 3;
    for (let i = 0; i < posAttr.count; i++) pool.push(posAttr.getX(i), posAttr.getY(i), posAttr.getZ(i));
    const tris: number[] = [];
    for (const v of idx) tris.push(base + v);
    const entry = { zone: part.zone, tris };
    triZones.push(entry);
    matOf.set(part.zone, mats.skin);
  }

  const globalGeo = new THREE.BufferGeometry();
  globalGeo.setAttribute('position', new THREE.Float32BufferAttribute(pool, 3));
  const globalIdx: number[] = [];
  for (const tz of triZones) for (const v of tz.tris) globalIdx.push(v);
  globalGeo.setIndex(globalIdx);
  globalGeo.computeVertexNormals();
  paintSkin(globalGeo, H);
  const gNorm = globalGeo.attributes.normal as THREE.BufferAttribute;
  const gCol = globalGeo.attributes.color as THREE.BufferAttribute;

  const g = new THREE.Group();
  g.name = 'body_lofted';
  const zoneNames = new Map<string, string[]>();
  const zoneOf = (n: string, cy: number): string => {
    if (n === 'torso') return cy < f(0.99) ? 'zone_PELVIS' : cy < f(1.2) ? 'zone_CHEST_LOWER' : cy < f(1.5) ? 'zone_CHEST_UPPER' : 'zone_NECK';
    if (n === 'head') return 'char_head';
    if (n.startsWith('leg_')) return cy > f(0.55) ? `zone_THIGH_${n.slice(4)}` : `zone_CALF_${n.slice(4)}`;
    if (n.startsWith('arm_')) return cy > f(1.26) ? `zone_UPPER_ARM_${n.slice(4)}` : cy > f(1.05) ? `zone_FOREARM_${n.slice(4)}` : `zone_HAND_${n.slice(4)}`;
    if (n.startsWith('foot_')) return `zone_FOOT_${n.slice(5)}`;
    return 'char_head';
  };
  const zoneTris = new Map<string, number[]>();
  const posArr = globalGeo.attributes.position as THREE.BufferAttribute;
  for (const tz of triZones) {
    for (let t = 0; t < tz.tris.length; t += 3) {
      const a = tz.tris[t], b = tz.tris[t + 1], c = tz.tris[t + 2];
      const cy = (posArr.getY(a) + posArr.getY(b) + posArr.getY(c)) / 3;
      const z = zoneOf(tz.zone, cy);
      if (!zoneTris.has(z)) zoneTris.set(z, []);
      zoneTris.get(z)!.push(a, b, c);
    }
  }
  for (const [zone, tris] of zoneTris) {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', globalGeo.attributes.position);
    geo.setAttribute('normal', gNorm);
    geo.setAttribute('color', gCol);
    geo.setIndex(tris);
    const mesh = new THREE.Mesh(geo, mats.skin);
    mesh.name = zone;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    g.add(mesh);
  }

  // ---- the HANDS (bible §3: 0.19 m) — palm + four fingers per side ----
  for (const [side, sgn] of [['L', -1], ['R', 1]] as const) {
    const handX = sgn * (A + f(0.005) + f(0.02));
    const palmGeo = new THREE.CapsuleGeometry(f(0.03), f(0.05), 4, 10);
    const palm = new THREE.Mesh(palmGeo, mats.skin);
    palm.name = `zone_HAND_${side}_palm`;
    palm.position.set(handX, f(0.95), f(0.06));
    palm.castShadow = true;
    palm.receiveShadow = true;
    g.add(palm);
    const fingerSpecs: Array<[number, number, number]> = [
      [-f(0.022), f(0.99), 0.9], [-f(0.008), f(0.99), 1],
      [f(0.008), f(0.99), 1], [f(0.022), f(0.99), 0.9],
    ];
    fingerSpecs.forEach(([dx, dz, lenScale], k) => {
      const fg = new THREE.CapsuleGeometry(f(0.009), f(0.045 * lenScale), 4, 8);
      const fm = new THREE.Mesh(fg, mats.skin);
      fm.name = `zone_HAND_${side}_finger${k}`;
      fm.position.set(handX + dx, f(0.95), f(0.1 + 0.03 * lenScale));
      fm.castShadow = true;
      g.add(fm);
    });
    const tg = new THREE.CapsuleGeometry(f(0.01), f(0.04), 4, 8);
    const thumb = new THREE.Mesh(tg, mats.skin);
    thumb.name = `zone_HAND_${side}_thumb`;
    thumb.position.set(handX - sgn * f(0.035), f(0.98), f(0.07));
    thumb.rotation.z = sgn * 0.9;
    thumb.castShadow = true;
    g.add(thumb);
  }

  // the scalp + topknot (the hair mass over the head top)
  for (const spec of [
    { name: 'zone_HEAD_SCALP', geo: new THREE.SphereGeometry(f(0.105), 16, 12), pos: [0, f(1.73), -f(0.008)] as [number, number, number], scale: [0.95, 0.62, 0.98] as [number, number, number] },
    { name: 'zone_HEAD_SCALP_topknot', geo: new THREE.SphereGeometry(f(0.04), 10, 8), pos: [0, f(1.855), -f(0.015)] as [number, number, number], scale: [0.85, 0.9, 1] as [number, number, number] },
  ]) {
    const m = new THREE.Mesh(spec.geo, mats.hair);
    m.name = spec.name;
    m.position.set(...spec.pos);
    m.scale.set(...spec.scale);
    m.castShadow = true;
    g.add(m);
  }
  // the face: eyes, brows, nose, mouth (L3 isolates)
  for (const [side, sgn] of [['L', -1], ['R', 1]] as const) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(f(0.02), 8, 6), mats.eye);
    eye.name = `char_face_eye${side}`;
    eye.position.set(sgn * f(0.036), f(1.7), f(0.105));
    eye.scale.set(0.7, 0.55, 1);
    g.add(eye);
    const brow = new THREE.Mesh(new THREE.BoxGeometry(f(0.032), f(0.007), f(0.008)), mats.brow);
    brow.name = `char_face_brow${side}`;
    brow.position.set(sgn * f(0.036), f(1.712), f(0.111));
    g.add(brow);
  }
  const nose = new THREE.Mesh(new THREE.ConeGeometry(f(0.012), f(0.026), 8), mats.skin);
  nose.name = 'char_face_nose';
  nose.position.set(0, f(1.672), f(0.11));
  nose.rotation.x = Math.PI / 2;
  g.add(nose);
  const mouth = new THREE.Mesh(new THREE.BoxGeometry(f(0.03), f(0.006), f(0.006)), mats.brow);
  mouth.name = 'char_face_mouth';
  mouth.position.set(0, f(1.648), f(0.105));
  g.add(mouth);
  // the black fitted boxer-briefs (a lofted shell over the pelvis)
  const briefsGeo = loftGeometry([
    { y: f(0.76), rx: f(0.14), rd: f(0.12), yf: 0 },
    { y: f(0.9), rx: params.hipRadius * 1.02, rd: params.hipRadius * 0.92, yf: 0 },
    { y: f(1.05), rx: params.hipRadius * 1.03, rd: params.hipRadius * 0.9, yf: 0 },
  ], 18, 0);
  briefsGeo.computeVertexNormals();
  const briefs = new THREE.Mesh(briefsGeo, mats.under);
  briefs.name = 'underwear_briefs';
  briefs.castShadow = true;
  g.add(briefs);

  return g;
}
