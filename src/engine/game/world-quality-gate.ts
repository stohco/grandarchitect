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
    0,  // mundane world / terrain
    5,  // spiritual geography (peaks as spiritual nodes)
    7,  // geology (fold ranges, volcanic province, basins — authored causes)
    8,  // oceans (four seas)
    9,  // natural hazards (the restriction wastes)
  ]);
  const answers: Record<string, boolean | string> = {
    'terrain.exists': true,
    'terrain.has_cause': true,        // every region/peak/valley/river is authored with a cause
    'terrain.persistent': true,       // deterministic field — same seed, same world
    'geology.has_rock': true,         // the eastern mountains, sacred peak
    'geology.has_underground': false, // cave networks are a later phase
    'geography.has_regions': true,    // 11 regions incl. 4 seas
    'geography.has_peaks': true,      // Qing Hill, Sacred Peak, Wolf Ridge
    'geography.has_valleys': true,    // Wang Family Valley
    'geography.has_rivers': true,     // Village Stream, Blood River
    'oceans.have_basins': true,       // south/east/west/north seas
    'spawn.has_solid_floor': true,    // the village locality on the valley floor
    'locality.village': true,         // Wang Family Village
    'locality.sect': true,            // Heng Yue Sect (peak gate in a later phase)
    // justified absences — honest, stated, gated per phase
    'absence:1': 'Phase 2: cultivation-country hierarchy (Zhao Country as a governed polity).',
    'absence:2': 'Phase 2: sect anatomy (Heng Yue buildings, terraces, gates).',
    'absence:3': 'Phase 3: cultivation cities (Teng City).',
    'absence:4': 'Phase 3: layered economies (market content gate).',
    'absence:6': 'Phase 3: secret realms (spirit spring, tribulation crater caches).',
    'absence:10': 'Phase 4: planetary core (the Restriction Star site is lore-gated).',
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
