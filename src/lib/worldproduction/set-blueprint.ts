/**
 * Set Blueprint — the handcrafted production set of Wang Family Bend.
 *
 * Every structure, interior, fixture, and prop is authored from corpus
 * canon (docs 04, 28, 33, 34 — the NPC/household definitions in
 * src/lib/engine/definitions/npcs.ts are the resident references) and
 * dimensioned against the Scale Registry. This is the "plan every single
 * aspect before production" layer: the director script, the world
 * hierarchy, the asset catalog, and the destruction/PCG systems all
 * consume this blueprint.
 *
 * Detail rule: nothing here is invented — household composition, trades,
 * and village geography come from the corpus; measurements use the scale
 * registry ranges.
 */

import type { Definition } from '../engine/definitions';

export type SetKind =
  | 'household' | 'school' | 'shrine' | 'well' | 'field' | 'dock'
  | 'workshop' | 'shop' | 'gate' | 'road' | 'bridge' | 'creek' | 'cache'
  | 'foothill' | 'market' | 'landmark';

export interface SetProp {
  id: string;
  name: string;
  /** scale-registry id used for dimensioning (or 'custom'). */
  scaleId: string;
  /** meters. */
  w: number;
  d: number;
  h: number;
  material: string;
  detail: string;
  /** documented, directed reason when this prop intentionally deviates from canonical scale. */
  scaleException?: string;
}

export interface SetRoom {
  id: string;
  name: string;
  purpose: string;
  scaleId: string;
  w: number;
  d: number;
  h: number;
  fixtures: SetProp[];
  lighting: string;
  smell: string;
  sound: string;
  detail: string;
  scaleException?: string;
}

export interface SetStructure {
  id: string;
  name: string;
  nameHanzi?: string;
  kind: SetKind;
  scaleId: string;
  w: number;
  d: number;
  h: number;
  orientation: string;
  construction: string;
  materials: string[];
  condition: string;
  /** npc.* definition ids who live/work here. */
  residents: string[];
  rooms: SetRoom[];
  exterior: SetProp[];
  artDirection: string;
  cameraNotes: string;
  scaleException?: string;
}

export interface SetSettlement {
  id: string;
  name: string;
  nameHanzi?: string;
  scaleId: string;
  w: number;
  d: number;
  population: number;
  structures: SetStructure[];
  layout: {
    roads: SetProp[];
    well?: string;
    shrine?: string;
    gate?: string;
    creek?: string;
  };
  geography: string;
  qi: string;
  ecology: string;
}

/** Mirrors a definition id -> name lookup for residents. */
export function residentNames(defs: Definition[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const d of defs) out[d.id] = d.name;
  return out;
}

// ---------------------------------------------------------------------------
// The settlement — Wang Family Bend (Wang Family Village), 31 households,
// ~180 people, on the Cangli Riverlands (doc 04 §1).
// ---------------------------------------------------------------------------

export const WANG_FAMILY_BEND: SetSettlement = {
  id: 'settlement.wang_family_bend',
  name: 'Wang Family Bend',
  nameHanzi: '王家彎',
  scaleId: 'scale.village_street',
  w: 400,
  d: 600,
  population: 180,
  geography:
    'Sits in a bend of the Cangli riverlands; paddy and dryland fields to the east, Black Creek cutting the west edge, Cangwu foothills rising to the south where the cultivator cache lies (doc 04 §1, doc 33).',
  qi: 'Ambient qi is thin but present; the Green Mirror Vein passes far to the west at Cangwu Sect; the village sits below cultivation-relevant qi density (doc 31 §1).',
  ecology:
    'Charcoal-burners work the foothills; pheasants and wild boar in the woods; the river supplies fish; herbs in the foothills (doc 33, doc 28 §2.2).',
  layout: {
    roads: [
      { id: 'prop.road.main', name: 'Main Village Road', scaleId: 'scale.village_street', w: 12, d: 320, h: 0, material: 'beaten earth with slate', detail: 'Runs north-south, links the market road to the south gate of the lineage compound.' },
      { id: 'prop.road.well_path', name: 'Well Path', scaleId: 'scale.village_street', w: 6, d: 60, h: 0, material: 'packed earth', detail: 'From the senior household gate to the communal well.' },
    ],
    well: 'structure.well',
    shrine: 'structure.dao_shrine',
    gate: 'structure.village_gate',
    creek: 'structure.black_creek',
  },
  structures: [
    {
      id: 'structure.senior_household',
      name: 'Senior Household (House 1)',
      nameHanzi: '王守正宅',
      kind: 'household',
      scaleId: 'scale.compound',
      w: 18,
      d: 24,
      h: 6.5,
      orientation: 'Faces south onto the main road; courtyard behind.',
      construction: 'Timber frame, rammed-earth walls, thatched roof; kitchen wing and storage wing off the courtyard (Level-2 cultural inference: Zhao Country farmhouse).',
      materials: ['rammed earth', 'pine timber', 'thatch', 'river cobble foundation'],
      condition: 'Sound; roof rethatched two seasons ago.',
      residents: ['npc.wang_shouzheng', 'npc.lady_chen', 'npc.wang_zongxian', 'npc.wang_zongwen', 'npc.wang_sanniang'],
      artDirection: 'White/grey plaster over earth, dark timber, faded red door-paper trims; moss low on the north wall (ancient-sacred weathering language, production bible).',
      cameraNotes: 'Classic establishing: gate + eave line against the Cangwu foothills; interior two-shots on the kang.',
      rooms: [
        {
          id: 'room.senior.main',
          name: 'Main Hall',
          purpose: 'Family life, meals, guest receiving.',
          scaleId: 'scale.room',
          w: 7,
          d: 9,
          h: 3.6,
          lighting: 'Day: paper window light, warm; night: oil lamp on the table.',
          smell: 'Straw, woodsmoke, cooking oil, dried herbs.',
          sound: 'Loom clatter from the inner room, chickens in the courtyard.',
          detail: 'Kang sleeping platform along the back wall with straw mattress and quilt stack; low square table with two benches; wall shelf with rice jars and the ancestor tablet (doc 28 §3.1: the lineage keeps tablets; Wang Shouzheng hopes for a cultivator in the family).',
          fixtures: [
            { id: 'prop.kang', name: 'Kang Sleeping Platform', scaleId: 'scale.custom', w: 3, d: 2, h: 0.9, material: 'brick and earth', detail: 'Heated sleeping platform, straw mattress.' },
            { id: 'prop.low_table', name: 'Low Square Table', scaleId: 'scale.custom', w: 1.2, d: 1.2, h: 0.45, material: 'pine', detail: 'Daily meals; guests sit on benches.' },
            { id: 'prop.ancestor_tablet', name: 'Ancestor Tablets Shelf', scaleId: 'scale.custom', w: 0.9, d: 0.2, h: 0.6, material: 'wood', detail: 'Wang lineage tablets; incense bowl in front (doc 04 §7.1).' },
            { id: 'prop.oil_lamp', name: 'Kerosene Oil Lamp', scaleId: 'scale.custom', w: 0.2, d: 0.2, h: 0.35, material: 'clay and glass', detail: 'Night light; pools warm light on the table (doc 28).' },
          ],
        },
        {
          id: 'room.senior.weaving',
          name: 'Inner Weaving Room',
          purpose: 'Lady Chen weaves extra cloth here at night.',
          scaleId: 'scale.room',
          w: 4,
          d: 5,
          h: 3,
          scaleException: 'Narrow workroom beside the main hall.',
          lighting: 'Dim; single oil lamp; moonlight through the paper window.',
          smell: 'Raw hemp, dye, beeswax.',
          sound: 'Loom rhythm at night (doc 28 §3.2: she weaves secretly and leaves cloth at Widow Xu\'s gate).',
          detail: 'Frame loom, hemp bundles, cloth bolts; the finished bolts she leaves as charity — the debts of the village run through this room.',
          fixtures: [
            { id: 'prop.loom', name: 'Frame Loom', scaleId: 'scale.custom', w: 1.6, d: 1.4, h: 1.6, material: 'wood, hemp', detail: 'Treadle frame loom.' },
            { id: 'prop.cloth_bolts', name: 'Cloth Bolts', scaleId: 'scale.custom', w: 0.6, d: 0.4, h: 0.5, material: 'hemp cloth', detail: 'Finished bolts ready to leave at Widow Xu\'s.' },
          ],
        },
      ],
      exterior: [
        { id: 'prop.senior.gate', name: 'Compound Gate', scaleId: 'scale.doorway', w: 2.4, d: 0.4, h: 2.6, material: 'pine timber', detail: 'Wooden gate, iron hinges; the threshold worn smooth.' },
        { id: 'prop.senior.courtyard', name: 'Courtyard', scaleId: 'scale.room', w: 8, d: 10, h: 0, material: 'packed earth', detail: 'Chickens, well-trodden paths, firewood stack, drying herbs.' },
        { id: 'prop.senior.storeroom', name: 'Grain Storeroom', scaleId: 'scale.room', w: 4, d: 5, h: 3, material: 'rammed earth', scaleException: 'Storage wing narrower than standard room.', detail: 'Rice and wheat jars; the 28 taels toward Wang Sanniang\'s bride-price are hidden here (doc 28 §2.3).' },
      ],
    },
    {
      id: 'structure.tenant_household',
      name: 'Tenant Household (House 2)',
      nameHanzi: '佃戶宅',
      kind: 'household',
      scaleId: 'scale.compound',
      w: 12,
      d: 16,
      h: 5,
      orientation: 'Faces the field path east of the main road.',
      construction: 'Lower eaves than the senior house; patched thatch; the surface right to 8 mu held three generations, subsoil owned by a market-town landlord (doc 04 §2.2).',
      materials: ['rammed earth', 'thatch (patched)', 'pine'],
      condition: 'Weathered; one wall shows old flood staining.',
      residents: ['npc.wang_shouye', 'npc.wang_zongde'],
      artDirection: 'Everything one step poorer than the senior house: thinner eaves, mended fences, clothesline heavy with mended cloth.',
      cameraNotes: 'Low-angle interior shots emphasize the bare-stick son Wang Zongde\'s resentment (doc 34 §4.5).',
      rooms: [
        {
          id: 'room.tenant.main',
          name: 'Single Living Room',
          purpose: 'Sleeping, eating, storing.',
          scaleId: 'scale.room',
          w: 5,
          d: 7,
          h: 2.8,
          scaleException: 'Tenant room narrows below standard — thin harvest reads in inches.',
          lighting: 'Single window; firelight in winter.',
          smell: 'Straw, sweat, sour grain.',
          sound: 'Field wind; the tenant\'s grinding stone.',
          detail: 'One kang, one table, farm tools against the wall, an empty rice jar that marks the year\'s thin harvest.',
          fixtures: [
            { id: 'prop.tenant.kang', name: 'Narrow Kang', scaleId: 'scale.custom', w: 2.4, d: 1.8, h: 0.9, material: 'brick, earth', detail: 'Three sleepers max.' },
            { id: 'prop.tenant.tools', name: 'Farm Tools Rack', scaleId: 'scale.custom', w: 1.4, d: 0.3, h: 1.6, material: 'wood, iron', detail: 'Hoe, sickle, carrying poles.' },
          ],
        },
      ],
      exterior: [
        { id: 'prop.tenant.field_path', name: 'Field Path', scaleId: 'scale.village_street', w: 4, d: 80, h: 0, material: 'beaten earth', scaleException: 'Field path is narrower than a street — farm lane.', detail: 'To the tenant fields.' },
      ],
    },
    {
      id: 'structure.salt_merchant_house',
      name: 'Master Hu\'s Salt House (House 3)',
      nameHanzi: '胡宅',
      kind: 'household',
      scaleId: 'scale.compound',
      w: 16,
      d: 20,
      h: 6,
      orientation: 'At the dock end of the main road, 200 paces from the senior household.',
      construction: 'Tiled roof (the only tiled house in the village), brick walls, iron-hinged doors; wealth visible (doc 28 §3.4: he holds the county salt license 鹽引).',
      materials: ['brick', 'tile', 'iron', 'pine'],
      condition: 'Excellent; recently painted gate.',
      residents: ['npc.master_hu', 'npc.lady_wang_hu', 'npc.hu_bao'],
      artDirection: 'Sect-red accents on the gate, but the estrangement shows: no Wang ever crosses the threshold (doc 34 §0).',
      cameraNotes: 'The dock and house in one wide; interior detail on the license document and the doubled bribe demand (doc 28 §3.4).',
      rooms: [
        {
          id: 'room.hu.counting',
          name: 'Counting Room',
          purpose: 'Salt accounts, license documents.',
          scaleId: 'scale.room',
          w: 5,
          d: 6,
          h: 3.4,
          scaleException: 'Counting room is a compact inner chamber.',
          lighting: 'Good daylight; lamp for night counting.',
          smell: 'Salt, paper, ink, lamp oil.',
          sound: 'Abacus beads, quill on paper.',
          detail: 'Salt sacks, scales, account books; the county license and the new secretary\'s doubled bribe demand sit on the desk (doc 28 §3.4).',
          fixtures: [
            { id: 'prop.hu.license', name: 'Salt License Scroll', scaleId: 'scale.custom', w: 0.5, d: 0.1, h: 0.5, material: 'paper, silk', detail: 'The 鹽引 license; this year\'s renewal demands double.' },
            { id: 'prop.hu.scales', name: 'Salt Scales', scaleId: 'scale.custom', w: 0.4, d: 0.3, h: 0.5, material: 'brass', detail: 'Weighing salt for sale.' },
          ],
        },
      ],
      exterior: [
        { id: 'prop.hu.warehouse', name: 'Salt Warehouse', scaleId: 'scale.room', w: 6, d: 8, h: 4, material: 'brick', detail: 'Salt blocks and curing racks; watched by Hu Bao.' },
      ],
    },
    {
      id: 'structure.carpenter_house',
      name: 'Carpenter Lin\'s House (House 4)',
      nameHanzi: '林宅',
      kind: 'workshop',
      scaleId: 'scale.compound',
      w: 14,
      d: 18,
      h: 5.5,
      orientation: 'West side of the square, opposite the well.',
      construction: 'Open-front workshop; shavings pile by the door; the bao head Lin Aqiao (保長) balances the Wang li head (doc 04 §5.2).',
      materials: ['pine', 'rammed earth', 'thatch'],
      condition: 'Good; tools well kept.',
      residents: ['npc.lin_aqiao', 'npc.lady_wang_lin'],
      artDirection: 'Wood shavings, sawhorses, coffin blanks — the craft of a village carpenter who builds boats and coffins (doc 04 §2.2).',
      cameraNotes: 'Workshop light through open front; sawdust motes in sunbeams.',
      rooms: [
        {
          id: 'room.lin.workshop',
          name: 'Workshop',
          purpose: 'Carpentry: houses, boats, mill machinery, coffins.',
          scaleId: 'scale.room',
          w: 8,
          d: 10,
          h: 3.8,
          lighting: 'Open-front daylight; firelight in winter.',
          smell: 'Pine sap, linseed oil, iron.',
          sound: 'Plane and saw; mallet rhythm.',
          detail: 'Workbench, plane bench, timber racks, a half-finished boat rib and a coffin blank (doc 04 §2.2).',
          fixtures: [
            { id: 'prop.lin.bench', name: 'Workbench', scaleId: 'scale.custom', w: 2.4, d: 0.9, h: 0.9, material: 'hardwood', detail: 'Clamps and chisels set.' },
            { id: 'prop.lin.boat_rib', name: 'Boat Rib (half-finished)', scaleId: 'scale.custom', w: 3, d: 0.4, h: 0.9, material: 'pine', detail: 'For the ferryman\'s next hull.' },
          ],
        },
      ],
      exterior: [
        { id: 'prop.lin.shaving_pile', name: 'Shavings Pile', scaleId: 'scale.custom', w: 2, d: 2, h: 0.8, material: 'wood waste', detail: 'Burning fuel for the village.' },
      ],
    },
    {
      id: 'structure.widow_house',
      name: 'Widow Xu\'s House (House 5)',
      nameHanzi: '許宅',
      kind: 'household',
      scaleId: 'scale.compound',
      w: 10,
      d: 12,
      h: 4.5,
      scaleException: 'Widow\'s single-room hovel is deliberately below compound range — poverty reads in scale.',
      orientation: 'North edge, near the well path.',
      construction: 'Small, single-room, dryland garden behind; the lineage\'s charity keeps it standing (doc 34 §1.1).',
      materials: ['rammed earth', 'thatch'],
      condition: 'Humble; patched walls; the gate ajar since Xu Erniu left.',
      residents: ['npc.widow_xu', 'npc.xu_erniu'],
      artDirection: 'A single lantern at dusk; the loom inside lit late — the quiet grief of the house.',
      cameraNotes: 'Doorway shot: the missing son\'s coat still on the peg (doc 28 §2.2).',
      rooms: [
        {
          id: 'room.xu.main',
          name: 'Single Room',
          purpose: 'Weaving, sleeping, waiting.',
          scaleId: 'scale.room',
          w: 4,
          d: 5,
          h: 2.6,
          scaleException: 'Widow\'s single room is the village\'s smallest — the door barely admits a loom.',
          lighting: 'One paper window; loom light at night.',
          smell: 'Wet hemp, ash, dry grass.',
          sound: 'Loom; silence where a son should be.',
          detail: 'Loom, one kang, the dryland garden tools; Xu Erniu\'s coat on a peg (doc 28 §2.2).',
          fixtures: [
            { id: 'prop.xu.coat', name: 'Missing Son\'s Coat', scaleId: 'scale.custom', w: 0.4, d: 0.2, h: 0.6, material: 'hemp cloth', detail: 'Hung three days; the emotional anchor of the shot.' },
          ],
        },
      ],
      exterior: [
        { id: 'prop.xu.garden', name: 'Dryland Garden', scaleId: 'scale.room', w: 5, d: 6, h: 0, material: 'soil', scaleException: 'Dryland garden smaller than standard room.', detail: 'Veggies and beans; the widow\'s second livelihood.' },
      ],
    },
    {
      id: 'structure.lineage_school',
      name: 'Lineage School',
      nameHanzi: '族學',
      kind: 'school',
      scaleId: 'scale.compound',
      w: 14,
      d: 10,
      h: 4.8,
      orientation: 'East of the square, one gable to the shrine.',
      construction: 'Open hall with writing tables; the teacher Wang Lun (王倫, 41) also divines with hexagrams (doc 28 §3.3, doc 34).',
      materials: ['timber', 'plaster', 'thatch'],
      condition: 'Good; whitewashed.',
      residents: ['npc.wang_lun', 'npc.wang_zongwen'],
      artDirection: 'Desk rows, ink stones, a worn hexagram table at the teacher\'s dais.',
      cameraNotes: 'Morning light through the open hall; the teacher casting hexagrams at the dais (doc 24: divination is qi-residue perception at temporal scale).',
      rooms: [
        {
          id: 'room.school.hall',
          name: 'School Hall',
          purpose: 'Teaching village children; divination.',
          scaleId: 'scale.room',
          w: 12,
          d: 8,
          h: 3.6,
          scaleException: 'School hall spans two bays (12 m) to seat the village children.',
          lighting: 'Open sides; daylight; lanterns for night divination.',
          smell: 'Ink, old paper, incense.',
          sound: 'Recitation; abacus; the click of yarrow sticks.',
          detail: 'Pupil desks, ink stones, the teacher\'s dais with a hexagram table (卦) and a worn copy of the classics.',
          fixtures: [
            { id: 'prop.school.dais', name: 'Teacher\'s Dais', scaleId: 'scale.custom', w: 2, d: 1.2, h: 0.8, material: 'wood', detail: 'Hexagram table and brush rack.' },
            { id: 'prop.school.desk_row', name: 'Pupil Desks', scaleId: 'scale.custom', w: 3, d: 1.2, h: 0.7, material: 'pine', detail: 'Six shared desks, ink-stained.' },
          ],
        },
      ],
      exterior: [
        { id: 'prop.school.bell', name: 'School Bell', scaleId: 'scale.custom', w: 0.3, d: 0.3, h: 0.4, material: 'iron', detail: 'Rings the day\'s hours.' },
      ],
    },
    {
      id: 'structure.dao_shrine',
      name: 'Dao Binding Stone Shrine',
      nameHanzi: '道盟石',
      kind: 'shrine',
      scaleId: 'scale.shrine',
      w: 3,
      d: 3,
      h: 4.5,
      orientation: 'At the square\'s edge, east of the well.',
      construction: 'River-cobble pedestal with a weathered stone stele; red prayer ribbons; incense bowl (doc 04 §7.1 folk rites).',
      materials: ['cobble', 'stone', 'wood', 'cloth'],
      condition: 'Weathered by design; ribbons replaced seasonally.',
      residents: ['npc.zhou_wenshu'],
      artDirection: 'The ancient-sacred language: moss, patina, restrained ornament; ribbons the only color (production bible weathering rules).',
      cameraNotes: 'Low sun across the stele; incense smoke curling in a shaft of light.',
      rooms: [],
      exterior: [
        { id: 'prop.shrine.stele', name: 'Dao Binding Stele', scaleId: 'scale.custom', w: 0.8, d: 0.4, h: 1.8, material: 'stone', detail: 'Worn inscription; the village\'s threshold marker.' },
        { id: 'prop.shrine.incense', name: 'Incense Bowl', scaleId: 'scale.custom', w: 0.4, d: 0.4, h: 0.3, material: 'bronze', detail: 'Offering bowl; smoke at dawn and dusk.' },
      ],
    },
    {
      id: 'structure.well',
      name: 'Communal Well',
      nameHanzi: '水井',
      kind: 'well',
      scaleId: 'scale.well',
      w: 3,
      d: 3,
      h: 1.2,
      orientation: 'Square center; the well path connects it to the senior household.',
      construction: 'Stone ring, wooden cap beam, rope and bucket; wash basins beside it (village infrastructure, doc 04).',
      materials: ['stone', 'pine', 'rope'],
      condition: 'Good; stones worn smooth.',
      residents: [],
      artDirection: 'The village\'s social center: water glints at noon; women gather at dawn.',
      cameraNotes: 'Top-down and eye-level varieties; bucket rising with a creak.',
      rooms: [],
      exterior: [
        { id: 'prop.well.ring', name: 'Stone Ring', scaleId: 'scale.custom', w: 1.6, d: 1.6, h: 1.1, material: 'stone', detail: 'Worn by generations of ropes.' },
        { id: 'prop.well.cap', name: 'Cap Beam + Windlass', scaleId: 'scale.custom', w: 2, d: 0.3, h: 1.8, material: 'pine, rope', detail: 'Windlass and bucket.' },
      ],
    },
    {
      id: 'structure.market_stalls',
      name: 'Market Stalls Row',
      nameHanzi: '市集',
      kind: 'market',
      scaleId: 'scale.compound',
      w: 20,
      d: 8,
      h: 3,
      orientation: 'Along the main road where it widens into the square.',
      construction: 'Fabric-canopy stalls on poles; selling produce, cloth, salt, tools; the market town lies an hour north (doc 04 §2.2).',
      materials: ['wood', 'fabric', 'bamboo'],
      condition: 'Seasonal; stalls up on market days.',
      residents: ['npc.he_laosan'],
      artDirection: 'Warm canvas colors, hanging produce; the busiest color in the village palette.',
      cameraNotes: 'Walk-through dolly along the canopy line; market day chaos at noon.',
      rooms: [],
      exterior: [
        { id: 'prop.market.canopy', name: 'Canopy Row', scaleId: 'scale.village_street', w: 18, d: 5, h: 2.8, material: 'fabric', detail: 'Eight stalls under one canvas run.' },
      ],
    },
    {
      id: 'structure.village_gate',
      name: 'North Gate',
      nameHanzi: '村門',
      kind: 'gate',
      scaleId: 'scale.village_gate',
      w: 6,
      d: 1,
      h: 5,
      orientation: 'North end of the main road, toward the market town.',
      construction: 'Two stone pillar posts with a pine beam crossbar; a simple gate — the village\'s threshold to the wider world (doc 04 §1).',
      materials: ['stone', 'pine'],
      condition: 'Solid; lichen on the pillars.',
      residents: [],
      artDirection: 'The establishing-frame pillar: the gate silhouettes against the Cangwu foothills.',
      cameraNotes: 'Hero shot: camera behind the gate looking up the road; also used as the episode open/close frame.',
      rooms: [],
      exterior: [
        { id: 'prop.gate.pillar_l', name: 'Pillar Post (L)', scaleId: 'scale.custom', w: 0.6, d: 0.6, h: 5, material: 'stone', detail: 'East pillar.' },
        { id: 'prop.gate.pillar_r', name: 'Pillar Post (R)', scaleId: 'scale.custom', w: 0.6, d: 0.6, h: 5, material: 'stone', detail: 'West pillar.' },
      ],
    },
    {
      id: 'structure.black_creek',
      name: 'Black Creek Crossing',
      nameHanzi: '黑溪',
      kind: 'creek',
      scaleId: 'scale.bridge',
      w: 6,
      d: 40,
      h: 0,
      orientation: 'West edge of the village; the trail past it leads to the foothills where Xu Erniu\'s axe was found (doc 34 §1.2).',
      construction: 'Stone stepping crossing and a log bridge; alders along the bank; deep, dark water under the bank (doc 28 §2.2).',
      materials: ['water', 'stone', 'alder'],
      condition: 'Natural.',
      residents: [],
      artDirection: 'A cool palette shift: the creek is the village\'s edge of the world.',
      cameraNotes: 'Bridge-wide and creek-level shots; mist at dawn.',
      rooms: [],
      exterior: [
        { id: 'prop.creek.log_bridge', name: 'Log Bridge', scaleId: 'scale.bridge', w: 20, d: 1.2, h: 1, material: 'pine', detail: 'Single log span with handrail.' },
      ],
    },
    {
      id: 'structure.tenant_fields',
      name: 'Tenant Fields',
      nameHanzi: '佃田',
      kind: 'field',
      scaleId: 'scale.field',
      w: 200,
      d: 300,
      h: 0,
      orientation: 'East of the village, terraced toward the river.',
      construction: 'Paddy near the river, dryland on the higher ground; the tenant surface-rights and the market-town landlord\'s subsoil (doc 04 §2.2).',
      materials: ['soil', 'water', 'stone bunds'],
      condition: 'Worked; thin harvest this year.',
      residents: [],
      artDirection: 'Green/gold seasonality; water mirrors at transplanting.',
      cameraNotes: 'Drone pull-back showing field grids against the river bend; a single farmer figure for scale.',
      rooms: [],
      exterior: [
        { id: 'prop.fields.bunds', name: 'Field Bunds', scaleId: 'scale.field', w: 200, d: 300, h: 0.4, material: 'stone and earth', detail: 'Terrace walls between paddies.' },
      ],
    },
    {
      id: 'structure.cache_hill',
      name: 'Cultivator Cache (Foothill Cave)',
      nameHanzi: '遺府',
      kind: 'cache',
      scaleId: 'scale.cliff_ledge',
      w: 30,
      d: 40,
      h: 60,
      scaleException: 'Foothill outcrop at cave scale, below cliff-ledge prominence range.',
      orientation: 'South in the Cangwu foothills; entrance sealed by a crumbled stone; Xu Erniu is trapped inside (doc 28 §2.2).',
      construction: 'A cultivator\'s abandoned cache: carved chamber, maintenance formation still draining qi from the unconscious boy.',
      materials: ['rock', 'formation residue', 'spirit stone dust'],
      condition: 'Sealed entrance; formation failing after centuries.',
      residents: ['npc.xu_erniu'],
      artDirection: 'The formation\'s qi glow faintly visible at dusk; the hill reads wrong to anyone who looks twice — the mystery anchor of Episode 1.',
      cameraNotes: 'Slow push-in at dusk; the hum Wu Daniu heard (like a bell struck underground) as the audio sting (doc 34 §1.2).',
      rooms: [
        {
          id: 'room.cache.chamber',
          name: 'Cache Chamber',
          purpose: 'Cultivator storage; now a trap.',
          scaleId: 'scale.room',
          w: 6,
          d: 8,
          h: 4,
          lighting: 'Faint formation glow; mineral phosphorescence.',
          smell: 'Dry stone, old qi, dust.',
          sound: 'A low hum; slow drip.',
          detail: 'Sealed spirit-stone cache, dust-covered shelves, the maintenance formation\'s dimming nodes; Xu Erniu unconscious in the center, his qi slowly draining (doc 28 §2.2).',
          fixtures: [
            { id: 'prop.cache.formation', name: 'Maintenance Formation', scaleId: 'scale.custom', w: 4, d: 4, h: 0.2, material: 'spirit stone, carved stone', detail: 'Node/edge topology per doc 16; dimming.' },
            { id: 'prop.cache.shelves', name: 'Dust Shelves', scaleId: 'scale.custom', w: 2, d: 0.4, h: 1.8, material: 'stone', detail: 'Empty jars and sealed boxes.' },
          ],
        },
      ],
      exterior: [
        { id: 'prop.cache.entrance', name: 'Crumbled Seal', scaleId: 'scale.doorway', w: 1.2, d: 0.5, h: 1.8, material: 'stone', scaleException: 'Crumbled opening narrower than a standard doorway — the lintel fell.', detail: 'The fallen lintel that sealed the entrance.' },
      ],
    },
    {
      id: 'structure.foothills',
      name: 'Cangwu Foothills',
      nameHanzi: '蒼梧山麓',
      kind: 'foothill',
      scaleId: 'scale.sacred_peak',
      w: 1500,
      d: 2000,
      h: 800,
      orientation: 'South of the village; charcoal-burners\' territory; beast territory beyond (doc 33, doc 34 §1.2).',
      construction: 'Karst peaks, pine forest, hidden caves; the Cangwu Sect lies beyond at 100 li (doc 24 §4.3).',
      materials: ['karst rock', 'pine', 'mist'],
      condition: 'Wild.',
      residents: ['npc.wu_daniu'],
      artDirection: 'Mist layers, vertical cliffs, the distant silhouette of Cangwu peaks — the world\'s scale beyond the village.',
      cameraNotes: 'Aerial establishes: village in the foreground bend, foothills rising to the south, sacred-peak scale (200-800 m).',
      rooms: [],
      exterior: [
        { id: 'prop.foothills.peak', name: 'Cangwu Peaks', scaleId: 'scale.sacred_peak', w: 800, d: 800, h: 800, material: 'karst', detail: 'The backdrop landmark.' },
      ],
    },
  ],
};

export const SET_STRUCTURE_COUNT = WANG_FAMILY_BEND.structures.length;
export const SET_ROOM_COUNT = WANG_FAMILY_BEND.structures.reduce((n, s) => n + s.rooms.length, 0);
export const SET_PROP_COUNT =
  WANG_FAMILY_BEND.structures.reduce((n, s) => n + s.exterior.length + s.rooms.reduce((m, r) => m + r.fixtures.length, 0), 0) +
  WANG_FAMILY_BEND.layout.roads.length;
