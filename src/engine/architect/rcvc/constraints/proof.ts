/**
 * Proof Objects — evidence that an Architect operation was justified
 *
 * When the Architect places a bridge, it does not merely report
 * "Bridge placed successfully." It retains a proof object:
 *
 *   Placement justification:
 *     - Connected required endpoints
 *     - Maximum slope satisfied
 *     - Terrain support validated
 *     - Collider generated
 *     - Navigation remained connected
 *     - No quest-critical asset intersected
 *     - Triangle and draw-call budgets satisfied
 *     - Cultural blueprint rule 14 satisfied
 *   Inputs:
 *     - User lasso selection
 *     - Asset bridge.stone.arch.04
 *     - Region blueprint
 *     - Terrain revision 1882
 *   Solver/procedure trace:
 *     - Candidate placements evaluated: 36
 *     - Valid candidates: 4
 *     - Selected candidate: lowest terrain modification cost
 *
 * No forbidden functions. No Three.js, no DOM.
 */

import type { EntityId } from '../../../kernel/types';
import type {
  ProofObject,
  JustificationNode,
  ProofInput,
  SolverTrace,
  ValidationCheck,
  ProofOperationInput,
  CandidateModel,
} from '../types';
import { createHash } from 'crypto';

// ============================================================================
// Proof builder
// ============================================================================

export interface ProofBuilder {
  setOperationLabel(label: string): void;
  setTick(tick: number): void;
  addJustification(node: JustificationNode): void;
  addInput(label: string, value: string, revision?: string): void;
  setSolverTrace(trace: SolverTrace): void;
  addValidationCheck(check: ValidationCheck): void;
  setVerdict(verdict: ProofObject['verdict']): void;
  build(): ProofObject;
}

export function createProofBuilder(): ProofBuilder {
  let operationLabel = '';
  let tick = 0;
  const justifications: JustificationNode[] = [];
  const inputs: ProofInput[] = [];
  let solverTrace: SolverTrace | null = null;
  const validationChecks: ValidationCheck[] = [];
  let verdict: ProofObject['verdict'] = 'inconclusive';

  return {
    setOperationLabel(label: string) { operationLabel = label; },
    setTick(t: number) { tick = t; },
    addJustification(node: JustificationNode) { justifications.push(node); },
    addInput(label: string, value: string, revision?: string) { inputs.push({ label, value, revision }); },
    setSolverTrace(trace: SolverTrace) { solverTrace = trace; },
    addValidationCheck(check: ValidationCheck) { validationChecks.push(check); },
    setVerdict(v: ProofObject['verdict']) { verdict = v; },
    build(): ProofObject {
      return {
        proofId: 'proof-' + createHash('sha256').update(operationLabel + tick + Date.now()).digest('hex').slice(0, 12),
        operationLabel,
        timestamp: new Date().toISOString(),
        tick,
        justifications,
        inputs,
        solverTrace: solverTrace ?? {
          solverName: 'none',
          candidatesEvaluated: 0,
          validCandidates: 0,
          selectedCandidate: 'n/a',
          selectionCriterion: 'no solver invoked',
          iterations: 0,
          wallTimeMs: 0,
        },
        validationChecks,
        verdict,
      };
    },
  };
}

// ============================================================================
// Proof from operation input
// ============================================================================

export function buildProofFromInput(input: ProofOperationInput): ProofObject {
  const builder = createProofBuilder();
  builder.setOperationLabel(input.label);
  builder.setTick(input.tick);
  for (const j of input.justifications) builder.addJustification(j);
  for (const i of input.inputs) builder.addInput(i.label, i.value, i.revision);
  builder.setSolverTrace(input.solverTrace);
  for (const c of input.validationChecks) builder.addValidationCheck(c);

  // Auto-derive verdict from checks
  const allJustPassed = input.justifications.every(n => n.passed || n.children?.some(c => c.passed));
  const allValidationPassed = input.validationChecks.every(c => c.passed);
  if (allJustPassed && allValidationPassed) {
    builder.setVerdict('proved');
  } else if (input.validationChecks.some(c => !c.passed)) {
    builder.setVerdict('refuted');
  } else {
    builder.setVerdict('plausible');
  }

  return builder.build();
}

// ============================================================================
// Proof inspection
// ============================================================================

export function isProofComplete(proof: ProofObject): boolean {
  return proof.verdict === 'proved';
}

export function proofSummary(proof: ProofObject): string {
  const lines: string[] = [];
  lines.push(`PROOF: ${proof.operationLabel}`);
  lines.push(`  Verdict: ${proof.verdict}`);
  lines.push(`  Tick: ${proof.tick}`);
  lines.push(`  Inputs:`);
  for (const i of proof.inputs) {
    lines.push(`    - ${i.label}: ${i.value}${i.revision ? ` (rev ${i.revision})` : ''}`);
  }
  lines.push(`  Solver: ${proof.solverTrace.solverName}`);
  lines.push(`    Candidates: ${proof.solverTrace.candidatesEvaluated} evaluated, ${proof.solverTrace.validCandidates} valid`);
  lines.push(`    Selected: ${proof.solverTrace.selectedCandidate} (${proof.solverTrace.selectionCriterion})`);
  lines.push(`  Justifications:`);
  for (const j of proof.justifications) {
    lines.push(`    [${j.passed ? '✓' : '✗'}] ${j.checkName}: ${j.message}`);
    if (j.children) {
      for (const c of j.children) {
        lines.push(`      [${c.passed ? '✓' : '✗'}] ${c.checkName}: ${c.message}`);
      }
    }
  }
  lines.push(`  Validation:`);
  for (const c of proof.validationChecks) {
    lines.push(`    [${c.passed ? '✓' : '✗'}] ${c.name}: ${c.message}`);
  }
  return lines.join('\n');
}

// ============================================================================
// Standard justification factories
// ============================================================================

export function justifyConnectedEndpoints(connected: boolean): JustificationNode {
  return {
    checkName: 'connected_required_endpoints',
    passed: connected,
    message: connected ? 'Bridge connects both required endpoints' : 'Bridge does not connect required endpoints',
  };
}

export function justifySlope(maxSlopeDeg: number, limitDeg: number): JustificationNode {
  const passed = maxSlopeDeg <= limitDeg;
  return {
    checkName: 'maximum_slope',
    passed,
    message: passed
      ? `Maximum slope ${maxSlopeDeg.toFixed(1)}° within limit ${limitDeg}°`
      : `Maximum slope ${maxSlopeDeg.toFixed(1)}° exceeds limit ${limitDeg}°`,
  };
}

export function justifyTerrainSupport(supported: boolean): JustificationNode {
  return {
    checkName: 'terrain_support',
    passed: supported,
    message: supported ? 'All support points rest on valid terrain' : 'One or more support points lack terrain',
  };
}

export function justifyNavigationIntact(intact: boolean): JustificationNode {
  return {
    checkName: 'navigation_connected',
    passed: intact,
    message: intact ? 'Navigation graph remains connected' : 'Navigation graph broken by placement',
  };
}

export function justifyNoQuestIntersection(clear: boolean): JustificationNode {
  return {
    checkName: 'no_quest_intersection',
    passed: clear,
    message: clear ? 'No quest-critical asset intersected' : 'Quest-critical asset intersected',
  };
}

export function justifyBudgets(triangles: number, drawCalls: number, triBudget: number, dcBudget: number): JustificationNode {
  const triOk = triangles <= triBudget;
  const dcOk = drawCalls <= dcBudget;
  return {
    checkName: 'budgets_satisfied',
    passed: triOk && dcOk,
    message: `Triangles ${triangles}/${triBudget}, draw calls ${drawCalls}/${dcBudget}`,
    children: [
      { checkName: 'triangle_budget', passed: triOk, message: `${triangles} ≤ ${triBudget}` },
      { checkName: 'draw_call_budget', passed: dcOk, message: `${drawCalls} ≤ ${dcBudget}` },
    ],
  };
}

export function justifyCulturalRule(ruleNumber: number, satisfied: boolean, ruleText: string): JustificationNode {
  return {
    checkName: `cultural_blueprint_rule_${ruleNumber}`,
    passed: satisfied,
    message: satisfied ? `Rule ${ruleNumber} satisfied: ${ruleText}` : `Rule ${ruleNumber} violated: ${ruleText}`,
  };
}

// ============================================================================
// Solver trace from result
// ============================================================================

export function traceFromBacktracking(result: {
  candidatesEvaluated: number;
  validCount: number;
  iterations: number;
  wallTimeMs: number;
  model?: CandidateModel;
}): SolverTrace {
  return {
    solverName: 'backtracking',
    candidatesEvaluated: result.candidatesEvaluated,
    validCandidates: result.validCount,
    selectedCandidate: result.model?.modelId ?? 'none',
    selectionCriterion: 'first valid (least-committal)',
    iterations: result.iterations,
    wallTimeMs: result.wallTimeMs,
  };
}

export function traceFromProcedural(result: {
  candidatesEvaluated: number;
  validCount: number;
  iterations: number;
  wallTimeMs: number;
  model?: CandidateModel;
}): SolverTrace {
  return {
    solverName: 'procedural',
    candidatesEvaluated: result.candidatesEvaluated,
    validCandidates: result.validCount,
    selectedCandidate: result.model?.modelId ?? 'none',
    selectionCriterion: 'lowest cost among valid candidates',
    iterations: result.iterations,
    wallTimeMs: result.wallTimeMs,
  };
}
