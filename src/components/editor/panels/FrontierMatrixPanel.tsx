/**
 * Frontier Matrix Panel
 * ======================
 *
 * Bottom dock 'Frontier Matrix' tab. Shows the status of all S-tier
 * frontier technology candidates from FRONTIER_TECHNOLOGY_MATRIX.md.
 *
 * This is NOT another equal-weight subsystem tab — it's a diagnostics
 * panel that surfaces the capability fabric status. Per the directive:
 * "Do not add UI tabs for experiments. Expose them through the existing
 * Frontier/Diagnostics workspace."
 */

'use client';

import { useCallback, useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  CircleCheck,
  CircleAlert,
  CircleDot,
  Database,
  FlaskConical,
  Play,
  RefreshCw,
  Shield,
  Zap,
} from 'lucide-react';

interface STierCandidate {
  name: string;
  role: string;
  status: string;
  available: boolean;
  reason?: string;
  installMode: string;
  invariants?: number;
  policies?: number;
}

interface BakeOff {
  id: number;
  name: string;
  solvers: string[];
  status: string;
  description: string;
}

interface FrontierMatrixData {
  ok: boolean;
  sTierCandidates: STierCandidate[];
  sTierAvailable: number;
  sTierTotal: number;
  bakeOffs: BakeOff[];
  reclassified: Record<string, string>;
  planningRouter: {
    solvers: Array<{ solverId: string; problemTypes: string[]; available: boolean }>;
    note: string;
  };
}

export default function FrontierMatrixPanel() {
  const [data, setData] = useState<FrontierMatrixData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [testingCandidate, setTestingCandidate] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<Record<string, unknown> | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch('/api/architect/frontier-matrix');
      const json = await res.json();
      if (json.ok) setData(json as FrontierMatrixData);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const id = setInterval(refresh, 15000);
    return () => clearInterval(id);
  }, [refresh]);

  const testCandidate = useCallback(async (name: string) => {
    setTestingCandidate(name);
    setTestResult(null);
    try {
      let endpoint = '';
      if (name === 'Z3') endpoint = '/api/architect/z3-check';
      else if (name === 'Cedar') endpoint = '/api/architect/cedar-check';
      else if (name === 'glTF-Transform' || name === 'meshoptimizer') endpoint = '/api/architect/asset-compile';
      else if (name === '3DTilesRendererJS') endpoint = '/api/architect/planetary-test';
      else if (name === 'Rapier') endpoint = '/api/architect/physics-test';
      else if (name === 'Multi-Solver Plan') endpoint = '/api/architect/multi-solver-plan';

      if (endpoint) {
        const isPost = name === 'glTF-Transform' || name === 'meshoptimizer' || name === 'Multi-Solver Plan';
        const body = name === 'Multi-Solver Plan'
          ? JSON.stringify({ request: 'Create an ancient declining sword-sect city while preserving the river and village road.' })
          : name === 'glTF-Transform' || name === 'meshoptimizer'
            ? JSON.stringify({ generateLODs: true, qualityProfile: 'mainstream' })
            : null;
        const res = isPost
          ? await fetch(endpoint, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: body ?? '{}',
            })
          : await fetch(endpoint);
        const json = await res.json();
        setTestResult({ candidate: name, result: json });
      } else {
        setTestResult({ candidate: name, error: `No test endpoint for ${name}` });
      }
    } catch (err) {
      setTestResult({ candidate: name, error: (err as Error).message });
    } finally {
      setTestingCandidate(null);
    }
  }, []);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center text-[11px] text-[#5a5a7a]">
        Loading frontier matrix…
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex h-full items-center justify-center text-[11px] text-red-400">
        Error: {error ?? 'No data'}
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col gap-2 overflow-hidden p-3 text-[#c8c8e0]">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-[#2a2a4a] pb-2">
        <FlaskConical className="h-3.5 w-3.5 text-amber-400" />
        <span className="text-[11px] font-semibold uppercase tracking-wider text-amber-300">
          Frontier Technology Matrix
        </span>
        <Badge variant="outline" className="ml-1 border-emerald-500/30 bg-emerald-500/10 px-1.5 py-0 text-[9px] text-emerald-300">
          {data.sTierAvailable}/{data.sTierTotal} available
        </Badge>
        <div className="flex-1" />
        <Button
          variant="ghost"
          size="sm"
          className="h-5 px-2 text-[9px] text-[#8888aa] hover:text-white"
          onClick={() => void refresh()}
        >
          <RefreshCw className="mr-1 h-2.5 w-2.5" />
          Refresh
        </Button>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-2 overflow-y-auto md:grid-cols-2">
        {/* Left: S-Tier Candidates */}
        <div className="min-h-0 space-y-1">
          <div className="text-[9px] uppercase tracking-wider text-[#8888aa]">
            S-Tier Candidates ({data.sTierAvailable}/{data.sTierTotal})
          </div>
          {data.sTierCandidates.map((s) => (
            <div
              key={s.name}
              className={`rounded border p-1.5 text-[10px] ${
                s.available
                  ? 'border-emerald-500/30 bg-emerald-500/5'
                  : s.status === 'adapter-created'
                    ? 'border-amber-500/30 bg-amber-500/5'
                    : 'border-[#2a2a4a] bg-[#12122a]'
              }`}
            >
              <div className="flex items-center gap-1.5">
                {s.available ? (
                  <CircleCheck className="h-3 w-3 shrink-0 text-emerald-400" />
                ) : s.status === 'adapter-created' ? (
                  <CircleAlert className="h-3 w-3 shrink-0 text-amber-400" />
                ) : (
                  <CircleDot className="h-3 w-3 shrink-0 text-[#5a5a7a]" />
                )}
                <span className="font-medium text-[#aaaacc]">{s.name}</span>
                <span className="ml-auto rounded bg-[#1a1a2e] px-1 text-[8px] text-[#8888aa]">
                  {s.status}
                </span>
              </div>
              <div className="mt-0.5 text-[9px] text-[#8888aa]">{s.role}</div>
              {s.reason && (
                <div className="mt-0.5 text-[8px] text-[#5a5a7a]">{s.reason.slice(0, 80)}</div>
              )}
              <div className="mt-0.5 flex items-center gap-2">
                <span className="text-[8px] text-[#5a5a7a]">{s.installMode}</span>
                {(s.name === 'Z3' || s.name === 'Cedar' || s.name === 'glTF-Transform' || s.name === 'meshoptimizer' || s.name === '3DTilesRendererJS' || s.name === 'Rapier') && (
                  <button
                    onClick={() => void testCandidate(s.name)}
                    disabled={testingCandidate === s.name}
                    className="ml-auto rounded border border-[#3a3a5a] bg-[#1e1e3e] px-1 py-0.5 text-[8px] text-[#aaaacc] hover:bg-[#2a2a4a] disabled:opacity-50"
                  >
                    {testingCandidate === s.name ? 'Testing…' : 'Test'}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Right: Bake-offs + Reclassified */}
        <div className="min-h-0 space-y-2">
          <div>
            <div className="mb-1 text-[9px] uppercase tracking-wider text-[#8888aa]">
              Ordered Bake-offs
            </div>
            <div className="space-y-1">
              {data.bakeOffs.map((b) => (
                <div key={b.id} className="rounded border border-[#2a2a4a] bg-[#12122a] p-1.5">
                  <div className="flex items-center gap-1.5">
                    <span className="rounded bg-amber-500/15 px-1 text-[9px] text-amber-300">#{b.id}</span>
                    <span className="text-[10px] font-medium text-[#aaaacc]">{b.name}</span>
                    <span className="ml-auto text-[8px] text-[#8888aa]">{b.status}</span>
                  </div>
                  <div className="mt-0.5 text-[8px] text-[#8888aa]">
                    Solvers: {b.solvers.join(', ')}
                  </div>
                  {(b.id === 2 || b.id === 3 || b.id === 5 || b.id === 7) && (
                    <button
                      onClick={() => void testCandidate(b.id === 2 ? 'Multi-Solver Plan' : b.id === 5 ? '3DTilesRendererJS' : b.id === 7 ? 'Rapier' : 'Cedar')}
                      disabled={testingCandidate === (b.id === 2 ? 'Multi-Solver Plan' : b.id === 5 ? '3DTilesRendererJS' : b.id === 7 ? 'Rapier' : 'Cedar')}
                      className="mt-1 w-full rounded border border-[#3a3a5a] bg-[#1e1e3e] px-1 py-0.5 text-[8px] text-[#aaaacc] hover:bg-[#2a2a4a] disabled:opacity-50"
                    >
                      {testingCandidate === (b.id === 2 ? 'Multi-Solver Plan' : b.id === 5 ? '3DTilesRendererJS' : b.id === 7 ? 'Rapier' : 'Cedar') ? 'Testing…' : 'Test Bake-off'}
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="mb-1 text-[9px] uppercase tracking-wider text-[#8888aa]">
              Reclassified (NOT Foundational)
            </div>
            {Object.entries(data.reclassified).map(([k, v]) => (
              <div key={k} className="rounded border border-red-500/30 bg-red-500/5 p-1.5 text-[10px]">
                <span className="font-medium text-red-300">{k}</span>
                <span className="ml-1 text-[9px] text-[#8888aa]">{v}</span>
              </div>
            ))}
          </div>

          {testResult && (
            <div>
              <div className="mb-1 text-[9px] uppercase tracking-wider text-[#8888aa]">
                Test Result: {testResult.candidate as string}
              </div>
              <div className="max-h-48 overflow-y-auto rounded border border-[#2a2a4a] bg-[#0a0a1e] p-2">
                <pre className="whitespace-pre-wrap break-all font-mono text-[9px] text-[#aaaacc]">
                  {JSON.stringify(testResult.error ?? testResult.result, null, 2).slice(0, 2000)}
                </pre>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
