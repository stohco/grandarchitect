/**
 * game/game-clock.ts — the deterministic day clock.
 *
 * One day = 600 seconds of game time. The sun rises at 0.25, peaks at 0.5,
 * sets at 0.75 (sky.js phase). Night is t >= 0.72 || t < 0.24. Everything
 * that depends on the time of day reads this clock.
 */

export const DAY_LENGTH_SECONDS = 600;

export class GameClock {
  /** Time of day, 0..1. */
  timeOfDay = 0.26; // the game opens at dawn

  /** Advance by a real-time delta; returns the new time of day. */
  update(delta: number): number {
    this.timeOfDay = (this.timeOfDay + delta / DAY_LENGTH_SECONDS) % 1;
    return this.timeOfDay;
  }

  get isNight(): boolean {
    return this.timeOfDay >= 0.72 || this.timeOfDay < 0.24;
  }

  get phase(): 'sleep' | 'gather' | 'work' | 'rest' {
    const t = this.timeOfDay;
    if (t >= 0.68 || t < 0.24) return 'sleep';
    if (t < 0.32) return 'gather';
    if (t < 0.56) return 'work';
    return 'rest';
  }
}
