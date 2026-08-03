# 28 — Ecology and Demography

**Status:** Foundation. The living-substrate simulator — the food web that turns spirit-vein qi into ambient qi into herbs into herbivores into predators into peak beasts, the population dynamics that govern their rise and collapse, the seasonal cycles that modulate them, and the tier degradation that lets 180 named villagers coexist with ten thousand anonymous beasts without melting the CPU.
**Date:** 2026-08-03

---

## 0. What this document is and why it exists

The prior corpus (doc 14: ecology and qi; doc 04: the mortal substrate) specified the qi-stratified living world at design resolution: spirit veins, herbs, beasts, contamination, food webs. It did not specify the *simulator* that animates that world: how populations grow and crash, how cascades propagate, how seasonal cycles modulate the qi-flows, how spirit beasts cultivate, how yao (妖, sentient beasts) develop anchors, and how the whole system degrades gracefully when the player is not looking at it. This document specifies the simulator.

The doctrine (AGENTS.md Part 3: "Do not confuse the apparatus with the work") requires that the ecology serve the player's experience, not exist as a self-contained diorama. The ecology's work is: (1) producing the spirit herbs and beast parts the player needs for cultivation, (2) producing the dangers that make gathering and hunting non-trivial, (3) producing the seasonal texture that makes the world feel alive, (4) producing the cascades that turn player actions (over-harvesting, killing a peak beast) into world-state changes the player can perceive. Every subsystem below serves at least one of these.

### Precedents cited

- **Dwarf Fortress (Bay 12) — the worldgen wildlife populations.** Animal populations are tracked per region, with predation and migration. This document adopts the regional-population model for S2.
- **RimWorld (Ludeon) — the animal ecology.** Animals have hunger, predation, and reproduction. This document adopts the individual-animal model for S4.
- **Stellaris (Paradox) — the pop-growth and decline model.** Pops grow logistically and crash under stress. This document adopts the logistic-growth model for population dynamics.
- **Minecraft (Mojang) — the mob spawning rules.** Spawn caps per region; despawn at distance. This document adopts the spawn-cap + despawn rule for tier management.

---

## 1. The food web (the topology)

The ecology is a directed graph of trophic levels. Each node is a *species* (a named category with qi-traits). Each edge is a predation relationship with an energy-transfer coefficient.

```
                          ┌──────────────┐
                          │ Spirit Vein  │  (qi source, §1.1)
                          │  (geology)   │
                          └──────┬───────┘
                                 │ qi emission
                                 ▼
                          ┌──────────────┐
                          │ Ambient Qi   │  (qi reservoir, §1.2)
                          │  (atmosphere)│
                          └──────┬───────┘
                                 │ qi absorption
                ┌────────────────┼────────────────┐
                ▼                ▼                ▼
        ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
        │ Spirit Herbs │ │ Spirit Insec │ │ Mortal Plant │
        │   (autotroph)│ │   (primary)  │ │   (autotroph)│
        └──────┬───────┘ └──────┬───────┘ └──────┬───────┘
               │                │                │
               ▼                ▼                ▼
        ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
        │ Herbivore    │ │ Small Beast  │ │ Mortal Game  │
        │   (qi-weak)  │ │  (qi-weak)   │ │   (no qi)    │
        └──────┬───────┘ └──────┬───────┘ └──────┬───────┘
               │                │                │
               └────────┬───────┴────────┬───────┘
                        ▼                ▼
                ┌──────────────┐ ┌──────────────┐
                │  Mid Beast   │ │  Mortal Pred │
                │ (qi-mid)     │ │   (no qi)    │
                └──────┬───────┘ └──────┬───────┘
                       │                │
                       ▼                ▼
                ┌──────────────┐ ┌──────────────┐
                │  Peak Beast  │ │ (top mortal) │
                │ (qi-strong,  │ │              │
                │  may be yao) │ │              │
                └──────────────┘ └──────────────┘
```

```typescript
interface FoodWebNode {
  speciesId: string;
  trophicLevel: 0 | 1 | 2 | 3 | 4 | 5;  // 0 = qi-source, 5 = peak beast
  qiProfile: PhaseSignature;             // 5-phase affinity
  qiMagnitude: number;                   // 0..1; how much qi this species carries
  reproductionRate: number;              // per day at carrying capacity
  carryingCapacity: number;              // per region, per species
  preysOn: string[];                     // speciesIds
  preyedOnBy: string[];                  // speciesIds
  isCultivator: boolean;                 // can this species advance realms?
}

interface FoodWebEdge {
  predator: string;
  prey: string;
  energyTransfer: number;  // 0..1; how much of prey's qi transfers to predator
  predationRate: number;   // per encounter, per day
}
```

**Failure case — trophic cascade.** Removing a mid-level predator (the player hunts them all) causes herbivores to bloom, which over-grazes the herbs, which depletes the ambient-qi-absorbing plant mass, which raises ambient qi (no plants to absorb it), which causes spirit-herb mutations. The simulator models this cascade in §5.

---

## 2. Spirit veins → ambient qi → herbs → beasts (the energy chain)

The chain is the engine of cultivation-world ecology. Each link is a *qi transformation*.

### 2.1 Spirit veins (靈脈)

Per doc 14 §1, spirit veins are geological qi-sources. Each vein has a `phaseSignature`, a `magnitude`, and a `flowRate`.

```typescript
interface SpiritVein {
  veinId: number;
  location: Vec3;
  phaseSignature: PhaseSignature;  // 5-phase; rarely pure, usually dominant in 1-2 phases
  magnitude: number;               // 0..1; how rich the vein is
  flowRate: number;                // qi units per tick
  depth: number;                   // meters below surface
  tappedBy: number[];              // sects with tithing rights (per doc 29 §6)
}
```

### 2.2 Ambient qi

Spirit-vein qi flows into the local region's `AmbientQiField`. The field is a 3D scalar+phase-vector field stored as a sparse grid (per `ga:qi-field` plugin).

```typescript
interface AmbientQiField {
  regionId: number;
  cells: SparseGridCell[];  // sparse; only non-zero cells stored
  totalMagnitude: number;
  phaseProfile: PhaseSignature;  // aggregated
  contamination: number;         // 0..1; per doc 14 §4
}

interface SparseGridCell {
  cellId: number;  // x,y,z packed
  magnitude: number;
  phaseSignature: PhaseSignature;
  contamination: number;
}
```

Ambient qi is consumed by herbs (absorption), beasts (respiration), and cultivators (practice). It is replenished by spirit veins (flow), tribulation residue (rare, per doc 14 §5), and decay (qi-bearing corpses return their qi to the field).

### 2.3 Spirit herbs

Per doc 14 §2, spirit herbs are qi-bearing autotrophs. Each species has a `phaseAffinity`, a `growthTime` (years to mature), and a `qiYield` (how much qi a mature herb carries).

```typescript
interface SpiritHerbPopulation {
  speciesId: string;
  regionId: number;
  individuals: number;       // total count
  matureIndividuals: number; // ready to harvest
  plantedAt: number[];       // tick each individual was seeded
  phaseAffinity: PhaseSignature;
  growthTime: number;        // ticks to mature
  qiYield: number;           // qi per harvested individual
  carryingCapacity: number;  // per region
}
```

### 2.4 Spirit beasts

Per doc 14 §3, spirit beasts are qi-bearing animals. Each beast has a `realm` (Mortal-equivalent through Tribulation Crossing-equivalent), a `phaseAffinity`, and a `cultivationState` (per §7 below).

```typescript
interface SpiritBeastIndividual {
  beastId: number;
  speciesId: string;
  realm: BeastRealm;         // mortal-equivalent through tribulation-crossing-equivalent
  phaseAffinity: PhaseSignature;
  qiReservoir: number;       // current
  qiReservoirCap: number;
  age: number;               // ticks
  maxAge: number;            // ticks
  territoryCenter: Vec3;
  territoryRadius: number;
  isYao: boolean;            // has developed an anchor (per §8)
  anchorHash: string | null; // if yao
}

type BeastRealm =
  | 'beast_mortal' | 'beast_qi_induction' | 'beast_qi_condensation'
  | 'beast_foundation' | 'beast_core_formation' | 'beast_nascent_soul'
  | 'beast_spirit_severance';
```

---

## 3. Population dynamics

Each species' population is governed by a logistic-growth-with-predation equation, evaluated per region per day (in-game time):

```
dN/dt = r * N * (1 - N/K) - Σ (predation_rate_i * N * predator_population_i)
        - harvest_rate * N
        - contamination_death * N * contamination_level

  N            = current population
  K            = carrying capacity (function of ambient qi and habitat quality)
  r            = intrinsic growth rate
  predation_i  = per-predator predation rate on this species
  harvest_rate = player + NPC harvest pressure
```

**Carrying capacity** is dynamic: `K = base_K * (ambient_qi_magnitude / reference_qi_magnitude) * (1 - contamination)`. A depleted spirit vein shrinks K; a contaminated region shrinks K further.

**Failure case — population crash.** When `N < extinction_threshold` (default 0.1 * K), the population is functionally extinct. The simulator marks the species as `extinct_in_region` and removes it from the food web (its predators must switch prey or starve). Extinction is recoverable only via migration (§6) or player reintroduction (planting herbs, releasing bred beasts).

**Failure case — population explosion.** When `N > 1.5 * K` (over-population), the simulator triggers a `StarvationEvent` (per doc 30 §3): `death_rate = (N - K) / N` per day until N returns to K. This is the Malthusian correction, made mechanical.

---

## 4. Cascade effects (over-harvesting → migration → starvation)

The cascade chain:

```
Player over-harvests spirit herbs
  → herb population drops below replacement
  → herbivore population drops (less food)
  → herbivore migration to neighboring region (§6)
  → predator population drops (less prey) OR predators follow migration
  → neighboring region now over-grazed by immigrants
  → neighboring region's herbs over-consumed
  → cascade propagates
```

```typescript
interface CascadeEvent {
  cascadeId: number;
  originRegion: number;
  originSpecies: string;
  cascadeType: 'over_harvest' | 'over_hunt' | 'contamination' | 'climate_shift' | 'vein_depletion';
  startedAt: number;
  propagationPath: CascadeStep[];
  currentStep: number;
  resolvedAt: number | null;
}

interface CascadeStep {
  regionId: number;
  speciesId: string;
  effectType: 'population_drop' | 'population_bloom' | 'migration_in' | 'migration_out' | 'extinction';
  magnitude: number;
  tick: number;
}
```

**Cascade propagation rule.** A cascade step propagates to neighboring regions if the affected species' population crosses a threshold (`< 0.3 * K` for drops, `> 1.5 * K` for blooms). The propagation is rate-limited: one step per `cascade_propagation_interval` (default 7 in-game days) per edge, modeling the time it takes for wildlife to migrate.

**Failure case — infinite cascade.** Two regions feeding each other's collapse can oscillate forever. The simulator detects 3-cycle oscillations and damps them by raising the propagation threshold for the affected species (the survivors learn to stay put). This is the historical pattern of stable ecosystems under stress: oscillation dampens to a new equilibrium, not a runaway.

---

## 5. Seasonal cycles (the 24 solar terms / 二十四節氣)

Per doc 04 §3 and doc 14 §6, the world runs on the 24-solar-term calendar. Each solar term modulates the ecology:

```typescript
interface SeasonalModulation {
  solarTerm: SolarTerm;       // 立春, 雨水, 驚蟄, ... 大寒 (24 total)
  ambientQiModulator: number; // 0.8..1.2; multiplier on spirit vein flowRate
  herbGrowthModulator: number;// 0.0..1.5; multiplier on herb growth rate
  beastActivityModulator: number; // 0.3..1.5; multiplier on beast movement
  migrationWindow: boolean;   // true for solar terms when migration is favored
  contaminationDecayModulator: number;
}

type SolarTerm =
  | 'lichun' | 'yushui' | 'jingzhe' | 'chunfen' | 'qingming' | 'guyu'
  | 'lixia' | 'xiaoman' | 'mangzhong' | 'xiazhi' | 'xiaoshu' | 'dashu'
  | 'liqiu' | 'chushu' | 'bailu' | 'qiufen' | 'hanlu' | 'shuangjiang'
  | 'lidong' | 'xiaoxue' | 'daxue' | 'dongzhi' | 'xiaohan' | 'dahan';
```

**Seasonal events.** Certain solar terms trigger named ecological events:

- **Jingzhe (驚蟄, "awakening of insects"):** dormant beasts wake; hibernation ends; `beastActivityModulator` jumps from 0.3 to 1.0.
- **Mangzhong (芒種, "grain in ear"):** herb maturation peak; `herbGrowthModulator` peaks at 1.5.
- **Lidong (立冬, "start of winter"):** peak beasts enter seclusion; `beastActivityModulator` drops to 0.3.
- **Dahan (大寒, "great cold"):** mortal game migration; the year's lowest ambient qi.

**Failure case — out-of-season event.** A beast tide (per doc 30 §3) during Dahan is unusual but possible (driven by contamination or vein collapse). The simulator flags it as an `anomalous_event` and the NPCs react with alarm (per doc 26 §2 — `fear.stranger` and `fear.authority` rise).

---

## 6. Migration

Beasts and mortal game migrate between regions when local conditions degrade or seasonal windows open.

```typescript
interface MigrationEvent {
  migrationId: number;
  speciesId: string;
  fromRegion: number;
  toRegion: number;
  populationMoved: number;
  startedAt: number;
  durationTicks: number;
  reason: 'seasonal' | 'over_population' | 'starvation' | 'contamination' | 'predation_pressure';
}
```

**Migration rule.** A migration is triggered when:
- Seasonal window AND population > K (routine seasonal migration), OR
- Population > 1.3 * K AND neighbor region has capacity (overflow migration), OR
- Ambient qi in home region < 0.5 * reference AND neighbor region has qi (qi-driven migration), OR
- Contamination > 0.4 AND neighbor region is cleaner (contamination flight).

Migrations move `migration_fraction` (default 0.3) of the population over `migration_duration` (default 30 in-game days). The migrating population is "in transit" — vulnerable to predation and to the player's hunting.

**Failure case — migration corridor blocked.** If the migration path crosses a region controlled by a hostile sect (per doc 29 §10) that hunts migrants, the migration fails. The population either finds an alternate route (if one exists within `migration_search_radius`) or returns home (where they face starvation). This is the historical pattern of migration corridors being closed by warfare, made mechanical.

---

## 7. Spirit beast cultivation

Spirit beasts cultivate by absorbing ambient qi and refining it through their core (內丹). The cultivation is automatic — beasts do not "practice" in the human sense — but it is gated by ambient qi density and by the beast's phase affinity matching the region's phase profile.

```typescript
interface BeastCultivationState {
  beastId: number;
  currentRealm: BeastRealm;
  cultivationProgress: number;   // 0..1 toward next realm
  cultivationRate: number;       // progress per day
  corePhaseSignature: PhaseSignature;  // the beast's core, develops with realm
  deviationRisk: number;         // 0..1; rises with rapid cultivation
  breakthroughReady: boolean;
}

// The breakthrough state machine (reuses doc 27 §1 four-stage model):
//
//   PREP --[ambient qi sufficient, phase balanced]--> THRESHOLD
//   THRESHOLD --[core coherence held]--> INTEGRATION
//   INTEGRATION --[stable]--> SETTLEMENT (new realm)
//   THRESHOLD/INTEGRATION --[destabilized]--> FAILURE (deviation or death)
```

**Cultivation rate.** `cultivationRate = base_rate * ambient_qi_magnitude * phase_match_factor`. A beast in a phase-matched qi-rich region cultivates fast; a beast in a qi-poor or phase-mismatched region cultivates slowly or not at all.

**Failure case — beast deviation.** A beast that cultivates too fast (`cultivationRate > deviation_threshold`) accumulates `deviationRisk`. When `deviationRisk > 0.8`, the beast enters a `BeastDeviationEvent`: it becomes a *modao* (魔道) beast — chaotic, aggressive, and qi-corrupted. Modao beasts attack indiscriminately and contaminate the region they die in (per doc 14 §4). This is the genre's "spirit beast goes mad from rapid cultivation" trope, made mechanical.

---

## 8. Yao (妖) — anchor development in beasts

A peak beast (Core Formation equivalent or higher) may, through accumulated cultivation and life experience, develop an *anchor* — the metaphysical organ of self that mortals develop at Foundation Establishment. A beast with an anchor is a *yao*. Yao can speak, take human form (at higher realms), make oaths, and pursue long-term goals.

```typescript
interface YaoState {
  beastId: number;
  anchorHash: string;
  anchorFormedAt: number;
  humanFormUnlocked: boolean;     // requires Nascent Soul equivalent
  name: string;                   // self-chosen at anchor formation
  selfConcept: string;            // the yao's answer to "what am I?"
  moralAlignment: number;         // -1 (predatory) .. +1 (protective)
  oathBindings: OathRef[];        // oaths the yao has sworn
}

// Anchor formation trigger:
//   beast_realm >= beast_core_formation
//   AND life_event_count >= anchor_threshold (default 5)
//   AND self_reflection_moments >= 3 (moments of choosing survival-of-self over instinct)
//   AND ambient_qi_magnitude >= anchor_qi_minimum (default 0.6)
```

**The anchor threshold.** Not every peak beast becomes a yao. The beast must have experienced enough life events (combat, loss, kindness, choice) to develop a self-concept. The simulator tracks `life_event_count` and `self_reflection_moments` per beast; both are incremented by named events (surviving a near-death, choosing mercy, recognizing a former opponent).

**Failure case — false anchor.** A beast that meets the threshold mechanically but has not had the requisite life events develops a *false anchor* — an unstable self-concept that collapses under stress. False-anchor yao are vulnerable to `anchor_shattering` (the anchor disperses; the beast reverts to mindless peak-beast state). This is rare but possible; it is the yao equivalent of `forced_attempt` (per doc 31 §1).

---

## 9. Ecology ↔ cultivation interaction

The ecology is not a backdrop for cultivation; it is the substrate cultivation draws from. The interactions:

- **Spirit vein tithes (per doc 29 §6).** Sects that control spirit veins charge cultivators for access. The vein's `tappedBy` field (§2.1) records which sects have rights. Over-tapping depletes the vein's `magnitude` (it recovers slowly, years to decades).
- **Herb gathering.** Cultivators gather spirit herbs for pills (per doc 16). The gathering is the `harvest_rate` term in the population equation (§3). Over-gathering triggers cascades (§4).
- **Beast hunting.** Qi Condensation+ cultivators hunt spirit beasts for cores, hides, organs. Hunting reduces beast populations; the simulator tracks `hunting_pressure` per region per species.
- **Qi competition.** Cultivators practicing in a region absorb ambient qi, reducing it for herbs and beasts. A sect compound with 50 practicing disciples can locally deplete ambient qi, suppressing the surrounding ecology. This is the genre's "sect suppresses local wildlife" trope, made mechanical.
- **Contamination.** Failed cultivations, modao beasts, and tribulation residue contaminate the region (per doc 14 §4). Contamination kills herbs, sickens beasts, and taints gathered materials. Cleansing requires either time (slow decay) or active intervention (a Foundation Establishment+ cultivator performing a cleansing rite).

```typescript
interface EcologicalPressureRecord {
  regionId: number;
  herbGatheringPressure: number;  // gathered per day
  beastHuntingPressure: number;   // killed per day
  qiAbsorptionPressure: number;   // qi absorbed per day by cultivators
  contaminationLevel: number;     // 0..1
  veinDepletionRate: number;      // vein magnitude loss per day
}
```

---

## 10. Tier simulation (S4 / S2 / S0)

The ecology degrades by tier. The degradation is conservative (per doc 07 §6.1).

```
┌─────────┬────────────────────────────────────────────────────────────┐
│ Tier    │ Ecology behavior                                            │
├─────────┼────────────────────────────────────────────────────────────┤
│ S4      │ Individual beasts tracked (SpiritBeastIndividual).         │
│ (full)  │ Herb populations tracked per patch (10m grid).             │
│         │ Predation events simulated per encounter.                  │
│         │ Migration events tracked individually.                     │
│         │ Cost: ~1ms per beast per tick. Cap: 256 individuals per    │
│         │ region at S4 (overflow demotes the lowest-priority to S2). │
├─────────┼────────────────────────────────────────────────────────────┤
│ S2      │ Aggregate populations per species per region.              │
│ (aggr.) │ No individual beasts. Predation abstracted to per-day     │
│         │ population deltas. Migration abstracted to inter-region    │
│         │ flows. Yao tracked individually (they are named).          │
│         │ Cost: ~0.01ms per species per region per day.              │
├─────────┼────────────────────────────────────────────────────────────┤
│ S0      │ Frozen populations. No dynamics. The species counts at     │
│ (frozen)│ demotion are the counts on promotion (minus any events    │
│         │ logged against the region in the interim).                 │
│         │ Cost: 0 per tick.                                          │
└─────────┴────────────────────────────────────────────────────────────┘
```

**Promotion rule (S0 → S2 → S4).** When the player enters a region, the region's ecology promotes to S2 (aggregate populations rehydrated from the frozen counts + any events). When the player approaches a specific beast or herd, those individuals promote to S4 (instantiated from the aggregate population, with RNG-seeded individual state).

**Promotion cannot create favorable facts.** The S4 individuals instantiated on promotion must be consistent with the S2 aggregate: the count of S4 individuals cannot exceed the S2 population; the qi-magnitudes must be drawn from the S2 distribution; the species mix must match. If a contradiction is found (e.g., S2 says "0 peak beasts in region" but S4 promotion wants to spawn one), the contradiction resolves unfavorably (no peak beast spawns).

**Demotion rule (S4 → S2 → S0).** When the player leaves a region for `ecology_demotion_grace` (default 30 in-game days), the region demotes. S4 individuals are aggregated back into S2 populations (the aggregation preserves total counts, qi-magnitudes' mean and variance, and any named individuals' identities). Named yao are preserved as individual records even at S0 (they are named entities per doc 07 §6.1's conservation rule).

**Failure case — aggregation loss.** Aggregating S4 → S2 loses information (which specific beast was where). The simulator preserves: total population, age distribution, realm distribution, named individuals. It loses: exact positions, individual qi-reservoir values, current combat states. On re-promotion, these are re-seeded deterministically from the S2 distribution + the region's RNG stream.

---

## 11. Demography (mortal populations)

Mortal populations (villages, towns, cities) are tracked at a coarser resolution than ecology. Each settlement has a `DemographicRecord`:

```typescript
interface DemographicRecord {
  settlementId: number;
  population: number;
  ageDistribution: number[];   // buckets: 0-5, 6-10, 11-15, ..., 76-80, 80+
  sexRatio: number;            // 0..1 (fraction male)
  birthRate: number;           // per year
  deathRate: number;           // per year
  householdCount: number;
  grainReserveDays: number;    // how long the grain lasts at current consumption
  debtIndex: number;           // 0..1; aggregate household debt
  outMigrationRate: number;    // per year
  inMigrationRate: number;     // per year
}

interface DemographicEvent {
  type: 'birth' | 'death' | 'marriage' | 'migration' | 'famine' | 'plague' | 'war_loss';
  settlementId: number;
  tick: number;
  magnitude: number;
  affectedHouseholds: number[];
}
```

**Population dynamics.** Mortal population grows logistically with grain-reserve-dependent birth and death rates:

```
birthRate  = base_birth_rate * (grainReserveDays / 180)   // famine suppresses births
deathRate  = base_death_rate + (famine_factor if grainReserveDays < 60)
            + (plague_factor if plague_active)
            + (war_factor if war_active)
```

A settlement with `grainReserveDays < 60` is in famine; birth rate halves, death rate doubles. Below 30 days, death rate triples and out-migration spikes (the historical *liulang* / 流浪, wandering, pattern).

**Failure case — demographic whiplash.** A settlement that alternates feast and famine can produce population oscillations. The simulator smooths these with a 5-year moving average on birth/death rates; the raw rates are still tracked but the effective rates used in dynamics are smoothed. This prevents single-good-year baby booms from producing demographic impossibilities.

---

## 12. Determinism contract

Every ecology operation is a pure function of:

```
ecology_state(t+1) = ecology_fn(
  ecology_state(t),           // populations, individuals, fields
  seasonal_modulation(t),     // §5
  harvest_pressure(t),        // from cultivators and gatherers
  contamination_events(t),    // from deviations, tribulations, modao
  rng(regionSeed, tick)       // for migration rolls, encounter rolls
)
```

The function is evaluated per region per day (in-game time). At S4, additional per-tick (per-second) evaluation handles individual beast movement and encounters. All randomness flows through `rng(regionSeed, tick)` — no `Math.random()`.

**Hash verification.** `hashEcology(regionId, tick)` returns the SHA-256 of the CBOR-encoded `EcologyState` for that region. Two runs with the same seed produce identical hashes. A mismatch flags the divergent species, the divergent field, and the operation that introduced the divergence.

**Cross-region consistency.** Migration events move population from one region to another; the move is atomic (debit one region, credit the other in the same tick). The simulator logs the migration hash in both regions' state; a divergence between the two logs is a bug.

---

## 13. Rejected alternatives

- **Cellular automata for population dynamics.** Rejected: CA are visually appealing but produce emergent behavior that is hard to tune and hard to hash-verify. The logistic-with-predation ODE is simpler, more tunable, and produces the same cascade dynamics.
- **Full ecosystem simulation (every blade of grass).** Rejected: infeasible at 180+ villages × 10+ regions × 50+ species. The S2 aggregate model is the only feasible approach; S4 is reserved for the player's vicinity.
- **Random encounter tables (D&D-style).** Rejected: produces beasts from nowhere, breaking the food web. Beasts must come from populations; populations must be tracked.
- **Beast cultivation as a player-controlled system.** Rejected: beasts cultivate automatically (per §7). The player cannot control a wild beast's cultivation. Tamed beasts (rare, via oath) are a special case handled in doc 34 (companion system).
- **Yao as a separate species.** Rejected: yao are beasts that developed anchors; they are not a separate taxon. This preserves the food web's coherence (a yao was once a peak beast; it can still be preyed on by a higher-realm beast).
- **Seasonal events as scripted set-pieces.** Rejected: seasonal events must emerge from the solar-term modulators (§5) or they feel arbitrary. The modulators are the engine; the events are the work.

---

## 14. Open decisions (surfaced for review)

1. **The 256-individual S4 cap (§10).** Invented. May be too low for a dense spirit-herb garden the player is harvesting; may be too high for a sparse mountain. May need to be species-dependent.
2. **The 30-day demotion grace (§10).** Invented. May be too long (ecology state stales) or too short (player returns to find familiar beasts demoted).
3. **The 0.3 migration fraction (§6).** Invented. May produce too-rapid or too-slow migrations. Tuning needed.
4. **The 0.8 deviation risk threshold for beasts (§7).** Invented. May be too low (modao beasts too common) or too high (modao beasts too rare).
5. **The 5-life-event anchor threshold (§8).** Invented. The actual number of life events needed for a beast to develop a self-concept is empirical. May need to scale with the beast's realm.
6. **The smoothing window for demographic whiplash (§11).** Invented. 5 years may be too long or too short; real historical demographic smoothing is 3-10 years.

---

## 15. Doctrine compliance

- **Build the engine, not just the brake:** the prior corpus's ecology doc (14) was the brake (forbidding the monster manual, requiring food webs). This document specifies the engine: the food-web topology, the population dynamics, the cascade rules, the seasonal modulators, the tier degradation.
- **Make decisions; do not defer:** the trophic-level model, the population equation, the cascade propagation, the seasonal modulators, the tier mapping, the yao threshold are all decided. §14 are tuning parameters, not forks.
- **Cite the precedent:** Dwarf Fortress, RimWorld, Stellaris, Minecraft are named and their contributions specified.
- **Design for joy first:** the first hour's joy is seeing a spirit-herb garden, recognizing that the herbs are seasonal (Mangzhong is the harvest window), and choosing to gather now or wait. The ecology produces the texture of a world with a calendar.
- **Authorize the smallest end-to-end thing:** this document specifies enough to implement the Cangli Riverlands ecology (10 regions, 50 species, 1 spirit vein) at S2 with the player's current region at S4, as the first prototype.

This document is the ecology bible. It is the living-substrate engine the prior corpus was missing.
