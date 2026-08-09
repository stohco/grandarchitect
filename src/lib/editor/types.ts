/**
 * Live Architect Studio — Editor Types
 *
 * Serializable shapes used by the editor store and UI.
 * BigInt entity ids from the engine are converted to numbers
 * for JSON transport.
 */

export type TransformMode = 'translate' | 'rotate' | 'scale';
export type RenderMode = 'shaded' | 'wireframe' | 'solid' | 'lit' | 'cinematic';
export type CameraPreset = 'perspective' | 'top' | 'front' | 'side';
export type EditorMode = 'play' | 'live_architect' | 'isolated_preview';
export type WorldExecutionState =
  | 'generation_freeze'
  | 'dormant_architect'
  | 'selective_awakening'
  | 'step_simulation'
  | 'full_simulation'
  | 'player_embodiment'
  | 'temporary_fork';

export type SimulationDomain =
  | 'physics' | 'animation' | 'ai' | 'ecology' | 'economy'
  | 'weather' | 'history' | 'combat' | 'cultivation' | 'social'
  | 'audio' | 'navigation';

export interface DomainActivation {
  domain: SimulationDomain;
  active: boolean;
  scope: 'global' | 'region' | 'entity';
}

export type StructureKind =
  | 'lineage_hall' | 'household' | 'well' | 'threshing_ground'
  | 'mill' | 'spirit_shrine' | 'dock' | 'path'
  | 'paddy' | 'dryland_garden' | 'graveyard' | 'levee';

export interface SerializableStructure {
  entityId: number;
  kind: StructureKind;
  name: string;
  nameHanzi: string;
  position: { x: number; z: number };
  rotation: number;
  width: number;
  depth: number;
  metadata: Record<string, unknown>;
}

export interface SerializableHousehold {
  headName: string;
  headNameHanzi: string;
  headAge: number;
  headRole: string;
  isWang: boolean;
  memberCount: number;
  paddyMu: number;
  tenantedMu: number;
  drylandMu: number;
  pigs: number;
  chickens: number;
  hasWell: boolean;
  wealthTier: 'rich' | 'comfortable' | 'poor' | 'destitute';
}

export interface SerializableSettlement {
  villageName: string;
  villageNameHanzi: string;
  seed: string;
  tick: number;
  population: number;
  householdCount: number;
  structures: SerializableStructure[];
  households: SerializableHousehold[];
}

export type LogLevel = 'info' | 'success' | 'warn' | 'error' | 'debug' | 'architect';

export interface LogEntry {
  id: string;
  tick: number;
  level: LogLevel;
  source: string;
  message: string;
  ts: number;
}

export interface SemanticDiffLite {
  system: string;
  changeType: 'add' | 'remove' | 'modify';
  fieldPath: string[];
  description: string;
}

export interface TransactionLite {
  transactionId: string;
  requestedBy: 'user' | 'architect';
  originalRequest: string;
  toolsUsed: string[];
  changedProperties: Record<string, unknown>;
  affectedSystems: string[];
  diffs: SemanticDiffLite[];
  permissionClass: string;
  timestamp: number;
  branchId: string;
  undone: boolean;
  /** Forward patches for redo (applied on redoTransaction). */
  _forwardPatches?: EntityEdit[];
  /** Inverse patches for undo (applied on undoTransaction). */
  _inversePatches?: Array<{ entityId: number; field: EntityEdit['field']; value: number | undefined }>;
}

export interface WorldBranchLite {
  branchId: string;
  name: string;
  parentBranchId: string | null;
  createdFromTick: number;
  description: string;
  isFork: boolean;
  transactionCount: number;
}

export interface CapabilityDescriptorLite {
  capabilityId: string;
  description: string;
  selectableTypes: string[];
  supportedSelections: string[];
  inspectTools: number;
  previewTools: number;
  mutationTools: number;
  generationTools: number;
  editableProperties: { name: string; type: string; editable: boolean }[];
  supportsUndo: boolean;
  supportsLiveEdit: boolean;
  supportsPreviewFork: boolean;
  permissionClass: string;
}

export interface StepResult {
  completed: boolean;
  ticksAdvanced: number;
  stoppedBy?: string;
  eventsFired: string[];
  newTick: number;
}

export interface PerfStats {
  fps: number;
  frameMs: number;
  drawCalls: number;
  triangles: number;
  entities: number;
  memMb: number;
}

export interface EntityEdit {
  entityId: number;
  field: 'position.x' | 'position.z' | 'rotation' | 'width' | 'depth';
  value: number;
}

/**
 * Authorial Visual Override — applied by the Authorial Grand Architect
 * vertical slice to produce REAL visible changes in the viewport.
 *
 * When the vertical slice runs "Make this structure ancient and sacred",
 * it writes an AuthorialOverride that the StructureMesh reads and applies
 * to its material. This makes the transformation VISIBLE, not just
 * metadata.
 *
 * The override is undoable — clearAuthorialOverride(entityId) restores
 * the original appearance.
 */
export interface AuthorialOverride {
  /** Hex color string, e.g. '#5a6a5a' for weathered stone. */
  color?: string;
  /** Material roughness 0-1. Ancient structures → high roughness (0.8-0.95). */
  roughness?: number;
  /** Material metalness 0-1. Ancient sacred → low (0-0.1). */
  metalness?: number;
  /** Emissive color hex. Sacred structures → faint warm glow. */
  emissive?: string;
  /** Emissive intensity 0-1. Restrained → low (0-0.15). */
  emissiveIntensity?: number;
  /** Weathering amount 0-1. Affects color desaturation + roughness boost. */
  weathering?: number;
  /** Opacity 0-1 (for transparency effects). */
  opacity?: number;
  /** Label for the authorial state (shown in inspector). */
  authorialState?: string;
  /** Source decision ledger entry ID. */
  sourceDecisionId?: string;
}
