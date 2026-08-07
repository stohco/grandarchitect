/**
 * Matter Accounting — the authoritative "removed vs recovered" ledger
 * ===================================================================
 *
 * Given a MatterRemovalEvent, computes per-material recovered mass with
 * deterministic rounding (kg, 3 decimals) and records ledger entries.
 *
 * Invariants:
 *   - Idempotent per eventId: accounting the same event twice NEVER
 *     double-counts. The ledger is keyed by eventId.
 *   - recovered ≤ removed per material (efficiency ≤ 1, rounding monotonic).
 *   - The ledger is append-only and queryable: repeated queries return
 *     identical totals.
 */

import type { MatterRemovalEvent, RecoveredMaterial } from './matter-events';
import type { MaterialId } from './material-composition';

export interface LedgerEntry {
  entryId: string;
  eventId: string;
  materialId: MaterialId;
  /** Mass that genuinely left the world (kg). */
  removedMassKg: number;
  /** Mass that enters the loot stream (kg). */
  recoveredMassKg: number;
  grade: string;
  purity: number;
  realizedEfficiency: number;
  cause: string;
  tick: number;
}

export interface MatterTotals {
  /** Per-material removed mass (kg). */
  removedByMaterial: Map<MaterialId, number>;
  /** Per-material recovered mass (kg). */
  recoveredByMaterial: Map<MaterialId, number>;
  /** Total removed mass (kg). */
  removedTotalKg: number;
  /** Total recovered mass (kg). */
  recoveredTotalKg: number;
}

function roundKg(x: number): number {
  return Math.round(x * 1000) / 1000;
}

export class MatterAccounting {
  private ledger: LedgerEntry[] = [];
  private byEventId = new Map<string, LedgerEntry[]>();
  private accountedEvents = new Set<string>();
  private nextEntrySeq = 0;

  /**
   * Account a removal event. Idempotent per eventId — re-accounting the
   * same event returns the previously recorded entries and adds nothing.
   */
  accountRemoval(event: MatterRemovalEvent): LedgerEntry[] {
    const existing = this.byEventId.get(event.eventId);
    if (existing) {
      return existing;
    }
    if (this.accountedEvents.has(event.eventId)) {
      return this.byEventId.get(event.eventId) ?? [];
    }

    const entries: LedgerEntry[] = [];
    const efficiency = event.recovery.realizedEfficiency;
    for (const m of event.materials) {
      const removedMassKg = roundKg(m.removedMassKg);
      const recoveredMassKg = roundKg(removedMassKg * efficiency);
      const entry: LedgerEntry = {
        entryId: `ledger-${event.eventId}-${m.materialId}-${this.nextEntrySeq++}`,
        eventId: event.eventId,
        materialId: m.materialId,
        removedMassKg,
        recoveredMassKg,
        grade: m.grade,
        purity: m.purity,
        realizedEfficiency: efficiency,
        cause: event.cause,
        tick: event.tick,
      };
      entries.push(entry);
    }

    this.ledger.push(...entries);
    this.byEventId.set(event.eventId, entries);
    this.accountedEvents.add(event.eventId);
    return entries;
  }

  /** Recovered materials for a removal event (for the accumulator). */
  recoveredMaterials(event: MatterRemovalEvent): RecoveredMaterial[] {
    return this.accountRemoval(event).map((e) => ({
      materialId: e.materialId,
      recoveredMassKg: e.recoveredMassKg,
      grade: e.grade as never,
      purity: e.purity,
      realizedEfficiency: e.realizedEfficiency,
    }));
  }

  getLedger(): readonly LedgerEntry[] {
    return this.ledger;
  }

  getEventsFor(eventId: string): LedgerEntry[] {
    return this.byEventId.get(eventId) ?? [];
  }

  /** Authoritative totals — same value every time it is queried. */
  getTotals(): MatterTotals {
    const removedByMaterial = new Map<MaterialId, number>();
    const recoveredByMaterial = new Map<MaterialId, number>();
    let removedTotalKg = 0;
    let recoveredTotalKg = 0;
    for (const e of this.ledger) {
      removedByMaterial.set(e.materialId, (removedByMaterial.get(e.materialId) ?? 0) + e.removedMassKg);
      recoveredByMaterial.set(e.materialId, (recoveredByMaterial.get(e.materialId) ?? 0) + e.recoveredMassKg);
      removedTotalKg += e.removedMassKg;
      recoveredTotalKg += e.recoveredMassKg;
    }
    return {
      removedByMaterial,
      recoveredByMaterial,
      removedTotalKg: roundKg(removedTotalKg),
      recoveredTotalKg: roundKg(recoveredTotalKg),
    };
  }

  getAccountedEventCount(): number {
    return this.accountedEvents.size;
  }

  getEntryCount(): number {
    return this.ledger.length;
  }
}
