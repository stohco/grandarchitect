/**
 * Asset Gauntlet Loop — Evidence-Driven Production Pipeline
 * =========================================================
 *
 * Implements the 10-step gauntlet from the production bible (Section 29A).
 * Every asset must survive this loop until it passes or produces a clear
 * blocking report. No asset passes by appearance alone.
 *
 * Steps:
 *   1. Parse the brief
 *   2. Produce proof silhouettes
 *   3. Build in-engine scale blockout
 *   4. Validate system architecture before polish
 *   5. Produce the asset
 *   6. Integrate through World Fabric
 *   7. Capture evidence
 *   8. Adversarial review
 *   9. Regression gauntlet
 *  10. Approve or loop
 */

// ---------------------------------------------------------------------------
// Asset Brief (Step 1)
// ---------------------------------------------------------------------------

export interface AssetBrief {
  /** Stable asset ID following naming convention. */
  assetId: string;
  /** Gameplay purpose. */
  gameplayPurpose: string;
  /** Lore/faction/biome role. */
  loreRole: string;
  /** Canonical dimensions in meters. */
  dimensions: {
    widthM: number;
    heightM: number;
    depthM: number;
  };
  /** Expected viewing distances. */
  viewingDistances: {
    near: number;
    mid: number;
    far: number;
  };
  /** Silhouette keywords. */
  silhouetteKeywords: string[];
  /** Materials and palette. */
  materials: string[];
  /** Interaction behavior. */
  interactionBehavior: string;
  /** Modular slots or snap rules. */
  modularSlots?: string[];
  /** Animation/rig requirements. */
  animationRequirements?: string;
  /** Destruction and repair behavior. */
  destructionBehavior?: string;
  /** Collision and nav requirements. */
  collisionNavRequirements: string;
  /** Streaming and LOD class. */
  streamingLODClass: string;
  /** Performance budget. */
  performanceBudget: string;
  /** Reference image IDs. */
  referenceImageIds: string[];
  /** Explicit rejection criteria. */
  rejectionCriteria: string[];
}

// ---------------------------------------------------------------------------
// Gauntlet Step Result
// ---------------------------------------------------------------------------

export type GauntletStepStatus = 'pending' | 'in_progress' | 'passed' | 'failed' | 'blocked';

export interface GauntletStepResult {
  step: number;
  name: string;
  status: GauntletStepStatus;
  evidence?: string;
  notes?: string;
  /** Corrective actions if failed. */
  correctiveActions?: string[];
  /** Timestamp. */
  timestamp: string;
}

// ---------------------------------------------------------------------------
// Evidence Package (Step 7)
// ---------------------------------------------------------------------------

export interface EvidencePackage {
  /** Neutral-light beauty render. */
  neutralLightRender: string;
  /** Gameplay-light beauty render. */
  gameplayLightRender: string;
  /** Front/side/back orthographic views. */
  orthographicViews: string[];
  /** Wireframe view. */
  wireframeView: string;
  /** Flat material-ID view. */
  materialIdView: string;
  /** UV layout. */
  uvLayout: string;
  /** LOD comparison at actual switch distances. */
  lodComparison: string;
  /** Collision visualization. */
  collisionVisualization: string;
  /** Nav visualization where relevant. */
  navVisualization?: string;
  /** Destruction/repair sequence where relevant. */
  destructionSequence?: string[];
  /** Equipment swap and extreme-pose sheet for wearables. */
  equipmentSwapSheet?: string;
  /** Frame-time, draw-call, memory, and compile-latency capture. */
  performanceCapture: PerformanceCapture;
  /** Manifest validation result. */
  manifestValidation: ManifestValidation;
}

export interface PerformanceCapture {
  frameTimeMs: number;
  drawCalls: number;
  memoryMB: number;
  compileLatencyMs: number;
  triangles: number;
}

export interface ManifestValidation {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

// ---------------------------------------------------------------------------
// Adversarial Review (Step 8)
// ---------------------------------------------------------------------------

export type ReviewerRole =
  | 'art_director'
  | 'character_technical_artist'
  | 'environment_technical_artist'
  | 'runtime_engineer'
  | 'performance_reviewer'
  | 'gameplay_reviewer'
  | 'vlm_parser_test'
  | 'text_only_reconstruction_test';

export interface ReviewerResult {
  reviewer: ReviewerRole;
  verdict: 'pass' | 'fail' | 'blocked';
  evidence: string;
  correctiveActions: string[];
}

// ---------------------------------------------------------------------------
// Regression Test (Step 9)
// ---------------------------------------------------------------------------

export interface RegressionTestResult {
  testName: string;
  passed: boolean;
  notes?: string;
}

export const REGRESSION_TEST_NAMES = [
  'clear_noon',
  'dawn_or_sunset',
  'night',
  'heavy_fog_cloud',
  'rain_or_snow',
  'close_camera',
  'far_camera',
  'high_speed_movement',
  'combat_effects',
  'equipment_swap',
  'extreme_animation_poses',
  'destruction_and_repair',
  'save_load',
  'unload_reload',
  'low_quality_settings',
  'target_hardware_performance',
] as const;

// ---------------------------------------------------------------------------
// Full Gauntlet Result
// ---------------------------------------------------------------------------

export interface GauntletResult {
  assetId: string;
  version: string;
  steps: GauntletStepResult[];
  evidence?: EvidencePackage;
  reviews?: ReviewerResult[];
  regressionTests?: RegressionTestResult[];
  approved: boolean;
  knownLimitations: string[];
  manifestHash?: string;
}

// ---------------------------------------------------------------------------
// Gauntlet failure rules (immediate rejection)
// ---------------------------------------------------------------------------

export type GauntletFailureReason =
  | 'visual_style_conflict'
  | 'critical_info_only_in_image_text'
  | 'modular_garment_changes_skeleton'
  | 'underwear_base_not_shown'
  | 'body_clipping_hidden_by_vertex_deletion'
  | 'terrain_cracks_or_delayed_collision'
  | 'structures_float_or_lack_support'
  | 'ui_unreadable_against_scenery'
  | 'lod_destroys_silhouette'
  | 'bypasses_authoritative_runtime'
  | 'profiling_evidence_missing';

// ---------------------------------------------------------------------------
// Helper: create empty gauntlet
// ---------------------------------------------------------------------------

export function createGauntlet(assetId: string): GauntletResult {
  const stepNames = [
    'Parse the brief',
    'Produce proof silhouettes',
    'Build in-engine scale blockout',
    'Validate system architecture',
    'Produce the asset',
    'Integrate through World Fabric',
    'Capture evidence',
    'Adversarial review',
    'Regression gauntlet',
    'Approve or loop',
  ];

  return {
    assetId,
    version: '0.1.0',
    steps: stepNames.map((name, i) => ({
      step: i + 1,
      name,
      status: 'pending' as GauntletStepStatus,
      timestamp: new Date().toISOString(),
    })),
    approved: false,
    knownLimitations: [],
  };
}
