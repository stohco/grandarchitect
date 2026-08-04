/**
 * Live Architect Studio — Outliner (scene hierarchy)
 */

'use client';

import { useState } from 'react';
import { useEditorStore, getEffective } from '@/lib/editor/store';
import type { StructureKind } from '@/lib/editor/types';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import {
  Search, X, ChevronRight, ChevronDown, Eye, EyeOff, Home, Landmark, Droplet,
  Wheat, Sparkles, Ship, Route, Sprout, Cross, Layers, Layers3,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const KIND_META: Record<StructureKind, { icon: React.ComponentType<{ className?: string }>; color: string; label: string }> = {
  lineage_hall: { icon: Landmark, color: 'text-rose-400', label: 'Lineage Hall' },
  household: { icon: Home, color: 'text-amber-400', label: 'Household' },
  well: { icon: Droplet, color: 'text-cyan-400', label: 'Well' },
  threshing_ground: { icon: Wheat, color: 'text-yellow-400', label: 'Threshing Ground' },
  mill: { icon: Wheat, color: 'text-orange-400', label: 'Mill' },
  spirit_shrine: { icon: Sparkles, color: 'text-fuchsia-400', label: 'Spirit Shrine' },
  dock: { icon: Ship, color: 'text-teal-400', label: 'Dock' },
  path: { icon: Route, color: 'text-zinc-400', label: 'Path' },
  paddy: { icon: Sprout, color: 'text-emerald-400', label: 'Paddy' },
  dryland_garden: { icon: Sprout, color: 'text-lime-400', label: 'Dryland Garden' },
  graveyard: { icon: Cross, color: 'text-zinc-400', label: 'Graveyard' },
  levee: { icon: Layers3, color: 'text-stone-400', label: 'Levee' },
};

export default function Outliner() {
  const settlement = useEditorStore((s) => s.settlement);
  const edits = useEditorStore((s) => s.edits);
  const hidden = useEditorStore((s) => s.hiddenEntityIds);
  const selected = useEditorStore((s) => s.selectedEntityIds);
  const hovered = useEditorStore((s) => s.hoveredEntityId);
  const filter = useEditorStore((s) => s.outlinerFilter);
  const grouping = useEditorStore((s) => s.outlinerGrouping);
  const setFilter = useEditorStore((s) => s.setOutlinerFilter);
  const setGrouping = useEditorStore((s) => s.setOutlinerGrouping);
  const toggleSelect = useEditorStore((s) => s.toggleSelectEntity);
  const setHovered = useEditorStore((s) => s.setHovered);
  const hideEntity = useEditorStore((s) => s.hideEntity);
  const showEntity = useEditorStore((s) => s.showEntity);
  const selectAll = useEditorStore((s) => s.selectAll);
  const clearSelection = useEditorStore((s) => s.clearSelection);

  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  if (!settlement) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 p-6 text-center">
        <Layers className="h-8 w-8 text-zinc-700" />
        <p className="text-sm text-zinc-500">No world generated</p>
        <p className="text-xs text-zinc-600">Generate a world to populate the scene.</p>
      </div>
    );
  }

  const structures = settlement.structures.map((s) => getEffective(settlement, edits, s.entityId)!).filter(Boolean);
  const filtered = filter
    ? structures.filter((s) => (s.name + s.nameHanzi + s.kind).toLowerCase().includes(filter.toLowerCase()))
    : structures;

  const groups: { key: string; label: string; items: typeof filtered }[] = [];
  if (grouping === 'kind') {
    const byKind = new Map<StructureKind, typeof filtered>();
    filtered.forEach((s) => { const arr = byKind.get(s.kind) ?? []; arr.push(s); byKind.set(s.kind, arr); });
    for (const [k, items] of byKind) groups.push({ key: k, label: `${KIND_META[k].label}`, items });
  } else {
    groups.push({ key: 'all', label: 'All Entities', items: filtered });
  }

  const toggleGroup = (key: string) => {
    const next = new Set(collapsed);
    if (next.has(key)) next.delete(key); else next.add(key);
    setCollapsed(next);
  };

  return (
    <div className="flex h-full flex-col bg-zinc-950 text-zinc-300">
      <div className="flex items-center justify-between border-b border-zinc-800 px-3 py-2">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">Outliner</span>
        <Badge variant="secondary" className="h-5 bg-zinc-800 text-[10px] text-zinc-400">{structures.length}</Badge>
      </div>
      <div className="space-y-2 border-b border-zinc-800 p-2">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-600" />
          <Input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Filter entities…" className="h-7 border-zinc-800 bg-zinc-900 pl-7 pr-7 text-xs text-zinc-200 placeholder:text-zinc-600" />
          {filter && <button onClick={() => setFilter('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-zinc-400"><X className="h-3.5 w-3.5" /></button>}
        </div>
        <ToggleGroup type="single" value={grouping} onValueChange={(v) => v && setGrouping(v as 'kind' | 'faction' | 'none')} className="justify-start">
          <ToggleGroupItem value="kind" className="h-6 px-2 text-[10px] data-[state=on]:bg-emerald-500/15 data-[state=on]:text-emerald-300">Kind</ToggleGroupItem>
          <ToggleGroupItem value="faction" className="h-6 px-2 text-[10px] data-[state=on]:bg-emerald-500/15 data-[state=on]:text-emerald-300">Faction</ToggleGroupItem>
          <ToggleGroupItem value="none" className="h-6 px-2 text-[10px] data-[state=on]:bg-emerald-500/15 data-[state=on]:text-emerald-300">None</ToggleGroupItem>
        </ToggleGroup>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-zinc-700 [&::-webkit-scrollbar-track]:bg-transparent">
        {groups.map((g) => {
          const isCollapsed = collapsed.has(g.key);
          return (
            <div key={g.key}>
              {grouping !== 'none' && (
                <button onClick={() => toggleGroup(g.key)} className="flex w-full items-center gap-1 border-b border-zinc-900 px-2 py-1.5 text-left hover:bg-zinc-900/50">
                  {isCollapsed ? <ChevronRight className="h-3 w-3 text-zinc-600" /> : <ChevronDown className="h-3 w-3 text-zinc-600" />}
                  <span className="text-[11px] font-medium uppercase tracking-wide text-zinc-400">{g.label}</span>
                  <span className="ml-auto text-[10px] text-zinc-600">{g.items.length}</span>
                </button>
              )}
              {!isCollapsed && g.items.map((s) => {
                const meta = KIND_META[s.kind];
                const isSel = selected.includes(s.entityId);
                const isHov = hovered === s.entityId;
                const isHidden = hidden.has(s.entityId);
                return (
                  <div
                    key={s.entityId}
                    onClick={() => toggleSelect(s.entityId)}
                    onMouseEnter={() => setHovered(s.entityId)}
                    onMouseLeave={() => setHovered(null)}
                    className={cn(
                      'group flex cursor-pointer items-center gap-2 border-l-2 px-2 py-1 text-xs',
                      isSel ? 'border-emerald-500 bg-emerald-500/15 text-emerald-200' : 'border-transparent',
                      isHov && !isSel && 'bg-zinc-800/60',
                      isHidden && 'opacity-40'
                    )}
                  >
                    <meta.icon className={cn('h-3.5 w-3.5 shrink-0', meta.color)} />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-zinc-200">{s.name}</div>
                      <div className="truncate text-[10px] text-zinc-500">{s.nameHanzi}</div>
                    </div>
                    <span className="font-mono text-[10px] text-zinc-600">#{s.entityId}</span>
                    <button
                      onClick={(e) => { e.stopPropagation(); isHidden ? showEntity(s.entityId) : hideEntity(s.entityId); }}
                      className="text-zinc-600 opacity-0 hover:text-zinc-300 group-hover:opacity-100"
                    >
                      {isHidden ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
      <div className="flex items-center justify-between border-t border-zinc-800 px-2 py-1.5 text-[11px] text-zinc-500">
        <span>{structures.length} entities · {selected.length} selected · {hidden.size} hidden</span>
        <div className="flex gap-1">
          <button onClick={selectAll} className="text-zinc-500 hover:text-emerald-400">All</button>
          <span className="text-zinc-700">·</span>
          <button onClick={clearSelection} className="text-zinc-500 hover:text-emerald-400">None</button>
        </div>
      </div>
    </div>
  );
}
