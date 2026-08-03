# 05 — Phenomenology

**Status:** Candidate canon. The feel-specification for the first three stations.
**Date:** 2026-08-03

---

## 0. What this document is for

This is the engine document. Every prior corpus document specified what the world *is*; this one specifies what the world *feels like to inhabit*. The doctrine (AGENTS.md Part 3) says: "Design for joy first; the system serves the experience." This document obeys that.

It is written for a designer who must build the feel and for a programmer who must implement the perceptions. Every phenomenological claim has a procedural implication and a rendering/perception-system implication.

---

## 1. What qi perception feels like (Qi Induction)

### 1.1 The first perception

The first time a mortal perceives qi, they do not know what they are perceiving. It arrives not as a new sense but as a *disturbance in the existing senses* — a cross-modal discrepancy that does not fit any category.

**The canonical onset:** The cultivator-to-be is doing something ordinary and attention-absorbing — transplanting rice, carrying water, sweeping the courtyard, sitting in the lineage hall during a rite. They are tired, or bored, or emotionally open (grieving, in love, afraid). Their attention is diffuse, not focused. And then, for a moment, the world is *different*.

The difference is not a hallucination. It is not a visual overlay. It is a *quality* in the existing senses that was not there before:

- The sound of the river gains a *texture* — not a new sound, but a depth in the existing sound, as if the water had a voice beneath its voice.
- The warmth of the sun gains a *direction* — not just "warm on the skin" but "warm flowing *into* the skin from a specific source," with a weight and a pace.
- The smell of the lineage hall's incense gains a *resonance* — as if the incense were burning in a second room that overlaps the first, and the smell in the second room is older, thicker, more human.
- The feeling of one's own hands in cold water gains an *interior* — as if the hands were not just cold on the surface but had a cold *inside* them, a cold that was always there but is now perceptible.

The onset lasts seconds. It is not frightening; it is *disorienting* — the world is the same but more, and the "more" has no name. The cultivator-to-be may think they are tired, or dreaming, or sick. They blink. They shake their head. The perception fades. They are not sure it happened.

### 1.2 The second and third perceptions

The second onset is similar but longer — ten seconds, perhaps thirty. The cultivator-to-be is now paying attention. They *want* it to happen again. This wanting is itself part of the perception's development: qi perception requires a specific kind of attention, and the desire to perceive is the beginning of learning that attention.

The third onset is the one where the cultivator-to-be *weeps*. Not from sadness — from *recognition*. The world is larger than they knew. They are smaller in it. The river, the sun, the hall, their own hands — these were always more than they appeared, and the cultivator-to-be is the one who was limited, not the world. The weeping is the grief of having been small and the awe of no longer being quite so small.

### 1.3 The perception's qualities (after development)

After the cultivator-to-be has practiced the perception for weeks or months, it develops qualities:

- **Qi has color, but not visual color.** The "color" of qi is a quality perceived *through* the existing senses, not added to them. The river's qi is "cool-dark-flowing" — not blue, not black, but a quality for which the cultivator has no word until they learn the vocabulary of phase (water, yin, flowing). The sun's qi is "hot-bright-pressing" — not red, not yellow, but a quality that the cultivator learns to call fire-phase, yang, pressing.
- **Qi has texture.** The lineage hall's qi is *dense* — not in the visual sense, but in the sense that it resists perception the way deep water resists wading. The graveyard's qi is *thin* — it does not resist; it yields. The river's qi is *smooth*. The forest's qi is *complex* — many textures interwoven.
- **Qi has movement.** Ambient qi flows. The river's qi flows with the river. The sun's qi flows *downward* (a perception that surprises the cultivator, who expected it to flow upward). The lineage hall's qi is *still* — it has accumulated over generations and barely moves. The graveyard's qi is *slowly sinking* — as if it were draining into the earth.
- **Qi has emotional valence, but it is not emotion.** The lineage hall's qi feels *human* — not happy or sad, but human, the accumulated residue of nine generations of human rites. The graveyard's qi feels *ended* — not sad, but ended, the residue of lives that are over. The river's qi feels *indifferent* — not cruel, not kind, but indifferent, the quality of a process that does not care about you. The cultivator must learn that the valence is a quality of the qi, not a feeling *in themselves* — a distinction that is harder than it sounds.

### 1.4 The perception's limits

- **It requires attention.** The cultivator cannot perceive qi while performing heavy labor or while emotionally distressed. The perception is a *mode* they enter, not a continuous sense.
- **It is exhausting.** A new inductee can sustain it for seconds; an experienced one for minutes. Pushing past fatigue produces headache, nosebleed, and temporary loss of the perception.
- **It is not omniscient.** The cultivator perceives the qi of what they attend to, not the qi of everything. They can focus on the river, or the hall, or a person, but not all at once.
- **It can be wrong.** A strong emotion in the cultivator (fear, desire, grief) can color the perception, making them *think* they perceive qi that matches their emotion. A fearful cultivator perceives the graveyard's qi as malevolent; a grieving cultivator perceives their dead parent's residue as a presence. The cultivator must learn to distinguish perception from projection — a skill that takes years and that some never master.

### 1.5 Procedural implications

- **The perception is a toggle, not a passive sense.** The player presses a button (or holds a key) to "sense qi." The world changes: a new layer becomes visible, the existing visuals gain depth, the audio gains texture. Releasing the button returns to ordinary perception. The toggle has a cost: while sensing, the player cannot perform heavy labor, and the perception depletes a "perception stamina" meter that recovers with rest.
- **The perception is cross-modal.** It is not a "see qi" overlay. It is a simultaneous modification of sight (depth, color-quality), sound (texture, resonance), and proprioception (interiority of the body). The rendering must modify *all* channels, not add a visual layer.
- **The perception is fallible.** The player's emotional state (tracked by the simulation) colors the perception. A grieving player sees death-qi where there is none. The game does not tell the player they are wrong; the player must learn to doubt their own perception. This is the first skill of cultivation.

### 1.6 Rendering implications

- **Post-processing:** When qi perception is active, apply a subtle multi-pass effect: depth-of-field shift (the world gains a "second layer" of depth), chromatic shift (not a color overlay, but a subtle desaturation of warm colors and enhancement of cool, or vice versa depending on the qi), and a faint volumetric haze (not fog; a *texture* in the air).
- **Audio:** Layer a second audio track — not new sounds, but a resonant filter on existing sounds that gives them depth. The river gains a sub-bass hum; the wind gains a harmonic; the lineage hall's silence gains a faint sustained tone.
- **Haptics (if supported):** A low, steady vibration when perceiving dense qi; a faint pulse when perceiving flowing qi; stillness when perceiving dead qi.

---

## 2. What internal circulation feels like (Qi Condensation)

### 2.1 The first route

The first time a Qi Condensation cultivator successfully routes qi through a meridian, the feeling is *recognition*, not power. They route qi to their hands and lift a stone they could not lift before, and the feeling is not "I am strong" but "this was always possible; I just did not know how." The qi in their hands feels like warmth, but not external warmth — an interior warmth, as if their hands had remembered a temperature they had forgotten.

### 2.2 The inner geography

After the first route, the cultivator begins to perceive their own inner geography:

- **The meridians (經脈)** are not pipes; they are *paths of least resistance* through the body's qi-field. The cultivator perceives them the way one perceives a familiar walking route — not as a visible line, but as a *way* through a space. Routing qi along a meridian feels like walking a familiar path: easy, natural, the qi "wants" to go that way.
- **The dantian (丹田)** is not a point; it is a *reservoir* — a region of the body where qi accumulates, lower than the meridians, denser. The cultivator perceives it as a weight in the lower abdomen, not painful, not pleasant, just *present*.
- **The gates (竅)** are the points where meridians meet the surface of the body — the palms, the soles, the crown, the brow. Qi flows in and out through the gates. The cultivator perceives them as *openings* — not holes, but places where the interior and exterior communicate.

### 2.3 The qi-state

The cultivator's qi-state is perceived as a complex, shifting quality:

- **Phase** (wood, fire, earth, metal, water) — the dominant pattern of action. A wood-dominant state feels *growing, spreading, flexible*; a fire-dominant state feels *rising, bright, agitated*; an earth-dominant state feels *stable, dense, patient*; a metal-dominant state feels *sharp, condensing, rigid*; a water-dominant state feels *flowing, still, deep*.
- **Yin-yang signature** — the polarity. A yang-dominant state is *hot, outward, active*; a yin-dominant state is *cool, inward, receptive*.
- **Purity** — the degree to which the qi is uncontaminated. Pure qi feels *clear*; contaminated qi feels *cloudy, gritty, or wrong-colored*.
- **Volume** — the amount of qi in the reservoir. A full reservoir feels *weighted*; an empty one feels *hollow*.

### 2.4 The practice

The cultivator's daily practice is not a menu of techniques; it is a *discipline of attention*. They sit (or stand, or move) and attend to their qi-state, gently guiding it toward balance: if wood-dominant and agitated, they guide toward water-phase and yin; if metal-dominant and rigid, they guide toward fire-phase and yang. The guiding is not forceful; it is *intentional*, the way one intentionally breathes slowly to calm down. The qi responds to intention, but slowly, and not always correctly.

### 2.5 The output

When the cultivator routes qi to enhance a physical output, the feeling is:

- **Strength routing:** The hands (or legs, or back) gain an interior warmth and a sense of *capacity*. A stone that felt heavy now feels manageable. The cultivator does not feel "superhuman"; they feel *adequate* — the stone is now within their capacity, where before it was not.
- **Speed routing:** The legs gain a sense of *readiness*. The cultivator feels they could run, and the running comes easily. The speed is not effortless; it is *available*.
- **Sensory routing:** The eyes (or ears, or nose) gain a sense of *focus*. The cultivator perceives more detail, more range. The enhancement is not magnification; it is *attention* — they notice what was always there.
- **Resistance routing:** The skin (or lungs, or stomach) gains a sense of *integrity*. Heat, cold, poison, or disease that would have affected them now affects them less. The resistance is not armor; it is *tolerance* — the body's capacity to endure is expanded.

### 2.6 Procedural implications

- **Routing is a committed action, not a buff.** The player chooses what to route (strength, speed, sensory, resistance) and for how long. Routing cannot be changed instantly; changing routes requires a moment of re-attunement (a "switch" verb with a 1-2 second cast). This prevents the "buff menu" feel.
- **Routing has a cost.** It depletes the reservoir. The reservoir recovers slowly (hours) or with specific practices (eating, resting, certain herbs, certain environments). A cultivator who exhausts their reservoir in a fight is, thereafter, as weak as a mortal.
- **The inner geography is a learnable map.** The player can, over time, learn their character's specific meridian layout (which varies per character — the generator produces a unique layout per seed). Different layouts favor different routings; a character with strong hand-meridians is a better sword cultivator; one with strong leg-meridians is a better runner.

### 2.7 Rendering implications

- **First-person routing feedback:** When the player routes qi, a subtle first-person effect: a warmth in the routed region (a faint glow on the hands if strength-routed, a clarity in the vision if sensory-routed, a steadiness in the legs if speed-routed). Not a UI overlay; a perceptual shift.
- **The inner geography is not a menu.** It is perceived through the same cross-modal perception as ambient qi: when the player "attends inward," the body gains an interior — a felt sense of the meridians, the dantian, the gates. This is the "sense self" verb, with its own stamina cost.

---

## 3. What deviation feels like (走火入魔)

### 3.1 Somatic deviation

Somatic deviation begins as a *tempting benefit*, not a punishment. The cultivator discovers that a slight mis-routing produces a faster, easier, more pleasant result — and they are tempted to repeat it.

**False circuit (假周天):**
- **The temptation:** Routing qi in a small loop that bypasses the dantian produces a quick, pleasant warmth and a sense of accelerated progress. It feels like a shortcut.
- **The cost:** The loop does not replenish; it depletes the reservoir faster than proper routing. The cultivator's qi-state becomes *shallow* — quick but unstable. Continued false-circuit practice makes the loop habitual; the cultivator finds it hard to route properly.
- **The feel:** The cultivator feels *wired* — energetic but restless, unable to settle, unable to deeply rest. They dream of the loop. They wake tired. Their hands tremble slightly.
- **The counterplay:** Rest, fasting, and the deliberate re-routing of qi through the dantian, which feels *heavy and slow* after the false circuit's lightness. The cultivator must endure the heaviness until the habit breaks.

**Cross-current (逆流):**
- **The temptation:** Reversing the flow in a meridian produces a brief surge of power — a sharp, bright intensity that proper routing does not.
- **The cost:** The reversal damages the meridian; the surge is unsustainable; the cultivator's qi-state becomes *turbulent* — chaotic, hard to control, prone to sudden shifts.
- **The feel:** The cultivator feels *electric* — intense but unstable, prone to sudden flares of anger or fear or excitement. Their qi does not respond to intention smoothly; it jerks, surges, stalls.
- **The counterplay:** Rest, specific stabilizing herbs, and the slow re-establishment of the correct flow, which feels *boring* after the surge's intensity.

**Route fixation (路執):**
- **The temptation:** Repeating the same route until it becomes *effortless* — the qi flows without intention, the cultivator does not need to attend.
- **The cost:** The fixed route becomes a *habit* the cultivator cannot break. Other routes atrophy. The cultivator's qi-state becomes *rigid* — strong in one pattern, unable to shift.
- **The feel:** The cultivator feels *locked* — competent in their fixed pattern, helpless outside it. They try to route differently and find they cannot; the qi goes where it is habituated.
- **The counterplay:** Deliberate, painful re-routing through atrophied meridians, which feels like learning to walk after an injury.

### 3.2 Psychospiritual deviation (心魔)

心魔 begins as a *mood that does not lift*. The cultivator experiences a strong emotion — grief, fear, desire, hatred — and the emotion does not resolve. It persists, deepens, and begins to color perception.

**Obsession (執):**
- **The onset:** The cultivator fixates on a person, a goal, a perceived slight, a loss. The fixation feels *important* — the most important thing, more important than practice, than relationships, than survival.
- **The progression:** The fixation becomes self-reinforcing. The cultivator perceives qi-residue related to the fixation everywhere — the ghost of the lost beloved, the trace of the rival, the echo of the slight. They cannot tell whether the perception is real or projected. The qi-state becomes *stained* — colored by the fixation, unable to return to balance.
- **The feel:** The cultivator feels *driven* — not unhappy, not happy, but *compelled*. The fixation is a presence in their mind that does not leave. They dream of it. They wake to it. They cannot interest themselves in anything else. The world loses its texture except where the fixation is concerned.
- **The counterplay:** Time, distance, the deliberate cultivation of other attachments, the intervention of a teacher or friend who can perceive the 心魔 and name it. If it has gone deep, the cultivator must *confront* the fixation — enter the mind's own representation of it and either integrate it (accepting the loss, the rivalry, the slight as part of themselves) or be consumed by it (the fixation becomes permanent, the cultivator becomes a dangerous obsessive).

**Compulsion (魔習):**
- **The onset:** The cultivator begins to repeat a behavior — a hand gesture, a phrase, a route, a ritual — that they cannot stop. The behavior feels *necessary*.
- **The progression:** The compulsion intrudes on practice and life. The cultivator finds themselves performing the behavior at inappropriate times. The qi-state becomes *looped* — cycling through the same pattern, unable to progress.
- **The feel:** The cultivator feels *trapped* — aware that the behavior is irrational but unable to stop. They perform it and feel relief; they do not perform it and feel mounting distress.
- **The counterplay:** Deliberate interruption, the substitution of a different behavior, and — if deep — the confrontation of the compulsion's root (which is usually a fear the cultivator has not acknowledged).

**Hallucination (幻):**
- **The onset:** The cultivator perceives qi that is not there, or misperceives qi that is. A grief-stricken cultivator perceives their dead parent's residue in the lineage hall. A fearful cultivator perceives a predator's qi in the forest at night.
- **The progression:** The hallucinations become more vivid, more persistent, harder to distinguish from real perception. The cultivator may begin to *act* on the hallucinations — speaking to the dead, fleeing the imagined predator, attacking the imagined rival.
- **The feel:** The cultivator feels *uncertain* — they cannot tell what is real. The world gains a treacherous quality: every perception might be true or might be projection. The cultivator who knows they are hallucinating is in a better position than the one who does not.
- **The counterplay:** The cultivation of doubt — the deliberate suspension of belief in one's own perception. A teacher or friend who can perceive the hallucination and confirm it is not real. Time and rest, which reduce the hallucination's frequency. The confrontation of the underlying emotion, which resolves the hallucination at its root.

**Personality fragmentation (散魂):**
- **The onset:** The cultivator begins to feel *multiple* — as if there were more than one self in their mind, with different desires, different fears, different memories.
- **The progression:** The fragments become more distinct. The cultivator may find themselves acting in ways they do not remember, or feeling desires they do not recognize as their own. The qi-state becomes *chaotic* — multiple patterns competing for dominance.
- **The feel:** The cultivator feels *divided* — not themselves, or not one self. They may hear internal voices, feel internal presences, experience their own thoughts as foreign. This is the most frightening deviation; it is the one that feels like *madness*.
- **The counterplay:** Stabilization practices (grounding in the body, in the breath, in the present), the intervention of a teacher or healer, and — if deep — the deliberate *integration* of the fragments, which requires the cultivator to acknowledge and accept the parts of themselves they have been splitting off. This is the hardest counterplay and the most likely to fail.

### 3.3 Procedural implications

- **Deviation is a state, not a debuff.** It is tracked as a persistent condition with onset, progression, and counterplay. It affects perception (hallucination), action (compulsion), and self (fragmentation).
- **Deviation is caused by player choices,** not random rolls. The player who routes qi badly, who practices while emotionally disturbed, who kills without preparation, who pushes past fatigue — that player earns deviation. The player who rests, who practices carefully, who avoids unnecessary violence — that player avoids it.
- **Deviation is recoverable,** but not easily. Recovery requires time, specific practices, and often the help of others. A player who ignores deviation finds it progressing; a player who attends to it finds it retreating.
- **Deviation is perceptible to others.** A teacher or a fellow cultivator can perceive the 心魔 and name it. This is the social dimension of deviation: it is not just a personal crisis but a visible condition that affects how others relate to the cultivator.

### 3.4 Rendering implications

- **Deviation modifies the player's own perception.** A hallucinating player sees qi-residue that is not there (rendered identically to real residue — the game does not tell the player it is fake). An obsessed player sees the object of obsession highlighted everywhere. A fragmented player experiences brief cuts to other viewpoints, or hears internal voices (audio).
- **Deviation is visible to others.** An NPC who perceives the player's 心魔 reacts to it — with concern, with fear, with avoidance, with offers of help. The player sees their reaction before they understand why.
- **Deviation is not a "sanity meter."** It is a set of specific, named conditions with specific onsets, progressions, and counterplays. The player does not see a number; they experience the condition.

---

## 4. The first awe

The doctrine (AGENTS.md Part 3) says: "Design for joy first." The first awe is the moment the player understands, viscerally, that the world is larger than they knew. It is the engine's ignition.

### 4.1 When it happens

The first awe is the third qi perception (per §1.2 above). The player has perceived qi twice — briefly, uncertainly — and has not been sure it was real. The third time, the perception holds for thirty seconds, and the player understands.

### 4.2 What the player perceives

The player is in the lineage hall at dawn, or at the river at dusk, or in the paddy at noon — the specific location is generated, but the qualities are constant:

- The world gains the *second layer*. The river's sound has a voice beneath it. The sun's warmth has a direction and a weight. The hall's incense has a resonance in a room that overlaps this one. The player's own hands have an interior.
- The player perceives that these qualities were always there. The world did not change; the player did. The world is the same rice paddy, the same river, the same hall — but it is *more*, and the "more" has a name the player does not yet know.
- The player weeps. Not from sadness — from recognition. They are smaller in a larger world, and the smallness is not humiliating; it is *relieving*. The world was always this. They were the one who was limited.

### 4.3 What the player understands

The player understands, in that moment, that cultivation is not about becoming powerful. It is about becoming *less limited*. The world has always been full; the cultivator is the one who learns to perceive it. Power is a side effect of perception, not its purpose.

This understanding is the engine. The player who has the first awe wants to cultivate not to become strong but to *see more*. The strength is welcome, but it is not the point. The point is the world, which is larger than they knew, and which they are only beginning to read.

### 4.4 Procedural implications

- **The first awe is scripted in its qualities but not in its location.** The generator chooses the location based on the player's history (where they have spent time, what they have attended to). A player who has labored in the paddies has the first awe in a paddy. A player who has mourned at the graveyard has it at the graveyard. The location is meaningful to *this* player.
- **The first awe is a cutscene-like moment, but it is not a cutscene.** The player retains control; they can move, look around, experiment with the perception. The perception's qualities are rendered (per §1.6). The weeping is a player-character animation, not a forced camera move.
- **The first awe is the gate from Mortal to Qi Induction.** It is not awarded by a quest; it emerges from play. A player who has perceived qi twice and is open to the third perception (in the right emotional state, in the right environment, with enough practice) has it. A player who is not ready does not.

### 4.5 Rendering implications

- The first awe is the moment where the rendering of qi perception (per §1.6) is most intense. The cross-modal effect is at full strength: the depth-of-field shift is deep, the chromatic shift is noticeable, the volumetric texture is thick, the audio resonance is rich.
- The player-character's weeping is a subtle animation: a catch in the breath, a tremor in the shoulders, not a dramatic sob. The camera does not move; the player retains their viewpoint.
- The moment lasts as long as the player sustains the perception. When they release it (or when perception stamina depletes), the world returns to ordinary, and the player is changed.

---

## 5. What this document enables

This document specifies the *feel* of the first three stations. It is the engine that the prior corpus lacked. Every phenomenological claim has a procedural implication (what the simulation must track) and a rendering implication (what the engine must render).

The next documents (06_GOLDEN_SCENES, 07_PROCEDURAL_GENERATION_IMPLICATIONS) ground these feels in specific playable scenes and specific generator inputs. The synthesis document (09) ties them to the Three.js systems that can render them and to the smallest end-to-end prototype that can prove the engine works.
