/**
 * Structure Factory — Production Types
 * =====================================
 *
 * Implements the hybrid structure system from the production bible
 * (Section 16-19). Structures combine volumetric terrain foundations
 * with modular architectural meshes.
 *
 * Key requirements:
 *   - 0.5m snap grid for architecture, 0.1m sub-grid for props
 *   - Volumetric terrain handles foundations, stone masses, cliffs
 *   - Modular meshes handle roofs, timber frames, columns, doors
 *   - Every structure supports: clean, aged, damaged, ruined, spirit_charged
 *   - 22+ required structure kits (cottage to immortal palace)
 *   - Structural load hierarchy (roofs need walls, columns carry beams)
 */

// ---------------------------------------------------------------------------
// Scale Grid (Section 16)
// ---------------------------------------------------------------------------

export const ARCHITECTURE_GRID_M = 0.5;
export const PROP_SUBGRID_M = 0.1;

export interface ArchitectureScaleStandard {
  interiorDoor: { widthM: [number, number]; heightM: [number, number] };
  grandSectDoor: { widthM: [number, number]; heightM: [number, number] };
  corridor: { domesticM: [number, number]; publicM: [number, number] };
  stairRiserM: [number, number];
  stairTreadM: [number, number];
  handrailM: [number, number];
  ceilingDomesticM: [number, number];
  ceilingCeremonialM: [number, number];
  columnSpacingOrdinaryM: [number, number];
  columnSpacingMonumentalM: [number, number];
  roofEaveOverhangM: [number, number];
  villageRoomModule: string;
  sectHallBay: string[];
  roadFootPathM: [number, number];
  roadCartRoadM: [number, number];
  roadProcessionalM: [number, number];
  bridgeRailingM: [number, number];
  marketStallCounterM: [number, number];
}

export const SCALE_STANDARD: ArchitectureScaleStandard = {
  interiorDoor: { widthM: [1.0, 1.2], heightM: [2.2, 2.5] },
  grandSectDoor: { widthM: [3, 8], heightM: [5, 15] },
  corridor: { domesticM: [1.5, 2.5], publicM: [3, 8] },
  stairRiserM: [0.15, 0.18],
  stairTreadM: [0.28, 0.34],
  handrailM: [0.9, 1.05],
  ceilingDomesticM: [2.7, 3.4],
  ceilingCeremonialM: [5, 20],
  columnSpacingOrdinaryM: [3, 5],
  columnSpacingMonumentalM: [6, 12],
  roofEaveOverhangM: [0.8, 1.8],
  villageRoomModule: '3×3m or 4×4m',
  sectHallBay: ['4×4m', '6×6m', '8×8m'],
  roadFootPathM: [2, 3],
  roadCartRoadM: [4, 7],
  roadProcessionalM: [8, 16],
  bridgeRailingM: [1.0, 1.2],
  marketStallCounterM: [0.85, 1.0],
};

// ---------------------------------------------------------------------------
// Structure Module Types (Section 17)
// ---------------------------------------------------------------------------

export type StructureModuleType =
  | 'foundation' | 'floor' | 'column' | 'beam' | 'bracket'
  | 'wall' | 'door' | 'window'
  | 'roof_corner' | 'roof_edge' | 'roof_ridge'
  | 'stair' | 'railing' | 'balcony' | 'trim'
  | 'interior_partition'
  | 'destruction_pieces' | 'collision_proxy';

export interface StructureModule {
  moduleType: StructureModuleType;
  moduleId: string;
  /** Grid dimensions in 0.5m units. */
  gridDimensions: [number, number, number];
  /** Materials assigned. */
  materials: string[];
  /** LOD count. */
  lodCount: number;
}

// ---------------------------------------------------------------------------
// Damage States (Section 18)
// ---------------------------------------------------------------------------

export type StructureDamageState =
  | 'clean' | 'aged' | 'battle_damaged'
  | 'partially_collapsed' | 'destroyed_footprint'
  | 'repair_reconstruction' | 'spiritually_transformed';

export const ALL_DAMAGE_STATES: readonly StructureDamageState[] = [
  'clean', 'aged', 'battle_damaged',
  'partially_collapsed', 'destroyed_footprint',
  'repair_reconstruction', 'spiritually_transformed',
] as const;

// ---------------------------------------------------------------------------
// Structure Kits (Section 18) — 22+ required kits
// ---------------------------------------------------------------------------

export type StructureKitId =
  | 'mortal_cottage_farm' | 'teahouse_inn' | 'apothecary_herb_store'
  | 'blacksmith_workshop' | 'market_stalls_auction' | 'village_shrine_ancestral_hall'
  | 'town_wall_gate_tower_bridge' | 'sect_mountain_gate'
  | 'outer_disciple_dormitory' | 'inner_disciple_courtyard'
  | 'scripture_pavilion_library' | 'alchemy_hall' | 'artifact_refining_hall'
  | 'formation_tower' | 'beast_pen_spirit_garden' | 'elder_residence'
  | 'ancestor_peak_sanctuary' | 'cliff_cave_abode' | 'secret_realm_ruin'
  | 'immortal_palace' | 'floating_island_complex' | 'ocean_sect_harbor'
  | 'underwater_ruin' | 'star_travel_platform';

export interface StructureKit {
  kitId: StructureKitId;
  name: string;
  /** Architectural hierarchy level. */
  hierarchy: 'mortal' | 'prosperous_town' | 'sect' | 'elder_ancestor' | 'imperial_immortal';
  modules: StructureModuleType[];
  damageStates: StructureDamageState[];
  /** Collision proxy required. */
  collisionProxy: boolean;
  /** Navigation surface required. */
  navSurface: boolean;
  /** Interior support required. */
  interiorSupport: boolean;
  /** LOD count. */
  lods: number;
}

export const REQUIRED_STRUCTURE_KITS: readonly StructureKit[] = [
  { kitId: 'mortal_cottage_farm', name: 'Mortal Cottage and Farm', hierarchy: 'mortal', modules: ['foundation', 'floor', 'wall', 'door', 'roof_edge', 'roof_ridge', 'stair'], damageStates: [...ALL_DAMAGE_STATES], collisionProxy: true, navSurface: true, interiorSupport: true, lods: 4 },
  { kitId: 'teahouse_inn', name: 'Teahouse and Inn', hierarchy: 'prosperous_town', modules: ['foundation', 'floor', 'column', 'wall', 'door', 'window', 'roof_corner', 'roof_edge', 'roof_ridge', 'railing', 'balcony'], damageStates: [...ALL_DAMAGE_STATES], collisionProxy: true, navSurface: true, interiorSupport: true, lods: 4 },
  { kitId: 'sect_mountain_gate', name: 'Sect Mountain Gate', hierarchy: 'sect', modules: ['foundation', 'floor', 'column', 'beam', 'bracket', 'wall', 'door', 'roof_corner', 'roof_edge', 'roof_ridge', 'trim'], damageStates: [...ALL_DAMAGE_STATES], collisionProxy: true, navSurface: true, interiorSupport: true, lods: 4 },
  { kitId: 'scripture_pavilion_library', name: 'Scripture Pavilion / Library', hierarchy: 'sect', modules: ['foundation', 'floor', 'column', 'beam', 'bracket', 'wall', 'door', 'window', 'roof_corner', 'roof_edge', 'roof_ridge', 'stair', 'railing', 'interior_partition'], damageStates: [...ALL_DAMAGE_STATES], collisionProxy: true, navSurface: true, interiorSupport: true, lods: 4 },
  { kitId: 'alchemy_hall', name: 'Alchemy Hall', hierarchy: 'sect', modules: ['foundation', 'floor', 'column', 'beam', 'wall', 'door', 'roof_edge', 'roof_ridge', 'stair', 'interior_partition'], damageStates: [...ALL_DAMAGE_STATES], collisionProxy: true, navSurface: true, interiorSupport: true, lods: 4 },
  { kitId: 'cliff_cave_abode', name: 'Cliff Cave Abode', hierarchy: 'elder_ancestor', modules: ['foundation', 'floor', 'wall', 'door', 'roof_edge', 'interior_partition'], damageStates: [...ALL_DAMAGE_STATES], collisionProxy: true, navSurface: true, interiorSupport: true, lods: 4 },
  { kitId: 'immortal_palace', name: 'Immortal Palace', hierarchy: 'imperial_immortal', modules: ['foundation', 'floor', 'column', 'beam', 'bracket', 'wall', 'door', 'window', 'roof_corner', 'roof_edge', 'roof_ridge', 'stair', 'railing', 'balcony', 'trim'], damageStates: [...ALL_DAMAGE_STATES], collisionProxy: true, navSurface: true, interiorSupport: true, lods: 4 },
  { kitId: 'floating_island_complex', name: 'Floating Island Complex', hierarchy: 'imperial_immortal', modules: ['foundation', 'floor', 'column', 'beam', 'bracket', 'wall', 'door', 'roof_corner', 'roof_edge', 'roof_ridge', 'railing', 'balcony', 'trim'], damageStates: [...ALL_DAMAGE_STATES], collisionProxy: true, navSurface: true, interiorSupport: true, lods: 4 },
] as const;

// ---------------------------------------------------------------------------
// Structure Manifest (Section 33)
// ---------------------------------------------------------------------------

export interface StructureManifest {
  assetId: string;
  assetType: 'modular_structure_kit';
  gridM: number;
  theme: string;
  materials: string[];
  modules: string[];
  states: StructureDamageState[];
  requirements: {
    collisionProxy: boolean;
    navSurface: boolean;
    interiorSupport: boolean;
    destructionVariants: boolean;
    lods: number;
  };
}
