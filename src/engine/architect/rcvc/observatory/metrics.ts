/**
 * Complexity Metrics
 *
 * Measures whether simulations produce *structure* rather than order or
 * noise. The "Coffee Automaton" paper's central intuition: complexity
 * is low in both highly ordered and highly disordered states, and high
 * somewhere in between.
 *
 * Metrics:
 *   - Compressibility (coarse-grained state compression ratio)
 *   - Entropy (Shannon entropy of coarse-grained symbols)
 *   - Diversity (faction/habitat/economy diversity)
 *   - Persistence (how stable structures are over time)
 *   - Causal chain length (avg cause→effect chain length)
 *   - Recurrence vs novelty
 *   - Light-cone mutual information (see light-cone.ts)
 *
 * These are DIAGNOSTIC, not optimization targets. A highly compressible
 * world is not necessarily boring; a hard-to-compress world is not
 * necessarily interesting. Pure noise is hard to compress.
 *
 * No forbidden functions. No Three.js, no DOM.
 */

import type {
  WorldStateSample,
  ComplexityMetrics,
  SpatialScale,
} from '../types';

// ============================================================================
// Compressibility — naive LZ-style ratio
// ============================================================================

/**
 * A simple LZ77-style compressor to estimate compressibility.
 * Returns ratio: compressed size / original size (lower = more compressible).
 */
export function compressibilityRatio(input: string): number {
  if (input.length === 0) return 1;
  const compressed: string[] = [];
  let i = 0;
  const windowSize = 256;
  const minMatch = 4;

  while (i < input.length) {
    let bestLen = 0;
    let bestDist = 0;
    const windowStart = Math.max(0, i - windowSize);
    for (let j = windowStart; j < i; j++) {
      let len = 0;
      while (i + len < input.length && len < 255 && input[j + len] === input[i + len]) len++;
      if (len > bestLen && len >= minMatch) {
        bestLen = len;
        bestDist = i - j;
      }
    }
    if (bestLen >= minMatch) {
      compressed.push(`(${bestDist},${bestLen})`);
      i += bestLen;
    } else {
      compressed.push(input[i]);
      i++;
    }
  }

  const compressedStr = compressed.join('');
  return compressedStr.length / input.length;
}

/** 0..1 where 1 = highly compressible (ordered), 0 = incompressible (random). */
export function compressibility(input: string): number {
  const ratio = compressibilityRatio(input);
  return 1 - ratio;
}

// ============================================================================
// Shannon entropy (over symbol distribution)
// ============================================================================

export function shannonEntropy(input: string): number {
  if (input.length === 0) return 0;
  const freq = new Map<string, number>();
  for (const ch of input) freq.set(ch, (freq.get(ch) ?? 0) + 1);
  let entropy = 0;
  for (const count of freq.values()) {
    const p = count / input.length;
    entropy -= p * Math.log2(p);
  }
  return entropy;
}

// ============================================================================
// Diversity — effective number of distinct categories
// ============================================================================

export function diversityScore(categories: string[]): number {
  if (categories.length === 0) return 0;
  const freq = new Map<string, number>();
  for (const c of categories) freq.set(c, (freq.get(c) ?? 0) + 1);
  let shannon = 0;
  for (const count of freq.values()) {
    const p = count / categories.length;
    shannon -= p * Math.log2(p);
  }
  const maxEntropy = Math.log2(freq.size);
  if (maxEntropy === 0) return 0;
  return shannon / maxEntropy;  // normalized 0..1
}

// ============================================================================
// Persistence — how much of the previous sample survives
// ============================================================================

export function persistenceScore(prev: string, curr: string): number {
  if (prev.length === 0 || curr.length === 0) return 0;
  const prevSet = new Set(prev);
  let common = 0;
  for (const ch of curr) if (prevSet.has(ch)) common++;
  return common / Math.max(prev.length, curr.length);
}

// ============================================================================
// Causal chain length — estimated from event co-occurrence
// ============================================================================

export function avgCausalChainLength(events: { cause?: string; effect: string }[]): number {
  if (events.length === 0) return 0;
  const chainByEffect = new Map<string, number>();
  for (const e of events) {
    if (e.cause) {
      const causeLen = chainByEffect.get(e.cause) ?? 0;
      chainByEffect.set(e.effect, causeLen + 1);
    } else {
      chainByEffect.set(e.effect, 0);
    }
  }
  const lengths = Array.from(chainByEffect.values());
  return lengths.reduce((a, b) => a + b, 0) / lengths.length;
}

// ============================================================================
// Recurrence vs novelty
// ============================================================================

export function recurrenceNovelty(history: string[]): { recurrence: number; novelty: number } {
  if (history.length <= 1) return { recurrence: 0, novelty: 1 };
  const seen = new Set<string>();
  let recurring = 0;
  let novel = 0;
  for (const state of history) {
    if (seen.has(state)) recurring++;
    else { novel++; seen.add(state); }
  }
  const total = history.length;
  return {
    recurrence: recurring / total,
    novelty: novel / total,
  };
}

// ============================================================================
// Full metrics computation for a sample
// ============================================================================

export function computeMetrics(
  current: WorldStateSample,
  previous?: WorldStateSample,
  history?: string[],
  events?: { cause?: string; effect: string }[],
  factions?: string[],
  lightConeMI?: number,
): ComplexityMetrics {
  const state = current.coarseGrainedState;
  const comp = compressibility(state);
  const entropy = shannonEntropy(state);
  const diversity = diversityScore(factions ?? []);
  const persistence = previous ? persistenceScore(previous.coarseGrainedState, state) : 1;
  const causalChain = avgCausalChainLength(events ?? []);
  const { recurrence, novelty } = recurrenceNovelty(history ?? [state]);
  const predictive = lightConeMI ?? 0;

  return {
    sampleId: current.sampleId,
    compressibility: comp,
    entropy,
    diversity,
    persistence,
    causalChainLength: causalChain,
    recurrence,
    novelty,
    lightConeMI: predictive,
    predictiveValue: predictive,
  };
}

// ============================================================================
// Trend diagnosis
// ============================================================================

export function diagnoseTrend(metrics: ComplexityMetrics[]): {
  trend: 'homogenizing' | 'chaotic' | 'structured' | 'stable';
  diagnosis: string;
} {
  if (metrics.length < 2) {
    return { trend: 'stable', diagnosis: 'Insufficient samples for trend analysis' };
  }

  const first = metrics[0];
  const last = metrics[metrics.length - 1];
  const compDelta = last.compressibility - first.compressibility;
  const diversityDelta = last.diversity - first.diversity;
  const predictiveDelta = last.predictiveValue - first.predictiveValue;

  // Homogenizing: high and increasing compressibility, falling diversity
  if (compDelta > 0.1 && diversityDelta < -0.1) {
    return {
      trend: 'homogenizing',
      diagnosis: `After ${metrics.length} samples, compressibility rose ${(compDelta * 100).toFixed(0)}% and diversity fell ${(diversityDelta * 100).toFixed(0)}%. The world is structurally homogenizing.`,
    };
  }

  // Chaotic: low predictive value (past doesn't predict future), high novelty
  if (last.predictiveValue < 0.15 && last.novelty > 0.6) {
    return {
      trend: 'chaotic',
      diagnosis: `Event entropy is high, but past states have almost no predictive value (${(last.predictiveValue * 100).toFixed(0)}%). Disasters are overwhelming causal continuity.`,
    };
  }

  // Structured: moderate compressibility, good predictive value
  if (last.predictiveValue > 0.4 && last.compressibility > 0.3 && last.compressibility < 0.7) {
    return {
      trend: 'structured',
      diagnosis: `Past states predict future states ${last.predictiveValue > 0.6 ? 'well' : 'moderately'} (${(last.predictiveValue * 100).toFixed(0)}%), with moderate compressibility. The world exhibits structured unpredictability.`,
    };
  }

  // Stable: high persistence, low novelty
  if (last.persistence > 0.8 && last.novelty < 0.2) {
    return {
      trend: 'stable',
      diagnosis: `The world is highly persistent (${(last.persistence * 100).toFixed(0)}%) with low novelty. It may be too rigid — nothing surprising occurs.`,
    };
  }

  return {
    trend: 'stable',
    diagnosis: `The world is in a stable regime: compressibility ${(last.compressibility * 100).toFixed(0)}%, diversity ${(last.diversity * 100).toFixed(0)}%, predictive value ${(last.predictiveValue * 100).toFixed(0)}%.`,
  };
}
