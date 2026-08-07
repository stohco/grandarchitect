/**
 * Live Architect Studio — Core Types
 *
 * Implements doc 50 (Live Architect Studio & Dormant World Runtime).
 * The in-world collaborative editor and dormant-universe laboratory.
 *
 * This module defines the foundational type vocabulary shared by:
 * - world-states.ts (execution state machine)
 * - selection.ts (spatial selection masks)
 * - operation-plan.ts (structured edit plans)
 * - transactions.ts (semantic undo, branches)
 * - grounding.ts (visual provenance chain)
 * - capability-descriptors.ts (plugin capability discovery)
 *
 * No forbidden functions. No Three.js, no DOM.
 */

import type { EntityId, CapabilityId, PluginId, Tick } from '../kernel/types';
export type { EntityId, CapabilityId, PluginId, Tick } from '../kernel/types';

// ============================================================================
// World Execution States (doc 50 §6.1)
// ============================================================================

export type WorldExecutionState =
  | 'generation_freeze'    // Generated, frozen before simulation advances
  | 'dormant_architect'    // Renderer + editor active, sim stopped
  | 'selective_awakening'  // Selected domains/entities unpauseed
  | 'step_simulation'      // Single-step debugging
  | 'full_simulation'      // Normal gameplay
  | 'player_embodiment'    // Player spawned into the world
  | 'temporary_fork';      // Forked snapshot for testing

export type SimulationDomain =
  | 'physics' | 'animation' | 'ai' | 'ecology' | 'economy'
  | 'weather' | 'history' | 'combat' | 'cultivation' | 'social'
  | 'audio' | 'navigation';

export interface DomainActivation {
  domain: SimulationDomain;
  active: boolean;
  scope: 'global' | 'region' | 'entity';
  regionId?: string;
  entityId?: EntityId;
}

export interface WorldStateSnapshot {
  state: WorldExecutionState;
  domains: DomainActivation[];
  frozenAtTick: Tick;
  forkParent?: string;  // if this is a fork, the parent snapshot id
}

// ============================================================================
// Editor Modes (doc 50 §1.1)
// ============================================================================

export type EditorMode = 'play' | 'live_architect' | 'isolated_preview';

// ============================================================================
// Selection (doc 50 §3)
// ============================================================================

export type SelectionShapeType =
  | 'point' | 'rectangle' | 'lasso' | 'sphere' | 'box' | 'cylinder'
  | 'spline' | 'surface_brush' | 'terrain_height_range' | 'path_corridor'
  | 'flood_fill' | 'semantic_query' | 'hierarchy';

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface Bounds3D {
  min: Vec3;
  max: Vec3;
}

export type SelectionShape =
  | { type: 'point'; position: Vec3 }
  | { type: 'sphere'; center: Vec3; radius: number }
  | { type: 'box'; center: Vec3; halfExtents: Vec3 }
  | { type: 'cylinder'; base: Vec3; radius: number; height: number }
  | { type: 'rectangle'; screenMin: [number, number]; screenMax: [number, number] }
  | { type: 'lasso'; screenPoints: [number, number][] }
  | { type: 'spline'; points: Vec3[]; width: number }
  | { type: 'surface_brush'; strokes: { position: Vec3; radius: number }[] }
  | { type: 'terrain_height_range'; min: number; max: number; bounds: Bounds3D }
  | { type: 'path_corridor'; path: Vec3[]; width: number }
  | { type: 'flood_fill'; seed: Vec3; tolerance: number }
  | { type: 'semantic_query'; predicate: string }
  | { type: 'hierarchy'; rootEntityId: EntityId; depth: number };

export type FalloffProfile =
  | { type: 'constant' }
  | { type: 'linear'; start: number; end: number }
  | { type: 'smooth'; start: number; end: number }
  | { type: 'custom'; samples: [number, number][] };

export interface SelectionFilter {
  kind: 'by_type' | 'by_tag' | 'by_faction' | 'by_material' | 'by_origin'
      | 'by_asset' | 'by_plugin' | 'by_visible' | 'by_navigation';
  value: string;
  negate?: boolean;
}

export interface ExclusionZone {
  shape: SelectionShape;
  reason: string;
}

export type SelectionSource =
  | 'brush' | 'lasso' | 'ray' | 'semantic_query' | 'combined' | 'hierarchy';

export interface SpatialSelection {
  id: string;
  shape: SelectionShape;
  worldBounds: Bounds3D;
  surfaceMask?: Uint8Array;   // per-texel mask
  volumeMask?: Uint8Array;    // per-voxel mask
  includedEntities: EntityId[];
  includedTerrainChunks: string[];
  affectedSystems: CapabilityId[];
  falloff: FalloffProfile;
  filters: SelectionFilter[];
  exclusions: ExclusionZone[];
  source: SelectionSource;
  createdAtTick: Tick;
}

// ============================================================================
// Visual Grounding (doc 50 §2)
// ============================================================================

export type ConfidenceLevel = 'high' | 'medium' | 'low';

export interface ProvenanceLink {
  renderPrimitiveId?: string;
  presentationObjectId?: string;
  runtimeEntityId?: EntityId;
  assetInstanceId?: string;
  sourceAssetHash?: string;
  owningPluginId?: PluginId;
  generatedBy?: string;       // generator that produced this, e.g. 'ga:gen-settlement'
  worldLocation: Vec3;
  editableProperties: string[];
}

export interface GroundingCandidate {
  candidateId: string;        // 'A', 'B', 'C'
  label: string;              // 'Eastern gatehouse'
  confidence: number;         // 0..1
  provenance: ProvenanceLink;
}

export interface GroundingResult {
  query: string;              // the NL reference, e.g. "that building"
  candidates: GroundingCandidate[];
  bestCandidate?: GroundingCandidate;
  confidenceLevel: ConfidenceLevel;
  requiresConfirmation: boolean;
}

// ============================================================================
// Operation Plans (doc 50 §4)
// ============================================================================

export interface OperationStep {
  stepId: string;
  description: string;
  toolId: string;             // e.g. 'terrain.raise', 'ecology.scatter'
  targetSelectionId: string;
  parameters: Record<string, unknown>;
  estimatedImpact: {
    entitiesAffected: number;
    terrainChunksAffected: number;
    estimatedCpuMs: number;
    estimatedGpuMs: number;
    assetCount: number;
    triangleCount: number;
  };
}

export interface OperationConstraint {
  kind: 'preserve_quest_objects' | 'preserve_paths' | 'preserve_sightlines'
      | 'match_visual_culture' | 'maintain_performance_budget'
      | 'maintain_navigation' | 'preserve_faction_state' | 'custom';
  description: string;
  parameters?: Record<string, unknown>;
}

export interface OperationObservation {
  key: string;
  value: string;
}

export interface OperationPlan {
  planId: string;
  originalRequest: string;     // the NL request
  targetSelectionId: string;
  observations: OperationObservation[];
  steps: OperationStep[];
  constraints: OperationConstraint[];
  outputMode: 'preview' | 'instant_apply';
  createdAtTick: Tick;
}

// ============================================================================
// Transactions (doc 50 §5)
// ============================================================================

export type PermissionClass =
  | 'presentation_only'       // instant apply (e.g. material swap)
  | 'local_physical'          // collision + navigation transaction
  | 'simulation_semantic'     // dependent systems recalculate
  | 'historical_rule'         // preview fork + migration analysis
  | 'architect_power';        // god-power transaction

export interface SemanticDiff {
  system: string;             // 'terrain', 'ecology', 'navigation', etc.
  changeType: 'add' | 'remove' | 'modify';
  entityId?: EntityId;
  fieldPath: string[];
  oldValue?: unknown;
  newValue?: unknown;
  description: string;
}

export interface ValidationEvidence {
  checkName: string;
  passed: boolean;
  message: string;
  details?: Record<string, unknown>;
}

export interface Transaction {
  transactionId: string;
  planId: string;
  requestedBy: 'user' | 'architect';
  originalRequest: string;
  resolvedTargets: EntityId[];
  toolsUsed: string[];
  changedProperties: Record<string, unknown>;
  generatedAssets: string[];
  affectedSystems: string[];
  diffs: SemanticDiff[];
  validation: ValidationEvidence[];
  provenance: {
    generatorId?: string;
    seed?: string;
    parentTransactionId?: string;
  };
  timestamp: Tick;
  permissionClass: PermissionClass;
  branchId: string;
  undone: boolean;
}

// ============================================================================
// Branches (doc 50 §5.2)
// ============================================================================

export interface WorldBranch {
  branchId: string;
  name: string;
  parentBranchId: string | null;
  createdFromTick: Tick;
  transactions: string[];     // transaction ids
  description: string;
  isFork: boolean;            // true for temporary test forks
}

// ============================================================================
// Capability Descriptors (doc 50 §8)
// ============================================================================

export type SemanticTypeId = string;  // e.g. 'terrain.chunk', 'npc.villager'

export interface ArchitectToolDescriptor {
  toolId: string;             // 'terrain.raise'
  description: string;
  inputSchema: Record<string, unknown>;
  outputSchema: Record<string, unknown>;
  permissionClass: PermissionClass;
  supportsPreview: boolean;
  supportsUndo: boolean;
}

export interface EditablePropertySchema {
  name: string;
  type: 'number' | 'string' | 'boolean' | 'vec3' | 'color' | 'enum' | 'asset_ref';
  range?: [number, number];
  options?: string[];
  editable: boolean;
}

export interface ConstraintSchema {
  name: string;
  description: string;
  enforced: boolean;
}

export interface DiagnosticDescriptor {
  name: string;
  description: string;
  severity: 'info' | 'warning' | 'error';
}

export interface ArchitectCapabilityDescriptor {
  capabilityId: CapabilityId;
  description: string;
  selectableTypes: SemanticTypeId[];
  supportedSelections: SelectionShapeType[];
  inspectTools: ArchitectToolDescriptor[];
  previewTools: ArchitectToolDescriptor[];
  mutationTools: ArchitectToolDescriptor[];
  generationTools: ArchitectToolDescriptor[];
  editableProperties: EditablePropertySchema[];
  constraints: ConstraintSchema[];
  diagnostics: DiagnosticDescriptor[];
  supportsUndo: boolean;
  supportsLiveEdit: boolean;
  supportsPreviewFork: boolean;
  permissionClass: PermissionClass;
}

// ============================================================================
// Art Direction (doc 50 §10)
// ============================================================================

export interface ArtDirectionDecision {
  decisionId: string;
  intent: string;             // "sacred but not cluttered"
  principles: string[];
  constraints: {
    paletteRestrictions?: string[];
    silhouetteGuidance?: string;
    densityGuidance?: string;
    vfxDensity?: 'none' | 'sparse' | 'moderate' | 'dense';
    fogUsage?: string;
    landmarkPolicy?: string;
  };
  scope: {
    kind: 'location' | 'faction' | 'biome' | 'asset_family' | 'character' | 'technique' | 'world';
    ref: string;
  };
  createdAtTick: Tick;
}

// ============================================================================
// Initiative Modes (doc 50 §11)
// ============================================================================

export type InitiativeMode = 'silent' | 'assistant' | 'collaborator' | 'creative_director';

export interface ProactiveSuggestion {
  suggestionId: string;
  mode: InitiativeMode;
  category: 'visual' | 'technical' | 'simulation' | 'performance' | 'coherence';
  severity: 'info' | 'suggestion' | 'warning';
  message: string;
  proposedPlan?: OperationPlan;
  requiresPreview: boolean;
}

// ============================================================================
// Quality Classification (doc 50 §12)
// ============================================================================

export type QualityClassification =
  | 'production' | 'prototype' | 'proxy' | 'approximation' | 'blocked';

export interface CompletionEvidence {
  assetId: string;
  classification: QualityClassification;
  checks: {
    name: string;
    passed: boolean;
    evidence: string;
  }[];
  userApproved: boolean;
}
