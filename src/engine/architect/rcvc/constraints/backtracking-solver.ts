/**
 * Backtracking solver.
 *
 * Classic DFS with constraint propagation:
 *   - Order variables by most-constrained-first (smallest domain).
 *   - At each node, pick a value, propagate (check every constraint whose
 *     vars are all assigned), and recurse.
 *   - Prune: if any hard constraint is violated, backtrack immediately.
 *   - Track soft-penalty: prefer the assignment with the lowest total
 *     soft penalty, even if it's not zero.
 *
 * Bounded by `maxNodes` to avoid runaway search on huge problems.
 */

import type {
  Assignment,
  Constraint,
  ConstraintProblem,
  ConstraintVar,
} from '../types';
import type { SolverTrace } from '../types';
import { evalFullConstraint, enumerateDomain, collectVars } from './ir';

const DEFAULT_MAX_NODES = 50_000;

// ============================================================================
// Variable ordering — most-constrained-first
// ============================================================================

function orderVars(vars: ConstraintVar[], constraints: Constraint[]): ConstraintVar[] {
  // Count how many constraints reference each variable.
  const refCount = new Map<string, number>();
  for (const c of constraints) {
    const cv = collectVars(c.expr);
    for (const name of cv) {
      refCount.set(name, (refCount.get(name) ?? 0) + 1);
    }
  }
  // Sort by: domain size asc, then reference count desc.
  return [...vars].sort((a, b) => {
    const da = domainSize(a);
    const db = domainSize(b);
    if (da !== db) return da - db;
    const ra = refCount.get(a.name) ?? 0;
    const rb = refCount.get(b.name) ?? 0;
    return rb - ra;
  });
}

function domainSize(v: ConstraintVar): number {
  switch (v.domain.kind) {
    case 'int':
      return Math.max(0, v.domain.max - v.domain.min + 1);
    case 'float':
      return 11; // matches the default in enumerateDomain
    case 'enum':
      return v.domain.values.length;
    case 'bool':
      return 2;
  }
}

// ============================================================================
// Solver
// ============================================================================

export interface SolveOptions {
  maxNodes?: number;
  /** Number of float steps to enumerate per float domain. */
  floatSteps?: number;
}

export function solveBacktracking(
  problem: ConstraintProblem,
  opts: SolveOptions = {},
): SolverTrace {
  const maxNodes = opts.maxNodes ?? DEFAULT_MAX_NODES;
  const order = orderVars(problem.vars, problem.constraints);

  let nodesExplored = 0;
  let nodesPruned = 0;
  let ticks = 0;

  // Track the best (lowest soft-penalty) complete or partial assignment.
  let bestAssignment: Assignment = {};
  let bestPenalty = Infinity;
  let solved = false;

  // Pre-index constraints by variable name for fast propagation lookups.
  const constraintsByVar = new Map<string, Constraint[]>();
  for (const c of problem.constraints) {
    const cv = collectVars(c.expr);
    for (const name of cv) {
      const arr = constraintsByVar.get(name) ?? [];
      arr.push(c);
      constraintsByVar.set(name, arr);
    }
  }

  function constraintsNowCheckable(assignment: Assignment, justAssigned: string): Constraint[] {
    const arr = constraintsByVar.get(justAssigned) ?? [];
    return arr.filter(c => {
      const cv = collectVars(c.expr);
      for (const name of cv) {
        if (assignment[name] === undefined) return false;
      }
      return true;
    });
  }

  function recurse(idx: number, assignment: Assignment, softPenalty: number): boolean {
    if (nodesExplored >= maxNodes) return false;
    nodesExplored++;
    ticks++;

    if (idx === order.length) {
      // Complete assignment.
      if (softPenalty < bestPenalty) {
        bestPenalty = softPenalty;
        bestAssignment = { ...assignment };
        solved = true;
      }
      return true; // signal a solution was found (we still explore for better soft-penalty)
    }

    const v = order[idx];
    const values = enumerateDomain(v.domain, { floatSteps: opts.floatSteps });

    for (const value of values) {
      ticks++;
      const trial: Assignment = { ...assignment, [v.name]: value };

      // Check every now-checkable constraint.
      let newSoftPenalty = softPenalty;
      let violated = false;
      const checkable = constraintsNowCheckable(trial, v.name);
      for (const c of checkable) {
        const r = evalFullConstraint(c, trial);
        if (!r.satisfied) {
          if (c.weight === 'hard') {
            violated = true;
            nodesPruned++;
            break;
          } else {
            newSoftPenalty += r.penalty;
          }
        }
      }
      if (violated) continue;

      // If we already have a solution and this branch's soft penalty exceeds
      // the best, prune (branch-and-bound).
      if (solved && newSoftPenalty >= bestPenalty) {
        nodesPruned++;
        continue;
      }

      const found = recurse(idx + 1, trial, newSoftPenalty);
      // We do NOT early-exit on found — we want the best soft-penalty solution.
      // But we do bail out if we've hit the node budget.
      if (nodesExplored >= maxNodes) return false;
      void found; // silence unused-warning
    }
    return solved;
  }

  recurse(0, {}, 0);

  // Build per-constraint evaluation on the final assignment.
  const evaluations = problem.constraints.map(c => {
    const r = evalFullConstraint(c, bestAssignment);
    return { constraintId: c.id, satisfied: r.satisfied, penalty: r.penalty };
  });

  return {
    solver: 'backtracking',
    nodesExplored,
    nodesPruned,
    ticks,
    solved,
    assignment: bestAssignment,
    softPenalty: Number.isFinite(bestPenalty) ? bestPenalty : 0,
    evaluations,
  };
}
