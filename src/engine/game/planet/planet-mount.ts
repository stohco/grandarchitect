/**
 * game/planet/planet-mount.ts — the planet in three.js.
 *
 * Consumes: frontier prng (determinism), the authored world, the height
 * field, watertight chunks, and the residency planner. Floating origin
 * (spec 12 §4): chunk meshes are positioned relative to the player so the
 * renderer's coordinates never leave f32-safe range.
 */

import * as THREE from 'three';
import { PlanetHeightField } from './height-field';
import { buildChunkMesh, chunkOriginOf, CHUNK_M, type ChunkMesh } from './chunk-mesh';
import { planResidency, residencyChanged, KEEP_RADIUS, type ResidencySet } from './streaming';
import { LOCALITIES } from './world-authoring';

/** The village locality — the player's spawn. */
export function villageSpawn(): { x: number; z: number } {
  const v = LOCALITIES.find((l) => l.id === 'wang_village')!;
  return { x: v.x, z: v.z };
}

export interface PlanetMountOptions {
  seed: number;
  /** Max resident chunks (deterministic budget, spec 12 §7.3). */
  maxChunks?: number;
}

export class PlanetMount {
  readonly field: PlanetHeightField;
  readonly group: THREE.Group;
  /** Resident chunk meshes keyed by chunk key. */
  readonly chunks = new Map<string, THREE.Mesh>();
  private resident = new Set<string>();
  private farLod: THREE.Mesh | null = null;
  private maxChunks: number;

  constructor(scene: THREE.Scene, opts: PlanetMountOptions) {
    this.field = new PlanetHeightField(opts.seed);
    this.maxChunks = opts.maxChunks ?? 900;
    this.group = new THREE.Group();
    scene.add(this.group);
    this.rebuildFarLod(0, 0);
  }

  /** The current player chunk key (for residency planning). */
  playerChunk(px: number, pz: number): string {
    return `${Math.floor(px / CHUNK_M)},${Math.floor(pz / CHUNK_M)}`;
  }

  /** Update residency for a player position; returns chunks added/removed. */
  update(px: number, pz: number): { added: string[]; removed: string[] } {
    this.rebuildFarLod(px, pz);
    const plan: ResidencySet = planResidency(px, pz, this.resident);
    if (!residencyChanged(this.resident, plan.resident)) return { added: [], removed: [] };

    // budget cap (deterministic): drop the farthest keep-alive chunks
    let resident = plan.resident;
    if (resident.size > this.maxChunks) {
      const sorted = [...resident].sort((a, b) => {
        const oa = chunkOriginOf(a), ob = chunkOriginOf(b);
        return Math.hypot(oa.x + 4 - px, oa.z + 4 - pz) - Math.hypot(ob.x + 4 - px, ob.z + 4 - pz);
      });
      resident = new Set(sorted.slice(0, this.maxChunks));
    }

    for (const key of plan.removed) {
      if (resident.has(key)) continue;
      const mesh = this.chunks.get(key);
      if (mesh) {
        this.group.remove(mesh);
        mesh.geometry.dispose();
        this.chunks.delete(key);
      }
    }
    for (const key of plan.added) {
      if (!resident.has(key) || this.chunks.has(key)) continue;
      const cm = buildChunkMesh(this.field, key);
      if (!cm) continue;
      this.chunks.set(key, this.mountChunk(cm));
    }
    this.resident = resident;
    return { added: plan.added.filter((k) => this.chunks.has(k)), removed: plan.removed.filter((k) => !this.chunks.has(k)) };
  }

  /** Mount a chunk mesh into the three.js scene (floating-origin relative). */
  private mountChunk(cm: ChunkMesh): THREE.Mesh {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(cm.positions, 3));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(cm.colors, 3));
    geo.setIndex(new THREE.BufferAttribute(cm.indices, 1));
    geo.computeVertexNormals();
    geo.computeBoundingSphere();
    const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.92, metalness: 0.02 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(cm.originX, 0, cm.originZ);
    // receive shadows from structures; a heightfield must NOT cast shadows
    // on itself (self-shadow acne without a depth-biased shadow map)
    mesh.receiveShadow = true;
    this.group.add(mesh);
    return mesh;
  }

  /** Far LOD rings so the world does not visibly end at the stream edge.
   * Two tiers, both meeting the fine-chunk coverage EXACTLY at the hole
   * (radius 165 m — always covered by the keep-alive ring) at the SAME
   * field height (offset 0 — a -1 m step showed as a jagged cliff ring):
   *   inner ring: 12 m cells, 165–900 m  (rebuilds as the player walks)
   *   outer ring: 48 m cells, 900–2400 m (rebuilds per 2.4 km cell)
   * The outer edge sits beyond the fog far plane, so the boundary is
   * invisible. A full grid would bridge the stream channel — hence rings. */
  private farLodCell = '';
  private farLodInnerKey = '';
  private farLodOuter: THREE.Mesh | null = null;
  private rebuildFarLod(px: number, pz: number): void {
    const cellM = 2400;
    const cx = Math.floor(px / cellM) * cellM;
    const cz = Math.floor(pz / cellM) * cellM;
    const key = cx + ',' + cz;
    const innerKey = `${Math.floor(px / 12)},${Math.floor(pz / 12)}`;
    const outerChanged = this.farLodCell !== key;
    const innerChanged = this.farLodInnerKey !== innerKey;
    if (!outerChanged && !innerChanged && this.farLod && this.farLodOuter) return;
    this.farLodCell = key;
    this.farLodInnerKey = innerKey;

    if (innerChanged || !this.farLod) {
      this.farLod = this.buildRing(cx, cz, px, pz, 2400, 12, 150, 900);
    }
    if (outerChanged || !this.farLodOuter) {
      if (this.farLodOuter) {
        this.group.remove(this.farLodOuter);
        this.farLodOuter.geometry.dispose();
      }
      this.farLodOuter = this.buildRing(cx, cz, px, pz, 2400, 48, 900, 2400);
    }
  }

  /** Build one ring tier: annulus between holeR and edgeR at `cell` m cells. */
  private buildRing(
    cx: number, cz: number, px: number, pz: number,
    radius: number, cell: number, holeR: number, edgeR: number,
  ): THREE.Mesh {
    const n = Math.floor((radius * 2) / cell);
    const count = (n + 1) * (n + 1);
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    const valid = new Uint8Array(count);
    for (let iz = 0; iz <= n; iz++) {
      for (let ix = 0; ix <= n; ix++) {
        const lx = ix * cell - radius;
        const lz = iz * cell - radius;
        const i = iz * (n + 1) + ix;
        // hole follows the PLAYER; the ring covers the fine-chunk edge exactly
        const d = Math.hypot(cx + lx - px, cz + lz - pz);
        if (d < holeR || d > edgeR) { valid[i] = 0; continue; }
        const s = this.field.evaluate(cx + lx, cz + lz);
        pos[i * 3] = lx;
        pos[i * 3 + 1] = s.height;
        pos[i * 3 + 2] = lz;
        const c = this.farColor(s.material);
        col[i * 3] = c[0]; col[i * 3 + 1] = c[1]; col[i * 3 + 2] = c[2];
        valid[i] = 1;
      }
    }
    const idx: number[] = [];
    for (let iz = 0; iz < n; iz++) {
      for (let ix = 0; ix < n; ix++) {
        const a = iz * (n + 1) + ix, b = a + 1;
        const c = (iz + 1) * (n + 1) + ix, d = c + 1;
        if (!valid[a] || !valid[b] || !valid[c] || !valid[d]) continue;
        const ay = pos[a * 3 + 1], by = pos[b * 3 + 1], cy = pos[c * 3 + 1], dy = pos[d * 3 + 1];
        const n1y = (cy - ay) * cell - cell * (by - ay);
        const n2y = (dy - cy) * cell - cell * (by - cy);
        if (n1y >= 0) idx.push(a, c, b); else idx.push(a, b, c);
        if (n2y >= 0) idx.push(c, d, b); else idx.push(c, b, d);
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    geo.setIndex(idx);
    geo.computeVertexNormals();
    const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, metalness: 0 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(cx, 0, cz); // same field height as the fine chunks — no step
    mesh.frustumCulled = false;
    mesh.renderOrder = -2;
    this.group.add(mesh);
    return mesh;
  }

  private farColor(material: number): [number, number, number] {
    // distant haze-tinted palette (matching the fine chunk colors)
    const base = MATERIAL_COLORS_FAR[material] ?? [0.2, 0.24, 0.2];
    return base;
  }

  /** Ground height at a world point (for spawning/grounding). */
  heightAt(wx: number, wz: number): number {
    return this.field.evaluate(wx, wz).height;
  }

  /** Rebuild ONE resident chunk from a custom height function (the terrain
   * editor layers deltas over the deterministic field). */
  rebuildChunk(key: string, heightFn: (x: number, z: number) => number): void {
    const mesh = this.chunks.get(key);
    if (!mesh) return;
    const cm = buildChunkMesh(this.field, key, heightFn);
    if (!cm) return;
    this.group.remove(mesh);
    mesh.geometry.dispose();
    this.chunks.set(key, this.mountChunk(cm));
  }

  /** Deterministic residency hash (evidence). */
  residencyHash(): string {
    return [...this.resident].sort().join('|');
  }
}

const MATERIAL_COLORS_FAR: Record<number, [number, number, number]> = {
  0: [0.2, 0.24, 0.2],
  1: [0.22, 0.21, 0.19],
  2: [0.5, 0.42, 0.28],
  3: [0.75, 0.78, 0.83],
  4: [0.17, 0.16, 0.14],
};
