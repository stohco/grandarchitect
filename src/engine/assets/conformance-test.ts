/**
 * Assets Pipeline — Conformance Test
 * ====================================
 *
 * Proves the ONE end-to-end asset pipeline on a REAL multi-mesh asset (a
 * deterministic 5-mesh stylized pagoda — not a cube):
 *
 *   source (seeded generator)
 *     → validate (acceptance gate: topology, UV, semantic regions)
 *     → register (canonical revision registry, content hashing)
 *     → derive   (LOD via meshoptimizer REAL reduction; collision AABB tree)
 *     → export   (multi-mesh GLB via @gltf-transform)
 *     → round-trip (io.readBinary on the produced GLB)
 *     → instantiate (multiple EntityInstances sharing one revision)
 *     → persist/reload (fs round-trip, hashes match)
 *
 * Run: bun run src/engine/assets/conformance-test.ts
 *
 * NOTE: excluded from `tsc` (repo convention — see tsconfig exclude),
 * but must pass `bun run lint`.
 */

import { mkdtemp, rm } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';

import { generatePagodaSource, PAGODA_DEFAULT_SEED } from './procedural-pagoda';
import { buildPagodaSemanticAsset } from './semantic-builder';
import { hashGeometry } from './content-hash';
import {
  validateSemanticAsset,
  DEFAULT_GATE_CONFIG,
} from './acceptance-gate';
import type { AcceptanceGateConfig } from './acceptance-gate';
import { deriveLODChain, deriveCollisionHierarchy } from './artifact-derivation';
import { exportSemanticToGLB, readbackGLB } from './glb-pipeline';
import { AssetPipeline } from './pipeline';
import { AssetRegistry } from '../studio/asset-registry';
import type { SemanticAsset } from './semantic-asset';

let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    passed++;
    console.log(`  ✅ ${message}`);
  } else {
    failed++;
    console.error(`  ❌ ${message}`);
  }
}

const PIPELINE_GATE: AcceptanceGateConfig = {
  ...DEFAULT_GATE_CONFIG,
  requireNormals: true,
  minUVCoverage: 0.9,
};

async function runTests() {
  console.log('=== Assets Pipeline Conformance Test ===\n');

  // ---------------------------------------------------------------------
  console.log('Test 1: Deterministic multi-mesh source generation');
  const seedA = PAGODA_DEFAULT_SEED;
  const seedB = seedA + 1;
  const meshA = generatePagodaSource(seedA);
  const meshA2 = generatePagodaSource(seedA);
  const meshB = generatePagodaSource(seedB);

  const hashA = hashGeometry({ positions: meshA.positions, uvs: meshA.uvs, normals: meshA.normals, indices: meshA.indices });
  const hashA2 = hashGeometry({ positions: meshA2.positions, uvs: meshA2.uvs, normals: meshA2.normals, indices: meshA2.indices });
  const hashB = hashGeometry({ positions: meshB.positions, uvs: meshB.uvs, normals: meshB.normals, indices: meshB.indices });

  assert(meshA.parts.length === 5, `5 semantic parts generated (got ${meshA.parts.length})`);
  assert(meshA.parts.length >= 3, '≥3 distinct meshes (multi-mesh, not a cube)');
  assert(new Set(meshA.parts.map((p) => p.materialIndex)).size >= 3, '≥3 distinct materials');
  assert(meshA.positions.length / 3 > 300, `real triangle budget: ${meshA.indices.length / 3} triangles`);
  assert(meshA.uvs.length === (meshA.positions.length / 3) * 2, 'UV buffer matches vertex count');
  assert(meshA.normals.length === meshA.positions.length, 'Normal buffer matches positions');
  assert(hashA === hashA2, `same seed → same geometry hash (${hashA.slice(0, 12)}…)`);
  assert(hashA !== hashB, 'different seed → different geometry hash');
  assert(meshA.bounds.max[1] > 7 && meshA.bounds.min[1] >= 0, `bounds sane (height ${meshA.bounds.max[1].toFixed(2)}m)`);

  // ---------------------------------------------------------------------
  console.log('\nTest 2: Semantic asset build');
  const asset: SemanticAsset = buildPagodaSemanticAsset(meshA, {
    assetId: 'ga:pagoda',
    seed: seedA,
    instruction: 'Deterministic stylized xianxia pagoda (conformance)',
  });
  assert(asset.geometry.triangleCount === meshA.indices.length / 3, 'geometry triangle count matches source');
  assert(asset.semanticParts.parts.length === 5, 'semantic part graph has 5 parts');
  assert(asset.semanticParts.relationships.length === 4, 'attachment chain has 4 relationships');
  assert(asset.editableRegions.length === 5, '5 editable regions');
  assert(asset.editableRegions.find((r) => r.protected)?.partIds[0] === 'spire', 'spire region is protected');
  assert(asset.provenance.source === 'procedural' && asset.provenance.seed === seedA, 'provenance records source + seed');
  assert(asset.provenance.providerId === 'ga:procedural-pagoda', 'provenance records generator id');

  // ---------------------------------------------------------------------
  console.log('\nTest 3: Acceptance gate — pass on clean asset');
  const gate = validateSemanticAsset(asset, PIPELINE_GATE);
  assert(gate.passed, `clean asset passes (${gate.summary})`);
  assert(gate.checks.length >= 9, `≥9 checks run (got ${gate.checks.length})`);
  const degenCheck = gate.checks.find((c) => c.checkId === 'degenerate-triangles');
  assert(degenCheck?.passed === true, 'no zero-area triangles (real cross-product check)');
  const uvCheck = gate.checks.find((c) => c.checkId === 'uv-coverage');
  assert(uvCheck?.passed === true && (uvCheck.value ?? 0) >= 0.9, `UV coverage ≥ 0.9 (${uvCheck?.value})`);
  const regionCheck = gate.checks.find((c) => c.checkId === 'semantic-regions');
  assert(regionCheck?.passed === true, 'semantic regions cover all triangles');
  assert(asset.validation.validated === true, 'validation state stamped on asset');

  // ---------------------------------------------------------------------
  console.log('\nTest 4: Acceptance gate — failure cases');
  // 4a. NaN position → error
  const badNan = structuredClone(asset);
  badNan.geometry.positions[0] = NaN;
  assert(validateSemanticAsset(badNan, PIPELINE_GATE).passed === false, 'NaN position fails the gate');

  // 4b. Out-of-range index → error
  const badIdx = structuredClone(asset);
  badIdx.geometry.indices[0] = badIdx.geometry.vertexCount + 100;
  assert(validateSemanticAsset(badIdx, PIPELINE_GATE).passed === false, 'out-of-range index fails the gate');

  // 4c. Degenerate (zero-area) triangle → topology check fires
  const badDegen = structuredClone(asset);
  badDegen.geometry.positions[0] = badDegen.geometry.positions[3];
  badDegen.geometry.positions[1] = badDegen.geometry.positions[4];
  badDegen.geometry.positions[2] = badDegen.geometry.positions[5];
  const degenGate = validateSemanticAsset(badDegen, PIPELINE_GATE);
  const degenAfter = degenGate.checks.find((c) => c.checkId === 'degenerate-triangles');
  assert(degenAfter?.passed === false && (degenAfter.value ?? 0) > 0, `zero-area triangle detected (${degenAfter?.value})`);

  // 4d. UVs outside [0,1] → UV coverage fails under minUVCoverage 0.9
  const badUv = structuredClone(asset);
  for (let i = 0; i < badUv.geometry.uvs!.length; i += 8) badUv.geometry.uvs![i] = 5;
  const uvGate = validateSemanticAsset(badUv, PIPELINE_GATE);
  const uvAfter = uvGate.checks.find((c) => c.checkId === 'uv-coverage');
  assert(uvAfter?.passed === false, `broken UVs fail coverage check (coverage ${uvAfter?.value})`);

  // 4e. Missing semantic parts → semantic-region check fails
  const badParts = structuredClone(asset);
  badParts.semanticParts.parts = [];
  assert(validateSemanticAsset(badParts, PIPELINE_GATE).passed === false, 'missing semantic parts fails the gate');

  // ---------------------------------------------------------------------
  console.log('\nTest 5: LOD chain — REAL meshoptimizer reduction with protected regions');
  const lod = await deriveLODChain(asset, [0.5, 0.25], ['spire']);
  assert(lod.levels.length === 2, 'two LOD levels derived');
  assert(lod.sourceTriangleCount === asset.geometry.triangleCount, 'LOD source count matches asset');

  const l1 = lod.levels[0]!;
  const l2 = lod.levels[1]!;
  assert(l1.totalAfter < l1.totalBefore, `LOD1 strictly reduces triangles (${l1.totalBefore} → ${l1.totalAfter})`);
  assert(l2.totalAfter < l1.totalAfter, `LOD2 reduces further (${l1.totalAfter} → ${l2.totalAfter})`);

  const spireL1 = l1.parts.find((p) => p.partId === 'spire')!;
  const spireL2 = l2.parts.find((p) => p.partId === 'spire')!;
  assert(spireL1.protected && spireL1.after === spireL1.before, `protected spire intact at LOD1 (${spireL1.before} tris)`);
  assert(spireL2.protected && spireL2.after === spireL2.before, `protected spire intact at LOD2 (${spireL2.before} tris)`);

  const reducedL1 = l1.parts.filter((p) => !p.protected);
  assert(reducedL1.every((p) => p.after < p.before), `every unprotected part reduced (${reducedL1.map((p) => `${p.partId}:${p.before}→${p.after}`).join(', ')})`);

  const l1Hashes = new Set(l1.parts.map((p) => p.hash));
  assert(l1Hashes.size === l1.parts.length && !l1Hashes.has(lod.sourceHash), 'LOD part hashes differ from source hash');

  // ---------------------------------------------------------------------
  console.log('\nTest 6: GLB export + round-trip validation');
  const glbA = await exportSemanticToGLB(asset);
  const glbB = await exportSemanticToGLB(asset);
  assert(glbA.sizeBytes > 0, `GLB produced (${glbA.sizeBytes} bytes)`);
  assert(glbA.hash === glbB.hash, `GLB export is deterministic (${glbA.hash.slice(0, 12)}…)`);
  assert(glbA.meshCount === 5, `5 meshes in GLB (got ${glbA.meshCount})`);
  assert(glbA.triangleCount === asset.geometry.triangleCount, `GLB triangle count matches asset (${glbA.triangleCount})`);

  const roundTrip = await readbackGLB(glbA.buffer, asset.geometry, asset.semanticParts.parts.length);
  assert(roundTrip.ok, 'io.readBinary round-trip structurally valid');
  assert(roundTrip.meshCount === 5 && roundTrip.triangleCount === asset.geometry.triangleCount, `readback matches (meshes ${roundTrip.meshCount}, tris ${roundTrip.triangleCount})`);
  assert(roundTrip.materialCount >= 3, `readback sees distinct materials (${roundTrip.materialCount})`);

  // ---------------------------------------------------------------------
  console.log('\nTest 7: Collision hierarchy (AABB tree)');
  const collision = deriveCollisionHierarchy(asset.geometry, { maxBoxes: 16, maxTrisPerBox: 64 });
  assert(collision.boxes.length > 0 && collision.boxes.length <= 16, `box count in range (${collision.boxes.length})`);
  const coverage = collision.boxes.every((b) => b.triangleCount > 0);
  assert(coverage, 'every box contains triangles');
  const totalBoxTris = collision.boxes.reduce((n, b) => n + b.triangleCount, 0);
  assert(totalBoxTris === collision.triangleCount, `boxes partition all ${collision.triangleCount} triangles`);
  const collision2 = deriveCollisionHierarchy(asset.geometry, { maxBoxes: 16, maxTrisPerBox: 64 });
  assert(collision.hash === collision2.hash, `collision hash deterministic (${collision.hash.slice(0, 12)}…)`);

  // ---------------------------------------------------------------------
  console.log('\nTest 8: Full pipeline (register → derive → export → instantiate)');
  const registry = new AssetRegistry();
  const pipeline = new AssetPipeline(registry);
  const result = await pipeline.run({
    seed: seedA,
    name: 'ga:pagoda',
    instantiate: 3,
  });
  assert(result.ok === true, 'pipeline ok');
  assert(result.revision?.revision === 1, 'revision 1 registered');
  assert(registry.getRevision('ga:pagoda', 1)?.contentHash === result.revision?.contentHash, 'revision hash == registry hash');
  assert(registry.getArtifacts('ga:pagoda', 1, 'glb').length === 1, 'glb artifact attached');
  assert(registry.getArtifacts('ga:pagoda', 1, 'lod-chain').length === 1, 'lod artifact attached');
  assert(registry.getArtifacts('ga:pagoda', 1, 'collision-hierarchy').length === 1, 'collision artifact attached');

  const artifactLod = registry.getArtifacts('ga:pagoda', 1, 'lod-chain')[0]!;
  assert(artifactLod.sourceRevision === 1, 'LOD artifact revisioned against source revision 1');
  const artifactGlb = registry.getArtifacts('ga:pagoda', 1, 'glb')[0]!;
  assert(artifactGlb.hash === result.glb?.hash, 'GLB artifact hash == exported GLB hash');

  const instances = result.instances!;
  assert(instances.length === 3, '3 entity instances created');
  assert(instances.every((i) => i.assetId === 'ga:pagoda' && i.assetRevision === 1), 'all instances share the same revision');
  assert(registry.getSummary().instancesPerAsset['ga:pagoda'] === 3, 'registry counts 3 instances for one asset');

  // ---------------------------------------------------------------------
  console.log('\nTest 9: Persistence reload — hashes match');
  const dir = await mkdtemp(join(tmpdir(), 'ga-registry-'));
  try {
    const savePath = await registry.persist(dir);
    assert(savePath.length > 0, `registry persisted to ${savePath}`);
    const reloaded = await AssetRegistry.load(dir);
    const r1 = reloaded.getRevision('ga:pagoda', 1);
    const r2 = registry.getRevision('ga:pagoda', 1);
    assert(r1 !== null, 'revision reloaded from disk');
    assert(r1!.contentHash === r2!.contentHash, 'content hash matches across reload');
    assert(r1!.semanticHash === r2!.semanticHash, 'semantic hash matches across reload');
    assert(r1!.glbBytes?.length === r2!.glbBytes?.length, 'GLB bytes preserved across reload');
    assert(reloaded.getSummary().totalRevisions === 1, 'revision count preserved');
    assert(reloaded.getSummary().totalInstances === 3, 'instance count preserved');
    assert(reloaded.getArtifacts('ga:pagoda', 1, 'lod-chain').length === 1, 'derived artifacts preserved');
    assert(reloaded.listInstances()[0]?.entityId === registry.listInstances()[0]?.entityId, 'instance ids preserved');
  } finally {
    await rm(dir, { recursive: true, force: true });
  }

  // ---------------------------------------------------------------------
  console.log('\nTest 10: Pipeline gate failure — nothing registers');
  const registry2 = new AssetRegistry();
  const pipeline2 = new AssetPipeline(registry2);
  const bad = await pipeline2.run({
    seed: seedA,
    name: 'ga:pagoda-bad',
    gateConfig: { maxTriangles: 10 },
  });
  assert(bad.ok === false, 'pipeline refuses budget-exceeding asset');
  assert(registry2.getRevision('ga:pagoda-bad', 1) === null, 'nothing registered on gate failure');

  // ---------------------------------------------------------------------
  console.log('\n=== Summary ===');
  console.log(`Passed: ${passed}, Failed: ${failed}`);
  console.log(`Total asserts: ${passed + failed}`);
  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Conformance test crashed:', err);
  process.exit(1);
});
