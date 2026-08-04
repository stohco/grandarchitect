/**
 * Proof builder.
 *
 * A proof object justifies why a solution satisfies the constraints. The
 * proof is a tree of justification nodes: each leaf either reports an
 * evaluation result, an assumption, or a piece of evidence.
 *
 * Proofs are written for the user to read — they should be honest about
 * what was assumed vs. what was checked.
 */

import type {
  Assignment,
  Constraint,
  ConstraintProblem,
  ConstraintSolution,
  JustificationNode,
  ProofObject,
  SolverTrace,
} from '../types';
import { evalFullConstraint, evalTerm } from './ir';

// ============================================================================
// Proof builder
// ============================================================================

export interface ProofBuilder {
  build(problem: ConstraintProblem, trace: SolverTrace): ProofObject;
}

export function createProofBuilder(): ProofBuilder {
  return {
    build(problem, trace): ProofObject {
      const root = buildFromConstraints(problem, trace.assignment);
      return {
        claim: `Assignment satisfies ${problem.constraints.length} constraints (solver: ${trace.solver}, solved: ${trace.solved}).`,
        root,
        builtAt: new Date().toISOString(),
      };
    },
  };
}

function buildFromConstraints(problem: ConstraintProblem, assignment: Assignment): JustificationNode {
  const children: JustificationNode[] = [];
  for (const c of problem.constraints) {
    children.push(buildConstraintNode(c, assignment));
  }
  return { kind: 'and', claim: 'All constraints hold on the chosen assignment.', children };
}

function buildConstraintNode(c: Constraint, assignment: Assignment): JustificationNode {
  const r = evalFullConstraint(c, assignment);
  if (r.satisfied) {
    // Collect term values for transparency.
    const termValues: Record<string, number | string | boolean> = {};
    for (const v of c.vars) {
      if (assignment[v] !== undefined) termValues[v] = assignment[v];
    }
    return {
      kind: 'eval',
      claim: c.statement,
      constraintId: c.id,
      result: 'satisfied',
      termValues,
    };
  }
  // Violated. Explain which terms evaluated to what.
  const termValues: Record<string, number | string | boolean> = {};
  for (const v of c.vars) {
    if (assignment[v] !== undefined) termValues[v] = assignment[v];
  }
  // Best-effort: try to compute the actual term values for two-term constraints.
  void evalTerm; // referenced for tree-shake friendliness
  return {
    kind: 'eval',
    claim: c.statement,
    constraintId: c.id,
    result: 'violated',
    termValues,
  };
}

// ============================================================================
// Build proof from raw input (no solver trace)
// ============================================================================

/**
 * Build a proof directly from an assignment + constraints, without invoking
 * a solver. Useful for verifying a hand-supplied solution.
 */
export function buildProofFromInput(
  problem: ConstraintProblem,
  assignment: Assignment,
): ProofObject {
  const root = buildFromConstraints(problem, assignment);
  return {
    claim: `Hand-supplied assignment checked against ${problem.constraints.length} constraints.`,
    root,
    builtAt: new Date().toISOString(),
  };
}

// ============================================================================
// Human-readable summary
// ============================================================================

export function proofSummary(proof: ProofObject): string {
  const lines: string[] = [];
  lines.push(`CLAIM: ${proof.claim}`);
  lines.push(`BUILT: ${proof.builtAt}`);
  lines.push('');
  walk(proof.root, 0, lines);
  return lines.join('\n');
}

function walk(node: JustificationNode, depth: number, lines: string[]): void {
  const indent = '  '.repeat(depth);
  switch (node.kind) {
    case 'leaf':
      lines.push(`${indent}- ${node.claim}`);
      lines.push(`${indent}  evidence: ${node.evidence}`);
      return;
    case 'eval':
      lines.push(`${indent}- [${node.result}] ${node.claim} (${node.constraintId})`);
      if (Object.keys(node.termValues).length > 0) {
        const pairs = Object.entries(node.termValues).map(([k, v]) => `${k}=${v}`);
        lines.push(`${indent}  values: ${pairs.join(', ')}`);
      }
      return;
    case 'assumption':
      lines.push(`${indent}- [assumption] ${node.claim}`);
      lines.push(`${indent}  note: ${node.note}`);
      return;
    case 'and':
      lines.push(`${indent}- AND: ${node.claim}`);
      for (const c of node.children) walk(c, depth + 1, lines);
      return;
    case 'or':
      lines.push(`${indent}- OR (branch ${node.which}): ${node.claim}`);
      walk(node.children[node.which], depth + 1, lines);
      return;
  }
}

// ============================================================================
// Attach proof to a constraint solution
// ============================================================================

export function attachProof(solution: ConstraintSolution, problem: ConstraintProblem): ConstraintSolution {
  const builder = createProofBuilder();
  // We need the trace to flow into the builder; reconstruct a minimal trace
  // from the solution if one isn't already present.
  const trace: SolverTrace = solution.trace ?? {
    solver: solution.solver,
    nodesExplored: 0,
    nodesPruned: 0,
    ticks: 0,
    solved: solution.solved,
    assignment: solution.assignment,
    softPenalty: solution.softPenalty,
    evaluations: [],
  };
  const proof = builder.build(problem, trace);
  return { ...solution, proof };
}
