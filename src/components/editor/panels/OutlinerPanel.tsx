'use client';

/**
 * OutlinerPanel — scene hierarchy tree (left column).
 *
 * Groups structures by kind (or flat), with a search filter. Each row shows
 * the structure name + hanzi, a colour swatch, a visibility eye toggle, and
 * a selection highlight. Click selects; shift-click toggles; the eye hides
 * the entity in the viewport.
 */

import { useMemo } from 'react';
import { useEditorStore, groupStructuresByKind } from '@/lib/editor/store';
import {
  StructureKind,
  STRUCTURE_COLOR,
  STRUCTURE_LABEL,
  SerializableStructure,
} from '@/lib/editor/types';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Eye,
  EyeOff,
  Search,
  ChevronsDownUp,
  ChevronsUpDown,
  LayoutGrid,
  List,
} from 'lucide-react';
import { useState } from 'react';

export default function OutlinerPanel() {
  const settlement = useEditorStore((s) => s.settlement);
  const filter = useEditorStore((s) => s.outlinerFilter);
  const setFilter = useEditorStore((s) => s.setOutlinerFilter);
  const grouping = useEditorStore((s) => s.outlinerGrouping);
  const setGrouping = useEditorStore((s) => s.setOutlinerGrouping);
  const selectedIds = useEditorStore((s) => s.selectedEntityIds);
  const hiddenIds = useEditorStore((s) => s.hiddenEntityIds);
  const selectEntity = useEditorStore((s) => s.selectEntity);
  const toggleSelectEntity = useEditorStore((s) => s.toggleSelectEntity);
  const hideEntity = useEditorStore((s) => s.hideEntity);
  const showEntity = useEditorStore((s) => s.showEntity);

  const [collapsed, setCollapsed] = useState<Set<StructureKind>>(new Set());

  const filtered = useMemo(() => {
    if (!settlement) return [] as SerializableStructure[];
    const q = filter.trim().toLowerCase();
    if (!q) return settlement.structures;
    return settlement.structures.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.nameHanzi.includes(q) ||
        s.kind.toLowerCase().includes(q) ||
        String(s.entityId) === q,
    );
  }, [settlement, filter]);

  const grouped = useMemo(() => {
    if (grouping === 'none') return null;
    return groupStructuresByKind(filtered);
  }, [filtered, grouping]);

  const toggleCollapse = (kind: StructureKind) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(kind)) next.delete(kind);
      else next.add(kind);
      return next;
    });
  };

  const hiddenSet = new Set(hiddenIds);
  const selectedSet = new Set(selectedIds);

  const Row = ({ s, depth = 0 }: { s: SerializableStructure; depth?: number }) => {
    const selected = selectedSet.has(s.entityId);
    const hidden = hiddenSet.has(s.entityId);
    return (
      <div
        className={`group flex h-7 items-center gap-1.5 rounded-sm pr-2 text-xs transition-colors ${
          selected
            ? 'bg-emerald-600/20 text-emerald-300'
            : 'text-[#c8c8e0] hover:bg-[#1d1d36]'
        }`}
        style={{ paddingLeft: 8 + depth * 12 }}
        onClick={(e) => {
          if (e.shiftKey || e.metaKey || e.ctrlKey) toggleSelectEntity(s.entityId);
          else selectEntity(s.entityId);
        }}
      >
        <button
          className="text-[#5a5a7a] hover:text-[#c8c8e0]"
          onClick={(e) => {
            e.stopPropagation();
            if (hidden) showEntity(s.entityId);
            else hideEntity(s.entityId);
          }}
          title={hidden ? 'Show' : 'Hide'}
        >
          {hidden ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
        </button>
        <span
          className="h-2.5 w-2.5 shrink-0 rounded-sm"
          style={{ background: STRUCTURE_COLOR[s.kind] }}
        />
        <span className="truncate">{s.name}</span>
        <span className="ml-auto shrink-0 text-[10px] text-[#5a5a7a]">{s.nameHanzi}</span>
        <span className="shrink-0 font-mono text-[10px] text-[#5a5a7a]">#{s.entityId}</span>
      </div>
    );
  };

  return (
    <div className="flex h-full flex-col bg-[#12122a]">
      <div className="border-b border-[#2a2a4a] px-3 py-2">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-[#8888aa]">Outliner</h2>
          <div className="flex items-center gap-0.5">
            <TooltipProvider delayDuration={200}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    className={`rounded p-1 ${grouping === 'kind' ? 'text-emerald-400' : 'text-[#5a5a7a] hover:text-[#c8c8e0]'}`}
                    onClick={() => setGrouping('kind')}
                  >
                    <LayoutGrid className="h-3.5 w-3.5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="border-[#2a2a4a] bg-[#12122a] text-[#c8c8e0]">Group by kind</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    className={`rounded p-1 ${grouping === 'none' ? 'text-emerald-400' : 'text-[#5a5a7a] hover:text-[#c8c8e0]'}`}
                    onClick={() => setGrouping('none')}
                  >
                    <List className="h-3.5 w-3.5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="border-[#2a2a4a] bg-[#12122a] text-[#c8c8e0]">Flat list</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
        <div className="relative">
          <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#5a5a7a]" />
          <Input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Filter structures…"
            className="h-7 border-[#2a2a4a] bg-[#0e0e24] pl-7 text-xs text-[#c8c8e0] placeholder:text-[#5a5a7a]"
          />
        </div>
      </div>

      <ScrollArea className="min-h-0 flex-1">
        <div className="p-1.5">
          {!settlement && (
            <p className="px-2 py-6 text-center text-xs text-[#5a5a7a]">No settlement loaded.</p>
          )}
          {settlement && filtered.length === 0 && (
            <p className="px-2 py-6 text-center text-xs text-[#5a5a7a]">No structures match the filter.</p>
          )}

          {grouped
            ? (Object.keys(grouped) as StructureKind[]).map((kind) => {
                const list = grouped[kind];
                if (!list || list.length === 0) return null;
                const isCollapsed = collapsed.has(kind);
                return (
                  <div key={kind} className="mb-1">
                    <button
                      className="flex h-6 w-full items-center gap-1.5 rounded-sm px-2 text-[10px] font-medium uppercase tracking-wider text-[#8888aa] hover:bg-[#1d1d36]"
                      onClick={() => toggleCollapse(kind)}
                    >
                      {isCollapsed ? <ChevronsUpDown className="h-3 w-3" /> : <ChevronsDownUp className="h-3 w-3" />}
                      <span className="h-2 w-2 rounded-sm" style={{ background: STRUCTURE_COLOR[kind] }} />
                      <span>{STRUCTURE_LABEL[kind].en}</span>
                      <span className="text-[#5a5a7a]">({list.length})</span>
                    </button>
                    {!isCollapsed && list.map((s) => <Row key={s.entityId} s={s} depth={1} />)}
                  </div>
                );
              })
            : filtered.map((s) => <Row key={s.entityId} s={s} />)}
        </div>
      </ScrollArea>

      <div className="border-t border-[#2a2a4a] px-3 py-1.5 text-[10px] text-[#5a5a7a]">
        {filtered.length} of {settlement?.structures.length ?? 0} structures · {selectedIds.length} selected
      </div>
    </div>
  );
}
