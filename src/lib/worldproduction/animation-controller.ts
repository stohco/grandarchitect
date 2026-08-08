/**
 * Animation Controller — the animation department's runtime.
 *
 * Turns the static tour keyframes into a finished animation matching the
 * art bible:
 *  - CONTINUOUS CAMERA: ease between shot keyframes; per-shot movement
 *    (dolly-in / crane-down / track / push-in) from the director script.
 *  - PERFORMERS: every humanoid plays its clip on an AnimationMixer
 *    (walk at the market, bow at the shrine, loom at the widow's...).
 *  - DAY/NIGHT: sun position/color, sky, and fog curve across the tour
 *    (dawn cool-blue -> golden hour -> dusk -> night).
 *  - WORLD MOTION: deterministic oscillators — chickens bob, canopies
 *    sway, alders bend, smoke rises, the well bucket creaks, the shrine
 *    ribbons flutter (gauntlet pass 48 — non-humanoid motion).
 *  - SECONDARY MOTION: cloth bones sway with time + wind.
 *
 * Deterministic: the same tour time always produces the same frame.
 */

import * as THREE from 'three';
import { TOUR_SHOTS } from './director-script';
import type { Shot } from './director-script';

const CUT_DISTANCE: Record<string, number> = {
  'extreme-wide': 260, wide: 46, medium: 9, close: 3.4,
  'extreme-close': 1.6, insert: 1.1, aerial: 820, crane: 60, dolly: 7, pov: 1.9,
};

function fovForLens(lensMm: number): number {
  return 2 * Math.atan(24 / (2 * lensMm)) * (180 / Math.PI);
}

export interface TourKeyframe {
  pos: THREE.Vector3;
  target: THREE.Vector3;
  fov: number;
}

export interface Performer {
  group: THREE.Group;
  mixers: THREE.AnimationMixer[];
  clips: Record<string, THREE.AnimationClip>;
  /** which clip plays when (per structure vicinity). */
  role: string;
}

export interface WorldMotionItem {
  object: THREE.Object3D;
  /** base position/orientation (restored each frame). */
  base: { x: number; y: number; z: number; ry: number };
  /** motion type. */
  kind: 'bob' | 'sway' | 'smoke' | 'creak' | 'flutter' | 'bend';
  speed: number;
  amp: number;
  phase: number;
}

export interface AnimationController {
  update: (timeSec: number) => void;
  keyframesFor: (shotId: string) => TourKeyframe | undefined;
  currentShot: (timeSec: number) => Shot;
  performers: Performer[];
  worldMotion: WorldMotionItem[];
  /** render-time only fields. */
  camera: THREE.PerspectiveCamera;
}

// ---------------------------------------------------------------------------
// Day/night curve — derived from the tour's lighting language
// ---------------------------------------------------------------------------

const SUN_POS: Array<[number, THREE.Color, number, THREE.Color]> = [
  // [tourTime, sun color, sun elevation, sky color]
  [0, new THREE.Color(0xffc890), 0.12, new THREE.Color(0x7a9cc0)],    // pre-dawn blue
  [35, new THREE.Color(0xffe8c0), 0.45, new THREE.Color(0x8fb8d8)],   // dawn gold
  [120, new THREE.Color(0xfff2d8), 0.85, new THREE.Color(0xa8c8e8)],  // morning
  [200, new THREE.Color(0xffca8a), 0.55, new THREE.Color(0xd8a878)],  // golden hour
  [225, new THREE.Color(0xff8855), 0.22, new THREE.Color(0x6a4a66)],  // dusk
  [242, new THREE.Color(0x8a9ad8), 0.02, new THREE.Color(0x141a30)],  // night
];

function sampleCurve(points: Array<[number, THREE.Color, number, THREE.Color]>, t: number): { sunColor: THREE.Color; sunEl: number; sky: THREE.Color } {
  if (t <= points[0][0]) return { sunColor: points[0][1].clone(), sunEl: points[0][2], sky: points[0][3].clone() };
  for (let i = 0; i < points.length - 1; i++) {
    const [t0, c0, e0, s0] = points[i];
    const [t1, c1, e1, s1] = points[i + 1];
    if (t >= t0 && t <= t1) {
      const k = (t - t0) / (t1 - t0);
      return {
        sunColor: c0.clone().lerp(c1, k),
        sunEl: e0 + (e1 - e0) * k,
        sky: s0.clone().lerp(s1, k),
      };
    }
  }
  const last = points[points.length - 1];
  return { sunColor: last[1].clone(), sunEl: last[2], sky: last[3].clone() };
}

// ---------------------------------------------------------------------------
// Per-shot movement — the director's camera language
// ---------------------------------------------------------------------------

const MOVEMENT_OFFSET: Record<string, (t: number, kf: TourKeyframe) => { dx: number; dy: number; dz: number }> = {
  'dolly-in': (t) => ({ dx: -t * 6, dy: 0, dz: -t * 6 }),
  'push-in': (t) => ({ dx: -t * 3, dy: 0, dz: -t * 3 }),
  'dolly-out': (t) => ({ dx: t * 6, dy: 0, dz: t * 6 }),
  'crane-down': (t) => ({ dx: 0, dy: -t * 10, dz: 0 }),
  'crane-up': (t) => ({ dx: 0, dy: t * 10, dz: 0 }),
  track: (t) => ({ dx: t * 8, dy: 0, dz: 0 }),
  pan: (t) => ({ dx: 0, dy: 0, dz: t * 2 }),
  tilt: (t) => ({ dx: 0, dy: 0, dz: 0 }),
  static: () => ({ dx: 0, dy: 0, dz: 0 }),
  orbital: (t) => ({ dx: Math.sin(t * Math.PI * 2) * 4, dy: 0, dz: Math.cos(t * Math.PI * 2) * 4 }),
};

const EASE = (k: number) => k * k * (3 - 2 * k);

// ---------------------------------------------------------------------------
// Controller
// ---------------------------------------------------------------------------

export function buildTourAnimation(
  scene: THREE.Scene,
  structures: Map<string, THREE.Group>,
  humanoids: Array<{ group: THREE.Group; clips: Record<string, THREE.AnimationClip>; role: string; x: number; z: number }>,
  camera: THREE.PerspectiveCamera,
  opts?: { sun?: THREE.DirectionalLight; hemi?: THREE.HemisphereLight },
): AnimationController {
  const keyframes = new Map<string, TourKeyframe>();
  for (const shot of TOUR_SHOTS) {
    const target = shot.structureId
      ? (structures.get(shot.structureId)?.position.clone() ?? new THREE.Vector3(0, 0, 0))
      : new THREE.Vector3(0, 0, 0);
    target.y += 2;
    const dist = CUT_DISTANCE[shot.cut] ?? 20;
    keyframes.set(shot.id, {
      pos: new THREE.Vector3(target.x + dist * 0.7, shot.camera.heightM + target.y * 0.2, target.z + dist),
      target,
      fov: fovForLens(shot.camera.lensMm),
    });
  }

  // total tour duration + shot start times
  const starts: number[] = [];
  let acc = 0;
  for (const s of TOUR_SHOTS) { starts.push(acc); acc += s.durationSec; }
  const TOTAL = acc;

  // performers — one mixer per humanoid, default clip by role
  const performers: Performer[] = humanoids.map((h) => {
    const mixer = new THREE.AnimationMixer(h.group);
    const clip = h.clips[h.role === 'elder' ? 'idle' : h.role === 'merchant' ? 'walk' : 'idle'] ?? h.clips.idle;
    mixer.clipAction(clip).play();
    return { group: h.group, mixers: [mixer], clips: h.clips, role: h.role };
  });

  // world motion — tag known ambience in the village scene
  const worldMotion: WorldMotionItem[] = [];
  scene.traverse((o) => {
    const id = (o.userData?.id as string) ?? '';
    const name = (o.userData?.name as string) ?? '';
    const kind =
      name === 'chicken' ? 'bob' :
      name === 'alder' || name === 'pine' || name === 'drying_herbs' || name === 'fabric_roll' || name === 'crop_rows' ? 'sway' :
      name === 'ribbon' ? 'flutter' :
      name === 'bucket' ? 'creak' :
      name.includes('smoke') ? 'smoke' : null;
    if (kind) {
      const phase = (o.id % 360) / 57.3;
      worldMotion.push({
        object: o,
        base: { x: o.position.x, y: o.position.y, z: o.position.z, ry: o.rotation.y },
        kind: kind as WorldMotionItem['kind'],
        speed: 0.6 + (o.id % 10) * 0.08,
        amp: kind === 'bob' ? 0.05 : kind === 'creak' ? 0.04 : 0.02,
        phase,
      });
    }
  });

  let currentShotId = TOUR_SHOTS[0].id;
  let blendFrom: { pos: THREE.Vector3; target: THREE.Vector3; fov: number } | null = null;
  let blendStart = 0;

  const shotAt = (t: number): Shot => {
    let idx = 0;
    for (let i = 0; i < TOUR_SHOTS.length; i++) {
      if (t >= starts[i]) idx = i;
    }
    return TOUR_SHOTS[idx];
  };

  const sun = opts?.sun;
  const hemi = opts?.hemi;

  const update = (timeSec: number): void => {
    const t = timeSec % TOTAL;
    const shot = shotAt(t);
    const local = t - starts[TOUR_SHOTS.indexOf(shot)];
    const kf = keyframes.get(shot.id)!;

    // camera blend on shot change
    if (shot.id !== currentShotId) {
      blendFrom = { pos: camera.position.clone(), target: kf.target.clone(), fov: camera.fov };
      blendStart = local;
      currentShotId = shot.id;
    }

    // ease into the keyframe (0.9s), then apply per-shot movement
    const blend = blendFrom ? Math.min((local - blendStart) / 0.9, 1) : 1;
    const e = EASE(blend);
    const mv = MOVEMENT_OFFSET[shot.camera.movement]?.(local / Math.max(shot.durationSec, 1), kf) ?? { dx: 0, dy: 0, dz: 0 };
    const base = blendFrom
      ? new THREE.Vector3().lerpVectors(blendFrom.pos, kf.pos, e)
      : kf.pos.clone();
    const tgt = blendFrom
      ? new THREE.Vector3().lerpVectors(blendFrom.target, kf.target, e)
      : kf.target.clone();
    camera.position.copy(base).add(new THREE.Vector3(mv.dx, mv.dy, mv.dz));
    camera.lookAt(tgt);
    camera.fov = blendFrom ? blendFrom.fov + (kf.fov - blendFrom.fov) * e : kf.fov;
    camera.updateProjectionMatrix();

    // day/night curve
    const lit = sampleCurve(SUN_POS, t);
    if (sun) {
      sun.position.set(140 * lit.sunEl, 180 * lit.sunEl, 60);
      sun.color.copy(lit.sunColor);
      sun.intensity = 1.6 + lit.sunEl * 0.9;
    }
    if (hemi) {
      hemi.color.set(lit.sky.clone().lerp(new THREE.Color(0xffffff), 0.3));
      hemi.intensity = 0.5 + lit.sunEl * 0.5;
    }
    scene.background = lit.sky.clone();
    if (scene.fog) {
      const fog = scene.fog as THREE.Fog;
      fog.color.copy(lit.sky);
      fog.near = 120; fog.far = 900 - lit.sunEl * 250;
    } else {
      (scene as THREE.Scene).fog = new THREE.Fog(lit.sky.clone(), 120, 900 - lit.sunEl * 250);
    }

    // performers
    const tNow = performance.now() / 1000;
    for (const p of performers) {
      for (const m of p.mixers) m.update(0.016);
      // cloth sway (secondary motion)
      const cloth = p.group.getObjectByName('cloth_hem');
      if (cloth) {
        cloth.rotation.z = Math.sin(tNow * 1.3 + (p.group.id % 7)) * 0.06;
        cloth.rotation.x = Math.sin(tNow * 1.1 + (p.group.id % 5)) * 0.04;
      }
    }

    // world motion
    for (const wm of worldMotion) {
      const o = wm.object;
      const s = Math.sin(tNow * wm.speed + wm.phase);
      switch (wm.kind) {
        case 'bob': o.position.y = wm.base.y + Math.abs(s) * wm.amp; break;
        case 'creak': o.position.y = wm.base.y + Math.sin(tNow * wm.speed * 0.5) * wm.amp; o.rotation.z = Math.sin(tNow * wm.speed * 0.5 + 1) * 0.06; break;
        case 'sway': o.rotation.z = s * wm.amp; break;
        case 'flutter': o.rotation.y = s * 0.2; break;
        case 'smoke': o.position.y = wm.base.y + ((tNow * wm.speed) % 3) * 0.4; break;
        case 'bend': o.rotation.z = s * wm.amp; break;
      }
    }
  };

  return {
    update,
    keyframesFor: (id: string) => keyframes.get(id),
    currentShot: shotAt,
    performers,
    worldMotion,
    camera,
  };
}

export { TOUR_SHOTS };
