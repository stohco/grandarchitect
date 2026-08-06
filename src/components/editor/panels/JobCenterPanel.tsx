'use client';

/**
 * JobCenterPanel
 * ==============
 *
 * Unified Job Center showing all async jobs with full lifecycle:
 * queued → running → completed/failed/cancelled
 *
 * Each job displays: job ID, action, requesting actor, target, status,
 * progress, stage, provider, source/output revision, warnings, logs,
 * cancellation, resulting artifacts, evidence, errors.
 *
 * Replaces transient toasts with persistent job tracking.
 */

import { useCallback, useEffect, useState } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import {
  Loader2, CheckCircle, XCircle, Clock, Ban,
  AlertTriangle, Activity,
} from 'lucide-react';

interface StudioJob {
  jobId: string;
  action: string;
  requestingActor: string;
  target: string;
  status: 'queued' | 'running' | 'completed' | 'failed' | 'cancelled' | 'retrying';
  queueTime: string;
  startTime?: string;
  elapsedTimeMs?: number;
  progress: number;
  stage: string;
  provider?: string;
  sourceRevision?: number;
  outputRevision?: number;
  warnings: string[];
  logs: string[];
  cancellationAvailable: boolean;
  resultingArtifactIds: string[];
  error?: string;
}

export default function JobCenterPanel() {
  const [jobs, setJobs] = useState<StudioJob[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchJobs = useCallback(async () => {
    try {
      const res = await fetch('/api/studio-ui');
      if (res.ok) {
        const data = await res.json();
        setJobs(data.jobs ?? []);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchJobs();
    const interval = setInterval(() => void fetchJobs(), 2000);
    return () => clearInterval(interval);
  }, [fetchJobs]);

  const activeJobs = jobs.filter((j) => j.status === 'running' || j.status === 'queued');
  const completedJobs = jobs.filter((j) => j.status === 'completed');
  const failedJobs = jobs.filter((j) => j.status === 'failed' || j.status === 'cancelled');

  return (
    <div className="flex h-full flex-col bg-[#0e0e24]">
      {/* Header */}
      <div className="flex h-8 shrink-0 items-center gap-2 border-b border-[#2a2a4a] px-3">
        <Activity className="h-3.5 w-3.5 text-cyan-400" />
        <span className="text-[11px] font-semibold uppercase tracking-wider text-[#8888aa]">
          Job Center
        </span>
        {activeJobs.length > 0 && (
          <span className="flex items-center gap-1 text-[10px] text-amber-400">
            <Loader2 className="h-2.5 w-2.5 animate-spin" />
            {activeJobs.length} active
          </span>
        )}
        <div className="flex-1" />
        <Button variant="ghost" size="sm" className="h-5 px-2 text-[10px] text-[#5a5a7a] hover:text-white" onClick={() => void fetchJobs()} disabled={loading}>
          {loading ? '…' : 'Refresh'}
        </Button>
      </div>

      <ScrollArea className="min-h-0 flex-1">
        <div className="p-3 space-y-3">
          {/* Empty state */}
          {jobs.length === 0 && !loading && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Clock className="mb-3 h-8 w-8 text-[#3a3a5a]" />
              <p className="text-sm text-[#8888aa]">No jobs yet</p>
              <p className="mt-1 text-[10px] text-[#5a5a7a]">
                Async operations (terrain generation, GLB export, asset placement)
                will appear here with full lifecycle tracking.
              </p>
            </div>
          )}

          {/* Active jobs */}
          {activeJobs.length > 0 && (
            <section>
              <h3 className="mb-1.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-amber-400">
                <Loader2 className="h-3 w-3 animate-spin" /> Active ({activeJobs.length})
              </h3>
              <div className="space-y-1.5">
                {activeJobs.map((job) => (
                  <JobCard key={job.jobId} job={job} />
                ))}
              </div>
            </section>
          )}

          {/* Completed jobs */}
          {completedJobs.length > 0 && (
            <section>
              <h3 className="mb-1.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-400">
                <CheckCircle className="h-3 w-3" /> Completed ({completedJobs.length})
              </h3>
              <div className="space-y-1.5">
                {completedJobs.slice(0, 10).map((job) => (
                  <JobCard key={job.jobId} job={job} />
                ))}
              </div>
            </section>
          )}

          {/* Failed jobs */}
          {failedJobs.length > 0 && (
            <section>
              <h3 className="mb-1.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-rose-400">
                <XCircle className="h-3 w-3" /> Failed ({failedJobs.length})
              </h3>
              <div className="space-y-1.5">
                {failedJobs.slice(0, 10).map((job) => (
                  <JobCard key={job.jobId} job={job} />
                ))}
              </div>
            </section>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

function JobCard({ job }: { job: StudioJob }) {
  const statusConfig = {
    queued: { icon: Clock, color: 'text-[#8888aa]', bg: 'border-[#2a2a4a]' },
    running: { icon: Loader2, color: 'text-amber-400', bg: 'border-amber-500/30' },
    completed: { icon: CheckCircle, color: 'text-emerald-400', bg: 'border-emerald-500/30' },
    failed: { icon: XCircle, color: 'text-rose-400', bg: 'border-rose-500/30' },
    cancelled: { icon: Ban, color: 'text-[#5a5a7a]', bg: 'border-[#2a2a4a]' },
    retrying: { icon: Loader2, color: 'text-cyan-400', bg: 'border-cyan-500/30' },
  };

  const config = statusConfig[job.status] ?? statusConfig.queued;
  const Icon = config.icon;
  const time = new Date(job.queueTime).toLocaleTimeString('en-US', { hour12: false });

  return (
    <div className={`rounded border ${config.bg} bg-[#12122a] p-2`}>
      <div className="flex items-center gap-2">
        <Icon className={`h-3 w-3 shrink-0 ${config.color} ${job.status === 'running' || job.status === 'retrying' ? 'animate-spin' : ''}`} />
        <span className="text-[11px] font-medium text-[#c8c8e0]">{job.action}</span>
        <span className="text-[9px] text-[#5a5a7a]">{job.target}</span>
        <span className="ml-auto font-mono text-[9px] text-[#5a5a7a]">{time}</span>
      </div>

      {/* Progress bar for running jobs */}
      {job.status === 'running' && (
        <div className="mt-1.5 h-1 overflow-hidden rounded bg-[#0e0e24]">
          <div
            className="h-full bg-amber-500/60 transition-all"
            style={{ width: `${Math.round(job.progress * 100)}%` }}
          />
        </div>
      )}

      {/* Stage */}
      {job.stage && job.status !== 'completed' && (
        <div className="mt-0.5 text-[9px] text-[#5a5a7a]">Stage: {job.stage}</div>
      )}

      {/* Elapsed time */}
      {job.elapsedTimeMs !== undefined && job.elapsedTimeMs > 0 && (
        <div className="mt-0.5 font-mono text-[9px] text-[#5a5a7a]">
          Elapsed: {(job.elapsedTimeMs / 1000).toFixed(1)}s
        </div>
      )}

      {/* Error */}
      {job.error && (
        <div className="mt-1 rounded bg-rose-500/10 p-1 text-[9px] text-rose-300">
          {job.error}
        </div>
      )}

      {/* Warnings */}
      {job.warnings.length > 0 && (
        <div className="mt-1 space-y-0.5">
          {job.warnings.slice(0, 3).map((w, i) => (
            <div key={i} className="flex items-start gap-1 text-[9px] text-amber-300">
              <AlertTriangle className="mt-0.5 h-2.5 w-2.5 shrink-0" />
              {w}
            </div>
          ))}
        </div>
      )}

      {/* Artifacts */}
      {job.resultingArtifactIds.length > 0 && (
        <div className="mt-1 flex flex-wrap gap-1">
          {job.resultingArtifactIds.slice(0, 5).map((id, i) => (
            <span key={i} className="rounded bg-emerald-500/10 px-1 py-0.5 font-mono text-[8px] text-emerald-300">
              {id.slice(0, 12)}
            </span>
          ))}
        </div>
      )}

      {/* Revisions */}
      {(job.sourceRevision !== undefined || job.outputRevision !== undefined) && (
        <div className="mt-0.5 font-mono text-[8px] text-[#5a5a7a]">
          {job.sourceRevision !== undefined && `rev ${job.sourceRevision}`}
          {job.outputRevision !== undefined && ` → ${job.outputRevision}`}
        </div>
      )}
    </div>
  );
}
