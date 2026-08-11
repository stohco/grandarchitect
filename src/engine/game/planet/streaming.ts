/**
 * game/planet/streaming.ts — deterministic chunk residency (spec 12 §6-7).
 *
 * The planet is streamed in 8 m chunks around the player's locality:
 *   S4: within LOAD_RADIUS — resident (rendered, collided)
 *   S1: within KEEP_RADIUS — kept until the player leaves the locality
 *   S0: beyond — unloaded (deterministically regenerable from the seed)
 *
 * Residency is a pure function of (player position, seed) — no timers, no
 * memory probes, no Math.random. Replay reproduces the exact same set.
 */

export interface ResidencySet {
  /** Chunk keys currently resident. */
  resident: Set<string>;
  /** Chunks added this tick. */
  added: string[];
  /** Chunks removed this tick. */
  removed: string[];
}

export const LOAD_RADIUS = 88;   // m — S4 ring around the player
export const KEEP_RADIUS = 160;  // m — locality keep-alive ring

/** The next residency set for a player position. Deterministic. */
export function planResidency(px: number, pz: number, previous: Set<string>): ResidencySet {
  const next = new Set<string>();
  const added: string[] = [];
  const removed: string[] = [];

  const pcx = Math.floor(px / 8);
  const pcz = Math.floor(pz / 8);
  const r = Math.ceil(LOAD_RADIUS / 8);
  for (let dz = -r; dz <= r; dz++) {
    for (let dx = -r; dx <= r; dx++) {
      if (dx * dx + dz * dz > r * r) continue;
      const key = `${pcx + dx},${pcz + dz}`;
      next.add(key);
      if (!previous.has(key)) added.push(key);
    }
  }

  // locality keep-alive: anything within KEEP_RADIUS stays (S1)
  for (const key of previous) {
    if (next.has(key)) continue;
    const [cx, cz] = key.split(',').map(Number);
    const wx = cx * 8 + 4, wz = cz * 8 + 4;
    if (Math.hypot(wx - px, wz - pz) <= KEEP_RADIUS) {
      next.add(key);
    } else {
      removed.push(key);
    }
  }

  return { resident: next, added, removed };
}

/** True if the residency set changed at all. */
export function residencyChanged(a: Set<string>, b: Set<string>): boolean {
  if (a.size !== b.size) return true;
  for (const k of a) if (!b.has(k)) return true;
  return false;
}
