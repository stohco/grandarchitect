/**
 * Matter Removal Events — the authoritative record of what left the world
 * ======================================================================
 *
 * A MatterRemovalEvent is emitted ONLY when a destruction operation is
 * genuinely applied to terrain. It carries the removed volume, the
 * per-material breakdown (mass, grade, purity), and the cause of removal.
 * The event is the single source of truth feeding MatterAccounting and
 * LootAccumulator — no other path creates loot.
 *
 * Types mirror world-fabric's TerrainDestructionOperation but add the
 * material accounting dimensions that operation graph does not track.
 */

import type { MaterialGrade, MaterialId } from './material-composition';

// ---------------------------------------------------------------------------
// Cause types (recovery efficiency varies by cause — see recovery-profile.ts)
// ---------------------------------------------------------------------------

export type RemovalCauseType =
  | 'careful-harvest' // tools/techniques that preserve matter (95-100%)
  | 'clean-cut'       // clean slicing (90-100%)
  | 'smash'           // blunt force (80-95%)
  | 'shockwave'       // blast pressure / technique shock (70-90%)
  | 'explosion'       // violent explosion (60-90%)
  | 'disintegration'  // destructive magic/qi erosion (low)
  | 'material-control'; // cultivation material-control (toward 100%)

export interface RemovalSource {
  worldId: string;
  regionId: string;
  /** World/terrain revision the destruction was applied at. */
  terrainRevision: number;
}

export interface RemovedMaterial {
  materialId: MaterialId;
  /** Volume genuinely removed (m³). */
  removedVolumeM3: number;
  /** Mass genuinely removed (kg). */
  removedMassKg: number;
  grade: MaterialGrade;
  purity: number;
}

export interface RecoveredMaterial {
  materialId: MaterialId;
  /** Mass recovered into the loot stream (kg). */
  recoveredMassKg: number;
  grade: MaterialGrade;
  purity: number;
  /** Per-event efficiency the recovery ran at. */
  realizedEfficiency: number;
}

export interface MatterRemovalEvent {
  eventId: string;
  actorId: string;
  source: RemovalSource;
  /** Bounds of the removed region (SI meters). */
  bounds: { min: [number, number, number]; max: [number, number, number] };
  /** Centroid of removed region (SI meters). */
  centroid: [number, number, number];
  materials: RemovedMaterial[];
  cause: RemovalCauseType;
  /** Technique that caused the removal (if any). */
  techniqueId?: string;
  /** Tool that caused the removal (if any). */
  toolId?: string;
  /** Base efficiency for this cause, resolved deterministically. */
  recovery: { baseEfficiency: number; realizedEfficiency: number; recoveryBoost: number };
  /** Total removed volume (m³). */
  totalRemovedVolumeM3: number;
  /** Total removed mass (kg). */
  totalRemovedMassKg: number;
  /** Engine tick the event occurred at (for accumulation windows). */
  tick: number;
}

export const MATTER_EVENT_SEED_NAMESPACE = 'matter:event:v1:';
