# Next-Phase Xianxia Source, Terminology, and Originality Workplan — Draft v0.1

**Status:** reviewed pre-canon research workplan; all research tasks remain `NOT RUN`; no game code authorized  
**Purpose:** turn the foundation release's cultural and genre unknowns into claim-level evidence, reviewed terminology, bounded comparison sets, and originality decisions before any **dependent** lore, realm, cosmology, technique, or PRD claim advances  
**Consumes:** Terminology and Cultivation Foundation, Mortal Year Atlas, Identity/Death Models, Qi Condensation Envelope, Er Gen/Gemini Mechanics Critique, release audit, and Research Graph governance  
**Does not authorize:** canon, a historical reconstruction, religious claims, medical instruction, Chinese names for project-native inventions, production code, data scraping outside license/terms, or copying a source's distinctive expression

---

## 0. Research outcome

This phase must answer a narrower question than “what is our cultivation universe?”:

> Which meanings, English genre terms, cultural distinctions, comparative mechanics, and originality boundaries are supported strongly enough to present as explicitly non-canon design candidates?

The output is a reviewed evidence package. It may establish vocabulary policy, reject conflations, identify recurring genre affordances, and propose decision options. It may not decide what qi ultimately is, whether Dao is ontically real, whether persons possess a soul, whether tribulations exist, what a domain does, or which candidate enters canon.

Unknown and disputed claims remain typed unknowns. Absence of evidence is recorded; it is never repaired by plausible-sounding invention.

`RESEARCH-INVENTORY-v0.1` freezes this release to seven core-term tracks and four genre-mechanic families plus their explicitly registered cultural/originality dependencies. Every claim, card, memorandum, dossier and handoff has dependency edges. A partial evidence tranche may pass and release an unrelated handoff while another track remains unknown; one unresolved *ming*, tribulation or living-practice claim cannot freeze source-neutral control, terrain, collection or perception-interface research. Parallel design work may use typed placeholders such as `ontology: unknown` and must prove that its operation does not assume an answer.

Every track receives a `TrackBudget-v0.1` before acquisition. The default ceiling per v0.1 core-term track is 60 claim cards, 80 researcher-hours, two independent review rounds and three repair cycles; per mechanic family it is 180 passage cards inside the frozen corpus, 120 researcher/coder-hours, two independent review rounds and three repair cycles; per cultural memorandum it is 40 source records, 80 researcher-hours, two review rounds and three repair cycles. A lead may propose a different bounded budget before work begins with rationale and dependency impact. Exhaustion yields `DEFERRED_UNKNOWN` or `REJECTED` for that claim/track. Further acquisition requires a separately approved new revision; it is never the automatic response to a failed gate.

---

## 1. Required deliverables

1. **Core-Term Claim Card Set v0.1** for qi, Dao, *xin*, *shen*, *jing*, *xing*, and *ming*.
2. **Genre Mechanics Corpus v0.1** for divine sense, cultivation methods, domains/fields, and tribulations.
3. **Translation and Terminology Register v0.2** distinguishing seasoned English, context-dependent translation, first-use gloss, research-only romanization, and prohibited flattening.
4. **Cultural Track Memoranda v0.1** produced independently before cross-track comparison.
5. **Originality Red-Team Report v0.1** covering terminology, realm structures, techniques, protagonist advantages, institutions, artifacts, cosmology, and scenario sequences.
6. **Contradiction and Unknown Register v0.1** preserving disagreements, source gaps, edition problems, and meanings that cannot yet be reconciled.
7. **Candidate Decision Dossiers v0.1** containing two or more bounded options for each fork enumerated in the Stage-A `PhaseScopeManifest-v0.1`, including a “defer / select none” option. A newly discovered fork enters the unknown/deferred register for a later revision and does not expand the active gate.
8. **Research-Gate Audit v0.1** recording pass/fail evidence for every acceptance gate in section 12.
9. **Research Inventory and Dependency Manifest v0.1** fixing claim scope, track budgets, tranche boundaries, consumers, and blocked/unblocked handoffs.
10. **Design Bridge Set v0.1** for every design-bearing synthesis; vocabulary-only and research-only findings remain explicitly nonmechanical.

Every deliverable remains pre-canon. Deliverables may publish by dependency-complete tranche. A user decision and a separate canon revision are required before any candidate becomes world truth.

---

## 2. Claim-level source card contract

Every substantive historical, religious, linguistic, modern-cultural, translation, or genre-frequency claim receives one stable `CLAIM-*` record. A bibliography entry without a claim card is discovery material, not evidence.

### 2.1 Mandatory fields

```text
Claim ID and revision
Exact bounded claim
Claim class
  historical | philosophical interpretation | religious/traditional
  medical history | contemporary lived practice | modern genre
  translation/localization | reader expectation | design inference
Source ID, edition, author/editor/translator, publisher, date
Language and access/licensing status
Exact location: page, section, chapter, line, timestamp, or entry
Minimal quotation or precise paraphrase
Hanzi/orthography and tonal pinyin when relevant
Candidate English renderings and rejected renderings
Speaker/narrator/translator/editor and their epistemic position
Tradition, period, region, community, genre, and work scope
What the source supports
What the source does not support
Known counterevidence or disagreement
Inference distance: direct | close interpretation | comparative inference
Confidence and open verification work
Cultural, medical, copyright, and spoiler cautions
Independent reviewer and disposition
Research Graph edges to terms, mechanics, contradictions, and candidates
```

### 2.2 Evidence labels

- **Primary historical text:** evidence for the located passage, not automatic evidence for a whole civilization or later tradition.
- **Critical edition or qualified translation:** edition-bearing interpretation whose choices remain visible.
- **Specialist scholarship:** an argued scholarly position, never a neutral consensus token.
- **Contemporary lived-practice source:** evidence limited to the represented community, period, and research method.
- **Modern genre primary source:** evidence for that work and edition; multiple works are required for a corpus claim.
- **Licensed translation:** evidence for established English usage in that translation, not automatic identity with the Chinese term.
- **Translator/editor note:** valuable translation evidence; not authorial cosmology unless separately established.
- **Fan wiki, forum, machine summary, or search snippet:** discovery-only unless it points to a verifiable primary passage.
- **Original design inference:** project reasoning that cites its inputs and is never presented as cultural fact.

### 2.3 Card rejection rules

A card fails if it lacks an exact source location, silently back-translates English into invented Hanzi, treats one translation as universal, uses a decontextualized dictionary gloss as ontology, generalizes one author to xianxia as a whole, turns a living practice into supernatural proof, or hides a material source disagreement.

---

## 3. Core-term research tracks

The seven tracks are investigated separately before any synthesis. Their purpose is to map semantic ranges and guardrails, not to find one “true ancient system.”

### 3.1 Qi — 氣/气, *qì*

Required questions:

- What do the selected early texts, later religious materials, medical histories, philosophical scholarship, modern genre works, and licensed translations each mean by qi?
- When do “breath,” “vital breath,” “material force,” “energy,” “氣,” or unglossed **qi** illuminate a passage, and when do they distort it?
- Which genre mechanics are work-local: ambient qi, personal reserves, signatures, elemental affinities, circulation, contamination, or conversion?
- What conservation, information-carrying, bodily, environmental, and measurement properties remain project inventions?

Prohibited conclusion: qi is merely mana, joules, breath, electricity, morality, life force, or one universal substance because one source uses a convenient English gloss.

### 3.2 Dao — 道, *dào*

Required questions:

- How do selected sources use Dao as way, path, guidance, practice, possibility, cosmological referent, discourse, or other context-bearing sense?
- How do modern genre texts distinguish the Dao, a dao/path, comprehension, doctrine, pattern, domain, technique, and world rule?
- When is capitalization an English editorial choice rather than a source-language distinction?
- Which gameable world patterns, claims, offices, vows, or boundaries must remain original rather than being mislabeled “Dao authority”?

Prohibited conclusion: Dao is a mana element, statutory law, moral alignment, universal spell school, database permission, or a single meter.

### 3.3 *Xin* — 心, *xīn*

Required questions:

- When is **heart-mind** the least misleading English, and when is a narrower heart, mind, intention, attention, desire, or affect rendering justified?
- How do the selected traditions disagree about cognition, affect, embodiment, cultivation, and moral psychology?
- Which genre uses of “Dao heart,” mental state, will, obsession, or inner conflict are source-local?

Prohibited conclusion: *xin* is an immaterial rational mind, an emotion bar, a detachable soul, or a synonym for *shen*.

### 3.4 *Shen* — 神, *shén*

Required questions:

- Which passages refer to spirit, numinous efficacy, conscious spirit, a deity/spirit being, attentional vitality, or another referent?
- How do licensed translations disambiguate *shen*, soul terminology, divine sense, spirit consciousness, gods, and spirit entities?
- What would count as evidence for a detachable or persistent project entity, rather than a translation assumption?

Prohibited conclusion: every *shen* is a human soul token, every spirit is a god, or spirit automatically establishes personhood or numerical identity.

### 3.5 *Jing* — 精, *jīng*

Required questions:

- How do essence, vital essence, refinement, material/reproductive associations, and alchemical contexts vary?
- Which modern genre uses turn *jing* or “essence” into a resource, constitution, lifespan, bloodline, or refinement mechanic?
- What gendered, reproductive, age, disability, and body assumptions would a project model import?

Prohibited conclusion: *jing* is one universal reproductive substance, stamina bar, genetic purity score, or interchangeable synonym for qi.

### 3.6 *Xing* — 性, *xìng*

Required questions:

- How do inner nature, nature, disposition, and tradition-specific philosophical or alchemical senses differ?
- When does *xing* pair with *ming*, and when would importing that pair misrepresent the source?
- How can character nature, moral judgment, species traits, temperament, and cultivation orientation remain separate?

Prohibited conclusion: *xing* is personality alignment, biological essence, moral worth, or a universally stable metaphysical component.

### 3.7 *Ming* — 命, *mìng*

Required questions:

- Which contexts support life, existence, lifespan, allotment, command, mandate, fate, destiny, or another rendering?
- How do *ming*, political mandate, bodily vitality, predicted future, luck, karma, and causal relation remain distinct?
- Which identity/death candidates need a *ming*-like category, and which do not?

Prohibited conclusion: lifespan, destiny, Heaven's mandate, legal command, karma, and personal identity are one stat.

### 3.8 Core-term synthesis rule

No combined `jing–qi–shen`, `xing–ming`, body–qi–spirit, or Dao/world-law model is admitted merely because a historical or genre source relates those terms. Synthesis requires a named project purpose, explicit source scope, an original operation model, counterexamples, and independent cultural review. Personhood and identity-continuity judgments remain separate unless a later selected ontology explicitly relates them.

---

## 4. Genre-mechanics evidence program

The corpus asks what licensed works actually depict. It does not search for a universal xianxia rule.

### 4.1 Divine sense and related translations

Code separately:

- source-language term and licensed English rendering;
- acquisition or awakening conditions;
- modality and targets;
- all-direction versus focused use;
- range, resolution, attention, concurrency, medium, occlusion, concealment, and counter-detection;
- whether it reads surfaces, interiors, qi, living beings, souls, intent, ownership, cultivation state, memories, or none of those;
- active/passive status, signature, cost, injury, false positives, and contest behavior; and
- narrator fact versus character belief.

Existing Er Gen examples are seed cards only. They may prove that ISSTH or another named work depicts a mechanic; they cannot authorize a universal project radar.

### 4.2 Methods, arts, techniques, formulae, and transmission

Track source terms and translations such as *gongfa*, *fa*, *jue*, *shu*, art, method, scripture, manual, formula, technique, ability, and spell without assuming equivalence. Code:

- curriculum versus bounded operation;
- oral, textual, embodied, ritual, initiatory, lineage, or environmental transmission;
- prerequisites and body assumptions;
- interpretation, teacher correction, secrecy, forgery, incompleteness, and translation error;
- practice schedule, resources, feedback, deviation, and institutional recognition; and
- whether a name describes mechanism, lineage, image, aspiration, founder, place, or marketing.

The research output may recommend project-English distinctions such as **cultivation method** and **technique**. It must not claim that one Chinese source term maps cleanly to one English game category across works.

### 4.3 Domains, fields, territories, and bounded influence

Do not assume one Chinese term or one mechanic behind English **domain**. For every occurrence, record:

- source term, translator choice, work, realm/rank, and speaker;
- spatial boundary, target relation, persistence, anchors, source, and mobility;
- whether it is perception, pressure, formation, territorial office, projected environment, technique effect, claimed region, or metaphor;
- admission/exclusion behavior and actual counters;
- relation to Dao/path attainment, local world patterns, institution, artifact, vow, or geography; and
- demonstrated limits and contradictory scenes.

No generic “domain expansion,” world editor, or jurisdiction mechanic survives without an original contract and a non-copying gameplay need.

### 4.4 Tribulations and calamity language

Separate at least:

- historical/religious/literary uses of 劫 *jie* and related calamity language;
- modern genre breakthrough tribulations;
- lightning, fire, wind, heart-mind, karmic, social, institutional, environmental, or other work-local forms;
- Heaven as person, order, process, institution, ecology, interpretation, or absent cause;
- trigger, detection, target selection, escalation, witnesses, intervention, aftermath, and repeatability; and
- narrator mechanism versus character theology.

The familiar individualized lightning breakthrough remains a modern-genre hypothesis until its genealogy is completed. The project does not select tribulations merely by keeping the seasoned English word.

---

## 5. Multilingual licensed-corpus methodology

### 5.1 Corpus strata

Maintain separate, filterable strata:

1. historical primary texts in identified editions;
2. qualified translations and critical editions;
3. specialist historical, philosophical, religious, medical, literary, and anthropological scholarship;
4. contemporary lived-practice research;
5. Chinese-language modern genre primary texts accessed under lawful terms;
6. licensed English translations and official localizations;
7. translator/editor notes;
8. genre scholarship; and
9. fan/discovery material that cannot carry a claim.

No stratum votes another into equivalence. A recurring licensed English term establishes translation practice in the sample, not historical ontology.

### 5.2 Sampling controls

- Preregister a maximum-variation matrix before selecting works: subgenre and tone; publication period; platform/publisher; source and licensed-translation lineage; protagonist gender/body/social position and cultivation relationship; mortal/institutional emphasis; popularity band; completion status; and region/language of publication where relevant. Author demographics may be recorded only when self-disclosed or responsibly sourced; never inferred from a name.
- Record author, work, publication year, platform/publisher, subgenre, completion status, source language, translator, edition, and accessible chapter range.
- Avoid one-author, one-platform, one-translator, one-decade, and bestseller-only concentration.
- Sample ordinary scenes as well as glossary-like exposition and late-series power-scaling passages.
- Include counterexamples and works that omit the proposed convention.
- Distinguish independent translations from shared terminology inherited through one translation lineage.
- Preserve spoiler grades and never expose avoidable spoilers in player-facing terminology decisions.
- Do not bulk scrape, bypass access controls, reproduce substantial copyrighted text, or treat an unofficial mirror as the preferred source.
- Store minimal quotations; prefer claim-level paraphrase plus an exact licensed location.
- Collapse translations/localizations derived from one source translation or editorial lineage into one dependency unit for independence claims, while retaining their distinct player-facing wording as localization evidence.
- Publish sample denominators, inaccessible/unknown strata, missing chapters and the coverage cell of every included work. No result may use population-frequency language such as “most xianxia” without a defensible sampling frame; ordinary results are descriptions of the frozen sample only.

### 5.3 Minimum sample-coverage and coding thresholds

These are coverage floors for a bounded sample, not estimates of xianxia prevalence, truth or independent invention. Counts do not authorize an original mechanic and are never required for a source-neutral mechanic motivated by an independent player/world problem.

| Proposed claim | Minimum evidence before review |
|---|---|
| established licensed-English term **in the sample** | occurrences in at least 8 series, 4 authors, 2 independent licensed publishers/platforms or localization lineages, with translation variance, dependency collapse and counterexamples recorded |
| sampled-corpus convention | at least 12 series, 6 authors, 2 publication periods, and 2 independent platforms/publishers, with the preregistered maximum-variation cells reported; code both presence and meaningful absence |
| comparative mechanic family used to inform a project abstraction | at least 8 independently authored works plus 3 materially different implementations and 2 counterexamples; abstraction must omit source-distinctive expression. An independently motivated original mechanic may instead use a `DESIGN-BRIDGE` with zero corpus-frequency claim |
| exact translation equivalence | bilingual review of the exact passages in at least 3 independent contexts; otherwise label contextual rendering or unknown |
| historical semantic claim | exact primary location where available, qualified translation/edition, and at least 2 relevant specialist discussions or one critical edition plus one independent specialist |
| contemporary living-culture claim | current qualified research scoped to the represented community plus an appropriate cultural reviewer; classics alone cannot satisfy it |

Counts measure coverage, not truth. A material contradiction blocks a universal claim even when the numerical threshold is met. All high-risk cultural, historical, translation-equivalence and living-practice fields receive 100% independent double review. Other categorical coding fields preregister Krippendorff's alpha ≥0.80; interpretive fields preregister alpha ≥0.67 plus adjudication of every disagreement. A field below its floor triggers codebook repair and full-field recoding, not selective correction or threshold weakening. If alpha is unsuitable for a field, the manifest must preregister an exact-agreement alternative and rationale before coding.

### 5.4 Translation workflow

1. Transcribe the exact source expression and variants.
2. Record tonal pinyin as metadata, not decorative prose.
3. Compare the licensed translation, at least one qualified reference translation where relevant, and bilingual reviewer analysis.
4. Describe what each rendering foregrounds or loses.
5. Choose a project-English term only for a bounded project concept.
6. Never fabricate Hanzi for an English-first project invention.
7. Preserve unresolved alternatives in the register.

Machine translation may assist discovery or alignment only. It cannot close a translation card.

---

## 6. Cultural track separation

Each track produces its own memorandum before a synthesis meeting. Reviewers may identify exchange and overlap, but no “Three Teachings,” “ancient Chinese,” or “Eastern spirituality” super-system is permitted.

Required tracks:

1. early and medieval Chinese philosophical texts, with schools and dates kept explicit;
2. historical and contemporary Daoist traditions, internally plural;
3. Buddhist philosophies, ritual traditions, monastic and lay contexts, and rebirth/personhood debates, internally plural;
4. Confucian and Neo-Confucian cultivation, ethics, ritual, education, family, and governance, internally plural;
5. medical-body history and living health practices, separated from supernatural truth and clinical advice;
6. local religion, temples, deity/spirit relations, ancestors, divination, festivals, and funerary practice, regionally scoped;
7. literature, mythology, opera, vernacular religion, wuxia, xianxia, games, and platform culture as distinct media histories;
8. imperial law, office, mandate, land, kinship, labor, and institutions without treating one dynasty as default China;
9. minority, frontier, transregional, diaspora, and non-Han histories represented by qualified sources and reviewers rather than decorative borrowing; and
10. gender, sexuality, reproduction, disability, age, class, coercion, and body variation across all tracks.

### 6.1 Cross-track synthesis gate

A synthesis statement must name the contributing tracks, preserve their disagreements, state whether the relation is historical contact, shared vocabulary, later reinterpretation, modern genre recombination, or original design, and identify what cannot be generalized. If it cannot do so, the statement remains track-local.

### 6.2 `DESIGN-BRIDGE-v0.1`

Research does not become game architecture merely by being accurate. Every design-bearing synthesis must produce a bridge record containing:

```text
bounded source observation and claim-card dependencies
source-local/distinctive elements explicitly excluded
independent player/world problem
proposed operation and information interface
cost, preparation, failure, counter and recovery
persistence/aftermath and affected institutions/ecology
player/NPC parity projection
at least two materially different scenario fixtures
no-source and no-mechanic control fixtures
single-source distinctive-expression subtraction result
affected downstream contracts and test obligations
```

A vocabulary-only or research-only finding may remain nonmechanical and cannot block an unrelated design handoff. Candidate dossiers must present mechanically distinct options plus `none/defer`; a frequency count or cultural analogy cannot select an option.

---

## 7. Seasoned English and romanization policy

### 7.1 Retain fluent xianxia English

Use **qi**, **Dao**, **cultivation**, **cultivator**, and **Qi Condensation** in ordinary project English. When the corresponding concepts are selected, established terms such as **yin–yang**, **spiritual roots**, **meridians**, **dantian**, **breakthrough**, **tribulation**, **sect**, and **lineage** are preferred to awkward literal replacements. Keeping a term does not select its ontology or import another work's mechanics.

Do not replace qi with “energy” or “vital breath” by default, and do not rename Qi Condensation “Vital Breath Condensation.” Do not use Dao as a synonym for statute, damage type, mana, moral goodness, or generic system permission.

### 7.2 Gloss niche or ambiguous romanization

- Ordinary player prose defaults to clear English.
- At first relevant scholarly/codex use, write `clear English (Hanzi, tonal pinyin)` when the source-language distinction materially matters.
- Later prose uses the chosen English unless characters' language, scholarship, ritual, or translation dispute makes the source term important.
- Research records always retain Hanzi, tonal pinyin, source location, contextual meanings, and alternative translations where relevant.
- Do not stack unexplained pinyin to manufacture exoticism.
- Do not use a literal gloss as if it were a complete definition.
- Do not randomly alternate English and romanized terms as false synonyms.
- Names of project-native English concepts do not receive decorative pseudo-Chinese back-translations.

### 7.3 Mandatory distinctions

The register must never silently merge:

- qi, vital essence, spirit, breath, force, and generic energy;
- Dao, a path, doctrine, method, technique, pattern, statute, office, and fate;
- heart-mind, spirit, consciousness, soul, personhood, memory, and identity;
- lifespan, vitality, destiny, mandate, luck, karma, reputation, and causal debt;
- sect, lineage, clan, school, temple, monastery, guild, court, and state office; or
- realm, rank, title, office, attainment, technique, transformation, and translator comparison aid.

---

## 8. Originality red-team

The red-team protects both legal/IP boundaries and the project's creative identity. It is a design safeguard, not a substitute for qualified legal review.

### 8.1 Comparison units

Decompose every candidate into:

- name, translation, imagery, symbols, and visual silhouette;
- operation graph and failure behavior;
- acquisition, growth, cost, counter, and transfer/death rules;
- realm placement and transition sequence;
- institution, economy, ritual, and social consequences;
- protagonist relationship and narrative function;
- scenario order, reveal structure, and set pieces; and
- combinations that may be distinctive even when individual tropes are common.

### 8.2 Required tests

1. **Single-source distinctive-dependency subtraction:** remove source-distinctive expression, ordered dependencies, signature combinations and work-local mechanics traceable to the strongest inspiration; the candidate must remain coherent and desirable. Common genre vocabulary/tropes are not removed merely because a famous source also uses them.
2. **Signature-combination test:** compare the whole mechanic/name/progression/narrative bundle, not isolated generic tropes.
3. **Sequence test:** compare ordered realm transitions, acquisition beats, costs, reversals, and climactic uses.
4. **Controlled reverse-identification test:** blinded reviewers compare the candidate against matched generic-trope controls and famous-source controls. A redesign signal requires a preregistered excess-over-control agreement threshold **and** concrete identification of a distinctive combination, sequence, expression or dependency. Unsupported famous-work guesses are noise, not vetoes.
5. **Translation camouflage test:** changing names or translating them differently must not be treated as originality.
6. **Cross-source laundering test:** combining recognizable pieces from several works does not automatically create an original system.
7. **Generic-trope necessity test:** every retained trope needs an independent gameplay/worldbuilding function and original implementation.
8. **Prose and visual test:** no copied phrasing, emblematic composition, artifact silhouette, character likeness, or signature scene blocking.
9. **Procedural recombination test:** the generator may combine only cleared primitives; it may not accidentally reconstruct a source fingerprint.
10. **Expansion test:** future generated variants must remain inside the cleared abstraction rather than drifting toward the nearest source example.

### 8.3 Red-team dispositions

- **Reject:** copied or closely paraphrased prose; protected characters or settings; distinctive named artifacts, techniques, ladders, cosmologies, or signature scenes; a renamed source mechanic whose operation/progression remains substantially source-identifying.
- **Redesign:** supported repeated identification of a distinctive combination, ordered sequence, silhouette, protagonist advantage, institution or expression above the matched-control threshold; fame association with a generic trope is insufficient.
- **Research-only:** useful comparative observation that cannot enter the design without further abstraction.
- **Candidate:** independently motivated abstraction with cleared expression, materially different operations and consequences, documented source boundaries, and passing reverse-identification review.

Every candidate keeps an inspiration ledger. “AI generated it” is never evidence of originality.

The originality diagnostic and qualified legal/IP review are separate dispositions. A controlled reverse-identification pass is not legal clearance; an unsupported reviewer association is not evidence of infringement.

---

## 9. Work sequence

### Stage A — Registry and acquisition

- Freeze `PhaseScopeManifest-v0.1`, `RESEARCH-INVENTORY-v0.1`, dependency graph, tranche boundaries and every `TrackBudget-v0.1`; newly discovered forks/claims enter the deferred register rather than expanding v0.1.
- Create source, edition, translator, license/access, and reviewer records.
- Convert existing foundation citations into claim cards rather than assuming they are complete.
- Mark discovery-only and inaccessible materials.
- Assign source gaps before synthesis begins.

### Stage B — Independent term and cultural tracks

- Complete the seven core-term card sets.
- Produce cultural memoranda independently.
- Record contradiction edges and prohibited universalizations.
- Do not design a combined ontology yet.

### Stage C — Genre corpus coding

- Freeze the sample manifest before interpreting frequency.
- Double-code a calibration subset and reconcile the coding guide.
- Code divine sense, methods, domains, and tribulations at passage level.
- Publish counts with denominators, missing chapters, and selection bias.

### Stage D — Bounded synthesis

- Separate supported vocabulary, sampled convention, source-local mechanic, disputed claim, and original design opportunity.
- Produce multiple candidate abstractions rather than one merged “authentic” system.
- Produce `DESIGN-BRIDGE-v0.1` only for design-bearing syntheses; source-neutral designs may proceed using typed unknown placeholders and no unsupported cultural claim.
- State which questions remain unknown.

### Stage E — Originality and cultural adversarial review

- Run the red-team tests.
- Route every culturally material synthesis back to the relevant track reviewers.
- Reject designs that require stereotypes, false history, fabricated translations, or source-signature dependence.

### Stage F — User decision preparation

- Present tradeoffs, not a recommendation disguised as inevitability.
- Show what each choice enables, excludes, risks, and leaves unknown.
- Include “select none / research further.”
- No candidate is promoted by silence, popularity, corpus count, or reviewer majority alone.
- Publish each dependency-complete tranche with explicit blocked/unblocked consumers. A failed unrelated track does not withhold a passed dossier.

---

## 10. Review roles and independence

At minimum, the gate requires distinct review responsibility for:

- source-language and translation accuracy;
- history of Chinese religions/philosophies;
- modern Chinese genre and platform context;
- contemporary cultural sensitivity and living-practice scope;
- identity, death, disability, gender/body, and medical-safety implications;
- originality/IP red-team;
- gameplay/system abstraction; and
- Research Graph provenance and release consistency.

One person may hold more than one role only when the overlap and conflict risk are disclosed. Synthesis authors do not close their own S1 findings.

---

## 11. Starting source queue and limitations

The current foundation provides a discovery queue, not a closed canon bibliography:

- identified passages and critical-edition work for the *Daodejing*, *Neiye*, *Zhuangzi*, medical channel texts, alchemical sources, and later manuals;
- specialist reference work on Daoism, religious Daoism, Chinese metaphysics, heart-mind, inner alchemy, body history, and modern genre formation;
- licensed modern-fiction passages already used to audit local Er Gen mechanics;
- translator notes that identify translation differences without converting them into authorial cosmology; and
- modern xianxia/game scholarship used as a map to a larger licensed corpus.

Known limitations remain blocking for strong universal claims: English-language scholarship bias, insufficient Chinese- and other-language specialist coverage, no finished licensed convention corpus, male-default/body bias, incomplete Buddhist/Confucian/local-religion/minority/frontier coverage, edition gaps, and no standing cultural review panel.

---

## 12. Exact acceptance gates

Each bounded tranche passes only when every gate it consumes is evidenced in the audit. “Substantially complete” is not a pass for that tranche. The overall phase index may publish a mixture of `PASS`, `DEFERRED_UNKNOWN`, `REJECTED`, and still-active tranches; an unresolved track blocks only its declared consumers.

### 12.1 Source and claim gate

- 100% of substantive cultural, historical, religious, linguistic, living-practice, and sampled-genre claims consumed by the tranche have versioned claim cards.
- 100% of consumed cards identify source class, exact location, scope, inference distance, support/non-support, access status, and reviewer.
- Every historical semantic claim meets section 5.3 or is explicitly downgraded to an open hypothesis.
- Every direct quotation has edition/translator attribution and remains within copyright limits.
- Contradictions, inaccessible evidence, and negative findings are present in the graph.

### 12.2 Translation and terminology gate

- All Hanzi and tonal pinyin used in research records are checked by a qualified source-language reviewer.
- No project-native English concept has fabricated Hanzi.
- No exact translation equivalence is asserted without the section 5.3 threshold.
- The seasoned-English register and first-use gloss rules pass a terminology audit.
- Qi, Dao, *xin*, *shen*, *jing*, *xing*, *ming*, soul, personhood, karma, fate, mandate, law, and reputation remain distinct unless a bounded source claim explicitly relates them.

### 12.3 Corpus gate

- The frozen manifest records all inclusion/exclusion criteria and missing-access bias.
- Every “established term in the sample,” “sampled convention,” and comparative mechanic-family claim meets its sample-coverage threshold and uses no unsupported population-prevalence language.
- High-risk fields are 100% independently double-reviewed. Other fields meet their preregistered agreement floor; any failed field is fully recoded after codebook repair. Agreement, dependence collapse and adjudicated disagreements are published.
- No author, translator, publisher/platform, or series supplies more than 25% of the evidence for a cross-genre claim.
- Counterexamples and meaningful absences are coded, not discarded.

### 12.4 Cultural separation gate

- Every required track has a memorandum or an explicit recorded deferral that prevents dependent claims from advancing.
- Every cross-track synthesis names its source tracks, relation type, disagreement, and non-generalization boundary.
- No historical or living tradition is presented as proof of supernatural mechanics.
- Medical/body material is non-actionable and reviewed for safety, disability, gender, age, and reproductive assumptions.

### 12.5 Originality gate

- Every candidate has a source/inspiration ledger and passes all ten red-team tests, including matched controls and the preregistered evidence-bearing reverse-identification threshold.
- Zero copied prose, protected characters/settings, or source-distinctive named mechanics enter the candidate set.
- No candidate depends on one source for its name, operation graph, progression, and narrative role in combination.
- Blinded controlled reverse-identification does not exceed the preregistered matched-control threshold with a concrete distinctive fingerprint; unsupported repeated guesses do not trigger redesign.
- Procedural primitives and combination rules are cleared independently, including expansion tests.

### 12.6 Design-status gate

- Every output is labeled evidence, interpretation, sampled convention, original proposal, disputed, unknown, rejected, or user-ratified.
- No realm ladder, cosmology, soul model, tribulation ontology, protagonist advantage, domain system, or qi ontology is silently selected.
- Every design-bearing synthesis has a complete `DESIGN-BRIDGE-v0.1`; vocabulary-only/research-only results are labeled nonmechanical.
- Candidate dossiers for every fork frozen in `PhaseScopeManifest-v0.1` contain at least two materially distinct choices plus “defer / none.” Newly discovered forks remain deferred to a later revision.
- Zero open S0/S1 findings remain after independent cultural, source, originality, gameplay, and graph-consistency re-audits.
- No code, scaffold, implementation dependency, or production authorization is created by this phase.

---

## 13. Stop conditions

Pause synthesis and return to research when:

- a key term cannot be disambiguated at the needed scope;
- a licensed translation conflicts materially with the source-language reading;
- a living-culture claim lacks an appropriately scoped source or reviewer;
- a proposed mechanic depends on a fan taxonomy or one author's cosmology;
- cultural tracks disagree in a way the candidate would erase;
- the originality red-team repeatedly identifies one source;
- required corpus access cannot be obtained lawfully; or
- the user-facing decision would be false because all options smuggle in the same unexamined ontology.

Any track also stops at its source/hour/reviewer ceiling or third failed repair cycle. Its exact disposition becomes `DEFERRED_UNKNOWN` when evidence/access is insufficient or `REJECTED` when a tested claim/candidate fails; the default is never unbounded further research.

The correct output at a stop condition is a bounded unknown, revised acquisition plan, or rejected candidate—not invented certainty.

---

## 14. Handoff to the following phase

If and only if the relevant dependency tranche passes its consumed section-12 gates, the project may prepare the corresponding non-canon candidate package. Other tracks may remain deferred or active. Possible handoffs include:

1. semantic technique grammar and intent controls;
2. perception, divine sense, concealment, and evidence;
3. world patterns, *fa*/methods, Daos/paths, domains, and cross-realm contests;
4. identity/death/reincarnation decision options;
5. tribulation, Heaven, fate/karma, office, and world-pattern options; and
6. original realm-ladder architecture research.

That handoff still does not authorize lore or code. World-defining selections remain with the user and must enter canon through a separate, versioned decision.
