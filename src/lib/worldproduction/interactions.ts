/**
 * Interactions — the "EVERYTHING should be interactive" affordance map.
 *
 * Every prop and structure kind gets a set of gameplay-relevant
 * interactions (harvest, craft, trade, ritual, social, divine-sense, etc.)
 * so the tour's details are also game mechanics — per the emergence
 * directive: state, affordances, resistances, consequences.
 */

export interface InteractionHint {
  /** what a player could do (gameplay verbs). */
  canDo: string[];
  /** what systems react (per the causal event fabric). */
  systems: string[];
  /** diegetic diagnostic when something is wrong. */
  diagnostic?: string;
}

export const STRUCTURE_INTERACTIONS: Record<string, InteractionHint> = {
  household: {
    canDo: ['enter', 'converse with residents', 'trade for grain', 'seek shelter', 'sleep'],
    systems: ['social', 'economy', 'history', 'ownership'],
    diagnostic: 'shuttered windows, cold chimney = household closed or grieving',
  },
  salt_merchant_house: {
    canDo: ['trade salt', 'read the license', 'hear the bribe rumor', 'steal or be hired'],
    systems: ['economy', 'politics', 'ownership', 'history'],
  },
  workshop: {
    canDo: ['commission repairs', 'buy tools', 'trade labor', 'learn carpentry'],
    systems: ['economy', 'craft', 'social'],
  },
  widow_house: {
    canDo: ['deliver charity cloth', 'ask about Xu Erniu', 'offer help', 'investigate the coat'],
    systems: ['social', 'narrative', 'quest', 'history'],
    diagnostic: 'the peg empty of the coat = the truth changes',
  },
  school: {
    canDo: ['study', 'ask for divination', 'learn literacy', 'ask about the hexagrams'],
    systems: ['knowledge', 'divination', 'social', 'economy'],
  },
  shrine: {
    canDo: ['offer incense', 'pray', 'read the stele', 'sense qi residue', 'tie a ribbon'],
    systems: ['ritual', 'belief', 'perception', 'quest'],
    diagnostic: 'incense cold = the village is afraid',
  },
  well: {
    canDo: ['draw water', 'listen for news', 'fill jars', 'sense underground water'],
    systems: ['social', 'hydrology', 'economy'],
  },
  market: {
    canDo: ['buy', 'sell', 'barter', 'hear rumors', 'steal (risky)'],
    systems: ['economy', 'trade', 'knowledge', 'politics'],
  },
  gate: {
    canDo: ['leave the village', 'watch the road', 'guard duty'],
    systems: ['travel', 'security', 'history'],
  },
  creek: {
    canDo: ['ford', 'fish', 'bathe', 'follow the trail', 'listen (the hum)'],
    systems: ['hydrology', 'ecology', 'travel', 'narrative'],
  },
  field: {
    canDo: ['farm', 'harvest', 'plant', 'irrigate', 'steal crops'],
    systems: ['economy', 'ecology', 'agriculture', 'ownership'],
  },
  cache: {
    canDo: ['excavate', 'sense the formation', 'study the glyphs', 'repair the seal', 'rescue Xu Erniu'],
    systems: ['terrain', 'formations', 'divine-sense', 'quest', 'history'],
    diagnostic: 'node flicker + dimming stones = the formation is failing',
  },
  foothill: {
    canDo: ['hunt', 'forage herbs', 'cut wood', 'track beasts', 'enter beast territory'],
    systems: ['ecology', 'economy', 'combat', 'migration'],
  },
};

export const PROP_INTERACTIONS: Record<string, InteractionHint> = {
  'prop.kang': { canDo: ['rest', 'warm', 'sleep'], systems: ['rest', 'healing', 'social'] },
  'prop.loom': { canDo: ['weave cloth', 'learn weaving'], systems: ['craft', 'economy'] },
  'prop.low_table': { canDo: ['eat', 'share a meal', 'set contracts'], systems: ['social', 'economy'] },
  'prop.ancestor_tablet': { canDo: ['offer incense', 'read the lineage', 'learn family history'], systems: ['ritual', 'lineage', 'history'] },
  'prop.oil_lamp': { canDo: ['light', 'extinguish', 'carry'], systems: ['utility', 'social'] },
  'prop.school.dais': { canDo: ['study divination', 'read the classics'], systems: ['knowledge', 'divination'] },
  'prop.school.desk_row': { canDo: ['study', 'write'], systems: ['knowledge'] },
  'prop.shrine.stele': { canDo: ['read inscription', 'sense qi residue', 'investigate history'], systems: ['belief', 'history', 'perception'] },
  'prop.shrine.incense': { canDo: ['light incense', 'offer'], systems: ['ritual', 'social'] },
  'prop.well.ring': { canDo: ['draw water', 'listen'], systems: ['hydrology', 'social'] },
  'prop.well.cap': { canDo: ['work the windlass', 'inspect the rope'], systems: ['utility'] },
  'prop.hu.license': { canDo: ['read', 'copy', 'steal (plot-critical)'], systems: ['politics', 'economy', 'quest'] },
  'prop.hu.scales': { canDo: ['weigh goods', 'learn prices'], systems: ['economy', 'trade'] },
  'prop.lin.bench': { canDo: ['work wood', 'commission craft'], systems: ['craft', 'economy'] },
  'prop.lin.boat_rib': { canDo: ['inspect (the ferryman\'s hull)', 'buy passage later'], systems: ['craft', 'travel'] },
  'prop.xu.coat': { canDo: ['examine (clue)', 'return it', 'leave a message'], systems: ['quest', 'narrative'] },
  'prop.cache.formation': { canDo: ['sense with divine sense', 'study nodes', 'drain energy', 'repair'], systems: ['formations', 'divine-sense', 'quest'] },
  'prop.cache.shelves': { canDo: ['loot', 'read sealed boxes', 'trigger residue'], systems: ['loot', 'history'] },
  'prop.cache.entrance': { canDo: ['excavate', 'seal', 'listen'], systems: ['terrain', 'quest'] },
  'prop.market.canopy': { canDo: ['browse stalls', 'barter'], systems: ['economy', 'trade'] },
  'prop.gate.pillar_l': { canDo: ['read carvings', 'lean (social spot)'], systems: ['history', 'social'] },
  'prop.gate.pillar_r': { canDo: ['read carvings', 'lean (social spot)'], systems: ['history', 'social'] },
  'prop.creek.log_bridge': { canDo: ['cross', 'inspect the span', 'fish beneath'], systems: ['travel', 'hydrology'] },
  'prop.fields.bunds': { canDo: ['walk the terraces', 'inspect irrigation'], systems: ['agriculture', 'hydrology'] },
  'prop.foothills.peak': { canDo: ['climb', 'scout beast territory'], systems: ['travel', 'ecology'] },
  'prop.senior.gate': { canDo: ['knock', 'enter', 'be welcomed or refused'], systems: ['social', 'ownership'] },
  'prop.senior.courtyard': { canDo: ['gather', 'chores', 'witness family life'], systems: ['social', 'history'] },
  'prop.senior.storeroom': { canDo: ['store grain', 'hide valuables', 'rummage (the bride-price taels)'], systems: ['economy', 'ownership', 'quest'] },
  'prop.cloth_bolts': { canDo: ['take cloth', 'leave cloth', 'trade'], systems: ['economy', 'craft', 'social'] },
  'prop.tenant.field_path': { canDo: ['walk to the fields', 'meet the tenant'], systems: ['travel', 'social'] },
  'prop.tenant.kang': { canDo: ['rest', 'sleep'], systems: ['rest'] },
  'prop.tenant.tools': { canDo: ['borrow tools', 'inspect the thin harvest'], systems: ['agriculture', 'economy'] },
  'prop.hu.warehouse': { canDo: ['buy salt', 'steal salt (risky)', 'work the warehouse'], systems: ['economy', 'ownership', 'politics'] },
  'prop.lin.shaving_pile': { canDo: ['collect shavings (fuel)', 'learn the workshop\'s rhythm'], systems: ['economy', 'craft'] },
  'prop.xu.garden': { canDo: ['tend', 'harvest vegetables', 'leave offerings'], systems: ['agriculture', 'social'] },
  'prop.school.bell': { canDo: ['ring (village alarm)', 'mark the hours'], systems: ['social', 'security'] },
  'prop.road.main': { canDo: ['travel', 'meet', 'observe the village'], systems: ['travel', 'social', 'economy'] },
  'prop.road.well_path': { canDo: ['walk to the well', 'meet neighbors'], systems: ['travel', 'social'] },
};

/** Resolve interaction hints for any tagged object id. */
export function interactionsFor(id: string): InteractionHint | null {
  if (PROP_INTERACTIONS[id]) return PROP_INTERACTIONS[id];
  if (STRUCTURE_INTERACTIONS[id]) return STRUCTURE_INTERACTIONS[id];
  // structure ids map to kind keys (carpenter_house is a workshop, etc.)
  const kindKey = (STRUCTURE_ALIASES as Record<string, string>)[id] ?? null;
  if (kindKey) return STRUCTURE_INTERACTIONS[kindKey] ?? null;
  const best = Object.entries(STRUCTURE_INTERACTIONS)
    .filter(([k]) => id.includes(k))
    .map(([, v]) => v)[0];
  return best ?? null;
}

const STRUCTURE_ALIASES = {
  'structure.carpenter_house': 'workshop',
  'structure.widow_house': 'widow_house',
  'structure.salt_merchant_house': 'salt_merchant_house',
  'structure.senior_household': 'household',
  'structure.tenant_household': 'household',
};
