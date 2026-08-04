/**
 * Procedural Solver — layout heuristics for spatial placement problems
 *
 * For problems like "place a sect complex in this mountain area", the
 * backtracking solver may be too slow. The procedural solver uses
 * domain-specific heuristics (grid + jitter, candidate scoring) to
 * find valid layouts quickly.
 *
 * No forbidden functions. No Three.js, no DOM.
 */

import type {
  ConstraintProblem,
  CandidateModel,
  Constraint,
  ConstraintVar,
} from '../types';
import { evalConstraint, makeCandidateModel } from './ir';

// ============================================================================
// Procedural solver
// ============================================================================

export interface ProceduralSolverOptions {
  candidateCount?: number;       // how many candidate layouts to generate
  gridSize?: number;             // grid resolution for placement sampling
  jitter?: number;               // random jitter fraction (0 = grid, 1 = random)
  seed?: number;
}

export interface ProceduralResult {
  ok: boolean;
  model?: CandidateModel;
  allValid: CandidateModel[];
  candidatesEvaluated: number;
  validCount: number;
  iterations: number;
  wallTimeMs: number;
  failureReason?: string;
}

export function solveProcedurally(
  problem: ConstraintProblem,
  options: ProceduralSolverOptions = {},
): ProceduralResult {
  const candidateCount = options.candidateCount ?? 36;
  const gridSize = options.gridSize ?? 6;
  const jitter = options.jitter ?? 0.3;
  const seed = options.seed ?? 12345;
  const start = Date.now();

  let rng = seed;
  function next(): number {
    // LCG — deterministic
    rng = (rng * 1664525 + 1013904223) >>> 0;
    return rng / 0x100000000;
  }

  const allValid: CandidateModel[] = [];
  let evaluated = 0;

  // Generate candidate layouts on a grid with jitter
  for (let i = 0; i < gridSize; i++) {
    for (let j = 0; j < gridSize; j++) {
      if (evaluated >= candidateCount) break;
      const assignments: Record<string, unknown> = {};

      for (const v of problem.variables) {
        assignments[v.name] = sampleVariable(v, i, j, gridSize, jitter, next);
      }

      evaluated++;

      // Check all hard constraints
      const hard = problem.constraints.filter(c => c.hard);
      if (hard.every(c => evalConstraint(c.expression, assignments))) {
        const soft = problem.constraints.filter(c => !c.hard);
        const score = soft.filter(c => evalConstraint(c.expression, assignments)).length;
        allValid.push(makeCandidateModel(
          assignments,
          evaluated,
          allValid.length + 1,
          `Grid (${i},${j}) jitter — soft score ${score}/${soft.length}`,
        ));
      }
    }
    if (evaluated >= candidateCount) break;
  }

  const wallTimeMs = Date.now() - start;

  // Select the candidate with the best soft-constraint satisfaction,
  // breaking ties by lowest "cost" (sum of numeric values)
  const sorted = allValid.slice().sort((a, b) => {
    const sa = problem.constraints.filter(c => !c.hard).filter(c => evalConstraint(c.expression, a.assignments)).length;
    const sb = problem.constraints.filter(c => !c.hard).filter(c => evalConstraint(c.expression, b.assignments)).length;
    if (sb !== sa) return sb - sa;
    const ca = sumNumeric(a.assignments);
    const cb = sumNumeric(b.assignments);
    return ca - cb;
  });

  const best = sorted[0];

  return {
    ok: best !== undefined,
    model: best,
    allValid: sorted,
    candidatesEvaluated: evaluated,
    validCount: allValid.length,
    iterations: evaluated,
    wallTimeMs,
    failureReason: best ? undefined : 'No valid layout found in sampled candidates',
  };
}

// ============================================================================
// Variable sampling
// ============================================================================

function sampleVariable(
  v: ConstraintVar,
  gridI: number,
  gridJ: number,
  gridSize: number,
  jitter: number,
  next: () => number,
): unknown {
  const d = v.domain;
  switch (d.kind) {
    case 'int_range': {
      const t = gridI / Math.max(1, gridSize - 1);
      const val = d.min + Math.round((d.max - d.min) * t);
      const jit = (next() - 0.5) * 2 * jitter * (d.max - d.min) * 0.1;
      return Math.max(d.min, Math.min(d.max, Math.round(val + jit)));
    }
    case 'float_range': {
      const t = gridI / Math.max(1, gridSize - 1);
      const val = d.min + (d.max - d.min) * t;
      const jit = (next() - 0.5) * 2 * jitter * (d.max - d.min) * 0.1;
      return Math.max(d.min, Math.min(d.max, val + jit));
    }
    case 'enum':
      return d.values[(gridI + gridJ) % d.values.length];
    case 'bool':
      return ((gridI + gridJ) % 2) === 0;
    case 'vec2': {
      const tx = gridI / Math.max(1, gridSize - 1);
      const ty = gridJ / Math.max(1, gridSize - 1);
      const x = d.min[0] + (d.max[0] - d.min[0]) * tx + (next() - 0.5) * 2 * jitter * (d.max[0] - d.min[0]) * 0.05;
      const y = d.min[1] + (d.max[1] - d.min[1]) * ty + (next() - 0.5) * 2 * jitter * (d.max[1] - d.min[1]) * 0.05;
      return [x, y] as [number, number];
    }
    case 'vec3': {
      const tx = gridI / Math.max(1, gridSize - 1);
      const ty = gridJ / Math.max(1, gridSize - 1);
      const tz = next();
      const x = d.min[0] + (d.max[0] - d.min[0]) * tx + (next() - 0.5) * 2 * jitter * (d.max[0] - d.min[0]) * 0.05;
      const y = d.min[1] + (d.max[1] - d.min[1]) * ty + (next() - 0.5) * 2 * jitter * (d.max[1] - d.min[1]) * 0.05;
      const z = d.min[2] + (d.max[2] - d.min[2]) * tz + (next() - 0.5) * 2 * jitter * (d.max[2] - d.min[2]) * 0.05;
      return [x, y, z] as [number, number, number];
    }
    case 'entity_set':
      return null;  // resolved externally
  }
}

function sumNumeric(assignments: Record<string, unknown>): number {
  let sum = 0;
  for (const v of Object.values(assignments)) {
    if (typeof v === 'number') sum += Math.abs(v);
    else if (Array.isArray(v)) sum += (v as number[]).reduce((a, b) => a + Math.abs(b), 0);
  }
  return sum;
}
