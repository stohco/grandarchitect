/**
 * RCVC Service — unified Reasoning/Constraint/Verification/Complexity facade
 *
 * The single entry point the Grand Architect uses to access all four
 * cognitive subsystems. Each subsystem can also be used independently.
 *
 * No forbidden functions. No Three.js, no DOM.
 */

import type {
  RCVCService,
  ArchitectHypothesis,
  InterpretContext,
  ConstraintProblem,
  ConstraintSolution,
  ProtocolSpec,
  ModelCheckResult,
  ComplexityReport,
  SpatialScale,
  TimeWindow,
  BenchmarkSuite,
  Term,
  ProofObject,
  ProofOperationInput,
  ClarificationQuestion,
} from './types';
import { createHypothesisEngine, type HypothesisEngine } from './reasoning/hypothesis';
import { createClarificationGenerator, type ClarificationGenerator } from './reasoning/clarification';
import type { ResolvableEntity } from './reasoning/target-resolver';
import { createConstraintService, type ConstraintService } from './constraints/service';
import { buildProofFromInput } from './constraints/proof';
import { modelCheck } from './verification/model-checker';
import { ALL_PROTOCOLS } from './verification/protocols';
import { sampleComplexity } from './observatory/sampler';
import { runBenchmarkSuite } from './perf/benchmarks';
import { canonicalizeTerm, EGraph, STANDARD_REWRITE_RULES } from './rewriting/e-graph';

// ============================================================================
// RCVC service implementation
// ============================================================================

export interface RCVCDeps {
  hypothesisEngine?: HypothesisEngine;
  clarificationGenerator?: ClarificationGenerator;
  constraintService?: ConstraintService;
}

export function createRCVCService(deps: RCVCDeps = {}): RCVCService {
  const hypothesisEngine = deps.hypothesisEngine ?? createHypothesisEngine();
  const clarificationGen = deps.clarificationGenerator ?? createClarificationGenerator();
  const constraintService = deps.constraintService ?? createConstraintService();
  const egraph = new EGraph();

  const hypotheses = new Map<string, ArchitectHypothesis>();

  const service: RCVCService = {
    // ----- Reasoning -----
    interpret(request: string, context?: InterpretContext): ArchitectHypothesis[] {
      const entityPool: ResolvableEntity[] = [];  // In production, populated from the world oracle
      const hyps = hypothesisEngine.interpret(request, context, entityPool);
      for (const h of hyps) hypotheses.set(h.id, h);
      return hyps;
    },

    selectHypothesis(hypothesisId: string): ArchitectHypothesis | undefined {
      return hypotheses.get(hypothesisId);
    },

    clarify(questionId: string, optionIndex: number): ArchitectHypothesis {
      // Find the question's hypothesis
      const [_, hypothesisId] = questionId.split('-').slice(-1);
      const hyp = Array.from(hypotheses.values()).find(h => h.id.endsWith(hypothesisId ?? ''));
      if (!hyp) throw new Error(`Hypothesis not found for question ${questionId}`);
      // In a real impl, this would resolve the variable and re-score.
      // Here we return the hypothesis as-is (the UI handles the resolution).
      return hyp;
    },

    // ----- Constraints & Proof -----
    solveConstraints(problem: ConstraintProblem): ConstraintSolution {
      return constraintService.solve(problem);
    },

    buildProof(operation: ProofOperationInput): ProofObject {
      return buildProofFromInput(operation);
    },

    // ----- Verification -----
    verifyProtocol(spec: ProtocolSpec): ModelCheckResult {
      return modelCheck(spec);
    },

    // ----- Complexity -----
    sampleComplexity(scale: SpatialScale, window: TimeWindow, seed: string): ComplexityReport {
      const seedNum = parseInt(seed.replace(/[^0-9]/g, ''), 10) || 42;
      return sampleComplexity({ scale, window, seed: seedNum });
    },

    // ----- Performance -----
    runBenchmarks(): BenchmarkSuite {
      return runBenchmarkSuite();
    },

    // ----- Rewriting -----
    canonicalize(expr: Term): Term {
      return canonicalizeTerm(expr);
    },
  };

  return service;
}

// ============================================================================
// Convenience: verify all built-in protocols
// ============================================================================

export function verifyAllProtocols(): ModelCheckResult[] {
  return ALL_PROTOCOLS.map(spec => modelCheck(spec));
}

// ============================================================================
// Convenience: get clarification questions for a hypothesis
// ============================================================================

export function getClarificationQuestions(
  hypothesis: ArchitectHypothesis,
  generator: ClarificationGenerator = createClarificationGenerator(),
): ClarificationQuestion[] {
  return generator.generate(hypothesis);
}

// ============================================================================
// Re-exports
// ============================================================================

export * from './types';
export { createHypothesisEngine } from './reasoning/hypothesis';
export { createTargetResolver, needsDisambiguation } from './reasoning/target-resolver';
export { createClarificationGenerator } from './reasoning/clarification';
export { scoreHypothesis, selectWeakestSufficient, DEFAULT_WEIGHTS } from './reasoning/scoring';
export { createConstraintService, sampleSectLayoutProblem } from './constraints/service';
export { solveBacktracking } from './constraints/backtracking-solver';
export { solveProcedurally } from './constraints/procedural-solver';
export { createProofBuilder, buildProofFromInput, proofSummary } from './constraints/proof';
export { evalConstraint, evalTerm, enumerateDomain } from './constraints/ir';
export { modelCheck } from './verification/model-checker';
export {
  permissionEscalationProtocol,
  toolLifecycleProtocol,
  previewCommitRollbackProtocol,
  snapshotForkProtocol,
  pluginLifecycleProtocol,
  terrainAtomicityProtocol,
  ALL_PROTOCOLS,
} from './verification/protocols';
export {
  compressibility,
  shannonEntropy,
  diversityScore,
  computeMetrics,
  diagnoseTrend,
} from './observatory/metrics';
export { lightConeMutualInformation, windowedLightConeMI } from './observatory/light-cone';
export { sampleComplexity, sampleWorldState } from './observatory/sampler';
export { EntityPool } from './perf/entity-pool';
export { runBenchmarkSuite, DEFAULT_PERF_BUDGET } from './perf/benchmarks';
export { EGraph, canonicalizeTerm, equivalent, STANDARD_REWRITE_RULES } from './rewriting/e-graph';
