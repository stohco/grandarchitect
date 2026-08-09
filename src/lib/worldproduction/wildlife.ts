/**
 * Wildlife — the living world: spirit herbs at their patches, a spirit
 * wolf in the foothills, domestic animals around the houses, birds in the
 * trees. Every placement is deterministic (LCG), derived from canon:
 * herb patch locations from the blueprint ecology, the wolf from Episode 4
 * (the treeline stalker), chickens/ducks from the household dressing sets.
 *
 * Used by BOTH the studio CinematicStage and the director-render page so
 * the world you see is the world the frames capture.
 */

import * as THREE from 'three';
import { LCG } from '../../lib/determinism/primitives';
import { makePalette } from '../assets/factories/set-factory';
import { ECOLOGY_DEFINITIONS } from '../engine/definitions/ecology';

export interface HerbSpec {
  herbId: string;
  name: string;
  x: number;
  z: number;
  /** distinct silhouette per species family (blades/clover/lotus/mushroom). */
  family: 'blades' | 'clover' | 'lotus' | 'mushroom' | 'spike' | 'vine';
  color: number;
}

/** The village's herb patches (blueprint ecology: fields edge, creek bank,
 *  shrine ground, foothill path). Deterministic species assignment. */
export function herbPatches(): HerbSpec[] {
  const herbs = ECOLOGY_DEFINITIONS.filter((d) => d.kind === 'herb');
  const rng = new LCG(0x7E1B ^ 0x9e37);
  const patchCentres: Array<[number, number, number]> = [
    // [x, z, count] — fields edge (east), creek bank (west), shrine ground,
    // foothill path, widow's garden, school yard edge
    [150, 60, 4], [-80, -55, 3], [-8, -14, 3], [-60, -300, 4], [-26, -30, 2], [-50, 18, 2],
  ];
  const families: HerbSpec['family'][] = ['blades', 'clover', 'lotus', 'mushroom', 'spike', 'vine'];
  const colors = [0x4a9a4a, 0x5aa85a, 0x6ab86a, 0x3a8a3a, 0x7ac07a, 0x4a8a5a];
  const out: HerbSpec[] = [];
  for (const [cx, cz, count] of patchCentres) {
    for (let i = 0; i < count; i++) {
      const herb = herbs[Math.floor(rng.nextRange(0, herbs.length))];
      const fam = families[Math.floor(rng.nextRange(0, families.length))];
      const col = colors[Math.floor(rng.nextRange(0, colors.length))];
      out.push({
        herbId: herb.id,
        name: herb.name,
        x: cx + rng.nextRange(-6, 6),
        z: cz + rng.nextRange(-6, 6),
        family: fam,
        color: col,
      });
    }
  }
  return out;
}

export const HERB_PATCH_COUNT = herbPatches().length;

/** Build herb meshes (distinct per family: blades = thin cones, lotus =
 *  wide flat, mushroom = cap on stalk, spike = sharp cone, vine = low
 *  ring, clover = small spheres). Deterministic. */
export function buildHerb(herb: HerbSpec, pal: ReturnType<typeof makePalette>): THREE.Group {
  const g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color: herb.color, roughness: 0.9 });
  const rng = new LCG((herb.x * 31 + herb.z * 17) >>> 0 ^ 0x77aa);
  const h = 0.3 + rng.nextFloat() * 0.35;
  switch (herb.family) {
    case 'blades': {
      for (let i = 0; i < 5; i++) {
        const blade = new THREE.Mesh(new THREE.ConeGeometry(0.03, h * (0.6 + rng.nextFloat() * 0.6), 4), mat);
        blade.position.set((i - 2) * 0.09, blade.geometry.parameters.height / 2 - 0.1, rng.nextFloat() * 0.08 - 0.04);
        blade.rotation.z = rng.nextFloat() * 0.3 - 0.15;
        g.add(blade);
      }
      break;
    }
    case 'clover': {
      for (let i = 0; i < 3; i++) {
        const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.07, 6, 4), mat);
        leaf.position.set((i - 1) * 0.1, 0.12, 0);
        leaf.scale.set(1, 0.5, 1);
        g.add(leaf);
      }
      break;
    }
    case 'lotus': {
      const pad = new THREE.Mesh(new THREE.CircleGeometry(0.22, 8), mat);
      pad.rotation.x = -Math.PI / 2;
      pad.position.y = 0.02;
      g.add(pad);
      const bloom = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.25, 6), new THREE.MeshStandardMaterial({ color: 0xd8a0b0, roughness: 0.8 }));
      bloom.position.y = 0.2;
      g.add(bloom);
      break;
    }
    case 'mushroom': {
      const stalk = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.05, 0.22, 6), new THREE.MeshStandardMaterial({ color: 0xd8d0c0, roughness: 0.9 }));
      stalk.position.y = 0.11;
      g.add(stalk);
      const cap = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 6), mat);
      cap.scale.set(1, 0.6, 1);
      cap.position.y = 0.24;
      g.add(cap);
      break;
    }
    case 'spike': {
      const spike = new THREE.Mesh(new THREE.ConeGeometry(0.05, h * 1.4, 4), mat);
      spike.position.y = h * 0.6;
      g.add(spike);
      break;
    }
    case 'vine': {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.03, 4, 8), mat);
      ring.rotation.x = Math.PI / 2;
      ring.position.y = 0.05;
      g.add(ring);
      break;
    }
  }
  g.position.set(herb.x, 0, herb.z);
  return g;
}

export interface AnimalSpec {
  kind: 'chicken' | 'duck' | 'dog';
  x: number;
  z: number;
}

/** Domestic animals around the houses + a dog at the gate. */
export function animalPlacements(): AnimalSpec[] {
  const rng = new LCG(0xA11C ^ 0x9e37);
  const houses: Array<[number, number]> = [
    [40, 26], [-38, -12], [-30, -36], [48, -54], [62, 44], [16, 36],
  ];
  const out: AnimalSpec[] = [];
  for (const [hx, hz] of houses) {
    const n = 1 + Math.floor(rng.nextRange(0, 2.999)); // 1-3 animals per house
    for (let i = 0; i < n; i++) {
      out.push({
        kind: rng.nextFloat() < 0.75 ? 'chicken' : 'duck',
        x: hx + rng.nextRange(-3, 3),
        z: hz + rng.nextRange(-3, 3),
      });
    }
  }
  out.push({ kind: 'dog', x: 1, z: 156 }); // the gate dog
  return out;
}

/** Build an animal mesh (chicken = small body + head, duck = flatter body,
 *  dog = low body + head + tail). */
export function buildAnimal(a: AnimalSpec, pal: ReturnType<typeof makePalette>): THREE.Group {
  const g = new THREE.Group();
  const rng = new LCG(((a.x * 13 + a.z * 29) >>> 0) ^ 0x5c1a);
  if (a.kind === 'chicken') {
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.13, 6, 4), pal.plaster);
    body.scale.set(1, 0.8, 1.1);
    body.position.y = 0.12;
    g.add(body);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.05, 5, 4), pal.plaster);
    head.position.set(0.12, 0.22, 0);
    g.add(head);
  } else if (a.kind === 'duck') {
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.12, 6, 4), pal.plaster);
    body.scale.set(1.2, 0.7, 1);
    body.position.y = 0.1;
    g.add(body);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.05, 5, 4), pal.plaster);
    head.position.set(0.14, 0.2, 0);
    g.add(head);
  } else {
    // the gate dog: low body, head, tail
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.28, 0.22), pal.timber);
    body.position.y = 0.16;
    g.add(body);
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.18, 0.16), pal.timber);
    head.position.set(0.3, 0.28, 0);
    g.add(head);
    const tail = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.2, 0.06), pal.timber);
    tail.position.set(-0.26, 0.3, 0);
    tail.rotation.z = 0.5;
    g.add(tail);
  }
  g.position.set(a.x, 0, a.z);
  g.rotation.y = rng.nextRange(0, Math.PI * 2);
  return g;
}

export interface BeastSpec {
  kind: 'spirit-wolf';
  x: number;
  z: number;
}

/** The spirit wolf of the Cangwu treeline (Episode 4 canon: quartering,
 *  watching, never charging). Positioned at the foothills edge near the
 *  cache trail so the E4 treeline shots frame it (was 130m off-camera —
 *  the examiner read ep4.11 as 'light blue sky/void', no wolf). */
export function beastPlacements(): BeastSpec[] {
  return [{ kind: 'spirit-wolf', x: -70, z: -285 }];
}

/** Build the spirit wolf: lean grey body, pale eyes, a presence not a prop. */
export function buildSpiritWolf(b: BeastSpec, pal: ReturnType<typeof makePalette>): THREE.Group {
  const g = new THREE.Group();
  const fur = new THREE.MeshStandardMaterial({ color: 0x8a8a92, roughness: 0.8 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.6, 0.45), fur);
  body.position.y = 0.5;
  g.add(body);
  const neck = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.45, 0.3), fur);
  neck.position.set(0.8, 0.75, 0);
  g.add(neck);
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.3, 0.26), fur);
  head.position.set(1.05, 0.92, 0);
  g.add(head);
  // pale gold eyes (the recognition moment)
  for (const s of [-1, 1]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.03, 5, 4), new THREE.MeshBasicMaterial({ color: 0xe8c060 }));
    eye.position.set(1.16, 0.95, s * 0.09);
    g.add(eye);
  }
  const tail = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.12, 0.5), fur);
  tail.position.set(-0.8, 0.62, 0);
  tail.rotation.x = -0.4;
  g.add(tail);
  for (const s of [-1, 1]) {
    for (const f of [0, 1]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.45, 0.12), fur);
      leg.position.set(f ? 0.45 : -0.45, 0.22, s * 0.16);
      g.add(leg);
    }
  }
  g.position.set(b.x, 0, b.z);
  g.rotation.y = 0.6; // quartering, not facing the village
  return g;
}
