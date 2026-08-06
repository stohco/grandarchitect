/**
 * Live Architect Studio — Simulation Control Panel
 *
 * World execution state indicator, step controls with granularity,
 * 12 simulation domain toggles, world branches, and recent transactions.
 */

import { Cpu, Clock, Sun, Calendar, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useEditorStore } from '@/lib/editor/store';
import type { SimulationDomain, WorldExecutionState } from '@/lib/editor/types';

const DOMAIN_LABELS: Record<SimulationDomain, string> = {
  physics: 'Physics', animation: 'Animation', ai: 'AI', ecology: 'Ecology', economy: 'Economy',
  weather: 'Weather', history: 'History', combat: 'Combat', cultivation: 'Cultivation',
  social: 'Social', audio: 'Audio', navigation: 'Navigation',
};

const DOMAIN_COLORS: Record<SimulationDomain, string> = {
  physics: 'border-red-500/50 bg-red-500/5', animation: 'border-orange-500/50 bg-orange-500/5',
  ai: 'border-amber-500/50 bg-amber-500/5', ecology: 'border-green-500/50 bg-green-500/5',
  economy: 'border-emerald-500/50 bg-emerald-500/5', weather: 'border-cyan-500/50 bg-cyan-500/5',
  history: 'border-blue-500/50 bg-blue-500/5', combat: 'border-red-400/50 bg-red-400/5',
  cultivation: 'border-purple-500/50 bg-purple-500/5', social: 'border-pink-500/50 bg-pink-500/5',
  audio: 'border-yellow-500/50 bg-yellow-500/5', navigation: 'border-teal-500/50 bg-teal-500/5',
};

const DOMAIN_ACTIVE_COLORS: Record<SimulationDomain, string> = {
  physics: 'text-red-400', animation: 'text-orange-400', ai: 'text-amber-400',
  ecology: 'text-green-400', economy: 'text-emerald-400', weather: 'text-cyan-400',
  history: 'text-blue-400', combat: 'text-red-300', cultivation: 'text-purple-400',
  social: 'text-pink-400', audio: 'text-yellow-400', navigation: 'text-teal-400',
};

const ALL_DOMAINS: SimulationDomain[] = [
  'physics', 'animation', 'ai', 'ecology', 'economy', 'weather',
  'history', 'combat', 'cultivation', 'social', 'audio', 'navigation',
];

const STATE_LABELS: Record<WorldExecutionState, string> = {
  generation_freeze: 'Generation Freeze', dormant_architect: 'Dormant Architect',
  selective_awakening: 'Selective Awakening', step_simulation: 'Step Simulation',
  full_simulation: 'Full Simulation', player_embodiment: 'Player Embodiment',
  temporary_fork: 'Temporary Fork',
};

const STATE_COLORS: Record<WorldExecutionState, string> = {
  generation_freeze: 'text-zinc-400 border-zinc-500/30', dormant_architect: 'text-amber-400 border-amber-500/30',
  selective_awakening: 'text-blue-400 border-blue-500/30', step_simulation: 'text-emerald-400 border-emerald-500/30',
  full_simulation: 'text-green-400 border-green-500/30', player_embodiment: 'text-purple-400 border-purple-500/30',
  temporary_fork: 'text-orange-400 border-orange-500/30',
};

export default function SimulationPanel() {
  const worldState = useEditorStore((s) => s.worldState);
  const domains = useEditorStore((s) => s.domains);
  const toggleDomain = useEditorStore((s) => s.toggleDomain);
  const step = useEditorStore((s) => s.step);
  const stepping = useEditorStore((s) => s.stepping);
  const frozenTick = useEditorStore((s) => s.frozenTick);
  const branches = useEditorStore((s) => s.branches);
  const transactions = useEditorStore((s) => s.transactions);
  const activeDomainCount = domains.filter((d) => d.active).length;

  return (
    <div className="flex h-full gap-3 p-3">
      <ScrollArea className="w-64 shrink-0">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Cpu className="h-3.5 w-3.5 text-emerald-400" />
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#8888aa]">Simulation</span>
            <Badge variant="outline" className="h-4 border-[#2a2a4a] bg-[#1a1a2e] text-[9px] text-emerald-300">{activeDomainCount} domains</Badge>
            <Badge variant="outline" className="h-4 border-[#2a2a4a] bg-[#1a1a2e] text-[9px] text-[#aaaacc]">tick {frozenTick}</Badge>
          </div>

          <div className={`rounded-lg border p-2.5 ${STATE_COLORS[worldState]}`}>
            <span className="text-[10px] font-medium uppercase text-[#5a5a7a]">World State</span>
            <div className="mt-0.5 text-sm font-semibold">{STATE_LABELS[worldState]}</div>
          </div>

          <div>
            <span className="mb-1.5 block text-[10px] font-semibold uppercase text-[#5a5a7a]">Step Forward</span>
            <div className="flex items-center gap-1">
              <Button variant="outline" size="sm" className="h-6 gap-1 border-[#2a2a4a] bg-[#1a1a2e] text-[10px] text-[#8888aa] hover:text-white" onClick={() => step('physics_tick', 1)} disabled={stepping}><Zap className="h-3 w-3" />Tick</Button>
              <Button variant="outline" size="sm" className="h-6 gap-1 border-[#2a2a4a] bg-[#1a1a2e] text-[10px] text-[#8888aa] hover:text-white" onClick={() => step('hour', 1)} disabled={stepping}><Clock className="h-3 w-3" />Hour</Button>
              <Button variant="outline" size="sm" className="h-6 gap-1 border-[#2a2a4a] bg-[#1a1a2e] text-[10px] text-[#8888aa] hover:text-white" onClick={() => step('day', 1)} disabled={stepping}><Sun className="h-3 w-3" />Day</Button>
              <Button variant="outline" size="sm" className="h-6 gap-1 border-[#2a2a4a] bg-[#1a1a2e] text-[10px] text-[#8888aa] hover:text-white" onClick={() => step('month', 1)} disabled={stepping}><Calendar className="h-3 w-3" />Month</Button>
            </div>
            <div className="mt-1 flex items-center gap-1">
              {stepping && <span className="text-[10px] text-amber-400 animate-pulse">Stepping…</span>}
            </div>
            <div className="mt-1.5 flex items-center gap-1">
              {([['1h', 'hour', 1], ['10h', 'hour', 10], ['100h', 'hour', 100], ['30d', 'day', 30]] as const).map(([label, gran, count]) => (
                <button key={label} className="rounded px-1.5 py-0.5 text-[9px] text-[#5a5a7a] hover:bg-[#1e1e3e] hover:text-[#aaaacc]" onClick={() => step(gran, count)} disabled={stepping}>{label}</button>
              ))}
            </div>
          </div>

          <div>
            <span className="mb-1.5 block text-[10px] font-semibold uppercase text-[#5a5a7a]">Simulation Domains</span>
            <div className="grid grid-cols-2 gap-1.5">
              {ALL_DOMAINS.map((domain) => {
                const activation = domains.find((d) => d.domain === domain);
                const active = activation?.active ?? false;
                return (
                  <button key={domain} className={`flex items-center gap-1.5 rounded-lg border p-2 text-left transition-colors ${active ? `${DOMAIN_COLORS[domain]} ${DOMAIN_ACTIVE_COLORS[domain]}` : 'border-[#2a2a4a] bg-[#0e0e24] text-[#5a5a7a] hover:border-[#3a3a5a]'}`} onClick={() => toggleDomain(domain)}>
                    <span className={`h-1.5 w-1.5 rounded-full ${active ? DOMAIN_ACTIVE_COLORS[domain].replace('text-', 'bg-') : 'bg-[#3a3a5a]'}`} />
                    <span className="text-[10px] font-medium">{DOMAIN_LABELS[domain]}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </ScrollArea>

      <ScrollArea className="min-h-0 flex-1">
        <div className="space-y-3">
          <div>
            <span className="mb-1.5 block text-[10px] font-semibold uppercase text-[#5a5a7a]">World Branches</span>
            <div className="space-y-1">
              {branches.map((b) => (
                <div key={b.branchId} className="flex items-center gap-2 rounded border border-[#2a2a4a] bg-[#0e0e24] px-2 py-1.5 text-[11px]">
                  <span className={`h-1.5 w-1.5 rounded-full ${b.isFork ? 'bg-orange-400' : 'bg-emerald-500'}`} />
                  <span className="font-medium text-[#c8c8e0]">{b.name}</span>
                  <span className="ml-auto text-[9px] text-[#4a4a6a]">{b.transactionCount} tx</span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <span className="mb-1.5 block text-[10px] font-semibold uppercase text-[#5a5a7a]">Recent Transactions</span>
            <div className="space-y-1">
              {transactions.length === 0 ? (
                <div className="py-2 text-center text-[11px] text-[#5a5a7a]">No transactions yet.</div>
              ) : (
                transactions.slice(0, 20).map((tx) => (
                  <div key={tx.transactionId} className={`rounded border border-[#2a2a4a] bg-[#0e0e24] px-2 py-1.5 text-[11px] ${tx.undone ? 'opacity-40' : ''}`}>
                    <div className="flex items-center gap-1.5">
                      <span className={`h-1.5 w-1.5 rounded-full ${tx.requestedBy === 'user' ? 'bg-blue-400' : 'bg-purple-400'}`} />
                      <span className="truncate text-[10px] font-medium text-[#aaaacc]">{tx.originalRequest}</span>
                    </div>
                    <div className="mt-0.5 ml-3 text-[9px] text-[#4a4a6a]">{tx.toolsUsed.join(', ')} · {tx.affectedSystems.length} systems</div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
