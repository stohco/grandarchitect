# Real-Time World, Time Control, and Catastrophic Continuity — Draft v0.1

**Status:** foundation architecture under review; no game code authorized  
**Purpose:** make an enormous, causally persistent xianxia sandbox playable in real time without reducing the universe to nearby theater or permitting arbitrary unwinnable extinction  
**Consumes:** Grand Architect Charter, Research Graph Schema, Semantic Action Contracts, Mortal Year Atlas, Identity & Death Models, Qi Condensation Envelope, and the Mortal-to-Cultivator State Ledger  
**Locked product:** single-player; Three.js/WebGPU presentation target; hard pause is allowed; the protagonist receives no hidden physics exemption

---

## 0. Feasibility verdict

The design is feasible only if “simulate the universe” means **preserve canonical causality at every scale**, not “run every person, grain, particle, conversation, and continent at frame rate.”

The decisive separation is:

> the CPU world model owns truth; the scheduler owns time; the event graph owns causality; the GPU owns appearance.

Three.js/WebGPU can present the universe. It cannot be the authoritative universe. Scene objects, transforms, particles, shaders, deformation textures, animation clocks, physics callbacks, GPU completion order, and device-specific floating point may never decide canonical history.

Four things may change with hardware:

1. visual resolution;
2. animation smoothness;
3. how quickly accelerated simulation catches up in wall-clock time; and
4. how much nonessential presentation is visible.

Four things may not:

1. who acted and why;
2. which semantic event committed first;
3. resources, injuries, deaths, obligations, identities, ownership, and world topology; and
4. whether the protagonist or an isomorphic NPC lawfully survived.

This draft rejects two fake solutions:

- **nearby-only reality:** nothing happens until the player approaches;
- **brute-force reality:** every canonical detail ticks continuously whether it can affect anything or not.

The replacement is a multi-resolution, event-driven universe whose refinements are constrained by already committed history.

---

## 1. Canonical authority boundary

### 1.1 Authoritative state

`WorldState` is CPU-owned and revisioned. It contains typed entities, relations, processes, scheduled events, committed outcomes, aggregate constraints, latent-detail manifests, topology, and protected history.

The canonical event journal is append-only between deterministic compaction checkpoints. Every event has:

```text
EventId
BranchId
CanonicalInstant
Phase
CausalParents
SourceRevision
ReadSetWithRevisions
ReservedInputs
DeterministicWriteSet
RngStreamAndCursor
CommitStatus
ContributionAndAftermathLedger
```

The renderer receives immutable `RenderSnapshot` projections. Presentation interpolation may smooth between snapshots but cannot feed a transform, hit, visibility result, fracture, or GPU calculation back into canon without a separately validated CPU semantic action.

### 1.2 Renderer independence

Canonical hashes must match when:

- the renderer is disabled;
- frame rate changes among 30, 60, and 144 Hz;
- WebGPU falls back to WebGL2;
- visual quality changes;
- the window is hidden or backgrounded;
- a GPU device is lost and recreated; and
- particles, decals, audio, and noncanonical debris are disabled.

The current Three.js documentation describes `WebGPURenderer` as experimental and able to fall back to WebGL2. WebGPU devices may also be lost and their resources require recreation. Those facts make the authority boundary mandatory, not optional.

### 1.3 No GPU-to-canon path

GPU compute may accelerate disposable visual fields or produce advisory candidates, but canon accepts only deterministic CPU-validated results. Prohibited examples:

- a shader deciding who was hit;
- a GPU particle landing deciding where a fire starts;
- an occlusion query deciding whether an NPC canonically perceived an event;
- a deformation texture becoming the sole record of destroyed terrain; or
- device-specific reduction order deciding catastrophe casualties.

### 1.4 Canonical numeric profile — `CANON-NUM-v0.1`

CPU ownership alone does not guarantee determinism. No unprofiled JavaScript `Number`, platform transcendental, physics-engine float, or tier-specific precision may decide a canonical threshold.

`CANON-NUM-v0.1` requires:

| Domain | Canonical representation |
|---|---|
| instants/durations | signed epoch plus unsigned 128-bit integer ticks; exact comparison |
| counts, IDs, sequence numbers | bounded unsigned integers with declared width |
| signed stocks/flows/work/distance | typed 64- or 128-bit fixed-point integers with a schema-declared unit and scale |
| ratios/efficiencies | reduced rationals or fixed-point integers with exact conversion rule |
| probabilities | unsigned 64-bit RNG output compared to an unsigned 64-bit threshold; no float conversion |
| hierarchical coordinates | fixed/integer coordinates inside versioned reference frames |
| interval bounds | closed/open endpoints using the same typed numeric profile |

Normative arithmetic rules:

- unit conversion uses exact reduced rational factors before one final quantization;
- division and quantization round to nearest with ties to even unless an action contract explicitly requires conservative floor/ceiling;
- overflow is a typed fatal validation error, never wraparound; saturation occurs only when a declared physical cap is itself the semantic result;
- NaN and infinity do not exist in canonical state;
- transcendental behavior uses a versioned deterministic integer/rational approximation with pinned coefficients and error interval, or remains presentation-only;
- canonical integrators pin method, step/checkpoint schedule, rounding after each operation, threshold-isolation rule, and output quantization; and
- S0–S4 conversion changes aggregation only, never the numeric representation or truth of a protected predicate.

Every numeric schema ships cross-browser, cross-architecture, worker-count, and S-tier golden vectors containing boundary, negative, overflow, tie-rounding, interval, collision, and arrival-time cases. A result outside the approved error interval blocks commit rather than choosing whichever side of a threshold the local machine produced.

---

## 2. Clock hierarchy

### 2.1 Typed clocks

| Clock | Meaning | May change canon? |
|---|---|---|
| `CanonicalInstant` | exact ordered position in world history, represented by epoch plus integer units | yes; this is canonical time |
| `SimulationTarget` | instant the scheduler is currently resolving toward | only through committed events |
| `SemanticDuration` | authored duration and milestones of an action or process | yes |
| `PresentationTime` | animation, UI, audio, cloth, particles, camera smoothing | no |
| `WallTime` | performance measurement and input latency | no |

Canonical time never derives from `requestAnimationFrame`, browser timers, OS time, reading speed, monitor refresh, or floating `deltaTime`. Browser animation callbacks may pause in background tabs and timers may be throttled, while xianxia chronology may span intervals that lose precision in one floating value. Canon therefore uses integer ordering with explicit epochs.

### 2.2 Event order

After causal dependencies are validated and the ready set is constructed, canonical events sort by:

```text
(CanonicalInstant, Phase, StableEventId)
```

Authored phases initially include:

1. prior commitments arriving;
2. perception and warnings;
3. interruption/precondition invalidation;
4. action milestones;
5. damage/transformation;
6. identity, legal, and ownership consequences;
7. scheduling of future consequences; and
8. snapshot/publication.

Same-time events use stable IDs or an explicitly coupled reducer. Promise resolution, worker completion, array order, object insertion, GPU ordering, and queue partition never break ties.

### 2.3 Zero-time closure

An event created at the same instant must:

- advance to a later authored phase;
- join a declared commutative/associative reducer; or
- consume a bounded closure generation and then defer or fail visibly.

No reaction, formation, counter, notification, or institutional response may generate an infinite zero-time loop. Reaching the closure limit is a specification defect with a reproducible event trace, not permission to discard events.

### 2.4 Live-input admission — `INPUT-BARRIER-v0.1`

Live input is an external cause and therefore becomes part of history through an explicit gateway. The UI submits:

```text
InputIntent {
  InputSeq
  BasedOnSnapshotRevision
  DisplayedCanonicalInstant
  InputSchemaVersion
  Payload
  RebasePolicy
}
```

The input gateway's `LowerBoundOnNextEvent` is always the **earliest currently open or next eligible input-commit barrier** under the current mode. A barrier becomes closed only after its input eligibility has ended and every required acknowledgement/lease rule below is satisfied.

Mode-scoped schedules:

- `Active`: the simulation publishes a revision at each fixed `ActiveInputBarrier` and may prepare—but not commit—past the one open live-input window. The gateway supplies `Intent | NoInput | Pause`; the accepted intent is stamped at that window's assigned barrier.
- `HardPause` / `DialogueFocus`: the safe horizon is the current committed instant. A chosen action opens one explicit commit barrier; reading creates none.
- `Advance`: starting Advance commits one `AdvanceAuthorizationLease` containing the standing order, authorized information view, stop policy, maximum target instant, and lease ID. Internal semantic barriers may then batch without UI acknowledgements. The gateway advertises the next deterministic `CatchUpPublicationBarrier` as the earliest eligible instant for an asynchronous `Pause | Cancel`.
- When Pause/Cancel arrives during Advance, it is pending external input and is stamped at the first catch-up publication barrier not already published when receipt is registered. It is never retroactive. The stamped barrier is journaled, so replay does not consult wall time.

Transport, render, or worker latency cannot move an Active intent to another barrier because the authoritative worker cannot close its one open window before acknowledgement. Advance liveness does not require one round trip per internal barrier because the authorization lease closes that input class until a deterministic catch-up publication point.

Acceptance rules:

- an intent based on the current published revision is accepted at that window's assigned barrier;
- a stale but semantically rebaseable planning intent may move only under its declared `RebasePolicy`, with the new barrier shown to the player;
- a stale reaction, target, consent, timing, or inventory mutation whose opportunity changed is rejected and the current snapshot republished;
- a pause request stops at the next transaction barrier reachable from the open input window; and
- the stamped intent journal—not wall-arrival timestamps—is replayed.

Wall time determines when the live player supplies an external intent, just as the player's chosen command determines history; it never supplies the canonical timestamp itself. Replaying the same stamped intent log under delayed transport, different frame rates, worker counts, and render backends must produce identical event order and hashes. `MaxLiveRunAhead` in Active is one unclosed input barrier. In Advance it is the next published catch-up barrier under the signed lease; catch-up computation may prepare further immutable candidates but cannot commit past that gateway lower bound until pending input is sampled and the next bound is advertised.

### 2.5 Conservative safe-time frontier

Every logical process—actor, institution, continuous solver, wavefront, input gateway, generator, and external transaction—advertises a certified `LowerBoundOnNextEvent` under its current state and lookahead contract.

```text
GlobalSafeHorizon = minimum of every active process lower bound
```

The scheduler may commit only events proven earlier than the safe horizon, or events at the horizon after all capable sources certify that no smaller/equal-priority event remains. Analytical threshold intervals and wavefront arrival bounds must refine until the relevant ordering is proven before commit.

Event validity requires:

- every parent instant is earlier than the child, or at the same instant with a strictly earlier phase/dependency;
- the dependency graph is acyclic;
- same-time ready events are reduced by stable Kahn topological order, with `(Phase, StableEventId)` as the deterministic ready-set tie-break;
- no process may enqueue an event earlier than or equal to the already committed frontier except a same-instant child in a still-open later phase; and
- workers return immutable candidates plus a new lower-bound certificate; only the authoritative scheduler commits.

A late event is a fatal, reproducible specification defect containing the process state, advertised lower bound, discovered event, and committed frontier. The engine never repairs it by rollback, event deletion, or retroactive history mutation. The live-input gateway participates as a process whose lower bound is the earliest currently open or next eligible mode-scoped input-commit barrier, never a barrier already closed.

---

## 3. Player-facing time modes

### 3.1 Default modes

| Mode | Canonical time | Default use | What the player may do |
|---|---:|---|---|
| `HardPause` | `Δt = 0` after current atomic barrier | pause key, menus, codex, inventory browsing, settings, safe conversation deliberation | inspect the frozen known-state snapshot, plan, adjust accessibility/presentation, choose a future commitment |
| `Active` | normal semantic scheduler | movement, labor, exploration, combat | commit actions in real time; presentation follows canonical results |
| `DialogueFocus` | `Δt = 0` while reading/choosing | nonhostile interaction by default | read known text and choose an utterance/action; the selected act then has canonical duration |
| `TacticalFocus` | optional presentation slowdown while canonical rules remain explicit | accessibility or high-information moments | never changes actor caps, event order, or outcomes by itself |
| `Advance` | scheduler resolves toward a player-selected condition/date | wait, sleep, work shift, cultivation, craft, long travel | provide standing orders, resource floors, risk tolerance, and stop conditions |

Hard pause remains available even in combat because this is a single-player game. Removing pause would not make the universe more authentic; it would make input speed and accessibility part of canonical combat power.

If `TacticalFocus` is retained, it slows how quickly the live input gateway closes successive canonical barriers by a disclosed rational wall-pacing factor; it does not enlarge a canonical action, change a solver step, slow only enemies, or use floating physics `timeScale`. The stamped input/event log remains replayable without wall time. Its extra deliberation is an explicit single-player accessibility/difficulty affordance, not a protagonist law ability.

### 3.2 Frozen knowledge, not frozen omniscience

Hard pause exposes the information the protagonist had lawfully acquired at the barrier. It does not perform new canonical sensing.

Free while paused:

- read previously observed inventory, techniques, relationships, maps, schedules, and evidence;
- compare known facts;
- change camera presentation within already revealed information;
- remap controls and accessibility;
- compose a planned action or dialogue response; and
- save under the selected save policy.

Requires a semantic commitment with time/cost:

- equip or remove gear;
- consume medicine or items;
- begin crafting, treatment, cultivation, divination, appraisal, or formation work;
- issue an order or transmit information;
- search a container or inspect a newly exposed angle;
- change a technique's physical configuration; and
- queue movement that another actor could interrupt.

If a projectile is one millisecond away, the player may think for an hour of wall time. They may not equip five treasures, drink ten pills, scan the battlefield, and reorder the body at zero canonical cost.

### 3.3 Practical stillness in conversations

Nonhostile dialogue defaults to hard deliberation pause. Ambient breathing, cloth, particles, or camera motion may continue in `PresentationTime`, but no actor ages, moves, attacks, completes work, starves, or receives new knowledge while the player reads.

Selecting a line does not “charge seconds afterward.” It creates a semantic speech task. Only words actually delivered and heard become canonical. Fire, attack, departure, death, consent withdrawal, language delay, or catastrophe arrival may interrupt the utterance at an exact milestone.

An optional continuous-conversation mode may exist for players who want it. It is not the default balance assumption.

---

## 4. Semantic action transaction

Every canonical action, including speech, has:

```text
Prepare → CommitStart → ActiveMilestone[] → Complete → Recovery
                     ↘ Interrupt/Abort/PartialResult
```

Required fields:

- actor and authority;
- typed targets;
- start instant and duration model;
- input reservations and tool/capability contributions;
- preconditions revalidated at prepare and material milestones;
- perception available to the actor;
- interrupt sources and reaction windows;
- partial-result semantics;
- costs already spent versus refundable reservations;
- observables, witnesses, noise, and evidence;
- recovery and cooldown; and
- deterministic transaction/branch IDs.

Examples:

- A long sentence can be cut off; only its delivered prefix is heard.
- Changing robes under attack exposes the body during authored milestones.
- Swallowing a pill requires taking it out, bringing it to the mouth, swallowing, and later assimilation; menu selection alone does none of these.
- A five-hour cultivation session consists of preparatory choices and semantic checkpoints; it is not 18,000 one-second animation ticks.

---

## 5. Waiting, travel, cultivation, and accelerated time

### 5.1 Acceleration changes throughput, never law

Time acceleration asks the scheduler to resolve toward a later `SimulationTarget`. It omits presentation frames, not causal events. The protected result must equal ordinary semantic-event execution.

Continuous processes use one of:

- analytical evolution with scheduled threshold crossings;
- bounded fixed-step integration whose checkpoint size is part of the contract;
- discrete semantic milestones;
- conservative wavefront arrival events; or
- a process-specific closed-form/aggregate transition with a differential oracle.

Multiplying physics `dt` by 1,000 or replaying every missed render frame are both forbidden.

### 5.2 Standing orders

Advance mode executes only policies the player explicitly authorizes. A standing order may state:

- intended activity and destination/finish condition;
- food, water, qi, health, money, and material floors;
- route and shelter preferences;
- accepted hazard classes and confidence threshold;
- who may interrupt;
- whether to aid, hide, negotiate, flee, or merely stop for ambiguous events;
- cultivation stop signs;
- obligations that may not be missed; and
- maximum canonical duration.

Automation cannot infer the player's values when two obligations conflict.

### 5.3 Earliest undecided interrupt

Acceleration stops at the earliest **decision-ready information barrier** visible through the standing order's `AuthorizedInformationView` that:

- makes a standing-order invalidation lawfully known, or causes an attempted routine milestone to fail in an observable way;
- presents a lawfully perceived materially new choice outside the authorized policy;
- crosses a declared floor as measured by an authorized bodily sense, inventory check, worn instrument, companion report, scheduled inspection, or other signed monitoring interface;
- is lawfully perceived by the protagonist or an authorized standing-order agent as threatening the player or protected dependents and still leaves a reachable undecided response;
- delivers a warning above the chosen threshold to the protagonist or authorized agent through a canonical perception/testimony/instrument channel;
- lawfully reveals a change to destination, teacher, consent, method, route, body, or legal access, or produces an observable action failure caused by that change;
- completes the requested goal; or
- cannot be resolved without protagonist input.

The scheduler first commits the exogenous event and every causal perception/transmission event required to make the information available, then freezes before the protagonist's next response or before an authorized routine chooses outside policy. The frozen state therefore contains the warning, observed effect, changed body state, or testimony that justifies the interruption.

Every predicate is evaluated over the authorized agent's canonical information state, including its uncertainty and scheduled check frequency, never omniscient `WorldState`. An objective hidden health/qi/contamination/ownership/access crossing may change ongoing processes, but it cannot halt or publish itself until a lawful symptom, instrument reading, testimony, inspection, action failure, incapacity, or death/continuation event occurs. A lawfully worn monitor may interrupt because its reading is canonical evidence; the same hidden change without that interface may not.

An undetected poison, hidden assassin, unreceived warning, concealed formation failure, unseen theft/revocation, or unseen catastrophe front is **not** an Advance-mode interrupt oracle. It resolves exactly as at 1× and may first halt acceleration only through the observable channels above. Repeated short advances cannot reveal whether an interruption-free interval was secretly dangerous.

### 5.4 Causal-equivalence oracle

For the same branch, inputs, seed manifest, and stopping policy:

```text
normal semantic stepping
= accelerated processing
= direct advance-until-event
= save/reload halfway
= different work budgets and worker counts
```

Equality means identical protected event order, first interrupt, state hash, latent-detail manifests, and answers to every canonical query. Storage layout, processing order before the stable commit barrier, and presentation may differ; generated facts may not.

Tier/acceleration equivalence is a **future-refinement bisimulation**: after any matched pair of runs, applying the same lawful observation, promotion, naming, travel, interaction, or exhaustive-refinement query must materialize the same people, casualties, owners, items, histories, and opportunities from the same manifest. “Unnamed so far” never permits execution mode to decide who later exists.

---

## 6. Simulation resolution is not rendering LOD

The previous `F0–F4` vocabulary is retained only as a migration alias. The normative axes are separated:

1. `S0–S4 SimulationResolution` — how canonical processes resolve;
2. `R0–R5 RenderLOD` — how much appearance is drawn;
3. `P0–P3 PersistenceClass` — which facts may never aggregate away; and
4. `N0–N3 CausalSignificance` — whether an entity/process participates in named intentions, obligations, identity, or open investigations.

A distant visible planet may be `S0/R5`. A hidden nearby assassin may be `S4/R0`. A centuries-old grave involved in an oath may be `S0/R0/P3/N3`.

### 6.1 Simulation tiers

| Tier | Resolution | Protected behavior |
|---|---|---|
| `S0 Chronicle` | long-horizon event graph and bounded aggregates | stable histories, major commitments, named/unique exceptions, world and catastrophe envelopes |
| `S1 Strategic` | institutions, settlements, routes, resources, ecology and faction processes | conservation, territorial intent, projects, migrations, deterrence and warnings |
| `S2 Regional` | households/cohorts, named agents, weather/ecology cells, local markets and conflicts | scheduled choices and individual exception ledgers |
| `S3 Encounter` | individual actions, bodies, inventories, perception, navigation and local topology | exact semantic outcomes at interactable scale |
| `S4 Immediate` | high-frequency canonical contacts for combat, precision work and catastrophe frontier | fixed canonical action steps; no frame-dependent truth |

### 6.2 Promotion and latent detail

Every coarse cell or cohort stores:

- latent-detail seed and generator/schema version;
- hard totals and conserved stocks;
- named entities and unique objects;
- observations already made;
- casualties, births, claims, ownership, routes, scars, and warnings;
- event history and pending commitments;
- uncertainty/error bounds; and
- degrees of freedom still unresolved.

Promotion fills only unresolved degrees of freedom. It cannot contradict a silhouette the player saw, create loot beyond the coarse stock, resurrect aggregate casualties, invent a clear road after a recorded collapse, or erase a witness. Newly observed detail becomes pinned.

Promotion uses hysteresis and prefetch rings. A catastrophe frontier never forces an entire planet to `S4`.

### 6.3 Demotion

Before demotion, unfinished individual actions commit their current milestone or remain as pending semantic transactions. Named bodies, injuries, intent commitments, debts, warnings, custody, traces, consent, and player-relevant interrupts become exceptions to the aggregate.

### 6.4 Budget invariance

Simulation work, rendering, streaming, and UI have separate wall-time budgets. Exhaustion causes the worker to yield and resume from the exact frontier. It may slow acceleration or reduce visuals; it may not delete events, reduce casualties, move a deadline, choose a cheaper algorithm with different semantics, or demote something mid-transaction.

---

## 7. Real-time performance contract

### 7.1 Initial experience targets

These are release targets to benchmark, not engine facts:

| Metric | Target |
|---|---|
| input-to-visible acknowledgement | ≤50 ms p95 outside loading barriers |
| main-thread long tasks during play | none above 50 ms in steady state |
| presentation | 60 fps target; graceful 30 fps quality floor on supported minimum hardware |
| canonical simulation | never blocks UI/render main thread |
| pause response | acknowledgement ≤50 ms p95 and ≤100 ms maximum on supported minimum hardware; uncommitted solver work may be discarded, committed history may not |
| catastrophe onset | no synchronous mass promotion or first-use shader compilation spike |
| accelerated catch-up | progress visible; player may cancel at safe journal barrier; no event loss |

### 7.2 Runtime shape reserved for later implementation

The research architecture requires:

- a dedicated authoritative simulation worker;
- optional deterministic workers that compute immutable intents in parallel;
- one stable sort/reduce barrier that alone commits results;
- revisioned snapshot buffers sent to presentation;
- structured-clone operation when shared memory is unavailable;
- instanced/procedural render proxies rather than one scene object per canonical entity;
- no per-frame GPU readback;
- prewarmed catastrophe presentation pipelines; and
- headless canonical simulation for tests.

This is an architectural constraint, not permission to start coding.

### 7.2.1 Cooperative work and cancellation bound

“Atomic” describes commit visibility, not permission to compute forever. Every solver, generator, compactor, promotion, path query, and catastrophe reducer is resumable from a deterministic cursor.

- A canonical work chunk contains at most 2,048 profiled primitive operations before storing a cursor and checking pause/cancel.
- On supported minimum hardware it also yields after 4 ms of wall work if that occurs first; wall-time yielding changes only chunk boundaries, never ordering or results.
- No nonpreemptible prepare/reduce/commit barrier may exceed the 50 ms long-task ceiling; oversized write sets use a prepared Merkle root and bounded deterministic commit pages whose visibility changes only at the final root swap.
- Pause prevents new chunks from starting, discards or retains uncommitted candidates according to their transaction contract, and publishes the last committed barrier.
- Advance cancellation stops at the next safe-horizon journal barrier and retains its exact scheduler/solver frontier.

Worst-case benchmarks include million-cell fronts, world generation, S0↔S4 promotion, archive compaction, route invalidation, and world-to-remnant remapping under CPU throttling—not merely steady-state play.

### 7.3 Prohibited lag traps

- simulation on the UI/Three.js main loop;
- one microtick per offscreen second;
- one canonical object per grain, raindrop, particle, or unnamed distant victim;
- synchronous whole-region procedural generation;
- uncontrolled zero-duration reactions;
- worker result order deciding canon;
- per-frame save serialization of the entire universe;
- GPU readback as routine gameplay logic;
- mass scene-object creation for armies, forests, debris, or stars; and
- using event-budget exhaustion as a game-rule shortcut.

---

## 8. Spatial continuity across extreme scale

Canonical locations use hierarchical reference frames:

```text
cosmological domain
→ sector/route complex
→ system barycentric frame
→ world-body frame
→ region/remnant frame
→ local cell
→ local position
```

CPU canonical coordinates use the tier-independent fixed/integer hierarchical representation in `CANON-NUM-v0.1`. Aggregation never changes protected coordinate predicates. Three.js receives disposable camera-relative local floats.

Destroying or dividing a world creates new remnant frames and an explicit old-to-new location map. Old coordinates remain historical anchors. “The ancestral hall was here” must remain meaningful even if “here” is now a debris trajectory rather than a surface point.

---

## 9. Catastrophe ontology

### 9.1 Threat classes

These causes must not collapse into a generic disaster roll:

1. deliberate extermination;
2. conquest or extraction;
3. punitive strike;
4. accidental transit, collision, or failed technique;
5. cosmic-beast feeding, migration, nesting, or territorial behavior;
6. slow ecological, qi, stellar, or infrastructural depletion; and
7. civil war, sabotage, or captured authority inside existing defenses.

### 9.2 Impact scale

| Scale | Primary consequence envelope |
|---|---|
| `K0 Personal` | body, room, single vehicle/tool |
| `K1 Site` | household, worksite, formation node, street |
| `K2 Settlement` | village, district, town, ship/community |
| `K3 Region` | watershed, province-scale route complex, ecosystem |
| `K4 Continental` | continental topology, climate, polities, seas/routes |
| `K5 World-body` | planet/world-body habitability or physical continuity |
| `K6 System/plane` | star system, plane, world cluster, major cosmic route |
| `K7 Cosmological-domain` | multiple systems/planes or ratified world-law domain |

Scale is not a combat level. A K5 event may be slow, preventable, politically induced, or survivable in protected regions. A K1 soul or identity attack may be more dangerous to the protagonist than a distant K5 event.

### 9.3 Catastrophe is a process

A catastrophe requires:

- cause and causal history;
- actor/phenomenon and intent where applicable;
- capability and contribution certificate;
- origin, path, propagation geometry, and clocks;
- observability, concealment, false positives, and warning signals;
- hazard-envelope certification and arrival-time intersection calculation;
- intervention windows and attainable response layers;
- opponents, counterforces, deterrence, and institutional latency;
- conservation and authority rules;
- prepare/commit/aftermath transaction boundaries;
- identity, location, ownership, route, ecology, and law consequences; and
- persistent remnant/recovery state.

“A hypothetical K4+-capable cultivator randomly becomes evil and deletes a continent” fails. Random variates may influence stress, timing, target choice among motivated alternatives, mistakes, or whether deterrence succeeds. They may not create world-erasing intent without goals, knowledge, opportunity, and accepted consequences.

---

## 10. Catastrophe contract

Every K3+ event and any lower event capable of topology/identity mass change uses `CatastropheContract-v0.1`.

```text
CatastropheId / BranchId / SchemaVersion
ThreatClass / ImpactScale
SourceActorsAndPhenomena
IntentCommitmentAndDecisionEvidence
CapabilityAndContributionLedger
Origin / StartInstant / TopologyRevision
PropagationWavefronts
HazardEnvelopeCertificate / IntersectionCertificate[]
SignalsAndDetectionChannels
WarningsDeliveredAndBelievedByAudience
InterventionWindowsAndReservations
Defenses / Counteractors / Deterrence
PrepareHash / CommitBarrier / AbortOrDeflectionRules
EntityAndLocationRemap
SurvivalDeathMissingTransformationOutcomes
MaterialQiMomentumAndAuthorityAccounting
EcologyClimateAtmosphereOceanRouteAftermath
OwnershipLawDebtOfficeRiteAndObjectiveRewrites
FutureWavefronts / Recovery / Investigation / Memorial
SaveBranchAndCompactionBindings
```

### 10.1 Hazard-envelope and intersection certificates

Before source commitment, the catastrophe pins a `HazardEnvelopeCertificate`, not a frozen list of future victims:

- source/topology revision and hierarchical space-time cells/routes/frames the fronts may lawfully reach;
- arrival-time/intensity intervals and refinement obligations;
- cohort conservation commitments and latent-detail manifests by covered range;
- protected reference ranges represented by hierarchical Merkle commitments rather than one global entity hash;
- shelters, gates, formations, vehicles, and custody/transport interfaces that can alter later intersection; and
- confidence/error bounds for regions not yet refined.

At each exact frontier arrival, an `IntersectionCertificate` resolves membership against revisioned trajectory, occupancy, birth/death, embodiment, shelter, vehicle, possession/merge/resurrection, and custody states at the declared cut instant. It records:

- front/cell/topology/occupancy revisions;
- deterministic boundary rule for an entity exactly on a cell, vehicle, shelter, or time edge;
- entrants, exits, evacuees, births, deaths, transfers, and carried entities since the prior crossing;
- named/unique entities resolved individually;
- aggregate cohorts with conserved before/after counts and latent seeds;
- applied defense/remap and outcome transactions; and
- the Merkle range proofs touched by the intersection.

An entity may intersect different front components more than once only when its trajectory and the front topology entail distinct crossings; stable crossing IDs prevent duplication. No entity disappears merely because its scene unloads, and no precommit snapshot freezes a living population in place.

### 10.1.1 Topology-write recertification

Every prepared topology write—opening/closing a gate, severing/creating a route, moving a boundary, forming a remnant, changing a shelter interface, or altering a law corridor—atomically queries the active-process spatial index for fronts and solvers whose reachability, travel time, attenuation, or lower bound may change.

Before the topology revision can commit, each impacted process must do one of:

1. invalidate and recompute its `HazardEnvelopeCertificate` and `LowerBoundOnNextEvent` against the proposed revision, extending Merkle range commitments for newly reachable cells;
2. prove with a versioned nonimpact certificate that its existing envelope/bound remains valid; or
3. join the topology change in one coupled interaction transaction when their same-instant effects cannot be independently ordered.

The scheduler installs the topology revision and all replacement certificates in one atomic root swap. If recomputation cannot finish inside the prepared transaction, the topology write remains uncommitted and resumable; history does not advance past it. A newly opened shortcut can therefore advance a future arrival only after the safe horizon has been lowered before commit. A closed route cannot leave stale reachable cells or reservations. No topology change may reveal an event in the already committed past.

### 10.2 Transaction phases

```text
DormantCause
→ SourceIntentOrPhysicalCommitment
→ ObservableApproach
→ DefenseAndIntervention
→ PropagationAndLocalFrontierImpactCommit[]
→ LocalTopologyTransition[]
→ GlobalRemnantFrameCommitWhenPredicateMet
→ ImmediateAftermath
→ LongRecoveryOrFinality
```

Source commitment means the actor/phenomenon can no longer withdraw the emitted cause without a new counterevent; it does **not** alter a distant target early. Each local impact and topology transition commits at its causal arrival/severance instant. Later fronts bind to the new topology revision. A global remnant reference frame commits only when the declared physical/topological predicate is actually met, so distant observers, travelers, warnings, and defenses can act during propagation against the then-current world.

The player can save at any barrier under the save policy. Reload restores the same source commitment, seed streams, warnings, queues, hazard envelope, committed intersection certificates, and transaction phase. It cannot reroll the aggressor, duplicate evacuees, restore spent formation fuel, or create two remnant worlds sharing one identity.

---

## 11. Conservative catastrophe propagation

### 11.1 Typed wavefront

Each destructive, protective, material, qi, thermal, pressure, debris, information, or law effect travels as a typed wavefront with:

- source certificate;
- origin and start instant;
- propagation topology and lawful speed;
- energy/mass/qi/information/authority budget as applicable;
- arrival time and intensity bounds per coarse cell;
- attenuation, reflection, branching, occlusion, and transformation rules;
- protected named targets;
- local refinement boundary conditions; and
- persistent aftermath fields.

The solver advances frontier crossings, not particles or voxels. Named, unique, causally active, or player-adjacent entities resolve individually when the frontier reaches them. Ordinary unnamed populations/material resolve through bounded cohorts whose totals and latent seeds remain pinned.

### 11.2 Overlap

Two fronts meeting in one cell must be:

- combined by a declared associative/commutative reducer;
- ordered by causal instant and stable phase; or
- promoted to one coupled-interaction event.

Queue insertion order cannot decide whether fire consumes a refuge before flood arrives, whether two formations cancel, or whether debris breaches an already weakened barrier.

### 11.3 Local physical spectacle

Near the player, canonical frontier conditions generate detailed fracture, debris, fluid, atmosphere, terrain, technique, audio, and VFX presentation. Detail satisfies coarse boundary conditions; it does not resimulate the continent.

For example, a continental rupture may canonically be represented by several evolving fault/topology regions, energy/qi ledgers, travel discontinuities, sea/atmosphere effects, casualty cohorts, and named exceptions. Only the player's current interaction cone receives contract-relevant local fracture detail.

---

## 12. Why inhabited mortal worlds survive

Long-lived mortal civilization is evidence that annihilation is rare enough to permit it. The universe therefore needs a **layered equilibrium**, not an invisible authorial ban.

### 12.1 Embodiment and compatibility burden

A high-realm body, qi circulation, perception, or authority may depend on conditions absent from a mortal world. Full descent may require an anchor, stored support, capability shedding, signature exposure, or bodily risk.

This is typed incompatibility, not a universal “realm suppression” field. Projections, proxies, artifacts, local collaborators, brief strikes, or compatible techniques can still be dangerous.

### 12.2 Maintained world formations

A `formation` is constructed qi/law infrastructure with nodes, sources, custodians, inspections, repair history, jurisdictions, response thresholds, and finite capacity.

World formations may:

- detect and classify coarse threats;
- disperse or redirect some force;
- harden selected regions;
- quarantine breaches;
- open limited refuges/routes;
- preserve attacker evidence; and
- send distress calls.

They fail through maintenance debt, captured authority, sabotage, insider access, simultaneous load, false classification, exhausted sources, incompatible threats, or protecting one region at another's expense. They never have infinite coverage or output.

### 12.3 Sect, clan, and lineage deterrence

A sect is an organization; a clan is a kinship-political institution; a lineage is transmission/authorization. They may overlap but are not synonyms.

Mortal worlds can be recruitment grounds, ancestral homes, treaty assets, archives, markets, refuges, pilgrimage sites, ecological reservoirs, or legitimacy sources. An extinction attack exposes signatures and invites retaliation against holdings, routes, students, allies, contracts, and reputation.

Protection remains unequal and political. Frontier worlds, extinct protectors, disputed treaties, and exploited dependencies are real failure cases.

### 12.4 Territorial balance

High-order actors and cosmic species possess ranges, borders, corridors, nesting sites, rivals, and exposed assets. A strike can reveal a technique, open a rear territory, consume irreplaceable support, or provoke a coalition.

Territorial claims require sensors, witnesses, response latency, and enforcement. A glowing ownership map is not enough.

### 12.5 Ascension and carrying-capacity ecology

`Ascension` means a specified transformation or migration, never moral promotion or plot despawning. High-realm bodies may require densities, materials, spatial pressure, ecology, or timescales a mortal world cannot support. Remaining may starve the visitor or destroy a habitat/resource they value.

Upper environments also contain their own pressures and opportunities, so powerful actors have reasons not to spend eternity bullying low worlds.

### 12.6 Nonmoral causal footprint

If ratified, catastrophic acts leave durable, attributable signatures, maintenance burdens, route damage, hostile attention, or binding to aftermath. This is ordinary causality, not karma. It does not judge morality, guarantee justice, or strike instantly.

### 12.7 Optional modules, not baseline excuses

Karma, fate, destiny, Heaven, mandate, divine office, and covenant protection remain optional until their ontologies are researched and selected. None may serve as a placeholder for “the author saves the protagonist.”

### 12.8 Stability calibration

Long no-player simulations must measure:

- inhabited-world survival distribution;
- frequency and cause mix of K3–K7 events;
- protection maintenance and failure rates;
- false warnings and ignored warnings;
- successful deterrence versus merely delayed retaliation;
- evacuations, diasporas, abandoned worlds, partial ruins, and recovery;
- whether high-power aggression arises from coherent objectives; and
- whether the authored number and age of civilizations are statistically plausible under the generated hazard ecology.

If civilizations survive only because catastrophe generation secretly stops offscreen, the model fails.

---

## 13. High-power actor decision contract

A cultivator capable of K4+ action remains an agent, not a weather roll. A destructive decision requires:

```text
goal
target model and uncertainty
knowledge source
available capability profile
travel/access path
preparation and opportunity
expected gains
resource, bodily, causal and political costs
deterrents and counteractors
alternatives considered
commitment threshold
concealment/exposure plan
aftermath intentions
```

Power does not imply perfect knowledge, instant travel, universal compatibility, immunity from rivals, or irrational indifference to everything accumulated over a long life.

Valid catastrophe motives may include survival, territorial necessity, extraction, doctrine, revenge, fear, hostage logic, error, coercion, civil war, or preventing a greater threat. None guarantees moral complexity by itself; causal specificity does.

Prohibited triggers:

- player entered the region;
- player crossed a level threshold;
- trivial insult automatically escalated to extinction;
- camera observed the actor;
- random “evil mood” roll; and
- content director wants spectacle now.

---

## 14. Cosmic beasts

A cosmic beast is a persistent organism/person/process complex, not an HP bar with an aggro radius.

Required ecology:

- origin and development;
- energy/material/qi needs;
- feeding substrate;
- reproduction or creation;
- migration and territorial signals;
- senses, attention, memory, learning, and communication;
- body-region topology and local wound semantics;
- symbionts, parasites, disease, competitors, predators, and prey;
- nesting, rest, and avoidance;
- relation to routes, formations, worlds, stars, and law environments;
- sapience/personhood evidence where applicable; and
- response to scarcity, displacement, injury, industry, and climate.

A beast brushing a planet must have a prior trajectory. Its gravitational/qi/material fields create signals at lawful propagation speeds. A damaged migration corridor, redirected food source, juvenile error, starvation, nesting cycle, upper-world industry, or pursued flight may place a world at risk.

The beast neither spawns for the protagonist nor waits for them. Simulating without the player, at S0, hidden, during travel, after save/load, and at local S4 must preserve its route and evidence-dependent attention.

Low-realm affordances include observe, hide, warn, evacuate, repair a corridor, redirect a dependency through preparation, bargain if sapient, preserve evidence, help a wounded dependent, flee, or accept loss. Mortal chip damage against a world-scale body is not mandatory agency.

---

## 15. Playability without hidden immunity

### 15.1 Agency Horizon — game admission policy

The recommended default campaign mode uses a signed `OpeningAgencyHorizon`. At initial-world selection, a candidate containing an already committed K4+ extinction inside the configured interval is admitted only with a finite `AdmissionProof-v0.1` for the protected starting scope; otherwise it is conservatively rejected.

This is a scenario-admission rule, not fictional physics:

- it applies to the starting population/region, not `isPlayer`;
- it does not cancel an event after world creation;
- it does not move threats away from the camera;
- it does not prevent future actors from causing catastrophe;
- it does not guarantee victory or permanent world survival; and
- its duration is a playtested parameter, not yet canon.

The policy guarantees a playable opening, not protagonist immortality.

The population/region K4+ filter is supplemented by a **scale-independent starting-viewpoint admission rule**: every candidate continuant who could be selected as the opening viewpoint must have one concrete replayable witness plan that either (a) survives the opening interval, (b) enters a disclosed identity-model viewpoint continuation, or (c) permits a consequence-changing action followed by an explicitly disclosed playable successor. Merely detecting danger or choosing how to die is insufficient. If no witness exists, generation selects another starting continuant/history; it does not alter the lethal event or the actor's physics. The rule applies identically to any continuant selected as viewpoint and covers committed or uncommitted K0–K7 threats. Only an explicitly chosen `Doomed Prologue` mode may waive it, and that mode discloses the intended viewpoint transition before play.

`AdmissionProof-v0.1` is deliberately finite:

```text
fixed opening CanonicalInstant interval
fixed protected-scope IDs
finite certified response-family/action vocabulary
maximum decision depth and action count
state-known observations available at each step
one exact action/interrupt/transaction witness trace
resulting survival/continuation/consequence certificate
seed domains and generator attempt number
```

The admission evaluator never proves “all possible futures” or searches an unbounded action space. It validates one witness using the same scheduler and action contracts as play. Candidate generation has a pinned maximum attempt count and hierarchical attempt substreams. Exhaustion writes `OpeningGenerationFailure` with failed predicates and offers a new top-level seed or a disclosed mode change; it never loops forever or quietly weakens the gate.

### 15.1.1 Explicit protagonist-causality modes

The protagonist may receive campaign-level narrative selection without receiving different fictional physics. This must be disclosed and branch-pinned.

| Mode | Catastrophe admission rule | What it does not guarantee |
|---|---|---|
| `Epic Protagonist` — recommended | before any not-yet-committed K4+ candidate enters the protagonist's causal horizon, the content-admission layer requires one validated finite `AdmissionProof-v0.1` witness for survival or lawful viewpoint continuation; the witness may use only state-known actions and the pinned response vocabulary/depth | warning noticed, correct choice, easy escape, retained realm/items, safety of loved ones, world survival, or numerical identity after death |
| `Lawful Chronicle` | only the opening Agency Horizon is guaranteed; later lawful events may produce no survival path | continued protagonist life |
| `Unbounded Cosmos` | even the special opening filter is disabled after basic character creation safety; unknowable extinction is accepted | fairness, telegraphing, or continuity |

`Epic Protagonist` filters candidate histories **before intent/physical commitment**. Every later admission—including a candidate created by an emergent actor intention—runs the same bounded `AdmissionProof-v0.1` evaluator, action/depth caps, witness replay, causal-domain substreams, attempt limit, and explicit rejection/failure certificate as opening generation. Failure rejects that candidate history before commitment; it never expands search, weakens the gate, or edits the actor after commitment.

The mode cannot cancel, weaken, redirect, or add an escape after commitment. It cannot relocate an unrelated offscreen catastrophe toward the player. The selected path must be expressible through ordinary world systems, and an isomorphic NPC taking it receives the same result. The player can still miss the evidence, reject the cost, arrive late through their own choices, or die.

This is the honest analogue of xianxia plot armor: the chronicle follows an unusually consequential life, but every survival has a causal certificate inside the world.

### 15.2 Warning eligibility

Every catastrophe declares:

- causal signal channels;
- propagation speeds and occlusion;
- which bodies, instruments, formations, animals, institutions, or practices can notice them;
- confidence and false positives;
- earliest detection by location;
- transmission delays and trust;
- lead time before each frontier; and
- what remains unknowable.

Warnings do not bend toward the protagonist. Their extraordinary advantage may provide one bounded extra clue only through its signed target/action contract.

### 15.3 Lawful survival certificate

Every survival from an otherwise lethal frontier records:

```text
warning/evidence actually received
reaction budget
chosen action
body and cultivation contribution
shelter/formation/artifact/ally/environment contribution
transport and route
failure branches/probability inputs
injury, displacement, separation and loss
debt, custody, authority and future obligation
```

Clone the full state to an NPC and normalize identity: the result must match. Remove contributions one by one; when the final sufficient source disappears, survival disappears.

If no lawful source suffices, the protagonist dies under the chosen identity/death/save policy.

### 15.4 Protagonist advantage during catastrophe

Allowed candidate contributions:

- inspect one local protection-node mismatch after ordinary access and effort;
- preserve one trace or gate alignment briefly enough for another actor to diagnose it;
- coordinate timing with one consenting custodian or evacuee;
- preserve evidence that supports later warning, accountability, or repair; and
- exploit protagonist-specific knowledge and relationships earned earlier.

Forbidden:

- perfect doom timer;
- attacker identity/intent from no evidence;
- world barrier powered by protagonist status;
- private teleport generated at lethal impact;
- stopped catastrophe time;
- guaranteed refuge capacity;
- hidden ancestor arriving at one hit point; and
- cross-realm force created by a warning/coordination advantage.

### 15.5 Outcome layers

Player agency is not synonymous with “win the boss fight.” Depending on capability and time, the player may:

1. prevent;
2. deter or expose;
3. deflect;
4. delay;
5. bargain;
6. warn;
7. shelter;
8. evacuate;
9. choose people, records, species, seeds, techniques, graves, or institutions to preserve;
10. document responsibility;
11. migrate;
12. survive with injury/debt/displacement;
13. retaliate later;
14. rebuild or found a successor community; or
15. accept irreversible death or world loss.

Whenever a warning window exists, at least one materially distinct response must be reachable, but no favorable outcome is guaranteed. A mortal, a Qi Condensation cultivator, a higher-capability cultivation fixture, and a maximum-envelope fixture facing the same catastrophe receive different consequence radii—not different causality.

### 15.6 Death and viewpoint continuity

If the protagonist dies, an optional campaign may continue through a student, kin member, institution, causal successor, reincarnation, recovered record, or another generated person only under the selected Identity & Death model.

Viewpoint continuity is not numerical identity. Cultivation, inventory, authority, relationships, guilt, and ownership do not silently transfer.

---

## 16. Planet/world destruction

`WorldDestroyed = true` is forbidden. A world-body destruction is a topology transaction:

```text
WorldBody@revision
→ RemnantBody[]
+ DebrisField[]
+ EscapingMatter
+ Atmosphere/Ocean/QiEcology states
+ survivor/death/missing/transformed states
+ coordinate-frame remap
+ route and jurisdiction rewrite
+ ownership/history/ritual edges
+ scheduled fronts and recovery
```

It accounts for matter, qi/energy, momentum where modeled, identity, unique objects, shelters, vehicles, obligations, graves, institutions, and causal provenance. Exact physical conservation tolerances are phenomenon-specific and recorded; authority and identity never use physical-energy substitution.

Every persistent entity resolves to one of:

- escaped/carried;
- sheltered/sealed;
- mapped to a remnant;
- transformed;
- dead with remains state;
- missing with last evidence;
- dispersed/destroyed under a typed finality rule; or
- still in a scheduled unresolved frontier.

Every quest/objective becomes complete, failed, transformed, inherited, suspended with a real reopening condition, or impossible with an acknowledged causal reason. No dangling coordinate or immortal objective survives by accident.

The destroyed world remains history: diaspora, debris ecologies, ruins, testimony, distorted routes, resource claims, mourning, revenge, denial, archaeology, and formation fragments can shape play for ages.

---

## 17. Save, load, and branches

### 17.1 Deterministic branch facts

Reloading within a branch never rerolls:

- attacker intent already committed;
- cosmic-beast route and attention evidence;
- catastrophe seed streams;
- warnings already generated or transmitted;
- hazard-envelope commitments and every already committed frontier intersection; future membership still resolves from the same revisioned trajectories/occupancy and cut rules;
- hidden item/world facts already generated;
- spent resources, deaths, cooldowns, and recovery; or
- transaction phase.

Choosing differently creates or continues a branch under the save policy. Branches never merge inventory, rewards, information-state, achievements, authority, or world history.

### 17.2 Player-selectable save modes

| Mode | Purpose | Rule |
|---|---|---|
| `Free Chronicle` | recommended accessible sandbox | manual saves and branching reloads; deterministic hidden facts; no cross-branch farming |
| `Bound Chronicle` | consequence-focused optional mode | restricted anchors/autosaves with disclosed rules; deterministic history |
| `Single Chronicle` | optional severe mode | one continuing branch with recovery safeguards against corruption; never required for intended balance |

The codex distinguishes current-branch witnessed facts, character knowledge, disputed reports, and player memory. It never launders reloaded knowledge into what the protagonist canonically knows.

---

## 18. Persistence and compaction

An eternal event graph cannot retain every event verbatim in active memory. Deterministic snapshot-and-segment compaction stores:

- checkpoint state and hash;
- immutable archived event segments;
- causal-summary edges;
- protected named-event index;
- aggregate sufficient statistics;
- generation manifests and latent seeds;
- provenance required for law, identity, ownership, catastrophe, and investigation; and
- reopening data for unresolved claims.

Compaction is a versioned transaction. A compacted century and an uncompacted control must answer protected queries equivalently, including a later investigation of an old death, debt, artifact, oath, formation failure, or planetary scar.

### 18.1 Protected query algebra and storage limits

“Equivalent later investigation” is bounded by `HISTORY-QUERY-v0.1`, not a promise to reconstruct every discarded footstep or particle. Protected query families are:

1. named/unique entity existence, identity, embodiment, copy/merge/death lineage, and last evidence;
2. ownership, custody, transfer, debt, oath, office, law judgment, and reopening condition;
3. named relationship/testimony/knowledge provenance;
4. method, cultivation, artifact, and contribution provenance;
5. catastrophe cause, warning, defense, affected intersection, survival, topology, and aftermath;
6. generated-fact manifest, causal-domain RNG identity, and observed/pinned detail;
7. bounded aggregate population, material, economy, ecology, migration, and casualty statistics; and
8. event ancestry/descendancy among retained protected kernels.

Every compaction schema declares sufficient statistics and retained kernels for each supported query family. A query outside the schema returns `UnavailableByDeclaredCompaction` plus checkpoint/segment commitments and retained uncertainty; it never invents detail. Anything the player or a canonical witness observed, any named/unique entity, open obligation/claim, identity event, catastrophe intersection, or unresolved investigation receives a protected kernel before source detail can be pruned.

### 18.2 Quota behavior

Each save declares an active-history budget, archive budget, and user-visible storage location. Exact capacities are platform/benchmark decisions, but behavior is locked:

- at the warning threshold, deterministic recursive compaction begins from the oldest eligible unprotected segments;
- compaction may replace detail only with a versioned summary plus cryptographic commitments and the `HISTORY-QUERY` sufficiency schema;
- protected kernels and open causal chains are never silently deleted;
- if the local archive would exceed quota after every lawful compaction, canonical advancement stops at a safe barrier and offers export, archive-location change, or explicit deletion of an entire user-selected branch/archive;
- deleting an archive is never required to keep playing the current branch unless the user has declined all storage alternatives;
- exported archives retain manifest, segment/checkpoint hashes, schema versions, and restore verification; and
- repeated compaction is recursive and deterministic rather than accumulating immutable raw segments forever.

Storage-cap tests run repeated centuries, forced low quotas, export/restore, schema migration, old investigations, and branch deletion. Full historical microdetail is promised only while its source segment remains archived; protected-query truth remains available through retained kernels and summaries.

---

## 19. Golden catastrophe scenarios

### `GC-01 High-realm punitive strike`

A powerful cultivator considers destroying a continental archive region after a political defeat.

Test:

- causal objective and target knowledge;
- preparation, travel, compatibility, and capability certificate;
- rivals, assets at risk, deterrence, and alternatives;
- formation warning with false-positive history;
- player at mortal, Qi Condensation, and high-realm fixtures;
- negotiated, delayed, evacuation, failed defense, and destroyed-region outcomes;
- no player-centered aggro; and
- persistent diaspora, archive loss, evidence, law, ecology, and retaliation.

### `GC-02 Cosmic-beast near transit`

A displaced cosmic beast's migration envelope passes close enough to threaten a world-body.

Test:

- route exists before player knowledge;
- senses/attention follow evidence;
- coarse wavefront and local promotion agree;
- ordinary and extraordinary warnings differ lawfully;
- corridor repair, food-source redirection, hiding, warning, shelter, evacuation, and fatal outcomes;
- S0 versus local S4 parity; and
- no chip-damage boss requirement.

### `GC-03 Internal formation betrayal`

A custodian faction degrades or redirects world protection during a succession struggle.

Test:

- authority, maintenance, inspections, evidence, and insider access;
- false warnings and politicized disbelief;
- partial protection that sacrifices one region;
- protagonist advantage provides bounded evidence only;
- response continues if the protagonist is absent or dies; and
- institutional aftermath persists.

### `GC-04 Planet-to-remnant continuity`

A K5 event destroys the current world while travel, dialogue, possession, inheritance, cultivation, and a funeral are pending.

Test:

- atomic affected set;
- no dangling locations, persons, remains, unique items, debts, rites, objectives, or routes;
- carried/sheltered/dead/missing/dispersed resolution;
- save/crash/reload at every phase;
- remnant coordinate precision; and
- later archaeology/investigation recovers causal history from compacted records.

### `GC-05 World not saved`

The warnings are real, defense is insufficient, and the world is lost despite competent choices.

Test:

- choices still change survivors, evidence, preserved culture/ecology, injuries, displacement, blame, and future possibility;
- no pity artifact or hidden teleport appears;
- protagonist may die;
- viewpoint continuation obeys identity law; and
- loss is not only motivational scenery for the protagonist.

### `GC-06 Acceleration interrupt`

The player begins a year-long cultivation retreat with standing orders while an ambiguous distant warning develops into a route closure and regional catastrophe.

Test:

- normal stepping and direct advance stop at the same earliest undecided interrupt;
- no routine auto-selects a value-laden response;
- reading time does not affect canon;
- save/load and worker budgets preserve the first interrupt; and
- ignoring the warning lawfully changes outcome.

---

## 20. Release-blocking gauntlet

### S0 blockers

1. Renderer, GPU, wall time, frame rate, Promise order, or device type can alter canon.
2. Accelerated and normal semantic execution differ in protected event order, first interrupt, or state hash.
3. A K4+ event lacks a transactional affected set, topology remap, and persistent aftermath.
4. Save/load can reroll, duplicate, erase, or merge a catastrophe commitment or reward.
5. High-realm actors can erase stable mortal worlds effortlessly with no compatibility, cost, objective, competing interest, response, or aftermath.
6. Any defense, warning, escape, fate, inheritance, or survival mechanism checks `isPlayer` or hides a survival guarantee.
7. Karma, fate, Heaven, Dao, mandate, or a formation supplies unexplained/unbounded authorial protection.
8. Death, escape, copy, reincarnation, or viewpoint continuation duplicates identity, cultivation, authority, or resources.

### S1 blockers

1. Pause enables zero-time canonical mutation or new sensing.
2. Actions charge duration after success rather than resolving milestones and interruption.
3. Simulation resolution remains conflated with render LOD, persistence, or narrative significance.
4. Event budget exhaustion changes outcomes.
5. Local promotion can contradict observed/coarse history.
6. Catastrophe fronts skip cells, violate declared conservation, or depend on batch/insertion order.
7. A protection lacks source, scope, threshold, observability, maintenance, governance, latency, failure, counter, and history.
8. A cosmic beast lacks ecology, trajectory, attention limits, topology, or personhood analysis.
9. Catastrophe agency means only defeating an impossible combatant.
10. Evacuation has infinite capacity, warning is always correct, or catastrophe exists only on-screen.
11. Acceleration becomes an optimal auto-player or opaque death trap.
12. Astronomical coordinates use one render-space float frame as canon.
13. Event history grows without deterministic compaction or loses evidence during compaction.
14. Terminology conflates cultivation realm/world/plane/domain; sect/clan/lineage; Dao/world law/statute; karma/causality/reputation; or fate/destiny/luck/mandate.

---

## 21. Minimum executable test battery

1. Arbitrary wall-time pause leaves canonical hash unchanged.
2. One-second versus one-hour dialogue reading produces the same precommit state.
3. Dialogue/action interruption at every milestone produces only delivered partial results.
4. 1×, accelerated, direct catch-up, and halfway reload converge.
5. First undecided interrupt is invariant across processing budgets.
6. Event insertion order, worker count, Promise completion, and batch partition permutations converge.
7. S4→S0→S4 round trips preserve protected facts and normalized outcomes.
8. Renderer-disabled, WebGL2, WebGPU, frame-rate, resolution, and device-loss runs share canonical hashes.
9. Wavefront causal ordering, conservation tolerance, monotonic frontier, overlap, and batch invariance pass.
10. Million-cell catastrophe processing changes wall completion time only.
11. Local detail promotion never contradicts prior observation or aggregate ledgers.
12. Planet-to-remnant referential-integrity audit finds zero dangling references.
13. Extreme-date and hierarchical-coordinate tests retain ordering and local precision.
14. Compacted and uncompacted history answer protected queries equivalently.
15. Long no-player eras support the authored civilization age/distribution.
16. Every threat class crosses every defense layer, including failure and false warning.
17. Protagonist/NPC survival parity and contribution-removal tests pass.
18. A world can be lost while low-realm decisions remain consequential.
19. Hidden poison, contamination, curse, theft, access revocation, assassin, and unreceived-warning fixtures have identical 1×/Advance effects and reveal no threat through acceleration alone; paired controls with a lawful worn monitor or scheduled inspection may interrupt only at the actual reading/check event.
20. After 1×, Advance, reload, and S0 round trips, exhaustive promotion produces identical observable people, items, histories, and opportunities.
21. Every committed/uncommitted K0–K7 lethal opening either has a lawful survival/viewpoint branch, a consequence-changing action plus disclosed playable successor, or is rejected outside `Doomed Prologue`.
22. One stamped live-input log replays identically under transport delay, render delay, frame-rate, backend, and worker-count permutations; stale reaction inputs rebase/reject exactly as declared.
23. Every process lower-bound certificate respects the global safe horizon; deliberately injected late events fail reproducibly before corrupting history.
24. `CANON-NUM-v0.1` boundary, rounding, overflow, interval, integration, and coordinate vectors match across browsers, architectures, and S tiers.
25. Moving entrants, evacuees, births, deaths, shelter boarding, custody transfers, and repeated front crossings produce exactly one correct intersection per entailed crossing.
26. Source commitment, distant observation, local impact, severance, topology revision, and remnant-frame commit occur at causal instants; later fronts bind the correct revision.
27. Worst-case pause/cancel tests interrupt generation, compaction, promotion, and catastrophe work inside the declared chunk/latency bounds without changing results.
28. Repeated centuries at forced-low storage quota preserve every `HISTORY-QUERY-v0.1` answer, stop safely when required, and export/restore with matching commitments.
29. Opening/closing a gate and severing/creating a route ahead of an in-flight front atomically recertifies envelopes, Merkle ranges, and safe-time lower bounds before the topology revision commits.
30. Active and Advance input modes, pause/cancel during catch-up, stale intents, delayed transport, and no-input windows make forward progress without deadlock and replay from the stamped log exactly.

---

## 22. Terminology policy

Retain standard English-reader xianxia vocabulary: qi, Dao, cultivation, cultivator, Qi Condensation, sect, spiritual roots, meridians, tribulation.

Use these distinctions:

- `cultivation realm` = advancement state;
- `world`, `plane`, or ratified `domain` = cosmological location;
- `formation` = constructed qi/law infrastructure, defined at first design use;
- `sect` = organization; `clan` = kinship-political institution; `lineage` = transmission/authorization;
- `Dao`, `world law`, `statute`, and `office order` are different;
- `causality`, `karma`, and `reputation` are different;
- `fate`, `destiny`, `luck`, `mandate`, and `lifespan` are different; and
- `ascension` requires an explicit transformation/migration contract.

Chinese text retained in research records keeps Hanzi, pinyin, context, and source scope. Player/design prose translates or glosses only niche/opaque romanization; it does not replace fluent terms such as qi or Qi Condensation with awkward literal English.

---

## 23. Research basis and current technical cautions

Primary/current technical references used for architectural constraints:

- [Three.js WebGPURenderer manual](https://threejs.org/manual/en/webgpurenderer) — WebGPU-first renderer, WebGL2 fallback, current experimental status and migration cautions.
- [MDN: `GPUDevice.lost`](https://developer.mozilla.org/en-US/docs/Web/API/GPUDevice/lost) — devices can be lost and resources must be recreated.
- [MDN: `requestAnimationFrame`](https://developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame) — refresh-rate coupling and pausing in background tabs.
- [MDN: `setTimeout`](https://developer.mozilla.org/en-US/docs/Web/API/Window/setTimeout) — inactive-tab throttling and delayed execution.
- [W3C WebGPU promise ordering](https://www.w3.org/TR/webgpu/#promise-ordering) — applications cannot generally rely on promise settlement order.
- [W3C WGSL floating-point evaluation](https://www.w3.org/TR/WGSL/#floating-point-evaluation) — implementation/precision rules reinforce the GPU-to-canon prohibition.
- [MDN: worker cross-origin isolation](https://developer.mozilla.org/en-US/docs/Web/API/WorkerGlobalScope/crossOriginIsolated) — shared-memory availability depends on isolation; structured-clone fallback is required.
- [Deterministic total ordering of simultaneous parallel-simulation events](https://arxiv.org/abs/2105.00069) — motivates explicit stable ordering for equal virtual times.

These sources validate platform constraints, not the fictional cosmology or final implementation choice.

---

## 24. Open decisions for user review

Not yet selected:

1. opening Agency Horizon duration and whether it protects a household, settlement, region, or broader starting causal network;
2. default save mode beyond the recommendation of `Free Chronicle`;
3. whether `TacticalFocus` exists in addition to hard pause;
4. which protagonist advantage, if any, advances;
5. identity/death ontology and viewpoint-continuation policy;
6. exact world-formation law, power sources, maintainers, and jurisdictions;
7. whether nonmoral causal footprint becomes baseline law;
8. any karma, fate, destiny, Heaven, mandate, office, or covenant module;
9. catastrophe frequency distributions by cosmological ecology;
10. maximum-realm ontology and how K7 events are bounded;
11. canonical integer time units and extreme-date epoch scheme; and
12. minimum supported hardware and benchmark scenes.

No decision here selects final lore, cosmology, cultivation ladder, protagonist advantage, maximum realm, or implementation library beyond the user's stated presentation direction.
