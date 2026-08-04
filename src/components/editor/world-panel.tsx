/**
 * Live Architect Studio — World Panel (Dormant World Runtime control room)
 */

'use client';

import { useState } from 'react';
import { useEditorStore } from '@/lib/editor/store';
import type { WorldExecutionState, SimulationDomain } from '@/lib/editor/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Sparkles, Loader2, Snowflake, Moon, Eye, StepForward, Play, User, GitFork,
  Atom, Film, Brain, Leaf, Coins, CloudRain, Scroll, Swords, Flame, Users, Volume2, Navigation, Pause,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const VALID_TRANSITIONS: Record<WorldExecutionState, WorldExecutionState[]> = {
  generation_freeze: ['dormant_architect', 'full_simulation', 'temporary_fork'],
  dormant_architect: ['generation_freeze', 'selective_awakening', 'step_simulation', 'full_simulation', 'player_embodiment', 'temporary_fork'],
  selective_awakening: ['dormant_architect', 'step_simulation', 'full_simulation', 'player_embodiment', 'temporary_fork'],
  step_simulation: ['dormant_architect', 'selective_awakening', 'full_simulation'],
  full_simulation: ['dormant_architect', 'selective_awakening', 'step_simulation', 'player_embodiment', 'temporary_fork'],
  player_embodiment: ['dormant_architect', 'full_simulation', 'selective_awakening'],
  temporary_fork: ['dormant_architect', 'full_simulation'],
};

const STATES: { id: WorldExecutionState; label: string; desc: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'generation_freeze', label: 'Generation Freeze', desc: 'Frozen after generation', icon: Snowflake },
  { id: 'dormant_architect', label: 'Dormant Architect', desc: 'Editor active, sim stopped', icon: Moon },
  { id: 'selective_awakening', label: 'Selective Awakening', desc: 'Chosen domains only', icon: Eye },
  { id: 'step_simulation', label: 'Step Simulation', desc: 'Single-step debugging', icon: StepForward },
  { id: 'full_simulation', label: 'Full Simulation', desc: 'Normal gameplay', icon: Play },
  { id: 'player_embodiment', label: 'Player Embodiment', desc: 'Player spawned in', icon: User },
  { id: 'temporary_fork', label: 'Temporary Fork', desc: 'Forked test snapshot', icon: GitFork },
];

const DOMAIN_ICONS: Record<SimulationDomain, React.ComponentType<{ className?: string }>> = {
  physics: Atom, animation: Film, ai: Brain, ecology: Leaf, economy: Coins, weather: CloudRain,
  history: Scroll, combat: Swords, cultivation: Flame, social: Users, audio: Volume2, navigation: Navigation,
};

const PRESET_SEEDS = ['wang-family-bend-1108', 'lotus-pond-42', 'iron-bridge-7', 'misty-valley-99'];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border-b border-zinc-800 p-3">
      <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">{title}</div>
      {children}
    </div>
  );
}

export default function WorldPanel() {
  const s = useEditorStore();
  const [stepVal, setStepVal] = useState('physics_tick|1');
  const canStep = s.worldState === 'step_simulation' || s.worldState === 'selective_awakening' || s.worldState === 'dormant_architect';

  return (
    <div className="dark h-full overflow-y-auto bg-zinc-950 text-zinc-300 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-zinc-700">
      <div className="flex items-center justify-between border-b border-zinc-800 px-3 py-2">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">World Runtime</span>
        <Button size="sm" onClick={s.toggleSim} disabled={!s.settlement} className="h-6 gap-1 bg-emerald-600 text-[11px] hover:bg-emerald-500">
          {s.simRunning ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}{s.simRunning ? 'Pause' : 'Play'}
        </Button>
      </div>

      <Section title="World Generation">
        <div className="flex gap-1.5">
          <div className="relative flex-1">
            <Sparkles className="absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-emerald-400" />
            <Input value={s.seedInput} onChange={(e) => s.setSeedInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') s.generateWorld(); }} placeholder="seed" className="h-7 border-zinc-800 bg-zinc-900 pl-7 font-mono text-xs text-zinc-200" />
          </div>
          <Button size="sm" onClick={() => s.generateWorld()} disabled={s.loadingWorld} className="h-7 gap-1 bg-emerald-600 text-xs hover:bg-emerald-500">
            {s.loadingWorld ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}Gen
          </Button>
        </div>
        {s.worldError && <p className="mt-1.5 text-[11px] text-rose-400">{s.worldError}</p>}
        <div className="mt-2 flex flex-wrap gap-1">
          {PRESET_SEEDS.map((seed) => (
            <button key={seed} onClick={() => s.setSeedInput(seed)} className="rounded border border-zinc-800 bg-zinc-900 px-1.5 py-0.5 font-mono text-[10px] text-zinc-500 hover:border-emerald-500/40 hover:text-emerald-300">{seed}</button>
          ))}
        </div>
        {s.settlement && (
          <div className="mt-2 grid grid-cols-2 gap-1.5 text-[11px]">
            <div className="rounded border border-zinc-800 bg-zinc-900 p-1.5"><div className="text-zinc-600">Village</div><div className="text-zinc-200">{s.settlement.villageNameHanzi} {s.settlement.villageName}</div></div>
            <div className="rounded border border-zinc-800 bg-zinc-900 p-1.5"><div className="text-zinc-600">Structures</div><div className="font-mono text-zinc-200">{s.settlement.structures.length}</div></div>
            <div className="rounded border border-zinc-800 bg-zinc-900 p-1.5"><div className="text-zinc-600">Households</div><div className="font-mono text-zinc-200">{s.settlement.householdCount}</div></div>
            <div className="rounded border border-zinc-800 bg-zinc-900 p-1.5"><div className="text-zinc-600">Population</div><div className="font-mono text-zinc-200">{s.settlement.population}</div></div>
          </div>
        )}
      </Section>

      <Section title="Execution State">
        <div className="grid grid-cols-2 gap-1.5">
          {STATES.map((st) => {
            const valid = VALID_TRANSITIONS[s.worldState]?.includes(st.id);
            const isCurrent = s.worldState === st.id;
            return (
              <button key={st.id} disabled={!valid || isCurrent} onClick={() => s.requestWorldState(st.id)}
                className={cn('flex items-start gap-1.5 rounded border p-1.5 text-left transition-colors',
                  isCurrent ? 'border-emerald-500/50 bg-emerald-500/15' : valid ? 'border-zinc-800 bg-zinc-900 hover:border-emerald-500/30 hover:bg-zinc-800' : 'cursor-not-allowed border-zinc-900 bg-zinc-950 opacity-40')}>
                <st.icon className={cn('mt-0.5 h-3.5 w-3.5 shrink-0', isCurrent ? 'text-emerald-400' : 'text-zinc-500')} />
                <div className="min-w-0">
                  <div className={cn('text-[11px] font-medium', isCurrent ? 'text-emerald-200' : 'text-zinc-300')}>{st.label}</div>
                  <div className="text-[10px] leading-tight text-zinc-600">{st.desc}</div>
                </div>
              </button>
            );
          })}
        </div>
      </Section>

      <Section title="Step Simulation">
        <div className="mb-2 flex items-center gap-2">
          <span className="text-[11px] text-zinc-500">Frozen Tick</span>
          <span className="font-mono text-sm text-emerald-400">{s.frozenTick.toLocaleString()}</span>
        </div>
        <div className="flex gap-1.5">
          <Select value={stepVal} onValueChange={setStepVal} disabled={!canStep}>
            <SelectTrigger className="h-7 flex-1 border-zinc-800 bg-zinc-900 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent className="border-zinc-800 bg-zinc-950 text-xs">
              <SelectItem value="physics_tick|1">Physics Tick ×1</SelectItem>
              <SelectItem value="physics_tick|60">Physics Tick ×60</SelectItem>
              <SelectItem value="ai_decision|1">AI Decision ×1</SelectItem>
              <SelectItem value="combat_turn|1">Combat Turn ×1</SelectItem>
              <SelectItem value="minute|1">Minute ×1</SelectItem>
              <SelectItem value="hour|1">Hour ×1</SelectItem>
              <SelectItem value="day|1">Day ×1</SelectItem>
              <SelectItem value="month|1">Month ×1</SelectItem>
              <SelectItem value="year|1">Year ×1</SelectItem>
            </SelectContent>
          </Select>
          <Button size="sm" onClick={() => { const [g, c] = stepVal.split('|'); s.step(g, parseInt(c, 10)); }} disabled={!canStep || s.stepping} className="h-7 gap-1 bg-cyan-700 text-xs hover:bg-cyan-600">
            {s.stepping ? <Loader2 className="h-3 w-3 animate-spin" /> : <StepForward className="h-3 w-3" />}Step
          </Button>
        </div>
        <div className="mt-2 flex items-center gap-1.5">
          <Button size="sm" variant="outline" onClick={() => s.forkWorld()} disabled={!s.settlement} className="h-6 gap-1 border-zinc-800 bg-zinc-900 text-[11px] text-amber-300 hover:bg-zinc-800">
            <GitFork className="h-3 w-3" />Fork World
          </Button>
          {s.forks.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {s.forks.map((f) => <Badge key={f} variant="secondary" className="h-5 bg-fuchsia-500/15 text-[10px] text-fuchsia-300">{f}</Badge>)}
            </div>
          )}
        </div>
      </Section>

      <Section title="Simulation Domains">
        <div className="mb-2 text-[11px] text-zinc-500">{s.domains.filter((d) => d.active).length}/12 active</div>
        <div className="grid grid-cols-3 gap-1">
          {s.domains.map((d) => {
            const Icon = DOMAIN_ICONS[d.domain];
            return (
              <button key={d.domain} onClick={() => s.toggleDomain(d.domain)}
                className={cn('flex flex-col items-center gap-0.5 rounded border p-1.5 text-[10px] transition-colors',
                  d.active ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300' : 'border-zinc-800 bg-zinc-900 text-zinc-500 hover:bg-zinc-800')}>
                <Icon className="h-3.5 w-3.5" />
                <span className="capitalize">{d.domain}</span>
              </button>
            );
          })}
        </div>
      </Section>
      <Separator className="bg-zinc-800" />
    </div>
  );
}
