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
import { useMemo } from 'react';
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
} from 'lucide-react';
import { useEditorStore } from '@/lib/editor/store';
import type { WorldExecutionState } from '@/lib/editor/types';

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
// Bottom Dock
// ---------------------------------------------------------------------------

const BOTTOM_TABS = [
  { value: 'console', label: 'Console' },
  { value: 'architect', label: 'Architect' },
  { value: 'assets', label: 'Assets' },
  { value: 'simulation', label: 'Simulation' },
  { value: 'history', label: 'History' },
  { value: 'reasoning', label: 'Reasoning' },
  { value: 'constraints', label: 'Constraints' },
  { value: 'complexity', label: 'Complexity' },
  { value: 'benchmarks', label: 'Benchmarks' },
] as const;

/** Tabs that benefit from a slightly taller dock (RCVC panels render dense content). */
const TALL_TABS = new Set(['reasoning', 'constraints', 'complexity', 'benchmarks']);

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
      <div className="flex items-center justify-between border-b border-[#2a2a4a]">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="h-7 w-full justify-start gap-0 rounded-none border-0 bg-transparent p-0">
            {BOTTOM_TABS.map((t) => (
              <TabsTrigger key={t.value} value={t.value} className="h-7 rounded-none border-b-2 border-transparent px-3 text-[11px] font-medium uppercase tracking-wider text-[#5a5a7a] data-[state=active]:border-emerald-500 data-[state=active]:bg-transparent data-[state=active]:text-emerald-300 data-[state=active]:shadow-none hover:text-[#8888aa]">
                {t.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="mr-1 h-6 w-6 text-[#5a5a7a] hover:text-white" onClick={toggleBottomDock}>
              <ChevronDown className="h-3.5 w-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top" className="text-xs">Hide bottom dock</TooltipContent>
        </Tooltip>
      </div>
      <div
        className={`overflow-hidden transition-[height] duration-150 ${
          TALL_TABS.has(activeTab) ? 'h-56' : 'h-48'
        }`}
      >
        {activeTab === 'console' && <ConsolePanel />}
        {activeTab === 'architect' && <ArchitectPanel />}
        {activeTab === 'assets' && <AssetBrowserPanel />}
        {activeTab === 'simulation' && <SimulationPanel />}
        {activeTab === 'history' && <HistoryPanel />}
        {activeTab === 'reasoning' && <ReasoningPanel />}
        {activeTab === 'constraints' && <ConstraintsPanel />}
        {activeTab === 'complexity' && <ComplexityPanel />}
        {activeTab === 'benchmarks' && <BenchmarksPanel />}
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
                  <div className="flex h-8 items-center justify-between border-b border-[#2a2a4a] px-3">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-[#8888aa]">Hierarchy</span>
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
                  <div className="flex h-8 items-center justify-between border-b border-[#2a2a4a] px-3">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-[#8888aa]">Inspector</span>
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
    </div>
  );
}
