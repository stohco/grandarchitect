/**
 * game/cinematic/director.ts — the studio director.
 *
 * Like a Higgsfield-style director for the draft film: it owns the film
 * grammar (compose / move / reveal / action / physics / close), the stage
 * sets (the planet's major areas), and the review pass. It composes the
 * script into camera shots, directs the cinematic, then REVIEWS the
 * recorded draft — checking every beat against the world's laws (sky
 * matches the time, water in the stream shots, structures in frame, no
 * black frames) — and writes DIRECTOR'S NOTES, which ride along with the
 * video as the briefing for the video model.
 *
 * Deterministic — the director is part of the lawful world.
 */

import type { Shot } from './cinematic';

export type ShotMove = 'compose' | 'move' | 'reveal' | 'action' | 'physics' | 'close';

export interface StageSet {
  id: string;
  name: string;
  location: [number, number];
  /** Camera height band above the ground for this set. */
  eyeHeight: [number, number];
  /** A secondary focal point (a subject to reveal). */
  focal?: [number, number, number];
}

export interface ScriptBeat {
  id: string;
  name: string;
  stage: string;
  move: ShotMove;
  timeOfDay: number;
  duration: number;
  action?: 'raid' | 'festival' | 'none';
}

/** A frame sample from the recording (the director's dailies). */
export interface FrameSample {
  t: number;
  shotId: string;
  /** Average sky luminance 0..1, and the R/B ratio of the horizon band. */
  skyLum: number;
  horizonRoverB: number;
  /** Fraction of the frame that is near-black (0..1). */
  darkFrac: number;
  /** Fraction of blue-ish pixels (water/sky) 0..1. */
  blueFrac: number;
  /** Fraction of pale (stucco/snow) pixels 0..1. */
  paleFrac: number;
}

export interface DirectorNotes {
  shotId: string;
  verdict: 'pass' | 'note';
  notes: string[];
}

export interface DirectorCut {
  shots: Shot[];
  notes: DirectorNotes[];
}

const STAGE_SETS: StageSet[] = [
  { id: 'village', name: 'Wang Family Village', location: [256, -128], eyeHeight: [58, 66], focal: [256, 60, -128] },
  { id: 'stream', name: 'The Village Stream', location: [275, -100], eyeHeight: [50, 58] },
  { id: 'square', name: 'The Square', location: [256, -128], eyeHeight: [59, 63], focal: [258, 60, -126] },
  { id: 'fence', name: 'The East Fence', location: [292, -108], eyeHeight: [58, 62], focal: [296, 59, -104] },
  { id: 'qing_hill', name: 'Heng Yue — Qing Hill', location: [30000, -5000], eyeHeight: [300, 520], focal: [30000, 330, -5000] },
  { id: 'south_sea', name: 'The South Sea', location: [0, 48000], eyeHeight: [60, 120], focal: [0, 0, 52000] },
];

/** The director's default cut — the panoramic beats. */
export const DIRECTOR_BEATS: ScriptBeat[] = [
  { id: 'dawn_village', name: 'Dawn — Wang Family Village', stage: 'village', move: 'compose', timeOfDay: 0.255, duration: 10 },
  { id: 'noon_stream', name: 'Noon — the Village Stream', stage: 'stream', move: 'move', timeOfDay: 0.5, duration: 9 },
  { id: 'dusk_square', name: 'Dusk — the Square', stage: 'square', move: 'reveal', timeOfDay: 0.755, duration: 8 },
  { id: 'night_raid', name: 'Night — Wolves at the Fence', stage: 'fence', move: 'action', timeOfDay: 0.88, duration: 10, action: 'raid' },
  { id: 'god_eye', name: 'Dawn — the God\'s Eye', stage: 'village', move: 'compose', timeOfDay: 0.26, duration: 12 },
  { id: 'qing_hill', name: 'Heng Yue — Qing Hill', stage: 'qing_hill', move: 'close', timeOfDay: 0.28, duration: 12 },
  { id: 'south_sea', name: 'The South Sea', stage: 'south_sea', move: 'move', timeOfDay: 0.45, duration: 12 },
  { id: 'terminator', name: 'The Terminator — 200 km East', stage: 'village', move: 'physics', timeOfDay: 0.3, duration: 24 },
];

export class Director {
  constructor(stageSets: StageSet[] = STAGE_SETS, beats: ScriptBeat[] = DIRECTOR_BEATS) {
    this.stages = new Map(stageSets.map((s) => [s.id, s]));
    this.beats = beats;
  }

  readonly beats: ScriptBeat[];
  private stages: Map<string, StageSet>;

  /** Compose the beats into a shot list (camera grammar per move type).
   * durationScale shortens every shot (a trailer cut vs the full cut). */
  compose(durationScale = 1): Shot[] {
    return this.beats.map((b, i) => this.shotFromBeat(b, i, durationScale));
  }

  /** The shot grammar: each move type gets its camera language. */
  private shotFromBeat(b: ScriptBeat, index: number, durationScale = 1): Shot {
    const stage = this.stages.get(b.stage);
    const loc: [number, number] = stage ? stage.location : [256, -128];
    const eye: [number, number] = stage ? stage.eyeHeight : [58, 64];
    const focal: [number, number, number] = stage?.focal ?? [loc[0], eye[0], loc[1]];
    const [x, z] = loc;
    const base = (u: number) => eye[0] + (eye[1] - eye[0]) * u;

    let keyframes: Shot['keyframes'];
    switch (b.move) {
      case 'compose': {
        // a slow wide pan around the subject at medium altitude
        keyframes = [
          { t: 0, pos: [x + 34, base(0.4), z - 26], look: [focal[0], focal[1], focal[2]] },
          { t: 0.5, pos: [x - 22, base(0.55), z + 30], look: [focal[0], focal[1], focal[2]] },
          { t: 1, pos: [x - 6, base(0.65), z - 18], look: [focal[0], focal[1], focal[2]] },
        ];
        break;
      }
      case 'move': {
        // a straight flythrough along the stage's axis
        keyframes = [
          { t: 0, pos: [x - 24, base(0.5), z - 20], look: [x + 30, base(0.2), z + 24] },
          { t: 1, pos: [x + 30, base(0.2), z + 24], look: [x + 60, base(0.1), z + 48] },
        ];
        break;
      }
      case 'reveal': {
        // push in on the focal point
        keyframes = [
          { t: 0, pos: [focal[0] + 26, base(0.7), focal[2] - 22], look: [focal[0], focal[1], focal[2]] },
          { t: 1, pos: [focal[0] + 6, base(0.8), focal[2] - 5], look: [focal[0], focal[1], focal[2]] },
        ];
        break;
      }
      case 'action': {
        // rush toward the event
        keyframes = [
          { t: 0, pos: [focal[0] - 34, base(0.6), focal[2] + 26], look: [focal[0], focal[1], focal[2]] },
          { t: 0.5, pos: [focal[0] - 12, base(0.7), focal[2] + 10], look: [focal[0], focal[1], focal[2]] },
          { t: 1, pos: [focal[0] - 2, base(0.75), focal[2] + 3], look: [focal[0], focal[1], focal[2]] },
        ];
        break;
      }
      case 'close': {
        // a tight orbit of the subject
        keyframes = [
          { t: 0, pos: [focal[0] + 60, base(0.7), focal[2]], look: [focal[0], focal[1], focal[2]] },
          { t: 0.5, pos: [focal[0], base(0.85), focal[2] - 60], look: [focal[0], focal[1], focal[2]] },
          { t: 1, pos: [focal[0] - 60, base(0.9), focal[2]], look: [focal[0], focal[1], focal[2]] },
        ];
        break;
      }
      case 'physics': {
        // the terminator flight: 200 km east, straight and fast
        keyframes = [
          { t: 0, pos: [256, 200, -128], look: [10000, 195, -120] },
          { t: 0.25, pos: [50000, 210, -120], look: [60000, 205, -110] },
          { t: 0.5, pos: [100000, 220, -110], look: [110000, 210, -100] },
          { t: 0.75, pos: [150000, 230, -100], look: [160000, 220, -90] },
          { t: 1, pos: [200000, 240, -90], look: [210000, 230, -80] },
        ];
        break;
      }
    }

    return {
      id: b.id,
      name: b.name,
      duration: b.duration * durationScale,
      timeOfDay: b.timeOfDay,
      player: [x, eye[0], z],
      keyframes,
      action: b.action ?? 'none',
    };
  }

  /**
   * THE REVIEW PASS — the director watches the dailies. Each beat's frames
   * are checked against the world's laws: the sky must match the beat's
   * time of day, water shots need water, village shots need structure,
   * and a black frame is an artifact.
   */
  review(samples: FrameSample[]): DirectorNotes[] {
    const notes: DirectorNotes[] = [];
    for (const beat of this.beats) {
      const frames = samples.filter((s) => s.shotId === beat.id);
      if (frames.length < 2) {
        notes.push({ shotId: beat.id, verdict: 'note', notes: [`no dailies recorded for ${beat.name}`] });
        continue;
      }
      const n: string[] = [];
      const avgLum = frames.reduce((a, f) => a + f.skyLum, 0) / frames.length;
      const avgRoverB = frames.reduce((a, f) => a + f.horizonRoverB, 0) / frames.length;
      const avgDark = frames.reduce((a, f) => a + f.darkFrac, 0) / frames.length;
      const avgBlue = frames.reduce((a, f) => a + f.blueFrac, 0) / frames.length;
      const avgPale = frames.reduce((a, f) => a + f.paleFrac, 0) / frames.length;

      const t = beat.timeOfDay;
      const isDay = t >= 0.24 && t < 0.76;
      const isNight = !isDay;
      if (isNight && avgLum > 0.25) n.push(`${beat.name}: the sky is too bright for night (${(avgLum * 100).toFixed(0)}% lum) — the sun may be wrong.`);
      if (isDay && avgLum < 0.12) n.push(`${beat.name}: the sky is too dark for ${t < 0.32 ? 'dawn' : t < 0.6 ? 'noon' : 'dusk'} — check the light.`);
      if ((t >= 0.72 || t < 0.24) && avgRoverB < 0.7) n.push(`${beat.name}: the horizon should be cool at night — R/B ${avgRoverB.toFixed(2)}.`);
      if (beat.stage === 'stream' && avgBlue < 0.02) n.push(`${beat.name}: the stream shot has no water in frame — check the camera path.`);
      if (beat.stage === 'village' && avgPale < 0.01) n.push(`${beat.name}: the village shot has no structures in frame — check the camera path.`);
      if (avgDark > 0.8) n.push(`${beat.name}: ${(avgDark * 100).toFixed(0)}% of the frame is black — an artifact.`);

      notes.push({ shotId: beat.id, verdict: n.length === 0 ? 'pass' : 'note', notes: n });
    }
    return notes;
  }

  /** The director's cut: compose + review = the deliverable for the model. */
  cut(samples: FrameSample[]): DirectorCut {
    return { shots: this.compose(), notes: this.review(samples) };
  }
}
