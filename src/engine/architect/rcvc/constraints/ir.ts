/**
 * Constraint IR — solver-independent constraint representation
 *
 * The engine depends on this IR, not on any specific solver. Adapters
 * translate the IR to/from concrete solver APIs:
 *
 *   Engine Constraint IR
 *   ├── Backtracking solver (always available, deterministic)
 *   ├── Procedural search adapter (layout heuristics)
 *   ├── Optimization solver adapter (stub)
 *   └── Z3 adapter (dev-side, Python — stub interface)
 *
 * No forbidden functions. No Three.js, no DOM.
 */

import type {
  ConstraintVar,
  Constraint,
  ConstraintProblem,
  ConstraintExpression,
  Term,
  ValueDomain,
  CandidateModel,
} from '../types';

// ============================================================================
// Term evaluation
// ============================================================================

export function evalTerm(term: Term, assignments: Record<string, unknown>): unknown {
  switch (term.kind) {
    case 'const':
      return term.value;
    case 'var':
      return assignments[term.name];
    case 'field': {
      const obj = evalTerm(term.of, assignments);
      if (obj && typeof obj === 'object' && term.field in (obj as object)) {
        return (obj as Record<string, unknown>)[term.field];
      }
      return undefined;
    }
    case 'call': {
      const args = term.args.map(a => evalTerm(a, assignments));
      return callBuiltin(term.fn, args);
    }
  }
}

function callBuiltin(fn: string, args: unknown[]): unknown {
  switch (fn) {
    case 'add': return (args[0] as number) + (args[1] as number);
    case 'sub': return (args[0] as number) - (args[1] as number);
    case 'mul': return (args[0] as number) * (args[1] as number);
    case 'div': return (args[0] as number) / (args[1] as number);
    case 'distance': {
      const a = args[0] as [number, number, number];
      const b = args[1] as [number, number, number];
      return Math.sqrt((a[0]-b[0])**2 + (a[1]-b[1])**2 + (a[2]-b[2])**2);
    }
    case 'length': {
      const v = args[0] as [number, number, number];
      return Math.sqrt(v[0]**2 + v[1]**2 + v[2]**2);
    }
    case 'dot': {
      const a = args[0] as [number, number, number];
      const b = args[1] as [number, number, number];
      return a[0]*b[0] + a[1]*b[1] + a[2]*b[2];
    }
    case 'count': return Array.isArray(args[0]) ? (args[0] as unknown[]).length : 0;
    case 'abs': return Math.abs(args[0] as number);
    default: throw new Error(`Unknown builtin: ${fn}`);
  }
}

// ============================================================================
// Constraint evaluation
// ============================================================================

export function evalConstraint(expr: ConstraintExpression, assignments: Record<string, unknown>): boolean {
  switch (expr.type) {
    case 'eq': return evalTerm(expr.left, assignments) === evalTerm(expr.right, assignments);
    case 'neq': return evalTerm(expr.left, assignments) !== evalTerm(expr.right, assignments);
    case 'lt': return (evalTerm(expr.left, assignments) as number) < (evalTerm(expr.right, assignments) as number);
    case 'lte': return (evalTerm(expr.left, assignments) as number) <= (evalTerm(expr.right, assignments) as number);
    case 'gt': return (evalTerm(expr.left, assignments) as number) > (evalTerm(expr.right, assignments) as number);
    case 'gte': return (evalTerm(expr.left, assignments) as number) >= (evalTerm(expr.right, assignments) as number);
    case 'and': return expr.exprs.every(e => evalConstraint(e, assignments));
    case 'or': return expr.exprs.some(e => evalConstraint(e, assignments));
    case 'not': return !evalConstraint(expr.expr, assignments);
    case 'in_range': {
      const v = evalTerm(expr.var as unknown as Term, assignments) as number;
      return v >= (evalTerm(expr.min, assignments) as number) && v <= (evalTerm(expr.max, assignments) as number);
    }
    case 'distance_le': {
      const a = evalTerm(expr.a, assignments) as [number, number, number];
      const b = evalTerm(expr.b, assignments) as [number, number, number];
      const max = evalTerm(expr.max, assignments) as number;
      const d = Math.sqrt((a[0]-b[0])**2 + (a[1]-b[1])**2 + (a[2]-b[2])**2);
      return d <= max;
    }
    case 'angle_within': {
      const from = evalTerm(expr.from, assignments) as [number, number, number];
      const to = evalTerm(expr.to, assignments) as [number, number, number];
      const axis = evalTerm(expr.axis, assignments) as [number, number, number];
      const tol = evalTerm(expr.toleranceDeg, assignments) as number;
      const angle = angleBetween(from, to, axis);
      return Math.abs(angle) <= tol;
    }
    case 'custom_predicate': {
      // Custom predicates are evaluated by the validator, not the IR.
      // The IR just records them; the solver treats them as opaque.
      return true;  // optimistic; the validator will re-check
    }
  }
}

function angleBetween(from: [number, number, number], to: [number, number, number], axis: [number, number, number]): number {
  const fLen = Math.sqrt(from[0]**2 + from[1]**2 + from[2]**2);
  const tLen = Math.sqrt(to[0]**2 + to[1]**2 + to[2]**2);
  if (fLen === 0 || tLen === 0) return 0;
  const dot = (from[0]*to[0] + from[1]*to[1] + from[2]*to[2]) / (fLen * tLen);
  return Math.acos(Math.max(-1, Math.min(1, dot))) * 180 / Math.PI;
}

// ============================================================================
// Domain enumeration
// ============================================================================

export function enumerateDomain(domain: ValueDomain): unknown[] {
  switch (domain.kind) {
    case 'int_range': {
      const values: number[] = [];
      const step = Math.max(1, Math.ceil((domain.max - domain.min) / 20));  // cap at 20 samples
      for (let v = domain.min; v <= domain.max; v += step) values.push(v);
      return values;
    }
    case 'float_range': {
      const values: number[] = [];
      const steps = 10;
      for (let i = 0; i <= steps; i++) {
        values.push(domain.min + (domain.max - domain.min) * i / steps);
      }
      return values;
    }
    case 'enum': return domain.values;
    case 'bool': return [true, false];
    case 'vec2': {
      // Sample a 3x3 grid
      const values: [number, number][] = [];
      for (let i = 0; i <= 2; i++) for (let j = 0; j <= 2; j++) {
        values.push([
          domain.min[0] + (domain.max[0] - domain.min[0]) * i / 2,
          domain.min[1] + (domain.max[1] - domain.min[1]) * j / 2,
        ]);
      }
      return values;
    }
    case 'vec3': {
      // Sample a 3x3x3 grid
      const values: [number, number, number][] = [];
      for (let i = 0; i <= 2; i++) for (let j = 0; j <= 2; j++) for (let k = 0; k <= 2; k++) {
        values.push([
          domain.min[0] + (domain.max[0] - domain.min[0]) * i / 2,
          domain.min[1] + (domain.max[1] - domain.min[1]) * j / 2,
          domain.min[2] + (domain.max[2] - domain.min[2]) * k / 2,
        ]);
      }
      return values;
    }
    case 'entity_set':
      // Entity sets are resolved at solve time from the context.
      return [];
  }
}

// ============================================================================
// Problem utilities
// ============================================================================

export function collectVariables(problem: ConstraintProblem): ConstraintVar[] {
  return problem.variables;
}

export function hardConstraints(problem: ConstraintProblem): Constraint[] {
  return problem.constraints.filter(c => c.hard);
}

export function softConstraints(problem: ConstraintProblem): Constraint[] {
  return problem.constraints.filter(c => !c.hard);
}

export function makeCandidateModel(
  assignments: Record<string, unknown>,
  candidateCount: number,
  validCount: number,
  rationale: string,
): CandidateModel {
  return {
    modelId: `model-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e6).toString(36)}`,
    assignments,
    candidateCount,
    validCount,
    selectionRationale: rationale,
  };
}
