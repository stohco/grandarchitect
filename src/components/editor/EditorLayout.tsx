'use client';

/**
 * EditorLayout — the top-level layout for the Live Architect Studio.
 *
 * Structure:
 *   ┌──────────────────────────────────────────────────────────────┐
 *   │ EditorToolbar (top bar)                                       │
 *   ├──────────┬───────────────────────────────────┬───────────────┤
 *   │ Outliner │  Viewport3D + ViewportOverlay      │  Inspector    │
 *   │  (18%)   │  + ArchitectPresence (floating)    │   (24%)       │
 *   │          │                                    │               │
 *   │          ├────────────────────────────────────┤               │
 *   │          │  BottomDock (Console/Architect/    │               │
 *   │          │   Assets/Simulation/History)        │               │
 *   └──────────┴────────────────────────────────────┴───────────────┘
 *
 * The three columns are resizable via shadcn ResizablePanelGroup. The
 * bottom dock is a horizontal Tabs inside the centre panel. All panels are
 * toggleable from the toolbar.
 *
 * On first mount we kick off world generation with the default seed so the
 * user sees a settlement immediately, and we load the capabilities list.
 */

import { useEffect } from 'react';
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from '@/components/ui/resizable';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useEditorStore } from '@/lib/editor/store';
import EditorToolbar from '@/components/editor/toolbar/EditorToolbar';
import Viewport3D from '@/components/editor/viewport/Viewport3D';
import ViewportOverlay from '@/components/editor/viewport/ViewportOverlay';
import OutlinerPanel from '@/components/editor/panels/OutlinerPanel';
import InspectorPanel from '@/components/editor/panels/InspectorPanel';
import ConsolePanel from '@/components/editor/panels/ConsolePanel';
import ArchitectPanel from '@/components/editor/panels/ArchitectPanel';
import AssetBrowserPanel from '@/components/editor/panels/AssetBrowserPanel';
import SimulationPanel from '@/components/editor/panels/SimulationPanel';
import HistoryPanel from '@/components/editor/panels/HistoryPanel';
import ConformancePanel from '@/components/editor/panels/ConformancePanel';
import CapabilitiesPanel from '@/components/editor/panels/CapabilitiesPanel';
import EnginePanel from '@/components/editor/panels/EnginePanel';
import ReasoningPanel from '@/components/editor/panels/ReasoningPanel';
import ConstraintsPanel from '@/components/editor/panels/ConstraintsPanel';
import ComplexityPanel from '@/components/editor/panels/ComplexityPanel';
import BenchmarksPanel from '@/components/editor/panels/BenchmarksPanel';
import ArchitectPresence from '@/components/editor/ArchitectPresence';
import {
  Terminal,
  Sparkles,
  Package,
  Cpu,
  History,
  FlaskConical,
  Puzzle,
  Cog,
  Brain,
  Sigma,
  Activity,
  Gauge,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

type BottomTabId =
  | 'console'
  | 'architect'
  | 'assets'
  | 'simulation'
  | 'history'
  | 'conformance'
  | 'capabilities'
  | 'engine'
  | 'reasoning'
  | 'constraints'
  | 'complexity'
  | 'benchmarks';

interface BottomTab {
  id: BottomTabId;
  label: string;
  icon: typeof Terminal;
  dense?: boolean;
}

const BOTTOM_TABS: BottomTab[] = [
  { id: 'console', label: 'Console', icon: Terminal },
  { id: 'architect', label: 'Architect', icon: Sparkles },
  { id: 'assets', label: 'Assets', icon: Package },
  { id: 'simulation', label: 'Simulation', icon: Cpu },
  { id: 'history', label: 'History', icon: History },
  { id: 'conformance', label: 'Conformance', icon: FlaskConical, dense: true },
  { id: 'capabilities', label: 'Capabilities', icon: Puzzle, dense: true },
  { id: 'engine', label: 'Engine', icon: Cog, dense: true },
  { id: 'reasoning', label: 'Reasoning', icon: Brain, dense: true },
  { id: 'constraints', label: 'Constraints', icon: Sigma, dense: true },
  { id: 'complexity', label: 'Complexity', icon: Activity, dense: true },
  { id: 'benchmarks', label: 'Benchmarks', icon: Gauge, dense: true },
];

export default function EditorLayout() {
  const showOutliner = useEditorStore((s) => s.showOutliner);
  const showInspector = useEditorStore((s) => s.showInspector);
  const showBottomDock = useEditorStore((s) => s.showBottomDock);
  const activeBottomTab = useEditorStore((s) => s.activeBottomTab);
  const setActiveBottomTab = useEditorStore((s) => s.setActiveBottomTab);
  const toggleBottomDock = useEditorStore((s) => s.toggleBottomDock);

  const settlement = useEditorStore((s) => s.settlement);
  const generateWorld = useEditorStore((s) => s.generateWorld);
  const loadCapabilities = useEditorStore((s) => s.loadCapabilities);

  // First-mount: generate the default world + load capabilities.
  useEffect(() => {
    if (!settlement) void generateWorld();
    void loadCapabilities();
  }, [settlement, generateWorld, loadCapabilities]);

  return (
    <div className="flex h-screen w-full flex-col overflow-hidden bg-[#1a1a2e] text-[#c8c8e0]">
      <EditorToolbar />

      <div className="relative flex-1 overflow-hidden">
        <ResizablePanelGroup direction="horizontal" className="h-full">
          {/* Left: Outliner */}
          {showOutliner ? (
            <>
              <ResizablePanel defaultSize={18} minSize={12} maxSize={28} className="bg-[#12122a]">
                <OutlinerPanel />
              </ResizablePanel>
              <ResizableHandle withHandle className="bg-[#2a2a4a]" />
            </>
          ) : null}

          {/* Centre: Viewport + bottom dock */}
          <ResizablePanel defaultSize={showOutliner ? (showInspector ? 58 : 82) : (showInspector ? 76 : 100)} minSize={30}>
            <div className="flex h-full flex-col">
              {/* Viewport */}
              <div className="relative flex-1 overflow-hidden bg-[#0e0e24]">
                <Viewport3D />
                <ViewportOverlay />
                <ArchitectPresence />
              </div>

              {/* Bottom dock */}
              {showBottomDock ? (
                <div
                  className={`flex shrink-0 flex-col border-t border-[#2a2a4a] bg-[#0e0e24] ${
                    BOTTOM_TABS.find((t) => t.id === activeBottomTab)?.dense
                      ? 'h-56'
                      : 'h-48'
                  }`}
                >
                  <Tabs
                    value={activeBottomTab}
                    onValueChange={(v) => setActiveBottomTab(v as typeof activeBottomTab)}
                    className="flex h-full flex-col gap-0"
                  >
                    <div className="flex items-center justify-between border-b border-[#2a2a4a] bg-[#12122a] px-1.5">
                      <TabsList className="h-9 min-w-0 flex-1 justify-start overflow-x-auto rounded-none bg-transparent p-0">
                        {BOTTOM_TABS.map((t) => {
                          const Icon = t.icon;
                          return (
                            <TabsTrigger
                              key={t.id}
                              value={t.id}
                              className="h-9 shrink-0 gap-1.5 rounded-none border-b-2 border-transparent px-3 text-xs text-[#8888aa] data-[state=active]:border-emerald-500 data-[state=active]:bg-transparent data-[state=active]:text-emerald-300 data-[state=active]:shadow-none"
                            >
                              <Icon className="h-3.5 w-3.5" />
                              {t.label}
                            </TabsTrigger>
                          );
                        })}
                      </TabsList>
                      <button
                        onClick={toggleBottomDock}
                        title="Collapse dock"
                        className="mr-1 rounded p-1.5 text-[#5a5a7a] hover:bg-[#1d1d36] hover:text-[#c8c8e0]"
                      >
                        <ChevronDown className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="flex-1 overflow-hidden">
                      <TabsContent value="console" className="mt-0 h-full">
                        <ConsolePanel />
                      </TabsContent>
                      <TabsContent value="architect" className="mt-0 h-full">
                        <ArchitectPanel />
                      </TabsContent>
                      <TabsContent value="assets" className="mt-0 h-full">
                        <AssetBrowserPanel />
                      </TabsContent>
                      <TabsContent value="simulation" className="mt-0 h-full">
                        <SimulationPanel />
                      </TabsContent>
                      <TabsContent value="history" className="mt-0 h-full">
                        <HistoryPanel />
                      </TabsContent>
                      <TabsContent value="conformance" className="mt-0 h-full">
                        <ConformancePanel />
                      </TabsContent>
                      <TabsContent value="capabilities" className="mt-0 h-full">
                        <CapabilitiesPanel />
                      </TabsContent>
                      <TabsContent value="engine" className="mt-0 h-full">
                        <EnginePanel />
                      </TabsContent>
                      <TabsContent value="reasoning" className="mt-0 h-full">
                        <ReasoningPanel />
                      </TabsContent>
                      <TabsContent value="constraints" className="mt-0 h-full">
                        <ConstraintsPanel />
                      </TabsContent>
                      <TabsContent value="complexity" className="mt-0 h-full">
                        <ComplexityPanel />
                      </TabsContent>
                      <TabsContent value="benchmarks" className="mt-0 h-full">
                        <BenchmarksPanel />
                      </TabsContent>
                    </div>
                  </Tabs>
                </div>
              ) : (
                <button
                  onClick={toggleBottomDock}
                  className="flex h-6 shrink-0 items-center justify-center gap-1.5 border-t border-[#2a2a4a] bg-[#12122a] text-[10px] uppercase tracking-wider text-[#5a5a7a] hover:text-[#c8c8e0]"
                >
                  <ChevronUp className="h-3 w-3" />
                  Show bottom dock
                </button>
              )}
            </div>
          </ResizablePanel>

          {/* Right: Inspector */}
          {showInspector ? (
            <>
              <ResizableHandle withHandle className="bg-[#2a2a4a]" />
              <ResizablePanel defaultSize={24} minSize={14} maxSize={40} className="bg-[#12122a]">
                <InspectorPanel />
              </ResizablePanel>
            </>
          ) : null}
        </ResizablePanelGroup>
      </div>

      {/* Status bar */}
      <StatusBar />
    </div>
  );
}

function StatusBar() {
  const settlement = useEditorStore((s) => s.settlement);
  const worldState = useEditorStore((s) => s.worldState);
  const frozenTick = useEditorStore((s) => s.frozenTick);
  const perf = useEditorStore((s) => s.perf);
  const currentBranchId = useEditorStore((s) => s.currentBranchId);
  const selectedCount = useEditorStore((s) => s.selectedEntityIds.length);
  const caps = useEditorStore((s) => s.capabilities.length);

  return (
    <div className="flex h-6 shrink-0 items-center justify-between border-t border-[#2a2a4a] bg-[#12122a] px-3 text-[10px] text-[#5a5a7a]">
      <div className="flex items-center gap-3">
        <span className="text-[#8888aa]">{settlement ? settlement.name : 'No world'}</span>
        {settlement && <span>·</span>}
        {settlement && <span>{settlement.structures.length} structures</span>}
        <span>·</span>
        <span>tick {frozenTick}</span>
        <span>·</span>
        <span>{worldState}</span>
        <span>·</span>
        <span>branch …{currentBranchId.slice(-6)}</span>
      </div>
      <div className="flex items-center gap-3">
        <span>{selectedCount} selected</span>
        <span>·</span>
        <span>{caps} capabilities</span>
        <span>·</span>
        <span className={perf.fps >= 50 ? 'text-emerald-400' : perf.fps >= 30 ? 'text-amber-400' : 'text-rose-400'}>
          {perf.fps} fps
        </span>
      </div>
    </div>
  );
}
