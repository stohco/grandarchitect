/**
 * Material Composition — what removed matter IS made of
 * ======================================================
 *
 * The core principle of matter conservation: when terrain is removed, the
 * game must know exactly what was removed (primary material), how dense it
 * was (kg/m³), and what it decomposes into (constituents with mass
 * fractions and grades). Composition is the input to recovery accounting —
 * loot can never disagree with terrain because destruction is the ONLY
 * source of recovered material.
 *
 * Determinism: composition lookups are pure functions of (materialId, seed).
 * A seeded draw (xoshiro256** from src/lib/determinism/rng.ts) perturbs
 * purity/qi-density/mass-fractions within canonical ranges. Same seed →
 * same composition, across runs and engines.
 *
 * Grades (per corpus 52 measurement language, applied to material quality):
 *   'low' | 'ordinary' | 'fine' | 'superior' | 'spirit'
 */

import { seedFromBigInt, nextDouble } from '../../../lib/determinism/rng';
import { stableHash64 } from './matter-hash';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type MaterialGrade = 'low' | 'ordinary' | 'fine' | 'superior' | 'spirit';

export type MaterialId =
  | 'stone'
  | 'earth'
  | 'sand'
  | 'clay'
  | 'wood'
  | 'ore:iron'
  | 'ore:copper'
  | 'ore:spirit-stone';

/** One ingredient of a composition. massFraction ∈ (0,1]; fractions sum to 1. */
export interface MaterialComponent {
  materialId: MaterialId;
  /** Fraction of total removed MASS contributed by this constituent. */
  massFraction: number;
  grade: MaterialGrade;
}

export interface SpiritualProperties {
  /** Qi density in [0,1] — qi-per-kg index (0 = mundane, 1 = spirit-grade). */
  qiDensity: number;
  /** Elemental affinities (empty for mundane matter). */
  elementalAffinity: string[];
  /** Purity in [0,1] — 1 = pristine, 0 = fully contaminated. */
  purity: number;
  grade: MaterialGrade;
  /** Formation age in years (only meaningful for wood/ores). */
  ageYears?: number;
}

export interface MaterialComposition {
  primaryMaterial: MaterialId;
  /** Bulk density in kg/m³ (SI, per corpus 52). */
  density: number;
  constituents: MaterialComponent[];
  spiritualProperties: SpiritualProperties;
}

// ---------------------------------------------------------------------------
// Canonical composition table (base values; seeded jitter applied on draw)
// ---------------------------------------------------------------------------

interface TableEntry {
  density: number;
  baseFractions: Record<string, number>;
  grade: MaterialGrade;
  qiDensity: number;
  elementalAffinity: string[];
  purityRange: [number, number];
  ageRange?: [number, number];
}

const COMPOSITION_TABLE: Record<MaterialId, TableEntry> = {
  stone: {
    density: 2600,
    baseFractions: { stone: 0.9, earth: 0.08, 'ore:iron': 0.02 },
    grade: 'ordinary',
    qiDensity: 0.02,
    elementalAffinity: ['earth'],
    purityRange: [0.85, 0.99],
  },
  earth: {
    density: 1600,
    baseFractions: { earth: 0.96, stone: 0.04 },
    grade: 'low',
    qiDensity: 0.01,
    elementalAffinity: ['earth'],
    purityRange: [0.8, 0.97],
  },
  sand: {
    density: 1650,
    baseFractions: { sand: 0.95, stone: 0.05 },
    grade: 'low',
    qiDensity: 0.01,
    elementalAffinity: ['earth'],
    purityRange: [0.8, 0.96],
  },
  clay: {
    density: 1900,
    baseFractions: { clay: 0.92, earth: 0.08 },
    grade: 'ordinary',
    qiDensity: 0.02,
    elementalAffinity: ['earth'],
    purityRange: [0.82, 0.97],
  },
  wood: {
    density: 700,
    baseFractions: { wood: 0.98, earth: 0.02 },
    grade: 'ordinary',
    qiDensity: 0.04,
    elementalAffinity: ['wood'],
    purityRange: [0.75, 0.95],
    ageRange: [5, 200],
  },
  'ore:iron': {
    density: 3600,
    baseFractions: { 'ore:iron': 0.55, stone: 0.45 },
    grade: 'fine',
    qiDensity: 0.08,
    elementalAffinity: ['metal'],
    purityRange: [0.7, 0.93],
    ageRange: [100, 5000],
  },
  'ore:copper': {
    density: 4000,
    baseFractions: { 'ore:copper': 0.5, stone: 0.5 },
    grade: 'fine',
    qiDensity: 0.09,
    elementalAffinity: ['metal'],
    purityRange: [0.7, 0.92],
    ageRange: [100, 4000],
  },
  'ore:spirit-stone': {
    density: 3000,
    baseFractions: { 'ore:spirit-stone': 0.6, stone: 0.4 },
    grade: 'spirit',
    qiDensity: 0.85,
    elementalAffinity: ['earth', 'qi'],
    purityRange: [0.85, 0.99],
    ageRange: [1000, 10000],
  },
};

/** Seeded deterministic draw in [lo, hi] (inclusive bounds). */
function drawRange(state: { s0: bigint; s1: bigint; s2: bigint; s3: bigint }, lo: number, hi: number): number {
  return lo + (hi - lo) * nextDouble(state);
}

function round4(x: number): number {
  return Math.round(x * 10000) / 10000;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export const MATTER_SEED_NAMESPACE = 'matter:composition:v1:';

/** Deterministic composition for a materialId under a seed string. */
export function getComposition(materialId: MaterialId, seed: string): MaterialComposition {
  const entry = COMPOSITION_TABLE[materialId];
  if (!entry) {
    throw new Error(`Unknown materialId: ${materialId}`);
  }
  const state = seedFromBigInt(stableHash64(`${MATTER_SEED_NAMESPACE}${materialId}:${seed}`));

  // Perturb mass fractions within ±0.02 of base, then renormalize to sum 1.
  const entries = Object.entries(entry.baseFractions) as [MaterialId, number][];
  const jittered = entries.map(([mat, frac]) => [mat, Math.max(0.005, frac + (nextDouble(state) - 0.5) * 0.04)] as const);
  const rawSum = jittered.reduce((s, [, f]) => s + f, 0);
  const constituents: MaterialComponent[] = jittered.map(([mat, frac]) => ({
    materialId: mat,
    massFraction: round4(frac / rawSum),
    grade: entry.grade === 'spirit' && mat !== 'ore:spirit-stone' ? 'ordinary' : entry.grade,
  }));

  // Normalize again so fractions sum to exactly 1.0 after rounding.
  const sumAfterRound = constituents.reduce((s, c) => s + c.massFraction, 0);
  const normalized = constituents.map((c) => ({ ...c, massFraction: round4(c.massFraction / sumAfterRound) }));

  const purity = round4(drawRange(state, entry.purityRange[0], entry.purityRange[1]));
  const ageYears = entry.ageRange ? Math.round(drawRange(state, entry.ageRange[0], entry.ageRange[1])) : undefined;

  return {
    primaryMaterial: materialId,
    density: entry.density,
    constituents: normalized,
    spiritualProperties: {
      qiDensity: round4(Math.min(1, entry.qiDensity + (nextDouble(state) - 0.5) * 0.02)),
      elementalAffinity: [...entry.elementalAffinity],
      purity,
      grade: entry.grade,
      ageYears,
    },
  };
}

/** Volume-weighted merge of per-material volumes into one composition. */
export function composeFromVolumes(
  volumes: Array<{ materialId: MaterialId; volumeM3: number }>,
  seed: string,
): MaterialComposition {
  const totalVolume = volumes.reduce((s, v) => s + v.volumeM3, 0);
  if (totalVolume <= 0) {
    return getComposition('earth', seed);
  }

  // Mass per material = volume × its bulk density (SI). Composition density
  // is the mass-weighted average density, so per-constituent mass fractions
  // equal per-constituent volume fractions when a single bulk density is
  // used — we track mass explicitly to stay exact regardless.
  const weighted: Map<MaterialId, { massKg: number; grade: MaterialGrade; purity: number }> = new Map();
  for (const v of volumes) {
    const comp = getComposition(v.materialId, `${seed}:${v.materialId}`);
    const massKg = v.volumeM3 * comp.density;
    for (const c of comp.constituents) {
      const entry = weighted.get(c.materialId) ?? { massKg: 0, grade: c.grade, purity: comp.spiritualProperties.purity };
      entry.massKg += massKg * c.massFraction;
      weighted.set(c.materialId, entry);
    }
  }

  const totalMass = Array.from(weighted.values()).reduce((s, w) => s + w.massKg, 0);
  const constituents: MaterialComponent[] = Array.from(weighted.entries())
    .map(([mat, w]) => ({
      materialId: mat,
      massFraction: totalMass > 0 ? round4(w.massKg / totalMass) : 0,
      grade: w.grade,
    }))
    .sort((a, b) => b.massFraction - a.massFraction);

  const sumAfterRound = constituents.reduce((s, c) => s + c.massFraction, 0) || 1;
  const primary = constituents[0] ?? { materialId: 'earth' as MaterialId, massFraction: 1, grade: 'low' as MaterialGrade };

  return {
    primaryMaterial: primary.materialId,
    density: totalVolume > 0 ? round4(totalMass / totalVolume) : 1600,
    constituents: constituents.map((c) => ({ ...c, massFraction: round4(c.massFraction / sumAfterRound) })),
    spiritualProperties: {
      qiDensity: round4(Array.from(weighted.values()).reduce((s, w) => s + w.massKg * 0.01, 0) / (totalMass || 1)),
      elementalAffinity: Array.from(new Set(Array.from(weighted.keys()).map((m) => COMPOSITION_TABLE[m].elementalAffinity[0]))),
      purity: round4(Array.from(weighted.values()).reduce((s, w) => s + w.massKg * w.purity, 0) / (totalMass || 1)),
      grade: constituents.length > 0 ? constituents[0].grade : 'low',
    },
  };
}

/** All registered material ids (for iteration/validation). */
export function listMaterialIds(): MaterialId[] {
  return Object.keys(COMPOSITION_TABLE) as MaterialId[];
}
