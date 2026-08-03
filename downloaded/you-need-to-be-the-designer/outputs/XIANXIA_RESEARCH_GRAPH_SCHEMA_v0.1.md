# Xianxia Research Graph Schema v0.1

**Project:** Grand Architect Xianxia Sandbox  
**Status:** reviewed governance architecture; implementation-neutral; not game canon  
**Date:** 2026-08-02  
**Locked scope:** original IP, research-first, single-player, mortal-to-world-law progression

---

## 0. Executive decision

Use agentic graph engineering, but use it as a governed research and design system—not as an autonomous lore generator.

The architecture has three logically separate graphs:

```text
Evidence Graph → Canon Graph → Production Graph
      ↑                              │
      └────── experiment evidence ───┘
```

- **Evidence** records what a located source supports, what a researcher inferred, what conflicts, and how confident we are.
- **Canon** records deliberate decisions about the original universe, including their scope, dependencies, history, exceptions, and approval.
- **Production** records player promises, system requirements, PRD claims, risks, experiments, acceptance tests, and deliverables.

They may share one database, but never one truth status. A beautiful synthesis is not evidence. A well-cited pattern is not canon. A canon statement is not an implemented or validated system.

### Non-negotiable bridge rule

There is no direct import from a source into canon. Two valid entry routes exist:

```text
Research-informed route:
SourceVersion
→ EvidenceUnit
→ Claim
→ Cross-source pattern
→ Independent gameplay need
→ CanonProposal

Original-design route:
OriginalDesignRationale
→ Independent gameplay need or registered contradiction
→ Originality review
→ CanonProposal

Both routes:
CanonProposal
→ Red-team, cultural/rights review, and impact report
→ Explicit decision
→ immutable CanonRevision
→ CanonRelease
→ Production requirement
→ Acceptance test
```

Ordinary agents can propose. They cannot silently ratify.

---

## 1. Common graph envelope

Every node requires:

| Property | Meaning |
|---|---|
| `id` | Stable namespaced identity; never reused. |
| `graph` | `evidence`, `canon`, or `production`. |
| `type` | Controlled node type. |
| `label` | Short human-readable name. |
| `description` | Plain-language purpose or statement. |
| `schema_version` | Schema version used to validate the node. |
| `status` | Graph-specific lifecycle state. |
| `revision` | Immutable revision number. |
| `recorded_at` | Transaction time when this revision entered the graph. |
| `recorded_by` | Human, agent, or service identity. |
| `generated_by_activity` | Workflow/provenance activity. |
| `valid_from`, `valid_to` | Real-world validity interval, where applicable. |
| `supersedes_revision` | Prior immutable revision, if any. |
| `branch` | Proposal, experiment, continuity, or mainline branch. |
| `change_set` | Proposal/merge batch that introduced it. |
| `tags` | Controlled vocabulary terms. |
| `access_class` | Visibility and access status. |
| `semantic_hash` | Digest of meaning-bearing normalized content. |

Every edge is a first-class assertion with:

- stable edge ID;
- source and target IDs;
- controlled predicate;
- status, scope, and optional confidence;
- recording agent and activity;
- evidence or decision support;
- transaction, valid, and world-time intervals where relevant;
- revision and supersession metadata; and
- a semantic hash.

This adopts the useful W3C PROV distinction among entities, activities, and responsible agents ([PROV-O](https://www.w3.org/TR/prov-o/)). RDF-style assertions make relationships inspectable rather than hiding them in prose ([RDF 1.2 Concepts](https://www.w3.org/TR/rdf12-concepts/)); SHACL-like constraints provide a model for graph validation ([SHACL 1.2 Core](https://www.w3.org/TR/shacl12-core/)). The project need not adopt any one database or serialization to use these principles.

### Identity conventions

```text
evi:src:<slug>                    logical source/work
evi:sv:<source-slug>:<hash>       immutable accessed version
evi:unit:<hash>                   exact locatable evidence unit
evi:claim:<ulid>                  atomic claim
evi:pattern:<stable-slug>         cross-source abstraction

can:<type>:<stable-slug>          stable canon identity
canrev:<canon-id>:<revision>      immutable canon revision

prod:<type>:<stable-slug>         stable production identity
prodrev:<production-id>:<rev>     immutable production revision

flow:<type>:<ulid>                workflow/provenance record
```

Labels may change without changing identity. A semantic change creates a new revision; it never overwrites history.

Truth-bearing dependencies always target immutable revision IDs. Stable identities are lookup aliases for humans and discovery queries; they never mean “whatever revision is newest.” Release membership pins exact revisions, and `current_revision` is a derived view rather than stored dependency semantics.

---

## 2. Evidence Graph

### Node types

| Type | Purpose | Additional required fields |
|---|---|---|
| `ResearchQuestion` | One bounded question to investigate. | `question`, `scope`, `priority`, `requested_by` |
| `Source` | Logical work, paper, game, documentation set, interview, edition family, or archive. | `title`, `creators`, `publisher`, `publication_date`, `medium`, `source_class`, `canonical_locator` |
| `SourceVersion` | Exact version accessed. | `source_id`, `retrieved_at`, `version_label`, `content_hash`, `snapshot_scope`, `access_class`, `copyright_status`, `license_id`, `permission_basis`, `allowed_operations` |
| `EvidenceUnit` | Precisely locatable portion of a source. | `source_version_id`, `location`, `faithful_paraphrase`, optional permitted excerpt, `extraction_method`, `fidelity_status` |
| `Claim` | One atomic proposition. | `proposition`, `claim_kind`, `scope`, `confidence`, `independence_group`, `review_status` |
| `Inference` | Reasoning beyond literal source support. | `conclusion`, `reasoning_summary`, `confidence`, `limitations` |
| `TermMention` | Source-specific occurrence or translation. | `surface_form`, `normalized_candidate`, `language`, `location` |
| `HistoricalConcept` | Historically situated concept, never presumed timeless. | `period`, `tradition_scope`, `translation_notes`, `contested_meanings` |
| `GenreConvention` | Pattern supported across a defined fiction corpus. | `corpus_scope`, `counterexamples`, `generality` |
| `SourceSpecificExpression` | Distinctive protected or work-specific expression that must not enter canon. | `source_ref`, `risk`, `must_not_copy` |
| `CrossSourcePattern` | Reviewable abstraction across independent evidence. | `supporting_claims`, `dissenting_claims`, `abstraction_method`, `limitations` |
| `ConflictSet` | Claims that contradict or materially qualify one another. | `question`, `severity`, `resolution_status` |
| `ResearchSynthesis` | Reviewable summary of multiple claims. | `scope`, `method`, `included_claims`, `known_omissions` |

`Claim.claim_kind` is one of:

- `direct_statement`;
- `measurement`;
- `documented_behavior`;
- `author_opinion`;
- `community_report`;
- `interpretation`;
- `negative_evidence`; or
- `unknown`.

Source classes include `official_primary`, `research_primary`, `original_fiction`, `first_party_game_material`, `secondary_scholarship`, `historical_or_traditional`, `community`, and `agent_synthesis`.

“Primary” is always scoped. A novel is primary evidence for its own fictional system, not proof of a universal xianxia convention.

### Evidence edges

| Predicate | Valid relation |
|---|---|
| `VERSION_OF` | `SourceVersion → Source` |
| `EXTRACTED_FROM` | `EvidenceUnit → SourceVersion` |
| `ANSWERS` | `Claim → ResearchQuestion` |
| `GROUNDED_IN` | `Claim → EvidenceUnit` |
| `DERIVED_FROM` | `Inference → Claim or EvidenceUnit` |
| `MENTIONS` | `EvidenceUnit → TermMention` |
| `TRANSLATED_AS` | `TermMention → TermMention or HistoricalConcept` |
| `DEVELOPS_LATER_THAN` | `HistoricalConcept → HistoricalConcept` |
| `GENRE_VARIANT_OF` | `GenreConvention → HistoricalConcept or GenreConvention` |
| `ABSTRACTED_INTO` | claims/conventions → `CrossSourcePattern` |
| `SUPPORTS`, `QUALIFIES`, `CONTRADICTS`, `CORROBORATES` | evidence assertion → evidence assertion |
| `MEMBER_OF_CONFLICT` | claim → `ConflictSet` |
| `SYNTHESIZES` | `ResearchSynthesis → Claim` |
| `CORRECTS`, `RETRACTS`, `DUPLICATES` | newer evidence assertion → earlier assertion |
| `EXCLUDES_FROM_CANON` | `SourceSpecificExpression → CanonProposal` |

Duplicate citations from one upstream origin share an `independence_group`; repetition does not manufacture corroboration.

### Dimensional confidence

Do not compress truth into one magical score:

```text
source_authority       0–1
extraction_fidelity    0–1
independent_support    0–1
scope_applicability    0–1
review_confidence      0–1
overall_label          low | moderate | high
```

A high-confidence statement about one novel may have low applicability to the project’s original canon.

Each numeric dimension uses a published rubric and records the reviewer, date, evidence, and calibration set. `unknown` is valid and must not be coerced to zero or a midpoint. Dimensions are never automatically averaged. The qualitative label is an independent reviewer judgment with rationale; numeric values are decision aids, not probability claims.

Evidence statuses are `candidate`, `extracted`, `verified`, `disputed`, `corrected`, `retracted`, and `archived`. Machine-extracted claims always begin as candidates.

---

## 3. Rights, access, translation, and expression

Access and rights are separate axes.

`access_class`:

- `open_public`;
- `public_web`;
- `paywalled_or_licensed`;
- `user_provided_private`;
- `project_confidential`;
- `metadata_only`;
- `inaccessible`.

Rights are not compressed into one enum. Each source version records `copyright_status`, `license_id`, `license_terms`, `permission_basis`, `territory`, `expiry`, and independently reviewed `allowed_operations` such as `link_metadata`, `short_excerpt`, `internal_paraphrase`, `internal_indexing`, `embedding`, `redistribution`, and `derivative_asset_creation`.

Unknown or unresolved rights block the uncertain operation. They do not automatically permit paraphrase, indexing, embedding, or redistribution. Restricted fiction normally stores only reviewed bibliographic metadata, exact location, fingerprint, and an original note within permitted use—not full chapters. Every relevant evidence unit adds:

- `language`;
- `translator` and edition;
- `translation_status`;
- `distinctive_expression_risk`;
- `genre_generality`: `work_specific`, `recurring_motif`, or `broad_convention`;
- `must_not_copy`; and
- `rights_review_id`.

Canon language must be newly authored. Runtime generation must never retrieve protected passages, distinctive terminology, or an author’s voice as content material.

### Established xianxia terminology and translation hygiene

Evidence records preserve `original_hanzi`, `pinyin_with_tones`, `literal_gloss`, `context_meanings`, `historical_scope`, `genre_usage`, `translation_alternatives`, and reviewer notes. Canon concepts additionally require `chosen_player_term`, `term_category`, `project_definition`, `rejected_translations`, and `distinction_risks`.

Player-facing canon, UI, subtitles, encyclopedia text, item/skill descriptions, and generated prose use an approved seasoned-reader lexicon. Canon adds versioned `ApprovedTerm`, `TermRevision`, `LexicalPredicate`, and `TerminologyRetentionDecision` records. A term revision stores chosen form, part of speech, inflections, pronunciation where useful, linked semantic predicates, prohibited/confusing synonyms, scope, release membership, and reviewer decision. `term_category` distinguishes `established_xianxia_loanword`, `project_native_english`, `translated_technical_term`, `chinese_proper_name`, `invented_language_name`, and `context_retained_romanization`. Hanzi/pinyin fields are conditional on documented Chinese-language provenance; project-native or invented-language names may not fabricate it. Familiar terms such as qi, Qi Condensation, Dao, yin–yang, spiritual roots, meridians, cultivation, and tribulation do not require exceptions. Niche romanizations are translated; retaining one requires a decision explaining context, semantic loss, scope, expiry/review trigger, and approval. Action and description definitions pin exact term revisions.

---

## 4. Canon Graph

### Node families

| Family | Representative node types |
|---|---|
| Foundation | `CanonProposal`, `OriginalDesignRationale`, `IndependentGameplayNeed`, `Axiom`, `WorldLaw`, `Concept`, `OpenQuestion`, `CanonException`, `CanonDecision`, `CanonRelease`, `ContradictionCase` |
| Cosmology | `CosmologyNode`, `RealmDefinition`, `WorldLayer`, `Boundary`, `ScaleFact`, `TimeModel`, `ClockDomain`, `SynchronizationAnchor`, `CausalOrder`, `ParadoxState`, `CausalityRule`, `DeathState` |
| Cultivation | `BodySystem`, `SoulModel`, `ProgressionRule`, `Transformation`, `Technique`, `Skill`, `FailureMode`, `Tribulation`, `PerceptionMode`, `RealmCapabilityEnvelope`, `CapabilityDimension`, `CapabilityBand`, `ProtagonistAdvantageProposal`, `AdvantageState`, `ContributionRule`, `ExternalAuthoritySource`, `RealmTransitionRule`, `SemanticPrimitiveDefinition`, `UnitDefinition`, `RelationSchema` |
| Material | `Material`, `Resource`, `Item`, `Artifact`, `Recipe`, `Process`, `AlchemyRule`, `Formation`, `Talisman`, `Craft` |
| Living world | `Species`, `Ecology`, `Biome`, `WeatherSystem`, `Location`, `Settlement`, `Culture`, `Faction`, `Institution`, `Economy`, `Occupation` |
| History and people | `HistoryEvent`, `NamedEntity`, `Character`, `Continuant`, `Embodiment`, `SoulComponent`, `MemoryInstance`, `LegalIdentity`, `NameBearer`, `CopyLineage`, `IdentityClaim`, `ContinuityJudgment`, `Relationship`, `Reputation`, `Lineage`, `Doctrine` |
| Play and presentation | `PlayerVerb`, `Affordance`, `Counter`, `InformationSurface`, `StyleConstraint`, `RenderRule`, `NamingRule`, `DescriptionClaim`, `ApprovedTerm`, `TermRevision`, `LexicalPredicate`, `TerminologyRetentionDecision` |

This list is extensible. The Universe Encyclopedia Ontology owns the human-facing taxonomy, and `XIANXIA_FOUNDATION_CROSSWALK_v0.1.md` maps every current OntologyDomainID to graph, contract, Production, and gauntlet families. Validation fails when a domain lacks a mapping. The graph owns identity, relationships, validity, and approval.

All substantive canon nodes require:

```text
statement
scope
support_mode
branch
canon_status
design_rationale
world_time
evidence_refs
decision_refs
conflict_refs
authorship_kind
semantic_hash
downstream_systems
player_affordances
validation_refs
```

`support_mode` is one of `original_design`, `research_inspired`, `project_constraint_supported`, `mixed`, or `deliberate_departure`. `project_constraint_supported` is limited to explicit user/project constraints, never an external work's fictional answer. A research-informed fictional proposal must reference both a reviewed cross-source abstraction and an independent design need; direct evidence may supply historical context but cannot bypass that bridge.

Controlled node and predicate identifiers are exact. Schema validation fails on undeclared aliases, including deprecated protagonist or terminology type names.

### Canon edges

Core predicates include:

```text
IS_A                 PART_OF              INSTANCE_OF
DEPENDS_ON           CONSTRAINS           ENABLES
CAUSES               COUNTERS             TRANSFORMS_INTO
PRECEDES             LOCATED_IN           GOVERNS
CONSUMES             PRODUCES             SUSTAINS
PERCEIVES            INTERPRETS           REMEMBERS
OWES                  BELONGS_TO           CONTESTS
VARIANT_OF            EXCEPTION_TO         INCOMPATIBLE_WITH
JUSTIFIED_BY          DECIDED_BY           TESTED_BY
CONTEXTUALIZED_BY     ANSWERS_NEED         DERIVED_FROM_RATIONALE
SUPERSEDES            SPLITS_INTO          MERGED_FROM
MEMBER_OF_RELEASE     RAISES_CONTRADICTION
```

Edges that claim causality, ability, counterplay, ownership, perception, transformation, or support must themselves be testable assertions, not decorative metadata.

### Canon lifecycle

`draft → proposed → in_review → provisional → ratified`

Terminal or historical statuses: `disputed`, `deprecated`, `superseded`, `rejected`, and `withdrawn`.

Only explicit decisions can move a revision to `provisional` or `ratified`. “Provisional” means authorized for use under a recorded unresolved condition; it is not an agent shortcut.

---

## 5. Branching, releases, and temporal truth

- `canon/main` is append-only and release-based.
- Agents work in `proposal/<topic>/<change-set>`.
- Mechanical alternatives live in `experiment/<topic>`.
- True alternate continuities live in `continuity/<name>` and never silently merge into main.
- Merge is an approved change set, never last-write-wins.
- Textual merging cannot resolve semantic conflict; a `CanonDecision` must.
- `SUPERSEDES` is acyclic.
- One stable identity has only one active mainline revision for an overlapping release and world-time interval.
- One-to-many replacement uses `SPLITS_INTO`; many-to-one uses `MERGED_FROM`.
- Rejected and superseded records remain queryable.

Releases use semantic impact:

- **Major:** foundational axiom, ontology, cosmology, identity, persistence, or progression compatibility break.
- **Minor:** compatible systems, places, realms, beings, histories, or mechanics.
- **Patch:** clarification or metadata correction without semantic effect.

### Three kinds of time

1. **Transaction time:** when the project recorded or revised an assertion.
2. **Valid time:** when a real-world research or production statement applied.
3. **World time:** when a canonical fact is true inside the fictional universe.

Canon may add `world_calendar`, `world_valid_from`, `world_valid_to`, `world_time_precision`, and `knowledge_available_from`. Retrieval must pin both `canon_release` and `world_time`, or it may mix eras and reveal knowledge too early.

Multi-world events also carry a canonical causal partial order, clock-domain transforms, uncertainty intervals, and synchronization anchors. Cross-domain scheduling records send/receive events separately. Dilation, stopped clocks, uncertain dates, and any backward travel produce explicit synchronization or paradox states; the graph may not infer order from display calendars alone.

---

## 6. Production Graph

The Production Graph converts approved intent and canon into a research program, PRD, experiments, systems, content requirements, and acceptance tests.

### Node types

| Type | Purpose |
|---|---|
| `Vision` | Desired project-scale experience. |
| `PlayerPromise` | Concrete experience promised to the player. |
| `Constraint` | Locked product, legal, cultural, or technical boundary. |
| `Requirement` | Testable product need. |
| `DesignSpec` | Mechanical or content design. |
| `SystemSpec` | System boundaries, inputs, outputs, invariants, and interactions. |
| `ContentSpec` | Required content family and variation grammar. |
| `ArchitectureDecision` | Chosen option, evidence, and rejected alternatives. |
| `ResearchDeliverable` | Bible, atlas, ontology, study, PRD section, or register. |
| `Experiment` | Proof or falsification study. |
| `ExperimentResult` | Immutable measured production result; may generate a separate first-party Evidence source through a provenance activity. |
| `AcceptanceTest` | Pass/fail statement. |
| `GauntletFamily` | Generator for many tests over a graph domain. |
| `TestObligation` | Stable governed obligation deterministically generated from a pinned node, edge, path, or motif revision. |
| `TestObligationRevision` | Immutable state of one logical obligation, pinned to exact sources, generator, thresholds, fixtures, and lifecycle evidence. |
| `TestGenerationManifest` | Generator family/version, input release/revisions, parameter-equivalence rules, and deterministic expansion record. |
| `Risk` | Threat, probability, impact, trigger, owner, mitigation, and exit condition. |
| `Milestone` | Approved scope boundary. |
| `WorkItem` | Bounded task. |
| `Artifact` | Document, dataset, model, prototype, or report. |
| `ReviewGate` | Approval checkpoint. |
| `ImpactReport` | Downstream consequences of a proposed change. |
| `Waiver` | Scoped exception with authority, rationale, compensating control, expiry, affected release, and reopening trigger. |
| `GenerationPhase` | Deterministic initialization/update phase and its dependencies. |
| `DependencyComponent` | Strongly connected generation/simulation subsystem requiring bounded iteration. |
| `ConvergencePolicy` | Iteration order, error bounds, fixed-point/limit-cycle handling, and failure behavior. |
| `DescriptionEntailmentResult` | Immutable governed proof/result binding an exact claim to contract, law, terminology, validator, assumptions, and counterexample/witness data. |
| `GeneratorVersion` | Immutable generator code/rule identity, schema/ontology/law/numeric dependencies, address semantics, and fingerprint. |
| `GeneratedBaseRevision` | Reconstructible or materialized base at an address with pinned versions and verified hash. |
| `MigrationPlan` | Dry-run scope, source/target versions, ordering, preconditions, remaps, delta-rebase policy, collision/orphan policy, rollback, and acceptance thresholds. |
| `MigrationResult` | Immutable execution result, affected counts, hashes, conflicts, loss ledger, rollback status, and reviewer decision. |
| `IdentityAddressRemap` | One-to-one, split, merge, or retired identity/address mapping with rationale and continuity rules. |
| `Tombstone` | Durable statement that a generated identity/address was intentionally retired and may not be silently reused. |
| `DeltaRebase` | Old-base/new-base relation and deterministic transformation of persistent deltas. |
| `RebaseConflict` | Orphan delta, identity collision, semantic conflict, chosen resolution, loss/compensation, and approval. |
| `GoldenSaveCorpus` | Versioned representative/adversarial saves and expected migration/replay outcomes. |

Required locked constraint:

```text
prod:constraint:single-player-only
prod:constraint:no-player-only-physics
prod:constraint:qi-condensation-no-personal-mountain-splitting
prod:req:shared-actor-action-resolver
prod:req:capability-contribution-ledger
prod:test:player-npc-parity
prod:test:realm-envelope-validation
prod:test:external-power-attribution
prod:test:protagonist-exploit-gauntlet
```

It excludes multiplayer gameplay, PvP, shared simulation authority, matchmaking, lockstep, and MMO persistence. Save backup or cross-device sync is storage infrastructure, not multiplayer. Local deterministic simulation, durable saves, performance, modularity, and eventual mod support receive priority.

### Production edges

```text
DERIVES_FROM              CONSUMES_CANON
JUSTIFIED_BY_EVIDENCE     SATISFIES
IMPLEMENTS                DEPENDS_ON
BLOCKS                    MITIGATES
VALIDATED_BY              TESTED_BY
GENERATES_TESTS_FOR       PRODUCES
TARGETS                   GATED_BY
SUPERSEDES                AFFECTED_BY
REVEALS_ISSUE_WITH
```

An experiment result does not move between graphs and does not directly change canon. A provenance activity may create a separate Evidence `Source` and `SourceVersion` that reports the immutable Production result, linked by `REPORTS_AS_EVIDENCE`. That evidence may trigger a new proposal.

The “Test Graph” used by the Open-Ended Gauntlet is a derived, read-only view over governed Production `TestObligation`, `TestObligationRevision`, `AcceptanceTest`, `GauntletFamily`, `Experiment`, `ExperimentResult`, risk, waiver, and dependency nodes. The derived view creates no competing IDs or truth.

A logical `TestObligation` key is the canonical hash of: gauntlet-family stable ID, assertion/motif kind, ordered stable IDs of covered graph subjects, jurisdiction/time-scope identity, and normalized parameter-equivalence-class key. Exact input revisions, generator version, fixtures, threshold set, reproduction manifest, and expected envelope belong to immutable `TestObligationRevision`, not the logical key. A uniqueness constraint forbids duplicate active logical keys.

Obligation lifecycle is `draft → active → passing | failing | blocked → superseded | retired`. New upstream revisions or reopening conditions create a new immutable revision under the same logical key and retain prior results. A split creates deterministic child keys linked `SPLITS_FROM`; a merge creates a deterministic set-derived key linked `MERGES_FROM`; supersession never deletes history or transfers a passing result without rerun. The `TestGenerationManifest` pins generator version and proves the expansion, split/merge, and zero-orphan set.

Generator migrations are governed Production state, not prose attachments. Every affected `GeneratedBaseRevision` consumes an immutable `GeneratorVersion`; a migration must have a reviewed `MigrationPlan`, dry-run `MigrationResult`, explicit `IdentityAddressRemap`/`Tombstone` records, `DeltaRebase` and `RebaseConflict` disposition, rollback target, and passing `GoldenSaveCorpus` results before commit. Identity collisions, orphan deltas, lossy merges/splits, or address reuse cannot be silently resolved.

A requirement cannot become approved without a measurable acceptance test or a valid scoped waiver. Single-player-only, no-player-only-physics, identity/save integrity, description predicates, rights/originality/cultural safety, and other contract-critical invariants are non-waivable. A core claim may only be deferred by removing or narrowing it from the affected release.

---

## 7. Validation invariants

1. Every truth-bearing node belongs to exactly one graph.
2. Every edge predicate enforces valid source and target types.
3. Every EvidenceUnit resolves to an immutable SourceVersion and exact location.
4. Every factual Claim has at least one `GROUNDED_IN` edge.
5. Inferences are labeled and cannot masquerade as direct evidence.
6. All machine extraction, mapping, synthesis, and proposals begin as candidates.
7. No agent or author approves its own submission.
8. Ordinary agents cannot create or modify ratified mainline canon.
9. Ratified canon requires a signed decision, continuity review, originality/rights review where needed, and evidence or an explicit original-design rationale.
10. Blocking contradictions prevent ratification.
11. Canon taxonomies and supersession chains are acyclic unless a distinct causal-cycle relation is explicitly modeled.
12. Only one active mainline revision occupies a stable identity and overlapping world-time interval.
13. Released graph snapshots are immutable.
14. Sources from one independence group do not count as independent corroboration.
15. Restricted source expression cannot be copied into canon, production deliverables, generated content, or runtime prompts.
16. Every approved requirement traces to a player promise, constraint, canon item, or evidence-backed decision.
17. Every approved requirement has an acceptance test or recorded waiver.
18. Anything violating the single-player-only constraint fails validation.
19. Seed semantics, stable IDs, scale, persistence, identity, realm behavior, or law changes require a migration and continuity impact report.
20. High-impact downstream effects must be resolved before merge unless a permitted, scoped user-authorized waiver removes/narrows the affected release claim and records rationale, compensating controls, expiry, and reopening trigger. Non-waivable invariants cannot be bypassed.
21. Agent output built against superseded inputs is automatically stale.
22. Confidence increases require new review or genuinely independent evidence.
23. A declared item, technique, skill, law, or affordance requires a semantic behavior contract and at least one literal-fidelity test.
24. Generated prose describes canonical state; it cannot create abilities or facts unsupported by that state.
25. A realm cannot ratify without changes to perception, verbs, constraints, responsibilities, failure, and relevance of earlier play.
26. Player-facing terminology must resolve to the approved seasoned-reader lexicon; unexplained niche romanization, inconsistent translation, awkward overtranslation of standard xianxia terms, and pseudo-Chinese syllable generation fail validation.
27. Protagonist advantages are canonical entities and relationships using the same action, provenance, cost, law, persistence, and consequence schemas as every other being. No hidden player-only exception path is valid.
28. Every realm defines a multidimensional capability envelope. An action beyond that envelope must identify external resources, authority, preparation, location, debt, or assistance sufficient to make it lawful; protagonist status alone is never sufficient.
29. Truth-bearing graph edges target immutable revisions, not stable aliases or “latest” records.
30. The derived Test Graph cannot own independently editable truth or lifecycle state.
31. Generated addresses pin generator, schema, ontology, law, numeric-profile versions, and a base hash. Updates preserve a legacy resolver/materialized base or use an explicit dry-run migration, delta rebase, rollback, and old-save golden test.
32. Canonical event ordering, stable ID allocation, fixed numeric/quantization policy, and excluded nondeterministic operations are release-pinned; cross-runtime differential replay hashes must agree within declared exact or bounded semantics.
33. In-world causality/authorship, research evidence, inspiration, and project decision provenance are separate fields connected only by explicit bridge records.
34. Every published `DescriptionClaim` has a current passing immutable `DescriptionEntailmentResult`; any bound revision or assumption change reopens it.
35. Test obligation logical keys are unique; revision, split, merge, supersession, reopening, and generator history are immutable and queryable.
36. Generator migration cannot commit with undisposed identity/address collisions, orphan deltas, rebase conflicts, or failed golden saves.

---

## 8. Saved impact queries

The system must answer:

- If a source is corrected or retracted, which claims, patterns, canon proposals, requirements, tests, and PRD sections become unsupported?
- Which canon revisions rely on only one restricted copyrighted source?
- Which alleged genre conventions have only work-specific evidence?
- If a realm’s lifespan, mobility, or perception changes, which social, ecological, combat, economy, art, save, and quest assumptions break?
- Which production nodes consume superseded canon?
- Which approved requirements lack tests?
- Which canon proposals have unresolved contradictions?
- Which outputs were created against stale sources, schema, or canon releases?
- Which restricted sources contribute text to redistributable artifacts?
- Which concepts have high production impact but low evidence confidence?
- Which skills or items advertise behavior not entailed by their semantic contracts?
- Which generated descriptions contain an affordance that the simulation cannot perform?
- What is affected if seed semantics, stable entity IDs, spatial coordinates, or simulation-tier rules change?
- What changes if the player authors one world law and a century passes?
- Which mortals, places, debts, ecologies, and memories lose relevance after a realm transition?
- Which systems violate the single-player-only constraint?
- Show orphan claims, canon nodes, mechanics, tests, artifacts, and encyclopedia pages.

Normative predicate directions:

```text
SourceVersion VERSION_OF Source
EvidenceUnit EXTRACTED_FROM SourceVersion
Claim GROUNDED_IN EvidenceUnit
Claim ABSTRACTED_INTO CrossSourcePattern
CanonProposal CONTEXTUALIZED_BY Claim
CanonProposal JUSTIFIED_BY CrossSourcePattern
CanonProposal ANSWERS_NEED IndependentGameplayNeed
CanonProposal DERIVED_FROM_RATIONALE OriginalDesignRationale
CanonRevision DECIDED_BY CanonDecision
CanonRevision MEMBER_OF_RELEASE CanonRelease
ProductionRequirement CONSUMES_CANON CanonRevision
ProductionRequirement VALIDATED_BY AcceptanceTest
```

Every predicate has a normative domain/range declaration. Examples are schema-tested; arrow layout in prose has no independent meaning.

`CONTEXTUALIZED_BY` can preserve historical or comparative context but has zero canon-authorizing force. A research-informed proposal is invalid unless it is `JUSTIFIED_BY` a reviewed `CrossSourcePattern` **and** `ANSWERS_NEED` an independent gameplay need. An original-design proposal is invalid unless it is `DERIVED_FROM_RATIONALE` an `OriginalDesignRationale` and answers a need or registered contradiction. `Claim → CanonProposal` through any authorizing predicate is prohibited.

---

## 9. Reviewer roles and authority

| Role | Creates | May approve |
|---|---|---|
| Librarian | Sources, versions, access/rights metadata | Source-ingestion completeness |
| Extractor | Evidence units and candidate claims | Nothing they extracted |
| Ontologist | Term mappings, duplicates, conflict sets, schema proposals | Ontology hygiene after independent review |
| Xianxia researcher | Syntheses, scope judgments, comparison reports | Evidence interpretation, not canon |
| Designer | Canon and production proposals | Nothing they authored |
| Systems architect | System contracts, experiments, risks | Readiness after independent evidence review |
| Red team | Contradictions, exploits, rights/cultural risks, falsification attempts | Nothing; adversarial independence is preserved |
| Continuity editor | Temporal/dependency findings and impact reports | Continuity gate |
| Cultural reviewer | Terminology and cultural-flattening findings | Cultural-context gate |
| Rights steward | Access, expression, copyright, and provenance classifications | Rights/originality gate |
| Production reviewer | Traceability and acceptance findings | Production-readiness gate |
| Grand Architect | Reviewed decisions and release recommendations | Ratification only if explicitly delegated |
| User / Product owner | Explicit direction and scope | Final canon and product-scope authority |

Unless the user delegates ratification, only the user may move a proposal to ratified canon. The Grand Architect may recommend, reject, or request revision, but cannot silently merge.

Reviewer records include domain competency, language competency where relevant, independence, disclosed conflicts, scope, compensation/engagement status, and decision authority. Cultural or translation approval cannot be supplied by a nominal generic role. Panels retain dissent and escalation records rather than forcing false consensus.

---

## 10. Approval gates

### E0 — Source intake

Requires identity, exact version, locator, retrieval date, access, rights, language/translation status, and hash or equivalent fingerprint.

### E1 — Evidence verification

Requires location, faithful paraphrase, atomic claims, confidence dimensions, and different extractor/reviewer identities.

### C0 — Ontology review

Checks ambiguity, duplication, scope, temporal validity, hierarchy cycles, and known contradictions.

### C1 — Canon design review

Requires evidence or original-design rationale, negative inspiration constraints, rights/cultural review, semantic action contract where applicable, red-team report, and continuity impact report.

### C2 — Canon ratification

Requires a visible signed user decision or explicitly delegated Grand Architect decision and inclusion in an immutable release.

### P0 — Production traceability

Requires links to promises, constraints, canon, evidence, risks, dependencies, semantic contracts, and measurable acceptance criteria.

### P1 — Feasibility and systemic proof

Requires experiments proportional to uncertainty, alternatives, cross-system tests, performance/continuity findings, and literal-description fidelity.

### P2 — Research Bible / PRD release

Requires zero unresolved blocking contradictions, no multiplayer scope, no unreviewed restricted-source dependency, completed impact analysis, and reviewer sign-off. The release pins a signed threshold set and must have zero included-scope S0/S1 findings. Every included Production claim or requirement must have measurable `TestObligation`s and passing measured results; research-only feasibility evidence may use reproducible external benchmarks before code is authorized. A claim without sufficient evidence is removed from the release or explicitly deferred—it cannot pass on a promised future experiment.

---

## 11. Agentic workflow

Control-plane nodes:

```text
WorkOrder        AgentRun         Submission
ReviewFinding    RedTeamFinding   ChangeSet
GateDecision     Handoff          Checkpoint
```

State routing:

```text
queued
→ librarian intake
→ extraction
→ ontology mapping
→ comparative synthesis
→ design proposal
→ systems translation
→ red-team challenge
→ independent review
→ changes requested | rejected | approval recommended
→ explicit gate decision
→ merge and immutable release
```

Rules:

- Librarians output source records, not conclusions.
- Extractors output candidate evidence, not canon.
- Ontologists normalize verified claims and preserve disagreement.
- Designers work against pinned evidence and canon releases and submit diffs.
- Systems translators attach player verbs, behavior contracts, and tests.
- Red-team agents receive the proposal and dependencies but not the designer’s private reasoning.
- Reviewers receive the evidence bundle, branch diff, rights/cultural reports, red-team findings, and impact report.
- Merge requires a `GateDecision`; conversational enthusiasm is insufficient.
- Every run pins source versions, canon release, schema, work order, model/tool identity where available, and output hash.
- Retrying creates a new run and submission, not duplicate canon.
- Agent summaries are disposable views; graph assertions are the system of record.

Typed state, conditional routing, checkpoints, resumability, and human interruption are good workflow ideas, but the project should stay vendor-neutral. LangGraph documents checkpointed persistence and human-in-the-loop workflows ([official persistence documentation](https://docs.langchain.com/oss/javascript/langgraph/persistence)).

### GraphRAG boundary

GraphRAG-style extraction is useful for candidate Evidence nodes, local concept retrieval, hierarchical discovery, terminology clusters, and contradiction candidates. Microsoft’s public GraphRAG documentation describes structured extraction and hierarchical summaries, while its repository warns that indexing can be expensive and requires domain tuning ([overview](https://microsoft.github.io/graphrag/index/overview/), [repository](https://github.com/microsoft/graphrag)).

Use it with these boundaries:

- embeddings, clusters, and generated summaries are rebuildable indexes;
- every consequential claim returns to exact EvidenceUnits;
- summaries are never canon or evidence by themselves;
- negative and contradictory evidence remains visible;
- canon and production dependencies use exact traversal and validation;
- begin with bounded corpora and known evaluation questions; do not “index everything” first.

---

## 12. Minimal valid lifecycle example

The literal-affordance rule follows this complete lifecycle:

1. An Evidence `Source` identifies the exact first-party design observation or research source.
2. An immutable `SourceVersion` records retrieval, fingerprint, rights, and access.
3. A located `EvidenceUnit` is `EXTRACTED_FROM` that version.
4. A candidate `Claim` is `GROUNDED_IN` the evidence unit and becomes verified only after independent review.
5. Reviewed Claims may be abstracted into a `CrossSourcePattern`; an `IndependentGameplayNeed` separately records why the project needs the rule. Alternatively, an `OriginalDesignRationale` records the project promise and contradiction without pretending it came from external evidence.
6. An agent creates `CanonProposal:literal-affordance-integrity` on a proposal branch. On the research-informed route it is `JUSTIFIED_BY` the reviewed pattern and `ANSWERS_NEED` the independent need; Claims are only `CONTEXTUALIZED_BY`. On the original route it is `DERIVED_FROM_RATIONALE` the rationale and answers the need or registered contradiction. Verified evidence alone is insufficient.
7. Rights/cultural review, originality review, semantic review, contradiction review, and an impact report complete.
8. A signed `CanonDecision` accepts a new immutable `CanonRevision`.
9. That revision is `MEMBER_OF_RELEASE` an immutable `CanonRelease`.
10. `ProductionRequirement:semantic-action-contracts` `CONSUMES_CANON` that exact revision—not the proposal or stable alias.
11. The requirement is `VALIDATED_BY` an `AcceptanceTest` for the upside-down qi mountain and broader generated cases.
12. Experiment results remain Production nodes; a provenance activity creates a separate Evidence source if the result later informs design.

All records carry the common envelope or explicit schema defaults. The example deliberately avoids abbreviated pseudo-data that would violate the schema it is teaching.

---

## 13. Exit criteria for Graph Schema v0.2

- The Universe Encyclopedia has a complete first-pass domain taxonomy and every family maps to graph node/edge types.
- Semantic action contracts are defined for items, skills, beings, environmental processes, institutions, events, and world laws.
- A versioned release horizon covers identity, time, provenance, rights, branches, terminology, protagonist advantage, description claims, and migration across risk partitions; example counts support but never substitute for coverage and mutation detection.
- Every registered contradiction revision exists as a graph case with owner, evidence or rationale, affected nodes, and test families; the zero-orphan query must return no results. Contradiction #43 is explicitly bound to `ProtagonistAdvantageProposal`, `RealmCapabilityEnvelope`, shared-resolver parity, stacking, realm-ceiling, transfer/death, and plot-armor `TestObligation`s.
- Cross-system impact queries are rehearsed on at least one low-realm and one high-realm design candidate.
- The originality route demonstrably blocks a direct one-source-to-canon import.
- The gauntlet can generate tests from graph assertions instead of relying on a fixed hand-written checklist.
- The user approves or revises canon-ratification authority explicitly.

Until those criteria pass, the schema is a research constitution and design target—not authorization to install a graph stack or begin game code.
