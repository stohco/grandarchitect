/**
 * game/editor/terrain-edit.ts — the terrain brush, with replayable deltas.
 *
 * The deterministic field is the law; edits are DELTAS layered on top —
 * a list of brush strokes (raise / lower / flatten / smooth). The deltas
 * are pure data: replayable, saveable, and the world stays lawful. A brush
 * stroke rebuilds only the affected chunks (mesh + collision agree, as
 * always).
 */

import * as THREE from 'three';
import type { PlanetHeightField } from '../planet/height-field';
import type { PlanetMount } from '../planet/planet-mount';
import { hardnessFactor } from '../planet/material-families';

export type BrushMode = 'raise' | 'lower' | 'flatten' | 'smooth';

export interface TerrainDelta {
  id: number;
  x: number;
  z: number;
  radius: number;
  strength: number; // meters
  mode: BrushMode;
}

export class TerrainEditStore {
  readonly deltas: TerrainDelta[] = [];
  private nextId = 1;
  private field: PlanetHeightField;
  private planet: PlanetMount;

  constructor(field: PlanetHeightField, planet: PlanetMount) {
    this.field = field;
    this.planet = planet;
  }

  /** The effective height at a point: field + all deltas. */
  heightAt(x: number, z: number): number {
    let h = this.field.evaluate(x, z).height;
    for (const d of this.deltas) {
      const dist = Math.hypot(x - d.x, z - d.z);
      if (dist >= d.radius) continue;
      const fall = 1 - dist / d.radius;
      const w = fall * fall;
      if (d.mode === 'raise') h += d.strength * w;
      else if (d.mode === 'lower') h -= d.strength * w;
      else if (d.mode === 'flatten') h += (d.x - h) * w; // pull toward the stroke center height
      else h += d.strength * w * 0.1; // gentle smooth (same direction, weak)
    }
    return h;
  }

  /** Apply a brush stroke and rebuild the affected chunks. Raise/lower
   *  RESPECT material hardness (Image Directives §3): the effective
   *  strength is the request times hardnessFactor at the stroke center,
   *  and the delta stores that pre-multiplied strength — replay, undo and
   *  save/load stay pure data and deterministic. Flatten/smooth unchanged. */
  stroke(x: number, z: number, radius: number, strength: number, mode: BrushMode): void {
    let effective = strength;
    if (mode === 'raise' || mode === 'lower') {
      effective = strength * hardnessFactor(this.field.evaluate(x, z).material);
    }
    const d: TerrainDelta = { id: this.nextId++, x, z, radius, strength: effective, mode };
    this.deltas.push(d);
    this.rebuildAffected(x, z, radius);
  }

  /** Undo the last stroke. */
  undo(): void {
    const d = this.deltas.pop();
    if (d) this.rebuildAffected(d.x, d.z, d.radius);
  }

  private rebuildAffected(x: number, z: number, radius: number): void {
    const r = Math.ceil(radius / 8) + 1;
    const cx = Math.floor(x / 8), cz = Math.floor(z / 8);
    for (let dz = -r; dz <= r; dz++) {
      for (let dx = -r; dx <= r; dx++) {
        const key = `${cx + dx},${cz + dz}`;
        this.planet.rebuildChunk(key, this.heightAt.bind(this));
      }
    }
  }

  /** Deterministic serialization (save/load). */
  serialize(): TerrainDelta[] {
    return this.deltas.map((d) => ({ ...d }));
  }

  load(list: TerrainDelta[]): void {
    for (const d of list) {
      this.deltas.push({ ...d });
      this.nextId = Math.max(this.nextId, d.id + 1);
    }
    // rebuild everything resident
    for (const key of this.planet.chunks.keys()) {
      this.planet.rebuildChunk(key, this.heightAt.bind(this));
    }
  }
}

/** Placeholder to keep the three import honest (unused at runtime). */
export function _editorTerrainPlaceholder(): THREE.Vector3 {
  return new THREE.Vector3();
}
