/**
 * game/characters/character-rig.ts — the character body lives.
 *
 * The Blender-built base body (CHR_BaseBody_Male_A01, GATE 3) gets a
 * procedural walk here, driven by the step rhythm and a fixed clock —
 * never Math.random:
 *   - the ARMS swing on shoulder pivots (the zone nodes re-parent into
 *     pivot groups, so the swing rotates from the shoulder, not the
 *     elbow)
 *   - the HEAD rides a neck pivot and steadies against the walk lean
 *   - the TORSO breathes (a whisper of chest rise)
 *   - the whole body bobs and leans with the step
 * The robe material can be tinted per character (the villagers wear
 * their roles).
 */

import * as THREE from 'three';
import { zoneIdOf } from './slots';

/** Normalize Blender's '.001' dedup + feature suffixes out of node names. */
function zoneId(name: string): string {
  return zoneIdOf(name);
}

export class CharacterRig {
  /** The world-facing group (position + heading). */
  readonly root: THREE.Group;
  /** The walk group: bob + lean + sway (rides on root). */
  private inner: THREE.Group;
  private robe: THREE.MeshStandardMaterial | null = null;
  private clock = 0;
  private phase = 0;
  /** Shoulder pivots for the arm swing. */
  private armL: THREE.Group | null = null;
  private armR: THREE.Group | null = null;
  /** The head pivot (steadies the gaze). */
  private headPivot: THREE.Group | null = null;
  /** The torso nodes (breathing). */
  private torso: THREE.Object3D[] = [];
  private baseScaleY = 1;

  constructor(model: THREE.Object3D, robeColor?: THREE.ColorRepresentation) {
    this.root = new THREE.Group();
    this.inner = new THREE.Group();
    this.inner.add(model);
    this.root.add(this.inner);

    const zoneNodes = new Map<string, THREE.Object3D[]>();
    const headNodes: THREE.Object3D[] = [];
    const neckNodes: THREE.Object3D[] = [];
    const torsoNodes: THREE.Object3D[] = [];
    model.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (mesh.isMesh) {
        mesh.castShadow = true;
        const m = mesh.material as THREE.MeshStandardMaterial;
        if (m && m.name && m.name.startsWith('villager_robe')) {
          this.robe = m;
          if (robeColor) m.color.set(robeColor);
        }
      }
      const zone = o.name && o.name.startsWith('zone_') ? zoneId(o.name) : null;
      if (zone) {
        if (!zoneNodes.has(zone)) zoneNodes.set(zone, []);
        zoneNodes.get(zone)!.push(o);
      }
      if (o.name && (o.name.startsWith('char_head') || o.name.startsWith('char_face'))) headNodes.push(o);
      if (o.name && o.name.startsWith('zone_NECK')) neckNodes.push(o);
      if (o.name && ['zone_CHEST_UPPER', 'zone_CHEST_LOWER', 'zone_BACK_UPPER', 'zone_BACK_LOWER'].includes(zone ?? '')) {
        torsoNodes.push(o);
      }
    });

    // ---- the shoulder pivots: upper arm + forearm + hand swing as one
    // chain from the shoulder joint (±0.24, 1.52 in model space) ----
    const chain = (side: 'L' | 'R'): THREE.Group | null => {
      const parts = [
        ...(zoneNodes.get(`zone_UPPER_ARM_${side}`) ?? []),
        ...(zoneNodes.get(`zone_FOREARM_${side}`) ?? []),
        ...(zoneNodes.get(`zone_HAND_${side}`) ?? []),
      ];
      if (parts.length === 0) return null;
      const pivot = new THREE.Group();
      const sx = side === 'L' ? -0.24 : 0.24;
      pivot.position.set(sx, 0.03, 1.52);
      for (const p of parts) {
        p.getWorldPosition(pivot.userData.tmp ??= new THREE.Vector3());
        model.worldToLocal(pivot.userData.tmp);
        // position the part relative to the shoulder joint
        const rel = pivot.userData.tmp.clone().sub(pivot.position);
        p.position.copy(rel);
        pivot.add(p);
      }
      this.inner.add(pivot);
      return pivot;
    };
    this.armL = chain('L');
    this.armR = chain('R');

    // ---- the head pivot at the neck top (steadies against the lean) ----
    if (headNodes.length > 0) {
      this.headPivot = new THREE.Group();
      this.headPivot.position.set(0, 0, 1.62);
      for (const h of [...headNodes, ...neckNodes]) {
        const w = h.getWorldPosition(new THREE.Vector3());
        model.worldToLocal(w);
        h.position.copy(w).sub(this.headPivot.position);
        this.headPivot.add(h);
      }
      this.inner.add(this.headPivot);
    }
    this.torso = torsoNodes;
    this.baseScaleY = 1;
  }

  /** The robe material (for editor tinting / role colors). */
  get robeMaterial(): THREE.MeshStandardMaterial | null {
    return this.robe;
  }

  /** Advance the walk: arms swing, head steadies, torso breathes. */
  update(dt: number, speed: number, heading: number): void {
    this.clock += dt;
    const moving = speed > 0.2;
    if (moving) this.phase += dt * 2.4 * Math.min(2, speed);
    this.root.rotation.y = heading;
    const step = Math.sin(this.phase * 2 * Math.PI);
    const walk = Math.min(1, speed / 2.2);
    const bob = moving ? Math.abs(step) * 0.05 * walk : 0;
    const lean = moving ? 0.05 * walk : 0;
    // heel-toe: the body pitches with the stride (forward on the push,
    // back on the catch), riding on the lean
    const pitch = moving ? Math.cos(this.phase * 2 * Math.PI) * 0.03 * walk : 0;
    this.inner.position.y = bob;
    this.inner.rotation.x = lean + pitch;
    // the robe breathes with the walk (a micro-sway of the cloth)
    this.inner.rotation.z = moving ? Math.sin(this.phase * 4 * Math.PI) * 0.02 : 0;

    // arms swing from the SHOULDERS, in antiphase; at rest they ride OUT
    // from the sides (the reference's lats push them ~17° out)
    const swing = moving ? step * 0.5 * walk : Math.sin(this.clock * 1.2) * 0.03;
    if (this.armL) {
      this.armL.rotation.x = swing;
      this.armL.rotation.z = -0.3;
    }
    if (this.armR) {
      this.armR.rotation.x = -swing;
      this.armR.rotation.z = 0.3;
    }

    // the head steadies: counter the lean AND the pitch, keep the gaze
    // level on the horizon
    if (this.headPivot) {
      this.headPivot.rotation.x = -(lean + pitch) * 0.9
        + (moving ? Math.cos(this.phase * 4 * Math.PI) * 0.012 : Math.sin(this.clock * 0.9) * 0.01);
    }

    // breathing: the chest rises a whisper on its own slow rhythm
    const breath = 1 + 0.012 * Math.sin(this.clock * 1.5);
    for (const t of this.torso) t.scale.set(1, breath * this.baseScaleY, 1);
  }

  /** A deterministic hash of the walk state (evidence). */
  stateHash(): string {
    return `${this.clock.toFixed(2)}|${this.phase.toFixed(2)}`;
  }
}
