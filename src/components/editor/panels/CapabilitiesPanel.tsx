/**
 * Live Architect Studio — Capabilities Panel
 *
 * Capability registry explorer. Groups the 15 reference/simulation plugins
 * (PLUGINS) by category (determinism / reference / simulation), renders each
 * as a card with version, dependency count, capability chips, and lines of
 * code. A search input filters plugins by id or capability name. A summary
 * row at the top shows total plugin count and total capability count. The 8
 * Architect Roles are exposed in a collapsible section at the bottom.
 *
 * Palette: dark navy with emerald/amber/purple accents. No indigo or blue.
 */

'use client';

import { useState, useMemo } from 'react';
import {
  Layers,
  Search,
  Package,
  GitBranch,
  Lock,
  ChevronRight,
  ChevronDown,
  Cpu,
  Boxes,
  ShieldCheck,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  PLUGINS,
  ARCHITECT_ROLES,
  type PluginInfo,
  type ArchitectRoleInfo,
} from '@/lib/engine/dashboard-data';

// ----------------------------------------------------------------------------
// Category styling
// ----------------------------------------------------------------------------

type Category = PluginInfo['category'];

const CATEGORY_CFG: Record<
  Category,
  { label: string; badge: string; dot: string }
> = {
  determinism: {
    label: 'Determinism',
    badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    dot: 'bg-emerald-500',
  },
  reference: {
    label: 'Reference',
    badge: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
    dot: 'bg-purple-500',
  },
  simulation: {
    label: 'Simulation',
    badge: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    dot: 'bg-amber-500',
  },
};

const FILTER_TABS: { value: Category | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'determinism', label: 'Determinism' },
  { value: 'reference', label: 'Reference' },
  { value: 'simulation', label: 'Simulation' },
];

// ----------------------------------------------------------------------------
// Plugin card
// ----------------------------------------------------------------------------

function PluginCard({ plugin }: { plugin: PluginInfo }) {
  const cfg = CATEGORY_CFG[plugin.category];
  return (
    <div className="rounded-md border border-[#2a2a4a] bg-[#0a0a1e] p-2 transition-colors hover:border-[#3a3a5a]">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <Package className="h-3 w-3 shrink-0 text-[#8888aa]" />
            <span className="truncate font-mono text-[11px] font-semibold text-[#c8c8e0]">
              {plugin.id}
            </span>
          </div>
          <div className="mt-0.5 flex items-center gap-1.5 font-mono text-[9px] text-[#5a5a7a]">
            <span>v{plugin.version}</span>
            <span className="text-[#3a3a5a]">·</span>
            <span className="inline-flex items-center gap-0.5">
              <GitBranch className="h-2.5 w-2.5" />
              {plugin.dependencies.length} dep
            </span>
            {plugin.lines > 0 && (
              <>
                <span className="text-[#3a3a5a]">·</span>
                <span>{plugin.lines.toLocaleString()} LOC</span>
              </>
            )}
          </div>
        </div>
        <Badge
          className={`h-4 px-1 text-[9px] font-semibold ${cfg.badge} border`}
        >
          {cfg.label}
        </Badge>
      </div>
      <div className="mt-1.5 flex flex-wrap gap-1">
        {plugin.capabilities.map((cap) => (
          <span
            key={cap}
            className="rounded bg-[#1a1a2e] px-1.5 py-0.5 font-mono text-[9px] text-[#aaaacc] border border-[#2a2a4a]"
          >
            {cap}
          </span>
        ))}
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------------
// Architect role row
// ----------------------------------------------------------------------------

function RoleRow({ role }: { role: ArchitectRoleInfo }) {
  return (
    <div className="rounded-md border border-[#2a2a4a] bg-[#0a0a1e] p-2">
      <div className="flex items-center gap-2">
        <ShieldCheck className="h-3 w-3 shrink-0 text-emerald-400" />
        <span className="text-[11px] font-semibold text-[#c8c8e0]">{role.role}</span>
        <Badge className="h-4 px-1 text-[9px] bg-purple-500/20 text-purple-300 border border-purple-500/40">
          L{role.autonomy}
        </Badge>
      </div>
      <div className="mt-1 text-[10px] leading-snug text-[#8888aa]">{role.description}</div>
      {role.hardGatedActions.length > 0 && (
        <div className="mt-1 flex flex-wrap items-center gap-1">
          <Lock className="h-2.5 w-2.5 text-rose-400" />
          {role.hardGatedActions.map((a) => (
            <span
              key={a}
              className="rounded bg-rose-500/10 px-1 py-0.5 font-mono text-[9px] text-rose-300 border border-rose-500/30"
            >
              {a}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// ----------------------------------------------------------------------------
// Panel
// ----------------------------------------------------------------------------

export default function CapabilitiesPanel() {
  const [filter, setFilter] = useState<Category | 'all'>('all');
  const [query, setQuery] = useState('');
  const [rolesOpen, setRolesOpen] = useState(false);

  const totalCapabilities = useMemo(
    () => PLUGINS.reduce((sum, p) => sum + p.capabilities.length, 0),
    [],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return PLUGINS.filter((p) => {
      if (filter !== 'all' && p.category !== filter) return false;
      if (!q) return true;
      if (p.id.toLowerCase().includes(q)) return true;
      return p.capabilities.some((c) => c.toLowerCase().includes(q));
    });
  }, [filter, query]);

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-[#2a2a4a] px-3 py-1.5">
        <Layers className="h-3.5 w-3.5 text-emerald-400" />
        <span className="text-[11px] font-semibold uppercase tracking-wider text-[#8888aa]">
          Capability Registry
        </span>
        <Badge
          variant="outline"
          className="h-4 gap-0.5 border-[#2a2a4a] bg-[#1a1a2e] text-[9px] text-[#8888aa]"
        >
          <Cpu className="h-2.5 w-2.5" />
          {PLUGINS.length} plugins
        </Badge>
        <Badge
          variant="outline"
          className="h-4 gap-0.5 border-[#2a2a4a] bg-[#1a1a2e] text-[9px] text-[#8888aa]"
        >
          <Boxes className="h-2.5 w-2.5" />
          {totalCapabilities} caps
        </Badge>
        <div className="flex-1" />
      </div>

      {/* Filter + search row */}
      <div className="flex items-center gap-2 border-b border-[#2a2a4a] px-2 py-1.5">
        <div className="flex items-center gap-0.5 rounded border border-[#2a2a4a] bg-[#0a0a1e] p-0.5">
          {FILTER_TABS.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => setFilter(t.value)}
              className={`rounded px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider transition-colors ${
                filter === t.value
                  ? 'bg-emerald-600/30 text-emerald-300'
                  : 'text-[#5a5a7a] hover:text-[#8888aa]'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-1.5 top-1/2 h-3 w-3 -translate-y-1/2 text-[#5a5a7a]" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filter by plugin id or capability…"
            className="h-6 border-[#2a2a4a] bg-[#0a0a1e] pl-6 text-[11px] text-[#c8c8e0] placeholder:text-[#4a4a6a]"
          />
        </div>
      </div>

      {/* Body */}
      <ScrollArea className="min-h-0 flex-1">
        <div className="space-y-2 p-2">
          {/* Plugin cards grid */}
          {filtered.length > 0 ? (
            <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((p) => (
                <PluginCard key={p.id} plugin={p} />
              ))}
            </div>
          ) : (
            <div className="px-2 py-4 text-[11px] text-[#5a5a7a]">
              No plugins match <span className="text-rose-300">“{query}”</span>.
            </div>
          )}

          {/* Architect roles — collapsible */}
          <Collapsible open={rolesOpen} onOpenChange={setRolesOpen} className="mt-2">
            <CollapsibleTrigger asChild>
              <Button
                variant="ghost"
                className="flex h-6 w-full items-center justify-between rounded border border-[#2a2a4a] bg-[#12122a] px-2 text-[10px] font-semibold uppercase tracking-wider text-[#8888aa] hover:bg-[#1a1a2e] hover:text-[#c8c8e0]"
              >
                <span className="flex items-center gap-1.5">
                  <ShieldCheck className="h-3 w-3 text-purple-400" />
                  Architect Roles
                  <Badge
                    variant="outline"
                    className="h-3.5 border-[#2a2a4a] bg-[#0a0a1e] px-1 text-[8px] text-[#5a5a7a]"
                  >
                    {ARCHITECT_ROLES.length}
                  </Badge>
                </span>
                {rolesOpen ? (
                  <ChevronDown className="h-3 w-3" />
                ) : (
                  <ChevronRight className="h-3 w-3" />
                )}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="mt-1.5 grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                {ARCHITECT_ROLES.map((r) => (
                  <RoleRow key={r.role} role={r} />
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>
      </ScrollArea>
    </div>
  );
}
