/**
 * Live Architect Studio — Bottom Dock (Console/History/Capabilities/Performance/Conformance/Engine)
 */

'use client';

import { useEffect, useRef, useState } from 'react';
import { useEditorStore } from '@/lib/editor/store';
import type { LogLevel } from '@/lib/editor/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { PHASES, PLUGINS, SAFETY_RAILS, TOTAL_TESTS, CONFORMANCE_FILES } from '@/lib/engine/dashboard-data';
import {
  Terminal, History, Puzzle, Gauge, FlaskConical, Cpu, Trash2, Undo2, GitBranch,
  Play, ChevronDown, ChevronRight, Loader2, User, Bot, Plus, CheckCircle2, XCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const TABS = [
  { id: 'console', label: 'Console', icon: Terminal },
  { id: 'history', label: 'History', icon: History },
  { id: 'capabilities', label: 'Capabilities', icon: Puzzle },
  { id: 'performance', label: 'Performance', icon: Gauge },
  { id: 'conformance', label: 'Conformance', icon: FlaskConical },
  { id: 'engine', label: 'Engine', icon: Cpu },
];

const LEVEL_COLORS: Record<LogLevel, string> = {
  info: 'text-cyan-400', success: 'text-emerald-400', warn: 'text-amber-400',
  error: 'text-rose-400', debug: 'text-zinc-500', architect: 'text-fuchsia-400',
};

const PERM_COLORS: Record<string, string> = {
  presentation_only: 'bg-cyan-500/15 text-cyan-300',
  local_physical: 'bg-amber-500/15 text-amber-300',
  simulation_semantic: 'bg-rose-500/15 text-rose-300',
  historical_rule: 'bg-fuchsia-500/15 text-fuchsia-300',
  architect_power: 'bg-emerald-500/15 text-emerald-300',
};

export default function BottomDock() {
  const activeTab = useEditorStore((s) => s.activeBottomTab);
  const setActiveTab = useEditorStore((s) => s.setActiveBottomTab);

  return (
    <div className="dark flex h-[230px] flex-col border-t border-zinc-800 bg-zinc-950">
      <div className="flex items-center gap-0.5 border-b border-zinc-800 px-1">
        {TABS.map((t) => {
          const active = activeTab === t.id;
          return (
            <button key={t.id} onClick={() => setActiveTab(t.id)}
              className={cn('flex items-center gap-1.5 border-t-2 px-3 py-1.5 text-xs font-medium transition-colors',
                active ? 'border-emerald-500 bg-zinc-900 text-zinc-100' : 'border-transparent text-zinc-500 hover:bg-zinc-900/50 hover:text-zinc-300')}>
              <t.icon className="h-3.5 w-3.5" />{t.label}
              {t.id === 'console' && <TabCount kind="logs" />}
              {t.id === 'history' && <TabCount kind="tx" />}
              {t.id === 'capabilities' && <TabCount kind="cap" />}
            </button>
          );
        })}
      </div>
      <div className="min-h-0 flex-1 overflow-hidden">
        {activeTab === 'console' && <ConsoleTab />}
        {activeTab === 'history' && <HistoryTab />}
        {activeTab === 'capabilities' && <CapabilitiesTab />}
        {activeTab === 'performance' && <PerformanceTab />}
        {activeTab === 'conformance' && <ConformanceTab />}
        {activeTab === 'engine' && <EngineTab />}
      </div>
    </div>
  );
}

function TabCount({ kind }: { kind: 'logs' | 'tx' | 'cap' }) {
  const n = useEditorStore((s) => kind === 'logs' ? s.logs.length : kind === 'tx' ? s.transactions.length : s.capabilities.length);
  if (!n) return null;
  return <span className="rounded bg-zinc-800 px-1 text-[9px] text-zinc-400">{n}</span>;
}

// ---- Console ----
function ConsoleTab() {
  const logs = useEditorStore((s) => s.logs);
  const filter = useEditorStore((s) => s.consoleFilter);
  const setFilter = useEditorStore((s) => s.setConsoleFilter);
  const clearLogs = useEditorStore((s) => s.clearLogs);
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => { endRef.current?.scrollIntoView({ block: 'end' }); }, [logs]);
  const shown = filter === 'all' ? logs : logs.filter((l) => l.level === filter);
  const levels: (LogLevel | 'all')[] = ['all', 'info', 'success', 'warn', 'error', 'debug', 'architect'];
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-1 border-b border-zinc-900 px-2 py-1">
        {levels.map((lv) => (
          <button key={lv} onClick={() => setFilter(lv)} className={cn('rounded px-1.5 py-0.5 text-[10px] uppercase', filter === lv ? 'bg-zinc-800 text-zinc-200' : 'text-zinc-600 hover:text-zinc-400')}>{lv}</button>
        ))}
        <div className="ml-auto" />
        <Button size="sm" variant="ghost" onClick={clearLogs} className="h-6 gap-1 px-2 text-[10px] text-zinc-500 hover:text-rose-400"><Trash2 className="h-3 w-3" />Clear</Button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-2 py-1 font-mono text-[11px] leading-5 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-zinc-700">
        {shown.length === 0 ? <div className="py-4 text-center text-zinc-700">No log entries</div> : shown.map((l) => (
          <div key={l.id} className="flex gap-2 hover:bg-zinc-900/40">
            <span className="shrink-0 text-zinc-700">[{l.tick}]</span>
            <span className={cn('shrink-0', LEVEL_COLORS[l.level])}>●</span>
            <span className="shrink-0 text-zinc-600">[{l.source}]</span>
            <span className="text-zinc-300">{l.message}</span>
          </div>
        ))}
        <div ref={endRef} />
      </div>
    </div>
  );
}

// ---- History ----
function HistoryTab() {
  const transactions = useEditorStore((s) => s.transactions);
  const branches = useEditorStore((s) => s.branches);
  const currentBranch = useEditorStore((s) => s.currentBranchId);
  const undoTransaction = useEditorStore((s) => s.undoTransaction);
  const switchBranch = useEditorStore((s) => s.switchBranch);
  const createBranch = useEditorStore((s) => s.createBranch);
  const [newName, setNewName] = useState('');
  const [adding, setAdding] = useState(false);
  return (
    <div className="flex h-full">
      <div className="flex w-[60%] flex-col border-r border-zinc-900">
        <div className="border-b border-zinc-900 px-2 py-1 text-[10px] uppercase tracking-wide text-zinc-600">Transactions ({transactions.length})</div>
        <div className="min-h-0 flex-1 overflow-y-auto [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-zinc-700">
          {transactions.length === 0 ? <div className="py-4 text-center text-[11px] text-zinc-700">No transactions yet. Edit an entity to create one.</div> : transactions.map((t) => (
            <div key={t.transactionId} className="border-b border-zinc-900 px-2 py-1.5">
              <div className="flex items-center gap-1.5">
                {t.requestedBy === 'user' ? <User className="h-3 w-3 text-cyan-400" /> : <Bot className="h-3 w-3 text-fuchsia-400" />}
                <span className="flex-1 truncate text-[11px] text-zinc-300">{t.originalRequest}</span>
                <Badge variant="secondary" className={cn('h-4 border border-transparent text-[9px]', PERM_COLORS[t.permissionClass] ?? 'bg-zinc-800 text-zinc-400')}>{t.permissionClass}</Badge>
                {t.undone ? <span className="text-[9px] text-zinc-600">UNDONE</span> : t.permissionClass !== 'architect_power' && (
                  <button onClick={() => undoTransaction(t.transactionId)} className="text-zinc-600 hover:text-rose-400"><Undo2 className="h-3 w-3" /></button>
                )}
              </div>
              <div className="mt-0.5 flex gap-1">
                {t.affectedSystems.slice(0, 4).map((sys) => <span key={sys} className="rounded bg-zinc-900 px-1 text-[9px] text-zinc-500">{sys}</span>)}
                <span className="ml-auto text-[9px] text-zinc-700">{t.diffs.length} diffs · tick {t.timestamp}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="flex w-[40%] flex-col">
        <div className="flex items-center justify-between border-b border-zinc-900 px-2 py-1">
          <span className="text-[10px] uppercase tracking-wide text-zinc-600">Branches ({branches.length})</span>
          <button onClick={() => setAdding(!adding)} className="text-zinc-500 hover:text-emerald-400"><Plus className="h-3 w-3" /></button>
        </div>
        {adding && (
          <div className="flex gap-1 border-b border-zinc-900 p-1">
            <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="branch name" className="h-6 border-zinc-800 bg-zinc-900 text-[11px]" onKeyDown={(e) => { if (e.key === 'Enter' && newName) { createBranch(newName, 'User branch'); setNewName(''); setAdding(false); } }} />
            <Button size="sm" onClick={() => { if (newName) { createBranch(newName, 'User branch'); setNewName(''); setAdding(false); } }} className="h-6 bg-emerald-600 text-[10px]">Add</Button>
          </div>
        )}
        <div className="min-h-0 flex-1 overflow-y-auto [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-zinc-700">
          {branches.map((b) => (
            <button key={b.branchId} onClick={() => switchBranch(b.branchId)} className={cn('flex w-full items-center gap-1.5 border-b border-zinc-900 px-2 py-1.5 text-left', currentBranch === b.branchId ? 'border-l-2 border-l-emerald-500 bg-emerald-500/10' : 'hover:bg-zinc-900/50')}>
              <GitBranch className="h-3 w-3 text-zinc-600" />
              <span className="flex-1 truncate text-[11px] text-zinc-300">{b.name}</span>
              {b.isFork && <Badge variant="secondary" className="h-4 bg-fuchsia-500/15 text-[9px] text-fuchsia-300">fork</Badge>}
              <span className="font-mono text-[9px] text-zinc-600">{b.transactionCount}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ---- Capabilities ----
function CapabilitiesTab() {
  const caps = useEditorStore((s) => s.capabilities);
  const loading = useEditorStore((s) => s.capabilitiesLoading);
  const load = useEditorStore((s) => s.loadCapabilities);
  useEffect(() => { if (caps.length === 0 && !loading) load(); }, [caps.length, loading, load]);
  if (loading && caps.length === 0) return <div className="flex h-full items-center justify-center"><Loader2 className="h-4 w-4 animate-spin text-emerald-400" /></div>;
  const totalTools = caps.reduce((a, c) => a + c.inspectTools + c.previewTools + c.mutationTools + c.generationTools, 0);
  return (
    <div className="h-full overflow-y-auto [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-zinc-700">
      <div className="border-b border-zinc-900 px-2 py-1 text-[10px] uppercase tracking-wide text-zinc-600">{caps.length} capability descriptors · {totalTools} total tools</div>
      <div className="grid grid-cols-1 gap-1.5 p-2 xl:grid-cols-2">
        {caps.map((c) => (
          <div key={c.capabilityId} className="rounded border border-zinc-800 bg-zinc-900 p-2">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[11px] text-emerald-400">{c.capabilityId}</span>
              <Badge variant="secondary" className={cn('h-4 border border-transparent text-[9px]', PERM_COLORS[c.permissionClass] ?? 'bg-zinc-800')}>{c.permissionClass}</Badge>
            </div>
            <p className="mt-0.5 text-[10px] text-zinc-500">{c.description}</p>
            <div className="mt-1.5 flex flex-wrap gap-1">
              <span className="rounded bg-zinc-800 px-1 text-[9px] text-cyan-300">inspect {c.inspectTools}</span>
              <span className="rounded bg-zinc-800 px-1 text-[9px] text-amber-300">preview {c.previewTools}</span>
              <span className="rounded bg-zinc-800 px-1 text-[9px] text-rose-300">mutate {c.mutationTools}</span>
              <span className="rounded bg-zinc-800 px-1 text-[9px] text-emerald-300">gen {c.generationTools}</span>
            </div>
            <div className="mt-1 flex gap-2 text-[9px]">
              <span className={c.supportsUndo ? 'text-emerald-400' : 'text-zinc-700'}>undo</span>
              <span className={c.supportsLiveEdit ? 'text-emerald-400' : 'text-zinc-700'}>live</span>
              <span className={c.supportsPreviewFork ? 'text-emerald-400' : 'text-zinc-700'}>fork</span>
              <span className="ml-auto text-zinc-600">{c.editableProperties.length} props</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---- Performance ----
function PerformanceTab() {
  const perf = useEditorStore((s) => s.perf);
  const fpsHist = useEditorStore((s) => s.fpsHistory);
  const settlement = useEditorStore((s) => s.settlement);
  const fpsColor = perf.fps >= 55 ? 'text-emerald-400' : perf.fps >= 30 ? 'text-amber-400' : 'text-rose-400';
  const tiles = [
    { label: 'FPS', value: perf.fps, color: fpsColor },
    { label: 'Frame ms', value: perf.frameMs, color: 'text-zinc-300' },
    { label: 'Draw Calls', value: perf.drawCalls, color: 'text-zinc-300' },
    { label: 'Triangles', value: perf.triangles.toLocaleString(), color: 'text-zinc-300' },
    { label: 'Entities', value: perf.entities, color: 'text-zinc-300' },
    { label: 'Mem MB', value: perf.memMb, color: 'text-zinc-300' },
  ];
  const min = fpsHist.length ? Math.min(...fpsHist) : 0;
  const max = fpsHist.length ? Math.max(...fpsHist) : 0;
  const avg = fpsHist.length ? Math.round(fpsHist.reduce((a, b) => a + b, 0) / fpsHist.length) : 0;
  const pts = fpsHist.length > 1 ? fpsHist.map((f, i) => `${(i / (fpsHist.length - 1)) * 100},${40 - (Math.min(f, 90) / 90) * 38}`).join(' ') : '';
  return (
    <div className="h-full overflow-y-auto p-2 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-zinc-700">
      <div className="grid grid-cols-3 gap-1.5 lg:grid-cols-6">
        {tiles.map((t) => (
          <div key={t.label} className="rounded border border-zinc-800 bg-zinc-900 p-2">
            <div className={cn('font-mono text-lg', t.color)}>{t.value}</div>
            <div className="text-[10px] uppercase tracking-wide text-zinc-600">{t.label}</div>
          </div>
        ))}
      </div>
      <div className="mt-2 rounded border border-zinc-800 bg-zinc-900 p-2">
        <div className="mb-1 flex items-center justify-between text-[10px] text-zinc-500">
          <span className="uppercase tracking-wide">FPS History</span>
          <span className="font-mono">min {min} · avg {avg} · max {max}</span>
        </div>
        {pts ? (
          <svg viewBox="0 0 100 40" className="h-16 w-full" preserveAspectRatio="none">
            <polyline points={pts} fill="none" stroke="#10b981" strokeWidth="0.6" vectorEffect="non-scaling-stroke" />
          </svg>
        ) : <div className="h-16 flex items-center justify-center text-[10px] text-zinc-700">collecting…</div>}
      </div>
      {settlement && (
        <div className="mt-2 grid grid-cols-2 gap-1.5 text-[11px] lg:grid-cols-4">
          <div className="rounded border border-zinc-800 bg-zinc-900 p-1.5"><div className="text-zinc-600">Structures</div><div className="font-mono text-zinc-200">{settlement.structures.length}</div></div>
          <div className="rounded border border-zinc-800 bg-zinc-900 p-1.5"><div className="text-zinc-600">Households</div><div className="font-mono text-zinc-200">{settlement.householdCount}</div></div>
          <div className="rounded border border-zinc-800 bg-zinc-900 p-1.5"><div className="text-zinc-600">Population</div><div className="font-mono text-zinc-200">{settlement.population}</div></div>
          <div className="rounded border border-zinc-800 bg-zinc-900 p-1.5"><div className="text-zinc-600">Seed</div><div className="truncate font-mono text-[10px] text-zinc-200">{settlement.seed}</div></div>
        </div>
      )}
    </div>
  );
}

// ---- Conformance ----
interface SuiteResult { name: string; expected: number; passed: number; failed: number; total: number; ok: boolean; durationMs: number; tail: string }
interface RunResult { ok: boolean; totalPassed: number; totalFailed: number; totalDuration: number; suites: SuiteResult[] }
function ConformanceTab() {
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<RunResult | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const run = async () => {
    setRunning(true);
    try {
      const res = await fetch('/api/engine/run-tests', { method: 'POST' });
      const json = await res.json();
      setResult(json);
    } catch { /* ignore */ } finally { setRunning(false); }
  };
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b border-zinc-900 px-2 py-1">
        <Button size="sm" onClick={run} disabled={running} className="h-6 gap-1 bg-emerald-600 text-[11px] hover:bg-emerald-500">
          {running ? <Loader2 className="h-3 w-3 animate-spin" /> : <Play className="h-3 w-3" />}Run All Suites
        </Button>
        {result && (
          <div className="flex items-center gap-2 text-[11px]">
            {result.totalFailed === 0 ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> : <XCircle className="h-3.5 w-3.5 text-rose-400" />}
            <span className="text-zinc-300">{result.totalPassed} passed</span>
            <span className="text-rose-400">{result.totalFailed} failed</span>
            <span className="text-zinc-600">· {(result.totalDuration / 1000).toFixed(2)}s</span>
          </div>
        )}
        <span className="ml-auto text-[10px] text-zinc-600">{CONFORMANCE_FILES.length} suites · {TOTAL_TESTS} expected</span>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-zinc-700">
        {result ? result.suites.map((su) => {
          const isOpen = expanded === su.name;
          return (
            <div key={su.name} className="border-b border-zinc-900">
              <button onClick={() => setExpanded(isOpen ? null : su.name)} className="flex w-full items-center gap-1.5 px-2 py-1 text-left hover:bg-zinc-900/50">
                {isOpen ? <ChevronDown className="h-3 w-3 text-zinc-600" /> : <ChevronRight className="h-3 w-3 text-zinc-600" />}
                <span className={su.ok ? 'text-emerald-400' : 'text-rose-400'}>●</span>
                <span className="flex-1 text-[11px] text-zinc-300">{su.name}</span>
                <span className="font-mono text-[10px] text-zinc-400">{su.passed}/{su.total}</span>
                <span className="font-mono text-[10px] text-zinc-600">{su.durationMs}ms</span>
              </button>
              {isOpen && su.tail && <pre className="max-h-32 overflow-y-auto bg-zinc-950 px-3 py-1 font-mono text-[10px] text-zinc-500">{su.tail}</pre>}
            </div>
          );
        }) : <div className="py-4 text-center text-[11px] text-zinc-700">Click "Run All Suites" to verify engine conformance.</div>}
      </div>
    </div>
  );
}

// ---- Engine ----
function EngineTab() {
  const done = PHASES.filter((p) => p.status === 'done');
  const pending = PHASES.filter((p) => p.status === 'pending');
  const byCat = PLUGINS.reduce<Record<string, number>>((a, p) => { a[p.category] = (a[p.category] ?? 0) + 1; return a; }, {});
  return (
    <div className="h-full overflow-y-auto p-2 text-[11px] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-zinc-700">
      <div className="grid grid-cols-2 gap-1.5 lg:grid-cols-4">
        <div className="rounded border border-zinc-800 bg-zinc-900 p-2"><div className="font-mono text-lg text-emerald-400">{TOTAL_TESTS}</div><div className="text-[10px] uppercase text-zinc-600">Total Tests</div></div>
        <div className="rounded border border-zinc-800 bg-zinc-900 p-2"><div className="font-mono text-lg text-cyan-400">{PLUGINS.length}</div><div className="text-[10px] uppercase text-zinc-600">Plugins</div></div>
        <div className="rounded border border-zinc-800 bg-zinc-900 p-2"><div className="font-mono text-lg text-amber-400">{done.length}</div><div className="text-[10px] uppercase text-zinc-600">Phases Done</div></div>
        <div className="rounded border border-zinc-800 bg-zinc-900 p-2"><div className="font-mono text-lg text-rose-400">{pending.length}</div><div className="text-[10px] uppercase text-zinc-600">Phases Pending</div></div>
      </div>
      <div className="mt-2 rounded border border-zinc-800 bg-zinc-900 p-2">
        <div className="mb-1 text-[10px] uppercase tracking-wide text-zinc-600">Phases</div>
        <div className="space-y-0.5">
          {PHASES.map((p) => (
            <div key={p.id} className="flex items-center gap-2">
              <span className={p.status === 'done' ? 'text-emerald-400' : 'text-zinc-600'}>●</span>
              <span className="w-6 text-zinc-600">P{p.id}</span>
              <span className="flex-1 text-zinc-300">{p.name}</span>
              {p.testCount > 0 && <span className="font-mono text-[10px] text-zinc-500">{p.testCount}</span>}
            </div>
          ))}
        </div>
      </div>
      <div className="mt-2 flex flex-wrap gap-1">
        {Object.entries(byCat).map(([cat, n]) => <Badge key={cat} variant="secondary" className="bg-zinc-800 text-[10px] text-zinc-400">{cat}: {n}</Badge>)}
      </div>
      <div className="mt-2 rounded border border-zinc-800 bg-zinc-900 p-2">
        <div className="mb-1 text-[10px] uppercase tracking-wide text-zinc-600">Safety Rails ({SAFETY_RAILS.length})</div>
        <div className="max-h-24 space-y-0.5 overflow-y-auto">
          {SAFETY_RAILS.map((r, i) => <div key={i} className="text-[10px] text-zinc-500">· {r}</div>)}
        </div>
      </div>
    </div>
  );
}
