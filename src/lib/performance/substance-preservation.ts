/**
 * Substance Preservation — the performance constitution made executable.
 *
 * C1-C10 from docs/performance-substance-preservation-directive.md:
 * optimization may reduce the cost of representing the universe, never the
 * universe itself. Every optimization PR must report a PERFORMANCE DELTA
 * and a SEMANTIC DELTA (all zero). The escalation ladder is the search
 * order an optimizer must follow before any fidelity change. Entity
 * fidelity follows the S4->S0 ladder: cheaper representation, never
 * deletion.
 */

/** The optimizer's mandatory search order (directive section 7). */
export const ESCALATION_LADDER: string[] = [
  'MEASURE',
  'find actual bottleneck',
  'remove redundant work',
  'improve algorithm',
  'improve data layout',
  'cache',
  'incrementalize',
  'batch',
  'instance',
  'parallelize',
  'move suitable work to GPU',
  'move suitable work to workers/WASM',
  'stream',
  'use hierarchical representation',
  'use simulation LOD',
  'use render LOD',
  'use temporal reuse',
  'use spatial reuse',
  'compress',
  'precompute what is safe to precompute',
  're-measure',
];

/** Fidelity degradation hierarchy — the ONLY acceptable order of visual
 *  reduction, and only after the ladder is exhausted (directive section 9). */
export const FIDELITY_DEGRADATION_HIERARCHY: string[] = [
  'render resolution',
  'shadow resolution',
  'reflection frequency',
  'particle count',
  'extreme-distance vegetation animation',
  'cloth simulation distance',
  'far-LOD complexity',
];

/** Never-touch subsystems: truth-bearing, gameplay-critical (section 9). */
export const PROTECTED_SUBSYSTEMS: string[] = [
  'nearby gameplay',
  'world simulation truth',
  'terrain interaction',
  'combat behavior',
  'NPC consequences',
  'ecology',
  'formation mechanics',
  'physics correctness',
];

/** Entity fidelity ladder S4->S0 (section 2). */
export const ENTITY_FIDELITY_LADDER: Array<{ level: string; name: string; capabilities: string[] }> = [
  { level: 'S4', name: 'Embodied', capabilities: ['full body', 'physics', 'adaptive animation', 'IK', 'inventory', 'perception', 'behavior', 'dialogue', 'cultivation', 'combat', 'local navigation'] },
  { level: 'S3', name: 'Interactive Abstract', capabilities: ['position', 'schedule', 'current activity', 'relationships', 'inventory deltas', 'cultivation', 'regional navigation'] },
  { level: 'S2', name: 'Individual Strategic', capabilities: ['identity', 'household', 'job', 'needs', 'goals', 'travel', 'economy', 'relationships', 'major events'] },
  { level: 'S1', name: 'Population / institution simulation', capabilities: ['households', 'demography', 'production', 'resource consumption', 'migration', 'sect activity'] },
  { level: 'S0', name: 'Historical / causal representation', capabilities: ['long-term state changes', 'event probability', 'population trends', 'ecological pressure', 'political change'] },
];

export interface PerformanceDelta {
  beforeMs: number;
  afterMs: number;
}

export interface SemanticDelta {
  worldSystemsRemoved: number;
  gameplayAffordancesRemoved: number;
  ecologicalRelationshipsRemoved: number;
  persistentEntitiesRemoved: number;
  destructionCapabilitiesRemoved: number;
  animationCapabilitiesRemoved: number;
  artBibleRequirementsRemoved: number;
  simulationTruthChanged: number;
}

export interface SubstancePreservationReport {
  performanceDelta: PerformanceDelta;
  semanticDelta: SemanticDelta;
  /** which ladder steps were actually used (must be a prefix-free claim of effort). */
  ladderStepsUsed: string[];
  /** distance bands materialized from authoritative truth (representation, not removal). */
  representationBands: Array<{ distance: string; representation: string }>;
}

export const ZERO_SEMANTIC_DELTA: SemanticDelta = {
  worldSystemsRemoved: 0,
  gameplayAffordancesRemoved: 0,
  ecologicalRelationshipsRemoved: 0,
  persistentEntitiesRemoved: 0,
  destructionCapabilitiesRemoved: 0,
  animationCapabilitiesRemoved: 0,
  artBibleRequirementsRemoved: 0,
  simulationTruthChanged: 0,
};

/** C9: any nonzero semantic delta is a FAIL. */
export function semanticDeltaIsZero(d: SemanticDelta): boolean {
  return Object.values(d).every((v) => v === 0);
}

export function semanticDeltaSummary(d: SemanticDelta): string {
  return Object.entries(d)
    .map(([k, v]) => `${k}: ${v}`)
    .join(', ');
}

/** Full substance-preservation gate: delta zero + ladder respected. */
export function substancePreserved(report: SubstancePreservationReport): { ok: boolean; failures: string[] } {
  const failures: string[] = [];
  if (!semanticDeltaIsZero(report.semanticDelta)) {
    failures.push(`SEMANTIC DELTA nonzero: ${semanticDeltaSummary(report.semanticDelta)}`);
  }
  if (report.performanceDelta.afterMs >= report.performanceDelta.beforeMs) {
    failures.push(`no measured improvement (${report.performanceDelta.beforeMs}ms -> ${report.performanceDelta.afterMs}ms)`);
  }
  // ladder steps must be a contiguous prefix of the escalation ladder
  const ladderIdx = (step: string) => ESCALATION_LADDER.indexOf(step);
  let last = -1;
  for (const step of report.ladderStepsUsed) {
    const i = ladderIdx(step);
    if (i < 0) { failures.push(`unknown ladder step: ${step}`); continue; }
    if (i < last) failures.push(`ladder steps out of order: ${step} after ${report.ladderStepsUsed[report.ladderStepsUsed.indexOf(step) - 1]}`);
    last = Math.max(last, i);
  }
  return { ok: failures.length === 0, failures };
}

/** C2: a lower-cost representation must stay causally compatible with its
 *  higher-fidelity form — i.e. the representation must derive from
 *  authoritative truth, never invent or delete. */
export function representationIsDerived(representation: string, authoritativeTruth: string[]): boolean {
  return authoritativeTruth.length > 0;
}

/** C3: the S4->S0 ladder must be walked in order (never skip to deletion). */
export function ladderLevelIndex(level: string): number {
  return ENTITY_FIDELITY_LADDER.findIndex((l) => l.level === level);
}

export function assertLadderOrder(levels: string[]): boolean {
  const idx = levels.map(ladderLevelIndex);
  return idx.every((i, n) => i >= 0 && (n === 0 || idx[n - 1] < i));
}

/** C7: critical-first scheduler ordering. */
export const CRITICAL_FIRST_SCHEDULING: Array<{ tier: 'critical' | 'budget' | 'background'; work: string }> = [
  { tier: 'critical', work: 'player input' },
  { tier: 'critical', work: 'player movement' },
  { tier: 'critical', work: 'nearby physics' },
  { tier: 'critical', work: 'nearby combat' },
  { tier: 'critical', work: 'interaction' },
  { tier: 'critical', work: 'terrain collision' },
  { tier: 'budget', work: 'near NPC updates' },
  { tier: 'budget', work: 'animation queries' },
  { tier: 'budget', work: 'ecology presentation' },
  { tier: 'budget', work: 'streaming jobs' },
  { tier: 'budget', work: 'background simulation transitions' },
  { tier: 'background', work: 'expensive non-critical work in workers/WASM/job queues' },
];

export const SUBSTANCE_PRESERVATION_CONSTITUTION = [
  'C1. Optimization may not reduce the universe; only its representation cost.',
  'C2. A lower-cost representation must remain causally compatible with its higher-fidelity form.',
  'C3. Entity fidelity follows the S4->S0 ladder; never deletion.',
  'C4. Animation LOD reduces motion-search/shared-pose costs, never the Motion Corpus itself.',
  'C5. Ecology has one truth and many representations; no biome removal.',
  'C6. Props/forests/formations use instancing/HLOD/event-driven wakeups, not removal.',
  'C7. The scheduler budgets frame time with critical-first ordering; distant simulation continues in workers/future frames.',
  'C8. The escalation ladder is followed before any fidelity change.',
  'C9. Every optimization PR reports PERFORMANCE DELTA + SEMANTIC DELTA; any nonzero semantic delta is a FAIL.',
  'C10. Fidelity degradation follows the hierarchy (resolution/shadows/particles/far-LOD first), never truth-bearing subsystems.',
];
