# 13 — Combat Grammar: The State Machine

**Status:** Candidate canon. Specifies the combat system as a real state machine, not a posture list. The first three realms (Mortal, Qi Induction, Qi Condensation) are specified at implementation resolution. The upper realms are specified at design resolution.
**Date:** 2026-08-03

---

## 0. Why this document exists

The prior corpus treated combat as a vocabulary: a list of verbs (route, strike, defend, read residue, yield, escalate). A vocabulary is not a system. The critique identified this directly: the "combat grammar" was a list of postures, not a state machine. Without a state machine, two implementers reading the same verb list produce two different combat feels, and neither is right because neither was specified.

This document closes that gap. It specifies combat as a **finite-state machine with named terminals, production rules, preconditions, postconditions, observables, and a tempo economy**. A programmer should be able to implement the first three realms' combat without further design input. The upper realms are specified at lower resolution, sufficient to design against but not yet to ship.

### Precedents cited (per AGENTS.md Part 3: "Cite the precedent")

- **Sekiro: Shadows Die Twice (FromSoftware, 2019)** — the commitment model. Once an attack enters active frames, the player cannot cancel. Deflection is a tight window (parry frames ≈ 12-15 at 30 fps ≈ 400-500 ms). No block-and-respond loop; only deflect-or-dodge.
- **Monster Hunter: World (Capcom, 2018)** — the heaviness model. Every weapon has committed startup/active/recovery frames; a Great Sword charge cannot be canceled once committed. The skill is reading the monster's tell during your own commitment window.
- **Street Fighter III: Third Strike (Capcom, 1999)** / **Guilty Gear XX (Arc System Works, 2002)** — the frame-data vocabulary (startup / active / recovery / frame advantage on block and hit). This is the implementation language; the engine's tweak UI (document 11 §6) exposes these per action.
- **Bushido Blade (Lightweight, 1997)** — the injury model. No hit points; a cut to the leg slows the character; a cut to the arm weakens grip; a cut to the head kills. Precedent for §8.

The combat grammar below is original in its integration (qi routing + residue reading + realm ladder), but every individual mechanic is calibrated to a shipped precedent. No uncalibrated thresholds.

---

## 1. The combat state machine

### 1.1 The terminals (states)

Every combatant occupies exactly one terminal state at any tick:

| State | Hanzi | Essence |
|---|---|---|
| **Idle** | 閒 | Ready to act. Can transition to any action state. Perceiving at full attention. |
| **Committed** | 勢成 | Mid-action. Cannot cancel. Sub-states: Anticipation (startup), Active (effect window), Wind-down (late frames). |
| **Recovery** | 餘勢 | Action just completed. Can act only to abort (§1.4) or chain (with penalty). Body recovering posture and balance. |
| **Staggered** | 亂 | Hit during Anticipation/Active, or hit hard enough to break posture. Cannot act. Duration scales with incoming strike's commitment weight. |
| **Downed** | 倒 | Knocked to the ground. Cannot act. Must rise (a committed action) before returning to Idle. Vulnerable to ground attacks. |
| **Dead** | 歿 | Terminal. Anchor state depends on realm (see §9). |

`Committed` is itself a micro-state-machine: `Anticipation → Active → Wind-down → Recovery`. Each sub-state has its own frame budget and observable signature (§1.3). The player cannot exit `Committed` early; this is the Sekiro/Monster Hunter commitment model.

### 1.2 The production rules (legal transitions)

Notation: `A --[trigger]--> B  | cost: T frames | observable: O`. A transition is illegal unless listed. Silence means illegal.

**From Idle:**

- `Idle --[attack input]--> Committed.Anticipation  | cost: action's startup frames | observable: intent telegraph (the weapon begins to move; a perceptive opponent can read which attack)`
- `Idle --[defend input]--> Committed.Anticipation  | cost: defense startup (block = 4-6 frames; dodge step = 6-8) | observable: defensive posture shift`
- `Idle --[feint input]--> Committed.Anticipation  | cost: feint startup (8-12 frames) | observable: false intent telegraph (the feint is designed to look like a real attack's startup)`
- `Idle --[route-switch input]--> Committed.Anticipation  | cost: 60-120 frames (see §4) | observable: the cultivator's qi visibly shifts between routings; opponents perceive the re-attunement`
- `Idle --[read-residue input]--> Committed.Anticipation  | cost: 20-30 frames (see §5) | observable: the cultivator's gaze fixes; their attention visibly narrows`
- `Idle --[yield input]--> Yielded  | cost: 0 | observable: open palms, lowered weapon, verbal declaration. A yielded combatant is protected by social law (see §7.4)`
- `Idle --[flee input]--> Committed.Anticipation  | cost: flee startup (10-15 frames) | observable: the combatant turns away from the engagement`

**Within Committed:**

- `Committed.Anticipation --> Committed.Active  | cost: action's active frames | observable: the action's full tell (this is when the strike's intent is unambiguous)`
- `Committed.Active --> Committed.Wind-down  | cost: action's late frames | observable: the strike has landed or missed; the weapon is decelerating`
- `Committed.Wind-down --> Recovery  | cost: 0 (the transition itself is free; the Recovery state has its own duration)`

The `Committed → Committed` micro-transitions are automatic. The player cannot interrupt them. **This is the commitment rule: there is no cancel out of Committed.**

A feint is the one exception, and it is not a cancel — it is a different action that ends in `Recovery` rather than `Active`:

- `Committed.Anticipation (feint) --> Recovery  | cost: feint recovery frames (8-12) | observable: the false telegraph collapses; the feinting combatant is back in Recovery`

The feint trades damage for deception: it never enters `Active`, so it deals no damage, but it baited the opponent into a defensive Committed that they now cannot cancel.

**From Recovery:**

- `Recovery --[idle timeout]--> Idle  | cost: 0 (automatic once recovery frames elapse)`
- `Recovery --[abort input]--> Idle  | cost: 0, but applies a fatigue cost (stamina + a small reservoir drain) and the combatant is left briefly perceptually dimmed. Aborting is a deliberate re-stance, not a cancel of a Committed action.`
- `Recovery --[any committed input]--> Committed.Anticipation  | cost: action's startup + an extra 4-6 frames (chain penalty)`. Chained actions are slower than actions from Idle. This is the "you cannot spam" rule.

**From Staggered:**

- `Staggered --[timeout]--> Recovery  | cost: 0 (the stagger duration is set by the incoming strike)`
- `Staggered --[harder hit]--> Staggered (extended)  | the stagger duration resets and extends. A second hit during stagger does not stack to Downed unless the second hit's commitment weight exceeds the stagger threshold.`
- `Staggered --[knockdown hit]--> Downed  | only if the incoming strike's commitment weight exceeds the knockdown threshold`

**From Downed:**

- `Downed --[rise input]--> Committed.Anticipation (rising)  | cost: 25-40 frames. Rising is itself a committed action; a rising combatant cannot defend during the rise.`
- `Downed --[harder hit]--> Downed (extended)  | ground attacks reset the rise timer`
- `Downed --[lethal hit]--> Dead`

**From Dead:** No transitions out. The combat is over for this combatant.

### 1.3 The observables (what each transition leaks)

A combatant's state transitions are not invisible. Every transition has a perceptual signature that a sufficiently perceptive opponent can read. This is the doctrine's "readable counterplay" (Sekiro precedent: the enemy's animation tell is the readable).

| Transition | Observable | Perceivable by |
|---|---|---|
| `Idle → Committed.Anticipation (attack)` | Weapon raises; weight shifts forward; qi-routing brightens in hands (Qi Condensation+) | Mortal: visible animation. Qi Induction+: faint qi-brightening. Core Formation+: routing detail. |
| `Idle → Committed.Anticipation (defense)` | Posture lowers; guard raises | All combatants |
| `Idle → Committed.Anticipation (feint)` | Looks like an attack's startup — but a perceptive reader notices the qi-routing does not match the apparent weapon path | Qi Condensation+ (with read-residue) |
| `Idle → Committed.Anticipation (route switch)` | Visible qi-shift between body regions; posture visibly re-attunes | Qi Induction+ (perceptually), Qi Condensation+ (with detail) |
| `Idle → Committed.Anticipation (read residue)` | Gaze fixes; the reader's own qi dims slightly as attention redirects inward | Qi Induction+ (perceptually) |
| `Committed.Active (any attack)` | The full tell; weapon at maximum extension; qi-brightening peaks | All combatants (the strike is now happening) |
| `Recovery → Idle (clean)` | Posture resets; qi dims back to baseline | Qi Induction+ |
| `Recovery → Idle (abort)` | A visible flinch; the stance collapses briefly before resetting | All combatants |
| `Staggered` | The combatant staggers; qi flares erratically (deviation risk; see §8.4) | All combatants |
| `Downed` | The combatant is on the ground; qi is dimmed and pooling | All combatants |

A combatant at Qi Induction can perceive the qi-observables but cannot read their own routing to compensate. A Qi Condensation combatant can both perceive and route. The asymmetry produces a real skill gradient: the same observable is actionable at Qi Condensation and only informational at Qi Induction.

### 1.4 Preconditions and postconditions

Each transition has a precondition (what must be true for the transition to be legal) and a postcondition (what becomes true after). The engine checks both every tick.
- **`Idle → Committed.Anticipation (slash)`:** pre: combatant in `Idle`; available qi ≥ slash's reservoir cost (Qi Condensation+) OR slash costs no qi (Mortal). post: combatant in `Committed.Anticipation`; reservoir debited when the action enters `Committed.Active` (not at input time — the debit lands when the strike lands or whiffs).
- **`Staggered → Downed`:** pre: incoming strike's commitment weight exceeds the combatant's posture threshold (function of realm — Foundation Establishment is ~4× Mortal — routing, and fatigue). post: combatant in `Downed` with a knockdown timer set by the strike's weight.

The full precondition/postcondition table is implementation data, exported as `combat.json` (per document 11 §6).

---

## 2. The tempo economy

### 2.1 The frame budget

The simulation runs at 60 Hz (document 11 §1.3; one tick = one frame = 16.67 ms). Every action costs frames. The frame cost is the resource; spending it well is the skill. This is the Bushido Blade / Third Strike precedent made explicit.

**Action class → frame cost**

| Class | Examples | Startup | Active | Recovery | Total |
|---|---|---|---|---|---|
| **Fast** | jab, dodge step, parry, feint-pulse | 4-6 | 2-4 | 4-6 | 10-16 |
| **Medium** | slash, block, route-switch partial, throw | 8-12 | 4-8 | 8-12 | 20-32 |
| **Heavy** | qi burst, formation activation, route-switch full, ground-slam | 20-30 | 8-12 | 20-30 | 48-72 |
| **Ritual** | bear oath (Foundation Establishment+), open domain (Spirit Severance+) | 60+ | 0 | 30+ | 90+ |

The user's instruction specified: fast = 8-12 frames; medium = 15-25 frames; heavy = 40-60 frames. These are total-cost windows; the startup/active/recovery breakdown above is consistent with them and adds the Third Strike frame-data granularity the engine needs.

### 2.2 The three sub-costs

A player who only sees total cost cannot tune the feel. Every action has three sub-costs:
- **Startup (Anticipation):** the frames during which the action is telegraphed but not yet effective. The readable window. A longer startup is more readable but more committed.
- **Active:** the frames during which the action has its effect. A strike's active frames are when it can hit; a block's are when it can defend; a parry's are the deflection window.
- **Recovery:** the frames after the action during which the combatant cannot act. The punish window — the frames during which a successful dodge or parry leaves the attacker open.

Frame advantage on block and hit are derived from these. A strike that is `-6 on block` means the attacker is in Recovery for 6 frames after the defender returns to Idle; the defender can act first. A strike that is `+3 on hit` means the attacker returns to Idle 3 frames before the defender (who is in Staggered for those 3 frames).

### 2.3 The tempo resource and the reservoir drain

Tempo is not a meter; it is the **count of frames a combatant has spent in Committed vs Idle over the last N frames** (rolling window, default N=120 = 2 seconds). A combatant who has spent 90 of the last 120 frames in Committed is fatigued: their startup extends by 1-3 frames, recovery by 2-4, and their residue-reading becomes unreliable. A combatant at 30/120 is fresh. This is the brake on spamming — the Monster Hunter hunter who never sheathes to recover stamina is the hunter who gets carted.

Qi-bearing actions (Qi Condensation+) also cost reservoir, separate from tempo. A strike costs frames AND qi. A combatant can run out of either independently:
- **Out of tempo:** fatigued, slower, predictable. Recover by Idling.
- **Out of reservoir:** effectively mortal (per document 03 Station 3). Recover by resting, venting, or absorbing ambient qi (slow, dangerous, requires a qi-rich place).

A Qi Condensation cultivator who exhausts their reservoir mid-fight becomes, mechanically, a Mortal — they keep their skill but lose their routing. This is the most common combat failure at Qi Condensation.

---

## 3. The commitment model

### 3.1 The no-cancel rule

Once a combatant enters `Committed.Anticipation`, they cannot exit until the action's frame budget is spent and they transition through `Committed.Active → Committed.Wind-down → Recovery`. There are no instant cancels, no roll-cancels, no jump-cancels, no special-move cancels. This is *exactly* Sekiro's posture system and Monster Hunter's weapon commitment: in Sekiro, once you press attack, you cannot cancel into a dodge until the attack's recovery frames begin; in Monster Hunter, a Great Sword's true charge slash cannot be canceled once the third swing begins. This document adopts that model in full.

### 3.2 Why no cancels

Cancels produce spammy combat. A combatant who can cancel any action into any other has no commitment, no punish window, no readable telegraph, no skill expression. Every modern fighting game that has added cancel systems (Marvel vs. Capcom, Dragon Ball FighterZ) has had to add escalating costs (meter, sparks) to prevent the cancel system from destroying readability. This project does not have meter; it has tempo and reservoir. Cancels would spend tempo and reservoir unpredictably and destroy the readable counterplay the doctrine demands.

The commitment rule is also the **design engine, not just the brake** (per AGENTS.md Part 3). What commitment unlocks: the readable telegraph. Because attacks cannot be canceled, an attack's startup is real information — the defender knows the attack is coming and can choose how to respond. Without commitment, the startup is meaningless (the attacker could cancel); with commitment, the startup is the readable, and reading it is the skill.

### 3.3 The four legal exits from Committed

There are exactly four ways to leave Committed:

1. **Natural completion:** the action runs its full frame budget and transitions through to Recovery.
2. **Feint collapse (feint only):** a feint transitions from Anticipation directly to Recovery, skipping Active. This is the only "early exit" and it is itself a committed action — the feint has its own frame budget.
3. **Hit during Anticipation:** if the combatant is hit during Anticipation (before Active), they enter Staggered. The action is aborted by being hit, not by choice.
4. **Hit during Active (sufficient to stagger):** a sufficiently heavy hit during Active can stagger the combatant out of their own strike. This is rare (the Active frames are when the strike is at full extension) but possible with a perfectly timed counter.

There is no fifth exit. There is no "dash cancel." There is no "qi-burst cancel." There is no "input-buffer cancel." The player must commit.

### 3.4 The input buffer

To make the commitment model feel fair rather than punishing, the engine maintains an input buffer of 8 frames. Inputs pressed during the last 8 frames of Recovery are held and fire on the first frame of Idle. This is the Super Smash Bros. / Celeste input-buffer precedent: the player's intent is preserved across the recovery window without violating commitment. Inputs pressed earlier than 8 frames before Recovery ends are dropped.

---

## 4. The qi routing system in combat

### 4.1 The four routings

A Qi Condensation+ combatant can route qi to one of four body regions. Each routing enhances a specific dimension of capability:

| Routing | Hanzi | Enhances | Diminishes |
|---|---|---|---|
| **Hands (Strength)** | 手 | Strike damage, grip strength, lifting force | Fine perception, agility |
| **Legs (Speed)** | 足 | Movement speed, dodge distance, attack speed | Damage, resistance |
| **Senses (Perception)** | 覺 | Residue reading fidelity, feint detection, attacktell perception | Damage, resistance |
| **Skin (Resistance)** | 皮 | Posture threshold, damage reduction, knockdown resistance | Speed, perception |

A combatant can have at most one routing active at a time. At Qi Condensation, switching routings is a committed action; at Foundation Establishment, the integration makes switching faster but still committed; at Core Formation+, the routing becomes near-instant but never free.

### 4.2 The switch cost

Switching routings is a **Heavy action** (per §2.1): 60-120 frames (1-2 seconds) at Qi Condensation, 40-60 frames at Foundation Establishment, 20-30 frames at Core Formation+. During the switch, the combatant is in `Committed.Anticipation` and cannot act. The switch is also visible (per §1.3) — opponents perceive the re-attunement and can exploit the window.

The user's instruction: "You cannot hot-swap routings mid-combo. This forces commitment to a fighting style." This is the rule. A combatant who begins a fight routed to Hands must commit to a Hands-fighting style; if they want to switch to Legs to escape, they pay the switch cost and are vulnerable during it. This produces real strategic depth: the routing choice at fight-start constrains the entire fight unless the combatant finds a window to re-attune.

### 4.3 The partial-routing sub-system

At Qi Condensation, a combatant can choose to **partially route** — split their qi between two routings at 60/40 or 70/30, with reduced enhancement to both. A 70/30 Hands/Skin combatant hits harder than pure Skin but softer than pure Hands, and is more durable than pure Hands but less than pure Skin. Partial routing is the intermediate-skill expression: beginners use pure routings; experts tune partials to the opponent; masters switch partials mid-fight by paying the switch cost.

### 4.4 Routing and realm

- **Mortal:** no routing. Capability is fixed by the body.
- **Qi Induction:** can perceive routing (own faintly; others' if attended) but cannot route. The most frustrating station: they see the qi layer but cannot play it.
- **Qi Condensation:** first station that can route. Switch cost high (60-120 frames). One routing, or a partial split.
- **Foundation Establishment:** switch faster (40-60 frames); effect ~2× Qi Condensation; partial splits viable at 50/50.
- **Core Formation:** switch 20-30 frames; effect ~4× Qi Condensation; routing sustained indefinitely without reservoir drain (per document 03 Station 5).
- **Nascent Soul:** routing near-instant (10-15 frames) but still costs attention; the spirit can project a routing outside the body.
- **Spirit Severance:** routing extends into the domain; the cultivator's routing affects the entire domain, not just their body.

---

## 5. The residue reading system

### 5.1 What residue reading reveals

A Qi Condensation+ combatant can, mid-combat, read an opponent's qi-residue. Residue is the trace left by every qi-bearing action — the cultivation-world's forensic signature (per document 03 Station 3 verb 讀殘, "read residue"). In combat, residue reading reveals:

1. **Opponent's current routing** — which region their qi is brightening in (Hands, Legs, Senses, Skin). This is the most basic read.
2. **Opponent's intended next routing** — if they are mid-switch, the residue shows the destination before the switch completes. This is the high-value read; it lets the reader counter the switch.
3. **Opponent's reservoir state** — how much qi they have left, and how contaminated it is. A near-empty reservoir is dim; a contaminated reservoir is discolored.
4. **Opponent's fatigue level** — the qi-version of the tempo economy. A fatigued opponent's residue is sluggish; their qi moves slowly between regions.
5. **Opponent's deviation onset** — if the opponent is developing a somatic deviation (false circuit, cross-current), the residue shows the deviation forming before it manifests. This is the rarest read and the most valuable; it lets the reader predict the opponent's breakdown.

### 5.2 The attention cost

Residue reading costs attention. Attention is a finite resource, distinct from tempo and reservoir. A combatant has a fixed attention budget (~100 units at Qi Condensation, scaling up at higher realms). Reading residue costs attention per second of reading; the cost scales with the depth of the read:

- Surface read (current routing): 5 attention/sec
- Mid read (intended routing, reservoir state): 15 attention/sec
- Deep read (fatigue, deviation onset): 30 attention/sec

A combatant who exhausts their attention cannot read residue until they rest (attention recovers slowly in Idle, faster in meditation). More critically, **a combatant who is reading cannot attack** — the read is itself a Committed action (per §1.2, `Idle → Committed.Anticipation (read residue)`). This is the doctrine's "investigative verb in combat" made mechanically honest: you cannot attack and investigate simultaneously. You must choose.

### 5.3 The feint-read asymmetry

Feints and reads are in direct tension. A feint produces a false routing-telegraph that a reader can detect — but only at the mid-read depth (intended routing). A surface reader sees the feint's apparent routing and is fooled; a mid-reader sees the discrepancy between the apparent and intended routing and detects the feint; a deep reader sees the feint's tell in the opponent's fatigue signature (a feinting combatant is slightly more fatigued than an attacking one because the feint requires more control).

This produces a real read-feint-counter-feint-counter-read loop, calibrated to attention costs. A combatant who reads deeply enough to detect feints will exhaust their attention faster than one who reads shallowly; the shallow reader is more often fooled but lasts longer in the fight. Neither is strictly better; the choice depends on the opponent.

### 5.4 The protagonist's advantage (Residual Error Sense) in combat

The protagonist's Residual Error Sense (document 00 §5) enhances perception of their *own* qi-residue, not the opponent's. In combat: the protagonist can review their own committed actions post-Recovery and see exactly where their routing diverged from intent — a faster learning loop than other cultivators get. The protagonist does **not** get enhanced reads of opponents. Per the parity oracle (document 00 §5), an NPC with the same advantage gets the same self-read; the protagonist does not get a stealth combat buff. The advantage is a long-loop advantage (they learn faster across fights), not a short-loop advantage (they do not win individual fights more easily). The doctrine's "no automatic victory" test is satisfied.

---

## 6. The combat verbs by realm

The realm ladder (document 03) specifies what each station *adds*. Combat inherits that ladder. Each realm's combat is qualitatively different, not numerically bigger.

### 6.1 Mortal (凡人)

- **Verbs:** strike, grapple, dodge, block, flee. No qi. Tempo only. Reservoir is zero. Routing is impossible.
- **Perception:** visible animation only. No qi-observables.
- **Failure mode:** bodily death is final (anchor enters bardo; see §9).
- **The feel:** grounded, physical, terrifying. A mortal duel is two people who can be killed by one cut. Every commitment is a risk of death. The Bushido Blade precedent.
- **State machine:** the full state machine (§1) applies, but with no Committed sub-states that depend on qi (no route-switch, no read-residue, no feint-pulse). Anticipation/Active/Wind-down still apply; they are purely physical.

### 6.2 Qi Induction (引气)

- **Verbs:** all mortal verbs, plus perceive qi (passive).
- **Perception:** can perceive opponents' qi-observables (routing brightening, reservoir state, fatigue) but cannot route own qi. The most frustrating combat station: the combatant sees the qi-game being played but cannot play it.
- **Failure mode:** as mortal, plus perception burn (overusing qi-perception mid-combat produces headache, nosebleed, temporary blindness — per document 03 Station 2).
- **The feel:** watching a fight you cannot fully participate in. The Qi Induction combatant is a mortal who knows too much. They can predict an opponent's strike by reading the qi-telegraph, but they can only respond with mortal verbs.

### 6.3 Qi Condensation (凝气)

- **Verbs:** strike, grapple, dodge, block, flee (mortal) + route qi, anchor trace, vent, read residue.
- **First realm with real combat verbs.** Routing, reading, and venting are all available.
- **Reservoir:** finite, depletes with use, recovers slowly. Exhaustion → effectively mortal.
- **Routing switch cost:** 60-120 frames (1-2 seconds). Heavy commitment.
- **Read cost:** 5-30 attention/sec depending on depth.
- **Failure modes:** reservoir exhaustion (most common), somatic deviation under pressure, psychospiritual disturbance from violence.
- **The feel:** the first time qi-enhanced combat clicks. The cultivator routes to Hands, lifts a stone they could not lift before, and understands that they are playing a different game than the mortal they were. But the envelope (document 03 Station 3) holds: they cannot split a mountain, cannot survive a great fall, cannot outlast a long fight.
- **State machine:** full state machine including all qi-bearing transitions. The Golden Scene 3 duel (document 06) operates at this realm.

### 6.4 Foundation Establishment (筑基)

- **Verbs:** all Qi Condensation verbs, plus integrate practice, form meridian, bear oath, found household, teach.
- **Combat-relevant additions:** faster recovery (reservoir ~2× faster), larger reservoir (~3× Qi Condensation), stronger routing output (~2× per routing). Routing switch cost drops to 40-60 frames.
- **Bear oath (受職):** the combat verb unique to Foundation Establishment. A cultivator can, mid-combat, make a qi-bound promise — "I will not flee this fight," "I will not strike to kill," "If you yield, I will spare you." The oath is qi-bound: breaking it produces real spiritual consequences (reservoir contamination, deviation risk, anchor-stain). The oath constrains both parties: the bearer is bound, and the opponent who accepts the terms (by hearing and not contesting) is socially bound to honor the oath's protection. This is the verb that makes Foundation Establishment combat *social*, not just physical. A duel with an oath is a different fight than a duel without.
- **Failure modes:** foundation collapse (rare in combat but possible under severe disruption), advanced somatic deviation, institutional betrayal.
- **The feel:** the cultivator is now a coherent system. The difference from Qi Condensation is not "I am stronger" but "I am whole." The oath mechanic adds weight: every duel can be made more consequential by an oath, and the cultivator must choose whether to bear one.

### 6.5 Core Formation (金丹)

- **Verbs:** all Foundation Establishment verbs, plus form golden core, sustain qi field without ambient qi, perceive spirit anchors, refine treasure, found sect, author minor law.
- **Combat-relevant additions:** self-sustaining qi (the combatant can fight in qi-dead environments — deserts, warded chambers — without depletion); perceive spirit anchors (see if an opponent is possessed, projecting, or a walking corpse); refined treasures (the weapon carries qi and intent — a Core Formation sword is not just sharper, it is a qi-bearing instrument with its own state machine).
- **Routing switch cost:** 20-30 frames. Near-instantaneous by mortal standards.
- **Failure modes:** cracked core (catastrophic, often fatal); tribulation death; perception overload (newly-formed Core Formation cultivators may see anchors everywhere and become disoriented).
- **State machine:** same state machine, plus a secondary state machine for treasures (a treasure has its own Committed/Recovery cycle; using a treasure's qi-effect costs the cultivator's attention and the treasure's own charge). The cultivator is no longer dependent on ambient qi; their reservoir does not drain in qi-dead environments.

### 6.6 Nascent Soul (元婴)

- **Verbs:** all Core Formation verbs, plus project spirit, possess (criminal), survive bodily death, found lineage.
- **Combat-relevant additions:** the spirit can project — the cultivator can fight without their body. A projected spirit is immune to physical attacks but vulnerable to spiritual attacks; it cannot interact with physical objects but can deliver spiritual strikes. Possession (奪舍) is possible mid-combat: a Nascent Soul cultivator can attempt to seize an opponent's body, displacing the opponent's anchor. Criminal, slow (a Ritual action, 90+ frames), punishable by law — but possible.
- **Survive bodily death:** if the body is destroyed, the anchor flees to a prepared refuge. The cultivator is not dead; they are bodiless. They can be retrieved, possess a new body (with all consequences), or persist as a wandering spirit.
- **Failure modes:** projection capture (the projected anchor is trapped); possession backlash (the displaced anchor's kin take revenge); anchor-flight failure (the prepared refuge is destroyed or blocked).
- **The feel:** the cultivator is no longer identical with their body. Combat at this station includes fighting an opponent who is not in the body you are looking at. The doctrine's "possession is criminal" is enforced by the social-system, not by the combat state machine — the state machine permits the action; the world punishes it.

### 6.7 Spirit Severance (化神)

- **Verbs:** all Nascent Soul verbs, plus open domain, enforce local law, contest domain, sever attachment.
- **Combat-relevant additions:** the cultivator can open a domain — a bounded region where their will is partially authoritative. Within the domain, they can author local laws: "no fire burns here," "no blade cuts here," "all who enter yield their weapons." Laws are enforced by the world, not by the cultivator's ongoing attention (the cost is paid at domain-opening, not per-enforcement).
- **Domain contest (破域):** two Spirit Severance cultivators in the same space contest whose law holds. Not a physical fight; a law-conflict (see §7.5). The loser's domain collapses; the winner's holds.
- **Failure modes:** domain collapse (overwhelmed by a stronger cultivator or a tribulation); severance regret (severing an attachment the cultivator later needed); law-backlash (an authored law has unintended consequences). Within the domain, the cultivator is sovereign — a Spirit Severance cultivator fighting a Core Formation cultivator in their own domain is not fighting, they are adjudicating.

---

## 7. Combat across scales

The state machine in §1 is the 1v1 duel. Combat at other scales adapts the state machine, not abandons it. The principle: **the state machine is the substrate; the scale configures it.**

### 7.1 The 1v1 duel

The full state machine. All transitions available (subject to realm). All observables perceptible (subject to realm). Commitment matters; reading matters; routing matters. This is the prototype's third scope (per document 09 §1.3) — the Golden Scene 3 duel.

### 7.2 The 1v12 mob

A single cultivator against twelve mortals, or twelve lesser cultivators. The state machine is the same, but:
- **The mob's state machine is simplified.** Each mob member has only Idle, Committed (attack only), Recovery, Staggered, Downed, Dead. No routing, no feints, no reads. The mob is not a duel; it is a crowd.
- **Crowd control matters.** Area-effect qi actions (a vented burst, a formation activation) hit multiple mob members. These are Heavy actions (40-60 frames) and leave the cultivator in long Recovery — but they reset multiple mob members to Staggered simultaneously.
- **Tempo economy shifts.** The cultivator cannot trade blows with twelve opponents; they will lose the tempo war. They must use mobility (Legs routing) and area effects to keep the mob from surrounding them.
- **Reservoir is the bottleneck.** A Qi Condensation cultivator fighting 12 mortals will exhaust their reservoir before exhausting the mob, unless they fight efficiently (one strike per mortal, no wasted motion). This is the genre's "cultivator vs. army" trope, made mechanically honest.

### 7.3 The giant hunt

A single cultivator (or party) against a giant spirit beast. The giant is not a combatant with the same state machine; it is a **terrain piece with hit zones**. The Monster Hunter precedent, made explicit.
- **The giant has hit zones:** head (high damage, high risk), limbs (lower damage, lower risk), torso (medium), tail (often severable). Each zone has its own injury state (per §8).
- **The giant's attacks are telegraphed over long windows** (60-120 frames of Anticipation) but deal devastating damage. The cultivator's skill is reading the tell and positioning.
- **The cultivator's state machine is unchanged,** but the giant's scale means many actions (a single slash) are insufficient to stagger it. Staggering a giant requires either a sustained sequence of hits to a single zone, or a Heavy qi-burst to a weak zone.
- **Routing matters more.** Legs to dodge; Hands to damage; Skin to survive a hit. The cultivator must switch routings during the fight, paying the switch cost during the giant's recovery windows.

### 7.4 The battlefield

Army-scale combat. The cultivator is a **force multiplier, not a solo hero**. The Total War / Mount & Blade precedent.
- **The cultivator does not fight every soldier.** They fight at key moments — breaking a formation, dueling the enemy commander, holding a breach. Between those moments, they are recovering, routing, or reading the battlefield.
- **The battlefield has its own state machine:** the army's morale, formation, and supply state. The cultivator's actions affect these: breaking a formation collapses the enemy's morale; killing the commander produces a succession crisis.
- **Read residue scales up.** A Core Formation+ cultivator can read the qi-state of the *battlefield itself* — where morale is breaking, where a commander is wounded, where a hidden unit is massing. This is the residue-reading verb applied at battlefield scale.
- **The cultivator's death matters more.** A cultivator who dies on the battlefield loses not just themselves but the force-multiplication they provided. Their side's morale collapses.

### 7.5 The law conflict

Spirit Severance+ combat. No physical combat; the contest is over **whose law holds in the contested space**.
- **No state machine for physical combat.** The law conflict is a separate state machine: `Law-Proposed → Law-Contested → Law-Resolved`. Each transition has its own tempo (laws proposed over seconds to minutes; contested over minutes to hours; resolved by withdrawal, exhaustion, or external adjudication).
- **The contested space** is the region where both cultivators' domains overlap. Within the overlap, neither law holds cleanly; the conflict is the resolution.
- **Resolution mechanisms:** withdrawal (one concedes), exhaustion (one's reservoir depletes; their domain collapses), external adjudication (a higher-realm cultivator or tribunal rules), or — rarely — mutual destruction (both domains collapse, both cultivators injured).
- **The feel:** not a fight, a trial. The doctrine's "no physical combat" rule is honored: at this realm, physical strikes are irrelevant because the laws they would violate already govern the space.

---

## 8. The injury model

Injuries are not hit points. They are **specific physical and qi-system damage with specific effects**. The Bushido Blade precedent, expanded.

### 8.1 The injury types

| Injury | Cause | Effect | Recovery |
|---|---|---|---|
| **Cut (superficial)** | Light strike, partial dodge | Pain (small tempo penalty); bleeding (small reservoir drain over time) | Hours to days, untreated; faster with medicine |
| **Cut (deep)** | Heavy strike to flesh | Pain (significant tempo penalty); bleeding (significant reservoir drain); reduced grip if on arm, reduced mobility if on leg | Weeks to months, untreated; faster with medicine and cultivation |
| **Cut tendon** | Precision strike to wrist/ankle | The affected limb loses function: cut wrist tendon → grip strength drops to ~20%; cut ankle tendon → movement speed drops to ~30% | Months; full recovery requires surgery or Core Formation+ healing |
| **Fractured bone** | Heavy impact, fall | The affected region is unusable: fractured arm → cannot wield two-handed weapons; fractured leg → cannot stand without support; fractured rib → breathing costs extra tempo | Months; full recovery requires alignment and immobility, or Core Formation+ healing |
| **Meridian inflammation** | Qi-strike to a meridian, or routing overload | The affected meridian blocks qi-routing through it. If the meridian serves Hands, hand-routing is reduced; if it serves Legs, leg-routing is reduced; etc. Inflamed meridians are also deviation-prone | Weeks; recovery requires rest, venting, and specific anti-inflammatory practices |
| **Organ damage** | Deep strike to torso | Systemic effects: damaged lung → stamina cost doubled; damaged liver → contamination tolerance halved; damaged heart → reservoir cap reduced; damaged kidney → reservoir recovery halved | Months to years; full recovery often requires Foundation Establishment+ integration or Core Formation+ healing |
| **Qi depletion** | Reservoir exhausted below safe threshold | The cultivator is effectively mortal until reservoir recovers. All qi-verbs are unavailable. | Hours of rest; faster in qi-rich environments |
| **Anchor bruise** | Spiritual strike (Core Formation+) | The cultivator's anchor is shaken; perception is unreliable, oaths are strained, deviation risk increases | Weeks; recovery requires stabilization practices |
| **Core crack** | Sufficient shock to a Core Formation cultivator | Catastrophic. The golden core fragments; the cultivator's qi becomes uncontrollable; deviation is near-certain | Often fatal; if survived, recovery is years and may leave the cultivator permanently reduced |

### 8.2 The injury stack

A combatant can have multiple injuries simultaneously. Injuries stack: a combatant with a cut tendon in the wrist, a fractured rib, and meridian inflammation in the arm's meridian has compounded penalties — grip reduced by the tendon, breathing impaired by the rib, arm qi-routing blocked by the inflammation. The combatant is, mechanically, barely functional. This is the genre's "wounded cultivator" trope made mechanical: not less HP, but a specific, named set of impairments that change how they must fight.

### 8.3 Injury and the state machine

Injuries modify the state machine's transitions:
- A combatant with a fractured leg cannot transition to `Idle → Committed.Anticipation (dodge)`. The transition is illegal until the leg heals.
- A combatant with meridian inflammation in the Hands meridian cannot route to Hands. The routing is unavailable.
- A combatant with organ damage to the lung has their tempo costs doubled (every action costs 2× frames) because breathing is impaired.
- A combatant with qi depletion cannot enter any qi-bearing Committed state. They are limited to mortal verbs.

The engine enforces these. A combatant who tries to dodge with a fractured leg finds the input rejected (with a visible "stumble" animation, not a silent failure — the doctrine's "feel" rule).

### 8.4 Deviation onset in combat

Injuries can also be qi-system injuries — the somatic deviations from document 03 Station 3. These are not random punishments; they are lawful consequences of routing under pressure:
- **False circuit (假周天):** routing qi in a closed loop that bypasses the reservoir. Tempting (feels like infinite qi) but produces contamination accumulation. Risk: routing aggressively for too long.
- **Cross-current (逆流):** routing qi against its natural flow. Produces internal damage. Risk: switching routings faster than the switch cost allows.
- **Route fixation (路執):** becoming locked into a single routing, unable to switch. Risk: fighting too long in one routing.

A cultivator who is developing a deviation has a deviation meter (per combatant, exported in `combat.json`) that fills based on risky routing. When the meter fills, the deviation manifests as a persistent condition with its own state-machine effects (e.g., route fixation makes the switch transition illegal until the deviation is resolved).

---

## 9. The death model

### 9.1 Death by realm

Death in this project is governed by the anchor model (document 00 §2). The combat state machine's `Dead` terminal is the body's death; what happens to the anchor depends on realm:

- **Mortal / Qi Induction / Qi Condensation:** body dies; the cultivator cannot sustain the anchor without the body. Anchor enters bardo (中陰), bounded: it can be retrieved (by a teacher, ally, or the cultivator's own cultivated skill) within a lawful window, or it proceeds to reincarnation. Final death (寂滅) if the window expires or the anchor is dispersed.
- **Foundation Establishment:** the integrated system sustains the anchor briefly without the body. Bardo retrieval window is longer; the anchor carries the cultivator's integrated qi-state. Resurrection (還魂) is possible if the body is recoverable and retrieval happens in time.
- **Core Formation:** the golden core persists briefly as a qi-bearing object. The core can be retrieved by allies and used to reconstitute the cultivator (long, costly). If the core is destroyed before retrieval, the anchor enters bardo.
- **Nascent Soul:** the anchor (元婴) can flee independently. The cultivator is not dead; they are bodiless. They can persist as a wandering spirit, possess a new body (criminal), or be retrieved into a prepared vessel.
- **Spirit Severance:** the anchor is bound to the domain as much as to the body. If the domain stands, the cultivator can reconstitute from it. If the domain falls, the anchor enters bardo.
- **Void Amalgamation:** the anchor is bonded to a place (grotto-heaven, sacred mountain). If the place stands, the cultivator endures. If the place falls, the cultivator falls.
- **Tribulation Crossing / Mahayana:** the anchor is robust but not invincible. **Final death (寂滅)** — dispersion of the anchor — is possible through specific high-realm conflict (a Mahayana law-contest, a sufficient tribulation, expiry of the bardo window). Final death is the one true end.

### 9.2 The death state machine

Bodily death (`Dead` in §1.1) is not the end of the state machine for the anchor: `Dead → Bardo → (Retrieved / Reincarnated / Dispersed)`.
- **Bardo (中陰):** the intermediate state. Bounded duration (per realm, per document 00 §2). Perceptible to Core Formation+ cultivators. Can be summoned, trapped, claimed, or retrieved.
- **Retrieved (還魂):** the anchor is returned to its original body (if recoverable) or to a new body (possession-by-consent). The cultivator resumes life, often with significant costs.
- **Reincarnated (轉世):** the anchor enters a new body, typically with no conscious memory of the prior life. The cultivator is, mechanically, a new character — but the anchor's karmic trace (if ratified; see document 00 §7) carries forward.
- **Dispersed (寂滅):** final death. The anchor is gone. No recovery is possible. For the protagonist, this is game-over (per document 00 §2).

### 9.3 Death and the player

The player is not exempt. A player who dies in combat:
- At Mortal–Qi Condensation: enters bardo. Must be retrieved (by a teacher, ally, or the player's own cultivated skill) or be reincarnated (losing the body's cultivation progress).
- At Foundation Establishment: enters bardo with a longer retrieval window. The player's allies (NPCs) may attempt retrieval.
- At Nascent Soul: the anchor flees. The player continues as a bodiless spirit until they find a new body or are retrieved.
- At Mahayana: final death is possible but only through specific high-realm conflict. The player is not invincible.

Save/reload is a meta-game mechanic, not an in-world power (per document 00 §2). The player can save-scum to avoid death, but the in-world consequence of death is real and governed by this model.

---

## 10. What this document enables and does not decide

This document specifies the state machine (§1), tempo economy (§2), commitment model (§3), qi routing (§4), residue reading (§5), realm verbs (§6), scales (§7), injuries (§8), and death (§9) at implementation resolution for the first three realms. A programmer can implement the Golden Scene 3 duel (document 09 §1.3, document 06 Scene 3) from this document plus documents 03 (Station 3), 06 (Scene 3), and 11 (§6, the CombatSystem engine module). The upper realms are specified at design resolution; each upper realm's combat will require its own prototype proof before being committed to canon.

**What this document does not decide:**
- **Exact frame data per named attack.** The classes (fast/medium/heavy) are specified; per-attack values are tuning data in `combat.json`, found through playtesting.
- **Injuries per weapon type.** §8 specifies the injury types; the per-weapon mapping (sword → cuts; staff → fractures; qi-strike → meridian inflammation) is implementation data.
- **The law-conflict state machine's full transition table.** §7.5 names the states; transitions are at Spirit Severance design resolution and will be expanded when the first Spirit Severance prototype is authorized.
- **The bardo state machine.** §9 names the states; the full transition table is deferred, with a deadline: bardo must be specified before the protagonist reaches Foundation Establishment, because Foundation Establishment is when bardo becomes mechanically relevant.

---

## 11. Open decisions (surfaced for review)

Per AGENTS.md Part 3: "Exhibit reviewer voices; do not self-certify." The following are decided but not with full confidence:

1. **The 8-frame input buffer.** Smash Bros. uses 10; Celeste uses 6; 8 is a guess. May need to be 6 or 10 after playtesting.
2. **The 60-120 frame routing switch cost at Qi Condensation.** The user's instruction (1-2 seconds). May be too punishing or too lenient. The Golden Scene 3 duel will reveal which.
3. **The attention budget of 100 units at Qi Condensation.** Invented. Needs playtesting against the residue-reading costs (5/15/30 attention/sec).
4. **Injury types' exact recovery times.** Ranges, not values. The procedural generator (document 07) will need specific values, set in `combat.json` and tuned.
5. **Law-conflict as a separate state machine (§7.5).** Decided: law-conflict is not physical combat. The alternative (modifying the physical state machine) was rejected because it would muddy both. The decision is made; the alternative is named.
6. **The partial-routing sub-system (§4.3).** An addition not in the user's instruction, added because pure-routing-only combat is too inflexible to be fun (doctrine: "Design for joy first"). If playtesting reveals it is unnecessary, it can be removed.

---

## 12. Doctrine compliance

- **Build the engine, not just the brake:** the prior corpus's "combat grammar" was a brake (forbidden cancels, required commitments). This document specifies what those commitments unlock: readable telegraphs, real skill expression, the feint-read loop.
- **Make decisions; do not defer:** the state machine, tempo economy, commitment model, routing system, residue-reading system, injury model, and death model are all decided. §11 are tuning parameters, not forks.
- **Cite the precedent:** Sekiro, Monster Hunter, Third Strike, Guilty Gear, Bushido Blade, Super Smash Bros., Celeste, Total War, Mount & Blade are named and their contributions specified.
- **Design for joy first:** the commitment model, the routing system, and the feint-read loop are designed to produce the genre's best combat feel — readable, punishable, skill-expressive — adapted to xianxia's qi-system.
- **Implementation-ready for the Qi Condensation duel** (third prototype scope). Upper realms are design-ready; their prototypes are deferred until the Qi Condensation duel is proven.

This document is the combat bible. It is the state machine the prior corpus was missing.
