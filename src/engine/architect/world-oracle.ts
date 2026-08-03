import type { CapabilityGap } from './types';
import type { CapabilityGraph } from './capability-graph';
import type { DecisionLedger } from './decision-ledger';
import type { AuditTrail } from './audit';

/**
 * The World Oracle.
 *
 * A searchable index over the engine's state, the capability graph,
 * and the decision ledger. It is the AI's interface to "what does the
 * engine know about itself?"
 */

export interface WorldOracle {
  /** Search across all subsystems. */
  search(query: OracleQuery): OracleResult;
  /** Get the current engine state summary. */
  getEngineSummary(): EngineSummary;
  /** Get the capability gap (work queue). */
  getGap(): CapabilityGap[];
  /** Get a specific capability requirement. */
  getCapability(id: string): unknown;
  /** Get a specific architectural decision. */
  getDecision(id: string): unknown;
  /** Explain why the engine is the way it is (provenance). */
  explain(target: string): ExplanationResult;
}

export interface OracleQuery {
  /** Free-text search across decisions, capabilities, and audit. */
  text?: string;
  /** Filter to capability IDs matching prefix. */
  capabilityPrefix?: string;
  /** Filter to decisions affecting a specific system. */
  affectedSystem?: string;
  /** Filter to a specific implementation state. */
  implementationState?: string;
  limit?: number;
}

export interface OracleResult {
  capabilities: unknown[];
  decisions: unknown[];
  gaps: CapabilityGap[];
  totalMatches: number;
}

export interface EngineSummary {
  totalCapabilities: number;
  implementedCapabilities: number;
  totalDecisions: number;
  activeDecisions: number;
  currentGap: number;
  auditRecordCount: number;
}

export interface ExplanationResult {
  target: string;
  decisions: unknown[];
  capabilities: unknown[];
  summary: string;
}

export function createWorldOracle(
  capabilityGraph: CapabilityGraph,
  decisionLedger: DecisionLedger,
  auditTrail: AuditTrail,
): WorldOracle {

  function search(query: OracleQuery): OracleResult {
    const capabilities: unknown[] = [];
    const decisions: unknown[] = [];

    // Search capabilities
    const capKeys = capabilityGraph.keys();
    for (const id of capKeys) {
      const req = capabilityGraph.get(id);
      if (!req) continue;

      if (query.capabilityPrefix && !id.startsWith(query.capabilityPrefix)) continue;
      if (query.implementationState && req.implementationState !== query.implementationState) continue;
      if (query.text) {
        const kw = query.text.toLowerCase();
        if (!req.description.toLowerCase().includes(kw) && !id.toLowerCase().includes(kw)) continue;
      }

      capabilities.push(req);
    }

    // Search decisions
    const decisionResults = decisionLedger.search({
      keyword: query.text,
      affectedSystem: query.affectedSystem,
      limit: query.limit,
    });
    decisions.push(...decisionResults);

    const gaps = capabilityGraph.computeGap();
    const totalMatches = capabilities.length + decisions.length;

    return {
      capabilities,
      decisions,
      gaps,
      totalMatches,
    };
  }

  function getEngineSummary(): EngineSummary {
    const capKeys = capabilityGraph.keys();
    let implemented = 0;
    for (const id of capKeys) {
      const req = capabilityGraph.get(id);
      if (req?.implementationState === 'implemented') implemented++;
    }

    const decisions = decisionLedger.search({});
    const activeDecisions = decisions.filter(d => d.status === 'active').length;

    return {
      totalCapabilities: capabilityGraph.size(),
      implementedCapabilities: implemented,
      totalDecisions: decisionLedger.size(),
      activeDecisions,
      currentGap: capabilityGraph.computeGap().length,
      auditRecordCount: auditTrail.size(),
    };
  }

  function getGap(): CapabilityGap[] {
    return capabilityGraph.computeGap();
  }

  function getCapability(id: string): unknown {
    return capabilityGraph.get(id);
  }

  function getDecision(id: string): unknown {
    return decisionLedger.get(id);
  }

  function explain(target: string): ExplanationResult {
    // Find decisions that reference this target
    const relatedDecisions = decisionLedger.search({
      affectedSystem: target,
      limit: 10,
    });

    // Find capabilities related to this target
    const allCaps: unknown[] = [];
    for (const id of capabilityGraph.keys()) {
      const req = capabilityGraph.get(id);
      if (req && (
        id.includes(target) ||
        req.owningPlugin?.includes(target) ||
        req.requiredBy.some(r => r.includes(target))
      )) {
        allCaps.push(req);
      }
    }

    const summary = relatedDecisions.length > 0
      ? `Found ${relatedDecisions.length} decisions and ${allCaps.length} capabilities related to '${target}'.`
      : `No decisions or capabilities found related to '${target}'.`;

    return {
      target,
      decisions: relatedDecisions,
      capabilities: allCaps,
      summary,
    };
  }

  return { search, getEngineSummary, getGap, getCapability, getDecision, explain };
}
