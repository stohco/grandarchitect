/**
 * Recursive Language Model (RLM) — Provider-Neutral Interface
 * ===========================================================
 *
 * Inspired by Prime Agent (https://github.com/PrimeIntellect-ai/prime-agent)
 * and the RLM concept (https://www.primeintellect.ai/blog/rlm).
 *
 * RLM treats context as variables ("prompt-as-a-variable") and tools like
 * recursive subagents as function calls inside a persistent REPL. This maps
 * directly to the Grand Architect's UnboundLoop vision:
 *
 *   RLM Concept              →  Grand Architect Equivalent
 *   ─────────────────────────────────────────────────────────
 *   Persistent IPython       →  Grand Architect reasoning engine
 *   rlm() child agents       →  UnboundLoop recursive delegation
 *   Continual Harness        →  Architect session state + refinement
 *   /refine evidence-backed  →  Self-improvement with rollback
 *   Skills (Python packages) →  Plugin capabilities
 *   agent_message            →  Architect tool communication
 *   Persistent goals         →  UnboundLoop objectives
 *   Heartbeats/schedules     →  Autonomous mode
 *
 * ARCHITECTURE DECISION:
 *   Prime Agent is a Python CLI tool, NOT a browser library. We do NOT
 *   embed it directly. Instead, we create provider-neutral interfaces that
 *   could eventually wrap a prime-agent adapter (or any other RLM provider).
 *   The Grand Architect calls through this contract — it never imports a
 *   specific RLM implementation directly.
 *
 * Runtime authority: NONE (the browser game runtime has no RLM dependency).
 * The RLM is an editor/architect-time capability only.
 */

// ---------------------------------------------------------------------------
// Core RLM Types
// ---------------------------------------------------------------------------

export interface RLMTask {
  /** Unique task ID. */
  taskId: string;
  /** The instruction/prompt for this task. */
  instruction: string;
  /** Working context (files, data, previous results). */
  workingContext?: Record<string, unknown>;
  /** Model to use (provider-specific). */
  model?: string;
  /** Whether this task should run autonomously. */
  autonomous?: boolean;
  /** Resource limits. */
  limits?: RLMLimits;
}

export interface RLMLimits {
  /** Maximum turns. */
  maxTurns?: number;
  /** Maximum tokens. */
  maxTokens?: number;
  /** Maximum wall-clock time in seconds. */
  maxTimeSec?: number;
}

export interface RLMChildHandle {
  /** Child agent ID. */
  rlmChildId: string;
  /** Human-readable name. */
  name: string;
  /** Session directory (for persistence). */
  sessionDir: string;
  /** Model used. */
  model: string;
  /** Current status. */
  status: 'running' | 'idle' | 'completed' | 'failed';
}

export interface RLMSkill {
  /** Skill identifier. */
  skillId: string;
  /** Human-readable name. */
  name: string;
  /** Description of what this skill does. */
  description: string;
  /** Whether this skill is a Python-backed skill (vs instruction-only). */
  isExecutable: boolean;
  /** Importable module name (if executable). */
  importName?: string;
  /** Function signature (if executable). */
  signature?: string;
}

export interface RLMMessage {
  /** Message ID. */
  messageId: string;
  /** Sender role. */
  senderRole: 'parent' | 'child' | 'user' | 'system';
  /** Sender name (if child). */
  senderName?: string;
  /** Receiver role. */
  receiverRole: 'parent' | 'child' | 'user' | 'system';
  /** Receiver name (if child). */
  receiverName?: string;
  /** Message content. */
  content: string;
  /** Timestamp. */
  timestamp: string;
}

// ---------------------------------------------------------------------------
// Continual Harness — self-improvement with evidence
// ---------------------------------------------------------------------------

export interface HarnessState {
  /** Supplemental prompts (evidence-backed additions to base prompt). */
  supplementalPrompts: HarnessEntry[];
  /** Memories (durable working context). */
  memories: HarnessEntry[];
  /** Skill descriptions (reusable capability specs). */
  skillDescriptions: HarnessEntry[];
  /** Subagent specifications (reusable child agent configs). */
  subagentSpecs: HarnessEntry[];
}

export interface HarnessEntry {
  entryId: string;
  /** The content of this entry. */
  content: string;
  /** Evidence that justified this entry (what happened in the trajectory). */
  evidence: string;
  /** When this entry was created. */
  createdAt: string;
  /** Which refinement session created it. */
  refinedBy?: string;
  /** Whether this entry is active. */
  active: boolean;
}

export interface RefinementResult {
  /** Entries added. */
  added: HarnessEntry[];
  /** Entries modified. */
  modified: HarnessEntry[];
  /** Entries deactivated. */
  deactivated: string[];
  /** Summary of what was learned. */
  summary: string;
  /** Whether the refinement was applied. */
  applied: boolean;
  /** Snapshot ID for rollback. */
  snapshotId: string;
}

// ---------------------------------------------------------------------------
// Persistent Goals and Autonomous Mode
// ---------------------------------------------------------------------------

export interface PersistentGoal {
  goalId: string;
  /** The objective. */
  objective: string;
  /** Progress (0-1). */
  progress: number;
  /** Status. */
  status: 'active' | 'paused' | 'completed' | 'cancelled';
  /** Sub-goals. */
  subGoals?: PersistentGoal[];
  /** Created timestamp. */
  createdAt: string;
  /** Last update timestamp. */
  updatedAt: string;
}

export interface AutonomousConfig {
  /** Turn budget. */
  maxTurns: number;
  /** Token budget. */
  maxTokens: number;
  /** Time budget in seconds. */
  maxTimeSec: number;
  /** Quality gates to pass before continuing. */
  qualityGates: QualityGate[];
}

export interface QualityGate {
  gateId: string;
  name: string;
  /** What this gate verifies. */
  verifies: string;
  /** Whether the gate passed. */
  passed: boolean;
}

// ---------------------------------------------------------------------------
// The Provider Contract
// ---------------------------------------------------------------------------

export interface RLMProvider {
  /** Unique provider identifier (e.g. "prime-agent", "custom-rlm"). */
  readonly providerId: string;
  /** Model/version string. */
  readonly modelVersion: string;
  /** Human-readable display name. */
  readonly displayName: string;
  /** Whether this provider is available (has a running runtime). */
  readonly available: boolean;

  /**
   * Spawn a child agent for a subtask. Returns immediately with a handle;
   * does NOT wait for the child's answer. Results arrive via messages.
   */
  spawnChild(task: RLMTask): Promise<RLMChildHandle>;

  /**
   * List active/retained child agents.
   */
  listChildren(): Promise<RLMChildHandle[]>;

  /**
   * Send a message to a child or parent agent.
   */
  sendMessage(message: Omit<RLMMessage, 'messageId' | 'timestamp'>): Promise<void>;

  /**
   * Get messages for this session.
   */
  getMessages(): Promise<RLMMessage[]>;

  /**
   * List available skills.
   */
  listSkills(): Promise<RLMSkill[]>;

  /**
   * Refine the continual harness — review trajectory and apply
   * evidence-backed updates. NEVER rewrites the immutable base prompt.
   */
  refine(): Promise<RefinementResult>;

  /**
   * Get current harness state.
   */
  getHarnessState(): Promise<HarnessState>;

  /**
   * Roll back to a previous harness snapshot.
   */
  rollback(snapshotId: string): Promise<boolean>;

  /**
   * Set a persistent goal.
   */
  setGoal(objective: string): Promise<PersistentGoal>;

  /**
   * Get active goals.
   */
  getGoals(): Promise<PersistentGoal[]>;

  /**
   * Start autonomous mode with bounded limits.
   */
  startAutonomous(config: AutonomousConfig): Promise<void>;

  /**
   * Stop autonomous mode.
   */
  stopAutonomous(): Promise<void>;
}
