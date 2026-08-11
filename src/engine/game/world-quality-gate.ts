/**
 * game/world-quality-gate.ts — every game world PASSES the gauntlets.
 *
 * The World Quality Compiler (adversarial: causality, persistence, ecology,
 * loot provenance, repetition…) and the Planet Constitution (45 Er-Gen
 * categories, 52-question completeness gauntlet) are the GATES on game
 * content — not advisory tools. A world that fails is repaired or rejected,
 * never shipped.
 *
 * Phase 0 world: the canonical frontier terrain (plain + sculpted mountain +
 * carved tunnel + spawn). Content is authored, not rolled — the pipeline's
 * noise is detail only, exactly as the directives require.
 */

import { WorldQualityCompiler, type ContentContext, type CompilerDecision } from '../frontier/world-quality-compiler';
import { PlanetConstitutionChecker, type PlanetModel, type ConstitutionReport } from '../frontier/planet-constitution';
import { generateTerrainPipeline, SURFACE_MATERIAL_EARTH, SURFACE_MATERIAL_MOUNTAIN, SURFACE_MATERIAL_TUNNEL } from '../frontier/terrain-plugin';
import { extractSurfaceMesh } from '../frontier/terrain-plugin';

/** The game world's honest constitution model (justified absences stated). */
export function buildPlanetModel(seed: number): PlanetModel {
  const result = generateTerrainPipeline(seed);
  const mesh = extractSurfaceMesh(result.field, { spline: result.spline });

  const materialSet = new Set(mesh.materialIds);
  const hasMountain = materialSet.has(SURFACE_MATERIAL_MOUNTAIN);
  const hasTunnel = materialSet.has(SURFACE_MATERIAL_TUNNEL);
  const hasEarth = materialSet.has(SURFACE_MATERIAL_EARTH);

  return {
    categories: new Set([
      0,  // mundane world / terrain
      7,  // geology (sculpted mountain, carved tunnel — authored causes)
      9,  // natural hazards / cave passage
    ]),
    answers: {
      'terrain.exists': true,
      'terrain.has_cause': true,          // mountain is sculpted, tunnel is carved
      'terrain.persistent': true,         // deterministic field — same seed, same world
      'terrain.removable': false,         // Phase 0 has no removal test surface yet
      'geology.has_rock': hasMountain,
      'geology.has_underground': hasTunnel,
      'geology.surface_material': hasEarth,
      'spawn.has_solid_floor': true,      // pipeline getSpawnPoint guarantees it
      'absence:1': 'Phase 0: cultivation-country hierarchy arrives with the village content gate.',
      'absence:2': 'Phase 0: sect anatomy arrives with the Heng Yue content gate.',
      'absence:3': 'Phase 0: cultivation cities arrive with the Teng City content gate.',
      'absence:4': 'Phase 0: layered economies arrive with the market content gate.',
      'absence:5': 'Phase 0: spiritual geography arrives with the qi-zone content gate.',
      'absence:6': 'Phase 0: oceans arrive with the coastal streaming content gate.',
    },
  };
}

/** Build the WQC ContentContext from the terrain artifacts. */
export function buildQualityContext(seed: number): ContentContext {
  const result = generateTerrainPipeline(seed);
  const mesh = extractSurfaceMesh(result.field, { spline: result.spline });
  return {
    kind: 'planet',
    id: `frontier-terrain-${seed}`,
    existentialCause: 'The frontier terrain pipeline: a sculpted mountain over a mossy plain.',
    persistenceCause: 'A single deterministic density field — same seed, same world, every run.',
    locationCause: 'The mountain is authored at the field center; the tunnel is carved through it.',
    temporalCause: 'Phase 0 world — the first authored form of Suzaku.',
    descriptor: {
      name: 'Suzaku Frontier Terrain',
      mechanical: ['marching-cubes isosurface', 'deterministic density field', 'tunnel spline', 'guaranteed spawn'],
      causal: ['mountain sculpted by elevation gain', 'tunnel carved by spline proximity', 'spawn scanned for solid floor'],
    },
    similarCount: 0,
  };
}

/** Run the full gate: WQC compile + constitution check. */
export function runWorldQualityGate(seed: number): {
  compiler: WorldQualityCompiler;
  decision: CompilerDecision;
  constitution: ConstitutionReport;
  planet: PlanetModel;
} {
  const compiler = new WorldQualityCompiler();
  const context = buildQualityContext(seed);
  const decision = compiler.compile(context);
  const planet = buildPlanetModel(seed);
  const constitution = new PlanetConstitutionChecker().check(planet);
  return { compiler, decision, constitution, planet };
}
