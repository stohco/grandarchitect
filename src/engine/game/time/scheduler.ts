/**
 * game/time/scheduler.ts — the population scheduler.
 *
 * Hundreds or thousands of NPCs, each living by the LOCAL time at their
 * position, each with seeded daily variation (the LOOK of randomness,
 * fully reproducible), and each open to EVENT overrides (a raid scatters
 * everyone; a festival gathers everyone) — emergence from world state,
 * never from Math.random.
 *
 * The scheduler is a pure function: (npcId, role, localTime, dayIndex,
 * events) → spot + intent. O(1) per NPC per tick, no allocations beyond the
 * result object — the population pass is a flat loop.
 */

export type Phase = 'sleep' | 'gather' | 'work' | 'rest';

export type WorldEvent = 'raid' | 'festival' | 'none';

export interface ScheduleIntent {
  /** Deterministic target spot (world meters). */
  spotX: number;
  spotZ: number;
  /** What the NPC intends right now (for animation/dialogue). */
  intent: Phase;
  /** True when an event has overridden the daily schedule. */
  overridden: boolean;
}

/** Deterministic per-NPC hash → unit value in [0,1). */
function npcHash(npcId: string, salt: number): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < npcId.length; i++) {
    h ^= npcId.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  h ^= salt;
  h = Math.imul(h ^ (h >>> 15), 2246822519);
  h ^= h >>> 13;
  return ((h >>> 0) % 100000) / 100000;
}

export interface SchedulerOptions {
  /** The village center (or any locality anchor). */
  centerX: number;
  centerZ: number;
  /** Home offset for this NPC (per-NPC, authored). */
  homeX: number;
  homeZ: number;
  /** Role drives the work spot family. */
  role: string;
}

/**
 * One NPC's schedule intent at a local time.
 *
 * Deterministic: the same (npcId, localTime, dayIndex, events) always gives
 * the same spot. Day-to-day variation comes from the dayIndex salt; per-NPC
 * variation from the id hash — so two farmers never stand on the same spot,
 * and the same farmer varies day to day, yet a replay reproduces it all.
 */
export function scheduleIntent(
  npcId: string,
  opts: SchedulerOptions,
  localTime: number,
  dayIndex: number,
  events: WorldEvent = 'none',
): ScheduleIntent {
  // events override the daily rhythm first
  if (events === 'raid') {
    // everyone hurries home or to the gate — scatter with the id hash
    const a = npcHash(npcId, 11) * Math.PI * 2;
    const r = 3 + npcHash(npcId, 12) * 5;
    return {
      spotX: opts.centerX + Math.cos(a) * r,
      spotZ: opts.centerZ + Math.sin(a) * r,
      intent: 'sleep',
      overridden: true,
    };
  }
  if (events === 'festival') {
    // everyone gathers at the square
    const a = npcHash(npcId, 13) * Math.PI * 2;
    const r = npcHash(npcId, 14) * 4;
    return {
      spotX: opts.centerX + Math.cos(a) * r,
      spotZ: opts.centerZ + Math.sin(a) * r,
      intent: 'rest',
      overridden: true,
    };
  }

  const t = localTime;
  const phase: Phase = t >= 0.68 || t < 0.24 ? 'sleep' : t < 0.32 ? 'gather' : t < 0.56 ? 'work' : 'rest';

  // home: the NPC's own door — with a small seeded nudge so no two NPCs
  // stand exactly on the same spot at night
  const homeNudge = (npcHash(npcId, dayIndex) - 0.5) * 1.6;
  if (phase === 'sleep') {
    return { spotX: opts.homeX + homeNudge, spotZ: opts.homeZ + homeNudge, intent: phase, overridden: false };
  }

  // gather: the well / square, varied by the day
  if (phase === 'gather') {
    const a = npcHash(npcId, 1 + dayIndex) * Math.PI * 2;
    const r = 2 + npcHash(npcId, 21) * 3;
    return { spotX: opts.centerX + Math.cos(a) * r, spotZ: opts.centerZ + Math.sin(a) * r, intent: phase, overridden: false };
  }

  // work: role families — farmers to the fields, smith to the anvil,
  // healer to the drying racks, others to the square
  if (phase === 'work') {
    const jx = (npcHash(npcId, 31 + dayIndex) - 0.5) * 10;
    const jz = (npcHash(npcId, 41 + dayIndex) - 0.5) * 12;
    if (opts.role === 'farmer') {
      return { spotX: opts.centerX + 44 + jx, spotZ: opts.centerZ - 8 + jz, intent: phase, overridden: false };
    }
    if (opts.role === 'smith') {
      return { spotX: opts.centerX + 33, spotZ: opts.centerZ + 1, intent: phase, overridden: false };
    }
    if (opts.role === 'healer') {
      return { spotX: opts.centerX + 30 + jx * 0.3, spotZ: opts.centerZ - 18 + jz * 0.3, intent: phase, overridden: false };
    }
    return { spotX: opts.centerX - 2 + jx * 0.4, spotZ: opts.centerZ - 2 + jz * 0.4, intent: phase, overridden: false };
  }

  // rest: near home, on the door step
  const r2 = 1 + npcHash(npcId, 51 + dayIndex) * 2;
  const a2 = npcHash(npcId, 61 + dayIndex) * Math.PI * 2;
  return { spotX: opts.homeX + Math.cos(a2) * r2, spotZ: opts.homeZ + Math.sin(a2) * r2, intent: phase, overridden: false };
}

/**
 * Advance an entire population in one flat pass. Returns the total distance
 * walked (for evidence/statistics). Pure — no hidden state.
 */
export function advancePopulation(
  npcs: Array<{
    id: string;
    pos: { x: number; z: number };
    schedule: ScheduleIntent;
    walkSpeed: number;
    dt: number;
  }>,
): number {
  let walked = 0;
  for (const n of npcs) {
    const dx = n.schedule.spotX - n.pos.x;
    const dz = n.schedule.spotZ - n.pos.z;
    const d = Math.hypot(dx, dz);
    if (d > 0.01) {
      const step = Math.min(d, n.walkSpeed * n.dt);
      n.pos.x += (dx / d) * step;
      n.pos.z += (dz / d) * step;
      walked += step;
    }
  }
  return walked;
}
