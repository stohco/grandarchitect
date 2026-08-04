/**
 * Live Architect Studio — Complexity Panel (RCVC: Complexity)
 *
 * Complexity observatory dashboard.
 *   GET /api/architect/complexity?scale=...&window=...&seed=...
 *
 * Renders the trend diagnosis prominently, four summary metric tiles,
 * sparkline SVGs for compressibility and diversity, and a seed-comparison
 * table.
 */

'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import {
  Activity,
  Loader2,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Waves,
  Boxes,
  AlertTriangle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';

// ----------------------------------------------------------------------------
// Local types — mirror RCVC engine types.
// ----------------------------------------------------------------------------

type SpatialScale = 'npc' | 'settlement' | 'region' | 'planet' | 'realm' | 'multiverse';
type TimeWindow = 'minutes' | 'days' | 'years' | 'centuries' | 'generations';
type Trend = 'homogenizing' | 'chaotic' | 'structured' | 'stable';

interface ComplexityMetrics {
  sampleId: string;
  compressibility: number;
  entropy: number;
  diversity: number;
  persistence: number;
  causalChainLength: number;
  recurrence: number;
  novelty: number;
  lightConeMI: number;
  predictiveValue: number;
}

interface WorldStateSample {
  sampleId: string;
  tick: number;
  scale: SpatialScale;
  regionId?: string;
  coarseGrainedState: string;
  entityCount: number;
  factionCount: number;
  eventCount: number;
  raw: Record<string, unknown>;
}

interface SeedComparison {
  seedA: string;
  seedB: string;
  compressibilityDelta: number;
  diversityDelta: number;
  predictiveValueDelta: number;
  note: string;
}

interface ComplexityReport {
  reportId: string;
  seed: string;
  generatedAt: string;
  scale: SpatialScale;
  window: TimeWindow;
  sampleCount: number;
  metricsSummary: {
    meanCompressibility: number;
    meanEntropy: number;
    meanDiversity: number;
    meanPredictiveValue: number;
    trend: Trend;
  };
  diagnosis: string;
  samples: WorldStateSample[];
  metrics: ComplexityMetrics[];
  comparisons: SeedComparison[];
}

// ----------------------------------------------------------------------------
// Constants
// ----------------------------------------------------------------------------

const SCALE_OPTIONS: SpatialScale[] = ['npc', 'settlement', 'region', 'planet', 'realm', 'multiverse'];
const WINDOW_OPTIONS: TimeWindow[] = ['minutes', 'days', 'years', 'centuries', 'generations'];

const TREND_CONFIG: Record<
  Trend,
  { color: string; bg: string; border: string; icon: typeof Activity; label: string }
> = {
  homogenizing: {
    color: 'text-amber-300',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/40',
    icon: TrendingDown,
    label: 'HOMOGENIZING',
  },
  chaotic: {
    color: 'text-red-300',
    bg: 'bg-red-500/10',
    border: 'border-red-500/40',
    icon: Waves,
    label: 'CHAOTIC',
  },
  structured: {
    color: 'text-emerald-300',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/40',
    icon: Boxes,
    label: 'STRUCTURED',
  },
  stable: {
    color: 'text-cyan-300',
    bg: 'bg-cyan-500/10',
    border: 'border-cyan-500/40',
    icon: Activity,
    label: 'STABLE',
  },
};

// ----------------------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------------------

function fmtPct(n: number): string {
  return `${(n * 100).toFixed(1)}%`;
}

function fmtNum(n: number, digits = 2): string {
  return n.toFixed(digits);
}

/** Build a sparkline SVG path string from a 0..1 series. */
function sparkPath(values: number[], width: number, height: number, padY = 2): string {
  if (values.length === 0) return '';
  if (values.length === 1) {
    const y = padY + (1 - values[0]) * (height - padY * 2);
    return `M 0 ${y} L ${width} ${y}`;
  }
  const stepX = width / (values.length - 1);
  return values
    .map((v, i) => {
      const x = i * stepX;
      const clamped = Math.max(0, Math.min(1, v));
      const y = padY + (1 - clamped) * (height - padY * 2);
      return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(' ');
}

function Sparkline({
  values,
  stroke,
  fill,
  width = 180,
  height = 36,
}: {
  values: number[];
  stroke: string;
  fill?: string;
  width?: number;
  height?: number;
}) {
  const path = sparkPath(values, width, height);
  const areaPath = fill
    ? `${path} L ${width} ${height} L 0 ${height} Z`
    : '';
  return (
    <svg width={width} height={height} className="block" role="img" aria-hidden="true">
      {fill && areaPath && <path d={areaPath} fill={fill} opacity={0.18} />}
      {path && <path d={path} fill="none" stroke={stroke} strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round" />}
      {values.length > 0 && (
        <circle
          cx={width}
          cy={2 + (1 - Math.max(0, Math.min(1, values[values.length - 1]))) * (height - 4)}
          r={2}
          fill={stroke}
        />
      )}
    </svg>
  );
}

// ----------------------------------------------------------------------------
// Panel
// ----------------------------------------------------------------------------

export default function ComplexityPanel() {
  const [scale, setScale] = useState<SpatialScale>('settlement');
  const [windowSel, setWindowSel] = useState<TimeWindow>('years');
  const [seed, setSeed] = useState('42');
  const [report, setReport] = useState<ComplexityReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sample = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const url = `/api/architect/complexity?scale=${encodeURIComponent(scale)}&window=${encodeURIComponent(windowSel)}&seed=${encodeURIComponent(seed)}`;
      const res = await fetch(url);
      const json = (await res.json()) as ComplexityReport & { error?: string };
      if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
      setReport(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sampling failed');
    } finally {
      setLoading(false);
    }
  }, [scale, windowSel, seed]);

  // Auto-sample once on first mount — but only if no report yet.
  // We intentionally do NOT include `sample` in deps to avoid re-running on
  // every control change; the user clicks Sample to refresh.
  useEffect(() => {
    void sample();
  }, []);

  const trendCfg = report ? TREND_CONFIG[report.metricsSummary.trend] : null;

  const compressibilitySeries = useMemo(
    () => (report ? report.metrics.map((m) => m.compressibility) : []),
    [report],
  );
  const diversitySeries = useMemo(
    () => (report ? report.metrics.map((m) => m.diversity) : []),
    [report],
  );

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-[#2a2a4a] px-3 py-1.5">
        <Activity className="h-3.5 w-3.5 text-emerald-400" />
        <span className="text-[11px] font-semibold uppercase tracking-wider text-[#8888aa]">
          Complexity Observatory
        </span>
        {report && (
          <Badge variant="outline" className="h-4 border-[#2a2a4a] bg-[#1a1a2e] text-[9px] text-emerald-300">
            {report.sampleCount} samples · seed {report.seed}
          </Badge>
        )}
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-2 border-b border-[#2a2a4a] px-2 py-1.5">
        <div className="flex items-center gap-1">
          <span className="text-[9px] uppercase tracking-wider text-[#5a5a7a]">scale</span>
          <Select value={scale} onValueChange={(v) => setScale(v as SpatialScale)}>
            <SelectTrigger
              size="sm"
              className="h-6 w-[110px] gap-1 rounded border-[#2a2a4a] bg-[#1a1a2e] px-2 text-[10px] text-[#c8c8e0] focus-visible:ring-emerald-500/20"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="border-[#2a2a4a] bg-[#12122a] text-[11px]">
              {SCALE_OPTIONS.map((s) => (
                <SelectItem key={s} value={s} className="text-[11px]">
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-1">
          <span className="text-[9px] uppercase tracking-wider text-[#5a5a7a]">window</span>
          <Select value={windowSel} onValueChange={(v) => setWindowSel(v as TimeWindow)}>
            <SelectTrigger
              size="sm"
              className="h-6 w-[110px] gap-1 rounded border-[#2a2a4a] bg-[#1a1a2e] px-2 text-[10px] text-[#c8c8e0] focus-visible:ring-emerald-500/20"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="border-[#2a2a4a] bg-[#12122a] text-[11px]">
              {WINDOW_OPTIONS.map((w) => (
                <SelectItem key={w} value={w} className="text-[11px]">
                  {w}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-1">
          <span className="text-[9px] uppercase tracking-wider text-[#5a5a7a]">seed</span>
          <Input
            value={seed}
            onChange={(e) => setSeed(e.target.value)}
            className="h-6 w-[80px] rounded border-[#2a2a4a] bg-[#1a1a2e] px-2 font-mono text-[10px] text-[#c8c8e0] focus-visible:border-emerald-500/50 focus-visible:ring-emerald-500/20"
          />
        </div>

        <Button
          size="sm"
          className="h-6 gap-1 bg-emerald-600 px-2 text-[10px] text-white hover:bg-emerald-500"
          onClick={sample}
          disabled={loading}
        >
          {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
          Sample
        </Button>

        {trendCfg && (
          <div className={`ml-auto flex items-center gap-1.5 rounded border ${trendCfg.border} ${trendCfg.bg} px-2 py-0.5`}>
            <trendCfg.icon className={`h-3 w-3 ${trendCfg.color}`} />
            <span className={`font-mono text-[10px] font-semibold ${trendCfg.color}`}>{trendCfg.label}</span>
          </div>
        )}
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

          {loading && !report && (
            <div className="flex items-center gap-2 px-2 py-4 text-[11px] text-[#5a5a7a]">
              <Loader2 className="h-3 w-3 animate-spin text-emerald-400" />
              Sampling world complexity…
            </div>
          )}

          {!loading && !report && !error && (
            <div className="px-2 py-4 text-center text-[11px] text-[#5a5a7a]">
              Click <span className="text-emerald-300">Sample</span> to compute complexity metrics.
            </div>
          )}

          {report && trendCfg && (
            <>
              {/* Diagnosis banner */}
              <div className={`rounded-md border ${trendCfg.border} ${trendCfg.bg} p-2`}>
                <div className="flex items-start gap-2">
                  <trendCfg.icon className={`mt-0.5 h-4 w-4 shrink-0 ${trendCfg.color}`} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-semibold uppercase tracking-wider ${trendCfg.color}`}>
                        Trend Diagnosis
                      </span>
                      <Badge
                        className={`h-4 px-1 text-[9px] ${trendCfg.bg} ${trendCfg.color} border ${trendCfg.border}`}
                      >
                        {trendCfg.label}
                      </Badge>
                    </div>
                    <p className="mt-0.5 text-[11px] leading-snug text-[#c8c8e0]">{report.diagnosis}</p>
                  </div>
                </div>
              </div>

              {/* Metric tiles */}
              <div className="grid grid-cols-4 gap-1.5">
                <MetricTile
                  label="Compressibility"
                  value={fmtPct(report.metricsSummary.meanCompressibility)}
                  accent="text-emerald-300"
                />
                <MetricTile
                  label="Entropy"
                  value={fmtNum(report.metricsSummary.meanEntropy, 2)}
                  suffix="bits"
                  accent="text-amber-300"
                />
                <MetricTile
                  label="Diversity"
                  value={fmtPct(report.metricsSummary.meanDiversity)}
                  accent="text-purple-300"
                />
                <MetricTile
                  label="Predictive Value"
                  value={fmtPct(report.metricsSummary.meanPredictiveValue)}
                  accent="text-cyan-300"
                />
              </div>

              {/* Sparklines */}
              <div className="grid grid-cols-2 gap-1.5">
                <div className="rounded border border-[#2a2a4a] bg-[#0a0a1e] p-1.5">
                  <div className="mb-1 flex items-center justify-between">
                    <span className="text-[9px] font-semibold uppercase tracking-wider text-[#5a5a7a]">
                      Compressibility
                    </span>
                    <span className="font-mono text-[9px] text-emerald-300">
                      {fmtPct(report.metricsSummary.meanCompressibility)} avg
                    </span>
                  </div>
                  <Sparkline
                    values={compressibilitySeries}
                    stroke="#10b981"
                    fill="#10b981"
                    width={240}
                    height={32}
                  />
                  <div className="mt-0.5 flex justify-between font-mono text-[8px] text-[#4a4a6a]">
                    <span>t{report.samples[0]?.tick ?? 0}</span>
                    <span>t{report.samples[report.samples.length - 1]?.tick ?? 0}</span>
                  </div>
                </div>

                <div className="rounded border border-[#2a2a4a] bg-[#0a0a1e] p-1.5">
                  <div className="mb-1 flex items-center justify-between">
                    <span className="text-[9px] font-semibold uppercase tracking-wider text-[#5a5a7a]">
                      Diversity
                    </span>
                    <span className="font-mono text-[9px] text-purple-300">
                      {fmtPct(report.metricsSummary.meanDiversity)} avg
                    </span>
                  </div>
                  <Sparkline
                    values={diversitySeries}
                    stroke="#a855f7"
                    fill="#a855f7"
                    width={240}
                    height={32}
                  />
                  <div className="mt-0.5 flex justify-between font-mono text-[8px] text-[#4a4a6a]">
                    <span>t{report.samples[0]?.tick ?? 0}</span>
                    <span>t{report.samples[report.samples.length - 1]?.tick ?? 0}</span>
                  </div>
                </div>
              </div>

              {/* Seed comparisons */}
              {report.comparisons.length > 0 && (
                <div>
                  <div className="mb-1 flex items-center gap-1 text-[9px] font-semibold uppercase tracking-wider text-[#5a5a7a]">
                    <TrendingUp className="h-2.5 w-2.5" />
                    Seed Comparisons
                  </div>
                  <div className="overflow-hidden rounded border border-[#2a2a4a] bg-[#0a0a1e]">
                    <table className="w-full font-mono text-[10px]">
                      <thead>
                        <tr className="border-b border-[#2a2a4a] text-[9px] uppercase tracking-wider text-[#5a5a7a]">
                          <th className="px-1.5 py-1 text-left font-medium">seedA</th>
                          <th className="px-1.5 py-1 text-left font-medium">seedB</th>
                          <th className="px-1.5 py-1 text-right font-medium">Δ compress</th>
                          <th className="px-1.5 py-1 text-right font-medium">Δ diversity</th>
                          <th className="px-1.5 py-1 text-right font-medium">Δ predictive</th>
                        </tr>
                      </thead>
                      <tbody>
                        {report.comparisons.map((c, i) => (
                          <tr key={i} className="border-b border-[#1a1a2e] last:border-0">
                            <td className="px-1.5 py-0.5 text-emerald-300">{c.seedA}</td>
                            <td className="px-1.5 py-0.5 text-emerald-300">{c.seedB}</td>
                            <td className={`px-1.5 py-0.5 text-right ${deltaColor(c.compressibilityDelta)}`}>
                              {signed(c.compressibilityDelta, 3)}
                            </td>
                            <td className={`px-1.5 py-0.5 text-right ${deltaColor(c.diversityDelta)}`}>
                              {signed(c.diversityDelta, 3)}
                            </td>
                            <td className={`px-1.5 py-0.5 text-right ${deltaColor(c.predictiveValueDelta)}`}>
                              {signed(c.predictiveValueDelta, 3)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

// ----------------------------------------------------------------------------
// Small subcomponents / utils
// ----------------------------------------------------------------------------

function MetricTile({
  label,
  value,
  suffix,
  accent,
}: {
  label: string;
  value: string;
  suffix?: string;
  accent: string;
}) {
  return (
    <div className="rounded border border-[#2a2a4a] bg-[#0a0a1e] p-1.5">
      <div className="text-[9px] font-semibold uppercase tracking-wider text-[#5a5a7a]">{label}</div>
      <div className={`mt-0.5 font-mono text-sm font-bold ${accent}`}>{value}</div>
      {suffix && <div className="text-[8px] text-[#4a4a6a]">{suffix}</div>}
    </div>
  );
}

function deltaColor(d: number): string {
  if (d > 0.001) return 'text-emerald-300';
  if (d < -0.001) return 'text-red-300';
  return 'text-[#8888aa]';
}

function signed(n: number, digits = 2): string {
  const sign = n > 0 ? '+' : '';
  return `${sign}${n.toFixed(digits)}`;
}
