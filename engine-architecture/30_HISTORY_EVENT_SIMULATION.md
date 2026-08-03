# 30 — History and Event Simulation

**Status:** Foundation. The history generator — how named events are spawned from world state, how they persist as ruins and descendants and contaminated terrain, how the century-absence test runs history forward without the player, and how the player's own actions become the history future generations inherit.
**Date:** 2026-08-03

---

## 0. What this document is and why it exists

The prior corpus (docs 04, 14, 18, 26-29) specified the world's *substrates*: mortal villages, spirit veins, food webs, markets, NPC cognition, knowledge ecology, cultivation mechanics. It did not specify the *event engine* — the subsystem that takes those substrates as inputs and produces the wars, migrations, sect collapses, beast tides, plagues, failed ascensions, discovered inheritances, and territorial disputes that constitute the world's *history*. A world without events is a diorama; a world with events is a place where things have happened and where the player's arrival is itself an event.

The doctrine (AGENTS.md Part 3: "Ship the working thing before the perfect thing") requires that history be *generatable* — not hand-authored — so that the century-absence test (per doc 07 §6.1) can run 100+ years forward deterministically and produce a hashable, replayable result. This document specifies the event engine that makes that possible.

### Precedents cited

- **Dwarf Fortress (Bay 12) — the worldgen event log.** World generation produces a chronological log of every event (wars, births, deaths, artifact creations, beast attacks) that the player can later read. This document adopts the chronological-event-log model.
- **Crusader Kings III (Paradox, 2020) — the live event generator.** Events fire from current state (a vassal with low opinion and a strong claim rebels; a plague spreads along trade routes). This document adopts the state-driven event-firing model.
- **Shadow of Mordor (Monolith, 2014) — the Nemesis-system persistent consequences.** Killed orcs are replaced by their kin or subordinates who remember the player. This document adopts the persistent-consequences model for event afterlives.
- **RimWorld (Ludeon, 2018) — the incident-deferred system.** Incidents are queued with weights and minimum intervals; the AI storyteller selects the next incident to fire. This document adopts the weighted-queue + interval model (without the storyteller's "difficulty" framing).

---

## 1. The event taxonomy

A named event is a typed record with preconditions, consequences, and persistent afterlives. The taxonomy is closed: every event in the simulation is one of the types below.

```typescript
type EventType =
  | 'war'                    | 'migration'           | 'sect_collapse'
  | 'dynasty_change'         | 'beast_tide'          | 'plague'
  | 'failed_ascension'       | 'discovered_inheritance' | 'resource_boom'
  | 'territorial_dispute'    | 'tribulation_strike'  | 'breakthrough_event'
  | 'foundation_of_sect'     | 'dissolution_of_sect' | 'marriage_alliance'
  | 'feudEruption'           | 'corruption_scandal'  | 'smuggling_bust'
  | 'market_crash'           | 'vein_depletion'      | 'vein_discovery'
  | 'deviation_outbreak'     | 'yao_awakening'       | 'lost_manual_resurfaced'
  | 'karmic_retribution'     | 'prophetic_dream_wave'| 'foreign_invasion'
  | 'natural_disaster'       | 'pilgrimage'          | 'tournament'
  | 'assassination'          | 'succession_crisis'   | 'cultivator_death';

interface HistoryEvent {
  eventId: number;
  eventType: EventType;
  tick: number;                  // when it fired
  regionId: number;              // primary location
  participants: EventParticipant[];
  causes: EventCause[];          // what triggered it
  consequences: EventConsequence[]; // immediate effects
  afterlife: EventAfterlife;     // persistent residue (per §5)
  hash: string;                  // immutable SHA-256 of the event's CBOR
  rumors: RumorInstance[];       // rumors spawned by this event (per doc 27 §4)
}

interface EventParticipant {
  npcId?: number;
  factionId?: number;
  role: 'initiator' | 'target' | 'victim' | 'beneficiary' | 'witness' | 'enforcer';
  powerAtEvent: number;          // their qi-realm at the time
  outcomeFor: 'gain' | 'loss' | 'neutral' | 'death';
}
```

**Failure case — orphan event.** An event with no `causes` and no `participants` is a bug. The simulator rejects it. Every event must be traceable to a state condition (the cause) and affect at least one actor (the participant).

---

## 2. The event causes (state-driven generation)

Events fire when state conditions are met. Each event type has a *trigger predicate* over world state and a *base probability* per check.

```typescript
interface EventTrigger {
  eventType: EventType;
  predicate: (worldState: WorldState, regionId: number) => boolean;
  baseRate: number;            // probability per day when predicate is true
  cooldownDays: number;        // minimum days between firings of this type in this region
  requiredTier: 'S0' | 'S2' | 'S4';  // minimum tier the region must be at to fire this event
}

// Example: war trigger
const warTrigger: EventTrigger = {
  eventType: 'war',
  predicate: (ws, regionId) => {
    const factions = getFactionsInRegion(ws, regionId);
    return factions.some(f => f.cohesion < 0.3 && f.militaryStrength > threshold);
  },
  baseRate: 0.005,            // 0.5% per day when predicate holds
  cooldownDays: 365,          // at most one war per region per year
  requiredTier: 'S2',         // wars can fire at S2 (don't need S4 detail)
};
```

**The trigger catalog.** Each event type has a documented trigger:

- **war** — two factions with low mutual loyalty + sufficient military strength + a territorial dispute (per §3).
- **migration** — settlement's `grainReserveDays < 30` for 60+ days OR contamination > 0.6 (per doc 28 §6).
- **sect_collapse** — faction `prosperity < 0.2` AND `cohesion < 0.2` for 90+ days (per doc 29 §13).
- **dynasty_change** — ruling faction's `cohesion < 0.1` for 30+ days AND a rival faction with `cohesion > 0.6` exists.
- **beast_tide** — peak-beast population > 1.5× carrying capacity OR a modao-beast outbreak (per doc 28 §7).
- **plague** — `contaminationLevel > 0.4` AND mortal population density > threshold AND a contamination-matching disease vector exists.
- **failed_ascension** — a cultivator at a breakthrough rite rolls failure (per doc 31 §1) AND the failure is public (perceived by 3+ witnesses).
- **discovered_inheritance** — a ruin (per §5) is investigated by a cultivator with `qi_perception > ruin_concealment` AND the cultivator survives the ruin's protections.
- **resource_boom** — a spirit vein is discovered (geological event) OR a spirit-herb garden blooms unusually (ecological event).
- **territorial_dispute** — two factions both claim a region (overlapping `claimedTerritory`).

**Failure case — event storm.** Multiple events firing in the same tick can swamp the simulator. The event queue enforces `max_events_per_tick` (default 10 per region, 50 globally). Excess events are deferred to the next tick with their predicates re-checked (if the predicate no longer holds, the event is dropped).

---

## 3. Event consequences (immediate effects)

Each event has typed consequences that modify world state. Consequences are atomic per event (all-or-nothing).

```typescript
type EventConsequence =
  | { type: 'npc_death'; npcId: number; causeOfDeath: string }
  | { type: 'npc_injury'; npcId: number; injuryType: string }
  | { type: 'npc_breakthrough'; npcId: number; newRealm: string }
  | { type: 'npc_displacement'; npcId: number; newRegionId: number }
  | { type: 'faction_destroyed'; factionId: number }
  | { type: 'faction_weakened'; factionId: number; magnitude: number }
  | { type: 'faction_strengthened'; factionId: number; magnitude: number }
  | { type: 'region_terrain_altered'; regionId: number; alteration: string }
  | { type: 'region_contamination_changed'; regionId: number; delta: number }
  | { type: 'population_loss'; regionId: number; fraction: number; cause: string }
  | { type: 'resource_created'; goodId: string; regionId: number; quantity: number }
  | { type: 'resource_destroyed'; goodId: string; regionId: number; quantity: number }
  | { type: 'new_ruin'; ruinId: number }
  | { type: 'new_rumor'; rumorId: number }
  | { type: 'oath_broken'; oathId: number }
  | { type: 'oath_forged'; oathId: number };
```

Each consequence is applied via the appropriate plugin's `setState` API. Cross-plugin effects go through the event bus (per doc 17 §2.2). The full event is logged in the persistent event log before consequences are applied (so a crash mid-application can be recovered).

**Failure case — consequence contradiction.** A consequence that contradicts world state (e.g., killing an already-dead NPC) is a bug. The simulator detects contradictions via a pre-application assertion: each consequence's preconditions are checked; if any fail, the event is rejected and the cause is investigated (the trigger predicate should have prevented the contradiction).

---

## 4. How events are generated from world state + factions + ecology + economy

The event-generation loop runs once per in-game day per region:

```
for each region R in active regions (S4 or S2):
  for each event trigger T in the trigger catalog:
    if T.cooldownDays has elapsed since last firing in R:
      if T.predicate(worldState, R):
        if rng(regionSeed, tick) < T.baseRate * contextModifier:
          fire event of type T in R at tick
          apply consequences
          log event
          spawn rumors (per doc 27 §4)
          create afterlife (per §5)
          set T.cooldownEnd[region] = tick + T.cooldownDays
```

The `contextModifier` scales the base rate based on context: a region at war has higher rates for `assassination`, `succession_crisis`, `migration`; a region in plague has higher rates for `cultivator_death`, `corruption_scandal`. The modifier is bounded `[0.1, 10.0]` to prevent runaway rates.

**Failure case — deterministic divergence.** Two runs with the same seed and same player inputs must produce the same event log. The `rng(regionSeed, tick)` consumption is logged per event; if two runs diverge, the divergence is at the first event where the RNG draw differs. The engine's hash-verification (per §9) catches this.

---

## 5. The event afterlife (persistent consequences)

An event's *afterlife* is the persistent residue it leaves in the world — the ruins, descendants, enemies, lost manuals, altered borders, ghost stories, and contaminated terrain that future generations encounter.

```typescript
interface EventAfterlife {
  eventId: number;
  ruins: Ruin[];
  descendants: DescendantLineage[];
  enemies: PersistentGrudge[];
  lostManuals: LostManual[];
  borderChanges: BorderChange[];
  ghostStories: GhostStory[];
  contaminatedTerrain: ContaminatedRegion[];
  memorialSites: MemorialSite[];
}

interface Ruin {
  ruinId: number;
  location: Vec3;
  originEventId: number;       // the event that created it
  ruinType: 'sect' | 'palace' | 'battlefield' | 'cultivation_cave' | 'tomb' | 'city';
  ageAtAbandonment: number;    // how old the structure was when ruined
  concealment: number;         // 0..1; how hard to find
  protections: string[];       // formations, traps, guardian beasts
  contents: RuinContent[];     // manuals, treasures, beast cores, corpses
  decayLevel: number;          // 0..1; how ruined it currently is
}

interface DescendantLineage {
  ancestorId: number;          // the original participant
  descendantIds: number[];     // current descendants
  inheritedGrudges: number[];  // grudge ids passed down
  inheritedOaths: number[];
  inheritedDebts: number[];
}

interface LostManual {
  manualId: string;
  originalOwner: number;
  lastKnownLocation: Vec3 | null;
  concealment: number;
  discoveredBy: number | null;
  rediscoveryHint: string;     // for divination (per doc 27 §9)
}

interface GhostStory {
  storyId: number;
  regionId: number;
  originEventId: number;
  currentDistortion: string;   // per doc 27 §7
  haunting_location: Vec3;
  anchorsBound: number[];      // unresolved anchors from the event
}
```

**Ruin decay.** A ruin decays over centuries: `decayLevel += 0.01 per year`. At `decayLevel > 0.8`, the ruin's contents are mostly destroyed (manuals rot, treasures corrode, beast cores lose their qi). At `decayLevel > 0.99`, the ruin collapses and becomes a `memorialSite` (a place-name without contents).

**Manual rediscovery.** A lost manual (per `LostManual`) can be rediscovered by: (1) a cultivator investigating the ruin (per `discovered_inheritance` event), (2) a diviner perceiving the manual's qi-resonance (per doc 27 §9), (3) a descendant of the original owner inheriting a fragment. The rediscovery is a `lost_manual_resurfaced` event (per §1).

**Failure case — afterlife bloat.** Centuries of events produce thousands of ruins, millions of ghost stories, vast descendant lineages. The simulator caps the afterlife per region: `max_ruins_per_region` (default 32), `max_ghost_stories_per_region` (default 64). When the cap is exceeded, the oldest, lowest-concealment items are *resolved* (a ruin fully collapses; a ghost story's anchor is laid to rest by a passing cultivator).

---

## 6. Event persistence: descendants, enemies, lost manuals

The afterlife is not passive. It generates *new* events over time.

```typescript
interface AfterlifeGenerator {
  // A descendant coming of age may seek to avenge an ancestor's grudge
  descendantComingOfAge(npcId: number, inheritedGrudges: number[]): EventCause[];

  // A persistent enemy may re-emerge when their faction regains strength
  enemyReemergence(persistentGrudge: PersistentGrudge): EventCause[];

  // A lost manual's qi-resonance may surface in a diviner's perception
  manualResonanceSurfaced(manualId: string, divinerId: number): EventCause[];

  // A ghost story may produce a haunting event when an anchor-bound NPC enters the area
  hauntingTriggered(ghostStoryId: number, npcId: number): EventCause[];
}
```

**The descendant rule.** An NPC who inherits a grudge (per `DescendantLineage.inheritedGrudges`) has the grudge in their `GoalState` from age 16 (the coming-of-age). The grudge's severity is `0.5 * ancestor_grudge_severity * (1 + traits.grudges)`. The descendant may or may not act on it (per their cognition, doc 26 §16), but the grudge is present. This is the genre's "sworn brother's son seeks revenge" trope, made mechanical.

**The enemy reemergence rule.** A persistent enemy (a faction or NPC that lost a war but was not destroyed) can re-emerge when their strength recovers. The simulator tracks `dormant_enemy` records; when their `militaryStrength` exceeds a threshold, a `territorial_dispute` or `war` event is fired with them as the initiator.

---

## 7. Event persistence: contaminated terrain

Events that involve deviations, tribulations, or mass death leave `ContaminatedRegion` afterlives:

```typescript
interface ContaminatedRegion {
  regionId: number;
  contaminationLevel: number;  // 0..1
  contaminationType: 'modao' | 'tribulation' | 'mass_death' | 'karmic' | 'chemical';
  originEventId: number;
  decayRate: number;           // per year; 0.01-0.10 depending on type
  cleansingRituals: string[];  // rituals that can accelerate decay
  effectsOnEcology: string[];  // per doc 28 §9
  effectsOnCultivators: string[]; // deviation risk, perception penalty
}
```

**Decay.** Contamination decays at 0.01-0.10 per year. Modao contamination decays slowest (0.01); mass-death contamination decays faster (0.05); chemical contamination (alchemical spills) decays at 0.10. Active cleansing (a Foundation Establishment+ cultivator performing a cleansing rite) adds 0.20 per ritual.

**Failure case — permanent contamination.** Some contamination is essentially permanent (a Mahayana-level law-conflict that scarred the land). These regions are marked `permanently_contaminated` and are excluded from the decay rule. They are hazards, not playable zones (unless the player brings cleansing capability).

---

## 8. The century-absence test

Per doc 07 §6.1, the simulator must run 100+ years forward without the player and produce a deterministic, hashable result. The century-absence test is the engine's stress test for determinism.

```typescript
interface CenturyAbsenceTest {
  startTick: number;
  endTick: number;            // startTick + 100 years of ticks
  startStateHash: string;
  endStateHash: string;
  eventsFired: number;
  eventsLog: HistoryEvent[];
  performanceMs: number;
  divergences: DivergenceReport[];  // empty if deterministic
}

interface DivergenceReport {
  tick: number;
  regionId: number;
  field: string;
  expectedValue: string;
  actualValue: string;
  causeEventId: number | null;
}
```

**Running the test.** The test runs headless (per doc 17 §4.3): no renderer, no input. All regions run at S2 (the player is absent; no S4 needed). The event engine fires events per §4; the ecology runs at S2 (per doc 28 §10); the economy runs at S2 (per doc 29 §12); the cognition runs at S2 (per doc 26 §17); the knowledge decays and distorts (per doc 27 §7-8).

**Hashing.** The `endStateHash` is the SHA-256 of the full world state at `endTick`. Two runs with the same seed produce the same hash. The test is part of the engine's CI; a hash mismatch fails the build.

**Performance budget.** The test must complete in under 5 minutes wall-clock for 100 in-game years (per the engine's performance contract). At ~36500 in-game days × ~10 regions × ~10ms per day per region = ~3650 seconds = 61 minutes — too slow. The S2 simulation must be optimized: per-day updates are batched into per-week or per-month aggregates where possible (the economy already runs per-month at S2; cognition runs per-24-ticks; ecology runs per-day).

**Failure case — event storm during absence.** A 100-year run can produce hundreds of thousands of events. The event log is capped at `max_events_per_absence_run` (default 1,000,000); overflow events are aggregated into `EventSummary` records (one per type per region per decade) to preserve auditability without unbounded storage.

---

## 9. The player's actions as history

The player is not exempt from the event engine. Player actions that meet event thresholds fire events:

- The player kills a named NPC → `assassination` event (if the killing was unsanctioned) or `cultivator_death` (if sanctioned, e.g., a duel).
- The player breaks through to a new realm → `breakthrough_event` with the player as `initiator`.
- The player founds a sect → `foundation_of_sect` event.
- The player clears a ruin → `discovered_inheritance` event with the player as `beneficiary`.
- The player is involved in a war (as sect member, mercenary, or instigator) → `war` event with the player in `participants`.

```typescript
interface PlayerActionToEvent {
  playerAction: string;       // 'killed_npc', 'broke_through', etc.
  triggeringEvent: EventType; // the event that fires
  playerRole: EventParticipant['role'];
  witnessesRequired: number;  // how many NPCs must perceive it for the event to fire
}

// Player actions that are NOT events (private, no witnesses, no afterlife):
//   - private cultivation practice
//   - private conversations (unless they trigger another event)
//   - inventory management
//   - save/load
```

**The witness rule.** A player action becomes an event only if perceived by at least one NPC (per doc 27 §2) or leaves qi-residue (per doc 27 §5) that is later read. A private cultivation session in a sealed cave does not become an event; a public breakthrough does. This is the "no history without witnesses" rule.

**The afterlife of player events.** The player's events leave afterlives like any other. A player who kills a sect master leaves a `Ruin` (the destroyed sect compound), `DescendantLineage` (the master's disciples and kin inheriting grudges), and possibly `GhostStory` (if the master's anchor does not move on). The player can encounter their own past as history — meeting a descendant of an NPC they killed, finding a ruin they created, hearing a distorted rumor of their own deeds.

---

## 10. Event cross-tier behavior

Events fire across tiers. The tier governs *which events* fire and *how detailed* the consequences are.

```
┌─────────┬─────────────────────────────────────────────────────────────┐
│ Tier    │ Event behavior                                               │
├─────────┼─────────────────────────────────────────────────────────────┤
│ S4      │ All event types can fire. Consequences are per-individual  │
│ (full)  │ (named NPC deaths, specific ruin contents). Player is      │
│         │ present; events interact with the player directly.          │
├─────────┼─────────────────────────────────────────────────────────────┤
│ S2      │ All event types can fire. Consequences are aggregate       │
│ (aggr.) │ (population loss as a fraction, ruin count as a number).   │
│         │ Named NPCs involved are tracked (per doc 07 §6.1's          │
│         │ conservation rule). The player is not present; events are   │
│         │ resolved without player interaction.                        │
├─────────┼─────────────────────────────────────────────────────────────┤
│ S0      │ No events fire. Frozen. When promoted, the simulator       │
│ (frozen)│ generates "catch-up" events from the elapsed time using    │
│         │ the S2 generator (per doc 26 §17 promotion rehydration).   │
└─────────┴─────────────────────────────────────────────────────────────┘
```

**Failure case — tier-promotion event burst.** A region promoted from S0 to S2 may generate a burst of catch-up events (decades of suppressed history firing at once). The simulator rate-limits this: catch-up events are spread across the first `catch_up_spread_ticks` (default 7 in-game days) of S2 simulation, with `max_catch_up_events_per_tick` (default 5). This prevents the player from being overwhelmed by a wall of history on entering a new region.

---

## 11. Event chains (one event causing others)

Events are not independent. A war can cause migrations, plagues, dynasty changes, and lost-manual events in cascade.

```typescript
interface EventChainRule {
  triggeringEvent: EventType;
  triggeredEvent: EventType;
  probability: number;        // per triggering event
  delayTicks: number;         // how long after the trigger
  regionSpread: 'same' | 'neighbor' | 'any';  // where the triggered event fires
  conditionPredicate?: (triggeringEvent: HistoryEvent) => boolean;
}

// Example chain rules:
//   war → migration (probability 0.4, delay 30 days, same region)
//   war → plague (probability 0.1, delay 60 days, same region)  // refugees carry disease
//   plague → sect_collapse (probability 0.2, delay 180 days, same region)  // weakened sect
//   failed_ascension → tribulation_strike (probability 0.5, delay 0 days, same region)  // residue
//   sect_collapse → discovered_inheritance (probability 0.6, delay 365 days, same region)  // ruins
//   corruption_scandal → market_crash (probability 0.3, delay 7 days, same region)
```

**Chain depth limit.** Chains cannot recurse indefinitely. The simulator caps `chain_depth` at 5: an event triggered by a chain rule cannot itself trigger a chain rule beyond depth 5. This prevents runaway event cascades from a single triggering event.

**Failure case — chain echo.** A region where `war → migration → resource_boom (in the now-underpopulated region) → immigration → war` cycles endlessly is detected by the simulator after 3 cycles and damped: the chain rule's `probability` is halved for the affected region for `chain_damp_duration` (default 10 years). This is the historical "frontier warfare" cycle, made mechanical and bounded.

---

## 12. Event logging and the persistent history

Every event is logged in the `PersistentHistoryLog`, an append-only structure that survives save/load and tier transitions.

```typescript
interface PersistentHistoryLog {
  entries: HistoryLogEntry[];
  totalEventsLogged: number;
  // The log is sharded by century to keep individual shards small.
  centuryShards: Map<number, HistoryLogEntry[]>;
}

interface HistoryLogEntry {
  eventId: number;
  eventType: EventType;
  tick: number;
  regionId: number;
  summary: string;            // human-readable
  hash: string;               // immutable
  participantNames: string[]; // names of involved NPCs
  afterlifeRefs: string[];    // references to Ruin, GhostStory, etc. ids
}
```

**Player access.** The player can read the persistent history log via: (1) the journal (per doc 23 §1.3), which surfaces events the player has learned about; (2) the lineage hall (per doc 04), which displays the local history; (3) divination (per doc 27 §9), which can perceive past events' qi-momentum; (4) ghost stories, which are the distorted folk-memory of past events.

**Failure case — log bloat.** A 1000-year simulation produces millions of log entries. The log is sharded by century; old shards are compressed (only `EventType`-level summaries retained for events older than the player's lifetime, plus full detail for events involving the player or named NPCs).

---

## 13. Determinism contract

Every event operation is a pure function of:

```
event_state(t+1) = event_fn(
  event_state(t),             // pending triggers, cooldowns, afterlives
  worldState(t),              // factions, ecology, economy, cognition
  rng(regionSeed, tick)       // for event firing rolls, chain rule rolls
)
```

**Hash verification.** `hashHistory(regionId, tick)` returns the SHA-256 of the CBOR-encoded `HistoryState` for that region (the event log slice, the afterlife records, the cooldown trackers). Two runs with the same seed produce identical hashes.

**Event ordering.** Within a tick, events are processed in `eventId` order (monotonic). Cross-region events are processed in `regionId` order. This ordering is fixed; the simulator does not parallelize within a tick to preserve determinism.

**Afterlife consistency.** The afterlife records (`Ruin`, `DescendantLineage`, etc.) are part of the world state and hashed. A ruin created in one run must exist in another run at the same tick with the same `decayLevel` and `contents`.

---

## 14. Rejected alternatives

- **Scripted history (hand-authored events).** Rejected: violates the determinism-by-generation principle (per doc 07). The century-absence test requires generated events.
- **Player-as-sole-event-source.** Rejected: the world must feel alive when the player is absent. NPCs and factions must initiate events.
- **Probabilistic event firing without predicates.** Rejected: produces events that don't make sense (a war in a peaceful region). Predicates ensure events fire only when state supports them.
- **LLM-generated event narratives.** Rejected for the simulation core: non-deterministic, unverifiable. LLMs may be used for *narration* of events (in the journal, in dialogue) but not for event generation.
- **Quantum-event superposition (events that "happen" only when observed).** Rejected: violates the conservation rule (per doc 07 §6.1). Events fire deterministically when their predicates hold; whether the player observes them later is a separate question.
- **Time-travel (player can revisit past events).** Rejected: violates the anchor model (per doc 00 §2). The past is recoverable only through its afterlife and its qi-residue (per doc 27 §5, §9), not through direct travel.

---

## 15. Open decisions (surfaced for review)

1. **The 30-event taxonomy (§1).** Likely incomplete. The first playtest will reveal missing event types (e.g., "sect tournament", "treasure theft", "diplomatic_embassy"). Adding types is non-breaking; removing them is.
2. **The 10-events-per-tick-per-region cap (§2).** Invented. May be too low (regions feel static during event storms) or too high (simulator lag).
3. **The 5-deep chain limit (§11).** Invented. May be too shallow (some historical cascades go deeper) or too deep (runaway risk).
4. **The 32-ruins-per-region cap (§5).** Invented. May be too small for ancient regions (the capital region should have hundreds) or too large (memory cost).
5. **The 1,000,000 event-log cap per absence run (§8).** Invented. A 1000-year absence would overflow this; the engine may need to scale the cap with run length.
6. **The chain-damp 10-year duration (§11).** Invented. May be too short (cycles resume too fast) or too long (regions feel artificially stable).
7. **The 5-minute performance budget for the century-absence test (§8).** Decided by the engine contract. May need to relax to 10-15 minutes for the first implementation, then optimize.

---

## 16. Doctrine compliance

- **Build the engine, not just the brake:** the prior corpus's docs (04, 14, 18, 26-29) specified the substrates; this document specifies the event engine that animates them.
- **Make decisions; do not defer:** the event taxonomy, the trigger catalog, the consequence types, the afterlife structure, the chain rules, the century-absence contract are all decided. §15 are tuning parameters, not forks.
- **Cite the precedent:** Dwarf Fortress, Crusader Kings III, Shadow of Mordor, RimWorld are named and their contributions specified.
- **Design for joy first:** the first hour's joy is hearing a rumor about a ruin in the next valley — and recognizing that the ruin has a history, a cause, descendants who still live, and contents that may include a lost manual. The event engine produces the texture of a world with a past.
- **Authorize the smallest end-to-end thing:** this document specifies enough to implement the Cangli Riverlands event engine (10 regions, 30 event types, 100-year absence test) as the first prototype.

This document is the history bible. It is the event engine the prior corpus was missing.
