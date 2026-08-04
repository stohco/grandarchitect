/**
 * Live Architect Studio — Status Bar
 */

'use client';

import { Activity, Hash, MapPin, Boxes, GitBranch, Cpu, Clock, EyeOff, Layers, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useEditorStore } from '@/lib/editor/store';
import { cn } from '@/lib/utils';

export default function StatusBar() {
  const s = useEditorStore();
  const hasWorld = !!s.settlement;
  const selCount = s.selectedEntityIds.length;
  const hiddenCount = s.hiddenEntityIds.size;
  const entityCount = s.settlement?.structures.length ?? 0;
  const branch = s.branches.find((b) => b.branchId === s.currentBranchId);
  const fps = s.perf.fps;
  const fpsColor = fps >= 55 ? 'text-emerald-400' : fps >= 30 ? 'text-amber-400' : 'text-rose-400';

  return (
    <div className="dark flex h-7 items-center gap-3 border-t border-zinc-800 bg-zinc-950 px-3 text-[11px] text-zinc-500 select-none overflow-x-auto">
      <div className="flex items-center gap-1.5">
        <span className={cn('h-1.5 w-1.5 rounded-full',
          s.worldState === 'full_simulation' ? 'bg-emerald-400 animate-pulse' :
          s.worldState === 'dormant_architect' ? 'bg-amber-400' :
          s.worldState === 'generation_freeze' ? 'bg-cyan-400' :
          s.worldState === 'temporary_fork' ? 'bg-fuchsia-400' : 'bg-zinc-500')} />
        <span className="font-mono uppercase tracking-wide text-zinc-400">{s.worldState.replace(/_/g, ' ')}</span>
      </div>
      <Sep />
      <Stat icon={Clock} label="tick" value={s.frozenTick.toLocaleString()} mono />
      <Stat icon={Hash} label="seed" value={hasWorld ? s.seed : '—'} mono truncate />
      <Sep />
      <Stat icon={Boxes} label="entities" value={String(entityCount)} mono />
      <Stat icon={Layers} label="sel" value={String(selCount)} mono accent={selCount > 0 ? 'emerald' : undefined} />
      {hiddenCount > 0 && <Stat icon={EyeOff} label="hidden" value={String(hiddenCount)} mono accent="amber" />}
      <Sep />
      <div className="flex items-center gap-1.5">
        <GitBranch className="h-3 w-3 text-zinc-600" />
        <span className="font-mono text-zinc-400">{branch?.name ?? 'main'}</span>
        {s.forks.length > 0 && <span className="font-mono text-fuchsia-400">+{s.forks.length} forks</span>}
      </div>
      <div className="ml-auto flex items-center gap-3">
        {s.worldError ? (
          <div className="flex items-center gap-1.5 text-rose-400"><AlertTriangle className="h-3 w-3" /><span>{s.worldError}</span></div>
        ) : hasWorld ? (
          <div className="flex items-center gap-1.5 text-emerald-400"><CheckCircle2 className="h-3 w-3" /><span>world ready</span></div>
        ) : null}
        <Sep />
        <div className="flex items-center gap-1.5"><Activity className="h-3 w-3 text-zinc-600" /><span className={cn('font-mono', fpsColor)}>{fps} FPS</span><span className="font-mono text-zinc-600">{s.perf.drawCalls}dc</span></div>
        <Sep />
        <div className="flex items-center gap-1.5"><Cpu className="h-3 w-3 text-zinc-600" /><span className="font-mono text-zinc-400">{s.perf.triangles.toLocaleString()} tris</span></div>
        <Sep />
        <div className="flex items-center gap-1.5"><MapPin className="h-3 w-3 text-zinc-600" /><span className="font-mono text-zinc-400">{hasWorld ? `${s.settlement!.villageNameHanzi} ${s.settlement!.villageName}` : 'no world'}</span></div>
      </div>
    </div>
  );
}

function Sep() { return <span className="h-3 w-px bg-zinc-800" />; }

function Stat({ icon: Icon, label, value, mono, accent, truncate }: {
  icon: React.ComponentType<{ className?: string }>;
  label: string; value: string; mono?: boolean; accent?: 'emerald' | 'amber' | 'rose'; truncate?: boolean;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <Icon className="h-3 w-3 text-zinc-600" />
      <span className="text-zinc-600">{label}</span>
      <span className={cn(mono && 'font-mono',
        accent === 'emerald' && 'text-emerald-400', accent === 'amber' && 'text-amber-400', accent === 'rose' && 'text-rose-400',
        !accent && 'text-zinc-300', truncate && 'max-w-[140px] truncate')}>{value}</span>
    </div>
  );
}
