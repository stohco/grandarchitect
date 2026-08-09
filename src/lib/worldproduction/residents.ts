/**
 * Residents — the named villagers placed at their houses.
 *
 * The blueprint defines residents per structure (Wang Shouzheng at the
 * senior household, Widow Xu at her house, Master Hu at the salt merchant
 * house...). This module turns those definitions into visible, active
 * humanoids at deterministic positions, so the cinematic world shows the
 * ACTUAL population — not four anonymous figures at the map edge.
 *
 * The placement map mirrors the set-factory structure positions
 * (buildVillageScene) with per-resident offsets so the family cluster
 * reads around each house. Deterministic: no Math.random.
 */

import { WANG_FAMILY_BEND } from './set-blueprint';

export interface ResidentPlacement {
  npcId: string;
  role: 'elder' | 'farmer' | 'merchant' | 'cultivator' | 'child';
  structureId: string;
  /** offset from the structure position (m). */
  ox: number;
  oz: number;
  /** idle | walk | bow — the clip they play. */
  clip: 'idle' | 'walk' | 'bow';
}

/** Role guess for a resident definition id (deterministic fallback). */
function roleFor(npcId: string): ResidentPlacement['role'] {
  if (npcId.includes('zongxian') || npcId.includes('zongde') || npcId.includes('zongwen') || npcId.includes('bao') || npcId.includes('erniu')) return 'child';
  if (npcId.includes('shouzheng') || npcId.includes('shouye') || npcId.includes('zhou') || npcId.includes('wenshu')) return 'elder';
  if (npcId.includes('hu') || npcId.includes('he_')) return 'merchant';
  if (npcId.includes('lun')) return 'cultivator';
  return 'farmer';
}

/** Resident placements derived from the blueprint (structure position +
 *  deterministic family offsets). */
export function residentPlacements(): ResidentPlacement[] {
  const posOf = (id: string): { x: number; z: number } => {
    const map: Record<string, [number, number]> = {
      'structure.village_gate': [0, 160],
      'structure.market_stalls': [16, 36],
      'structure.senior_household': [40, 26],
      'structure.lineage_school': [-42, 22],
      'structure.carpenter_house': [-38, -12],
      'structure.widow_house': [-30, -36],
      'structure.well': [11, -6],
      'structure.dao_shrine': [-11, -9],
      'structure.salt_merchant_house': [48, -54],
      'structure.tenant_household': [62, 44],
      'structure.black_creek': [-95, -70],
      'structure.tenant_fields': [220, 90],
      'structure.cache_hill': [-42, -235],
      'structure.foothills': [-90, -320],
    };
    const p = map[id];
    return p ? { x: p[0], z: p[1] } : { x: 0, z: 0 };
  };

  const out: ResidentPlacement[] = [];
  const index = new Map<string, number>();
  for (const s of WANG_FAMILY_BEND.structures) {
    if (!s.residents) continue;
    for (const npcId of s.residents) {
      const i = index.get(npcId) ?? 0;
      index.set(npcId, i + 1);
      const base = posOf(s.id);
      // family cluster around the house: front yard (z+) and sides
      const offsets: Array<[number, number]> = [
        [1.8, 3.2], [-2.0, 3.4], [2.4, -2.0], [-2.6, -1.8], [0.6, 4.0],
      ];
      const [ox, oz] = offsets[i % offsets.length];
      const clip: ResidentPlacement['clip'] = i % 3 === 0 ? 'walk' : i % 3 === 1 ? 'bow' : 'idle';
      out.push({
        npcId,
        role: roleFor(npcId),
        structureId: s.id,
        ox,
        oz,
        clip,
        // ensure distinct deterministic jitter per npc
        ...{},
      } as ResidentPlacement);
      // use the npcId hash to vary the offset deterministically
      const hash = npcId.split('').reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);
      out[out.length - 1].ox = ox + (hash % 5 - 2) * 0.4;
      out[out.length - 1].oz = oz + ((hash >> 3) % 5 - 2) * 0.4;
    }
  }
  return out;
}

export const RESIDENT_COUNT = residentPlacements().length;
