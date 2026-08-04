/**
 * Engine Kernel — Shared Types
 *
 * The foundational types used across the entire engine. No xianxia concepts.
 * No Three.js types. No DOM types. Pure engine primitives.
 */

// ============================================================================
// Entity and Component
// ============================================================================

/** Stable, persistent entity identifier. BigInt for 64-bit stability. */
export type EntityId = bigint;

/** Component type identifier (e.g., "ga:npc.NPCSchedule"). */
export type ComponentTypeId = string;

/** Capability identifier (e.g., "determinism.rng"). */
export type CapabilityId = string;

/** Plugin identifier (e.g., "ga:determinism"). */
export type PluginId = string;

/** Resource handle (opaque). */
export type ResourceHandle = bigint;

/** Spatial node identifier. */
export type SpatialNodeId = bigint;

// ============================================================================
// Timing
// ============================================================================

/** Simulation tick (fixed-step counter). */
export type Tick = number;

/** Time domain identifiers. */
export type TimeDomain =
  | 'real'       // Browser, input, UI, networking
  | 'render'     // Camera, interpolation, animation presentation
  | 'fixed'      // Movement, combat, collision, nearby simulation
  | 'strategic'  // Economy, factions, cultivation, ecology
  | 'historical'; // Years, generations, dynasties, cosmic changes

/** Simulation tier (S0-S4 fidelity). */
export type SimulationTier = 0 | 1 | 2 | 3 | 4;

// ============================================================================
// Simulation Hook
// ============================================================================

export type SimulationHook =
  | 'ecology' | 'weather' | 'combat' | 'economy' | 'cultivation'
  | 'deviation' | 'social' | 'history' | 'rendering' | 'audio'
  | 'physics' | 'perception' | 'save' | 'migration' | 'trade'
  | 'politics' | 'ritual' | 'disease' | 'aging' | 'reproduction';

// ============================================================================
// Determinism
// ============================================================================

/** The determinism fingerprint — records exact versions of all determinism-affecting components. */
export interface DeterminismFingerprint {
  schemaVersion: string;
  rng: { algorithm: string; version: string };
  transcendentals: { method: string; version: string };
  fixedPoint: { method: string; version: string };
  serialization: { format: string; version: string };
  hash: { algorithm: string; libraries: string };
  generatedAt: string;
}

// ============================================================================
// Events, Commands, Queries
// ============================================================================

/** A typed event flowing through the event bus. */
export interface EngineEvent {
  type: string;
  payload: unknown;
  tick: Tick;
  source?: PluginId;
}

/** A command (request for state change). */
export interface EngineCommand {
  type: string;
  payload: unknown;
  tick: Tick;
  source: PluginId;
}

/** A query (read-only request). */
export interface EngineQuery {
  type: string;
  payload: unknown;
}

/** A transaction (atomic state change with read/write sets). */
export interface Transaction {
  id: bigint;
  readSet: Set<string>;
  writeSet: Map<string, unknown>;
  status: 'pending' | 'committed' | 'aborted';
}

// ============================================================================
// Save
// ============================================================================

/** The canonical save file format. */
export interface SaveEnvelope {
  version: string;
  fingerprint: DeterminismFingerprint;
  tick: Tick;
  seed: string;
  inputLog: InputEvent[];
  pluginSlices: Record<string, unknown>;
  hash: string;
}

/** A single input event in the deterministic input log. */
export interface InputEvent {
  tick: Tick;
  device: string;
  code: string;
  action: string;
  value: number;
}

// ============================================================================
// Spatial
// ============================================================================

/** A node in the hierarchical spatial tree. */
export interface SpatialNode {
  id: SpatialNodeId;
  parentId?: SpatialNodeId;
  kind: string;
  transform: SpatialTransform;
  timeScale: number;
  simulationTier: SimulationTier;
  generationState: 'ungenerated' | 'generating' | 'generated' | 'modified';
}

export interface SpatialTransform {
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number];
}

// ============================================================================
// Job System
// ============================================================================

/** A job for worker execution. */
export interface Job {
  id: bigint;
  type: string;
  priority: number;
  inputRevision: number;
  seed: string;
  payload: unknown;
  status: 'queued' | 'running' | 'completed' | 'failed' | 'stale';
  result?: unknown;
  error?: string;
  submittedAt: Tick;
  completedAt?: Tick;
}

// ============================================================================
// Plugin Manifest
// ============================================================================

/** Declares what a plugin provides and requires. */
export interface PluginManifest {
  id: PluginId;
  version: string;
  engineVersionRange: string;
  dependencies: PluginDependency[];
  optionalDependencies: PluginDependency[];
  provides: CapabilityId[];
  requires: CapabilityRequirement[];
  permissions: PluginPermission[];
  deterministicMode: 'required' | 'supported' | 'unsupported';
  workerCompatible: boolean;
}

export interface PluginDependency {
  id: PluginId;
  versionRange: string;
}

export interface CapabilityRequirement {
  capability: CapabilityId;
  minVersion?: string;
  optional?: boolean;
}

export type PluginPermission =
  | 'read-state'
  | 'write-state'
  | 'render'
  | 'physics'
  | 'audio'
  | 'network'
  | 'filesystem'
  | 'worker'
  | 'shader'
  | 'inspector';

// ============================================================================
// Result Type (for error handling without exceptions in hot paths)
// ============================================================================

export type Result<T, E = string> =
  | { ok: true; value: T }
  | { ok: false; error: E };

export function ok<T>(value: T): Result<T, never> {
  return { ok: true, value };
}

export function err<E>(error: E): Result<never, E> {
  return { ok: false, error };
}
