/**
 * Backtracking Solver — deterministic constraint solver
 *
 * Always available. No external dependencies. Performs a depth-first
 * search over variable domains, pruning branches that violate hard
 * constraints. Soft constraints are used to rank valid solutions.
 *
 * This is the fallback solver — it may be slow for large problems,
 * but it is correct and deterministic.
 *
 * No forbidden functions. No Three.js, no DOM.
 */

import type {
  ConstraintProblem,
  CandidateModel,
  Constraint,
} from '../types';
import {
  evalConstraint,
  enumerateDomain,
  hardConstraints,
  softConstraints,
  makeCandidateModel,
} from './ir';

// ============================================================================
// Solver
// ============================================================================

export interface BacktrackingSolverOptions {
  maxCandidates?: number;       // cap on total candidates explored
  maxValid?: number;            // stop after finding this many valid solutions
  timeLimitMs?: number;         // wall-clock budget
}

export interface BacktrackingResult {
  ok: boolean;
  model?: CandidateModel;
  allValid: CandidateModel[];
  candidatesEvaluated: number;
  validCount: number;
  iterations: number;
  wallTimeMs: number;
  truncated: boolean;
  failureReason?: string;
}

export function solveBacktracking(
  problem: ConstraintProblem,
  options: BacktrackingSolverOptions = {},
): BacktrackingResult {
  const maxCandidates = options.maxCandidates ?? 5000;
  const maxValid = options.maxValid ?? 50;
  const timeLimitMs = options.timeLimitMs ?? 1000;
  const start = Date.now();

  const vars = problem.variables;
  const hard = hardConstraints(problem);
  const soft = softConstraints(problem);

  const allValid: CandidateModel[] = [];
  let candidatesEvaluated = 0;
  let iterations = 0;
  let truncated = false;

  // Pre-enumerate domains
  const domains: unknown[][] = vars.map(v => enumerateDomain(v.domain));

  function dfs(idx: number, assignments: Record<string, unknown>): void {
    if (allValid.length >= maxValid) { truncated = true; return; }
    if (candidatesEvaluated >= maxCandidates) { truncated = true; return; }
    if (Date.now() - start > timeLimitMs) { truncated = true; return; }

    iterations++;

    if (idx === vars.length) {
      // All variables assigned — check all hard constraints
      candidatesEvaluated++;
      const satisfiesHard = hard.every(c => evalConstraint(c.expression, assignments));
      if (satisfiesHard) {
        const score = scoreSolution(soft, assignments);
        allValid.push(makeCandidateModel(
          { ...assignments },
          candidatesEvaluated,
          allValid.length + 1,
          `Soft-constraint score: ${score.toFixed(3)}`,
        ));
      }
      return;
    }

    const domain = domains[idx];
    if (domain.length === 0) {
      // Empty domain — skip (e.g. entity_set resolved externally)
      dfs(idx + 1, assignments);
      return;
    }

    for (const value of domain) {
      assignments[vars[idx].name] = value;
      // Early pruning: check hard constraints that only involve variables assigned so far
      if (prune(hard, assignments, vars.slice(0, idx + 1).map(v => v.name))) {
        dfs(idx + 1, assignments);
      }
      delete assignments[vars[idx].name];
      if (truncated) return;
    }
  }

  dfs(0, {});

  const wallTimeMs = Date.now() - start;

  // Select the best valid model (highest soft-constraint score)
  // For minimize_specificity, prefer the first (least-committal) solution.
  // For minimize_cost, prefer the one with highest soft score.
  let best: CandidateModel | undefined;
  if (problem.objective === 'minimize_specificity' || problem.objective === 'none') {
    best = allValid[0];  // first found = least constrained
  } else {
    best = allValid.slice().sort((a, b) => {
      const sa = scoreSolution(soft, a.assignments);
      const sb = scoreSolution(soft, b.assignments);
      return sb - sa;
    })[0];
  }

  return {
    ok: best !== undefined,
    model: best,
    allValid,
    candidatesEvaluated,
    validCount: allValid.length,
    iterations,
    wallTimeMs,
    truncated,
    failureReason: best ? undefined : (truncated ? 'Search truncated before finding a solution' : 'No valid solution exists'),
  };
}

// ============================================================================
// Pruning — check if partial assignment could still satisfy constraints
// ============================================================================

function prune(hard: Constraint[], assignments: Record<string, unknown>, assignedVars: string[]): boolean {
  const assignedSet = new Set(assignedVars);
  for (const c of hard) {
    // Only check constraints whose variables are all assigned
    const allAssigned = c.variables.every(v => assignedSet.has(v));
    if (allAssigned && !evalConstraint(c.expression, assignments)) {
      return false;
    }
  }
  return true;
}

// ============================================================================
// Soft-constraint scoring
// ============================================================================

function scoreSolution(soft: Constraint[], assignments: Record<string, unknown>): number {
  let score = 0;
  for (const c of soft) {
    if (evalConstraint(c.expression, assignments)) {
      score += c.weight ?? 1;
    }
  }
  return score;
}
