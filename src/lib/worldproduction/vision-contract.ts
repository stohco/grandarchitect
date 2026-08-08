/**
 * Vision Inspection Contract — the pass-driven obligation manifest.
 *
 * Per the Vision Inspection Contract design: the 80 Genesis passes tell
 * Vision what must be true; Vision tells the system what the pixels show.
 * This module compiles a compact per-inspection manifest: the applicable
 * gauntlet passes with their perceptual obligations, derived from the real
 * GAUNTLET registry (names/ids) and the Scene Universe Slice for the
 * inspected location. The vision agent evaluates ONLY the perceptual
 * projection of each pass — never the simulation itself.
 */

import { GAUNTLET, type GauntletPass } from '../genesis/gauntlet';
import { compileSceneSlice } from './scene-universe-slice';

export interface VisualObligation {
  /** gauntlet pass id, e.g. 'pass.07'. */
  passId: string;
  /** display id, e.g. 'P07'. */
  displayId: string;
  name: string;
  ring: string;
  /** what the player must be ABLE TO SEE for this pass to hold. */
  visualObligation: string;
  /** passes vision cannot project — simulation-only evidence. */
  notVisuallyEvaluable?: boolean;
}

/** Pass-level perceptual obligations (subset of the 80 — only what pixels can show). */
export const VISUAL_OBLIGATIONS: VisualObligation[] = [
  { passId: 'pass.07', displayId: 'P07', name: 'Perceptual Hierarchy', ring: 'authorial',
    visualObligation: 'The primary read is what the director intended (e.g. inhabited village); secondary elements (sect mountain, sky) must not compete visually.' },
  { passId: 'pass.08', displayId: 'P08', name: 'Forbidden Interpretations', ring: 'authorial',
    visualObligation: 'No visual implies a world capability the project rules forbid (no modern anachronisms, no generic fantasy contamination, no outside-canon motifs).' },
  { passId: 'pass.09', displayId: 'P09', name: 'Planetary Geography and Geology', ring: 'physical',
    visualObligation: 'The region reads as real geology: macro/meso/micro structure, embedded rocks, soil transitions — not a heightmap prototype.' },
  { passId: 'pass.10', displayId: 'P10', name: 'Terrain Geometry and Topology', ring: 'physical',
    visualObligation: 'Valley/slope/cliff structure is visible; terrain contacts structures cleanly; no floating or hovering geometry.' },
  { passId: 'pass.11', displayId: 'P11', name: 'Hydrology', ring: 'physical',
    visualObligation: 'Water reads causally: shoreline integration, level, current, reflections; streams follow terrain, not arbitrary paths.' },
  { passId: 'pass.12', displayId: 'P12', name: 'Atmosphere, Weather and Climate', ring: 'physical',
    visualObligation: 'Fog/atmospheric perspective behaves by distance; weather is coherent; fog must not hide unfinished geometry.' },
  { passId: 'pass.13', displayId: 'P13', name: 'Material Truth', ring: 'physical',
    visualObligation: 'Materials read as what they are (thatch, rammed earth, wood, stone) with weathering, contact wear and age — not flat procedural noise.' },
  { passId: 'pass.14', displayId: 'P14', name: 'Vegetation and Plant Ecology', ring: 'physical',
    visualObligation: 'Vegetation follows moisture/slope/sunlight; species and age vary; riparian edges differ from hillsides; no uniform biome paint.' },
  { passId: 'pass.15', displayId: 'P15', name: 'Animal and Spirit-Beast Ecology', ring: 'physical',
    visualObligation: 'Creatures appear with habitat context (nests, trails, feeding); spirit beasts sit in ecological context, not random decoration.' },
  { passId: 'pass.16', displayId: 'P16', name: 'Environmental Aging and Microdetail', ring: 'physical',
    visualObligation: 'Wear, moss, dirt, repair history, use patterns visible; surfaces tell age and use; no clean-empty lived spaces.' },
  { passId: 'pass.18', displayId: 'P18', name: 'Individual Personhood', ring: 'living',
    visualObligation: 'Foreground NPCs have distinct clothing, posture, activity and attention — no mannequin behavior or repeated clones.' },
  { passId: 'pass.22', displayId: 'P22', name: 'Economy, Logistics and Ownership', ring: 'living',
    visualObligation: 'Markets/workshops visibly communicate storage, transport, goods handling and use — stalls with stock, containers, carts, logistics.' },
  { passId: 'pass.23', displayId: 'P23', name: 'Ordinary Work and Domestic Life', ring: 'living',
    visualObligation: 'Daily life is visible: cooking, laundry, tools at work, crops tended — causal occupation, not decorative props.' },
  { passId: 'pass.25', displayId: 'P25', name: 'Qi Ecology', ring: 'xianxia',
    visualObligation: 'Spirit-vein/qi phenomena have an identifiable source, react to environment, obey Style Grammar — not generic neon magic.' },
  { passId: 'pass.27', displayId: 'P27', name: 'Realm and World Laws', ring: 'xianxia',
    visualObligation: 'Supernatural results communicate the law that produced them (protected volume resists while surroundings destroyed); no implication of unsupported capabilities.' },
  { passId: 'pass.29', displayId: 'P29', name: 'Formations and Restrictions', ring: 'xianxia',
    visualObligation: 'Formation nodes/volumes read when they should be perceivable; effects have sources and obey grammar; no generic glow.' },
  { passId: 'pass.33', displayId: 'P33', name: 'Universal Affordance Lattice', ring: 'gameplay',
    visualObligation: 'Doors, containers, tools, trees, loose resources read as physically usable; walkable/climbable space is legible without UI markers.' },
  { passId: 'pass.36', displayId: 'P36', name: 'Physics and Structural Consequences', ring: 'gameplay',
    visualObligation: 'Structures show load paths, support and debris logic; no floating roofs, paper-thin walls, or impossible intersections.' },
  { passId: 'pass.41', displayId: 'P41', name: 'Body, Rig and Morphology', ring: 'animation',
    visualObligation: 'Character proportions and equipment fit the approved body spec; no toy proportions, bad modular fit, or floating attachments.' },
  { passId: 'pass.43', displayId: 'P43', name: 'Environment-Aware Motion', ring: 'animation',
    visualObligation: 'Feet adapt to slope/stairs; NPCs avoid props and each other; no foot skating or penetration where temporal evidence exists.' },
  { passId: 'pass.47', displayId: 'P47', name: 'Secondary Motion', ring: 'animation',
    visualObligation: 'Cloth, hair, equipment move believably when temporal evidence exists — robe settles after the body, not with it.' },
  { passId: 'pass.49', displayId: 'P49', name: 'Cinematography', ring: 'cinematic',
    visualObligation: 'The composition reads as directed: focal hierarchy, framing, sightlines, lens language match the Director Contract.' },
  { passId: 'pass.50', displayId: 'P50', name: 'Lighting', ring: 'cinematic',
    visualObligation: 'Light direction, warm/cool contrast, key/fill/rim relationships match the shot intent; faces and materials read; no flat or crushed lighting.' },
  { passId: 'pass.51', displayId: 'P51', name: 'Material and Shader Presentation', ring: 'cinematic',
    visualObligation: 'Painterly hand-painted language, edge language, value structure; no generic-shader, asset-store, or photoreal-vs-neighbors mismatch.' },
  { passId: 'pass.52', displayId: 'P52', name: 'VFX', ring: 'cinematic',
    visualObligation: 'Effects have sources, obey Style Grammar, react to environment; no generic neon magic or glow without source.' },
  { passId: 'pass.53', displayId: 'P53', name: 'World Sound', ring: 'cinematic',
    visualObligation: 'NOT visually evaluable from a still frame; audio evidence required.', notVisuallyEvaluable: true },
  { passId: 'pass.60', displayId: 'P60', name: 'Streaming and World Partition', ring: 'engine',
    visualObligation: 'No visible LOD pop, streaming-in geometry, or draw-distance seams in the frame.' },
  { passId: 'pass.61', displayId: 'P61', name: 'Renderer and GPU Representation', ring: 'engine',
    visualObligation: 'No z-fighting, T-junctions, TAA ghosting, shimmering, moire, depth-sorting errors, or backface errors.' },
  { passId: 'pass.67', displayId: 'P67', name: 'Visual Oracle', ring: 'production',
    visualObligation: 'No visible proxy geometry or Art Bible violations in the final frame; the scene reads at its intended production level.' },
  { passId: 'pass.72', displayId: 'P72', name: 'Release / Completeness / Performance Gate', ring: 'production',
    visualObligation: 'No mandatory visual blockers; completeness at every depth shell; 60fps evaluated separately (not from a still).' },
  { passId: 'pass.78', displayId: 'P78', name: 'Concealment / Access / Perception', ring: 'planetary',
    visualObligation: 'Hidden sects read as persistent mist to mortals, as an outer ward to a disciple, as a folded mountain to an elder — same coordinates, different access.' },
  { passId: 'pass.80', displayId: 'P80', name: 'Cross-Stratum Encounter Generation', ring: 'planetary',
    visualObligation: 'An encounter scene visually communicates the strata involved (mortal ground vs cultivator presence) without importing generic xianxia assumptions.' },
];

const OBLIGATION_BY_PASS = new Map(VISUAL_OBLIGATIONS.map((o) => [o.passId, o]));
const PASS_BY_ID = new Map(GAUNTLET.map((p) => [p.id, p]));

/** Passes that have a perceptual projection (subset of the 80). */
export function visuallyEvaluablePasses(): GauntletPass[] {
  return GAUNTLET.filter((p) => OBLIGATION_BY_PASS.has(p.id));
}

export interface InspectionManifest {
  inspectionId: string;
  worldRevision: number;
  timestamp: number;
  locationId?: string;
  shotId?: string;
  applicablePasses: Array<{ id: string; name: string; ring: string; visualObligation: string }>;
  notEvaluablePasses: Array<{ id: string; name: string; reason: string }>;
}

/** Pick the passes applicable to a location by matching its Scene Universe
 *  Slice sections against the obligation set (deterministic). */
export function applicablePassesForLocation(locationId: string): Array<{ id: string; name: string; ring: string; visualObligation: string }> {
  const slice = compileSceneSlice(locationId);
  const sections = new Set(slice.sections.filter((s) => s.entries.length > 0).map((s) => s.name));
  const selected: Array<{ id: string; name: string; ring: string; visualObligation: string }> = [];

  const sectionGate: Array<[string, string[]]> = [
    ['REGIONAL', ['pass.09', 'pass.10']],
    ['WORLD LAW', ['pass.27']],
    ['ECOLOGY', ['pass.14', 'pass.15']],
    ['MATERIALS', ['pass.13', 'pass.51']],
    ['ARCHITECTURE', ['pass.36']],
    ['FORMATION', ['pass.29', 'pass.25']],
    ['NPC/HISTORY', ['pass.18', 'pass.23']],
    ['ECONOMY', ['pass.22']],
    ['MOTION', ['pass.43', 'pass.47']],
    ['AUDIO', ['pass.53']],
    ['GAMEPLAY', ['pass.33']],
    ['COSMOLOGY', ['pass.78']],
  ];
  for (const [section, passIds] of sectionGate) {
    if (!sections.has(section)) continue;
    for (const pid of passIds) {
      const o = OBLIGATION_BY_PASS.get(pid);
      if (o && !o.notVisuallyEvaluable) {
        selected.push({ id: o.displayId, name: o.name, ring: o.ring, visualObligation: o.visualObligation });
      }
    }
  }
  // universal production/cinematic obligations every frame must satisfy
  for (const pid of ['pass.07', 'pass.08', 'pass.49', 'pass.50', 'pass.67', 'pass.72', 'pass.61', 'pass.60']) {
    const o = OBLIGATION_BY_PASS.get(pid);
    if (o && !selected.some((s) => s.id === o.displayId)) {
      selected.push({ id: o.displayId, name: o.name, ring: o.ring, visualObligation: o.visualObligation });
    }
  }
  return selected;
}

export function buildInspectionManifest(opts: {
  inspectionId: string;
  worldRevision: number;
  timestamp: number;
  locationId?: string;
  shotId?: string;
}): InspectionManifest {
  const locationPasses = opts.locationId ? applicablePassesForLocation(opts.locationId) : [];
  const notEvaluable = VISUAL_OBLIGATIONS
    .filter((o) => o.notVisuallyEvaluable)
    .map((o) => ({ id: o.displayId, name: o.name, reason: o.visualObligation }));

  const applicablePasses = locationPasses.length > 0
    ? locationPasses
    : ['pass.07', 'pass.08', 'pass.10', 'pass.13', 'pass.36', 'pass.49', 'pass.50', 'pass.61', 'pass.67', 'pass.72']
        .map((pid) => {
          const o = OBLIGATION_BY_PASS.get(pid);
          const g = PASS_BY_ID.get(pid);
          return o && g ? { id: o.displayId, name: o.name, ring: o.ring, visualObligation: o.visualObligation } : null;
        })
        .filter((x): x is { id: string; name: string; ring: string; visualObligation: string } => x !== null);

  return {
    inspectionId: opts.inspectionId,
    worldRevision: opts.worldRevision,
    timestamp: opts.timestamp,
    locationId: opts.locationId,
    shotId: opts.shotId,
    applicablePasses,
    notEvaluablePasses: notEvaluable,
  };
}

/** Render the manifest as compact JSON for prompt injection. */
export function renderInspectionManifest(m: InspectionManifest): string {
  return JSON.stringify({ ...m, applicablePasses: m.applicablePasses, notEvaluablePasses: m.notEvaluablePasses }, null, 2);
}
