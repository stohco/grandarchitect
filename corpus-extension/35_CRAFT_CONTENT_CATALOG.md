# 35 — Craft Content Catalog (陣法 · 符籙 · 煉丹: 名品圖譜)

**Status:** Candidate canon. The named recipes, patterns, and layouts the prior craft-systems document (16) deferred as content artifacts. Every entry obeys the determinism contract (same inputs, same outputs) and the phase-compatibility rules (doc 16 Appendix B).
**Date:** 2026-08-03
**Authority:** Governed by `16_FORMATIONS_TALISMANS_ALCHEMY.md` (the three systems), `00_FOUNDATIONAL_DECISIONS.md` §6 (qi model), `27_CULTIVATION_SYSTEMS.md` (realms, dantian, breakthrough), `24_RECONCILIATION_AND_DECISIONS.md` §3.1 (spirit stones = 10–50 taels), `18_ECONOMY_SYSTEM.md` (production chains), `14_ECOLOGY_AND_QI.md` (spirit herbs and beasts), and `28_THE_VILLAGE_IN_MEDIAS_RES.md` (the Cangwu cache).

---
**Truth level:** Canonical invariant (craft catalog)
**Implements:** engine-architecture/51_MULTIVERSE_GROUND_TRUTH_ARCHITECTURE.md, corpus-extension/50_GROUND_TRUTH_SYSTEM_SPECIFICATION.md
**Implementation status:** [SPEC] — fully specified, implementation in progress

---

## Ground-Truth Annotation

> [CANON] Craft items have PhysicalSpecifications (doc 52). Weapons obey the technique-packet timing rules (doc 55). No weapon larger than animation reach allows.

> [DERIVED] All measurements in this document use SI units (doc 52). Visual concepts follow the VTP schema (doc 51). Moving entities follow MotionProfiles (doc 55).

> [PROC] Instance-level details (exact NPC counts, specific tree placements, weather sequences) vary by seed within canonically-defined ranges.

> [UNRESOLVED] See /questions/ registry for open questions related to this document.

**Topic:** Craft and content catalog

---



## 0. How to read this document

Document 16 specified the three crafts as systems and explicitly deferred the content (the recipes, the patterns, the layouts). This document supplies that content. Every entry is reproducible: any inscriber or alchemist of the named realm, given the named inputs and following the named process, produces the named output. Variation lives in the inputs (ingredient potency, node quality, inscriber heart-mind), not in the process.

**Terminology.** English primary, Hanzi (Traditional, following doc 16's convention) in parentheses on first use. No pinyin with tone marks.

**Phase-compatibility reminder (doc 16 Appendix B).** A Wood inscription wants Water or Wood inputs (Metal conflicts). A Fire inscription wants Wood or Fire inputs (Water conflicts). An Earth inscription wants Fire or Earth inputs (Wood conflicts). A Metal inscription wants Earth or Metal inputs (Fire conflicts). A Water inscription wants Metal or Water inputs (Earth conflicts). Yin-yang signatures must resolve to a coherent vector independently of phase.

**Currency.** Spirit stones are the cultivation world's currency; one spirit stone = 10–50 taels of silver (per doc 24 §3.1, the corrected rate). Cash and silver are the mortal currencies. Market values below are in spirit stones unless noted.

---

## 1. Named Formations

Six formations follow. Each is a persistent qi-structure inscribed in space, with nodes, lines, a core, and a boundary (per doc 16 §2.2).

### 1.1 Hidden-Stone Cache Lock (隱石藏鎖) — Defensive ward + utility — Earth-phase (with Metal secondary)

**The Cangwu foothills cache.** This is the formation Xu Erniu triggers in doc 28 §2.2 — the cultivator's cache Old Chen sealed forty years ago by collapsing the entrance. The original inscriber was a Core Formation wandering cultivator of the late previous dynasty; the cache held three talismans, two pill-gourds, and a hand-copied manual. The formation persists because its Earth-phase nodes anchor to a shallow spirit-vein trace in the foothill bedrock; the vein supplies the ambient qi the formation draws.

- **Nodes:** seven. Six are river-stone discs (Earth-phase, yin-stable) set in a hexagon of three-pace radius around the cache's interior. The seventh is a jade plate (Earth-phase with Metal-secondary) at the hexagon's center, bearing the core. Old Chen, at Qi Condensation, could not safely dismantle the core; he instead collapsed the entrance, leaving the formation intact and dormant.
- **Layout:** hexagonal. The six perimeter nodes form the boundary; the seventh, the core, sits at the center. The lines trace a six-petaled lotus — each petal a curving Earth-phase qi-current from one perimeter node to the next, the petals overlapping at the boundary.
- **Core logic:** a two-clause intent. (a) *Ward*: admit the inscriber's qi-signature (encoded at investment) and reject all others. (b) *Sustain*: when an intruder enters, drain the intruder's qi at a measured rate to replenish the cache's own ambient-qi reserve. The drain is the maintenance system Erniu's body is feeding.
- **Effect:** within the three-pace hexagonal boundary, all qi not bearing the inscriber's signature is rejected at Core Formation intensity; an intruder whose qi falls below Core Formation is drained at approximately one-tenth of a Qi Condensation reservoir per hour. The cache's stored contents remain sealed in a sub-boundary beneath the jade plate.
- **Duration:** indefinite, sustained by the spirit-vein trace. Persists centuries.
- **Qi-consumption:** passive — draws ambient qi from the vein. Under intrusion, draws from the intruder.
- **Inscriber realm:** Core Formation (simple Core Formation cores can persist after death; per doc 16 §2.7 the threshold for centuries-persistence is Core Formation with spirit-vein-anchored nodes).
- **Failure modes specific to this formation:** (1) *Vein exhaustion* — if the foothill spirit vein thins (over-harvesting of the indicator herbs on the surface, per doc 14 §4.4), the formation's qi-budget collapses; the ward falls to Qi Condensation strength; the sustain-drain reverses and begins consuming the cache's own contents to maintain the ward. (2) *Intruder drain overdose* — if a mortal enters and is drained for more than ~12 hours, the mortal's anchor (doc 00 §2) begins to destabilize; the body enters a state indistinguishable from deep coma and may, beyond ~36 hours, suffer anchor-fraying that produces bardo-onset without proper death. Erniu is at the coma threshold when the player finds him. (3) *Jade-plate fracture* — if the central node is struck hard enough to crack the jade, the core's two-clause intent becomes incoherent; the ward becomes a killing array (it begins draining *all* qi within the boundary, including ambient, until the vein is exhausted).

### 1.2 Three-Jade Heart Ward (三玉心陣) — Defensive ward — Earth-phase (with Metal secondary)

**The protagonist's first Foundation Establishment inscription.** A three-node ward, the simplest formation a Foundation Establishment inscriber can produce (per doc 16 §2.7). The protagonist inscribes this around their practice mat at Old Chen's hermitage after the successful breakthrough (doc 06 Scene 5), as the first act of being a maker rather than a user.

- **Nodes:** three. Jade plates of standard quality, each invested with Earth-phase signature (yin-stable, warding intent). Each plate is the size of a clenched fist, carved with a simple ward-rune on the upper face.
- **Layout:** equilateral triangle, two paces to a side. The inscriber sits at the centroid. The lines trace three straight qi-currents along the triangle's edges, each current flowing clockwise (yin-stable direction).
- **Core logic:** a single-clause intent: *exclude hostile qi below Core Formation intensity from the boundary*. The core is the three-node pattern itself; no central node. Simplicity is the design — a three-node ward cannot encode conditional logic.
- **Effect:** within the triangular boundary (approximately 1.7 square paces), hostile qi below Core Formation intensity is excluded. The ward does not affect physical objects (a sword can pass through); it affects qi-attacks, hostile inscription, and contaminating ambient qi.
- **Duration:** approximately twenty years without re-investment, in a balanced qi-climate (per doc 16 §5.1).
- **Qi-consumption:** draws ambient qi to sustain itself; costs the inscriber one reservoir-pulse at activation, none thereafter.
- **Inscriber realm:** Foundation Establishment minimum.
- **Failure modes specific to this formation:** (1) *Collinear drift* — if any node shifts more than a finger's breadth from its surveyed position (a frost-heave, a curious animal), the triangle's geometry breaks; the ward admits what it should exclude in the direction of the drift. (2) *Earth-Wood contamination* — inscribed near a living tree root, the root's Wood-phase qi bleeds into the Earth-phase lines (Wood conquers Earth); the ward weakens within months. (3) *Central occupancy* — a second person sitting at the centroid (the inscriber's seat) while the ward is active produces a phase-resonance conflict; the ward treats the second person's qi-signature as hostile and begins excluding them, sometimes painfully.

### 1.3 Azure-Sword Heaven-Severing Boundary (碧劍裂天界陣) — Defensive barrier + alarm — Metal-phase (with Water secondary)

**The Azure Sword Sect's grotto-heaven boundary augmentation.** The grotto-heaven's natural boundary (per doc 19 §2.2) is maintained by the grotto-heaven's own law. This formation, inscribed by the sect's second Core Formation sect master two centuries ago, augments that natural boundary: it layers an alarm ward, a transit-gate, and a killing-array reflex onto the natural law-boundary, giving the sect warning and response time against intrusion.

- **Nodes:** thirty-six. Jade nodes set into the grotto-heaven's interior cliff-face at the boundary's edge, at three-pace intervals. Each node is a jade disc the size of a child's palm, inscribed with the Azure Sword Sect's sword-rune (a Metal-phase cutting intent).
- **Layout:** a closed loop following the grotto-heaven's boundary perimeter. The lines trace a double helix — an outer Metal-phase current flowing clockwise (cutting intent, yang), an inner Water-phase current flowing counter-clockwise (perception intent, yin). The two currents braid but do not cross; their non-crossing is the formation's principal design feat.
- **Core logic:** three clauses. (a) *Alarm* — any being crossing the boundary whose qi-signature is not registered (the sect's disciples are registered at Foundation Establishment oath-swearing) triggers an alarm-pulse to the sect master's awareness. (b) *Transit-permit* — registered qi-signatures pass freely; the boundary's law is augmented (not violated) for them. (c) *Killing reflex* — an unregistered being whose realm exceeds Qi Condensation triggers a single Metal-phase cutting discharge along the nearest line-segment; the discharge is Foundation Establishment intensity, intended to delay not kill (a Core Formation intruder is merely scratched; a Qi Condensation intruder is severed).
- **Effect:** the boundary's volume is the entire grotto-heaven interior (a major grotto-heaven, per doc 19 §2.1, 10–1000 square kilometers). Within this volume, the three clauses hold. Duration: indefinite, sustained by the grotto-heaven's interior qi which is 10–100x mortal ambient.
- **Qi-consumption:** passive draw from the grotto-heaven's interior. The killing reflex consumes a one-time pulse per discharge, replenished over hours.
- **Inscriber realm:** Core Formation (the original inscriber was the second sect master; the formation persists after his death because the grotto-heaven's qi-density sustains it, per doc 16 §2.5).
- **Failure modes specific to this formation:** (1) *Line-crossing* — if a line-segment is broken (a jade node shatters in a siege), the helix geometry breaks; the killing reflex can discharge inward (against the sect's own disciples) rather than outward. (2) *Signature-spoofing* — a Nascent Soul intruder with sufficient skill can copy a registered disciple's qi-signature and pass the alarm clause; the killing reflex does not trigger. (3) *Boundary-law conflict* — if the grotto-heaven's own law-boundary shifts (a rare geomantic event), the formation's perimeter no longer matches the boundary; gaps open where neither the formation nor the natural law fully holds. (4) *Sect-master death* — the alarm clause routes to the sect master's awareness; if the sect master dies without succession, the alarm has no receiver and the killing reflex becomes the only active clause.

### 1.4 Five-Phase Spirit-Gathering Array (五行聚靈陣) — Utility — balanced (all five phases)

The standard gathering array, the foundation of every sect's cultivation chamber (per doc 16 §2.4). The Azure Sword Sect's chambers run a high-quality version; the Cangwu Sect's single chamber runs a degraded version with three nodes missing.

- **Nodes:** five, one per phase. Wood (jade), Fire (iron), Earth (river-stone), Metal (silver disc), Water (pearl). Set in a regular pentagon.
- **Layout:** pentagonal. Lines trace a five-pointed star (the generation cycle: Wood→Fire→Earth→Metal→Water→Wood) inscribed in the pentagon. The star's interior is the gathering zone.
- **Core logic:** a single intent: *draw ambient qi into the pentagon's interior at five-phase balance*. The five phases circulate by the generation cycle; ambient qi is drawn in, phase-separated, and re-radiated into the interior at a higher density.
- **Effect:** within the pentagon's interior (~2 square paces for a personal array, larger for a chamber array), ambient qi density is 3–10x the surrounding environment. A cultivator practicing inside gains reservoir at 3–10x the normal rate.
- **Duration:** indefinite in a balanced climate; weeks to months in a qi-poor region.
- **Qi-consumption:** none, once active; it produces qi rather than consuming it.
- **Inscriber realm:** Foundation Establishment minimum for a personal array; Core Formation for a chamber array (chamber arrays have denser nodes and finer lines).
- **Failure modes:** (1) *Phase-imbalance* — if one node's phase-signature is weaker than the others (a low-quality pearl, a worn iron disc), the generation cycle stalls at that node; the array produces a phase-skewed qi that deviates the practitioner over time. (2) *Conquest-crossing* — if a line is mis-traced so that two phases cross in conquest rather than generation (e.g., Water-line crossed over Fire-line), the array begins to *quench* ambient qi rather than gather it; the interior becomes qi-poorer than the surroundings. (3) *Over-gathering* — in a qi-rich environment, a chamber array can over-pressurize the interior; practitioners experience reservoir over-pressurization (doc 27 §4.2).

### 1.5 Lotus-Petal Killing Array (蓮瓣殺陣) — Offensive killing array — Fire-phase (with Metal secondary)

A Core Formation killing array, the kind inscribed around a sect's treasury or a contested grotto-heaven anchor. The Azure Sword Sect inscribes a variant around its scripture pavilion.

- **Nodes:** twelve. Iron discs (Fire-phase, yang-sharp) set in two concentric hexagons.
- **Layout:** two concentric hexagons, the outer at six-pace radius, the inner at three-pace. Lines trace twelve curving petals from the outer hexagon to the inner, each petal a Fire-phase qi-current that sharpens to a Metal-phase edge at the inner terminus.
- **Core logic:** conditional. *On intrusion into the outer hexagon, discharge the nearest petal as a Fire-phase cutting burst toward the inner hexagon's center. Repeat for each step of intrusion. The intruder is destroyed at the inner hexagon's center.*
- **Effect:** within the outer hexagon (~113 square paces), any unregistered intrusion triggers a Fire-phase discharge at Core Formation intensity, oriented toward the centroid. A Qi Condensation intruder is destroyed in one discharge; a Foundation Establishment intruder survives three or four; a Core Formation intruder tanks the array long enough to dismantle one petal-node and break the loop.
- **Duration:** indefinite in a qi-rich environment; days in a qi-poor one (offensive arrays consume ambient qi faster than defensive ones, per doc 16 §2.4).
- **Qi-consumption:** high. Each discharge draws ambient qi equivalent to one Foundation Establishment reservoir-pulse.
- **Inscriber realm:** Core Formation minimum (the conditional core requires Core Formation coherence).
- **Failure modes:** (1) *Petals crossed* — two petals' lines crossed during tracing; the array discharges inward at activation, often killing the inscriber. (2) *Qi-famine* — in a qi-poor environment, the array cannot sustain its discharges; it fires once or twice then goes dormant, leaving the treasury open. (3) *Core contamination* — if the inscriber was angry during investment (a killing intent is required, but unbalanced anger contaminates the core, per doc 16 §4.5), the array's targeting becomes indiscriminate — it discharges on *any* qi-signature including registered ones.

### 1.6 Paired Mirror Gate (雙鏡門陣) — Transport gate — Water-phase

The simplest transport formation: a paired gate linking two inscribed locations for direct transit. The Azure Sword Sect maintains one pair linking the sect compound to the grotto-heaven's anchor cave; the inscription is the sect's most carefully guarded asset.

- **Nodes:** eight per gate (sixteen per pair). Six pearl nodes (Water-phase, yin-flowing) form the gate's hexagonal perimeter; two jade nodes (Earth-phase) anchor the gate's spatial coordinate.
- **Layout:** two hexagonal gates, each three paces across, inscribed at the two locations to be linked. The two gates' core-intents are synchronized: each encodes the *other* gate's spatial coordinate as its destination.
- **Core logic:** *on activation by a registered qi-signature, fold the interior of this gate onto the interior of the paired gate for one breath. Anything within the interior transits to the paired interior.*
- **Effect:** anything within the three-pace hexagon transits to the paired gate's hexagon. One transit per activation; re-activation requires a cooldown of approximately one minute.
- **Duration:** the gates persist indefinitely if maintained; the pairing-link persists as long as both gates' cores remain coherent.
- **Qi-consumption:** each transit consumes ambient qi equivalent to one Foundation Establishment reservoir-pulse, drawn from the originating gate's environment.
- **Inscriber realm:** Core Formation minimum (the spatial-coordinate encoding requires Core Formation law-perception, per doc 16 §2.4). Both gates of a pair must be inscribed by the same inscriber (or by inscribers who have synchronized their core-intent through a separate, demanding rite).
- **Failure modes:** (1) *Coordinate drift* — if one gate's jade anchors shift, the spatial coordinate drifts; transit lands the traveler at the wrong location (sometimes inside solid rock). (2) *Pairing-decoherence* — if one gate's core is disrupted (a node shattered, a line crossed), the pairing-link breaks; transit attempts discharge into raw qi-space, producing a spatial tear that injures the traveler and the gate. (3) *Simultaneous activation* — if both gates are activated simultaneously by different users, the cores conflict; one user transits, the other is shredded across the spatial fold. (4) *Phase-contamination of the link* — Water-phase is stable for spatial work; if a Fire-phase qi-source is introduced near one gate (a battle, a forge), the link attenuates and transit becomes unreliable.

---

## 2. Named Talismans

Ten talismans follow. Each is a single-use qi-structure inscribed on a portable medium (per doc 16 §3.1). Activation consumes the medium (except jade, which is drained and blanked).

### 2.1 Fireball Talisman (火球符) — Attack — Fire-phase

- **Medium:** standard yellow talisman paper (黃紙), alum-and-beeswax treated.
- **Ink:** cinnabar ink (硃砂, Fire-phase, yang).
- **Pattern:** a central sigil — the *fire* character (火) inscribed in three strokes, the central stroke elongated and curving upward to suggest a flame. Around the sigil, four ancillary runes set at the cardinal points: range (upper), direction (right), intensity (lower), trigger (left). The pattern fills the paper's upper two-thirds; the lower third is the activation zone (where the user's qi is infused).
- **Effect:** on activation, discharges a fireball of intensity scaled to the inscriber's realm. A Qi Condensation inscription produces a Qi Condensation-intensity fireball (range ~10 paces, fixed direction). A Foundation Establishment inscription produces a Foundation Establishment-intensity fireball (range ~30 paces). The fireball ignites combustibles; it does not discriminate friend from foe.
- **Activation cost:** one-tenth of a Qi Condensation reservoir; one-twentieth of a Foundation Establishment reservoir.
- **Market value:** 0.5 spirit stones (Qi Condensation inscription); 2 spirit stones (Foundation Establishment inscription).
- **Failure modes:** (1) *敗符 (flawed pattern)* — the fireball detonates at the user's hand instead of at the target; the user is burned. (2) *逆符 (incompatible activation)* — a Water-phase cultivator activating a Fire-phase talisman: the conquest cycle quenches the pattern; the fireball fizzles to a spark. (3) *潰符 (seal collapse)* — rare; the seal collapses on activation and the talisman discharges its full charge as an omnidirectional burst.

### 2.2 Ice-Arrow Talisman (冰箭符) — Attack — Water-phase (yin)

- **Medium:** standard yellow paper, treated with pine-resin for Water-phase compatibility.
- **Ink:** pine-soot ink (Water-phase, yin).
- **Pattern:** a central sigil — the *water* character (水) with the central vertical stroke elongated and sharpened to an arrowhead. Three ancillary runes: range, target-lock, trigger. The pattern is finer than the fireball's (Water-phase lines are thinner).
- **Effect:** on activation, discharges a single ice-arrow of intensity scaled to the inscriber's realm. Range ~20 paces (Qi Condensation); the arrow pierces rather than ignites. Target-lock rune permits a brief tracking (the arrow curves up to 30 degrees toward the chosen target's qi-signature).
- **Activation cost:** one-eighth of a Qi Condensation reservoir (Water-phase activation is slightly costlier than Fire-phase for Fire-affinity users).
- **Market value:** 0.7 spirit stones (Qi Condensation inscription); 3 spirit stones (Foundation Establishment inscription with target-lock).
- **Failure modes:** (1) *敗符* — the arrow shatters on release, spraying ice-shards across the user's forearm. (2) *Target-lock bleed* — if the target-lock rune is imprecise, the arrow locks onto the *user's* qi-signature (the nearest Water-compatible source) and turns. (3) *逆符* — a Fire-phase cultivator activating: the arrow melts to a splash of cold water, harmless.

### 2.3 Shield Talisman (盾符) — Defense — Earth-phase

- **Medium:** standard yellow paper, treated with clay-slurry for Earth-phase binding.
- **Ink:** iron-gall ink (Metal-phase, compatible with Earth by the generation cycle — Metal generates Water which is dammed by Earth; the ink's Metal-phase sharpens the Earth-phase boundary).
- **Pattern:** a central sigil — the *mountain* character (山), three peaks. Around it, a hexagonal boundary-rune (six short strokes, one per side). No ancillary runes; the shield's parameters are fixed.
- **Effect:** on activation, projects a hexagonal qi-barrier approximately one pace across, oriented between the user and the last-perceived threat. The barrier absorbs one attack of up to Foundation Establishment intensity (Qi Condensation inscription) or one Core Formation intensity attack (Foundation Establishment inscription), then collapses. Duration: the barrier holds for up to ten breaths if not struck.
- **Activation cost:** one-fifth of a Qi Condensation reservoir.
- **Market value:** 0.8 spirit stones (Qi Condensation); 3 spirit stones (Foundation Establishment).
- **Failure modes:** (1) *敗符* — the barrier forms with a gap; the next attack passes through the gap. (2) *Orientation-flaw* — the barrier orients in the wrong direction (the user's perception was muddy at activation); the attack strikes the user's unprotected side. (3) *耗符 (degraded medium)* — a damp-stored talisman's barrier holds for only one or two breaths.

### 2.4 Communication Talisman (傳音符) — Utility — Metal-phase

- **Medium:** jade slip (a small rectangular jade tablet, the size of a thumb). Jade because the talisman must be re-chargeable (per doc 16 §3.5) — a communication talisman is reused.
- **Ink:** iron-gall ink (Metal-phase).
- **Pattern:** a central sigil — the *word* character (言) — inscribed in three strokes. Around it, two ancillary runes: destination (inscribed at crafting with the recipient's qi-signature, requiring the inscriber to have a sample of the recipient's qi) and duration (how long the message persists at the destination).
- **Effect:** on activation, the user speaks a message of up to one hundred breaths' length into the slip. The message transits along the Metal-phase link to the destination slip (the paired half of the communication pair, held by the recipient), where it plays once and then is erased. The slip is then re-chargeable.
- **Activation cost:** one-tenth of a Qi Condensation reservoir per message.
- **Market value:** 5 spirit stones per *paired* set (two slips); recharging is free (the user's own qi).
- **Failure modes:** (1) *Destination-slip lost* — if the recipient's slip is destroyed or out of Metal-phase-link range (~100 li for a Foundation Establishment inscription), the message dissipates. (2) *Qi-signature drift* — if the recipient's qi-signature has shifted since the pairing (a realm transition, a contamination), the destination rune no longer matches; the message bounces back to the sender as a discordant qi-pulse. (3) *Eavesdropping* — a Core Formation cultivator perceiving Metal-phase qi can intercept the message-transit; the contents are not private above Foundation Establishment.

### 2.5 Storage Talisman (儲物符) — Utility — Earth-phase (with Metal secondary)

- **Medium:** jade plaque, the size of a child's palm, three-tenths of an inch thick.
- **Ink:** cinnabar ink blended with iron-filings (Fire-Metal blend, Earth-compatible by the generation-and-conquest cycle: Fire generates Earth, Metal sharpens the spatial boundary).
- **Pattern:** a central sigil — the *vessel* character (器), four squares arranged in a larger square. Around it, eight ancillary runes encoding the spatial coordinates of the pocket, the pocket's volume, the access-trigger, and the warding against unauthorized access. The pattern is dense — the most complex Foundation Establishment inscription.
- **Effect:** on activation (by the registered qi-signature, encoded at inscription), opens a spatial pocket of approximately one cubic pace. The user can place objects into the pocket or withdraw them; the pocket holds its contents indefinitely while the talisman is sealed. The pocket weighs nothing in the user's hand (its mass is in folded space, not in the medium).
- **Activation cost:** one full Qi Condensation reservoir to open or close; negligible to withdraw a small item.
- **Market value:** 20 spirit stones (Foundation Establishment inscription). The most expensive common talisman; the precursor to a storage ring (which is a Core Formation artifact).
- **Failure modes:** (1) *Spatial-coordinate corruption* — if the inscription is flawed, the pocket's coordinates drift; objects placed inside are lost in folded space (sometimes recoverable, sometimes not). (2) *Over-loading* — exceeding the pocket's volume by more than ~10% collapses the spatial fold; the pocket's contents are ejected at high velocity in random directions, often destroying the talisman. (3) *Ward-bypass* — a Core Formation cultivator can crack the access-ward and read the pocket's contents; storage talismans are not secure against higher-realm theft.

### 2.6 Light Talisman (光符) — Utility — Fire-phase (yang)

The first talisman a Qi Condensation inscriber learns (per doc 16 §3.8).

- **Medium:** standard yellow paper.
- **Ink:** cinnabar ink (Fire-phase, yang).
- **Pattern:** a single central sigil — the *sun* character (日) inscribed in four strokes within a circle. No ancillary runes; the simplest talismanic pattern.
- **Effect:** on activation, the talisman emits steady illumination equivalent to a lantern, sustained for approximately four hours (Qi Condensation inscription) or one day (Foundation Establishment inscription). The light is warm-toned (Fire-phase yang).
- **Activation cost:** negligible — one-twentieth of a Qi Condensation reservoir.
- **Market value:** 0.1 spirit stones (Qi Condensation). The cheapest talisman; sold in stacks of ten.
- **Failure modes:** (1) *敗符* — the talisman flares once and burns out (brief blinding flash, no sustained light). (2) *耗符* — a long-stored talisman's light dims to a glow. (3) *Reverse-flaw* — a rare flaw in which the talisman emits *darkness* (a yin inversion of the pattern); the area within three paces becomes deeper shadow.

### 2.7 Concealment Talisman (隱形符) — Utility — Water-phase (yin)

- **Medium:** standard yellow paper treated with pine-resin.
- **Ink:** pine-soot ink (Water-phase, yin).
- **Pattern:** a central sigil — the *hidden* character (隱) inscribed in fourteen strokes (the most complex Qi Condensation pattern). Around it, three ancillary runes: radius (the area of effect), duration, and qi-suppression (the strength of the concealment against perception).
- **Effect:** on activation, the user's qi-signature and physical form are concealed from perception for the duration. Qi Condensation inscription: radius two paces, duration one hour, conceals from Qi Condensation perception. Foundation Establishment inscription: radius five paces, duration four hours, conceals from Foundation Establishment perception (a Core Formation perceiver sees through it).
- **Activation cost:** one-quarter of a Qi Condensation reservoir.
- **Market value:** 1 spirit stone (Qi Condensation); 5 spirit stones (Foundation Establishment).
- **Failure modes:** (1) *敗符* — the concealment is patchy; the user is partially visible (a smudge in the air). (2) *Qi-surge bleed* — if the user routes qi aggressively while concealed (casting another talisman, fighting), the concealment ruptures; the user becomes briefly *more* visible (a flaring qi-source). (3) *逆符* — a Fire-phase cultivator activating: the Water-phase pattern is quenched; no concealment, and the user's qi-signature flares (the opposite of the intended effect).

### 2.8 Detection Talisman (探符) — Utility — Metal-phase

**The talisman the protagonist uses at the Cangwu cache** (doc 28 §2.2). Old Chen, recognizing the cache-formation's ward signature, gives the protagonist one of his few remaining Foundation Establishment-grade detection talismans to perceive Erniu's qi-trace inside the sealed cache before deciding whether to attempt entry.

- **Medium:** jade slip (re-chargeable, three uses per recharge).
- **Ink:** iron-gall ink (Metal-phase), with a trace of silver-filings (Earth-secondary, for stability).
- **Pattern:** a central sigil — the *seek* character (尋) inscribed in twelve strokes. Around it, four ancillary runes: depth (how deep the perception reaches), phase-filter (which phase-signatures to admit), sensitivity (minimum qi-intensity detectable), and trigger.
- **Effect:** on activation, the user receives a brief (one-breath) perception-flash of all qi-sources within range matching the phase-filter. Foundation Establishment inscription: range 50 paces, sensitivity down to one-tenth of a Qi Condensation reservoir, phase-filter set at inscription.
- **Activation cost:** one-third of a Qi Condensation reservoir.
- **Market value:** 4 spirit stones (Foundation Establishment).
- **Failure modes:** (1) *敗符* — the perception-flash is incomplete (the user receives fragments, easily misinterpreted). (2) *Phase-filter bleed* — if the filter-rune is imprecise, the talisman admits all phases; the user is overwhelmed by ambient qi-noise (perception overload, doc 27 §4.4). (3) *Sensitivity-burnout* — a high-sensitivity talisman used in a qi-rich environment burns out the jade's pattern; the talisman is destroyed.

### 2.9 Wound-Sealing Talisman (止創符) — Defense/utility — Wood-phase

**The talisman Old Chen uses on the protagonist after the failed breakthrough** (doc 06 Scene 4). The protagonist's reservoir has cracked and meridians are inflamed; Old Chen presses a Wood-phase wound-sealing talisman to the protagonist's chest to halt the internal bleeding long enough for stabilization.

- **Medium:** standard yellow paper treated with herbal-infusion (Wood-phase compatible).
- **Ink:** wood-sap ink (Wood-phase, yin-restoring), prepared from the sap of the Cangwu foothills' old-growth spirit pines.
- **Pattern:** a central sigil — the *seal* character (封) inscribed in nine strokes. Around it, two ancillary runes: target-area (where the seal holds) and duration.
- **Effect:** on activation by contact with the wounded body, the talisman's Wood-phase qi seals internal bleeding (Wood generates; the body's yin is reinforced) and reduces meridian-inflammation by half for the duration. Qi Condensation inscription: holds for two hours. Foundation Establishment inscription: holds for twelve hours.
- **Activation cost:** one-fifth of a Qi Condensation reservoir (Old Chen pays this; the recipient does not).
- **Market value:** 1.5 spirit stones (Qi Condensation); 6 spirit stones (Foundation Establishment).
- **Failure modes:** (1) *敗符* — the seal is incomplete; bleeding slows but does not stop. (2) *Wood-Metal contamination* — if the talisman is applied to a body whose meridians are Metal-phase-inflamed (a Metal-phase cultivator's injury), the Wood-phase seal is cut by the Metal-phase qi (Metal conquers Wood); the talisman is consumed without effect. (3) *Late application* — if applied more than ~30 minutes after the wound, the body's qi-system has already begun compensating in ways the seal conflicts with; the seal produces meridian-cramping.

### 2.10 Sword-Qi Talisman (劍氣符) — Attack — Metal-phase

A Foundation Establishment-class attack talisman, the ranged weapon of choice for sword-cultivators who cannot yet project sword-qi themselves. The Azure Sword Sect's outer disciples buy these in stacks.

- **Medium:** standard yellow paper treated with iron-salt solution (Metal-phase binding).
- **Ink:** iron-gall ink (Metal-phase, yang-sharp).
- **Pattern:** a central sigil — the *sword* character (劍) inscribed in fifteen strokes (the longest simple-attack sigil). Around it, three ancillary runes: range, cutting-depth, and trigger. The pattern is geometrically precise — every stroke must be exact; sword-patterns are unforgiving.
- **Effect:** on activation, discharges a single Metal-phase sword-qi of intensity scaled to the inscriber's realm. Range ~40 paces (Foundation Establishment inscription). The sword-qi cuts rather than burns; it penetrates a Qi Condensation shield-talisman cleanly and wounds a Foundation Establishment cultivator through their robes.
- **Activation cost:** one-quarter of a Foundation Establishment reservoir.
- **Market value:** 4 spirit stones (Foundation Establishment). Not available at Qi Condensation inscription (the pattern is beyond Qi Condensation precision).
- **Failure modes:** (1) *敗符* — the sword-qi curves in flight, missing the target and striking whatever is to the side. (2) *Trigger-bleed* — a talisman stored near Metal-phase qi (an iron forge, a sword collection) may discharge spontaneously. (3) *Cutting-depth flaw* — an imprecise cutting-depth rune produces a sword-qi that cuts *too deep* — passing through the target without transferring energy (a clean hole, no wound-trauma) or *too shallow* (a scratch).

---

## 3. Named Pills

Nine pills follow. Each is a refined medicinal product (per doc 16 §4.1) with named ingredients, a named refinement process, and named failure modes. Ingredient phase-affinities cross-reference `14_ECOLOGY_AND_QI.md` §4 (spirit herbs) and the doc 16 Foundation Pill example (§5.3).

### 3.1 Return-Qi Pill (回氣丹) — Healing — Wood-phase (with Water secondary)

The most common pill in the cultivation world; the alchemist's bread and butter. Restores a depleted reservoir.

- **Ingredients:** (1) fifty-year spirit ginseng root (Wood-phase, gathered at Spring Equinox); (2) spirit-pearl powder (Water-phase, gathered at Winter Solstice); (3) dried lotus seed (Wood-phase with Water-secondary, harvested at Clear and Bright 清明). The ginseng generates (Wood), the pearl nourishes (Water generates Wood), the lotus stabilizes (Wood-Water coherence).
- **Refinement process:** clay furnace (the baseline, per doc 16 §4.4). Civil fire (文火, low, slow) for four hours; the ginseng and lotus are combined first, the pearl powder added at the second hour (Water added too early quenches the Wood's generation cycle). Congealing at the fourth hour under civil fire; the pill forms as a small green-tinged sphere. Cooling in a jade box (Wood-compatible).
- **Effect:** restores approximately one-third of a Qi Condensation reservoir over ten breaths. Potency scales with ingredient age (a hundred-year ginseng restores half; a three-hundred-year restores two-thirds). Duration: the restored qi is permanent (it is the cultivator's own reservoir, replenished). Side effects: mild warmth in the lower dantian; no contamination if refined correctly.
- **Realm requirement:** Qi Condensation alchemist to refine; any realm to consume.
- **Market value:** 0.5 spirit stones (fifty-year ingredients); 2 spirit stones (hundred-year); 8 spirit stones (three-hundred-year).
- **Failure modes:** (1) *Charred pill (火候失誤)* — too hot, too long; the ginseng's Wood-phase essence burns to a sooty residue; the pill is toxic, produces liver-qi inflammation on consumption. (2) *Pearl-addition error* — Water added too early; the phases cancel (Water conquers Fire-but-there-is-no-Fire-here, so Water quenches the Wood's generation); the result is an inert grey sphere, useless. (3) *Contamination (污丹)* — the alchemist refining while angry produces a pill that transmits a flash of the anger to the consumer (a brief, disturbing irritability, ~1 hour).

### 3.2 Trauma Pill (療創丹) — Healing — Wood-phase (with Earth secondary)

Accelerates wound-healing. Distinct from the Return-Qi Pill: this heals tissue, not reservoir.

- **Ingredients:** (1) thirty-year spirit notoginseng root (Wood-phase, Earth-secondary); (2) spirit-pearl powder (Water-phase, for cleansing the wound); (3) poria fungus (Earth-phase, for stability); (4) dried sage leaf (Wood-phase, gathered at Grain in Ear 芒種). Wood generates tissue; Earth stabilizes; Water cleanses.
- **Refinement process:** clay furnace. Civil fire for two hours (Wood-essence extraction), then martial fire (武火, hot, fast) for thirty minutes (Earth-poria fusion), then civil fire for one hour (congealing). The fire transitions are the difficult step — the alchemist must shift phase-intent cleanly. Congealing as a brownish pill. Cooling in a wooden box.
- **Effect:** accelerates wound-healing by approximately 5x for six hours. A sword-cut that would normally take two weeks to heal closes in two days. Does not regenerate severed tissue; does not cure qi-injury (meridian-damage requires a different pill). Side effects: the body's metabolism accelerates (the consumer is ravenous for a day afterward); mild Earth-phase imbalance if overused.
- **Realm requirement:** Qi Condensation alchemist to refine; any realm to consume.
- **Market value:** 1 spirit stone.
- **Failure modes:** (1) *Fire-transition error* — the civil→martial→civil transition botched; the pill congeals as a Wood-Earth-conflicted mass that produces tissue-growth in the wrong place (the consumer develops bone-spurs at the wound site). (2) *Earth-excess* — too much poria; the pill over-stabilizes and the wound heals *closed over foreign matter* (dirt, cloth-fragments) that was not cleaned first; infection follows. (3) *Contamination* — the alchemist refining while grieving produces a pill that transmits a grief-flash to the consumer.

### 3.3 Purification Pill (清污丹) — Healing — Water-phase

Vents accumulated contamination from the qi-system (per doc 03 Station 3, venting into a sink).

- **Ingredients:** (1) spirit-pearl core (Water-phase, gathered at Winter Solstice, peak yin); (2) rehmannia root (Water-phase, gathered at Frost's Descent 霜降); (3) kelp-ash (Water-phase with Earth-secondary, for absorption); (4) cinnabar trace (Fire-phase, refined, as a phase-bridge — Fire conquers Metal, the typical contamination phase, and is then cleansed by Water). The cinnabar is the dangerous ingredient: too much Fire conquers the Water intent and the pill becomes toxic.
- **Refinement process:** iron furnace (Metal-phase, compatible with Water by the generation cycle: Metal generates Water). Civil fire throughout, four hours. The cinnabar is added at the third hour in a precise one-grain measure. Congealing as a deep blue pill. Cooling in a porcelain vessel (Water-compatible).
- **Effect:** the consumer enters a one-hour purification state in which accumulated contamination is vented through the skin (a greyish sweat, foul-smelling). After the hour, the qi-system is approximately 60% cleaner (Qi Condensation alchemist) to 90% cleaner (Foundation Establishment alchemist). Side effects: physical exhaustion (the venting is taxing); dehydration (the sweat-loss is significant).
- **Realm requirement:** Qi Condensation alchemist to refine; any realm to consume (but a Qi Condensation consumer may faint from the exhaustion).
- **Market value:** 2 spirit stones (Qi Condensation inscription); 5 spirit stones (Foundation Establishment).
- **Failure modes:** (1) *Cinnabar excess* — too much Fire-phase; the pill's Water intent is quenched; the consumer develops Fire-deviation symptoms (heat-rash, agitation, mild hallucination) rather than purification. (2) *Congealing failure* — the mixture fails to cohere (the most common failure); the result is dross — a wet grey ash that is mildly toxic on contact. (3) *Over-purification* — a high-quality pill consumed by a cultivator with little contamination produces the opposite of the intended effect: the pill, finding nothing to vent, begins purging the cultivator's *own* qi-structure (reservoir-qi is vented as contamination); the consumer loses reservoir rather than contamination.

### 3.4 Foundation Pill (筑基丹) — Breakthrough — Wood-phase (with Water and Fire secondary)

The most economically valuable pill a Foundation Establishment alchemist produces (per doc 16 §4.3). Assists the Qi Condensation → Foundation Establishment breakthrough.

- **Ingredients (per doc 16 §5.3, the canonical recipe):** (1) hundred-year spirit ginseng (Wood-phase, gathered at Spring Equinox); (2) spirit-pearl (Water-phase, gathered at Winter Solstice); (3) refined cinnabar (Fire-phase, prepared by the alchemist before refinement); (4) the inner core of a mid-tier Wood-phase spirit beast (內丹, Wood-phase, gathered by hunting). The ginseng is the body-integration (Wood generates; the body is yin and Wood-essence integrates it); the pearl is the qi-reservoir (Water nourishes Wood); the cinnabar is the activation-fire (Fire feeds back to Wood through the generation cycle); the beast-core is the anchor-bridge (the core's crystallized qi is the dense Wood-phase that the integration uses as scaffolding).
- **Refinement process:** spirit-bronze furnace (the sect-heirloom cauldron, per doc 16 §4.4 — anything less produces a contaminated pill). Civil fire for six hours (Wood-essence extraction), martial fire for one hour (Fire-activation of the cinnabar), civil fire for twelve hours (congealing — the longest congealing of any common pill). The alchemist must hold a coherent Wood-phase intent throughout; any lapse produces a flawed pill. Congealing as a deep green pill with a faint red blush (the cinnabar's Fire, properly integrated). Cooling in a jade box (Wood-compatible) for one full day before use.
- **Effect:** when consumed by a Qi Condensation cultivator whose meridian system is integrated, whose reservoir is sufficient, and whose heart-mind is stable (per doc 27 §1.4 Stage 1), the Foundation Pill produces a Foundation Establishment breakthrough with approximately 70% success (per doc 16 §5.3) and no contamination. The pill does not *force* the breakthrough — it supplies the qi-resources the breakthrough requires; the cultivator must still navigate the Confrontation stage. Duration: the pill's effect is the breakthrough itself (one rite); residual qi-resources persist for ~30 days if the breakthrough is not attempted. Side effects (when consumed by a prepared cultivator): none beyond the breakthrough's own strain. Side effects (when consumed by an unprepared cultivator): forced breakthrough, deviation, foundation collapse, or death (per doc 16 §4.3).
- **Realm requirement:** Foundation Establishment alchemist to refine; Qi Condensation cultivator at the peak (per doc 27 §1.4 Stage 1 prerequisites) to consume.
- **Market value:** 50 spirit stones. This is approximately a Qi Condensation cultivator's annual income (per doc 16 §4.3) — a single pill is the year's earnings.
- **Failure modes:** (1) *Forced breakthrough (forced attempt)* — the pill consumed by an unprepared cultivator produces a Foundation Establishment breakthrough attempt with `forced_attempt = true` (per doc 27 §1.4); the Confrontation instability is multiplied by 2.5; 心魔 onset is likely. (2) *Cinnabar-miscalibration* — too much Fire; the pill becomes a Fire-deviation pill (the consumer suffers fire-deviation: heat-stroke symptoms, meridian-inflammation, in severe cases spontaneous combustion of the lower dantian's qi-reservoir). (3) *Beast-core contamination* — the beast-core carries the spirit beast's psychospiritual residue (a slain beast's dying intent); if the alchemist does not cleanse the core before refinement, the residue transmits to the consumer as a brief 心魔 flash (the consumer perceives the beast's last moments). (4) *Congealing failure* — the most costly failure; twelve hours of fire-control lost; the dross is toxic and must be buried (not sold; per doc 16 §4.7, selling contaminated pills ruins the alchemist's reputation).

### 3.5 Root-Developing Pill (培根丹) — Transformation — Earth-phase (with Metal secondary)

Per doc 27 §5 (spiritual roots) and doc 16 §4.3 (transformation pills). Develops a phase-root the cultivator did not have — a controlled, costly medical procedure.

- **Ingredients:** (1) hundred-year poria fungus (Earth-phase, gathered at Beginning of Autumn 立秋); (2) stalactite powder (Metal-phase, gathered from a metal-phase spirit vein); (3) spirit-pearl trace (Water-phase, as a phase-bridge: Metal generates Water, Water is dammed by Earth — the pearl is the medium through which Metal becomes Earth-anchored); (4) the inner core of a mid-tier Earth-phase spirit beast (the badger-core, Earth-phase); (5) cinnabar trace (Fire-phase, refined; Fire generates Earth, providing the generative impulse for the new root).
- **Refinement process:** spirit-bronze furnace. Civil fire for eight hours (Earth-extraction from poria and badger-core), martial fire for two hours (Metal-stalactite fusion), civil fire for sixteen hours (congealing). The congealing is the demanding step: the alchemist must hold a coherent Earth-with-Metal-secondary intent throughout, and must encode the *specific phase* of the root to be developed (the pill is phase-specific — a Wood-root pill is a different recipe than a Fire-root pill). Congealing as a deep ochre pill. Cooling in a clay vessel (Earth-compatible) for three days.
- **Effect:** when consumed by a Foundation Establishment cultivator (Qi Condensation consumers cannot receive the transformation — their meridian system cannot accommodate the new root, per doc 16 §4.3), the pill develops the encoded phase-root by approximately 0.3 in the sensitivity and admission components (per doc 27 §5.1). The development is permanent. Duration: the development occurs over one month; full effect at month's end. Side effects: the cultivator's phase-balance shifts (the new root tilts the five-phase profile, per doc 27 §1.4 Stage 1 — the cultivator may need to re-balance before their next breakthrough); mild Earth-excess symptoms (heaviness, lethargy) during the development month.
- **Realm requirement:** Core Formation alchemist to refine (per doc 16 §4.6 — transformation pills require Core Formation minimum); Foundation Establishment cultivator to consume.
- **Market value:** 200 spirit stones. The most expensive consumable a Core Formation alchemist produces in regular trade.
- **Failure modes:** (1) *Wrong-phase encoding* — the alchemist's intent wavers during congealing; the pill encodes a different phase than intended (the consumer develops the wrong root). The result is not directly harmful but is economically catastrophic (the consumer paid for a Fire-root and got a Water-root). (2) *Earth-excess congealing* — the Earth-phase intent over-concentrates; the pill, on consumption, develops the root *too fast* — the cultivator's meridian-system cannot accommodate the new root's phase-flow; meridian-inflammation, in severe cases meridian-rupture. (3) *Beast-core contamination* — the badger-core's residue transmits as a brief Earth-phase 心魔 (the consumer perceives the beast's burrowing, feels entombed; ~1 hour). (4) *Consumer-realm mismatch* — a Qi Condensation cultivator consuming the pill: the new root develops but the meridian-system lacks the integration to channel it; the root withers within months, leaving meridian-scarring that makes future root-development harder.

### 3.6 Strength Pill (力丹) — Enhancement — Fire-phase (yang)

A combat pill. Briefly boosts physical strength.

- **Ingredients:** (1) dried ginger root (Fire-phase, gathered at Summer Solstice 夏至, peak yang); (2) cinnabar (Fire-phase, refined); (3) dried epimedium leaf (Fire-phase with Wood-secondary, gathered at Grain in Ear). Wood generates Fire; the Wood-secondary sustains the Fire boost.
- **Refinement process:** clay furnace. Martial fire for one hour (Fire-extraction), civil fire for two hours (congealing). A fast refinement — three hours total. Congealing as a small red pill. Cooling in a wooden box (Wood-compatible, feeds Fire).
- **Effect:** doubles the consumer's physical strength for ten minutes (Qi Condensation inscription) to thirty minutes (Foundation Establishment inscription). The boost is yang-aggressive — the consumer feels hot, restless, slightly euphoric. Side effects: the crash afterward (exhaustion, mild dehydration, ~2 hours); cumulative Fire-contamination with repeated use (the "pill addiction" trope, per doc 16 §4.3).
- **Realm requirement:** Qi Condensation alchemist to refine; any realm to consume.
- **Market value:** 0.3 spirit stones. Cheap; sold in stacks to mercenary cultivators.
- **Failure modes:** (1) *Over-fire* — too much martial fire; the pill's Fire-phase over-concentrates; the consumer suffers a brief Fire-deviation (heat-stroke, agitation, sometimes violence). (2) *Wood-secondary failure* — the epimedium under-potent; the boost lasts ten minutes but the crash is twice as severe. (3) *Contamination* — the alchemist refining while angry produces a pill that amplifies the consumer's anger (a brief rage-state, dangerous in combat).

### 3.7 Perception Pill (覺丹) — Enhancement — Metal-phase

Briefly sharpens perception. Used before breakthrough attempts (a cultivator preparing for Foundation Establishment may take one to deepen the Threshold stage's coherence perception, per doc 27 §1.4 Stage 2).

- **Ingredients:** (1) stalactite powder (Metal-phase); (2) dried chrysanthemum flower (Metal-phase with Wood-secondary, gathered at Frost's Descent 霜降); (3) white ore (Metal-phase, refined); (4) spirit-pearl trace (Water-phase, as phase-bridge: Metal generates Water; the pearl stabilizes the Metal perception-intent).
- **Refinement process:** iron furnace (Metal-compatible). Civil fire for four hours (Metal-extraction), civil fire for two hours (congealing). The fire must be steady — Metal-perception patterns shatter under martial fire. Congealing as a small white pill. Cooling in a silver box (Metal-compatible).
- **Effect:** sharpens perception (qi-perception, environmental-perception, self-perception) by approximately 50% for one hour (Qi Condensation) to three hours (Foundation Establishment). The consumer perceives qi-flows more clearly, meridian-states more precisely, environmental signatures more sharply. Side effects: perception-overload if taken in a qi-rich environment (the cultivator cannot filter; doc 27 §4.4); mild headache after.
- **Realm requirement:** Qi Condensation alchemist to refine; any realm to consume.
- **Market value:** 1.5 spirit stones.
- **Failure modes:** (1) *Martial-fire exposure* — the fire spiked to martial at any point; the Metal-perception pattern shatters; the pill produces perception-*blunting* (the consumer cannot perceive qi at all for the duration, a dangerous state). (2) *Pearl-excess* — too much Water; the Metal intent is over-stabilized; the perception sharpens but slows (the consumer perceives everything clearly but cannot react — a frozen clarity). (3) *Contamination* — the alchemist refining while fearful produces a pill that transmits the fear as a perception-tint (the consumer perceives everything as vaguely threatening; mild paranoia for the duration).

### 3.8 Body-Tempering Pill (淬體丹) — Transformation — Earth-phase

Permanently strengthens the flesh. The protagonist encounters this pill as a future option after Foundation Establishment — the Cangwu Sect's alchemist offers it in trade for a favor.

- **Ingredients:** (1) hundred-year poria (Earth-phase); (2) the inner core of a mid-tier Earth-phase spirit beast (the pangolin-core, Earth-phase); (3) loess-earth (Earth-phase, refined — a specific clay from a Earth-phase spirit vein); (4) cinnabar trace (Fire-phase, refined; Fire generates Earth, providing the tempering impulse); (5) spirit-pearl trace (Water-phase, as phase-bridge).
- **Refinement process:** spirit-bronze furnace. Civil fire for twelve hours (Earth-extraction — the longest extraction of any common pill), martial fire for one hour (Fire-activation of the cinnabar), civil fire for twenty-four hours (congealing). The congealing intent is dense — the alchemist must hold a coherent Earth-with-Fire-secondary intent and encode the *tempering target* (skin, muscle, bone — different pills for different targets). Congealing as a dense brown pill. Cooling in a clay vessel for seven days.
- **Effect:** when consumed by a Foundation Establishment cultivator, permanently strengthens the encoded target (skin, muscle, or bone) by approximately 30%. Skin-tempering produces jade-tough skin; muscle-tempering produces denser, stronger muscle; bone-tempering produces unbreakable bones (within the Foundation Establishment envelope). Duration: the tempering occurs over three months; full effect at quarter-end. Side effects: the body's weight increases (~10% for muscle, ~5% for bone); mild Earth-excess lethargy during tempering.
- **Realm requirement:** Core Formation alchemist to refine; Foundation Establishment cultivator to consume.
- **Market value:** 150 spirit stones.
- **Failure modes:** (1) *Tempering-target mismatch* — the consumer's body-type is incompatible with the encoded target (a Fire-dominant cultivator consuming a bone-tempering pill: the Fire-phase imbalance conflicts with the Earth-phase tempering; the bone develops Earth-spurs that produce chronic pain). (2) *Over-tempering* — the tempering over-concentrates; the encoded target becomes *brittle* rather than tough (jade-skin that cracks rather than flexes; bone that shatters rather than bends). (3) *Beast-core contamination* — the pangolin-core's residue transmits as a brief Earth-phase 心魔 (the consumer feels burrowing-impulses, a desire to dig; ~1 day).

### 3.9 Core-Forming Pill (結丹丹) — Breakthrough — Metal-phase (with Earth and Water secondary)

Assists the Foundation Establishment → Core Formation breakthrough. The pill the protagonist will need eventually; it is rarely sold openly and never cheaply.

- **Ingredients:** (1) three-hundred-year spirit ginseng (Wood-phase, gathered at Spring Equinox — the Wood generates the Fire needed for the golden core's forge-fire); (2) refined cinnabar (Fire-phase); (3) stalactite powder (Metal-phase, gathered from a deep metal-phase vein — the Metal is the core's crystalline structure); (4) the inner core of a *peak-tier* Metal-phase spirit beast (the white-snake-core, the most expensive single ingredient in the Foundation Establishment→Core Formation supply chain); (5) spirit-pearl (Water-phase, gathered at Winter Solstice); (6) loess-earth (Earth-phase, refined, as the binding matrix).
- **Refinement process:** spirit-bronze furnace, with the alchemist in sustained Core Formation-level intent throughout (this is why a Foundation Establishment alchemist cannot refine it — the congealing requires Core Formation intent). Civil fire for twelve hours (Wood-extraction), martial fire for four hours (Fire-activation — the forge), civil fire for forty-eight hours (congealing — the longest congealing of any common pill). The alchemist must encode the *core-phase* (the cultivator's intended golden-core phase — most cultivators form a core of their dominant root-phase). Congealing as a small dense pill with a metallic sheen. Cooling in a silver box for seven days.
- **Effect:** when consumed by a Foundation Establishment cultivator at the peak (meridian-system fully developed, middle-dantian mature, heart-mind stable), produces a Core Formation breakthrough with approximately 50% success (the lower success rate reflects the harder breakthrough — per doc 27 §1.4, the Confrontation's surfacing material is denser at this station). Duration: the pill's effect is the breakthrough itself; residual qi-resources persist for ~30 days. Side effects (prepared cultivator): the strain of Core Formation is significant; the cultivator is bedridden for one to two weeks after. Side effects (unprepared cultivator): forced breakthrough, severe deviation, golden-core collapse, or death.
- **Realm requirement:** Core Formation alchemist to refine; Foundation Establishment cultivator at the peak to consume.
- **Market value:** 500 spirit stones at auction. Rarely sold through normal market channels; auctioned or traded between sects.
- **Failure modes:** (1) *Core-phase mismatch* — the pill encodes a core-phase different from the cultivator's dominant root; the consumer forms a *mixed-phase core* that is unstable and requires years of remedial practice (or, in severe cases, must be deliberately shattered and re-formed). (2) *Beast-core contamination* — the white-snake-core's residue is denser than mid-tier cores; the consumer perceives the snake's death for a full day, sometimes developing a snake-themed 心魔 (cold-bloodedness, a desire for dark places). (3) *Forge-fire failure* — the martial-fire step botched; the pill's Metal-phase does not crystallize; the consumer's breakthrough attempts to form a core from un-crystallized Metal and fails catastrophically (core-collapse; the cultivator reverts to Foundation Establishment with damage). (4) *Congealing failure* — the most costly single failure in the alchemist's trade; sixty hours of fire-control lost; the dross is toxic and must be buried deep (it contaminates groundwater if disposed of carelessly — a known environmental hazard).

---

## 4. The Alchemist's Economic Role

### 4.1 Per-pill economics at Qi Condensation

A Qi Condensation alchemist in the Cangli Riverlands region can refine the three Qi Condensation-class pills (Return-Qi, Trauma, Purification) and the basic Enhancement pills (Strength, Perception). The economics:

| Pill | Ingredients cost | Refinement time | Sale price | Profit/pill | Notes |
|---|---|---|---|---|---|
| Return-Qi Pill (50-yr) | 0.2 spirit stones | 4 hours | 0.5 | 0.3 | The volume product |
| Trauma Pill | 0.4 | 3.5 hours | 1.0 | 0.6 | Best margin per hour |
| Purification Pill | 0.8 | 4 hours | 2.0 | 1.2 | Higher ingredient risk |
| Strength Pill | 0.1 | 3 hours | 0.3 | 0.2 | Cheap, fast, low-margin |
| Perception Pill | 0.6 | 6 hours | 1.5 | 0.9 | Slower refinement |

**Expected daily profit.** A Qi Condensation alchemist refining in a clay furnace, working an eight-hour day and accounting for a 30% failure rate (§4.3 below), produces approximately 1.5 pills per day. Average profit per successful pill: ~0.7 spirit stones. Net daily profit: ~1.0 spirit stones. Monthly (26 working days): ~26 spirit stones. This is within the 10–50 spirit stones/month range for Qi Condensation income (per doc 18 §5.2 and doc 24 §3.1's corrected rate), at the lower-middle end.

### 4.2 Time per batch

Refinement times above are per-pill. A *batch* (the furnace's full capacity, typically 4–6 pills for a clay furnace, 8–12 for an iron furnace, 20+ for a spirit-bronze furnace) takes the same refinement time as a single pill — the alchemist's fire-control and intent are applied to the batch, not per-pill. A Qi Condensation alchemist's batch is 4 pills in a clay furnace, 4 hours. Effective per-pill time: 1 hour. The bottleneck is ingredient-gathering and preparation, which is per-pill.

A Foundation Establishment alchemist refining Foundation Pills in a spirit-bronze furnace produces a batch of 4–6 pills per 19-hour refinement (per §3.4). Effective per-pill time: ~3.5 hours, plus the day-long cooling. A single batch of 5 Foundation Pills, at 50 spirit stones each, grosses 250 spirit stones; net of ingredients (~100 spirit stones for five sets of hundred-year ginseng and beast-cores), the alchemist clears ~150 spirit stones per batch — two months of Qi Condensation-hunting income in a single batch.

### 4.3 Failure rate at each realm

Failure rates are deterministic given the inputs (ingredient quality, alchemist state, furnace quality, fire-control discipline). The figures below are the typical rates for an alchemist of average discipline working with average ingredients:

| Alchemist realm | Pill class | Typical failure rate | Severe failure rate |
|---|---|---|---|
| Qi Condensation | Healing (Return-Qi, Trauma, Purification) | 25–35% | 2% (toxic pill) |
| Qi Condensation | Enhancement (Strength, Perception) | 30–40% | 3% |
| Foundation Establishment | Healing | 10–15% | 1% |
| Foundation Establishment | Breakthrough (Foundation Pill) | 20–25% | 5% (forced-breakthrough pill; the most dangerous failure) |
| Core Formation | Transformation (Root-Developing, Body-Tempering) | 15–20% | 4% (wrong-phase encoding; permanent consumer injury) |
| Core Formation | Breakthrough (Core-Forming Pill) | 30–40% | 10% (the most dangerous refinement in regular trade) |

The Qi Condensation alchemist's failure rate is the central economic fact of low-realm alchemy: one in three pills fails. The alchemist who cannot source good ingredients or whose heart-mind is unstable sees failure rates climb to 50%. The alchemist who can source good ingredients and who maintains discipline (the Cangwu Sect's alchemist, §4.5) sees failure rates fall to 15–20%.

### 4.4 Comparison to hunting

Hunting (per doc 18 §3.2) is the alternative Qi Condensation income. A Qi Condensation hunter in the Cangwu foothills earns 10–30 spirit stones per month (low-tier beasts, modest spirit-vein subsidy), with significant risk (mid-tier beasts kill careless Qi Condensation hunters; the death rate is approximately 5% per year for active hunters).

The comparison:

| Activity | Monthly income | Risk | Skill ceiling | Capital required |
|---|---|---|---|---|
| Qi Condensation hunting | 10–30 spirit stones | 5% annual death rate | Combat skill | A weapon and courage |
| Qi Condensation alchemy | 15–35 spirit stones | 2% toxic-pill injury rate | Refinement skill, ingredient-sourcing | A furnace (~20–50 stones), initial ingredient stock (~10 stones) |

Alchemy is the higher-income, lower-risk, higher-skill, higher-capital path. A Qi Condensation cultivator who can raise the furnace capital and find a teacher (the bottleneck — alchemy is not self-taught; the fire-control discipline requires transmission) becomes an alchemist. A Qi Condensation cultivator who cannot, hunts.

The Cangwu Sect's outer disciples typically hunt; the Cangwu Sect's one Qi Condensation alchemist (§4.5) is the sect's economic backbone. The Azure Sword Sect's outer disciples hunt; the Azure Sword Sect's alchemy hall (with two Foundation Establishment alchemists and one Core Formation alchemist) is the sect's economic backbone.

### 4.5 Named alchemists in the region

**Apothecary Qin (秦藥師, 47, peak Qi Condensation)** — the Cangwu Sect's alchemist. A former outer disciple of the Azure Sword Sect who washed out at the Foundation Establishment breakthrough (her meridian-system was insufficiently integrated; the rite reverted her with damage). She returned to the Cangwu Sect (her home sect) and apprenticed under the previous alchemist, taking over the pill hall at 35. She refines the Qi Condensation-class pills for the sect's thirty disciples and sells surplus at the Qingzhou Prefectural Seat's cultivation market. Her refinement skill is above-average (15–20% failure rate on healing pills); her Foundation Pill attempts (the sect occasionally commissions one) fail ~30% of the time, and she refuses to refine them without sect-master approval. She is the closest alchemist to the protagonist's starting village — a two-day walk to the Cangwu Sect compound.

**Elder Lian (連長老, 290, Foundation Establishment, mid-stage)** — the Azure Sword Sect's pill hall head. A methodical, conservative alchemist whose failure rate on Foundation Pills (15%) is the best in the region. She refines the sect's Foundation Pills and the higher-tier healing pills; she does not refine transformation pills (Core Formation minimum; she refers those commissions to the Core Formation alchemist below). She is wealthy by regional standards (the pill hall head's income is approximately 200 spirit stones per month) and is the sect's most politically powerful elder after the sect master and the peak masters. She does not sell to outsiders except by sect-master approval; the protagonist, if they reach Foundation Establishment and join the Azure Sword Sect, may study under her.

**Patriarch Mu (穆老人, 480, Core Formation, early-stage)** — the Azure Sword Sect's transformation-pill alchemist. A reclusive figure who refines Root-Developing and Body-Tempering pills for the sect's inner disciples and (rarely, at auction) for outsiders. He refines perhaps one batch per month (each batch is 2–3 transformation pills); his failure rate on transformation pills is 12% (excellent for the class). He is the region's only Core Formation alchemist; the Jade Void Holy Land's Core Formation alchemists (far away, on another continent) are the next tier up. He is the alchemist the protagonist will, in the late game, need to find — the Core-Forming Pill (§3.9) is refined by Core Formation alchemists, and Patriarch Mu is the only one in reach.

**Old Chen (陳老, 82, peak Qi Condensation)** — the hermit on the hill above Li Family Creek (per doc 24 §4.3 and doc 28 §3.5). Old Chen is *not* a licensed alchemist; he is a retired roaming cultivator with enough alchemy to refine Return-Qi and Trauma pills for his own use and (occasionally) for the protagonist during the protagonist's Qi Condensation years. His failure rate is high (~40% — he is out of practice and his furnace is a battered clay relic). He does not sell; he is not in the alchemist's trade. He is, however, the protagonist's first alchemy teacher — the protagonist learns the basics of fire-control and ingredient-preparation from him, in the four years between doc 06 Scene 2 and Scene 4.

---

## 5. Doctrine compliance

- **Build the engine, not just the brake.** Every formation, talisman, and pill below specifies not only its failure modes but its positive capability — what it does, when it does it, who can make it, who can use it. The brake is named only in service of the engine.
- **Make decisions; do not defer.** Six formations, ten talismans, nine pills are committed. The recipes, patterns, and layouts are concrete enough that a programmer could implement them and a writer could place them in fiction.
- **Confront the central tension directly.** The power-multiplication-at-a-price resolution (doc 16 §6) is honored: every entry above-realm effect requires an above-realm inscriber or alchemist; every below-realm consumer of an above-realm craft pays in scarcity (the Foundation Pill costs a year's income) and risk (the wrong-phase encoding permanently injures).
- **Determinism contract.** Every entry is reproducible: same inputs (named ingredients, named medium, named inscriber realm, named fire-control profile) produce same outputs. The variation lives in the inputs (the fifty-year ginseng vs. the hundred-year; the rested alchemist vs. the angry one), not in the process.
- **Phase-compatibility (doc 16 Appendix B).** Every recipe obeys the generation-and-conquest cycles. The Foundation Pill's Wood-Water-Fire combination (doc 16 §5.3) is honored exactly; the Root-Developing Pill's Earth-Metal-Water-Fire combination resolves lawfully (Metal generates Water, Fire generates Earth, Water is the bridge, Earth is the intent). Yin-yang signatures resolve coherently in every entry.
- **Currency consistency (doc 24 §3.1).** All spirit-stone values are within the 10–50 taels/stone corrected rate. The Foundation Pill at 50 spirit stones is approximately 500–2500 taels — a Qi Condensation cultivator's annual income, as doc 16 §4.3 requires.
- **Terminology (doc 16 §0).** English primary, Hanzi in parentheses on first use. No pinyin with tone marks.

---

## 6. What this document enables

- The generator can produce named craft goods in the world's markets, sect treasuries, and NPC inventories, with reproducible properties.
- The writer can place any of these formations, talismans, or pills in fiction knowing exactly what it does, what it costs, and how it fails.
- The player encounters the Hidden-Stone Cache Lock (§1.1) in doc 28's Cangwu foothills event; the Detection Talisman (§2.8) and Wound-Sealing Talisman (§2.9) in the golden scenes; the Foundation Pill (§3.4) at their own breakthrough.
- The progression economy is concrete: a Qi Condensation cultivator earns 15–35 spirit stones per month as an alchemist (§4.4); a Foundation Pill costs 50; the path from Qi Condensation to Foundation Establishment requires either a year of alchemy or a year of hunting, plus the breakthrough preparation.
- The named alchemists (§4.5) are NPCs with skills, failure rates, and economic roles — the protagonist's first alchemy teacher (Old Chen), the regional Qi Condensation alchemist (Apothecary Qin), the Azure Sword Sect's pill hall (Elder Lian and Patriarch Mu).

The next document (36, TBD) will specify the named spirit herbs, beasts, and minerals referenced in this catalog's ingredient lists — the catalog of inputs that the determinism contract operates on.
