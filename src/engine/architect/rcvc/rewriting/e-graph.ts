/** E-Graph with AC canonicalization — optional rewrite/equivalence engine. */
import type { Term, RewriteRule } from '../types';

const AC_FUNCTIONS = new Set(['add', 'mul', 'combine', 'union']);

export class EGraph {
  private nodes: Map<string, number> = new Map();
  private classes: Map<number, Set<string>> = new Map();
  private nextId = 0;

  add(term: Term): number {
    const key = this.canonicalizeKey(term);
    const existing = this.nodes.get(key);
    if (existing !== undefined) return existing;
    const id = this.nextId++;
    this.nodes.set(key, id);
    if (!this.classes.has(id)) this.classes.set(id, new Set());
    this.classes.get(id)!.add(key);
    if (term.kind === 'call') term.args.forEach(a => this.add(a));
    return id;
  }

  merge(a: number, b: number): number {
    if (a === b) return a;
    const keep = Math.min(a, b); const drop = Math.max(a, b);
    const dropMembers = this.classes.get(drop);
    if (dropMembers) { for (const key of dropMembers) { this.nodes.set(key, keep); this.classes.get(keep)?.add(key); } this.classes.delete(drop); }
    return keep;
  }

  canonicalize(term: Term): Term {
    if (term.kind === 'var' || term.kind === 'const') return term;
    if (term.kind === 'field') return { kind: 'field', of: this.canonicalize(term.of), field: term.field };
    if (term.kind === 'call') {
      const args = term.args.map(a => this.canonicalize(a));
      if (AC_FUNCTIONS.has(term.fn)) args.sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
      return { kind: 'call', fn: term.fn, args };
    }
    return term;
  }

  private canonicalizeKey(term: Term): string { return JSON.stringify(this.canonicalize(term)); }
}

export function canonicalizeTerm(term: Term): Term {
  if (term.kind === 'var' || term.kind === 'const') return term;
  if (term.kind === 'field') return { kind: 'field', of: canonicalizeTerm(term.of), field: term.field };
  if (term.kind === 'call') {
    const args = term.args.map(canonicalizeTerm);
    if (AC_FUNCTIONS.has(term.fn)) args.sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
    return { kind: 'call', fn: term.fn, args };
  }
  return term;
}

export function equivalent(a: Term, b: Term): boolean {
  return JSON.stringify(canonicalizeTerm(a)) === JSON.stringify(canonicalizeTerm(b));
}

export const STANDARD_REWRITE_RULES: RewriteRule[] = [
  { name: 'add_zero_left', pattern: { kind: 'call', fn: 'add', args: [{ kind: 'const', value: 0 }, { kind: 'var', name: 'x' }] }, replacement: { kind: 'var', name: 'x' } },
  { name: 'add_zero_right', pattern: { kind: 'call', fn: 'add', args: [{ kind: 'var', name: 'x' }, { kind: 'const', value: 0 }] }, replacement: { kind: 'var', name: 'x' } },
  { name: 'mul_one_left', pattern: { kind: 'call', fn: 'mul', args: [{ kind: 'const', value: 1 }, { kind: 'var', name: 'x' }] }, replacement: { kind: 'var', name: 'x' } },
  { name: 'mul_one_right', pattern: { kind: 'call', fn: 'mul', args: [{ kind: 'var', name: 'x' }, { kind: 'const', value: 1 }] }, replacement: { kind: 'var', name: 'x' } },
];
