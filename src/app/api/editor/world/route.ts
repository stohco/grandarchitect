/**
 * GET /api/editor/world?seed=<string>
 *
 * Deterministically generate a mortal xianxia village settlement from a
 * textual seed. Uses the project's determinism stack (xoshiro256** via
 * splitmix64 seed expansion + SHA-256 seed hashing) so two requests with
 * the same seed produce byte-identical structure layouts.
 *
 * Layout rules (engine-architecture/23_PROCEDURAL_GENERATION_FRAMEWORK.md,
 * corpus-extension/28_THE_VILLAGE_IN_MEDIAS_RES.md):
 *   - lineage_hall at the centre
 *   - households clustered in two concentric rings around the hall
 *   - paddies laid in terraced strips along the south (water side)
 *   - dryland_garden plots on the drier north-east
 *   - spirit_shrine on the high-ground north-west corner
 *   - mill beside the paddies (needs water)
 *   - dock at the southern edge (river)
 *   - levee running east-west along the south edge
 *   - graveyard at the far west edge (downwind)
 *   - paths connecting hall to households and to the dock
 *
 * Output: SerializableSettlement (see src/lib/editor/types.ts).
 */

import { NextRequest, NextResponse } from 'next/server';
import { seedFromString, nextDouble, nextIntRange, XoshiroState } from '@/lib/determinism/rng';
import {
  SerializableSettlement,
  SerializableStructure,
  SerializableHousehold,
  StructureKind,
} from '@/lib/editor/types';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// ---------------------------------------------------------------------------
// Seeded helpers
// ---------------------------------------------------------------------------

function rand(state: XoshiroState, min: number, max: number): number {
  return min + nextDouble(state) * (max - min);
}

function pick<T>(state: XoshiroState, arr: T[]): T {
  return arr[nextIntRange(state, 0, arr.length - 1)];
}

// ---------------------------------------------------------------------------
// Name pools (small but enough to vary household heads deterministically)
// ---------------------------------------------------------------------------

const SURNAMES = ['Wang', 'Li', 'Zhang', 'Chen', 'Liu', 'Yang', 'Zhao', 'Huang', 'Zhou', 'Wu'];
const SURNAMES_HANZI: Record<string, string> = {
  Wang: '王',
  Li: '李',
  Zhang: '張',
  Chen: '陳',
  Liu: '劉',
  Yang: '楊',
  Zhao: '趙',
  Huang: '黃',
  Zhou: '周',
  Wu: '吳',
};
const GIVEN_NAMES = ['An', 'Bo', 'Chun', 'Dong', 'Fang', 'Guo', 'Han', 'Jian', 'Kang', 'Lin', 'Min', 'Ning', 'Ping', 'Qing', 'Rui', 'Shan', 'Ting', 'Wei', 'Xin', 'Yun', 'Zhen'];
const GIVEN_HANZI = ['安', '伯', '春', '東', '芳', '國', '寒', '建', '康', '林', '敏', '寧', '平', '清', '瑞', '山', '婷', '威', '信', '雲', '珍'];
const ROLES = ['Elder', 'Farmer', 'Fisherman', 'Miller', 'Carpenter', 'Herbalist', 'Weaver', 'Hunter'];
const WEALTH_TIERS = ['Struggling', 'Common', 'Comfortable', 'Prosperous'];

const VILLAGE_NAMES: { en: string; hanzi: string }[] = [
  { en: 'Wang Family Bend', hanzi: '王灣村' },
  { en: 'Cangli Reach', hanzi: '蒼里汊' },
  { en: 'Reed Ford', hanzi: '蘆渡' },
  { en: 'Pine Hollow', hanzi: '松坳' },
  { en: 'Three Stones', hanzi: '三石村' },
];

// ---------------------------------------------------------------------------
// Structure factory
// ---------------------------------------------------------------------------

let nextEntityId = 1;

function makeStructure(
  kind: StructureKind,
  name: string,
  nameHanzi: string,
  x: number,
  z: number,
  rotation: number,
  width: number,
  depth: number,
  metadata: Record<string, unknown> = {},
): SerializableStructure {
  return {
    entityId: nextEntityId++,
    kind,
    name,
    nameHanzi,
    position: { x: Math.round(x * 100) / 100, z: Math.round(z * 100) / 100 },
    rotation: Math.round(rotation * 1000) / 1000,
    width: Math.round(width * 10) / 10,
    depth: Math.round(depth * 10) / 10,
    metadata,
  };
}

// ---------------------------------------------------------------------------
// Layout generation
// ---------------------------------------------------------------------------

function generateLayout(state: XoshiroState): {
  structures: SerializableStructure[];
  householdCount: number;
} {
  const structures: SerializableStructure[] = [];
  nextEntityId = 1;

  // --- Lineage hall at the centre ---
  structures.push(
    makeStructure(
      'lineage_hall',
      'Wang Lineage Hall',
      '王氏宗祠',
      0,
      0,
      0,
      14,
      10,
      { built: nextIntRange(state, 1700, 1820), isAncestral: true },
    ),
  );

  // --- Households: 18-31 of them, two rings around the hall ---
  const householdCount = nextIntRange(state, 18, 31);
  const innerCount = Math.floor(householdCount * 0.55);
  const outerCount = householdCount - innerCount;

  const usedAngles = new Set<number>();

  for (let i = 0; i < innerCount; i++) {
    const angle = (i / innerCount) * Math.PI * 2 + rand(state, -0.1, 0.1);
    const key = Math.round(angle * 100);
    usedAngles.add(key);
    const radius = rand(state, 12, 16);
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    const rotation = -angle + Math.PI / 2 + rand(state, -0.2, 0.2);
    const isWang = nextDouble(state) < 0.6;
    structures.push(
      makeStructure(
        'household',
        `${isWang ? 'Wang' : pick(state, SURNAMES)} Household #${i + 1}`,
        `${isWang ? '王' : '他'}宅${i + 1}`,
        x,
        z,
        rotation,
        rand(state, 6, 9),
        rand(state, 5, 8),
        { ring: 'inner', isWang },
      ),
    );
  }

  for (let i = 0; i < outerCount; i++) {
    const angle = (i / outerCount) * Math.PI * 2 + Math.PI / outerCount + rand(state, -0.15, 0.15);
    const radius = rand(state, 20, 28);
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    const rotation = -angle + Math.PI / 2 + rand(state, -0.25, 0.25);
    const isWang = nextDouble(state) < 0.3;
    structures.push(
      makeStructure(
        'household',
        `${isWang ? 'Wang' : pick(state, SURNAMES)} Household #${innerCount + i + 1}`,
        `${isWang ? '王' : '他'}宅${innerCount + i + 1}`,
        x,
        z,
        rotation,
        rand(state, 5, 8),
        rand(state, 4, 7),
        { ring: 'outer', isWang },
      ),
    );
  }

  // --- Paddies: terraced strips on the south (positive z) ---
  const paddyCount = nextIntRange(state, 8, 14);
  for (let i = 0; i < paddyCount; i++) {
    const x = rand(state, -22, 22);
    const z = rand(state, 30, 45);
    structures.push(
      makeStructure(
        'paddy',
        `Paddy Field ${i + 1}`,
        `稻田${i + 1}`,
        x,
        z,
        0,
        rand(state, 8, 14),
        rand(state, 5, 9),
        { terrace: Math.floor((z - 30) / 5) + 1, phase: 'water' },
      ),
    );
  }

  // --- Dryland gardens on the north-east ---
  const gardenCount = nextIntRange(state, 4, 8);
  for (let i = 0; i < gardenCount; i++) {
    const x = rand(state, 18, 30);
    const z = rand(state, -20, 8);
    structures.push(
      makeStructure(
        'dryland_garden',
        `Garden Plot ${i + 1}`,
        `旱地${i + 1}`,
        x,
        z,
        rand(state, 0, Math.PI / 2),
        rand(state, 5, 9),
        rand(state, 4, 7),
        { crop: pick(state, ['millet', 'bean', 'hemp', 'turnip']) },
      ),
    );
  }

  // --- Spirit shrine on the north-west high ground ---
  structures.push(
    makeStructure(
      'spirit_shrine',
      'Earth God Shrine',
      '土地神龕',
      rand(state, -26, -22),
      rand(state, -26, -22),
      rand(state, 0, Math.PI * 2),
      5,
      5,
      { deity: 'Earth God', facing: 'SE' },
    ),
  );

  // --- Mill beside the paddies (needs water power) ---
  structures.push(
    makeStructure(
      'mill',
      'South Mill',
      '南磨坊',
      rand(state, -10, 10),
      rand(state, 28, 32),
      0,
      7,
      7,
      { waterPowered: true, wheelSide: 'south' },
    ),
  );

  // --- Dock at the southern edge ---
  structures.push(
    makeStructure(
      'dock',
      'River Dock',
      '河埠頭',
      rand(state, -4, 4),
      rand(state, 48, 52),
      Math.PI / 2,
      6,
      4,
      { berths: 2, riverSide: 'south' },
    ),
  );

  // --- Levee running east-west along the south edge ---
  const leveeSegments = nextIntRange(state, 3, 5);
  for (let i = 0; i < leveeSegments; i++) {
    const x = -24 + (48 / (leveeSegments - 1)) * i + rand(state, -1, 1);
    structures.push(
      makeStructure(
        'levee',
        `Levee Section ${i + 1}`,
        `堤段${i + 1}`,
        x,
        rand(state, 25, 27),
        0,
        48 / leveeSegments + 1,
        2,
        { material: 'packed_earth' },
      ),
    );
  }

  // --- Graveyard at the far west edge (downwind, away from water) ---
  structures.push(
    makeStructure(
      'graveyard',
      'Western Graves',
      '西墳',
      rand(state, -34, -30),
      rand(state, -8, 8),
      0,
      10,
      8,
      { generations: nextIntRange(state, 5, 9) },
    ),
  );

  // --- Paths: a couple connecting the hall to the dock and the shrine ---
  structures.push(
    makeStructure(
      'path',
      'Main Path',
      '主徑',
      0,
      rand(state, 20, 24),
      Math.PI / 2,
      2,
      24,
      { connects: 'hall-dock' },
    ),
  );
  structures.push(
    makeStructure(
      'path',
      'Shrine Path',
      '神道',
      rand(state, -14, -10),
      rand(state, -14, -10),
      Math.PI / 4,
      2,
      18,
      { connects: 'hall-shrine' },
    ),
  );

  return { structures, householdCount };
}

// ---------------------------------------------------------------------------
// Households (one per `household` structure, for the inspector / outliner)
// ---------------------------------------------------------------------------

function makeHouseholds(state: XoshiroState, count: number): SerializableHousehold[] {
  const out: SerializableHousehold[] = [];
  for (let i = 0; i < count; i++) {
    const isWang = nextDouble(state) < 0.45;
    const surname = isWang ? 'Wang' : pick(state, SURNAMES);
    const givenIdx = nextIntRange(state, 0, GIVEN_NAMES.length - 1);
    const given = GIVEN_NAMES[givenIdx];
    const givenHanzi = GIVEN_HANZI[givenIdx];
    out.push({
      headName: `${surname} ${given}`,
      headNameHanzi: `${SURNAMES_HANZI[surname]}${givenHanzi}`,
      headAge: nextIntRange(state, 22, 68),
      headRole: pick(state, ROLES),
      isWang,
      wealthTier: pick(state, WEALTH_TIERS),
    });
  }
  return out;
}

// ---------------------------------------------------------------------------
// Village name resolution (deterministic by seed)
// ---------------------------------------------------------------------------

function villageNameFor(seed: string, state: XoshiroState): { en: string; hanzi: string } {
  // The canonical starting village keeps its name for the default seed.
  if (seed === 'wang-family-bend-1108') {
    return { en: 'Wang Family Bend', hanzi: '王灣村' };
  }
  return pick(state, VILLAGE_NAMES);
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

export async function GET(req: NextRequest) {
  const seedParam = req.nextUrl.searchParams.get('seed');
  const seed = seedParam && seedParam.trim().length > 0 ? seedParam.trim() : 'wang-family-bend-1108';

  const { state } = await seedFromString(seed);
  const { structures, householdCount } = generateLayout(state);
  const households = makeHouseholds(state, householdCount);
  const name = villageNameFor(seed, state);

  const settlement: SerializableSettlement = {
    seed,
    name: name.en,
    nameHanzi: name.hanzi,
    tick: 0,
    structures,
    households,
  };

  return NextResponse.json(settlement, {
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate',
    },
  });
}
