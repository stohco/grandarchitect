/**
 * Workspace Agent Provider — Provider-Neutral Interface
 * =====================================================
 *
 * A development-only abstraction for external coding agents (Prime Agent,
 * Claude Code, future alternatives) that work on the Grand Architect
 * repository. This is NOT part of the shipped game runtime.
 *
 * ARCHITECTURE:
 *
 *   You
 *    │
 *    ▼
 *   Prime Agent (or other workspace agent)
 *    ├── implementation agent (write access to isolated worktree)
 *    ├── browser verifier (read-only)
 *    ├── adversarial reviewer (read-only)
 *    ├── architecture reviewer (read-only)
 *    └── security reviewer (read-only)
 *    │
 *    ▼
 *   Grand Architect repository (isolated worktree)
 *
 * CONSTRAINTS:
 *   - Dev-only: never in shipped runtime
 *   - One editing agent per worktree (prevents merge disasters)
 *   - Multiple read-only reviewers allowed
 *   - Authenticated, sandboxed, disconnected from production
 *   - Cannot mutate main directly
 *   - Cannot access production secrets
 *   - Cannot grant itself Grand Architect authority
 *
 * Prime Agent exposes a JSONL RPC mode for embedding. A future
 * PrimeAgentWorkspaceProvider would communicate via that RPC interface
 * — it would NOT import Prime Agent packages into the browser.
 */

// ---------------------------------------------------------------------------
// Session Types
// ---------------------------------------------------------------------------

export interface WorkspaceAgentRequest {
  /** Unique request ID. */
  requestId: string;
  /** The task instruction. */
  instruction: string;
  /** Which role this agent should play. */
  role: WorkspaceAgentRole;
  /** Isolated worktree path (must NOT be the main repo). */
  worktreePath: string;
  /** Base commit SHA to work from. */
  baseCommitSha: string;
  /** Model to use (provider-specific). */
  model?: string;
  /** Resource limits. */
  limits?: WorkspaceAgentLimits;
  /** Quality gates to pass. */
  qualityGates?: string[];
}

export type WorkspaceAgentRole =
  | 'implementer'       // Write access to the worktree
  | 'browser-verifier'  // Read-only; runs exact user workflows
  | 'architecture-reviewer' // Read-only; checks boundaries
  | 'adversarial-reviewer'  // Read-only; tries to disprove claims
  | 'security-reviewer' // Read-only; audits routes/permissions/secrets
  | 'performance-reviewer'; // Read-only; profiles frame time/memory

export interface WorkspaceAgentLimits {
  maxTurns?: number;
  maxTokens?: number;
  maxTimeSec?: number;
}

export interface WorkspaceSession {
  sessionId: string;
  request: WorkspaceAgentRequest;
  status: WorkspaceSessionStatus;
  startedAt: string;
  /** Current progress (0-1). */
  progress: number;
  /** Goals being tracked. */
  goals: WorkspaceGoal[];
}

export type WorkspaceSessionStatus =
  | 'starting'
  | 'running'
  | 'paused'
  | 'completed'
  | 'failed'
  | 'terminated';

export interface WorkspaceGoal {
  goalId: string;
  objective: string;
  progress: number;
  status: 'active' | 'paused' | 'completed' | 'cancelled';
}

// ---------------------------------------------------------------------------
// Observation and Events
// ---------------------------------------------------------------------------

export type WorkspaceEvent =
  | { type: 'message'; content: string; role: WorkspaceAgentRole; timestamp: string }
  | { type: 'file-change'; path: string; action: 'create' | 'modify' | 'delete'; timestamp: string }
  | { type: 'command'; command: string; exitCode: number; duration: number; timestamp: string }
  | { type: 'gate-passed'; gateId: string; timestamp: string }
  | { type: 'gate-failed'; gateId: string; error: string; timestamp: string }
  | { type: 'goal-update'; goalId: string; progress: number; timestamp: string }
  | { type: 'error'; message: string; timestamp: string };

export type WorkspaceAgentListener = (event: WorkspaceEvent) => void;
export type Unsubscribe = () => void;

// ---------------------------------------------------------------------------
// Artifacts and Evidence
// ---------------------------------------------------------------------------

export interface WorkspaceArtifact {
  artifactId: string;
  type: 'commit' | 'file' | 'test-report' | 'screenshot' | 'log' | 'diff';
  path: string;
  hash?: string;
  createdAt: string;
}

export interface WorkspaceEvidenceBundle {
  /** Local commit SHA after work. */
  commitSha: string | null;
  /** Remote commit SHA (if pushed). */
  remoteSha: string | null;
  /** Whether the worktree is clean. */
  cleanWorktree: boolean;
  /** Build artifact provenance. */
  buildProvenance: {
    commitSha: string;
    buildTimestamp: string;
    buildId: string;
    dirty: boolean;
  } | null;
  /** Commands executed. */
  commands: Array<{
    command: string;
    exitCode: number;
    duration: number;
    output?: string;
  }>;
  /** Test results. */
  testResults: Array<{
    suite: string;
    passed: number;
    failed: number;
    total: number;
    ok: boolean;
  }>;
  /** Browser/OS used for verification. */
  verificationEnvironment: {
    browser: string;
    os: string;
  } | null;
  /** Console errors/warnings captured. */
  consoleErrors: string[];
  /** Known unresolved limitations. */
  knownLimitations: string[];
  /** Independent reviewer verdicts. */
  reviewerVerdicts: Array<{
    reviewer: WorkspaceAgentRole;
    verdict: 'pass' | 'fail' | 'needs-review';
    notes: string;
  }>;
}

// ---------------------------------------------------------------------------
// The Provider Contract
// ---------------------------------------------------------------------------

export interface WorkspaceAgentProvider {
  /** Unique provider identifier (e.g. "prime-agent", "claude-code"). */
  readonly providerId: string;
  /** Human-readable display name. */
  readonly displayName: string;
  /** Whether this provider is available (has a running runtime). */
  readonly available: boolean;

  /**
   * Start a new workspace agent session. The agent works in an ISOLATED
   * worktree — never the main repo.
   */
  startSession(request: WorkspaceAgentRequest): Promise<WorkspaceSession>;

  /**
   * Send an instruction to a running session.
   */
  sendInstruction(
    sessionId: string,
    instruction: string,
  ): Promise<void>;

  /**
   * Observe session events (messages, file changes, gates, errors).
   */
  observeSession(
    sessionId: string,
    listener: WorkspaceAgentListener,
  ): Unsubscribe;

  /**
   * Pause a session (can be resumed later).
   */
  pauseSession(sessionId: string): Promise<void>;

  /**
   * Resume a paused session.
   */
  resumeSession(sessionId: string): Promise<void>;

  /**
   * Terminate a session.
   */
  terminateSession(sessionId: string): Promise<void>;

  /**
   * Get artifacts produced by the session.
   */
  getArtifacts(sessionId: string): Promise<WorkspaceArtifact[]>;

  /**
   * Get the evidence bundle for a session (for completion review).
   */
  getEvidence(sessionId: string): Promise<WorkspaceEvidenceBundle>;

  /**
   * List all sessions.
   */
  listSessions(): Promise<WorkspaceSession[]>;
}
