/**
 * Live Architect Studio — World Hierarchy Panel
 *
 * The deep collapsible world tree: World -> Region -> Settlement ->
 * Structure -> Room -> Fixture/Prop, with NPC, material, scale, qi,
 * ecology and system branches. Powered by the production pipeline
 * (src/lib/worldproduction/hierarchy-tree.ts) — every level of the world
 * is browseable and every dimensional node carries its canonical scale.
 */

'use client';

import { useMemo, useState } from 'react';
import {
  Globe2, Map, Home, Building2, DoorOpen, Lamp, Package, Users,
  Layers, Ruler, Sparkles, Leaf, Cpu, Search, ChevronRight, ChevronDown,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { dispatchAction } from '@/lib/studio-ui/action-dispatch';
import { buildWorldTree, flattenTree } from '@/lib/worldproduction/hierarchy-tree';
import type { TreeNode, TreeNodeKind } from '@/lib/worldproduction/hierarchy-tree';

const KIND_ICONS: Record<TreeNodeKind, React.ComponentType<{ className?: string }>> = {
  world: Globe2, region: Map, settlement: Building2, structure: Home,
  room: DoorOpen, fixture: Lamp, prop: Package, npc: Users,
  material: Layers, scale: Ruler, system: Cpu, eco: Leaf, qi: Sparkles,
};

const KIND_COLORS: Record<TreeNodeKind, string> = {
  world: 'text-amber-400', region: 'text-orange-400', settlement: 'text-blue-400',
  structure: 'text-sky-400', room: 'text-cyan-400', fixture: 'text-yellow-400',
  prop: 'text-zinc-300', npc: 'text-emerald-400', material: 'text-stone-400',
  scale: 'text-violet-400', system: 'text-red-400', eco: 'text-green-400', qi: 'text-teal-300',
};

function TreeRow({ node, depth, query, selected, onSelect }: {
  node: TreeNode;
  depth: number;
  query: string;
  selected: string | null;
  onSelect: (id: string, refId?: string) => void;
}) {
  const [open, setOpen] = useState(depth < 2);
  const Icon = KIND_ICONS[node.kind] ?? Package;
  const color = KIND_COLORS[node.kind] ?? 'text-zinc-300';
  const hasChildren = node.children.length > 0;
  const matchesQuery = query === '' || node.name.toLowerCase().includes(query.toLowerCase());
  const childMatches = query !== '' && node.children.some((c) => c.name.toLowerCase().includes(query.toLowerCase()));

  if (!matchesQuery && !childMatches) return null;

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <div
        role="treeitem"
        aria-expanded={hasChildren ? open : undefined}
        aria-selected={selected === node.id}
        onClick={(e) => {
          e.stopPropagation();
          onSelect(node.id, node.refId);
          if (hasChildren && query === '') setOpen(!open);
        }}
        className={`group flex items-center gap-1 rounded px-1.5 py-[3px] text-[11.5px] leading-4 cursor-pointer hover:bg-[#1a1a2e] ${
          selected === node.id ? 'bg-[#1e3a5f]/60 outline outline-1 outline-[#2a4a7a]' : ''
        }`}
        style={{ paddingLeft: 6 + depth * 14 }}
      >
        {hasChildren ? (
          open ? <ChevronDown className="h-3 w-3 shrink-0 text-[#5a5a7a]" /> : <ChevronRight className="h-3 w-3 shrink-0 text-[#5a5a7a]" />
        ) : (
          <span className="h-3 w-3 shrink-0" />
        )}
        <Icon className={`h-3.5 w-3.5 shrink-0 ${color}`} />
        <span className="truncate text-[#c8c8e0]">{node.name}</span>
        {node.meta?.dimensions && (
          <span className="ml-auto shrink-0 pr-1 text-[10px] text-[#5a5a7a]">{node.meta.dimensions}</span>
        )}
      </div>
      {hasChildren && (
        <CollapsibleContent>
          {node.children.map((child) => (
            <TreeRow key={child.id} node={child} depth={depth + 1} query={query} selected={selected} onSelect={onSelect} />
          ))}
        </CollapsibleContent>
      )}
    </Collapsible>
  );
}

export default function WorldHierarchyPanel() {
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<string | null>(null);

  const tree = useMemo(() => buildWorldTree(), []);
  const flat = useMemo(() => flattenTree(tree), [tree]);
  const stats = useMemo(() => {
    const byKind: Record<string, number> = {};
    for (const n of flat) byKind[n.kind] = (byKind[n.kind] ?? 0) + 1;
    return byKind;
  }, [flat]);

  const handleSelect = (id: string, refId?: string) => {
    setSelected(id);
    if (refId) {
      try {
        void dispatchAction('global.select', { entityId: refId, mode: 'replace' });
      } catch {
        /* nodes without viewport entities select locally only */
      }
    }
  };

  const kindSummary = ['structure', 'room', 'fixture', 'prop', 'npc']
    .map((k) => `${k}s: ${stats[k] ?? 0}`)
    .join(' · ');

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="border-b border-[#1a1a2e] px-2 py-1.5">
        <div className="mb-1 flex items-center justify-between">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-[#8888aa]">World Hierarchy</span>
          <span className="text-[10px] text-[#5a5a7a]">{flat.length} nodes · depth {treeStatsDepth(tree)}</span>
        </div>
        <div className="relative">
          <Search className="absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-[#5a5a7a]" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search world…"
            className="h-6 pl-6 text-[11px]"
          />
        </div>
        <div className="mt-1 text-[10px] text-[#5a5a7a]">{kindSummary}</div>
      </div>
      <ScrollArea className="min-h-0 flex-1">
        <div className="px-1.5 py-1" role="tree" aria-label="World hierarchy">
          <TreeRow node={tree} depth={0} query={query} selected={selected} onSelect={handleSelect} />
        </div>
      </ScrollArea>
    </div>
  );
}

function treeStatsDepth(root: TreeNode): number {
  let max = 0;
  const walk = (n: TreeNode, d: number) => {
    max = Math.max(max, d);
    for (const c of n.children) walk(c, d + 1);
  };
  walk(root, 1);
  return max;
}
