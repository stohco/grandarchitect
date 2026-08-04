/**
 * Live Architect Studio — Reasoning Panel (RCVC: R)
 *
 * Weakest-sufficient interpretation panel.
 * User types a natural-language request; we POST it to
 * /api/architect/interpret and render the returned hypotheses as cards.
 * The weakest hypothesis (requiresClarification=true) is highlighted with an
 * emerald border and SELECT button. Selecting it reveals any clarification
 * questions the architect wants resolved before committing.
 *
 * Color coding:
 *   - weakest (requiresClarification) → emerald border
 *   - over-specified (specificityScore > 0.7) → red/amber tint
 *   - default → neutral
 */

'use client';

import { useState, useCallback } from 'react';
import {
  Brain,
  Send,
  Loader2,
  Check,
  AlertTriangle,
  HelpCircle,
  ShieldCheck,
  ShieldQuestion,
  Split,
  RotateCcw,
  Target,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';

// ----------------------------------------------------------------------------
// Local types — match the RCVC engine types without coupling the client.
// ----------------------------------------------------------------------------

interface ConfirmedConstraint {
  id: string;
  label: string;
  source: string;
  expression: string;
}

interface AssumedConstraint {
  id: string;
  label: string;
  expression: string;
  confidence: number;
  reversibleIfWrong: boolean;
}

interface UnresolvedVariable {
  id: string;
  label: string;
  domain: string[];
  defaultIndex: number;
  consequenceIfWrong: 'low' | 'moderate' | 'severe' | 'destructive';
}

interface ScopeEstimate {
  entitiesAffected: number;
  terrainChunksAffected: number;
  systemsTouched: string[];
  reversibilityScore: number;
  destructiveScope: number;
}

interface Hypothesis {
  id: string;
  requestId: string;
  interpretation: string;
  confirmedConstraints: ConfirmedConstraint[];
  assumedConstraints: AssumedConstraint[];
  unresolvedVariables: UnresolvedVariable[];
  scope: ScopeEstimate;
  specificityScore: number;
  reversibilityScore: number;
  confidence: number;
  requiresClarification: boolean;
}

interface ClarificationOption {
  label: string;
  description: string;
  resolvesVariableId: string;
  resolvesValue: string;
  resultingSpecificity: number;
}

interface ClarificationQuestion {
  questionId: string;
  hypothesisId: string;
  prompt: string;
  options: ClarificationOption[];
  allowsFreeText: boolean;
  consequenceLevel: 'low' | 'moderate' | 'severe' | 'destructive';
}

interface InterpretResponse {
  hypotheses: Hypothesis[];
  weakest?: Hypothesis;
  clarifications: ClarificationQuestion[];
  count: number;
  error?: string;
}

// ----------------------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------------------

const CONSEQUENCE_COLOR: Record<UnresolvedVariable['consequenceIfWrong'], string> = {
  low: 'text-emerald-400',
  moderate: 'text-amber-400',
  severe: 'text-orange-400',
  destructive: 'text-red-400',
};

const CLARIFY_CONSEQUENCE_COLOR: Record<ClarificationQuestion['consequenceLevel'], string> = {
  low: 'border-emerald-500/40',
  moderate: 'border-amber-500/40',
  severe: 'border-orange-500/40',
  destructive: 'border-red-500/40',
};

function fmtPct(n: number): string {
  return `${Math.round(n * 100)}%`;
}

function specificityTint(score: number): { border: string; bg: string } {
  if (score > 0.75) return { border: 'border-red-500/40', bg: 'bg-red-500/5' };
  if (score > 0.55) return { border: 'border-amber-500/30', bg: 'bg-amber-500/5' };
  return { border: 'border-[#2a2a4a]', bg: 'bg-[#0e0e24]' };
}

function HypothesisCard({
  hyp,
  isWeakest,
  isSelected,
  onSelect,
}: {
  hyp: Hypothesis;
  isWeakest: boolean;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const tint = specificityTint(hyp.specificityScore);
  const border = isWeakest
    ? 'border-emerald-500/60 ring-1 ring-emerald-500/20'
    : isSelected
    ? 'border-emerald-500/40'
    : tint.border;
  const bg = isWeakest ? 'bg-emerald-500/5' : tint.bg;

  return (
    <div className={`rounded-md border ${border} ${bg} p-2 transition-colors`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            {isWeakest && (
              <Badge className="h-4 bg-emerald-500/20 px-1 text-[9px] text-emerald-300">
                <Target className="h-2.5 w-2.5" />WEAKEST
              </Badge>
            )}
            {hyp.requiresClarification && !isWeakest && (
              <Badge className="h-4 bg-amber-500/20 px-1 text-[9px] text-amber-300">clarify</Badge>
            )}
            <Badge
              variant="outline"
              className={`h-4 px-1 text-[9px] ${
                hyp.confidence > 0.7
                  ? 'border-emerald-500/30 text-emerald-300'
                  : hyp.confidence > 0.4
                  ? 'border-amber-500/30 text-amber-300'
                  : 'border-red-500/30 text-red-300'
              }`}
            >
              conf {fmtPct(hyp.confidence)}
            </Badge>
          </div>
          <pre className="mt-1 whitespace-pre-wrap break-words font-mono text-[11px] leading-snug text-[#c8c8e0]">
            {hyp.interpretation}
          </pre>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <Button
            variant={isSelected ? 'default' : 'outline'}
            size="sm"
            className={`h-6 gap-1 px-2 text-[10px] ${
              isSelected
                ? 'bg-emerald-600 text-white hover:bg-emerald-500'
                : 'border-[#2a2a4a] bg-[#1a1a2e] text-[#8888aa] hover:text-emerald-300 hover:border-emerald-500/40'
            }`}
            onClick={onSelect}
            disabled={isSelected}
          >
            {isSelected ? <Check className="h-3 w-3" /> : null}
            {isSelected ? 'SELECTED' : 'SELECT'}
          </Button>
        </div>
      </div>

      {/* specificity / reversibility bars */}
      <div className="mt-2 grid grid-cols-2 gap-2">
        <div>
          <div className="mb-0.5 flex items-center justify-between text-[9px] uppercase tracking-wider text-[#5a5a7a]">
            <span>specificity</span>
            <span className="font-mono text-[#8888aa]">{fmtPct(hyp.specificityScore)}</span>
          </div>
          <Progress
            value={hyp.specificityScore * 100}
            className="h-1.5 bg-[#1a1a2e]"
            // Lower specificity = weaker = better → invert color sense with emerald when low.
          />
          <div className="mt-0.5 text-[8px] text-[#4a4a6a]">lower = weaker = preferred</div>
        </div>
        <div>
          <div className="mb-0.5 flex items-center justify-between text-[9px] uppercase tracking-wider text-[#5a5a7a]">
            <span>reversibility</span>
            <span className="font-mono text-[#8888aa]">{fmtPct(hyp.reversibilityScore)}</span>
          </div>
          <Progress value={hyp.reversibilityScore * 100} className="h-1.5 bg-[#1a1a2e]" />
          <div className="mt-0.5 text-[8px] text-[#4a4a6a]">higher = easier to undo</div>
        </div>
      </div>

      {/* constraint lists */}
      <div className="mt-2 grid grid-cols-3 gap-1.5">
        <div className="rounded border border-[#2a2a4a]/60 bg-[#0a0a1e] p-1.5">
          <div className="mb-1 flex items-center gap-1 text-[9px] uppercase tracking-wider text-emerald-400">
            <ShieldCheck className="h-2.5 w-2.5" />
            <span>confirmed</span>
            <span className="ml-auto font-mono text-[#5a5a7a]">{hyp.confirmedConstraints.length}</span>
          </div>
          <ul className="space-y-0.5">
            {hyp.confirmedConstraints.slice(0, 4).map((c) => (
              <li key={c.id} className="truncate text-[10px] text-[#8888aa]" title={c.label}>
                · {c.label}
              </li>
            ))}
            {hyp.confirmedConstraints.length === 0 && (
              <li className="text-[9px] text-[#4a4a6a]">none</li>
            )}
          </ul>
        </div>
        <div className="rounded border border-[#2a2a4a]/60 bg-[#0a0a1e] p-1.5">
          <div className="mb-1 flex items-center gap-1 text-[9px] uppercase tracking-wider text-amber-400">
            <ShieldQuestion className="h-2.5 w-2.5" />
            <span>assumed</span>
            <span className="ml-auto font-mono text-[#5a5a7a]">{hyp.assumedConstraints.length}</span>
          </div>
          <ul className="space-y-0.5">
            {hyp.assumedConstraints.slice(0, 4).map((c) => (
              <li key={c.id} className="truncate text-[10px] text-[#8888aa]" title={c.label}>
                · {c.label}
              </li>
            ))}
            {hyp.assumedConstraints.length === 0 && (
              <li className="text-[9px] text-[#4a4a6a]">none</li>
            )}
          </ul>
        </div>
        <div className="rounded border border-[#2a2a4a]/60 bg-[#0a0a1e] p-1.5">
          <div className="mb-1 flex items-center gap-1 text-[9px] uppercase tracking-wider text-purple-400">
            <Split className="h-2.5 w-2.5" />
            <span>unresolved</span>
            <span className="ml-auto font-mono text-[#5a5a7a]">{hyp.unresolvedVariables.length}</span>
          </div>
          <ul className="space-y-0.5">
            {hyp.unresolvedVariables.slice(0, 4).map((v) => (
              <li key={v.id} className="truncate text-[10px] text-[#8888aa]" title={v.label}>
                <span className={CONSEQUENCE_COLOR[v.consequenceIfWrong]}>·</span> {v.label}
              </li>
            ))}
            {hyp.unresolvedVariables.length === 0 && (
              <li className="text-[9px] text-[#4a4a6a]">none</li>
            )}
          </ul>
        </div>
      </div>

      {/* scope */}
      <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[9px] text-[#5a5a7a]">
        <span className="flex items-center gap-1">
          <RotateCcw className="h-2.5 w-2.5" />
          scope: <span className="font-mono text-[#8888aa]">{hyp.scope.entitiesAffected}</span> ents ·
          <span className="font-mono text-[#8888aa]"> {hyp.scope.terrainChunksAffected}</span> chunks
        </span>
        {hyp.scope.systemsTouched.length > 0 && (
          <span className="truncate">
            systems: <span className="text-[#8888aa]">{hyp.scope.systemsTouched.join(', ')}</span>
          </span>
        )}
      </div>
    </div>
  );
}

function ClarificationCard({
  question,
  onPick,
  pickedLabel,
}: {
  question: ClarificationQuestion;
  onPick: (opt: ClarificationOption) => void;
  pickedLabel?: string;
}) {
  return (
    <div className={`rounded-md border ${CLARIFY_CONSEQUENCE_COLOR[question.consequenceLevel]} bg-[#1a1a2e] p-2`}>
      <div className="flex items-start gap-2">
        <HelpCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-purple-400" />
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-center gap-1.5">
            <span className="text-[9px] font-semibold uppercase tracking-wider text-purple-300">
              Clarification needed
            </span>
            <Badge
              variant="outline"
              className={`h-3.5 px-1 text-[8px] ${
                question.consequenceLevel === 'destructive'
                  ? 'border-red-500/40 text-red-300'
                  : question.consequenceLevel === 'severe'
                  ? 'border-orange-500/40 text-orange-300'
                  : question.consequenceLevel === 'moderate'
                  ? 'border-amber-500/40 text-amber-300'
                  : 'border-emerald-500/40 text-emerald-300'
              }`}
            >
              {question.consequenceLevel}
            </Badge>
          </div>
          <p className="text-[11px] leading-snug text-[#c8c8e0]">{question.prompt}</p>
          <div className="mt-1.5 grid grid-cols-2 gap-1">
            {question.options.map((opt) => {
              const isPicked = pickedLabel === opt.label;
              return (
                <button
                  key={opt.label}
                  type="button"
                  onClick={() => onPick(opt)}
                  disabled={!!pickedLabel}
                  className={`group rounded border px-1.5 py-1 text-left transition-colors ${
                    isPicked
                      ? 'border-emerald-500/60 bg-emerald-500/10'
                      : 'border-[#2a2a4a] bg-[#0e0e24] hover:border-emerald-500/40 hover:bg-emerald-500/5'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className="truncate text-[10px] font-medium text-[#c8c8e0]">{opt.label}</span>
                    {isPicked && <Check className="h-2.5 w-2.5 shrink-0 text-emerald-400" />}
                  </div>
                  <div className="truncate text-[9px] text-[#5a5a7a]" title={opt.description}>
                    {opt.description}
                  </div>
                  <div className="mt-0.5 text-[8px] text-[#4a4a6a]">
                    → specificity <span className="font-mono text-[#8888aa]">{fmtPct(opt.resultingSpecificity)}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------------
// Panel
// ----------------------------------------------------------------------------

const PRESETS = [
  'make this valley feel sacred',
  'add a hidden cultivation cave above the village',
  'redesign the market to feel bustling',
  'place a watchtower that can see the river',
];

export default function ReasoningPanel() {
  const [request, setRequest] = useState('make this valley feel sacred');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<InterpretResponse | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [pickedClarifications, setPickedClarifications] = useState<Record<string, string>>({});

  const interpret = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setLoading(true);
    setError(null);
    setSelectedId(null);
    setPickedClarifications({});
    try {
      const res = await fetch('/api/architect/interpret', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ request: trimmed }),
      });
      const json = (await res.json()) as InterpretResponse;
      if (!res.ok) {
        throw new Error(json.error ?? `HTTP ${res.status}`);
      }
      setData(json);
      // Auto-select the weakest if present.
      if (json.weakest) setSelectedId(json.weakest.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to interpret request');
    } finally {
      setLoading(false);
    }
  }, []);

  const pickClarification = (q: ClarificationQuestion, opt: ClarificationOption) => {
    setPickedClarifications((prev) => ({ ...prev, [q.questionId]: opt.label }));
  };

  const selectedHyp = data?.hypotheses.find((h) => h.id === selectedId) ?? null;
  const selectedClarifications = data?.clarifications.filter((q) => q.hypothesisId === selectedId) ?? [];

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-[#2a2a4a] px-3 py-1.5">
        <Brain className="h-3.5 w-3.5 text-emerald-400" />
        <span className="text-[11px] font-semibold uppercase tracking-wider text-[#8888aa]">
          Weakest-Sufficient Interpretation
        </span>
        {data && (
          <Badge variant="outline" className="h-4 border-[#2a2a4a] bg-[#1a1a2e] text-[9px] text-emerald-300">
            {data.count} hypotheses
          </Badge>
        )}
      </div>

      {/* Input bar */}
      <div className="flex items-center gap-2 border-b border-[#2a2a4a] px-2 py-1.5">
        <Input
          value={request}
          onChange={(e) => setRequest(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') interpret(request);
          }}
          placeholder="Natural-language request — e.g. 'make this valley feel sacred'"
          className="h-7 flex-1 rounded border-[#2a2a4a] bg-[#1a1a2e] px-2 font-mono text-[11px] text-[#c8c8e0] placeholder:text-[#4a4a6a] focus-visible:border-emerald-500/50 focus-visible:ring-emerald-500/20"
          disabled={loading}
        />
        <Button
          size="sm"
          className="h-7 gap-1 bg-emerald-600 px-2 text-[11px] text-white hover:bg-emerald-500"
          onClick={() => interpret(request)}
          disabled={loading || !request.trim()}
        >
          {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
          Interpret
        </Button>
      </div>

      {/* Preset chips */}
      <div className="flex items-center gap-1 overflow-x-auto border-b border-[#2a2a4a] px-2 py-1">
        <span className="shrink-0 text-[9px] uppercase tracking-wider text-[#4a4a6a]">try:</span>
        {PRESETS.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => {
              setRequest(p);
              void interpret(p);
            }}
            disabled={loading}
            className="shrink-0 rounded border border-[#2a2a4a] bg-[#0e0e24] px-1.5 py-0.5 text-[9px] text-[#8888aa] transition-colors hover:border-emerald-500/40 hover:text-emerald-300 disabled:opacity-50"
          >
            {p}
          </button>
        ))}
      </div>

      {/* Content */}
      <ScrollArea className="min-h-0 flex-1">
        <div className="space-y-2 p-2">
          {error && (
            <div className="flex items-center gap-2 rounded border border-red-500/40 bg-red-500/10 px-2 py-1.5 text-[11px] text-red-300">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{error}</span>
            </div>
          )}

          {loading && !data && (
            <div className="flex items-center gap-2 px-2 py-4 text-[11px] text-[#5a5a7a]">
              <Loader2 className="h-3 w-3 animate-spin text-emerald-400" />
              Generating hypotheses…
            </div>
          )}

          {!loading && !data && !error && (
            <div className="px-2 py-4 text-center text-[11px] text-[#5a5a7a]">
              Type a request above and press <span className="text-emerald-300">Interpret</span>.
              <br />
              The architect will surface multiple interpretations and prefer the weakest sufficient one.
            </div>
          )}

          {data?.hypotheses.map((hyp) => (
            <HypothesisCard
              key={hyp.id}
              hyp={hyp}
              isWeakest={data.weakest?.id === hyp.id}
              isSelected={selectedId === hyp.id}
              onSelect={() => setSelectedId(hyp.id)}
            />
          ))}

          {/* Clarifications for selected hypothesis */}
          {selectedHyp && selectedClarifications.length > 0 && (
            <div className="mt-2 space-y-2">
              <div className="flex items-center gap-1 text-[9px] font-semibold uppercase tracking-wider text-purple-300">
                <HelpCircle className="h-2.5 w-2.5" />
                <span>Clarifications for selected hypothesis</span>
              </div>
              {selectedClarifications.map((q) => (
                <ClarificationCard
                  key={q.questionId}
                  question={q}
                  onPick={(opt) => pickClarification(q, opt)}
                  pickedLabel={pickedClarifications[q.questionId]}
                />
              ))}
            </div>
          )}

          {selectedHyp && selectedClarifications.length === 0 && (
            <div className="rounded border border-emerald-500/30 bg-emerald-500/5 px-2 py-1.5 text-[11px] text-emerald-300">
              ✓ No clarifications required — this hypothesis is committable as-is.
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
