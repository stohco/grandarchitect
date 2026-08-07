/**

 * ga:quest — Dialogue, Quest, and Narrative

 *

 * Implements doc 34 (Dialogue, Quest, and Narrative).

 * Dialogue trees with perception-gated options,

 * quest generation from world-state predicates,

 * companion system (join/leave, approval, personal arcs),

 * romance system (Exchange of Cuts),

 * narrative spine (bias system, adaptation),

 * ending triggers (state-computed, not menu-chosen).

 *

 * Pure functions over typed state. No forbidden functions.

 * No Three.js, no DOM, no rendering.

 */



import type { Plugin, PluginHost } from '../../kernel/plugin-host';

import type { EntityId, Tick, SimulationTier } from '../../kernel/types';



// ============================================================================

// Realm (shared with cultivation)

// ============================================================================



export type Realm =

  | 'mortal' | 'qi_induction' | 'qi_condensation' | 'foundation_establishment'

  | 'core_formation' | 'nascent_soul' | 'spirit_severance'

  | 'void_amalgamation' | 'tribulation_crossing' | 'mahayana';



// ============================================================================

// Dialogue System (§1)

// ============================================================================



export type PerceptionState =

  | 'normal' | 'sense_qi' | 'read_residue'

  | 'sense_anchor' | 'sense_law' | 'divination_active';



export interface DialogueCondition {

  type: 'perception_state' | 'knowledge_fact' | 'relationship' | 'trait' | 'realm' | 'quest_state' | 'flag' | 'inventory';

  state?: string;

  min?: number;

  factId?: string;

  target?: number;

  questId?: string;

  questState?: string;

  flag?: string;

  value?: boolean;

  itemId?: string;

}



export interface DialogueConsequence {

  type: string;

  flag?: string;

  target?: unknown;

  value?: unknown;

}



export interface DialogueResponse {

  responseId: string;

  playerLine: string;

  responseConditions: DialogueCondition[];

  consequences: DialogueConsequence[];

  nextNodeId: string;

}



export interface DialogueNode {

  nodeId: string;

  npcLine: string;

  responses: DialogueResponse[];

  nodeConditions: DialogueCondition[];

}



export interface DialogueTree {

  treeId: string;

  rootNodeId: string;

  nodes: Record<string, DialogueNode>;

  speakerId: EntityId;

  contextTags: string[];

}



// ============================================================================

// Quest System (§2)

// ============================================================================



export type QuestType =

  | 'gather_herb' | 'hunt_beast' | 'deliver_message' | 'escort_npc'

  | 'investigate_rumor' | 'resolve_dispute' | 'clear_ruin' | 'retrieve_manual'

  | 'protect_caravan' | 'avenge_kin' | 'find_master' | 'take_disciple'

  | 'break_through' | 'found_sect' | 'compete_auction' | 'pilgrimage'

  | 'cure_illness' | 'lift_curse';



export type QuestObjectiveType =

  | 'reach_location' | 'acquire_item' | 'defeat_npc' | 'protect_npc'

  | 'perceive_state' | 'choose_response' | 'wait_event' | 'complete_rite';



export type QuestRewardType =

  | 'cash' | 'silver' | 'spirit_stone' | 'item' | 'knowledge_fact'

  | 'relationship' | 'reputation' | 'technique' | 'law_fragment';



export interface QuestObjective {

  objectiveId: string;

  description: string;

  type: QuestObjectiveType;

  target: unknown;

  completed: boolean;

}



export interface QuestReward {

  type: QuestRewardType;

  value: unknown;

}



export interface QuestConsequence {

  type: string;

  value: unknown;

}



export interface Quest {

  questId: string;

  questType: QuestType;

  generatedAtTick: number;

  originEventId: number | null;

  objectives: QuestObjective[];

  rewards: QuestReward[];

  failureConsequences: QuestConsequence[];

  deadlineTick: number | null;

  status: 'available' | 'active' | 'completed' | 'failed' | 'expired';

}



// ============================================================================

// Companion System (§4)

// ============================================================================



export type CompanionJoinType = 'quest_completed' | 'relationship_threshold' | 'shared_danger' | 'narrative_beat';

export type CompanionLeaveType = 'approval_threshold' | 'quest_completed' | 'narrative_beat' | 'death' | 'player_choice';



export interface SharedExperience {

  experienceId: string;

  type: 'combat' | 'quest' | 'travel' | 'revelation' | 'loss' | 'triumph';

  tick: number;

  approvalDelta: number;

}



export interface CompanionArcStage {

  stageId: string;

  triggerPredicate: string;  // simplified: description of the condition

  onEnterDescription: string;

  availableDialogueTrees: string[];

}



export interface CompanionArc {

  arcId: string;

  stages: CompanionArcStage[];

  currentStage: number;

}



export interface Companion {

  npcId: EntityId;

  joinType: CompanionJoinType;

  joinTick: number | null;

  leaveType: CompanionLeaveType | null;

  leaveTick: number | null;

  approval: number;          // -1..+1

  smoothedApproval: number;  // 30-day moving average

  trust: number;

  familiarity: number;

  sharedExperiences: SharedExperience[];

  personalArc: CompanionArc | null;

}



// ============================================================================

// Romance System (§5 — Exchange of Cuts)

// ============================================================================



export type RomanceStage =

  | 'unmet' | 'acquaintance' | 'tension' | 'first_cut'

  | 'courtship' | 'commitment' | 'marriage' | 'estrangement' | 'ended';



export type CutType = 'fact_revealed' | 'feeling_confessed' | 'vulnerability_shown' | 'oath_made' | 'oath_broken';

export type DeflectionType = 'accepted' | 'deflected' | 'countered' | 'refused';



export interface CutExchange {

  cutId: string;

  tick: number;

  cutType: CutType;

  deflectionType: DeflectionType;

  content: string;

  intensityDelta: number;

  stabilityDelta: number;

  honestyDelta: number;

}



export interface RomanceState {

  partner1Id: EntityId;

  partner2Id: EntityId;

  stage: RomanceStage;

  cutsExchanged: CutExchange[];

  intensity: number;   // 0..1

  stability: number;   // 0..1

  honesty: number;     // 0..1

  lastCutTick: number | null;

}



// ============================================================================

// Narrative Spine (§3)

// ============================================================================



export interface NarrativeBeat {

  beatId: string;

  actNumber: 1 | 2 | 3;

  description: string;

  firePredicate: string;  // simplified: description of the condition

  missable: boolean;

  sessionRange: [number, number];

  fired: boolean;

  firedAtTick: number | null;

}



export interface BiasAdjustment {

  eventRateMultipliers: Record<string, number>;

  npcCognitionBiases: { npcId: number; traitDelta: string; magnitude: number }[];

  questAvailabilityBoosts: string[];

  durationTicks: number;

}



export interface NarrativeSpine {

  acts: { actNumber: 1 | 2 | 3; beats: NarrativeBeat[] }[];

  currentAct: 1 | 2 | 3;

  beatsCompleted: string[];

  beatsMissed: string[];

  maxMissedPerAct: number;

  driftMode: boolean;

}



// ============================================================================

// Ending Triggers (§7)

// ============================================================================



export type MoralWeight = 'triumph' | 'bittersweet' | 'tragic' | 'ambiguous' | 'transcendent';



export interface EndingTrigger {

  triggerId: string;

  endingId: string;

  description: string;

  priority: number;

  final: boolean;

  trueSinceTick: number | null;

}



export interface Ending {

  endingId: string;

  title: string;

  moralWeight: MoralWeight;

}



// ============================================================================

// Quest API

// ============================================================================



export interface QuestStats {

  totalQuests: number;

  byStatus: Record<Quest['status'], number>;

  totalCompanions: number;

  totalRomances: number;

  totalCutExchanges: number;

  spineBeatsFired: number;

  spineBeatsMissed: number;

}



export interface QuestApi {

  // Dialogue

  registerDialogueTree: (tree: DialogueTree) => boolean;

  getDialogueTree: (treeId: string) => DialogueTree | undefined;

  listDialogueTrees: () => string[];

  evaluateDialogueConditions: (treeId: string, nodeId: string, worldState: WorldStateSnapshot) => string[];

  applyConsequences: (consequences: DialogueConsequence[], worldState: WorldStateSnapshot) => void;



  // Quest

  createQuest: (quest: Quest) => string;

  getQuest: (questId: string) => Quest | undefined;

  listQuests: (status?: Quest['status']) => Quest[];

  activateQuest: (questId: string) => boolean;

  completeObjective: (questId: string, objectiveId: string) => boolean;

  completeQuest: (questId: string) => boolean;

  failQuest: (questId: string) => boolean;

  expireQuests: (currentTick: number) => number;



  // Companion

  createCompanion: (npcId: EntityId, arcId: string | null) => Companion;

  getCompanion: (npcId: EntityId) => Companion | undefined;

  removeCompanion: (npcId: EntityId) => boolean;

  listCompanions: () => EntityId[];

  addSharedExperience: (npcId: EntityId, exp: SharedExperience) => boolean;

  updateApproval: (npcId: EntityId, delta: number, currentTick: number) => void;

  advanceCompanionArc: (npcId: EntityId) => number;



  // Romance

  createRomance: (p1: EntityId, p2: EntityId) => string;

  getRomance: (romanceId: string) => RomanceState | undefined;

  listRomances: () => RomanceState[];

  exchangeCut: (romanceId: string, cut: Omit<CutExchange, 'cutId'>) => boolean;

  getMaxCutsPerDay: () => number;



  // Spine

  createSpine: (beats: NarrativeBeat[], maxMissedPerAct?: number) => NarrativeSpine;

  getSpine: () => NarrativeSpine | undefined;

  checkBeats: (worldState: WorldStateSnapshot, currentTick: number) => string[];

  enterDriftMode: () => void;



  // Endings

  registerEnding: (trigger: EndingTrigger) => boolean;

  checkEndings: (worldState: WorldStateSnapshot) => Ending[];



  // Tier

  setTier: (npcId: EntityId, tier: SimulationTier) => void;

  getTier: (npcId: EntityId) => SimulationTier;



  // Stats

  stats: () => QuestStats;

}



// ============================================================================

// World State Snapshot (simplified for interface)

// ============================================================================



export interface WorldStateSnapshot {

  tick: number;

  playerRealm: Realm;

  perceptionState: PerceptionState;

  knowledgeFacts: string[];

  relationships: Record<string, number>;

  flags: Record<string, boolean>;

  inventory: Record<string, number>;

}



// ============================================================================

// Pure Functions

// ============================================================================



function clamp(v: number, min: number, max: number): number {

  if (v < min) return min;

  if (v > max) return max;

  return v;

}



function keyOf(id: EntityId | number | string): string {

  return String(id);

}



export function evaluateCondition(cond: DialogueCondition, ws: WorldStateSnapshot): boolean {

  switch (cond.type) {

    case 'perception_state':

      return ws.perceptionState === (cond.state as PerceptionState);

    case 'knowledge_fact':

      return cond.factId ? ws.knowledgeFacts.includes(cond.factId) : false;

    case 'relationship':

      if (!cond.target) return false;

      const rel = ws.relationships[keyOf(cond.target)];

      return rel !== undefined && rel >= (cond.min ?? 0);

    case 'realm': {

      const realmOrder: Realm[] = ['mortal', 'qi_induction', 'qi_condensation', 'foundation_establishment', 'core_formation', 'nascent_soul', 'spirit_severance', 'void_amalgamation', 'tribulation_crossing', 'mahayana'];

      const playerIdx = realmOrder.indexOf(ws.playerRealm);

      const minIdx = realmOrder.indexOf((cond.state ?? 'mortal') as Realm);

      return playerIdx >= minIdx;

    }

    case 'quest_state':

      return true; // Simplified — quests are managed by the API

    case 'flag':

      return cond.flag ? (ws.flags[cond.flag] ?? false) === (cond.value ?? true) : false;

    case 'inventory':

      return cond.itemId ? (ws.inventory[cond.itemId] ?? 0) >= (cond.min ?? 1) : false;

    default:

      return true;

  }

}



export function getAvailableResponses(tree: DialogueTree, nodeId: string, ws: WorldStateSnapshot): DialogueResponse[] {

  const node = tree.nodes[nodeId];

  if (!node) return [];

  const available: DialogueResponse[] = [];

  for (const resp of node.responses) {

    const allMet = resp.responseConditions.every(c => evaluateCondition(c, ws));

    if (allMet) available.push(resp);

  }

  // Always ensure at least a "Leave" option (per doc 34 §1.2)

  if (available.length === 0 && nodeId !== 'END') {

    available.push({

      responseId: 'leave',

      playerLine: '(Leave)',

      responseConditions: [],

      consequences: [],

      nextNodeId: 'END',

    });

  }

  return available;

}



export function isQuestComplete(quest: Quest): boolean {

  return quest.objectives.length > 0 && quest.objectives.every(o => o.completed);

}



export function isQuestExpired(quest: Quest, currentTick: number): boolean {

  return quest.deadlineTick !== null && currentTick > quest.deadlineTick;

}



export function computeSmoothedApproval(approval: number, history: SharedExperience[], windowDays: number): number {

  if (history.length === 0) return approval;

  const recentDelta = history

    .slice(-10) // simplified: last 10 experiences

    .reduce((sum, e) => sum + e.approvalDelta, 0);

  const weight = Math.min(1, history.length / 10);

  return approval * (1 - weight * 0.3) + (approval + recentDelta / 10) * (weight * 0.3);

}



export function canExchangeCut(romance: RomanceState, currentTick: number, maxPerDay: number): boolean {

  if (romance.stage === 'ended') return false;

  if (romance.lastCutTick !== null && (currentTick - romance.lastCutTick) < 24 * 60) return false;

  return true;

}



export function applyCut(romance: RomanceState, cut: Omit<CutExchange, 'cutId'>): RomanceState {

  return {

    ...romance,

    cutsExchanged: [...romance.cutsExchanged, { ...cut, cutId: `cut-${romance.cutsExchanged.length}` }],

    intensity: clamp(romance.intensity + cut.intensityDelta, 0, 1),

    stability: clamp(romance.stability + cut.stabilityDelta, 0, 1),

    honesty: clamp(romance.honesty + cut.honestyDelta, 0, 1),

    lastCutTick: cut.tick,

  };

}



// ============================================================================

// Quest API Implementation

// ============================================================================



export function createQuestApi(maxCutsPerDay = 1): QuestApi {

  const dialogueTrees = new Map<string, DialogueTree>();

  const quests = new Map<string, Quest>();

  const companions = new Map<string, Companion>();

  const romances = new Map<string, RomanceState>();

  const companionArcs = new Map<string, CompanionArc>();

  let spine: NarrativeSpine | null = null;

  const endingTriggers: EndingTrigger[] = [];

  const tiers = new Map<string, SimulationTier>();



  // ---- Dialogue ----



  function registerDialogueTree(tree: DialogueTree): boolean {

    if (dialogueTrees.has(tree.treeId)) return false;

    dialogueTrees.set(tree.treeId, tree);

    return true;

  }



  function getDialogueTree(treeId: string): DialogueTree | undefined {

    return dialogueTrees.get(treeId);

  }



  function listDialogueTrees(): string[] {

    return Array.from(dialogueTrees.keys());

  }



  function evaluateDialogueConditions(treeId: string, nodeId: string, ws: WorldStateSnapshot): string[] {

    const tree = dialogueTrees.get(treeId);

    if (!tree) return [];

    const available = getAvailableResponses(tree, nodeId, ws);

    return available.map(r => r.responseId);

  }



  function applyConsequences(consequences: DialogueConsequence[], ws: WorldStateSnapshot): void {

    for (const c of consequences) {

      if (c.type === 'add_knowledge_fact' && typeof c.value === 'string') {

        if (!ws.knowledgeFacts.includes(c.value)) ws.knowledgeFacts.push(c.value);

      }

      if (c.type === 'set_flag' && c.flag) {

        ws.flags[c.flag] = c.value as boolean;

      }

      if (c.type === 'modify_relationship' && c.target && typeof c.value === 'number') {

        ws.relationships[keyOf(c.target as EntityId)] = c.value;

      }

    }

  }



  // ---- Quest ----



  function createQuest(quest: Quest): string {

    quests.set(quest.questId, quest);

    return quest.questId;

  }



  function getQuest(questId: string): Quest | undefined {

    return quests.get(questId);

  }



  function listQuests(status?: Quest['status']): Quest[] {

    const all = Array.from(quests.values());

    if (status) return all.filter(q => q.status === status);

    return all;

  }



  function activateQuest(questId: string): boolean {

    const q = quests.get(questId);

    if (!q || q.status !== 'available') return false;

    q.status = 'active';

    return true;

  }



  function completeObjective(questId: string, objectiveId: string): boolean {

    const q = quests.get(questId);

    if (!q || q.status !== 'active') return false;

    const obj = q.objectives.find(o => o.objectiveId === objectiveId);

    if (!obj || obj.completed) return false;

    obj.completed = true;

    if (isQuestComplete(q)) q.status = 'completed';

    return true;

  }



  function completeQuest(questId: string): boolean {

    const q = quests.get(questId);

    if (!q || q.status !== 'active') return false;

    q.objectives.forEach(o => { o.completed = true; });

    q.status = 'completed';

    return true;

  }



  function failQuest(questId: string): boolean {

    const q = quests.get(questId);

    if (!q || (q.status !== 'active' && q.status !== 'available')) return false;

    q.status = 'failed';

    return true;

  }



  function expireQuests(currentTick: number): number {

    let count = 0;

    for (const q of quests.values()) {

      if ((q.status === 'available' || q.status === 'active') && isQuestExpired(q, currentTick)) {

        q.status = 'expired';

        count++;

      }

    }

    return count;

  }



  // ---- Companion ----



  function createCompanion(npcId: EntityId, arcId: string | null): Companion {

    const companion: Companion = {

      npcId,

      joinType: 'relationship_threshold',

      joinTick: null,

      leaveType: null,

      leaveTick: null,

      approval: 0,

      smoothedApproval: 0,

      trust: 0,

      familiarity: 0,

      sharedExperiences: [],

      personalArc: arcId ? companionArcs.get(arcId) ?? { arcId, stages: [] as CompanionArcStage[], currentStage: 0 } : null,

    };

    companions.set(keyOf(npcId), companion);

    return companion;

  }



  function getCompanion(npcId: EntityId): Companion | undefined {

    return companions.get(keyOf(npcId));

  }



  function removeCompanion(npcId: EntityId): boolean {

    return companions.delete(keyOf(npcId));

  }



  function listCompanions(): EntityId[] {

    return Array.from(companions.values()).map(c => c.npcId);

  }



  function addSharedExperience(npcId: EntityId, exp: SharedExperience): boolean {

    const c = companions.get(keyOf(npcId));

    if (!c) return false;

    c.sharedExperiences.push(exp);

    c.approval = clamp(c.approval + exp.approvalDelta, -1, 1);

    c.trust = clamp(c.trust + exp.approvalDelta * 0.5, 0, 1);

    c.familiarity = clamp(c.familiarity + 0.02, 0, 1);

    return true;

  }



  function updateApproval(npcId: EntityId, delta: number, currentTick: number): void {

    const c = companions.get(keyOf(npcId));

    if (!c) return;

    c.approval = clamp(c.approval + delta, -1, 1);

    c.smoothedApproval = computeSmoothedApproval(c.approval, c.sharedExperiences, 30);

  }



  function advanceCompanionArc(npcId: EntityId): number {

    const c = companions.get(keyOf(npcId));

    if (!c || !c.personalArc) return -1;

    const arc = c.personalArc;

    if (arc.currentStage < arc.stages.length - 1) {

      arc.currentStage++;

      return arc.currentStage;

    }

    return -1;

  }



  // ---- Romance ----



  function createRomance(p1: EntityId, p2: EntityId): string {

    const id = `romance-${keyOf(p1)}-${keyOf(p2)}`;

    if (romances.has(id)) return id;

    romances.set(id, {

      partner1Id: p1,

      partner2Id: p2,

      stage: 'unmet',

      cutsExchanged: [],

      intensity: 0,

      stability: 0,

      honesty: 0,

      lastCutTick: null,

    });

    return id;

  }



  function getRomance(romanceId: string): RomanceState | undefined {

    return romances.get(romanceId);

  }



  function listRomances(): RomanceState[] {

    return Array.from(romances.values());

  }



  function exchangeCut(romanceId: string, cut: Omit<CutExchange, 'cutId'>): boolean {

    const r = romances.get(romanceId);

    if (!r) return false;

    if (!canExchangeCut(r, cut.tick, maxCutsPerDay)) return false;

    const updated = applyCut(r, cut);

    romances.set(romanceId, updated);


    // Advance romance stage (let, not else-if chain)
    let newStage = updated.stage;
    if (newStage === 'unmet' && updated.honesty > 0.1) newStage = 'acquaintance';
    if (newStage === 'acquaintance' && updated.intensity > 0.3) newStage = 'tension';
    if (newStage === 'tension' && updated.cutsExchanged.length >= 1) newStage = 'first_cut';
    if (newStage === 'first_cut' && updated.intensity > 0.6 && updated.honesty > 0.5) newStage = 'courtship';
    if (newStage === 'courtship' && updated.stability > 0.7 && updated.honesty > 0.7) newStage = 'commitment';
    if (newStage === 'commitment' && updated.stability > 0.9) newStage = 'marriage';
    // Demotion ladder: only meaningful for romances that have progressed to
    // courtship or beyond. Early stages (unmet/acquaintance/tension/first_cut)
    // naturally have low stability/intensity at startup, so without this guard
    // every new romance would instantly decay to 'estrangement' then 'ended'.
    const committedStages = ['courtship', 'commitment', 'marriage'];
    if (committedStages.includes(newStage) && updated.stability < 0.2 && updated.intensity < 0.2) {
      newStage = 'estrangement';
    }
    if ((newStage === 'estrangement' || committedStages.includes(newStage)) && updated.stability < 0.05) {
      newStage = 'ended';
    }
    updated.stage = newStage;
    romances.set(romanceId, updated);
    return true;
  }

  function getMaxCutsPerDay(): number {

    return maxCutsPerDay;

  }



  // ---- Narrative Spine ----



  function createSpine(beats: NarrativeBeat[], maxMissedPerAct = 2): NarrativeSpine {

    spine = {

      acts: [

        { actNumber: 1, beats: beats.filter(b => b.actNumber === 1) },

        { actNumber: 2, beats: beats.filter(b => b.actNumber === 2) },

        { actNumber: 3, beats: beats.filter(b => b.actNumber === 3) },

      ],

      currentAct: 1,

      beatsCompleted: [],

      beatsMissed: [],

      maxMissedPerAct,

      driftMode: false,

    };

    return spine;

  }



  function getSpine(): NarrativeSpine | undefined {

    return spine ?? undefined;

  }



  function checkBeats(ws: WorldStateSnapshot, currentTick: number): string[] {

    if (!spine) return [];

    const fired: string[] = [];

    for (const act of spine.acts) {

    if (act.actNumber !== spine.currentAct) continue;

    for (const beat of act.beats) {

      if (beat.fired) continue;

      // Simplified: check session range

      const session = Math.floor(currentTick / (60 * 60 * 24)); // rough session count

      if (session >= beat.sessionRange[1] && beat.missable) {

        // Missed: session exceeded max

        spine.beatsMissed.push(beat.beatId);

        beat.fired = true;

        beat.firedAtTick = currentTick;

        continue;

      }

      // Simplified fire check: if enough ticks have passed and player has some knowledge

      if (session >= beat.sessionRange[0] && ws.knowledgeFacts.length > 0) {

        beat.fired = true;

        beat.firedAtTick = currentTick;

        spine.beatsCompleted.push(beat.beatId);

        fired.push(beat.beatId);

      }

    }

    // Check for drift mode

    const missedInAct = spine.beatsMissed.filter(b => {

      return act.beats.some(ab => ab.beatId === b);

    }).length;

    if (missedInAct >= spine.maxMissedPerAct) {

      spine.driftMode = true;

    }

    // Advance act

    if (act.beats.every(b => b.fired) && spine.currentAct < 3) {

      spine.currentAct = (spine.currentAct + 1) as 1 | 2 | 3;

    }

  }

    return fired;

}



  function enterDriftMode(): void {

    if (spine) spine.driftMode = true;

  }



  // ---- Endings ----



  function registerEnding(trigger: EndingTrigger): boolean {

    endingTriggers.push(trigger);

    return true;

  }



  function checkEndings(ws: WorldStateSnapshot): Ending[] {

    const endings: Ending[] = [];

    for (const t of endingTriggers) {

      // Simplified: check if any ending condition is met

      const met = ws.playerRealm === 'mahayana' || ws.flags['final_battle_won'] === true;

      if (met) {

        endings.push({

          endingId: t.endingId,

          title: t.endingId,

          moralWeight: 'triumph' as MoralWeight,

        });

      }

    }

    if (endings.length === 0 && ws.flags) {

      // Default ending

      endings.push({

        endingId: 'default_ending',

        title: 'A Quiet Epilogue',

        moralWeight: 'ambiguous' as MoralWeight,

      });

    }

    return endings;

  }



  // ---- Tier ----



  function setTier(npcId: EntityId, tier: SimulationTier): void {

    tiers.set(keyOf(npcId), tier);

  }



  function getTier(npcId: EntityId): SimulationTier {

    return tiers.get(keyOf(npcId)) ?? 4;

  }



  // ---- Stats ----



  function stats(): QuestStats {

    const byStatus: Record<Quest['status'], number> = {

      available: 0, active: 0, completed: 0, failed: 0, expired: 0,

    };

    let totalCutExchanges = 0;

    for (const q of quests.values()) byStatus[q.status]++;

    for (const r of romances.values()) totalCutExchanges += r.cutsExchanged.length;

    return {

      totalQuests: quests.size,

      byStatus,

      totalCompanions: companions.size,

      totalRomances: romances.size,

      totalCutExchanges,

      spineBeatsFired: spine?.beatsCompleted.length ?? 0,

      spineBeatsMissed: spine?.beatsMissed.length ?? 0,

    };

  }



  return {

    registerDialogueTree, getDialogueTree, listDialogueTrees,

    evaluateDialogueConditions, applyConsequences,

    createQuest, getQuest, listQuests,

    activateQuest, completeObjective, completeQuest, failQuest, expireQuests,

    createCompanion, getCompanion, removeCompanion, listCompanions,

    addSharedExperience, updateApproval, advanceCompanionArc,

    createRomance, getRomance, listRomances,

    exchangeCut, getMaxCutsPerDay,

    createSpine, getSpine, checkBeats, enterDriftMode,

    registerEnding, checkEndings,

    setTier, getTier,

    stats,

  };

}



// ============================================================================

// Plugin Definition

// ============================================================================


export function createQuestPlugin(): Plugin {

  let api: QuestApi | null = null;



  return {

    id: 'ga:quest',

    version: '0.1.0',

    dependencies: ['ga:determinism'],



    init(host: PluginHost) {

      api = createQuestApi();

      host.capabilities.register({

        capability: 'quest.dialogue',

        provider: 'ga:quest',

        version: '0.1.0',

        instance: api,

      });

      host.capabilities.register({

        capability: 'quest.state',

        provider: 'ga:quest',

        version: '0.1.0',

        instance: api,

      });

      host.capabilities.register({

        capability: 'quest.narrative',

        provider: 'ga:quest',

        version: '0.1.0',

        instance: api,

      });

      host.setState('ga:quest', api);

      console.log('[ga:quest] Initialized — 3 capabilities registered');

    },



    destroy(host: PluginHost) {

      host.capabilities.unregister('quest.dialogue', 'ga:quest');

      host.capabilities.unregister('quest.state', 'ga:quest');

      host.capabilities.unregister('quest.narrative', 'ga:quest');

      api = null;

      console.log('[ga:quest] Destroyed');

    },

  };

}
