/**
 * Dressing Factory — the detail department.
 *
 * Every nook and cranny: a builder registry that must cover EVERY prop in
 * the set blueprint (machine-audited), plus per-structure-kind ambient
 * dressing sets (firewood, jars, chickens, drying herbs, ink stones,
 * incense, buckets...) scattered deterministically. This is the
 * "the world feels alive, not a sketch prototype" layer.
 */

import * as THREE from 'three';
import { LCG } from '../../determinism/primitives';
import { WANG_FAMILY_BEND } from '../../worldproduction/set-blueprint';
import type { SetStructure, SetProp } from '../../worldproduction/set-blueprint';
import { painterlyMaterial } from './textures';
import type { SetPalette } from './set-factory';

export type DressingBuilder = (pal: SetPalette) => THREE.Object3D;

// ---------------------------------------------------------------------------
// Prop registry — one builder per blueprint prop id (coverage-audited).
// ---------------------------------------------------------------------------

function boxProp(w: number, h: number, d: number, mat: THREE.Material, yOffset = 0): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.BoxGeometry(Math.max(w, 0.15), Math.max(h, 0.06), Math.max(d, 0.15)), mat);
  m.position.y = h / 2 + yOffset;
  m.castShadow = true;
  return m;
}

function smallGroup(...items: THREE.Object3D[]): THREE.Group {
  const g = new THREE.Group();
  for (const i of items) g.add(i);
  return g;
}

// ---------------------------------------------------------------------------
// Shared detail kit — deterministic sub-assemblies (no Math.random anywhere).
// ---------------------------------------------------------------------------

const stdMat = (color: number, roughness = 0.85, metalness = 0) =>
  new THREE.MeshStandardMaterial({ color, roughness, metalness });

const IRON = stdMat(0x4a4e55, 0.55, 0.55);
const BRASS = stdMat(0x9a8034, 0.45, 0.65);
const ROPE = stdMat(0x8a7448, 0.95);
const SALT = stdMat(0xe8e4d8, 0.9);
const MOSS = stdMat(0x5a7a4a, 1);
const LEATHER = stdMat(0x7a3c28, 0.9);
const RED_CLOTH = stdMat(0x9c3c30, 0.95);
const GLOW = new THREE.MeshBasicMaterial({ color: 0xd8a05a });

/** Thin dark-green weathering line along a prop base (phase G / P16). */
function grimeStrip(w: number, d: number, y = 0.02): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, 0.06, d), MOSS);
  m.position.y = y;
  return m;
}

function cylProp(rTop: number, rBot: number, h: number, m: THREE.Material, seg = 10): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(rTop, rBot, h, seg), m);
  mesh.position.y = h / 2;
  mesh.castShadow = true;
  return mesh;
}

/** Bulging grain/hemp sack, ~1 m, with a tied mouth knot. */
function sackMesh(r: number, m: THREE.Material): THREE.Group {
  const g = new THREE.Group();
  const s = new THREE.Mesh(new THREE.SphereGeometry(r, 8, 6), m);
  s.scale.set(1, 0.92, 1);
  s.position.y = r * 0.92;
  s.castShadow = true;
  g.add(s);
  const knot = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.14, 5), ROPE);
  knot.position.y = r * 1.7;
  g.add(knot);
  return g;
}

/** Wooden cargo crate: body + darker lid + two cross-brace bars. */
function crate(w: number, h: number, d: number, body: THREE.Material, trim: THREE.Material): THREE.Group {
  const g = new THREE.Group();
  const box = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), body);
  box.position.y = h / 2;
  box.castShadow = true;
  g.add(box);
  const lid = new THREE.Mesh(new THREE.BoxGeometry(w, h * 0.14, d), trim);
  lid.position.y = h + h * 0.07;
  lid.castShadow = true;
  g.add(lid);
  for (const s of [-1, 1]) {
    const brace = new THREE.Mesh(new THREE.BoxGeometry(0.09, h * 0.88, d + 0.05), trim);
    brace.position.set(s * (w / 2), h / 2, 0);
    g.add(brace);
  }
  return g;
}

/** Hanging red paper lantern with warm emissive glow + hanging line. */
function lantern(pal: SetPalette, h = 1.4): THREE.Group {
  const g = new THREE.Group();
  const line = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, h, 4), ROPE);
  line.position.y = h / 2;
  g.add(line);
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.36, 0.3), GLOW);
  body.position.y = h + 0.18;
  body.castShadow = true;
  g.add(body);
  const cap = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.06, 0.34), pal.woodTrim);
  cap.position.y = h + 0.38;
  g.add(cap);
  return g;
}

/** Push handcart: bed + two side wheels + two rear handles. */
function handcart(pal: SetPalette): THREE.Group {
  const g = new THREE.Group();
  const bed = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.5, 0.9), pal.timber);
  bed.position.y = 0.55;
  bed.castShadow = true;
  g.add(bed);
  for (const s of [-1, 1]) {
    const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.1, 10), pal.woodTrim);
    wheel.rotation.z = Math.PI / 2;
    wheel.position.set(s * 0.78, 0.34, 0);
    g.add(wheel);
    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 1.3, 6), pal.timber);
    handle.rotation.x = Math.PI / 2;
    handle.position.set(s * 0.28, 1.12, -0.8);
    g.add(handle);
  }
  return g;
}

/** Ceramic jar: wide belly + narrower neck. */
function jar(m: THREE.Material, r = 0.3, h = 0.7): THREE.Group {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 1.12, h, 10), m);
  body.position.y = h / 2;
  body.castShadow = true;
  g.add(body);
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.42, r * 0.5, h * 0.24, 10), m);
  neck.position.y = h + h * 0.12;
  g.add(neck);
  return g;
}

function bench(pal: SetPalette, w = 2): THREE.Group {
  const g = new THREE.Group();
  const seat = new THREE.Mesh(new THREE.BoxGeometry(w, 0.08, 0.4), pal.timber);
  seat.position.y = 0.44;
  seat.castShadow = true;
  g.add(seat);
  for (const s of [-1, 1]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.44, 0.4), pal.timber);
    leg.position.set(s * (w / 2 - 0.15), 0.22, 0);
    g.add(leg);
  }
  return g;
}

function table(pal: SetPalette, w = 1.8, d = 0.8, h = 0.75): THREE.Group {
  const g = new THREE.Group();
  const top = new THREE.Mesh(new THREE.BoxGeometry(w, 0.08, d), pal.timber);
  top.position.y = h;
  top.castShadow = true;
  g.add(top);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.08, h, 0.08), pal.timber);
    leg.position.set(sx * (w / 2 - 0.1), h / 2, sz * (d / 2 - 0.1));
    g.add(leg);
  }
  return g;
}

/** Hanging sign board on two posts (board + posts). */
function sign(pal: SetPalette, w: number, textH = 0.5, totalH = 2.2): THREE.Group {
  const g = new THREE.Group();
  const board = new THREE.Mesh(new THREE.BoxGeometry(w, textH, 0.06), pal.woodTrim);
  board.position.y = totalH - 0.42;
  board.castShadow = true;
  g.add(board);
  for (const s of [-1, 1]) {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.08, totalH, 0.08), pal.timber);
    post.position.set(s * (w / 2 - 0.12), totalH / 2, 0);
    g.add(post);
  }
  return g;
}

/** Small elm: trunk + cone crown. */
function tree(pal: SetPalette, h: number, r: number): THREE.Group {
  const g = new THREE.Group();
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.24, h * 0.6, 6), pal.timber);
  trunk.position.y = h * 0.3;
  trunk.castShadow = true;
  g.add(trunk);
  const crown = new THREE.Mesh(new THREE.ConeGeometry(r, h * 0.8, 7), pal.foliage);
  crown.position.y = h * 0.7;
  crown.castShadow = true;
  g.add(crown);
  // upper tier breaks the single-cone read (VLM: 'trees are simple cones')
  const top = new THREE.Mesh(new THREE.ConeGeometry(r * 0.5, h * 0.45, 7), pal.foliage);
  top.position.set(r * 0.3, h * 0.95, r * 0.15);
  top.castShadow = true;
  g.add(top);
  return g;
}

/** Canvas awning on two posts. */
function awning(pal: SetPalette, w = 4, d = 2.6): THREE.Group {
  const g = new THREE.Group();
  const cloth = new THREE.Mesh(new THREE.BoxGeometry(w, 0.06, d), pal.canvas);
  cloth.position.y = 2.5;
  cloth.rotation.x = 0.1;
  cloth.castShadow = true;
  g.add(cloth);
  for (const s of [-1, 1]) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 2.5, 6), pal.timber);
    post.position.set(s * (w / 2 - 0.3), 1.25, 0);
    g.add(post);
  }
  return g;
}

/** Long low river dinghy with a pointed bow (two angled bow planks). */
function dinghy(pal: SetPalette, len = 4.4): THREE.Group {
  const g = new THREE.Group();
  const hull = new THREE.Mesh(new THREE.BoxGeometry(len, 0.5, 1.2), pal.timber);
  hull.position.y = 0.4;
  hull.castShadow = true;
  g.add(hull);
  for (const s of [-1, 1]) {
    const bow = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.45, 0.1), pal.timber);
    bow.rotation.y = s * 0.9;
    bow.position.set(s * 0.45, 0.55, len / 2 + 0.5);
    g.add(bow);
  }
  const seat = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.34, 1.1), pal.timber);
  seat.position.set(0, 0.55, -len / 4);
  g.add(seat);
  return g;
}

/** Hanging herb bundle: three thin green stalks under a rod. */
function herbBundle(pal: SetPalette): THREE.Group {
  const g = new THREE.Group();
  const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.4, 5), pal.timber);
  rod.rotation.z = Math.PI / 2;
  rod.position.y = 1.55;
  g.add(rod);
  for (const s of [-1, 0, 1]) {
    const stalk = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.04, 0.85, 5), pal.foliage);
    stalk.position.set(s * 0.4, 1.1, s * 0.05);
    g.add(stalk);
  }
  return g;
}

export const PROP_BUILDERS: Record<string, DressingBuilder> = {
  // rooms
  'prop.kang': (pal) => boxProp(3, 0.9, 2, pal.packedEarth),
  'prop.low_table': (pal) => boxProp(1.2, 0.45, 1.2, pal.timber),
  'prop.ancestor_tablet': (pal) => smallGroup(
    boxProp(0.9, 0.6, 0.2, pal.timber),
    boxProp(0.1, 0.4, 0.1, pal.woodTrim).translateX(0.15),
  ),
  'prop.oil_lamp': (pal) => boxProp(0.2, 0.35, 0.2, pal.woodTrim),
  'prop.loom': (pal) => smallGroup(
    boxProp(1.6, 1.2, 0.1, pal.timber).translateY(0.35),
    boxProp(0.1, 1.2, 0.8, pal.timber).translateX(-0.7),
  ),
  'prop.cloth_bolts': (pal) => smallGroup(
    boxProp(0.6, 0.5, 0.4, pal.hemp),
    boxProp(0.4, 0.4, 0.35, pal.hemp).translateX(0.35),
  ),
  'prop.tenant.kang': (pal) => boxProp(2.4, 0.9, 1.8, pal.packedEarth),
  'prop.tenant.tools': (pal) => smallGroup(
    boxProp(1.4, 1.6, 0.1, pal.timber),
    boxProp(0.06, 1.2, 0.06, pal.woodTrim).translateX(-0.5).translateY(0.2),
    boxProp(0.06, 1.1, 0.06, pal.woodTrim).translateX(0.4).translateY(0.2),
  ),
  'prop.hu.license': (pal) => smallGroup(
    boxProp(0.5, 0.5, 0.04, pal.plaster),
    boxProp(0.12, 0.3, 0.12, pal.woodTrim).translateX(0.3),
  ),
  'prop.hu.scales': (pal) => smallGroup(
    boxProp(0.4, 0.5, 0.3, pal.woodTrim),
    boxProp(0.05, 0.5, 0.05, pal.woodTrim).translateY(0.4),
  ),
  'prop.lin.bench': (pal) => boxProp(2.4, 0.9, 0.9, pal.timber),
  'prop.lin.boat_rib': (pal) => boxProp(3, 0.9, 0.4, pal.timber),
  'prop.xu.coat': (pal) => boxProp(0.4, 0.6, 0.1, pal.hemp),
  'prop.school.dais': (pal) => boxProp(2, 0.8, 1.2, pal.timber),
  'prop.school.desk_row': (pal) => boxProp(3, 0.7, 1.2, pal.woodTrim),
  'prop.shrine.stele': (pal) => boxProp(0.8, 1.8, 0.4, pal.stone),
  'prop.shrine.incense': (pal) => boxProp(0.4, 0.3, 0.4, pal.woodTrim),
  'prop.well.ring': (pal) => {
    const ring = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.9, 1.0, 10), pal.cobble);
    ring.position.y = 0.5;
    return ring;
  },
  'prop.well.cap': (pal) => smallGroup(
    boxProp(2, 1.8, 0.2, pal.timber),
    boxProp(0.1, 0.9, 0.1, pal.woodTrim).translateX(-0.8).translateY(0.4),
  ),
  'prop.market.canopy': (pal) => {
    const canopy = new THREE.Mesh(new THREE.BoxGeometry(18, 0.12, 5), pal.canvas);
    canopy.position.y = 2.8;
    canopy.castShadow = true;
    const poles = new THREE.Group();
    poles.add(canopy);
    for (let i = 0; i < 4; i++) {
      const p = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 2.8, 6), pal.timber);
      p.position.set(-8 + i * 5.4, 1.4, -2);
      poles.add(p);
    }
    return poles;
  },
  'prop.gate.pillar_l': (pal) => boxProp(0.6, 5, 0.6, pal.stone),
  'prop.gate.pillar_r': (pal) => boxProp(0.6, 5, 0.6, pal.stone),
  'prop.creek.log_bridge': (pal) => {
    const bridge = boxProp(20, 1, 1.2, pal.timber);
    bridge.rotation.z = 0.02;
    return bridge;
  },
  'prop.cache.formation': (pal) => {
    const ring = new THREE.Mesh(new THREE.RingGeometry(1.2, 2.6, 24), pal.spiritGlow);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.03;
    return ring;
  },
  'prop.cache.shelves': (pal) => boxProp(2, 1.8, 0.4, pal.stone),
  'prop.cache.entrance': (pal) => boxProp(1.2, 1.8, 0.5, pal.stone),
  'prop.senior.gate': (pal) => boxProp(2.4, 2.6, 0.4, pal.timber),
  'prop.senior.storeroom': (pal) => boxProp(4, 3, 5, pal.rammedEarth),
  'prop.senior.courtyard': (pal) => boxProp(8, 0.1, 10, pal.packedEarth),
  'prop.tenant.field_path': (pal) => boxProp(4, 0.05, 80, pal.packedEarth),
  'prop.hu.warehouse': (pal) => boxProp(6, 4, 8, pal.rammedEarth),
  'prop.lin.shaving_pile': (pal) => boxProp(2, 0.8, 2, pal.timber),
  'prop.xu.garden': (pal) => boxProp(5, 0.1, 6, pal.packedEarth),
  'prop.school.bell': (pal) => boxProp(0.3, 0.4, 0.3, pal.woodTrim),
  // ---- room furniture (the 'every nook accounted for' pass) --------------
  'prop.bench': (pal) => bench(pal, 1.2),
  'prop.rice_jar': (pal) => jar(pal.rammedEarth, 0.3, 0.55),
  'prop.quilt_stack': (pal) => smallGroup(
    boxProp(0.9, 0.25, 0.7, pal.hemp),
    boxProp(0.85, 0.2, 0.65, pal.hemp).translateY(0.24),
    boxProp(0.8, 0.18, 0.6, pal.plaster).translateY(0.44),
  ),
  'prop.ink_stone': (pal) => smallGroup(
    boxProp(0.25, 0.06, 0.18, pal.stone),
    cylProp(0.02, 0.02, 0.12, pal.woodTrim, 5).translateX(0.16),
  ),
  'prop.books': (pal) => smallGroup(
    boxProp(0.3, 0.08, 0.22, pal.plaster).translateX(-0.12),
    boxProp(0.28, 0.07, 0.2, pal.woodTrim).translateX(0.08),
    boxProp(0.3, 0.09, 0.21, pal.hemp).translateX(0.26),
  ),
  'prop.sealed_jar': (pal) => {
    const g = jar(pal.rammedEarth, 0.28, 0.6);
    const seal = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.2, 0.08, 8), pal.plaster);
    seal.position.y = 0.66;
    g.add(seal);
    return g;
  },
  'prop.yarn_roll': (pal) => new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 6), pal.hemp),
  'prop.abacus': (pal) => smallGroup(
    boxProp(0.5, 0.06, 0.2, pal.woodTrim),
    boxProp(0.02, 0.12, 0.02, pal.woodTrim).translateX(-0.15).translateY(0.03),
    boxProp(0.02, 0.12, 0.02, pal.woodTrim).translateX(0.15).translateY(0.03),
  ),
  'prop.road.main': (pal) => boxProp(12, 0.06, 320, pal.packedEarth),
  'prop.road.well_path': (pal) => boxProp(6, 0.05, 60, pal.packedEarth),
  'prop.fields.bunds': (pal) => boxProp(0.6, 0.4, 300, pal.stone),
  'prop.foothills.peak': (pal) => {
    const peak = new THREE.Mesh(new THREE.ConeGeometry(400, 800, 7), pal.stone);
    peak.position.y = 400;
    return peak;
  },

  // ===========================================================================
  // Qinghe Market Town (Episode 2) — the lived-in trade town.
  // Every builder deterministic; stone/cobble props carry a moss grime line.
  // ===========================================================================

  // ---- dock ----------------------------------------------------------------
  'prop.qinghe.mooring': (pal) => {
    const g = new THREE.Group();
    for (let i = 0; i < 8; i++) {
      const post = cylProp(0.09, 0.12, 1.2, pal.timber, 6);
      post.position.set(-6.3 + i * 1.8, 0, 0);
      g.add(post);
    }
    for (const s of [-1, 1]) {
      const board = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.5, 0.04), pal.woodTrim);
      board.position.set(s * 6.3, 1.3, 0.25);
      g.add(board);
    }
    return g;
  },
  'prop.qinghe.cargo_barrow': (pal) => handcart(pal),
  'prop.qinghe.dinghy': (pal) => dinghy(pal),
  'prop.qinghe.cargo_crates': (pal) => smallGroup(
    crate(1.1, 0.8, 1.1, pal.timber, pal.woodTrim),
    crate(0.9, 0.65, 0.9, pal.timber, pal.woodTrim).translateZ(1.25),
    crate(0.7, 0.55, 0.7, pal.timber, pal.woodTrim).translateX(1.3).translateZ(0.2),
  ),
  'prop.qinghe.rope_coils': (pal) => {
    const g = new THREE.Group();
    for (const [x, r] of [[-0.6, 0.34], [0, 0.28], [0.6, 0.24]]) {
      const coil = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 0.24, 10), ROPE);
      coil.position.set(x, 0.12, 0);
      g.add(coil);
    }
    return g;
  },
  'prop.qinghe.fishing_nets': (pal) => {
    const g = new THREE.Group();
    const net = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.05, 1.2), pal.hemp);
    net.position.set(0, 1.1, 0);
    net.rotation.x = 0.06;
    net.castShadow = true;
    g.add(net);
    const net2 = net.clone();
    net2.position.set(0.3, 0.55, 0.1);
    net2.rotation.x = -0.08;
    g.add(net2);
    return g;
  },
  'prop.qinghe.driftwood': (pal) => {
    const g = new THREE.Group();
    for (const [x, rz, len] of [[-0.6, 0.15, 1.6], [0.5, -0.12, 1.2], [0, 0, 0.9]]) {
      const log = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.16, len, 7), pal.timber);
      log.rotation.z = rz;
      log.position.set(x, 0.16, 0);
      g.add(log);
    }
    return g;
  },
  'prop.qinghe.bollards': (pal) => {
    const g = new THREE.Group();
    for (const x of [-1.5, -0.5, 0.5, 1.5]) {
      g.add(cylProp(0.16, 0.2, 0.9, pal.timber, 8).translateX(x));
      const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.16, 0.1, 8), IRON);
      cap.position.set(x, 1.0, 0);
      g.add(cap);
    }
    g.add(grimeStrip(3.6, 0.9));
    return g;
  },
  'prop.qinghe.river_reeds': (pal) => {
    const g = new THREE.Group();
    for (const [x, h] of [[-0.8, 1.3], [-0.35, 1.0], [0.05, 1.2], [0.45, 0.9], [0.85, 1.1]]) {
      const reed = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.035, h, 5), pal.foliage);
      reed.position.set(x, h / 2, 0);
      g.add(reed);
    }
    return g;
  },

  // ---- salt depot ----------------------------------------------------------
  'prop.qinghe.salt_racks': (pal) => {
    const g = new THREE.Group();
    for (const rx of [-4, -1.3]) {
      const rack = new THREE.Group();
      for (const s of [-1, 1]) rack.add(cylProp(0.07, 0.09, 2.1, pal.timber, 6).translateX(s * 1.1));
      for (let s = 0; s < 3; s++) {
        const shelf = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.08, 0.8), pal.timber);
        shelf.position.y = 0.65 + s * 0.7;
        rack.add(shelf);
        for (const sx of [-0.5, 0, 0.5]) {
          const block = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.32, 0.5), SALT);
          block.position.set(sx, 0.85 + s * 0.7, 0);
          rack.add(block);
        }
      }
      rack.position.x = rx;
      g.add(rack);
    }
    return g;
  },
  'prop.qinghe.salt_block_stacks': (pal) => {
    const g = new THREE.Group();
    for (let i = 0; i < 4; i++) {
      const block = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.42, 0.9), SALT);
      block.position.set((i % 2) * 0.95, 0.21 + Math.floor(i / 2) * 0.44, 0);
      g.add(block);
    }
    for (let i = 0; i < 2; i++) {
      const block = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.42, 0.9), SALT);
      block.position.set(1.9 + (i % 2) * 0.95, 0.21, 1.1);
      g.add(block);
    }
    return g;
  },
  'prop.qinghe.depot_barrow': (pal) => handcart(pal),
  'prop.qinghe.weighing_scale': (pal) => {
    const g = new THREE.Group();
    const base = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.08, 0.5), IRON);
    base.position.y = 0.04;
    g.add(base);
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 1.3, 6), IRON);
    post.position.y = 0.7;
    g.add(post);
    const beam = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.05, 0.05), BRASS);
    beam.position.y = 1.4;
    g.add(beam);
    for (const s of [-1, 1]) {
      const pan = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.18, 0.05, 10), BRASS);
      pan.position.set(s * 0.45, 1.15, 0);
      g.add(pan);
    }
    return g;
  },
  'prop.qinghe.hemp_sacks': (pal) => smallGroup(
    sackMesh(0.5, pal.hemp),
    sackMesh(0.5, pal.hemp).translateZ(0.8),
    sackMesh(0.42, pal.hemp).translateX(0.9).translateZ(0.3),
    sackMesh(0.45, pal.hemp).translateX(-0.85).translateZ(0.4),
  ),
  'prop.qinghe.depot_rope_coil': (pal) => {
    const coil = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.45, 0.3, 12), ROPE);
    coil.position.y = 0.15;
    return coil;
  },
  'prop.qinghe.ledger_table': (pal) => {
    const g = table(pal, 1.4, 0.7, 0.75);
    const book = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.08, 0.22), pal.plaster);
    book.position.set(-0.2, 0.8, 0);
    g.add(book);
    const brush = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.24, 5), pal.woodTrim);
    brush.rotation.z = 0.4;
    brush.position.set(0.35, 0.82, 0.05);
    g.add(brush);
    return g;
  },

  // ---- granary -------------------------------------------------------------
  'prop.qinghe.granary_scale': (pal) => {
    const g = new THREE.Group();
    g.add(cylProp(0.05, 0.06, 1.0, IRON, 6));
    const beam = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.05, 0.05), IRON);
    beam.position.y = 1.05;
    g.add(beam);
    for (const s of [-1, 1]) {
      const pan = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.15, 0.05, 10), IRON);
      pan.position.set(s * 0.32, 0.85, 0);
      g.add(pan);
    }
    return g;
  },
  'prop.qinghe.grain_sack_stack': (pal) => smallGroup(
    sackMesh(0.55, pal.hemp),
    sackMesh(0.55, pal.hemp).translateZ(0.9),
    sackMesh(0.55, pal.hemp).translateX(0.95).translateZ(0.3),
    sackMesh(0.48, pal.hemp).translateY(1.0),
    sackMesh(0.48, pal.hemp).translateY(1.0).translateZ(0.8),
  ),
  'prop.qinghe.grain_chute': (pal) => {
    const g = new THREE.Group();
    const chute = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.12, 0.9), pal.timber);
    chute.position.set(0, 1.5, 0.4);
    chute.rotation.x = 0.4;
    g.add(chute);
    for (const s of [-1, 1]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.4, 0.1), pal.timber);
      leg.position.set(s * 1.0, 0.7, 0);
      g.add(leg);
    }
    return g;
  },
  'prop.qinghe.grain_bins_ext': (pal) => {
    const g = new THREE.Group();
    for (let i = 0; i < 4; i++) {
      const bin = cylProp(0.62, 0.7, 1.7, pal.timber, 10);
      bin.position.set(-2.4 + i * 1.6, 0, 0);
      g.add(bin);
    }
    return g;
  },
  'prop.qinghe.grain_baskets': (pal) => {
    const g = new THREE.Group();
    for (const [x, z] of [[-0.5, 0], [0.4, 0.2], [0, 0.9]]) {
      const b = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.28, 0.42, 8), pal.hemp);
      b.position.set(x, 0.21, z);
      g.add(b);
      const mound = new THREE.Mesh(new THREE.SphereGeometry(0.22, 6, 4), pal.thatch);
      mound.scale.set(1, 0.6, 1);
      mound.position.set(x, 0.45, z);
      g.add(mound);
    }
    return g;
  },
  'prop.qinghe.winch': (pal) => {
    const g = new THREE.Group();
    for (const s of [-1, 1]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.5, 0.12), pal.timber);
      leg.position.set(s * 0.35, 0.75, 0);
      leg.rotation.z = s * 0.15;
      g.add(leg);
    }
    const drum = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.5, 10), IRON);
    drum.rotation.z = Math.PI / 2;
    drum.position.set(0, 1.15, 0);
    g.add(drum);
    return g;
  },

  // ---- yamen ---------------------------------------------------------------
  'prop.qinghe.yamen_drum': (pal) => {
    const g = new THREE.Group();
    for (const s of [-1, 1]) g.add(cylProp(0.05, 0.06, 1.0, pal.woodTrim, 6).translateX(s * 0.35));
    const drum = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.5, 12), LEATHER);
    drum.rotation.z = Math.PI / 2;
    drum.position.set(0, 0.85, 0);
    g.add(drum);
    for (const s of [-1, 1]) {
      const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.36, 0.08, 12), pal.woodTrim);
      rim.rotation.z = Math.PI / 2;
      rim.position.set(s * 0.29, 0.85, 0);
      g.add(rim);
    }
    return g;
  },
  'prop.qinghe.guardian_dogs': (pal) => {
    const g = new THREE.Group();
    for (const s of [-1, 1]) {
      const base = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.3, 0.5), pal.cobble);
      base.position.set(s * 1.4, 0.15, 0);
      g.add(base);
      const body = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.42, 0.42), pal.stone);
      body.position.set(s * 1.4, 0.5, 0);
      g.add(body);
      const head = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.3, 0.34), pal.stone);
      head.position.set(s * 1.55, 0.85, 0.08);
      g.add(head);
    }
    g.add(grimeStrip(3.6, 1.0));
    return g;
  },
  'prop.qinghe.yamen_signboard': (pal) => sign(pal, 2.6, 0.7, 2.8),
  'prop.qinghe.yamen_brazier': (pal) => {
    const g = new THREE.Group();
    const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.3, 0.3, 10), IRON);
    bowl.position.y = 0.75;
    g.add(bowl);
    for (const s of [-1, 1]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.6, 0.06), IRON);
      leg.position.set(s * 0.22, 0.3, 0.1);
      g.add(leg);
    }
    const ember = new THREE.Mesh(new THREE.CircleGeometry(0.3, 10), GLOW);
    ember.rotation.x = -Math.PI / 2;
    ember.position.y = 0.91;
    g.add(ember);
    return g;
  },
  'prop.qinghe.notice_board': (pal) => {
    const g = sign(pal, 1.7, 0.9, 2.0);
    const paper = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.7), pal.plaster);
    paper.position.set(0, 1.62, 0.05);
    g.add(paper);
    return g;
  },
  'prop.qinghe.stone_steps': (pal) => {
    const g = new THREE.Group();
    for (let i = 0; i < 3; i++) {
      const step = new THREE.Mesh(new THREE.BoxGeometry(2.6 - i * 0.2, 0.18, 1.3 - i * 0.2), pal.cobble);
      step.position.set(0, 0.09 + i * 0.18, i * 0.3);
      g.add(step);
    }
    g.add(grimeStrip(2.9, 1.5));
    return g;
  },

  // ---- inn -----------------------------------------------------------------
  'prop.qinghe.inn_sign': (pal) => sign(pal, 1.7, 0.55, 2.4),
  'prop.qinghe.inn_benches': (pal) => smallGroup(bench(pal, 2.2), bench(pal, 2.2).translateZ(1.6)),
  'prop.qinghe.inn_tables': (pal) => smallGroup(table(pal, 1.9, 0.9), table(pal, 1.9, 0.9).translateZ(1.8)),
  'prop.qinghe.inn_lanterns': (pal) => smallGroup(
    lantern(pal, 1.6).translateX(-0.7),
    lantern(pal, 1.8),
    lantern(pal, 1.6).translateX(0.7),
  ),
  'prop.qinghe.water_barrel': (pal) => {
    const g = new THREE.Group();
    const barrel = cylProp(0.5, 0.55, 1.2, pal.timber, 12);
    g.add(barrel);
    const hoop = new THREE.Mesh(new THREE.CylinderGeometry(0.52, 0.52, 0.06, 12), IRON);
    hoop.position.y = 0.35;
    g.add(hoop);
    const hoop2 = hoop.clone();
    hoop2.position.y = 0.95;
    g.add(hoop2);
    return g;
  },
  'prop.qinghe.firewood_stack': (pal) => {
    const g = new THREE.Group();
    for (const [x, y, z, rot] of [[0, 0.1, 0, 0], [0.4, 0.1, 0.05, 0.5], [-0.35, 0.1, 0.03, -0.4], [0.05, 0.32, 0, 0.2]]) {
      const log = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.85, 7), pal.timber);
      log.rotation.z = Math.PI / 2;
      log.rotation.y = rot;
      log.position.set(x, y, z);
      g.add(log);
    }
    return g;
  },
  'prop.qinghe.horse_trough': (pal) => {
    const g = new THREE.Group();
    const trough = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.5, 0.8), pal.cobble);
    trough.position.y = 0.25;
    g.add(trough);
    const water = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.06, 0.55), pal.water);
    water.position.y = 0.5;
    g.add(water);
    g.add(grimeStrip(2.6, 1.0));
    return g;
  },
  'prop.qinghe.clothes_line': (pal) => {
    const g = new THREE.Group();
    for (const s of [-1, 1]) g.add(cylProp(0.05, 0.06, 2.0, pal.timber, 6).translateX(s * 1.3));
    const line = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 2.6, 4), ROPE);
    line.rotation.z = Math.PI / 2;
    line.position.set(0, 1.8, 0);
    g.add(line);
    for (const [x, c] of [[-0.7, pal.hemp], [0, pal.plaster], [0.6, pal.hemp]] as Array<[number, THREE.Material]>) {
      const cloth = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.65, 0.03), c);
      cloth.position.set(x, 1.35, 0);
      cloth.rotation.x = 0.05;
      g.add(cloth);
    }
    return g;
  },

  // ---- tea house -----------------------------------------------------------
  'prop.qinghe.tea_pots': (pal) => {
    const g = new THREE.Group();
    for (const s of [-1, 1]) g.add(cylProp(0.05, 0.06, 1.7, pal.timber, 6).translateX(s * 0.9));
    for (let s = 0; s < 3; s++) {
      const shelf = new THREE.Mesh(new THREE.BoxGeometry(1.85, 0.06, 0.35), pal.timber);
      shelf.position.y = 0.55 + s * 0.55;
      g.add(shelf);
      for (const px of [-0.45, 0, 0.45]) {
        const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.13, 0.3, 8), pal.rammedEarth);
        pot.position.set(px, 0.75 + s * 0.55, 0);
        g.add(pot);
      }
    }
    return g;
  },
  'prop.qinghe.tea_jars': (pal) => smallGroup(
    jar(pal.rammedEarth, 0.34, 0.72),
    jar(pal.rammedEarth, 0.28, 0.6).translateX(0.7),
    jar(pal.rammedEarth, 0.24, 0.52).translateX(1.15),
  ),
  'prop.qinghe.tea_cups': (pal) => {
    const g = new THREE.Group();
    const tray = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.36, 0.05, 12), pal.woodTrim);
    tray.position.y = 0.025;
    g.add(tray);
    for (const [x, z] of [[-0.1, 0], [0.12, 0.05], [0.02, 0.15]]) {
      const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.07, 0.09, 8), pal.plaster);
      cup.position.set(x, 0.12, z);
      g.add(cup);
    }
    return g;
  },
  'prop.qinghe.tea_kettle_stove': (pal) => {
    const g = new THREE.Group();
    const stove = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.6, 0.6), pal.cobble);
    stove.position.y = 0.3;
    g.add(stove);
    const kettle = new THREE.Mesh(new THREE.SphereGeometry(0.24, 8, 6), IRON);
    kettle.scale.set(1, 0.85, 1);
    kettle.position.y = 0.95;
    g.add(kettle);
    const spout = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.04, 0.25, 5), IRON);
    spout.rotation.z = 0.8;
    spout.position.set(0.2, 0.95, 0);
    g.add(spout);
    return g;
  },
  'prop.qinghe.tea_benches': (pal) => smallGroup(bench(pal, 1.9), bench(pal, 1.9).translateZ(1.5)),
  'prop.qinghe.tea_sign': (pal) => sign(pal, 1.4, 0.5, 2.2),
  'prop.qinghe.tea_lanterns': (pal) => smallGroup(
    lantern(pal, 1.3).translateX(-0.5),
    lantern(pal, 1.5),
    lantern(pal, 1.3).translateX(0.5),
  ),
  'prop.qinghe.tea_drying_trays': (pal) => {
    const g = new THREE.Group();
    for (const [x, z] of [[0, 0], [1.4, 0.2]]) {
      const tray = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.06, 0.8), pal.thatch);
      tray.position.set(x, 0.5, z);
      tray.rotation.y = 0.15;
      g.add(tray);
      const leaves = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.05, 0.6), pal.foliage);
      leaves.position.set(x, 0.54, z);
      leaves.rotation.y = 0.15;
      g.add(leaves);
    }
    return g;
  },

  // ---- medicine shop -------------------------------------------------------
  'prop.qinghe.medicine_sign': (pal) => sign(pal, 1.4, 0.55, 2.1),
  'prop.qinghe.herb_bundles': (pal) => herbBundle(pal),
  'prop.qinghe.herb_mortars': (pal) => {
    const g = new THREE.Group();
    for (const [x, s] of [[-0.45, 1], [0.05, 0.85], [0.5, 0.7]]) {
      const mortar = new THREE.Mesh(new THREE.CylinderGeometry(0.26 * s, 0.18 * s, 0.3 * s, 10), pal.stone);
      mortar.position.set(x, 0.15 * s, 0);
      g.add(mortar);
      const pestle = new THREE.Mesh(new THREE.CylinderGeometry(0.04 * s, 0.05 * s, 0.35 * s, 5), pal.woodTrim);
      pestle.position.set(x + 0.1 * s, 0.42 * s, 0);
      pestle.rotation.x = 0.3;
      g.add(pestle);
    }
    return g;
  },
  'prop.qinghe.herb_jars': (pal) => smallGroup(
    jar(pal.rammedEarth, 0.3, 0.65),
    jar(pal.rammedEarth, 0.26, 0.56).translateX(0.65),
    jar(pal.rammedEarth, 0.22, 0.48).translateX(1.1),
  ),
  'prop.qinghe.pestle_bench': (pal) => {
    const g = bench(pal, 1.7);
    const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.14, 0.18, 10), pal.stone);
    bowl.position.set(-0.3, 0.55, 0);
    g.add(bowl);
    const pile = new THREE.Mesh(new THREE.SphereGeometry(0.14, 6, 4), pal.foliage);
    pile.scale.set(1, 0.6, 1);
    pile.position.set(0.3, 0.5, 0);
    g.add(pile);
    return g;
  },
  'prop.qinghe.herb_baskets': (pal) => {
    const g = new THREE.Group();
    for (const [x, z] of [[-0.6, 0], [0.2, 0.2], [0.5, 1.0]]) {
      const basket = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.26, 0.4, 8), pal.hemp);
      basket.position.set(x, 0.2, z);
      g.add(basket);
      const herbs = new THREE.Mesh(new THREE.SphereGeometry(0.2, 6, 4), pal.foliage);
      herbs.scale.set(1, 0.7, 1);
      herbs.position.set(x, 0.42, z);
      g.add(herbs);
    }
    return g;
  },
  'prop.qinghe.medicine_bench': (pal) => bench(pal, 1.8),

  // ---- market square -------------------------------------------------------
  'prop.qinghe.stone_stalls': (pal) => {
    const g = new THREE.Group();
    for (const x of [-10, 0, 10]) {
      const base = new THREE.Mesh(new THREE.BoxGeometry(8.6, 0.9, 1.4), pal.cobble);
      base.position.set(x, 0.45, 0);
      base.castShadow = true;
      g.add(base);
      const top = new THREE.Mesh(new THREE.BoxGeometry(8.8, 0.12, 1.5), pal.stone);
      top.position.set(x, 0.96, 0);
      g.add(top);
    }
    g.add(grimeStrip(28, 1.7));
    return g;
  },
  'prop.qinghe.recruitment_stall': (pal) => {
    const g = awning(pal, 4.2, 3.0);
    g.position.y = 0;
    const table = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.1, 0.9), pal.timber);
    table.position.set(0, 0.85, 0.4);
    g.add(table);
    for (const s of [-1, 1]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.85, 0.1), pal.timber);
      leg.position.set(s * 1.1, 0.425, 0.4);
      g.add(leg);
    }
    // the recruitment banner: a tall red pole banner with a gold-trimmed
    // pendant — the episode's most iconic object (children stare at it)
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 3.4, 6), pal.timber);
    pole.position.set(1.5, 1.7, 0.2);
    g.add(pole);
    const banner = new THREE.Mesh(new THREE.BoxGeometry(1.0, 1.6, 0.06), RED_CLOTH);
    banner.position.set(1.95, 2.1, 0.2);
    g.add(banner);
    const goldTrim = new THREE.Mesh(new THREE.BoxGeometry(1.04, 0.1, 0.07), BRASS);
    goldTrim.position.set(1.95, 2.9, 0.2);
    g.add(goldTrim);
    // spirit-stone lamp on the table (canonical recruiter tool: reads roots
    // by lamp-light at the stall — warm emissive so it draws the eye)
    const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.28, 0.22), pal.spiritGlow);
    lamp.position.set(0.6, 1.05, 0.4);
    g.add(lamp);
    const ledger = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.06, 0.35), pal.plaster);
    ledger.position.set(0, 0.93, 0.4);
    g.add(ledger);
    const ink = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.14, 6), pal.woodTrim);
    ink.position.set(0.35, 1.0, 0.5);
    g.add(ink);
    // queue rail: children line up along a low timber rail before the stall
    for (const s of [-1, 1]) {
      const railPost = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.0, 0.12), pal.timber);
      railPost.position.set(s * 1.8, 0.5, -1.2);
      g.add(railPost);
    }
    const rail = new THREE.Mesh(new THREE.BoxGeometry(3.8, 0.08, 0.08), pal.timber);
    rail.position.set(0, 1.0, -1.2);
    g.add(rail);
    return g;
  },
  'prop.qinghe.stall_stock': (pal) => smallGroup(
    crate(1.0, 0.75, 1.0, pal.timber, pal.woodTrim),
    crate(0.8, 0.6, 0.8, pal.timber, pal.woodTrim).translateX(1.15).translateZ(0.2),
    crate(0.9, 0.68, 0.9, pal.timber, pal.woodTrim).translateX(0.5).translateZ(1.2),
    crate(0.6, 0.5, 0.6, pal.timber, pal.woodTrim).translateX(1.3).translateZ(1.1),
  ),
  'prop.qinghe.cloth_bolts_rack': (pal) => {
    const g = new THREE.Group();
    const rack = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.12, 0.7), pal.timber);
    rack.position.y = 0.4;
    g.add(rack);
    const bolt = (x: number, c: THREE.Material, h: number) => {
      const b = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, h, 10), c);
      b.position.set(x, 0.55 + h / 2, 0);
      g.add(b);
    };
    bolt(-0.55, pal.hemp, 1.1);
    bolt(0, pal.plaster, 0.95);
    bolt(0.55, pal.hemp, 1.05);
    return g;
  },
  'prop.qinghe.ceramic_jars': (pal) => smallGroup(
    jar(pal.rammedEarth, 0.32, 0.7),
    jar(pal.rammedEarth, 0.28, 0.6).translateX(0.72),
    jar(pal.rammedEarth, 0.3, 0.65).translateZ(0.9),
  ),
  'prop.qinghe.grain_sacks_row': (pal) => smallGroup(
    sackMesh(0.5, pal.hemp),
    sackMesh(0.5, pal.hemp).translateX(1.05),
    sackMesh(0.48, pal.hemp).translateX(2.0),
    sackMesh(0.5, pal.hemp).translateZ(1.0),
  ),
  'prop.qinghe.handcart': (pal) => handcart(pal),
  'prop.qinghe.market_scales': (pal) => {
    const g = new THREE.Group();
    g.add(cylProp(0.05, 0.06, 1.2, BRASS, 6));
    const beam = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.05, 0.05), BRASS);
    beam.position.y = 1.25;
    g.add(beam);
    for (const s of [-1, 1]) {
      const pan = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.16, 0.05, 10), BRASS);
      pan.position.set(s * 0.4, 1.0, 0);
      g.add(pan);
    }
    return g;
  },
  'prop.qinghe.veg_baskets': (pal) => {
    const g = new THREE.Group();
    for (const [x, z] of [[-0.7, 0], [0.2, 0.15], [0.6, 1.05]]) {
      const basket = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.3, 0.45, 8), pal.hemp);
      basket.position.set(x, 0.22, z);
      g.add(basket);
      for (const [vx, vz] of [[-0.08, 0], [0.08, 0.05]]) {
        const veg = new THREE.Mesh(new THREE.SphereGeometry(0.13, 6, 4), pal.foliage);
        veg.position.set(x + vx, 0.5, z + vz);
        g.add(veg);
      }
    }
    return g;
  },
  'prop.qinghe.market_awning': (pal) => awning(pal, 4.5, 3.0),
  'prop.qinghe.water_trough': (pal) => {
    const g = new THREE.Group();
    const trough = new THREE.Mesh(new THREE.BoxGeometry(3.0, 0.5, 0.8), pal.cobble);
    trough.position.y = 0.25;
    g.add(trough);
    const water = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.06, 0.55), pal.water);
    water.position.y = 0.5;
    g.add(water);
    g.add(grimeStrip(3.2, 1.0));
    return g;
  },
  'prop.qinghe.salt_blocks_row': (pal) => {
    const g = new THREE.Group();
    for (let i = 0; i < 3; i++) {
      const block = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.45, 0.9), SALT);
      block.position.set(i * 1.0, 0.22, 0);
      g.add(block);
    }
    for (let i = 0; i < 2; i++) {
      const block = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.45, 0.9), SALT);
      block.position.set(0.5 + i * 1.0, 0.68, 0.2);
      g.add(block);
    }
    return g;
  },
  'prop.qinghe.town_trees': (pal) => smallGroup(
    tree(pal, 4.2, 1.7).translateX(-2.2),
    tree(pal, 5.0, 2.0).translateX(0.3),
    tree(pal, 3.8, 1.5).translateX(2.6).translateZ(0.5),
  ),

  // ---- qinghe room fixtures (interiors) -----------------------------------
  'prop.qinghe.ledger_wall': (pal) => {
    const g = new THREE.Group();
    const wall = new THREE.Mesh(new THREE.BoxGeometry(4, 2.4, 0.12), pal.timber);
    wall.position.y = 1.2;
    g.add(wall);
    for (let i = 0; i < 4; i++) {
      const shelf = new THREE.Mesh(new THREE.BoxGeometry(3.8, 0.04, 0.14), pal.woodTrim);
      shelf.position.set(0, 0.5 + i * 0.5, 0.06);
      g.add(shelf);
    }
    return g;
  },
  'prop.qinghe.big_scales': (pal) => {
    const g = new THREE.Group();
    g.add(cylProp(0.06, 0.08, 1.1, BRASS, 6));
    const beam = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.06, 0.06), BRASS);
    beam.position.y = 1.15;
    g.add(beam);
    for (const s of [-1, 1]) {
      const pan = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.2, 0.06, 10), BRASS);
      pan.position.set(s * 0.5, 0.9, 0);
      g.add(pan);
    }
    return g;
  },
  'prop.qinghe.bin_row': (pal) => {
    const g = new THREE.Group();
    for (let i = 0; i < 6; i++) {
      const bin = cylProp(0.9, 1.0, 3.4, pal.timber, 10);
      bin.position.set(-5 + i * 2, 0, 0);
      g.add(bin);
    }
    return g;
  },
  'prop.qinghe.seal_table': (pal) => {
    const g = table(pal, 2.4, 1.2, 1.0);
    const seal = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, 0.3), pal.plaster);
    seal.position.set(0, 1.08, 0);
    g.add(seal);
    return g;
  },
  'prop.qinghe.stove': (pal) => {
    const g = new THREE.Group();
    const base = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.0, 1.0), pal.cobble);
    base.position.y = 0.5;
    g.add(base);
    const top = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.12, 0.8), IRON);
    top.position.y = 1.05;
    g.add(top);
    return g;
  },
  'prop.qinghe.bird_cage': (pal) => {
    const g = new THREE.Group();
    const cage = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 0.5, 8), pal.timber);
    cage.position.y = 0.55;
    g.add(cage);
    const bird = new THREE.Mesh(new THREE.SphereGeometry(0.06, 5, 4), pal.woodTrim);
    bird.position.set(0, 0.55, 0.08);
    g.add(bird);
    return g;
  },
  'prop.qinghe.tea_dais': (pal) => {
    const g = new THREE.Group();
    const dais = new THREE.Mesh(new THREE.BoxGeometry(2, 0.5, 1.4), pal.timber);
    dais.position.y = 0.25;
    g.add(dais);
    const stool = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.4, 0.4), pal.woodTrim);
    stool.position.set(0.6, 0.55, 0.3);
    g.add(stool);
    return g;
  },
  'prop.qinghe.herb_drawers': (pal) => {
    const g = new THREE.Group();
    const wall = new THREE.Mesh(new THREE.BoxGeometry(5, 2.6, 0.5), pal.timber);
    wall.position.y = 1.3;
    g.add(wall);
    for (let i = 0; i < 4; i++) {
      for (let j = 0; j < 3; j++) {
        const drawer = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.55, 0.05), pal.woodTrim);
        drawer.position.set(-1.7 + i * 1.15, 0.7 + j * 0.72, 0.27);
        g.add(drawer);
      }
    }
    return g;
  },
  'prop.qinghe.locked_cabinet': (pal) => {
    const g = new THREE.Group();
    // two-door wooden cabinet on feet: base, body, two door panels with
    // centre crack, iron lock, and a top cornice — reads as furniture,
    // not 'a box with a cylinder' (VLM e2.08)
    const bodyMat = pal.timber;
    const feet = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.12, 0.5), bodyMat);
    feet.position.y = 0.06;
    g.add(feet);
    const body = new THREE.Mesh(new THREE.BoxGeometry(1.0, 1.7, 0.55), bodyMat);
    body.position.y = 0.97;
    g.add(body);
    const doorL = new THREE.Mesh(new THREE.BoxGeometry(0.47, 1.5, 0.04), pal.woodTrim);
    doorL.position.set(-0.25, 0.95, 0.28);
    g.add(doorL);
    const doorR = new THREE.Mesh(new THREE.BoxGeometry(0.47, 1.5, 0.04), pal.woodTrim);
    doorR.position.set(0.25, 0.95, 0.28);
    g.add(doorR);
    const crack = new THREE.Mesh(new THREE.BoxGeometry(0.015, 1.5, 0.05), new THREE.MeshStandardMaterial({ color: 0x1a1208, roughness: 1 }));
    crack.position.set(0, 0.95, 0.3);
    g.add(crack);
    const lockPlate = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.18, 0.04), IRON);
    lockPlate.position.set(0, 0.72, 0.31);
    g.add(lockPlate);
    const cornice = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.08, 0.62), bodyMat);
    cornice.position.y = 1.86;
    g.add(cornice);
    return g;
  },
};

/** Every blueprint prop id (structure exterior + room fixtures + roads). */
export function blueprintPropIds(): string[] {
  const ids: string[] = [];
  for (const s of WANG_FAMILY_BEND.structures) {
    for (const p of s.exterior) ids.push(p.id);
    for (const r of s.rooms) for (const f of r.fixtures) ids.push(f.id);
  }
  for (const r of WANG_FAMILY_BEND.layout.roads) ids.push(r.id);
  return ids;
}

// ---------------------------------------------------------------------------
// Ambient dressing sets (per structure kind) — the nook-and-cranny layer.
// ---------------------------------------------------------------------------

export interface DressingSpec {
  /** prop ids from the registry (canon props). */
  props: string[];
  /** ambient details: [builderName, count] — deterministic local builders. */
  ambient: Array<[string, number]>;
}

const AMBIENT_BUILDERS: Record<string, (pal: SetPalette) => THREE.Object3D> = {
  firewood: (pal) => smallGroup(boxProp(0.5, 0.4, 0.5, pal.timber), boxProp(0.4, 0.35, 0.4, pal.timber).translateX(0.45)),
  water_jar: (pal) => new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.34, 0.6, 8), pal.rammedEarth),
  basket: (pal) => new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.3, 0.4, 8), pal.hemp),
  scales: (pal) => {
    const g = new THREE.Group();
    g.add(cylProp(0.03, 0.04, 0.5, BRASS, 6));
    const beam = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.03, 0.03), BRASS);
    beam.position.y = 0.55;
    g.add(beam);
    for (const s of [-1, 1]) {
      const pan = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.09, 0.03, 8), BRASS);
      pan.position.set(s * 0.2, 0.42, 0);
      g.add(pan);
    }
    return g;
  },
  chicken: (pal) => {
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.12, 6, 4), pal.plaster);
    body.scale.set(1, 0.8, 1);
    return smallGroup(body, new THREE.Mesh(new THREE.SphereGeometry(0.05, 4, 3), pal.plaster).translateX(0.12));
  },
  drying_herbs: (pal) => smallGroup(
    boxProp(1.2, 0.06, 0.06, pal.timber).translateY(1.5),
    boxProp(0.04, 0.8, 0.04, pal.hemp).translateX(-0.4).translateY(1.0),
    boxProp(0.04, 0.7, 0.04, pal.hemp).translateX(0.3).translateY(1.0),
  ),
  clothesline: (pal) => smallGroup(
    boxProp(2.4, 0.04, 0.04, pal.timber).translateY(1.7),
    boxProp(0.5, 0.6, 0.04, pal.hemp).translateX(-0.7).translateY(1.2),
    boxProp(0.4, 0.55, 0.04, pal.hemp).translateX(0.5).translateY(1.2),
  ),
  millstone: (pal) => new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.6, 0.35, 10), pal.stone),
  plow: (pal) => boxProp(1.6, 0.5, 0.25, pal.timber),
  crate: (pal) => boxProp(0.6, 0.5, 0.6, pal.timber),
  fabric_roll: (pal) => new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 1.1, 8), pal.hemp),
  incense_sticks: (pal) => smallGroup(
    boxProp(0.12, 0.02, 0.12, pal.woodTrim),
    boxProp(0.01, 0.25, 0.01, pal.plaster).translateY(0.15),
    boxProp(0.01, 0.22, 0.01, pal.plaster).translateZ(0.04).translateY(0.13),
  ),
  ribbon: (pal) => boxProp(0.05, 0.5, 0.02, pal.canvas),
  bucket: (pal) => new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.15, 0.3, 8), pal.timber),
  wash_basin: (pal) => new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.3, 0.12, 8), pal.cobble),
  rope: (pal) => new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.02, 4, 10), pal.hemp),
  crop_rows: (pal) => smallGroup(
    boxProp(0.3, 0.6, 0.1, pal.hemp).translateX(0),
    boxProp(0.3, 0.55, 0.1, pal.hemp).translateX(0.8),
    boxProp(0.3, 0.5, 0.1, pal.hemp).translateX(1.6),
  ),

  grass: (pal) => smallGroup(
    new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.5, 5), pal.foliage).translateX(-0.1),
    new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.45, 5), pal.foliage).translateX(0.12),
    new THREE.Mesh(new THREE.ConeGeometry(0.13, 0.4, 5), pal.foliage),
  ),  scarecrow: (pal) => smallGroup(
    boxProp(0.12, 1.6, 0.12, pal.timber),
    boxProp(0.1, 0.5, 0.1, pal.timber).translateY(1.6).rotateZ(0.2),
    boxProp(0.5, 0.7, 0.06, pal.hemp).translateY(1.45),
  ),
  alder: (pal) => smallGroup(
    boxProp(0.16, 2.2, 0.16, pal.timber),
    new THREE.Mesh(new THREE.SphereGeometry(1.1, 6, 4), pal.foliage).translateY(2.6),
  ),
  reeds: (pal) => smallGroup(
    boxProp(0.03, 1.2, 0.03, pal.thatch).translateX(0),
    boxProp(0.03, 1.1, 0.03, pal.thatch).translateX(0.2),
    boxProp(0.03, 1.0, 0.03, pal.thatch).translateX(0.4),
  ),
  pine: (pal) => smallGroup(
    boxProp(0.25, 3, 0.25, pal.timber),
    new THREE.Mesh(new THREE.ConeGeometry(1.4, 3, 6), pal.foliage).translateY(3.5),
    new THREE.Mesh(new THREE.ConeGeometry(1.1, 2.4, 6), pal.foliage).translateY(4.8),
  ),
  boulder: (pal) => new THREE.Mesh(new THREE.SphereGeometry(0.7, 6, 4), pal.stone),
  sealed_jar: (pal) => smallGroup(
    new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.4, 0.7, 8), pal.rammedEarth),
    boxProp(0.34, 0.06, 0.34, pal.stone).translateY(0.4),
  ),
  salt_block: (pal) => boxProp(0.5, 0.4, 0.4, pal.plaster),
  books: (pal) => smallGroup(
    boxProp(0.3, 0.1, 0.2, pal.plaster),
    boxProp(0.3, 0.12, 0.2, pal.timber).translateY(0.12),
    boxProp(0.3, 0.09, 0.2, pal.plaster).translateY(0.25),
  ),
  ink_stone: (pal) => boxProp(0.16, 0.04, 0.12, pal.stone),
  lantern: (pal) => smallGroup(
    boxProp(0.16, 0.3, 0.16, pal.canvas),
    boxProp(0.04, 0.4, 0.04, pal.timber).translateY(0.35),
  ),
  grain_sack: (pal) => {
    const sack = new THREE.Mesh(new THREE.SphereGeometry(0.4, 6, 4), pal.hemp);
    sack.scale.set(1, 0.7, 1);
    return sack;
  },
  bones_whittling: (pal) => boxProp(0.3, 0.05, 0.06, pal.plaster),
};

export const DRESSING_SETS: Record<string, DressingSpec> = {
  household: {
    props: ['prop.senior.gate', 'prop.senior.courtyard'],
    ambient: [['firewood', 2], ['water_jar', 2], ['basket', 1], ['chicken', 3], ['drying_herbs', 1], ['clothesline', 1], ['millstone', 1], ['plow', 1], ['lantern', 1], ['grass', 8]],
  },
  tenant_household: {
    props: ['prop.tenant.field_path'],
    ambient: [['firewood', 1], ['water_jar', 1], ['chicken', 2], ['plow', 1], ['grain_sack', 1]],
  },
  salt_merchant_house: {
    props: ['prop.hu.warehouse'],
    ambient: [['salt_block', 4], ['crate', 2], ['grain_sack', 2], ['lantern', 1]],
  },
  workshop: {
    props: ['prop.lin.shaving_pile'],
    ambient: [['firewood', 3], ['crate', 2], ['bucket', 2], ['bones_whittling', 2], ['millstone', 1]],
  },
  widow_house: {
    props: ['prop.xu.garden'],
    ambient: [['water_jar', 1], ['basket', 1], ['drying_herbs', 1], ['grain_sack', 1]],
  },
  school: {
    props: ['prop.school.bell'],
    ambient: [['books', 3], ['ink_stone', 3], ['lantern', 2], ['fabric_roll', 1], ['bones_whittling', 1]],
  },
  shrine: {
    props: ['prop.shrine.stele', 'prop.shrine.incense'],
    ambient: [['ribbon', 4], ['incense_sticks', 2]],
  },
  well: {
    props: ['prop.well.ring', 'prop.well.cap'],
    ambient: [['bucket', 3], ['wash_basin', 3], ['rope', 2], ['water_jar', 1]],
  },
  market: {
    props: ['prop.market.canopy'],
    ambient: [['crate', 4], ['fabric_roll', 4], ['basket', 3], ['grain_sack', 4], ['salt_block', 3], ['water_jar', 2], ['scales', 1], ['chicken', 3]],
  },
  gate: {
    props: ['prop.gate.pillar_l', 'prop.gate.pillar_r'],
    ambient: [['lantern', 3], ['boulder', 2], ['reeds', 2]],
  },
  creek: {
    props: ['prop.creek.log_bridge'],
    ambient: [['alder', 3], ['reeds', 4], ['boulder', 2]],
  },
  field: {
    props: ['prop.fields.bunds'],
    ambient: [['crop_rows', 8], ['scarecrow', 1], ['grass', 10]],
  },
  cache: {
    props: ['prop.cache.formation', 'prop.cache.shelves', 'prop.cache.entrance'],
    ambient: [['sealed_jar', 3], ['boulder', 2]],
  },
  foothill: {
    props: ['prop.foothills.peak'],
    ambient: [['pine', 6], ['boulder', 4], ['alder', 2]],
  },
  dock: {
    props: [],
    ambient: [['rope', 4], ['crate', 3], ['bucket', 2], ['reeds', 6], ['water_jar', 1]],
  },
  shop: {
    props: [],
    ambient: [['crate', 2], ['basket', 3], ['drying_herbs', 2], ['lantern', 2], ['grain_sack', 2]],
  },
  institution: {
    props: [],
    ambient: [['lantern', 3], ['incense_sticks', 1], ['boulder', 1], ['sealed_jar', 1]],
  },
};

/** Scatter a structure's dressing into its bounds (deterministic). */
export function dressStructure(s: SetStructure, pal: SetPalette, seed: number): THREE.Group {
  const g = new THREE.Group();
  const rng = new LCG(seed ^ 0xd135);
  const spec = DRESSING_SETS[s.kind];
  if (!spec) return g;
  // open plazas (market) cluster dressing around the centre where the stall
  // and crowd line is — uniform scatter over a 60x40 m square would hide
  // every ambient prop from the shots (VLM: 'no stock, no trade evidence').
  const cluster = s.kind === 'market';
  const range = (half: number) => (cluster ? half * 0.28 : half * 0.8);

  // canonical props from the registry
  for (const propId of spec.props) {
    const builder = PROP_BUILDERS[propId];
    if (!builder) continue;
    const obj = builder(pal);
    obj.userData = { id: propId, name: propId.replace('prop.', ''), kind: 'prop' };
    obj.position.set(rng.nextRange(-s.w / 2, s.w / 2) * (cluster ? 0.28 : 0.8), 0, rng.nextRange(-s.d / 2, s.d / 2) * (cluster ? 0.28 : 0.8));
    g.add(obj);
  }

  // ambient details
  for (const [name, count] of spec.ambient) {
    const builder = AMBIENT_BUILDERS[name];
    if (!builder) continue;
    for (let i = 0; i < count; i++) {
      const obj = builder(pal);
      obj.userData = { id: `${s.id}.${name}`, name, kind: 'ambient' };
      obj.position.set(rng.nextRange(-s.w / 2, s.w / 2) * (cluster ? 0.28 : 0.85), 0, rng.nextRange(-s.d / 2, s.d / 2) * (cluster ? 0.28 : 0.85));
      obj.rotation.y = rng.nextRange(0, Math.PI * 2);
      g.add(obj);
    }
  }

  return g;
}

/** Total ambient details a kind dresses with (for coverage checks). */
export function dressingDetailCount(kind: string): number {
  const spec = DRESSING_SETS[kind];
  if (!spec) return 0;
  return spec.ambient.reduce((n, [, c]) => n + c, 0) + spec.props.length;
}
