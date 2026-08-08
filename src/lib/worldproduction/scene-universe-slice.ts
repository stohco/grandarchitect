/**
 * Scene Universe Slice — compiler per Universe Genesis Compiler doc §43.
 *
 * "Before generating a scene, retrieve only the relevant part of this
 * enormous graph." Every scene compiles a Scene Universe Slice: the
 * subset of the universe graph the scene actually touches — cosmology,
 * world law, regional context, history, architecture, formation, ecology,
 * materials, NPC/history, cultivation, economy, motion, audio, gameplay,
 * persistence, validation. The model is not overloaded by the complete
 * universe, but nothing relevant is omitted.
 *
 * The compiler is deterministic: same location -> same slice.
 */

import { WANG_FAMILY_BEND, type SetStructure } from './set-blueprint';
import { QINGHE_MARKET_TOWN } from './set-blueprint-2';
import { ALL_DEFINITIONS } from '../engine/definitions/index';
import { SCALE_REGISTRY } from './scale-registry';
import { EPISODE_1, TOUR_SHOTS, EPISODE_2, EPISODE_3 } from './director-script';
import { MOTION_CORPUS } from './motion-corpus';
import type { SoundCueId } from '../assets/sound/sound-designer';
import { interactionsFor, STRUCTURE_INTERACTIONS, PROP_INTERACTIONS } from './interactions';

export interface SliceSection {
  name: string;
  entries: string[];
}

export interface SceneUniverseSlice {
  locationId: string;
  locationName: string;
  sections: SliceSection[];
}

const ALL_STRUCTURES = [...WANG_FAMILY_BEND.structures, ...QINGHE_MARKET_TOWN.structures];

function findStructure(id: string): SetStructure | undefined {
  return ALL_STRUCTURES.find((s) => s.id === id);
}

const kindToSection: Record<string, string> = {
  realm: 'CULTIVATION',
  technique: 'CULTIVATION',
  cultivation_practice: 'CULTIVATION',
  metaphysical_essence: 'CULTIVATION',
  beast: 'ECOLOGY',
  herb: 'ECOLOGY',
  mineral: 'ECONOMY',
  treasure: 'ECONOMY',
  institution: 'HISTORY',
  event: 'HISTORY',
  location: 'REGIONAL',
  sect: 'REGIONAL',
  npc_role: 'NPC/HISTORY',
  culture: 'ECOLOGY',
  law: 'WORLD LAW',
  cosmological_feature: 'COSMOLOGY',
  formation: 'FORMATION',
};

const SECTIONS: string[] = [
  'COSMOLOGY', 'WORLD LAW', 'REGIONAL', 'HISTORY', 'ARCHITECTURE',
  'FORMATION', 'ECOLOGY', 'MATERIALS', 'NPC/HISTORY', 'CULTIVATION',
  'ECONOMY', 'MOTION', 'AUDIO', 'GAMEPLAY', 'PERSISTENCE', 'VALIDATION',
];

export function compileSceneSlice(locationId: string): SceneUniverseSlice {
  const structure = findStructure(locationId);
  const name = structure?.name ?? locationId;

  const sections: SliceSection[] = SECTIONS.map((name) => ({ name, entries: [] }));

  const push = (section: string, ...entries: string[]) => {
    const s = sections.find((x) => x.name === section);
    if (s) for (const e of entries) if (e && e.length > 0) s.entries.push(e);
  };

  // ---- COSMOLOGY: the vertical stack the location sits in ------------------
  const cosmologyDefs = ALL_DEFINITIONS.filter((d) =>
    d.kind === 'cosmological_feature' || d.kind === 'law' ||
    d.id.includes('sundering') || d.id.includes('cosmic'),
  );
  push('COSMOLOGY', ...cosmologyDefs.slice(0, 4).map((d) => `${d.id}: ${d.name}`));

  // ---- WORLD LAW: what physical law is guaranteed here ---------------------
  const lawDefs = ALL_DEFINITIONS.filter((d) =>
    d.kind === 'law' || d.id.includes('restriction') || d.id.includes('barrier') ||
    d.id.includes('vein'),
  );
  push('WORLD LAW', ...lawDefs.slice(0, 4).map((d) => `${d.id}: ${d.name}`));
  push('WORLD LAW', 'qi density: regional (spirit vein influence)', 'space stability: baseline', 'matter cohesion: standard');

  // ---- REGIONAL: geology, climate, water, the vein -------------------------
  if (structure) {
    push('REGIONAL', `terrain: ${structure.scaleId}`, `orientation: ${structure.orientation}`);
  }
  const regionalDefs = ALL_DEFINITIONS.filter((d) =>
    d.kind === 'location' || d.kind === 'sect',
  );
  push('REGIONAL', ...regionalDefs.slice(0, 3).map((d) => `${d.id}: ${d.name}`));

  // ---- HISTORY: the location's biography -----------------------------------
  const historyDefs = ALL_DEFINITIONS.filter((d) =>
    d.kind === 'event' || d.kind === 'institution' ||
    d.simulationHooks.includes('history'),
  );
  push('HISTORY', ...historyDefs.slice(0, 4).map((d) => `${d.id}: ${d.name}`));

  // ---- ARCHITECTURE: rooms, fixtures, volumes ------------------------------
  if (structure) {
    push('ARCHITECTURE', `construction: ${structure.construction}`, `materials: ${structure.materials.join(', ')}`);
    push('ARCHITECTURE', `footprint: ${structure.w}m x ${structure.d}m, kind: ${structure.kind}`);
    if (structure.rooms.length === 0) push('ARCHITECTURE', 'volume: single open space (no subdivided rooms)');
    for (const room of structure.rooms) {
      push('ARCHITECTURE', `room ${room.id}: ${room.purpose} (${room.w}m x ${room.d}m) — ${room.detail}`);
      for (const f of room.fixtures) {
        push('ARCHITECTURE', `fixture ${f.id}: ${f.name}`);
      }
    }
  }

  // ---- FORMATION: nodes, restrictions, residue -----------------------------
  const formDefs = ALL_DEFINITIONS.filter((d) =>
    d.id.includes('formation') || d.id.includes('array') || d.id.includes('restriction'),
  );
  push('FORMATION', ...formDefs.slice(0, 3).map((d) => `${d.id}: ${d.name}`));
  const formInteractions = Object.entries(STRUCTURE_INTERACTIONS).filter(([k, v]) =>
    k.includes('formation') || v.diagnostic?.includes('formation') || v.canDo.some((c) => c.includes('formation')),
  );
  push('FORMATION', ...formInteractions.slice(0, 2).map(([k, v]) => `${k}: ${v.canDo.join(' / ')}`));

  // ---- ECOLOGY: beasts, herbs, flora ---------------------------------------
  const ecologyDefs = ALL_DEFINITIONS.filter((d) =>
    d.kind === 'beast' || d.kind === 'herb' || d.kind === 'culture',
  );
  push('ECOLOGY', ...ecologyDefs.slice(0, 4).map((d) => `${d.id}: ${d.name}`));

  // ---- MATERIALS: what things are made of here -----------------------------
  if (structure) {
    push('MATERIALS', ...structure.materials.map((m) => `material: ${m}`));
  }
  push('MATERIALS', ...SCALE_REGISTRY.slice(0, 2).map((s) => `scale: ${s.id} ${s.min}-${s.max}m`));

  // ---- NPC/HISTORY: residents, visitors, inheritors ------------------------
  if (structure) {
    for (const r of structure.residents ?? []) push('NPC/HISTORY', `resident: ${r}`);
    if ((structure.residents ?? []).length === 0) {
      push('NPC/HISTORY', 'no resident actors (shared/communal structure)');
    }
  }
  const npcDefs = ALL_DEFINITIONS.filter((d) => d.kind === 'npc_role');
  push('NPC/HISTORY', ...npcDefs.filter((d) => structure?.residents?.includes(d.id) ?? false).map((d) => `${d.id}: ${d.name}`));

  // ---- CULTIVATION: realm, techniques, qi signature ------------------------
  const cultDefs = ALL_DEFINITIONS.filter((d) =>
    ['realm', 'technique', 'cultivation_practice', 'metaphysical_essence'].includes(d.kind),
  );
  push('CULTIVATION', ...cultDefs.slice(0, 4).map((d) => `${d.id}: ${d.name}`));

  // ---- ECONOMY: salvage, provenance, market ---------------------------------
  const econDefs = ALL_DEFINITIONS.filter((d) =>
    d.kind === 'mineral' || d.kind === 'treasure' || d.simulationHooks.includes('economy'),
  );
  push('ECONOMY', ...econDefs.slice(0, 3).map((d) => `${d.id}: ${d.name}`));

  // ---- MOTION: the motion corpus entries whose source shot visits here -----
  const shotsAtLocation = [
    ...EPISODE_1.shots, ...TOUR_SHOTS, ...EPISODE_2.shots, ...EPISODE_3.shots,
  ].filter((s) => s.structureId === locationId);
  const motionHere = MOTION_CORPUS.filter((m) =>
    shotsAtLocation.some((s) => s.id === m.sourceShot),
  );
  push('MOTION', ...motionHere.map((m) => `motion.${m.semanticAction} (${m.level}, from ${m.sourceShot})`));
  if (motionHere.length === 0) push('MOTION', 'player locomotion (walk), robe secondary motion');

  // ---- AUDIO: cue ids layered for this location ----------------------------
  const cues = new Set<SoundCueId>();
  for (const s of shotsAtLocation) for (const c of s.sound ?? []) cues.add(c as SoundCueId);
  push('AUDIO', ...(cues.size > 0 ? [...cues].map((c) => `cue: ${c}`) : ['cue: wind ambience']));

  // ---- GAMEPLAY: verbs the player can do here ------------------------------
  const si = interactionsFor(locationId);
  if (si) push('GAMEPLAY', `structure: ${si.canDo.join(' / ')}`, ...si.systems.map((s) => `system: ${s}`));
  else if (structure) push('GAMEPLAY', 'structure: enter / observe / divine-sense');
  if (structure) {
    for (const room of structure.rooms) {
      for (const f of room.fixtures) {
        const fi = PROP_INTERACTIONS[f.id];
        if (fi) push('GAMEPLAY', `${f.id}: ${fi.canDo.join(' / ')}`);
      }
    }
  }

  // ---- PERSISTENCE: what state changes here survive ------------------------
  push('PERSISTENCE', 'terrain edits (destructible volumetric terrain)', 'item removals (loot)', 'structure damage states');

  // ---- VALIDATION: constraints that must hold for this scene ---------------
  push('VALIDATION', `source: ${locationId} from set blueprint (deterministic)`);
  push('VALIDATION', 'all slice entries drawn from corpus-backed definitions (genesis-bound)');
  push('VALIDATION', 'motion entries must pass visual/physical/contact/timing/rig/gameplay validation before harvest');

  return { locationId, locationName: name, sections };
}

export function sliceForLocation(locationId: string): SceneUniverseSlice {
  return compileSceneSlice(locationId);
}

export function allSceneSlices(): SceneUniverseSlice[] {
  return ALL_STRUCTURES.map((s) => compileSceneSlice(s.id));
}

export const SCENE_SLICE_SECTIONS = SECTIONS;

export function sliceCoverage(locationId: string): { section: string; entries: number }[] {
  return compileSceneSlice(locationId).sections.map((s) => ({ section: s.name, entries: s.entries.length }));
}
