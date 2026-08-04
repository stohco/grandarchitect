/**
 * Live Architect Studio — Menu Bar
 *
 * Top-level menus: File, Edit, View, World, Plugins, Tools, Help.
 * Each opens a dropdown of actions bound to the store.
 */

'use client';

import { useState } from 'react';
import {
  FileText, Edit3, Eye, Globe, Puzzle, Wrench, HelpCircle,
  Plus, Save, FolderOpen, Undo2, Redo2, Delete, Copy, ClipboardPaste,
  Grid3x3, Crosshair, BarChart3, Magnet, PanelLeft, PanelRight, PanelBottom,
  Sparkles, Play, Pause, StepForward, GitFork, RotateCcw,
  FlaskConical, BookOpen, Keyboard, Cpu, Github,
} from 'lucide-react';
import { useEditorStore } from '@/lib/editor/store';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuCheckboxItem,
} from '@/components/ui/dropdown-menu';

interface MenuItem {
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  shortcut?: string;
  onClick?: () => void;
  disabled?: boolean;
  checked?: boolean;
  separator?: boolean;
  danger?: boolean;
}

function MenuButton({ name, items }: { name: string; items: MenuItem[] }) {
  const [open, setOpen] = useState(false);
  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <button
          className={`px-2.5 py-1 text-xs font-medium rounded-sm transition-colors ${
            open ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-200'
          }`}
        >
          {name}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        className="min-w-[220px] border-zinc-800 bg-zinc-950 text-zinc-300"
      >
        {items.map((it, i) =>
          it.separator ? (
            <DropdownMenuSeparator key={`sep-${i}`} className="bg-zinc-800" />
          ) : it.checked !== undefined ? (
            <DropdownMenuCheckboxItem
              key={i}
              checked={it.checked}
              onCheckedChange={() => it.onClick?.()}
              className="text-xs focus:bg-zinc-800 focus:text-zinc-100"
            >
              {it.icon && <it.icon className="mr-2 h-3.5 w-3.5" />}
              {it.label}
              {it.shortcut && <span className="ml-auto font-mono text-[10px] text-zinc-600">{it.shortcut}</span>}
            </DropdownMenuCheckboxItem>
          ) : (
            <DropdownMenuItem
              key={i}
              disabled={it.disabled}
              onClick={() => it.onClick?.()}
              className={`text-xs focus:bg-zinc-800 focus:text-zinc-100 ${it.danger ? 'text-rose-400 focus:text-rose-300' : ''}`}
            >
              {it.icon && <it.icon className="mr-2 h-3.5 w-3.5" />}
              {it.label}
              {it.shortcut && <span className="ml-auto font-mono text-[10px] text-zinc-600">{it.shortcut}</span>}
            </DropdownMenuItem>
          )
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default function MenuBar() {
  const store = useEditorStore();

  const fileItems: MenuItem[] = [
    { label: 'New World…', icon: Plus, shortcut: 'Ctrl+N', onClick: () => store.generateWorld('wang-family-bend-' + Date.now().toString(36)) },
    { label: 'Generate from Seed…', icon: Sparkles, shortcut: 'Ctrl+G', onClick: () => store.generateWorld() },
    { separator: true, label: '' },
    { label: 'Export Layout JSON', icon: FileText, onClick: () => {
      if (!store.settlement) return;
      const blob = new Blob([JSON.stringify(store.settlement, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `${store.settlement.villageName.replace(/\s+/g, '-').toLowerCase()}-${store.settlement.seed}.json`;
      a.click(); URL.revokeObjectURL(url);
      store.log('success', 'editor', `Exported ${store.settlement.structures.length} structures to JSON.`);
    }},
  ];

  const editItems: MenuItem[] = [
    { label: 'Undo', icon: Undo2, shortcut: 'Ctrl+Z', disabled: store.transactions.length === 0 || store.transactions[0]?.undone, onClick: () => store.transactions[0] && !store.transactions[0].undone && store.undoTransaction(store.transactions[0].transactionId) },
    { label: 'Redo', icon: RotateCcw, shortcut: 'Ctrl+Y', disabled: true },
    { separator: true, label: '' },
    { label: 'Delete Selection', icon: Delete, shortcut: 'Del', danger: true, disabled: store.selectedEntityIds.length === 0, onClick: () => store.selectedEntityIds.forEach((id) => store.hideEntity(id)) },
    { label: 'Revert All Edits', icon: RotateCcw, danger: true, onClick: () => store.resetEdits() },
  ];

  const viewItems: MenuItem[] = [
    { label: 'Grid', icon: Grid3x3, shortcut: 'G', checked: store.showGrid, onClick: store.toggleGrid },
    { label: 'Transform Gizmos', icon: Crosshair, shortcut: 'X', checked: store.showGizmos, onClick: store.toggleGizmos },
    { label: 'Stats Overlay', icon: BarChart3, checked: store.showStats, onClick: store.toggleStats },
    { label: 'Snap to Grid', icon: Magnet, checked: store.snapEnabled, onClick: store.toggleSnap },
    { separator: true, label: '' },
    { label: 'Outliner Panel', icon: PanelLeft, shortcut: 'Ctrl+1', checked: store.showOutliner, onClick: store.toggleOutliner },
    { label: 'Inspector Panel', icon: PanelRight, shortcut: 'Ctrl+2', checked: store.showInspector, onClick: store.toggleInspector },
    { label: 'Bottom Dock', icon: PanelBottom, checked: store.showBottomDock, onClick: store.toggleBottomDock },
    { separator: true, label: '' },
    { label: 'Frame Selection', shortcut: 'F', disabled: store.selectedEntityIds.length === 0, onClick: () => store.setCameraFocus(store.selectedEntityIds[0]) },
    { label: 'Perspective Camera', checked: store.cameraPreset === 'perspective', onClick: () => store.setCameraPreset('perspective') },
    { label: 'Top Camera', checked: store.cameraPreset === 'top', onClick: () => store.setCameraPreset('top') },
    { label: 'Front Camera', checked: store.cameraPreset === 'front', onClick: () => store.setCameraPreset('front') },
    { label: 'Side Camera', checked: store.cameraPreset === 'side', onClick: () => store.setCameraPreset('side') },
  ];

  const worldItems: MenuItem[] = [
    { label: 'Play / Pause Simulation', icon: store.simRunning ? Pause : Play, shortcut: 'Space', onClick: store.toggleSim },
    { label: 'Step (Physics Tick)', icon: StepForward, shortcut: '.', onClick: () => store.step('physics_tick', 1) },
    { label: 'Step (Day)', icon: StepForward, onClick: () => store.step('day', 1) },
    { separator: true, label: '' },
    { label: 'Generation Freeze', checked: store.worldState === 'generation_freeze', onClick: () => store.requestWorldState('generation_freeze') },
    { label: 'Dormant Architect', checked: store.worldState === 'dormant_architect', onClick: () => store.requestWorldState('dormant_architect') },
    { label: 'Selective Awakening', checked: store.worldState === 'selective_awakening', onClick: () => store.requestWorldState('selective_awakening') },
    { label: 'Step Simulation', checked: store.worldState === 'step_simulation', onClick: () => store.requestWorldState('step_simulation') },
    { label: 'Full Simulation', checked: store.worldState === 'full_simulation', onClick: () => store.requestWorldState('full_simulation') },
    { label: 'Player Embodiment', checked: store.worldState === 'player_embodiment', onClick: () => store.requestWorldState('player_embodiment') },
    { separator: true, label: '' },
    { label: 'Fork World', icon: GitFork, onClick: () => store.forkWorld() },
  ];

  const pluginItems: MenuItem[] = [
    { label: 'Capability Registry', icon: Puzzle, onClick: () => { store.loadCapabilities(); store.setActiveBottomTab('capabilities'); if (!store.showBottomDock) store.toggleBottomDock(); } },
    { label: 'Run Conformance Suite', icon: FlaskConical, onClick: () => { store.setActiveBottomTab('conformance'); if (!store.showBottomDock) store.toggleBottomDock(); } },
  ];

  const toolItems: MenuItem[] = [
    { label: 'Translate Tool', shortcut: 'W', checked: store.transformMode === 'translate', onClick: () => store.setTransformMode('translate') },
    { label: 'Rotate Tool', shortcut: 'E', checked: store.transformMode === 'rotate', onClick: () => store.setTransformMode('rotate') },
    { label: 'Scale Tool', shortcut: 'R', checked: store.transformMode === 'scale', onClick: () => store.setTransformMode('scale') },
    { separator: true, label: '' },
    { label: 'Render: Shaded', checked: store.renderMode === 'shaded', onClick: () => store.setRenderMode('shaded') },
    { label: 'Render: Wireframe', checked: store.renderMode === 'wireframe', onClick: () => store.setRenderMode('wireframe') },
    { label: 'Render: Solid', checked: store.renderMode === 'solid', onClick: () => store.setRenderMode('solid') },
    { label: 'Render: Lit', checked: store.renderMode === 'lit', onClick: () => store.setRenderMode('lit') },
    { separator: true, label: '' },
    { label: 'Select All', shortcut: 'Ctrl+A', onClick: store.selectAll },
    { label: 'Deselect All', shortcut: 'Esc', disabled: store.selectedEntityIds.length === 0, onClick: store.clearSelection },
  ];

  const helpItems: MenuItem[] = [
    { label: 'Keyboard Shortcuts', icon: Keyboard, onClick: () => store.log('info', 'help', 'Shortcuts: W/E/R transform · G grid · F frame · Space play · . step · Esc deselect') },
    { label: 'About Live Architect Studio', icon: HelpCircle, onClick: () => store.log('architect', 'help', 'Live Architect Studio v0.7 — deterministic 仙侠 multi-verse engine editor.') },
  ];

  return (
    <div className="dark flex h-9 items-center gap-0.5 border-b border-zinc-800 bg-zinc-950 px-2 select-none">
      <div className="mr-2 flex items-center gap-1.5 pl-1 pr-2">
        <div className="flex h-5 w-5 items-center justify-center rounded bg-emerald-500/15">
          <span className="text-[10px]">🏯</span>
        </div>
        <span className="text-[11px] font-semibold tracking-tight text-zinc-200">Live Architect Studio</span>
      </div>
      <MenuButton name="File" items={fileItems} />
      <MenuButton name="Edit" items={editItems} />
      <MenuButton name="View" items={viewItems} />
      <MenuButton name="World" items={worldItems} />
      <MenuButton name="Plugins" items={pluginItems} />
      <MenuButton name="Tools" items={toolItems} />
      <MenuButton name="Help" items={helpItems} />
    </div>
  );
}
