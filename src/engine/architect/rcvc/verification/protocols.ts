/**
 * Protocol Definitions — 6 critical protocols for model checking.
 *
 * These are aligned with the ProtocolSpec type in types.ts and the
 * model-checker in model-checker.ts. They use state-ID-based
 * reachability properties (mustReach / mustNotReach) rather than
 * variable tracking.
 */
import type { ProtocolSpec } from '../types';

export const permissionEscalationProtocol: ProtocolSpec = {
  id: 'permission_escalation',
  name: 'Permission Escalation',
  description: 'Grand Architect autonomy escalation — cannot skip levels',
  initial: 'observe',
  states: [
    { id: 'observe', label: 'Observe (L1)', accepting: true },
    { id: 'diagnose', label: 'Diagnose (L2)', accepting: true },
    { id: 'sandbox', label: 'Sandbox (L3)', accepting: true },
    { id: 'preview', label: 'Preview (L4)', accepting: true },
    { id: 'branch', label: 'Branch (L5)', accepting: true },
    { id: 'integrate', label: 'Integrate (L6)', accepting: false },
    { id: 'release', label: 'Release (L7)', accepting: true },
    { id: 'denied', label: 'Denied', accepting: false, meta: { error: 'true' } },
  ],
  transitions: [
    { from: 'observe', to: 'diagnose', event: 'escalate_L2' },
    { from: 'diagnose', to: 'sandbox', event: 'escalate_L3' },
    { from: 'sandbox', to: 'preview', event: 'escalate_L4' },
    { from: 'preview', to: 'branch', event: 'escalate_L5' },
    { from: 'branch', to: 'integrate', event: 'escalate_L6' },
    { from: 'integrate', to: 'release', event: 'escalate_L7' },
    { from: 'integrate', to: 'branch', event: 'rollback_L5' },
    { from: 'observe', to: 'denied', event: 'FORBIDDEN_jump_L7' },
  ],
  invariants: [
    { id: 'no_error_state_accepting', statement: 'Error states are not accepting', predicate: s => !(s.meta?.error === 'true' && s.accepting) },
  ],
  reachabilityProperties: [
    { id: 'release_reachable', statement: 'Release state is reachable (liveness)', mustReach: ['release'] },
    { id: 'denied_not_reachable', statement: 'Denied state is not reachable through normal escalation', mustNotReach: ['denied'] },
  ],
};

export const toolLifecycleProtocol: ProtocolSpec = {
  id: 'tool_lifecycle',
  name: 'Tool Lifecycle',
  description: 'Tool register → dispatch → unregister',
  initial: 'unregistered',
  states: [
    { id: 'unregistered', label: 'Unregistered', accepting: true },
    { id: 'registered', label: 'Registered', accepting: true },
    { id: 'dispatching', label: 'Dispatching', accepting: false },
    { id: 'error', label: 'Error', accepting: false, meta: { error: 'true' } },
  ],
  transitions: [
    { from: 'unregistered', to: 'registered', event: 'register' },
    { from: 'registered', to: 'dispatching', event: 'dispatch' },
    { from: 'dispatching', to: 'registered', event: 'complete' },
    { from: 'registered', to: 'unregistered', event: 'unregister' },
    { from: 'dispatching', to: 'error', event: 'FORBIDDEN_dispatch_unregistered' },
  ],
  invariants: [
    { id: 'error_not_accepting', statement: 'Error state is not accepting', predicate: s => !(s.meta?.error === 'true' && s.accepting) },
  ],
  reachabilityProperties: [
    { id: 'unregistered_reachable', statement: 'Can return to unregistered', mustReach: ['unregistered'] },
    { id: 'error_not_reachable', statement: 'Error state not reachable', mustNotReach: ['error'] },
  ],
};

export const previewCommitRollbackProtocol: ProtocolSpec = {
  id: 'preview_commit_rollback',
  name: 'Preview/Commit/Rollback',
  description: 'Transaction lifecycle — no double commit',
  initial: 'idle',
  states: [
    { id: 'idle', label: 'Idle', accepting: true },
    { id: 'previewing', label: 'Previewing', accepting: false },
    { id: 'committed', label: 'Committed', accepting: true },
    { id: 'rolled_back', label: 'Rolled Back', accepting: true },
    { id: 'double_commit', label: 'Double Commit', accepting: false, meta: { error: 'true' } },
  ],
  transitions: [
    { from: 'idle', to: 'previewing', event: 'begin' },
    { from: 'previewing', to: 'committed', event: 'commit' },
    { from: 'previewing', to: 'rolled_back', event: 'rollback' },
    { from: 'committed', to: 'rolled_back', event: 'undo' },
    { from: 'committed', to: 'double_commit', event: 'FORBIDDEN_second_commit' },
    { from: 'rolled_back', to: 'double_commit', event: 'FORBIDDEN_commit_after_rollback' },
  ],
  invariants: [
    { id: 'error_not_accepting', statement: 'Double commit is not accepting', predicate: s => !(s.meta?.error === 'true' && s.accepting) },
  ],
  reachabilityProperties: [
    { id: 'committed_reachable', statement: 'Committed is reachable', mustReach: ['committed'] },
    { id: 'double_commit_not_reachable', statement: 'Double commit not reachable', mustNotReach: ['double_commit'] },
  ],
};

export const snapshotForkProtocol: ProtocolSpec = {
  id: 'snapshot_fork',
  name: 'Snapshot Fork',
  description: 'Branch isolation — forks cannot corrupt parent',
  initial: 'parent_only',
  states: [
    { id: 'parent_only', label: 'Parent Only', accepting: true },
    { id: 'forked', label: 'Forked', accepting: false },
    { id: 'merged', label: 'Merged', accepting: true },
    { id: 'discarded', label: 'Discarded', accepting: true },
    { id: 'corrupted', label: 'Corrupted', accepting: false, meta: { error: 'true' } },
  ],
  transitions: [
    { from: 'parent_only', to: 'forked', event: 'fork' },
    { from: 'forked', to: 'forked', event: 'fork_edit' },
    { from: 'forked', to: 'merged', event: 'merge' },
    { from: 'forked', to: 'discarded', event: 'discard' },
    { from: 'forked', to: 'corrupted', event: 'FORBIDDEN_direct_parent_edit' },
  ],
  invariants: [
    { id: 'error_not_accepting', statement: 'Corrupted is not accepting', predicate: s => !(s.meta?.error === 'true' && s.accepting) },
  ],
  reachabilityProperties: [
    { id: 'merged_reachable', statement: 'Merged is reachable', mustReach: ['merged'] },
    { id: 'corrupted_not_reachable', statement: 'Corrupted not reachable', mustNotReach: ['corrupted'] },
  ],
};

export const pluginLifecycleProtocol: ProtocolSpec = {
  id: 'plugin_lifecycle',
  name: 'Plugin Lifecycle',
  description: 'Plugin load/unload — cannot unload with dependents',
  initial: 'unloaded',
  states: [
    { id: 'unloaded', label: 'Unloaded', accepting: true },
    { id: 'loaded', label: 'Loaded', accepting: true },
    { id: 'error', label: 'Error', accepting: false, meta: { error: 'true' } },
  ],
  transitions: [
    { from: 'unloaded', to: 'loaded', event: 'load' },
    { from: 'loaded', to: 'unloaded', event: 'unload' },
    { from: 'loaded', to: 'error', event: 'FORBIDDEN_unload_with_deps' },
  ],
  invariants: [
    { id: 'error_not_accepting', statement: 'Error is not accepting', predicate: s => !(s.meta?.error === 'true' && s.accepting) },
  ],
  reachabilityProperties: [
    { id: 'loaded_reachable', statement: 'Loaded is reachable', mustReach: ['loaded'] },
    { id: 'error_not_reachable', statement: 'Error not reachable', mustNotReach: ['error'] },
  ],
};

export const terrainAtomicityProtocol: ProtocolSpec = {
  id: 'terrain_atomicity',
  name: 'Terrain Atomicity',
  description: 'Render and collision meshes must update atomically',
  initial: 'consistent',
  states: [
    { id: 'consistent', label: 'Consistent', accepting: true },
    { id: 'render_updated', label: 'Render Only', accepting: false },
    { id: 'collision_updated', label: 'Collision Only', accepting: false },
    { id: 'torn', label: 'Torn', accepting: false, meta: { error: 'true' } },
  ],
  transitions: [
    { from: 'consistent', to: 'render_updated', event: 'update_render' },
    { from: 'render_updated', to: 'consistent', event: 'update_collision' },
    { from: 'consistent', to: 'collision_updated', event: 'update_collision_first' },
    { from: 'collision_updated', to: 'consistent', event: 'update_render_after' },
    { from: 'render_updated', to: 'torn', event: 'FORBIDDEN_read_before_collision' },
    { from: 'collision_updated', to: 'torn', event: 'FORBIDDEN_read_before_render' },
  ],
  invariants: [
    { id: 'error_not_accepting', statement: 'Torn is not accepting', predicate: s => !(s.meta?.error === 'true' && s.accepting) },
  ],
  reachabilityProperties: [
    { id: 'consistent_reachable', statement: 'Can return to consistent', mustReach: ['consistent'] },
    { id: 'torn_not_reachable', statement: 'Torn not reachable', mustNotReach: ['torn'] },
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
