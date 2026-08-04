'use client';

/**
 * ReasoningPanel — the Architect's hypothesis engine UI.
 *
 * POSTs to /api/architect/interpret with { request: text }. The route
 * runs the RCVC hypothesis engine and returns three scored hypotheses
 * (weak-sufficient / moderate / over-specified) plus per-hypothesis
 * clarifications.
 *
 * Cards show: interpretation, specificity/confidence/reversibility bars,
 * and confirmed / assumed / unresolved constraint lists. The weakest
 * sufficient hypothesis gets an emerald border + WEAKEST badge. The
 * over-specified one gets a red tint. Clicking a card selects it and
 * reveals its clarification questions (with option buttons) below.
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Sparkles,
  Send,
  Loader2,
  AlertTriangle,
  Brain,
  Check,
  HelpCircle,
  Target,
} from 'lucide-react';

interface ConstraintRef {
  id: string;
  statement: string;
  source: 'request' | 'corpus' | 'assumed' | 'engine-invariant';
}

interface ConstraintVar {
  name: string;
  domain: unknown;
  description?: string;
}

interface HypothesisTarget {
  ref: string;
  kind: 'entity' | 'system' | 'region' | 'wildcard';
  label: string;
}

interface HypothesisScore {
  satisfiesExplicitRequest: number;
  respectsArtDirection: number;
  preservesEngineInvariants: number;
  reusesConfirmedContext: number;
  reversibility: number;
  generality: number;
  unsupportedSpecificity: number;
  destructiveScope: number;
  ambiguityPenalty: number;
  total: number;
}

interface Hypothesis {
  id: string;
  requestId: string;
  interpretation: string;
  targetCandidates: HypothesisTarget[];
  confirmedConstraints: ConstraintRef[];
  assumedConstraints: ConstraintRef[];
  unresolvedVariables: ConstraintVar[];
  scope: string;
  specificityScore: number;
  reversibilityScore: number;
  confidence: number;
  requiresClarification: boolean;
  scoreBreakdown: HypothesisScore;
}

interface ClarificationQuestion {
  variable: string;
  question: string;
  options?: string[];
  rationale: string;
}

interface ClarificationSet {
  hypothesisId: string;
  questions: ClarificationQuestion[];
}

interface InterpretResponse {
  reply: string;
  toolsUsed: string[];
  intent: string;
  hypotheses: Hypothesis[];
  clarifications: ClarificationQuestion[];
  clarificationsByHypothesis: ClarificationSet[];
  selectedHypothesisId: string | null;
}

const SCOPE_LABEL: Record<string, string> = {
  'preview-only': 'Preview',
  'single-entity': 'Single Entity',
  'local-cluster': 'Local Cluster',
  'region-wide': 'Region',
  'world-wide': 'World',
  'engine-invariant': 'Engine Inv.',
};

function Bar({ label, value, color }: { label: string; value: number; color: string }) {
  const pct = Math.max(0, Math.min(1, value)) * 100;
  return (
    <div className="flex items-center gap-1.5">
      <span className="w-20 shrink-0 text-[9px] uppercase tracking-wider text-[#5a5a7a]">
        {label}
      </span>
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#0e0e24]">
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="w-8 shrink-0 text-right font-mono text-[9px] text-[#8888aa]">
        {(value * 100).toFixed(0)}
      </span>
    </div>
  );
}

function ConstraintList({
  title,
  items,
  accent,
  icon,
}: {
  title: string;
  items: ConstraintRef[];
  accent: string;
  icon: React.ReactNode;
}) {
  if (items.length === 0) return null;
  return (
    <div>
      <div className="mb-0.5 flex items-center gap-1 text-[9px] font-semibold uppercase tracking-wider" style={{ color: accent }}>
        {icon}
        {title}
        <span className="text-[#5a5a7a]">· {items.length}</span>
      </div>
      <ul className="space-y-0.5">
        {items.map((c) => (
          <li key={c.id} className="flex items-start gap-1 text-[10px] leading-snug text-[#8888aa]">
            <span className="mt-1 h-1 w-1 shrink-0 rounded-full" style={{ background: accent }} />
            <span>
              {c.statement}
              <span className="ml-1 text-[8px] uppercase text-[#5a5a7a]">[{c.source}]</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function HypothesisCard({
  h,
  isWeakest,
  isOverSpecified,
  isSelected,
  onSelect,
}: {
  h: Hypothesis;
  isWeakest: boolean;
  isOverSpecified: boolean;
  isSelected: boolean;
  onSelect: () => void;
}) {
  // "Over-specified" = the hypothesis with the highest specificity score.
  const cardClass = isWeakest
    ? 'border-emerald-500/60 bg-emerald-500/5'
    : isOverSpecified
      ? 'border-rose-500/40 bg-rose-500/5'
      : 'border-[#2a2a4a] bg-[#12122a]';

  return (
    <button
      onClick={onSelect}
      className={`w-full rounded border p-2 text-left transition-colors hover:border-[#3a3a5a] ${cardClass} ${
        isSelected ? 'ring-1 ring-emerald-500/50' : ''
      }`}
    >
      {/* Top row: badge + scope + total score */}
      <div className="mb-1 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          {isWeakest && (
            <span className="rounded bg-emerald-500/20 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-emerald-300">
              Weakest
            </span>
          )}
          {isOverSpecified && (
            <span className="rounded bg-rose-500/20 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-rose-300">
              Over-specified
            </span>
          )}
          <span className="rounded bg-[#0e0e24] px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-[#8888aa]">
            {SCOPE_LABEL[h.scope] ?? h.scope}
          </span>
        </div>
        <span className="font-mono text-[10px] text-[#5a5a7a]">
          Σ {h.scoreBreakdown.total.toFixed(2)}
        </span>
      </div>

      {/* Interpretation */}
      <p className="mb-1.5 text-[11px] leading-snug text-[#c8c8e0]">{h.interpretation}</p>

      {/* Score bars */}
      <div className="space-y-0.5">
        <Bar label="Specificity" value={h.specificityScore} color="#f472b6" />
        <Bar label="Confidence" value={h.confidence} color="#10b981" />
        <Bar label="Reversibility" value={h.reversibilityScore} color="#a855f7" />
      </div>

      {/* Targets */}
      {h.targetCandidates.length > 0 && (
        <div className="mt-1.5 flex flex-wrap items-center gap-1">
          <Target className="h-2.5 w-2.5 text-[#5a5a7a]" />
          {h.targetCandidates.map((t) => (
            <span
              key={t.ref}
              className="rounded bg-[#0e0e24] px-1.5 py-0.5 font-mono text-[9px] text-[#8888aa]"
            >
              {t.label}
            </span>
          ))}
        </div>
      )}

      {/* Constraint lists (compact) */}
      <div className="mt-1.5 space-y-1.5">
        <ConstraintList
          title="Confirmed"
          items={h.confirmedConstraints}
          accent="#10b981"
          icon={<Check className="h-2.5 w-2.5" />}
        />
        <ConstraintList
          title="Assumed"
          items={h.assumedConstraints}
          accent="#d4a04a"
          icon={<AlertTriangle className="h-2.5 w-2.5" />}
        />
        {h.unresolvedVariables.length > 0 && (
          <div>
            <div className="mb-0.5 flex items-center gap-1 text-[9px] font-semibold uppercase tracking-wider text-rose-300">
              <HelpCircle className="h-2.5 w-2.5" />
              Unresolved
              <span className="text-[#5a5a7a]">· {h.unresolvedVariables.length}</span>
            </div>
            <div className="flex flex-wrap gap-1">
              {h.unresolvedVariables.map((v) => (
                <span
                  key={v.name}
                  className="rounded bg-rose-500/10 px-1.5 py-0.5 font-mono text-[9px] text-rose-300"
                  title={v.description ?? v.name}
                >
                  {v.name}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </button>
  );
}

export default function ReasoningPanel() {
  const [input, setInput] = useState('Make the village sacred and quieter.');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<InterpretResponse | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const submit = async (text: string) => {
    if (!text.trim() || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/architect/interpret', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ request: text }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = (await res.json()) as InterpretResponse;
      setData(json);
      // Default selection: the weakest-sufficient hypothesis.
      setSelectedId(json.selectedHypothesisId ?? json.hypotheses[0]?.id ?? null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
    } finally {
      setBusy(false);
    }
  };

  // Find which hypothesis is "over-specified" (highest specificity).
  const overSpecId = data
    ? [...data.hypotheses].sort((a, b) => b.specificityScore - a.specificityScore)[0]?.id
    : null;

  const selectedH = data?.hypotheses.find((h) => h.id === selectedId) ?? null;
  const selectedClarifications = data?.clarificationsByHypothesis.find(
    (c) => c.hypothesisId === selectedId,
  )?.questions ?? [];

  return (
    <div className="flex h-full flex-col bg-[#0e0e24]">
      {/* Header + input */}
      <div className="border-b border-[#2a2a4a] px-3 py-2">
        <div className="mb-1.5 flex items-center gap-1.5">
          <Brain className="h-3.5 w-3.5 text-emerald-500" />
          <span className="text-[10px] uppercase tracking-wider text-[#5a5a7a]">
            Reasoning · {data ? `${data.hypotheses.length} hypotheses` : 'awaiting request'}
          </span>
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void submit(input);
          }}
          className="flex items-center gap-1.5"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Speak a request to the Architect…"
            className="h-7 flex-1 rounded border border-[#2a2a4a] bg-[#12122a] px-2 text-[11px] text-[#c8c8e0] placeholder:text-[#5a5a7a] focus:outline-none focus:border-emerald-500/50"
          />
          <Button
            type="submit"
            size="sm"
            disabled={busy || !input.trim()}
            className="h-7 bg-emerald-600 px-2 text-[10px] text-white hover:bg-emerald-500"
          >
            {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
            Interpret
          </Button>
        </form>
      </div>

      {error && (
        <div className="flex items-center gap-2 border-b border-rose-500/30 bg-rose-500/5 px-3 py-1.5 text-[11px] text-rose-300">
          <AlertTriangle className="h-3 w-3" /> {error}
        </div>
      )}

      <ScrollArea className="flex-1">
        <div className="p-3">
          {/* Hypothesis cards */}
          {data ? (
            <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
              {data.hypotheses.map((h) => (
                <HypothesisCard
                  key={h.id}
                  h={h}
                  isWeakest={h.id === data.selectedHypothesisId}
                  isOverSpecified={h.id === overSpecId}
                  isSelected={h.id === selectedId}
                  onSelect={() => setSelectedId(h.id)}
                />
              ))}
            </div>
          ) : (
            !busy && (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Sparkles className="mb-2 h-6 w-6 text-[#3a3a5a]" />
                <p className="text-[11px] text-[#5a5a7a]">
                  Send a request to generate three scored hypotheses.
                </p>
                <p className="mt-1 text-[10px] text-[#5a5a7a]">
                  The Architect will show a weak-sufficient, a moderate, and an over-specified
                  interpretation.
                </p>
              </div>
            )
          )}

          {/* Clarifications for the selected hypothesis */}
          {selectedH && selectedClarifications.length > 0 && (
            <div className="mt-3 rounded border border-[#2a2a4a] bg-[#12122a] p-2">
              <div className="mb-1.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-amber-300">
                <HelpCircle className="h-3 w-3" />
                Clarifications for selected hypothesis
                <span className="text-[#5a5a7a]">· {selectedClarifications.length}</span>
              </div>
              <div className="space-y-1.5">
                {selectedClarifications.map((q) => (
                  <div
                    key={q.variable}
                    className="rounded border border-amber-500/20 bg-amber-500/5 p-2"
                  >
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="text-[11px] font-medium text-[#c8c8e0]">{q.question}</span>
                      <span className="font-mono text-[9px] text-amber-300">{q.variable}</span>
                    </div>
                    <p className="mt-0.5 text-[9px] leading-snug text-[#8888aa]">{q.rationale}</p>
                    {q.options && q.options.length > 0 && (
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        {q.options.map((opt) => (
                          <button
                            key={opt}
                            className="rounded border border-[#2a2a4a] bg-[#0e0e24] px-2 py-0.5 text-[10px] text-[#c8c8e0] transition-colors hover:border-emerald-500/50 hover:text-emerald-300"
                          >
                            {opt}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {selectedH && selectedClarifications.length === 0 && (
            <div className="mt-3 rounded border border-emerald-500/30 bg-emerald-500/5 px-3 py-2 text-[10px] text-emerald-300">
              ✓ This hypothesis needs no clarification — it can be enacted directly.
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
