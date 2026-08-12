/**
 * game/editor/world-export.ts — the world as data.
 *
 * Everything you change in the editor — component transforms, palette
 * edits, terrain brush strokes, legitimate burials — serializes to one
 * JSON document. That document is what I read to LEARN from what you do:
 * your edits become canon (the authored data is updated to match), and the
 * validator report rides along so the laws are checked together.
 */

import type { EditorRegistry } from './types';
import type { TerrainEditStore } from './terrain-edit';
import type { BurialLedger } from './world-validator';
import type { ValidatorReport } from './world-validator';

export interface WorldExport {
  version: 1;
  components: Array<{
    id: string;
    type: string;
    label: string;
    position: { x: number; y: number; z: number };
    rotation: { x: number; y: number; z: number };
    scale: { x: number; y: number; z: number };
  }>;
  terrainDeltas: ReturnType<TerrainEditStore['serialize']>;
  burials: Record<string, string>;
  validation: {
    passed: boolean;
    summary: { grounded: number; water: number; terrain: number; semantic: number };
  };
}

export function exportWorld(
  registry: EditorRegistry,
  terrain: TerrainEditStore,
  ledger: BurialLedger,
  report: ValidatorReport,
): WorldExport {
  return {
    version: 1,
    components: [...registry.components.values()].map((c) => ({
      id: c.id,
      type: c.type,
      label: c.label,
      position: { x: c.root.position.x, y: c.root.position.y, z: c.root.position.z },
      rotation: { x: c.root.rotation.x, y: c.root.rotation.y, z: c.root.rotation.z },
      scale: { x: c.root.scale.x, y: c.root.scale.y, z: c.root.scale.z },
    })),
    terrainDeltas: terrain.serialize(),
    burials: ledger.serialize(),
    validation: {
      passed: report.passed,
      summary: {
        grounded: report.grounded.length,
        water: report.water.length,
        terrain: report.terrain.length,
        semantic: report.semantic.length,
      },
    },
  };
}

/** The export as a downloadable file + returned JSON (for the console). */
export function downloadWorld(json: WorldExport): string {
  const text = JSON.stringify(json, null, 2);
  const blob = new Blob([text], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'suzaku-world-edit.json';
  a.click();
  URL.revokeObjectURL(url);
  return text;
}
