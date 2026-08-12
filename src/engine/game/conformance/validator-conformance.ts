/**
 * game/conformance/validator-conformance.ts — the laws gate.
 *
 *   1. The authored world OBEYS the laws: no floating/clipping structures,
 *      water inside its channels, no unexplained basins, sane semantics.
 *   2. The validator CATCHES violations: a deliberately floated object is
 *      flagged; a buried one is flagged unless the ledger records it.
 *   3. Terrain edits are lawful: a sane raise passes; a 1000 m spike is
 *      flagged as a brush slip.
 *
 * Run: bun run game:validator-conformance
 */

import * as THREE from 'three';
import { PlanetHeightField } from '../planet/height-field';
import { EditorRegistry } from '../editor/types';
import { TerrainEditStore } from '../editor/terrain-edit';
import { WorldValidator, BurialLedger } from '../editor/world-validator';
import { exportWorld } from '../editor/world-export';
import { buildRiverWater } from '../village/stream-water';
import { buildVillagers } from '../village/villagers';
import { GAME_SEED } from '../bootstrap';

let passed = 0;
let failed = 0;
function assert(ok: boolean, msg: string): void {
  if (ok) { passed++; console.log(`  ✅ ${msg}`); }
  else { failed++; console.error(`  ❌ ${msg}`); }
}

console.log('validator-conformance — the world obeys the laws\n');

const field = new PlanetHeightField(GAME_SEED);
const THREE_NS = await import('three');
const scene = new THREE_NS.Scene();

// the planet stub: field + chunks (rebuild no-op)
const chunks = new Map<string, THREE_NS.Mesh>();
const planetStub = {
  field,
  chunks,
  rebuildChunk(_k: string, _f: (x: number, z: number) => number): void {},
} as never;

const registry = new EditorRegistry();
const water = buildRiverWater(scene);
for (const mesh of water) {
  registry.register({
    id: `water_${mesh.name.replace('water_', '')}`, type: 'water', label: mesh.name,
    root: mesh, bounds: new THREE_NS.Box3().setFromObject(mesh), params: [],
  });
}
const villagers = buildVillagers(field, scene);
for (const v of villagers) {
  registry.register({
    id: v.id, type: 'villager', label: v.name, root: v.body,
    bounds: new THREE_NS.Box3().setFromObject(v.body), params: [],
  });
}
// a house-like component standing on the ground (the authored ground)
const groundBox = new THREE_NS.Mesh(new THREE_NS.BoxGeometry(7, 0.6, 6), new THREE_NS.MeshStandardMaterial());
groundBox.position.set(200, field.evaluate(200, -140).height, -140);
scene.add(groundBox);
registry.register({
  id: 'test_grounded_house', type: 'house', label: 'Test House', root: groundBox,
  bounds: new THREE_NS.Box3().setFromObject(groundBox),
  params: [{ id: 'posX', label: 'X', kind: 'number', min: -1e6, max: 1e6, step: 0.1,
    get: () => groundBox.position.x, set: (v) => { groundBox.position.x = v as number; } }],
});

const store = new TerrainEditStore(field, planetStub);
const ledger = new BurialLedger();
const validator = new WorldValidator(registry, planetStub, store, ledger);

// ---- 1. The authored world obeys the laws ----
const report = validator.validate();
assert(!report.grounded.some((v) => v.id === 'test_grounded_house'), 'the grounded house passes');
assert(!report.grounded.some((v) => v.id.includes('villager')), 'no villager floats or clips');
assert(report.water.length === 0, 'water sits inside its channels (no flooded banks)');
assert(!report.semantic.some((s) => s.includes('brush slip')), 'no brush slips in the untouched world');

// ---- 2. The validator CATCHES violations ----
groundBox.position.y += 5; // float it
registry.refreshBounds('test_grounded_house');
const floatReport = validator.validate();
const floatHit = floatReport.grounded.find((v) => v.id === 'test_grounded_house');
assert(floatHit?.kind === 'floating', `floating structure flagged (${floatHit?.gapMeters.toFixed(1)} m)`);
groundBox.position.y -= 5; // restore
registry.refreshBounds('test_grounded_house');

groundBox.position.y -= 4; // bury it
registry.refreshBounds('test_grounded_house');
const buriedReport = validator.validate();
assert(buriedReport.grounded.some((v) => v.id === 'test_grounded_house' && v.kind === 'clipping'), 'buried structure flagged without a reason');
ledger.bury('test_grounded_house', 'sunken ruin from the Restriction War');
const exemptReport = validator.validate();
assert(!exemptReport.grounded.some((v) => v.id === 'test_grounded_house'), 'the burial ledger exempts the sunken ruin');
groundBox.position.y += 4;
registry.refreshBounds('test_grounded_house');

// ---- 3. Terrain edits are lawful ----
store.stroke(210, -140, 8, 2, 'raise');
const saneReport = validator.validate();
assert(!saneReport.semantic.some((s) => s.includes('brush slip')), 'a sane raise passes the law-check');
const store2 = new TerrainEditStore(field, planetStub);
store2.stroke(210, -140, 8, 500, 'raise');
const spikeReport = new WorldValidator(registry, planetStub, store2, ledger).validate();
assert(spikeReport.semantic.some((s) => s.includes('brush slip')), 'a 500 m spike is flagged as a brush slip');

// ---- 4. The world exports as data ----
const json = exportWorld(registry, store, ledger, saneReport);
assert(json.components.length >= 14, `export carries every component (${json.components.length})`);
assert(json.burials['test_grounded_house'] !== undefined, 'the burial ledger exports');
assert(json.validation.passed === true || json.validation.summary.grounded === 0, 'validation summary exports');

console.log(`\n${'='.repeat(40)}`);
console.log(`Results: ${passed}/${passed + failed} passed`);
process.exit(failed > 0 ? 1 : 0);
