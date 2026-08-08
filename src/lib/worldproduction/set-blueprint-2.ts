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
        { id: 'prop.qinghe.dinghy', name: 'Cargo Dinghy', scaleId: 'scale.custom', w: 5, d: 1.5, h: 1.1, material: 'timber', detail: 'Riverside skiff with a pointed bow; oars shipped, cargo straps in the well.' },
        { id: 'prop.qinghe.cargo_crates', name: 'Stacked Cargo Crates', scaleId: 'scale.custom', w: 3, d: 2.5, h: 1.8, material: 'wood, iron', detail: 'Cloth and iron-strapped crates waiting for the county boats.' },
        { id: 'prop.qinghe.rope_coils', name: 'Coiled Hawsers', scaleId: 'scale.custom', w: 3, d: 1, h: 0.5, material: 'hemp rope', detail: 'Bark-hair hawsers coiled on the deck, ready to throw.' },
        { id: 'prop.qinghe.fishing_nets', name: 'Drying Nets', scaleId: 'scale.custom', w: 2, d: 1.5, h: 0.4, material: 'hemp', detail: 'Nets hung to dry over the rail; a boatman\'s day-work.' },
        { id: 'prop.qinghe.driftwood', name: 'Driftwood Pile', scaleId: 'scale.custom', w: 2.5, d: 0.5, h: 0.6, material: 'timber', detail: 'Flood timber gathered, waiting to be split for fuel.' },
        { id: 'prop.qinghe.bollards', name: 'Dock Bollards', scaleId: 'scale.custom', w: 3, d: 0.6, h: 0.9, material: 'timber, iron', detail: 'Worn bollards; rope-scored heads from a hundred boats.' },
        { id: 'prop.qinghe.river_reeds', name: 'River Reeds', scaleId: 'scale.custom', w: 3, d: 1, h: 1.2, material: 'reeds', detail: 'Reed beds at the water edge; moorhens nest here (ecology accent).' },
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
        { id: 'prop.qinghe.salt_block_stacks', name: 'Salt Block Stacks', scaleId: 'scale.custom', w: 6, d: 2.5, h: 1.5, material: 'salt', detail: 'White blocks under oiled cloth — the town\'s wealth in bars.' },
        { id: 'prop.qinghe.depot_barrow', name: 'Depot Barrows', scaleId: 'scale.custom', w: 2, d: 1, h: 1, material: 'wood, iron', detail: 'Salt barrows shuttling between depot and dock.' },
        { id: 'prop.qinghe.weighing_scale', name: 'Depot Weighing Scale', scaleId: 'scale.custom', w: 1.2, d: 0.8, h: 1.6, material: 'brass, iron', detail: 'Beam scale for block-by-block accounting.' },
        { id: 'prop.qinghe.hemp_sacks', name: 'Hemp Sacks', scaleId: 'scale.custom', w: 3, d: 2, h: 1.8, material: 'hemp', detail: 'Salt sacks stitched and stacked for the road.' },
        { id: 'prop.qinghe.depot_rope_coil', name: 'Tackle Rope', scaleId: 'scale.custom', w: 1.2, d: 1.2, h: 0.4, material: 'hemp rope', detail: 'Spare rigging for the salt barges.' },
        { id: 'prop.qinghe.ledger_table', name: 'Outside Ledger Table', scaleId: 'scale.custom', w: 1.5, d: 1, h: 0.9, material: 'wood, paper', detail: 'The clerk\'s day-book table under the eave.' },
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
        { id: 'prop.qinghe.grain_sack_stack', name: 'Grain Sack Stack', scaleId: 'scale.custom', w: 4, d: 3, h: 2.5, material: 'hemp', detail: 'Tax grain sacked for the county wagons.' },
        { id: 'prop.qinghe.grain_chute', name: 'Grain Chute', scaleId: 'scale.custom', w: 2.2, d: 1.2, h: 1.5, material: 'timber', detail: 'Chute from the loading door down to the wagons.' },
        { id: 'prop.qinghe.grain_bins_ext', name: 'Grain Bins (loading)', scaleId: 'scale.custom', w: 6, d: 1.5, h: 1.6, material: 'timber', detail: 'Receiving bins beside the loading platform.' },
        { id: 'prop.qinghe.grain_baskets', name: 'Grain Baskets', scaleId: 'scale.custom', w: 2.5, d: 1.5, h: 1, material: 'bamboo', detail: 'Measure baskets; the famine reserve is low this year.' },
        { id: 'prop.qinghe.winch', name: 'Loading Winch', scaleId: 'scale.custom', w: 1.2, d: 0.8, h: 1.4, material: 'timber, iron', detail: 'Crank winch for the heavy grain loads.' },
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
        { id: 'prop.qinghe.guardian_dogs', name: 'Stone Guardian Dogs', scaleId: 'scale.custom', w: 1.6, d: 0.8, h: 1.2, material: 'stone', detail: 'Crude stone beasts flanking the gate; moss in their carving.' },
        { id: 'prop.qinghe.yamen_signboard', name: 'Yamen Signboard', scaleId: 'scale.custom', w: 2.4, d: 0.2, h: 1.2, material: 'wood, lacquer', detail: '清河縣衙 — "Qinghe County Office"; black lacquer, red seal.' },
        { id: 'prop.qinghe.yamen_brazier', name: 'Guard Brazier', scaleId: 'scale.custom', w: 1, d: 1, h: 1.1, material: 'iron', detail: 'Brazier; the night guards warm their hands.' },
        { id: 'prop.qinghe.notice_board', name: 'Notice Board', scaleId: 'scale.custom', w: 1.6, d: 0.2, h: 1.5, material: 'wood, paper', detail: 'Grain prices, tax dates, wanted notices.' },
        { id: 'prop.qinghe.stone_steps', name: 'Gate Steps', scaleId: 'scale.custom', w: 2.4, d: 1.5, h: 0.5, material: 'stone', detail: 'Worn steps; the threshold polished by decades of petitions.' },
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
        { id: 'prop.qinghe.inn_benches', name: 'Street Benches', scaleId: 'scale.custom', w: 3, d: 0.6, h: 0.45, material: 'wood', detail: 'Travelers\' benches under the overhang.' },
        { id: 'prop.qinghe.inn_tables', name: 'Outdoor Tables', scaleId: 'scale.custom', w: 2.2, d: 1, h: 0.8, material: 'wood', detail: 'Tables for the river view; cups left from the last sitting.' },
        { id: 'prop.qinghe.inn_lanterns', name: 'Courtyard Lanterns', scaleId: 'scale.custom', w: 1.8, d: 0.5, h: 3, material: 'paper, wood', detail: 'Red lanterns on the courtyard posts.' },
        { id: 'prop.qinghe.water_barrel', name: 'Water Barrel', scaleId: 'scale.custom', w: 1, d: 1, h: 1.2, material: 'wood', detail: 'Rain barrel for the stables.' },
        { id: 'prop.qinghe.firewood_stack', name: 'Firewood Stack', scaleId: 'scale.custom', w: 2, d: 1.5, h: 1.2, material: 'wood', detail: 'Split logs for the kitchen stove.' },
        { id: 'prop.qinghe.horse_trough', name: 'Horse Trough', scaleId: 'scale.custom', w: 2.4, d: 0.8, h: 0.7, material: 'stone', detail: 'Trough by the stables; water kept fresh.' },
        { id: 'prop.qinghe.clothes_line', name: 'Drying Line', scaleId: 'scale.custom', w: 3, d: 0.3, h: 2, material: 'cloth, hemp', detail: 'Staff laundry airing in the yard.' },
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
        { id: 'prop.qinghe.tea_jars', name: 'Tea Jars', scaleId: 'scale.custom', w: 1.2, d: 0.9, h: 0.8, material: 'ceramic', detail: 'Aged tea in lidded jars by the open front.' },
        { id: 'prop.qinghe.tea_cups', name: 'Stacked Cups', scaleId: 'scale.custom', w: 0.8, d: 0.5, h: 0.3, material: 'ceramic', detail: 'Bowls and cups stacked on a tray for market day.' },
        { id: 'prop.qinghe.tea_kettle_stove', name: 'Kettle Stove', scaleId: 'scale.custom', w: 0.9, d: 0.7, h: 1.1, material: 'brick, iron', detail: 'Brick stove at the door; the kettle steams all day.' },
        { id: 'prop.qinghe.tea_benches', name: 'Street Benches', scaleId: 'scale.custom', w: 2, d: 0.5, h: 0.45, material: 'wood', detail: 'Benches worn smooth by the storyteller\'s listeners.' },
        { id: 'prop.qinghe.tea_sign', name: 'Tea House Sign', scaleId: 'scale.custom', w: 1.2, d: 0.2, h: 0.6, material: 'wood', detail: '茶樓 — "Tea House".' },
        { id: 'prop.qinghe.tea_lanterns', name: 'Eave Lanterns', scaleId: 'scale.custom', w: 1.6, d: 0.5, h: 2.8, material: 'paper, wood', detail: 'Red lanterns at the eave; lit at dusk.' },
        { id: 'prop.qinghe.tea_drying_trays', name: 'Drying Tea Trays', scaleId: 'scale.custom', w: 2, d: 1, h: 0.5, material: 'bamboo', detail: 'Fresh leaves on bamboo trays in the sun.' },
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
        { id: 'prop.qinghe.herb_bundles', name: 'Drying Herb Bundles', scaleId: 'scale.custom', w: 1.5, d: 0.3, h: 1.6, material: 'herbs', detail: 'Bundles hung from the eave: bark, roots, leaves.' },
        { id: 'prop.qinghe.herb_mortars', name: 'Herb Mortars', scaleId: 'scale.custom', w: 1.2, d: 0.8, h: 0.6, material: 'stone, iron', detail: 'Three mortars; the quiet trade in qi-adjacent goods.' },
        { id: 'prop.qinghe.herb_jars', name: 'Herb Jars', scaleId: 'scale.custom', w: 1.5, d: 0.8, h: 0.9, material: 'ceramic', detail: 'Jars of prepared simples by the door.' },
        { id: 'prop.qinghe.pestle_bench', name: 'Compounding Bench', scaleId: 'scale.custom', w: 1.6, d: 0.6, h: 0.9, material: 'wood', detail: 'Bench with pestle and weighing tray.' },
        { id: 'prop.qinghe.herb_baskets', name: 'Herb Baskets', scaleId: 'scale.custom', w: 2, d: 1, h: 0.8, material: 'bamboo', detail: 'Baskets of gathered herbs awaiting sorting.' },
        { id: 'prop.qinghe.medicine_bench', name: 'Shop Bench', scaleId: 'scale.custom', w: 1.8, d: 0.5, h: 0.45, material: 'wood', detail: 'Bench for patients waiting their turn.' },
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
        { id: 'prop.qinghe.recruitment_stall', name: 'Recruitment Stall', scaleId: 'scale.custom', w: 4, d: 3, h: 3.5, material: 'wood, canvas, red cloth', detail: 'Once a generation: the sect\'s table, ledger, and red-and-gold recruitment banner.' },
        { id: 'prop.qinghe.stall_stock', name: 'Stall Stock Crates', scaleId: 'scale.custom', w: 3, d: 2, h: 1.6, material: 'wood, iron', detail: 'Crates of pots, cloth, and ironware under the stalls.' },
        { id: 'prop.qinghe.cloth_bolts_rack', name: 'Cloth Bolt Rack', scaleId: 'scale.custom', w: 2.5, d: 1.5, h: 1.4, material: 'hemp cloth', detail: 'Bolts of hemp and indigo on a rack, priced by the ell.' },
        { id: 'prop.qinghe.ceramic_jars', name: 'Ceramic Jars', scaleId: 'scale.custom', w: 2, d: 1.5, h: 1.2, material: 'ceramic', detail: 'Oil, soy, and pickle jars at the food stalls.' },
        { id: 'prop.qinghe.grain_sacks_row', name: 'Grain Sacks', scaleId: 'scale.custom', w: 4, d: 2, h: 1.8, material: 'hemp', detail: 'Sacks open for measure-sale.' },
        { id: 'prop.qinghe.handcart', name: 'Market Handcart', scaleId: 'scale.custom', w: 2.4, d: 1.2, h: 1.3, material: 'wood, iron', detail: 'Cart for a day\'s stock; parked at the square edge.' },
        { id: 'prop.qinghe.market_scales', name: 'Market Scales', scaleId: 'scale.custom', w: 1, d: 0.8, h: 1.2, material: 'brass', detail: 'Honest-weight scales at the square\'s stalls.' },
        { id: 'prop.qinghe.veg_baskets', name: 'Vegetable Baskets', scaleId: 'scale.custom', w: 3, d: 2, h: 0.9, material: 'bamboo', detail: 'Morning produce: cabbages, beans, gourds.' },
        { id: 'prop.qinghe.market_awning', name: 'Stall Awning', scaleId: 'scale.custom', w: 4, d: 3, h: 2.5, material: 'canvas', detail: 'Canvas awning over the cloth sellers.' },
        { id: 'prop.qinghe.water_trough', name: 'Water Trough', scaleId: 'scale.custom', w: 3, d: 0.8, h: 0.6, material: 'stone', detail: 'For horses and carters; refilled each morning.' },
        { id: 'prop.qinghe.salt_blocks_row', name: 'Salt Blocks (depot side)', scaleId: 'scale.custom', w: 3, d: 1.5, h: 1.2, material: 'salt', detail: 'Depot stock laid at the square edge for carters.' },
        { id: 'prop.qinghe.town_trees', name: 'Square Trees', scaleId: 'scale.custom', w: 6, d: 6, h: 6, material: 'elm', detail: 'Old elms; birds and shade over the stalls (ecology accent).' },
      ],
      artDirection: 'The town\'s living room: canvas, produce, salt carts, argument.',
      cameraNotes: 'Drone establish + walk-through; the rumor moves visibly across the square.',
    },
  ],
};

export const QINGHE_STRUCTURE_COUNT = QINGHE_MARKET_TOWN.structures.length;
export const QINGHE_ROOM_COUNT = QINGHE_MARKET_TOWN.structures.reduce((n, s) => n + s.rooms.length, 0);
