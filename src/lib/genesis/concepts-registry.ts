/**
 * Concepts Registry — the Bible-backed Genesis concepts and their bindings.
 *
 * Every claim is a verbatim fragment of a real corpus document (or the
 * emergence engineering directive); the coverage gate verifies the text
 * still exists in the source (machine-audited). An unbound required system
 * is a GENESIS COVERAGE FAILURE.
 *
 * Expansion notes (harsh-critic audit, 2026-08-07):
 *  - Concepts were added only where a VERBATIM claim exists in the corpus.
 *    No claim was paraphrased or fabricated. Known gaps are documented as
 *    absent concepts, not invented ones (e.g. "divine sense" has no corpus
 *    claim — it is an implementation feature, and no concept fakes it).
 *  - Bindings point at REAL consumers (runtime modules or spec docs) whose
 *    files are checked on disk by the gate.
 */

import type { GenesisConcept } from './genesis-types';

export const GENESIS_CONCEPTS: GenesisConcept[] = [
  // -------------------------------------------------------------------------
  // Foundations (00_FOUNDATIONAL_DECISIONS)
  // -------------------------------------------------------------------------
  {
    id: 'canon.determinism',
    name: 'Determinism Contract',
    canonLevel: 'canon',
    claims: [
      {
        text: 'The engine is deterministic. Every simulation result is reproducible from a seed. No Math.random, Date.now, performance.now, Math.sin/cos/exp/log/atan2/pow in simulation code.',
        source: 'corpus-extension/00_FOUNDATIONAL_DECISIONS.md',
      },
    ],
    requires: ['simulation', 'validation'],
    bindings: [
      { system: 'simulation', consumerId: 'simulation.combat-arts', note: 'combat arts core is seed-deterministic' },
      { system: 'simulation', consumerId: 'simulation.time-engine', note: 'time engine is seed-deterministic' },
      { system: 'simulation', consumerId: 'simulation.laws', note: 'law solver is seed-deterministic' },
      { system: 'validation', consumerId: 'validation.determinism-gate', note: 'check:determinism enforces the contract' },
      { system: 'validation', consumerId: 'validation.conformance-runner', note: 'conformance suites pin determinism' },
    ],
  },
  {
    id: 'canon.realm-ladder',
    name: 'Ten-Station Realm Ladder',
    canonLevel: 'canon',
    claims: [
      {
        text: 'The cultivation ladder has exactly ten stations (doc 03). No station may be skipped or inserted.',
        source: 'corpus-extension/00_FOUNDATIONAL_DECISIONS.md',
      },
    ],
    requires: ['simulation'],
    bindings: [
      { system: 'validation', consumerId: 'validation.conformance-runner', note: 'ladder pinned by cultivation conformance' },
          { system: 'simulation', consumerId: 'simulation.cultivation' },
      { system: 'simulation', consumerId: 'simulation.combat-arts' },
    ],
  },
  {
    id: 'canon.qi-capacity-doubling',
    name: 'Qi Capacity Doubling',
    canonLevel: 'canon',
    claims: [
      {
        text: 'Qi capacity doubles per realm station (multiplier exactly 2.0).',
        source: 'corpus-extension/00_FOUNDATIONAL_DECISIONS.md',
      },
    ],
    requires: ['simulation'],
    bindings: [
      { system: 'simulation', consumerId: 'simulation.cultivation', note: 'capacity multiplier 2.0 per station' },
      { system: 'validation', consumerId: 'validation.conformance-runner', note: '2.0 multiplier pinned by conformance' },
    ],
  },
  {
    id: 'canon.visual-truth-packets',
    name: 'Visual Truth Packets / MotionProfiles / Style Grammars',
    canonLevel: 'canon',
    claims: [
      {
        text: 'Every visual concept has a Visual Truth Packet (doc 51). Every moving entity has a MotionProfile (doc 55). Every culture has a Style Grammar (doc 53).',
        source: 'corpus-extension/00_FOUNDATIONAL_DECISIONS.md',
      },
    ],
    requires: ['visual', 'motion', 'generation'],
    bindings: [
      { system: 'visual', consumerId: 'visual.vtp-schema' },
      { system: 'visual', consumerId: 'visual.style-grammars' },
      { system: 'visual', consumerId: 'visual.asset-factory-directive', note: 'asset factory consumes VTPs' },
      { system: 'motion', consumerId: 'motion.grammar' },
      { system: 'motion', consumerId: 'motion.corpus', note: 'Motion Corpus harvests reusable motion from directed episodes (episode -> MotionTruth assets)' },
      { system: 'generation', consumerId: 'generation.procedural-pipeline', note: 'generators must consume VTPs/grammars' },
    ],
  },
  {
    id: 'canon.oracle-authority',
    name: 'Visual Accuracy Oracle Authority',
    canonLevel: 'canon',
    claims: [
      {
        text: 'The Visual Accuracy Oracle (doc 54) has authority to reject any asset that fails validation. The Grand Architect cannot override a rejected verdict.',
        source: 'corpus-extension/00_FOUNDATIONAL_DECISIONS.md',
      },
    ],
    requires: ['validation'],
    bindings: [
      { system: 'generation', consumerId: 'generation.procedural-pipeline', note: 'generators must not produce work the Oracle rejects' },
          { system: 'validation', consumerId: 'validation.oracle' },
      { system: 'validation', consumerId: 'validation.conformance-runner', note: 'rejected work never promoted to validated' },
      { system: 'validation', consumerId: 'validation.vision-inspection', note: 'Perceptual Evidence Examiner supplies the visual evidence the Oracle rules on' },
    ],
  },
  {
    id: 'canon.truth-levels',
    name: 'Five Truth Levels',
    canonLevel: 'canon',
    claims: [
      {
        text: 'Five truth levels only (doc 50 §1): canonical, derived, art, procedural, unresolved',
        source: 'corpus-extension/00_FOUNDATIONAL_DECISIONS.md',
      },
    ],
    requires: ['validation', 'persistence'],
    bindings: [
      { system: 'validation', consumerId: 'validation.ground-truth' },
      { system: 'validation', consumerId: 'validation.conformance-runner' },
      { system: 'persistence', consumerId: 'persistence.durable-store', note: 'truth levels persist with records' },
    ],
  },
  {
    id: 'canon.supernatural-exceptions',
    name: 'Supernatural Exception Specification',
    canonLevel: 'canon',
    claims: [
      {
        text: 'Every supernatural exception has: ordinary rule, power, limits, visible cues, failure behavior, system interactions (doc 55 §6)',
        source: 'corpus-extension/00_FOUNDATIONAL_DECISIONS.md',
      },
    ],
    requires: ['simulation', 'motion', 'validation'],
    bindings: [
      { system: 'simulation', consumerId: 'simulation.laws', note: 'exceptions override laws with stated limits' },
      { system: 'motion', consumerId: 'motion.grammar', note: 'MotionProfile + TechniquePacket carry exception fields' },
      { system: 'validation', consumerId: 'validation.oracle' },
    ],
  },
  {
    id: 'canon.si-units',
    name: 'SI Measurement System',
    canonLevel: 'canon',
    claims: [
      {
        text: 'The engine uses SI units internally (meters, seconds, kilograms, radians, kelvin).',
        source: 'corpus-extension/00_FOUNDATIONAL_DECISIONS.md',
      },
    ],
    requires: ['validation'],
    bindings: [
      { system: 'simulation', consumerId: 'simulation.material-composition', note: 'mass/composition are SI-constrained' },
          { system: 'validation', consumerId: 'validation.measurement-spec' },
      { system: 'validation', consumerId: 'validation.conformance-runner' },
    ],
  },
  {
    id: 'canon.generation-pipeline',
    name: '13-Stage Generation Pipeline',
    canonLevel: 'canon',
    claims: [
      {
        text: 'Procedural generation follows the 13-stage pipeline',
        source: 'corpus-extension/00_FOUNDATIONAL_DECISIONS.md',
      },
    ],
    requires: ['generation', 'validation'],
    bindings: [
      { system: 'generation', consumerId: 'generation.procedural-pipeline' },
      { system: 'validation', consumerId: 'validation.golden-scenes' },
    ],
  },
  {
    id: 'canon.golden-scenes',
    name: 'Golden Scenes',
    canonLevel: 'canon',
    claims: [
      {
        text: 'Golden scenes are art-direction targets, not gameplay scripts. Each defines a visual moment the engine must be able to produce.',
        source: 'corpus-extension/06_GOLDEN_SCENES.md',
      },
    ],
    requires: ['validation', 'visual'],
    bindings: [
      { system: 'validation', consumerId: 'validation.golden-scenes' },
      { system: 'visual', consumerId: 'visual.vtp-schema' },
    ],
  },

  // -------------------------------------------------------------------------
  // Cultivation (03, 05, 27, 30, 32, 45)
  // -------------------------------------------------------------------------
  {
    id: 'canon.power-scaling',
    name: 'Exponential Power Scaling',
    canonLevel: 'canon',
    claims: [
      {
        text: 'Power scaling is exponential (2x qi per realm). Phase combat follows the technique packet schema (doc 55 §2). Timing is synchronized across 5 layers.',
        source: 'corpus-extension/32_POWER_SCALING_AND_PHASE_COMBAT.md',
      },
    ],
    requires: ['simulation', 'motion'],
    bindings: [
      { system: 'simulation', consumerId: 'simulation.cultivation', note: '2x qi per realm' },
      { system: 'simulation', consumerId: 'simulation.combat-arts' },
      { system: 'motion', consumerId: 'motion.grammar' },
    ],
  },
  {
    id: 'canon.realm-perceptions',
    name: 'Station-Gated Perception',
    canonLevel: 'canon',
    claims: [
      {
        text: 'New perceptions — what the cultivator can now perceive that they could not before.',
        source: 'corpus-extension/03_REALM_LADDER.md',
      },
    ],
    requires: ['simulation'],
    bindings: [
      { system: 'gameplay', consumerId: 'gameplay.interaction-layer', note: 'station-gated perception gates player affordances' },
          { system: 'simulation', consumerId: 'simulation.cultivation' },
      { system: 'simulation', consumerId: 'simulation.combat-arts' },
    ],
  },
  {
    id: 'canon.trace-anchoring',
    name: 'Qi-Trace Anchoring',
    canonLevel: 'canon',
    claims: [
      {
        text: 'Anchor a trace (留痕, liúhén). Leave a qi-trace at a location that you (or another cultivator) can later perceive.',
        source: 'corpus-extension/03_REALM_LADDER.md',
      },
    ],
    requires: ['simulation', 'persistence'],
    bindings: [
      { system: 'simulation', consumerId: 'simulation.combat-arts', note: 'divine-sense/trace perception is combat-arts-owned' },
      { system: 'persistence', consumerId: 'persistence.durable-store', note: 'traces persist as world records' },
    ],
  },
  {
    id: 'canon.heart-demons',
    name: 'Heart Demons',
    canonLevel: 'canon',
    claims: [
      {
        text: 'The cultivator experiences a strong emotion — grief, fear, desire, hatred — and the emotion does not resolve. It persists, deepens, and begins to color perception.',
        source: 'corpus-extension/05_PHENOMENOLOGY.md',
      },
    ],
    requires: ['simulation'],
    bindings: [
      { system: 'motion', consumerId: 'motion.grammar', note: 'fear/anger are motion variation axes (doc 55)' },
          { system: 'simulation', consumerId: 'simulation.ga-npc', note: 'personality-biased weighting must carry emotional state' },
      { system: 'simulation', consumerId: 'simulation.cultivation', note: 'deviation progression' },
    ],
  },
  {
    id: 'canon.root-gated-techniques',
    name: 'Root-Gated Techniques',
    canonLevel: 'canon',
    claims: [
      {
        text: 'Some techniques require a minimum root-component to practice at all.',
        source: 'corpus-extension/27_CULTIVATION_SYSTEMS.md',
      },
    ],
    requires: ['simulation', 'motion'],
    bindings: [
      { system: 'simulation', consumerId: 'simulation.cultivation' },
      { system: 'simulation', consumerId: 'simulation.combat-arts' },
      { system: 'motion', consumerId: 'motion.grammar' },
    ],
  },
  {
    id: 'canon.domain-sovereignty',
    name: 'Domain Sovereignty',
    canonLevel: 'canon',
    claims: [
      {
        text: 'The Spirit Severance station is the protagonist\'s first experience of sovereignty — the first time the protagonist\'s will, in a bounded space, becomes law.',
        source: 'corpus-extension/45_STATIONS_6_TO_10_CONTENT.md',
      },
    ],
    requires: ['simulation'],
    bindings: [
      { system: 'validation', consumerId: 'validation.conformance-runner', note: 'domain behavior pinned by combat-arts conformance' },
          { system: 'simulation', consumerId: 'simulation.realm-law-profile', note: 'domains are scoped law authorship' },
      { system: 'simulation', consumerId: 'simulation.laws' },
    ],
  },
  {
    id: 'canon.combat-domain',
    name: 'Combat Domain',
    canonLevel: 'canon',
    claims: [
      {
        text: 'the cultivator can open a domain — a bounded region where their will is partially authoritative.',
        source: 'corpus-extension/13_COMBAT_GRAMMAR.md',
      },
    ],
    requires: ['simulation'],
    bindings: [
      { system: 'motion', consumerId: 'motion.grammar', note: 'domain modifies technique motion' },
          { system: 'simulation', consumerId: 'simulation.laws', note: 'local law stacks resolve domain law' },
      { system: 'simulation', consumerId: 'simulation.capability-vector', note: 'capability vectors change inside a domain' },
    ],
  },

  // -------------------------------------------------------------------------
  // Combat (32, 13)
  // -------------------------------------------------------------------------
  {
    id: 'canon.phase-combat',
    name: 'Five-Phase Combat Matchup',
    canonLevel: 'canon',
    claims: [
      {
        text: 'Phase combat follows the technique packet schema (doc 55 §2).',
        source: 'corpus-extension/32_POWER_SCALING_AND_PHASE_COMBAT.md',
      },
    ],
    requires: ['simulation', 'motion'],
    bindings: [
      { system: 'simulation', consumerId: 'simulation.ga-combat', note: 'phase matchup resolution' },
      { system: 'simulation', consumerId: 'simulation.combat-arts' },
      { system: 'motion', consumerId: 'motion.grammar', note: 'TechniquePacket schema' },
    ],
  },

  // -------------------------------------------------------------------------
  // Ecology / living world (14, 33, engine-arch 28)
  // -------------------------------------------------------------------------
  {
    id: 'canon.spirit-veins',
    name: 'Spirit Veins',
    canonLevel: 'canon',
    claims: [
      {
        text: 'Spirit veins (靈脈, língmài) are the qi-topology skeleton of every world.',
        source: 'corpus-extension/14_ECOLOGY_AND_QI.md',
      },
    ],
    requires: ['generation', 'simulation', 'visual'],
    bindings: [
      { system: 'generation', consumerId: 'generation.terrain', note: 'ecosystem zones align with vein layout' },
      { system: 'simulation', consumerId: 'simulation.ecology', note: 'qi ecology affects carrying capacity' },
      { system: 'visual', consumerId: 'visual.vtp-schema', note: 'veins have VTPs (PhysicalSpecification: spirit vein)' },
    ],
  },
  {
    id: 'canon.spirit-beasts',
    name: 'Spirit Beasts',
    canonLevel: 'canon',
    claims: [
      {
        text: 'Spirit beasts (靈獸) are animals with cultivator-parallel tiers. They follow the same realm ladder as human cultivators (doc 03) but with species-specific variations.',
        source: 'corpus-extension/14_ECOLOGY_AND_QI.md',
      },
    ],
    requires: ['simulation', 'motion', 'visual'],
    bindings: [
      { system: 'simulation', consumerId: 'simulation.ecology' },
      { system: 'motion', consumerId: 'motion.grammar', note: 'creature motion profiles' },
      { system: 'visual', consumerId: 'visual.vtp-schema' },
    ],
  },
  {
    id: 'canon.cangwu-roster',
    name: 'Cangwu Ecology Roster',
    canonLevel: 'canon',
    claims: [
      {
        text: 'Every named beast is a node with inputs, outputs, predators, and a death schedule. Every named herb is a primary producer with a growth cycle, a harvest consequence, and a market.',
        source: 'corpus-extension/33_CANGWU_MOUNTAINS_ECOLOGY.md',
      },
    ],
    requires: ['simulation'],
    bindings: [
      { system: 'generation', consumerId: 'generation.procedural-pipeline', note: 'roster feeds Cangwu range generation' },
          { system: 'simulation', consumerId: 'simulation.ecology' },
      { system: 'simulation', consumerId: 'simulation.ecology-spec' },
    ],
  },
  {
    id: 'canon.demography-aggregation',
    name: 'S4→S2→S0 Aggregation',
    canonLevel: 'canon',
    claims: [
      {
        text: 'S4 individuals are aggregated back into S2 populations (the aggregation preserves total counts, qi-magnitudes\' mean and variance, and any named individuals\' identities).',
        source: 'engine-architecture/28_ECOLOGY_DEMOGRAPHY.md',
      },
    ],
    requires: ['simulation', 'persistence'],
    bindings: [
      { system: 'simulation', consumerId: 'simulation.ecology-spec' },
      { system: 'persistence', consumerId: 'persistence.tiering-spec', note: 'tier transitions preserve truth' },
    ],
  },

  // -------------------------------------------------------------------------
  // Economy (18, 47)
  // -------------------------------------------------------------------------
  {
    id: 'canon.spirit-stone-economy',
    name: 'Spirit Stone Currency',
    canonLevel: 'canon',
    claims: [
      {
        text: 'A spirit stone is a crystallized qi concentrate, produced by spirit veins (rare) or by Core Formation+ cultivators (expensive). Used for: cultivation resources, pills, talismans, formations, sect dues, mercenary contracts.',
        source: 'corpus-extension/18_ECONOMY_SYSTEM.md',
      },
    ],
    requires: ['simulation', 'persistence'],
    bindings: [
      { system: 'simulation', consumerId: 'simulation.ga-economy' },
      { system: 'persistence', consumerId: 'persistence.durable-store' },
    ],
  },
  {
    id: 'canon.qi-authority',
    name: 'Qi Authority (Cosmic Currency)',
    canonLevel: 'canon',
    claims: [
      {
        text: 'Qi-authority — the substrate\'s measurable qi-density, in a cultivator\'s anchor or in a court\'s reservoir — is the cosmic economy\'s reserve currency.',
        source: 'corpus-extension/47_COSMIC_RESOURCES_AND_ECONOMY.md',
      },
    ],
    requires: ['simulation'],
    bindings: [
      { system: 'generation', consumerId: 'generation.procedural-pipeline', note: 'qi-density is a generated field' },
          { system: 'simulation', consumerId: 'simulation.cosmology-graph' },
      { system: 'simulation', consumerId: 'simulation.karma', note: 'conserved, spent, or wasted — never created' },
    ],
  },

  // -------------------------------------------------------------------------
  // Society / institutions (12, 31, 38, 46)
  // -------------------------------------------------------------------------
  {
    id: 'canon.sect-hierarchy',
    name: 'Sect Hierarchy',
    canonLevel: 'canon',
    claims: [
      {
        text: 'Sects follow a strict hierarchy: patriarch to elders to inner disciples to outer disciples to servants. Each sect has exactly one spirit vein or grotto-heaven.',
        source: 'corpus-extension/12_SECT_INSTITUTIONS.md',
      },
    ],
    requires: ['simulation', 'visual'],
    bindings: [
      { system: 'simulation', consumerId: 'simulation.gen-settlement' },
      { system: 'visual', consumerId: 'visual.style-grammars', note: 'ranked vestments per style grammar' },
    ],
  },
  {
    id: 'canon.ancestral-lineages',
    name: 'Ancestral Courts and Lineages',
    canonLevel: 'canon',
    claims: [
      {
        text: 'Ancestral courts follow the style grammars appropriate to their realm and culture (doc 53). Lineages have explicit progenitor-to-present chains.',
        source: 'corpus-extension/46_ANCESTRAL_COURTS_AND_LINEAGES.md',
      },
    ],
    requires: ['simulation', 'persistence'],
    bindings: [
      { system: 'simulation', consumerId: 'simulation.history' },
      { system: 'persistence', consumerId: 'persistence.durable-store' },
    ],
  },
  {
    id: 'canon.courts-of-heaven',
    name: 'Courts of Heaven',
    canonLevel: 'canon',
    claims: [
      {
        text: 'The full institutional content for the Courts of Heaven (天庭), converting doc 15 §2\'s specification into named geography, named personnel, named factions, named history, and a named political crisis.',
        source: 'corpus-extension/38_THE_COURTS_OF_HEAVEN.md',
      },
    ],
    requires: ['simulation'],
    bindings: [
      { system: 'visual', consumerId: 'visual.style-grammars', note: 'court vestments per style grammars' },
          { system: 'simulation', consumerId: 'simulation.history' },
      { system: 'simulation', consumerId: 'simulation.cosmology-graph' },
    ],
  },

  // -------------------------------------------------------------------------
  // Cosmology / worlds (15, 19, 36, 40, 48)
  // -------------------------------------------------------------------------
  {
    id: 'canon.strata-geometry',
    name: 'Three-Strata Geometry',
    canonLevel: 'canon',
    claims: [
      {
        text: 'The three are coextensive in horizontal position (a vertical line through any point in the lens crosses all three strata at that horizontal coordinate) and distinct in altitude (qi-density varies along the vertical axis).',
        source: 'corpus-extension/36_COSMIC_GEOGRAPHY.md',
      },
    ],
    requires: ['simulation', 'persistence'],
    bindings: [
      { system: 'simulation', consumerId: 'simulation.cosmology-graph' },
      { system: 'persistence', consumerId: 'persistence.streaming' },
    ],
  },
  {
    id: 'canon.grotto-anchors',
    name: 'Grotto-Heaven Anchors',
    canonLevel: 'canon',
    claims: [
      {
        text: 'This is what makes grotto-heaven anchors possible: a grotto-heaven in the Acquired Stratum connects downward through the stratum boundary to a geographic anchor in the Mortal Stratum at the same horizontal coordinate.',
        source: 'corpus-extension/36_COSMIC_GEOGRAPHY.md',
      },
    ],
    requires: ['simulation', 'persistence'],
    bindings: [
      { system: 'simulation', consumerId: 'simulation.cosmology-graph' },
      { system: 'persistence', consumerId: 'persistence.streaming' },
    ],
  },
  {
    id: 'canon.grotto-heaven-time',
    name: 'Grotto-Heaven Time Rates',
    canonLevel: 'canon',
    claims: [
      {
        text: 'Most grotto-heavens run at the Mortal Stratum\'s rate (1:1). Some are faster (1:10 — ten days inside for one day outside) or slower (10:1 — one day inside for ten days outside).',
        source: 'corpus-extension/19_GROTTO_HEAVENS.md',
      },
    ],
    requires: ['simulation', 'persistence'],
    bindings: [
      { system: 'simulation', consumerId: 'simulation.time-engine', note: 'local time rates are a time-engine capability' },
      { system: 'persistence', consumerId: 'persistence.streaming', note: 'grotto anchors/domains are spatial nodes' },
    ],
  },
  {
    id: 'canon.precelestial',
    name: 'Precelestial Stratum',
    canonLevel: 'canon',
    claims: [
      {
        text: 'The Precelestial is the uppermost of the three strata. It is older, slower, denser, and less lawful than the Acquired Stratum below it.',
        source: 'corpus-extension/15_PRECELESTIAL_AND_TRIBULATION.md',
      },
    ],
    requires: ['simulation'],
    bindings: [
      { system: 'generation', consumerId: 'generation.procedural-pipeline', note: 'stratum substrate is generation context' },
          { system: 'simulation', consumerId: 'simulation.cosmology-graph' },
      { system: 'simulation', consumerId: 'simulation.realm-law-profile', note: 'substrate-law differs per stratum' },
    ],
  },
  {
    id: 'canon.world-law-pressure',
    name: 'Law Reach / World-Law Pressure',
    canonLevel: 'canon',
    claims: [
      {
        text: 'The named geography and phenomenology of the Precelestial\'s outer ring of unstable law.',
        source: 'corpus-extension/40_THE_LAW_REACHES.md',
      },
    ],
    requires: ['simulation', 'motion'],
    bindings: [
      { system: 'simulation', consumerId: 'simulation.laws', note: 'realm law profiles + local law stacks' },
      { system: 'motion', consumerId: 'motion.grammar', note: 'law pressure modifies motion (movement suppression)' },
    ],
  },
  {
    id: 'canon.higher-worlds',
    name: 'Higher Immortal Worlds',
    canonLevel: 'canon',
    claims: [
      {
        text: 'Specifies what lies beyond Mahayana — the higher immortal worlds the genre demands and the prior corpus deferred.',
        source: 'corpus-extension/48_HIGHER_IMMORTAL_WORLDS.md',
      },
    ],
    requires: ['simulation'],
    bindings: [
      { system: 'simulation', consumerId: 'simulation.cosmology-graph' },
      { system: 'persistence', consumerId: 'persistence.streaming', note: 'higher worlds are spatial nodes in the hierarchy' },
    ],
  },

  // -------------------------------------------------------------------------
  // Formations / craft / matter (16, 35)
  // -------------------------------------------------------------------------
  {
    id: 'canon.formation-barriers',
    name: 'Formation Barriers',
    canonLevel: 'canon',
    claims: [
      {
        text: 'shields (護體 — protect those within from physical or qi attack)',
        source: 'corpus-extension/16_FORMATIONS_TALISMANS_ALCHEMY.md',
      },
    ],
    requires: ['simulation', 'validation'],
    bindings: [
      { system: 'simulation', consumerId: 'simulation.formation-core', note: 'formation domains protect volumes' },
      { system: 'validation', consumerId: 'validation.oracle' },
    ],
  },
  {
    id: 'canon.formation-topology',
    name: 'Formation Node/Edge Topology',
    canonLevel: 'canon',
    claims: [
      {
        text: 'Formations are geometric qi-circuits with explicit node/edge topology. Talismans are single-use qi-storage items. Alchemy follows the recipe-constraint model.',
        source: 'corpus-extension/16_FORMATIONS_TALISMANS_ALCHEMY.md',
      },
    ],
    requires: ['simulation'],
    bindings: [
      { system: 'visual', consumerId: 'visual.vtp-schema', note: 'formation fields carry VTPs' },
          { system: 'simulation', consumerId: 'simulation.formation-core' },
      { system: 'simulation', consumerId: 'simulation.local-law-stack', note: 'formation domains stack into local law' },
    ],
  },
  {
    id: 'canon.storage-treasures',
    name: 'Storage Talismans and Rings',
    canonLevel: 'canon',
    claims: [
      {
        text: 'The most expensive common talisman; the precursor to a storage ring (which is a Core Formation artifact).',
        source: 'corpus-extension/35_CRAFT_CONTENT_CATALOG.md',
      },
    ],
    requires: ['simulation', 'persistence'],
    bindings: [
      { system: 'simulation', consumerId: 'simulation.craft-spec' },
      { system: 'persistence', consumerId: 'persistence.durable-store' },
    ],
  },
  {
    id: 'canon.matter-conservation',
    name: 'Matter Conservation',
    canonLevel: 'canon',
    claims: [
      {
        text: 'Tier transitions are deterministic and conservation-checked (no promotion creates favorable facts; no demotion erases named entities — 49 §4).',
        source: 'engine-architecture/09_ENTITY_RUNTIME_STATE_ARCHITECTURE.md',
      },
    ],
    requires: ['simulation', 'persistence', 'validation'],
    bindings: [
      { system: 'simulation', consumerId: 'simulation.matter-accounting', note: 'conservation core' },
      { system: 'simulation', consumerId: 'simulation.material-composition', note: 'destruction yields correct composition' },
      { system: 'persistence', consumerId: 'persistence.durable-store', note: 'loot/accounting persisted' },
      { system: 'validation', consumerId: 'validation.conformance-runner', note: 'matter-conformance suite' },
    ],
  },

  // -------------------------------------------------------------------------
  // Motion / physics (21, 25, 55)
  // -------------------------------------------------------------------------
  {
    id: 'canon.motion-synchronization',
    name: 'Motion/Effect Synchronized Timing',
    canonLevel: 'canon',
    claims: [
      {
        text: 'Ensure that every moving entity, technique, and supernatural phenomenon is explicitly specified with synchronized timing across animation, VFX, audio, hitbox, and terrain response.',
        source: 'corpus-extension/55_MOTION_AND_EFFECT_GRAMMAR.md',
      },
    ],
    requires: ['motion', 'simulation', 'audio'],
    bindings: [
      { system: 'motion', consumerId: 'motion.grammar' },
      { system: 'simulation', consumerId: 'simulation.combat-arts', note: 'technique timing is simulation-owned' },
      { system: 'audio', consumerId: 'audio.architecture', note: 'audio events share the synchronized timeline' },
    ],
  },
  {
    id: 'canon.physics-determinism',
    name: 'Physics: Jolt Core + Determinism Wrapper',
    canonLevel: 'canon',
    claims: [
      {
        text: 'Physics Engine: Jolt Core + Determinism Wrapper + AI Control',
        source: 'corpus-extension/21_PHYSICS_ENGINE.md',
      },
    ],
    requires: ['simulation', 'validation'],
    bindings: [
      { system: 'simulation', consumerId: 'simulation.physics-spec' },
      { system: 'validation', consumerId: 'validation.determinism-gate' },
    ],
  },
  {
    id: 'canon.fidelity-tiers',
    name: 'S0-S4 Fidelity Tiers',
    canonLevel: 'canon',
    claims: [
      {
        text: 'The simulation has five tiers (S0–S4); each tier simulates a specific subset of entity behaviour at a specific frequency.',
        source: 'engine-architecture/25_SIMULATION_TIERING_RELEVANCE.md',
      },
    ],
    requires: ['simulation', 'persistence'],
    bindings: [
      { system: 'simulation', consumerId: 'simulation.ga-npc', note: 'NPC fidelity tiers' },
      { system: 'persistence', consumerId: 'persistence.tiering-spec' },
    ],
  },

  // -------------------------------------------------------------------------
  // Perception (00 §5, 03, 24) — the "divine sense" family. Universal xianxia
  // term: Divine Sense. The corpus uses its own nomenclature (Residual Error
  // Sense 遺錯之覺, residue perception, ambient qi perception, divination 卜);
  // the UI/UX reference board names the feature "Divine Sense" — that is the
  // canonical English term. Claims below stay verbatim as corpus quotes.
  // -------------------------------------------------------------------------
  {
    id: 'canon.divine-sense',
    name: 'Divine Sense',
    canonLevel: 'canon',
    claims: [
      {
        text: 'Protagonist advantage: Residual Error Sense (遺錯之覺, yícuò zhī jué)',
        source: 'corpus-extension/00_FOUNDATIONAL_DECISIONS.md',
      },
      {
        text: 'Residue perception. You can perceive the qi-residue of recent significant events: where a fight happened, where someone died, where a strong emotion was felt.',
        source: 'corpus-extension/03_REALM_LADDER.md',
      },
    ],
    requires: ['simulation', 'validation'],
    bindings: [
      { system: 'simulation', consumerId: 'simulation.combat-arts', note: 'the divine-sense family is implemented in combat-arts' },
      { system: 'simulation', consumerId: 'simulation.ga-npc', note: 'perception feeds NPC knowledge' },
      { system: 'validation', consumerId: 'validation.conformance-runner', note: 'combat-arts conformance pins the sense' },
    ],
  },
  {
    id: 'canon.qi-sense',
    name: 'Qi Sense',
    canonLevel: 'canon',
    claims: [
      {
        text: 'Ambient qi perception. You can now perceive qi as a faint, flowing presence in the environment: the qi of the river (cool, yin, water-phase), the qi of the noon sun (hot, yang, fire-phase)',
        source: 'corpus-extension/03_REALM_LADDER.md',
      },
    ],
    requires: ['simulation'],
    bindings: [
      { system: 'simulation', consumerId: 'simulation.combat-arts' },
      { system: 'simulation', consumerId: 'simulation.essence-registry', note: 'phase-tagged perception of qi' },
    ],
  },
  {
    id: 'canon.divination',
    name: 'Divination',
    canonLevel: 'canon',
    claims: [
      {
        text: 'Divination (卜) is the perception of qi-residue patterns at temporal scale. A skilled diviner perceives not the future, but the current momentum of the qi-topography',
        source: 'corpus-extension/24_RECONCILIATION_AND_DECISIONS.md',
      },
    ],
    requires: ['simulation'],
    bindings: [
      { system: 'simulation', consumerId: 'simulation.ga-npc', note: 'NPC divination shapes belief' },
      { system: 'simulation', consumerId: 'simulation.history', note: 'temporal-scale perception over event history' },
    ],
  },

  // -------------------------------------------------------------------------
  // Derived: implemented simulation (11)
  // -------------------------------------------------------------------------
  {
    id: 'derived.settlement-daily-life',
    name: 'Settlement Daily Life',
    canonLevel: 'derived',
    claims: [
      {
        text: 'The simulator ticks all NPCs each frame, advancing their schedules, updating their locations',
        source: 'corpus-extension/11_ENGINE_DESIGN.md',
      },
    ],
    requires: ['simulation', 'persistence'],
    bindings: [
      { system: 'simulation', consumerId: 'simulation.settlement-day', note: 'implemented deterministic day' },
      { system: 'persistence', consumerId: 'persistence.durable-store' },
    ],
  },

  // -------------------------------------------------------------------------
  // Metaphysics (30, 38, 44)
  // -------------------------------------------------------------------------
  {
    id: 'canon.heavenly-dao',
    name: 'Heavenly Dao',
    canonLevel: 'canon',
    claims: [
      {
        text: 'Specifies what the Dao IS (distinct from the Nameless Origin), the relationship between them',
        source: 'corpus-extension/44_THE_DAO_AND_THE_ORIGIN.md',
      },
    ],
    requires: ['simulation', 'validation'],
    bindings: [
      { system: 'simulation', consumerId: 'simulation.cosmology-graph', note: 'Dao as the totality of lawful pattern' },
      { system: 'simulation', consumerId: 'simulation.karma', note: 'karma web is the causal expression of Dao' },
      { system: 'validation', consumerId: 'validation.ground-truth' },
    ],
  },
  {
    id: 'canon.soul-anchor',
    name: 'Soul Anchor (Primordial Spirit)',
    canonLevel: 'canon',
    claims: [
      {
        text: 'The anchor can act without the body. The upper dantian becomes the seat of a self-perceiving spirit (元嬰) that can project, retrieve the dead from bardo, possess, and survive the body\'s death if a refuge is prepared.',
        source: 'corpus-extension/30_REALMS_EXPANDED.md',
      },
    ],
    requires: ['simulation', 'persistence'],
    bindings: [
      { system: 'simulation', consumerId: 'simulation.combat-arts', note: 'soul damage and anchor mechanics' },
      { system: 'simulation', consumerId: 'simulation.karma', note: 'karmic identity persists across bodies' },
      { system: 'persistence', consumerId: 'persistence.durable-store' },
    ],
  },
  {
    id: 'canon.underworld',
    name: 'Underworld',
    canonLevel: 'canon',
    claims: [
      {
        text: 'the Underworld as courts sub-jurisdiction',
        source: 'corpus-extension/38_THE_COURTS_OF_HEAVEN.md',
      },
    ],
    requires: ['simulation'],
    bindings: [
      { system: 'simulation', consumerId: 'simulation.karma', note: 'judgment and retribution' },
      { system: 'simulation', consumerId: 'simulation.history', note: 'records of the dead' },
    ],
  },

  // -------------------------------------------------------------------------
  // Derived: emergence directive (docs/emergence-directive.md — engineering
  // doctrine, not corpus; audited like corpus claims)
  // -------------------------------------------------------------------------
  {
    id: 'derived.universal-interaction-lattice',
    name: 'Universal Interaction Lattice',
    canonLevel: 'design',
    claims: [
      {
        text: 'Every meaningful thing in the universe must expose state, affordances, resistances, relationships, consequences, and persistent history.',
        source: 'docs/emergence-directive.md',
      },
    ],
    requires: ['simulation', 'validation'],
    bindings: [
      { system: 'simulation', consumerId: 'simulation.capability-vector', note: 'what an actor can do here' },
      { system: 'validation', consumerId: 'validation.conformance-runner' },
    ],
  },
  {
    id: 'derived.causal-event-fabric',
    name: 'Causal Event Fabric',
    canonLevel: 'design',
    claims: [
      {
        text: 'Don\'t connect every system directly to every other system',
        source: 'docs/emergence-directive.md',
      },
    ],
    requires: ['simulation', 'persistence'],
    bindings: [
      { system: 'simulation', consumerId: 'simulation.loot-accumulator', note: 'MatterRemovedEvent -> collectible matter' },
      { system: 'simulation', consumerId: 'simulation.matter-accounting', note: 'conservation of removed matter' },
      { system: 'persistence', consumerId: 'persistence.durable-store' },
    ],
  },
  {
    id: 'derived.obstacle-attack-axes',
    name: 'Independent Attack Axes',
    canonLevel: 'design',
    claims: [
      {
        text: 'Every obstacle should expose several independent axes of attack',
        source: 'docs/emergence-directive.md',
      },
    ],
    requires: ['simulation', 'validation'],
    bindings: [
      { system: 'simulation', consumerId: 'simulation.local-law-stack', note: 'barrier + formation + energy + owner + terrain' },
      { system: 'simulation', consumerId: 'simulation.terrain-operation-clip' },
      { system: 'validation', consumerId: 'validation.oracle' },
    ],
  },

  {
    id: 'derived.wiki-definition-database',
    name: 'Wiki Definition Database',
    canonLevel: 'design',
    claims: [
      {
        text: 'Tier 1: Definitions (authored concepts)',
        source: 'corpus-extension/49_CONTENT_ARCHITECTURE.md',
      },
    ],
    requires: ['persistence', 'validation'],
    bindings: [
      { system: 'persistence', consumerId: 'persistence.definition-database', note: '278 authored canon entries across 22 layers' },
      { system: 'validation', consumerId: 'validation.conformance-runner', note: 'definition-database conformance suite' },
    ],
  },

  {
    id: 'canon.mortal-realm',
    name: 'Mortal Realm (Complete Cosmos)',
    canonLevel: 'canon',
    claims: [
      {
        text: 'A Mortal Realm is a complete lower-order xianxia cosmos containing ordinary civilization and cultivation civilization simultaneously.',
        source: 'docs/universal-genesis-gauntlet-directive.md',
      },
    ],
    requires: ['simulation', 'generation', 'validation'],
    bindings: [
      { system: 'simulation', consumerId: 'simulation.ecology-spec', note: 'ordinary + spiritual ecology overlap' },
      { system: 'generation', consumerId: 'generation.procedural-pipeline', note: 'patchy planet, not zoned biomes' },
      { system: 'validation', consumerId: 'validation.gauntlet-directive' },
    ],
  },
  {
    id: 'derived.gameplay-clock',
    name: 'Authoritative Gameplay Clock (60 Hz)',
    canonLevel: 'derived',
    claims: [
      {
        text: '60 Hz fixed',
        source: 'docs/universal-genesis-gauntlet-directive.md',
      },
      {
        text: '16.666... ms per tick',
        source: 'docs/universal-genesis-gauntlet-directive.md',
      },
    ],
    requires: ['simulation', 'validation'],
    bindings: [
      { system: 'simulation', consumerId: 'simulation.time-engine', note: 'authoritative tick; render interpolates' },
      { system: 'validation', consumerId: 'validation.gauntlet-directive' },
    ],
  },
  {
    id: 'derived.planetary-cultivation-ecology',
    name: 'Planetary Cultivation Ecology',
    canonLevel: 'derived',
    claims: [
      {
        text: 'Generate interacting continuous fields.',
        source: 'docs/universal-genesis-gauntlet-directive.md',
      },
    ],
    requires: ['generation', 'simulation'],
    bindings: [
      { system: 'generation', consumerId: 'generation.procedural-pipeline', note: 'CultivationEcologyCell field' },
      { system: 'simulation', consumerId: 'simulation.ecology', note: 'spirit-beast civilization ecology' },
    ],
  },

  {
    id: 'derived.xianxia-terminology',
    name: 'Xianxia Terminology (Real, Not a Cheap Copy)',
    canonLevel: 'design',
    claims: [
      {
        text: 'The cultivation ladder has exactly ten stations: Mortal → Qi Induction → Qi Condensation → Foundation Establishment →',
        source: 'corpus-extension/03_REALM_LADDER.md',
      },
    ],
    requires: ['persistence', 'validation'],
    bindings: [
      { system: 'persistence', consumerId: 'persistence.xianxia-glossary', note: 'universal terms Qi Condensation → Soul Formation → Soul Transformation with hanzi' },
      { system: 'validation', consumerId: 'validation.conformance-runner', note: 'every realm def carries standard aliases; glossary ids resolved' },
    ],
  },

  // -------------------------------------------------------------------------
  // Derived: World Fabric / Asset Factory directive (docs/ — companion to the
  // six reference boards in upload/, captioned in upload/image-captions/)
  // -------------------------------------------------------------------------
  {
    id: 'derived.modular-asset-factory',
    name: 'Modular Asset Factory',
    canonLevel: 'design',
    claims: [
      {
        text: 'Strong silhouettes, clean planes, graceful xianxia proportions, readable equipment, and simplified secondary forms.',
        source: 'docs/world-fabric-asset-factory-directive.md',
      },
      {
        text: 'Seamless world streaming, LOD/HLOD, asynchronous derived-artifact compilation, and atomic activation.',
        source: 'docs/world-fabric-asset-factory-directive.md',
      },
    ],
    requires: ['visual', 'generation', 'motion'],
    bindings: [
      { system: 'visual', consumerId: 'visual.asset-factory-directive' },
      { system: 'visual', consumerId: 'visual.vtp-schema' },
      { system: 'generation', consumerId: 'generation.terrain', note: 'smooth voxel terrain factory' },
      { system: 'motion', consumerId: 'motion.grammar', note: 'cloth bones, hair physics, traversal speeds' },
    ],
  },
  {
    id: 'derived.directed-scene-production',
    name: 'Directed Scene Production',
    canonLevel: 'design',
    claims: [
      {
        text: 'The final result is lush, beautiful, and cinematic while remaining performant and readable.',
        source: 'docs/world-fabric-asset-factory-directive.md',
      },
    ],
    requires: ['visual', 'generation', 'motion'],
    bindings: [
      { system: 'visual', consumerId: 'visual.directed-scene-production', note: 'scale registry + set blueprint + director script' },
      { system: 'visual', consumerId: 'visual.asset-factory-directive', note: 'cinematic production doctrine' },
      { system: 'generation', consumerId: 'generation.terrain', note: 'set terrain per scale registry' },
      { system: 'motion', consumerId: 'motion.grammar', note: 'traversal speeds direct camera/dolly pacing' },
    ],
  },
  {
    id: 'derived.scene-universe-slice',
    name: 'Scene Universe Slice',
    canonLevel: 'design',
    claims: [
      {
        text: 'Before generating a scene, retrieve only the relevant part of this enormous graph.',
        source: 'docs/universe-genesis-compiler-directive.md',
      },
    ],    requires: ['visual', 'simulation', 'motion', 'audio', 'validation'],
    bindings: [
      { system: 'visual', consumerId: 'visual.scene-universe-slice', note: 'per-location slice compiler (16 sections, deterministic)' },
      { system: 'simulation', consumerId: 'simulation.ga-npc', note: 'NPC/history + cultivation sections draw resident actors' },
      { system: 'motion', consumerId: 'motion.corpus', note: 'MOTION section harvests corpus entries whose source shot visits the location' },
      { system: 'audio', consumerId: 'audio.architecture', note: 'AUDIO section layers cue ids per location' },
      { system: 'validation', consumerId: 'validation.conformance-runner', note: 'slice completeness is machine-checked' },
    ],
  },
  {
    id: 'derived.perceptual-evidence-examiner',
    name: 'Perceptual Evidence Examiner (Vision Inspection Contract)',
    canonLevel: 'design',
    claims: [
      {
        text: 'Never turn absence of evidence into PASS.',
        source: 'docs/vision-inspection-contract.md',
      },
    ],
    requires: ['visual', 'validation', 'motion'],
    bindings: [
      { system: 'validation', consumerId: 'validation.vision-inspection', note: 'two-stage harness: blind read + contract inspection with pass manifests' },
      { system: 'validation', consumerId: 'validation.oracle', note: 'vision supplies the visual evidence the Oracle rules on' },
      { system: 'visual', consumerId: 'visual.scene-universe-slice', note: 'manifest applies the relevant slice for the inspected location' },
      { system: 'motion', consumerId: 'motion.corpus', note: 'PHASE M temporal inspection uses corpus actions as the expected-motion vocabulary' },
      { system: 'visual', consumerId: 'visual.directed-scene-production', note: 'Director Contract + shot intent are part of the input contract' },
    ],
  },
  {
    id: 'derived.substance-preservation',
    name: 'Substance Preservation (Performance Constitution)',
    canonLevel: 'design',
    claims: [
      {
        text: 'engineering problem — not permission to make the universe smaller.',
        source: 'docs/performance-substance-preservation-directive.md',
      },
    ],
    requires: ['simulation', 'persistence', 'generation'],
    bindings: [
      { system: 'persistence', consumerId: 'performance.substance-preservation', note: 'SEMANTIC DELTA gate + escalation ladder + S4->S0 fidelity ladder are machine-checked' },
      { system: 'simulation', consumerId: 'simulation.time-engine', note: 'simulation LOD = fidelity of computation, never loss of substance' },
      { system: 'simulation', consumerId: 'simulation.ga-npc', note: 'distant NPCs drop to S1/S0 representation, never deletion' },
      { system: 'generation', consumerId: 'generation.terrain', note: 'HLOD/clipmap representation derives from authoritative terrain truth' },
      { system: 'validation', consumerId: 'validation.conformance-runner', note: 'every optimization PR passes the substance-preservation gate' },
    ],
  },
];

export const GENESIS_CONCEPT_COUNT = GENESIS_CONCEPTS.length;
