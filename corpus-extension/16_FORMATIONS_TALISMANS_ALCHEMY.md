# 16 — Formations, Talismans, and Alchemy (陣法 · 符籙 · 煉丹)

**Status:** Candidate canon. Specifies the three inscription/refinement crafts as systems, not flavor. Honors the qi model (yin-yang polarity, five phases) and the determinism contract (same inputs → same outputs).
**Date:** 2026-08-03
**Authority:** This document is governed by `00_FOUNDATIONAL_DECISIONS.md` (§1 cosmology, §2 soul model, §3 realm ladder, §6 operational status of yin-yang and wuxing) and the per-station specifications of `03_REALM_LADDER.md`. If a later document contradicts a decision here, the contradiction is a defect to be repaired, not a fork to be deferred.

---
**Truth level:** Canonical invariant (formations, talismans, alchemy)
**Implements:** engine-architecture/51_MULTIVERSE_GROUND_TRUTH_ARCHITECTURE.md, corpus-extension/50_GROUND_TRUTH_SYSTEM_SPECIFICATION.md
**Implementation status:** [SPEC] — fully specified, implementation in progress

---

## Ground-Truth Annotation

> [CANON] Formations are geometric qi-circuits with explicit node/edge topology. Talismans are single-use qi-storage items. Alchemy follows the recipe-constraint model.

> [DERIVED] All measurements in this document use SI units (doc 52). Visual concepts follow the VTP schema (doc 51). Moving entities follow MotionProfiles (doc 55).

> [PROC] Instance-level details (exact NPC counts, specific tree placements, weather sequences) vary by seed within canonically-defined ranges.

> [UNRESOLVED] See /questions/ registry for open questions related to this document.

**Topic:** Formation, talisman, and alchemy systems

---



## 0. How to read this document

The three crafts — formations (陣法), talismans (符籙), and alchemy (煉丹) — are presented as **systems**, not as flavor. Each craft has:

1. **Essence** — what the craft *is* in the world.
2. **Inputs** — the lawful, enumerable materials and conditions the craft consumes.
3. **Process** — the discrete steps the craft performs on those inputs, in order, with their own qi-lawful sub-rules.
4. **Outputs** — the lawful, enumerable results the craft produces, with the conditions that select between them.
5. **Failure modes** — the specific, named ways the craft produces a worse or wrong output, each with its own cause and remedy.
6. **Realm requirements** — what station of the ten-station ladder is required to perform each operation of the craft, and what each new station adds.

This is the doctrine's "build the engine, not just the brake" made concrete: every forbidding rule (you cannot inscribe a killing array at Qi Condensation) is paired with the positive capability it unlocks at the proper station (you can inscribe a killing array at Foundation Establishment, with these inputs, by this process, producing this output, with these failure modes).

**Terminology rule.** This document uses English xianxia vocabulary as the primary term and Hanzi (Traditional) in parentheses on first use where the term is genre-load-bearing. No pinyin romanization with tone marks is used; this is a deliberate deviation from earlier corpus documents and is ratifiable here.

---

## 1. Doctrine shared by the three crafts

### 1.1 What the three crafts have in common

All three crafts are **inscription arts** — the practice of persisting a qi-structure in a medium (space, paper, jade, a furnace's contents) so that the structure produces a lawful effect when activated. The difference between them is the medium, the persistence, and the cost:

- A **formation** inscribes qi-lines in space. It is fixed, persistent (drawing ambient qi to sustain itself), and high-power.
- A **talisman** inscribes qi-patterns on a portable medium. It is portable, single-use, and lower-power.
- An **alchemy** refines medicinal substances into a pill. It is consumed, single-use, and acts on the cultivator's body and qi-system directly.

All three are bound by the same two contracts.

### 1.2 The qi model contract

Every inscription carries a **phase-affinity** (one of Wood 木, Fire 火, Earth 土, Metal 金, Water 水) and a **yin-yang signature** (a vector along cold/hot, dark/light, still/moving, internal/external, condensing/dispersing). Phase interactions resolve by the two standard cycles:

- **Generation cycle (相生):** Wood feeds Fire; Fire makes Earth (ash); Earth bears Metal (ore); Metal channels Water (condensation); Water nourishes Wood.
- **Conquest cycle (相剋):** Wood parts Earth (roots); Earth dams Water; Water quenches Fire; Fire melts Metal; Metal chops Wood.

A craft step succeeds when the inputs' phase-affinities resolve to the inscription's intended phase, and the yin-yang signatures resolve to a coherent vector. A craft step fails or degrades when the inputs conflict — a Fire-phase inscription on a Water-phase medium, a Metal-phase herb combined with a Wood-phase herb in a pill whose intent is Fire. The generator must resolve these interactions lawfully: every inscription step has a deterministic phase-resolution function.

### 1.3 The determinism contract

**Same inputs, same process, same output.** This is the project's foundational contract (per `00_FOUNDATIONAL_DECISIONS.md` §0 and the prior corpus's `DETERMINISM-v0.1`). It applies to the three crafts as follows:

- A formation inscribed by a Foundation Establishment cultivator using jade nodes of given quality, in a region of given qi-climate, with given qi-line precision, produces a specific formation with specific properties — every time.
- A talisman inscribed with given ink, on given medium, with given patterns, by a cultivator of given realm, produces a specific talisman — every time.
- A pill refined from given ingredients, with given fire control, in a given furnace, by an alchemist of given realm, produces a specific pill — every time.

This means the crafts are **reproducible**. A recipe, a diagram, a formation layout — once known and once executed correctly — produces the same result. The craft's randomness lives in the *inputs* (the ingredients vary, the medium varies, the alchemist's heart-mind varies), not in the *process*. The doctrine's "An isomorphic NPC with the same advantage must produce the same result" oracle applies: a cultivator and an isomorphic NPC, given the same inputs, produce the same craft output.

This is the engine of the cultivation economy. Reproducibility is what makes a recipe worth a thousand spirit stones. Reproducibility is what lets an alchemist sell a pill and a talisman artist sell a stack of fireball talismans. Reproducibility is what makes a sect's formation library an asset that can be inherited, stolen, traded, and lost.

### 1.4 The central tension, named

The genre wants the crafts to be **power multipliers**: a single pill lets a Qi Condensation cultivator punch at Foundation Establishment weight for an hour; a single talisman lets a mortal fire a fireball; a single formation lets a sect defend against an army. The doctrine forbids power acceleration that trivializes the realm ladder.

This document resolves the tension by **price**, not by denial. The three crafts can produce effects above the user's realm envelope, but:

- The craft requires an inscriber of higher realm than the user. (A Qi Condensation cultivator can *use* a Foundation Establishment talisman; they cannot *make* one.)
- The craft's inputs are scarce and specific. (Breakthrough pills require herbs that grow in one grotto-heaven, harvested at one solar term.)
- The craft's failure modes are real and lawful. (A misfired talisman injures the user; a failed pill poisons the consumer; a corrupted formation turns on its inscriber.)
- The craft's higher-realm effects are gated by higher-realm inscription. (A Qi Condensation cultivator cannot use a transformation pill — their body cannot receive the effect; the pill is wasted or harmful.)

The player gets the fantasy of power multiplication, but pays for it in scarcity, risk, and dependence on higher-realm crafters. This is the genre's "the young master has a treasury of pills and talismans" trope, made mechanically honest.

---

## 2. Formations (陣法)

### 2.1 What a formation is

A formation is a **persistent qi-structure inscribed in space** that produces a lawful effect within a bounded area. The formation is not the qi-lines the inscriber traces; those are the *inscription*. The formation is the *standing structure* that the inscription produces — a self-sustaining qi-pattern that draws ambient qi from the local environment to maintain itself, and that produces its effect when triggered (continuously, for a ward; on intrusion, for a killing array; on activation, for a transport gate).

A formation is to qi what a water-mill is to a river: a structure placed in a flow that converts the flow's energy into a specific output. Remove the flow (drain the ambient qi), and the formation stops. Remove the structure (disrupt a node), and the formation collapses. The formation is lawful, deterministic, and bounded.

### 2.2 Components

Every formation has four components. The generator must produce and track all four.

1. **Nodes (陣眼, "array eyes").** The anchor points of the formation. A node is a physical object placed at a specific point in space, invested with a specific phase-affinity and yin-yang signature by the inscriber. Node material matters: a stone node holds a faint, slow-bleeding signature; a jade node holds a clean, enduring signature; a node anchored to a spirit vein (靈脈) draws directly on the vein's qi and is effectively inexhaustible for the formation's purpose. A formation's node count is determined by its type and complexity — a simple ward may have three nodes; a siege array may have thirty-six.

2. **Lines (陣紋, "array lines").** The qi-channels between nodes, traced by the inscriber. A line is not a physical mark (though inscribers often mark the path for their own reference); it is a sustained qi-current that flows from one node to the next along a path the inscriber has fixed. Line precision matters: a line that wavers, crosses another line unintentionally, or terminates short of its target node produces a flawed formation. Precision is a function of the inscriber's realm, their concentration during inscription, and their tooling (a tracing stylus helps; bare-hand tracing is error-prone).

3. **The core (陣心, "array heart").** The formation's logic center — the node (or sub-pattern of nodes) that defines the formation's *effect*. The core is where the formation's intent is encoded: "ward this boundary," "kill whatever enters," "gather qi to this point." The core's complexity determines the formation's tier (simple, complex, domain-level). A core is not just a node; it is a pattern — a small sub-formation within the larger formation, whose qi-structure specifies the effect.

4. **The boundary (陣界, "array boundary").** The area of effect — the volume within which the formation's effect holds. The boundary is determined by the nodes' placement: the formation's effect fills the volume bounded by the outermost nodes. A boundary is permeable to some qi-phase flows and impermeable to others, depending on the formation's design. A ward's boundary keeps out hostile qi; a gathering formation's boundary admits ambient qi but concentrates it.

### 2.3 The inscription process

The formation inscription process has six discrete steps. Each step is qi-lawful and deterministic given its inputs.

1. **Survey.** The inscriber examines the proposed site: its qi-climate (phase-affinity, yin-yang signature, density, flow), its geomorphology (spirit veins, dead zones, contaminated ground), and its compatibility with the intended formation. A Fire-phase ward array inscribed in a Water-phase swamp will attenuate or fail; the survey reveals this before inscription begins. Survey is a perception verb available at Qi Condensation (qi-quality perception) and deepened at Foundation Establishment (environmental qi-flow perception).

2. **Node placement.** The inscriber sets the nodes at the surveyed positions, orienting each node's phase-affinity to its role in the formation. Each node is a prepared object (a carved jade plate, a polished river stone, a forged metal disk) that the inscriber has already invested with a specific phase and signature. Node placement is physical labor: the nodes must be set precisely, often to within a finger's breadth.

3. **Line tracing.** The inscriber traces the qi-lines between nodes, in the order specified by the formation's design. This is the inscription proper: the inscriber circulates their own qi through their meridians, projects it along the intended line, and fixes it in place by sustained concentration. Each line must be traced in a single continuous act; interruption produces a flawed line. Line tracing is exhausting — a Foundation Establishment inscriber can sustain tracing for perhaps an hour before their reservoir requires rest.

4. **Core investment.** The inscriber invests qi into the core, encoding the formation's intent. This is the most delicate step: the core's pattern must be inscribed exactly, and the intent must be coherent (a "ward" intent with a "kill" sub-pattern produces a corrupted formation). Core investment is the step where the inscriber's realm most directly limits the formation: a Qi Condensation inscriber cannot invest a coherent core (their qi is too diffuse); a Foundation Establishment inscriber can invest a simple core; a Core Formation inscriber can invest a complex core; a Nascent Soul inscriber can invest a core that persists after their death; a Spirit Severing inscriber can invest a domain-level core.

5. **Activation.** The inscriber activates the formation by infusing a final pulse of qi into the boundary. The formation "catches": the qi-lines begin to circulate, the core's intent takes hold, and the formation begins drawing ambient qi to sustain itself. Activation is the moment of truth — a flawed formation often reveals itself here, when the lines conflict or the core's intent is incoherent. A botched activation can produce a backlash that injures the inscriber.

6. **Persistence.** Once activated, the formation persists — drawing ambient qi from the local environment to sustain its qi-lines and core. A well-inscribed formation in a qi-rich environment can persist for decades or centuries without intervention. A poorly-inscribed formation, or one in a qi-poor environment, fades over weeks or months. Persistence can be renewed by a later inscriber of equal or higher realm re-investing the core.

### 2.4 Formation types

Formations are classified by their effect. The four major classes:

- **Defensive (守陣).** Wards (拒外 — exclude hostile qi or beings), shields (護體 — protect those within from physical or qi attack), barriers (隔界 — seal a boundary against transit). Defensive formations are the most common, the simplest, and the foundation of a sect's perimeter defense. A three-node ward is the typical first formation a Foundation Establishment inscriber learns.

- **Offensive (攻陣).** Killing arrays (殺陣 — destroy intruders), traps (陷陣 — capture or immobilize), siege arrays (攻城 — breach a defended position). Offensive formations areqi-costly to inscribe (their cores encode harm, which requires a sharper intent) and qi-costly to sustain (they consume ambient qi faster than defensive formations, because their effect is more energetic). A killing array in a qi-poor environment fades in days.

- **Utility (用陣).** Gathering arrays (聚靈 — concentrate ambient qi for cultivation), concealing arrays (隱形 — hide a place from perception), space-locking arrays (鎖空 — prevent spatial transit within the boundary). Utility formations are the most varied class: each utility formation is its own design, with its own inputs and process. A gathering array is the most common utility formation and the most economically important — a sect's cultivation chambers are gathering-array-equipped, and the difference between a good gathering array and a poor one is the difference between a Qi Condensation breakthrough in three years and in thirty.

- **Transport (運陣).** Gates (門陣 — link two inscribed locations for direct transit), teleport arrays (傳送 — move beings or matter within the formation's boundary to a prepared receiving array). Transport formations are the most complex formations a Core Formation inscriber can produce; their cores encode spatial relations, which require a deeper law-perception than effect-formations. A gate between two locations requires a paired inscription at both ends; the pair must be inscribed by the same inscriber (or by inscribers who have synchronized their core-intent), and the pair must be maintained in parallel.

### 2.5 Formation quality

A formation's quality — the strength, persistence, and reliability of its effect — is determined by five factors. Each is a lawful input to the quality function.

1. **Inscriber's realm.** Higher realm = sharper qi, denser intent, finer line precision. A Foundation Establishment inscriber's formation is to a Core Formation inscriber's formation as a villager's brushwork is to a court calligrapher's.

2. **Line precision.** The accuracy with which the qi-lines are traced. Precision is reduced by fatigue, distraction, inadequate tools, and adverse qi-climate (tracing a Fire-phase line in a high-wind Water-phase environment is harder than in still air).

3. **Node quality.** The material and preparation of the nodes. A river-stone node holds a faint signature and bleeds qi over months; a jade node holds a clean signature for decades; a spirit-vein-anchored node draws on the vein and is effectively permanent. Node quality is the single largest determinant of formation persistence.

4. **Compatibility with local qi-climate.** A formation whose phase and signature match the local qi-climate persists easily (the ambient qi sustains it). A formation whose phase conflicts with the local qi-climate must be sustained by the inscriber's reservoir — which is unsustainable for long. This is why sects are sited on spirit veins: the vein's qi-climate is dense, coherent, and compatible with a wide range of formations.

5. **Core coherence.** The coherence of the core's encoded intent. A core whose intent is muddled (the inscriber was uncertain, or the formation's design combines incompatible sub-intents) produces a formation that misfires or produces a degraded effect. Core coherence is the most directly inscriber-dependent factor: it is the inscriber's qi-discipline at the moment of investment.

### 2.6 Failure modes

A formation can fail in five named ways. Each is lawful, predictable, and has a remedy.

1. **Disrupted nodes (破眼).** A node is destroyed, moved, or contaminated. The formation's qi-structure collapses at the disruption point; the effect fails or, worse, the un-routed qi bleeds into the environment unpredictably. A warded sect whose perimeter node is shattered by a siege weapon does not merely lose the ward — the un-routed qi can scourge the sect's grounds. Remedy: re-inscribe the disrupted node and re-activate the formation (requires an inscriber of equal or higher realm than the original).

2. **Conflicting lines (亂紋).** Two or more qi-lines cross or interfere unintentionally, producing a corrupted effect. A ward with conflicting lines may admit what it should exclude, or exclude what it should admit, or produce a flickering effect that fails under load. Remedy: identify and re-trace the conflicting lines (a perception-intensive diagnostic; the inscriber must read the formation's qi-structure and locate the conflict).

3. **Insufficient ambient qi (氣竭).** The formation draws more ambient qi than the local environment can supply; the qi-lines thin and the effect fades. A gathering array inscribed in a qi-poor region fades in days. Remedy: relocate the formation, supplement the ambient qi (a higher-realm cultivator can sustain it temporarily), or accept the fade and re-inscribe elsewhere.

4. **Contamination (污陣).** The formation's effect is corrupted by external qi — a hostile cultivator injects a conflicting phase into a node, or a contaminated ambient qi-source bleeds into the lines. A ward contaminated by grief-residue (e.g., inscribed near a recent murder scene) may begin to admit the dead's bardo-traces. Remedy: cleanse the formation (a purification rite by a Core Formation or higher cultivator) or dismantle and re-inscribe elsewhere.

5. **Core collapse (心潰).** The core's encoded intent destabilizes — typically because the inscriber's realm was inadequate for the formation's complexity, or because the core's intent was incoherent from the start. A core collapse is catastrophic: the formation's qi-lines discharge their stored qi in an uncontrolled burst, often killing the inscriber and anyone nearby. This is the formation-craft's equivalent of a Core Formation cultivator's cracked core. Remedy: none, in the moment; prevention is the only remedy. A prudent inscriber tests a complex formation's core coherence with a lesser version before investing the full intent.

### 2.7 Realm requirements

The formation craft's realm gating, per the ten-station ladder:

- **Qi Condensation (凝气).** Can *power* a formation (infuse qi into an existing formation's core to sustain or activate it) but cannot *inscribe* one. A Qi Condensation cultivator's qi is too diffuse to fix a sustained line.
- **Foundation Establishment (筑基).** Can inscribe **simple formations**: three-to-nine-node wards, basic gathering arrays, simple traps. Cannot inscribe complex cores (killing arrays with conditional logic, transport gates). Lifespan of ~200 years means a Foundation Establishment inscriber's formations persist within their lifetime but rarely outlive them.
- **Core Formation (金丹).** Can inscribe **complex formations**: killing arrays with conditional logic, space-locking arrays, transport gates, siege arrays. A Core Formation inscriber's formations are qi-stable enough to persist for centuries.
- **Nascent Soul (元婴).** Can inscribe formations that **persist after the inscriber's death** — the inscriber's core-investment is dense enough to sustain itself without the inscriber's continued attention. This is the threshold at which a sect's ancestral formations become possible: the founder inscribes the sect's perimeter ward at Nascent Soul, and the ward persists for centuries after the founder's death.
- **Spirit Severing (化神).** Formations are **domain-level** — the inscriber's will is partially authoritative within their domain, and a Spirit Severing inscriber's formation is effectively a fixed expression of that will. A Spirit Severing cultivator's ward is not merely a qi-structure; it is the cultivator's law made spatial. These formations cannot be dismantled by lower-realm cultivators.

### 2.8 The engine: what formations unlock for the player

Formations give the player the verb **to fortify a place**. A cultivator with formation skill can turn a cave into a defended sanctuary, a clearing into a cultivation chamber, a village into a warded refuge. This is the engine of the genre's "the young master retreats to his sect's spirit-gathering array" trope: the formation is the *place* the cultivator returns to, and the place is part of the cultivator's power.

For the player at Qi Condensation–Foundation Establishment, formations are the first craft they encounter as *users* (their sect's perimeter ward, their cultivation chamber's gathering array). At Foundation Establishment, they become *inscribers* of simple formations — and the first time they successfully inscribe a three-node ward in their own chamber is the first time the world feels like *theirs*.

---

## 3. Talismans (符籙)

### 3.1 What a talisman is

A talisman is a **single-use qi-structure inscribed on a portable medium** (paper, jade, wood, bone, silk, metal leaf) that produces an effect when activated. The talisman's inscription is a pattern — a qi-conductive ink or material laid down in specific shapes that encode the effect. The pattern is dormant until activated; on activation (by infusing qi into the medium), the pattern discharges its encoded effect in a single burst, and the talisman is consumed.

### 3.2 The difference from formations

Talismans and formations are sibling inscription arts. The differences:

| Property | Formation (陣法) | Talisman (符籙) |
|---|---|---|
| Medium | Space itself | Portable object (paper, jade, etc.) |
| Persistence | Persistent (draws ambient qi) | Dormant until activation |
| Use | Continuous or triggered | Single-use |
| Power | High (sustained by ambient qi) | Low (powered by the user's qi at activation) |
| Inscriber realm | Foundation Establishment minimum | Qi Condensation minimum |
| Inscription time | Hours to days | Minutes to hours |
| Cost | Node materials, inscription labor | Medium, ink, inscription labor |

A talisman is the *portable, expendable* version of a formation. A talisman cannot match a formation's power (the formation draws ambient qi; the talisman is powered only by the user's infusion), but it can be carried in a sleeve and used anywhere. A cultivator with a stack of fireball talismans is, in effect, carrying a small offensive formation in their pocket.

### 3.3 The inscription process

The talisman inscription process has five discrete steps.

1. **Medium preparation.** The inscriber prepares the medium — typically a square of yellow paper (黃紙, the standard qi-conductive paper, treated with alum and beeswax), but also jade slips (for high-quality talismans), wooden tablets (for durable talismans), bone plaques (for necromantic talismans), or metal leaves (for elemental talismans). The medium must be qi-clean (no residual signature) and phase-compatible with the intended effect. Paper is the most versatile medium; jade is the most enduring (a jade talisman can be re-charged, where a paper talisman cannot).

2. **Ink preparation.** The inscriber prepares (or selects) the ink — typically cinnabar ink (硃砂, mercuric sulfide, the standard qi-conductive ink, naturally Fire-phase and yang), but also iron-gall ink (Metal-phase), pine-soot ink (Water-phase, yin), or proprietary blends for specific effects. The ink's phase-affinity must be compatible with the talisman's intended effect: a fireball talisman uses cinnabar ink; an ice-arrow talisman uses pine-soot ink.

3. **Pattern inscription.** The inscriber inscribes the qi-pattern onto the medium, using a brush (or stylus, for jade and metal) charged with the prepared ink. The pattern is a specific arrangement of strokes — typically a central sigil (the effect's "name") surrounded by ancillary runes (the effect's parameters: range, duration, target, intensity). The pattern must be inscribed in a single continuous act, with sustained concentration; interruption produces a flawed talisman. The inscriber's qi flows through the brush into the ink, binding the pattern to the medium.

4. **Sealing.** The inscriber seals the pattern by infusing a final pulse of qi into the medium, fixing the pattern in its dormant state. A sealed talisman can be carried, stored, traded, sold — the pattern persists until activated. Sealing is the step where the inscriber's realm most directly limits the talisman: a Qi Condensation inscriber's seal fades over months; a Foundation Establishment inscriber's seal persists for years; a Core Formation inscriber's seal can carry a fragment of the inscriber's intent (a semi-autonomous talisman that adjusts its effect to the situation — see §3.7).

5. **Activation.** The user (not necessarily the inscriber) activates the talisman by infusing their own qi into the medium. The user's qi must be phase-compatible with the talisman's pattern — a Wood-phase cultivator activating a Metal-phase talisman produces a degraded or misfired effect (the conquest cycle quenches the pattern). On successful activation, the pattern discharges its encoded effect in a single burst, and the talisman is consumed (the medium is destroyed or, for jade, drained and blank).

### 3.4 Talisman types

Talismans are classified by their effect. The four major classes:

- **Attack (攻擊符).** Fireball (火球符), sword-qi (劍氣符), lightning (雷符), ice-arrow (冰箭符), and so on. Attack talismans are the cultivator's ranged weapon; a stack of attack talismans effectively grants a Qi Condensation cultivator ranged capability they would not otherwise have. Attack talismans are typically Fire-phase or Metal-phase; the choice of phase is the choice of damage type.

- **Defense (防禦符).** Shield (盾符), ward (護符), barrier (隔符). Defense talismans produce a temporary protective effect — a shield talisman creates a brief qi-barrier around the user; a ward talisman creates a brief warded volume; a barrier talisman seals a doorway or gap. Defense talismans are typically Earth-phase or Metal-phase (Earth stabilizes; Metal cuts incoming qi).

- **Utility (雜符).** Light (光符 — produces sustained illumination), communication (傳音符 — carries a message over distance), storage (儲物符 — a small spatial pocket, the precursor to a storage ring), detection (探符 — senses qi or beings in a brief radius). Utility talismans are the most varied class and the most economically important for ordinary cultivators. A light talisman is the first talisman a Qi Condensation inscriber learns; a communication talisman is the foundation of long-distance coordination in the cultivation world.

- **Summoning (召符).** Calls a bound spirit or beast to the user's location. Summoning talismans are the most demanding talisman class — the pattern must encode not only the effect (summon) but the *target* (the specific bound being). A summoning talisman is useless without a prior binding contract between the summoner and the summoned. Summoning talismans are typically Core Formation or higher inscriptions; the binding contract is a separate, more demanding art.

### 3.5 Talisman quality

A talisman's quality — the strength, reliability, and precision of its effect — is determined by four factors.

1. **Inscriber's realm.** Higher realm = denser qi-binding to the medium, sharper pattern precision, longer seal persistence. A Qi Condensation inscriber's talisman is to a Foundation Establishment inscriber's as a child's crayon drawing is to a master calligrapher's scroll.

2. **Medium quality.** The material and preparation of the medium. Paper is the baseline; high-quality talisman paper (treated with specific alchemical agents, woven from specific fibers) holds a pattern more cleanly. Jade is the premium medium — a jade talisman can be re-charged (a paper talisman cannot), and a jade talisman's pattern persists for decades.

3. **Ink quality.** The material and preparation of the ink. Pure cinnabar ink is the baseline; refined cinnabar (purified of impurities, ground to specific fineness, blended with specific binders) holds a sharper pattern. Proprietary inks (sect secrets, alchemist-prepared blends) can produce effects beyond the standard.

4. **Pattern precision.** The accuracy with which the pattern is inscribed. A pattern that wavers, smears, or terminates short produces a flawed talisman. Pattern precision is the most directly inscriber-dependent factor — it is the inscriber's brush discipline at the moment of inscription.

### 3.6 Failure modes

A talisman can fail in four named ways.

1. **Flawed pattern (敗符).** The pattern was inscribed imprecisely, and the talisman misfires or produces a weaker effect. A flawed fireball talisman may produce a spark instead of a fireball, or may detonate at the user's hand instead of at the target. A flawed talisman is not always detectable by inspection; the flaw may only manifest on activation. Remedy: discard the flawed talisman (using it is dangerous) and re-inscribe.

2. **Degraded medium (耗符).** The medium has lost charge over time — a paper talisman stored for years in a damp environment may have leached its ink's qi-binding, producing a weakened or non-functional talisman. Remedy: store talismans properly (dry, qi-clean, away from conflicting phase-sources); re-inscribe old talismans whose medium has degraded.

3. **Incompatible activation (逆符).** The user's qi-phase does not match the talisman's pattern — a Wood-phase cultivator activating a Metal-phase talisman (conquest cycle) produces a degraded or backfiring effect. The activation's qi is quenched or reversed by the phase conflict. Remedy: match the talisman's phase to the user's phase; or have a compatible cultivator activate the talisman; or use a phase-bridge talisman (a rare, high-quality talisman that adapts its phase to the user's).

4. **Seal collapse (潰符).** The talisman's seal collapses — typically because the inscriber's realm was inadequate for the talisman's complexity, or because the seal was disrupted by external qi during storage. A seal collapse is the talisman-craft's equivalent of a formation's core collapse: the pattern discharges its encoded effect uncontrollably, often damaging the storage location and injuring anyone nearby. A stack of fireball talismans whose seals collapse simultaneously is, in effect, a small bomb. Remedy: none, in the moment; prevention is the only remedy. Store talismans in warded containers; do not stockpile high-tier talismans without adequate storage.

### 3.7 Realm requirements

The talisman craft's realm gating:

- **Qi Condensation (凝气).** Can inscribe **simple talismans**: light talismans, basic attack talismans (fireball, ice-arrow), basic shield talismans. Cannot inscribe complex patterns (communication, detection, summoning). A Qi Condensation inscriber's talismans are low-power and short-lived (seal persists for months).
- **Foundation Establishment (筑基).** Can inscribe **complex talismans**: communication, detection, storage, conditional attack talismans (a sword-qi talisman that activates only on contact with hostile qi). A Foundation Establishment inscriber's talismans are mid-power and durable (seal persists for years).
- **Core Formation (金丹).** Can inscribe talismans that **carry a fragment of the inscriber's intent** — semi-autonomous talismans that adjust their effect to the situation. A Core Formation inscriber's fireball talisman may, on activation, choose its target within a small radius rather than discharging in a fixed direction. This is the threshold at which talismans become quasi-agents rather than mere tools. (The inscriber's intent-fragment is not a spirit; it is a patterned response, like a prepared reflex. It is not alive. A cultivator who confuses intent-fragment with spirit courts 心魔.)
- **Nascent Soul+ (元婴以上).** Can inscribe talismans that operate beyond the user's presence — long-range communication talismans, semi-permanent wards, talismans that activate on a trigger condition the inscriber specifies. These talismans are the foundation of high-realm coordination and sect treasuries.

### 3.8 The engine: what talismans unlock for the player

Talismans give the player the verb **to carry prepared capability**. A cultivator with a stack of talismans can face situations their bare cultivation could not — a Qi Condensation cultivator with a Foundation Establishment shield talisman can survive one hit from a Core Formation cultivator (and then flee). This is the engine of the genre's "the young master has a hundred talismans up his sleeve" trope: talismans are the *reserve* the cultivator carries.

For the player at Qi Condensation, talismans are the first craft they encounter as *makers* — the light talisman is a Qi Condensation inscription, and the first time the player inscribes one and uses it to light their own chamber is the first time the world's hidden grammar becomes *writable*.

---

## 4. Alchemy (煉丹)

### 4.1 What alchemy is

Alchemy is the **refinement of medicinal substances** (herbs, minerals, beast parts, and rarer materials) into pills (丹), powders (散), or elixirs (液) that produce cultivation-enhancing effects when consumed. The alchemist's art is the controlled transformation of raw qi-bearing materials into a coherent, concentrated medicinal product — a transformation governed by the same qi-model (phase-affinity, yin-yang signature) and the same determinism contract (same ingredients, same fire control, same furnace, same alchemist → same pill) as the other two crafts.

Alchemy is the most economically central of the three crafts. Formations and talismans are tools; pills are *consumables that change the cultivator's body and qi-system directly*. A breakthrough pill is the difference between a Qi Condensation cultivator who breaks through to Foundation Establishment in five years and one who breaks through in fifty, or never. A healing pill is the difference between a cultivator who survives a sword cut to the torso and one who does not. The alchemist is the cultivation world's pharmacist and arms dealer combined.

### 4.2 The process

The alchemical process has six discrete steps.

1. **Gathering ingredients (採藥).** The alchemist gathers (or commissions, or purchases) the ingredients for the intended pill. Each ingredient has a **phase-affinity** (Wood, Fire, Earth, Metal, Water) and a **potency** (a measure of the ingredient's qi-density and purity). Ingredient quality is the largest single determinant of pill quality — a Spirit-Gathering Pill made from hundred-year ginseng is qualitatively different from one made from ten-year ginseng. Ingredients are gathered at specific solar terms (the 二十四節氣 calendar), because an ingredient's phase-affinity and potency vary with the season: a Fire-phase herb gathered at Summer Solstice (夏至, peak yang) is more potent than the same herb gathered at Winter Solstice (冬至, peak yin).

2. **Preparation (製藥).** The alchemist prepares the ingredients — cleaning, drying, refining, slicing, powdering, dissolving. Preparation removes impurities (a leaf's stem, a mineral's gangue, a beast part's connective tissue) and standardizes the ingredient's potency (a dried and sliced root vs. a fresh whole root). Preparation is itself a qi-lawful step: an improperly prepared ingredient carries its impurities into the pill, contaminating the result.

3. **Combination (合藥).** The alchemist combines the prepared ingredients in the furnace (釜, the cauldron) in a specific order and ratio, according to the pill's recipe. The combination is phase-lawful: the ingredients' phase-affinities must resolve to the pill's intended phase. A Fire-phase pill made with Water-phase ingredients fails or produces a contaminated result (the conquest cycle quenches the Fire intent). The recipe specifies not only the ingredients and ratios but the **order of combination** — adding the Fire-phase catalyst before the Earth-phase base produces a different result than adding it after, because the intermediate phase-states differ.

4. **Fire control (火候).** The alchemist controls the furnace's fire — its intensity (文火/武火, "civil fire" for slow, low heat; "martial fire" for fast, high heat), its duration, and its phase (a Wood-phase fire feeds a Fire-phase pill; a Metal-phase fire, rarely used, cuts through a pill's impurities). Fire control is itself a cultivation art: the alchemist circulates their own qi to sustain and shape the furnace's heat, often for hours or days. Fire control is the most demanding step of alchemy — a moment's inattention can char the ingredients (too hot) or fail to congeal the pill (too cool). The fire's phase must match the pill's intended phase; a phase-mismatched fire produces a contaminated pill.

5. **Congealing (凝丹).** The alchemist congeals the refined mixture into a pill — a single coherent qi-structure that holds the medicinal effect in stable form. Congealing is the moment of truth: the mixture either coheres into a pill (success) or fails to cohere (producing dross — a useless, often toxic residue) or coheres incorrectly (producing a flawed pill with an unintended effect). The congealing step is where the alchemist's realm most directly limits the pill: a Qi Condensation alchemist can congeal simple pills; a Foundation Establishment alchemist can congeal breakthrough pills; a Core Formation alchemist can congeal transformation pills; a Nascent Soul+ alchemist can congeal pills that affect the soul or spirit anchor.

6. **Cooling and storage (收丹).** The alchemist cools the pill (in a specific qi-environment — a Metal-phase pill cools best in a Metal-phase container, etc.) and stores it (in a jade box, a sealed gourd, a warded container). A pill's effect persists if stored properly; a pill stored in a conflicting phase-environment degrades over time. A high-quality pill can persist for decades; a low-quality pill may lose potency in months.

### 4.3 Pill types

Pills are classified by their effect. The four major classes, in increasing order of difficulty and danger:

- **Healing (療傷丹).** Restore qi, heal injuries, cure contamination. The most common pill class; the foundation of the alchemist's trade. A basic healing pill (回氣丹, "return-qi pill") restores a depleted reservoir; a trauma pill (療創丹) accelerates wound healing; a purification pill (清污丹) vents accumulated contamination. Healing pills are typically Wood-phase (Wood generates, restores) or Water-phase (Water cleanses). A Qi Condensation alchemist can refine most healing pills.

- **Breakthrough (突破丹).** Assist realm transitions — Foundation Pill (筑基丹) for the Qi Condensation → Foundation Establishment transition; Core-Forming Pill (結丹丹) for the Foundation Establishment → Core Formation transition; and so on. Breakthrough pills are the most economically valuable pill class — a single Foundation Pill is worth a Qi Condensation cultivator's annual income. They are also the most dangerous: a breakthrough pill consumed by a cultivator who is not prepared for the transition (their meridian system not integrated, their qi-reservoir insufficient, their heart-mind unstable) produces a forced, often catastrophic breakthrough — deviation, foundation collapse, or death. Breakthrough pills require Foundation Establishment alchemy minimum.

- **Enhancement (增益丹).** Temporarily boost a specific capability — strength pill (力丹), speed pill (速丹), perception pill (覺丹), qi-capacity pill (氣丹). Enhancement pills are the combat pill class; a cultivator preparing for a duel may consume a strength pill and a speed pill together for a brief but decisive edge. Enhancement pills are typically Fire-phase (boost strength, yang) or Metal-phase (boost perception, sharpness). The boost is temporary — minutes to hours — and the crash afterward is real (the cultivator is exhausted, sometimes contaminated by the pill's residue). Repeated use of enhancement pills produces cumulative contamination; this is the genre's "pill addiction" trope, made mechanically honest.

- **Transformation (化形丹).** Permanently alter the body or qi-system — body-tempering pills (淬體丹) that strengthen the flesh; meridian-opening pills (開脈丹) that open new meridian routes; root-developing pills (培根丹) that develop a phase-root the cultivator did not have. Transformation pills are the rarest, most expensive, and most dangerous pill class — a transformation pill is, in effect, a controlled medical procedure, and a failed transformation is a permanent injury. Transformation pills require Core Formation alchemy minimum, and many transformation pills require the consumer to be at a specific realm (a body-tempering pill consumed by a Qi Condensation cultivator whose meridian system cannot yet accommodate the changes produces a permanent distortion).

### 4.4 Pill quality

A pill's quality — the strength, purity, and reliability of its effect — is determined by five factors.

1. **Alchemist's realm.** Higher realm = finer fire control, denser congealing intent, cleaner qi-binding. A Qi Condensation alchemist's pill is to a Core Formation alchemist's as village-brewed wine is to a cellared vintage.

2. **Ingredient quality.** The potency, purity, and phase-coherence of the ingredients. A pill made from hundred-year ginseng is qualitatively different from one made from ten-year ginseng; a pill made from ingredients gathered at the wrong solar term is weaker or contaminated. Ingredient quality is the largest single determinant of pill quality and the largest single determinant of pill price.

3. **Furnace quality.** The material, design, and qi-conductivity of the cauldron. A clay furnace is the baseline; an iron furnace is sturdier and holds heat better; a spirit-bronze furnace (a sect heirloom) is qi-conductive and phase-stable. A high-quality furnace makes fire control easier and the pill cleaner; a poor furnace makes both harder. Furnace quality is the alchemist's largest capital investment — a spirit-bronze furnace is worth a small sect's annual revenue.

4. **Fire control.** The alchemist's qi-discipline during the firing step. A perfectly-fired pill is clean, coherent, and at full potency; a poorly-fired pill is charred, incoherent, or contaminated. Fire control is the most directly alchemist-dependent factor — it is the alchemist's qi-circulation discipline sustained for hours or days.

5. **Phase-compatibility of ingredients.** The ingredients' phase-affinities must resolve to the pill's intended phase, and the yin-yang signatures must resolve to a coherent vector. A Fire-phase pill made with Water-phase ingredients fails or produces a contaminated result; a pill whose ingredients are individually phase-compatible but collectively yang-excessive produces a yang-deviation pill (the consumer risks fire-deviation on consumption). Phase-compatibility is the recipe's design constraint — a recipe is, in part, a phase-resolution function.

### 4.5 Failure modes

Alchemy can fail in five named ways. Each is lawful, predictable, and often dangerous.

1. **Poor fire control (火候失誤).** The alchemist's fire was too hot, too cool, too long, or too short. The ingredients char (too hot) or fail to congeal (too cool); the pill is ruined. In severe cases (the furnace over-pressures from a too-hot, too-fast fire), the furnace explodes — injuring the alchemist, destroying the ingredients, and contaminating the workspace with the failed pill's residue. A charred pill is toxic; consuming it produces qi-damage and possibly deviation. Remedy: prevention — better fire control, better tools, better concentration.

2. **Incompatible ingredients (藥性相沖).** The ingredients' phase-affinities conflict — a Fire-phase herb combined with a Water-phase herb in a pill whose intent is Fire. The combination produces an unintended effect: the pill may be inert (the phases cancel), may be toxic (the conflict produces a qi-poison), or may produce a different effect entirely (the conflict resolves to an unintended phase, e.g., a Fire-pill made Fire-Water-conflicted may produce an Earth-effect, because Fire generates Earth as Water conquers Fire and Earth dams Water). Incompatible ingredients are the recipe-design failure mode — a recipe that calls for incompatible ingredients is a bad recipe, and the alchemist who follows it produces a bad pill. Remedy: better recipes; ingredient substitution with phase-compatible alternatives.

3. **Contamination (污丹).** The pill carries the alchemist's psychospiritual residue. If the alchemist was disturbed during refining — angry, grieving, afraid, or even just distracted — the pill absorbs that state, and the consumer of the pill internalizes it. A pill refined by an alchemist in the grip of a 心魔 can transmit the heart-demon to the consumer. This is the alchemy craft's most insidious failure mode: the pill may be physically perfect (right phase, right potency, right congealing) and still be dangerous, because its psychospiritual residue is corrupting. Remedy: alchemists are expected to enter a settled, regulated heart-mind state before refining; a sect's alchemists are required to vent contamination and stabilize before beginning a refinement. A pill refined by a contaminated alchemist is, by sect law, destroyed, not sold.

4. **Congealing failure (凝丹失敗).** The mixture fails to cohere into a pill. The result is dross — a useless, often toxic residue that must be discarded. Congealing failure is the most common alchemical failure; it is typically caused by inadequate fire control or ingredient incompatibility, but it can also be caused by the alchemist's realm being inadequate for the pill's tier (a Qi Condensation alchemist attempting a Foundation Pill will produce dross, every time). Remedy: prevention — do not attempt pills above your realm; ensure fire control and ingredient compatibility before congealing.

5. **Degradation (陳丹).** The pill was correctly refined but has degraded in storage — typically because the storage environment's phase conflicted with the pill's, or because the pill's congealing was incomplete (the pill is slowly losing coherence). A degraded pill is weaker than a fresh pill; a severely degraded pill may be inert or toxic. Remedy: proper storage (jade boxes, phase-matched containers, warded storage chambers); use pills within their shelf life; re-refine degraded pills (possible for some pill classes, not others).

### 4.6 Realm requirements

The alchemy craft's realm gating:

- **Qi Condensation (凝气).** Can refine **simple pills**: healing pills (return-qi, trauma, purification), basic enhancement pills (strength, speed, perception). Cannot refine breakthrough pills or transformation pills. A Qi Condensation alchemist's pills are mid-quality at best (their fire control is limited by their reservoir).
- **Foundation Establishment (筑基).** Can refine **breakthrough-assist pills**: Foundation Pill, basic Core-Forming Pill (with risk). Can refine mid-tier enhancement pills and complex healing pills. A Foundation Establishment alchemist's pills are the cultivation world's standard trade goods.
- **Core Formation (金丹).** Can refine **transformation pills**: body-tempering, meridian-opening, root-developing. Can refine high-tier breakthrough pills (Nascent Soul Pill, with significant risk). A Core Formation alchemist is a wealthy figure — transformation pills are the most expensive single consumables in the cultivation world.
- **Nascent Soul+ (元婴以上).** Can refine **pills that affect the soul or spirit anchor**: soul-stabilizing pills (for a cultivator in bardo), anchor-reinforcing pills (for a cultivator facing tribulation), and the rare and terrible soul-seizing pills (which can affect another's anchor — criminal under most jurisdictions). Nascent Soul alchemists are the cultivation world's strategic resource; their pills are the difference between a sect that survives a tribulation and one that does not.

### 4.7 The alchemist's economic role

Alchemy is the cultivation world's most economically central craft. The reasons:

- **Pills are consumable.** A talisman or formation is a durable asset; a pill is consumed on use. The alchemist's market is recurring — every cultivator needs healing pills, every breakthrough requires a breakthrough pill, every duel is prepared for with enhancement pills. Demand is constant.
- **Pills are qi-multipliers.** A pill can produce effects beyond the user's realm envelope (a Foundation Pill lets a Qi Condensation cultivator cross to Foundation Establishment; a transformation pill can grant a root the cultivator did not have). This makes the alchemist's product qualitatively different from the inscriber's — pills change who the cultivator *is*, not just what they can do.
- **Alchemical skill is scarce.** The craft's realm gating, the cost of furnaces and ingredients, and the danger of failure mean that competent alchemists are rare. A Foundation Establishment alchemist is a sect's economic backbone; a Core Formation alchemist is a region's; a Nascent Soul alchemist is a strategic figure whose movements are tracked by every power in the cultivation world.
- **Failure is public.** A bad talisman misfires privately; a bad pill poisons its consumer, often fatally, often publicly. The alchemist's reputation is therefore both their greatest asset and their most fragile. A single contaminated batch can ruin a Foundation Establishment alchemist; a single transmitted 心魔 can make them a hunted criminal.

A good alchemist is wealthier than most sects. A bad alchemist is dead — killed by their own furnace, their own contaminated pills, or the kin of a consumer they poisoned. The cultivation world's alchemical trade is therefore tightly regulated by sects and academies: alchemists are licensed, furnaces are inspected, recipes are tested, and a contaminated alchemist is forbidden from refining until their heart-mind is cleared. The unlicensed alchemist (the 散丹師, "loose pill-master") is the cultivation world's back-alley pharmacist — cheap, dangerous, and the only option for the cultivator who cannot afford a sect's prices.

---

## 5. The determinism contract in practice

The determinism contract (same inputs → same outputs) is the engine of the three crafts' economy. Three worked examples illustrate the contract's application.

### 5.1 Formation example

A Foundation Establishment inscriber sets a three-node ward around a meditation chamber, using jade nodes of standard quality, in a region of balanced qi-climate, with line precision typical of a Foundation Establishment inscriber. The result: a ward that excludes hostile qi below Core Formation intensity, persists for approximately twenty years without re-investment, and produces no side effects. Any other Foundation Establishment inscriber, given the same nodes, the same site, the same precision, produces the same ward. The ward is reproducible; its specification can be written down, taught, and inherited.

### 5.2 Talisman example

A Qi Condensation inscriber paints a fireball talisman on standard talisman paper, using standard cinnabar ink, with pattern precision typical of a Qi Condensation inscriber. The result: a talisman that, on activation by a Fire-phase or compatible cultivator, discharges a fireball of approximately Qi Condensation intensity, with a range of approximately ten paces, in a fixed direction. Any other Qi Condensation inscriber, given the same paper, the same ink, the same precision, produces the same talisman. The talisman is reproducible; its pattern can be written down, taught, and sold in stacks.

### 5.3 Alchemy example

A Foundation Establishment alchemist refines a Foundation Pill using hundred-year ginseng (Wood-phase, gathered at Spring Equinox), spirit-pearl (Water-phase, gathered at Winter Solstice), and cinnabar (Fire-phase, refined), in a spirit-bronze furnace, with fire control typical of a Foundation Establishment alchemist. The result: a Foundation Pill that, when consumed by a Qi Condensation cultivator whose meridian system is integrated and whose qi-reservoir is sufficient, produces a Foundation Establishment breakthrough with approximately seventy percent success and no contamination. Any other Foundation Establishment alchemist, given the same ingredients, the same furnace, the same fire control, produces the same Foundation Pill. The pill is reproducible; its recipe can be written down, taught, and traded.

### 5.4 Where the determinism breaks (and does not)

The determinism contract applies to the *process*, not to the *inputs*. The inputs vary — ingredient potency varies by season and harvest, node quality varies by material and preparation, the inscriber's heart-mind varies by day. The contract guarantees that *given* a specific set of inputs, the process produces a specific output. It does not guarantee that the inputs are always the same.

This is the engine of the crafts' economic variation: a pill made from hundred-year ginseng is qualitatively different from one made from ten-year ginseng, and the alchemist who can source the better ingredient produces the better pill. A talisman inscribed by a rested, concentrated inscriber is qualitatively different from one inscribed by a fatigued, distracted inscriber, and the inscriber who manages their state produces the better talisman. The variation lives in the inputs; the lawfulness lives in the process.

---

## 6. The central tension, named and resolved

The doctrine (AGENTS.md Part 3) requires that the central tension between what the genre forbids (power acceleration) and what the genre expects (power multiplication) be named, chosen, and defended — not dissolved by redefinition.

**The tension.** The genre wants the three crafts to be power multipliers: a pill lets a weaker cultivator punch above their realm; a talisman lets a mortal fire a fireball; a formation lets a sect defend against an army. The doctrine forbids power acceleration that trivializes the realm ladder.

**The choice.** This document chooses **power multiplication at a price**. The three crafts can produce effects above the user's realm envelope, but:

- The craft requires an inscriber or alchemist of higher realm than the user. (A Qi Condensation cultivator can *use* a Foundation Establishment talisman; they cannot *make* one. They must buy, trade, or steal it.)
- The craft's inputs are scarce, specific, and lawful. (Breakthrough pills require specific herbs gathered at specific solar terms; there is no shortcut.)
- The craft's failure modes are real, lawful, and dangerous. (A misfired talisman injures the user; a failed pill poisons the consumer; a corrupted formation turns on its inscriber.)
- The craft's higher-realm effects are gated by the consumer's realm. (A Qi Condensation cultivator cannot use a transformation pill; their body cannot receive the effect.)

**The defense.** This choice preserves the genre's power-multiplication fantasy (the young master with a treasury of pills and talismans is a real and playable archetype) while preventing the doctrine-forbidden acceleration (a Qi Condensation cultivator cannot become Foundation Establishment by stacking pills; they can only succeed at the breakthrough they were already prepared for, faster and more reliably). The price — scarcity, risk, dependence on higher-realm crafters — is the genre's actual economy, made mechanically honest.

**The player-facing consequence.** The player at Qi Condensation can acquire talismans and pills that extend their capability beyond their bare cultivation, but they cannot make those talismans and pills themselves. They must trade for them, owe for them, or steal them. This produces the genre's actual social structure — the dependence of the junior cultivator on the senior crafter, the sect's treasury as a real economic asset, the alchemist as a figure of wealth and danger. The player who reaches Foundation Establishment and inscribes their first talisman crosses a threshold: they are no longer only a *user* of the crafts; they are a *maker*. This is the engine of the genre's progression fantasy, made honest.

---

## 7. What this document enables

This document specifies the three crafts as systems with inputs, processes, outputs, failure modes, and realm requirements. It enables:

- **Economic simulation.** The cultivation world's economy can be modeled: ingredient supply chains, talisman markets, formation libraries, alchemist licensing, sect treasuries. The determinism contract makes the economy reproducible; the realm gating makes it stratified.
- **Craft play.** The player can practice each craft as a discrete verb-set: survey, place, trace, invest, activate, persist (formations); prepare, inscribe, seal, activate (talismans); gather, prepare, combine, fire, congeal, store (alchemy). Each craft has its own feel, its own failure modes, its own progression.
- **Craft dependence.** The player at low realm is a *user* of the crafts, dependent on higher-realm crafters. The player at higher realm becomes a *maker*, with the economic and political standing that entails. This is the genre's social structure, made playable.
- **Lawful failure.** Every craft failure is named, lawful, and predictable. The player who understands the qi-model and the determinism contract can avoid failures; the player who does not, suffers them. This is the doctrine's "the system serves the experience" — the system is the experience, and the experience is the genre's actual texture.

The next document (17) specifies the **economic and political structure of the cultivation world** — the sects, lineages, academies, and markets in which the three crafts are traded, regulated, and contested. The crafts specified here are the *goods*; the next document specifies the *trade*.

---

## Appendix A: Realm-gating summary

| Craft operation | Minimum realm | Notes |
|---|---|---|
| Power an existing formation (infuse qi to sustain/activate) | Qi Condensation | Cannot inscribe |
| Inscribe a simple formation | Foundation Establishment | 3–9 nodes; wards, gathering arrays, simple traps |
| Inscribe a complex formation | Core Formation | Killing arrays with conditional logic, space-locks, gates |
| Inscribe a formation that persists after the inscriber's death | Nascent Soul | Sect ancestral formations |
| Inscribe a domain-level formation | Spirit Severing | The formation is the cultivator's will made spatial |
| Inscribe a simple talisman (light, fireball, shield) | Qi Condensation | Seal persists for months |
| Inscribe a complex talisman (communication, detection, storage) | Foundation Establishment | Seal persists for years |
| Inscribe a semi-autonomous talisman (intent-fragment) | Core Formation | The talisman adjusts its effect to the situation |
| Inscribe a long-range or trigger-conditional talisman | Nascent Soul+ | Sect treasury class |
| Refine a simple pill (healing, basic enhancement) | Qi Condensation | Mid-quality at best |
| Refine a breakthrough pill (Foundation Pill, basic Core-Forming Pill) | Foundation Establishment | Standard trade goods |
| Refine a transformation pill (body-tempering, meridian-opening, root-developing) | Core Formation | Most expensive consumables |
| Refine a soul- or anchor-affecting pill | Nascent Soul+ | Strategic resource; some classes criminal |

## Appendix B: Phase-compatibility quick reference

| Inscription's intended phase | Compatible ingredient/medium phases | Conflict phases (failure risk) |
|---|---|---|
| Wood (木) | Water (generates), Wood (parallel) | Metal (conquers) |
| Fire (火) | Wood (generates), Fire (parallel) | Water (conquers) |
| Earth (土) | Fire (generates), Earth (parallel) | Wood (conquers) |
| Metal (金) | Earth (generates), Metal (parallel) | Fire (conquers) |
| Water (水) | Metal (generates), Water (parallel) | Earth (conquers) |

Yin-yang signatures must resolve to a coherent vector: a yang-dominant inscription made with yin-dominant inputs produces an attenuated or contaminated result, regardless of phase compatibility. The generator resolves phase and yin-yang separately; both must succeed.

---

## Citation of doctrine honored

- **AGENTS.md Part 3, "Build the engine, not just the brake."** Every forbidding rule (you cannot inscribe a killing array at Qi Condensation) is paired with the positive capability it unlocks at the proper station (you can inscribe a killing array at Foundation Establishment, with these inputs, by this process). The engine is specified; the brake is specified only in service of the engine.
- **AGENTS.md Part 3, "Make decisions; do not defer."** This document commits to the realm gating, the failure modes, the determinism contract's application, and the central tension's resolution. No fork is deferred.
- **AGENTS.md Part 3, "Confront the central tension directly."** §6 names the tension (power multiplication vs. power acceleration), chooses a side (power multiplication at a price), defends the choice, and provides a positive account of what the player gets instead.
- **AGENTS.md Part 3, "Design for joy first."** §2.8, §3.8, and §4.7 specify what each craft unlocks for the player — the verbs, the feel, the economic role. The system serves the experience; the experience is named.
- **`00_FOUNDATIONAL_DECISIONS.md` §6.** The qi-model (yin-yang, five phases) is operational in this document: every inscription has a phase-affinity and yin-yang signature, and compatibility is resolved lawfully.
- **`00_FOUNDATIONAL_DECISIONS.md` §3 and `03_REALM_LADDER.md`.** The realm gating (§2.7, §3.7, §4.6, Appendix A) is consistent with the ten-station ladder's per-station specifications.

## Citation of doctrine violated

- **None at the system level.** The document commits to the doctrine's requirements. The one deviation is terminological: this document does not use pinyin romanization with tone marks, per the user's explicit instruction. This is a stylistic deviation from earlier corpus documents and is ratifiable here; it does not violate any doctrine in AGENTS.md or `00_FOUNDATIONAL_DECISIONS.md`.
- **Open question, deferred honestly (not deferred as refusal):** The exact recipes for specific pills, the exact patterns for specific talismans, and the exact layouts for specific formations are not specified in this document. These are content artifacts (the recipe book, the talisman pattern catalog, the formation layout atlas) to be specified in later documents or generated procedurally from the seed. The *system* for resolving them is specified here; the *content* is not. This is the doctrine's "deferred detail, not deferred fork."
