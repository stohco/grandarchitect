/**
 * Live Architect Studio — Editor Toolbar
 */

'use client';

import {
  Play, Pause, StepForward, Move, RotateCw, Maximize,
  Magnet, Grid3x3, Crosshair, BarChart3, Box, ArrowDown, ArrowRight,
  ArrowUp, Sparkles, GitFork, Frame,
} from 'lucide-react';
import { useEditorStore } from '@/lib/editor/store';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';

function TDivider() { return <div className="mx-1 h-5 w-px bg-zinc-800" />; }

function ToolButton({ icon: Icon, active, onClick, tooltip, shortcut, disabled }: {
  icon: React.ComponentType<{ className?: string }>;
  active?: boolean; onClick?: () => void; tooltip: string; shortcut?: string; disabled?: boolean;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="ghost" size="sm" disabled={disabled} onClick={onClick}
          className={cn('h-7 w-7 p-0 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800',
            active && 'bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/20 hover:text-emerald-200',
            disabled && 'opacity-40 cursor-not-allowed')}>
          <Icon className="h-4 w-4" />
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="border-zinc-800 bg-zinc-950 text-xs">
        <span className="font-medium">{tooltip}</span>
        {shortcut && <span className="ml-2 font-mono text-[10px] text-zinc-500">{shortcut}</span>}
      </TooltipContent>
    </Tooltip>
  );
}

export default function EditorToolbar() {
  const s = useEditorStore();
  const hasWorld = !!s.settlement;
  return (
    <TooltipProvider delayDuration={300}>
      <div className="dark flex h-11 items-center gap-1 border-b border-zinc-800 bg-zinc-950 px-2">
        <ToolButton icon={s.simRunning ? Pause : Play} onClick={s.toggleSim} tooltip={s.simRunning ? 'Pause' : 'Play'} shortcut="Space" active={s.simRunning} disabled={!hasWorld} />
        <ToolButton icon={StepForward} onClick={() => s.step('physics_tick', 1)} tooltip="Step" shortcut="." disabled={!hasWorld || s.simRunning} />
        <Select value="physics_tick|1" onValueChange={(v) => { const [g, c] = v.split('|'); s.step(g, parseInt(c, 10)); }} disabled={!hasWorld}>
          <SelectTrigger className="h-7 w-[150px] border-zinc-800 bg-zinc-900 text-xs text-zinc-300"><SelectValue /></SelectTrigger>
          <SelectContent className="border-zinc-800 bg-zinc-950 text-xs">
            <SelectItem value="physics_tick|1">Step · Physics Tick ×1</SelectItem>
            <SelectItem value="physics_tick|60">Step · Physics Tick ×60</SelectItem>
            <SelectItem value="ai_decision|1">Step · AI Decision ×1</SelectItem>
            <SelectItem value="combat_turn|1">Step · Combat Turn ×1</SelectItem>
            <SelectItem value="minute|1">Step · Minute ×1</SelectItem>
            <SelectItem value="hour|1">Step · Hour ×1</SelectItem>
            <SelectItem value="day|1">Step · Day ×1</SelectItem>
            <SelectItem value="month|1">Step · Month ×1</SelectItem>
            <SelectItem value="year|1">Step · Year ×1</SelectItem>
          </SelectContent>
        </Select>
        <TDivider />
        <div className="flex items-center gap-1.5 rounded border border-zinc-800 bg-zinc-900 px-2 py-0.5">
          <span className={cn('h-1.5 w-1.5 rounded-full',
            s.worldState === 'full_simulation' ? 'bg-emerald-400 animate-pulse' :
            s.worldState === 'dormant_architect' ? 'bg-amber-400' :
            s.worldState === 'generation_freeze' ? 'bg-cyan-400' :
            s.worldState === 'temporary_fork' ? 'bg-fuchsia-400' : 'bg-zinc-500')} />
          <span className="font-mono text-[10px] uppercase tracking-wider text-zinc-400">{s.worldState.replace(/_/g, ' ')}</span>
          <span className="font-mono text-[10px] text-zinc-600">·</span>
          <span className="font-mono text-[10px] text-zinc-500">tick {s.frozenTick.toLocaleString()}</span>
        </div>
        <TDivider />
        <ToolButton icon={Move} active={s.transformMode === 'translate'} onClick={() => s.setTransformMode('translate')} tooltip="Translate" shortcut="W" disabled={!hasWorld} />
        <ToolButton icon={RotateCw} active={s.transformMode === 'rotate'} onClick={() => s.setTransformMode('rotate')} tooltip="Rotate" shortcut="E" disabled={!hasWorld} />
        <ToolButton icon={Maximize} active={s.transformMode === 'scale'} onClick={() => s.setTransformMode('scale')} tooltip="Scale" shortcut="R" disabled={!hasWorld} />
        <TDivider />
        <ToolButton icon={Magnet} active={s.snapEnabled} onClick={s.toggleSnap} tooltip="Snap" disabled={!hasWorld} />
        <ToolButton icon={Grid3x3} active={s.showGrid} onClick={s.toggleGrid} tooltip="Grid" shortcut="G" />
        <ToolButton icon={Crosshair} active={s.showGizmos} onClick={s.toggleGizmos} tooltip="Gizmos" shortcut="X" />
        <ToolButton icon={BarChart3} active={s.showStats} onClick={s.toggleStats} tooltip="Stats" />
        <TDivider />
        <Select value={s.renderMode} onValueChange={(v) => s.setRenderMode(v as typeof s.renderMode)}>
          <SelectTrigger className="h-7 w-[110px] border-zinc-800 bg-zinc-900 text-xs text-zinc-300"><SelectValue /></SelectTrigger>
          <SelectContent className="border-zinc-800 bg-zinc-950 text-xs">
            <SelectItem value="shaded">Shaded</SelectItem>
            <SelectItem value="wireframe">Wireframe</SelectItem>
            <SelectItem value="solid">Solid</SelectItem>
            <SelectItem value="lit">Lit</SelectItem>
          </SelectContent>
        </Select>
        <TDivider />
        <ToolButton icon={Box} active={s.cameraPreset === 'perspective'} onClick={() => s.setCameraPreset('perspective')} tooltip="Perspective" />
        <ToolButton icon={ArrowDown} active={s.cameraPreset === 'top'} onClick={() => s.setCameraPreset('top')} tooltip="Top" />
        <ToolButton icon={ArrowRight} active={s.cameraPreset === 'front'} onClick={() => s.setCameraPreset('front')} tooltip="Front" />
        <ToolButton icon={ArrowUp} active={s.cameraPreset === 'side'} onClick={() => s.setCameraPreset('side')} tooltip="Side" />
        <TDivider />
        <ToolButton icon={Frame} onClick={() => s.selectedEntityIds.length > 0 && s.setCameraFocus(s.selectedEntityIds[0])} tooltip="Frame Selection" shortcut="F" disabled={s.selectedEntityIds.length === 0} />
        <ToolButton icon={GitFork} onClick={s.forkWorld} tooltip="Fork World" disabled={!hasWorld} />
        <div className="ml-auto flex items-center gap-1.5">
          <div className="flex items-center gap-1.5 rounded border border-zinc-800 bg-zinc-900 px-2 py-1">
            <Sparkles className="h-3 w-3 text-emerald-400" />
            <input value={s.seedInput} onChange={(e) => s.setSeedInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') s.generateWorld(); }} placeholder="seed" className="w-36 bg-transparent font-mono text-[11px] text-zinc-200 placeholder:text-zinc-600 focus:outline-none" />
          </div>
          <Button size="sm" onClick={() => s.generateWorld()} disabled={s.loadingWorld} className="h-7 gap-1.5 bg-emerald-600 text-xs font-medium hover:bg-emerald-500">
            <Sparkles className="h-3.5 w-3.5" />{s.loadingWorld ? 'Seeding…' : 'Generate'}
          </Button>
        </div>
      </div>
    </TooltipProvider>
  );
}
