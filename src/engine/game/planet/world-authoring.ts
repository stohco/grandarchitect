/**
 * game/planet/world-authoring.ts — the authored planet (Terrain Graph
 * Directive §1: noise is detail only — every landform has a cause).
 *
 * The world is authored in code, exactly as the directive demands:
 *   PLANETARY FORM → SEMANTIC LANDFORMS → MICRO DETAIL
 * Regions, peaks, valleys, rivers, localities are semantic nodes with
 * meaningful parameters — nothing here is rolled.
 */

/** The mortal datum: the planet's nominal ground level (m). */
export const PLANETARY_DATUM = 64;
/** Sea level: the oceans sit below this (m). */
export const SEA_LEVEL = 50;

/** A semantic region (continent-scale province). */
export interface RegionNode {
  id: string;
  name: string;
  hanzi: string;
  type: 'plains' | 'mountain' | 'basin' | 'volcanic' | 'coastal' | 'dead' | 'ocean';
  x: number;
  z: number;
  radius: number;
  base: number;
  rise?: number;
  cause: string; // WQC: why this region exists
}

/** A semantic peak: sharp cone + ridge toward the range spine. */
export interface PeakNode {
  id: string;
  name: string;
  hanzi: string;
  x: number;
  z: number;
  baseRadius: number;
  height: number;
  p: number;        // falloff exponent — higher = sharper
  angle?: number;   // ridge direction (radians)
  cause: string;
}

/** A semantic valley: sheltered depression with a flat floor. */
export interface ValleyNode {
  id: string;
  name: string;
  hanzi: string;
  x: number;
  z: number;
  radius: number;
  depth: number;
  exponent: number; // high = flat center, soft rim
  cause: string;
}

/** A semantic river: carves a V-groove along its polyline. */
export interface RiverNode {
  id: string;
  name: string;
  hanzi: string;
  points: [number, number][];
  width: number;
  depth: number;
  cause: string;
}

/** A locality (spec 12, level 9): the village and other lived places. */
export interface LocalityNode {
  id: string;
  name: string;
  hanzi: string;
  x: number;
  z: number;
  kind: 'village' | 'sect' | 'city' | 'ruin';
  cause: string;
}

export const REGIONS: RegionNode[] = [
  { id: 'zhao_plains', name: 'Zhao Country', hanzi: '赵国', type: 'plains', x: 0, z: 0, radius: 26000, base: 66,
    cause: 'The arable heart of Zhao Country — a shallow sedimentary basin uplifted above the seas.' },
  { id: 'eastern_mountains', name: 'Eastern Mountains', hanzi: '东山山脉', type: 'mountain', x: 18000, z: -6000, radius: 24000, base: 74, rise: 140,
    cause: 'A great north-south fold range raised along the eastern plate margin.' },
  { id: 'southern_plains', name: 'Southern Plains', hanzi: '南平原', type: 'plains', x: -4000, z: 16000, radius: 20000, base: 66,
    cause: 'Fertile farmland south of the central highlands — river sediment flats.' },
  { id: 'qian_basin', name: 'Qian Basin', hanzi: '乾盆地', type: 'basin', x: -22000, z: 30000, radius: 16000, base: 62,
    cause: 'A low basin drained by the Blood River — dry land above the sea, cut by the great gorge.' },
  { id: 'chi_volcano', name: 'Chi Volcanoes', hanzi: '赤火山', type: 'volcanic', x: -32000, z: -16000, radius: 15000, base: 70, rise: 110,
    cause: 'The fire lands — a volcanic province over a deep magma plume, Vermilion Bird territory.' },
  { id: 'song_coast', name: 'Song Coast', hanzi: '宋海岸', type: 'coastal', x: 22000, z: 46000, radius: 12000, base: 68, rise: 60,
    cause: 'Cliffs uplifted over the southern sea — wave-cut headlands.' },
  { id: 'restriction_wastes', name: 'Restriction Wastes', hanzi: '禁星荒原', type: 'dead', x: 0, z: -42000, radius: 12000, base: 58,
    cause: 'The crater of the Restriction Star — a scorched basin where qi died.' },
  { id: 'south_sea', name: 'South Sea', hanzi: '南海', type: 'ocean', x: 0, z: 62000, radius: 30000, base: 20,
    cause: 'The great southern ocean basin — the horizon of the mortal world.' },
  { id: 'east_sea', name: 'East Sea', hanzi: '东海', type: 'ocean', x: 52000, z: 20000, radius: 30000, base: 18,
    cause: 'The eastern sea basin — misty isles beyond the coast.' },
  { id: 'west_sea', name: 'West Sea', hanzi: '西海', type: 'ocean', x: -52000, z: 0, radius: 32000, base: 16,
    cause: 'The western sea — the setting sun path.' },
  { id: 'north_sea', name: 'North Sea', hanzi: '北海', type: 'ocean', x: 0, z: -62000, radius: 30000, base: 14,
    cause: 'The cold northern sea beyond the restriction wastes.' },
];

export const PEAKS: PeakNode[] = [
  { id: 'heng_yue', name: 'Qing Hill', hanzi: '青峰', x: 30000, z: -5000, baseRadius: 4200, height: 260, p: 2.6, angle: 0.7,
    cause: "Heng Yue Sect's mountain — a defensible spiritual node commanding the east." },
  { id: 'sacred_peak', name: 'Sacred Peak', hanzi: '神岳', x: -16000, z: -6000, baseRadius: 6000, height: 640, p: 3.0, angle: 2.2,
    cause: 'The highest peak of the mortal world — the ancestor shrine of Zhao.' },
  { id: 'wolf_ridge', name: 'Wolf Ridge', hanzi: '狼脊', x: 560, z: 40, baseRadius: 260, height: 42, p: 2.0, angle: 1.1,
    cause: 'The low ridge east of the village where the wolves watch — clear of the stream course so the water runs true.' },
];

export const VALLEYS: ValleyNode[] = [
  { id: 'village_valley', name: 'Wang Family Valley', hanzi: '王家谷', x: 256, z: -128, radius: 900, depth: 5, exponent: 5,
    cause: 'A wide, very gentle sheltered valley cut by the Village Stream — the village sits on a near-flat floor.' },
];

export const RIVERS: RiverNode[] = [
  { id: 'village_stream', name: 'Village Stream', hanzi: '溪', width: 5, depth: 11,
    points: [[900, -340], [600, -280], [380, -220], [282, -140], [268, -60], [270, 60], [290, 200], [360, 360], [430, 520]],
    cause: 'Springs at the eastern hills and runs past the village, cut below sea level so it carries water.' },
  { id: 'blood_river', name: 'Blood River', hanzi: '血河', width: 46, depth: 18,
    points: [[-9000, 15000], [-14000, 18000], [-20000, 20000], [-26000, 21500], [-32000, 24500], [-38000, 28000]],
    cause: "The iron-red river that drains the whole basin — cut deep below sea level, a true river in a gorge. Named for the Restriction War." },
];

export const LOCALITIES: LocalityNode[] = [
  { id: 'wang_village', name: 'Wang Family Village', hanzi: '王家村', x: 256, z: -128, kind: 'village',
    cause: 'The sheltered mortal hamlet on the stream bank — Wang Lin\'s birthplace.' },
  { id: 'heng_yue_sect', name: 'Heng Yue Sect', hanzi: '恒岳派', x: 30000, z: -5000, kind: 'sect',
    cause: 'The mountain sect on Qing Hill — a spiritual node above the mortal world.' },
];
