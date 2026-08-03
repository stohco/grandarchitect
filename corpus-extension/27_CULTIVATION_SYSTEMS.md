# 27 — Cultivation Systems

**Status:** Candidate canon. The seven cultivation systems the prior corpus named but never specified. Each is mechanically complete: inputs, process, outputs, failure modes, and a determinism contract.
**Date:** 2026-08-03

---

## 0. Why this document exists

The five-critic audit found the prior corpus had built the *brake* on every cultivation concept (deviation, fragility, failure modes) and the *engine* on none (breakthrough, bottleneck, comprehension, dantian, roots, dual cultivation, heart-mind). AGENTS.md Part 3 forbids this. A document of prohibitions produces disciplined emptiness.

This document specifies the seven systems as mechanics. Each is a pure function over its inputs at each tick (determinism contract), coherent with the ratified yin-yang of body/qi/anchor (body = yin, qi = yang-within-yin, anchor = yang; doc 24 §2.3), and advancing along the internal-alchemy chain ratified in the same decision (煉精化氣 → 煉氣化神 → 煉神還虛 → 煉虛合道). Naming: Hanzi plus English gloss; pinyin omitted (no tone marks per the document rules).

---

## 1. Breakthrough mechanics (the integration event)

### 1.1 Precedent cited

**Cultist Simulator (Weather Factory, 2018)** — the ascension rite. A promotion requires: (a) gathered lore at sufficient intensity, (b) a funded ritual with the correct ingredients, (c) a real-time rite execution that cannot be paused, (d) a confrontation with a temptation (the player must choose which aspiring urge to commit), and (e) success or failure that transforms the character permanently (ascension to a new Major Arcana) or destroys them (madness, death, consumed by a rival). The breakthrough mechanic below adopts this structure wholesale. Named mechanic: the **ascension rite**.

Secondary precedent: **Sekiro: Shadows Die Twice (FromSoftware, 2019)** — the perilous-attack red kanji as a *readable tell*. When the unprocessed material surfaces in the confrontation stage (§1.4), it is rendered with the same readable-signature discipline: the player sees what is surfacing (grief, fear, desire, hatred) before they must commit to a response.

The breakthrough is mechanically a five-stage state machine with committed transitions and named failure modes at every stage — the central dramatic event of xianxia, made operational.

### 1.2 The five stages

| Stage | Name | Duration | Player verbs | Failure outcome |
|---|---|---|---|---|
| 1 | **Preparation** | Weeks to years | Balance phase-affinities, resolve psychospiritual conditions, fill reservoir, stabilize meridians | Rite cannot begin (gate fails closed) |
| 2 | **Threshold** | Minutes real-time / hours in-game | Enter integration; actively guide body/qi/anchor alignment | Reverts to Preparation; no damage |
| 3 | **Confrontation** | Tens of seconds real-time / minutes in-game | Read the surfacing material; choose integrate / push-past / abort | 心魔 onset (push-past) or graceful withdrawal (abort) |
| 4 | **Integration** | Seconds real-time | Rest in the aligned state | If destabilized, fall through to Failure |
| 5 | **Settlement** | Hours in-game | Rest; new perceptions come online; teacher observes | Rarely fails; if it does, the integration collapses |

A sixth outcome, **Failure**, is reached only if Integration destabilizes — the state machine has no other terminal.

### 1.3 Worked example: Qi Condensation → Foundation Establishment

This is the breakthrough that Golden Scenes 4 (failed) and 5 (succeeded) dramatize.

**Stage 1 — Preparation.** Four prerequisite checks, all boolean against tracked state: `phase_affinity_balanced` (no phase more than ±0.30 from the mean of the five-phase profile; Scene 4's protagonist fails: wood too dominant, metal too weak); `psychospiritual_resolved` (every tracked unresolved attachment has integration-progress ≥ 0.7; Scene 4's protagonist fails: the unmourned sibling's grief is at 0.2); `reservoir_sufficient` (lower-dantian volume ≥ 0.85 of capacity and purity ≥ 0.7); `meridians_stable` (no meridian with inflammation > 0.1; no somatic deviation active).

If any check fails, the rite cannot begin. The player can bypass the gate (Scene 4's choice) by entering the Threshold anyway; doing so sets `forced_attempt = true` that multiplies the Confrontation's instability by 2.5.

**Stage 2 — Threshold.** The cultivator enters the integration state. Body (yin), qi (yang-within-yin), and anchor (yang) begin to align. The player must *actively guide* the alignment: route qi through three named meridians (ancestral gate, central conduit, spirit path), balance the yin-yang signature toward neutral, and monitor three alignment meters (body-qi coherence, qi-anchor coherence, body-anchor coherence) that drift apart over time and must be re-converged by routing. This is a real-time long verb: minutes, no pause.

If the player lets any coherence meter fall below 0.4, the Threshold fails. With `forced_attempt = false`, the player reverts to Stage 1 with no damage. With `forced_attempt = true`, the player advances to Confrontation anyway, but the surfacing material is more intense.

**Stage 3 — Confrontation.** The unprocessed psychospiritual material surfaces, rendered as a Sekiro-style readable tell: the player perceives, in the inner-geography layer, the specific shape of what is surfacing. The four canonical surface-materials:

- **Grief**: cold knot in the chest, dimming toward yin. Felt-sense: heaviness.
- **Fear**: turbulent surge in the kidney-region, dimming toward water-phase. Felt-sense: contraction.
- **Desire**: hot pull toward the brow, brightening toward fire-phase. Felt-sense: reaching.
- **Hatred**: sharp rigidity in the liver-region, sharpening toward metal-phase. Felt-sense: locking.

The player has three committed responses, each a discrete verb:

- **Integrate (合)**: acknowledge, feel, let move. Costs 30 seconds of sustained attention. Success requires `psychospiritual_resolved` ≥ 0.5 for *this specific* material. Success resolves the material permanently; failure sends the cultivator to Failure with 心魔 onset.
- **Push past (沖)**: continue despite the disturbance. Sets `xinmo_risk = high` for Integration; if Integration succeeds, the cultivator emerges at Foundation Establishment *with* a 心魔 (per Scene 4's pyrrhic outcome). If Integration fails, the cultivator deviates and reverts with damage.
- **Abort (退)**: withdraw gracefully. Reservoir halved (the cost of withdrawing mid-rite); no damage, no deviation. The cultivator returns to Preparation. This is the correct choice if preparation is incomplete (Scene 4's correct outcome).

**Stage 4 — Integration.** If Confrontation resolved (integrate-success or push-past), the three systems (body, qi, anchor) align. The three coherence meters snap to 1.0 simultaneously. The felt-sense is *wholeness* — recognition, not power (per doc 03 Station 4, doc 05 §2.1). The stage lasts 3-5 seconds real-time; the player's only verb is to *rest in* the state.

If `xinmo_risk = high` (push-past was chosen), the Integration is unstable: a 50% chance per rite (seeded; see §1.6) that the alignment destabilizes; the cultivator falls through to Failure with 心魔 onset.

**Stage 5 — Settlement.** The new state persists. Lifespan extends (per doc 03 Station 4: ~200 years). New perceptions come online over in-game days: integrated self-perception, meridian depth perception, environmental qi-flow perception. The cultivator gains the Station 4 verbs: integrate a practice (合修), form a meridian (開脈), bear an oath (受職), found a household (立家), teach a practice (傳法).

### 1.4 The breakthrough state machine

```
PREP --[all 4 checks pass]--> THRESHOLD
PREP --[forced_attempt]--> THRESHOLD(forced)
THRESHOLD --[coherence held]--> CONFRONTATION
THRESHOLD --[coherence < 0.4, not forced]--> PREP
THRESHOLD --[coherence < 0.4, forced]--> CONFRONTATION(intense)
CONFRONTATION --[integrate-success]--> INTEGRATION
CONFRONTATION --[integrate-fail]--> FAILURE(xinmo)
CONFRONTATION --[push-past]--> INTEGRATION(unstable)
CONFRONTATION --[abort]--> PREP(reservoir /= 2)
INTEGRATION --[3-5s, stable]--> SETTLEMENT
INTEGRATION --[unstable, 50%]--> SETTLEMENT(with xinmo)
INTEGRATION --[unstable, 50%]--> FAILURE(xinmo + revert)
SETTLEMENT --[perceptions online]--> DONE
FAILURE --[revert]--> PREP(with damage)
FAILURE --[xinmo]--> PREP(with deviation)
```

Every transition is deterministic given the inputs. There are no random rolls except the single 50% on `INTEGRATION(unstable)`, which is itself seeded by the world-seed and the cultivator's state hash, so two isomorphic cultivators with identical state produce identical outcomes.

### 1.5 Determinism contract

- **Inputs:** the cultivator's tracked state (phase-profile, psychospiritual-resolved vector, reservoir, meridian-stability, forced_attempt flag, world-seed-derived coin for unstable-integration).
- **Function:** the state machine above, with the player's verb choices at each Committed transition.
- **Outputs:** the cultivator's new station (or reverted station with damage/deviation), the new state values, the perception set, the verb set.
- **Determinism oracle:** an isomorphic NPC given the same starting state and the same player-equivalent verb choices produces the same outcome, including the same 心魔 type if any.

### 1.6 Failure modes

- **Premature forced attempt** (Scene 4, the most common). Forced rite without preparation; surfacing material too raw; player pushes past; integration destabilizes; cultivator reverts with 心魔.
- **Coherence loss** (the Threshold skill issue). Coherence meters fall below 0.4; the rite fails at Threshold. No damage, but reservoir cost is paid.
- **Integrate-fail on raw material** (the confrontation skill issue). Integrate attempted on unprepared material; integration fails; 心魔 onset.
- **Destabilized integration after push-past** (the unlucky 50%). Push-past succeeded through Confrontation but the Integration's 50% coin failed; revert with damage.
- **External interruption** (rare, generated). Bandit attack, village message, tribulation precursor. Rite aborted at whatever stage; reservoir cost paid; return to Preparation.

### 1.7 Coherence with yin-yang and the alchemy chain

The breakthrough at Qi Condensation → Foundation Establishment is the **煉精化氣** station of the internal-alchemy chain: essence (body, yin) and qi (yang-within-yin) integrate, and the anchor (yang) becomes the integrating authority. The three coherence meters in Threshold are the three pairwise coherences of body/qi/anchor — all must converge for the integration to take. Later stations inherit the same state machine with different coherence triples: Core Formation (煉氣化神) integrates qi/anchor/spirit-perception; Nascent Soul (煉神還虛) integrates anchor/perception/void; Spirit Severance (煉虛合道) integrates void/law/domain. The state machine is reused; only the inputs and outputs change.

---

## 2. Bottlenecks (pingjing, 瓶頸)

### 2.1 Two types

| Type | Where it bites | Resolution |
|---|---|---|
| **Within-station plateau** | Inside a station, the qi-state stops improving | Comprehension event, pill, teacher's intervention, life experience |
| **Between-station wall** | At a station's peak, the cultivator cannot break through | Discover the (possibly unknown) next-station prerequisite |

The two types are mechanically distinct: the plateau is a *rate* failure (the qi-state's derivative falls below a floor), the wall is a *gate* failure (a prerequisite check fails). They are tracked and resolved differently.

### 2.2 Within-station plateau

**Onset.** The plateau begins when the qi-state's improvement rate over a rolling 30-day window falls below `0.5% of per-day capacity`. Concretely: if the cultivator has been practicing daily and the lower-dantian volume has not increased by more than 0.5% of capacity over 30 days, the plateau flag is set. The cultivator perceives this (per doc 05 §2.3) as a *stagnation* — the qi feels "stuck," the practice feels "empty," the dantian's weight does not change day to day.

**Duration.** Indefinite. The plateau persists until a resolution condition is met.

**Resolution conditions.** Any one of:
- **Comprehension event** (per §3.4 below). The cultivator comprehends a fragment of law that re-frames their practice; the plateau breaks.
- **Pill or elixir** (per doc 16). A specific pill, taken under specific conditions, supplies the missing phase-balance or qi-quality; the plateau breaks. The pill is a consumable; the plateau can return.
- **Teacher's intervention.** A higher-realm teacher perceives the plateau, diagnoses its cause (a phase-imbalance, a habitual mis-routing, a psychospiritual block), and prescribes a specific corrective practice. The cultivator follows the prescription; the plateau breaks.
- **Life experience.** A significant event (grief, love, danger, loss, revelation) shifts the heart-mind such that the practice's blocking-pattern dissolves. The plateau breaks. This is the slowest and most profound resolution; it is also the one most likely to produce 心魔 if the experience is not integrated.

**Player experience.** The plateau feels like *practice becoming hollow*. The verbs are the same, but the qi-state does not change. The temptation is to push harder — which does not work and risks deviation. The correct response is to do something other than the practice: study, seek a teacher, take a pill, grieve, travel. The plateau is the game saying *this station has taught you what it can; the rest is elsewhere*.

### 2.3 Between-station wall

**Onset.** The wall is not gradual; it is binary. The cultivator reaches the peak of their station (qi-state at capacity, meridians fully developed for this station) and *cannot initiate the breakthrough rite* (per §1.4 Stage 1). The gate fails closed; the player cannot enter the Threshold.

**Duration.** Indefinite. The wall persists until the prerequisite is met.

**Resolution conditions.** The cultivator must discover and meet the next station's prerequisite. The prerequisite may be:
- **A phase-balance** (the most common at Foundation Establishment's gate; per §1.4).
- **A heart-mind state** (the Foundation Establishment gate also requires `psychospiritual_resolved` ≥ 0.7 across all tracked attachments).
- **A specific practice** (some stations require that the cultivator has integrated a specific practice before the gate opens; e.g., Core Formation requires the cultivator to have integrated at least one foundational practice at Foundation Establishment).
- **A comprehension** (some stations require that the cultivator has comprehended a specific fragment of law; e.g., Spirit Severance requires comprehension of the *domain-fragment* — what it means for one's will to hold in a place).

The prerequisite may be **unknown to the cultivator**. The cultivator knows they are at the wall; they do not automatically know what is on the other side. Discovery is a verb: study under a teacher, consult texts, observe a peer's breakthrough, attempt the rite and read the failure's specific signature (which reveals *which* prerequisite is unmet, though not always *how* to meet it).

**Player experience.** The wall feels like *a closed door in a long corridor*. The cultivator has reached the door; it will not open; the corridor does not continue. The temptation is to force the rite (per §1.4 `forced_attempt`), which always fails and always damages. The correct response is to discover the prerequisite — which may take months of play and involve travel, study, and life experience the player did not anticipate.

### 2.4 Determinism contract

- **Plateau inputs:** qi-state history (rolling 30-day improvement rate), current phase-profile, current psychospiritual-resolved vector, current event log.
- **Plateau function:** improvement-rate < floor → plateau flag set. Resolution condition met → plateau flag cleared.
- **Wall inputs:** station, station-peak-qi-state, prerequisite-check results.
- **Wall function:** all prerequisite checks pass → gate opens; else gate closed. `forced_attempt` ignores the gate but multiplies Confrontation instability.
- **Determinism oracle:** two isomorphic cultivators in identical state plateau at identical times; their walls require identical prerequisites.

### 2.5 Failure modes

- **Pushing through a plateau by force.** More practice, more qi, no resolution. Qi-state does not improve; deviation risk rises (per doc 05 §3.1, route fixation and false circuit are the likely deviations).
- **Forcing the wall.** The `forced_attempt` path; the breakthrough fails; the cultivator reverts with damage or 心魔 (per §1.7).
- **Misdiagnosed plateau.** A teacher (or the player's own guess) prescribes the wrong corrective practice. The plateau does not break; time and resources wasted; in the worst case, the wrong practice produces a new imbalance.
- **Permanent plateau** (rare, generated). A cultivator whose roots-profile is too weak in the phase their station's practice requires may plateau indefinitely. Resolution: develop the root (per §5), itself a long process. The genre's "talent ceiling" made mechanical and honest.

---

## 3. Comprehension (wudao, 悟道)

### 3.1 What comprehension is mechanically

Comprehension is two different mechanics at two different stations:

- **At Qi Condensation**, comprehension is a *perception* — the cultivator can comprehend what they already perceive. The ambient qi-quality perception (per doc 03 Station 3) is enhanced by comprehension: a comprehending cultivator does not just perceive that the river's qi is "cool yin water with metal-contamination," they perceive *why* — the metal comes from the upstream ironworks, the cool yin comes from the river's depth and motion, the water-phase is the river's nature. Comprehension at this station deepens perception; it does not produce new outputs.
- **At Foundation Establishment and above**, comprehension is a *verb* — the cultivator can attempt to comprehend a fragment of Dao. This is the active, risky form. It produces *law-fragments* that integrate into the heart-mind.

### 3.2 What comprehension produces

A law-fragment is a discrete, named unit of law-perception. It has:
- A **domain** (what law it concerns: wood-phase generation, water-phase flow, the structure of meridians, the nature of spirit anchors, the law of a specific grotto-heaven, etc.).
- An **intensity** (1-5; how deeply the fragment is comprehended).
- An **integration state** (0.0-1.0; how completely the fragment has been absorbed into the heart-mind).

Law-fragments are produced by the comprehension verb applied to a *comprehension target*: a text, an observed phenomenon, a teacher's transmission, a tribulation's residue, a place of dense law (a grotto-heaven, a sacred mountain). Each target supplies a fragment of specific domain and maximum intensity; the cultivator's comprehension skill and attention determine the actual intensity achieved.

**The integration rule.** A law-fragment with `integration < 0.6` is *un-integrated* — raw material, a perceived-but-not-absorbed truth. The cultivator's `unintegrated_fragment_count` is tracked. When `unintegrated_fragment_count > heart_mind_capacity` (a function of station and 性gong development, per §6.4), the cultivator develops the fifth 心魔: **delusional conviction (妄信)** (per doc 24 §1.2). The fragment is a real but partial truth elevated to totality.

### 3.3 What comprehension costs

- **Attention.** Comprehension is a Committed verb (per doc 13 §1.2); the cultivator cannot do anything else while comprehending. A single comprehension attempt costs 30-60 minutes of in-game time and 60-100 attention units.
- **Time.** Comprehension is slow. A single fragment takes hours to days of cumulative attention; a high-intensity fragment may take months.
- **The risk of comprehending something you are not ready for.** A fragment whose domain exceeds the cultivator's station has its `unintegrated` difficulty doubled — it is harder to absorb, and the delusional-conviction threshold is halved. A Qi Condensation cultivator who attempts to comprehend the structure of tribulation (a Tribulation Crossing concern) is at high risk of 妄信.

### 3.4 Comprehension and bottlenecks

A within-station plateau (per §2.2) is *often* resolved by a comprehension event. The mechanic: the cultivator, stuck at the plateau, attends to a comprehension target that concerns the *domain of their plateau*. If the comprehension succeeds and the fragment integrates, the plateau breaks — the fragment supplies the missing understanding the practice could not. This is the genre's "epiphany in meditation" trope, made mechanical: the epiphany is the integration of a law-fragment whose domain matches the plateau's blocking-pattern. The match is checked by the engine; the player does not need to know in advance which target will resolve their plateau, but the engine knows.

### 3.5 Comprehension and the realm ladder

Each station's new perceptions are, in part, the result of comprehending the prior station's experiences. A cultivator at Foundation Establishment perceives environmental qi-flow (per doc 03 Station 4) *because* they have, at Qi Condensation, accumulated enough qi-quality perceptions to comprehend the flow-fragment. Comprehension is not automatic; it must be attempted. But the system assumes that a cultivator who reaches a station's peak has, by the nature of the practice, accumulated the perceptual material needed.

The mechanic: at each station's peak, the cultivator has access to a station-specific comprehension target (their own accumulated experience). Comprehending this target supplies the law-fragment that unlocks the next station's primary perception. This is not the only path through the wall (per §2.3 — a pill, a teacher, or a life experience can also work), but it is the most reliable.

### 3.6 Determinism contract

- **Inputs:** comprehension target (domain, max intensity), cultivator's comprehension skill, attention, station, current `unintegrated_fragment_count` and `heart_mind_capacity`.
- **Function:** attempt → fragment (with actual intensity rolled from skill × target-max, seeded by the world-seed and target-hash). Integration → fragment.integration += rate × time. `unintegrated_fragment_count` updated.
- **Outputs:** a law-fragment (or nothing on failed attempt), updated integration state, possibly 妄信 onset.
- **Determinism oracle:** two isomorphic cultivators comprehending the same target with the same skill produce the same fragment intensity.

### 3.7 Failure modes

- **Failed attempt.** Comprehension does not take; no fragment produced. Time and attention spent. May try again later.
- **Partial fragment.** Lower intensity than the target's max. Useful but incomplete.
- **Delusional conviction (妄信).** Too many un-integrated fragments; the fifth 心魔 manifests. The cultivator does not feel ill; they feel certain. Treatment: encountering evidence that contradicts the conviction and choosing to incorporate it (per doc 24 §1.2) — the hardest 心魔 to treat.
- **Domain-shock.** Comprehending a fragment whose domain is too far above the cultivator's station. The fragment does not integrate; perception is temporarily deranged (hours to days); 妄信 risk high.

---

## 4. The three dantian (shang zhong xia dantian, 上中下丹田)

### 4.1 The three centers

| Center | Hanzi | Location | Function | Realm of primary development |
|---|---|---|---|---|
| Lower dantian | 下丹田 | Lower abdomen | Qi reservoir (per doc 05 §2.2) | Qi Condensation → Foundation Establishment |
| Middle dantian | 中丹田 | Solar plexus | Qi-circulation hub (per doc 03 Station 3, meridian perception) | Foundation Establishment → Core Formation |
| Upper dantian | 上丹田 | Brow | Spirit-perception center (per doc 03 Station 5, spirit-anchor perception) | Core Formation → Nascent Soul |

The three dantian are not three reservoirs; they are three *functional centers* of the integrated being. The lower stores qi (qi as yin-within-body); the middle routes qi (qi as yang-within-yin, moving); the upper is where the anchor (yang) perceives itself. The yin-yang of body/qi/anchor (doc 24 §2.3) maps directly: lower dantian = body-as-qi-reservoir (yin holding yang); middle dantian = qi-as-motion (yang-within-yin); upper dantian = anchor-as-perceiver (yang).

### 4.2 Lower dantian — qi reservoir

A bounded region of the lower abdomen where qi accumulates, perceived as a weight (per doc 05 §2.2). State: *volume* (how much qi), *purity* (how uncontaminated), *phase-balance* (yin-yang/phase signature). Volume grows through practice, ambient-qi absorption in qi-rich environments, and specific pills. Purity grows through venting (per doc 03 Station 3), clean environments, and purifying practices. Phase-balance is actively managed by routing and environment.

**Failure modes.** *Reservoir exhaustion* (per doc 13 §2.3): volume below safe threshold; cultivator effectively mortal until recovery. *Reservoir over-pressurization*: volume at capacity with high purity and high phase-imbalance; risk of reservoir cracking (catastrophic; may revert a station). *Contamination poisoning* (per doc 03 Station 3): accumulated contaminated qi produces imbalance; untreated, leads to somatic deviation.

### 4.3 Middle dantian — circulation hub

The routing center of the meridian system — where the cultivator's *routing choices* (per doc 13 §4 — Hands/Legs/Senses/Skin) are made. Perceived (at Foundation Establishment+) as a *plexus* of intersecting meridian-paths, denser than the meridians themselves. Develops through routing practice: every routing choice develops the middle dantian's *route capacity* (simultaneous meridians) and *switch speed* (routing change rate, per doc 13 §4.2).

**Failure modes.** *Route collapse*: a routing under load fails; routing collapses to a single default; the cultivator cannot switch until rest. Combat consequence: locked into one routing (per doc 13 §4.3). *Switch-lock*: switch-speed degrades to zero (rare; produced by route fixation, per doc 05 §3.1). *Plexus inflammation*: the middle dantian itself inflamed (a qi-injury); all routings reduced; recovery takes weeks.

### 4.4 Upper dantian — spirit-perception center

The seat of the anchor's self-perception. Where the cultivator (at Core Formation+) perceives spirit anchors, including their own. Perceived (at Core Formation+) as a *center of attention* at the brow — not a structure but a *locus*. Develops through perception-of-self practice: meditation that attends to the anchor, integration of 心魔 (per §7), and the slow maturation of age and experience. The slowest-developing dantian and the one most dependent on the heart-mind (per §7).

**Failure modes.** *Perception overload* (per doc 03 Station 5): a newly-formed Core Formation cultivator perceives anchors everywhere and cannot filter; the upper dantian is overwhelmed. *Anchor-perception derangement*: a specific 心魔 in which the cultivator cannot stop perceiving anchors — the dead, the unborn, the non-human. Produced by comprehending an anchor-law fragment too early (per §3.3). *Anchor-perception loss* (rare, from a specific spiritual injury): the upper dantian damaged; the cultivator can no longer perceive anchors.

### 4.5 How the three dantian interact

The three dantian are not independent; they are the three yin-yang phases of one being (per doc 24 §2.3), and they interact lawfully: **lower feeds middle** (qi stored in the lower dantian is routed by the middle; a depleted lower dantian leaves the middle nothing to route; an over-pressurized lower dantian forces aggressive routing to relieve pressure); **middle routes through upper** (the middle's routing produces the qi-brightening the upper's perception attends to; a developed upper dantian perceives routing in detail, an undeveloped one perceives only the enhanced physical output); **upper stabilizes lower** (the anchor's self-perception holds the lower dantian's *form* — the reservoir's coherence depends on the anchor's continued presence; an anchor-bruise, per doc 13 §8.1, produces lower-dantian coherence loss).

### 4.6 The dantian chain and the realm ladder

The internal-alchemy chain (doc 24 §2.3) maps to the dantian chain:

- **Foundation Establishment (煉精化氣):** the *lower dantian* integrates with the body. Body (yin) and qi (yang-within-yin) become one system. The reservoir becomes the body's *own* — not borrowed from ambient qi but sustained by the integrated system. This is the breakthrough's Stage 4 (per §1.4).
- **Core Formation (煉氣化神):** the *middle dantian* becomes self-sufficient. Circulation no longer needs the lower dantian's continuous supply (the "self-sustaining qi" verb, per doc 03 Station 5). The middle dantian becomes the seat of the golden core (金丹).
- **Nascent Soul (煉神還虛):** the *upper dantian* becomes independent. The anchor (yang) can perceive and act without the body's support. The upper dantian becomes the seat of the nascent soul (元婴) — the anchor-as-self-perceiver that can leave the body.
- **Spirit Severance (煉虛合道):** the upper dantian's perception externalizes as a domain. The anchor-as-perceiver becomes the anchor-as-law; the dantian becomes a *place* (the domain), not just a center in the body.

### 4.7 Determinism contract

- **Inputs:** the cultivator's three-dantian state vectors (lower: volume, purity, phase-balance; middle: route-capacity, switch-speed, inflammation; upper: perception-skill, filter-capacity, injury-state), plus the practice and injury history that develops them.
- **Function:** each dantian's state develops as a pure function of its inputs over time (practice → development; injury → degradation; rest → recovery). The dantian interact per §4.5.
- **Outputs:** the cultivator's reservoir capacity, routing capability, perception set.
- **Determinism oracle:** two isomorphic cultivators with identical dantian state and identical practice history produce identical dantian state at any future tick.

### 4.8 Failure modes (summary)

Per-dantian failure modes are in §§4.2-4.4. Cross-dantian failures: *dantian desynchronization* — the three dantian's rhythms fall out of sync (a generalized form of breath-motion desynchronization, per doc 24 §1.2); qi-system becomes inefficient, routings fail, perceptions are unreliable; recovery requires long synchronized practice under supervision. *Dantian collapse* — one dantian fails (typically the lower, via reservoir cracking) and the failure propagates; the cultivator reverts a station or dies; rare; produced by forced breakthroughs (per §1.7) and sufficient external shock.

---

## 5. Spiritual roots (linggen, 靈根) as a mechanic

### 5.1 The roots-profile vector

Per doc 00 §6, spiritual roots are "a developing topology of access and discrimination." Operationalized: the roots-profile is a vector over the five phases (wood, fire, earth, metal, water), with three components per phase:

- **Sensitivity** (0.0-1.0): how easily the cultivator perceives that phase in ambient qi.
- **Admission** (0.0-1.0): how easily the cultivator absorbs that phase from ambient qi into the lower dantian.
- **Conversion** (0.0-1.0): how efficiently the cultivator converts absorbed phase-qi into usable qi-state.

The profile is thus a 5 × 3 = 15-element vector, each element in [0,1]. The cultivator's roots-profile is tracked as part of their sim-state.

### 5.2 How the profile develops

Per doc 00 §6: "Roots are not fixed at birth. They develop through practice, injury, and transformation." **Use develops the root**: every practice that uses a phase develops that phase's components, at a rate proportional to the practice's intensity and the cultivator's current root-level (diminishing returns: a 0.8 root develops slower than a 0.3 root). **Injury degrades the root**: a phase-specific injury (a fire-phase contamination that damages the fire-root; a wood-phase attack that scars the wood-root) degrades the corresponding component; recovery is possible but slow. **Transformation re-architectures the root**: rare events (a specific pill, comprehension, or tribulation) can re-architect the profile — adding a root the cultivator did not have, or shifting a root's balance. These are the genre's "root transformation" tropes, made mechanical and rare.

### 5.3 Gameplay effects

A strong phase-root produces three concrete mechanical effects:

- **Admission cost reduction.** Absorbing a phase's ambient qi into the lower dantian costs attention and time. A strong root reduces both. Formula: `absorption_cost = base_cost × (1 - 0.5 × root.admission)`. A 0.8 admission root halves the cost; a 0.0 root doubles it.
- **Deviation risk reduction.** Practicing with a phase risks phase-imbalance deviation (per doc 03 Station 3). A strong root reduces the risk. Formula: `deviation_risk = base_risk × (1 - 0.6 × root.conversion)`. A 0.8 conversion root reduces deviation risk by 48%; a 0.0 root leaves it at base.
- **Phase-specific technique gate.** Some techniques require a minimum root-component to practice at all. A fire-phase sword technique may require `fire.sensitivity ≥ 0.5` and `fire.conversion ≥ 0.4`. A cultivator below the gate cannot practice the technique; the technique's manual is unreadable to them (they perceive the words but cannot apply them). This is the genre's "root-gated techniques" made mechanical and honest.

### 5.4 Heritability rule

Per doc 24 §2.4: "The initial roots-profile is seeded by the parents' qi-states at the moment of conception (the qi-climate of the womb, the parents' cultivation at that moment)."

The mechanic: at conception, the child's initial roots-profile is the *weighted average* of the parents' qi-states at that moment, with a small random perturbation (seeded by world-seed and conception-event-hash, so the same conception event produces the same child). The parents' qi-states — not their baseline roots-profiles — are the inputs: a fire-rooted parent who is currently in a water-phase environment contributes a water-leaning profile to the child. This is the "qi-climate of conception" made mechanical.

A lineage of Fire-phase cultivators will tend to produce Fire-rooted children (the parents are typically in Fire-phase states), but a child of two Fire-rooted parents may be born Water-rooted (if conception occurred during a Water-phase ritual, in a Water-phase environment, or after a Water-phase injury). And any root can be developed through practice (per §5.2). Lineage advantage is real but not deterministic.

### 5.5 Determinism contract

- **Inputs:** the cultivator's current roots-profile (15-element vector), the practice log (which phases have been used, at what intensity, for how long), the injury log, the transformation-event log.
- **Function:** each practice-tick updates the corresponding root-component by `delta = rate × intensity × (1 - current_level)`. Injuries subtract. Transformations re-architect.
- **Outputs:** the updated roots-profile, which gates techniques and modifies absorption/deviation formulas.
- **Determinism oracle:** two isomorphic cultivators with identical roots-profiles and identical practice histories have identical roots-profiles at any future tick.

### 5.6 Failure modes

- **Permanent weakness** (rare, generated): a child born with a profile so low in all phases that practice cannot meaningfully develop any root. The cultivator is "no spiritual roots" in the genre's sense. They can still cultivate (per doc 00 §6: roots-profile is *developing*, not *gating*), but slowly, with high loss, and with no access to phase-specific techniques. The genre's "mortal roots" made mechanical and non-disqualifying.
- **Phase-collapse** (rare, from severe injury): a root-component drops to 0.0. The cultivator cannot perceive, absorb, or convert that phase at all. Recovery requires transformation (per §5.2), which is rare and costly.
- **Root-fixation** (a mild deviation, per doc 24 §1.2's route-fixation family): a cultivator who develops one root to 0.9+ while leaving others at 0.2 becomes *phase-locked* — they perceive the world overwhelmingly through their strong phase. The genre's "talented but unbalanced" cultivator.

---

## 6. Dual cultivation (xingming shuangxiu, 性命雙修)

### 6.1 The central tension, named

The xianxia genre expects dual cultivation in two senses:

- **The inner-nature sense** (性命雙修 proper): 性gong (xinggong, nature-cultivation — heart-mind, comprehension, integration of 心魔) and 命gong (minggong, life-cultivation — body, meridians, dantian) as parallel tracks. The genre's tradition treats these as the two halves of the path; the cultivator who develops one without the other is incomplete.
- **The esoteric sense** (the sexual dual cultivation trope): a male and female cultivator practicing together, exchanging yin and yang qi to accelerate each other's cultivation. The genre uses this as a power-acceleration trope — the protagonist finds a yin-attributed partner and gains a station in weeks.

The doctrine (AGENTS.md Part 3) forbids power acceleration. The esoteric sense, taken straight, is power acceleration. This section confronts the tension directly, chooses a side, and defends it.

### 6.2 The decision and its defense

**The decision:** Dual cultivation in the inner-nature sense (性命雙修 proper) is canonical and required. Dual cultivation in the esoteric sense exists in the world but does not produce power acceleration; it produces *balance* — reduced deviation risk and increased comprehension rate for both partners, at the cost of mutual commitment and shared risk. It is a practice, not a cheat.

**The defense.** The esoteric trope is power acceleration by another name. To ratify it would violate the doctrine's "no power acceleration" rule (doc 00 §0) and undermine the determinism contract (a partnered cultivator would progress faster than an isomorphic solo cultivator). The trope also carries the genre's worst gender politics (the "furnace" trope, in which a male cultivator extracts yin from a female partner to his benefit and her detriment); ratifying it would import those politics unexamined.

The doctrine also says: "Do not dissolve the tension by redefinition and then assert the residue is 'worth it.' Name the tension, choose a side, defend the choice, and provide a positive account of what the user gets instead." The positive account is in §§6.3-6.6 below. The user gets a cultivation system in which partnership matters — but as *balance*, not as *acceleration*.

### 6.3 命gong (minggong) — the life track

The 命 track is the cultivation of the body-and-qi system: body cultivation, meridian opening, dantian development, the lower and middle dantian (per §4). Its verbs are the body-and-qi verbs of Qi Condensation and Foundation Establishment: route qi (運氣), form a meridian (開脈), integrate a practice (合修).

**What it develops.** The 命 track develops the lower and middle dantian, the meridian system, the body's physical envelope, the cultivator's reservoir capacity, routing speed, and physical durability. It is the *power* track in the limited sense the doctrine allows: it makes the cultivator more capable within their station's envelope. **What it does not develop:** the upper dantian, the heart-mind (per §7), comprehension (per §3), or resolution of 心魔. A cultivator who develops only 命 is powerful but unstable — strong reservoir, fast routing, durable body, but unresolved psychospiritual material accumulates and 心魔 risk rises.

### 6.4 性gong (xinggong) — the nature track

The 性 track is the cultivation of the heart-mind: comprehension, integration of 心魔, the upper dantian's self-perception, the slow maturation of attention, will, emotional-balance, and the resolution of attachments. Its verbs are the perception-and-integration verbs: sense self (感身), integrate a disturbance (合), comprehend a fragment (悟), confront a 心魔 (對魔).

**What it develops.** The 性 track develops the upper dantian, the heart-mind state vector (per §7), the comprehension skill, the integration capacity. It is the *wisdom* track: it makes the cultivator more perceptive, more stable, more able to integrate what they experience. **What it does not develop:** the lower or middle dantian, the reservoir, routing speed, or the body. A cultivator who develops only 性 is wise but fragile — they perceive clearly and integrate well, but their reservoir is too small to sustain the practices their comprehension opens, and their body is too weak to survive the experiences their perception invites.

### 6.5 The balance requirement

Asymmetry between 命 and 性 produces deviation risk. Track `minggong_level` (0.0-10.0, cumulative 命 development) and `xinggong_level` (0.0-10.0, cumulative 性 development). The asymmetry is `|minggong_level - xinggong_level|`. Deviation risk multiplier: `1 + (asymmetry / 3)` (asymmetry 0 → 1.0; 3 → 2.0; 6 → 3.0). At asymmetry ≥ 4, the cultivator is flagged `unstable`; their breakthrough rites (per §1) have `forced_attempt` set automatically true (the integration cannot proceed cleanly; the confrontation is intense regardless of preparation).

The cultivator who develops 命 without 性 becomes powerful but unstable (心魔 risk high; breakthroughs fail). The cultivator who develops 性 without 命 becomes wise but fragile (insufficient qi to sustain the practice; physical exhaustion). The genre's "imbalance produces deviation" is now a number.

### 6.6 The "not the esoteric sense" clarification

Sexual dual cultivation exists in the world. Two cultivators may practice together (per doc 03 Station 3, synchronize practice 同修, expanded to include the esoteric practice for partners who consent). The practice requires: consent (non-consensual practice is a crime under every jurisdiction, produces 心魔 in the victim and karma-trace in the perpetrator), compatibility (the partners' phase-profiles must be complementary, not identical), and time (a single session is hours; meaningful benefit requires regular practice over months).

- **What it produces.** For each partner: `deviation_risk *= 0.7` (a 30% reduction) and `comprehension_rate *= 1.3` (a 30% increase), sustained while the practice continues and decaying over weeks after. The benefit is *balance*, not acceleration — cultivation rate unchanged; deviation risk drops; comprehension opens up.
- **What it does not produce.** No reservoir gain. No routing speed gain. No station gain. No acceleration of any kind. A cultivator who practices dual cultivation for a year is at the same station they would have been without; they are *more stable* and *more comprehending*, not more powerful.
- **The cost.** Mutual commitment (the practice ties the partners' heart-minds; a betrayal produces 心魔 in both). Shared risk (an injury to one affects the other). Social visibility (the practice is perceptible to higher-realm cultivators).

This is the genre's dual cultivation trope, re-engineered as a *practice* rather than a *cheat*. The doctrine's "confront the central tension directly" rule made mechanical: the genre expects the trope, the doctrine forbids the acceleration, the resolution keeps the trope's *form* (partners practicing together, exchanging qi) and changes its *function* (balance, not acceleration).

### 6.7 Determinism contract

- **Inputs:** the cultivator's `minggong_level` and `xinggong_level`, the partner's levels (for dual cultivation), the consent and compatibility flags.
- **Function:** asymmetry → deviation-risk multiplier. Dual-cultivation session → both partners' deviation-risk and comprehension-rate modified, for the session's duration plus decay.
- **Outputs:** updated deviation-risk and comprehension-rate; updated 心魔 risk.
- **Determinism oracle:** two isomorphic cultivators with identical 命/性 levels have identical deviation risk. Two isomorphic pairs have identical dual-cultivation benefits.

### 6.8 Failure modes

- **命-only cultivation** (the most common failure). 命 develops fast, 性 slowly. Asymmetry grows; deviation risk rises; breakthroughs fail. The genre's "powerful cultivator with a hidden 心魔" trope.
- **性-only cultivation** (rarer). 性 develops fast, 命 slowly. Fragments comprehended that cannot be sustained; reservoir exhausts during the practices their comprehension opens; physical fragility.
- **Non-consensual dual cultivation** (a crime, generated). Perpetrator gains karma-trace (per doc 24 §2.1) and 心魔 risk; victim gains 心魔 (often obsessive or fragmentation type) and possible roots-profile damage. The world's institutions treat this as a serious crime.
- **Incompatible partnership** (the failed practice). Two cultivators whose phase-profiles are not complementary. The practice produces imbalance, not balance; both partners' deviation risk *rises*. They must end the practice or risk deviation.

---

## 7. Heart-mind (xin, 心) as a cultivation dimension

### 7.1 The heart-mind state vector

The heart-mind is tracked as a four-element state vector, each element a value in [0, 1] representing the dimension's *current development*, not a meter that fills and depletes:

| Dimension | Hanzi | What it is | What low looks like | What high looks like |
|---|---|---|---|---|
| Attention | 念 | Capacity to direct perception and hold it | Easily distracted; perception flickers | Sustained perception; can hold multiple objects |
| Will | 志 | Capacity to sustain practice under difficulty | Gives up under discomfort; breaks commitments | Endures; follows through |
| Emotional-balance | 和 | Capacity to feel without being destabilized | Swept by emotion; mood-driven action | Feels fully; remains oriented |
| Unresolved-attachments | 結 | (Inverted: low is good) The mass of unintegrated attachment | Many open loops; grief, desire, hatred, fear are loose | Few open loops; what was is integrated |

The four are not independent; they interact. High attention with low will produces the cultivator who perceives everything and acts on nothing. High will with low emotional-balance produces the cultivator who endures but is driven by what they endure. High emotional-balance with high unresolved-attachments is unstable (the balance cannot hold against the mass). The four must develop together, which is the 性 track's core discipline.

### 7.2 How each dimension develops

- **Attention** develops through perception practice. Every sustained perception verb (sense qi, sense self, read residue, comprehend) develops attention at a rate proportional to duration and difficulty. Perception fatigue (per doc 03 Station 2) is the brake; the cultivator cannot develop attention faster than their fatigue recovers.
- **Will** develops through sustained practice under difficulty. Practicing when tired, injured, emotionally disturbed, or when the practice is not yielding results (a plateau, per §2.2) develops will, proportional to difficulty and success at sustaining. A cultivator who gives up does not develop will; one who endures does. The genre's "tempering" trope, made mechanical.
- **Emotional-balance** develops through the integration of disturbances. Every time a strong emotion arises and the cultivator integrates it (per §1.4 Stage 3, generalized to non-rite contexts), emotional-balance develops, proportional to the emotion's intensity and the integration's success. A cultivator who never feels strongly does not develop emotional-balance; one who feels strongly and integrates develops fastest.
- **Unresolved-attachments** (inverted) develops through confronting and resolving them. Every tracked attachment has an integration-progress (0.0-1.0, per §1.4 Stage 1). When it reaches 1.0, the attachment is resolved — not gone, but no longer *unresolved*. The cultivator's `unresolved_attachments` value is the count of attachments with integration-progress < 1.0, weighted by intensity.

### 7.3 The heart-mind and the realm ladder

Each station adds a heart-mind verb — a new thing the cultivator can do with their heart-mind that they could not before:

| Station | Heart-mind verb | What it does |
|---|---|---|
| Mortal | (none) | The heart-mind is untrained; emotions are felt and acted on |
| Qi Induction | **Sense own emotional state** (感心) | The cultivator can perceive their own emotional state as a qi-quality, not just feel it |
| Qi Condensation | **Regulate emotional state** (調心) | The cultivator can intentionally shift their emotional state by routing and breathing (per doc 05 §2.4) |
| Foundation Establishment | **Integrate a disturbance** (合) | The cultivator can integrate a strong emotion into the heart-mind, resolving it (the verb used in breakthrough Confrontation, generalized to non-rite contexts) |
| Core Formation | **Perceive others' heart-mind states** (見心) | The cultivator can perceive (faintly, with consent or with attention) another being's emotional state, by attending to their qi-signature |
| Nascent Soul | **Project heart-mind influence** (傳心) | The cultivator can intentionally project an emotional state — calm, fear, awe — outward, affecting those around them. A controlled, costly verb; its misuse is a crime |

The ladder is qualitative, not scalar (per doc 00 §3). A Core Formation cultivator can perceive another's heart-mind; a Qi Condensation cultivator cannot. This is not a difference of degree but of kind.

### 7.4 The 心魔 onset threshold function

The critics identified a missing threshold: *when does 心魔 onset?* The mechanic:

A **perturbation** is any strong emotional event: grief (a death), fear (a danger), desire (an encounter), hatred (an attack). Each perturbation has an intensity (0.0-1.0). The cultivator's current heart-mind capacity and the onset function:

```
capacity = (attention + will + emotional_balance + (1 - unresolved_attachments)) / 4
if perturbation.intensity > capacity:
    xinmo_onset = true
    xinmo_type = perturbation.type   # grief → obsession; fear → compulsion; desire → obsession; hatred → fragmentation
    xinmo_intensity = perturbation.intensity - capacity
else:
    xinmo_onset = false   # the perturbation is integrated naturally; emotional_balance develops
```

The function is deterministic. A cultivator with capacity 0.4 confronting a perturbation of intensity 0.6 onsets 心魔 of intensity 0.2. The same cultivator, after developing their capacity to 0.7, confronting the same perturbation, does not onset 心魔 — the perturbation is integrated, and emotional_balance grows. This is the genre's "the cultivator was not ready" trope, made into a number. The function is checked on every perturbation event (a death in the family, a bandit attack, a profound encounter, a betrayal). The player does not see the number; they experience the 心魔 or the integration. The engine knows.

### 7.5 Determinism contract

- **Inputs:** the heart-mind state vector, the perturbation event log (each event with type and intensity), the cultivator's practice history (which develops the dimensions).
- **Function:** dimensions develop per §7.2. Perturbations are checked against capacity per §7.4. 心魔 onset is deterministic given the inputs.
- **Outputs:** the heart-mind state, the 心魔 state (or none), the integration-progress on tracked attachments.
- **Determinism oracle:** two isomorphic cultivators with identical heart-mind state, encountering identical perturbations, onset (or do not onset) identically.

### 7.6 Failure modes

- **Unchecked perturbation** (the most common 心魔 path). A perturbation exceeds capacity; 心魔 onsets; the cultivator does not realize it (心魔 is invisible to its bearer). The cultivator's behavior shifts; the player sees the shift before they understand the cause. Resolution requires perceiving the 心魔 (a teacher's intervention or the cultivator's own upper-dantian development) and integrating it (per §1.4 Stage 3, generalized).
- **Capacity stagnation** (the slow failure). The cultivator does not develop their heart-mind; capacity stays low; perturbations accumulate; eventually one exceeds capacity and 心魔 onsets. The genre's "cultivator who never matured" trope.
- **Over-development of one dimension** (the unbalanced heart-mind). A cultivator with attention 0.9, will 0.9, emotional-balance 0.2, unresolved-attachments 0.5 has capacity 0.625 — but their emotional-balance is so low that any perturbation that *does* exceed capacity onsets a 心魔 of unusual intensity. The genre's "cold sword cultivator" trope.
- **Attachment-resolution failure** (the unresolved). The cultivator cannot integrate a specific attachment — the grief too raw, the hatred too justified, the desire too consuming. Integration-progress stalls; `unresolved_attachments` stays high; capacity stays low; 心魔 risk stays high. Resolution requires the specific confrontation (per §1.4 Stage 3) or a life experience that re-frames the attachment. The genre's "the cultivator must confront their past" trope.

---

## 8. How the seven systems compose

The seven systems are seven views of one mechanic — the cultivator's development as a lawful process. They compose as follows:

- **Breakthrough** (§1) is the event that advances the cultivator along the realm ladder; it consumes the products of the other six.
- **Bottlenecks** (§2) are the gates between breakthroughs; they are resolved by **comprehension** (§3), by **heart-mind** development (§7), by **dual cultivation** balance (§6), or by **roots** development (§5).
- **Comprehension** (§3) produces law-fragments that unlock perceptions and resolve plateaus; it is gated by the **heart-mind's** capacity and produces **心魔** if over-used.
- **The three dantian** (§4) are the substrate the breakthrough integrates; their development is the slow work of years between breakthroughs.
- **Spiritual roots** (§5) gate the practices that develop the dantian; they are inherited (per §5.4) and develop through use.
- **Dual cultivation** (§6) is the balance discipline that keeps **命** (lower and middle dantian) and **性** (upper dantian and heart-mind) in proportion; without it, the cultivator is unstable.
- **Heart-mind** (§7) gates 心魔 onset and is what the breakthrough's Confrontation stage tests; it is the brake and the engine of the cultivator's stability.

The composition is the internal-alchemy chain (doc 24 §2.3): 煉精化氣 (Foundation Establishment — body/qi integration, lower dantian) → 煉氣化神 (Core Formation — qi/spirit integration, middle dantian) → 煉神還虛 (Nascent Soul — spirit/void integration, upper dantian) → 煉虛合道 (Spirit Severance — void/Dao integration, the domain). Each chain station is a breakthrough that integrates the next dantian, gated by heart-mind capacity, supported by roots development, balanced by the 命/性 discipline, and resolved through comprehension when the cultivator is stuck.

---

## 9. Open decisions (surfaced for review)

Per AGENTS.md Part 3: "Exhibit reviewer voices; do not self-certify." All are tuning parameters, not forks:

1. **50% coin on unstable-integration** (§1.4 Stage 4). Seeded RNG (per doc 13 §1.5's wrapper). Alternative — deterministic failure from exact instability — rejected as feeling mechanical rather than dramatic.
2. **0.30 phase-balance tolerance** (§1.4 Stage 1). Calibration to playtest.
3. **30-day plateau window** (§2.2). Genre's "stuck for a season" trope; may need 14 or 60.
4. **15-element roots-profile** (§5.1). Whether sensitivity and admission collapse into one component is open.
5. **Dual-cultivation magnitudes** (§6.6): 0.7 deviation, 1.3 comprehension. May need 0.8/1.2 or 0.6/1.4.
6. **心魔 onset threshold** (§7.4). Clean `intensity > capacity` rule chosen for determinism; a softer sigmoid is the alternative at the cost of a tuning parameter.
7. **命/性 asymmetry multiplier** (§6.5): `1 + (asymmetry / 3)`. Divisor 3 is a guess; Scene 4 playtesting calibrates.

---

## 10. Doctrine compliance

- **Build the engine, not just the brake:** the prior corpus had the brake and not the engine. This document specifies the engine.
- **Make decisions; do not defer:** all seven systems are decided. §9 are tuning parameters, not forks.
- **Confront the central tension directly:** §6 names the dual-cultivation tension (genre wants acceleration; doctrine forbids it), chooses the doctrine's side, defends it, provides a positive account (balance, not acceleration).
- **Cite the precedent:** Cultist Simulator (ascension rite), Sekiro (perilous-attack readable tell). Both named; contributions specified.
- **Design for joy first:** the breakthrough is now a multi-stage long verb the player actively guides. The bottleneck is mechanically honest. The heart-mind has a real threshold function.
- **Determinism contract:** every system has one. The isomorphic-NPC oracle applies to all seven.
- **Coherence with yin-yang and the alchemy chain:** every system is coherent with the ratified yin-yang of body/qi/anchor (doc 24 §2.3) and the internal-alchemy chain. The dantian chain (§4.6) and the breakthrough's coherence meters (§1.4) make the coherence explicit.

This is the cultivation bible. With it, the seven systems the critics identified as missing are mechanically complete. The prototype can begin.
