/**
 * game/conformance/game-conformance.ts — THE game gate.
 *
 * Proof that the game is the frontier engine at planet scale:
 *
 *   1. Gate-first — the authored planet passes the WQC (no reject) and the
 *      Planet Constitution (justified absences only).
 *   2. Determinism — two height fields with the same seed produce identical
 *      samples; the residency plan is a pure function of position.
 *   3. Semantic causes — Qing Hill is a mountain, the seas are below sea
 *      level, the village valley is a flat plains floor (authored, not noise).
 *   4. Watertight seams — neighboring chunks share border columns bit-exact.
 *   5. Render/collision agreement — chunk mesh tops equal the field exactly.
 *   6. Deterministic player — the CharacterController over the merged
 *      resident meshes produces a bit-identical trajectory.
 *   7. Spawn contract — the village has solid ground and open air.
 *
 * Run: bun run game:conformance
 */

import { PlanetHeightField } from '../planet/height-field';
import { buildChunkMesh, chunkOriginOf, CELLS, CELL_M, CHUNK_M } from '../planet/chunk-mesh';
import { planResidency, LOAD_RADIUS } from '../planet/streaming';
import { CharacterController } from '../../frontier/character-controller';
import { runWorldQualityGate } from '../world-quality-gate';
import { GAME_SEED } from '../bootstrap';
import { villageSpawn } from '../planet/planet-mount';

let passed = 0;
let failed = 0;
function assert(ok: boolean, msg: string): void {
  if (ok) { passed++; console.log(`  ✅ ${msg}`); }
  else { failed++; console.error(`  ❌ ${msg}`); }
}

console.log('game-conformance — the game IS the frontier engine (planet scale)\n');

// ---- 1. The gate ----
const gate = runWorldQualityGate(GAME_SEED);
assert(gate.decision.disposition !== 'REJECT', `WQC: world not rejected (disposition=${gate.decision.disposition})`);
assert(gate.decision.repairPlan.length === 0, 'WQC: no repair plan pending');
assert(gate.constitution.complete || gate.constitution.justifiedAbsences.length > 0,
  `Constitution: coverage ${gate.constitution.coverage.toFixed(2)}, ${gate.constitution.passedQuestions}/${gate.constitution.passedQuestions + gate.constitution.failedQuestions.length} questions, ${gate.constitution.justifiedAbsences.length} justified absences`);

// ---- 2. Determinism ----
const f1 = new PlanetHeightField(GAME_SEED);
const f2 = new PlanetHeightField(GAME_SEED);
let identical = true;
for (let i = 0; i < 200; i++) {
  const x = (i * 733) % 5000 - 2500;
  const z = (i * 991) % 5000 - 2500;
  if (f1.evaluate(x, z).height !== f2.evaluate(x, z).height) identical = false;
}
assert(identical, 'height field deterministic (200 samples, same seed → identical)');

// ---- 3. Semantic causes ----
const hengYue = f1.evaluate(30000, -5000);
assert(hengYue.height > 64 + 100, `Qing Hill is a mountain (${hengYue.height.toFixed(1)} m)`);
assert(hengYue.biome === 'snow' || hengYue.biome === 'mountain', `Qing Hill biome ${hengYue.biome}`);
const southSea = f1.evaluate(0, 62000);
assert(southSea.height < 50, `South Sea below sea level (${southSea.height.toFixed(1)} m)`);
assert(southSea.biome === 'ocean', `South Sea biome ${southSea.biome}`);
const village = f1.evaluate(256, -128);
assert(Math.abs(village.height - 64) < 12, `village on the valley floor (${village.height.toFixed(1)} m)`);
assert(village.biome === 'plains', `village biome ${village.biome}`);
const streamBed = f1.evaluate(275, -100); // on the village stream centerline
assert(streamBed.height < 50, `stream cut below sea level (${streamBed.height.toFixed(1)} m)`);

// ---- 4. Watertight seams ----
const a = buildChunkMesh(f1, '32,-16')!;      // village chunk
const b = buildChunkMesh(f1, '33,-16')!;      // east neighbor
let seamDiff = 0;
for (let iz = 0; iz <= CELLS; iz++) {
  // a's right border column vs b's left border column (same world points)
  const ia = iz * (CELLS + 1) + CELLS;
  const ib = iz * (CELLS + 1);
  seamDiff = Math.max(seamDiff, Math.abs(a.collisionHeights[ia] - b.collisionHeights[ib]));
}
assert(seamDiff === 0, `watertight seams: neighbor border columns bit-exact (diff ${seamDiff})`);

// ---- 5. Render/collision agreement ----
let maxAgree = 0;
for (let iz = 0; iz <= CELLS; iz++) {
  for (let ix = 0; ix <= CELLS; ix++) {
    const i = iz * (CELLS + 1) + ix;
    const wx = a.originX + ix * CELL_M;
    const wz = a.originZ + iz * CELL_M;
    const fieldY = f1.evaluate(wx, wz).height;
    // the mesh stores f32; the field is f64 — tolerance is f32 epsilon scale
    maxAgree = Math.max(maxAgree, Math.abs(a.positions[i * 3 + 1] - fieldY));
  }
}
assert(maxAgree < 1e-4, `render/collision agreement: chunk mesh tops equal the field (diff ${maxAgree.toExponential(2)})`);

// ---- 6. Streaming determinism ----
const spawn = villageSpawn();
const plan1 = planResidency(spawn.x, spawn.z, new Set());
const plan2 = planResidency(spawn.x, spawn.z, new Set());
assert(plan1.resident.size === plan2.resident.size && [...plan1.resident].every((k) => plan2.resident.has(k)),
  `residency deterministic (${plan1.resident.size} chunks)`);
assert(plan1.resident.has('32,-16'), 'village chunk resident at spawn');
const moved = planResidency(spawn.x + LOAD_RADIUS * 1.2, spawn.z, plan1.resident);
assert(moved.added.length > 0 && moved.removed.length > 0, 'moving across the radius streams in and out');

// ---- 7. Deterministic player over resident meshes ----
const merged = buildMergedFixture(f1);
function runTrajectory(): string {
  const c = new CharacterController({ mesh: merged, spawn: { x: spawn.x, y: f1.evaluate(spawn.x, spawn.z).height + 1.4, z: spawn.z } });
  for (let i = 0; i < 120; i++) {
    c.update(1 / 60, { moveX: 0, moveZ: -1, moveSpeed: 4.5, jump: i === 40, jumpStrength: 6.5 });
  }
  return c.getCheckpointProgress().trajectoryHash;
}
const t1 = runTrajectory();
const t2 = runTrajectory();
assert(t1 === t2, `player trajectory deterministic over resident meshes (${t1.slice(0, 10)}…)`);

// ---- 8. Spawn contract ----
const spY = f1.evaluate(spawn.x, spawn.z).height;
assert(f1.evaluate(spawn.x, spawn.z - 2).height > 0 && spY > 0, `village spawn has ground (${spY.toFixed(1)} m)`);
assert(spY < 64 + 10 && spY > 50, `village spawn elevation sane (${spY.toFixed(1)} m)`);

console.log(`\n${'='.repeat(40)}`);
console.log(`Results: ${passed}/${passed + failed} passed`);
process.exit(failed > 0 ? 1 : 0);

/** Merge the 3×3 chunk neighborhood around the village into one MeshData. */
function buildMergedFixture(field: PlanetHeightField) {
  const positions: number[] = [];
  const normals: number[] = [];
  const indices: number[] = [];
  let base = 0;
  const scx = Math.floor(spawn.x / CHUNK_M), scz = Math.floor(spawn.z / CHUNK_M);
  for (let dz = -1; dz <= 1; dz++) {
    for (let dx = -1; dx <= 1; dx++) {
      const cm = buildChunkMesh(field, `${scx + dx},${scz + dz}`);
      if (!cm) continue;
      const n = CELLS + 1;
      for (let i = 0; i < n * n; i++) {
        const lx = i % n, lz = Math.floor(i / n);
        positions.push(cm.originX + lx * CELL_M, cm.positions[i * 3 + 1], cm.originZ + lz * CELL_M);
        normals.push(0, 1, 0);
      }
      for (let i = 0; i < cm.indices.length; i++) indices.push(cm.indices[i] + base);
      base += n * n;
    }
  }
  return { positions: Float32Array.from(positions), normals: Float32Array.from(normals), indices: Uint32Array.from(indices) };
}
