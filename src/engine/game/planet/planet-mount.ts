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
  private sky: THREE.Mesh | null = null;
  private maxChunks: number;

  constructor(scene: THREE.Scene, opts: PlanetMountOptions) {
    this.field = new PlanetHeightField(opts.seed);
    this.maxChunks = opts.maxChunks ?? 900;
    this.group = new THREE.Group();
    scene.add(this.group);
    this.buildSky(scene);
    this.buildFarLod();
  }

  /** The current player chunk key (for residency planning). */
  playerChunk(px: number, pz: number): string {
    return `${Math.floor(px / CHUNK_M)},${Math.floor(pz / CHUNK_M)}`;
  }

  /** Update residency for a player position; returns chunks added/removed. */
  update(px: number, pz: number): { added: string[]; removed: string[] } {
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
    const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.92, metalness: 0.02, flatShading: true });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(cm.originX, 0, cm.originZ);
    mesh.castShadow = mesh.receiveShadow = true;
    this.group.add(mesh);
    return mesh;
  }

  /** A coarse far LOD so the world does not visibly end at the stream edge. */
  private buildFarLod(): void {
    const span = KEEP_RADIUS * 2 + 256;
    const cell = 32;
    const n = Math.floor(span / cell);
    const pos = new Float32Array((n + 1) * (n + 1) * 3);
    const col = new Float32Array((n + 1) * (n + 1) * 3);
    const idx: number[] = [];
    for (let iz = 0; iz <= n; iz++) {
      for (let ix = 0; ix <= n; ix++) {
        const wx = ix * cell - span / 2;
        const wz = iz * cell - span / 2;
        const s = this.field.evaluate(wx, wz);
        const i = iz * (n + 1) + ix;
        pos[i * 3] = wx;
        pos[i * 3 + 1] = s.height;
        pos[i * 3 + 2] = wz;
        const c = this.farColor(s.material);
        col[i * 3] = c[0]; col[i * 3 + 1] = c[1]; col[i * 3 + 2] = c[2];
      }
    }
    for (let iz = 0; iz < n; iz++) {
      for (let ix = 0; ix < n; ix++) {
        const a = iz * (n + 1) + ix, b = a + 1;
        const c = (iz + 1) * (n + 1) + ix, d = c + 1;
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
    const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, metalness: 0, flatShading: true });
    this.farLod = new THREE.Mesh(geo, mat);
    this.farLod.position.set(0, -1, 0); // 1 m below the fine chunks — no z-fight
    this.farLod.frustumCulled = false;
    this.farLod.renderOrder = -2;
    this.group.add(this.farLod);
  }

  private farColor(material: number): [number, number, number] {
    // distant haze-tinted palette (matching the fine chunk colors)
    const base = MATERIAL_COLORS_FAR[material] ?? [0.2, 0.24, 0.2];
    return base;
  }

  /** A simple gradient sky dome (Phase 1: no atmosphere pass yet). */
  private buildSky(scene: THREE.Scene): void {
    const geo = new THREE.SphereGeometry(4000, 32, 16);
    const mat = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      uniforms: {
        top: { value: new THREE.Color(0x8fbfe8) },
        hor: { value: new THREE.Color(0xdde5eb) },
      },
      vertexShader: `varying vec3 vDir; void main() { vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: `uniform vec3 top; uniform vec3 hor; varying vec3 vDir;
        void main() { float h = clamp(vDir.y * 0.5 + 0.5, 0.0, 1.0); gl_FragColor = vec4(mix(hor, top, pow(h, 1.4)), 1.0); }`,
    });
    this.sky = new THREE.Mesh(geo, mat);
    this.sky.frustumCulled = false;
    scene.add(this.sky);
  }

  /** Ground height at a world point (for spawning/grounding). */
  heightAt(wx: number, wz: number): number {
    return this.field.evaluate(wx, wz).height;
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
