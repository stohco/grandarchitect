/**
 * game/village/villagers.ts — the village's people, on the frontier cognition.
 *
 * Every villager carries the canonical NPC brain (frontier/npc-cognition):
 * a BeliefGraph (what they know), an EpisodicMemory (what they remember),
 * and a Personality (who they are). Their schedules are deterministic
 * functions of the day clock; their dialogue is personality + belief aware;
 * their favors are the mundane economy (constitution category 1).
 *
 * Movement is simple and deterministic: each phase has a target; villagers
 * walk the field height, never the void.
 */

import * as THREE from 'three';
import {
  createBeliefGraph, assertBelief, believe,
  createEpisodicMemory, recordEpisode, recall, decayMemory,
  createPersonality, type Personality,
} from '../../frontier/npc-cognition';
import type { PlanetHeightField } from '../planet/height-field';
import { villageCenter, HOUSES, FAVORS } from './village-authoring';
import type { Inventory } from '../inventory';

/** Art-bible role robe colors (sRGB hex). */
const ROBE_COLORS: Record<string, number> = {
  elder: 0x7a6652,  // earth-brown
  farmer: 0xb0a060, // straw
  healer: 0x8fa8b8, // blue-grey
  smith: 0x30353a,  // soot
  youth: 0xd08088,  // bright
};

const PERSONALITY_BY_ROLE: Record<string, Partial<Personality>> = {
  elder: { cautious: 0.7, loyal: 0.8, ambitious: 0.2 },
  farmer: { cautious: 0.5, loyal: 0.7, greedy: 0.4 },
  healer: { merciful: 0.9, cautious: 0.6, irritable: 0.1 },
  smith: { irritable: 0.6, proud: 0.8, cautious: 0.3 },
  youth: { ambitious: 0.9, cautious: 0.2, proud: 0.5 },
};

const TALK: Record<string, string[]> = {
  elder: ['The fields will not wait.', 'I have seen enough winters to know patience.', 'Do not trust the mountain at night.'],
  farmer: ['The soil is good this year.', 'My back remembers every stone in this field.', 'A cultivator passed on the road yesterday.'],
  healer: ['Let me see that wound.', 'Herbs grow where the qi gathers.', 'The moonflower blooms again.'],
  smith: ['Iron must be struck hot.', 'My grandfather forged for the sect.', 'You carry a sword — let me see it.'],
  youth: ['Have you been to the big city?', 'The mountain is calling me.', 'One day I will ride a sword.'],
};

export interface VillagerHandle {
  id: string;
  name: string;
  role: string;
  houseId: string;
  personality: Personality;
  beliefs: ReturnType<typeof createBeliefGraph>;
  memory: ReturnType<typeof createEpisodicMemory>;
  position: { x: number; z: number };
  /** The favor this villager currently offers (from the authored economy). */
  favor: (typeof FAVORS)[number] | null;
  relationship: number; // 0..1 — how much they trust the player
  body: THREE.Group;
  update: (dt: number, phase: string, tick: number) => void;
  talk: () => string;
  fulfill: (inv: Inventory) => { ok: boolean; line: string };
}

/** Build the village's people. */
export function buildVillagers(field: PlanetHeightField, scene: THREE.Scene): VillagerHandle[] {
  const center = villageCenter();
  const villagers: VillagerHandle[] = [];
  // deterministic favor assignment: one farmer, one healer, one smith
  const favorByRole = new Map<string, (typeof FAVORS)[number]>();
  for (const f of FAVORS) favorByRole.set(f.role, f);

  for (const house of HOUSES) {
    const name = house.name;
    const role = house.role;
    const personality = createPersonality(PERSONALITY_BY_ROLE[role]);
    const beliefs = createBeliefGraph();
    const memory = createEpisodicMemory();
    const homeX = center.x + house.dx;
    const homeZ = center.z + house.dz;
    const favor = favorByRole.get(role) ?? null;

    // the body: a robe-colored capsule with a head — the village's people
    const body = new THREE.Group();
    const robe = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.24, 0.7, 4, 8),
      new THREE.MeshStandardMaterial({ color: ROBE_COLORS[role] ?? ROBE_COLORS.elder, roughness: 0.85 }),
    );
    robe.castShadow = true;
    body.add(robe);
    const head = new THREE.Mesh(
      new THREE.SphereGeometry(0.13, 8, 6),
      new THREE.MeshStandardMaterial({ color: 0xe6c2a8, roughness: 0.8 }),
    );
    head.position.y = 0.62;
    body.add(head);
    scene.add(body);

    const state = {
      x: homeX,
      z: homeZ,
      phase: '',
      target: { x: homeX, z: homeZ },
      idle: 0,
      tick: 0,
    };

    // deterministic schedule targets per phase
    const spotFor = (phase: string): { x: number; z: number } => {
      const r = (n: number) => ((n * 2654435761) % 1000) / 1000; // hashish — deterministic
      if (phase === 'sleep') return { x: homeX, z: homeZ };
      if (phase === 'gather') return { x: center.x + 2 + r(1) * 3, z: center.z + 2 + r(2) * 3 };
      if (phase === 'work') {
        // farmers to the fields, smith to the anvil, others to the square
        if (role === 'farmer') return { x: center.x + 44 + r(3) * 8, z: center.z - 10 + r(4) * 12 };
        if (role === 'smith') return { x: center.x + 33, z: center.z + 1 };
        return { x: center.x - 2 + r(5) * 4, z: center.z - 2 + r(6) * 4 };
      }
      return { x: center.x - 1 + r(7) * 2, z: center.z - 1 + r(8) * 2 };
    };

    const handle: VillagerHandle = {
      id: house.id,
      name,
      role,
      houseId: house.id,
      personality,
      beliefs,
      memory,
      position: state,
      favor,
      relationship: 0.15,
      body,
      update(dt, phase, tick) {
        state.tick++;
        if (state.phase !== phase) {
          state.phase = phase;
          state.target = spotFor(phase);
          state.idle = 0.3;
        }
        state.idle -= dt;
        // deterministic walk toward the target at a fixed speed
        const dx = state.target.x - state.x;
        const dz = state.target.z - state.z;
        const d = Math.hypot(dx, dz);
        if (d > 0.5 && phase !== 'sleep') {
          const speed = 1.4;
          state.x += (dx / d) * speed * dt;
          state.z += (dz / d) * speed * dt;
          if (d < speed * dt) { state.x = state.target.x; state.z = state.target.z; }
        }
        const gy = field.evaluate(state.x, state.z).height;
        body.position.set(state.x, gy, state.z);
        if (d > 0.1) body.rotation.y = Math.atan2(dx, dz);
        decayMemory(memory, 1);
      },
      talk() {
        // belief-aware: the wolves at the fence color every conversation
        if (believe(beliefs, 'wolves_at_fence')) {
          return 'The wolves took another lamb last night. Someone should deal with the ridge.';
        }
        if (believe(beliefs, 'player_helped')) {
          return 'You have a good heart for this village.';
        }
        const lines = TALK[role] ?? TALK.elder;
        return lines[state.tick % lines.length];
      },
      fulfill(inv) {
        if (!handle.favor) return { ok: false, line: `${name} has no need of you right now.` };
        const f = handle.favor;
        if (!inv.has(f.want, f.count)) {
          return { ok: false, line: `${name}: I need ${f.count} ${f.want} — bring what you can.` };
        }
        inv.take(f.want, f.count);
        inv.add(f.reward, f.rewardCount);
        handle.favor = null;
        handle.relationship = Math.min(1, handle.relationship + 0.35);
        assertBelief(beliefs, { proposition: 'player_helped', confidence: 1, source: 'perceived', tick: state.tick });
        recordEpisode(memory, {
          actor: 'player', action: 'fulfilled_favor', target: f.id,
          witnesses: [name], location: 'wang_village', tick: state.tick,
          stakes: 'medium', appraisal: { gratitude: 0.8 },
        });
        return { ok: true, line: `${name}: "Done. ${f.reward} is yours — the village remembers."` };
      },
    };
    villagers.push(handle);
  }
  return villagers;
}

/** The nearest villager within `radius` meters of a world point. */
export function nearestVillager(villagers: VillagerHandle[], x: number, z: number, radius = 4): VillagerHandle | null {
  let best: VillagerHandle | null = null;
  let bestD = radius;
  for (const v of villagers) {
    const d = Math.hypot(v.position.x - x, v.position.z - z);
    if (d < bestD) { best = v; bestD = d; }
  }
  return best;
}

/** A wolf raid: the fence line is hit — the village knows. */
export function broadcastRaid(villagers: VillagerHandle[], tick: number): void {
  for (const v of villagers) {
    assertBelief(v.beliefs, { proposition: 'wolves_at_fence', confidence: 0.9, source: 'perceived', tick });
    recordEpisode(v.memory, {
      actor: 'wolves', action: 'raid_fence', witnesses: [v.name],
      location: 'east_fence', tick, stakes: 'high', appraisal: { fear: 0.9 },
    });
  }
}
