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
  private glows = new Map<string, THREE.MeshStandardMaterial[]>();
  private shaders = new Map<string, WindUniforms>();

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
  }

  /** Set the wind strength for an asset (editor param). */
  setWind(id: string, strength: number): void {
    this.wind.set(id, Math.max(0, Math.min(3, strength)));
  }

  getWind(id: string): number {
    return this.wind.get(id) ?? 0;
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

  /** Advance the animation: wind + glow pulse (dusk-boosted). */
  update(dt: number, duskFactor: number): void {
    this.time += dt;
    for (const [id, uniforms] of this.shaders) {
      uniforms.uWindTime.value = this.time;
      uniforms.uWindStrength.value = this.wind.get(id) ?? 0;
    }
    for (const [id, mats] of this.glows) {
      const pulse = 0.12 + 0.06 * Math.sin(this.time * 0.8 + id.length);
      const duskBoost = duskFactor * 0.5;
      for (const m of mats) {
        m.emissiveIntensity = pulse + duskBoost;
      }
    }
  }

  /** Deterministic state hash (for evidence). */
  stateHash(): string {
    return `${this.time.toFixed(3)}|${[...this.wind.entries()].map(([k, v]) => `${k}:${v.toFixed(2)}`).join(',')}`;
  }
}
