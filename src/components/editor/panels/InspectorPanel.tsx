/**
 * Live Architect Studio — Inspector Panel
 *
 * Shows transform, properties, and metadata for the selected entity.
 * Three tabs: Transform, Properties, Metadata.
 */

import { ScrollArea } from '@/components/ui/scroll-area';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Package, Move3d, RotateCcw, Maximize2, Eye, EyeOff } from 'lucide-react';
import { useEditorStore, useSelectedStructure, getEffective } from '@/lib/editor/store';
import type { EntityEdit } from '@/lib/editor/types';

function TransformField({ label, value, onChange, icon: Icon, color, min, max, step = 0.5 }: {
  label: string; value: number; onChange: (v: number) => void;
  icon: React.ComponentType<{ className?: string }>; color: string;
  min?: number; max?: number; step?: number;
}) {
  return (
    <div className="flex items-center gap-2">
      <Icon className={`h-3.5 w-3.5 shrink-0 ${color}`} />
      <span className="w-12 shrink-0 text-[10px] font-medium text-[#5a5a7a]">{label}</span>
      <input type="number" value={value.toFixed(1)} step={step} min={min} max={max}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        className="h-6 w-16 rounded border border-[#2a2a4a] bg-[#1a1a2e] px-1.5 font-mono text-[11px] text-[#c8c8e0] focus:outline-none focus:ring-1 focus:ring-emerald-500/30" />
      <Slider value={[value]} onValueChange={([v]) => onChange(v)} min={min ?? -50} max={max ?? 50} step={step} className="flex-1" />
    </div>
  );
}

export default function InspectorPanel() {
  const settlement = useEditorStore((s) => s.settlement);
  const selectedEntityIds = useEditorStore((s) => s.selectedEntityIds);
  const edits = useEditorStore((s) => s.edits);
  const hiddenEntityIds = useEditorStore((s) => s.hiddenEntityIds);
  const applyEdit = useEditorStore((s) => s.applyEdit);
  const hideEntity = useEditorStore((s) => s.hideEntity);
  const showEntity = useEditorStore((s) => s.showEntity);
  const structure = useSelectedStructure();

  const handleEdit = (field: EntityEdit['field'], value: number) => {
    if (!structure) return;
    applyEdit({ entityId: structure.entityId, field, value });
  };

  if (!settlement) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 p-4">
        <Package className="h-8 w-8 text-[#3a3a5a]" />
        <span className="text-center text-[11px] text-[#5a5a7a]">No world loaded.<br />Generate a world to inspect entities.</span>
      </div>
    );
  }

  if (selectedEntityIds.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 p-4">
        <Package className="h-8 w-8 text-[#3a3a5a]" />
        <span className="text-center text-[11px] text-[#5a5a7a]">No entity selected.<br />Click an entity in the viewport or outliner.</span>
      </div>
    );
  }

  if (selectedEntityIds.length > 1) {
    const edited = selectedEntityIds.filter((id) => edits[id] != null).length;
    const hidden = selectedEntityIds.filter((id) => hiddenEntityIds.has(id)).length;
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 p-4">
        <Package className="h-8 w-8 text-emerald-500/40" />
        <span className="text-sm font-medium text-[#c8c8e0]">{selectedEntityIds.length} entities selected</span>
        <div className="mt-2 space-y-1 text-[11px] text-[#8888aa]">
          <div>{edited} edited locally</div>
          <div>{hidden} hidden</div>
        </div>
      </div>
    );
  }

  if (!structure) return null;
  const hasEdits = edits[structure.entityId] != null;
  const isHidden = hiddenEntityIds.has(structure.entityId);

  return (
    <div className="flex h-full flex-col">
      <Tabs defaultValue="transform" className="flex h-full flex-col">
        <div className="border-b border-[#2a2a4a]">
          <TabsList className="h-7 w-full justify-start gap-0 rounded-none border-0 bg-transparent p-0">
            <TabsTrigger value="transform" className="h-7 rounded-none border-b-2 border-transparent px-3 text-[10px] font-medium uppercase tracking-wider text-[#5a5a7a] data-[state=active]:border-emerald-500 data-[state=active]:bg-transparent data-[state=active]:text-emerald-300 data-[state=active]:shadow-none">Transform</TabsTrigger>
            <TabsTrigger value="properties" className="h-7 rounded-none border-b-2 border-transparent px-3 text-[10px] font-medium uppercase tracking-wider text-[#5a5a7a] data-[state=active]:border-emerald-500 data-[state=active]:bg-transparent data-[state=active]:text-emerald-300 data-[state=active]:shadow-none">Properties</TabsTrigger>
            <TabsTrigger value="metadata" className="h-7 rounded-none border-b-2 border-transparent px-3 text-[10px] font-medium uppercase tracking-wider text-[#5a5a7a] data-[state=active]:border-emerald-500 data-[state=active]:bg-transparent data-[state=active]:text-emerald-300 data-[state=active]:shadow-none">Metadata</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="transform" className="m-0 flex-1 data-[state=inactive]:hidden">
          <ScrollArea className="h-full">
            <div className="space-y-3 p-3">
              <div>
                <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wider text-[#5a5a7a]">Position</span>
                <div className="space-y-2">
                  <TransformField label="X" value={structure.position.x} onChange={(v) => handleEdit('position.x', v)} icon={Move3d} color="text-red-400" min={-100} max={100} />
                  <TransformField label="Z" value={structure.position.z} onChange={(v) => handleEdit('position.z', v)} icon={Move3d} color="text-blue-400" min={-100} max={100} />
                </div>
              </div>
              <div>
                <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wider text-[#5a5a7a]">Rotation</span>
                <TransformField label="Y°" value={structure.rotation} onChange={(v) => handleEdit('rotation', v)} icon={RotateCcw} color="text-green-400" min={0} max={360} step={15} />
              </div>
              <div>
                <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wider text-[#5a5a7a]">Dimensions</span>
                <div className="space-y-2">
                  <TransformField label="Width" value={structure.width} onChange={(v) => handleEdit('width', v)} icon={Maximize2} color="text-amber-400" min={0.5} max={20} />
                  <TransformField label="Depth" value={structure.depth} onChange={(v) => handleEdit('depth', v)} icon={Maximize2} color="text-amber-400" min={0.5} max={20} />
                </div>
              </div>
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="properties" className="m-0 flex-1 data-[state=inactive]:hidden">
          <ScrollArea className="h-full">
            <div className="space-y-3 p-3">
              <div className="space-y-2">
                <FieldRow label="Kind" value={structure.kind} />
                <FieldRow label="Entity ID" value={String(structure.entityId)} mono />
                <FieldRow label="Name (EN)" value={structure.name} />
                <FieldRow label="Name (汉字)" value={structure.nameHanzi} />
              </div>
              <div className="flex items-center gap-2 rounded bg-[#1a1a2e] px-3 py-2">
                {hasEdits ? (<><span className="h-2 w-2 rounded-full bg-amber-400" /><span className="text-[11px] text-amber-300">Has local edits</span></>) : (<><span className="h-2 w-2 rounded-full bg-[#3a3a5a]" /><span className="text-[11px] text-[#5a5a7a]">No local edits</span></>)}
              </div>
              <Button variant="outline" size="sm" className={`w-full gap-2 text-[11px] ${isHidden ? 'border-red-500/30 text-red-400 hover:bg-red-500/10' : 'border-[#2a2a4a] text-[#8888aa] hover:text-white'}`} onClick={() => { if (isHidden) showEntity(structure.entityId); else hideEntity(structure.entityId); }}>
                {isHidden ? (<><Eye className="h-3 w-3" />Show in viewport</>) : (<><EyeOff className="h-3 w-3" />Hide from viewport</>)}
              </Button>
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="metadata" className="m-0 flex-1 data-[state=inactive]:hidden">
          <ScrollArea className="h-full">
            <div className="space-y-2 p-3">
              {Object.keys(structure.metadata).length === 0 ? (
                <div className="py-4 text-center text-[11px] text-[#5a5a7a]">No metadata on this entity.</div>
              ) : (
                Object.entries(structure.metadata).map(([key, val]) => (
                  <div key={key} className="rounded bg-[#1a1a2e] px-3 py-1.5">
                    <span className="text-[10px] font-medium uppercase text-[#5a5a7a]">{key}</span>
                    <div className="mt-0.5 font-mono text-[11px] text-[#aaaacc]">{typeof val === 'object' ? JSON.stringify(val) : String(val)}</div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function FieldRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <span className="text-[10px] font-medium uppercase text-[#5a5a7a]">{label}</span>
      <span className={`text-right text-[11px] text-[#c8c8e0] ${mono ? 'font-mono' : ''}`}>{value}</span>
    </div>
  );
}
