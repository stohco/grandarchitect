/**
 * Painterly Textures — the hand-painted material system.
 *
 * Deterministic procedural textures (LCG noise, no Math.random) in the
 * art-bible language: rammed earth speckle, thatch straw lines, timber
 * grain, stone grain, plaster mottling. CanvasTexture is browser-only, so
 * Node consumers (conformance) fall back to plain-color materials.
 */

import * as THREE from 'three';
import { LCG } from '../../determinism/primitives';

export type PainterlyTextureId =
  | 'rammedEarth' | 'thatch' | 'timber' | 'plaster' | 'cobble'
  | 'stone' | 'packedEarth' | 'canvas' | 'hemp';

const TEX_SIZE = 128;

function makeCanvas(): HTMLCanvasElement | null {
  if (typeof document === 'undefined') return null;
  try {
    return document.createElement('canvas');
  } catch {
    return null;
  }
}

/** Base color with deterministic speckle/band noise in the painterly style. */
function paint(
  canvas: HTMLCanvasElement,
  base: [number, number, number],
  mode: PainterlyTextureId,
  seed: number,
): void {
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, TEX_SIZE, TEX_SIZE);
  const rng = new LCG(seed ^ 0x9e37);
  const img = ctx.createImageData(TEX_SIZE, TEX_SIZE);
  const d = img.data;
  for (let y = 0; y < TEX_SIZE; y++) {
    for (let x = 0; x < TEX_SIZE; x++) {
      let r = base[0], g = base[1], b = base[2];
      const jitter = (amp: number) => rng.nextRange(-amp, amp);
      // painterly mottle: large soft patches so texture reads at distance
      const mottle = Math.sin((x / TEX_SIZE) * 9 + Math.sin((y / TEX_SIZE) * 7) * 1.4) * 8;
      r += mottle; g += mottle * 0.9; b += mottle * 0.8;
      switch (mode) {
        case 'rammedEarth': {
          // horizontal compaction bands + grain speckle + straw bits
          const band = Math.sin((y / TEX_SIZE) * 18) * 9;
          r += band + jitter(16); g += band * 0.8 + jitter(16); b += jitter(12);
          if (rng.nextFloat() < 0.3) { r += jitter(22); g += jitter(18); b += jitter(14); } // straw bits
          break;
        }
        case 'thatch': {
          // straw lines running one direction with stray strands
          const line = (Math.sin(x * 0.9 + Math.floor(y / 3) * 1.7) * 8);
          r += line + jitter(12); g += line * 0.9 + jitter(12); b += jitter(9);
          if (rng.nextFloat() < 0.14) { r += 26; g += 20; b += 12; } // bright straw strand
          break;
        }
        case 'timber': {
          // sine grain along the length + knots
          const grain = Math.sin((x / TEX_SIZE) * Math.PI * 9 + (y % 16)) * 10;
          r += grain + jitter(9); g += grain * 0.85 + jitter(9); b += jitter(8);
          if (rng.nextFloat() < 0.04) { r += 18; g += 12; b += 6; }
          break;
        }
        case 'plaster': {
          // soft mottling, warm wash, worn patches
          const wash = Math.sin((x + y) * 0.07) * 7;
          r += wash + jitter(9); g += wash * 0.9 + jitter(9); b += jitter(10);
          if (rng.nextFloat() < 0.1) { r += jitter(24); g += jitter(20); b += jitter(20); } // worn patches
          break;
        }
        case 'cobble':
        case 'stone': {
          // multi-scale grain: dark inclusions + light highlights
          const cell = (Math.floor(x / 6) + Math.floor(y / 6)) % 2 === 0;
          r += (cell ? 7 : -7) + jitter(12); g += (cell ? 7 : -7) + jitter(12); b += (cell ? 5 : -5) + jitter(12);
          break;
        }
        case 'packedEarth': {
          // smooth earth with scattered pebbles
          r += jitter(12); g += jitter(12); b += jitter(10);
          if (rng.nextFloat() < 0.08) { r += 15; g += 13; b += 10; }
          break;
        }
        case 'canvas': {
          // woven cloth: alternating thread shading
          const weave = ((Math.floor(x / 2) + Math.floor(y / 2)) % 2) * 8 - 4;
          r += weave + jitter(8); g += weave * 0.95 + jitter(8); b += jitter(8);
          break;
        }
        case 'hemp': {
          const weave = ((Math.floor(x / 2) + Math.floor(y / 2)) % 2) * 7 - 3.5;
          r += weave + jitter(9); g += weave + jitter(9); b += jitter(9);
          break;
        }
      }
      const i = (y * TEX_SIZE + x) * 4;
      d[i] = Math.max(0, Math.min(255, r));
      d[i + 1] = Math.max(0, Math.min(255, g));
      d[i + 2] = Math.max(0, Math.min(255, b));
      d[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
}

const BASE: Record<PainterlyTextureId, [number, number, number]> = {
  rammedEarth: [154, 123, 84],
  thatch: [200, 168, 106],
  timber: [107, 79, 46],
  plaster: [216, 204, 184],
  cobble: [138, 138, 144],
  stone: [122, 122, 130],
  packedEarth: [140, 115, 80],
  canvas: [201, 160, 106],
  hemp: [184, 168, 136],
};

const CACHE = new Map<string, THREE.CanvasTexture | null>();

/** Get (or build) a deterministic painterly texture. Null in Node. */
export function painterlyTexture(id: PainterlyTextureId, seed = 89274613): THREE.CanvasTexture | null {
  const key = `${id}:${seed}`;
  const hit = CACHE.get(key);
  if (hit !== undefined) return hit;
  const canvas = makeCanvas();
  if (!canvas) {
    CACHE.set(key, null);
    return null;
  }
  canvas.width = TEX_SIZE;
  canvas.height = TEX_SIZE;
  paint(canvas, BASE[id], id, seed);
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  CACHE.set(key, tex);
  return tex;
}

/** Material with painterly texture (falls back to plain color in Node). */
export function painterlyMaterial(
  id: PainterlyTextureId,
  opts?: { color?: number; roughness?: number; metalness?: number; repeat?: number; emissive?: number; emissiveIntensity?: number },
): THREE.MeshStandardMaterial {
  const tex = painterlyTexture(id);
  const mat = new THREE.MeshStandardMaterial({
    color: opts?.color ?? 0xffffff,
    roughness: opts?.roughness ?? 0.85,
    metalness: opts?.metalness ?? 0,
    emissive: opts?.emissive ?? 0x000000,
    emissiveIntensity: opts?.emissiveIntensity ?? 0,
  });
  if (tex) {
    mat.map = tex;
    const r = opts?.repeat ?? 1;
    if (r !== 1) tex.repeat.set(r, r);
  }
  return mat;
}
