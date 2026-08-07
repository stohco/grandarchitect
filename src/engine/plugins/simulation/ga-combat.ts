/**
 * ga:combat — Combat: Ability Execution
 *
 * Implements doc 32 (Combat: Ability Execution).
 * Combat state machine (8 terminals), production rules with frame costs,
 * tempo economy (8-frame input buffer), commitment model,
 * qi routing (4 regions × 5 phases = 20 combinations),
 * phase matchup multipliers (wuxing), residue reading,
 * 9-type injury model, per-realm death model, 5 combat scales,
 * and tier degradation (S4/S2/S0).
 *
 * Pure functions over typed state. No forbidden functions.
 * No Three.js, no DOM, no rendering.
 */

import type { Plugin, PluginHost } from '../../kernel/plugin-host';
import type { EntityId, Tick, SimulationTier } from '../../kernel/types';

// ============================================================================
// Combat State Machine (§1)
// ============================================================================

export type CombatState =
  | 'Idle' | 'Committed' | 'Active' | 'Recovery'
  | 'Staggered' | 'Downed' | 'Yielded' | 'Dead';

export type PhaseName = 'wood' | 'fire' | 'earth' | 'metal' | 'water';
export type RoutingRegion = 'hands' | 'legs' | 'skin' | 'senses';

export type CombatInput =
  | 'attack_fast' | 'attack_medium' | 'attack_heavy'
  | 'defend' | 'dodge' | 'read_residue'
  | 'route_hands' | 'route_legs' | 'route_skin' | 'route_senses'
  | 'yield' | 'burst_area';

// ============================================================================
// Input Buffer (§2 — 8-frame buffer, Smash Bros precedent)
// ============================================================================

export interface BufferedInput {
  input: CombatInput;
  bufferedAtFrame: number;
  consumedAtFrame: number | null;
}

export const INPUT_BUFFER_SIZE = 8;

export function createBufferedInput(input: CombatInput, frame: number): BufferedInput {
  return { input, bufferedAtFrame: frame, consumedAtFrame: null };
}

export function pushInput(buffer: BufferedInput[], input: CombatInput, frame: number): BufferedInput[] {
  const entry = createBufferedInput(input, frame);
  const filtered = buffer.filter(b => frame - b.bufferedAtFrame < INPUT_BUFFER_SIZE && b.consumedAtFrame === null);
  return [...filtered, entry];
}

export function consumeInput(buffer: BufferedInput[], frame: number): { input: CombatInput | null; remaining: BufferedInput[] } {
  const pending = buffer.filter(b => b.consumedAtFrame === null && frame - b.bufferedAtFrame < INPUT_BUFFER_SIZE);
  if (pending.length === 0) return { input: null, remaining: buffer };
  // Most recent wins
  const chosen = pending[pending.length - 1];
  const updated = buffer.map(b => b === chosen ? { ...b, consumedAtFrame: frame } : b);
  return { input: chosen.input, remaining: updated };
}

export function clearBuffer(buffer: BufferedInput[]): BufferedInput[] {
  return buffer.map(b => b.consumedAtFrame !== null ? b : { ...b, consumedAtFrame: -1 });
}

// ============================================================================
// Action Definitions (§1.1 — Frame Costs)
// ============================================================================

export type ActionType = 'attack_fast' | 'attack_medium' | 'attack_heavy' | 'defend' | 'dodge' | 'read_residue' | 'yield' | 'burst_area';

export interface ActionDef {
  type: ActionType;
  startupFrames: number;
  activeFrames: number;
  recoveryFrames: number;
  totalFrames: number;
  qiCost: number;           // reservoir cost
  attentionCost: number;    // attention budget cost
  damageBase: number;       // base damage magnitude (0..1 scale)
  isHoldable: boolean;      // defend is holdable
}

// Qi Condensation baseline frame costs (per doc 32 §1.1 table)
export const ACTION_DEFS: Record<ActionType, ActionDef> = {
  attack_fast:  { type: 'attack_fast',  startupFrames: 8,  activeFrames: 4,  recoveryFrames: 12, totalFrames: 24, qiCost: 0.02, attentionCost: 2, damageBase: 0.05, isHoldable: false },
  attack_medium: { type: 'attack_medium', startupFrames: 14, activeFrames: 6, recoveryFrames: 20, totalFrames: 40, qiCost: 0.05, attentionCost: 3, damageBase: 0.12, isHoldable: false },
  attack_heavy: { type: 'attack_heavy', startupFrames: 24, activeFrames: 8, recoveryFrames: 36, totalFrames: 68, qiCost: 0.10, attentionCost: 5, damageBase: 0.25, isHoldable: false },
  defend:       { type: 'defend',       startupFrames: 6,  activeFrames: 0,  recoveryFrames: 12, totalFrames: 18, qiCost: 0.01, attentionCost: 1, damageBase: 0,    isHoldable: true },
  dodge:        { type: 'dodge',        startupFrames: 10, activeFrames: 12, recoveryFrames: 14, totalFrames: 36, qiCost: 0.03, attentionCost: 3, damageBase: 0,    isHoldable: false },
  read_residue: { type: 'read_residue', startupFrames: 30, activeFrames: 0, recoveryFrames: 30, totalFrames: 60, qiCost: 0.02, attentionCost: 5, damageBase: 0,    isHoldable: false },
  yield:        { type: 'yield',        startupFrames: 1,  activeFrames: 0, recoveryFrames: 0,  totalFrames: 1,  qiCost: 0,    attentionCost: 0, damageBase: 0,    isHoldable: false },
  burst_area:   { type: 'burst_area',   startupFrames: 40, activeFrames: 8, recoveryFrames: 60, totalFrames: 108, qiCost: 0.30, attentionCost: 8, damageBase: 0.40, isHoldable: false },
};

// ============================================================================
// Qi Routing (§4 — 4 regions × 5 phases = 20 combinations)
// ============================================================================

export interface RoutingEffect {
  damage?: number;
  speed?: number;
  defense?: number;
  perception?: number;
  effect: string;
  phaseType: 'generation' | 'conquest' | 'neutral';
}

export const ROUTING_EFFECTS: Record<RoutingRegion, Record<PhaseName, RoutingEffect>> = {
  hands: {
    wood:   { damage: 1.0, effect: 'lifesteal_small',  phaseType: 'generation' },
    fire:   { damage: 1.5, effect: 'burn_dot',         phaseType: 'conquest' },
    earth:  { damage: 0.8, effect: 'knockback',        phaseType: 'neutral' },
    metal:  { damage: 1.8, effect: 'armor_pierce',     phaseType: 'conquest' },
    water:  { damage: 0.9, effect: 'slow_target',      phaseType: 'generation' },
  },
  legs: {
    wood:   { speed: 1.3, effect: 'root_break',        phaseType: 'generation' },
    fire:   { speed: 1.5, effect: 'trail_burn',        phaseType: 'conquest' },
    earth:  { speed: 0.9, effect: 'immovable',         phaseType: 'neutral' },
    metal:  { speed: 1.1, effect: 'cut_ground',        phaseType: 'conquest' },
    water:  { speed: 1.4, effect: 'flow_dodge',        phaseType: 'generation' },
  },
  skin: {
    wood:   { defense: 1.2, effect: 'regen_small',     phaseType: 'generation' },
    fire:   { defense: 0.8, effect: 'reflect_burn',    phaseType: 'conquest' },
    earth:  { defense: 1.8, effect: 'stone_skin',      phaseType: 'neutral' },
    metal:  { defense: 1.5, effect: 'blade_reflect',   phaseType: 'conquest' },
    water:  { defense: 1.0, effect: 'flow_redirect',   phaseType: 'generation' },
  },
  senses: {
    wood:   { perception: 1.5, effect: 'read_ecology',   phaseType: 'generation' },
    fire:   { perception: 1.3, effect: 'see_residue_hot', phaseType: 'conquest' },
    earth:  { perception: 1.0, effect: 'feel_vibration', phaseType: 'neutral' },
    metal:  { perception: 1.4, effect: 'detect_weapon',  phaseType: 'conquest' },
    water:  { perception: 1.6, effect: 'read_emotion',   phaseType: 'generation' },
  },
};

export const ROUTING_SWITCH_COST_MIN = 60;  // frames at Qi Condensation
export const ROUTING_SWITCH_COST_MAX = 120;

export interface QiRouting {
  region: RoutingRegion;
  phase: PhaseName;
  switchCost: number;
  reservoirDrain: number;
}

export function createQiRouting(region: RoutingRegion, phase: PhaseName): QiRouting {
  return {
    region,
    phase,
    switchCost: (ROUTING_SWITCH_COST_MIN + ROUTING_SWITCH_COST_MAX) / 2,
    reservoirDrain: 0.005,
  };
}

export function getRoutingEffect(routing: QiRouting): RoutingEffect {
  return ROUTING_EFFECTS[routing.region][routing.phase];
}

// ============================================================================
// Phase Matchup Multipliers (§5 — wuxing conquest/generation)
// ============================================================================

export interface PhaseMatchup {
  damageMult: number;
  effectMult: number;
  type: 'neutral' | 'conquest' | 'generation' | 'reverse_conquest';
  lifesteal?: number;
}

// Conquest cycle (相剋): wood→earth, earth→water, water→fire, fire→metal, metal→wood
// A conquers B means: A is at index+1 in the cycle, B is at the current index
const CONQUEST_CYCLE: PhaseName[] = ['wood', 'earth', 'water', 'fire', 'metal'];
// Generation cycle (相生): wood→fire, fire→earth, earth→metal, metal→water, water→wood
const GENERATION_CYCLE: PhaseName[] = ['wood', 'fire', 'earth', 'metal', 'water'];

export function conquers(a: PhaseName, d: PhaseName): boolean {
  // A conquers D if D comes after A in the conquest cycle
  const ai = CONQUEST_CYCLE.indexOf(a);
  const di = CONQUEST_CYCLE.indexOf(d);
  return di === (ai + 1) % 5;
}

export function generates(a: PhaseName, d: PhaseName): boolean {
  // A generates D if D comes after A in the generation cycle
  const ai = GENERATION_CYCLE.indexOf(a);
  const di = GENERATION_CYCLE.indexOf(d);
  return di === (ai + 1) % 5;
}

export function phaseMultiplier(attacker: PhaseName, defender: PhaseName): PhaseMatchup {
  if (attacker === defender) return { damageMult: 1.0, effectMult: 1.0, type: 'neutral' };
  if (conquers(attacker, defender)) return { damageMult: 1.5, effectMult: 1.5, type: 'conquest' };
  if (generates(attacker, defender)) return { damageMult: 0.5, effectMult: 0.5, type: 'generation', lifesteal: 0.5 };
  return { damageMult: 0.75, effectMult: 0.75, type: 'reverse_conquest' };
}

// ============================================================================
// Injury Model (§8 — 9 types)
// ============================================================================

export type InjuryType =
  | 'cut_superficial' | 'cut_deep' | 'cut_tendon' | 'fractured_bone'
  | 'meridian_inflammation' | 'organ_damage' | 'qi_depletion'
  | 'anchor_bruise' | 'core_crack';

export type InjuryLocation =
  | 'head' | 'torso' | 'left_arm' | 'right_arm' | 'left_leg' | 'right_leg'
  | 'meridian_central' | 'meridian_ancestral' | 'meridian_spirit'
  | 'organ_lung' | 'organ_liver' | 'organ_heart' | 'organ_kidney'
  | 'anchor' | 'core';

export interface InjuryEffect {
  type: string;
  magnitude: number;
}

export interface Injury {
  injuryId: string;
  injuryType: InjuryType;
  location: InjuryLocation;
  severity: number;        // 0..1
  onsetTick: number;
  onsetThreshold: number;
  recoveryTimeDays: number;
  recoveryTimeTreatedDays: number;
  effects: InjuryEffect[];
  resolved: boolean;
  resolvedAt: number | null;
}

// Injury onset thresholds (damage magnitude as 0..1 fraction of HP-equivalent)
export const INJURY_THRESHOLDS: Record<InjuryType, { threshold: number; recoveryDays: number; treatedDays: number; effects: InjuryEffect[] }> = {
  cut_superficial:      { threshold: 0.05, recoveryDays: 2,   treatedDays: 0, effects: [{ type: 'pain_small', magnitude: 0.05 }] },
  cut_deep:            { threshold: 0.15, recoveryDays: 60,  treatedDays: 10, effects: [{ type: 'pain_large', magnitude: 0.15 }, { type: 'bleeding', magnitude: 0.1 }] },
  cut_tendon:          { threshold: 0.10, recoveryDays: 135, treatedDays: 45, effects: [{ type: 'limb_function', magnitude: 0.75 }] },
  fractured_bone:      { threshold: 0.30, recoveryDays: 90,  treatedDays: 45, effects: [{ type: 'region_unusable', magnitude: 0.8 }] },
  meridian_inflammation: { threshold: 0.12, recoveryDays: 22, treatedDays: 10, effects: [{ type: 'routing_blocked', magnitude: 0.6 }] },
  organ_damage:        { threshold: 0.25, recoveryDays: 273, treatedDays: 120, effects: [{ type: 'systemic', magnitude: 0.4 }] },
  qi_depletion:        { threshold: 0.00, recoveryDays: 0,  treatedDays: 0, effects: [{ type: 'qi_verbs_blocked', magnitude: 1.0 }] },
  anchor_bruise:       { threshold: 0.35, recoveryDays: 45, treatedDays: 22, effects: [{ type: 'perception_unreliable', magnitude: 0.3 }] },
  core_crack:         { threshold: 0.80, recoveryDays: 1095, treatedDays: 365, effects: [{ type: 'catastrophic', magnitude: 0.9 }] },
};

// Injuries block transitions per doc 32 §8.3
export function injuryBlocksTransition(injuries: Injury[], transition: string): boolean {
  for (const inj of injuries) {
    if (inj.resolved) continue;
    if (inj.injuryType === 'cut_tendon' && inj.location.includes('leg') && transition === 'dodge') return true;
    if (inj.injuryType === 'fractured_bone' && inj.location.includes('leg') && transition === 'dodge') return true;
    if (inj.injuryType === 'meridian_inflammation' && transition.startsWith('route_')) return true;
    if (inj.injuryType === 'qi_depletion' && transition === 'attack_heavy') return true;
    if (inj.injuryType === 'qi_depletion' && transition === 'burst_area') return true;
  }
  return false;
}

// ============================================================================
// Death Model (§9 — per-realm anchor fate)
// ============================================================================

export type AnchorFate =
  | 'bardo_short' | 'bardo_medium' | 'bardo_long'
  | 'anchor_flight' | 'domain_persist' | 'place_bond' | 'robust' | 'final_death';

export type Realm =
  | 'mortal' | 'qi_induction' | 'qi_condensation' | 'foundation_establishment'
  | 'core_formation' | 'nascent_soul' | 'spirit_severance'
  | 'void_amalgamation' | 'tribulation_crossing' | 'mahayana';

export const REALM_LADDER: Realm[] = [
  'mortal', 'qi_induction', 'qi_condensation', 'foundation_establishment',
  'core_formation', 'nascent_soul', 'spirit_severance',
  'void_amalgamation', 'tribulation_crossing', 'mahayana',
];

export function getAnchorFate(realm: Realm): AnchorFate {
  switch (realm) {
    case 'mortal': case 'qi_induction': case 'qi_condensation': return 'bardo_short';
    case 'foundation_establishment': return 'bardo_medium';
    case 'core_formation': return 'bardo_long';
    case 'nascent_soul': return 'anchor_flight';
    case 'spirit_severance': return 'domain_persist';
    case 'void_amalgamation': return 'place_bond';
    case 'tribulation_crossing': case 'mahayana': return 'robust';
  }
}

export const BARDO_WINDOW_DAYS: Record<Realm, number> = {
  mortal: 1, qi_induction: 1, qi_condensation: 1,
  foundation_establishment: 7, core_formation: 30,
  nascent_soul: 0, spirit_severance: 0, void_amalgamation: 0,
  tribulation_crossing: 0, mahayana: 0,
};

export interface DeathTransition {
  deadCombatantId: EntityId;
  realm: Realm;
  deathTick: number;
  anchorFate: AnchorFate;
  bardoWindowTicks: number;
}

// ============================================================================
// Combat Residue (§6)
// ============================================================================

export interface CombatResidue {
  residueId: number;
  originatingAction: ActionType;
  bornAtFrame: number;
  intensity: number;
  halfLifeFrames: number;  // default 60 at Qi Condensation
  phaseSignature: PhaseName;
  actorId: EntityId;
}

export function decayResidue(residue: CombatResidue, currentFrame: number): CombatResidue {
  const age = currentFrame - residue.bornAtFrame;
  const decayedIntensity = residue.intensity * Math.pow(0.5, age / residue.halfLifeFrames);
  return { ...residue, intensity: decayedIntensity };
}

export function isResidueReadable(residue: CombatResidue, perception: number, currentFrame: number): boolean {
  const decayed = decayResidue(residue, currentFrame);
  return decayed.intensity > 0.05 && perception > 0.2;
}

// ============================================================================
// Combat Scale (§7)
// ============================================================================

export type CombatScale = 'duel' | 'mob' | 'giant' | 'battlefield' | 'law_conflict';

export interface CombatScaleConfig {
  scale: CombatScale;
  stateMachine: 'full' | 'simplified' | 'terrain' | 'force_multiplier' | 'law_state_machine';
  maxCombatants: number;
  routingAvailable: boolean;
  residueReadable: boolean;
  injuriesTracked: boolean;
}

export const COMBAT_SCALE_CONFIGS: Record<CombatScale, CombatScaleConfig> = {
  duel:         { scale: 'duel',         stateMachine: 'full',            maxCombatants: 2,  routingAvailable: true,  residueReadable: true,  injuriesTracked: true },
  mob:          { scale: 'mob',          stateMachine: 'simplified',      maxCombatants: 13, routingAvailable: true,  residueReadable: false, injuriesTracked: false },
  giant:        { scale: 'giant',        stateMachine: 'terrain',         maxCombatants: 2,  routingAvailable: true,  residueReadable: true,  injuriesTracked: true },
  battlefield:  { scale: 'battlefield',  stateMachine: 'force_multiplier', maxCombatants: 100, routingAvailable: true,  residueReadable: false, injuriesTracked: false },
  law_conflict: { scale: 'law_conflict', stateMachine: 'law_state_machine',maxCombatants: 2,  routingAvailable: false, residueReadable: false, injuriesTracked: false },
};

// ============================================================================
// Combatant State
// ============================================================================

export interface ActionInstance {
  actionType: ActionType;
  startedAtFrame: number;
  phase: PhaseName;       // the phase used for this action
  routingRegion: RoutingRegion;
}

export interface CombatantState {
  combatantId: EntityId;
  state: CombatState;
  stateEnteredAtFrame: number;
  stateFrameCount: number;
  stateFrameTarget: number;
  inputBuffer: BufferedInput[];
  currentAction: ActionInstance | null;
  routing: QiRouting;
  injuries: Injury[];
  deviationMeter: number;   // 0..1
  realm: Realm;
  qiReservoir: number;     // 0..1 (fraction of capacity)
  attention: number;        // 0..100
  perception: number;      // 0..1
}

export function createCombatant(
  id: EntityId,
  realm: Realm = 'mortal',
  qiReservoir: number = 1.0,
): CombatantState {
  return {
    combatantId: id,
    state: 'Idle',
    stateEnteredAtFrame: 0,
    stateFrameCount: 0,
    stateFrameTarget: 0,
    inputBuffer: [],
    currentAction: null,
    routing: createQiRouting('hands', 'metal'),
    injuries: [],
    deviationMeter: 0,
    realm,
    qiReservoir,
    attention: 100,
    perception: 0,
  };
}

// ============================================================================
// Combat Instance
// ============================================================================

export interface CombatInstance {
  combatId: number;
  scale: CombatScale;
  combatants: Map<string, CombatantState>;
  residues: CombatResidue[];
  currentFrame: number;
  startedAtTick: number;
  deathTransitions: DeathTransition[];
  nextResidueId: number;
}

// ============================================================================
// Combat Engine — Pure Functions
// ============================================================================

export function clamp(v: number, min: number, max: number): number {
  if (v < min) return min;
  if (v > max) return max;
  return v;
}

function keyOf(id: EntityId): string {
  return String(id);
}

/** Compute damage with all multipliers */
export function computeDamage(
  attacker: CombatantState,
  defender: CombatantState,
  action: ActionDef,
 matchup: PhaseMatchup,
 routingEffect: RoutingEffect,
): number {
  const baseDamage = action.damageBase;
  const phaseMult = matchup.damageMult;
  const routingDmgMult = routingEffect.damage ?? 1.0;
  const reservoirMult = attacker.qiReservoir > 0.05 ? 1.0 : 0.3;
  const defenderDefRouting = getRoutingEffect(defender.routing);
  const defenderDefMult = defender.state === 'Active' && defender.currentAction?.actionType === 'defend'
    ? (defenderDefRouting.defense ?? 1.0) : 1.0;

  return clamp(baseDamage * phaseMult * routingDmgMult * reservoirMult / defenderDefMult, 0, 1);
}

/** Apply damage, check for injuries */
export function applyDamageToDefender(
  defender: CombatantState,
  damage: number,
  frame: number,
): { updatedDefender: CombatantState; newInjuries: Injury[] } {
  const newInjuries: Injury[] = [];
  let updated = { ...defender };

  // Check each injury threshold
  for (const [injType, config] of Object.entries(INJURY_THRESHOLDS)) {
    if (damage >= config.threshold) {
      // Check if this injury already exists (don't duplicate)
      const existing = updated.injuries.find(i => i.injuryType === injType as InjuryType && !i.resolved);
      if (!existing) {
        const injury: Injury = {
          injuryId: `${defender.combatantId}-${injType}-${frame}`,
          injuryType: injType as InjuryType,
          location: 'torso',
          severity: clamp(damage - config.threshold + 0.1, 0, 1),
          onsetTick: frame,
          onsetThreshold: config.threshold,
          recoveryTimeDays: config.recoveryDays,
          recoveryTimeTreatedDays: config.treatedDays,
          effects: [...config.effects],
          resolved: false,
          resolvedAt: null,
        };
        newInjuries.push(injury);
        updated.injuries = [...updated.injuries, injury];
      }
    }
  }

  return { updatedDefender: updated, newInjuries };
}

/** Determine if damage is lethal */
export function isLethal(injuries: Injury[], damage: number): boolean {
  // Core crack is always lethal
  if (injuries.some(i => i.injuryType === 'core_crack' && !i.resolved)) return true;
  // Accumulated damage > 0.95 with severe injuries
  const severeInjuries = injuries.filter(i => !i.resolved && i.severity > 0.5);
  if (severeInjuries.length >= 3 && damage > 0.3) return true;
  // Five or more unresolved injuries
  if (injuries.filter(i => !i.resolved).length >= 5) return true;
  return false;
}

/** Can the combatant route qi? */
export function canRoute(combatant: CombatantState): boolean {
  if (combatant.state !== 'Idle') return false;
  if (combatant.qiReservoir < 0.05) return false;
  if (injuryBlocksTransition(combatant.injuries, 'route_hands')) return false;
  return true;
}

/** Can the combatant perform an action? */
export function canAct(combatant: CombatantState, action: ActionType): boolean {
  if (combatant.state === 'Dead' || combatant.state === 'Yielded') return false;
  if (action === 'yield') return combatant.state === 'Idle';
  if (combatant.state === 'Staggered' || combatant.state === 'Downed') return false;
  if (combatant.state === 'Committed') return false; // commitment model: no cancel
  if (combatant.state === 'Recovery') return false;
  const def = ACTION_DEFS[action];
  if (combatant.qiReservoir < def.qiCost) return false;
  if (combatant.attention < def.attentionCost) return false;
  if (injuryBlocksTransition(combatant.injuries, action)) return false;
  return true;
}

/** Process a single combat frame for one combatant */
export function stepCombatant(
  combatant: CombatantState,
  incomingDamage: { fromId: EntityId; damage: number; phase: PhaseName; frame: number } | null,
  frame: number,
): CombatantState {
  let c = { ...combatant, stateFrameCount: combatant.stateFrameCount + 1 };

  // Handle incoming damage
  if (incomingDamage && c.state !== 'Dead') {
    if (c.state === 'Idle' || c.state === 'Committed' || c.state === 'Recovery') {
      // Counter-hit bonus: +50% if hit during Committed or Recovery
      const counterMult = (c.state === 'Committed' || c.state === 'Recovery') ? 1.5 : 1.0;
      const effectiveDamage = incomingDamage.damage * counterMult;

      const { updatedDefender, newInjuries } = applyDamageToDefender(c, effectiveDamage, frame);
      c = updatedDefender;

      if (isLethal(c.injuries, effectiveDamage)) {
        return { ...c, state: 'Dead', stateEnteredAtFrame: frame, stateFrameCount: 0, stateFrameTarget: 0 };
      }

      // Stagger
      const staggerFrames = c.injuries.some(i => i.injuryType === 'organ_damage' && !i.resolved) ? 30 : 15;
      return { ...c, state: 'Staggered', stateEnteredAtFrame: frame, stateFrameCount: 0, stateFrameTarget: staggerFrames };
    }
    // Active + defending: block
    if (c.state === 'Active' && c.currentAction?.actionType === 'defend') {
      const guardDrain = incomingDamage.damage * 0.3;
      c = { ...c, qiReservoir: clamp(c.qiReservoir - guardDrain, 0, 1) };
      if (c.qiReservoir < 0.01) {
        // Guard break: long stagger
        return { ...c, state: 'Staggered', stateEnteredAtFrame: frame, stateFrameCount: 0, stateFrameTarget: 30, currentAction: null };
      }
    }
    // Downed + lethal
    if (c.state === 'Downed' && isLethal(c.injuries, incomingDamage.damage)) {
      return { ...c, state: 'Dead', stateEnteredAtFrame: frame, stateFrameCount: 0, stateFrameTarget: 0 };
    }
    // Staggered + heavy hit → Downed
    if (c.state === 'Staggered') {
      if (isLethal(c.injuries, incomingDamage.damage)) {
        return { ...c, state: 'Dead', stateEnteredAtFrame: frame, stateFrameCount: 0, stateFrameTarget: 0 };
      }
      if (incomingDamage.damage > 0.2) {
        return { ...c, state: 'Downed', stateEnteredAtFrame: frame, stateFrameCount: 0, stateFrameTarget: 60 };
      }
      // Stagger extension: reset frame count
      return { ...c, state: 'Staggered', stateEnteredAtFrame: frame, stateFrameCount: 0, stateFrameTarget: c.stateFrameTarget };
    }
    // Yielded + hit = dead
    if (c.state === 'Yielded') {
      return { ...c, state: 'Dead', stateEnteredAtFrame: frame, stateFrameCount: 0, stateFrameTarget: 0 };
    }
  }

  // State machine transitions based on frame count
  switch (c.state) {
    case 'Committed': {
      if (c.stateFrameCount >= c.stateFrameTarget && c.currentAction) {
        // Transition to Active
        return { ...c, state: 'Active', stateEnteredAtFrame: frame, stateFrameCount: 0, stateFrameTarget: c.currentAction ? ACTION_DEFS[c.currentAction.actionType].activeFrames : 0 };
      }
      break;
    }
    case 'Active': {
      const action = c.currentAction;
      if (action && action.actionType === 'defend') {
        // Holdable: stays active until input released or broken
        break;
      }
      if (c.stateFrameCount >= c.stateFrameTarget && action) {
        // Transition to Recovery
        return { ...c, state: 'Recovery', stateEnteredAtFrame: frame, stateFrameCount: 0, stateFrameTarget: ACTION_DEFS[action.actionType].recoveryFrames, currentAction: null };
      }
      break;
    }
    case 'Recovery': {
      if (c.stateFrameCount >= c.stateFrameTarget) {
        return { ...c, state: 'Idle', stateEnteredAtFrame: frame, stateFrameCount: 0, stateFrameTarget: 0 };
      }
      break;
    }
    case 'Staggered': {
      if (c.stateFrameCount >= c.stateFrameTarget) {
        return { ...c, state: 'Idle', stateEnteredAtFrame: frame, stateFrameCount: 0, stateFrameTarget: 0 };
      }
      break;
    }
    case 'Downed': {
      if (c.stateFrameCount >= c.stateFrameTarget) {
        return { ...c, state: 'Idle', stateEnteredAtFrame: frame, stateFrameCount: 0, stateFrameTarget: 0 };
      }
      break;
    }
  }

  return c;
}

/** Execute an action for a combatant in Idle state */
export function executeAction(
  combatant: CombatantState,
  action: ActionType,
  frame: number,
): CombatantState {
  if (!canAct(combatant, action)) return combatant;

  const def = ACTION_DEFS[action];

  if (action === 'yield') {
    return { ...combatant, state: 'Yielded', stateEnteredAtFrame: frame, stateFrameCount: 0, stateFrameTarget: 0 };
  }

  return {
    ...combatant,
    state: 'Committed',
    stateEnteredAtFrame: frame,
    stateFrameCount: 0,
    stateFrameTarget: def.startupFrames,
    qiReservoir: clamp(combatant.qiReservoir - def.qiCost, 0, 1),
    attention: clamp(combatant.attention - def.attentionCost, 0, 100),
    currentAction: {
      actionType: action,
      startedAtFrame: frame,
      phase: combatant.routing.phase,
      routingRegion: combatant.routing.region,
    },
  };
}

/** Switch qi routing */
export function switchRouting(
  combatant: CombatantState,
  newRegion: RoutingRegion,
  newPhase: PhaseName,
  frame: number,
): CombatantState {
  if (!canRoute(combatant)) return combatant;
  const switchCost = (ROUTING_SWITCH_COST_MIN + ROUTING_SWITCH_COST_MAX) / 2;
  return {
    ...combatant,
    state: 'Committed',
    stateEnteredAtFrame: frame,
    stateFrameCount: 0,
    stateFrameTarget: switchCost,
    routing: createQiRouting(newRegion, newPhase),
  };
}

// ============================================================================
// Combat API (the public interface)
// ============================================================================

export interface CombatStats {
  totalCombats: number;
  activeCombats: number;
  totalCombatants: number;
  totalDeaths: number;
  totalInjuries: number;
  byScale: Record<CombatScale, number>;
}

export interface CombatApi {
  // Combat instance management
  createCombat: (scale: CombatScale) => number;
  getCombat: (combatId: number) => CombatInstance | undefined;
  removeCombat: (combatId: number) => boolean;
  listCombats: () => number[];

  // Combatant management within a combat
  addCombatant: (combatId: number, combatant: CombatantState) => boolean;
  removeCombatant: (combatId: number, combatantId: EntityId) => boolean;
  getCombatantState: (combatId: number, combatantId: EntityId) => CombatantState | undefined;

  // Actions
  queueInput: (combatId: number, combatantId: EntityId, input: CombatInput, frame: number) => boolean;
  switchRouting: (combatId: number, combatantId: EntityId, region: RoutingRegion, phase: PhaseName, frame: number) => boolean;

  // Simulation
  stepCombat: (combatId: number) => void;
  stepAllCombats: () => void;

  // Queries
  getResidues: (combatId: number) => CombatResidue[];
  getDeathTransitions: (combatId: number) => DeathTransition[];

  // Tier management
  setTier: (combatantId: EntityId, tier: SimulationTier) => void;
  getTier: (combatantId: EntityId) => SimulationTier;

  // Stats
  stats: () => CombatStats;
}

export function createCombatApi(): CombatApi {
  const combats = new Map<string, CombatInstance>();
  const tiers = new Map<string, SimulationTier>();
  let nextCombatId = 1;

  function createCombat(scale: CombatScale): number {
    const id = nextCombatId++;
    combats.set(String(id), {
      combatId: id,
      scale,
      combatants: new Map(),
      residues: [],
      currentFrame: 0,
      startedAtTick: 0,
      deathTransitions: [],
      nextResidueId: 1,
    });
    return id;
  }

  function getCombat(combatId: number): CombatInstance | undefined {
    return combats.get(String(combatId));
  }

  function removeCombat(combatId: number): boolean {
    return combats.delete(String(combatId));
  }

  function listCombats(): number[] {
    return Array.from(combats.keys()).map(Number);
  }

  function addCombatant(combatId: number, combatant: CombatantState): boolean {
    const combat = combats.get(String(combatId));
    if (!combat) return false;
    const config = COMBAT_SCALE_CONFIGS[combat.scale];
    if (combat.combatants.size >= config.maxCombatants) return false;
    combat.combatants.set(keyOf(combatant.combatantId), combatant);
    if (!tiers.has(keyOf(combatant.combatantId))) {
      tiers.set(keyOf(combatant.combatantId), 4); // default S4
    }
    return true;
  }

  function removeCombatant(combatId: number, combatantId: EntityId): boolean {
    const combat = combats.get(String(combatId));
    if (!combat) return false;
    return combat.combatants.delete(keyOf(combatantId));
  }

  function getCombatantState(combatId: number, combatantId: EntityId): CombatantState | undefined {
    return combats.get(String(combatId))?.combatants.get(keyOf(combatantId)) ;
  }

  function queueInput(combatId: number, combatantId: EntityId, input: CombatInput, frame: number): boolean {
    const combat = combats.get(String(combatId));
    if (!combat) return false;
    const combatant = combat.combatants.get(keyOf(combatantId));
    if (!combatant) return false;

    combatant.inputBuffer = pushInput(combatant.inputBuffer, input, frame);
    return true;
  }

  function apiSwitchRouting(combatId: number, combatantId: EntityId, region: RoutingRegion, phase: PhaseName, frame: number): boolean {
    const combat = combats.get(String(combatId));
    if (!combat) return false;
    const combatant = combat.combatants.get(keyOf(combatantId));
    if (!combatant) return false;
    const updated = switchRouting(combatant, region, phase, frame);
    combat.combatants.set(keyOf(combatantId), updated);
    return true;
  }

  function stepCombat(combatId: number): void {
    const combat = combats.get(String(combatId));
    if (!combat) return;
    combat.currentFrame++;
    const frame = combat.currentFrame;
    const config = COMBAT_SCALE_CONFIGS[combat.scale];

    const combatantEntries = Array.from(combat.combatants.entries());

    // Phase 1: Step all combatants (state machine transitions first)
    for (const [key, combatant] of combatantEntries) {
      const stepped = stepCombatant(combatant, null, frame);
      combat.combatants.set(key, stepped);
    }

    // Phase 2: Process inputs for Idle combatants (after state transitions)
    const postStepEntries = Array.from(combat.combatants.entries());
    for (const [key, combatant] of postStepEntries) {
      if (combatant.state !== 'Idle') continue;
      const { input, remaining } = consumeInput(combatant.inputBuffer, frame);
      combatant.inputBuffer = remaining;
      if (!input) continue;

      // Route switching inputs
      if (input.startsWith('route_')) {
        const regionMap: Record<string, RoutingRegion> = { route_hands: 'hands', route_legs: 'legs', route_skin: 'skin', route_senses: 'senses' };
        const region = regionMap[input];
        if (region) {
          const updated = switchRouting(combatant, region, combatant.routing.phase, frame);
          combat.combatants.set(key, updated);
          continue;
        }
      }

      // Action inputs
      const actionMap: Partial<Record<CombatInput, ActionType>> = {
        attack_fast: 'attack_fast', attack_medium: 'attack_medium', attack_heavy: 'attack_heavy',
        defend: 'defend', dodge: 'dodge', read_residue: 'read_residue', burst_area: 'burst_area', yield: 'yield',
      };
      const action = actionMap[input];
      if (action && canAct(combatant, action)) {
        const updated = executeAction(combatant, action, frame);
        combat.combatants.set(key, updated);
      }
    }

    // Phase 3: Advance Active combatants — produce hits at impact frame
    // Re-read from combat map to get latest state after Phase 1 & 2
    const hitCheckEntries = Array.from(combat.combatants.entries());
    for (const [key, combatant] of hitCheckEntries) {
      if (combatant.state !== 'Active') continue;
      const action = combatant.currentAction;
      if (!action || action.actionType === 'defend') continue;

      const def = ACTION_DEFS[action.actionType];
      if (combatant.stateFrameCount === def.activeFrames - 1) {
        // This is the impact frame — find targets
        for (const [targetKey, target] of hitCheckEntries) {
          if (targetKey === key) continue;
          if (target.state === 'Dead' || target.state === 'Yielded') continue;

          const matchup = phaseMultiplier(action.phase, target.routing.phase);
          const routingEff = getRoutingEffect(combatant.routing);
          const damage = computeDamage(combatant, target, def, matchup, routingEff);

          const { updatedDefender, newInjuries } = applyDamageToDefender(target, damage, frame);
          combat.combatants.set(targetKey, updatedDefender);

          // Check for death
          if (isLethal(updatedDefender.injuries, damage)) {
            const death: DeathTransition = {
              deadCombatantId: target.combatantId,
              realm: target.realm,
              deathTick: frame,
              anchorFate: getAnchorFate(target.realm),
              bardoWindowTicks: BARDO_WINDOW_DAYS[target.realm] * 24 * 60,
            };
            combat.deathTransitions.push(death);
            combat.combatants.set(targetKey, {
              ...updatedDefender,
              state: 'Dead',
              stateEnteredAtFrame: frame,
              stateFrameCount: 0,
              stateFrameTarget: 0,
            });
          }

          // Leave residue
          if (config.residueReadable) {
            combat.residues.push({
              residueId: combat.nextResidueId++,
              originatingAction: action.actionType,
              bornAtFrame: frame,
              intensity: damage,
              halfLifeFrames: 60,
              phaseSignature: action.phase,
              actorId: combatant.combatantId,
            });
          }
        }
      }
    }

    // (state transitions already handled in Phase 1)
  }

  function stepAllCombats(): void {
    for (const id of combats.keys()) {
      stepCombat(Number(id));
    }
  }

  function getResidues(combatId: number): CombatResidue[] {
    return combats.get(String(combatId))?.residues ?? [];
  }

  function getDeathTransitions(combatId: number): DeathTransition[] {
    return combats.get(String(combatId))?.deathTransitions ?? [];
  }

  function setTier(combatantId: EntityId, tier: SimulationTier): void {
    tiers.set(keyOf(combatantId), tier);
  }

  function getTier(combatantId: EntityId): SimulationTier {
    return tiers.get(keyOf(combatantId)) ?? 4;
  }

  function stats(): CombatStats {
    let totalDeaths = 0, totalInjuries = 0, totalCombatants = 0;
    const byScale: Record<CombatScale, number> = { duel: 0, mob: 0, giant: 0, battlefield: 0, law_conflict: 0 };

    for (const combat of combats.values()) {
      byScale[combat.scale]++;
      totalDeaths += combat.deathTransitions.length;
      totalCombatants += combat.combatants.size;
      for (const c of combat.combatants.values()) {
        totalInjuries += c.injuries.filter(i => !i.resolved).length;
      }
    }

    return {
      totalCombats: combats.size,
      activeCombats: combats.size,
      totalCombatants,
      totalDeaths,
      totalInjuries,
      byScale,
    };
  }

  return {
    createCombat, getCombat, removeCombat, listCombats,
    addCombatant, removeCombatant, getCombatantState,
    queueInput, switchRouting: apiSwitchRouting,
    stepCombat, stepAllCombats,
    getResidues, getDeathTransitions,
    setTier, getTier,
    stats,
  };
}

// ============================================================================
// Plugin Definition
// ============================================================================

export function createCombatPlugin(): Plugin {
  let api: CombatApi | null = null;

  return {
    id: 'ga:combat',
    version: '0.1.0',
    dependencies: ['ga:determinism'],

    init(host: PluginHost) {
      api = createCombatApi();
      host.capabilities.register({
        capability: 'combat.state-machine',
        provider: 'ga:combat',
        version: '0.1.0',
        instance: api,
      });
      host.capabilities.register({
        capability: 'combat.injuries',
        provider: 'ga:combat',
        version: '0.1.0',
        instance: api,
      });
      host.capabilities.register({
        capability: 'combat.tiering',
        provider: 'ga:combat',
        version: '0.1.0',
        instance: api,
      });
      host.setState('ga:combat', api);
      console.log('[ga:combat] Initialized — 3 capabilities registered');
    },

    destroy(host: PluginHost) {
      host.capabilities.unregister('combat.state-machine', 'ga:combat');
      host.capabilities.unregister('combat.injuries', 'ga:combat');
      host.capabilities.unregister('combat.tiering', 'ga:combat');
      api = null;
      console.log('[ga:combat] Destroyed');
    },
  };
}
