/**
 * RCVC Layer — Reasoning, Constraint, Verification, Complexity
 *
 * Shared types for the four-part cognitive layer that sits inside the
 * Grand Architect. Draws from:
 *   - "The Optimal Choice of Hypothesis Is the Weakest, Not the Shortest"
 *     (weakest-sufficient interpretation, least-committal hypotheses)
 *   - "The Coffee Automaton" (apparent complexity, light-cone mutual info)
 *   - Philip Zucker's research notebook (constraint solving, proof objects,
 *     e-graphs, CEGAR refinement loops)
 *
 * No forbidden functions. No Three.js, no DOM. Pure architect primitives.
 */

import type { EntityId, Tick } from '../../kernel/types';
import type { AutonomyLevel } from '../types';

// ============================================================================
// A. Reasoning — Weakest-Sufficient Hypothesis Layer
// ============================================================================

/** A constraint the Architect treats as confirmed (from engine invariants or prior agreement). */
export interface ConfirmedConstraint {
  id: string;
  label: string;
  source: 'engine_invariant' | 'art_direction' | 'user_explicit' | 'quest_state' | 'navigation' | 'performance_budget';
  expression: string;
}

/** A constraint the Architect *assumed* but has not confirmed — flagged for review. */
export interface AssumedConstraint {
  id: string;
  label: string;
  expression: string;
  confidence: number;          // 0..1
  reversibleIfWrong: boolean;
}

/** A variable the hypothesis deliberately leaves unresolved until the user chooses. */
export interface UnresolvedVariable {
  id: string;
  label: string;
  domain: string[];            // candidate values / expressions
  defaultIndex: number;
  consequenceIfWrong: 'low' | 'moderate' | 'severe' | 'destructive';
}

/** A candidate target for a NL reference, with confidence and provenance. */
export interface TargetCandidate {
  candidateId: string;
  entityId?: EntityId;
  label: string;
  confidence: number;          // 0..1
  rationale: string;
}

/** Estimate of how much of the world a hypothesis would touch. */
export interface ScopeEstimate {
  entitiesAffected: number;
  terrainChunksAffected: number;
  systemsTouched: string[];
  reversibilityScore: number;  // 0..1 (1 = trivially reversible)
  destructiveScope: number;    // 0..1 (1 = irreversible destruction)
}

/**
 * A hypothesis about what the user meant.
 *
 * The core principle: prefer the *weakest* (least-specific) hypothesis that
 * still satisfies all confirmed constraints. Weaker hypotheses leave more
 * decisions unresolved and make fewer unsupported assumptions.
 */
export interface ArchitectHypothesis {
  id: string;
  requestId: string;
  interpretation: string;      // human-readable summary
  targetCandidates: TargetCandidate[];
  confirmedConstraints: ConfirmedConstraint[];
  assumedConstraints: AssumedConstraint[];
  unresolvedVariables: UnresolvedVariable[];
  scope: ScopeEstimate;
  /** 0..1 — higher = more specific (more assumptions baked in). Lower is preferred. */
  specificityScore: number;
  /** 0..1 — higher = more easily undone. */
  reversibilityScore: number;
  /** 0..1 — overall confidence this is a valid interpretation. */
  confidence: number;
  /** Does this hypothesis require user clarification before execution? */
  requiresClarification: boolean;
  /** The candidate scoring components, for transparency. */
  scoreBreakdown: HypothesisScore;
}

export interface HypothesisScore {
  satisfiesExplicitRequest: number;
  respectsArtDirection: number;
  preservesEngineInvariants: number;
  reusesConfirmedContext: number;
  reversibility: number;
  generality: number;
  unsupportedSpecificity: number;  // penalty (subtracted)
  destructiveScope: number;        // penalty (subtracted)
  ambiguityPenalty: number;        // penalty (subtracted)
  total: number;
}

/** A clarification question the Architect asks before committing. */
export interface ClarificationQuestion {
  questionId: string;
  hypothesisId: string;
  prompt: string;
  options: ClarificationOption[];
  allowsFreeText: boolean;
  consequenceLevel: 'low' | 'moderate' | 'severe' | 'destructive';
}

export interface ClarificationOption {
  label: string;
  description: string;
  resolvesVariableId: string;
  resolvesValue: string;
  resultingSpecificity: number;
}

// ============================================================================
// B. Constraint & Proof Service
// ============================================================================

/** A typed variable in the constraint IR. */
export interface ConstraintVar {
  name: string;
  domain: ValueDomain;
}

export type ValueDomain =
  | { kind: 'int_range'; min: number; max: number }
  | { kind: 'float_range'; min: number; max: number }
  | { kind: 'enum'; values: string[] }
  | { kind: 'bool' }
  | { kind: 'vec2'; min: [number, number]; max: [number, number] }
  | { kind: 'vec3'; min: [number, number, number]; max: [number, number, number] }
  | { kind: 'entity_set'; fromTag?: string };

/** A solver-independent constraint. */
export interface Constraint {
  id: string;
  label: string;
  kind: ConstraintKind;
  variables: string[];
  expression: ConstraintExpression;
  weight?: number;             // for soft constraints (higher = more important)
  hard: boolean;               // hard constraints must be satisfied; soft are optimized
}

export type ConstraintKind =
  | 'placement_on_valid_terrain'
  | 'path_connectivity'
  | 'facing_axis'
  | 'clear_radius'
  | 'no_intersection_protected'
  | 'cultural_compatibility'
  | 'gpu_budget'
  | 'navigation_reachability'
  | 'defense_coverage'
  | 'sightline_preservation'
  | 'custom';

/** A small typed expression language for constraints. */
export type ConstraintExpression =
  | { type: 'eq'; left: Term; right: Term }
  | { type: 'neq'; left: Term; right: Term }
  | { type: 'lt'; left: Term; right: Term }
  | { type: 'lte'; left: Term; right: Term }
  | { type: 'gt'; left: Term; right: Term }
  | { type: 'gte'; left: Term; right: Term }
  | { type: 'and'; exprs: ConstraintExpression[] }
  | { type: 'or'; exprs: ConstraintExpression[] }
  | { type: 'not'; expr: ConstraintExpression }
  | { type: 'in_range'; var: string; min: Term; max: Term }
  | { type: 'distance_le'; a: Term; b: Term; max: Term }
  | { type: 'angle_within'; from: Term; to: Term; axis: Term; toleranceDeg: Term }
  | { type: 'custom_predicate'; name: string; args: Term[] };

export type Term =
  | { kind: 'var'; name: string }
  | { kind: 'const'; value: number | string | boolean | [number, number] | [number, number, number] }
  | { kind: 'field'; of: Term; field: string }
  | { kind: 'call'; fn: string; args: Term[] };

/** A candidate assignment the solver proposes. */
export interface CandidateModel {
  modelId: string;
  assignments: Record<string, unknown>;
  candidateCount: number;
  validCount: number;
  selectionRationale: string;
}

/** A proof object — evidence that an Architect operation was justified. */
export interface ProofObject {
  proofId: string;
  operationLabel: string;
  timestamp: string;
  tick: Tick;
  justifications: JustificationNode[];
  inputs: ProofInput[];
  solverTrace: SolverTrace;
  validationChecks: ValidationCheck[];
  verdict: 'proved' | 'plausible' | 'refuted' | 'inconclusive';
}

export interface JustificationNode {
  checkName: string;
  passed: boolean;
  message: string;
  details?: Record<string, unknown>;
  children?: JustificationNode[];
}

export interface ProofInput {
  label: string;
  value: string;
  revision?: string;
}

export interface SolverTrace {
  solverName: string;
  candidatesEvaluated: number;
  validCandidates: number;
  selectedCandidate: string;
  selectionCriterion: string;
  iterations: number;
  wallTimeMs: number;
}

export interface ValidationCheck {
  name: string;
  passed: boolean;
  message: string;
}

// ============================================================================
// C. Protocol Verification — State-Machine Model Checking
// ============================================================================

export interface ProtocolState {
  id: string;
  label: string;
  isAccepting: boolean;
  isError: boolean;
}

export interface ProtocolTransition {
  from: string;
  to: string;
  label: string;
  guard?: (vars: Record<string, unknown>) => boolean;
  effect?: (vars: Record<string, unknown>) => Record<string, unknown>;
}

export interface ProtocolSpec {
  name: string;
  description: string;
  initialVars: Record<string, unknown>;
  states: ProtocolState[];
  transitions: ProtocolTransition[];
  initialState: string;
  invariants: StateInvariant[];
  properties: ProtocolProperty[];
}

export interface StateInvariant {
  label: string;
  predicate: (vars: Record<string, unknown>) => boolean;
}

export interface ProtocolProperty {
  label: string;
  kind: 'safety' | 'liveness';
  /** A path predicate that must (safety) or must eventually (liveness) hold. */
  check: (trace: ProtocolTrace) => boolean;
}

export interface ProtocolTrace {
  states: string[];
  transitions: string[];
  vars: Record<string, unknown>[];
}

export interface ModelCheckResult {
  protocolName: string;
  tracesExplored: number;
  statesExplored: number;
  invariantViolations: InvariantViolation[];
  propertyResults: PropertyResult[];
  verdict: 'all_pass' | 'violations_found' | 'inconclusive';
  worstTrace?: ProtocolTrace;
}

export interface InvariantViolation {
  invariantLabel: string;
  state: string;
  vars: Record<string, unknown>;
  trace: ProtocolTrace;
}

export interface PropertyResult {
  propertyLabel: string;
  kind: 'safety' | 'liveness';
  holds: boolean;
  counterexampleTrace?: ProtocolTrace;
}

// ============================================================================
// D. Complexity Observatory
// ============================================================================

export type SpatialScale = 'npc' | 'settlement' | 'region' | 'planet' | 'realm' | 'multiverse';
export type TimeWindow = 'minutes' | 'days' | 'years' | 'centuries' | 'generations';

export interface WorldStateSample {
  sampleId: string;
  tick: Tick;
  scale: SpatialScale;
  regionId?: string;
  coarseGrainedState: string;    // a string representation for compression
  entityCount: number;
  factionCount: number;
  eventCount: number;
  raw: Record<string, unknown>;
}

export interface ComplexityMetrics {
  sampleId: string;
  compressibility: number;       // 0..1 (1 = highly compressible / ordered)
  entropy: number;               // bits
  diversity: number;             // 0..1 (faction/habitat diversity)
  persistence: number;           // 0..1 (how stable structures are over time)
  causalChainLength: number;     // avg length of cause→effect chains
  recurrence: number;            // 0..1 (how often states repeat)
  novelty: number;               // 0..1 (how often new states appear)
  lightConeMI: number;           // past→future mutual information
  predictiveValue: number;       // 0..1 (how much past predicts future)
}

export interface ComplexityReport {
  reportId: string;
  seed: string;
  generatedAt: string;
  scale: SpatialScale;
  window: TimeWindow;
  sampleCount: number;
  metricsSummary: {
    meanCompressibility: number;
    meanEntropy: number;
    meanDiversity: number;
    meanPredictiveValue: number;
    trend: 'homogenizing' | 'chaotic' | 'structured' | 'stable';
  };
  diagnosis: string;
  samples: WorldStateSample[];
  metrics: ComplexityMetrics[];
  comparisons: SeedComparison[];
}

export interface SeedComparison {
  seedA: string;
  seedB: string;
  compressibilityDelta: number;
  diversityDelta: number;
  predictiveValueDelta: number;
  note: string;
}

// ============================================================================
// E. Performance — Ursus-Beating Auto-Optimization
// ============================================================================

export interface BenchmarkResult {
  benchmarkName: string;
  entityCount: number;
  engineMs: number;
  ursusTargetMs: number;         // the Ursus number to beat
  unityMs: number;               // Unity baseline for reference
  verdict: 'beats_ursus' | 'matches_ursus' | 'below_ursus';
  ratio: number;                 // engineMs / ursusTargetMs (< 1 means faster)
  operationsPerMs: number;
}

export interface BenchmarkSuite {
  suiteId: string;
  timestamp: string;
  results: BenchmarkResult[];
  overallVerdict: 'beats_ursus' | 'matches_ursus' | 'below_ursus';
  fastestMs: number;
  slowestMs: number;
}

export interface PerfBudget {
  maxDrawCalls: number;
  maxTriangles: number;
  maxCpuMsPerFrame: number;
  maxGpuMsPerFrame: number;
  maxEntitySpawnMs: number;
  maxEnableDisableMs: number;
}

// ============================================================================
// F. Rewrite & Equivalence (optional)
// ============================================================================

export interface RewriteRule {
  name: string;
  pattern: Term;
  replacement: Term;
  conditions?: ConstraintExpression[];
}

export interface EGraphNode {
  id: number;
  term: Term;
  eClassId: number;
}

export interface EGraphClass {
  id: number;
  members: Set<number>;
}

// ============================================================================
// G. Integration — RCVC Session
// ============================================================================

export interface RCVCSession {
  sessionId: string;
  createdAt: string;
  hypotheses: ArchitectHypothesis[];
  activeHypothesisId?: string;
  proofObjects: ProofObject[];
  verificationResults: ModelCheckResult[];
  complexityReports: ComplexityReport[];
  benchmarkSuites: BenchmarkSuite[];
}

/** The unified RCVC service interface. */
export interface RCVCService {
  // Reasoning
  interpret(request: string, context?: InterpretContext): ArchitectHypothesis[];
  selectHypothesis(hypothesisId: string): ArchitectHypothesis | undefined;
  clarify(questionId: string, optionIndex: number): ArchitectHypothesis;

  // Constraints & Proof
  solveConstraints(problem: ConstraintProblem): ConstraintSolution;
  buildProof(operation: ProofOperationInput): ProofObject;

  // Verification
  verifyProtocol(spec: ProtocolSpec): ModelCheckResult;

  // Complexity
  sampleComplexity(scale: SpatialScale, window: TimeWindow, seed: string): ComplexityReport;

  // Performance
  runBenchmarks(): BenchmarkSuite;

  // Rewriting (optional)
  canonicalize(expr: Term): Term;
}

export interface InterpretContext {
  selectionIds?: string[];
  observerPosition?: [number, number, number];
  artDirectionTags?: string[];
  autonomy: AutonomyLevel;
}

export interface ConstraintProblem {
  variables: ConstraintVar[];
  constraints: Constraint[];
  objective?: 'minimize_specificity' | 'minimize_cost' | 'maximize_reversibility' | 'none';
}

export interface ConstraintSolution {
  ok: boolean;
  model?: CandidateModel;
  proof: ProofObject;
  failureReason?: string;
}

export interface ProofOperationInput {
  label: string;
  justifications: JustificationNode[];
  inputs: ProofInput[];
  solverTrace: SolverTrace;
  validationChecks: ValidationCheck[];
  tick: Tick;
}
