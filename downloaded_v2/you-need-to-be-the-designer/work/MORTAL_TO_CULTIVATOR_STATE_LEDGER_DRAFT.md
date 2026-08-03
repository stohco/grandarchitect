# Mortal-to-Cultivator Golden Scenario State Ledger — Draft v0.1

**Status:** reviewed integration contract; pre-canon; no game code  
**Purpose:** prove that the seven golden scenarios describe one continuing life rather than seven disconnected demos  
**Consumes:** Mortal Year Atlas, Terminology & Cultivation Foundation, Qi Condensation Envelope, Identity & Death Models

---

## 0. Governing rule

Every scenario reads the world produced by prior events and writes consequences that later scenarios must honor. A golden fixture may be replayed independently only from a complete pinned starting snapshot whose history is reconstructible.

```text
Mortal life
→ teacher relationships
→ method/evidence history
→ first qi perception
→ first conflict
→ failed transition
→ first certified Qi Condensation success
```

This is a validation path, not a mandatory main quest or universal chronology. In ordinary play, teachers may appear earlier, conflict may be avoided, the manual may never be found, the player may stop after failure, and mortal life may continue indefinitely.

---

## 1. Protected state families

| State family | Minimum protected records | Never compressed into |
|---|---|---|
| Person and embodiment | `PersonContinuant` ID; `BodyInstance` ID; active time-scoped `Embodiment` relation and validity interval; body plan, health, disability, pain, fatigue, nutrition, sleep, injury, adaptation, age, senses, current location | hit points, “healthy/unhealthy,” or one merged person/body identifier |
| Household/survival network | residence, consumption, production, obligation, and claim relations; care dependents; absences; private/common stores | one party inventory |
| Material world | item/batch identity, source, maker, repair, quality, claimant, storage, contamination, damage | generic resource count where provenance matters |
| Time | world date, local cycles, deadlines, weather front, hard labor windows, recovery timers, ritual/mourning dates | paused quest timers |
| Work and competence | livelihood practices, embodied proficiency, teacher, tools, observed failures, current commitments | one occupation level |
| Relationships | affection, trust, fear, debt, grievance, care, authority, consent, promises, shared history, audience-specific reputation | global affinity |
| Knowledge and belief | observation, source, witness path, confidence, alternatives, contradiction, secrecy, memory change | player-unlocked global truth |
| Law and institutions | applicable jurisdiction, forum, office, rule revision, records, evidence, status claim, dissent, enforcement capacity | universal law meter |
| Environment | water, food, fuel, routes, weather, qi sources/sinks if admitted, contamination, ownership, replenishment, scars | decorative biome seed |
| Cultivation practice | method revision, teacher/manual provenance, attempts, signals, stop conditions, costs, injuries, recovery, certification evidence | XP bar |
| Qi state | reservoir, throughput, route, control, signature, compatibility, heat/waste, recovery debt, contribution source | mana |
| Identity and death | body/agency/memory/spirit/causal/social/legal continuity, remains, copy lineage, death state, contested judgments | respawn flag |
| Protagonist advantage | exact advantage revision, locus, privileged operation, costs, counters, traces, exposure, transfer/death, contribution | `isPlayer` bonus |

All protected records survive save/load, area unload, S0–S4 simulation-resolution changes, rendering-LOD changes, generator migration, and scenario transitions.

### 1.1 S0–S4 simulation-resolution contract

Simulation resolution changes representation and scheduling frequency, never canonical law or protagonist privilege. It is orthogonal to render LOD, persistence/protection class, and causal/narrative significance as specified by the Real-Time World architecture. Earlier `F0–F4` references are migration aliases only.

| Tier | Intended scope | State retained | Permitted resolution | Promotion/demotion obligation |
|---|---|---|---|---|
| `S0 Chronicle` | distant eras, worlds, institutions, lineages | named/unique entities; population and resource cohorts; ownership/custody; obligations; event queue; causal and generation manifests; catastrophe envelopes | event-DAG and bounded aggregate transitions only | must emit cohort composition, exceptions, uncertainty/error bound, and every named outcome needed to rehydrate |
| `S1 Strategic` | distant regions and factions | S0 plus routes, settlements, institutional actors, stocks/flows, hazards, scheduled projects | cohort movement, market/institution actions, conflict and ecology envelopes | conserve people/material/claims within declared error bounds and preserve exception ledgers |
| `S2 Regional` | current region beyond immediate interaction | S1 plus households, named agents, local infrastructure, weather/ecology cells, relationship summaries | scheduled agent decisions and regional processes at variable semantic steps | promotion materializes individuals only from signed cohort membership and history; no invented clean slate |
| `S3 Encounter` | nearby/interactable spaces | S2 plus individual bodies, inventories, observations, intentions, action queues, local geometry/topology | exact semantic actions with collision/line-of-effect and bounded local physics | demotion commits unfinished actions, injuries, witnesses, custody, traces, and schedules before aggregation |
| `S4 Immediate` | combat, precision interaction, visible catastrophe frontier | S3 plus high-frequency canonical contact/projectile/technique state and local refinement boundary conditions | fixed canonical action steps; presentation interpolation remains separate | leaving S4 stores the semantic outcome and sufficient reconstruction data; render particles/poses are not canon |

All tiers share the same ordered semantic-event journal. Tier-equivalence tests compare protected hashes and latent-detail manifests, not presentation frames. Aggregate storage may retain bounds, but the same future canonical query or promotion must deterministically materialize the same facts from the same manifest. Promotion cannot create favorable facts; demotion cannot erase a named person, unique item, debt, death, warning, intent commitment, or unresolved player-relevant interrupt.

---

## 2. Scenario read/write contracts

### A. One Mortal Year

**Reads**

- generated ecological livelihood complex;
- household or survival-network topology;
- body and accessibility state;
- local calendars, institutions, obligations, beliefs, and hazards;
- source-scoped authored culture once ratified.

**Writes**

- at least one full seasonal history of labor, care, rest, leisure, dispute, and recovery;
- changes to stores, tools, land/use claims, routes, household composition, health, debt, reputation, and institutions;
- specific relationships with memories and unfinished intentions;
- ordinary observational knowledge from work and place;
- possible ambiguous cultivation evidence, never a mandatory quest marker;
- reasons to remain, leave, change livelihood, seek cultivation, or defer the decision.

**Forbidden reset:** beginning cultivation cannot erase the mortal-year body, obligations, skill, relationships, property, law, grief, disability, seasonal state, or world changes.

### B. Teacher Choices

**Reads**

- work schedule and freedom from labor;
- care obligations and household negotiation;
- body variation, injuries, access needs, language/literacy, travel ability;
- prior clues, witnesses, rumors, and institutions;
- each candidate teacher's knowledge, capacity, motives, availability, and social position.

**Writes**

- disclosed and concealed information;
- teacher/student or peer relations with consent, payment/service, access, secrecy, and exit terms;
- method/manual revisions received;
- schedules displaced and people who cover them;
- trust and harm history;
- alternative paths preserved if a teacher refuses, leaves, dies, or proves wrong.

**Forbidden reset:** changing teachers does not erase embodied learning, injury, promises, copied notes, institutional reputation, or the former teacher's agency.

### C. Fraudulent Method or Transmission

The golden paper manuscript is one fixture, not a required artifact class. `MethodTransmission` may be a manuscript, copied notes, oral instruction, demonstration, mnemonic verse, rumor, dream report, institutional curriculum, artifact imprint, or the actor's own explicit hypothesis. Every claim records medium, source chain, revision, intended audience, prerequisites, and confidence; `medium = none/self-hypothesis` is valid.

**Reads**

- literacy and specialist-language capability;
- material/craft knowledge relevant to the actual medium, if any;
- teacher doctrines and disagreements;
- prior recipient/demonstrator histories, transmitter incentives, market/law forums where applicable;
- body's current capacity and the environment assumed by the text.

**Writes**

- claim-level evidence rather than one true/false flag;
- transmission custody/access, annotations, copying/repetition, alteration, suppression, sale, endorsement, or public warning as applicable to the medium;
- seller, victim, teacher, institution, and witness reactions;
- any test attempt, cost, injury, residue, and conclusion with confidence;
- provenance knowledge that later changes the failed-breakthrough explanation.

**Forbidden reset:** destroying or suppressing one carrier does not erase other copies, memories, injuries, transactions, demonstrations, or testimony; exposing a false claim does not guarantee belief.

### D. First Qi Perception

**Reads**

- mundane expertise from livelihood and environment;
- body, hunger, illness, fear, fatigue, sensory differences, and attention;
- method and teacher claims;
- signal source, noise, ordinary alternatives, and any advantage contribution;
- available time, safety, witnesses, and instruments.

**Writes**

- located observation with channel, confidence, alternatives, and prediction;
- repeated or failed comparisons across contexts;
- sensory load and recovery;
- changed belief without automatic cosmological certainty;
- precursor evidence toward Contact certification, never certification from one event.

**Forbidden reset:** perception cannot reveal identity, intent, morality, exact realm, hidden text, or future success unless a separate lawful interface entails it.

### E. First Conflict

**Reads**

- resource/infrastructure pressure originating in mortal history;
- people harmed or tempted by the disputed method or claim transmission, if any; otherwise an independently generated resource, testimony, labor, legal, or safety conflict;
- player/opponent goals, knowledge, self-preservation, relationships, and legal position;
- terrain, bystanders, exits, tools, injuries, fatigue, witnesses, and authority;
- current pre-certification qi evidence and ordinary skills.

**Writes**

- negotiation, repair, flight, exposure, institutional action, injury, death, or combat results as actually chosen;
- evidence and audience-specific accounts;
- collateral, resource, route, household, and institutional consequences;
- bodily strain that may contribute to later failure;
- opponent and bystander futures rather than despawning them after resolution.

**Forbidden reset:** defeat cannot summon an unearned rescue, combat cannot erase noncombat resolutions, and qi perception cannot become automatic targeting.

### F. Failed Breakthrough

**Reads**

- exact method revision and false/uncertain claims retained from their actual provenance; a manual is optional;
- body strain/injury from previous life and conflict;
- food, sleep, sanitation, shelter, care, emotional pressure, seasonal obligations;
- teacher/observer availability and trust;
- practice attempts, signals, stop conditions, site, and qi environment;
- advantage contribution, if any, through its normal contract.

**Writes**

- preparation and transaction ledger;
- phase-by-phase signals, choices, intervention, and witnesses;
- clean stop, partial transition, false circuit, conduit irritation, other injury, unstable result, or death as entailed;
- remaining evidence and each observer's interpretation;
- missed work, care burden, debt, reputation, teacher responsibility, and recovery options;
- continued mortal path if cultivation is abandoned.

**Forbidden reset:** failure grants no compensation power, hidden pity progress, free diagnosis, full healing, or guaranteed alternate path.

### G. First Genuine Success

**Reads**

- complete attempt and recovery history;
- body and qi state inside Contact limits;
- corrected-enough method and evidence;
- three-day/three-context certification record;
- one false signal recognized and one stop condition deliberately honored;
- complete personal/prepared/external contribution ledger.

**Writes**

- ontic Contact capability state, its evidence-backed certificate under a named protocol, and audience recognition as three separate records;
- repeatable `Attend to Flow` and one simple `Route Qi` operation if their contracts pass;
- new signals, costs, recovery, responsibilities, exposure, and institutional claims;
- changed interpretations by family, teachers, employers, rivals, fraudsters, and authorities only where information travels;
- continuation of ordinary work, disability, grief, debt, hunger, law, season, relationships, and mortal skill.

**Forbidden grant:** projection, flight, instant healing, universal diagnosis, automatic status, guaranteed lifespan, combat victory, or huge-mountain output.

---

## 3. Cross-scenario invariants

1. **No mandatory order disguised as causality.** A scenario declares actual prerequisites, not episode number.
2. **No global quest knowledge.** Every actor's belief traces through perception, testimony, record, inference, or lawful supernatural access.
3. **No state laundering.** Renaming, selling, copying, transferring, unloading, abstracting, or migrating a state cannot remove costs, injuries, debts, ownership, identity, or history.
4. **No protagonist delivery system.** Opportunities arise from world history and actors; they need not wait for or select the player.
5. **No only teacher.** Every teacher may refuse, disappear, err, or die without ending all lawful paths.
6. **No only manual.** Destroying or missing one artifact cannot make the universe's cultivation ontology inaccessible forever unless that historical loss is truly generated and the game supports life after it.
7. **No only build.** Remaining mortal or stopping cultivation remains a complete life.
8. **No hidden compensation.** Loss can remain loss; continued agency comes from world relationships and possible actions, not guaranteed rewards.
9. **No copied capability credit.** Teacher, artifact, formation, ally, environment, authority, and advantage contributions remain separate from personal certification.
10. **No realm-label shortcut.** World truth derives from body/qi/practice/knowledge/realm-envelope state; institutional titles and reputation may differ.
11. **No accessibility physics change.** Control assistance changes input and presentation, never canonical capability or outcome.
12. **No death ambiguity collapse.** Death, agency, body, memory, spirit, causal descent, personhood, legal identity, and relationship succession use typed judgments.

---

## 4. Branch and generation ledger

For each scenario boundary, record:

```text
boundary identity and world time
prior snapshot/event prefix hash
canonical seed and normalized generation inputs
generator, schema, ontology, law, and action-contract versions
hierarchical random-stream IDs, branch derivation path, and consumed cursors
deterministic collection ordering rule
generated output hash and any signed migration transform
PersonContinuant ID
BodyInstance ID
active Embodiment relation and validity interval
household/survival-network revision
calendar and pending deadlines
stores, items, ownership, and obligations
health, disability, injury, fatigue, and recovery
skills, practices, attempts, certifications, and teachers
knowledge/belief observations and provenance
relationships and audience-specific reputation
institutional/legal state
environment, route, infrastructure, and scars
method/transmission/record/item identity, medium, provenance, revision, and custody
qi state and contribution ledger
advantage state if any
identity/death events and judgments
scheduled consequences and reopening conditions
```

An independently replayed fixture must supply this full manifest or explicitly mark omitted state as non-applicable. Defaulting omitted values to “healthy, debt-free, unknown, no relationship, no consequence” is forbidden.

Random streams are allocated hierarchically from the canonical seed and stable causal-domain/entity/process/event IDs, never from traversal order, frame count, wall-clock time, entity-array position, or branch ID alone. `BranchId` records lineage but does not globally rekey reality. A divergence event derives new streams only for processes proven causally downstream of that divergence; unaffected domains retain the parent stream identity and cursor. A harmless dialogue choice therefore cannot reroll a remote beast route, treasure, victim, weather process, or catastrophe. A migration must retain the old manifest and output hash, declare a deterministic transform, and write a new manifest; it may not silently reinterpret an old seed.

`RNG-IRRELEVANT-COMMUTE-01` forks on an unrelated choice and requires identical unaffected-world streams and facts. `RNG-CAUSAL-DOWNSTREAM-01` changes an input that actually reaches a process and permits only its declared downstream draws to diverge. Branches cannot be scouted for a favorable unrelated cosmos.

Every scenario-changing transaction records `TransactionId`, branch ID, read revisions, reservations, deterministic write set, child/external writes, `Prepared | Committed | Aborted | Compensating` state, and monotonic commit sequence. Replay is idempotent. Partial breakthroughs persist as committed phase transactions, not half-written parent transactions.

---

## 5. Counterfactual test matrix

Replay the suite while varying one factor at a time and in risk-weighted combinations:

- no protagonist advantage;
- each candidate advantage;
- no cultivation pursuit;
- teacher refusal, death, error, exploitation, or reassignment;
- manuscript fixture never generated, destroyed early, copied widely, or institutionally endorsed;
- no authored carrier exists: the disputed method arrives orally, by demonstration, as rumor, as curriculum, or as the actor's own hypothesis;
- first perception is a false positive;
- conflict fully avoided, socially lost, physically lost, or won at lasting cost;
- failed breakthrough ends in clean stop, injury, deviation, path abandonment, or death;
- household support, opposition, dependence, separation, or absence;
- poor, middling, and powerful starting survival networks;
- body, disability, sensory, age, gender, language, class, and legal-status variations;
- disaster during a practice window;
- save/load, area unload, fidelity transition, generator migration, and world-law boundary.

The suite fails if changing a factor only changes dialogue while the same optimal action and normalized outcome remain.

### 5.1 No-manual substitution matrix

| Original fixture dependency | When no manual exists | Applicability rule |
|---|---|---|
| material authentication | authenticate speaker, demonstration conditions, teaching lineage, institutional record, or observed repeatability | substitute with medium-specific provenance tests; mark paper/ink tests `N/A` |
| fraudulent seller/victims | misleading teacher, confident peer, self-interested institution, repeated rumor, or sincere but mistaken experimenter | generate only if causal history supports one; otherwise use an independent conflict |
| annotated false claims | oral revisions, remembered sequence, witnessed corrections, curriculum versions, or self-hypothesis log | preserve claim-level versions; memory uncertainty is evidence, not a hidden canonical rewrite |
| later conflict | dispute over access, injury, resource, testimony, labor, law, or safety | the conflict must consume generated pressures; it need not involve cultivation fraud |
| failed breakthrough explanation | compare attempted method revision against body, site, timing, prerequisites, and observed evidence | false-manual residue is optional; at least one causal failure family must remain executable |

Each scenario declares `Required | Substitute | NonApplicable` for every dependency. `NonApplicable` removes both the read and its promised payoff; it never fabricates a default artifact.

---

## 6. Measurable obligations

- Every scenario read is backed by an existing state or explicitly generated prerequisite.
- Every material write appears in at least one later read, scheduled consequence, or justified terminal ledger.
- At least three mortal-year facts materially change every later scenario in the connected golden fixture.
- At least one ordinary skill remains strategically useful in each later scenario.
- At least one relationship and one obligation remain active through first certification.
- At least one world scar or institutional change persists from the mortal year.
- No scenario boundary clears injury, fatigue, debt, custody, belief, teacher capacity, witness memory, deadline, or environmental state without a causal event.
- Isomorphic NPC fixtures resolve through the same contracts.
- Removal of an advantage removes only its declared operation and downstream consequences.
- Contact certification is impossible with one lucky event, mentor-driven flow, artifact output, hidden contribution, or missing recovery proof.
- Personal Qi Condensation fails every `HugeMountainClass-H0` split predicate.

---

## 7. Release decision

This ledger may become normative for the golden suite before any scenario content becomes canon. It governs continuity and attribution, not the setting's final people, culture, geography, cosmology, teacher roster, manual, or plot.

No implementation authorization follows from this document.

---

## 8. Stable graph and test binding registry

This registry is normative for the golden suite. IDs are stable; revisions change only when semantics change. Every implementation schema must bind to these IDs rather than prose headings.

| Stable ID / rev | Protected node or edge | Owner | Authorized writers / readers | Minimum validating tests |
|---|---|---|---|---|
| `PF-PERSON-01/r2` | person, body, embodiment interval | Identity draft | death/embodiment transactions / all scenarios | `ID-COPY`, `ID-FISSION`, `TIER-PERSON` |
| `PF-SURVIVAL-01/r1` | household/survival network | Mortal Atlas | life and relationship events / A–G | `YEAR-NONRESET`, `TIER-HOUSEHOLD` |
| `PF-MATERIAL-01/r1` | items, batches, provenance, custody | Mortal Atlas | material transactions / A–G | `NO-DUPLICATE`, `CUSTODY-CHAIN` |
| `PF-TIME-01/r1` | canonical time, local phases, deadlines, event queue | Real-time architecture | committed semantic actions / all | `TIME-EQUIV`, `FIRST-INTERRUPT` |
| `PF-WORK-01/r1` | practice and embodied competence | Mortal Atlas | work/practice results / A–G | `SKILL-CARRY`, `NO-XP-RESET` |
| `PF-RELATION-01/r1` | typed relationship and consent history | Mortal Atlas + Identity | social transactions / A–G | `AUDIENCE-DIFF`, `CONSENT-WITHDRAW` |
| `PF-KNOW-01/r1` | observations, beliefs, provenance | Research graph | lawful observation/testimony / A–G | `NO-GLOBAL-TRUTH`, `BRANCH-KNOWLEDGE` |
| `PF-LAW-01/r1` | jurisdiction, rule, office, judgments | future law foundation | authorized legal events / B–G | `JURISDICTION`, `AUTHORITY-NONDUP` |
| `PF-ENV-01/r1` | ecology, routes, hazards, scars | Mortal Atlas | ecology/material/catastrophe events / A–G | `SCAR-PERSISTS`, `TIER-ECOLOGY` |
| `PF-METHOD-01/r2` | method claims and transmission provenance | Cultivation foundation | source-specific transmission events / B–G | `NO-MANUAL`, `CLAIM-VERSION` |
| `PF-QI-01/r2` | reservoir, routes, contribution, recovery | Qi draft | cultivation transactions / D–G | `STACK-*`, `QC-CONTACT` |
| `PF-IDENTITY-01/r2` | ontic resolution and continuity judgments | Identity draft | ontology resolver and institutions / A–G | `ONTIC-JUDGMENT-SPLIT`, `ID-MATRIX` |
| `PF-ADVANTAGE-01/r2` | candidate operation target/cost/trace | Qi draft | signed advantage action / A–G | `ADV-M0`, `ADV-NPC-PARITY` |
| `EDGE-A-B-01/r1` | mortal history → teacher choice | this ledger | A commit / B reader | `CARRY-A-B` |
| `EDGE-B-C-01/r2` | teaching → method/transmission dispute | this ledger | B/C commits / C–G | `NO-MANUAL`, `TEACHER-REFUSAL` |
| `EDGE-C-D-01/r2` | method evidence → perception experiment | this ledger | C/D commits / D–G | `FALSE-POSITIVE`, `PROVENANCE` |
| `EDGE-D-E-01/r1` | observations → conflict options | this ledger | D/E commits / E–G | `CONFLICT-AVOIDED`, `NO-TARGETING` |
| `EDGE-E-F-01/r2` | accumulated pressures → attempted transition | this ledger | E/F commits / F–G | `FAILURE-CAUSE`, `PARTIAL-COMMIT` |
| `EDGE-F-G-01/r2` | failure/recovery evidence → genuine success | this ledger | F/G commits / G | `QC-CONTACT`, `THREE-CONTEXT` |

Every release predicate must cite at least one stable ID and test. Orphan prose requirements, unnamed writers, unversioned edges, and tests without protected-state assertions block release.

### 8.1 Tier ecology fixture — `TIER-ECOLOGY-v0.1`

**Pinned start at canonical day 0**

```text
GeneratorManifest: GEN-ECO-01/r1, seed 0x5EED, no unconsumed branch-dependent streams
Topology: CELL-01 containing WELL-01, SOIL-01, HOUSE-01..04
People: PERSON-01..12, three assigned to each household; all alive and present
Unique item: VALVE-01/r1 installed at WELL-01, custodian PERSON-03
Stocks: WELL-01 water = 1000 water_units; communal grain = 600 grain_units
Scheduled ordinary consumption for days 1..10:
  each person = 1 water_unit/day + 0.5 grain_unit/day
Event: day 5 VALVE-FAIL-01 releases exactly 100 water_units into SOIL-01
Event: day 6 VALVE-REPAIR-01 by PERSON-03 consumes one work_shift,
       writes VALVE-01/r2 repaired, and creates one shared service debt from HOUSE-01..04 to PERSON-03
Ecology process: leaked water loses exactly 20 water_units by day 10 under CANON-NUM-v0.1;
                 remaining 80 is SOIL-01 moisture stock
No birth, death, travel, trade, weather, qi, or random event is applicable in this closed fixture.
```

**Runs**

- Control: remain S4 and execute the ordered semantic journal through day 10.
- Tier run: commit the day-0 snapshot, demote to S0, process through day 10, then promote exhaustively to S4.
- Permutation runs: change render LOD, processing chunks, worker count, save/reload at days 4/5/6, and promotion route; do not change canonical inputs.

**Expected ordered canonical events**

```text
daily consumption events in (day, PERSON-ID) order
VALVE-FAIL-01 at day 5 in its authored phase
VALVE-REPAIR-01 at day 6 in its authored phase
ECO-EVAP-01 threshold completion at day 10
```

**Exact day-10 protected result**

```text
PERSON-01..12 alive and embodied; household membership unchanged
WELL-01 water = 780 water_units
communal grain = 540 grain_units
SOIL-01 leaked-moisture stock = 80 water_units
VALVE-01/r2 repaired; provenance includes fail and repair events
PERSON-03 work history -= one available work_shift
four service-debt edges exist with the same terms, witnesses and reopening conditions
no additional person, item, stock, opportunity, warning, injury, claim or ecological fact
```

The oracle canonical-serializes the input manifest, ordered events, latent-detail manifest, and expected result, then requires identical SHA-256 normalized hashes for every run. Exhaustive promotion must materialize exactly PERSON-01..12 and HOUSE-01..04; a cohort distribution, different repairer, extra item, altered stock, erased debt, or newly invented microhistory fails even if aggregate totals appear plausible.
