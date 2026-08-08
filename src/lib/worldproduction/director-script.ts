/**
 * Director Script — a rigorously directed donghua episode over the set.
 *
 * "Generate the world as a deep-dive visual script as if it were a directed
 * movie/donghua": every shot specifies camera cut, lens/FOV, movement,
 * subject, lighting motivation, composition, audio sting, and the
 * art-reference board it follows. Deterministic: same blueprint -> same
 * script (the director's cut is data, not prose).
 */

import { WANG_FAMILY_BEND } from './set-blueprint';
import type { SetStructure } from './set-blueprint';
import { TRAVERSAL_SPEEDS, type TraversalSpeed, scaleById } from './scale-registry';

export interface Shot {
  id: string;
  /** Scene/shot numbering, e.g. 1A. */
  number: string;
  cut: 'extreme-wide' | 'wide' | 'medium' | 'close' | 'extreme-close' | 'insert' | 'aerial' | 'crane' | 'dolly' | 'pov';
  durationSec: number;
  subject: string;
  location: string;
  structureId?: string;
  roomId?: string;
  camera: {
    lensMm: number;
    heightM: number;
    movement: 'static' | 'dolly-in' | 'dolly-out' | 'track' | 'crane-down' | 'crane-up' | 'pan' | 'tilt' | 'orbital' | 'push-in';
    cutTo: string;
  };
  lighting: string;
  composition: string;
  audio: string;
  artBoard: string;
  scaleNote?: string;
  /** Voiceover: the narrator speaks when the MC is off-frame; the MC
   * monologues when in frame; the narrator may add what the MC cannot know. */
  narrator?: string;
  mcLine?: string;
  /** sound-designer cue ids (ambience layers for this shot). */
  sound?: string[];
}

export interface DirectorEpisode {
  id: string;
  title: string;
  logline: string;
  timeOfDay: string;
  shots: Shot[];
}

function structure(id: string): SetStructure | undefined {
  return WANG_FAMILY_BEND.structures.find((s) => s.id === id);
}

/** Art-board references used across the episode. */
export const ART_BOARDS = {
  master: 'Master World Fabric Blueprint (§1 Visual Target, §3 Art Style DNA: painterly 3D, hand-painted materials)',
  character: 'Modular Character Factory (1.80 m hero, white robe/red lining, slot map)',
  terrain: 'Smooth Voxel Terrain Factory (§1 terrain target: karst peaks, terraces, sect foundations)',
  structures: 'Hybrid Structures Factory (voxel mass + modular mesh; damage states; BLD_ naming)',
  ui: 'UI/UX System Guide (Divine Sense menu, technique wheel; cream/charcoal/gold palette)',
  scale: 'Scale/Streaming/Optimization Guide (1.8 m -> 5,000 m+ landmarks; sword flight 80-200+ m/s)',
};

export const EPISODE_1: DirectorEpisode = {
  id: 'episode.1',
  title: 'Episode 1 — Dawn at Wang Family Bend',
  logline:
    'A village wakes before the sun; a boy is missing; a formation hums under a hill. Wang Shouzheng hopes for a cultivator in the family — the world above this bend is only beginning to look down.',
  timeOfDay: '04:40 – 07:10 (before dawn to full morning)',
  shots: [
    {
      id: 'shot.1A', number: '1A', cut: 'aerial', durationSec: 12,
      subject: 'The river bend, the village, the Cangwu foothills behind.',
      location: 'Aerial over the Cangli riverlands', structureId: 'structure.foothills',
      camera: { lensMm: 35, heightM: 800, movement: 'crane-down', cutTo: '1B' },
      lighting: 'Pre-dawn blue; first warm seam on the eastern ridge.',
      composition: 'Rule-of-thirds: the bend frames the village; foothills rise screen-right; the river reflects the sky.',
      audio: 'Wind, distant rooster, water; one low drone (the cache hum, not yet placed).',
      artBoard: ART_BOARDS.master + '; scale: sacred peak 200-800 m, landmark readability 5,000 m.',
      scaleNote: '800 m aerial = sacred-peak scale; cultivator invisible at this range (scale.landmark_readability).',
    },
    {
      id: 'shot.1B', number: '1B', cut: 'crane', durationSec: 10,
      subject: 'The north gate with the main road running to the square.',
      location: 'North Gate', structureId: 'structure.village_gate',
      camera: { lensMm: 50, heightM: 12, movement: 'crane-down', cutTo: '1C' },
      lighting: 'Dawn band on the horizon; gate pillars catching first light.',
      composition: 'Centered gate, road converging; the pillar posts as frame (hero-establishing).',
      audio: 'Crane creak (diegetic wind in the beam), rooster closer.',
      artBoard: ART_BOARDS.structures + ' (Sect Gate anatomy; gate as identity)',
      scaleNote: 'Gate 5 m tall (scale.sect_gate range 25-40 m is for SECT gates — village gate is 1/5 scale, deliberate).',
    },
    {
      id: 'shot.1C', number: '1C', cut: 'wide', durationSec: 8,
      subject: 'Widow Xu\'s house at the well path; her door ajar.',
      location: 'Widow Xu\'s House', structureId: 'structure.widow_house',
      camera: { lensMm: 35, heightM: 1.6, movement: 'dolly-in', cutTo: '1D' },
      lighting: 'Warm lamp inside, cool exterior; the only lit window on the street.',
      composition: 'Doorway centered; the lit window pulls the eye; coat silhouette inside.',
      audio: 'Loom rhythm, faint; a dog stirs.',
      artBoard: ART_BOARDS.master + ' (mood: still, warm-in-cold).',
    },
    {
      id: 'shot.1D', number: '1D', cut: 'medium', durationSec: 9,
      subject: 'Widow Xu at the loom; the empty peg where Xu Erniu\'s coat hung — it is still there.',
      location: 'Widow Xu\'s House — single room', structureId: 'structure.widow_house', roomId: 'room.xu.main',
      camera: { lensMm: 85, heightM: 1.2, movement: 'static', cutTo: '1E' },
      lighting: 'Single oil lamp; loom shadows on the wall.',
      composition: 'Over-the-shoulder of the loom; the coat on the peg in soft focus background.',
      audio: 'Loom stops; silence; a held breath. The drone returns, very faint.',
      artBoard: ART_BOARDS.master + ' (emotional interior; restrained ornament).',
    },
    {
      id: 'shot.1E', number: '1E', cut: 'extreme-close', durationSec: 6,
      subject: 'Xu Erniu\'s hand — unconscious in the cache, a qi thread draining from his brow.',
      location: 'Cultivator Cache — chamber', structureId: 'structure.cache_hill', roomId: 'room.cache.chamber',
      camera: { lensMm: 100, heightM: 0.8, movement: 'push-in', cutTo: '1F' },
      lighting: 'Formation glow (faint blue-green); mineral phosphorescence.',
      composition: 'Macro on the hand; the dimming node reflection in his eye.',
      audio: 'The hum now clear: a bell struck underground (Wu Daniu\'s description).',
      artBoard: ART_BOARDS.ui + ' (Divine Sense mode palette: spirit-blue wireframes); terrain board (cave stone).',
      scaleNote: 'Cache chamber 6x8 m (scale.room 6-10 m).',
    },
    {
      id: 'shot.1F', number: '1F', cut: 'wide', durationSec: 8,
      subject: 'The senior household gate; Wang Shouzheng steps out, stretching.',
      location: 'Senior Household', structureId: 'structure.senior_household',
      camera: { lensMm: 35, heightM: 1.7, movement: 'static', cutTo: '1G' },
      lighting: 'Sunrise now; long shadows; gold on the thatch.',
      composition: 'Gate frame; figure one-third; courtyard depth behind.',
      audio: 'Gate creak, chickens, water splash.',
      artBoard: ART_BOARDS.character + ' (mortal costume: plain hemp, not the hero\'s white robe — contrast by design).',
      scaleNote: 'Doorway 2.4 m (scale.doorway).',
    },
    {
      id: 'shot.1G', number: '1G', cut: 'dolly', durationSec: 12,
      subject: 'Walk-through: main road past the market stalls, well, shrine; the village assembling.',
      location: 'Main Village Road + Square', structureId: 'structure.market_stalls',
      camera: { lensMm: 28, heightM: 1.6, movement: 'track', cutTo: '1H' },
      lighting: 'Morning sun; canvas awnings striped with shadow.',
      composition: 'Tracking shot; villagers in medium; the Dao shrine stele passing frame-right.',
      audio: 'Village chorus: hawkers, hammers from Lin\'s shop, well creak.',
      artBoard: ART_BOARDS.master + ' (market street 10-20 m wide; walk 2-3 m/s matched to dolly speed).',
      scaleNote: 'Track speed ~2.5 m/s = scale.move.walk.',
    },
    {
      id: 'shot.1H', number: '1H', cut: 'close', durationSec: 7,
      subject: 'Wang Lun at the school dais, casting hexagrams; the sticks click.',
      location: 'Lineage School', structureId: 'structure.lineage_school', roomId: 'room.school.hall',
      camera: { lensMm: 85, heightM: 1.3, movement: 'static', cutTo: '1I' },
      lighting: 'Hall light raking across the dais; dust motes.',
      composition: 'Over-the-dais; the hexagram table fills the lower third.',
      audio: 'Yarrow clicks; recitation behind; a pause.',
      artBoard: ART_BOARDS.master + ' (divination: qi-residue at temporal scale — doc 24).',
    },
    {
      id: 'shot.1I', number: '1I', cut: 'insert', durationSec: 5,
      subject: 'Master Hu\'s salt license scroll; the new secretary\'s doubled bribe demand beside it.',
      location: 'Master Hu\'s Salt House — counting room', structureId: 'structure.salt_merchant_house', roomId: 'room.hu.counting',
      camera: { lensMm: 100, heightM: 1.0, movement: 'static', cutTo: '1J' },
      lighting: 'Lamp-lit desk; brass scales gleaming.',
      composition: 'Top-down on the desk; the license seal prominent.',
      audio: 'Abacus beads; paper rustle.',
      artBoard: ART_BOARDS.structures + ' (interior kit; counting room).',
    },
    {
      id: 'shot.1J', number: '1J', cut: 'medium', durationSec: 8,
      subject: 'Lady Chen at the loom in the inner room; she pauses, looks at the cloth.',
      location: 'Senior Household — weaving room', structureId: 'structure.senior_household', roomId: 'room.senior.weaving',
      camera: { lensMm: 50, heightM: 1.2, movement: 'static', cutTo: '1K' },
      lighting: 'Window light; loom shadows.',
      composition: 'Profile; the cloth bolts stacked for Widow Xu in the corner.',
      audio: 'Loom; then the well-creak outside.',
      artBoard: ART_BOARDS.character + ' (mortal textures: hemp, indigo).',
    },
    {
      id: 'shot.1K', number: '1K', cut: 'aerial', durationSec: 9,
      subject: 'The tenant fields east; a single farmer bent over; the river bend beyond.',
      location: 'Tenant Fields', structureId: 'structure.tenant_fields',
      camera: { lensMm: 35, heightM: 300, movement: 'static', cutTo: '1L' },
      lighting: 'Full morning; water mirrors in the paddies.',
      composition: 'Field grids as geometry; one figure for scale (2-3 m/s walking).',
      audio: 'Wind, birds, distant hammer.',
      artBoard: ART_BOARDS.terrain + ' (terraces & fields category).',
      scaleNote: 'Fields 200x300 m; farmer ~1.8 m — visible but tiny (scale.room + scale.cultivator).',
    },
    {
      id: 'shot.1L', number: '1L', cut: 'crane', durationSec: 10,
      subject: 'The Dao shrine stele; incense smoke; Zhou Popo lighting the morning stick.',
      location: 'Dao Binding Stone Shrine', structureId: 'structure.dao_shrine',
      camera: { lensMm: 50, heightM: 2, movement: 'crane-up', cutTo: '1M' },
      lighting: 'Low sun through the stele; smoke backlit.',
      composition: 'Stele and incense; ribbons moving; shrine in the square\'s geometry.',
      audio: 'Incense crackle; village sounds drop away.',
      artBoard: ART_BOARDS.structures + ' (shrine kit; ancient-sacred weathering) + production bible (restraint over ornament).',
    },
    {
      id: 'shot.1M', number: '1M', cut: 'pov', durationSec: 7,
      subject: 'Wang Shouzheng\'s view: the square, the foothills, and far beyond them — Cangwu Sect\'s direction.',
      location: 'Main Square, south edge', structureId: 'structure.foothills',
      camera: { lensMm: 85, heightM: 1.8, movement: 'static', cutTo: '1N' },
      lighting: 'Haze over the foothills; the peaks blue with distance.',
      composition: 'POV over rooftops; the sacred-peak silhouette; a single bird crosses.',
      audio: 'Wind; the drone (diegetic, in-world, faint — the cache hum).',
      artBoard: ART_BOARDS.scale + ' (sacred peak 200-800 m; the world beyond the village).',
    },
    {
      id: 'shot.1N', number: '1N', cut: 'wide', durationSec: 14,
      subject: 'Black Creek at the log bridge; mist; Wu Daniu the charcoal-burner stops, listening.',
      location: 'Black Creek Crossing', structureId: 'structure.black_creek',
      camera: { lensMm: 35, heightM: 1.6, movement: 'dolly-out', cutTo: 'shot.1N+ (end card)' },
      lighting: 'Mist lifting; cool palette shift.',
      composition: 'Bridge centered; the foothill trail leading screen-right; Daniu small.',
      audio: 'The hum, distinct; he listens; the drone holds into the end card.',
      artBoard: ART_BOARDS.terrain + ' (waterfall basin / creek palette) + audio (Wu Daniu\'s bell-struck-underground).',
    },
  ],
};

/** Deterministic shot-count etc. for the conformance suite. */
export function directorStats(): { episodes: number; shots: number; cuts: string[]; locations: string[] } {
  const cuts = new Set<string>();
  const locations = new Set<string>();
  let shots = 0;
  for (const e of [EPISODE_1]) {
    shots += e.shots.length;
    for (const s of e.shots) {
      cuts.add(s.cut);
      locations.add(s.location);
    }
  }
  return { episodes: 1, shots, cuts: [...cuts], locations: [...locations] };
}

/** Speed reference for scene timing (walk-through at canonical pace). */
export function traversalRef(speedId: string): TraversalSpeed | undefined {
  return TRAVERSAL_SPEEDS.find((t) => t.id === speedId);
}

// ---------------------------------------------------------------------------
// THE VILLAGE TOUR — the long-form cinematic (narrator + MC voiceover).
// Every structure, interior, prop, terrain detail, ecology, and cosmology
// beat, with sound cues per shot. "When you think you're being detailed
// and specific, you're probably not being detailed enough."
// ---------------------------------------------------------------------------

const B = ART_BOARDS;

export const TOUR_SHOTS: Shot[] = [
  // ---- cosmology opening -------------------------------------------------
  { id: 'tour.01', number: 'T01', cut: 'aerial', durationSec: 14, subject: 'The Cangli riverlands bend at dawn; the three strata reading in the sky.', location: 'Aerial — Cangwu World', structureId: 'structure.foothills',
    camera: { lensMm: 24, heightM: 1200, movement: 'crane-down', cutTo: 'T02' },
    lighting: 'Pre-dawn: the Mortal Stratum lit, the Acquired above it faint with law-lines, the Precelestial a band of slow light.',
    composition: 'The bend as a comma on the land; the strata stacked vertically; the village a cluster of embers.',
    audio: 'High wind; the world breathing.',
    artBoard: B.scale + '; ' + B.master,
    scaleNote: '1,200 m aerial; landmark readability 5,000 m.',
    narrator: 'There are three strata stacked over every village. The Mortal Stratum where men live; the Acquired Stratum, a luminous ocean of differentiated qi where sects hold their spirit veins; and the Precelestial, older and slower, the workshop where the laws of the lower world were inscribed. Under the smallest of these lights, a bend of the Cangli river holds one hundred and eighty people who have never seen a cultivator.',
    sound: ['wind_high', 'dawn_chorus'] },
  { id: 'tour.02', number: 'T02', cut: 'crane', durationSec: 10, subject: 'The north gate with the main road running south.', location: 'North Gate', structureId: 'structure.village_gate',
    camera: { lensMm: 50, heightM: 14, movement: 'crane-down', cutTo: 'T03' },
    lighting: 'First gold on the beam; the road in cool blue.',
    composition: 'Gate centered; the road as a leading line to the square.',
    audio: 'Wind in the beam; a rooster.',
    artBoard: B.structures,
    scaleNote: 'Village gate 6 m — one-fifth sect-gate scale, deliberately.',
    narrator: 'The village gate is two stone pillars and a pine beam — the threshold where the wide world narrows to a single road. Beyond it: the market town an hour north, the county seat, the sects. Behind it: one hundred and eighty people who wake before the sun.',
    mcLine: 'I have crossed this threshold a thousand times. Today it feels like a door that could close.',
    sound: ['wind', 'rooster', 'dawn_chorus'] },
  { id: 'tour.03', number: 'T03', cut: 'wide', durationSec: 9, subject: 'Widow Xu\'s house; the lit window; the door ajar.', location: 'Widow Xu\'s House', structureId: 'structure.widow_house',
    camera: { lensMm: 35, heightM: 1.6, movement: 'dolly-in', cutTo: 'T04' },
    lighting: 'Warm lamp inside, cool exterior.',
    composition: 'Doorway centered; the coat visible inside.',
    audio: 'Loom; silence.',
    artBoard: B.master,
    narrator: 'The smallest house in the bend belongs to Widow Xu, whose husband and two sons are dead, and whose last son went into the foothills three days ago to cut firewood. The lineage keeps her fed. The loom keeps her sane.',
    sound: ['loom', 'dawn_chorus'] },
  { id: 'tour.04', number: 'T04', cut: 'close', durationSec: 8, subject: 'The empty peg; Xu Erniu\'s coat.', location: 'Widow Xu\'s House — single room', structureId: 'structure.widow_house', roomId: 'room.xu.main',
    camera: { lensMm: 85, heightM: 1.2, movement: 'static', cutTo: 'T05' },
    lighting: 'Lamp glow; shadows climbing.',
    composition: 'The coat in focus; the loom behind, out of focus.',
    audio: 'Loom stops; the faint underground hum begins.',
    artBoard: B.master,
    narrator: 'The coat has hung three days. Somewhere under the Cangwu foothills, Xu Erniu lies in a cultivator\'s abandoned cache, his qi slowly draining into a formation that has not been maintained in centuries. The village does not know it. The hum is too low to name.',
    sound: ['loom_stop', 'cache_hum'] },
  { id: 'tour.05', number: 'T05', cut: 'extreme-close', durationSec: 6, subject: 'Xu Erniu\'s hand; a qi thread leaving his brow.', location: 'Cultivator Cache — chamber', structureId: 'structure.cache_hill', roomId: 'room.cache.chamber',
    camera: { lensMm: 100, heightM: 0.8, movement: 'push-in', cutTo: 'T06' },
    lighting: 'Formation glow; mineral phosphorescence.',
    composition: 'Macro on the hand; the dimming node in his eye.',
    audio: 'The hum clear: a bell struck underground.',
    artBoard: B.ui + ' (Divine Sense palette)',
    narrator: 'The cache\'s maintenance formation reads its purpose in its geometry: node and edge, circuit and sink. It was built to preserve — spirit stones, sealed jars, the memory of a cultivator who never returned. It preserves Xu Erniu the same way. It is very, very patient.',
    sound: ['cache_hum', 'drip'] },
  { id: 'tour.06', number: 'T06', cut: 'wide', durationSec: 8, subject: 'The senior household; Wang Shouzheng at the gate.', location: 'Senior Household', structureId: 'structure.senior_household',
    camera: { lensMm: 35, heightM: 1.7, movement: 'static', cutTo: 'T07' },
    lighting: 'Sunrise on the thatch; long shadows.',
    composition: 'The gate frames him; courtyard depth behind.',
    audio: 'Gate creak; chickens; water.',
    artBoard: B.character,
    scaleNote: 'Doorway 2.4 m; compound 18 × 24 m.',
    narrator: 'Wang Shouzheng, fifty-eight, head of the Wang lineage, is the strongest man in the bend and knows exactly how weak that is. He doctored his second son\'s birth record to spare him the corvée. He has not wept since he held his own father\'s hand as it went cold. What he wants most: one cultivator in the family. He does not say it aloud.',
    mcLine: 'The lineage will need more than my name to survive what is coming. I feel it the way I felt the river rising the year before the flood.',
    sound: ['chickens', 'morning_market'] },
  { id: 'tour.07', number: 'T07', cut: 'dolly', durationSec: 12, subject: 'Walk-through of the main road; market stalls; the square assembling.', location: 'Main Road + Square', structureId: 'structure.market_stalls',
    camera: { lensMm: 28, heightM: 1.6, movement: 'track', cutTo: 'T08' },
    lighting: 'Morning sun striped through canvas.',
    composition: 'Tracking; villagers passing; the shrine stele frame-right.',
    audio: 'Hawkers; hammers; well creak.',
    artBoard: B.master,
    scaleNote: 'Track speed 2.5 m/s = canonical walk.',
    narrator: 'The square is the village\'s only instrument of news. This morning the news is salt — the new county secretary wants double the bribe, and Master Hu\'s license expires at the autumn. Salt reaches every pot in the bend. The square already knows it. The square always knows.',
    sound: ['market_bustle', 'chickens', 'hammers'] },
  { id: 'tour.08', number: 'T08', cut: 'close', durationSec: 7, subject: 'Wang Lun casting hexagrams at the school dais.', location: 'Lineage School', structureId: 'structure.lineage_school', roomId: 'room.school.hall',
    camera: { lensMm: 85, heightM: 1.3, movement: 'static', cutTo: 'T09' },
    lighting: 'Raking light; dust motes.',
    composition: 'Over the dais; the hexagram table lower third.',
    audio: 'Yarrow clicks; recitation.',
    artBoard: B.master,
    narrator: 'The school teacher Wang Lun is forty-one and quietly the most dangerous man in the village — not for what he can do, but for what he can read. Divination is the perception of qi-residue at temporal scale. The sticks do not predict. They measure the momentum of the present, which most people mistake for the future.',
    sound: ['yarrow', 'recitation'] },
  { id: 'tour.09', number: 'T09', cut: 'insert', durationSec: 5, subject: 'The salt license; the doubled bribe demand.', location: 'Master Hu\'s Salt House — counting room', structureId: 'structure.salt_merchant_house', roomId: 'room.hu.counting',
    camera: { lensMm: 100, heightM: 1.0, movement: 'static', cutTo: 'T10' },
    lighting: 'Lamp-lit desk; brass gleaming.',
    composition: 'Top-down; the license seal prominent.',
    audio: 'Abacus; paper.',
    artBoard: B.structures,
    narrator: 'The 鹽引 license is worth more than any house in the bend. The new secretary\'s demand sits beside it, in writing — a doubling that would empty the salt warehouse and still not be enough. Master Hu will pay it, because there is no one to appeal to, and the village will eat salt at the old price, and the difference will come out of the thin places in the year.',
    sound: ['abacus', 'counting_room'] },
  { id: 'tour.10', number: 'T10', cut: 'medium', durationSec: 8, subject: 'Lady Chen at the loom; the cloth bolts for Widow Xu.', location: 'Senior Household — weaving room', structureId: 'structure.senior_household', roomId: 'room.senior.weaving',
    camera: { lensMm: 50, heightM: 1.2, movement: 'static', cutTo: 'T11' },
    lighting: 'Window light; loom shadows.',
    composition: 'Profile; bolts stacked in the corner.',
    audio: 'Loom; the well creak outside.',
    artBoard: B.character,
    narrator: 'Lady Chen weaves at night, cloth the village will see at Widow Xu\'s gate in the morning, left as if by wind. She calls it a debt, not charity — the widow\'s husband once carried a flood-year harvest for her family. The village calls it what it is. No one mentions it. That is how the bend repays.',
    sound: ['loom', 'well_creak'] },
  { id: 'tour.11', number: 'T11', cut: 'aerial', durationSec: 9, subject: 'The tenant fields; a single farmer; the river bend.', location: 'Tenant Fields', structureId: 'structure.tenant_fields',
    camera: { lensMm: 35, heightM: 300, movement: 'static', cutTo: 'T12' },
    lighting: 'Full morning; water mirrors.',
    composition: 'Field grids; one figure for scale.',
    audio: 'Wind; distant hammer.',
    artBoard: B.terrain,
    scaleNote: 'Fields 200 × 300 m; farmer 1.8 m.',
    narrator: 'The tenant households hold the surface right to eight mu each, three generations deep, on subsoil owned by a market-town landlord. The fields do not ask who owns them. They ask for hands, and water, and patience — and this year they returned a thin harvest, which the village is still arguing about in its sleep.',
    mcLine: 'My hands know this soil better than my name. Whatever I become, I want it to remember that.',
    sound: ['fields_wind', 'birds', 'insects'] },
  { id: 'tour.12', number: 'T12', cut: 'crane', durationSec: 10, subject: 'The Dao shrine; incense; Zhou Popo lighting the morning stick.', location: 'Dao Binding Stone Shrine', structureId: 'structure.dao_shrine',
    camera: { lensMm: 50, heightM: 2, movement: 'crane-up', cutTo: 'T13' },
    lighting: 'Low sun through the stele; smoke backlit.',
    composition: 'Stele and incense; ribbons moving.',
    audio: 'Incense crackle; the village drops away.',
    artBoard: B.structures,
    narrator: 'The Dao Binding Stone is older than the village and the villagers know it — a weathered stele on river cobble, the inscription worn to suggestion. It is objectively a stone with marks. It is believed sacred. It is politically important. It is emotionally important. Four truths, one stone.',
    sound: ['shrine_chime', 'incense'] },
  { id: 'tour.13', number: 'T13', cut: 'close', durationSec: 7, subject: 'Zhou Popo\'s hands; the silk bag of dried umbilical cords.', location: 'Dao Binding Stone Shrine', structureId: 'structure.dao_shrine',
    camera: { lensMm: 100, heightM: 1.0, movement: 'static', cutTo: 'T14' },
    lighting: 'Smoke-threaded light.',
    composition: 'Macro on the bag; her hands.',
    audio: 'Fabric whisper; a held breath.',
    artBoard: B.master,
    narrator: 'Zhou Popo, sixty-six, midwife and folk-healer and story-teller, keeps one dried umbilical cord per child she has birthed — a silk bag heavy with the entire village\'s first hour. She knows every birth, every debt, every grievance, every secret. The village tells her everything. She tells the village only what is good for it to know.',
    sound: ['fabric', 'shrine_chime'] },
  { id: 'tour.14', number: 'T14', cut: 'dolly', durationSec: 11, subject: 'The well at mid-morning; women gathering; buckets rising.', location: 'Communal Well', structureId: 'structure.well',
    camera: { lensMm: 35, heightM: 1.6, movement: 'track', cutTo: 'T15' },
    lighting: 'Water glints; stone worn smooth.',
    composition: 'Circular motion around the well; the cap beam high.',
    audio: 'Rope creak; water; chatter.',
    artBoard: B.master,
    scaleNote: 'Well 3 m; ring 1.6 m.',
    narrator: 'The well is the village\'s true square. Water is drawn, news is exchanged, judgments are half-made and half-retracted between two buckets. The stone ring is worn smooth by generations of ropes — you can read the village\'s age in the grooves, if you know how to read stone.',
    sound: ['well_creak', 'market_bustle', 'water'] },
  { id: 'tour.15', number: 'T15', cut: 'wide', durationSec: 9, subject: 'Carpenter Lin\'s workshop; shavings; a boat rib taking shape.', location: 'Carpenter Lin\'s House', structureId: 'structure.carpenter_house',
    camera: { lensMm: 35, heightM: 1.6, movement: 'dolly-in', cutTo: 'T16' },
    lighting: 'Open-front daylight; sawdust motes.',
    composition: 'Workbench centered; shavings pile foreground.',
    audio: 'Plane; mallet.',
    artBoard: B.structures,
    narrator: 'Lin Aqiao, thirty-eight, builds houses, boats, mill machinery, and coffins, paid in grain, cash, or labor-exchange. He is also the bao head — the village\'s deliberate counterweight to the Wang-headed li, so that no one family owns the bend\'s politics. The balance is older than the well and just as worn.',
    sound: ['hammers', 'plane'] },
  { id: 'tour.16', number: 'T16', cut: 'close', durationSec: 7, subject: 'The boat rib; the ferryman\'s next hull.', location: 'Carpenter Lin\'s House — workshop', structureId: 'structure.carpenter_house', roomId: 'room.lin.workshop',
    camera: { lensMm: 85, heightM: 1.2, movement: 'static', cutTo: 'T17' },
    lighting: 'Side light across the grain.',
    composition: 'The rib fills the frame; grain in focus.',
    audio: 'A single plane stroke; silence.',
    artBoard: B.structures + ' (wood detail)',
    narrator: 'He Laosan the ferryman ordered this rib in the spring — a new hull for the river crossing. The wood came from the foothills, cut by Wu Daniu the charcoal-burner, whose kiln collapsed once and took his younger brother. Every plank in this village is a chain of hands.',
    sound: ['plane'] },
  { id: 'tour.17', number: 'T17', cut: 'wide', durationSec: 8, subject: 'The market stalls row; canopies; goods laid out.', location: 'Market Stalls Row', structureId: 'structure.market_stalls',
    camera: { lensMm: 28, heightM: 1.7, movement: 'dolly-out', cutTo: 'T18' },
    lighting: 'Noon; striped shadows.',
    composition: 'Canopy line; hanging produce; a buyer and seller.',
    audio: 'Haggling; cloth; baskets.',
    artBoard: B.master,
    scaleNote: 'Stall row 20 m along the widened road.',
    narrator: 'Eight stalls under one canvas run. Produce from the fields, cloth from the looms, salt from Master Hu\'s warehouse, tools from Lin\'s bench. The market town offers more, and costs more, and takes the better half of a day — so the village buys what it can from itself, and the difference is what the season owes it.',
    sound: ['market_bustle', 'chickens'] },
  { id: 'tour.18', number: 'T18', cut: 'medium', durationSec: 7, subject: 'The tenant house; Wang Zongde sharpening a tool at the door.', location: 'Tenant Household', structureId: 'structure.tenant_household',
    camera: { lensMm: 50, heightM: 1.6, movement: 'static', cutTo: 'T19' },
    lighting: 'Low eaves; the thin light of a thin house.',
    composition: 'Doorway; the bare-stick son in the shadow of the lintel.',
    audio: 'Whetstone; field wind.',
    artBoard: B.master,
    narrator: 'Wang Zongde, twenty-four, is the tenant household\'s unmarried son — the "bare stick" who will not inherit land, only labor. He is studying with a traveling hustler and dreaming of a way out that does not exist. The village knows his type. The village has seen this exact resentment sharpen, season after season.',
    sound: ['whetstone', 'fields_wind'] },
  { id: 'tour.19', number: 'T19', cut: 'aerial', durationSec: 10, subject: 'Black Creek at the log bridge; mist; the trail into the foothills.', location: 'Black Creek Crossing', structureId: 'structure.black_creek',
    camera: { lensMm: 35, heightM: 120, movement: 'crane-down', cutTo: 'T20' },
    lighting: 'Mist lifting; the cool palette of the edge of the world.',
    composition: 'The bridge; the trail leading screen-right.',
    audio: 'Water; mist-muffled birds.',
    artBoard: B.terrain,
    scaleNote: 'Creek 40 m; bridge 20 m span.',
    narrator: 'Black Creek is the village\'s edge. Alders lean over dark water, the log bridge crosses one span, and the trail beyond climbs into the Cangwu foothills — charcoal-burners\' territory, then beast territory, then the Cangwu Sect at a hundred li. Beyond the creek, the village\'s knowledge runs out. That is where Xu Erniu went.',
    sound: ['creek', 'mist_birds'] },
  { id: 'tour.20', number: 'T20', cut: 'pov', durationSec: 8, subject: 'Wu Daniu stopping on the bridge, listening.', location: 'Black Creek Crossing', structureId: 'structure.black_creek',
    camera: { lensMm: 50, heightM: 1.6, movement: 'static', cutTo: 'T21' },
    lighting: 'Mist; the hum audible now.',
    composition: 'His back; the trail beyond; the sound in the air.',
    audio: 'The hum — a bell struck underground.',
    artBoard: B.terrain,
    narrator: 'Wu Daniu, fifty, charcoal-burner, has heard the hum for a month now — low, regular, like a bell struck deep in the mountain. He cut the trail past Black Creek where Erniu\'s axe was found. He has not told anyone about the hum. He is superstitious, and right.',
    mcLine: 'The mountain is not supposed to hum. Mountains are supposed to be silent. That is what my grandfather taught me, and he was never wrong about the mountain.',
    sound: ['cache_hum', 'creek'] },
  { id: 'tour.21', number: 'T21', cut: 'aerial', durationSec: 12, subject: 'The Cangwu foothills: karst peaks, pine forest, beast territory.', location: 'Cangwu Foothills', structureId: 'structure.foothills',
    camera: { lensMm: 35, heightM: 900, movement: 'crane-up', cutTo: 'T22' },
    lighting: 'Late morning; mist layers between peaks.',
    composition: 'The massif rising; the village tiny in the foreground bend.',
    audio: 'Wind; distant predator cry.',
    artBoard: B.terrain,
    scaleNote: 'Foothills to 800 m; sacred-peak scale.',
    narrator: 'The Cangwu foothills hold everything the village fears and needs: firewood, game, herbs, and the beasts that eat both. Pheasants and wild boar in the low woods; spirit beasts higher up, climbing the same realm ladder as men — serpent, wolf, deer, hawk, each tier reading in size and aura. The village hunts the low tier. The high tier hunts the village, when the village forgets to be small.',
    sound: ['wind_high', 'predator_cry'] },
  { id: 'tour.22', number: 'T22', cut: 'wide', durationSec: 9, subject: 'A spirit wolf at the treeline; watching; gone.', location: 'Cangwu Foothills — beast territory', structureId: 'structure.foothills',
    camera: { lensMm: 85, heightM: 1.8, movement: 'static', cutTo: 'T23' },
    lighting: 'Forest shade; a shaft of sun on the wolf.',
    composition: 'The wolf in the gap between pines; one breath, then empty.',
    audio: 'Forest silence; one bird alarm.',
    artBoard: B.master + '; ' + B.character,
    narrator: 'The spirit wolf is Qi Condensation tier — young, by its species\' measure — and it is not hunting the village. It is hunting the rabbits the charcoal-burners\' fires have drawn to the edges. It watches the two-legged things the way the village watches the weather: as information. It is gone before the shutter of an eye.',
    sound: ['forest', 'bird_alarm'] },
  { id: 'tour.23', number: 'T23', cut: 'insert', durationSec: 6, subject: 'Herb patch: qi-gathering grass, dew-lit, at the cave mouth path.', location: 'Cangwu Foothills — herb patch', structureId: 'structure.foothills',
    camera: { lensMm: 100, heightM: 0.5, movement: 'push-in', cutTo: 'T24' },
    lighting: 'Fractal light through canopy.',
    composition: 'Macro on the grass; dew; the cave mouth blurred behind.',
    audio: 'Drip; insects; the faint hum.',
    artBoard: B.master + ' (herb detail)',
    narrator: 'Qi-gathering grass grows where the spirit vein breathes close to the surface — a common herb by sect standards, priceless by the village\'s. Harvested wrong it loses its virtue; harvested right it is worth a season\'s salt. The herb patches near the cache mouth are undisturbed. The formation\'s residue keeps them, the way a seal keeps a room.',
    sound: ['drip', 'insects', 'cache_hum'] },
  { id: 'tour.24', number: 'T24', cut: 'wide', durationSec: 10, subject: 'The cache hill at dusk; the glow faintly visible.', location: 'Cultivator Cache (Foothill Cave)', structureId: 'structure.cache_hill',
    camera: { lensMm: 35, heightM: 1.8, movement: 'push-in', cutTo: 'T25' },
    lighting: 'Dusk; the formation\'s qi glow reading wrong against the dark.',
    composition: 'The hill centered; the glow like a held breath.',
    audio: 'The hum, now the scene\'s true subject.',
    artBoard: B.ui + ' (Divine Sense palette: spirit-blue wireframes)',
    narrator: 'A hill that reads wrong to anyone who looks twice. The entrance is sealed by a fallen lintel — crumbled stone, centuries old. Inside, a maintenance formation holds its last charge, dimming node by node, feeding on the only qi in the room. The village calls the hill the old land. The sect that built the cache is three hundred years dead.',
    sound: ['cache_hum', 'dusk_chorus'] },
  { id: 'tour.25', number: 'T25', cut: 'crane', durationSec: 9, subject: 'The tenant fields at golden hour; the scarecrow; crop rows.', location: 'Tenant Fields', structureId: 'structure.tenant_fields',
    camera: { lensMm: 50, heightM: 8, movement: 'crane-down', cutTo: 'T26' },
    lighting: 'Golden hour; long row shadows.',
    composition: 'Rows converging; the scarecrow a lonely cross.',
    audio: 'Wind through stalks; crows.',
    artBoard: B.terrain,
    narrator: 'Golden hour turns the fields into geometry — water in the paddies holding the sky, dryland rows running to the river. The scarecrow wears an old coat of Wu Daniu\'s. The crows know it is a coat. The crows are not afraid of coats. The crows are afraid of the charcoal-burner, who is also not afraid of them.',
    sound: ['fields_wind', 'crows', 'insects'] },
  { id: 'tour.26', number: 'T26', cut: 'extreme-wide', durationSec: 11, subject: 'The river bend at dusk; the whole village in one frame.', location: 'Aerial — Cangli riverlands', structureId: 'structure.tenant_fields',
    camera: { lensMm: 24, heightM: 500, movement: 'static', cutTo: 'T27' },
    lighting: 'Dusk blue and gold; windows lighting one by one.',
    composition: 'The bend; the village; the foothills; the river.',
    audio: 'Dusk chorus; the day\'s last hammer.',
    artBoard: B.master + '; ' + B.scale,
    scaleNote: 'The whole settlement in one frame: 400 × 600 m.',
    narrator: 'One by one the windows light — first Widow Xu\'s, then the senior household, then the school where Wang Lun reads by lamplight, then the salt house, last of all, because Master Hu counts his oil. The bend tucks itself into the dark. Under the foothills, a formation dims another degree, and a boy breathes in his sleep.',
    mcLine: 'A hundred and eighty lights. I know every one of them by name. I will not let this be the last year they all light.',
    sound: ['dusk_chorus', 'cache_hum'] },
  { id: 'tour.27', number: 'T27', cut: 'aerial', durationSec: 14, subject: 'Night: the strata overhead; the Green Mirror Vein\'s direction; end card.', location: 'Aerial — night', structureId: 'structure.foothills',
    camera: { lensMm: 35, heightM: 1500, movement: 'crane-up', cutTo: 'END' },
    lighting: 'Night; stars; the Acquired Stratum faintly luminous to the west.',
    composition: 'The village an ember; the west holding a green-tinged light where the vein runs.',
    audio: 'Wind; the hum, very faint, as if the mountain were dreaming.',
    artBoard: B.scale + '; ' + B.master,
    narrator: 'To the west, a hundred li away, the Green Mirror Vein runs under the Cangwu Sect — yin-dominant, water-phase primary, wood secondary — and a handful of cultivators sit in its light, unaware of the village at their feet. Every village in the Mortal Stratum sits in some sect\'s shadow. Most never learn the name of the shadow. This one is about to.',
    sound: ['night_wind', 'cache_hum'] },
];

export const TOUR_COUNT = TOUR_SHOTS.length;
