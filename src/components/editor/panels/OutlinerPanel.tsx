/**
 * Live Architect Studio — Outliner / Hierarchy Panel
 *
 * Lists all settlement structures in a searchable, groupable tree.
 * Supports shift-click multi-select, visibility toggles, and edit indicators.
 *
 * Keyboard navigation (when outliner has focus):
 *   Arrow Up/Down — move focus between rows
 *   Enter         — select the focused row
 *   Escape        — clear focus
 */

'use client';

import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import {
  Landmark, Home, Droplets, Wheat, Wind, Flame, Ship, Route,
  Sprout, Flower2, Cross, Mountain, Search, ChevronRight,
  ChevronDown, Eye, EyeOff, ListTree,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useEditorStore } from '@/lib/editor/store';
import { useRenderTracker } from '@/lib/editor/render-tracker';
import type { StructureKind, SerializableStructure } from '@/lib/editor/types';

const KIND_ICONS: Record<StructureKind, React.ComponentType<{ className?: string }>> = {
  lineage_hall: Landmark, household: Home, well: Droplets, threshing_ground: Wheat,
  mill: Wind, spirit_shrine: Flame, dock: Ship, path: Route, paddy: Sprout,
  dryland_garden: Flower2, graveyard: Cross, levee: Mountain,
};

const KIND_COLORS: Record<StructureKind, string> = {
  lineage_hall: 'text-amber-400', household: 'text-blue-400', well: 'text-cyan-400',
  threshing_ground: 'text-yellow-400', mill: 'text-slate-300', spirit_shrine: 'text-red-400',
  dock: 'text-teal-400', path: 'text-zinc-400', paddy: 'text-green-400',
  dryland_garden: 'text-emerald-400', graveyard: 'text-purple-400', levee: 'text-orange-400',
};

const KIND_LABELS: Record<StructureKind, string> = {
  lineage_hall: 'Lineage Halls', household: 'Households', well: 'Wells',
  threshing_ground: 'Threshing Grounds', mill: 'Mills', spirit_shrine: 'Spirit Shrines',
  dock: 'Docks', path: 'Paths', paddy: 'Paddies', dryland_garden: 'Dryland Gardens',
  graveyard: 'Graveyards', levee: 'Levees',
};

interface FlatRow {
  kind: 'group' | 'item';
  key: string;
  entityId?: number;
  structure?: SerializableStructure;
}

export default function OutlinerPanel() {
  // Render tracking — catches outliner render loops.
  void useRenderTracker('OutlinerPanel');

  const settlement = useEditorStore((s) => s.settlement);
  const selectedEntityIds = useEditorStore((s) => s.selectedEntityIds);
  const hoveredEntityId = useEditorStore((s) => s.hoveredEntityId);
  const edits = useEditorStore((s) => s.edits);
  const hiddenEntityIds = useEditorStore((s) => s.hiddenEntityIds);
  const outlinerFilter = useEditorStore((s) => s.outlinerFilter);
  const setOutlinerFilter = useEditorStore((s) => s.setOutlinerFilter);
  const outlinerGrouping = useEditorStore((s) => s.outlinerGrouping);
  const setOutlinerGrouping = useEditorStore((s) => s.setOutlinerGrouping);
  const selectEntity = useEditorStore((s) => s.selectEntity);
  const toggleSelectEntity = useEditorStore((s) => s.toggleSelectEntity);
  const setHovered = useEditorStore((s) => s.setHovered);
  const hideEntity = useEditorStore((s) => s.hideEntity);
  const showEntity = useEditorStore((s) => s.showEntity);

  const [collapsedKinds, setCollapsedKinds] = useState<Set<string>>(new Set());
  const [focusedIndex, setFocusedIndex] = useState<number>(-1);
  const rootRef = useRef<HTMLDivElement>(null);
  const rowRefs = useRef<Array<HTMLDivElement | null>>([]);

  const filteredStructures = useMemo(() => {
    if (!settlement) return [];
    const filter = outlinerFilter.toLowerCase();
    return settlement.structures.filter((s) => {
      if (!filter) return true;
      return s.name.toLowerCase().includes(filter) || s.nameHanzi.includes(filter) || s.kind.includes(filter);
    });
  }, [settlement, outlinerFilter]);

  const grouped = useMemo(() => {
    const groups: Record<string, typeof filteredStructures> = {};
    for (const s of filteredStructures) {
      const key = outlinerGrouping === 'none' ? '__all__' : s.kind;
      if (!groups[key]) groups[key] = [];
      groups[key].push(s);
    }
    return groups;
  }, [filteredStructures, outlinerGrouping]);

  /**
   * Flatten the visible structure list (with group headers when grouped) so
   * keyboard navigation can move through one linear index space.
   */
  const flatRows = useMemo(() => {
    const rows: FlatRow[] = [];
    for (const [groupKey, items] of Object.entries(grouped)) {
      const isKind = groupKey !== '__all__';
      if (isKind) {
        rows.push({ kind: 'group', key: groupKey });
      }
      const isCollapsed = collapsedKinds.has(groupKey);
      if (!isCollapsed) {
        for (const s of items) {
          rows.push({ kind: 'item', key: `item-${s.entityId}`, entityId: s.entityId, structure: s });
        }
      }
    }
    return rows;
  }, [grouped, collapsedKinds]);

  const visibleCount = settlement ? settlement.structures.filter((s) => !hiddenEntityIds.has(s.entityId)).length : 0;
  const totalCount = settlement?.structures.length ?? 0;

  const toggleCollapse = (kind: string) => {
    setCollapsedKinds((prev) => {
      const next = new Set(prev);
      if (next.has(kind)) next.delete(kind); else next.add(kind);
      return next;
    });
  };

  const handleClick = (id: number, shift: boolean) => {
    if (shift) toggleSelectEntity(id); else selectEntity(id);
  };

  // Keep focused index in sync with selection: if a single entity is selected
  // and exists in our flat rows, focus it. Otherwise leave focus where it is.
  // Deferred via microtask so we don't trigger a synchronous setState-in-effect
  // cascading render.
  useEffect(() => {
    if (selectedEntityIds.length !== 1) return;
    const idx = flatRows.findIndex((r) => r.kind === 'item' && r.entityId === selectedEntityIds[0]);
    if (idx < 0) return;
    if (idx === focusedIndex) return;
    Promise.resolve().then(() => setFocusedIndex(idx));
  }, [selectedEntityIds, flatRows, focusedIndex]);

  // Scroll the focused row into view when it changes via keyboard.
  useEffect(() => {
    if (focusedIndex < 0) return;
    const el = rowRefs.current[focusedIndex];
    if (el) {
      el.scrollIntoView({ block: 'nearest' });
    }
  }, [focusedIndex]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
    if (flatRows.length === 0) return;
    // Don't hijack typing in the filter input.
    const target = e.target as HTMLElement;
    if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setFocusedIndex((prev) => {
        const next = prev < 0 ? 0 : Math.min(prev + 1, flatRows.length - 1);
        return next;
      });
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setFocusedIndex((prev) => {
        const next = prev <= 0 ? 0 : prev - 1;
        return next;
      });
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const row = flatRows[focusedIndex];
      if (row && row.kind === 'item' && row.entityId != null) {
        selectEntity(row.entityId);
      } else if (row && row.kind === 'group') {
        toggleCollapse(row.key);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setFocusedIndex(-1);
      rootRef.current?.blur();
    }
  }, [flatRows, focusedIndex, selectEntity]);

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-8 items-center gap-2 border-b border-[#2a2a4a] px-3">
        <ListTree className="h-3.5 w-3.5 text-emerald-400" />
        <span className="text-[11px] font-semibold uppercase tracking-wider text-[#8888aa]">Hierarchy</span>
        <div className="flex-1" />
        <span className="text-[10px] text-[#5a5a7a]">{visibleCount}/{totalCount}</span>
      </div>

      <div className="flex items-center gap-2 border-b border-[#2a2a4a] px-2 py-1.5">
        <div className="relative flex-1">
          <Search className="absolute left-1.5 top-1/2 h-3 w-3 -translate-y-1/2 text-[#4a4a6a]" />
          <Input value={outlinerFilter} onChange={(e) => setOutlinerFilter(e.target.value)} placeholder="Filter…"
            className="h-6 rounded border-[#2a2a4a] bg-[#1a1a2e] pl-6 pr-2 font-mono text-[11px] text-[#c8c8e0] placeholder:text-[#4a4a6a] focus-visible:ring-emerald-500/30 focus-visible:border-emerald-500/50" />
        </div>
        <ToggleGroup type="single" value={outlinerGrouping} onValueChange={(v) => { if (v) setOutlinerGrouping(v as 'kind' | 'faction' | 'none'); }} className="gap-0">
          <ToggleGroupItem value="kind" className="h-5 rounded-l rounded-r-none border border-[#2a2a4a] bg-transparent px-1.5 text-[9px] text-[#5a5a7a] data-[state=on]:bg-[#2a2a5a] data-[state=on]:text-emerald-300">Kind</ToggleGroupItem>
          <ToggleGroupItem value="none" className="h-5 rounded-l-none rounded-r border border-[#2a2a4a] bg-transparent px-1.5 text-[9px] text-[#5a5a7a] data-[state=on]:bg-[#2a2a5a] data-[state=on]:text-emerald-300">Flat</ToggleGroupItem>
        </ToggleGroup>
      </div>

      <div
        ref={rootRef}
        tabIndex={0}
        onKeyDown={handleKeyDown}
        className="min-h-0 flex-1 outline-none focus:ring-1 focus:ring-inset focus:ring-emerald-500/20"
        role="tree"
        aria-label="Settlement hierarchy — use arrow keys to navigate, Enter to select, Escape to clear focus"
      >
        <ScrollArea className="h-full">
          <div className="p-1">
            {!settlement ? (
              <div className="px-3 py-6 text-center text-[11px] text-[#5a5a7a]">No world loaded.<br />Generate a world to see structures.</div>
            ) : filteredStructures.length === 0 ? (
              <div className="px-3 py-6 text-center text-[11px] text-[#5a5a7a]">No matching structures.</div>
            ) : (
              flatRows.map((row, idx) => {
                if (row.kind === 'group') {
                  const kind = row.key as StructureKind;
                  const KindIcon = KIND_ICONS[kind];
                  const isCollapsed = collapsedKinds.has(row.key);
                  const isFocused = focusedIndex === idx;
                  const itemsCount = grouped[row.key]?.length ?? 0;
                  return (
                    <div
                      key={row.key}
                      ref={(el) => { rowRefs.current[idx] = el; }}
                      className={`flex w-full items-center gap-1.5 rounded px-2 py-1 text-[11px] font-medium transition-colors ${
                        isFocused
                          ? 'border-l-2 border-emerald-400/70 bg-[#1e1e3e] text-[#aaaacc]'
                          : 'border-l-2 border-transparent text-[#8888aa] hover:bg-[#1e1e3e] hover:text-[#aaaacc]'
                      }`}
                      onClick={() => toggleCollapse(row.key)}
                      onMouseEnter={() => setHovered(null)}
                      role="treeitem"
                      aria-expanded={!isCollapsed}
                      aria-selected={false}
                    >
                      {isCollapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                      <KindIcon className={`h-3 w-3 ${KIND_COLORS[kind]}`} />
                      <span>{KIND_LABELS[kind]}</span>
                      <span className="ml-auto text-[10px] text-[#4a4a6a]">{itemsCount}</span>
                    </div>
                  );
                }
                // item row
                const structure = row.structure!;
                const isSelected = selectedEntityIds.includes(structure.entityId);
                const isHovered = hoveredEntityId === structure.entityId;
                const isHidden = hiddenEntityIds.has(structure.entityId);
                const hasEdits = edits[structure.entityId] != null;
                const isFocused = focusedIndex === idx;
                const isGrouped = outlinerGrouping !== 'none';
                const Icon = KIND_ICONS[structure.kind];
                return (
                  <div
                    key={row.key}
                    ref={(el) => { rowRefs.current[idx] = el; }}
                    className={`group flex items-center gap-1.5 rounded px-2 py-0.5 text-[11px] transition-colors border-l-2 ${
                      isSelected
                        ? 'border-l-transparent bg-[#2a2a5a] text-white'
                        : isFocused
                        ? 'border-l-emerald-400/70 bg-[#1e1e3e] text-[#c8c8e0]'
                        : isHovered
                        ? 'border-l-transparent bg-[#1e1e3e] text-[#c8c8e0]'
                        : 'border-l-transparent text-[#8888aa] hover:bg-[#1a1a3e] hover:text-[#aaaacc]'
                    } ${isHidden ? 'opacity-40' : ''}`}
                    onClick={(e) => handleClick(structure.entityId, e.shiftKey)}
                    onMouseEnter={() => setHovered(structure.entityId)}
                    onMouseLeave={() => setHovered(null)}
                    role="treeitem"
                    aria-selected={isSelected}
                  >
                    {isGrouped ? <span className="w-4" /> : <Icon className={`h-3 w-3 shrink-0 ${KIND_COLORS[structure.kind]}`} />}
                    <span className="flex-1 truncate">{structure.name}</span>
                    {hasEdits && <span className="h-1.5 w-1.5 rounded-full bg-amber-400" title="Has local edits" />}
                    <button
                      className="ml-auto h-4 w-4 shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
                      onClick={(e) => { e.stopPropagation(); if (isHidden) showEntity(structure.entityId); else hideEntity(structure.entityId); }}
                      aria-label={isHidden ? 'Show entity' : 'Hide entity'}
                    >
                      {isHidden ? <EyeOff className="h-3 w-3 text-[#5a5a7a]" /> : <Eye className="h-3 w-3 text-[#5a5a7a]" />}
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}
