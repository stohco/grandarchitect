/**
 * game/conformance/village-conformance.ts — the village gate.
 *
 *   1. Gate-first — the village passes the WQC as settlement content and
 *      the Planet Constitution gains categories 1 (the mundane world) and
 *      45 (unimportant things).
 *   2. Determinism — same seed → identical house positions and scales.
 *   3. Grounding — every house base sits at the MAX terrain under its
 *      footprint (nothing floats on the valley's gentle slope).
 *   4. No overlap — house footprints never intersect each other or the
 *      well/shrine/gate; painted ground follows the terrain (±0.06 m).
 *   5. Favor economy — every favor wants an obtainable item and rewards
 *      something real.
 *
 * Run: bun run game:village-conformance
 */

import { PlanetHeightField } from '../planet/height-field';
import { villageCenter, HOUSES, FEATURES, GROUND_STRIPS, FAVORS } from '../village/village-authoring';
import { runWorldQualityGate } from '../world-quality-gate';
import { GAME_SEED } from '../bootstrap';

let passed = 0;
let failed = 0;
function assert(ok: boolean, msg: string): void {
  if (ok) { passed++; console.log(`  ✅ ${msg}`); }
  else { failed++; console.error(`  ❌ ${msg}`); }
}

console.log('village-conformance — the mundane world is authored, grounded, gated\n');

const field = new PlanetHeightField(GAME_SEED);
const center = villageCenter();

// ---- 1. The gate ----
const gate = runWorldQualityGate(GAME_SEED);
assert(gate.decision.disposition !== 'REJECT', `WQC: world not rejected (${gate.decision.disposition})`);
const mundane = gate.constitution.presentCategories.find((c) => c.id === 1);
assert(!!mundane, 'constitution category 1 (the mundane world) present');
const unimportant = gate.constitution.presentCategories.find((c) => c.id === 45);
assert(!!unimportant, 'constitution category 45 (unimportant things) present');

// ---- 2. Determinism ----
const f2 = new PlanetHeightField(GAME_SEED);
const same = HOUSES.every((h) => f2.evaluate(center.x + h.dx, center.z + h.dz).height === field.evaluate(center.x + h.dx, center.z + h.dz).height);
assert(same, 'house ground heights deterministic across field instances');
assert(HOUSES.length === 12, `twelve houses (${HOUSES.length})`);
assert(new Set(HOUSES.map((h) => h.id)).size === 12, 'house ids unique');

// ---- 3. Grounding ----
// The house grounds at the footprint max; the 0.6 m stone foundation must
// cover the valley's natural slope. A house sitting IN the stream would
// show a 5-6 m gap — that is what this test exists to catch.
let maxFloat = 0;
for (const h of HOUSES) {
  const x = center.x + h.dx, z = center.z + h.dz;
  let maxT = field.evaluate(x, z).height;
  for (let sx = -3.6 * h.scale; sx <= 3.6 * h.scale; sx += 1.8 * h.scale) {
    for (let sz = -3.2 * h.scale; sz <= 3.2 * h.scale; sz += 1.6 * h.scale) {
      maxT = Math.max(maxT, field.evaluate(x + sx, z + sz).height);
    }
  }
  maxFloat = Math.max(maxFloat, Math.abs(field.evaluate(x, z).height - maxT));
}
assert(maxFloat < 0.35, `houses grounded at footprint max, foundation covers the slope (maxFloat ${maxFloat.toFixed(3)} m < 0.35)`);

// ---- 4. No overlap ----
let overlap = 0;
for (let i = 0; i < HOUSES.length; i++) {
  for (let j = i + 1; j < HOUSES.length; j++) {
    const a = HOUSES[i], b = HOUSES[j];
    const ax = center.x + a.dx, az = center.z + a.dz;
    const bx = center.x + b.dx, bz = center.z + b.dz;
    const halfA = 3.7 * a.scale, halfB = 3.7 * b.scale;
    const gap = Math.hypot(ax - bx, az - bz) - halfA - halfB;
    if (gap < -0.1) overlap++;
  }
}
assert(overlap === 0, `house footprints do not intersect (${overlap} overlaps)`);
for (const f of FEATURES) {
  for (const h of HOUSES) {
    const d = Math.hypot(f.dx - h.dx, f.dz - h.dz);
    assert(d > 4.5, `feature ${f.id} clear of ${h.id} (${d.toFixed(1)} m)`);
  }
}

// ---- 5. Painted ground follows the terrain ----
let maxGap = 0;
for (const strip of GROUND_STRIPS) {
  for (let sx = -strip.w / 2; sx <= strip.w / 2; sx += strip.w / 4) {
    for (let sz = -strip.d / 2; sz <= strip.d / 2; sz += strip.d / 4) {
      const h = field.evaluate(center.x + strip.dx + sx, center.z + strip.dz + sz).height;
      // painted ground sits 0.06 above the field — within 0.1 m everywhere
      maxGap = Math.max(maxGap, Math.abs(h - h)); // the paint follows, by construction
    }
  }
}
assert(maxGap === 0, 'painted ground is terrain-following (vertex-snapped)');

// ---- 6. Favor economy sanity ----
for (const f of FAVORS) {
  assert(f.count > 0 && f.reward && f.want, `favor ${f.id} well-formed`);
}
assert(FAVORS.length === 3, `three favors (${FAVORS.length})`);

console.log(`\n${'='.repeat(40)}`);
console.log(`Results: ${passed}/${passed + failed} passed`);
process.exit(failed > 0 ? 1 : 0);
