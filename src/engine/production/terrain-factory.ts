/**
 * Terrain Factory — Production Types
 * ==================================
 *
 * Implements the smooth voxel terrain system from the production bible
 * (Section 11-15). Terrain is NOT cubes — it's smooth destructible
 * volumetric terrain with material layers, biomes, and vegetation.
 *
 * Key requirements:
 *   - Three-scale form language (macro/meso/micro)
 *   - Authoritative density field → smooth render mesh → collision → nav
 *   - Material layers driven by slope, height, curvature, moisture
 *   - Destruction with material-specific debris
 *   - 8+ biome kits (Mortal River Valley, Cloud Immortal Peak, etc.)
 *   - Vegetation in ecological families with LOD
 */

// ---------------------------------------------------------------------------
// Terrain Form Scales (Section 11)
// ---------------------------------------------------------------------------

export type TerrainScale = 'macro' | 'meso' | 'micro';

export interface TerrainFormFeatures {
  macro: string[]; // 256m-8km: mountain ranges, basins, river systems
  meso: string[];  // 8-256m: cliffs, ridges, terraces, ravines
  micro: string[]; // 1cm-8m: rock breakup, roots, gravel, moss
}

// ---------------------------------------------------------------------------
// Terrain Materials (Section 13)
// ---------------------------------------------------------------------------

export type TerrainMaterialLayer =
  | 'topsoil' | 'exposed_earth' | 'base_rock' | 'cliff_face'
  | 'wet_variant' | 'moss_lichen' | 'snow_ash_sand'
  | 'supernatural_layer' | 'destruction_cut_face';

export interface TerrainMaterialStack {
  layers: TerrainMaterialLayer[];
  /** Anti-tiling methods. */
  macroVariationM: [number, number]; // 8-64m
  mediumBreakupM: [number, number];   // 1-8m
  microNormalsCm: [number, number];   // 2-30cm
  triplanarProjection: boolean;
  rotatedTextureSampling: boolean;
}

// ---------------------------------------------------------------------------
// Biome Kits (Section 14)
// ---------------------------------------------------------------------------

export type BiomeId =
  | 'mortal_river_valley' | 'cloud_immortal_peak' | 'ancient_sword_scar'
  | 'alchemy_volcanic_basin' | 'ghost_marsh' | 'star_desert'
  | 'spirit_ocean_archipelago' | 'frozen_tribulation_plateau';

export interface BiomeKit {
  biomeId: BiomeId;
  name: string;
  features: TerrainFormFeatures;
  materials: string[];
  vegetation: string[];
  weatherProfiles: string[];
  creatures: string[];
  structures: string[];
  destructionBehavior: {
    densityCellNearM: number;
    cutFaceMaterial: string;
    debrisFamily: string;
  };
}

export const BIOME_KITS: readonly BiomeKit[] = [
  {
    biomeId: 'mortal_river_valley',
    name: 'Mortal River Valley',
    features: {
      macro: ['river valley', 'drainage basin', 'terraced hills'],
      meso: ['farm terraces', 'slate cliffs', 'villages', 'bridges', 'shrines'],
      micro: ['muddy banks', 'roots', 'gravel', 'wildflowers'],
    },
    materials: ['topsoil', 'slate_rock', 'mud', 'grass', 'river_stone'],
    vegetation: ['pine_mix', 'deciduous_mix', 'bamboo', 'river_reeds'],
    weatherProfiles: ['clear_morning', 'misty_dawn', 'summer_rain'],
    creatures: ['river_fish', 'wild_rabbit', 'mortal_wolf', 'migratory_birds'],
    structures: ['village_cottage', 'farm_house', 'stone_bridge', 'road_shrine'],
    destructionBehavior: { densityCellNearM: 0.5, cutFaceMaterial: 'soil_and_slate', debrisFamily: 'brown_rock' },
  },
  {
    biomeId: 'cloud_immortal_peak',
    name: 'Cloud Immortal Peak',
    features: {
      macro: ['granite mountain range', 'cloud sea', 'floating islands'],
      meso: ['cliff paths', 'suspended bridges', 'sect halls', 'cave abodes', 'waterfalls'],
      micro: ['pale granite cracks', 'spirit vein crystals', 'wind-swept moss'],
    },
    materials: ['pale_granite', 'cloud_mist', 'spirit_vein', 'snow_dust'],
    vegetation: ['wind_pine', 'cloud_grass', 'white_spirit_flower'],
    weatherProfiles: ['clear_high_altitude', 'cloud_surge', 'thunder_tribulation'],
    creatures: ['cloud_crane', 'spirit_hawk', 'peak_guardian'],
    structures: ['sect_gate', 'scripture_pavilion', 'cliff_cave_abode', 'meditation_platform'],
    destructionBehavior: { densityCellNearM: 0.25, cutFaceMaterial: 'granite_fresh', debrisFamily: 'pale_granite' },
  },
  {
    biomeId: 'ancient_sword_scar',
    name: 'Ancient Sword Scar',
    features: {
      macro: ['kilometre-scale cleft', 'vitrified rock walls'],
      meso: ['ruined watchtowers', 'metallic dust dunes', 'sword-intent particles'],
      micro: ['glass shards', 'metallic gravel', 'fused stone'],
    },
    materials: ['vitrified_rock', 'metallic_dust', 'fused_stone'],
    vegetation: ['dead_trees', 'sword_grass'],
    weatherProfiles: ['eternal_dusk', 'sword_intent_wind'],
    creatures: ['sword_spirit', 'undying_guardian'],
    structures: ['ruined_watchtower', 'broken_altar'],
    destructionBehavior: { densityCellNearM: 0.25, cutFaceMaterial: 'vitrified_rock', debrisFamily: 'glass_shards' },
  },
  {
    biomeId: 'alchemy_volcanic_basin',
    name: 'Alchemy Volcanic Basin',
    features: {
      macro: ['volcanic caldera', 'sulfur terraces'],
      meso: ['obsidian cliffs', 'geothermal pools', 'herb gardens', 'pill furnaces'],
      micro: ['sulfur crystals', 'red_ash', 'obsidian_shards'],
    },
    materials: ['obsidian', 'sulfur', 'red_ash', 'basalt'],
    vegetation: ['red_grass', 'fire_lotus', 'sulfur_moss'],
    weatherProfiles: ['volcanic_glow', 'ash_storm', 'clear_smoky'],
    creatures: ['fire_serpent', 'magma_beast', 'spirit_toad'],
    structures: ['alchemy_hall', 'pill_furnace', 'stone_platform'],
    destructionBehavior: { densityCellNearM: 0.25, cutFaceMaterial: 'obsidian', debrisFamily: 'black_glass' },
  },
  {
    biomeId: 'ghost_marsh',
    name: 'Ghost Marsh',
    features: {
      macro: ['black water marshland', 'drowned forest'],
      meso: ['hidden paths', 'corpse lanterns', 'pale reeds'],
      micro: ['rotten wood', 'black_mud', 'pale_fungi'],
    },
    materials: ['black_mud', 'rotten_wood', 'pale_reed', 'mist'],
    vegetation: ['drowned_trees', 'pale_reeds', 'ghost_moss'],
    weatherProfiles: ['eternal_mist', 'ghost_fog', 'pale_moonlight'],
    creatures: ['marsh_ghost', 'drowned_spirit', 'pale_serpent'],
    structures: ['broken_shrine', 'sunken_altar', 'corpse_lantern'],
    destructionBehavior: { densityCellNearM: 0.5, cutFaceMaterial: 'black_mud', debrisFamily: 'rotten_wood' },
  },
  {
    biomeId: 'star_desert',
    name: 'Star Desert',
    features: {
      macro: ['giant dunes', 'glass fields', 'buried cities'],
      meso: ['meteor craters', 'ruined walls', 'aurora-lit rocks'],
      micro: ['sand_grains', 'glass_shards', 'meteor_iron_flecks'],
    },
    materials: ['star_sand', 'desert_glass', 'meteor_iron'],
    vegetation: ['desert_thorn', 'glass_cactus'],
    weatherProfiles: ['aurora_night', 'sand_storm', 'blazing_day'],
    creatures: ['sand_worm', 'glass_scorpion', 'star_beast'],
    structures: ['buried_city_ruin', 'meteor_altar'],
    destructionBehavior: { densityCellNearM: 0.5, cutFaceMaterial: 'star_sand', debrisFamily: 'glass_shards' },
  },
  {
    biomeId: 'spirit_ocean_archipelago',
    name: 'Spirit Ocean Archipelago',
    features: {
      macro: ['limestone towers', 'coral shelves', 'moving islands'],
      meso: ['sea_caves', 'ship_routes', 'coral_platforms'],
      micro: ['coral_fragments', 'shell_gravel', 'salt_crystals'],
    },
    materials: ['limestone', 'coral', 'sea_sand', 'salt_rock'],
    vegetation: ['mangrove', 'sea_grass', 'spirit_kelp'],
    weatherProfiles: ['clear_ocean', 'storm_surge', 'spirit_tide'],
    creatures: ['sea_serpent', 'spirit_turtle', 'flying_fish'],
    structures: ['ocean_sect_harbor', 'lighthouse', 'coral_shrine'],
    destructionBehavior: { densityCellNearM: 0.5, cutFaceMaterial: 'limestone', debrisFamily: 'coral_fragments' },
  },
  {
    biomeId: 'frozen_tribulation_plateau',
    name: 'Frozen Tribulation Plateau',
    features: {
      macro: ['blue ice plateau', 'lightning scars', 'frozen peaks'],
      meso: ['ice shelves', 'frozen beasts', 'exposed black stone'],
      micro: ['ice_crystals', 'frozen_gravel', 'lightning_glass'],
    },
    materials: ['blue_ice', 'black_stone', 'frozen_gravel', 'lightning_glass'],
    vegetation: ['frozen_pine', 'ice_flower'],
    weatherProfiles: ['blizzard', 'lightning_storm', 'clear_frozen'],
    creatures: ['frozen_beast', 'ice_spirit', 'lightning_wyrm'],
    structures: ['frozen_altar', 'ice_cave_abode'],
    destructionBehavior: { densityCellNearM: 0.25, cutFaceMaterial: 'blue_ice', debrisFamily: 'ice_shards' },
  },
] as const;

// ---------------------------------------------------------------------------
// Vegetation Factory (Section 15)
// ---------------------------------------------------------------------------

export type VegetationGrowthStage =
  | 'sapling' | 'young' | 'mature_a' | 'mature_b' | 'mature_c'
  | 'ancient' | 'dead' | 'fallen_log' | 'stump' | 'broken_destroyed';

export interface VegetationSpecies {
  speciesId: string;
  name: string;
  growthStages: VegetationGrowthStage[];
  /** LOD strategy. */
  lod0: string; // full branch cards/meshes
  lod1: string; // simplified crown
  lod2: string; // merged crown
  lod3: string; // billboard/impostor
  windResponse: 'full' | 'reduced_with_distance' | 'none';
}
