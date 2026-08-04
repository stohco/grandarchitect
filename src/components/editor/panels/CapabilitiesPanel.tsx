'use client';

/**
 * CapabilitiesPanel — plugin catalogue + architect roles.
 *
 * Static data: 15 plugins across 3 categories (Determinism, Reference,
 * Simulation) plus 8 architect roles. Filter by category button row, a
 * search input that matches plugin id or capability id, and a collapsible
 * Architect Roles section at the bottom.
 */

import { useMemo, useState } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Search,
  Puzzle,
  Users,
  ChevronDown,
  ChevronRight,
  Filter,
} from 'lucide-react';

type PluginCategory = 'Determinism' | 'Reference' | 'Simulation';

interface Plugin {
  id: string;
  version: string;
  category: PluginCategory;
  loc: number;
  capabilities: string[];
  blurb: string;
}

interface ArchitectRole {
  id: string;
  title: string;
  hanzi: string;
  domain: string;
  capabilities: string[];
  blurb: string;
}

const PLUGINS: Plugin[] = [
  { id: 'kernel', version: '0.9.3', category: 'Determinism', loc: 4280, capabilities: ['kernel.tick', 'kernel.transaction', 'kernel.freeze', 'kernel.fork'], blurb: 'Core engine: tick loop, transaction ledger, world-state machine.' },
  { id: 'rng.xoshiro', version: '1.0.0', category: 'Determinism', loc: 410, capabilities: ['rng.nextDouble', 'rng.nextIntRange', 'rng.pick'], blurb: 'xoshiro256** seeded RNG + splitmix64 seeder.' },
  { id: 'determinism.harness', version: '0.6.2', category: 'Determinism', loc: 720, capabilities: ['harness.replay', 'harness.fingerprint', 'harness.snapshot'], blurb: 'Replay harness + state fingerprinting for deterministic verification.' },
  { id: 'determinism.hash', version: '0.4.1', category: 'Determinism', loc: 380, capabilities: ['hash.sha256', 'hash.fingerprint'], blurb: 'SHA-256 via @noble/hashes, used for seed + claim fingerprints.' },
  { id: 'determinism.serialize', version: '0.3.0', category: 'Determinism', loc: 290, capabilities: ['serialize.toCanonical', 'serialize.fromCanonical'], blurb: 'Canonical JSON serialiser — order-stable, no Map/Set/BigInt.' },
  { id: 'reference.entity-pool', version: '1.2.0', category: 'Reference', loc: 950, capabilities: ['pool.spawn', 'pool.disable', 'pool.enable', 'pool.findAll'], blurb: 'SoA typed-array entity storage. 10k entities in <10ms.' },
  { id: 'reference.scheduler', version: '0.8.0', category: 'Reference', loc: 620, capabilities: ['scheduler.frame', 'scheduler.tickBudget', 'scheduler.domainGate'], blurb: 'Frame loop + per-domain tick gating.' },
  { id: 'reference.world-gen', version: '0.7.4', category: 'Reference', loc: 1450, capabilities: ['world.gen.settlement', 'world.gen.households', 'world.gen.structures'], blurb: 'Seeded village layout generator (Wang Family Bend et al.).' },
  { id: 'reference.asset-registry', version: '0.5.0', category: 'Reference', loc: 540, capabilities: ['asset.register', 'asset.lookup', 'asset.kindColor'], blurb: 'Definition registry: realms, techniques, locations, deviations.' },
  { id: 'simulation.physics', version: '0.6.1', category: 'Simulation', loc: 1820, capabilities: ['physics.step', 'physics.collide', 'physics.characterController'], blurb: 'Collision detection + character controller.' },
  { id: 'simulation.ecology', version: '0.4.0', category: 'Simulation', loc: 1240, capabilities: ['ecology.tickFlora', 'ecology.tickFauna', 'ecology.qiFlow'], blurb: 'Flora/fauna lifecycle + qi flows.' },
  { id: 'simulation.combat', version: '0.3.2', category: 'Simulation', loc: 1560, capabilities: ['combat.formation', 'combat.ability', 'combat.resolve'], blurb: 'ga-combat: formations, abilities, phase resolution.' },
  { id: 'simulation.cultivation', version: '0.3.0', category: 'Simulation', loc: 1380, capabilities: ['cultivation.breakthrough', 'cultivation.tribulation', 'cultivation.qiCondense'], blurb: 'Breakthroughs, tribulations, qi condensation (ga-cultivation).' },
  { id: 'simulation.quest', version: '0.2.5', category: 'Simulation', loc: 980, capabilities: ['quest.spawn', 'quest.advance', 'quest.resolve'], blurb: 'ga-quest: narrative arcs + objective tracking.' },
  { id: 'simulation.economy', version: '0.2.0', category: 'Simulation', loc: 760, capabilities: ['economy.adjustSupply', 'economy.tradeRoute', 'economy.price'], blurb: 'Market supply, trade routes, price discovery.' },
];

const ROLES: ArchitectRole[] = [
  { id: 'cartographer', title: 'The Cartographer', hanzi: '地師', domain: 'Layout', capabilities: ['world.gen.structures', 'entity.transform'], blurb: 'Maps the bend, places structures, draws paths between them.' },
  { id: 'chronicler', title: 'The Chronicler', hanzi: '史官', domain: 'History', capabilities: ['world.query_history', 'narrative.inject_event'], blurb: 'Records every event, writes the lineage ledger for posterity.' },
  { id: 'horticulturist', title: 'The Horticulturist', hanzi: '園丁', domain: 'Ecology', capabilities: ['ecology.tickFlora', 'weather.set_pattern'], blurb: 'Tends paddies, dryland gardens, and the qi of the soil.' },
  { id: 'mason', title: 'The Mason', hanzi: '匠師', domain: 'Construction', capabilities: ['entity.spawn', 'entity.set_metadata'], blurb: 'Raises lineage halls, shrines, and mills from foundation stones.' },
  { id: 'herbalist', title: 'The Herbalist', hanzi: '丹師', domain: 'Cultivation', capabilities: ['cultivation.breakthrough', 'cultivation.qiCondense'], blurb: 'Grants breakthroughs, refines pills, and counsels tribulations.' },
  { id: 'marshal', title: 'The Marshal', hanzi: '元帥', domain: 'Combat', capabilities: ['combat.formation', 'combat.ability'], blurb: 'Orchestrates formations, governs phase combat.' },
  { id: 'ferryman', title: 'The Ferryman', hanzi: '渡者', domain: 'Branching', capabilities: ['world.fork', 'world.merge'], blurb: 'Opens forks for what-if exploration, navigates between worlds.' },
  { id: 'archivist', title: 'The Archivist', hanzi: '典藏者', domain: 'Lore', capabilities: ['world.query_state', 'narrative.spawn_quest'], blurb: 'Lore lookup, contradiction detection, canonical claim registry.' },
];

const CATEGORY_COLOR: Record<PluginCategory, string> = {
  Determinism: '#a855f7',
  Reference: '#10b981',
  Simulation: '#d4a04a',
};

type Filter = 'All' | PluginCategory;
const FILTERS: Filter[] = ['All', 'Determinism', 'Reference', 'Simulation'];

export default function CapabilitiesPanel() {
  const [filter, setFilter] = useState<Filter>('All');
  const [search, setSearch] = useState('');
  const [rolesOpen, setRolesOpen] = useState(false);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return PLUGINS.filter((p) => {
      if (filter !== 'All' && p.category !== filter) return false;
      if (!q) return true;
      if (p.id.toLowerCase().includes(q)) return true;
      return p.capabilities.some((c) => c.toLowerCase().includes(q));
    });
  }, [filter, search]);

  const totalLoc = PLUGINS.reduce((s, p) => s + p.loc, 0);

  return (
    <div className="flex h-full flex-col bg-[#0e0e24]">
      {/* Header */}
      <div className="flex h-8 items-center justify-between border-b border-[#2a2a4a] px-3">
        <div className="flex items-center gap-1.5">
          <Puzzle className="h-3.5 w-3.5 text-emerald-500" />
          <span className="text-[10px] uppercase tracking-wider text-[#5a5a7a]">
            Capabilities · {PLUGINS.length} plugins · {(totalLoc / 1000).toFixed(1)}k LOC
          </span>
        </div>
        <div className="relative w-40">
          <Search className="absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-[#5a5a7a]" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter by id or capability…"
            className="h-6 w-full rounded border border-[#2a2a4a] bg-[#12122a] pl-7 pr-2 text-[11px] text-[#c8c8e0] placeholder:text-[#5a5a7a] focus:outline-none focus:border-emerald-500/50"
          />
        </div>
      </div>

      {/* Category filter row */}
      <div className="flex items-center gap-1.5 border-b border-[#2a2a4a] bg-[#12122a] px-3 py-1.5">
        <Filter className="h-3 w-3 text-[#5a5a7a]" />
        {FILTERS.map((f) => {
          const active = filter === f;
          const color = f === 'All' ? '#8888aa' : CATEGORY_COLOR[f];
          return (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider transition-colors ${
                active
                  ? 'border-transparent text-white'
                  : 'border-[#2a2a4a] bg-[#0e0e24] text-[#8888aa] hover:border-[#3a3a5a]'
              }`}
              style={active ? { background: `${color}22`, color, borderColor: `${color}55` } : undefined}
            >
              {f}
            </button>
          );
        })}
        <span className="ml-auto text-[10px] text-[#5a5a7a]">
          {filtered.length} shown
        </span>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-3">
          {/* Plugin cards */}
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {filtered.map((p) => {
              const color = CATEGORY_COLOR[p.category];
              return (
                <div
                  key={p.id}
                  className="rounded border border-[#2a2a4a] bg-[#12122a] p-2 transition-colors hover:border-[#3a3a5a]"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate font-mono text-[11px] font-medium text-[#c8c8e0]">
                      {p.id}
                    </span>
                    <span
                      className="shrink-0 rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider"
                      style={{ background: `${color}22`, color }}
                    >
                      {p.category}
                    </span>
                  </div>
                  <div className="mt-0.5 flex items-center gap-2 text-[9px] text-[#5a5a7a]">
                    <span className="font-mono">v{p.version}</span>
                    <span>·</span>
                    <span>{p.loc.toLocaleString()} LOC</span>
                  </div>
                  <p className="mt-1 text-[10px] leading-snug text-[#8888aa]">{p.blurb}</p>
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {p.capabilities.map((c) => (
                      <span
                        key={c}
                        className="rounded bg-[#0e0e24] px-1.5 py-0.5 font-mono text-[9px] text-[#8888aa]"
                      >
                        {c}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
            {filtered.length === 0 && (
              <p className="col-span-full py-6 text-center text-[11px] text-[#5a5a7a]">
                No plugins match the current filter.
              </p>
            )}
          </div>

          {/* Architect Roles (collapsible) */}
          <div className="mt-4 overflow-hidden rounded border border-[#2a2a4a] bg-[#12122a]">
            <button
              onClick={() => setRolesOpen((v) => !v)}
              className="flex w-full items-center justify-between px-3 py-2 text-left hover:bg-[#1d1d36]"
            >
              <span className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-[#8888aa]">
                <Users className="h-3 w-3 text-purple-400" />
                Architect Roles · {ROLES.length}
              </span>
              {rolesOpen ? (
                <ChevronDown className="h-3.5 w-3.5 text-[#5a5a7a]" />
              ) : (
                <ChevronRight className="h-3.5 w-3.5 text-[#5a5a7a]" />
              )}
            </button>
            {rolesOpen && (
              <div className="grid grid-cols-1 gap-1.5 border-t border-[#2a2a4a] p-2 sm:grid-cols-2">
                {ROLES.map((r) => (
                  <div
                    key={r.id}
                    className="rounded border border-[#2a2a4a] bg-[#0e0e24] p-2"
                  >
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="text-[11px] font-medium text-[#c8c8e0]">{r.title}</span>
                      <span className="font-mono text-[10px] text-purple-300">{r.hanzi}</span>
                    </div>
                    <div className="mt-0.5 text-[9px] uppercase tracking-wider text-[#5a5a7a]">
                      {r.domain}
                    </div>
                    <p className="mt-1 text-[10px] leading-snug text-[#8888aa]">{r.blurb}</p>
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {r.capabilities.map((c) => (
                        <span
                          key={c}
                          className="rounded bg-[#12122a] px-1.5 py-0.5 font-mono text-[9px] text-[#8888aa]"
                        >
                          {c}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
