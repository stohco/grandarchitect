/**
 * ga:combat-arts — Combat Arts: Divine Sense, Flying Swords, Body Cultivation,
 * Stance Framework, Technique Interaction Profiles, Artifacts, Status Effects
 *
 * EXTENDS ga:combat (do not rewrite it). All functions are pure and
 * deterministic. No Math.random, no Date.now, no wall-clock time.
 *
 * Canon grounding:
 * - Doc 32 §1.2 envelope table: concurrent-targets column → blade counts;
 *   qi reservoir scaling → divine-sense pool capacity; exponential 2x per
 *   realm → body mass multiplier.
 * - Doc 13 §3 (commitment model, no-cancel rule), §1.4 (Recovery abort =
 *   deliberate re-stance) → stance-shift legality and phantom-clone semantics.
 * - Doc 13 §2.3 (tempo economy) and §5.2 (attention) → per-action costs.
 * - Doc 16 (crafts) realm gating (Appendix A) → artifact minRealm unlock.
 * - Doc 32 §4.1 injury table (qi depletion = spell-lock) → status effects.
 *
 * TechniqueInteractionProfile: this module defines its own copy of the
 * profile shape (the law-solver plugin's copy lives in src/engine/laws/**,
 * owned by another agent). Future merge: reconcile the two shapes under a
 * single shared type once both sides land.
 */

import type { Plugin, PluginHost } from '../../kernel/plugin-host';
import type { EntityId, SimulationTier } from '../../kernel/types';
import { seedFromBigInt, nextUint32, type XoshiroState } from '../../../lib/determinism/rng';
import {
  clamp,
  ACTION_DEFS,
  type ActionType,
  type CombatInput,
  type CombatantState,
  type Realm,
} from './ga-combat';

// ============================================================================
// Deterministic primitives (§g — no Math.random anywhere)
// ============================================================================

const MASK64 = (1n << 64n) - 1n;

export type Vec3 = [number, number, number];

export function vAdd(a: Vec3, b: Vec3): Vec3 {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
}

export function vSub(a: Vec3, b: Vec3): Vec3 {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

export function vScale(a: Vec3, s: number): Vec3 {
  return [a[0] * s, a[1] * s, a[2] * s];
}

export function vLen(a: Vec3): number {
  return Math.sqrt(a[0] * a[0] + a[1] * a[1] + a[2] * a[2]);
}

export function vDist(a: Vec3, b: Vec3): number {
  return vLen(vSub(a, b));
}

export function vNormalize(a: Vec3): Vec3 {
  const l = vLen(a);
  if (l <= 0) return [0, 0, 0];
  return [a[0] / l, a[1] / l, a[2] / l];
}

export function vLerp(a: Vec3, b: Vec3, t: number): Vec3 {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

/** FNV-1a 64-bit string hash — deterministic across platforms. */
export function hashString64(s: string): bigint {
  let h = 0xCBF29CE484222325n;
  for (let i = 0; i < s.length; i++) {
    h ^= BigInt(s.charCodeAt(i));
    h = (h * 0x100000001B3n) & MASK64;
  }
  return h;
}

/** 64-bit mix of three integer components — deterministic. */
export function mix64(a: bigint, b: bigint, c: bigint): bigint {
  let h = (a ^ ((b * 0x9E3779B97F4A7C15n) & MASK64) ^ ((c * 0xBF58476D1CE4E5B9n) & MASK64)) & MASK64;
  h = ((h ^ (h >> 33n)) & MASK64);
  h = ((h * 0x94D049BB133111EBn) & MASK64);
  h = ((h ^ (h >> 33n)) & MASK64);
  return h;
}

// ============================================================================
// Realm ladder (§1 — shared with ga-combat)
// ============================================================================

export const REALM_LADDER: Realm[] = [
  'mortal', 'qi_induction', 'qi_condensation', 'foundation_establishment',
  'core_formation', 'nascent_soul', 'spirit_severance',
  'void_amalgamation', 'tribulation_crossing', 'mahayana',
];

export const REALM_INDEX: Record<Realm, number> = {
  mortal: 0, qi_induction: 1, qi_condensation: 2, foundation_establishment: 3,
  core_formation: 4, nascent_soul: 5, spirit_severance: 6,
  void_amalgamation: 7, tribulation_crossing: 8, mahayana: 9,
};

// ============================================================================
// Divine Sense Pool (§a — bandwidth/tracking engine, pool = ammo)
// ============================================================================

export type TrackingMode = 'telekinetic-weave' | 'conceptual-lock';
export type OverloadState = 'none' | 'overloaded';

/** Pool capacity per realm (doc 32 §1.2 reservoir scaling ~5×/station). */
export const DIVINE_SENSE_CAPACITY: Record<Realm, number> = {
  mortal: 0, qi_induction: 0, qi_condensation: 100, foundation_establishment: 250,
  core_formation: 1000, nascent_soul: 5000, spirit_severance: 20000,
  void_amalgamation: 80000, tribulation_crossing: 320000, mahayana: 1280000,
};

/** Fraction of capacity regenerated per frame (full refill ≈ 2500 frames ≈ 41.6 s). */
export const DIVINE_SENSE_REGEN_FRACTION = 0.0004;

/** Pool consumed per tracked target per frame (tracking = ammo drain). */
export const DIVINE_SENSE_CONSUMPTION_PER_TARGET = 0.25;

/** Fraction of capacity consumed to activate tracking on one target. */
export const DIVINE_SENSE_ACTIVATION_FRACTION = 0.05;

/** Frames of overload after pool exhaustion or soul-attack. */
export const DIVINE_SENSE_OVERLOAD_FRAMES = 240;

/** telekinetic-weave unlocks at Foundation Establishment (2nd step). */
export const TELEKINETIC_MIN_REALM_INDEX = 3;

/** conceptual-lock unlocks at Spirit Severance (3rd step). */
export const CONCEPTUAL_LOCK_MIN_REALM_INDEX = 6;

export interface DivineSensePool {
  capacity: number;
  current: number;
  regenerationPerFrame: number;
  activeConsumptionPerTarget: number;
  activationCostFraction: number;
  trackingMode: TrackingMode | null;
  trackedTargets: number;
  overloadState: OverloadState;
  overloadFrames: number;
}

export function createDivineSensePool(realm: Realm): DivineSensePool {
  const capacity = DIVINE_SENSE_CAPACITY[realm];
  return {
    capacity,
    current: capacity,
    regenerationPerFrame: capacity * DIVINE_SENSE_REGEN_FRACTION,
    activeConsumptionPerTarget: DIVINE_SENSE_CONSUMPTION_PER_TARGET,
    activationCostFraction: DIVINE_SENSE_ACTIVATION_FRACTION,
    trackingMode: null,
    trackedTargets: 0,
    overloadState: 'none',
    overloadFrames: 0,
  };
}

export interface TrackingActivation {
  pool: DivineSensePool;
  ok: boolean;
  reason: 'realm-gated' | 'insufficient-pool' | 'released' | 'ok';
}

/**
 * Activate a tracking mode over `targets` targets. Costs activation
 * fraction × capacity × targets from the pool. Mode is realm-gated:
 * telekinetic-weave at Foundation Establishment+, conceptual-lock at
 * Spirit Severance+ (conceptual lock-on bypasses line of sight).
 */
export function activateTracking(pool: DivineSensePool, mode: TrackingMode | null, targets: number, realm: Realm): TrackingActivation {
  if (mode === null) {
    return { pool: { ...pool, trackingMode: null, trackedTargets: 0 }, ok: true, reason: 'released' };
  }
  if (pool.overloadState === 'overloaded') {
    return { pool, ok: false, reason: 'insufficient-pool' };
  }
  const realmIndex = REALM_INDEX[realm];
  const minIndex = mode === 'conceptual-lock' ? CONCEPTUAL_LOCK_MIN_REALM_INDEX : TELEKINETIC_MIN_REALM_INDEX;
  if (realmIndex < minIndex) {
    return { pool, ok: false, reason: 'realm-gated' };
  }
  const cost = pool.capacity * pool.activationCostFraction * targets;
  if (pool.current < cost) {
    return { pool, ok: false, reason: 'insufficient-pool' };
  }
  return {
    pool: { ...pool, current: pool.current - cost, trackingMode: mode, trackedTargets: targets },
    ok: true,
    reason: 'ok',
  };
}

/**
 * Advance the pool by `frames`. Active tracking drains
 * consumptionPerTarget × targets × frames; regen restores
 * regenerationPerFrame × frames. Exhaustion → overload.
 */
export function stepDivineSensePool(pool: DivineSensePool, targets: number, frames: number): DivineSensePool {
  if (pool.overloadState === 'overloaded') {
    const remaining = pool.overloadFrames - frames;
    if (remaining <= 0) {
      return { ...pool, overloadState: 'none', overloadFrames: 0, current: 0 };
    }
    return { ...pool, overloadFrames: remaining };
  }
  const drained = pool.activeConsumptionPerTarget * targets * frames;
  const regenerated = pool.regenerationPerFrame * frames;
  const next = pool.current - drained + regenerated;
  if (next < 0) {
    return {
      ...pool, current: 0,
      overloadState: 'overloaded', overloadFrames: DIVINE_SENSE_OVERLOAD_FRAMES,
    };
  }
  return { ...pool, current: Math.min(pool.capacity, next) };
}

export interface SoulAttackResult {
  pool: DivineSensePool;
  mentalOverload: boolean;
}

/**
 * A soul attack slams the divine sense directly. Severity 0..1;
 * strain = severity × 100; strain ≥ 100 → mental overload (all blades crash).
 */
export function applySoulAttack(pool: DivineSensePool, severity: number): SoulAttackResult {
  const clampedSeverity = clamp(severity, 0, 1);
  const strain = clampedSeverity * 100;
  if (strain >= 100) {
    return {
      pool: { ...pool, current: 0, overloadState: 'overloaded', overloadFrames: DIVINE_SENSE_OVERLOAD_FRAMES },
      mentalOverload: true,
    };
  }
  return { pool, mentalOverload: false };
}

// ============================================================================
// VectorCurve primitive (§g2 — deterministic bezier trajectories)
// ============================================================================

export interface VectorCurve {
  p0: Vec3;
  p1: Vec3;
  p2: Vec3;
  t: number;
  speed: number;      // parameter units per frame along the chord p0→p2
}

export function createVectorCurve(p0: Vec3, p1: Vec3, p2: Vec3, speed: number): VectorCurve {
  return { p0, p1, p2, t: 0, speed };
}

/** Quadratic bezier evaluation — pure math, deterministic. */
export function evaluateQuadBezier(curve: VectorCurve, t: number): Vec3 {
  const u = 1 - t;
  const w0 = u * u;
  const w1 = 2 * u * t;
  const w2 = t * t;
  return [
    w0 * curve.p0[0] + w1 * curve.p1[0] + w2 * curve.p2[0],
    w0 * curve.p0[1] + w1 * curve.p1[1] + w2 * curve.p2[1],
    w0 * curve.p0[2] + w1 * curve.p1[2] + w2 * curve.p2[2],
  ];
}

export interface CurveStepResult {
  curve: VectorCurve;
  position: Vec3;
  complete: boolean;
}

/**
 * Advance the curve parameter by speed/chord-length per frame
 * (deterministic arc-length approximation; chord = p0→p2).
 */
export function stepVectorCurve(curve: VectorCurve, frames: number): CurveStepResult {
  const chord = Math.max(vDist(curve.p0, curve.p2), 0.000001);
  let t = curve.t + (curve.speed / chord) * frames;
  let complete = false;
  if (t >= 1) {
    t = 1;
    complete = true;
  }
  return { curve: { ...curve, t }, position: evaluateQuadBezier(curve, t), complete };
}

// ============================================================================
// KarmicTether primitive (§g3 — target-tracking that cannot be lost)
// ============================================================================

export interface KarmicTether {
  ownerId: EntityId;
  targetId: EntityId;
  strength: number;          // 0..1 tracking pull; decays over time
  maxSnapDistance: number;   // distance at which the tether snaps the blade to target
  decayPerFrame: number;
}

export function createKarmicTether(
  ownerId: EntityId,
  targetId: EntityId,
  strength: number,
  maxSnapDistance: number,
  decayPerFrame: number,
): KarmicTether {
  return { ownerId, targetId, strength: clamp(strength, 0, 1), maxSnapDistance, decayPerFrame };
}

export interface TetherStepResult {
  tether: KarmicTether;
  snapped: boolean;
  snapDistance: number;
}

/**
 * A karmic tether always tracks its target (bypasses line of sight —
 * conceptual lock-on). When the gap closes to maxSnapDistance the tether
 * SNAPS: the blade is pulled to the target's position in one frame.
 */
export function stepKarmicTether(tether: KarmicTether, ownerPos: Vec3, targetPos: Vec3, frames: number): TetherStepResult {
  const d = vDist(ownerPos, targetPos);
  if (d <= tether.maxSnapDistance) {
    return { tether, snapped: true, snapDistance: d };
  }
  const decay = tether.decayPerFrame * frames;
  return {
    tether: { ...tether, strength: clamp(tether.strength - decay, 0, 1) },
    snapped: false,
    snapDistance: d,
  };
}

// ============================================================================
// Flying Sword Controller (§b — N blades, vector-curving, tether snapping)
// ============================================================================

/** Concurrent targets per realm (doc 32 §1.2 control column). */
export const BLADE_COUNT: Record<Realm, number> = {
  mortal: 0, qi_induction: 0, qi_condensation: 2, foundation_establishment: 4,
  core_formation: 8, nascent_soul: 16, spirit_severance: 32,
  void_amalgamation: 64, tribulation_crossing: 128, mahayana: 256,
};

export type BladePhase = 'sheathed' | 'weaving' | 'striking' | 'returning' | 'crashed';

export interface FlyingSwordState {
  bladeId: number;
  position: Vec3;
  velocity: Vec3;
  targetVector: Vec3;
  phase: BladePhase;
  curveStrength: number;          // vector-curving amount (0..1)
  karmicTether: KarmicTether | null;
}

export function createBlade(bladeId: number, position: Vec3 = [0, 0, 0]): FlyingSwordState {
  return {
    bladeId,
    position,
    velocity: [0, 0, 0],
    targetVector: [0, 0, 0],
    phase: 'sheathed',
    curveStrength: 0,
    karmicTether: null,
  };
}

/** Deploy up to N blades for a realm (N from the realm table). */
export function deployBlades(realm: Realm, count?: number): FlyingSwordState[] {
  const n = Math.min(BLADE_COUNT[realm], count ?? BLADE_COUNT[realm]);
  const blades: FlyingSwordState[] = [];
  for (let i = 0; i < n; i++) {
    blades.push(createBlade(i));
  }
  return blades;
}

/**
 * Vector-curving: bend the blade's velocity direction toward a new
 * targetVector by a curvature fraction (0 = straight, 1 = fully aligned).
 * Deterministic — same inputs, same output.
 */
export function applyVectorCurve(blade: FlyingSwordState, curvature: number, targetVector: Vec3): FlyingSwordState {
  const k = clamp(curvature, 0, 1);
  const speed = vLen(blade.velocity);
  if (speed <= 0) return { ...blade, curveStrength: k, targetVector };
  const velDir = vNormalize(blade.velocity);
  const tgtDir = vNormalize(targetVector);
  const blended = vNormalize(vLerp(velDir, tgtDir, k));
  return {
    ...blade,
    curveStrength: k,
    targetVector,
    velocity: vScale(blended, speed),
  };
}

export interface BladeStepResult {
  blade: FlyingSwordState;
  hit: boolean;
  hitDistance: number;
}

/**
 * Advance one blade by one frame.
 * - sheathed/crashed: no motion.
 * - weaving + tether: velocity is bent toward the target every frame
 *   (karmic tether always tracks); snap when close enough → 'striking'.
 * - weaving (no tether): ballistic motion (position += velocity).
 * - returning: decelerating ballistic flight back to the owner.
 */
export function stepBlade(blade: FlyingSwordState, targetPos: Vec3 | null, _frame: number): BladeStepResult {
  if (blade.phase === 'sheathed' || blade.phase === 'crashed') {
    return { blade, hit: false, hitDistance: 0 };
  }
  if (blade.phase === 'striking') {
    return { blade, hit: false, hitDistance: 0 };
  }
  if (blade.phase === 'returning') {
    return {
      blade: {
        ...blade,
        position: vAdd(blade.position, blade.velocity),
        velocity: vScale(blade.velocity, 0.98),
      },
      hit: false,
      hitDistance: 0,
    };
  }
  // weaving
  if (targetPos && blade.karmicTether) {
    const dir = vNormalize(vSub(targetPos, blade.position));
    const velDir = vNormalize(blade.velocity);
    const speed = vLen(blade.velocity);
    const pull = blade.karmicTether.strength;
    const blended = vNormalize(vLerp(velDir, dir, pull));
    const velocity = speed > 0 ? vScale(blended, speed) : vScale(dir, 1);
    const position = vAdd(blade.position, velocity);
    const d = vDist(position, targetPos);
    if (d <= blade.karmicTether.maxSnapDistance) {
      return { blade: { ...blade, position, velocity, phase: 'striking' }, hit: true, hitDistance: d };
    }
    return { blade: { ...blade, position, velocity }, hit: false, hitDistance: 0 };
  }
  return {
    blade: { ...blade, position: vAdd(blade.position, blade.velocity) },
    hit: false,
    hitDistance: 0,
  };
}

/** Attach a karmic tether to a blade and unsheathe it for weaving. */
export function snapKarmicTether(blade: FlyingSwordState, tether: KarmicTether): FlyingSwordState {
  return { ...blade, karmicTether: tether, phase: 'weaving' };
}

/** Mental overload: every deployed blade crashes to zero velocity. */
export function crashBlades(blades: FlyingSwordState[]): FlyingSwordState[] {
  return blades.map(b => b.phase === 'crashed'
    ? b
    : { ...b, velocity: [0, 0, 0], phase: 'crashed', karmicTether: null });
}

// ============================================================================
// Body Cultivation (§c — hyper-armor + impact weight)
// ============================================================================

/** Mass multiplier per realm (exponential 2× per step, doc 32). */
export const BODY_MASS_MULTIPLIER: Record<Realm, number> = {
  mortal: 1, qi_induction: 1, qi_condensation: 2, foundation_establishment: 4,
  core_formation: 8, nascent_soul: 16, spirit_severance: 32,
  void_amalgamation: 64, tribulation_crossing: 128, mahayana: 256,
};

/** Shockwave radius in meters (Earth-Press Slam: 5 m at Qi Condensation). */
export const SHOCKWAVE_RADIUS: Record<Realm, number> = {
  mortal: 0, qi_induction: 0, qi_condensation: 5, foundation_establishment: 8,
  core_formation: 12, nascent_soul: 20, spirit_severance: 40,
  void_amalgamation: 80, tribulation_crossing: 160, mahayana: 320,
};

export const SHOCKWAVE_FALLOFF = 2;
export const SHOCKWAVE_STAGGER_FRAMES = 30;

export const LIFE_ESSENCE_IGNITION_DEFAULT_FRAMES = 120;
export const LIFE_ESSENCE_COMBUSTION_MIN_HEALTH = 0.01;

export interface BodyCultivation {
  realm: Realm;
  massMultiplier: number;
  shockwaveRadius: number;
  shockwaveFalloff: number;
  shockwaveStaggerFrames: number;
  lifeEssence: number;           // 0..1 health-like pool for combustion
  combustionActive: boolean;
  combustionFramesLeft: number;
  statusImmunity: boolean;       // brief status immunity while combusting
}

export function createBodyCultivation(realm: Realm): BodyCultivation {
  return {
    realm,
    massMultiplier: BODY_MASS_MULTIPLIER[realm],
    shockwaveRadius: SHOCKWAVE_RADIUS[realm],
    shockwaveFalloff: SHOCKWAVE_FALLOFF,
    shockwaveStaggerFrames: SHOCKWAVE_STAGGER_FRAMES,
    lifeEssence: 1,
    combustionActive: false,
    combustionFramesLeft: 0,
    statusImmunity: false,
  };
}

/** Impact weight = mass × speed — the currency of hyper-armor. */
export function computeImpactWeight(body: BodyCultivation, speed: number): number {
  return body.massMultiplier * speed;
}

export interface DashResult {
  passed: boolean;
  momentumLoss: number;
}

/** Dash through a structure: pass if impact weight exceeds resistance. */
export function dashThroughStructure(body: BodyCultivation, impactWeight: number, structureResistance: number): DashResult {
  if (impactWeight > structureResistance) {
    return { passed: true, momentumLoss: structureResistance / Math.max(body.massMultiplier, 1) };
  }
  return { passed: false, momentumLoss: 0 };
}

export interface ShockwaveTarget {
  id: EntityId;
  position: Vec3;
}

export interface ShockwaveResult {
  targetId: EntityId;
  distance: number;
  damage: number;
  staggerFrames: number;
}

/**
 * Shockwave cone: damage at distance d = base × (1 - d/radius)^falloff,
 * stagger = staggerFrames × magnitude. Deterministic.
 */
export function triggerShockwave(
  body: BodyCultivation,
  center: Vec3,
  baseDamage: number,
  targets: ShockwaveTarget[],
): ShockwaveResult[] {
  const results: ShockwaveResult[] = [];
  for (const t of targets) {
    const d = vDist(center, t.position);
    if (d <= body.shockwaveRadius) {
      const frac = 1 - d / body.shockwaveRadius;
      const magnitude = Math.pow(Math.max(frac, 0), body.shockwaveFalloff);
      results.push({
        targetId: t.id,
        distance: d,
        damage: baseDamage * magnitude,
        staggerFrames: Math.round(body.shockwaveStaggerFrames * magnitude),
      });
    }
  }
  return results;
}

export interface IgnitionResult {
  body: BodyCultivation;
  ignited: boolean;
  healthCost: number;
}

/**
 * Life-essence combustion: pay health for activation. The health cost
 * equals the stated cost exactly; while combusting the cultivator is
 * briefly immune to status effects.
 */
export function igniteLifeEssence(body: BodyCultivation, healthCost: number, frames?: number): IgnitionResult {
  const cost = clamp(healthCost, 0, 1);
  if (cost <= 0 || body.lifeEssence < cost) {
    return { body, ignited: false, healthCost: 0 };
  }
  return {
    body: {
      ...body,
      lifeEssence: body.lifeEssence - cost,
      combustionActive: true,
      combustionFramesLeft: frames ?? LIFE_ESSENCE_IGNITION_DEFAULT_FRAMES,
      statusImmunity: true,
    },
    ignited: true,
    healthCost: cost,
  };
}

export function stepBodyCultivation(body: BodyCultivation, frames: number): BodyCultivation {
  if (!body.combustionActive) return body;
  const remaining = body.combustionFramesLeft - frames;
  if (remaining <= 0) {
    return { ...body, combustionActive: false, combustionFramesLeft: 0, statusImmunity: false };
  }
  return { ...body, combustionFramesLeft: remaining };
}

// ============================================================================
// Stance Framework (§d — modifier key switches face-button meaning)
// ============================================================================

export type StanceId = 'heavenly-dao' | 'asura-battlefield';
export type FaceButtonId = 'north' | 'east' | 'south' | 'west';
export type StanceCastClass = 'spell' | 'array' | 'weapon' | 'movement' | 'utility';

export interface StanceAction {
  actionId: string;
  stance: StanceId;
  faceButton: FaceButtonId;
  castClass: StanceCastClass;
  gaCombatInput: CombatInput;
  qiCost: number;
  attentionCost: number;
  divineSenseCost: number;
  /** Whether a stance shift may cancel this action's recovery with a phantom clone. */
  cancelable: boolean;
}

/** Stance A (heavenly-dao): spell/array stance. Stance B (asura-battlefield): close-combat/weapon stance. */
export const STANCE_ACTION_SET: Record<StanceId, Record<FaceButtonId, StanceAction>> = {
  'heavenly-dao': {
    north: { actionId: 'dao-palm', stance: 'heavenly-dao', faceButton: 'north', castClass: 'spell', gaCombatInput: 'attack_medium', qiCost: 0.05, attentionCost: 3, divineSenseCost: 0, cancelable: true },
    east: { actionId: 'soul-thread', stance: 'heavenly-dao', faceButton: 'east', castClass: 'spell', gaCombatInput: 'attack_fast', qiCost: 0.02, attentionCost: 2, divineSenseCost: 0, cancelable: true },
    south: { actionId: 'formation-array', stance: 'heavenly-dao', faceButton: 'south', castClass: 'array', gaCombatInput: 'burst_area', qiCost: 0.30, attentionCost: 8, divineSenseCost: 2, cancelable: false },
    west: { actionId: 'ward-formation', stance: 'heavenly-dao', faceButton: 'west', castClass: 'array', gaCombatInput: 'defend', qiCost: 0.01, attentionCost: 1, divineSenseCost: 1, cancelable: true },
  },
  'asura-battlefield': {
    north: { actionId: 'iron-fist', stance: 'asura-battlefield', faceButton: 'north', castClass: 'weapon', gaCombatInput: 'attack_fast', qiCost: 0, attentionCost: 2, divineSenseCost: 0, cancelable: false },
    east: { actionId: 'crushing-palm', stance: 'asura-battlefield', faceButton: 'east', castClass: 'weapon', gaCombatInput: 'attack_heavy', qiCost: 0.02, attentionCost: 5, divineSenseCost: 0, cancelable: false },
    south: { actionId: 'shockwave-slam', stance: 'asura-battlefield', faceButton: 'south', castClass: 'weapon', gaCombatInput: 'burst_area', qiCost: 0.10, attentionCost: 8, divineSenseCost: 0, cancelable: false },
    west: { actionId: 'river-eel-dodge', stance: 'asura-battlefield', faceButton: 'west', castClass: 'movement', gaCombatInput: 'dodge', qiCost: 0.03, attentionCost: 3, divineSenseCost: 0, cancelable: true },
  },
};

export const STANCE_IDS: StanceId[] = ['heavenly-dao', 'asura-battlefield'];
export const FACE_BUTTONS: FaceButtonId[] = ['north', 'east', 'south', 'west'];

/** Shift lock: minimum frames between stance shifts (anti-spam, no menus). */
export const IDLE_SHIFT_LOCK_FRAMES = 8;
/** Shifting from Recovery costs more (restance penalty — doc 13 §1.4 abort). */
export const RECOVERY_SHIFT_LOCK_FRAMES = 30;
/** Cannot return to the previous stance within this window (stance-dance cancel rule). */
export const STANCE_DANCE_RETURN_LOCK_FRAMES = 60;

export type ShiftResult =
  | 'shifted' | 'shifted-with-phantom' | 'noop'
  | 'locked' | 'dance-denied' | 'committed' | 'stunned' | 'yielded';

export interface PhantomClone {
  originStance: StanceId;
  actionId: string;
  remainingFrames: number;
  spawnedAtFrame: number;
  dealsDamage: boolean;
}

export interface StanceState {
  activeStance: StanceId;
  previousStance: StanceId | null;
  lastShiftFrame: number;
  shiftLockExpiresAt: number;
  lastAction: StanceAction | null;
  phantomClones: PhantomClone[];
}

export function createStanceState(initialStance: StanceId = 'heavenly-dao'): StanceState {
  return {
    activeStance: initialStance,
    previousStance: null,
    lastShiftFrame: -Infinity,
    shiftLockExpiresAt: -Infinity,
    lastAction: null,
    phantomClones: [],
  };
}

export function mapFaceButton(state: StanceState, button: FaceButtonId, stance?: StanceId): StanceAction {
  const s = stance ?? state.activeStance;
  return STANCE_ACTION_SET[s][button];
}

/** The ga-combat input a face-button produces in the current stance. */
export function combatInputForButton(state: StanceState, button: FaceButtonId): CombatInput {
  return mapFaceButton(state, button).gaCombatInput;
}

export interface StanceShiftOutcome {
  state: StanceState;
  phantom: PhantomClone | null;
  result: ShiftResult;
}

/**
 * Stance shift with cancel semantics.
 *
 * The ga-combat commitment model (doc 13 §3.1) forbids cancels out of
 * Committed/Active — those shifts are DENIED ('committed'). Shifting from
 * Idle is free. Shifting from Recovery is the documented abort point
 * (doc 13 §1.4 — a deliberate re-stance): the remaining recovery frames
 * continue as a PHANTOM CLONE of the previous stance while the body
 * re-stances. Stance-dance cancelling is prevented by shift locks and a
 * return lock to the previous stance.
 */
export function shiftStance(
  state: StanceState,
  newStance: StanceId,
  combatState: CombatantState,
  frame: number,
): StanceShiftOutcome {
  if (newStance === state.activeStance) {
    return { state, phantom: null, result: 'noop' };
  }
  if (frame < state.shiftLockExpiresAt) {
    return { state, phantom: null, result: 'locked' };
  }
  if (newStance === state.previousStance && frame - state.lastShiftFrame < STANCE_DANCE_RETURN_LOCK_FRAMES) {
    return { state, phantom: null, result: 'dance-denied' };
  }
  switch (combatState.state) {
    case 'Committed':
    case 'Active':
      return { state, phantom: null, result: 'committed' };
    case 'Staggered':
    case 'Downed':
      return { state, phantom: null, result: 'stunned' };
    case 'Yielded':
    case 'Dead':
      return { state, phantom: null, result: 'yielded' };
    case 'Idle': {
      const lock = frame + IDLE_SHIFT_LOCK_FRAMES;
      return {
        state: {
          ...state,
          activeStance: newStance,
          previousStance: state.activeStance,
          lastShiftFrame: frame,
          shiftLockExpiresAt: lock,
        },
        phantom: null,
        result: 'shifted',
      };
    }
    case 'Recovery': {
      const remaining = Math.max(0, combatState.stateFrameTarget - combatState.stateFrameCount);
      const last = state.lastAction;
      let phantom: PhantomClone | null = null;
      if (last && last.cancelable) {
        phantom = {
          originStance: state.activeStance,
          actionId: last.actionId,
          remainingFrames: remaining,
          spawnedAtFrame: frame,
          dealsDamage: false,
        };
      }
      return {
        state: {
          ...state,
          activeStance: newStance,
          previousStance: state.activeStance,
          lastShiftFrame: frame,
          shiftLockExpiresAt: frame + RECOVERY_SHIFT_LOCK_FRAMES,
          phantomClones: phantom ? [...state.phantomClones, phantom] : state.phantomClones,
        },
        phantom,
        result: phantom ? 'shifted-with-phantom' : 'shifted',
      };
    }
  }
}

export function updateStanceTimers(state: StanceState, frame: number): StanceState {
  return {
    ...state,
    phantomClones: state.phantomClones.filter(p => p.spawnedAtFrame + p.remainingFrames >= frame),
  };
}

// ============================================================================
// Technique Interaction Profiles (§e — the design-brief packet)
// ============================================================================

export type TerrainInteraction = 'none' | 'crush' | 'sunder' | 'reshape';

export interface TechniqueInteractionProfile {
  techniqueId: string;
  physicalForce: number;
  penetration: number;
  qiPressure: number;
  spatialAuthority: number;
  soulAuthority: number;
  affectedRadius: number;
  terrainInteraction: TerrainInteraction;
  materialRecovery: number;
}

export function createTechniqueProfile(overrides: Partial<TechniqueInteractionProfile> & { techniqueId: string }): TechniqueInteractionProfile {
  return {
    physicalForce: overrides.physicalForce ?? 0,
    penetration: overrides.penetration ?? 0,
    qiPressure: overrides.qiPressure ?? 0,
    spatialAuthority: overrides.spatialAuthority ?? 0,
    soulAuthority: overrides.soulAuthority ?? 0,
    affectedRadius: overrides.affectedRadius ?? 1,
    terrainInteraction: overrides.terrainInteraction ?? 'none',
    materialRecovery: overrides.materialRecovery ?? 0,
    ...overrides,
  };
}

export interface ArtifactModifiers {
  physicalForce?: number;
  penetration?: number;
  qiPressure?: number;
  spatialAuthority?: number;
  soulAuthority?: number;
  affectedRadius?: number;
  terrainInteraction?: TerrainInteraction;
  materialRecovery?: number;
}

/**
 * Combine a technique profile with artifact modifiers (clamped 0..1
 * per channel). Deterministic.
 */
export function combineProfileWithArtifact(profile: TechniqueInteractionProfile, modifiers: ArtifactModifiers): TechniqueInteractionProfile {
  return {
    techniqueId: profile.techniqueId,
    physicalForce: clamp(profile.physicalForce + (modifiers.physicalForce ?? 0), 0, 1),
    penetration: clamp(profile.penetration + (modifiers.penetration ?? 0), 0, 1),
    qiPressure: clamp(profile.qiPressure + (modifiers.qiPressure ?? 0), 0, 1),
    spatialAuthority: clamp(profile.spatialAuthority + (modifiers.spatialAuthority ?? 0), 0, 1),
    soulAuthority: clamp(profile.soulAuthority + (modifiers.soulAuthority ?? 0), 0, 1),
    affectedRadius: Math.max(0, profile.affectedRadius + (modifiers.affectedRadius ?? 0)),
    terrainInteraction: modifiers.terrainInteraction ?? profile.terrainInteraction,
    materialRecovery: clamp(profile.materialRecovery + (modifiers.materialRecovery ?? 0), 0, 1),
  };
}

// ============================================================================
// Artifacts (§e2 — slots, minRealm gating, qi scaling, blood-refining)
// ============================================================================

export type ArtifactSlot = 'attack' | 'defensive' | 'conceptual';

export interface ArtifactFunction {
  functionId: string;
  minRealm: Realm;
  qiCost: number;
  profile: TechniqueInteractionProfile;
}

export interface ArtifactState {
  artifactId: string;
  name: string;
  slot: ArtifactSlot;
  minRealm: Realm;
  /** Per-realm-step multiplier on qi cost above minRealm. */
  qiConsumptionScale: number;
  /** Health cost (0..1) paid when activated with insufficient qi. */
  bloodRefiningOverDraft: number;
  modifiers: ArtifactModifiers;
  functions: ArtifactFunction[];
}

export type ArtifactUnlockState = 'bludgeon-only' | 'unlocked';

/** Below minRealm the artifact is a blunt instrument — no functions. */
export const BLUDGEON_DAMAGE = 0.05;

export function getArtifactUnlock(artifact: ArtifactState, realm: Realm): ArtifactUnlockState {
  return REALM_INDEX[realm] >= REALM_INDEX[artifact.minRealm] ? 'unlocked' : 'bludgeon-only';
}

export function bludgeonStrike(): { damage: number } {
  return { damage: BLUDGEON_DAMAGE };
}

export interface ArtifactUseResult {
  ok: boolean;
  qiCost: number;
  healthCost: number;
  reason: 'ok' | 'bludgeon-only' | 'insufficient-qi';
}

/**
 * Activate an artifact function.
 * - Below minRealm → 'bludgeon-only' (use the artifact as a club).
 * - qi cost scales: base × (1 + scale × realmStepsAboveMin).
 * - Insufficient qi + blood-refining enabled → forced activation:
 *   spend ALL remaining qi, pay the stated over-draft in health.
 */
export function activateArtifactFunction(
  artifact: ArtifactState,
  fn: ArtifactFunction,
  realm: Realm,
  qiReservoir: number,
): ArtifactUseResult {
  const unlock = getArtifactUnlock(artifact, realm);
  if (unlock === 'bludgeon-only') {
    return { ok: false, qiCost: 0, healthCost: 0, reason: 'bludgeon-only' };
  }
  const stepsAboveMin = Math.max(0, REALM_INDEX[realm] - REALM_INDEX[artifact.minRealm]);
  const qiCost = fn.qiCost * (1 + artifact.qiConsumptionScale * stepsAboveMin);
  if (qiReservoir >= qiCost) {
    return { ok: true, qiCost, healthCost: 0, reason: 'ok' };
  }
  if (artifact.bloodRefiningOverDraft > 0) {
    return { ok: true, qiCost: qiReservoir, healthCost: artifact.bloodRefiningOverDraft, reason: 'ok' };
  }
  return { ok: false, qiCost: 0, healthCost: 0, reason: 'insufficient-qi' };
}

// ============================================================================
// Status Effects (§f — the five afflictions, mechanical)
// ============================================================================

export type StatusEffectId =
  | 'soul_freeze'           // slow
  | 'karmic_ignition'       // mirror-damage
  | 'dao_tribulation_stun'  // cast-break + stagger
  | 'dao_heart_corrosion'   // input scramble
  | 'qi_deviation';         // spell-lock

export interface StatusEffectState {
  effectId: StatusEffectId;
  magnitude: number;
  remainingFrames: number;
  appliedAtFrame: number;
  sourceId: EntityId;
}

export interface StatusEffectMechanic {
  kind: 'slow' | 'mirror' | 'cast-break-stagger' | 'input-scramble' | 'spell-lock';
  magnitudeCap: number;
  cleanseConditions: string[];
}

export const STATUS_EFFECT_MECHANICS: Record<StatusEffectId, StatusEffectMechanic> = {
  soul_freeze: { kind: 'slow', magnitudeCap: 1, cleanseConditions: ['fire_qi_vent', 'meditation'] },
  karmic_ignition: { kind: 'mirror', magnitudeCap: 1, cleanseConditions: ['karmic_purge', 'combat_end'] },
  dao_tribulation_stun: { kind: 'cast-break-stagger', magnitudeCap: 1, cleanseConditions: ['meditation', 'battle_end'] },
  dao_heart_corrosion: { kind: 'input-scramble', magnitudeCap: 1, cleanseConditions: ['heart_mind_stabilize'] },
  qi_deviation: { kind: 'spell-lock', magnitudeCap: 1, cleanseConditions: ['vent_qi', 'rest'] },
};

export const STATUS_EFFECT_IDS: StatusEffectId[] = [
  'soul_freeze', 'karmic_ignition', 'dao_tribulation_stun',
  'dao_heart_corrosion', 'qi_deviation',
];

/** soul_freeze slows by up to 60% at full magnitude. */
export const SOUL_FREEZE_SLOW_MAX = 0.6;
/** karmic_ignition mirrors up to 50% of damage back at full magnitude. */
export const KARMIC_MIRROR_MAX = 0.5;
/** dao_tribulation_stun: base 20 stagger frames + 20 × magnitude. */
export const TRIBULATION_STAGGER_BASE = 20;
export const TRIBULATION_STAGGER_PER_MAG = 20;

export function applyStatusEffect(
  effects: StatusEffectState[],
  effectId: StatusEffectId,
  magnitude: number,
  frames: number,
  frame: number,
  sourceId: EntityId,
): StatusEffectState[] {
  const cappedMag = clamp(magnitude, 0, STATUS_EFFECT_MECHANICS[effectId].magnitudeCap);
  const existing = effects.find(e => e.effectId === effectId);
  if (existing) {
    return effects.map(e => e.effectId === effectId
      ? {
          ...e,
          magnitude: Math.max(e.magnitude, cappedMag),
          remainingFrames: Math.max(e.remainingFrames, frames),
        }
      : e);
  }
  return [...effects, { effectId, magnitude: cappedMag, remainingFrames: frames, appliedAtFrame: frame, sourceId }];
}

export function stepStatusEffects(effects: StatusEffectState[], frames: number): { effects: StatusEffectState[]; expired: StatusEffectId[] } {
  const expired: StatusEffectId[] = [];
  const remaining: StatusEffectState[] = [];
  for (const e of effects) {
    const left = e.remainingFrames - frames;
    if (left <= 0) {
      expired.push(e.effectId);
    } else {
      remaining.push({ ...e, remainingFrames: left });
    }
  }
  return { effects: remaining, expired };
}

/** Manual cleanse: remove the effect if the condition is lawful. */
export function cleanseStatusEffect(effects: StatusEffectState[], effectId: StatusEffectId, condition: string): StatusEffectState[] {
  const mechanic = STATUS_EFFECT_MECHANICS[effectId];
  if (!mechanic.cleanseConditions.includes(condition)) return effects;
  return effects.filter(e => e.effectId !== effectId);
}

export interface StatusEffectDeltas {
  movementSpeedMult: number;
  mirrorDamageFraction: number;
  castBroken: boolean;
  staggerFrames: number;
  inputScrambleActive: boolean;
  spellLocked: boolean;
}

export function computeStatusDeltas(effects: StatusEffectState[]): StatusEffectDeltas {
  const mag = (id: StatusEffectId) => {
    const e = effects.find(x => x.effectId === id);
    return e ? e.magnitude : 0;
  };
  const freezeMag = mag('soul_freeze');
  const mirrorMag = mag('karmic_ignition');
  const tribMag = mag('dao_tribulation_stun');
  return {
    movementSpeedMult: 1 - SOUL_FREEZE_SLOW_MAX * freezeMag,
    mirrorDamageFraction: KARMIC_MIRROR_MAX * mirrorMag,
    castBroken: tribMag > 0,
    staggerFrames: tribMag > 0 ? Math.round(TRIBULATION_STAGGER_BASE + TRIBULATION_STAGGER_PER_MAG * tribMag) : 0,
    inputScrambleActive: mag('dao_heart_corrosion') > 0,
    spellLocked: mag('qi_deviation') > 0,
  };
}

/** qi_deviation blocks every qi-bearing action (spell-lock). */
export function isSpellLocked(effects: StatusEffectState[]): boolean {
  return computeStatusDeltas(effects).spellLocked;
}

/**
 * Extend ga-combat's canAct: spell-lock denies any action with qiCost > 0
 * when qi_deviation is active.
 */
export function canActWithEffects(
  combatState: CombatantState,
  action: ActionType,
  effects: StatusEffectState[],
): boolean {
  const def = ACTION_DEFS[action];
  if (def.qiCost > 0 && isSpellLocked(effects)) return false;
  return true;
}

export interface CastBreakResult {
  broken: boolean;
  updatedState: CombatantState | null;
}

/**
 * dao_tribulation_stun: a qi-bearing cast in Committed/Active is BROKEN —
 * the combatant is forced to Staggered for 20 + 20×magnitude frames.
 */
export function breakCast(combatState: CombatantState, magnitude: number): CastBreakResult {
  if (combatState.state !== 'Committed' && combatState.state !== 'Active') {
    return { broken: false, updatedState: null };
  }
  const action = combatState.currentAction;
  if (!action) return { broken: false, updatedState: null };
  const def = ACTION_DEFS[action.actionType];
  if (def.qiCost <= 0) return { broken: false, updatedState: null };
  const stagger = Math.round(TRIBULATION_STAGGER_BASE + TRIBULATION_STAGGER_PER_MAG * clamp(magnitude, 0, 1));
  return {
    broken: true,
    updatedState: {
      ...combatState,
      state: 'Staggered',
      stateEnteredAtFrame: combatState.stateEnteredAtFrame,
      stateFrameCount: 0,
      stateFrameTarget: stagger,
      currentAction: null,
    },
  };
}

const SCRAMBLE_MAP: Record<CombatInput, CombatInput[]> = {
  attack_fast: ['attack_medium', 'defend', 'dodge'],
  attack_medium: ['defend', 'attack_heavy', 'read_residue'],
  attack_heavy: ['burst_area', 'attack_fast', 'defend'],
  defend: ['dodge', 'attack_fast', 'read_residue'],
  dodge: ['attack_fast', 'defend', 'attack_medium'],
  read_residue: ['dodge', 'attack_medium', 'defend'],
  route_hands: ['route_legs', 'route_skin', 'route_senses'],
  route_legs: ['route_skin', 'route_senses', 'route_hands'],
  route_skin: ['route_senses', 'route_hands', 'route_legs'],
  route_senses: ['route_hands', 'route_legs', 'route_skin'],
  yield: ['defend', 'dodge', 'attack_fast'],
  burst_area: ['attack_heavy', 'read_residue', 'dodge'],
};

/**
 * dao_heart_corrosion: input scramble. Deterministic — the remap is a pure
 * function of (seed, input, frame); same seed → same scramble.
 */
export function resolveScrambledInput(effect: StatusEffectState, input: CombatInput, frame: number, seed: bigint): CombatInput {
  const candidates = SCRAMBLE_MAP[input];
  if (!candidates || candidates.length === 0) return input;
  const h = mix64(seed, hashString64(input), BigInt(effect.appliedAtFrame * 7919 + frame));
  const state: XoshiroState = seedFromBigInt(h);
  const idx = nextUint32(state) % candidates.length;
  return candidates[idx];
}

// ============================================================================
// Combat Arts State + API (§h)
// ============================================================================

export interface CombatArtsState {
  combatantId: EntityId;
  realm: Realm;
  divineSense: DivineSensePool;
  blades: FlyingSwordState[];
  body: BodyCultivation;
  stance: StanceState;
  effects: StatusEffectState[];
  artifacts: ArtifactState[];
  tier: SimulationTier;
}

export function createCombatArtsState(
  combatantId: EntityId,
  realm: Realm,
  tier: SimulationTier = 4,
): CombatArtsState {
  return {
    combatantId,
    realm,
    divineSense: createDivineSensePool(realm),
    blades: deployBlades(realm),
    body: createBodyCultivation(realm),
    stance: createStanceState(),
    effects: [],
    artifacts: [],
    tier,
  };
}

/**
 * One frame of arts simulation: divine sense pool (targets = blades
 * actively weaving), blades (ballistic; targeting is supplied by the
 * caller with real positions), body timers, status timers.
 */
export function stepArtsState(state: CombatArtsState, frame: number): CombatArtsState {
  const weaving = state.blades.filter(b => b.phase === 'weaving' || b.phase === 'striking').length;
  const divineSense = stepDivineSensePool(state.divineSense, weaving, 1);
  let blades = state.blades.map(b => stepBlade(b, null, frame).blade);
  if (divineSense.overloadState === 'overloaded' && state.divineSense.overloadState !== 'overloaded') {
    blades = crashBlades(blades);
  }
  const body = stepBodyCultivation(state.body, 1);
  const { effects } = stepStatusEffects(state.effects, 1);
  return { ...state, divineSense, blades, body, effects };
}

export interface CombatArtsStats {
  totalCultivators: number;
  totalBlades: number;
  totalOverloaded: number;
  totalStatusEffects: number;
  totalArtifacts: number;
}

export interface CombatArtsApi {
  register(state: CombatArtsState): boolean;
  get(combatantId: EntityId): CombatArtsState | undefined;
  remove(combatantId: EntityId): boolean;
  step(combatantId: EntityId, frame: number): CombatArtsState | undefined;
  setTier(combatantId: EntityId, tier: SimulationTier): boolean;
  getTier(combatantId: EntityId): SimulationTier;
  stats(): CombatArtsStats;
}

export function createCombatArtsApi(): CombatArtsApi {
  const states = new Map<string, CombatArtsState>();
  const tiers = new Map<string, SimulationTier>();

  function register(state: CombatArtsState): boolean {
    const key = String(state.combatantId);
    if (states.has(key)) return false;
    states.set(key, state);
    tiers.set(key, state.tier);
    return true;
  }

  function get(combatantId: EntityId): CombatArtsState | undefined {
    return states.get(String(combatantId));
  }

  function remove(combatantId: EntityId): boolean {
    tiers.delete(String(combatantId));
    return states.delete(String(combatantId));
  }

  function step(combatantId: EntityId, frame: number): CombatArtsState | undefined {
    const s = states.get(String(combatantId));
    if (!s) return undefined;
    const updated = stepArtsState(s, frame);
    states.set(String(combatantId), updated);
    return updated;
  }

  function setTier(combatantId: EntityId, tier: SimulationTier): boolean {
    if (!states.has(String(combatantId))) return false;
    tiers.set(String(combatantId), tier);
    states.set(String(combatantId), { ...states.get(String(combatantId))!, tier });
    return true;
  }

  function getTier(combatantId: EntityId): SimulationTier {
    return tiers.get(String(combatantId)) ?? 4;
  }

  function stats(): CombatArtsStats {
    let totalBlades = 0;
    let totalOverloaded = 0;
    let totalStatusEffects = 0;
    let totalArtifacts = 0;
    for (const s of states.values()) {
      totalBlades += s.blades.length;
      if (s.divineSense.overloadState === 'overloaded') totalOverloaded++;
      totalStatusEffects += s.effects.length;
      totalArtifacts += s.artifacts.length;
    }
    return {
      totalCultivators: states.size,
      totalBlades,
      totalOverloaded,
      totalStatusEffects,
      totalArtifacts,
    };
  }

  return { register, get, remove, step, setTier, getTier, stats };
}

// ============================================================================
// Plugin Definition (§i)
// ============================================================================

export function createCombatArtsPlugin(): Plugin {
  let api: CombatArtsApi | null = null;

  return {
    id: 'ga:combat-arts',
    version: '0.1.0',
    dependencies: ['ga:combat', 'ga:determinism'],

    init(host: PluginHost) {
      api = createCombatArtsApi();
      host.capabilities.register({
        capability: 'combat.divine-sense',
        provider: 'ga:combat-arts',
        version: '0.1.0',
        instance: api,
      });
      host.capabilities.register({
        capability: 'combat.flying-sword',
        provider: 'ga:combat-arts',
        version: '0.1.0',
        instance: api,
      });
      host.capabilities.register({
        capability: 'combat.body-cultivation',
        provider: 'ga:combat-arts',
        version: '0.1.0',
        instance: api,
      });
      host.capabilities.register({
        capability: 'combat.stance',
        provider: 'ga:combat-arts',
        version: '0.1.0',
        instance: api,
      });
      host.capabilities.register({
        capability: 'combat.technique-profiles',
        provider: 'ga:combat-arts',
        version: '0.1.0',
        instance: api,
      });
      host.capabilities.register({
        capability: 'combat.artifacts',
        provider: 'ga:combat-arts',
        version: '0.1.0',
        instance: api,
      });
      host.capabilities.register({
        capability: 'combat.status-effects',
        provider: 'ga:combat-arts',
        version: '0.1.0',
        instance: api,
      });
      host.setState('ga:combat-arts', api);
      console.log('[ga:combat-arts] Initialized — 7 capabilities registered');
    },

    destroy(host: PluginHost) {
      for (const cap of [
        'combat.divine-sense', 'combat.flying-sword', 'combat.body-cultivation',
        'combat.stance', 'combat.technique-profiles', 'combat.artifacts',
        'combat.status-effects',
      ]) {
        host.capabilities.unregister(cap, 'ga:combat-arts');
      }
      api = null;
      console.log('[ga:combat-arts] Destroyed');
    },
  };
}

// ============================================================================
// Convenience re-exports (type-only, so the extension reads as one surface)
// ============================================================================

export type { CombatInput, CombatantState, Realm, ActionType } from './ga-combat';
