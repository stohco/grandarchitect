# 27 — Knowledge, Memory, and Rumors

**Status:** Foundation. The information layer of the simulation — what actors know, how they learn it, how they forget it, how it propagates, how it distorts, and how the divination and dream subsystems read the qi-momentum of past and present without predicting the future.
**Date:** 2026-08-03

---

## 0. What this document is and why it exists

The prior corpus (docs 04, 05, 14, 22) gave actors qi-perception, schedules, and memories but never specified the *information ecology* that binds them: who knows what, who told them, how the telling degraded, and what the player can infer from the gaps. A village where every NPC knows everything the player did is a surveillance state; a village where no NPC ever hears of the player's breakthrough is a sound stage. This document specifies the middle: a lawful, hashable, tier-degradable information system that produces the texture of a real social world — where news travels at the speed of boats and feet, where rumors decay into myths, where the powerful know more than the poor, and where the past is recoverable only through its qi-residue, never through prophecy.

The doctrine (AGENTS.md Part 3: "Confront the central tension directly") names the central tension here: xianxia readers want divination that sees the future; xianxia metaphysics (doc 00 §2) forbids it. This document resolves the tension by *not* predicting the future. Divination perceives qi-momentum — the lawful present-tense vector of how things are moving — and projects it the way a sailor reads the wind. The projection is sometimes wrong because the wind shifts. This is the positive account of what the player gets instead of prophecy.

### Precedents cited

- ** Crusader Kings III (Paradox, 2020) — the secret/discovery system.** Secrets are discrete, owned, discoverable. This document adopts the discrete-secret model.
- ** Shadow of Mordor (Monolith, 2014) — the Nemesis memory.** Each orc remembers prior encounters with the player and references them in dialogue. This document adopts the per-actor memory-of-the-player model.
- ** Dwarf Fortress (Bay 12) — the rumor propagation.** Rumors spread via the conversation graph and decay with distance and time. This document adopts the conversation-graph propagation model.
- ** Disco Elysium (ZA/UM, 2019) — the thought-cabinet.** Thoughts have a cost, a stat-modifier, and a "internalize" action. This document adopts the internalize-vs-raw-thought distinction for memory integration.

---

## 1. What NPCs know (the KnowledgeSlice)

Each NPC owns a `KnowledgeSlice` in the `ga:knowledge` plugin. It is CBOR-serializable, hashable, tier-degradable.

```typescript
interface KnowledgeSlice {
  npcId: number;

  // Discrete facts the NPC believes. Each fact has a confidence, a source,
  // and an age. Facts below confidence_threshold are forgotten.
  facts: KnowledgeFact[];

  // Skills the NPC has practiced to competence. Cannot be forgotten; only
  // degraded by atrophy (per §3).
  skills: KnowledgeSkill[];

  // The NPC's model of other actors (a sparse graph).
  socialModel: SocialModelEntry[];

  // The NPC's model of the local ecology/economy (aggregate, regional).
  worldModel: WorldModelEntry[];

  // Internalized law-fragments (per doc 27 §3 of the cultivation doc).
  lawFragments: LawFragmentRef[];

  // The rumor queue: rumors the NPC has heard but not yet propagated.
  rumorQueue: RumorInstance[];
}

interface KnowledgeFact {
  id: number;
  factType: FactType;
  subject: number;        // who/what it is about
  predicate: string;      // what they did / what is true
  object: number | string;
  confidence: number;     // 0..1; decays per §3
  source: FactSource;     // direct observation, told-by, rumor, divination, dream
  perceivedAt: number;    // tick
  originalEventHash: string;  // immutable hash of the originating event
  distortions: string[];  // cumulative distortions applied (per §7)
}

type FactType =
  | 'action' | 'trait' | 'possession' | 'location' | 'relationship'
  | 'secret' | 'intent' | 'event' | 'manual' | 'technique';

type FactSource =
  | 'observed' | 'told_by_ally' | 'told_by_stranger' | 'rumor'
  | 'divination' | 'dream' | 'inferred' | 'read_from_residue';
```

**Stability rule.** Facts are append-only with mutable confidence and distortions. The `originalEventHash` is immutable; it is the ground truth the simulator uses to compute distortion.

**Failure case — knowledge paradox.** An NPC cannot act on a fact whose `confidence < action_threshold` (default 0.4). They may still *suspect* and *investigate*, but they cannot use low-confidence facts as preconditions for actions. This prevents the "NPC magically knows" failure mode.

---

## 2. How NPCs learn (acquisition)

Learning is gated by **perception** and **proximity**. An NPC learns a fact when:

1. They are within perception range of the originating event (per `ga:qi-perception` plugin), OR
2. They are told by another NPC who has the fact, OR
3. They read the qi-residue of the originating event (per §5), OR
4. They divine the qi-momentum of a known actor (per §9), OR
5. They dream the anchor-resonance of a related actor (per §10).

Each acquisition path produces a `KnowledgeFact` with the corresponding `source` tag and a path-dependent `confidence`:

```
acquisition_paths_and_confidence:

  observed (direct)              → 0.95
  told_by_ally                   → 0.85 * source_confidence
  told_by_stranger               → 0.50 * source_confidence
  rumor                          → 0.30 * source_confidence (per §4)
  read_from_residue              → 0.70 (decays as residue decays, per §5)
  divination                     → 0.60 (the qi-momentum may shift)
  dream                          → 0.40 (anchors are partial; per §10)
  inferred                       → 0.50 * premise_confidence_product
```

**Perception range.** Mortals perceive visual/auditory events within `mortal_perception_radius` (default 30m). Cultivators perceive qi-bearing events within `qi_perception_radius` (scales with realm; per doc 13 §5). A mortal across the village does not see the player's breakthrough; a Core Formation cultivator in the next valley does.

**Failure case — omniscient faction.** A faction is not an NPC. Factions do not "know" things; their members do, and the faction's aggregate knowledge is the union of member knowledge at any tick. A secret kept from all members is kept from the faction. This is the "no hivemind" rule.

---

## 3. How NPCs forget (decay)

Memory decays. The decay function is path-dependent:

```
confidence(t) = confidence(0) * decayFactor(age, factType, traits.memory)

  where decayFactor for ordinary facts:
    = exp(-age_days / memory_half_life)
    memory_half_life = 30 days * (1 + traits.patience) * emotional_weight

  for secrets (FactType='secret'):
    memory_half_life = 365 days  // secrets are sticky

  for emotionally-weighted facts (|emotionalWeight| > 0.7):
    memory_half_life = 3650 days // 10 years; trauma and joy persist

  for observed violent events (murder, battle):
    memory_half_life = 7300 days // 20 years; never quite forgotten
```

When `confidence < forget_threshold` (default 0.1), the fact is evicted from `KnowledgeSlice.facts`. The eviction is logged in the NPC's memory ledger (per doc 26 §13) so the simulator can audit what was forgotten and when.

**Skill atrophy.** Skills degrade differently: a practiced skill does not vanish, but its `competence` decays toward `baseline` if not used. A blacksmith who has not forged in a year loses competence at 0.02/day. The decay stops at `baseline` (childhood level); it never reaches zero.

**Failure case — important forget.** An NPC who forgets a fact they should remember (e.g., Wang Shouzheng forgets his son's name) is a bug. The simulator protects kin-relationship facts with a `non_forgettable` flag; these facts' confidence does not decay below 0.9 unless the NPC develops deviation (心魔) that severs attachments (per doc 31 §4).

---

## 4. Rumor propagation

A rumor is a fact whose `source = 'rumor'` and which propagates via the conversation graph. The conversation graph is a directed weighted graph where edge weights are `(familiarity * talkativeness * proximity_frequency)` (per doc 26 §14 and the `ga:knowledge` plugin's conversation-edge subgraph).

```typescript
interface RumorInstance {
  rumorId: number;
  originatingFactHash: string;
  currentSummary: string;       // mutable; per §7 distortion
  spreadCount: number;          // how many NPCs have heard it
  originLocation: number;       // region id
  originTick: number;
  fidelity: number;             // 0..1; decays with each retransmission
  infectiousness: number;       // 0..1; function of subject fame and event drama
}

interface ConversationEdge {
  from: number;
  to: number;
  weight: number;               // 0..1
  lastConversation: number;     // tick
}
```

**Propagation rule.** Each decision-interval (per doc 26 §16), an NPC with a `rumorInstance` in their `rumorQueue` may propagate it to a conversation partner chosen by `conversationEdge.weight`. The propagation:

```
target.confidence = source.confidence * fidelity * conversationEdge.weight
target.fidelity   = source.fidelity - retransmission_loss (default 0.05)
target.summary    = distort(source.summary, age, transmission_count)  // per §7
```

A rumor with `infectiousness > 0.7` (a sect master killed, an inheritance found) propagates exponentially in the first week, then plateaus when most reachable NPCs have it. A rumor with `infectiousness < 0.3` (a stolen chicken) stays local.

**Failure case — rumor plague.** A high-infectiousness rumor in a dense conversation graph can saturate the region in days, swamping the simulator's per-tick rumor budget. The `ga:knowledge` plugin caps `propagations_per_tick_per_npc` (default 2) and `total_propagations_per_tick` (default 1000 per region). Excess propagations are queued, not dropped.

---

## 5. Qi-residue perception and memory

Per doc 13 §5 (residue reading), every qi-bearing event leaves a `QiResidue` in the world. The residue decays over time (half-life scales with event intensity). Cultivators with `qi_perception` skill can read the residue and reconstruct a partial `KnowledgeFact`.

```typescript
interface QiResidue {
  residueId: number;
  originatingEventHash: string;
  location: Vec3;
  bornAt: number;              // tick
  intensity: number;           // decays: intensity(t) = intensity(0) * 2^(-age/halfLife)
  halfLife: number;            // ticks; scales with originating event magnitude
  phaseSignature: PhaseSignature;  // 5-phase vector
  polarity: 'yin' | 'yang' | 'neutral';
  actorSignature: number;      // hash of the originating actor's qi-state
  actionSignature: string;     // tag: 'breakthrough', 'combat_strike', 'ritual', etc.
}
```

**Reading rule.** A cultivator with `qi_perception >= residue.intensity * 0.5` can read the residue. Reading produces a `KnowledgeFact` with `source = 'read_from_residue'`:

```
fact.subject = actorSignature  (mapped to an NPC id if known, else 'unknown_cultivator')
fact.predicate = actionSignature
fact.object = location
fact.confidence = 0.70 * (residue.intensity / perception_skill)  // capped at 0.70
```

Reading is one-shot: the act of reading does *not* consume the residue, but the reader's own qi-perception activity leaves a secondary residue (per doc 13 §5.4 — the reader becomes readable).

**Memory of residue.** The `KnowledgeFact` produced by reading is stored like any other fact, but with a `decay` modifier: residue-read facts decay at 2× the normal rate (they are perceived, not experienced; the memory is shallower). This is why a tracker can follow a trail for days but a witness remembers for years.

**Failure case — residue forgery.** A high-realm cultivator can deliberately leave a deceptive residue (per doc 26 §12, deception). The forged residue has the `actorSignature` of a different cultivator. Detecting a forgery requires `qi_perception` higher than the forger's skill by at least one realm tier. This is the genre's "false trail" trope, made mechanical.

---

## 6. Player reputation spread

The player's reputation is a per-faction, per-region aggregate derived from `KnowledgeFact`s where `subject = playerId`. The `ga:knowledge` plugin maintains a denormalized `ReputationRecord` per (faction, region) pair:

```typescript
interface ReputationRecord {
  playerId: number;
  factionId: number;
  regionId: number;
  warmth: number;        // -1..+1; weighted sum of fact-predicates
  notoriety: number;     // 0..1; how many NPCs in the region have any fact about the player
  lastUpdate: number;    // tick
  signatureAchievements: string[];  // "broke_through_Foundation_Establishment", etc.
}
```

**Computation.** `warmth` is a weighted sum:

```
warmth = Σ (fact.confidence * fact.emotionalWeight * faction_loyalty_to_subject)
         / Σ (fact.confidence)
```

A fact the player helped a faction member (positive emotional weight, positive loyalty) warms the reputation. A fact the player killed a faction member freezes it.

**Spread rate.** Reputation does not spread instantly. It propagates via the same rumor mechanism (§4) but with `infectiousness = 0.4 + 0.3 * notoriety`. The player's reputation in a distant region lags by weeks; the player's reputation at home updates daily. This is why a famous cultivator can walk into a strange sect and not be recognized — the news has not arrived.

**Failure case — reputation whiplash.** A player who alternates good and evil acts in the same faction can drive `warmth` to oscillate. The simulator applies a moving-average smoothing (window: 30 in-game days) to the visible `warmth` so NPCs do not flip-flop. The raw fact history is preserved; the smoothing is on the read-side.

---

## 7. Information degradation (memory distortion)

A fact's `summary` (the human-readable description) and even its structured `predicate/object` fields can distort over time and retransmissions. Distortion is lawful: it follows the biases of the carriers.

```typescript
interface MemoryDistortion {
  type: DistortionType;
  appliedAt: number;        // tick
  appliedBy: number;        // NPC id who introduced the distortion
  originalValue: string;
  distortedValue: string;
}

type DistortionType =
  | 'exaggeration'   // magnitude grew (kill 1 → kill 10)
  | 'minimization'   // magnitude shrank
  | 'subject_swap'   // wrong actor remembered
  | 'cause_invert'   // hero becomes villain
  | 'time_drift'     // when it happened shifts
  | 'place_drift'    // where it happened shifts
  | 'moralize'       // neutral act recast as virtuous/evil
  | 'mythologize';   // mundane act recast as supernatural
```

**Distortion probability.** Each retransmission has a `distortion_probability` per carrier:

```
p(distortion) = base_rate * (1 - carrier.traits.patience) * (1 + carrier.traits.pride)
                * transmission_count_factor
  base_rate = 0.02
  transmission_count_factor = 1 + 0.1 * log(1 + transmission_count)
```

A patient, humble carrier distorts rarely; an impatient, proud one distorts often. Each retransmission can apply at most one distortion; the original value is preserved in the `MemoryDistortion` ledger so the simulator (and a diviner, per §9) can reconstruct the original.

**Failure case — distortion cascade.** A fact with many distortions eventually becomes unrecognizable. When `distortion_count > 5`, the fact's `confidence` decays at 3× the normal rate (a garbled memory is a fragile memory). This is how history becomes legend, made mechanical.

---

## 8. Memory distortion across tiers

Distortion interacts with tier degradation (per doc 26 §17):

```
┌─────────┬─────────────────────────────────────────────────────────┐
│ Tier    │ Distortion behavior                                     │
├─────────┼─────────────────────────────────────────────────────────┤
│ S4      │ Full distortion ledger. Each retransmission can         │
│         │ distort. Original values preserved.                     │
├─────────┼─────────────────────────────────────────────────────────┤
│ S2      │ Distortion ledger truncated to last 2. Older            │
│         │ distortions collapse into a single "fuzzy_summary".     │
│         │ Original values still recoverable by divination.        │
├─────────┼─────────────────────────────────────────────────────────┤
│ S0      │ Frozen. The fact's current distorted state is the       │
│         │ frozen state. Original values lost from the NPC's       │
│         │ slice (but preserved in the originating event log).     │
└─────────┴─────────────────────────────────────────────────────────┘
```

This is why a returning player after a long absence (the century-absence test, per doc 07 §6.1) finds that history has become legend: S0 NPCs have only the distorted version; the original is recoverable only via divination (§9) or by tracking down the original event in the persistent world-state log.

---

## 9. The divination system (qi-momentum, not the future)

Divination is the cultivation-world's information-recovery subsystem. It does **not** predict the future. It perceives qi-momentum — the lawful present-tense vector of how things are moving — and projects it forward the way a sailor reads the wind. The projection is sometimes wrong because the wind shifts.

```typescript
interface DivinationAttempt {
  divinerId: number;
  target: DivinationTarget;     // an actor, a place, a fact, a residue
  method: DivinationMethod;     // hexagram, astrological, residue-trace, dream-quest
  performedAt: number;
  energyCost: number;           // attention + qi reservoir
  results: DivinationResult[];
}

interface DivinationResult {
  perceivedMomentum: MomentumVector;  // current direction of change
  projectedTrajectory: TrajectoryPoint[];  // extrapolated, with confidence intervals
  perceivedOriginalHash: string | null;    // for distorted facts: the original event hash
  confidence: number;
  distortions: string[];                  // what the diviner cannot clearly perceive
}
```

**Momentum, not future.** The `perceivedMomentum` is the present-tense derivative: where is the target's state moving, and how fast. The `projectedTrajectory` extrapolates this forward using the simulator's own laws of motion (the same laws that govern the simulation), but the extrapolation assumes *no new events*. Any new event — a stranger arrives, a tribulation strikes, the player intervenes — invalidates the projection.

**Recovering originals.** A diviner targeting a distorted fact (per §7) can perceive the `originalEventHash` if their `qi_perception` exceeds the cumulative distortion's "opacity." This is how lost history is recovered: not by seeing the past directly, but by reading the qi-momentum of the actors who carried the distortion, and tracing it backward to the originating event.

**Failure case — divination paradox.** A diviner who attempts to perceive their own future momentum creates a self-referential loop. The simulator detects this and returns `confidence = 0` for self-targeted projections. This is the doctrine's "no prophecy" rule enforced mechanically.

**Failure case — destiny trap.** A diviner's projection can become self-fulfilling if the diviner acts on it. The simulator does *not* prevent this — it is a lawful consequence. But the projection's `confidence` decays as the diviner's own actions change the momentum they perceived. The diviner cannot "lock in" a future by acting on it; acting on it changes it.

---

## 10. The dream system (anchor perception during sleep)

Sleep is not idle time. During sleep, the anchor (per doc 00 §2) relaxes its grip on the body and perceives the qi-resonance of nearby anchors — the dreamer's own past, the recent dead, the soon-to-die, and (rarely) distant kin in extremis.

```typescript
interface DreamRecord {
  dreamerId: number;
  dreamedAt: number;            // tick (sleep cycle)
  dreamType: DreamType;
  perceivedAnchors: AnchorResonance[];
  emotionalTone: number;        // -1..+1
  remembered: boolean;          // whether the dreamer recalls it on waking
  fragments: DreamFragment[];   // what the dreamer can articulate
}

type DreamType =
  | 'ancestral_memory'   // the dreamer's own past lives (per doc 00 §2)
  | 'recent_dead'        // anchors of those who died nearby in the last 7 days
  | 'soon_to_die'        // anchors of those who will die within 30 days
  | 'kin_in_extremis'    // a kin anchor in mortal danger
  | 'law_resonance'      // a fragment of Dao perceived in the deep dream
  | 'random' | 'nightmare';

interface AnchorResonance {
  anchorHash: string;           // hash of the perceived anchor's state
  perceivedEmotion: number;     // -1..+1
  perceivedLocation: Vec3 | null;  // approximate, often wrong
  perceivedIdentity: number | null;  // NPC id, often null (anchors are anonymous in dream)
}
```

**Occurrence.** A sleeping NPC has a per-night probability of dreaming, scaled by realm (mortals: 30%; cultivators: 50%; Foundation Establishment+: 70%). The `dreamType` is chosen by weighted probability conditioned on local events (a recent murder nearby biases toward `recent_dead`; a tribulation approaching biases toward `soon_to_die`).

**Memory of dreams.** A dream is `remembered` with probability 0.4 (mortals), 0.6 (cultivators), 0.8 (Foundation Establishment+). A remembered dream produces a `DreamFragment` — a partial, often symbolic, description that the dreamer can articulate. The fragment is stored as a `KnowledgeFact` with `source = 'dream'` and `confidence = 0.40`.

**Failure case — dream prophesy.** A `soon_to_die` dream is *not* prophesy. It is the dreamer's anchor perceiving the qi-momentum of a failing body — the same momentum a diviner would perceive. The death may not occur: the dreamer may intervene, a healer may arrive, the tribulation may miss. The dream is a strong hint, not a destiny. The simulator enforces this: the `soon_to_die` flag does not change the target's actual death probability.

**Failure case — dream fraud.** A high-realm cultivator can project deceptive dreams into a sleeper's mind (the genre's "ghost dream" / 鬼夢 trope). The deceptive dream has the same structure as a real one but the `perceivedAnchors` are forged. Detecting dream fraud requires `qi_perception` higher than the projector's skill. This is the inverse of divination forgery (§5 failure case): the fraud is on the *receiver*, not the residue.

---

## 11. Knowledge aggregation across tiers

The `ga:knowledge` plugin degrades by tier:

```
┌─────────┬──────────────────────────────────────────────────────────┐
│ Tier    │ Knowledge behavior                                       │
├─────────┼──────────────────────────────────────────────────────────┤
│ S4      │ Full fact list (cap 256). Full distortion ledger.        │
│         │ Divination available. Dreaming available.                 │
│         │ Conversation edges live. Rumor queue active.              │
├─────────┼──────────────────────────────────────────────────────────┤
│ S2      │ Fact list capped at 32. Distortion ledger capped at 1.   │
│         │ Divination not available (too expensive).                 │
│         │ Dreaming available but fragments not stored (the NPC      │
│         │ has the dream, does not remember it).                     │
│         │ Conversation edges aggregated per region.                 │
├─────────┼──────────────────────────────────────────────────────────┤
│ S0      │ Frozen. Facts frozen at current distorted values.         │
│         │ No dreaming. No rumor propagation.                        │
│         │ The NPC knows what they last knew, no more.               │
└─────────┴──────────────────────────────────────────────────────────┘
```

**Promotion rehydration.** When an S0 NPC is promoted to S2, the simulator rehydrates from the persistent event log (the immutable log of all events that affected this NPC). The NPC re-learns the most important recent events at reduced confidence (they are "catching up"). They do *not* recover forgotten facts; those are gone from their slice forever (recoverable only by divination).

**Failure case — promotion omniscience.** A promoted NPC must not know more than they did at demotion. The simulator enforces this by tracking a `knowledge_watermark` — the highest `tick` of any fact the NPC has ever known. Promotion rehydrates only events after the watermark. Events between demotion and promotion that the NPC could not have perceived are not added.

---

## 12. Information and the player

The player is both a *consumer* and a *producer* of information:

- **Consumer.** The player learns via the same channels as NPCs (per §2) plus the journal (per doc 23 §1.3). The journal stores facts the player has explicitly noted (the hexagram from Wang Lun, the manual from Old Chen). The player's `KnowledgeSlice` is tracked like any NPC's.
- **Producer.** The player's actions leave qi-residue (per §5) and produce `KnowledgeFact`s in nearby NPCs. The player can also deliberately *spread* information (telling a villager, posting a notice, performing a public demonstration), which propagates via the rumor mechanism (§4).

**Failure case — player omniscience via save-scum.** A player who saves before a divination, reloads, and retries is exploiting meta-knowledge. The simulator does *not* prevent this (per doc 00 §2: save/reload is a meta-mechanic, not an in-world power), but divination results are seeded by `(divinerId, target, tick, worldStateHash)` — the same divination at the same tick produces the same result, so reload does not change the divination. The player must change something else (advance time, change the target) to get a new result.

---

## 13. Determinism contract

Every knowledge operation is a pure function of:

```
operation_result = knowledge_fn(
  npcKnowledgeSlice,        // §1
  worldState,               // includes events, residues, rumor graph
  conversationEdges,        // §4
  rng(npcSeed, tick)        // for dream occurrence and distortion rolls
)
```

The RNG is consumed at named points: dream occurrence roll, distortion roll, propagation partner choice. Each consumption is logged; the engine can replay any tick and produce identical knowledge state.

**Hash verification.** `hashKnowledge(npcId, tick)` returns the SHA-256 of the CBOR-encoded `KnowledgeSlice`. Two runs with the same seed and same player inputs produce identical hashes. A mismatch flags the divergent fact, the divergent field, and the operation that introduced the divergence.

**Conversation graph consistency.** The conversation graph is recomputed deterministically from NPC relationships (per doc 26 §14). It is not stored; it is derived. This prevents the graph from drifting across runs.

---

## 14. Rejected alternatives

- **Shared faction knowledge pool.** Rejected: factions are not hiveminds (per §1 failure case). Knowledge is per-NPC; faction knowledge is the union.
- **Probabilistic truth tables (Bayesian belief networks).** Rejected: too expensive at 180+ NPCs × hundreds of facts each. The confidence scalar with path-dependent decay is cheaper and produces readable audit trails.
- **Prophecy as a divination output.** Rejected: violates doc 00 §2's anchor model (no fixed future). The doctrine's central tension (AGENTS.md Part 3) is resolved by *not* predicting the future; the player gets qi-momentum projection instead, which is sometimes wrong.
- **Dreams as random cutscenes.** Rejected: dreams must be lawful (they perceive real anchor resonance) or they are noise. Noise wastes the player's time.
- **Memory as a single "memory score."** Rejected: a scalar memory cannot represent "I remember my son's face but not his name" (a distortion, per §7) or "I know who killed him but not where" (a partial fact). Discrete facts with mutable confidence and distortions are required.
- **Player reputation as a global scalar.** Rejected: reputation is per-faction per-region (per §6). A famous cultivator is not equally famous everywhere.

---

## 15. Open decisions (surfaced for review)

1. **The 256-fact cap (§1).** Invented. May be too small for a long-lived Nascent Soul; may be too large for a mortal. Likely needs to scale with realm.
2. **The 0.05 retransmission loss (§4).** Invented. May make rumors decay too fast or too slow. Tuning data needed.
3. **The 0.02 base distortion rate (§7).** Invented. The actual rate of memory distortion in oral traditions is historically 0.01-0.10 per transmission; the chosen value is mid-range. May need to be genre-tuned (xianxia rumors may distort faster than historical ones).
4. **The 0.40 dream confidence (§10).** Invented. Dreams are unreliable by design, but 0.40 may be too high (dreams feel authoritative) or too low (dreams feel useless).
5. **The 0.70 residue-read confidence cap (§5).** Invented. May need to scale with the reader's realm relative to the event's magnitude.
6. **The 30-day reputation smoothing window (§6).** Invented. May be too long (reputation feels sluggish) or too short (whiplash persists).
7. **The self-targeted divination block (§9 failure case).** Decided, but the alternative (allow it with reduced confidence) was considered. The block is cleaner; the alternative would invite paradox exploits.

---

## 16. Doctrine compliance

- **Build the engine, not just the brake:** the prior corpus's "no prophecy" rule (doc 00 §2) was the brake. This document specifies the engine: discrete facts, path-dependent confidence, rumor propagation, residue reading, divination as momentum projection, dreams as anchor resonance.
- **Confront the central tension directly:** the doctrine forbids prophecy; the genre wants it. This document resolves the tension by giving the player qi-momentum projection — the positive account of what they get instead, with named failure modes (§9).
- **Make decisions; do not defer:** the acquisition paths, decay functions, distortion types, divination contract, and dream taxonomy are all decided. §15 are tuning parameters, not forks.
- **Cite the precedent:** Crusader Kings III, Shadow of Mordor, Dwarf Fortress, Disco Elysium are named and their contributions specified.
- **Design for joy first:** the first hour's joy is overhearing a distorted rumor about the player at the inn — and recognizing that the villagers have it half-wrong. The information ecology produces the texture of a real social world.
- **Authorize the smallest end-to-end thing:** this document specifies enough to implement the Wang Family Bend information ecology (180 NPCs, regional rumor graph, residue reading for the protagonist's Qi-Condensation perception) as the first prototype.

This document is the knowledge bible. It is the information engine the prior corpus was missing.
