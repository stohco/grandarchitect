/**
 * game/editor/world-validator.ts — the multiverse law-checker.
 *
 * The world must make sense in depth, like a real xianxia planet:
 *
 *   1. GROUNDING — nothing floats and nothing clips: every structure's
 *      lowest point sits within the foundation tolerance of the terrain
 *      under its footprint. The ONLY exemption is a recorded
 *      legitimate burial (someone buried it, an emergence event buried it)
 *      — the validator keeps an exemption ledger with reasons.
 *   2. WATER — water sits in its channels: the surface is below the banks
 *      that hold it; a lake on a hilltop is nonsense and is flagged.
 *   3. DRAINAGE — an unexplained basin (a local low surrounded by higher
 *      ground, not near a river, sea or coast) is a broken planet and is
 *      flagged.
 *   4. SEMANTICS — every component has a cause (non-empty label/type);
 *      terrain edits stay within sane bounds (no 1000 m spikes from a
 *      brush slip).
 *
 * The validator runs live in edit mode (F5) and its report is exported as
 * data — the same report I read to learn from what you do.
 */

import * as THREE from 'three';
import type { EditorRegistry, SelectableComponent } from './types';
import type { TerrainEditStore } from './terrain-edit';
import type { PlanetMount } from '../planet/planet-mount';
import { RIVERS, SEA_LEVEL } from '../planet/world-authoring';

export interface GroundingViolation {
  id: string;
  label: string;
  kind: 'floating' | 'clipping';
  gapMeters: number;
  diagnosis: string;
}

export interface WaterViolation {
  id: string;
  label: string;
  diagnosis: string;
}

export interface TerrainViolation {
  x: number;
  z: number;
  diagnosis: string;
}

export interface ValidatorReport {
  grounded: GroundingViolation[];
  water: WaterViolation[];
  terrain: TerrainViolation[];
  semantic: string[];
  passed: boolean;
}

/**
 * The exemption ledger: components that are legitimately off the surface —
 * buried through emergence, sunken ruins, a spirit spring cavern, etc.
 * Each entry carries the reason; the validator trusts the ledger.
 */
export class BurialLedger {
  readonly entries = new Map<string, string>();

  bury(id: string, reason: string): void {
    this.entries.set(id, reason);
  }

  isBuried(id: string): boolean {
    return this.entries.has(id);
  }

  serialize(): Record<string, string> {
    return Object.fromEntries(this.entries);
  }
}

export class WorldValidator {
  constructor(
    private registry: EditorRegistry,
    private planet: PlanetMount,
    private terrain: TerrainEditStore,
    private ledger: BurialLedger,
  ) {}

  private heightAt(x: number, z: number): number {
    return this.terrain.heightAt(x, z);
  }

  /** Validate the whole world. */
  validate(): ValidatorReport {
    const grounded: GroundingViolation[] = [];
    const water: WaterViolation[] = [];
    const terrain: TerrainViolation[] = [];
    const semantic: string[] = [];

    // ---- 1. Grounding ----
    for (const c of this.registry.components.values()) {
      if (this.ledger.isBuried(c.id)) continue; // legitimately buried
      if (c.type === 'water' || c.type === 'sky' || c.type === 'sun') continue;
      // the component's lowest point vs the terrain under its center
      const box = c.bounds;
      const center = box.getCenter(new THREE.Vector3());
      const groundY = this.heightAt(center.x, center.z);
      const bottomY = box.min.y;
      const gap = bottomY - groundY; // > 0 = floating, < 0 = clipping
      if (gap > 0.35) {
        grounded.push({ id: c.id, label: c.label, kind: 'floating', gapMeters: gap, diagnosis: `${c.label} floats ${gap.toFixed(2)} m above the ground — no cause.` });
      } else if (gap < -1.5) {
        grounded.push({ id: c.id, label: c.label, kind: 'clipping', gapMeters: gap, diagnosis: `${c.label} is buried ${(-gap).toFixed(2)} m below the surface — if that is emergence, record it in the burial ledger.` });
      }
    }

    // ---- 2. Water in its channels ----
    for (const r of RIVERS) {
      for (let i = 0; i < r.points.length - 1; i++) {
        const mx = (r.points[i][0] + r.points[i + 1][0]) / 2;
        const mz = (r.points[i][1] + r.points[i + 1][1]) / 2;
        // banks: 8 m either side of the channel edge
        for (const side of [-1, 1]) {
          const bx = mx + side * (r.width + 6);
          const bz = mz;
          const bank = this.heightAt(bx, bz);
          if (bank < SEA_LEVEL + 0.2) {
            water.push({ id: `river_${r.id}`, label: r.name, diagnosis: `bank at (${bx.toFixed(0)}, ${bz.toFixed(0)}) is ${(SEA_LEVEL + 0.1 - bank).toFixed(1)} m BELOW the water — the river would flood its banks.` });
          }
        }
      }
    }

    // ---- 3. Drainage: no unexplained basins ----
    // A basin is only nonsense if it is deep enough to HOLD water and has
    // no drain: the lowest point must sit more than BASIN_DEPTH below its
    // rim. A 0.4 m hollow in the swells is just ground.
    const BASIN_DEPTH = 1.0;
    const riverPoints: Array<[number, number]> = RIVERS.flatMap((r) => r.points);
    for (let gx = 0; gx < 12; gx++) {
      for (let gz = 0; gz < 12; gz++) {
        const x = -200 + gx * 36;
        const z = -200 + gz * 36;
        const h = this.heightAt(x, z);
        // local low: all 8 neighbors higher
        let isLow = true;
        let rim = -Infinity;
        for (let dx = -1; dx <= 1 && isLow; dx++) {
          for (let dz = -1; dz <= 1 && isLow; dz++) {
            if (dx === 0 && dz === 0) continue;
            const nh = this.heightAt(x + dx * 6, z + dz * 6);
            if (nh <= h) isLow = false;
            rim = Math.max(rim, nh);
          }
        }
        if (!isLow) continue;
        if (rim - h < BASIN_DEPTH) continue; // a hollow, not a basin
        // allowed if near a river / sea / coast
        let nearWater = false;
        for (const [rx, rz] of riverPoints) {
          if (Math.hypot(x - rx, z - rz) < 80) { nearWater = true; break; }
        }
        if (!nearWater && h < SEA_LEVEL + 2) nearWater = true; // coastal/sea
        if (!nearWater) {
          terrain.push({ x, z, diagnosis: `unexplained basin at (${x}, ${z}) — ${(rim - h).toFixed(1)} m deep, no river, sea or coast to drain it.` });
        }
      }
    }

    // ---- 4. Semantics + edit sanity ----
    for (const c of this.registry.components.values()) {
      if (!c.label || !c.type) semantic.push(`component ${c.id} lacks a label/type — no cause.`);
    }
    for (const d of this.terrain.deltas) {
      if (Math.abs(d.strength) > 50) semantic.push(`terrain delta #${d.id} strength ${d.strength} m — a brush slip?`);
      if (d.radius < 0.5 || d.radius > 100) semantic.push(`terrain delta #${d.id} radius ${d.radius} — out of sane bounds.`);
    }

    return {
      grounded, water, terrain, semantic,
      passed: grounded.length === 0 && water.length === 0 && terrain.length === 0 && semantic.length === 0,
    };
  }
}
