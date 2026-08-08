/**
 * essence-registry — The Essence: ultimate conceptual origin
 *
 * The project lead's brief: essence is the ultimate conceptual origin,
 * finite per universe (e.g. 9 Fire sources), subject to ontological
 * predation (hunting other holders), concept-overriding-matter (holding
 * Fire Essence defines what 'hot' means), and true vs false essences.
 *
 * Canon anchors (the mechanical layer is [DERIVED] on top of canon):
 *   - doc 00 §1: the cosmos is finite — finiteness applies to essences.
 *   - doc 44 §1: the Dao is the totality of lawful pattern; the Origin is
 *     the condition of generation. An essence here is modeled as a scoped
 *     conceptual authority over one lawful pattern (a spoken-Dao fragment,
 *     doc 44 §1.3) — never the Origin itself.
 *   - doc 39 §1: finite counts at the top (nine Mahayana, twelve Yuanjun) —
 *     the "count the cosmos can sustain" principle applied to essence slots.
 *
 * Determinism: holder selection, predation resolution and concept-override
 * acceptance are pure functions of state — no randomness anywhere.
 */

import { deterministicId } from '../../lib/determinism/primitives';

export interface EssenceDefinition {
  essenceId: string;
  name: string;
  /** Finite source slots per universe (a universe can hold at most this many holders). */
  sourceCount: number;
}

export type EssenceOrigin = 'primordial' | 'forged';

export interface EssenceHolder {
  entityId: string;
  essenceId: string;
  authority: number;
  origin: EssenceOrigin;
  claimedAt: number;
}

export interface ConceptDeclaration {
  concept: string;
  mapping: string;
  essenceId: string;
  holderId: string;
  declaredAt: number;
  authority: number;
}

export interface EssenceState {
  definitions: EssenceDefinition[];
  holders: EssenceHolder[];
  overrides: ConceptDeclaration[];
}

export interface ClaimInput {
  entityId: string;
  essenceId: string;
  authority: number;
  origin?: EssenceOrigin;
  tick: number;
  seed: string;
}

export interface PredationInput {
  predator: string;
  essenceId: string;
  authority: number;
  tick: number;
  seed: string;
}

export interface PredationResult {
  success: boolean;
  essenceId: string;
  defeatedHolderId: string | null;
  reason: 'none' | 'no_holders' | 'weaker_predator' | 'no_such_essence';
}

export interface DeclarationInput {
  entityId: string;
  essenceId: string;
  concept: string;
  mapping: string;
  tick: number;
}

export interface DeclarationResult {
  ok: boolean;
  reason: 'ok' | 'not_holder' | 'false_essence' | 'law_resistance';
}

export interface ConceptResolution {
  source: 'essence_override' | 'default_law';
  mapping: string;
}

/** Decay of a forged (false) essence's authority over time: forged claims decay. */
export const FORGED_ESSENCE_DECAY = 1 / 1000;

export class EssenceRegistry {
  private state: EssenceState;

  constructor(definitions: EssenceDefinition[], state?: EssenceState) {
    this.state = state
      ? {
          definitions: definitions.map((d) => ({ ...d })),
          holders: state.holders.map((h) => ({ ...h })),
          overrides: state.overrides.map((o) => ({ ...o })),
        }
      : { definitions: definitions.map((d) => ({ ...d })), holders: [], overrides: [] };
  }

  snapshot(): EssenceState {
    return {
      definitions: this.state.definitions.map((d) => ({ ...d })),
      holders: this.state.holders.map((h) => ({ ...h })),
      overrides: this.state.overrides.map((o) => ({ ...o })),
    };
  }

  freeSlots(essenceId: string): number {
    const def = this.state.definitions.find((d) => d.essenceId === essenceId);
    if (!def) return -1;
    const held = this.state.holders.filter((h) => h.essenceId === essenceId).length;
    return def.sourceCount - held;
  }

  holderCount(essenceId: string): number {
    return this.state.holders.filter((h) => h.essenceId === essenceId).length;
  }

  /** Claim a free essence slot. Fails when the universe's finite slots are full. */
  claim(input: ClaimInput): { ok: true; holder: EssenceHolder } | { ok: false; reason: 'no_free_slot' | 'no_such_essence' } {
    const def = this.state.definitions.find((d) => d.essenceId === input.essenceId);
    if (!def) return { ok: false, reason: 'no_such_essence' };
    if (this.freeSlots(input.essenceId) <= 0) return { ok: false, reason: 'no_free_slot' };
    if (this.state.holders.some((h) => h.essenceId === input.essenceId && h.entityId === input.entityId)) {
      // Entity already holds this essence; re-claim is a no-op (deterministic).
      const existing = this.state.holders.find((h) => h.entityId === input.entityId && h.essenceId === input.essenceId);
      if (existing) return { ok: true, holder: existing };
    }

    const holder: EssenceHolder = {
      entityId: input.entityId,
      essenceId: input.essenceId,
      authority: input.authority,
      origin: input.origin ?? 'primordial',
      claimedAt: input.tick,
    };
    this.state.holders.push(holder);
    return { ok: true, holder };
  }

  /**
   * Ontological predation: the predator attempts to absorb the essence from
   * its weakest current holder. Deterministic target: lowest authority, ties
   * broken by entity id. The predator must be strictly stronger. On success
   * the old holder is REPLACED by the predator. A 10th claimant must predate
   * because the 9 slots are finite — this is the only lawful acquisition path
   * once full.
   */
  predate(input: PredationInput): PredationResult {
    const def = this.state.definitions.find((d) => d.essenceId === input.essenceId);
    if (!def) return { success: false, essenceId: input.essenceId, defeatedHolderId: null, reason: 'no_such_essence' };

    const holders = this.state.holders
      .filter((h) => h.essenceId === input.essenceId)
      .sort((a, b) => (a.authority !== b.authority ? a.authority - b.authority : a.entityId < b.entityId ? -1 : 1));
    if (holders.length === 0) {
      return { success: false, essenceId: input.essenceId, defeatedHolderId: null, reason: 'no_holders' };
    }

    const weakest = holders[0];
    if (input.authority <= weakest.authority) {
      return { success: false, essenceId: input.essenceId, defeatedHolderId: weakest.entityId, reason: 'weaker_predator' };
    }

    this.state.holders = this.state.holders.filter((h) => !(h.entityId === weakest.entityId && h.essenceId === input.essenceId));
    this.state.holders.push({
      entityId: input.predator,
      essenceId: input.essenceId,
      authority: input.authority,
      origin: 'primordial',
      claimedAt: input.tick,
    });
    return { success: true, essenceId: input.essenceId, defeatedHolderId: weakest.entityId, reason: 'none' };
  }

  /** Current authority of a holder, after deterministic forged-essence decay. */
  currentAuthority(entityId: string, essenceId: string, tick: number): number {
    const holder = this.state.holders.find((h) => h.entityId === entityId && h.essenceId === essenceId);
    if (!holder) return 0;
    if (holder.origin === 'forged') {
      const decay = Math.max(0, 1 - (tick - holder.claimedAt) * FORGED_ESSENCE_DECAY);
      return holder.authority * decay;
    }
    return holder.authority;
  }

  isTrueEssence(entityId: string, essenceId: string): boolean {
    const holder = this.state.holders.find((h) => h.entityId === entityId && h.essenceId === essenceId);
    return holder !== undefined && holder.origin === 'primordial';
  }

  isHolder(entityId: string, essenceId: string): boolean {
    return this.state.holders.some((h) => h.entityId === entityId && h.essenceId === essenceId);
  }

  /**
   * Concept-overriding-matter: a holder declares a mapping for a concept
   * (holding Fire Essence defines what 'hot' means). Accepted when:
   *   1. the declarant holds the essence,
   *   2. the essence is TRUE (primordial origin — false essences cannot
   *      override law), and
   *   3. the holder's current authority ≥ the local law resistance.
   */
  declareConcept(input: DeclarationInput, lawResistance: number, tick: number): DeclarationResult {
    if (!this.isHolder(input.entityId, input.essenceId)) {
      return { ok: false, reason: 'not_holder' };
    }
    if (!this.isTrueEssence(input.entityId, input.essenceId)) {
      return { ok: false, reason: 'false_essence' };
    }
    const authority = this.currentAuthority(input.entityId, input.essenceId, tick);
    if (authority < lawResistance) {
      return { ok: false, reason: 'law_resistance' };
    }
    this.state.overrides = this.state.overrides.filter((o) => o.concept !== input.concept);
    this.state.overrides.push({
      concept: input.concept,
      mapping: input.mapping,
      essenceId: input.essenceId,
      holderId: input.entityId,
      declaredAt: tick,
      authority,
    });
    return { ok: true, reason: 'ok' };
  }

  /**
   * Resolve what a concept means for a given matter. A holder's accepted
   * declaration wins over default law — the essence defines the concept.
   */
  resolveConcept(concept: string, _matter: string): ConceptResolution {
    const override = this.state.overrides.find((o) => o.concept === concept);
    if (override) {
      return { source: 'essence_override', mapping: override.mapping };
    }
    return { source: 'default_law', mapping: `default:${concept}` };
  }

  /** Deterministic helper used by conformance: claim/predate as one flow. */
  acquireOrPredate(input: ClaimInput, tick: number): { ok: boolean; via: 'claim' | 'predation' | 'failed'; holderId?: string } {
    const claim = this.claim(input);
    if (claim.ok) return { ok: true, via: 'claim', holderId: claim.holder.entityId };
    const predation = this.predate({
      predator: input.entityId,
      essenceId: input.essenceId,
      authority: input.authority,
      tick,
      seed: deterministicId('pred', input.seed, [input.entityId, input.essenceId, tick]),
    });
    if (predation.success) return { ok: true, via: 'predation', holderId: input.entityId };
    return { ok: false, via: 'failed' };
  }
}
