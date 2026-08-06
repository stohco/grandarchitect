/**
 * UnboundLoop — Authorial Orchestration
 * =====================================
 *
 * The persistent orchestration loop that executes:
 *
 *   OBSERVE → UNDERSTAND → RETRIEVE → GROUND → DISCOVER → PLAN →
 *   PREVIEW → EXECUTE → VALIDATE → CRITIQUE → PRESENT → COMMIT_OR_REVISE → REMEMBER
 *
 * Each stage produces a persisted structured artifact.
 * The loop is resumable — it must not lose user intent, selected target,
 * context packet, current plan, completed jobs, evidence, unresolved
 * questions, or revision baseline.
 *
 * The generating agent cannot be the sole reviewer.
 * Use independent deterministic and visual reviewers.
 */

import type { CreativeContextPacket, AuthorialIntent } from './canon-style';
import type { StudioContextSnapshot, SemanticTarget } from './studio-context-graph';

// ---------------------------------------------------------------------------
// Loop Stages
// ---------------------------------------------------------------------------

export type UnboundLoopStage =
  | 'observe'
  | 'understand'
  | 'retrieve'
  | 'ground'
  | 'discover'
  | 'plan'
  | 'preview'
  | 'execute'
  | 'validate'
  | 'critique'
  | 'present'
  | 'commit_or_revise'
  | 'remember';

export interface LoopState {
  loopId: string;
  stage: UnboundLoopStage;
  startedAt: string;
  updatedAt: string;

  /** Original user request. */
  originalRequest: string;

  /** Stage artifacts (persisted, resumable). */
  observations?: StudioContextSnapshot;
  intent?: AuthorialIntent;
  contextPacket?: CreativeContextPacket;
  groundedTarget?: SemanticTarget;
  discoveredActions?: string[];
  operationPlan?: OperationPlan;
  preview?: PreviewResult;
  executionResult?: ExecutionResult;
  validationReport?: ValidationReport;
  critiqueReport?: CritiqueReport;
  presentation?: Presentation;
  commitDecision?: CommitDecision;
  memory?: MemoryRecord;

  /** Unresolved questions that block progress. */
  unresolvedQuestions: ContextQuestion[];
  /** Whether the loop is paused waiting for user input. */
  paused: boolean;
  /** Whether the loop completed. */
  completed: boolean;
}

export interface ContextQuestion {
  questionId: string;
  question: string;
  options: string[];
  answered?: string;
}

// ---------------------------------------------------------------------------
// Operation Plan
// ---------------------------------------------------------------------------

export interface OperationPlan {
  planId: string;
  interpretedIntent: AuthorialIntent;
  groundedTarget: SemanticTarget;

  operations: PlannedOperation[];
  dependencies: Array<{ from: number; to: number }>;
  ordering: number[];

  applicableCanon: string[];
  applicableStyle: string[];

  expectedWorldChanges: string[];
  expectedAssetChanges: string[];
  expectedSimulationConsequences: string[];

  technicalCost: TechnicalCostEstimate;
  risks: RiskAssessment[];
  affectedSystems: string[];

  approvalPoints: ApprovalPoint[];
  rollbackPlan: string;
  evidenceRequirements: string[];
}

export interface PlannedOperation {
  operationId: string;
  actionId: string;
  label: string;
  description: string;
  provider?: string;
  input: Record<string, unknown>;
  expectedOutput: string;
  duration: 'instant' | 'short' | 'medium' | 'long';
}

export interface TechnicalCostEstimate {
  estimatedTriangles: number;
  estimatedDrawCalls: number;
  estimatedMemoryMB: number;
  estimatedExecutionMs: number;
  qualityProfile: 'legacy' | 'mainstream' | 'ultra';
}

export interface RiskAssessment {
  riskId: string;
  description: string;
  probability: 'low' | 'medium' | 'high';
  impact: 'low' | 'medium' | 'high';
  mitigation: string;
}

export interface ApprovalPoint {
  pointId: string;
  stage: string;
  description: string;
  required: boolean;
}

// ---------------------------------------------------------------------------
// Stage Results
// ---------------------------------------------------------------------------

export interface PreviewResult {
  previewId: string;
  worldRevisionBefore: number;
  worldRevisionAfter: number;
  changes: Array<{ type: string; description: string; severity: 'info' | 'warning' | 'critical' }>;
  captures: string[];
  estimatedCost: TechnicalCostEstimate;
}

export interface ExecutionResult {
  executionId: string;
  transactionIds: string[];
  jobIds: string[];
  artifactIds: string[];
  worldRevision: number;
  errors: string[];
  warnings: string[];
  /** Full per-transaction detail (what each transaction actually changed). */
  transactionDetails?: Array<{
    transactionId: string;
    actionId: string;
    operationId: string;
    commandType: string;
    commandId: string;
    inputPayloadHash: string;
    targetEntityId: number;
    targetStructureKind: string;
    beforeRevision: number;
    afterRevision: number;
    affectedCells: string[];
    forwardOperations: Array<{ operationId: string; type: string; cellId: string; payloadSummary: string }>;
    inverseOperations: Array<{ operationId: string; type: string; cellId: string; payloadSummary: string }>;
    invalidatedArtifacts: string[];
    requestedBy: string;
    timestamp: string;
    undoResult?: { success: boolean; restoredRevision: number; error?: string };
  }>;
}

export interface ValidationReport {
  reportId: string;
  styleCompliance: ComplianceResult;
  canonCompliance: ComplianceResult;
  narrativeContinuity: ComplianceResult;
  technicalValidation: ComplianceResult;
  visualEvidence: EvidenceSummary;
  capabilityGaps: string[];
}

export interface ComplianceResult {
  passed: boolean;
  score: number; // 0-1
  failures: Array<{ rule: string; description: string; severity: string }>;
}

export interface EvidenceSummary {
  captures: string[];
  measurements: Record<string, number>;
  browserVerified: string[];
}

export interface CritiqueReport {
  reportId: string;
  reviewerType: 'deterministic' | 'visual' | 'human';
  verdict: 'pass' | 'fail' | 'needs-revision';
  findings: Array<{ category: string; description: string; severity: string }>;
  recommendations: string[];
}

export interface Presentation {
  presentationId: string;
  summary: string;
  changes: string[];
  evidence: string[];
  uncertainties: string[];
  availableRevisions: string[];
}

export interface CommitDecision {
  decision: 'accept' | 'partial-accept' | 'revise' | 'discard';
  acceptedOperations: string[];
  revisedOperations: string[];
  discardedOperations: string[];
  committedRevision: number;
}

export interface MemoryRecord {
  memoryId: string;
  decisions: DecisionRecord[];
  provenance: string[];
  contextHash: string;
}

export interface DecisionRecord {
  decisionId: string;
  scope: string;
  decision: string;
  constraints: string[];
  timestamp: string;
}

// ---------------------------------------------------------------------------
// Loop Manager (Durable)
// ---------------------------------------------------------------------------
//
// All loop states are persisted to disk so a crash mid-loop is recoverable.
// On restart, the manager loads prior loops from data/authorial/loops.json
// and resumes the oldest non-completed one (or the most recent, depending on
// caller intent).

import { durableStore, replaceJson, type AuthorialStoreKey } from './durable-store';

const LOOP_FILE = 'loops' as AuthorialStoreKey;
const MAX_PERSISTED_LOOPS = 100;

export class UnboundLoopManager {
  private loops = new Map<string, LoopState>();
  private counter = 0;
  private loaded = false;

  constructor() {
    // Load is lazy — caller must await loadFromDisk() before any operation
    // that needs prior state. For test simplicity, we also lazy-load on
    // first start()/get()/list() call.
  }

  private async ensureLoaded(): Promise<void> {
    if (this.loaded) return;
    this.loaded = true;
    const persisted = await durableStore.read<LoopState[]>(LOOP_FILE, []);
    for (const state of persisted) {
      this.loops.set(state.loopId, state);
      // Recover counter from highest loop id suffix.
      const match = state.loopId.match(/loop-(\d+)-/);
      if (match) {
        const n = parseInt(match[1], 10);
        if (n > this.counter) this.counter = n;
      }
    }
  }

  private async persist(): Promise<void> {
    const all = Array.from(this.loops.values())
      .sort((a, b) => b.startedAt.localeCompare(a.startedAt))
      .slice(0, MAX_PERSISTED_LOOPS);
    await replaceJson(LOOP_FILE, all);
  }

  async start(request: string): Promise<LoopState> {
    await this.ensureLoaded();
    const loopId = `loop-${++this.counter}-${Date.now().toString(36)}`;
    const now = new Date().toISOString();
    const state: LoopState = {
      loopId,
      stage: 'observe',
      startedAt: now,
      updatedAt: now,
      originalRequest: request,
      unresolvedQuestions: [],
      paused: false,
      completed: false,
    };
    this.loops.set(loopId, state);
    await this.persist();
    return state;
  }

  async get(loopId: string): Promise<LoopState | null> {
    await this.ensureLoaded();
    return this.loops.get(loopId) ?? null;
  }

  async update(loopId: string, updates: Partial<LoopState>): Promise<LoopState | null> {
    await this.ensureLoaded();
    const state = this.loops.get(loopId);
    if (!state) return null;
    Object.assign(state, updates, { updatedAt: new Date().toISOString() });
    await this.persist();
    return state;
  }

  async advanceStage(loopId: string): Promise<UnboundLoopStage | null> {
    await this.ensureLoaded();
    const state = this.loops.get(loopId);
    if (!state) return null;

    const stages: UnboundLoopStage[] = [
      'observe', 'understand', 'retrieve', 'ground', 'discover',
      'plan', 'preview', 'execute', 'validate', 'critique',
      'present', 'commit_or_revise', 'remember',
    ];
    const currentIdx = stages.indexOf(state.stage);
    if (currentIdx < stages.length - 1) {
      state.stage = stages[currentIdx + 1];
      state.updatedAt = new Date().toISOString();
      if (state.stage === 'remember') {
        state.completed = true;
      }
      await this.persist();
      return state.stage;
    }
    return null;
  }

  async pause(loopId: string): Promise<void> {
    await this.ensureLoaded();
    const state = this.loops.get(loopId);
    if (state) {
      state.paused = true;
      state.updatedAt = new Date().toISOString();
      await this.persist();
    }
  }

  async resume(loopId: string): Promise<void> {
    await this.ensureLoaded();
    const state = this.loops.get(loopId);
    if (state) {
      state.paused = false;
      state.updatedAt = new Date().toISOString();
      await this.persist();
    }
  }

  async list(): Promise<LoopState[]> {
    await this.ensureLoaded();
    return Array.from(this.loops.values()).sort((a, b) =>
      b.startedAt.localeCompare(a.startedAt),
    );
  }

  async getActive(): Promise<LoopState[]> {
    const all = await this.list();
    return all.filter((s) => !s.completed && !s.paused);
  }

  /**
   * Returns the most recent loop that crashed (paused but not completed).
   * Used for restart recovery proof.
   */
  async getResumable(): Promise<LoopState | null> {
    const all = await this.list();
    return all.find((s) => !s.completed) ?? null;
  }
}

// Singleton
let loopManager: UnboundLoopManager | null = null;

export function getUnboundLoop(): UnboundLoopManager {
  if (!loopManager) {
    loopManager = new UnboundLoopManager();
  }
  return loopManager;
}

/**
 * Test-only: reset the singleton (for verification scripts).
 */
export function __resetUnboundLoopSingleton(): void {
  loopManager = null;
}
