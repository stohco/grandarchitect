/**
 * Set Factory — the modeling department.
 *
 * Procedurally builds every structure and prop of the Wang Family Bend set
 * (set-blueprint) as three.js geometry, with materials from the art boards
 * (painterly PBR: rammed earth, weathered timber, thatch, river cobble,
 * spirit-stone glow). Deterministic — seeded LCG (canonical primitives) so
 * the same blueprint always yields the same set. Geometry is kit-based
 * (board: "Build Kits", BLD_ naming): every structure = foundation +
 * walls + roof + apertures, so damage states and PCG arrays can reuse parts.
 *
 * Browser + Node safe (no DOM); the director renderer and the studio
 * viewport share this code.
 */

import * as THREE from 'three';
import { LCG } from '../../determinism/primitives';
import { WANG_FAMILY_BEND } from '../../worldproduction/set-blueprint';
import type { SetStructure, SetProp } from '../../worldproduction/set-blueprint';
import { QINGHE_MARKET_TOWN } from '../../worldproduction/set-blueprint-2';
import type { SetRoom } from '../../worldproduction/set-blueprint';
import { painterlyMaterial } from './textures';
import { PROP_BUILDERS, dressStructure } from './dressing-factory';

// ---------------------------------------------------------------------------
// Art-board material palette (painterly PBR, believable)
// ---------------------------------------------------------------------------

export interface SetPalette {
  rammedEarth: THREE.MeshStandardMaterial;
  timber: THREE.MeshStandardMaterial;
  thatch: THREE.MeshStandardMaterial;
  plaster: THREE.MeshStandardMaterial;
  cobble: THREE.MeshStandardMaterial;
  packedEarth: THREE.MeshStandardMaterial;
  stone: THREE.MeshStandardMaterial;
  water: THREE.MeshStandardMaterial;
  woodTrim: THREE.MeshStandardMaterial;
  spiritGlow: THREE.MeshStandardMaterial;
  canvas: THREE.MeshStandardMaterial;
  hemp: THREE.MeshStandardMaterial;
  foliage: THREE.MeshStandardMaterial;
  /** dark blue-grey roof tiles (yamen, shops) — architectural language, not thatch. */
  tile: THREE.MeshStandardMaterial;
  /** painted gate posts / lacquer accents (the yamen's only painted gates). */
  lacquer: THREE.MeshStandardMaterial;
  /** atmospheric haze for the distant mountain ring (700-1100 m out). */
  hazyBlue: THREE.MeshStandardMaterial;
  /** closer blue-grey silhouette for the Cangwu foothills. */
  hazeBlue: THREE.MeshStandardMaterial;
}

/** Dark eave underside strip (shared across every roof). */
const EAVE_DARK = new THREE.MeshStandardMaterial({ color: 0x23272e, roughness: 1 });

export function makePalette(): SetPalette {
  const std = (color: number, roughness: number, metalness = 0) =>
    new THREE.MeshStandardMaterial({ color, roughness, metalness });
  // painterly hand-painted materials when the browser canvas is available;
  // plain-color fallback in Node (conformance). repeat factors keep texture
  // detail at surface scale (a 45 m wall must not stretch one 256 px tile —
  // VLM: 'low resolution, blurry').
  const tex = (id: Parameters<typeof painterlyMaterial>[0], color?: number, roughness = 0.85, repeat = 1) =>
    painterlyMaterial(id, { color, roughness, repeat });
  return {
    rammedEarth: tex('rammedEarth', 0xffffff, 0.9, 6),
    timber: tex('timber', 0xffffff, 0.8, 4),
    thatch: tex('thatch', 0xffffff, 0.95, 3),
    plaster: tex('plaster', 0xffffff, 0.85, 5),
    cobble: tex('cobble', 0xffffff, 0.95, 4),
    packedEarth: tex('packedEarth', 0xffffff, 0.95, 4),
    stone: tex('stone', 0xffffff, 0.95, 4),
    water: new THREE.MeshStandardMaterial({ color: 0x2e5f6b, roughness: 0.1, metalness: 0.2, transparent: true, opacity: 0.85 }),
    woodTrim: std(0x7a4a24, 0.7),
    canvas: tex('canvas', 0xffffff, 0.9, 3),
    hemp: tex('hemp', 0xffffff, 0.9, 3),
    foliage: tex('hemp', 0x4a7a3c, 0.9, 2),
    tile: std(0x5a6872, 0.7),
    lacquer: std(0x8a2a22, 0.55),
    hazyBlue: std(0x7a8fa8, 1),
    hazeBlue: std(0x6c7f99, 1),
    spiritGlow: new THREE.MeshStandardMaterial({ color: 0x59e8c8, emissive: 0x1f9f8a, emissiveIntensity: 0.8, roughness: 0.3 }),
  };
}

// ---------------------------------------------------------------------------
// Kit builders (board §6: Build Kits)
// ---------------------------------------------------------------------------

export function buildBox(w: number, d: number, h: number, mat: THREE.Material, y: number): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.y = y + h / 2;
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

/** Rammed-earth wall with a doorway aperture (2.4 m door per scale board). */
export function buildWall(w: number, h: number, d: number, mat: THREE.Material, opts?: { door?: boolean }): THREE.Group {
  const g = new THREE.Group();
  const wall = buildBox(w, d, h, mat, 0);
  g.add(wall);
  if (opts?.door) {
    // doorway: dark aperture framed by timber posts + lintel, warm interior
    const door = buildBox(1.4, d * 0.9, 2.4, mat.clone(), 0);
    (door.material as THREE.MeshStandardMaterial).color = new THREE.Color(0x241a12);
    door.position.z = 0;
    g.add(door);
    const lintel = buildBox(1.4, 0.3, 0.25, mat, 2.4 + 0.12);
    g.add(lintel);
    const frameMat = new THREE.MeshStandardMaterial({ color: 0x4a2f18, roughness: 0.8 });
    const postL = new THREE.Mesh(new THREE.BoxGeometry(0.18, 2.4, 0.2), frameMat);
    postL.position.set(-0.7, 1.2, d * 0.35);
    g.add(postL);
    const postR = postL.clone();
    postR.position.x = 0.7;
    g.add(postR);
    const beamTop = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.16, 0.24), frameMat);
    beamTop.position.set(0, 2.5, d * 0.35);
    g.add(beamTop);
    // warm interior light: openings read as inhabited, not black voids
    const warm = new THREE.Mesh(
      new THREE.PlaneGeometry(1.2, 2.2),
      new THREE.MeshBasicMaterial({ color: 0xd8a05a, transparent: true, opacity: 0.55, side: THREE.DoubleSide }),
    );
    warm.position.set(0, 1.2, d * 0.6);
    warm.rotation.y = Math.PI;
    g.add(warm);
  }
  return g;
}

/** Roof overhang beyond the wall footprint (meters). */
export const ROOF_OVERHANG = 0.8;

/** Thatched gable roof: base sits AT the wall top, ridge beam seated ON the
 *  ridge (a 4-sided pyramid had no ridge line — the beam floated in air).
 *  Cross-section is a true triangle so the roof reads as Chinese architecture. */
export function buildRoof(w: number, d: number, wallH: number, mat: THREE.Material): THREE.Group {
  const g = new THREE.Group();
  const eaveZ = d / 2 + ROOF_OVERHANG;          // eave reach along the depth axis
  const ridgeX = w + 2 * ROOF_OVERHANG;         // ridge length with overhang
  const pitch = wallH * 0.5;

  // gable prism: cross-section (-eaveZ,0) -> (0,pitch) -> (eaveZ,0), extruded along x
  const shape = new THREE.Shape();
  shape.moveTo(-eaveZ, 0);
  shape.lineTo(0, pitch);
  shape.lineTo(eaveZ, 0);
  shape.closePath();
  const geo = new THREE.ExtrudeGeometry(shape, { depth: ridgeX, bevelEnabled: false });
  geo.translate(0, 0, -ridgeX / 2);
  const roof = new THREE.Mesh(geo, mat);
  roof.rotation.x = Math.PI / 2;                // shape XY -> world ZY (roof spans x)
  roof.position.y = wallH;                      // base exactly at wall top
  roof.castShadow = true;
  g.add(roof);

  // ceiling: closes the roof volume from below so low angles read depth,
  // never a black void through the gable triangle
  const ceiling = new THREE.Mesh(
    new THREE.BoxGeometry(ridgeX, 0.12, d),
    new THREE.MeshStandardMaterial({ color: 0x2e2215, roughness: 1 }),
  );
  ceiling.position.y = wallH - 0.06;
  g.add(ceiling);

  // ridge beam seated ON the ridge line (half-embedded, no floating)
  const ridge = new THREE.Mesh(new THREE.BoxGeometry(ridgeX + 0.3, 0.22, 0.22), mat);
  ridge.position.y = wallH + pitch + 0.08;
  ridge.castShadow = true;
  g.add(ridge);

  // eave fascia at both ends (clean silhouette, traditional gable read)
  const fasciaMat = mat;
  for (const side of [-1, 1]) {
    const fascia = new THREE.Mesh(new THREE.BoxGeometry(0.16, pitch + 0.05, eaveZ * 2), fasciaMat);
    fascia.position.set(side * (ridgeX / 2 + 0.05), wallH + pitch / 2, 0);
    g.add(fascia);
  }

  // eave boards: thin strips just OUTSIDE the gable base along both long
  // sides + a dark underside strip — roofs read as architecture with depth,
  // not floating triangles
  for (const side of [-1, 1]) {
    const board = new THREE.Mesh(new THREE.BoxGeometry(ridgeX + 0.14, 0.1, 0.34), mat);
    board.position.set(0, wallH + 0.09, side * (eaveZ + 0.17));
    board.castShadow = true;
    g.add(board);
    const underside = new THREE.Mesh(new THREE.BoxGeometry(ridgeX + 0.14, 0.05, 0.24), EAVE_DARK);
    underside.position.set(0, wallH + 0.03, side * (eaveZ + 0.12));
    g.add(underside);
  }
  return g;
}

export function buildTimberFrame(w: number, d: number, h: number, mat: THREE.Material): THREE.Group {
  const g = new THREE.Group();
  const post = (x: number, z: number) => {
    const p = new THREE.Mesh(new THREE.BoxGeometry(0.28, h, 0.28), mat);
    p.position.set(x, h / 2, z);
    p.castShadow = true;
    g.add(p);
  };
  const hw = w / 2, hd = d / 2;
  // corner posts
  post(-hw, -hd); post(hw, -hd); post(-hw, hd); post(hw, hd);
  // intermediate posts on the long faces (fascia 2-3 m spacing) so the
  // walls read as post-and-beam, not solid boxes (VLM: 'no joinery')
  const longPosts = Math.max(1, Math.floor(w / 3) - 1);
  for (let i = 1; i <= longPosts; i++) {
    const x = -hw + (w * i) / (longPosts + 1);
    post(x, -hd); post(x, hd);
  }
  const shortPosts = Math.max(1, Math.floor(d / 3) - 1);
  for (let i = 1; i <= shortPosts; i++) {
    const z = -hd + (d * i) / (shortPosts + 1);
    post(-hw, z); post(hw, z);
  }
  // wall-top tie beam ring: the frame's lintel line, raised above the wall
  // fill so it reads as structure
  const beamMat = mat;
  const beam = (bx: number, bz: number, len: number, rot: number) => {
    const b = new THREE.Mesh(new THREE.BoxGeometry(len, 0.18, 0.24), beamMat);
    b.position.set(bx, h + 0.06, bz);
    b.rotation.y = rot;
    b.castShadow = true;
    g.add(b);
  };
  beam(0, -hd, w + 0.3, 0);
  beam(0, hd, w + 0.3, 0);
  beam(-hw, 0, d + 0.3, Math.PI / 2);
  beam(hw, 0, d + 0.3, Math.PI / 2);
  return g;
}

// ---------------------------------------------------------------------------
// Structure builders (each set structure -> Group)
// ---------------------------------------------------------------------------

function buildHouse(s: SetStructure, pal: SetPalette, rng: LCG): THREE.Group {
  const g = new THREE.Group();
  const footW = s.w, footD = s.d, wallH = Math.min(s.h * 0.55, 3.6);

  // seeded variety — households must not read as clones
  const doorX = rng.nextRange(-footW * 0.14, footW * 0.14);
  const pitchScale = rng.nextRange(0.82, 1.18);
  const doubleWindows = rng.nextFloat() < 0.45;
  const hasLeanTo = rng.nextFloat() < 0.5;

  // foundation
  g.add(buildBox(footW + 1.2, footD + 1.2, 0.7, pal.cobble, 0));

  // floor
  g.add(buildBox(footW, footD, 0.25, pal.packedEarth, 0.7));

  // walls (front has the door, offset per house)
  const wallTh = 0.35;
  const frameMat = new THREE.MeshStandardMaterial({ color: 0x4a2f18, roughness: 0.8 });
  {
    // front wall in segments around the (offset) door aperture
    const segL = buildBox(doorX - 0.7 + footW / 2, wallTh, wallH, pal.rammedEarth, 0);
    segL.position.x = (doorX - 0.7 - footW / 2) / 2;
    g.add(segL);
    const segR = buildBox(footW / 2 - doorX - 0.7, wallTh, wallH, pal.rammedEarth, 0);
    segR.position.x = (doorX + 0.7 + footW / 2) / 2;
    g.add(segR);
    // door: dark aperture + timber posts + lintel + warm interior glow
    const door = new THREE.Mesh(new THREE.BoxGeometry(1.4, 2.4, wallTh * 0.9), frameMat);
    door.position.set(doorX, 1.2, 0);
    g.add(door);
    const postL = new THREE.Mesh(new THREE.BoxGeometry(0.18, 2.4, 0.2), frameMat);
    postL.position.set(doorX - 0.7, 1.2, wallTh * 0.35);
    g.add(postL);
    const postR = postL.clone(); postR.position.x = doorX + 0.7; g.add(postR);
    const beamTop = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.16, 0.24), frameMat);
    beamTop.position.set(doorX, 2.5, wallTh * 0.35);
    g.add(beamTop);
    const warm = new THREE.Mesh(
      new THREE.PlaneGeometry(1.2, 2.2),
      new THREE.MeshBasicMaterial({ color: 0xd8a05a, transparent: true, opacity: 0.55, side: THREE.DoubleSide }),
    );
    warm.position.set(doorX, 1.2, wallTh * 0.6);
    warm.rotation.y = Math.PI;
    g.add(warm);
    // stone step at the door
    const step = buildBox(1.6, 0.6, 0.18, pal.cobble, 0);
    step.position.set(doorX, 0, footD / 2 + 0.34);
    g.add(step);
  }
  const back = buildWall(footW, wallH, wallTh, pal.rammedEarth); back.position.z = -footD; g.add(back);
  const left = buildWall(footD, wallH, wallTh, pal.rammedEarth); left.rotation.y = Math.PI / 2; left.position.x = -footW / 2; g.add(left);
  const right = buildWall(footD, wallH, wallTh, pal.rammedEarth); right.rotation.y = Math.PI / 2; right.position.x = footW / 2; g.add(right);

  // timber frame
  g.add(buildTimberFrame(footW, footD, wallH, pal.timber));

  // roof — base sits at the wall top, pitch varied per house
  const roof = buildRoof(footW, footD, wallH, pal.thatch);
  roof.scale.set(1, pitchScale, 1);
  g.add(roof);

  // windows (lit paper at night, dark day) + warm glow so apertures read
  const win = (x: number, z: number, rz = 0) => {
    const w = buildBox(1.0, 0.06, 0.9, pal.plaster, wallH * 0.62);
    w.position.set(x, wallH * 0.62, z); w.rotation.y = rz;
    g.add(w);
    const glow = new THREE.Mesh(
      new THREE.PlaneGeometry(0.86, 0.76),
      new THREE.MeshBasicMaterial({ color: 0xd8a05a, transparent: true, opacity: 0.5, side: THREE.DoubleSide }),
    );
    glow.position.set(x, wallH * 0.62, z + (rz === 0 ? 0.06 : -0.06));
    glow.rotation.y = rz;
    g.add(glow);
  };
  win(footW * 0.25, footD / 2 + 0.01); win(-footW * 0.25, footD / 2 + 0.01);
  if (doubleWindows) {
    win(footW * 0.25, -footD / 2 - 0.01, Math.PI); win(-footW * 0.25, -footD / 2 - 0.01, Math.PI);
  }

  // occasional side lean-to storage box (farm households store grain outside)
  if (hasLeanTo) {
    const leanTo = buildBox(2.2, 1.6, 1.8, pal.rammedEarth, 0);
    leanTo.position.set(-footW / 2 - 1.25, 0, -footD * 0.24);
    leanTo.castShadow = true;
    g.add(leanTo);
    const leanRoof = buildBox(2.7, 2.1, 0.14, pal.thatch, 1.85);
    leanRoof.position.set(-footW / 2 - 1.25, 0, -footD * 0.24);
    leanRoof.castShadow = true;
    g.add(leanRoof);
  }

  // weathering: moss line along the wall base (ancient-sacred language)
  const mossMat = new THREE.MeshStandardMaterial({ color: 0x5a7a4a, roughness: 1 });
  const moss = new THREE.Mesh(new THREE.BoxGeometry(footW * 0.9, 0.12, 0.08), mossMat);
  moss.position.set(0, 0.06, footD / 2 + 0.05);
  g.add(moss);
  const mossL = moss.clone();
  mossL.position.set(-footW / 2 - 0.05, 0.06, 0);
  mossL.rotation.y = Math.PI / 2;
  g.add(mossL);

  // chimney with smoke (kitchens are inside every household)
  const chimney = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.9, 0.5), pal.cobble);
  chimney.position.set(footW * 0.3, wallH + 0.45, -footD / 2 + 0.6);
  chimney.castShadow = true;
  g.add(chimney);

  return g;
}

function buildWell(s: SetStructure, pal: SetPalette): THREE.Group {
  const g = new THREE.Group();
  const ring = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.1, 1.0, 12), pal.cobble);
  ring.position.y = 0.5; g.add(ring);
  const water = new THREE.Mesh(new THREE.CylinderGeometry(0.72, 0.72, 0.6, 12), pal.water);
  water.position.y = 0.3; g.add(water);
  const beam = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.22, 0.22), pal.timber);
  beam.position.y = 1.9; g.add(beam);
  const postL = new THREE.Mesh(new THREE.BoxGeometry(0.18, 2.0, 0.18), pal.timber);
  postL.position.set(-1.0, 1.0, 0); g.add(postL);
  const postR = postL.clone(); postR.position.x = 1.0; g.add(postR);
  return g;
}

function buildShrine(s: SetStructure, pal: SetPalette): THREE.Group {
  const g = new THREE.Group();
  const base = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.4, 0.7, 8), pal.cobble);
  base.position.y = 0.35; g.add(base);
  const stele = new THREE.Mesh(new THREE.BoxGeometry(0.8, 1.9, 0.4), pal.stone);
  stele.position.y = 1.35; g.add(stele);
  const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.16, 0.16, 10), pal.woodTrim);
  bowl.position.set(0.5, 1.25, 0.35); g.add(bowl);
  return g;
}

function buildSchool(s: SetStructure, pal: SetPalette): THREE.Group {
  const g = buildHouse(s, pal, new LCG(1));
  // dais + desks
  const dais = buildBox(2.2, 1.4, 0.5, pal.timber, 0.75);
  dais.position.set(0, 0, -s.d * 0.3); g.add(dais);
  for (let i = 0; i < 6; i++) {
    const desk = buildBox(1.4, 0.7, 0.5, pal.woodTrim, 0.75);
    desk.position.set(((i % 3) - 1) * 2.2, 0, s.d * 0.2 - Math.floor(i / 3) * 1.6);
    g.add(desk);
  }
  return g;
}

function buildCache(s: SetStructure, pal: SetPalette, rng: LCG): THREE.Group {
  const g = new THREE.Group();
  // carved chamber: rock mass with a dark mouth
  const rock = new THREE.Mesh(new THREE.SphereGeometry(12, 8, 6), pal.stone);
  rock.position.set(0, 4, -2);
  rock.scale.set(1.2, 0.9, 1);
  rock.castShadow = true;
  g.add(rock);
  const mouth = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.4, 2.2, 10), new THREE.MeshStandardMaterial({ color: 0x0a0d12 }));
  mouth.rotation.x = Math.PI / 2;
  mouth.position.set(0, 2.2, 4.5);
  g.add(mouth);
  // faint formation glow
  const glow = new THREE.Mesh(new THREE.CircleGeometry(2.6, 24), pal.spiritGlow);
  glow.rotation.x = -Math.PI / 2;
  glow.position.y = 0.02;
  g.add(glow);
  return g;
}

function buildGate(s: SetStructure, pal: SetPalette): THREE.Group {
  const g = new THREE.Group();
  const pillar = (x: number) => {
    const p = new THREE.Mesh(new THREE.BoxGeometry(0.7, s.h, 0.7), pal.stone);
    p.position.set(x, s.h / 2, 0);
    p.castShadow = true;
    g.add(p);
    // vermilion cap — traditional gate language (restrained accent)
    const cap = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.25, 0.9), pal.woodTrim);
    cap.position.set(x, s.h + 0.12, 0);
    g.add(cap);
  };
  pillar(-3); pillar(3);
  const beam = new THREE.Mesh(new THREE.BoxGeometry(7.4, 0.55, 0.6), pal.timber);
  beam.position.y = s.h - 0.35;
  g.add(beam);
  // hip roof over the beam: the gate reads as architecture, not a rectangle.
  // The gable must READ as a roof — a wider eave reach than ridge height so
  // the silhouette is horizontal, not a vertical column (VLM: 'giant yellow
  // column'). buildRoof takes (w, d, wallH): w = ridge length along x,
  // d = eave depth (cross-section), wallH = ridge height above the base.
  const gateRoofW = 8.6;
  const gateRoofDepth = 2.6;   // generous eave overhang both sides
  const gateRoofH = 1.1;       // modest ridge — reads as a roof plane
  const roof = buildRoof(gateRoofW, gateRoofDepth, gateRoofH, pal.thatch);
  roof.position.y = s.h + 0.2;
  g.add(roof);
  // threshold stone
  const thresh = new THREE.Mesh(new THREE.BoxGeometry(4.5, 0.18, 0.9), pal.cobble);
  thresh.position.y = 0.09;
  g.add(thresh);
  return g;
}

function buildFoothills(s: SetStructure, pal: SetPalette, rng: LCG): THREE.Group {
  const g = new THREE.Group();
  for (let i = 0; i < 5; i++) {
    const peak = new THREE.Mesh(new THREE.ConeGeometry(40 + rng.nextRange(-10, 25), 120 + rng.nextRange(-20, 60), 5), pal.stone);
    peak.position.set(rng.nextRange(-250, 250), 0, rng.nextRange(-400, -200));
    peak.castShadow = true;
    g.add(peak);
  }
  return g;
}

function buildFields(s: SetStructure, pal: SetPalette): THREE.Group {
  const g = new THREE.Group();
  const soil = new THREE.Mesh(new THREE.PlaneGeometry(s.w, s.d), pal.packedEarth);
  soil.rotation.x = -Math.PI / 2;
  soil.receiveShadow = true;
  g.add(soil);
  // bunds
  for (let i = -3; i <= 3; i++) {
    const bund = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.4, s.d), pal.stone);
    bund.position.set(i * 28, 0.2, 0);
    g.add(bund);
  }
  return g;
}

function buildInstitution(s: SetStructure, pal: SetPalette, rng: LCG): THREE.Group {
  const g = new THREE.Group();
  const footW = s.w, footD = s.d, wallH = Math.min(s.h * 0.55, 4.4);

  // raised stone platform, wider than the walls (county offices sit above the mud)
  g.add(buildBox(footW + 2.4, footD + 2.4, 0.9, pal.cobble, 0));
  g.add(buildBox(footW + 1.8, footD + 1.8, 0.14, pal.stone, 0.9));

  // whitewashed plaster walls on the platform
  const wallTh = 0.4;
  const entryW = 3.6, entryH = 3.0;
  // front wall in two segments around the wide entry
  const segL = buildBox((footW - entryW) / 2, wallTh, wallH, pal.plaster, 0.97);
  segL.position.x = (-footW / 2 - entryW / 2) / 2;
  g.add(segL);
  const segR = buildBox((footW - entryW) / 2, wallTh, wallH, pal.plaster, 0.97);
  segR.position.x = (entryW / 2 + footW / 2) / 2;
  g.add(segR);
  // back + side walls (full, no apertures)
  const back = buildWall(footW, wallH, wallTh, pal.plaster); back.position.set(0, 0.97, -footD / 2); g.add(back);
  const left = buildWall(footD, wallH, wallTh, pal.plaster); left.rotation.y = Math.PI / 2; left.position.set(-footW / 2, 0.97, 0); g.add(left);
  const right = buildWall(footD, wallH, wallTh, pal.plaster); right.rotation.y = Math.PI / 2; right.position.set(footW / 2, 0.97, 0); g.add(right);

  // stone base course: a darker plinth along every wall base — the first
  // thing that breaks a 45 m plaster mass at distance (VLM: 'featureless
  // monolith')
  const plinthMat = new THREE.MeshStandardMaterial({ color: 0x8a8178, roughness: 0.95 });
  for (const [bx, bz, len, rotY] of [
    [0, -footD / 2, footW, 0], [0, footD / 2, footW, 0],
    [-footW / 2, 0, footD, Math.PI / 2], [footW / 2, 0, footD, Math.PI / 2],
  ] as Array<[number, number, number, number]>) {
    const plinth = new THREE.Mesh(new THREE.BoxGeometry(len, 0.7, wallTh + 0.08), plinthMat);
    plinth.position.set(bx, 0.97 + 0.35, bz);
    plinth.rotation.y = rotY;
    g.add(plinth);
  }

  // wall articulation — the VLM flagged 45 m plaster walls as featureless
  // monoliths (ASSET scope): a timber eave band under the roofline and rows
  // of dark window apertures break the mass into readable architecture
  const eaveBandMat = new THREE.MeshStandardMaterial({ color: 0x6a4a2a, roughness: 0.85 });
  for (const [bx, bz, len, rotY] of [
    [0, -footD / 2, footW, 0], [0, footD / 2, footW, 0],
    [-footW / 2, 0, footD, Math.PI / 2], [footW / 2, 0, footD, Math.PI / 2],
  ] as Array<[number, number, number, number]>) {
    const band = new THREE.Mesh(new THREE.BoxGeometry(len, 0.5, wallTh * 0.9), eaveBandMat);
    band.position.set(bx, 0.97 + wallH - 0.75, bz);
    band.rotation.y = rotY;
    g.add(band);
  }
  const winMat = new THREE.MeshStandardMaterial({ color: 0x1c1510, roughness: 1 });
  const frameMatY = new THREE.MeshStandardMaterial({ color: 0x5a3a20, roughness: 0.85 });
  const windowRow = (x0: number, z0: number, len: number, count: number, rotY: number, xAlongZ: boolean) => {
    for (let i = 0; i < count; i++) {
      const t = (i + 0.5) / count;
      const w = new THREE.Mesh(new THREE.BoxGeometry(2.2, 2.4, 0.14), winMat);
      if (xAlongZ) w.position.set(x0 + t * len - len / 2, 0.97 + wallH * 0.5, z0);
      else w.position.set(x0, 0.97 + wallH * 0.5, z0 + t * len - len / 2);
      w.rotation.y = rotY;
      g.add(w);
      // wood window frame + sill: the fenestration reads as architecture,
      // not dark holes in a featureless wall (VLM: 'grey blocks featureless')
      const frame = new THREE.Mesh(new THREE.BoxGeometry(2.4, 2.62, 0.12), frameMatY);
      if (xAlongZ) frame.position.set(x0 + t * len - len / 2, 0.97 + wallH * 0.5, z0 + 0.02);
      else frame.position.set(x0 + 0.02, 0.97 + wallH * 0.5, z0 + t * len - len / 2);
      frame.rotation.y = rotY;
      g.add(frame);
      const sill = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.14, 0.26), frameMatY);
      if (xAlongZ) sill.position.set(x0 + t * len - len / 2, 0.97 + wallH * 0.5 - 1.2, z0 + 0.06);
      else sill.position.set(x0 + 0.06, 0.97 + wallH * 0.5 - 1.2, z0 + t * len - len / 2);
      sill.rotation.y = rotY;
      g.add(sill);
    }
  };
  windowRow(0, -footD / 2 + 0.01, footW * 0.85, 8, 0, true);     // back wall
  windowRow(-footW / 2 + 0.01, 0, footD * 0.85, 10, Math.PI / 2, true); // left
  windowRow(footW / 2 - 0.01, 0, footD * 0.85, 10, -Math.PI / 2, false); // right

  // the wide entry: dark aperture + lintel + warm glow
  const entry = new THREE.Mesh(new THREE.BoxGeometry(entryW, entryH, wallTh * 0.8), EAVE_DARK);
  entry.position.set(0, 0.97 + entryH / 2, 0);
  g.add(entry);
  const lintel = new THREE.Mesh(new THREE.BoxGeometry(entryW + 1.2, 0.35, 0.5), pal.timber);
  lintel.position.set(0, 0.97 + entryH + 0.15, wallTh * 0.4);
  g.add(lintel);
  const warm = new THREE.Mesh(
    new THREE.PlaneGeometry(entryW * 0.9, entryH * 0.9),
    new THREE.MeshBasicMaterial({ color: 0xd8a05a, transparent: true, opacity: 0.55, side: THREE.DoubleSide }),
  );
  warm.position.set(0, 0.97 + entryH / 2, wallTh * 0.6);
  warm.rotation.y = Math.PI;
  g.add(warm);

  // two painted gate posts (the town's only painted gates) with vermilion caps
  for (const sx of [-1, 1]) {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.55, entryH, 0.55), pal.lacquer);
    post.position.set(sx * (entryW / 2 + 0.4), 0.97 + entryH / 2, 0);
    post.castShadow = true;
    g.add(post);
    const cap = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.18, 0.72), pal.lacquer);
    cap.position.set(sx * (entryW / 2 + 0.4), 0.97 + entryH + 0.09, 0);
    g.add(cap);
  }

  // stone steps at the entry, descending from the platform edge
  for (let i = 0; i < 3; i++) {
    const top = 0.9 - i * 0.22;
    const step = buildBox(2.6 - i * 0.3, 0.28, top, pal.cobble, 0);
    step.position.z = footD / 2 + 1.32 + i * 0.29;
    g.add(step);
  }

  // large dark tiled roof with a grander pitch
  const roof = buildRoof(footW, footD, wallH, pal.tile);
  roof.scale.set(1, 1.35, 1);
  roof.position.y = 0.97;
  g.add(roof);

  // eave corner brackets — small timber blocks where the eaves turn
  const cx = footW / 2 + ROOF_OVERHANG * 0.85;
  const cz = footD / 2 + ROOF_OVERHANG * 0.8;
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const bracket = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.5, 0.34), pal.timber);
      bracket.position.set(sx * cx, 0.97 + wallH + 0.14, sz * cz);
      bracket.rotation.y = Math.PI / 4;
      bracket.castShadow = true;
      g.add(bracket);
    }
  }
  return g;
}

function buildShop(s: SetStructure, pal: SetPalette, rng: LCG): THREE.Group {
  const g = new THREE.Group();
  const footW = s.w, footD = s.d, wallH = Math.min(s.h * 0.55, 3.8);

  // foundation + floor
  g.add(buildBox(footW + 1.2, footD + 1.2, 0.5, pal.cobble, 0));
  g.add(buildBox(footW, footD, 0.2, pal.packedEarth, 0.5));

  // storefront: open front — 2 side walls + back wall only
  const wallTh = 0.35;
  const back = buildWall(footW, wallH, wallTh, pal.plaster); back.position.set(0, 0.5, -footD); g.add(back);
  const left = buildWall(footD, wallH, wallTh, pal.plaster); left.rotation.y = Math.PI / 2; left.position.set(-footW / 2, 0.5, 0); g.add(left);
  const right = buildWall(footD, wallH, wallTh, pal.plaster); right.rotation.y = Math.PI / 2; right.position.set(footW / 2, 0.5, 0); g.add(right);

  // timber frame
  g.add(buildTimberFrame(footW, footD, wallH, pal.timber));

  // display counter across the open front
  const counter = buildBox(footW * 0.72, 0.7, 0.9, pal.timber, 0.5);
  counter.position.z = footD / 2 - 0.55;
  g.add(counter);

  // canvas awning on two posts, sloping toward the street
  for (const sx of [-1, 1]) {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.16, 2.7, 0.16), pal.timber);
    post.position.set(sx * (footW / 2 - 1.4), 1.35, footD / 2 + 0.5);
    post.castShadow = true;
    g.add(post);
  }
  const awning = new THREE.Mesh(new THREE.BoxGeometry(footW + 0.4, 0.05, 2.2), pal.canvas);
  awning.position.set(0, 2.85, footD / 2 + 1.35);
  awning.rotation.x = -0.35; // proper tent slope so it reads as canvas, not a flat roof
  g.add(awning);
  // front valance fringe (the market awning's scallop language) so the
  // canopy reads as canvas over the entrance, distinct from the tile roof
  const valance = new THREE.Mesh(new THREE.BoxGeometry(footW + 0.5, 0.32, 0.08), pal.canvas);
  valance.position.set(0, 2.62, footD / 2 + 2.4);
  valance.rotation.x = -0.1;
  g.add(valance);
  for (const tx of [-0.4, 0, 0.4]) {
    const tab = new THREE.Mesh(new THREE.BoxGeometry(footW * 0.12, 0.26, 0.06), pal.canvas);
    tab.position.set(tx * (footW / 2.6), 2.44, footD / 2 + 2.4);
    g.add(tab);
  }

  // hanging sign board under the awning
  const sign = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.7, 0.08), pal.woodTrim);
  sign.position.set(0, 2.15, footD / 2 + 1.7);
  g.add(sign);
  for (const sx of [-0.6, 0.6]) {
    const line = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.5, 0.04), pal.woodTrim);
    line.position.set(sx, 2.5, footD / 2 + 1.7);
    g.add(line);
  }

  // stone step across the open front
  const step = buildBox(footW * 0.8, 0.4, 0.18, pal.cobble, 0);
  step.position.z = footD / 2 + 0.24;
  g.add(step);

  // pitched roof with eaves
  const roof = buildRoof(footW, footD, wallH, pal.tile);
  roof.position.y = 0.5;
  g.add(roof);
  return g;
}

function buildWorkshop(s: SetStructure, pal: SetPalette, rng: LCG): THREE.Group {
  const g = new THREE.Group();
  const footW = s.w, footD = s.d, wallH = Math.min(s.h * 0.55, 3.6);

  // foundation + floor
  g.add(buildBox(footW + 1.2, footD + 1.2, 0.6, pal.cobble, 0));
  g.add(buildBox(footW, footD, 0.2, pal.packedEarth, 0.6));

  // half-open: 3 walls, open front
  const wallTh = 0.35;
  const back = buildWall(footW, wallH, wallTh, pal.rammedEarth); back.position.set(0, 0.6, -footD); g.add(back);
  const left = buildWall(footD, wallH, wallTh, pal.rammedEarth); left.rotation.y = Math.PI / 2; left.position.set(-footW / 2, 0.6, 0); g.add(left);
  const right = buildWall(footD, wallH, wallTh, pal.rammedEarth); right.rotation.y = Math.PI / 2; right.position.set(footW / 2, 0.6, 0); g.add(right);

  // two big door posts flanking the open front + lintel beam across
  for (const sx of [-1, 1]) {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.6, wallH, 0.6), pal.timber);
    post.position.set(sx * footW * 0.22, 0.6 + wallH / 2, footD / 2);
    post.castShadow = true;
    g.add(post);
  }
  const lintel = new THREE.Mesh(new THREE.BoxGeometry(footW * 0.44 + 1.2, 0.3, 0.4), pal.timber);
  lintel.position.set(0, 0.6 + wallH, footD / 2);
  g.add(lintel);

  // internal workbench + tool rack on the back wall
  const bench = buildBox(2.6, 0.8, 0.95, pal.timber, 0.6);
  bench.position.z = -footD / 2 + 1.5;
  g.add(bench);
  const rackMat = new THREE.MeshStandardMaterial({ color: 0x5a3a22, roughness: 0.85 });
  for (let i = 0; i < 4; i++) {
    const tool = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.75 + (i % 2) * 0.2, 0.06), rackMat);
    tool.position.set(-1.2 + i * 0.8, 0.6 + 1.3, -footD / 2 + 0.28);
    g.add(tool);
  }

  // timber ridge frame: gable-end posts rising above the ridge + cross beam
  const pitch = wallH * 0.5;
  const ridgeY = 0.6 + wallH + pitch + 0.1;
  for (const sx of [-1, 1]) {
    const rp = new THREE.Mesh(new THREE.BoxGeometry(0.26, 1.6, 0.26), pal.timber);
    rp.position.set(sx * (footW / 2 + ROOF_OVERHANG - 0.15), ridgeY + 0.8, 0);
    rp.castShadow = true;
    g.add(rp);
  }
  const ridgeBeam = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.2, 0.2), pal.timber);
  ridgeBeam.position.set(0, ridgeY + 1.6, 0);
  g.add(ridgeBeam);

  // stone step at the open front (the granary's loading step)
  const step = buildBox(footW * 0.4 + 0.8, 0.5, 0.2, pal.cobble, 0);
  step.position.z = footD / 2 + 0.26;
  g.add(step);

  // pitched roof
  const roof = buildRoof(footW, footD, wallH, pal.thatch);
  roof.position.y = 0.6;
  g.add(roof);
  return g;
}

function buildMarket(s: SetStructure, pal: SetPalette, rng: LCG): THREE.Group {
  const g = new THREE.Group();
  // an open plaza, NOT a house — flat stone floor, no walls/roof
  const floor = new THREE.Mesh(new THREE.BoxGeometry(s.w, 0.3, s.d), pal.stone);
  floor.position.y = 0.15;
  floor.receiveShadow = true;
  g.add(floor);
  const earth = new THREE.Mesh(new THREE.BoxGeometry(s.w * 0.98, 0.08, s.d * 0.98), pal.packedEarth);
  earth.position.y = 0.31;
  earth.receiveShadow = true;
  g.add(earth);
  // raised stone edge ring — the plaza reads as a built place, not grass
  for (const side of [-1, 1]) {
    const edgeNS = new THREE.Mesh(new THREE.BoxGeometry(s.w, 0.5, 0.7), pal.cobble);
    edgeNS.position.set(0, 0.25, side * (s.d / 2 + 0.35));
    edgeNS.receiveShadow = true;
    g.add(edgeNS);
    const edgeEW = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.5, s.d), pal.cobble);
    edgeEW.position.set(side * (s.w / 2 + 0.35), 0.25, 0);
    edgeEW.receiveShadow = true;
    g.add(edgeEW);
  }
  // shade canopies on posts at fixed offsets (market days)
  const canopy = (x: number, z: number) => {
    for (const sx of [-1, 1]) {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.14, 2.6, 0.14), pal.timber);
      post.position.set(x + sx * 2.4, 1.3, z);
      post.castShadow = true;
      g.add(post);
    }
    const shade = new THREE.Mesh(new THREE.BoxGeometry(5.6, 0.05, 3.4), pal.canvas);
    shade.position.set(x, 2.75, z);
    g.add(shade);
  };
  canopy(-16, 8);
  canopy(14, -6);
  canopy(20, 14);
  return g;
}

function buildStructure(s: SetStructure, pal: SetPalette, rng: LCG): THREE.Group {
  const g = new THREE.Group();
  // 'institution' is cast into the blueprint data by set-blueprint-2; widen
  // the switch operand so that kind dispatches at runtime.
  switch (s.kind as string) {
    case 'well': return buildWell(s, pal);
    case 'shrine': return buildShrine(s, pal);
    case 'school': return buildSchool(s, pal);
    case 'cache': return buildCache(s, pal, rng);
    case 'gate': return buildGate(s, pal);
    case 'foothill': return buildFoothills(s, pal, rng);
    case 'field': return buildFields(s, pal);
    case 'creek': {
      const water = new THREE.Mesh(new THREE.PlaneGeometry(s.d, 7), pal.water);
      water.rotation.x = -Math.PI / 2;
      water.position.z = 4;
      g.add(water);
      return g;
    }
    case 'institution': return buildInstitution(s, pal, rng);
    case 'shop': return buildShop(s, pal, rng);
    case 'workshop': return buildWorkshop(s, pal, rng);
    case 'market': return buildMarket(s, pal, rng);
    case 'dock': {
      // timber pier on pilings — a deck, not a house
      const deck = new THREE.Mesh(new THREE.BoxGeometry(s.w, 0.35, s.d), pal.timber);
      deck.position.y = 0.75;
      deck.receiveShadow = true;
      g.add(deck);
      const piling = (x: number, z: number) => {
        const p = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.75, 0.3), pal.timber);
        p.position.set(x, 0.375, z);
        p.castShadow = true;
        g.add(p);
      };
      for (const x of [-s.w / 2 + 1.5, 0, s.w / 2 - 1.5]) {
        for (const z of [-s.d / 2 + 2, s.d / 2 - 2]) piling(x, z);
      }
      return g;
    }
    default: return buildHouse(s, pal, rng);
  }
}

/** Build a prop mesh (kang, loom, desks, well ring...) from a SetProp. */
export function buildPropMesh(p: SetProp, pal: SetPalette): THREE.Mesh {
  const h = Math.max(p.h, 0.05);
  const mat =
    p.material.includes('water') ? pal.water :
    p.material.includes('bronze') || p.material.includes('brass') ? pal.woodTrim :
    p.material.includes('stone') || p.material.includes('cobble') ? pal.cobble :
    p.material.includes('hemp') || p.material.includes('cloth') || p.material.includes('fabric') ? pal.hemp :
    p.material.includes('thatch') ? pal.thatch :
    p.material.includes('earth') || p.material.includes('soil') ? pal.packedEarth :
    pal.timber;
  const m = new THREE.Mesh(new THREE.BoxGeometry(Math.max(p.w, 0.2), h, Math.max(p.d, 0.2)), mat);
  m.position.y = h / 2;
  m.castShadow = true;
  return m;
}

// ---------------------------------------------------------------------------
// Full village assembly
// ---------------------------------------------------------------------------

export interface VillageScene {
  group: THREE.Group;
  structures: Map<string, THREE.Group>;
  palette: SetPalette;
  seed: number;
}

/** Assemble the entire Wang Family Bend set into one group (deterministic). */
export function buildVillageScene(seed = 89274613): VillageScene {
  const rng = new LCG(seed ^ 0x51ab);
  const pal = makePalette();
  const group = new THREE.Group();
  const structures = new Map<string, THREE.Group>();

  // terrain base — a GREEN valley floor (the art bible: forest greens dominate)
  const terrain = new THREE.Mesh(new THREE.PlaneGeometry(1400, 1400), pal.foliage);
  terrain.rotation.x = -Math.PI / 2;
  terrain.position.y = -0.05;
  terrain.receiveShadow = true;
  group.add(terrain);

  // field patches at the MACRO scale: alternating green/earth rectangles so
  // the aerial reads as farmland, not a featureless void (VLM: 'flat teal
  // void'). Deterministic, laid on the valley floor east and west of the
  // village, mirroring the paddy/dryland in the blueprint.
  const fieldMatA = new THREE.MeshStandardMaterial({ color: 0x4a7a3c, roughness: 1 });
  const fieldMatB = new THREE.MeshStandardMaterial({ color: 0x6a8a48, roughness: 1 });
  const fieldMatC = new THREE.MeshStandardMaterial({ color: 0x7a6a46, roughness: 1 }); // dry
  for (let i = 0; i < 24; i++) {
    const fw = rng.nextRange(70, 120);
    const fd = rng.nextRange(70, 120);
    const fx = (i % 2 === 0 ? 1 : -1) * rng.nextRange(160, 420);
    const fz = rng.nextRange(-360, 360);
    const mat = i % 4 === 3 ? fieldMatC : i % 2 === 0 ? fieldMatA : fieldMatB;
    const f = new THREE.Mesh(new THREE.BoxGeometry(fw, 0.06, fd), mat);
    f.position.set(fx, 0.02, fz);
    f.rotation.y = (i * 37) % 180 * 0.017; // deterministic varied orientation
    f.receiveShadow = true;
    group.add(f);
  }

  // ---- the village plan (worldbuilt): main road N-S, square at the
  // center, households on plots east/west with setbacks, fields east,
  // creek west, gate north, cache + foothills south. Every plot is
  // verified non-overlapping by the conformance suite.
  const mainRoad = new THREE.Mesh(new THREE.BoxGeometry(12, 0.08, 340), pal.packedEarth);
  mainRoad.position.set(0, 0, 30);
  mainRoad.receiveShadow = true;
  group.add(mainRoad);
  const fieldRoad = new THREE.Mesh(new THREE.BoxGeometry(9, 0.08, 90), pal.packedEarth);
  // field plot: worked soil visible from the road
  const fieldPlot = new THREE.Mesh(new THREE.BoxGeometry(180, 0.07, 120), pal.packedEarth);
  fieldPlot.position.set(210, 0, 80);
  fieldPlot.receiveShadow = true;
  group.add(fieldPlot);
  fieldRoad.rotation.y = Math.PI / 2;
  fieldRoad.position.set(80, 0, 60);
  fieldRoad.receiveShadow = true;
  group.add(fieldRoad);
  // square paving around the well
  const square = new THREE.Mesh(new THREE.BoxGeometry(34, 0.08, 26), pal.packedEarth);
  square.position.set(0, 0, -8);
  square.receiveShadow = true;
  group.add(square);

  // road-edge trees (worldbuilding: the road is lined with alders).
  // Two-tier crown + sidewise upper tier so they read as trees, not cones.
  const treeMat = pal.foliage;
  for (let i = -6; i <= 6; i++) {
    for (const side of [-1, 1]) {
      const t = new THREE.Group();
      const trunk = new THREE.Mesh(new THREE.BoxGeometry(0.4, 3.2, 0.4), pal.timber);
      trunk.position.y = 1.6;
      t.add(trunk);
      const crown = new THREE.Mesh(new THREE.ConeGeometry(1.6, 3.2, 6), treeMat);
      crown.position.y = 4.2;
      crown.castShadow = true;
      t.add(crown);
      const top = new THREE.Mesh(new THREE.ConeGeometry(0.9, 2.0, 6), treeMat);
      top.position.set(0.5, 5.2, 0.3);
      top.castShadow = true;
      t.add(top);
      const vary = ((i + 7) % 5) * 0.14 - 0.28; // slight per-tree height/scale variation
      t.scale.set(1 + vary, 1 + vary * 0.6, 1 + vary);
      t.position.set(side * (9 + (Math.abs(i) % 3)), 0, -120 + i * 26);
      t.castShadow = true;
      group.add(t);
    }
  }

  const placed: Array<[SetStructure, number, number]> = [
    [byId('structure.village_gate'), 0, 160],
    [byId('structure.market_stalls'), 16, 36],
    [byId('structure.senior_household'), 40, 26],
    [byId('structure.lineage_school'), -42, 22],
    [byId('structure.carpenter_house'), -38, -12],
    [byId('structure.widow_house'), -30, -36],
    [byId('structure.well'), 11, -6],
    [byId('structure.dao_shrine'), -11, -9],
    [byId('structure.salt_merchant_house'), 48, -54],
    [byId('structure.tenant_household'), 62, 44],
    [byId('structure.black_creek'), -95, -70],
    [byId('structure.tenant_fields'), 220, 90],
    [byId('structure.cache_hill'), -42, -235],
    [byId('structure.foothills'), 0, -520],
  ];

  for (const [s, x, z] of placed) {
    const sg = buildStructure(s, pal, rng);
    sg.position.set(x, 0, z);
    sg.userData = { id: s.id, name: s.name, kind: s.kind, detail: s.artDirection };
    group.add(sg);
    structures.set(s.id, sg);
    // exterior props render with their real silhouettes (PROP_BUILDERS first)
    for (const p of s.exterior) {
      const builder = PROP_BUILDERS[p.id];
      const pm = builder ? builder(pal) : buildPropMesh(p, pal);
      const rx = rng.nextRange(-Math.max(s.w / 2 - 2, 0.5), Math.max(s.w / 2 - 2, 0.5));
      const rz = rng.nextRange(-Math.max(s.d / 2 - 2, 0.5), Math.max(s.d / 2 - 2, 0.5));
      pm.position.set(x + rx, 0, z + rz);
      pm.userData = { id: p.id, name: p.name, kind: 'prop', detail: p.detail };
      group.add(pm);
    }
    // the detail department: canon props + ambient dressing for every structure
    const dressed = dressStructure(s, pal, seed + s.id.length * 101);
    dressed.position.set(x, 0, z);
    group.add(dressed);
    // room fixtures built from the blueprint registry (interiors furnished)
    for (const room of s.rooms) {
      for (const f of room.fixtures) {
        const builder = PROP_BUILDERS[f.id];
        if (!builder) continue;
        const fm = builder(pal);
        fm.position.set(
          x + rng.nextRange(-room.w / 3, room.w / 3),
          0,
          z + rng.nextRange(-room.d / 3, room.d / 3),
        );
        group.add(fm);
      }
    }
  }

  // yard patches: packed earth around each household plot
  const yards: Array<[string, number, number]> = [
    ['structure.senior_household', 40, 26], ['structure.tenant_household', 62, 44],
    ['structure.salt_merchant_house', 48, -54], ['structure.carpenter_house', -38, -12],
    ['structure.widow_house', -30, -36],
  ];
  for (const [yid, yx, yz] of yards) {
    const s = byId(yid);
    const y = new THREE.Mesh(new THREE.BoxGeometry(s.w + 8, 0.05, s.d + 8), pal.packedEarth);
    y.position.set(yx, 0, yz);
    y.receiveShadow = true;
    group.add(y);
  }

  return { group, structures, palette: pal, seed };
}

function byId(id: string): SetStructure {
  const s = WANG_FAMILY_BEND.structures.find((x) => x.id === id);
  if (!s) throw new Error(`set structure missing: ${id}`);
  return s;
}

/** Factory coverage for conformance: every structure kind has a builder. */
export function structureKindsBuilt(): string[] {
  return [...new Set(WANG_FAMILY_BEND.structures.map((s) => s.kind as string))];
}

/**
 * buildRoomSet — a furnished interior volume (the critic's fix: buildings
 * must read as inhabited, not brown rectangles). Floor, low walls (open
 * top so the camera can look in), a warm lamp, and every fixture from the
 * prop registry, placed deterministically.
 */
export function buildRoomSet(room: SetRoom, pal: SetPalette): THREE.Group {
  const g = new THREE.Group();
  const rng = new LCG((room.id.length * 0x9e37) ^ 0x51ab);

  // floor
  const floor = new THREE.Mesh(new THREE.BoxGeometry(room.w, 0.08, room.d), pal.packedEarth);
  floor.position.y = -0.04;
  floor.receiveShadow = true;
  g.add(floor);

  // low walls (open top), warm plaster inside
  const wallMat = new THREE.MeshStandardMaterial({ color: 0xd8c8ae, roughness: 0.9 });
  const wallT = 0.16;
  const wallH = Math.min(room.h, 3.4);
  const mkWall = (w: number, d: number, x: number, z: number) => {
    const wall = new THREE.Mesh(new THREE.BoxGeometry(w, wallH, d), wallMat);
    wall.position.set(x, wallH / 2, z);
    g.add(wall);
  };
  mkWall(room.w, wallT, 0, room.d / 2);
  mkWall(room.w, wallT, 0, -room.d / 2);
  mkWall(wallT, room.d, -room.w / 2, 0);
  mkWall(wallT, room.d, room.w / 2, 0);

  // warm lamp (emissive) — the interior's light source
  const lamp = new THREE.Mesh(
    new THREE.BoxGeometry(0.5, 0.08, 0.5),
    new THREE.MeshStandardMaterial({ color: 0xffd8a0, emissive: 0xffb060, emissiveIntensity: 2.5 }),
  );
  lamp.position.set(0, wallH - 0.3, 0);
  g.add(lamp);

  // fixtures from the prop registry, deterministic scatter near walls
  let ix = 0;
  for (const f of room.fixtures) {
    const builder = PROP_BUILDERS[f.id];
    if (!builder) continue;
    const obj = builder(pal);
    const side = ix % 4;
    const t = 0.3 + (ix * 0.19) % 0.6;
    switch (side) {
      case 0: obj.position.set(-room.w / 2 + room.w * t, 0, -room.d / 2 + 1.2); obj.rotation.y = 0; break;
      case 1: obj.position.set(room.w / 2 - 1.2, 0, -room.d / 2 + room.d * t); obj.rotation.y = Math.PI / 2; break;
      case 2: obj.position.set(room.w / 2 - room.w * t, 0, room.d / 2 - 1.2); obj.rotation.y = Math.PI; break;
      default: obj.position.set(-room.w / 2 + 1.2, 0, room.d / 2 - room.d * t); obj.rotation.y = -Math.PI / 2; break;
    }
    g.add(obj);
    ix++;
  }

  // ROOM AMBIENCE — the "every nook accounted for" pass: sparse rooms read
  // as voids (VLM: 'black void'). Deterministic lived-in scatter: water
  // jars, baskets, firewood, stools, drying herbs, wall shelves. Density
  // scales with room size so even the widow's single room reads inhabited.
  const ambCount = Math.min(2 + Math.floor((room.w * room.d) / 12), 6);
  const jarMat = new THREE.MeshStandardMaterial({ color: 0x6a5a3a, roughness: 0.9 });
  const basketMat = new THREE.MeshStandardMaterial({ color: 0x8a7a52, roughness: 1 });
  const woodMat = new THREE.MeshStandardMaterial({ color: 0x6a4a28, roughness: 0.85 });
  const herbMat = new THREE.MeshStandardMaterial({ color: 0x5a8a4a, roughness: 1 });
  for (let a = 0; a < ambCount; a++) {
    const kind = a % 5;
    let obj: THREE.Object3D;
    if (kind === 0) {
      const jar = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.26, 0.5, 8), jarMat);
      jar.position.y = 0.25;
      obj = jar;
    } else if (kind === 1) {
      const basket = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.22, 0.32, 8), basketMat);
      basket.position.y = 0.16;
      obj = basket;
    } else if (kind === 2) {
      const stool = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.4, 0.35), woodMat);
      stool.position.y = 0.2;
      obj = stool;
    } else if (kind === 3) {
      const bundle = new THREE.Group();
      for (let b = 0; b < 3; b++) {
        const herb = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.55, 5), herbMat);
        herb.position.set((b - 1) * 0.05, 0.3, 0);
        bundle.add(herb);
      }
      obj = bundle;
    } else {
      const shelf = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.05, 0.22), woodMat);
      shelf.position.y = wallH - 0.5;
      obj = shelf;
    }
    // deterministic scatter, avoiding the centre (the lamp/focal area)
    const ax = rng.nextRange(-room.w / 2 + 0.7, room.w / 2 - 0.7);
    const az = rng.nextRange(-room.d / 2 + 0.6, room.d / 2 - 0.6);
    obj.position.x = ax;
    obj.position.z = az;
    obj.rotation.y = rng.nextRange(0, Math.PI * 2);
    g.add(obj);
  }

  return g;
}

/** The game's opening: the player begins in the village square at dawn. */
export const GAME_START = {
  position: [10, 0, -4] as [number, number, number],
  /** facing the senior household across the square (world z direction). */
  yawRad: Math.atan2(40 - -4, 10 - 10), // toward (40, 26) from (10, -4)
  timeOfDay: 'dawn',
  note: 'One mortal morning in Wang Family Bend: the player wakes in the square, the well to the east, the Dao shrine west, the senior household north-east across the road.',
};

// ---------------------------------------------------------------------------
// Qinghe Market Town (Episode 2) — the mortal/cultivator trade interface
// ---------------------------------------------------------------------------

const TOWN_PLACEMENT: Array<[string, number, number]> = [
  ['structure.qinghe.yamen', 0, 0],
  ['structure.qinghe.market_square', 0, 60],
  ['structure.qinghe.tea_house', -70, 40],
  ['structure.qinghe.medicine_shop', 70, 40],
  ['structure.qinghe.inn', -70, -60],
  ['structure.qinghe.salt_depot', 40, -70],
  ['structure.qinghe.dock', -20, -120],
  ['structure.qinghe.granary', 80, 120],
];

/** Build the market town (deterministic; same factory kits as the village). */
export function buildTownScene(seed = 89274613): VillageScene {
  const rng = new LCG(seed ^ 0x51ab);
  const pal = makePalette();
  const group = new THREE.Group();
  const structures = new Map<string, THREE.Group>();
  const town = QINGHE_MARKET_TOWN;

  const terrain = new THREE.Mesh(new THREE.PlaneGeometry(900, 900), pal.foliage);
  terrain.rotation.x = -Math.PI / 2;
  terrain.position.y = -0.05;
  terrain.receiveShadow = true;
  group.add(terrain);

  // river (east edge, reflecting the sky)
  const river = new THREE.Mesh(new THREE.PlaneGeometry(90, 700), pal.water);
  river.rotation.x = -Math.PI / 2;
  river.position.set(-180, 0, 30);
  group.add(river);

  // main street + market road south
  const street = new THREE.Mesh(new THREE.BoxGeometry(16, 0.08, 260), pal.packedEarth);
  street.position.set(0, 0, -30);
  street.receiveShadow = true;
  group.add(street);
  const roadSouth = new THREE.Mesh(new THREE.BoxGeometry(12, 0.08, 160), pal.packedEarth);
  roadSouth.rotation.y = Math.PI / 2;
  roadSouth.position.set(0, 0, 150);
  roadSouth.receiveShadow = true;
  group.add(roadSouth);

  // raised road edges: low stone curbs flanking the main street, built as
  // 6-10 m segments with gaps so the street reads as laid stone, not a slab
  for (const segZ of [-128, -92, -56, -20, 16, 52]) {
    for (const side of [-1, 1]) {
      const edge = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.45, 9), pal.cobble);
      edge.position.set(side * 8.3, 0.225, segZ);
      edge.receiveShadow = true;
      group.add(edge);
    }
  }

  // ---- phase U — the horizon. The town sits in a valley; the eye must land
  // on mountains, foothills, forest and river, not on empty ground.
  const nearTown = (x: number, z: number, margin = 60) =>
    TOWN_PLACEMENT.some(([, sx, sz]) => Math.hypot(x - sx, z - sz) < margin);

  // distant mountain ring (north / east / west; south kept for the foothills)
  const ringDirs: Array<[number, number]> = [
    [0, -1],        // north
    [0.78, -0.62],  // north-east
    [1, 0.12],      // east
    [0.55, 0.83],   // east-south
    [-0.85, -0.5],  // west-north
    [-1, 0.15],     // west
  ];
  for (let i = 0; i < ringDirs.length; i++) {
    const [dx, dz] = ringDirs[i];
    const dist = rng.nextRange(760, 1020);
    const r = rng.nextRange(150, 400);
    const h = rng.nextRange(120, 350);
    const m = new THREE.Mesh(new THREE.ConeGeometry(r, h, 5), pal.hazyBlue);
    m.position.set(dx * dist, h * 0.32, dz * dist);
    m.castShadow = true;
    group.add(m);
    // secondary off-center peak: breaks the 'literal cone' read into a
    // ridgeline silhouette (VLM: 'the mountain is a literal cone')
    const r2 = r * rng.nextRange(0.35, 0.6);
    const h2 = h * rng.nextRange(0.45, 0.7);
    const m2 = new THREE.Mesh(new THREE.ConeGeometry(r2, h2, 5), pal.hazyBlue);
    const offAng = rng.nextRange(0, Math.PI * 2);
    const offR = r * rng.nextRange(0.7, 1.1);
    m2.position.set(dx * dist + Math.cos(offAng) * offR, h2 * 0.3, dz * dist + Math.sin(offAng) * offR);
    m2.castShadow = true;
    group.add(m2);
  }

  // mid-distance ridge band: darker, closer silhouettes between the
  // foreground hills and the far ring — atmospheric depth layers so the
  // landscape reads as layered range, not a single flat triangle (VLM:
  // aerials read as '2D vector illustration / flat polygons')
  const midMat = new THREE.MeshStandardMaterial({ color: 0x5d7390, roughness: 1 });
  for (let i = 0; i < ringDirs.length; i++) {
    const [dx, dz] = ringDirs[i];
    const dist = rng.nextRange(420, 620);
    const r = rng.nextRange(80, 200);
    const h = rng.nextRange(70, 190);
    const m = new THREE.Mesh(new THREE.ConeGeometry(r, h, 6), midMat);
    m.position.set(dx * dist, h * 0.3, dz * dist);
    m.castShadow = true;
    group.add(m);
  }

  // Cangwu foothills silhouette — bigger, closer blue-grey cones due south.
  // Each gets a secondary peak so the range reads as ridgelines, not a
  // single 'literal cone' (VLM: 'the mountain is a literal cone')
  for (let i = 0; i < 3; i++) {
    const dx = rng.nextRange(-160, 160);
    const dz = rng.nextRange(520, 680);
    const r = rng.nextRange(220, 380);
    const h = rng.nextRange(220, 420);
    const m = new THREE.Mesh(new THREE.ConeGeometry(r, h, 6), pal.hazeBlue);
    m.position.set(dx, h * 0.32, dz);
    m.castShadow = true;
    group.add(m);
    const r2 = r * rng.nextRange(0.4, 0.65);
    const h2 = h * rng.nextRange(0.5, 0.75);
    const m2 = new THREE.Mesh(new THREE.ConeGeometry(r2, h2, 6), pal.hazeBlue);
    const offAng = rng.nextRange(0, Math.PI * 2);
    const offR = r * rng.nextRange(0.8, 1.2);
    m2.position.set(dx + Math.cos(offAng) * offR, h2 * 0.3, dz + Math.sin(offAng) * offR);
    m2.castShadow = true;
    group.add(m2);
  }

  // THE XIANXIA PRESENCE — the world above the mortal bend (doc 12, 25):
  // a spirit-vein shimmer along the foothills (the cache's vein trace) and
  // the distant Azure Sword peak to the north, readable as a place where
  // cultivators hold qi — never neon, a restrained warm-teal underglow.
  const veinGlowMat = new THREE.MeshBasicMaterial({
    color: 0x59e8c8, transparent: true, opacity: 0.16, depthWrite: false,
  });
  for (const [vx, vz] of [[-60, -320], [30, -340]]) {
    const glow = new THREE.Mesh(new THREE.PlaneGeometry(160, 30), veinGlowMat);
    glow.rotation.x = -Math.PI / 2;
    glow.position.set(vx, 1.2, vz);
    group.add(glow);
  }
  // the sect peak: a tall pale cone north (500 li = unreadable at this
  // scale, so it reads as the highest, faintest ridge — the direction
  // the road runs, where the recruiters come from)
  const sectPeak = new THREE.Mesh(new THREE.ConeGeometry(420, 700, 6), pal.hazeBlue);
  sectPeak.position.set(30, 240, -900);
  sectPeak.castShadow = true;
  group.add(sectPeak);
  // sect peak shoulder: a lower off-set cone so the sacred mountain reads
  // as a massif with a high peak, not a single 'literal cone' (VLM)
  const sectShoulder = new THREE.Mesh(new THREE.ConeGeometry(280, 320, 6), pal.hazeBlue);
  sectShoulder.position.set(140, 110, -820);
  sectShoulder.castShadow = true;
  group.add(sectShoulder);
  const sectFoothill2 = new THREE.Mesh(new THREE.ConeGeometry(180, 200, 6), pal.hazeBlue);
  sectFoothill2.position.set(-120, 70, -980);
  sectFoothill2.castShadow = true;
  group.add(sectFoothill2);

  // forest band — 14 candidate trees, varied, skipping the town/river/foothills.
  // Two-tier crown (main + offset upper tier) so trees read as trees, not cones.
  for (let i = 0; i < 14; i++) {
    const ang = rng.nextRange(0, Math.PI * 2);
    const dist = rng.nextRange(290, 480);
    const tx = Math.cos(ang) * dist;
    const tz = Math.sin(ang) * dist;
    const inRiver = Math.abs(tx + 180) < 48 && Math.abs(tz - 30) < 340;
    if (nearTown(tx, tz) || inRiver) continue;
    const th = rng.nextRange(2.6, 3.8);
    const cr = rng.nextRange(3.4, 6.2);
    const ch = rng.nextRange(6, 11);
    const t = new THREE.Group();
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.75, th, 6), pal.timber);
    trunk.position.y = th / 2;
    t.add(trunk);
    const crown = new THREE.Mesh(new THREE.ConeGeometry(cr, ch, 6), pal.foliage);
    crown.position.y = th + ch / 2 - 0.6;
    crown.castShadow = true;
    t.add(crown);
    // upper tier: smaller cone offset up + sideways — breaks the single-cone read
    const top = new THREE.Mesh(new THREE.ConeGeometry(cr * 0.55, ch * 0.6, 6), pal.foliage);
    top.position.set(cr * 0.35, th + ch * 0.95, cr * 0.2);
    top.castShadow = true;
    t.add(top);
    t.position.set(tx, 0, tz);
    group.add(t);
  }

  // river life — two moored cargo boats and reed beds along the near bank
  for (const bz of [-46, 96]) {
    const bx = -183 + rng.nextRange(-4, 4);
    const boat = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.4, 0.85), pal.timber);
    boat.position.set(bx, 0.22, bz + rng.nextRange(-8, 8));
    boat.castShadow = true;
    group.add(boat);
    const mast = new THREE.Mesh(new THREE.BoxGeometry(0.06, 1.5, 0.06), pal.timber);
    mast.position.set(bx, 1.0, boat.position.z);
    group.add(mast);
  }
  for (let i = 0; i < 4; i++) {
    const rz = rng.nextRange(-120, 220);
    const rx = -136 + rng.nextRange(-2, 2);
    const count = 3 + rng.nextInt(0, 2);
    for (let j = 0; j < count; j++) {
      const rh = rng.nextRange(0.7, 1.3);
      const reed = new THREE.Mesh(new THREE.BoxGeometry(0.09, rh, 0.09), pal.foliage);
      reed.position.set(rx + j * 0.25 - count * 0.12, rh / 2, rz + j * 0.15);
      group.add(reed);
    }
  }

  // terrain contact — low rolling hills (wide flat cones), kept off the plots
  let hillsPlaced = 0;
  let tries = 0;
  while (hillsPlaced < 4 && tries < 40) {
    tries++;
    const ang = rng.nextRange(0, Math.PI * 2);
    const dist = rng.nextRange(150, 300);
    const hx = Math.cos(ang) * dist;
    const hz = Math.sin(ang) * dist;
    const inRiver = Math.abs(hx + 180) < 50 && Math.abs(hz - 30) < 340;
    if (nearTown(hx, hz) || inRiver) continue;
    const r = rng.nextRange(60, 120);
    const h = rng.nextRange(1.5, 3);
    const hill = new THREE.Mesh(new THREE.ConeGeometry(r, h, 16), pal.foliage);
    hill.position.set(hx, h / 2 - 0.2, hz);
    hill.receiveShadow = true;
    group.add(hill);
    hillsPlaced++;
  }

  for (const [id, x, z] of TOWN_PLACEMENT) {
    const s = town.structures.find((st) => st.id === id)!;
    const sg = buildStructure(s, pal, rng);
    sg.position.set(x, 0, z);
    sg.userData = { id: s.id, name: s.name, kind: s.kind, detail: s.artDirection };
    group.add(sg);
    structures.set(id, sg);
    // ALL exterior props render with their real silhouettes (PROP_BUILDERS
    // registry), placed deterministically inside the plot — not the old
    // slice(0,3) plain-box path that hid the dressing department's work.
    // MARKET SQUARE props CLUSTER around the stall/crowd line (a 60x40 m
    // plaza scattered uniformly would put stock 25 m from the stall —
    // VLM: 'no stock, no carts'). Other plots scatter across their bounds.
    const isMarket = s.id === 'structure.qinghe.market_square';
    for (const p of s.exterior) {
      const builder = PROP_BUILDERS[p.id];
      const pm = builder ? builder(pal) : buildPropMesh(p, pal);
      const spread = isMarket ? 7 : Math.max(s.w / 2 - 2, 0.5);
      const rx = rng.nextRange(-spread, spread);
      const rz = rng.nextRange(-spread, spread);
      pm.position.set(x + rx, 0, z + rz);
      pm.userData = { id: p.id, name: p.name, kind: 'prop', detail: p.detail };
      group.add(pm);
    }
    // the detail department: canon props + ambient dressing around the architecture
    const dressed = dressStructure(s, pal, seed + s.id.length * 101);
    dressed.position.set(x, 0, z);
    group.add(dressed);
    // room fixtures built from the blueprint registry (interiors furnished)
    for (const room of s.rooms) {
      for (const f of room.fixtures) {
        const builder = PROP_BUILDERS[f.id];
        if (!builder) continue;
        const fm = builder(pal);
        fm.position.set(
          x + rng.nextRange(-room.w / 3, room.w / 3),
          0,
          z + rng.nextRange(-room.d / 3, room.d / 3),
        );
        group.add(fm);
      }
    }
  }

  return { group, structures, palette: pal, seed };
}
