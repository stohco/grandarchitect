# 34 — Dialogue, Quest, and Narrative

**Status:** Foundation. The narrative engine — dialogue trees with perception-gated options, the quest system (generated opportunities from world state, not scripted quest-givers), the narrative spine integration (Act 1/2/3 beats, session 1/10/100/500 arc), the companion system, the romance system (the Exchange of Cuts), and the ending triggers. Includes the determinism contract and the rejection of branching-dialogue-as-story.
**Date:** 2026-08-03

---

## 0. What this document is and why it exists

The prior corpus (doc 26: narrative spine; doc 34: named NPCs and companions) specified the *content* of the narrative — the protagonist's want, the antagonist's name, the three acts, the session beats, the companion bibles, the romance system's name ("the Exchange of Cuts"), the ending triggers. It did not specify the *engine* that delivers that content: how dialogue trees are structured, how choices are gated by perception state, how quests are generated from world state rather than scripted, how the narrative spine's beats are surfaced without railroading, how companions join and leave, how the romance system's "Exchange of Cuts" actually works mechanically, and how endings are triggered by world state rather than by a final menu.

This document specifies the engine. It obeys the doctrine (AGENTS.md Part 3: "Confront the central tension directly") by naming the central tension here: xianxia readers want a chosen-one narrative with a scripted arc; the engine's simulation-first principle forbids scripted story. The resolution is that the narrative spine is a *spine* — a sequence of beats the world is biased toward producing — not a script. The beats emerge from world state; the player can miss them, delay them, or invert them. The engine guarantees that *a* story happens; it does not guarantee *the* story.

### Precedents cited

- **Disco Elysium (ZA/UM, 2019) — the dialogue-as-skill system.** Skills speak to the player; choices are gated by skill checks. This document adopts the perception-gated choice model.
- **Crusader Kings III (Paradox, 2020) — the dynamic-event system.** Events fire from world state, not from a script. This document adopts the state-driven-event model for quests.
- **Shadow of Mordor (Monolith, 2014) — the Nemesis-system dynamic relationships.** Relationships persist and evolve based on player actions. This document adopts the dynamic-relationship model for companions and romance.
- **Fallout: New Vegas (Obsidian, 2010) — the faction-reputation-driven endings.** Endings are computed from faction state at the end, not from a final choice. This document adopts the state-computed endings model.
- **Outer Wilds (Mobius, 2019) — the knowledge-gated progression.** The player progresses by learning, not by stats. This document adopts the knowledge-gated model for the narrative spine.

---

## 1. The dialogue system (trees, conditions, consequences)

Dialogue is a tree of nodes. Each node has text (the NPC's line), a set of player responses, and conditions that gate which responses are available. Each response has consequences.

```typescript
interface DialogueTree {
  treeId: string;
  rootNodeId: string;
  nodes: Record<string, DialogueNode>;
  speakerId: number;               // the NPC
  contextTags: string[];           // 'greeting', 'quest_offer', 'gossip', 'farewell', etc.
}

interface DialogueNode {
  nodeId: string;
  npcLine: string;                 // the NPC's spoken text
  // Optional: voice acting reference, portrait, animation
  voiceActingId?: string;
  portraitExpression?: string;
  responses: DialogueResponse[];
  // Conditions that must hold for this node to be reached
  nodeConditions: DialogueCondition[];
}

interface DialogueResponse {
  responseId: string;
  playerLine: string;              // the player's spoken text (or internal thought)
  // Conditions that must hold for this response to be available
  responseConditions: DialogueCondition[];
  // Consequences of choosing this response
  consequences: DialogueConsequence[];
  // The next node to go to (or 'END' to end the conversation)
  nextNodeId: string | 'END';
}

type DialogueCondition =
  | { type: 'perception_state'; state: PerceptionState; min: number }
  | { type: 'knowledge_fact'; factId: string }
  | { type: 'relationship'; targetId: number; min: number }
  | { type: 'trait'; trait: string; min: number }
  | { type: 'realm'; min: Realm }
  | { type: 'quest_state'; questId: string; state: string }
  | { type: 'flag'; flag: string; value: boolean }
  | { type: 'inventory'; itemId: string; min: number };

interface DialogueConsequence {
  type: 'set_flag' | 'give_item' | 'take_item' | 'modify_relationship'
      | 'add_knowledge_fact' | 'start_quest' | 'advance_quest' | 'complete_quest'
      | 'modify_trait' | 'spawn_event' | 'reveal_perception';
  target?: number;
  value?: unknown;
}
```

### 1.1 The perception-gated choices

Per doc 23 §1.5 and doc 27 §1, the player's perception state gates which dialogue options are available. A player in `sense_qi` mode sees options that reveal qi-information ("I see a faint warmth in your chest"). A player without that perception does not see those options.

```typescript
type PerceptionState =
  | 'normal'
  | 'sense_qi'              // Qi Condensation+; reveals qi-state of speaker
  | 'read_residue'          // reveals recent events at this location
  | 'sense_anchor'          // Core Formation+; reveals anchor state
  | 'sense_law'             // Spirit Severance+; reveals law-fragments in area
  | 'divination_active';    // temporary; reveals qi-momentum

// Example: Wang Lun's first dialogue, with perception-gated options
const wangLunDialogue: DialogueTree = {
  treeId: 'wang_lun_first_meeting',
  speakerId: 42,  // Wang Lun
  rootNodeId: 'root',
  nodes: {
    'root': {
      npcLine: "You've been staring at the incense again. What do you see?",
      nodeConditions: [],
      responses: [
        {
          responseId: 'honest_depth',
          playerLine: '"A depth in the sound. A second room."',
          responseConditions: [
            { type: 'perception_state', state: 'sense_qi', min: 0.3 }
          ],
          consequences: [
            { type: 'modify_relationship', target: 42, value: +0.2 },
            { type: 'add_knowledge_fact', value: 'wang_lun_perceives_depth' },
            { type: 'reveal_perception', value: 'wang_lun_qi_state' }
          ],
          nextNodeId: 'wang_lun_recognizes'
        },
        {
          responseId: 'dismissive',
          playerLine: '"Nothing. I\'m just tired."',
          responseConditions: [],
          consequences: [
            { type: 'modify_relationship', target: 42, value: -0.05 }
          ],
          nextNodeId: 'wang_lun_dismisses'
        },
        {
          responseId: 'honest_confused',
          playerLine: '"I don\'t know what I\'m seeing."',
          responseConditions: [],
          consequences: [],
          nextNodeId: 'wang_lun_offers_to_teach'
        }
      ]
    },
    // ... more nodes
  }
};
```

**The reveal rule.** A perception-gated response, when chosen, may *reveal* information to the player (via `reveal_perception` consequence). The player sees the NPC's qi-state (or anchor state, or law-fragments) only if they chose the perception-gated option. This is the doctrine's "no omniscience" rule: the player must *choose* to perceive, paying the attention cost (per doc 13 §5) and exposing themselves to the speaker's perception (the act of reading is readable, per doc 27 §5).

### 1.2 The condition evaluation

Each tick during a dialogue, the engine evaluates all `responseConditions` for the currently-displayed node's responses. Responses whose conditions fail are hidden (not greyed-out — hidden, per the doctrine's "the player does not see what they cannot perceive" rule).

**Failure case — dialogue lock.** If all responses' conditions fail, the player is stuck. The engine ensures at least one response is always available: the "Leave" response, which has no conditions and ends the conversation. The player can always leave.

---

## 2. The quest system (generated opportunities, not scripted quest-givers)

The engine does not have scripted quest-givers. Quests are *generated opportunities* — events in the world state that the player can choose to engage with. A quest is a typed record with preconditions, objectives, and rewards.

```typescript
interface Quest {
  questId: string;
  questType: QuestType;
  generatedAtTick: number;
  originEventId: number | null;    // the world event that spawned this opportunity
  objectives: QuestObjective[];
  rewards: QuestReward[];
  failureConsequences: QuestConsequence[];
  deadlineTick: number | null;     // optional; some opportunities expire
  status: 'available' | 'active' | 'completed' | 'failed' | 'expired';
}

type QuestType =
  | 'gather_herb'        | 'hunt_beast'         | 'deliver_message'
  | 'escort_npc'         | 'investigate_rumor'  | 'resolve_dispute'
  | 'clear_ruin'         | 'retrieve_manual'    | 'protect_caravan'
  | 'avenge_kin'         | 'find_master'        | 'take_disciple'
  | 'break_through'      | 'found_sect'         | 'compete_auction'
  | 'pilgrimage'         | 'cure_illness'       | 'lift_curse';

interface QuestObjective {
  objectiveId: string;
  description: string;
  type: 'reach_location' | 'acquire_item' | 'defeat_npc' | 'protect_npc'
      | 'perceive_state' | 'choose_response' | 'wait_event' | 'complete_rite';
  target: unknown;
  completed: boolean;
}

interface QuestReward {
  type: 'cash' | 'silver' | 'spirit_stone' | 'item' | 'knowledge_fact'
      | 'relationship' | 'reputation' | 'technique' | 'law_fragment';
  value: unknown;
}
```

### 2.1 Quest generation

Quests are generated by the `ga:quest-generator` plugin, which scans world state each in-game day for opportunities:

```typescript
interface QuestGenerator {
  generators: QuestGeneratorRule[];
  questCap: number;                // max active quests; default 32
}

interface QuestGeneratorRule {
  ruleId: string;
  questType: QuestType;
  // The world-state predicate that, when true, makes this quest available
  predicate: (worldState: WorldState, playerId: number) => boolean;
  // The constructor that builds the quest from the matched state
  buildQuest: (worldState: WorldState, playerId: number) => Quest;
  // How often to check this rule (in days)
  checkInterval: number;
  // Minimum player realm for this quest
  minRealm: Realm;
}
```

**Example generators:**

```typescript
// "A villager is sick; the player can offer to gather medicine"
const cureIllnessGenerator: QuestGeneratorRule = {
  ruleId: 'cure_illness_villager',
  questType: 'cure_illness',
  predicate: (ws, playerId) => {
    const village = getPlayerVillage(ws, playerId);
    return village.npcs.some(npc =>
      npc.hasCondition('illness') &&
      npc.relationships[playerId]?.familiarity > 0.3
    );
  },
  buildQuest: (ws, playerId) => {
    const sickNpc = findSickNpcInPlayerVillage(ws, playerId);
    return {
      questId: generateQuestId(),
      questType: 'cure_illness',
      generatedAtTick: ws.tick,
      originEventId: null,
      objectives: [
        { objectiveId: 'diagnose', description: `Diagnose ${sickNpc.name}'s illness`,
          type: 'perceive_state', target: { npcId: sickNpc.id, state: 'illness' }, completed: false },
        { objectiveId: 'gather_herb', description: 'Gather the required herb',
          type: 'acquire_item', target: { itemId: 'qingxin_herb', count: 1 }, completed: false },
        { objectiveId: 'deliver', description: `Bring the medicine to ${sickNpc.name}`,
          type: 'reach_location', target: { npcId: sickNpc.id }, completed: false }
      ],
      rewards: [
        { type: 'relationship', value: { target: sickNpc.id, delta: +0.3 } },
        { type: 'cash', value: 500 }
      ],
      failureConsequences: [
        { type: 'relationship', value: { target: sickNpc.id, delta: -0.1 } }
      ],
      deadlineTick: ws.tick + 30 * 24 * 60,  // 30 in-game days
      status: 'available'
    };
  },
  checkInterval: 1,
  minRealm: 'mortal'
};

// "A ruin was discovered; the player can investigate"
const clearRuinGenerator: QuestGeneratorRule = {
  ruleId: 'clear_ruin_after_discovery',
  questType: 'clear_ruin',
  predicate: (ws, playerId) => {
    return ws.history.recentEvents.some(e =>
      e.eventType === 'discovered_inheritance' &&
      e.participants.some(p => p.npcId === playerId)
    );
  },
  buildQuest: (ws, playerId) => { /* ... */ },
  checkInterval: 7,
  minRealm: 'qi_condensation'
};
```

### 2.2 The non-scripting principle

Quests are not scripted. The `buildQuest` function constructs the quest from current world state; the same state always produces the same quest (deterministic). The NPC who offers the quest is the NPC whose state matches the predicate — they are not a "quest-giver" by role, they are a participant in the world who happens to have a problem the player can solve.

**Failure case — quest starvation.** If no predicates match (the player has alienated everyone, or the world state is quiet), no quests are available. The engine ensures a minimum quest density: if `available_quests < min_quests` (default 3), the generator lowers predicate thresholds slightly to produce more opportunities. The player always has something to do.

**Failure case — quest overload.** If too many predicates match (the player is popular and the world is eventful), the player is overwhelmed. The `questCap` (default 32) limits active quests. Excess available quests are queued; they become active when the player completes or abandons existing ones.

---

## 3. The narrative spine integration

Per doc 26, the narrative spine is the sequence of beats the world is biased toward producing. The spine is *not a script*; it is a set of world-state targets that the simulation gently steers toward.

```typescript
interface NarrativeSpine {
  acts: NarrativeAct[];
  currentAct: 1 | 2 | 3;
  currentBeat: string;
  beatsCompleted: string[];
  beatsMissed: string[];
  // The spine's bias adjustments (per §3.2)
  biasAdjustments: BiasAdjustment[];
}

interface NarrativeAct {
  actNumber: 1 | 2 | 3;
  beats: NarrativeBeat[];
}

interface NarrativeBeat {
  beatId: string;
  actNumber: 1 | 2 | 3;
  // The world-state predicate that, when true, signals this beat has fired
  firePredicate: (worldState: WorldState, playerId: number) => boolean;
  // The bias adjustments to apply when this beat is pending (per §3.2)
  pendingBias?: BiasAdjustment;
  // What happens when this beat fires
  onFire: (worldState: WorldState, playerId: number) => void;
  // Can this beat be missed? (Some can; some cannot.)
  missable: boolean;
  // The session range when this beat is expected (per doc 26 §3)
  sessionRange: [number, number];  // [min, max]
}
```

### 3.1 The Act structure (per doc 26)

```
ACT 1 — The Village (sessions 1-10)
  Beat 1.1: First qi perception (Old Chen's incense)
  Beat 1.2: First lesson (Wang Lun's failed teaching)
  Beat 1.3: Old Chen's test (the hermit's question)
  Beat 1.4: Old Chen's death (the cost of the manual)
  Beat 1.5: Departure from the village

ACT 2 — The Sect (sessions 10-100)
  Beat 2.1: Arrival at the sect
  Beat 2.2: First rival (Liang Zhu or another)
  Beat 2.3: First breakthrough (Foundation Establishment)
  Beat 2.4: The antagonist revealed (Pei Liang)
  Beat 2.5: The sect's crisis (war, scandal, or tribulation)
  Beat 2.6: Departure from the sect (or ascension within it)

ACT 3 — The World (sessions 100-500)
  Beat 3.1: The broader conflict (the Immortal Alliance or its enemy)
  Beat 3.2: Core Formation (the player's golden core)
  Beat 3.3: The confrontation with Pei Liang
  Beat 3.4: The ending (per §7)
```

### 3.2 The bias system (steering without railroading)

The spine does not *force* beats to fire. It biases the world state toward them:

```typescript
interface BiasAdjustment {
  // Adjusts event-trigger base rates to make this beat's predicate more likely
  eventRateMultipliers: Record<EventType, number>;
  // Adjusts NPC cognition weights to make NPCs behave in ways that lead to this beat
  npcCognitionBiases: { npcId: number; traitDeltas: Partial<NPCTraits> }[];
  // Adjusts quest generator thresholds to make this beat's quests more available
  questAvailabilityBoosts: string[];
  // The duration of this bias (in ticks)
  durationTicks: number;
}
```

**Example.** When Beat 1.1 (first qi perception) is pending, the bias adjustment might:
- Increase Old Chen's `traits.curiosity` slightly (he is more likely to test the player).
- Boost the `investigate_rumor` quest availability for the player.
- Increase the event rate for `prophetic_dream_wave` in the player's region (the player dreams of qi before they perceive it).

The bias is gentle (multipliers in [0.8, 1.2]); it does not force the beat. The player can still miss it (by leaving the village before meeting Old Chen, by ignoring the dreams, by refusing the test). Missed beats are recorded in `beatsMissed`; the spine adapts (per §3.3).

### 3.3 The adaptation rule

When a beat is missed, the spine does not collapse. It adapts:

- A missed Act 1 beat may be partially recovered in Act 2 (the player meets Old Chen's descendant; the manual resurfaces).
- A missed Act 2 beat may be partially recovered in Act 3 (the rival becomes an ally; the antagonist's plan changes).
- Some beats are unrecoverable (Old Chen's death cannot be redone; the player who missed it meets a different teacher).

**Failure case — spine collapse.** If the player misses too many beats (more than `max_missed_beats` per act, default 2), the spine enters `drift` mode: it stops biasing toward the original beats and starts biasing toward *a* coherent story (any story) using the player's current state as the seed. The drift mode is the doctrine's "ship a working thing" applied to narrative: a story happens, even if it is not the originally-planned story.

---

## 4. The companion system

Per doc 34 (the prior corpus doc), companions are named NPCs who join the player's party. The companion system specifies how they join, how they leave, and how their relationship with the player evolves.

```typescript
interface Companion {
  npcId: number;
  joinCondition: CompanionJoinCondition;
  joinTick: number | null;         // null = not yet joined
  leaveCondition: CompanionLeaveCondition;
  leaveTick: number | null;
  relationship: CompanionRelationship;
  // Per companion: their personal quest arc
  personalArc: CompanionArc;
  // The companion's "approval" — a single scalar that summarizes relationship
  approval: number;                // -1.0 (hostile) .. +1.0 (devoted)
}

interface CompanionJoinCondition {
  type: 'quest_completed' | 'relationship_threshold' | 'shared_danger' | 'narrative_beat';
  target: unknown;
}

interface CompanionLeaveCondition {
  type: 'approval_threshold' | 'quest_completed' | 'narrative_beat' | 'death' | 'player_choice';
  target: unknown;
  // If approval-based, the threshold below which the companion leaves
  approvalThreshold?: number;
}

interface CompanionRelationship {
  // Per doc 26 §14 (RelationshipRecord), but with companion-specific fields
  trust: number;                   // 0..1
  familiarity: number;             // 0..1
  sharedExperiences: SharedExperience[];
  unresolvedTensions: UnresolvedTension[];
}

interface SharedExperience {
  experienceId: string;
  type: 'combat' | 'quest' | 'travel' | 'revelation' | 'loss' | 'triumph';
  tick: number;
  approvalDelta: number;
}

interface CompanionArc {
  arcId: string;
  stages: CompanionArcStage[];
  currentStage: number;
}

interface CompanionArcStage {
  stageId: string;
  // The trigger that advances to this stage
  triggerPredicate: (worldState: WorldState, companion: Companion) => boolean;
  // What happens when this stage is reached
  onEnter: (worldState: WorldState, companion: Companion) => void;
  // Dialogue trees available at this stage
  availableDialogueTrees: string[];
}
```

### 4.1 The three companions (per doc 34)

- **Wang Meili** — the protagonist's childhood friend. Joins in Act 1. Personal arc: coming to terms with her own qi-perception (which she has hidden). Leaves if her family obligations pull her back to the village (or stays if the player helps resolve them).
- **Liang Zhu** — the rival-turned-ally. Joins in Act 2. Personal arc: the rivalry with the protagonist resolving into mutual respect (or deepening into enmity). Leaves if the rivalry becomes bitter (or stays if it becomes friendship).
- **Leng Qingxue** — the romance option. Joins in Act 2. Personal arc: the Exchange of Cuts (per §5). Leaves if the romance ends badly (or stays if it ends well — or, in the bittersweet ending, leaves to fulfill her own arc).

### 4.2 Companion approval

Approval is the single scalar that summarizes the companion's relationship with the player. It moves via:
- Shared experiences (combat victory: +0.05; quest completion: +0.10; revelation: +0.15; loss: -0.10; betrayal: -0.30).
- Dialogue choices (perception-gated honest responses: +0.05; dismissive responses: -0.05).
- Player actions that align with or violate the companion's values (Wang Meili values kin; Liang Zhu values honor; Leng Qingxue values autonomy).

**Failure case — approval whiplash.** Approval that swings wildly (from +1 to -1 in a day) feels artificial. The engine applies a moving-average smoothing (window: 30 in-game days) to the visible approval. Raw approval is tracked; smoothed approval is what triggers leave conditions.

---

## 5. The romance system (the Exchange of Cuts)

Per doc 26, the romance system is called "the Exchange of Cuts" — a courtship through duel. The two partners spar, and the spar is the metaphor for the relationship: each cut is a truth offered; each deflection is a truth received; the spar ends when both have shown their truth and chosen to continue.

```typescript
interface RomanceState {
  partner1Id: number;
  partner2Id: number;
  stage: RomanceStage;
  cutsExchanged: CutExchange[];
  // The romance's "intensity" — a single scalar summarizing emotional state
  intensity: number;               // 0..1
  // The romance's "stability" — how likely to endure
  stability: number;               // 0..1
  // The romance's "honesty" — how much truth has been exchanged
  honesty: number;                 // 0..1
}

type RomanceStage =
  | 'unmet' | 'acquaintance' | 'tension' | 'first_cut'
  | 'courtship' | 'commitment' | 'marriage' | 'estrangement' | 'ended';

interface CutExchange {
  cutId: string;
  tick: number;
  // The cut: a truth one partner offers (a revealed fact, a confessed feeling, a shown vulnerability)
  cutType: 'fact_revealed' | 'feeling_confessed' | 'vulnerability_shown' | 'oath_made' | 'oath_broken';
  // The deflection: how the other partner received it
  deflectionType: 'accepted' | 'deflected' | 'countered' | 'refused';
  // The cut's content (what was actually said/done)
  content: string;
  // The intensity and stability deltas
  intensityDelta: number;
  stabilityDelta: number;
  honestyDelta: number;
}
```

### 5.1 The Exchange of Cuts mechanic

The Exchange of Cuts is a structured courtship through duel. Each "cut" is a truth offered in a spar (literal or metaphorical):

1. **First Cut (first truth offered).** One partner reveals something true about themselves (a hidden past, a secret fear, an honest feeling). The other partner receives it (accepts, deflects, counters, or refuses).
2. **Courtship (continued exchange).** The partners continue to spar, each cut deeper than the last. The cuts accumulate; the intensity and honesty rise.
3. **Commitment.** When both partners have shown their truth and chosen to continue, the romance enters commitment. The stability rises.
4. **Marriage (optional).** If both partners choose, the romance formalizes. This is a `marriage_alliance` event (per doc 30) with political consequences.
5. **Estrangement or ending.** If stability falls (a refused cut, an oath broken, an external pressure), the romance enters estrangement. It may end (the partners separate) or recover (a reconciliation cut).

### 5.2 The spar as metaphor

The Exchange of Cuts can be literal (the partners duel) or metaphorical (the partners have a difficult conversation). The engine treats both as the same mechanic: a `CutExchange` with typed content. The literal spar is a combat (per doc 32) where each strike is also a `cutType`; the metaphorical spar is a dialogue (per §1) where each perception-gated choice is also a `cutType`.

**Failure case — romance without cuts.** A romance where the partners never exchange cuts is shallow; the intensity and honesty stay near zero. The engine does not force cuts (the player can have a shallow romance), but the consequences are real: a shallow romance has low stability and ends easily.

**Failure case — cut overload.** A romance where the partners exchange cuts too rapidly (intensity spikes from 0 to 1 in a day) feels artificial. The engine rate-limits cuts: `max_cuts_per_day` (default 1). Truths offered too fast feel forced; the partner may refuse them (`deflectionType: 'refused'`).

---

## 6. The narrative spine's session beats (1, 10, 100, 500)

Per doc 26 §3, the narrative arc spans session 1 to session 500. The spine specifies what the player should experience at each milestone:

```typescript
interface SessionBeats {
  session1: SessionBeat;     // The first hour
  session10: SessionBeat;    // The first arc complete
  session100: SessionBeat;   // The midgame
  session500: SessionBeat;   // The endgame
}

interface SessionBeat {
  sessionNumber: number;
  // What the player should have experienced by this session
  expectedExperiences: string[];
  // What the player should be able to do by this session
  expectedVerbs: string[];
  // The realm the player should be approaching
  expectedRealm: Realm;
  // The narrative beats that should have fired
  expectedBeatsFired: string[];
}
```

**Session 1 (the first hour).** The player experiences: the village, the family, the debt, Old Chen's incense, the first qi perception, Old Chen's test, Old Chen's death (or the first hint of it). The player can: walk, talk, perceive qi (faintly), practice (poorly), gather herbs. Expected realm: Mortal approaching Qi Induction.

**Session 10 (the first arc complete).** The player has left the village, joined a sect (or chosen another path), made a rival (or ally), broken through to Qi Condensation. The player can: fight (duel-scale), gather, trade, comprehend (basic), practice (effectively). Expected realm: Qi Condensation.

**Session 100 (the midgame).** The player has broken through to Foundation Establishment, met the antagonist (Pei Liang), begun the Exchange of Cuts (or chosen against it), faced the sect's crisis. The player can: fight (mob-scale), gather (rare), trade (bulk), comprehend (active), dual cultivate. Expected realm: Foundation Establishment approaching Core Formation.

**Session 500 (the endgame).** The player has reached Core Formation, confronted Pei Liang, made the choice that triggers the ending (per §7). The player can: fight (giant-scale, battlefield), cultivate (high-realm), comprehend (law-fragments), found a sect, participate in the law conflict (approaching Spirit Severance). Expected realm: Core Formation approaching Nascent Soul.

**Failure case — session drift.** A player who reaches session 100 without breaking through to Foundation Establishment is "behind" the spine. The engine does not force them forward; it adapts (per §3.3). The spine's drift mode may bias toward breakthrough opportunities, but the player can choose to remain at Qi Condensation indefinitely (the doctrine: the system permits the choice; the world responds).

---

## 7. The ending triggers

Per doc 26 §8, endings are not chosen from a final menu. They are computed from world state at the end (the Fallout: New Vegas precedent). The ending is a function of: the player's realm, the antagonist's fate, the companion relationships, the romance state, the faction states, and the player's karmic trace.

```typescript
interface EndingTrigger {
  // The world-state predicate that, when true, signals an ending is available
  triggerPredicate: (worldState: WorldState, playerId: number) => boolean;
  // The ending that fires
  endingId: string;
  // Whether this ending is "final" (game over) or "transitional" (a new arc begins)
  final: boolean;
}

interface Ending {
  endingId: string;
  title: string;
  // The text the player reads (or the cutscene that plays)
  epilogueText: string;
  // The world-state changes the ending applies (for transitional endings)
  worldStateChanges: EndingConsequence[];
  // The "moral weight" of this ending, for the player's reflection
  moralWeight: 'triumph' | 'bittersweet' | 'tragic' | 'ambiguous' | 'transcendent';
}

// Example ending triggers (per doc 26 §8):
const endingTriggers: EndingTrigger[] = [
  {
    triggerPredicate: (ws, pid) => {
      const player = getCultivator(ws, pid);
      const antagonist = getAntagonist(ws, pid);
      return player.realm === 'core_formation'
          && antagonist.state === 'dead'
          && player.anchor.intact;
    },
    endingId: 'triumph_confrontation',
    final: true
  },
  {
    triggerPredicate: (ws, pid) => {
      const player = getCultivator(ws, pid);
      return player.realm === 'mahayana'
          && player.lawFragmentsIntegrated > 5;
    },
    endingId: 'transcendent_ascension',
    final: true
  },
  {
    triggerPredicate: (ws, pid) => {
      const player = getCultivator(ws, pid);
      return player.realm === 'qi_condensation'
          && ws.tick > player.birthTick + 80 * 365 * 24 * 60;  // age 80
    },
    endingId: 'mortal_death',
    final: true
  },
  // ... more endings
];
```

### 7.1 The ending computation

When an ending trigger fires, the engine computes the ending's specific content from world state. The same world state always produces the same ending text (deterministic). The ending text is a function of:
- The player's realm and qi-state.
- The antagonist's fate (dead, fled, allied, reconciled).
- Each companion's relationship (devoted, friendly, estranged, dead).
- The romance state (committed, estranged, ended, never began).
- The faction states (which survived, which fell).
- The player's karmic trace (per doc 00 §7 — oaths kept, broken; debts paid, unpaid).

**Failure case — ending ambiguity.** If multiple ending triggers fire simultaneously, the engine picks the one with the highest `priority` (each ending has a priority). If two have the same priority, the engine picks the one whose predicate has been true longest. This prevents the "which ending do you want?" menu — the player's state determines the ending, not a final choice.

**Failure case — no ending fires.** If no trigger's predicate holds (the player is in an unusual state), the engine fires the `default_ending` — a quiet epilogue that summarizes the player's life without dramatic closure. The default ending is the doctrine's "the world does not owe you a climax" applied: if the player did not produce the conditions for a dramatic ending, they get a quiet one.

---

## 8. Tier simulation (S4 / S2 / S0)

The narrative engine degrades by tier:

```
┌─────────┬──────────────────────────────────────────────────────────────┐
│ Tier    │ Narrative behavior                                            │
├─────────┼──────────────────────────────────────────────────────────────┤
│ S4      │ Full dialogue trees. All perception-gated options. Quests   │
│ (full)  │ generated per §2. Spine biases applied (per §3.2).          │
│         │ Companion arcs advance per their trigger predicates.          │
│         │ Romance cuts can be exchanged (per §5).                       │
├─────────┼──────────────────────────────────────────────────────────────┤
│ S2      │ Dialogue aggregated (NPCs speak in summary). No perception-  │
│ (aggr.) │ gated options (the player is absent; no dialogue). Quests   │
│         │ may auto-resolve or expire. Spine biases applied at reduced  │
│         │ strength. Companion arcs advance per their trigger            │
│         │ predicates (events fire; the player is not present to        │
│         │ choose). Romance cuts cannot be exchanged (the player is     │
│         │ absent).                                                      │
├─────────┼──────────────────────────────────────────────────────────────┤
│ S0      │ Frozen. No dialogue, no quests, no spine bias, no companion  │
│ (frozen)│ arc advancement, no romance cuts. On promotion, S2 catches  │
│         │ up by firing any events that would have fired during the     │
│         │ absence, with deterministic RNG for any choices the absent   │
│         │ player would have made (the player's last-known preference   │
│         │ is used).                                                      │
└─────────┴──────────────────────────────────────────────────────────────┘
```

**Failure case — companion drift during absence.** A companion whose arc advances during the player's absence (S2) may have left the party, fallen in love with another, or died. The engine records the events in the persistent log; on promotion, the player discovers what happened. This is the genre's "returning to find everything changed" trope, made mechanical.

**Failure case — spine collapse during absence.** If the player is absent for a long time (century-absence test, per doc 30 §8), the spine may have advanced through multiple acts without the player. The engine handles this: if the player returns after the spine has reached the endgame, the engine fires the `default_ending` (per §7 failure case) — the world went on without the player, and the player's story is the story of returning to a world that has moved on.

---

## 9. Determinism contract

Every narrative operation is a pure function of:

```
narrative_state(t+1) = narrative_fn(
  dialogueTrees,                  // §1
  questState,                     // §2
  spineState,                     // §3
  companionStates,                // §4
  romanceState,                   // §5
  worldState(t),                  // includes events, factions, NPC cognition
  playerInputs(t),                // deterministically timestamped (per doc 33 §5)
  rng(playerSeed, tick)           // for quest generation rolls, spine bias rolls
)
```

**Hash verification.** `hashNarrative(tick)` returns the SHA-256 of the CBOR-encoded `(questState, spineState, companionStates, romanceState)` tuple. Two runs with the same seed and the same player inputs produce identical hashes.

**Dialogue determinism.** Dialogue trees are static data (authored); the engine evaluates conditions deterministically. Two runs with the same world state produce the same available responses. The player's choice is the only input that affects which response is taken; the choice is logged with its tick.

**Quest determinism.** Quest generation is deterministic: the same world state produces the same quest. Quest completion is deterministic: the same objectives' completion states produce the same rewards.

**Spine determinism.** The spine's bias adjustments are deterministic: the same world state produces the same biases. The spine's beat-firing is deterministic: the same predicate evaluation produces the same fire/miss decision.

**Companion and romance determinism.** Approval, intensity, stability, and honesty are pure functions of the `CutExchange` and `SharedExperience` records. Two runs with the same records produce the same companion and romance state.

---

## 10. Rejected alternatives

- **Branching-dialogue-as-story (Bioware-style).** Rejected: produces a scripted story disguised as choices. The engine's spine is a bias system, not a branch tree. The story emerges from world state, not from a writer's flowchart.
- **Scripted quest-givers (Skyrim-style).** Rejected: violates the simulation-first principle. Quests are generated opportunities, not writer-authored content. (Note: a *few* critical-path quests may be semi-scripted for the spine's beats, but they are the exception, not the rule.)
- **Romance as approval-threshold (Mass Effect-style).** Rejected: too thin. The Exchange of Cuts (§5) is a structured courtship through duel, not a check-the-box approval meter. The cuts are the romance; the approval is the summary.
- **Companions as disposable party members.** Rejected: companions are named NPCs with arcs (per doc 34). They are not interchangeable; their relationships matter; their departures and deaths are felt.
- **Ending as a final menu choice.** Rejected: endings are computed from world state (per §7). The player's state determines the ending, not a final button press.
- **LLM-generated dialogue.** Rejected for the dialogue core: non-deterministic, unverifiable. LLMs may be used for *ambient* dialogue (NPCs' background chatter, per doc 22) where the latency is acceptable and the content is non-critical, but the spine's dialogue is authored.

---

## 11. Open decisions (surfaced for review)

1. **The 32-active-quest cap (§2.2).** Invented. May be too low (the player wants many options) or too high (overwhelm).
2. **The 2-missed-beats-per-act drift threshold (§3.3).** Invented. May be too tight (drift fires too often) or too loose (the spine collapses before drift catches it).
3. **The 30-day approval smoothing window (§4.2).** Inherited from doc 27 §6's reputation smoothing. May need adjustment for companions.
4. **The 1-cut-per-day rate limit (§5.2).** Invented. May be too slow (the romance feels stuck) or too fast (the romance feels rushed).
5. **The 1.2× maximum bias multiplier (§3.2).** Invented. May be too weak (the spine cannot steer) or too strong (the spine railroads).
6. **The ending priority resolution (§7.1).** Decided (priority, then longest-true). May need refinement if playtesting reveals tied-priority cases.
7. **The default_ending (§7.1 failure case).** Decided: a quiet epilogue. The alternative (forcing a dramatic ending) was rejected as violating the simulation-first principle.

---

## 12. Doctrine compliance

- **Build the engine, not just the brake:** the prior corpus's narrative doc (26) was the content (the spine, the companions, the romance's name, the endings). This document specifies the engine: the dialogue tree structure, the quest generator, the spine bias system, the companion approval model, the Exchange of Cuts mechanic, the ending trigger computation, the tier degradation.
- **Confront the central tension directly:** the doctrine (AGENTS.md Part 3) forbids scripted story; the genre wants a chosen-one arc. This document resolves the tension by making the spine a bias system, not a script. The story emerges from world state; the engine guarantees *a* story, not *the* story.
- **Make decisions; do not defer:** the dialogue tree schema, the quest generator, the spine bias system, the companion approval model, the Exchange of Cuts, the ending triggers, the tier mapping are all decided. §11 are tuning parameters, not forks.
- **Cite the precedent:** Disco Elysium, Crusader Kings III, Shadow of Mordor, Fallout: New Vegas, Outer Wilds are named and their contributions specified.
- **Design for joy first:** the first hour's joy is the perception-gated dialogue — choosing to be honest with Wang Lun and watching him recognize the perception. The narrative engine produces the genre's best feel: a story that emerges from the player's choices and the world's response.
- **Authorize the smallest end-to-end thing:** this document specifies enough to implement Act 1 (the village, Old Chen, the first qi perception, the first departure) as the first prototype. Acts 2 and 3 are design-ready; their prototypes are deferred until Act 1 is proven.

This document is the narrative engine bible. It is the story engine the prior corpus was missing.
