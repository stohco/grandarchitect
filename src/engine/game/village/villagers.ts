/**
 * game/village/villagers.ts — the village's people, on the frontier cognition.
 *
 * Every villager carries the canonical NPC brain (frontier/npc-cognition):
 * a BeliefGraph (what they know), an EpisodicMemory (what they remember),
 * and a Personality (who they are). Their movements come from the
 * POPULATION SCHEDULER (game/time/scheduler.ts), driven by the LOCAL time
 * at their own position — the planet turns under them; schedules, seeded
 * variation, and event overrides are all deterministic.
 */

import * as THREE from 'three';
import {
  createBeliefGraph, assertBelief, believe,
  createEpisodicMemory, recordEpisode, recall, decayMemory,
  createPersonality, type Personality,
} from '../../frontier/npc-cognition';
import type { PlanetHeightField } from '../planet/height-field';
import { villageCenter, HOUSES, FAVORS } from './village-authoring';
import { scheduleIntent, type WorldEvent } from '../time/scheduler';
import type { PlanetTimeSystem } from '../time/planet-time';
import { CharacterRig } from '../characters/character-rig';
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
  /** Day index (for schedule variation) — advanced by the day rollover. */
  day: number;
  /** Current world event override (raid/festival/none). */
  event: WorldEvent;
  update: (dt: number, time: PlanetTimeSystem) => void;
  talk: () => string;
  fulfill: (inv: Inventory) => { ok: boolean; line: string };
  /** Swap the placeholder figure for the authored villager (GATE 3). */
  wearModel: (model: THREE.Object3D) => void;
}

/**
 * Build the village's people. When `modelRoot` is given (the Blender-built
 * villager, GATE 3), each villager wears the authored body with their
 * role's robe tint and a procedural walk; otherwise the placeholder
 * capsule+head figure is used.
 */
export function buildVillagers(field: PlanetHeightField, scene: THREE.Scene, modelRoot?: THREE.Object3D): VillagerHandle[] {
  const center = villageCenter();
  const villagers: VillagerHandle[] = [];
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

    const body = new THREE.Group();
    let rig: CharacterRig | null = null;
    if (modelRoot) {
      wearModel(modelRoot);
    } else {
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
    }
    // position the body NOW — a body left at the origin until the first
    // update frame renders a villager flash at (0,0,0) and breaks the
    // law-checker (everything at the origin reads as buried)
    body.position.set(homeX, field.evaluate(homeX, homeZ).height, homeZ);
    scene.add(body);

    /** Swap the placeholder figure for the authored villager (GATE 3). */
    function wearModel(model: THREE.Object3D): void {
      body.clear();
      // each villager wears their own instance with their role's robe
      const instance = model.clone(true);
      instance.traverse((o) => {
        const mesh = o as THREE.Mesh;
        if (mesh.isMesh) {
          mesh.castShadow = true;
          mesh.receiveShadow = true;
          const m = mesh.material as THREE.MeshStandardMaterial;
          if (m && m.isMeshStandardMaterial && m.name && m.name.startsWith('villager_robe')) {
            mesh.material = m.clone();
            (mesh.material as THREE.MeshStandardMaterial).color.set(ROBE_COLORS[role] ?? ROBE_COLORS.elder);
          }
        }
      });
      rig = new CharacterRig(instance);
      body.add(rig.root);
    }

    const state = {
      x: homeX,
      z: homeZ,
      tick: 0,
      spotX: homeX,
      spotZ: homeZ,
    };

    const handle: VillagerHandle = {
      id: `villager_${house.id}`,
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
      day: 0,
      event: 'none',
      wearModel,
      update(dt, time) {
        state.tick++;
        // the villager lives by the LOCAL time at their own position
        const local = time.localTimeAt(state.x, state.z);
        const day = Math.floor(time.time * 10000);
        if (day !== handle.day) { handle.day = day; }
        const intent = scheduleIntent(
          house.id,
          { centerX: center.x, centerZ: center.z, homeX, homeZ, role },
          local,
          handle.day,
          handle.event,
        );
        state.spotX = intent.spotX;
        state.spotZ = intent.spotZ;
        // deterministic walk toward the spot
        const dx = state.spotX - state.x;
        const dz = state.spotZ - state.z;
        const d = Math.hypot(dx, dz);
        if (d > 0.05) {
          const step = Math.min(d, 1.4 * dt);
          state.x += (dx / d) * step;
          state.z += (dz / d) * step;
        }
        const gy = field.evaluate(state.x, state.z).height;
        body.position.set(state.x, gy, state.z);
        const heading = d > 0.1 ? Math.atan2(dx, dz) : body.rotation.y;
        body.rotation.y = heading;
        if (rig) rig.update(dt, d > 0.05 ? 1.4 : 0, heading);
        decayMemory(memory, 1);
      },
      talk() {
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

/** A wolf raid: the fence line is hit — the village knows, and scatters. */
export function broadcastRaid(villagers: VillagerHandle[], tick: number): void {
  for (const v of villagers) {
    v.event = 'raid';
    assertBelief(v.beliefs, { proposition: 'wolves_at_fence', confidence: 0.9, source: 'perceived', tick });
    recordEpisode(v.memory, {
      actor: 'wolves', action: 'raid_fence', witnesses: [v.name],
      location: 'east_fence', tick, stakes: 'high', appraisal: { fear: 0.9 },
    });
  }
}

/** A festival: everyone gathers at the square. */
export function broadcastFestival(villagers: VillagerHandle[], tick: number): void {
  for (const v of villagers) {
    v.event = 'festival';
    recordEpisode(v.memory, {
      actor: 'village', action: 'festival', witnesses: [v.name],
      location: 'square', tick, stakes: 'low', appraisal: { joy: 0.7 },
    });
  }
}

/** Recall the most salient favor memories (for evidence). */
export function favorRecall(villagers: VillagerHandle[], limit = 8) {
  return villagers.flatMap((v) => recall(v.memory, (e) => e.action === 'fulfilled_favor', limit));
}
