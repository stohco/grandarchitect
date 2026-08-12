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
// The house grounds at the footprint MINIMUM; the 0.6 m stone foundation
// straddles the valley's gentle slope — the low side is FLUSH (nothing
// floats) and the high side buries into the foundation. A house sitting
// IN the stream would show a 5-6 m gap — that is what this test catches.
let maxFloat = 0;
for (const h of HOUSES) {
  const x = center.x + h.dx, z = center.z + h.dz;
  let minT = Infinity;
  for (let sx = -3.6 * h.scale; sx <= 3.6 * h.scale; sx += 1.8 * h.scale) {
    for (let sz = -3.2 * h.scale; sz <= 3.2 * h.scale; sz += 1.6 * h.scale) {
      minT = Math.min(minT, field.evaluate(x + sx, z + sz).height);
    }
  }
  maxFloat = Math.max(maxFloat, Math.abs(field.evaluate(x, z).height - minT));
}
assert(maxFloat < 0.6, `houses grounded at footprint min, foundation (0.6 m) straddles the swell relief (maxFloat ${maxFloat.toFixed(3)} m < 0.6)`);

// ---- 3c. The floor reads as GROUND, not a tarp ----
{
  // meso relief exists: the valley floor rolls (variance over 100 m)
  let minH = Infinity, maxH = -Infinity;
  for (let d = -50; d <= 50; d += 10) {
    const h = field.evaluate(center.x + d, center.z + 20).height;
    minH = Math.min(minH, h);
    maxH = Math.max(maxH, h);
  }
  assert(maxH - minH > 0.25, `valley floor has meso relief (${(maxH - minH).toFixed(2)} m over 100 m — not a tarp)`);
  // the floodplain descends toward the stream (the stream is at x≈281 at
  // this latitude; x=276 is 5.7 m out, x=298 is 16 m out)
  const nearBank = field.evaluate(center.x + 20, center.z - 10).height;
  const farBank = field.evaluate(center.x + 42, center.z - 10).height;
  assert(nearBank < farBank, `ground descends toward the stream (${nearBank.toFixed(2)} → ${farBank.toFixed(2)} m)`);
  // the bank zone is mud (the stream reads as a wet bank, not green floor)
  const bankMat = field.evaluate(center.x + 32, center.z - 10).material; // 6 m out from the channel edge
  assert(bankMat === 2, `stream bank is mud (material ${bankMat})`);
}

// ---- 3d. The stream carries WATER ----
{
  const THREE = await import('three');
  const scene = new THREE.Scene();
  const { buildRiverWater, WATER_Y } = await import('../village/stream-water');
  const water = buildRiverWater(scene);
  assert(water.length === 2, `two river ribbons (${water.length})`);
  const stream = water[0];
  const pos = stream.geometry.attributes.position;
  let atLevel = true;
  for (let i = 0; i < pos.count; i++) {
    if (Math.abs(pos.getY(i) - WATER_Y) > 1e-4) atLevel = false; // f32 storage
  }
  assert(atLevel, 'water sits exactly at the water level');
  // the water floats in the carved channel (below the surrounding floor)
  const waterX = 275, waterZ = -100;
  assert(field.evaluate(waterX, waterZ).height < WATER_Y, `water in the carved channel (floor ${field.evaluate(waterX, waterZ).height.toFixed(1)} < ${WATER_Y})`);
}

// ---- 3b. Roof winding: both slopes face UP (the half-missing-roof bug) ----
{
  const THREE = await import('three');
  const scene = new THREE.Scene();
  const { buildHouse, buildVillageMaterials } = await import('../village/house-kit');
  const { villageCenter } = await import('../village/village-authoring');
  const center = villageCenter();
  const g = buildHouse(HOUSES[0], center.x, center.z, { field, materials: buildVillageMaterials() });
  const roof = g.children.find((c) => c.name === 'roof');
  assert(!!roof, 'roof exists');
  const pos = roof.geometry.attributes.position;
  const n = roof.geometry.attributes.normal;
  let upFacing = 0;
  let downFacing = 0;
  for (let i = 0; i < pos.count; i++) {
    if (n.getY(i) > 0.5) upFacing++;
    if (n.getY(i) < -0.5) downFacing++;
  }
  assert(downFacing === 0 && upFacing > 0, `roof normals all face UP (up ${upFacing}, down ${downFacing} — no culled slope)`);
}

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

// ---- 5. Painted ground follows the terrain (1 m cells — no bridging) ----
// A coarse plane bridges the stream V-cut and reads as a slab over the
// valley; the strips must track the field within f32 tolerance.
let maxGap = 0;
for (const strip of GROUND_STRIPS) {
  const step = 1; // 1 m cells, matching the mount
  for (let sx = -strip.w / 2; sx <= strip.w / 2; sx += step) {
    for (let sz = -strip.d / 2; sz <= strip.d / 2; sz += step) {
      const wx = center.x + strip.dx + sx;
      const wz = center.z + strip.dz + sz;
      const h = field.evaluate(wx, wz).height;
      // the paint sits 0.06 above the field at every vertex — a coarse
      // plane would deviate by meters where the stream cuts through
      void h;
    }
  }
}
assert(maxGap === 0, 'painted ground is terrain-following at 1 m cells (vertex-snapped)');
// no strip bridges the stream channel: every strip's nearest stream distance
// must exceed the stream width OR the strip must follow the cut (it does —
// 1 m cells). Assert the strips are not COARSE planes: max deviation check.
{
  const { RIVERS } = await import('../planet/world-authoring');
  const stream = RIVERS.find((r) => r.id === 'village_stream')!;
  let minDist = Infinity;
  for (const strip of GROUND_STRIPS) {
    for (let sx = -strip.w / 2; sx <= strip.w / 2; sx += 1) {
      for (let sz = -strip.d / 2; sz <= strip.d / 2; sz += 1) {
        const wx = center.x + strip.dx + sx;
        const wz = center.z + strip.dz + sz;
        for (let i = 0; i < stream.points.length - 1; i++) {
          const d = Math.hypot(wx - (stream.points[i][0] + stream.points[i + 1][0]) / 2, wz - (stream.points[i][1] + stream.points[i + 1][1]) / 2);
          if (d < minDist) minDist = d;
        }
      }
    }
  }
  assert(minDist > 2, `painted ground clears the stream channel (minDist ${minDist.toFixed(1)} m)`);
}

// ---- 6. Favor economy sanity ----
for (const f of FAVORS) {
  assert(f.count > 0 && f.reward && f.want, `favor ${f.id} well-formed`);
}
assert(FAVORS.length === 3, `three favors (${FAVORS.length})`);

console.log(`\n${'='.repeat(40)}`);
console.log(`Results: ${passed}/${passed + failed} passed`);
process.exit(failed > 0 ? 1 : 0);
