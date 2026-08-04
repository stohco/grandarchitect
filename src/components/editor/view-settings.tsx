/**
 * Live Architect Studio — View Settings (render/camera/display)
 */

'use client';

import { useEditorStore } from '@/lib/editor/store';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Move, RotateCw, Maximize, Box, ArrowDown, ArrowRight, ArrowUp, Grid3x3, Crosshair, BarChart3, Magnet, MousePointer2 } from 'lucide-react';
import { cn } from '@/lib/utils';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border-b border-zinc-800 p-3">
      <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">{title}</div>
      {children}
    </div>
  );
}

export default function ViewSettings() {
  const s = useEditorStore();
  return (
    <div className="dark h-full overflow-y-auto bg-zinc-950 text-zinc-300 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-zinc-700">
      <div className="flex items-center justify-between border-b border-zinc-800 px-3 py-2">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">View Settings</span>
      </div>

      <Section title="Transform Tool">
        <ToggleGroup type="single" value={s.transformMode} onValueChange={(v) => v && s.setTransformMode(v as 'translate' | 'rotate' | 'scale')} className="w-full">
          <ToggleGroupItem value="translate" className="flex-1 gap-1.5 text-xs data-[state=on]:bg-emerald-500/15 data-[state=on]:text-emerald-300"><Move className="h-3.5 w-3.5" />Translate</ToggleGroupItem>
          <ToggleGroupItem value="rotate" className="flex-1 gap-1.5 text-xs data-[state=on]:bg-emerald-500/15 data-[state=on]:text-emerald-300"><RotateCw className="h-3.5 w-3.5" />Rotate</ToggleGroupItem>
          <ToggleGroupItem value="scale" className="flex-1 gap-1.5 text-xs data-[state=on]:bg-emerald-500/15 data-[state=on]:text-emerald-300"><Maximize className="h-3.5 w-3.5" />Scale</ToggleGroupItem>
        </ToggleGroup>
      </Section>

      <Section title="Render Mode">
        <ToggleGroup type="single" value={s.renderMode} onValueChange={(v) => v && s.setRenderMode(v as 'shaded' | 'wireframe' | 'solid' | 'lit')} className="w-full">
          <ToggleGroupItem value="shaded" className="flex-1 text-[11px] data-[state=on]:bg-emerald-500/15 data-[state=on]:text-emerald-300">Shaded</ToggleGroupItem>
          <ToggleGroupItem value="wireframe" className="flex-1 text-[11px] data-[state=on]:bg-emerald-500/15 data-[state=on]:text-emerald-300">Wire</ToggleGroupItem>
          <ToggleGroupItem value="solid" className="flex-1 text-[11px] data-[state=on]:bg-emerald-500/15 data-[state=on]:text-emerald-300">Solid</ToggleGroupItem>
          <ToggleGroupItem value="lit" className="flex-1 text-[11px] data-[state=on]:bg-emerald-500/15 data-[state=on]:text-emerald-300">Lit</ToggleGroupItem>
        </ToggleGroup>
      </Section>

      <Section title="Camera">
        <div className="grid grid-cols-2 gap-1.5">
          {([['perspective', Box, 'Perspective'], ['top', ArrowDown, 'Top'], ['front', ArrowRight, 'Front'], ['side', ArrowUp, 'Side']] as const).map(([preset, Icon, label]) => (
            <button key={preset} onClick={() => s.setCameraPreset(preset)}
              className={cn('flex items-center justify-center gap-1.5 rounded border px-2 py-1.5 text-xs',
                s.cameraPreset === preset ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300' : 'border-zinc-800 bg-zinc-900 text-zinc-400 hover:bg-zinc-800')}>
              <Icon className="h-3.5 w-3.5" />{label}
            </button>
          ))}
        </div>
      </Section>

      <Section title="Display">
        <div className="space-y-2.5">
          {([['showGrid', 'toggleGrid', Grid3x3, 'Grid'], ['showGizmos', 'toggleGizmos', Crosshair, 'Transform Gizmos'], ['showStats', 'toggleStats', BarChart3, 'Stats Overlay'], ['snapEnabled', 'toggleSnap', Magnet, 'Snap to Grid']] as const).map(([key, action, Icon, label]) => (
            <div key={key} className="flex items-center justify-between">
              <Label className="flex items-center gap-2 text-xs text-zinc-300"><Icon className="h-3.5 w-3.5 text-zinc-500" />{label}</Label>
              <Switch checked={s[key] as boolean} onCheckedChange={() => s[action]()} />
            </div>
          ))}
        </div>
      </Section>

      <Section title="Selection">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-2 text-xs text-zinc-300"><MousePointer2 className="h-3.5 w-3.5 text-zinc-500" />{s.selectedEntityIds.length} selected</span>
          {s.selectedEntityIds.length > 0 && (
            <button onClick={s.clearSelection} className="text-xs text-rose-400 hover:text-rose-300">Clear</button>
          )}
        </div>
      </Section>
      <Separator className="bg-zinc-800" />
    </div>
  );
}
