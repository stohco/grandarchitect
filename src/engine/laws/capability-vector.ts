/**
 * laws/capability-vector.ts — CapabilityVector + technique/artifact/comprehension
 * ==============================================================================
 *
 * The actor side of the law equation. A cultivator acts with a capability
 * vector (the design brief):
 *
 *   physicalForce, bodyDurability, movementAuthority, qiThroughput,
 *   spatialAuthority, temporalAuthority, soulAuthority, divineSense,
 *   elementalAuthority, daoAuthority
 *
 * Each capability contributes to interaction domains through a fixed,
 * normalized weight matrix (rows sum to 1.0 — a cultivator whose vector is
 * uniform across a domain's contributors lands exactly at the shared value).
 *
 * TechniqueInteractionProfile per the brief: physicalForce, penetration,
 * qiPressure, spatialAuthority, soulAuthority, affectedRadius,
 * terrainInteraction {fracture, excavation, vaporization},
 * materialRecovery {baseEfficiency, collectionRadius}.
 *
 * Doc 32 §2.2 (phase-aware routing) gives the canonical precedent for
 * technique-into-domain multipliers: Fire routing → +50% strike damage,
 * Water routing → +30%, etc. Our technique fields follow the same shape
 * (multiplicative on the domain capability).
 */

import type { LawDomain } from './types';
import { LAW_DOMAINS } from './types';

export type CapabilityKey =
  | 'physicalForce'
  | 'bodyDurability'
  | 'movementAuthority'
  | 'qiThroughput'
  | 'spatialAuthority'
  | 'temporalAuthority'
  | 'soulAuthority'
  | 'divineSense'
  | 'elementalAuthority'
  | 'daoAuthority';

export interface CapabilityVector {
  physicalForce: number;
  bodyDurability: number;
  movementAuthority: number;
  qiThroughput: number;
  spatialAuthority: number;
  temporalAuthority: number;
  soulAuthority: number;
  divineSense: number;
  elementalAuthority: number;
  daoAuthority: number;
}

/** Uniform mortal-baseline vector (all authorities at 1.0). */
export function createCapabilityVector(partial?: Partial<CapabilityVector>): CapabilityVector {
  return {
    physicalForce: partial?.physicalForce ?? 1,
    bodyDurability: partial?.bodyDurability ?? 1,
    movementAuthority: partial?.movementAuthority ?? 1,
    qiThroughput: partial?.qiThroughput ?? 1,
    spatialAuthority: partial?.spatialAuthority ?? 1,
    temporalAuthority: partial?.temporalAuthority ?? 1,
    soulAuthority: partial?.soulAuthority ?? 1,
    divineSense: partial?.divineSense ?? 1,
    elementalAuthority: partial?.elementalAuthority ?? 1,
    daoAuthority: partial?.daoAuthority ?? 1,
  };
}

/**
 * [DERIVED] Capability → domain contribution matrix. Weights are fixed and
 * normalized per row. Mapping rationale:
 *   matter     ← force (direct), elemental (breaks matter), dao (universal)
 *   movement   ← movement authority, qi (legs routing, doc 32 §2.2), dao
 *   qi         ← throughput, elemental, dao
 *   space      ← spatial authority, temporal (spacetime coupling), dao
 *   perception ← divine sense, dao
 *   soul       ← soul authority, dao
 *   causality  ← temporal authority, dao (law authorship, doc 03 St.10)
 */
const DOMAIN_CAPABILITY_MATRIX: Record<LawDomain, Array<{ cap: CapabilityKey; weight: number }>> = {
  matter: [
    { cap: 'physicalForce', weight: 0.5 },
    { cap: 'elementalAuthority', weight: 0.25 },
    { cap: 'daoAuthority', weight: 0.25 },
  ],
  movement: [
    { cap: 'movementAuthority', weight: 0.7 },
    { cap: 'qiThroughput', weight: 0.15 },
    { cap: 'daoAuthority', weight: 0.15 },
  ],
  qi: [
    { cap: 'qiThroughput', weight: 0.6 },
    { cap: 'elementalAuthority', weight: 0.2 },
    { cap: 'daoAuthority', weight: 0.2 },
  ],
  space: [
    { cap: 'spatialAuthority', weight: 0.7 },
    { cap: 'temporalAuthority', weight: 0.15 },
    { cap: 'daoAuthority', weight: 0.15 },
  ],
  perception: [
    { cap: 'divineSense', weight: 0.8 },
    { cap: 'daoAuthority', weight: 0.2 },
  ],
  soul: [
    { cap: 'soulAuthority', weight: 0.7 },
    { cap: 'daoAuthority', weight: 0.3 },
  ],
  causality: [
    { cap: 'temporalAuthority', weight: 0.4 },
    { cap: 'daoAuthority', weight: 0.6 },
  ],
};

/** Effective actor capability in one interaction domain (≥ 0). */
export function effectiveDomainCapability(capability: CapabilityVector, domain: LawDomain): number {
  const contributors = DOMAIN_CAPABILITY_MATRIX[domain];
  let total = 0;
  for (const c of contributors) {
    const v = capability[c.cap];
    total += c.weight * (v >= 0 ? v : 0);
  }
  return total;
}

/** All domain capabilities of a vector, canonical domain order. */
export function domainCapabilities(capability: CapabilityVector): Record<LawDomain, number> {
  const out = {} as Record<LawDomain, number>;
  for (const d of LAW_DOMAINS) out[d] = effectiveDomainCapability(capability, d);
  return out;
}

// ---------------------------------------------------------------------------
// Technique interaction profile
// ---------------------------------------------------------------------------

/** How the technique interacts with terrain when realized (weights 0..1). */
export interface TerrainInteractionProfile {
  /** Cracking/shattering share → RemovalCauseType 'smash'. */
  fracture: number;
  /** Excavating/clean share → 'clean-cut' (or 'careful-harvest'). */
  excavation: number;
  /** Vaporizing share → 'disintegration' (near-total matter loss). */
  vaporization: number;
}

/** Recovery behaviour of the technique (feeds MatterRemovalEvent.recovery). */
export interface MaterialRecoveryProfile {
  /** 0..1 base recovery efficiency for the technique's cause. */
  baseEfficiency: number;
  /** Collection radius in meters (loot aggregation radius). */
  collectionRadius: number;
}

export interface TechniqueInteractionProfile {
  /** Multiplier on matter-domain capability (doc 32 routing bonuses). */
  physicalForce: number;
  /** 0..1 — fraction of structuralReinforcement bypassed. */
  penetration: number;
  /** Multiplier on qi-domain capability (qi pressure). */
  qiPressure: number;
  /** Multiplier on space-domain capability (spatial strike). */
  spatialAuthority: number;
  /** Multiplier on soul-domain capability (anchor strike). */
  soulAuthority: number;
  /** Base affected radius in meters. */
  affectedRadius: number;
  terrainInteraction: TerrainInteractionProfile;
  materialRecovery: MaterialRecoveryProfile;
  /** Optional movement multiplier (Legs routing, doc 32 §2.2). */
  movementMultiplier?: number;
  /** Base qi cost in qwu for one application. */
  baseQwuCost?: number;
}

export function createTechniqueProfile(partial?: Partial<TechniqueInteractionProfile>): TechniqueInteractionProfile {
  return {
    physicalForce: partial?.physicalForce ?? 1,
    penetration: partial?.penetration ?? 0,
    qiPressure: partial?.qiPressure ?? 1,
    spatialAuthority: partial?.spatialAuthority ?? 1,
    soulAuthority: partial?.soulAuthority ?? 1,
    affectedRadius: partial?.affectedRadius ?? 1,
    terrainInteraction: partial?.terrainInteraction ?? { fracture: 1, excavation: 0, vaporization: 0 },
    materialRecovery: partial?.materialRecovery ?? { baseEfficiency: 0.85, collectionRadius: 4 },
    movementMultiplier: partial?.movementMultiplier ?? 1,
    baseQwuCost: partial?.baseQwuCost ?? 8,
  };
}

// ---------------------------------------------------------------------------
// Artifact / comprehension / local-bonus modifiers
// ---------------------------------------------------------------------------

/** Artifact modifiers (per-domain multipliers + energy efficiency). */
export interface ArtifactModifiers {
  matter?: number;
  space?: number;
  movement?: number;
  qi?: number;
  perception?: number;
  soul?: number;
  causality?: number;
  /** 0..1 — how much artifact qi reduces energy cost (1 = free). */
  energyEfficiency?: number;
}

/** Comprehension modifiers (law-fragment insight, doc 31 §8). */
export interface ComprehensionModifiers {
  matter?: number;
  space?: number;
  movement?: number;
  qi?: number;
  perception?: number;
  soul?: number;
  causality?: number;
  /** Dao-level insight — universal multiplier ([DERIVED]). */
  daoInsight?: number;
}

/** Local bonuses (geomancy, blessed ground, sect territory). */
export interface LocalBonuses {
  matter?: number;
  space?: number;
  movement?: number;
  qi?: number;
  perception?: number;
  soul?: number;
  causality?: number;
}

/**
 * Resolve all actor-side multipliers into one multiplier per domain.
 * [DERIVED] aggregation: technique domain multipliers are derived from the
 * brief's fields (penetration additionally softens the resistance side in
 * the solver), artifact/comprehension/local bonuses multiply directly.
 */
export function resolveDomainMultipliers(
  technique: TechniqueInteractionProfile | null | undefined,
  artifacts: ArtifactModifiers | null | undefined,
  comprehension: ComprehensionModifiers | null | undefined,
  localBonuses: LocalBonuses | null | undefined,
): Record<LawDomain, number> {
  const out = {} as Record<LawDomain, number>;
  const tech = technique ?? createTechniqueProfile();
  const daoInsight = comprehension?.daoInsight ?? 1;
  for (const d of LAW_DOMAINS) {
    const techMult = (() => {
      switch (d) {
        case 'matter': return tech.physicalForce;
        case 'qi': return tech.qiPressure;
        case 'space': return tech.spatialAuthority;
        case 'soul': return tech.soulAuthority;
        case 'movement': return tech.movementMultiplier ?? 1;
        default: return 1;
      }
    })();
    const artifactMult = artifacts?.[d] ?? 1;
    const comprehensionMult = comprehension?.[d] ?? 1;
    const bonusMult = localBonuses?.[d] ?? 1;
    out[d] = techMult * artifactMult * comprehensionMult * bonusMult * daoInsight;
  }
  return out;
}

/** Effective penetration of the resistance side (0..0.5, [DERIVED]). */
export function effectivePenetration(technique: TechniqueInteractionProfile | null | undefined): number {
  const p = technique?.penetration ?? 0;
  const clamped = Math.max(0, Math.min(1, p));
  return clamped * 0.5;
}
