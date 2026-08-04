'use client';

/**
 * InspectorPanel — right column. Shows the selected entity's properties
 * with editable NumberFields and a revert button.
 *
 * Edits are written to the store's `edits` map (not committed to the engine
 * yet) so the viewport updates immediately but the world snapshot stays
 * clean until a transaction is recorded.
 */

import { useEffect, useState } from 'react';
import { useEditorStore, selectStructureWithEdits } from '@/lib/editor/store';
import {
  STRUCTURE_COLOR,
  STRUCTURE_LABEL,
  EntityEdit,
  SerializableStructure,
} from '@/lib/editor/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { RotateCcw, Focus, Crosshair, History } from 'lucide-react';

function NumberField({
  label,
  value,
  step = 0.25,
  onCommit,
}: {
  label: string;
  value: number;
  step?: number;
  onCommit: (v: number) => void;
}) {
  const [local, setLocal] = useState(value.toFixed(2));

  // Keep local input synced when the upstream value changes (e.g. gizmo drag).
  useEffect(() => {
    setLocal(value.toFixed(2));
  }, [value]);

  const commit = () => {
    const n = Number.parseFloat(local);
    if (!Number.isFinite(n)) {
      setLocal(value.toFixed(2));
      return;
    }
    onCommit(Math.round(n * 1000) / 1000);
  };

  return (
    <div className="grid grid-cols-3 items-center gap-2">
      <Label className="text-[11px] text-[#8888aa]">{label}</Label>
      <Input
        type="number"
        step={step}
        value={local}
        onChange={(e) => setLocal(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commit();
          if (e.key === 'Escape') setLocal(value.toFixed(2));
        }}
        className="col-span-2 h-7 border-[#2a2a4a] bg-[#0e0e24] font-mono text-xs text-[#c8c8e0]"
      />
    </div>
  );
}

function MetaRow({ k, v }: { k: string; v: unknown }) {
  const display = typeof v === 'object' && v !== null ? JSON.stringify(v) : String(v);
  return (
    <div className="grid grid-cols-3 gap-2 py-0.5">
      <span className="truncate text-[11px] text-[#8888aa]">{k}</span>
      <span className="col-span-2 truncate font-mono text-[11px] text-[#c8c8e0]" title={display}>
        {display}
      </span>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex h-full flex-col items-center justify-center px-6 text-center">
      <Crosshair className="mb-3 h-8 w-8 text-[#3a3a5a]" />
      <p className="text-sm text-[#8888aa]">No entity selected</p>
      <p className="mt-1 text-xs text-[#5a5a7a]">
        Click a structure in the viewport or outliner to inspect it here.
      </p>
    </div>
  );
}

function EntityInspector({
  structure,
  edited,
}: {
  structure: SerializableStructure;
  edited: boolean;
}) {
  const applyEdit = useEditorStore((s) => s.applyEdit);
  const resetEdits = useEditorStore((s) => s.resetEdits);
  const setCameraFocus = useEditorStore((s) => s.setCameraFocus);
  const recordTransaction = useEditorStore((s) => s.recordTransaction);
  const currentBranchId = useEditorStore((s) => s.currentBranchId);

  const commit = (field: EntityEdit['field'], value: number) => {
    applyEdit({ entityId: structure.entityId, field, value });
    recordTransaction({
      requestedBy: 'user',
      originalRequest: `Set ${field} = ${value} on ${structure.name} (#${structure.entityId})`,
      toolsUsed: ['entity.set_metadata'],
      branchId: currentBranchId,
    });
  };

  const focus = () => setCameraFocus(structure.entityId);

  return (
    <ScrollArea className="h-full">
      <div className="p-4">
        {/* Header */}
        <div className="mb-4 flex items-start gap-3">
          <span
            className="mt-1 h-3 w-3 shrink-0 rounded-sm"
            style={{ background: STRUCTURE_COLOR[structure.kind] }}
          />
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-sm font-semibold text-[#c8c8e0]">{structure.name}</h2>
            <p className="text-xs text-[#8888aa]">
              {structure.nameHanzi} · {STRUCTURE_LABEL[structure.kind].en}
            </p>
            <p className="mt-0.5 font-mono text-[10px] text-[#5a5a7a]">
              entityId #{structure.entityId}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="mb-4 flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={focus}
            className="h-7 border-[#2a2a4a] bg-[#0e0e24] text-xs text-[#c8c8e0] hover:bg-[#1d1d36]"
          >
            <Focus className="h-3 w-3" />
            Focus
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => resetEdits(structure.entityId)}
            disabled={!edited}
            className="h-7 border-[#2a2a4a] bg-[#0e0e24] text-xs text-[#c8c8e0] hover:bg-[#1d1d36] disabled:opacity-40"
          >
            <RotateCcw className="h-3 w-3" />
            Revert
          </Button>
        </div>

        {/* Transform */}
        <section className="mb-4">
          <h3 className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-[#5a5a7a]">
            <History className="h-3 w-3" /> Transform
          </h3>
          <div className="space-y-1.5 rounded-md border border-[#2a2a4a] bg-[#0e0e24] p-2.5">
            <NumberField label="pos.x" value={structure.position.x} onCommit={(v) => commit('position.x', v)} />
            <NumberField label="pos.z" value={structure.position.z} onCommit={(v) => commit('position.z', v)} />
            <NumberField
              label="rotation"
              value={structure.rotation}
              step={0.1}
              onCommit={(v) => commit('rotation', v)}
            />
            <NumberField label="width" value={structure.width} onCommit={(v) => commit('width', v)} />
            <NumberField label="depth" value={structure.depth} onCommit={(v) => commit('depth', v)} />
          </div>
        </section>

        {/* Metadata */}
        <section>
          <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-[#5a5a7a]">
            Metadata
          </h3>
          <div className="rounded-md border border-[#2a2a4a] bg-[#0e0e24] p-2.5">
            {Object.keys(structure.metadata).length === 0 ? (
              <p className="text-[11px] text-[#5a5a7a]">No metadata.</p>
            ) : (
              Object.entries(structure.metadata).map(([k, v]) => (
                <MetaRow key={k} k={k} v={v} />
              ))
            )}
          </div>
        </section>
      </div>
    </ScrollArea>
  );
}

export default function InspectorPanel() {
  const selectedIds = useEditorStore((s) => s.selectedEntityIds);
  const edits = useEditorStore((s) => s.edits);

  const id = selectedIds.length > 0 ? selectedIds[0] : null;
  const structure = useEditorStore((s) =>
    id !== null ? selectStructureWithEdits(s, id) : null,
  );

  if (!structure) return <EmptyState />;
  const edited = Boolean(edits[structure.entityId]);

  return <EntityInspector structure={structure} edited={edited} />;
}
