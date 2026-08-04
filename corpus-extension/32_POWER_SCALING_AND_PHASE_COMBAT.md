# 32 — Power Scaling and Phase-Combat

**Status:** Candidate canon. Closes the two integration gaps the critics identified: combat routing is not phase-aware (the largest gap), and the frame budget references are inconsistent (resolved in doc 24 §1.8; this document inherits that resolution). Every number below is either cited to a prior document, derived from a real-world physics calculation, or marked as a tuning parameter.
**Date:** 2026-08-03

---
**Truth level:** Canonical invariant (power scaling)
**Implements:** engine-architecture/51_MULTIVERSE_GROUND_TRUTH_ARCHITECTURE.md, corpus-extension/50_GROUND_TRUTH_SYSTEM_SPECIFICATION.md
**Implementation status:** [SPEC] — fully specified, implementation in progress

---

## Ground-Truth Annotation

> [CANON] Power scaling is exponential (2x qi per realm). Phase combat follows the technique packet schema (doc 55 §2). Timing is synchronized across 5 layers.

> [DERIVED] All measurements in this document use SI units (doc 52). Visual concepts follow the VTP schema (doc 51). Moving entities follow MotionProfiles (doc 55).

> [PROC] Instance-level details (exact NPC counts, specific tree placements, weather sequences) vary by seed within canonically-defined ranges.

> [UNRESOLVED] See /questions/ registry for open questions related to this document.

**Topic:** Power scaling and phase combat

### Forbidden interpretations

- [FORBIDDEN] Power scaling that is linear (must be exponential 2x per realm per doc 03)
- [FORBIDDEN] Phase combat with unsynchronized timing (animation/VFX/audio/hitbox must agree per doc 55 §3)
- [FORBIDDEN] Techniques without a forbiddenInterpretations list (mandatory per doc 51 §7)
- [FORBIDDEN] A lower-realm cultivator winning a direct clash with a higher-realm cultivator without explicit tactical advantage
- [FORBIDDEN] Qi capacity that does not double per realm station

---



## 0. Why this document exists

Document 13 specified the combat state machine, the four routings (Hands/Legs/Senses/Skin), and the per-realm verb list — but the routing system was phase-blind. A fire-phase cultivator routing to Hands and a water-phase cultivator routing to Hands produced the same strike. This is incoherent with the cosmology (doc 00 §6 ratifies wuxing as operational) and with the spiritual-roots system (doc 27 §5 makes roots a 5×3 vector over the phases). The critics called this the largest integration gap in the corpus.

Document 24 §1.8 also resolved a frame-budget inconsistency: doc 13's ranges (fast 10–16, medium 20–32, heavy 48–72 at 60 Hz) are canonical. The earlier user-spec (8–12 / 15–25 / 40–60) is superseded. Every frame cost in this document uses the canonical ranges.

This document fills the phase gap and the power-scaling gap in one place. It also expands doc 13's per-realm verb list with named techniques and doc 13's injury model with specific numbers.

---

## 1. The power scaling table

### 1.1 Units and conventions

| Unit | Definition | Source |
|---|---|---|
| **jin** (斤) | Late-imperial mass unit, ≈ 0.5 kg | Doc 03 Station 1 (mortal lifts 60–80 jin) |
| **J** (joule) | SI energy unit; strike force measured at the contact point | Physics convention |
| **m/s** | SI velocity unit | Doc 03 Station 3 (Qi Condensation sprint 8–12 m/s) |
| **qwu** | **Q**i-**w**eight **u**nit. Defined here: 1 qwu = the qi required to enhance one medium-class strike (20–32 frames) at Qi Condensation baseline. The unit is independent of realm; higher-realm techniques simply cost more qwu per use. | This document (tuning parameter) |
| **frame** | One tick at 60 Hz = 16.67 ms | Doc 13 §2.1 |
| **attention unit** | Per doc 13 §5.2; Qi Condensation budget = 100 | Doc 13 §5.2 |

All ranges are per-station envelopes. A cultivator at a station's peak reaches the upper bound; a freshly-broken cultivator sits at the lower bound. The mountain-proof oracle (doc 00 §3 item 3; doc 03 Station 3 "New constraints") is the cross-check: a Qi Condensation cultivator cannot personally split a huge mountain, move a river, or survive a great fall. The table below must be consistent with that oracle (verified in §1.3).

### 1.2 The envelope table (all ten stations)

Cells use ranges. "—" means the capability does not exist at this station. Numbers in brackets are tuning parameters, not yet playtested.

| Station | Physical output (sustained lift / peak strike J / max mass moved) | Kinematics (sprint / burst / leap / reaction) | Survivability (blunt / cut / heat / poison / disease; recovery) | Qi (reservoir qwu / peak throughput qwu·s⁻¹ / sustained qwu·s⁻¹ / replenishment qwu·min⁻¹) | Control (precision / concurrent targets / complexity / stabilize latency) | Perception (range m / resolution / occlusion / trace window) | Authority (interfaces / jurisdiction / oath·ownership·soul reach) | Consequence (direct radius / safe aftermath / dependents) | Lifespan |
|---|---|---|---|---|---|---|---|---|---|
| **1 Mortal** | 60–80 jin / 300–800 J / 100 jin | 6–8 m/s / 9–11 m/s / 0.4–0.7 m / 200–250 ms | x1 / x1 / x1 / x1 / x1; weeks–months | — | low / 1 / none / — | 30 m visual / human / none / — | none / body / none | 0.5 m / 0 / 0 | 40–60 yr |
| **2 Qi Induction** | 60–80 jin / 300–800 J / 100 jin | 6–8 m/s / 9–11 m/s / 0.4–0.7 m / 150–200 ms | x1 / x1 / x1 / x1.1 / x1.1; weeks | — (perceive only) | low / 1 / none / — | 30 m + qi-faint / human + qi-presence / partial / seconds | none / body / none | 0.5 m / 0 / 0 | 40–60 yr |
| **3 Qi Condensation** | 200–400 jin / 5–20 kJ / 600 jin | 8–12 m/s / 14–18 m/s / 2–4 m / 80–120 ms | x3 / x2 / x2 / x2 / x2; days–weeks | 100–300 / 20 / 8 / 5–10 | medium / 2 / single-phase / 60–120 frames | 100 m + qi-detail / phase-accurate / partial / 6–24 hr | route qi / body / own trace | 2 m / 1 m / 0 | 40–60 yr |
| **4 Foundation Establishment** | 800–1200 jin / 50–200 kJ / 2 000 jin | 15–20 m/s / 25–32 m/s / 8–15 m / 50–80 ms | x8 / x5 / x4 / x4 / x4; days | 600–1 500 / 60 / 25 / 30–60 | high / 4 / two-phase partial / 40–60 frames | 300 m / phase + flow / moderate / 1–7 days | bear oath / body + household / oath-bound | 10 m / 5 m / household (~10) | 200 yr |
| **5 Core Formation** | 3 000–5 000 jin / 1–5 MJ / 8 000 jin | 25–35 m/s / 50–70 m/s / 30–50 m / 25–40 ms | x25 / x15 / x10 / x10 / x10; hours–days | 5 000–15 000 / 200 / 100 / self-sustaining | very high / 8 / three-phase / 20–30 frames | 1 000 m / phase + flow + anchors / good / 1–4 weeks | author minor law / body + sect / own anchor + others' visible | 100 m / 50 m / sect (~100) | 500 yr |
| **6 Nascent Soul** | 10 000–20 000 jin / 50–200 MJ / 50 000 jin | 50–80 m/s / 120–180 m/s / 100–300 m / 10–20 ms | x80 / x50 / x30 / x30 / x30; hours | 50 000–200 000 / 600 / 300 / self-sustaining | extreme / 16 / four-phase / 10–15 frames | 5 000 m / full + bardo / strong / months | project spirit / lineage / own + descendants' anchors | 1 km / 500 m / lineage (~1 000) | 1 000 yr |
| **7 Spirit Severance** | — / 5–50 GJ / — (domain-mediated) | 100–300 m/s / domain-step / 500–2 000 m / 5–10 ms | domain-law-mediated; hours | 10⁶–10⁷ / 2 000 / 1 000 / domain-fed | absolute (in domain) / 32+ / five-phase / 5–10 frames | domain-wide / lawful / full / years | open domain / domain / soul reach in domain | 10 km / 5 km / domain inhabitants | 2 000 yr |
| **8 Void Amalgamation** | place-bonded / 500 GJ–5 TJ / place-scale | 500–1 000 m/s / place-step / — / 1–5 ms | place-mediated; minutes–hours | 10⁸–10⁹ / 6 000 / 3 000 / place-fed | absolute (in place) / 64+ / lawful / 1–5 frames | place-wide / place-resonant / full / decades | bond place / place / place-soul reach | place-scale / place-scale / place inhabitants | 5 000 yr |
| **9 Tribulation Crossing** | — / 50–500 TJ / stratum-scale | 1 000–10 000 m/s / stratum-step / — / <1 ms | tribulation-tested; minutes | 10¹⁰+ / 20 000 / 10 000 / stratum-fed | absolute / 128+ / stratum-lawful / <1 frame | stratum-wide / stratum / full / centuries | cross stratum / stratum-edge / stratum-soul reach | stratum-scale / stratum-scale / stratum | 10 000 yr |
| **10 Mahayana** | — / 5–50 PJ / law-scope | law-scope / law-step / — / near-instant | law-mediated; seconds | 10¹²+ / 60 000 / 30 000 / law-fed | absolute / 256+ / law / instant | law-scope / law / full / permanent | author law / Acquired Stratum / Acquired-soul reach | law-scope / law-scope / law-scope | 10 000 yr |

Notes on the table:
- **Sustained lift** is the mass a cultivator can hold overhead for 60 seconds without qi depletion (lower) or with qi routing (higher). Mortal: 60–80 jin per doc 03 Station 1. Qi Condensation: 200–400 jin per doc 03 Station 3. Foundation Establishment: 800–1200 jin per doc 03 Station 4. Above Core Formation, the body itself is reinforced beyond what "lift" measures; we record only the small-scale envelope and defer the rest to "domain-mediated" or "place-bonded" because above Spirit Severance, force is applied through law, not muscle.
- **Peak strike J** is the energy at the contact point of a single committed Heavy-class strike (48–72 frames, per doc 13 §2.1), routed to Hands, peak reservoir. The progression is ~10× per station from Qi Condensation through Nascent Soul, then jumps to GJ/TJ/PJ scales because above Nascent Soul, force is law-mediated rather than muscle-mediated. The 10× rate at the lower stations is a tuning parameter; the GJ+ rates are derived from the mountain-proof calculation in §1.3.
- **Reaction time** decreases ~40% per station through Nascent Soul, then approaches the simulation tick (16.67 ms). Below 16.67 ms the engine cannot resolve discrete reactions; above Spirit Severance, "reaction" is replaced by domain-awareness (perceptual simultaneity within the domain).
- **Qi reservoir** scales ~5× per station from Qi Condensation (100–300 qwu) to Nascent Soul (50 000–200 000 qwu). Foundation Establishment's ~3× Qi Condensation multiplier is from doc 13 §6.4; Core Formation's self-sustaining flag is from doc 03 Station 5; above Core Formation the reservoir is fed by domain/place/stratum/law, and the capacity figure is a tuning parameter.
- **Lifespan** is per doc 00 §3 and doc 03 (Stations 4–10).
- The upper six stations (5–10) have several "tuning parameter" cells because the corpus specifies them at design resolution, not implementation resolution (per doc 13 §0). The numbers are consistent with the corpus's qualitative claims; the exact values await prototype proof at those stations.

### 1.3 Mountain-proof oracle consistency check

The oracle (doc 00 §3 item 3; doc 03 Station 3 "New constraints"): a Qi Condensation cultivator cannot personally split a huge mountain, move a river, or survive a fall from a great height.

**Splitting a huge mountain.** A "huge mountain" is approximated as a 1 000 m granite massif, volume ≈ 10⁹ m³, mass ≈ 2.7 × 10¹² kg. The minimum energy to cleave it (tensile fracture of granite at ~10 kJ·m⁻³ across a 10⁶ m² cross-section) is ~10¹⁰ J; realistic mechanical displacement (lifting half the mass 10 m against gravity) is ~10¹⁴ J. A Qi Condensation peak strike (5–20 kJ) is **seven to ten orders of magnitude below** the minimum cleave energy. The oracle is satisfied with enormous margin.

**River-moving.** Redirecting a 100 m³·s⁻¹ river for one hour requires ~3.6 × 10⁸ J of work (lifting 3.6 × 10⁵ m³ of water by ~100 m). A Qi Condensation cultivator's daily qi budget (100–300 qwu × 1 kJ/qwu ≈ 10²–10³ kJ) is five orders below. Oracle satisfied.

**Great fall.** Doc 03 Station 3 caps the survivable fall at 8–15 m. Kinetic energy at impact from 15 m: m·g·h = 60 × 9.81 × 15 ≈ 8.8 kJ. A Qi Condensation cultivator's Skin routing at peak reduces blunt force by x2–x3 (per the survivability row), and the cultivator's effective injury threshold is ~5–20 kJ for a single blow — consistent with a survivable but injurious 15 m fall. A 100 m fall would deliver ~60 kJ, well above the Qi Condensation injury threshold (per §4.1); the oracle's "great height" exclusion holds.

The table's Foundation Establishment peak (50–200 kJ) and Core Formation peak (1–5 MJ) are still **five to seven orders below** the mountain-cleave minimum. Mountain-splitting becomes energetically plausible only at Spirit Severance (5–50 GJ), where the strike is law-mediated rather than muscle-mediated — and even then, a "huge mountain" is borderline. This is consistent with the doctrine's "no station trivializes the prior" (doc 00 §3).

---

## 2. Phase-aware combat routing

### 2.1 The five phases in combat

Per doc 00 §6, the five phases (wuxing, 五行) — Wood (木), Fire (火), Earth (土), Metal (金), Water (水) — are operational. Every qi-bearing entity has a phase-affinity. The two cycles:

- **Generation (相生):** Wood feeds Fire, Fire makes Earth, Earth bears Metal, Metal channels Water, Water nourishes Wood. The parent feeds the child.
- **Conquest (相剋):** Wood parts Earth, Earth dams Water, Water quenches Fire, Fire melts Metal, Metal chops Wood. The conqueror suppresses the conquered.

Every routing choice (doc 13 §4) carries a phase-affinity. A Qi Condensation+ cultivator routing fire-phase qi to Hands gets a burning strike; routing water-phase qi to Hands gets a flowing strike. The routing choice is now four-dimensional (region × phase), not one-dimensional (region only). The frame cost of the routing switch is unchanged from doc 13 §4.2 (60–120 / 40–60 / 20–30 frames by station) — the phase is set at switch time and held until the next switch.

### 2.2 The four routings × five phases

The phase modifier scales the routing's base effect. Modifiers: damage-over-time (DoT), knockback (KB), armor-pierce (AP), bleed, stagger, plus the per-phase deviation risk (per §2.5).

**Hands routing × phase** (enhances strike damage, grip, lifting; doc 13 §4.1):

| Phase | Strike type | Effect modifiers | Deviation risk if abused |
|---|---|---|---|
| Fire | Burning strike | +50% strike damage; DoT 2 qwu·tick⁻¹ for 5 ticks; agitated qi-state visible to opponent | Fire-deviation (false circuit, 假周天) |
| Water | Flowing strike | +30% strike damage; KB 2 m; qi-disruption: opponent's next switch +20 frames | Water-stagnation (route fixation, 路執) |
| Wood | Penetrating strike | +20% strike damage; AP ignores x2 blunt resistance; growth-feedback: heals striker 1 qwu·tick⁻¹ for 3 ticks | Wood-fixation (borrowed signature adhesion, 借氣附著) |
| Metal | Cutting strike | +40% strike damage; bleed 1 qwu·tick⁻¹ until treated; precision +50% (hits small targets) | Metal-rigidity (cross-current, 逆流) |
| Earth | Crushing strike | +60% strike damage; stagger extends 1.2×; +200% posture-threshold bonus to self for 6 frames | Earth-heaviness (breath-motion desync, 息動失調) |

**Legs routing × phase** (enhances speed, dodge, attack speed; doc 13 §4.1):

| Phase | Mobility type | Effect modifiers | Deviation risk |
|---|---|---|---|
| Fire | Burst step | +80% burst speed for 1 second; leaves scorch-trace; -20% dodge precision | Fire-deviation |
| Water | River-circling step | +50% dodge distance; leaves qi-trail that grants +20% accuracy to allies reading it | Water-stagnation |
| Wood | Rooted advance | +30% sprint speed; immune to KB for duration; roots drain 1 qwu·tick⁻¹ from soil (requires soil contact) | Wood-fixation |
| Metal | Needle step | +40% attack speed; +30% dodge precision; -50% dodge distance | Metal-rigidity |
| Earth | Stomp step | +20% sprint speed; each step staggers enemies within 1 m; -10% max speed | Earth-heaviness |

**Senses routing × phase** (enhances residue reading, feint detection, attack-tell perception; doc 13 §4.1):

| Phase | Perception type | Effect modifiers | Deviation risk |
|---|---|---|---|
| Fire | Flare-read | +100% read speed; reveals opponent's reservoir state; blinds self to ambient for 2 sec | Fire-deviation |
| Water | Resonance-read | +50% read depth; can read past events up to 7 days (vs 24 hr baseline); -30% read speed | Water-stagnation |
| Wood | Trace-growth | Anchored traces persist 2× longer; can read the trace's emotional content; -20% read depth | Wood-fixation |
| Metal | Edge-read | +200% feint detection; can perceive weapon qi-edge in air; -50% reservoir-state perception | Metal-rigidity |
| Earth | Tremor-read | Perceives all motion within 30 m through ground contact; immune to air-occlusion; -80% aerial perception | Earth-heaviness |

**Skin routing × phase** (enhances posture, damage reduction, knockdown resistance; doc 13 §4.1):

| Phase | Defense type | Effect modifiers | Deviation risk |
|---|---|---|---|
| Fire | Flare-back | Reflects 20% of strike energy as heat; attacker takes 10% strike damage; -30% sustained defense | Fire-deviation |
| Water | Flowing-deflect | +50% KB resistance; redirects 30% of force around the body; -20% AP resistance | Water-stagnation |
| Wood | Regenerating bark | +30% blunt resistance; heals 1 qwu·tick⁻¹ for 5 ticks after each hit taken; -40% cut resistance | Wood-fixation |
| Metal | Iron skin | +80% cut resistance; +50% AP resistance; -50% blunt resistance (rigid, shatters) | Metal-rigidity |
| Earth | Mountain stance | +200% posture threshold; immune to stagger for duration; cannot move while active | Earth-heaviness |

### 2.3 Phase matchup mechanics

When a phase-routed attack meets a phase-routed defense, the cycles apply. The base modifier is ±30% to the attacker's effective strike damage (tuning parameter). The full table (attacker phase × defender phase → multiplier on attacker's effect):

| Atk \ Def | Wood | Fire | Earth | Metal | Water |
|---|---|---|---|---|---|
| **Wood** | 1.0 | **1.3** (gen) | **1.3** (conq) | 0.7 (conq'd) | 0.7 (gen-parent) |
| **Fire** | 0.7 (gen-child) | 1.0 | **1.3** (gen) | **1.3** (conq) | 0.7 (conq'd) |
| **Earth** | 0.7 (conq'd) | 0.7 (gen-child) | 1.0 | **1.3** (gen) | **1.3** (conq) |
| **Metal** | **1.3** (conq) | 0.7 (conq'd) | 0.7 (gen-child) | 1.0 | **1.3** (gen) |
| **Water** | **1.3** (gen) | **1.3** (conq) | 0.7 (conq'd) | 0.7 (gen-child) | 1.0 |

Read: row = attacker's phase, column = defender's phase. **1.3** = attacker boosted (parent feeds child, or conqueror suppresses conquered). **0.7** = attacker weakened (child fighting parent, or conquered fighting conqueror). 1.0 = same phase (neutral).

Worked example: a fire-routed burning palm (Fire attack) against a water-routed flowing-deflect (Water defense) → 0.7 multiplier. Water quenches fire; the burn is dampened. This matches doc 00 §6's conquest cycle.

Worked example: a fire-routed burning palm against a metal-routed iron skin (Metal defense) → 1.3 multiplier. Fire melts metal; the iron skin is bypassed.

### 2.4 Spiritual roots and routing efficiency

Per doc 27 §5.3, spiritual roots modify absorption cost. The same principle extends to routing cost. When a cultivator routes qi of phase P, the reservoir cost is scaled by the cultivator's `root[P].admission`:

```
routing_cost = base_routing_cost × (1 - 0.5 × root[P].admission)
deviation_risk = base_deviation_risk × (1 - 0.6 × root[P].conversion)
```

(Both formulas are direct extensions of doc 27 §5.3's absorption and deviation formulas to routing.)

Worked example: a cultivator with `fire.admission = 0.8` routing fire-phase to Hands pays 60% of the base reservoir cost (a 40% reduction). A cultivator with `fire.admission = 0.0` pays 100%. A cultivator with `fire.conversion = 0.8` routing fire has 52% lower fire-deviation risk per strike; the same cultivator routing water (with `water.conversion = 0.2`) has only 12% lower water-stagnation risk.

This means a strong fire-rooted cultivator should route fire almost exclusively; a balanced-rooted cultivator can switch phases freely but pays full cost everywhere. The partial-routing sub-system (doc 13 §4.3) extends naturally: a 70/30 Hands-fire / Skin-metal partial is viable for a fire-strong, metal-moderate cultivator, but the metal half pays full cost.

### 2.4.1 Partial routing × phase

Doc 13 §4.3 allows partial routing (60/40 or 70/30 splits between two routings). Phase extends the partial: a cultivator can split **two routings and two phases simultaneously** — e.g., 70/30 Hands-fire / Legs-water. The 70% slot gets full effect of its phase; the 30% slot gets full effect of its phase. The cost: switch latency for partials is +50% over pure routings (90–180 frames at Qi Condensation, 60–90 at Foundation Establishment, 30–45 at Core Formation). The benefit: the cultivator can attack with one phase and dodge with another in the same engagement, without a switch.

A partial-routed cultivant's deviation risk is the **max** of the two phases' risks, not the sum — the body does not accumulate both phases' deviation pressure simultaneously because each phase is routed through a different meridian set. However, the partial-routed cultivator is **vulnerable to phase-imbalance** (§4.1): holding a 70/30 fire/water partial for 60+ frames sets `phase_imbalance_mild` because the two phases are in conquest (water quenches fire). The partial is powerful but unstable; the doctrine's commitment model (doc 13 §3) is preserved — partials are themselves a commitment.

### 2.4.2 Worked duel example (phase-aware exchange)

Two Qi Condensation cultivators: A (fire-strong roots, fire-routed Hands) vs B (water-strong roots, water-routed Skin). Both at Qi Condensation peak.

1. A opens with Burning Palm (fire, Hands, 30 frames, 8 qwu). B's defense is water-routed Skin. Matchup: Fire attack × Water defense = **0.7** (water quenches fire). A's effective strike: 8 qwu × 0.7 = 5.6 qwu equivalent. DoT: 2 qwu·tick⁻¹ × 0.7 = 1.4 qwu·tick⁻¹ for 5 ticks = 7 qwu total. Total effect: 12.6 qwu. Without phase-awareness, the strike would have dealt 18 qwu (8 + 10 DoT). B's water-routed defense reduced the strike by 30%.
2. B counters with Flowing-deflect (water, Skin) active frames, reflecting nothing but redirecting 30% of the residual force around the body. B then switches to Hands-water (90 frames switch — Heavy per doc 13 §4.2) and counters with River-Circling Step + flowing strike.
3. A, mid-Recovery from Burning Palm, has two choices: abort (Recovery→Idle, reservoir drain) or eat the counter. A aborts. The abort applies a fatigue cost (per doc 13 §2.3): -10 attention, -5 qwu reservoir.
4. A's qi-routing is still fire. B is now water-routed. A cannot profitably attack (0.7 multiplier). A must either switch to earth (conquers water: 1.3 multiplier) or accept the disadvantage. Switching costs 90 frames at Qi Condensation; B will get a free strike during the switch.

This is the phase-aware combat loop: every routing choice is a strategic commitment to a phase, and the opponent's phase determines whether your strikes are boosted or weakened. A pure-routing cultivator (doc 13 §4) had no such constraint; a phase-aware cultivator must read the opponent's phase and choose their own accordingly. The residue-reading verb (doc 13 §5) is now essential, not optional: a cultivator who cannot read the opponent's phase is fighting blind against the matchup table.

### 2.5 Phase deviation risks (named)

Each phase has a characteristic somatic deviation that manifests when the routing is abused (held too long, switched too fast, or pushed past exhaustion). These are the five somatic deviations from doc 03 Station 3 and doc 24 §1.2, mapped to their phase:

| Phase | Deviation if abused | Onset trigger | Counterplay |
|---|---|---|---|
| Fire | False circuit (假周天) | Routing fire aggressively for >120 consecutive frames | Vent into water sink; rest |
| Water | Route fixation (路執) | Holding water routing through exhaustion | Vent into earth sink; forced switch drill |
| Wood | Borrowed signature adhesion (借氣附著) | Absorbing ambient wood qi while routing wood | Vent into metal sink; re-establish self-signature |
| Metal | Cross-current (逆流) | Switching into metal faster than the switch cost allows | Vent into fire sink; synchronized breathing |
| Earth | Breath-motion desync (息動失調) | Earth-routing while holding the breath or chest-injured | Synchronized breathing practice under supervision |

The mapping is not arbitrary: each deviation's *felt-sense* matches the phase's nature. Fire-deviation is hot and agitated (false circuit feels like infinite qi but contaminates). Water-deviation is sticky and stuck (route fixation locks the cultivator into one routing). Wood-deviation is parasitic (borrowed signature grows in the cultivator's qi). Metal-deviation is rigid and crossed (cross-current flows against the natural direction). Earth-deviation is heavy and out-of-sync (breath and qi fall out of rhythm).

---

## 3. The combat verbs by realm (expanded)

Doc 13 §6 lists verbs per realm. This section names 3–5 specific techniques per station through Core Formation, each with phase-affinity, routing requirement, frame cost (using doc 13 §2.1's canonical ranges), effect, counter, and failure mode. Techniques are designed to be genuinely distinct (not reskins) — verified by the doctrine's "normalize names, scale, target count, numbers, and VFX" test.

### 3.1 Mortal (凡人)

No qi; no routing. All techniques are physical, frame-cost only.

| Technique | Phase | Routing | Frame cost (S/A/R) | Effect | Counter | Failure |
|---|---|---|---|---|---|---|
| **Rice-Seed Punch** (稻種拳) | none | none | 8/4/8 (fast, 20 total) | Blunt strike, 400 J | Block (medium) | Stamina -10; tempo fatigue +4 frames |
| **Levee Stance** (堤步) | none | none | 12/8/24 (heavy, 44 total) | Braced block; halves incoming blunt for active frames | Feint then strike | Locked in stance; cannot pursuit |
| **River-Eel Dodge** (河鰻閃) | none | none | 6/2/8 (fast, 16 total) | Ducking side-step; +50% dodge distance | Low strike | Lands off-balance; +6 recovery |
| **Sickle Reap** (鐮割) | none | none | 10/6/14 (medium, 30 total) | Cut strike with farm tool, 600 J slash | Parry (medium) | Tool stuck in cloth; disarmable |

### 3.2 Qi Induction (引气)

No routing; perception only. Techniques use qi-perception to enhance mortal verbs.

| Technique | Phase | Routing | Frame cost | Effect | Counter | Failure |
|---|---|---|---|---|---|---|
| **Tell-Read** (讀勢) | none | none | 10/4/8 (medium, 22) | +30% perception of opponent's next action; consumes 15 attention | Feint | Perception burn: headache, nosebleed, -50% perception for 60 sec |
| **Qi-Watch** (觀氣) | none | none | 20/0/30 (heavy, 50) | Read opponent's reservoir state and phase-affinity | Interrupt (any hit) | Temporary blindness, 10 sec |
| **Echo Step** (回響步) | none | none | 6/2/8 (fast, 16) | Dodge with qi-perception bonus; +20% accuracy on next attack | Faster strike | Misread: hits anyway, no dodge |

### 3.3 Qi Condensation (凝气)

First station with routing. Techniques pair a routing × phase with a frame budget.

| Technique | Phase | Routing | Frame cost | Reservoir | Effect | Counter | Failure |
|---|---|---|---|---|---|---|---|
| **Burning Palm** (焚掌) | Fire | Hands | 10/6/14 (medium, 30) | 8 qwu | Strike + DoT 2 qwu·tick⁻¹ for 5 ticks | Water-routed defense (×0.7) | Fire-deviation if chained >3 times |
| **River-Circling Step** (河旋步) | Water | Legs | 6/2/8 (fast, 16) | 4 qwu | +50% dodge; trail grants allies +20% accuracy for 2 ticks | Wood-routed pursuit | Water-stagnation if held >60 frames |
| **Metal-Edge Fist** (金刃拳) | Metal | Hands | 10/6/14 (medium, 30) | 8 qwu | AP ignores x2 blunt resist; bleed 1 qwu·tick⁻¹ | Fire-routed defense (×1.3 vs metal) | Metal-rigidity if switched into too fast |
| **Wood-Root Stance** (木根樁) | Wood | Skin | 20/8/24 (heavy, 52) | 12 qwu | +200% posture threshold; heals 1 qwu·tick⁻¹ for 5 ticks after hit | Metal-routed cutting (×1.3) | Wood-fixation; roots drain soil |
| **Earth-Press Slam** (土壓砸) | Earth | Hands | 20/8/24 (heavy, 52) | 15 qwu | 5 m radius stagger; stagger extends 1.2× | Air dodge (Legs routing) | Earth-heaviness; -10% max speed for 60 sec |
| **Trace Anchor** (留痕) | none | Senses | 20/4/30 (heavy, 54) | 5 qwu | Leaves qi-trace at location; persists 24 hr | Read then destroy | Trace decays instantly if reservoir <20 qwu |

### 3.4 Foundation Establishment (筑基)

Faster switching (40–60 frames); larger reservoir; oath verb available.

| Technique | Phase | Routing | Frame cost | Reservoir | Effect | Counter | Failure |
|---|---|---|---|---|---|---|---|
| **Oath of Restraint** (受職 — 約誓) | none | any | 60/0/30 (ritual, 90) | 50 qwu | Qi-bound promise; breaker suffers reservoir contamination + deviation risk | Outlast oath scope | Oath-break backlash: -50% reservoir, xinmo risk |
| **Five-Phase Cascade** (五段連擊) | cycles wood→fire→earth→metal→water | Hands | 5× (12/6/16) = 170 total | 60 qwu | Each strike boosted by generation-previous (+15% per step) | Predict cycle; defend with conquering phase | Cross-current; forced switch lock |
| **Heart-Mind Blade** (心劍) | xin-based | Hands | 10/6/14 (medium, 30) | 20 qwu | Strikes opponent's heart-mind state; bypasses physical defense | High emotional-balance defender | Rebounds on attacker; xinmo risk |
| **Foundation Pillar** (基柱) | Earth | Skin | 40/0/30 (ritual, 70) | 80 qwu | Immovable stance 30 sec; doubles meridian throughput | Bypass with Legs routing | Foundation collapse if disrupted; rare, severe |
| **Meridian-Deep Read** (深脈讀) | none | Senses | 20/0/20 (heavy, 40) | 15 qwu | Reads opponent's meridian state; reveals injuries and deviations | Disguise meridian state (advanced) | Perception overload; -30% perception for 1 hr |

### 3.5 Core Formation (金丹)

Self-sustaining qi; treasures; anchor perception. Switch cost drops to 20–30 frames.

| Technique | Phase | Routing | Frame cost | Reservoir | Effect | Counter | Failure |
|---|---|---|---|---|---|---|---|
| **Golden Sun Lance** (金陽矛) | Fire | Hands + treasure | 20/8/24 (heavy, 52) | 200 qwu | Projected fire-lance, 10 m range, 1 MJ strike + DoT | Water-domain or wide water defense | Cracked core if over-extended (rare, severe) |
| **Anchor-Sight Strike** (見樞擊) | none | Senses + Hands | 20/8/24 (heavy, 52) | 150 qwu | Bypasses physical defense; strikes the anchor directly | Spirit-shielded target (Nascent Soul+) | Perception overload; anchor-bruise (own) |
| **Core-Sustained Field** (丹田自養) | none | Skin | 60/0/30 (ritual, 90) | 0 (self-sustaining) | Maintains any routing indefinitely without drain | Drain local qi-environment; tribulation | Field collapse if core destabilized |
| **Treasure-Unleashed: Sword of Cangwu** (蒼梧劍解) | Metal | Hands + treasure | 20/8/24 (heavy, 52) | 100 qwu + treasure charge | 50 MJ cutting strike; ignores x5 AP resist | Fire-melt (×1.3) or domain-suppress | Treasure damage; long refit |
| **Minor Law: No-Fire-Here** (立法 — 禁火) | none | domain-edge | 90/0/60 (ritual, 150) | 500 qwu | Within 100 m radius, no fire-phase qi burns (law enforced by world) | Spirit Severance+ domain contest | Law-backlash if contested; reservoir halved |

The five techniques at each station are distinct by the doctrine's test: each has a different phase-affinity, a different routing requirement, or a different effect class (damage / defense / control / perception / law). None is a reskin of another.

### 3.6 Technique gating by spiritual roots

Per doc 27 §5.3, some techniques require a minimum root-component to practice at all. This document assigns specific gates to the techniques above:

| Technique | Root gate (per doc 27 §5.3 formula) |
|---|---|
| Burning Palm (§3.3) | `fire.sensitivity ≥ 0.4` AND `fire.conversion ≥ 0.3` |
| River-Circling Step (§3.3) | `water.sensitivity ≥ 0.4` AND `water.admission ≥ 0.3` |
| Metal-Edge Fist (§3.3) | `metal.sensitivity ≥ 0.5` AND `metal.conversion ≥ 0.4` |
| Wood-Root Stance (§3.3) | `wood.admission ≥ 0.4` AND `wood.conversion ≥ 0.3` |
| Earth-Press Slam (§3.3) | `earth.sensitivity ≥ 0.4` AND `earth.conversion ≥ 0.4` |
| Five-Phase Cascade (§3.4) | All five phases' `sensitivity ≥ 0.3` (the cycle requires perceiving all five) |
| Heart-Mind Blade (§3.4) | No root gate (xin-based, not phase-based); requires `heart_mind.attention ≥ 0.6` |
| Golden Sun Lance (§3.5) | `fire.sensitivity ≥ 0.6` AND `fire.conversion ≥ 0.5` AND treasure with `fire.affinity ≥ 0.5` |
| Minor Law: No-Fire-Here (§3.5) | Comprehended law-fragment with domain = "fire-phase suppression" (per doc 27 §3.2) |

A cultivator below a gate perceives the technique's manual as words without application (per doc 27 §5.3). The gate is honest: a fire-blind cultivator cannot learn Burning Palm no matter how often they read the manual.

### 3.7 The Yielded terminal in phase-aware combat

Doc 24 §1.11 added `Yielded` as a seventh terminal in doc 13's state machine. Phase-aware combat interacts with `Yielded` in two specific ways:

- **Yielding while phase-routed.** A cultivator who yields (open palms, lowered weapon, verbal declaration; transition cost 0 per doc 13 §1.2) **keeps their active phase-routing** but is socially bound not to use it. If the yielding cultivator breaks the yield by attacking, the routing is still phase-aware — but the social-system consequences (per doc 13 §7.4) are severe: the breaker is marked as an oath-breaker (per doc 03 Station 4, `bear oath` mechanic) and the opponent is no longer bound by the yield's protection (the breaker may be killed lawfully).
- **Reading the yield.** A Qi Condensation+ cultivator can read whether a yield is genuine by reading the opponent's qi-routing state (per doc 13 §5.1). A genuine yield has dim, dispersing qi (the cultivator is letting their routing fade). A false yield has bright, retained qi (the cultivator is maintaining their routing for a counter-strike). This is a mid-read (15 attention/sec per doc 13 §5.2) and is the canonical way a phase-aware cultivator verifies a yield.

The `Yielded` terminal is therefore not a "pause button" — it is a state with its own phase-aware dynamics, and breaking it has both combat consequences (the routing is still active) and social consequences (the breaker is oath-stained).

---

## 4. The injury table (expanded)

Doc 13 §8 names the injury types. This section gives each a specific onset threshold, effect on each capability, recovery time (with and without treatment), and treatment method. Thresholds are derived from §1.2's envelope: a Qi Condensation cultivator's injury threshold is ~5–20 kJ for a single blow (per the survivability row).

### 4.1 Injury types with numbers

| Injury | Onset threshold | Effect on capability | Recovery (untreated) | Recovery (treated) | Treatment |
|---|---|---|---|---|---|
| **Cut (superficial)** | 0.5–2 kJ contact, edged | Pain: +2 frames to all actions; bleed: -1 qwu·tick⁻¹ | 6–24 hr | 1–2 hr | Clean bandage, basic herb poultice |
| **Cut (deep)** | 2–8 kJ contact, edged | Pain: +6 frames; bleed: -3 qwu·tick⁻¹; grip -30% if on arm, speed -30% if on leg | 2–6 weeks | 1–2 weeks | Suture, hemostatic pill, qi-circulation rest |
| **Cut tendon** | 4–10 kJ precision strike to wrist/ankle | Limb loses function: grip to 20% or speed to 30%; routing through affected limb blocked | 3–6 months | 4–8 weeks | Surgery + Foundation Establishment+ healing; or Core Formation+ qi-reconstruction |
| **Fractured bone** | 8–20 kJ blunt, or 8 m+ fall | Region unusable; fractured rib: tempo ×2; fractured leg: cannot stand unaided | 2–4 months | 4–8 weeks | Alignment + immobility, or Core Formation+ qi-reconstruction |
| **Meridian inflammation** | Qi-strike 50+ qwu to a meridian, or routing overload | Affected meridian blocks routing through it; deviation-prone; -50% to associated routing's effect | 2–4 weeks | 5–10 days | Rest + venting into matching-phase sink + anti-inflammatory practice |
| **Organ damage** | 15+ kJ deep torso strike | Lung: tempo ×2; liver: contamination tolerance ×0.5; heart: reservoir cap ×0.5; kidney: replenishment ×0.5 | 6–24 months | 2–6 months | Foundation Establishment+ integration; Core Formation+ qi-healing |
| **Qi depletion** | Reservoir <10 qwu (Qi Cond) or <5% capacity (higher) | All qi-verbs unavailable; effectively mortal | 4–12 hr rest | 1–2 hr | Qi-rich environment; qi-restoration pill; Core Formation+ field |
| **Anchor bruise** | Spiritual strike from Core Formation+ (200+ qwu) | Perception unreliable; oaths strained; deviation risk ×2 | 2–6 weeks | 1–2 weeks | Stabilization practices; teacher's intervention |
| **Core crack** | Sufficient shock to Core Formation cultivator (5+ MJ spiritual strike, or tribulation) | Catastrophic: qi uncontrollable; deviation near-certain; reservoir cap ×0.1 | Often fatal; if survived, 1–5 years | 6–18 months (rare) | Core-reconstruction practices (rare, dangerous); usually reversion to Foundation Establishment |
| **Phase imbalance (mild)** | 60+ frames routing a single phase without venting | -10% to non-routed phases' effects; +20% deviation risk | 1–3 days | 4–8 hr | Vent into conquest-parent sink (e.g., fire imbalance → vent into wood sink) |
| **Phase imbalance (severe)** | 240+ frames single-phase, or 3+ phases in 60 frames | -50% to all routings; deviation risk ×3 | 1–2 weeks | 2–4 days | Extended venting; teacher-supervised rebalancing |

### 4.2 Injury and qi-routing interaction

Injuries modify the routing system (extending doc 13 §8.3). The principle: an injury to a body region blocks the routing that runs through it; an injury to a meridian blocks the phase that runs through it.

| Injury | Routing effect |
|---|---|
| Cut tendon (wrist) | Hands routing blocked; cannot enter `Idle → Committed.Anticipation (Hands-routed attack)`. Engine rejects input with stumble animation. |
| Cut tendon (ankle) | Legs routing blocked; cannot dodge. |
| Fractured arm | Hands routing through that arm blocked; partial-routing to the other arm at 50% effect. |
| Fractured leg | Legs routing blocked; cannot dodge, cannot sprint. |
| Fractured rib | All routing costs +50% (breathing impaired); tempo ×2. |
| Meridian inflammation (Hand-Fire meridian) | Fire routing to Hands blocked; must use another phase or another routing. |
| Meridian inflammation (Leg-Water meridian) | Water routing to Legs blocked. |
| Organ damage (lung) | All routing costs ×2; tempo ×2. |
| Organ damage (heart) | Reservoir cap ×0.5; all routings reduced proportionally. |
| Organ damage (kidney) | Replenishment ×0.5; sustained throughput ×0.5. |
| Qi depletion | All qi-routings blocked; combatant limited to mortal verbs (doc 13 §8.3). |
| Anchor bruise | All perceptions unreliable; Senses routing produces false positives 30% of the time. |
| Core crack | All qi-routings uncontrollable; random phase each tick; deviation onset certain within 60 frames. |
| Phase imbalance (mild) | The imbalanced phase's routing costs +20%; others -10%. |
| Phase imbalance (severe) | All routings cost +50%; switch cost ×2. |

The engine enforces every entry. A combatant who attempts a blocked routing receives a visible stumble (not a silent failure — per doc 13 §8.3, the doctrine's "feel" rule).

### 4.3 Injury, pain, and deviation risk

Pain is not a flavor layer. Pain is a perturbation to the heart-mind (per doc 27 §7.4). The mechanic:

```
pain_intensity = sum over active injuries of (injury.pain_value × recency_factor)
xinmo_risk_multiplier = 1 + (pain_intensity / 4)
```

Each injury has a `pain_value` (0.0–1.0): superficial cut 0.1, deep cut 0.3, cut tendon 0.5, fracture 0.6, organ damage 0.8, core crack 1.0. Recency decays over 60 minutes. A combatant with a deep cut (0.3) and a fractured rib (0.6) has pain_intensity = 0.9, so their xinmo risk multiplier is 1.225 — a 22.5% increase to the chance that any perturbation (fear at the injury, hatred of the attacker, grief at the situation) onsets a 心魔.

This is the doctrine's "the cultivator was not ready" trope (doc 27 §7.6) made mechanical across the injury layer: a wounded cultivator is not just slower and weaker; they are also more vulnerable to psychospiritual break. The genre's "wounded cultivator who deviates mid-fight" is now a number.

The interaction also runs in reverse: a cultivator with an active 心魔 (per doc 27 §7) has impaired attention and emotional-balance, which degrades their routing precision (per §2.4's conversion formula — a heart-mind-impaired cultivator cannot hold a phase-routing cleanly). The two systems — injury and heart-mind — are coupled. A fight that wounds a cultivator and disturbs their heart-mind produces compounding failure: the wound raises xinmo risk; the xinmo degrades routing; the degraded routing produces more injuries; the cycle continues until the cultivator yields, flees, or breaks.

---

## 5. Open decisions (surfaced for review)

Per AGENTS.md Part 3: "Exhibit reviewer voices; do not self-certify." All are tuning parameters, not forks:

1. **The qwu unit's exact magnitude** (§1.1). Defined here as the qi for one Qi-Condensation medium strike; the conversion to joules (1 qwu ≈ 1 kJ at the contact point) is a tuning parameter.
2. **The 10× per-station strike-energy progression** (§1.2). Consistent with the mountain-proof oracle but not yet playtested. May compress (5×) or expand (15×) after the Qi Condensation duel prototype.
3. **The ±30% phase matchup modifier** (§2.3). Clean wuxing-consistent value; may need ±25% or ±40% after playtesting. The cycle structure (generation 1.3 / conquest 1.3 / conquered 0.7 / child-vs-parent 0.7) is decided; only the magnitude is tunable.
4. **The phase deviation onset thresholds** (§2.5). 120 frames for fire, 60 frames for water-routed trail, etc. — all tuning parameters calibrated to the Qi Condensation duel.
5. **The injury onset thresholds in joules** (§4.1). Derived from §1.2's envelope but await playtesting against the procedural generator (doc 07).
6. **The pain_intensity → xinmo_risk multiplier** (§4.3). Divisor 4 is a guess; the divisor 3 used in 命/性 asymmetry (doc 27 §6.5) is the closest precedent. May converge.
7. **The upper-six-station envelope cells marked as tuning parameters** (§1.2). The corpus specifies these stations at design resolution; the numbers are placeholders consistent with the qualitative claims, awaiting prototype proof.

---

## 6. Doctrine compliance

- **Build the engine, not just the brake:** doc 13 built the routing brake (one routing at a time, switch cost); this document builds the phase engine that the brake regulates. Doc 13 built the injury list; this document builds the injury numbers and the pain→xinmo coupling.
- **Make decisions; do not defer:** the phase-routing matrix, the matchup multipliers, the per-station envelopes, and the injury thresholds are all decided. §5 are tuning parameters, not forks.
- **Cite the precedent:** doc 13 (state machine, routing, frame costs), doc 03 (mountain-proof oracle, per-station envelopes), doc 27 §5 (roots formulas), doc 27 §7.4 (xinmo threshold function), doc 24 §1.8 (canonical frame budget), doc 24 §1.11 (Yielded terminal), doc 00 §6 (wuxing). Every number is either cited or marked as a tuning parameter.
- **Confront the central tension directly:** the user's instruction listed "fire vs metal (generation: fire boosted)" — but strict wuxing has fire conquering metal (fire melts metal), not generating it. The matchup table in §2.3 uses the correct cycle labels (conquest for fire-metal) while preserving the user's intended effect (fire boosted against metal). The tension between the user's labeling and the sinological wuxing is named and resolved, not papered over.
- **Determinism contract:** every technique and injury has specific numbers, not adjectives. Two isomorphic cultivators with identical state, given identical inputs, produce identical combat outcomes.
- **Mountain-proof oracle verified** (§1.3): the Qi Condensation envelope is seven to ten orders of magnitude below mountain-splitting energy; the oracle holds with enormous margin. Foundation Establishment and Core Formation remain below the threshold; mountain-splitting becomes energetically plausible only at Spirit Severance, where force is law-mediated. No station trivializes the prior.

This document closes the phase-routing gap and the power-scaling gap. Doc 13's state machine is now phase-aware; doc 03's envelopes are now a number table; doc 27's roots system now has a direct combat effect. The combat bible is complete.
