/**
 * Light-Cone Complexity — past→future mutual information
 *
 * From the "Coffee Automaton" paper: "light-cone complexity" is the
 * mutual information between a point's past and its future. Roughly:
 * how much does knowing the past help predict the future?
 *
 *   - If ≈ 0: everything is random — the simulation lacks meaningful causality.
 *   - If ≈ 1: nothing surprising ever occurs — the simulation may be too rigid.
 *   - Target: structured unpredictability.
 *
 * No forbidden functions. No Three.js, no DOM.
 */

import type { WorldStateSample } from '../types';

// ============================================================================
// Mutual information between past and future symbol streams
// ============================================================================

/**
 * Estimate I(past ; future) = H(past) + H(future) - H(past, future)
 * where H is Shannon entropy over symbol distributions.
 *
 * Returns a value normalized to 0..1 by dividing by H(future).
 */
export function lightConeMutualInformation(
  past: string,
  future: string,
  symbolSize = 1,
): number {
  if (past.length === 0 || future.length === 0) return 0;

  const pastSymbols = extractSymbols(past, symbolSize);
  const futureSymbols = extractSymbols(future, symbolSize);

  const hPast = shannonEntropyOfArray(pastSymbols);
  const hFuture = shannonEntropyOfArray(futureSymbols);
  const hJoint = jointEntropy(pastSymbols, futureSymbols);

  if (hFuture === 0) return 0;

  const mi = hPast + hFuture - hJoint;
  // Normalize: MI ranges [0, min(hPast, hFuture)]; divide by hFuture
  return Math.max(0, Math.min(1, mi / hFuture));
}

// ============================================================================
// Helpers
// ============================================================================

function extractSymbols(str: string, size: number): string[] {
  if (size <= 1) return str.split('');
  const symbols: string[] = [];
  for (let i = 0; i + size <= str.length; i += size) {
    symbols.push(str.slice(i, i + size));
  }
  return symbols;
}

function shannonEntropyOfArray(arr: string[]): number {
  if (arr.length === 0) return 0;
  const freq = new Map<string, number>();
  for (const s of arr) freq.set(s, (freq.get(s) ?? 0) + 1);
  let entropy = 0;
  for (const count of freq.values()) {
    const p = count / arr.length;
    entropy -= p * Math.log2(p);
  }
  return entropy;
}

function jointEntropy(a: string[], b: string[]): number {
  if (a.length === 0 || b.length === 0) return 0;
  const len = Math.min(a.length, b.length);
  const freq = new Map<string, number>();
  for (let i = 0; i < len; i++) {
    const key = a[i] + '|' + b[i];
    freq.set(key, (freq.get(key) ?? 0) + 1);
  }
  let entropy = 0;
  for (const count of freq.values()) {
    const p = count / len;
    entropy -= p * Math.log2(p);
  }
  return entropy;
}

// ============================================================================
// Sample-window MI — over a sequence of samples
// ============================================================================

/**
 * Given a sequence of world-state samples, compute the average light-cone
 * MI between each sample's "past" (previous N samples) and "future"
 * (next N samples).
 */
export function windowedLightConeMI(
  samples: WorldStateSample[],
  windowSize = 3,
): number {
  if (samples.length < windowSize * 2 + 1) return 0;
  const mis: number[] = [];
  for (let i = windowSize; i < samples.length - windowSize; i++) {
    const past = samples.slice(i - windowSize, i).map(s => s.coarseGrainedState).join('');
    const future = samples.slice(i + 1, i + 1 + windowSize).map(s => s.coarseGrainedState).join('');
    mis.push(lightConeMutualInformation(past, future));
  }
  if (mis.length === 0) return 0;
  return mis.reduce((a, b) => a + b, 0) / mis.length;
}
