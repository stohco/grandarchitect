/**
 * Server Worker Thread Executor — runs jobs in a separate thread
 * using Node.js worker_threads (NOT a separate HTTP service).
 *
 * This runs in the same process but on a separate thread, keeping
 * the main event loop responsive. No port needed, no process lifecycle
 * issues, supports transferable ArrayBuffers.
 *
 * No forbidden functions. No Three.js, no DOM.
 */

import { Worker, isMainThread, parentPort, workerData } from 'worker_threads';
import { join } from 'path';
import type {
  JobExecutor, ExecutorKind, ExecutorCapabilities, ExecutorHealth,
  JobRequest, JobHandle, JobResult, JobProgress,
} from '../job-executor';
import { captureExecutorError } from '../job-executor';

export class ServerWorkerThreadExecutor implements JobExecutor {
  readonly id: string;
  readonly kind: ExecutorKind = 'server-worker-thread';
  private workers: Worker[] = [];
  private workerPoolSize: number;
  private nextWorkerIdx = 0;
  private alive = false;
  private ready = false;
  private restartCount = 0;
  private jobsCompleted = 0;
  private jobsFailed = 0;
  private lastError?: string;
  private workerScript: string;

  constructor(poolSize = 2, scriptPath?: string) {
    this.id = `swt-pool-${Date.now().toString(36)}`;
    this.workerPoolSize = poolSize;
    this.workerScript = scriptPath ?? join(__dirname, 'terrain-worker-thread.js');
  }

  getCapabilities(): ExecutorCapabilities {
    return {
      supportsCancellation: true,
      supportsProgress: true,
      supportsTransferableBuffers: true,
      maxMemoryMb: 1024,
      estimatedOverheadMs: 50, // thread spawn + message overhead
    };
  }

  async getHealth(): Promise<ExecutorHealth> {
    return {
      alive: this.alive,
      ready: this.ready,
      protocolVersion: '1.0.0',
      lastError: this.lastError,
      restartCount: this.restartCount,
      jobsCompleted: this.jobsCompleted,
      jobsFailed: this.jobsFailed,
    };
  }

  async initialize(): Promise<boolean> {
    try {
      for (let i = 0; i < this.workerPoolSize; i++) {
        const worker = new Worker(this.workerScript);
        this.workers.push(worker);
      }
      this.alive = true;

      // Run a test job to verify readiness
      const testResult = await this.runTestJob();
      this.ready = testResult;
      return testResult;
    } catch (err) {
      this.lastError = err instanceof Error ? err.message : String(err);
      this.alive = false;
      this.ready = false;
      return false;
    }
  }

  private async runTestJob(): Promise<boolean> {
    try {
      const worker = this.workers[0];
      if (!worker) return false;

      return new Promise<boolean>((resolve) => {
        const timeout = setTimeout(() => resolve(false), 5000);
        worker.once('message', (msg) => {
          clearTimeout(timeout);
          resolve(msg?.type === 'ready' && msg?.protocolVersion === '1.0.0');
        });
        worker.postMessage({ type: 'health-check' });
      });
    } catch {
      return false;
    }
  }

  async submit<TInput, TOutput>(request: JobRequest<TInput>): Promise<JobHandle<TOutput>> {
    const startTime = Date.now();
    const worker = this.workers[this.nextWorkerIdx % this.workers.length];
    this.nextWorkerIdx++;

    let cancelFn: (() => Promise<void>) | null = null;

    const result: Promise<JobResult<TOutput>> = new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        worker.removeAllListeners('message');
        reject(new Error(`Job ${request.jobId} timed out after ${request.timeoutMs}ms`));
      }, request.timeoutMs);

      cancelFn = async () => {
        clearTimeout(timeout);
        worker.removeAllListeners('message');
        worker.postMessage({ type: 'cancel', jobId: request.jobId });
        this.jobsFailed++;
      };

      const messageHandler = (msg: any) => {
        if (msg.jobId !== request.jobId && msg.type !== 'result' && msg.type !== 'error') return;
        clearTimeout(timeout);
        worker.off('message', messageHandler);

        if (msg.type === 'result') {
          this.jobsCompleted++;
          resolve({
            jobId: request.jobId,
            executorId: this.id,
            executorKind: this.kind,
            graphRevision: request.graphRevision,
            worldRevision: request.worldRevision,
            startedAt: new Date(startTime).toISOString(),
            completedAt: new Date().toISOString(),
            queueTimeMs: msg.queueTimeMs ?? 0,
            executionTimeMs: msg.executionTimeMs ?? 0,
            transferTimeMs: msg.transferTimeMs ?? 0,
            output: msg.output as TOutput,
            outputHash: msg.outputHash ?? '',
            cancelled: msg.cancelled ?? false,
            stale: false,
          });
        } else if (msg.type === 'error') {
          this.jobsFailed++;
          reject(new Error(`Worker error: ${msg.message}`));
        }
      };

      // Send the job to the worker
      worker.on('message', messageHandler);
      worker.postMessage({
        type: 'job',
        jobId: request.jobId,
        jobType: request.jobType,
        input: request.input,
        timeoutMs: request.timeoutMs,
      });
    });

    return {
      result,
      async cancel(reason?: string) {
        if (cancelFn) await cancelFn();
      },
      async getProgress(): Promise<JobProgress> {
        return { phase: 'executing', percent: 0.5, message: 'Running in worker thread' };
      },
    };
  }

  async shutdown(): Promise<void> {
    for (const worker of this.workers) {
      worker.terminate();
    }
    this.workers = [];
    this.alive = false;
    this.ready = false;
  }
}
