/**
 * Live Architect Studio — Conformance Panel
 *
 * Runs the 7 conformance suites via POST /api/engine/run-tests and renders
 * a summary banner plus an expandable table of per-suite results. Each row
 * expands to reveal the tail (last few lines of the runner output) in a
 * monospace block. Auto-runs on mount so the user sees results immediately.
 *
 * Palette: dark navy (#0e0e24 / #12122a / #1a1a2e) with emerald/amber/rose
 * accents. No indigo or blue.
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  FlaskConical,
  Loader2,
  Play,
  CheckCircle2,
  XCircle,
  ChevronRight,
  ChevronDown,
  AlertTriangle,
  ShieldCheck,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CONFORMANCE_FILES } from '@/lib/engine/dashboard-data';

// ----------------------------------------------------------------------------
// Local types — mirror the API response contract.
// ----------------------------------------------------------------------------

interface SuiteResult {
  name: string;
  path: string;
  expected: number;
  passed: number;
  failed: number;
  total: number;
  ok: boolean;
  durationMs: number;
  tail: string;
}

interface RunResponse {
  ok: boolean;
  totalPassed: number;
  totalFailed: number;
  totalDuration: number;
  suites: SuiteResult[];
  timestamp: string;
}

// ----------------------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------------------

function formatMs(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

function statusBadge(ok: boolean, failed: number, total: number) {
  if (failed > 0 || (total === 0 && !ok)) {
    return (
      <Badge className="h-4 gap-0.5 bg-rose-500/20 px-1 text-[9px] font-semibold text-rose-300 border border-rose-500/40">
        <XCircle className="h-2.5 w-2.5" />
        FAIL
      </Badge>
    );
  }
  return (
    <Badge className="h-4 gap-0.5 bg-emerald-500/20 px-1 text-[9px] font-semibold text-emerald-300 border border-emerald-500/40">
      <CheckCircle2 className="h-2.5 w-2.5" />
      PASS
    </Badge>
  );
}

// ----------------------------------------------------------------------------
// Panel
// ----------------------------------------------------------------------------

export default function ConformancePanel() {
  const [data, setData] = useState<RunResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [ranAt, setRanAt] = useState<string | null>(null);

  const run = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/engine/run-tests', { method: 'POST' });
      const json = (await res.json()) as RunResponse & { error?: string };
      if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
      setData(json);
      setRanAt(new Date().toLocaleTimeString());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Conformance run failed');
    } finally {
      setLoading(false);
    }
  }, []);

  // Auto-run on mount so the user sees results immediately.
  useEffect(() => {
    void run();
  }, []);

  const suites = data?.suites ?? [];
  const allOk = data?.ok ?? false;

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex h-8 items-center gap-2 border-b border-[#2a2a4a] px-3">
        <FlaskConical className="h-3.5 w-3.5 text-emerald-400" />
        <span className="text-[11px] font-semibold uppercase tracking-wider text-[#8888aa]">
          Conformance Suites
        </span>
        <Badge variant="outline" className="h-4 border-[#2a2a4a] bg-[#1a1a2e] text-[9px] text-[#8888aa]">
          {CONFORMANCE_FILES.length} suites
        </Badge>
        <div className="flex-1" />
        <Button
          size="sm"
          className="h-6 gap-1 bg-emerald-600 px-2 text-[10px] text-white hover:bg-emerald-500"
          onClick={run}
          disabled={loading}
        >
          {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Play className="h-3 w-3" />}
          Run All Suites
        </Button>
      </div>

      {/* Body */}
      <ScrollArea className="min-h-0 flex-1">
        <div className="space-y-2 p-2">
          {/* Error state */}
          {error && (
            <div className="flex items-center gap-2 rounded border border-rose-500/40 bg-rose-500/10 px-2 py-1.5 text-[11px] text-rose-300">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{error}</span>
            </div>
          )}

          {/* Loading state (first run, no data yet) */}
          {loading && !data && (
            <div className="flex items-center gap-2 px-2 py-4 text-[11px] text-[#5a5a7a]">
              <Loader2 className="h-3 w-3 animate-spin text-emerald-400" />
              Running {CONFORMANCE_FILES.length} suites…
            </div>
          )}

          {/* Summary banner */}
          {data && (
            <div
              className={`flex items-center gap-3 rounded-md border px-3 py-2 ${
                allOk
                  ? 'border-emerald-500/40 bg-emerald-500/10'
                  : 'border-rose-500/40 bg-rose-500/10'
              }`}
            >
              {allOk ? (
                <ShieldCheck className="h-5 w-5 shrink-0 text-emerald-300" />
              ) : (
                <AlertTriangle className="h-5 w-5 shrink-0 text-rose-300" />
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-[#5a5a7a]">
                    Overall
                  </span>
                  <Badge
                    className={`h-4 px-1 text-[9px] ${
                      allOk
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                    }`}
                  >
                    {allOk ? 'ALL PASS' : 'FAILURES'}
                  </Badge>
                </div>
                <div
                  className={`font-mono text-[12px] font-semibold ${
                    allOk ? 'text-emerald-300' : 'text-rose-300'
                  }`}
                >
                  {data.totalPassed} passed · {data.totalFailed} failed
                </div>
              </div>
              <div className="flex shrink-0 gap-3 text-right">
                <div>
                  <div className="text-[9px] uppercase tracking-wider text-[#5a5a7a]">duration</div>
                  <div className="font-mono text-[11px] text-amber-300">
                    {formatMs(data.totalDuration)}
                  </div>
                </div>
                {ranAt && (
                  <div>
                    <div className="text-[9px] uppercase tracking-wider text-[#5a5a7a]">ran</div>
                    <div className="font-mono text-[11px] text-[#8888aa]">{ranAt}</div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Re-run loading line (data already present) */}
          {loading && data && (
            <div className="flex items-center gap-2 px-2 py-1 text-[11px] text-[#5a5a7a]">
              <Loader2 className="h-3 w-3 animate-spin text-emerald-400" />
              Re-running {CONFORMANCE_FILES.length} suites…
            </div>
          )}

          {/* Suites table */}
          {suites.length > 0 && (
            <div className="overflow-hidden rounded border border-[#2a2a4a] bg-[#0a0a1e]">
              <table className="w-full text-[11px]">
                <thead>
                  <tr className="border-b border-[#2a2a4a] text-[9px] uppercase tracking-wider text-[#5a5a7a]">
                    <th className="w-4 px-1 py-1" />
                    <th className="px-2 py-1 text-left font-medium">Suite</th>
                    <th className="px-2 py-1 text-right font-medium">Expected</th>
                    <th className="px-2 py-1 text-right font-medium">Passed</th>
                    <th className="px-2 py-1 text-right font-medium">Failed</th>
                    <th className="px-2 py-1 text-right font-medium">Duration</th>
                    <th className="px-2 py-1 text-center font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {suites.map((s) => {
                    const isOpen = expanded === s.name;
                    return (
                      <tr key={s.name} className="border-b border-[#1a1a2e] last:border-0 align-top">
                        <td className="px-1 py-1">
                          <button
                            type="button"
                            onClick={() => setExpanded(isOpen ? null : s.name)}
                            className="flex h-4 w-4 items-center justify-center rounded text-[#5a5a7a] hover:bg-[#1e1e3e] hover:text-[#8888aa]"
                            aria-label={isOpen ? 'Collapse' : 'Expand'}
                          >
                            {isOpen ? (
                              <ChevronDown className="h-3 w-3" />
                            ) : (
                              <ChevronRight className="h-3 w-3" />
                            )}
                          </button>
                        </td>
                        <td className="px-2 py-1">
                          <div className="font-medium text-[#c8c8e0]">{s.name}</div>
                          <div className="font-mono text-[9px] text-[#4a4a6a]">{s.path}</div>
                        </td>
                        <td className="px-2 py-1 text-right font-mono text-[#8888aa]">
                          {s.expected}
                        </td>
                        <td className="px-2 py-1 text-right font-mono text-emerald-300">
                          {s.passed}
                        </td>
                        <td
                          className={`px-2 py-1 text-right font-mono ${
                            s.failed > 0 ? 'text-rose-300' : 'text-[#5a5a7a]'
                          }`}
                        >
                          {s.failed}
                        </td>
                        <td className="px-2 py-1 text-right font-mono text-amber-300">
                          {formatMs(s.durationMs)}
                        </td>
                        <td className="px-2 py-1 text-center">
                          {statusBadge(s.ok, s.failed, s.total)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* Expanded tail output */}
              {expanded && suites.find((s) => s.name === expanded) && (
                <div className="border-t border-[#2a2a4a] bg-[#06061a] px-3 py-2">
                  <div className="mb-1 flex items-center gap-1 text-[9px] uppercase tracking-wider text-[#5a5a7a]">
                    <FlaskConical className="h-2.5 w-2.5" />
                    Output tail — {expanded}
                  </div>
                  <pre className="max-h-40 overflow-auto whitespace-pre-wrap break-words font-mono text-[10px] leading-relaxed text-[#8888aa]">
                    {suites.find((s) => s.name === expanded)?.tail || '(no output)'}
                  </pre>
                </div>
              )}
            </div>
          )}

          {/* Empty hint when no data and not loading */}
          {!data && !loading && !error && (
            <div className="px-2 py-4 text-[11px] text-[#5a5a7a]">
              Click <span className="text-emerald-300">Run All Suites</span> to execute the{' '}
              {CONFORMANCE_FILES.length} conformance suites.
            </div>
          )}

          {data && (
            <div className="text-[9px] text-[#4a4a6a]">
              Click a row to expand the runner tail output. Expected counts are the baseline per
              suite.
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
