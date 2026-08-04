'use client';

/**
 * ComplexityPanel — RCVC observatory UI.
 *
 * Controls: Scale + Window selects + Seed input + "Sample" button. GETs
 * /api/architect/complexity?scale=X&window=Y&seed=Z. The route samples
 * the world state N times and returns per-sample metrics + a trend
 * diagnosis.
 *
 * Layout:
 *   - Controls row
 *   - Trend diagnosis banner (color-coded)
 *   - 4 metric tiles (compressibility / entropy / diversity / predictive
 *     value) each with a sparkline SVG of the per-sample series
 *   - Seed comparisons: a running log of past runs side-by-side
 */

import { useCallback, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Activity,
  Play,
  Loader2,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Waves,
  Equal,
} from 'lucide-react';

type Scale = 'npc' | 'settlement' | 'region' | 'planet' | 'realm' | 'multiverse';
type Window = 'minutes' | 'days' | 'years' | 'centuries' | 'generations';
type Trend = 'homogenizing' | 'chaotic' | 'structured' | 'stable';

interface ComplexityMetric {
  sampleId: string;
  compressibility: number;
  entropy: number;
  diversity: number;
  predictiveValue: number;
  lightConeMI: number;
  persistence: number;
  novelty: number;
}

interface ComplexityResponse {
  reportId: string;
  seed: string;
  generatedAt: string;
  scale: Scale;
  window: Window;
  sampleCount: number;
  metricsSummary: {
    meanCompressibility: number;
    meanEntropy: number;
    meanDiversity: number;
    meanPredictiveValue: number;
    trend: Trend;
  };
  diagnosis: string;
  samples: unknown[];
  metrics: ComplexityMetric[];
}

interface PastRun {
  seed: string;
  scale: Scale;
  window: Window;
  trend: Trend;
  meanCompressibility: number;
  meanPredictiveValue: number;
  ts: number;
}

const TRENDS: Record<
  Trend,
  { color: string; bg: string; border: string; icon: React.ReactNode; label: string }
> = {
  structured: {
    color: '#10b981',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/40',
    icon: <TrendingUp className="h-3.5 w-3.5" />,
    label: 'Structured',
  },
  chaotic: {
    color: '#f472b6',
    bg: 'bg-rose-500/10',
    border: 'border-rose-500/40',
    icon: <Waves className="h-3.5 w-3.5" />,
    label: 'Chaotic',
  },
  homogenizing: {
    color: '#d4a04a',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/40',
    icon: <TrendingDown className="h-3.5 w-3.5" />,
    label: 'Homogenizing',
  },
  stable: {
    color: '#8888aa',
    bg: 'bg-[#12122a]',
    border: 'border-[#2a2a4a]',
    icon: <Equal className="h-3.5 w-3.5" />,
    label: 'Stable',
  },
};

function Sparkline({
  values,
  color,
  width = 120,
  height = 28,
}: {
  values: number[];
  color: string;
  width?: number;
  height?: number;
}) {
  if (values.length < 2) {
    return (
      <svg width={width} height={height} className="opacity-50">
        <text x={width / 2} y={height / 2} textAnchor="middle" fontSize="9" fill="#5a5a7a">
          (insufficient data)
        </text>
      </svg>
    );
  }
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const stepX = width / (values.length - 1);
  const points = values
    .map((v, i) => `${(i * stepX).toFixed(1)},${(height - ((v - min) / span) * height).toFixed(1)}`)
    .join(' ');
  return (
    <svg width={width} height={height} className="block">
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {/* Baseline */}
      <line x1="0" y1={height - 1} x2={width} y2={height - 1} stroke="#2a2a4a" strokeWidth="0.5" />
    </svg>
  );
}

function MetricTile({
  label,
  value,
  series,
  color,
  hint,
}: {
  label: string;
  value: number;
  series: number[];
  color: string;
  hint: string;
}) {
  return (
    <div className="rounded border border-[#2a2a4a] bg-[#12122a] p-2">
      <div className="flex items-baseline justify-between">
        <span className="text-[9px] font-semibold uppercase tracking-wider text-[#5a5a7a]">
          {label}
        </span>
        <span className="font-mono text-[14px] font-bold" style={{ color }}>
          {value.toFixed(3)}
        </span>
      </div>
      <div className="mt-1">
        <Sparkline values={series} color={color} />
      </div>
      <div className="mt-0.5 text-[8px] text-[#5a5a7a]">{hint}</div>
    </div>
  );
}

const SCALES: Scale[] = ['npc', 'settlement', 'region', 'planet', 'realm', 'multiverse'];
const WINDOWS: Window[] = ['minutes', 'days', 'years', 'centuries', 'generations'];

export default function ComplexityPanel() {
  const [scale, setScale] = useState<Scale>('settlement');
  const [window_, setWindow] = useState<Window>('years');
  const [seed, setSeed] = useState('42');
  const [data, setData] = useState<ComplexityResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [past, setPast] = useState<PastRun[]>([]);

  const sample = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const url = `/api/architect/complexity?scale=${scale}&window=${window_}&seed=${encodeURIComponent(seed)}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = (await res.json()) as ComplexityResponse;
      setData(json);
      setPast((p) =>
        [
          {
            seed: json.seed,
            scale: json.scale,
            window: json.window,
            trend: json.metricsSummary.trend,
            meanCompressibility: json.metricsSummary.meanCompressibility,
            meanPredictiveValue: json.metricsSummary.meanPredictiveValue,
            ts: Date.now(),
          },
          ...p,
        ].slice(0, 8),
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [scale, window_, seed]);

  const trendInfo = data ? TRENDS[data.metricsSummary.trend] : null;

  const compressSeries = data?.metrics.map((m) => m.compressibility) ?? [];
  const entropySeries = data?.metrics.map((m) => m.entropy) ?? [];
  const diversitySeries = data?.metrics.map((m) => m.diversity) ?? [];
  const predictiveSeries = data?.metrics.map((m) => m.predictiveValue) ?? [];

  return (
    <div className="flex h-full flex-col bg-[#0e0e24]">
      {/* Header */}
      <div className="flex h-8 items-center justify-between border-b border-[#2a2a4a] px-3">
        <div className="flex items-center gap-1.5">
          <Activity className="h-3.5 w-3.5 text-emerald-500" />
          <span className="text-[10px] uppercase tracking-wider text-[#5a5a7a]">
            Complexity · {data ? `${data.sampleCount} samples` : 'no run yet'}
          </span>
        </div>
        <Button
          size="sm"
          onClick={() => void sample()}
          disabled={loading}
          className="h-6 bg-emerald-600 px-2 text-[10px] text-white hover:bg-emerald-500"
        >
          {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Play className="h-3 w-3" />}
          Sample
        </Button>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-2 border-b border-[#2a2a4a] bg-[#12122a] px-3 py-1.5">
        <div className="flex items-center gap-1">
          <span className="text-[9px] uppercase tracking-wider text-[#5a5a7a]">Scale</span>
          <Select value={scale} onValueChange={(v) => setScale(v as Scale)}>
            <SelectTrigger size="sm" className="h-6 w-28 border-[#2a2a4a] bg-[#0e0e24] text-[10px] text-[#c8c8e0]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="border-[#2a2a4a] bg-[#12122a] text-[#c8c8e0]">
              {SCALES.map((s) => (
                <SelectItem key={s} value={s} className="text-[10px]">
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-[9px] uppercase tracking-wider text-[#5a5a7a]">Window</span>
          <Select value={window_} onValueChange={(v) => setWindow(v as Window)}>
            <SelectTrigger size="sm" className="h-6 w-28 border-[#2a2a4a] bg-[#0e0e24] text-[10px] text-[#c8c8e0]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="border-[#2a2a4a] bg-[#12122a] text-[#c8c8e0]">
              {WINDOWS.map((w) => (
                <SelectItem key={w} value={w} className="text-[10px]">
                  {w}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-[9px] uppercase tracking-wider text-[#5a5a7a]">Seed</span>
          <input
            value={seed}
            onChange={(e) => setSeed(e.target.value)}
            className="h-6 w-16 rounded border border-[#2a2a4a] bg-[#0e0e24] px-2 font-mono text-[10px] text-[#c8c8e0] focus:outline-none focus:border-emerald-500/50"
          />
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 border-b border-rose-500/30 bg-rose-500/5 px-3 py-1.5 text-[11px] text-rose-300">
          <AlertTriangle className="h-3 w-3" /> {error}
        </div>
      )}

      <ScrollArea className="flex-1">
        <div className="p-3">
          {/* Trend diagnosis banner */}
          {data && trendInfo && (
            <div
              className={`mb-3 flex items-start gap-2 rounded border px-3 py-2 text-[11px] ${trendInfo.bg} ${trendInfo.border}`}
              style={{ color: trendInfo.color }}
            >
              {trendInfo.icon}
              <div className="flex-1">
                <div className="font-semibold uppercase tracking-wider">
                  {trendInfo.label} Trend
                </div>
                <div className="mt-0.5 text-[10px] text-[#8888aa]">{data.diagnosis}</div>
              </div>
              <span className="font-mono text-[9px] text-[#5a5a7a]">
                {data.scale}/{data.window}
              </span>
            </div>
          )}

          {/* Metric tiles */}
          {data ? (
            <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
              <MetricTile
                label="Compressibility"
                value={data.metricsSummary.meanCompressibility}
                series={compressSeries}
                color="#10b981"
                hint="↑ = homogenising"
              />
              <MetricTile
                label="Entropy"
                value={data.metricsSummary.meanEntropy}
                series={entropySeries}
                color="#d4a04a"
                hint="bits/symbol"
              />
              <MetricTile
                label="Diversity"
                value={data.metricsSummary.meanDiversity}
                series={diversitySeries}
                color="#a855f7"
                hint="normalised kinds"
              />
              <MetricTile
                label="Predictive Value"
                value={data.metricsSummary.meanPredictiveValue}
                series={predictiveSeries}
                color="#f472b6"
                hint="light-cone MI"
              />
            </div>
          ) : (
            !loading && (
              <div className="flex flex-col items-center justify-center py-6 text-center">
                <Activity className="mb-2 h-6 w-6 text-[#3a3a5a]" />
                <p className="text-[11px] text-[#5a5a7a]">
                  No complexity samples yet.
                </p>
                <p className="mt-1 text-[10px] text-[#5a5a7a]">
                  Pick a scale, window, and seed, then click <span className="text-[#c8c8e0]">Sample</span>.
                </p>
              </div>
            )
          )}

          {/* Seed comparisons */}
          {past.length > 0 && (
            <section className="mt-3">
              <h3 className="mb-1.5 text-[9px] font-semibold uppercase tracking-wider text-[#5a5a7a]">
                Seed Comparisons · {past.length}
              </h3>
              <div className="overflow-hidden rounded border border-[#2a2a4a]">
                <table className="w-full text-left text-[10px]">
                  <thead className="bg-[#12122a] text-[9px] uppercase tracking-wider text-[#5a5a7a]">
                    <tr>
                      <th className="px-2 py-1">Seed</th>
                      <th className="px-2 py-1">Scale</th>
                      <th className="px-2 py-1">Window</th>
                      <th className="px-2 py-1">Trend</th>
                      <th className="px-2 py-1 text-right">Compress.</th>
                      <th className="px-2 py-1 text-right">Predictive</th>
                    </tr>
                  </thead>
                  <tbody>
                    {past.map((r) => {
                      const t = TRENDS[r.trend];
                      return (
                        <tr key={`${r.seed}-${r.ts}`} className="border-t border-[#2a2a4a]">
                          <td className="px-2 py-1 font-mono text-[#c8c8e0]">{r.seed}</td>
                          <td className="px-2 py-1 text-[#8888aa]">{r.scale}</td>
                          <td className="px-2 py-1 text-[#8888aa]">{r.window}</td>
                          <td className="px-2 py-1">
                            <span style={{ color: t.color }}>{t.label}</span>
                          </td>
                          <td className="px-2 py-1 text-right font-mono text-emerald-300">
                            {r.meanCompressibility.toFixed(3)}
                          </td>
                          <td className="px-2 py-1 text-right font-mono text-[#8888aa]">
                            {r.meanPredictiveValue.toFixed(3)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
