/**
 * Live Architect Studio — Benchmarks Panel (RCVC: Performance)
 *
 * Ursus engine comparison dashboard.
 *   POST /api/architect/benchmark → BenchmarkSuite
 *
 * Auto-runs on mount so the user sees results immediately. Renders the overall
 * verdict as a banner, then a table of per-benchmark results with the "Our
 * Engine" cell colour-coded (emerald = beats, amber = matches, red = below).
 * The ratio (engineMs / ursusTargetMs) is shown as a badge — values < 1.0
 * mean we're faster than the Ursus target.
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Gauge,
  Loader2,
  Play,
  Trophy,
  CheckCircle2,
  AlertTriangle,
  MinusCircle,
  XCircle,
  Cpu,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

// ----------------------------------------------------------------------------
// Local types — mirror RCVC engine types.
// ----------------------------------------------------------------------------

type BenchmarkVerdict = 'beats_ursus' | 'matches_ursus' | 'below_ursus';

interface BenchmarkResult {
  benchmarkName: string;
  entityCount: number;
  engineMs: number;
  ursusTargetMs: number;
  unityMs: number;
  verdict: BenchmarkVerdict;
  ratio: number;
  operationsPerMs: number;
}

interface BenchmarkSuite {
  suiteId: string;
  timestamp: string;
  results: BenchmarkResult[];
  overallVerdict: BenchmarkVerdict;
  fastestMs: number;
  slowestMs: number;
}

// ----------------------------------------------------------------------------
// Verdict styling
// ----------------------------------------------------------------------------

const VERDICT_STYLES: Record<
  BenchmarkVerdict,
  {
    cell: string;
    badge: string;
    icon: typeof Trophy;
    label: string;
    bannerBg: string;
    bannerBorder: string;
    bannerText: string;
  }
> = {
  beats_ursus: {
    cell: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40',
    badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    icon: Trophy,
    label: 'BEATS URSUS',
    bannerBg: 'bg-emerald-500/10',
    bannerBorder: 'border-emerald-500/40',
    bannerText: 'text-emerald-300',
  },
  matches_ursus: {
    cell: 'bg-amber-500/15 text-amber-300 border-amber-500/40',
    badge: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    icon: MinusCircle,
    label: 'MATCHES URSUS',
    bannerBg: 'bg-amber-500/10',
    bannerBorder: 'border-amber-500/40',
    bannerText: 'text-amber-300',
  },
  below_ursus: {
    cell: 'bg-red-500/15 text-red-300 border-red-500/40',
    badge: 'bg-red-500/20 text-red-300 border-red-500/40',
    icon: XCircle,
    label: 'BELOW URSUS',
    bannerBg: 'bg-red-500/10',
    bannerBorder: 'border-red-500/40',
    bannerText: 'text-red-300',
  },
};

function formatMs(ms: number): string {
  if (ms < 1) return ms.toFixed(3);
  if (ms < 10) return ms.toFixed(2);
  return ms.toFixed(1);
}

function formatOps(ops: number): string {
  if (ops >= 1_000_000) return `${(ops / 1_000_000).toFixed(1)}M`;
  if (ops >= 1_000) return `${(ops / 1_000).toFixed(1)}K`;
  return ops.toFixed(0);
}

// ----------------------------------------------------------------------------
// Panel
// ----------------------------------------------------------------------------

export default function BenchmarksPanel() {
  const [suite, setSuite] = useState<BenchmarkSuite | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ranAt, setRanAt] = useState<string | null>(null);

  const run = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/architect/benchmark', { method: 'POST' });
      const json = (await res.json()) as BenchmarkSuite & { error?: string };
      if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
      setSuite(json);
      setRanAt(new Date().toLocaleTimeString());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Benchmark failed');
    } finally {
      setLoading(false);
    }
  }, []);

  // Auto-run on mount.
  useEffect(() => {
    void run();
  }, []);

  const overallCfg = suite ? VERDICT_STYLES[suite.overallVerdict] : null;
  const entityCount = suite?.results[0]?.entityCount ?? 10_000;

  const passCount = suite?.results.filter((r) => r.verdict === 'beats_ursus').length ?? 0;
  const matchCount = suite?.results.filter((r) => r.verdict === 'matches_ursus').length ?? 0;
  const failCount = suite?.results.filter((r) => r.verdict === 'below_ursus').length ?? 0;

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-[#2a2a4a] px-3 py-1.5">
        <Gauge className="h-3.5 w-3.5 text-emerald-400" />
        <span className="text-[11px] font-semibold uppercase tracking-wider text-[#8888aa]">
          Ursus Engine Comparison
        </span>
        <Badge variant="outline" className="h-4 border-[#2a2a4a] bg-[#1a1a2e] text-[9px] text-[#8888aa]">
          <Cpu className="mr-0.5 h-2.5 w-2.5" />
          {entityCount.toLocaleString()} entities
        </Badge>
        {suite && (
          <Badge variant="outline" className="h-4 border-[#2a2a4a] bg-[#1a1a2e] text-[9px] text-[#5a5a7a]">
            {suite.results.length} benchmarks
          </Badge>
        )}
        <div className="flex-1" />
        <Button
          size="sm"
          className="h-6 gap-1 bg-emerald-600 px-2 text-[10px] text-white hover:bg-emerald-500"
          onClick={run}
          disabled={loading}
        >
          {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Play className="h-3 w-3" />}
          Run Benchmarks
        </Button>
      </div>

      {/* Body */}
      <ScrollArea className="min-h-0 flex-1">
        <div className="space-y-2 p-2">
          {error && (
            <div className="flex items-center gap-2 rounded border border-red-500/40 bg-red-500/10 px-2 py-1.5 text-[11px] text-red-300">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{error}</span>
            </div>
          )}

          {loading && !suite && (
            <div className="flex items-center gap-2 px-2 py-4 text-[11px] text-[#5a5a7a]">
              <Loader2 className="h-3 w-3 animate-spin text-emerald-400" />
              Running benchmark suite…
            </div>
          )}

          {/* Overall verdict banner */}
          {suite && overallCfg && (
            <div className={`flex items-center gap-3 rounded-md border ${overallCfg.bannerBorder} ${overallCfg.bannerBg} px-3 py-2`}>
              <overallCfg.icon className={`h-5 w-5 shrink-0 ${overallCfg.bannerText}`} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-[#5a5a7a]">
                    Overall Verdict
                  </span>
                  <Badge className={`h-4 px-1 text-[9px] ${overallCfg.badge}`}>
                    {overallCfg.label}
                  </Badge>
                </div>
                <div className={`font-mono text-[12px] font-semibold ${overallCfg.bannerText}`}>
                  {passCount}/{suite.results.length} beat Ursus · {matchCount} match · {failCount} below
                </div>
              </div>
              <div className="flex shrink-0 gap-3 text-right">
                <div>
                  <div className="text-[9px] uppercase tracking-wider text-[#5a5a7a]">fastest</div>
                  <div className="font-mono text-[11px] text-emerald-300">
                    {formatMs(suite.fastestMs)}ms
                  </div>
                </div>
                <div>
                  <div className="text-[9px] uppercase tracking-wider text-[#5a5a7a]">slowest</div>
                  <div className="font-mono text-[11px] text-amber-300">
                    {formatMs(suite.slowestMs)}ms
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

          {/* Results table */}
          {suite && (
            <div className="overflow-hidden rounded border border-[#2a2a4a] bg-[#0a0a1e]">
              <table className="w-full text-[11px]">
                <thead>
                  <tr className="border-b border-[#2a2a4a] text-[9px] uppercase tracking-wider text-[#5a5a7a]">
                    <th className="px-2 py-1 text-left font-medium">Benchmark</th>
                    <th className="px-2 py-1 text-right font-medium">
                      Our Engine
                      <span className="ml-1 font-normal text-[#4a4a6a]">(ms)</span>
                    </th>
                    <th className="px-2 py-1 text-right font-medium">
                      Ursus Target
                      <span className="ml-1 font-normal text-[#4a4a6a]">(ms)</span>
                    </th>
                    <th className="px-2 py-1 text-right font-medium">
                      Unity
                      <span className="ml-1 font-normal text-[#4a4a6a]">(ms)</span>
                    </th>
                    <th className="px-2 py-1 text-center font-medium">Ratio</th>
                    <th className="px-2 py-1 text-right font-medium">
                      Ops/ms
                    </th>
                    <th className="px-2 py-1 text-center font-medium">Verdict</th>
                  </tr>
                </thead>
                <tbody>
                  {suite.results.map((r) => {
                    const cfg = VERDICT_STYLES[r.verdict];
                    return (
                      <tr key={r.benchmarkName} className="border-b border-[#1a1a2e] last:border-0">
                        <td className="px-2 py-1 text-[#c8c8e0]">{r.benchmarkName}</td>
                        <td className={`px-2 py-1 text-right font-mono font-semibold border-l border-[#1a1a2e] ${cfg.cell}`}>
                          {formatMs(r.engineMs)}
                        </td>
                        <td className="px-2 py-1 text-right font-mono text-[#aaaacc]">
                          {formatMs(r.ursusTargetMs)}
                        </td>
                        <td className="px-2 py-1 text-right font-mono text-[#5a5a7a]">
                          {formatMs(r.unityMs)}
                        </td>
                        <td className="px-2 py-1 text-center">
                          <Badge
                            className={`h-4 px-1 font-mono text-[9px] ${cfg.badge}`}
                            title="engineMs / ursusTargetMs — lower is better"
                          >
                            ×{r.ratio.toFixed(2)}
                          </Badge>
                        </td>
                        <td className="px-2 py-1 text-right font-mono text-[#8888aa]">
                          {formatOps(r.operationsPerMs)}
                        </td>
                        <td className="px-2 py-1 text-center">
                          <span className={`inline-flex items-center gap-1 text-[9px] font-semibold ${cfg.badge.split(' ').find((c) => c.startsWith('text-')) ?? ''}`}>
                            {r.verdict === 'beats_ursus' ? (
                              <CheckCircle2 className="h-3 w-3" />
                            ) : r.verdict === 'matches_ursus' ? (
                              <MinusCircle className="h-3 w-3" />
                            ) : (
                              <XCircle className="h-3 w-3" />
                            )}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {suite && (
            <div className="text-[9px] text-[#4a4a6a]">
              Ratio = our engine time ÷ Ursus target time. Values under 1.0× mean we are faster than Ursus.
              Unity column shown for additional context.
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
