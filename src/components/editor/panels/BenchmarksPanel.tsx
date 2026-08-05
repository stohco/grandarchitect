'use client';

/**
 * BenchmarksPanel — Ursus engine comparison suite.
 *
 * POSTs to /api/architect/benchmark (auto-runs on mount, plus via the
 * "Run Benchmarks" button). The route runs 5 benchmarks (spawn / findAll
 * / disable / enable / GetComponent, each at 10k entities) and reports
 * our engine's time vs. the Ursus target and Unity baseline.
 *
 * Layout:
 *   - Overall verdict banner (beats_ursus / matches_ursus / below_ursus)
 *   - Results table: Benchmark | Our Engine (ms) | Ursus Target (ms) |
 *     Unity (ms) | Verdict. Our-engine cell is emerald / amber / red.
 */

import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Gauge,
  Play,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  MinusCircle,
  Trophy,
} from 'lucide-react';

type Verdict = 'beats_ursus' | 'matches_ursus' | 'below_ursus';

interface BenchmarkResult {
  benchmarkName: string;
  entityCount: number;
  engineMs: number;
  ursusTargetMs: number;
  unityMs: number;
  verdict: Verdict;
  ratio: number;
  operationsPerMs: number;
}

interface BenchmarkSuite {
  suiteId: string;
  timestamp: string;
  results: BenchmarkResult[];
  overallVerdict: Verdict;
  fastestMs: number;
  slowestMs: number;
}

const VERDICT_STYLE: Record<
  Verdict,
  { color: string; bg: string; border: string; icon: React.ReactNode; label: string }
> = {
  beats_ursus: {
    color: '#10b981',
    bg: 'bg-emerald-500/15',
    border: 'border-emerald-500/40',
    icon: <CheckCircle2 className="h-3.5 w-3.5" />,
    label: 'Beats Ursus',
  },
  matches_ursus: {
    color: '#d4a04a',
    bg: 'bg-amber-500/15',
    border: 'border-amber-500/40',
    icon: <MinusCircle className="h-3.5 w-3.5" />,
    label: 'Matches Ursus',
  },
  below_ursus: {
    color: '#f472b6',
    bg: 'bg-rose-500/15',
    border: 'border-rose-500/40',
    icon: <XCircle className="h-3.5 w-3.5" />,
    label: 'Below Ursus',
  },
};

export default function BenchmarksPanel() {
  const [data, setData] = useState<BenchmarkSuite | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/architect/benchmark', { method: 'POST' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = (await res.json()) as BenchmarkSuite;
      setData(json);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  // Auto-run on mount.
  useEffect(() => {
    void run();
  }, [run]);

  const overall = data?.overallVerdict;
  const overallStyle = overall ? VERDICT_STYLE[overall] : null;

  return (
    <div className="flex h-full flex-col bg-[#0e0e24]">
      {/* Header */}
      <div className="flex h-8 items-center justify-between border-b border-[#2a2a4a] px-3">
        <div className="flex items-center gap-1.5">
          <Gauge className="h-3.5 w-3.5 text-emerald-500" />
          <span className="text-[10px] uppercase tracking-wider text-[#5a5a7a]">
            Benchmarks · {data ? `${data.results.length} runs · 10k entities` : 'loading'}
          </span>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={() => void run()}
          disabled={loading}
          className="h-6 border-[#2a2a4a] bg-[#12122a] px-2 text-[10px] text-[#c8c8e0] hover:bg-[#1d1d36]"
        >
          {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Play className="h-3 w-3" />}
          Run Benchmarks
        </Button>
      </div>

      <ScrollArea className="min-h-0 flex-1">
        <div className="p-3">
          {error ? (
            <div className="flex items-center gap-2 rounded border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>Run failed: {error}</span>
            </div>
          ) : data && overallStyle ? (
            <>
              {/* Overall verdict banner */}
              <div
                className={`mb-3 flex items-center justify-between rounded border px-3 py-2 text-xs ${overallStyle.bg} ${overallStyle.border}`}
                style={{ color: overallStyle.color }}
              >
                <div className="flex items-center gap-2">
                  {overall === 'beats_ursus' ? (
                    <Trophy className="h-4 w-4" />
                  ) : (
                    overallStyle.icon
                  )}
                  <span className="font-semibold uppercase tracking-wider">
                    {overallStyle.label}
                  </span>
                </div>
                <div className="flex items-center gap-3 font-mono text-[10px] text-[#8888aa]">
                  <span>fastest: {data.fastestMs.toFixed(2)}ms</span>
                  <span>·</span>
                  <span>slowest: {data.slowestMs.toFixed(2)}ms</span>
                </div>
              </div>

              {/* Results table */}
              <div className="overflow-hidden rounded border border-[#2a2a4a]">
                <table className="w-full text-left text-[11px]">
                  <thead className="bg-[#12122a] text-[10px] uppercase tracking-wider text-[#5a5a7a]">
                    <tr>
                      <th className="px-2 py-1.5">Benchmark</th>
                      <th className="px-2 py-1.5 text-right">Our Engine</th>
                      <th className="px-2 py-1.5 text-right">Ursus Target</th>
                      <th className="px-2 py-1.5 text-right">Unity</th>
                      <th className="px-2 py-1.5 text-right">Ratio</th>
                      <th className="px-2 py-1.5 text-center">Verdict</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.results.map((r) => {
                      const v = VERDICT_STYLE[r.verdict];
                      return (
                        <tr key={r.benchmarkName} className="border-t border-[#2a2a4a]">
                          <td className="px-2 py-1.5">
                            <div className="text-[#c8c8e0]">{r.benchmarkName}</div>
                            <div className="font-mono text-[9px] text-[#5a5a7a]">
                              {r.entityCount.toLocaleString()} ops · {r.operationsPerMs.toLocaleString()} ops/ms
                            </div>
                          </td>
                          <td
                            className={`px-2 py-1.5 text-right font-mono font-bold ${v.bg}`}
                            style={{ color: v.color }}
                          >
                            {r.engineMs.toFixed(3)}
                          </td>
                          <td className="px-2 py-1.5 text-right font-mono text-[#8888aa]">
                            {r.ursusTargetMs.toFixed(3)}
                          </td>
                          <td className="px-2 py-1.5 text-right font-mono text-[#5a5a7a]">
                            {r.unityMs.toFixed(3)}
                          </td>
                          <td className="px-2 py-1.5 text-right font-mono text-[#8888aa]">
                            {r.ratio.toFixed(2)}×
                          </td>
                          <td className="px-2 py-1.5 text-center">
                            <span
                              className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[9px] font-bold uppercase ${v.bg}`}
                              style={{ color: v.color }}
                            >
                              {v.icon}
                              {r.verdict === 'beats_ursus'
                                ? 'BEATS'
                                : r.verdict === 'matches_ursus'
                                  ? 'MATCH'
                                  : 'BELOW'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Footnote */}
              <p className="mt-2 text-[9px] leading-snug text-[#5a5a7a]">
                Verdict uses engine-time / Ursus-target ratio: <span className="text-emerald-300">&lt;1.0× = beats</span>
                , <span className="text-amber-300">1.0–1.5× = matches</span>, <span className="text-rose-300">&gt;1.5× = below</span>.
                Ursus targets are the published benchmarks from the Ursus engine; Unity is the baseline
                from the original Unity-of-ECS comparison.
              </p>
            </>
          ) : (
            <div className="flex items-center gap-2 rounded border border-[#2a2a4a] bg-[#12122a] px-3 py-2 text-xs text-[#8888aa]">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-emerald-500" />
              Running 5 benchmarks at 10k entities each…
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
