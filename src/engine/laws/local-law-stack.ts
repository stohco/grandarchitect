/**
 * laws/local-law-stack.ts — LocalLawStack with explicit conflict semantics
 * ========================================================================
 *
 * Local laws (formations, domains, restrictions, sect wards, Mahayana
 * authored laws) stack on top of realm laws with priority + stacking rules,
 * and can override realm laws entirely.
 *
 * Resolution semantics (deterministic, documented):
 *
 *   1. Entries are grouped by interaction category (domain).
 *   2. Within a group, entries are sorted by priority DESC, then entryId
 *      ASC (stable tiebreak — same inputs always produce the same order).
 *   3. 'realm-override' entries replace the realm law's resistance VALUE
 *      for the domain (only the highest-priority override applies).
 *   4. 'mutual-exclusion' entries cancel each other in pairs — both are
 *      dropped and the domain is unaffected (recorded as a conflict).
 *   5. 'strongest-wins' groups keep only the entry with the max |authority|.
 *   6. 'priority-wins' entries drop any LOWER-priority entry that pushes
 *      the other direction (one reinforces >1 while the other weakens <1)
 *      — the conflict is recorded; reinforcement of the same direction is
 *      allowed to stack via the entry's stackingRule.
 *   7. Remaining entries apply their stackingRule onto the domain
 *      multiplier (which starts at 1.0, i.e. "realm law unchanged"):
 *        multiplicative:  m *= authority
 *        additive:        m += (authority - 1)
 *        max:             m = max(m, authority)
 *        min:             m = min(m, authority)
 *
 * The resolved per-domain multiplier multiplies the world's realm-law
 * resistance in the solver (>1 reinforces the world, <1 weakens it).
 */

import type { InteractionCategory, LawDomain } from './types';
import { LAW_DOMAINS } from './types';

export type StackingRule = 'multiplicative' | 'additive' | 'max' | 'min';

export type ConflictRule =
  /** Higher priority overrides lower priority in opposite-direction pushes. */
  | 'priority-wins'
  /** Only the entry with max |authority| in the group applies. */
  | 'strongest-wins'
  /** Replaces the realm law's resistance value for this domain. */
  | 'realm-override'
  /** Mutually exclusive with other 'mutual-exclusion' entries in the group. */
  | 'mutual-exclusion';

export interface LawStackEntry {
  entryId: string;
  /** Interaction category the entry governs (a domain). */
  domain: LawDomain;
  interactionCategory: InteractionCategory;
  /** Reinforcement/weakening authority. >1 reinforces the world's laws,
   *  <1 weakens them. Realm-override entries carry the replacement VALUE
   *  of the realm resistance instead. */
  authority: number;
  /** Higher priority wins conflicts. Realm laws are priority 0. */
  priority: number;
  stackingRule: StackingRule;
  conflictRule: ConflictRule;
  /** 'formation' | 'domain' | 'restriction' | 'realm-law' | 'authored-law'. */
  source: string;
  label?: string;
}

export interface LocalLawStack {
  entries: LawStackEntry[];
}

export function createLocalLawStack(entries: LawStackEntry[] = []): LocalLawStack {
  return { entries };
}

export function addLawEntry(stack: LocalLawStack, entry: Omit<LawStackEntry, 'interactionCategory'>): LocalLawStack {
  return {
    entries: [...stack.entries, { ...entry, interactionCategory: entry.domain }],
  };
}

export interface LawStackConflict {
  entryIdA: string;
  entryIdB: string;
  domain: LawDomain;
  reason: 'priority-override' | 'strongest-wins' | 'mutual-exclusion-cancel' | 'realm-override-loser';
  keptEntryId: string | null;
}

export interface LocalLawStackResolution {
  /** Per-domain multiplier applied to realm-law resistance. */
  perDomainMultipliers: Record<LawDomain, number>;
  /** Replacement resistance values from realm-override entries. */
  realmOverrides: Partial<Record<LawDomain, { value: number; entryId: string }>>;
  /** Entries that were applied (not dropped). */
  appliedEntries: string[];
  /** Dropped entries. */
  droppedEntries: string[];
  conflicts: LawStackConflict[];
}

function entryKey(e: LawStackEntry): string {
  return `${e.priority.toString().padStart(8, '0')}:${e.entryId}`;
}

export function resolveLocalLawStack(stack: LocalLawStack | null | undefined): LocalLawStackResolution {
  const perDomainMultipliers = {} as Record<LawDomain, number>;
  for (const d of LAW_DOMAINS) perDomainMultipliers[d] = 1;
  const realmOverrides: LocalLawStackResolution['realmOverrides'] = {};
  const appliedEntries: string[] = [];
  const droppedEntries: string[] = [];
  const conflicts: LawStackConflict[] = [];

  if (!stack || stack.entries.length === 0) {
    return { perDomainMultipliers, realmOverrides, appliedEntries, droppedEntries, conflicts };
  }

  for (const d of LAW_DOMAINS) {
    const group = stack.entries
      .filter((e) => e.domain === d || e.interactionCategory === d)
      .sort((a, b) => (entryKey(a) < entryKey(b) ? -1 : 1))
      .reverse(); // priority DESC, entryId ASC tiebreak

    if (group.length === 0) continue;

    // --- realm-override: highest priority wins ---------------------------------
    const overrides = group
      .filter((e) => e.conflictRule === 'realm-override')
      .sort((a, b) => (entryKey(a) < entryKey(b) ? -1 : 1))
      .reverse();
    if (overrides.length > 0) {
      const winner = overrides[0];
      realmOverrides[d] = { value: winner.authority, entryId: winner.entryId };
      appliedEntries.push(winner.entryId);
      for (let i = 1; i < overrides.length; i++) {
        droppedEntries.push(overrides[i].entryId);
        conflicts.push({
          entryIdA: winner.entryId,
          entryIdB: overrides[i].entryId,
          domain: d,
          reason: 'realm-override-loser',
          keptEntryId: winner.entryId,
        });
      }
    }

    // --- mutual-exclusion pairs cancel -----------------------------------------
    const exclusions = group.filter((e) => e.conflictRule === 'mutual-exclusion');
    const cancelled = new Set<string>();
    for (let i = 0; i + 1 < exclusions.length; i += 2) {
      const a = exclusions[i];
      const b = exclusions[i + 1];
      cancelled.add(a.entryId);
      cancelled.add(b.entryId);
      droppedEntries.push(a.entryId, b.entryId);
      conflicts.push({
        entryIdA: a.entryId,
        entryIdB: b.entryId,
        domain: d,
        reason: 'mutual-exclusion-cancel',
        keptEntryId: null,
      });
    }
    // Odd leftover cancellation entry: drops itself (no partner).
    if (exclusions.length % 2 === 1 && !cancelled.has(exclusions[exclusions.length - 1].entryId)) {
      const leftover = exclusions[exclusions.length - 1];
      cancelled.add(leftover.entryId);
      droppedEntries.push(leftover.entryId);
      conflicts.push({
        entryIdA: leftover.entryId,
        entryIdB: leftover.entryId,
        domain: d,
        reason: 'mutual-exclusion-cancel',
        keptEntryId: null,
      });
    }

    // --- strongest-wins: keep max |authority| ----------------------------------
    const strongest = group.filter((e) => e.conflictRule === 'strongest-wins' && !cancelled.has(e.entryId));
    if (strongest.length > 0) {
      const winner = strongest.reduce((acc, e) => (Math.abs(e.authority) >= Math.abs(acc.authority) ? e : acc), strongest[0]);
      const winnerAbs = Math.abs(winner.authority);
      const alsoWinners = strongest.filter((e) => Math.abs(e.authority) === winnerAbs);
      // Tie on |authority|: the higher-priority one wins.
      const kept = alsoWinners.reduce((acc, e) => (e.priority >= acc.priority ? e : acc), winner);
      for (const e of strongest) {
        if (e.entryId === kept.entryId) {
          appliedEntries.push(e.entryId);
        } else {
          droppedEntries.push(e.entryId);
          conflicts.push({
            entryIdA: kept.entryId,
            entryIdB: e.entryId,
            domain: d,
            reason: 'strongest-wins',
            keptEntryId: kept.entryId,
          });
        }
      }
      perDomainMultipliers[d] = kept.authority;
    }

    // --- priority-wins + stacking rules -----------------------------------------
    const stacking = group
      .filter(
        (e) =>
          (e.conflictRule === 'priority-wins' || e.conflictRule === 'realm-override') &&
          !cancelled.has(e.entryId) &&
          e.conflictRule !== 'realm-override',
      )
      .filter((e) => !strongest.some((s) => s.entryId === e.entryId) && !overrides.some((o) => o.entryId === e.entryId));

    let domainMult = 1;
    const appliedHere: LawStackEntry[] = [];
    for (const e of stacking) {
      // Priority-wins: drop lower-priority entries pushing the other direction
      // from something already applied here.
      const pushedOpposite = appliedHere.some(
        (prev) =>
          e.priority < prev.priority &&
          ((prev.authority > 1 && e.authority < 1) || (prev.authority < 1 && e.authority > 1)),
      );
      if (e.conflictRule === 'priority-wins' && pushedOpposite) {
        droppedEntries.push(e.entryId);
        conflicts.push({
          entryIdA: appliedHere[appliedHere.length - 1].entryId,
          entryIdB: e.entryId,
          domain: d,
          reason: 'priority-override',
          keptEntryId: appliedHere[appliedHere.length - 1].entryId,
        });
        continue;
      }
      switch (e.stackingRule) {
        case 'multiplicative':
          domainMult *= e.authority;
          break;
        case 'additive':
          domainMult += e.authority - 1;
          break;
        case 'max':
          // [DERIVED] 'max' = the loosest applied law governs; the 1.0
          // baseline participates only if NO entry applies.
          domainMult = appliedHere.length === 0 ? e.authority : Math.max(domainMult, e.authority);
          break;
        case 'min':
          // [DERIVED] 'min' = the strictest applied law governs (weakest
          // reinforcement binds); same empty-baseline rule.
          domainMult = appliedHere.length === 0 ? e.authority : Math.min(domainMult, e.authority);
          break;
      }
      appliedHere.push(e);
      appliedEntries.push(e.entryId);
    }
    if (appliedHere.length > 0) perDomainMultipliers[d] = domainMult;
  }

  return { perDomainMultipliers, realmOverrides, appliedEntries, droppedEntries, conflicts };
}
