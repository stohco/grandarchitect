/**
 * RCVC Type Vocabulary
 *
 * Reasoning · Constraints · Verification · Complexity
 *
 * The Grand Architect's design pipeline is a four-layer stack:
 *
 *   ┌─────────────┐
 *   │  Complexity │ ← observatory: is the world still alive?
 *   ├─────────────┤
 *   │ Verification │ ← contradiction detector + protocol model checker
 *   ├─────────────┤
 *   │ Constraints  │ ← solve the placement / sizing problem
 *   ├─────────────┤
 *   │  Reasoning   │ ← turn NL request into scored hypotheses
 *   └─────────────┘
 *
 * This file declares every type the layers share. Layer-local types live
 * next to their implementations.
 *
 * No forbidden functions. No Three.js, no DOM. Pure data + types.
 */

// ============================================================================
// Reasoning — hypotheses
// ============================================================================

/**
 * A hypothesis is the Architect's proposed interpretation of a free-text
 * request, scoped to a specific set of mutation targets. Each request
 * produces three: a weak-sufficient baseline, a moderate proposal, and an
 * over-specified one (which is scored down to expose the cost of ambition).
 */
export interface ArchitectHypothesis {
  /** Stable unique id, e.g. "hypo-<requestId>-<0|1|2>". */
  id: string;
  /** The originating request id. */
  requestId: string;
  /** One-line restatement of what the hypothesis would do. */
  interpretation: string;
  /** Entity / system candidates this hypothesis would mutate. */
  targetCandidates: HypothesisTarget[];
  /** Constraints the request explicitly or by strong convention establishes. */
  confirmedConstraints: ConstraintRef[];
  /** Constraints the hypothesis assumes (the user did NOT confirm them). */
  assumedConstraints: ConstraintRef[];
  /** Variables the hypothesis leaves unresolved (may need clarification). */
  unresolvedVariables: ConstraintVar[];
  /** What gets mutated if this hypothesis is enacted. */
  scope: HypothesisScope;
  /** Specificity ∈ [0,1]: how narrow is the assumed solution. Higher = more risk. */
  specificityScore: number;
  /** Reversibility ∈ [0,1]: how easy to roll back. 1 = trivially reversible. */
  reversibilityScore: number;
  /** Confidence ∈ [0,1]: how well the hypothesis matches the request. */
  confidence: number;
  /** Whether the Architect should ask before enacting. */
  requiresClarification: boolean;
  /** Full score breakdown for transparency. */
  scoreBreakdown: HypothesisScore;
}

export interface HypothesisTarget {
  /** Entity id, system name, or wildcard like "any household". */
  ref: string;
  kind: 'entity' | 'system' | 'region' | 'wildcard';
  /** Human label. */
  label: string;
}

export interface ConstraintRef {
  /** Short slug, e.g. "south-of-river", "min-distance-5m". */
  id: string;
  /** Human-readable statement. */
  statement: string;
  /** Whether this came from the request, the corpus, or an assumption. */
  source: 'request' | 'corpus' | 'assumed' | 'engine-invariant';
}

export type HypothesisScope =
  | 'preview-only'      // can be discarded without affecting the canonical world
  | 'single-entity'     // mutates one entity
  | 'local-cluster'     // mutates a connected sub-region
  | 'region-wide'       // mutates an entire region
  | 'world-wide'        // mutates the whole world state
  | 'engine-invariant'; // changes a non-negotiable engine rule

/**
 * The scoring rubric. Each axis is in [-1, 1] except `total` which is the
 * weighted sum in roughly [-1, 1]. Weights are pinned in scoring.ts.
 *
 * Positive axes (higher is better):
 *   - satisfiesExplicitRequest
 *   - respectsArtDirection
 *   - preservesEngineInvariants
 *   - reusesConfirmedContext
 *   - reversibility
 *   - generality (generalises beyond the immediate request)
 *
 * Negative axes (lower is better, scored as a penalty in [-1, 0]):
 *   - unsupportedSpecificity (assumes more than the request said)
 *   - destructiveScope (irreversible / wide-blast-radius)
 *   - ambiguityPenalty (relies on unresolved consequential variables)
 */
export interface HypothesisScore {
  satisfiesExplicitRequest: number;
  respectsArtDirection: number;
  preservesEngineInvariants: number;
  reusesConfirmedContext: number;
  reversibility: number;
  generality: number;
  unsupportedSpecificity: number;
  destructiveScope: number;
  ambiguityPenalty: number;
  /** Weighted total in roughly [-1, 1]. > 0 means worth enacting. */
  total: number;
}

// ============================================================================
// Constraints — IR, solver, proof
// ============================================================================

/**
 * A variable in the constraint problem. Variables carry a domain (the set
 * of values they may take) and an optional human-readable meaning.
 */
export interface ConstraintVar {
  name: string;
  domain: ValueDomain;
  /** Human description, e.g. "x-coordinate of household #3". */
  description?: string;
  /** Tag used to group variables, e.g. "position", "kind", "count". */
  tag?: string;
}

/**
 * The set of values a variable may take.
 * - 'int' / 'float' ranges are inclusive on both ends.
 * - 'enum' is a finite set of string labels.
 * - 'bool' is true/false.
 */
export type ValueDomain =
  | { kind: 'int'; min: number; max: number }
  | { kind: 'float'; min: number; max: number }
  | { kind: 'enum'; values: string[] }
  | { kind: 'bool' };

/**
 * A constraint is a Boolean predicate over a partial assignment.
 * Constraints reference variables by name.
 */
export interface Constraint {
  id: string;
  /** Human-readable statement. */
  statement: string;
  /** Variables this constraint touches. */
  vars: string[];
  /** The predicate. */
  expr: ConstraintExpression;
  /** Severity if violated: hard = unsatisfiable, soft = preference. */
  weight: 'hard' | 'soft';
  /** For soft constraints, a penalty ∈ [0, 1] applied per violation. */
  penalty?: number;
}

/**
 * A small first-order expression language over variable assignments.
 * Terms evaluate to numbers; constraints are Boolean combinations of
 * comparisons.
 *
 *   Term        := Var
 *                 | Const(number)
 *                 | Add(Term, Term)
 *                 | Sub(Term, Term)
 *                 | Mul(Term, Term)
 *                 | Div(Term, Term)
 *                 | Min(Term, Term)
 *                 | Max(Term, Term)
 *                 | Abs(Term)
 *
 *   Constraint  := Lt(Term, Term)
 *                 | Le(Term, Term)
 *                 | Gt(Term, Term)
 *                 | Ge(Term, Term)
 *                 | Eq(Term, Term)
 *                 | Ne(Term, Term)
 *                 | And(Constraint, Constraint)
 *                 | Or(Constraint, Constraint)
 *                 | Not(Constraint)
 *                 | In(Var, ValueDomain)   // domain-membership check
 *                 | True
 *                 | False
 */
export type Term =
  | { t: 'var'; name: string }
  | { t: 'const'; value: number }
  | { t: 'add'; a: Term; b: Term }
  | { t: 'sub'; a: Term; b: Term }
  | { t: 'mul'; a: Term; b: Term }
  | { t: 'div'; a: Term; b: Term }
  | { t: 'min'; a: Term; b: Term }
  | { t: 'max'; a: Term; b: Term }
  | { t: 'abs'; a: Term };

export type ConstraintExpression =
  | { t: 'lt'; a: Term; b: Term }
  | { t: 'le'; a: Term; b: Term }
  | { t: 'gt'; a: Term; b: Term }
  | { t: 'ge'; a: Term; b: Term }
  | { t: 'eq'; a: Term; b: Term }
  | { t: 'ne'; a: Term; b: Term }
  | { t: 'and'; a: ConstraintExpression; b: ConstraintExpression }
  | { t: 'or'; a: ConstraintExpression; b: ConstraintExpression }
  | { t: 'not'; a: ConstraintExpression }
  | { t: 'in'; varName: string; domain: ValueDomain }
  | { t: 'true' }
  | { t: 'false' };

/** A complete or partial assignment of variable names to values. */
export type Assignment = Record<string, number | string | boolean>;

/** Result of evaluating a constraint against an assignment. */
export interface ConstraintEvalResult {
  satisfied: boolean;
  /** For soft constraints: the penalty incurred (0 if satisfied). */
  penalty: number;
  /** Which variables the evaluation referenced (for pruning). */
  touched: string[];
}

// ============================================================================
// Solver trace + proof
// ============================================================================

/**
 * A proof object justifies why a solution satisfies the constraints. It is
 * a tree of justification nodes; each node explains one deduction.
 */
export interface ProofObject {
  /** What is being proven. */
  claim: string;
  /** The justification. */
  root: JustificationNode;
  /** Generated at this UTC ISO timestamp. */
  builtAt: string;
}

export type JustificationNode =
  | { kind: 'leaf'; claim: string; evidence: string }
  | { kind: 'eval'; claim: string; constraintId: string; result: 'satisfied' | 'violated'; termValues: Record<string, number | string | boolean> }
  | { kind: 'and'; claim: string; children: JustificationNode[] }
  | { kind: 'or'; claim: string; children: JustificationNode[]; which: number }
  | { kind: 'assumption'; claim: string; note: string };

/** A trace of one solver invocation. */
export interface SolverTrace {
  solver: 'backtracking' | 'procedural';
  /** Number of nodes explored (backtracking) or steps taken (procedural). */
  nodesExplored: number;
  /** Number of nodes pruned by constraint propagation. */
  nodesPruned: number;
  /** Wall-clock-ish tick count (deterministic counter, NOT Date.now). */
  ticks: number;
  /** Whether the solver reached a complete solution. */
  solved: boolean;
  /** Final assignment, or partial best-effort if not solved. */
  assignment: Assignment;
  /** Soft-constraint penalty incurred by the final assignment. */
  softPenalty: number;
  /** Per-constraint evaluation on the final assignment. */
  evaluations: Array<{ constraintId: string; satisfied: boolean; penalty: number }>;
}

// ============================================================================
// Verification — model checker + protocols
// ============================================================================

/** A protocol is a labelled transition system over named states. */
export interface ProtocolSpec {
  id: string;
  name: string;
  description: string;
  /** Initial state id. */
  initial: string;
  /** All states. */
  states: ProtocolState[];
  /** All transitions. */
  transitions: ProtocolTransition[];
  /** LTL-ish invariant predicates over states; checked on every reachable state. */
  invariants: Array<{ id: string; statement: string; predicate: (s: ProtocolState) => boolean }>;
  /** Properties that must hold on every path (reachable-state check). */
  reachabilityProperties: Array<{ id: string; statement: string; mustReach: string[]; mustNotReach?: string[] }>;
}

export interface ProtocolState {
  id: string;
  label: string;
  /** Whether this state is accepting / safe. */
  accepting: boolean;
  /** Free-form metadata for diagnostics. */
  meta?: Record<string, string | number | boolean>;
}

export interface ProtocolTransition {
  from: string;
  to: string;
  /** Event label that fires this transition. */
  event: string;
  /** Optional guard: this transition only fires if guard(state) is true. */
  guard?: (s: ProtocolState) => boolean;
}

/** Result of model-checking a single protocol. */
export interface ModelCheckResult {
  protocolId: string;
  protocolName: string;
  /** All reachable state ids. */
  reachableStates: string[];
  /** States that violated at least one invariant. */
  invariantViolations: Array<{ state: string; invariantId: string; statement: string }>;
  /** Reachability property results. */
  reachabilityResults: Array<{ propertyId: string; satisfied: boolean; reached: string[]; missing: string[] }>;
  /** Whether the protocol satisfies every invariant on every reachable state. */
  passes: boolean;
  /** Number of BFS iterations performed. */
  bfsIterations: number;
  /** Diagnostic note. */
  note: string;
}

/**
 * A single validation check the contradiction detector runs. The detector
 * is intentionally shallow — it scans for surface markers, not semantic
 * equivalence. The VALIDATOR_COVERAGE object below is honest about this.
 */
export interface ValidationCheck {
  id: string;
  /** Category label, e.g. "term-conflict", "unit-mismatch". */
  category: string;
  /** Human-readable description. */
  description: string;
  /** Whether this check is currently implemented. */
  implemented: boolean;
}

// ============================================================================
// Contradiction detection
// ============================================================================

export interface ContradictionFinding {
  checkId: string;
  category: string;
  severity: 'critical' | 'major' | 'minor';
  /** Source location. */
  doc: string;
  section?: string;
  /** What was found. */
  message: string;
  /** Quoted evidence from the corpus. */
  evidence: string;
}

export interface ContradictionReport {
  /** ISO timestamp. */
  generatedAt: string;
  /** Total docs scanned. */
  docsScanned: number;
  /** Total claims/blocks scanned. */
  blocksScanned: number;
  /** All findings, ordered by severity then doc. */
  findings: ContradictionFinding[];
  /** Counts per category. */
  byCategory: Record<string, number>;
  /** Counts per severity. */
  bySeverity: Record<'critical' | 'major' | 'minor', number>;
  /** Honest coverage metadata. */
  coverage: typeof VALIDATOR_COVERAGE;
  /** Human-readable report. */
  formatted: string;
}

// ============================================================================
// Complexity observatory
// ============================================================================

/** Per-tick metrics for a single world-state sample. */
export interface ComplexityMetrics {
  /** Shannon entropy (bits) over the kind histogram. */
  shannonEntropy: number;
  /** Compressibility ∈ [0,1]: 1 = trivially compressible, 0 = incompressible. */
  compressibility: number;
  /** Diversity ∈ [0,1]: normalised number of distinct kinds / regions. */
  diversityScore: number;
  /** Number of distinct entity kinds observed. */
  distinctKinds: number;
  /** Total entity count. */
  entityCount: number;
  /** Spatial occupancy ratio (fraction of grid cells occupied). */
  occupancy: number;
  /** Light-cone mutual information estimate (bits). */
  lightConeMI: number;
}

/** A single sampled world state (snapshot at one tick). */
export interface WorldStateSample {
  tick: number;
  /** Grid of kind-ids, row-major, dimensions = sideLength × sideLength. */
  grid: Uint8Array;
  /** Side length of the (square) grid. */
  sideLength: number;
  /** Histogram of kind-ids. */
  histogram: Record<number, number>;
  /** Computed metrics. */
  metrics: ComplexityMetrics;
}

/** Aggregated report across `scale` samples. */
export interface ComplexityReport {
  samples: WorldStateSample[];
  /** Mean of each metric across samples. */
  meanMetrics: ComplexityMetrics;
  /** Variance of each metric across samples. */
  varianceMetrics: ComplexityMetrics;
  /** Diagnosed trend (e.g. "increasing-complexity", "plateau", "collapse"). */
  trend: ComplexityTrend;
  /** Window size used for light-cone MI. */
  window: number;
  /** Side length per sample. */
  sideLength: number;
  /** Number of samples. */
  scale: number;
  /** Seed used. */
  seed: string;
}

export type ComplexityTrend =
  | 'increasing-complexity'
  | 'plateau'
  | 'collapse'
  | 'noisy'
  | 'insufficient-data';

// ============================================================================
// Performance benchmarks
// ============================================================================

export interface BenchmarkResult {
  name: string;
  /** Engine under test ('rcvc' or 'ursus'). */
  engine: 'rcvc' | 'ursus';
  /** Operation count. */
  operations: number;
  /** Deterministic tick counter (NOT wall clock — see note in benchmarks.ts). */
  ticks: number;
  /** Throughput (operations per tick). */
  opsPerTick: number;
  /** Memory used by entity storage, in bytes. */
  storageBytes: number;
  /** Number of entities live at end. */
  liveEntities: number;
  /** Notes (e.g. "SoA typed arrays"). */
  notes: string;
}

export interface BenchmarkSuite {
  /** ISO timestamp. */
  generatedAt: string;
  /** Side length of the entity pool (10k = 100×100 grid). */
  poolSize: number;
  /** Results grouped by benchmark name. */
  results: BenchmarkResult[];
  /** Headline summary. */
  summary: string;
}

// ============================================================================
// Rewriting — e-graph
// ============================================================================

/** An e-class id. */
export type EClassId = number;

/** An e-node is a labelled operator applied to e-class children. */
export interface ENode {
  /** Operator symbol, e.g. "+", "*", "list". */
  op: string;
  /** Child e-class ids. */
  children: EClassId[];
}

/** A rewrite rule: LHS pattern → RHS pattern, with optional name. */
export interface RewriteRule {
  name: string;
  lhs: Pattern;
  rhs: Pattern;
}

/**
 * A pattern is a tree that may bind sub-terms. Variables start with "?".
 *   Pattern := Var(string)         — binds anything
 *            | { op, children: Pattern[] }
 */
export type Pattern = string | { op: string; children: Pattern[] };

/** A substitution: pattern variable → matched e-class id. */
export type Substitution = Record<string, EClassId>;

// ============================================================================
// RCVC service facade
// ============================================================================

/**
 * The top-level service combines all layers. API routes construct one
 * service per request and call the appropriate method.
 */
export interface RCVCService {
  /** Reasoning layer. */
  reasoning: {
    /** Generate 3 hypotheses for a free-text request. */
    interpret(requestId: string, request: string): ArchitectHypothesis[];
    /** Pick the weakest sufficient hypothesis (or null if none suffice). */
    selectWeakestSufficient(hypotheses: ArchitectHypothesis[]): ArchitectHypothesis | null;
    /** Generate clarification questions for consequential unresolved variables. */
    clarifications(hypothesis: ArchitectHypothesis): ClarificationQuestion[];
  };
  /** Constraints layer. */
  constraints: {
    /** Solve a constraint problem, returning assignment + proof + trace. */
    solve(problem: ConstraintProblem): ConstraintSolution;
  };
  /** Verification layer. */
  verification: {
    /** Model-check all built-in protocols. */
    modelCheckAll(): ModelCheckResult[];
    /** Run the contradiction detector on the corpus docs. */
    detectContradictions(): Promise<ContradictionReport>;
  };
  /** Complexity layer. */
  complexity: {
    /** Sample N world states and report aggregate metrics. */
    sample(scale: number, window: number, seed: string): ComplexityReport;
  };
  /** Performance layer. */
  perf: {
    /** Run the full benchmark suite. */
    benchmark(): BenchmarkSuite;
  };
}

/** A constraint problem is a set of variables + constraints. */
export interface ConstraintProblem {
  vars: ConstraintVar[];
  constraints: Constraint[];
  /** Optional seed for the procedural solver. */
  seed?: string;
}

/** A constraint solution is an assignment + a proof + a trace. */
export interface ConstraintSolution {
  solved: boolean;
  assignment: Assignment;
  proof: ProofObject;
  trace: SolverTrace;
  /** Soft-penalty total. */
  softPenalty: number;
  /** Which solver was used. */
  solver: 'backtracking' | 'procedural';
}

/** A clarification question for the user. */
export interface ClarificationQuestion {
  /** The variable being clarified. */
  variable: string;
  /** The question. */
  question: string;
  /** Suggested options (if discrete). */
  options?: string[];
  /** Why this clarification matters. */
  rationale: string;
}

// ============================================================================
// VALIDATOR_COVERAGE — honest metadata about what the validator can & cannot do
// ============================================================================

/**
 * IMPORTANT: The contradiction detector is structurally shallow. It scans
 * for surface markers (truth-level tags, FORBIDDEN markers, numeric ranges
 * that overlap) and reports what it found. It does NOT prove the bible is
 * internally consistent. The coverage object below is the validator's
 * honest contract with the user.
 */
export const VALIDATOR_COVERAGE = {
  version: '0.1.0-structural-only',
  checkCategories: [
    'truth-level-marker-conflict',
    'forbidden-interpretation-violation',
    'numeric-range-overlap',
    'unit-mismatch',
    'definition-cycle',
    'dangling-cross-reference',
    'invariant-violation',
    'duplicate-canonical-claim',
  ],
  knownBlindSpots: [
    'semantic-equivalence of paraphrased claims',
    'natural-language implication between claims',
    'cross-document numerical consistency beyond explicit ranges',
    'temporal consistency (claims valid at different eras)',
    'causal consistency (cause-effect chains across claims)',
    'modal consistency (necessity vs possibility)',
    'deontic consistency (obligation vs permission vs prohibition)',
    'anaphoric reference resolution (pronouns, ellipsis)',
    'metaphor vs literal claim disambiguation',
    'unit conversion across measurement systems',
    'fuzzy-set membership conflicts',
    'default-reasoning exceptions',
    'abductive inference validity',
    'counterfactual robustness',
    'multi-agent belief consistency',
    'context-dependent truth (claims true only in some scopes)',
    'definition scope (term defined differently in different docs)',
    'implicit assumption extraction',
    'rhetorical vs propositional content',
    'translation fidelity (hanzi ↔ english)',
  ],
  excludedContent: [
    'in-code examples (blockType: invalid_example are skipped)',
    'prose narrative (blockType: prose, no normative force)',
    'unresolved questions (blockType: unresolved_question, no truth claim)',
    'machine-readable JSON blocks (parsed but not semantically validated)',
  ],
  falsePositiveRisk: 'medium — surface markers can flag legitimate edge cases as conflicts',
  falseNegativeRisk: 'high — most semantic contradictions are invisible to this validator',
  layersImplemented: [
    'claim-level structural (provenance, source, dependency graph)',
    'truth-level marker presence',
    'FORBIDDEN marker scanning',
    'explicit numeric range overlap',
    'dangling cross-reference detection',
    'definition cycle detection',
    'duplicate canonical claim detection',
    'invariant-violation marker scanning',
    'unit-mismatch surface scanning',
  ],
  layersNotImplemented: [
    'semantic-graph (cross-claim relationship validation)',
    'numerical-constraint (measurement consistency across docs)',
    'natural-language-semantic (AI contradiction review)',
    'runtime (generation/asset/animation compliance)',
    'modal-temporal-logic (necessity, possibility, time-indexed truth)',
  ],
} as const;

// ============================================================================
// Re-exports of surviving claim-layer types (so callers can import from one place)
// ============================================================================

export type {
  ClaimRecord,
  ClaimRegistry,
  ClaimDomain,
  TruthLevel,
  ApprovalStatus,
  Provenance,
  ConfidenceLevel,
  BlockType,
  BlockMarker,
  ClaimValidationReport,
  ClaimValidationFinding,
  ClaimFindingType,
} from './claims/schema';
