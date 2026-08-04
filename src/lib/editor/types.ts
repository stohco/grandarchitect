/**
 * Live Architect Studio — Editor Types
 *
 * Serializable, transport-neutral types for the editor's UI state and the
 * world snapshot exchanged with the API routes. Everything here is plain
 * JSON (no class instances, no BigInt, no Map/Set) so it can flow through
 * fetch() / Zustand / structured-clone without surprise.
 *
 * Color policy: the editor palette is emerald / purple / amber / rose on a
 * dark slate background (#1a1a2e family). No blue/indigo.
 */

// ---------------------------------------------------------------------------
// Structure / Settlement
// ---------------------------------------------------------------------------

/**
 * The full vocabulary of placeable structures in a mortal xianxia village.
 * Keep this in sync with the renderer's kind→color map and the world
 * generator's layout rules.
 */
export type StructureKind =
  | 'lineage_hall'
  | 'household'
  | 'mill'
  | 'spirit_shrine'
  | 'dock'
  | 'path'
  | 'paddy'
  | 'dryland_garden'
  | 'graveyard'
  | 'levee';

/** A single placeable structure as carried over the wire + stored in Zustand. */
export interface SerializableStructure {
  entityId: number;
  kind: StructureKind;
  name: string;
  nameHanzi: string;
  position: { x: number; z: number };
  rotation: number; // radians, around Y
  width: number; // local X extent
  depth: number; // local Z extent
  metadata: Record<string, unknown>;
}

/** A household record attached to a settlement (one per `household` structure). */
export interface SerializableHousehold {
  headName: string;
  headNameHanzi: string;
  headAge: number;
  headRole: string;
  isWang: boolean;
  wealthTier: string;
}

/** The full settlement snapshot returned by /api/editor/world. */
export interface SerializableSettlement {
  seed: string;
  name: string;
  nameHanzi: string;
  tick: number;
  structures: SerializableStructure[];
  households: SerializableHousehold[];
}

// ---------------------------------------------------------------------------
// World execution state machine
// ---------------------------------------------------------------------------

/**
 * The seven execution modes the world kernel can occupy.
 * Mirrors engine-architecture/25_SIMULATION_TIERING_RELEVANCE.md and the
 * Grand Architect control plane (engine-architecture/43).
 */
export type WorldExecutionState =
  | 'generation_freeze' // just generated, nothing ticks
  | 'dormant_architect' // world alive, architect offline
  | 'selective_awakening' // a single domain awakens
  | 'step_simulation' // advancing one tick at a time
  | 'full_simulation' // all enabled domains tick every frame
  | 'player_embodiment' // player inhabits an entity
  | 'temporary_fork'; // branched for what-if exploration

/** The twelve simulation domains the architect can toggle independently. */
export type SimulationDomain =
  | 'physics'
  | 'animation'
  | 'ai'
  | 'ecology'
  | 'economy'
  | 'weather'
  | 'history'
  | 'combat'
  | 'cultivation'
  | 'social'
  | 'audio'
  | 'navigation';

// ---------------------------------------------------------------------------
// Log / Transaction / Branch / Capability
// ---------------------------------------------------------------------------

export type LogLevel = 'info' | 'warn' | 'error' | 'debug';

export interface LogEntry {
  id: string;
  timestamp: string; // ISO 8601
  level: LogLevel;
  source: string;
  message: string;
}

/** A lightweight transaction record (full transactions live in the engine). */
export interface TransactionLite {
  transactionId: string;
  timestamp: string;
  requestedBy: 'user' | 'architect';
  originalRequest: string;
  toolsUsed: string[];
  branchId: string;
  undone: boolean;
}

/** A branch in the world's fork tree. */
export interface WorldBranchLite {
  branchId: string;
  name: string;
  parentBranchId: string | null;
  transactionCount: number;
  isFork: boolean;
}

/** A capability the Grand Architect can invoke. */
export interface CapabilityDescriptorLite {
  capabilityId: string;
  description: string;
  category: string;
}

// ---------------------------------------------------------------------------
// Editor UI state
// ---------------------------------------------------------------------------

export interface PerfStats {
  fps: number;
  frameMs: number;
  drawCalls: number;
  triangles: number;
  entities: number;
}

/** A pending local edit to a structure field, not yet committed to the engine. */
export interface EntityEdit {
  entityId: number;
  field: 'position.x' | 'position.z' | 'rotation' | 'width' | 'depth';
  value: number;
}

export type TransformMode = 'translate' | 'rotate' | 'scale';
export type RenderMode = 'shaded' | 'wireframe' | 'solid' | 'pointcloud';
export type CameraPreset = 'perspective' | 'top' | 'front' | 'side';
export type EditorMode = 'play' | 'live_architect' | 'isolated_preview';

/** Structure-kind → accent color, centralised so the viewport and outliner agree. */
export const STRUCTURE_COLOR: Record<StructureKind, string> = {
  lineage_hall: '#10b981', // emerald-500
  household: '#92734a', // earthy brown
  mill: '#d4a04a', // amber
  spirit_shrine: '#a855f7', // purple-500
  dock: '#b08968', // tan
  path: '#6b6b80', // neutral slate
  paddy: '#4ade80', // green-400
  dryland_garden: '#facc15', // yellow
  graveyard: '#94a3b8', // slate-400
  levee: '#a78bfa', // violet-400
};

/** Human-readable labels for each structure kind. */
export const STRUCTURE_LABEL: Record<StructureKind, { en: string; hanzi: string }> = {
  lineage_hall: { en: 'Lineage Hall', hanzi: '宗祠' },
  household: { en: 'Household', hanzi: '宅' },
  mill: { en: 'Mill', hanzi: '磨坊' },
  spirit_shrine: { en: 'Spirit Shrine', hanzi: '神龕' },
  dock: { en: 'Dock', hanzi: '埠頭' },
  path: { en: 'Path', hanzi: '徑' },
  paddy: { en: 'Paddy', hanzi: '稻田' },
  dryland_garden: { en: 'Dryland Garden', hanzi: '旱地' },
  graveyard: { en: 'Graveyard', hanzi: '墳地' },
  levee: { en: 'Levee', hanzi: '堤' },
};

/** All twelve domains in canonical order. */
export const ALL_DOMAINS: SimulationDomain[] = [
  'physics',
  'animation',
  'ai',
  'ecology',
  'economy',
  'weather',
  'history',
  'combat',
  'cultivation',
  'social',
  'audio',
  'navigation',
];

/** The seven world states in canonical lifecycle order. */
export const WORLD_STATE_LABEL: Record<WorldExecutionState, string> = {
  generation_freeze: 'Generation Freeze',
  dormant_architect: 'Dormant Architect',
  selective_awakening: 'Selective Awakening',
  step_simulation: 'Step Simulation',
  full_simulation: 'Full Simulation',
  player_embodiment: 'Player Embodiment',
  temporary_fork: 'Temporary Fork',
};
