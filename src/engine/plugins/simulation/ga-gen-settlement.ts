/**
 * ga:gen-settlement — Settlement Generator
 *
 * Implements doc 17 §8.2 and doc 04 (Mortal Substrate).
 * Generates Wang Family Bend from a seed, deterministically.
 * Two runs from the same seed produce the same village.
 *
 * The generator produces: river, levee, path network, lineage hall,
 * households (5 named + N procedural), communal well, threshing ground,
 * mill, spirit shrine, paddy plots, dryland gardens, graveyard.
 *
 * Pure functions over typed state. No forbidden functions.
 * Uses determinism RNG (xoshiro256**) for all stochastic choices.
 */

import type { Plugin, PluginHost } from '../../kernel/plugin-host';
import type { EntityId, Tick, SimulationTier } from '../../kernel/types';

// ============================================================================
// Types
// ============================================================================

export type StructureKind =
  | 'lineage_hall' | 'household' | 'well' | 'threshing_ground'
  | 'mill' | 'spirit_shrine' | 'dock' | 'path'
  | 'paddy' | 'dryland_garden' | 'graveyard' | 'levee';

export interface Vec2 {
  x: number;
  z: number;
}

export interface GeneratedStructure {
  entityId: EntityId;
  kind: StructureKind;
  name: string;
  nameHanzi: string;
  position: Vec2;
  rotation: number;  // radians, 0 = facing south (+z)
  width: number;
  depth: number;
  metadata: Record<string, unknown>;
}

export interface HouseholdData {
  headName: string;
  headNameHanzi: string;
  headAge: number;
  headRole: string;
  isWang: boolean;
  memberCount: number;
  paddyMu: number;    // owned mu of paddy
  tenantedMu: number; // tenanted mu of paddy
  drylandMu: number;
  pigs: number;
  chickens: number;
  hasWell: boolean;
  wealthTier: 'rich' | 'comfortable' | 'poor' | 'destitute';
}

export interface SettlementLayout {
  villageName: string;
  villageNameHanzi: string;
  seed: string;
  tick: number;
  population: number;
  householdCount: number;
  structures: GeneratedStructure[];
  households: HouseholdData[];
}

export interface SettlementGenParams {
  seed: string;
  villageName?: string;
  householdCount?: number;    // default ~31
  paddyCount?: number;       // default ~180
  radius?: number;           // default 100m
  riverWidth?: number;       // default 40m
}

// ============================================================================
// Pure utility functions (no forbidden functions)
// ============================================================================

function hashSeedToU64(seed: string): bigint {
  let h = 0n;
  for (let i = 0; i < seed.length; i++) {
    h = ((h << 5n) - h + BigInt(seed.charCodeAt(i))) & ((1n << 64n) - 1n);
  }
  return h;
}

/** Simple LCG for deterministic generation from a bigint seed. */
function createRng(seed: bigint) {
  let state = seed;
  return function next(): bigint {
    // LCG: state = (a * state + c) mod m
    state = (6364136223846793005n * state + 1442695040888963407n) & ((1n << 64n) - 1n);
    return state;
  };
}

function rngFloat(rng: () => bigint, min: number, max: number): number {
  const u = Number((rng() >> 33n) & 0x7FFFFFFFn) / 0x7FFFFFFF;
  return min + u * (max - min);
}

function rngInt(rng: () => bigint, min: number, max: number): number {
  return Math.floor(rngFloat(rng, min, max + 0.999));
}

function rngChoice<T>(rng: () => bigint, arr: T[]): T {
  return arr[Number((rng() >> 33n) % BigInt(arr.length))];
}

function dist(a: Vec2, b: Vec2): number {
  const dx = a.x - b.x;
  const dz = a.z - b.z;
  return (dx * dx + dz * dz);
}

// ============================================================================
// Named household templates from doc 04 §2.2
// ============================================================================

const NAMED_HOUSEHOLDS: HouseholdData[] = [
  {
    headName: 'Wang Shouzheng', headNameHanzi: '王守正', headAge: 58,
    headRole: 'lineage_head', isWang: true, memberCount: 6,
    paddyMu: 12, tenantedMu: 0, drylandMu: 3,
    pigs: 1, chickens: 8, hasWell: true, wealthTier: 'comfortable',
  },
  {
    headName: 'Wang Shouye', headNameHanzi: '王守業', headAge: 52,
    headRole: 'tenant_farmer', isWang: true, memberCount: 5,
    paddyMu: 0, tenantedMu: 8, drylandMu: 1,
    pigs: 1, chickens: 6, hasWell: false, wealthTier: 'poor',
  },
  {
    headName: 'Master Hu', headNameHanzi: '胡老爺', headAge: 47,
    headRole: 'salt_merchant', isWang: false, memberCount: 4,
    paddyMu: 0, tenantedMu: 0, drylandMu: 0,
    pigs: 0, chickens: 0, hasWell: true, wealthTier: 'rich',
  },
  {
    headName: 'Lin Aqiao', headNameHanzi: '林阿巧', headAge: 38,
    headRole: 'carpenter', isWang: false, memberCount: 4,
    paddyMu: 0, tenantedMu: 0, drylandMu: 0,
    pigs: 0, chickens: 0, hasWell: false, wealthTier: 'comfortable',
  },
  {
    headName: 'Widow Xu', headNameHanzi: '許寡婦', headAge: 61,
    headRole: 'weaver', isWang: false, memberCount: 2,
    paddyMu: 0, tenantedMu: 0, drylandMu: 2,
    pigs: 0, chickens: 4, hasWell: false, wealthTier: 'destitute',
  },
];

// ============================================================================
// Wang family name generator (doc 04: 22 of 31 households are Wang)
// ============================================================================

const WANG_GIVEN_NAMES = [
  'Shou','Zong','Tian','Lun','Yi','Qing','De','Wu','Bao','Rui',
  'Ming','Hui','Jian','Kang','Feng','Yuan','Zheng','Xing','An','Chang',
];

const NON_WANG_SURNAMES = ['Li','Zhang','Liu','Chen','Zhao','Xu','Hu','Lin','Yang','Huang','Zhou','Wu','Sun','Zhu','Ma'];

const NON_WANG_GIVEN = ['A-Qiao','Erniu','Xiaomei','Da-Niang','Laoda','Er-Gou','San-Sheng','Si-Mei','Wu-Niang','Liu-Ye'];

// ============================================================================
// Settlement Generator
// ============================================================================

export function generateSettlement(params: SettlementGenParams): SettlementLayout {
  const seed = params.seed;
  const rng = createRng(hashSeedToU64(seed));
  const villageName = params.villageName ?? 'Wang Family Bend';
  const villageNameHanzi = '王 家彎';
  const householdCount = params.householdCount ?? 31;
  const paddyCount = params.paddyCount ?? 180;
  const radius = params.radius ?? 100;
  const riverWidth = params.riverWidth ?? 40;

  const structures: GeneratedStructure[] = [];
  const households: HouseholdData[] = [];

  // Counter for entity IDs (deterministic: derived from seed)
  let entityIdCounter = 0n;
  function nextEntityId(): EntityId {
    return entityIdCounter++;
  }

  // ---- River (south edge) ----
  const riverZ = -radius * 0.8;
  structures.push({
    entityId: nextEntityId(), kind: 'path', name: 'Cangli River', nameHanzi: '滄篱江',
    position: { x: 0, z: riverZ }, rotation: 0,
    width: radius * 3, depth: riverWidth,
    metadata: { fordable: true, floodHistory: true, lastFloodYearsAgo: 11 },
  });

  // ---- Levee (between village and river) ----
  const leveeZ = riverZ + riverWidth / 2 + 8;
  structures.push({
    entityId: nextEntityId(), kind: 'levee', name: 'Village Levee', nameHanzi: '垾',
    position: { x: 0, z: leveeZ }, rotation: 0,
    width: radius * 2, depth: 1.5,
    metadata: { height: 1.5, maintained: true },
  });

  // ---- Main path (east-west along north side of levee) ----
  const mainPathZ = leveeZ + 3;
  structures.push({
    entityId: nextEntityId(), kind: 'path', name: 'Main Path', nameHanzi: '大路',
    position: { x: 0, z: mainPathZ }, rotation: 0,
    width: radius * 2.5, depth: 2,
    metadata: { connectsTo: ['Li Family Creek (2km east)', 'Market Town (8km east)'] },
  });

  // ---- Lineage hall (highest ground, ~50m north of levee) ----
  const hallX = rngFloat(rng, -5, 5);
  const hallZ = mainPathZ + 50;
  structures.push({
    entityId: nextEntityId(), kind: 'lineage_hall', name: 'Wang Lineage Hall', nameHanzi: '王氏祠堂',
    position: { x: hallX, z: hallZ }, rotation: 0, // south-facing
    width: 18, depth: 25,
    metadata: { orientation: 'south', courtyard: true, ancestorTablets: true, rooms: ['main_hall', 'side_room_left', 'side_room_right', 'courtyard'] },
  });

  // ---- Communal well (junction of East and West Lanes) ----
  const wellX = rngFloat(rng, -3, 3);
  const wellZ = mainPathZ + 30;
  structures.push({
    entityId: nextEntityId(), kind: 'well', name: 'Communal Well', nameHanzi: '公井',
    position: { x: wellX, z: wellZ }, rotation: 0,
    width: 3, depth: 3,
    metadata: { depth: 6, lined: true, mechanism: 'wooden_windlass' },
  });

  // ---- Threshing ground (~80m north of lineage hall) ----
  structures.push({
    entityId: nextEntityId(), kind: 'threshing_ground', name: 'Threshing Ground', nameHanzi: '打穀場',
    position: { x: hallX + rngFloat(rng, -5, 5), z: hallZ + 80 }, rotation: 0,
    width: 30, depth: 30,
    metadata: { surface: 'compacted_earth', usedFor: ['threshing', 'festivals'] },
  });

  // ---- Mill (east edge of village) ----
  structures.push({
    entityId: nextEntityId(), kind: 'mill', name: 'Water Mill', nameHanzi: '水碾',
    position: { x: radius * 0.7, z: mainPathZ + 20 }, rotation: 0,
    width: 8, depth: 6,
    metadata: { power: 'water', owner: 'Wang lineage', feeType: 'grain_fraction' },
  });

  // ---- Spirit shrine (west entrance) ----
  structures.push({
    entityId: nextEntityId(), kind: 'spirit_shrine', name: 'Earth God Shrine', nameHanzi: '土地廟',
    position: { x: -radius * 0.7, z: mainPathZ + 2 }, rotation: 0,
    width: 2, depth: 2,
    metadata: { deity: 'Earth God (土地公)', maintenanceSchedule: '1st and 15th lunar month' },
  });

  // ---- Dock ----
  structures.push({
    entityId: nextEntityId(), kind: 'dock', name: 'Wooden Dock', nameHanzi: '木埠頭',
    position: { x: rngFloat(rng, -10, 10), z: riverZ + riverWidth / 2 + 2 }, rotation: 0,
    width: 4, depth: 8,
    metadata: { extends: 8,用途: ['salt_merchant', 'passenger_ferry'] },
  });

  // ---- East and West Lanes (branching north from main path) ----
  const laneOffset = 15;
  structures.push({
    entityId: nextEntityId(), kind: 'path', name: 'East Lane', nameHanzi: '東巷',
    position: { x: laneOffset, z: mainPathZ + 50 }, rotation: 0,
    width: 1.5, depth: 80,
    metadata: { direction: 'north' },
  });
  structures.push({
    entityId: nextEntityId(), kind: 'path', name: 'West Lane', nameHanzi: '西巷',
    position: { x: -laneOffset, z: mainPathZ + 50 }, rotation: 0,
    width: 1.5, depth: 80,
    metadata: { direction: 'north' },
  });

  // ---- Households ----
  // 5 named households from doc 04 + (householdCount - 5) procedural
  households.push(...NAMED_HOUSEHOLDS);

  // Named household positions (spread along the two lanes)
  const namedPositions: Vec2[] = [
    { x: hallX + 3, z: mainPathZ + 55 },    // Wang Senior (near hall)
    { x: -laneOffset + 2, z: mainPathZ + 60 }, // Wang Tenant (west lane)
    { x: rngFloat(rng, -3, 3), z: leveeZ + 5 },  // Salt merchant (at dock)
    { x: laneOffset - 2, z: mainPathZ + 65 },   // Lin (east lane)
    { x: -laneOffset - 2, z: mainPathZ + 40 }, // Widow Xu (west lane, south)
  ];

  for (let i = 0; i < NAMED_HOUSEHOLDS.length; i++) {
    const h = NAMED_HOUSEHOLDS[i];
    const pos = namedPositions[i];
    const compoundWidth = h.wealthTier === 'rich' ? 14 : h.wealthTier === 'comfortable' ? 10 : 7;
    const compoundDepth = h.wealthTier === 'rich' ? 18 : h.wealthTier === 'comfortable' ? 14 : 10;
    structures.push({
      entityId: nextEntityId(), kind: 'household',
      name: `${h.headName}'s Household`, nameHanzi: `${h.headNameHanzi}家`,
      position: pos, rotation: 0,
      width: compoundWidth, depth: compoundDepth,
      metadata: { ...h, named: true, householdIndex: i },
    });
  }

  // Procedural households
  const wangCount = Math.floor((householdCount - 5) * 0.71); // ~71% Wang
  const nonWangCount = householdCount - 5 - wangCount;
  let population = 0;

  // Count named members
  for (const h of NAMED_HOUSEHOLDS) population += h.memberCount;

  for (let i = 0; i < wangCount + nonWangCount; i++) {
    const isWang = i < wangCount;
    const lane = rngChoice(rng, ['east', 'west']);
    const laneX = lane === 'east' ? laneOffset : -laneOffset;
    const x = laneX + rngFloat(rng, -8, 8);
    const z = mainPathZ + 25 + rngFloat(rng, 0, 60);

    const wealthRoll = rngFloat(rng, 0, 1);
    const wealthTier = wealthRoll > 0.8 ? 'comfortable' as const
      : wealthRoll > 0.3 ? 'poor' as const : 'destitute' as const;

    const memberCount = wealthTier === 'comfortable' ? rngInt(rng, 4, 8)
      : wealthTier === 'poor' ? rngInt(rng, 3, 6) : rngInt(rng, 1, 4);

    const paddyMu = isWang ? (wealthTier === 'comfortable' ? rngInt(rng, 4, 12) : rngInt(rng, 1, 6)) : 0;
    const tenantedMu = isWang ? 0 : (wealthTier !== 'destitute' ? rngInt(rng, 2, 10) : 0);
    const drylandMu = rngInt(rng, 0, 3);

    const headName = isWang
      ? `Wang ${rngChoice(rng, WANG_GIVEN_NAMES)}`
      : `${rngChoice(rng, NON_WANG_SURNAMES)} ${rngChoice(rng, NON_WANG_GIVEN)}`;

    const hData: HouseholdData = {
      headName,
      headNameHanzi: '',
      headAge: rngInt(rng, 25, 70),
      headRole: wealthTier === 'destitute' ? 'laborer' : 'farmer',
      isWang,
      memberCount,
      paddyMu,
      tenantedMu,
      drylandMu,
      pigs: wealthTier !== 'destitute' ? rngInt(rng, 0, 2) : 0,
      chickens: rngInt(rng, 0, 10),
      hasWell: wealthTier === 'comfortable' && rngFloat(rng, 0, 1) > 0.5,
      wealthTier,
    };

    households.push(hData);
    population += memberCount;

    const compoundWidth = wealthTier === 'comfortable' ? 10 : wealthTier === 'poor' ? 7 : 5;
    const compoundDepth = wealthTier === 'comfortable' ? 14 : wealthTier === 'poor' ? 10 : 7;

    structures.push({
      entityId: nextEntityId(), kind: 'household',
      name: `${headName}'s Household`, nameHanzi: '',
      position: { x, z }, rotation: rngFloat(rng, -0.1, 0.1),
      width: compoundWidth, depth: compoundDepth,
      metadata: { ...hData, named: false, householdIndex: 5 + i },
    });
  }

  // ---- Paddy plots (north and west of village) ----
  for (let i = 0; i < paddyCount; i++) {
    const region = rngChoice(rng, ['north', 'west', 'north', 'north']); // 3:1 north:west
    let x: number, z: number;
    if (region === 'north') {
      x = rngFloat(rng, -radius * 1.5, radius * 1.5);
      z = mainPathZ + 80 + rngFloat(rng, 0, radius * 1.5);
    } else {
      x = -radius - 10 - rngFloat(rng, 0, radius);
      z = mainPathZ + rngFloat(rng, 0, radius);
    }
    const ownerIdx = rngInt(rng, 0, households.length - 1);
    const cropState = rngChoice(rng, ['fallow', 'planted', 'growing', 'ready']);
    structures.push({
      entityId: nextEntityId(), kind: 'paddy',
      name: `Paddy ${i + 1}`, nameHanzi: `田${i + 1}`,
      position: { x, z }, rotation: 0,
      width: 6, depth: 8,
      metadata: { areaMu: 1, ownerId: ownerIdx, cropState, terraced: true, bundHeight: 0.3 },
    });
  }

  // ---- Dryland gardens (scattered near village edge) ----
  const gardenCount = Math.floor(householdCount * 0.5);
  for (let i = 0; i < gardenCount; i++) {
    const angle = rngFloat(rng, 0, 3.14159 * 2);
    const dist_r = radius * 0.5 + rngFloat(rng, 0, radius * 0.5);
    structures.push({
      entityId: nextEntityId(), kind: 'dryland_garden',
      name: `Garden ${i + 1}`, nameHanzi: `地${i + 1}`,
      position: { x: Math.cos(angle) * dist_r, z: mainPathZ + 40 + Math.sin(angle) * dist_r },
      rotation: 0, width: 5, depth: 5,
      metadata: {
        crops: rngChoice(rng, [['cabbage', 'radish'], ['beans', 'gourds'], ['hemp'], ['mulberry']]),
      },
    });
  }

  // ---- Graveyard (low hill, ~1km north) ----
  structures.push({
    entityId: nextEntityId(), kind: 'graveyard', name: 'Ancestral Graveyard', nameHanzi: '祖墳',
    position: { x: hallX + rngFloat(rng, -20, 20), z: hallZ + 1000 }, rotation: 0,
    width: 40, depth: 40,
    metadata: { orientation: 'facing_village', owner: 'Wang lineage' },
  });

  return {
    villageName,
    villageNameHanzi,
    seed,
    tick: 0,
    population,
    householdCount: households.length,
    structures,
    households,
  };
}

// ============================================================================
// Settlement API
// ============================================================================

export interface SettlementGenApi {
  generate(params: SettlementGenParams): SettlementLayout;
  getLast(): SettlementLayout | null;
  stats(): SettlementStats;
}

export interface SettlementStats {
  generationsRun: number;
  lastSeed: string | null;
  lastStructureCount: number;
  lastPopulation: number;
}

export function createSettlementGenApi(): SettlementGenApi {
  let last: SettlementLayout | null = null;
  let generationsRun = 0;

  return {
    generate(params: SettlementGenParams): SettlementLayout {
      generationsRun++;
      last = generateSettlement(params);
      return last;
    },
    getLast(): SettlementLayout | null {
      return last;
    },
    stats(): SettlementStats {
      return {
        generationsRun,
        lastSeed: last?.seed ?? null,
        lastStructureCount: last?.structures.length ?? 0,
        lastPopulation: last?.population ?? 0,
      };
    },
  };
}

// ============================================================================
// Plugin Definition
// ============================================================================

export function createSettlementGenPlugin(): Plugin {
  let api: SettlementGenApi | null = null;

  return {
    id: 'ga:gen-settlement',
    version: '0.1.0',
    dependencies: ['ga:determinism'],

    init(host: PluginHost) {
      api = createSettlementGenApi();
      host.capabilities.register({
        capability: 'gen.settlement',
        provider: 'ga:gen-settlement',
        version: '0.1.0',
        instance: api,
      });
      host.setState('ga:gen-settlement', api);
      console.log('[ga:gen-settlement] Initialized — 1 capability registered');
    },

    destroy(host: PluginHost) {
      host.capabilities.unregister('gen.settlement', 'ga:gen-settlement');
      api = null;
      console.log('[ga:gen-settlement] Destroyed');
    },
  };
}
