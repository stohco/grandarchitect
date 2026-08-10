/**
 * frontier/maturity.ts — the frontier maturity ladder (docs/frontier-maturity-directive.md §3).
 *
 * Every frontier subsystem is classified on a 10-stage ladder. A subsystem may claim
 * a stage ONLY with the evidence that stage requires. This module is the machine-audited
 * registry: statuses are data, checked by maturity-conformance.ts, never asserted in prose.
 *
 * Ladder:
 *   RESEARCHED → FEASIBILITY_CONFIRMED → PROTOTYPED → REPRESENTATIVE_BENCHMARKED →
 *   PIPELINE_CONNECTED → REAL_WORLD_SLICE_PROVEN → CROSS_BROWSER_PROVEN →
 *   TARGET_HARDWARE_PROVEN → ADVERSARIALLY_REVIEWED → VALIDATED
 *
 * Rule (directive §2, §20): never call a subsystem frontier because it is custom,
 * complicated, deterministic, AI-generated, or new to the repository. Frontier requires:
 * comparison vs strongest contemporary alternatives, representative scale, measured in
 * the real browser runtime, semantic substance preserved, material quality/capability/
 * scale/performance improvement demonstrated.
 */

export const MATURITY_STAGES = [
  'RESEARCHED',
  'FEASIBILITY_CONFIRMED',
  'PROTOTYPED',
  'REPRESENTATIVE_BENCHMARKED',
  'PIPELINE_CONNECTED',
  'REAL_WORLD_SLICE_PROVEN',
  'CROSS_BROWSER_PROVEN',
  'TARGET_HARDWARE_PROVEN',
  'ADVERSARIALLY_REVIEWED',
  'VALIDATED',
] as const;

export type MaturityStage = (typeof MATURITY_STAGES)[number];

export const STAGE_INDEX: Record<MaturityStage, number> = Object.fromEntries(
  MATURITY_STAGES.map((s, i) => [s, i]),
) as Record<MaturityStage, number>;

/**
 * Fixture class (directive §4): L0 = mathematical/reference fixture,
 * L1 = deterministic engine fixture. Fixtures are honest tests, never frontier claims.
 */
export type FixtureClass = 'L0_MATH_FIXTURE' | 'L1_DETERMINISTIC_FIXTURE' | 'INTERFACE_STUB' | 'NONE';

export interface Evidence {
  /** Where the benchmark/evidence lives (file path, commit, doc section). */
  path: string;
  /** What was measured or demonstrated, verbatim. */
  claim: string;
}

export interface FrontierSubsystem {
  id: string;
  name: string;
  /** Current honest stage. Only raise when the stage's evidence requirements are met. */
  stage: MaturityStage;
  /** The stage's required evidence. Empty array => claim is unsupported (conformance FAIL). */
  evidence: Evidence[];
  /** What remains to reach the next stage. */
  nextSteps: string[];
  /** L0/L1/interface classification when the subsystem is a fixture, else NONE. */
  fixtureClass: FixtureClass;
  /** Proven-capability summary — what this subsystem may claim, no more. */
  provenCapabilities: string[];
  /** Baseline candidate list for the bake-off mandate (directive §5). */
  candidates: string[];
  /** Whether this subsystem may be labeled "frontier" in docs/UI. */
  frontierEligible: boolean;
}

const E = (path: string, claim: string): Evidence => ({ path, claim });

/**
 * The frontier registry — honest classifications as of 2026-08-10 (directive §4).
 *
 * The existing src/engine/frontier machinery is L0/L1 fixtures: useful deterministic
 * reference tests, NOT frontier technology. Each entry's stage is deliberately low:
 * raising it requires the evidence listed, verified by maturity-conformance.ts.
 */
export const FRONTIER_SUBSYSTEMS: FrontierSubsystem[] = [
  {
    id: 'terrain-density-field',
    name: 'Terrain: dense 64³ density field + FBM + Catmull-Rom tunnel',
    stage: 'PROTOTYPED',
    evidence: [
      E('src/engine/frontier/terrain-plugin.ts', '64×64×64 dense density field, 4-octave FBM, one 14 m radial mountain, one Catmull-Rom tunnel; marching-cubes mesh + Rapier heightfield derived from the same field'),
      E('src/engine/frontier/terrain-conformance-test.ts', 'determinism, field sanity, mesh validity, heightmap/mesh exact match, walk-through, Rapier heightfield runtime — all pass'),
    ],
    nextSteps: [
      'Bake-off: uniform chunked voxels vs surface+sparse SDF bricks vs GPU sparse SDF (directive §5)',
      'Benchmark memory/generation/edit/mesh/physics latency, visual quality, topology, bandwidth, p95 frame time on the real slice',
      'Replace dense 64³ allocation with sparse page table → active bricks → hierarchical traversal (directive §11)',
      'Streaming: screen-space error + predicted trajectory + horizon + bandwidth/VRAM residency planner (not fixed radius)',
    ],
    fixtureClass: 'L1_DETERMINISTIC_FIXTURE',
    provenCapabilities: [
      'Basic SDF-ish terrain generation is deterministic and testable',
      'Render mesh and collision heightfield agree exactly (maxDiff 0)',
      'A simple tunnel can be carved through a density field',
    ],
    candidates: ['uniform chunked voxels', 'surface + sparse SDF bricks', 'GPU sparse SDF experiment'],
    frontierEligible: false,
  },
  {
    id: 'bvh',
    name: 'Collision acceleration: median-split binary BVH',
    stage: 'PROTOTYPED',
    evidence: [
      E('src/engine/frontier/bvh.ts', 'binary BVH, median-split on longest centroid axis, SoA Float64Array storage, stack-based ray traversal, capsule-vs-mesh query with inflated-AABB culling'),
      E('src/engine/frontier/collision-fixtures.ts', 'flat floor, step, slope, wall, corner fixtures pass'),
    ],
    nextSteps: [
      'Bake-off vs SAH static BVH, LBVH/refit for dynamic, three-mesh-bvh (GPU/WebGPU data) on real terrain meshes',
      'Benchmark build time, traversal time, memory on 50k–100k tri terrain + dynamic revision bundles',
    ],
    fixtureClass: 'L1_DETERMINISTIC_FIXTURE',
    provenCapabilities: [
      'Basic deterministic geometric queries (ray/capsule vs triangle mesh) work',
      'Median-split BVH is a correct baseline for small static meshes',
    ],
    candidates: ['SAH BVH', 'LBVH/refit/cluster hierarchies', 'three-mesh-bvh GPU data'],
    frontierEligible: false,
  },
  {
    id: 'character-controller',
    name: 'Character controller: discrete substep capsule',
    stage: 'PROTOTYPED',
    evidence: [
      E('src/engine/frontier/character-controller.ts', 'capsule-vs-triangle + discrete substep movement (8 samples at max 60 m/s); "sweep" is explicitly discrete overlap sampling, not analytic TOI'),
      E('src/engine/frontier/collision-fixtures.ts', 'basic capsule response fixtures pass'),
    ],
    nextSteps: [
      'Bake-off vs Rapier KCC and Jolt CharacterVirtual (move-and-slide, autostep, slopes, moving platforms) on the real terrain slice',
      'Custom controller must beat the proven backend on measured metrics to justify existence',
      'Add true shape casts / continuous collision for cultivator velocities > 60 m/s and thin geometry',
    ],
    fixtureClass: 'L1_DETERMINISTIC_FIXTURE',
    provenCapabilities: [
      'Basic capsule response can be tested deterministically',
      'Discrete substep movement works at low speeds on flat/step/slope/wall/corner fixtures',
    ],
    candidates: ['Rapier KCC', 'Jolt CharacterVirtual'],
    frontierEligible: false,
  },
  {
    id: 'collision-fixtures',
    name: 'Collision fixtures: flat/step/slope/wall/corner',
    stage: 'PROTOTYPED',
    evidence: [
      E('src/engine/frontier/collision-fixtures.ts', 'five L0 mathematical fixtures (flat floor, step, slope, wall, corner) pass deterministically'),
    ],
    nextSteps: [
      'Extend to terrain slice fixtures (tunnel walk, slope descent, pit fall) once terrain bake-off lands',
    ],
    fixtureClass: 'L0_MATH_FIXTURE',
    provenCapabilities: ['Reference collision math is correct and deterministic'],
    candidates: [],
    frontierEligible: false,
  },
  {
    id: 'reference-plugins',
    name: 'Reference plugins (ga:renderer, ga:physics, terrain, animation, etc.)',
    stage: 'PROTOTYPED',
    evidence: [
      E('src/engine/plugins/reference/*', 'interfaces + headless stubs implemented; conformance assertions pass against stubs'),
    ],
    nextSteps: [
      'Separate implementation maturity from runtime evidence: stubs are interface-conformance fixtures, not completed subsystems',
      'Implement each capability against a real backend (Three renderer, Rapier physics, real terrain meshing, real animation) and re-run conformance',
    ],
    fixtureClass: 'INTERFACE_STUB',
    provenCapabilities: ['Interfaces are conformance-testable; stub behavior is deterministic'],
    candidates: [],
    frontierEligible: false,
  },
  {
    id: 'terrain-navigation',
    name: 'Navigation: ground + flight',
    stage: 'RESEARCHED',
    evidence: [
      E('engine-architecture/22_NAVIGATION_MOVEMENT.md', 'tiled Recast-style grounded nav documented; 3D voxel A* flight (2 m cells, 2–200 m altitude) documented'),
    ],
    nextSteps: [
      'Keep tiled navmesh as strong production baseline; add capability fields, dynamic local constraints, hierarchical route graph',
      'Replace dense 3D flight voxel A* with: planetary/cosmic route → regional flight route → local 3D corridor → continuous trajectory (position/velocity/acceleration/turn rate/capability envelope/law constraints)',
    ],
    fixtureClass: 'NONE',
    provenCapabilities: ['Tiled grounded nav is a proven production baseline (Recast)'],
    candidates: ['tiled navmesh + capability fields', 'hierarchical airspace graph + clearance corridors + continuous local planner'],
    frontierEligible: false,
  },
  {
    id: 'simulation-tiering',
    name: 'Simulation tiering (S0–S4)',
    stage: 'RESEARCHED',
    evidence: [
      E('engine-architecture/25_SIMULATION_TIERING_RELEVANCE.md', 'tier system documented; conserved tier transitions'),
    ],
    nextSteps: [
      'Rewrite S0 semantics: frozen → HISTORICAL (large-step/event-driven evolution; every tier advances time)',
      'Rewrite relevance: no O(N) per-tick entity scan — hierarchical spatial index, interest frontier, event subscriptions, dirty sets, calendar wakes',
    ],
    fixtureClass: 'NONE',
    provenCapabilities: ['Tiered fidelity with conserved promotion/demotion is a sound concept'],
    candidates: [],
    frontierEligible: false,
  },
  {
    id: 'npc-cognition',
    name: 'NPC cognition',
    stage: 'PROTOTYPED',
    evidence: [
      E('src/engine/frontier/npc-cognition.ts', 'belief graph (believes/heard/suspects with confidence, disagreements), episodic memory (semantic episodes, salience decay with high-stakes floor, rehearsal), BDI (desires → intents via utility arbitration), emotional appraisal, theory of mind (knows-that, bluff detection), dialogue acts, xianxia social ledger (face/debt/oath/grudge), compositional surface realizer — 18/18 conformance'),
      E('docs/frontier-maturity-directive.md §14', 'symbolic cognitive architecture specified: perception → beliefs → appraisal → BDI → ToM → social practice → HTN/GOAP → utility → semantic acts → surface realizer → embodied performance; LLMs as compiler, not runtime'),
      E('engine-architecture/26_NPC_COGNITION_BEHAVIOR.md §22', 'forward architecture section adopted into the cognition bible'),
    ],
    nextSteps: [
      'Prototype social-practice engine (Versu/CiF style) over the xianxia ledger',
      'Prototype HTN/GOAP hierarchical planner (breakthrough decomposition, replanning on theft)',
      'Compositional language renderer over semantic acts; storylets; embodied performance state',
      'Gossip propagation with mutation (reputation as emergent information network)',
    ],
    fixtureClass: 'NONE',
    provenCapabilities: ['Direction specified and prototype core implemented (beliefs/memory/BDI/ToM/acts/social ledger)'],
    candidates: ['BDI + HTN/GOAP + utility arbitration', 'PlaMo-style scene planner (authoring/research provider only)'],
    frontierEligible: false,
  },
  {
    id: 'substance-regression',
    name: 'Substance regression harness (directive §6)',
    stage: 'PROTOTYPED',
    evidence: [
      E('src/engine/frontier/substance-regression.ts', 'semantic fingerprint (10 dimensions: entities, causal history, ecology, interactions, terrain capability, formations, animation possibilities, materials, AI choices, history); isSemanticallyIdentical + semanticDeltas + reportOptimization; 9/9 conformance'),
    ],
    nextSteps: [
      'Wire into optimization workflow: every perf PR must produce a substance-regression report',
      'Integrate with the frontier registry so stage promotions require a passed substance report',
    ],
    fixtureClass: 'NONE',
    provenCapabilities: ['Detects semantic regressions (deleted NPCs, frozen ecology, dropped history, matter removal)'],
    candidates: [],
    frontierEligible: false,
  },
  {
    id: 'genesis-dag',
    name: 'Genesis Pass DAG (directive §15)',
    stage: 'PROTOTYPED',
    evidence: [
      E('src/engine/frontier/genesis-dag.ts', 'dependency-resolved pass DAG: topological execution, applicability closure with scope routing, cacheable outputs (content hashes), dirty propagation (roof change reruns only dressing→director→vision, not ecology/geology); 19/19 conformance'),
    ],
    nextSteps: [
      'Replace flat "80 passes" execution with the DAG as the canonical generation loop',
      'Wire scene-universe-slice compilation as the DAG entry point',
    ],
    fixtureClass: 'NONE',
    provenCapabilities: ['Dirty propagation and cache semantics proven: identical request = full cache hit; scoped changes rerun only affected branches'],
    candidates: [],
    frontierEligible: false,
  },
  {
    id: 'bakeoff-harness',
    name: 'Bake-off harness (directive §5, beat-the-baseline)',
    stage: 'PROTOTYPED',
    evidence: [
      E('src/engine/frontier/bakeoff.ts', 'three bake-offs registered (terrain/animation/rendering); baseline vs candidates; measured results vs claims; adoptable only with benchmark evidence; winsAgainst scoring (lower-is-better aware); 19/19 conformance'),
    ],
    nextSteps: [
      'Implement Candidate B (uniform chunked voxels) and benchmark vs the 64³ baseline on the real slice',
      'Implement Candidate C (surface manifold + sparse SDF bricks) — the directive terrain target',
      'Run animation + rendering bake-offs once runtimes exist',
    ],
    fixtureClass: 'NONE',
    provenCapabilities: ['Adoption gate enforced: no candidate is adoptable without benchmark evidence'],
    candidates: [],
    frontierEligible: false,
  },
  {
    id: 'streaming-planner',
    name: 'Streaming planner (directive §5 streaming row)',
    stage: 'PROTOTYPED',
    evidence: [
      E('src/engine/frontier/streaming.ts', 'screen-space-error tile refinement with horizon culling, velocity-predicted traversal, memory + bandwidth + per-frame fetch budgets; hierarchical tile tree; 6/6 conformance'),
    ],
    nextSteps: [
      'Connect to the terrain bake-off winner (chunked voxels / sparse SDF bricks)',
      'Add occlusion (HZB) and expected-interaction inputs to the planner',
    ],
    fixtureClass: 'NONE',
    provenCapabilities: ['SSE-driven refinement (not distance), horizon culling, budget-respecting residency decisions'],
    candidates: [],
    frontierEligible: false,
  },
  {
    id: 'npc-planner',
    name: 'NPC hierarchical planner (HTN/GOAP, directive §14 layer 3)',
    stage: 'PROTOTYPED',
    evidence: [
      E('src/engine/frontier/hierarchical-planner.ts', 'compound tasks with methods + preconditions; goal-directed chaining; replan on blocked predicate (pill stolen → re-obtain via mission/borrow/hunt); deterministic; 13/13 conformance'),
    ],
    nextSteps: [
      'Connect to npc-cognition BDI: desires → planner goals',
      'Route method choice by personality (borrow vs rob vs give-up temporarily)',
    ],
    fixtureClass: 'NONE',
    provenCapabilities: ['Intention decomposes into a plan; plan replans on theft/impossibility; personality context routes alternatives'],
    candidates: [],
    frontierEligible: false,
  },
  {
    id: 'social-practices',
    name: 'Social-practice engine (Versu/CiF, directive §14 layer 5)',
    stage: 'PROTOTYPED',
    evidence: [
      E('src/engine/frontier/social-practices.ts', 'authored reusable situations (trespass/toast) over the xianxia ledger; overlapping practices; debt/audience/seniority drive action selection; ledger effects (face/debt/grudge); 8/8 conformance'),
    ],
    nextSteps: [
      'Author the full practice corpus (bargaining, disciplining, debt invocation, Dao debate, auction bidding...) via the compiler',
      'Wire practice resolution → dialogue-act renderer in npc-cognition',
    ],
    fixtureClass: 'NONE',
    provenCapabilities: ['Reusable situations supply actions; same situation + different ledger → different resolution; determinism'],
    candidates: [],
    frontierEligible: false,
  },
  {
    id: 'sparse-volume',
    name: 'Sparse volume field (world fabric, directive §11)',
    stage: 'PROTOTYPED',
    evidence: [
      E('src/engine/frontier/sparse-volume.ts', 'sparse page table → active 8³ bricks with SDF/material/dirty channels; surface manifold as free baseline; carve allocates only affected bricks (0.8% of dense 64³); queryBox finds topology deltas; dirty brick list; 14/14 conformance'),
    ],
    nextSteps: [
      'Bake off vs dense 64³ baseline on the real terrain slice (directive §5)',
      'Promote cave/tunnel abode topology into bricks; connect to the terrain mesh bundle',
    ],
    fixtureClass: 'NONE',
    provenCapabilities: ['Sparse topology storage: caves/tunnels/destruction without dense allocation; material-preserving cut faces'],
    candidates: ['uniform chunked voxels', 'surface + sparse SDF bricks (this)', 'GPU sparse SDF experiment'],
    frontierEligible: false,
  },
  {
    id: 'workload-budgets',
    name: 'Workload-derived budgets (directive §18)',
    stage: 'PROTOTYPED',
    evidence: [
      E('src/engine/frontier/workload-budgets.ts', 'budget = frame budget / measured per-entity cost × component mix; idle vs fighting NPCs differ at same headcount; cheaper cost raises affordable population (no hard cap); levers never suggest demote/suspend; 8/8 conformance'),
    ],
    nextSteps: [
      'Feed measured per-entity costs from the real slice (currently doc-39 estimates)',
      'Replace the 200/500/2000 headcount table in doc 39 with this derivation',
    ],
    fixtureClass: 'NONE',
    provenCapabilities: ['Budgets derive from measured workload, not hard headcounts; optimizations raise capacity'],
    candidates: [],
    frontierEligible: false,
  },
  {
    id: 'animation',
    name: 'Animation (clips/blend trees/IK)',
    stage: 'RESEARCHED',
    evidence: [
      E('engine-architecture/17_ANIMATION_FRAMEWORK_RETARGETING.md', 'semantic clips, state graph, blend trees, additives, masks, root motion, warping, IK, retargeting documented; canonical state now semantic (semanticActionId+phase+rootTrajectory+contacts+events) with bone pose as derived presentation (directive §13)'),
    ],
    nextSteps: [
      'Add Motion Corpus + Pose Search / environment-aware Motion Matching (UE Pose Search as reference)',
      'Distant animation: pose caches, shared phases, GPU skinning, compressed motion blocks',
    ],
    fixtureClass: 'NONE',
    provenCapabilities: ['Conventional 2010s animation framework is specified; semantic canonical state adopted'],
    candidates: ['blend tree (baseline)', 'motion matching', 'environment-aware motion matching'],
    frontierEligible: false,
  },
  {
    id: 'rendering',
    name: 'Rendering (Three backend)',
    stage: 'PROTOTYPED',
    evidence: [
      E('engine-architecture/13_RENDERER_ABSTRACTION.md', 'Simulation → Presentation → RenderBackend abstraction documented'),
      E('engine-architecture/14_THREEJS_WEBGPU_WEBGL_INTEGRATION.md', 'Three WebGPU/WebGL integration documented; three version pinned ^0.185.1 in package.json (doc says 0.185.0 — provenance drift to fix)'),
    ],
    nextSteps: [
      'Fix version discipline: generated dependency manifest + CI-enforced exact compatibility policy (directive: package and docs currently disagree)',
      'Feature-test WebGPU backend with measured WebGL2 fallback; benchmark both (Three itself still labels WebGPURenderer experimental)',
      'Move toward GPU scene database + compute visibility + indirect rendering; meshoptimizer meshlet/cluster data; honest: no WebGPU mesh shaders',
    ],
    fixtureClass: 'NONE',
    provenCapabilities: ['Render-backend abstraction is sound; Three adapter renders'],
    candidates: ['Object3D (baseline)', 'InstancedMesh/BatchedMesh', 'GPU cluster scene'],
    frontierEligible: false,
  },
];

/** Lookup by id. */
export function subsystemById(id: string): FrontierSubsystem | undefined {
  return FRONTIER_SUBSYSTEMS.find((s) => s.id === id);
}

/**
 * Can this subsystem be labeled "frontier"? Per directive §2/§20:
 * requires ≥ REPRESENTATIVE_BENCHMARKED, evidence at that stage, not a fixture/stub,
 * and a documented material improvement over the baseline.
 */
export function frontierEligible(s: FrontierSubsystem): boolean {
  if (s.fixtureClass !== 'NONE') return false;
  if (STAGE_INDEX[s.stage] < STAGE_INDEX.REPRESENTATIVE_BENCHMARKED) return false;
  if (s.evidence.length === 0) return false;
  return s.frontierEligible;
}

/** The banner rule: what the current frontier engine may claim (directive §4). */
export const FIXTURE_CLAIMS: Record<string, string> = {
  terrain: 'basic SDF-ish terrain generation is deterministic and testable',
  bvh: 'basic deterministic geometric queries work on small static meshes',
  controller: 'basic capsule response can be tested deterministically',
  fixtures: 'reference collision math is correct and deterministic',
  plugins: 'interfaces are conformance-testable; stubs are not completed subsystems',
};

export const DIRECTIVE_PATH = 'docs/frontier-maturity-directive.md';
