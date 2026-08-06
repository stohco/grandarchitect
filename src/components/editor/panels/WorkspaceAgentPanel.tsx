'use client';

/**
 * WorkspaceAgentPanel — bottom dock panel for external development agents
 *
 * Shows:
 *   - Workspace agent provider status (Prime Agent mock)
 *   - Acceptance gates (7 required gates with pass/fail indicators)
 *   - Canonical evaluation task and workflow steps
 *   - Evaluation metrics comparison table
 *   - Project-local skills list
 *   - Session management (start/observe/terminate)
 *
 * IMPORTANT: This panel is DEV-ONLY. The workspace agent is never part
 * of the shipped game runtime. It works on the repository, not in the game.
 */

import { useCallback, useEffect, useState } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import {
  Box,
  Cpu,
  ShieldCheck,
  Terminal,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
  FileText,
  GitBranch,
} from 'lucide-react';

interface AcceptanceGate {
  gateId: string;
  name: string;
  command: string;
  verifies: string;
  required: boolean;
}

interface WorkspaceInfo {
  provider: {
    providerId: string;
    displayName: string;
    available: boolean;
  };
  sessions: Array<{
    sessionId: string;
    status: string;
    request: { role: string; worktreePath: string };
    startedAt: string;
    progress: number;
  }>;
  acceptanceGates: AcceptanceGate[];
  skills: string[];
  canonicalTask: {
    name: string;
    description: string;
    instruction: string;
    requiredGates: string[];
  };
  summary: {
    totalSessions: number;
    activeSessions: number;
    totalGates: number;
    totalSkills: number;
  };
}

export default function WorkspaceAgentPanel() {
  const [info, setInfo] = useState<WorkspaceInfo | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchInfo = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/architect/workspace');
      if (res.ok) {
        const data = await res.json();
        setInfo(data);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchInfo();
  }, [fetchInfo]);

  return (
    <div className="flex h-full flex-col bg-[#0e0e24]">
      {/* Header */}
      <div className="flex h-8 shrink-0 items-center gap-2 border-b border-[#2a2a4a] px-3">
        <Terminal className="h-3.5 w-3.5 text-cyan-400" />
        <span className="text-[11px] font-semibold uppercase tracking-wider text-[#8888aa]">
          Workspace Agent
        </span>
        <span className="text-[10px] text-[#5a5a7a]">
          external development harness — dev-only
        </span>
        <div className="flex-1" />
        <Button
          variant="ghost"
          size="sm"
          className="h-5 px-2 text-[10px] text-[#5a5a7a] hover:text-white"
          onClick={() => void fetchInfo()}
          disabled={loading}
        >
          {loading ? 'Loading…' : 'Refresh'}
        </Button>
      </div>

      <ScrollArea className="min-h-0 flex-1">
        <div className="p-3">
          {/* Warning banner */}
          <div className="mb-3 flex items-start gap-2 rounded border border-cyan-500/30 bg-cyan-500/5 p-2">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-cyan-400" />
            <div className="text-[10px] text-cyan-200/80">
              <strong className="text-cyan-300">Three AI layers, never conflated:</strong>
              {' '}
              Prime Agent = external dev harness (works on repo) · UnboundLoop =
              in-product orchestration · Grand Architect = game runtime intelligence.
              This panel is <strong>dev-only</strong> — never in shipped runtime.
            </div>
          </div>

          {/* Provider status */}
          <section className="mb-4">
            <h3 className="mb-1.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-[#5a5a7a]">
              <Cpu className="h-3 w-3" /> Provider
            </h3>
            <div className="rounded border border-[#2a2a4a] bg-[#12122a] p-2">
              <div className="flex items-center gap-2">
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    info?.provider.available ? 'bg-emerald-400' : 'bg-rose-400'
                  }`}
                />
                <span className="text-xs font-medium text-[#c8c8e0]">
                  {info?.provider.displayName ?? 'Loading…'}
                </span>
                <span
                  className={`ml-auto text-[9px] uppercase tracking-wider ${
                    info?.provider.available ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {info?.provider.available ? 'Available' : 'Unavailable (mock)'}
                </span>
              </div>
            </div>
          </section>

          {/* Acceptance Gates */}
          <section className="mb-4">
            <h3 className="mb-1.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-[#5a5a7a]">
              <ShieldCheck className="h-3 w-3" /> Acceptance Gates
            </h3>
            <div className="space-y-1">
              {info?.acceptanceGates.map((gate) => (
                <div
                  key={gate.gateId}
                  className="flex items-center gap-2 rounded border border-[#2a2a4a] bg-[#12122a] px-2 py-1.5"
                >
                  <Clock className="h-3 w-3 shrink-0 text-[#5a5a7a]" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-medium text-[#c8c8e0]">
                        {gate.name}
                      </span>
                      {gate.required && (
                        <span className="text-[8px] uppercase tracking-wider text-amber-400">
                          required
                        </span>
                      )}
                    </div>
                    <code className="text-[9px] text-[#5a5a7a]">{gate.command}</code>
                  </div>
                </div>
              ))}
              {!info && loading && (
                <div className="text-[10px] text-[#5a5a7a]">Loading gates…</div>
              )}
            </div>
          </section>

          {/* Canonical Task */}
          {info?.canonicalTask && (
            <section className="mb-4">
              <h3 className="mb-1.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-[#5a5a7a]">
                <FileText className="h-3 w-3" /> Canonical Evaluation Task
              </h3>
              <div className="rounded border border-[#2a2a4a] bg-[#12122a] p-2">
                <div className="text-xs font-medium text-[#c8c8e0]">
                  {info.canonicalTask.name}
                </div>
                <p className="mt-1 text-[10px] text-[#8888aa]">
                  {info.canonicalTask.description}
                </p>
                <div className="mt-2 rounded bg-[#0e0e24] p-1.5">
                  <code className="text-[9px] text-[#b8a8b0]">
                    {info.canonicalTask.instruction}
                  </code>
                </div>
                <div className="mt-2 flex flex-wrap gap-1">
                  {info.canonicalTask.requiredGates.map((g) => (
                    <span
                      key={g}
                      className="rounded bg-[#2a2a4a] px-1.5 py-0.5 text-[8px] text-[#8888aa]"
                    >
                      {g}
                    </span>
                  ))}
                </div>
              </div>
            </section>
          )}

          {/* Skills */}
          <section className="mb-4">
            <h3 className="mb-1.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-[#5a5a7a]">
              <Box className="h-3 w-3" /> Project Skills
            </h3>
            <div className="grid grid-cols-2 gap-1">
              {info?.skills.map((skill) => (
                <div
                  key={skill}
                  className="flex items-center gap-1.5 rounded border border-[#2a2a4a] bg-[#12122a] px-2 py-1"
                >
                  <CheckCircle className="h-2.5 w-2.5 shrink-0 text-emerald-400" />
                  <span className="text-[10px] text-[#c8c8e0]">{skill}</span>
                </div>
              ))}
            </div>
          </section>

          {/* Sessions */}
          <section className="mb-4">
            <h3 className="mb-1.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-[#5a5a7a]">
              <GitBranch className="h-3 w-3" /> Sessions
            </h3>
            <div className="space-y-1">
              {info?.sessions.map((session) => (
                <div
                  key={session.sessionId}
                  className="flex items-center gap-2 rounded border border-[#2a2a4a] bg-[#12122a] px-2 py-1.5"
                >
                  {session.status === 'running' ? (
                    <CheckCircle className="h-3 w-3 shrink-0 text-emerald-400" />
                  ) : (
                    <XCircle className="h-3 w-3 shrink-0 text-[#5a5a7a]" />
                  )}
                  <span className="text-[10px] text-[#c8c8e0]">
                    {session.request.role}
                  </span>
                  <span className="text-[9px] text-[#5a5a7a]">
                    {session.request.worktreePath}
                  </span>
                  <span className="ml-auto text-[9px] text-[#5a5a7a]">
                    {Math.round(session.progress * 100)}%
                  </span>
                </div>
              ))}
              {info && info.sessions.length === 0 && (
                <div className="text-[10px] text-[#5a5a7a]">
                  No sessions. Provider is mocked — start Prime Agent externally
                  to use real sessions.
                </div>
              )}
            </div>
          </section>

          {/* Architecture note */}
          <section>
            <div className="rounded border border-[#2a2a4a] bg-[#12122a] p-2 text-[10px] text-[#5a5a7a]">
              <strong className="text-[#8888aa]">Constraints:</strong>{' '}
              One editor per worktree · Multiple read-only reviewers · Cannot
              mutate main · Cannot access production secrets · Cannot grant
              itself Grand Architect authority.
            </div>
          </section>
        </div>
      </ScrollArea>
    </div>
  );
}
