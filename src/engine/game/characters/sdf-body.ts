/**
 * game/characters/sdf-body.ts — the WELDED body (img2threejs L0 core).
 *
 * The skill's method, actually applied: one implicit surface — the torso
 * is smooth-unioned primitive masses CLAMPED to the reference's measured
 * silhouette profile (the visual hull from the pixel measurement); the
 * limbs are smooth-unioned capsules that keep their round tubes and the
 * armpit gaps. A surface-nets polygonizer welds it into ONE mesh with
 * continuous normals — no seams, no stacked primitives. Faces then sort
 * into the body-hide zones by the nearest primitive, so equipment hiding
 * still works on the welded geometry.
 */

import * as THREE from 'three';

/** The reference's measured half-width profile (of the height), 32 rows
 * from the feet (row 0) to the crown (row 31) — measured by
 * evidence/measure-reference.cjs from the canonical reference. */
export const REFERENCE_PROFILE: number[] = [
  0.115, 0.115, 0.112, 0.108, 0.102, 0.095, 0.088, 0.082, // feet/ankles/calves
  0.078, 0.075, 0.072, 0.070, 0.070, 0.072, 0.078, 0.085, // knees → thighs
  0.095, 0.108, 0.125, 0.140, 0.150, 0.152, 0.150, 0.145, // hips (widest) → waist
  0.130, 0.128, 0.140, 0.158, 0.168, 0.158, 0.100, 0.055, // chest → shoulders → neck/head
];

interface Prim {
  kind: 'sphere' | 'ellipsoid' | 'capsule';
  cx: number; cy: number; cz: number;
  rx: number; ry: number; rz: number;
  ax?: number; ay?: number; az?: number; // capsule endpoints (absolute)
  zone: string;
}

function smin(a: number, b: number, k: number): number {
  const h = Math.max(0, Math.min(1, 0.5 + 0.5 * (b - a) / k));
  return b + (a - b) * h - k * h * (1 - h);
}

const sdSphere = (x: number, y: number, z: number, p: Prim): number =>
  Math.hypot(x - p.cx, y - p.cy, z - p.cz) - p.rx;

const sdEllipsoid = (x: number, y: number, z: number, p: Prim): number => {
  const kx = (x - p.cx) / p.rx, ky = (y - p.cy) / p.ry, kz = (z - p.cz) / p.rz;
  const k = Math.hypot(kx, ky, kz);
  return (k - 1) * Math.min(p.rx, p.ry, p.rz);
};

const sdCapsule = (x: number, y: number, z: number, p: Prim): number => {
  const ax = p.ax ?? p.cx, ay = p.ay ?? p.cy, az = p.az ?? p.cz;
  const dx = ax - p.cx, dy = ay - p.cy, dz = az - p.cz;
  const l2 = dx * dx + dy * dy + dz * dz || 1;
  let t = ((x - p.cx) * dx + (y - p.cy) * dy + (z - p.cz) * dz) / l2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(x - (p.cx + dx * t), y - (p.cy + dy * t), z - (p.cz + dz * t)) - p.rx;
};

/** The body primitives, derived from the measured params (PASS 2). */
function primitives(H: number, A: number, chestR: number, waistR: number, hipR: number,
  thighR: number, calfR: number, armR: number, foreR: number, headR: number): Prim[] {
  const f = (v: number) => v * H / 1.82;
  const S = f(0.095);
  const P: Prim[] = [
    // the torso mass chain (pelvis → waist → chest) + muscle bumps
    { kind: 'ellipsoid', cx: 0, cy: f(1.0), cz: 0, rx: hipR, ry: f(0.11), rz: hipR * 0.88, zone: 'zone_PELVIS' },
    { kind: 'ellipsoid', cx: 0, cy: f(1.16), cz: 0, rx: waistR, ry: f(0.09), rz: waistR * 0.9, zone: 'zone_CHEST_LOWER' },
    { kind: 'ellipsoid', cx: 0, cy: f(1.34), cz: 0, rx: chestR, ry: f(0.11), rz: chestR * 0.82, zone: 'zone_CHEST_UPPER' },
    { kind: 'ellipsoid', cx: 0, cy: f(1.47), cz: 0, rx: chestR * 0.94, ry: f(0.06), rz: chestR * 0.78, zone: 'zone_CHEST_UPPER' },
    // pecs + abs (the reference's defined physique)
    { kind: 'ellipsoid', cx: -f(0.06), cy: f(1.36), cz: f(0.07), rx: f(0.05), ry: f(0.03), rz: f(0.035), zone: 'zone_CHEST_UPPER' },
    { kind: 'ellipsoid', cx: f(0.06), cy: f(1.36), cz: f(0.07), rx: f(0.05), ry: f(0.03), rz: f(0.035), zone: 'zone_CHEST_UPPER' },
    { kind: 'ellipsoid', cx: 0, cy: f(1.24), cz: f(0.11), rx: f(0.05), ry: f(0.015), rz: f(0.02), zone: 'zone_CHEST_LOWER' },
    { kind: 'ellipsoid', cx: 0, cy: f(1.2), cz: f(0.115), rx: f(0.05), ry: f(0.015), rz: f(0.02), zone: 'zone_CHEST_LOWER' },
    { kind: 'ellipsoid', cx: 0, cy: f(1.16), cz: f(0.118), rx: f(0.05), ry: f(0.015), rz: f(0.02), zone: 'zone_CHEST_LOWER' },
    { kind: 'ellipsoid', cx: 0, cy: f(1.12), cz: f(0.12), rx: f(0.048), ry: f(0.015), rz: f(0.02), zone: 'zone_CHEST_LOWER' },
    // neck + head (the lathe-ish profile via stacked ellipsoids)
    { kind: 'ellipsoid', cx: 0, cy: f(1.59), cz: 0, rx: f(0.048), ry: f(0.05), rz: f(0.044), zone: 'zone_NECK' },
    { kind: 'ellipsoid', cx: 0, cy: f(1.68), cz: f(0.005), rx: headR * 0.75, ry: f(0.075), rz: headR * 0.72, zone: 'char_head' },
    { kind: 'ellipsoid', cx: 0, cy: f(1.76), cz: f(0.005), rx: headR, ry: f(0.07), rz: headR * 0.95, zone: 'char_head' },
    { kind: 'ellipsoid', cx: 0, cy: f(1.82), cz: f(0.002), rx: headR * 0.7, ry: f(0.05), rz: headR * 0.66, zone: 'char_head' },
  ];
  for (const side of [-1, 1] as const) {
    const sgn = side;
    const s = side === -1 ? 'L' : 'R';
    P.push(
      // shoulder + arm chain (hanging slightly out, per the reference)
      { kind: 'ellipsoid', cx: sgn * A, cy: f(1.48), cz: f(0.02), rx: f(0.07), ry: f(0.05), rz: f(0.06), zone: `zone_SHOULDER_${s}` },
      { kind: 'capsule', cx: sgn * A, cy: f(1.5), cz: f(0.02), rx: armR, ry: 0, rz: 0, ax: sgn * (A + f(0.008)), ay: f(1.2), az: f(0.035), zone: `zone_UPPER_ARM_${s}` },
      { kind: 'capsule', cx: sgn * (A + f(0.01)), cy: f(1.21), cz: f(0.04), rx: foreR, ry: 0, rz: 0, ax: sgn * (A + f(0.012)), ay: f(1.0), az: f(0.05), zone: `zone_FOREARM_${s}` },
      { kind: 'ellipsoid', cx: sgn * (A + f(0.012)), cy: f(0.98), cz: f(0.06), rx: f(0.037), ry: f(0.05), rz: f(0.028), zone: `zone_HAND_${s}` },
      // leg chain
      { kind: 'capsule', cx: sgn * S, cy: f(0.92), cz: 0, rx: thighR, ry: 0, rz: 0, ax: sgn * S, ay: f(0.5), az: 0, zone: `zone_THIGH_${s}` },
      { kind: 'capsule', cx: sgn * S, cy: f(0.52), cz: 0, rx: calfR, ry: 0, rz: 0, ax: sgn * S, ay: f(0.1), az: 0, zone: `zone_CALF_${s}` },
      { kind: 'ellipsoid', cx: sgn * S, cy: f(0.05), cz: f(0.08), rx: f(0.046), ry: f(0.03), rz: f(0.12), zone: `zone_FOOT_${s}` },
      // the glutes
      { kind: 'ellipsoid', cx: sgn * f(0.11), cy: f(0.99), cz: -f(0.06), rx: f(0.06), ry: f(0.05), rz: f(0.045), zone: `zone_GLUTE_${s}` },
    );
  }
  return P;
}

export interface WeldedBody {
  root: THREE.Group;
  zoneParts: Map<string, THREE.Object3D[]>;
  triCount: number;
}

/** Build the welded body: the SDF field + the profile clamp + surface nets. */
export function buildWeldedBody(params: {
  height: number; shoulderWidth: number; chestRadius: number; waistRadius: number;
  hipRadius: number; thighRadius: number; calfRadius: number; upperArmRadius: number;
  forearmRadius: number; headSize: number;
}, mats: { skin: THREE.MeshStandardMaterial; hair: THREE.MeshStandardMaterial; eye: THREE.MeshStandardMaterial; brow: THREE.MeshStandardMaterial; under: THREE.MeshStandardMaterial }): WeldedBody {
  const H = params.height;
  const A = params.shoulderWidth / 2;
  const P = primitives(H, A, params.chestRadius, params.waistRadius, params.hipRadius,
    params.thighRadius, params.calfRadius, params.upperArmRadius, params.forearmRadius, params.headSize);
  const f = (v: number) => v * H / 1.82;

  const field = (x: number, y: number, z: number): number => {
    let d = 1e9;
    for (const p of P) {
      const sd = p.kind === 'sphere' ? sdSphere(x, y, z, p)
        : p.kind === 'ellipsoid' ? sdEllipsoid(x, y, z, p)
          : sdCapsule(x, y, z, p);
      d = smin(d, sd, f(0.09));
    }
    // the visual hull: the torso chain clamps to the reference's measured
    // silhouette at its height; limbs keep their round tubes
    const yN = Math.max(0, Math.min(1, y / H));
    const halfW = REFERENCE_PROFILE[Math.min(31, Math.floor(yN * 31))] * H;
    const profD = Math.abs(x) - halfW;
    const inTorso = y > f(0.55) && y < f(1.6);
    return inTorso ? Math.max(d, profD) : d;
  };

  const welded = surfaceNets(field, { minX: -0.62 * H, maxX: 0.62 * H, minY: -0.02, maxY: H + 0.04, minZ: -0.3 * H, maxZ: 0.35 * H }, 56);
  return assembleZones(welded, P, mats);
}

/** The classic surface-nets polygonizer (no 256-case table — cells emit
 * one vertex + up to three quads). */
function surfaceNets(field: (x: number, y: number, z: number) => number,
  bounds: { minX: number; maxX: number; minY: number; maxY: number; minZ: number; maxZ: number },
  res: number): { positions: number[]; indices: number[] } {
  const { minX, maxX, minY, maxY, minZ, maxZ } = bounds;
  const sx = (maxX - minX) / res, sy = (maxY - minY) / res, sz = (maxZ - minZ) / res;
  const n = res + 1;
  // corner samples
  const grid = new Float32Array(n * n * n);
  for (let iz = 0; iz < n; iz++) {
    for (let iy = 0; iy < n; iy++) {
      for (let ix = 0; ix < n; ix++) {
        grid[(iz * n + iy) * n + ix] = field(minX + ix * sx, minY + iy * sy, minZ + iz * sz);
      }
    }
  }
  const positions: number[] = [];
  const indices: number[] = [];
  const cellIdx = new Int32Array(res * res * res).fill(-1);
  const p = new Float32Array(12 * 3);
  for (let iz = 0; iz < res; iz++) {
    for (let iy = 0; iy < res; iy++) {
      for (let ix = 0; ix < res; ix++) {
        let count = 0;
        let px = 0, py = 0, pz = 0;
        // for each of the 12 edges of the cell
        const corners = [
          [ix, iy, iz, ix + 1, iy, iz], [ix + 1, iy, iz, ix + 1, iy + 1, iz],
          [ix + 1, iy + 1, iz, ix, iy + 1, iz], [ix, iy + 1, iz, ix, iy, iz],
          [ix, iy, iz + 1, ix + 1, iy, iz + 1], [ix + 1, iy, iz + 1, ix + 1, iy + 1, iz + 1],
          [ix + 1, iy + 1, iz + 1, ix, iy + 1, iz + 1], [ix, iy + 1, iz + 1, ix, iy, iz + 1],
          [ix, iy, iz, ix, iy, iz + 1], [ix + 1, iy, iz, ix + 1, iy, iz + 1],
          [ix + 1, iy + 1, iz, ix + 1, iy + 1, iz + 1], [ix, iy + 1, iz, ix, iy + 1, iz + 1],
        ];
        for (let e = 0; e < 12; e++) {
          const c = corners[e];
          const v0 = grid[(c[2] * n + c[1]) * n + c[0]];
          const v1 = grid[(c[5] * n + c[4]) * n + c[3]];
          if ((v0 > 0) !== (v1 > 0)) {
            const t = v0 / (v0 - v1);
            px += minX + (c[0] + (c[3] - c[0]) * t) * sx;
            py += minY + (c[1] + (c[4] - c[1]) * t) * sy;
            pz += minZ + (c[2] + (c[5] - c[2]) * t) * sz;
            count++;
          }
        }
        if (count === 0) continue;
        px /= count; py /= count; pz /= count;
        positions.push(px, py, pz);
        cellIdx[(iz * res + iy) * res + ix] = (positions.length / 3) - 1;
      }
    }
  }
  // emit quads: each grid edge that crosses the surface joins the cell
  // vertices of the FOUR cells surrounding that edge (canonical surface
  // nets); the winding faces from the inside (negative field) outward
  const quad4 = (a: number, b: number, c: number, d: number, flip: boolean) => {
    if (a < 0 || b < 0 || c < 0 || d < 0) return;
    if (flip) indices.push(a, d, c, a, c, b);
    else indices.push(a, b, c, a, c, d);
  };
  const C = (ix: number, iy: number, iz: number): number =>
    (ix < 0 || iy < 0 || iz < 0 || ix >= res || iy >= res || iz >= res) ? -1 : cellIdx[(iz * res + iy) * res + ix];
  const G = (ix: number, iy: number, iz: number): number => grid[(iz * n + iy) * n + ix];
  for (let iz = 0; iz <= res; iz++) {
    for (let iy = 0; iy <= res; iy++) {
      for (let ix = 0; ix <= res; ix++) {
        // X-aligned edge: (ix,iy,iz) → (ix+1,iy,iz)
        if (ix < res && (G(ix, iy, iz) > 0) !== (G(ix + 1, iy, iz) > 0)) {
          const flip = G(ix, iy, iz) > 0;
          quad4(C(ix, iy - 1, iz - 1), C(ix, iy, iz - 1), C(ix, iy, iz), C(ix, iy - 1, iz), flip);
        }
        // Y-aligned edge: (ix,iy,iz) → (ix,iy+1,iz)
        if (iy < res && (G(ix, iy, iz) > 0) !== (G(ix, iy + 1, iz) > 0)) {
          const flip = G(ix, iy, iz) > 0;
          quad4(C(ix - 1, iy, iz - 1), C(ix, iy, iz - 1), C(ix, iy, iz), C(ix - 1, iy, iz), flip);
        }
        // Z-aligned edge: (ix,iy,iz) → (ix,iy,iz+1)
        if (iz < res && (G(ix, iy, iz) > 0) !== (G(ix, iy, iz + 1) > 0)) {
          const flip = G(ix, iy, iz) > 0;
          quad4(C(ix - 1, iy - 1, iz), C(ix, iy - 1, iz), C(ix, iy, iz), C(ix - 1, iy, iz), flip);
        }
      }
    }
  }
  return { positions, indices };
}

/** Sort the welded faces into the body-hide zones by the nearest primitive.
 * ONE global vertex pool (deduped) + ONE normal pass — the zone sub-meshes
 * are index subsets of the same welded surface, so the normals agree
 * across every zone boundary: NO SEAMS. */
function assembleZones(welded: { positions: number[]; indices: number[] }, P: Prim[],
  mats: { skin: THREE.MeshStandardMaterial; hair: THREE.MeshStandardMaterial; eye: THREE.MeshStandardMaterial; brow: THREE.MeshStandardMaterial; under: THREE.MeshStandardMaterial }): WeldedBody {
  const root = new THREE.Group();
  const pos = welded.positions;

  // ---- dedupe the vertices into one global pool ----
  const vertMap = new Map<string, number>();
  const pool: number[] = [];
  const globalIdx: number[] = [];
  const keyOf = (v: number) => {
    const x = Math.round(pos[v * 3] * 1000), y = Math.round(pos[v * 3 + 1] * 1000), z = Math.round(pos[v * 3 + 2] * 1000);
    return x + ',' + y + ',' + z;
  };
  for (const v of welded.indices) {
    const k = keyOf(v);
    let gi = vertMap.get(k);
    if (gi === undefined) {
      gi = pool.length / 3;
      vertMap.set(k, gi);
      pool.push(pos[v * 3], pos[v * 3 + 1], pos[v * 3 + 2]);
    }
    globalIdx.push(gi);
  }

  // ---- ONE normal pass on the global surface (continuous everywhere) ----
  const globalGeo = new THREE.BufferGeometry();
  globalGeo.setAttribute('position', new THREE.Float32BufferAttribute(pool, 3));
  globalGeo.setIndex(globalIdx);
  globalGeo.computeVertexNormals();
  // the painterly shade: front-bright / cavity-dark vertex colors
  const cols = new Float32Array(pool.length);
  const normals = globalGeo.attributes.normal as THREE.BufferAttribute;
  for (let i = 0; i < pool.length / 3; i++) {
    const x = pool[i * 3], y = pool[i * 3 + 1], z = pool[i * 3 + 2];
    const a = Math.atan2(z, x);
    const front = Math.max(0, Math.sin(a));
    const yN = Math.max(0, Math.min(1, y / 1.82));
    const shade = 0.74 + 0.26 * front - 0.16 * yN;
    cols[i * 3] = shade;
    cols[i * 3 + 1] = shade * (1 - 0.03 * (1 - front));
    cols[i * 3 + 2] = shade * (1 - 0.06 * (1 - front));
  }
  globalGeo.setAttribute('color', new THREE.BufferAttribute(cols, 3));
  const gNorm = globalGeo.attributes.normal as THREE.BufferAttribute;

  // ---- the zone index subsets (per-triangle centroid → nearest primitive) ----
  const zoneTris = new Map<string, number[]>();
  const primList = P;
  for (let t = 0; t < globalIdx.length; t += 3) {
    const a = globalIdx[t], b = globalIdx[t + 1], c = globalIdx[t + 2];
    const cx = (pool[a * 3] + pool[b * 3] + pool[c * 3]) / 3;
    const cy = (pool[a * 3 + 1] + pool[b * 3 + 1] + pool[c * 3 + 1]) / 3;
    const cz = (pool[a * 3 + 2] + pool[b * 3 + 2] + pool[c * 3 + 2]) / 3;
    let best: Prim = primList[0];
    let bestD = Infinity;
    for (const p of primList) {
      const dx = cx - p.cx, dy = cy - p.cy, dz = cz - p.cz;
      const d = dx * dx + dy * dy + dz * dz;
      if (d < bestD) { bestD = d; best = p; }
    }
    const zone = best.zone === 'char_head' && cy > 1.715 ? 'zone_HEAD_SCALP' : best.zone;
    if (!zoneTris.has(zone)) zoneTris.set(zone, []);
    zoneTris.get(zone)!.push(a, b, c);
  }

  const zoneParts = new Map<string, THREE.Object3D[]>();
  let triCount = 0;
  for (const [zone, tris] of zoneTris) {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', globalGeo.attributes.position);
    geo.setAttribute('normal', gNorm);
    geo.setAttribute('color', globalGeo.attributes.color);
    geo.setIndex(tris);
    const mat = zone === 'zone_HEAD_SCALP' ? mats.hair : mats.skin;
    const mesh = new THREE.Mesh(geo, mat);
    mesh.name = zone;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    root.add(mesh);
    zoneParts.set(zone, [mesh]);
    triCount += tris.length / 3;
  }

  // ---- the FACE (the skill's L3 single-bone isolates): eyes, brows,
  // nose, mouth — sharp stylized features on the welded head ----
  const f = (v: number) => v * 1.82 / 1.82;
  for (const side of [-1, 1] as const) {
    const sgn = side;
    const eye = new THREE.Mesh(new THREE.SphereGeometry(f(0.022), 8, 5), mats.eye);
    eye.name = `char_face_eye${side === -1 ? 'L' : 'R'}`;
    eye.position.set(sgn * f(0.038), f(1.71), f(0.085));
    eye.scale.set(0.75, 0.65, 1);
    root.add(eye);
    const brow = new THREE.Mesh(new THREE.BoxGeometry(f(0.036), f(0.008), f(0.009)), mats.brow);
    brow.name = `char_face_brow${side === -1 ? 'L' : 'R'}`;
    brow.position.set(sgn * f(0.038), f(1.718), f(0.092));
    root.add(brow);
  }
  const nose = new THREE.Mesh(new THREE.ConeGeometry(f(0.013), f(0.028), 8), mats.skin);
  nose.name = 'char_face_nose';
  nose.position.set(0, f(1.678), f(0.09));
  nose.rotation.x = Math.PI / 2;
  root.add(nose);
  const mouth = new THREE.Mesh(new THREE.BoxGeometry(f(0.032), f(0.007), f(0.007)), mats.brow);
  mouth.name = 'char_face_mouth';
  mouth.position.set(0, f(1.66), f(0.086));
  root.add(mouth);
  // the topknot (the reference: compact bun at the crown)
  const bun = new THREE.Mesh(new THREE.SphereGeometry(f(0.04), 10, 7), mats.hair);
  bun.name = 'zone_HEAD_SCALP_topknot';
  bun.position.set(0, f(1.87), f(-0.01));
  root.add(bun);

  return { root, zoneParts, triCount };
}
