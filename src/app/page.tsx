/**
 * Live Architect Studio — Editor Shell
 *
 * The full game-engine editor layout: menu bar, toolbar, three resizable
 * columns (Outliner/World · 3D Viewport · Inspector/View), a full-width
 * bottom dock, and a status bar. Keyboard shortcuts are wired globally.
 */

'use client';

import { useEffect } from 'react';
import dynamic from 'next/dynamic';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Toaster } from '@/components/ui/sonner';
import MenuBar from '@/components/editor/menu-bar';
import EditorToolbar from '@/components/editor/toolbar';
import StatusBar from '@/components/editor/status-bar';
import Outliner from '@/components/editor/outliner';
import Inspector from '@/components/editor/inspector';
import BottomDock from '@/components/editor/bottom-dock';
import WorldPanel from '@/components/editor/world-panel';
import ViewSettings from '@/components/editor/view-settings';
import { ViewportErrorBoundary } from '@/components/editor/error-boundary';
import { useEditorStore } from '@/lib/editor/store';
import { Layers, Globe, MousePointer2, Settings2, Loader2 } from 'lucide-react';

// Three.js is heavy — load the viewport client-side only to avoid OOM during SSR.
const Viewport3D = dynamic(() => import('@/components/editor/viewport'), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-zinc-950 text-zinc-600">
      <Loader2 className="h-5 w-5 animate-spin text-emerald-500" />
      <span className="ml-2 font-mono text-xs">initialising viewport…</span>
    </div>
  ),
});

export default function Page() {
  const generateWorld = useEditorStore((s) => s.generateWorld);
  const showOutliner = useEditorStore((s) => s.showOutliner);
  const showInspector = useEditorStore((s) => s.showInspector);
  const showBottomDock = useEditorStore((s) => s.showBottomDock);

  // Auto-generate the default world on first mount.
  useEffect(() => {
    if (!useEditorStore.getState().settlement) {
      generateWorld('wang-family-bend-1108');
    }
  }, [generateWorld]);

  // Global keyboard shortcuts.
  useEffect(() => {
    function isTyping(el: EventTarget | null): boolean {
      if (!(el instanceof HTMLElement)) return false;
      const tag = el.tagName;
      return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el.isContentEditable;
    }
    function onKey(e: KeyboardEvent) {
      const s = useEditorStore.getState();
      if (isTyping(e.target)) return;
      const k = e.key.toLowerCase();
      if (e.ctrlKey || e.metaKey) {
        if (k === '1') { e.preventDefault(); s.toggleOutliner(); }
        else if (k === '2') { e.preventDefault(); s.toggleInspector(); }
        else if (k === '`' || k === '`') { e.preventDefault(); s.toggleBottomDock(); }
        else if (k === 'a') { e.preventDefault(); s.selectAll(); }
        else if (k === 'g') { e.preventDefault(); s.generateWorld(); }
        return;
      }
      switch (k) {
        case 'w': s.setTransformMode('translate'); break;
        case 'e': s.setTransformMode('rotate'); break;
        case 'r': s.setTransformMode('scale'); break;
        case 'g': s.toggleGrid(); break;
        case 'x': s.toggleGizmos(); break;
        case 'f':
          if (s.selectedEntityIds.length > 0) { e.preventDefault(); s.setCameraFocus(s.selectedEntityIds[0]); }
          break;
        case ' ':
          e.preventDefault(); s.toggleSim(); break;
        case '.':
          e.preventDefault(); s.step('physics_tick', 1); break;
        case 'escape':
          s.clearSelection(); break;
        case 'delete':
        case 'backspace':
          if (s.selectedEntityIds.length > 0) { e.preventDefault(); s.selectedEntityIds.forEach((id) => s.hideEntity(id)); }
          break;
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div className="dark flex h-screen min-h-0 flex-col overflow-hidden bg-zinc-950 text-zinc-200">
      <MenuBar />
      <EditorToolbar />

      <div className="flex min-h-0 flex-1 flex-col">
        {/* Three-column main area */}
        <div className="min-h-0 flex-1">
          <ResizablePanelGroup direction="horizontal" className="h-full">
            {/* Left column: Outliner + World */}
            {showOutliner && (
              <>
                <ResizablePanel defaultSize={18} minSize={12} maxSize={32} className="min-w-[220px]">
                  <SideTabs
                    tabs={[
                      { id: 'outliner', label: 'Outliner', icon: Layers, content: <Outliner /> },
                      { id: 'world', label: 'World', icon: Globe, content: <WorldPanel /> },
                    ]}
                    defaultTab="outliner"
                  />
                </ResizablePanel>
                <ResizableHandle withHandle />
              </>
            )}

            {/* Center column: Viewport */}
            <ResizablePanel defaultSize={showOutliner && showInspector ? 60 : showOutliner ? 82 : showInspector ? 78 : 100} minSize={30}>
              <div className="relative h-full w-full border-x border-zinc-800">
                <ViewportErrorBoundary>
                  <Viewport3D />
                </ViewportErrorBoundary>
              </div>
            </ResizablePanel>

            {/* Right column: Inspector + View */}
            {showInspector && (
              <>
                <ResizableHandle withHandle />
                <ResizablePanel defaultSize={22} minSize={14} maxSize={40} className="min-w-[240px]">
                  <SideTabs
                    tabs={[
                      { id: 'inspector', label: 'Inspector', icon: MousePointer2, content: <Inspector /> },
                      { id: 'view', label: 'View', icon: Settings2, content: <ViewSettings /> },
                    ]}
                    defaultTab="inspector"
                  />
                </ResizablePanel>
              </>
            )}
          </ResizablePanelGroup>
        </div>

        {/* Full-width bottom dock */}
        {showBottomDock && <BottomDock />}
      </div>

      <StatusBar />

      <Toaster richColors theme="dark" position="bottom-right" />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Side panel with tabs — used for left and right columns.
// ---------------------------------------------------------------------------

interface SideTab {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  content: React.ReactNode;
}

function SideTabs({ tabs, defaultTab }: { tabs: SideTab[]; defaultTab: string }) {
  return (
    <div className="flex h-full flex-col bg-zinc-950">
      <Tabs defaultValue={defaultTab} className="flex h-full flex-col">
        <div className="flex items-center border-b border-zinc-800 px-1">
          <TabsList className="h-8 bg-transparent p-0">
            {tabs.map((t) => (
              <TabsTrigger
                key={t.id}
                value={t.id}
                className="h-8 gap-1.5 rounded-none border-b-2 border-transparent px-3 text-[11px] font-medium uppercase tracking-wider text-zinc-500 data-[state=active]:border-emerald-500 data-[state=active]:bg-transparent data-[state=active]:text-emerald-300 data-[state=active]:shadow-none"
              >
                <t.icon className="h-3 w-3" />
                {t.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>
        {tabs.map((t) => (
          <TabsContent key={t.id} value={t.id} className="m-0 min-h-0 flex-1 data-[state=inactive]:hidden">
            <ScrollArea className="h-full">
              <div className="h-full">{t.content}</div>
            </ScrollArea>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
