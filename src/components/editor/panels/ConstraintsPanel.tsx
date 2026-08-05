'use client';

/**
 * ConstraintsPanel — RCVC constraint solver UI.
 *
 * "Load Sample" GETs /api/architect/constraints; "Solve" POSTs the loaded
 * problem to the same route. The solver returns an assignment, a proof
 * object (justification tree), and a solver trace.
 *
 * Layout:
 *   - Top toolbar: Load Sample + Solve buttons, problem description
 *   - Variables + Constraints sections (read from loaded problem)
 *   - Solution: status banner, candidate-model assignment table
 *   - Proof: justification tree (✓/✗), solver trace, validation checks
 *     (all in mono font)
 */

import { useCallback, useState } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Download,
  Play,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Braces,
  FileCode2,
  ListChecks,
  Sigma,
} from 'lucide-react';

interface ValueDomain {
  kind: 'int' | 'float' | 'enum' | 'bool';
  min?: number;
  max?: number;
  values?: string[];
}

interface ConstraintVar {
  name: string;
  domain: ValueDomain;
  description?: string;
  tag?: string;
}

interface Term {
  t: string;
  name?: string;
  value?: number;
  a?: Term;
  b?: Term;
}

interface ConstraintExpression {
  t: string;
  a?: Term;
  b?: Term;
  varName?: string;
}

interface Constraint {
  id: string;
  statement: string;
  vars: string[];
  expr: ConstraintExpression;
  weight: 'hard' | 'soft';
  penalty?: number;
}

interface SampleProblem {
  variables: ConstraintVar[];
  constraints: Constraint[];
  objective?: string;
}

interface SampleResponse {
  problem: SampleProblem;
  description: string;
}

type Assignment = Record<string, number | string | boolean>;

interface JustificationNode {
  kind: 'leaf' | 'eval' | 'and' | 'or' | 'assumption';
  claim: string;
  evidence?: string;
  constraintId?: string;
  result?: 'satisfied' | 'violated';
  termValues?: Record<string, number | string | boolean>;
  children?: JustificationNode[];
  which?: number;
  note?: string;
}

interface ProofObject {
  claim: string;
  root: JustificationNode;
  builtAt: string;
}

interface SolverTrace {
  solver: 'backtracking' | 'procedural';
  nodesExplored: number;
  nodesPruned: number;
  ticks: number;
  solved: boolean;
  assignment: Assignment;
  softPenalty: number;
  evaluations: Array<{ constraintId: string; satisfied: boolean; penalty: number }>;
}

interface ConstraintSolution {
  solved: boolean;
  assignment: Assignment;
  proof: ProofObject;
  trace: SolverTrace;
  softPenalty: number;
  solver: 'backtracking' | 'procedural';
}

function describeDomain(d: ValueDomain): string {
  switch (d.kind) {
    case 'int':
      return `int[${d.min}, ${d.max}]`;
    case 'float':
      return `float[${d.min}, ${d.max}]`;
    case 'enum':
      return `enum{${d.values?.join(', ') ?? ''}}`;
    case 'bool':
      return 'bool';
  }
}

function renderTerm(t?: Term): string {
  if (!t) return '?';
  switch (t.t) {
    case 'var':
      return t.name ?? '?';
    case 'const':
      return String(t.value);
    case 'add':
      return `(${renderTerm(t.a)} + ${renderTerm(t.b)})`;
    case 'sub':
      return `(${renderTerm(t.a)} - ${renderTerm(t.b)})`;
    case 'mul':
      return `(${renderTerm(t.a)} * ${renderTerm(t.b)})`;
    case 'div':
      return `(${renderTerm(t.a)} / ${renderTerm(t.b)})`;
    case 'min':
      return `min(${renderTerm(t.a)}, ${renderTerm(t.b)})`;
    case 'max':
      return `max(${renderTerm(t.a)}, ${renderTerm(t.b)})`;
    case 'abs':
      return `|${renderTerm(t.a)}|`;
    default:
      return t.t;
  }
}

function renderExpr(e?: ConstraintExpression): string {
  if (!e) return '?';
  switch (e.t) {
    case 'true':
      return 'true';
    case 'false':
      return 'false';
    case 'lt':
      return `${renderTerm(e.a)} < ${renderTerm(e.b)}`;
    case 'le':
      return `${renderTerm(e.a)} ≤ ${renderTerm(e.b)}`;
    case 'gt':
      return `${renderTerm(e.a)} > ${renderTerm(e.b)}`;
    case 'ge':
      return `${renderTerm(e.a)} ≥ ${renderTerm(e.b)}`;
    case 'eq':
      return `${renderTerm(e.a)} = ${renderTerm(e.b)}`;
    case 'ne':
      return `${renderTerm(e.a)} ≠ ${renderTerm(e.b)}`;
    case 'and':
      return `(${renderExpr(e.a)}) ∧ (${renderExpr(e.b)})`;
    case 'or':
      return `(${renderExpr(e.a)}) ∨ (${renderExpr(e.b)})`;
    case 'not':
      return `¬(${renderExpr(e.a)})`;
    case 'in':
      return `${e.varName} ∈ domain`;
    default:
      return e.t;
  }
}

function ProofNode({ node, depth }: { node: JustificationNode; depth: number }) {
  const indent = '  '.repeat(depth);
  let marker: string;
  let color: string;
  switch (node.kind) {
    case 'eval':
      if (node.result === 'satisfied') {
        marker = '✓';
        color = '#10b981';
      } else {
        marker = '✗';
        color = '#f472b6';
      }
      break;
    case 'assumption':
      marker = '○';
      color = '#d4a04a';
      break;
    case 'leaf':
      marker = '·';
      color = '#8888aa';
      break;
    case 'and':
      marker = '∧';
      color = '#a855f7';
      break;
    case 'or':
      marker = `∨${node.which ?? ''}`;
      color = '#a855f7';
      break;
    default:
      marker = '·';
      color = '#8888aa';
  }
  return (
    <>
      <div className="whitespace-pre-wrap break-all font-mono text-[10px] leading-snug">
        <span style={{ color: '#5a5a7a' }}>{indent}</span>
        <span style={{ color }}>{marker}</span>
        <span className="text-[#c8c8e0]"> {node.claim}</span>
        {node.constraintId && (
          <span className="text-[#5a5a7a]"> ({node.constraintId})</span>
        )}
        {node.result && (
          <span style={{ color: node.result === 'satisfied' ? '#10b981' : '#f472b6' }}>
            {' '}
            [{node.result}]
          </span>
        )}
      </div>
      {node.termValues && Object.keys(node.termValues).length > 0 && (
        <div className="whitespace-pre-wrap break-all font-mono text-[9px] leading-snug text-[#8888aa]">
          <span style={{ color: '#5a5a7a' }}>{indent}  </span>
          values: {Object.entries(node.termValues)
            .map(([k, v]) => `${k}=${JSON.stringify(v)}`)
            .join(', ')}
        </div>
      )}
      {node.note && (
        <div className="whitespace-pre-wrap break-all font-mono text-[9px] leading-snug text-[#8888aa]">
          <span style={{ color: '#5a5a7a' }}>{indent}  </span>
          note: {node.note}
        </div>
      )}
      {node.evidence && (
        <div className="whitespace-pre-wrap break-all font-mono text-[9px] leading-snug text-[#8888aa]">
          <span style={{ color: '#5a5a7a' }}>{indent}  </span>
          evidence: {node.evidence}
        </div>
      )}
      {node.children?.map((c, i) => (
        <ProofNode key={i} node={c} depth={depth + 1} />
      ))}
    </>
  );
}

export default function ConstraintsPanel() {
  const [sample, setSample] = useState<SampleResponse | null>(null);
  const [loadingSample, setLoadingSample] = useState(false);
  const [solution, setSolution] = useState<ConstraintSolution | null>(null);
  const [solving, setSolving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadSample = useCallback(async () => {
    setLoadingSample(true);
    setError(null);
    setSolution(null);
    try {
      const res = await fetch('/api/architect/constraints');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = (await res.json()) as SampleResponse;
      setSample(json);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
    } finally {
      setLoadingSample(false);
    }
  }, []);

  const solve = useCallback(async () => {
    if (!sample) return;
    setSolving(true);
    setError(null);
    try {
      const res = await fetch('/api/architect/constraints', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ problem: sample.problem }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = (await res.json()) as ConstraintSolution;
      setSolution(json);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
    } finally {
      setSolving(false);
    }
  }, [sample]);

  return (
    <div className="flex h-full flex-col bg-[#0e0e24]">
      {/* Header */}
      <div className="flex h-8 items-center justify-between border-b border-[#2a2a4a] px-3">
        <div className="flex items-center gap-1.5">
          <Sigma className="h-3.5 w-3.5 text-emerald-500" />
          <span className="text-[10px] uppercase tracking-wider text-[#5a5a7a]">
            Constraints · {sample ? `${sample.problem.variables.length} vars, ${sample.problem.constraints.length} constraints` : 'no problem loaded'}
          </span>
        </div>
        <div className="flex gap-1.5">
          <Button
            size="sm"
            variant="outline"
            onClick={() => void loadSample()}
            disabled={loadingSample}
            className="h-6 border-[#2a2a4a] bg-[#12122a] px-2 text-[10px] text-[#c8c8e0] hover:bg-[#1d1d36]"
          >
            {loadingSample ? <Loader2 className="h-3 w-3 animate-spin" /> : <Download className="h-3 w-3" />}
            Load Sample
          </Button>
          <Button
            size="sm"
            onClick={() => void solve()}
            disabled={!sample || solving}
            className="h-6 bg-emerald-600 px-2 text-[10px] text-white hover:bg-emerald-500"
          >
            {solving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Play className="h-3 w-3" />}
            Solve
          </Button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 border-b border-rose-500/30 bg-rose-500/5 px-3 py-1.5 text-[11px] text-rose-300">
          <AlertTriangle className="h-3 w-3" /> {error}
        </div>
      )}

      <ScrollArea className="min-h-0 flex-1">
        <div className="p-3">
          {!sample ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Braces className="mb-2 h-6 w-6 text-[#3a3a5a]" />
              <p className="text-[11px] text-[#5a5a7a]">
                No constraint problem loaded.
              </p>
              <p className="mt-1 text-[10px] text-[#5a5a7a]">
                Click <span className="text-[#c8c8e0]">Load Sample</span> to fetch the sect-layout
                problem, then <span className="text-[#c8c8e0]">Solve</span> to run the RCVC solver.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Description */}
              <div className="rounded border border-[#2a2a4a] bg-[#12122a] px-2 py-1.5 text-[10px] text-[#8888aa]">
                {sample.description}
                {sample.problem.objective && (
                  <span className="ml-2 text-[#5a5a7a]">· objective: {sample.problem.objective}</span>
                )}
              </div>

              {/* Variables + Constraints */}
              <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                <section>
                  <h3 className="mb-1 text-[9px] font-semibold uppercase tracking-wider text-[#5a5a7a]">
                    Variables · {sample.problem.variables.length}
                  </h3>
                  <div className="space-y-0.5">
                    {sample.problem.variables.map((v) => (
                      <div
                        key={v.name}
                        className="rounded border border-[#2a2a4a] bg-[#12122a] px-1.5 py-1"
                      >
                        <div className="flex items-baseline justify-between gap-2">
                          <span className="font-mono text-[10px] text-[#c8c8e0]">{v.name}</span>
                          <span className="font-mono text-[9px] text-emerald-300">
                            {describeDomain(v.domain)}
                          </span>
                        </div>
                        {v.description && (
                          <div className="text-[9px] text-[#5a5a7a]">{v.description}</div>
                        )}
                      </div>
                    ))}
                  </div>
                </section>

                <section>
                  <h3 className="mb-1 text-[9px] font-semibold uppercase tracking-wider text-[#5a5a7a]">
                    Constraints · {sample.problem.constraints.length}
                  </h3>
                  <div className="space-y-0.5">
                    {sample.problem.constraints.map((c) => (
                      <div
                        key={c.id}
                        className="rounded border border-[#2a2a4a] bg-[#12122a] px-1.5 py-1"
                      >
                        <div className="flex items-baseline justify-between gap-2">
                          <span className="font-mono text-[10px] text-[#c8c8e0]">{c.id}</span>
                          <span
                            className={`text-[9px] uppercase ${
                              c.weight === 'hard' ? 'text-rose-300' : 'text-amber-300'
                            }`}
                          >
                            {c.weight}
                          </span>
                        </div>
                        <div className="text-[9px] text-[#8888aa]">{c.statement}</div>
                        <div className="font-mono text-[9px] text-[#5a5a7a]">
                          {renderExpr(c.expr)}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              </div>

              {/* Solution */}
              {solution && (
                <section className="space-y-2">
                  {/* Status banner */}
                  <div
                    className={`flex items-center justify-between rounded border px-2 py-1.5 text-[11px] ${
                      solution.solved
                        ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
                        : 'border-rose-500/40 bg-rose-500/10 text-rose-300'
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      {solution.solved ? (
                        <CheckCircle2 className="h-3.5 w-3.5" />
                      ) : (
                        <XCircle className="h-3.5 w-3.5" />
                      )}
                      <span className="font-semibold uppercase tracking-wider">
                        {solution.solved ? 'Solved' : 'No solution found'}
                      </span>
                    </div>
                    <span className="font-mono text-[10px] text-[#8888aa]">
                      solver: {solution.solver} · penalty: {solution.softPenalty.toFixed(2)}
                    </span>
                  </div>

                  {/* Candidate model assignment table */}
                  <div className="overflow-hidden rounded border border-[#2a2a4a]">
                    <div className="flex items-center gap-1.5 bg-[#12122a] px-2 py-1 text-[9px] font-semibold uppercase tracking-wider text-[#5a5a7a]">
                      <ListChecks className="h-3 w-3" /> Candidate Model Assignment
                    </div>
                    <table className="w-full text-left text-[10px]">
                      <thead className="text-[9px] uppercase tracking-wider text-[#5a5a7a]">
                        <tr>
                          <th className="px-2 py-1">Variable</th>
                          <th className="px-2 py-1">Value</th>
                          <th className="px-2 py-1 text-right">Numeric</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Object.entries(solution.assignment).map(([k, v]) => (
                          <tr key={k} className="border-t border-[#2a2a4a]">
                            <td className="px-2 py-1 font-mono text-[#c8c8e0]">{k}</td>
                            <td className="px-2 py-1 font-mono text-emerald-300">
                              {typeof v === 'number' ? v.toFixed(3) : JSON.stringify(v)}
                            </td>
                            <td className="px-2 py-1 text-right font-mono text-[#8888aa]">
                              {typeof v === 'number' ? v.toFixed(3) : '-'}
                            </td>
                          </tr>
                        ))}
                        {Object.keys(solution.assignment).length === 0 && (
                          <tr>
                            <td colSpan={3} className="px-2 py-2 text-center text-[10px] text-[#5a5a7a]">
                              Empty assignment.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Proof object */}
                  <div className="overflow-hidden rounded border border-[#2a2a4a]">
                    <div className="flex items-center gap-1.5 bg-[#12122a] px-2 py-1 text-[9px] font-semibold uppercase tracking-wider text-[#5a5a7a]">
                      <FileCode2 className="h-3 w-3" /> Proof Object (justification tree)
                    </div>
                    <div className="bg-[#070716] px-2 py-1.5">
                      <div className="mb-1 font-mono text-[9px] text-[#5a5a7a]">
                        claim: {solution.proof.claim}
                      </div>
                      <div className="mb-1 font-mono text-[9px] text-[#5a5a7a]">
                        builtAt: {solution.proof.builtAt}
                      </div>
                      <ProofNode node={solution.proof.root} depth={0} />
                    </div>
                  </div>

                  {/* Solver trace + validation checks */}
                  <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                    <div className="overflow-hidden rounded border border-[#2a2a4a]">
                      <div className="bg-[#12122a] px-2 py-1 text-[9px] font-semibold uppercase tracking-wider text-[#5a5a7a]">
                        Solver Trace
                      </div>
                      <pre className="bg-[#070716] px-2 py-1.5 font-mono text-[9px] leading-snug text-[#8888aa]">
{`solver:       ${solution.trace.solver}
nodesExplored: ${solution.trace.nodesExplored}
nodesPruned:   ${solution.trace.nodesPruned}
ticks:         ${solution.trace.ticks}
solved:        ${solution.trace.solved}
softPenalty:   ${solution.trace.softPenalty.toFixed(3)}`}
                      </pre>
                    </div>
                    <div className="overflow-hidden rounded border border-[#2a2a4a]">
                      <div className="bg-[#12122a] px-2 py-1 text-[9px] font-semibold uppercase tracking-wider text-[#5a5a7a]">
                        Validation Checks
                      </div>
                      <pre className="bg-[#070716] px-2 py-1.5 font-mono text-[9px] leading-snug text-[#8888aa]">
{solution.trace.evaluations
  .map(
    (e) =>
      `${e.satisfied ? '✓' : '✗'} ${e.constraintId.padEnd(6)} penalty=${e.penalty.toFixed(2)}`,
  )
  .join('\n')}
                      </pre>
                    </div>
                  </div>
                </section>
              )}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
