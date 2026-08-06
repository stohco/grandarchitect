/**
 * Studio Context Graph
 * ====================
 *
 * One comprehensive, queryable representation of the current Studio state.
 * The Grand Architect inspects this before acting — it answers:
 *   What is selected? What kind of thing is it? Which plugin owns it?
 *   Which properties are editable? Which operations can affect it?
 *   Which actions are currently blocked? Which canon/style constraints apply?
 *   What previous decisions created it? What would changing it invalidate?
 */

import type { WorkspaceId } from '@/lib/studio-ui/action-registry';

// ---------------------------------------------------------------------------
// Context Snapshot
// ---------------------------------------------------------------------------

export interface StudioContextSnapshot {
  snapshotId: string;
  worldRevision: number;
  studioRevision: number;
  timestamp: string;

  currentMode: 'play' | 'live-architect' | 'isolated-preview';
  activeWorkspace: WorkspaceId;
  activeDocument?: DocumentReference;

  selection: SemanticSelection;
  hoveredTarget?: SemanticTarget;
  camera: CameraSnapshot;
  viewport: ViewportSnapshot;

  world: WorldContextReference;
  entities: EntityContextReference[];
  assets: AssetContextReference[];
  operationGraphs: OperationGraphReference[];

  activeJobs: JobReference[];
  recentTransactions: TransactionReference[];
  availableActions: AvailableActionReference[];

  canonContext: CanonContextReference;
  styleContext: StyleContextReference;
  narrativeContext: NarrativeContextReference;

  capabilityGaps: CapabilityGapReference[];
  validationFailures: ValidationFailureReference[];
}

export interface DocumentReference {
  documentId: string;
  type: 'asset' | 'world-cell' | 'animation-clip' | 'scene-capsule' | 'operation-stack';
  title: string;
}

export interface SemanticSelection {
  /** Selected entity IDs. */
  entityIds: number[];
  /** Selected asset IDs. */
  assetIds: string[];
  /** What type of thing is selected. */
  selectionType: 'entity' | 'asset' | 'terrain-region' | 'structure' | 'character' | 'none';
  /** Which plugin owns the selection. */
  owningPlugin?: string;
  /** Editable properties. */
  editableProperties: EditableProperty[];
}

export interface EditableProperty {
  propertyId: string;
  label: string;
  type: 'number' | 'string' | 'boolean' | 'enum' | 'transform' | 'material';
  currentValue: unknown;
  editable: boolean;
  /** Which canon/style rules constrain this property. */
  constraints?: string[];
}

export interface SemanticTarget {
  targetId: string;
  targetType: 'entity' | 'asset' | 'terrain-cell' | 'structure' | 'character';
  confidence: 'high' | 'medium' | 'low';
  /** World-space position if available. */
  worldPosition?: [number, number, number];
}

export interface CameraSnapshot {
  position: [number, number, number];
  target: [number, number, number];
  fov: number;
  near: number;
  far: number;
}

export interface ViewportSnapshot {
  width: number;
  height: number;
  devicePixelRatio: number;
  qualityProfile: 'legacy' | 'mainstream' | 'ultra';
}

export interface WorldContextReference {
  worldId: string;
  revision: number;
  cellCount: number;
  entityCount: number;
  branchId: string;
}

export interface EntityContextReference {
  entityId: number;
  entityName: string;
  entityType: string;
  assetId?: string;
  assetRevision?: number;
  cellId?: string;
  pluginId?: string;
  transform: {
    position: [number, number, number];
    rotation: [number, number, number];
    scale: [number, number, number];
  };
}

export interface AssetContextReference {
  assetId: string;
  revision: number;
  contentHash: string;
  vertexCount: number;
  faceCount: number;
  source: string;
}

export interface OperationGraphReference {
  graphId: string;
  nodeCount: number;
  dirty: boolean;
}

export interface JobReference {
  jobId: string;
  action: string;
  status: string;
  progress: number;
}

export interface TransactionReference {
  transactionId: string;
  timestamp: string;
  requestedBy: 'user' | 'architect' | 'system';
  description: string;
  undone: boolean;
}

export interface AvailableActionReference {
  actionId: string;
  label: string;
  available: boolean;
  reason?: string;
  maturity: string;
}

export interface CanonContextReference {
  applicableRules: CanonRuleReference[];
  authorityLevel: string;
}

export interface CanonRuleReference {
  ruleId: string;
  title: string;
  authority: string;
  domain: string;
}

export interface StyleContextReference {
  applicableConstraints: StyleConstraintReference[];
  resolvedPalette?: string[];
  resolvedMaterialFamily?: string;
}

export interface StyleConstraintReference {
  constraintId: string;
  category: string;
  requirement: string;
  priority: number;
}

export interface NarrativeContextReference {
  activePromises: NarrativePromiseReference[];
  activeConflicts: string[];
  characterArcs: string[];
  thematicMotifs: string[];
}

export interface NarrativePromiseReference {
  promiseId: string;
  description: string;
  status: string;
  introducedAt: string;
}

export interface CapabilityGapReference {
  gapId: string;
  description: string;
  requestedCapability: string;
  currentBestApproximation: string;
}

export interface ValidationFailureReference {
  failureId: string;
  category: string;
  description: string;
  severity: string;
}

// ---------------------------------------------------------------------------
// Context Builder
// ---------------------------------------------------------------------------

export function buildContextSnapshot(params: {
  worldRevision: number;
  activeWorkspace: WorkspaceId;
  selectedEntityIds: number[];
  selectedAssetIds: string[];
  worldLoaded: boolean;
  inPlaytestMode: boolean;
  cameraPosition: [number, number, number];
  cameraTarget: [number, number, number];
  entities: EntityContextReference[];
  availableActions: AvailableActionReference[];
  activeJobs: JobReference[];
  recentTransactions: TransactionReference[];
}): StudioContextSnapshot {
  return {
    snapshotId: `ctx-${Date.now().toString(36)}`,
    worldRevision: params.worldRevision,
    studioRevision: 1,
    timestamp: new Date().toISOString(),
    currentMode: params.inPlaytestMode ? 'play' : 'live-architect',
    activeWorkspace: params.activeWorkspace,
    selection: {
      entityIds: params.selectedEntityIds,
      assetIds: params.selectedAssetIds,
      selectionType: params.selectedEntityIds.length > 0 ? 'entity' : 'none',
      editableProperties: [],
    },
    camera: {
      position: params.cameraPosition,
      target: params.cameraTarget,
      fov: 50,
      near: 0.1,
      far: 2000,
    },
    viewport: {
      width: 800,
      height: 600,
      devicePixelRatio: 1,
      qualityProfile: 'mainstream',
    },
    world: {
      worldId: 'default',
      revision: params.worldRevision,
      cellCount: 0,
      entityCount: params.entities.length,
      branchId: 'main',
    },
    entities: params.entities,
    assets: [],
    operationGraphs: [],
    activeJobs: params.activeJobs,
    recentTransactions: params.recentTransactions,
    availableActions: params.availableActions,
    canonContext: { applicableRules: [], authorityLevel: 'project-canon' },
    styleContext: { applicableConstraints: [] },
    narrativeContext: { activePromises: [], activeConflicts: [], characterArcs: [], thematicMotifs: [] },
    capabilityGaps: [],
    validationFailures: [],
  };
}

// ---------------------------------------------------------------------------
// Inspection Queries
// ---------------------------------------------------------------------------

export type InspectionQuery =
  | 'studio.inspectContext'
  | 'studio.inspectSelection'
  | 'studio.inspectVisibleObjects'
  | 'studio.inspectWorkspace'
  | 'studio.inspectAction'
  | 'studio.inspectOpenJobs'
  | 'studio.inspectHistory'
  | 'studio.inspectEvidence'
  | 'studio.inspectCanonContext'
  | 'studio.inspectStyleContext'
  | 'studio.inspectNarrativeContext'
  | 'studio.inspectAvailableActions'
  | 'studio.inspectCapabilityGaps'
  | 'studio.inspectValidationState';

export interface InspectionResult {
  query: InspectionQuery;
  data: unknown;
  snapshotId: string;
  timestamp: string;
}
