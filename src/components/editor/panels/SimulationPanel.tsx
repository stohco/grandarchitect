'use client';

/**
 * SimulationPanel — world-state machine controls + 12 domain toggles.
 *
 * Top half: a row of the seven WorldExecutionState buttons (only one
 * active at a time). Bottom half: a 2-column grid of the twelve
 * SimulationDomain switches, plus a step button and a fork button.
 */

import { useEditorStore } from '@/lib/editor/store';
import {
  ALL_DOMAINS,
  SimulationDomain,
  WORLD_STATE_LABEL,
  WorldExecutionState,
} from '@/lib/editor/types';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { SkipForward, GitFork, Cpu, Layers3, Activity } from 'lucide-react';

const STATE_ORDER: WorldExecutionState[] = [
  'generation_freeze',
  'dormant_architect',
  'selective_awakening',
  'step_simulation',
  'full_simulation',
  'player_embodiment',
  'temporary_fork',
];

const STATE_COLOR: Record<WorldExecutionState, string> = {
  generation_freeze: '#5a5a7a',
  dormant_architect: '#8888aa',
  selective_awakening: '#facc15',
  step_simulation: '#d4a04a',
  full_simulation: '#10b981',
  player_embodiment: '#a855f7',
  temporary_fork: '#f472b6',
};

const DOMAIN_ICON: Partial<Record<SimulationDomain, React.ReactNode>> = {
  physics: <Cpu className="h-3 w-3" />,
  animation: <Activity className="h-3 w-3" />,
  ai: <Layers3 className="h-3 w-3" />,
};

export default function SimulationPanel() {
  const worldState = useEditorStore((s) => s.worldState);
  const requestWorldState = useEditorStore((s) => s.requestWorldState);
  const domainActivations = useEditorStore((s) => s.domainActivations);
  const toggleDomain = useEditorStore((s) => s.toggleDomain);
  const step = useEditorStore((s) => s.step);
  const isStepping = useEditorStore((s) => s.isStepping);
  const forkWorld = useEditorStore((s) => s.forkWorld);
  const frozenTick = useEditorStore((s) => s.frozenTick);

  const activeCount = ALL_DOMAINS.filter((d) => domainActivations[d]).length;

  return (
    <div className="flex h-full flex-col bg-[#0e0e24]">
      {/* Header */}
      <div className="flex h-8 items-center justify-between border-b border-[#2a2a4a] px-3">
        <span className="text-[10px] uppercase tracking-wider text-[#5a5a7a]">
          Simulation Control · tick {frozenTick}
        </span>
        <div className="flex gap-1.5">
          <Button
            size="sm"
            variant="outline"
            onClick={() => void step()}
            disabled={isStepping}
            className="h-6 border-[#2a2a4a] bg-[#12122a] px-2 text-[10px] text-[#c8c8e0] hover:bg-[#1d1d36]"
          >
            <SkipForward className="h-3 w-3" /> Step
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={forkWorld}
            className="h-6 border-[#2a2a4a] bg-[#12122a] px-2 text-[10px] text-[#c8c8e0] hover:bg-[#1d1d36]"
          >
            <GitFork className="h-3 w-3" /> Fork
          </Button>
        </div>
      </div>

      <ScrollArea className="min-h-0 flex-1">
        <div className="p-3">
          {/* World state machine */}
          <section className="mb-4">
            <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-[#5a5a7a]">
              World Execution State
            </h3>
            <div className="grid grid-cols-1 gap-1">
              {STATE_ORDER.map((s) => {
                const active = worldState === s;
                const color = STATE_COLOR[s];
                return (
                  <button
                    key={s}
                    onClick={() => requestWorldState(s)}
                    className={`flex items-center justify-between rounded border px-2.5 py-1.5 text-left text-xs transition-colors ${
                      active
                        ? 'border-transparent'
                        : 'border-[#2a2a4a] bg-[#12122a] text-[#8888aa] hover:border-[#3a3a5a]'
                    }`}
                    style={active ? { background: `${color}22`, color, borderColor: `${color}55` } : undefined}
                  >
                    <span className="flex items-center gap-2">
                      <span
                        className="h-1.5 w-1.5 rounded-full"
                        style={{ background: color }}
                      />
                      {WORLD_STATE_LABEL[s]}
                    </span>
                    {active && <span className="text-[9px] uppercase">active</span>}
                  </button>
                );
              })}
            </div>
          </section>

          {/* Domains */}
          <section>
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-[10px] font-semibold uppercase tracking-wider text-[#5a5a7a]">
                Simulation Domains
              </h3>
              <span className="text-[10px] text-[#5a5a7a]">{activeCount}/{ALL_DOMAINS.length} active</span>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {ALL_DOMAINS.map((d) => {
                const on = domainActivations[d];
                return (
                  <div
                    key={d}
                    className={`flex items-center justify-between rounded border px-2 py-1.5 ${
                      on
                        ? 'border-emerald-500/40 bg-emerald-500/5'
                        : 'border-[#2a2a4a] bg-[#12122a]'
                    }`}
                  >
                    <span className="flex items-center gap-1.5 text-[11px] text-[#c8c8e0]">
                      <span className={on ? 'text-emerald-400' : 'text-[#5a5a7a]'}>
                        {DOMAIN_ICON[d] ?? <Layers3 className="h-3 w-3" />}
                      </span>
                      <span className="capitalize">{d}</span>
                    </span>
                    <Switch checked={on} onCheckedChange={() => toggleDomain(d)} className="scale-75" />
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      </ScrollArea>
    </div>
  );
}
