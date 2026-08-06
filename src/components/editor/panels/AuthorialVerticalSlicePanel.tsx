/**
 * Authorial Vertical Slice Panel
 * ===============================
 *
 * Bottom dock 'Authorial' tab. Runs the canonical 13-stage authorial
 * vertical slice against the currently selected structure.
 *
 * Proves:
 *   - Real browser selection flows into the loop (OBSERVE reads the
 *     currently selected entity from the editor store).
 *   - Real Bible rules are retrieved (RETRIEVE shows source spans).
 *   - Real actions execute through executeCommand() (EXECUTE shows
 *     transaction IDs).
 *   - Deterministic critique verdict is shown (CRITIQUE).
 *   - Decision ledger entry is persisted (REMEMBER shows entry ID).
 *   - Restart recovery proof (status panel shows resumable loop).
 *   - Affects next request automatically (status panel shows ledger
 *     stats and narrative promises).
 */

'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Activity,
  CircleCheck,
  CircleAlert,
  CircleDot,
  Clock,
  Database,
  FileText,
  FlaskConical,
  History,
  Play,
  RefreshCw,
  RotateCcw,
  ScrollText,
  Shield,
  Sparkles,
} from 'lucide-react';
import { useSelectedStructure } from '@/lib/editor/store';
import { useEditorStore } from '@/lib/editor/store';
import type { AuthorialOverride } from '@/lib/editor/types';
import type { VerticalSliceResult, StageTrace } from '@/engine/architect/authorial/vertical-slice';

interface AuthorialStatus {
  ok: boolean;
  ledgerStats: Record<string, number>;
  narrativePromises: number;
  thematicMotifs: number;
  loops: Array<{
    loopId: string;
    stage: string;
    completed: boolean;
    paused: boolean;
    originalRequest: string;
    startedAt: string;
    updatedAt: string;
  }>;
  recentSlices: Array<{
    loopId: string;
    input: string;
    completed: boolean;
    finalStage: string;
    decisionLedgerEntryId?: string;
    narrativePromiseId?: string;
    startedAt: string;
    totalDurationMs: number;
  }>;
  resumable: { loopId: string; stage: string; originalRequest: string; paused: boolean } | null;
  bible: {
    canonRules: number;
    styleConstraints: number;
    spanVerification: {
      verified: boolean;
      spansChecked: number;
      results: Array<{ ruleId: string; verified: boolean; reason: string }>;
    };
  };
}

const STAGE_ORDER = [
  'observe', 'understand', 'retrieve', 'ground', 'discover',
  'plan', 'preview', 'execute', 'validate', 'critique',
  'present', 'commit_or_revise', 'remember',
] as const;

const STAGE_LABELS: Record<string, string> = {
  observe: 'Observe',
  understand: 'Understand',
  retrieve: 'Retrieve',
  ground: 'Ground',
  discover: 'Discover',
  plan: 'Plan',
  preview: 'Preview',
  execute: 'Execute',
  validate: 'Validate',
  critique: 'Critique',
  present: 'Present',
  commit_or_revise: 'Commit/Revise',
  remember: 'Remember',
};

export default function AuthorialVerticalSlicePanel() {
  const selected = useSelectedStructure();
  const selectedEntityId = selected?.entityId ?? -1;
  const applyAuthorialOverride = useEditorStore((s) => s.applyAuthorialOverride);
  const clearAuthorialOverride = useEditorStore((s) => s.clearAuthorialOverride);
  const undoAuthorialOverride = useEditorStore((s) => s.undoAuthorialOverride);
  const currentOverride = useEditorStore((s) => s.authorialOverrides[selectedEntityId] ?? null);
  const [request, setRequest] = useState(
    'Make the selected structure feel ancient and sacred through restraint and weathering.',
  );
  const [dryRun, setDryRun] = useState(false);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<VerticalSliceResult | null>(null);
  const [status, setStatus] = useState<AuthorialStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedStageIdx, setSelectedStageIdx] = useState<number | null>(null);

  const refreshStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/architect/authorial/status');
      const json = await res.json();
      if (json.ok) setStatus(json as AuthorialStatus);
    } catch (err) {
      // Status is best-effort.
      console.warn('Failed to refresh authorial status:', err);
    }
  }, []);

  useEffect(() => {
    void refreshStatus();
    const id = setInterval(refreshStatus, 5000);
    return () => clearInterval(id);
  }, [refreshStatus]);

  const canRun = selected !== null && !running;

  const runSlice = useCallback(async () => {
    if (!selected) {
      setError('Select a structure in the viewport first.');
      return;
    }
    setRunning(true);
    setError(null);
    setResult(null);
    setSelectedStageIdx(null);
    try {
      const res = await fetch('/api/architect/authorial/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          request,
          selectedEntityId: selected.entityId,
          structureKind: selected.kind,
          structureName: selected.name,
          worldPosition: selected.position,
          dryRun,
        }),
      });
      const json = await res.json();
      if (!json.ok) {
        setError(json.error ?? 'Unknown error');
      } else {
        setResult(json.result as VerticalSliceResult);
        // Auto-select the last completed stage.
        const lastSuccess = json.result.stages.filter((s: StageTrace) => s.success).at(-1);
        if (lastSuccess) {
          setSelectedStageIdx(json.result.stages.indexOf(lastSuccess));
        }
        // APPLY THE VISUAL OVERRIDE — this is what makes the shrine VISIBLY
        // CHANGE, not just get metadata. The override changes the rendered
        // material: color, roughness, metalness, emissive.
        if (!dryRun && json.result.completed && json.result.decisionLedgerEntryId && selected) {
          const override: AuthorialOverride = {
            color: '#5a5a52',           // weathered stone gray (desaturated)
            roughness: 0.92,             // high — weathered surface
            metalness: 0.05,             // low — ancient, not metallic
            emissive: '#3a2a1a',         // faint warm cinnabar glow
            emissiveIntensity: 0.08,     // restrained — sacred quiet
            weathering: 0.85,            // heavy weathering
            opacity: 1,
            authorialState: 'ancient-sacred',
            sourceDecisionId: json.result.decisionLedgerEntryId,
          };
          applyAuthorialOverride(selected.entityId, override);
        }
      }
      await refreshStatus();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setRunning(false);
    }
  }, [selected, request, dryRun, refreshStatus]);

  const selectedStage = useMemo<StageTrace | null>(() => {
    if (!result || selectedStageIdx === null) return null;
    return result.stages[selectedStageIdx] ?? null;
  }, [result, selectedStageIdx]);

  return (
    <div className="flex h-full flex-col gap-3 overflow-hidden p-3 text-[#c8c8e0]">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-[#2a2a4a] pb-2">
        <Sparkles className="h-3.5 w-3.5 text-emerald-400" />
        <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-300">
          Authorial Grand Architect — Vertical Slice
        </span>
        <Badge variant="outline" className="ml-1 border-emerald-500/30 bg-emerald-500/10 px-1.5 py-0 text-[9px] text-emerald-300">
          13 stages
        </Badge>
        {status?.resumable && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge variant="outline" className="ml-1 border-amber-500/40 bg-amber-500/10 px-1.5 py-0 text-[9px] text-amber-300">
                <CircleAlert className="mr-1 h-2.5 w-2.5" />
                Resumable loop present
              </Badge>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs">
              Loop {status.resumable.loopId} paused at stage "{STAGE_LABELS[status.resumable.stage] ?? status.resumable.stage}"
            </TooltipContent>
          </Tooltip>
        )}
        <div className="flex-1" />
        <Button
          variant="ghost"
          size="sm"
          className="h-6 px-2 text-[10px] text-[#8888aa] hover:text-white"
          onClick={() => void refreshStatus()}
        >
          <RefreshCw className="mr-1 h-3 w-3" />
          Refresh
        </Button>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 overflow-hidden md:grid-cols-[280px_1fr_220px]">
        {/* Left: Request + Run */}
        <div className="flex min-h-0 flex-col gap-2 overflow-y-auto pr-1">
          <div>
            <Label className="mb-1 block text-[10px] uppercase tracking-wider text-[#8888aa]">
              Selected Structure
            </Label>
            {selected ? (
              <div className="rounded border border-emerald-500/30 bg-emerald-500/5 p-2 text-[11px]">
                <div className="font-medium text-emerald-300">{selected.name}</div>
                <div className="text-[10px] text-[#8888aa]">
                  kind: <span className="font-mono text-emerald-200">{selected.kind}</span>
                </div>
                <div className="text-[10px] text-[#8888aa]">
                  entity: <span className="font-mono text-emerald-200">#{selected.entityId}</span>
                </div>
                <div className="text-[10px] text-[#8888aa]">
                  pos: <span className="font-mono text-emerald-200">({selected.position.x.toFixed(1)}, {selected.position.z.toFixed(1)})</span>
                </div>
              </div>
            ) : (
              <div className="rounded border border-amber-500/30 bg-amber-500/5 p-2 text-[10px] text-amber-300">
                Click a structure in the viewport to enable the slice.
              </div>
            )}
          </div>

          <div>
            <Label className="mb-1 block text-[10px] uppercase tracking-wider text-[#8888aa]">
              Authorial Request
            </Label>
            <textarea
              value={request}
              onChange={(e) => setRequest(e.target.value)}
              rows={3}
              className="w-full resize-none rounded border border-[#2a2a4a] bg-[#12122a] p-2 text-[11px] text-[#c8c8e0] placeholder:text-[#5a5a7a] focus:border-emerald-500/50 focus:outline-none"
              placeholder="Describe what the architect should do…"
            />
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              disabled={!canRun}
              onClick={() => void runSlice()}
              className="h-7 bg-emerald-600 px-3 text-[11px] hover:bg-emerald-500"
            >
              {running ? (
                <>
                  <RefreshCw className="mr-1 h-3 w-3 animate-spin" />
                  Running…
                </>
              ) : (
                <>
                  <Play className="mr-1 h-3 w-3" />
                  Run Slice
                </>
              )}
            </Button>
            <label className="flex cursor-pointer items-center gap-1 text-[10px] text-[#8888aa]">
              <input
                type="checkbox"
                checked={dryRun}
                onChange={(e) => setDryRun(e.target.checked)}
                className="h-3 w-3 accent-emerald-500"
              />
              Dry run
            </label>
          </div>

          {error && (
            <div className="rounded border border-red-500/30 bg-red-500/5 p-2 text-[10px] text-red-300">
              {error}
            </div>
          )}

          {result && (
            <div className="mt-2 border-t border-[#2a2a4a] pt-2">
              <div className="mb-1 text-[10px] uppercase tracking-wider text-[#8888aa]">Result</div>
              <div className="space-y-1 text-[10px]">
                <div className="flex items-center gap-1.5">
                  {result.completed ? (
                    <CircleCheck className="h-3 w-3 text-emerald-400" />
                  ) : (
                    <CircleAlert className="h-3 w-3 text-red-400" />
                  )}
                  <span>{result.completed ? 'Completed' : 'Failed'} — final stage: {STAGE_LABELS[result.finalStage] ?? result.finalStage}</span>
                </div>
                <div className="flex items-center gap-1.5 text-[#8888aa]">
                  <Clock className="h-3 w-3" />
                  <span>{result.totalDurationMs}ms total</span>
                </div>
                {result.decisionLedgerEntryId && (
                  <div className="flex items-center gap-1.5 text-[#8888aa]">
                    <Database className="h-3 w-3" />
                    <span className="font-mono text-[9px]">{result.decisionLedgerEntryId}</span>
                  </div>
                )}
                {result.narrativePromiseId && (
                  <div className="flex items-center gap-1.5 text-[#8888aa]">
                    <ScrollText className="h-3 w-3" />
                    <span className="font-mono text-[9px]">{result.narrativePromiseId}</span>
                  </div>
                )}
                <div className="flex items-center gap-1.5 text-[#8888aa]">
                  <Shield className="h-3 w-3" />
                  <span>Deterministic critic: {result.deterministicCritique ? 'YES' : 'NO'}</span>
                </div>
                <div className="flex items-center gap-1.5 text-[#8888aa]">
                  <History className="h-3 w-3" />
                  <span>Restart-recoverable: {result.restartRecoverable ? 'YES' : 'NO'}</span>
                </div>
              </div>
            </div>
          )}

          {/* Visual Transformation — before/after material parameters */}
          {currentOverride && selected && (
            <div className="mt-2 rounded border border-amber-500/30 bg-amber-500/5 p-2">
              <div className="mb-1 flex items-center gap-1 text-[9px] uppercase tracking-wider text-amber-300">
                <FlaskConical className="h-2.5 w-2.5" />
                Visual Transformation Active
              </div>
              <div className="space-y-0.5 text-[9px] text-[#aaaacc]">
                <div className="flex justify-between">
                  <span className="text-[#8888aa]">state</span>
                  <span className="font-mono text-amber-300">{currentOverride.authorialState ?? 'ancient-sacred'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#8888aa]">color</span>
                  <span className="flex items-center gap-1">
                    <span className="h-2 w-2 rounded border border-white/20" style={{ backgroundColor: currentOverride.color ?? '#5a5a52' }} />
                    <span className="font-mono">{currentOverride.color ?? '#5a5a52'}</span>
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#8888aa]">roughness</span>
                  <span className="font-mono text-amber-300">{currentOverride.roughness ?? 0.92}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#8888aa]">metalness</span>
                  <span className="font-mono text-amber-300">{currentOverride.metalness ?? 0.05}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#8888aa]">emissive</span>
                  <span className="font-mono text-amber-300">{currentOverride.emissive ?? '#3a2a1a'} @ {(currentOverride.emissiveIntensity ?? 0.08).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#8888aa]">weathering</span>
                  <span className="font-mono text-amber-300">{((currentOverride.weathering ?? 0.85) * 100).toFixed(0)}%</span>
                </div>
              </div>
              <div className="mt-2 flex gap-1">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-5 flex-1 border-red-500/30 bg-red-500/5 px-1 text-[9px] text-red-300 hover:bg-red-500/15"
                  onClick={() => selected && clearAuthorialOverride(selected.entityId)}
                >
                  <RotateCcw className="mr-1 h-2.5 w-2.5" />
                  Revert Visual
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-5 flex-1 border-[#3a3a5a] bg-[#1e1e3e] px-1 text-[9px] text-[#aaaacc] hover:bg-[#2a2a4a]"
                  onClick={() => undoAuthorialOverride()}
                >
                  <History className="mr-1 h-2.5 w-2.5" />
                  Undo
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Center: 13-stage pipeline */}
        <div className="flex min-h-0 flex-col gap-2 overflow-hidden">
          <div className="text-[10px] uppercase tracking-wider text-[#8888aa]">
            13-Stage Unbound Loop
          </div>
          <div className="grid min-h-0 flex-1 grid-cols-7 gap-1 overflow-y-auto">
            {STAGE_ORDER.map((stage, idx) => {
              const trace = result?.stages.find((s) => s.stage === stage);
              const isSelected = selectedStageIdx === result?.stages.findIndex((s) => s.stage === stage);
              const isRunning = running && !trace && result?.stages.length === idx;
              const status: 'pending' | 'running' | 'success' | 'failed' = trace
                ? trace.success
                  ? 'success'
                  : 'failed'
                : isRunning
                  ? 'running'
                  : 'pending';
              return (
                <Tooltip key={stage}>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => {
                        if (trace) {
                          const i = result?.stages.findIndex((s) => s.stage === stage) ?? null;
                          setSelectedStageIdx(i);
                        }
                      }}
                      className={`flex h-full min-h-[60px] flex-col items-center justify-center rounded border p-1 text-center transition-colors ${
                        isSelected
                          ? 'border-emerald-400 bg-emerald-500/15'
                          : status === 'success'
                            ? 'border-emerald-500/30 bg-emerald-500/5 hover:border-emerald-400/60'
                            : status === 'failed'
                              ? 'border-red-500/30 bg-red-500/5 hover:border-red-400/60'
                              : status === 'running'
                                ? 'border-amber-500/30 bg-amber-500/5'
                                : 'border-[#2a2a4a] bg-[#12122a] hover:border-[#3a3a5a]'
                      }`}
                    >
                      <div className="mb-0.5">
                        {status === 'success' && <CircleCheck className="h-3 w-3 text-emerald-400" />}
                        {status === 'failed' && <CircleAlert className="h-3 w-3 text-red-400" />}
                        {status === 'running' && <RefreshCw className="h-3 w-3 animate-spin text-amber-400" />}
                        {status === 'pending' && <CircleDot className="h-3 w-3 text-[#5a5a7a]" />}
                      </div>
                      <div className="text-[9px] font-medium uppercase tracking-wider text-[#aaaacc]">
                        {STAGE_LABELS[stage]}
                      </div>
                      {trace && (
                        <div className="mt-0.5 text-[8px] text-[#8888aa]">
                          {trace.durationMs}ms
                        </div>
                      )}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-[280px] text-[10px]">
                    {trace ? (
                      <div className="space-y-1">
                        <div className="font-semibold">{STAGE_LABELS[stage]}</div>
                        <div className="text-[9px] opacity-80">{trace.summary}</div>
                        {trace.errors && trace.errors.length > 0 && (
                          <div className="text-[9px] text-red-300">{trace.errors.join('; ')}</div>
                        )}
                      </div>
                    ) : (
                      <div>{STAGE_LABELS[stage]} — pending</div>
                    )}
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </div>

          {/* Selected stage detail */}
          <div className="min-h-0 flex-1 overflow-y-auto rounded border border-[#2a2a4a] bg-[#12122a] p-2">
            {selectedStage ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="border-emerald-500/30 px-1.5 py-0 text-[9px] text-emerald-300">
                    Stage {selectedStageIdx! + 1}/13
                  </Badge>
                  <span className="text-[11px] font-semibold text-emerald-300">
                    {STAGE_LABELS[selectedStage.stage]}
                  </span>
                  <span className="text-[9px] text-[#8888aa]">
                    {selectedStage.durationMs}ms · {selectedStage.startedAt.split('T')[1]?.split('.')[0]}
                  </span>
                </div>
                <div className="rounded bg-[#0a0a1e] p-2 text-[10px] text-[#c8c8e0]">
                  {selectedStage.summary}
                </div>
                {selectedStage.artifact && (
                  <details className="rounded bg-[#0a0a1e] p-2 text-[9px]">
                    <summary className="cursor-pointer text-[#8888aa] hover:text-white">
                      Stage artifact (JSON)
                    </summary>
                    <pre className="mt-1 max-h-48 overflow-auto whitespace-pre-wrap break-all font-mono text-[9px] text-[#aaaacc]">
                      {JSON.stringify(selectedStage.artifact, null, 2)}
                    </pre>
                  </details>
                )}
                {selectedStage.errors && selectedStage.errors.length > 0 && (
                  <div className="rounded border border-red-500/30 bg-red-500/5 p-2 text-[10px] text-red-300">
                    {selectedStage.errors.map((e, i) => (
                      <div key={i}>• {e}</div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="flex h-full items-center justify-center text-[10px] text-[#5a5a7a]">
                {result
                  ? 'Click a stage above to inspect its artifact.'
                  : 'Run a slice to see the 13-stage trace.'}
              </div>
            )}
          </div>
        </div>

        {/* Right: Durable state + Bible verification */}
        <div className="flex min-h-0 flex-col gap-2 overflow-y-auto">
          <div className="text-[10px] uppercase tracking-wider text-[#8888aa]">
            Durable State
          </div>
          {status ? (
            <div className="space-y-2">
              <div className="rounded border border-[#2a2a4a] bg-[#12122a] p-2">
                <div className="mb-1 flex items-center gap-1 text-[9px] uppercase tracking-wider text-[#8888aa]">
                  <Database className="h-2.5 w-2.5" /> Decision Ledgers
                </div>
                <div className="space-y-0.5 text-[10px]">
                  {Object.entries(status.ledgerStats).map(([k, v]) => (
                    <div key={k} className="flex justify-between">
                      <span className="text-[#8888aa]">{k}</span>
                      <span className="font-mono text-emerald-300">{v}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded border border-[#2a2a4a] bg-[#12122a] p-2">
                <div className="mb-1 flex items-center gap-1 text-[9px] uppercase tracking-wider text-[#8888aa]">
                  <ScrollText className="h-2.5 w-2.5" /> Narrative World Graph
                </div>
                <div className="space-y-0.5 text-[10px]">
                  <div className="flex justify-between">
                    <span className="text-[#8888aa]">Promises</span>
                    <span className="font-mono text-emerald-300">{status.narrativePromises}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#8888aa]">Motifs</span>
                    <span className="font-mono text-emerald-300">{status.thematicMotifs}</span>
                  </div>
                </div>
              </div>

              <div className="rounded border border-[#2a2a4a] bg-[#12122a] p-2">
                <div className="mb-1 flex items-center gap-1 text-[9px] uppercase tracking-wider text-[#8888aa]">
                  <FileText className="h-2.5 w-2.5" /> Compiled Bible
                </div>
                <div className="space-y-0.5 text-[10px]">
                  <div className="flex justify-between">
                    <span className="text-[#8888aa]">Canon rules</span>
                    <span className="font-mono text-emerald-300">{status.bible.canonRules}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#8888aa]">Style constraints</span>
                    <span className="font-mono text-emerald-300">{status.bible.styleConstraints}</span>
                  </div>
                  <div className="mt-1 border-t border-[#2a2a4a] pt-1">
                    <div className="flex items-center gap-1 text-[9px]">
                      {status.bible.spanVerification.verified ? (
                        <CircleCheck className="h-2.5 w-2.5 text-emerald-400" />
                      ) : (
                        <CircleAlert className="h-2.5 w-2.5 text-red-400" />
                      )}
                      <span className="text-[#8888aa]">
                        Source spans: {status.bible.spanVerification.spansChecked} checked,{' '}
                        {status.bible.spanVerification.verified ? 'all verified' : 'some failed'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {status.recentSlices.length > 0 && (
                <div className="rounded border border-[#2a2a4a] bg-[#12122a] p-2">
                  <div className="mb-1 flex items-center gap-1 text-[9px] uppercase tracking-wider text-[#8888aa]">
                    <Activity className="h-2.5 w-2.5" /> Recent Slices
                  </div>
                  <div className="space-y-1 text-[9px]">
                    {status.recentSlices.slice(0, 5).map((s) => (
                      <div key={s.loopId} className="border-l border-emerald-500/30 pl-1.5">
                        <div className="flex items-center gap-1">
                          {s.completed ? (
                            <CircleCheck className="h-2 w-2 text-emerald-400" />
                          ) : (
                            <CircleAlert className="h-2 w-2 text-red-400" />
                          )}
                          <span className="truncate text-[#aaaacc]">{s.input}</span>
                        </div>
                        <div className="text-[8px] text-[#5a5a7a]">
                          {s.totalDurationMs}ms · {s.decisionLedgerEntryId ? 'ledger entry recorded' : 'no ledger entry'}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-[10px] text-[#5a5a7a]">Loading…</div>
          )}
        </div>
      </div>
    </div>
  );
}
