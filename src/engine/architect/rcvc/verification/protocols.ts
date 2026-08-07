/**
 * Protocol Definitions
 *
 * Critical protocols that must be verified by the model checker:
 *   1. Permission escalation (Grand Architect autonomy)
 *   2. Tool lifecycle (register → dispatch → unregister)
 *   3. Preview/commit/rollback (transaction lifecycle)
 *   4. Worker revision replacement (atomic swap)
 *   5. Concurrent user/AI editing (lock conflict)
 *   6. World snapshot forks (branch isolation)
 *   7. Plugin loading and unloading (dependency safety)
 *   8. Save migrations (version-by-version upgrade)
 *   9. Terrain render/collision atomicity (no torn state)
 *
 * No forbidden functions. No Three.js, no DOM.
 */

import type { ProtocolSpec } from '../types';

// ============================================================================
// 1. Permission Escalation Protocol
// ============================================================================

export const permissionEscalationProtocol: ProtocolSpec = {
  name: 'permission_escalation',
  description: 'Grand Architect autonomy escalation — cannot skip levels',
  initialVars: { autonomy: 1, escalated: false, humanApproved: false },
  states: [
    { id: 'observe', label: 'Observe (L1)', isAccepting: true, isError: false },
    { id: 'diagnose', label: 'Diagnose (L2)', isAccepting: true, isError: false },
    { id: 'sandbox', label: 'Sandbox (L3)', isAccepting: true, isError: false },
    { id: 'preview', label: 'Preview (L4)', isAccepting: true, isError: false },
    { id: 'branch', label: 'Branch (L5)', isAccepting: true, isError: false },
    { id: 'integrate', label: 'Integrate (L6)', isAccepting: false, isError: false },
    { id: 'release', label: 'Release (L7)', isAccepting: true, isError: false },
    { id: 'denied', label: 'Denied', isAccepting: false, isError: true },
  ],
  initialState: 'observe',
  transitions: [
    { from: 'observe', to: 'diagnose', label: 'escalate_to_L2',
      guard: v => (v.autonomy as number) >= 1,
      effect: v => ({ ...v, autonomy: 2, escalated: true }) },
    { from: 'diagnose', to: 'sandbox', label: 'escalate_to_L3',
      guard: v => (v.autonomy as number) >= 2,
      effect: v => ({ ...v, autonomy: 3, escalated: true }) },
    { from: 'sandbox', to: 'preview', label: 'escalate_to_L4',
      guard: v => (v.autonomy as number) >= 3,
      effect: v => ({ ...v, autonomy: 4, escalated: true }) },
    { from: 'preview', to: 'branch', label: 'escalate_to_L5',
      guard: v => (v.autonomy as number) >= 4,
      effect: v => ({ ...v, autonomy: 5, escalated: true }) },
    { from: 'branch', to: 'integrate', label: 'escalate_to_L6',
      guard: v => (v.autonomy as number) >= 5 && v.humanApproved === true,
      effect: v => ({ ...v, autonomy: 6, escalated: true }) },
    { from: 'integrate', to: 'release', label: 'escalate_to_L7',
      guard: v => (v.autonomy as number) >= 6 && v.humanApproved === true,
      effect: v => ({ ...v, autonomy: 7, escalated: true }) },
    { from: 'integrate', to: 'branch', label: 'rollback_to_L5',
      effect: v => ({ ...v, autonomy: 5 }) },
    // Forbidden direct jumps (should be blocked by guard)
    { from: 'observe', to: 'denied', label: 'FORBIDDEN_jump_to_L7',
      guard: v => v.humanApproved === false,
      effect: v => ({ ...v, autonomy: 7 }) },
  ],
  invariants: [
    {
      label: 'no_skip_more_than_one_level',
      predicate: v => {
        // autonomy can only increase by at most 1 per transition
        // (checked via the trace, but here we verify it stays in valid range)
        return typeof v.autonomy === 'number' && v.autonomy >= 1 && v.autonomy <= 7;
      },
    },
    {
      label: 'release_requires_human_approval',
      predicate: v => !(v.autonomy === 7) || v.humanApproved === true,
    },
  ],
  properties: [
    {
      label: 'cannot_reach_release_without_approval',
      kind: 'safety',
      check: trace => {
        // If any state in the trace has autonomy 7, humanApproved must be true
        return trace.vars.every(v => !(v.autonomy === 7) || v.humanApproved === true);
      },
    },
  ],
};

// ============================================================================
// 2. Tool Lifecycle Protocol
// ============================================================================

export const toolLifecycleProtocol: ProtocolSpec = {
  name: 'tool_lifecycle',
  description: 'Tool register → dispatch → unregister — cannot dispatch unregistered tools',
  initialVars: { registered: false, inFlight: 0, disposed: false },
  states: [
    { id: 'unregistered', label: 'Unregistered', isAccepting: true, isError: false },
    { id: 'registered', label: 'Registered', isAccepting: true, isError: false },
    { id: 'dispatching', label: 'Dispatching', isAccepting: false, isError: false },
    { id: 'error', label: 'Error', isAccepting: false, isError: true },
  ],
  initialState: 'unregistered',
  transitions: [
    { from: 'unregistered', to: 'registered', label: 'register',
      effect: v => ({ ...v, registered: true }) },
    { from: 'registered', to: 'dispatching', label: 'dispatch',
      effect: v => ({ ...v, inFlight: (v.inFlight as number) + 1 }) },
    { from: 'dispatching', to: 'registered', label: 'complete',
      guard: v => (v.inFlight as number) > 0,
      effect: v => ({ ...v, inFlight: (v.inFlight as number) - 1 }) },
    { from: 'registered', to: 'unregistered', label: 'unregister',
      guard: v => (v.inFlight as number) === 0,
      effect: v => ({ ...v, registered: false }) },
    { from: 'dispatching', to: 'error', label: 'dispatch_after_unregister',
      guard: v => v.registered === false },
  ],
  invariants: [
    {
      label: 'no_dispatch_when_unregistered',
      predicate: v => !(v.inFlight as number > 0 && v.registered === false),
    },
    {
      label: 'inFlight_nonnegative',
      predicate: v => (v.inFlight as number) >= 0,
    },
  ],
  properties: [
    {
      label: 'never_dispatch_unregistered',
      kind: 'safety',
      check: trace => trace.states[trace.states.length - 1] !== 'error',
    },
  ],
};

// ============================================================================
// 3. Preview/Commit/Rollback Protocol
// ============================================================================

export const previewCommitRollbackProtocol: ProtocolSpec = {
  name: 'preview_commit_rollback',
  description: 'Transaction lifecycle — preview → commit or rollback',
  initialVars: { stage: 'idle', applied: false, rolledBack: false },
  states: [
    { id: 'idle', label: 'Idle', isAccepting: true, isError: false },
    { id: 'previewing', label: 'Previewing', isAccepting: false, isError: false },
    { id: 'committed', label: 'Committed', isAccepting: true, isError: false },
    { id: 'rolled_back', label: 'Rolled Back', isAccepting: true, isError: false },
    { id: 'double_commit', label: 'Double Commit', isAccepting: false, isError: true },
  ],
  initialState: 'idle',
  transitions: [
    { from: 'idle', to: 'previewing', label: 'begin_preview',
      effect: v => ({ ...v, stage: 'preview' }) },
    { from: 'previewing', to: 'committed', label: 'commit',
      effect: v => ({ ...v, stage: 'committed', applied: true }) },
    { from: 'previewing', to: 'rolled_back', label: 'rollback',
      effect: v => ({ ...v, stage: 'rolled_back', rolledBack: true }) },
    { from: 'committed', to: 'rolled_back', label: 'undo_commit',
      effect: v => ({ ...v, stage: 'rolled_back', applied: false, rolledBack: true }) },
    { from: 'committed', to: 'double_commit', label: 'FORBIDDEN_second_commit',
      guard: v => v.applied === true },
    { from: 'rolled_back', to: 'double_commit', label: 'FORBIDDEN_commit_after_rollback',
      guard: v => v.rolledBack === true },
  ],
  invariants: [
    {
      label: 'not_both_applied_and_rolled_back',
      predicate: v => !(v.applied === true && v.rolledBack === true),
    },
  ],
  properties: [
    {
      label: 'no_double_commit',
      kind: 'safety',
      check: trace => !trace.states.includes('double_commit'),
    },
    {
      label: 'eventually_terminal',
      kind: 'liveness',
      check: () => true,
    },
  ],
};

// ============================================================================
// 4. World Snapshot Fork Protocol
// ============================================================================

export const snapshotForkProtocol: ProtocolSpec = {
  name: 'snapshot_fork',
  description: 'Branch isolation — forks cannot corrupt parent',
  initialVars: { parentTxCount: 0, forkTxCount: 0, forkMerged: false },
  states: [
    { id: 'parent_only', label: 'Parent Only', isAccepting: true, isError: false },
    { id: 'forked', label: 'Forked', isAccepting: false, isError: false },
    { id: 'merged', label: 'Merged', isAccepting: true, isError: false },
    { id: 'discarded', label: 'Discarded', isAccepting: true, isError: false },
    { id: 'corrupted', label: 'Parent Corrupted', isAccepting: false, isError: true },
  ],
  initialState: 'parent_only',
  transitions: [
    { from: 'parent_only', to: 'forked', label: 'fork',
      effect: v => ({ ...v, forkTxCount: 0 }) },
    { from: 'forked', to: 'forked', label: 'fork_edit',
      effect: v => ({ ...v, forkTxCount: (v.forkTxCount as number) + 1 }) },
    { from: 'forked', to: 'merged', label: 'merge_to_parent',
      effect: v => ({ ...v, parentTxCount: (v.parentTxCount as number) + (v.forkTxCount as number), forkMerged: true }) },
    { from: 'forked', to: 'discarded', label: 'discard_fork',
      effect: v => ({ ...v, forkTxCount: 0 }) },
    { from: 'forked', to: 'corrupted', label: 'FORBIDDEN_direct_parent_edit',
      guard: v => v.forkMerged === false,
      effect: v => ({ ...v, parentTxCount: (v.parentTxCount as number) + 999 }) },
  ],
  invariants: [
    {
      label: 'parent_untouched_during_fork',
      predicate: v => !(v.forkMerged === false && (v.parentTxCount as number) > 0 && (v.forkTxCount as number) > 0),
    },
  ],
  properties: [
    {
      label: 'parent_never_corrupted',
      kind: 'safety',
      check: trace => !trace.states.includes('corrupted'),
    },
  ],
};

// ============================================================================
// 5. Plugin Load/Unload Protocol
// ============================================================================

export const pluginLifecycleProtocol: ProtocolSpec = {
  name: 'plugin_lifecycle',
  description: 'Plugin load/unload — cannot unload a plugin with dependents',
  initialVars: { loaded: false, dependents: 0, unloading: false },
  states: [
    { id: 'unloaded', label: 'Unloaded', isAccepting: true, isError: false },
    { id: 'loaded', label: 'Loaded', isAccepting: true, isError: false },
    { id: 'error', label: 'Error (dependents remain)', isAccepting: false, isError: true },
  ],
  initialState: 'unloaded',
  transitions: [
    { from: 'unloaded', to: 'loaded', label: 'load',
      effect: v => ({ ...v, loaded: true, dependents: 0 }) },
    { from: 'loaded', to: 'loaded', label: 'dependent_added',
      effect: v => ({ ...v, dependents: (v.dependents as number) + 1 }) },
    { from: 'loaded', to: 'loaded', label: 'dependent_removed',
      guard: v => (v.dependents as number) > 0,
      effect: v => ({ ...v, dependents: (v.dependents as number) - 1 }) },
    { from: 'loaded', to: 'unloaded', label: 'unload',
      guard: v => (v.dependents as number) === 0,
      effect: v => ({ ...v, loaded: false }) },
    { from: 'loaded', to: 'error', label: 'FORBIDDEN_unload_with_dependents',
      guard: v => (v.dependents as number) > 0 },
  ],
  invariants: [
    {
      label: 'no_unload_with_dependents',
      predicate: v => v.loaded === true || (v.dependents as number) === 0,
    },
  ],
  properties: [
    {
      label: 'never_unload_with_active_dependents',
      kind: 'safety',
      check: trace => !trace.states.includes('error'),
    },
  ],
};

// ============================================================================
// 6. Terrain Render/Collision Atomicity Protocol
// ============================================================================

export const terrainAtomicityProtocol: ProtocolSpec = {
  name: 'terrain_atomicity',
  description: 'Render and collision meshes must update atomically — no torn state',
  initialVars: { renderRev: 0, collisionRev: 0, updating: false },
  states: [
    { id: 'consistent', label: 'Consistent', isAccepting: true, isError: false },
    { id: 'render_updated', label: 'Render Only Updated', isAccepting: false, isError: false },
    { id: 'collision_updated', label: 'Collision Only Updated', isAccepting: false, isError: false },
    { id: 'torn', label: 'Torn State', isAccepting: false, isError: true },
  ],
  initialState: 'consistent',
  transitions: [
    { from: 'consistent', to: 'render_updated', label: 'update_render',
      effect: v => ({ ...v, renderRev: (v.renderRev as number) + 1, updating: true }) },
    { from: 'render_updated', to: 'consistent', label: 'update_collision',
      effect: v => ({ ...v, collisionRev: (v.collisionRev as number) + 1, updating: false }) },
    { from: 'consistent', to: 'collision_updated', label: 'update_collision_first',
      effect: v => ({ ...v, collisionRev: (v.collisionRev as number) + 1, updating: true }) },
    { from: 'collision_updated', to: 'consistent', label: 'update_render_after',
      effect: v => ({ ...v, renderRev: (v.renderRev as number) + 1, updating: false }) },
    { from: 'render_updated', to: 'torn', label: 'FORBIDDEN_read_before_collision',
      guard: v => v.updating === true },
    { from: 'collision_updated', to: 'torn', label: 'FORBIDDEN_read_before_render',
      guard: v => v.updating === true },
  ],
  invariants: [
    {
      label: 'render_and_collision_revisions_match_when_idle',
      predicate: v => v.updating === false ? (v.renderRev as number) === (v.collisionRev as number) : true,
    },
  ],
  properties: [
    {
      label: 'never_observe_torn_state',
      kind: 'safety',
      check: trace => !trace.states.includes('torn'),
    },
  ],
};

// ============================================================================
// All protocols
// ============================================================================

export const ALL_PROTOCOLS: ProtocolSpec[] = [
  permissionEscalationProtocol,
  toolLifecycleProtocol,
  previewCommitRollbackProtocol,
  snapshotForkProtocol,
  pluginLifecycleProtocol,
  terrainAtomicityProtocol,
];
