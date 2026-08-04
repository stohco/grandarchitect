'use client';

/**
 * ConformancePanel — runs the engine's conformance-test suites.
 *
 * POSTs to /api/engine/run-tests on mount and via the "Run All" button.
 * The route spawns 7 bun test files in parallel and reports pass/fail.
 *
 * Layout:
 *   - Summary banner (overall ok/fail, totals, duration)
 *   - Table of 7 suites: name, expected, passed, failed, duration, badge
 *   - Expandable rows reveal the suite's tail output in mono font
 */

import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Play,
  CheckCircle2,
  XCircle,
  ChevronRight,
  ChevronDown,
  Loader2,
  AlertTriangle,
  FlaskConical,
} from 'lucide-react';

interface SuiteResult {
  name: string;
  path: string;
  expected: number;
  passed: number;
  failed: number;
  total: number;
  ok: boolean;
  durationMs: number;
  tail: string;
}

interface RunTestsResponse {
  ok: boolean;
  totalPassed: number;
  totalFailed: number;
  totalDuration: number;
  suites: SuiteResult[];
  timestamp: string;
}

export default function ConformancePanel() {
  const [data, setData] = useState<RunTestsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const run = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/engine/run-tests', { method: 'POST' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = (await res.json()) as RunTestsResponse;
      setData(json);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  // Auto-run on mount.
  useEffect(() => {
    void run();
  }, [run]);

  const toggle = (name: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  const overallOk = data?.ok ?? false;

  return (
    <div className="flex h-full flex-col bg-[#0e0e24]">
      {/* Header */}
      <div className="flex h-8 items-center justify-between border-b border-[#2a2a4a] px-3">
        <div className="flex items-center gap-1.5">
          <FlaskConical className="h-3.5 w-3.5 text-emerald-500" />
          <span className="text-[10px] uppercase tracking-wider text-[#5a5a7a]">
            Conformance · {data ? `${data.suites.length} suites` : 'loading'}
          </span>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={() => void run()}
          disabled={loading}
          className="h-6 border-[#2a2a4a] bg-[#12122a] px-2 text-[10px] text-[#c8c8e0] hover:bg-[#1d1d36]"
        >
          {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Play className="h-3 w-3" />}
          Run All
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-3">
          {/* Summary banner */}
          {error ? (
            <div className="mb-3 flex items-center gap-2 rounded border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>Run failed: {error}</span>
            </div>
          ) : data ? (
            <div
              className={`mb-3 flex items-center justify-between rounded border px-3 py-2 text-xs ${
                overallOk
                  ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
                  : 'border-rose-500/40 bg-rose-500/10 text-rose-300'
              }`}
            >
              <div className="flex items-center gap-2">
                {overallOk ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : (
                  <XCircle className="h-4 w-4" />
                )}
                <span className="font-semibold uppercase tracking-wider">
                  {overallOk ? 'All Suites Pass' : 'Conformance Failures'}
                </span>
              </div>
              <div className="flex items-center gap-3 font-mono text-[11px]">
                <span className="text-emerald-300">{data.totalPassed} passed</span>
                <span className={data.totalFailed > 0 ? 'text-rose-300' : 'text-[#8888aa]'}>
                  {data.totalFailed} failed
                </span>
                <span className="text-[#8888aa]">{(data.totalDuration / 1000).toFixed(2)}s</span>
              </div>
            </div>
          ) : (
            <div className="mb-3 flex items-center gap-2 rounded border border-[#2a2a4a] bg-[#12122a] px-3 py-2 text-xs text-[#8888aa]">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-emerald-500" />
              Running 7 conformance suites in parallel…
            </div>
          )}

          {/* Suite table */}
          <div className="overflow-hidden rounded border border-[#2a2a4a]">
            <table className="w-full text-left text-[11px]">
              <thead className="bg-[#12122a] text-[10px] uppercase tracking-wider text-[#5a5a7a]">
                <tr>
                  <th className="w-6 px-2 py-1.5"></th>
                  <th className="px-2 py-1.5">Suite</th>
                  <th className="px-2 py-1.5 text-right">Expected</th>
                  <th className="px-2 py-1.5 text-right">Passed</th>
                  <th className="px-2 py-1.5 text-right">Failed</th>
                  <th className="px-2 py-1.5 text-right">Duration</th>
                  <th className="px-2 py-1.5 text-center">Status</th>
                </tr>
              </thead>
              <tbody>
                {data?.suites.map((s) => {
                  const isOpen = expanded.has(s.name);
                  const ratio = s.expected > 0 ? s.passed / s.expected : 0;
                  return (
                    <tr key={s.name} className="border-t border-[#2a2a4a] align-top">
                      <td className="px-2 py-1.5">
                        <button
                          onClick={() => toggle(s.name)}
                          className="text-[#5a5a7a] hover:text-[#c8c8e0]"
                          title={isOpen ? 'Collapse' : 'Expand tail'}
                        >
                          {isOpen ? (
                            <ChevronDown className="h-3 w-3" />
                          ) : (
                            <ChevronRight className="h-3 w-3" />
                          )}
                        </button>
                      </td>
                      <td className="px-2 py-1.5">
                        <div className="font-medium text-[#c8c8e0]">{s.name}</div>
                        <div className="font-mono text-[9px] text-[#5a5a7a]">{s.path}</div>
                      </td>
                      <td className="px-2 py-1.5 text-right font-mono text-[#8888aa]">{s.expected}</td>
                      <td className="px-2 py-1.5 text-right font-mono text-emerald-300">{s.passed}</td>
                      <td
                        className={`px-2 py-1.5 text-right font-mono ${
                          s.failed > 0 ? 'text-rose-300' : 'text-[#5a5a7a]'
                        }`}
                      >
                        {s.failed}
                      </td>
                      <td className="px-2 py-1.5 text-right font-mono text-[#8888aa]">
                        {s.durationMs}ms
                      </td>
                      <td className="px-2 py-1.5 text-center">
                        <span
                          className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[9px] font-bold uppercase ${
                            s.ok
                              ? 'bg-emerald-500/15 text-emerald-300'
                              : 'bg-rose-500/15 text-rose-300'
                          }`}
                          title={`${(ratio * 100).toFixed(0)}% pass rate`}
                        >
                          {s.ok ? (
                            <>
                              <CheckCircle2 className="h-2.5 w-2.5" /> PASS
                            </>
                          ) : (
                            <>
                              <XCircle className="h-2.5 w-2.5" /> FAIL
                            </>
                          )}
                        </span>
                      </td>
                      {isOpen && (
                        <td colSpan={7} className="bg-[#070716] px-3 py-2">
                          <pre className="max-h-44 overflow-auto whitespace-pre-wrap break-all font-mono text-[10px] leading-relaxed text-[#8888aa]">
                            {s.tail || '(no output)'}
                          </pre>
                        </td>
                      )}
                    </tr>
                  );
                })}
                {!data && !error && (
                  <tr>
                    <td colSpan={7} className="px-3 py-6 text-center text-[11px] text-[#5a5a7a]">
                      Waiting for first run…
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
