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
  'prop.road.main': (pal) => boxProp(12, 0.06, 320, pal.packedEarth),
  'prop.road.well_path': (pal) => boxProp(6, 0.05, 60, pal.packedEarth),
  'prop.fields.bunds': (pal) => boxProp(0.6, 0.4, 300, pal.stone),
  'prop.foothills.peak': (pal) => {
    const peak = new THREE.Mesh(new THREE.ConeGeometry(400, 800, 7), pal.stone);
    peak.position.y = 400;
    return peak;
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
    ambient: [['crate', 3], ['fabric_roll', 3], ['basket', 2], ['grain_sack', 2]],
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
};

/** Scatter a structure's dressing into its bounds (deterministic). */
export function dressStructure(s: SetStructure, pal: SetPalette, seed: number): THREE.Group {
  const g = new THREE.Group();
  const rng = new LCG(seed ^ 0xd135);
  const spec = DRESSING_SETS[s.kind];
  if (!spec) return g;

  // canonical props from the registry
  for (const propId of spec.props) {
    const builder = PROP_BUILDERS[propId];
    if (!builder) continue;
    const obj = builder(pal);
    obj.userData = { id: propId, name: propId.replace('prop.', ''), kind: 'prop' };
    obj.position.set(rng.nextRange(-s.w / 2, s.w / 2) * 0.8, 0, rng.nextRange(-s.d / 2, s.d / 2) * 0.8);
    g.add(obj);
  }

  // ambient details
  for (const [name, count] of spec.ambient) {
    const builder = AMBIENT_BUILDERS[name];
    if (!builder) continue;
    for (let i = 0; i < count; i++) {
      const obj = builder(pal);
      obj.userData = { id: `${s.id}.${name}`, name, kind: 'ambient' };
      obj.position.set(rng.nextRange(-s.w / 2, s.w / 2) * 0.85, 0, rng.nextRange(-s.d / 2, s.d / 2) * 0.85);
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
