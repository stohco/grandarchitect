# Grand Architect Foundation Package Index v0.1

**Date:** 2026-08-02  
**Status:** foundation baseline complete; three independent blocker re-audits passed; no production code authorized

---

## 1. Locked project direction

1. Clean-slate, original-IP, single-player xianxia action sandbox.
2. The player begins genuinely mortal and is the true protagonist.
3. The protagonist may have one or more unique lawful asymmetries, but never hidden player-only physics, automatic victory, guaranteed survival, or unlimited output.
4. Qi Condensation is the established player-facing term. A Qi Condensation cultivator cannot personally split a huge mountain.
5. Familiar English-language xianxia vocabulary stays familiar: qi, Qi Condensation, Dao, yin–yang, spiritual roots, meridians, cultivation, and tribulation.
6. Niche or opaque Chinese romanizations that a seasoned English-speaking xianxia reader would not know are translated into appropriate English. Research retains Hanzi, tonal pinyin, context, alternatives, and reviewer rationale.
7. The governing genre spine is xianxia, not unconstrained xuanhuan: cultivation, immortality, qi, body/spirit transformation, Dao comprehension, lineage, sects, alchemical/cosmological practice, tribulations, and self–world correspondence are structural.
8. Every active description is a semantic contract. If prose says an item summons an upside-down mountain of qi, the canonical systems must instantiate the promised behavior and consequences or narrow the description.
9. Procedural scale comes from lawful histories, dependencies, and transformations—not generated prose or random motif combination.
10. No game code, app scaffold, engine dependency, or implementation begins until the research/PRD gates pass and the user explicitly authorizes it.

---

## 2. Documents and authority

| Document | Job | Authority |
|---|---|---|
| `XIANXIA_GRAND_ARCHITECT_CHARTER_v0.1.md` | North star, locks, research epochs, technical thesis. | Founding project charter |
| `XIANXIA_SOURCE_ATLAS_v0.1.md` | Comparative corpus, lawful access, scoring, gaps, originality boundaries. | Research routing; not canon |
| `XIANXIA_RESEARCH_GRAPH_SCHEMA_v0.1.md` | Evidence/Canon/Production governance, provenance, revisions, gates, roles. | Normative research governance |
| `XIANXIA_UNIVERSE_ENCYCLOPEDIA_ONTOLOGY_v0.1.md` | All domain families the eventual bible must specify. | Pre-canon semantic taxonomy |
| `XIANXIA_FOUNDATION_CROSSWALK_v0.1.md` | Maps every OntologyDomainID to graph, contracts, Production, and tests. | Normative v0.1 mapping |
| `XIANXIA_SEMANTIC_ACTION_CONTRACTS_v0.1.md` | Makes lore executable and descriptions provable. | Pre-canon behavior architecture |
| `XIANXIA_LAWFUL_PROTAGONIST_EXCEPTION_v0.1.md` | Realm envelopes, protagonist asymmetry, honest attribution, exploit tests. | Locked constraints; exact advantage unratified |
| `XIANXIA_FOUNDING_CONTRADICTION_REGISTER_v0.1.md` | Foundational decisions and cultural/originality red-team. | Persistent pre-canon questions |
| `XIANXIA_OPEN_ENDED_UNIVERSE_GAUNTLET_v0.1.md` | Graph-generated tests across the entire encyclopedia. | Validation architecture |

Canon remains empty except for explicit user/project constraints. Working cosmology, realm concepts, named techniques, items, and protagonist-advantage candidates remain proposals until a signed decision admits immutable revisions to a Canon Release.

---

## 3. Agentic graph architecture

```text
Evidence Graph
    ↓ reviewed abstraction or contextual support
Canon proposal branch
    ↓ independent design need + review + user decision
Immutable Canon Release
    ↓ exact revision consumption
Production requirements and TestObligations
    ↓ experiments and results
new first-party Evidence records
```

The Test Graph is a read-only view over governed Production `TestObligation`, acceptance, experiment, risk, waiver, and result records. It does not become a fourth competing truth graph.

Two proposal routes are valid:

- research-informed pattern + independent design need;
- original design rationale + registered project pressure.

Neither allows one external source to supply proprietary canon.

---

## 4. Review dispositions already incorporated

### Technical foundation blockers

| Finding | Disposition |
|---|---|
| Player-authored laws had no deterministic conflict resolver. | Added pinned law context, authority partial order, cycle rejection, explicit equal-authority outcomes, phase binding, resolution proof, atomic staged enactment. |
| Simultaneous actions had no transaction/isolation model. | Added read/write sets, reservations, deterministic commit, commutative reducers, atomic journal, prepare/commit, exactly-once mutation, recovery reconciliation. |
| Simulation-tier equivalence was impossible to define. | Unified F0 Dormant through F4 Detailed with protected invariants, supported queries, unresolved detail, error envelopes, and refinement commitments; resolution layers are orthogonal. |
| Literal description truth was only natural-language advice. | Added versioned `DescriptionClaim` predicates, quantifier/jurisdiction/clock/threshold/modality, lexical term revision, contract paths, and finite eligibility certificates for “every.” |
| Generator updates could rewrite worlds beneath deltas. | Added per-address generator/schema/law/numeric version and base hashes, legacy resolver/materialized base, dry-run migration, delta rebase, rollback, and golden saves. |
| Determinism ignored numeric/runtime differences. | Added release-pinned units, precision, quantization, rounding, step, approximation envelopes, nondeterminism exclusions, and cross-runtime differential replay. |
| Test Graph identity conflicted with three-graph governance. | Added governed Production `TestObligation`; Test Graph remains derived. |
| Incomparable or noncommutative laws could leave an undefined outcome. | Added pairwise composition proofs/outcomes, explicit composition order, deterministic total extension for proven-safe transforms, and an aborting invalid-context fallback that cannot pass canon admission. |
| Simultaneous actions could suffer write skew or target/law phantoms. | Added serializable validation for point, range, and predicate reads, including target eligibility and law applicability; deterministic retries preserve random variates and exactly-once costs. |
| Exact and approximate state shared underspecified numeric hashes. | Added canonical serialization, reduction order, exceptional-number policy, exact/analytic field partitions, exact hashes, and separate analytic-envelope digests. |
| Cross-tier actions lacked a normative decision protocol. | Added transactional `TierResolutionPlan`: prove current-tier support, minimally promote, use approved analytic resolution, lawfully defer/stage, or abort. |
| Test, description-proof, and generator-migration records were underspecified. | Added stable logical obligation keys and immutable revisions, governed entailment results, generator/base/migration/remap/tombstone/rebase/conflict/golden-save records. |
| Player/NPC parity incorrectly demanded identical full hashes despite distinct identities. | Replaced it with an identity-renamed behavioral projection plus controlled seed-equivalence manifest while retaining distinct full canonical hashes. |

### Cultural, ontology, and terminology blockers

| Finding | Disposition |
|---|---|
| English-first policy overtranslated standard terms. | Corrected to seasoned-reader xianxia lexicon; Qi Condensation, qi, Dao, and other established terms remain. Only niche romanization is translated by default. |
| Fate, karma, mandate, luck, and causality risked collapsing into one destiny meter. | Made them separate optional ontology modules with separate jurisdictions, evidence, rules, discharge, and interpretations. Removed umbrella `destiny_state`. |
| Celestial bureaucracy/spirit origin risked becoming universal. | Made spirit, office, ancestor, and nether models optional; expanded origin models and truth/belief separation. |
| Lived religion, funerary practice, and seals were under-modeled. | Added distinct ontology domains and gauntlet obligations. |
| Human meridians risked becoming universal nonhuman anatomy. | Changed to species/path-specific bodies and conduit topologies; meridians only where applicable. |
| Project-native terms were forced to pretend Chinese provenance. | Added project-native English and invented-language categories; Hanzi/pinyin are conditional on real provenance. |
| Encyclopedia domains could become orphan prose. | Added stable OntologyDomainIDs and the Foundation Crosswalk. |

### Adversarial design blockers

| Finding | Disposition |
|---|---|
| Realm envelopes were asserted but could be bypassed by stacking. | Added multidimensional units, personal hard ceilings, four bands, composition rules, contribution certificate, and split-action/stack exploit tests. |
| Protagonist advantage lacked a full adversarial system. | Added a first-class Advantage Contract and permanent plot-armor, mentor, comprehension, devouring, resource, tribulation, transfer, death, and save gauntlet. |
| False-affordance rules could excuse a noninteractive world. | Added salience-weighted precision/recall, scene-specific interactive density, critical affordance classes, exception budgets, and blinded first-attempt tests. |
| Procedural “three whys” could still produce coherent filler. | Added graph-nearest-neighbor, motif collision, regional interchangeability, delayed recall, repetition, and gratuitous-causality tests. |
| Social state could be mutated as invisible meters. | Added communication, consent, teaching, care, exchange, ritual, allegation, evidence, adjudication, audience, and bounded NPC decision contracts. |
| World creation could recursively erase scarcity. | Added creation/personhood/simulation budgets, export/compatibility rules, recursive-authority ceilings, and arbitrage constraints. |

---

## 5. What remains deliberately unresolved

- The actual cosmology and whether optional modules such as karma, celestial offices, nether courts, or fate pressure exist as world truth.
- The cultivation realm ladder and quantitative/qualitative Qi Condensation envelope.
- The protagonist’s actual advantage. Artifact, constitution, mentor, memory, system/interface, destiny, devouring, and combinations are only risk categories.
- The ontology of souls, reincarnation, duplication, personhood, and final death.
- Exact mortal region, cultures, languages, history, species, sects, techniques, items, and world map.
- Minimum/recommended/hero hardware profiles and measured visual/performance budgets.
- Complete lawful SourceVersion cards and scoped close readings for the comparative corpus.
- Production implementations of the semantic vocabulary, generators, renderer, persistence, combat, and AI.

This unresolved state is intentional. Choosing lore before the evidence, ontology, and contradiction work would turn attractive ideas into expensive constraints.

### Final blocker-audit result

- Xianxia/cultural/terminology re-audit: **PASS** after five reported S0/S1 defects were corrected.
- Gameplay/gauntlet re-audit: **PASS** after three reported S1 defects were corrected.
- Technical continuity/determinism re-audit: **PASS** after two reported S0 and six reported S1 defects were corrected.

This pass means the v0.1 foundation is coherent enough to govern the next research release. It does not mean the universe bible, PRD, technical feasibility, or game is complete.

---

## 6. Next research gate

The next major package should be **Cultivation Foundations & Mortal Reality v0.1**, with parallel sub-releases:

1. **Terminology Register v0.1:** qi, Dao, meridians, spiritual roots, cultivation, tribulation, soul, spirit, immortality, karma, fate, mandate, and related terms—with established-reader disposition and niche translation decisions.
2. **Mortal Year Atlas v0.1:** household, food, labor, water, health, disability, education, law, trade, ritual, funerals, seasons, danger, leisure, and multiple possible noncombat lives.
3. **Cultivation Ontology v0.1:** body, qi, spirit/mind, Dao comprehension, paths, practices, teachers, breakthroughs, deviations, failure, lifespan, and environmental relation.
4. **Qi Condensation Envelope v0.1:** explicit body/qi/perception/control/action limits, normal and exceptional bands, combat grammar, resource requirements, injury, social meaning, and mountain-proof oracle.
5. **Protagonist Candidate Dossier v0.1:** two or three fully original advantage candidates derived only after the above pressures are known, with user decision reserved.
6. **Identity & Death Models v0.1:** several executable alternatives for soul, memory, body, name, inheritance, reincarnation, and resurrection.
7. **Mortal-to-Cultivator Golden Scenarios:** paper designs for one year as a mortal, first teacher choices, a fraudulent manual, first qi perception, first conflict, first failed breakthrough, and first genuine success.

No realm ladder should become canon until the Qi Condensation envelope and mortal year both pass their gauntlets. No protagonist advantage should become canon until it proves that it enriches those experiences rather than skipping them.

---

## 7. Operating reminder

The project’s scope remains enormous. Staged proof does not shrink it. Each successful foundation becomes a reusable law and test generator for the multiverse; each failed foundation is corrected before it multiplies into millions of generated inconsistencies.
