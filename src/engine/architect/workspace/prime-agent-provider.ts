/**
 * Prime Agent Workspace Provider — Mock Implementation
 * =====================================================
 *
 * STATUS: Evaluation candidate. Prime Agent is a Python CLI tool that
 * communicates via JSONL RPC. This mock validates the WorkspaceAgentProvider
 * interface and provides a test bed for the development workflow.
 *
 * To use a real Prime Agent:
 *   1. Install prime-agent on a server with Python + Bash
 *   2. Start it in RPC mode: `prime-agent --rpc`
 *   3. Create an adapter that communicates via JSONL
 *   4. This mock interface stays the same — swap the implementation
 *
 * CONSTRAINTS:
 *   - Dev-only (never in shipped runtime)
 *   - One editing agent per worktree
 *   - Authenticated, sandboxed
 *   - Cannot mutate main directly
 *   - Cannot access production secrets
 */

import type {
  WorkspaceAgentProvider,
  WorkspaceAgentRequest,
  WorkspaceSession,
  WorkspaceAgentListener,
  Unsubscribe,
  WorkspaceArtifact,
  WorkspaceEvidenceBundle,
  WorkspaceEvent,
} from './types';

const PROVIDER_ID = 'prime-agent-workspace';
const DISPLAY_NAME = 'Prime Agent (Workspace — Mock)';

export class PrimeAgentWorkspaceProvider implements WorkspaceAgentProvider {
  readonly providerId = PROVIDER_ID;
  readonly displayName = DISPLAY_NAME;
  readonly available = false; // No Python runtime

  private sessions = new Map<string, WorkspaceSession>();
  private listeners = new Map<string, Set<WorkspaceAgentListener>>();
  private sessionCounter = 0;

  async startSession(request: WorkspaceAgentRequest): Promise<WorkspaceSession> {
    const sessionId = `session-${++this.sessionCounter}-${Date.now().toString(36)}`;

    // Validate: worktree must NOT be the main repo
    if (request.worktreePath === '/home/z/my-project' ||
        request.worktreePath.endsWith('/grandarchitect')) {
      throw new Error(
        'SAFETY: Worktree path must NOT be the main repository. ' +
          'Use an isolated worktree (e.g. ../grandarchitect-work).',
      );
    }

    // Validate: only implementer has write access
    if (request.role !== 'implementer') {
      console.warn(
        `[PrimeAgentWorkspaceProvider] Role "${request.role}" is read-only — ` +
          'no file mutations will be allowed.',
      );
    }

    const session: WorkspaceSession = {
      sessionId,
      request,
      status: 'starting',
      startedAt: new Date().toISOString(),
      progress: 0,
      goals: [],
    };

    this.sessions.set(sessionId, session);
    this.listeners.set(sessionId, new Set());

    console.warn(
      `[PrimeAgentWorkspaceProvider] MOCK: startSession for ${request.role} ` +
        `in worktree ${request.worktreePath}. No Python runtime — returning mock session.`,
    );

    // Emit mock events
    setTimeout(() => this.emit(sessionId, {
      type: 'message',
      content: `[MOCK] Session started. Role: ${request.role}. Worktree: ${request.worktreePath}. Base commit: ${request.baseCommitSha}`,
      role: request.role,
      timestamp: new Date().toISOString(),
    }), 100);

    return session;
  }

  async sendInstruction(sessionId: string, instruction: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) throw new Error(`Session not found: ${sessionId}`);

    this.emit(sessionId, {
      type: 'message',
      content: `[MOCK] Instruction received: "${instruction}"`,
      role: session.request.role,
      timestamp: new Date().toISOString(),
    });
  }

  observeSession(
    sessionId: string,
    listener: WorkspaceAgentListener,
  ): Unsubscribe {
    let set = this.listeners.get(sessionId);
    if (!set) {
      set = new Set();
      this.listeners.set(sessionId, set);
    }
    set.add(listener);
    return () => set!.delete(listener);
  }

  async pauseSession(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (session) session.status = 'paused';
  }

  async resumeSession(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (session) session.status = 'running';
  }

  async terminateSession(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.status = 'terminated';
      this.listeners.delete(sessionId);
    }
  }

  async getArtifacts(_sessionId: string): Promise<WorkspaceArtifact[]> {
    return []; // Mock — no artifacts produced
  }

  async getEvidence(_sessionId: string): Promise<WorkspaceEvidenceBundle> {
    return {
      commitSha: null,
      remoteSha: null,
      cleanWorktree: true,
      buildProvenance: null,
      commands: [],
      testResults: [],
      verificationEnvironment: null,
      consoleErrors: [],
      knownLimitations: [
        'Prime Agent workspace provider is mocked — no real Python runtime',
        'No actual worktree operations performed',
        'No browser verification executed',
      ],
      reviewerVerdicts: [],
    };
  }

  async listSessions(): Promise<WorkspaceSession[]> {
    return Array.from(this.sessions.values());
  }

  private emit(sessionId: string, event: WorkspaceEvent): void {
    const set = this.listeners.get(sessionId);
    if (set) {
      for (const listener of set) {
        try {
          listener(event);
        } catch {
          // listener must never throw
        }
      }
    }
  }
}

// Singleton
let providerInstance: PrimeAgentWorkspaceProvider | null = null;

export function getWorkspaceProvider(): PrimeAgentWorkspaceProvider {
  if (!providerInstance) {
    providerInstance = new PrimeAgentWorkspaceProvider();
  }
  return providerInstance;
}
