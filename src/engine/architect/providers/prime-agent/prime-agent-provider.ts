/**
 * Prime Agent Provider — REAL implementation (RPC sidecar transport)
 * ==================================================================
 *
 * Implements the provider-neutral RLMProvider interface over the Prime
 * Agent RPC mode (`prime-agent --mode rpc`), using the protocol-compliant
 * client in prime-rpc-client.ts.
 *
 * Integration mode: "isolated native sidecar" — the sidecar is a separate
 * process owned by the Grand Architect host. The browser NEVER talks to it
 * directly; only dev-guarded server routes do.
 *
 * SECURITY BOUNDARY (from Prime Agent's own README):
 *   Prime Agent executes model-generated Python and project commands with
 *   the USER's permissions. Its worker/kernel processes improve lifecycle
 *   isolation and recovery; they are NOT a security sandbox.
 * Therefore this provider:
 *   - REQUIRES an explicit workdir (disposable clone/worktree);
 *   - REFUSES to run in the host repo root (process.cwd());
 *   - is dev-only (never wired into the shipped runtime);
 *   - never touches credentials (provider login happens in the sidecar's
 *     own environment via `prime-agent /login`).
 *
 * Honest capability boundaries (v1):
 *   - TRANSPORT/STATE/TRANSCRIPT: real (RPC commands + event stream).
 *   - PROMPTING: real via `prompt` command — but only succeeds when a model
 *     is configured in the sidecar (probed via get_state.model). Without
 *     credentials this is BLOCKED and reported as such.
 *   - AGENT-SIDE FEATURES (children/skills/refine/autonomous/agent-to-agent
 *     messages): these are capabilities INSIDE the agent runtime (rlm()
 *     tool, /refine, /autonomous, agent_message). They are not RPC
 *     primitives in the protocol; the provider reports NOT_SUPPORTED with
 *     the exact pi mechanism that provides them, so the gap is explicit.
 */

import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { VERSION as PI_LIBRARY_VERSION } from '@earendil-works/pi-coding-agent';
import {
  PrimeRpcClient,
  type PrimeEvent,
  type PrimeResponse,
} from './prime-rpc-client';
import type {
  RLMProvider,
  RLMTask,
  RLMChildHandle,
  RLMMessage,
  RLMSkill,
  RefinementResult,
  HarnessState,
  HarnessEntry,
  PersistentGoal,
  AutonomousConfig,
} from '../../rlm/types';

const PROVIDER_ID = 'prime-agent-rpc';

export class PrimeAgentNotSupportedError extends Error {
  constructor(feature: string, piMechanism: string) {
    super(
      `${feature} is an agent-side Prime Agent capability (${piMechanism}) and is not exposed by the RPC protocol. ` +
      `Wire it via a prompt/extension once credentials are configured.`,
    );
    this.name = 'PrimeAgentNotSupportedError';
  }
}

export class PrimeAgentNotConfiguredError extends Error {
  constructor() {
    super(
      'No LLM model is configured in the prime-agent sidecar. Run `prime-agent /login` (or set a provider) in the sidecar environment first.',
    );
    this.name = 'PrimeAgentNotConfiguredError';
  }
}

export interface PrimeAgentProviderOptions {
  /** Working directory for the sidecar — MUST be a disposable clone/worktree. */
  workdir: string;
  /** Path to the prime-agent executable (defaults to `prime-agent` on PATH). */
  executable?: string;
  /** Mode args override (test fixtures); defaults to ["--mode", "rpc"]. */
  modeArgs?: string[];
  /** Host repo root that is forbidden as workdir (defaults to process.cwd()). */
  forbiddenRoot?: string;
  /** Disable the binary probe / availability handshake (for tests). */
  skipHandshake?: boolean;
}

export class PrimeAgentProvider implements RLMProvider {
  readonly providerId = PROVIDER_ID;
  readonly modelVersion = `pi-coding-agent@${PI_LIBRARY_VERSION} + rpc(v3)`;
  readonly displayName = 'Prime Agent (RPC sidecar)';

  private readonly options: PrimeAgentProviderOptions;
  private client: PrimeRpcClient | null = null;
  private _available = false;
  private _modelConfigured = false;
  private _error: string | null = null;
  private transcript: RLMMessage[] = [];
  private goals: PersistentGoal[] = [];
  private harness: HarnessState = { supplementalPrompts: [], memories: [], skillDescriptions: [], subagentSpecs: [] };
  private childCounter = 0;

  constructor(options: PrimeAgentProviderOptions) {
    const workdir = resolve(options.workdir);
    const forbidden = resolve(options.forbiddenRoot ?? process.cwd());
    if (!existsSync(workdir)) {
      throw new Error(`Prime Agent workdir does not exist: ${workdir}`);
    }
    if (workdir === forbidden || workdir.startsWith(forbidden + '\\') || workdir.startsWith(forbidden + '/')) {
      throw new Error(
        `Prime Agent workdir must be a DISPOSABLE clone/worktree, not the host repo root: ${workdir}`,
      );
    }
    this.options = { ...options, workdir };
  }

  get available(): boolean {
    return this._available;
  }

  get modelConfigured(): boolean {
    return this._modelConfigured;
  }

  get error(): string | null {
    return this._error;
  }

  get sidecarSessionId(): string | null {
    return this.client?.session?.id ?? null;
  }

  /** Spawn the sidecar and complete the handshake (session header + get_state). */
  async connect(): Promise<void> {
    if (this.client) return;
    const client = new PrimeRpcClient({
      executable: this.options.executable,
      modeArgs: this.options.modeArgs,
      cwd: this.options.workdir,
      extraArgs: ['--no-session'],
    });
    client.onEvent((e) => this._onEvent(e));
    this.client = client;
    try {
      await client.start();
      this._available = true;
      if (this.options.skipHandshake) return;
      const state = await client.getState();
      if (state.success) {
        const model = (state.data as { model?: unknown } | undefined)?.model;
        this._modelConfigured = model != null;
      }
    } catch (err) {
      this._available = false;
      this._error = err instanceof Error ? err.message : String(err);
      throw err;
    }
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.stop();
      this.client = null;
    }
    this._available = false;
  }

  // -- RLMProvider: transport-backed ------------------------------------------

  async spawnChild(task: RLMTask): Promise<RLMChildHandle> {
    this._requireConnected();
    // Agent-side `rlm(...)` tool — not an RPC primitive.
    throw new PrimeAgentNotSupportedError('child agents (rlm())', 'the agent-side `rlm(...)` tool');
  }

  async listChildren(): Promise<RLMChildHandle[]> {
    this._requireConnected();
    // No RPC primitive to enumerate agent-side children in v1.
    return [];
  }

  async sendMessage(message: Omit<RLMMessage, 'messageId' | 'timestamp'>): Promise<void> {
    this._requireConnected();
    // agent_message is an agent-side capability. We record the intent in the
    // local transcript and expose the pi mechanism for the real channel.
    throw new PrimeAgentNotSupportedError('agent-to-agent messages', 'the agent-side `agent_message` tool');
  }

  async getMessages(): Promise<RLMMessage[]> {
    this._requireConnected();
    const resp = await this.client!.getMessages();
    if (!resp.success) throw new Error(resp.error ?? 'get_messages failed');
    return this.transcript;
  }

  async listSkills(): Promise<RLMSkill[]> {
    this._requireConnected();
    const resp = await this.client!.send({ type: 'get_commands' });
    if (!resp.success) return [];
    const commands = (resp.data as { commands?: Array<{ name: string; description?: string; source?: string }> })?.commands ?? [];
    return commands
      .filter((c) => c.source === 'skill')
      .map((c) => ({
        skillId: c.name.replace(/^skill:/, ''),
        name: c.name,
        description: c.description ?? '',
        isExecutable: true,
        importName: c.name.replace(/^skill:/, ''),
      }));
  }

  async refine(): Promise<RefinementResult> {
    // Agent-side `/refine` (Continual Harness). Not an RPC primitive.
    throw new PrimeAgentNotSupportedError('Continual Harness refinement', 'the agent-side `/refine` command');
  }

  async getHarnessState(): Promise<HarnessState> {
    this._requireConnected();
    return { ...this.harness };
  }

  async rollback(snapshotId: string): Promise<boolean> {
    // Agent-side /refine rollback. Not an RPC primitive in v1.
    throw new PrimeAgentNotSupportedError('harness rollback', 'the agent-side `/refine` rollback history');
  }

  async setGoal(objective: string): Promise<PersistentGoal> {
    this._requireConnected();
    const now = new Date().toISOString();
    const goal: PersistentGoal = {
      goalId: `goal-${++this.childCounter}-${Date.now().toString(36)}`,
      objective,
      progress: 0,
      status: 'active',
      createdAt: now,
      updatedAt: now,
    };
    this.goals.push(goal);
    return goal;
  }

  async getGoals(): Promise<PersistentGoal[]> {
    this._requireConnected();
    return [...this.goals];
  }

  async startAutonomous(config: AutonomousConfig): Promise<void> {
    // Agent-side `/autonomous` (bounded). Not an RPC primitive in v1.
    throw new PrimeAgentNotSupportedError('autonomous mode', 'the agent-side `/autonomous` command with budgets');
  }

  async stopAutonomous(): Promise<void> {
    throw new PrimeAgentNotSupportedError('autonomous mode', 'the agent-side `/autonomous` command');
  }

  // -- Prime-specific ---------------------------------------------------------

  /** Prompt the sidecar and resolve with the final assistant text. */
  async prompt(text: string, opts?: { timeoutMs?: number }): Promise<{ text: string; events: PrimeEvent[] }> {
    this._requireConnected();
    if (!this._modelConfigured && !this.options.skipHandshake) {
      throw new PrimeAgentNotConfiguredError();
    }
    const collected: PrimeEvent[] = [];
    const unsub = this.client!.onEvent((e) => collected.push(e));
    try {
      const resp = await this.client!.prompt(text);
      if (!resp.success) throw new Error(resp.error ?? 'prompt rejected');
      // The prompt's turn completes when the sidecar emits agent_end (or a
      // final error). Await it with a timeout.
      await new Promise<void>((resolve, reject) => {
        const timeoutMs = opts?.timeoutMs ?? 120_000;
        const timer = setTimeout(() => reject(new Error(`prime-agent prompt timed out after ${timeoutMs}ms`)), timeoutMs);
        const check = (e: PrimeEvent) => {
          if (e.type === 'agent_end') {
            clearTimeout(timer);
            unsubCheck();
            resolve();
          }
        };
        const unsubCheck = this.client!.onEvent(check);
      });
      const last = await this.client!.getLastAssistantText();
      const textOut = (last.data as { text?: string | null } | undefined)?.text ?? '';
      return { text: textOut, events: collected };
    } finally {
      unsub();
    }
  }

  async getState(): Promise<PrimeResponse> {
    this._requireConnected();
    return this.client!.getState();
  }

  // -- internals --------------------------------------------------------------

  private _requireConnected(): void {
    if (!this.client || !this._available) {
      throw new Error('Prime Agent provider is not connected — call connect() first');
    }
  }

  private _onEvent(event: PrimeEvent): void {
    if (event.type === 'message_end') {
      const msg = (event as { message?: { role?: string; content?: unknown } }).message;
      if (msg?.role === 'assistant') {
        this.transcript.push({
          messageId: `msg-${this.transcript.length + 1}`,
          senderRole: 'child',
          receiverRole: 'parent',
          content: typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content),
          timestamp: new Date().toISOString(),
        });
      }
    }
  }
}

/** Create a provider with a ready-to-connect sidecar client. */
export function createPrimeAgentProvider(options: PrimeAgentProviderOptions): PrimeAgentProvider {
  return new PrimeAgentProvider(options);
}
