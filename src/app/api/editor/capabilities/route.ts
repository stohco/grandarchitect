/**
 * GET /api/editor/capabilities
 *
 * Returns the architect capability descriptors from the studio's
 * capability-descriptors module, serialized for the editor UI.
 */
import { NextResponse } from 'next/server';
import { createDefaultDescriptors } from '@/engine/studio/capability-descriptors';
import type { CapabilityDescriptorLite } from '@/lib/editor/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const descriptors = createDefaultDescriptors();
  const list: CapabilityDescriptorLite[] = descriptors.map((d) => ({
    capabilityId: d.capabilityId,
    description: d.description,
    selectableTypes: d.selectableTypes,
    supportedSelections: d.supportedSelections,
    inspectTools: d.inspectTools.length,
    previewTools: d.previewTools.length,
    mutationTools: d.mutationTools.length,
    generationTools: d.generationTools.length,
    editableProperties: d.editableProperties.map((p) => ({
      name: p.name,
      type: p.type,
      editable: p.editable,
    })),
    supportsUndo: d.supportsUndo,
    supportsLiveEdit: d.supportsLiveEdit,
    supportsPreviewFork: d.supportsPreviewFork,
    permissionClass: d.permissionClass,
  }));
  return NextResponse.json({ ok: true, descriptors: list });
}
