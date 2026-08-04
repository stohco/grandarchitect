/**
 * Constraint service — orchestrator.
 *
 * Decides which solver to try first (procedural for placement-heavy
 * problems, backtracking for combinatorial ones), and falls back to the
 * other if the first one fails. Attaches a proof to the result.
 */

import type {
  ConstraintProblem,
  ConstraintSolution,
  ConstraintVar,
} from '../types';
import { solveBacktracking } from './backtracking-solver';
import { solveProcedurally } from './procedural-solver';
import { createProofBuilder } from './proof';

// ============================================================================
// Problem classification
// ============================================================================

export type ProblemClass = 'placement' | 'combinatorial' | 'mixed';

export function classifyProblem(vars: ConstraintVar[]): ProblemClass {
  const coordVars = vars.filter(v => {
    if (v.domain.kind !== 'int' && v.domain.kind !== 'float') return false;
    const n = v.name.toLowerCase();
    return n.includes('x') || n.includes('z') || n.includes('pos') || n.includes('coord');
  });
  if (coordVars.length >= 2 && coordVars.length / Math.max(1, vars.length) >= 0.5) {
    return 'placement';
  }
  const enumBoolVars = vars.filter(v => v.domain.kind === 'enum' || v.domain.kind === 'bool');
  if (enumBoolVars.length / Math.max(1, vars.length) >= 0.5) {
    return 'combinatorial';
  }
  return 'mixed';
}

// ============================================================================
// Service
// ============================================================================

export interface ConstraintServiceOptions {
  /** Force a specific solver. */
  forceSolver?: 'backtracking' | 'procedural';
  /** Max nodes for backtracking. */
  maxNodes?: number;
  /** Seed for the procedural solver. */
  seed?: string;
}

export interface ConstraintService {
  solve(problem: ConstraintProblem, opts?: ConstraintServiceOptions): ConstraintSolution;
}

export function createConstraintService(): ConstraintService {
  const proofBuilder = createProofBuilder();

  return {
    solve(problem, opts = {}) {
      const cls = classifyProblem(problem.vars);
      const tryProceduralFirst =
        opts.forceSolver === 'procedural' ||
        (opts.forceSolver === undefined && cls === 'placement');
      const tryBacktrackingFirst =
        opts.forceSolver === 'backtracking' ||
        (opts.forceSolver === undefined && (cls === 'combinatorial' || cls === 'mixed'));

      let solution: ConstraintSolution | null = null;

      if (tryProceduralFirst) {
        const trace = solveProcedurally(problem, { seed: opts.seed });
        if (trace.solved || tryBacktrackingFirst === false) {
          solution = makeSolution(trace, problem);
        }
      }

      if (!solution && tryBacktrackingFirst) {
        const trace = solveBacktracking(problem, { maxNodes: opts.maxNodes });
        solution = makeSolution(trace, problem);
      }

      if (!solution && !tryProceduralFirst) {
        // Fallback: procedural with default seed.
        const trace = solveProcedurally(problem, { seed: opts.seed });
        solution = makeSolution(trace, problem);
      }

      if (!solution && !tryBacktrackingFirst) {
        // Fallback: backtracking.
        const trace = solveBacktracking(problem, { maxNodes: opts.maxNodes });
        solution = makeSolution(trace, problem);
      }

      // Attach proof.
      const proof = proofBuilder.build(problem, solution!.trace);
      return { ...solution!, proof };
    },
  };
}

function makeSolution(trace: import('../types').SolverTrace, problem: ConstraintProblem): ConstraintSolution {
  // Determine if "solved" means hard constraints all hold.
  const hardSatisfied = problem.constraints
    .filter(c => c.weight === 'hard')
    .every(c => trace.evaluations.find(e => e.constraintId === c.id)?.satisfied);
  return {
    solved: trace.solved && hardSatisfied,
    assignment: trace.assignment,
    proof: {
      claim: '',
      root: { kind: 'leaf', claim: '', evidence: '' },
      builtAt: '',
    },
    trace,
    softPenalty: trace.softPenalty,
    solver: trace.solver,
  };
}
