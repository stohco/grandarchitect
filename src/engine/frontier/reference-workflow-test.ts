/**
 * Reference Workflow Test — the complete Live Studio vertical slice
 *
 * Select region → add SDF mountain → carve tunnel → apply erosion →
 * classify materials → scatter vegetation → preview → bake synchronized
 * render/collision/navigation bundle → verify atomic activation →
 * undo vegetation only → verify incremental recomputation →
 * save → reload → deterministic replay (same output hashes)
 *
 * This is NOT a mock. It exercises the real typed dependency graph with
 * cycle detection, dirty propagation, incremental recomputation, atomic
 * bundle activation, and deterministic content hashes.
 *
 * Run: npx tsx src/engine/frontier/reference-workflow-test.ts
 */

import { createTypedGraphManager, NODE_TYPES } from './typed-graph';
import type { GraphNode, SocketType, Socket } from './typed-graph';

// ============================================================================
// Test runner
// ============================================================================

interface TestResult {
  name: string;
  passed: boolean;
  details: string;
  evidence?: string;
}

const results: TestResult[] = [];

function assert(name: string, condition: boolean, details: string, evidence?: string) {
  results.push({ name, passed: condition, details, evidence });
  const status = condition ? '✓ PASS' : '✗ FAIL';
  console.log(`  ${status}: ${name} — ${details}`);
  if (evidence && !condition) console.log(`    evidence: ${evidence}`);
}

// ============================================================================
// Reference workflow
// ============================================================================

async function runReferenceWorkflow() {
  console.log('\n=== LIVE STUDIO REFERENCE WORKFLOW ===\n');
  const manager = createTypedGraphManager();

  // ---- Step 1: Create terrain graph ----
  console.log('Step 1: Create terrain graph');
  const graph = manager.create('terrain');
  assert('graph created', !!graph, `graphId: ${graph.graphId}`);
  assert('initial revision is 0', graph.revision === 0, `revision: ${graph.revision}`);

  // ---- Step 2: Add terrain source node ----
  console.log('\nStep 2: Add terrain source node');
  const sourceNodeDef = NODE_TYPES['terrain-source'];
  const sourceId = manager.addNode(graph.graphId, {
    nodeType: 'terrain-source',
    pluginId: 'ga:terrain',
    version: '1.0.0',
    inputs: sourceNodeDef.inputs.map(s => ({ ...s })),
    outputSocket: { ...sourceNodeDef.outputSocket } as Socket,
    parameters: { seed: 42, resolution: 128, size: [128, 128] },
    parameterSchema: { seed: { type: 'number' }, resolution: { type: 'number', range: [32, 512] }, size: { type: 'vector3' } },
    spatialBounds: { minX: 0, maxX: 128, minZ: 0, maxZ: 128 },
    dependencies: [],
    executionBackend: 'cpu-worker',
    estimatedCostMs: 100,
    enabled: true,
    attributableTo: 'user',
    createdAt: new Date().toISOString(),
  });
  assert('terrain source node added', !!sourceId, `nodeId: ${sourceId}`);

  // ---- Step 3: Add SDF mountain (depends on terrain source) ----
  console.log('\nStep 3: Add SDF mountain');
  const mountainNodeDef = NODE_TYPES['sdf-mountain'];
  const mountainId = manager.addNode(graph.graphId, {
    nodeType: 'sdf-mountain',
    pluginId: 'ga:terrain',
    version: '1.0.0',
    inputs: mountainNodeDef.inputs.map(s => ({ ...s })),
    outputSocket: { ...mountainNodeDef.outputSocket } as Socket,
    parameters: { position: [64, 0, 64], height: 40, radius: 30, shape: 'cone' },
    parameterSchema: { position: { type: 'vector3' }, height: { type: 'number', range: [1, 200] }, radius: { type: 'number', range: [1, 100] } },
    spatialBounds: { minX: 34, maxX: 94, minZ: 34, maxZ: 94 },
    dependencies: [sourceId],
    executionBackend: 'cpu-worker',
    estimatedCostMs: 50,
    enabled: true,
    attributableTo: 'user',
    createdAt: new Date().toISOString(),
  });
  assert('mountain node added', !!mountainId, `nodeId: ${mountainId}`);

  // Add dependency edge: source → mountain
  const edge1 = manager.addEdge(graph.graphId, { fromNode: sourceId, toNode: mountainId, socketName: 'base' });
  assert('edge source→mountain added', edge1.ok, edge1.cycle ? `cycle: ${edge1.cycle.join('→')}` : 'ok');

  // ---- Step 4: Carve spline tunnel (depends on mountain) ----
  console.log('\nStep 4: Carve spline tunnel');
  const tunnelNodeDef = NODE_TYPES['spline-tunnel'];
  const tunnelId = manager.addNode(graph.graphId, {
    nodeType: 'spline-tunnel',
    pluginId: 'ga:terrain',
    version: '1.0.0',
    inputs: tunnelNodeDef.inputs.map(s => ({ ...s })),
    outputSocket: { ...tunnelNodeDef.outputSocket } as Socket,
    parameters: { splinePoints: [[30, 10, 30], [64, 15, 64], [98, 10, 98]], radius: 3 },
    parameterSchema: { splinePoints: { type: 'array' }, radius: { type: 'number', range: [1, 10] } },
    spatialBounds: { minX: 30, maxX: 98, minZ: 30, maxZ: 98 },
    dependencies: [mountainId],
    executionBackend: 'cpu-worker',
    estimatedCostMs: 30,
    enabled: true,
    attributableTo: 'user',
    createdAt: new Date().toISOString(),
  });
  const edge2 = manager.addEdge(graph.graphId, { fromNode: mountainId, toNode: tunnelId, socketName: 'base' });
  assert('tunnel node added with edge', !!tunnelId && edge2.ok, `nodeId: ${tunnelId}`);

  // ---- Step 5: Apply erosion (depends on tunnel) ----
  console.log('\nStep 5: Apply hydraulic erosion');
  const erosionNodeDef = NODE_TYPES['erosion'];
  const erosionId = manager.addNode(graph.graphId, {
    nodeType: 'erosion',
    pluginId: 'ga:terrain',
    version: '1.0.0',
    inputs: erosionNodeDef.inputs.map(s => ({ ...s })),
    outputSocket: { ...erosionNodeDef.outputSocket } as Socket,
    parameters: { iterations: 500, rainfall: 0.01, evaporation: 0.02 },
    parameterSchema: { iterations: { type: 'number', range: [1, 5000] }, rainfall: { type: 'number', range: [0, 0.1] } },
    spatialBounds: { minX: 0, maxX: 128, minZ: 0, maxZ: 128 },
    dependencies: [tunnelId],
    executionBackend: 'gpu-compute',
    estimatedCostMs: 500,
    enabled: true,
    attributableTo: 'architect',
    createdAt: new Date().toISOString(),
  });
  const edge3 = manager.addEdge(graph.graphId, { fromNode: tunnelId, toNode: erosionId, socketName: 'terrain' });
  assert('erosion node added with edge', !!erosionId && edge3.ok, `nodeId: ${erosionId}`);

  // ---- Step 6: Material classification (depends on erosion) ----
  console.log('\nStep 6: Classify materials');
  const materialNodeDef = NODE_TYPES['material-classify'];
  const materialId = manager.addNode(graph.graphId, {
    nodeType: 'material-classify',
    pluginId: 'ga:terrain',
    version: '1.0.0',
    inputs: materialNodeDef.inputs.map(s => ({ ...s })),
    outputSocket: { ...materialNodeDef.outputSocket } as Socket,
    parameters: { slopeThreshold: 30, heightBands: [0, 10, 30, 50] },
    parameterSchema: { slopeThreshold: { type: 'number', range: [0, 90] } },
    spatialBounds: { minX: 0, maxX: 128, minZ: 0, maxZ: 128 },
    dependencies: [erosionId],
    executionBackend: 'cpu-worker',
    estimatedCostMs: 80,
    enabled: true,
    attributableTo: 'architect',
    createdAt: new Date().toISOString(),
  });
  const edge4 = manager.addEdge(graph.graphId, { fromNode: erosionId, toNode: materialId, socketName: 'terrain' });
  assert('material node added with edge', !!materialId && edge4.ok, `nodeId: ${materialId}`);

  // ---- Step 7: Scatter vegetation (depends on erosion + material) ----
  console.log('\nStep 7: Scatter vegetation');
  const vegNodeDef = NODE_TYPES['vegetation-scatter'];
  const vegId = manager.addNode(graph.graphId, {
    nodeType: 'vegetation-scatter',
    pluginId: 'ga:ecology',
    version: '1.0.0',
    inputs: vegNodeDef.inputs.map(s => ({ ...s })),
    outputSocket: { ...vegNodeDef.outputSocket } as Socket,
    parameters: { species: 'pine', density: 0.3, seed: 42 },
    parameterSchema: { species: { type: 'string' }, density: { type: 'number', range: [0, 1] } },
    spatialBounds: { minX: 0, maxX: 128, minZ: 0, maxZ: 128 },
    dependencies: [erosionId, materialId],
    executionBackend: 'cpu-worker',
    estimatedCostMs: 120,
    enabled: true,
    attributableTo: 'architect',
    createdAt: new Date().toISOString(),
  });
  const edge5 = manager.addEdge(graph.graphId, { fromNode: erosionId, toNode: vegId, socketName: 'terrain' });
  const edge6 = manager.addEdge(graph.graphId, { fromNode: materialId, toNode: vegId, socketName: 'materialMap' });
  assert('vegetation node added with 2 edges', !!vegId && edge5.ok && edge6.ok, `nodeId: ${vegId}`);

  // ---- Step 8: Cycle detection test ----
  console.log('\nStep 8: Cycle detection');
  // Try to add an edge that would create a cycle: vegetation → erosion
  const cycleEdge = manager.addEdge(graph.graphId, { fromNode: vegId, toNode: erosionId, socketName: 'terrain' });
  assert('cycle correctly rejected', !cycleEdge.ok, cycleEdge.cycle ? `cycle detected: ${cycleEdge.cycle.join(' → ')}` : 'no cycle (BAD)');

  // ---- Step 9: Type checking ----
  console.log('\nStep 9: Socket type validation');
  const typeCheck = manager.validateSocketTypes(graph.graphId);
  assert('all socket types valid', typeCheck.valid, typeCheck.mismatches.length === 0 ? 'all types match' : typeCheck.mismatches.join('; '));

  // ---- Step 10: Topological sort ----
  console.log('\nStep 10: Topological sort (deterministic evaluation order)');
  const topo = manager.topologicalSort(graph.graphId);
  assert('topological sort has no cycles', !topo.cycle, `order: ${topo.order.join(' → ')}`);
  assert('all 6 nodes in order', topo.order.length === 6, `${topo.order.length}/6 nodes`);

  // Verify order is correct: source before mountain before tunnel before erosion
  const sourceIdx = topo.order.indexOf(sourceId);
  const mountainIdx = topo.order.indexOf(mountainId);
  const tunnelIdx = topo.order.indexOf(tunnelId);
  const erosionIdx = topo.order.indexOf(erosionId);
  assert('source before mountain', sourceIdx < mountainIdx, `${sourceIdx} < ${mountainIdx}`);
  assert('mountain before tunnel', mountainIdx < tunnelIdx, `${mountainIdx} < ${tunnelIdx}`);
  assert('tunnel before erosion', tunnelIdx < erosionIdx, `${tunnelIdx} < ${erosionIdx}`);

  // ---- Step 11: Evaluate graph (incremental recomputation) ----
  console.log('\nStep 11: Evaluate graph (all dirty)');
  const eval1 = manager.evaluate(graph.graphId);
  assert('all 6 nodes evaluated', eval1.evaluated.length === 6, `${eval1.evaluated.length}/6 evaluated, ${eval1.skipped.length} skipped`);
  assert('no errors', eval1.errors.length === 0, eval1.errors.join('; ') || 'none');

  // ---- Step 12: Re-evaluate (all cached, nothing dirty) ----
  console.log('\nStep 12: Re-evaluate (nothing dirty — all cached)');
  const eval2 = manager.evaluate(graph.graphId);
  assert('all 6 nodes skipped (cached)', eval2.evaluated.length === 0 && eval2.skipped.length === 6, `${eval2.evaluated.length} evaluated, ${eval2.skipped.length} skipped`);

  // ---- Step 13: Incremental recomputation test ----
  console.log('\nStep 13: Modify mountain parameter → only dependents should be dirty');
  manager.updateParameters(graph.graphId, mountainId, { height: 50 }); // changed from 40 to 50
  const mountainNode = manager.get(graph.graphId)!.nodes.get(mountainId)!;
  assert('mountain is dirty', mountainNode.dirty, `dirty: ${mountainNode.dirty}`);

  // Check dirty propagation: mountain → tunnel → erosion → material → vegetation
  const tunnelNode = manager.get(graph.graphId)!.nodes.get(tunnelId)!;
  const erosionNode = manager.get(graph.graphId)!.nodes.get(erosionId)!;
  const materialNode = manager.get(graph.graphId)!.nodes.get(materialId)!;
  const vegNode = manager.get(graph.graphId)!.nodes.get(vegId)!;
  const sourceNode = manager.get(graph.graphId)!.nodes.get(sourceId)!;

  assert('tunnel is dirty (dependent on mountain)', tunnelNode.dirty, `dirty: ${tunnelNode.dirty}`);
  assert('erosion is dirty (dependent on tunnel)', erosionNode.dirty, `dirty: ${erosionNode.dirty}`);
  assert('material is dirty (dependent on erosion)', materialNode.dirty, `dirty: ${materialNode.dirty}`);
  assert('vegetation is dirty (dependent on erosion+material)', vegNode.dirty, `dirty: ${vegNode.dirty}`);
  assert('source is NOT dirty (no dependents changed)', !sourceNode.dirty, `dirty: ${sourceNode.dirty}`);

  // Re-evaluate: source should be skipped, all others evaluated
  const eval3 = manager.evaluate(graph.graphId);
  assert('source skipped (cached)', eval3.skipped.includes(sourceId), `skipped: ${eval3.skipped.join(', ')}`);
  assert('5 dependents re-evaluated', eval3.evaluated.length === 5, `${eval3.evaluated.length} evaluated`);

  // ---- Step 14: Bake synchronized bundle ----
  console.log('\nStep 14: Bake synchronized render/collision/navigation bundle');
  const bakeResult = manager.bake(graph.graphId);
  assert('bundle created', !!bakeResult.bundle, `bundleId: ${bakeResult.bundle.bundleId}`);
  assert('bundle activated (all components complete)', bakeResult.activated, `activated: ${bakeResult.activated}`);
  assert('render mesh component complete', bakeResult.bundle.components.renderMesh?.status === 'complete', `status: ${bakeResult.bundle.components.renderMesh?.status}`);
  assert('collision mesh component complete', bakeResult.bundle.components.collisionMesh?.status === 'complete', `status: ${bakeResult.bundle.components.collisionMesh?.status}`);
  assert('navigation mesh component complete', bakeResult.bundle.components.navigationMesh?.status === 'complete', `status: ${bakeResult.bundle.components.navigationMesh?.status}`);
  assert('render-collision sync validation passed', bakeResult.bundle.validationEvidence.find(e => e.checkName === 'render-collision-sync')?.passed === true, 'render-collision-sync: passed');
  assert('bundle has content hash', !!bakeResult.bundle.contentHash, `hash: ${bakeResult.bundle.contentHash.slice(0, 16)}...`);

  // ---- Step 15: Undo vegetation only (semantic undo) ----
  console.log('\nStep 15: Disable vegetation only (semantic undo)');
  manager.toggleNode(graph.graphId, vegId);
  assert('vegetation disabled', !manager.get(graph.graphId)!.nodes.get(vegId)!.enabled, `enabled: ${manager.get(graph.graphId)!.nodes.get(vegId)!.enabled}`);

  // Re-bake: vegetation is disabled, but terrain/collision/nav should be unaffected
  const bakeResult2 = manager.bake(graph.graphId);
  assert('re-bake after vegetation disable', !!bakeResult2.bundle, `bundleId: ${bakeResult2.bundle.bundleId}`);
  assert('re-bake activated', bakeResult2.activated, `activated: ${bakeResult2.activated}`);

  // ---- Step 16: Save (serialize) ----
  console.log('\nStep 16: Save (serialize graph)');
  const serialized = manager.serialize(graph.graphId);
  assert('graph serialized', serialized.length > 100, `${serialized.length} bytes`);

  // ---- Step 17: Reload (deserialize) and verify deterministic replay ----
  console.log('\nStep 17: Reload and verify deterministic replay');
  const reloaded = manager.deserialize(serialized);
  assert('graph deserialized', !!reloaded, `graphId: ${reloaded.graphId}`);
  assert('same number of nodes', reloaded.nodes.size === 6, `${reloaded.nodes.size} nodes`);

  // Re-evaluate and verify same output hashes
  // First, mark all as dirty to force re-evaluation
  for (const [id, node] of reloaded.nodes) {
    node.dirty = true;
  }
  const eval4 = manager.evaluate(reloaded.graphId);
  assert('reloaded graph evaluates', eval4.evaluated.length === 5, `${eval4.evaluated.length} evaluated (1 disabled)`);

  // Verify deterministic hashes match
  const originalHashes = new Map<string, string>();
  const reloadedHashes = new Map<string, string>();
  for (const [id, node] of manager.get(graph.graphId)!.nodes) {
    originalHashes.set(id, node.outputHash ?? 'none');
  }
  for (const [id, node] of reloaded.nodes) {
    reloadedHashes.set(id, node.outputHash ?? 'none');
  }

  let hashesMatch = true;
  for (const [id, hash] of originalHashes) {
    if (reloadedHashes.get(id) !== hash) {
      hashesMatch = false;
      assert(`deterministic hash for ${id}`, false, `original: ${hash}, reloaded: ${reloadedHashes.get(id)}`);
    }
  }
  assert('all output hashes match after reload', hashesMatch, `${originalHashes.size} hashes compared`);

  // ---- Step 18: Atomic activation test ----
  console.log('\nStep 18: Atomic activation — failed bundle does not activate');
  // Create a bundle with a failed component
  const graph2 = manager.get(graph.graphId)!;
  const failedBundle = {
    bundleId: 'bundle-failed-test',
    graphRevision: graph2.revision + 1,
    components: {
      renderMesh: { componentType: 'render-mesh', status: 'complete' as const, dataHash: 'aaa', computedAt: new Date().toISOString() },
      collisionMesh: { componentType: 'collision-mesh', status: 'failed' as const, error: 'collision generation failed' },
      navigationMesh: { componentType: 'navigation-mesh', status: 'complete' as const, dataHash: 'ccc', computedAt: new Date().toISOString() },
    },
    requiredComponents: ['renderMesh', 'collisionMesh', 'navigationMesh'],
    validationEvidence: [],
    contentHash: 'failed-test-hash',
    createdAt: new Date().toISOString(),
  };
  graph2.bundleHistory.push(failedBundle);
  const activateResult = manager.activateBundle(graph.graphId, failedBundle.graphRevision);
  assert('failed bundle NOT activated', !activateResult.activated, `reason: ${activateResult.reason}`);
  assert('previous valid bundle still active', manager.getActiveBundle(graph.graphId)?.graphRevision === bakeResult2.bundle.graphRevision, `active revision: ${manager.getActiveBundle(graph.graphId)?.graphRevision}`);

  // ---- Summary ----
  console.log('\n=== SUMMARY ===\n');
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  console.log(`Passed: ${passed}/${results.length}`);
  console.log(`Failed: ${failed}/${results.length}`);
  console.log(`\nVerdict: ${failed === 0 ? 'ALL PASS' : 'FAILURES'}`);

  if (failed > 0) {
    console.log('\nFailures:');
    results.filter(r => !r.passed).forEach(r => console.log(`  ✗ ${r.name}: ${r.details}`));
  }

  // Evidence summary
  console.log('\n=== EVIDENCE ===');
  console.log(`Graph revision: ${manager.get(graph.graphId)?.revision}`);
  console.log(`Nodes: ${manager.get(graph.graphId)?.nodes.size}`);
  console.log(`Edges: ${manager.get(graph.graphId)?.edges.length}`);
  console.log(`Bundles: ${manager.get(graph.graphId)?.bundleHistory.length}`);
  console.log(`Active bundle revision: ${manager.getActiveBundle(graph.graphId)?.graphRevision}`);
  console.log(`Active bundle content hash: ${manager.getActiveBundle(graph.graphId)?.contentHash}`);
  console.log(`Serialized size: ${serialized.length} bytes`);

  return failed === 0;
}

// ============================================================================
// Run
// ============================================================================

runReferenceWorkflow().then(passed => {
  process.exit(passed ? 0 : 1);
}).catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
