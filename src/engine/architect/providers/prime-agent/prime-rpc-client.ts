/**
 * Prime RPC Client — protocol-compliant JSONL client for the Prime Agent
 * RPC mode (`prime-agent --mode rpc`).
 *
 * Protocol contract (https://github.com/PrimeIntellect-ai/prime-agent,
 * packages/coding-agent/docs/rpc.md):
 *
 *   - Commands are JSON objects on stdin, one per line.
 *   - Responses are JSON objects with `type: "response"` carrying the
 *     command's `id` for correlation.
 *   - Agent events stream on stdout as JSON lines WITHOUT an `id`.
 *   - Framing is strict JSONL: LF (`\n`) is the ONLY record delimiter.
 *     Clients MUST strip a trailing `\r` and MUST NOT use line readers that
 *     split on U+2028/U+2029 (valid inside JSON strings). Node `readline`
 *     is not protocol-compliant here.
 *   - Extension UI dialogs (select/confirm/input/editor) arrive as
 *     `extension_ui_request` on stdout and require an
 *     `extension_ui_response` on stdin with the matching `id`.
 *
 * This module is the transport for the provider-neutral RLMProvider
 * implementation (see prime-agent-provider.ts). It is spawn-based: the
 * sidecar process is owned by the caller (or this class with `spawnPath`).
 */

import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { StringDecoder } from 'node:string_decoder';

// ---------------------------------------------------------------------------
// Protocol types (mirrors the documented RPC protocol)
// ---------------------------------------------------------------------------

export interface PrimeCommand {
  id?: string;
  type: string;
  [key: string]: unknown;
}

export interface PrimeResponse {
  id?: string;
  type: 'response';
  command: string;
  success: boolean;
  data?: unknown;
  error?: string;
}

export interface PrimeTextDelta {
  type: 'text_delta';
  contentIndex: number;
  delta: string;
}

export interface PrimeMessageUpdate {
  type: 'message_update';
  message: unknown;
  assistantMessageEvent: PrimeTextDelta | { type: string; [k: string]: unknown };
}

export type PrimeEvent =
  | { type: 'session'; version: number; id: string; timestamp: string; cwd: string }
  | { type: 'agent_start' }
  | { type: 'agent_end'; messages?: unknown[] }
  | { type: 'turn_start' }
  | { type: 'turn_end'; message?: unknown; toolResults?: unknown[] }
  | { type: 'message_start'; message?: unknown }
  | PrimeMessageUpdate
  | { type: 'message_end'; message?: unknown }
  | { type: 'tool_execution_start'; toolCallId: string; toolName: string; args?: unknown }
  | { type: 'tool_execution_update'; toolCallId: string; toolName: string; partialResult?: unknown }
  | { type: 'tool_execution_end'; toolCallId: string; toolName: string; result?: unknown; isError?: boolean }
  | { type: 'session_action_update'; actions?: unknown }
  | { type: 'compaction_start'; reason?: string }
  | { type: 'compaction_end'; reason?: string; result?: unknown; aborted?: boolean }
  | { type: 'auto_retry_start'; attempt?: number; maxAttempts?: number; delayMs?: number; errorMessage?: string }
  | { type: 'auto_retry_end'; success?: boolean; attempt?: number; finalError?: string }
  | { type: 'extension_error'; extensionPath?: string; event?: string; error?: string }
  | { type: 'extension_ui_request'; id: string; method: string; [k: string]: unknown }
  | { type: 'observed_session_event'; activeSessionId: string; event: unknown }
  | { type: string; [k: string]: unknown };

export type PrimeEventListener = (event: PrimeEvent) => void;

// ---------------------------------------------------------------------------
// Strict JSONL framing
// ---------------------------------------------------------------------------

/**
 * Split a byte stream into JSONL records. LF (`\n`) is the only delimiter;
 * a trailing `\r` is stripped per the protocol. Never splits on U+2028 or
 * U+2029 (they are legal inside JSON strings).
 */
export function createJsonlFramer(onLine: (line: string) => void) {
  const decoder = new StringDecoder('utf8');
  let buffer = '';
  return {
    push(chunk: Uint8Array | string): void {
      buffer += typeof chunk === 'string' ? chunk : decoder.write(chunk);
      while (true) {
        const newlineIndex = buffer.indexOf('\n');
        if (newlineIndex === -1) break;
        let line = buffer.slice(0, newlineIndex);
        buffer = buffer.slice(newlineIndex + 1);
        if (line.endsWith('\r')) line = line.slice(0, -1);
        if (line.length > 0) onLine(line);
      }
    },
    end(): void {
      buffer += decoder.end();
      if (buffer.length > 0) {
        let line = buffer;
        buffer = '';
        if (line.endsWith('\r')) line = line.slice(0, -1);
        if (line.length > 0) onLine(line);
      }
    },
  };
}

// ---------------------------------------------------------------------------
// Client
// ---------------------------------------------------------------------------

export interface PrimeRpcClientOptions {
  /** Path to the prime-agent executable (defaults to `prime-agent` on PATH). */
  executable?: string;
  /** Mode args (default `["--mode", "rpc"]`). Overridable for test fixtures. */
  modeArgs?: string[];
  /** Extra CLI args appended after the mode args. */
  extraArgs?: string[];
  /** cwd for the sidecar process. */
  cwd?: string;
  /** Seconds to wait for a command response before failing (default 60). */
  responseTimeoutSec?: number;
  /** Optional handler for extension UI dialog requests. */
  onUiRequest?: (request: { id: string; method: string; [k: string]: unknown }) =>
    { value?: unknown; confirmed?: boolean; cancelled?: boolean } | undefined;
}

const PENDING_DEFAULT_TIMEOUT_MS = 60_000;

export class PrimeRpcClient {
  readonly options: PrimeRpcClientOptions;
  private child: ChildProcessWithoutNullStreams | null = null;
  private pending = new Map<string, { resolve: (r: PrimeResponse) => void; timer: ReturnType<typeof setTimeout> }>();
  private listeners = new Set<PrimeEventListener>();
  private sessionHeader: { version: number; id: string; timestamp: string; cwd: string } | null = null;
  private closed = false;

  constructor(options: PrimeRpcClientOptions = {}) {
    this.options = options;
  }

  get isRunning(): boolean {
    return this.child !== null && this.child.exitCode === null && !this.closed;
  }

  get session(): { version: number; id: string; timestamp: string; cwd: string } | null {
    return this.sessionHeader;
  }

  onEvent(listener: PrimeEventListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /** Spawn the sidecar (`prime-agent --mode rpc [extraArgs]`). */
  async start(): Promise<void> {
    if (this.child) return;
    const executable = this.options.executable ?? 'prime-agent';
    const args = [...(this.options.modeArgs ?? ['--mode', 'rpc']), ...(this.options.extraArgs ?? [])];
    const child = spawn(executable, args, {
      cwd: this.options.cwd,
      stdio: ['pipe', 'pipe', 'pipe'],
      windowsHide: true,
    });
    this.child = child;
    this.closed = false;

    const framer = createJsonlFramer((line) => this._handleLine(line));
    child.stdout.on('data', (chunk: Uint8Array) => framer.push(chunk));
    child.stdout.on('end', () => framer.end());
    child.stderr.on('data', (chunk: Uint8Array) => {
      const text = chunk.toString();
      this._emit({ type: 'sidecar_stderr', text } as unknown as PrimeEvent);
    });
    child.on('exit', (code) => {
      this._rejectAll(new Error(`prime-agent sidecar exited with code ${code ?? 'unknown'}`));
      this.child = null;
    });
    child.on('error', (err) => {
      this._rejectAll(new Error(`prime-agent sidecar failed to start: ${err.message}`));
      this.child = null;
    });

    // Wait for the session header line (protocol: first stdout record).
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('prime-agent sidecar handshake timeout')), 15_000);
      const unsub = this.onEvent((e) => {
        if (e.type === 'session') {
          clearTimeout(timer);
          unsub();
          resolve();
        }
        if (e.type === 'sidecar_stderr') {
          const text = (e as unknown as { text: string }).text;
          if (text.includes('error') || text.includes('Error')) {
            clearTimeout(timer);
            unsub();
            reject(new Error(`prime-agent sidecar error: ${text.slice(0, 200)}`));
          }
        }
      });
    });
  }

  async stop(): Promise<void> {
    this.closed = true;
    if (this.child && this.child.exitCode === null) {
      this.child.kill();
    }
    this.child = null;
    this._rejectAll(new Error('prime-agent sidecar stopped'));
  }

  /** Send a command and await its correlated response. */
  send(command: PrimeCommand, timeoutMs?: number): Promise<PrimeResponse> {
    if (!this.child || this.child.stdin.destroyed) {
      return Promise.reject(new Error('prime-agent sidecar is not running'));
    }
    const id = command.id ?? `req-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    const payload = { ...command, id };

    return new Promise((resolve, reject) => {
      const rt = this.options.responseTimeoutSec;
      const timeoutMsResolved = timeoutMs ?? (rt !== undefined ? rt * 1000 : PENDING_DEFAULT_TIMEOUT_MS);
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`prime-agent command "${command.type}" timed out`));
      }, timeoutMsResolved);

      this.pending.set(id, { resolve, timer });
      this.child!.stdin.write(JSON.stringify(payload) + '\n');
    });
  }

  // -- convenience commands --------------------------------------------------

  prompt(message: string, opts?: { streamingBehavior?: 'steer' | 'followUp'; id?: string }): Promise<PrimeResponse> {
    return this.send({ type: 'prompt', message, streamingBehavior: opts?.streamingBehavior }, undefined);
  }

  getState(): Promise<PrimeResponse> {
    return this.send({ type: 'get_state' });
  }

  getMessages(): Promise<PrimeResponse> {
    return this.send({ type: 'get_messages' });
  }

  getLastAssistantText(): Promise<PrimeResponse> {
    return this.send({ type: 'get_last_assistant_text' });
  }

  abort(): Promise<PrimeResponse> {
    return this.send({ type: 'abort' });
  }

  // -- internals -------------------------------------------------------------

  private _handleLine(line: string): void {
    let record: PrimeEvent;
    try {
      record = JSON.parse(line) as PrimeEvent;
    } catch {
      this._emit({ type: 'protocol_error', text: line.slice(0, 200) } as unknown as PrimeEvent);
      return;
    }

    if (record.type === 'session') {
      this.sessionHeader = record as unknown as { version: number; id: string; timestamp: string; cwd: string };
    }

    if (record.type === 'response') {
      const resp = record as unknown as PrimeResponse;
      const rid = resp.id;
      if (rid && this.pending.has(rid)) {
        const entry = this.pending.get(rid)!;
        clearTimeout(entry.timer);
        this.pending.delete(rid);
        entry.resolve(resp);
        return;
      }
      this._emit(record);
      return;
    }

    if (record.type === 'extension_ui_request') {
      const req = record as { id: string; method: string; [k: string]: unknown };
      const answer = this.options.onUiRequest?.(req);
      if (answer && this.child && !this.child.stdin.destroyed) {
        this.child.stdin.write(JSON.stringify({ type: 'extension_ui_response', id: req.id, ...answer }) + '\n');
      }
      this._emit(record);
      return;
    }

    this._emit(record);
  }

  private _emit(event: PrimeEvent): void {
    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch {
        // listener errors must not break the transport
      }
    }
  }

  private _rejectAll(err: Error): void {
    for (const [id, entry] of this.pending) {
      clearTimeout(entry.timer);
      entry.resolve({ id, type: 'response', command: 'unknown', success: false, error: err.message });
    }
    this.pending.clear();
  }
}
