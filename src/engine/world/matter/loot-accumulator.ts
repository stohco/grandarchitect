/**
 * Loot Accumulator — spatial aggregation of recovered matter
 * ===========================================================
 *
 * Recovered material does not appear as one loot entry per event — events
 * within the same spatial cell and merge window that are COMPATIBLE
 * (same materialId + grade + owner) merge into aggregated loot entries.
 * Visual orb count is capped per cell (maxOrbsPerCell, default 8); excess
 * events merge into the largest existing entry for their material.
 *
 * Deterministic: centroid is a mass-weighted average computed with the same
 * operations in the same order; loot ids derive from first-event ids.
 *
 * Storage is abstracted: entries carry amountKg (mass), not slot counts.
 * The client vacuum/inventory UI is OUT OF SCOPE (future work) — this
 * accumulator is the server-side loot stream endpoint.
 */

import { stableHashHex } from './matter-hash';
import type { RecoveredMaterial } from './matter-events';
import type { MaterialGrade, MaterialId } from './material-composition';

export interface LootEntry {
  lootId: string;
  materialId: MaterialId;
  grade: MaterialGrade;
  owner: string;
  /** Aggregated mass (kg) — abstracted storage, not slot counts. */
  amountKg: number;
  /** Mass-weighted centroid (SI meters). */
  centroid: [number, number, number];
  /** Spatial cell the entry is bound to (fixed at creation). */
  cellKey: string;
  eventCount: number;
  firstTick: number;
  lastTick: number;
  sourceEventIds: string[];
}

export interface LootAccumulatorOptions {
  /** Spatial cell size in meters. */
  cellSize?: number;
  /** Merge window in engine ticks (default 4 ≈ 200ms at 20t/s). */
  mergeWindowTicks?: number;
  /** Max visual orbs per spatial cell. */
  maxOrbsPerCell?: number;
}

const DEFAULTS: Required<LootAccumulatorOptions> = {
  cellSize: 8,
  mergeWindowTicks: 4,
  maxOrbsPerCell: 8,
};

export class LootAccumulator {
  private entries: LootEntry[] = [];
  private addedEventIds = new Set<string>();
  private opts: Required<LootAccumulatorOptions>;

  constructor(options: LootAccumulatorOptions = {}) {
    this.opts = { ...DEFAULTS, ...options };
  }

  getOptions(): Required<LootAccumulatorOptions> {
    return { ...this.opts };
  }

  /**
   * Add recovered materials (from one removal event) to the accumulator.
   * Idempotent per eventId — re-adding the same event never double-counts.
   * Zero-amount materials are ignored (nothing to aggregate).
   */
  addEvent(
    eventId: string,
    centroid: [number, number, number],
    owner: string,
    tick: number,
    recovered: RecoveredMaterial[],
  ): LootEntry[] {
    if (this.addedEventIds.has(eventId)) {
      return [];
    }
    this.addedEventIds.add(eventId);
    const created: LootEntry[] = [];
    for (const rec of recovered) {
      if (rec.recoveredMassKg <= 0) continue;
      const cellKey = this.cellKey(centroid);
      const merged = this.tryMerge(eventId, cellKey, rec, owner, tick);
      if (merged) {
        continue;
      }
      created.push(this.createEntry(eventId, cellKey, centroid, owner, tick, rec));
    }
    return created;
  }

  private cellKey(centroid: [number, number, number]): string {
    const c = this.opts.cellSize;
    const ix = Math.floor(centroid[0] / c);
    const iy = Math.floor(centroid[1] / c);
    const iz = Math.floor(centroid[2] / c);
    return `${ix},${iy},${iz}`;
  }

  private isCompatible(cellKey: string, rec: RecoveredMaterial, owner: string, tick: number, entry: LootEntry): boolean {
    return (
      entry.owner === owner &&
      entry.materialId === rec.materialId &&
      entry.grade === rec.grade &&
      entry.cellKey === cellKey &&
      tick - entry.lastTick <= this.opts.mergeWindowTicks
    );
  }

  private tryMerge(
    eventId: string,
    cellKey: string,
    rec: RecoveredMaterial,
    owner: string,
    tick: number,
  ): LootEntry | null {
    let target: LootEntry | null = null;
    for (const e of this.entries) {
      if (!this.isCompatible(cellKey, rec, owner, tick, e)) continue;
      // Prefer the most recent entry within the window.
      if (!target || e.lastTick > target.lastTick) {
        target = e;
      }
    }
    if (!target) return null;

    // Mass-weighted centroid update (deterministic floating-point order).
    const total = target.amountKg + rec.recoveredMassKg;
    target.centroid = [
      (target.centroid[0] * target.amountKg) / total,
      (target.centroid[1] * target.amountKg) / total,
      (target.centroid[2] * target.amountKg) / total,
    ];
    target.amountKg = Math.round(total * 1000) / 1000;
    target.eventCount += 1;
    target.lastTick = tick;
    target.sourceEventIds.push(eventId);
    return target;
  }

  private createEntry(
    eventId: string,
    cellKey: string,
    centroid: [number, number, number],
    owner: string,
    tick: number,
    rec: RecoveredMaterial,
  ): LootEntry {
    const lootId = `loot-${stableHashHex(`${cellKey}|${rec.materialId}|${rec.grade}|${owner}|${eventId}`)}`;

    // If the cell is at orb capacity, merge into the largest compatible
    // entry for this material+grade regardless of window.
    if (this.entriesForCell(cellKey).length >= this.opts.maxOrbsPerCell) {
      let largest: LootEntry | null = null;
      for (const e of this.entries) {
        if (
          this.cellKey(e.centroid) === cellKey &&
          e.materialId === rec.materialId &&
          e.grade === rec.grade &&
          e.owner === owner &&
          (!largest || e.amountKg > largest.amountKg)
        ) {
          largest = e;
        }
      }
      if (largest) {
        const total = largest.amountKg + rec.recoveredMassKg;
        largest.centroid = [
          (largest.centroid[0] * largest.amountKg + centroid[0] * rec.recoveredMassKg) / total,
          (largest.centroid[1] * largest.amountKg + centroid[1] * rec.recoveredMassKg) / total,
          (largest.centroid[2] * largest.amountKg + centroid[2] * rec.recoveredMassKg) / total,
        ];
        largest.amountKg = Math.round(total * 1000) / 1000;
        largest.eventCount += 1;
        largest.lastTick = tick;
        largest.sourceEventIds.push(eventId);
        return largest;
      }
    }

    const entry: LootEntry = {
      lootId,
      materialId: rec.materialId,
      grade: rec.grade,
      owner,
      amountKg: rec.recoveredMassKg,
      centroid: [...centroid],
      cellKey,
      eventCount: 1,
      firstTick: tick,
      lastTick: tick,
      sourceEventIds: [eventId],
    };
    this.entries.push(entry);
    return entry;
  }

  private entriesForCell(cellKey: string): LootEntry[] {
    return this.entries.filter((e) => e.cellKey === cellKey);
  }

  /** Current loot stream (no side effects — repeatable query). */
  getLoot(): LootEntry[] {
    return this.entries.map((e) => ({
      ...e,
      centroid: [...e.centroid] as [number, number, number],
      sourceEventIds: [...e.sourceEventIds],
    }));
  }

  getLootCount(): number {
    return this.entries.length;
  }

  getTotalRecoveredKg(): number {
    return Math.round(this.entries.reduce((s, e) => s + e.amountKg, 0) * 1000) / 1000;
  }

  /** Consume the loot stream (vacuum point — client UI is future work). */
  flush(): LootEntry[] {
    const out = this.getLoot();
    this.entries = [];
    return out;
  }
}
