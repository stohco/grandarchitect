/**
 * laws/types.ts — shared primitives for the Law Interaction Solver
 * ==================================================================
 *
 * "Power is relative to the laws of the environment in which it is exercised."
 *
 * A cultivator acts with a capability vector; a world resists with a
 * RealmLawProfile; local formations/domains/restrictions stack on top of the
 * realm laws. Outcome = (capability × technique × artifact × comprehension
 * × local bonuses) / (world resistance × local law stack), interpreted per
 * interaction category through a threshold table.
 *
 * Canon sources:
 *   - corpus-extension/03_REALM_LADDER.md  (10 stations, 2× qi per realm)
 *   - corpus-extension/32_POWER_SCALING_AND_PHASE_COMBAT.md (envelope table,
 *     forbidden interpretations incl. the forbidden-clash rule)
 *   - corpus-extension/16_FORMATIONS_TALISMANS_ALCHEMY.md (formations as
 *     node/edge qi-circuits with realm gating)
 *   - corpus-extension/24_RECONCILIATION_AND_DECISIONS.md (tiebreaker)
 *
 * Determinism contract: every function here is a pure function of its
 * inputs. No Math.random, no Math.sin/cos/tan. IEEE-754 primitives only.
 */

/** The ten stations of the cultivation ladder (doc 03, [CANON]). */
export type Realm =
  | 'mortal'
  | 'qi_induction'
  | 'qi_condensation'
  | 'foundation_establishment'
  | 'core_formation'
  | 'nascent_soul'
  | 'spirit_severance'
  | 'void_amalgamation'
  | 'tribulation_crossing'
  | 'mahayana';

export const REALM_LADDER: Realm[] = [
  'mortal',
  'qi_induction',
  'qi_condensation',
  'foundation_establishment',
  'core_formation',
  'nascent_soul',
  'spirit_severance',
  'void_amalgamation',
  'tribulation_crossing',
  'mahayana',
];

/** Index of each realm on the ladder (0 = mortal). [CANON] linear ladder. */
export const REALM_INDEX: Record<Realm, number> = {
  mortal: 0,
  qi_induction: 1,
  qi_condensation: 2,
  foundation_establishment: 3,
  core_formation: 4,
  nascent_soul: 5,
  spirit_severance: 6,
  void_amalgamation: 7,
  tribulation_crossing: 8,
  mahayana: 9,
};

/**
 * Interaction categories. The design brief's law groups map 1:1 to the
 * domains of the RealmLawProfile; the solver resolves per category.
 */
export type LawDomain =
  | 'matter'
  | 'space'
  | 'movement'
  | 'qi'
  | 'perception'
  | 'soul'
  | 'causality';

export const LAW_DOMAINS: LawDomain[] = [
  'matter',
  'space',
  'movement',
  'qi',
  'perception',
  'soul',
  'causality',
];

/** Interaction category is the domain for every interaction this solver
 *  handles (matter clash, spatial transit, movement contest, qi pressure,
 *  divine-sense contest, soul projection, causal/karmic act). */
export type InteractionCategory = LawDomain;

export type Vec3Tuple = [number, number, number];

/** Round to a fixed number of decimals for stable serialization. */
export function roundN(v: number, digits: number): number {
  const f = Math.pow(10, digits);
  return Math.round(v * f) / f;
}

/** Clamp to [min, max]. */
export function clamp(v: number, min: number, max: number): number {
  if (v < min) return min;
  if (v > max) return max;
  return v;
}
