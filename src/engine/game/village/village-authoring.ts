/**
 * game/village/village-authoring.ts — the authored village (constitution
 * category 1: the mundane world; category 45: unimportant things).
 *
 * Every structure, path and field is authored with a cause — nothing rolled.
 * The village sits on the valley floor beside the stream, ringed by twelve
 * timber houses around a beaten-earth square, with a well, a dao shrine,
 * the south gate, the cart road, farm fields east of the stream, and a
 * graveyard where the Wang family has buried its dead for generations.
 */

import { LOCALITIES } from '../planet/world-authoring';

/** The village center (world meters) — from the locality node. */
export function villageCenter(): { x: number; z: number } {
  const v = LOCALITIES.find((l) => l.id === 'wang_village')!;
  return { x: v.x, z: v.z };
}

export interface HouseNode {
  id: string;
  name: string;
  role: 'elder' | 'farmer' | 'healer' | 'smith' | 'youth';
  dx: number;
  dz: number;
  facing: number;
  scale: number;
  locked?: boolean;      // one door in ten refuses (village secrets)
  cause: string;
}

/** Twelve houses ring the square — four per ring, roles distributed. */
export const HOUSES: HouseNode[] = [
  { id: 'house_wang_tiangui', name: 'Wang Tiangui', role: 'elder', dx: -13, dz: -11, facing: 0.5, scale: 0.92, cause: 'The Wang elder\'s house — the family head keeps the oldest timbers.' },
  { id: 'house_li_xiangu', name: 'Li Xiangu', role: 'healer', dx: 9, dz: -11, facing: -0.5, scale: 0.92, cause: 'The healer\'s house, closest to the shrine and the herb-drying racks.' },
  { id: 'house_wang_tie', name: 'Wang Tie', role: 'elder', dx: -13, dz: 11, facing: 2.5, scale: 0.92, cause: 'The second elder keeps the family register here.' },
  { id: 'house_zhang_yong', name: 'Zhang Yong', role: 'farmer', dx: 5, dz: 11, facing: -2.5, scale: 0.92, cause: 'A farmer\'s house — scythes hang by the door.' },
  { id: 'house_wang_ergou', name: 'Wang Ergou', role: 'farmer', dx: -25, dz: -6, facing: 1.5, scale: 1.04, cause: 'The Wangs who work the near fields — on level ground west of the stream.' },
  { id: 'house_blacksmith_zhang', name: 'Blacksmith Zhang', role: 'smith', dx: 8, dz: 28, facing: -1.5, scale: 1.04, cause: 'The smith\'s house and forge — the forge stands where the north wind clears the smoke, on level ground clear of the stream.' },
  { id: 'house_old_li', name: 'Old Li', role: 'elder', dx: 0, dz: -19, facing: 0.2, scale: 1.04, cause: 'Old Li\'s house, nearest the gate — he watches who comes and goes.' },
  { id: 'house_granny_sun', name: 'Granny Sun', role: 'elder', dx: 0, dz: 19, facing: 3.0, scale: 1.04, cause: 'Granny Sun\'s house — her loom faces the square.' },
  { id: 'house_liu_xiaomei', name: 'Liu Xiaomei', role: 'youth', dx: -19, dz: -19, facing: 0.7, scale: 0.8, cause: 'The youngest house — Xiaomei dreams of the sect from its roof.' },
  { id: 'house_wang_daniu', name: 'Wang Daniu', role: 'youth', dx: 13, dz: -18, facing: -0.7, scale: 0.8, cause: 'Daniu\'s family house, near the woodpile — on the level ground clear of the bank.' },
  { id: 'house_liu_yu', name: 'Liu Yu', role: 'healer', dx: -19, dz: 19, facing: 2.0, scale: 0.8, cause: 'A second healer\'s house — drying herbs under the eaves.' },
  { id: 'house_old_wang', name: 'Old Man Wang', role: 'elder', dx: -28, dz: 16, facing: -2.0, scale: 0.8, cause: 'Old Man Wang keeps the graveyard; his house stands nearest the graves.' },
];

/** Fixed structures: well, shrine, gate. All grounded at their own spot. */
export interface VillageFeature {
  id: string;
  name: string;
  hanzi: string;
  dx: number;
  dz: number;
  cause: string;
}

export const FEATURES: VillageFeature[] = [
  { id: 'well', name: 'The Well', hanzi: '井', dx: 1.5, dz: 1.5, cause: 'The village well — the valley\'s water table, a few feet down.' },
  { id: 'shrine', name: 'The Dao Shrine', hanzi: '祠', dx: -8, dz: 0, cause: 'The family shrine — incense for the ancestors and the mountain dao.' },
  { id: 'gate', name: 'The South Gate', hanzi: '门', dx: 0, dz: -9, cause: 'The gate pillars at the road — a gesture of walls, not a wall.' },
];

/** Painted ground: the square and the cart road (terrain-following). */
export const GROUND_STRIPS = [
  { id: 'square', name: 'The Square', dx: 0, dz: 0, w: 14, d: 14, color: 0x9a8a6a, cause: 'The beaten-earth square — threshing, markets, festivals.' },
  { id: 'cart_road', name: 'The Cart Road', dx: 0, dz: -16, w: 3.2, d: 14, color: 0xa39886, cause: 'The cart road south to the Teng city road — the village trades by it.' },
  { id: 'field_east', name: 'The East Fields', dx: 56, dz: -2, w: 26, d: 30, color: 0x7a6a4a, cause: 'The farm plots east of the stream — millet and qi grass, clear of the water course.' },
  { id: 'field_west', name: 'The West Fields', dx: -40, dz: 8, w: 20, d: 34, color: 0x7a6a4a, cause: 'The western plots — the older fields, close-planted.' },
  { id: 'graveyard', name: 'The Graveyard', dx: -30, dz: -20, w: 10, d: 8, color: 0x6a6a5a, cause: 'The family graves — the unimportant dead are still remembered.' },
];

/** The favor economy: what the village needs, what it gives. */
export const FAVORS = [
  { id: 'wolf_fangs', role: 'farmer', want: 'wolf_fang', count: 3, reward: 'health_pill', rewardCount: 1,
    ask: 'Bring me three wolf fangs and I will mend the fence properly.',
    cause: 'Wolves harry the east fence; the fence keeps the fields.' },
  { id: 'moonflowers', role: 'healer', want: 'moonflower', count: 2, reward: 'qi_pill', rewardCount: 1,
    ask: 'Gather moonflowers from the stream bank and I will prepare a qi pill.',
    cause: 'The healer\'s drying racks are bare; the moonflower blooms by the water.' },
  { id: 'iron_ore', role: 'smith', want: 'iron_ore', count: 3, reward: 'iron_sword', rewardCount: 1,
    ask: 'Fetch iron ore from the eastern hills and I will hammer you a blade.',
    cause: 'The forge starves for ore; the hills hold it.' },
];
