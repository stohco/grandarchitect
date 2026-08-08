/**
 * karma-engine — The Karmic Entanglement Web
 *
 * The project lead's brief: karma is a literal entanglement web — cords
 * between entities and events, conservation of karmic debt, severing as a
 * weapon (deletes relationships/history or collapses the target via
 * accumulated retribution), shielding for transcendent beings.
 *
 * Canon anchors (the mechanical layer is [DERIVED] on top of ratified canon):
 *   - doc 24 §2.1: karma is a lawful metaphysical ledger, not a moral
 *     judgment; every act that affects another being's anchor inscribes a
 *     trace; karmic tribulation tests the ledger at realm boundaries and an
 *     unsustainable ledger resolves in dispersal (寂滅).
 *   - doc 37 §3.3: the Anchor Law — the anchor carries karmic trace as
 *     inscriptions upon itself.
 *   - doc 25 §5.4: karmic debt "borrowed against a karmic debt the cosmos
 *     will eventually call" — the conservation law.
 *
 * Determinism: every cord id derives from (seed, actor, target, kind, tick).
 * All operations are pure functions over KarmaState; same inputs → same
 * cords, same severance effect lists, same shield answers.
 */

import { deterministicId } from './cosmic-hash';

export type KarmaKind = 'debt' | 'retribution' | 'fate';

export interface KarmaCord {
  cordId: string;
  /** The debtor / the actor who incurred the trace. */
  from: string;
  /** The creditor / the being affected. */
  to: string;
  /** Debt magnitude (non-negative). */
  thickness: number;
  kind: KarmaKind;
  createdAt: number;
  severedAt: number | null;
  severedBy: string | null;
  /** Relationship/history entries tied to this cord (deleted on severing). */
  historyIds: string[];
}

export interface HistoryEntry {
  entryId: string;
  cordId: string;
  kind: 'relationship' | 'record';
  description: string;
}

export interface KarmaShield {
  entityId: string;
  source: string;
  strength: number;
  appliedAt: number;
}

export type ProbeKind = 'divination' | 'fate_tracking' | 'karma_scan';

export interface KarmaState {
  cords: KarmaCord[];
  history: HistoryEntry[];
  shields: KarmaShield[];
  /** Retribution cord ids that have already fired. */
  retributionFired: string[];
}

export function createKarmaState(): KarmaState {
  return { cords: [], history: [], shields: [], retributionFired: [] };
}

export interface CreateCordInput {
  actor: string;
  target: string;
  magnitude: number;
  kind: KarmaKind;
  tick: number;
  seed: string;
  historyIds?: string[];
}

export interface SeveranceEffect {
  removedCords: string[];
  removedHistory: string[];
  removedRelationships: string[];
  retributionFired: { cordId: string; thickness: number } | null;
}

export class KarmaEngine {
  private state: KarmaState;

  constructor(state?: KarmaState) {
    this.state = state ? cloneState(state) : createKarmaState();
  }

  snapshot(): KarmaState {
    return cloneState(this.state);
  }

  /** Deterministic cord creation; idempotent on (seed, actor, target, kind, tick). */
  createCord(input: CreateCordInput): KarmaCord {
    const cordId = deterministicId(
      'cord',
      input.seed,
      [input.actor, input.target, input.kind, input.tick, input.magnitude],
    );
    const existing = this.state.cords.find((c) => c.cordId === cordId);
    if (existing) return existing;

    const cord: KarmaCord = {
      cordId,
      from: input.actor,
      to: input.target,
      thickness: Math.max(0, input.magnitude),
      kind: input.kind,
      createdAt: input.tick,
      severedAt: null,
      severedBy: null,
      historyIds: input.historyIds ?? [],
    };
    this.state.cords.push(cord);

    for (const hid of cord.historyIds) {
      this.state.history.push({
        entryId: hid,
        cordId,
        kind: hid.startsWith('rel_') ? 'relationship' : 'record',
        description: `tied to ${cordId} (${input.kind})`,
      });
    }
    return cord;
  }

  /** Total active karmic debt owed by an entity (sum of debt-cord thicknesses). */
  karmicDebt(entityId: string): number {
    let total = 0;
    for (const c of this.state.cords) {
      if (c.kind === 'debt' && c.from === entityId && c.severedAt === null) {
        total += c.thickness;
      }
    }
    return total;
  }

  /**
   * Convert a debt cord into retribution. CONSERVATION: the retribution
   * cord's thickness equals the debt cord's thickness exactly; the debt cord
   * is marked severed by 'conservation'. The karmic weight of the debtor is
   * unchanged: debt 50 → retribution 50.
   */
  convertDebtToRetribution(input: { cordId: string; tick: number; seed: string }): KarmaCord | null {
    const cord = this.state.cords.find((c) => c.cordId === input.cordId);
    if (!cord || cord.kind !== 'debt' || cord.severedAt !== null) return null;

    cord.severedAt = input.tick;
    cord.severedBy = 'conservation';

    const retribution: KarmaCord = {
      cordId: deterministicId('cord', input.seed, [cord.to, cord.from, 'retribution', input.tick, cord.thickness]),
      from: cord.to,
      to: cord.from,
      thickness: cord.thickness,
      kind: 'retribution',
      createdAt: input.tick,
      severedAt: null,
      severedBy: null,
      historyIds: [...cord.historyIds],
    };
    this.state.cords.push(retribution);
    return retribution;
  }

  /**
   * Sever a single cord: deletes the cord and every relationship/history
   * entry tied to it. Returns the deterministic effect list. No retribution
   * fires on a single-cord severing.
   */
  severCord(input: { cordId: string; by: string; tick: number }): SeveranceEffect {
    const effect: SeveranceEffect = {
      removedCords: [],
      removedHistory: [],
      removedRelationships: [],
      retributionFired: null,
    };
    const idx = this.state.cords.findIndex((c) => c.cordId === input.cordId);
    if (idx === -1) return effect;

    const cord = this.state.cords[idx];
    effect.removedCords.push(cord.cordId);
    effect.removedHistory.push(...cord.historyIds);
    effect.removedRelationships.push(
      ...cord.historyIds.filter((h) => h.startsWith('rel_')),
    );
    this.state.cords.splice(idx, 1);
    this.state.history = this.state.history.filter((h) => h.cordId !== cord.cordId);
    return effect;
  }

  /**
   * Sever every cord touching an entity. The target's accumulated, still-
   * unconverted debt collapses into retribution that fires ONCE — the
   * karmic-severing weapon of the brief. A second severAll on the same
   * entity fires nothing (already fired) and removes nothing.
   */
  severAll(input: { entityId: string; by: string; tick: number; seed: string }): SeveranceEffect {
    const effect: SeveranceEffect = {
      removedCords: [],
      removedHistory: [],
      removedRelationships: [],
      retributionFired: null,
    };

    const touching = this.state.cords.filter(
      (c) => (c.from === input.entityId || c.to === input.entityId) && c.severedAt === null,
    );

    let unconvertedDebt = 0;
    for (const cord of touching) {
      if (cord.kind === 'debt' && cord.from === input.entityId) {
        unconvertedDebt += cord.thickness;
      }
    }

    for (const cord of touching) {
      const single = this.severCord({ cordId: cord.cordId, by: input.by, tick: input.tick });
      effect.removedCords.push(...single.removedCords);
      effect.removedHistory.push(...single.removedHistory);
      effect.removedRelationships.push(...single.removedRelationships);
    }

    if (unconvertedDebt > 0) {
      const firedId = deterministicId('retribution', input.seed, [input.entityId, input.tick, unconvertedDebt]);
      if (!this.state.retributionFired.includes(firedId)) {
        this.state.retributionFired.push(firedId);
        effect.retributionFired = { cordId: firedId, thickness: unconvertedDebt };
      }
    }
    return effect;
  }

  /** Apply karmic shielding (hides the entity from fate-tracking/divination). */
  applyShield(input: { entityId: string; source: string; strength: number; tick: number }): KarmaShield {
    const shield: KarmaShield = {
      entityId: input.entityId,
      source: input.source,
      strength: input.strength,
      appliedAt: input.tick,
    };
    this.state.shields = this.state.shields.filter((s) => s.entityId !== input.entityId || s.source !== input.source);
    this.state.shields.push(shield);
    return shield;
  }

  /**
   * Whether an entity is hidden from a probe. A probe sees through the
   * shield only when its strength exceeds the shield's strength —
   * deterministic, no randomness.
   */
  isHidden(target: string, probe: { kind: ProbeKind; strength: number }): boolean {
    const shields = this.state.shields.filter((s) => s.entityId === target);
    if (shields.length === 0) return false;
    const strongest = shields.reduce((a, b) => (b.strength > a.strength ? b : a), shields[0]);
    return probe.strength <= strongest.strength;
  }
}

function cloneState(state: KarmaState): KarmaState {
  return {
    cords: state.cords.map((c) => ({ ...c, historyIds: [...c.historyIds] })),
    history: state.history.map((h) => ({ ...h })),
    shields: state.shields.map((s) => ({ ...s })),
    retributionFired: [...state.retributionFired],
  };
}
