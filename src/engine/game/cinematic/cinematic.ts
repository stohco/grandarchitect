/**
 * game/cinematic/cinematic.ts — the scripted camera (the trailer rig).
 *
 * A SHOT is a camera path: keyframed positions and look targets, a planet
 * clock setting, an optional ACTION (raid, festival), and a player
 * teleport (the world streams around the PLAYER, so a shot location is
 * loaded by moving the controller there). The cinematic drives the camera,
 * the clock, and the player — everything else follows the world's own
 * systems (schedules, sky, water, raid visuals).
 *
 * This is the "draft skeleton" camera: at low fidelity it films the whole
 * planet; the recording is the input for a video model to make real.
 */

import * as THREE from 'three';
import type { GameHandle } from '../bootstrap';

export interface CameraKeyframe {
  /** 0..1 along the shot. */
  t: number;
  pos: [number, number, number];
  look: [number, number, number];
}

export interface Shot {
  id: string;
  name: string;
  /** Seconds. */
  duration: number;
  /** The planet clock at shot start (0..1). */
  timeOfDay: number;
  /** Where the PLAYER teleports for this shot (the world streams here). */
  player: [number, number, number];
  /** Camera keyframes (>= 2, sorted by t). */
  keyframes: CameraKeyframe[];
  /** Optional hook: raid, festival, … */
  action?: 'raid' | 'festival' | 'none';
}

/** Interpolate a keyframed vector at u in 0..1. */
function sample(keyframes: Array<{ t: number; v: THREE.Vector3 }>, u: number, out: THREE.Vector3): THREE.Vector3 {
  if (u <= keyframes[0].t) return out.copy(keyframes[0].v);
  for (let i = 0; i < keyframes.length - 1; i++) {
    const a = keyframes[i], b = keyframes[i + 1];
    if (u <= b.t) {
      const f = (u - a.t) / (b.t - a.t || 1);
      return out.copy(a.v).lerp(b.v, f);
    }
  }
  return out.copy(keyframes[keyframes.length - 1].v);
}

export class Cinematic {
  shots: Shot[];
  active = false;
  private shotIndex = 0;
  private shotTime = 0;
  private engine: GameHandle | null = null;
  private onDone: (() => void) | null = null;
  private posKf: Array<{ t: number; v: THREE.Vector3 }> = [];
  private lookKf: Array<{ t: number; v: THREE.Vector3 }> = [];

  /** The director's dailies hook: called every cinematic frame with the
   * shot id and the time fraction. */
  onFrame: ((shotId: string, u: number) => void) | null = null;

  constructor(shots: Shot[]) {
    this.shots = shots;
  }

  /** Start the cinematic. */
  play(engine: GameHandle, onDone: () => void): void {
    this.engine = engine;
    this.onDone = onDone;
    this.active = true;
    this.shotIndex = 0;
    this.shotTime = 0;
    this.beginShot();
  }

  stop(): void {
    this.active = false;
    this.engine = null;
  }

  private beginShot(): void {
    const shot = this.shots[this.shotIndex];
    this.shotTime = 0;
    this.engine!.time.time = shot.timeOfDay;
    // teleport the player so the world streams to this location
    const p = this.engine!.player.controller.position;
    const [px, py, pz] = shot.player;
    p.x = px; p.y = py; p.z = pz;
    this.engine!.planet.update(px, pz);
    // camera keyframes
    this.posKf = shot.keyframes.map((k) => ({ t: k.t, v: new THREE.Vector3(...k.pos) }));
    this.lookKf = shot.keyframes.map((k) => ({ t: k.t, v: new THREE.Vector3(...k.look) }));
    if (shot.action === 'raid') {
      const { broadcastRaid } = this.engine!.villagers ? { broadcastRaid: (window as unknown as { __raid?: () => void }).__raid } : { broadcastRaid: null };
      // the raid hook is wired from bootstrap
      if (this.engine!.raidVisuals) this.engine!.raidVisuals.trigger();
    }
  }

  /** Advance the shot clock and drive the camera. */
  update(dt: number): void {
    if (!this.active || !this.engine) return;
    const shot = this.shots[this.shotIndex];
    this.shotTime += dt;
    // the planet turns while we fly
    this.engine.time.update(dt);
    const u = Math.min(1, this.shotTime / shot.duration);
    const pos = sample(this.posKf, u, new THREE.Vector3());
    const look = sample(this.lookKf, u, new THREE.Vector3());
    this.engine.camera.position.copy(pos);
    this.engine.camera.lookAt(look);
    if (this.onFrame) this.onFrame(shot.id, u);
    if (u >= 1) {
      this.shotIndex++;
      if (this.shotIndex >= this.shots.length) {
        this.active = false;
        const done = this.onDone;
        this.onDone = null;
        done?.();
      } else {
        this.beginShot();
      }
    }
  }

  /** The current shot's name (for the recording manifest). */
  get currentName(): string {
    return this.shots[this.shotIndex]?.name ?? '';
  }
}
