/**
 * Live Architect Studio — Inspector (selected entity properties)
 */

'use client';

import { useState, useEffect } from 'react';
import { useEditorStore, getEffective } from '@/lib/editor/store';
import type { StructureKind, EntityEdit } from '@/lib/editor/types';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { MousePointer2, Undo2, Home, Landmark, Droplet, Wheat, Sparkles, Ship, Route, Sprout, Cross, Layers3 } from 'lucide-react';
import { cn } from '@/lib/utils';

const KIND_ICON: Record<StructureKind, React.ComponentType<{ className?: string }>> = {
  lineage_hall: Landmark, household: Home, well: Droplet, threshing_ground: Wheat, mill: Wheat,
  spirit_shrine: Sparkles, dock: Ship, path: Route, paddy: Sprout, dryland_garden: Sprout,
  graveyard: Cross, levee: Layers3,
};

const WEALTH_COLORS: Record<string, string> = {
  rich: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  comfortable: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30',
  poor: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  destitute: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
};

function NumberField({ label, value, onCommit, step = 0.5 }: { label: string; value: number; onCommit: (v: number) => void; step?: number }) {
  const [draft, setDraft] = useState(String(value));
  useEffect(() => { setDraft(String(value)); }, [value]);
  return (
    <div className="flex items-center justify-between gap-2 py-1">
      <span className="text-[11px] uppercase tracking-wide text-zinc-500">{label}</span>
      <Input type="number" step={step} value={draft} onChange={(e) => setDraft(e.target.value)}
        onBlur={() => { const v = parseFloat(draft); if (!isNaN(v)) onCommit(v); else setDraft(String(value)); }}
        onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); if (e.key === 'Escape') setDraft(String(value)); }}
        className="h-6 w-24 border-zinc-800 bg-zinc-900 font-mono text-xs text-zinc-200" />
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between py-0.5 text-xs">
      <span className="text-zinc-500">{label}</span>
      <span className={cn('text-zinc-200', mono && 'font-mono')}>{value}</span>
    </div>
  );
}

export default function Inspector() {
  const settlement = useEditorStore((s) => s.settlement);
  const edits = useEditorStore((s) => s.edits);
  const selected = useEditorStore((s) => s.selectedEntityIds);
  const applyEdits = useEditorStore((s) => s.applyEdits);
  const resetEdits = useEditorStore((s) => s.resetEdits);

  if (selected.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 p-6 text-center">
        <MousePointer2 className="h-8 w-8 text-zinc-700" />
        <p className="text-sm text-zinc-500">Nothing selected</p>
        <p className="text-xs text-zinc-600">Click an entity in the viewport or outliner to inspect its properties.</p>
      </div>
    );
  }
  if (selected.length > 1) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
        <Layers3 className="h-8 w-8 text-emerald-500" />
        <p className="text-sm text-zinc-300">{selected.length} entities selected</p>
        <Button size="sm" variant="outline" onClick={useEditorStore.getState().clearSelection} className="border-zinc-800 bg-zinc-900 text-xs">Clear Selection</Button>
      </div>
    );
  }

  const id = selected[0];
  const s = getEffective(settlement, edits, id);
  if (!s) return <div className="p-4 text-xs text-zinc-600">Entity not found.</div>;
  const KindIcon = KIND_ICON[s.kind];
  const hasEdits = !!edits[id];

  // find household data by matching metadata householdIndex or headName
  const household = settlement?.households.find((h, i) => {
    const mi = s.metadata?.householdIndex;
    if (typeof mi === 'number') return i === mi;
    return h.headName === s.metadata?.headName;
  });

  const commit = (field: EntityEdit['field'], value: number) => applyEdits([{ entityId: id, field, value }]);

  return (
    <div className="dark flex h-full flex-col bg-zinc-950 text-zinc-300">
      <div className="flex items-center justify-between border-b border-zinc-800 px-3 py-2">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">Inspector</span>
        <div className="flex items-center gap-1.5">
          <KindIcon className="h-3.5 w-3.5 text-emerald-400" />
          <Badge variant="secondary" className="h-5 bg-zinc-800 text-[10px] text-zinc-300">{s.kind.replace(/_/g, ' ')}</Badge>
          <span className="font-mono text-[10px] text-zinc-600">#{id}</span>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-zinc-700">
        <Accordion type="multiple" defaultValue={['transform', 'identity']} className="w-full">
          <AccordionItem value="transform" className="border-b border-zinc-800">
            <AccordionTrigger className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-zinc-400 hover:no-underline">Transform</AccordionTrigger>
            <AccordionContent className="px-3 pb-3">
              <NumberField label="Pos X" value={s.position.x} onCommit={(v) => commit('position.x', v)} step={1} />
              <NumberField label="Pos Z" value={s.position.z} onCommit={(v) => commit('position.z', v)} step={1} />
              <NumberField label="Rot°" value={Math.round((s.rotation * 180) / Math.PI)} onCommit={(v) => commit('rotation', (v * Math.PI) / 180)} step={15} />
              <NumberField label="Width" value={s.width} onCommit={(v) => commit('width', v)} step={0.5} />
              <NumberField label="Depth" value={s.depth} onCommit={(v) => commit('depth', v)} step={0.5} />
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="identity" className="border-b border-zinc-800">
            <AccordionTrigger className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-zinc-400 hover:no-underline">Identity</AccordionTrigger>
            <AccordionContent className="px-3 pb-3">
              <Row label="Name" value={s.name} />
              <Row label="Hanzi" value={s.nameHanzi} />
              <Row label="Kind" value={s.kind} mono />
              <Row label="Entity ID" value={`#${id}`} mono />
            </AccordionContent>
          </AccordionItem>

          {household && (
            <AccordionItem value="household" className="border-b border-zinc-800">
              <AccordionTrigger className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-zinc-400 hover:no-underline">Household</AccordionTrigger>
              <AccordionContent className="px-3 pb-3">
                <div className="mb-2 rounded border border-zinc-800 bg-zinc-900 p-2">
                  <div className="text-sm text-zinc-200">{household.headName}</div>
                  <div className="text-[11px] text-zinc-500">{household.headNameHanzi} · {household.headRole.replace(/_/g, ' ')} · age {household.headAge}</div>
                  <div className="mt-1 flex gap-1">
                    {household.isWang && <Badge variant="secondary" className="h-4 bg-rose-500/15 text-[9px] text-rose-300">Wang</Badge>}
                    <Badge variant="secondary" className={cn('h-4 border text-[9px]', WEALTH_COLORS[household.wealthTier])}>{household.wealthTier}</Badge>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-x-3 gap-y-0.5">
                  <Row label="Members" value={household.memberCount} mono />
                  <Row label="Has Well" value={household.hasWell ? 'Yes' : 'No'} />
                  <Row label="Paddy mu" value={household.paddyMu} mono />
                  <Row label="Tenanted" value={household.tenantedMu} mono />
                  <Row label="Dryland" value={household.drylandMu} mono />
                  <Row label="Pigs" value={household.pigs} mono />
                  <Row label="Chickens" value={household.chickens} mono />
                </div>
              </AccordionContent>
            </AccordionItem>
          )}

          <AccordionItem value="metadata" className="border-b border-zinc-800">
            <AccordionTrigger className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-zinc-400 hover:no-underline">Metadata</AccordionTrigger>
            <AccordionContent className="px-3 pb-3">
              <div className="space-y-0.5">
                {Object.entries(s.metadata).map(([k, v]) => (
                  <div key={k} className="flex items-start justify-between gap-2 py-0.5 text-xs">
                    <span className="shrink-0 text-zinc-500">{k}</span>
                    <span className="text-right font-mono text-[11px] text-zinc-300">
                      {typeof v === 'object' ? <pre className="whitespace-pre-wrap text-right text-[10px]">{JSON.stringify(v)}</pre> : String(v)}
                    </span>
                  </div>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="provenance" className="border-b border-zinc-800">
            <AccordionTrigger className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-zinc-400 hover:no-underline">Provenance</AccordionTrigger>
            <AccordionContent className="px-3 pb-3">
              <Row label="Generator" value="ga:gen-settlement" mono />
              <Row label="Seed" value={settlement?.seed ?? '—'} mono />
              <Row label="Tick" value={settlement?.tick ?? 0} mono />
              <Row label="Permission" value="presentation_only" mono />
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>

      <div className="border-t border-zinc-800 p-2">
        <Button size="sm" variant="outline" onClick={resetEdits} disabled={!hasEdits} className="w-full gap-1.5 border-rose-500/30 bg-rose-500/5 text-xs text-rose-300 hover:bg-rose-500/10">
          <Undo2 className="h-3.5 w-3.5" />Revert Edits{hasEdits ? '' : ' (none)'}
        </Button>
      </div>
    </div>
  );
}
