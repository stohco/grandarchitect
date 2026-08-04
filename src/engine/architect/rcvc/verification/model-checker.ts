/**
 * Model checker — explicit-state BFS over protocol transition systems.
 *
 * For each protocol, we explore every reachable state (bounded by
 * `maxStates`) and check:
 *   - every invariant holds on every reachable state
 *   - every reachability property is satisfied (must-reach / must-not-reach)
 *
 * The model checker is intentionally shallow: it does NOT do LTL model
 * checking or symbolic state-space exploration. It enumerates.
 */

import type {
  ModelCheckResult,
  ProtocolSpec,
  ProtocolState,
} from '../types';

const DEFAULT_MAX_STATES = 10_000;

// ============================================================================
// BFS
// ============================================================================

export interface ModelCheckOptions {
  maxStates?: number;
}

export function modelCheck(protocol: ProtocolSpec, opts: ModelCheckOptions = {}): ModelCheckResult {
  const maxStates = opts.maxStates ?? DEFAULT_MAX_STATES;
  const stateMap = new Map<string, ProtocolState>();
  for (const s of protocol.states) stateMap.set(s.id, s);

  const reachable = new Set<string>();
  const queue: string[] = [protocol.initial];
  reachable.add(protocol.initial);
  let bfsIterations = 0;

  while (queue.length > 0) {
    bfsIterations++;
    if (reachable.size > maxStates) break;
    const currentId = queue.shift()!;
    const current = stateMap.get(currentId);
    if (!current) continue;

    // Explore outgoing transitions.
    for (const t of protocol.transitions) {
      if (t.from !== currentId) continue;
      if (t.guard && !t.guard(current)) continue;
      if (reachable.has(t.to)) continue;
      reachable.add(t.to);
      queue.push(t.to);
    }
  }

  // Check invariants on every reachable state.
  const invariantViolations: Array<{ state: string; invariantId: string; statement: string }> = [];
  for (const stateId of reachable) {
    const state = stateMap.get(stateId);
    if (!state) continue;
    for (const inv of protocol.invariants) {
      try {
        if (!inv.predicate(state)) {
          invariantViolations.push({ state: stateId, invariantId: inv.id, statement: inv.statement });
        }
      } catch {
        // A throwing predicate is treated as a violation.
        invariantViolations.push({ state: stateId, invariantId: inv.id, statement: `${inv.statement} (predicate threw)` });
      }
    }
  }

  // Check reachability properties.
  const reachabilityResults = protocol.reachabilityProperties.map(prop => {
    const reached = (prop.mustReach ?? []).filter(id => reachable.has(id));
    const missing = (prop.mustReach ?? []).filter(id => !reachable.has(id));
    const forbiddenHit = (prop.mustNotReach ?? []).filter(id => reachable.has(id));
    const satisfied = missing.length === 0 && forbiddenHit.length === 0;
    return { propertyId: prop.id, satisfied, reached, missing: [...missing, ...forbiddenHit.map(id => `forbidden:${id}`)] };
  });

  const passes = invariantViolations.length === 0 && reachabilityResults.every(r => r.satisfied);

  return {
    protocolId: protocol.id,
    protocolName: protocol.name,
    reachableStates: [...reachable].sort(),
    invariantViolations,
    reachabilityResults,
    passes,
    bfsIterations,
    note: passes
      ? `All invariants hold on all ${reachable.size} reachable state(s); all reachability properties satisfied.`
      : `${invariantViolations.length} invariant violation(s); ${reachabilityResults.filter(r => !r.satisfied).length} reachability failure(s).`,
  };
}

/** Model-check a list of protocols. Returns one result per protocol. */
export function modelCheckAll(protocols: ProtocolSpec[], opts?: ModelCheckOptions): ModelCheckResult[] {
  return protocols.map(p => modelCheck(p, opts));
}
