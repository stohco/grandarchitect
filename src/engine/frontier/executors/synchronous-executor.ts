/**
 * Synchronous Executor — runs jobs on the calling thread
 */

import type {
  JobExecutor, ExecutorKind, ExecutorCapabilities, ExecutorHealth,
  JobRequest, JobHandle, JobResult, JobProgress,
} from '../job-executor';

export class SynchronousExecutor implements JobExecutor {
  readonly id = 'sync-0';
  readonly kind: ExecutorKind = 'synchronous';
  private jobsCompleted = 0;
  private jobsFailed = 0;

  getCapabilities(): ExecutorCapabilities {
    return {
      supportsCancellation: false,
      supportsProgress: false,
      supportsTransferableBuffers: false,
      maxMemoryMb: 512,
      estimatedOverheadMs: 0,
    };
  }

  async getHealth(): Promise<ExecutorHealth> {
    return {
      alive: true,
      ready: true,
      protocolVersion: '1.0.0',
      restartCount: 0,
      jobsCompleted: this.jobsCompleted,
      jobsFailed: this.jobsFailed,
    };
  }

  async submit<TInput, TOutput>(request: JobRequest<TInput>): Promise<JobHandle<TOutput>> {
    const startTime = Date.now();
    const executeFn = (request as any).input?.executeFn;
    
    const result: Promise<JobResult<TOutput>> = new Promise((resolve) => {
      try {
        const output = executeFn ? executeFn() : { note: 'no executeFn', jobType: request.jobType };
        this.jobsCompleted++;
        resolve({
          jobId: request.jobId,
          executorId: this.id,
          executorKind: this.kind,
          graphRevision: request.graphRevision,
          worldRevision: request.worldRevision,
          startedAt: new Date(startTime).toISOString(),
          completedAt: new Date().toISOString(),
          queueTimeMs: 0,
          executionTimeMs: Date.now() - startTime,
          transferTimeMs: 0,
          output: output as TOutput,
          outputHash: 'sync',
          cancelled: false,
          stale: false,
        });
      } catch (err) {
        this.jobsFailed++;
        resolve({
          jobId: request.jobId,
          executorId: this.id,
          executorKind: this.kind,
          graphRevision: request.graphRevision,
          worldRevision: request.worldRevision,
          startedAt: new Date(startTime).toISOString(),
          completedAt: new Date().toISOString(),
          queueTimeMs: 0,
          executionTimeMs: Date.now() - startTime,
          transferTimeMs: 0,
          output: null as TOutput,
          outputHash: '',
          cancelled: false,
          stale: false,
        });
      }
    });

    return {
      result,
      async cancel() { /* synchronous cannot be cancelled */ },
      async getProgress(): Promise<JobProgress> {
        return { phase: 'executing', percent: 0.5, message: 'Running synchronously' };
      },
    };
  }
}
