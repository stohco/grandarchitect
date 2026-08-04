/**
 * Constraint Service — the orchestrator
 *
 * Pipeline:
 *   Architect operation plan
 *     → typed constraint IR
 *     → solver adapter (backtracking or procedural)
 *     → candidate model
 *     → validator
 *     → proof/provenance object
 *     → preview transaction
 *
 * No forbidden functions. No Three.js, no DOM.
 */

import type {
  ConstraintProblem,
  ConstraintSolution,
  ProofOperationInput,
  ProofObject,
  CandidateModel,
  ValidationCheck,
  JustificationNode,
} from '../types';
import { solveBacktracking } from './backtracking-solver';
import { solveProcedurally } from './procedural-solver';
import { evalConstraint } from './ir';
import {
  createProofBuilder,
  buildProofFromInput,
  traceFromBacktracking,
  traceFromProcedural,
  type ProofBuilder,
} from './proof';

// ============================================================================
// Service
// ============================================================================

export type SolverStrategy = 'auto' | 'backtracking' | 'procedural';

export interface ConstraintServiceOptions {
  strategy?: SolverStrategy;
  maxCandidates?: number;
  maxValid?: number;
  timeLimitMs?: number;
  proceduralCandidateCount?: number;
  seed?: number;
}

export interface ConstraintService {
  solve(problem: ConstraintProblem, options?: ConstraintServiceOptions): ConstraintSolution;
}

export function createConstraintService(): ConstraintService {
  function chooseStrategy(problem: ConstraintProblem): SolverStrategy {
    // If there are vec2/vec3 variables, use procedural (spatial layout)
    const hasSpatial = problem.variables.some(v =>
      v.domain.kind === 'vec2' || v.domain.kind === 'vec3'
    );
    if (hasSpatial) return 'procedural';
    // If small search space, use backtracking
    const domainSizes = problem.variables.map(v => {
      switch (v.domain.kind) {
        case 'int_range': return Math.min(20, v.domain.max - v.domain.min + 1);
        case 'float_range': return 10;
        case 'enum': return v.domain.values.length;
        case 'bool': return 2;
        default: return 10;
      }
    });
    const totalSpace = domainSizes.reduce((a, b) => a * b, 1);
    if (totalSpace <= 5000) return 'backtracking';
    return 'procedural';
  }

  function solve(problem: ConstraintProblem, options: ConstraintServiceOptions = {}): ConstraintSolution {
    const strategy = options.strategy ?? 'auto';
    const chosen = strategy === 'auto' ? chooseStrategy(problem) : strategy;

    let result;
    let trace;
    if (chosen === 'procedural') {
      result = solveProcedurally(problem, {
        candidateCount: options.proceduralCandidateCount ?? 36,
        seed: options.seed ?? 12345,
      });
      trace = traceFromProcedural(result);
    } else {
      result = solveBacktracking(problem, {
        maxCandidates: options.maxCandidates ?? 5000,
        maxValid: options.maxValid ?? 50,
        timeLimitMs: options.timeLimitMs ?? 1000,
      });
      trace = traceFromBacktracking(result);
    }

    if (!result.ok || !result.model) {
      // Build a refutation proof
      const builder = createProofBuilder();
      builder.setOperationLabel('constraint_solve_failed');
      builder.setTick(0);
      builder.setSolverTrace(trace);
      builder.addValidationCheck({
        name: 'solution_exists',
        passed: false,
        message: result.failureReason ?? 'No valid solution found',
      });
      builder.setVerdict('refuted');
      return {
        ok: false,
        proof: builder.build(),
        failureReason: result.failureReason ?? 'No valid solution found',
      };
    }

    // Validate the model against all constraints
    const validationChecks: ValidationCheck[] = validateModel(problem, result.model);
    // A solution is valid if ALL HARD constraints pass. Soft constraints are
    // optimization targets — they may or may not be satisfied, but don't
    // invalidate the solution.
    const hardChecks = validationChecks.filter((_, i) => problem.constraints[i]?.hard);
    const allHardValid = hardChecks.every(c => c.passed);

    // Build justifications from constraint satisfaction
    const justifications: JustificationNode[] = problem.constraints.map(c => ({
      checkName: c.label,
      passed: evalConstraint(c.expression, result.model!.assignments),
      message: c.hard ? 'Hard constraint' : 'Soft constraint (optimization target)',
    }));

    const input: ProofOperationInput = {
      label: `constraint_solve:${chosen}`,
      tick: 0,
      justifications,
      inputs: problem.variables.map(v => ({
        label: v.name,
        value: JSON.stringify(result.model!.assignments[v.name]),
      })),
      solverTrace: trace,
      validationChecks,
    };

    const proof: ProofObject = buildProofFromInput(input);
    // Override verdict: a solution is "proved" if all hard constraints pass,
    // regardless of whether soft (optimization) constraints are satisfied.
    proof.verdict = allHardValid ? 'proved' : 'refuted';

    return {
      ok: allHardValid,
      model: result.model,
      proof,
      failureReason: allHardValid ? undefined : 'Model failed hard-constraint validation',
    };
  }

  return { solve };
}

// ============================================================================
// Model validation
// ============================================================================

function validateModel(problem: ConstraintProblem, model: CandidateModel): ValidationCheck[] {
  const checks: ValidationCheck[] = [];
  for (const c of problem.constraints) {
    const passed = evalConstraint(c.expression, model.assignments);
    checks.push({
      name: c.label,
      passed,
      message: passed
        ? `${c.hard ? 'Hard' : 'Soft'} constraint satisfied`
        : `${c.hard ? 'Hard' : 'Soft'} constraint violated`,
    });
  }
  return checks;
}

// ============================================================================
// Sample constraint problems (for testing / demonstration)
// ============================================================================

export function sampleSectLayoutProblem(): ConstraintProblem {
  return {
    variables: [
      { name: 'mainHallPos', domain: { kind: 'vec3', min: [-50, 0, -50], max: [50, 0, 50] } },
      { name: 'trainingPos', domain: { kind: 'vec3', min: [-50, 0, -50], max: [50, 0, 50] } },
      { name: 'gatePos', domain: { kind: 'vec3', min: [-50, 0, -50], max: [50, 0, 50] } },
      { name: 'hallRotation', domain: { kind: 'float_range', min: 0, max: 360 } },
    ],
    constraints: [
      {
        id: 'terrain',
        label: 'Buildings on valid terrain',
        kind: 'placement_on_valid_terrain',
        variables: ['mainHallPos', 'trainingPos', 'gatePos'],
        expression: { type: 'custom_predicate', name: 'terrain_valid', args: [{ kind: 'var', name: 'mainHallPos' }] },
        hard: true,
      },
      {
        id: 'connect',
        label: 'Paths connect required buildings',
        kind: 'path_connectivity',
        variables: ['mainHallPos', 'trainingPos', 'gatePos'],
        expression: { type: 'and', exprs: [
          { type: 'distance_le', a: { kind: 'var', name: 'mainHallPos' }, b: { kind: 'var', name: 'trainingPos' }, max: { kind: 'const', value: 30 } },
          { type: 'distance_le', a: { kind: 'var', name: 'mainHallPos' }, b: { kind: 'var', name: 'gatePos' }, max: { kind: 'const', value: 40 } },
        ]},
        hard: true,
      },
      {
        id: 'clearRadius',
        label: 'Training courtyard has clear radius',
        kind: 'clear_radius',
        variables: ['trainingPos', 'mainHallPos'],
        expression: { type: 'gte', left: { kind: 'call', fn: 'distance', args: [{ kind: 'var', name: 'trainingPos' }, { kind: 'var', name: 'mainHallPos' }] }, right: { kind: 'const', value: 10 } },
        hard: true,
      },
      {
        id: 'facing',
        label: 'Main hall faces gate',
        kind: 'facing_axis',
        variables: ['hallRotation'],
        expression: { type: 'in_range', var: 'hallRotation', min: { kind: 'const', value: 0 }, max: { kind: 'const', value: 180 } },
        hard: false,
        weight: 2,
      },
    ],
    objective: 'minimize_cost',
  };
}
