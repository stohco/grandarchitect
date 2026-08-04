/**
 * Constraint IR — terms, constraints, and domain enumeration.
 *
 * The IR is a small first-order language over variable assignments. Terms
 * evaluate to numbers; constraints are Boolean combinations of comparisons.
 *
 * This file is the only place that knows how to evaluate the IR. The
 * solver, the proof builder, and the procedural solver all call into
 * `evalTerm` and `evalConstraint`.
 *
 * No forbidden functions: only arithmetic and comparison.
 */

import type {
  Assignment,
  Constraint,
  ConstraintEvalResult,
  ConstraintExpression,
  ConstraintVar,
  Term,
  ValueDomain,
} from '../types';

// ============================================================================
// Term evaluation
// ============================================================================

/**
 * Evaluate a term to a number. Variables must be present in the assignment
 * (callers may pass partial assignments; missing variables throw a
 * `ReferenceError`-like sentinel — we return NaN so the constraint
 * evaluates to false without crashing the solver).
 */
export function evalTerm(t: Term, a: Assignment): number {
  switch (t.t) {
    case 'var': {
      const v = a[t.name];
      if (v === undefined || v === null) return NaN;
      if (typeof v === 'boolean') return v ? 1 : 0;
      if (typeof v === 'string') {
        // Strings can't be numerically evaluated; return NaN.
        return NaN;
      }
      return v;
    }
    case 'const':
      return t.value;
    case 'add':
      return evalTerm(t.a, a) + evalTerm(t.b, a);
    case 'sub':
      return evalTerm(t.a, a) - evalTerm(t.b, a);
    case 'mul':
      return evalTerm(t.a, a) * evalTerm(t.b, a);
    case 'div': {
      const b = evalTerm(t.b, a);
      if (b === 0) return NaN;
      return evalTerm(t.a, a) / b;
    }
    case 'min':
      return Math.min(evalTerm(t.a, a), evalTerm(t.b, a));
    case 'max':
      return Math.max(evalTerm(t.a, a), evalTerm(t.b, a));
    case 'abs':
      return Math.abs(evalTerm(t.a, a));
  }
}

// ============================================================================
// Constraint evaluation
// ============================================================================

/** Evaluate a constraint to a Boolean. Returns false if any term is NaN. */
export function evalConstraint(expr: ConstraintExpression, a: Assignment): boolean {
  switch (expr.t) {
    case 'true':
      return true;
    case 'false':
      return false;
    case 'lt':
      return safeCompare(expr.a, expr.b, a, (x, y) => x < y);
    case 'le':
      return safeCompare(expr.a, expr.b, a, (x, y) => x <= y);
    case 'gt':
      return safeCompare(expr.a, expr.b, a, (x, y) => x > y);
    case 'ge':
      return safeCompare(expr.a, expr.b, a, (x, y) => x >= y);
    case 'eq':
      return safeCompare(expr.a, expr.b, a, (x, y) => x === y);
    case 'ne':
      return safeCompare(expr.a, expr.b, a, (x, y) => x !== y);
    case 'and':
      return evalConstraint(expr.a, a) && evalConstraint(expr.b, a);
    case 'or':
      return evalConstraint(expr.a, a) || evalConstraint(expr.b, a);
    case 'not':
      return !evalConstraint(expr.a, a);
    case 'in': {
      const v = a[expr.varName];
      if (v === undefined || v === null) return false;
      return valueInDomain(v, expr.domain);
    }
  }
}

function safeCompare(
  a: Term,
  b: Term,
  assignment: Assignment,
  op: (x: number, y: number) => boolean,
): boolean {
  const x = evalTerm(a, assignment);
  const y = evalTerm(b, assignment);
  if (Number.isNaN(x) || Number.isNaN(y)) return false;
  return op(x, y);
}

/** Check whether a value belongs to a domain. */
export function valueInDomain(v: number | string | boolean, d: ValueDomain): boolean {
  switch (d.kind) {
    case 'int':
      return typeof v === 'number' && Number.isInteger(v) && v >= d.min && v <= d.max;
    case 'float':
      return typeof v === 'number' && v >= d.min && v <= d.max;
    case 'enum':
      return typeof v === 'string' && d.values.includes(v);
    case 'bool':
      return typeof v === 'boolean';
  }
}

// ============================================================================
// Full constraint evaluation (with penalty for soft constraints)
// ============================================================================

export function evalFullConstraint(c: Constraint, a: Assignment): ConstraintEvalResult {
  const satisfied = evalConstraint(c.expr, a);
  const penalty = satisfied ? 0 : (c.weight === 'soft' ? (c.penalty ?? 1) : 1);
  return { satisfied, penalty, touched: c.vars };
}

// ============================================================================
// Domain enumeration
// ============================================================================

/**
 * Enumerate all values in a domain. Used by the backtracking solver.
 *
 * For float domains, this enumerates a coarse grid (default 11 steps from
 * min to max inclusive). For int domains, it enumerates every integer.
 * For enum, every value. For bool, [false, true].
 */
export function enumerateDomain(d: ValueDomain, opts?: { floatSteps?: number }): Array<number | string | boolean> {
  switch (d.kind) {
    case 'int': {
      const out: number[] = [];
      for (let i = d.min; i <= d.max; i++) out.push(i);
      return out;
    }
    case 'float': {
      const steps = opts?.floatSteps ?? 11;
      const out: number[] = [];
      if (steps <= 1) {
        out.push(d.min);
        return out;
      }
      const step = (d.max - d.min) / (steps - 1);
      for (let i = 0; i < steps; i++) {
        const v = d.min + step * i;
        // Clamp the last value to the max to avoid floating-point drift.
        out.push(i === steps - 1 ? d.max : v);
      }
      return out;
    }
    case 'enum':
      return [...d.values];
    case 'bool':
      return [false, true];
  }
}

// ============================================================================
// Variable lookup helpers
// ============================================================================

export function findVar(vars: ConstraintVar[], name: string): ConstraintVar | undefined {
  return vars.find(v => v.name === name);
}

/** Collect every variable name a constraint references. */
export function collectVars(expr: ConstraintExpression): Set<string> {
  const out = new Set<string>();
  const visit = (e: ConstraintExpression) => {
    switch (e.t) {
      case 'true':
      case 'false':
        return;
      case 'in':
        out.add(e.varName);
        return;
      case 'not':
        visit(e.a);
        return;
      case 'and':
      case 'or':
        visit(e.a);
        visit(e.b);
        return;
      case 'lt':
      case 'le':
      case 'gt':
      case 'ge':
      case 'eq':
      case 'ne':
        collectTermVars(e.a, out);
        collectTermVars(e.b, out);
        return;
    }
  };
  visit(expr);
  return out;
}

function collectTermVars(t: Term, out: Set<string>): void {
  switch (t.t) {
    case 'var':
      out.add(t.name);
      return;
    case 'const':
      return;
    case 'add':
    case 'sub':
    case 'mul':
    case 'div':
    case 'min':
    case 'max':
      collectTermVars(t.a, out);
      collectTermVars(t.b, out);
      return;
    case 'abs':
      collectTermVars(t.a, out);
      return;
  }
}
