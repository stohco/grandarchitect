/**
 * game/conformance/terrain-law-conformance.ts — the terrain law gate
 * (Image Directives §3, posters I5/I2).
 *
 *   1. Slope exposure — slopeAt is deterministic, in degrees.
 *   2. WALKABLE ZONES (≤35°): the village square (±7 m), the cart road
 *      strip, every house footprint (±3.6 m), the shrine spot (248,-128).
 *   3. STREAM BANK ZONE (<50°): within 8 m of the village stream near the
 *      village (z from -140 to 60) — the poster's steep-caution band.
 *   4. MATERIAL FAMILIES — all eleven families present, hardness/fracture/
 *      qi in [0,1], colors finite.
 *   5. The brush RESPECTS hardness — hardnessFactor(soil) >
 *      hardnessFactor(granite) > hardnessFactor(sacred stone); a soil
 *      stroke digs deeper than a sacred-stone stroke; flatten/smooth keep
 *      the raw strength.
 *
 * Run: bun run game:terrain-law-conformance
 */

import { PlanetHeightField } from '../planet/height-field';
import { MATERIAL_FAMILIES, hardnessFactor, SLOPE_WALKABLE, SLOPE_STEEP } from '../planet/material-families';
import { villageCenter, HOUSES } from '../village/village-authoring';
import { RIVERS } from '../planet/world-authoring';
import { TerrainEditStore } from '../editor/terrain-edit';
import { GAME_SEED } from '../bootstrap';

let passed = 0;
let failed = 0;
function assert(ok: boolean, msg: string): void {
  if (ok) { passed++; console.log(`  ✅ ${msg}`); }
  else { failed++; console.error(`  ❌ ${msg}`); }
}

console.log('terrain-law-conformance — slope bands, material families, hardness-respecting brush\n');

const field = new PlanetHeightField(GAME_SEED);
const center = villageCenter();

/** Max slope over a rectangular zone; returns the worst point for evidence. */
function maxSlopeIn(
  x0: number, z0: number, rx: number, rz: number, step: number,
): { max: number; at: string } {
  let max = -1;
  let at = '';
  for (let dx = -rx; dx <= rx + 1e-9; dx += step) {
    for (let dz = -rz; dz <= rz + 1e-9; dz += step) {
      const s = field.slopeAt(x0 + dx, z0 + dz);
      if (s > max) { max = s; at = `(${(x0 + dx).toFixed(1)}, ${(z0 + dz).toFixed(1)})`; }
    }
  }
  return { max, at };
}

/** Max slope within 8 m of the village stream polyline, z clipped to
 *  [-140, 60]. Walks each segment at 2 m steps, sampling perpendicular
 *  offsets of 0/±4/±8 m — the whole bank corridor, channel included. */
function streamBankMaxSlope(): { max: number; at: string } {
  const stream = RIVERS.find((r) => r.id === 'village_stream')!;
  let max = -1;
  let at = '';
  for (let i = 0; i < stream.points.length - 1; i++) {
    const [ax, az] = stream.points[i];
    const [bx, bz] = stream.points[i + 1];
    if (Math.max(az, bz) < -140 || Math.min(az, bz) > 60) continue;
    const segLen = Math.hypot(bx - ax, bz - az);
    const dirx = (bx - ax) / (segLen || 1);
    const dirz = (bz - az) / (segLen || 1);
    const nx = -dirz, nz = dirx;
    const steps = Math.max(2, Math.ceil(segLen / 2));
    for (let s = 0; s <= steps; s++) {
      let t = s / steps;
      // clip t to the z band so every sample satisfies z ∈ [-140, 60]
      const z0 = az + t * (bz - az);
      if (z0 < -140) t = Math.abs(bz - az) < 1e-9 ? t : (-140 - az) / (bz - az);
      if (z0 > 60) t = Math.abs(bz - az) < 1e-9 ? t : (60 - az) / (bz - az);
      const px = ax + t * (bx - ax);
      const pz = az + t * (bz - az);
      for (const off of [-8, -4, 0, 4, 8]) {
        const sl = field.slopeAt(px + nx * off, pz + nz * off);
        if (sl > max) { max = sl; at = `(${(px + nx * off).toFixed(1)}, ${(pz + nz * off).toFixed(1)})`; }
      }
    }
  }
  return { max, at };
}

// ---- 1. Slope exposure: deterministic + in degrees ----
const f2 = new PlanetHeightField(GAME_SEED);
let slopeIdentical = true;
for (let i = 0; i < 60; i++) {
  const x = center.x + ((i * 733) % 400) - 200;
  const z = center.z + ((i * 991) % 400) - 200;
  if (field.slopeAt(x, z) !== f2.slopeAt(x, z)) slopeIdentical = false;
}
assert(slopeIdentical, 'slopeAt deterministic (60 samples, same seed → identical degrees)');
const flatSpot = field.slopeAt(center.x + 40, center.z + 40); // far from stream and bank
assert(Number.isFinite(flatSpot) && flatSpot >= 0 && flatSpot <= 90, `slopeAt returns degrees in [0,90] (${flatSpot.toFixed(2)}°)`);

// ---- 2. WALKABLE ZONES (≤35°) ----
const zoneTable: Array<{ name: string; max: number; at: string }> = [];

{
  const z = maxSlopeIn(center.x, center.z, 7, 7, 1);
  zoneTable.push({ name: 'village square (±7 m)', ...z });
  assert(z.max <= SLOPE_WALKABLE, `village square walkable (max ${z.max.toFixed(2)}° at ${z.at} ≤ ${SLOPE_WALKABLE}°)`);
}
{
  const z = maxSlopeIn(center.x + 0, center.z - 16, 1.6, 7, 0.8);
  zoneTable.push({ name: 'cart road strip', ...z });
  assert(z.max <= SLOPE_WALKABLE, `cart road walkable (max ${z.max.toFixed(2)}° at ${z.at} ≤ ${SLOPE_WALKABLE}°)`);
}
{
  let worst = -1; let worstAt = ''; let worstHouse = '';
  for (const h of HOUSES) {
    const z = maxSlopeIn(center.x + h.dx, center.z + h.dz, 3.6, 3.6, 1.8);
    if (z.max > worst) { worst = z.max; worstAt = z.at; worstHouse = h.id; }
  }
  zoneTable.push({ name: `house footprints (worst: ${worstHouse})`, max: worst, at: worstAt });
  assert(worst <= SLOPE_WALKABLE, `every house footprint walkable (max ${worst.toFixed(2)}° at ${worstAt} ≤ ${SLOPE_WALKABLE}°)`);
}
{
  const shrine = field.slopeAt(248, -128);
  zoneTable.push({ name: 'shrine spot (248,-128)', max: shrine, at: '(248.0, -128.0)' });
  assert(shrine <= SLOPE_WALKABLE, `shrine spot walkable (${shrine.toFixed(2)}° ≤ ${SLOPE_WALKABLE}°)`);
}

// ---- 3. STREAM BANK ZONE (<50°, the steep-caution band) ----
const bank = streamBankMaxSlope();
zoneTable.push({ name: 'stream bank zone (≤8 m, z −140..60)', max: bank.max, at: bank.at });
assert(bank.max < SLOPE_STEEP, `stream bank zone in the steep-caution band (max ${bank.max.toFixed(2)}° at ${bank.at} < ${SLOPE_STEEP}°)`);

// ---- 4. MATERIAL FAMILIES ----
const ids = Object.keys(MATERIAL_FAMILIES).map(Number).sort((a, b) => a - b);
assert(ids.length === 11 && ids.every((id, i) => id === i), `all 11 material families present (ids ${ids.join(',')})`);
{
  let valuesOk = true;
  let colorsOk = true;
  for (const fam of Object.values(MATERIAL_FAMILIES)) {
    if (fam.hardness < 0 || fam.hardness > 1 || fam.fracture < 0 || fam.fracture > 1 || fam.qi < 0 || fam.qi > 1) valuesOk = false;
    if (!fam.color.every((c) => Number.isFinite(c) && c >= 0 && c <= 1)) colorsOk = false;
  }
  assert(valuesOk, 'every family has hardness/fracture/qi in [0,1]');
  assert(colorsOk, 'every family color is finite and in [0,1]');
}

// ---- 5. The brush RESPECTS hardness ----
assert(
  hardnessFactor(0) > hardnessFactor(1) && hardnessFactor(1) > hardnessFactor(6),
  `hardnessFactor monotonic-ish: soil ${hardnessFactor(0).toFixed(2)} > granite ${hardnessFactor(1).toFixed(2)} > sacred stone ${hardnessFactor(6).toFixed(2)}`,
);
{
  const planetStub = {
    field,
    chunks: new Map<string, unknown>(),
    rebuildChunk(_key: string, _fn: (x: number, z: number) => number): void {},
  } as never;
  const soilStore = new TerrainEditStore(field, planetStub);
  soilStore.stroke(center.x, center.z, 8, 2, 'raise');
  const sacredField = {
    evaluate: () => ({ height: 64, biome: 'plains', material: 6 }),
  } as unknown as PlanetHeightField;
  const sacredStore = new TerrainEditStore(sacredField, planetStub);
  sacredStore.stroke(center.x, center.z, 8, 2, 'raise');
  const soilEff = soilStore.deltas[0].strength;
  const sacredEff = sacredStore.deltas[0].strength;
  assert(
    Math.abs(soilEff - 2 * hardnessFactor(0)) < 1e-9 && Math.abs(sacredEff - 2 * hardnessFactor(6)) < 1e-9,
    `raise delta stores the hardness-pre-multiplied strength (soil ${soilEff.toFixed(3)} m, sacred stone ${sacredEff.toFixed(3)} m)`,
  );
  assert(soilEff > sacredEff, `destruction respects hardness: soil yields more than sacred stone (${soilEff.toFixed(3)} > ${sacredEff.toFixed(3)} m)`);
  const flatStore = new TerrainEditStore(field, planetStub);
  flatStore.stroke(center.x, center.z, 8, 2, 'flatten');
  const smoothStore = new TerrainEditStore(field, planetStub);
  smoothStore.stroke(center.x, center.z, 8, 2, 'smooth');
  assert(
    flatStore.deltas[0].strength === 2 && smoothStore.deltas[0].strength === 2,
    'flatten/smooth keep the raw strength (hardness applies to raise/lower only)',
  );
}

// ---- evidence: the measured walkable-zone table ----
console.log('\n  slope survey (max per zone):');
for (const z of zoneTable) {
  console.log(`    ${z.name.padEnd(38)} ${z.max.toFixed(2).padStart(7)}°  at ${z.at}`);
}

console.log(`\n${'='.repeat(40)}`);
console.log(`Results: ${passed}/${passed + failed} passed`);
process.exit(failed > 0 ? 1 : 0);
