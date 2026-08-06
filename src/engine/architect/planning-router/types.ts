/**
 * Planning Router — Provider-Neutral Planning Interface
 * ================================================
 *
 * Per the FRONTIER_TECHNOLOGY_MATRIX.md directive, the Grand Architect
 * does NOT use a single planner. It uses a Planning Router that dispatches
 * to specialized solvers:
 *
 *   Unified Planning  — action and temporal planning
 *   OR-Tools CP-SAT   — scheduling, layout, allocation
 *   Z3                — hard laws and invariant checking
 *   clingo            — defaults, exceptions and conflicting lore
 *
 * This file defines the provider-neutral interface. Each solver gets an
 * adapter that implements this interface. The router selects the right
 * solver based on the problem type.
 *
 * IMPORTANT: No planner executes anything. They construct and compare
 * valid action plans using actions registered by the Studio.
 */

// ---------------------------------------------------------------------------
// Problem Types
// ---------------------------------------------------------------------------

export type PlanningProblemType =
  | 'action-temporal'    // Unified Planning — action order, temporal dependencies
  | 'scheduling-layout'  // OR-Tools — NPC schedules, settlement layout, resource allocation
  | 'hard-law-check'     // Z3 — invariant verification
  | 'lore-defaults';     // clingo — defaults, exceptions, conflicting lore

export interface PlanningProblem {
  problemId: string;
  type: PlanningProblemType;
  description: string;

  /** Initial state (facts that are true before planning). */
  initialState?: PlanningFact[];
  /** Goals (facts that must be true after plan execution). */
  goals?: PlanningFact[];
  /** Actions available to the planner. */
  actions?: PlanningAction[];
  /** Temporal constraints (A before B, A after B, etc.). */
  temporalConstraints?: TemporalConstraint[];
  /** Hard prohibitions (things that must NOT happen). */
  prohibitions?: string[];
  /** Resource constraints (budgets, capacities). */
  resourceConstraints?: ResourceConstraint[];
  /** Lore rules (defaults with exceptions, for clingo). */
  loreRules?: LoreRule[];
  /** Invariants (hard laws, for Z3). */
  invariants?: InvariantSpec[];
}

export interface PlanningFact {
  predicate: string;
  args: (string | number)[];
  value?: boolean;
}

export interface PlanningAction {
  actionId: string;
  label: string;
  preconditions: PlanningFact[];
  effects: PlanningFact[];
  duration?: 'instant' | 'short' | 'medium' | 'long';
  cost?: number;
}

export interface TemporalConstraint {
  before: string;  // actionId
  after: string;   // actionId
  type: 'before' | 'after' | 'during' | 'not-overlapping';
}

export interface ResourceConstraint {
  resource: string;
  max: number;
  consumedBy?: string[];  // actionIds
}

export interface LoreRule {
  ruleId: string;
  head: string;       // conclusion
  body: string[];     // conditions
  exceptions: string[]; // negation conditions (not X)
}

export interface InvariantSpec {
  invariantId: string;
  name: string;
  /** SMT-LIB v2 formula (for Z3). */
  formula: string;
  description: string;
}

// ---------------------------------------------------------------------------
// Plan Result
// ---------------------------------------------------------------------------

export interface PlanResult {
  planId: string;
  problemId: string;
  solverUsed: string;
  valid: boolean;
  /** Ordered action IDs (for action-temporal problems). */
  actionOrder?: string[];
  /** Variable assignments (for scheduling-layout problems). */
  assignments?: Record<string, unknown>;
  /** Invariant check results (for hard-law-check problems). */
  invariantResults?: Array<{ invariantId: string; satisfied: boolean; counterexample?: string }>;
  /** Lore conclusions (for lore-defaults problems). */
  conclusions?: Array<{ predicate: string; args: (string | number)[]; value: boolean; reasoning: string }>;
  /** Errors if the plan failed. */
  errors: string[];
  /** Solve time in milliseconds. */
  solveTimeMs: number;
  /** Explanation for humans. */
  explanation: string;
}

// ---------------------------------------------------------------------------
// Solver Interface
// ---------------------------------------------------------------------------

export interface PlanningSolver {
  solverId: string;
  problemTypes: PlanningProblemType[];
  available: boolean;
  reason?: string;
  solve(problem: PlanningProblem): Promise<PlanResult>;
}

// ---------------------------------------------------------------------------
// Planning Router
// ---------------------------------------------------------------------------

export class PlanningRouter {
  private solvers = new Map<string, PlanningSolver>();

  registerSolver(solver: PlanningSolver): void {
    this.solvers.set(solver.solverId, solver);
  }

  getSolver(problemType: PlanningProblemType): PlanningSolver | null {
    for (const solver of this.solvers.values()) {
      if (solver.problemTypes.includes(problemType) && solver.available) {
        return solver;
      }
    }
    return null;
  }

  async solve(problem: PlanningProblem): Promise<PlanResult> {
    const solver = this.getSolver(problem.type);
    if (!solver) {
      return {
        planId: `plan-failed-${Date.now().toString(36)}`,
        problemId: problem.problemId,
        solverUsed: 'none',
        valid: false,
        errors: [`No available solver for problem type: ${problem.type}`],
        solveTimeMs: 0,
        explanation: `No solver available for ${problem.type}.`,
      };
    }
    return solver.solve(problem);
  }

  listSolvers(): Array<{ solverId: string; problemTypes: PlanningProblemType[]; available: boolean; reason?: string }> {
    return Array.from(this.solvers.values()).map((s) => ({
      solverId: s.solverId,
      problemTypes: s.problemTypes,
      available: s.available,
      reason: s.reason,
    }));
  }
}

// Singleton
let routerInstance: PlanningRouter | null = null;

export function getPlanningRouter(): PlanningRouter {
  if (!routerInstance) {
    routerInstance = new PlanningRouter();
  }
  return routerInstance;
}
