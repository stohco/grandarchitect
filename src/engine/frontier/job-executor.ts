/**
 * Job Executor Abstraction
 *
 * The terrain pipeline should not know whether it is executing synchronously,
 * in a browser worker, in a server worker thread, through WebGPU compute,
 * or in a remote service. All executors implement this common interface.
 *
 * No forbidden functions. No Three.js, no DOM.
 */

// ============================================================================
// Execution policy
// ============================================================================

export type ExecutionPolicy =
  | 'worker-required'      // must use a worker; fail if unavailable
  | 'worker-preferred'     // try worker, fall back to synchronous (visible)
  | 'synchronous-permitted' // synchronous is fine
  | 'synchronous-only';    // only synchronous (e.g. conformance tests)

// ============================================================================
// Executor types
// ============================================================================

export type ExecutorKind =
  | 'synchronous'
  | 'server-worker-thread'
  | 'browser-worker'
  | 'remote-service'
  | 'webgpu-compute';

export interface ExecutorCapabilities {
  supportsCancellation: boolean;
  supportsProgress: boolean;
  supportsTransferableBuffers: boolean;
  maxMemoryMb: number;
  estimatedOverheadMs: number;
}

export interface ExecutorHealth {
  alive: boolean;
  ready: boolean;          // alive AND test job passed
  protocolVersion: string;
  lastError?: string;
  restartCount: number;
  jobsCompleted: number;
  jobsFailed: number;
}

// ============================================================================
// Job request and result
// ============================================================================

export interface JobRequest<TInput = unknown> {
  jobId: string;
  jobType: string;
  graphId: string;
  graphRevision: number;
  worldRevision: number;
  priority: number;
  input: TInput;
  inputHash: string;
  timeoutMs: number;
  resourceBudget: JobResourceBudget;
}

export interface JobResourceBudget {
  maxCpuMs: number;
  maxMemoryMb: number;
  maxTransferMb: number;
}

export interface JobProgress {
  phase: string;
  percent: number;          // 0..1
  message: string;
}

export interface JobResult<TOutput = unknown> {
  jobId: string;
  executorId: string;
  executorKind: ExecutorKind;
  graphRevision: number;
  worldRevision: number;
  startedAt: string;
  completedAt: string;
  queueTimeMs: number;
  executionTimeMs: number;
  transferTimeMs: number;
  output: TOutput;
  outputHash: string;
  cancelled: boolean;
  stale: boolean;
}

export interface JobHandle<TOutput = unknown> {
  result: Promise<JobResult<TOutput>>;
  cancel(reason?: string): Promise<void>;
  getProgress(): Promise<JobProgress>;
}

// ============================================================================
// Job executor interface
// ============================================================================

export interface JobExecutor {
  readonly id: string;
  readonly kind: ExecutorKind;
  getCapabilities(): ExecutorCapabilities;
  getHealth(): Promise<ExecutorHealth>;
  submit<TInput, TOutput>(request: JobRequest<TInput>): Promise<JobHandle<TOutput>>;
}

// ============================================================================
// Execution decision
// ============================================================================

export interface ExecutionDecision {
  selectedExecutor: string;
  selectedKind: ExecutorKind;
  policy: ExecutionPolicy;
  fallbackOccurred: boolean;
  fallbackReason: string | null;
}

// ============================================================================
// Error capture (never silently swallow)
// ============================================================================

export interface ExecutorError {
  errorClass: string;
  message: string;
  stack?: string;
  connectionPhase: 'connect' | 'send' | 'receive' | 'parse' | 'execute' | 'cancel';
  responseStatus?: number;
  responseBody?: string;
  executorHealth?: ExecutorHealth;
  retryCount: number;
}

export function captureExecutorError(err: unknown, phase: ExecutorError['connectionPhase'], retryCount = 0): ExecutorError {
  return {
    errorClass: err instanceof Error ? err.constructor.name : typeof err,
    message: err instanceof Error ? err.message : String(err),
    stack: err instanceof Error ? err.stack : undefined,
    connectionPhase: phase,
    retryCount,
  };
}
