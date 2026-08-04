/**
 * World Execution State Machine
 *
 * Implements doc 50 §6. The dormant-world runtime.
 * Manages transitions between generation freeze, dormant architect,
 * selective awakening, step simulation, full simulation, player
 * embodiment, and temporary forks.
 *
 * No forbidden functions. No Three.js, no DOM.
 */

import type {
  WorldExecutionState,
  SimulationDomain,
  DomainActivation,
  WorldStateSnapshot,
  Tick,
  EntityId,
} from './types';

// ============================================================================
// State machine
// ============================================================================

export const VALID_TRANSITIONS: Record<WorldExecutionState, WorldExecutionState[]> = {
  generation_freeze: ['dormant_architect', 'full_simulation', 'temporary_fork'],
  dormant_architect: ['generation_freeze', 'selective_awakening', 'step_simulation', 'full_simulation', 'player_embodiment', 'temporary_fork'],
  selective_awakening: ['dormant_architect', 'step_simulation', 'full_simulation', 'player_embodiment', 'temporary_fork'],
  step_simulation: ['dormant_architect', 'selective_awakening', 'full_simulation'],
  full_simulation: ['dormant_architect', 'selective_awakening', 'step_simulation', 'player_embodiment', 'temporary_fork'],
  player_embodiment: ['dormant_architect', 'full_simulation', 'selective_awakening'],
  temporary_fork: ['dormant_architect', 'full_simulation'],  // fork exits back to a non-fork state
};

export function canTransition(from: WorldExecutionState, to: WorldExecutionState): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}

// ============================================================================
// World runtime
// ============================================================================

export interface WorldRuntime {
  getState(): WorldExecutionState;
  getSnapshot(): WorldStateSnapshot;
  transitionTo(target: WorldExecutionState): boolean;
  getDomainActivations(): DomainActivation[];
  setDomainActive(domain: SimulationDomain, active: boolean, scope?: 'global' | 'region' | 'entity', ref?: string | EntityId): void;
  isDomainActive(domain: SimulationDomain): boolean;
  getActiveDomains(): SimulationDomain[];
  freeze(): void;
  fork(): string;  // returns fork id
  mergeFork(forkId: string, mergeAll: boolean): boolean;
  getForks(): string[];
  setFrozenTick(tick: Tick): void;
  getFrozenTick(): Tick;
}

export function createWorldRuntime(initialState: WorldExecutionState = 'generation_freeze'): WorldRuntime {
  let state: WorldExecutionState = initialState;
  let frozenTick: Tick = 0;
  let domainActivations: DomainActivation[] = [
    { domain: 'physics', active: false, scope: 'global' },
    { domain: 'animation', active: false, scope: 'global' },
    { domain: 'ai', active: false, scope: 'global' },
    { domain: 'ecology', active: false, scope: 'global' },
    { domain: 'economy', active: false, scope: 'global' },
    { domain: 'weather', active: false, scope: 'global' },
    { domain: 'history', active: false, scope: 'global' },
    { domain: 'combat', active: false, scope: 'global' },
    { domain: 'cultivation', active: false, scope: 'global' },
    { domain: 'social', active: false, scope: 'global' },
    { domain: 'audio', active: false, scope: 'global' },
    { domain: 'navigation', active: false, scope: 'global' },
  ];
  const forks = new Map<string, WorldStateSnapshot>();

  return {
    getState() { return state; },

    getSnapshot(): WorldStateSnapshot {
      return {
        state,
        domains: domainActivations.map(d => ({ ...d })),
        frozenAtTick: frozenTick,
      };
    },

    transitionTo(target: WorldExecutionState): boolean {
      if (!canTransition(state, target)) return false;
      state = target;
      // When entering dormant or freeze, deactivate all domains
      if (target === 'dormant_architect' || target === 'generation_freeze') {
        domainActivations = domainActivations.map(d => ({ ...d, active: false }));
      }
      // When entering full simulation, activate all domains
      if (target === 'full_simulation') {
        domainActivations = domainActivations.map(d => ({ ...d, active: true }));
      }
      return true;
    },

    getDomainActivations() {
      return domainActivations.map(d => ({ ...d }));
    },

    setDomainActive(domain: SimulationDomain, active: boolean, scope: 'global' | 'region' | 'entity' = 'global', ref?: string | EntityId) {
      const d = domainActivations.find(d => d.domain === domain);
      if (!d) return;
      d.active = active;
      d.scope = scope;
      d.regionId = scope === 'region' && typeof ref === 'string' ? ref : undefined;
      d.entityId = scope === 'entity' && typeof ref !== 'string' ? ref : undefined;
    },

    isDomainActive(domain: SimulationDomain): boolean {
      return domainActivations.find(d => d.domain === domain)?.active ?? false;
    },

    getActiveDomains(): SimulationDomain[] {
      return domainActivations.filter(d => d.active).map(d => d.domain);
    },

    freeze() {
      state = 'generation_freeze';
      domainActivations = domainActivations.map(d => ({ ...d, active: false }));
    },

    fork(): string {
      const forkId = `fork-${frozenTick}-${forks.size}`;
      forks.set(forkId, this.getSnapshot());
      return forkId;
    },

    mergeFork(forkId: string, _mergeAll: boolean): boolean {
      return forks.delete(forkId);
    },

    getForks(): string[] {
      return Array.from(forks.keys());
    },

    setFrozenTick(tick: Tick) { frozenTick = tick; },
    getFrozenTick(): Tick { return frozenTick; },
  };
}

// ============================================================================
// Step simulation
// ============================================================================

export type StepGranularity =
  | 'render_frame' | 'physics_tick' | 'ai_decision' | 'combat_turn'
  | 'minute' | 'hour' | 'day' | 'month' | 'year'
  | 'until_event' | 'until_breakpoint' | 'until_invariant_violation';

export interface StepRequest {
  granularity: StepGranularity;
  count: number;         // e.g. 3 physics ticks
  eventId?: string;      // for 'until_event'
  breakpointId?: string; // for 'until_breakpoint'
  maxTicks?: number;     // safety cap
}

export interface StepResult {
  completed: boolean;
  ticksAdvanced: number;
  stoppedBy?: string;    // event id, breakpoint id, or 'max_ticks'
  eventsFired: string[];
  stateAtEnd: WorldExecutionState;
}

export function executeStep(
  runtime: WorldRuntime,
  request: StepRequest
): StepResult {
  if (runtime.getState() !== 'step_simulation' &&
      runtime.getState() !== 'selective_awakening' &&
      runtime.getState() !== 'dormant_architect') {
    return {
      completed: false,
      ticksAdvanced: 0,
      eventsFired: [],
      stateAtEnd: runtime.getState(),
    };
  }

  const originalState = runtime.getState();
  runtime.transitionTo('step_simulation');

  // Convert granularity to tick counts (simplified, deterministic)
  const ticksPerUnit: Record<string, number> = {
    render_frame: 1,
    physics_tick: 1,
    ai_decision: 60,      // ~1 second at 60fps
    combat_turn: 600,     // ~10 seconds
    minute: 3600,
    hour: 3600 * 60,
    day: 3600 * 60 * 24,
    month: 3600 * 60 * 24 * 30,
    year: 3600 * 60 * 24 * 365,
  };

  let ticksToAdvance: number;
  if (request.granularity === 'until_event' || request.granularity === 'until_breakpoint' || request.granularity === 'until_invariant_violation') {
    ticksToAdvance = request.maxTicks ?? 10000;
  } else {
    ticksToAdvance = (ticksPerUnit[request.granularity] ?? 1) * request.count;
  }

  // Advance the frozen tick
  const startTick = runtime.getFrozenTick();
  runtime.setFrozenTick(startTick + ticksToAdvance);

  // Return to original state
  runtime.transitionTo(originalState);

  return {
    completed: true,
    ticksAdvanced: ticksToAdvance,
    stoppedBy: request.granularity === 'until_event' ? request.eventId : undefined,
    eventsFired: request.granularity === 'until_event' && request.eventId ? [request.eventId] : [],
    stateAtEnd: runtime.getState(),
  };
}
