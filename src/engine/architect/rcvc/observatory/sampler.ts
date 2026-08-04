/**
 * Complexity Observatory — sampler and report generator
 *
 * Observes generated worlds at several scales (NPC, settlement, region,
 * planet, realm, multiverse) and several time windows (minutes, days,
 * years, centuries, generations). Produces diagnostic reports for the
 * Grand Architect.
 *
 * No forbidden functions. No Three.js, no DOM.
 */

import type {
  WorldStateSample,
  ComplexityMetrics,
  ComplexityReport,
  SpatialScale,
  TimeWindow,
  SeedComparison,
} from '../types';
import { computeMetrics, diagnoseTrend } from './metrics';
import { windowedLightConeMI } from './light-cone';

// ============================================================================
// Synthetic world-state generator (for demo + testing)
// ============================================================================

/**
 * Generates a deterministic coarse-grained world-state string for a given
 * seed, tick, and scale. In production this would sample the real world;
 * here we produce a synthetic string whose compressibility/diversity
 * properties vary by seed.
 */
export function sampleWorldState(seed: number, tick: number, scale: SpatialScale, regionId?: string): WorldStateSample {
  let rng = seed + tick * 7919 + (regionId ? hashString(regionId) : 0);
  function next(): number {
    rng = (rng * 1664525 + 1013904223) >>> 0;
    return rng / 0x100000000;
  }

  const scaleMultiplier: Record<SpatialScale, number> = {
    npc: 8, settlement: 32, region: 128, planet: 256, realm: 512, multiverse: 1024,
  };
  const len = scaleMultiplier[scale];

  // Different seeds produce different "regimes":
  //   - Some seeds are highly ordered (repeating patterns)
  //   - Some are chaotic (high entropy, low predictability)
  //   - Some are structured (moderate entropy, high predictability)
  const regime = seed % 3;

  let chars = '';
  for (let i = 0; i < len; i++) {
    let ch: string;
    if (regime === 0) {
      // Ordered: repeating pattern
      ch = String.fromCharCode(65 + (i % 4));
    } else if (regime === 1) {
      // Chaotic: pure random
      ch = String.fromCharCode(65 + Math.floor(next() * 26));
    } else {
      // Structured: pattern with occasional disruptions
      const base = 65 + (i % 6);
      const disrupted = next() < 0.05 ? Math.floor(next() * 26) : 0;
      ch = String.fromCharCode(base + disrupted);
    }
    chars += ch;
  }

  // Apply tick-based "mixing" — earlier ticks are more ordered, later ticks more mixed
  const mixFactor = Math.min(1, tick / 100);
  let mixed = '';
  for (let i = 0; i < chars.length; i++) {
    if (next() < mixFactor * 0.1) {
      mixed += String.fromCharCode(65 + Math.floor(next() * 26));
    } else {
      mixed += chars[i];
    }
  }

  const factionCount = 3 + Math.floor(next() * 5);
  const eventCount = Math.floor(next() * 20) + tick;

  return {
    sampleId: `sample-${scale}-${tick}-${seed.toString(36)}`,
    tick,
    scale,
    regionId,
    coarseGrainedState: mixed,
    entityCount: scaleMultiplier[scale] * (1 + Math.floor(next() * 10)),
    factionCount,
    eventCount,
    raw: { regime, mixFactor },
  };
}

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

// ============================================================================
// Sampler — collects samples over a time window
// ============================================================================

export interface SamplerOptions {
  scale: SpatialScale;
  window: TimeWindow;
  seed: number;
  sampleCount?: number;
  regionId?: string;
}

export function sampleComplexity(options: SamplerOptions): ComplexityReport {
  const { scale, window, seed, regionId } = options;
  const sampleCount = options.sampleCount ?? 20;

  const windowTicks: Record<TimeWindow, number> = {
    minutes: 1, days: 10, years: 100, centuries: 1000, generations: 5000,
  };
  const tickStride = Math.max(1, Math.floor(windowTicks[window] / sampleCount));

  const samples: WorldStateSample[] = [];
  for (let i = 0; i < sampleCount; i++) {
    const tick = i * tickStride;
    samples.push(sampleWorldState(seed, tick, scale, regionId));
  }

  // Compute metrics for each sample
  const metrics: ComplexityMetrics[] = [];
  const history: string[] = [];
  const factions: string[] = [];
  const events: { cause?: string; effect: string }[] = [];

  for (let i = 0; i < samples.length; i++) {
    const s = samples[i];
    history.push(s.coarseGrainedState);
    // Synthesize faction list
    for (let f = 0; f < s.factionCount; f++) factions.push(`faction-${f}`);
    // Synthesize events
    if (i > 0) {
      events.push({ cause: `event-${i - 1}`, effect: `event-${i}` });
    }
    const lcMI = windowedLightConeMI(samples.slice(0, i + 1), 3);
    metrics.push(computeMetrics(s, samples[i - 1], history, events, factions, lcMI));
  }

  const trend = diagnoseTrend(metrics);

  // Summary statistics
  const mean = (key: keyof ComplexityMetrics) => metrics.reduce((a, m) => a + (m[key] as number), 0) / metrics.length;

  const comparisons: SeedComparison[] = [];
  // Compare with a couple of other seeds
  for (const otherSeed of [seed + 1, seed + 2]) {
    const otherSamples: WorldStateSample[] = [];
    for (let i = 0; i < sampleCount; i++) {
      otherSamples.push(sampleWorldState(otherSeed, i * tickStride, scale, regionId));
    }
    const otherMetrics = otherSamples.map((s, i) =>
      computeMetrics(s, otherSamples[i - 1], otherSamples.map(x => x.coarseGrainedState), [], factions)
    );
    comparisons.push({
      seedA: `seed-${seed}`,
      seedB: `seed-${otherSeed}`,
      compressibilityDelta: mean('compressibility') - (otherMetrics.reduce((a, m) => a + m.compressibility, 0) / otherMetrics.length),
      diversityDelta: mean('diversity') - (otherMetrics.reduce((a, m) => a + m.diversity, 0) / otherMetrics.length),
      predictiveValueDelta: mean('predictiveValue') - (otherMetrics.reduce((a, m) => a + m.predictiveValue, 0) / otherMetrics.length),
      note: trend.trend === 'homogenizing' && mean('diversity') < 0.3
        ? 'This seed converges to homogeneity faster than the comparison seed.'
        : 'No significant divergence detected.',
    });
  }

  return {
    reportId: `report-${scale}-${window}-${seed.toString(36)}-${Date.now().toString(36)}`,
    seed: `seed-${seed}`,
    generatedAt: new Date().toISOString(),
    scale,
    window,
    sampleCount,
    metricsSummary: {
      meanCompressibility: mean('compressibility'),
      meanEntropy: mean('entropy'),
      meanDiversity: mean('diversity'),
      meanPredictiveValue: mean('predictiveValue'),
      trend: trend.trend,
    },
    diagnosis: trend.diagnosis,
    samples,
    metrics,
    comparisons,
  };
}
