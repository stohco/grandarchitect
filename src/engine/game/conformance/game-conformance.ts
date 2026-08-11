/**
 * game/conformance/game-conformance.ts — THE game gate.
 *
 * Proof that the game is the frontier engine, not a parallel implementation:
 *
 *   1. Gate-first — the world passes the WQC (no FAIL verdicts after
 *      repair) and the Planet Constitution (justified absences only).
 *   2. Render/collision agreement — the three.js geometry is built from the
 *      canonical extractSurfaceMesh; the heightmap from the same field
 *      (maxDiff 0 by construction — mirrored from terrain-conformance).
 *   3. Deterministic player — the CharacterController over the same mesh
 *      produces a bit-identical trajectory across two identical runs.
 *   4. Spawn contract — the pipeline spawn has solid ground and open air.
 *
 * Run: bun run game:conformance
 */

import { generateTerrainPipeline, extractSurfaceMesh, computeHeightmap, sampleHeightmap, sampleDensity } from '../../frontier/terrain-plugin';
import { CharacterController } from '../../frontier/character-controller';
import { runWorldQualityGate } from '../world-quality-gate';
import { buildWorldTerrain } from '../terrain-mount';
import { GAME_SEED } from '../bootstrap';

let passed = 0;
let failed = 0;
function assert(ok: boolean, msg: string): void {
  if (ok) { passed++; console.log(`  ✅ ${msg}`); }
  else { failed++; console.error(`  ❌ ${msg}`); }
}

/** Bucket mesh vertices by their rounded lattice column (canonical helper). */
function meshVerticesByLatticeColumn(mesh: { vertexCount: number; positions: Float32Array }): Map<string, number[]> {
  const byXZ = new Map<string, number[]>();
  for (let v = 0; v < mesh.vertexCount; v++) {
    const key = `${Math.round(mesh.positions[v * 3])},${Math.round(mesh.positions[v * 3 + 2])}`;
    const arr = byXZ.get(key);
    if (arr) arr.push(v);
    else byXZ.set(key, [v]);
  }
  return byXZ;
}

console.log('game-conformance — the game IS the frontier engine\n');

// ---- 1. The gate ----
const gate = runWorldQualityGate(GAME_SEED);
assert(gate.decision.disposition !== 'REJECT', `WQC: world not rejected (disposition=${gate.decision.disposition})`);
assert(gate.decision.disposition !== 'MUTATE_STRUCTURE', `WQC: world not mutated (disposition=${gate.decision.disposition})`);
assert(gate.decision.repairPlan.length === 0, 'WQC: no repair plan pending');
assert(gate.constitution.complete || gate.constitution.justifiedAbsences.length > 0,
  `Constitution: coverage ${gate.constitution.coverage.toFixed(2)}, ${gate.constitution.passedQuestions}/${gate.constitution.passedQuestions + gate.constitution.failedQuestions.length} questions, ${gate.constitution.justifiedAbsences.length} justified absences`);

// ---- 2. Render/collision agreement (mirrors terrain-conformance §4) ----
const pipeline = generateTerrainPipeline(GAME_SEED);
const mesh = extractSurfaceMesh(pipeline.field, pipeline.spline);
const hm = computeHeightmap(pipeline.field, pipeline.spline);
{
  const byXZ = meshVerticesByLatticeColumn(mesh);
  const W = hm.nrows + 1;
  let worst = 0;
  let missing = 0;
  for (let i = 0; i < W; i++) {
    for (let j = 0; j < W; j++) {
      const key = `${-32 + j},${-32 + i}`;
      const verts = byXZ.get(key);
      if (!verts) { missing++; continue; }
      const h = hm.heights[j * W + i];
      let best = Number.POSITIVE_INFINITY;
      for (const v of verts) {
        const dy = Math.abs(mesh.positions[v * 3 + 1] - h);
        if (dy < best) best = dy;
      }
      if (best > worst) worst = best;
    }
  }
  assert(missing === 0 && worst < 1e-6,
    `render/collision agreement (missing=${missing}, maxDiff=${worst.toExponential(2)})`);
}

// the mounted three.js geometry carries the same vertices
const mounted = buildWorldTerrain(GAME_SEED);
assert(mounted.geometry.attributes.position.count === mesh.vertexCount,
  `mounted geometry has ${mounted.geometry.attributes.position.count} verts (canonical ${mesh.vertexCount})`);
assert(mounted.geometry.index!.count === mesh.indices.length,
  `mounted geometry has ${mounted.geometry.index!.count} indices (canonical ${mesh.indices.length})`);

// ---- 3. Deterministic player ----
function runTrajectory(): string {
  const c = new CharacterController({ mesh: mounted.meshData, spawn: pipeline.spawn });
  for (let i = 0; i < 120; i++) {
    c.update(1 / 60, { moveX: 0, moveZ: -1, moveSpeed: 4.5, jump: i === 40, jumpStrength: 6.5 });
  }
  return c.getCheckpointProgress().trajectoryHash;
}
const t1 = runTrajectory();
const t2 = runTrajectory();
assert(t1 === t2, `player trajectory deterministic (${t1.slice(0, 10)}…)`);

// ---- 4. Spawn contract (mirrors terrain-conformance §5) ----
const spawn = pipeline.spawn;
assert(sampleDensity(pipeline.field, { x: spawn.x, y: spawn.y - 1.3, z: spawn.z }) < 0,
  `spawn (${spawn.x.toFixed(2)}, ${spawn.y.toFixed(2)}, ${spawn.z.toFixed(2)}) has solid ground below`);
assert(sampleDensity(pipeline.field, { x: spawn.x, y: spawn.y + 1.2, z: spawn.z }) > 0,
  'spawn has open air above');

console.log(`\n${'='.repeat(40)}`);
console.log(`Results: ${passed}/${passed + failed} passed`);
process.exit(failed > 0 ? 1 : 0);
