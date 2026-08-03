# Open-Ended Universe Gauntlet v0.1

**Status:** pre-canon validation architecture  
**Date:** 2026-08-02  
**Scope:** the entire single-player universe, from mortal chores to authored world law

---

## 0. Founding principle

This is not a finite checklist. It is a **test-generating architecture**.

Every encyclopedia entry, Canon node, relationship, mechanic, description, realm, system, historical event, production mapping, and defect creates obligations. Promotion means the known, risk-weighted obligations have passed and residual uncertainty is recorded. It never means the universe is “fully tested.”

> The Gauntlet does not prove that the universe is finished. It proves that each promoted part has earned the right to become a dependency of everything built after it.

---

## 1. Three governed graphs and one derived test view

Evidence, Canon, and Production remain the only systems of record. The Gauntlet exposes a read-only Test Graph view derived from Production tests, gauntlet families, experiments, results, and dependencies:

```text
Evidence → Canon → Production
              \       /
               Test Graph
```

### Canon Graph: what is true

Every truth-bearing node records:

- stable identity, type, canon status, and revision;
- spatial, temporal, cosmological, and knowledge scope;
- state variables and allowed transitions;
- descriptive predicates;
- affordances and prohibitions;
- preconditions, costs, traces, and consequences;
- relationships, sustainers, and dependencies;
- observable cues and information access;
- simulation-tier requirements;
- historical provenance;
- inspiration provenance and forbidden derivatives;
- approved seasoned-reader xianxia terminology and translation record;
- known contradictions and uncertainty; and
- explicit decision history.

### Production Graph: how truth becomes experience

Production nodes map truth into:

- world generators and selection grammars;
- geometry, material, animation, VFX, lighting, audio, text, and UI;
- action combat, movement, interaction, and NPC use;
- AI plans, social simulation, ecology, economy, and history;
- persistence and save representation;
- simulation tiers and promotion/demotion rules;
- camera and scale strategies;
- information channels and accessibility;
- performance and complexity budgets;
- authored anchors and procedural variants; and
- validation evidence.

A Canon claim is not implemented until every required experiential channel is mapped. Channels are `contract-critical`, `contextual`, or `presentational`. A channel implied by a description predicate, core affordance, persistence rule, or causal consequence is contract-critical and cannot be waived; it can only be deferred while the description remains unpublished or is explicitly narrowed. Contextual or presentational channels require a scoped, signed waiver with review trigger.

### Derived Test Graph: what must be proven

This view has no independently editable IDs or lifecycle. Its obligation records are projections of immutable Production revisions.

Each obligation records:

```text
obligation identity
logical-key components and immutable obligation revision
test-generator family and version
covered nodes, edges, paths, motifs, and eras
preconditions and fixtures
expected property or outcome envelope
risk, severity, and consequence radius
required simulation tier(s)
reproduction manifest
last passing evidence
known gaps and residual uncertainty
human-review requirement
reopening conditions
split/merge/supersession lineage
```

The logical key is the canonical hash of gauntlet-family stable ID, assertion/motif kind, ordered covered-subject stable IDs, jurisdiction/time-scope identity, and normalized parameter-equivalence class. Revisions pin exact upstream revisions, generator version, fixtures, threshold set, and evidence. Reopening creates a new immutable revision under the same key; splits and merges create deterministically related keys and preserve all result history. The derived view must reproduce the Production `TestGenerationManifest` exactly and report duplicate keys or orphaned obligations as blockers.

Every graph change runs an impact traversal. Changing one combustion law, for example, reopens dependent tests for bodies, weather, forests, furnaces, architecture, injuries, artifacts, techniques, sect doctrines, agriculture, records, quests, visuals, and abstract simulation.

The reproduction manifest includes initial snapshot hash, complete event/command prefix, world seed, action identities, canon release, ontology/schema/generator versions, law context, fidelity tier, fixed-step and numeric profile, dependency versions, and relevant platform profile. A seed alone is insufficient.

---

## 2. Encyclopedia-scale coverage matrix

This matrix is a floor, not a ceiling.

| Canon family | Truth that must exist | Minimum automatic tests | Player-facing proof |
|---|---|---|---|
| Axiom / law | Scope, priority, composition, exceptions, observability, history | Contradiction, suppression, inheritance, conservation, alteration propagation | Physics, ecology, language, techniques, and consequences agree |
| Time / ordinary causality | Clock domains, order, branching, memory, reversibility, observation | Paradox, duplicate identity, stale knowledge, synchronization, counterfactual divergence | Events, records, consequences, and player choice remain intelligible |
| Each ratified metaphysical module (conditional; one row per module) | Its own jurisdiction, carriers, operations, evidence, limits, discharge, interpretation, and relation to ordinary causality | Module-specific false positives, scope leaks, contradictions, suppression, transfer, and counterfactuals | Fate, karma, mandate, luck, celestial statute, prophecy, or any other admitted module is legible without collapsing into another |
| World / realm / boundary | Origin, topology, separation, law climate, travel | Coordinate continuity, compatibility, crossing, migration, information limits | Maps, sky, travel, local life, and descriptions agree |
| Cultivation realm | Preconditions, transformation, cost, failure, social recognition | Verb proof, old-world relevance, counterplay, body/perception transition | Realm is demonstrable without label or stat screen |
| Protagonist advantage | Lawful origin, locus, privileged operation, realm ceilings, costs, counters, exposure, transfer/death | Shared-resolver parity, band/stack limits, plot-armor attack, concealment, theft/copy, economy and tribulation exploits | Player feels uniquely capable without hidden physics, guaranteed survival, or false attribution |
| Body / soul / mind | Anatomy, senses, needs, injury, identity, death states | Damage, healing, possession, duplication, reincarnation, adaptation | Animation, controls, perception, medicine, and testimony agree |
| Person / lineage | Identity, body, memory, relationships, goals, inheritance | Schedule viability, knowledge provenance, deception, death, succession, tier persistence | Conduct and testimony follow lived history |
| Skill / technique | Doctrine, inputs, execution, target, cost, trace, side effect | Activation, timing, scaling, compatibility, counterplay, NPC parity, exploit search | English name, description, animation, VFX, physics, and aftermath agree |
| Item / artifact | Maker, material, states, ownership, affordances, will, damage | Provenance, conservation, transfer, theft, breakage, repair, duplication, persistence | Appearance, use, value, description, and behavior describe one object |
| Material / resource | Origin, phase, quality, renewability, transformations, habitat | Depletion, regeneration, transport, substitution, adulteration, market/ecology response | Scarcity and provenance are visible and investigable |
| Craft / alchemy / formation | Process, tools, environment, knowledge, waste, failure | Recipe families, substitutions, quality, accidents, automation, law compatibility | Workspaces, labor, materials, output, and risk agree |
| Species / ecology | Habitat, needs, reproduction, intelligence, relationships, cultivation | Food webs, migration, harvesting, extinction, symbiosis, personhood | Beings act as ecological and social agents, not encounter skins |
| Weather / disaster | Causes, fields, phases, predictability, affected systems | Propagation, shelter, ecology, travel, technique interaction, recovery | Sensory cues, forecasts, damage, behavior, and landscape agree |
| Place / structure / landform | Geometry, material, use, law, history, ownership | Traversal, literal form, destruction, repair, LOD, maps, schedules | Silhouette, collision, text, navigation, and inhabitants agree |
| Household / settlement | Population, work, needs, services, governance, history | Supply, famine, migration, fire, death, class, rebuilding, time skip | Daily routines and built form reveal how the place survives |
| Institution / culture | Doctrine, offices, legitimacy, assets, membership, disagreement | Succession, schism, resource loss, policy, reform, offscreen autonomy | Architecture, law, ritual, education, economy, and behavior express it |
| Economy / occupation | Scarcity, rights, production, logistics, demand, trust | Arbitrage, monopoly, automation, substitution, travel, shock response | Prices and labor change for traceable reasons |
| Relationship / reputation | Parties, asymmetry, evidence, memory, obligations, audience | Gossip, forgiveness, betrayal, mistaken identity, inheritance, time | NPC choices and access reflect actual social history |
| Event / history | Cause, actor, intent, method, cost, state delta, witnesses | Preconditions, counterfactual, consequence radius, records, time skip | Scars, memories, ownership, ecology, and stories reflect occurrence |
| Record / rumor / doctrine | Author, source, bias, age, truth relation, audience | Provenance, forgery, contradiction, decay, suppression, rediscovery | Player can distinguish fact, belief, lie, mystery, and error |
| Quest opportunity | Existing pressure, actors, stakes, clues, outcomes, time | Solvability, refusal, delay, failure-forward, competing solutions | Objective arises from world state rather than a detached template |
| Law authorship | Authority, scope, syntax, cost, migration, opposition | Dependency traversal, paradox, century simulation, rollback/branch safety | Altered universe changes consistently while explaining transformations |

New encyclopedia families must declare their truth fields, player verbs, dependencies, simulation requirements, and test generators before they can enter Canon.

---

## 3. How obligations are generated

### 3.1 Node obligations

Every Canon node generates:

- schema completeness;
- identity and temporal consistency;
- internal invariants;
- allowed and forbidden state transitions;
- description-predicate coverage;
- real and implied affordances;
- persistence and save migration;
- scale representation;
- simulation-tier support;
- knowledge and witness access;
- English terminology validation;
- originality, rights, and cultural-review status; and
- at least one failure or counterexample.

### 3.2 Edge obligations

Every relationship generates tests that:

- both endpoints exist in compatible times and places;
- the relation can be created, changed, and ended only by allowed causes;
- inverse/reciprocal edges agree;
- dependency loss propagates;
- conservation and uniqueness rules hold;
- important relationships are perceivable through some channel;
- simulation tiers preserve the relation; and
- removing the edge causes at least one relevant test to fail.

Example: `technique REQUIRES resource` generates tests for use without it, consumption, quality, substitutes, NPC planning, inventory, market pressure, description, and abstract simulation.

### 3.3 Path obligations

Important multi-edge paths require end-to-end proof:

```text
world law
→ ecology
→ resource
→ craft
→ technique
→ institution
→ conflict
→ historical record
→ present quest pressure
```

If an upstream fact changes, every downstream description and system is reopened.

### 3.4 Motif obligations

Recurring subgraphs gain scenario libraries:

- mortal household crisis;
- teacher–student transmission;
- cultivation attempt and failure;
- artifact construction, theft, inheritance, and destruction;
- sect succession, reform, and schism;
- harvesting, habitat damage, substitution, and recovery;
- crime, witness, rumor, investigation, and judgment;
- war, migration, famine, memorial, and return;
- death, haunting, reincarnation, and identity claim;
- world travel and law incompatibility;
- law suppression, inheritance, or authorship; and
- return to a lower-realm origin.
- lawful protagonist asymmetry: discovery, concealment, use, failure, exposure, transfer, death, growth, and endgame transformation.

Every new defect class becomes a permanent motif, property, mutation, or minimized reproduction manifest. Redundant seeds are compacted into equivalence classes and archival storage rather than expanding the active suite without bound.

---

## 4. Literal-description fidelity

Descriptions are semantic contracts, not mood text.

Every significant English description decomposes into predicates such as:

- entity identity and source;
- action and transformation;
- target and selection rule;
- geometry, topology, orientation, and reference frame;
- material, energy, law, or information substrate;
- quantity, quality, and scale;
- movement, force, collision, pressure, heat, sound, and light;
- duration, persistence, repetition, and termination;
- traversability, destructibility, divisibility, and ownership;
- body, terrain, ecological, social, historical, and metaphysical consequences;
- visible, audible, tactile, spiritual, and inferential cues;
- counters, immunities, redirection, failure, backlash, and residue;
- scaling sources, limits, and breakpoints; and
- simulation-tier representation.

### The upside-down mountain test

This is a `NONCANON-HIGH-AUTHORITY-FIXTURE`, not evidence that any named early or middle realm can perform the feat personally. The Realm Capability Envelope decides whether the source is personal, prepared, environmental, allied, or external.

Suppose an item says:

> **Heaven-Inverting Seal:** Calls an upside-down mountain of condensed qi above the chosen enemy and drives its hanging summit downward.

The following become obligations, not suggestions:

1. **Item reality:** the seal exists, has maker/material/history/owner/state, can be carried, stolen, damaged, repaired, depleted, or contested as defined.
2. **Activation:** valid user, target, range, line-of-influence, mental/physical action, time commitment, cost, interruption, and law compatibility are enforced.
3. **Source:** condensed qi comes from the user, stored charge, environment, linked domain, conversion, debt, or a declared mixture; no energy appears without the world’s allowed cause.
4. **Instantiation:** a mountain-scale construct is created or lawfully projected. Its broad foundation is above; its summit points downward. It is not a conventional upright mountain or generic sphere with mountain particles.
5. **Reference frame:** “upside-down,” “above,” and “downward” resolve against a declared gravity, local orientation, target frame, or world-law frame.
6. **Geometry:** silhouette, close geometry, collision/pressure volume, shadows, particles, map/sense representation, and distant LOD agree.
7. **Attack behavior:** placement, descent, acceleration, contact, crushing/pressure/law effects, area, duration, tracking, obstruction, friendly interaction, and miss behavior follow the contract.
8. **Terrain:** ground, buildings, caverns, rivers, formations, and protected structures respond according to their materials and laws. If the construct is immaterial, its pressure and exclusions must still be consistent.
9. **Living world:** people and creatures perceive, flee, defend, warn, exploit, remember, record, and socially evaluate the event according to actual opportunity and knowledge.
10. **Ecology and economy:** a sufficiently consequential strike may create scars, dust, disrupted flows, altered habitat, salvage, repair demand, law contamination, or political claims—within its declared consequence radius.
11. **Counters:** evasion, barrier, severed supply, dispersal, redirection, grounding, concept conflict, item theft, activation interruption, or realm superiority work only when supported by their own contracts.
12. **Scaling:** user realm, insight, charge, item condition, ambient conditions, target law, formation support, precision, and resistance scale independent dimensions. “Bigger number” cannot be the only scaling path.
13. **Persistence:** save/load, time pause, area unload, and simulation-tier transitions preserve the item, attack, costs, affected entities, unique identity, and aftermath.
14. **Description truth:** text is generated from the validated contract. If a performance tier uses a cheaper visual, behavior and canonical consequence do not change.

If scope or performance cannot support those obligations, the honest choices are to constrain the contract, render it through a validated representation, or remove the description. Substituting generic damage while retaining the promise is forbidden.

---

## 5. False-affordance detection

Every cue implies possible verbs:

```text
representation
→ likely player interpretation
→ expected verb
→ actual capability
→ diegetic explanation or defect
```

Examples:

- A visible door implies opening, breaking, knocking, inspecting, or a legible reason none apply.
- A luminous herb implies inspection or harvesting if that visual language elsewhere means resource.
- A climbable-looking cliff must be climbable, deliberately dangerous, or visually distinct.
- “Mountain-splitting” must affect qualifying terrain or be translated to an English name that matches its real behavior.
- A “merchant” must participate in an economy or be diegetically fraudulent.
- A “memory-erasing” technique must change memory-bearing systems, relationship behavior, records where applicable, and player information—not only apply a stun.

Track:

- **Affordance precision:** implied verbs that actually work.
- **Affordance recall:** available verbs that are communicated.
- **Semantic fidelity:** description predicates realized by canonical behavior.
- **Cross-modal agreement:** text, icon, animation, audio, effect, state change, and aftermath agree.

Intentional deception is valid only when a deceiver, misconception, illusion, mistranslation, or unreliable record causes it and an investigative path exists.

“Legible reason” is not an unlimited exemption. Scene types define salience-weighted precision/recall targets, minimum interactive density, critical affordance classes, and exception budgets. Blinded first-attempt tests record what players try before they learn project conventions. A market, workshop, home, ruin, battlefield, and sacred site may have different density targets, but none may become mostly decorative collision while still advertising systemic life.

---

## 6. Realm and scale proof

Every major realm requires:

- at least two genuinely new verbs;
- one earlier verb transformed in method or meaning;
- one new information/perception layer;
- distinct cost, danger, and failure;
- realm-appropriate counterplay;
- a new social relationship or status conflict;
- responsibility created by power;
- one constraint that power does not erase; and
- a reason mortal and lower-realm content remains relevant.

For every proposed new verb, create a semantic novelty certificate against its nearest earlier verbs. It must identify a distinct state-transition topology and material differences in required information/perception, costs or commitments, counter/failure structure, and downstream consequences in at least two other systems. An equivalence test normalizes names, numbers, target counts, presentation, and scale; if the same preconditions and strategy produce the same normalized state changes, the verb is a reskin and does not count.

A realm fails when it feels mainly like more damage, health, speed, particles, enemy quantities, or reskins. It also fails when fewer than two verbs survive semantic-equivalence normalization.

The protagonist may possess a unique asymmetry, but is tested against the same envelope. At Qi Condensation, unusual insight may reveal a fault in a mountain, enable a precise seal, or let the player survive a technique others cannot; it does not supply mountain-splitting force. External formations, ancient terrain weaknesses, collective ritual, borrowed law authority, or a catastrophic resource might produce a mountain-scale outcome, but their provenance, preparation, risk, and consequences—not “being the protagonist”—must explain it.

### Realm contrast battery

Every realm solves the same benchmark problems:

1. cross a river;
2. cross a mountain;
3. find a hidden person;
4. heal an injury;
5. obtain a scarce resource;
6. defeat one peer;
7. survive many weaker opponents;
8. protect a settlement;
9. settle an institutional dispute;
10. respond to a lie;
11. travel to another world; and
12. preserve something across time.

Solutions must change qualitatively while preserving causal and emotional continuity. “Qualitative” uses the same semantic novelty oracle: distinct transition topology plus meaningful differences in information, costs, counters/failures, and cross-system consequences.

### Power dimensions

Test independently and in combination:

- destruction;
- movement;
- creation and transformation;
- perception and prediction;
- defense and recovery;
- control and precision;
- temporal reach;
- social/legal authority;
- information influence;
- ecological reach; and
- consequence radius.

A mortal cannot destroy a fortress through accidental stat stacking. A cosmic cultivator is not stopped by an ordinary fence without explanation. Vast power expands responsibility and consequence; it does not merely shrink enemies.

---

## 7. Risk-weighted combination engine

Exhaustive cross-products are impossible. Coverage is risk-weighted across:

```text
realm × technique × item × body × status
× law climate × terrain × weather × ecology
× institution × NPC goal × resource state
× historical state × simulation tier × time horizon
× reputation × camera mode × destruction state
```

Strategy:

1. all explicitly required and prohibited combinations;
2. pairwise coverage for ordinary systems;
3. three- to six-way coverage for death, identity, law, saves, realm transitions, economy, ecology, and destructive combat;
4. extreme and boundary values;
5. all previously defective seeds;
6. constraint-valid generated scenarios;
7. deliberately invalid configurations; and
8. mutation tests proving validators detect corrupted graph assertions.

High-risk scenarios include:

- reincarnation during sect succession while an inheritance artifact is in abstract simulation;
- a combustion technique in a suppressing world while the caster carries a foreign-law artifact;
- destroying the sole habitat of a resource required by an institution already at war;
- promoting a dead NPC into active simulation while a forged identity using their name remains active;
- changing gravity while a floating settlement, river system, migration route, artifact, and travel objective depend on it; and
- using the upside-down mountain item at a realm boundary while the target redirects ownership of the summoned construct.

---

## 8. Consequence continuity

Significant actions carry an impact vector:

```text
bodily
spatial
ecological
economic
social
institutional
historical
metaphysical
```

### Consequence-radius envelope

Each action defines minimum, expected, and maximum effects at:

- immediate;
- local;
- regional;
- institutional;
- world;
- interworld;
- historical; and
- cosmological scopes.

This blocks:

- **dead action:** destroying a sacred forest changes only pixels;
- **runaway butterfly:** picking one herb topples an empire without a credible amplification path.

Major actions should usually manifest through at least two dependent systems. Minor actions decay unless existing pressures amplify them.

### Historical proof

For each major event:

- physical scars persist where appropriate;
- ownership, population, resources, and ecology update;
- memories derive from presence or information transmission;
- records can disagree, but their authorship and bias are traceable;
- descendants and institutions can reinterpret it;
- time skips preserve event order and ongoing commitments;
- revisit state never resets without an in-world cause; and
- counterfactual runs show traceable intermediate divergence. Later convergence is valid only when modeled attractors, replacement actors, recovery, or equilibrium explain it; unexplained scripted convergence fails.

---

## 9. Simulation-tier refinement

Unified residency/fidelity tiers:

| Tier | Representation |
|---|---|
| **F0 Dormant** | Stable state, scheduled obligations, deterministic catch-up. |
| **F1 Historical** | Aggregate pressures, demographics, transitions, large events, durable named identity. |
| **F2 Regional** | Cohorts, flows, institutional goals, ecosystems, trade, migration, conflict. |
| **F3 Interactive** | Active bodies, actions, perception, navigation, and individual decisions. |
| **F4 Detailed** | Contract-relevant fracture, fluid/terrain detail, and significant debris. |

Each contract defines protected invariants, supported queries by tier, unresolved detail, error envelopes, and refinement commitments. Refinement does not require identical micro-events or answer every detailed query at F0–F2. It must preserve identities, ledgers, causal order, unique items, named outcomes, and bounded aggregate facts.

Tests:

- run the same foundation seed at adjacent tiers and compare outcome distributions;
- promote and demote a region repeatedly;
- cross a tier boundary while observing;
- preserve deaths, injuries, relationships, ownership, rare objects, debts, vows, and unresolved plans;
- prevent duplication, retroactive resurrection, and ownership loss;
- reconstruct plausible positions and actions on promotion;
- ensure ordinary save/exit, unload, and browser restart cannot duplicate committed resources or erase committed costs/effects;
- compare coarse and fine time steps;
- disallow causal effects from distant entities without a graph path; and
- reconcile actions whose participants occupy different tiers.

---

## 10. Test families

### Property tests

- Unique artifacts do not acquire simultaneous owners unless division or duplication is lawful.
- Dead persons do not act without a valid post-death state.
- Consumed resources decrease at an accountable source.
- A suppressed technique cannot activate unchanged.
- Every historical claim has a source or is clearly marked inference/belief.
- Every institution has members, assets, legitimacy, and continuity mechanisms.
- Every active description is entailed by the semantic contract.
- Every player-facing term resolves to the approved seasoned-reader xianxia lexicon.
- Protagonist status never bypasses action preconditions, costs, law resolution, persistence, or realm capability envelopes.
- With identical canonical state, a cloned NPC and the player produce identical presentation-independent outcomes.
- Qi Condensation personal output cannot satisfy the huge-mountain-splitting capability vector.
- Prepared, environmental, allied, and external-authority contributions never launder into personal strength.

### Metamorphic tests

- Renaming does not change behavior unless names have power.
- Paraphrasing English text preserves its behavior predicates.
- Rotating a non-directional scene preserves outcomes.
- Adding an irrelevant distant entity does not change a local result.
- Independent events commute within defined tolerances.
- Suppressing a law transforms all dependents.
- Raising simulation fidelity preserves aggregate truth.
- Changing time-step size remains in tolerance.
- Reloading a seed reproduces foundations.
- Transferring an item preserves identity and provenance.

### Scenario tests

- one mortal village week;
- first teacher choice;
- fraudulent manual;
- failed breakthrough;
- sect founder removed;
- spirit habitat destroyed;
- artifact inherited across three generations;
- region abandoned for fifty years;
- return to origin as a great power;
- conflicting records of one war;
- world-law incompatibility; and
- player-authored law followed by a century.
- protagonist advantage transferred or stolen by an NPC;
- mentor unavailable or wrong;
- comprehension confronted with false evidence and bodily incompatibility;
- devouring confronted with contamination and capacity;
- resource multiplication confronted with scarcity, nonfungibility, seizure, and market response;
- tribulation redirection and repeat-farming attempts; and
- protagonist death, reincarnation, copy, and save/reload without secret survival privilege.

### Differential tests

Compare active and abstract simulation, authored and generated places, two implementations of one law, description and rendered predicates, player and NPC technique use, lower and higher rendering tiers, and historical replay versus saved state.

### Mutation tests

Deliberately corrupt a dependency, time order, owner, law scope, technique cost, description orientation, translation, habitat, or tier summary. If the suite still passes, the suite failed to prove the rule.

### Soak tests

Run thousands of seeds, multi-century histories, repeated save/load, long economies and ecologies, chained realm transitions, catastrophes, player absence, extreme optimization, and automation.

### Browser-local runtime tests

- Failure injection before, during, and after atomic save commit.
- Storage quota exhaustion, persistent-storage denial, eviction warning, and corrupted local data.
- Export/import recovery and independently verifiable backup manifests.
- Background suspension, closed-browser bounded catch-up, and wall-clock rollback/forward.
- Worker termination and restart during simulation or save preparation.
- WebGPU device loss and presentation fallback with unchanged canonical hashes.
- Ordinary exit/reload without duplicated costs, items, scheduled effects, or history.

Deliberate save editing and clock tampering are unsupported unless a later integrity feature explicitly covers them; the gauntlet does not promise impossible anti-tamper security in a user-controlled local game.

### Human experiential tests

Machines cannot establish awe, action feel, memorability, cultural texture, authoredness, emotional continuity, mystery rather than noise, or whether progression genuinely changes life. Human review remains blocking.

---

## 11. Coverage profile

Never report one misleading “percent tested.” Report:

### Structural

- node, edge, critical path, invariant, state transition, time-scope, provenance, description-predicate, terminology, and dependency coverage.

### Systemic

- interaction pairs;
- risk-weighted multi-system combinations;
- realm contrast;
- simulation-tier equivalence;
- consequence-radius realization and containment;
- persistence promotion/demotion;
- mutation detection; and
- adversarial-seed regression.

### Player-facing

- affordance precision and recall;
- semantic fidelity and cross-modal agreement;
- quest solvability and refusal/failure paths;
- information-source traceability;
- realm verb proof;
- return-to-origin relevance;
- authoredness blind tests;
- seasoned-reader xianxia terminology review;
- cultural review; and
- originality review.

### Anti-noise and authoredness profile

- structural nearest-neighbor distance across seeds and regions;
- motif collision and repeated causal-template rates;
- causal-graph diversity within the same content family;
- regional interchangeability panels with labels and names removed;
- delayed player recall of places, people, causes, and choices;
- repeated phrase/name/visual grammar thresholds;
- gratuitous-causality rate: history that creates no decision, explanation, memory, or future consequence; and
- handcrafted/generated/hybrid blind comparisons using the same salience and playtime.

A location fails even if each paragraph has provenance when its causal graph, decision pattern, visual grammar, and social function are near-copies of many others.

Coverage is consequence-weighted. One untested death, identity, save, or law-edit path matters more than thousands of decorative item variants.

### Gauntlet complexity budget

Test generation is itself budgeted. Each release defines risk-based sampling, deterministic shards, maximum wall time, equivalence classes, and archival tiers. Ordinary systems receive pairwise coverage; high-risk identity/law/save paths receive deeper combinations. Defect families retain minimized deterministic reproducers and representative boundary cases rather than every redundant failing seed. Historical seeds remain queryable but only the active regression frontier runs continuously.

---

## 12. Promotion and stopping rules

Severity is centrally defined:

- **S0 — foundation blocker:** can corrupt canon, identity, saves, deterministic truth, legal/cultural safety, or the central player promise; zero open at promotion.
- **S1 — major systemic defect:** breaks a core system, cross-system continuity, realm identity, or required affordance; zero open unless the user signs a milestone-scoped deferral that removes the affected claim from release.
- **S2 — material defect:** bounded but player-visible incoherence or test gap; must meet a named per-release maximum and owner/deadline.
- **S3 — minor defect:** presentation or documentation issue without semantic consequence; tracked to a defined budget.

Risk combines severity, likelihood, detectability, and consequence radius. “Critical obligation,” coverage threshold, discovery window, and waiver authority are named Production records rather than prose judgments.

### Promotion stages

These are **validation maturity labels**, not Canon lifecycle statuses. Canon remains `draft → proposed → in_review → provisional → ratified`.

1. **Hypothesis:** sourced pattern and original design pressure recorded.
2. **Provisional:** schema, exclusions, and contradictions defined.
3. **Candidate:** node, edge, state, semantic, and literal-fidelity tests pass.
4. **Integrated:** cross-system, history, persistence, scaling, and tier tests pass.
5. **Experiential:** human playtests confirm legibility, fun, identity, awe, and cultural integrity.
6. **Canon:** authorized human approves with residual risks documented.

### Blocking failures

No promotion with:

- an open critical contradiction;
- unsupported source use or copied topology;
- cultural-authenticity misrepresentation;
- unexplained niche romanization or awkward overtranslation of established xianxia terminology;
- untraceable historical fact;
- false core affordance or decorative description;
- a realm lacking qualitative verb proof;
- simulation-tier duplication, resurrection, or continuity break;
- unbounded consequences;
- an unsolvable generated objective;
- known save corruption or reproduction failure; or
- human reviewers unable to distinguish mystery from randomness.

### Risk-weighted pause for a milestone

A milestone may stop expanding its current test cycle when:

- all critical obligations pass;
- no S0 remains, no included-scope S1 remains, and S2/S3 budgets meet the milestone’s signed thresholds;
- high-risk mutations are detected;
- type-specific coverage profiles meet their thresholds;
- a predeclared number of recent adversarial shards shows no new S0/S1 defect class and a statistically bounded S2 discovery rate;
- human experiential gates pass;
- residual risks have owners, containment, and reopening triggers; and
- the next identified design experiment has higher expected value than more testing of the same neighborhood.

This pauses a test cycle, never the universe. New law, realm, ontology family, simulation tier, mechanic, or defect reopens its entire impact neighborhood.
