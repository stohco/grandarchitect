/**
 * Frontier Technique Registry — seed data
 *
 * Initial set of frontier techniques to evaluate. Each has a formal record
 * with source references, principles, maturity, license, feasibility,
 * benchmarks, and adoption decision.
 *
 * These are CANDIDATE records — not approved for production until they
 * pass the full pipeline.
 */

import type { FrontierTechniqueRecord, CapabilityMatrix, CapabilityMatrixEntry } from './types';

// ============================================================================
// Seed techniques (15 candidates across 10 categories)
// ============================================================================

export const SEED_TECHNIQUES: FrontierTechniqueRecord[] = [
  {
    id: 'gpu-instance-culling',
    name: 'GPU-Driven Instance Culling',
    category: 'rendering',
    problemSolved: 'Moving "what should be drawn?" from thousands of JS object operations to compact data-oriented buffers and GPU processing',
    observedSources: [
      { type: 'engine-feature', title: 'Unreal Engine 5 Nanite visibility', author: 'Epic Games' },
      { type: 'repository', title: 'PlayCanvas WebGPU Gaussian-splat renderer', url: 'https://playcanvas.com' },
    ],
    underlyingPrinciples: [
      'Frustum culling on GPU compute',
      'Distance/LOD selection on GPU',
      'Occlusion culling via depth pyramid',
      'Instance compaction via atomic operations',
      'Indirect draw preparation',
    ],
    maturity: 'prototype',
    licenseAssessment: { license: 'engine-internal', compatible: true, notes: 'Reimplemented from principle, no external dependency' },
    browserFeasibility: { browserFeasible: true, webgpuRequired: true, webgl2Fallback: 'reduced', notes: 'WebGPU compute required for GPU culling; WebGL2 falls back to CPU culling' },
    webgpuRequirements: [
      { feature: 'compute-shader', required: true, fallback: 'CPU culling on main thread or worker' },
      { feature: 'storage-buffer', required: true, fallback: 'Standard buffer with readback' },
      { feature: 'indirect-draw', required: true, fallback: 'Direct draw calls (higher CPU cost)' },
    ],
    expectedBenefits: [
      { metric: 'draw-calls', expected: 'reduced 80-90% for vegetation', confidence: 'high' },
      { metric: 'cpu-frame-ms', expected: '< 1ms for 10k instances', confidence: 'high' },
    ],
    expectedCosts: [
      { metric: 'gpu-memory', expected: '+2-4MB for culling buffers', confidence: 'high' },
      { metric: 'shader-compilation', expected: '+200ms first-frame', confidence: 'medium' },
    ],
    knownLimitations: [
      'No WebGL2 compute support — falls back to CPU',
      'Indirect draw not available in all WebGPU implementations',
      'Requires cross-origin isolation for SharedArrayBuffer fast path',
    ],
    integrationStrategy: 'independent-reimplementation',
    benchmarks: [],
    visualEvidence: [],
    decisionStatus: 'prototyping',
    qualityModes: [
      { name: 'ultra', description: 'Full GPU culling + indirect draw', gpuRequired: true, estimatedCost: '< 1ms GPU' },
      { name: 'high', description: 'GPU culling, direct draw', gpuRequired: true, estimatedCost: '< 2ms GPU' },
      { name: 'medium', description: 'Worker-thread CPU culling', gpuRequired: false, estimatedCost: '< 3ms CPU' },
      { name: 'low', description: 'Main-thread CPU culling, reduced distance', gpuRequired: false, estimatedCost: '< 2ms CPU' },
      { name: 'fallback', description: 'No culling, draw all objects', gpuRequired: false, estimatedCost: 'baseline' },
    ],
    applicableSystems: ['renderer', 'vegetation', 'particles', 'distant-buildings', 'sword-formations'],
    createdAt: '2026-08-05T00:00:00Z',
  },
  {
    id: 'sdf-live-sculpting',
    name: 'SDF Live Sculpting (Unbound-inspired)',
    category: 'terrain',
    problemSolved: 'Terrain edits remain non-destructive operations that can be reordered and changed while the game is running',
    observedSources: [
      { type: 'documentation', title: 'Unbound Engine documentation', author: 'Unbound' },
      { type: 'paper', title: 'Euclidean Distance Transform', author: 'Various' },
    ],
    underlyingPrinciples: [
      'Signed distance fields as non-destructive operation stacks',
      'Addition, subtraction, blending, painting as graph nodes',
      'Runtime mesh extraction from SDF',
      'Edit while running — no rebuild required',
    ],
    maturity: 'prototype',
    licenseAssessment: { license: 'engine-internal', compatible: true, notes: 'Concept inspired by Unbound, reimplemented independently' },
    browserFeasibility: { browserFeasible: true, webgpuRequired: false, webgl2Fallback: 'full', notes: 'SDF evaluation works on CPU; WebGPU compute accelerates but not required' },
    webgpuRequirements: [
      { feature: 'compute-shader', required: false, fallback: 'CPU SDF evaluation in worker' },
    ],
    expectedBenefits: [
      { metric: 'edit-flexibility', expected: 'reorderable, disableable, undoable operations', confidence: 'high' },
      { metric: 'terrain-revision', expected: 'no mesh rebuild on edit', confidence: 'high' },
    ],
    expectedCosts: [
      { metric: 'cpu-frame-ms', expected: '2-5ms for SDF meshing', confidence: 'medium' },
    ],
    knownLimitations: [
      'High-resolution SDFs are memory-intensive',
      'Mesh extraction quality depends on voxel resolution',
    ],
    integrationStrategy: 'independent-reimplementation',
    benchmarks: [],
    visualEvidence: [],
    decisionStatus: 'prototyping',
    applicableSystems: ['terrain', 'editor', 'architect-editing'],
    createdAt: '2026-08-05T00:00:00Z',
  },
  {
    id: 'meshlet-virtualized-geometry',
    name: 'Meshlet/Cluster Virtualized Geometry (Nanite-inspired)',
    category: 'geometry',
    problemSolved: 'Virtualized geometry that selects detail level dynamically based on screen-space error',
    observedSources: [
      { type: 'engine-feature', title: 'Unreal Engine 5 Nanite', author: 'Epic Games' },
    ],
    underlyingPrinciples: [
      'Mesh preprocessing into hierarchical triangle clusters',
      'Per-cluster bounds and screen-space error',
      'Dynamic cluster selection',
      'Cluster-level culling',
      'Progressive streaming',
    ],
    maturity: 'research',
    licenseAssessment: { license: 'engine-internal', compatible: true, notes: 'Principles studied, not copying UE5 code' },
    browserFeasibility: { browserFeasible: true, webgpuRequired: true, webgl2Fallback: 'reduced', notes: 'WebGPU needed for GPU cluster selection; WebGL2 uses traditional LODs' },
    webgpuRequirements: [
      { feature: 'compute-shader', required: true, fallback: 'CPU cluster selection (slower)' },
      { feature: 'storage-buffer', required: true, fallback: 'Standard buffer' },
      { feature: 'indirect-draw', required: true, fallback: 'Direct draw' },
    ],
    expectedBenefits: [
      { metric: 'triangle-density', expected: 'millions of triangles at stable framerate', confidence: 'low' },
      { metric: 'memory', expected: 'streamed clusters reduce peak memory', confidence: 'medium' },
    ],
    expectedCosts: [
      { metric: 'preprocessing', expected: 'significant mesh preprocessing time', confidence: 'high' },
      { metric: 'gpu-memory', expected: 'cluster metadata overhead', confidence: 'medium' },
    ],
    knownLimitations: [
      'Web GPU compute not universally available',
      'Animated meshes remain a separate problem',
      'Preprocessing pipeline is complex',
    ],
    integrationStrategy: 'independent-reimplementation',
    benchmarks: [],
    visualEvidence: [],
    decisionStatus: 'researching',
    applicableSystems: ['mountains', 'statues', 'sect-complexes', 'ruins', 'celestial-structures'],
    createdAt: '2026-08-05T00:00:00Z',
  },
  {
    id: 'world-partition-streaming',
    name: 'Hierarchical World Partition & Streaming',
    category: 'streaming',
    problemSolved: 'Automatic loading/unloading of world cells based on streaming sources for enormous worlds',
    observedSources: [
      { type: 'engine-feature', title: 'Unreal Engine 5 World Partition', author: 'Epic Games' },
      { type: 'documentation', title: 'Cesium 3D Tiles', author: 'Cesium' },
    ],
    underlyingPrinciples: [
      'Grid-based world division',
      'Streaming sources (player, camera, preview, teleport destination)',
      'HLOD generation for distant regions',
      'Multiple load tiers (summary, strategic, proxy, HLOD, full, physics+AI, editable)',
      'Persistent identity across load/unload',
    ],
    maturity: 'prototype',
    licenseAssessment: { license: 'engine-internal', compatible: true, notes: 'Architecture inspired by UE5 + Cesium, independently implemented' },
    browserFeasibility: { browserFeasible: true, webgpuRequired: false, webgl2Fallback: 'full', notes: 'Streaming is backend-agnostic' },
    webgpuRequirements: [],
    expectedBenefits: [
      { metric: 'world-size', expected: 'unlimited world size with finite memory', confidence: 'high' },
      { metric: 'load-time', expected: 'progressive loading under device budget', confidence: 'high' },
    ],
    expectedCosts: [
      { metric: 'complexity', expected: 'significant system complexity', confidence: 'high' },
    ],
    knownLimitations: [
      'Cross-cell interactions need special handling',
      'Navigation across cell boundaries is complex',
    ],
    integrationStrategy: 'native-plugin',
    benchmarks: [],
    visualEvidence: [],
    decisionStatus: 'prototyping',
    applicableSystems: ['world-streaming', 'spatial-partitioning', 'navigation', 'physics'],
    createdAt: '2026-08-05T00:00:00Z',
  },
  {
    id: 'virtual-shadow-pages',
    name: 'Virtual Shadow Maps (Page-based)',
    category: 'rendering',
    problemSolved: 'High-resolution shadows for large scenes without a single giant shadow map',
    observedSources: [
      { type: 'engine-feature', title: 'Unreal Engine 5 Virtual Shadow Maps', author: 'Epic Games' },
    ],
    underlyingPrinciples: [
      'Tiled shadow pages',
      'Allocate only needed pages',
      'Cache pages between frames unless invalidated',
      'Resolution based on screen importance',
      'Separate budgets for nearby and distant shadows',
    ],
    maturity: 'research',
    licenseAssessment: { license: 'engine-internal', compatible: true, notes: 'Principles studied, not copying UE5 code' },
    browserFeasibility: { browserFeasible: true, webgpuRequired: true, webgl2Fallback: 'none', notes: 'Requires WebGPU for page management; WebGL2 uses cascaded shadow maps' },
    webgpuRequirements: [
      { feature: 'storage-texture', required: true, fallback: 'Cascaded shadow maps' },
    ],
    expectedBenefits: [
      { metric: 'shadow-quality', expected: 'consistent high-res shadows everywhere', confidence: 'medium' },
    ],
    expectedCosts: [
      { metric: 'gpu-memory', expected: 'page pool overhead', confidence: 'medium' },
    ],
    knownLimitations: ['Complex implementation', 'WebGL2 has no equivalent'],
    integrationStrategy: 'independent-reimplementation',
    benchmarks: [],
    visualEvidence: [],
    decisionStatus: 'researching',
    applicableSystems: ['renderer', 'shadows', 'lighting'],
    createdAt: '2026-08-05T00:00:00Z',
  },
  {
    id: 'compute-particles',
    name: 'WebGPU Compute Particles',
    category: 'rendering',
    problemSolved: 'GPU-based particle simulation for rain, snow, qi motes, embers, debris without CPU bottleneck',
    observedSources: [
      { type: 'repository', title: 'Three.js WebGPU compute particles example', author: 'Three.js' },
      { type: 'repository', title: 'Babylon.js compute particles', author: 'Babylon.js' },
    ],
    underlyingPrinciples: [
      'Compute shader particle update',
      'Storage buffer for particle data',
      'Indirect draw for rendering',
      'No CPU readback for simulation',
    ],
    maturity: 'experimental',
    licenseAssessment: { license: 'MIT', compatible: true, notes: 'Three.js MIT license, fully compatible' },
    browserFeasibility: { browserFeasible: true, webgpuRequired: true, webgl2Fallback: 'reduced', notes: 'WebGPU compute for simulation; WebGL2 falls back to CPU particles' },
    webgpuRequirements: [
      { feature: 'compute-shader', required: true, fallback: 'CPU particle update in worker' },
      { feature: 'storage-buffer', required: true, fallback: 'Standard buffer' },
    ],
    expectedBenefits: [
      { metric: 'particle-count', expected: '100k+ particles at 60fps', confidence: 'high' },
      { metric: 'cpu-frame-ms', expected: '< 0.5ms (GPU does all work)', confidence: 'high' },
    ],
    expectedCosts: [
      { metric: 'gpu-frame-ms', expected: '1-2ms for 100k particles', confidence: 'medium' },
    ],
    knownLimitations: ['Gameplay-critical particles need CPU authority for determinism'],
    integrationStrategy: 'external-adapter',
    benchmarks: [],
    visualEvidence: [],
    decisionStatus: 'accepted',
    qualityModes: [
      { name: 'ultra', description: '100k GPU particles', gpuRequired: true, estimatedCost: '2ms GPU' },
      { name: 'high', description: '50k GPU particles', gpuRequired: true, estimatedCost: '1ms GPU' },
      { name: 'medium', description: '10k CPU particles in worker', gpuRequired: false, estimatedCost: '1ms CPU' },
      { name: 'low', description: '2k CPU particles main thread', gpuRequired: false, estimatedCost: '0.5ms CPU' },
      { name: 'fallback', description: 'No particles', gpuRequired: false, estimatedCost: '0ms' },
    ],
    applicableSystems: ['weather', 'qi-effects', 'combat-vfx', 'ambient'],
    createdAt: '2026-08-05T00:00:00Z',
  },
  {
    id: 'data-oriented-simulation',
    name: 'Data-Oriented Entity Simulation',
    category: 'simulation',
    problemSolved: 'Large-scale systems without a heavyweight scene object for every simulated element',
    observedSources: [
      { type: 'engine-feature', title: 'Unity Entities (ECS)', author: 'Unity' },
      { type: 'engine-feature', title: 'Unreal MassEntity', author: 'Epic Games' },
      { type: 'engine-feature', title: 'Godot Servers', author: 'Godot' },
    ],
    underlyingPrinciples: [
      'Packed component storage (SoA)',
      'Relevance/tier processors',
      'Distant entities are data, not Object3Ds',
      'Only nearby/inspected entities get full presentation',
    ],
    maturity: 'prototype',
    licenseAssessment: { license: 'engine-internal', compatible: true, notes: 'Architecture inspired by ECS principles, independently implemented' },
    browserFeasibility: { browserFeasible: true, webgpuRequired: false, webgl2Fallback: 'full', notes: 'Pure CPU architecture' },
    webgpuRequirements: [],
    expectedBenefits: [
      { metric: 'entity-count', expected: '10k+ simulated entities', confidence: 'high' },
      { metric: 'memory', expected: 'cache-friendly data layout', confidence: 'high' },
    ],
    expectedCosts: [],
    knownLimitations: ['Paradigm shift from traditional scene graph'],
    integrationStrategy: 'native-plugin',
    benchmarks: [],
    visualEvidence: [],
    decisionStatus: 'prototyping',
    applicableSystems: ['npc-simulation', 'cultivation', 'economy', 'ecology', 'history'],
    createdAt: '2026-08-05T00:00:00Z',
  },
  {
    id: 'motion-matching',
    name: 'Motion Matching Animation',
    category: 'animation',
    problemSolved: 'Natural character movement by selecting poses from animation database rather than fixed state machines',
    observedSources: [
      { type: 'engine-feature', title: 'Unreal Engine 5 Motion Matching', author: 'Epic Games' },
      { type: 'paper', title: 'Motion Matching (Clavet 2016)', author: 'Daniel Holden' },
    ],
    underlyingPrinciples: [
      'Animation database with pose metadata',
      'Runtime query for best-matching clip',
      'Motion warping to target',
      'Foot IK and terrain adaptation',
      'Upper/lower body layers',
    ],
    maturity: 'research',
    licenseAssessment: { license: 'engine-internal', compatible: true, notes: 'Principles from paper, independently implemented' },
    browserFeasibility: { browserFeasible: true, webgpuRequired: false, webgl2Fallback: 'full', notes: 'CPU algorithm' },
    webgpuRequirements: [],
    expectedBenefits: [
      { metric: 'animation-quality', expected: 'natural movement without state machine complexity', confidence: 'medium' },
    ],
    expectedCosts: [
      { metric: 'memory', expected: 'animation database size', confidence: 'high' },
    ],
    knownLimitations: ['Requires quality animation data', 'Initial setup is complex'],
    integrationStrategy: 'independent-reimplementation',
    benchmarks: [],
    visualEvidence: [],
    decisionStatus: 'researching',
    applicableSystems: ['animation', 'character-movement', 'combat'],
    createdAt: '2026-08-05T00:00:00Z',
  },
  {
    id: 'gaussian-splat-hybrid',
    name: 'Gaussian Splat Hybrid Rendering',
    category: 'rendering',
    problemSolved: 'Fast rendering of scanned/captured environments with hybrid proxy meshes for gameplay',
    observedSources: [
      { type: 'repository', title: 'PlayCanvas WebGPU Gaussian-splat', author: 'PlayCanvas' },
      { type: 'paper', title: '3D Gaussian Splatting for Real-Time Radiance Field Rendering', author: 'Kerbl et al.' },
    ],
    underlyingPrinciples: [
      'Gaussian splats for visual representation',
      'Proxy depth mesh for collision',
      'Explicit collision mesh',
      'Semantic scene metadata',
      'GPU sorting and streaming',
    ],
    maturity: 'research',
    licenseAssessment: { license: 'research', compatible: true, notes: 'Research paper, reimplemented from principle' },
    browserFeasibility: { browserFeasible: true, webgpuRequired: true, webgl2Fallback: 'none', notes: 'WebGPU needed for splat rendering; no WebGL2 equivalent' },
    webgpuRequirements: [
      { feature: 'compute-shader', required: true, fallback: 'Not feasible without WebGPU' },
      { feature: 'storage-buffer', required: true, fallback: 'Not feasible' },
    ],
    expectedBenefits: [
      { metric: 'visual-quality', expected: 'photorealistic scanned environments', confidence: 'medium' },
    ],
    expectedCosts: [
      { metric: 'gpu-memory', expected: 'large splat datasets', confidence: 'high' },
    ],
    knownLimitations: ['Not authoritative for collision', 'Not for animated characters', 'No WebGL2 fallback'],
    integrationStrategy: 'independent-reimplementation',
    benchmarks: [],
    visualEvidence: [],
    decisionStatus: 'researching',
    applicableSystems: ['scanned-references', 'distant-scenery', 'concept-visualization'],
    createdAt: '2026-08-05T00:00:00Z',
  },
  {
    id: 'clustered-lighting',
    name: 'Clustered Forward+ Lighting',
    category: 'rendering',
    problemSolved: 'Many dynamic lights without performance collapse by clustering lights in view space',
    observedSources: [
      { type: 'paper', title: 'Clustered Shading (Olsson et al.)', author: 'Olsson' },
      { type: 'engine-feature', title: 'Various engine implementations', author: 'Multiple' },
    ],
    underlyingPrinciples: [
      'View-space light clustering',
      'Per-cluster light list',
      'Frustum-aligned clusters',
      'Compute shader light assignment',
    ],
    maturity: 'prototype',
    licenseAssessment: { license: 'engine-internal', compatible: true, notes: 'Standard technique, independently implemented' },
    browserFeasibility: { browserFeasible: true, webgpuRequired: true, webgl2Fallback: 'reduced', notes: 'WebGPU for compute light assignment; WebGL2 uses traditional forward rendering' },
    webgpuRequirements: [
      { feature: 'compute-shader', required: true, fallback: 'CPU light assignment (limited lights)' },
    ],
    expectedBenefits: [
      { metric: 'light-count', expected: '100+ dynamic lights', confidence: 'high' },
    ],
    expectedCosts: [],
    knownLimitations: ['WebGL2 limited to fewer lights'],
    integrationStrategy: 'independent-reimplementation',
    benchmarks: [],
    visualEvidence: [],
    decisionStatus: 'prototyping',
    applicableSystems: ['renderer', 'lighting'],
    createdAt: '2026-08-05T00:00:00Z',
  },
  {
    id: 'worker-wasm-simulation',
    name: 'Web Worker + WASM Simulation Pipeline',
    category: 'simulation',
    problemSolved: 'Main thread cannot own rendering, simulation, pathfinding, generation, meshing, and AI simultaneously',
    observedSources: [
      { type: 'documentation', title: 'Web Workers API', author: 'MDN' },
      { type: 'documentation', title: 'SharedArrayBuffer', author: 'MDN' },
    ],
    underlyingPrinciples: [
      'Main thread: input, UI, presentation',
      'Simulation workers: NPCs, factions, economy',
      'Terrain workers: meshing, colliders',
      'Asset workers: processing, compression',
      'SharedArrayBuffer for fast path',
      'Transferable ArrayBuffers for fallback',
    ],
    maturity: 'experimental',
    licenseAssessment: { license: 'engine-internal', compatible: true, notes: 'Standard web APIs' },
    browserFeasibility: { browserFeasible: true, webgpuRequired: false, webgl2Fallback: 'full', notes: 'Workers work everywhere; SharedArrayBuffer requires cross-origin isolation' },
    webgpuRequirements: [],
    expectedBenefits: [
      { metric: 'main-thread-blocking', expected: '< 2ms main thread', confidence: 'high' },
    ],
    expectedCosts: [],
    knownLimitations: ['SharedArrayBuffer requires COOP/COEP headers', 'Worker startup latency'],
    integrationStrategy: 'native-plugin',
    benchmarks: [],
    visualEvidence: [],
    decisionStatus: 'accepted',
    applicableSystems: ['simulation', 'terrain', 'asset-processing', 'ai', 'persistence'],
    createdAt: '2026-08-05T00:00:00Z',
  },
  {
    id: 'gltf-ktx2-streaming',
    name: 'Progressive glTF/KTX2 Asset Streaming',
    category: 'asset-authoring',
    problemSolved: 'Efficient asset delivery with compressed geometry and textures across device tiers',
    observedSources: [
      { type: 'documentation', title: 'glTF 2.0 Specification', author: 'Khronos' },
      { type: 'documentation', title: 'KHR_texture_basisu extension', author: 'Khronos' },
    ],
    underlyingPrinciples: [
      'glTF/GLB as primary interchange format',
      'Meshopt or Draco geometry compression',
      'KTX2/Basis Universal texture compression',
      'Progressive LOD streaming',
      'Content-addressed asset storage',
    ],
    maturity: 'production-proven',
    licenseAssessment: { license: 'MIT/Khronos', compatible: true, notes: 'Open standards, fully compatible' },
    browserFeasibility: { browserFeasible: true, webgpuRequired: false, webgl2Fallback: 'full', notes: 'Works on all backends' },
    webgpuRequirements: [],
    expectedBenefits: [
      { metric: 'download-size', expected: '70-90% texture compression', confidence: 'high' },
      { metric: 'gpu-memory', expected: 'transcoded format saves memory', confidence: 'high' },
    ],
    expectedCosts: [],
    knownLimitations: [],
    integrationStrategy: 'native-plugin',
    benchmarks: [],
    visualEvidence: [],
    decisionStatus: 'accepted',
    applicableSystems: ['asset-pipeline', 'streaming'],
    createdAt: '2026-08-05T00:00:00Z',
  },
  {
    id: 'gpu-erosion',
    name: 'GPU Hydraulic Erosion Simulation',
    category: 'terrain',
    problemSolved: 'Realistic terrain erosion patterns for mountains, valleys, and river systems',
    observedSources: [
      { type: 'repository', title: 'Babylon.js compute erosion', author: 'Babylon.js' },
      { type: 'paper', title: 'Hydraulic Erosion (Mei et al.)', author: 'Xing Mei' },
    ],
    underlyingPrinciples: [
      'Compute shader particle-based water flow',
      'Sediment transport and deposition',
      'Heightmap modification',
    ],
    maturity: 'research',
    licenseAssessment: { license: 'engine-internal', compatible: true, notes: 'Algorithm from paper, independently implemented' },
    browserFeasibility: { browserFeasible: true, webgpuRequired: true, webgl2Fallback: 'none', notes: 'WebGPU compute required; WebGL2 has no equivalent' },
    webgpuRequirements: [
      { feature: 'compute-shader', required: true, fallback: 'CPU erosion (slow, offline only)' },
    ],
    expectedBenefits: [
      { metric: 'terrain-realism', expected: 'natural erosion patterns', confidence: 'medium' },
    ],
    expectedCosts: [
      { metric: 'gpu-time', expected: 'seconds to minutes for full erosion', confidence: 'high' },
    ],
    knownLimitations: ['Offline process, not real-time', 'No WebGL2 fallback'],
    integrationStrategy: 'independent-reimplementation',
    benchmarks: [],
    visualEvidence: [],
    decisionStatus: 'researching',
    applicableSystems: ['terrain-generation', 'editor'],
    createdAt: '2026-08-05T00:00:00Z',
  },
  {
    id: 'editable-operation-graph',
    name: 'Editable Operation Graph (Non-destructive)',
    category: 'editor',
    problemSolved: 'Preserve editable construction history rather than only a final mesh — Unbound-inspired',
    observedSources: [
      { type: 'documentation', title: 'Unbound Engine SDF operation stacks', author: 'Unbound' },
    ],
    underlyingPrinciples: [
      'Operations are selectable, reorderable, parameterized',
      'Each operation is previewable, disableable, undoable',
      'Attributable to user or AI',
      'Procedurally regenerable',
      'Runtime bakes to optimized meshes; editor retains source graph',
    ],
    maturity: 'prototype',
    licenseAssessment: { license: 'engine-internal', compatible: true, notes: 'Concept inspired by Unbound, independently implemented' },
    browserFeasibility: { browserFeasible: true, webgpuRequired: false, webgl2Fallback: 'full', notes: 'Pure data structure' },
    webgpuRequirements: [],
    expectedBenefits: [
      { metric: 'edit-flexibility', expected: 'non-destructive editing for all generated content', confidence: 'high' },
    ],
    expectedCosts: [],
    knownLimitations: ['Graph complexity can grow large for complex scenes'],
    integrationStrategy: 'native-plugin',
    benchmarks: [],
    visualEvidence: [],
    decisionStatus: 'accepted',
    applicableSystems: ['terrain', 'structures', 'characters', 'settlements', 'technique-effects'],
    createdAt: '2026-08-05T00:00:00Z',
  },
  {
    id: 'temporal-aa',
    name: 'Temporal Anti-Aliasing (TAA)',
    category: 'rendering',
    problemSolved: 'Smooth edges and stable image without MSAA performance cost',
    observedSources: [
      { type: 'engine-feature', title: 'Standard TAA implementation', author: 'Various' },
    ],
    underlyingPrinciples: [
      'Jittered projection matrix',
      'Temporal accumulation',
      'Reprojection from previous frame',
      'Ghosting mitigation',
    ],
    maturity: 'production-proven',
    licenseAssessment: { license: 'engine-internal', compatible: true, notes: 'Standard technique' },
    browserFeasibility: { browserFeasible: true, webgpuRequired: false, webgl2Fallback: 'full', notes: 'Works on all backends' },
    webgpuRequirements: [],
    expectedBenefits: [
      { metric: 'image-quality', expected: 'smooth edges, stable image', confidence: 'high' },
    ],
    expectedCosts: [
      { metric: 'gpu-frame-ms', expected: '+0.5-1ms', confidence: 'high' },
    ],
    knownLimitations: ['Ghosting on fast motion', 'Requires motion vectors'],
    integrationStrategy: 'native-plugin',
    benchmarks: [],
    visualEvidence: [],
    decisionStatus: 'accepted',
    applicableSystems: ['renderer', 'post-processing'],
    createdAt: '2026-08-05T00:00:00Z',
  },
  {
    id: 'modlens-structured-vision',
    name: 'ModLens — Structured Visual Evidence Adapter',
    category: 'editor',
    problemSolved: 'Converts images into structured JSON evidence (OCR, layout, semantics) for text-only LLMs and as a schema-normalized visual evidence provider',
    observedSources: [
      { type: 'repository', title: 'liustack/modlens', url: 'https://github.com/liustack/modlens', author: 'liustack', license: 'MIT' },
    ],
    underlyingPrinciples: [
      'Provider-swappable vision adapter (Antigravity CLI, Gemini API, OpenAI-compatible, Anthropic, Claude CLI)',
      'Schema-normalized visual evidence: OCR, layout regions, reading order, entities, relations, uncertainty',
      'Intentionally avoids model-generated bounding boxes and confidence scores (fabrication risk)',
      'Read-only observation — does not modify engine state',
    ],
    maturity: 'prototype',
    licenseAssessment: {
      license: 'MIT (code) + personal-learning disclaimer (README) + Google account terms (Antigravity provider)',
      compatible: false,
      notes: 'MIT code license is compatible. BUT: (1) README says "personal learning and experimentation only"; (2) Antigravity default provider uses --dangerously-skip-permissions; (3) Google account terms and quota apply. Needs legal/operational review before commercial or distributed use.',
    },
    browserFeasibility: {
      browserFeasible: false,
      webgpuRequired: false,
      webgl2Fallback: 'none',
      notes: 'ModLens is a CLI tool, not browser-runnable. Would need a server-side adapter. Antigravity CLI must be installed separately.',
    },
    webgpuRequirements: [],
    expectedBenefits: [
      { metric: 'ocr-accuracy', expected: 'structured text extraction with reading order and language detection', confidence: 'medium' },
      { metric: 'layout-analysis', expected: 'region detection with types and reading order', confidence: 'medium' },
      { metric: 'evidence-schema', expected: 'normalized JSON contract for visual evidence', confidence: 'high' },
    ],
    expectedCosts: [
      { metric: 'latency', expected: '15-40s (Antigravity), 5-10s (Gemini API), few seconds (Anthropic)', confidence: 'medium' },
      { metric: 'dependency', expected: 'requires Antigravity CLI or API key for chosen provider', confidence: 'high' },
    ],
    knownLimitations: [
      'No pixel-accurate bounding boxes or confidence scores (intentionally removed — models fabricate them)',
      'Not suitable for exact target grounding (use engine object-ID buffers instead)',
      'Default Antigravity provider uses --dangerously-skip-permissions (security risk)',
      'README says "personal learning and experimentation only" — not commercial-ready',
      'CLI tool, not browser-runnable',
      'Must be sandboxed if used as an Architect tool',
    ],
    integrationStrategy: 'external-adapter',
    benchmarks: [],
    visualEvidence: [],
    decisionStatus: 'researching',
    qualityModes: [
      { name: 'ultra', description: 'Gemini 3.1 Pro (dense screenshots)', gpuRequired: false, estimatedCost: '10-30s' },
      { name: 'high', description: 'Gemini 3.6 Flash (default)', gpuRequired: false, estimatedCost: '5-15s' },
      { name: 'medium', description: 'Anthropic provider', gpuRequired: false, estimatedCost: 'few seconds' },
      { name: 'low', description: 'OpenAI-compatible endpoint', gpuRequired: false, estimatedCost: 'provider-dependent' },
      { name: 'fallback', description: 'Native VLM with structured prompt (no ModLens)', gpuRequired: false, estimatedCost: '3-10s' },
    ],
    applicableSystems: ['visual-evidence-fabric', 'visual-accuracy-oracle', 'bible-reference-ingestion', 'screenshot-analysis', 'ci-visual-reports'],
    createdAt: '2026-08-05T00:00:00Z',
  },
  // -------------------------------------------------------------------------
  // Unified 3D Asset Intelligence — Hunyuan3D-Buffalo
  // Paper: arXiv:2608.02711 (submitted Aug 3, 2026)
  // -------------------------------------------------------------------------
  {
    id: 'unified-3d-asset-intelligence',
    name: 'Unified 3D Asset Intelligence (Hunyuan3D-Buffalo)',
    category: 'ai-asset-authoring',
    problemSolved: '3D understanding, generation, localized editing, and semantic part extraction should share one representation rather than being separate capabilities',
    observedSources: [
      { type: 'paper', title: 'Hunyuan3D-Buffalo: Unified 3D Understanding, Generation, Editing and Part Extraction', author: 'Tencent Hunyuan Team', url: 'https://arxiv.org/abs/2608.02711' },
    ],
    underlyingPrinciples: [
      'Shared VLM encodes colored point cloud (position+normals path + RGB path) into 512 tokens',
      'VLM hidden states condition a diffusion transformer (DiT) initialized from Hunyuan3D-2.1',
      'For editing: original object representation provided directly to DiT alongside VLM conditioning',
      'Nano3D-v2 data pipeline: 8 canonical views → VLM selects best → 2D image edit → 3D difference mask → learned planner predicts edit box → protected-region restoration',
      'Semantic part discovery: object-specific part vocabulary, multi-view highlighted renders, macro-part merging',
      'Post-edit re-description: VLM compares source/result and describes actual change (not trusting original prompt)',
      'Training corpus: ~25M understanding samples, ~50M text-to-3D pairs, ~12M editing/part pairs',
      'Key empirical claim: stronger generation improves editing; stronger understanding improves editing',
    ],
    maturity: 'research',
    licenseAssessment: {
      license: 'unknown',
      compatible: false,
      notes: 'Paper submitted Aug 3 2026. No public model checkpoints, no inference code, no license disclosure. Official GitHub repo contains only static project website.',
    },
    browserFeasibility: {
      browserFeasible: false,
      notes: 'Paper does not disclose parameter count, VRAM, inference time, or GPU requirements. Almost certainly requires remote GPU. Not deployable in browser.',
    },
    benchmarks: [
      { metric: 'Chamfer distance (3D-VLM edit variant)', value: '0.0091', source: 'paper' },
      { metric: 'Chamfer distance (Omni123 baseline)', value: '0.0684', source: 'paper' },
      { metric: 'Human preference (text alignment)', value: '~55-57%', source: '100-prompt study' },
      { metric: 'Human preference (geometry quality)', value: '~55-57%', source: '100-prompt study' },
    ],
    decisionStatus: 'researching',
    integrationPlan: 'Editor and asset-processor only. Provider plugin implements Unified3DProvider interface. Produces CANDIDATE assets — never authoritative. Human approval required before commit. Stage 1: provider-neutral interfaces + mock. Stage 2: real adapter when inference available. Stage 3: processing pipeline. Stage 4: Grand Architect tool integration. Stage 5: UnboundLoop orchestration.',
    runtimeAuthority: 'none',
    currentBlocker: 'No demonstrated public inference implementation. No VRAM/latency/GPU requirements disclosed. No model checkpoints published. Cannot benchmark against production requirements (topology, rigging, UVs, collision, LODs).',
    paperRef: 'arXiv:2608.02711',
  },
  // -------------------------------------------------------------------------
  // Blended Hexagonal Terrain Anti-Tiling
  // Paper: JCGT vol 11, no 3 — "Practical Real-Time Hex-Tiling" (2022)
  // -------------------------------------------------------------------------
  {
    id: 'blended-hex-terrain-anti-tiling',
    name: 'Blended Hexagonal Terrain Anti-Tiling',
    category: 'rendering',
    problemSolved: 'Repetitive terrain material textures without requiring unique textures or blocky voxel aesthetics. Enables realistic xianxia terrain with controlled texture budgets.',
    observedSources: [
      { type: 'paper', title: 'Practical Real-Time Hex-Tiling (JCGT 2022)', author: 'Stefan Petersen', url: 'https://jcgt.org/published/0011/03/05/paper.pdf' },
      { type: 'demo', title: 'three-hex-tiling (Three.js implementation)', url: 'https://github.com' },
      { type: 'community', title: 'Elementbound hex tiling thread (Godot)', author: 'Elementbound' },
    ],
    underlyingPrinciples: [
      'World/UV space divided into hexagonal cells (triangular grid internally)',
      'Deterministic random value per cell (hash of material ID + seed + cell coords)',
      'Random texture rotation per cell (fixes axial repetition of square grids)',
      'Full blended version: sample 3 neighboring hex cells, blend with modified weights',
      'Explicit texture gradients (textureGrad) fix mip-selection discontinuity at cell boundaries',
      'Contrast-aware blending avoids washed-out results',
      'Surface-gradient framework for normal maps: convert to surface gradient, rotate, blend, reconstruct (not linear RGB blend)',
      'Triplanar projection + hex tiling: 3 projections × 3 hex samples = 9-18 texture samples per material',
      'Distance-based quality fallback: hex near, ordinary triplanar far',
    ],
    maturity: 'prototype',
    licenseAssessment: {
      license: 'mit-compatible',
      compatible: true,
      notes: 'JCGT papers are open-access. Reference implementations exist under MIT. Technique is algorithmic — reimplement from principle.',
    },
    browserFeasibility: {
      browserFeasible: true,
      webgpuRequired: false,
      webgl2Fallback: 'full',
      notes: 'WebGL2: textureGrad available, full implementation possible. WebGPU: textureSampleGrad. Cost: 9-18 samples per material (manageable with distance fallback).',
    },
    webgpuRequirements: [
      { feature: 'textureSampleGrad', required: false, fallback: 'WebGL2 textureGrad (GLSL)' },
    ],
    benchmarks: [
      { metric: 'Texture samples per material (hex albedo)', value: '9', source: 'tri-planar × 3 hex' },
      { metric: 'Texture samples per material (hex albedo + normal)', value: '18', source: 'tri-planar × 3 hex × 2' },
      { metric: 'GTX 1070 feasibility', value: 'yes with distance fallback', source: 'analysis' },
    ],
    decisionStatus: 'accepted',
    integrationPlan: 'Terrain material system plugin. Runtime face: GLSL/WebGL2 + WGSL/WebGPU shaders. Editor face: material preview, hex debug view, weight painting. Asset processor: validate normal maps, build texture arrays. Architect face: inspect repetition, benchmark variants, propose settings. Distance-based quality: legacy (hex albedo near only), mainstream (hex albedo+normal near), ultra (full hex+height).',
    runtimeAuthority: 'validated',
    currentBlocker: undefined,
    paperRef: 'JCGT vol 11 no 3 (2022)',
  },
  // -------------------------------------------------------------------------
  // Recursive Language Model (RLM) Agent — Prime Agent
  // Repo: https://github.com/PrimeIntellect-ai/prime-agent
  // -------------------------------------------------------------------------
  {
    id: 'recursive-language-model-agent',
    name: 'Recursive Language Model (RLM) Agent — Prime Agent',
    category: 'ai-architecture',
    problemSolved: 'Self-improving AI agent architecture: treats context as variables (prompt-as-a-variable), tools as recursive subagent function calls, and applies evidence-backed harness refinements for recursive self-improvement',
    observedSources: [
      { type: 'repository', title: 'Prime Agent — Self-Improving RLM Agent', author: 'PrimeIntellect-ai', url: 'https://github.com/PrimeIntellect-ai/prime-agent' },
      { type: 'paper', title: 'Continual Harness (arXiv:2605.09998)', author: 'PrimeIntellect', url: 'https://arxiv.org/abs/2605.09998' },
      { type: 'blog', title: 'Recursive Language Models', author: 'PrimeIntellect', url: 'https://www.primeintellect.ai/blog/rlm' },
    ],
    underlyingPrinciples: [
      'Persistent IPython kernel as the model\'s only built-in tool — file ops, shell, skills all happen through code',
      'rlm() spawns real child agents for parallel/background work — returns immediately with handle, results via messages',
      'Continual Harness: /refine reviews trajectory, applies evidence-backed updates to supplemental prompts/memories/skills/subagent-specs',
      'NEVER rewrites immutable base system prompt — only supplemental state',
      'Recorded snapshots support rollback of harness refinements',
      'Skills are importable Python packages (superset of instruction-only skills)',
      'Direct agent-to-agent communication (agent_message) — no routing through user',
      'Persistent goals survive across turns until completed/paused/cleared',
      'Daemon-backed: sessions keep running when terminal disconnects, reattach later',
      'Heartbeats and schedules re-enter session periodically',
      'Bounded autonomous mode with turn/token/time budgets + quality gates',
      'Automatic compaction summarizes older context while preserving kernel state',
    ],
    maturity: 'research',
    licenseAssessment: {
      license: 'mit',
      compatible: true,
      notes: 'Prime Agent is MIT-licensed. However, it is a Python CLI tool, not a browser library. Cannot run in Next.js/browser directly.',
    },
    browserFeasibility: {
      browserFeasible: false,
      notes: 'Prime Agent requires Python runtime + IPython kernel. Cannot run in browser. Would need a server-side adapter communicating via JSON/RPC mode. The RLM CONCEPTS are immediately adoptable in our architecture even without the Python runtime.',
    },
    benchmarks: [],
    decisionStatus: 'researching',
    integrationPlan: 'Provider-neutral RLMProvider interface (like Unified3DProvider for 3D). Prime Agent is one possible adapter — others could include custom RLM runtimes. The RLM concepts map directly to Grand Architect/UnboundLoop: rlm() → recursive delegation, Continual Harness /refine → self-improvement with rollback, Skills → plugin capabilities, agent_message → architect tool communication, persistent goals → long-running objectives. Stage 1: interfaces + mock (DONE). Stage 2: server-side adapter wrapping prime-agent CLI. Stage 3: JSON/RPC mode integration. Stage 4: UnboundLoop orchestration with recursive delegation. Stage 5: self-improvement loop with evidence-backed refinement.',
    runtimeAuthority: 'none',
    currentBlocker: 'Prime Agent is a Python CLI tool requiring IPython kernel — cannot run in browser/Next.js. Need server-side adapter with JSON/RPC mode. The RLM concepts are architecturally adopted (interfaces created) but not runtime-integrated.',
    paperRef: 'arXiv:2605.09998 (Continual Harness)',
  },
  // -------------------------------------------------------------------------
  // FiberLab — Code-Driven Three.js Experiment Laboratory
  // Reference: FiberToy (https://github.com/NabilNYMansour/fibertoy)
  // -------------------------------------------------------------------------
  {
    id: 'fiberlab-experiment-laboratory',
    name: 'FiberLab — Code-Driven Three.js Experiment Laboratory',
    category: 'ai-architecture',
    problemSolved: 'Grand Architect needs a fast scratchpad where visual ideas become executable images instead of speculative code. Isolated sandbox for R3F experiments before promoting into production capabilities.',
    observedSources: [
      { type: 'repository', title: 'FiberToy — R3F Scene Builder', author: 'NabilNYMansour', url: 'https://github.com/NabilNYMansour/fibertoy' },
    ],
    underlyingPrinciples: [
      'Sandboxed iframe with allow-scripts (no same-origin)',
      'Live code editor (CodeMirror) + react-live evaluation',
      'R3F/Drei/Leva/Zustand scope for experiments',
      'SceneCapsule: save, fork, view, template, thumbnail model',
      'postMessage protocol between parent and sandbox',
      'Budget enforcement: frame time, draw calls, triangles, memory',
      'Capture: color, depth, normal, object-ID, wireframe, performance',
      'Promotion pipeline: experiment → review → extract → contract → integrate → test → promote',
      'FiberLab is NOT authoritative Studio — experimental code only',
      'SceneCapsule maturity: draft → running → visually-reviewed → benchmark-passed → promotion-candidate → promoted/rejected',
    ],
    maturity: 'prototype',
    licenseAssessment: {
      license: 'mit',
      compatible: true,
      notes: 'FiberToy is MIT-licensed. We borrow concepts (iframe sandbox, scene save/fork, capture) rather than importing the whole social hub.',
    },
    browserFeasibility: {
      browserFeasible: true,
      notes: 'Sandboxed iframe with R3F works in Chromium and Firefox. Security hardening needed: dedicated origin, CSP, no network, AST validation, heartbeat, timeout, budget enforcement.',
    },
    benchmarks: [],
    decisionStatus: 'accepted',
    integrationPlan: 'FiberLab under Diagnostics/Frontier. SceneCapsule type for experiments. Prototype tools (create/run/stop/capture/fork/compare/benchmark/promote/reject) registered in UI Action Registry. Promotion pipeline: experiment → security review → extract implementation → provider-neutral contract → conformance tests → browser verification → production. First reference: hex terrain anti-tiling shader experiment → promote to Terrain Material System.',
    runtimeAuthority: 'none',
    currentBlocker: undefined,
    paperRef: 'FiberToy repository (MIT)',
  },
  {
    id: 'prime-agent-provider',
    name: 'Prime Agent — RLM Harness Provider',
    category: 'agent',
    problemSolved: 'A persistent, self-improving recursive-language-model harness (persistent IPython, rlm() child agents, Continual Harness /refine, persistent goals, autonomous budgets) as the Grand Architect authorial runtime',
    observedSources: [
      { type: 'repository', title: 'PrimeIntellect-ai/prime-agent', url: 'https://github.com/PrimeIntellect-ai/prime-agent', author: 'Prime Intellect', license: 'MIT', revision: '10fb172b9298b353b27cddf3cd44bf386c9ba5d0' },
      { type: 'documentation', title: 'Prime Agent JSON/RPC mode docs', url: 'https://github.com/PrimeIntellect-ai/prime-agent/tree/main/packages/coding-agent/docs', author: 'Prime Intellect' },
    ],
    underlyingPrinciples: [
      'RLM: prompt-as-a-variable inside a persistent REPL; recursive subagents as programmatic tool calls',
      'Continual Harness: evidence-backed refinement with rollback (never rewrites the immutable base prompt)',
      'JSONL RPC over stdin/stdout with strict LF framing and id-correlated responses',
    ],
    maturity: 'exercised',
    licenseAssessment: { license: 'MIT', compatible: true, notes: 'MIT — fully open source; model providers are external subscriptions (separate licenses)' },
    browserFeasibility: { browserFeasible: false, webgpuRequired: false, webgl2Fallback: 'none', notes: 'Server-side sidecar only; the browser never talks to it directly' },
    integrationStrategy: 'isolated-native-sidecar',
    runtimeAuthority: 'none',
    currentBlocker: 'Prompting blocked until a model is configured in the sidecar (prime-agent /login). Windows: CLI binary not distributed via install.sh (macOS/Linux); in-process @earendil-works/pi-coding-agent is the Windows path once credentials exist.',
    benchmarks: [],
    visualEvidence: [],
    decisionStatus: 'prototyping',
    applicableSystems: ['architect', 'authorial', 'rlm'],
    createdAt: '2026-08-07T00:00:00Z',
  },
];

// ============================================================================
// Capability Matrix — what's available on each backend/profile
// ============================================================================

export const CAPABILITY_MATRIX: CapabilityMatrix = {
  generatedAt: '2026-08-05T00:00:00Z',
  entries: [
    {
      capabilityId: 'gpu-instance-culling',
      capabilityName: 'GPU Instance Culling',
      category: 'rendering',
      byBackend: { webgpu: 'experimental', webgl2: 'unavailable', headless: 'unavailable' },
      byProfile: { 'legacy-desktop': 'experimental', 'mainstream-desktop': 'experimental', 'high-end-desktop': 'experimental', 'integrated-graphics': 'unavailable', 'mobile-tablet': 'unavailable', 'webgl2-fallback': 'unavailable' },
      fallbackStrategy: 'CPU culling in worker thread',
      notes: 'Requires WebGPU compute + indirect draw',
    },
    {
      capabilityId: 'sdf-live-sculpting',
      capabilityName: 'SDF Live Sculpting',
      category: 'terrain',
      byBackend: { webgpu: 'experimental', webgl2: 'native', headless: 'native' },
      byProfile: { 'legacy-desktop': 'native', 'mainstream-desktop': 'native', 'high-end-desktop': 'native', 'integrated-graphics': 'native', 'mobile-tablet': 'emulated', 'webgl2-fallback': 'native' },
      fallbackStrategy: 'CPU SDF evaluation in worker',
      notes: 'WebGPU accelerates meshing; CPU works everywhere',
    },
    {
      capabilityId: 'meshlet-virtualized-geometry',
      capabilityName: 'Meshlet Virtualized Geometry',
      category: 'geometry',
      byBackend: { webgpu: 'unavailable', webgl2: 'unavailable', headless: 'unavailable' },
      byProfile: { 'legacy-desktop': 'unavailable', 'mainstream-desktop': 'unavailable', 'high-end-desktop': 'unavailable', 'integrated-graphics': 'unavailable', 'mobile-tablet': 'unavailable', 'webgl2-fallback': 'unavailable' },
      fallbackStrategy: 'Traditional LOD system',
      notes: 'Research stage — not yet prototyped',
    },
    {
      capabilityId: 'compute-particles',
      capabilityName: 'GPU Compute Particles',
      category: 'rendering',
      byBackend: { webgpu: 'native', webgl2: 'emulated', headless: 'unavailable' },
      byProfile: { 'legacy-desktop': 'native', 'mainstream-desktop': 'native', 'high-end-desktop': 'native', 'integrated-graphics': 'emulated', 'mobile-tablet': 'emulated', 'webgl2-fallback': 'emulated' },
      fallbackStrategy: 'CPU particles in worker',
      notes: 'WebGPU compute; WebGL2 falls back to CPU',
    },
    {
      capabilityId: 'clustered-lighting',
      capabilityName: 'Clustered Forward+ Lighting',
      category: 'rendering',
      byBackend: { webgpu: 'experimental', webgl2: 'unavailable', headless: 'unavailable' },
      byProfile: { 'legacy-desktop': 'experimental', 'mainstream-desktop': 'experimental', 'high-end-desktop': 'experimental', 'integrated-graphics': 'unavailable', 'mobile-tablet': 'unavailable', 'webgl2-fallback': 'unavailable' },
      fallbackStrategy: 'Traditional forward rendering (limited lights)',
      notes: 'WebGPU compute for light assignment',
    },
    {
      capabilityId: 'gaussian-splat-hybrid',
      capabilityName: 'Gaussian Splat Rendering',
      category: 'rendering',
      byBackend: { webgpu: 'unavailable', webgl2: 'unavailable', headless: 'unavailable' },
      byProfile: { 'legacy-desktop': 'unavailable', 'mainstream-desktop': 'unavailable', 'high-end-desktop': 'unavailable', 'integrated-graphics': 'unavailable', 'mobile-tablet': 'unavailable', 'webgl2-fallback': 'unavailable' },
      fallbackStrategy: 'No equivalent — use mesh rendering',
      notes: 'Research stage — no WebGL2 fallback possible',
    },
    {
      capabilityId: 'worker-wasm-simulation',
      capabilityName: 'Worker/WASM Simulation',
      category: 'simulation',
      byBackend: { webgpu: 'native', webgl2: 'native', headless: 'native' },
      byProfile: { 'legacy-desktop': 'native', 'mainstream-desktop': 'native', 'high-end-desktop': 'native', 'integrated-graphics': 'native', 'mobile-tablet': 'native', 'webgl2-fallback': 'native' },
      fallbackStrategy: 'Message passing (no SharedArrayBuffer)',
      notes: 'SharedArrayBuffer requires COOP/COEP',
    },
    {
      capabilityId: 'gltf-ktx2-streaming',
      capabilityName: 'glTF/KTX2 Asset Streaming',
      category: 'asset-authoring',
      byBackend: { webgpu: 'native', webgl2: 'native', headless: 'native' },
      byProfile: { 'legacy-desktop': 'native', 'mainstream-desktop': 'native', 'high-end-desktop': 'native', 'integrated-graphics': 'native', 'mobile-tablet': 'native', 'webgl2-fallback': 'native' },
      fallbackStrategy: 'Uncompressed assets (larger download)',
      notes: 'Production-proven, works everywhere',
    },
    {
      capabilityId: 'editable-operation-graph',
      capabilityName: 'Editable Operation Graph',
      category: 'editor',
      byBackend: { webgpu: 'native', webgl2: 'native', headless: 'native' },
      byProfile: { 'legacy-desktop': 'native', 'mainstream-desktop': 'native', 'high-end-desktop': 'native', 'integrated-graphics': 'native', 'mobile-tablet': 'native', 'webgl2-fallback': 'native' },
      fallbackStrategy: 'N/A — pure data structure',
      notes: 'Non-destructive editing foundation',
    },
    {
      capabilityId: 'temporal-aa',
      capabilityName: 'Temporal Anti-Aliasing',
      category: 'rendering',
      byBackend: { webgpu: 'native', webgl2: 'native', headless: 'unavailable' },
      byProfile: { 'legacy-desktop': 'native', 'mainstream-desktop': 'native', 'high-end-desktop': 'native', 'integrated-graphics': 'native', 'mobile-tablet': 'emulated', 'webgl2-fallback': 'native' },
      fallbackStrategy: 'FXAA (cheaper, lower quality)',
      notes: 'Standard technique',
    },
  ],
};

// ============================================================================
// Helpers
// ============================================================================

export function getTechniquesByCategory(techniques: FrontierTechniqueRecord[], category: string): FrontierTechniqueRecord[] {
  return techniques.filter(t => t.category === category);
}

export function getTechniquesByDecision(techniques: FrontierTechniqueRecord[], status: string): FrontierTechniqueRecord[] {
  return techniques.filter(t => t.decisionStatus === status);
}

export function getAcceptedTechniques(techniques: FrontierTechniqueRecord[]): FrontierTechniqueRecord[] {
  return techniques.filter(t => t.decisionStatus === 'accepted');
}

export function getTechniquesWithoutWebGLFallback(techniques: FrontierTechniqueRecord[]): FrontierTechniqueRecord[] {
  return techniques.filter(t => t.browserFeasibility.webgl2Fallback === 'none');
}
