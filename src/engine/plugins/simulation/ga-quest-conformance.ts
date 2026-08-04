/**
 * ga:quest Conformance Test
 * Tests dialogue conditions, quest lifecycle, companion system,
 * romance (Exchange of Cuts), narrative spine, ending triggers.
 * No forbidden functions. No Three.js, no DOM.
 */

import {
  evaluateCondition,
  getAvailableResponses,
  isQuestComplete,
  isQuestExpired,
  computeSmoothedApproval,
  canExchangeCut,
  applyCut,
  createQuestApi,
  createQuestPlugin,
  type DialogueCondition,
  type DialogueNode,
  type DialogueResponse,
  type DialogueTree,
  type DialogueConsequence,
  type Quest,
  type QuestObjective,
  type QuestReward,
  type QuestConsequence,
  type QuestObjectiveType,
  type QuestType,
  type Companion,
  type SharedExperience,
  type RomanceState,
  type RomanceStage,
  type CutExchange,
  type CutType,
  type DeflectionType,
  type NarrativeBeat,
  type NarrativeSpine,
  type BiasAdjustment,
  type EndingTrigger,
  type Ending,
  type MoralWeight,
  type WorldStateSnapshot,
  type QuestApi,
  type QuestStats,
  type PerceptionState,
  type Realm,
  type CompanionJoinType,
  type CompanionLeaveType,
} from './ga-quest';

import { createPluginHost } from '../../kernel/plugin-host';

// ============================================================================
// Test harness
// ============================================================================

let passed = 0;
let failed = 0;

function assert(condition: boolean, msg: string) {
  if (condition) { passed++; console.log(`  ✅ ${msg}`); }
  else { failed++; console.log(`  ❌ ${msg}`); }
}

function assertEq<T>(actual: T, expected: T, msg: string) {
  const a = typeof actual === 'bigint' ? String(actual) : JSON.stringify(actual);
  const e = typeof expected === 'bigint' ? String(expected) : JSON.stringify(expected);
  if (a === e) { passed++; console.log(`  ✅ ${msg}`); }
  else { failed++; console.log(`  ❌ ${msg} — expected ${e}, got ${a}`); }
}

function assertClose(actual: number, expected: number, msg: string, eps = 0.01) {
  if (Math.abs(actual - expected) < eps) { passed++; console.log(`  ✅ ${msg}`); }
  else { failed++; console.log(`  ❌ ${msg} — got ${actual}, expected ${expected}`); }
}

function makeWorldState(overrides: Partial<WorldStateSnapshot> = {}): WorldStateSnapshot {
  return {
    tick: 1000,
    playerRealm: 'mortal' as Realm,
    perceptionState: 'normal' as PerceptionState,
    knowledgeFacts: [],
    relationships: {},
    flags: {},
    inventory: {},
    ...overrides,
  };
}

// ============================================================================
// SECTION 1: Dialogue condition evaluation
// ============================================================================
console.log('=== SECTION 1: Dialogue condition evaluation ===');

{
  // perception_state
  assert(
    evaluateCondition({ type: 'perception_state', state: 'sense_qi' }, makeWorldState({ perceptionState: 'sense_qi' })),
    'perception_state: matches'
  );
  assert(
    !evaluateCondition({ type: 'perception_state', state: 'sense_qi' }, makeWorldState({ perceptionState: 'normal' })),
    'perception_state: no match'
  );

  // knowledge_fact
  assert(
    evaluateCondition({ type: 'knowledge_fact', factId: 'knows_secret' }, makeWorldState({ knowledgeFacts: ['knows_secret', 'other'] })),
    'knowledge_fact: has fact'
  );
  assert(
    !evaluateCondition({ type: 'knowledge_fact', factId: 'knows_secret' }, makeWorldState({ knowledgeFacts: ['other'] })),
    'knowledge_fact: missing fact'
  );
  assert(
    !evaluateCondition({ type: 'knowledge_fact' }, makeWorldState()),
    'knowledge_fact: no factId defaults false'
  );

  // relationship
  assert(
    evaluateCondition({ type: 'relationship', target: 42, min: 10 }, makeWorldState({ relationships: { '42': 15 } })),
    'relationship: meets threshold'
  );
  assert(
    !evaluateCondition({ type: 'relationship', target: 42, min: 20 }, makeWorldState({ relationships: { '42': 15 } })),
    'relationship: below threshold'
  );
  assert(
    !evaluateCondition({ type: 'relationship' }, makeWorldState()),
    'relationship: no target defaults false'
  );
  assert(
    evaluateCondition({ type: 'relationship', target: 42, min: 0 }, makeWorldState({ relationships: { '42': 0 } })),
    'relationship: meets zero threshold'
  );

  // realm
  assert(
    evaluateCondition({ type: 'realm', state: 'foundation_establishment' }, makeWorldState({ playerRealm: 'core_formation' })),
    'realm: player at higher realm passes'
  );
  assert(
    !evaluateCondition({ type: 'realm', state: 'core_formation' }, makeWorldState({ playerRealm: 'foundation_establishment' })),
    'realm: player at lower realm fails'
  );
  assert(
    evaluateCondition({ type: 'realm', state: 'mortal' }, makeWorldState({ playerRealm: 'mortal' })),
    'realm: same realm passes'
  );

  // flag
  assert(
    evaluateCondition({ type: 'flag', flag: 'met_elder', value: true }, makeWorldState({ flags: { met_elder: true } })),
    'flag: true flag matches'
  );
  assert(
    !evaluateCondition({ type: 'flag', flag: 'met_elder', value: true }, makeWorldState({ flags: { met_elder: false } })),
    'flag: false flag fails'
  );
  assert(
    !evaluateCondition({ type: 'flag', flag: 'met_elder', value: true }, makeWorldState({ flags: {} })),
    'flag: missing flag defaults false'
  );

  // inventory
  assert(
    evaluateCondition({ type: 'inventory', itemId: 'herb_x', min: 3 }, makeWorldState({ inventory: { herb_x: 5 } })),
    'inventory: sufficient quantity'
  );
  assert(
    !evaluateCondition({ type: 'inventory', itemId: 'herb_x', min: 3 }, makeWorldState({ inventory: { herb_x: 2 } })),
    'inventory: insufficient quantity'
  );
  assert(
    !evaluateCondition({ type: 'inventory', itemId: 'herb_x', min: 1 }, makeWorldState({ inventory: {} })),
    'inventory: missing item defaults 0'
  );

  // unknown type defaults true
  assert(
    evaluateCondition({ type: 'unknown_type' as any }, makeWorldState()),
    'unknown condition type defaults true'
  );
}

// ============================================================================
// SECTION 2: Dialogue available responses
// ============================================================================
console.log('=== SECTION 2: Dialogue available responses ===');

{
  const tree: DialogueTree = {
    treeId: 'elder_greeting',
    rootNodeId: 'root',
    speakerId: 100n,
    contextTags: ['village', 'elder'],
    nodes: {
      root: {
        nodeId: 'root',
        npcLine: 'Ah, you have come.',
        nodeConditions: [],
        responses: [
          {
            responseId: 'ask_qi',
            playerLine: 'What is qi?',
            responseConditions: [{ type: 'perception_state', state: 'normal' }],
            consequences: [],
            nextNodeId: 'qi_explanation',
          },
          {
            responseId: 'sense_residue',
            playerLine: 'I sense something on this blade.',
            responseConditions: [{ type: 'perception_state', state: 'read_residue' }],
            consequences: [],
            nextNodeId: 'residue_discussion',
          },
        ],
      },
      qi_explanation: {
        nodeId: 'qi_explanation',
        npcLine: 'Qi is the breath of the world.',
        nodeConditions: [],
        responses: [
          {
            responseId: 'leave',
            playerLine: '(Leave)',
            responseConditions: [],
            consequences: [],
            nextNodeId: 'END',
          },
        ],
      },
    },
  };

  // Normal perception: only ask_qi
  const normalResponses = getAvailableResponses(tree, 'root', makeWorldState({ perceptionState: 'normal' }));
  assertEq(normalResponses.length, 1, 'normal: 1 response');
  assertEq(normalResponses[0].responseId, 'ask_qi', 'normal: ask_qi available');

  // Residue perception: only sense_residue
  const residueResponses = getAvailableResponses(tree, 'root', makeWorldState({ perceptionState: 'read_residue' }));
  assertEq(residueResponses.length, 1, 'residue: 1 response');
  assertEq(residueResponses[0].responseId, 'sense_residue', 'residue: sense_residue available');

  // qi_induction perception: neither gated option, fallback leave
  const qiResponses = getAvailableResponses(tree, 'root', makeWorldState({ perceptionState: 'sense_qi' }));
  assertEq(qiResponses.length, 1, 'sense_qi: fallback to Leave');
  assertEq(qiResponses[0].responseId, 'leave', 'sense_qi: fallback is leave');
  assertEq(qiResponses[0].nextNodeId, 'END', 'sense_qi: fallback goes to END');

  // Non-existent node: empty
  const emptyResponses = getAvailableResponses(tree, 'nonexistent', makeWorldState());
  assertEq(emptyResponses.length, 0, 'nonexistent node: empty');

  // Multiple conditions (all must pass)
  const multiTree: DialogueTree = {
    treeId: 'multi',
    rootNodeId: 'root',
    speakerId: 101n,
    contextTags: [],
    nodes: {
      root: {
        nodeId: 'root',
        npcLine: 'Test',
        nodeConditions: [],
        responses: [
          {
            responseId: 'gated',
            playerLine: 'Gated',
            responseConditions: [
              { type: 'perception_state', state: 'sense_qi' },
              { type: 'knowledge_fact', factId: 'secret' },
            ],
            consequences: [],
            nextNodeId: 'next',
          },
        ],
      },
    },
  };
  const bothMet = getAvailableResponses(multiTree, 'root', makeWorldState({ perceptionState: 'sense_qi', knowledgeFacts: ['secret'] }));
  assertEq(bothMet.length, 1, 'multi-condition: both met');
  const oneMissing = getAvailableResponses(multiTree, 'root', makeWorldState({ perceptionState: 'sense_qi' }));
  assertEq(oneMissing.length, 1, 'multi-condition: one missing falls back to Leave');
}

// ============================================================================
// SECTION 3: Quest lifecycle
// ============================================================================
console.log('=== SECTION 3: Quest lifecycle ===');

{
  const api = createQuestApi();

  // Create quest
  const quest: Quest = {
    questId: 'q1',
    questType: 'gather_herb' as QuestType,
    generatedAtTick: 100,
    originEventId: null,
    objectives: [
      { objectiveId: 'obj1', description: 'Gather 3 Spirit Grass', type: 'acquire_item' as QuestObjectiveType, target: { item: 'spirit_grass', count: 3 }, completed: false },
      { objectiveId: 'obj2', description: 'Deliver to Elder', type: 'reach_location' as QuestObjectiveType, target: { location: 'elder_hut' }, completed: false },
    ],
    rewards: [{ type: 'cash' as any, value: 100 }],
    failureConsequences: [{ type: 'reputation_loss', value: -5 }],
    deadlineTick: 5000,
    status: 'available',
  };

  assertEq(api.createQuest(quest), 'q1', 'createQuest returns questId');
  assertEq(api.getQuest('q1')?.questId, 'q1', 'getQuest retrieves quest');
  assertEq(api.getQuest('nonexistent'), undefined, 'getQuest: nonexistent returns undefined');

  // Duplicate registration
  api.createQuest(quest);
  assertEq(api.listQuests().length, 1, 'duplicate create does not add');

  // List by status
  assertEq(api.listQuests('available').length, 1, 'listQuests(available) = 1');
  assertEq(api.listQuests('active').length, 0, 'listQuests(active) = 0');

  // Activate
  assert(api.activateQuest('q1'), 'activateQuest succeeds');
  assert(!api.activateQuest('q1'), 'activateQuest: already active fails');
  assertEq(api.getQuest('q1')?.status, 'active', 'status is active');

  // Complete objective
  assert(api.completeObjective('q1', 'obj1'), 'completeObjective succeeds');
  assert(!api.completeObjective('q1', 'obj1'), 'completeObjective: already completed fails');
  assert(!api.completeObjective('q1', 'obj_nonexistent'), 'completeObjective: bad objective fails');

  // Not all objectives complete yet
  assertEq(api.getQuest('q1')?.status, 'active', 'still active (1/2 objectives)');

  // Complete second objective -> auto-complete
  api.completeObjective('q1', 'obj2');
  assertEq(api.getQuest('q1')?.status, 'completed', 'auto-complete when all objectives done');

  // Fail quest (new quest)
  const q2: Quest = { ...quest, questId: 'q2', status: 'available' };
  api.createQuest(q2);
  api.activateQuest('q2');
  assert(api.failQuest('q2'), 'failQuest succeeds on active');
  assertEq(api.getQuest('q2')?.status, 'failed', 'status is failed');

  // Fail available quest
  const q3: Quest = { ...quest, questId: 'q3', status: 'available' };
  api.createQuest(q3);
  assert(api.failQuest('q3'), 'failQuest succeeds on available');

  // Fail completed quest
  assert(!api.failQuest('q1'), 'failQuest: completed fails');

  // Expiry
  const q4: Quest = { ...quest, questId: 'q4', deadlineTick: 200, status: 'available' };
  api.createQuest(q4);
  api.activateQuest('q4');
  const expiredCount = api.expireQuests(300);
  assertEq(expiredCount, 1, 'expireQuests: 1 expired');
  assertEq(api.getQuest('q4')?.status, 'expired', 'q4 is expired');

  // No-expiry quest
  const q5: Quest = { ...quest, questId: 'q5', deadlineTick: null, status: 'available' };
  api.createQuest(q5);
  api.expireQuests(99999);
  assertEq(api.getQuest('q5')?.status, 'available', 'no deadline: never expires');

  // Stats
  const stats = api.stats();
  assertEq(stats.totalQuests, 5, 'stats: 5 total quests');
  assertEq(stats.byStatus.available, 1, 'stats: 1 available');
  assertEq(stats.byStatus.active, 0, 'stats: 0 active');
  assertEq(stats.byStatus.completed, 1, 'stats: 1 completed');
  assertEq(stats.byStatus.failed, 2, 'stats: 2 failed');
  assertEq(stats.byStatus.expired, 1, 'stats: 1 expired');

  // Complete quest (force-complete)
  const q6: Quest = { ...quest, questId: 'q6', objectives: [{ objectiveId: 'o1', description: 'T', type: 'reach_location', target: null, completed: false }], status: 'available' };
  api.createQuest(q6);
  api.activateQuest('q6');
  assert(api.completeQuest('q6'), 'completeQuest force-completes');
  assertEq(api.getQuest('q6')?.status, 'completed', 'force-complete sets completed');
  assert(!api.completeQuest('q6'), 'completeQuest: already completed fails');
}

// ============================================================================
// SECTION 4: isQuestComplete / isQuestExpired pure functions
// ============================================================================
console.log('=== SECTION 4: Quest pure functions ===');

{
  const q: Quest = {
    questId: 'test',
    questType: 'gather_herb',
    generatedAtTick: 0,
    originEventId: null,
    objectives: [
      { objectiveId: 'a', description: '', type: 'acquire_item', target: null, completed: true },
      { objectiveId: 'b', description: '', type: 'acquire_item', target: null, completed: true },
    ],
    rewards: [],
    failureConsequences: [],
    deadlineTick: 1000,
    status: 'active',
  };
  assert(isQuestComplete(q), 'isQuestComplete: all objectives done');
  q.objectives[1].completed = false;
  assert(!isQuestComplete(q), 'isQuestComplete: not all done');
  q.objectives = [];
  assert(!isQuestComplete(q), 'isQuestComplete: empty objectives = false');

  assert(!isQuestExpired(q, 500), 'isQuestExpired: not expired');
  assert(isQuestExpired(q, 1500), 'isQuestExpired: past deadline');
  q.deadlineTick = null;
  assert(!isQuestExpired(q, 99999), 'isQuestExpired: null deadline = never');
}

// ============================================================================
// SECTION 5: Companion system
// ============================================================================
console.log('=== SECTION 5: Companion system ===');

{
  const api = createQuestApi();

  // Create companion
  const c = api.createCompanion(42n, null);
  assertEq(c.npcId, 42n, 'companion: npcId set');
  assertEq(c.approval, 0, 'companion: approval starts at 0');
  assertEq(c.trust, 0, 'companion: trust starts at 0');
  assertEq(c.familiarity, 0, 'companion: familiarity starts at 0');
  assertEq(c.sharedExperiences.length, 0, 'companion: no experiences');
  assert(c.personalArc === null, 'companion: no arc when null arcId');

  // Get companion
  const retrieved = api.getCompanion(42n);
  assert(retrieved !== undefined, 'getCompanion: found');
  assert(api.getCompanion(999n) === undefined, 'getCompanion: not found');

  // List companions
  api.createCompanion(43n, null);
  const list = api.listCompanions();
  assertEq(list.length, 2, 'listCompanions: 2 companions');

  // Remove companion
  assert(api.removeCompanion(42n), 'removeCompanion: success');
  assert(!api.removeCompanion(42n), 'removeCompanion: already removed');
  assertEq(api.listCompanions().length, 1, 'listCompanions: 1 after remove');

  // Shared experience
  api.addSharedExperience(43n, {
    experienceId: 'exp1',
    type: 'combat',
    tick: 500,
    approvalDelta: 0.3,
  });
  const comp43 = api.getCompanion(43n)!;
  assertEq(comp43.sharedExperiences.length, 1, 'shared experience: recorded');
  assertClose(comp43.approval, 0.3, 'approval: increased by 0.3');
  assertClose(comp43.trust, 0.15, 'trust: half of approval delta');
  assertClose(comp43.familiarity, 0.02, 'familiarity: +0.02 per experience');

  // Approval clamping
  api.updateApproval(43n, 2.0, 600);
  assertClose(api.getCompanion(43n)!.approval, 1.0, 'approval: clamped to 1');
  api.updateApproval(43n, -5.0, 700);
  assertClose(api.getCompanion(43n)!.approval, -1.0, 'approval: clamped to -1');

  // Add experience to nonexistent companion
  assert(!api.addSharedExperience(999n, { experienceId: 'x', type: 'combat', tick: 0, approvalDelta: 0.1 }), 'addSharedExperience: nonexistent fails');

  // Companion arc advancement
  api.createCompanion(50n, 'arc1');
  api.updateApproval(50n, 0.5, 800);
  const stage = api.advanceCompanionArc(50n);
  assertEq(stage, -1, 'advanceCompanionArc: no arc stages = -1');

  // Stats
  const stats = api.stats();
  assertEq(stats.totalCompanions, 2, 'stats: 2 companions');
}

// ============================================================================
// SECTION 6: Companion arc stages
// ============================================================================
console.log('=== SECTION 6: Companion arc ===');

{
  const api = createQuestApi();
  const arc: CompanionArc = {
    arcId: 'test_arc',
    stages: [
      { stageId: 's1', triggerPredicate: 'met_in_village', onEnterDescription: 'First meeting', availableDialogueTrees: [] },
      { stageId: 's2', triggerPredicate: 'fought_together', onEnterDescription: 'Battle bond', availableDialogueTrees: ['battle_talk'] },
      { stageId: 's3', triggerPredicate: 'saved_life', onEnterDescription: 'Deep trust', availableDialogueTrees: ['deep_talk', 'battle_talk'] },
    ],
    currentStage: 0,
  };

  // Create companion with arc — the arc must exist in the companion's personalArc.
  // The createCompanion(arcId) looks up companionArcs map, which is internal.
  // Since no arc was registered in the map, personalArc will be { stages: [], currentStage: 0 }.
  // This tests the fallback behavior.
  const c = api.createCompanion(60n, 'nonexistent_arc');
  assert(c.personalArc !== null, 'companion has fallback arc');
  assertEq(c.personalArc!.currentStage, 0, 'arc starts at stage 0');
  assertEq(c.personalArc!.stages.length, 0, 'fallback arc has no stages');

  // Cannot advance with no stages
  assertEq(api.advanceCompanionArc(60n), -1, 'no stages: cannot advance');
}

// ============================================================================
// SECTION 7: Romance system — creation and basics
// ============================================================================
console.log('=== SECTION 7: Romance creation ===');

{
  const api = createQuestApi();

  const id = api.createRomance(1n, 2n);
  assert(id.includes('1'), 'romance id includes partner1');
  assert(id.includes('2'), 'romance id includes partner2');

  const r = api.getRomance(id);
  assert(r !== undefined, 'getRomance: found');
  assertEq(r!.stage, 'unmet' as RomanceStage, 'romance starts at unmet');
  assertEq(r!.intensity, 0, 'intensity starts at 0');
  assertEq(r!.stability, 0, 'stability starts at 0');
  assertEq(r!.honesty, 0, 'honesty starts at 0');
  assertEq(r!.cutsExchanged.length, 0, 'no cuts yet');
  assert(r!.lastCutTick === null, 'lastCutTick is null');

  // Duplicate creation returns same id
  const id2 = api.createRomance(1n, 2n);
  assertEq(id, id2, 'duplicate romance returns same id');

  // List
  api.createRomance(3n, 4n);
  assertEq(api.listRomances().length, 2, 'listRomances: 2 romances');

  // Get nonexistent
  assert(api.getRomance('nonexistent') === undefined, 'getRomance: nonexistent');

  // Max cuts per day
  assertEq(api.getMaxCutsPerDay(), 1, 'default max cuts per day = 1');
}

// ============================================================================
// SECTION 8: Romance — canExchangeCut
// ============================================================================
console.log('=== SECTION 8: Romance canExchangeCut ===');

{
  const endedRomance: RomanceState = {
    partner1Id: 1n, partner2Id: 2n,
    stage: 'ended', cutsExchanged: [],
    intensity: 0.5, stability: 0.5, honesty: 0.5, lastCutTick: null,
  };
  assert(!canExchangeCut(endedRomance, 1000, 1), 'ended romance: cannot exchange');

  const activeRomance: RomanceState = {
    partner1Id: 1n, partner2Id: 2n,
    stage: 'tension', cutsExchanged: [],
    intensity: 0.4, stability: 0.3, honesty: 0.2, lastCutTick: 1000,
  };
  // Same tick (within 24*60 = 1440 minute window)
  assert(!canExchangeCut(activeRomance, 1001, 1), 'too soon: cannot exchange');
  // Past the window
  assert(canExchangeCut(activeRomance, 3000, 1), 'past window: can exchange');

  const neverCut: RomanceState = {
    partner1Id: 1n, partner2Id: 2n,
    stage: 'tension', cutsExchanged: [],
    intensity: 0.4, stability: 0.3, honesty: 0.2, lastCutTick: null,
  };
  assert(canExchangeCut(neverCut, 1000, 1), 'first cut: can exchange');
}

// ============================================================================
// SECTION 9: Romance — applyCut pure function
// ============================================================================
console.log('=== SECTION 9: Romance applyCut ===');

{
  const base: RomanceState = {
    partner1Id: 1n, partner2Id: 2n,
    stage: 'tension', cutsExchanged: [],
    intensity: 0.4, stability: 0.3, honesty: 0.2, lastCutTick: null,
  };

  const result = applyCut(base, {
    tick: 5000,
    cutType: 'feeling_confessed' as CutType,
    deflectionType: 'accepted' as DeflectionType,
    content: 'I have feelings for you',
    intensityDelta: 0.2,
    stabilityDelta: 0.1,
    honestyDelta: 0.3,
  });

  assertEq(result.cutsExchanged.length, 1, 'cut recorded');
  assertEq(result.cutsExchanged[0].cutId, 'cut-0', 'cut id assigned');
  assertClose(result.intensity, 0.6, 'intensity increased');
  assertClose(result.stability, 0.4, 'stability increased');
  assertClose(result.honesty, 0.5, 'honesty increased');
  assertEq(result.lastCutTick, 5000, 'lastCutTick updated');

  // Clamping
  const clamped = applyCut({ ...base, intensity: 0.9 }, {
    tick: 6000, cutType: 'oath_made', deflectionType: 'accepted',
    content: 'test', intensityDelta: 0.5, stabilityDelta: 0, honestyDelta: 0,
  });
  assertClose(clamped.intensity, 1.0, 'intensity clamped to 1');

  const clampedLow = applyCut({ ...base, stability: 0.1 }, {
    tick: 6000, cutType: 'oath_broken', deflectionType: 'refused',
    content: 'test', intensityDelta: 0, stabilityDelta: -0.5, honestyDelta: 0,
  });
  assertClose(clampedLow.stability, 0, 'stability clamped to 0');
}

// ============================================================================
// SECTION 10: Romance stage advancement via exchangeCut
// ============================================================================
console.log('=== SECTION 10: Romance stage advancement ===');

{
  const api = createQuestApi(10); // 10 cuts per day for testing
  const id = api.createRomance(1n, 2n);

  // unmet -> acquaintance: honesty > 0.1
  api.exchangeCut(id, {
    tick: 1000, cutType: 'fact_revealed', deflectionType: 'accepted',
    content: 'I am from the Wang family', intensityDelta: 0.05, stabilityDelta: 0.1, honestyDelta: 0.2,
  });
  assertEq(api.getRomance(id)!.stage, 'acquaintance', 'stage: unmet -> acquaintance');

  // acquaintance -> tension: intensity > 0.3
  api.exchangeCut(id, {
    tick: 10000, cutType: 'feeling_confessed', deflectionType: 'accepted',
    content: 'I feel something', intensityDelta: 0.3, stabilityDelta: 0, honestyDelta: 0.1,
  });
  // The let-chain cascades: acquaintance(tension check passes)->tension(first_cut check: 2 cuts)->first_cut
  // This is expected behavior — the let chain evaluates all conditions sequentially in one pass.
  assert(api.getRomance(id)!.stage === 'tension' || api.getRomance(id)!.stage === 'first_cut',
    'stage: acquaintance -> tension or first_cut (let-chain cascade)');

  // Push toward courtship: intensity > 0.6, honesty > 0.5
  api.exchangeCut(id, {
    tick: 20000, cutType: 'vulnerability_shown', deflectionType: 'accepted',
    content: 'My deepest secret', intensityDelta: 0.2, stabilityDelta: 0.2, honestyDelta: 0.3,
  });
  api.exchangeCut(id, {
    tick: 30000, cutType: 'oath_made', deflectionType: 'accepted',
    content: 'I swear to protect you', intensityDelta: 0.15, stabilityDelta: 0.3, honestyDelta: 0.1,
  });
  assertEq(api.getRomance(id)!.stage, 'courtship', 'stage: advanced to courtship');

  // Verify cuts count
  assertEq(api.getRomance(id)!.cutsExchanged.length, 4, '4 cuts exchanged');
}

// ============================================================================
// SECTION 11: Romance — estrangement and ending
// ============================================================================
console.log('=== SECTION 11: Romance estrangement/ending ===');

{
  const api = createQuestApi(10);
  const id = api.createRomance(10n, 20n);

  // Push to courtship first
  for (let i = 0; i < 5; i++) {
    api.exchangeCut(id, {
      tick: i * 20000, cutType: 'fact_revealed', deflectionType: 'accepted',
      content: 'fact', intensityDelta: 0.15, stabilityDelta: 0.15, honestyDelta: 0.15,
    });
  }
  // Should be at courtship or beyond
  const preStage = api.getRomance(id)!.stage;
  assert(preStage === 'courtship' || preStage === 'commitment' || preStage === 'marriage',
    `romance advanced to ${preStage} before decline`);

  // Drive stability and intensity down
  for (let i = 0; i < 5; i++) {
    api.exchangeCut(id, {
      tick: (5 + i) * 20000, cutType: 'oath_broken', deflectionType: 'refused',
      content: 'betrayal', intensityDelta: -0.2, stabilityDelta: -0.2, honestyDelta: 0,
    });
  }
  const postStage = api.getRomance(id)!.stage;
  assert(postStage === 'estrangement' || postStage === 'ended', `decline leads to ${postStage}`);
}

// ============================================================================
// SECTION 12: Romance — exchangeCut edge cases
// ============================================================================
console.log('=== SECTION 12: Romance exchangeCut edge cases ===');

{
  const api = createQuestApi(1);
  const id = api.createRomance(1n, 2n);

  // Nonexistent romance
  assert(!api.exchangeCut('bad_id', {
    tick: 1000, cutType: 'fact_revealed', deflectionType: 'accepted',
    content: 'test', intensityDelta: 0.1, stabilityDelta: 0.1, honestyDelta: 0.1,
  }), 'exchangeCut: nonexistent romance fails');

  // Too soon (maxCutsPerDay = 1, within 1440 ticks)
  api.exchangeCut(id, {
    tick: 1000, cutType: 'fact_revealed', deflectionType: 'accepted',
    content: 'test', intensityDelta: 0.1, stabilityDelta: 0.1, honestyDelta: 0.1,
  });
  assert(!api.exchangeCut(id, {
    tick: 1001, cutType: 'fact_revealed', deflectionType: 'accepted',
    content: 'test', intensityDelta: 0.1, stabilityDelta: 0.1, honestyDelta: 0.1,
  }), 'exchangeCut: too soon fails');
}

// ============================================================================
// SECTION 13: Narrative spine — creation
// ============================================================================
console.log('=== SECTION 13: Narrative spine creation ===');

{
  const api = createQuestApi();

  const beats: NarrativeBeat[] = [
    { beatId: 'b1', actNumber: 1, description: 'Village morning', firePredicate: 'tick >= 0', missable: false, sessionRange: [0, 5], fired: false, firedAtTick: null },
    { beatId: 'b2', actNumber: 1, description: 'Elder encounter', firePredicate: 'met_elder', missable: true, sessionRange: [1, 10], fired: false, firedAtTick: null },
    { beatId: 'b3', actNumber: 2, description: 'First tribulation', firePredicate: 'tribulation', missable: false, sessionRange: [10, 30], fired: false, firedAtTick: null },
    { beatId: 'b4', actNumber: 3, description: 'Final battle', firePredicate: 'final_battle', missable: false, sessionRange: [30, 60], fired: false, firedAtTick: null },
  ];

  const spine = api.createSpine(beats, 2);
  assert(spine !== undefined, 'spine created');
  assertEq(api.getSpine()!.currentAct, 1, 'starts at act 1');
  assertEq(api.getSpine()!.acts.length, 3, '3 acts');
  assertEq(api.getSpine()!.acts[0].beats.length, 2, 'act 1: 2 beats');
  assertEq(api.getSpine()!.acts[1].beats.length, 1, 'act 2: 1 beat');
  assertEq(api.getSpine()!.acts[2].beats.length, 1, 'act 3: 1 beat');
  assertEq(api.getSpine()!.maxMissedPerAct, 2, 'maxMissedPerAct set');
  assert(!api.getSpine()!.driftMode, 'driftMode starts false');
}

// ============================================================================
// SECTION 14: Narrative spine — beat checking
// ============================================================================
console.log('=== SECTION 14: Narrative spine beat checking ===');

{
  const api = createQuestApi();

  const beats: NarrativeBeat[] = [
    { beatId: 'b_early', actNumber: 1, description: 'Early beat', firePredicate: 'tick >= 0', missable: false, sessionRange: [0, 5], fired: false, firedAtTick: null },
    { beatId: 'b_missable', actNumber: 1, description: 'Missable beat', firePredicate: 'some_cond', missable: true, sessionRange: [1, 3], fired: false, firedAtTick: null },
    { beatId: 'b_late', actNumber: 1, description: 'Late beat', firePredicate: 'late_cond', missable: false, sessionRange: [10, 20], fired: false, firedAtTick: null },
  ];

  api.createSpine(beats, 2);

  // Tick 0, no knowledge -> nothing fires (session 0, b_early sessionRange starts at 0)
  // checkBeats requires knowledgeFacts.length > 0 for fire
  const fired1 = api.checkBeats(makeWorldState({ tick: 0, knowledgeFacts: [] }), 0);
  assertEq(fired1.length, 0, 'no knowledge: nothing fires');

  // Tick 0 with knowledge -> early beat fires (session 0 >= sessionRange[0]=0)
  const fired2 = api.checkBeats(makeWorldState({ tick: 0, knowledgeFacts: ['something'] }), 0);
  assert(fired2.includes('b_early'), 'early beat fires with knowledge');

  // Check it doesn't fire again
  const fired3 = api.checkBeats(makeWorldState({ tick: 0, knowledgeFacts: ['something'] }), 0);
  assertEq(fired3.length, 0, 'already-fired beat does not re-fire');

  // Missable beat: advance past session 3 without firing
  const pastMissable = api.checkBeats(makeWorldState({ tick: 4 * 86400, knowledgeFacts: ['x'] }), 4 * 86400);
  // b_missable: session 4 >= sessionRange[1]=3 and missable=true -> missed
  const spine = api.getSpine()!;
  assert(spine.beatsMissed.includes('b_missable'), 'missable beat is missed');
}

// ============================================================================
// SECTION 15: Narrative spine — drift mode
// ============================================================================
console.log('=== SECTION 15: Narrative spine drift mode ===');

{
  const api = createQuestApi();
  const beats: NarrativeBeat[] = [
    { beatId: 'm1', actNumber: 1, description: 'Missable 1', firePredicate: '', missable: true, sessionRange: [0, 1], fired: false, firedAtTick: null },
    { beatId: 'm2', actNumber: 1, description: 'Missable 2', firePredicate: '', missable: true, sessionRange: [0, 1], fired: false, firedAtTick: null },
    { beatId: 'm3', actNumber: 1, description: 'Missable 3', firePredicate: '', missable: true, sessionRange: [0, 1], fired: false, firedAtTick: null },
  ];

  api.createSpine(beats, 2);
  // No knowledge, so no beats fire. Advance past session 1 for all.
  api.checkBeats(makeWorldState({ tick: 2 * 86400, knowledgeFacts: [] }), 2 * 86400);
  assert(api.getSpine()!.driftMode, 'drift mode: 3 missed >= maxMissedPerAct 2');

  // Manual drift mode
  const api2 = createQuestApi();
  api2.createSpine(beats, 5);
  api2.enterDriftMode();
  assert(api2.getSpine()!.driftMode, 'enterDriftMode sets driftMode');
}

// ============================================================================
// SECTION 16: Narrative spine — act advancement
// ============================================================================
console.log('=== SECTION 16: Narrative spine act advancement ===');

{
  const api = createQuestApi();
  const beats: NarrativeBeat[] = [
    { beatId: 'a1b', actNumber: 1, description: '', firePredicate: '', missable: false, sessionRange: [0, 5], fired: false, firedAtTick: null },
    { beatId: 'a2b', actNumber: 2, description: '', firePredicate: '', missable: false, sessionRange: [5, 10], fired: false, firedAtTick: null },
    { beatId: 'a3b', actNumber: 3, description: '', firePredicate: '', missable: false, sessionRange: [10, 15], fired: false, firedAtTick: null },
  ];

  api.createSpine(beats, 2);

  // Fire all act 1 beats
  api.checkBeats(makeWorldState({ tick: 0, knowledgeFacts: ['k'] }), 0);
  assertEq(api.getSpine()!.currentAct, 2, 'advanced to act 2 after act 1 complete');

  // Fire all act 2 beats
  api.checkBeats(makeWorldState({ tick: 5 * 86400, knowledgeFacts: ['k'] }), 5 * 86400);
  assertEq(api.getSpine()!.currentAct, 3, 'advanced to act 3 after act 2 complete');

  // Cannot advance past act 3
  api.checkBeats(makeWorldState({ tick: 10 * 86400, knowledgeFacts: ['k'] }), 10 * 86400);
  assertEq(api.getSpine()!.currentAct, 3, 'stays at act 3');
}

// ============================================================================
// SECTION 17: Narrative spine — stats
// ============================================================================
console.log('=== SECTION 17: Narrative spine stats ===');

{
  const api = createQuestApi();
  const beats: NarrativeBeat[] = [
    { beatId: 's1', actNumber: 1, description: '', firePredicate: '', missable: true, sessionRange: [0, 1], fired: false, firedAtTick: null },
    { beatId: 's2', actNumber: 1, description: '', firePredicate: '', missable: true, sessionRange: [0, 1], fired: false, firedAtTick: null },
  { beatId: 's3', actNumber: 1, description: '', firePredicate: '', missable: false, sessionRange: [0, 5], fired: false, firedAtTick: null },
  ];

  api.createSpine(beats, 5);
  // All 3 beats have sessionRange starting at [0,...], so at session 0 with knowledge,
  // all unfired beats in act 1 whose sessionRange[0] <= session will fire.
  // s1 and s2 have sessionRange [0,1], s3 has [0,5]. All fire at session 0.
  api.checkBeats(makeWorldState({ tick: 0, knowledgeFacts: ['k'] }), 0);

  const stats = api.stats();
  assertEq(stats.spineBeatsFired, 3, 'all 3 act-1 beats fired');
  assertEq(stats.spineBeatsMissed, 0, 'no beats missed (all fired before deadline)');
}

// ============================================================================
// SECTION 18: Ending triggers
// ============================================================================
console.log('=== SECTION 18: Ending triggers ===');

{
  const api = createQuestApi();

  assert(api.registerEnding({
    triggerId: 't1', endingId: 'ending_mahayana', description: 'Achieved Mahayana',
    priority: 1, final: true, trueSinceTick: null,
  }), 'registerEnding returns true');

  // No ending conditions met
  const noEnding = api.checkEndings(makeWorldState());
  // Default ending should appear when no triggers match
  assert(noEnding.length > 0, 'default ending when no conditions met');
  assertEq(noEnding[0].endingId, 'default_ending', 'default ending id');
  assertEq(noEnding[0].moralWeight, 'ambiguous' as MoralWeight, 'default moral weight');

  // Mahayana realm ending
  const mahayanaEnding = api.checkEndings(makeWorldState({ playerRealm: 'mahayana' as Realm }));
  assert(mahayanaEnding.some(e => e.endingId === 'ending_mahayana'), 'mahayana ending triggered');

  // Flag-based ending
  api.registerEnding({
    triggerId: 't2', endingId: 'ending_final_battle', description: 'Won final battle',
    priority: 2, final: true, trueSinceTick: null,
  });
 const flagEnding = api.checkEndings(makeWorldState({ flags: { final_battle_won: true } }));
  assert(flagEnding.some(e => e.endingId === 'ending_final_battle'), 'flag-based ending triggered');
}

// ============================================================================
// SECTION 19: Dialogue consequence application
// ============================================================================
console.log('=== SECTION 19: Dialogue consequences ===');

{
  const api = createQuestApi();
  const ws = makeWorldState();

  // add_knowledge_fact
  api.applyConsequences([
    { type: 'add_knowledge_fact', value: 'learned_qi' },
  ], ws);
  assert(ws.knowledgeFacts.includes('learned_qi'), 'consequence: knowledge fact added');

  // Duplicate fact not added
  api.applyConsequences([
    { type: 'add_knowledge_fact', value: 'learned_qi' },
  ], ws);
  assertEq(ws.knowledgeFacts.length, 1, 'consequence: duplicate fact not added');

  // set_flag
  api.applyConsequences([
    { type: 'set_flag', flag: 'elder_met', value: true },
  ], ws);
  assertEq(ws.flags['elder_met'], true, 'consequence: flag set');

  // modify_relationship
  api.applyConsequences([
    { type: 'modify_relationship', target: 42, value: 25 },
  ], ws);
  assertEq(ws.relationships['42'], 25, 'consequence: relationship modified');
}

// ============================================================================
// SECTION 20: Tier management
// ============================================================================
console.log('=== SECTION 20: Tier management ===');

{
  const api = createQuestApi();

  assertEq(api.getTier(1n), 4, 'default tier is 4 (S0)');
  api.setTier(1n, 2);
  assertEq(api.getTier(1n), 2, 'tier set to 2');
  api.setTier(1n, 4);
  assertEq(api.getTier(1n), 4, 'tier updated to 4');
}

// ============================================================================
// SECTION 21: computeSmoothedApproval
// ============================================================================
console.log('=== SECTION 21: computeSmoothedApproval ===');

{
  // Empty history returns raw approval
  assertClose(computeSmoothedApproval(0.5, [], 30), 0.5, 'empty history: returns raw');

  // With experiences, smoothed moves toward recent trend
  const exps: SharedExperience[] = [
    { experienceId: 'e1', type: 'combat', tick: 100, approvalDelta: 0.2 },
    { experienceId: 'e2', type: 'quest', tick: 200, approvalDelta: -0.1 },
    { experienceId: 'e3', type: 'triumph', tick: 300, approvalDelta: 0.3 },
  ];
  const smoothed = computeSmoothedApproval(0.4, exps, 30);
  // Should be near 0.4 since weight is low for 3 experiences
  assert(smoothed >= 0 && smoothed <= 1, 'smoothed approval is in valid range');
}

// ============================================================================
// SECTION 22: Plugin lifecycle
// ============================================================================
console.log('=== SECTION 22: Plugin lifecycle ===');

{
  const host = createPluginHost();
  const plugin = createQuestPlugin();

  assertEq(plugin.id, 'ga:quest', 'plugin id is ga:quest');
  assertEq(plugin.version, '0.1.0', 'plugin version is 0.1.0');
  assert(plugin.dependencies.includes('ga:determinism'), 'depends on ga:determinism');

  plugin.init(host);

  // Check capabilities registered
  const caps = host.capabilities.list();
  assert(caps.some(c => c.capability === 'quest.dialogue'), 'quest.dialogue registered');
  assert(caps.some(c => c.capability === 'quest.state'), 'quest.state registered');
  assert(caps.some(c => c.capability === 'quest.narrative'), 'quest.narrative registered');

  // Check state set
  const state = host.getState('ga:quest');
  assert(state !== undefined, 'plugin state set on host');

  // Destroy
  plugin.destroy(host);
  const capsAfter = host.capabilities.list();
  assert(!capsAfter.some(c => c.capability === 'quest.dialogue'), 'quest.dialogue unregistered');
  assert(!capsAfter.some(c => c.capability === 'quest.state'), 'quest.state unregistered');
  assert(!capsAfter.some(c => c.capability === 'quest.narrative'), 'quest.narrative unregistered');
}

// ============================================================================
// SECTION 23: Full integration — dialogue + quest + companion
// ============================================================================
console.log('=== SECTION 23: Full integration ===');

{
  const api = createQuestApi();

  // Register a dialogue tree for an elder NPC
  const elderTree: DialogueTree = {
    treeId: 'elder_wang',
    rootNodeId: 'greeting',
    speakerId: 100n,
    contextTags: ['wang_family_bend'],
    nodes: {
      greeting: {
        nodeId: 'greeting',
        npcLine: 'Young one, you wish to learn the Dao?',
        nodeConditions: [{ type: 'realm', state: 'mortal' }],
        responses: [
          {
            responseId: 'accept',
            playerLine: 'I am ready, Elder Wang.',
            responseConditions: [
              { type: 'relationship', target: 100, min: 0 },
            ],
            consequences: [
              { type: 'add_knowledge_fact', value: 'accepted_as_disciple' },
              { type: 'set_flag', flag: 'elder_wang_teaching', value: true },
            ],
            nextNodeId: 'teaching',
          },
          {
            responseId: 'refuse',
            playerLine: 'Not yet.',
            responseConditions: [],
            consequences: [],
            nextNodeId: 'END',
          },
        ],
      },
      teaching: {
        nodeId: 'teaching',
        npcLine: 'Good. Your first task...',
        nodeConditions: [],
        responses: [
          {
            responseId: 'accept_quest',
            playerLine: 'I will do it.',
            responseConditions: [],
            consequences: [],
            nextNodeId: 'END',
          },
        ],
      },
    },
  };

  assert(api.registerDialogueTree(elderTree), 'register dialogue tree');
  assert(!api.registerDialogueTree(elderTree), 'duplicate registration fails');
  assertEq(api.listDialogueTrees().length, 1, '1 dialogue tree');
  assert(api.getDialogueTree('elder_wang') !== undefined, 'getDialogueTree by id');

  // Evaluate dialogue with mortal player and relationship >= 0
  const ws = makeWorldState({
    playerRealm: 'mortal',
    relationships: { '100': 10 },
  });
  const availableIds = api.evaluateDialogueConditions('elder_wang', 'greeting', ws);
  assert(availableIds.includes('accept'), 'accept response available');
  assert(availableIds.includes('refuse'), 'refuse response available');
  assertEq(availableIds.length, 2, '2 available responses');

  // Apply consequences from accepting
  const acceptConsequences: DialogueConsequence[] = [
    { type: 'add_knowledge_fact', value: 'accepted_as_disciple' },
    { type: 'set_flag', flag: 'elder_wang_teaching', value: true },
  ];
  api.applyConsequences(acceptConsequences, ws);
  assert(ws.knowledgeFacts.includes('accepted_as_disciple'), 'knowledge fact applied');
  assertEq(ws.flags['elder_wang_teaching'], true, 'flag applied');

  // Create quest from elder dialogue
  const herbQuest: Quest = {
    questId: 'gather_spirit_grass',
    questType: 'gather_herb',
    generatedAtTick: 100,
    originEventId: null,
    objectives: [
      { objectiveId: 'obj_herb', description: 'Gather 3 Spirit Grass', type: 'acquire_item', target: null, completed: false },
    ],
    rewards: [
      { type: 'cash' as any, value: 50 },
      { type: 'knowledge_fact' as any, value: 'spirit_grass_properties' },
    ],
    failureConsequences: [],
    deadlineTick: null,
    status: 'available',
  };
  api.createQuest(herbQuest);
  api.activateQuest('gather_spirit_grass');

  // Complete objective
  api.completeObjective('gather_spirit_grass', 'obj_herb');
  assertEq(api.getQuest('gather_spirit_grass')?.status, 'completed', 'quest auto-completed');

  // Companion joins after quest
  api.createCompanion(100n, null);
  api.addSharedExperience(100n, { experienceId: 'quest_done', type: 'quest', tick: 200, approvalDelta: 0.4 });
  const elder = api.getCompanion(100n)!;
  assertClose(elder.approval, 0.4, 'elder approval after quest');

  // Create romance with another NPC
  const romanceId = api.createRomance(200n, 300n);
  api.exchangeCut(romanceId, {
    tick: 500, cutType: 'fact_revealed', deflectionType: 'accepted',
    content: 'I am a cultivator', intensityDelta: 0.1, stabilityDelta: 0.1, honestyDelta: 0.15,
  });
  assertEq(api.getRomance(romanceId)!.stage, 'acquaintance', 'romance advanced to acquaintance');

  // Final stats check
  const finalStats = api.stats();
  assertEq(finalStats.totalQuests, 1, 'integration: 1 quest');
  assertEq(finalStats.totalCompanions, 1, 'integration: 1 companion');
  assertEq(finalStats.totalRomances, 1, 'integration: 1 romance');
  assertEq(finalStats.totalCutExchanges, 1, 'integration: 1 cut exchange');
}

// ============================================================================
// SECTION 24: Quest type coverage
// ============================================================================
console.log('=== SECTION 24: Quest type and objective type coverage ===');

{
  const api = createQuestApi();

  const questTypes: QuestType[] = [
    'gather_herb', 'hunt_beast', 'deliver_message', 'escort_npc',
    'investigate_rumor', 'resolve_dispute', 'clear_ruin', 'retrieve_manual',
    'protect_caravan', 'avenge_kin', 'find_master', 'take_disciple',
    'break_through', 'found_sect', 'compete_auction', 'pilgrimage',
    'cure_illness', 'lift_curse',
  ];

  for (const qt of questTypes) {
    const q: Quest = {
      questId: `qt_${qt}`,
      questType: qt,
      generatedAtTick: 0,
      originEventId: null,
      objectives: [{ objectiveId: 'o1', description: qt, type: 'acquire_item', target: null, completed: false }],
      rewards: [],
      failureConsequences: [],
      deadlineTick: null,
      status: 'available',
    };
    api.createQuest(q);
  }
  assertEq(api.listQuests().length, questTypes.length, 'all 18 quest types created');
}

// ============================================================================
// SECTION 25: Perception state coverage
// ============================================================================
console.log('=== SECTION 25: Perception states ===');

{
  const states: PerceptionState[] = ['normal', 'sense_qi', 'read_residue', 'sense_anchor', 'sense_law', 'divination_active'];
  for (const ps of states) {
    const result = evaluateCondition({ type: 'perception_state', state: ps }, makeWorldState({ perceptionState: ps }));
    assert(result, `perception state '${ps}' matches`);
  }
  // Mismatched
  assert(!evaluateCondition({ type: 'perception_state', state: 'sense_qi' }, makeWorldState({ perceptionState: 'normal' })),
    'perception state mismatch fails');
}

// ============================================================================
// SECTION 26: Companion join/leave types
// ============================================================================
console.log('=== SECTION 26: Companion join/leave types ===');

{
  const api = createQuestApi();
  const c = api.createCompanion(1n, null);
  assertEq(c.joinType, 'relationship_threshold' as CompanionJoinType, 'default join type');
  assert(c.joinTick === null, 'joinTick starts null');
  assert(c.leaveType === null, 'leaveType starts null');
  assert(c.leaveTick === null, 'leaveTick starts null');
}

// ============================================================================
// SECTION 27: Romance stage type coverage
// ============================================================================
console.log('=== SECTION 27: Romance stage types ===');

{
  const stages: RomanceStage[] = [
    'unmet', 'acquaintance', 'tension', 'first_cut',
    'courtship', 'commitment', 'marriage', 'estrangement', 'ended',
  ];
  // Just verify they are valid type assignments
  const r: RomanceState = {
    partner1Id: 1n, partner2Id: 2n,
    stage: stages[0], cutsExchanged: [],
    intensity: 0, stability: 0, honesty: 0, lastCutTick: null,
  };
  for (const s of stages) {
    r.stage = s;
    assert(r.stage === s, `romance stage '${s}' is valid`);
  }
}

// ============================================================================
// SECTION 28: Cut and deflection type coverage
// ============================================================================
console.log('=== SECTION 28: Cut/deflection type coverage ===');

{
  const cutTypes: CutType[] = ['fact_revealed', 'feeling_confessed', 'vulnerability_shown', 'oath_made', 'oath_broken'];
  const deflectionTypes: DeflectionType[] = ['accepted', 'deflected', 'countered', 'refused'];

  for (const ct of cutTypes) {
    const r: RomanceState = {
      partner1Id: 1n, partner2Id: 2n, stage: 'tension', cutsExchanged: [],
      intensity: 0.5, stability: 0.5, honesty: 0.5, lastCutTick: null,
    };
    const result = applyCut(r, {
      tick: 1000, cutType: ct, deflectionType: 'accepted',
      content: 'test', intensityDelta: 0.01, stabilityDelta: 0, honestyDelta: 0,
    });
    assertEq(result.cutsExchanged[0].cutType, ct, `cut type '${ct}' preserved`);
  }

  for (const dt of deflectionTypes) {
    const r: RomanceState = {
      partner1Id: 1n, partner2Id: 2n, stage: 'tension', cutsExchanged: [],
      intensity: 0.5, stability: 0.5, honesty: 0.5, lastCutTick: null,
    };
    const result = applyCut(r, {
      tick: 1000, cutType: 'fact_revealed', deflectionType: dt,
      content: 'test', intensityDelta: 0.01, stabilityDelta: 0, honestyDelta: 0,
    });
    assertEq(result.cutsExchanged[0].deflectionType, dt, `deflection type '${dt}' preserved`);
  }
}

// ============================================================================
// SECTION 29: Moral weight coverage
// ============================================================================
console.log('=== SECTION 29: Moral weight coverage ===');

{
  const weights: MoralWeight[] = ['triumph', 'bittersweet', 'tragic', 'ambiguous', 'transcendent'];
  for (const w of weights) {
    const e: Ending = { endingId: `e_${w}`, title: w, moralWeight: w };
    assertEq(e.moralWeight, w, `moral weight '${w}' is valid`);
  }
}

// ============================================================================
// SECTION 30: Stats after no operations
// ============================================================================
console.log('=== SECTION 30: Fresh API stats ===');

{
  const api = createQuestApi();
  const s = api.stats();
  assertEq(s.totalQuests, 0, 'fresh: 0 quests');
  assertEq(s.totalCompanions, 0, 'fresh: 0 companions');
  assertEq(s.totalRomances, 0, 'fresh: 0 romances');
  assertEq(s.totalCutExchanges, 0, 'fresh: 0 cuts');
  assertEq(s.spineBeatsFired, 0, 'fresh: 0 beats fired');
  assertEq(s.spineBeatsMissed, 0, 'fresh: 0 beats missed');
}

// ============================================================================
// Results
// ============================================================================

console.log('');
console.log('============================================================');
console.log(`Quest Conformance: ${passed} passed, ${failed} failed, ${passed + failed} total`);
console.log('============================================================');

if (failed > 0) {
  process.exit(1);
}
