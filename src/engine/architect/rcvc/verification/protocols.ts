/**
 * Protocol Definitions — 6 critical protocols for model checking.
 * No forbidden functions. No Three.js, no DOM.
 */
import type { ProtocolSpec } from '../types';

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
  initial: 'observe',
  transitions: [
    { from: 'observe', to: 'diagnose', label: 'L2', guard: v => v.autonomy >= 1, effect: v => ({ ...v, autonomy: 2, escalated: true }) },
    { from: 'diagnose', to: 'sandbox', label: 'L3', guard: v => v.autonomy >= 2, effect: v => ({ ...v, autonomy: 3 }) },
    { from: 'sandbox', to: 'preview', label: 'L4', guard: v => v.autonomy >= 3, effect: v => ({ ...v, autonomy: 4 }) },
    { from: 'preview', to: 'branch', label: 'L5', guard: v => v.autonomy >= 4, effect: v => ({ ...v, autonomy: 5 }) },
    { from: 'branch', to: 'integrate', label: 'L6', guard: v => v.autonomy >= 5 && v.humanApproved === true, effect: v => ({ ...v, autonomy: 6 }) },
    { from: 'integrate', to: 'release', label: 'L7', guard: v => v.autonomy >= 6 && v.humanApproved === true, effect: v => ({ ...v, autonomy: 7 }) },
    { from: 'observe', to: 'denied', label: 'FORBIDDEN', guard: v => v.humanApproved === false, effect: v => ({ ...v, autonomy: 7 }) },
  ],
  invariants: [
    { label: 'autonomy_in_range', predicate: v => typeof v.autonomy === 'number' && v.autonomy >= 1 && v.autonomy <= 7 },
    { label: 'release_needs_approval', predicate: v => !(v.autonomy === 7) || v.humanApproved === true },
  ],
  properties: [
    { label: 'no_release_without_approval', kind: 'safety' as const, check: trace => trace.vars.every(v => !(v.autonomy === 7) || v.humanApproved === true) },
  ],
};

export const toolLifecycleProtocol: ProtocolSpec = {
  name: 'tool_lifecycle',
  description: 'Tool register → dispatch → unregister',
  initialVars: { registered: false, inFlight: 0, disposed: false },
  states: [
    { id: 'unregistered', label: 'Unregistered', isAccepting: true, isError: false },
    { id: 'registered', label: 'Registered', isAccepting: true, isError: false },
    { id: 'dispatching', label: 'Dispatching', isAccepting: false, isError: false },
    { id: 'error', label: 'Error', isAccepting: false, isError: true },
  ],
  initial: 'unregistered',
  transitions: [
    { from: 'unregistered', to: 'registered', label: 'register', effect: v => ({ ...v, registered: true }) },
    { from: 'registered', to: 'dispatching', label: 'dispatch', effect: v => ({ ...v, inFlight: (v.inFlight as number) + 1 }) },
    { from: 'dispatching', to: 'registered', label: 'complete', guard: v => (v.inFlight as number) > 0, effect: v => ({ ...v, inFlight: (v.inFlight as number) - 1 }) },
    { from: 'registered', to: 'unregistered', label: 'unregister', guard: v => (v.inFlight as number) === 0, effect: v => ({ ...v, registered: false }) },
    { from: 'dispatching', to: 'error', label: 'BAD', guard: v => v.registered === false },
  ],
  invariants: [
    { label: 'no_dispatch_unregistered', predicate: v => !((v.inFlight as number) > 0 && v.registered === false) },
  ],
  properties: [
    { label: 'never_error', kind: 'safety' as const, check: trace => !trace.states.includes('error') },
  ],
};

export const previewCommitRollbackProtocol: ProtocolSpec = {
  name: 'preview_commit_rollback',
  description: 'Transaction lifecycle — no double commit',
  initialVars: { stage: 'idle', applied: false, rolledBack: false },
  states: [
    { id: 'idle', label: 'Idle', isAccepting: true, isError: false },
    { id: 'previewing', label: 'Previewing', isAccepting: false, isError: false },
    { id: 'committed', label: 'Committed', isAccepting: true, isError: false },
    { id: 'rolled_back', label: 'Rolled Back', isAccepting: true, isError: false },
    { id: 'double_commit', label: 'Double Commit', isAccepting: false, isError: true },
  ],
  initial: 'idle',
  transitions: [
    { from: 'idle', to: 'previewing', label: 'begin', effect: v => ({ ...v, stage: 'preview' }) },
    { from: 'previewing', to: 'committed', label: 'commit', effect: v => ({ ...v, stage: 'committed', applied: true }) },
    { from: 'previewing', to: 'rolled_back', label: 'rollback', effect: v => ({ ...v, stage: 'rolled_back', rolledBack: true }) },
    { from: 'committed', to: 'rolled_back', label: 'undo', effect: v => ({ ...v, applied: false, rolledBack: true }) },
    { from: 'committed', to: 'double_commit', label: 'BAD', guard: v => v.applied === true },
    { from: 'rolled_back', to: 'double_commit', label: 'BAD', guard: v => v.rolledBack === true },
  ],
  invariants: [
    { label: 'not_both', predicate: v => !(v.applied === true && v.rolledBack === true) },
  ],
  properties: [
    { label: 'no_double_commit', kind: 'safety' as const, check: trace => !trace.states.includes('double_commit') },
  ],
};

export const snapshotForkProtocol: ProtocolSpec = {
  name: 'snapshot_fork',
  description: 'Branch isolation — forks cannot corrupt parent',
  initialVars: { parentTxCount: 0, forkTxCount: 0, forkMerged: false },
  states: [
    { id: 'parent_only', label: 'Parent Only', isAccepting: true, isError: false },
    { id: 'forked', label: 'Forked', isAccepting: false, isError: false },
    { id: 'merged', label: 'Merged', isAccepting: true, isError: false },
    { id: 'discarded', label: 'Discarded', isAccepting: true, isError: false },
    { id: 'corrupted', label: 'Corrupted', isAccepting: false, isError: true },
  ],
  initial: 'parent_only',
  transitions: [
    { from: 'parent_only', to: 'forked', label: 'fork', effect: v => ({ ...v, forkTxCount: 0 }) },
    { from: 'forked', to: 'forked', label: 'fork_edit', effect: v => ({ ...v, forkTxCount: (v.forkTxCount as number) + 1 }) },
    { from: 'forked', to: 'merged', label: 'merge', effect: v => ({ ...v, parentTxCount: (v.parentTxCount as number) + (v.forkTxCount as number), forkMerged: true }) },
    { from: 'forked', to: 'discarded', label: 'discard', effect: v => ({ ...v, forkTxCount: 0 }) },
    { from: 'forked', to: 'corrupted', label: 'BAD', guard: v => v.forkMerged === false, effect: v => ({ ...v, parentTxCount: (v.parentTxCount as number) + 999 }) },
  ],
  invariants: [
    { label: 'parent_untouched', predicate: v => !(v.forkMerged === false && (v.parentTxCount as number) > 0 && (v.forkTxCount as number) > 0) },
  ],
  properties: [
    { label: 'never_corrupted', kind: 'safety' as const, check: trace => !trace.states.includes('corrupted') },
  ],
};

export const pluginLifecycleProtocol: ProtocolSpec = {
  name: 'plugin_lifecycle',
  description: 'Plugin load/unload — cannot unload with dependents',
  initialVars: { loaded: false, dependents: 0 },
  states: [
    { id: 'unloaded', label: 'Unloaded', isAccepting: true, isError: false },
    { id: 'loaded', label: 'Loaded', isAccepting: true, isError: false },
    { id: 'error', label: 'Error', isAccepting: false, isError: true },
  ],
  initial: 'unloaded',
  transitions: [
    { from: 'unloaded', to: 'loaded', label: 'load', effect: v => ({ ...v, loaded: true, dependents: 0 }) },
    { from: 'loaded', to: 'loaded', label: 'dep_add', effect: v => ({ ...v, dependents: (v.dependents as number) + 1 }) },
    { from: 'loaded', to: 'loaded', label: 'dep_remove', guard: v => (v.dependents as number) > 0, effect: v => ({ ...v, dependents: (v.dependents as number) - 1 }) },
    { from: 'loaded', to: 'unloaded', label: 'unload', guard: v => (v.dependents as number) === 0, effect: v => ({ ...v, loaded: false }) },
    { from: 'loaded', to: 'error', label: 'BAD', guard: v => (v.dependents as number) > 0 },
  ],
  invariants: [
    { label: 'no_unload_with_deps', predicate: v => v.loaded === true || (v.dependents as number) === 0 },
  ],
  properties: [
    { label: 'never_error', kind: 'safety' as const, check: trace => !trace.states.includes('error') },
  ],
};

export const terrainAtomicityProtocol: ProtocolSpec = {
  name: 'terrain_atomicity',
  description: 'Render and collision meshes must update atomically',
  initialVars: { renderRev: 0, collisionRev: 0, updating: false },
  states: [
    { id: 'consistent', label: 'Consistent', isAccepting: true, isError: false },
    { id: 'render_updated', label: 'Render Only', isAccepting: false, isError: false },
    { id: 'collision_updated', label: 'Collision Only', isAccepting: false, isError: false },
    { id: 'torn', label: 'Torn', isAccepting: false, isError: true },
  ],
  initial: 'consistent',
  transitions: [
    { from: 'consistent', to: 'render_updated', label: 'upd_render', effect: v => ({ ...v, renderRev: (v.renderRev as number) + 1, updating: true }) },
    { from: 'render_updated', to: 'consistent', label: 'upd_collision', effect: v => ({ ...v, collisionRev: (v.collisionRev as number) + 1, updating: false }) },
    { from: 'consistent', to: 'collision_updated', label: 'upd_collision_first', effect: v => ({ ...v, collisionRev: (v.collisionRev as number) + 1, updating: true }) },
    { from: 'collision_updated', to: 'consistent', label: 'upd_render_after', effect: v => ({ ...v, renderRev: (v.renderRev as number) + 1, updating: false }) },
    { from: 'render_updated', to: 'torn', label: 'BAD', guard: v => v.updating === true },
    { from: 'collision_updated', to: 'torn', label: 'BAD', guard: v => v.updating === true },
  ],
  invariants: [
    { label: 'revs_match_when_idle', predicate: v => v.updating === false ? (v.renderRev as number) === (v.collisionRev as number) : true },
  ],
  properties: [
    { label: 'never_torn', kind: 'safety' as const, check: trace => !trace.states.includes('torn') },
  ],
};

export const ALL_PROTOCOLS: ProtocolSpec[] = [
  permissionEscalationProtocol,
  toolLifecycleProtocol,
  previewCommitRollbackProtocol,
  snapshotForkProtocol,
  pluginLifecycleProtocol,
  terrainAtomicityProtocol,
];
