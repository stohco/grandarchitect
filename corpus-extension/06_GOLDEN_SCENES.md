# 06 — Golden Scenes

**Status:** Candidate canon. Five playable scenes that ground the first three stations in specific, named, designed moments.
**Date:** 2026-08-03

---
**Truth level:** Art-directed (visual reference)
**Implements:** engine-architecture/51_MULTIVERSE_GROUND_TRUTH_ARCHITECTURE.md, corpus-extension/50_GROUND_TRUTH_SYSTEM_SPECIFICATION.md
**Implementation status:** [SPEC] — fully specified, implementation in progress

---

## Ground-Truth Annotation

> [CANON] Golden scenes are art-direction targets, not gameplay scripts. Each defines a visual moment the engine must be able to produce.

> [DERIVED] All measurements in this document use SI units (doc 52). Visual concepts follow the VTP schema (doc 51). Moving entities follow MotionProfiles (doc 55).

> [PROC] Instance-level details (exact NPC counts, specific tree placements, weather sequences) vary by seed within canonically-defined ranges.

> [UNRESOLVED] See /questions/ registry for open questions related to this document.

**Topic:** Golden scenes — target visual moments

---



## 0. What this document is for

The doctrine (AGENTS.md Part 3) says: "Cite the precedent; do not float above it." and "Ship the working thing before the perfect thing." This document specifies five scenes concrete enough that a designer could build them and a player could play them. They are not abstract scenarios; they are scenes, with named characters, named locations, named objects, and specific verbs.

Each scene is specified with:
- **Setting** — where, when, who
- **The scene's purpose** — what the player learns or gains
- **The verbs the player uses**
- **The failure modes**
- **The aftermath** — what persists after the scene ends
- **Procedural implications** — what the generator must produce
- **Rendering implications** — what the engine must render

---

## Scene 1: The First Teacher (Wang Lun's Hexagram)

### Setting
Wang Family Bend, the lineage hall's side room (the school), spring (Qingming), the player's 16th year. The player has been perceiving qi faintly for weeks — brief, uncertain onsets that they have not told anyone about, because they do not have words for what they are experiencing.

Wang Lun (王倫, 41, the lineage school teacher, a failed county exam candidate) has noticed. He has noticed because the player has been distracted in lessons, because the player has been staring at the lineage hall's incense with an attention that is not ordinary, and because Wang Lun, in his youth, had a single qi perception himself — once, briefly, never repeated — and recognizes the signs.

### The scene's purpose
- The player learns that what they are perceiving has a name (qi, 氣)
- The player learns that there are people who perceive it more fully (cultivators, 修士)
- The player learns that Wang Lun is not such a person — he perceived once, decades ago, and never again
- The player learns that there is a path (cultivation, 修煉) but that Wang Lun cannot teach it
- The player receives a direction: seek a teacher who can

### The verbs the player uses
- **Attend (to the perception)** — the player must, in the scene, choose to acknowledge the perception rather than hide it. This is a dialogue choice, but it is also a mechanical choice: the player must be in the "sense qi" mode when Wang Lun asks what they are seeing.
- **Speak honestly** — the player must describe the perception in their own words. The dialogue system accepts multiple descriptions ("a depth in the sound," "a warmth with a direction," "a second room overlapping this one") and Wang Lun responds to each, recognizing the perception beneath the description.
- **Receive a hexagram** — Wang Lun casts the hexagram (卦) for the player, as he does for supplicants. The hexagram's result is deterministic from the seed + the player's state, and it points (cryptically, as hexagrams do) toward the player's path.
- **Receive a direction** — Wang Lun tells the player about a person: Old Chen (陳老, *Chén Lǎo*), a retired cultivator who lives as a hermit on the hill above Li Family Creek, the next village east. Wang Lun does not know if Old Chen will teach; he knows only that Old Chen is real, and that the player should seek him.

### Failure modes
- **The player hides the perception.** If the player denies perceiving anything, Wang Lun does not press. The scene ends. The player can still seek Old Chen (the hexagram's direction is cast regardless), but they do so without Wang Lun's acknowledgment, and the path is harder (Wang Lun would have written a letter of introduction; without it, Old Chen is more suspicious).
- **The player cannot describe the perception.** If the player is not in "sense qi" mode when asked, the dialogue options are limited to generic descriptions ("I'm just tired," "I don't know"), and Wang Lun cannot confirm the perception. The scene ends inconclusively. The player can try again another day.
- **The player rejects the direction.** If the player says they do not want to seek Old Chen, Wang Lun accepts this. The scene ends. The player can change their mind later, but the hexagram's moment has passed.

### The aftermath
- The player knows the word "qi" (氣) and the word "cultivator" (修士).
- The player has a direction: Old Chen on the hill above Li Family Creek.
- The player has (if they spoke honestly) Wang Lun's acknowledgment and a letter of introduction.
- The player has the hexagram's result, recorded in their journal, which they can consult later.
- Wang Lun's perception of the player changes permanently; he treats them with a mixture of hope and grief (hope that they will go further than he did; grief that he could not).

### Procedural implications
- The scene triggers when the player has had at least 2 qi perceptions AND is in the lineage hall AND Wang Lun is present AND the player's emotional state is "open" (not panicked, not enraged, not deeply grieving).
- The hexagram result is deterministic from `seed + playerState`. The result is one of 64 hexagrams, each with a specific cryptic meaning. The generator must produce the hexagram's text and the player's journal entry.
- Wang Lun's letter of introduction is a persistent object in the player's inventory. Old Chen's reaction to the player is modified by its presence.

### Rendering implications
- The scene is in the lineage hall's side room: a small space, a low table, brush and ink and yarrow stalks, the ancestor tablets visible through the door. The lighting is dim (spring afternoon, paper windows). The incense is burning — its qi is perceptible (dense, old, human).
- Wang Lun's animation: the careful casting of the hexagram (the yarrow stalks divided and counted, the hexagram drawn on paper with brush and ink). This is a real divination procedure, rendered accurately.
- The player-character's perception mode (if active) renders the cross-modal effect. Wang Lun's own qi is faint — barely perceptible, a single point of warmth in his chest, the residue of his one perception decades ago.

---

## Scene 2: The Fraudulent Manual (Old Chen's Test)

### Setting
The hill above Li Family Creek, Old Chen's hermitage — a small house with a garden, a shed, and a view of the river. Old Chen (陳老, *Chén Lǎo*, 82, appears ~60, a retired Qi Condensation cultivator who left his sect after a dispute and lives as a hermit) receives the player warily. He does not want a student. He tests the player before agreeing to teach anything.

The test: Old Chen gives the player a manual (功法, *gōngfǎ*) — a hand-copied text describing a qi-circulation route — and tells the player to practice it for a week and report back. The manual is **fraudulent**. It contains:
- 2 accurate observations (real descriptions of qi perception that the player can verify)
- 1 harmless exercise (a breathing pattern that is genuinely calming)
- 1 mistranscribed route (a meridian path that is real but described with one critical error)
- 1 fabricated claim (a promise that the route will produce a specific power it will not)
- 1 omitted dangerous stop condition (the route, if practiced as described, will produce a false circuit — 假周天 — because the stop condition that would prevent it is missing)

The manual is not tagged "fake" in player-facing truth. Some parts are useful. The promised transformation is false. The omitted condition is dangerous.

### The scene's purpose
- The player learns that not all teachings are true
- The player learns that provenance matters — who wrote this, why, what do they gain
- The player learns to investigate a teaching before practicing it
- The player learns that Old Chen tests before he teaches — and that the test is not about whether the player can detect the fraud, but about *how* the player responds to uncertainty

### The verbs the player uses
- **Read the manual** — the player can read the text, which is rendered as an in-game document with the five components above.
- **Investigate the manual** — the player can:
  - Compare the manual's vocabulary to what they have perceived (does the description of qi match their own perception?)
  - Test the harmless exercise (does it produce the calming effect described?)
  - Attempt the mistranscribed route cautiously (with attention to whether it feels right)
  - Ask Old Chen questions (he will answer some, deflect others, occasionally lie)
  - Ask Wang Lun (back in Wang Family Bend) about the manual's vocabulary
  - Seek a second opinion from the market town's Daoist priest (who can read the manual but cannot evaluate its qi-content)
- **Practice the manual** — the player can attempt to practice the route as described. If they do, they will begin to develop a false circuit (per Phenomenology §3.1). The onset is gradual — the tempting benefit first (quick warmth, sense of progress), then the cost (shallow qi, restlessness, trembling hands).
- **Report back to Old Chen** — after a week (in-game time), the player returns and tells Old Chen what they found. Old Chen's response depends on what the player did:
  - If the player practiced the route as described and developed a false circuit, Old Chen is disappointed but not surprised. He helps the player recover. He does not teach them further. The test was to see whether the player would practice blindly; they did.
  - If the player detected the fraud but practiced anyway (out of curiosity, desperation, or arrogance), Old Chen is interested. He helps the player recover. He agrees to teach — but warily.
  - If the player detected the fraud and did not practice, Old Chen is impressed. He agrees to teach. He reveals that the manual was a test and explains its components.
  - If the player did not detect the fraud but did not practice (because they were cautious, because they were investigating, because they ran out of time), Old Chen is satisfied. He agrees to teach. He explains the fraud and what the player missed.

### Failure modes
- **The player practices blindly and develops a false circuit.** Old Chen helps them recover (rest, fasting, re-routing). The player loses a week and gains a permanent wariness of unverified teachings. Old Chen does not teach them further, but he does not turn them away; they can still seek him out for advice.
- **The player confronts Old Chen angrily** (accusing him of giving a fraudulent manual). Old Chen accepts the accusation. He does not apologize. He asks the player what they would have done with a student who practiced blindly. The scene ends. The player can return later, but the relationship is strained.
- **The player leaves and does not return.** The player can seek another teacher (this requires traveling further, to the market town or beyond). The fraudulent manual remains in their inventory as a memento.

### The aftermath
- The player has (if they passed the test) Old Chen as a teacher. He teaches the first real qi-circulation route — a simple, safe, slow route that the player can practice without risk.
- The player has (if they passed well) Old Chen's trust and the beginning of a teacher-student relationship that will develop over months.
- The player has learned the verb "investigate a teaching" — a verb that will recur throughout the game, whenever the player encounters a new manual, a new teacher, or a new claim.
- The fraudulent manual remains in the player's inventory. It can be used later (to test a student of their own, to show to another teacher for comparison, to study the structure of fraud).

### Procedural implications
- The manual is a persistent object with 5 components, each tracked separately. The player's investigation produces evidence about each component. The player's journal records what they have learned.
- Old Chen's reaction is a decision tree based on the player's actions over the week, not a single dialogue choice. The generator must track the player's investigation actions and produce Old Chen's assessment.
- The false circuit (if developed) is a persistent condition that requires specific counterplay (per Phenomenology §3.1).

### Rendering implications
- Old Chen's hermitage: a small house on a hill, a garden with herbs (perceivable as wood-phase qi), a shed with tools, a view of the river (perceivable as water-phase qi flow). The lighting is bright (the hill is above the river mist). The air is clean.
- The manual is rendered as an in-game document — a hand-copied text on paper, with the five components distinguishable by layout (the observations are prose, the exercise is numbered steps, the route is a diagram with meridian paths, the fabricated claim is in a different hand, the omitted stop condition is simply absent — the player perceives its absence by the route's lack of a stopping point).
- Old Chen's animation: wary, watchful, a man who has been hurt and does not trust easily. His qi is denser than Wang Lun's — a steady warmth in his abdomen (the dantian), a faint circulation in his hands. The player can perceive this if they attend.

---

## Scene 3: The First Duel (Zongde's Challenge)

### Setting
Wang Family Bend, the threshing ground, late summer of the player's 18th year. The player has been studying with Old Chen for ~18 months and has reached early Qi Condensation (can route qi to hands and legs, can perceive qi-residue, has a small reservoir). They are visiting home for the Autumn Equinox harvest.

Wang Zongde (王宗德, 24, the unmarried younger son of Wang Shouye the tenant, the "bare stick" risk from document 04) has also been studying — not with Old Chen, but with a traveling cultivator who passed through the market town six months ago and taught Zongde a few techniques in exchange for labor. Zongde's training is rougher, faster, and less careful than the player's. He has reached a similar level of Qi Condensation but with a less stable foundation.

Zongde is resentful. The player left the village to study with a real teacher; Zongde stayed and got a traveling hustler. The player is respected by the lineage for their cultivation; Zongde is not. The player is courted by the lineage for marriage prospects; Zongde is the "bare stick." The resentment has been building for months.

At the harvest festival, after the lineage's communal meal, Zongde publicly challenges the player. The challenge is not to the death (that would be a lineage crime); it is to "first yield" — the first to yield the threshing ground or to acknowledge inferiority loses. The lineage head (Wang Shouzheng) does not forbid it; he sees it as a way to settle the matter. Old Chen, who has come to the village for the festival, watches but does not intervene.

### The scene's purpose
- The player's first combat against a peer
- The player learns what qi-enhanced combat feels like
- The player learns that combat has consequences — social, physical, relational
- The player learns that winning is not the only outcome that matters

### The verbs the player uses
- **Route qi (to hands, to legs, to sensory)** — the player must route qi to enhance their combat ability. The routing is committed (per Phenomenology §2.6); changing routes requires a moment of re-attunement.
- **Attack (strike, grapple, throw)** — the player can attack with qi-enhanced strikes. Each attack is committed (no instant cancel); missing leaves the player open.
- **Defend (block, dodge, redirect)** — the player can defend. Blocking costs qi (the impact depletes the reservoir); dodging costs stamina; redirecting requires precise timing and perception.
- **Read residue** — the player can, mid-combat, read Zongde's qi-residue to predict his next move. This costs attention (the player cannot attack and read simultaneously); it requires the "sense qi" mode.
- **Yield** — the player can yield at any time. Yielding loses the duel but preserves the relationship (Zongde's resentment is partially addressed).
- **Escalate** — the player can escalate (use more qi, attempt a riskier technique). Escalation increases the chance of winning but also the chance of injury (to both parties) and of deviation (if the player routes badly under pressure).

### Failure modes
- **The player loses.** Zongde's victory is public. The player's standing in the lineage drops. Zongde's resentment is partially addressed but not resolved; he is now arrogant, which will cause future problems. The player is physically bruised but not badly hurt (the duel was to first yield, not to injury). Old Chen, watching, says nothing, but later discusses the loss with the player — what they did wrong, what they could have done differently.
- **The player wins easily.** Zongde is humiliated. His resentment deepens into hatred. He will become a future antagonist — not immediately, but over years. The lineage respects the player but fears them slightly. Old Chen later warns the player that an easy victory against a resentful opponent creates a long enemy.
- **The player wins narrowly.** Zongde is beaten but not humiliated. He accepts the loss with difficulty. The relationship is damaged but not destroyed; Zongde may, over time, become a reluctant ally or a neutral party. This is the outcome Old Chen prefers.
- **The player injures Zongde seriously.** This is a deviation from the "first yield" rule. The lineage head intervenes. The player is censured (not formally punished, but socially diminished). Zongde is badly hurt and may take months to recover; his resentment becomes permanent. Old Chen is disappointed; he lectures the player on restraint.
- **The player deviates (false circuit, cross-current) during the fight.** If the player, under pressure, routes qi badly (out of exhaustion, out of anger, out of desperation), they may develop a somatic deviation. The deviation manifests during or after the fight. The fight's outcome is secondary to the deviation's onset.
- **The player yields.** Zongde is surprised. The lineage is confused (why did the cultivator yield to the lesser?). Old Chen, later, explains: the player who yields when they could win has chosen the relationship over the victory. This is a real cultivation choice. Zongde's resentment is partially addressed; he may, over time, become a friend.

### The aftermath
- The player's standing in the lineage is adjusted (up for winning, down for losing, complex for yielding).
- The player's relationship with Zongde is set on a trajectory (enemy, reluctant ally, friend) based on the outcome.
- The player's qi-state is affected (depleted reservoir, possible deviation, possible psychospiritual disturbance from the violence).
- The player's self-knowledge is affected: they know, now, what combat feels like, and they know whether they can do it.
- Old Chen's assessment of the player is updated. He adjusts his teaching based on what he saw.

### Procedural implications
- The duel is a tracked event with multiple outcomes, each producing specific downstream consequences.
- Zongde is a persistent NPC with a relationship state that develops over years. His trajectory (enemy, ally, friend) affects future scenes.
- The combat system must support: routing (committed), attacking (committed), defending (qi-cost), reading residue (attention-cost), yielding, escalating. It must track reservoir, stamina, and deviation onset.
- The duel is witnessed: the lineage head, Old Chen, the village (as background NPCs whose reactions are tracked).

### Rendering implications
- The threshing ground at night: flat compacted earth, paper lanterns, the lineage and villagers in a circle. The lighting is warm (lanterns) with deep shadows. The river is audible in the background.
- Zongde's qi is perceptible (if the player attends): rougher than the player's, less stable, with a faint metal-phase signature (his traveling teacher favored metal-phase techniques). His reservoir is similar to the player's; his control is worse.
- Combat animations: committed strikes (no instant cancel), real impacts (the opponent staggers, the player staggers), fatigue visible in posture. No "health bar" UI; the player perceives their own reservoir depleting (a felt sense of hollowness) and the opponent's (a perceived dimming of their qi).

---

## Scene 4: The Failed Breakthrough (Foundation Establishment, attempted too early)

### Setting
Old Chen's hermitage, the winter of the player's 21st year. The player has been studying with Old Chen for ~4 years and has reached the peak of Qi Condensation — the reservoir is as full as it will get, the meridians are as developed as they will be without integration, the player is ready (in their own assessment) to attempt Foundation Establishment.

Old Chen disagrees. He assesses the player as "not yet stable" — the player's wood-phase affinity is too dominant, their metal-phase is too weak, and their psychospiritual state is not settled (the player has an unresolved grief: a younger sibling who died of fever two years ago, which the player has not fully mourned because they were studying and could not return in time).

The player, against Old Chen's advice, attempts the breakthrough anyway. They do it at night, in the hermitage's practice room, while Old Chen sleeps.

### The scene's purpose
- The player learns that Foundation Establishment cannot be forced
- The player learns that psychospiritual state matters as much as qi-state
- The player learns that grief unprocessed becomes 心魔
- The player experiences a real, consequential failure — not a game-over, but a setback that changes the character

### The verbs the player uses
- **Attempt the breakthrough (起修筑基)** — the player begins the integration process. This is a long verb (minutes of real-time, hours of in-game time), requiring sustained attention and specific routing.
- **Monitor the integration** — the player perceives (in the "sense self" mode) the body, qi, and spirit beginning to integrate. The process is complex; the player must guide it, balancing phase-affinities and yin-yang signature.
- **Continue or abort** — at several points, the player can choose to continue (pushing through instability) or abort (withdrawing gracefully). Continuing is tempting; aborting feels like failure.
- **Confront the grief** — at the critical moment, the integration requires the player's full psychospiritual presence. The unprocessed grief surfaces — the player perceives, in the inner geography, the cold knot of it, the unmourned sibling, the guilt of absence. The player must either:
  - Integrate the grief (acknowledge it, feel it, let it move) — which requires time and attention the integration does not have
  - Push past the grief (continue the integration despite the psychospiritual disturbance) — which risks 心魔
  - Abort the integration (withdraw, mourn, try again later) — which is the correct choice but feels like failure

### Failure modes
- **The player aborts.** The integration is withdrawn. The player is shaken but unharmed. Old Chen, waking, finds them and asks what happened. The player must explain. Old Chen is relieved they aborted; he discusses the grief and the premature attempt. The player must mourn the sibling (a scene or sequence of scenes) before attempting again. This is the correct outcome.
- **The player pushes past the grief and succeeds.** The integration completes, but the grief is not resolved; it becomes a 心魔 (obsession: the player cannot stop thinking about the sibling, perceives their residue everywhere, dreams of them). The player reaches Foundation Establishment but with a psychospiritual deviation that will require months or years to address. This is a pyrrhic success.
- **The player pushes past the grief and fails.** The integration destabilizes. The player's qi-system goes turbulent. The breakthrough fails catastrophically: the reservoir cracks (not the golden core — there is no golden core yet — but the equivalent at Qi Condensation), the player is injured (internal damage, meridian inflammation), and Old Chen must intervene to stabilize them. The player loses months of progress. This is the most common failure for premature attempts.
- **The player pushes past the grief and deviates.** The integration does not fail outright but produces a fragmented 心魔: the player's sense of self becomes unstable. They begin to perceive the dead sibling's presence (hallucination), to act in ways they do not remember (fragmentation), to feel the sibling's emotions as their own (compulsion). Old Chen intervenes; the player must undergo a long recovery. This is the worst outcome.

### The aftermath
- The player's progress toward Foundation Establishment is set back (by months if they aborted, by years if they failed, indefinitely if they deviated).
- The player's relationship with Old Chen is tested (he is not angry; he is grieved that they did not trust his assessment).
- The player must mourn the sibling. This is a sequence of scenes (returning to the village, visiting the graveyard, speaking with the parents, performing the rites) that resolves the grief and prepares the player for a later, successful attempt.
- The player learns, viscerally, that cultivation is not about power but about wholeness. The un-whole cultivator cannot integrate.

### Procedural implications
- The breakthrough attempt is a tracked event with multiple outcomes based on the player's choices at each stage.
- The player's psychospiritual state (tracked by the simulation as a set of conditions: grief, guilt, unresolved attachment, etc.) is a real input to the breakthrough's success probability. A player with unprocessed grief has a lower chance of success and a higher chance of 心魔.
- Old Chen's assessment of the player's readiness is accurate (he perceives the grief and the imbalance). The player can choose to trust him or not.
- The sibling's death is a generated event (per the mortal substrate's child mortality and disease regime). The player's absence at the death is a consequence of their studying away from the village.

### Rendering implications
- The hermitage's practice room: a small, bare room, a mat on the floor, a candle. The lighting is dim (candlelight). The world outside is dark and cold (winter night).
- The "sense self" mode renders the inner geography: the meridians, the dantian, the gates, and — at the critical moment — the cold knot of grief in the chest, the unmourned sibling's residue (not a real residue; a psychospiritual representation).
- The integration attempt is rendered as a slow, internal scene: the player perceives the body, qi, and spirit beginning to align, then the misalignment (wood too dominant, metal too weak), then the surfacing of the grief. The player's choices are rendered as inner dialogue and felt sense, not as a menu.

---

## Scene 5: The Genuine Success (Foundation Establishment, done right)

### Setting
Old Chen's hermitage, the autumn of the player's 23rd year. The player has spent the two years since the failed breakthrough doing the work: mourning the sibling (a sequence of scenes in the village), balancing their phase-affinities (specific practices Old Chen prescribed), resolving the guilt (a scene with Old Chen where he tells the player, gently, that the sibling's death was not their fault and that their absence was the cost of the path they chose). The player is now, in Old Chen's assessment, ready.

The player attempts the breakthrough again. This time, with Old Chen present and supervising.

### The scene's purpose
- The player experiences a successful cultivation breakthrough
- The player feels what it is like to be *whole* — body, qi, spirit integrated
- The player's relationship with Old Chen culminates (he has done what he can; the player is now a cultivator in their own right)
- The player crosses the threshold from mortal-time to cultivator-time (lifespan extends; the mortal world will age faster than they do)

### The verbs the player uses
- **Attempt the breakthrough** — as in Scene 4, but this time the player is prepared.
- **Monitor the integration** — the body, qi, and spirit align. The wood-phase settles; the metal-phase strengthens; the yin-yang signature balances. The grief is present but not obstructing — the player has mourned, and the grief is now a part of them, not a knot.
- **Complete the integration** — at the critical moment, the three systems (body, qi, spirit) click into alignment. The feeling is *wholeness* — a recognition that these were always one thing, and the separation was an artifact of incomplete perception.
- **Rest in the new state** — the player sits in the integrated state for a time, perceiving the new self. Old Chen watches. He is silent. He is, for the first time, proud.

### Failure modes
- This scene is designed to succeed, assuming the player has done the preparatory work. The failure modes are:
  - **The player has not done the preparatory work** (has not mourned, has not balanced, has not resolved). If the player attempts the breakthrough prematurely again, Old Chen forbids it. The scene does not trigger.
  - **The player is interrupted** (an external event — a bandit attack, a message from the village, a natural disaster). The integration is aborted. The player can try again later. This is a generated complication, not a designed failure.

### The aftermath
- The player is now Foundation Establishment. Lifespan extends to ~200 years. Aging slows.
- The player's perception is enhanced (per Realm Ladder §Station 4): integrated self-perception, meridian depth perception, environmental qi-flow perception.
- The player's relationship with Old Chen changes: he is no longer the teacher; he is the senior, and the player is the peer (junior peer, but peer). Old Chen will die within the player's extended lifetime; the player knows this.
- The player's relationship with the mortal world changes: they will outlive their childhood friends, their parents, their lineage's older generation. The first return to the village after the breakthrough is a scene of recognition and loss.
- The player gains the verb "integrate a practice" (合修) — the ability to commit a practice so deeply it becomes part of them.
- The player is now, by the reckoning of the cultivation world, a cultivator. They can bear an oath of office (受職), found a household (立家), and (eventually) teach a practice (傳法).

### Procedural implications
- The breakthrough's success is determined by the player's state: balanced phase-affinities, resolved psychospiritual conditions, sufficient reservoir, stable meridians. If all are met, the breakthrough succeeds. If any are not, it fails (per Scene 4's failure modes).
- The aftermath triggers a cascade of social and perceptual changes. The simulation must track: the player's new lifespan, the player's new perceptions, the player's new standing in the cultivation world, the player's changed relationship to mortal time.
- Old Chen's death is a future event, generated lawfully (he is 82, appears 60, will live to ~90-100 in mortal years). The player will likely outlive him. This is a future scene, not a current one, but the simulation must schedule it.

### Rendering implications
- The hermitage's practice room, as in Scene 4, but in autumn (warmer light, the garden visible through the window with its herbs turning color).
- The integration is rendered as an inner scene: the three systems (body, qi, spirit) perceived as separate, then slowly aligning, then — at the moment of completion — clicking into one. The feeling is *recognition*, rendered as a perceptual shift: the world does not change, but the player does, and the player perceives the change.
- Old Chen's animation: watchful, still, a man who has waited years for this. At the moment of completion, he closes his eyes. He does not speak. The player perceives, faintly, a change in his qi — a release of tension, a settling, the qi of a man whose work is done.

---

## What this document enables

Five scenes, each specified concretely enough to build. Each scene:
- Has named characters with persistent state
- Has specific verbs the player uses
- Has multiple outcomes with downstream consequences
- Has procedural implications (what the generator and simulation must track)
- Has rendering implications (what the engine must render)

These scenes are the proof-of-concept for the entire design. If they can be built and they feel right, the engine works. If they cannot, no amount of additional lore will save the project.

The next document (07_PROCEDURAL_GENERATION_IMPLICATIONS) extracts the generator requirements from all prior documents into a single specification. The synthesis (09) ties them to the Three.js systems and the smallest end-to-end prototype.
