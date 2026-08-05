/**
 * Frontier Technology Observatory — Types
 *
 * The system for discovering, evaluating, reproducing, adapting, replacing,
 * or rejecting frontier techniques without destabilizing the rest of the project.
 *
 * The goal is NOT to copy every fashionable feature into one enormous renderer.
 * The goal is to make the modular engine capable of safely acquiring new
 * techniques without architectural rewrites.
 */

// ============================================================================
// Frontier Technique Record
// ============================================================================

export type FrontierCategory =
  | 'rendering'
  | 'geometry'
  | 'terrain'
  | 'simulation'
  | 'animation'
  | 'asset-authoring'
  | 'streaming'
  | 'physics'
  | 'ai'
  | 'editor'
  | 'audio';

export type TechniqueMaturity =
  | 'research'        // paper/demonstration only
  | 'prototype'       // isolated microprototype exists
  | 'experimental'    // integrated but behind a flag
  | 'production-proven'; // used in shipped games

export type IntegrationStrategy =
  | 'native-plugin'              // built as an engine plugin
  | 'external-adapter'           // wraps an external library
  | 'independent-reimplementation' // reimplemented from principle
  | 'editor-only'                // only used in the editor, not runtime
  | 'research-only'              // studied but not integrated
  | 'rejected';                  // evaluated and rejected

export type DecisionStatus =
  | 'unreviewed'
  | 'researching'
  | 'prototyping'
  | 'accepted'
  | 'rejected';

export interface SourceReference {
  type: 'paper' | 'repository' | 'documentation' | 'video' | 'blog' | 'engine-feature';
  title: string;
  url?: string;
  author?: string;
  date?: string;
  license?: string;
}

export interface LicenseAssessment {
  license: string;               // MIT, Apache-2.0, GPL, proprietary, etc.
  compatible: boolean;           // compatible with our engine
  notes: string;
}

export interface FeasibilityAssessment {
  browserFeasible: boolean;
  webgpuRequired: boolean;
  webgl2Fallback: 'full' | 'reduced' | 'none';
  notes: string;
}

export interface GpuCapabilityRequirement {
  feature: string;               // e.g. 'compute-shader', 'storage-buffer', 'indirect-draw'
  required: boolean;
  fallback: string;              // what happens if not available
}

export interface MetricExpectation {
  metric: string;                // e.g. 'frame-time-ms', 'draw-calls', 'memory-mb'
  expected: string;              // e.g. '< 2ms', 'reduced 80%'
  confidence: 'high' | 'medium' | 'low';
}

export interface BenchmarkRecord {
  profile: HardwareProfile;
  cpuFrameMs: number;
  gpuFrameMs: number;
  drawCalls: number;
  visibleInstances: number;
  triangles: number;
  gpuMemoryMb: number;
  systemMemoryMb: number;
  streamingBandwidthMbps: number;
  visualQualityScore: number;    // 0..1
  notes: string;
}

export interface EvidenceRecord {
  type: 'screenshot' | 'video' | 'comparison' | 'benchmark-chart';
  description: string;
  url?: string;
}

export type HardwareProfile =
  | 'legacy-desktop'      // GTX 1070, i5-3570K, 8GB
  | 'mainstream-desktop'
  | 'high-end-desktop'
  | 'integrated-graphics'
  | 'mobile-tablet'
  | 'webgl2-fallback';

export interface FrontierTechniqueRecord {
  id: string;
  name: string;
  category: FrontierCategory;

  problemSolved: string;
  observedSources: SourceReference[];
  underlyingPrinciples: string[];

  maturity: TechniqueMaturity;

  licenseAssessment: LicenseAssessment;
  browserFeasibility: FeasibilityAssessment;
  webgpuRequirements: GpuCapabilityRequirement[];

  expectedBenefits: MetricExpectation[];
  expectedCosts: MetricExpectation[];
  knownLimitations: string[];

  integrationStrategy: IntegrationStrategy;

  referencePrototype?: string;   // plugin ID
  benchmarks: BenchmarkRecord[];
  visualEvidence: EvidenceRecord[];

  decisionStatus: DecisionStatus;

  // Quality modes
  qualityModes?: QualityMode[];

  // Applicable systems in our engine
  applicableSystems: string[];

  createdAt: string;
  lastReviewed?: string;
}

export interface QualityMode {
  name: 'ultra' | 'high' | 'medium' | 'low' | 'fallback';
  description: string;
  gpuRequired: boolean;
  estimatedCost: string;
}

// ============================================================================
// Capability Matrix — what's available on each backend/profile
// ============================================================================

export type CapabilityStatus =
  | 'native'           // fully supported
  | 'emulated'         // works via emulation/fallback
  | 'baked'            // precomputed, not real-time
  | 'experimental'     // behind a flag
  | 'unavailable'      // not supported on this backend
  | 'unsupported';     // cannot work on this backend

export interface CapabilityMatrixEntry {
  capabilityId: string;
  capabilityName: string;
  category: FrontierCategory;
  byBackend: {
    webgpu: CapabilityStatus;
    webgl2: CapabilityStatus;
    headless: CapabilityStatus;
  };
  byProfile: {
    'legacy-desktop': CapabilityStatus;
    'mainstream-desktop': CapabilityStatus;
    'high-end-desktop': CapabilityStatus;
    'integrated-graphics': CapabilityStatus;
    'mobile-tablet': CapabilityStatus;
    'webgl2-fallback': CapabilityStatus;
  };
  fallbackStrategy: string;
  notes: string;
}

export interface CapabilityMatrix {
  entries: CapabilityMatrixEntry[];
  generatedAt: string;
}

// ============================================================================
// Capability Gap — when the Architect can't do something
// ============================================================================

export interface CapabilityGap {
  gapId: string;
  desiredResult: string;
  currentCapabilities: string[];
  missingCapabilities: string[];
  proposedPlugins: string[];
  developmentStage: 'identified' | 'researching' | 'prototyping' | 'testing' | 'integrated' | 'blocked';
  notes: string;
  createdAt: string;
}

// ============================================================================
// Editable Operation Graph — non-destructive editing (Unbound-inspired)
// ============================================================================

export type OperationType =
  | 'add'           // add a primitive/shape
  | 'subtract'      // remove a volume
  | 'blend'         // smooth blend
  | 'paint'         // material/texture painting
  | 'scatter'       // vegetation/objects
  | 'erosion'       // simulation operation
  | 'modify'        // parameter modification
  | 'place'         // entity placement
  | 'layer'         // material layer
  | 'custom';

export interface EditableOperation {
  operationId: string;
  type: OperationType;
  label: string;
  parameters: Record<string, unknown>;
  enabled: boolean;
  attributableTo: 'user' | 'architect' | 'generator';
  timestamp: string;
  // The operation remains: selectable, reorderable, parameterized,
  // previewable, independently disableable, undoable, procedurally regenerable.
}

export interface EditableOperationGraph {
  graphId: string;
  graphType: 'terrain' | 'structure' | 'character' | 'settlement' | 'technique-effect' | 'custom';
  operations: EditableOperation[];
  // Only the final runtime representation is optimized into meshes/colliders.
  // The Live Studio retains the editable source graph.
  runtimeBaked: boolean;
  lastBakedAt?: string;
}

// ============================================================================
// Frontier Plugin — four faces (O3DE Gem-inspired)
// ============================================================================

export interface FrontierPlugin {
  pluginId: string;
  name: string;
  version: string;
  runtime?: RuntimePluginFace;
  editor?: EditorPluginFace;
  assetProcessor?: AssetProcessorFace;
  architect?: ArchitectCapabilityFace;
}

export interface RuntimePluginFace {
  description: string;
  capabilities: string[];
  fallback: string;
}

export interface EditorPluginFace {
  description: string;
  tools: string[];
  overlays: string[];
}

export interface AssetProcessorFace {
  description: string;
  processes: string[];
  outputs: string[];
}

export interface ArchitectCapabilityFace {
  description: string;
  canInspect: boolean;
  canGenerate: boolean;
  canModify: boolean;
  canExplain: boolean;
  canValidate: boolean;
}

// ============================================================================
// Pipeline stages (every candidate must pass)
// ============================================================================

export type PipelineStage =
  | 'discovered'
  | 'principle-identified'
  | 'source-located'
  | 'license-checked'
  | 'browser-feasibility-checked'
  | 'prototype-created'
  | 'benchmarked'
  | 'visual-reviewed'
  | 'stress-tested'
  | 'fallback-tested'
  | 'integration-reviewed'
  | 'production-decided';

export const PIPELINE_STAGES: PipelineStage[] = [
  'discovered',
  'principle-identified',
  'source-located',
  'license-checked',
  'browser-feasibility-checked',
  'prototype-created',
  'benchmarked',
  'visual-reviewed',
  'stress-tested',
  'fallback-tested',
  'integration-reviewed',
  'production-decided',
];

export interface PipelineProgress {
  techniqueId: string;
  currentStage: PipelineStage;
  completedStages: PipelineStage[];
  stageNotes: Partial<Record<PipelineStage, string>>;
}

// ============================================================================
// Frame budget
// ============================================================================

export interface FrameBudget {
  targetFps: number;
  totalMs: number;
  allocation: {
    simulation: number;
    physics: number;
    animation: number;
    renderPrep: number;
    gpuRender: number;
    safetyMargin: number;
  };
}

export const DEFAULT_FRAME_BUDGET_60FPS: FrameBudget = {
  targetFps: 60,
  totalMs: 16.67,
  allocation: {
    simulation: 3.0,
    physics: 2.0,
    animation: 1.5,
    renderPrep: 1.5,
    gpuRender: 7.0,
    safetyMargin: 1.67,
  },
};
