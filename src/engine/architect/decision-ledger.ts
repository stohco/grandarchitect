import type { ArchitecturalDecision, ArchitectRole } from './types';

/**
 * The Architectural Decision Ledger.
 *
 * Records what was decided, why, what alternatives were considered,
 * and what would trigger reconsideration. The engine's institutional memory.
 */

export interface DecisionLedger {
  /** Record a decision. */
  record(decision: ArchitecturalDecision): void;
  /** Get a decision by ID. */
  get(decisionId: string): ArchitecturalDecision | undefined;
  /** Update a decision's status. */
  updateStatus(decisionId: string, status: ArchitecturalDecision['status'], supersededBy?: string): boolean;
  /** Search decisions by keyword, capability, or system. */
  search(query: DecisionSearchQuery): ArchitecturalDecision[];
  /** List all decision IDs. */
  keys(): string[];
  /** Get the total count. */
  size(): number;
}

export interface DecisionSearchQuery {
  keyword?: string;
  capabilityRef?: string;
  affectedSystem?: string;
  status?: ArchitecturalDecision['status'];
  deciderRole?: ArchitectRole | 'human';
  limit?: number;
}

export function createDecisionLedger(): DecisionLedger {
  const decisions = new Map<string, ArchitecturalDecision>();

  function record(decision: ArchitecturalDecision): void {
    decisions.set(decision.decisionId, decision);
  }

  function get(decisionId: string): ArchitecturalDecision | undefined {
    return decisions.get(decisionId);
  }

  function updateStatus(
    decisionId: string,
    status: ArchitecturalDecision['status'],
    supersededBy?: string,
  ): boolean {
    const decision = decisions.get(decisionId);
    if (!decision) return false;

    decision.status = status;
    if (supersededBy) {
      decision.supersededBy = supersededBy;
    }
    return true;
  }

  function search(query: DecisionSearchQuery): ArchitecturalDecision[] {
    let result = Array.from(decisions.values());

    if (query.keyword) {
      const kw = query.keyword.toLowerCase();
      result = result.filter(d =>
        d.problem.toLowerCase().includes(kw) ||
        d.selectedApproach.toLowerCase().includes(kw) ||
        d.why.toLowerCase().includes(kw)
      );
    }
    if (query.capabilityRef) {
      result = result.filter(d => d.capabilityRefs.includes(query.capabilityRef!));
    }
    if (query.affectedSystem) {
      result = result.filter(d => d.affectedSystems.includes(query.affectedSystem!));
    }
    if (query.status) {
      result = result.filter(d => d.status === query.status);
    }
    if (query.deciderRole) {
      result = result.filter(d => d.deciders.some(dec => dec.role === query.deciderRole));
    }

    const limit = query.limit ?? 50;
    return result.slice(0, limit);
  }

  function keys(): string[] {
    return Array.from(decisions.keys());
  }

  function size(): number {
    return decisions.size;
  }

  return { record, get, updateStatus, search, keys, size };
}
