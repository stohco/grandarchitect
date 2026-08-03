# Semantic Action Contracts & Executable Lore Schema v0.1

**Status:** pre-canon technical-design foundation; storage- and engine-neutral  
**Date:** 2026-08-02  
**Rule:** lore is executable specification, not decoration

---

## 0. Core architecture

An item, technique, creature, formation, ritual, environmental process, institution, or law may make a declarative claim only when its semantic contract entails that claim.

```text
Canon definition
→ semantic action contract
→ law-resolved action plan
→ canonical world mutations and aftermath
→ observer-specific perception and records
→ Three.js/WebGPU presentation
```

Rendering is downstream evidence of world state. It never decides canonical truth.

If a seal says it summons an upside-down mountain, successful use must create a mountain-class construct, invert it in a defined reference frame, and resolve physical, energetic, ecological, social, historical, and persistent consequences. A colored area of effect plus generic damage is not a valid implementation.

---

## 1. Definition, instance, and outcome

### Action definition

The immutable, versioned capability: what an entity can attempt under stated laws.

### Action instance

One invocation with actor, source, targets, frame, law context, deterministic seed, time, and reserved costs.

### Outcome record

What actually happened after resources, obstructions, counters, law conflicts, collisions, partial success, interruption, and secondary consequences.

Descriptions use these levels carefully:

- **Definition:** “Can summon an inverted mountain above a marked place.”
- **Failed outcome:** “The seal attempted to open, but the local earth law denied manifestation.”
- **Partial outcome:** “Only the peak emerged before the spatial anchor broke.”
- **Successful outcome:** “An inverted stone peak manifested overhead and began to descend.”

Item and skill encyclopedia text is generated from the definition. Combat narration, witness accounts, and history are generated from outcomes and observer access.

---

## 2. Required contract sections

| Section | Required meaning |
|---|---|
| Identity | Stable ID, immutable revision, canon release, semantic hash. |
| Capability certificate | Actor realm-envelope revision, protagonist-exception reference if any, required capability vector, band checks, and contribution ledger. |
| Declared capability | Structured predicates the English description may express. |
| Preconditions | Actor state, realm, training, body, posture, location, law, permission. |
| Source ledger | Origin of matter, energy, information, soul, authority, and causal permission. |
| Costs | What is consumed, reserved, borrowed, transformed, damaged, risked, or owed. |
| Frame | Realm, gravity, actor, target, construct, causal, or other coordinate/reference frame. |
| Target contract | Domain, query, filters, range, line, count, ordering, and tie-breaking. |
| Scale profile | Independent dimensions; never only one “power level.” |
| Effect graph | Typed, bounded composition of semantic primitives. |
| Temporal phases | Preparation, commitment, manifestation, propagation, contact, sustain, decay, aftermath. |
| Causality policy | Direct, derived, delayed, conditional, probabilistic, and secondary effects. |
| Interaction contract | Solids, terrain, fluids, atmosphere, ecology, bodies, souls, formations, topology, institutions. |
| Counters | Interception stage, mechanism, capacity, authority, and residual result. |
| Failure modes | Invalid, insufficient, obstructed, unstable, partial, interrupted, backlash, unsupported. |
| Perception | Signals emitted and senses capable of receiving them. |
| Evidence | Residues, witnesses, memories, records, causal marks, and forensic traces. |
| Persistence | Separate lifetime, durability, save, unload, expiry, and recovery behavior. |
| Determinism | Seed derivation, target ordering, version and law pinning. |
| Simulation policy | Canonical fidelity required at each simulation tier. |
| Presentation policy | Permitted geometry, VFX, sound, text, UI, map, and reduced-tier representations. |
| Complexity envelope | Maximum expansion, targets, events, persistence, geometry, and causal depth. |
| Description contract | English lexical claims entailed by behavior. |
| Validation suite | Static, property, scenario, metamorphic, differential, mutation, and causal-trace tests. |

---

## 3. Executable entity facets

An entity is not only a rendered model. It may have six independent facets.

### Physical

Geometry, topology, material composition, mass, density, integrity, temperature, phase, inertia, collision, surface, interior, and footprint.

### Energetic

Reservoirs, affinities, conversion, flow capacity, pressure, radiation, heat, emission, storage, replenishment, and contamination.

### Spiritual

Consciousness, soul coherence, intent, channels, possession, reincarnation relations, spiritual injury, perception, and defense.

### Causal

Oaths, debts, creator relationship, ownership history, summoning anchors, fate links, responsibility, blame, temporal continuity, and law authority.

### Social

Name, identity, faction, office, status, legality, reputation, obligations, rights, and recognized ownership.

### Informational

Memories, inscriptions, recipes, signatures, secrets, records, proofs, classifications, false beliefs, and access restrictions.

Required entity data includes stable identity, ontology classes, geometry/frame, source and transformation provenance, material batches, reservoirs, capabilities, affordances, perception signatures, relationships, persistence/deaggregation, canonical LOD proxies, presentation bindings, and English terminology.

A mountain can be one hierarchical construct rather than trillions of rocks. If fractured, it deterministically deaggregates into terrain deformation, major named fragments, debris fields, dust, and aggregate material while conserving contract-relevant quantities and history.

---

## 4. Composable semantic primitives

The vocabulary should be closed, typed, declarative, versioned, and intentionally non-Turing-complete. New primitives require canon and production review because they expand the universe’s verb grammar.

### Query and binding

`locate`, `select`, `filter`, `rank`, `bind`, `trace`, `observe`, `sample_deterministically`

### Entity and material

`instantiate`, `transport`, `assemble`, `separate`, `merge`, `transform_geometry`, `transmute_material`, `change_phase`, `alter_structural_integrity`, `destroy_structure`

### Motion and force

`translate`, `rotate`, `anchor`, `release`, `apply_force`, `apply_impulse`, `constrain_motion`, `redirect_trajectory`

### Energy and fields

`withdraw_energy`, `inject_energy`, `convert_energy`, `emit_field`, `attenuate_field`, `bind_flow`, `sever_flow`, `store`, `discharge`

### Space, time, and topology

`open_connection`, `close_connection`, `fold_region`, `contain_region`, `expand_interior`, `phase_shift`, `alter_clock_rate`, `sever_topological_link`

### Life, soul, body, and information

`alter_integrity`, `heal_structure`, `grow`, `decay`, `alter_channel`, `alter_soul_coherence`, `transfer_memory`, `erase_information`, `imprint_mark`

### Social and causal

`propose_transfer`, `recognize_transfer`, `create_covenant`, `record_obligation`, `submit_claim`, `record_observation`, `emit_testimony`, `create_causal_link`, `sever_causal_link`

### Communication, learning, care, and consent

`utter`, `gesture`, `write_record`, `ask`, `answer`, `promise`, `refuse`, `consent`, `withdraw_consent`, `demonstrate`, `practice`, `correct`, `teach`, `learn`, `diagnose`, `care_for`, `administer_treatment`

### Labor, exchange, institution, and ritual

`perform_work`, `transform_input`, `offer_exchange`, `accept_exchange`, `contract`, `petition`, `adjudicate`, `appoint_office`, `remove_office`, `register`, `perform_ritual_role`, `contribute_offering`, `certify`, `appeal`

### Life cycle, migration, and ecological stewardship

`reproduce_where_lawful`, `develop`, `migrate`, `settle`, `cultivate_habitat`, `harvest`, `restore_habitat`, `manage_population`, `introduce_species`, `remove_species`

### Temporal composition

`begin_phase`, `schedule`, `pulse`, `sustain`, `branch_on_condition`, `terminate`, `leave_aftermath`

“Damage” is normally a derived result, not a universal primitive. A falling mountain harms through collision, fracture, pressure, heat, burial, disrupted channels, or a declared spiritual/causal operation. A law that directly decrees injury must specify affected facet, authority, target predicate, counter, and failure behavior.

These families are typed process vocabulary, not instant outcome buttons. Consent, learning, ownership, liability, office, reputation, and ritual efficacy require participant state, jurisdiction, procedure, knowledge, and possible disagreement. Ordinary witness status, blame, liability, and reputation are derived from perception, evidence, testimony, audience, and institutional processes; actions cannot directly manufacture them. A mind- or law-altering technique may change belief or recognized status only through an explicit authority-bearing contract with targets, costs, signals, counters, and causal provenance.

Compiled effect graphs are acyclic within one simulation tick. Recurrence has a finite count, strictly positive time advance, and a decreasing action/causal budget. Contracts cannot generate new contract definitions at runtime, expand targets without a bound/aggregate rule, or create zero-time recursive summons, reflections, portals, containers, or schedules.

Every primitive and relation has a versioned type signature, unit algebra, input/output cardinality, preconditions, postconditions, error states, conservation effects, law interfaces, evaluation order, and canonical trace format. Names such as `sever_flow`, `CAUSES`, or `COUNTERS` do not count as definitions. Two implementations comply only when they pass the same typed oracle and trace comparison.

---

## 5. Source and provenance ledgers

Every creation and transformation declares where substance and permission came from.

Every action also attributes capability separately to personal body/qi, protagonist exception, stored artifact, formation/ritual, ally, environment, local law, and borrowed authority. Preparation or external power may make an action lawful without becoming the actor's personal output; the outcome description preserves that distinction.

### Material provenance

- transported existing material;
- released from storage;
- assembled from local material;
- transmuted;
- condensed from energy;
- created by explicit law authority;
- projected nonmaterial construct;
- illusory representation; or
- ontically unresolved, which blocks ordinary authoring until a lawful hidden rule is defined.

### Energy provenance

Record reservoir, family/affinity, quantity or capacity class, withdrawal rate, conversion path and loss, replenishment, entropy/pollution/debt, ownership, permission, and trace.

Creation from nothing is allowed only when ratified law supports it. It still records authorizing law, jurisdiction, authority, limit, and aftermath. “The cultivator is powerful” is not provenance.

Matter, energy, souls, memory, information, causal authority, and recognized ownership have separate ledgers. Conversion between them requires an explicit world rule.

Ontic provenance and epistemic visibility are separate. The simulation must retain a lawful source, conversion, or bounded hidden rule even when the player, characters, or encyclopedia page currently says “unknown.” Mystery hides knowledge; it does not excuse missing causality.

---

## 6. Geometry, frames, and multidimensional scale

Every spatial action declares:

- shape or construct generator;
- dimensions and tolerances;
- material distribution;
- topology and interior rules;
- anchor point;
- reference frame and orientation basis;
- spatial extent;
- occupancy/collision representation;
- surface and internal affordances;
- aggregation and deaggregation.

“Upside-down” is invalid without a frame. For an inverted mountain:

- `up` may be the opposite of local gravity at the anchor;
- the canonical summit axis aligns with local `down`;
- the base plane faces local `up`;
- the source archetype’s normal orientation is recorded; and
- if gravity changes, the contract states whether orientation stays anchor-fixed or follows gravity.

Scale is independent dimensions:

- length, area, volume;
- mass, density, and structural integrity;
- range and affected extent;
- speed, acceleration, momentum, and pressure;
- duration and temporal resolution;
- energy, power, heat, flux, and field strength;
- qi density and affinity;
- bodily, channel, and soul potency;
- causal authority and law jurisdiction;
- information complexity and target count;
- precision;
- persistence; and
- social visibility and historical significance.

Cultivation realm constrains or transforms these dimensions; it never replaces them with one scalar rating.

### Protagonist capability invariant

The protagonist’s unique advantage is modeled as ordinary canonical entities, predicates, relationships, perception modes, or transformation rules. It passes through the same source ledgers, action phases, costs, counters, law resolution, persistence, and aftermath as NPC abilities. It may broaden which lawful action definitions are available or improve selected dimensions inside a realm envelope; it cannot invoke a player-only physics path.

Each realm envelope defines ordinary, exceptional, prepared/collective, and external-authority bands for destructive extent, force, speed, perception, creation, precision, duration, target count, law authority, and consequence radius. An early cultivator cannot split a huge mountain through personal output. A mountain-scale outcome at that stage requires a separately sufficient formation, environmental instability, collective act, borrowed artifact/authority, or similar cause whose cost and danger remain real.

---

## 7. Target selection

No contract uses undefined language such as “nearby enemies.” It specifies:

- eligible ontology types;
- spatial, topological, social, causal, or informational query;
- range and boundary inclusion;
- relationship test and the moment it is evaluated;
- visibility, line-of-effect, sensing, name, oath, or other link requirements;
- target snapshot: fixed, pulsed, or continuous;
- maximum count or lawful aggregation;
- stable ranking and tie-breaker;
- empty-target and overflow behavior;
- stochastic seed domain; and
- whether dead, hidden, phased, summoned, unborn, copied, or causally linked entities qualify.

Deterministic selection orders by stable semantic identity and declared ranking. Random selection operates on the deterministically ordered candidate set.

### 7.1 Simultaneous action transaction contract

Every action instance declares:

```text
fixed simulation tick and numeric profile
read set and snapshot revision
point, range, and predicate-read certificates
reserved resources and authorities
proposed write set
deterministic commit key
conflict and priority policy
partial-success or abort behavior
idempotency key plus mutation sequence IDs
atomic journal boundary
```

The resolver uses an explicitly serializable schedule. Each read certificate covers point reads, ranges, and predicates, including target eligibility, absence queries, law applicability, authority, ownership, capacity, and every phantom-sensitive selection. At commit it revalidates every certificate against writes earlier in the deterministic serialization order. Any changed point, added/removed range member, predicate change, or law/target-query phantom forces the action's declared abort or deterministic retry; write-set overlap is not the only conflict.

The resolver evaluates eligible actions against the pinned read snapshot, reserves costs uniquely, orders noncommutative commits by a canon-defined stable key, and applies declared reducers only for effects proven commutative and associative. Conflicting ownership, unique creation, target mutation, or resource writes must resolve, retry, partially commit by explicit contract, or abort. A retry preserves the logical action identity, random variates/seed namespace, and reservations; it cannot reroll outcomes or spend costs again. Prepare/commit markers, unique ledger constraints, and idempotency keys make costs and mutations exactly once across retry and crash recovery.

The numeric profile pins units, precision/quantization, rounding, overflow, integration step, approved analytic approximations, and nondeterministic operations that are excluded from canonical truth. It also pins canonical serialization: field/schema order, integer and fixed-decimal encoding, byte order, Unicode normalization, map/set sorting by stable semantic key, omission/default rules, and hash algorithm/version. Signed zero is normalized; NaN is prohibited in canonical state; infinities require an explicit typed sentinel; subnormal handling is pinned; transcendentals use release-pinned approximations, coefficients, domains, and error bounds. Reductions use a declared stable ordering and grouping tree rather than runtime iteration order.

Fields are classified `exact_canonical`, `bounded_analytic`, or `presentation_only`. Exact state produces an `exact_state_hash`. Bounded analytic state produces a separate `analytic_envelope_digest` over canonical bounds, confidence, method, and refinement commitments; it never shares or pretends to match an exact outcome hash. Differential replay requires identical exact hashes for exact partitions and uses named containment/overlap/error predicates for analytic partitions.

---

## 8. Temporal phases

Every action may include:

1. preparation;
2. commitment;
3. manifestation;
4. propagation;
5. contact;
6. sustain;
7. dissipation; and
8. aftermath.

Each phase declares clock domain, duration, precision, cancellation window, reserved/spent costs, interruption, maintenance, unload/save behavior, termination, cleanup, and persisted scheduled events.

In-world time reversal is not save rollback. It is an action with scope, authority, memory rules, identity effects, causal residue, counterplay, and cost.

---

## 9. Causality and aftermath

Every committed invocation gets an immutable action identity. Every mutation records:

```text
immediate cause
root action
primitive path
responsible actor
source ledger
target
world time
law context
prior and resulting state
confidence if approximated
persistence class
```

Typed systems resolve secondary consequences:

- collision, fracture, collapse, displacement, burial, debris;
- air pressure, dust, sound, heat, smoke, and light;
- water obstruction, flooding, river change, contamination;
- habitat loss, migration, succession, extinction, and resources;
- flow-vein obstruction, redirection, and climate change;
- body, soul, oath, causal, memory, and identity effects;
- ownership violation, crime, blame, institutional response, rumor, and history.

Social knowledge never propagates magically. A person reacts only through perception, testimony, records, institutional communication, causal sensing, or an explicit world-law channel.

Causal recursion is bounded. When detail exceeds the active budget, the cascade becomes an aggregate consequence record with conserved quantities and deterministic instructions for later deaggregation.

---

## 10. Counters and failures

A counter declares which stage it intercepts:

- acquisition;
- cost reservation;
- preparation/channeling;
- manifestation;
- propagation;
- contact;
- sustain;
- persistence; or
- aftermath.

Counter outcomes include cancel, attenuate, deflect, redirect, convert, capture, reflect, delay, seal, create a local exception, or leave overflow.

Resolution compares relevant dimensions—coverage, affinity, capacity, structure, timing, authority, topology, knowledge—not only realm.

Mandatory failure families:

- invalid, missing, changed, or vanished target;
- insufficient, contaminated, stolen, or incompatible source;
- permission or ownership denial;
- local-law conflict;
- frame/anchor instability;
- obstruction;
- partial or complete counter;
- overflow;
- interrupted sustain;
- unstable conversion;
- backlash;
- partial manifestation; and
- unsupported semantic or computational complexity.

Performance pressure may select a coarser semantically equivalent representation. It may not replace a mountain with generic damage. When no equivalent exists, the action is explicitly constrained, staged, queued, rejected during authoring, or fails for an in-world reason.

---

## 11. Perception, witness, evidence, and description authority

Truth, perception, and belief are separate.

Signal channels include visible light, sound/vibration, heat, pressure, residue, qi signature, soul pressure, gravity/space disturbance, causal omen, and law notification. Each signal declares origin, strength, propagation, attenuation, occlusion, duration, and signature.

Sensors declare channel, sensitivity, resolution, attention, knowledge, interpretation, and susceptibility to deception.

Witness records store:

- what was detectable;
- what was perceived;
- confidence and uncertainty;
- attribution;
- later memory change;
- illusion, bias, suppression, or forgery; and
- testimony chain.

Evidence can be craters, residue, signatures, damaged formations, memories, recordings, divination, causal imprints, displaced material, altered ecology, or missing things. Each has provenance, decay, falsifiability, and access rules.

Description permissions:

- first-person perception;
- witness report;
- character inference;
- mechanical player summary;
- historical synthesis; and
- omniscient canon definition.

A hidden soul strike may be real without visible spectacle. An illusion may be spectacular without physical collision. The text must reflect the narrator’s permission, not leak omniscient truth.

---

## 12. Persistence, replay, and determinism

Lifetime and durability are separate:

- `lifetime_scope`: until phase end, encounter end, stated world time, condition, explicit removal, or permanent;
- `durability`: presentation-only, canonical transient, save-required, or permanent/world-law;
- `durable_until` and `expiry_condition`;
- `save_behavior`, `unload_behavior`, and `recovery_behavior`.

Every canonical state active at save time is serialized or reconstructible from a committed event, even if it is short-lived. Saving during an encounter cannot erase a cost, projectile, ritual, status, summoned entity, or scheduled aftermath.

Durable actions store definition/law versions, instance ID, seed, inputs, targets, transactions, mutation ledger, scheduled continuations, aggregate aftermath, witness/evidence creation, and semantic checksums.

Replay uses snapshots plus an append-only event journal. Each action has an instance ID, phase/sequence IDs, prepare/commit markers, unique ledger constraints, and exactly-once mutation application. Recovery reconciles incomplete prepares before play resumes. An instance ID alone is not treated as transaction safety.

Seed namespaces are split. Selection seeds derive from world seed, action revision, instance identity, actor identity, world tick, pinned law revision, and purpose—never from a target that has not yet been selected. After deterministic selection, per-target effect seeds additionally include target identity and primitive path.

Gameplay randomness and presentation randomness are separate. Terrain scars, target selection, named fragments, persistent residue, and fracture macrostructure use canonical seeds. Sparks and cosmetic dust may use presentation seeds. Entity iteration order must not affect truth.

---

## 13. Simulation and presentation tiers

### Residency/fidelity tiers

| Tier | Representation |
|---|---|
| **F0 Dormant** | Stable state, scheduled obligations, deterministic catch-up. |
| **F1 Historical** | Aggregate pressures, demographics, institutions, ecologies, and major events. |
| **F2 Regional** | Cohorts, flows, goals, ownership, named entities, and conflicts. |
| **F3 Interactive** | Active bodies, actions, fields, navigation, and individual decisions. |
| **F4 Detailed** | Contract-relevant fracture, fluid/terrain detail, and significant debris. |

Every tier still resolves the orthogonal layers `Law → Aggregate → Interactive where required → Presentation`. Each contract defines `protected_invariants`, supported query classes per tier, unresolved-detail fields, aggregate error envelopes, and refinement commitments. Promotion may reveal deterministically seeded detail but cannot change protected identities, ledgers, causal order, unique ownership, named outcomes, or previously bounded aggregate facts. A dormant mountain remains a mountain with conserved extent, material, occupancy, environmental influence, ownership, and history even when fine fracture queries are unresolved.

### Cross-tier action protocol

Before the action read snapshot is taken, the resolver compiles a versioned `TierResolutionPlan` from the action's required query classes, precision, consequence radius, participants, target search, protected invariants, timing deadline, and budget:

1. Resolve at current tiers only if every required query is supported and the declared analytic errors compose inside the action's acceptance envelope.
2. Otherwise promote the minimum affected state to the minimum sufficient tier, materialize deterministic detail, and include the promotion writes and base hashes in the same prepare/commit boundary.
3. If promotion exceeds budget, use an approved analytic resolver only when its contract covers this action and its result envelope is sufficient.
4. If neither path is valid, defer only when the action's timing contract permits it and reservations remain durable; otherwise stage the action or abort with an explicit reason. Silent approximation is forbidden.

The plan, participant tiers, supported-query proof, chosen path, error composition, promotions, reservations, and demotion/refinement commitments are transaction reads/writes. A tier or base revision change before commit invalidates the plan and causes the same deterministic retry rules as any other phantom-sensitive read.

### Presentation tiers

- hero geometry and full effects;
- simplified geometry and emitters;
- HLOD/impostor;
- map, silhouette, shadow, omen, or sensory representation; and
- no current rendering while canonically present.

Three.js receives presentation packets from canonical state. WebGPU/TSL may support animation, particles, vegetation, skinning, or visual fields, but GPU output does not decide targets, collision, persistence, or history. Three.js documents TSL and its WebGPU renderer as its evolving WebGPU presentation path ([TSL](https://threejs.org/docs/TSL.html), [WebGPURenderer manual](https://threejs.org/manual/en/webgpurenderer)).

Canonical illumination/occlusion is a coarse simulation field used by ecology, stealth, schedules, senses, and witness queries. Renderer shadow maps approximate that state but never create or erase it.

---

## 14. English descriptions generated from behavior

Descriptions are lexicalizations of versioned `DescriptionClaim` records. Each claim stores typed predicate, quantifier, jurisdiction, clock, numeric/category threshold, modality, exceptions, approved term revisions, and exact paths into the action/entity contract.

Publication additionally requires an immutable governed `DescriptionEntailmentResult`. It binds the exact `DescriptionClaim`, action/entity contract, law context, ontology, approved-term, numeric-profile, and validator revisions; records assumptions, jurisdiction, proof strategy, contract paths, finite-eligibility certificate where needed, witness model or minimized counterexample, result, reviewer, generated time, expiry, and reopening conditions; and carries its own canonical digest. A path is evidence input, not proof. Any bound revision change or expired assumption reopens the result and blocks publication until a new passing revision exists.

| English claim | Required predicate |
|---|---|
| “summons” | A stored, remote, transformed, or law-created entity becomes present with provenance. |
| “mountain” | The construct satisfies the project’s mountain taxonomy thresholds. |
| “upside-down” | Its canonical orientation is inverted in a declared frame. |
| “crushes” | Outcomes include contact pressure, integrity failure, or burial. |
| “eternal within this domain/law” | No expiry or decay exists within the explicitly named scope; unqualified “eternal” is prohibited. |
| “appears instantaneous to mortal perception” | Manifestation fits the named observer/clock threshold; unqualified “instantaneous” requires zero elapsed canonical time. |
| “every eligible target” | Exact finite eligibility universe and exhaustive query exist; subjective “enemy” classifications name whose relation is used. |
| “ignores distance” | Selection is nonspatial or uses explicit topology/causal connection. |
| “cannot be blocked” | No lawful counter exists at the stated stage and scope. |
| “world-shaking” | A defined seismic, pressure, perception, or jurisdiction threshold is met. |

Absolute words are linted aggressively. “No known mortal barrier can stop it” is usually more truthful than “unstoppable.”

An exhaustive quantifier such as “every” requires a finite eligibility universe pinned to world snapshot, canon release, ontology revision, selection time, jurisdiction, and authority ceiling, plus a selection certificate recording counts and excluded categories. If that proof cannot exist, the wording is prohibited or narrowed. Free paraphrase must resolve to the same approved claim set before publication.

Player-facing text uses established English-language xianxia vocabulary. Terms such as qi, Qi Condensation, Dao, yin–yang, spiritual roots, meridians, cultivation, and tribulation remain familiar and need no substitute. Evidence records preserve original Hanzi, tonal pinyin, literal/contextual glosses, historical range, genre use, and alternatives so niche romanizations can be translated accurately. Action definitions pin approved term revisions; an uncommon retained romanization needs a contextual rationale and, where relevant, bilingual/cultural review.

Flavor text may vary but cannot introduce abilities, scope, history, or facts absent from the contract.

---

## 15. Complexity envelopes

Every compiled contract estimates:

- primitive count and branch depth;
- target cardinality;
- persistent identities created;
- dynamic collision bodies;
- geometry and terrain cells;
- field extent;
- scheduled events;
- causal fan-out and depth;
- witnesses resolved individually;
- persistence growth;
- aggregation/deaggregation cost; and
- presentation cost.

Budgets are execution controls, not lore limits. A formation spanning a billion miles can exist as a small number of semantic regions, boundaries, fields, and law relations rather than billions of objects. Higher realms gain scale through aggregate primitives, authority, and consequence—not object spam.

Initial platform-independent semantic admission profile, to be revised by later benchmarks:

| Dimension | Initial hard ceiling per active action |
|---|---:|
| Primitive nodes | 256 |
| Conditional depth | 16 |
| Scheduled recurrence | 1,024 firings with positive time advance |
| Causal cascade depth | 12 before aggregate resolution |
| Explicit active targets | 4,096 |
| Persistent identities created | 1,024 |
| Immediately active dynamic bodies | 256 |
| Individually resolved witnesses | 512, then cohort aggregation |
| Canonical writes in one commit | 50,000 before staged/aggregate resolution |

Every nested action carries a decreasing budget. Per-tick quotas, aggregate error, and platform presentation profiles are separate versioned Production records. Exceeding a semantic ceiling causes compile-time rejection, mandatory staging, or an analytic aggregate representation—not silent truncation.

A production implementation later returns one of:

- `exact_supported`;
- `analytic_equivalent`;
- `deferred_streaming`;
- `requires_staging`;
- `unsupported`.

Unsupported contracts cannot publish descriptions claiming the behavior.

---

## 16. Law contexts and player law-authorship

Actions resolve through layered law context:

1. universal meta-laws;
2. cosmological/realm laws;
3. world and regional laws;
4. domain, formation, pocket-space, or institutional laws;
5. entity constitutions and cultivation doctrines;
6. temporary edicts and techniques;
7. explicit exceptions.

Every law declares jurisdiction, subjects, allowed transformations, conservation/conversion, authority, priority, conflict policy, cost, enforcement, counters, valid time, perception, stability, and failure.

### Deterministic law resolver

1. Pin the complete applicable `LawContext` revision when an action phase begins.
2. Filter laws by world time, jurisdiction, subject, and condition.
3. Order authority by an explicit acyclic partial order, then specificity and canon-defined priority; recency has no power unless a higher law grants it. This establishes precedence but does not by itself define the composition of incomparable transformations.
4. Apply declared `EXCEPTION_TO` relations before ordinary composition.
5. Reject authority cycles during law admission.
6. Every applicable law pair must either be precedence-ordered, carry a reviewed proof that its transformations compose commutatively and associatively over the shared state, or declare an explicit pair outcome and composition order. Compatible but noncommutative transformations require an acyclic `COMPOSES_BEFORE` relation.
7. Equal-authority or authority-incomparable incompatible laws must name a deterministic result: reject, mutually suppress, partition scope, create instability, or defer to a higher adjudicator. No implicit tie-breaking.
8. The resolver deterministically completes any remaining execution order with stable immutable law-revision identity, but this total extension grants no authority and is legal only for transformations already proven commutative/associative. Any otherwise unresolved pair yields `invalid_law_context`: both disputed transformations are suppressed and the dependent action aborts. Canon admission and player-law staging reject a context that can reach this fallback.
9. Each action phase declares whether it remains snapshot-bound or re-resolves at its boundary. A law changing mid-phase cannot silently rewrite already committed causality.
10. Store the applicability set, authority proof, pairwise composition proofs/outcomes, total execution order, conflicts, fallback status, and resolution proof in the outcome record.

Player-authored overlays compile and validate in a staged transaction. Their complete impact neighborhood, authority cycles, equal-rank conflicts, budgets, migrations, and failure policy are reviewed before atomic enactment.

An overlay must fit the actor's current law-authority dimension and jurisdiction envelope. Protagonist exceptionalism cannot bypass authority, composition, or conflict resolution unless its own ratified contract explicitly contributes a bounded authority source.

At very high cultivation, the player may create a runtime law overlay containing:

- jurisdiction;
- subject and condition;
- transformation, permission, or prohibition;
- authority source;
- energetic, causal, social, or tribulation cost;
- duration;
- exceptions;
- conflict resolution;
- stability;
- complexity envelope; and
- semantic tests.

The authoring interface previews affected entities, techniques, ecosystems, institutions, loopholes, contradictions, migrations, and likely resistance. It accepts controlled declarative clauses, not arbitrary scripting.

A player-authored law is persistent world state. It does not alter the project Canon Graph. Canon defines the meta-law permitting the player to author it.

---

## 17. Validation suite

### Static

- references, units, types, frames, and orientations resolve;
- provenance balances for matter, energy, identity, soul, authority, and ownership;
- target sets are bounded or aggregatable;
- loops and causal recursion are bounded;
- law interfaces, persistence, version, and failure policies exist;
- every material description claim is entailed; and
- player-facing terminology resolves to the approved seasoned-reader xianxia lexicon.
- every law set has an acyclic deterministic resolution proof;
- every published material claim has a current passing immutable `DescriptionEntailmentResult`;
- every action has a transaction and recovery contract; and
- every action schedule validates point, range, predicate, law, and target-query reads serializably;
- every tier declares protected invariants, supported queries, error envelopes, and refinement commitments.
- every cross-tier action has a valid transactional `TierResolutionPlan`;
- player/NPC parity holds for identical canonical state;
- every realm-band hard ceiling and contribution vector validates;
- Qi Condensation personal output fails huge-mountain-splitting predicates; and
- prepared and external-authority feats are possible only when their ledgers cover the missing capability and remain correctly attributed.

### Property and metamorphic

- same inputs, seed, and versions produce the same canonical result;
- unrelated entity ordering does not affect selection;
- translating/rotating a scenario preserves frame-relative behavior;
- LOD changes preserve semantic state and conserved quantities;
- aggregate/deaggregate cycles conserve contract-relevant facts;
- costs apply exactly once;
- counter overflow cannot create negative resources;
- save/reload cannot duplicate entities or scheduled effects;
- presentation settings cannot alter outcome hashes; and
- paraphrased English descriptions preserve the same predicates.

### Scenario

Every action is tested in empty space, invalid target, boundary range, obstruction, insufficient/partial source, friendly/hostile targets, hidden witness, weak/strong counter, law variation, unload/reload during each phase, simultaneous invocation, terrain, water, settlement, ecology, aftermath, and a law change during sustain.

### Adversarial

- self-target recursion;
- summon/clone explosion;
- nested portals and containers;
- zero-duration event loop;
- contradictory law overlays;
- infinite reflection;
- target mutation during selection;
- rollback duplication;
- terrain-collapse cascade; and
- rumor propagation without original observation.

Every accepted action retains golden causal traces and a description-truth report.

---

## 18. Worked examples

These are illustrative contract sketches, not complete executable records. Before v0.2, at least one low-, one middle-, and one high-realm example must be expanded through every required field, exact `DescriptionClaim`, law binding, transaction manifest, deterministic seeds, complexity estimate, persistence policy, and acceptance oracle.

### Mortal-grade: Cinder-Breath Paper

**Claim:** “When torn, the paper exhales a short cone of flame.”

- Source: sealed fire-aligned reservoir in the paper.
- Target: no entity query; an eight-meter cone in the paper’s forward frame.
- Phases: tear, brief ignition, discharge, smoke aftermath.
- Behavior: convert stored energy into hot gas and radiant heat; ignite material only when its threshold is crossed.
- Counter: water absorbs heat and produces steam; wind redirects gas; destruction before commitment prevents discharge.
- Failure: wet or depleted paper produces smoke or a weak flame.
- Persistence: resulting burns, fires, ash, scorch, and smoke effects persist appropriately.

The result is fire behavior, not “20 fire damage.”

### Early cultivator: Covenant-Seeking Cord

**Claim:** “Within the River-Market covenant’s jurisdiction, the cord pursues the nearest person whose breach has been recognized by that covenant and binds their limbs.”

- Eligibility is local, not universal truth: an active covenant defines consent/coercion rules, breach conditions, evidence, adjudicator, dispute/appeal, jurisdiction, and recognized decisions.
- Candidates are persons within the declared range whose breach is currently recognized by the pinned covenant revision. A disputed or coerced oath follows its own process.
- Selection uses shortest valid distance and stable identity tie-break.
- The cord physically extends, navigates, wraps reachable limb anchors, and constrains motion.
- It may be severed, shed by lawfully resolving the oath, evaded through phase, or overcome beyond tensile capacity.
- With no qualifying target, it remains inert.
- Witnesses see whom it chose but do not automatically know why.

### NONCANON high-authority fixture: Heaven-Inverting Seal

This fixture proves semantic fidelity, not a realm assignment. If a low-realm actor invokes it, the stored/borrowed authority must cover the full capability vector, while limited perception, control, survivability, debt, detection, theft risk, and institutional consequences remain.

**Claim:** “The seal summons an upside-down granite mountain above the marked ground.”

- Construct: mountain-class granite body with hierarchical material distribution.
- Provenance: condensed/transported earth-aligned matter under a bound regional covenant; ledger and debt recorded.
- Frame: local gravity at the marker.
- Orientation: summit points downward; broad base faces upward.
- Anchor: declared altitude and extent.
- Phases: mark, manifestation, release, descent, contact, fracture, aftermath.
- Collision: crater, fragmentation, burial, pressure, dust, vibration, obstruction.
- Environment: possible river block, shadow, habitat loss, flow-vein displacement, dust weather, path change.
- Society: violation, death, blame, witnesses, law, sect response, repair, salvage, and history propagate only through real channels.
- Counters: deny earth authority, sever manifestation, move/erase marker, suspend, redirect, disperse, or capture within capacity.
- Scaling: size, density, descent, precision, duration, authority, source cost, resistance, and aftermath radius vary independently.
- Persistence: terrain and significant fragments remain.

### High realm: Thousand-Mile Bond-Cleaving Stroke

**Claim:** “One stroke severs every eligible material and spiritual bond crossing a thousand-mile plane.”

- Geometry: finite oriented plane swept by the weapon.
- Targets: eligible structural links, formation channels, bodily conduits, oath tethers, and soul attachments intersecting it, defined against a pinned canon release, world snapshot, jurisdiction, selection time, and authority ceiling.
- Selection is exhaustive or lawfully aggregated over that finite eligibility universe; an aggregate certificate records counts and excluded categories.
- Primitive: typed link severance, not hit-point damage.
- Consequences: fracture, collapse, interrupted flows, backlash, decompression, redirected rivers, broken relationships where authorized, and evidence.
- Exclusions: higher-authority anchors and universal law unless the definition grants such authority.
- Counters: bend the plane, move links, change link type, interpose spatial authority, or absorb a bounded subset.

### Ascendant law overlay

**Edict:** “Within this valley, smoke and ordinary hot combustion gases sink toward the earth for seven days.”

- Jurisdiction: fixed valley boundary.
- Subject: ordinary combustion below a defined authority threshold.
- Transformation: buoyancy of hot gases aligns with gravity instead of opposing it.
- Cost: sustained domain authority and accumulating causal debt.
- Consequences: smoke pools low; floor spread worsens; ceilings cool; metallurgy, kitchens, wildlife, forests, firefighting, ventilation, techniques, and records change.
- Exceptions: authorized furnace formations and higher fire laws.
- Persistence: edict, fires, deaths, ecological effects, and testimony survive save/load.

The player altered runtime world law through a canon-authorized system; they did not inject arbitrary code or rewrite project canon.

---

## 19. Graph integration and next gate

Canon adds proposal types for semantic primitives, material/energy families, law definitions, units, entity archetypes, actions, counters, perception channels, description predicates, scaling profiles, and terminology records.

Required trace:

```text
EvidenceClaim
→ CrossSourcePattern
→ CanonProposal
→ approved Action/Law/Primitive revision
→ Production SystemSpec
→ AcceptanceTest
→ ScenarioExperiment
→ first-party EvidenceResult
```

Runtime actions and player-authored laws live in game world state, not in the research Canon Graph.

This schema may advance to v0.2 when:

- the Universe Encyclopedia maps all major active and passive entity families to semantic contracts;
- the declared release horizon covers mortal, low, middle, high, cosmic, social, domestic, ecological, institutional, and law-scale action families across primitives, failure modes, consequence radii, persistence tiers, and interaction risk; raw action counts are supporting evidence, not the gate;
- every English description in that sample passes predicate entailment;
- no test depends on rendering as canonical truth;
- aggregation preserves all contract-relevant facts;
- the action vocabulary proves expressive without arbitrary scripting;
- law authorship can change a bounded jurisdiction without incoherent downstream state; and
- independent gauntlet, cultural, terminology, continuity, and originality reviewers approve.
