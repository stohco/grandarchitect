/**
 * Architect Types
 *
 * The typed interfaces for the Grand Architect Control Plane.
 * These define what tools, resources, permissions, and evidence
 * the AI architect can use to inspect and modify the engine.
 */

import type { Result } from '../kernel/types';

// ============================================================================
// Authority Levels (progressive — each level includes the previous)
// ============================================================================

export type AuthorityLevel =
  | 'observe'    // Read state, inspect architecture, capture diagnostics
  | 'diagnose'   // Run tests, profilers, replays, preview worlds
  | 'sandbox'    // Modify temporary state, scaffold plugins in worktree
  | 'branch'     // Commit to AI development branch
  | 'integrate'  // Merge to main with approval
  | 'release';   // Production builds, permanent world changes

// ============================================================================
// Architect Tool
// ============================================================================

export interface ArchitectTool {
  id: string;
  description: string;
  authorityRequired: AuthorityLevel;

  // Input schema (what the tool accepts)
  inputSchema: Record<string, ToolParam>;

  // Output type
  outputType: 'json' | 'text' | 'image' | 'binary' | 'void';

  // Whether this tool mutates state
  mutates: boolean;

  // Whether this tool is deterministic
  deterministic: boolean;

  // Execution function
  execute(params: Record<string, unknown>, context: ToolContext): Promise<ToolResult>;
}

export interface ToolParam {
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  required: boolean;
  description: string;
  default?: unknown;
}

export interface ToolContext {
  authority: AuthorityLevel;
  pluginId?: string;
  requestId: string;
  tick?: number;
}

export interface ToolResult {
  ok: boolean;
  data?: unknown;
  error?: string;
  metadata?: {
    durationMs: number;
    bytesReturned?: number;
    warnings?: string[];
  };
}

// ============================================================================
// Architect Resource (read-only, addressable)
// ============================================================================

export interface ArchitectResource {
  uri: string;          // e.g., "engine://plugins", "world://entity/42"
  description: string;
  mimeType: 'application/json' | 'text/plain' | 'image/png';
  authorityRequired: AuthorityLevel;
  read(): Promise<unknown>;
}

// ============================================================================
// Permission
// ============================================================================

export interface PermissionCheck {
  authority: AuthorityLevel;
  toolId: string;
  allowed: boolean;
  reason?: string;
}

// ============================================================================
// Audit Record
// ============================================================================

export interface AuditRecord {
  id: string;
  timestamp: number;
  requestId: string;
  actor: string;       // 'ai' or 'human' or plugin id
  authority: AuthorityLevel;
  action: string;      // tool id or resource uri
  params: unknown;
  result: 'success' | 'failure' | 'denied' | 'error';
  durationMs: number;
  detail?: string;
}

// ============================================================================
// Evidence Bundle (attached to every accepted commit)
// ============================================================================

export interface EvidenceBundle {
  taskId: string;
  baseCommit: string;
  resultingCommit: string;
  changedFiles: string[];
  testCommands: string[];
  testResults: TestResult[];
  replayHashes?: string[];
  benchmarks?: BenchmarkResult[];
  permissionChanges: string[];
  dependencyChanges: string[];
  knownLimitations: string[];
  rollbackInstructions: string;
  timestamp: string;
}

export interface TestResult {
  command: string;
  passed: boolean;
  output: string;
  duration: number;
}

export interface BenchmarkResult {
  name: string;
  value: number;
  unit: string;
  regression: boolean;
  previousValue?: number;
}

// ============================================================================
// Decision Record (architectural decision ledger)
// ============================================================================

export interface DecisionRecord {
  id: string;
  date: string;
  engineVersion: string;
  problem: string;
  context: string;
  alternatives: { name: string; description: string; rejected: string }[];
  selectedApproach: string;
  reasons: string;
  disadvantages: string;
  affectedCapabilities: string[];
  reconsiderationTriggers: string[];
  dissenters?: string[];
}

// ============================================================================
// Capability Requirement (machine-readable capability graph)
// ============================================================================

export interface CapabilityRequirement {
  id: string;
  description: string;
  requiredBy: string[];
  dependsOn: string[];
  acceptanceTests: string[];
  performanceBudgets: { metric: string; maximum: number; unit: string }[];
  implementationState: 'unplanned' | 'designed' | 'partial' | 'implemented' | 'validated' | 'blocked';
  evidence: string[];
  knownDefects: string[];
}
