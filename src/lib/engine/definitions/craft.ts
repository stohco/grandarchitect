/**
 * Craft Content Catalog — canonical named craft goods.
 *
 * Extracted from corpus-extension/35_CRAFT_CONTENT_CATALOG.md (the committed
 * catalog: 6 formations, 10 talismans, 9 pills), supplemented only by items
 * NAMED in corpus-extension/16_FORMATIONS_TALISMANS_ALCHEMY.md (class-level
 * mentions without catalog stats are marked thin in their descriptions).
 * No items are invented; no numbers are fabricated.
 */

import type { Definition } from '../definitions';

export const CRAFT_DEFINITIONS: Definition[] = [
  // ============================================================
  // FORMATIONS (doc 35 §1.1–§1.6)
  // ============================================================
  {
    id: "formation.hidden_stone_cache_lock",
    kind: "formation",
    name: "Hidden-Stone Cache Lock",
    nameHanzi: "隱石藏鎖",
    tags: ["defensive_ward","earth_phase","metal_secondary","hexagonal","persistent","cache"],
    description: "Earth-phase defensive ward (Metal secondary) sealing the Cangwu foothills cache that Old Chen collapsed forty years ago. Seven nodes: six river-stone discs (Earth, yin-stable) in a hexagon of three-pace radius around one jade plate core (Earth with Metal secondary). Two-clause core: ward (admit only the inscriber's qi-signature) and sustain (drain an intruder's qi at about one-tenth of a Qi Condensation reservoir per hour). All qi below Core Formation intensity rejected within the three-pace boundary. Duration indefinite, sustained by a spirit-vein trace in the foothill bedrock; persists centuries. Original inscriber was a Core Formation wandering cultivator of the late previous dynasty; the cache held three talismans, two pill-gourds, and a hand-copied manual. Failure modes: vein exhaustion (ward falls to Qi Condensation strength, drain reverses); intruder drain overdose (anchor destabilizes past ~12 hours, bardo-onset past ~36 hours); jade-plate fracture (ward becomes a killing array draining all qi).",
    source: "doc 35 §1.1",
    relations: [
      { type: "REQUIRES", target: "realm.core_formation", note: "inscriber realm" },
      { type: "PHASE", target: "essence.earth" },
      { type: "SECONDARY_PHASE", target: "essence.metal" }
    ],
    simulationHooks: ["combat","perception","deviation","history","cultivation"],
    version: "0.1.0"
  },
  {
    id: "formation.three_jade_heart_ward",
    kind: "formation",
    name: "Three-Jade Heart Ward",
    nameHanzi: "三玉心陣",
    tags: ["defensive_ward","earth_phase","metal_secondary","three_node","simplest"],
    description: "Three-node Earth-phase ward (Metal secondary), the simplest formation a Foundation Establishment inscriber can produce and the protagonist's first Foundation Establishment inscription at Old Chen's hermitage after the breakthrough (doc 06 Scene 5). Three fist-sized jade plates with a simple ward-rune, invested Earth-phase yin-stable, set as an equilateral triangle two paces to a side; lines flow clockwise. Single-clause core: exclude hostile qi below Core Formation intensity from the boundary (approximately 1.7 square paces). Does not affect physical objects — a sword can pass through; only qi-attacks, hostile inscription, and contaminating ambient qi are excluded. Duration approximately twenty years without re-investment in a balanced qi-climate; costs the inscriber one reservoir-pulse at activation, none thereafter. Failure modes: collinear drift (node shift admits in the drift direction); Earth-Wood contamination near living tree roots (ward weakens within months); central occupancy (a second person at the centroid is excluded, sometimes painfully).",
    source: "doc 35 §1.2",
    relations: [
      { type: "REQUIRES", target: "realm.foundation_establishment", note: "inscriber minimum" },
      { type: "PHASE", target: "essence.earth" },
      { type: "SECONDARY_PHASE", target: "essence.metal" }
    ],
    simulationHooks: ["combat","perception","deviation","cultivation"],
    version: "0.1.0"
  },
  {
    id: "formation.azure_sword_heaven_severing_boundary",
    kind: "formation",
    name: "Azure-Sword Heaven-Severing Boundary",
    nameHanzi: "碧劍裂天界陣",
    tags: ["defensive_barrier","alarm","metal_phase","water_secondary","grotto_heaven","36_nodes"],
    description: "Metal-phase (Water secondary) augmentation of the Azure Sword Sect's grotto-heaven natural boundary, inscribed by the sect's second Core Formation sect master two centuries ago. Thirty-six jade discs (child's-palm size, sword-rune cutting intent) at three-pace intervals along the boundary edge. Lines trace a non-crossing double helix: outer Metal-phase current clockwise (cutting, yang), inner Water-phase counter-clockwise (perception, yin). Three clauses: alarm (unregistered crossing pulses the sect master's awareness), transit-permit (disciples registered at Foundation Establishment oath-swearing pass freely), killing reflex (unregistered being above Qi Condensation triggers one Metal-phase cutting discharge of Foundation Establishment intensity — delays a Core Formation intruder, severs a Qi Condensation one). Volume is the entire grotto-heaven interior (10–1000 square kilometers); indefinite, sustained by interior qi 10–100x mortal ambient. Failure modes: line-crossing (discharge inverts against disciples), signature-spoofing (Nascent Soul copies a registered signature), boundary-law conflict (gaps open), sect-master death (alarm loses its receiver).",
    source: "doc 35 §1.3",
    relations: [
      { type: "REQUIRES", target: "realm.core_formation", note: "inscriber realm" },
      { type: "PHASE", target: "essence.metal" },
      { type: "SECONDARY_PHASE", target: "essence.water" }
    ],
    simulationHooks: ["combat","perception","politics","history"],
    version: "0.1.0"
  },
  {
    id: "formation.five_phase_spirit_gathering",
    kind: "formation",
    name: "Five-Phase Spirit-Gathering Array",
    nameHanzi: "五行聚靈陣",
    tags: ["utility","gathering","all_five_phases","pentagonal","cultivation_chamber"],
    description: "The standard gathering array, foundation of every sect's cultivation chamber (doc 16 §2.4). Five nodes, one per phase — Wood (jade), Fire (iron), Earth (river-stone), Metal (silver disc), Water (pearl) — set in a regular pentagon; lines trace a five-pointed star following the generation cycle (Wood→Fire→Earth→Metal→Water→Wood). Single intent: draw ambient qi into the interior at five-phase balance, phase-separated and re-radiated at higher density. Interior (~2 square paces personal; larger chamber arrays): ambient qi density 3–10x surroundings, reservoir gain 3–10x normal. Produces qi rather than consuming it once active. Duration indefinite in a balanced climate, weeks to months in a qi-poor region. Foundation Establishment minimum for a personal array; Core Formation for a chamber array. The Azure Sword Sect runs a high-quality version; the Cangwu Sect's single chamber runs a degraded version with three nodes missing. Failure modes: phase-imbalance (skewed qi deviates the practitioner), conquest-crossing (array quenches qi), over-gathering (reservoir over-pressurization, doc 27 §4.2).",
    source: "doc 35 §1.4",
    relations: [
      { type: "REQUIRES", target: "realm.foundation_establishment", note: "personal array minimum" },
      { type: "PHASE", target: "essence.wood" },
      { type: "PHASE", target: "essence.fire" },
      { type: "PHASE", target: "essence.earth" },
      { type: "PHASE", target: "essence.metal" },
      { type: "PHASE", target: "essence.water" }
    ],
    simulationHooks: ["cultivation","economy","deviation"],
    version: "0.1.0"
  },
  {
    id: "formation.lotus_petal_killing_array",
    kind: "formation",
    name: "Lotus-Petal Killing Array",
    nameHanzi: "蓮瓣殺陣",
    tags: ["offensive","killing_array","fire_phase","metal_secondary","concentric_hexagons"],
    description: "Core Formation killing array inscribed around treasuries and contested grotto-heaven anchors; the Azure Sword Sect inscribes a variant around its scripture pavilion. Twelve iron discs (Fire-phase, yang-sharp) in two concentric hexagons (outer six-pace radius, inner three-pace). Twelve curving petals: Fire-phase qi-currents sharpening to Metal-phase edges at the inner terminus. Conditional core: on intrusion into the outer hexagon, discharge the nearest petal as a Fire-phase cutting burst toward the center, repeating each step; the intruder is destroyed at the inner hexagon's center. Within the outer hexagon (~113 square paces) an unregistered intrusion triggers a Core Formation intensity discharge: a Qi Condensation intruder is destroyed in one discharge, a Foundation Establishment intruder survives three or four, a Core Formation intruder can dismantle one petal-node and break the loop. Duration indefinite in a qi-rich environment, days in a qi-poor one; each discharge draws ambient qi equivalent to one Foundation Establishment reservoir-pulse. Core Formation minimum (conditional core). Failure modes: petals crossed (discharges inward at activation), qi-famine (fires once or twice then dormant), core contamination (angry investment makes targeting indiscriminate).",
    source: "doc 35 §1.5",
    relations: [
      { type: "REQUIRES", target: "realm.core_formation", note: "inscriber minimum" },
      { type: "PHASE", target: "essence.fire" },
      { type: "SECONDARY_PHASE", target: "essence.metal" }
    ],
    simulationHooks: ["combat","deviation","perception"],
    version: "0.1.0"
  },
  {
    id: "formation.paired_mirror_gate",
    kind: "formation",
    name: "Paired Mirror Gate",
    nameHanzi: "雙鏡門陣",
    tags: ["transport","gate","water_phase","paired","spatial"],
    description: "The simplest transport formation: a paired gate linking two inscribed locations for direct transit; the Azure Sword Sect maintains one pair linking the sect compound to the grotto-heaven's anchor cave, its most carefully guarded asset. Eight nodes per gate (sixteen per pair): six pearl nodes (Water-phase, yin-flowing) form the hexagonal perimeter, two jade nodes (Earth-phase) anchor the spatial coordinate. Two hexagonal gates, each three paces across; each core encodes the other gate's spatial coordinate as its destination. Core logic: on activation by a registered qi-signature, fold the interior of this gate onto the paired gate's interior for one breath — anything within transits. One transit per activation; ~one minute cooldown. Each transit consumes ambient qi equivalent to one Foundation Establishment reservoir-pulse from the originating gate. Core Formation minimum (spatial-coordinate encoding requires law-perception); both gates must be inscribed by the same inscriber or synchronized core-intents. Failure modes: coordinate drift (lands in the wrong place, sometimes inside rock), pairing-decoherence (spatial tear injures traveler and gate), simultaneous activation (one user shredded), phase-contamination of the link (Fire-phase source makes transit unreliable).",
    source: "doc 35 §1.6",
    relations: [
      { type: "REQUIRES", target: "realm.core_formation", note: "inscriber minimum" },
      { type: "PHASE", target: "essence.water" },
      { type: "SECONDARY_PHASE", target: "essence.earth" }
    ],
    simulationHooks: ["physics","perception","migration"],
    version: "0.1.0"
  },

  // ============================================================
  // TALISMANS (doc 35 §2.1–§2.10)
  // ============================================================
  {
    id: "talisman.fireball",
    kind: "talisman",
    name: "Fireball Talisman",
    nameHanzi: "火球符",
    tags: ["attack","fire_phase","yang","paper_medium","single_use"],
    description: "Fire-phase attack talisman. Medium: standard yellow talisman paper (alum-and-beeswax treated). Ink: cinnabar (Fire-phase, yang). Pattern: the fire character (火) in three strokes, central stroke elongated upward, plus four ancillary runes (range, direction, intensity, trigger). Effect: fireball of intensity scaled to the inscriber's realm — Qi Condensation inscription ~10 paces fixed direction; Foundation Establishment inscription ~30 paces. Ignites combustibles; does not discriminate friend from foe. Activation cost: one-tenth of a Qi Condensation reservoir (one-twentieth of a Foundation Establishment reservoir). Market value: 0.5 spirit stones (Qi Condensation); 2 (Foundation Establishment). Failure modes: 敗符 flawed pattern (detonates at the user's hand), 逆符 incompatible activation (Water-phase user quenches it to a spark), 潰符 seal collapse (omnidirectional burst).",
    source: "doc 35 §2.1",
    relations: [
      { type: "REQUIRES", target: "realm.qi_condensation", note: "inscriber minimum" },
      { type: "PHASE", target: "essence.fire" }
    ],
    simulationHooks: ["combat","economy","deviation"],
    version: "0.1.0"
  },
  {
    id: "talisman.ice_arrow",
    kind: "talisman",
    name: "Ice-Arrow Talisman",
    nameHanzi: "冰箭符",
    tags: ["attack","water_phase","yin","paper_medium","target_lock"],
    description: "Water-phase (yin) attack talisman. Medium: yellow paper treated with pine-resin. Ink: pine-soot (Water-phase, yin). Pattern: the water character (水) with central stroke sharpened to an arrowhead, plus three runes (range, target-lock, trigger). Effect: a single ice-arrow scaled to the inscriber's realm — ~20 paces at Qi Condensation; pierces rather than ignites; the target-lock rune curves the arrow up to 30 degrees toward the chosen target's qi-signature. Activation cost: one-eighth of a Qi Condensation reservoir. Market value: 0.7 spirit stones (Qi Condensation); 3 (Foundation Establishment with target-lock). Failure modes: 敗符 (arrow shatters, spraying shards across the user's forearm), target-lock bleed (locks onto the user's own signature), 逆符 (Fire-phase user melts it to a harmless splash).",
    source: "doc 35 §2.2",
    relations: [
      { type: "REQUIRES", target: "realm.qi_condensation", note: "inscriber minimum" },
      { type: "PHASE", target: "essence.water" }
    ],
    simulationHooks: ["combat","economy","perception","deviation"],
    version: "0.1.0"
  },
  {
    id: "talisman.shield",
    kind: "talisman",
    name: "Shield Talisman",
    nameHanzi: "盾符",
    tags: ["defense","earth_phase","paper_medium","single_use"],
    description: "Earth-phase defense talisman. Medium: yellow paper treated with clay-slurry. Ink: iron-gall (Metal-phase, compatible with Earth by the generation cycle). Pattern: the mountain character (山) with three peaks plus a hexagonal boundary-rune; no ancillary runes — parameters fixed. Effect: projects a hexagonal qi-barrier approximately one pace across, oriented between the user and the last-perceived threat; absorbs one attack of up to Foundation Establishment intensity (Qi Condensation inscription) or one Core Formation intensity attack (Foundation Establishment inscription), then collapses; holds up to ten breaths if not struck. Activation cost: one-fifth of a Qi Condensation reservoir. Market value: 0.8 spirit stones (Qi Condensation); 3 (Foundation Establishment). Failure modes: 敗符 (barrier forms with a gap), orientation-flaw (barrier faces the wrong way), 耗符 degraded medium (holds only one or two breaths after damp storage).",
    source: "doc 35 §2.3",
    relations: [
      { type: "REQUIRES", target: "realm.qi_condensation", note: "inscriber minimum" },
      { type: "PHASE", target: "essence.earth" }
    ],
    simulationHooks: ["combat","economy","deviation"],
    version: "0.1.0"
  },
  {
    id: "talisman.communication",
    kind: "talisman",
    name: "Communication Talisman",
    nameHanzi: "傳音符",
    tags: ["utility","metal_phase","jade_medium","rechargeable","paired"],
    description: "Metal-phase utility talisman on a re-chargeable jade slip (thumb-sized) — jade because it must be reused (doc 16 §3.5). Ink: iron-gall (Metal-phase). Pattern: the word character (言) in three strokes plus two runes: destination (inscribed at crafting with the recipient's qi-signature — the inscriber needs a sample of the recipient's qi) and duration. Effect: user speaks a message of up to one hundred breaths into the slip; it transits along the Metal-phase link to the paired slip, plays once, and is erased; the slip is then re-chargeable. Activation cost: one-tenth of a Qi Condensation reservoir per message. Market value: 5 spirit stones per paired set (two slips); recharging free. Failure modes: destination-slip lost (out of ~100 li range for a Foundation Establishment inscription, the message dissipates), qi-signature drift (message bounces back), eavesdropping (a Core Formation cultivator can intercept — not private above Foundation Establishment).",
    source: "doc 35 §2.4",
    relations: [
      { type: "REQUIRES", target: "realm.foundation_establishment", note: "complex pattern" },
      { type: "PHASE", target: "essence.metal" }
    ],
    simulationHooks: ["social","economy","perception","trade"],
    version: "0.1.0"
  },
  {
    id: "talisman.storage",
    kind: "talisman",
    name: "Storage Talisman",
    nameHanzi: "儲物符",
    tags: ["utility","earth_phase","metal_secondary","jade_medium","spatial_pocket","complex"],
    description: "Earth-phase (Metal secondary) utility talisman on a jade plaque the size of a child's palm, three-tenths of an inch thick. Ink: cinnabar blended with iron-filings (Fire-Metal blend, Earth-compatible). Pattern: the vessel character (器), four squares in a larger square, plus eight ancillary runes encoding the pocket's coordinates, volume, access-trigger, and ward — the most complex Foundation Establishment inscription. Effect: opens a spatial pocket of approximately one cubic pace; contents hold indefinitely while sealed and weigh nothing in the hand. Activation cost: one full Qi Condensation reservoir to open or close; negligible to withdraw a small item. Market value: 20 spirit stones (Foundation Establishment) — the most expensive common talisman; the precursor to a storage ring (a Core Formation artifact). Failure modes: spatial-coordinate corruption (objects lost in folded space), over-loading (exceeding volume by ~10% collapses the fold, ejecting contents), ward-bypass (a Core Formation cultivator can crack the ward and read the contents).",
    source: "doc 35 §2.5",
    relations: [
      { type: "REQUIRES", target: "realm.foundation_establishment", note: "inscriber minimum" },
      { type: "PRECURSOR_TO", target: "treasure.storage_ring" },
      { type: "PHASE", target: "essence.earth" },
      { type: "SECONDARY_PHASE", target: "essence.metal" }
    ],
    simulationHooks: ["save","economy","physics","trade"],
    version: "0.1.0"
  },
  {
    id: "talisman.light",
    kind: "talisman",
    name: "Light Talisman",
    nameHanzi: "光符",
    tags: ["utility","fire_phase","yang","paper_medium","simplest","first_learned"],
    description: "Fire-phase (yang) utility talisman — the first talisman a Qi Condensation inscriber learns (doc 16 §3.8). Medium: standard yellow paper. Ink: cinnabar. Pattern: a single central sigil, the sun character (日) in four strokes within a circle; no ancillary runes. Effect: steady lantern-equivalent illumination for approximately four hours (Qi Condensation inscription) or one day (Foundation Establishment); warm-toned. Activation cost: one-twentieth of a Qi Condensation reservoir. Market value: 0.1 spirit stones (Qi Condensation) — the cheapest talisman, sold in stacks of ten. Failure modes: 敗符 (flares once and burns out), 耗符 (long-stored talisman dims to a glow), reverse-flaw (emits darkness within three paces).",
    source: "doc 35 §2.6",
    relations: [
      { type: "REQUIRES", target: "realm.qi_condensation", note: "inscriber minimum" },
      { type: "PHASE", target: "essence.fire" }
    ],
    simulationHooks: ["rendering","economy","deviation"],
    version: "0.1.0"
  },
  {
    id: "talisman.concealment",
    kind: "talisman",
    name: "Concealment Talisman",
    nameHanzi: "隱形符",
    tags: ["utility","water_phase","yin","paper_medium","stealth"],
    description: "Water-phase (yin) utility talisman. Medium: yellow paper treated with pine-resin. Ink: pine-soot. Pattern: the hidden character (隱) in fourteen strokes — the most complex Qi Condensation pattern — plus three runes (radius, duration, qi-suppression). Effect: conceals the user's qi-signature and physical form for the duration: Qi Condensation inscription — radius two paces, one hour, conceals from Qi Condensation perception; Foundation Establishment inscription — radius five paces, four hours, conceals from Foundation Establishment perception (a Core Formation perceiver sees through it). Activation cost: one-quarter of a Qi Condensation reservoir. Market value: 1 spirit stone (Qi Condensation); 5 (Foundation Establishment). Failure modes: 敗符 (patchy concealment), qi-surge bleed (aggressive qi use ruptures the concealment, making the user more visible), 逆符 (Fire-phase user is quenched; the user's qi-signature flares).",
    source: "doc 35 §2.7",
    relations: [
      { type: "REQUIRES", target: "realm.qi_condensation", note: "inscriber minimum" },
      { type: "PHASE", target: "essence.water" }
    ],
    simulationHooks: ["perception","combat","economy","deviation"],
    version: "0.1.0"
  },
  {
    id: "talisman.detection",
    kind: "talisman",
    name: "Detection Talisman",
    nameHanzi: "探符",
    tags: ["utility","metal_phase","jade_medium","rechargeable","perception"],
    description: "Metal-phase utility talisman on a re-chargeable jade slip (three uses per recharge). Ink: iron-gall with a trace of silver-filings (Earth-secondary, for stability). Pattern: the seek character (尋) in twelve strokes plus four runes (depth, phase-filter, sensitivity, trigger). Effect: a one-breath perception-flash of all qi-sources in range matching the phase-filter; Foundation Establishment inscription: range 50 paces, sensitivity down to one-tenth of a Qi Condensation reservoir. Activation cost: one-third of a Qi Condensation reservoir. Market value: 4 spirit stones (Foundation Establishment). Old Chen gives the protagonist one of his few remaining Foundation Establishment-grade detection talismans to perceive Erniu's qi-trace inside the sealed Cangwu cache before deciding whether to attempt entry (doc 28 §2.2). Failure modes: 敗符 (fragmented flash), phase-filter bleed (perception overload, doc 27 §4.4), sensitivity-burnout (jade pattern destroyed in a qi-rich environment).",
    source: "doc 35 §2.8",
    relations: [
      { type: "REQUIRES", target: "realm.foundation_establishment", note: "inscriber grade" },
      { type: "PHASE", target: "essence.metal" }
    ],
    simulationHooks: ["perception","economy","cultivation"],
    version: "0.1.0"
  },
  {
    id: "talisman.wound_sealing",
    kind: "talisman",
    name: "Wound-Sealing Talisman",
    nameHanzi: "止創符",
    tags: ["defense","utility","wood_phase","paper_medium","healing"],
    description: "Wood-phase defense/utility talisman — the talisman Old Chen presses to the protagonist's chest to halt internal bleeding after the failed breakthrough (doc 06 Scene 4). Medium: yellow paper treated with herbal-infusion (Wood-compatible). Ink: wood-sap from the Cangwu foothills' old-growth spirit pines (Wood-phase, yin-restoring). Pattern: the seal character (封) in nine strokes plus two runes (target-area, duration). Effect: on contact with the wounded body, seals internal bleeding and reduces meridian-inflammation by half for the duration: Qi Condensation inscription holds two hours, Foundation Establishment twelve. Activation cost: one-fifth of a Qi Condensation reservoir (Old Chen pays; the recipient does not). Market value: 1.5 spirit stones (Qi Condensation); 6 (Foundation Establishment). Failure modes: 敗符 (seal incomplete), Wood-Metal contamination (consumed without effect on Metal-phase-inflamed meridians), late application (past ~30 minutes the seal produces meridian-cramping).",
    source: "doc 35 §2.9",
    relations: [
      { type: "REQUIRES", target: "realm.qi_condensation", note: "inscriber minimum" },
      { type: "PHASE", target: "essence.wood" }
    ],
    simulationHooks: ["cultivation","disease","economy","deviation"],
    version: "0.1.0"
  },
  {
    id: "talisman.sword_qi",
    kind: "talisman",
    name: "Sword-Qi Talisman",
    nameHanzi: "劍氣符",
    tags: ["attack","metal_phase","yang","paper_medium","foundation_establishment"],
    description: "Metal-phase (yang-sharp) Foundation Establishment-class attack talisman — the ranged weapon of choice for sword-cultivators who cannot yet project sword-qi; the Azure Sword Sect's outer disciples buy these in stacks. Medium: yellow paper treated with iron-salt solution. Ink: iron-gall. Pattern: the sword character (劍) in fifteen strokes — the longest simple-attack sigil — plus three runes (range, cutting-depth, trigger); geometrically precise and unforgiving. Effect: a single Metal-phase sword-qi scaled to the inscriber's realm — ~40 paces (Foundation Establishment); cuts rather than burns; penetrates a Qi Condensation shield-talisman cleanly and wounds a Foundation Establishment cultivator through robes. Activation cost: one-quarter of a Foundation Establishment reservoir. Market value: 4 spirit stones; not available at Qi Condensation inscription. Failure modes: 敗符 (sword-qi curves in flight), trigger-bleed (spontaneous discharge near Metal-phase qi, e.g. a forge), cutting-depth flaw (cuts too deep or too shallow).",
    source: "doc 35 §2.10",
    relations: [
      { type: "REQUIRES", target: "realm.foundation_establishment", note: "inscriber minimum" },
      { type: "PHASE", target: "essence.metal" }
    ],
    simulationHooks: ["combat","economy","deviation"],
    version: "0.1.0"
  },

  // ------------------------------------------------------------
  // Talismans named only at class level in doc 16 §3.4 (thin)
  // ------------------------------------------------------------
  {
    id: "talisman.lightning",
    kind: "talisman",
    name: "Lightning Talisman",
    nameHanzi: "雷符",
    tags: ["attack","class_mention","thin"],
    description: "Named among attack talismans in doc 16 §3.4 (fireball 火球符, sword-qi 劍氣符, lightning 雷符, ice-arrow 冰箭符). No catalog stats are given; attack talismans are typically Fire-phase or Metal-phase, the phase choice being the damage type.",
    source: "doc 16 §3.4",
    relations: [
      { type: "PHASE", target: "essence.fire" },
      { type: "PHASE", target: "essence.metal" }
    ],
    simulationHooks: ["combat","economy"],
    version: "0.1.0"
  },
  {
    id: "talisman.ward",
    kind: "talisman",
    name: "Ward Talisman",
    nameHanzi: "護符",
    tags: ["defense","class_mention","thin"],
    description: "Named among defense talismans in doc 16 §3.4 (shield 盾符, ward 護符, barrier 隔符): a ward talisman creates a brief warded volume. No catalog stats are given; defense talismans are typically Earth-phase or Metal-phase.",
    source: "doc 16 §3.4",
    relations: [
      { type: "PHASE", target: "essence.earth" }
    ],
    simulationHooks: ["combat","economy"],
    version: "0.1.0"
  },
  {
    id: "talisman.barrier",
    kind: "talisman",
    name: "Barrier Talisman",
    nameHanzi: "隔符",
    tags: ["defense","class_mention","thin"],
    description: "Named among defense talismans in doc 16 §3.4 (shield 盾符, ward 護符, barrier 隔符): a barrier talisman seals a doorway or gap. No catalog stats are given; defense talismans are typically Earth-phase or Metal-phase.",
    source: "doc 16 §3.4",
    relations: [
      { type: "PHASE", target: "essence.earth" },
      { type: "PHASE", target: "essence.metal" }
    ],
    simulationHooks: ["combat","economy"],
    version: "0.1.0"
  },

  // ============================================================
  // PILLS (doc 35 §3.1–§3.9)
  // ============================================================
  {
    id: "pill.return_qi",
    kind: "pill",
    name: "Return-Qi Pill",
    nameHanzi: "回氣丹",
    tags: ["healing","wood_phase","water_secondary","qi_restoration","common"],
    description: "Wood-phase (Water secondary) healing pill — the most common pill in the cultivation world; restores a depleted reservoir. Ingredients: fifty-year spirit ginseng root (Wood, Spring Equinox), spirit-pearl powder (Water, Winter Solstice), dried lotus seed (Wood with Water-secondary, harvested at Clear and Bright 清明). Clay furnace, civil fire for four hours (pearl added at the second hour), cooling in a jade box. Effect: restores approximately one-third of a Qi Condensation reservoir over ten breaths; potency scales with ingredient age (hundred-year ginseng restores half; three-hundred-year two-thirds). Mild warmth in the lower dantian. Realm: Qi Condensation alchemist to refine, any realm to consume. Market value: 0.5 spirit stones (fifty-year ingredients); 2 (hundred-year); 8 (three-hundred-year). Failure modes: charred pill 火候失誤 (toxic, liver-qi inflammation), pearl-addition error (inert grey sphere), contamination 污丹 (transmits the alchemist's anger ~1 hour).",
    source: "doc 35 §3.1",
    relations: [
      { type: "REQUIRES", target: "realm.qi_condensation", note: "alchemist to refine" },
      { type: "PHASE", target: "essence.wood" },
      { type: "SECONDARY_PHASE", target: "essence.water" }
    ],
    simulationHooks: ["cultivation","economy","trade","deviation"],
    version: "0.1.0"
  },
  {
    id: "pill.trauma",
    kind: "pill",
    name: "Trauma Pill",
    nameHanzi: "療創丹",
    tags: ["healing","wood_phase","earth_secondary","tissue_healing"],
    description: "Wood-phase (Earth secondary) healing pill; accelerates wound-healing — heals tissue, not reservoir. Ingredients: thirty-year spirit notoginseng root (Wood, Earth-secondary), spirit-pearl powder (Water), poria fungus (Earth), dried sage leaf (Wood, gathered at Grain in Ear 芒種). Clay furnace: civil fire two hours, martial fire thirty minutes, civil fire one hour; cooling in a wooden box. Effect: accelerates wound-healing approximately 5x for six hours (a two-week sword-cut closes in two days). Does not regenerate severed tissue or cure qi-injury. Side effects: ravenous for a day; mild Earth-phase imbalance if overused. Realm: Qi Condensation alchemist, any realm to consume. Market value: 1 spirit stone. Failure modes: fire-transition error (bone-spurs at the wound site), Earth-excess (wound heals closed over foreign matter; infection), contamination (grief-flash to the consumer).",
    source: "doc 35 §3.2",
    relations: [
      { type: "REQUIRES", target: "realm.qi_condensation", note: "alchemist to refine" },
      { type: "PHASE", target: "essence.wood" },
      { type: "SECONDARY_PHASE", target: "essence.earth" }
    ],
    simulationHooks: ["cultivation","disease","economy","deviation"],
    version: "0.1.0"
  },
  {
    id: "pill.purification",
    kind: "pill",
    name: "Purification Pill",
    nameHanzi: "清污丹",
    tags: ["healing","water_phase","contamination","venting"],
    description: "Water-phase healing pill; vents accumulated contamination from the qi-system (doc 03 Station 3). Ingredients: spirit-pearl core (Water, Winter Solstice, peak yin), rehmannia root (Water, Frost's Descent 霜降), kelp-ash (Water with Earth-secondary), cinnabar trace (Fire, refined, as a phase-bridge — the dangerous ingredient). Iron furnace, civil fire four hours (cinnabar added at the third hour in a one-grain measure); cooling in porcelain. Effect: one-hour purification state venting through the skin (greyish, foul-smelling sweat); qi-system ~60% cleaner (Qi Condensation alchemist) to ~90% (Foundation Establishment). Side effects: exhaustion, dehydration. Realm: Qi Condensation alchemist; any realm to consume (a Qi Condensation consumer may faint). Market value: 2 spirit stones (Qi Condensation); 5 (Foundation Establishment). Failure modes: cinnabar excess (fire-deviation symptoms), congealing failure (toxic wet grey dross), over-purification (vents the consumer's own reservoir-qi).",
    source: "doc 35 §3.3",
    relations: [
      { type: "REQUIRES", target: "realm.qi_condensation", note: "alchemist to refine" },
      { type: "PHASE", target: "essence.water" }
    ],
    simulationHooks: ["deviation","disease","economy","cultivation"],
    version: "0.1.0"
  },
  {
    id: "pill.foundation",
    kind: "pill",
    name: "Foundation Pill",
    nameHanzi: "筑基丹",
    tags: ["breakthrough","wood_phase","water_secondary","fire_secondary","most_valuable_common"],
    description: "Wood-phase (Water and Fire secondary) breakthrough pill; assists the Qi Condensation → Foundation Establishment breakthrough; the most economically valuable pill a Foundation Establishment alchemist produces (doc 16 §4.3). Canonical recipe (doc 16 §5.3): hundred-year spirit ginseng (Wood, Spring Equinox), spirit-pearl (Water, Winter Solstice), refined cinnabar (Fire), and the inner core (內丹) of a mid-tier Wood-phase spirit beast. Spirit-bronze furnace (anything less produces contamination): civil fire six hours, martial fire one hour, civil fire twelve hours — the longest congealing of any common pill; cooling in a jade box one full day. Effect: ~70% breakthrough success for a prepared Qi Condensation peak cultivator (integrated meridians, sufficient reservoir, stable heart-mind, per doc 27 §1.4 Stage 1); does not force the breakthrough; residual qi-resources persist ~30 days. Unprepared consumption: forced breakthrough, deviation, foundation collapse, or death. Realm: Foundation Establishment alchemist; Qi Condensation peak cultivator to consume. Market value: 50 spirit stones — approximately a Qi Condensation cultivator's annual income. Failure modes: forced breakthrough (forced_attempt, Confrontation instability ×2.5, 心魔 onset likely), cinnabar-miscalibration (fire-deviation up to spontaneous combustion of the lower dantian), beast-core contamination (心魔 flash of the beast's last moments), congealing failure (toxic dross that must be buried, not sold).",
    source: "doc 35 §3.4",
    relations: [
      { type: "REQUIRES", target: "realm.foundation_establishment", note: "alchemist to refine" },
      { type: "REQUIRES", target: "realm.qi_condensation", note: "consumer at the peak" },
      { type: "PHASE", target: "essence.wood" },
      { type: "SECONDARY_PHASE", target: "essence.water" },
      { type: "SECONDARY_PHASE", target: "essence.fire" }
    ],
    simulationHooks: ["cultivation","economy","trade","deviation"],
    version: "0.1.0"
  },
  {
    id: "pill.root_developing",
    kind: "pill",
    name: "Root-Developing Pill",
    nameHanzi: "培根丹",
    tags: ["transformation","earth_phase","metal_secondary","spiritual_root","phase_specific"],
    description: "Earth-phase (Metal secondary) transformation pill (doc 27 §5, doc 16 §4.3); develops a phase-root the cultivator did not have — a controlled, costly medical procedure. Ingredients: hundred-year poria fungus (Earth, Beginning of Autumn 立秋), stalactite powder (Metal, from a metal-phase spirit vein), spirit-pearl trace (Water, phase-bridge), the inner core of a mid-tier Earth-phase spirit beast (badger-core), cinnabar trace (Fire). Spirit-bronze furnace: civil fire eight hours, martial fire two hours, civil fire sixteen hours; the alchemist must encode the specific phase of the root — a Wood-root pill is a different recipe than a Fire-root pill. Cooling in a clay vessel three days. Effect: consumed by a Foundation Establishment cultivator (Qi Condensation consumers cannot receive it), develops the encoded phase-root by approximately 0.3 in sensitivity and admission components (doc 27 §5.1); permanent; full effect at one month. Side effects: phase-balance shift; mild Earth-excess heaviness during the development month. Realm: Core Formation alchemist (doc 16 §4.6); Foundation Establishment consumer. Market value: 200 spirit stones — the most expensive consumable a Core Formation alchemist produces in regular trade. Failure modes: wrong-phase encoding (the consumer develops the wrong root), Earth-excess congealing (root develops too fast; meridian-inflammation or rupture), beast-core contamination (brief Earth-phase 心魔, ~1 hour), consumer-realm mismatch (root withers within months, leaving meridian-scarring).",
    source: "doc 35 §3.5",
    relations: [
      { type: "REQUIRES", target: "realm.core_formation", note: "alchemist minimum" },
      { type: "REQUIRES", target: "realm.foundation_establishment", note: "consumer" },
      { type: "PHASE", target: "essence.earth" },
      { type: "SECONDARY_PHASE", target: "essence.metal" }
    ],
    simulationHooks: ["cultivation","deviation","economy","trade"],
    version: "0.1.0"
  },
  {
    id: "pill.strength",
    kind: "pill",
    name: "Strength Pill",
    nameHanzi: "力丹",
    tags: ["enhancement","fire_phase","yang","combat","cheap"],
    description: "Fire-phase (yang) enhancement combat pill; briefly boosts physical strength. Ingredients: dried ginger root (Fire, Summer Solstice 夏至, peak yang), refined cinnabar (Fire), dried epimedium leaf (Fire with Wood-secondary, Grain in Ear). Clay furnace: martial fire one hour, civil fire two hours — three hours total; cooling in a wooden box. Effect: doubles the consumer's physical strength for ten minutes (Qi Condensation inscription) to thirty minutes (Foundation Establishment). Yang-aggressive boost; crash afterward (exhaustion, mild dehydration, ~2 hours); cumulative Fire-contamination with repeated use (pill addiction, doc 16 §4.3). Realm: Qi Condensation alchemist; any realm to consume. Market value: 0.3 spirit stones — cheap, sold in stacks to mercenary cultivators. Failure modes: over-fire (brief fire-deviation: heat-stroke, agitation, sometimes violence), Wood-secondary failure (weaker boost, twice the crash), contamination (amplifies the consumer's anger).",
    source: "doc 35 §3.6",
    relations: [
      { type: "REQUIRES", target: "realm.qi_condensation", note: "alchemist to refine" },
      { type: "PHASE", target: "essence.fire" }
    ],
    simulationHooks: ["combat","economy","deviation","trade"],
    version: "0.1.0"
  },
  {
    id: "pill.perception",
    kind: "pill",
    name: "Perception Pill",
    nameHanzi: "覺丹",
    tags: ["enhancement","metal_phase","perception","breakthrough_prep"],
    description: "Metal-phase enhancement pill; briefly sharpens perception; used before breakthrough attempts to deepen Threshold-stage coherence perception (doc 27 §1.4 Stage 2). Ingredients: stalactite powder (Metal), dried chrysanthemum flower (Metal with Wood-secondary, Frost's Descent 霜降), white ore (Metal, refined), spirit-pearl trace (Water, phase-bridge). Iron furnace: civil fire four hours, then civil fire two hours (Metal-perception patterns shatter under martial fire); cooling in a silver box. Effect: sharpens qi-, environmental-, and self-perception by approximately 50% for one hour (Qi Condensation) to three hours (Foundation Establishment). Side effects: perception-overload in qi-rich environments (doc 27 §4.4); mild headache. Realm: Qi Condensation alchemist; any realm to consume. Market value: 1.5 spirit stones. Failure modes: martial-fire exposure (perception-blunting), pearl-excess (frozen clarity — perceives but cannot react), contamination (paranoia tint for the duration).",
    source: "doc 35 §3.7",
    relations: [
      { type: "REQUIRES", target: "realm.qi_condensation", note: "alchemist to refine" },
      { type: "PHASE", target: "essence.metal" }
    ],
    simulationHooks: ["perception","cultivation","economy","deviation"],
    version: "0.1.0"
  },
  {
    id: "pill.body_tempering",
    kind: "pill",
    name: "Body-Tempering Pill",
    nameHanzi: "淬體丹",
    tags: ["transformation","earth_phase","permanent","body","expensive"],
    description: "Earth-phase transformation pill; permanently strengthens the flesh; the protagonist encounters it as a future option after Foundation Establishment — the Cangwu Sect's alchemist offers it in trade for a favor. Ingredients: hundred-year poria (Earth), the inner core of a mid-tier Earth-phase spirit beast (pangolin-core), loess-earth (Earth, refined, from an Earth-phase spirit vein), cinnabar trace (Fire), spirit-pearl trace (Water, phase-bridge). Spirit-bronze furnace: civil fire twelve hours (longest extraction of any common pill), martial fire one hour, civil fire twenty-four hours; the alchemist encodes the tempering target (skin, muscle, or bone — different pills). Cooling in a clay vessel seven days. Effect: Foundation Establishment consumer permanently strengthens the encoded target by approximately 30% (skin: jade-tough; muscle: denser; bone: unbreakable within the Foundation Establishment envelope); tempering occurs over three months. Side effects: weight increases (~10% muscle, ~5% bone); mild Earth-excess lethargy. Realm: Core Formation alchemist; Foundation Establishment consumer. Market value: 150 spirit stones. Failure modes: tempering-target mismatch (Earth-spurs, chronic pain), over-tempering (brittle rather than tough), beast-core contamination (burrowing impulses ~1 day).",
    source: "doc 35 §3.8",
    relations: [
      { type: "REQUIRES", target: "realm.core_formation", note: "alchemist to refine" },
      { type: "REQUIRES", target: "realm.foundation_establishment", note: "consumer" },
      { type: "PHASE", target: "essence.earth" }
    ],
    simulationHooks: ["cultivation","combat","economy","trade","deviation"],
    version: "0.1.0"
  },
  {
    id: "pill.core_forming",
    kind: "pill",
    name: "Core-Forming Pill",
    nameHanzi: "結丹丹",
    tags: ["breakthrough","metal_phase","earth_secondary","water_secondary","auction"],
    description: "Metal-phase (Earth and Water secondary) breakthrough pill; assists the Foundation Establishment → Core Formation breakthrough; rarely sold openly and never cheaply. Ingredients: three-hundred-year spirit ginseng (Wood, Spring Equinox), refined cinnabar (Fire), stalactite powder (Metal, from a deep metal-phase vein), the inner core of a peak-tier Metal-phase spirit beast (white-snake-core — the most expensive single ingredient in the Foundation Establishment→Core Formation supply chain), spirit-pearl (Water, Winter Solstice), loess-earth (Earth, binding matrix). Spirit-bronze furnace with sustained Core Formation-level intent throughout: civil fire twelve hours, martial fire four hours (the forge), civil fire forty-eight hours — the longest congealing of any common pill; the alchemist encodes the core-phase (usually the cultivator's dominant root-phase). Cooling in a silver box seven days. Effect: ~50% success for a Foundation Establishment peak cultivator; residual qi-resources ~30 days; prepared consumer bedridden one to two weeks after; unprepared consumption: forced breakthrough, severe deviation, golden-core collapse, or death. Realm: Core Formation alchemist; Foundation Establishment peak consumer. Market value: 500 spirit stones at auction. Failure modes: core-phase mismatch (unstable mixed-phase core), beast-core contamination (snake-themed 心魔 for a full day), forge-fire failure (core collapse; reverts to Foundation Establishment with damage), congealing failure (toxic dross that contaminates groundwater if not buried deep).",
    source: "doc 35 §3.9",
    relations: [
      { type: "REQUIRES", target: "realm.core_formation", note: "alchemist to refine" },
      { type: "REQUIRES", target: "realm.foundation_establishment", note: "consumer at the peak" },
      { type: "PHASE", target: "essence.metal" },
      { type: "SECONDARY_PHASE", target: "essence.earth" },
      { type: "SECONDARY_PHASE", target: "essence.water" }
    ],
    simulationHooks: ["cultivation","economy","trade","deviation"],
    version: "0.1.0"
  },

  // ------------------------------------------------------------
  // Pills named only at class level in doc 16 §4.3/§4.6 (thin)
  // ------------------------------------------------------------
  {
    id: "pill.speed",
    kind: "pill",
    name: "Speed Pill",
    nameHanzi: "速丹",
    tags: ["enhancement","class_mention","thin"],
    description: "Named among enhancement pills in doc 16 §4.3 (strength 力丹, speed 速丹, perception 覺丹, qi-capacity 氣丹): temporarily boosts a specific capability. Enhancement boosts are temporary — minutes to hours — with a real crash afterward (exhaustion, sometimes contamination by residue); repeated use produces cumulative contamination. No catalog stats are given.",
    source: "doc 16 §4.3",
    relations: [
      { type: "REQUIRES", target: "realm.qi_condensation", note: "alchemist minimum for basic enhancement pills" }
    ],
    simulationHooks: ["combat","economy","deviation"],
    version: "0.1.0"
  },
  {
    id: "pill.qi_capacity",
    kind: "pill",
    name: "Qi-Capacity Pill",
    nameHanzi: "氣丹",
    tags: ["enhancement","class_mention","thin"],
    description: "Named among enhancement pills in doc 16 §4.3 (strength 力丹, speed 速丹, perception 覺丹, qi-capacity 氣丹): temporarily boosts qi capacity. Enhancement boosts are temporary — minutes to hours — with a real crash afterward; repeated use produces cumulative contamination. No catalog stats are given.",
    source: "doc 16 §4.3",
    relations: [
      { type: "REQUIRES", target: "realm.qi_condensation", note: "alchemist minimum for basic enhancement pills" }
    ],
    simulationHooks: ["cultivation","combat","economy","deviation"],
    version: "0.1.0"
  },
  {
    id: "pill.meridian_opening",
    kind: "pill",
    name: "Meridian-Opening Pill",
    nameHanzi: "開脈丹",
    tags: ["transformation","class_mention","thin"],
    description: "Named among transformation pills in doc 16 §4.3 (body-tempering 淬體丹, meridian-opening 開脈丹, root-developing 培根丹): opens new meridian routes. Transformation pills are the rarest, most expensive, and most dangerous pill class — a controlled medical procedure; require Core Formation alchemy minimum, and many require the consumer to be at a specific realm (a Qi Condensation consumer's meridian system cannot accommodate the changes, producing permanent distortion). No catalog stats are given.",
    source: "doc 16 §4.3",
    relations: [
      { type: "REQUIRES", target: "realm.core_formation", note: "alchemist minimum for transformation pills" }
    ],
    simulationHooks: ["cultivation","deviation","economy"],
    version: "0.1.0"
  },
  {
    id: "pill.nascent_soul",
    kind: "pill",
    name: "Nascent Soul Pill",
    tags: ["breakthrough","class_mention","thin"],
    description: "Named among high-tier breakthrough pills in doc 16 §4.6: a Core Formation alchemist can refine high-tier breakthrough pills (Nascent Soul Pill, with significant risk). No catalog stats are given.",
    source: "doc 16 §4.6",
    relations: [
      { type: "REQUIRES", target: "realm.core_formation", note: "alchemist to refine, with significant risk" }
    ],
    simulationHooks: ["cultivation","economy","deviation"],
    version: "0.1.0"
  },

  // ============================================================
  // TREASURES / ARTIFACTS (named in doc 35 §2.5 and doc 16 §3.4)
  // ============================================================
  {
    id: "treasure.storage_ring",
    kind: "treasure",
    name: "Storage Ring",
    tags: ["artifact","core_formation","spatial_pocket","premium_storage"],
    description: "The Core Formation artifact that the storage talisman is the precursor to (doc 35 §2.5; doc 16 §3.4). No catalog stats are given beyond its artifact status and Core Formation crafting tier.",
    source: "doc 35 §2.5, doc 16 §3.4",
    relations: [
      { type: "REQUIRES", target: "realm.core_formation", note: "artifact tier" },
      { type: "DERIVED_FROM", target: "talisman.storage" }
    ],
    simulationHooks: ["save","economy","physics","trade"],
    version: "0.1.0"
  }
];
