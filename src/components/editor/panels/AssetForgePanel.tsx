'use client';

/**
 * AssetForgePanel — bottom dock panel for the AI Asset Forge
 *
 * Shows:
 *   - Registered AI asset providers (with availability + capabilities)
 *   - Recent forge jobs (pending/running/completed/failed)
 *   - A test form to submit generate/edit/understand/extract-parts jobs
 *   - Candidate assets with their validation status
 *
 * IMPORTANT: All providers currently return MOCK results. Hunyuan3D-Buffalo
 * has no public inference implementation. This panel exists to validate the
 * provider-neutral interface and the candidate/preview/accept workflow.
 */

import { useCallback, useEffect, useState } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Box, Cpu, Loader2, AlertTriangle, CheckCircle, XCircle, Clock, Zap } from 'lucide-react';

interface ProviderDescriptor {
  providerId: string;
  displayName: string;
  available: boolean;
  capabilities: string[];
  modelVersion: string;
}

interface ForgeJob {
  jobId: string;
  providerId: string;
  capability: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  error?: string;
  createdAt: string;
  completedAt?: string;
}

interface ForgeState {
  providers: ProviderDescriptor[];
  jobs: ForgeJob[];
  summary: {
    totalProviders: number;
    availableProviders: number;
    totalJobs: number;
  };
}

export default function AssetForgePanel() {
  const [state, setState] = useState<ForgeState | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [capability, setCapability] = useState('generate');
  const [instruction, setInstruction] = useState('A cultivator sword with a jade pommel');
  const [lastResult, setLastResult] = useState<unknown>(null);

  const fetchState = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/assets/forge');
      if (res.ok) {
        const data = await res.json();
        setState(data);
      }
    } catch {
      // ignore fetch errors
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchState();
  }, [fetchState]);

  const handleSubmit = useCallback(async () => {
    setSubmitting(true);
    setLastResult(null);
    try {
      const res = await fetch('/api/assets/forge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          capability,
          request: {
            prompt: instruction,
            instruction,
            query: instruction,
          },
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setLastResult(data);
        void fetchState(); // refresh jobs
      } else {
        const err = await res.json().catch(() => ({ error: 'Request failed' }));
        setLastResult({ error: err.error });
      }
    } catch (err) {
      setLastResult({ error: err instanceof Error ? err.message : 'Network error' });
    } finally {
      setSubmitting(false);
    }
  }, [capability, instruction, fetchState]);

  return (
    <div className="flex h-full flex-col bg-[#0e0e24]">
      {/* Header */}
      <div className="flex h-8 shrink-0 items-center gap-2 border-b border-[#2a2a4a] px-3">
        <Box className="h-3.5 w-3.5 text-amber-400" />
        <span className="text-[11px] font-semibold uppercase tracking-wider text-[#8888aa]">
          Asset Forge
        </span>
        <span className="text-[10px] text-[#5a5a7a]">
          AI asset authoring — candidate-producing only
        </span>
        <div className="flex-1" />
        <Button
          variant="ghost"
          size="sm"
          className="h-5 px-2 text-[10px] text-[#5a5a7a] hover:text-white"
          onClick={() => void fetchState()}
          disabled={loading}
        >
          {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Refresh'}
        </Button>
      </div>

      <ScrollArea className="min-h-0 flex-1">
        <div className="p-3">
          {/* Warning banner */}
          <div className="mb-3 flex items-start gap-2 rounded border border-amber-500/30 bg-amber-500/5 p-2">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-400" />
            <div className="text-[10px] text-amber-200/80">
              All providers are currently <strong className="text-amber-300">mocked</strong>.
              Hunyuan3D-Buffalo has no public inference implementation — no
              checkpoints, no VRAM/latency disclosure. This panel validates the
              provider-neutral interface and candidate workflow only.
            </div>
          </div>

          {/* Providers */}
          <section className="mb-4">
            <h3 className="mb-1.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-[#5a5a7a]">
              <Cpu className="h-3 w-3" /> Providers
            </h3>
            <div className="space-y-1.5">
              {state?.providers.map((p) => (
                <div
                  key={p.providerId}
                  className="rounded border border-[#2a2a4a] bg-[#12122a] p-2"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${
                        p.available ? 'bg-emerald-400' : 'bg-rose-400'
                      }`}
                    />
                    <span className="text-xs font-medium text-[#c8c8e0]">
                      {p.displayName}
                    </span>
                    <span className="ml-auto font-mono text-[9px] text-[#5a5a7a]">
                      {p.modelVersion}
                    </span>
                  </div>
                  <div className="mt-1 flex items-center gap-1">
                    <span
                      className={`text-[9px] uppercase tracking-wider ${
                        p.available ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {p.available ? 'Available' : 'Unavailable'}
                    </span>
                    {p.capabilities.length > 0 ? (
                      <span className="text-[9px] text-[#5a5a7a]">
                        · {p.capabilities.join(', ')}
                      </span>
                    ) : (
                      <span className="text-[9px] text-[#5a5a7a]">
                        · no implemented capabilities
                      </span>
                    )}
                  </div>
                </div>
              ))}
              {!state && loading && (
                <div className="text-[10px] text-[#5a5a7a]">Loading providers…</div>
              )}
            </div>
          </section>

          {/* Job submission form */}
          <section className="mb-4">
            <h3 className="mb-1.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-[#5a5a7a]">
              <Zap className="h-3 w-3" /> Submit Test Job
            </h3>
            <div className="space-y-2 rounded border border-[#2a2a4a] bg-[#12122a] p-2.5">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-[10px] text-[#8888aa]">Capability</Label>
                  <Select value={capability} onValueChange={setCapability}>
                    <SelectTrigger className="h-7 border-[#2a2a4a] bg-[#0e0e24] text-xs text-[#c8c8e0]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="generate">Generate</SelectItem>
                      <SelectItem value="edit">Edit</SelectItem>
                      <SelectItem value="understand">Understand</SelectItem>
                      <SelectItem value="extract-parts">Extract Parts</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-[10px] text-[#8888aa]">Instruction / Prompt</Label>
                  <Input
                    value={instruction}
                    onChange={(e) => setInstruction(e.target.value)}
                    className="h-7 border-[#2a2a4a] bg-[#0e0e24] font-mono text-xs text-[#c8c8e0]"
                    placeholder="A cultivator sword with a jade pommel"
                  />
                </div>
              </div>
              <Button
                size="sm"
                className="h-7 w-full bg-amber-600/80 text-xs font-semibold text-white hover:bg-amber-500"
                onClick={() => void handleSubmit()}
                disabled={submitting || !instruction.trim()}
              >
                {submitting ? (
                  <>
                    <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />
                    Submitting…
                  </>
                ) : (
                  <>
                    <Zap className="mr-1.5 h-3 w-3" />
                    Submit Job
                  </>
                )}
              </Button>
            </div>
          </section>

          {/* Jobs */}
          <section className="mb-4">
            <h3 className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-[#5a5a7a]">
              Recent Jobs
            </h3>
            <div className="space-y-1">
              {state?.jobs.map((job) => (
                <div
                  key={job.jobId}
                  className="flex items-center gap-2 rounded border border-[#2a2a4a] bg-[#12122a] px-2 py-1.5"
                >
                  {job.status === 'completed' && (
                    <CheckCircle className="h-3 w-3 shrink-0 text-emerald-400" />
                  )}
                  {job.status === 'failed' && (
                    <XCircle className="h-3 w-3 shrink-0 text-rose-400" />
                  )}
                  {job.status === 'running' && (
                    <Loader2 className="h-3 w-3 shrink-0 animate-spin text-amber-400" />
                  )}
                  {job.status === 'pending' && (
                    <Clock className="h-3 w-3 shrink-0 text-[#5a5a7a]" />
                  )}
                  <span className="font-mono text-[10px] text-[#c8c8e0]">
                    {job.capability}
                  </span>
                  <span className="text-[9px] text-[#5a5a7a]">
                    {job.providerId}
                  </span>
                  <span className="ml-auto text-[9px] text-[#5a5a7a]">
                    {new Date(job.createdAt).toLocaleTimeString('en-US', {
                      hour12: false,
                    })}
                  </span>
                </div>
              ))}
              {state && state.jobs.length === 0 && (
                <div className="text-[10px] text-[#5a5a7a]">
                  No jobs yet. Submit a test job above.
                </div>
              )}
            </div>
          </section>

          {/* Last result */}
          {lastResult && (
            <section className="mb-4">
              <h3 className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-[#5a5a7a]">
                Last Result
              </h3>
              <pre className="max-h-40 overflow-auto rounded border border-[#2a2a4a] bg-[#0e0810] p-2 font-mono text-[10px] leading-relaxed text-[#b8a8b0]">
                {JSON.stringify(lastResult, null, 2)}
              </pre>
            </section>
          )}

          {/* Architecture note */}
          <section>
            <div className="rounded border border-[#2a2a4a] bg-[#12122a] p-2 text-[10px] text-[#5a5a7a]">
              <strong className="text-[#8888aa]">Architecture:</strong> Buffalo is
              a provider plugin, not the Grand Architect. The Asset Forge brokers
              providers. Every AI edit produces a{' '}
              <strong className="text-amber-300">candidate</strong> — never
              authoritative until human-approved. The shipped runtime has no
              dependency on any AI provider.
            </div>
          </section>
        </div>
      </ScrollArea>
    </div>
  );
}
