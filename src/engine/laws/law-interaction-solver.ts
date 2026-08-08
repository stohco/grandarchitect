/**
 * laws/law-interaction-solver.ts — LawInteractionSolver
 * =====================================================
 *
 * Outcome = (capability × technique × artifact × comprehension × local
 * bonuses) / (world resistance × local law stack), per interaction
 * category. Threshold interpretation of the ratio R (design brief):
 *
 *   R < 0.1  essentially impossible
 *   0.1–0.4  negligible
 *   0.4–0.8  strain / scratches
 *   0.8–1.0  barely capable
 *   1.0–1.5  normal
 *   1.5–3.0  powerful
 *   3.0–10   overwhelming
 *   10+      environment fragile relative to actor
 *
 * Per-domain nonlinear curves ([DERIVED]): physical domains (matter,
 * movement, qi, perception) interpret R linearly; authority domains
 * (space, soul, causality) are quadratic below 1 (authority that cannot
 * move the law is doubly wasted) and square-root above 1 (authority past
 * the threshold moves the law more easily). The band classification uses
 * the CURVED ratio.
 *
 * FORBIDDEN-CLASH RULE (doc 32 §"Forbidden interpretations"): a
 * lower-realm cultivator cannot win a direct clash with a higher-realm
 * cultivator without explicit tactical advantage. Encoded in solve():
 * when input.directClash is set and the actor's realm index is lower than
 * the target's, the result ratio is compared against 1.0 — if R < 1.0 the
 * outcome is FORCED to deflected failure (success=false, band locked,
 * realized force zeroed, backlash reflects the incoming strike). An
 * explicit tactical advantage (surprise, formation collapse, artifact
 * activation, environmental leverage — passed as a multiplier on the
 * actor's effective ratio) is the ONLY path to R ≥ 1.0 for a lower-realm
 * actor in a direct clash.
 *
 * Determinism: pure function of inputs. No RNG. Same inputs → identical
 * LawInteractionResult (JSON-identical).
 */

import type { LawDomain, Realm } from './types';
import { REALM_INDEX, roundN, clamp } from './types';
import {
  CANONICAL_REALM_LAW_PROFILES,
  PEAK_STRIKE_J,
  STATION_SPEED_MPS,
  STATION_RESERVOIR_QWU,
  resistanceOf,
  canonicalProfileForStation,
} from './realm-law-profile';
import type { RealmLawProfile } from './realm-law-profile';
import {
  createCapabilityVector,
  createTechniqueProfile,
  effectiveDomainCapability,
  resolveDomainMultipliers,
  effectivePenetration,
} from './capability-vector';
import type { ArtifactModifiers, CapabilityVector, ComprehensionModifiers, LocalBonuses, TechniqueInteractionProfile } from './capability-vector';
import { resolveLocalLawStack } from './local-law-stack';
import type { LocalLawStack } from './local-law-stack';
import type { TerrainOperationClipResult } from './terrain-operation-clip';

// ---------------------------------------------------------------------------
// Ratio interpretation
// ---------------------------------------------------------------------------

export type RatioBand =
  | 'impossible'
  | 'negligible'
  | 'strain'
  | 'barely-capable'
  | 'normal'
  | 'powerful'
  | 'overwhelming'
  | 'environment-fragile';

export const RATIO_BAND_EDGES: Array<{ edge: number; band: RatioBand }> = [
  { edge: 0.1, band: 'impossible' },
  { edge: 0.4, band: 'negligible' },
  { edge: 0.8, band: 'strain' },
  { edge: 1.0, band: 'barely-capable' },
  { edge: 1.5, band: 'normal' },
  { edge: 3.0, band: 'powerful' },
  { edge: 10.0, band: 'overwhelming' },
];

/** Authority domains interpret R nonlinearly ([DERIVED], see header). */
export const AUTHORITY_DOMAINS: LawDomain[] = ['space', 'soul', 'causality'];

export function curveRatio(domain: LawDomain, r: number): number {
  if (r < 0) return 0;
  if (AUTHORITY_DOMAINS.includes(domain)) {
    return r < 1 ? r * r : Math.sqrt(r);
  }
  return r;
}

export function bandForRatio(curvedR: number): RatioBand {
  if (curvedR < 0.1) return 'impossible';
  if (curvedR < 0.4) return 'negligible';
  if (curvedR < 0.8) return 'strain';
  if (curvedR < 1.0) return 'barely-capable';
  if (curvedR < 1.5) return 'normal';
  if (curvedR < 3.0) return 'powerful';
  if (curvedR <= 10.0) return 'overwhelming'; // brief: 3–10 overwhelming; 10+ fragile
  return 'environment-fragile';
}

// ---------------------------------------------------------------------------
// Input / result shapes
// ---------------------------------------------------------------------------

export interface DirectClashSpec {
  /** The defender's realm. */
  targetRealm: Realm;
  /** Explicit tactical advantage multiplier on the actor's effective ratio
   *  (the ONLY path for a lower-realm actor to win a direct clash). */
  tacticalAdvantageMultiplier?: number;
}

export interface LawInteractionInput {
  actorId: string;
  actorRealm: Realm;
  capability: CapabilityVector;
  world: RealmLawProfile;
  /** Interaction category (domain) this interaction primarily resolves in. */
  domain: LawDomain;
  technique?: TechniqueInteractionProfile | null;
  artifacts?: ArtifactModifiers | null;
  comprehension?: ComprehensionModifiers | null;
  localBonuses?: LocalBonuses | null;
  localLawStack?: LocalLawStack | null;
  directClash?: DirectClashSpec | null;
  /** Terrain clip result from the protection-aware clip (carries the
   *  surviving MatterRemovalEvent and removedMatter). */
  terrainClip?: TerrainOperationClipResult | null;
  tick: number;
}

export interface ForbiddenClashOutcome {
  lowerRealm: Realm;
  higherRealm: Realm;
  deflected: boolean;
  tacticalAdvantageApplied: number;
}

export interface LawInteractionResult {
  actorId: string;
  tick: number;
  domain: LawDomain;
  success: boolean;
  /** Raw ratio (before the per-domain curve). */
  authorityRatio: number;
  /** Curved ratio used for band classification. */
  effectiveRatio: number;
  band: RatioBand;
  realized: {
    forceJ: number;
    speedMps: number;
    rangeM: number;
  };
  worldDamage: {
    deformation: number;
    fracture: number;
    spatialDamage: number;
  };
  /** Qi cost in qwu. */
  energyCost: number;
  /** 0..1 share of the incoming force reflected onto the actor. */
  backlash: number;
  /** m³ genuinely removed (0 unless a terrain clip was supplied). */
  removedMatter: number;
  forbiddenClash: ForbiddenClashOutcome | null;
  resistanceBreakdown: {
    capability: number;
    actorMultipliers: number;
    realmResistance: number;
    lawStackMultiplier: number;
    penetrationReduction: number;
    /** 2^(defenderRealm − actorRealm) in a direct clash vs a higher realm. */
    clashDifferential: number;
    effectiveResistance: number;
  };
}

// ---------------------------------------------------------------------------
// Realization helpers ([DERIVED] — force/speed/range from canonical scales)
// ---------------------------------------------------------------------------

export function realizedForceFromRatio(realm: Realm, domain: LawDomain, r: number): number {
  const base = PEAK_STRIKE_J[realm];
  const domainFactor = domain === 'matter' ? 1 : 0.25;
  return base * domainFactor * clamp(r, 0, 12);
}

export function realizedSpeedFromRatio(realm: Realm, domain: LawDomain, r: number): number {
  const base = STATION_SPEED_MPS[realm];
  return base * clamp(r, 0.25, domain === 'movement' ? 4 : 1);
}

export function realizedRangeFromRatio(affectedRadius: number, r: number): number {
  return affectedRadius * Math.sqrt(clamp(r, 0.25, 4));
}

export function energyCostFromRatio(realm: Realm, technique: TechniqueInteractionProfile | null | undefined, r: number): number {
  const base = technique?.baseQwuCost ?? 8;
  const reservoir = Math.max(STATION_RESERVOIR_QWU[realm], 1);
  const cost = base * clamp(r, 0.25, 4);
  return roundN(Math.min(cost, reservoir * 0.9), 3);
}

export function backlashFromRatio(r: number, bodyDurability: number, deflected: boolean): number {
  const base = Math.max(0, 1 - Math.min(r, 1));
  const reduced = base * (1 - 0.25 * Math.min(Math.max(bodyDurability, 0), 4));
  if (deflected) return Math.max(reduced, 0.6);
  return roundN(clamp(reduced, 0, 1), 4);
}

/** World damage from the ratio ([DERIVED] thresholds). */
export function worldDamageFromRatio(domain: LawDomain, r: number): { deformation: number; fracture: number; spatialDamage: number } {
  const deformation = clamp(r / 10, 0, 1);
  const fracture = r >= 3 ? clamp((r - 3) / 7, 0, 1) : 0;
  const spatialDamage = domain === 'space' && r >= 10 ? 1 : 0;
  return {
    deformation: roundN(deformation, 4),
    fracture: roundN(fracture, 4),
    spatialDamage: roundN(spatialDamage, 4),
  };
}

/** Canonical capability baseline for a station ([DERIVED] floors per
 *  authority-granting station — doc 03 verbs per station). daoAuthority is
 *  station-uniform (relative baseline) so a same-station actor lands at
 *  exactly R = 1.0 against the canonical world of its own realm. */
export function canonicalCapabilityForStation(realm: Realm): CapabilityVector {
  const k = REALM_INDEX[realm];
  const p = Math.pow(2, k);
  return createCapabilityVector({
    physicalForce: p,
    bodyDurability: p,
    movementAuthority: p,
    qiThroughput: k >= 1 ? p : 1,
    spatialAuthority: k >= 5 ? p : 1,
    temporalAuthority: k >= 8 ? p : 1,
    soulAuthority: k >= 4 ? p : 1,
    divineSense: k >= 1 ? p : 1,
    elementalAuthority: k >= 2 ? p : 1,
    daoAuthority: p,
  });
}

// ---------------------------------------------------------------------------
// The solver
// ---------------------------------------------------------------------------

export class LawInteractionSolver {
  /**
   * Solve one law interaction. Pure: identical inputs → identical result.
   */
  solve(input: LawInteractionInput): LawInteractionResult {
    const { domain } = input;
    const capability = effectiveDomainCapability(input.capability, domain);
    const multipliers = resolveDomainMultipliers(input.technique, input.artifacts, input.comprehension, input.localBonuses);
    const actorMult = multipliers[domain];

    const stackResolution = resolveLocalLawStack(input.localLawStack);
    const lawStackMult = stackResolution.perDomainMultipliers[domain];
    const realmOverride = stackResolution.realmOverrides[domain];

    let realmResistance = realmOverride ? realmOverride.value : resistanceOf(input.world, domain);
    const penetrationReduction = effectivePenetration(input.technique);

    // [DERIVED] Direct-clash encoding of the forbidden rule (doc 32): in a
    // direct clash the defender's own cultivation is part of the resistance
    // — the defender's station law raises the denominator by 2^(Δrealm).
    // This is what makes a lower-realm actor land at R < 1.0 unless an
    // explicit tactical advantage (or a weak world) raises them to parity.
    let clashDifferential = 1;
    if (input.directClash) {
      const actorIdx = REALM_INDEX[input.actorRealm];
      const targetIdx = REALM_INDEX[input.directClash.targetRealm];
      if (actorIdx < targetIdx) clashDifferential = Math.pow(2, targetIdx - actorIdx);
    }

    const effectiveResistance = Math.max(realmResistance * lawStackMult * clashDifferential * (1 - penetrationReduction), 1e-9);

    const rawR = (capability * actorMult) / effectiveResistance;
    const curvedR = curveRatio(domain, rawR);

    // --- Forbidden clash rule (doc 32) ----------------------------------------
    let forbiddenClash: ForbiddenClashOutcome | null = null;
    let effectiveBandR = curvedR;
    if (input.directClash) {
      const actorIdx = REALM_INDEX[input.actorRealm];
      const targetIdx = REALM_INDEX[input.directClash.targetRealm];
      const tactical = input.directClash.tacticalAdvantageMultiplier ?? 1;
      const clashR = curvedR * tactical;
      if (actorIdx < targetIdx) {
        forbiddenClash = {
          lowerRealm: input.actorRealm,
          higherRealm: input.directClash.targetRealm,
          deflected: clashR < 1.0,
          tacticalAdvantageApplied: tactical,
        };
        if (clashR < 1.0) {
          // FORBIDDEN: the lower-realm cultivator cannot win a direct clash.
          // The strike is deflected/strained — band forced below 'normal',
          // realized force zeroed, backlash reflects the incoming.
          effectiveBandR = Math.min(clashR, 0.999);
        } else {
          effectiveBandR = clashR;
        }
      } else {
        effectiveBandR = clashR;
      }
    }

    const band = bandForRatio(roundN(effectiveBandR, 4));
    const deflected = forbiddenClash?.deflected ?? false;
    const success = deflected ? false : effectiveBandR >= (input.directClash ? 1.0 : 0.8);

    const tech = input.technique ?? createTechniqueProfile();
    const realizedForce = deflected ? 0 : realizedForceFromRatio(input.actorRealm, domain, effectiveBandR);
    const realizedSpeed = deflected ? 0 : realizedSpeedFromRatio(input.actorRealm, domain, effectiveBandR);
    const realizedRange = deflected ? 0 : realizedRangeFromRatio(tech.affectedRadius, effectiveBandR);

    const worldDamage = deflected ? { deformation: 0, fracture: 0, spatialDamage: 0 } : worldDamageFromRatio(domain, effectiveBandR);
    const energyCost = energyCostFromRatio(input.actorRealm, input.technique, effectiveBandR);
    const backlash = backlashFromRatio(effectiveBandR, input.capability.bodyDurability, deflected);

    const removedMatter = input.terrainClip ? input.terrainClip.removedMatterVolumeM3 : 0;

    return {
      actorId: input.actorId,
      tick: input.tick,
      domain,
      success,
      authorityRatio: roundN(rawR, 4),
      effectiveRatio: roundN(effectiveBandR, 4),
      band,
      realized: {
        forceJ: roundN(realizedForce, 4),
        speedMps: roundN(realizedSpeed, 4),
        rangeM: roundN(realizedRange, 4),
      },
      worldDamage,
      energyCost,
      backlash,
      removedMatter,
      forbiddenClash,
      resistanceBreakdown: {
        capability: roundN(capability, 4),
        actorMultipliers: roundN(actorMult, 4),
        realmResistance: roundN(realmResistance, 4),
        lawStackMultiplier: roundN(lawStackMult, 4),
        penetrationReduction: roundN(penetrationReduction, 4),
        clashDifferential: roundN(clashDifferential, 4),
        effectiveResistance: roundN(effectiveResistance, 4),
      },
    };
  }
}

export function createLawInteractionSolver(): LawInteractionSolver {
  return new LawInteractionSolver();
}

/** Convenience: canonical world profile by realm. */
export function canonicalWorld(realm: Realm): RealmLawProfile {
  return CANONICAL_REALM_LAW_PROFILES[realm];
}

export { canonicalProfileForStation };

/** Re-export for callers that only need the profile half. */
export type { RealmLawProfile };
