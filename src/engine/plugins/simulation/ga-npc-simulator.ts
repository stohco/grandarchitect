/**
 * ga:npc-simulator — NPC Cognition and Behavior Plugin
 *
 * Implements doc 26 (NPC Cognition) and doc 09 §7 (NPC Simulation Record).
 * Every cognition step is a pure function of (NPC state, world state, RNG draw).
 * Action policy: ranked enumeration over 35-verb set.
 * Memory: capped, time-decaying record of perceived events.
 * Relationships: weighted, time-stamped, asymmetric edges.
 * Tier degradation: full cognition at S4, 12 policies at S2, frozen at S0.
 */

import type { Plugin, PluginHost } from '../kernel/plugin-host';
import type { EntityId, Tick, SimulationTier } from '../kernel/types';

// ============================================================================
// NPC Traits (doc 26 §1 — 15 traits, stable except via named events)
// ============================================================================

export interface NPCTraits {
  desires: number;       // +1 = craves experience; -1 = ascetic
  fears: number;         // +1 = risk-averse; -1 = reckless
  loyalties: number;     // +1 = faction/kin above self
  grudges: number;       // +1 = nurses grievances; -1 = forgives fast
  ambitions: number;     // +1 = seeks higher station
  riskTolerance: number; // +1 = gambles; -1 = hedges
  generosity: number;    // +1 = gives freely; -1 = hoards
  greed: number;         // +1 = accumulates wealth
  jealousy: number;      // +1 = resents others' gains
  pride: number;         // +1 = face > substance
  patience: number;      // +1 = waits years; -1 = acts now
  deception: number;     // +1 = lies fluently; -1 = honest
  gratitude: number;     // +1 = repays debts of honor
  curiosity: number;     // +1 = investigates rumors
  conformity: number;    // +1 = follows faction line
}

export const DEFAULT_NPC_TRAITS: NPCTraits = {
  desires: 0, fears: 0, loyalties: 0, grudges: 0, ambitions: 0,
  riskTolerance: 0, generosity: 0, greed: 0, jealousy: 0, pride: 0,
  patience: 0, deception: 0, gratitude: 0, curiosity: 0, conformity: 0,
};

// ============================================================================
// Desires (doc 26 §2 — 10 named wants)
// ============================================================================

export type DesireName =
  'survival' | 'kin' | 'faction' | 'cultivation' | 'reputation'
  | 'wealth' | 'vengeance' | 'romance' | 'knowledge' | 'freedom';

export interface WantVector {
  survival: number;
  kin: number;
  faction: number;
  cultivation: number;
  reputation: number;
  wealth: number;
  vengeance: number;
  romance: number;
  knowledge: number;
  freedom: number;
}

// ============================================================================
// Fears (doc 26 §3 — 7 fears)
// ============================================================================

export type FearName =
  'death' | 'deviation' | 'dishonor' | 'poverty'
  | 'isolation' | 'authority' | 'stranger' | 'exposure';

export interface AvoidVector {
  death: number;
  deviation: number;
  dishonor: number;
  poverty: number;
  isolation: number;
  authority: number;
  stranger: number;
  exposure: number;
}

// ============================================================================
// Loyalties (doc 26 §4 — directed graph edges)
// ============================================================================

export type LoyaltyBase = 'kin' | 'faction' | 'oath' | 'debt' | 'romance' | 'fear' | 'gratitude';

export interface LoyaltyEdge {
  targetId: EntityId;
  weight: number;
  base: LoyaltyBase;
  tickEstablished: Tick;
}

// ============================================================================
// Grudges (doc 26 §5 — typed, time-stamped, decaying)
// ============================================================================

export type GrudgeType =
  'killed_kin' | 'stole_inheritance' | 'insulted_honor' | 'betrayed_trust'
  | 'destroyed_sect' | 'cheated_trade' | 'broke_oath' | 'humiliated'
  | 'poisoned' | 'corrupted_master';

export interface Grudge {
  targetId: EntityId;
  type: GrudgeType;
  severity: number;
  tickEstablished: Tick;
  satisfied: boolean;
}

// ============================================================================
// Ambitions (doc 26 §6 — max 3 active)
// ============================================================================

export type AmbitionType =
  'breakthrough_to' | 'inherit_manual' | 'found_sect' | 'destroy_faction'
  | 'avenge_kin' | 'marry' | 'take_disciple' | 'find_master'
  | 'claim_territory' | 'become_elder' | 'accumulate_wealth'
  | 'comprehend_law';

export interface Ambition {
  type: AmbitionType;
  targetId?: EntityId;
  intensity: number;
  progress: number;
}

// ============================================================================
// Memory (doc 26 §13 — capped, time-decaying)
// ============================================================================

export interface MemoryRecord {
  eventId: string;
  eventType: string;
  tick: Tick;
  emotionalWeight: number;
  reliability: number;
  content: string;
  distortionLevel: number;
}

// ============================================================================
// Relationship Record (doc 26 §14)
// ============================================================================

export type RelationshipType =
  'ally' | 'rival' | 'subordinate' | 'superior' | 'kin' | 'friend'
  | 'neutral' | 'enemy' | 'master' | 'disciple' | 'spouse' | 'stranger';

export interface RelationshipRecord {
  targetId: EntityId;
  type: RelationshipType;
  trust: number;
  lastInteractionTick: Tick;
  interactionCount: number;
}

// ============================================================================
// Action Policies (doc 26 §16 — 35 verbs)
// ============================================================================

export type NPCVerb =
  'seek_master' | 'recruit_disciple' | 'betray_faction' | 'hide_injury'
  | 'buy_medicine' | 'enter_seclusion' | 'investigate_rumor' | 'flee_stronger_enemy'
  | 'challenge_rival' | 'steal_inheritance' | 'protect_family' | 'establish_sect'
  | 'gather_herbs' | 'hunt_beast' | 'trade_at_market' | 'pay_debt' | 'collect_debt'
  | 'smuggle_goods' | 'study_manual' | 'comprehend_target' | 'visit_kin'
  | 'insult_rival' | 'praise_ally' | 'propose_marriage' | 'reject_suit' | 'murder'
  | 'frame_rival' | 'report_to_authority' | 'flee_region' | 'hide_in_wilderness'
  | 'seek_audience' | 'challenge_law' | 'yield_to_stronger' | 'demand_tribute'
  | 'pay_tribute' | 'idle' | 'travel' | 'rest' | 'eat' | 'work';

export const S2_VERB_SET: ReadonlySet<NPCVerb> = new Set([
  'trade_at_market', 'gather_herbs', 'hunt_beast', 'travel', 'rest',
  'eat', 'work', 'idle', 'visit_kin', 'study_manual', 'pay_debt', 'enter_seclusion',
]);

export interface ActionScore {
  verb: NPCVerb;
  score: number;
  wantMatch: number;
  fearPenalty: number;
  loyaltyDelta: number;
  ambitionBoost: number;
}

// ============================================================================
// NPC Identity, State, Social, Procedural, Determinism (doc 09 §7)
// ============================================================================

export interface NpcIdentity {
  name: string;
  appearanceSeed: number;
  cultureId: string;
  isNamed: boolean;
}

export interface NpcState {
  location: { regionId: string; x: number; y: number; z: number };
  realm: string;
  age: number;
  health: number;
  qiState: {
    reservoir: number;
    phase: string;
    progress: number;
  };
  heartMind: {
    stability: number;
    deviationRisk: number;
    mentalState: string;
  };
}

export interface NpcSocial {
  factionId: string;
  householdId: string;
  relationships: RelationshipRecord[];
  goals: string[];
}

export interface NpcProcedural {
  inventorySeed: string;
  scheduleSeed: string;
  simulationTier: SimulationTier;
}

export interface NpcDeterminism {
  rngStream: string;
}

export interface NPCRecord {
  id: EntityId;
  identity: NpcIdentity;
  state: NpcState;
  social: NpcSocial;
  traits: NPCTraits;
  desires: WantVector;
  fears: AvoidVector;
  loyalties: LoyaltyEdge[];
  grudges: Grudge[];
  ambitions: Ambition[];
  memories: MemoryRecord[];
  procedural: NpcProcedural;
  determinism: NpcDeterminism;
  currentAction: NPCVerb;
  actionLockTicks: number;
  lastDecisionTick: Tick;
  tier: SimulationTier;
}

// ============================================================================
// NPC Simulator API
// ============================================================================

export interface NpcSimulatorApi {
  createNpc(config: NpcCreateConfig): EntityId;
  getNpc(id: EntityId): NPCRecord | undefined;
  removeNpc(id: EntityId): boolean;
  listNpcs(): EntityId[];
  countNpcs(): number;
  decide(npcId: EntityId, tick: Tick, worldState: NpcWorldState): NPCVerb;
  decideAll(tick: Tick, worldState: NpcWorldState): Map<EntityId, NPCVerb>;
  addMemory(npcId: EntityId, record: MemoryRecord): boolean;
  getMemories(npcId: EntityId): MemoryRecord[];
  addRelationship(npcId: EntityId, record: RelationshipRecord): boolean;
  getRelationships(npcId: EntityId): RelationshipRecord[];
  getRelationship(npcId: EntityId, targetId: EntityId): RelationshipRecord | undefined;
  addLoyalty(npcId: EntityId, edge: LoyaltyEdge): boolean;
  addGrudge(npcId: EntityId, grudge: Grudge): boolean;
  decayGrudges(npcId: EntityId, currentTick: Tick): void;
  addAmbition(npcId: EntityId, ambition: Ambition): boolean;
  getAmbitions(npcId: EntityId): Ambition[];
  updateLocation(npcId: EntityId, location: NpcState['location']): boolean;
  updateHealth(npcId: EntityId, health: number): boolean;
  updateQiState(npcId: EntityId, qiState: Partial<NpcState['qiState']>): boolean;
  updateRealm(npcId: EntityId, realm: string): boolean;
  updateMentalState(npcId: EntityId, mentalState: string): boolean;
  setTier(npcId: EntityId, tier: SimulationTier): boolean;
  getTier(npcId: EntityId): SimulationTier;
  queryByTier(tier: SimulationTier): EntityId[];
  findByName(name: string): EntityId | undefined;
  findByFaction(factionId: string): EntityId[];
  findByRegion(regionId: string): EntityId[];
  stats(): NpcSimulatorStats;
}

export interface NpcCreateConfig {
  identity: NpcIdentity;
  state?: Partial<NpcState>;
  social?: Partial<NpcSocial>;
  traits?: Partial<NPCTraits>;
  tier?: SimulationTier;
  rngStream?: string;
}

export interface NpcWorldState {
  tick: Tick;
  regionId?: string;
  ambientQi: number;
  dangerLevel: number;
  activeFactions: string[];
  marketAvailable: boolean;
  herbsAvailable: boolean;
  beastsPresent: boolean;
}

export interface NpcSimulatorStats {
  totalNpcs: number;
  byTier: Record<SimulationTier, number>;
  namedNpcs: number;
  averageHealth: number;
  totalAmbitions: number;
  totalGrudges: number;
  totalLoyalties: number;
  totalMemories: number;
}

// ============================================================================
// Implementation
// ============================================================================

function createDefaultState(): NpcState {
  return {
    location: { regionId: 'default', x: 0, y: 0, z: 0 },
    realm: 'mortal',
    age: 25,
    health: 1.0,
    qiState: { reservoir: 0, phase: 'none', progress: 0 },
    heartMind: { stability: 0.8, deviationRisk: 0, mentalState: 'calm' },
  };
}

function createDefaultSocial(): NpcSocial {
  return { factionId: '', householdId: '', relationships: [], goals: [] };
}

function createDefaultDesires(): WantVector {
  return {
    survival: 0.5, kin: 0.3, faction: 0.2, cultivation: 0.1, reputation: 0.2,
    wealth: 0.3, vengeance: 0, romance: 0.2, knowledge: 0.1, freedom: 0.3,
  };
}

function createDefaultFears(): AvoidVector {
  return {
    death: 0.8, deviation: 0.3, dishonor: 0.4, poverty: 0.5,
    isolation: 0.3, authority: 0.2, stranger: 0.1, exposure: 0.1,
  };
}

function hashStringToNumber(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = ((h << 5) - h + seed.charCodeAt(i)) | 0;
  }
  return h;
}

function detRandom(seed: number, tick: number, index: number): number {
  let state = (seed ^ (tick * 2654435761) ^ (index * 40503)) | 0;
  state = ((state >> 16) ^ state) * 0x45d9f3b | 0;
  state = ((state >> 16) ^ state) * 0x45d9f3b | 0;
  state = (state >> 16) ^ state;
  return (state >>> 0) / 4294967296;
}

const ALL_VERBS: Set<NPCVerb> = new Set([
  'seek_master', 'recruit_disciple', 'betray_faction', 'hide_injury',
  'buy_medicine', 'enter_seclusion', 'investigate_rumor', 'flee_stronger_enemy',
  'challenge_rival', 'steal_inheritance', 'protect_family', 'establish_sect',
  'gather_herbs', 'hunt_beast', 'trade_at_market', 'pay_debt', 'collect_debt',
  'smuggle_goods', 'study_manual', 'comprehend_target', 'visit_kin',
  'insult_rival', 'praise_ally', 'propose_marriage', 'reject_suit', 'murder',
  'frame_rival', 'report_to_authority', 'flee_region', 'hide_in_wilderness',
  'seek_audience', 'challenge_law', 'yield_to_stronger', 'demand_tribute',
  'pay_tribute', 'idle', 'travel', 'rest', 'eat', 'work',
]);

const VERB_DESIRE_MAP: Partial<Record<NPCVerb, DesireName>> = {
  seek_master: 'cultivation', recruit_disciple: 'faction', gather_herbs: 'cultivation',
  hunt_beast: 'wealth', trade_at_market: 'wealth', study_manual: 'knowledge',
  comprehend_target: 'cultivation', visit_kin: 'kin', enter_seclusion: 'cultivation',
  establish_sect: 'faction', investigate_rumor: 'knowledge', eat: 'survival',
  rest: 'survival', work: 'wealth', idle: 'freedom', travel: 'freedom',
  protect_family: 'kin', propose_marriage: 'romance',
};

const VERB_FEAR_MAP: Partial<Record<NPCVerb, FearName>> = {
  challenge_rival: 'death', murder: 'dishonor', smugg_goods: 'authority',
  frame_rival: 'exposure', hide_in_wilderness: 'isolation', flee_region: 'poverty',
  challenge_law: 'authority', betray_faction: 'dishonor',
};

function scoreActions(
  npc: NPCRecord, worldState: NpcWorldState,
  rngSeed: number, tick: Tick, verbSet: Set<NPCVerb>,
): ActionScore[] {
  const scores: ActionScore[] = [];
  for (const verb of verbSet) {
    let baseScore = 0.1;
    const wantName = VERB_DESIRE_MAP[verb];
    const wantMatch = wantName ? npc.desires[wantName] : 0.5;
    baseScore += wantMatch * 0.3;
    const fearName = VERB_FEAR_MAP[verb];
    const fearPenalty = fearName ? npc.fears[fearName] : 0;
    let score = baseScore * (1 - fearPenalty * 0.5);
    const loyaltyDelta = npc.traits.loyalties * 0.1;
    let ambitionBoost = 0;
    if (npc.ambitions.length > 0) {
      const topAmbition = npc.ambitions.reduce((a, b) => a.progress > b.progress ? a : b);
      if (topAmbition.progress > 0.8) ambitionBoost = topAmbition.intensity * 0.3;
    }
    score += ambitionBoost;
    if (verb === 'trade_at_market' && worldState.marketAvailable) score += 0.1;
    if (verb === 'gather_herbs' && worldState.herbsAvailable) score += 0.1;
    if (verb === 'hunt_beast' && worldState.beastsPresent) score += 0.1;
    if (verb === 'flee_stronger_enemy' && worldState.dangerLevel > 0.7) score += 0.2;
    scores.push({ verb, score, wantMatch, fearPenalty, loyaltyDelta, ambitionBoost });
  }
  return scores;
}

export function createNpcSimulatorApi(): NpcSimulatorApi {
  const npcs = new Map<string, NPCRecord>();
  let nextEntityId: EntityId = 1n;

  function keyOf(id: EntityId): string { return id.toString(); }

  function createNpc(config: NpcCreateConfig): EntityId {
    const id = nextEntityId++;
    const npc: NPCRecord = {
      id, identity: { ...config.identity },
      state: { ...createDefaultState(), ...config.state },
      social: { ...createDefaultSocial(), ...config.social },
      traits: { ...DEFAULT_NPC_TRAITS, ...config.traits },
      desires: createDefaultDesires(), fears: createDefaultFears(),
      loyalties: [], grudges: [], ambitions: [], memories: [],
      procedural: {
        inventorySeed: config.rngStream ?? `inv-${id}`,
        scheduleSeed: config.rngStream ?? `sched-${id}`,
        simulationTier: config.tier ?? 2,
      },
      determinism: { rngStream: config.rngStream ?? `npc-${id}` },
      currentAction: 'idle', actionLockTicks: 0, lastDecisionTick: 0,
      tier: config.tier ?? 2,
    };
    npcs.set(keyOf(id), npc);
    return id;
  }

  function getNpc(id: EntityId): NPCRecord | undefined { return npcs.get(keyOf(id)); }
  function removeNpc(id: EntityId): boolean { return npcs.delete(keyOf(id)); }
  function listNpcs(): EntityId[] { return Array.from(npcs.values()).map(n => n.id); }
  function countNpcs(): number { return npcs.size; }

  function decide(npcId: EntityId, tick: Tick, worldState: NpcWorldState): NPCVerb {
    const npc = npcs.get(keyOf(npcId));
    if (!npc) return 'idle';
    if (npc.tier === 0) return npc.currentAction;
    if (npc.actionLockTicks > 0) { npc.actionLockTicks--; return npc.currentAction; }
    const verbSet = npc.tier >= 4 ? ALL_VERBS : S2_VERB_SET as Set<NPCVerb>;
    const rngSeed = hashStringToNumber(npc.determinism.rngStream);
    const scores = scoreActions(npc, worldState, rngSeed, tick, verbSet);
    let bestVerb: NPCVerb = 'idle';
    let bestScore = -Infinity;
    let idx = 0;
    for (const s of scores) {
      const epsilon = detRandom(rngSeed, tick, idx) * 0.05 * (1 + Math.abs(s.score));
      const adjusted = s.score + epsilon;
      if (adjusted > bestScore) { bestScore = adjusted; bestVerb = s.verb; }
      idx++;
    }
    npc.currentAction = bestVerb;
    npc.lastDecisionTick = tick;
    npc.actionLockTicks = npc.tier >= 4 ? 60 : (npc.tier >= 3 ? 240 : 16);
    return bestVerb;
  }

  function decideAll(tick: Tick, worldState: NpcWorldState): Map<EntityId, NPCVerb> {
    const results = new Map<EntityId, NPCVerb>();
    const sorted = Array.from(npcs.values()).sort((a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
    for (const npc of sorted) results.set(npc.id, decide(npc.id, tick, worldState));
    return results;
  }

  function addMemory(npcId: EntityId, record: MemoryRecord): boolean {
    const npc = npcs.get(keyOf(npcId));
    if (!npc) return false;
    const cap = npc.tier >= 4 ? 256 : (npc.tier >= 2 ? 32 : 0);
    if (npc.memories.length >= cap) {
      const now = record.tick;
      npc.memories.sort((a, b) => {
        const scoreA = a.emotionalWeight * a.reliability * (1 / (1 + now - a.tick));
        const scoreB = b.emotionalWeight * b.reliability * (1 / (1 + now - b.tick));
        return scoreA - scoreB;
      });
      npc.memories.shift();
    }
    npc.memories.push(record);
    return true;
  }

  function getMemories(npcId: EntityId): MemoryRecord[] {
    return npcs.get(keyOf(npcId))?.memories ?? [];
  }

  function addRelationship(npcId: EntityId, record: RelationshipRecord): boolean {
    const npc = npcs.get(keyOf(npcId));
    if (!npc) return false;
    const existing = npc.social.relationships.find(r => r.targetId === record.targetId);
    if (existing) {
      existing.type = record.type; existing.trust = record.trust;
      existing.lastInteractionTick = record.lastInteractionTick; existing.interactionCount++;
    } else npc.social.relationships.push(record);
    return true;
  }

  function getRelationships(npcId: EntityId): RelationshipRecord[] {
    return npcs.get(keyOf(npcId))?.social.relationships ?? [];
  }

  function getRelationship(npcId: EntityId, targetId: EntityId): RelationshipRecord | undefined {
    const npc = npcs.get(keyOf(npcId));
    return npc?.social.relationships.find(r => r.targetId === targetId);
  }

  function addLoyalty(npcId: EntityId, edge: LoyaltyEdge): boolean {
    const npc = npcs.get(keyOf(npcId));
    if (!npc) return false;
    npc.loyalties.push(edge);
    return true;
  }

  function addGrudge(npcId: EntityId, grudge: Grudge): boolean {
    const npc = npcs.get(keyOf(npcId));
    if (!npc) return false;
    npc.grudges.push(grudge);
    return true;
  }

  function decayGrudges(npcId: EntityId, currentTick: Tick): void {
    const npc = npcs.get(keyOf(npcId));
    if (!npc) return;
    for (const g of npc.grudges) {
      g.severity = g.severity * (1 - (0.5 - 0.4 * npc.traits.grudges) / 365);
      if (g.severity < 0.01) g.satisfied = true;
    }
  }

  function addAmbition(npcId: EntityId, ambition: Ambition): boolean {
    const npc = npcs.get(keyOf(npcId));
    if (!npc || npc.ambitions.length >= 3) return false;
    npc.ambitions.push(ambition);
    return true;
  }

  function getAmbitions(npcId: EntityId): Ambition[] {
    return npcs.get(keyOf(npcId))?.ambitions ?? [];
  }

  function updateLocation(npcId: EntityId, location: NpcState['location']): boolean {
    const npc = npcs.get(keyOf(npcId));
    if (!npc) return false;
    npc.state.location = location;
    return true;
  }

  function updateHealth(npcId: EntityId, health: number): boolean {
    const npc = npcs.get(keyOf(npcId));
    if (!npc) return false;
    npc.state.health = Math.max(0, Math.min(1, health));
    return true;
  }

  function updateQiState(npcId: EntityId, qiState: Partial<NpcState['qiState']>): boolean {
    const npc = npcs.get(keyOf(npcId));
    if (!npc) return false;
    Object.assign(npc.state.qiState, qiState);
    return true;
  }

  function updateRealm(npcId: EntityId, realm: string): boolean {
    const npc = npcs.get(keyOf(npcId));
    if (!npc) return false;
    npc.state.realm = realm;
    return true;
  }

  function updateMentalState(npcId: EntityId, mentalState: string): boolean {
    const npc = npcs.get(keyOf(npcId));
    if (!npc) return false;
    npc.state.heartMind.mentalState = mentalState;
    return true;
  }

  function setTier(npcId: EntityId, tier: SimulationTier): boolean {
    const npc = npcs.get(keyOf(npcId));
    if (!npc) return false;
    if (npc.identity.isNamed && tier < 2) return false;
    npc.tier = tier;
    npc.procedural.simulationTier = tier;
    return true;
  }

  function getTier(npcId: EntityId): SimulationTier {
    return npcs.get(keyOf(npcId))?.tier ?? 0;
  }

  function queryByTier(tier: SimulationTier): EntityId[] {
    return Array.from(npcs.values()).filter(n => n.tier === tier).map(n => n.id);
  }

  function findByName(name: string): EntityId | undefined {
    for (const npc of npcs.values()) { if (npc.identity.name === name) return npc.id; }
    return undefined;
  }

  function findByFaction(factionId: string): EntityId[] {
    return Array.from(npcs.values()).filter(n => n.social.factionId === factionId).map(n => n.id);
  }

  function findByRegion(regionId: string): EntityId[] {
    return Array.from(npcs.values()).filter(n => n.state.location.regionId === regionId).map(n => n.id);
  }

  function stats(): NpcSimulatorStats {
    const byTier: Record<SimulationTier, number> = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0 };
    let totalHealth = 0, namedNpcs = 0, totalAmbitions = 0, totalGrudges = 0, totalLoyalties = 0, totalMemories = 0;
    for (const npc of npcs.values()) {
      byTier[npc.tier]++; totalHealth += npc.state.health;
      if (npc.identity.isNamed) namedNpcs++;
      totalAmbitions += npc.ambitions.length; totalGrudges += npc.grudges.length;
      totalLoyalties += npc.loyalties.length; totalMemories += npc.memories.length;
    }
    return {
      totalNpcs: npcs.size, byTier, namedNpcs,
      averageHealth: npcs.size > 0 ? totalHealth / npcs.size : 0,
      totalAmbitions, totalGrudges, totalLoyalties, totalMemories,
    };
  }

  return {
    createNpc, getNpc, removeNpc, listNpcs, countNpcs,
    decide, decideAll,
    addMemory, getMemories,
    addRelationship, getRelationships, getRelationship,
    addLoyalty, addGrudge, decayGrudges,
    addAmbition, getAmbitions,
    updateLocation, updateHealth, updateQiState, updateRealm, updateMentalState,
    setTier, getTier, queryByTier,
    findByName, findByFaction, findByRegion,
    stats,
  };
}

// ============================================================================
// Plugin Definition
// ============================================================================

export function createNpcSimulatorPlugin(): Plugin {
  let api: NpcSimulatorApi | null = null;

  return {
    id: 'ga:npc-simulator',
    version: '0.1.0',
    dependencies: ['ga:determinism'],

    init(host: PluginHost) {
      api = createNpcSimulatorApi();
      host.capabilities.register({
        capability: 'npc-simulator.cognition', provider: 'ga:npc-simulator',
        version: '0.1.0', instance: api,
      });
      host.capabilities.register({
        capability: 'npc-simulator.social', provider: 'ga:npc-simulator',
        version: '0.1.0', instance: api,
      });
      host.capabilities.register({
        capability: 'npc-simulator.tiering', provider: 'ga:npc-simulator',
        version: '0.1.0', instance: api,
      });
      host.setState('ga:npc-simulator', api);
      console.log('[ga:npc-simulator] Initialized — 3 capabilities registered');
    },

    destroy(host: PluginHost) {
      host.capabilities.unregister('npc-simulator.cognition', 'ga:npc-simulator');
      host.capabilities.unregister('npc-simulator.social', 'ga:npc-simulator');
      host.capabilities.unregister('npc-simulator.tiering', 'ga:npc-simulator');
      api = null;
      console.log('[ga:npc-simulator] Destroyed');
    },
  };
}
