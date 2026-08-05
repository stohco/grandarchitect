'use client';

/**
 * EditorToolbar — the main top bar of the editor.
 *
 * Houses (left to right):
 *   - WorldGenBar (seed + generate + presets)
 *   - Editor mode select (Play / Live Architect / Isolated Preview)
 *   - Play / Pause / Step buttons
 *   - Transform tool buttons (W=translate, E=rotate, R=scale)
 *   - Snap / Grid / Gizmos / Stats / Minimap toggles
 *   - Render mode select
 *   - Camera preset select
 *   - Outliner / Inspector / Bottom dock panel toggles
 *
 * Designed for desktop width; collapses some labels on narrow screens.
 */

import { useEditorStore } from '@/lib/editor/store';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Play,
  Pause,
  SkipForward,
  Move3d,
  RotateCw,
  Scale3d,
  Magnet,
  Grid3x3,
  Crosshair,
  BarChart3,
  Map,
  Mountain,
  Box,
  Navigation,
  PersonStanding,
  PanelLeft,
  PanelRight,
  PanelBottom,
  GitFork,
} from 'lucide-react';
import {
  CameraPreset,
  EditorMode,
  RenderMode,
  TransformMode,
  WorldExecutionState,
} from '@/lib/editor/types';
import WorldGenBar from './WorldGenBar';

function ToggleButton({
  active,
  onClick,
  title,
  children,
  disabled,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  children: React.ReactNode;
  disabled?: boolean;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClick}
          title={title}
          disabled={disabled}
          className={`h-8 w-8 ${
            disabled ? 'opacity-30 cursor-not-allowed' :
            active
              ? 'bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/30'
              : 'text-[#8888aa] hover:bg-[#2a2a4a] hover:text-[#c8c8e0]'
          }`}
        >
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="border-[#2a2a4a] bg-[#12122a] text-[#c8c8e0]">
        {title}
      </TooltipContent>
    </Tooltip>
  );
}

export default function EditorToolbar() {
  const editorMode = useEditorStore((s) => s.editorMode);
  const setEditorMode = useEditorStore((s) => s.setEditorMode);
  const worldState = useEditorStore((s) => s.worldState);
  const requestWorldState = useEditorStore((s) => s.requestWorldState);
  const step = useEditorStore((s) => s.step);
  const isStepping = useEditorStore((s) => s.isStepping);
  const forkWorld = useEditorStore((s) => s.forkWorld);

  const transformMode = useEditorStore((s) => s.transformMode);
  const setTransformMode = useEditorStore((s) => s.setTransformMode);
  const renderMode = useEditorStore((s) => s.renderMode);
  const setRenderMode = useEditorStore((s) => s.setRenderMode);

  const snapEnabled = useEditorStore((s) => s.snapEnabled);
  const showGrid = useEditorStore((s) => s.showGrid);
  const showGizmos = useEditorStore((s) => s.showGizmos);
  const showStats = useEditorStore((s) => s.showStats);
  const showMinimap = useEditorStore((s) => s.showMinimap);
  const showTerrain = useEditorStore((s) => s.showTerrain);
  const showCollisionOverlay = useEditorStore((s) => s.showCollisionOverlay);
  const showNavigationOverlay = useEditorStore((s) => s.showNavigationOverlay);
  const showPlayer = useEditorStore((s) => s.showPlayer);
  const showOutliner = useEditorStore((s) => s.showOutliner);
  const showInspector = useEditorStore((s) => s.showInspector);
  const showBottomDock = useEditorStore((s) => s.showBottomDock);

  const toggleSnap = useEditorStore((s) => s.toggleSnap);
  const toggleGrid = useEditorStore((s) => s.toggleGrid);
  const toggleGizmos = useEditorStore((s) => s.toggleGizmos);
  const toggleStats = useEditorStore((s) => s.toggleStats);
  const toggleMinimap = useEditorStore((s) => s.toggleMinimap);
  const toggleTerrain = useEditorStore((s) => s.toggleTerrain);
  const toggleCollisionOverlay = useEditorStore((s) => s.toggleCollisionOverlay);
  const toggleNavigationOverlay = useEditorStore((s) => s.toggleNavigationOverlay);
  const togglePlayer = useEditorStore((s) => s.togglePlayer);
  const toggleOutliner = useEditorStore((s) => s.toggleOutliner);
  const toggleInspector = useEditorStore((s) => s.toggleInspector);
  const toggleBottomDock = useEditorStore((s) => s.toggleBottomDock);

  const setCameraPreset = useEditorStore((s) => s.setCameraPreset);
  const cameraPreset = useEditorStore((s) => s.cameraPreset);

  const playing = worldState === 'full_simulation';
  const onPlayPause = () => {
    const next: WorldExecutionState = playing ? 'dormant_architect' : 'full_simulation';
    requestWorldState(next);
  };
  const onStep = () => {
    if (worldState !== 'step_simulation') requestWorldState('step_simulation');
    void step();
  };

  return (
    <TooltipProvider delayDuration={250}>
      <div className="flex h-12 w-full items-center gap-2 border-b border-[#2a2a4a] bg-[#12122a] px-3">
        {/* Brand */}
        <div className="flex items-center gap-2 pr-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-emerald-600/20 text-emerald-400">
            <Crosshair className="h-4 w-4" />
          </span>
          <div className="hidden flex-col leading-tight md:flex">
            <span className="text-xs font-semibold text-[#c8c8e0]">Live Architect</span>
            <span className="text-[10px] text-[#5a5a7a]">Studio · 王灣村</span>
          </div>
        </div>

        <div className="h-6 w-px bg-[#2a2a4a]" />

        {/* World generation */}
        <WorldGenBar />

        <div className="h-6 w-px bg-[#2a2a4a]" />

        {/* Editor mode */}
        <Select value={editorMode} onValueChange={(v) => setEditorMode(v as EditorMode)}>
          <SelectTrigger size="sm" className="h-8 w-[150px] border-[#2a2a4a] bg-[#0e0e24] text-xs text-[#c8c8e0]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="border-[#2a2a4a] bg-[#12122a] text-[#c8c8e0]">
            <SelectItem value="play">Play</SelectItem>
            <SelectItem value="live_architect">Live Architect</SelectItem>
            <SelectItem value="isolated_preview">Isolated Preview</SelectItem>
          </SelectContent>
        </Select>

        {/* Play / Pause / Step */}
        <ToggleButton active={playing} onClick={onPlayPause} title={playing ? 'Pause simulation' : 'Run simulation'}>
          {playing ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
        </ToggleButton>
        <ToggleButton active={isStepping} onClick={onStep} title="Step one tick">
          <SkipForward className="h-3.5 w-3.5" />
        </ToggleButton>
        <ToggleButton active={false} onClick={forkWorld} title="Fork world (what-if)">
          <GitFork className="h-3.5 w-3.5" />
        </ToggleButton>

        <div className="h-6 w-px bg-[#2a2a4a]" />

        {/* Transform tools */}
        <ToggleButton active={transformMode === 'translate'} onClick={() => setTransformMode('translate')} title="Translate (W)">
          <Move3d className="h-3.5 w-3.5" />
        </ToggleButton>
        <ToggleButton active={transformMode === 'rotate'} onClick={() => setTransformMode('rotate')} title="Rotate (E)">
          <RotateCw className="h-3.5 w-3.5" />
        </ToggleButton>
        <ToggleButton active={transformMode === 'scale'} onClick={() => setTransformMode('scale')} title="Scale (R)">
          <Scale3d className="h-3.5 w-3.5" />
        </ToggleButton>

        <div className="h-6 w-px bg-[#2a2a4a]" />

        {/* Viewport toggles */}
        <ToggleButton active={snapEnabled} onClick={toggleSnap} title="Snap to grid">
          <Magnet className="h-3.5 w-3.5" />
        </ToggleButton>
        <ToggleButton active={showGrid} onClick={toggleGrid} title="Toggle grid">
          <Grid3x3 className="h-3.5 w-3.5" />
        </ToggleButton>
        <ToggleButton active={showGizmos} onClick={toggleGizmos} title="Toggle gizmos">
          <Crosshair className="h-3.5 w-3.5" />
        </ToggleButton>
        <ToggleButton active={showStats} onClick={toggleStats} title="Toggle stats overlay">
          <BarChart3 className="h-3.5 w-3.5" />
        </ToggleButton>
        <ToggleButton active={showMinimap} onClick={toggleMinimap} title="Toggle minimap">
          <Map className="h-3.5 w-3.5" />
        </ToggleButton>
        <ToggleButton active={showTerrain} onClick={toggleTerrain} title="Generate & show real terrain (SDF mountain + tunnel + vegetation)">
          <Mountain className="h-3.5 w-3.5" />
        </ToggleButton>
        <ToggleButton active={showCollisionOverlay} onClick={toggleCollisionOverlay} title="Toggle collision mesh overlay (red wireframe)" disabled={!showTerrain}>
          <Box className="h-3.5 w-3.5" />
        </ToggleButton>
        <ToggleButton active={showNavigationOverlay} onClick={toggleNavigationOverlay} title="Toggle navigation mesh overlay (green walkable surfaces)" disabled={!showTerrain}>
          <Navigation className="h-3.5 w-3.5" />
        </ToggleButton>
        <ToggleButton active={showPlayer} onClick={togglePlayer} title="Spawn player in tunnel — WASD to walk, traverse the tunnel" disabled={!showTerrain}>
          <PersonStanding className="h-3.5 w-3.5" />
        </ToggleButton>

        <div className="h-6 w-px bg-[#2a2a4a]" />

        {/* Render mode */}
        <Select value={renderMode} onValueChange={(v) => setRenderMode(v as RenderMode)}>
          <SelectTrigger size="sm" className="h-8 w-[120px] border-[#2a2a4a] bg-[#0e0e24] text-xs text-[#c8c8e0]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="border-[#2a2a4a] bg-[#12122a] text-[#c8c8e0]">
            <SelectItem value="shaded">Shaded</SelectItem>
            <SelectItem value="wireframe">Wireframe</SelectItem>
            <SelectItem value="solid">Solid</SelectItem>
            <SelectItem value="pointcloud">Point Cloud</SelectItem>
          </SelectContent>
        </Select>

        {/* Camera preset */}
        <Select value={cameraPreset} onValueChange={(v) => setCameraPreset(v as CameraPreset)}>
          <SelectTrigger size="sm" className="h-8 w-[120px] border-[#2a2a4a] bg-[#0e0e24] text-xs text-[#c8c8e0]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="border-[#2a2a4a] bg-[#12122a] text-[#c8c8e0]">
            <SelectItem value="perspective">Perspective</SelectItem>
            <SelectItem value="top">Top</SelectItem>
            <SelectItem value="front">Front</SelectItem>
            <SelectItem value="side">Side</SelectItem>
          </SelectContent>
        </Select>

        <div className="flex-1" />

        {/* Panel toggles */}
        <ToggleButton active={showOutliner} onClick={toggleOutliner} title="Toggle outliner">
          <PanelLeft className="h-3.5 w-3.5" />
        </ToggleButton>
        <ToggleButton active={showBottomDock} onClick={toggleBottomDock} title="Toggle bottom dock">
          <PanelBottom className="h-3.5 w-3.5" />
        </ToggleButton>
        <ToggleButton active={showInspector} onClick={toggleInspector} title="Toggle inspector">
          <PanelRight className="h-3.5 w-3.5" />
        </ToggleButton>
      </div>
    </TooltipProvider>
  );
}
