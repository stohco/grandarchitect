/*
 * Live Architect Studio — Editor Toolbar
 *
 * Horizontal toolbar (h-9) with editor mode, transport controls,
 * transform mode, view toggles, render mode, world state, and utility actions.
 */

import {
  Play,
  Pause,
  Square,
  StepForward,
  Move,
  RotateCcw,
  Maximize2,
  Grid3X3,
  Box,
  Grid2X2,
  MousePointer,
  CheckCheck,
  X,
  RotateCcw as UndoIcon,
  GitBranch,
  BarChart3,
  Terminal,
  ChevronDown,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Badge } from '@/components/ui/badge';
import { useEditorStore } from '@/lib/editor/store';
import type {
  WorldExecutionState,
  RenderMode,
  EditorMode,
  TransformMode,
} from '@/lib/editor/types';

const EDITOR_MODES: { value: EditorMode; label: string }[] = [
  { value: 'play', label: 'Play' },
  { value: 'live_architect', label: 'Live Architect' },
  { value: 'isolated_preview', label: 'Isolated Preview' },
];

const RENDER_MODES: { value: RenderMode; label: string }[] = [
  { value: 'shaded', label: 'Shaded' },
  { value: 'wireframe', label: 'Wireframe' },
  { value: 'solid', label: 'Solid' },
  { value: 'lit', label: 'Lit' },
];

const WORLD_STATES: { value: WorldExecutionState; label: string }[] = [
  { value: 'generation_freeze', label: 'Generation Freeze' },
  { value: 'dormant_architect', label: 'Dormant Architect' },
  { value: 'selective_awakening', label: 'Selective Awakening' },
  { value: 'step_simulation', label: 'Step Simulation' },
  { value: 'full_simulation', label: 'Full Simulation' },
  { value: 'player_embodiment', label: 'Player Embodiment' },
  { value: 'temporary_fork', label: 'Temporary Fork' },
];

const STATE_COLORS: Record<WorldExecutionState, string> = {
  generation_freeze: 'bg-zinc-500',
  dormant_architect: 'bg-amber-500',
  selective_awakening: 'bg-blue-500',
  step_simulation: 'bg-emerald-500',
  full_simulation: 'bg-green-500',
  player_embodiment: 'bg-purple-500',
  temporary_fork: 'bg-orange-500',
};

export default function EditorToolbar() {
  const editorMode = useEditorStore((s) => s.editorMode);
  const setEditorMode = useEditorStore((s) => s.setEditorMode);
  const transformMode = useEditorStore((s) => s.transformMode);
  const setTransformMode = useEditorStore((s) => s.setTransformMode);
  const renderMode = useEditorStore((s) => s.renderMode);
  const setRenderMode = useEditorStore((s) => s.setRenderMode);
  const worldState = useEditorStore((s) => s.worldState);
  const requestWorldState = useEditorStore((s) => s.requestWorldState);
  const simRunning = useEditorStore((s) => s.simRunning);
  const toggleSim = useEditorStore((s) => s.toggleSim);
  const step = useEditorStore((s) => s.step);
  const showGrid = useEditorStore((s) => s.showGrid);
  const toggleGrid = useEditorStore((s) => s.toggleGrid);
  const showGizmos = useEditorStore((s) => s.showGizmos);
  const toggleGizmos = useEditorStore((s) => s.toggleGizmos);
  const snapEnabled = useEditorStore((s) => s.snapEnabled);
  const toggleSnap = useEditorStore((s) => s.toggleSnap);
  const showStats = useEditorStore((s) => s.showStats);
  const toggleStats = useEditorStore((s) => s.toggleStats);
  const showBottomDock = useEditorStore((s) => s.showBottomDock);
  const toggleBottomDock = useEditorStore((s) => s.toggleBottomDock);
  const selectAll = useEditorStore((s) => s.selectAll);
  const clearSelection = useEditorStore((s) => s.clearSelection);
  const resetEdits = useEditorStore((s) => s.resetEdits);
  const forkWorld = useEditorStore((s) => s.forkWorld);

  const currentEditorMode = EDITOR_MODES.find((m) => m.value === editorMode);
  const currentRenderMode = RENDER_MODES.find((m) => m.value === renderMode);
  const currentWorldState = WORLD_STATES.find((s) => s.value === worldState);

  return (
    <div className="flex h-9 items-center gap-1 border-b border-[#2a2a4a] bg-[#12122a] px-2">
      {/* Editor Mode */}
      <DropdownMenu>
        <Tooltip>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-6 gap-1.5 rounded px-2 text-[11px] font-medium text-[#8888aa] hover:text-white">
                {currentEditorMode?.label ?? editorMode}
                <ChevronDown className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-xs">Editor mode</TooltipContent>
        </Tooltip>
        <DropdownMenuContent align="start" className="min-w-[160px]">
          {EDITOR_MODES.map((m) => (
            <DropdownMenuItem key={m.value} onClick={() => setEditorMode(m.value)} className={`text-xs ${m.value === editorMode ? 'bg-[#2a2a5a] text-white' : ''}`}>
              {m.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <div className="mx-1 h-4 w-px bg-[#2a2a4a]" />

      {/* Transport Controls */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="icon" className={`h-6 w-6 ${simRunning ? 'text-emerald-400' : 'text-[#8888aa]'} hover:text-white`} onClick={toggleSim}>
            {simRunning ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-xs">{simRunning ? 'Pause (Space)' : 'Play (Space)'}</TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="icon" className="h-6 w-6 text-[#8888aa] hover:text-white" onClick={() => { if (simRunning) toggleSim(); requestWorldState('generation_freeze'); }}>
            <Square className="h-3 w-3" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-xs">Stop</TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="icon" className="h-6 w-6 text-[#8888aa] hover:text-white" onClick={() => step('physics_tick', 1)}>
            <StepForward className="h-3.5 w-3.5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-xs">Step forward (.)</TooltipContent>
      </Tooltip>

      <div className="mx-1 h-4 w-px bg-[#2a2a4a]" />

      {/* Transform Mode Toggle Group */}
      <ToggleGroup type="single" value={transformMode} onValueChange={(v) => { if (v) setTransformMode(v as TransformMode); }} className="gap-0">
        <Tooltip>
          <TooltipTrigger asChild>
            <ToggleGroupItem value="translate" className="h-6 w-6 rounded-l rounded-r-none border border-[#2a2a4a] bg-transparent px-0 text-[#8888aa] data-[state=on]:bg-[#2a2a5a] data-[state=on]:text-emerald-300 hover:text-white">
              <Move className="h-3 w-3" />
            </ToggleGroupItem>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-xs">Translate (W)</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <ToggleGroupItem value="rotate" className="h-6 w-6 border-y border-[#2a2a4a] bg-transparent px-0 text-[#8888aa] data-[state=on]:bg-[#2a2a5a] data-[state=on]:text-emerald-300 hover:text-white">
              <RotateCcw className="h-3 w-3" />
            </ToggleGroupItem>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-xs">Rotate (E)</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <ToggleGroupItem value="scale" className="h-6 w-6 rounded-l-none rounded-r border border-[#2a2a4a] bg-transparent px-0 text-[#8888aa] data-[state=on]:bg-[#2a2a5a] data-[state=on]:text-emerald-300 hover:text-white">
              <Maximize2 className="h-3 w-3" />
            </ToggleGroupItem>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-xs">Scale (R)</TooltipContent>
        </Tooltip>
      </ToggleGroup>

      <div className="mx-1 h-4 w-px bg-[#2a2a4a]" />

      {/* View Toggles */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="icon" className={`h-6 w-6 ${showGrid ? 'text-emerald-400' : 'text-[#5a5a7a]'} hover:text-white`} onClick={toggleGrid}>
            <Grid3X3 className="h-3.5 w-3.5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-xs">Grid (G)</TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="icon" className={`h-6 w-6 ${showGizmos ? 'text-emerald-400' : 'text-[#5a5a7a]'} hover:text-white`} onClick={toggleGizmos}>
            <Box className="h-3.5 w-3.5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-xs">Gizmos</TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="icon" className={`h-6 w-6 ${snapEnabled ? 'text-emerald-400' : 'text-[#5a5a7a]'} hover:text-white`} onClick={toggleSnap}>
            <Grid2X2 className="h-3.5 w-3.5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-xs">Snap (X)</TooltipContent>
      </Tooltip>

      <div className="mx-1 h-4 w-px bg-[#2a2a4a]" />

      {/* Render Mode */}
      <DropdownMenu>
        <Tooltip>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-6 gap-1.5 rounded px-2 text-[11px] font-medium text-[#8888aa] hover:text-white">
                <MousePointer className="h-3 w-3" />
                {currentRenderMode?.label ?? renderMode}
                <ChevronDown className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-xs">Render mode</TooltipContent>
        </Tooltip>
        <DropdownMenuContent align="start" className="min-w-[140px]">
          {RENDER_MODES.map((m) => (
            <DropdownMenuItem key={m.value} onClick={() => setRenderMode(m.value)} className={`text-xs ${m.value === renderMode ? 'bg-[#2a2a5a] text-white' : ''}`}>
              {m.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* World Execution State */}
      <DropdownMenu>
        <Tooltip>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-6 gap-1.5 rounded px-2 text-[11px] font-medium text-[#8888aa] hover:text-white">
                {currentWorldState?.label ?? worldState}
                <ChevronDown className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-xs">World execution state</TooltipContent>
        </Tooltip>
        <DropdownMenuContent align="start" className="min-w-[180px]">
          {WORLD_STATES.map((s) => (
            <DropdownMenuItem key={s.value} onClick={() => requestWorldState(s.value)} className={`text-xs ${s.value === worldState ? 'bg-[#2a2a5a] text-white' : ''}`}>
              <span className={`mr-2 h-2 w-2 rounded-full ${STATE_COLORS[s.value]}`} />
              {s.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Status Badge */}
      <Badge variant="outline" className="ml-1 h-5 gap-1 border-[#2a2a4a] text-[10px] text-white">
        <span className={`h-1.5 w-1.5 rounded-full ${STATE_COLORS[worldState]}`} />
        {worldState.split('_')[0]}
      </Badge>

      <div className="flex-1" />

      {/* Right side actions */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="sm" className="h-6 gap-1 rounded px-2 text-[10px] text-[#8888aa] hover:text-white" onClick={selectAll}>
            <CheckCheck className="h-3 w-3" /> Select All
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-xs">Select all (Ctrl+A)</TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="sm" className="h-6 gap-1 rounded px-2 text-[10px] text-[#8888aa] hover:text-white" onClick={clearSelection}>
            <X className="h-3 w-3" /> Deselect
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-xs">Deselect (Esc)</TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="icon" className="h-6 w-6 text-[#8888aa] hover:text-white" onClick={resetEdits}>
            <UndoIcon className="h-3.5 w-3.5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-xs">Reset edits</TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="icon" className="h-6 w-6 text-[#8888aa] hover:text-white" onClick={() => forkWorld()}>
            <GitBranch className="h-3.5 w-3.5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-xs">Fork world</TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="icon" className={`h-6 w-6 ${showStats ? 'text-emerald-400' : 'text-[#5a5a7a]'} hover:text-white`} onClick={toggleStats}>
            <BarChart3 className="h-3.5 w-3.5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-xs">Toggle stats overlay</TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="icon" className={`h-6 w-6 ${showBottomDock ? 'text-emerald-400' : 'text-[#5a5a7a]'} hover:text-white`} onClick={toggleBottomDock}>
            <Terminal className="h-3.5 w-3.5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-xs">Toggle console</TooltipContent>
      </Tooltip>
    </div>
  );
}
