/**
 * game/assets/asset-animation.ts — the imported assets live.
 *
 * The art bible's wind grammar: "wind response reduced with distance" —
 * the pine bends more near its crown, gently, always. The wind is injected
 * into the GLB materials via onBeforeCompile (keeps the authored PBR), is
 * fully deterministic (a fixed time accumulator + fixed frequencies), and
 * the jade glow pulses — stronger at dusk, when the spiritual light shows.
 */

import * as THREE from 'three';

interface WindUniforms {
  uWindTime: { value: number };
  uWindStrength: { value: number };
}

export class AssetAnimation {
  /** The deterministic clock (seconds, monotonic). */
  private time = 0;
  /** Per-asset wind strength (edited via the editor's wind param). */
  private wind = new Map<string, number>();
  /** Authored emissive intensity per material (the pulse preserves it). */
  private glowBase = new Map<THREE.MeshStandardMaterial, number>();
  /** Editor glow boost per material (1 = authored; slider owns this). */
  private glowBoost = new Map<THREE.MeshStandardMaterial, number>();
  private glows = new Map<string, THREE.MeshStandardMaterial[]>();
  private shaders = new Map<string, WindUniforms>();
  /** Incense smoke ribbons: the shrine's breath (rises + fades). */
  private smokes = new Map<string, { ribbon: THREE.Object3D; mat: THREE.MeshStandardMaterial; baseY: number }>();

  /** Register an asset's materials for wind + glow animation. */
  attach(id: string, root: THREE.Object3D, windStrength: number): void {
    this.wind.set(id, windStrength);
    const mats: THREE.MeshStandardMaterial[] = [];
    root.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh || !mesh.material) return;
      const m = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;
      const std = m as THREE.MeshStandardMaterial;
      if (std.isMeshStandardMaterial === true) {
        if (!mats.includes(std)) mats.push(std);
        this.injectWind(std, id);
      }
    });
    this.glows.set(id, mats.filter((m) => m.emissive && m.emissiveIntensity > 0));
    for (const m of this.glows.get(id) ?? []) {
      if (!this.glowBase.has(m)) this.glowBase.set(m, m.emissiveIntensity);
    }
    // the incense smoke ribbon (named in the builder): rises and breathes
    const ribbon = root.getObjectByName('shrine_smoke');
    if (ribbon) {
      const mat = (ribbon as THREE.Mesh).material as THREE.MeshStandardMaterial;
      mat.transparent = true;
      this.smokes.set(id, { ribbon, mat, baseY: ribbon.position.y });
    }
  }

  /** Set the wind strength for an asset (editor param). */
  setWind(id: string, strength: number): void {
    this.wind.set(id, Math.max(0, Math.min(3, strength)));
  }

  getWind(id: string): number {
    return this.wind.get(id) ?? 0;
  }

  /** Set the editor glow boost for a material (1 = authored). */
  setGlowBoost(mat: THREE.MeshStandardMaterial, boost: number): void {
    this.glowBoost.set(mat, Math.max(0, Math.min(3, boost)));
  }

  /** The editor glow boost for a material (1 when unset). */
  getGlowBoost(mat: THREE.MeshStandardMaterial): number {
    return this.glowBoost.get(mat) ?? 1;
  }

  /** Inject the wind bend into a material's vertex shader (deterministic). */
  private injectWind(material: THREE.MeshStandardMaterial, id: string): void {
    material.onBeforeCompile = (shader) => {
      shader.uniforms.uWindTime = { value: this.time };
      shader.uniforms.uWindStrength = { value: this.wind.get(id) ?? 0 };
      shader.vertexShader = shader.vertexShader.replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
        // wind grammar: bend grows with height (the crown moves most),
        // two frequencies so no two parts move as one
        float w = uWindStrength * position.y * 0.06;
        transformed.x += w * sin(uWindTime * 1.3 + position.x * 0.9);
        transformed.z += w * 0.7 * cos(uWindTime * 1.05 + position.z * 0.7);
        `,
      );
      this.shaders.set(id, shader.uniforms as unknown as WindUniforms);
    };
  }

  /** Advance the animation: wind + glow pulse (dusk-boosted) + incense. */
  update(dt: number, duskFactor: number): void {
    this.time += dt;
    for (const [id, uniforms] of this.shaders) {
      uniforms.uWindTime.value = this.time;
      uniforms.uWindStrength.value = this.wind.get(id) ?? 0;
    }
    for (const [id, mats] of this.glows) {
      const pulse = 0.85 + 0.15 * Math.sin(this.time * 0.8 + id.length);
      const duskBoost = 1 + duskFactor * 0.7;
      for (const m of mats) {
        const base = this.glowBase.get(m) ?? 0.15;
        const boost = this.glowBoost.get(m) ?? 1;
        m.emissiveIntensity = base * pulse * duskBoost * boost;
      }
    }
    for (const [, smoke] of this.smokes) {
      // the incense breath: the ribbon rises, stretches, thins — then
      // the next breath starts (deterministic, from the shared clock)
      const t = this.time * 0.7;
      const breath = 0.5 + 0.5 * Math.sin(t + smoke.baseY);
      smoke.ribbon.position.y = smoke.baseY + 0.18 * breath;
      smoke.ribbon.scale.y = 0.85 + 0.45 * breath;
      smoke.ribbon.position.x += 0.01 * Math.sin(this.time * 0.9);
      smoke.mat.opacity = 0.28 + 0.16 * breath;
    }
  }

  /** Deterministic state hash (for evidence). */
  stateHash(): string {
    return `${this.time.toFixed(3)}|${[...this.wind.entries()].map(([k, v]) => `${k}:${v.toFixed(2)}`).join(',')}`;
  }
}
