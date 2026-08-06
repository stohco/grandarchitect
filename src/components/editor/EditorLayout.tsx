/**
 * Live Architect Studio — Editor Layout Shell
 *
 * Three-column resizable layout: Outliner (left) | Viewport + Bottom Dock (center) | Inspector (right).
 * Bottom dock has 5 tabs: Console, Architect, Assets, Simulation, History.
 * A viewport overlay shows FPS, draw calls, entity count, and world state.
 * Panels are toggleable via the editor store.
 */

'use client';

import dynamic from 'next/dynamic';
import { useEffect, useMemo, useState } from 'react';
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from '@/components/ui/resizable';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
  ChevronUp,
  ChevronDown,
  Monitor,
  ShieldAlert,
  ListTree,
  Settings2,
  Cpu,
  MemoryStick,
  Move,
  RotateCcw,
  Maximize2,
  Activity,
  Sparkles,
  FlaskConical,
} from 'lucide-react';
import { useEditorStore } from '@/lib/editor/store';
import type { WorldExecutionState, TransformMode } from '@/lib/editor/types';
import {
  installCrashObservatory,
  getCrashCount,
  subscribeToCrashes,
} from '@/lib/editor/crash-observatory';

import OutlinerPanel from '@/components/editor/panels/OutlinerPanel';
import InspectorPanel from '@/components/editor/panels/InspectorPanel';
import ConsolePanel from '@/components/editor/panels/ConsolePanel';
import ArchitectPanel from '@/components/editor/panels/ArchitectPanel';
import AssetBrowserPanel from '@/components/editor/panels/AssetBrowserPanel';
import SimulationPanel from '@/components/editor/panels/SimulationPanel';
import ReasoningPanel from '@/components/editor/panels/ReasoningPanel';
import ConstraintsPanel from '@/components/editor/panels/ConstraintsPanel';
import ComplexityPanel from '@/components/editor/panels/ComplexityPanel';
import BenchmarksPanel from '@/components/editor/panels/BenchmarksPanel';
import FrontierPanel from '@/components/editor/panels/FrontierPanel';
import AssetForgePanel from '@/components/editor/panels/AssetForgePanel';
import WorkspaceAgentPanel from '@/components/editor/panels/WorkspaceAgentPanel';
import ProductionPanel from '@/components/editor/panels/ProductionPanel';
import StudioPanel from '@/components/editor/panels/StudioPanel';
import JobCenterPanel from '@/components/editor/panels/JobCenterPanel';
import AuthorialVerticalSlicePanel from '@/components/editor/panels/AuthorialVerticalSlicePanel';
import FrontierMatrixPanel from '@/components/editor/panels/FrontierMatrixPanel';
import ConformancePanel from '@/components/editor/panels/ConformancePanel';
import CapabilitiesPanel from '@/components/editor/panels/CapabilitiesPanel';
import EnginePanel from '@/components/editor/panels/EnginePanel';
import CrashObservatoryPanel from '@/components/editor/panels/CrashObservatoryPanel';
import ArchitectPresence from '@/components/editor/ArchitectPresence';
import EditorToolbar from '@/components/editor/toolbar/EditorToolbar';
import WorldGenBar from '@/components/editor/toolbar/WorldGenBar';

const Viewport3D = dynamic(() => import('@/components/editor/viewport/Viewport3D'), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-[#1a1a2e]">
      <div className="flex flex-col items-center gap-2 text-[#5a5a8a]">
        <Monitor className="h-6 w-6 animate-pulse" />
        <span className="font-mono text-xs">Loading viewport…</span>
      </div>
    </div>
  ),
});

// ---------------------------------------------------------------------------
// Viewport Overlay — FPS / draw calls / entity count / world state
// ---------------------------------------------------------------------------

function ViewportOverlay() {
  const perf = useEditorStore((s) => s.perf);
  const settlement = useEditorStore((s) => s.settlement);
  const worldState = useEditorStore((s) => s.worldState);
  const frozenTick = useEditorStore((s) => s.frozenTick);
  const showStats = useEditorStore((s) => s.showStats);

  if (!showStats) return null;

  const entityCount = settlement?.structures.length ?? 0;

  return (
    <div className="pointer-events-none absolute left-2 top-2 z-10 flex flex-col gap-0.5 font-mono text-[10px] leading-tight text-white/70">
      <span>{perf.fps} FPS</span>
      <span>{perf.drawCalls} draws</span>
      <span>{perf.triangles} tris</span>
      <span>{entityCount} entities</span>
      <span>{formatWorldState(worldState)}</span>
      <span>tick {frozenTick}</span>
    </div>
  );
}

function formatWorldState(s: WorldExecutionState): string {
  return s.split('_').map((w) => w[0].toUpperCase() + w.slice(1)).join(' ');
}

// ---------------------------------------------------------------------------
// Status Bar — sticky footer with crash indicator, transform mode, memory
// ---------------------------------------------------------------------------

interface PerformanceMemory {
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
}
interface WindowWithMemory extends Window {
  performance?: Performance & { memory?: PerformanceMemory };
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

const TRANSFORM_ICON: Record<TransformMode, React.ComponentType<{ className?: string }>> = {
  translate: Move,
  rotate: RotateCcw,
  scale: Maximize2,
};

function StatusBar() {
  const transformMode = useEditorStore((s) => s.transformMode);
  const worldState = useEditorStore((s) => s.worldState);
  const editorMode = useEditorStore((s) => s.editorMode);
  const frozenTick = useEditorStore((s) => s.frozenTick);
  const perf = useEditorStore((s) => s.perf);
  const showBottomDock = useEditorStore((s) => s.showBottomDock);
  const toggleBottomDock = useEditorStore((s) => s.toggleBottomDock);
  const setActiveBottomTab = useEditorStore((s) => s.setActiveBottomTab);

  // Install the crash observatory once for the whole editor shell, then
  // subscribe to live crash counts. Initial count is read via the lazy
  // useState initializer so we don't trigger a synchronous setState-in-effect.
  const [crashCount, setCrashCount] = useState<number>(() => {
    try {
      return getCrashCount();
    } catch {
      return 0;
    }
  });
  const [memBytes, setMemBytes] = useState<number | null>(null);
  const [buildInfo, setBuildInfo] = useState<{
    commitShort: string | null;
    branch: string | null;
    dirty: boolean;
    packageVersion: string;
  } | null>(null);

  // Fetch build provenance once on mount so the status bar can display
  // exactly which commit produced this preview.
  useEffect(() => {
    let cancelled = false;
    fetch('/api/build-info')
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled) setBuildInfo(data);
      })
      .catch(() => {
        // ignore — build info is best-effort
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Install the Crash Observatory on first mount.
  useEffect(() => {
    const uninstall = installCrashObservatory();
    const sync = () => setCrashCount(getCrashCount());
    Promise.resolve().then(sync);
    const unsub = subscribeToCrashes(sync);
    return () => {
      unsub();
      uninstall();
    };
  }, []);

  // Poll memory usage every 2 seconds. performance.memory is Chrome-only;
  // on other browsers we just don't show the value.
  useEffect(() => {
    let cancelled = false;
    const read = () => {
      if (cancelled) return;
      try {
        const w = window as WindowWithMemory;
        const m = w.performance?.memory;
        if (m && typeof m.usedJSHeapSize === 'number') {
          setMemBytes(m.usedJSHeapSize);
        }
      } catch {
        // ignore — performance.memory may be unavailable
      }
    };
    read();
    const t = setInterval(read, 2000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, []);

  const openCrashObservatory = () => {
    if (!showBottomDock) toggleBottomDock();
    setActiveBottomTab('crashes');
  };

  const TransformIcon = TRANSFORM_ICON[transformMode];

  return (
    <footer
      role="contentinfo"
      aria-label="Editor status bar"
      className="flex h-6 shrink-0 items-center gap-3 border-t border-[#2a2a4a] bg-[#0e0e24] px-3 font-mono text-[10px] text-[#8888aa]"
    >
      {/* Editor mode */}
      <span className="flex items-center gap-1">
        <Cpu className="h-3 w-3 text-emerald-400" />
        <span className="capitalize">{editorMode.replace('_', ' ')}</span>
      </span>

      <span aria-hidden className="h-3 w-px bg-[#2a2a4a]" />

      {/* Transform mode */}
      <span className="flex items-center gap-1" title="Active transform mode">
        <TransformIcon className="h-3 w-3 text-emerald-400" />
        <span className="capitalize">{transformMode}</span>
      </span>

      <span aria-hidden className="h-3 w-px bg-[#2a2a4a]" />

      {/* World state */}
      <span className="flex items-center gap-1" title="World execution state">
        <Activity className="h-3 w-3 text-amber-400" />
        <span>{formatWorldState(worldState)}</span>
      </span>

      <span aria-hidden className="h-3 w-px bg-[#2a2a4a]" />

      {/* Tick */}
      <span title="Frozen simulation tick">tick {frozenTick}</span>

      <div className="flex-1" />

      {/* FPS (from viewport perf) */}
      <span title="Frames per second">{perf.fps} FPS</span>

      {/* Memory usage (Chrome only) */}
      {memBytes != null && (
        <>
          <span aria-hidden className="h-3 w-px bg-[#2a2a4a]" />
          <span className="flex items-center gap-1" title="JS heap usage (Chrome only)">
            <MemoryStick className="h-3 w-3 text-[#5a5a7a]" />
            {formatBytes(memBytes)}
          </span>
        </>
      )}

      {/* Crash indicator */}
      <button
        type="button"
        onClick={openCrashObservatory}
        className={`flex items-center gap-1 rounded px-1.5 py-0.5 transition-colors ${
          crashCount > 0
            ? 'bg-red-500/15 text-red-300 hover:bg-red-500/25'
            : 'text-[#5a5a7a] hover:bg-[#1e1e3e] hover:text-[#aaaacc]'
        }`}
        aria-label={
          crashCount > 0
            ? `${crashCount} crashes recorded — open Crash Observatory`
            : 'No crashes recorded — open Crash Observatory'
        }
        title={
          crashCount > 0
            ? `${crashCount} crashes — open Crash Observatory`
            : 'Open Crash Observatory'
        }
      >
        <span
          aria-hidden
          className={`h-1.5 w-1.5 rounded-full ${
            crashCount > 0 ? 'bg-red-400 animate-pulse' : 'bg-emerald-400'
          }`}
        />
        <ShieldAlert className="h-3 w-3" />
        {crashCount > 0 && <span>{crashCount}</span>}
      </button>

      {/* Build provenance — commit SHA, branch, dirty status */}
      {buildInfo && (
        <span
          className="ml-auto flex items-center gap-1.5 text-[#5a5a7a]"
          title={`Commit: ${buildInfo.commitShort ?? '?'}\nBranch: ${buildInfo.branch ?? '?'}\nDirty: ${buildInfo.dirty}\nVersion: ${buildInfo.packageVersion}`}
        >
          {buildInfo.dirty && (
            <span className="text-amber-500" title="Working tree has uncommitted changes">●</span>
          )}
          <span className="text-[#5a5a7a]">{buildInfo.branch ?? '?'}</span>
          <span className="text-[#3a3a5a]">·</span>
          <span className="font-mono text-[#5a5a7a]">{buildInfo.commitShort ?? '?'}</span>
        </span>
      )}
    </footer>
  );
}

// ---------------------------------------------------------------------------
// Bottom Dock
// ---------------------------------------------------------------------------

type BottomTab = {
  value: string;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
};

const BOTTOM_TABS: readonly BottomTab[] = [
  { value: 'console', label: 'Console' },
  { value: 'architect', label: 'Architect' },
  { value: 'assets', label: 'Assets' },
  { value: 'simulation', label: 'Simulation' },
  { value: 'history', label: 'History' },
  { value: 'conformance', label: 'Conformance' },
  { value: 'capabilities', label: 'Capabilities' },
  { value: 'engine', label: 'Engine' },
  { value: 'reasoning', label: 'Reasoning' },
  { value: 'constraints', label: 'Constraints' },
  { value: 'complexity', label: 'Complexity' },
  { value: 'benchmarks', label: 'Benchmarks' },
  { value: 'frontier', label: 'Frontier' },
  { value: 'forge', label: 'Forge' },
  { value: 'workspace', label: 'Workspace' },
  { value: 'production', label: 'Production' },
  { value: 'studio', label: 'Studio' },
  { value: 'authorial', label: 'Authorial', icon: Sparkles },
  { value: 'frontier-matrix', label: 'Matrix', icon: FlaskConical },
  { value: 'jobs', label: 'Jobs' },
  { value: 'crashes', label: 'Crashes', icon: ShieldAlert },
];

/** Tabs that benefit from a slightly taller dock (dense content panels). */
const TALL_TABS = new Set([
  'reasoning',
  'constraints',
  'complexity',
  'benchmarks',
  'conformance',
  'capabilities',
  'engine',
  'crashes',
  'frontier',
  'forge',
  'workspace',
  'production',
  'studio',
  'authorial',
  'frontier-matrix',
  'jobs',
]);

function HistoryPanel() {
  const transactions = useEditorStore((s) => s.transactions);
  const branches = useEditorStore((s) => s.branches);
  const currentBranchId = useEditorStore((s) => s.currentBranchId);

  return (
    <div className="h-full p-3">
      <div className="mb-3 flex items-center gap-2 text-xs font-medium text-[#8888aa]">
        <span>Branches</span>
        <span className="rounded bg-[#2a2a4a] px-1.5 py-0.5 text-[10px]">{branches.length}</span>
      </div>
      <div className="mb-4 max-h-32 space-y-1 overflow-y-auto">
        {branches.map((b) => (
          <div key={b.branchId} className={`flex items-center gap-2 rounded px-2 py-1 text-[11px] ${b.branchId === currentBranchId ? 'bg-[#2a2a5a] text-white' : 'text-[#8888aa] hover:bg-[#1e1e3e]'}`}>
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            <span className="font-medium">{b.name}</span>
            <span className="ml-auto text-[10px] text-[#5a5a7a]">{b.transactionCount} tx</span>
          </div>
        ))}
      </div>
      <div className="mb-2 flex items-center gap-2 text-xs font-medium text-[#8888aa]">
        <span>Recent Transactions</span>
        <span className="rounded bg-[#2a2a4a] px-1.5 py-0.5 text-[10px]">{transactions.length}</span>
      </div>
      <div className="max-h-40 space-y-1 overflow-y-auto">
        {transactions.slice(0, 50).map((tx) => (
          <div key={tx.transactionId} className={`rounded px-2 py-1.5 text-[11px] ${tx.undone ? 'opacity-40' : ''}`}>
            <div className="flex items-center gap-1.5 text-[#8888aa]">
              <span className={`h-1.5 w-1.5 rounded-full ${tx.requestedBy === 'user' ? 'bg-blue-400' : 'bg-purple-400'}`} />
              <span className="font-medium text-[#aaaacc]">{tx.originalRequest}</span>
            </div>
            <div className="mt-0.5 ml-3.5 text-[10px] text-[#5a5a7a]">{tx.toolsUsed.join(', ')}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function BottomDock() {
  const activeTab = useEditorStore((s) => s.activeBottomTab);
  const setActiveTab = useEditorStore((s) => s.setActiveBottomTab);
  const toggleBottomDock = useEditorStore((s) => s.toggleBottomDock);

  return (
    <div className="flex flex-col border-t border-[#2a2a4a] bg-[#0e0e24]">
      <div className="flex items-center border-b border-[#2a2a4a]">
        <div
          style={{ overflowX: 'auto', overflowY: 'hidden', minWidth: 0, flex: 1, scrollbarWidth: 'thin' }}
          className="bottom-tab-scroller"
        >
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-max min-w-full">
            <TabsList className="h-7 w-max min-w-full justify-start gap-0 rounded-none border-0 bg-transparent p-0">
              {BOTTOM_TABS.map((t) => {
                const Icon = t.icon;
                return (
                  <TabsTrigger key={t.value} value={t.value} className="h-7 w-auto shrink-0 rounded-none border-b-2 border-transparent px-3 text-[11px] font-medium uppercase tracking-wider text-[#5a5a7a] data-[state=active]:border-emerald-500 data-[state=active]:bg-transparent data-[state=active]:text-emerald-300 data-[state=active]:shadow-none hover:text-[#8888aa]">
                    {Icon && <Icon className="mr-1 h-3 w-3" />}
                    {t.label}
                  </TabsTrigger>
                );
              })}
            </TabsList>
          </Tabs>
        </div>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="mr-1 h-6 w-6 shrink-0 text-[#5a5a7a] hover:text-white" onClick={toggleBottomDock}>
              <ChevronDown className="h-3.5 w-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top" className="text-xs">Hide bottom dock</TooltipContent>
        </Tooltip>
      </div>
      <div
        className={`min-h-0 overflow-hidden transition-[height] duration-150 ${
          TALL_TABS.has(activeTab) ? 'h-56' : 'h-48'
        }`}
      >
        {activeTab === 'console' && <ConsolePanel />}
        {activeTab === 'architect' && <ArchitectPanel />}
        {activeTab === 'assets' && <AssetBrowserPanel />}
        {activeTab === 'simulation' && <SimulationPanel />}
        {activeTab === 'history' && <HistoryPanel />}
        {activeTab === 'conformance' && <ConformancePanel />}
        {activeTab === 'capabilities' && <CapabilitiesPanel />}
        {activeTab === 'engine' && <EnginePanel />}
        {activeTab === 'reasoning' && <ReasoningPanel />}
        {activeTab === 'constraints' && <ConstraintsPanel />}
        {activeTab === 'complexity' && <ComplexityPanel />}
        {activeTab === 'benchmarks' && <BenchmarksPanel />}
        {activeTab === 'frontier' && <FrontierPanel />}
        {activeTab === 'forge' && <AssetForgePanel />}
        {activeTab === 'workspace' && <WorkspaceAgentPanel />}
        {activeTab === 'production' && <ProductionPanel />}
        {activeTab === 'studio' && <StudioPanel />}
        {activeTab === 'authorial' && <AuthorialVerticalSlicePanel />}
        {activeTab === 'frontier-matrix' && <FrontierMatrixPanel />}
        {activeTab === 'jobs' && <JobCenterPanel />}
        {activeTab === 'crashes' && <CrashObservatoryPanel />}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Editor Layout
// ---------------------------------------------------------------------------

export default function EditorLayout() {
  const showOutliner = useEditorStore((s) => s.showOutliner);
  const showInspector = useEditorStore((s) => s.showInspector);
  const showBottomDock = useEditorStore((s) => s.showBottomDock);
  const toggleOutliner = useEditorStore((s) => s.toggleOutliner);
  const toggleInspector = useEditorStore((s) => s.toggleInspector);
  const toggleBottomDock = useEditorStore((s) => s.toggleBottomDock);

  // Auto-generate the default world on first mount so the user sees a
  // settlement immediately without having to click Generate.
  const settlement = useEditorStore((s) => s.settlement);
  const generateWorld = useEditorStore((s) => s.generateWorld);
  const seedInput = useEditorStore((s) => s.seedInput);
  useEffect(() => {
    if (!settlement && seedInput) {
      void generateWorld(seedInput);
    }
  }, [settlement, generateWorld, seedInput]);

  const centerSize = useMemo(() => {
    if (showOutliner && showInspector) return 58;
    if (showOutliner) return 78;
    if (showInspector) return 76;
    return 100;
  }, [showOutliner, showInspector]);

  return (
    <div className="flex h-screen min-h-0 flex-col overflow-hidden bg-[#1a1a2e] text-[#c8c8e0]">
      <EditorToolbar />
      <WorldGenBar />
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="min-h-0 flex-1">
          <ResizablePanelGroup direction="horizontal" className="h-full">
            {showOutliner && (<>
              <ResizablePanel defaultSize={18} minSize={12} maxSize={30} className="min-w-[200px]">
                <div className="flex h-full flex-col border-r border-[#2a2a4a] bg-[#12122a]">
                  <div className="flex h-8 items-center gap-2 border-b border-[#2a2a4a] px-3">
                    <ListTree className="h-3.5 w-3.5 text-emerald-400" />
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-[#8888aa]">Hierarchy</span>
                    <div className="flex-1" />
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-5 w-5 text-[#5a5a7a] hover:text-white" onClick={toggleOutliner}><PanelLeftClose className="h-3 w-3" /></Button>
                      </TooltipTrigger>
                      <TooltipContent side="right" className="text-xs">Hide outliner (Ctrl+1)</TooltipContent>
                    </Tooltip>
                  </div>
                  <div className="min-h-0 flex-1"><OutlinerPanel /></div>
                </div>
              </ResizablePanel>
              <ResizableHandle withHandle className="bg-[#2a2a4a]" />
            </>)}

            <ResizablePanel defaultSize={centerSize} minSize={30}>
              <div className="flex h-full flex-col">
                <div className="relative min-h-0 flex-1">
                  <Viewport3D />
                  <ViewportOverlay />
                  <ArchitectPresence />
                  {!showOutliner && (
                    <div className="absolute left-2 top-2 z-20">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7 rounded bg-[#1a1a3e]/80 text-[#8888aa] backdrop-blur-sm hover:text-white" onClick={toggleOutliner}><PanelLeftOpen className="h-3.5 w-3.5" /></Button>
                        </TooltipTrigger>
                        <TooltipContent side="right" className="text-xs">Show outliner (Ctrl+1)</TooltipContent>
                      </Tooltip>
                    </div>
                  )}
                  {!showInspector && (
                    <div className="absolute right-2 top-2 z-20">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7 rounded bg-[#1a1a3e]/80 text-[#8888aa] backdrop-blur-sm hover:text-white" onClick={toggleInspector}><PanelRightOpen className="h-3.5 w-3.5" /></Button>
                        </TooltipTrigger>
                        <TooltipContent side="left" className="text-xs">Show inspector (Ctrl+2)</TooltipContent>
                      </Tooltip>
                    </div>
                  )}
                  {!showBottomDock && (
                    <div className="absolute bottom-2 left-1/2 z-20 -translate-x-1/2">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-7 gap-1.5 rounded bg-[#1a1a3e]/80 px-3 text-[11px] text-[#8888aa] backdrop-blur-sm hover:text-white" onClick={toggleBottomDock}><ChevronUp className="h-3.5 w-3.5" />Show Dock</Button>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="text-xs">Show bottom dock</TooltipContent>
                      </Tooltip>
                    </div>
                  )}
                </div>
                {showBottomDock && <BottomDock />}
              </div>
            </ResizablePanel>

            {showInspector && (<>
              <ResizableHandle withHandle className="bg-[#2a2a4a]" />
              <ResizablePanel defaultSize={24} minSize={14} maxSize={36} className="min-w-[240px]">
                <div className="flex h-full flex-col border-l border-[#2a2a4a] bg-[#12122a]">
                  <div className="flex h-8 items-center gap-2 border-b border-[#2a2a4a] px-3">
                    <Settings2 className="h-3.5 w-3.5 text-emerald-400" />
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-[#8888aa]">Inspector</span>
                    <div className="flex-1" />
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-5 w-5 text-[#5a5a7a] hover:text-white" onClick={toggleInspector}><PanelRightClose className="h-3 w-3" /></Button>
                      </TooltipTrigger>
                      <TooltipContent side="left" className="text-xs">Hide inspector (Ctrl+2)</TooltipContent>
                    </Tooltip>
                  </div>
                  <div className="min-h-0 flex-1"><InspectorPanel /></div>
                </div>
              </ResizablePanel>
            </>)}
          </ResizablePanelGroup>
        </div>
      </div>
      <StatusBar />
    </div>
  );
}
