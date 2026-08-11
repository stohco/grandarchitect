#!/usr/bin/env bun
/**
 * frontier/planet-constitution.ts — the Starting Xianxia Planet Constitution
 * (World Quality Compiler source: the "Planet Constitution" section).
 *
 * The Content Gauntlet asks "is this generated thing good?" The Planet
 * Constitution asks "did we remember all the kinds of things that need to
 * exist in the first place?"
 *
 * 45 constitutional categories (mundane world → planetary core → unimportant
 * things) + the Planet Completeness Gauntlet (~50 questions). A generated
 * planet is COMPLETE only when every category is present (or explicitly
 * justified absent) AND the completeness questions pass.
 *
 * The pipeline this feeds:
 *   Er-Gen-inspired World Ontology → Planet Constitution → Causal World
 *   Generation → 100,000-year History Simulation → Planet Completeness
 *   Gauntlet → Content Quality Gauntlet → Cross-System Contradiction
 *   Gauntlet → Visual/Gameplay Gauntlet → Performance Representation
 *   Gauntlet → CANONICAL WORLD
 *
 * Run: bun run src/engine/frontier/planet-constitution.ts
 */

export interface PlanetCategory {
  id: number;
  name: string;
  /** What must exist for this category to be satisfied. */
  required: string[];
  /** Why this category matters (the Xianxia reason). */
  rationale: string;
}

export const PLANET_CONSTITUTION: PlanetCategory[] = [
  { id: 1, name: 'The mundane world', rationale: 'Cultivation needs something to tower over — mortal life makes cultivation transcendent.', required: ['villages', 'hamlets', 'farmsteads', 'towns', 'cities', 'farmers', 'hunters', 'merchants', 'inns', 'roads', 'bridges', 'markets', 'graveyards', 'fortifications'] },
  { id: 2, name: 'Mortal political geography', rationale: 'Kingdoms, empires, borderlands, vassals — with rulers, taxes, wars, succession, rebellion.', required: ['kingdoms', 'empires', 'bureaucracy', 'taxation', 'armies', 'nobility', 'wars', 'succession', 'marriage alliances', 'trade treaties', 'banditry', 'rebellions', 'migration'] },
  { id: 3, name: 'Cultivation-country hierarchy', rationale: 'The planet is divided by cultivation power: hegemons → rank-5 → ... → rank-1 → mortal.', required: ['planetary hegemon', 'rank-5 powers', 'rank-4 powers', 'rank-3 powers', 'rank-2 powers', 'rank-1 societies', 'tribute', 'vassalage', 'war authorization', 'battleground access'] },
  { id: 4, name: 'Sect internal anatomy', rationale: 'Sects are layered institutions: outer territory → outer sect → inner sect → core → hidden.', required: ['outer territory', 'outer sect', 'inner sect', 'core', 'hidden depths', 'disciple ranks', 'elder ranks', 'hall masters', 'sect master', 'ancestors', 'recruitment', 'ranking competitions', 'internal factions'] },
  { id: 5, name: 'Cultivator families and clans', rationale: 'Families own mines, techniques, bloodline arts, ancestral treasures — strength changes over centuries.', required: ['mortal family', 'cultivation family', 'ancient clan', 'fallen clan', 'merchant clan', 'bloodline clan', 'hidden family', 'family treasures', 'marriage contracts', 'spirit springs'] },
  { id: 6, name: 'Loose cultivators', rationale: 'Rogues, hermits, treasure hunters, old monsters in seclusion — unpredictable micro-history.', required: ['rogue cultivators', 'wandering cultivators', 'hermits', 'treasure hunters', 'mercenaries', 'demonic cultivators', 'grave robbers', 'old monsters in seclusion'] },
  { id: 7, name: 'Cultivation cities', rationale: 'Cities as systems of cultivation law and commerce: artifact shops, pill halls, auctions.', required: ['artifact shops', 'pill shops', 'herb markets', 'spirit-beast markets', 'auction houses', 'information brokers', 'black markets', 'teleportation halls', 'sect embassies', 'bounty halls'] },
  { id: 8, name: 'Layered economies', rationale: 'Mortal coin → spirit stones → treasure-for-treasure; high-tier goods are beyond money.', required: ['mortal economy', 'low cultivation economy', 'higher cultivation economy', 'extreme economy', 'spirit stones', 'pills', 'manuals', 'treasure exchange', 'favor exchange', 'inheritance access'] },
  { id: 9, name: 'Spiritual geography', rationale: 'Qi density, veins, springs, dead zones are as fundamental as elevation.', required: ['qi density', 'qi purity', 'spirit-vein topology', 'vein depth', 'spirit springs', 'natural formations', 'dead zones', 'corrupted zones', 'convergence points'] },
  { id: 10, name: 'Cultivation resource ecology', rationale: 'Herbs, ores, beast materials, heavenly treasures have growth conditions, predators, regeneration.', required: ['ordinary herbs', 'spirit herbs', 'ancient herbs', 'spirit wood', 'ore', 'jade', 'crystals', 'spirit stones', 'beast materials', 'natural treasures', 'spiritual flames', 'rare waters'] },
  { id: 11, name: 'Alchemy ecosystem', rationale: 'Recipes are treasure; pill quality, failure, impurities, forbidden pills, access politics.', required: ['pill recipes', 'ingredient substitutions', 'furnaces', 'alchemist ranks', 'pill quality', 'poison pills', 'breakthrough pills', 'forbidden pills', 'ancient recipes', 'recipe fragments'] },
  { id: 12, name: 'Artifact/refining civilization', rationale: 'Flying swords, robes, seals, mirrors, boats, storage treasures — with provenance and rank.', required: ['flying swords', 'robes', 'armor', 'flags', 'cauldrons', 'seals', 'mirrors', 'storage treasures', 'soul treasures', 'formations', 'puppets', 'restrictions'] },
  { id: 13, name: 'Formations everywhere', rationale: 'From bedroom to mountain to planetary scale — concealment, killing, sealing, transfer.', required: ['sect defense', 'city defense', 'household protection', 'concealment', 'illusion', 'killing formations', 'spirit gathering', 'sealing', 'tracking', 'communication', 'barriers', 'prisons', 'ancient broken arrays'] },
  { id: 14, name: 'Travel infrastructure', rationale: 'Mortal roads → flying swords → transfer arrays — a distance hierarchy.', required: ['mortal roads', 'river routes', 'ships', 'caravans', 'flying swords', 'beast mounts', 'local transfer arrays', 'regional arrays', 'ancient arrays', 'cross-realm arrays'] },
  { id: 15, name: 'Cultivation-gated natural barriers', rationale: 'Poison fog, storms, lava, frozen wastes — progression unlocks geography, not invisible walls.', required: ['poison fog', 'spiritual storms', 'lava belts', 'frozen wastes', 'ocean trenches', 'monster territories', 'radiant deserts', 'spatial turbulence', 'dead qi regions', 'formation barriers'] },
  { id: 16, name: 'Cultivation oceans', rationale: 'Coasts, archipelagos, sea monsters, pirate cultivators, underwater ruins, floating markets.', required: ['coastal civilizations', 'archipelagos', 'remote islands', 'underwater caves', 'underwater spirit veins', 'ocean trenches', 'sea monsters', 'pirate cultivators', 'underwater ruins', 'floating markets', 'submerged inheritances'] },
  { id: 17, name: 'Wilderness hierarchy', rationale: 'Ordinary → deep → cultivator → ancient → forbidden → death zone; danger and reward rise inward.', required: ['ordinary wilderness', 'deep wilderness', 'cultivator wilderness', 'ancient wilderness', 'forbidden wilderness', 'death zone'] },
  { id: 18, name: 'Full beast hierarchy', rationale: 'Wildlife → spirit beasts → demonic → ancient → mutated → guardian, plus domesticated mounts and war beasts.', required: ['ordinary wildlife', 'spirit beasts', 'demonic beasts', 'ancient beasts', 'bloodline beasts', 'swarm creatures', 'aquatic beasts', 'flying beasts', 'underground beasts', 'soul creatures', 'guardian beasts', 'mounts', 'war beasts'] },
  { id: 19, name: 'Cultivators change ecosystems', rationale: 'A powerful being alters local Qi, weather, politics, danger — and vice versa for beasts.', required: ['cultivator ecosystem effects', 'beast-territory civilization avoidance', 'Qi alteration by presence'] },
  { id: 20, name: 'Secret caves and cave abodes', rationale: 'Active, abandoned, sealed, inheritance, prison caves — each answers who dug it and why.', required: ['active cave', 'abandoned cave', 'ancient cave', 'failed breakthrough cave', 'sealed cave', 'hidden laboratory', 'alchemy cave', 'burial cave', 'inheritance cave', 'prison cave', 'beast-occupied cave'] },
  { id: 21, name: 'Closed-door cultivation affects the world', rationale: 'People vanish for decades; the world changes while they are gone.', required: ['seclusion system', 'world changes during seclusion', 'return after long absence'] },
  { id: 22, name: 'Trials and competitive spaces', rationale: 'Sect trials, ranking competitions, secret-realm openings, tournaments — they happen without the player.', required: ['sect trials', 'recruitment trials', 'ranking competitions', 'secret-realm openings', 'inheritance trials', 'combat tournaments', 'alchemy competitions', 'country-level qualification'] },
  { id: 23, name: 'Foreign battlefields / unstable dimensions', rationale: 'Battlefield dimensions, rift zones, spatial debris — geopolitical assets that can collapse.', required: ['battlefield dimensions', 'rift zones', 'ancient war remnants', 'spatial debris fields', 'collapsed realms', 'extradimensional hunting zones'] },
  { id: 24, name: 'Secret realms / pocket worlds', rationale: 'Own sky, geography, laws, time, ecology — with access rules.', required: ['pocket realm', 'sect trial world', 'burial realm', 'ancient battlefield', 'celestial fragment', 'sealed world', 'beast realm', 'inheritance dimension', 'planet-core realm'] },
  { id: 25, name: 'Ancient ruins across eras', rationale: 'An Era Stack: current → dynastic → old sect → ancient cultivator → pre-human → primordial.', required: ['current era ruins', 'dynastic era ruins', 'old sect era ruins', 'ancient cultivator era ruins', 'pre-human ruins', 'primordial remnants'] },
  { id: 26, name: 'Planet-wide history', rationale: 'Formation → geology → first life → cultures → ancient cultivators → disaster → migration → sects → wars → now.', required: ['formation', 'first life', 'ancient cultivators', 'great disaster', 'migration', 'sect age', 'wars', 'current order'] },
  { id: 27, name: 'Cultivation catastrophes as geography', rationale: 'Failed breakthroughs, tribulation strikes, artifact detonations, beast tides, spatial collapse shape terrain.', required: ['failed breakthrough scars', 'tribulation strikes', 'artifact detonation sites', 'beast tide aftermath', 'formation collapse sites', 'spirit-vein rupture scars', 'spatial collapse zones'] },
  { id: 28, name: 'Heavenly/environmental phenomena', rationale: 'Qi tides, spirit rain, treasure births, ghost tides — they affect NPC decisions.', required: ['tribulation clouds', 'qi tides', 'spirit rain', 'celestial alignments', 'meteor showers', 'auroras', 'spatial distortions', 'treasure-birth phenomena', 'ghost tides', 'beast migrations'] },
  { id: 29, name: 'Cultivation tribulations as world events', rationale: 'Breakthroughs change weather, terrain, spectators, factions; others notice from far away.', required: ['tribulation effects on weather', 'tribulation terrain damage', 'spectators', 'nearby faction response', 'long-distance notice'] },
  { id: 30, name: 'Death, souls, corpses', rationale: 'Living, dead, soul, Nascent Soul, possessed, ghost, refined corpse, reincarnating — death is not binary.', required: ['souls', 'nascent soul', 'ghosts', 'refined corpses', 'soul fragments', 'soul treasures', 'reincarnation', 'possession'] },
  { id: 31, name: 'Information as a resource', rationale: 'Jade slips, maps, rumors, archives — and information is incomplete by design.', required: ['jade slips', 'maps', 'rumors', 'sect archives', 'manuals', 'divine-sense messages', 'messenger talismans', 'ancient inscriptions', 'spies', 'incomplete maps'] },
  { id: 32, name: 'Knowledge stratification', rationale: 'Mortals do not know what high cultivators know; Qi Condensation disciples lack ancient secrets.', required: ['knowledge tiers', 'mortal ignorance of cultivation politics', 'hidden ancient knowledge'] },
  { id: 33, name: 'Technique provenance', rationale: 'Every technique belongs somewhere: sect, family, dead cultivator, stolen manual, incomplete inheritance.', required: ['sect techniques', 'family techniques', 'dead cultivator inheritances', 'stolen manuals', 'incomplete inheritances', 'bloodline techniques'] },
  { id: 34, name: 'Technique schools and philosophies', rationale: 'Sword, body, soul, formation, alchemy, poison, corpse, beast, blood, demonic, karma paths.', required: ['sword cultivation', 'body cultivation', 'soul cultivation', 'formation cultivation', 'alchemy', 'illusion', 'poison', 'corpse refinement', 'beast taming', 'demonic paths'] },
  { id: 35, name: 'Social xianxia infrastructure', rationale: 'Master-disciple, senior-junior, dao companion, retainer, debt, oath, inheritance successor.', required: ['master-disciple', 'senior-junior', 'sect siblings', 'ancestor-descendant', 'guest elder', 'dao companion', 'retainer', 'blood feud', 'favor', 'debt', 'oath', 'inheritance successor'] },
  { id: 36, name: 'Face, reputation, backing', rationale: 'The weak youth may be untouchable because everyone fears his ancestor.', required: ['apparent cultivation', 'suspected cultivation', 'sect backing', 'master backing', 'clan backing', 'known allies', 'reputation', 'hidden backing'] },
  { id: 37, name: 'Planetary law and cultivation ceiling', rationale: 'Qi capacity, ceiling, law strength, Dao clarity, spatial stability, tribulation behavior distinguish worlds.', required: ['qi capacity', 'cultivation ceiling', 'world-law strength', 'dao clarity', 'spatial stability', 'tribulation behavior', 'resource regeneration'] },
  { id: 38, name: 'Planetary core systems', rationale: 'Planetary Spirit, World Core, Prime Spirit Vein, Law Nexus — governs life support, Qi, barriers, fate.', required: ['planetary spirit', 'world core', 'prime spirit vein', 'law nexus', 'ancient formation core'] },
  { id: 39, name: 'Hidden planetary truths', rationale: 'What the planet really is, who created it, what is sealed underneath — 99.999% does not know.', required: ['hidden creation truth', 'sealed entity', 'forbidden region reason', 'ancient catastrophe truth'] },
  { id: 40, name: 'The sky is inhabited', rationale: 'Flying cultivators, beasts, ships, formations, high-altitude ecosystems — then moons, debris, stars.', required: ['flying cultivators', 'flying beasts', 'airships', 'high-altitude ecosystems', 'sky storms', 'messenger lights', 'floating structures'] },
  { id: 41, name: 'The underworld exists', rationale: 'Shallow caves → deep mines → underground rivers → caverns → buried cities → planetary depths.', required: ['shallow caves', 'deep mines', 'underground rivers', 'massive caverns', 'buried cities', 'underground ecosystems', 'spirit veins', 'magma regions', 'ancient tombs', 'sealed structures'] },
  { id: 42, name: 'Disaster-driven migration', rationale: 'Beast tides, wars, qi drought → migration, refugees, fortified settlements, abandoned sects.', required: ['ecological pressure migration', 'war refugees', 'beast tide fortifications', 'qi drought sect abandonment'] },
  { id: 43, name: 'Time-gated natural phenomena', rationale: 'Fog opens every N years, secret realms under alignment, ancient arrays irregularly — temporal geography.', required: ['periodic fog', 'alignment-gated realms', 'century-fruiting herbs', 'seasonal beast migrations', 'periodic spirit tides', 'irregular ancient arrays'] },
  { id: 44, name: 'Cultivation archaeology', rationale: 'Players reconstruct broken formations, ruined sects, ancient corpses, forgotten techniques.', required: ['broken formations to study', 'ruined sects to excavate', 'ancient corpses', 'forgotten techniques', 'old battle scars', 'abandoned cave abodes', 'jade records', 'buried artifacts'] },
  { id: 45, name: 'The world needs unimportant things', rationale: 'Not every cave has treasure; not every stranger has a quest. Ordinariness makes discovery believable.', required: ['ordinary caves', 'genuine farmer lives', 'unremarkable mountains', 'quiet dead-ends'] },
];

/** The Planet Completeness Gauntlet — ~50 yes/no questions. */
export interface CompletenessQuestion {
  id: string;
  question: string;
  /** The planet field that answers it. */
  field: string;
}

export const COMPLETENESS_GAUNTLET: CompletenessQuestion[] = [
  { id: 'C1', question: 'Does this planet contain mundane civilization?', field: 'mundane' },
  { id: 'C2', question: 'Does cultivation civilization have a hierarchy?', field: 'cultivationHierarchy' },
  { id: 'C3', question: 'Are there regions outside effective government?', field: 'unregulatedRegions' },
  { id: 'C4', question: 'Are there multiple economic layers?', field: 'economicLayers' },
  { id: 'C5', question: 'Do cultivators have resource production chains?', field: 'cultivatorChains' },
  { id: 'C6', question: 'Do mortals have food production chains?', field: 'mortalChains' },
  { id: 'C7', question: 'Are cultivation resources geographically causal?', field: 'resourceGeography' },
  { id: 'C8', question: 'Do sects have internal institutions?', field: 'sectInstitutions' },
  { id: 'C9', question: 'Are there cultivator clans separate from sects?', field: 'clans' },
  { id: 'C10', question: 'Are wandering cultivators represented?', field: 'wanderers' },
  { id: 'C11', question: 'Are there cultivation cities?', field: 'cultivationCities' },
  { id: 'C12', question: 'Are there wilderness cultivation settlements?', field: 'wildernessSettlements' },
  { id: 'C13', question: 'Do dangerous natural regions exist?', field: 'dangerousRegions' },
  { id: 'C14', question: 'Are there barriers requiring higher cultivation?', field: 'cultivationBarriers' },
  { id: 'C15', question: 'Are oceans inhabited?', field: 'oceanLife' },
  { id: 'C16', question: 'Is underground space inhabited?', field: 'undergroundLife' },
  { id: 'C17', question: 'Is the sky inhabited?', field: 'skyLife' },
  { id: 'C18', question: 'Are there secret realms?', field: 'secretRealms' },
  { id: 'C19', question: 'Are there unstable spaces?', field: 'unstableSpaces' },
  { id: 'C20', question: 'Are there ancient transfer networks?', field: 'transferNetworks' },
  { id: 'C21', question: 'Are there ruins from several historical eras?', field: 'multiEraRuins' },
  { id: 'C22', question: 'Are there forgotten cave abodes?', field: 'forgottenCaves' },
  { id: 'C23', question: 'Are there planetary mysteries?', field: 'planetaryMysteries' },
  { id: 'C24', question: 'Are there ancient civilizations?', field: 'ancientCivilizations' },
  { id: 'C25', question: 'Are there ongoing political struggles?', field: 'politicalStruggles' },
  { id: 'C26', question: 'Are there cultivation-country hierarchies?', field: 'countryHierarchy' },
  { id: 'C27', question: 'Are there resource wars?', field: 'resourceWars' },
  { id: 'C28', question: 'Are sects capable of rising/falling?', field: 'sectDynamics' },
  { id: 'C29', question: 'Can cultivation countries rise/fall in rank?', field: 'countryDynamics' },
  { id: 'C30', question: 'Can resources become depleted?', field: 'resourceDepletion' },
  { id: 'C31', question: 'Can wars cause migrations?', field: 'warMigration' },
  { id: 'C32', question: 'Can catastrophes reshape geography?', field: 'catastropheGeography' },
  { id: 'C33', question: 'Can cultivators permanently scar terrain?', field: 'cultivatorScars' },
  { id: 'C34', question: 'Can beasts reshape ecology?', field: 'beastEcology' },
  { id: 'C35', question: 'Can mortal civilization exist independently of the player?', field: 'mortalIndependence' },
  { id: 'C36', question: 'Do high-level beings exist who don\'t care about the player?', field: 'indifferentBeings' },
  { id: 'C37', question: 'Do hidden old monsters enter/leave seclusion?', field: 'monsterSeclusion' },
  { id: 'C38', question: 'Are there treasures nobody currently knows about?', field: 'unknownTreasures' },
  { id: 'C39', question: 'Are there known treasures everyone wants?', field: 'knownTreasures' },
  { id: 'C40', question: 'Are there false rumors about treasures that do not exist?', field: 'falseRumors' },
  { id: 'C41', question: 'Does information have provenance?', field: 'infoProvenance' },
  { id: 'C42', question: 'Does every major artifact have provenance?', field: 'artifactProvenance' },
  { id: 'C43', question: 'Does every major ruin have provenance?', field: 'ruinProvenance' },
  { id: 'C44', question: 'Does every major beast have an ecosystem?', field: 'beastEcosystems' },
  { id: 'C45', question: 'Does every major sect have an economic foundation?', field: 'sectEconomics' },
  { id: 'C46', question: 'Does every city have a reason for its location?', field: 'cityReasons' },
  { id: 'C47', question: 'Does every major road/transfer route have a reason?', field: 'routeReasons' },
  { id: 'C48', question: 'Does spatial hierarchy affect culture?', field: 'spatialCulture' },
  { id: 'C49', question: 'Does spiritual geography affect political geography?', field: 'spiritualPolitics' },
  { id: 'C50', question: 'Does cultivation level affect accessible geography?', field: 'cultivationGeography' },
  { id: 'C51', question: 'Does time affect accessible geography?', field: 'timeGeography' },
  { id: 'C52', question: 'Does the planet possess secrets beyond its inhabitants\' current cultivation level?', field: 'hiddenDepth' },
];

export interface PlanetModel {
  /** Which constitution categories are present (by id). */
  categories: Set<number>;
  /** Completeness answers: field → present (boolean or reason). */
  answers: Record<string, boolean | string>;
}

export interface ConstitutionReport {
  presentCategories: PlanetCategory[];
  missingCategories: PlanetCategory[];
  coverage: number;
  failedQuestions: CompletenessQuestion[];
  passedQuestions: number;
  /** A category is missing but has a stated reason (justified absence). */
  justifiedAbsences: string[];
  complete: boolean;
}

export class PlanetConstitutionChecker {
  check(planet: PlanetModel): ConstitutionReport {
    const presentCategories = PLANET_CONSTITUTION.filter((c) => planet.categories.has(c.id));
    const missingCategories = PLANET_CONSTITUTION.filter((c) => !planet.categories.has(c.id));
    const coverage = presentCategories.length / PLANET_CONSTITUTION.length;
    const failedQuestions = COMPLETENESS_GAUNTLET.filter((q) => {
      const a = planet.answers[q.field];
      return a === undefined || a === false;
    });
    const justifiedAbsences = missingCategories
      .filter((c) => typeof planet.answers[`absence:${c.id}`] === 'string')
      .map((c) => `${c.name}: ${planet.answers[`absence:${c.id}`]}`);
    return {
      presentCategories,
      missingCategories,
      coverage,
      failedQuestions,
      passedQuestions: COMPLETENESS_GAUNTLET.length - failedQuestions.length,
      justifiedAbsences,
      complete: coverage >= 0.9 && failedQuestions.length === 0,
    };
  }
}

/* ================= conformance ================= */

let passed = 0;
let failed = 0;
function assert(cond: boolean, msg: string) {
  if (cond) { passed++; console.log(`  ✅ ${msg}`); }
  else { failed++; console.error(`  ❌ ${msg}`); }
}

function run() {
  console.log('=== Planet Constitution Conformance ===\n');

  assert(PLANET_CONSTITUTION.length === 45, '45 constitutional categories');
  assert(COMPLETENESS_GAUNTLET.length >= 50, `completeness gauntlet has ${COMPLETENESS_GAUNTLET.length} questions`);
  const ids = new Set(PLANET_CONSTITUTION.map((c) => c.id));
  assert(ids.size === 45, 'category ids unique');

  const checker = new PlanetConstitutionChecker();

  // a full planet passes
  const full: PlanetModel = {
    categories: new Set(PLANET_CONSTITUTION.map((c) => c.id)),
    answers: Object.fromEntries(COMPLETENESS_GAUNTLET.map((q) => [q.field, true])),
  };
  const fullReport = checker.check(full);
  assert(fullReport.complete, 'complete planet passes');
  assert(fullReport.coverage === 1, 'coverage 100%');
  assert(fullReport.failedQuestions.length === 0, 'all completeness questions pass');

  // an incomplete planet fails with a diagnosis
  const partial: PlanetModel = {
    categories: new Set([1, 2, 9, 10, 15]),
    answers: { mundane: true, cultivationHierarchy: true },
  };
  const partialReport = checker.check(partial);
  assert(!partialReport.complete, 'partial planet not complete');
  assert(partialReport.missingCategories.length === 40, '40 missing categories diagnosed');
  assert(partialReport.failedQuestions.length > 40, 'dozens of completeness questions fail');
  assert(partialReport.missingCategories.some((c) => c.id === 38), 'planetary core identified as missing');

  // justified absence
  const justified: PlanetModel = {
    categories: new Set(PLANET_CONSTITUTION.map((c) => c.id).filter((id) => id !== 23)),
    answers: { ...Object.fromEntries(COMPLETENESS_GAUNTLET.map((q) => [q.field, true])), 'absence:23': 'this starting planet has no foreign battlefields yet; they appear post-realm-gate' },
  };
  const jReport = checker.check(justified);
  assert(jReport.justifiedAbsences.length === 1, 'justified absence recorded');
  assert(jReport.complete, 'justified absence keeps planet complete');

  console.log(`\n=== Results: ${passed}/${passed + failed} passed ===`);
  process.exit(failed > 0 ? 1 : 0);
}

if (import.meta.main) run();
