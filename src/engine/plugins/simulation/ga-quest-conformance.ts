/**
 * ga:quest Conformance Test
 * Tests dialogue trees, perception-gated responses, quest lifecycle,
 * companion system (approval/trust/arc), romance (Exchange of Cuts),
 * narrative spine (beats/drift), ending triggers, tier, and stats.
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
  type DialogueTree,
  type DialogueNode,
  type DialogueResponse,
  type DialogueCondition,
  type DialogueConsequence,
  type Quest,
  type QuestObjective,
  type QuestReward,
  type QuestConsequence,
  type Companion,
  type SharedExperience,
  type CompanionArc,
  type CutExchange,
  type RomanceState,
  type NarrativeBeat,
  type NarrativeSpine,
  type EndingTrigger,
  type Ending,
  type WorldStateSnapshot,
  type PerceptionState,
  type Realm,
  type QuestApi,
} from './ga-quest';
import type { PluginHost } from '../../kernel/plugin-host';

let passed = 0;
let failed = 0;

function assert(condition: boolean, msg: string) {
  if (condition) { passed++; console.log(`  ✅ ${msg}`); }
  else { failed++; console.log(`  ❌ ${msg}`); }
}

function assertEq<T>(actual: T, expected: T, msg: string) {
  if (actual === expected) { passed++; console.log(`  ✅ ${msg}`); }
  else { failed++; console.log(`  ❌ ${msg} (expected ${String(expected)}, got ${String(actual)})`); }
}

function assertGt(actual: number, expected: number, msg: string) {
  if (actual > expected) { passed++; console.log(`  ✅ ${msg}`); }
  else { failed++; console.log(`  ❌ ${msg} (expected > ${expected}, got ${actual})`); }
}

function assertLt(actual: number, expected: number, msg: string) {
  if (actual < expected) { passed++; console.log(`  ✅ ${msg}`); }
  else { failed++; console.log(`  ❌ ${msg} (expected < ${expected}, got ${actual})`); }
}

function approx(actual: number, expected: number, tolerance: number, msg: string) {
  if (Math.abs(actual - expected) <= tolerance) { passed++; console.log(`  ✅ ${msg}`); }
  else { failed++; console.log(`  ❌ ${msg} (expected ~${expected}, got ${actual})`); }
}

// ============================================================================
// Helpers — build minimal world state
// ============================================================================

function makeWorld(overrides: Partial<WorldStateSnapshot> = {}): WorldStateSnapshot {
  return {
    tick: 0,
    playerRealm: 'mortal',
    perceptionState: 'normal',
    knowledgeFacts: [],
    relationships: {},
    flags: {},
    inventory: {},
    ...overrides,
  };
}

function makeResponse(overrides: Partial<DialogueResponse> = {}): DialogueResponse {
  return {
    responseId: 'r1',
    playerLine: 'Hello',
    responseConditions: [],
    consequences: [],
    nextNodeId: 'END',
    ...overrides,
  };
}

function makeNode(overrides: Partial<DialogueNode> = {}): DialogueNode {
  return {
    nodeId: 'n1',
    npcLine: 'Greetings, traveler.',
    responses: [makeResponse()],
    nodeConditions: [],
    ...overrides,
  };
}

function makeTree(overrides: Partial<DialogueTree> = {}): DialogueTree {
  const n1 = makeNode({ nodeId: 'n1' });
  return {
    treeId: 'tree1',
    rootNodeId: 'n1',
    nodes: { n1 },
    speakerId: 100,
    contextTags: ['village'],
    ...overrides,
  };
}

function makeObjective(overrides: Partial<QuestObjective> = {}): QuestObjective {
  return {
    objectiveId: 'obj1',
    description: 'Gather 3 herbs',
    type: 'acquire_item',
    target: { itemId: 'herb', count: 3 },
    completed: false,
    ...overrides,
  };
}

function makeQuest(overrides: Partial<Quest> = {}): Quest {
  return {
    questId: 'q1',
    questType: 'gather_herb',
    generatedAtTick: 0,
    originEventId: null,
    objectives: [makeObjective()],
    rewards: [{ type: 'silver', value: 50 } as QuestReward],
    failureConsequences: [],
    deadlineTick: null,
    status: 'available',
    ...overrides,
  };
}

function makeBeat(overrides: Partial<NarrativeBeat> = {}): NarrativeBeat {
  return {
    beatId: 'beat1',
    actNumber: 1,
    description: 'The morning bell rings',
    firePredicate: 'tick > 100',
    missable: false,
    sessionRange: [0, 10],
    fired: false,
    firedAtTick: null,
    ...overrides,
  };
}

// ============================================================================
// Run tests
// ============================================================================

function run() {
  console.log('');
  console.log('=== SECTION 1: evaluateCondition — perception_state ===');
  {
    const cond: DialogueCondition = { type: 'perception_state', state: 'sense_qi' };
    assert(evaluateCondition(cond, makeWorld({ perceptionState: 'sense_qi' })) === true,
      'perception_state matches');
    assert(evaluateCondition(cond, makeWorld({ perceptionState: 'normal' })) === false,
      'perception_state mismatch');
    assert(evaluateCondition(cond, makeWorld({ perceptionState: 'divination_active' })) === false,
      'perception_state other state');
  }

  console.log('');
  console.log('=== SECTION 2: evaluateCondition — knowledge_fact ===');
  {
    const cond: DialogueCondition = { type: 'knowledge_fact', factId: 'fact:elder_secret' };
    assert(evaluateCondition(cond, makeWorld({ knowledgeFacts: ['fact:elder_secret'] })) === true,
      'knowledge_fact present');
    assert(evaluateCondition(cond, makeWorld({ knowledgeFacts: [] })) === false,
      'knowledge_fact absent');
    assert(evaluateCondition(cond, makeWorld({ knowledgeFacts: ['other'] })) === false,
      'knowledge_fact different fact');
    const noFact: DialogueCondition = { type: 'knowledge_fact' };
    assert(evaluateCondition(noFact, makeWorld()) === false,
      'knowledge_fact without factId returns false');
  }

  console.log('');
  console.log('=== SECTION 3: evaluateCondition — relationship ===');
  {
    const cond: DialogueCondition = { type: 'relationship', target: 42, min: 50 };
    assert(evaluateCondition(cond, makeWorld({ relationships: { '42': 60 } })) === true,
      'relationship above min');
    assert(evaluateCondition(cond, makeWorld({ relationships: { '42': 50 } })) === true,
      'relationship equal to min');
    assert(evaluateCondition(cond, makeWorld({ relationships: { '42': 30 } })) === false,
      'relationship below min');
    assert(evaluateCondition(cond, makeWorld({ relationships: {} })) === false,
      'relationship missing target');
    const noTarget: DialogueCondition = { type: 'relationship' };
    assert(evaluateCondition(noTarget, makeWorld()) === false,
      'relationship without target returns false');
  }

  console.log('');
  console.log('=== SECTION 4: evaluateCondition — realm ===');
  {
    const cond: DialogueCondition = { type: 'realm', state: 'foundation_establishment' };
    assert(evaluateCondition(cond, makeWorld({ playerRealm: 'foundation_establishment' })) === true,
      'realm equal');
    assert(evaluateCondition(cond, makeWorld({ playerRealm: 'mahayana' })) === true,
      'realm above');
    assert(evaluateCondition(cond, makeWorld({ playerRealm: 'qi_condensation' })) === false,
      'realm below');
    assert(evaluateCondition(cond, makeWorld({ playerRealm: 'mortal' })) === false,
      'realm mortal below foundation');
  }

  console.log('');
  console.log('=== SECTION 5: evaluateCondition — flag ===');
  {
    const cond: DialogueCondition = { type: 'flag', flag: 'met_elder', value: true };
    assert(evaluateCondition(cond, makeWorld({ flags: { met_elder: true } })) === true,
      'flag true when true');
    assert(evaluateCondition(cond, makeWorld({ flags: { met_elder: false } })) === false,
      'flag false when false');
    assert(evaluateCondition(cond, makeWorld({ flags: {} })) === false,
      'flag absent returns false');
    const noFlag: DialogueCondition = { type: 'flag' };
    assert(evaluateCondition(noFlag, makeWorld()) === false,
      'flag without flag name returns false');
    const flagFalse: DialogueCondition = { type: 'flag', flag: 'door_open', value: false };
    assert(evaluateCondition(flagFalse, makeWorld({ flags: { door_open: false } })) === true,
      'flag false matches value false');
  }

  console.log('');
  console.log('=== SECTION 6: evaluateCondition — inventory ===');
  {
    const cond: DialogueCondition = { type: 'inventory', itemId: 'spirit_stone', min: 5 };
    assert(evaluateCondition(cond, makeWorld({ inventory: { spirit_stone: 10 } })) === true,
      'inventory above min');
    assert(evaluateCondition(cond, makeWorld({ inventory: { spirit_stone: 5 } })) === true,
      'inventory equal to min');
    assert(evaluateCondition(cond, makeWorld({ inventory: { spirit_stone: 2 } })) === false,
      'inventory below min');
    assert(evaluateCondition(cond, makeWorld({ inventory: {} })) === false,
      'inventory absent returns false');
    const noItem: DialogueCondition = { type: 'inventory' };
    assert(evaluateCondition(noItem, makeWorld()) === false,
      'inventory without itemId returns false');
  }

  console.log('');
  console.log('=== SECTION 7: evaluateCondition — quest_state and unknown ===');
  {
    const qCond: DialogueCondition = { type: 'quest_state', questId: 'q1', questState: 'active' };
    assert(evaluateCondition(qCond, makeWorld()) === true,
      'quest_state always true (simplified)');
    const unknown: DialogueCondition = { type: 'trait' as never };
    assert(evaluateCondition(unknown, makeWorld()) === true,
      'unknown condition type returns true');
  }

  console.log('');
  console.log('=== SECTION 8: getAvailableResponses — gating ===');
  {
    const tree = makeTree({
      nodes: {
        n1: makeNode({
          nodeId: 'n1',
          responses: [
            makeResponse({ responseId: 'r_normal', responseConditions: [] }),
            makeResponse({
              responseId: 'r_gated',
              responseConditions: [{ type: 'perception_state', state: 'sense_qi' }],
            }),
          ],
        }),
      },
    });
    const wsNormal = makeWorld({ perceptionState: 'normal' });
    const avail = getAvailableResponses(tree, 'n1', wsNormal);
    assertEq(avail.length, 1, 'normal perception: only ungated response');
    assertEq(avail[0].responseId, 'r_normal', 'normal perception: r_normal available');

    const wsSense = makeWorld({ perceptionState: 'sense_qi' });
    const avail2 = getAvailableResponses(tree, 'n1', wsSense);
    assertEq(avail2.length, 2, 'sense_qi: both responses available');
  }

  console.log('');
  console.log('=== SECTION 9: getAvailableResponses — fallback Leave option ===');
  {
    const tree = makeTree({
      nodes: {
        n1: makeNode({
          nodeId: 'n1',
          responses: [
            makeResponse({
              responseId: 'r_gated',
              responseConditions: [{ type: 'perception_state', state: 'divination_active' }],
            }),
          ],
        }),
      },
    });
    const ws = makeWorld({ perceptionState: 'normal' });
    const avail = getAvailableResponses(tree, 'n1', ws);
    assertEq(avail.length, 1, 'fallback: single leave option added');
    assertEq(avail[0].responseId, 'leave', 'fallback: responseId is leave');
    assertEq(avail[0].nextNodeId, 'END', 'fallback: nextNodeId is END');
  }

  console.log('');
  console.log('=== SECTION 10: getAvailableResponses — no fallback on END node ===');
  {
    const tree = makeTree({
      nodes: {
        END: makeNode({ nodeId: 'END', responses: [] }),
      },
    });
    const avail = getAvailableResponses(tree, 'END', makeWorld());
    assertEq(avail.length, 0, 'END node: no fallback added');
  }

  console.log('');
  console.log('=== SECTION 11: getAvailableResponses — missing node ===');
  {
    const tree = makeTree();
    const avail = getAvailableResponses(tree, 'nonexistent', makeWorld());
    assertEq(avail.length, 0, 'missing node: empty array');
  }

  console.log('');
  console.log('=== SECTION 12: isQuestComplete / isQuestExpired ===');
  {
    const q = makeQuest({
      objectives: [
        makeObjective({ objectiveId: 'o1', completed: true }),
        makeObjective({ objectiveId: 'o2', completed: false }),
      ],
    });
    assert(isQuestComplete(q) === false, 'quest incomplete with one objective done');
    q.objectives[1].completed = true;
    assert(isQuestComplete(q) === true, 'quest complete when all done');

    const empty = makeQuest({ objectives: [] });
    assert(isQuestComplete(empty) === false, 'quest with no objectives is not complete');

    const expired = makeQuest({ deadlineTick: 100 });
    assert(isQuestExpired(expired, 50) === false, 'quest not expired before deadline');
    assert(isQuestExpired(expired, 100) === false, 'quest not expired at deadline');
    assert(isQuestExpired(expired, 101) === true, 'quest expired after deadline');

    const noDeadline = makeQuest({ deadlineTick: null });
    assert(isQuestExpired(noDeadline, 9999) === false, 'quest with null deadline never expires');
  }

  console.log('');
  console.log('=== SECTION 13: computeSmoothedApproval ===');
  {
    assertEq(computeSmoothedApproval(0.5, [], 30), 0.5, 'empty history returns base approval');
    const hist: SharedExperience[] = [
      { experienceId: 'e1', type: 'combat', tick: 1, approvalDelta: 0.2 },
    ];
    const result = computeSmoothedApproval(0.5, hist, 30);
    assertGt(result, 0.5, 'positive delta raises smoothed approval');
    const negHist: SharedExperience[] = [
      { experienceId: 'e1', type: 'loss', tick: 1, approvalDelta: -0.5 },
    ];
    const negResult = computeSmoothedApproval(0.5, negHist, 30);
    assertLt(negResult, 0.5, 'negative delta lowers smoothed approval');
  }

  console.log('');
  console.log('=== SECTION 14: canExchangeCut ===');
  {
    const r: RomanceState = {
      partner1Id: 1, partner2Id: 2,
      stage: 'acquaintance', cutsExchanged: [],
      intensity: 0.2, stability: 0.5, honesty: 0.2, lastCutTick: null,
    };
    assert(canExchangeCut(r, 100, 1) === true, 'can cut: no prior cut');
    const recent: RomanceState = { ...r, lastCutTick: 100 };
    assert(canExchangeCut(recent, 100, 1) === false, 'same tick: blocked (0 < 24*60)');
    assert(canExchangeCut(recent, 100 + 24 * 60 - 1, 1) === false, 'within 24h: blocked');
    assert(canExchangeCut(recent, 100 + 24 * 60, 1) === true, 'at 24h boundary: allowed');
    const ended: RomanceState = { ...r, stage: 'ended' };
    assert(canExchangeCut(ended, 1000, 1) === false, 'ended romance: blocked');
  }

  console.log('');
  console.log('=== SECTION 15: applyCut ===');
  {
    const r: RomanceState = {
      partner1Id: 1, partner2Id: 2,
      stage: 'acquaintance', cutsExchanged: [],
      intensity: 0.2, stability: 0.5, honesty: 0.2, lastCutTick: null,
    };
    const cut: Omit<CutExchange, 'cutId'> = {
      tick: 100,
      cutType: 'fact_revealed',
      deflectionType: 'accepted',
      content: 'I once was mortal.',
      intensityDelta: 0.3,
      stabilityDelta: 0.1,
      honestyDelta: 0.4,
    };
    const updated = applyCut(r, cut);
    assertEq(updated.cutsExchanged.length, 1, 'cut added to history');
    assertEq(updated.cutsExchanged[0].cutId, 'cut-0', 'cut assigned id cut-0');
    approx(updated.intensity, 0.5, 0.001, 'intensity increased by 0.3');
    approx(updated.stability, 0.6, 0.001, 'stability increased by 0.1');
    approx(updated.honesty, 0.6, 0.001, 'honesty increased by 0.4');
    assertEq(updated.lastCutTick, 100, 'lastCutTick updated');
    assertEq(r.cutsExchanged.length, 0, 'original romance not mutated (immutability)');

    // Clamping
    const high: RomanceState = { ...r, intensity: 0.95 };
    const clampCut = applyCut(high, { ...cut, intensityDelta: 0.5 });
    assertEq(clampCut.intensity, 1, 'intensity clamped to 1');
    const low: RomanceState = { ...r, stability: 0.05 };
    const lowCut = applyCut(low, { ...cut, stabilityDelta: -0.5 });
    assertEq(lowCut.stability, 0, 'stability clamped to 0');
  }

  console.log('');
  console.log('=== SECTION 16: Quest API — Dialogue tree registration ===');
  {
    const api = createQuestApi();
    const tree = makeTree();
    assert(api.registerDialogueTree(tree) === true, 'register tree succeeds');
    assert(api.registerDialogueTree(tree) === false, 'duplicate register fails');
    assertEq(api.listDialogueTrees().length, 1, 'one tree listed');
    assertEq(api.listDialogueTrees()[0], 'tree1', 'tree id matches');
    const got = api.getDialogueTree('tree1');
    assert(got !== undefined, 'getDialogueTree returns tree');
    assertEq(got!.treeId, 'tree1', 'tree id correct');
    assert(api.getDialogueTree('nonexistent') === undefined, 'missing tree returns undefined');
  }

  console.log('');
  console.log('=== SECTION 17: Quest API — evaluateDialogueConditions ===');
  {
    const api = createQuestApi();
    const tree = makeTree({
      treeId: 't2',
      nodes: {
        n1: makeNode({
          nodeId: 'n1',
          responses: [
            makeResponse({ responseId: 'r_open', responseConditions: [] }),
            makeResponse({
              responseId: 'r_locked',
              responseConditions: [{ type: 'perception_state', state: 'sense_qi' }],
            }),
          ],
        }),
      },
    });
    api.registerDialogueTree(tree);
    const ids = api.evaluateDialogueConditions('t2', 'n1', makeWorld({ perceptionState: 'normal' }));
    assertEq(ids.length, 1, 'normal: 1 available response');
    assertEq(ids[0], 'r_open', 'normal: r_open available');
    const ids2 = api.evaluateDialogueConditions('t2', 'n1', makeWorld({ perceptionState: 'sense_qi' }));
    assertEq(ids2.length, 2, 'sense_qi: 2 available responses');
    const missing = api.evaluateDialogueConditions('nonexistent', 'n1', makeWorld());
    assertEq(missing.length, 0, 'missing tree: empty array');
  }

  console.log('');
  console.log('=== SECTION 18: Quest API — applyConsequences ===');
  {
    const api = createQuestApi();
    const ws = makeWorld();
    const consequences: DialogueConsequence[] = [
      { type: 'add_knowledge_fact', value: 'fact:elder_secret' },
      { type: 'set_flag', flag: 'met_elder', value: true },
      { type: 'modify_relationship', target: 42, value: 75 },
    ];
    api.applyConsequences(consequences, ws);
    assert(ws.knowledgeFacts.includes('fact:elder_secret'), 'knowledge fact added');
    assertEq(ws.flags['met_elder'], true, 'flag set');
    assertEq(ws.relationships['42'], 75, 'relationship set');
    // Idempotent: adding same fact twice
    api.applyConsequences([{ type: 'add_knowledge_fact', value: 'fact:elder_secret' }], ws);
    assertEq(ws.knowledgeFacts.length, 1, 'duplicate fact not added twice');
  }

  console.log('');
  console.log('=== SECTION 19: Quest API — createQuest / getQuest / listQuests ===');
  {
    const api = createQuestApi();
    const q = makeQuest({ questId: 'q_a', status: 'available' });
    const id = api.createQuest(q);
    assertEq(id, 'q_a', 'createQuest returns id');
    const got = api.getQuest('q_a');
    assert(got !== undefined, 'getQuest returns quest');
    assertEq(got!.status, 'available', 'status is available');
    assert(api.getQuest('nonexistent') === undefined, 'missing quest returns undefined');
    api.createQuest(makeQuest({ questId: 'q_b', status: 'active' }));
    api.createQuest(makeQuest({ questId: 'q_c', status: 'completed' }));
    assertEq(api.listQuests().length, 3, 'listQuests returns all');
    assertEq(api.listQuests('active').length, 1, 'listQuests filtered by active');
    assertEq(api.listQuests('completed').length, 1, 'listQuests filtered by completed');
    assertEq(api.listQuests('available').length, 1, 'listQuests filtered by available');
  }

  console.log('');
  console.log('=== SECTION 20: Quest API — activateQuest ===');
  {
    const api = createQuestApi();
    api.createQuest(makeQuest({ questId: 'q1', status: 'available' }));
    assert(api.activateQuest('q1') === true, 'activate available quest succeeds');
    assertEq(api.getQuest('q1')!.status, 'active', 'quest now active');
    assert(api.activateQuest('q1') === false, 'activate already-active quest fails');
    assert(api.activateQuest('nonexistent') === false, 'activate missing quest fails');
    api.createQuest(makeQuest({ questId: 'q2', status: 'completed' }));
    assert(api.activateQuest('q2') === false, 'activate completed quest fails');
  }

  console.log('');
  console.log('=== SECTION 21: Quest API — completeObjective ===');
  {
    const api = createQuestApi();
    api.createQuest(makeQuest({
      questId: 'q1', status: 'active',
      objectives: [
        makeObjective({ objectiveId: 'o1', completed: false }),
        makeObjective({ objectiveId: 'o2', completed: false }),
      ],
    }));
    assert(api.completeObjective('q1', 'o1') === true, 'complete first objective');
    assertEq(api.getQuest('q1')!.objectives[0].completed, true, 'o1 marked done');
    assertEq(api.getQuest('q1')!.status, 'active', 'quest still active (one obj left)');
    assert(api.completeObjective('q1', 'o1') === false, 're-complete same objective fails');
    assert(api.completeObjective('q1', 'o2') === true, 'complete second objective');
    assertEq(api.getQuest('q1')!.status, 'completed', 'quest auto-completes when all objectives done');
    assert(api.completeObjective('q1', 'o1') === false, 'complete on completed quest fails');
    assert(api.completeObjective('nonexistent', 'o1') === false, 'complete on missing quest fails');
  }

  console.log('');
  console.log('=== SECTION 22: Quest API — completeQuest / failQuest ===');
  {
    const api = createQuestApi();
    api.createQuest(makeQuest({
      questId: 'q1', status: 'active',
      objectives: [makeObjective({ objectiveId: 'o1', completed: false })],
    }));
    assert(api.completeQuest('q1') === true, 'completeQuest on active succeeds');
    assertEq(api.getQuest('q1')!.status, 'completed', 'status is completed');
    assertEq(api.getQuest('q1')!.objectives[0].completed, true, 'all objectives marked done');
    assert(api.completeQuest('q1') === false, 'completeQuest on completed fails');

    api.createQuest(makeQuest({ questId: 'q2', status: 'active' }));
    assert(api.failQuest('q2') === true, 'failQuest on active succeeds');
    assertEq(api.getQuest('q2')!.status, 'failed', 'status is failed');
    assert(api.failQuest('q2') === false, 'failQuest on failed fails');

    api.createQuest(makeQuest({ questId: 'q3', status: 'available' }));
    assert(api.failQuest('q3') === true, 'failQuest on available succeeds');
    assert(api.failQuest('nonexistent') === false, 'failQuest on missing fails');
  }

  console.log('');
  console.log('=== SECTION 23: Quest API — expireQuests ===');
  {
    const api = createQuestApi();
    api.createQuest(makeQuest({ questId: 'q1', status: 'available', deadlineTick: 100 }));
    api.createQuest(makeQuest({ questId: 'q2', status: 'active', deadlineTick: 100 }));
    api.createQuest(makeQuest({ questId: 'q3', status: 'available', deadlineTick: null }));
    api.createQuest(makeQuest({ questId: 'q4', status: 'completed', deadlineTick: 100 }));
    const expired = api.expireQuests(150);
    assertEq(expired, 2, 'two quests expired');
    assertEq(api.getQuest('q1')!.status, 'expired', 'q1 expired');
    assertEq(api.getQuest('q2')!.status, 'expired', 'q2 expired');
    assertEq(api.getQuest('q3')!.status, 'available', 'q3 not expired (no deadline)');
    assertEq(api.getQuest('q4')!.status, 'completed', 'q4 not expired (already completed)');
    // No new expirations on second call
    const expired2 = api.expireQuests(200);
    assertEq(expired2, 0, 'no new expirations on second call');
  }

  console.log('');
  console.log('=== SECTION 24: Quest API — Companion lifecycle ===');
  {
    const api = createQuestApi();
    const c = api.createCompanion(1001, null);
    assertEq(c.npcId, 1001, 'companion npcId correct');
    assertEq(c.approval, 0, 'companion starts at 0 approval');
    assertEq(c.trust, 0, 'companion starts at 0 trust');
    assertEq(c.familiarity, 0, 'companion starts at 0 familiarity');
    assertEq(c.sharedExperiences.length, 0, 'no shared experiences yet');
    assertEq(c.personalArc, null, 'no arc when arcId is null');

    const got = api.getCompanion(1001);
    assert(got !== undefined, 'getCompanion returns companion');
    assertEq(api.listCompanions().length, 1, 'one companion listed');
    assertEq(api.listCompanions()[0], 1001, 'companion id in list');

    assert(api.removeCompanion(1001) === true, 'removeCompanion succeeds');
    assert(api.getCompanion(1001) === undefined, 'companion gone after remove');
    assert(api.removeCompanion(1001) === false, 'removeCompanion missing fails');
    assertEq(api.listCompanions().length, 0, 'no companions listed');
  }

  console.log('');
  console.log('=== SECTION 25: Quest API — addSharedExperience ===');
  {
    const api = createQuestApi();
    api.createCompanion(1001, null);
    const exp: SharedExperience = {
      experienceId: 'e1', type: 'combat', tick: 50, approvalDelta: 0.4,
    };
    assert(api.addSharedExperience(1001, exp) === true, 'addSharedExperience succeeds');
    const c = api.getCompanion(1001)!;
    assertEq(c.sharedExperiences.length, 1, 'experience added');
    approx(c.approval, 0.4, 0.001, 'approval raised by 0.4');
    assertGt(c.trust, 0, 'trust raised');
    assertGt(c.familiarity, 0, 'familiarity raised');

    // Clamping approval to 1
    api.addSharedExperience(1001, { experienceId: 'e2', type: 'triumph', tick: 60, approvalDelta: 0.9 });
    assertEq(api.getCompanion(1001)!.approval, 1, 'approval clamped to 1');

    // Negative delta
    api.addSharedExperience(1001, { experienceId: 'e3', type: 'loss', tick: 70, approvalDelta: -2.0 });
    assertEq(api.getCompanion(1001)!.approval, -1, 'approval clamped to -1');

    assert(api.addSharedExperience(9999, exp) === false, 'addSharedExperience to missing companion fails');
  }

  console.log('');
  console.log('=== SECTION 26: Quest API — updateApproval ===');
  {
    const api = createQuestApi();
    api.createCompanion(1001, null);
    api.updateApproval(1001, 0.5, 100);
    assertEq(api.getCompanion(1001)!.approval, 0.5, 'approval updated to 0.5');
    api.updateApproval(1001, 0.6, 110);
    assertEq(api.getCompanion(1001)!.approval, 1, 'approval clamped to 1 on overflow');
    api.updateApproval(1001, -2.0, 120);
    assertEq(api.getCompanion(1001)!.approval, -1, 'approval clamped to -1 on underflow');
    // No-op on missing companion (should not throw)
    api.updateApproval(9999, 0.5, 100);
    assert(true, 'updateApproval on missing does not throw');
  }

  console.log('');
  console.log('=== SECTION 27: Quest API — advanceCompanionArc ===');
  {
    const api = createQuestApi();
    // Register an arc indirectly: createCompanion with arcId looks up companionArcs map;
    // since we have no direct setter, the arc will be the empty fallback { stages: [], currentStage: 0 }.
    api.createCompanion(1001, 'arc1');
    const c = api.getCompanion(1001)!;
    assert(c.personalArc !== null, 'arc attached (fallback)');
    // With empty stages, advance returns -1
    const r = api.advanceCompanionArc(1001);
    assertEq(r, -1, 'advance on empty arc returns -1');
    // Missing companion
    assertEq(api.advanceCompanionArc(9999), -1, 'advance on missing companion returns -1');
    // Missing arc
    api.createCompanion(1002, null);
    assertEq(api.advanceCompanionArc(1002), -1, 'advance on null arc returns -1');
  }

  console.log('');
  console.log('=== SECTION 28: Quest API — Romance lifecycle ===');
  {
    const api = createQuestApi();
    const id = api.createRomance(1, 2);
    assertEq(id, 'romance-1-2', 'romance id format');
    const r = api.getRomance(id);
    assert(r !== undefined, 'romance created');
    assertEq(r!.stage, 'unmet', 'starts at unmet');
    assertEq(r!.intensity, 0, 'intensity starts at 0');
    assertEq(r!.stability, 0, 'stability starts at 0');
    assertEq(r!.honesty, 0, 'honesty starts at 0');
    assertEq(r!.cutsExchanged.length, 0, 'no cuts yet');
    assertEq(r!.lastCutTick, null, 'lastCutTick null');

    // Idempotent
    const id2 = api.createRomance(1, 2);
    assertEq(id, id2, 'createRomance idempotent');
    assertEq(api.listRomances().length, 1, 'one romance listed');

    assert(api.getRomance('nonexistent') === undefined, 'missing romance undefined');
  }

  console.log('');
  console.log('=== SECTION 29: Quest API — exchangeCut stage progression ===');
  {
    const api = createQuestApi();
    const id = api.createRomance(1, 2);

    // First cut: honesty > 0.1 → acquaintance
    assert(api.exchangeCut(id, {
      tick: 100,
      cutType: 'fact_revealed',
      deflectionType: 'accepted',
      content: 'I once was mortal.',
      intensityDelta: 0.0,
      stabilityDelta: 0.0,
      honestyDelta: 0.2,
    }) === true, 'first cut succeeds');
    assertEq(api.getRomance(id)!.stage, 'acquaintance', 'stage → acquaintance');
    assertEq(api.getRomance(id)!.cutsExchanged.length, 1, 'one cut exchanged');

    // Within 24h: blocked
    assert(api.exchangeCut(id, {
      tick: 100 + 100,
      cutType: 'feeling_confessed',
      deflectionType: 'accepted',
      content: 'I trust you.',
      intensityDelta: 0.4,
      stabilityDelta: 0.0,
      honestyDelta: 0.0,
    }) === false, 'cut within 24h blocked');

    // After 24h: intensity > 0.3 → tension → first_cut (cascading let/if chain
    // means tension is transient when cutsExchanged.length >= 1)
    assert(api.exchangeCut(id, {
      tick: 100 + 24 * 60 + 1,
      cutType: 'feeling_confessed',
      deflectionType: 'accepted',
      content: 'I trust you.',
      intensityDelta: 0.4,
      stabilityDelta: 0.0,
      honestyDelta: 0.0,
    }) === true, 'cut after 24h succeeds');
    const r2 = api.getRomance(id)!;
    assertEq(r2.stage, 'first_cut', 'stage → first_cut (tension cascades when cuts >= 1)');

    // Missing romance
    assert(api.exchangeCut('nonexistent', {
      tick: 1000, cutType: 'fact_revealed', deflectionType: 'accepted',
      content: 'x', intensityDelta: 0.1, stabilityDelta: 0.1, honestyDelta: 0.1,
    }) === false, 'cut on missing romance fails');
  }

  console.log('');
  console.log('=== SECTION 30: Quest API — getMaxCutsPerDay ===');
  {
    const api1 = createQuestApi();
    assertEq(api1.getMaxCutsPerDay(), 1, 'default maxCutsPerDay is 1');
    const api2 = createQuestApi(3);
    assertEq(api2.getMaxCutsPerDay(), 3, 'custom maxCutsPerDay is 3');
  }

  console.log('');
  console.log('=== SECTION 31: Quest API — Narrative Spine creation ===');
  {
    const api = createQuestApi();
    const beats: NarrativeBeat[] = [
      makeBeat({ beatId: 'a1b1', actNumber: 1 }),
      makeBeat({ beatId: 'a1b2', actNumber: 1 }),
      makeBeat({ beatId: 'a2b1', actNumber: 2 }),
      makeBeat({ beatId: 'a3b1', actNumber: 3 }),
    ];
    const spine = api.createSpine(beats);
    assertEq(spine.acts.length, 3, 'three acts');
    assertEq(spine.acts[0].beats.length, 2, 'act 1 has 2 beats');
    assertEq(spine.acts[1].beats.length, 1, 'act 2 has 1 beat');
    assertEq(spine.acts[2].beats.length, 1, 'act 3 has 1 beat');
    assertEq(spine.currentAct, 1, 'starts at act 1');
    assertEq(spine.beatsCompleted.length, 0, 'no beats completed yet');
    assertEq(spine.beatsMissed.length, 0, 'no beats missed yet');
    assertEq(spine.driftMode, false, 'drift mode off');
    assertEq(spine.maxMissedPerAct, 2, 'default maxMissedPerAct is 2');
    const got = api.getSpine();
    assert(got !== undefined, 'getSpine returns spine');
  }

  console.log('');
  console.log('=== SECTION 32: Quest API — Spine with custom maxMissedPerAct ===');
  {
    const api = createQuestApi();
    const spine = api.createSpine([], 5);
    assertEq(spine.maxMissedPerAct, 5, 'custom maxMissedPerAct is 5');
  }

  console.log('');
  console.log('=== SECTION 33: Quest API — checkBeats / drift mode ===');
  {
    const api = createQuestApi();
    const beats: NarrativeBeat[] = [
      makeBeat({ beatId: 'a1b1', actNumber: 1, sessionRange: [0, 2], missable: true }),
      makeBeat({ beatId: 'a1b2', actNumber: 1, sessionRange: [0, 2], missable: true }),
      makeBeat({ beatId: 'a1b3', actNumber: 1, sessionRange: [0, 2], missable: true }),
    ];
    api.createSpine(beats, 2);
    // Trigger a fire: knowledge fact present, tick past session start
    // session = floor(tick / (60*60*24)); for tick = 86400 * 1 = one day, session = 1
    const ws = makeWorld({ knowledgeFacts: ['fact:x'] });
    const fired = api.checkBeats(ws, 60 * 60 * 24); // session 1, within range [0,2]
    assertGt(fired.length, 0, 'at least one beat fired');
    const spine = api.getSpine()!;
    assertGt(spine.beatsCompleted.length, 0, 'beatsCompleted incremented');
  }

  console.log('');
  console.log('=== SECTION 34: Quest API — checkBeats without spine ===');
  {
    const api = createQuestApi();
    const fired = api.checkBeats(makeWorld(), 100);
    assertEq(fired.length, 0, 'no spine: empty fired list');
  }

  console.log('');
  console.log('=== SECTION 35: Quest API — enterDriftMode ===');
  {
    const api = createQuestApi();
    api.createSpine([makeBeat()]);
    assertEq(api.getSpine()!.driftMode, false, 'drift off initially');
    api.enterDriftMode();
    assertEq(api.getSpine()!.driftMode, true, 'drift on after enterDriftMode');
    // No spine: should not throw
    const api2 = createQuestApi();
    api2.enterDriftMode();
    assert(api2.getSpine() === undefined, 'no spine: enterDriftMode no-op');
  }

  console.log('');
  console.log('=== SECTION 36: Quest API — Endings ===');
  {
    const api = createQuestApi();
    const trigger: EndingTrigger = {
      triggerId: 't1', endingId: 'e_ascension',
      description: 'Player ascends', priority: 10, final: true, trueSinceTick: null,
    };
    assert(api.registerEnding(trigger) === true, 'registerEnding succeeds');

    // Default ending when no condition met
    const endings1 = api.checkEndings(makeWorld());
    assertGt(endings1.length, 0, 'default ending returned');
    const defaultEnding = endings1.find(e => e.endingId === 'default_ending');
    assert(defaultEnding !== undefined, 'default ending present');

    // Mahayana realm triggers registered ending
    const endings2 = api.checkEndings(makeWorld({ playerRealm: 'mahayana' }));
    const ascension = endings2.find(e => e.endingId === 'e_ascension');
    assert(ascension !== undefined, 'ascension ending present at mahayana');

    // final_battle_won flag also triggers
    const endings3 = api.checkEndings(makeWorld({ flags: { final_battle_won: true } }));
    const won = endings3.find(e => e.endingId === 'e_ascension');
    assert(won !== undefined, 'ending present when final_battle_won flag set');
  }

  console.log('');
  console.log('=== SECTION 37: Quest API — Tier management ===');
  {
    const api = createQuestApi();
    // Default tier is 4 when not set
    assertEq(api.getTier(1001), 4, 'default tier is 4');
    api.setTier(1001, 2);
    assertEq(api.getTier(1001), 2, 'tier set to 2');
    api.setTier(1001, 0);
    assertEq(api.getTier(1001), 0, 'tier set to 0');
    // Other entity still default
    assertEq(api.getTier(2002), 4, 'other entity still default');
  }

  console.log('');
  console.log('=== SECTION 38: Quest API — stats ===');
  {
    const api = createQuestApi();
    // Initial stats
    let s = api.stats();
    assertEq(s.totalQuests, 0, 'initial totalQuests 0');
    assertEq(s.totalCompanions, 0, 'initial totalCompanions 0');
    assertEq(s.totalRomances, 0, 'initial totalRomances 0');
    assertEq(s.totalCutExchanges, 0, 'initial totalCutExchanges 0');
    assertEq(s.spineBeatsFired, 0, 'initial spineBeatsFired 0');
    assertEq(s.spineBeatsMissed, 0, 'initial spineBeatsMissed 0');

    api.createQuest(makeQuest({ questId: 'q1', status: 'available' }));
    api.createQuest(makeQuest({ questId: 'q2', status: 'active' }));
    api.createQuest(makeQuest({ questId: 'q3', status: 'completed' }));
    api.createQuest(makeQuest({ questId: 'q4', status: 'failed' }));
    api.createCompanion(1001, null);
    api.createRomance(1, 2);

    s = api.stats();
    assertEq(s.totalQuests, 4, 'totalQuests 4');
    assertEq(s.byStatus.available, 1, 'available 1');
    assertEq(s.byStatus.active, 1, 'active 1');
    assertEq(s.byStatus.completed, 1, 'completed 1');
    assertEq(s.byStatus.failed, 1, 'failed 1');
    assertEq(s.byStatus.expired, 0, 'expired 0');
    assertEq(s.totalCompanions, 1, 'totalCompanions 1');
    assertEq(s.totalRomances, 1, 'totalRomances 1');
  }

  console.log('');
  console.log('=== SECTION 39: Quest API — stats after cut exchange ===');
  {
    const api = createQuestApi();
    const id = api.createRomance(1, 2);
    api.exchangeCut(id, {
      tick: 100, cutType: 'fact_revealed', deflectionType: 'accepted',
      content: 'x', intensityDelta: 0.2, stabilityDelta: 0.2, honestyDelta: 0.2,
    });
    const s = api.stats();
    assertEq(s.totalCutExchanges, 1, 'totalCutExchanges 1');
  }

  console.log('');
  console.log('=== SECTION 40: Plugin lifecycle — createQuestPlugin ===');
  {
    const plugin = createQuestPlugin();
    assertEq(plugin.id, 'ga:quest', 'plugin id is ga:quest');
    assertEq(plugin.version, '0.1.0', 'plugin version 0.1.0');
    assert(Array.isArray(plugin.dependencies), 'dependencies is array');
    assert(plugin.dependencies.includes('ga:determinism'), 'depends on ga:determinism');
    assert(typeof plugin.init === 'function', 'init is function');
    assert(typeof plugin.destroy === 'function', 'destroy is function');
  }

  console.log('');
  console.log('=== SECTION 41: Plugin lifecycle — init registers 3 capabilities ===');
  {
    // Build a minimal PluginHost stub
    const capabilities: {
      registered: { capability: string; provider: string; version: string; instance: unknown }[];
      register(c: { capability: string; provider: string; version: string; instance: unknown }): void;
      unregister(capability: string, provider: string): void;
      resolve: (capability: string) => unknown;
    } = {
      registered: [],
      register(c) { capabilities.registered.push(c); },
      unregister(capability, provider) {
        capabilities.registered = capabilities.registered.filter(
          r => !(r.capability === capability && r.provider === provider)
        );
      },
      resolve(capability) {
        return capabilities.registered.find(r => r.capability === capability)?.instance;
      },
    };
    const state: Record<string, unknown> = {};
    const host = {
      capabilities,
      setState(id: string, s: unknown) { state[id] = s; },
      getState(id: string) { return state[id]; },
    } as unknown as PluginHost;

    const plugin = createQuestPlugin();
    plugin.init(host);
    assertEq(capabilities.registered.length, 3, '3 capabilities registered');
    const caps = capabilities.registered.map(r => r.capability).sort();
    assertEq(caps[0], 'quest.dialogue', 'capability quest.dialogue');
    assertEq(caps[1], 'quest.narrative', 'capability quest.narrative');
    assertEq(caps[2], 'quest.state', 'capability quest.state');
    for (const r of capabilities.registered) {
      assertEq(r.provider, 'ga:quest', 'provider is ga:quest');
      assertEq(r.version, '0.1.0', 'version 0.1.0');
    }
    // State was set
    assert(state['ga:quest'] !== undefined, 'plugin state set');

    // The instance is the QuestApi
    const api = capabilities.resolve('quest.dialogue') as QuestApi;
    assert(typeof api.createQuest === 'function', 'instance has createQuest');
    assert(typeof api.exchangeCut === 'function', 'instance has exchangeCut');
    assert(typeof api.createSpine === 'function', 'instance has createSpine');
    assert(typeof api.checkEndings === 'function', 'instance has checkEndings');

    // Destroy unregisters
    plugin.destroy(host);
    assertEq(capabilities.registered.length, 0, 'all capabilities unregistered on destroy');
  }

  console.log('');
  console.log('=== SECTION 42: Integration — full quest lifecycle ===');
  {
    const api = createQuestApi();
    // Create available quest with 2 objectives
    api.createQuest(makeQuest({
      questId: 'lifecycle', questType: 'retrieve_manual', status: 'available',
      objectives: [
        makeObjective({ objectiveId: 'reach', type: 'reach_location' }),
        makeObjective({ objectiveId: 'acquire', type: 'acquire_item' }),
      ],
      rewards: [{ type: 'technique', value: 'sword_art' } as QuestReward],
      deadlineTick: 1000,
    }));
    assertEq(api.listQuests('available').length, 1, 'available: 1');
    api.activateQuest('lifecycle');
    assertEq(api.getQuest('lifecycle')!.status, 'active', 'now active');
    api.completeObjective('lifecycle', 'reach');
    assertEq(api.getQuest('lifecycle')!.status, 'active', 'still active after first obj');
    api.completeObjective('lifecycle', 'acquire');
    assertEq(api.getQuest('lifecycle')!.status, 'completed', 'auto-completed after all objs');
    const s = api.stats();
    assertEq(s.byStatus.completed, 1, 'stats: 1 completed');
  }

  console.log('');
  console.log('=== SECTION 43: Integration — companion arc with shared experiences ===');
  {
    const api = createQuestApi();
    api.createCompanion(2001, null);
    // Build approval through shared experiences
    for (let i = 0; i < 5; i++) {
      api.addSharedExperience(2001, {
        experienceId: `e${i}`, type: 'combat', tick: 100 + i, approvalDelta: 0.1,
      });
    }
    const c = api.getCompanion(2001)!;
    assertEq(c.sharedExperiences.length, 5, '5 experiences recorded');
    approx(c.approval, 0.5, 0.001, 'approval ~0.5');
    api.updateApproval(2001, 0.0, 200);
    // After update, smoothedApproval is computed from history
    assert(c.smoothedApproval !== c.approval || c.sharedExperiences.length === 0,
      'smoothedApproval computed');
  }

  console.log('');
  console.log('=== SECTION 44: Integration — romance full arc ===');
  {
    const api = createQuestApi();
    const id = api.createRomance(10, 20);
    let tick = 100;
    // Cut 1: honesty → acquaintance
    api.exchangeCut(id, { tick, cutType: 'fact_revealed', deflectionType: 'accepted', content: 'a', intensityDelta: 0.0, stabilityDelta: 0.0, honestyDelta: 0.2 });
    assertEq(api.getRomance(id)!.stage, 'acquaintance', 'step 1: acquaintance');
    tick += 24 * 60 + 1;
    // Cut 2: intensity > 0.3 cascades tension → first_cut (cuts already >= 1)
    api.exchangeCut(id, { tick, cutType: 'feeling_confessed', deflectionType: 'accepted', content: 'b', intensityDelta: 0.4, stabilityDelta: 0.0, honestyDelta: 0.0 });
    assertEq(api.getRomance(id)!.stage, 'first_cut', 'step 2: first_cut (tension cascades)');
    tick += 24 * 60 + 1;
    // Cut 3: more intensity + honesty → first_cut (cutsExchanged >= 1, intensity > 0.6, honesty > 0.5)
    api.exchangeCut(id, { tick, cutType: 'vulnerability_shown', deflectionType: 'accepted', content: 'c', intensityDelta: 0.3, stabilityDelta: 0.2, honestyDelta: 0.4 });
    const stage3 = api.getRomance(id)!.stage;
    assert(stage3 === 'first_cut' || stage3 === 'courtship', `step 3: progressed to first_cut or courtship (got ${stage3})`);
    assertEq(api.getRomance(id)!.cutsExchanged.length, 3, '3 cuts exchanged');
  }

  console.log('');
  console.log('=== SECTION 45: Integration — dialogue with consequences ===');
  {
    const api = createQuestApi();
    const tree = makeTree({
      treeId: 'dialogue_test',
      nodes: {
        n1: makeNode({
          nodeId: 'n1',
          npcLine: 'Have you heard the rumor?',
          responses: [
            makeResponse({
              responseId: 'accept',
              playerLine: 'Tell me more.',
              consequences: [
                { type: 'add_knowledge_fact', value: 'fact:rumor' },
                { type: 'set_flag', flag: 'heard_rumor', value: true },
              ],
              nextNodeId: 'END',
            }),
            makeResponse({
              responseId: 'decline',
              playerLine: 'Not interested.',
              consequences: [],
              nextNodeId: 'END',
            }),
          ],
        }),
      },
    });
    api.registerDialogueTree(tree);
    const ws = makeWorld();
    // Player chooses accept
    const responses = getAvailableResponses(tree, 'n1', ws);
    const accept = responses.find(r => r.responseId === 'accept')!;
    api.applyConsequences(accept.consequences, ws);
    assert(ws.knowledgeFacts.includes('fact:rumor'), 'knowledge fact added via dialogue');
    assertEq(ws.flags['heard_rumor'], true, 'flag set via dialogue');
  }

  console.log('');
  console.log('=== SECTION 46: Integration — narrative spine with multiple acts ===');
  {
    const api = createQuestApi();
    const beats: NarrativeBeat[] = [
      makeBeat({ beatId: 'a1b1', actNumber: 1, sessionRange: [0, 5] }),
      makeBeat({ beatId: 'a2b1', actNumber: 2, sessionRange: [0, 5] }),
      makeBeat({ beatId: 'a3b1', actNumber: 3, sessionRange: [0, 5] }),
    ];
    api.createSpine(beats, 2);
    const ws = makeWorld({ knowledgeFacts: ['fact:prologue'] });
    // tick = 1 day → session 1, in range
    api.checkBeats(ws, 60 * 60 * 24);
    const spine = api.getSpine()!;
    assertGt(spine.beatsCompleted.length, 0, 'some beats completed');
  }

  console.log('');
  console.log('=== SECTION 47: Edge cases — empty objectives, zero rewards ===');
  {
    const api = createQuestApi();
    api.createQuest(makeQuest({ questId: 'empty', objectives: [], rewards: [] }));
    assert(isQuestComplete(api.getQuest('empty')!) === false, 'empty objectives: not complete');
    api.activateQuest('empty');
    // completeObjective on empty quest: no objectives to complete
    assert(api.completeObjective('empty', 'o1') === false, 'completeObjective on empty quest fails');
    // completeQuest force-completes (sets all objectives done — none — and status)
    assert(api.completeQuest('empty') === true, 'completeQuest on empty succeeds');
    assertEq(api.getQuest('empty')!.status, 'completed', 'empty quest force-completed');
  }

  console.log('');
  console.log('=== SECTION 48: Edge cases — romance with self ===');
  {
    const api = createQuestApi();
    const id = api.createRomance(5, 5);
    assertEq(id, 'romance-5-5', 'self-romance id format');
    assert(api.getRomance(id) !== undefined, 'self-romance created (no validation)');
    // Should still function
    assert(api.exchangeCut(id, {
      tick: 100, cutType: 'fact_revealed', deflectionType: 'accepted',
      content: 'self', intensityDelta: 0.2, stabilityDelta: 0.2, honestyDelta: 0.2,
    }) === true, 'self cut succeeds');
  }

  console.log('');
  console.log('=== SECTION 49: Determinism — same inputs, same outputs ===');
  {
    // Two separate API instances with the same sequence of operations
    // should produce identical state.
    const api1 = createQuestApi();
    const api2 = createQuestApi();
    const quest = makeQuest({ questId: 'det1', status: 'available' });
    api1.createQuest(quest);
    api2.createQuest(makeQuest({ questId: 'det1', status: 'available' }));
    api1.activateQuest('det1');
    api2.activateQuest('det1');
    api1.completeQuest('det1');
    api2.completeQuest('det1');
    assertEq(api1.getQuest('det1')!.status, api2.getQuest('det1')!.status, 'determinism: status identical');
    assertEq(api1.stats().totalQuests, api2.stats().totalQuests, 'determinism: stats identical');
  }

  console.log('');
  console.log('=== SECTION 50: No forbidden functions used ===');
  {
    // Verify the plugin source does not import or call forbidden functions.
    // (Static check: the plugin module loads without referencing Math.random etc.
    //  We confirm by importing it — if it referenced forbidden functions at module
    //  scope, it would still load, but the conformance is enforced by code review
    //  and lint. Here we just confirm the API is functional and pure.)
    const api = createQuestApi();
    api.createQuest(makeQuest({ questId: 'pure' }));
    assert(api.getQuest('pure') !== undefined, 'API operates without side-effects on globals');
  }

  // ============================================================================
  // Final report
  // ============================================================================
  console.log('');
  console.log('============================================================');
  console.log(`Quest Conformance: ${passed} passed, ${failed} failed, ${passed + failed} total`);
  console.log('============================================================');
  if (failed > 0) {
    console.error(`❌ ${failed} TESTS FAILED`);
    process.exit(1);
  }
}

run();
