/**
 * Rewrite & Equivalence Engine (optional)
 *
 * A minimal e-graph with hash-consing and AC (associative-commutative)
 * canonicalization. Used for:
 *   - semantic deduplication (fire + wind ≡ wind + fire)
 *   - rule normalization
 *   - effect simplification
 *   - blueprint optimization
 *   - equivalent operation detection
 *
 * Belongs in offline generation and tooling, NOT in the live gameplay
 * hot path — e-graphs can grow aggressively.
 *
 * No forbidden functions. No Three.js, no DOM.
 */

import type { Term, RewriteRule } from '../types';

// ============================================================================
// E-Graph (minimal)
// ============================================================================

export class EGraph {
  private nodes: Map<string, number> = new Map();  // canonical key → eclass id
  private classes: Map<number, Set<string>> = new Map();  // eclass id → member keys
  private parents: Map<number, { fn: string; args: number[] }[]> = new Map();
  private nextId = 0;

  /** Add a term to the e-graph. Returns its e-class id. */
  add(term: Term): number {
    const key = this.canonicalizeKey(term);
    const existing = this.nodes.get(key);
    if (existing !== undefined) return existing;

    const id = this.nextId++;
    this.nodes.set(key, id);
    if (!this.classes.has(id)) this.classes.set(id, new Set());
    this.classes.get(id)!.add(key);

    // Recursively add children
    if (term.kind === 'call') {
      const argIds = term.args.map(a => this.add(a));
      if (!this.parents.has(id)) this.parents.set(id, []);
      this.parents.get(id)!.push({ fn: term.fn, args: argIds });
    } else if (term.kind === 'field') {
      const childId = this.add(term.of);
      if (!this.parents.has(id)) this.parents.set(id, []);
      this.parents.get(id)!.push({ fn: 'field', args: [childId] });
    }

    return id;
  }

  /** Merge two e-classes (they are equivalent). */
  merge(a: number, b: number): number {
    if (a === b) return a;
    const keep = Math.min(a, b);
    const drop = Math.max(a, b);
    const dropMembers = this.classes.get(drop);
    if (dropMembers) {
      for (const key of dropMembers) {
        this.nodes.set(key, keep);
        this.classes.get(keep)?.add(key);
      }
      this.classes.delete(drop);
    }
    return keep;
  }

  /** Apply a rewrite rule. Returns the number of rewrites applied. */
  applyRule(rule: RewriteRule): number {
    let count = 0;
    // Simple pattern matching on canonical keys
    for (const [key, id] of this.nodes) {
      const term = this.parseKey(key);
      if (!term) continue;
      const match = this.matchPattern(rule.pattern, term);
      if (match) {
        const replacement = this.substitute(rule.replacement, match);
        const replacementId = this.add(replacement);
        if (replacementId !== id) {
          this.merge(id, replacementId);
          count++;
        }
      }
    }
    return count;
  }

  /** Saturate: apply all rules until no more rewrites are possible. */
  saturate(rules: RewriteRule[], maxIterations = 10): number {
    let total = 0;
    for (let i = 0; i < maxIterations; i++) {
      let iterCount = 0;
      for (const rule of rules) iterCount += this.applyRule(rule);
      total += iterCount;
      if (iterCount === 0) break;
    }
    return total;
  }

  /** Get the canonical representative of a term. */
  canonicalize(term: Term): Term {
    // For AC functions, sort args
    if (term.kind === 'call' && AC_FUNCTIONS.has(term.fn)) {
      const sortedArgs = term.args
        .map(a => this.canonicalize(a))
        .sort((x, y) => this.canonicalizeKey(x).localeCompare(this.canonicalizeKey(y)));
      return { kind: 'call', fn: term.fn, args: sortedArgs };
    }
    if (term.kind === 'call') {
      return { kind: 'call', fn: term.fn, args: term.args.map(a => this.canonicalize(a)) };
    }
    if (term.kind === 'field') {
      return { kind: 'field', of: this.canonicalize(term.of), field: term.field };
    }
    return term;
  }

  // ----- internals -----

  private canonicalizeKey(term: Term): string {
    const c = this.canonicalize(term);
    return JSON.stringify(c);
  }

  private parseKey(key: string): Term | null {
    try { return JSON.parse(key) as Term; } catch { return null; }
  }

  private matchPattern(pattern: Term, term: Term): Map<string, Term> | null {
    const bindings = new Map<string, Term>();
    if (this.matchRec(pattern, term, bindings)) return bindings;
    return null;
  }

  private matchRec(pattern: Term, term: Term, bindings: Map<string, Term>): boolean {
    if (pattern.kind === 'var') {
      const existing = bindings.get(pattern.name);
      if (existing) return JSON.stringify(existing) === JSON.stringify(term);
      bindings.set(pattern.name, term);
      return true;
    }
    if (pattern.kind !== term.kind) return false;
    if (pattern.kind === 'const' && term.kind === 'const') {
      return JSON.stringify(pattern.value) === JSON.stringify(term.value);
    }
    if (pattern.kind === 'call' && term.kind === 'call') {
      if (pattern.fn !== term.fn) return false;
      if (pattern.args.length !== term.args.length) return false;
      // For AC functions, try matching in sorted order
      if (AC_FUNCTIONS.has(pattern.fn)) {
        const pSorted = [...pattern.args].sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
        const tSorted = [...term.args].sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
        return pSorted.every((p, i) => this.matchRec(p, tSorted[i], bindings));
      }
      return pattern.args.every((p, i) => this.matchRec(p, term.args[i], bindings));
    }
    if (pattern.kind === 'field' && term.kind === 'field') {
      return pattern.field === term.field && this.matchRec(pattern.of, term.of, bindings);
    }
    return false;
  }

  private substitute(term: Term, bindings: Map<string, Term>): Term {
    if (term.kind === 'var') return bindings.get(term.name) ?? term;
    if (term.kind === 'call') return { kind: 'call', fn: term.fn, args: term.args.map(a => this.substitute(a, bindings)) };
    if (term.kind === 'field') return { kind: 'field', of: this.substitute(term.of, bindings), field: term.field };
    return term;
  }
}

/** Functions that are associative and commutative. */
const AC_FUNCTIONS = new Set(['add', 'mul', 'combine', 'union']);

// ============================================================================
// Canonicalizer — standalone (no e-graph needed)
// ============================================================================

export function canonicalizeTerm(term: Term): Term {
  if (term.kind === 'var' || term.kind === 'const') return term;
  if (term.kind === 'field') return { kind: 'field', of: canonicalizeTerm(term.of), field: term.field };
  if (term.kind === 'call') {
    const args = term.args.map(canonicalizeTerm);
    if (AC_FUNCTIONS.has(term.fn)) {
      args.sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
    }
    return { kind: 'call', fn: term.fn, args };
  }
  return term;
}

/** Are two terms semantically equivalent (after AC canonicalization)? */
export function equivalent(a: Term, b: Term): boolean {
  return JSON.stringify(canonicalizeTerm(a)) === JSON.stringify(canonicalizeTerm(b));
}

// ============================================================================
// Standard rewrite rules
// ============================================================================

export const STANDARD_REWRITE_RULES: RewriteRule[] = [
  {
    name: 'add_zero_left',
    pattern: { kind: 'call', fn: 'add', args: [{ kind: 'const', value: 0 }, { kind: 'var', name: 'x' }] },
    replacement: { kind: 'var', name: 'x' },
  },
  {
    name: 'add_zero_right',
    pattern: { kind: 'call', fn: 'add', args: [{ kind: 'var', name: 'x' }, { kind: 'const', value: 0 }] },
    replacement: { kind: 'var', name: 'x' },
  },
  {
    name: 'mul_one_left',
    pattern: { kind: 'call', fn: 'mul', args: [{ kind: 'const', value: 1 }, { kind: 'var', name: 'x' }] },
    replacement: { kind: 'var', name: 'x' },
  },
  {
    name: 'mul_one_right',
    pattern: { kind: 'call', fn: 'mul', args: [{ kind: 'var', name: 'x' }, { kind: 'const', value: 1 }] },
    replacement: { kind: 'var', name: 'x' },
  },
];
