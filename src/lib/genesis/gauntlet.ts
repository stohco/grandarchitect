/**
 * Universal Genesis Production Gauntlet — 80 passes, 10 rings × 8.
 *
 * Per the directive (docs/universal-genesis-gauntlet-directive.md):
 * every domain that can affect what exists, how it behaves, how the player
 * interacts with it, how it moves, how it is presented, how it persists,
 * and how it performs must have an explicit Genesis pass or machine
 * validator. Passes are NOT all LLM prompts — kinds are generative,
 * compiler, simulation, validator, and director. Each pass declares its
 * three outputs (director / executable / proof) and binds to real
 * consumers. The invariant is coverage, not the sacred number 80 — the
 * registry is designed to grow (pass 81+ whenever the Bible gains a new
 * causal domain).
 */

import type { GenesisSystem } from './genesis-types';

export type GauntletRing =
  | 'authorial' | 'physical' | 'living' | 'xianxia' | 'gameplay'
  | 'animation' | 'cinematic' | 'engine' | 'production' | 'planetary';

export type GauntletPassKind = 'generative' | 'compiler' | 'simulation' | 'validator' | 'director';

export type GauntletOutput = 'director' | 'executable' | 'proof';

export interface GauntletPass {
  id: string;
  ring: GauntletRing;
  name: string;
  kind: GauntletPassKind;
  /** what this pass produces. */
  outputs: GauntletOutput[];
  /** systems it affects (genesis system ids). */
  systems: GenesisSystem[];
  /** consumer ids from the genesis consumer registry. */
  consumers: string[];
  note?: string;
}

const D = 'validation.gauntlet-directive';

export const GAUNTLET_RINGS: Record<GauntletRing, string> = {
  authorial: 'Authorial, Canonical and Cinematic Truth',
  physical: 'Physical Planet and Environment',
  living: 'Civilization and the Living World',
  xianxia: 'Xianxia Metaphysical Reality',
  gameplay: 'Gameplay and Interactivity',
  animation: 'Animation and Performance',
  cinematic: 'Cinematic, Sound and Presentation',
  engine: 'Engine and Runtime',
  production: 'Production, Validation and Reuse',
  planetary: 'Planetary Cultivation Ecology',
};

const P = (ring: GauntletRing, n: number, name: string, kind: GauntletPassKind, systems: GenesisSystem[], consumers: string[], outputs: GauntletOutput[] = ['director', 'executable', 'proof'], note?: string): GauntletPass => ({
  id: `pass.${String(n).padStart(2, '0')}`, ring, name, kind, systems, consumers, outputs, note,
});

export const GAUNTLET: GauntletPass[] = [
  // Ring I — authorial
  P('authorial', 1, 'Authorial Intent', 'director', ['generation', 'validation'], [D], ['director', 'executable', 'proof'], 'emotional/narrative/worldbuilding/gameplay/production/library purposes'),
  P('authorial', 2, 'Canon and Ontology', 'validator', ['validation', 'simulation'], [D, 'validation.ground-truth']),
  P('authorial', 3, 'Cosmological Placement', 'compiler', ['simulation', 'persistence'], [D, 'simulation.cosmology-graph', 'persistence.streaming']),
  P('authorial', 4, 'Temporal Placement', 'compiler', ['simulation', 'persistence'], [D, 'simulation.time-engine']),
  P('authorial', 5, 'Causal History', 'compiler', ['simulation', 'persistence'], [D, 'simulation.history', 'persistence.durable-store']),
  P('authorial', 6, 'Cultural and Regional Identity', 'generative', ['generation', 'visual'], [D, 'visual.style-grammars', 'generation.procedural-pipeline']),
  P('authorial', 7, 'Perceptual Hierarchy', 'director', ['visual', 'motion'], [D, 'visual.vtp-schema', 'motion.grammar']),
  P('authorial', 8, 'Forbidden Interpretations', 'validator', ['validation'], [D, 'validation.oracle']),
  // Ring II — physical
  P('physical', 9, 'Planetary Geography and Geology', 'generative', ['generation', 'simulation'], [D, 'generation.terrain']),
  P('physical', 10, 'Terrain Geometry and Topology', 'compiler', ['generation', 'simulation'], [D, 'generation.terrain', 'simulation.terrain-operation-clip']),
  P('physical', 11, 'Hydrology', 'simulation', ['simulation', 'generation'], [D, 'simulation.ecology-spec']),
  P('physical', 12, 'Atmosphere, Weather and Climate', 'simulation', ['simulation', 'visual'], [D, 'simulation.ecology-spec']),
  P('physical', 13, 'Material Truth', 'compiler', ['simulation', 'gameplay'], [D, 'simulation.material-composition', 'simulation.matter-accounting']),
  P('physical', 14, 'Vegetation and Plant Ecology', 'generative', ['simulation', 'generation'], [D, 'simulation.ecology', 'generation.terrain']),
  P('physical', 15, 'Animal and Spirit-Beast Ecology', 'simulation', ['simulation', 'motion'], [D, 'simulation.ecology', 'motion.grammar']),
  P('physical', 16, 'Environmental Aging and Microdetail', 'generative', ['visual', 'generation'], [D, 'visual.asset-factory-directive', 'visual.directed-scene-production']),
  // Ring III — living
  P('living', 17, 'Demography and Households', 'simulation', ['simulation', 'persistence'], [D, 'simulation.ga-npc', 'simulation.settlement-day']),
  P('living', 18, 'Individual Personhood', 'generative', ['simulation', 'persistence'], [D, 'simulation.ga-npc', 'persistence.definition-database']),
  P('living', 19, 'Cognition and Decision Making', 'simulation', ['simulation'], [D, 'simulation.ga-npc']),
  P('living', 20, 'Knowledge, Memory, Rumor and Error', 'simulation', ['simulation', 'persistence'], [D, 'simulation.ga-npc', 'persistence.durable-store']),
  P('living', 21, 'Relationships and Institutions', 'simulation', ['simulation'], [D, 'simulation.history', 'simulation.ga-npc']),
  P('living', 22, 'Economy, Logistics and Ownership', 'simulation', ['simulation', 'gameplay'], [D, 'simulation.ga-economy']),
  P('living', 23, 'Ordinary Work and Domestic Life', 'director', ['motion', 'simulation'], [D, 'motion.grammar', 'simulation.settlement-day', 'visual.directed-scene-production']),
  P('living', 24, 'Event and Historical Emergence', 'simulation', ['simulation', 'persistence'], [D, 'simulation.history', 'simulation.ga-quest']),
  // Ring IV — xianxia
  P('xianxia', 25, 'Qi Ecology', 'simulation', ['simulation', 'generation'], [D, 'simulation.ecology', 'generation.terrain']),
  P('xianxia', 26, 'Cultivator Internal State', 'simulation', ['simulation'], [D, 'simulation.cultivation', 'simulation.combat-arts']),
  P('xianxia', 27, 'Realm and World Laws', 'compiler', ['simulation', 'motion'], [D, 'simulation.laws', 'simulation.realm-law-profile', 'motion.grammar']),
  P('xianxia', 28, 'Techniques and Arts', 'compiler', ['simulation', 'motion'], [D, 'simulation.ga-combat', 'motion.grammar', 'simulation.craft-spec']),
  P('xianxia', 29, 'Formations and Restrictions', 'compiler', ['simulation'], [D, 'simulation.formation-core', 'simulation.local-law-stack']),
  P('xianxia', 30, 'Artifacts, Equipment, Storage and Craft', 'generative', ['simulation', 'gameplay'], [D, 'simulation.craft-spec', 'simulation.ga-economy']),
  P('xianxia', 31, 'Souls, Spirits, Karma and Non-Physical Beings', 'compiler', ['simulation', 'persistence'], [D, 'simulation.karma', 'simulation.combat-arts']),
  P('xianxia', 32, 'Cosmic and Transcendent Implications', 'validator', ['simulation'], [D, 'simulation.cosmology-graph']),
  // Ring V — gameplay
  P('gameplay', 33, 'Universal Affordance Lattice', 'compiler', ['gameplay', 'simulation'], [D, 'simulation.capability-vector', 'visual.directed-scene-production']),
  P('gameplay', 34, 'Destruction, Terraforming and Construction', 'simulation', ['simulation', 'generation'], [D, 'simulation.terrain-operation-clip', 'simulation.matter-sink']),
  P('gameplay', 35, 'Resource Conservation and Loot Recovery', 'compiler', ['simulation', 'persistence'], [D, 'simulation.matter-accounting', 'simulation.loot-accumulator']),
  P('gameplay', 36, 'Physics and Structural Consequences', 'simulation', ['simulation'], [D, 'simulation.physics-spec']),
  P('gameplay', 37, 'Traversal and Navigation', 'compiler', ['simulation', 'gameplay'], [D, 'simulation.physics-spec', 'persistence.streaming']),
  P('gameplay', 38, 'Combat, Injury and Death', 'simulation', ['simulation'], [D, 'simulation.ga-combat', 'simulation.combat-arts']),
  P('gameplay', 39, 'Social Gameplay', 'simulation', ['simulation', 'gameplay'], [D, 'simulation.ga-npc', 'simulation.ga-quest']),
  P('gameplay', 40, 'Progression, Inventory, Equipment, UI and Controls', 'compiler', ['gameplay', 'visual'], [D, 'visual.directed-scene-production', 'simulation.craft-spec']),
  // Ring VI — animation
  P('animation', 41, 'Body, Rig and Morphology', 'generative', ['motion'], [D, 'motion.grammar', 'visual.directed-scene-production']),
  P('animation', 42, 'Intent and Locomotion', 'director', ['motion', 'simulation'], [D, 'motion.grammar']),
  P('animation', 43, 'Environment-Aware Motion', 'director', ['motion', 'gameplay'], [D, 'motion.grammar', 'simulation.physics-spec']),
  P('animation', 44, 'Interaction Contacts', 'validator', ['motion', 'gameplay'], [D, 'motion.grammar']),
  P('animation', 45, 'Combat and Technique Animation', 'director', ['motion', 'simulation'], [D, 'motion.grammar', 'simulation.ga-combat']),
  P('animation', 46, 'Face, Gaze, Hands and Dialogue', 'director', ['motion', 'audio'], [D, 'motion.grammar', 'audio.architecture']),
  P('animation', 47, 'Secondary Motion', 'generative', ['motion', 'visual'], [D, 'motion.grammar', 'visual.asset-factory-directive']),
  P('animation', 48, 'Non-Humanoid and World Motion', 'generative', ['motion'], [D, 'motion.grammar']),
  // Ring VII — cinematic
  P('cinematic', 49, 'Cinematography', 'director', ['visual', 'motion'], [D, 'visual.directed-scene-production']),
  P('cinematic', 50, 'Lighting', 'director', ['visual'], [D, 'visual.directed-scene-production', 'visual.vtp-schema']),
  P('cinematic', 51, 'Material and Shader Presentation', 'compiler', ['visual'], [D, 'visual.vtp-schema', 'visual.asset-factory-directive']),
  P('cinematic', 52, 'VFX', 'generative', ['visual', 'motion'], [D, 'motion.grammar']),
  P('cinematic', 53, 'World Sound', 'generative', ['audio'], [D, 'audio.architecture', 'visual.directed-scene-production']),
  P('cinematic', 54, 'Dialogue, Voice and Narration', 'director', ['audio', 'visual'], [D, 'visual.directed-scene-production']),
  P('cinematic', 55, 'Music', 'director', ['audio'], [D, 'audio.architecture']),
  P('cinematic', 56, 'Perceived-Time Direction', 'compiler', ['simulation', 'visual'], [D, 'simulation.time-engine', 'visual.directed-scene-production']),
  // Ring VIII — engine
  P('engine', 57, 'Authority and Determinism', 'validator', ['simulation', 'persistence'], [D, 'validation.determinism-gate', 'persistence.durable-store']),
  P('engine', 58, 'Physics Runtime', 'compiler', ['simulation'], [D, 'simulation.physics-spec', 'simulation.material-composition']),
  P('engine', 59, 'Navigation Runtime', 'compiler', ['simulation'], [D, 'simulation.physics-spec', 'persistence.streaming']),
  P('engine', 60, 'Streaming and World Partition', 'compiler', ['persistence', 'visual'], [D, 'persistence.streaming']),
  P('engine', 61, 'Renderer and GPU Representation', 'compiler', ['visual', 'persistence'], [D, 'persistence.streaming', 'visual.asset-factory-directive']),
  P('engine', 62, 'Simulation LOD', 'compiler', ['simulation', 'persistence'], [D, 'persistence.tiering-spec']),
  P('engine', 63, 'Persistence, Save, Replay and Revision', 'compiler', ['persistence'], [D, 'persistence.durable-store', 'persistence.tiering-spec']),
  P('engine', 64, 'Jobs, Workers and Concurrency', 'compiler', ['simulation', 'persistence'], [D, 'persistence.streaming']),
  // Ring IX — production
  P('production', 65, 'Studio / Director Integration', 'compiler', ['visual', 'persistence'], [D, 'visual.directed-scene-production']),
  P('production', 66, 'Comment and Revision Grounding', 'compiler', ['persistence', 'validation'], [D, 'visual.directed-scene-production', 'persistence.durable-store']),
  P('production', 67, 'Visual Oracle', 'validator', ['validation', 'visual'], [D, 'validation.oracle', 'validation.golden-scenes']),
  P('production', 68, 'Physical and Interaction Oracle', 'validator', ['validation', 'gameplay'], [D, 'validation.oracle', 'visual.directed-scene-production']),
  P('production', 69, 'Emergence Oracle', 'validator', ['validation', 'simulation'], [D, 'validation.conformance-runner']),
  P('production', 70, 'Animation Adaptation Oracle', 'validator', ['validation', 'motion'], [D, 'validation.oracle', 'motion.grammar']),
  P('production', 71, 'Library Harvesting', 'compiler', ['persistence', 'motion'], [D, 'visual.directed-scene-production']),
  P('production', 72, 'Release / Completeness / Performance Gate', 'validator', ['validation', 'gameplay'], [D, 'validation.conformance-runner']),
  // Ring X — planetary cultivation ecology
  P('planetary', 73, 'Planetary Population Topology', 'generative', ['generation', 'simulation'], [D, 'generation.procedural-pipeline', 'simulation.ecology-spec']),
  P('planetary', 74, 'Qi / Spirit-Vein / Resource Geography', 'generative', ['generation', 'simulation'], [D, 'generation.terrain', 'simulation.ecology']),
  P('planetary', 75, 'Cultivation Institution Topology', 'generative', ['simulation'], [D, 'simulation.gen-settlement', 'simulation.history']),
  P('planetary', 76, 'Mortal–Cultivator Interface', 'simulation', ['simulation', 'gameplay'], [D, 'simulation.ga-npc', 'simulation.ga-economy']),
  P('planetary', 77, 'Spirit-Beast Civilization Ecology', 'simulation', ['simulation'], [D, 'simulation.ecology', 'simulation.ecology-spec']),
  P('planetary', 78, 'Concealment / Access / Perception', 'compiler', ['simulation'], [D, 'simulation.formation-core', 'simulation.laws'], ['director', 'executable', 'proof'], 'perceptual thresholds are simulation-owned (divine sense, mortal blindness)'),
  P('planetary', 79, 'Cultivation Political Economy & Jurisdiction', 'simulation', ['simulation'], [D, 'simulation.ga-economy', 'simulation.history']),
  P('planetary', 80, 'Cross-Stratum Encounter Generation', 'director', ['simulation', 'visual'], [D, 'visual.directed-scene-production', 'simulation.ga-quest', 'visual.scene-universe-slice'], ['director', 'executable', 'proof'], 'encounter staging must compile from the scene universe slice (doc 43)'),
];

export const GAUNTLET_PASS_COUNT = GAUNTLET.length;
export const GAUNTLET_RING_COUNT = Object.keys(GAUNTLET_RINGS).length;
