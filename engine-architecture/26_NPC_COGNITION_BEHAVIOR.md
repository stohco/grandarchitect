# 26 — NPC Cognition and Behavior

**Status:** Foundation. The NPC cognition engine — how non-player actors want, fear, remember, decide, and act, and how those processes degrade gracefully when the scheduler demotes them across fidelity tiers.
**Date:** 2026-08-03

---

## 0. What this document is and why it exists

The prior corpus (docs 04, 12, 22, 34) named NPCs and gave them schedules, relationships, and qi-state, but it never specified the cognition that *chooses* between two available actions. A villager who "goes to the well at dawn" is a clockwork puppet; a villager who "goes to the well at dawn unless they overheard a rumor about a stranger at the inn last night, in which case they detour past the lineage hall to ask Wang Shouzheng" is a character. This document specifies the second villager.

The doctrine (AGENTS.md Part 3: "Build the engine, not just the brake") requires a positive specification: not just "NPCs do not behave randomly" but "NPCs compute a deterministic action policy over a tracked internal state, with named inputs, named outputs, and a verifiable hash." This document is that specification.

Every cognition step is a pure function of (NPC state, world state, RNG draw from a per-NPC seeded stream). The action policy is a ranked enumeration over a fixed verb set. Memory is a capped, time-decaying record of perceived events. Relationships are weighted, time-stamped, asymmetric edges in a directed graph. All three degrade by tier (S4 full → S2 aggregate → S0 frozen) without producing favorable facts (per doc 07 §6.1).

### Precedents cited

- **Dwarf Fortress (Bay 12, 2006–present)** — the needs/dreams/personality system. Each dwarf has tracked needs (eat, drink, pray, socialize, craft) that compete for action selection. This document adopts the needs-competition model.
- **Crusader Kings III (Paradox, 2020)** — the trait-driven AI. Each ruler has personality traits (greedy, ambitious, patient, deceitful) that bias their decision weights. This document adopts the trait-as-weight-bias model.
- **The Sims 4 (Maxis, 2014)** — the autonomy scoring loop. Each possible action is scored against needs and current state; the highest-scoring action wins. This document adopts the scoring-loop model.
- **RimWorld (Ludeon, 2018)** — the mental break threshold. Stressors accumulate; when a threshold is crossed, the pawn enters a forced mental state. This document adopts the threshold-break model for deviation onset (doc 31) and for NPC "snapping."

---

## 1. The cognition state (GoalState)

Every NPC owns a `GoalState` slice in the world state, owned by the `ga:npc-cognition` plugin. It is CBOR-serializable, hashable, and tier-degradable.

```typescript
interface GoalState {
  npcId: number;

  // The 15 traits, each in [-1.0, +1.0]. Stable across a lifetime except via
  // named, lawful events (life-changing experience, deviation, tribulation).
  traits: NPCTraits;

  // Active goal stack, top is current. Max depth 4. Older goals decay.
  goalStack: ActiveGoal[];

  // Attention budget remaining this tick (0..100). Refilled by rest.
  attentionBudget: number;

  // The current decision, recomputed at most once per decision-interval.
  currentDecision: Decision;

  // When this NPC was last promoted/demoted across tiers (for tier migration).
  lastTierTransition: number; // tick
}

interface NPCTraits {
  desires: number;        // +1 = craves experience/power/contact; -1 = ascetic
  fears: number;          // +1 = risk-averse; -1 = reckless
  loyalties: number;      // +1 = faction/kin above self; -1 = self above all
  grudges: number;        // +1 = holds and nurses grievances; -1 = forgives fast
  ambitions: number;      // +1 = seeks higher station; -1 = content
  riskTolerance: number;  // +1 = gambles; -1 = hedges
  generosity: number;     // +1 = gives freely; -1 = hoards
  greed: number;          // +1 = accumulates wealth; -1 = indifferent
  jealousy: number;       // +1 = resents others' gains; -1 = celebrates
  pride: number;          // +1 = face > substance; -1 = humble
  patience: number;       // +1 = waits years; -1 = acts now
  deception: number;      // +1 = lies fluently; -1 = bluntly honest
  gratitude: number;      // +1 = repays debts of honor; -1 = forgets
  curiosity: number;      // +1 = investigates rumors; -1 = ignores
  conformity: number;     // +1 = follows faction line; -1 = independent
}
```

**Stability rule.** Traits are stable. They change only via named events: `LifeChangingExperience` (grief, love, revelation), `Deviation` (心魔 onset flips 1-3 traits), `Tribulation` (crossing a realm), `LongSeclusion` (≥1 year of meditation). Each change is logged in the NPC's `MemoryRecord` with before/after values.

**Failure case — trait drift.** If a plugin writes traits outside [-1, +1] or mutates them outside a named event, the determinism enforcer throws in dev mode. Production mode logs a warning and clamps.

---

## 2. Desires (the want-vector)

Desires are the *pull* on action selection. Each NPC has a `WantVector` — a set of named wants, each with an intensity in [0, 1]. The vector is recomputed each decision-interval from traits + world state.

```typescript
interface WantVector {
  survival: number;       // food, shelter, medicine, escape danger
  kin: number;            // protect, provide for named kin
  faction: number;        // advance faction goals
  cultivation: number;    // advance own realm
  reputation: number;     // be seen, be known
  wealth: number;         // accumulate
  vengeance: number;      // act on grudges
  romance: number;        // pursue or sustain a partner
  knowledge: number;      // investigate, study
  freedom: number;        // escape obligations, leave sect, flee
}
```

**Computation.** Each want is a pure function:

```
want.wealth   = base + 0.5 * traits.greed + 0.3 * traits.desires - 0.4 * traits.generosity
want.vengeance = base + 0.7 * traits.grudges + 0.2 * (active_grudge_count / 5)
want.cultivation = base + 0.6 * traits.ambitions + 0.4 * traits.desires - 0.3 * traits.patience
```

Where `base` is a per-want constant (0.2 for most, 0.6 for survival) and the result is clamped to [0, 1]. The exact coefficients live in `cognition.json` and are tunable.

**Failure case — runaway want.** A want pinned at 1.0 indefinitely (no satisfying action available) accumulates stress. After `stress_threshold` ticks of unmet peak want, the NPC enters a forced mental state (RimWorld precedent): seclusion (high patience), reckless action (low patience), or deviation onset (cultivators only, per doc 31 §4).

---

## 3. Fears (the avoid-vector)

Fears are the *push* — what the NPC refuses to do. They are computed the same way as wants but as *negative* weights on actions.

```typescript
interface FearVector {
  death: number;          // strong for all mortals; weak for bodiless Nascent Soul
  deviation: number;      // cultivators only; scales with prior deviation history
  dishonor: number;       // scales with traits.pride + traits.loyalties
  poverty: number;        // scales with traits.greed + traits.desires
  isolation: number;      // scales with traits.desires + kin_count
  authority: number;      // scales with traits.conformity + faction_rank_pressure
  stranger: number;       // scales with traits.curiosity (inversely) + recent_stranger_events
  exposure: number;       // scales with traits.deception (inversely); "hidden injury" fear
}
```

An action that triggers a fear above 0.7 is removed from the candidate set unless no alternative exists; in that case its score is multiplied by `(1 - fear)`. This is how "flee the stronger enemy" wins over "challenge the rival" when the enemy is two realms above.

**Failure case — fearless NPC.** A NPC with all fears at 0 (e.g., a tribulation-survivor with severed attachments) acts recklessly. The simulator must still constrain them: actions are still gated by capability (you cannot flee if you cannot move). Fearlessness changes priorities; it does not bypass physics.

---

## 4. Loyalties (faction and kin)

Loyalties are weighted edges in a directed graph. The edge weight is in [-1, +1]; negative is enmity. The graph is asymmetric (A is loyal to B does not imply B is loyal to A).

```typescript
interface LoyaltyEdge {
  from: number;           // NPC id
  to: number;             // NPC id or faction id (faction ids are negative)
  weight: number;         // -1.0 (sworn enemy) .. +1.0 (devoted)
  basis: LoyaltyBasis;    // kin, faction, oath, debt, romance, fear
  lastEvent: number;      // tick of last event that modified this edge
  decayRate: number;      // weight/day; 0 for kin and oath (non-decaying)
}

type LoyaltyBasis = 'kin' | 'faction' | 'oath' | 'debt' | 'romance' | 'fear' | 'gratitude';
```

Loyalties bias action selection: an NPC evaluates an action against the *loyalty delta* — the sum of `(edge.weight * effect_on_target)` over all affected targets. An action that helps a sworn enemy (weight -0.8) of your kin (weight +0.9) has loyalty delta `(-0.8 * +1) + (0.9 * -1) = -1.7` — strongly suppressed.

**Faction loyalty** is a special case: edges to a faction id (negative) behave like edges to a synthetic NPC whose state is the faction's aggregate state. Faction loyalty modifies the `want.faction` weight and the `fear.authority` weight.

**Failure case — loyalty conflict.** When kin-loyalty and faction-loyalty point in opposite directions (the classic *zhong-xiao bu neng liangquan* / 忠孝不能兩全), the higher-weight edge wins. The losing edge decays by `conflict_decay_rate` per conflict. Repeated conflicts produce a `LoyaltyBreak` event (the NPC leaves the faction, or severs kin ties). This is how betrayals begin.

---

## 5. Grudges

A grudge is a typed, time-stamped, decaying negative edge with a named cause and a satisfaction condition.

```typescript
interface Grudge {
  target: number;          // NPC id or faction id
  cause: GrudgeCause;      // what they did
  severity: number;        // 0..1
  bornAt: number;          // tick
  satisfactionAction: ActionPolicy;  // what would resolve it
  decayedSeverity: number; // severity * decayFactor(age, traits.grudges)
}

type GrudgeCause =
  | 'killed_kin' | 'insulted' | 'cheated' | 'betrayed_oath'
  | 'stole_inheritance' | 'poisoned' | 'framed' | 'usurped_position'
  | 'rejected_suit' | 'broke_promise' | 'wounded' | 'other';
```

**Decay.** Severity decays daily: `decayedSeverity = severity * exp(-age_days * (0.5 - 0.4 * traits.grudges) / 365)`. A forgiving NPC (grudges = -1) halves severity in 60 days; a vengeful NPC (grudges = +1) takes years.

**Satisfaction.** A grudge is satisfied when the `satisfactionAction` succeeds against the target (e.g., "kill target", "expose target's crime", "defeat target in formal duel", "watch target lose face"). Satisfied grudges convert to a memory entry; they do not return.

**Failure case — grudge loops.** Two NPCs nursing grudges against each other can enter a feud loop (kill kin → grudge → kill → grudge). The simulator breaks this via the loyalty-decay mechanism: repeated unsatisfied grudges decay kin-loyalty edges inside the feuding factions, eventually producing a `FeudExhaustion` event where one side capitulates or migrates. This is the historical *xiedou* (械鬥, lineage feud) pattern, made mechanical.

---

## 6. Ambitions

Ambitions are long-term goals that bias the want-vector and the action policy for months or years. Each NPC may have at most 3 active ambitions.

```typescript
interface Ambition {
  type: AmbitionType;
  target: number | string;  // NPC id, faction id, or named goal ("found_sect")
  intensity: number;        // 0..1
  begunAt: number;
  progress: number;         // 0..1 toward completion
  blockingOn: string[];     // what must happen first
}

type AmbitionType =
  | 'breakthrough_to' | 'inherit_manual' | 'found_sect' | 'destroy_faction'
  | 'avenge_kin' | 'marry' | 'take_disciple' | 'find_master' | 'claim_territory'
  | 'become_eldar' | 'accumulate_wealth' | 'comprehend_law';
```

An ambition multiplies its matching want by `(1 + 0.5 * intensity)` and adds its satisfaction action to the candidate set even when base scores are low. An ambition at progress 0.8+ dominates the want-vector — the NPC rearranges their life around it.

**Failure case — stale ambition.** An ambition with `progress < 0.05` for more than `stale_threshold` ticks (default: 5 in-game years) decays its intensity by 0.1/year. Eventually it is dropped and converted to a `Disappointment` memory entry (which depresses `want.ambitions` for years).

---

## 7. Risk tolerance

Risk tolerance modifies how the NPC weights actions with uncertain outcomes. Each candidate action has an `expectedValue` and a `variance`. The NPC's utility is:

```
utility = expectedValue - (traits.riskTolerance * varianceWeight) * variance
```

A risk-averse NPC (riskTolerance = -1) treats variance as a penalty: they prefer the sure small gain. A risk-seeking NPC (riskTolerance = +1) treats variance as a bonus: they gamble.

**Failure case — risk-blindness under stress.** An NPC under high stress (unmet want above 0.8 for too long) has their risk tolerance temporarily pushed toward +0.5 regardless of trait — the desperate take risks. This is the "cornered rat" pattern.

---

## 8. Generosity

Generosity modifies how the NPC weights actions that *transfer* resources (cash, silver, spirit stones, herbs, time) to another NPC. The transfer-action's score is multiplied by `(0.5 + traits.generosity)`.

```typescript
interface TransferAction extends ActionCandidate {
  resource: 'cash' | 'silver' | 'spirit_stone' | 'herb' | 'time' | 'qi';
  amount: number;
  to: number;
}
```

A generous NPC gives even when their own `want.wealth` is high (the gift satisfies `want.kin` or `want.reputation` more than the loss hurts). A greedy NPC (generosity -1, greed +1) refuses even trivial transfers unless forced.

**Failure case — generosity exploit.** A generous NPC can be drained by exploitative NPCs. The simulator tracks a `gave_to_X` ledger; if the ledger exceeds a threshold without reciprocation, the generous NPC's loyalty edge to X decays and `traits.gratitude` decreases by 0.1 (the generous learn). This is the historical *kao-e* (考額) resentment pattern, made mechanical.

---

## 9. Greed

Greed modifies how the NPC weights actions that *acquire* resources. It scales the `want.wealth` weight and the score of any `AcquireAction`. It also scales `fear.poverty`.

A greedy NPC will accept a profitable action with high variance (e.g., smuggling, theft, embezzlement) where a non-greedy NPC will not. Greed interacts with `riskTolerance`: a greedy-but-risk-averse NPC embezzles carefully; a greedy-and-risk-seeking NPC robs caravans.

**Failure case — greed cascade.** A greedy NPC in a position of authority (sect elder, tax collector) can corrupt a whole sub-system. The simulator tracks a `corruption_index` per faction; when it exceeds `corruption_threshold`, the faction's `cohesion` decays and a `ScandalEvent` is generated (per doc 30 §3). This is how sects collapse from inside.

---

## 10. Jealousy

Jealousy fires when an NPC perceives another NPC's gain in a domain the NPC cares about. The trigger is `perceived_gain_in_wanted_domain(other, domain)`. The effect:

- The jealous NPC's loyalty edge to `other` decays by `0.1 * traits.jealousy`.
- A grudge of severity `0.3 * traits.jealousy` is born with cause `usurped_position` (or `rejected_suit` if the domain is romance).
- The jealous NPC's matching want is *boosted* (jealousy is motivating): `want.<domain> += 0.2 * traits.jealousy`.

**Failure case — jealousy spiral.** Two NPCs mutually jealous of each other's gains can enter an escalation where each tries to outdo the other. The simulator caps this: when both NPCs have grudge-severity > 0.5 against each other, a `Rivalry` event is generated (per doc 30 §3) which produces a formal challenge, a sabotage attempt, or a separation (one leaves the region).

---

## 11. Patience

Patience modifies how the NPC weights immediate vs. deferred outcomes. Each action has a `timeToPayoff`. The discount function:

```
discounted_utility = utility / (1 + (1 - traits.patience) * timeToPayoff / patience_scale)
```

A patient NPC (patience = +1) discounts at `1 / (1 + 0)` = no discount — they will plant a tree whose fruit they will not eat. An impatient NPC (patience = -1) discounts heavily — they want results this week.

Patience also gates the `EnterSeclusion` action: only NPCs with patience > +0.3 will consider a seclusion of >1 year.

**Failure case — impatience under breakthrough pressure.** An impatient NPC at a bottleneck (doc 31 §2) is far more likely to attempt `forced_attempt` on a breakthrough rite — and far more likely to deviate. This is the genre's "rash cultivator" trope, made mechanical.

---

## 12. Deception

Deception modifies whether the NPC's *observable* actions match their *internal* goal. An NPC with high deception can take a `DeceptiveAction` whose true target differs from its apparent target.

```typescript
interface DeceptiveAction extends ActionCandidate {
  apparentGoal: string;     // what other NPCs perceive
  actualGoal: string;       // what the NPC intends
  detectionDifficulty: number;  // 0..1; scales with traits.deception
}
```

Other NPCs' detection of the deception is gated by their own perception skill (per doc 27 §5). A successful deception produces a `MemoryRecord` in the deceived NPC's memory matching the apparent goal; the true goal is recorded only in the deceiver's memory.

**Failure case — deception discovery.** When a deception is discovered (perception check succeeds, or a third party reveals it), the deceived NPC's loyalty edge to the deceiver drops by 0.5 and a grudge of severity 0.7 is born with cause `betrayed_oath`. The deceiver's `traits.deception` does not change (deception is a stable trait), but their reputation in the local faction drops (per doc 27 §6).

---

## 13. Memory (MemoryRecord)

Memory is a capped, time-decaying log of perceived events. Each NPC has at most `memory_capacity` entries (default 256, scaled by tier — see §17).

```typescript
interface MemoryRecord {
  id: number;              // monotonic per NPC
  perceivedAt: number;     // tick
  event: PerceivedEvent;   // what happened
  perceivedReliability: number;  // 0..1; decays with age and retransmission
  emotionalWeight: number; // -1..+1; how strongly the NPC felt about it
  linkedNPCs: number[];    // who was involved
  linkedFactions: number[];// what factions were involved
  distortions: MemoryDistortion[];  // how this memory has been altered (per doc 27 §7)
}

interface PerceivedEvent {
  type: string;            // event-type tag (per doc 30)
  subject: number;         // who did it
  object: number | null;   // to whom
  location: number;        // region id
  summary: string;         // human-readable; also hashed
}
```

**Capping.** When `memory_capacity` is exceeded, the lowest-`(emotionalWeight * perceivedReliability * recency)` entry is evicted. An NPC cannot remember everything; what they remember is what mattered to them.

**Failure case — false memory.** Memory distortion (doc 27 §7) can produce entries whose `summary` does not match the original event. The simulator tracks both: the original event hash (immutable) and the NPC's current distorted version (mutable). This is how two NPCs remember the same event differently — and how a third NPC's divination (doc 27 §9) can perceive the original.

---

## 14. Relationship change (RelationshipRecord)

Relationships are the live, mutable, weighted edges derived from loyalties (§4) + grudges (§5) + memories (§13). The `RelationshipRecord` is the denormalized view the action policy reads.

```typescript
interface RelationshipRecord {
  from: number;
  to: number;
  loyaltyWeight: number;       // -1..+1; from loyalty edges
  grudgeWeight: number;        // -1..0; from active grudges
  romanceWeight: number;       // 0..+1; from romance subsystem (doc 34)
  debtWeight: number;          // -1..+1; from owed favors
  familiarity: number;         // 0..1; from interaction frequency
  trust: number;               // 0..1; from observed consistency
  lastInteraction: number;     // tick
  relationshipType: RelationshipType;
}

type RelationshipType =
  | 'stranger' | 'acquaintance' | 'kin' | 'friend' | 'rival' | 'enemy'
  | 'teacher' | 'disciple' | 'master' | 'sect_sibling' | 'lover' | 'spouse'
  | 'exile' | 'sworn_brother';
```

**Computation.** `loyaltyWeight` is the sum of all loyalty edges from `from` to `to`, clamped. `grudgeWeight` is the sum of active grudges' decayed severities, negated. `trust` is a moving average of `(observed_consistency)` over the last N interactions. `relationshipType` is derived from the weights via a deterministic priority table (kin > spouse > lover > teacher > sworn_brother > friend > rival > enemy > acquaintance > stranger).

**Change events.** Relationships change via named, typed events: `Betrayal`, `Gift`, `SharedDanger`, `Reconciliation`, `Marriage`, `Death`, `Birth`, `Insult`, `PublicPraise`. Each event modifies the relevant weights by a typed delta and writes a `MemoryRecord` to both parties.

**Failure case — relationship oscillation.** Two NPCs in a positive-feedback loop (gift → boost → gift) would run away to +1 loyalty in a day. The simulator caps the per-tick delta at `max_delta_per_tick` (default 0.05) and applies diminishing returns above 0.7. This is the "friendship takes time" rule, made mechanical.

---

## 15. Faction loyalty

Faction loyalty is the synthetic edge from an NPC to a faction id. It is computed from:

- The NPC's role in the faction (founder, elder, inner disciple, outer disciple, ally, vassal).
- The faction's cohesion and prosperity (per doc 29 §10).
- The NPC's `traits.loyalties` and `traits.conformity`.
- The faction's recent actions toward the NPC (promotions, demotions, gifts, punishments).

A faction-loyal NPC will refuse actions that harm the faction even at personal cost. A faction-disloyal NPC will consider `BetrayFaction` actions (see §16) when personal benefit exceeds the loyalty-weighted cost.

**Failure case — faction collapse cascade.** When faction cohesion drops below `collapse_threshold`, members re-evaluate loyalty daily. Each member with loyalty < 0.2 has a chance per day to `LeaveFaction`, `BetrayFaction`, or `SplinterFaction`. The cascade is deterministic given the seed — the same faction in the same state produces the same collapse trajectory. This is the genre's "sect collapses overnight" trope, made mechanical.

---

## 16. Action policies (the candidate enumeration)

The action policy is the verb set the NPC can choose among. Each policy is an `ActionCandidate` with a score, preconditions, and consequences.

```typescript
interface ActionCandidate {
  policy: ActionPolicy;
  score: number;           // utility, after trait/want/fear/loyalty modifications
  preconditions: Predicate[];
  executeTick: number;     // when it will fire if chosen
  expectedDuration: number;
  consequences: Consequence[];
}

type ActionPolicy =
  | 'seek_master'          | 'recruit_disciple'   | 'betray_faction'
  | 'hide_injury'          | 'buy_medicine'       | 'enter_seclusion'
  | 'investigate_rumor'    | 'flee_stronger_enemy'| 'challenge_rival'
  | 'steal_inheritance'    | 'protect_family'     | 'establish_sect'
  | 'gather_herbs'         | 'hunt_beast'         | 'trade_at_market'
  | 'pay_debt'             | 'collect_debt'       | 'smuggle_goods'
  | 'study_manual'         | 'comprehend_target'  | 'visit_kin'
  | 'insult_rival'         | 'praise_ally'        | 'propose_marriage'
  | 'reject_suit'          | 'murder'             | 'frame_rival'
  | 'report_to_authority'  | 'flee_region'        | 'hide_in_wilderness'
  | 'seek_audience'        | 'challenge_law'      | 'yield_to_stronger'
  | 'demand_tribute'       | 'pay_tribute';
```

The action policy enumeration runs each decision-interval:

```
1. For each ActionPolicy P:
   a. Check preconditions. Skip if any fail.
   b. Compute base_score(P) from P's static utility.
   c. Multiply by want-vector match (which wants P satisfies).
   d. Multiply by fear-vector penalty (which fears P triggers).
   e. Multiply by loyalty delta (how P affects loyalties).
   f. Multiply by ambition boost (if P matches an active ambition).
   g. Apply risk tolerance discount to variance(P).
2. Rank candidates by score.
3. Pick the top, with a small epsilon chance (5%) of picking #2 — seeded.
4. Emit ActionCandidate with executeTick = current + leadTime(P).
```

**Failure case — action stall.** If no candidate passes preconditions (e.g., the NPC is imprisoned), the NPC enters `Idle` and `stress` accumulates. Prolonged stalls trigger mental break (per §2 failure case).

**Failure case — action oscillation.** If the top candidate flips each decision-interval (e.g., "flee" and "challenge" alternate), the simulator locks in the most recent decision for `min_lock_ticks` (default 1 in-game hour) to prevent jitter. This is the "decision momentum" rule.

---

## 17. Tier simulation (S4 / S2 / S0)

Cognition degrades by tier per doc 07 §6.1. The degradation is conservative (no favorable facts created by promotion, no named entities erased by demotion).

```
┌─────────┬──────────────────────────────┬───────────────────────────────┐
│ Tier    │ Cognition                    │ Memory                        │
├─────────┼──────────────────────────────┼───────────────────────────────┤
│ S4      │ Full action policy enum.     │ Full MemoryRecord (256 cap).  │
│ (full)  │ Decision every interval.     │ All 15 traits tracked.        │
│         │ All loyalties, grudges,      │ All ambitions tracked.        │
│         │ ambitions live.              │                               │
├─────────┼──────────────────────────────┼───────────────────────────────┤
│ S2      │ Reduced action policy enum   │ Aggregate MemoryRecord (32    │
│ (aggr.) │ (12 policies, not 35).       │ cap). Traits tracked as       │
│         │ Decision every 24 ticks.     │ 5-component summary           │
│         │ Loyal/Grudge/Ambition        │ (desires, fears, loyalty,     │
│         │ weights aggregated to a      │ patience, conformity).        │
│         │ single "disposition" score.  │ Ambitions tracked as count.   │
├─────────┼──────────────────────────────┼───────────────────────────────┤
│ S0      │ No decisions. State frozen.  │ Frozen memory (no new         │
│ (frozen)│ Wake only on promotion or    │ entries, no decay).           │
│         │ scheduled event.             │ Traits frozen at last value.  │
└─────────┴──────────────────────────────┴───────────────────────────────┘
```

**Promotion rule (S0 → S2 → S4).** When the player approaches an S2 NPC, the simulator promotes to S4 over `promotion_lead_ticks` (default 1 in-game day): it rehydrates the full trait vector from the 5-component summary, recomputes the action policy, and begins full decision-making. Promotion cannot create favorable facts: the NPC's state at promotion must be a refinement of the S2/S0 state, not a contradiction. If a contradiction is found (e.g., S2 said "low loyalty" but S4 promotion needs "high loyalty"), the contradiction resolves in the *unfavorable* direction.

**Demotion rule (S4 → S2 → S0).** When the player leaves an NPC's region for `demotion_grace_ticks` (default 7 in-game days), the NPC demotes to S2. Named NPCs (per doc 34) never demote below S2. Named NPCs in the player's history (visited, conversed with, fought) never demote below S2 either — the simulator keeps them alive because the player may return.

**Failure case — promotion artifact.** If an S2 NPC committed to `flee_region` and is promoted mid-flight, the S4 state must honor the commitment; promotion cannot cancel committed actions. The simulator enforces this by checking the `currentDecision.commitState` on promotion; committed actions continue.

---

## 18. Decision determinism

Every NPC decision is a pure function of:

```
decision = policy(
  npcGoalState,           // §1
  npcRelationships,       // §14
  npcMemory,              // §13
  worldState,             // global, includes perceived events
  rng(npcSeed, tick)      // deterministic stream per NPC
)
```

The `rng` is consumed exactly once per decision-interval (for the epsilon-pick in §16). The function is otherwise deterministic: same inputs → same decision. The engine verifies this by hashing each NPC's `(state_before, decision, state_after)` triple and comparing across runs.

**Hash verification.** The `ga:determinism` plugin exposes `hashNPCDecision(npcId, tick)` → returns the SHA-256 of the CBOR-encoded decision triple. Two runs with the same seed and same player inputs produce identical hashes for every NPC at every tick. A mismatch is a bug; the engine flags it with the NPC id, tick, and the divergent field.

**Reordering safety.** NPC decisions within a tick are computed in `npcId` order (deterministic). Cross-NPC effects (e.g., NPC A's gift modifies NPC B's loyalty) are queued and applied after all decisions in the tick are computed, not interleaved. This prevents order-dependent divergence.

---

## 19. Rejected alternatives

- **Utility-theory AI with continuous weights and no verb set.** Rejected: produces emergent behavior that is hard to hash-verify and harder for a designer to read. The verb-set + scoring approach produces a readable audit trail (the candidate list with scores is logged per decision).
- **Behavior trees (Unreal/AAA standard).** Rejected: behavior trees are good for action execution, not for *choosing* between competing goals. The want-vector + action-policy split is cleaner for the social/cultivation domain where NPCs have many competing wants.
- **GOAP (Goal-Oriented Action Planning, FEAR precedent).** Rejected: planning over a state graph is too expensive at 180+ NPCs per village. The action policy is a flat enumeration, not a plan; "planning" emerges from the goal-stack (§1) over multiple decision-intervals.
- **LLM-driven NPCs.** Rejected for the simulation core: non-deterministic, unverifiable, and hostile to the century-absence test. LLMs may be used for *dialogue generation* (doc 34) where the player is present and the latency is acceptable, but the cognition core is a pure function.
- **Trait instability.** Rejected: traits that drift randomly produce unhashable NPCs. Traits change only via named events (§1) with logged before/after.
- **Per-NPC threading.** Rejected: determinism requires a single-threaded decision loop (or a deterministic parallel schedule). The simulator is single-threaded per region; cross-region parallelism is allowed because regions are isolated (no cross-region NPC interactions within a tick).

---

## 20. Open decisions (surfaced for review)

1. **The 35-policy verb set (§16).** Likely incomplete. The first playtest of the village (session 1-10) will reveal missing verbs (e.g., "borrow_tool", "ask_for_advice"). Adding verbs is non-breaking; removing them is.
2. **The 15-trait vector (§1).** Likely redundant. `generosity` and `gratitude` may collapse; `jealousy` may be a special case of `pride` + `greed`. Playtest will reveal.
3. **The 256-entry memory cap (§13).** Invented. May be too small for a long-lived Nascent Soul NPC. May need to scale with realm (mortals: 128; Qi Condensation: 256; Foundation Establishment: 512; etc.).
4. **The 5-component S2 trait summary (§17).** Invented. Which 5 components best preserve behavior under S2 is an empirical question; the answer may be different for cultivators vs. mortals.
5. **The 5% epsilon-pick (§16).** Invented. May be too high (NPCs feel erratic) or too low (NPCs feel robotic). Tuning data needed.
6. **The min_lock_ticks = 1 hour (§16).** Invented. May be too long (NPCs feel sluggish) or too short (oscillation persists).

---

## 21. Doctrine compliance

- **Build the engine, not just the brake:** the prior corpus's NPC docs (04, 12, 22, 34) were the brake (no random behavior, no favorable-fact creation). This document specifies the engine: the want-vector, the action policy, the tier degradation, the determinism contract.
- **Make decisions; do not defer:** the verb set, the trait vector, the tier mapping, the determinism contract are all decided. §20 are tuning parameters, not forks.
- **Cite the precedent:** Dwarf Fortress, Crusader Kings III, The Sims 4, RimWorld are named and their contributions specified.
- **Design for joy first:** the cognition produces NPCs that *feel* like characters — they want things, fear things, hold grudges, betray, reconcile. The first hour's joy is meeting Wang Shouzheng and recognizing that he has plans the player can perceive and frustrate.
- **Authorize the smallest end-to-end thing:** this document specifies enough to implement the Wang Family Bend NPC cognition (180 NPCs at S4 in the player's vicinity, S2 elsewhere) as the first prototype. Upper-tier behaviors (sect-level politics, Mahayana law-conflict cognition) are deferred until the village cognition is proven.

---

## 22. Frontier Maturity Directive §14 — the symbolic cognitive fabric (forward architecture)

The trait-vector + want-vector + fixed-verb policy model in this document (§1–§16) is a **useful L1 deterministic prototype**, but per the Frontier Maturity Directive §14 it still resembles a finite action-policy game AI. The directive's target — which replaces LLM-as-runtime entirely — is a **symbolic cognitive civilization simulator**:

```
Perception → Belief Graph → Memory → Emotional Appraisal → BDI → Theory of Mind
→ Social Practice → HTN/GOAP → Utility Arbitration → Semantic Action/Dialogue
→ Xianxia Surface Realizer → Embodied Performance
```

The 14 layers (directive §14):

1. **Belief-state world model** — NPCs never query omniscient game state. `believes(A,B)`, `heard(A,event)`, `saw(A,event)`, `suspects(A,proposition)`, `confidence(A,proposition)`. Beliefs can be wrong; two elders can genuinely disagree; framing works.
2. **BDI cognition** — competing desires (immortality, protect daughter, avenge master, acquire a pill, avoid ancestor's displeasure, hide demonic cultivation) become active intentions.
3. **Hierarchical planning** — HTN/GOAP: `breakthrough_to_core_formation` decomposes into obtain method → spirit stones → cave abode → pills → bottleneck → seclusion → attempt. Replans on theft/impossibility.
4. **Utility moment-to-moment choice** — scoring against hunger, danger, face, loyalty, greed, fear, sect duty, cultivation progress, curiosity, arrogance, urgency + hundreds of contextual modifiers. Personality changes the **weights**, not just the lines.
5. **Social-practice simulation** (Versu/CiF) — authored reusable situations: greeting a senior, disciplining a junior, bargaining, challenging, giving/losing face, refusing a toast, sect recruitment, auction bidding, courting, debt acknowledgement, blood feud, Dao debate, gossiping, deception. Multiple practices can overlap.
6. **Xianxia social physics as first-class values** — face, seniority, realm_difference, sect_rank, master_lineage, bloodline, karma, debt, enmity, favor, dao_disagreement, fear, reputation, righteousness, filial_duty, sect_loyalty, oath, guest_status, ownership, inheritance_claim, territorial_claim, taboo, killing_intent, perceived_backing. NPCs reason in these terms — they behave like people who grew up in this cosmology.
7. **Persistent episodic memory** — tiny semantic events (`{actor, action:spared, target:LiWei, witnesses, location, time, stakes:high}`), not prose. Salience, decay, rehearsal, association. Costs bytes, not tokens.
8. **Gossip and information propagation** — events spread and **mutate** ("defeated 3 disciples" → "crippled 5 inner disciples" → "murdered them"). Reputation is an emergent information network, not a global number.
9. **Theory of Mind** (PsychSim-style) — "I know Meng knows about the treasure", "I don't think Meng knows that I know". Enables manipulation, bluffing, alliances, secrets, spying, betrayal — no LLM.
10. **Emotional appraisal from beliefs+goals** (FAtiMA) — same event (disciple killed) appraised differently: loved him / considered him useless / ordered him into danger / believe you intended it / fear you / owe you a debt / know he betrayed me.
11. **Dialogue-act reasoning** — cognition never chooses strings; it chooses semantic acts: greet, warn, probe, lie, accuse, threaten, boast, deflect, teach, comfort, bargain, request, command, challenge, flatter, mock, confess, withhold_information, change_subject, invoke_debt, give_face, save_face, offer_trade, offer_alliance.
12. **Compositional language generation** — thousands of reusable speech atoms, grammatical constructions, rhetorical moves, titles, idioms, cultivation metaphors, sentence openings, responses, interruptions, emotional modifiers. One semantic statement → dozens of realizations. No 500,000 authored lines.
13. **Storylets instead of quests** — small authored narrative situations trigger on conditions (jealous disciple sees your promotion; merchant recognizes an artifact; someone you spared reappears). Simulation chooses the cast.
14. **Embodied performance** — gaze, hesitation, turning away, bow depth, weapon readiness, distance, posture, pacing, interrupt timing, facial state — from the same state as the cognition.

**The compiler-not-runtime rule (directive §14):** development agents manufacture and validate the corpus (10,000 social rules, 5,000 storylets, 20,000 dialogue constructions, 8,000 rhetorical variants, 3,000 idioms, 1,000 practices, hundreds of personality modifiers, sect/family/regional customs, auction etiquette, Dao debate structures, master-disciple interactions). Grand Architect validates, canonicalizes, finds contradictions, fuzz-tests, and compiles them into compact runtime data. **The shipped game makes zero LLM calls.** Player free-text maps to semantic intents via a command grammar (or an optional tiny local intent/entity model — no API, no tokens).

This fabric is compatible with the tier system in this document: S4 = full cognition + social practices + speech + animation; S3 = goals + planning + relationships + event processing; S2 = strategic simulation; S1/S0 = cohort/life-event simulation — all over the same canonical state representation. When you encounter a distant cultivator, their expanded history is real: they did join the Azure Sword Sect eleven years ago; they did lose their brother; they really do hate the Blood Moon Clan.

**Maturity status (honest):** RESEARCHED (directive §14 specified; no runtime implementation yet). Prototype order: belief graph + episodic memory → social practices with xianxia values → HTN/GOAP + utility → compositional language renderer → storylets → embodied performance.
