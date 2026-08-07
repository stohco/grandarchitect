/**
 * cosmology-graph — Regions, Heavenly Dao, grotto-heavens, existential pressure
 *
 * The cosmic map. Canon anchors:
 *   - doc 36 §1: the finite lenticular cosmos — three strata (Precelestial,
 *     Acquired, Mortal), the Outer Margin, the Unwritten, the Origin as
 *     frame-not-map.
 *   - doc 36 §3.3: Broad Lands; doc 19 §2: grotto-heavens nested in the
 *     Acquired, anchored to the Mortal.
 *   - doc 37 §7.2: "substrate-predators" — the Void's predatory ecosystem.
 *   - doc 48 §3.3-3.4: the Higher Immortal World (Five Vast Territories,
 *     Nine Layers, inter-cosmic medium) — the Vast Expanse.
 *   - doc 48 §3.7: descent constraint — a higher-tier being in a lower world
 *     is "deliberately weakened — constrained to a power level the mortal
 *     cosmos can sustain".
 *
 * [DERIVED] labels mark the integration vocabulary from the project lead's
 * brief (HeavenlyDao records, the Void as a named region, "ontological
 * mass"). The corpus does not name a "Heavenly Dao"; the nearest canon
 * concept is the Dao as totality of lawful pattern (doc 44 §1) with the
 * Origin as its condition. A HeavenlyDao record here is a per-region
 * authority ledger, not a claim that the Origin has a mind.
 */

import { gradeForRealm } from './steps-ladder';

// ---------------------------------------------------------------------------
// Law tiers (grade of existence ladder — which laws bind a being)
// ---------------------------------------------------------------------------

export type LawTier = 'mortal' | 'body' | 'qi' | 'soul' | 'domain' | 'law' | 'ran';

export const LAW_TIER_INDEX: Record<LawTier, number> = {
  mortal: 0,
  body: 1,
  qi: 2,
  soul: 3,
  domain: 4,
  law: 5,
  ran: 6,
};

export const LAW_TIERS: LawTier[] = ['mortal', 'body', 'qi', 'soul', 'domain', 'law', 'ran'];

// ---------------------------------------------------------------------------
// Heavenly Dao record
// ---------------------------------------------------------------------------

export type HeavenlyDaoState = 'submit' | 'cheat' | 'crushed';

export interface HeavenlyDao {
  /** Authority of the region's lawful order (0..1). */
  strength: number;
  /** 0..1 — a region whose Dao is sentient can be deceived or broken. */
  sentience: number;
  /**
   * submit  — the Dao accepts its lawful order.
   * cheat   — the Dao exploits loopholes in the substrate law.
   * crushed — the Dao's authority has been broken (a region where law ran out).
   */
  state: HeavenlyDaoState;
}

export function createHeavenlyDao(
  strength: number,
  sentience: number,
  state: HeavenlyDaoState = 'submit',
): HeavenlyDao {
  return { strength, sentience, state };
}

// ---------------------------------------------------------------------------
// Regions
// ---------------------------------------------------------------------------

export type RegionKind =
  | 'void'          // the Void — predatory ecosystem (doc 37 §7.2 substrate-predators)
  | 'vast_expanse'  // the Vast Expanse — Acquired stratum / Higher Immortal World medium
  | 'world'         // a mortal world / stratum interior
  | 'continent'     // a continental landmass within a world
  | 'grotto';       // a grotto-heaven pocket (doc 19)

export interface RegionFabric {
  /** Highest ontological mass the world's fabric can host without tearing. */
  tolerance: number;
  /** Law density 0..1 — how thickly the local law is inscribed. */
  lawDensity: number;
  /** Resistance to concept-overrides by essence holders (0..1). */
  lawResistance: number;
  /** Highest law tier the region enforces (grade of existence of the region). */
  gradeCap: number;
  /** Lowest law tier still active in the region. */
  gradeFloor: number;
}

export interface GrottoHeaven {
  id: string;
  name: string;
  anchorRegionId: string;
  /**
   * timeDilation = interior ticks per exterior tick.
   *  < 1 : interior runs slower (1 Precelestial day = 1 Acquired year → 1/365).
   *  > 1 : interior runs faster (a 1:3 grotto — doc 37 §6.2 Crimson Vow).
   * A day in a higher plane equal to a century below is 1/36_500
   * (the Law Reach distortion, doc 40 §2.8: 1 reach-day = 100 Acquired years).
   */
  timeDilation: number;
  /** Exact rational form of timeDilation (num/den), for integer tick math. */
  timeDilationRatio: [number, number];
  lawDensity: number;
  tolerance: number;
}

export interface CosmicRegion {
  id: string;
  kind: RegionKind;
  name: string;
  /** Corpus anchor: doc + section this region derives from. */
  canonAnchor: string;
  heavenlyDao: HeavenlyDao;
  fabric: RegionFabric;
  grottoes: GrottoHeaven[];
}

export interface CosmologyGraph {
  regions: CosmicRegion[];
  seededAt: number;
}

// ---------------------------------------------------------------------------
// Canonical region fixtures ([DERIVED] names; canon anchors per region)
// ---------------------------------------------------------------------------

const TOLERANCES = {
  void: 16,            // the Void hosts almost nothing lawful
  vastExpanse: 512,    // the Acquired Stratum hosts Step-3 grade beings
  worldMortal: 100,    // a low mortal world cannot tolerate Step-3 presence
  worldHigh: 2048,     // an upper-stratum world hosts Step-4 presence
  grotto: 4096,        // a grotto can host a higher-grade presence lawfully
};

export function createCanonicalCosmology(): CosmologyGraph {
  const regions: CosmicRegion[] = [
    {
      id: 'void',
      kind: 'void',
      name: 'The Void',
      canonAnchor: 'doc 36 §1.2-1.3 (Outer Margin / Unwritten); doc 37 §7.2 (substrate-predators); doc 48 §3.4 (inter-cosmic medium)',
      heavenlyDao: createHeavenlyDao(0.05, 0.0, 'crushed'),
      fabric: { tolerance: TOLERANCES.void, lawDensity: 0.02, lawResistance: 0.02, gradeCap: 0, gradeFloor: 0 },
      grottoes: [],
    },
    {
      id: 'vast_expanse',
      kind: 'vast_expanse',
      name: 'The Vast Expanse',
      canonAnchor: 'doc 36 §3 (Acquired Stratum qi-medium); doc 48 §3.3-3.4 (Five Vast Territories, inter-cosmic medium)',
      heavenlyDao: createHeavenlyDao(0.7, 0.6, 'submit'),
      fabric: { tolerance: TOLERANCES.vastExpanse, lawDensity: 0.8, lawResistance: 0.7, gradeCap: 4, gradeFloor: 1 },
      grottoes: [],
    },
    {
      id: 'immortal_astral_continent',
      kind: 'continent',
      name: 'Immortal Astral Continent',
      canonAnchor: '[DERIVED] brief region name; corpus equivalent: the Central Continent (doc 36 §2.5) / mortal stratum main landmass',
      heavenlyDao: createHeavenlyDao(0.9, 0.3, 'submit'),
      fabric: { tolerance: TOLERANCES.worldHigh, lawDensity: 0.95, lawResistance: 0.9, gradeCap: 5, gradeFloor: 2 },
      grottoes: [],
    },
    {
      id: 'mortal_world',
      kind: 'world',
      name: 'The Mortal World',
      canonAnchor: 'doc 36 §2.1 (one planet in the Mortal Stratum); doc 36 §2.5 (five continents)',
      heavenlyDao: createHeavenlyDao(0.5, 0.2, 'submit'),
      fabric: { tolerance: TOLERANCES.worldMortal, lawDensity: 0.5, lawResistance: 0.5, gradeCap: 1, gradeFloor: 0 },
      grottoes: [
        {
          id: 'precelestial',
          name: 'The Precelestial',
          anchorRegionId: 'mortal_world',
          timeDilation: 1 / 365,
          timeDilationRatio: [1, 365],
          lawDensity: 0.99,
          tolerance: TOLERANCES.grotto,
        },
        {
          id: 'crimson_vow_city',
          name: 'Crimson Vow City',
          anchorRegionId: 'mortal_world',
          timeDilation: 3,
          timeDilationRatio: [3, 1],
          lawDensity: 0.6,
          tolerance: TOLERANCES.grotto,
        },
        {
          id: 'reach_of_fast_time',
          name: 'Reach of Fast Time',
          anchorRegionId: 'mortal_world',
          timeDilation: 1 / 36500,
          timeDilationRatio: [1, 36500],
          lawDensity: 0.3,
          tolerance: TOLERANCES.grotto,
        },
      ],
    },
  ];
  return { regions, seededAt: 89274613 };
}

export function findRegion(graph: CosmologyGraph, regionId: string): CosmicRegion | undefined {
  return graph.regions.find((r) => r.id === regionId);
}

export function findGrotto(graph: CosmologyGraph, grottoId: string): GrottoHeaven | undefined {
  for (const region of graph.regions) {
    const found = region.grottoes.find((g) => g.id === grottoId);
    if (found) return found;
  }
  return undefined;
}

// ---------------------------------------------------------------------------
// Ontological mass & existential pressure
// ---------------------------------------------------------------------------

/**
 * Ontological mass of a being at a given grade of existence.
 * Exponential in grade: mass(grade) = 8^grade.
 *   grade 0 (substrate) → 1
 *   grade 3 (Law Binding) → 512  — a Step-3 presence tears a low world.
 *   grade 4 (Authorship) → 4096 — Mahayana presence destabilizes a grotto
 *                                 interior (doc 48 §3.7 scale).
 * [DERIVED] — the brief's "ontological mass"; scale chosen for conformance.
 */
export function ontologicalMass(grade: number): number {
  return Math.pow(8, grade);
}

/** Whether a being of the given mass may stand in a world of the given tolerance. */
export function canDescendDirectly(mass: number, tolerance: number): boolean {
  return mass <= tolerance;
}

export type DescentMode = 'direct' | 'avatar' | 'seal' | 'grotto';

export interface DescentPlan {
  mode: DescentMode;
  projectedMass: number;
  effectiveGrade: number;
  conformsToLocalLaws: boolean;
  notes: string[];
}

/**
 * Plan the lawful descent of a being into a world.
 *
 *   direct — mass ≤ tolerance: no constraint.
 *   avatar — mass > tolerance: the being projects a local body whose mass is
 *            capped under the world's tolerance and whose effective grade is
 *            clamped to the world's gradeCap — the avatar is subject to local
 *            laws (doc 48 §3.7: the descended cultivator is "deliberately
 *            weakened — constrained to a power level the mortal cosmos can
 *            sustain").
 *   seal   — a bounded projection: tighter than an avatar (stronger cap),
 *            with seal overhead noted.
 *   grotto — the being carries a pocket of higher-grade law (a grotto) into
 *            the world; the grotto's own tolerance hosts the full mass while
 *            the being's interface with the world remains capped.
 */
export function planDescent(grade: number, world: CosmicRegion): DescentPlan {
  const mass = ontologicalMass(grade);
  const tolerance = world.fabric.tolerance;

  if (mass <= tolerance) {
    return {
      mode: 'direct',
      projectedMass: mass,
      effectiveGrade: Math.min(grade, world.fabric.gradeCap),
      conformsToLocalLaws: grade <= world.fabric.gradeCap,
      notes: ['mass within fabric tolerance — direct presence lawful'],
    };
  }

  const avatarCap = tolerance * 0.9;
  const plans: Array<{ mode: DescentMode; projectedMass: number; effectiveGrade: number; notes: string[] }> = [
    {
      mode: 'avatar',
      projectedMass: Math.min(mass, avatarCap),
      effectiveGrade: Math.min(grade, world.fabric.gradeCap),
      notes: [
        `ontological mass ${mass} exceeds tolerance ${tolerance}`,
        'avatar mass capped to 0.9 × tolerance',
        'avatar effective grade clamped to region gradeCap — local laws apply',
      ],
    },
    {
      mode: 'seal',
      projectedMass: Math.min(mass, tolerance * 0.6),
      effectiveGrade: Math.min(grade, world.fabric.gradeCap),
      notes: ['seal projects a tighter cap (0.6 × tolerance) with maintenance overhead'],
    },
    {
      mode: 'grotto',
      projectedMass: tolerance,
      effectiveGrade: Math.min(grade, world.fabric.gradeCap),
      notes: ['grotto pocket hosts full mass at grotto tolerance; world interface stays capped'],
    },
  ];

  // Deterministic choice: avatar is the canonical first answer; seal and
  // grotto are the documented alternatives (ranked, never random).
  return { ...plans[0], conformsToLocalLaws: true };
}

// ---------------------------------------------------------------------------
// Which laws bind a being (grade of existence ladder)
// ---------------------------------------------------------------------------

/** Law tiers active in a region: [floor, ceiling] on LAW_TIER_INDEX. */
export function activeLawTiers(region: CosmicRegion): LawTier[] {
  const lo = region.fabric.gradeFloor;
  const hi = region.fabric.gradeCap;
  return LAW_TIERS.filter((t) => LAW_TIER_INDEX[t] >= lo && LAW_TIER_INDEX[t] <= hi);
}

/**
 * Laws binding on a being of the given grade in a region:
 * the region's active tiers whose tier index does not exceed the being's grade.
 * A grade-0 being in a Step-4 region is bound by NO active law (it sits
 * below the region's law floor — the region's laws cannot reach it); a
 * grade-4 being in a grade-1 world is bound only by the world's own low
 * active tiers. This is the "which laws apply" ladder.
 */
export function lawsBindingOn(grade: number, region: CosmicRegion): LawTier[] {
  return activeLawTiers(region).filter((t) => LAW_TIER_INDEX[t] <= grade);
}

/** Set the Heavenly Dao state of a region (deterministic, recorded). */
export function setHeavenlyDaoState(
  graph: CosmologyGraph,
  regionId: string,
  state: HeavenlyDaoState,
): CosmologyGraph {
  return {
    ...graph,
    regions: graph.regions.map((r) =>
      r.id === regionId ? { ...r, heavenlyDao: { ...r.heavenlyDao, state } } : r,
    ),
  };
}

export { gradeForRealm };
