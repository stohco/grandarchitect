/**
 * laws/realm-law-profile.ts — RealmLawProfile + canonical 10-station table
 * ========================================================================
 *
 * A world's law profile answers "how much does THIS world resist an actor
 * in each interaction category?" The brief's law groups:
 *
 *   matter:     compression, structuralReinforcement, energeticStability
 *   space:      cohesion, distortionResistance, teleportResistance,
 *               dimensionalStability
 *   movement:   gravityInfluence, flightSuppression, atmosphericResistance,
 *               spatialDrag
 *   qi:         ambientDensity, pressure, techniqueDissipation,
 *               absorptionDifficulty
 *   perception: divineSenseAttenuation, spatialOcclusion
 *   soul:       soulPressure, projectionResistance
 *   causality:  karmaRigidity, temporalStability
 *
 * Canonical table construction (all per-station values [DERIVED] from
 * doc 03 + doc 32 §1.2 + the design brief unless tagged [CANON]):
 *
 *   - The ONLY canonical invariant in the corpus is that qi capacity
 *     doubles per station (doc 03: "The multiplier is exactly 2.0 for
 *     canonical purposes"). We anchor every station's law strength to
 *     STATION_POWER = 2^station, so the corpus's 2× qi law is the unit.
 *   - Peak strike J and speed use doc 32 §1.2 / doc 03 medians directly.
 *   - Authority-domain floors: spatial law holds at Nascent Soul strength
 *     even in a mortal world because ordinary space is itself the strongest
 *     space law there is; soul law holds at Core Formation strength
 *     (anchor perception, doc 03 Station 5); causal/temporal law at
 *     Tribulation Crossing strength (doc 03 Station 9). Perception law
 *     floors at Qi Induction (doc 03 Station 2 — senses begin there).
 *     These floors make "a low world is not a physics-free sandbox"
 *     mechanical: direct domains (matter/movement/qi) still collapse to
 *     a high-realm actor, but space/soul/causality keep their own laws.
 *
 * A cultivator of the same station as the world lands at R ≈ 1.0 in the
 * direct domains (normal), by construction: the world profile's resistance
 * equals the canonical capability baseline of its station.
 */

import type { LawDomain, Realm } from './types';
import { REALM_LADDER, REALM_INDEX, LAW_DOMAINS } from './types';

// ---------------------------------------------------------------------------
// Law factor groups
// ---------------------------------------------------------------------------

export interface MatterLaws {
  compression: number;
  structuralReinforcement: number;
  energeticStability: number;
}

export interface SpaceLaws {
  cohesion: number;
  distortionResistance: number;
  teleportResistance: number;
  dimensionalStability: number;
}

export interface MovementLaws {
  gravityInfluence: number;
  flightSuppression: number;
  atmosphericResistance: number;
  spatialDrag: number;
}

export interface QiLaws {
  ambientDensity: number;
  pressure: number;
  techniqueDissipation: number;
  absorptionDifficulty: number;
}

export interface PerceptionLaws {
  divineSenseAttenuation: number;
  spatialOcclusion: number;
}

export interface SoulLaws {
  soulPressure: number;
  projectionResistance: number;
}

export interface CausalityLaws {
  karmaRigidity: number;
  temporalStability: number;
}

export interface RealmLawProfile {
  realm: Realm;
  matter: MatterLaws;
  space: SpaceLaws;
  movement: MovementLaws;
  qi: QiLaws;
  perception: PerceptionLaws;
  soul: SoulLaws;
  causality: CausalityLaws;
}

export const LAW_GROUPS: Record<LawDomain, keyof RealmLawProfile> = {
  matter: 'matter',
  space: 'space',
  movement: 'movement',
  qi: 'qi',
  perception: 'perception',
  soul: 'soul',
  causality: 'causality',
};

/** Deterministic resistance of a profile in one domain = geometric mean of
 *  the domain's factors (IEEE-754 pow/exp, no transcendental RNG). */
export function resistanceOf(profile: RealmLawProfile, domain: LawDomain): number {
  const group = profile[LAW_GROUPS[domain]];
  const values: number[] = Object.values(group);
  let product = 1;
  for (const v of values) product *= Math.max(v, 1e-9);
  return Math.pow(product, 1 / values.length);
}

/** All per-domain resistances of a profile, in canonical domain order. */
export function resistanceVector(profile: RealmLawProfile): Record<LawDomain, number> {
  const out = {} as Record<LawDomain, number>;
  for (const d of LAW_DOMAINS) out[d] = resistanceOf(profile, d);
  return out;
}

// ---------------------------------------------------------------------------
// Canonical anchors [DERIVED from doc 03 + doc 32 §1.2]
// ---------------------------------------------------------------------------

/** 2^station — the canonical per-realm power ratio ([CANON] base: qi ×2). */
export function stationPower(station: number): number {
  return Math.pow(2, station);
}

/** Peak single-strike energy (J), doc 32 §1.2 medians (tuning cells noted). */
export const PEAK_STRIKE_J: Record<Realm, number> = {
  mortal: 550,                       // 300–800 J (doc 32 §1.2)
  qi_induction: 550,                 // 300–800 J (no output verbs, doc 03)
  qi_condensation: 12_500,           // 5–20 kJ
  foundation_establishment: 125_000, // 50–200 kJ
  core_formation: 3_000_000,         // 1–5 MJ
  nascent_soul: 125_000_000,         // 50–200 MJ
  spirit_severance: 27_500_000_000,  // 5–50 GJ (law-mediated)
  void_amalgamation: 2_750_000_000_000, // 500 GJ–5 TJ (place-mediated)
  tribulation_crossing: 275_000_000_000_000, // 50–500 TJ (stratum)
  mahayana: 27_500_000_000_000_000,  // 5–50 PJ (law-scope)
};

/** Max movement speed (m/s), doc 03 table medians (Mahayana: transcendent
 *  — we pin an implementation-scale bound, [DERIVED]). */
export const STATION_SPEED_MPS: Record<Realm, number> = {
  mortal: 1.3,
  qi_induction: 3.0,
  qi_condensation: 12,
  foundation_establishment: 22,
  core_formation: 45,
  nascent_soul: 90,
  spirit_severance: 200,
  void_amalgamation: 600,
  tribulation_crossing: 1500,
  mahayana: 10000,
};

/** Typical qi reservoir in qwu (doc 32 §1.2 median; [DERIVED] midpoints). */
export const STATION_RESERVOIR_QWU: Record<Realm, number> = {
  mortal: 0,
  qi_induction: 0,        // perceive only
  qi_condensation: 200,   // 100–300
  foundation_establishment: 1050, // 600–1500
  core_formation: 10_000, // 5k–15k
  nascent_soul: 125_000,  // 50k–200k
  spirit_severance: 5_500_000, // 1e6–1e7
  void_amalgamation: 550_000_000, // 1e8–1e9
  tribulation_crossing: 50_000_000_000, // 1e10+
  mahayana: 500_000_000_000_000, // 1e12+
};

// ---------------------------------------------------------------------------
// Authority-domain floors [DERIVED — see header comment]
// ---------------------------------------------------------------------------

/** Station index at which each authority-domain law reaches its floor. */
export const DOMAIN_FLOOR_STATION: Record<LawDomain, number> = {
  matter: 0,        // matter laws exist everywhere, at the world's own strength
  movement: 0,      // gravity/drag exist everywhere
  qi: 1,            // ambient qi is perceptible from Qi Induction (doc 03)
  perception: 1,    // divine sense begins at Qi Induction (doc 03 Station 2)
  space: 5,         // spatial authority begins at Nascent Soul (Station 6)
  soul: 4,          // soul/anchor authority begins at Core Formation (Station 5)
  causality: 8,     // temporal/causal authority begins at Tribulation Crossing
};

/** Canonical factor value for a world at station `w` in domain `d`. */
export function canonicalLawValue(d: LawDomain, worldStation: number): number {
  const floor = Math.pow(2, DOMAIN_FLOOR_STATION[d]);
  return Math.max(stationPower(worldStation), floor);
}

// ---------------------------------------------------------------------------
// Canonical profile table (10 stations)
// ---------------------------------------------------------------------------

function buildCanonicalProfile(realm: Realm): RealmLawProfile {
  const w = REALM_INDEX[realm];
  const m = canonicalLawValue('matter', w);
  const sp = canonicalLawValue('space', w);
  const mv = canonicalLawValue('movement', w);
  const q = canonicalLawValue('qi', w);
  const pe = canonicalLawValue('perception', w);
  const so = canonicalLawValue('soul', w);
  const ca = canonicalLawValue('causality', w);
  return {
    realm,
    matter: { compression: m, structuralReinforcement: m, energeticStability: m },
    space: { cohesion: sp, distortionResistance: sp, teleportResistance: sp, dimensionalStability: sp },
    movement: { gravityInfluence: mv, flightSuppression: mv, atmosphericResistance: mv, spatialDrag: mv },
    qi: { ambientDensity: q, pressure: q, techniqueDissipation: q, absorptionDifficulty: q },
    perception: { divineSenseAttenuation: pe, spatialOcclusion: pe },
    soul: { soulPressure: so, projectionResistance: so },
    causality: { karmaRigidity: ca, temporalStability: ca },
  };
}

/** The canonical RealmLawProfile per station (same values as the canonical
 *  capability baseline of that station — same-station actors land at R≈1). */
export const CANONICAL_REALM_LAW_PROFILES: Record<Realm, RealmLawProfile> = (() => {
  const out = {} as Record<Realm, RealmLawProfile>;
  for (const r of REALM_LADDER) out[r] = buildCanonicalProfile(r);
  return out;
})();

/** Convenience: canonical profile by station index. */
export function canonicalProfileForStation(station: number): RealmLawProfile {
  return CANONICAL_REALM_LAW_PROFILES[REALM_LADDER[Math.max(0, Math.min(9, station))]];
}
