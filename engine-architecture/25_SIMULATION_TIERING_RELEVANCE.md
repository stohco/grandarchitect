# 25 — Simulation Tiering & Relevance

**Status:** Engineering specification. The S0–S4 fidelity tier system, promotion/demotion rules, per-tier simulation semantics, conserved invariants, interaction with the determinism contract, the relevance layer's tier-decision logic, and per-tier performance budgets.
**Date:** 2026-08-03

---

## 0. What this document is

The engine simulates a world that is much larger than what fits in a 60 Hz frame budget. A village of 180 NPCs, a region of 50,000 mortals, a continent of millions — only a tiny fraction can be simulated at full fidelity at any moment. This document specifies how the engine decides what to simulate at which fidelity, what each fidelity tier actually computes, and what invariants are conserved when entities move between tiers.

The central commitment: **tier transitions are conserved.** Promotion (S0 → S4) cannot create favorable facts about an entity. Demotion (S4 → S0) cannot erase named entities or undo canonical state. The tier system is a *performance optimisation with semantic constraints*, not a free performance dial. Without the constraints, the tier system would silently rewrite the world — a Qi Condensation bandit who fast-travels through an S0 region cannot arrive at S4 with a Core Formation breakthrough they achieved during the unobserved travel, because the S0 tier does not simulate breakthrough.

### Precedents cited (AGENTS.md Part 3: "Cite the precedent")

- **Crusader Kings 3 dynasty optimisation** — distant dynasty members are simulated at reduced fidelity (their marriages and deaths are rolled probabilistically, not event-by-event). Adopted as the S1 demographic tier.
- **Stellaris late-game automation** — sectors reduce to aggregate economic models when the player is not observing. Adopted as the S2 aggregate tier.
- **Dwarf Fortress historical abstraction** — historical figures who leave the playable area are "retired" with their state frozen, not deleted. Adopted as the S0 frozen tier.
- **Mount & Blade Bannerlord campaign AI** — lords have full AI when the player is near, reduced AI (move-and-rest) when distant. Adopted as the S3 tier.
- **RimWorld pawn optimisation** — pawns outside the viewport have reduced tick frequency. Adopted as the S3 reduced-frequency tier.

---

## 1. The S0–S4 fidelity tier system

### 1.1 The tier enum

```typescript
type SimulationTier = 0 | 1 | 2 | 3 | 4;
```

Five tiers. The numbers are deliberately small and ordered: higher number = higher fidelity. The names are also exposed for readability:

```typescript
const TIER_NAMES: Record<SimulationTier, string> = {
  0: 'frozen',
  1: 'demographic',
  2: 'aggregate',
  3: 'interactive',
  4: 'detailed',
};
```

### 1.2 The tier profile

Every entity has a `SimulationProfile` that determines what is computed at each tier:

```typescript
interface SimulationProfile {
  entityId: number;
  currentTier: SimulationTier;
  tierHistory: TierTransition[];          // for audit
  promotionEligibleAt: number;            // tick when next eligible for promotion
  demotionEligibleAt: number;             // tick when next eligible for demotion
  lastFullSimTick: number;                // last S4 tick
  scheduledEvents: ScheduledEvent[];      // events that must fire even at low tiers
  canonicalSnapshot: CanonicalSnapshot;   // frozen state at S0
}

interface TierTransition {
  tick: number;
  from: SimulationTier;
  to: SimulationTier;
  reason: string;                          // 'player_proximity' | 'quest_relevance' | ...
  invariantCheck: 'passed' | 'failed';
}
```

### 1.3 The tier table

| Tier | Name | Simulates | Tick frequency | Example |
|---|---|---|---|---|
| **S4** | Detailed | Full AI, full physics, full animation, full qi-state, full schedule | Every tick (60 Hz) | NPCs within 50 m of the player |
| **S3** | Interactive | Full state machine, reduced physics, keyframe animation, reduced qi-state | Every 4th tick (15 Hz) | NPCs within 200 m of the player, visible but distant |
| **S2** | Aggregate | Aggregate state (position region, activity category), no individual AI | Every 16th tick (3.75 Hz) | NPCs in the same settlement as the player but offscreen |
| **S1** | Demographic | Demographic state (population count, birth/death rates), no individuals | Every 256th tick (0.23 Hz, ~4 sec) | Settlements in the same region but distant |
| **S0** | Frozen | Frozen state; no simulation | Never (until promoted) | Settlements the player has never visited |

---

## 2. What each tier simulates

### 2.1 S4 (Detailed)

Full simulation. The entity's AI runs every tick, deciding actions based on schedule, relationships, qi-state, and environment. Physics is full (kinematic body, CCT movement, collision response). Animation is full (skeletal, blended, with facial animation for dialogue). Qi-state evolves (reservoir drains and replenishes, deviation risk accumulates, phase-affinities develop). The schedule advances; if an NPC is supposed to be at the well at noon, they walk to the well.

S4 is the only tier where combat, cultivation, and detailed perception happen. A cultivator at S4 can break through, fight, be injured, and form relationships.

### 2.2 S3 (Interactive)

Reduced-frequency S4. The same state machine runs, but only every 4th tick. Between S3 ticks, the entity interpolates: position is extrapolated from velocity; animation plays a looping walk cycle; qi-state is approximated (reservoir drains at average rate, no deviation rolls). On the 4th tick, the state machine catches up: it decides what the NPC has been doing for the past 4 ticks and applies the consequences.

S3 entities can be observed by the player (they are visible) but cannot be interacted with at combat resolution. A punch thrown at an S3 NPC will hit on the next S3 tick, not on the S4 frame the player pressed the button. This is a 4-tick (66 ms) latency — noticeable but tolerable.

If the player attempts to interact with an S3 entity (talk, attack, cultivate-with), the entity is **immediately promoted to S4** (§3.1) before the interaction is processed. This is the genre's "the world sharpens when you pay attention" pattern, made operational.

### 2.3 S2 (Aggregate)

The entity ceases to be an individual. Its state is folded into an **aggregate**:

```typescript
interface SettlementAggregate {
  settlementId: string;
  population: number;
  demographics: DemographicBreakdown;     // age/sex/realm distribution
  activityMix: Record<ActivityCategory, number>;  // 'farming': 120, 'weaving': 30, ...
  qiAggregate: number;                    // total qi in the settlement
  moodAggregate: number;                  // average mood
  scheduledEvents: ScheduledEvent[];      // upcoming events (festivals, markets)
  canonicalSnapshot: CanonicalSnapshot;   // for restoration on promotion
}
```

Individual NPCs at S2 do not have positions or schedules. They are *counted*. The aggregate's `activityMix` says "120 farming, 30 weaving" — the renderer can show 120 farmer-meshes in fields and 30 weaver-meshes in houses, but they are not individuals. When the aggregate updates (every 16th tick), the counts may shift (some farmers finish, some weavers start).

### 2.4 S1 (Demographic)

Even more abstract. The settlement is a population number with birth/death/migration rates. Per doc 25 §1.2 (citing Crusader Kings 3): births and deaths are rolled probabilistically per year (adjusted to per-tick probability), not event-by-event. A settlement at S1 might record "4 births, 2 deaths, 1 emigration this year" without naming the individuals.

S1 settlements still consume/produce economic goods (per the economy system, doc 18) — the aggregate economy is part of the canonical state. But individual transactions are not simulated.

### 2.5 S0 (Frozen)

No simulation. The entity's `canonicalSnapshot` is the state. Time does not pass for S0 entities. A settlement at S0 has the same population, same economy, same NPCs in the same positions (per the snapshot) when the player arrives as when the player left — even if 10 years of Mortal time passed in between.

S0 is the **unvisited** tier. The player has never been here; the engine has no reason to simulate. When the player approaches (within 1 km, per doc 23 §5.1), the settlement is promoted to S1, then S2, then S3, then S4 as the player gets closer.

### 2.6 The tier-fidelity failure case

**Failure case (tier fidelity):** A cultivator at S3 is mid-breakthrough when the player walks away. The player returns 10 minutes later; the cultivator is now at S4. Did the breakthrough succeed? The fix: breakthrough is a **scheduled event**. When the breakthrough began (at S4), it was scheduled as a `ScheduledEvent` with a deterministic outcome and tick. The schedule survives tier transitions: at S3, the breakthrough is not re-rolled; it is recorded as "scheduled for tick T." At S0, the schedule is frozen. When the cultivator is promoted back to S4 (or even S2), the scheduled event fires at tick T and the breakthrough resolves — the outcome was determined when the breakthrough began, not when the player next observed it.

This is the **scheduled-event invariant** (§4.2): outcomes are determined when they are scheduled, not when they are observed. The tier system cannot defer outcomes to the moment of observation.

---

## 3. Promotion and demotion

### 3.1 Promotion

Promotion moves an entity from a lower tier to a higher tier. The relevance layer (§6) decides when. The promotion process:

1. **Restore from canonical snapshot.** The entity's full state is restored from its `canonicalSnapshot` (S0/S1) or expanded from the aggregate (S2).
2. **Replay scheduled events.** Any scheduled events that were deferred during the lower tier are replayed in order. The outcomes were determined when scheduled; the replay applies them.
3. **Catch up the schedule.** The entity's schedule is advanced to the current tick. If the schedule says "noon: at the well" and it is now 2 PM, the entity is at the well (they were there at noon, offscreen) and is now transitioning to the afternoon activity.
4. **Re-emit canonical events.** Any canonical events that would have been emitted during the lower tier (deaths, births, marriages, breakthroughs) are emitted retroactively, with their original scheduled ticks. The event log records them at their canonical ticks, not at the promotion tick.
5. **Set `currentTier`.** The entity is now S4 (or S3, S2).

### 3.2 The promotion-favorable-facts failure case

**Failure case (promotion favorable facts):** A Qi Condensation bandit is promoted from S0 to S4. During the unobserved period (years of Mortal time), did they break through to Foundation Establishment? Per the conserved invariant (§4.1): **no.** Breakthroughs require practice, which requires simulation; S0 does not simulate practice; therefore the bandit is still Qi Condensation when promoted. The fix: the S0 → S4 promotion restores the bandit's state as it was when they were demoted (or generated). Time did not pass for them.

But what if the bandit's `ScheduledEvent` log includes a scheduled breakthrough? Then the breakthrough fires at its scheduled tick (per §2.6). The breakthrough was scheduled when the bandit was at S4 (before demotion); the schedule survives demotion; the breakthrough resolves on promotion. This is the only way a breakthrough can occur during an unobserved period: it must have been scheduled at S4 first.

Rejected alternative: roll breakthroughs probabilistically at S0. Rejected because (a) it would create favorable facts out of nothing — the bandit "got lucky" while the player wasn't looking; (b) it violates the genre's commitment model (doc 13 §3: breakthroughs are committed actions, not random events); (c) it breaks determinism (the probability roll would have to happen at a specific tick, but the S0 entity has no tick).

### 3.3 Demotion

Demotion moves an entity from a higher tier to a lower tier. The relevance layer decides when (typically: player walked away). The demotion process:

1. **Snapshot canonical state.** The entity's full state is captured in `canonicalSnapshot`.
2. **Schedule pending events.** Any events that were in-progress (a breakthrough mid-attempt, a combat engagement) are scheduled as `ScheduledEvent`s with deterministic outcomes, recorded in the entity's `scheduledEvents` list.
3. **Fold into aggregate (if S2).** The entity's individual state is folded into the settlement's aggregate. The individual ceases to exist at the simulation level (but their `canonicalSnapshot` is preserved for restoration).
4. **Set `currentTier`.** The entity is now S3 / S2 / S1 / S0.

### 3.4 The demotion-named-entity failure case

**Failure case (demotion named entity):** A named NPC (Wang Shouzheng, the lineage head) is demoted from S4 to S2. The aggregate now has 180 villagers instead of 181 individuals. Has Wang Shouzheng been erased? **No.** Per the conserved invariant (§4.1): demotion cannot erase named entities. The fix: the aggregate has a `namedIndividuals` list:

```typescript
interface SettlementAggregate {
  // ... (per §2.3)
  namedIndividuals: NamedIndividualRecord[];  // named NPCs, preserved across demotion
}

interface NamedIndividualRecord {
  entityId: number;
  name: string;
  canonicalSnapshot: CanonicalSnapshot;
  scheduledEvents: ScheduledEvent[];
  lastKnownPosition: Vec3;
  lastKnownActivity: string;
}
```

Named NPCs are *always* preserved as `NamedIndividualRecord`s, even when their parent settlement is at S0. The aggregate's `population` count includes them; the `namedIndividuals` list distinguishes them from the unnamed aggregate. When the settlement is promoted, named individuals are restored first (from their `canonicalSnapshot`s), then the unnamed aggregate is expanded into generic NPCs to fill the population count.

Rejected alternative: fold named individuals into the aggregate undifferentiatedly. Rejected because (a) the player would lose track of who is who — returning to a village and finding Wang Shouzheng "is now a generic farmer" breaks the social fabric; (b) scheduled events (a marriage, a death) would lose their subject; (c) it violates the genre's commitment to named characters (doc 34).

### 3.5 The tier-transition failure case

**Failure case (tier transition):** An entity is promoted from S2 to S4 mid-combat (the player ran toward a bandit fight). The bandit was at S2 (aggregate) when the player started running; the player arrives 2 seconds later; the bandit is now S4. The bandit's combat state was not in the aggregate. The fix: the relevance layer (§6) does not allow combat-in-progress entities to demote past S3. Once combat starts, the entity is locked at S3+ until combat ends. This is a **tier lock**:

```typescript
interface TierLock {
  entityId: number;
  reason: 'combat' | 'cultivation' | 'quest' | 'perception';
  expiresAtTick: number;             // 0 = no expiry; combat ends when combat ends
}
```

Tier locks override the relevance layer's tier decisions. An entity with a combat tier lock cannot be demoted below S3 until the lock expires.

---

## 4. The conserved invariants

### 4.1 The two invariants

1. **Promotion cannot create favorable facts.** An entity promoted from a lower tier cannot arrive at a higher tier with state it could not have acquired at the lower tier. Specifically: no new breakthroughs, no new relationships, no new skills, no new injuries healed, no new qi-reservoir gains beyond the scheduled-event replay.
2. **Demotion cannot erase named entities.** A named NPC demoted to any tier (including S0) remains a named NPC. Their `canonicalSnapshot` and `scheduledEvents` are preserved. The aggregate's population count includes them; the `namedIndividuals` list distinguishes them.

### 4.2 The scheduled-event invariant

Outcomes are determined when they are scheduled, not when they are observed. A scheduled event has:

```typescript
interface ScheduledEvent {
  eventId: string;
  scheduledAtTick: number;            // when the event was scheduled
  firesAtTick: number;                // when the event resolves
  outcome: DeterministicOutcome;      // pre-computed at scheduling time
  outcomeHash: string;                // SHA-256 of the outcome; for verification
  involvedEntities: number[];
  description: string;
}
```

The `outcome` is computed at `scheduledAtTick` using the state at that tick. When the event fires (at `firesAtTick`, possibly after a tier transition), the pre-computed outcome is applied. This guarantees that the tier system cannot affect outcomes — only the scheduling tick's state determines the outcome.

### 4.3 The invariant-verification failure case

**Failure case (invariant verification):** A promoted entity's state has a qi-reservoir higher than what scheduled events can account for. The promotion's invariant check fails: `invariantCheck: 'failed'`. The engine throws in dev mode; logs in production. The promotion is rolled back; the entity is left at the lower tier; a bug report is generated. This is the "exhibit reviewer voices" surface (AGENTS.md Part 3) — the engine does not silently produce favorable facts; it complains when the invariant is violated.

### 4.4 The named-entity-preservation failure case

**Failure case (named entity preservation):** A demoted settlement's `namedIndividuals` list is missing an NPC who was at S4 before demotion. This is a contract violation. The fix: the demotion process must enumerate every named NPC at S4/S3 and add them to `namedIndividuals` before folding the rest into the aggregate. The process is type-checked: the demotion function's signature requires the named-NPC list as input; the type system enforces the contract.

---

## 5. Tier transitions and the determinism contract

### 5.1 Tier decisions are deterministic

The relevance layer (§6) decides which entities are at which tier. This decision is a pure function of the canonical state at the current tick: `(worldState, tick) → tierAssignment`. Same state + same tick = same tier assignment, bit-for-bit. Two replays with the same seed + same inputs produce the same tier assignments at every tick.

### 5.2 Tier transitions are part of the canonical state

Every tier transition is recorded in the entity's `tierHistory` and in the global `TierTransitionLog`. The log is CBOR-serializable and part of the save. Loading a save and replaying the input log reproduces the same tier transitions at the same ticks.

### 5.3 The determinism-tier failure case

**Failure case (determinism + tier):** An entity is promoted to S4 at tick T in run 1, but at tick T+2 in run 2. The entity's state diverges: in run 1, the entity experienced 2 extra ticks of S4 simulation. The fix: the relevance layer's tier-decision function must be deterministic. If it uses `Math.random`, that's the bug. If it uses the entity's distance to the player, and the player's position is deterministic, the decision is deterministic. The determinism verification (doc 20 §7.3) includes the `TierTransitionLog` in its hash; any divergence throws.

### 5.4 The schedule-tick invariant

Scheduled events fire at their scheduled `firesAtTick`, regardless of the entity's tier at that tick. An S0 entity's scheduled event at tick T fires at tick T — but the entity is at S0, so the event is recorded in the log without being applied to a simulated entity. When the entity is later promoted, the event is replayed (§3.1.4). The event's outcome was determined at scheduling time; the replay applies it.

This means: **the global event log advances at full speed regardless of tier.** A scheduled death at tick T is in the log at tick T, even if the entity is at S0. The entity's `canonicalSnapshot` is not updated until promotion. This is correct: the death happened; the entity's frozen state is stale; promotion reconciles by applying the scheduled event.

---

## 6. The relevance layer

### 6.1 The relevance layer's job

The relevance layer is a system (registered with `host.registerSystem`) that runs once per tick and assigns a tier to every entity. The assignment is a pure function:

```typescript
function assignTiers(worldState: WorldState, tick: number): TierAssignment {
  const assignment: TierAssignment = {};
  for (const entity of worldState.entities) {
    assignment[entity.id] = computeTier(entity, worldState, tick);
  }
  return assignment;
}

function computeTier(entity: Entity, worldState: WorldState, tick: number): SimulationTier {
  // 1. Check tier locks (combat, cultivation, quest, perception)
  for (const lock of entity.tierLocks) {
    if (lock.expiresAtTick === 0 || lock.expiresAtTick > tick) {
      return Math.max(3, baseTier);  // never below S3 while locked
    }
  }

  // 2. Compute base tier from player proximity
  const distance = det_distance(entity.position, worldState.player.position);
  let baseTier: SimulationTier;
  if (distance <= 50) baseTier = 4;
  else if (distance <= 200) baseTier = 3;
  else if (sameSettlement(entity, worldState.player)) baseTier = 2;
  else if (sameRegion(entity, worldState.player)) baseTier = 1;
  else baseTier = 0;

  // 3. Quest relevance boosts (never demotes below S2)
  if (isQuestRelevant(entity, worldState)) {
    baseTier = Math.max(2, baseTier);
  }

  // 4. Scheduled events boost (never demotes below the tier needed to fire the event)
  if (hasScheduledEventSoon(entity, tick, 600)) {  // within 10 seconds
    baseTier = Math.max(3, baseTier);
  }

  // 5. Hysteresis: don't demote/promote too often
  baseTier = applyHysteresis(entity, baseTier, tick);

  return baseTier;
}
```

### 6.2 The four relevance signals

1. **Player proximity.** The primary signal. Distance-based, with thresholds at 50 m (S4), 200 m (S3), settlement-boundary (S2), region-boundary (S1), beyond (S0).
2. **Quest relevance.** An entity tagged as quest-relevant (per the narrative system, doc 26) is boosted to at least S2, regardless of distance. The player may need to interact with them later; the engine keeps their state evolving.
3. **Scheduled events.** An entity with a scheduled event firing within 10 seconds (600 ticks) is boosted to at least S3, so the event can fire at full fidelity.
4. **Tier locks.** Combat, cultivation, perception, and quest locks override the base tier. An entity in combat is S3+ until combat ends.

### 6.3 Hysteresis

Without hysteresis, an entity on the boundary of the 50 m S4 radius would flip between S3 and S4 every tick as the player moves slightly. Hysteresis:

```typescript
function applyHysteresis(entity: Entity, baseTier: SimulationTier, tick: number): SimulationTier {
  const current = entity.currentTier;
  if (baseTier > current && tick < entity.promotionEligibleAt) return current;
  if (baseTier < current && tick < entity.demotionEligibleAt) return current;
  // Set next eligible time: 60 ticks (1 second) for promotion, 240 ticks (4 seconds) for demotion
  return baseTier;
}
```

Promotion can happen quickly (1 second cooldown); demotion is slower (4 second cooldown) to avoid flicker when the player briefly looks away.

### 6.4 The relevance-layer failure case

**Failure case (relevance layer):** The relevance layer decides an NPC's tier based on whether the NPC is "on-screen." The camera's frustum is non-deterministic across browsers (different FOV, different aspect). The fix: the relevance layer uses **only canonical signals** — player position, entity position, quest state, scheduled events. The camera is a renderer concern; the relevance layer does not consult it. An offscreen NPC beside the player is still S4; an onscreen NPC 500 m away is still S1.

Rejected alternative: use camera frustum as a signal. Rejected because (a) non-deterministic; (b) the player can rotate the camera without moving — the world should not change tier because the player looked away; (c) the genre's perception model (doc 11 §3.2) is about attention, not camera direction.

---

## 7. Performance budgets per tier

### 7.1 The frame budget

The engine targets 60 Hz (16.67 ms per frame). The frame budget breakdown:

| Component | Budget (ms) | Notes |
|---|---|---|
| Renderer | 8.0 | Three.js render passes, post-processing |
| Simulation (S4) | 4.0 | Up to ~30 S4 entities |
| Simulation (S3) | 1.5 | Up to ~100 S3 entities at 1/4 frequency |
| Simulation (S2) | 0.5 | Aggregate updates |
| Simulation (S1) | 0.2 | Demographic rolls |
| Physics | 1.5 | Solver step |
| Navigation | 0.5 | Pathfinding, RVO |
| Audio | 0.3 | Voice management |
| GC / overhead | 0.5 | — |
| **Total** | **16.5** | within 16.67 ms budget |

### 7.2 The S4 entity budget

The 4.0 ms S4 budget at ~30 entities means ~133 µs per S4 entity per tick. This is the cost of: AI state machine, schedule advance, qi-state evolution, physics CCT, animation update, perception check, relationship-graph update. The budget is generous for modern hardware; the engine should comfortably hit 30 S4 entities on a 2024 mid-range laptop.

If the S4 entity count exceeds 30, the relevance layer's distance threshold (50 m) shrinks automatically until the count is back under 30. This is the **adaptive tiering**:

```typescript
function adaptiveS4Radius(currentCount: number, targetCount: number, baseRadius: number): number {
  if (currentCount <= targetCount) return baseRadius;
  // Shrink radius proportionally to (targetCount / currentCount)^(1/3) — cubic falloff
  return baseRadius * Math.cbrt(targetCount / currentCount);
}
```

The adaptive radius is canonical: it is recorded in the world state, hashed, and reproduced across browsers. Two browsers with the same canonical state compute the same adaptive radius.

### 7.3 The S3 frequency failure case

**Failure case (S3 frequency):** An S3 entity's 4-tick update happens to land on the same tick as 99 other S3 entities' updates. The simulation spikes: 100 S3 updates in one tick, exceeding the 1.5 ms budget. The fix: **stagger S3 updates.** Each S3 entity is assigned a `phaseOffset` (0, 1, 2, or 3) at S3 tier entry; the entity updates on ticks where `tick % 4 === phaseOffset`. This spreads the load across 4 ticks, keeping each tick's S3 work at ~25 entities.

```typescript
function shouldUpdateS3(entity: Entity, tick: number): boolean {
  return tick % 4 === entity.s3PhaseOffset;
}
```

The `phaseOffset` is deterministic: assigned by `detRng() % 4` at S3 entry. Same entity, same canonical state → same phase offset → same update ticks.

### 7.4 The aggregate-budget failure case

**Failure case (aggregate budget):** A settlement at S2 has 5000 residents. The aggregate's update (every 16th tick) processes all 5000 — too slow. The fix: the aggregate is a *summary*, not a list. The 5000 residents are represented as:

```typescript
interface SettlementAggregate {
  population: number;                          // 5000
  demographics: DemographicBreakdown;          // buckets, not individuals
  activityMix: Record<ActivityCategory, number>;
  // ... no per-individual data
  namedIndividuals: NamedIndividualRecord[];   // typically <50 named NPCs per settlement
}
```

The aggregate's update is O(1) (a few probabilistic rolls against the demographic buckets), not O(population). The named individuals (at most ~50 per settlement) are the only per-individual work, and they update at S3 frequency.

---

## 8. The tier-transition audit

### 8.1 Every transition is auditable

Per doc 23 §9 (the generator-audit pattern), every tier transition is auditable:

```typescript
interface TierTransitionAudit {
  entityId: number;
  tick: number;
  from: SimulationTier;
  to: SimulationTier;
  reason: string;
  relevanceSignals: {
    distance: number;
    questRelevant: boolean;
    scheduledEventWithin: number | null;
    tierLocks: string[];
  };
  invariantCheck: 'passed' | 'failed';
  scheduledEventsReplayed: number;
  canonicalEventsReemitted: number;
}
```

Every transition is recorded with the signals that drove it and the invariant check result. In dev mode, the scene inspector (doc 23 §2.2) shows an entity's tier history; clicking a transition shows its audit.

### 8.2 The audit-determinism failure case

**Failure case (audit determinism):** Two replays produce different tier-transition audits. The relevance layer is non-deterministic somewhere. The fix: the determinism verification (doc 20 §7.3 protocol) includes the `TierTransitionLog` in its hash. Any divergence is caught at the first divergent transition.

---

## 9. Failure cases (consolidated)

1. **Promotion creates favorable facts** — invariant check fails; promotion rolled back (§4.3).
2. **Demotion erases named entity** — type-system enforcement; `namedIndividuals` is required (§4.4).
3. **Tier lock ignored** — locks override base tier (§3.5).
4. **Scheduled event outcome varies with tier** — outcome pre-computed at scheduling time (§4.2).
5. **Tier decision uses non-canonical signal (camera frustum)** — forbidden; only canonical signals (§6.4).
6. **S4 entity count exceeds budget** — adaptive tiering shrinks S4 radius (§7.2).
7. **S3 update spike** — staggered phase offsets (§7.3).
8. **Aggregate update O(population)** — aggregate is a summary, not a list (§7.4).
9. **Tier transition non-deterministic** — included in determinism hash (§8.2).
10. **Hysteresis flicker** — promotion 1 s cooldown, demotion 4 s cooldown (§6.3).

---

## 10. Rejected alternatives

### 10.1 Continuous fidelity (no tiers)

Simulate every entity at full fidelity, all the time. Rejected because (a) 50,000 mortals at S4 = 6.7 seconds per tick — 400× over budget; (b) the genre's scale (a region of 50,000 mortals, a continent of millions) is incompatible with full-fidelity simulation; (c) no engine in existence does this; the doctrine (Ponytail §13: "Study how established products solve the problem") points to tiering.

### 10.2 Two-tier (onscreen / offscreen)

Simulate onscreen entities fully; freeze offscreen entities. Rejected because (a) loses the social fabric — a village the player left should continue to evolve (marriages, deaths, harvests), or the player's absence has no consequence; (b) cannot express the genre's time-skip trope (the player goes into closed-door cultivation for a year; the world should have changed when they emerge); (c) the offscreen world would be too static for the narrative spine (doc 26).

### 10.3 Probabilistic tier transitions

Roll a dice each tick to decide whether to promote/demote. Rejected because (a) non-deterministic without extreme care; (b) produces flicker; (c) has no semantic basis — the tier should reflect the entity's relevance, not a random number.

### 10.4 Tier assignment by entity type

Mortals are always S2; cultivators are always S4. Rejected because (a) a mortal beside the player should be S4 (the player can interact with them); (b) a distant cultivator should be S1 (the player is not interacting with them); (c) the relevance is contextual, not type-intrinsic.

### 10.5 Promote-on-interaction only

Entities stay at S0 until the player interacts. Rejected because (a) the world feels dead — walking through a village of frozen NPCs is uncanny; (b) the genre demands a living world (doc 26 narrative spine); (c) the player needs to *observe* an NPC before interacting, which requires the NPC to be at S3+ (visible, animated).

---

## 11. What this document enables

- The simulation has five tiers (S0–S4); each tier simulates a specific subset of entity behaviour at a specific frequency.
- Promotion and demotion are explicit processes with conserved invariants: promotion cannot create favorable facts; demotion cannot erase named entities.
- Scheduled events have pre-computed outcomes; tier transitions replay them, not re-roll them.
- Tier decisions are deterministic functions of canonical state; the camera is not a signal.
- The relevance layer uses four signals: player proximity, quest relevance, scheduled events, tier locks. Hysteresis prevents flicker.
- Per-tier performance budgets keep the frame under 16.67 ms; adaptive tiering shrinks the S4 radius under load; staggered S3 phase offsets prevent spikes.
- Every tier transition is auditable; the audit includes the relevance signals and the invariant check.
- Rejected alternatives (continuous, two-tier, probabilistic, by-type, promote-on-interaction) are documented with reasons.

The next step is to implement the relevance layer, the tier-transition system, and the conserved-invariant checks, starting with a single settlement of 30 NPCs. The smallest end-to-end test: the player walks away from the settlement; the NPCs demote to S2; the player returns 1 minute later; the NPCs promote back to S4; the invariant check passes; the deterministic hash matches across two replays. That is the gate.
