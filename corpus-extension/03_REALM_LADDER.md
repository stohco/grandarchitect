# 03 — The Ten Stations

**Status:** `[CANON]` Candidate canon. The first three stations (Mortal, Qi Induction, Qi Condensation) are specified in enough detail for prototype. The upper seven are specified enough to design against but not yet playtested.
**Date:** 2026-08-03
**Truth level:** Canonical invariant (realm ladder structure) + Derived (cultivator measurements) + Art-directed (motion profiles)
**Implements:** `engine-architecture/51_MULTIVERSE_GROUND_TRUTH_ARCHITECTURE.md`, `corpus-extension/50_GROUND_TRUTH_SYSTEM_SPECIFICATION.md`, `corpus-extension/52_MEASUREMENT_AND_SCALE_SYSTEM.md` (human-scale anchors), `corpus-extension/55_MOTION_AND_EFFECT_GRAMMAR.md` (MotionProfiles per realm)
**Implementation status:** `[SPEC]` — fully specified for stations 1–3; `[UNRESOLVED]` for stations 4–10 playtest values

---

## Ground-Truth Specification Summary

> `[CANON]` The cultivation ladder has exactly ten stations: Mortal → Qi Induction → Qi Condensation → Foundation Establishment → Core Formation → Nascent Soul → Spirit Severance → Void Amalgamation → Grand Ascension → Tribulation Transcendence. No station may be skipped. No station may be inserted between two existing ones without formally revising the universe.

> `[CANON]` Each station doubles approximate qi capacity relative to the previous station (exponential scaling). The multiplier is exactly 2.0 for canonical purposes.

> `[DERIVED]` Cultivator body height increases slightly with realm due to qi densification: Mortal 1.68m → Qi Induction 1.72m → Qi Condensation 1.75m → Foundation 1.78m → Core Formation 1.80m → Nascent Soul 1.82m. Above Nascent Soul, body form becomes variable (some shrink, some grow, some transcend humanoid form).

> `[ART]` Movement speed scaling per realm follows a cinematic curve, not a physical one. The values are chosen for readability, not biological plausibility.

> `[PROC]` Breakthrough timing varies by ±30% based on talent, resources, and environment. The typical values are canonical; the range is procedural.

> `[UNRESOLVED]` Whether stations 6–10 have canonical body-size specifications or whether they are deliberately variable — see `/questions/realm-ladder.yaml#upper-station-body-size`.

### PhysicalSpecification — Cultivator by realm

| Station | Height (m) | Mass (kg) | Max Speed (m/s) | Turn (rad/s) | Flight? |
|---------|-----------|----------|-----------------|-------------|---------|
| Mortal | 1.55–1.80 (1.68) | 50–78 (62) | 1.1–1.5 (1.3) | 2.0–3.5 (2.8) | No |
| Qi Induction | 1.60–1.85 (1.72) | 52–80 (64) | 2.0–4.0 (3.0) | 3.0–5.0 (4.0) | No (hover 0.2m) |
| Qi Condensation | 1.62–1.88 (1.75) | 54–82 (66) | 8–15 (12) | 4.0–8.0 (6.0) | Yes |
| Foundation Establishment | 1.65–1.90 (1.78) | 56–85 (68) | 15–30 (22) | 5.0–10.0 (7.5) | Yes |
| Core Formation | 1.68–1.92 (1.80) | 58–88 (70) | 30–60 (45) | 6.0–12.0 (9.0) | Yes |
| Nascent Soul | 1.70–1.95 (1.82) | 60–92 (72) | 60–120 (90) | 8.0–16.0 (12.0) | Yes (spatial) |
| Spirit Severance | variable | variable | 120–300 (200) | 10.0–20.0 (15.0) | Yes (spatial) |
| Void Amalgamation | variable | variable | 300–1000 (600) | 15.0–30.0 (22.0) | Yes (dimensional) |
| Grand Ascension | variable | variable | 1000+ | 20.0+ | Yes (dimensional) |
| Tribulation Transcendence | transcendent | transcendent | unbounded | unbounded | Transcendent |

### MotionProfile — Qi Condensation cultivator (flying)

```json
{
  "id": "motion-qi-condensation-flying",
  "idleBehavior": { "posture": "upright, hovering 0.2m above ground", "microMovements": "qi circulation shimmer", "ambientMotion": "robe sway, hair lift" },
  "maximumSpeedMetersPerSecond": { "min": 8, "max": 15, "typical": 12 },
  "accelerationCurve": "exponential-qi",
  "decelerationCurve": "inverse-qi",
  "turnRateRadiansPerSecond": { "min": 4.0, "max": 8.0, "typical": 6.0 },
  "minimumTurnRadiusMeters": { "min": 1.5, "max": 4.0, "typical": 2.5 },
  "motionStyleTags": ["gliding", "effortless", "qi-enhanced"],
  "cameraPresentation": { "followMode": "spring", "followDistanceMeters": { "typical": 6 }, "lagSeconds": { "typical": 0.08 } }
}
```

### MotionProfile — Foundation Establishment cultivator (flying)

```json
{
  "id": "motion-foundation-flying",
  "maximumSpeedMetersPerSecond": { "min": 15, "max": 30, "typical": 22 },
  "accelerationCurve": "exponential-qi-strong",
  "turnRateRadiansPerSecond": { "min": 5.0, "max": 10.0, "typical": 7.5 },
  "minimumTurnRadiusMeters": { "min": 1.0, "max": 3.0, "typical": 1.8 },
  "motionStyleTags": ["gliding", "purposeful", "foundation-stage"],
  "cameraPresentation": { "followMode": "spring", "followDistanceMeters": { "typical": 8 }, "lagSeconds": { "typical": 0.06 } }
}
```

### Supernatural Exception — Qi-enhanced speed

> `[CANON]` Qi-enhanced movement overrides the ordinary expectation that the human body cannot sustain 15+ m/s without skeletal-muscular damage.

- **Ordinary rule overridden:** Human biomechanical speed limit (~10 m/s sprint, ~1.5 m/s sustained)
- **Power enabling:** Qi circulation reinforces bones, tendons, and joints. Qi Condensation realm minimum.
- **Limits:** Qi cost scales with speed squared. Cannot exceed realm-specific maximum (see table above). Fails if qi depleted.
- **Visible cues:** Afterimage trail at speeds above 8 m/s; robe and hair stream backward; faint qi shimmer on legs; footstep audio suppressed at high speed (qi cushions impact).
- **Failure behavior:** If qi depleted mid-movement: immediate deceleration to mortal speed (1.5 m/s) over 0.5s. No damage but vulnerable.
- **System interactions:** Collision (full physical collision maintained); Animation (gait transitions to qi-gliding pose above 8 m/s); Audio (footstep volume inversely proportional to speed).

### Forbidden interpretations

- `[FORBIDDEN]` Skipping a realm (e.g., Mortal → Foundation directly). The ladder is linear.
- `[FORBIDDEN]` Nascent Soul+ cultivators with fixed humanoid body size (body form becomes variable above Core Formation).
- `[FORBIDDEN]` Tribulation Transcendence cultivators with measurable speed/turn values (they are transcendent — unbounded).
- `[FORBIDDEN]` Qi-enhanced speed without visible body cost (qi shimmer, afterimage, robe streaming must be present).
- `[FORBIDDEN]` A mortal moving faster than 2.0 m/s without explicit qi enhancement or supernatural exception.

### Acceptance tests

- `realm-ladder.linear` — no cultivator skips a station
- `realm-ladder.exactly-ten` — there are exactly 10 stations, no more, no less
- `realm-ladder.qi-capacity-doubles` — each station's qi capacity is 2× the previous
- `realm-ladder.speed-within-range` — cultivator speed matches the table for their realm
- `realm-ladder.body-size-consistent` — cultivator height matches the table for stations 1–6
- `realm-ladder.no-mortal-supernatural-speed` — mortals do not exceed 2.0 m/s without qi enhancement

---

## 0. How to read this document

Each station is specified with the same eight fields, per the doctrine's demand that "every cultivation realm must add perceptions, verbs, responsibilities, constraints, and failure modes — not merely numbers":

1. **Essence** — one sentence on what this station *is*.
2. **Lifespan** — how long a cultivator at this station typically lives.
3. **New perceptions** — what the cultivator can now perceive that they could not before.
4. **New verbs** — what the cultivator can now *do* that is genuinely distinct (not a renamed older verb).
5. **New responsibilities** — what the world now expects of them.
6. **New constraints** — what they cannot do, even if they could before, or what is now dangerous that was not before.
7. **Failure modes** — how they fail, specifically.
8. **What it feels like** — the phenomenology, written for a designer who needs to build the experience.

The doctrine's test: "A purported new verb does not count if it becomes an older verb after normalizing names, scale, target count, numbers, and VFX." Every verb below is checked against that test. Where a verb risks collapsing into an older one, the differentiation is named explicitly.

---

## Station 1: Mortal (凡人, *fánrén*)

### Essence
An ordinary human with no cultivation. Life is short, labor is hard, death is final.

### Lifespan
~40-60 years. Child mortality ~40%; those who survive childhood and avoid schistosomiasis/TB can reach 60-70.

### New perceptions
None beyond ordinary human senses. The mortal world is what it appears to be: rice, river, lineage, obligation, season.

### New verbs
The mortal verbs are the substrate verbs (document 04): carry water, transplant rice, harvest grain, weave cloth, sweep tombs, cast hexagrams, attend council, borrow grain, mourn the dead. These are not "cultivation verbs" but they are the verbs the first 10-50 hours of play are built from. They must feel like life, not tutorial.

### New responsibilities
Kinship obligations: filial piety (孝, *xiào*), lineage dues, ritual attendance, care of the elderly and young. Economic obligations: tax, rent, corvée. Social obligations: reciprocity (人情, *rénqíng* — the web of mutual debt and favor that holds the village together).

### New constraints
Mortality. A mortal cannot survive a sword cut to the torso. A mortal cannot cross a flooded river. A mortal cannot lift more than ~60-80 jin. A mortal cannot see in the dark. A mortal cannot perceive qi, and therefore cannot perceive most of what cultivation will later reveal.

### Failure modes
- **Starvation** in a bad harvest year
- **Disease** (schistosomiasis, TB, malaria, smallpox, childbirth fever)
- **Violence** (bandits, a yamen runner's beating, a lineage feud)
- **Exposure** (a winter without fuel)
- **Old age** — the slow failure of the body

### What it feels like
The world is heavy and close. The rice paddy's mud is between your toes. The well water is cold on your hands at dawn. The lineage head's voice carries authority you do not question. The salt merchant's warehouse is a place of wealth you cannot imagine possessing. The graveyard on the hill is where your grandparents are, and where you will be. The river is beautiful in summer and terrifying in flood. Time moves at the pace of seasons: slow, rhythmic, inescapable. You do not know there is such a thing as qi. You do not know there is such a thing as a cultivator. You know rice, river, lineage, season, death. That is the world.

The fantasy at this station is *belonging* — to a place, a people, a rhythm. The loss, when it comes, is the discovery that the rhythm is not the whole world.

---

## Station 2: Qi Induction (引气, *yǐnqì*)

### Essence
First perception and circulation of qi. The world reveals a layer you did not know was there. You cannot yet *do* anything with it; you can only perceive.

### Lifespan
Unchanged from mortal (~40-60 years). Qi Induction does not extend lifespan.

### New perceptions
- **Ambient qi perception.** You can now perceive qi as a faint, flowing presence in the environment: the qi of the river (cool, yin, water-phase), the qi of the noon sun (hot, yang, fire-phase), the qi of the lineage hall (dense, old, human — the accumulated residue of nine generations of rites), the qi of the graveyard (cold, still, faintly bitter — the residue of the dead). This perception is not continuous; it requires attention, and it is exhausting. At first it lasts seconds; with practice, minutes.
- **Residue perception.** You can perceive the qi-residue of recent significant events: where a fight happened, where someone died, where a strong emotion was felt. The residue fades over hours to days. This is the perception the protagonist's advantage (Residual Error Sense) enhances — but only for their *own* attempts, not for ambient events.
- **Self-perception.** You can faintly perceive your own body's qi state: the warmth in your hands after exercise, the cold in your chest after grief, the agitation after anger. This is the beginning of the inner awareness that cultivation will deepen.

### New verbs
- **Sense qi (感氣, *gǎnqì*).** Direct attention to perceive ambient qi. Costs attention; cannot be done while performing heavy labor or while distracted.
- **Sense residue (感殘, *gǎncán*).** Direct attention to perceive the qi-residue of a recent event at a location. Requires being at the location; residue fades.
- **Sense self (感身, *gǎnshēn*).** Direct attention inward to perceive your own qi state. The first step of self-regulation.

These are genuinely new verbs (not renamed older ones) because they require *a new perceptual modality* — qi — that mortals do not have. You cannot "sense qi" by looking harder; you must develop the perception.

### New responsibilities
None yet enforced by the world. But the cultivator-to-be begins to notice things they cannot act on: the schistosomiasis in the paddies (they can now perceive the faint unwell qi of the parasite), the grief in a widow's chest (they can perceive the cold knot of it), the anger in a lineage dispute (they can perceive the hot flare). Perceiving suffering you cannot yet relieve is its own burden.

### New constraints
- **Perception fatigue.** Qi perception is exhausting. A new inductee can sustain it for seconds; an experienced one for minutes. Trying to push past fatigue produces headache, nosebleed, and temporary blindness.
- **No output.** Qi Induction grants perception only. You cannot move qi, shape it, or project it. You can only watch. This is frustrating by design — it builds the desire to progress.

### Failure modes
- **Perception burn.** Overusing qi perception without rest produces sensory burn: headache, nosebleed, temporary inability to perceive qi (lasting hours to days), and in extreme cases, permanent damage to the perception.
- **Misinterpretation.** The inductee perceives qi but does not understand it. They may mistake the lineage hall's dense old qi for a spirit, the graveyard's cold qi for a demon, their own agitation for cultivation progress. Misinterpretation is the most common failure and the most dangerous, because it leads to wrong action.
- **Psychospiritual disturbance (early 心魔).** A sensitive inductee who perceives the qi-residue of a traumatic event (a murder, a death, a rape) may internalize it, developing the first seeds of a heart-demon. This is rare at Qi Induction but possible.

### What it feels like
The world gains a layer. It is still the same world — the rice paddy, the river, the lineage hall — but now there is *something else* in it, a faint flowing presence you had never noticed. The first time you perceive it, you cannot tell whether you are imagining it. The second time, you are sure. The third time, you weep, because the world is larger than you knew and you are smaller in it.

The river's qi is cool and dark and moving. The sun's qi is hot and bright and pressing. The lineage hall's qi is dense and old and smells, in the qi-sense, of incense and old sweat and the faint bitter residue of grief. The graveyard's qi is cold and still and faintly sweet, like decay.

You cannot do anything with this. You can only watch. You watch the schistosomiasis in the paddies and you know, now, why the villagers are tired. You watch the widow's grief and you know, now, why she is cold. You watch your own hands after labor and you see the faint qi-residue of effort, fading. You begin to understand that the world has a hidden grammar, and you are learning to read it, but you cannot yet write.

The fantasy at this station is *revelation* — the world is more than it appeared. The frustration is *helplessness* — you can see but not act.

---

## Station 3: Qi Condensation (凝气, *níngqì*)

### Essence
First self-sustaining inner order. You can route qi through your body to enhance physical output within the envelope, and you can leave traces in the world.

### Lifespan
Unchanged from mortal. Qi Condensation does not extend lifespan. (This is a deliberate choice: lifespan extension begins at Foundation Establishment, not before, so that the mortal stakes of the first three stations remain real.)

### New perceptions
- **Internal qi circulation perception.** You can perceive your own qi circulating — the routes (經脈, *jīngmài*, meridians), the reservoirs (丹田, *dāntián*), the gates (竅, *qiào*). This is the inner geography that cultivation will deepen for the rest of your life.
- **Qi-quality perception.** You can now perceive not just ambient qi's presence but its *quality*: phase-affinity (wood, fire, earth, metal, water), yin-yang signature, purity, contamination. The river's qi is not just "cool yin water"; it is "cool yin water with a faint metal-phase contamination from the upstream ironworks."
- **Residue shaping perception.** You can perceive not just that residue exists but how it is shaped — whether it is a trace of motion, of emotion, of intent, of violence. This is the perception that makes tracking and investigation possible.

### New verbs
- **Route qi (運氣, *yùnqì*).** Direct qi through a specific meridian to enhance a specific physical output: strength, speed, sensory acuity, heat resistance, cold resistance. This is bounded by the envelope (per the mountain-proof oracle): a Qi Condensation cultivator can lift ~200-400 jin, sprint ~8-12 m/s, survive a fall of ~8-15m. They cannot split a mountain.
- **Anchor a trace (留痕, *liúhén*).** Leave a qi-trace at a location that you (or another cultivator) can later perceive. The trace can carry intent: a warning, a marker, a message. It fades over days to weeks unless sustained.
- **Vent into a sink (洩氣, *xièqì*).** Discharge excess or contaminated qi into a suitable sink: flowing water, certain minerals, a prepared formation. This is the safety valve of cultivation; without it, excess qi produces deviation.
- **Read residue (讀殘, *dúcán*).** Examine a qi-residue in detail to determine its nature, age, and source. This is the investigative verb — used to track, to identify, to reconstruct events.
- **Synchronize practice (同修, *tóngxiū*).** Practice alongside another cultivator to mutually regulate qi state. Requires consent; produces a faint shared rhythm. This is the foundation of dual cultivation (性命雙修) in the inner-nature sense, not the esoteric sense.
- **Begin a practice (起修, *qǐxiū*).** Commit to a specific cultivation practice — a route, a breathing pattern, a meditative focus — that will develop your qi-system over time. This is the long verb: a practice is maintained for months or years, not minutes.

### New responsibilities
- **Register with a sect or lineage.** A Qi Condensation cultivator is now a *cultivator* by the reckoning of the cultivation world (修真界, *xiūzhēnjiè*). They are expected to have a teacher, a lineage, or a sect. An unaffiliated cultivator (散修, *sǎnxiū*) is suspect, vulnerable, and limited.
- **Restrain output among mortals.** Using qi-enhanced strength in a mortal dispute is a crime under most jurisdictions. The lineage head can no longer discipline you with a beating, but the county magistrate's yamen runners will come if you break someone's arm with a qi-enhanced grip.
- **Acknowledge debts.** A Qi Condensation cultivator's debts — to teachers, to sects, to lineage — are now tracked by the cultivation world, not just by the village. Defaulting has consequences beyond social disapproval.

### New constraints
- **The envelope.** Per the mountain-proof oracle, a Qi Condensation cultivator cannot personally split a huge mountain, move a river, or survive a fall from a great height. Their output is bounded.
- **Reservoir limits.** A Qi Condensation cultivator has a finite qi reservoir. Sustained output depletes it; recovery takes hours. A cultivator who exhausts their reservoir in a fight is, thereafter, as weak as a mortal.
- **Contamination accumulation.** Qi absorbed from the environment carries the environment's signature. A cultivator who absorbs metal-phase qi from an ironworks may develop metal-phase imbalance; a cultivator who absorbs grief-residue from a murder scene may develop psychospiritual contamination. Venting is necessary.
- **Visibility.** A Qi Condensation cultivator's qi-use is perceptible to other cultivators. They cannot hide their practice from a Core Formation or higher cultivator. Among mortals they are inconspicuous (their qi is too faint for mortals to perceive), but in the cultivation world, they are a small bright point.

### Failure modes
- **Somatic deviation (走火入魔, somatic).** The five somatic deviations from the Qi Condensation draft: false circuit (假周天), cross-current (逆流), route fixation (路執), borrowed signature adhesion (借氣附著), breath-motion desynchronization (息動失調). Each has a formation process, a tempting benefit, a cost, and a counterplay. None is a random punishment.
- **Psychospiritual deviation (心魔, *xīnmó*).** The first station where 心魔 can fully manifest. Causes: practicing while emotionally disturbed, comprehending a fragment of Dao without stabilizing context, witnessing something the cultivator is not ready for, accumulating psychospiritual residue from violence (even lawful violence, if the cultivator is not prepared). Manifestations: obsession (with a person, a goal, a perceived slight), compulsion (repetitive behavior the cultivator cannot stop), hallucination (perceiving qi that is not there, or misperceiving qi that is), personality fragmentation (the cultivator's sense of self becomes unstable), delusional conviction (a belief the cultivator cannot question, even when contradicted by evidence). Counterplay: rest, stabilization practices, a teacher's intervention, time, and — if it has gone deep — the deliberate confrontation and integration of the heart-demon (a dangerous process that can fail).
- **Reservoir exhaustion.** In a fight or sustained effort, the cultivator depletes their reservoir and becomes effectively mortal. This is the most common combat failure.
- **Contamination poisoning.** Accumulated contaminated qi produces imbalance: metal-phase contamination produces rigidity, coldness, liver damage; fire-phase contamination produces agitation, fever, heart damage; etc. Untreated, it leads to deviation.
- **Social exposure.** A Qi Condensation cultivator who uses their abilities openly among mortals may attract the attention of a passing higher cultivator — who may recruit them, rob them, or kill them depending on temperament.

### What it feels like
The inner world opens. You can now feel your own qi moving — not just the faint warmth of effort, but the actual routes, the actual reservoirs, the actual gates. You discover you have an inner geography, and it is as real as the outer one. The first time you successfully route qi to your hands and lift a stone you could not lift before, the feeling is not power — it is *recognition*. This was always possible; you just did not know how.

The outer world changes too. You can now perceive the quality of qi, not just its presence. The river's qi is not just "cool yin water"; it is "cool yin water, faintly metal-contaminated, with a wood-phase undertone from the upstream forest." You begin to understand why certain herbs grow where they do, why certain places feel right and others feel wrong, why the lineage hall's qi is dense and the graveyard's is cold. The world has a grammar you are beginning to speak.

You can leave traces. The first time you anchor a trace — a marker on a tree, a warning at a path's fork — you feel a small vertigo: you have written in the world's hidden language, and someone else may read it. You can also read what others have left. You find an old trace on the lineage hall's gate, faint, decades old, and you cannot read its content but you know it is there, and you know it was left by someone who stood where you stand and felt what you feel.

You are still mortal in lifespan. You will still age. You will still die. But the world is now larger than it was, and you are larger in it. The frustration is the envelope: you can perceive the schistosomiasis in the paddies, and you can route qi to your own hands, but you cannot yet heal the villager who has it. You can perceive the widow's grief, and you can leave her a trace of comfort, but you cannot yet resolve it. You are a person who has learned to read the world's hidden language and cannot yet write more than a few words.

The fantasy at this station is *capability* — you can now do things mortals cannot. The frustration is *the envelope* — you cannot yet do enough.

---

## Station 4: Foundation Establishment (筑基, *zhūjī*)

### Essence
Body, qi, and spirit integrate into one coherent system. You are recognized as a cultivator by sect reckoning. Lifespan extends.

### Lifespan
~200 years. Aging slows dramatically: a 100-year-old Foundation Establishment cultivator appears ~50.

### New perceptions
- **Integrated self-perception.** Body, qi, and spirit are now perceived as one system, not three. You can feel the connections: how a physical injury affects your qi circulation, how a qi imbalance affects your mood, how an emotional disturbance affects your body.
- **Meridian depth perception.** You can now perceive the deeper structures of your meridian system: the ancestral gates (祖竅), the spirit paths (神脈), the life-root (命根). These are the structures that Core Formation will later consolidate.
- **Environmental qi-flow perception.** You can perceive not just ambient qi's presence and quality but its *flow*: where it comes from, where it goes, how it moves through the landscape. This is the perception that lets you find spirit veins (靈脈, *língmài*), blessed lands, and grotto-heavens.

### New verbs
- **Integrate a practice (合修, *héxiū*).** Commit a practice so deeply into your body-qI-spirit system that it becomes part of you, not a technique you perform. This is the difference between "routing qi to lift a stone" (a technique) and "being someone whose hands are stronger than ordinary" (an integration).
- **Form a meridian (開脈, *kāimài*).** Open a new meridian route in your body. This is a permanent change, painful, and risky — a failed opening produces deviation. Each new meridian expands your qi-circulation capacity.
- **Bear an oath of office (受職, *shòuzhí*).** Accept a formal role in a sect, lineage, or institution. The oath is qi-bound: breaking it produces real spiritual consequences. This is the verb that makes the cultivator a member of the cultivation world's institutions, not just a practitioner.
- **Found a household (立家, *lìjiā*).** Establish an independent household — either a mortal household (if the cultivator remains in the mortal world) or a cultivation household (if they join a sect). This is the social verb that marks adulthood in the cultivation world.
- **Teach a practice (傳法, *chuánfǎ*).** Transmit a practice to a student. This requires that the practice be sufficiently integrated into the teacher; transmitting a poorly-integrated practice produces poor students.

### New responsibilities
- **Institutional membership.** A Foundation Establishment cultivator is expected to belong to an institution (sect, lineage, academy). Unaffiliated cultivators are not impossible but are disadvantaged and suspect.
- **Student obligations.** If the cultivator has a teacher, they owe the teacher obedience (within bounds) and labor. If they have students, they owe the students instruction, protection, and honest assessment.
- **Cultivation-world law.** The cultivator is now subject to the cultivation world's norms, not just the mortal magistrate's. Sect disputes, inheritance claims, and territorial conflicts are resolved by cultivation-world institutions (when they function) or by force (when they do not).

### New constraints
- **Foundation fragility.** The integrated system, once formed, is robust — but the *process* of forming it is fragile. A significant disruption during Foundation Establishment (a severe injury, a major emotional shock, a contamination event) can set the process back by years or fail it entirely.
- **Institutional entanglement.** Belonging to an institution grants resources but constrains action. A sect member cannot openly practice a rival sect's methods; a lineage member cannot marry without the lineage's approval.
- **Lifespan anxiety.** The cultivator now lives ~200 years. Their mortal kin do not. A 60-year-old Foundation Establishment cultivator returns to their mortal village to find their childhood friends elderly, their parents dead, their lineage's older generation gone. This is the first station where the cultivator outlives their mortal world.

### Failure modes
- **Foundation collapse.** If the integration is unstable (rushed, contaminated, or disrupted), the foundation can collapse — a catastrophic event that reverts the cultivator to Qi Condensation, often with permanent damage.
- **Somatic deviation (advanced).** The deviations of Qi Condensation, now at higher stakes: a false circuit at Foundation Establishment can permanently warp the meridian system.
- **Psychospiritual deviation (advanced).** 心魔 at Foundation Establishment is more dangerous because the cultivator's integrated system means the disturbance propagates: an unresolved obsession affects qi circulation, which affects the body, which affects the spirit.
- **Institutional betrayal.** The cultivator's sect or lineage may betray them — sending them on a suicidal mission, scapegoating them for a failure, or disowning them for a political reason.
- **Mortal-world alienation.** The cultivator can no longer fully participate in mortal life. Their strength is dangerous; their perception is overwhelming; their lifespan is alienating. They are between worlds, belonging fully to neither.

### What it feels like
The first time the integration completes — and it completes suddenly, after months or years of preparation — the feeling is *wholeness*. Body, qi, and spirit were three things; now they are one. You can feel your hand as flesh, as qi-circulation, as spirit-attention, all at once, all the same thing. The world does not look different, but you do.

You also feel *time* differently. You are 40, but your body is 35, and you know — you can feel — that you will be 40 in body when you are 80 in years. The mortal villagers age at the old rate; you do not. The first time you return to the village after ten years away and your childhood friend's hair is grey and yours is not, you understand what cultivation costs. It is not just labor and risk; it is the slow loss of the world you came from.

You are stronger, but not overwhelmingly. You can lift ~800-1200 jin, sprint ~15-20 m/s, survive a fall of ~30m. You are a match for a small group of mortal bandits, but not for an army. You can perceive a spirit vein and tap it, but not yet draw its power. You can teach a student the basics of Qi Induction, but you cannot yet grant them the perception they do not have. You are a cultivator, but a junior one, and the cultivation world is large and you are small in it.

The fantasy at this station is *integration* — you are now a whole that was previously three parts. The cost is *alienation* — you are leaving the mortal world behind.

---

## Station 5: Core Formation (金丹, *jīndān*)

### Essence
A self-contained internal authority forms. Your qi does not need external replenishment. You can perceive spirit anchors. Lifespan extends dramatically.

### Lifespan
~500 years. Aging nearly halts: a 200-year-old Core Formation cultivator appears ~40.

### New perceptions
- **Spirit anchor perception (靈樞見, *língshūjiàn*).** You can now perceive the spirit anchors (靈樞) of other beings — the noncopyable core that persists across embodiment changes. This is the perception that makes possession, exorcism, and certain high-realm interventions possible. It is also deeply disorienting: you can now see, faintly, the *true person* inside the body, and you can see when the body and the anchor are not the same (a possessed person, a walking corpse, a cultivator projecting).
- **Internal authority perception.** You can perceive your own golden core (金丹) — the consolidated internal structure that sustains your qi without external replenishment. It is the most intimate perception in cultivation: you can feel your own core the way you feel your own heartbeat.
- **Law perception (法見, *fǎjiàn*).** You can begin to perceive the *laws* of the local world — the rules that govern how qi flows, how phases interact, how tribulation responds. This is the beginning of the perception that Mahayana will later let you *author*.

### New verbs
- **Form a golden core (結丹, *jiédān*).** Consolidate your integrated system into a self-sustaining internal authority. This is the single most dangerous verb in cultivation: the process is irreversible, painful, and fails more often than it succeeds. A failed core formation usually kills the cultivator; a partial success leaves them crippled.
- **Sustain a qi field without ambient qi (自養, *zìyǎng*).** Operate in a qi-poor or qi-dead environment without depletion. A Core Formation cultivator can fight in a desert, a warded chamber, or a dead zone where a Qi Condensation cultivator would be helpless.
- **Perceive spirit anchors (見靈樞, *jiànlíngshū*).** See the true person inside the body. Use this to detect possession, communicate with the dead in bardo, identify a cultivator's true nature.
- **Refine a treasure (煉器, *liànqì*).** Forge a magical artifact — a sword, a seal, a talisman — that carries a portion of your qi and intent. This is a long verb (months to years per treasure) and requires specific materials, environment, and skill.
- **Found a sect or sub-lineage (立派/立支, *lìpài / lìzhī*).** Establish an independent cultivation institution. This is the social verb that marks senior standing in the cultivation world.
- **Author a minor law (立法, *lìfǎ*).** Within a bounded scope (your own sect's territory, your own body, your own practice), write a rule that the local world will enforce. This is the first verb that lets the cultivator *shape* law rather than only *obey* it. The scope is small; the consequences of error are large.

### New responsibilities
- **Cultivation-world citizenship.** A Core Formation cultivator is a senior figure, expected to participate in councils, adjudicate disputes, and defend the region against external threats.
- **Student duty.** A Core Formation cultivator is expected to take students and transmit their practice. Refusing to teach is permitted but frowned upon.
- **Tribulation accountability.** A Core Formation cultivator's actions can trigger tribulation — not just for themselves but for those around them. They are expected to be careful.

### New constraints
- **Core fragility.** The golden core is robust once formed, but a sufficient shock (a tribulation, a powerful attack, a severe deviation) can crack it. A cracked core is a catastrophic injury, often fatal, always crippling.
- **Tribulation risk.** Core Formation is the first station where tribulation (天劫) is a real risk. The tribulation is not moral; it is the Precelestial's lawful response to the boundary the cultivator has crossed. It cannot be bribed, evaded, or fully survived without preparation.
- **Perception overload.** Perceiving spirit anchors is disorienting and, at first, uncontrollable. A newly-formed Core Formation cultivator may see anchors everywhere — in every person, every animal, every tree — and the experience can produce psychospiritual disturbance.
- **Political visibility.** A Core Formation cultivator is now a political figure. Their movements are watched, their students are targets, their treasures are coveted. They cannot travel the mortal world inconspicuously; their qi is too dense.

### Failure modes
- **Failed core formation.** The most common cause of death at this station. The integration that was stable at Foundation Establishment is destabilized by the consolidation; if it cannot be re-stabilized, the cultivator dies or is crippled.
- **Cracked core.** A later shock cracks the core. The cultivator's internal authority fragments; their qi becomes uncontrollable; they may deviate catastrophically.
- **Tribulation death.** The tribulation at Core Formation is survivable but dangerous. An unprepared cultivator dies; a prepared one survives but is changed.
- **Psychospiritual deviation (心魔, advanced).** The perception of spirit anchors can produce a specific 心魔: the cultivator becomes unable to see people as bodies, only as anchors. They lose the capacity for ordinary human interaction. This is a real risk and a real failure mode, not a flavor text.
- **Political destruction.** A Core Formation cultivator can be destroyed by a coalition of peers — their sect attacked, their students killed, their core cracked in a coordinated ambush. This is the cultivation world's politics at its most brutal.

### What it feels like
The core forms and you are, for the first time, *self-sustaining*. You no longer need to draw qi from the environment; you carry your own. The feeling is like breathing after nearly drowning — you did not know how dependent you were on ambient qi until you no longer were. You can walk into a desert, a warded chamber, a dead zone, and your qi does not falter.

But the cost is the perception. You can now see spirit anchors. The first time you look at your mortal mother and see, faintly, the *true person* inside her aging body — the anchor that will persist after her body dies — you understand what cultivation has cost you. You can no longer see people as merely bodies. You see the deathless core inside the dying flesh, and you know that when she dies, the core will persist, and you will be able to perceive it in bardo, and you will not be able to bring her back.

You are also, now, a figure of the cultivation world. Your sect treats you with respect; your students look to you for guidance; your peers watch you for weakness. You cannot walk through the market town without a junior cultivator noticing your qi and reporting your passage. You are powerful, but you are also *visible*, and visibility is danger.

The fantasy at this station is *authority* — you are now a force in the world, not just a person in it. The cost is *isolation* — you see what others cannot, and you cannot unsee it.

---

## Stations 6-10: Summary specifications

The upper five stations (Nascent Soul, Spirit Severance, Void Amalgamation, Tribulation Crossing, Mahayana) are specified in the same eight-field format, but at a lower resolution — enough to design against, not enough to prototype. They will be expanded when the first three stations are proven.

### Station 6: Nascent Soul (元婴, *yuányīng*)
- **Essence:** Spirit can act beyond the flesh. Anchor can project, possess (lawfully or not), survive bodily death.
- **Lifespan:** ~1000 years.
- **New perceptions:** Bardo perception (see the dead), projection perception (perceive at a distance from the body), lineage-resonance perception (perceive the anchors of your descendants).
- **New verbs:** Project spirit (出神), possess a body (奪舍 — criminal; consensual possession is a different verb), survive bodily death (保命 — anchor flees to a prepared refuge), found a lineage (立宗 — a multi-generational cultivation institution).
- **New responsibilities:** Lineage stewardship (your descendants are now your responsibility), bardo duties (you can now retrieve lost souls, exorcise the possessed, lay the unquiet dead to rest).
- **New constraints:** Projection leaves the body vulnerable; possession is criminal under most jurisdictions; lineage founding is a permanent commitment.
- **Failure modes:** Projection capture (your projected anchor is trapped), possession backlash (the displaced anchor's kin take revenge), lineage collapse (your descendants fail and the lineage dies).
- **What it feels like:** You are no longer identical with your body. You can walk out of it and leave it sleeping. The first time you do this, the vertigo is immense — you are seeing your own body from outside, and it is a strange thing to see. The world is also larger now: you can perceive the bardo, the faint intermediate state where the recent dead persist, and you can speak with them. You are powerful, but you are also *responsible* — for the dead, for your descendants, for the bodies you could take but (mostly) do not.

### Station 7: Spirit Severance (化神, *huàshén*)
- **Essence:** Externalized law as a domain. Within the domain, the cultivator's will is partially authoritative.
- **Lifespan:** ~2000 years.
- **New perceptions:** Domain perception (perceive the interior of your domain as an extension of yourself), law-structure perception (perceive the local laws as objects, not just as rules), tribulation-precursor perception (perceive tribulation gathering before it strikes).
- **New verbs:** Open a domain (開域 — a bounded region where your will is law), enforce a local law (制法 — within the domain, write a rule the world enforces), contest another's domain (破域 — enter and destabilize an enemy's domain), sever an attachment (斬緣 — permanently release a specific emotional bond, with real consequences).
- **New responsibilities:** Domain stewardship (the beings in your domain are your responsibility), law-accountability (the laws you author have consequences you bear).
- **New constraints:** Domain is place-bound (you cannot move it); severing attachments is irreversible and changes who you are.
- **Failure modes:** Domain collapse (your domain is overwhelmed by a stronger cultivator or a tribulation), severance regret (severing an attachment you later realize you needed), law-backlash (a law you authored has unintended consequences).
- **What it feels like:** You can now extend your will into the world and have it *hold*. The first time you open a domain — even a small one, a single room — the feeling is *sovereignty*. Within this space, what you say, is. But sovereignty is burden: the beings in your domain are yours, and their suffering is your fault if your law is wrong. And severing attachments — the practice that gives Spirit Severance its name — is the most disorienting verb in cultivation. You can, with great effort, cut away a piece of yourself: your love for a person, your grief for a loss, your fear of a threat. The piece is gone. You are different. You are also less.

### Station 8: Void Amalgamation (合虚, *héxū*)
- **Essence:** Place-anchored immortality. The cultivator bonds to a grotto-heaven, a sacred mountain, or a region.
- **Lifespan:** ~5000 years.
- **New perceptions:** Place-resonance (perceive your bonded place as yourself), stratum-edge perception (perceive the boundary between Acquired and Precelestial).
- **New verbs:** Bond to a place (合地 — permanent, mutual), draw on place-qi (用境 — your bonded place sustains you), open a grotto-heaven (開洞天 — create or claim a pocket world), fall when the place falls (同盡 — your life is now linked to your place).
- **New responsibilities:** Place-stewardship (your bonded place's ecology and inhabitants are your body, now).
- **New constraints:** Place-bound (you cannot leave your bonded place for long without weakening); place-death is your death.
- **Failure modes:** Place-destruction (an enemy destroys your bonded place; you die), place-corruption (your place is contaminated; you sicken), place-boredom (millennia in one place produce a specific 心魔: the cultivator becomes a feature of the landscape, losing volition).
- **What it feels like:** You are no longer just a body; you are a *place*. The mountain's streams are your circulation; its forests are your breath; its creatures are your microflora. You are vast and slow. A mortal lifetime passes while you notice the seasons. This is the "earth immortal" station, and its temptation is *stasis* — to become a sleeping mountain, to forget you were ever a person. The cultivators who reach this station and do not go mad from slowness are the ones who keep one human attachment: a student, a rival, a lineage, a feud. Something that forces them to remain a person and not just a place.

### Station 9: Tribulation Crossing (渡劫, *dùjié*)
- **Essence:** Cross a tribulation to ascend from Acquired to Precelestial. Most die. Those who succeed become heavenly immortals.
- **Lifespan:** ~10000 years.
- **New perceptions:** Stratum perception (perceive the Precelestial directly), tribulation-structure perception (perceive the tribulation as a lawful process, not a random storm).
- **New verbs:** Cross a tribulation (渡劫 — the single most dangerous verb in cultivation; success is permanent ascension, failure is final death), travel between strata (昇降 — move between Acquired and Precelestial), enter the Precelestial courts (朝天 — present yourself to the courts of Heaven as a peer, not a supplicant).
- **New responsibilities:** Stratum-stewardship (you are now a being of the Precelestial; your actions affect both strata).
- **New constraints:** Precelestial time (1 day there = 1 year in Acquired; every visit to the Precelestial costs you mortal-world time); tribulation-accumulation (each subsequent tribulation is harder; a Tribulation Crossing cultivator who lingers faces escalating tribulations until they cross or die).
- **Failure modes:** Tribulation death (final; the anchor is dispersed), stratum-shock (the Precelestial's density is overwhelming; a cultivator who enters unprepared is crushed), time-loss (return from a Precelestial visit to find a century has passed and everyone you knew is dead).
- **What it feels like:** The tribulation gathers and you understand, for the first time, that the world is *judging* you — not morally, but lawfully, the way a river judges a dam. Either you are strong enough to hold, or you break. The crossing itself is not a fight; it is a *proof*. You prove that your integrated system can sustain the Precelestial's density. If you can, you ascend. If you cannot, you die. There is no middle outcome. The cultivators who reach this station have spent centuries preparing, and most of them still die. The ones who cross are the ones who were not just powerful but *lucky* — the tribulation's specific form happened to match their specific strengths.

### Station 10: Mahayana (大乘, *dàchéng*)
- **Essence:** Law authorship within the Acquired Stratum. The endgame.
- **Lifespan:** ~10000 years (not immortal; final death is always possible).
- **New perceptions:** Law-source perception (perceive the Nameless Origin's influence on the Acquired Stratum — not the Origin itself, which no one perceives), law-legacy perception (perceive the laws previous Mahayana cultivators authored, which still shape the world).
- **New verbs:** Author a law (立法 — write a rule that the Acquired Stratum enforces, within a bounded scope), ratify a law (批法 — formally adopt a law authored by another), contest a law (破法 — destabilize and overturn an existing law), bear the consequences of a law (承法 — the law you authored has effects you cannot avoid).
- **New responsibilities:** Law-stewardship (your authored laws affect everyone in their scope, forever, until overturned); stratum-accountability (you are now a being whose actions shape the world itself).
- **New constraints:** Scope limit (you cannot author laws in the Precelestial; you cannot rewrite the Nameless Origin; you cannot create new strata); law-paradox (a law that contradicts a deeper law fails, often catastrophically); endgame rivalry (other Mahayana cultivators may contest your laws, and you theirs).
- **Failure modes:** Law-backlash (your authored law has unintended consequences that destroy what you were trying to protect), law-contest loss (a rival overturns your law, often killing you in the process), endgame 心魔 (the specific madness of limitless power: the cultivator becomes unable to distinguish their will from the world's law).
- **What it feels like:** You can now write in the world's book, and the world will read what you wrote and obey. The first law you author — even a small one, "no fire shall burn within this grove" — is the most vertiginous verb in cultivation. You are no longer a being *in* the world; you are a being *who shapes* the world. But the shape you make is permanent, and the consequences are yours, and you cannot take it back. The Mahayana cultivators who do not go mad are the ones who author few laws, slowly, with immense care, and who bear the consequences without flinching. The ones who go mad are the ones who author many laws, quickly, to remake the world in their image. The world does not resist; it obeys. And then the world is their image, and they are alone in it.

---

## What this document enables

Every station is a distinct experience, not a stat curve. The verbs are genuinely new (per the doctrine's test). The perceptions are genuinely new. The failure modes are specific. The phenomenology is written for a designer who must build the feel.

The first three stations are the prototype's scope. The upper seven are the design's horizon. The doctrine's "staged proof" rule is honored: the first three stations must be proven in prototype before the upper seven are committed to canon.

The next document (05_PHENOMENOLOGY) deepens the "what it feels like" for the first three stations, because the feel is the engine and the engine must be designed before the pipelines.
