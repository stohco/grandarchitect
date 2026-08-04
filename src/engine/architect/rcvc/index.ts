/** RCVC barrel exports + unified service facade. */
export * from './types';
export { createHypothesisEngine } from './reasoning/hypothesis';
export { createTargetResolver, needsDisambiguation } from './reasoning/target-resolver';
export { createClarificationGenerator } from './reasoning/clarification';
export { scoreHypothesis, selectWeakestSufficient } from './reasoning/scoring';
export { createConstraintService } from './constraints/service';
export { solveBacktracking } from './constraints/backtracking-solver';
export { solveProcedurally } from './constraints/procedural-solver';
export { createProofBuilder } from './constraints/proof';
export { evalConstraint, evalTerm } from './constraints/ir';
export { modelCheck, modelCheckAll } from './verification/model-checker';
export { ALL_PROTOCOLS } from './verification/protocols';
export { detectContradictions, formatReport, VALIDATOR_COVERAGE } from './verification/contradiction-detector';
export { compressibility, shannonEntropy, diversityScore, computeMetrics, diagnoseTrend, sampleComplexity } from './observatory/sampler';
export { EntityPool } from './perf/entity-pool';
export { runBenchmarkSuite } from './perf/benchmarks';
export { EGraph, canonicalizeTerm, equivalent, STANDARD_REWRITE_RULES } from './rewriting/e-graph';
export { computeSummary, type ClaimRecord, type ClaimRegistry } from './claims/schema';
