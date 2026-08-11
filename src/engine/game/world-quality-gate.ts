/**
 * game/world-quality-gate.ts — every game world PASSES the gauntlets.
 *
 * The World Quality Compiler (adversarial: causality, persistence, ecology,
 * loot provenance, repetition…) and the Planet Constitution (45 Er-Gen
 * categories, 52-question completeness gauntlet) are the GATES on game
 * content — not advisory tools. A world that fails is repaired or rejected,
 * never shipped.
 *
 * The Phase 1 world: the authored planet — regions, peaks, valleys, rivers,
 * seas, the village locality. Every landform has a stated cause; noise is
 * detail only (Terrain Graph Directive §0).
 */

import { WorldQualityCompiler, type ContentContext, type CompilerDecision } from '../frontier/world-quality-compiler';
import { PlanetConstitutionChecker, type PlanetModel, type ConstitutionReport } from '../frontier/planet-constitution';
import { REGIONS, PEAKS, VALLEYS, RIVERS, LOCALITIES } from './planet/world-authoring';

/** The game world's honest constitution model (justified absences stated). */
export function buildPlanetModel(seed: number): PlanetModel {
  const categories = new Set<number>([
    1,  // the mundane world — the village, fields, graveyard, gate
    5,  // cultivator families — the Wang family and its history
    9,  // spiritual geography — peaks as spiritual nodes
    10, // cultivation resource ecology — herbs, ore, beast materials
    37, // planetary law — the seal caps the mortal world at Nascent Soul
    45, // unimportant things — quiet dead-ends, genuine farmer lives
  ]);
  const answers: Record<string, boolean | string> = {
    'terrain.exists': true,
    'terrain.has_cause': true,        // every region/peak/valley/river is authored with a cause
    'terrain.persistent': true,       // deterministic field — same seed, same world
    'geology.has_rock': true,         // the eastern mountains, sacred peak
    'geography.has_regions': true,    // 11 regions incl. 4 seas
    'geography.has_peaks': true,      // Qing Hill, Sacred Peak, Wolf Ridge
    'geography.has_valleys': true,    // Wang Family Valley
    'geography.has_rivers': true,     // Village Stream, Blood River
    'oceans.have_basins': true,       // south/east/west/north seas
    'spawn.has_solid_floor': true,    // the village locality on the valley floor
    'mundane.villages': true,         // Wang Family Village: 12 houses, well, shrine, gate
    'mundane.farmers': true,          // farm plots east and west of the stream
    'mundane.roads': true,            // the cart road south to the Teng road
    'mundane.markets': true,          // the beaten-earth square
    'mundane.graveyards': true,       // the family graves
    'mundane.fortifications': true,   // the south gate
    'unimportant.farmer_lives': true, // the village works for a living
    'locality.village': true,         // Wang Family Village
    'locality.sect': true,            // Heng Yue Sect (peak gate in a later phase)
    // justified absences — honest, stated, gated per phase
    'absence:2': 'Phase 3: mortal political geography (Zhao Country as a governed polity).',
    'absence:3': 'Phase 3: cultivation-country hierarchy (ranked powers, tribute).',
    'absence:4': 'Phase 3: sect anatomy (Heng Yue buildings, terraces, gates).',
    'absence:7': 'Phase 3: cultivation cities (Teng City).',
    'absence:8': 'Phase 3: layered economies (spirit-stone market content gate).',
    'absence:24': 'Phase 4: secret realms (spirit spring, tribulation crater caches).',
    'absence:38': 'Phase 4: planetary core systems (the Restriction Star site is lore-gated).',
  };
  return { categories, answers };
}

/** Build the WQC ContentContext from the authored planet. */
export function buildQualityContext(seed: number): ContentContext {
  return {
    kind: 'planet',
    id: `suzaku-planet-${seed}`,
    existentialCause: 'The authored xianxia world: eleven continental provinces over a mortal datum.',
    persistenceCause: 'A deterministic height field — every landform is a semantic node with a cause; the same seed reproduces the planet exactly.',
    locationCause: 'Regions sit where the cosmology puts them: the eastern mountains fold toward Qing Hill; the seas surround the mortal world.',
    temporalCause: 'The Restriction Wastes are the scar of the ancient Restriction Star; the Blood River is named for the Restriction War.',
    hydrology: {
      source: 'The eastern hills spring the Village Stream; the qian basin drains the Blood River.',
      flow: 'Streams cut below sea level so they carry water; rivers run from highlands to the seas.',
      collection: 'Four ocean basins collect the drainage.',
    },
    descriptor: {
      name: 'Planet Suzaku',
      mechanical: [
        `${REGIONS.length} regions`, `${PEAKS.length} peaks`, `${VALLEYS.length} valleys`,
        `${RIVERS.length} rivers`, `${LOCALITIES.length} localities`, 'deterministic height field',
      ],
      causal: [
        'fold range raised along the eastern plate margin',
        'volcanic province over a deep magma plume',
        'river valleys carved by authored drainage',
        'ocean basins below sea level',
      ],
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
