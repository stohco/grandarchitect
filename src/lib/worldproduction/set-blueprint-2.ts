/**
 * Set Blueprint 2 — Qinghe Market Town.
 *
 * The county market town an hour north of Wang Family Bend (doc 04 §2.2):
 * the salt depot where Master Hu's warehouse feeds, the river dock, the
 * granary, the county offices (yamen), the inn, the tea house where rumor
 * circulates, the medicine shop that quietly trades cultivation-adjacent
 * goods. This is the mortal/cultivator interface at trade scale — one step
 * closer to the sect world.
 */

import type { SetStructure, SetRoom, SetProp } from './set-blueprint';

export const QINGHE_MARKET_TOWN: {
  id: string; name: string; nameHanzi: string; scaleId: string; w: number; d: number; population: number;
  geography: string; qi: string; ecology: string; structures: SetStructure[];
} = {
  id: 'settlement.qinghe_market_town',
  name: 'Qinghe Market Town',
  nameHanzi: '清河镇',
  scaleId: 'scale.village_street',
  w: 700,
  d: 500,
  population: 2400,
  geography:
    'On the river at the north end of the Cangli riverlands: the county seat lies a further day north; the river carries grain, salt, and timber; the market road runs south to Wang Family Bend (doc 04 §2.2).',
  qi: 'Ambient qi thin but trade carries qi-adjacent goods: spirit stones, herb bundles, talisman paper (doc 18 §1.3).',
  ecology:
    'River fish, waterfowl; the dock attracts boats from the county seat; warehouses and granaries feed the surrounding counties.',
  structures: [
    {
      id: 'structure.qinghe.dock', name: 'River Dock', nameHanzi: '碼頭', kind: 'dock',
      scaleId: 'scale.bridge', w: 18, d: 60, h: 4,
      orientation: 'River-facing, east bank; the salt depot stands 40 m inland.',
      construction: 'Timber pier on pilings; moored boats; cargo barrows; rope and tackle.',
      materials: ['timber', 'rope', 'iron'],
      condition: 'Worn; pilings re-set last spring.',
      residents: ['npc.he_laosan'],
      rooms: [],
      exterior: [
        { id: 'prop.qinghe.mooring', name: 'Mooring Post Row', scaleId: 'scale.custom', w: 14, d: 1, h: 1.2, material: 'timber', detail: 'Eight mooring posts; boat hire boards.' },
        { id: 'prop.qinghe.cargo_barrow', name: 'Cargo Barrows', scaleId: 'scale.custom', w: 2, d: 1, h: 1, material: 'wood, iron', detail: 'Grain and salt barrows waiting for crews.' },
      ],
      artDirection: 'River-grey timber, wet rope, tar; the salt smell carries from the depot.',
      cameraNotes: 'Low wide from the waterline; boats as foreground framing.',
    },
    {
      id: 'structure.qinghe.salt_depot', name: 'Salt Depot', nameHanzi: '鹽棧', kind: 'shop',
      scaleId: 'scale.compound', w: 22, d: 30, h: 6,
      orientation: '40 m inland from the dock; the county salt license lives here at city scale.',
      construction: 'Brick walls, tiled roof, iron-bound doors; Master Hu\'s smaller warehouse feeds this one.',
      materials: ['brick', 'tile', 'iron', 'salt'],
      condition: 'Solid; doors recently repainted vermilion.',
      residents: ['npc.master_hu'],
      rooms: [
        {
          id: 'room.qinghe.depot_counting', name: 'Depot Counting Hall', purpose: 'Salt accounts at market scale.',
          scaleId: 'scale.room', w: 7, d: 9, h: 3.6,
          lighting: 'High windows; lamps for night counts.',
          smell: 'Salt, paper, ink, lamp oil.',
          sound: 'Abacus; scales; the river outside.',
          detail: 'Brass scales, salt-block racks, ledger wall; the county license frame hangs behind the counter.',
          fixtures: [
            { id: 'prop.qinghe.ledger_wall', name: 'Ledger Wall', scaleId: 'scale.custom', w: 4, d: 0.2, h: 2.4, material: 'wood, paper', detail: 'Every salt load since the town\'s founding.' },
            { id: 'prop.qinghe.big_scales', name: 'Merchant Scales', scaleId: 'scale.custom', w: 0.8, d: 0.4, h: 0.9, material: 'brass', detail: 'Weighs salt block by block.' },
          ],
        },
      ],
      exterior: [
        { id: 'prop.qinghe.salt_racks', name: 'Salt Racks', scaleId: 'scale.custom', w: 12, d: 2, h: 2, material: 'wood', detail: 'Curing racks between depot and dock.' },
      ],
      artDirection: 'Vermilion door, white salt, dark brick; the wealth of the town in one building.',
      cameraNotes: 'Push-in from the dock path; the license frame as the insert.',
    },
    {
      id: 'structure.qinghe.granary', name: 'County Granary', nameHanzi: '糧倉', kind: 'workshop',
      scaleId: 'scale.compound', w: 20, d: 26, h: 7,
      orientation: 'North edge; the tax-grain store for the county.',
      construction: 'Raised timber bins on stone piers, tiled roofs; rats are the enemy.',
      materials: ['timber', 'stone', 'tile'],
      condition: 'Good; bins rotated at harvest.',
      residents: [],
      rooms: [
        {
          id: 'room.qinghe.granary_bin', name: 'Grain Bins', purpose: 'Tax grain, seed grain, famine reserve.',
          scaleId: 'scale.room', w: 16, d: 22, h: 5,
          lighting: 'Dim; slatted light through vents.',
          smell: 'Grain, dust, old wood.',
          sound: 'Wind in the vents; rats in the walls.',
          detail: 'Raised bins of rice and wheat; the famine reserve is low this year.',
          fixtures: [
            { id: 'prop.qinghe.bin_row', name: 'Bin Row', scaleId: 'scale.custom', w: 12, d: 2, h: 3.5, material: 'timber', detail: 'Six bins, one nearly empty.' },
          ],
        },
      ],
      exterior: [
        { id: 'prop.qinghe.granary_scale', name: 'Granary Scales', scaleId: 'scale.custom', w: 0.6, d: 0.6, h: 1, material: 'iron', detail: 'Tax-grain weighing station.' },
      ],
      artDirection: 'Weather-dark timber; the smell of stored grain; quiet authority.',
      cameraNotes: 'Wide from the tax road; the near-empty bin as the telling detail.',
    },
    {
      id: 'structure.qinghe.yamen', name: 'County Offices (Yamen)', nameHanzi: '衙門', kind: 'institution' as SetStructure['kind'],
      scaleId: 'scale.sect_gate', w: 30, d: 45, h: 8,
      orientation: 'Town center, facing the market square; the magistrate\'s seat.',
      construction: 'Timber frame, whitewashed walls, dark tiled roofs; the town\'s only painted gates.',
      materials: ['timber', 'plaster', 'tile', 'lacquer'],
      condition: 'Sound; recent repairs after the flood year.',
      residents: [],
      rooms: [
        {
          id: 'room.qinghe.yamen_hall', name: 'Judgment Hall', purpose: 'County law, tax, disputes.',
          scaleId: 'scale.room', w: 10, d: 12, h: 5,
          lighting: 'High daylight; lanterns at night.',
          smell: 'Lacquer, ink, dust.',
          sound: 'Bamboo slips; clerks\' brushes.',
          detail: 'The magistrate\'s dais, the county seal, the tax rolls; the new salt bribe decision is argued here.',
          fixtures: [
            { id: 'prop.qinghe.seal_table', name: 'County Seal Table', scaleId: 'scale.custom', w: 2.4, d: 1.2, h: 1, material: 'wood, jade', detail: 'The seal that renews the salt license.' },
          ],
        },
      ],
      exterior: [
        { id: 'prop.qinghe.yamen_drum', name: 'Complaint Drum', scaleId: 'scale.custom', w: 0.6, d: 0.6, h: 1.2, material: 'wood, leather', detail: 'Struck to open a case.' },
      ],
      artDirection: 'Authority without opulence: lacquer black and red, no gold (Cangli forbids gold on ordinary buildings).',
      cameraNotes: 'Low angle at the gate; the seal table insert carries the plot.',
    },
    {
      id: 'structure.qinghe.inn', name: 'River-View Inn', nameHanzi: '臨河客棧', kind: 'household',
      scaleId: 'scale.compound', w: 18, d: 24, h: 7,
      orientation: 'Dock corner; two storeys — the town\'s tallest ordinary building.',
      construction: 'Timber frame, upper storey overhanging the street; courtyard stables behind.',
      materials: ['timber', 'plaster', 'tile'],
      condition: 'Good; the sign freshly painted.',
      residents: [],
      rooms: [
        {
          id: 'room.qinghe.inn_common', name: 'Common Room', purpose: 'Meals, rumor, trade talk.',
          scaleId: 'scale.room', w: 8, d: 10, h: 3.6,
          lighting: 'Lanterns; kitchen fire glow.',
          smell: 'Oil, tea, woodsmoke, river.',
          sound: 'Spoons, talk, a caged bird.',
          detail: 'Long tables, the stove, the river window; every rumor in the town passes through here.',
          fixtures: [
            { id: 'prop.qinghe.stove', name: 'Inn Stove', scaleId: 'scale.custom', w: 1.6, d: 1, h: 1.2, material: 'brick, iron', detail: 'The town\'s best noodles.' },
            { id: 'prop.qinghe.bird_cage', name: 'Caged Thrush', scaleId: 'scale.custom', w: 0.4, d: 0.4, h: 0.6, material: 'bamboo', detail: 'The innkeeper\'s bird.' },
          ],
        },
      ],
      exterior: [
        { id: 'prop.qinghe.inn_sign', name: 'Inn Sign', scaleId: 'scale.custom', w: 1.6, d: 0.2, h: 0.8, material: 'wood, lacquer', detail: '临河客棧 — "Inn by the River".' },
      ],
      artDirection: 'Warm lamplight against river dusk; the upper storey leaning over the street.',
      cameraNotes: 'The MC\'s room window as a recurring frame.',
    },
    {
      id: 'structure.qinghe.tea_house', name: 'Tea House', nameHanzi: '茶樓', kind: 'shop',
      scaleId: 'scale.compound', w: 14, d: 16, h: 6,
      orientation: 'Market square edge; the rumor exchange.',
      construction: 'Open-front timber, lattice windows, tiled roof.',
      materials: ['timber', 'bamboo', 'tile'],
      condition: 'Good; tables worn smooth.',
      residents: ['npc.wang_lun'],
      rooms: [
        {
          id: 'room.qinghe.tea_floor', name: 'Tea Floor', purpose: 'Tea, talk, deals, divination on the side.',
          scaleId: 'scale.room', w: 10, d: 12, h: 4,
          lighting: 'Open front; bamboo shade.',
          smell: 'Tea, smoke, straw.',
          sound: 'Teapots, abacus from the shop next door.',
          detail: 'Lattice tables, the storyteller\'s dais, a corner where Wang Lun reads hexagrams for a fee.',
          fixtures: [
            { id: 'prop.qinghe.tea_dais', name: 'Storyteller Dais', scaleId: 'scale.custom', w: 2, d: 1.4, h: 0.5, material: 'wood', detail: 'Evening stories: the immortal tales the town half-believes.' },
          ],
        },
      ],
      exterior: [
        { id: 'prop.qinghe.tea_pots', name: 'Tea Pot Rack', scaleId: 'scale.custom', w: 2, d: 0.3, h: 1.6, material: 'clay, bamboo', detail: 'Rows of clay pots.' },
      ],
      artDirection: 'Bamboo and steam; the storyteller\'s fan; rumor as furniture.',
      cameraNotes: 'Over-the-shoulder of listeners; the hexagram corner as the quiet detail.',
    },
    {
      id: 'structure.qinghe.medicine_shop', name: 'Medicine Shop', nameHanzi: '藥鋪', kind: 'shop',
      scaleId: 'scale.compound', w: 12, d: 14, h: 5,
      orientation: 'South street; the quiet trade in qi-adjacent goods.',
      construction: 'Timber and plaster; drawers wall to wall.',
      materials: ['timber', 'plaster', 'herbs'],
      condition: 'Good; the drawers fragrant.',
      residents: ['npc.wang_zongwen'],
      rooms: [
        {
          id: 'room.qinghe.medicine_counter', name: 'Counter Hall', purpose: 'Diagnosis, pills, herb trade.',
          scaleId: 'scale.room', w: 8, d: 10, h: 4,
          lighting: 'High window; lamp for night compounding.',
          smell: 'Herbs, wax, paper, alcohol.',
          sound: 'Drawers; the mortar; a cough.',
          detail: 'Drawer wall of herbs, the compounding bench, a locked cabinet for spirit-touched goods.',
          fixtures: [
            { id: 'prop.qinghe.herb_drawers', name: 'Herb Drawer Wall', scaleId: 'scale.custom', w: 5, d: 0.5, h: 2.6, material: 'wood', detail: 'Seventy-two drawers.' },
            { id: 'prop.qinghe.locked_cabinet', name: 'Locked Cabinet', scaleId: 'scale.custom', w: 1, d: 0.6, h: 1.8, material: 'wood, iron', detail: 'Spirit herbs, talisman paper, one spirit stone in a cloth.' },
          ],
        },
      ],
      exterior: [
        { id: 'prop.qinghe.medicine_sign', name: 'Medicine Sign', scaleId: 'scale.custom', w: 1.4, d: 0.2, h: 0.7, material: 'wood', detail: '悬壶济世 — "hang the gourd, heal the world".' },
      ],
      artDirection: 'The only shop where cultivator goods appear quietly: the cloth-wrapped spirit stone is the tell.',
      cameraNotes: 'Insert on the locked cabinet; the counter conversation carries the herb market.',
    },
    {
      id: 'structure.qinghe.market_square', name: 'Market Square', nameHanzi: '市集', kind: 'market',
      scaleId: 'scale.village_street', w: 60, d: 40, h: 4,
      orientation: 'Town center; the yamen faces it, the tea house and medicine shop flank it.',
      construction: 'Packed-earth square with stone stalls; market days three times a week.',
      materials: ['packed earth', 'stone', 'canvas'],
      condition: 'Worn; stalls erected market days.',
      residents: [],
      rooms: [],
      exterior: [
        { id: 'prop.qinghe.stone_stalls', name: 'Stone Stalls', scaleId: 'scale.custom', w: 30, d: 8, h: 1, material: 'stone', detail: 'Permanent stall bases.' },
      ],
      artDirection: 'The town\'s living room: canvas, produce, salt carts, argument.',
      cameraNotes: 'Drone establish + walk-through; the rumor moves visibly across the square.',
    },
  ],
};

export const QINGHE_STRUCTURE_COUNT = QINGHE_MARKET_TOWN.structures.length;
export const QINGHE_ROOM_COUNT = QINGHE_MARKET_TOWN.structures.reduce((n, s) => n + s.rooms.length, 0);
