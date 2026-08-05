/**
 * World Fabric — Hybrid World Representation
 * ===========================================
 *
 * The World Fabric owns the authoritative world representation above
 * individual terrain chunks and meshes. It is NOT a single representation
 * (voxels OR meshes OR tiles) — it is a hybrid system that combines:
 *
 *   Layer 1: Distant compiled terrain (HLOD mesh tiles, streamed)
 *   Layer 2: Ordinary surface terrain (variable-resolution mesh)
 *   Layer 3: Destructible surface shell (volumetric SDF, shallow depth)
 *   Layer 4: Full volumetric regions (sparse SDF for caves/mountains)
 *   Layer 5: Authored hero geometry (modular meshes, architecture)
 *
 * The player sees smooth terrain — never cubes. Internal representation
 * is sparse, tiered, and data-oriented.
 */

// ---------------------------------------------------------------------------
// Core Spatial Types
// ---------------------------------------------------------------------------

export interface Bounds3 {
  min: [number, number, number];
  max: [number, number, number];
}

export interface Transform3 {
  position: [number, number, number];
  rotation: [number, number, number, number]; // quaternion
  scale: [number, number, number];
}

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

// ---------------------------------------------------------------------------
// World Cell — storage, streaming, and simulation unit
// ---------------------------------------------------------------------------

export type TerrainLayer =
  | 'distant-compiled'    // HLOD mesh tiles, streamed, not editable
  | 'surface-mesh'        // Ordinary variable-resolution mesh terrain
  | 'destructible-shell'  // Shallow volumetric SDF (10-100m depth)
  | 'full-volumetric'     // Full sparse SDF for caves/mountains
  | 'authored-hero';      // Artist-authored modular meshes

export interface WorldCell {
  /** Unique cell identifier. */
  cellId: string;
  /** World-space bounds. */
  bounds: Bounds3;
  /** Cell revision (increments on any edit). */
  revision: number;
  /** Which terrain layers are active in this cell. */
  activeLayers: TerrainLayer[];

  /** Base terrain recipe (procedural generation parameters). */
  baseTerrain: TerrainRecipeReference;
  /** Volumetric edit regions (SDF operations). */
  volumetricRegions: VolumetricRegionReference[];
  /** Placed asset instances (structures, props, vegetation). */
  placedAssets: EntityInstanceReference[];
  /** Structure graph (buildings, architecture). */
  structures: StructureGraphReference[];
  /** Ecology state for this cell. */
  ecology: EcologyCellState;
  /** Simulation state and ownership. */
  simulation: SimulationCellState;

  /** History of terrain operations (destruction, sculpting, raising). */
  destructionLog: TerrainOperationReference[];

  /** Derived artifacts (compiled from source truth). */
  derived: {
    render: ArtifactReference[];
    collision: ArtifactReference[];
    navigation: ArtifactReference[];
    vegetation: ArtifactReference[];
    audio: ArtifactReference[];
    streaming: ArtifactReference[];
  };
}

// ---------------------------------------------------------------------------
// References (content-addressed)
// ---------------------------------------------------------------------------

export interface TerrainRecipeReference {
  /** Hash of the recipe parameters. */
  recipeHash: string;
  /** Seed for procedural generation. */
  seed: number;
  /** Recipe type (e.g. 'mountain', 'plains', 'river-valley'). */
  type: string;
  /** Parameters blob (JSON-serializable). */
  parameters: Record<string, unknown>;
}

export interface VolumetricRegionReference {
  regionId: string;
  /** SDF field hash. */
  fieldHash: string;
  /** Region bounds. */
  bounds: Bounds3;
  /** Resolution (samples per meter). */
  resolution: number;
  /** Whether this region is sparse (only active voxels stored). */
  sparse: boolean;
}

export interface EntityInstanceReference {
  instanceId: string;
  /** Asset ID (content-addressed). */
  assetId: string;
  /** Asset revision. */
  assetRevision: number;
  /** World transform. */
  transform: Transform3;
}

export interface StructureGraphReference {
  graphHash: string;
  structureCount: number;
}

export interface ArtifactReference {
  /** Artifact hash (content-addressed). */
  artifactHash: string;
  /** Source revision this artifact was compiled from. */
  sourceRevision: number;
  /** Artifact kind. */
  kind: ArtifactKind;
  /** Artifact format (e.g. 'glb', 'navmesh', 'collision-convex'). */
  format: string;
}

export type ArtifactKind =
  | 'render-mesh'
  | 'collision-mesh'
  | 'navigation-mesh'
  | 'vegetation-instances'
  | 'audio-sources'
  | 'streaming-package'
  | 'hlod'
  | 'occlusion'
  | 'material-weights';

// ---------------------------------------------------------------------------
// Ecology and Simulation State
// ---------------------------------------------------------------------------

export interface EcologyCellState {
  /** Simulation tier for this cell. */
  tier: SimulationTier;
  /** Whether this cell is actively simulated. */
  active: boolean;
  /** NPC count (if tracked). */
  npcCount: number;
  /** Vegetation density (0-1). */
  vegetationDensity: number;
  /** Last simulation tick. */
  lastTick: number;
}

export type SimulationTier =
  | 'tier-0-embodied'      // Player, nearby combatants, critical objects
  | 'tier-1-local-detailed' // Nearby NPC schedules, animals, markets
  | 'tier-2-regional'       // Settlements, sect relations, trade
  | 'tier-3-strategic'      // Countries, planets, major factions
  | 'tier-4-dormant';       // Unloaded realms, distant eras

export interface SimulationCellState {
  tier: SimulationTier;
  /** Which simulation domains are active. */
  activeDomains: string[];
  /** Simulation LOD (independent of render LOD). */
  simulationLOD: number;
  /** Whether render and simulation are decoupled. */
  renderDecoupled: boolean;
}

// ---------------------------------------------------------------------------
// Terrain Destruction Operations
// ---------------------------------------------------------------------------

export type TerrainOperationType =
  | 'subtract-sphere'
  | 'subtract-capsule'
  | 'cut-plane'
  | 'fracture'
  | 'collapse'
  | 'raise'
  | 'smooth'
  | 'material-transform'
  | 'add-sphere'
  | 'add-capsule';

export interface TerrainDestructionOperation {
  id: string;
  /** World revision when this operation was applied. */
  worldRevision: number;
  type: TerrainOperationType;
  /** World transform of the operation. */
  transform: Transform3;
  /** Operation strength (0-1). */
  strength: number;
  /** Falloff distance. */
  falloff: number;
  /** Source entity that caused this (e.g. a technique). */
  sourceEntityId?: string;
  /** Technique that caused this (e.g. 'flying-sword-strike'). */
  techniqueId?: string;
  /** Material interaction details. */
  materialInteraction?: MaterialInteraction;
  /** Timestamp. */
  timestamp: string;
}

export interface TerrainOperationReference {
  operationId: string;
  operationHash: string;
}

export interface MaterialInteraction {
  /** Material ID that was affected. */
  materialId: number;
  /** Whether the material was fractured. */
  fractured: boolean;
  /** Debris spawned. */
  debrisProfile: DebrisProfile;
  /** Dust spawned. */
  dustProfile: string;
}

// ---------------------------------------------------------------------------
// World Material Properties
// ---------------------------------------------------------------------------

export interface WorldMaterial {
  materialId: number;
  name: string;
  /** Density (kg/m³). */
  density: number;
  /** Hardness (Mohs scale 1-10). */
  hardness: number;
  /** Tensile strength (MPa). */
  tensileStrength: number;
  /** Fracture toughness (MPa·√m). */
  fractureToughness: number;
  /** Erosion resistance (0-1). */
  erosionResistance: number;
  /** Heat resistance (°C). */
  heatResistance: number;
  /** Qi conductivity (0-1, for cultivation interactions). */
  qiConductivity: number;
  /** Debris profile when destroyed. */
  debrisProfile: DebrisProfile;
  /** Dust profile when destroyed. */
  dustProfile: string;
  /** Sound profile. */
  soundProfile: string;
}

export type DebrisProfile =
  | 'hero-fragment'     // Full rigid body + persistent collision
  | 'medium-debris'     // Temporary simplified rigid body
  | 'small-rubble'      // Instanced visual particles
  | 'dust-and-qi'       // GPU particles / volumetric effects
  | 'none';

// ---------------------------------------------------------------------------
// Terrain Material System (hex tiling, material fields)
// ---------------------------------------------------------------------------

export interface TerrainMaterialSample {
  /** Up to 4 simultaneously blending materials. */
  primaryMaterialId: number;
  secondaryMaterialId: number;
  tertiaryMaterialId: number;
  quaternaryMaterialId: number;
  /** Blend weights (sum to 1). */
  weights: [number, number, number, number];
  /** Moisture (0-1). */
  moisture: number;
  /** Snow coverage (0-1). */
  snowCoverage: number;
  /** Corruption (0-1, for xianxia corruption effects). */
  corruption: number;
  /** Temperature (°C). */
  temperature: number;
}

export interface TerrainMaterialPalette {
  paletteId: string;
  /** Material IDs in this palette (can be hundreds in the world). */
  materialIds: number[];
}

export type AntiTilingMode =
  | 'none'
  | 'hex-rotate'
  | 'hex-rotate-offset'
  | 'blended-hex'
  | 'macro-variation'
  | 'directional';

export interface HexTilingConfig {
  /** Hex cell size in world units. */
  cellSize: number;
  /** Rotation amount (0 = none, 1 = full random). */
  rotationAmount: number;
  /** Blend contrast (0-1). */
  blendContrast: number;
  /** Whether to use explicit texture gradients (fixes mip seams). */
  useExplicitGradients: boolean;
  /** Whether to use surface-gradient normal processing. */
  useSurfaceGradientNormals: boolean;
  /** Distance-based quality mode. */
  qualityMode: HexTilingQualityMode;
}

export type HexTilingQualityMode =
  | 'legacy'      // Near: hex albedo only; Far: ordinary triplanar
  | 'mainstream'  // Near: hex albedo + normal; Far: simplified
  | 'ultra'       // Near: full hex + height; Far: HLOD material
  | 'disabled';   // No hex tiling

// ---------------------------------------------------------------------------
// World Transaction
// ---------------------------------------------------------------------------

export interface WorldTransaction {
  id: string;
  /** Base world revision. */
  baseRevision: number;
  /** Resulting world revision. */
  resultRevision: number;

  /** Forward operations (apply to go from base → result). */
  forwardOperations: WorldOperation[];
  /** Inverse operations (apply to go from result → base, for undo). */
  inverseOperations: WorldOperation[];

  /** Cells affected by this transaction. */
  affectedCells: string[];
  /** Derived artifacts invalidated by this transaction. */
  invalidatedArtifacts: ArtifactKind[];

  /** Who requested this transaction. */
  requestedBy: Principal;
  /** Who approved it (if required). */
  approvedBy?: Principal;
  /** Timestamp. */
  timestamp: string;
}

export interface WorldOperation {
  operationId: string;
  type: WorldOperationType;
  /** Target cell ID. */
  cellId: string;
  /** Operation payload (type-specific). */
  payload: Record<string, unknown>;
}

export type WorldOperationType =
  | 'terrain-destruct'
  | 'terrain-raise'
  | 'terrain-smooth'
  | 'asset-place'
  | 'asset-remove'
  | 'asset-transform'
  | 'material-paint'
  | 'vegetation-place'
  | 'structure-build'
  | 'structure-demolish'
  | 'world-law-edit';

export interface Principal {
  principalId: string;
  role: 'user' | 'architect' | 'system';
  autonomyLevel: 'manual' | 'assisted' | 'autonomous';
}
