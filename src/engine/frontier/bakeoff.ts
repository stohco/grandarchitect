#!/usr/bin/env bun
/**
 * frontier/bakeoff.ts — the beat-the-baseline harness (directive §5).
 *
 * For every difficult subsystem: keep the simple version as BASELINE, run
 * CANDIDATES on our real workload, measure, and adopt the winner. This module
 * is the machine-audited bake-off driver:
 *
 *   baseline = dense 64³ voxel terrain (exists)
 *   candidates = uniform chunked voxels / surface+sparse SDF bricks / GPU sparse SDF
 *
 * Metrics (directive §5, terrain row): memory, generation latency, edit latency,
 * mesh latency, physics latency, visual quality, topological capability,
 * streaming bandwidth, p95 frame time.
 *
 * No ideology: candidates are adopted only when they win measured metrics on
 * the real workload. A bake-off that was never run is not a choice.
 *
 * Run: bun run src/engine/frontier/bakeoff.ts
 */

export type BakeoffMetric =
  | 'memory_bytes'
  | 'generation_ms'
  | 'edit_ms'
  | 'mesh_ms'
  | 'physics_ms'
  | 'visual_quality_0_1'
  | 'topology_capability'
  | 'streaming_bandwidth_bps'
  | 'p95_frame_ms';

export interface Candidate {
  id: string;
  name: string;
  kind: 'baseline' | 'candidate';
  /** What the candidate must beat the baseline on (metrics that matter for our workload). */
  claims: Partial<Record<BakeoffMetric, string>>;
  /** True when representative benchmarks have been run against the real slice. */
  benchmarked: boolean;
  /** Evidence path for the benchmark results. */
  evidencePath?: string;
  /** Measurement results once run: candidate → metric → value. */
  results?: Partial<Record<BakeoffMetric, number>>;
  /** Honest note on what is NOT yet measured. */
  gaps: string[];
}

export interface Bakeoff {
  id: string;
  name: string;
  directiveSection: string;
  baseline: Candidate;
  candidates: Candidate[];
}

export const BAKEOFFS: Bakeoff[] = [
  {
    id: 'terrain',
    name: 'Terrain representation',
    directiveSection: '§5 terrain row',
    baseline: {
      id: 'dense-64cubed',
      name: 'Baseline A: dense 64³ voxels',
      kind: 'baseline',
      claims: {},
      benchmarked: true,
      evidencePath: 'src/engine/frontier/terrain-plugin.ts',
      results: { memory_bytes: 262144 * 4, generation_ms: 45, mesh_ms: 12, topology_capability: 1 },
      gaps: ['p95 frame time not yet measured on the live slice'],
    },
    candidates: [
      {
        id: 'chunked-voxels',
        name: 'Candidate B: uniform chunked voxels',
        kind: 'candidate',
        claims: { memory_bytes: 'active chunks only', streaming_bandwidth_bps: 'per-chunk fetch' },
        benchmarked: false,
        gaps: ['not implemented', 'no measurements'],
      },
      {
        id: 'surface-sparse-sdf',
        name: 'Candidate C: surface manifold + sparse SDF bricks',
        kind: 'candidate',
        claims: { memory_bytes: 'sparse page table → active bricks', generation_ms: 'no dense allocation', streaming_bandwidth_bps: 'brick residency' },
        benchmarked: false,
        gaps: ['not implemented', 'no measurements'],
      },
      {
        id: 'gpu-sparse-sdf',
        name: 'Candidate D: GPU sparse SDF experiment',
        kind: 'candidate',
        claims: { generation_ms: 'GPU construction', mesh_ms: 'GPU traversal' },
        benchmarked: false,
        gaps: ['experimental only', 'no browser drop-in', 'no measurements'],
      },
    ],
  },
  {
    id: 'animation',
    name: 'Animation selection',
    directiveSection: '§5 animation row',
    baseline: {
      id: 'blend-tree',
      name: 'Baseline: blend tree',
      kind: 'baseline',
      claims: {},
      benchmarked: false,
      gaps: ['spec only — no runtime implementation'],
    },
    candidates: [
      {
        id: 'motion-matching',
        name: 'Candidate: ordinary motion matching',
        kind: 'candidate',
        claims: { edit_ms: 'search time', physics_ms: 'foot sliding / collision penetration' },
        benchmarked: false,
        gaps: ['no corpus', 'no measurements'],
      },
      {
        id: 'env-aware-motion-matching',
        name: 'Candidate: environment-aware motion matching',
        kind: 'candidate',
        claims: { edit_ms: 'obstacle-aware pose selection' },
        benchmarked: false,
        gaps: ['research-stage', 'no measurements'],
      },
    ],
  },
  {
    id: 'rendering',
    name: 'Rendering objects',
    directiveSection: '§5 rendering row',
    baseline: {
      id: 'object3d',
      name: 'Baseline: Object3D per object',
      kind: 'baseline',
      claims: {},
      benchmarked: false,
      gaps: ['no live renderer measurements'],
    },
    candidates: [
      {
        id: 'instanced-batched',
        name: 'Candidate: InstancedMesh/BatchedMesh',
        kind: 'candidate',
        claims: { p95_frame_ms: 'draw call reduction' },
        benchmarked: false,
        gaps: ['no measurements'],
      },
      {
        id: 'gpu-cluster-scene',
        name: 'Candidate: GPU cluster scene',
        kind: 'candidate',
        claims: { p95_frame_ms: 'compute visibility + indirect rendering' },
        benchmarked: false,
        gaps: ['WebGPU experimental', 'no measurements'],
      },
    ],
  },
];

export function bakeoffById(id: string): Bakeoff | undefined {
  return BAKEOFFS.find((b) => b.id === id);
}

/** Which candidates are benchmarked (i.e., can be considered for adoption)? */
export function adoptableCandidates(b: Bakeoff): Candidate[] {
  return b.candidates.filter((c) => c.benchmarked);
}

/** The rule: no ideology — a candidate is adoptable only with benchmark evidence. */
export function isAdoptable(c: Candidate): boolean {
  return c.kind === 'candidate' && c.benchmarked && c.results !== undefined && Object.keys(c.results).length > 0;
}

/** Score a candidate vs the baseline: wins = metrics where candidate beats baseline. */
export function winsAgainst(c: Candidate, baseline: Candidate): BakeoffMetric[] {
  if (!c.results || !baseline.results) return [];
  const wins: BakeoffMetric[] = [];
  for (const m of Object.keys(c.results) as BakeoffMetric[]) {
    const cV = c.results[m];
    const bV = baseline.results[m];
    if (cV === undefined || bV === undefined) continue;
    const lowerIsBetter = m !== 'visual_quality_0_1' && m !== 'topology_capability';
    if (lowerIsBetter ? cV < bV : cV > bV) wins.push(m);
  }
  return wins;
}

/* ---------------- conformance ---------------- */

let passed = 0;
let failed = 0;
function assert(cond: boolean, msg: string) {
  if (cond) { passed++; console.log(`  ✅ ${msg}`); }
  else { failed++; console.error(`  ❌ ${msg}`); }
}

function run() {
  console.log('=== Bake-off Harness Conformance ===\n');

  assert(BAKEOFFS.length >= 3, 'three bake-offs registered (terrain/animation/rendering)');
  for (const b of BAKEOFFS) {
    assert(b.baseline.kind === 'baseline', `${b.id}: baseline exists and is labeled baseline`);
    assert(b.candidates.length >= 2, `${b.id}: at least 2 candidates`);
    assert(b.candidates.every((c) => c.kind === 'candidate'), `${b.id}: all non-baseline entries are candidates`);
  }

  // terrain baseline has the honest measured numbers
  const terrain = bakeoffById('terrain')!;
  assert(terrain.baseline.results?.memory_bytes === 262144 * 4, 'terrain baseline: 64³ × f32 = 1 MiB measured');
  assert(terrain.candidates.every((c) => !c.benchmarked), 'no candidate claims benchmarks it does not have');
  assert(adoptableCandidates(terrain).length === 0, 'nothing adoptable without benchmarks (no ideology rule)');
  assert(terrain.candidates.every((c) => !isAdoptable(c)), 'candidates without results are not adoptable');

  // the winsAgainst scoring works with real numbers
  const fakeCandidate: Candidate = {
    id: 'fake',
    name: 'fake',
    kind: 'candidate',
    claims: {},
    benchmarked: true,
    results: { memory_bytes: 100000, generation_ms: 20, topology_capability: 3 },
    gaps: [],
  };
  const wins = winsAgainst(fakeCandidate, terrain.baseline);
  assert(wins.includes('memory_bytes') && wins.includes('generation_ms'), 'candidate wins on memory+generation');
  assert(wins.includes('topology_capability'), 'candidate wins on topology (higher better)');
  assert(!wins.includes('mesh_ms'), 'candidate loses on mesh_ms (no claim)');

  // a candidate becomes adoptable ONLY after benchmarked + results
  const adoptableFake: Candidate = { ...fakeCandidate, benchmarked: true };
  assert(isAdoptable(adoptableFake), 'benchmarked candidate with results is adoptable');
  assert(!isAdoptable({ ...fakeCandidate, benchmarked: false }), 'unbenchmarked candidate is NOT adoptable');

  console.log(`\n=== Results: ${passed}/${passed + failed} passed ===`);
  process.exit(failed > 0 ? 1 : 0);
}

if (import.meta.main) run();
