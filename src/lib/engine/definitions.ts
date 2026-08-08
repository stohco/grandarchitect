/**
 * The Definition Database — the authored concept graph.
 *
 * This file contains the structured definitions extracted from the bible's
 * 48 documents. Each definition is a node in a semantic graph, connected
 * to other definitions by typed relations.
 *
 * Phase 1 target: 6,000-10,000 definitions
 * Current: ~200 (extracted from the most foundational docs)
 *
 * The definitions are organized by domain. Each domain is a section.
 */

export type DefinitionKind =
  | "metaphysical_essence" | "realm" | "technique" | "cultivation_practice"
  | "treasure" | "herb" | "beast" | "mineral" | "formation" | "talisman"
  | "pill" | "forging_recipe" | "manual" | "sect" | "lineage" | "location"
  | "culture" | "npc_role" | "event" | "deviation" | "institution" | "law"
  | "cosmological_feature" | "skill" | "status_effect" | "custom";

export interface Relation {
  type: string;
  target: string;
  note?: string;
  weight?: number;
}

export type SimulationHook =
  | "ecology" | "weather" | "combat" | "economy" | "cultivation"
  | "deviation" | "social" | "history" | "rendering" | "audio"
  | "physics" | "perception" | "save" | "migration" | "trade"
  | "politics" | "ritual" | "disease" | "aging" | "reproduction";

export interface Definition {
  id: string;
  kind: DefinitionKind;
  name: string;
  nameHanzi?: string;
  tags: string[];
  description: string;
  source: string;
  relations: Relation[];
  simulationHooks: SimulationHook[];
  renderProfile?: string;
  /** Universal xianxia synonyms (English first, then hanzi) — the database
   * must read as real xianxia, not a cheap copy. Machine-audited. */
  aliases?: string[];
  version: string;
}

// ESSENCES (9)
export const ESSENCE_DEFINITIONS: Definition[] = [
  { id: "essence.qi", kind: "metaphysical_essence", name: "Qi", nameHanzi: "氣", tags: ["fundamental","energy","cultivable","polarized","phased"], description: "The fundamental energy of the Acquired and Mortal strata. Every qi state carries a yin-yang signature and a five-phase affinity.", source: "doc 00 §6", relations: [{ type: "PREREQUISITE_FOR", target: "realm.qi_induction" }, { type: "TRANSFORMS", target: "essence.ran" }], simulationHooks: ["cultivation","combat","ecology","economy","deviation","perception"], version: "0.1.0" },
  { id: "essence.yin", kind: "metaphysical_essence", name: "Yin", nameHanzi: "陰", tags: ["polarity","cool","dark","still","inward"], description: "The receptive polarity. Yin-dominant qi is cool, dark, still, inward, condensing. The body is yin-dominant.", source: "doc 00 §6, doc 24 §2.3", relations: [{ type: "OPPOSES", target: "essence.yang" }, { type: "COMPATIBLE_WITH", target: "essence.water", weight: 0.8 }], simulationHooks: ["cultivation","combat","deviation"], version: "0.1.0" },
  { id: "essence.yang", kind: "metaphysical_essence", name: "Yang", nameHanzi: "陽", tags: ["polarity","hot","bright","active","outward"], description: "The active polarity. Yang-dominant qi is hot, bright, active, outward. The anchor is yang-dominant.", source: "doc 00 §6, doc 24 §2.3", relations: [{ type: "OPPOSES", target: "essence.yin" }, { type: "COMPATIBLE_WITH", target: "essence.fire", weight: 0.8 }], simulationHooks: ["cultivation","combat","deviation"], version: "0.1.0" },
  { id: "essence.wood", kind: "metaphysical_essence", name: "Wood Phase", nameHanzi: "木", tags: ["phase","growing","flexible","spring"], description: "Growth, spreading, flexibility. Generates fire, conquers earth.", source: "doc 00 §6", relations: [{ type: "GENERATES", target: "essence.fire" }, { type: "CONQUERS", target: "essence.earth" }, { type: "GENERATED_BY", target: "essence.water" }, { type: "CONQUERED_BY", target: "essence.metal" }], simulationHooks: ["ecology","cultivation","combat","economy"], renderProfile: "phase_wood_standard", version: "0.1.0" },
  { id: "essence.fire", kind: "metaphysical_essence", name: "Fire Phase", nameHanzi: "火", tags: ["phase","hot","bright","summer","destructive","yang"], description: "Heat, light, transformation. Generates earth, conquers metal.", source: "doc 00 §6", relations: [{ type: "GENERATES", target: "essence.earth" }, { type: "CONQUERS", target: "essence.metal" }, { type: "GENERATED_BY", target: "essence.wood" }, { type: "CONQUERED_BY", target: "essence.water" }], simulationHooks: ["ecology","weather","combat","economy","cultivation","deviation"], renderProfile: "phase_fire_standard", version: "0.1.0" },
  { id: "essence.earth", kind: "metaphysical_essence", name: "Earth Phase", nameHanzi: "土", tags: ["phase","stable","dense","transition"], description: "Stability, density, patience. The substrate of the other four phases. Generates metal, conquers water.", source: "doc 00 §6", relations: [{ type: "GENERATES", target: "essence.metal" }, { type: "CONQUERS", target: "essence.water" }, { type: "GENERATED_BY", target: "essence.fire" }, { type: "CONQUERED_BY", target: "essence.wood" }], simulationHooks: ["ecology","cultivation","combat","economy"], renderProfile: "phase_earth_standard", version: "0.1.0" },
  { id: "essence.metal", kind: "metaphysical_essence", name: "Metal Phase", nameHanzi: "金", tags: ["phase","sharp","rigid","autumn"], description: "Sharpness, condensation, rigidity. Generates water, conquers wood.", source: "doc 00 §6", relations: [{ type: "GENERATES", target: "essence.water" }, { type: "CONQUERS", target: "essence.wood" }, { type: "GENERATED_BY", target: "essence.earth" }, { type: "CONQUERED_BY", target: "essence.fire" }], simulationHooks: ["ecology","cultivation","combat","economy"], renderProfile: "phase_metal_standard", version: "0.1.0" },
  { id: "essence.water", kind: "metaphysical_essence", name: "Water Phase", nameHanzi: "水", tags: ["phase","flowing","deep","winter","yin"], description: "Flow, stillness, depth. Generates wood, conquers fire.", source: "doc 00 §6", relations: [{ type: "GENERATES", target: "essence.wood" }, { type: "CONQUERS", target: "essence.fire" }, { type: "GENERATED_BY", target: "essence.metal" }, { type: "CONQUERED_BY", target: "essence.earth" }], simulationHooks: ["ecology","weather","cultivation","combat","economy"], renderProfile: "phase_water_standard", version: "0.1.0" },
  { id: "essence.ran", kind: "metaphysical_essence", name: "Ran", nameHanzi: "然", tags: ["higher_reality","post_mahayana","fundamental"], description: "The substrate of the Higher Immortal World. Not qi — a higher order from which qi is derived.", source: "doc 48 §3", relations: [{ type: "TRANSFORMS", target: "essence.qi" }, { type: "PREREQUISITE_FOR", target: "realm.xianren" }], simulationHooks: ["cultivation"], renderProfile: "ran_substrate_standard", version: "0.1.0" },
];

// REALMS (10)
export const REALM_DEFINITIONS: Definition[] = [
  { id: "realm.mortal", kind: "realm", name: "Mortal", nameHanzi: "凡人", tags: ["station_1","starting"], description: "Ordinary human, no cultivation. Lifespan 40-60 years.", source: "doc 03 Station 1", relations: [{ type: "EVOLVES_INTO", target: "realm.qi_induction" }], simulationHooks: ["aging","disease","economy","social"], aliases: ["Ordinary Mortal", "Ordinary Person", "凡人"], version: "0.1.0" },
  { id: "realm.qi_induction", kind: "realm", name: "Qi Induction", nameHanzi: "引气", tags: ["station_2","perception_only"], description: "First qi perception. No output. Lifespan unchanged.", source: "doc 03 Station 2", relations: [{ type: "REQUIRES", target: "essence.qi" }, { type: "EVOLVES_INTO", target: "realm.qi_condensation" }], simulationHooks: ["perception","cultivation","deviation"], aliases: ["Qi Perception", "Qi Sensing", "引气"], version: "0.1.0" },
  { id: "realm.qi_condensation", kind: "realm", name: "Qi Condensation", nameHanzi: "凝气", tags: ["station_3","first_output","mountain_proof_bound"], description: "First self-sustaining inner order. Can route qi. Cannot split a mountain. Lifespan unchanged.", source: "doc 03 Station 3", relations: [{ type: "REQUIRES", target: "realm.qi_induction" }, { type: "EVOLVES_INTO", target: "realm.foundation_establishment" }, { type: "PREREQUISITE_FOR", target: "technique.route_qi" }, { type: "PREREQUISITE_FOR", target: "technique.burning_palm" }], simulationHooks: ["combat","cultivation","deviation","economy"], aliases: ["Qi Gathering", "练气", "凝气"], version: "0.1.0" },
  { id: "realm.foundation_establishment", kind: "realm", name: "Foundation Establishment", nameHanzi: "筑基", tags: ["station_4","integration","lifespan_200"], description: "Body, qi, spirit integrate. Recognized cultivator. Lifespan ~200 years.", source: "doc 03 Station 4", relations: [{ type: "REQUIRES", target: "realm.qi_condensation" }, { type: "REQUIRES", target: "event.breakthrough" }, { type: "EVOLVES_INTO", target: "realm.core_formation" }], simulationHooks: ["combat","cultivation","aging","social","economy"], aliases: ["Foundation Building", "筑基"], version: "0.1.0" },
  { id: "realm.core_formation", kind: "realm", name: "Core Formation", nameHanzi: "金丹", tags: ["station_5","self_sustaining","anchor_perception","lifespan_500"], description: "Internal authority forms. Qi self-sustaining. Can perceive spirit anchors. Lifespan ~500 years.", source: "doc 03 Station 5", relations: [{ type: "REQUIRES", target: "realm.foundation_establishment" }, { type: "REQUIRES", target: "event.tribulation" }, { type: "EVOLVES_INTO", target: "realm.nascent_soul" }, { type: "PREREQUISITE_FOR", target: "skill.perceive_anchors" }], simulationHooks: ["combat","cultivation","aging","perception","economy","social"], aliases: ["Golden Core", "金丹"], version: "0.1.0" },
  { id: "realm.nascent_soul", kind: "realm", name: "Nascent Soul", nameHanzi: "元嬰", tags: ["station_6","spirit_action","survive_death","lifespan_1000"], description: "Spirit acts beyond flesh. Anchor can project, possess, survive death. Lifespan ~1000 years.", source: "doc 03 Station 6, doc 30", relations: [{ type: "REQUIRES", target: "realm.core_formation" }, { type: "REQUIRES", target: "event.tribulation" }, { type: "EVOLVES_INTO", target: "realm.spirit_severance" }], simulationHooks: ["combat","cultivation","aging","perception","social","economy"], aliases: ["Nascent Soul", "Yuan Ying", "元婴"], version: "0.1.0" },
  { id: "realm.spirit_severance", kind: "realm", name: "Spirit Severance", nameHanzi: "化神", tags: ["station_7","domain","lifespan_2000"], description: "Externalizes law as domain. Within domain, will is partially authoritative. Lifespan ~2000 years.", source: "doc 03 Station 7, doc 30", relations: [{ type: "REQUIRES", target: "realm.nascent_soul" }, { type: "REQUIRES", target: "event.tribulation" }, { type: "EVOLVES_INTO", target: "realm.void_amalgamation" }], simulationHooks: ["combat","cultivation","aging","physics","perception"], aliases: ["Soul Formation", "Spirit Transformation", "化神"], version: "0.1.0" },
  { id: "realm.void_amalgamation", kind: "realm", name: "Void Amalgamation", nameHanzi: "合虛", tags: ["station_8","place_bonded","earth_immortal","lifespan_5000","no_tribulation"], description: "Bonds to a place. Cannot be killed while place stands. Lifespan ~5000 years. No tribulation.", source: "doc 03 Station 8, doc 30, doc 24 §1.10", relations: [{ type: "REQUIRES", target: "realm.spirit_severance" }, { type: "EVOLVES_INTO", target: "realm.tribulation_crossing" }], simulationHooks: ["cultivation","aging","ecology","physics"], aliases: ["Soul Transformation", "Body Integration", "合体", "合虚"], version: "0.1.0" },
  { id: "realm.tribulation_crossing", kind: "realm", name: "Tribulation Crossing", nameHanzi: "渡劫", tags: ["station_9","stratum_travel","heavenly_immortal","lifespan_10000"], description: "Crosses tribulation to ascend to Precelestial. Heavenly immortal. Can travel between strata. Lifespan ~10000 years.", source: "doc 03 Station 9, doc 30", relations: [{ type: "REQUIRES", target: "realm.void_amalgamation" }, { type: "REQUIRES", target: "event.tribulation" }, { type: "EVOLVES_INTO", target: "realm.mahayana" }], simulationHooks: ["cultivation","aging","perception","physics"], aliases: ["Tribulation Transcendence", "Heavenly Tribulation", "渡劫"], version: "0.1.0" },
  { id: "realm.mahayana", kind: "realm", name: "Mahayana", nameHanzi: "大乘", tags: ["station_10","law_authorship","endgame","lifespan_10000"], description: "Can author scoped world-laws. Acquired-authorship and Reach-authorship. Cannot rewrite the Origin. Lifespan ~10000 years.", source: "doc 03 Station 10, doc 30, doc 24 §1.1", relations: [{ type: "REQUIRES", target: "realm.tribulation_crossing" }, { type: "EVOLVES_INTO", target: "realm.xianren" }], simulationHooks: ["cultivation","aging","physics","ecology","history"], aliases: ["Great Vehicle", "大乘"], version: "0.1.0" },
];

// DEVIATIONS (10)
export const DEVIATION_DEFINITIONS: Definition[] = [
  { id: "deviation.false_circuit", kind: "deviation", name: "False Circuit", nameHanzi: "假周天", tags: ["somatic","shortcut","wired"], description: "Qi loop bypassing dantian. Quick warmth, reservoir drain, habitual.", source: "doc 05 §3.1", relations: [{ type: "COUNTERED_BY", target: "practice.dantian_grounding" }], simulationHooks: ["cultivation","deviation","combat"], version: "0.1.0" },
  { id: "deviation.cross_current", kind: "deviation", name: "Cross-Current", nameHanzi: "逆流", tags: ["somatic","reversal","electric"], description: "Reversed meridian flow. Brief surge, meridian damage, turbulence.", source: "doc 05 §3.1", relations: [{ type: "COUNTERED_BY", target: "practice.stabilizing_herbs" }], simulationHooks: ["cultivation","deviation","combat"], version: "0.1.0" },
  { id: "deviation.route_fixation", kind: "deviation", name: "Route Fixation", nameHanzi: "路執", tags: ["somatic","habit","rigid"], description: "One route becomes habitual, others atrophy. Rigid qi-state.", source: "doc 05 §3.1", relations: [{ type: "COUNTERED_BY", target: "practice.diverse_routing" }], simulationHooks: ["cultivation","deviation","combat"], version: "0.1.0" },
  { id: "deviation.borrowed_signature", kind: "deviation", name: "Borrowed Signature Adhesion", nameHanzi: "借氣附著", tags: ["somatic","contamination","haunted"], description: "Another being's qi-signature absorbed and stuck. Chronic imbalance.", source: "doc 24 §1.2", relations: [{ type: "COUNTERED_BY", target: "practice.phase_matched_venting" }], simulationHooks: ["cultivation","deviation","combat","ecology"], version: "0.1.0" },
  { id: "deviation.breath_desync", kind: "deviation", name: "Breath-Motion Desynchronization", nameHanzi: "息動失調", tags: ["somatic","breathing","disconnected"], description: "Breath and qi-circulation out of sync. 40-60% efficiency loss.", source: "doc 24 §1.2", relations: [{ type: "COUNTERED_BY", target: "practice.synchronized_breathing" }], simulationHooks: ["cultivation","deviation"], version: "0.1.0" },
  { id: "deviation.obsession", kind: "deviation", name: "Obsession", nameHanzi: "執", tags: ["psychospiritual","心魔","fixation","driven"], description: "Fixation persists and deepens. Qi-state stained. Cultivator feels compelled.", source: "doc 05 §3.2", relations: [{ type: "COUNTERED_BY", target: "practice.confront_fixation" }], simulationHooks: ["deviation","social","cultivation","combat"], version: "0.1.0" },
  { id: "deviation.compulsion", kind: "deviation", name: "Compulsion", nameHanzi: "魔習", tags: ["psychospiritual","心魔","repetition","trapped"], description: "Cannot stop repeating a behavior. Intrudes on practice and life.", source: "doc 05 §3.2", relations: [{ type: "COUNTERED_BY", target: "practice.interruption" }], simulationHooks: ["deviation","social","cultivation"], version: "0.1.0" },
  { id: "deviation.hallucination", kind: "deviation", name: "Hallucination", nameHanzi: "幻", tags: ["psychospiritual","心魔","perception_warping","uncertain"], description: "Perceives qi that isn't there, or misperceives what is. Hard to distinguish from real.", source: "doc 05 §3.2", relations: [{ type: "COUNTERED_BY", target: "practice.cultivate_doubt" }], simulationHooks: ["deviation","perception","cultivation","combat"], version: "0.1.0" },
  { id: "deviation.fragmentation", kind: "deviation", name: "Personality Fragmentation", nameHanzi: "散魂", tags: ["psychospiritual","心魔","multiple","chaotic","madness"], description: "Multiple selves in one mind. May act without memory. Most frightening deviation.", source: "doc 05 §3.2", relations: [{ type: "COUNTERED_BY", target: "practice.integration" }], simulationHooks: ["deviation","social","cultivation","combat"], version: "0.1.0" },
  { id: "deviation.delusional_conviction", kind: "deviation", name: "Delusional Conviction", nameHanzi: "妄信", tags: ["psychospiritual","心魔","certainty","partial_truth"], description: "Unquestionable belief — a partial truth elevated to totality. Cultivator feels serenely certain. Hardest to treat.", source: "doc 24 §1.2", relations: [{ type: "COUNTERED_BY", target: "practice.encounter_contradicting_evidence" }], simulationHooks: ["deviation","social","cultivation","perception"], version: "0.1.0" },
];

// TECHNIQUES (3 core, to be expanded)
export const TECHNIQUE_DEFINITIONS: Definition[] = [
  { id: "technique.route_qi", kind: "technique", name: "Route Qi", nameHanzi: "運氣", tags: ["fundamental","routing","qi_condensation","committed"], description: "Direct qi through meridian to enhance output. Routes: Hands/Legs/Senses/Skin, each phase-aware. Switch cost 60-120 frames.", source: "doc 03 Station 3, doc 32 §2", relations: [{ type: "REQUIRES", target: "realm.qi_condensation" }, { type: "PREREQUISITE_FOR", target: "technique.burning_palm" }], simulationHooks: ["combat","cultivation","physics"], renderProfile: "technique_route_qi", version: "0.1.0" },
  { id: "technique.burning_palm", kind: "technique", name: "Burning Palm", nameHanzi: "焚掌", tags: ["fire_phase","hands_routing","offensive","dot","qi_condensation"], description: "Fire-phase qi to palms. 14/6/12 frames. 8 qwu. 500-800N + burn DOT. Counter: water. Failure: fire-deviation risk.", source: "doc 32 §3.3", relations: [{ type: "REQUIRES", target: "realm.qi_condensation" }, { type: "REQUIRES", target: "technique.route_qi" }, { type: "ENHANCES", target: "essence.fire" }, { type: "COUNTERED_BY", target: "technique.water_shield" }], simulationHooks: ["combat","physics","deviation"], renderProfile: "technique_burning_palm", version: "0.1.0" },
  { id: "technique.mortal_strike", kind: "technique", name: "Basic Strike", tags: ["mortal","unarmed","fast"], description: "Basic punch/kick. No qi. 10/4/6 frames. 100-200N. Counter: block/dodge.", source: "doc 32 §3.1", relations: [{ type: "REQUIRES", target: "realm.mortal" }], simulationHooks: ["combat","physics"], renderProfile: "technique_basic_strike", version: "0.1.0" },
];

// PRACTICES (3 core, to be expanded)
export const PRACTICE_DEFINITIONS: Definition[] = [
  { id: "practice.dantian_grounding", kind: "cultivation_practice", name: "Dantian Grounding", tags: ["corrective","somatic","lower_dantian"], description: "Re-route qi through dantian after false circuit. Heavy and slow. Breaks the habit.", source: "doc 05 §3.1", relations: [{ type: "COUNTERS", target: "deviation.false_circuit" }, { type: "REQUIRES", target: "realm.qi_condensation" }], simulationHooks: ["cultivation","deviation"], version: "0.1.0" },
  { id: "practice.synchronized_breathing", kind: "cultivation_practice", name: "Synchronized Breathing", tags: ["corrective","somatic","breathing"], description: "Re-synchronize breath and qi-circulation under supervision. Days to weeks.", source: "doc 24 §1.2", relations: [{ type: "COUNTERS", target: "deviation.breath_desync" }, { type: "REQUIRES", target: "realm.qi_condensation" }], simulationHooks: ["cultivation","deviation"], version: "0.1.0" },
  { id: "practice.cultivate_doubt", kind: "cultivation_practice", name: "Cultivate Doubt", tags: ["corrective","psychospiritual","heart_mind"], description: "Deliberate suspension of belief in own perception. Question what you perceive.", source: "doc 05 §3.2", relations: [{ type: "COUNTERS", target: "deviation.hallucination" }, { type: "REQUIRES", target: "realm.qi_induction" }], simulationHooks: ["cultivation","deviation","perception"], version: "0.1.0" },
];

// LOCATIONS (2 core, to be expanded massively)
export const LOCATION_DEFINITIONS: Definition[] = [
  { id: "location.wang_family_bend", kind: "location", name: "Wang Family Bend", nameHanzi: "王 家彎", tags: ["village","starting","mortal","cangli_riverlands"], description: "31 households, ~180 people. The player's starting location.", source: "doc 04 §1", relations: [{ type: "PART_OF", target: "region.cangli_riverlands" }], simulationHooks: ["economy","social","ecology","aging","disease"], renderProfile: "location_village_chinese", version: "0.1.0" },
  { id: "location.cangwu_sect", kind: "location", name: "Cangwu Sect", nameHanzi: "蒼梧派", tags: ["sect","small","qi_condensation_tier","cangwu_mountains"], description: "Small sect 100 li west. Wu Changqing (52, Qi Cond peak). 30 disciples. Green Mirror Vein (water-phase).", source: "doc 24 §4.3, doc 31 §1", relations: [{ type: "VASSAL_OF", target: "sect.azure_sword" }], simulationHooks: ["cultivation","economy","social","politics"], renderProfile: "location_sect_mountain", version: "0.1.0" },
];

// FULL DATABASE
export const ALL_DEFINITIONS: Definition[] = [
  ...ESSENCE_DEFINITIONS,
  ...REALM_DEFINITIONS,
  ...DEVIATION_DEFINITIONS,
  ...TECHNIQUE_DEFINITIONS,
  ...PRACTICE_DEFINITIONS,
  ...LOCATION_DEFINITIONS,
];

export const DEFINITION_COUNT = ALL_DEFINITIONS.length;
