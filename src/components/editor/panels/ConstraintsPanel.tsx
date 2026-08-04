/**
 * Live Architect Studio — Constraints Panel (RCVC: C)
 *
 * Constraint solver + proof viewer.
 *   GET  /api/architect/constraints      → returns a sample sect-layout problem
 *   POST /api/architect/constraints      → solves the problem, returns {ok, model?, proof, failureReason?}
 *
 * The proof object (justifications tree, solver trace, validation checks,
 * inputs) is rendered in monospace with ✓/✗ colour-coded markers.
 */

'use client';

import { useState, useCallback } from 'react';
import {
  GitBranch,
  Loader2,
  Play,
  Download,
  Check,
  AlertTriangle,
  Variable,
  Box,
  FileSearch,
  ScrollText,
  ShieldCheck,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

// ----------------------------------------------------------------------------
// Local types — mirror RCVC engine types without coupling the client.
// ----------------------------------------------------------------------------

type ValueDomain =
  | { kind: 'int_range'; min: number; max: number }
  | { kind: 'float_range'; min: number; max: number }
  | { kind: 'enum'; values: string[] }
  | { kind: 'bool' }
  | { kind: 'vec2'; min: [number, number]; max: [number, number] }
  | { kind: 'vec3'; min: [number, number, number]; max: [number, number, number] }
  | { kind: 'entity_set'; fromTag?: string };

interface ConstraintVar {
  name: string;
  domain: ValueDomain;
}

interface Constraint {
  id: string;
  label: string;
  kind: string;
  variables: string[];
  hard: boolean;
  weight?: number;
  // expression is opaque for display — we just stringify it
  expression: unknown;
}

interface ConstraintProblem {
  variables: ConstraintVar[];
  constraints: Constraint[];
  objective?: string;
}

interface SampleResponse {
  problem: ConstraintProblem;
  description?: string;
}

interface CandidateModel {
  modelId: string;
  assignments: Record<string, unknown>;
  candidateCount: number;
  validCount: number;
  selectionRationale: string;
}

interface JustificationNode {
  checkName: string;
  passed: boolean;
  message: string;
  details?: Record<string, unknown>;
  children?: JustificationNode[];
}

interface ProofInput {
  label: string;
  value: string;
  revision?: string;
}

interface SolverTrace {
  solverName: string;
  candidatesEvaluated: number;
  validCandidates: number;
  selectedCandidate: string;
  selectionCriterion: string;
  iterations: number;
  wallTimeMs: number;
}

interface ValidationCheck {
  name: string;
  passed: boolean;
  message: string;
}

interface ProofObject {
  proofId: string;
  operationLabel: string;
  timestamp: string;
  tick: number;
  justifications: JustificationNode[];
  inputs: ProofInput[];
  solverTrace: SolverTrace;
  validationChecks: ValidationCheck[];
  verdict: 'proved' | 'plausible' | 'refuted' | 'inconclusive';
}

interface ConstraintSolution {
  ok: boolean;
  model?: CandidateModel;
  proof: ProofObject;
  failureReason?: string;
}

// ----------------------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------------------

function formatDomain(d: ValueDomain): string {
  switch (d.kind) {
    case 'int_range':
      return `int[${d.min}..${d.max}]`;
    case 'float_range':
      return `float[${d.min}..${d.max}]`;
    case 'enum':
      return `enum{${d.values.join(',')}}`;
    case 'bool':
      return 'bool';
    case 'vec2':
      return `vec2[${d.min}..${d.max}]`;
    case 'vec3':
      return `vec3[${d.min}..${d.max}]`;
    case 'entity_set':
      return `entity_set${d.fromTag ? `(@${d.fromTag})` : ''}`;
    default:
      return (d as { kind: string }).kind;
  }
}

function formatAssignment(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map((v) => (typeof v === 'number' ? v.toFixed(2) : String(v))).join(', ')}]`;
  }
  if (typeof value === 'number') {
    return Number.isInteger(value) ? String(value) : value.toFixed(3);
  }
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (value === null) return 'null';
  if (value === undefined) return '∅';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

function renderJustification(node: JustificationNode, depth: number): React.ReactNode {
  return (
    <div key={`${node.checkName}-${depth}`} style={{ paddingLeft: depth * 12 }}>
      <div className="flex items-start gap-1.5 py-0.5">
        <span className={`font-mono text-[11px] ${node.passed ? 'text-emerald-400' : 'text-red-400'}`}>
          {node.passed ? '✓' : '✗'}
        </span>
        <span className="font-mono text-[10px] text-[#aaaacc]">{node.checkName}</span>
        <span className="truncate font-mono text-[10px] text-[#5a5a7a]" title={node.message}>
          — {node.message}
        </span>
      </div>
      {node.children?.map((child, i) => (
        <div key={i}>{renderJustification(child, depth + 1)}</div>
      ))}
    </div>
  );
}

// ----------------------------------------------------------------------------
// Panel
// ----------------------------------------------------------------------------

export default function ConstraintsPanel() {
  const [problem, setProblem] = useState<ConstraintProblem | null>(null);
  const [solution, setSolution] = useState<ConstraintSolution | null>(null);
  const [loadingProblem, setLoadingProblem] = useState(false);
  const [solving, setSolving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadSample = useCallback(async () => {
    setLoadingProblem(true);
    setError(null);
    setSolution(null);
    try {
      const res = await fetch('/api/architect/constraints');
      const json = (await res.json()) as SampleResponse & { error?: string };
      if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
      setProblem(json.problem);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load sample problem');
    } finally {
      setLoadingProblem(false);
    }
  }, []);

  const solve = useCallback(async () => {
    if (!problem) return;
    setSolving(true);
    setError(null);
    setSolution(null);
    try {
      const res = await fetch('/api/architect/constraints', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(problem),
      });
      const json = (await res.json()) as ConstraintSolution & { error?: string };
      if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
      setSolution(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Solver failed');
    } finally {
      setSolving(false);
    }
  }, [problem]);

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-[#2a2a4a] px-3 py-1.5">
        <GitBranch className="h-3.5 w-3.5 text-emerald-400" />
        <span className="text-[11px] font-semibold uppercase tracking-wider text-[#8888aa]">
          Constraint Solver · Proof
        </span>
        {problem && (
          <Badge variant="outline" className="h-4 border-[#2a2a4a] bg-[#1a1a2e] text-[9px] text-emerald-300">
            {problem.variables.length} vars · {problem.constraints.length} constraints
          </Badge>
        )}
        {solution && (
          <Badge
            className={`h-4 px-1 text-[9px] ${
              solution.ok
                ? 'bg-emerald-500/20 text-emerald-300'
                : 'bg-red-500/20 text-red-300'
            }`}
          >
            {solution.ok ? 'SOLVED' : 'NO SOLUTION'}
          </Badge>
        )}
      </div>

      {/* Action bar */}
      <div className="flex items-center gap-2 border-b border-[#2a2a4a] px-2 py-1.5">
        <Button
          variant="outline"
          size="sm"
          className="h-6 gap-1 border-[#2a2a4a] bg-[#1a1a2e] text-[10px] text-[#8888aa] hover:text-emerald-300 hover:border-emerald-500/40"
          onClick={loadSample}
          disabled={loadingProblem || solving}
        >
          {loadingProblem ? <Loader2 className="h-3 w-3 animate-spin" /> : <Download className="h-3 w-3" />}
          Load Sample Problem
        </Button>
        <Button
          size="sm"
          className="h-6 gap-1 bg-emerald-600 px-2 text-[10px] text-white hover:bg-emerald-500"
          onClick={solve}
          disabled={!problem || solving || loadingProblem}
        >
          {solving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Play className="h-3 w-3" />}
          Solve
        </Button>
        {problem?.objective && (
          <span className="text-[9px] text-[#5a5a7a]">
            objective: <span className="font-mono text-[#8888aa]">{problem.objective}</span>
          </span>
        )}
      </div>

      {/* Body: two-column */}
      <ScrollArea className="min-h-0 flex-1">
        <div className="grid grid-cols-2 gap-2 p-2">
          {/* LEFT: problem definition */}
          <div className="space-y-2">
            <div>
              <div className="mb-1 flex items-center gap-1 text-[9px] font-semibold uppercase tracking-wider text-[#5a5a7a]">
                <Variable className="h-2.5 w-2.5" />
                Variables
              </div>
              {!problem ? (
                <div className="rounded border border-dashed border-[#2a2a4a] px-2 py-3 text-center text-[10px] text-[#4a4a6a]">
                  No problem loaded. Click <span className="text-emerald-300">Load Sample Problem</span>.
                </div>
              ) : (
                <div className="space-y-0.5 rounded border border-[#2a2a4a] bg-[#0a0a1e] p-1.5">
                  {problem.variables.map((v) => (
                    <div key={v.name} className="flex items-baseline gap-2 font-mono text-[10px]">
                      <span className="text-emerald-300">{v.name}</span>
                      <span className="text-[#5a5a7a]">:</span>
                      <span className="text-[#aaaacc]">{formatDomain(v.domain)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <div className="mb-1 flex items-center gap-1 text-[9px] font-semibold uppercase tracking-wider text-[#5a5a7a]">
                <Box className="h-2.5 w-2.5" />
                Constraints
              </div>
              {!problem ? null : (
                <div className="space-y-0.5">
                  {problem.constraints.map((c) => (
                    <div key={c.id} className="rounded border border-[#2a2a4a] bg-[#0a0a1e] px-1.5 py-1">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            c.hard ? 'bg-red-400' : 'bg-amber-400'
                          }`}
                          title={c.hard ? 'hard' : 'soft'}
                        />
                        <span className="font-mono text-[10px] text-emerald-300">{c.id}</span>
                        <span className="truncate text-[10px] text-[#c8c8e0]" title={c.label}>
                          {c.label}
                        </span>
                        <span className="ml-auto rounded bg-[#1a1a2e] px-1 text-[8px] text-[#5a5a7a]">
                          {c.kind}
                        </span>
                      </div>
                      <div className="mt-0.5 truncate font-mono text-[9px] text-[#5a5a7a]">
                        vars: {c.variables.join(', ')}
                        {c.weight !== undefined ? ` · w=${c.weight}` : ''}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Solution model */}
            {solution?.model && (
              <div>
                <div className="mb-1 flex items-center gap-1 text-[9px] font-semibold uppercase tracking-wider text-[#5a5a7a]">
                  <Check className="h-2.5 w-2.5 text-emerald-400" />
                  Candidate Model
                </div>
                <div className="rounded border border-emerald-500/30 bg-emerald-500/5 p-1.5">
                  <div className="mb-1 flex items-center justify-between text-[9px] text-[#5a5a7a]">
                    <span className="font-mono text-emerald-300">{solution.model.modelId}</span>
                    <span className="font-mono">
                      valid <span className="text-emerald-300">{solution.model.validCount}</span>/
                      {solution.model.candidateCount}
                    </span>
                  </div>
                  <table className="w-full font-mono text-[10px]">
                    <tbody>
                      {Object.entries(solution.model.assignments).map(([k, v]) => (
                        <tr key={k} className="border-b border-[#1a1a2e] last:border-0">
                          <td className="py-0.5 pr-2 text-emerald-300">{k}</td>
                          <td className="py-0.5 text-[#c8c8e0]">=</td>
                          <td className="py-0.5 text-[#aaaacc]">{formatAssignment(v)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="mt-1 text-[9px] italic text-[#5a5a7a]">
                    {solution.model.selectionRationale}
                  </div>
                </div>
              </div>
            )}

            {solution && !solution.ok && solution.failureReason && (
              <div className="flex items-start gap-2 rounded border border-red-500/40 bg-red-500/10 px-2 py-1.5 text-[11px] text-red-300">
                <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
                <div>
                  <div className="font-semibold">Solver failed</div>
                  <div className="font-mono text-[10px] text-red-200/80">{solution.failureReason}</div>
                </div>
              </div>
            )}
          </div>

          {/* RIGHT: proof object */}
          <div className="space-y-2">
            {!solution ? (
              <div className="rounded border border-dashed border-[#2a2a4a] px-2 py-4 text-center text-[10px] text-[#4a4a6a]">
                {error ? (
                  <span className="text-red-300">{error}</span>
                ) : (
                  <>
                    Load a problem and click <span className="text-emerald-300">Solve</span> to see the proof object.
                  </>
                )}
              </div>
            ) : (
              <>
                {/* Proof header */}
                <div className="rounded border border-[#2a2a4a] bg-[#0a0a1e] p-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <FileSearch className="h-3 w-3 text-emerald-400" />
                      <span className="font-mono text-[10px] text-emerald-300">
                        {solution.proof.proofId}
                      </span>
                    </div>
                    <Badge
                      className={`h-4 px-1 text-[9px] ${
                        solution.proof.verdict === 'proved'
                          ? 'bg-emerald-500/20 text-emerald-300'
                          : solution.proof.verdict === 'refuted'
                          ? 'bg-red-500/20 text-red-300'
                          : solution.proof.verdict === 'plausible'
                          ? 'bg-amber-500/20 text-amber-300'
                          : 'bg-zinc-500/20 text-zinc-300'
                      }`}
                    >
                      {solution.proof.verdict}
                    </Badge>
                  </div>
                  <div className="mt-0.5 truncate text-[9px] text-[#5a5a7a]">
                    {solution.proof.operationLabel} · tick {solution.proof.tick}
                  </div>
                </div>

                {/* Solver trace */}
                <div>
                  <div className="mb-1 flex items-center gap-1 text-[9px] font-semibold uppercase tracking-wider text-[#5a5a7a]">
                    <ScrollText className="h-2.5 w-2.5" />
                    Solver Trace
                  </div>
                  <div className="rounded border border-[#2a2a4a] bg-[#0a0a1e] p-1.5 font-mono text-[10px] leading-snug">
                    <div className="text-[#8888aa]">
                      solver: <span className="text-emerald-300">{solution.proof.solverTrace.solverName}</span>
                    </div>
                    <div className="text-[#8888aa]">
                      candidates evaluated: <span className="text-[#c8c8e0]">{solution.proof.solverTrace.candidatesEvaluated}</span>
                    </div>
                    <div className="text-[#8888aa]">
                      valid candidates: <span className="text-emerald-300">{solution.proof.solverTrace.validCandidates}</span>
                    </div>
                    <div className="text-[#8888aa]">
                      selected: <span className="text-emerald-300">{solution.proof.solverTrace.selectedCandidate}</span>
                    </div>
                    <div className="text-[#8888aa]">
                      criterion: <span className="text-[#aaaacc]">{solution.proof.solverTrace.selectionCriterion}</span>
                    </div>
                    <div className="text-[#8888aa]">
                      iterations: <span className="text-[#c8c8e0]">{solution.proof.solverTrace.iterations}</span>
                      <span className="ml-2">
                        wall: <span className="text-[#c8c8e0]">{solution.proof.solverTrace.wallTimeMs.toFixed(2)}ms</span>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Justifications tree */}
                <div>
                  <div className="mb-1 flex items-center gap-1 text-[9px] font-semibold uppercase tracking-wider text-[#5a5a7a]">
                    <FileSearch className="h-2.5 w-2.5" />
                    Justifications
                  </div>
                  <div className="rounded border border-[#2a2a4a] bg-[#0a0a1e] p-1.5">
                    {solution.proof.justifications.length === 0 ? (
                      <div className="text-[10px] text-[#4a4a6a]">no justifications</div>
                    ) : (
                      solution.proof.justifications.map((node, i) => (
                        <div key={i}>{renderJustification(node, 0)}</div>
                      ))
                    )}
                  </div>
                </div>

                {/* Validation checks */}
                {solution.proof.validationChecks.length > 0 && (
                  <div>
                    <div className="mb-1 flex items-center gap-1 text-[9px] font-semibold uppercase tracking-wider text-[#5a5a7a]">
                      <ShieldCheck className="h-2.5 w-2.5" />
                      Validation Checks
                    </div>
                    <div className="rounded border border-[#2a2a4a] bg-[#0a0a1e] p-1.5">
                      {solution.proof.validationChecks.map((c, i) => (
                        <div key={i} className="flex items-start gap-1.5 py-0.5 font-mono text-[10px]">
                          <span className={c.passed ? 'text-emerald-400' : 'text-red-400'}>
                            {c.passed ? '✓' : '✗'}
                          </span>
                          <span className="text-[#aaaacc]">{c.name}</span>
                          <span className="truncate text-[#5a5a7a]" title={c.message}>
                            — {c.message}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Inputs */}
                {solution.proof.inputs.length > 0 && (
                  <div>
                    <div className="mb-1 flex items-center gap-1 text-[9px] font-semibold uppercase tracking-wider text-[#5a5a7a]">
                      <Variable className="h-2.5 w-2.5" />
                      Inputs
                    </div>
                    <div className="rounded border border-[#2a2a4a] bg-[#0a0a1e] p-1.5 font-mono text-[10px]">
                      {solution.proof.inputs.map((inp, i) => (
                        <div key={i} className="flex items-baseline gap-2 py-0.5">
                          <span className="text-emerald-300">{inp.label}</span>
                          <span className="text-[#5a5a7a]">=</span>
                          <span className="text-[#c8c8e0]">{inp.value}</span>
                          {inp.revision && (
                            <span className="text-[8px] text-[#4a4a6a]">@{inp.revision}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
