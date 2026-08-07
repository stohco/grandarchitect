/**
 * Grand Architect Control Plane — Shared Types
 *
 * The types shared across the entire architect subsystem.
 * No xianxia concepts. No Three.js types. No DOM types.
 * Pure architect primitives.
 */

import type { PluginId, CapabilityId, Tick, Result } from '../kernel/types';
export type { PluginId, CapabilityId, Tick, Result } from '../kernel/types';

// ============================================================================
// Autonomy Levels
// ============================================================================

/** Risk-based autonomy levels. Linearly ordered; each includes the previous. */
export type AutonomyLevel =
  | 'Observe'      // 1 — read anything; mutate nothing
  | 'Diagnose'     // 2 — run traces, explain, propose
  | 'Sandbox'      // 3 — modify isolated workspace; cannot touch main
  | 'Preview'      // 4 — run workspace in preview build; player cannot see
  | 'Branch'       // 5 — push workspace to a branch; CI runs
  | 'Integrate'    // 6 — merge branch to main; main is updated
  | 'Release';     // 7 — ship to players; save migration may run

/** Ordered from least to most privileged. */
export const AUTONOMY_ORDER: readonly AutonomyLevel[] = [
  'Observe', 'Diagnose', 'Sandbox', 'Preview', 'Branch', 'Integrate', 'Release',
] as const;

/** Return the numeric rank of an autonomy level (1-based). */
export function autonomyRank(level: AutonomyLevel): number {
  return AUTONOMY_ORDER.indexOf(level) + 1;
}

/** Check whether `a` is at least as privileged as `b`. */
export function autonomyGte(a: AutonomyLevel, b: AutonomyLevel): boolean {
  return autonomyRank(a) >= autonomyRank(b);
}

// ============================================================================
// Architect Roles
// ============================================================================

export type ArchitectRole =
  | 'Architect'
  | 'Researcher'
  | 'Implementer'
  | 'Reviewer'
  | 'VlmPlaytester'
  | 'PerformanceAuditor'
  | 'SimulationAuditor'
  | 'SecurityReviewer';

export interface RoleProfile {
  role: ArchitectRole;
  allowedTools: string[];
  autonomyCeiling: AutonomyLevel;
  mayEscalate: boolean;
  requiresReview: boolean;
}

// ============================================================================
// Session
// ============================================================================

export interface ArchitectSession {
  sessionId: string;
  principalId: string;
  role: ArchitectRole;
  autonomy: AutonomyLevel;
  capabilities: string[];
  issuedAt: string;
  expiresAt: string;
  renewalToken: string;
}

// ============================================================================
// Tools
// ============================================================================

export type ToolCategory =
  | 'Inspection'
  | 'ControlledEditing'
  | 'Execution'
  | 'Explanation';

export type ToolPermission =
  | 'read-state'
  | 'write-state'
  | 'execute'
  | 'network'
  | 'filesystem';

export interface ToolBudget {
  maxWallClockMs: number;
  maxCpuMs: number;
  maxMemoryMiB: number;
  maxTotalMs?: number;
}

/** A lightweight JSON Schema subset for tool I/O validation. */
export type JsonSchema =
  | { type: 'string'; description?: string; enum?: string[] }
  | { type: 'number'; description?: string; minimum?: number; maximum?: number }
  | { type: 'boolean'; description?: string }
  | { type: 'array'; items: JsonSchema; description?: string }
  | { type: 'object'; properties: Record<string, JsonSchema>; required?: string[]; description?: string }
  | { type: 'null' };

/** Declares a tool the AI can call. */
export interface ArchitectTool {
  /** Namespaced tool name, e.g. 'engine.describe', 'definition.patch'. */
  name: string;
  /** One-line description for tool selection. */
  description: string;
  /** The category. */
  category: ToolCategory;
  /** Input schema (JSON Schema subset). */
  inputSchema: JsonSchema;
  /** Output schema (JSON Schema subset). */
  outputSchema: JsonSchema;
  /** Permissions required. */
  requiresPermissions: ToolPermission[];
  /** Minimum autonomy to call. */
  requiresAutonomy: AutonomyLevel;
  /** Whether this tool mutates engine state. */
  mutatesState: boolean;
  /** Runtime budget. */
  budget: ToolBudget;
  /** Whether the tool is long-running. */
  longRunning: boolean;
  /** The plugin that registered this tool. */
  registeredBy: PluginId;
  /** The handler. */
  handler: ToolHandler;
}

export type ToolHandler = (params: Record<string, unknown>, context: ToolContext) => Promise<ToolResult>;

export interface ToolContext {
  sessionId: string;
  principalId: string;
  role: ArchitectRole;
  autonomy: AutonomyLevel;
  tick: Tick;
}

export type ToolResult =
  | { ok: true; data: unknown }
  | { ok: false; error: ToolError };

export interface ToolError {
  code: string;
  message: string;
  details?: unknown;
}

// ============================================================================
// Resources
// ============================================================================

/** A resource the AI can read (not mutate). */
export interface ArchitectResource {
  /** Resource URI, e.g. 'doc://43', 'capability://engine.render.webgpu'. */
  uri: string;
  /** MIME type. */
  mimeType: string;
  /** Human-readable name. */
  name: string;
  /** Description for the AI. */
  description: string;
}

// ============================================================================
// Permissions & Authorization
// ============================================================================

export interface ArchitectPermission {
  tool: string;
  maxAutonomy: AutonomyLevel;
  expiresAt: string;
  grantedBy: string;
  token: string;
  singleUse: boolean;
}

export type AuthorizationResult =
  | { allowed: true }
  | { allowed: false; reason: AuthorizationDenialReason };

export type AuthorizationDenialReason =
  | { kind: 'PermissionDenied'; tool: string }
  | { kind: 'AutonomyExceeded'; required: AutonomyLevel; asserted: AutonomyLevel }
  | { kind: 'ToolNotFound'; tool: string }
  | { kind: 'SessionExpired'; sessionId: string }
  | { kind: 'RoleNotAllowed'; role: ArchitectRole; tool: string }
  | { kind: 'TokenInvalid'; reason: string };

// ============================================================================
// Audit
// ============================================================================

export interface AuditRecord {
  recordId: string;
  previousHash: string;
  contentHash: string;
  agent: { principalId: string; role: ArchitectRole };
  human: { principalId: string };
  tool: string;
  args: Record<string, unknown>;
  timestamp: string;
  tick?: Tick;
  reason: string;
  proposalRef?: string;
  result: { status: 'ok' | 'error' | 'cancelled'; summary: string };
  capabilityTokenHash: string;
  autonomy: AutonomyLevel;
  sessionId: string;
  cost: { cpuMs: number; wallMs: number };
}

export interface AuditFilter {
  agent?: string;
  tool?: string;
  timeRange?: { from: string; to: string };
  proposalRef?: string;
  resultStatus?: 'ok' | 'error' | 'cancelled';
  limit?: number;
}

// ============================================================================
// Capability Graph
// ============================================================================

export interface CapabilityRequirement {
  id: string;
  description: string;
  requiredBy: string[];
  dependsOn: string[];
  acceptanceTests: string[];
  implementationState: 'not-started' | 'in-progress' | 'implemented' | 'deprecated' | 'rejected';
  evidence: string[];
  knownDefects: string[];
  owningPlugin?: PluginId;
  decisionLedgerRef?: string;
  addedAt: string;
  addedBy: string;
}

export interface CapabilityGap {
  requirementId: string;
  currentState: string;
  description: string;
  priority: 'low' | 'med' | 'high' | 'critical';
}

// ============================================================================
// Decision Ledger
// ============================================================================

export interface ArchitecturalDecision {
  decisionId: string;
  problem: string;
  context: string;
  selectedApproach: string;
  why: string;
  knownDrawbacks: string[];
  affectedSystems: string[];
  reconsiderationTriggers: string[];
  date: string;
  engineVersion: string;
  deciders: { role: ArchitectRole | 'human'; principalId: string }[];
  status: 'active' | 'superseded' | 'deprecated';
  supersededBy?: string;
  relatedDecisions: string[];
  capabilityRefs: string[];
}

// ============================================================================
// Command Channel
// ============================================================================

export interface CommandRequest {
  requestId: string;
  sessionId: string;
  tool: string;
  args: Record<string, unknown>;
  assertedAutonomy: AutonomyLevel;
  capabilityToken: string;
  deadlineMs: number;
}

export interface CommandResponse {
  requestId: string;
  status: 'ok' | 'error' | 'pending' | 'cancelled';
  result?: unknown;
  error?: { code: string; message: string; details?: unknown };
  asyncHandle?: string;
  audit: AuditRecord;
}
