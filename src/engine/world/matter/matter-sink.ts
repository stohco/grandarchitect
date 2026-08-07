/**
 * Matter Sink — the single destruction → loot pipeline
 * =====================================================
 *
 * Wire point for terrain destruction. Given a TerrainDestructionOperation
 * (from the engine runtime handler or the /api/world/destruct route), the
 * sink computes:
 *
 *   removed volume (sphere math) → composition (material table)
 *   → removed mass (volume × density) → MatterRemovalEvent
 *   → MatterAccounting (removed vs recovered ledger)
 *   → LootAccumulator (spatial aggregation into visual orbs)
 *
 * Invariants:
 *   - Destruction events are the ONLY source of loot. No direct spawn.
 *   - The pipeline is deterministic given the seed (per-event draws use
 *     xoshiro256** seeded by eventId + materialId).
 *   - Accounting failure NEVER breaks terrain destruction (try/catch).
 *   - The ledger is idempotent per eventId (no double counting).
 */

import { stableHashHex } from './matter-hash';
import { getComposition } from './material-composition';
import type { MaterialId } from './material-composition';
import { createRecoveryProfile } from './recovery-profile';
import type { RecoveryProfile } from './recovery-profile';
import type { MatterRemovalEvent, RemovalCauseType } from './matter-events';
import { MatterAccounting } from './matter-accounting';
import { LootAccumulator } from './loot-accumulator';
import type { LootAccumulatorOptions } from './loot-accumulator';
import type { TerrainDestructionOperation } from '../world-fabric';

export interface MatterSinkOptions {
  profile?: RecoveryProfile;
  accounting?: MatterAccounting;
  accumulator?: LootAccumulator;
  /** Default world id for events. */
  worldId?: string;
}

export interface MatterSinkResult {
  event: MatterRemovalEvent;
  removedVolumeM3: number;
  removedMassKg: number;
  recoveredMassKg: number;
  recoveryRatio: number;
  lootCount: number;
}

export interface RemovalTrigger {
  actorId?: string;
  cause?: RemovalCauseType;
  materialId?: MaterialId;
  seed?: string;
  tick?: number;
  regionId?: string;
  /** Override the volume computation (e.g. from a real SDF query). */
  volumeOverrideM3?: number;
}

const DEFAULT_WORLD_ID = 'planet-suzaku';

/** Sphere volume from an operation transform (scale = diameter per axis). */
export function sphereVolumeFromTransform(
  scale: [number, number, number] | number[],
  strength: number,
): number {
  const r = (scale[0] + (scale[1] ?? scale[0]) + (scale[2] ?? scale[0])) / 6;
  const volume = (4 / 3) * Math.PI * r * r * r * Math.max(0, Math.min(1, strength));
  return Math.round(volume * 10000) / 10000;
}

/** Deterministic removal-event id derived from the destruction op id. */
export function eventIdFromOperation(opId: string): string {
  return `removal-${stableHashHex(`op:${opId}`)}`;
}

export class MatterSink {
  readonly profile: RecoveryProfile;
  readonly accounting: MatterAccounting;
  readonly accumulator: LootAccumulator;
  private worldId: string;
  private lastResults = new Map<string, MatterSinkResult>();

  constructor(options: MatterSinkOptions = {}) {
    this.profile = options.profile ?? createRecoveryProfile();
    this.accounting = options.accounting ?? new MatterAccounting();
    this.accumulator = options.accumulator ?? new LootAccumulator();
    this.worldId = options.worldId ?? DEFAULT_WORLD_ID;
  }

  /**
   * Emit a removal from a terrain destruction operation and run it through
   * accounting → accumulation. Deterministic given the trigger seed.
   */
  onTerrainDestruction(op: TerrainDestructionOperation, trigger: RemovalTrigger = {}): MatterSinkResult {
    const materialId = trigger.materialId ?? 'stone';
    const cause = trigger.cause ?? 'smash';
    const regionId = trigger.regionId ?? `cell:${op.id}`;
    const seed = trigger.seed ?? `${materialId}:${op.id}`;
    const tick = trigger.tick ?? 0;
    const eventId = eventIdFromOperation(op.id);

    const composition = getComposition(materialId, seed);
    const removedVolumeM3 =
      trigger.volumeOverrideM3 ??
      sphereVolumeFromTransform(op.transform.scale ?? [1, 1, 1], op.strength);

    const totalMass = removedVolumeM3 * composition.density;
    const totalRemovedMassKg = Math.round(totalMass * 1000) / 1000;

    // Per-constituent breakdown. Volume splits by mass fraction (single
    // bulk density per composition — documented approximation).
    const materials = composition.constituents
      .filter((c) => c.massFraction > 0)
      .map((c) => ({
        materialId: c.materialId,
        removedVolumeM3: Math.round(removedVolumeM3 * c.massFraction * 10000) / 10000,
        removedMassKg: Math.round(totalRemovedMassKg * c.massFraction * 1000) / 1000,
        grade: c.grade,
        purity: composition.spiritualProperties.purity,
      }));

    const realizedEfficiency = this.profile.resolveEfficiency(cause, seed);

    const pos = op.transform.position ?? [0, 0, 0];
    const scale = op.transform.scale ?? [1, 1, 1];
    const half = [
      (scale[0] ?? 1) / 2,
      (scale[1] ?? 1) / 2,
      (scale[2] ?? 1) / 2,
    ];

    const event: MatterRemovalEvent = {
      eventId,
      actorId: trigger.actorId ?? 'world',
      source: {
        worldId: this.worldId,
        regionId,
        terrainRevision: op.worldRevision,
      },
      bounds: {
        min: [pos[0] - half[0], pos[1] - half[1], pos[2] - half[2]],
        max: [pos[0] + half[0], pos[1] + half[1], pos[2] + half[2]],
      },
      centroid: [pos[0], pos[1], pos[2]],
      materials,
      cause,
      techniqueId: op.techniqueId,
      toolId: undefined,
      recovery: {
        baseEfficiency: realizedEfficiency,
        realizedEfficiency,
        recoveryBoost: 0,
      },
      totalRemovedVolumeM3: removedVolumeM3,
      totalRemovedMassKg: totalRemovedMassKg,
      tick,
    };

    const recovered = this.accounting.recoveredMaterials(event);
    this.accumulator.addEvent(eventId, event.centroid, event.actorId, tick, recovered);

    const recoveredMassKg = Math.round(
      recovered.reduce((s, r) => s + r.recoveredMassKg, 0) * 1000,
    ) / 1000;

    const result: MatterSinkResult = {
      event,
      removedVolumeM3,
      removedMassKg: totalRemovedMassKg,
      recoveredMassKg,
      recoveryRatio: totalRemovedMassKg > 0 ? Math.round((recoveredMassKg / totalRemovedMassKg) * 10000) / 10000 : 0,
      lootCount: this.accumulator.getLootCount(),
    };
    this.lastResults.set(eventId, result);
    return result;
  }

  /** Latest result for a removal event id (repeatable, side-effect free). */
  getResult(eventId: string): MatterSinkResult | null {
    return this.lastResults.get(eventId) ?? null;
  }

  /** Current aggregate state of the sink. */
  summary(): {
    removedMassKg: number;
    recoveredMassKg: number;
    recoveryRatio: number;
    accountedEvents: number;
    ledgerEntries: number;
    lootEntries: number;
  } {
    const totals = this.accounting.getTotals();
    return {
      removedMassKg: totals.removedTotalKg,
      recoveredMassKg: totals.recoveredTotalKg,
      recoveryRatio:
        totals.removedTotalKg > 0 ? Math.round((totals.recoveredTotalKg / totals.removedTotalKg) * 10000) / 10000 : 0,
      accountedEvents: this.accounting.getAccountedEventCount(),
      ledgerEntries: this.accounting.getEntryCount(),
      lootEntries: this.accumulator.getLootCount(),
    };
  }
}

// ---------------------------------------------------------------------------
// Singleton (shared by the engine runtime handler and the API route)
// ---------------------------------------------------------------------------

let matterSinkInstance: MatterSink | null = null;

export function getMatterSink(): MatterSink {
  if (!matterSinkInstance) {
    matterSinkInstance = new MatterSink();
  }
  return matterSinkInstance;
}
