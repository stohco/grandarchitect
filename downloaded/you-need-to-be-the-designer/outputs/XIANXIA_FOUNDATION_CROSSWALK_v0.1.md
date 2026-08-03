# Foundation Ontology–Graph–Contract–Gauntlet Crosswalk v0.1

**Status:** normative mapping for the v0.1 research package  
**Date:** 2026-08-02  
**Purpose:** prevent encyclopedia domains from becoming orphan prose

---

## 0. Mapping invariant

Every ontology domain has:

```text
stable OntologyDomainID
→ allowed Canon node/edge families
→ required semantic-contract family
→ Production consumers
→ TestObligation generator
→ mandatory impact-query neighborhood
```

An encyclopedia page fails validation when its domain lacks a mapping, when it uses a Canon type outside the domain’s allowed set without an explicit multi-domain declaration, or when its contract/gauntlet links are missing.

These are schemas, not claims that every optional metaphysical or cultural module exists in world truth.

---

## 1. Crosswalk

| OntologyDomainID | Primary Canon node/edge families | Required contract family | Minimum gauntlet generator |
|---|---|---|---|
| `ont:cosmology-topology` | CosmologyNode, WorldLayer, Boundary, ScaleFact; PART_OF, ADJACENT_TO, CONTAINS | Entity + Rule + Boundary | topology, anchor failure, scale continuity, travel, collapse |
| `ont:world-law` | Axiom, WorldLaw, CanonException, LawContext; GOVERNS, EXCEPTION_TO, INCOMPATIBLE_WITH | Rule + Law resolver | applicability, conflict, cycle, suppression, amendment, migration |
| `ont:matter-qi-phase` | Material, Resource, EnergyDefinition, PhaseRelation; CONSUMES, PRODUCES, TRANSFORMS | Entity + Process + source ledger | conservation, conversion, contamination, depletion, closed loop |
| `ont:time-space-continuity` | TimeModel, ClockDomain, SynchronizationAnchor, CausalOrder, Boundary | Rule + Process + temporal | dilation, cross-clock order, travel, paradox, time skip, replay |
| `ont:causal-interpretive-modules` | CausalityRule plus optional FatePressure, KarmicRelation, Mandate, LuckModel, Statute | Separate Rule contract per enabled module | false-equivalence, jurisdiction, discharge, counter, cultural interpretation |
| `ont:spirits-ancestors-offices` | optional Spirit, AncestorClaim, Office, Registry, Jurisdiction | Entity + Identity + Institution | origin diversity, office/power separation, competing claim, truth/belief |
| `ont:lived-religion` | Practice, RitualRole, Community, Belief, Specialist, Calendar | Process + Social + Ritual | no-effect meaning, labor, household/institution disagreement, change |
| `ont:funerary-remains` | DeathState, Remains, BurialSite, MourningPractice, AncestorClaim, Inheritance | Identity + Process + Social | custody, soul/body dispute, tomb loss, belief/world-truth separation |
| `ont:body-health-needs` | BodySystem, Injury, Disease, Need, Disability, Adaptation | Entity + Biological process | deprivation, injury specificity, disability, care, cultivation changes |
| `ont:soul-mind-memory-identity` | Continuant, Embodiment, SoulComponent, MemoryInstance, IdentityClaim, ContinuityJudgment | Identity + Spiritual + Informational | copy, possession, resurrection, oath/ownership continuity, death |
| `ont:species-life-cycle` | Species, Ecotype, Population, Lineage, LifeStage | Biological + Ecological | diet, reproduction/personhood, niche, migration, nonhuman cultivation |
| `ont:cultivation-path-realm` | ProgressionRule, RealmDefinition, RealmCapabilityEnvelope, Transformation, FailureMode | Process + Capability | verb proof, envelope, breakthrough/failure, NPC parity, old relevance |
| `ont:protagonist-advantage` | ProtagonistAdvantageProposal, AdvantageState, CapabilityBand, ContributionRule | Advantage + Capability | shared physics, Qi Condensation ceiling, exposure, transfer, plot armor |
| `ont:skill-technique` | Skill, Technique, ActionArchetype, Counter, DescriptionClaim | Semantic Action | target, phases, cost, scaling, counter, literal description, NPC parity |
| `ont:sense-knowledge-divination` | PerceptionMode, Sensor, Claim, Belief, DreamState, DivinationMethod | Perception + Informational | occlusion, false result, provenance, uncertainty, narrator permission |
| `ont:material-resource-depletion` | Material, Resource, Deposit, Right, Process | Entity + Material process | origin, rarity history, harvest, depletion, renewal, substitution |
| `ont:item-artifact` | Item, Artifact, EntityArchetype, Ownership, Memory | Entity + Semantic Action | provenance, condition, theft, copy, repair, owner death, persistence |
| `ont:alchemy-medicine-food` | Formula, IngredientFunction, Batch, Condition, Dose, FoodProcess | Craft + Biological process | substitution, batch variance, species/dose, safety, waste, scaling |
| `ont:craft-forging-repair` | Blueprint, Tool, Workspace, Process, Defect, Signature | Craft process | phase interruption, quality cause, repair limits, salvage, automation |
| `ont:formation` | Formation, Node, Field, Topology, Anchor | Spatial process + Rule | broken node, redundancy, terrain, fuel, inversion, persistence |
| `ont:talisman` | Talisman, Inscription, Trigger, Reservoir, Authority | Item + Semantic Action | activation, counterfeit, depletion, wet/damage, description fidelity |
| `ont:ritual` | Ritual, Role, Site, Calendar, Offering, Jurisdiction | Social + Ritual process | consent/role, wrong time/site, interruption, witness, competing authority |
| `ont:seal-authority` | Seal, Credential, Register, Delegation, Office, Decision | Authority + Institution process | forgery, revocation, issuer loss, custody, appeal, metaphysical/legal split |
| `ont:ecology-agriculture` | Ecology, Biome, Species, Habitat, Crop, Succession | Ecological process | food web, harvest, migration, extinction, restoration, cultivation pollution |
| `ont:weather-climate-astronomy` | WeatherSystem, Climate, Season, CelestialCycle, Disaster | Field + Environmental process | cause, forecast, propagation, shelter, economy/ecology, recovery |
| `ont:geography-map-travel` | Location, Landform, Route, Map, Portal, Anchor | Spatial + Information process | distance, stale map, path loss, portal decay, cargo/logistics, law crossing |
| `ont:settlement-infrastructure` | Settlement, Structure, Service, District, Infrastructure | Entity + Institution + Flow | food/water/waste, growth, siege/disaster, repair, schedule, architecture cause |
| `ont:institution-governance` | Institution, Faction, Office, Law, Charter, Archive | Institution + Social process | succession, founder/resource loss, schism, enforcement, reform, legitimacy |
| `ont:culture-language-custom` | Culture, Language, Dialect, Practice, Calendar, Art, Education | Social + Informational | internal variation, migration, borrowing, mixed household, language change |
| `ont:economy-labor-property` | Economy, Occupation, Right, Currency, Contract, Market, SupplyChain | Exchange + Labor + Institution | production/consumption, shock, storage/teleport exploit, ownership, automation |
| `ont:character-agency` | Character, Belief, Goal, Plan, Commitment, Attention, Learning | Decision + Social + Entity | observation-to-action, bounded rationality, absence, interruption, learning |
| `ont:relationship-kinship` | Relationship, Kinship, Consent, Oath, TeachingLineage, Inheritance | Social + Identity process | asymmetry, consent/coercion, memory difference, death, public/private status |
| `ont:memory-reputation-rumor` | MemoryInstance, ReputationView, Testimony, Record, Rumor, Audience | Information + Social process | witness chain, no-global-score, mutation, forgery, audience-specific consequence |
| `ont:history-mystery-opportunity` | HistoryEvent, Pressure, Plan, Evidence, Opportunity, Deadline | Event + Quest-opportunity | ignore/refuse, giver death, early solution, counterfactual, consequence radius |
| `ont:combat-injury-death` | Action, Injury, Disease, DeathState, Remains, Morale, Objective | Semantic Action + Biological + Identity | readable counterplay, collateral, surrender/escape, injury layers, death exploit |
| `ont:law-authorship-world-creation` | LawOverlay, Domain, CreationBudget, PersonhoodObligation, ExportRule | Rule + Creation + Transaction | conflict algebra, century propagation, recursion, arbitrage, inhabitants, rollback |
| `ont:presentation-information` | InformationSurface, RenderRule, DescriptionClaim, ObserverView | Presentation + Perception | truth/belief/inference, false affordance, accessibility, round-trip description |
| `ont:simulation-persistence` | FidelityPolicy, ProtectedInvariant, Snapshot, Event, Migration | Persistence + Transaction | F0–F4 refinement, save/crash, version migration, deterministic replay |
| `ont:player-identity-start` | PlayerCharacter, MortalOrigin, Household, FailureContinuity, AdvantageBearer | Identity + Entity | playable start, noncombat life, lawful recovery, protagonist exception |
| `ont:difficulty-accessibility` | Production Constraint, ControlProfile, Assist, ContentSetting | Production mapping only | canonical-physics invariance, information access, input parity, content safety |
| `ont:domestic-care-leisure` | Household, CareRelation, Routine, Education, Festival, Grief | Social + Care + Labor | full mortal year, dependents, seclusion, aging, disability, domestic memory |
| `ont:terminology-naming` | ApprovedTerm, TermRevision, LexicalPredicate, NamingRule, TerminologyRetentionDecision | Description + Lexical | standard loanword, niche translation, morphology, endonym/exonym, pseudo-name |
| `ont:source-canon-governance` | Evidence/Canon/Production review and decision nodes | Governance | provenance separation, rights, cultural review, originality, stale dependency |

---

## 2. Required Production consumers

Every domain maps, as applicable, to:

- generator or authored-anchor specification;
- persistence/fidelity policy;
- player/NPC verb mapping;
- information and accessibility surface;
- performance/complexity budget;
- risk and impact report;
- `GauntletFamily` and stable `TestObligation` nodes;
- research-bible/PRD requirements; and
- migration policy.

`ont:difficulty-accessibility` is intentionally Production-only: it may change input, assistance, content, and presentation but cannot become character history or world ontology accidentally.

---

## 3. Mandatory impact neighborhoods

Changes traverse at least these paths:

- **Law:** bodies, qi, materials, ecology, skills, items, institutions, world history, presentation, saves.
- **Realm envelope:** all actions, AI planning, combat, travel, social recognition, crafting, threats, descriptions.
- **Protagonist advantage:** progression, death/identity, economy, institutions, secrecy, adversaries, saves, endgame authority.
- **Identity:** ownership, oaths, inheritance, relationships, reputation, death, reincarnation, office.
- **Resource:** ecology, craft, economy, institutions, settlement, conflict, quest pressures.
- **Technique/item:** source ledger, capability envelope, counters, terrain/ecology, witnesses, ownership, persistence, description.
- **Institution/culture:** people, offices, law, architecture, labor, education, records, and language; religious organizations also require explicit lived-religion links.
- **Player-authored law/world:** every domain inside jurisdiction plus boundary/export and recursive-creation effects.
- **Term revision:** descriptions, UI, subtitles, encyclopedia, naming grammars, semantic predicates, localization, tests.
- **Generator/fidelity migration:** base hashes, deltas, positions, identities, resources, routes, artifacts, history, golden saves.

---

## 4. Validation

The crosswalk fails when:

- an OntologyDomainID has no allowed Canon/Production mapping;
- an encyclopedia page has no contract or gauntlet generator;
- a semantic contract has no ontology owner;
- a test has no Production `TestObligation` identity;
- an optional cultural/metaphysical module is treated as universal truth without ratification;
- a Production-only setting leaks into canon;
- in-world provenance and research provenance share a field; or
- a cross-domain page hides atomic systems whose invariants differ.

The next version should split any bundled domain whose state machines, authority, identity, persistence, or gauntlet obligations diverge materially. This table is a closure test, not a claim that the taxonomy can never grow.
