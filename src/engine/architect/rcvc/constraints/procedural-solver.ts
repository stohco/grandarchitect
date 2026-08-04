/**
 * Procedural solver.
 *
 * For placement-style problems (where each variable is a 2-D coordinate
 * and the constraints are mostly "don't overlap" + "stay in region"), a
 * backtracking solver is too slow. The procedural solver lays variables
 * out on a coarse grid, jitters them deterministically, and checks the
 * constraints. It is not complete — it can miss solutions — but it is
 * fast and gives a good starting point for refinement.
 *
 * Uses the project's deterministic RNG (xoshiro256**) so the same problem
 * + seed produces the same assignment every time.
 */

import type {
  Assignment,
  Constraint,
  ConstraintProblem,
  ConstraintVar,
} from '../types';
import type { SolverTrace } from '../types';
import { evalFullConstraint } from './ir';
import { nextDouble, nextIntRange, type XoshiroState } from '@/lib/determinism/rng';

// ============================================================================
// Grid layout
// ============================================================================

interface GridLayoutParams {
  sideLength: number;
  cellSize: number;
}

function inferGridParams(vars: ConstraintVar[]): GridLayoutParams {
  // Heuristic: count how many float/int vars look like coordinates
  // (names contain 'x' or 'z', or domain spans > 5).
  const coordVars = vars.filter(v => {
    if (v.domain.kind !== 'int' && v.domain.kind !== 'float') return false;
    const lower = v.name.toLowerCase();
    return lower.includes('x') || lower.includes('z') || lower.includes('pos') || lower.includes('coord');
  });
  const n = Math.max(1, coordVars.length / 2);
  // Pick a side length so that n entities fit on a grid with room to spare.
  const sideLength = Math.max(2, Math.ceil(Math.sqrt(n * 4)));
  const cellSize = 4; // meters between grid cells
  return { sideLength, cellSize };
}

// ============================================================================
// Solver
// ============================================================================

export function solveProcedurally(
  problem: ConstraintProblem,
  opts: { seed?: string; jitter?: number; maxAttempts?: number } = {},
): SolverTrace {
  const seedStr = opts.seed ?? 'rcvc-procedural-default';
  const jitter = opts.jitter ?? 0.5;
  const maxAttempts = opts.maxAttempts ?? 20;
  const { state } = seedFromStringSync(seedStr);

  const params = inferGridParams(problem.vars);
  let ticks = 0;
  let nodesExplored = 0;
  let nodesPruned = 0;
  let solved = false;
  let bestAssignment: Assignment = {};
  let bestPenalty = Infinity;

  // Classify variables: coordinates get gridded+jittered; enums/bools get
  // sampled from their domain; ints get sampled from their range.
  const coordVars = problem.vars.filter(v =>
    v.domain.kind !== 'enum' && v.domain.kind !== 'bool' && (
      v.name.toLowerCase().includes('x') ||
      v.name.toLowerCase().includes('z') ||
      v.name.toLowerCase().includes('pos') ||
      v.name.toLowerCase().includes('coord')
    ),
  );
  const otherVars = problem.vars.filter(v => !coordVars.includes(v));

  function sampleValue(state: XoshiroState, v: ConstraintVar): number | string | boolean {
    ticks++;
    switch (v.domain.kind) {
      case 'int':
        return nextIntRange(state, v.domain.min, v.domain.max);
      case 'float':
        return v.domain.min + nextDouble(state) * (v.domain.max - v.domain.min);
      case 'enum': {
        const idx = nextIntRange(state, 0, v.domain.values.length - 1);
        return v.domain.values[idx];
      }
      case 'bool':
        return nextDouble(state) < 0.5;
    }
  }

  function gridValue(state: XoshiroState, v: ConstraintVar, attempt: number, idx: number): number {
    ticks++;
    const d = v.domain;
    if (d.kind !== 'int' && d.kind !== 'float') return 0;
    const min = d.min;
    const max = d.max;
    // Lay out on a square grid centred at (0,0), sized by params.sideLength.
    const grid = params.sideLength;
    const row = Math.floor(idx / grid);
    const col = idx % grid;
    // Centre the grid.
    const cx = (col - (grid - 1) / 2) * params.cellSize;
    const cz = (row - (grid - 1) / 2) * params.cellSize;
    // Pick which axis this variable represents.
    const isX = v.name.toLowerCase().includes('x') || v.name.toLowerCase().includes('posx');
    const base = isX ? cx : cz;
    // Jitter deterministically.
    const j = (nextDouble(state) - 0.5) * 2 * jitter * params.cellSize;
    // Scale into the variable's domain.
    const span = max - min;
    if (span === 0) return min;
    // Map base+j (in grid-space, roughly [-grid*cellSize/2, +grid*cellSize/2]) into [min, max].
    const halfRange = (grid * params.cellSize) / 2;
    const normalised = halfRange === 0 ? 0 : (base + j) / halfRange; // [-1, 1]-ish
    let v0 = min + (normalised * 0.5 + 0.5) * span;
    // Per-attempt nudge: rotate the grid layout deterministically between attempts.
    const nudge = ((attempt * 7) % 11) * 0.1 * span;
    v0 += nudge - span * 0.05;
    // Clamp.
    if (v0 < min) v0 = min;
    if (v0 > max) v0 = max;
    // Round ints.
    if (d.kind === 'int') v0 = Math.round(v0);
    return v0;
  }

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    nodesExplored++;
    ticks++;
    const assignment: Assignment = {};
    // Place coord vars.
    coordVars.forEach((v, i) => {
      assignment[v.name] = gridValue(state, v, attempt, i);
    });
    // Sample other vars.
    for (const v of otherVars) {
      assignment[v.name] = sampleValue(state, v);
    }

    // Evaluate all constraints.
    let softPenalty = 0;
    let hardViolated = false;
    for (const c of problem.constraints) {
      ticks++;
      const r = evalFullConstraint(c, assignment);
      if (!r.satisfied) {
        if (c.weight === 'hard') {
          hardViolated = true;
          nodesPruned++;
          break;
        } else {
          softPenalty += r.penalty;
        }
      }
    }

    if (!hardViolated) {
      if (softPenalty < bestPenalty) {
        bestPenalty = softPenalty;
        bestAssignment = { ...assignment };
        if (softPenalty === 0) {
          solved = true;
          break; // perfect solution found
        }
      }
    }
  }

  // If nothing satisfied all hard constraints, mark not solved but still
  // return the best-effort assignment (for diagnostic).
  if (!Number.isFinite(bestPenalty)) {
    bestPenalty = 0;
    bestAssignment = {};
    solved = false;
  } else {
    // If we found a valid (hard-satisfying) assignment, mark solved even
    // if soft penalty > 0.
    solved = solved || bestPenalty < Infinity;
  }

  const evaluations = problem.constraints.map(c => {
    const r = evalFullConstraint(c, bestAssignment);
    return { constraintId: c.id, satisfied: r.satisfied, penalty: r.penalty };
  });

  return {
    solver: 'procedural',
    nodesExplored,
    nodesPruned,
    ticks,
    solved,
    assignment: bestAssignment,
    softPenalty: bestPenalty,
    evaluations,
  };
}

// Synchronous wrapper around seedFromString (which is async due to @noble/hashes).
// We pre-compute a deterministic seed state from a simple hash for the
// procedural solver — it doesn't need cryptographic seed hashing.
function seedFromStringSync(s: string): { state: XoshiroState } {
  // FNV-1a 64-bit-ish hash to seed splitmix64. Deterministic, fast, no deps.
  let h = 0xcbf29ce484222325n;
  for (let i = 0; i < s.length; i++) {
    h = (h ^ BigInt(s.charCodeAt(i))) & 0xFFFFFFFFFFFFFFFFn;
    h = (h * 0x100000001b3n) & 0xFFFFFFFFFFFFFFFFn;
  }
  // splitmix64 expansion.
  const MASK64 = 0xFFFFFFFFFFFFFFFFn;
  const GAMMA = 0x9E3779B97F4A7C15n;
  const splitMix = (z: bigint): bigint => {
    z = (z + GAMMA) & MASK64;
    let r = z;
    r = ((r ^ (r >> 30n)) * 0xBF58476D1CE4E5B9n) & MASK64;
    r = ((r ^ (r >> 27n)) * 0x94D049BB133111EBn) & MASK64;
    r = r ^ (r >> 31n);
    return r;
  };
  let z = h;
  const s0 = splitMix(z); z = (z + GAMMA) & MASK64;
  const s1 = splitMix(z); z = (z + GAMMA) & MASK64;
  const s2 = splitMix(z); z = (z + GAMMA) & MASK64;
  const s3 = splitMix(z);
  return { state: { s0, s1, s2, s3 } };
}
