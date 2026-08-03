# Apex Technical Stress Review — Micro-to-Macro Cosmology Simulation and Generation — Draft v0.1

**Status:** adversarial pre-canon architecture review; no cosmology, apex realm, world law, or protagonist power is selected  
**Date:** 2026-08-02  
**Target:** browser-delivered single-player game using Three.js with WebGPU as the preferred presentation path and renderer-independent canonical simulation  
**Reference machine:** GTX 1070 8 GB, i5-3570K, 8 GB system memory; 1080p 30 fps quality floor and 60 fps ordinary-scene target remain benchmark hypotheses, not promises  
**Code status:** no production code, prototype, dependency installation, content generation, benchmark result, or implementation authorization is created by this document  
**Consumes:** Grand Architect Foundation Package v0.1; Cultivation Foundations Release v0.1; `SEM-NORM-v0.1`; `ResolutionPolicy-v0.1(S,R,P,N)`; `TECH-DAG-v0.1`; `CatastropheContract-v0.1`; `HISTORY-QUERY-v0.1`; identity/death candidate models; and the next-phase evidence workplans  

---

## 0. Review disposition

The project can represent play from a mortal hand-scale action to world-founding or world-destroying consequences only if it rejects one seductive premise: **scale cannot mean uniform simulation detail**.

A browser cannot simulate every grain, person, spirit, ecosystem, formation, star, and causal interaction at local combat resolution. Nor is that required for a coherent universe. What is required is that every scale use the same semantic laws, preserve the same protected facts, commit changes through the same causal rules, and refine any region without contradicting what has already become observable.

The technically defensible architecture is therefore:

```text
immutable semantic law and typed operations
→ hierarchical topology and coordinate patches
→ event/state truth with conservative analytical processes
→ orthogonal simulation, rendering, persistence and significance policies
→ bounded local realization around observation and active commitments
→ deterministic promotion/demotion with protected-query equivalence
→ Three.js/WebGPU presentation as a view, never as truth
```

This disposition is conditional. It does not prove that the full game is feasible, fun, culturally coherent, or affordable. It defines the architecture and tests that could falsify those claims before production.

### 0.1 S0/S1 rules for this review

- **S0:** an architecture necessarily corrupts causality, identity, conservation, topology, or committed history; relies on player-only physics; cannot terminate; or makes the requested game structurally impossible.
- **S1:** an architecture has an unbounded operation, hidden oracle, LOD-dependent truth, save/load divergence, generator incoherence, dominant endgame exploit, misleading performance guarantee, or reference-hardware design that cannot degrade safely.
- **Repair band:** a bounded representation, scheduling, tuning, or usability deficiency whose correction does not change world law.

Any S0/S1 blocks the affected package. Ambition, visual spectacle, or average-case performance cannot waive a failed invariant.

---

## 1. Locked technical principles

1. **One universe, many representations.** A hand, village, continent, world-body, plane, or cosmological domain may have different data structures and update rates, but an action still needs a source, target relation, support, geometry, timing, cost, counter, commitment point, propagation, and aftermath.
2. **No scalar level resolves reality.** Realm, scale, energy, narrative importance, render detail, simulation tier, persistence and causal significance remain separate axes.
3. **Topology precedes coordinates.** Containment, adjacency, reachability, portals, boundaries and causal routes are canonical. One global floating-point coordinate system is not.
4. **Events and protected state are truth.** Meshes, particles, textures, GPU buffers, cached voxels, navigation meshes and instanced crowds are rebuildable views.
5. **Generation proposes; contracts admit.** A seed may propose content. It may not silently invent ontology, evade invariants, decide identity, or repair an impossible history.
6. **Distant does not mean nonexistent.** Offscreen agents and processes may demote to schedules, cohorts, envelopes and summaries only while every protected future observation remains recoverable or conservatively bounded.
7. **Apex power is not an engine API.** World founding is not `createScene`; world destruction is not `deleteWorld`; time manipulation is not changing a global multiplier; resurrection is not cloning a save record.
8. **Canonical order ignores runtime order.** Frame rate, worker completion, network timing, browser throttling, GPU execution and traversal order never choose history.
9. **Failure is data.** If a solver, migration, normalizer, generator or proof exceeds its declared bounds, it returns a versioned failure or deferred result. It never guesses.
10. **No implementation before evidence.** Interfaces in this review are candidate research contracts, not authorized code or ratified canon.

---

## 2. Scale-independent semantic operations

### 2.1 Candidate `APEX-OP-v0.1`

Every mechanically active mortal or apex operation is represented by the same outer contract:

```text
OperationId / SchemaVersion / CausalDomain
ActorOrPhysicalSource / AuthorizedControllers
EvidenceView / BelievedModel / Unknowns
Intent / GoalPredicate / Exclusions / FailurePolicy
TargetSelector / TargetRelation / ClaimScope / Support
TopologyRevision / CoordinatePatchSet / SemanticGeometry
Inputs / Sources / Reservations / ContributionLedger
PrepareMilestones / IrreversibleCommitPredicate
PropagationModel / BoundaryConditions / CounterWindows
ConservationAndTransformationRules
IdentityCustodyConsentAndAuthorityTouches
ExpectedAndMaximumConsequenceEnvelope
CatastropheEscalationPredicate
Outcome / Residuals / Debts / Evidence / Aftermath
PersistenceClass / SignificanceClass / ProtectedQueries
```

The contract does not grant capability. It describes an attempted operation that ordinary world law may reject, partially resolve, redirect, counter, or make catastrophically expensive.

### 2.2 Semantic similarity across scale

An operation is scale-independent when increasing its extent changes typed inputs and affected topology, not the core meaning of its verbs.

| Verb family | Mortal/local example | Apex example | Invariant that cannot change |
|---|---|---|---|
| perceive | inspect a wound or footprint | survey a world boundary or causal route | only established information enters `AuthorizedInformationView` |
| move/transport | carry a basket | translate a city, world-body or bounded domain | path, capacity, custody, collisions, arrivals and aftermath remain explicit |
| cut/sever | cut timber | sever a route, formation graph, continental plate or world connection | target relation, boundary, support, propagation and residual topology are recorded |
| bind/connect | tie a support | join routes, formations, worlds or time domains | endpoints, compatibility, authorization, load and failure mode remain explicit |
| transform | refine ore or qi relation | alter atmosphere, terrain regime or permitted field relation | sources, conservation, excluded states, transition interval and debt remain explicit |
| shelter/protect | brace a roof | establish a refuge region or world envelope | protected predicates, coverage evidence, capacity, leakage and counter remain bounded |
| create/found | build a dwelling | found a habitat, world-body or domain | materials/support, topology, inhabitants, identity, history and maintenance cannot appear from an engine call |
| destroy/unmake | collapse a wall | render a continent/world/domain uninhabitable or topologically severed | propagation, victims, escapes, remains, evidence, debts and remnant state persist |

### 2.3 Composition and boundedness

`APEX-OP-v0.1` consumes rather than replaces `TECH-DAG-v0.1`:

- at most 64 semantic operation nodes, width 8, nesting depth 4, and 256 same-instant closure evaluations in one admitted contract;
- a macro target selector denotes a bounded cohort, topology range, field basis or route set; it does not expand millions of hidden target nodes into the action graph;
- work above the admitted target or closure bound becomes scheduled successor transactions with stable causal-chain identifiers and conserved contributions;
- every recursively capable operation class supplies a conservative terminal reducer;
- reaching a bound is `SPECIFICATION_DEFECT` or an explicit capacity failure, never an arbitrary winner or erased effect;
- `SEM-NORM-v0.1` compares semantic novelty. Scale, name, color, animation, numeric magnitude or number of fungible targets alone cannot create a new verb.

### 2.4 Prepare, commit, propagate, arrive

Large operations must distinguish four times:

1. **Prepare:** resources, routes, anchors, collaborators, evidence and topology ranges are assembled. They may be interrupted or invalidated.
2. **Commit:** a declared source change becomes irreversible without a new counterevent. This does not mutate distant targets early.
3. **Propagate:** influence travels through the then-current topology/field model with certificates and counterwindows.
4. **Arrive:** local intersections commit against arrival-time occupancy, identity, shelter, custody and topology revisions.

An apex action cannot use scale to collapse these times into one global mutation.

### 2.5 Targets are relations, not object handles

“The world,” “the enemy,” “all treasure,” “every hostile,” or “everyone inside” is never a sufficient target. A lawful target declares:

- a topological range or query;
- a relation such as containment, exposure, custody, causal dependence, oath, support or physical intersection;
- the evidence by which the actor selected it;
- boundary and exact-edge rules;
- whether future entrants/exits are included;
- identity/cohort treatment;
- a maximum cardinality, extent or refinement policy; and
- a failure behavior when the target cannot be resolved within bounds.

Stable identifiers break only exact semantic ties. They never decide moral priority, rightful ownership, physical dominance or who survives.

---

## 3. Hierarchical topology and coordinate architecture

### 3.1 Canonical topology graph

The universe uses a versioned multigraph, not one enormous Cartesian space. Candidate node classes are intentionally ontology-neutral:

```text
CosmologicalDomainCandidate
  → PlaneOrSystemCandidate
    → WorldBodyOrHabitat
      → Region
        → SiteOrRouteComplex
          → ScenePatch
            → SurfaceOrVolumePatch
```

These names describe storage and navigation roles, not ratified cosmology. A selected universe may omit, rename, duplicate or alter layers, but it still needs bounded containment and reachability interfaces.

Canonical edge families include:

- physical adjacency and containment;
- traversable route with capacity, direction, cost and travel-time model;
- portal, gate, pocket boundary or discontinuity with explicit transform;
- causal reach for a typed field or signal;
- dependency/support relation;
- administrative, social or ritual claim, kept distinct from physical access;
- observation/communication route; and
- ancestry/provenance of topology revisions.

No edge is created because two visual chunks happen to be adjacent in memory.

### 3.2 Coordinate patches

Local precision uses coordinate patches with stable topology anchors:

- positions inside an active patch use fixed-point or bounded local numeric formats selected by schema;
- camera and rendering use camera-relative floating coordinates rebuilt from canonical values;
- region/world travel uses patch transitions and route parameters rather than subtracting planet-scale floats;
- portals and non-Euclidean connections use versioned transforms with handedness, orientation, metric and time-boundary behavior;
- no position is identified solely by a floating triple;
- reparenting a patch is a topology transaction, not a silent coordinate rewrite.

The renderer may shift origin every frame. Canonical positions do not.

### 3.3 Spatial indexes are caches with revision contracts

Each topology scope may maintain bounding-volume hierarchies, grids, sparse voxel indexes, navigation structures, field acceleration structures and visibility clusters. These are derived indexes. Every query result carries the topology/occupancy revision it used.

Before a topology write commits, the active-process spatial index identifies every front, route solver, occupancy certificate or lower-bound certificate that may change. Each affected process must recompute, prove nonimpact, or join one coupled transaction. A stale index cannot authorize a commit.

### 3.4 Topology seam rule

Promoting two neighboring regions, opening a portal, cutting a route, moving a world, or changing a boundary must satisfy:

```text
shared boundary revision
matching conserved flux/history
matching named and unique occupants
matching claims/custody/evidence
compatible field boundary conditions
no event inserted into committed past
```

Failure yields a visible blocked transaction or repair fixture. It never generates filler at the seam.

---

## 4. Hierarchical fields, matter and influence

### 4.1 Field contract

A field is not a texture and not a universal aura number. A candidate `FIELD-ATLAS-v0.1` entry records:

```text
FieldKind / OntologyDependency
Sources / Sinks / StoredQuantityOrRelation
TopologyDomain / BoundaryConditions
PropagationKernel / MaximumInfluenceEnvelope
ResolutionBasis / ErrorEnvelope
Couplings / Exclusions / Instabilities
ObservationInterfaces / ConcealmentInterfaces
ConservationOrDeclaredNonconservationRule
Revision / ProtectedQueries / ResidualEvents
```

Until qi, spirit, Dao, domain or world-law ontology is selected, their field kinds remain typed placeholders. The architecture cannot infer that every supernatural relation is a scalar field.

### 4.2 Multi-resolution representation

A large field may use three concurrent representations:

1. **Analytical envelope:** conservative reach, earliest arrival, maximum magnitude and known exclusions.
2. **Regional basis:** cells, graph modes, cohorts, watershed/route segments or low-order coefficients sufficient for protected queries.
3. **Local realization:** high-resolution samples, bodies, volumes and interactions near observation or active commitments.

Promotion constrains the local realization to reproduce the parent boundary conditions, conserved totals and historical measurements. Demotion projects local residuals back into the regional basis and creates explicit named exceptions where aggregation would erase identity or causality.

### 4.3 Matter and terrain

Matter is split by gameplay-relevant behavior rather than one universal voxel type:

- named/unique bodies, artifacts, formations, structures, routes and remains keep identity-bearing records;
- bulk solids use sparse volumetric or surface operations plus material strata and conserved source attribution;
- fluids, gases, heat, pressure, fire and contamination use front/field solvers suited to their behavior;
- ordinary debris can aggregate into cohorts after identity, evidence, hazard and custody checks;
- visual fragments are presentation unless promoted by an interaction or protected observation.

A planet-wide centimeter voxel array is prohibited. Persistent terrain truth is the initial material/topology frame plus versioned operations, remaps, residual processes and bounded checkpoints.

### 4.4 Influence and domain-like mechanics

If future canon admits domains, pressure, intent fields, formations, laws or authorities, each must declare which relation it actually changes. “Suppress all lower realms” or “control everything in my domain” is not executable.

Possible typed effects include:

- alter the cost or stability of a specific operation;
- provide a source or boundary condition;
- improve evidence through a declared sensing channel;
- create a claim whose support can be contested;
- impose a local transformation rule with exclusions and counters; or
- modify topology under an apex transaction.

Institutional office, social authority, physical control, ritual recognition and ontic capability remain separate.

---

## 5. Intelligent procedural generation without noise

### 5.1 Generation is a compiler pipeline

The generator operates in layers:

```text
ratified ontology and vocabulary
→ frozen regional/cultural/ecological constraints
→ causal-history skeleton
→ institutions, households, routes, dependencies and conflicts
→ topology/material/field realization
→ local affordance and encounter compilation
→ visual/audio presentation
→ invariant and originality admission
```

Later layers may elaborate but cannot contradict earlier layers. A visual generator cannot invent a sect, species, Dao, soul rule, culture or catastrophe because a texture seed suggested one.

### 5.2 Causal-domain randomness

Every generative decision uses a stable semantic causal domain, versioned generator, declared inputs and local substream. Adding an unrelated cup to one home cannot rekey a dynasty, move a mountain or alter a distant person's ancestry.

Generation records:

- generator and schema revision;
- causal-domain identifier and parent decision;
- constraint/input hashes;
- selected branch and rejected alternatives where needed for proof;
- invariant/test results;
- authored or research-source boundaries; and
- dependencies that would require regeneration after a canon revision.

Seeds reproduce proposals. Accepted event/state records are truth. A save is never only a seed.

### 5.3 Coherence budget

Each generated region has a finite coherence budget allocated to facts that players can investigate or affect:

- material/ecological support;
- settlement and route causes;
- household and institutional dependencies;
- names, relationships and obligations;
- current pressures and latent conflicts;
- cultivation access/evidence consistent with selected lore;
- historical traces and contradictions;
- recoveries, ruins and consequences.

Unobserved decorative variation consumes presentation budget, not canon budget. The generator must prefer fewer causally connected distinctions over thousands of unrelated adjectives.

### 5.4 Semantic motif grammar

A motif is a typed dependency pattern, not a prose trope. For example, a river-market motif may bind water timing, ferry rights, storage limits, labor schedules, kinship obligations, flood history and contested evidence. Names, architecture, ritual, law and gender roles cannot be filled until their cultural manifests permit it.

Motifs may compose only when:

- inputs and outputs match;
- no protected invariant conflicts;
- resource and population ledgers close;
- histories have a plausible causal ordering;
- cultural/originality boundaries pass;
- repeated combinations do not create a source fingerprint; and
- a bounded rejection path exists.

Attempt exhaustion returns `GENERATION_CONSTRAINT_EXHAUSTED` with failed predicates. It does not loop or relax canon silently.

### 5.5 Global history and local detail

Long histories generate at event and aggregate level first. A promoted locality realizes detailed witnesses, objects and traces consistent with the recorded history. If the history says a bridge failed, a household migrated and a debt remained disputed, local generation must materialize compatible routes, absences, records and beliefs. It may choose among lawful underdetermined details but cannot erase the bridge failure or declare the debt settled.

### 5.6 Anti-noise tests

- Removing presentation adjectives leaves a causally distinct region graph.
- Two regions with different histories do not normalize to the same obligations, routes and pressures.
- Two regions with the same seed but one unrelated distant edit retain identical unaffected manifests.
- Every named local affordance traces to material, social, historical or selected supernatural support.
- A player can infer at least one nontrivial dependency from evidence rather than codex exposition.
- Generator repair does not rewrite already observed facts.

---

## 6. Simulation detail, locality and significance

### 6.1 Four orthogonal policy axes

This review adopts `ResolutionPolicy-v0.1(S,R,P,N)`:

- `S0–S4`: canonical simulation resolution;
- `R0–R4`: presentation/render detail;
- `P0–P3`: persistence/protection class;
- `N0–N3`: causal/narrative significance.

Examples:

- a hidden named ancestor claim may be `S0/R0/P3/N2`;
- visible ordinary dust may be `S1/R4/P0/N0`;
- a distant migrating cohort may be `S0/R0/P1/N1`;
- a player's committed projectile may be `S3/R3/P2/N3` until arrival;
- a world-destruction front may use analytical `S0` propagation while carrying `P3/N3` commitments and local `S4` intersections.

No renderer setting may lower P/N or change canonical outcomes.

### 6.2 Promotion contract

Promotion from a coarse representation must:

1. freeze the parent state revision and supported-query set;
2. instantiate named exceptions exactly;
3. realize aggregate members using latent substreams and boundary totals;
4. satisfy prior observations, evidence, injuries, debts, custody, relationships and scheduled actions;
5. conserve declared quantities and causal contributions;
6. reproduce protected `HISTORY-QUERY-v0.1` answers; and
7. publish atomically or fail without partial truth.

Promotion cannot create a secret murderer, treasure, teacher, escape route or relationship merely because local gameplay now needs content.

### 6.3 Demotion contract

Before demotion:

- current action milestones commit or remain explicit pending transactions;
- named/unique/identity-bearing facts become exceptions;
- cohorts receive conserved counts, distributions and latent manifests;
- local fields project into regional bases plus residual events;
- evidence and unresolved claims persist;
- future event lower bounds remain valid; and
- a round-trip fixture verifies equivalent protected queries.

If a scene cannot demote without loss, it remains resident in canonical storage even if its presentation unloads.

### 6.4 Locality is causal, not camera-only

The active simulation neighborhood is the union of:

- protagonist sensory/action horizon;
- pending commitments and propagating fronts;
- named-agent schedules whose next decisions fall inside the safe horizon;
- topology edits and field instabilities;
- authorized monitors and communication arrivals;
- save/inspection queries; and
- high-significance exceptions.

A camera cut does not suspend a collapse. A close camera does not force every unrelated atom to S4.

---

## 7. Canonical time and causal performance

### 7.1 Clock separation

Canonical time, presentation time, player deliberation time and compute time remain distinct. Canon uses exact integer instants/durations and declared epochs. `requestAnimationFrame`, OS time, browser throttling and worker latency never supply canonical timestamps.

Hard pause freezes canon at an atomic barrier. Presentation may continue. Advance uses a signed authorization lease and stops only at an established-information barrier visible through `AuthorizedInformationView`.

### 7.2 Scheduler hierarchy

The scheduler is hierarchical but history is globally comparable:

- each causal domain owns a deterministic event queue and safe horizon;
- cross-domain messages carry source commit, earliest arrival, topology revision and stable causal order;
- conservative lower bounds permit a domain to advance without inspecting every distant event;
- domain publication uses immutable batches and a deterministic merge rule;
- exact simultaneous semantic conflicts join one coupled transaction or a declared contest;
- worker execution may speculate, but only the canonical publication order commits.

### 7.3 Analytical processes

Slow or vast processes use analytical or cohort solvers when those solvers provide:

- conservative earliest-event bounds;
- protected aggregate totals;
- named/unique exceptions;
- error envelopes and promotion rules;
- boundary fluxes and topology revisions;
- residual events; and
- a falsifiable comparison against higher-resolution fixtures.

An analytical solver cannot average away a person, artifact, warning, wound, evacuation, claim or propagation front that later matters.

### 7.4 Overload behavior

When work exceeds its frame or memory budget, the runtime may:

1. reduce `R` presentation detail;
2. delay noncanonical visual generation;
3. demote eligible `S` regions while preserving P/N and query invariants;
4. slice canonical work across more barriers;
5. slow or pause accelerated time;
6. stop at a safe horizon and expose a performance diagnostic; or
7. reject an unbounded operation before commitment.

It may not drop events, skip costs, freeze hidden threats, reduce named casualties, invent an outcome, or let the player act while required canonical work is unknowably behind.

### 7.5 Deterministic parallelism

- Tasks read immutable revisions and produce proposed deltas.
- Deltas include complete read/write/range sets and contribution provenance.
- Conflicts resolve by semantic time, causal dependency, declared contest and exact semantic tie rules.
- Worker ID, completion time, hash-table enumeration and GPU scheduling are excluded.
- Any nondeterministic optimization must be presentation-only or produce a result verified against a canonical certificate before commit.

---

## 8. Persistence, history and migration

### 8.1 Canonical save structure

A save requires:

- ratified canon and schema revision manifest;
- event-log segments and checkpoint roots;
- topology graph and patch revisions;
- named/unique entities and identity/continuity records;
- cohort ledgers and latent realization manifests;
- field bases, residual processes and frontier certificates;
- pending operations, reservations and contribution ledgers;
- authorized-information and evidence state;
- generator provenance and accepted branch manifests;
- protected-query indexes; and
- migration history.

Derived meshes, textures, particles and rebuildable navigation/index caches need not be canonical.

### 8.2 Snapshot and log policy

Checkpoints are immutable, content-addressed roots over bounded pages. Event logs between checkpoints remain replayable. Compaction may replace old detail only after `HISTORY-QUERY-v0.1` answers, identity/custody provenance, causal commitments and future-refinement tests match.

No save operation depends on serializing one live object graph in a single blocking frame.

### 8.3 Save/load at apex scale

Saving during world founding, world destruction, time-domain transition, possession, reincarnation or topology migration records the exact prepare/commit/propagation/arrival phase. Reload cannot:

- reroll admitted intent or hidden state;
- duplicate a source, world, inhabitant, item or claimant;
- refund committed cost;
- create two topology roots with one identity;
- reset a catastrophe front;
- extend a time-domain lease; or
- turn a failed identity continuation into numerical survival.

### 8.4 Version migration

Every migration declares source/target schemas, input hashes, transformed records, protected queries, ambiguity failures and test bindings. A migration may conservatively increase simulation/persistence/significance but cannot lower a protected invariant. Ambiguous identity, topology, chronology or migrated legacy-F2 classification remains quarantined; it is never guessed.

---

## 9. Three.js/WebGPU presentation architecture

### 9.1 Presentation boundary

Three.js coordinates scenes, cameras, materials, animation and renderer resources. WebGPU is the preferred renderer path. Neither owns canonical time, collisions, identities, inventories, terrain truth, AI decisions, world topology or event ordering.

Renderer loss or recreation must leave the canonical hash unchanged. A renderer-disabled test must run every simulation, persistence and catastrophe fixture.

### 9.2 Multi-scale visual stack

Candidate presentation techniques by scale include:

- camera-relative transforms and clustered local scenes;
- instancing and GPU culling for repeated ordinary geometry;
- hierarchical meshes and impostors for distant structures/terrain;
- sparse clipmaps or virtualized tiles for terrain/material views;
- procedural shader detail that is explicitly noncanonical;
- analytical sky/atmosphere and distant world-body views;
- decoupled effects for fields/fronts whose authoritative envelopes live in simulation; and
- asynchronous asset realization with a deterministic placeholder state.

An object becoming visible promotes presentation detail. It does not retroactively become real.

### 9.3 Visual continuity obligations

- topology seams remain visually and canonically aligned;
- scale transitions preserve apparent direction, travel history and landmarks;
- world-body/region/site coordinates use explicit transforms;
- destruction visuals follow committed front arrival rather than preplaying global aftermath;
- field effects never reveal hidden canonical state beyond authorized evidence;
- distant crowd/army visuals preserve cohort counts within declared display error but cannot be used as authoritative identity lists; and
- temporal interpolation never advances canonical collisions or damage.

### 9.4 Renderer fallbacks

WebGL fallback, reduced effects, lower texture resolution, simpler atmosphere, fewer presentation particles and lower mesh density are valid product options only when canonical play remains identical. If a mechanic can be aimed or understood only through one expensive effect, it fails accessibility and renderer-independence review.

---

## 10. Provisional reference-hardware envelope

These figures are admission hypotheses for later measurement, not achieved benchmarks.

### 10.1 Memory

On the 8 GB system-memory reference machine:

| Budget | Provisional envelope |
|---|---|
| browser game private working set, steady ordinary play | target ≤2.0 GiB |
| browser game private working set, short controlled peak | target ≤2.75 GiB with recovery; exceeding it fails the reference profile |
| canonical simulation + active generated state inside that working set | target ≤768 MiB steady |
| presentation CPU assets/caches inside that working set | target ≤768 MiB steady, aggressively evictable |
| GPU-resident resources on GTX 1070 | target ≤3.5 GiB steady and ≤4.5 GiB controlled peak despite nominal 8 GB VRAM |
| one atomic save/commit buffer | paged; no second full-world copy |

OS, browser, driver and allocator overhead must be measured. Nominal hardware capacity is not an available game budget.

### 10.2 Frame and responsiveness

- 1080p 60 fps is an ordinary local-scene target after quality scaling.
- 1080p stable 30 fps is the proposed minimum quality floor.
- Canonical simulation may update at semantic rates independent of frames.
- Input acknowledgement targets remain ≤50 ms p95; pause acknowledgement remains ≤100 ms maximum on supported minimum hardware.
- No nonpreemptible canonical prepare/reduce/commit work may exceed the existing 50 ms ceiling.
- One expensive cosmological operation must schedule bounded work and visible progress; it cannot block the browser main thread while “the universe calculates.”

### 10.3 Residency policy

Resident data priority is:

1. active transaction and safe-horizon state;
2. protagonist locality and established information;
3. named/unique entities and P3 identity/provenance;
4. frontier and topology certificates;
5. near-future event pages;
6. presentation resources; and
7. speculative generation/cache.

Speculative assets are first to evict. Canonical protected data pages spill to persistent storage or force a safe stop; they are never discarded.

### 10.4 Benchmark scenes required before any performance claim

- dense mortal market in rain with schedules, interiors, inventories and dialogue pause;
- mixed one-versus-many combat with policies, debris, collection and bystanders;
- excavation intersecting water/gas/body/route fronts;
- fast travel and direct catch-up through one simulated year;
- world-scale catastrophe with local evacuation and renderer disabled;
- promotion of a historically dense region after centuries away;
- world-founding prepare/commit with inhabitants and active routes at the boundary;
- save/load at every apex transaction phase; and
- device-loss/rebuild while canonical simulation remains paused or safely advancing.

Every benchmark reports frame-time distribution, long tasks, working set, GPU memory, event throughput, save size/time, promotion latency, cache misses and canonical hash parity. Average fps alone is insufficient.

---

## 11. Apex operation family: world founding

### 11.1 Founding is transformation, not allocation

A future ontology may allow new world-bodies, habitats, pocket domains or transformed regions. The architecture does not assume creation from nothing. `WORLD-FOUND-v0.1` is a candidate stress contract whose sources and ontology remain open.

Required phases:

1. **Charter the target predicate:** what counts as founded—habitable region, stable topology node, self-maintaining domain, transformed world-body, or something else.
2. **Declare sources/support:** matter, energy, qi-like relation, topology anchor, collaborators, artifacts, time and external contribution.
3. **Propose topology:** containment, routes, boundary transforms, coordinate patches, failure exits and relation to existing worlds.
4. **Select only ratified law parameters:** no generator-created physics, Dao or soul rule.
5. **Stress the boundary:** load, flux, ecology, atmosphere, field stability, route capacity, hostile interaction and catastrophe envelope.
6. **Resolve occupants/claims:** people, bodies, species, graves, artifacts, institutions, consent, custody and jurisdiction are not bulk decoration.
7. **Commit formation milestones:** partial founding may leave ruins, instability, debt or usable subregions.
8. **Propagate external consequences:** tides, routes, markets, deterrence, migration, warnings and world-system changes arrive causally.
9. **Record provenance/maintenance:** the founded place has history, dependencies and failure modes.

### 11.2 Founding invariants

- No inhabitant is created as an ownership appendage of the founder.
- No territory becomes legally or socially owned because an engine lease reserved its volume.
- Matter, source and external contribution remain attributed.
- A copied template does not copy numerical identity, unique artifacts, relationships or claims.
- The new topology cannot insert routes into committed past.
- A refuge guarantee states capacity, evidence, exclusions and failure conditions.
- Abandonment, founder death, save/load and detail demotion do not freeze maintenance or erase inhabitants.
- NPC founders with isomorphic operations receive the same law.

### 11.3 Founding failures that must remain playable

- stable but uninhabitable topology;
- habitable region with unsustainable dependencies;
- partial route formation isolating workers or populations;
- contested claims and migration;
- law/field incompatibility under the selected ontology;
- resource exhaustion after an irreversible milestone;
- catastrophe triggered by pressure, topology or ecology change;
- founder incapacitation, death, possession or identity dispute; and
- successful founding whose long-term culture rejects the founder's intended purpose.

---

## 12. Apex operation family: world destruction and severance

### 12.1 Destruction is a typed predicate

“Destroy world” may mean structural fragmentation, loss of habitability, topology severance, ecosystem collapse, field failure, route isolation, institutional extinction, or a selected ontological ending. These are not equivalent.

`WORLD-SEVER-v0.1` must declare:

- exact destruction predicate and scope;
- source intent or physical cause;
- preparation and irreversible commitment;
- propagation and earliest-arrival bounds;
- topology and field interactions;
- warnings available through actual channels;
- shelters, routes, counters and intervention windows;
- identity/remains/ecology/history treatment;
- local impact transactions;
- remnant topology and long recovery/finality; and
- responsibility/evidence records.

Every qualifying action joins `CatastropheContract-v0.1`.

### 12.2 No global affected set

Source commitment records a conservative hazard envelope, not a frozen victim list. Arrival-time `IntersectionCertificate[]` resolves who and what is actually present using revisioned trajectories, shelters, vehicles, births, deaths, possession, custody, evacuation and topology.

A person can flee, enter, hide, be carried, die earlier, be resurrected under a selected model, or cross a boundary. The system must resolve the actual state, not the source-time snapshot.

### 12.3 Destruction invariants

- Distant targets change only at lawful arrival/transition instants.
- Destroyed presentation chunks do not erase identity, evidence or remains.
- A world root is never deleted while incoming/outgoing routes, debts, descendants or pending operations reference it.
- Survivors and losses are consequences of ordinary actions and conditions, not protagonist protection.
- Rebuilding does not restore destroyed persons/items by reusing procedural identifiers.
- Offscreen and renderer-disabled runs produce the same canonical outcomes.
- Partial prevention remains meaningful: survivors, evidence, ecology, routes, culture, responsibility and future possibility may differ even if the world predicate ultimately fails.

---

## 13. Apex operation family: time domains

### 13.1 Time-domain contract

A time domain is not a scene with a different `deltaTime`. Candidate `TIME-DOMAIN-v0.1` records:

```text
DomainBoundary / TopologyRevision
InternalToExternalInstantMapping
EntryAndExitPredicates
SignalsMatterAgencyAndFieldCrossingRules
AgingMetabolismCultivationAndMaintenanceRules
ExternalCommitmentAndDeadlineMapping
CapacitySourceStabilityAndFailure
ObservationAndWarningSemantics
SavePauseAdvanceAndCatchUpBehavior
IdentityContinuityDependencies
```

Until cosmology selects otherwise, mappings must be monotonic and causal. Closed timelike curves, retroactive edits, duplicate exits or branches that exchange resources with their own past are prohibited rather than hand-waved.

### 13.2 Anti-exploit obligations

- Faster internal time also advances declared aging, metabolism, maintenance, ecology, injury, debt and labor.
- External markets, oaths, wars and relationships continue according to the boundary mapping.
- No free infinite training, crafting, farming or policy computation.
- Pausing the game freezes all canonical domains; it is not an in-world time technique.
- Save/load does not extend a lease, reroll an exit or duplicate boundary-crossing items.
- People entering/exiting retain identity/custody records according to the selected ontology.
- Signals and warnings cannot cross faster than the declared interface.
- Domain collapse commits boundary arrivals and trapped/escaping occupants exactly once.

### 13.3 Nested-domain bound

The initial candidate architecture admits at most four nested active time-domain boundaries in one operation chain, matching the semantic nesting bound. Deeper cosmology requires a separately reviewed analytical reduction. Recursion that cannot produce a conservative next-event bound is non-executable.

---

## 14. Apex identity, death and continuity stress

The architecture remains compatible with the published identity candidates by separating:

- body and embodiment;
- agency and control;
- memory and psychological structure;
- ontic identity resolution;
- domain-specific continuity judgments;
- causal/copy lineage;
- social/legal/ritual recognition;
- cultivation continuity;
- viewpoint continuation; and
- player memory.

World-scale operations intensify rather than waive these distinctions.

### 14.1 Required transactions

- copied world containing a copied population while the source remains;
- founder dies during a partially committed world transaction;
- possessor and host cross a time-domain boundary at different phases;
- a world is severed while resurrection/reincarnation processes are pending;
- one person has valid claims in two topology scopes that later merge;
- postmortem ecology persists after the world that supported its institutions is lost;
- a viewpoint successor inherits access to play but not automatic numerical identity, memory, property, office, blame or cultivation;
- two lawful successors make rival claims after fission; and
- a copied unique artifact or anchor fails the selected uniqueness/identity rule without data loss.

### 14.2 Architecture invariant

No generic `alive`, `soulId`, `ownerId` or `isPlayer` field can settle these outcomes. Each selected ontology must supply falsifiable transition rules and migrations. Unselected fields remain unknown and block only dependent operations.

---

## 15. Micro-to-macro permanent fixtures

| Fixture | Scale transition | Required result |
|---|---|---|
| `APEX-MICRO-01` | one tool edge cuts one marked material relation | geometry, force, material, custody, debris and injury resolve without realm/scalar shortcuts |
| `APEX-HOUSE-01` | household fire becomes site process | named occupants, routes, smoke/heat fronts, warnings and property claims survive demotion |
| `APEX-REGION-01` | watershed/route failure crosses multiple settlements | cohort totals, named exceptions, migration and evidence refine consistently |
| `APEX-SEAM-01` | two independently generated regions promote at one boundary | topology, history, field flux, roads and claims join without filler contradiction |
| `APEX-FIELD-01` | analytical world-scale front enters local S4 play | arrival and local effects match envelope, boundary and prior measurements |
| `APEX-FOUND-01` | world founding with existing routes and occupants | no ex nihilo ownership/identity; partial milestones, sources and aftermath persist |
| `APEX-FOUND-02` | founder dies, unloads and reloads mid-commit | transaction continues or fails by contract; no refund, orphaned duplicate or frozen maintenance |
| `APEX-SEVER-01` | world-destruction cause propagates across moving topology | no frozen affected set; arrival intersections resolve exactly once |
| `APEX-SEVER-02` | partial defense cannot save the world predicate | changed survivors/evidence/ecology/routes and responsibility remain canonical |
| `APEX-TIME-01` | one year inside a faster domain versus outside economy | labor, aging, supplies, promises and boundary signals close without free resources |
| `APEX-TIME-02` | nested domain collapses during save/load | exits, occupants, items, costs and timestamps occur once |
| `APEX-ID-01` | copied inhabited world | copied structures do not silently copy numerical identities, ownership or unique claims |
| `APEX-ID-02` | possession/reincarnation during world severance | each model yields its declared result; simulation detail cannot decide personhood |
| `APEX-LONG-01` | 1,000 no-player years then local promotion | all protected history queries and named exceptions remain consistent |
| `APEX-ORDER-01` | same history at 1×, Advance, varied workers and renderer off | identical canonical event order and root hash |
| `APEX-HW-01` | worst admitted local scene plus distant catastrophe | safe 30 fps floor or visible bounded degradation; never canonical loss |
| `APEX-SAVE-01` | save at every prepare/commit/propagate/arrival barrier | reload converges without duplication, reroll or event loss |
| `APEX-GEN-01` | unrelated distant generation inserted | unaffected causal-domain manifests and histories remain byte-identical |

Any protected mismatch, nontermination, hidden-information leak, player/NPC law difference, duplicate/lost identity, stale topology commit or renderer-dependent outcome is S0/S1 regardless of visual quality.

---

## 16. Explicitly impossible or rejected designs

The following are prohibited unless future evidence replaces the underlying architecture with something equally falsifiable:

1. **Uniform full-fidelity universe simulation.** CPU, memory and storage are impossible on the reference machine, and it adds detail without protecting meaning.
2. **Every NPC thinking every frame.** Distant agents need schedules, institutions, cohorts and event-driven decisions with named exceptions.
3. **Planet-wide high-resolution voxels.** Use sparse operations, strata, fields and local realization.
4. **One global floating coordinate system.** Precision and non-Euclidean topology fail at cosmic scale.
5. **GPU-authoritative world truth.** Device variance, scheduling and loss make it unsuitable for canonical order unless independently certified.
6. **A save file that is only a seed.** It cannot preserve observation, agency, identity, partial transactions or historical consequences.
7. **Traversal-order procedural generation.** Unrelated edits would rekey reality.
8. **Unbounded rejection sampling.** Constraint failure must terminate with a certificate.
9. **Unbounded technique or doctrine recursion.** Same-instant closure remains capped with conservative reducers.
10. **Apex verbs as scene APIs.** `spawn`, `teleport`, `delete`, `freezeTime`, `setOwner`, `makeSafe` or `resurrect` cannot be world mechanics without ordinary semantic contracts.
11. **Instant global catastrophe mutation.** Source commitment, propagation, local arrival and aftermath must remain separate.
12. **Frozen catastrophe victim sets.** Occupancy and identity resolve at arrival.
13. **LOD-dependent causality or personhood.** Demotion cannot decide who exists, owns, remembers, suffers or survives.
14. **Procedural canon invention.** Unknown ontology cannot be filled by an LLM, noise function, asset generator or convenience heuristic.
15. **Universal scalar aura/domain contests.** Typed relations, evidence, geometry, sources and counters remain necessary.
16. **Perfect automatic safety or targeting.** Player intent cannot reveal hidden state or guarantee outcomes.
17. **Free time-domain economy.** Labor, aging, inputs, boundary commitments and maintenance must close.
18. **World founding as empty real estate.** Existing inhabitants, ecology, claims and history cannot be omitted.
19. **World destruction as garbage collection.** Remnants, references, victims, routes, debts and history persist.
20. **A fake infinity claim.** The game may support open-ended generation under bounded local work; it cannot promise actually infinite realized content, storage or computation.
21. **AAA fidelity as a design assumption.** Visual targets require measured budgets, art production and fallback tiers; prose cannot certify them.
22. **Reference-hardware promises without executable benchmarks.** All figures in this review remain hypotheses until authorized measurement.

---

## 17. Risk register and required evidence

| Risk | Why it is apex-critical | Required evidence before promotion |
|---|---|---|
| semantic operations become wrappers around bespoke exceptions | high realms become authorial cheats | normalized operation graphs, NPC parity and removal tests |
| topology/field promotion produces seams | universe feels generated and contradicts itself | independent-region seam, portal, route and frontier fixtures |
| analytical solvers erase individuals | living world becomes aggregate theater | named-exception and future-refinement parity across S0↔S4 |
| persistence grows without bound | long-lived save becomes unusable | history-query quotas, compaction, export/restore and 1,000-year tests |
| endgame actions block the browser | spectacle becomes noninteractive | chunked progress, pause/cancel barriers and reference-hardware traces |
| high-realm controls become menu labor | power removes action play | E2/E3/E4 macro workload and accessibility evidence |
| generator creates attractive noise | places lack causal identity | motif/dependency, counterfactual and investigation tests |
| world founding becomes colonial ownership by default | severe agency/cultural failure | inhabitants/claims/consent and alternative founding contracts |
| destruction creates protagonist immunity | stakes become fake | opening/later admission distinction and post-commit parity tests |
| time domains create infinite economy | one mechanic dominates all systems | labor/aging/market/boundary conservation fixtures |
| identity breaks under copying or destruction | saves, successors and reincarnation corrupt | selected-model cross-product and exact migration tests |
| renderer leaks or changes truth | device and graphics settings change play | renderer-off/device-loss/hash-parity suite |
| memory profile assumes nominal 8 GB is free | browser crashes or thrashes | cold/warm long-session working-set measurements |

---

## 18. Promotion gates

This architecture may advance to a prototype proposal only when:

1. a finite Phase Scope Manifest names the operation, topology, field and identity candidates under test;
2. every dependent ontology is selected or explicitly typed unknown with dependent fixtures left `NOT RUN`;
3. `APEX-OP-v0.1` maps losslessly into existing semantic action and transaction contracts;
4. topology patches, coordinate transforms and field boundaries have exact revision and seam rules;
5. promotion/demotion preserves declared protected queries across at least local, regional and world-scale fixtures;
6. world founding, destruction and time-domain contracts terminate within declared specification bounds;
7. identity/death fixtures produce distinct, model-predicted outcomes without `isPlayer` privilege;
8. generation terminates, preserves unaffected causal domains and passes cultural/originality boundaries;
9. save/load at every apex barrier converges;
10. renderer-off, worker-count, frame-rate and device-loss tests preserve canonical hashes;
11. the reference-hardware budget is measured in an explicitly authorized prototype rather than inferred; and
12. independent technical, gameplay, cultural/source and graph-consistency reviews return zero S0/S1.

Passing this review does not authorize production. It permits only a bounded prototype proposal for the smallest unresolved risk.

---

## 19. Open dependencies and handoff

The following remain prerequisites rather than generator freedom:

- selected cosmological topology candidates and maximum-realm ontology;
- world pattern, *fa*/method, Dao/path, domain and cross-realm contest candidates;
- qi/field and matter-coupling ontology;
- identity/death/reincarnation selection;
- protagonist operation selection or explicit no-advantage baseline;
- perception, concealment and evidence contract;
- custody, ownership, remains and storage contract;
- terrain/material/topology contract beyond the current stress interface;
- culture, language, institutions and first-region research;
- explicit authorized benchmark/prototype plan; and
- user ratification of every world-defining fork.

The next technical artifact should not be a universe engine. It should be one bounded **causal-scale laboratory** that proves the same semantic operation can cross local, regional and world analytical representations, survive save/load and renderer removal, and reproduce protected outcomes on the reference machine. World founding, world destruction and time-domain play remain paper contracts until their dependencies and smaller-scale invariants pass.
