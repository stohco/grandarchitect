/**
 * Consumer Registry — the machine-audited set of Genesis consumers.
 *
 * Every consumer is a REAL file on disk (runtime module or spec document).
 * The coverage gate verifies existence; a binding to a consumer whose file
 * vanished is a coverage failure.
 */

import type { GenesisConsumer, GenesisSystem } from './genesis-types';

export const CONSUMERS: GenesisConsumer[] = [
  // ---- generation -------------------------------------------------------
  {
    id: 'generation.terrain',
    system: 'generation',
    kind: 'runtime',
    path: 'src/engine/frontier/terrain-plugin.ts',
    description: 'Deterministic terrain generation (blueprint features, rivers, zones)',
  },
  {
    id: 'generation.procedural-pipeline',
    system: 'generation',
    kind: 'spec',
    path: 'corpus-extension/07_PROCEDURAL_GENERATION_IMPLICATIONS.md',
    description: '13-stage procedural generation pipeline spec',
  },
  // ---- simulation -------------------------------------------------------
  {
    id: 'simulation.settlement-day',
    system: 'simulation',
    kind: 'runtime',
    path: 'src/engine/simulation/settlement-day.ts',
    description: 'Deterministic settlement daily-life simulation',
  },
  {
    id: 'simulation.ecology',
    system: 'simulation',
    kind: 'runtime',
    path: 'src/engine/plugins/simulation/ga-ecology.ts',
    description: 'Ecology simulation (carrying capacity, herb patches)',
  },
  {
    id: 'simulation.cultivation',
    system: 'simulation',
    kind: 'runtime',
    path: 'src/engine/plugins/simulation/ga-cultivation.ts',
    description: 'Cultivation progression simulation',
  },
  {
    id: 'simulation.combat-arts',
    system: 'simulation',
    kind: 'runtime',
    path: 'src/engine/plugins/simulation/ga-combat-arts.ts',
    description: 'Combat arts core (divine sense, flying swords, stances)',
  },
  {
    id: 'simulation.history',
    system: 'simulation',
    kind: 'runtime',
    path: 'src/engine/plugins/simulation/ga-history.ts',
    description: 'Historical event simulation',
  },
  {
    id: 'simulation.time-engine',
    system: 'simulation',
    kind: 'runtime',
    path: 'src/engine/cosmos/time-engine.ts',
    description: 'Deterministic time engine (local time rates)',
  },
  {
    id: 'simulation.karma',
    system: 'simulation',
    kind: 'runtime',
    path: 'src/engine/cosmos/karma-engine.ts',
    description: 'Karma web simulation',
  },
  {
    id: 'simulation.laws',
    system: 'simulation',
    kind: 'runtime',
    path: 'src/engine/laws/law-interaction-solver.ts',
    description: 'Law interaction solver (realm law profiles, capability vectors, law stacks)',
  },
  {
    id: 'simulation.formation-core',
    system: 'simulation',
    kind: 'runtime',
    path: 'src/engine/laws/formation-core.ts',
    description: 'Formation core simulation',
  },
  {
    id: 'simulation.matter-accounting',
    system: 'simulation',
    kind: 'runtime',
    path: 'src/engine/world/matter/matter-accounting.ts',
    description: 'Deterministic matter accounting (conservation core)',
  },
  {
    id: 'simulation.material-composition',
    system: 'simulation',
    kind: 'runtime',
    path: 'src/engine/world/matter/material-composition.ts',
    description: 'Material composition model (mass, hardness, recovery)',
  },
  {
    id: 'simulation.ga-combat',
    system: 'simulation',
    kind: 'runtime',
    path: 'src/engine/plugins/simulation/ga-combat.ts',
    description: 'Combat simulation (timing, qi routing, phase matchup)',
  },
  {
    id: 'simulation.ga-quest',
    system: 'simulation',
    kind: 'runtime',
    path: 'src/engine/plugins/simulation/ga-quest.ts',
    description: 'Quest simulation',
  },
  {
    id: 'simulation.ga-economy',
    system: 'simulation',
    kind: 'runtime',
    path: 'src/engine/plugins/simulation/ga-economy.ts',
    description: 'Economy simulation (trade, spirit stones)',
  },
  {
    id: 'simulation.ga-npc',
    system: 'simulation',
    kind: 'runtime',
    path: 'src/engine/plugins/simulation/ga-npc-simulator.ts',
    description: 'NPC simulator (needs, personality-biased action weighting)',
  },
  {
    id: 'simulation.gen-settlement',
    system: 'simulation',
    kind: 'runtime',
    path: 'src/engine/plugins/simulation/ga-gen-settlement.ts',
    description: 'Settlement generation',
  },
  {
    id: 'simulation.gen-npc',
    system: 'simulation',
    kind: 'runtime',
    path: 'src/engine/plugins/simulation/ga-gen-npc.ts',
    description: 'NPC generation',
  },
  {
    id: 'simulation.steps-ladder',
    system: 'simulation',
    kind: 'runtime',
    path: 'src/engine/cosmos/steps-ladder.ts',
    description: 'Steps ladder (realm progression steps)',
  },
  {
    id: 'simulation.cosmology-graph',
    system: 'simulation',
    kind: 'runtime',
    path: 'src/engine/cosmos/cosmology-graph.ts',
    description: 'Cosmology graph (strata, worlds, anchors)',
  },
  {
    id: 'simulation.essence-registry',
    system: 'simulation',
    kind: 'runtime',
    path: 'src/engine/cosmos/essence-registry.ts',
    description: 'Essence registry (five phases, qi/ran)',
  },
  {
    id: 'simulation.capability-vector',
    system: 'simulation',
    kind: 'runtime',
    path: 'src/engine/laws/capability-vector.ts',
    description: 'Capability vectors (what an actor can do here)',
  },
  {
    id: 'simulation.realm-law-profile',
    system: 'simulation',
    kind: 'runtime',
    path: 'src/engine/laws/realm-law-profile.ts',
    description: 'Realm law profiles (per-stratum law)',
  },
  {
    id: 'simulation.local-law-stack',
    system: 'simulation',
    kind: 'runtime',
    path: 'src/engine/laws/local-law-stack.ts',
    description: 'Local law stack (realm + world + regional + formation)',
  },
  {
    id: 'simulation.terrain-operation-clip',
    system: 'simulation',
    kind: 'runtime',
    path: 'src/engine/laws/terrain-operation-clip.ts',
    description: 'Terrain operation clipping by law/formation',
  },
  {
    id: 'simulation.loot-accumulator',
    system: 'simulation',
    kind: 'runtime',
    path: 'src/engine/world/matter/loot-accumulator.ts',
    description: 'Loot accumulation from destruction',
  },
  {
    id: 'simulation.matter-sink',
    system: 'simulation',
    kind: 'runtime',
    path: 'src/engine/world/matter/matter-sink.ts',
    description: 'Matter sink (consumed/converted matter)',
  },
  {
    id: 'simulation.recovery-profile',
    system: 'simulation',
    kind: 'runtime',
    path: 'src/engine/world/matter/recovery-profile.ts',
    description: 'Material recovery profiles',
  },
  {
    id: 'simulation.physics-spec',
    system: 'simulation',
    kind: 'spec',
    path: 'corpus-extension/21_PHYSICS_ENGINE.md',
    description: 'Physics engine spec (Jolt core + determinism wrapper)',
  },
  {
    id: 'simulation.ecology-spec',
    system: 'simulation',
    kind: 'spec',
    path: 'engine-architecture/28_ECOLOGY_DEMOGRAPHY.md',
    description: 'Ecology/demography spec (S4->S2->S0 aggregation)',
  },
  {
    id: 'simulation.history-spec',
    system: 'simulation',
    kind: 'spec',
    path: 'engine-architecture/30_HISTORY_EVENT_SIMULATION.md',
    description: 'History event simulation spec',
  },
  {
    id: 'simulation.craft-spec',
    system: 'simulation',
    kind: 'spec',
    path: 'corpus-extension/35_CRAFT_CONTENT_CATALOG.md',
    description: 'Craft content catalog (pills, talismans, treasures)',
  },
  // ---- motion -----------------------------------------------------------
  {
    id: 'motion.grammar',
    system: 'motion',
    kind: 'spec',
    path: 'corpus-extension/55_MOTION_AND_EFFECT_GRAMMAR.md',
    description: 'Motion/Effect Grammar (MotionProfiles, TechniquePackets, 5-layer sync)',
  },
  // ---- visual -----------------------------------------------------------
  {
    id: 'visual.vtp-schema',
    system: 'visual',
    kind: 'spec',
    path: 'corpus-extension/51_VISUAL_TRUTH_PACKET_SCHEMA.md',
    description: 'Visual Truth Packet schema',
  },
  {
    id: 'visual.style-grammars',
    system: 'visual',
    kind: 'spec',
    path: 'corpus-extension/53_STYLE_GRAMMARS.md',
    description: 'Style grammars per culture',
  },
  {
    id: 'visual.asset-factory-directive',
    system: 'visual',
    kind: 'spec',
    path: 'docs/world-fabric-asset-factory-directive.md',
    description: 'World Fabric / Asset Factory Master Directive v2 (companion to the six reference boards)',
  },
  {
    id: 'visual.directed-scene-production',
    system: 'visual',
    kind: 'runtime',
    path: 'src/lib/worldproduction/index.ts',
    description: 'Directed world production: scale registry, set blueprint, director script, world hierarchy',
  },
  // ---- audio ------------------------------------------------------------
  {
    id: 'audio.architecture',
    system: 'audio',
    kind: 'spec',
    path: 'engine-architecture/19_AUDIO_MUSIC_ARCHITECTURE.md',
    description: 'Audio/music architecture (distance + tier LOD)',
  },
  // ---- gameplay ---------------------------------------------------------
  {
    id: 'gameplay.interaction-layer',
    system: 'gameplay',
    kind: 'spec',
    path: 'corpus-extension/22_AI_INTERACTION_LAYER.md',
    description: 'Player interaction layer spec',
  },
  // ---- persistence ------------------------------------------------------
  {
    id: 'persistence.streaming',
    system: 'persistence',
    kind: 'spec',
    path: 'engine-architecture/12_WORLD_PARTITIONING_STREAMING.md',
    description: 'Spatial hierarchy + streaming + S0-S4 fidelity tiers',
  },
  {
    id: 'persistence.durable-store',
    system: 'persistence',
    kind: 'runtime',
    path: 'src/engine/architect/authorial/durable-store.ts',
    description: 'Durable JSON store (decision ledgers, compiled bible)',
  },
  {
    id: 'persistence.definition-database',
    system: 'persistence',
    kind: 'runtime',
    path: 'src/lib/engine/definitions/index.ts',
    description: 'Wiki-scale Definition Database (429 authored canon entries)',
  },
  {
    id: 'persistence.xianxia-glossary',
    system: 'persistence',
    kind: 'runtime',
    path: 'src/lib/engine/definitions/xianxia-glossary.ts',
    description: 'Universal xianxia terminology registry (standard ladder + hanzi)',
  },
  {
    id: 'persistence.tiering-spec',
    system: 'persistence',
    kind: 'spec',
    path: 'engine-architecture/25_SIMULATION_TIERING_RELEVANCE.md',
    description: 'S0-S4 fidelity tier spec (transition determinism)',
  },
  // ---- validation -------------------------------------------------------
  {
    id: 'validation.oracle',
    system: 'validation',
    kind: 'spec',
    path: 'corpus-extension/54_VISUAL_ACCURACY_ORACLE.md',
    description: 'Visual Accuracy Oracle (reviewer roles, rejection rule)',
  },
  {
    id: 'validation.conformance-runner',
    system: 'validation',
    kind: 'runtime',
    path: 'scripts/run-conformance.ts',
    description: 'Canonical conformance runner (CONFORMANCE_FILES)',
  },
  {
    id: 'validation.determinism-gate',
    system: 'validation',
    kind: 'runtime',
    path: 'scripts/check-determinism-unity.ts',
    description: 'check:determinism gate (no Math.random in engine code)',
  },
  {
    id: 'validation.ground-truth',
    system: 'validation',
    kind: 'spec',
    path: 'corpus-extension/50_GROUND_TRUTH_SYSTEM_SPECIFICATION.md',
    description: 'Ground Truth System (5 truth levels, statuses, reviewer roles)',
  },
  {
    id: 'validation.measurement-spec',
    system: 'validation',
    kind: 'spec',
    path: 'corpus-extension/52_MEASUREMENT_AND_SCALE_SYSTEM.md',
    description: 'SI measurement + scale system spec',
  },
  {
    id: 'validation.golden-scenes',
    system: 'validation',
    kind: 'spec',
    path: 'corpus-extension/06_GOLDEN_SCENES.md',
    description: 'Golden scenes (art-direction targets, not scripts)',
  },
  {
    id: 'validation.gauntlet-directive',
    system: 'validation',
    kind: 'spec',
    path: 'docs/universal-genesis-gauntlet-directive.md',
    description: 'Universal Genesis Production Gauntlet directive (80 passes, 10 rings)',
  },
];

const BY_ID = new Map(CONSUMERS.map((c) => [c.id, c]));
const BY_SYSTEM = new Map<GenesisSystem, GenesisConsumer[]>();
for (const c of CONSUMERS) {
  const list = BY_SYSTEM.get(c.system) ?? [];
  list.push(c);
  BY_SYSTEM.set(c.system, list);
}

export function getConsumer(id: string): GenesisConsumer | undefined {
  return BY_ID.get(id);
}

export function consumersForSystem(system: GenesisSystem): GenesisConsumer[] {
  return BY_SYSTEM.get(system) ?? [];
}

export function consumerExists(id: string): boolean {
  const c = BY_ID.get(id);
  return c !== undefined;
}
