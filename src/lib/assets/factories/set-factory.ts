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
}

export function makePalette(): SetPalette {
  const std = (color: number, roughness: number, metalness = 0) =>
    new THREE.MeshStandardMaterial({ color, roughness, metalness });
  // painterly hand-painted materials when the browser canvas is available;
  // plain-color fallback in Node (conformance).
  const tex = (id: Parameters<typeof painterlyMaterial>[0], color?: number, roughness = 0.85) =>
    painterlyMaterial(id, { color, roughness });
  return {
    rammedEarth: tex('rammedEarth', 0xffffff),
    timber: tex('timber', 0xffffff),
    thatch: tex('thatch', 0xffffff),
    plaster: tex('plaster', 0xffffff),
    cobble: tex('cobble', 0xffffff),
    packedEarth: tex('packedEarth', 0xffffff),
    stone: tex('stone', 0xffffff),
    water: new THREE.MeshStandardMaterial({ color: 0x2e5f6b, roughness: 0.1, metalness: 0.2, transparent: true, opacity: 0.85 }),
    woodTrim: std(0x7a4a24, 0.7),
    canvas: tex('canvas', 0xffffff),
    hemp: tex('hemp', 0xffffff),
    foliage: tex('hemp', 0x4a7a3c),
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
  post(-hw, -hd); post(hw, -hd); post(-hw, hd); post(hw, hd);
  return g;
}

// ---------------------------------------------------------------------------
// Structure builders (each set structure -> Group)
// ---------------------------------------------------------------------------

function buildHouse(s: SetStructure, pal: SetPalette, rng: LCG): THREE.Group {
  const g = new THREE.Group();
  const footW = s.w, footD = s.d, wallH = Math.min(s.h * 0.55, 3.6);

  // foundation
  g.add(buildBox(footW + 1.2, footD + 1.2, 0.7, pal.cobble, 0));

  // floor
  g.add(buildBox(footW, footD, 0.25, pal.packedEarth, 0.7));

  // walls (front has the door)
  const wallTh = 0.35;
  g.add(buildWall(footW, wallH, wallTh, pal.rammedEarth, { door: true })); // front (z+)
  const back = buildWall(footW, wallH, wallTh, pal.rammedEarth); back.position.z = -footD; g.add(back);
  const left = buildWall(footD, wallH, wallTh, pal.rammedEarth); left.rotation.y = Math.PI / 2; left.position.x = -footW / 2; g.add(left);
  const right = buildWall(footD, wallH, wallTh, pal.rammedEarth); right.rotation.y = Math.PI / 2; right.position.x = footW / 2; g.add(right);

  // timber frame
  g.add(buildTimberFrame(footW, footD, wallH, pal.timber));

  // roof — base sits at the wall top (new buildRoof positions itself)
  g.add(buildRoof(footW, footD, wallH, pal.thatch));

  // windows (lit paper at night, dark day) + warm glow so apertures read
  const win = (x: number, z: number, rz = 0) => {
    const w = buildBox(1.0, 0.06, 0.9, pal.plaster, wallH * 0.62);
    w.position.set(x, 0, z); w.rotation.y = rz;
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
  // New gable roof: base sits at its given wallH — place it so the base rests
  // on the beam top (s.h - 0.35 + 0.55 = s.h + 0.2), ridge rises from there.
  const gateRoofH = 1.4;
  const roof = buildRoof(7.6, 1.4, gateRoofH, pal.thatch);
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

function buildStructure(s: SetStructure, pal: SetPalette, rng: LCG): THREE.Group {
  const g = new THREE.Group();
  switch (s.kind) {
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
    case 'market': {
      // an open plaza, NOT a house — flat stone floor, no walls/roof
      const floor = new THREE.Mesh(new THREE.BoxGeometry(s.w, 0.3, s.d), pal.stone);
      floor.position.y = 0.15;
      floor.receiveShadow = true;
      g.add(floor);
      const earth = new THREE.Mesh(new THREE.BoxGeometry(s.w * 0.98, 0.08, s.d * 0.98), pal.packedEarth);
      earth.position.y = 0.31;
      earth.receiveShadow = true;
      g.add(earth);
      return g;
    }
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

  // road-edge trees (worldbuilding: the road is lined with alders)
  const treeMat = pal.foliage;
  for (let i = -6; i <= 6; i++) {
    for (const side of [-1, 1]) {
      const t = new THREE.Group();
      const trunk = new THREE.Mesh(new THREE.BoxGeometry(0.4, 3.2, 0.4), pal.timber);
      trunk.position.y = 1.6;
      t.add(trunk);
      const crown = new THREE.Mesh(new THREE.ConeGeometry(1.6, 3.2, 6), treeMat);
      crown.position.y = 4.2;
      t.add(crown);
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
    // exterior props as simple boxes (kept inside the plot)
    for (const p of s.exterior.slice(0, 3)) {
      const pm = buildPropMesh(p, pal);
      const rx = rng.nextRange(-Math.max(s.w / 2 - 2, 0.5), Math.max(s.w / 2 - 2, 0.5));
      const rz = rng.nextRange(-Math.max(s.d / 2 - 2, 0.5), Math.max(s.d / 2 - 2, 0.5));
      pm.position.set(x + rx, 0, z + rz);
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

  for (const [id, x, z] of TOWN_PLACEMENT) {
    const s = town.structures.find((st) => st.id === id)!;
    const sg = buildStructure(s, pal, rng);
    sg.position.set(x, 0, z);
    sg.userData = { id: s.id, name: s.name, kind: s.kind, detail: s.artDirection };
    group.add(sg);
    structures.set(id, sg);
    // props within the plot
    for (const p of s.exterior.slice(0, 3)) {
      const pm = buildPropMesh(p, pal);
      const rx = rng.nextRange(-Math.max(s.w / 2 - 2, 0.5), Math.max(s.w / 2 - 2, 0.5));
      const rz = rng.nextRange(-Math.max(s.d / 2 - 2, 0.5), Math.max(s.d / 2 - 2, 0.5));
      pm.position.set(x + rx, 0, z + rz);
      group.add(pm);
    }
  }

  return { group, structures, palette: pal, seed };
}
