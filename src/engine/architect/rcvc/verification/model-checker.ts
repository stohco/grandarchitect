/**
 * State-Machine Model Checker
 *
 * BFS-based model checker for protocol state machines. Explores all
 * reachable states (up to a bound), checks invariants on every state,
 * and verifies safety/liveness properties over traces.
 *
 * Used to verify critical protocols:
 *   - Grand Architect permission escalation
 *   - Tool lifecycle
 *   - Preview/commit/rollback
 *   - Worker revision replacement
 *   - Concurrent user/AI editing
 *   - World snapshot forks
 *   - Plugin loading and unloading
 *   - Save migrations
 *   - Terrain render/collision atomicity
 *
 * No forbidden functions. No Three.js, no DOM.
 */

import type {
  ProtocolSpec,
  ProtocolTrace,
  ModelCheckResult,
  InvariantViolation,
  PropertyResult,
  ProtocolTransition,
} from '../types';

// ============================================================================
// Model checker
// ============================================================================

export interface ModelCheckerOptions {
  maxStates?: number;          // bound on total states explored
  maxDepth?: number;           // bound on trace length
  maxTraces?: number;          // bound on number of traces
}

export function modelCheck(
  spec: ProtocolSpec,
  options: ModelCheckerOptions = {},
): ModelCheckResult {
  const maxStates = options.maxStates ?? 2000;
  const maxDepth = options.maxDepth ?? 20;
  const maxTraces = options.maxTraces ?? 5000;

  const statesExplored = new Set<string>();
  const invariantViolations: InvariantViolation[] = [];
  const propertyResults: PropertyResult[] = [];
  let tracesExplored = 0;
  let worstTrace: ProtocolTrace | undefined;

  // BFS frontier
  interface FrontierItem {
    state: string;
    vars: Record<string, unknown>;
    trace: ProtocolTrace;
  }

  const initial: FrontierItem = {
    state: spec.initialState,
    vars: { ...spec.initialVars },
    trace: {
      states: [spec.initialState],
      transitions: [],
      vars: [{ ...spec.initialVars }],
    },
  };

  const queue: FrontierItem[] = [initial];

  while (queue.length > 0 && statesExplored.size < maxStates && tracesExplored < maxTraces) {
    const item = queue.shift()!;
    tracesExplored++;

    const stateKey = `${item.state}|${stableStringify(item.vars)}`;
    if (statesExplored.has(stateKey)) continue;
    statesExplored.add(stateKey);

    // Check invariants
    for (const inv of spec.invariants) {
      if (!inv.predicate(item.vars)) {
        const violation: InvariantViolation = {
          invariantLabel: inv.label,
          state: item.state,
          vars: { ...item.vars },
          trace: item.trace,
        };
        invariantViolations.push(violation);
        if (!worstTrace || item.trace.states.length > worstTrace.states.length) {
          worstTrace = item.trace;
        }
      }
    }

    // Check safety properties
    for (const prop of spec.properties) {
      if (prop.kind === 'safety') {
        const holds = prop.check(item.trace);
        if (!holds) {
          const existing = propertyResults.find(p => p.propertyLabel === prop.label);
          if (!existing) {
            propertyResults.push({
              propertyLabel: prop.label,
              kind: 'safety',
              holds: false,
              counterexampleTrace: item.trace,
            });
          }
        }
      }
    }

    if (item.trace.states.length >= maxDepth) continue;

    // Explore transitions
    for (const trans of spec.transitions) {
      if (trans.from !== item.state) continue;
      if (trans.guard && !trans.guard(item.vars)) continue;

      const newVars = trans.effect ? trans.effect({ ...item.vars }) : { ...item.vars };
      const newTrace: ProtocolTrace = {
        states: [...item.trace.states, trans.to],
        transitions: [...item.trace.transitions, trans.label],
        vars: [...item.trace.vars, { ...newVars }],
      };

      queue.push({ state: trans.to, vars: newVars, trace: newTrace });
    }
  }

  // Mark safety properties as holding if no counterexample was found
  for (const prop of spec.properties) {
    if (prop.kind === 'safety') {
      const existing = propertyResults.find(p => p.propertyLabel === prop.label);
      if (!existing) {
        propertyResults.push({
          propertyLabel: prop.label,
          kind: 'safety',
          holds: true,
        });
      }
    } else {
      // Liveness: we approximate by checking if any accepting state is reachable
      // from every non-error state. This is a simple bounded approximation.
      const acceptingReachable = checkLiveness(spec, maxStates);
      propertyResults.push({
        propertyLabel: prop.label,
        kind: 'liveness',
        holds: acceptingReachable,
      });
    }
  }

  const verdict: ModelCheckResult['verdict'] =
    invariantViolations.length > 0 || propertyResults.some(p => !p.holds)
      ? 'violations_found'
      : 'all_pass';

  return {
    protocolName: spec.name,
    tracesExplored,
    statesExplored: statesExplored.size,
    invariantViolations,
    propertyResults,
    verdict,
    worstTrace,
  };
}

// ============================================================================
// Liveness approximation — is an accepting state reachable from every state?
// ============================================================================

function checkLiveness(spec: ProtocolSpec, maxStates: number): boolean {
  const acceptingStates = new Set(spec.states.filter(s => s.isAccepting).map(s => s.id));
  if (acceptingStates.size === 0) return false;

  // Build adjacency
  const adjacency = new Map<string, string[]>();
  for (const t of spec.transitions) {
    if (!adjacency.has(t.from)) adjacency.set(t.from, []);
    adjacency.get(t.from)!.push(t.to);
  }

  // For each non-error state, BFS to see if an accepting state is reachable
  for (const state of spec.states) {
    if (state.isError) continue;
    const visited = new Set<string>([state.id]);
    const queue = [state.id];
    let found = state.isAccepting;
    while (queue.length > 0 && !found && visited.size < maxStates) {
      const s = queue.shift()!;
      const neighbors = adjacency.get(s) ?? [];
      for (const n of neighbors) {
        if (acceptingStates.has(n)) { found = true; break; }
        if (!visited.has(n)) { visited.add(n); queue.push(n); }
      }
    }
    if (!found) return false;
  }
  return true;
}

// ============================================================================
// Helpers
// ============================================================================

function stableStringify(obj: Record<string, unknown>): string {
  const keys = Object.keys(obj).sort();
  const parts = keys.map(k => `${k}=${JSON.stringify(obj[k])}`);
  return parts.join('|');
}
