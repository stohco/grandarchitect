/** Complexity metrics — compressibility, entropy, diversity, light-cone MI. */
import type { WorldStateSample, ComplexityMetrics } from '../types';

export function compressibility(input: string): number {
  if (input.length === 0) return 1;
  const compressed: string[] = []; let i = 0; const ws = 256; const mm = 4;
  while (i < input.length) {
    let bestLen = 0; let bestDist = 0; const start = Math.max(0, i - ws);
    for (let j = start; j < i; j++) { let len = 0; while (i + len < input.length && len < 255 && input[j + len] === input[i + len]) len++; if (len > bestLen && len >= mm) { bestLen = len; bestDist = i - j; } }
    if (bestLen >= mm) { compressed.push(`(${bestDist},${bestLen})`); i += bestLen; } else { compressed.push(input[i]); i++; }
  }
  return 1 - (compressed.join('').length / input.length);
}

export function shannonEntropy(input: string): number {
  if (input.length === 0) return 0;
  const freq = new Map<string, number>(); for (const ch of input) freq.set(ch, (freq.get(ch) ?? 0) + 1);
  let e = 0; for (const c of freq.values()) { const p = c / input.length; e -= p * Math.log2(p); } return e;
}

export function diversityScore(cats: string[]): number {
  if (cats.length === 0) return 0;
  const freq = new Map<string, number>(); for (const c of cats) freq.set(c, (freq.get(c) ?? 0) + 1);
  let s = 0; for (const c of freq.values()) { const p = c / cats.length; s -= p * Math.log2(p); }
  const max = Math.log2(freq.size); return max === 0 ? 0 : s / max;
}

export function computeMetrics(current: WorldStateSample, previous?: WorldStateSample, lightConeMI = 0): ComplexityMetrics {
  const state = current.coarseGrainedState;
  return {
    sampleId: current.sampleId, compressibility: compressibility(state), entropy: shannonEntropy(state),
    diversity: diversityScore([]), persistence: previous ? 0.5 : 1, causalChainLength: 0,
    recurrence: 0, novelty: 1, lightConeMI, predictiveValue: lightConeMI,
  };
}

export function diagnoseTrend(metrics: ComplexityMetrics[]): { trend: 'homogenizing' | 'chaotic' | 'structured' | 'stable'; diagnosis: string } {
  if (metrics.length < 2) return { trend: 'stable', diagnosis: 'Insufficient samples' };
  const last = metrics[metrics.length - 1];
  if (last.predictiveValue < 0.15) return { trend: 'chaotic', diagnosis: 'Event entropy high; past states have little predictive value.' };
  if (last.predictiveValue > 0.4 && last.compressibility > 0.3 && last.compressibility < 0.7) return { trend: 'structured', diagnosis: 'Structured unpredictability — moderate compressibility with good predictive value.' };
  if (last.compressibility > 0.7) return { trend: 'homogenizing', diagnosis: 'The world is structurally homogenizing — high compressibility.' };
  return { trend: 'stable', diagnosis: `Stable: compressibility ${(last.compressibility * 100).toFixed(0)}%, predictive ${(last.predictiveValue * 100).toFixed(0)}%.` };
}

export function sampleWorldState(seed: number, tick: number, scale: 'npc'|'settlement'|'region'|'planet'|'realm'|'multiverse'): WorldStateSample {
  let rng = seed + tick * 7919;
  function next(): number { rng = (rng * 1664525 + 1013904223) >>> 0; return rng / 0x100000000; }
  const len = { npc: 8, settlement: 32, region: 128, planet: 256, realm: 512, multiverse: 1024 }[scale];
  const regime = seed % 3;
  let chars = '';
  for (let i = 0; i < len; i++) {
    if (regime === 0) chars += String.fromCharCode(65 + (i % 4));
    else if (regime === 1) chars += String.fromCharCode(65 + Math.floor(next() * 26));
    else { const b = 65 + (i % 6); chars += String.fromCharCode(b + (next() < 0.05 ? Math.floor(next() * 26) : 0)); }
  }
  return { sampleId: `sample-${scale}-${tick}-${seed}`, tick, scale, coarseGrainedState: chars, entityCount: len, factionCount: 3 + Math.floor(next() * 5), eventCount: Math.floor(next() * 20) + tick, raw: {} };
}

export function sampleComplexity(opts: { scale: 'npc'|'settlement'|'region'|'planet'|'realm'|'multiverse'; window: 'minutes'|'days'|'years'|'centuries'|'generations'; seed: number; sampleCount?: number }) {
  const sc = opts.sampleCount ?? 20;
  const windowTicks: Record<string, number> = { minutes: 1, days: 10, years: 100, centuries: 1000, generations: 5000 };
  const stride = Math.max(1, Math.floor(windowTicks[opts.window] / sc));
  const samples: WorldStateSample[] = [];
  for (let i = 0; i < sc; i++) samples.push(sampleWorldState(opts.seed, i * stride, opts.scale));
  const metrics = samples.map((s, i) => computeMetrics(s, samples[i - 1]));
  const trend = diagnoseTrend(metrics);
  const mean = (k: keyof ComplexityMetrics) => metrics.reduce((a, m) => a + (m[k] as number), 0) / metrics.length;
  return {
    reportId: `report-${opts.scale}-${opts.window}-${opts.seed}`, seed: `seed-${opts.seed}`, generatedAt: new Date().toISOString(),
    scale: opts.scale, window: opts.window, sampleCount: sc,
    metricsSummary: { meanCompressibility: mean('compressibility'), meanEntropy: mean('entropy'), meanDiversity: mean('diversity'), meanPredictiveValue: mean('predictiveValue'), trend: trend.trend },
    diagnosis: trend.diagnosis, samples, metrics,
  };
}
