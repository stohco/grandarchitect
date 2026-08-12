/**
 * game/time/planet-time.ts — the canonical planet time system.
 *
 * Every planet has ONE clock and ONE rotation; time is LOCAL to where you
 * stand. The sun is fixed in the sky; the planet turns beneath it, so the
 * day/night terminator sweeps across the world:
 *
 *   terminatorSpeed = PLANET_CIRCUMFERENCE_M / DAY_LENGTH_SECONDS
 *
 * The physics contract (the user's rule): a flier who moves faster than the
 * terminator can chase the sun — leave the night side and re-enter day.
 * With a 400 km circumference and a 1-hour day the terminator moves at
 * 111 m/s; sword flight at high realms must exceed that.
 *
 * Everything is deterministic — no Math.random anywhere. The same planet
 * clock + same positions → the same local times, everywhere, every run.
 */

/** The mortal planet's east-west circumference (m) — a small world. */
export const PLANET_CIRCUMFERENCE_M = 400_000;

/**
 * Day length in real seconds. TUNED FOR GAMEPLAY: a full village day in an
 * hour of play — dawn at 15 min, noon at 30, dusk at 45 — while the
 * terminator stays outrunnable only by genuine speed (see the conformance).
 */
export const DAY_LENGTH_SECONDS = 3600;

/** The terminator's eastward sweep speed (m/s). */
export function terminatorSpeed(): number {
  return PLANET_CIRCUMFERENCE_M / DAY_LENGTH_SECONDS;
}

/** Longitude phase of a world position (0..1 of the circumference). */
export function longitudePhase(x: number): number {
  const wrapped = ((x % PLANET_CIRCUMFERENCE_M) + PLANET_CIRCUMFERENCE_M) % PLANET_CIRCUMFERENCE_M;
  return wrapped / PLANET_CIRCUMFERENCE_M;
}

/**
 * The canonical planet clock. Advances every tick; local time at a position
 * is the clock shifted by longitude (the planet turns under the fixed sun).
 */
export class PlanetTimeSystem {
  /** Universal planet time, 0..1. */
  time = 0.25; // the game opens just past dawn at the origin

  /** Advance the planet by a real-time delta. */
  update(delta: number): number {
    this.time = (this.time + delta / DAY_LENGTH_SECONDS) % 1;
    return this.time;
  }

  /** LOCAL solar time at a world position (0..1). */
  localTimeAt(x: number, _z: number): number {
    return (this.time + longitudePhase(x)) % 1;
  }

  /** True if the sun is up at this position. */
  isDayAt(x: number, z: number): boolean {
    const t = this.localTimeAt(x, z);
    return t >= 0.24 && t < 0.76;
  }

  /** True if it is night at this position (sun below the horizon). */
  isNightAt(x: number, z: number): boolean {
    return !this.isDayAt(x, z);
  }

  /** The sun's elevation (-1..1, sine of the altitude) at a position. */
  sunElevationAt(x: number, z: number): number {
    const t = this.localTimeAt(x, z);
    // rise 0.25, peak 0.5, set 0.75 (sky.js phase)
    const theta = (t - 0.5) * Math.PI * 2;
    return Math.cos(theta) * 0.92 + 0.08;
  }

  /**
   * The sun's azimuth direction (unit vector, +x = east). The sun rises in
   * the east and sets in the west, whatever longitude you stand on.
   */
  sunDirectionAt(x: number, z: number): { x: number; y: number; z: number } {
    const t = this.localTimeAt(x, z);
    const theta = (t - 0.5) * Math.PI * 2;
    const tilt = 0.41;
    const dir = {
      x: -Math.sin(theta) * Math.cos(tilt),
      y: Math.cos(theta) * Math.cos(tilt) + 0.08,
      z: -Math.sin(theta) * Math.sin(tilt),
    };
    const len = Math.hypot(dir.x, dir.y, dir.z) || 1;
    return { x: dir.x / len, y: dir.y / len, z: dir.z / len };
  }

  /** The daily phase at a position: sleep/gather/work/rest. */
  phaseAt(x: number, z: number): 'sleep' | 'gather' | 'work' | 'rest' {
    const t = this.localTimeAt(x, z);
    if (t >= 0.68 || t < 0.24) return 'sleep';
    if (t < 0.32) return 'gather';
    if (t < 0.56) return 'work';
    return 'rest';
  }
}
