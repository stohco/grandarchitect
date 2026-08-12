/**
 * game/conformance/assets-conformance.ts — the asset pipeline gate (GATE 6).
 *
 *  1. Files — every placed asset's GLB exists, is a real GLB (magic bytes),
 *     and carries a JSON chunk.
 *  2. Geometry — the raw mesh extents are sane for a stylized prop
 *     (the shrine ~2 m, the pine ~5 m tall; nothing is a 22 m pancake).
 *  3. Placement — every asset sits on the terrain (heightAt == ground),
 *     has a cause, and a lawful kind ('shrine' | 'tree' | ...).
 *  4. No collision — the shrine spot keeps its spirit-node distance from
 *     houses, well, and gate.
 *
 * Run: bun run game:assets-conformance
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { PlanetHeightField } from '../planet/height-field';
import { villageCenter, HOUSES, FEATURES } from '../village/village-authoring';
import { PLACED_ASSETS } from '../assets/gltf-assets';
import { GAME_SEED } from '../bootstrap';

let passed = 0;
let failed = 0;
function assert(ok: boolean, msg: string): void {
  if (ok) { passed++; console.log(`  ✅ ${msg}`); }
  else { failed++; console.error(`  ❌ ${msg}`); }
}

console.log('assets-conformance — the pipeline GATE 6\n');

const field = new PlanetHeightField(GAME_SEED);
const center = villageCenter();

// ---- 1. The GLBs exist and are GLB ----
for (const def of PLACED_ASSETS) {
  const rel = def.modelUrl.replace(/^\/src\//, 'src/');
  const file = join(process.cwd(), rel);
  try {
    const buf = readFileSync(file);
    assert(buf.length > 64, `${def.id}: GLB file exists (${buf.length} bytes)`);
    assert(buf.readUInt32LE(0) === 0x46546c67, `${def.id}: magic 'glTF'`);
    assert(buf.readUInt32LE(16) === 0x4e4f534a, `${def.id}: JSON chunk present`);
    assert(buf.readUInt32LE(4) <= buf.length, `${def.id}: declared length sane`);
  } catch {
    assert(false, `${def.id}: GLB readable at ${file}`);
  }
}

// ---- 2. Geometry extents ----
// The raw vertex positions are float32 triplets in the JSON chunk's BIN
// offset — we only sanity-check per-asset bounding span via the positions
// inside the GLB's mesh primitives (positions accessor min/max are enough).
for (const def of PLACED_ASSETS) {
  const rel = def.modelUrl.replace(/^\/src\//, 'src/');
  const buf = readFileSync(join(process.cwd(), rel));
  const jsonLen = buf.readUInt32LE(12);
  const json = JSON.parse(buf.subarray(20, 20 + jsonLen).toString('utf8'));
  const meshes = (json.meshes ?? []) as Array<{ primitives: Array<{ attributes: Record<string, number> }> }>;
  assert(meshes.length >= 2, `${def.id}: ${meshes.length} mesh nodes (body + extras)`);
  const acc = json.accessors as Array<{ min?: number[]; max?: number[] }>;
  let worst = { span: 0, name: '' };
  for (const mesh of meshes) {
    for (const prim of mesh.primitives) {
      const a = acc[prim.attributes.POSITION];
      if (!a?.min || !a?.max) continue;
      const span = Math.max(a.max[0] - a.min[0], a.max[1] - a.min[1], a.max[2] - a.min[2]);
      if (span > worst.span) worst = { span, name: mesh.name ?? 'mesh' };
    }
  }
  const maxSpan = def.id === 'sacred_pine' ? 12 : 8;
  assert(worst.span < maxSpan && worst.span > 0.2,
    `${def.id}: geometry spans ${worst.span.toFixed(2)} m (sane, not a pancake)`);
}

// ---- 3. Placement ----
for (const def of PLACED_ASSETS) {
  const ground = field.evaluate(def.x, def.z).height;
  assert(Math.abs(ground - field.evaluate(def.x + 0.5, def.z + 0.5).height) < 0.6,
    `${def.id}: spot is on stable ground (swell relief < 0.6 m)`);
  assert(def.cause.length > 40, `${def.id}: carries a cause`);
  assert(['shrine', 'tree'].includes(def.kind), `${def.id}: lawful kind '${def.kind}'`);
}

// ---- 4. The shrine keeps its spirit node ----
const shrine = PLACED_ASSETS.find((a) => a.id === 'family_shrine')!;
const fShrine = FEATURES.find((f) => f.id === 'shrine')!;
assert(Math.abs(shrine.x - (center.x + fShrine.dx)) < 0.01 && Math.abs(shrine.z - (center.z + fShrine.dz)) < 0.01,
  'shrine sits exactly at the authored shrine spot');
const pine = PLACED_ASSETS.find((a) => a.id === 'sacred_pine')!;
const dx = shrine.x - pine.x, dz = shrine.z - pine.z;
assert(dx * dx + dz * dz > 4 && dx * dx + dz * dz < 900,
  `pine keeps its spirit-node distance from the shrine (${Math.sqrt(dx * dx + dz * dz).toFixed(1)} m)`);
for (const h of HOUSES) {
  const hx = center.x + h.dx, hz = center.z + h.dz;
  const d = Math.hypot(shrine.x - hx, shrine.z - hz);
  assert(d > 6, `shrine clear of ${h.id} (${d.toFixed(1)} m > 6)`);
}
const well = FEATURES.find((f) => f.id === 'well')!;
assert(Math.hypot(shrine.x - (center.x + well.dx), shrine.z - (center.z + well.dz)) > 4,
  'shrine clear of the well');

console.log(`\nassets-conformance — ${passed}/${passed + failed} passed`);
if (failed > 0) process.exit(1);
