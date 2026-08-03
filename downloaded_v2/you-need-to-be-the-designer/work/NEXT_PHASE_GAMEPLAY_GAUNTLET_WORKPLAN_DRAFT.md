# Next-Phase Gameplay Gauntlet Workplan — Draft v0.1

**Status:** reviewed proposed test program; every fixture is `NOT RUN`  
**Scope:** gameplay, product, controls, exploit resistance, player/NPC parity, and loss experience from mortal life through high-realm macro play  
**Code status:** this document authorizes no production code, engine scaffold, dependency installation, telemetry collection, recruitment, or completed playtest claim  
**Consumes:** Cultivation Foundations Release Index v0.1, Mortal Year Atlas, Qi Condensation and Golden Scenarios, State Ledger, Identity/Death Models, Time/Catastrophe Architecture, and the Er Gen/Gemini Mechanics Critique

---

## 0. Purpose and release rule

The next phase must answer a harder question than “is the design internally coherent?”:

> Do these systems create understandable, voluntary, expressive play without hiding grind, automating away judgment, privileging the protagonist, or turning scale into menu labor?

This workplan converts that question into bounded hypotheses, fixtures, measurements, and failure thresholds. It is a plan for future paper simulations, usability studies, adversarial simulations, and—only after separate authorization—interactive prototypes.

No threshold below has been passed. Numerical experience thresholds are **provisional ratification candidates**. They must be locked before the relevant confirmatory test begins; they may not be weakened after results are seen. Integrity failures—duplication, hidden-information leakage, causal mismatch, player-only physics, nontermination, or save corruption—are zero-tolerance regardless of sample size.

### 0.1 Severity rule

- **S0:** causal corruption, duplication/loss of protected identity or resources, nontermination, player-only physics, or an architecture that cannot produce the promised game.
- **S1:** dominant exploit, mandatory tedium, hidden oracle, inaccessible control surface, fake choice, opaque unavoidable loss, protagonist privilege, or a subsystem that cannot meet reference-hardware/playability obligations.
- **Repair band:** usability or tuning miss that does not invalidate the system and has a bounded repair path.

Any S0/S1 stops promotion of the affected package. A repair closes only after the failed fixture is rerun together with regression controls.

---

## 1. Measurement protocol

### 1.1 Evidence stages

| Stage | Evidence | Permitted conclusion |
|---|---|---|
| `E0 Contract audit` | paper traces, state tables, adversarial proofs, counterfactuals | the proposed rule is executable and has a falsifier |
| `E1 Facilitated paper play` | cards, maps, timelines, written choices, blinded facilitator scripts | players can understand choices and consequences without relying on final presentation |
| `E2 Low-fidelity interaction study` | wireframes, clickable mockups, controller diagrams, timed input tasks | control and information architecture are usable enough to justify implementation research |
| `E3 Authorized subsystem prototype` | isolated executable mechanic after explicit code authorization | timing, workload, deterministic behavior, and hardware cost can be measured |
| `E4 Authorized integrated vertical slice` | connected mortal/cultivation/combat/world systems | the combined experience survives cross-system interaction |

Passing an earlier stage never claims a later stage passed.

### 1.2 Human-study cohorts to plan

Use separate discovery and confirmation cohorts rather than tuning and validating on the same participants.

- **Discovery:** at least 12 participants, split between seasoned xianxia readers and players without xianxia familiarity.
- **Confirmatory experience tests:** at least 30 new participants, stratified by genre familiarity and preferred play style.
- **Control tests:** at least 24 new participants balanced across keyboard/mouse and controller, with planned representation for remapping, hold/toggle, motor, timing, visual, and cognitive accessibility needs.
- **Expert audits:** at least one gameplay/economy, one accessibility/controls, one narrative-systems, and one deterministic-simulation reviewer who did not author the tested fixture.

Recruitment, consent, content warnings, privacy, compensation, accessibility accommodation, and telemetry retention require their own approved protocol before any study begins.

### 1.3 Common measurements

Every fixture records:

```text
FixtureId / Revision / SeedManifest
ParticipantOrAgentCohort
AuthorizedInformationView
StartingStateHash
AvailableAndBelievedActions
ChosenActionsAndDecisionTimes
CanonicalActionAndEventLog
Interruptions / Errors / Reversals
Resources / Injuries / Relationships / Ownership / Aftermath
NormalizedNPCControlResult
EndingStateHash
Comprehension / Workload / Fairness / DesireToContinue
ObservedExploit / Severity / ReproductionTrace
```

Required experience instruments:

- decision comprehension: what the participant believed, why, and with what uncertainty;
- action burden: canonical commitments, raw inputs, menu transitions, target corrections, repeated low-decision inputs, and wall time;
- workload: a short consistent workload instrument plus observed error/recovery;
- agency: number of materially different reachable responses and whether the participant recognized them;
- fairness: whether loss/success can be explained from perceived evidence and established rules;
- desire to continue: continue this life/path, switch path, stop session, or continue only to reach a promised later feature;
- parity: normalized player and isomorphic-NPC events, costs, opportunities, and outcomes.

### 1.4 Cultural and ontology separation invariant

Every fixture keeps Dao/path, qi, Heaven, karma, fate, mandate, tribulation, legal rule, office, reputation, morality, RNG, difficulty/content admission and quest information as separate optional modules. No module may silently implement another. Spirit, soul, consciousness, numerical identity, personhood and viewpoint continuation remain separate judgments. `Lawful Chronicle` remains only a disclosed mode name; it establishes no Dao, karmic or legal ontology.

Every culturally situated fixture carries a `SourceBoundaryRecord` and may enter confirmation only after independent source/cultural and originality review clears the particular content. Participant preference, comprehension or fun cannot establish cultural or historical accuracy.

---

## 2. Gauntlet G1 — Mortal life, pacing, and voluntary continuation

### Hypotheses

1. Mortal play can be worthwhile before supernatural progression appears.
2. Work and care create decisions and attachments without requiring repeated low-decision animations.
3. Remaining mortal, seeking cultivation early, delaying cultivation, migrating, or changing livelihood are supported choices rather than disguised difficulty settings.

### Fixtures

- `MORTAL-THIN-01`: resource-thin household with care and debt pressure.
- `MORTAL-MIXED-01`: mixed livelihood with tools, social leverage, and a labor bottleneck.
- `MORTAL-POWER-01`: locally powerful household facing coordination, legitimacy, and dependent obligations.
- `MORTAL-SOLO-01`: traveler/hermit/lodger without a conventional household but with explicit survival and exchange networks.
- `MORTAL-ACCESS-01`: injured, chronically ill, disabled, or sensory-divergent protagonist whose viable verbs change without becoming a cure waiting room.
- `MORTAL-QUIET-01`: one low-crisis phase proving leisure, beauty, play, intimacy, craft pride, and rest can carry value.

Each fixture exposes a credible cultivation lead before its final optional mortal phase so continuation is a real choice.

Every mortal fixture also carries `CulturalContextManifest-v0.1`:

```text
source and historical scope
ecology, livelihood and material network
kinship, household and care structure
law, dispute and institutions
ritual calendar, beliefs and contested interpretations
gender, class, age and disability assumptions
project-authored invention versus evidence
known unknowns and prohibited stereotypes
```

G1 must run across at least three mutually distinct, authorized ecology–livelihood–institution complexes from the Mortal Year Atlas. If only one context is ready, every conclusion remains explicitly local and cannot become the universal mortal baseline. Each represented context receives an independent source/cultural reviewer.

### Measurements

- repeated mandatory inputs per learned routine;
- meaningful decisions per active ten-minute segment;
- number and diversity of noncombat goals voluntarily adopted;
- attachment recall for particular people, work, tools, places, and promises;
- voluntary continuation for at least one optional mortal phase after a credible cultivation route is visible;
- proportion reporting that they were “waiting for the real game to begin”;
- use and comprehension of summary, standing orders, delegation, and voluntary embodied work;
- outcome diversity across households under the same weather/market year.
- outcome diversity across the three authorized cultural/ecology/institution contexts without treating participant preference as accuracy.

### Provisional fail thresholds

The package fails if any of the following occurs in confirmation:

- more than one identical mandatory low-decision performance remains after the player has demonstrated a stable routine, unless the player explicitly chose embodied repetition;
- any ten-minute active segment contains fewer than two materially different decisions without being an explicitly chosen quiet/embodied interval;
- fewer than three noncombat life trajectories receive a median “worth choosing in the right character” rating of at least 4/5;
- at least 40% of participants describe the mortal span primarily as waiting for cultivation;
- no participant voluntarily continues one optional mortal phase once a credible cultivation route is available;
- the disabled/access fixture has fewer viable strategic verbs or recovery routes solely because content was removed rather than transformed;
- one household class has no consequential action family under the same year; or
- a conclusion from one context is generalized to another without its own manifest/evidence/review; or
- the protagonist household receives opportunities, warnings, leniency, or recovery unavailable to an isomorphic NPC household.

---

## 3. Gauntlet G2 — Cultivation route legibility and anti-grind

### Hypotheses

1. Players can discover and evaluate cultivation without a protagonist-only quest marker or omniscient truth label.
2. Practice demonstrates changing judgment and capability rather than demanding action spam, calendar waiting, or deliberate injury farming.
3. Time advance compresses authorized routine while stopping at the same decision available through established perception/evidence channels as ordinary semantic stepping.

### Fixtures

- `ROUTE-MULTI-01`: at least three available evidence paths—work anomaly, teacher/social lead, and environmental/material trace—with one plausible mundane explanation.
- `ROUTE-NO-MANUAL-01`: oral, demonstrated, institutional, and self-hypothesis paths; no manuscript or unique teacher exists.
- `PRACTICE-STABLE-01`: learned safe exercise repeated under unchanged conditions.
- `PRACTICE-CHANGED-01`: body, environment, method revision, obligation, or observer changes and creates a new decision.
- `PRACTICE-FAIL-01`: stopping, seeking help, adapting, pushing, and abandonment remain distinct; injury supplies no guaranteed power.
- `PRACTICE-ADVANCE-01`: 1x, summarized, standing-order, and save/reload runs share the first information-available interrupt and protected outcome.
- `PRACTICE-ABUSE-01`: easy-action spam, micro-action splitting, consumable stacking, intentional near-failure, reload scouting, and idle calendar advance.

### Measurements

- time and evidence count before the first informed remain/leave/seek choice;
- number of plausible cultivation paths participants can name and distinguish;
- false certainty rate and understanding of ordinary alternatives;
- repeated actions before summary/conditional execution becomes available;
- decisions per practice cycle after initial learning;
- certification evidence diversity rather than repetition count;
- outcome/time parity across 1x, Advance, summary, and reload;
- incidence of participants selecting an exploit because it is clearly optimal.

### Provisional fail thresholds

- fewer than 80% can identify two plausible cultivation approaches and one credible reason to defer or refuse after the route fixture;
- more than 10% believe a UI marker or protagonist sense supplied canonical truth the character could not know through established perception/evidence channels;
- an unchanged mastered exercise requires more than two further embodied repetitions before summary/standing-order control is offered;
- repeating one easy action, subdividing it, waiting without new evidence, or farming injury can advance certification;
- the best normalized progression strategy is repeated identical input rather than changed context, diagnosis, relationship, resource, or risk judgment;
- Advance and 1x differ in first interrupt, protected outcome, hidden-information exposure, or cost; or
- abandoning cultivation produces a contentless or punitive terminal state.

---

## 4. Gauntlet G3 — Action-control load and intent uncertainty

### Hypotheses

1. Immediate, radial, spatial, and doctrine layers provide speed and depth without becoming a nested hotbar or pause-menu tax.
2. “Lethal,” “nonlethal,” “protective,” and “safe” are understandable preferences under uncertainty, never guaranteed outcomes.
3. Input device, frame rate, accessibility aid, or wall-time hold duration cannot add canonical precision, preparation, or reaction time.

### Fixtures

- `CONTROL-1V1-01`: known prepared technique against one readable threat.
- `CONTROL-1VMANY-01`: mixed simultaneous threats, bystander, uncertain target, and limited attention.
- `CONTROL-NEW-01`: newly learned operation with incomplete mastery.
- `CONTROL-BANK-01`: imminent projectile, hard pause, rebind/page attempt, and unprepared counter.
- `CONTROL-DEVICE-01`: identical semantic requests through keyboard/mouse, controller, hold/toggle alternative, timing assist, and normalized replay.
- `INTENT-FRAGILE-01`: unknown anatomy or hidden fragility makes a believed nonlethal action dangerous.
- `INTENT-CONCEALED-01`: disguised medium, concealed dependent, target substitution, and incomplete collateral map.

### Measurements

- time from perceived cue to intended semantic commitment;
- raw inputs, radial transitions, target corrections, accidental commitments, and cancel recoveries;
- prepared-slot and candidate utilization;
- workload and error by device/accessibility cohort;
- difference between requested intent, predicted uncertainty, and canonical result;
- comprehension that intent is not a guarantee;
- normalized canonical parity across input devices and isomorphic NPC requests.

### Provisional fail thresholds

- after the learning allowance, fewer than 80% commit the intended immediate action within 1.5 seconds of a readable cue;
- median target-correction or accidental-commit rate exceeds 10% in the 1-v-many fixture;
- any supported input/accessibility path lacks a semantic action available to another path;
- normalized outcomes differ by frame rate, input device, hold implementation, hard-pause duration, or player/NPC identity;
- hard pause can arm an unprepared technique, artifact mode, anchor, doctrine, or maintained pattern without semantic preparation;
- UI availability, safety, or prediction reveals concealed canonical truth; or
- fewer than 80% can explain why a requested nonlethal/protective action could still fail after the uncertainty debrief.

---

## 5. Gauntlet G4 — Doctrine automation without autoplay

### Hypotheses

1. Doctrine policies reduce clerical reaction burden while preserving reaction latency, scarcity, uncertainty, and authored priorities.
2. No policy set becomes a perfect defense, unattended combat engine, hidden detector, or same-instant loop.
3. NPCs can author and execute equivalent policies under the same information and capability constraints.

### Fixtures

- `POLICY-VALUES-01`: protect self, child/dependent, oath-target, and stranger under one scarce source.
- `POLICY-BURST-01`: staggered and simultaneous projectile/area/decoy burst exceeding target slots.
- `POLICY-DECOY-01`: false positives and disguised harmless/hostile signals.
- `POLICY-LOOP-01`: mutual redirect, absorb/re-release, warning cascade, and recursive counter.
- `POLICY-EXHAUST-01`: long probing encounter drains attention, source, durability, and recovery.
- `POLICY-OFFSCREEN-01`: unload/reload and S-tier changes preserve policy state and outcomes.
- `POLICY-NPC-01`: isomorphic player/NPC policy, information, priority, timing, and RNG.

### Measurements

- reaction latency and missed deadlines;
- selected policy versus actor-authored priority;
- source/attention/target-slot use;
- false positives, false negatives, saturation and exhaustion;
- number and terminal state of same-instant evaluations;
- manual interventions prompted by unresolved value conflicts;
- exploit win rate for one unchanged policy across adversary families;
- normalized player/NPC event logs.

### Provisional fail thresholds

- any policy reads hidden faction, intent, ownership, danger, identity, or target truth;
- any trigger reacts with zero semantic latency unless a separately maintained already-active defense entails it;
- actor-authored obligation priority is violated when its preconditions and resources are satisfied;
- stable IDs decide a nonidentical value/capability conflict;
- one unchanged policy defeats every adversary family without exhaustion, tradeoff, or counter;
- a recursive chain duplicates, erases, refunds, or reaches its evaluation cap as a gameplay outcome;
- a policy continues after consent, source, perception, attention, or arming state is lost; or
- player and isomorphic NPC policy logs differ after normalized naming.

---

## 6. Gauntlet G5 — Automatic collection, loot, custody, and economy

### Hypotheses

1. Collection removes repetitive clicking after earned perception/control without becoming an ownership, life, trap, or safety oracle.
2. Collection remains a physical/custodial process with interruption, competition, partial completion, and consequences.
3. Convenience does not create player-only battlefield priority or an unattended resource farm.

### Fixtures

- `COLLECT-MUNDANE-01`: fifty ordinary eligible scraps and three bulk material cohorts.
- `COLLECT-UNCERTAIN-01`: hidden claim, corpse inheritance, disguised living item, trap, seal, contamination, and evidence object.
- `COLLECT-RACE-01`: owner pickup while marked; two collectors with reversed stable IDs; opposed control/force.
- `COLLECT-CAPACITY-01`: item crosses receiving capacity mid-batch; quarantine incompatibility.
- `COLLECT-PATH-01`: moving target, broken path, obstruction, range loss, and transport collision.
- `COLLECT-PERSIST-01`: interruption, cancel, unload/reload, and save at every milestone.
- `COLLECT-NPC-01`: player one-button compiler versus isomorphic NPC semantic request.

### Measurements

- raw inputs and wall time versus manual collection;
- eligible mundane items correctly received;
- unknown/misclassified targets and whether UI leaked why;
- item/custody identity and conservation at every milestone;
- contest result and contribution attribution;
- partial/cancel/reload behavior;
- downstream witnesses, ownership disputes, traps, market response, and storage costs;
- player/NPC parity.

### Provisional fail thresholds

- collection reduces eligible mundane-item inputs by less than 80% after policy setup;
- any hidden category is inferred from selection, skipping, warning, or batch interruption without available evidence;
- any item is duplicated, erased, teleported, stripped of custody/provenance, or received twice;
- a lease grants possession, collision priority, legal priority, remote exclusion, or frozen state;
- stable ID decides a semantically unequal collection contest;
- bulk aggregation absorbs a unique, living, remains-linked, claimed, trapped, sealed, or evidentiary entity;
- unattended collection generates net resources without corresponding targets, transport, capacity, time, and world response; or
- player and isomorphic NPC collection requests resolve differently.

---

## 7. Gauntlet G6 — Terrain carving, construction, and destructive continuity

### Hypotheses

1. Mortal excavation and cultivation-scale carving create construction and discovery play, not voxel chores or one-click deletion.
2. Every milestone preserves topology, moving occupancy, material, bodies, unique objects, hazards, claims, and aftermath.
3. Large operations escalate through `CatastropheContract-v0.1` without turning implementation leases or stable IDs into fictional force.

### Fixtures

- `TERRAIN-MORTAL-01`: hand-dug shelter/tunnel with tools, spoil, shoring, drainage, ventilation, rights, and changing weather.
- `TERRAIN-TECH-01`: technique-carved volume with uncertain strata and interleaved cut/support/drain/vent choices.
- `TERRAIN-ENTRY-01`: person, body, animal, vehicle, water, gas, or unique item crosses a milestone boundary during work.
- `TERRAIN-CONFLICT-01`: overlapping cutters with reversed IDs/start times, unequal control, and claim dispute.
- `TERRAIN-COLLAPSE-01`: premature support failure continues after area demotion/unload.
- `TERRAIN-CATASTROPHE-01`: aquifer release, settlement isolation, self-propagating fracture, and K3+ escalation.
- `TERRAIN-PERSIST-01`: abort and save/reload at every milestone; later archaeology queries the operation history.

### Measurements

- number of high-level decisions versus repeated geometry inputs;
- occupancy/topology recertifications and stale-read rejections;
- material/spoil conservation and unique-entity remaps;
- support, water, gas, pressure, heat, dust, qi, ecology, route, and claim aftermath;
- concurrent-operation contest reasoning;
- reconstruction after S-tier and render-detail changes;
- player/NPC and worker-order parity;
- reference-hardware work and memory budget in later authorized prototypes.

### Provisional fail thresholds

- a simple surveyed mortal shelter/tunnel requires more than five repeated low-decision input sequences after its plan is accepted, unless voluntarily embodied;
- any committed milestone uses stale occupancy/topology/front state;
- a body, unique object, grave, formation node, water/gas front, qi vein, claim, or route disappears because it was not rendered;
- spoil/material fails exact attribution or declared physical tolerance;
- an engine lease grants land rights, force, possession, or collision priority;
- stable ID decides a semantically unequal overlapping edit;
- collapse, pressure, flow, fire, or contamination freezes when detail demotes or the area unloads;
- a K3+/mass-topology operation commits outside `CatastropheContract`; or
- abort/save/reload duplicates work, material, damage, or recovery.

---

## 8. Gauntlet G7 — Protagonist advantage and universal NPC parity

### Hypotheses

1. Any selected protagonist advantage changes a narrow decision operation rather than granting output, truth, immunity, favorable RNG, or content delivery.
2. The game remains desirable with no advantage.
3. Every player UI/QoL compiler maps to ordinary actions available to an isomorphic NPC under the same state, even when NPCs do not use the player-facing interface.

### Fixtures

- `ADV-NONE-01`: all opening scenarios with no advantage.
- `ADV-A/B/C-01`: each candidate direction across mortal work, teacher choice, fraud, first perception, conflict, failure, and success.
- `ADV-REMOVE-01`: remove the advantage after history has formed; only its declared operation and downstream effects disappear.
- `ADV-COPY/LOSS-01`: transfer, theft, copy, possession, death, reincarnation, and suppression under each candidate identity model.
- `PARITY-COMPILER-01`: target proposals, radial filtering, accessibility geometry, doctrine, collection, terrain blueprint, formation/cohort macro, interruption, and reload.
- `PARITY-OPPORTUNITY-01`: matched player/NPC world-generation opportunity, warning, teacher, resource, and response state.

### Measurements

- direct contribution to reservoir, output, durability, claim scope/support, RNG, survival, and mountain work;
- changed action choices versus changed success rate;
- scenario decisions solved automatically;
- no-advantage desire to continue and perceived completeness;
- player/NPC normalized events, costs, timing, information, opportunities, and outcomes;
- social evidence, counters, loss, transfer, and responsibility.

### Provisional fail thresholds

- any candidate supplies undeclared force, resource, claim scope/support, truth, aim, immunity, survival, favorable RNG, or content spawn;
- any candidate automatically solves one golden scenario or becomes required to discover cultivation;
- removal erases ordinary memory, skill, relationships, injury, or world history;
- the no-advantage control is rated as an incomplete or punitive mode by at least 30% more participants than every advantage cohort;
- a player compiler adds knowledge, precision, targets, time, capacity, success, or priority unavailable to an isomorphic NPC request;
- any normalized isomorphic case differs; or
- generation places an opportunity because `isPlayer` rather than a declared admission/advantage contract was present.

---

## 9. Gauntlet G8 — High-realm macro play and action expressivity

### Hypotheses

1. Greater capability unlocks new decision families and consequence radii rather than larger numbers, larger radial menus, or perfect automation.
2. Macro-intents reduce clerical targeting while retaining exclusions, uncertainty, commitment, counterplay, delegation, and aftermath.
3. Institutions, dependents, territory, ecology, enemies, and prior history remain strategically relevant to powerful actors.

### Fixtures

- `MACRO-DEFENSE-01`: protect a route complex with limited attention/source while attacks target different dependencies.
- `MACRO-CONFLICT-01`: combat, evacuation, negotiation, deception, evidence, and terrain/ecology consequences compete.
- `MACRO-DELEGATE-01`: formation, cohort, sect/institution, and consenting specialist execute bounded delegated tasks with latency and error.
- `MACRO-UNCERTAIN-01`: incomplete maps, hidden populations, disguised medium, stale reports, and uncertain claim scope/support.
- `MACRO-COUNTER-01`: rival adapts to repeated doctrine and attacks preparation, reputation, source, route, or dependent rather than only the body.
- `MACRO-SCALE-01`: site, settlement, region, continent, and world-scale versions preserve the same causal rules with different consequence radii.
- `MACRO-NPC-01`: isomorphic high-realm NPC receives the same semantic macro request and support.
- `RITUAL-MEANING-01`: separately record any ontic effect, participant belief, public interpretation, material/time requirements, office/lineage standing, consent/coercion, witnesses, failure and aftermath; participant belief never proves the effect.
- `HIERARCHY-PLURAL-01`: matched power evidence across distinct cleared institutions/cultural contexts permits context-dependent flight, bargaining, protection of dependents, concealment, conditional surrender, dissent, ritual deference or refusal. Sect, lineage, clan, temple, monastery, court, household and state office remain different relation types.

### Measurements

- high-level commitments, target corrections, policy changes, and menu transitions per operation;
- reduction in individual target commands relative to a micro-command baseline;
- number of recognized response families and meaningful tradeoffs;
- dependency/institution/terrain/ecology outcomes;
- uncertainty errors and correction paths;
- counter adaptation and doctrine dominance;
- delegated latency, consent, attribution, and failure;
- parity across actor identity, render detail, and simulation tier.
- separation of ritual operation, belief, interpretation, standing, consent and aftermath;
- response diversity under matched power evidence across institution/context manifests.

### Provisional fail thresholds

- macro control reduces individual target commands by less than 90% in a cohort-scale task;
- more than 40% of experienced participants' decision wall time is spent paging/configuring rather than choosing objectives, tradeoffs, or responses;
- one doctrine/macro solves every fixture without changing policy, accepting loss, exposing a dependency, or consuming scarce support;
- a macro reads hidden targets/claims/danger or guarantees exclusions it cannot verify from available evidence;
- delegated actors lose consent, independent goals, evidence, attribution, or failure possibility;
- lower actors, institutions, territory, or ecology become irrelevant except as hit points; or
- ritual belief, office or deference automatically creates an ontic technique effect without its own contract;
- a power-gap label directly causes kowtow, insanity, obedience, moral deference, inventory surrender or one universal surrender response; or
- player/NPC, S-tier, worker-order, save/reload, or render state changes the canonical result.

---

## 10. Gauntlet G9 — Catastrophe, irreversible loss, saves, and continuation UX

### Hypotheses

1. Mortal and low-realm players can make consequential decisions without being able to defeat a world-scale source.
2. Warnings communicate available evidence, uncertainty, lead time, and response constraints without becoming omniscient quest markers.
3. Irreversible loss can feel caused and meaningful rather than arbitrary punishment or motivational scenery.
4. Save and viewpoint-continuation modes are understood before they matter and never hide protagonist immunity or cross-branch farming.

### Fixtures

- `LOSS-WARNING-01`: true warning with limited confidence and at least two low-realm response families.
- `LOSS-FALSE-01`: plausible false warning and politicized disbelief.
- `LOSS-UNSEEN-01`: no available warning; 1x and Advance reveal nothing before observable effect/incapacity/death.
- `LOSS-WORLD-01`: world is not saved; survivors, evidence, culture/ecology, injuries, displacement, blame, and future possibilities differ.
- `LOSS-DEATH-01`: protagonist dies; finality or disclosed viewpoint successor follows the selected identity model without asset, office, claim, or unique-relation transfer.
- `LOSS-SAVE-01`: Free, Bound, and Single Chronicle explanation and behavior; reload before/during/after catastrophe transaction.
- `LOSS-PARITY-01`: protagonist/NPC survival certificate and contribution-removal control.
- `LOSS-OPENING-01`: ordinary opening, Epic Protagonist, Lawful Chronicle, Unbounded Cosmos, and disclosed Doomed Prologue admission behavior.

### Measurements

- warning evidence, uncertainty, arrival window, and response comprehension;
- materially different reachable outcomes recognized and chosen;
- evacuation/shelter/preservation capacity and opportunity costs;
- causal explanation of survival, death, world loss, and successor state;
- perceived fairness before and after causal debrief;
- attachment/grief versus “scripted punishment” response;
- save-mode and character-knowledge comprehension;
- reload determinism, branch separation, and cross-branch exploit attempts;
- protagonist/NPC parity.

### Provisional fail thresholds

- a warning or Advance stop exposes information no authorized actor received;
- a warned low-realm fixture offers no consequence-changing response;
- every response differs only in dialogue while survivors, evidence, relationships, ecology, obligations, or future possibility remain identical;
- refuge, evacuation, teleport, ancestor rescue, or continuation appears because of protagonist status after commitment;
- after debrief, at least 40% still cannot identify the causal signal, decisive constraint, and reason their outcome occurred;
- fewer than 90% correctly distinguish player memory, character knowledge, branch history, numerical identity, and viewpoint continuation in the save/continuation tutorial;
- reload rerolls committed intent, fronts, warnings, victims, costs, rewards, or hidden facts within a branch;
- viewpoint continuation automatically grants a successor any of numerical identity, memory, bodily/cultivation continuity, custody/property, office or unique claim, legal liability, social blame, relationship recognition, oath obligation, or an optional karmic relation without a separately established transition for that domain; moral responsibility is evaluated, not transferred as an asset; or
- an isomorphic NPC taking the same survival action receives a different result.

---

## 11. Integrated exploit matrix

The following combinations must run even if each subsystem passes alone:

| Combined fixture | Systems under pressure | Required invariant |
|---|---|---|
| `X-01 Practice during catastrophe` | cultivation, Advance, warnings, injury, doctrine | earliest established-information interrupt; no hidden oracle or free recovery |
| `X-02 Loot during terrain collapse` | collection, custody, moving topology, remains, save/load | each item/body resolves exactly once; no lease immunity |
| `X-03 Nonlethal macro with concealed civilians` | intent, perception, high-realm geometry, catastrophe | no hidden safety guarantee; identities and collateral persist |
| `X-04 Advantage-assisted warning` | advantage, evidence, catastrophe, NPC parity | only declared bounded clue differs; no survival force appears |
| `X-05 Pocket-time work economy` | time domain, labor, cultivation, markets, aging | no free labor/resources; external commitments and aging remain |
| `X-06 Automated redirect into terrain` | doctrine, TECH-DAG, fracture, bystanders | conserved terminal reducer and dynamic intersection |
| `X-07 Death during collection/possession` | identity, custody, batch transaction, continuation | no duplication or silent transfer to successor/viewpoint |
| `X-08 Hard pause under multi-threat load` | controls, policies, preparation, accessibility | free thought/remap only; no zero-time arming or sensing |
| `X-09 High-realm NPC near mortal player` | agency, deterrence, perception, low-realm options | no player aggro script, scalar immunity, or pity rescue |
| `X-10 Long no-player era then promotion` | cohorts, history, catastrophe, terrain, institutions | future-refinement and protected-query parity |

Any protected-state mismatch, hidden-information leak, infinite loop, duplicate, erased person/item/claim, or player/NPC physics difference is S0/S1 regardless of subjective ratings.

---

## 12. Sequencing and dependencies

### Phase A — Lock evidence before testing

1. Ratify metric definitions, provisional thresholds, severity rules, participant protocol, and fixture manifests.
2. Version `AuthorizedInformationView`, semantic action/transaction log, normalized NPC comparison, and outcome-difference rules.
3. Attach `CulturalContextManifest-v0.1` and `SourceBoundaryRecord` where applicable; clear culturally or source-distinctive content through the source-workplan originality red-team before confirmatory tuning.
4. Assign independent reviewers, including source/cultural reviewers for represented contexts, and freeze confirmatory seeds/scripts.

**Exit gate:** every measurement can be reproduced from a fixture record; no success criterion is invented after results.

### Phase B — Paper-system gauntlets

Run `G1`, `G2`, `G7`, and `G9` at `E0/E1`, plus contract traces for `G4–G6`.

Dependencies:

- mortality and state-ledger rules before route/pacing judgment;
- identity/death choice before any continuation result can pass;
- perception/evidence contract before intent, doctrine, loot, or warning UX can pass;
- custody/ownership contract before collection can pass;
- terrain/material/topology contract before destructive or construction play can pass.

**Exit gate:** no paper-level S0/S1; experiential uncertainties are recorded rather than promoted as facts.

### Phase C — Low-fidelity control and information studies

Run `G3`, warning/save-mode portions of `G9`, collection policy UX from `G5`, and macro-intent comprehension from `G8` at `E2`.

**Exit gate:** the control surface, uncertainty language, mode explanations, and macro requests meet their provisional comprehension/workload thresholds without executable world simulation claims.

### Phase D — Authorized subsystem prototypes

Only after explicit code authorization, implement the smallest isolated prototypes needed for timing, deterministic transaction, control, and reference-hardware measurement:

1. normalized input/control and intent uncertainty;
2. doctrine arbitration and recursive technique terminal reducers;
3. collection batch/custody contest;
4. sparse terrain transaction and moving occupancy;
5. accelerated routine and catastrophe-warning parity.

**Exit gate:** `E3` determinism, parity, performance, save/reload, and exploit fixtures pass. Prototype success does not authorize production architecture.

### Phase E — Integrated vertical slice

Phase E may consume only versioned contracts that already pass E0. Identity/death, protagonist advantage, perception/evidence, custody, terrain and realm/macro contracts are explicit prerequisites for their dependent fixtures. Until those are selected/versioned and E0-passing, the authorized integrated scope stops at mortal-through-Qi-Condensation play; high-realm, unselected-advantage, identity-continuation and other candidate-dependent fixtures remain visibly `NOT RUN` rather than being approximated or allowed to block the bounded slice.

Run all `X-*` combinations and the confirmatory human cohorts at `E4` across:

- no advantage and each surviving candidate;
- mortal, Contact, later Qi Condensation, and high-realm fixtures;
- Free, Bound, and Single Chronicle modes;
- keyboard/mouse, controller, accessibility alternatives, 30/60/144 Hz presentation, renderer-disabled canon, and reference hardware;
- protagonist and isomorphic NPC controls.

**Exit gate:** zero S0/S1, all locked confirmatory thresholds pass, and every result is traceable to fixture evidence. Failure returns only the affected contracts and downstream dependents to repair; it does not erase unrelated research.

---

## 13. Required outputs

The next phase should produce:

1. a ratified measurement and participant protocol;
2. versioned fixture manifests and facilitator scripts;
3. blinded discovery and confirmation reports with raw aggregate measures and dissent;
4. exploit traces and repair/re-audit ledger;
5. player/NPC normalized parity reports for every convenience compiler;
6. control workload/accessibility report;
7. mortal/cultivation pacing and voluntary-continuation report;
8. catastrophe/loss/save-mode comprehension report;
9. reference-hardware benchmark report only after authorized executable testing; and
10. a promotion index that says `PASS`, `FAIL`, or `NOT RUN` for every fixture without converting untested hypotheses into canon.

No marketing claim may use “fun,” “AAA,” “living universe,” “infinite,” “fully simulated,” “fair,” or “playable” as a verified fact until the relevant locked evidence stage has passed.
