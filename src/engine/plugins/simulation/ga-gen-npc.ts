/**
 * ga:gen-npc — NPC Generator
 *
 * Implements doc 23 §1.1 stage 8 and consumes lore docs 04, 12, 34.
 * Generates named NPCs for Wang Family Bend from a seed, deterministically.
 * Two runs from the same seed produce the same NPC roster.
 *
 * Produces: named NPC roster with traits (doc 26 GoalState), kinship
 * relations, qi-state, household membership, schedule, personality,
 * and tension ties from doc 34.
 *
 * Pure functions over typed state. No forbidden functions.
 * Uses LCG RNG (same approach as ga:gen-settlement) for all stochastic choices.
 */

import type { Plugin, PluginHost } from '../kernel/plugin-host';
import type { EntityId } from '../../kernel/types';

// ============================================================================
// Types
// ============================================================================

export type Sex = 'male' | 'female';

export type LifeStage = 'infant' | 'child' | 'youth' | 'adult' | 'elder' | 'ancient';

export type WealthTier = 'rich' | 'comfortable' | 'poor' | 'destitute';

export type NpcRole =
  | 'lineage_head' | 'elder' | 'teacher' | 'tenant_farmer' | 'yeoman_farmer'
  | 'salt_merchant' | 'carpenter' | 'midwife' | 'ferryman' | 'charcoal_burner'
  | 'soldier' | 'weaver' | 'tofu_maker' | 'butcher' | 'gravedigger'
  | 'day_laborer' | 'apprentice' | 'student' | 'fisherman'
  | 'wife' | 'daughter' | 'son' | 'widow' | 'bachelor'
  | 'child_dependent' | 'elder_dependent';

export type QiState = 'none' | 'latent' | 'induction' | 'condensation'
  | 'foundation' | 'core_formation' | 'nascent_soul' | 'higher';

export type KinshipRole =
  | 'head' | 'wife' | 'son' | 'daughter' | 'father' | 'mother'
  | 'brother' | 'sister' | 'cousin' | 'nephew' | 'niece'
  | 'uncle' | 'aunt' | 'grandfather' | 'grandmother'
  | 'grandson' | 'granddaughter' | 'husband_deceased'
  | 'son_deceased' | 'daughter_deceased' | 'parent_deceased';

export interface NpcTraits {
  desires: number;
  fears: number;
  loyalties: number;
  grudges: number;
  ambitions: number;
  riskTolerance: number;
  generosity: number;
  greed: number;
  jealousy: number;
  pride: number;
  patience: number;
  deception: number;
  gratitude: number;
  curiosity: number;
  conformity: number;
}

export interface KinshipEdge {
  targetNpcId: EntityId;
  role: KinshipRole;
  targetRole: KinshipRole;  // reciprocal role
}

export interface RelationshipEdge {
  targetNpcId: EntityId;
  label: string;          // e.g. 'neighbor', 'trade_partner', 'rival'
  weight: number;         // [-1, +1] positive = warm, negative = cold
}

export interface GeneratedNpc {
  entityId: EntityId;
  name: string;
  nameHanzi: string;
  surname: string;
  surnameHanzi: string;
  givenName: string;
  givenNameHanzi: string;
  age: number;
  sex: Sex;
  lifeStage: LifeStage;
  role: NpcRole;
  householdIndex: number;  // index into generated household list, or -1
  isWang: boolean;
  isNamed: boolean;        // true = from lore doc 34, false = procedurally generated
  wealthTier: WealthTier;
  qiState: QiState;
  traits: NpcTraits;
  skills: string[];
  kinship: KinshipEdge[];
  relationships: RelationshipEdge[];
  personalitySummary: string;
  tensionTies: string[];   // references to tension IDs from doc 28
  metadata: Record<string, unknown>;
}

export interface NpcGenParams {
  seed: string;
  totalPopulation?: number;    // default 180
  namedOnly?: boolean;          // if true, only generate the 15+ named households
  householdCount?: number;      // default 31 (must match settlement)
}

export interface NpcRoster {
  seed: string;
  tick: number;
  totalGenerated: number;
  namedCount: number;
  proceduralCount: number;
  npcs: GeneratedNpc[];
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

function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}

// ============================================================================
// Life stage from age
// ============================================================================

function lifeStageFromAge(age: number): LifeStage {
  if (age < 2) return 'infant';
  if (age < 7) return 'child';
  if (age < 18) return 'youth';
  if (age < 50) return 'adult';
  if (age < 70) return 'elder';
  return 'ancient';
}

// ============================================================================
// Trait generation from role + RNG
// ============================================================================

const ROLE_TRAIT_PRESETS: Partial<Record<NpcRole, Partial<NpcTraits>>> = {
  lineage_head:    { loyalties: 0.7, pride: 0.5, patience: 0.6, conformity: 0.6, ambitions: 0.2 },
  elder:           { loyalties: 0.6, pride: 0.4, patience: 0.7, conformity: 0.5 },
  teacher:         { curiosity: 0.5, patience: 0.4, deception: -0.2, pride: 0.3 },
  tenant_farmer:   { fears: 0.4, patience: 0.3, conformity: 0.3, greed: -0.1 },
  yeoman_farmer:   { pride: 0.4, patience: 0.4, generosity: 0.1, conformity: 0.2 },
  salt_merchant:   { greed: 0.6, ambitions: 0.4, deception: 0.3, riskTolerance: 0.2 },
  carpenter:       { generosity: 0.2, patience: 0.3, pride: 0.3, curiosity: 0.1 },
  midwife:         { generosity: 0.3, fears: -0.3, patience: 0.5, curiosity: 0.2 },
  ferryman:        { curiosity: 0.5, deception: 0.2, generosity: 0.1, riskTolerance: 0.1 },
  charcoal_burner: { fears: 0.5, patience: 0.4, conformity: -0.1, loyalties: 0.2 },
  soldier:         { fears: -0.2, loyalties: 0.5, patience: 0.3, riskTolerance: -0.1 },
  weaver:          { patience: 0.5, generosity: 0.2, conformity: 0.3, fears: 0.2 },
  tofu_maker:      { pride: 0.3, generosity: 0.4, ambitions: -0.1, deception: 0.1 },
  butcher:         { greed: 0.2, riskTolerance: 0.1, pride: 0.2, generosity: -0.1 },
  gravedigger:     { patience: 0.6, fears: 0.3, generosity: 0.3, ambitions: -0.3 },
  day_laborer:     { fears: 0.3, ambitions: 0.1, patience: -0.1, conformity: 0.1 },
  apprentice:      { curiosity: 0.4, ambitions: 0.3, patience: -0.2, desires: 0.3 },
  student:         { curiosity: 0.5, ambitions: 0.3, patience: 0.1, conformity: 0.2 },
  fisherman:       { riskTolerance: 0.2, patience: 0.4, curiosity: 0.2, pride: 0.1 },
};

function generateTraits(rng: () => bigint, role: NpcRole): NpcTraits {
  const preset = ROLE_TRAIT_PRESETS[role] ?? {};
  const keys = ['desires','fears','loyalties','grudges','ambitions','riskTolerance',
    'generosity','greed','jealousy','pride','patience','deception','gratitude',
    'curiosity','conformity'] as const;
  const traits = {} as NpcTraits;
  for (const k of keys) {
    const base = (preset as Record<string,number>)[k] ?? 0;
    traits[k] = clamp(base + rngFloat(rng, -0.3, 0.3), -1.0, 1.0);
  }
  return traits;
}

// ============================================================================
// Named NPC templates from doc 04 + doc 34
// ============================================================================

interface NamedNpcTemplate {
  name: string;
  nameHanzi: string;
  surname: string;
  surnameHanzi: string;
  givenName: string;
  givenNameHanzi: string;
  age: number;
  sex: Sex;
  role: NpcRole;
  householdIndex: number;
  isWang: boolean;
  qiState: QiState;
  wealthTier: WealthTier;
  skills: string[];
  personalitySummary: string;
  tensionTies: string[];
}

const NAMED_NPCS: NamedNpcTemplate[] = [
  // ---- Household 1: Wang Senior Household ----
  { name:'Wang Shouzheng', nameHanzi:'王守正', surname:'Wang', surnameHanzi:'王',
    givenName:'Shouzheng', givenNameHanzi:'守正', age:58, sex:'male',
    role:'lineage_head', householdIndex:0, isWang:true, qiState:'none',
    wealthTier:'comfortable', skills:['leadership','dispute_resolution','ritual'],
    personalitySummary:'Authoritative, cautious, burdened by duty. De facto village leader.',
    tensionTies:['salt_license','missing_son','betrothal'] },
  { name:'Lady Chen', nameHanzi:'陳氏', surname:'Chen', surnameHanzi:'陳',
    givenName:'Lady Chen', givenNameHanzi:'陳氏', age:54, sex:'female',
    role:'wife', householdIndex:0, isWang:false, qiState:'none',
    wealthTier:'comfortable', skills:['weaving','household_management','herbal_medicine'],
    personalitySummary:'Practical, warm, silently grieving Wang Xiaodi. Calls Zhou Popo "older sister".',
    tensionTies:['missing_son','betrothal'] },
  { name:'Wang Zongxian', nameHanzi:'王宗顯', surname:'Wang', surnameHanzi:'王',
    givenName:'Zongxian', givenNameHanzi:'宗顯', age:32, sex:'male',
    role:'yeoman_farmer', householdIndex:0, isWang:true, qiState:'none',
    wealthTier:'comfortable', skills:['farming','plowing','leadership'],
    personalitySummary:'Reliable eldest son, married with 2 children. Heir to the Senior Household.',
    tensionTies:[] },
  { name:'Wang Zongwen', nameHanzi:'王宗文', surname:'Wang', surnameHanzi:'王',
    givenName:'Zongwen', givenNameHanzi:'宗文', age:27, sex:'male',
    role:'teacher', householdIndex:0, isWang:true, qiState:'none',
    wealthTier:'comfortable', skills:['literacy','herbal_medicine','divination','teaching'],
    personalitySummary:'Failed county exam candidate (3 attempts). Melancholic, precise, secretly writes a history of the Cangli Riverlands.',
    tensionTies:['salt_license','betrothal'] },
  { name:'Wang Sanniang', nameHanzi:'王三娘', surname:'Wang', surnameHanzi:'王',
    givenName:'Sanniang', givenNameHanzi:'三娘', age:22, sex:'female',
    role:'daughter', householdIndex:0, isWang:true, qiState:'none',
    wealthTier:'comfortable', skills:['weaving','cooking'],
    personalitySummary:'Betrothed to a Li family in the next village. Reluctant. Seeks Zhou Popo\'s women\'s medicine to delay marriage.',
    tensionTies:['betrothal'] },

  // ---- Household 2: Wang Tenant Household ----
  { name:'Wang Shouye', nameHanzi:'王守業', surname:'Wang', surnameHanzi:'王',
    givenName:'Shouye', givenNameHanzi:'守業', age:52, sex:'male',
    role:'tenant_farmer', householdIndex:1, isWang:true, qiState:'none',
    wealthTier:'poor', skills:['farming','plowing','fishing'],
    personalitySummary:'Shouzheng\'s cousin. Tenant farmer on 8 mu. One bad harvest from crisis.',
    tensionTies:['missing_son'] },
  { name:'Lady Zhao', nameHanzi:'趙氏', surname:'Zhao', surnameHanzi:'趙',
    givenName:'Lady Zhao', givenNameHanzi:'趙氏', age:49, sex:'female',
    role:'wife', householdIndex:1, isWang:false, qiState:'none',
    wealthTier:'poor', skills:['weaving','cooking','childcare'],
    personalitySummary:'Hard-working, anxious. Manages a subsistence-deficit household.',
    tensionTies:[] },
  { name:'Wang Zongwu', nameHanzi:'王宗武', surname:'Wang', surnameHanzi:'王',
    givenName:'Zongwu', givenNameHanzi:'宗武', age:28, sex:'male',
    role:'yeoman_farmer', householdIndex:1, isWang:true, qiState:'none',
    wealthTier:'poor', skills:['farming','martial_arts'],
    personalitySummary:'Married, 3 children (2 surviving). Strong, reliable laborer.',
    tensionTies:[] },
  { name:'Wang Zongde', nameHanzi:'王宗德', surname:'Wang', surnameHanzi:'王',
    givenName:'Zongde', givenNameHanzi:'宗德', age:24, sex:'male',
    role:'bachelor', householdIndex:1, isWang:true, qiState:'none',
    wealthTier:'poor', skills:['farming','hunting'],
    personalitySummary:'Unmarried "bare stick." A rival for land and women. Doc 06 Scene 3 tension source.',
    tensionTies:['betrothal'] },

  // ---- Household 3: Salt Merchant ----
  { name:'Master Hu', nameHanzi:'胡老爺', surname:'Hu', surnameHanzi:'胡',
    givenName:'Master Hu', givenNameHanzi:'胡老爺', age:47, sex:'male',
    role:'salt_merchant', householdIndex:2, isWang:false, qiState:'none',
    wealthTier:'rich', skills:['trade','arithmetic','negotiation','boat_handling'],
    personalitySummary:'Wealthiest man in the village. Holds the salt license. Treated with care because he controls salt and river trade.',
    tensionTies:['salt_license'] },
  { name:'Lady Wang', nameHanzi:'王氏', surname:'Wang', surnameHanzi:'王',
    givenName:'Lady Wang', givenNameHanzi:'王氏', age:43, sex:'female',
    role:'wife', householdIndex:2, isWang:true, qiState:'none',
    wealthTier:'rich', skills:['weaving','household_management'],
    personalitySummary:'Shouzheng\'s younger sister, exiled from his threshold for 20 years by marriage.',
    tensionTies:['salt_license'] },
  { name:'Hu Bao', nameHanzi:'胡寶', surname:'Hu', surnameHanzi:'胡',
    givenName:'Bao', givenNameHanzi:'寶', age:18, sex:'male',
    role:'apprentice', householdIndex:2, isWang:false, qiState:'none',
    wealthTier:'rich', skills:['trade','boat_handling','arithmetic'],
    personalitySummary:'Apprentice to his father. Learning the salt trade.',
    tensionTies:[] },
  { name:'Hu Ying', nameHanzi:'胡瑩', surname:'Hu', surnameHanzi:'胡',
    givenName:'Ying', givenNameHanzi:'瑩', age:15, sex:'female',
    role:'daughter', householdIndex:2, isWang:false, qiState:'none',
    wealthTier:'rich', skills:['weaving','literacy'],
    personalitySummary:'Betrothed to a county clerk\'s son.',
    tensionTies:[] },

  // ---- Household 4: Lin Household ----
  { name:'Lin Aqiao', nameHanzi:'林阿巧', surname:'Lin', surnameHanzi:'林',
    givenName:'Aqiao', givenNameHanzi:'阿巧', age:38, sex:'male',
    role:'carpenter', householdIndex:3, isWang:false, qiState:'none',
    wealthTier:'comfortable', skills:['carpentry','boat_building','coffin_making','repair'],
    personalitySummary:'Village carpenter. Builds houses, boats, mill machinery, coffins. Paid in grain, cash, or labor-exchange.',
    tensionTies:[] },
  { name:'Lady Wang (Lin)', nameHanzi:'王氏', surname:'Wang', surnameHanzi:'王',
    givenName:'Lady Wang', givenNameHanzi:'王氏', age:35, sex:'female',
    role:'wife', householdIndex:3, isWang:true, qiState:'none',
    wealthTier:'comfortable', skills:['weaving','childcare'],
    personalitySummary:'Shouzheng\'s niece. Married out to the carpenter. Helps with weaving.',
    tensionTies:[] },
  { name:'Lin Gensheng', nameHanzi:'林根生', surname:'Lin', surnameHanzi:'林',
    givenName:'Gensheng', givenNameHanzi:'根生', age:16, sex:'male',
    role:'apprentice', householdIndex:3, isWang:false, qiState:'none',
    wealthTier:'comfortable', skills:['carpentry'],
    personalitySummary:'Apprentice to his father the carpenter.',
    tensionTies:[] },
  { name:'Lin Xiaomei', nameHanzi:'林小妹', surname:'Lin', surnameHanzi:'林',
    givenName:'Xiaomei', givenNameHanzi:'小妹', age:12, sex:'female',
    role:'child_dependent', householdIndex:3, isWang:false, qiState:'none',
    wealthTier:'comfortable', skills:['weaving'],
    personalitySummary:'Helps her mother with weaving.',
    tensionTies:[] },

  // ---- Household 5: Widow's Household ----
  { name:'Widow Xu', nameHanzi:'許寡婦', surname:'Xu', surnameHanzi:'許',
    givenName:'Widow Xu', givenNameHanzi:'許寡婦', age:61, sex:'female',
    role:'widow', householdIndex:4, isWang:false, qiState:'none',
    wealthTier:'destitute', skills:['weaving','gardening','devotion'],
    personalitySummary:'Non-Wang widow. Survives by weaving, dryland garden, and lineage charity. Devout Buddhist. Grieves Xu Erniu.',
    tensionTies:['missing_son'] },
  { name:'Xu Erniu', nameHanzi:'許二牛', surname:'Xu', surnameHanzi:'許',
    givenName:'Erniu', givenNameHanzi:'二牛', age:19, sex:'male',
    role:'day_laborer', householdIndex:4, isWang:false, qiState:'none',
    wealthTier:'destitute', skills:['farming','labor'],
    personalitySummary:'Widow Xu\'s only surviving child. Missing as of doc 28. Day laborer for wealthier Wang households.',
    tensionTies:['missing_son'] },

  // ---- Household 6: Zhou Household ----
  { name:'Zhou Wenshu', nameHanzi:'周文淑', surname:'Zhou', surnameHanzi:'周',
    givenName:'Wenshu', givenNameHanzi:'文淑', age:66, sex:'female',
    role:'midwife', householdIndex:5, isWang:false, qiState:'none',
    wealthTier:'comfortable', skills:['midwifery','herbal_medicine','storytelling'],
    personalitySummary:'Sharp-tongued, warm-hearted, unsentimental. Keeps a silk bag of 40 years of dried umbilical cords. Birthed most of the village.',
    tensionTies:['missing_son','betrothal'] },

  // ---- Household 7: He Household ----
  { name:'He Laosan', nameHanzi:'何老三', surname:'He', surnameHanzi:'何',
    givenName:'Laosan', givenNameHanzi:'老三', age:45, sex:'male',
    role:'ferryman', householdIndex:6, isWang:false, qiState:'none',
    wealthTier:'comfortable', skills:['boat_handling','ferrying','swimming'],
    personalitySummary:'Garrulous, canny, quietly observant. Missing little finger (otter bite). Faded river-map tattoo on left forearm.',
    tensionTies:['salt_license','missing_son'] },
  { name:'Lady Ma', nameHanzi:'馬氏', surname:'Ma', surnameHanzi:'馬',
    givenName:'Lady Ma', givenNameHanzi:'馬氏', age:42, sex:'female',
    role:'wife', householdIndex:6, isWang:false, qiState:'none',
    wealthTier:'comfortable', skills:['weaving','cooking'],
    personalitySummary:'Ferryman\'s wife. Manages the dockside household.',
    tensionTies:[] },
  { name:'He Yatou', nameHanzi:'何丫頭', surname:'He', surnameHanzi:'何',
    givenName:'Yatou', givenNameHanzi:'丫頭', age:17, sex:'female',
    role:'daughter', householdIndex:6, isWang:false, qiState:'none',
    wealthTier:'comfortable', skills:['boat_handling','fishing'],
    personalitySummary:'Works her father\'s boat. Knows the river.',
    tensionTies:[] },
  { name:'He Xiaobao', nameHanzi:'何小寶', surname:'He', surnameHanzi:'何',
    givenName:'Xiaobao', givenNameHanzi:'小寶', age:14, sex:'male',
    role:'apprentice', householdIndex:6, isWang:false, qiState:'none',
    wealthTier:'comfortable', skills:['boat_handling'],
    personalitySummary:'Apprentice to his father the ferryman.',
    tensionTies:[] },

  // ---- Household 8: Wu Household ----
  { name:'Wu Daniu', nameHanzi:'吳大牛', surname:'Wu', surnameHanzi:'吳',
    givenName:'Daniu', givenNameHanzi:'大牛', age:50, sex:'male',
    role:'charcoal_burner', householdIndex:7, isWang:false, qiState:'none',
    wealthTier:'poor', skills:['charcoal_burning','woodcraft','hunting'],
    personalitySummary:'Taciturn, superstitious, dependable in crisis. Hands permanently black-stained. Deep burn scar from kiln collapse.',
    tensionTies:['missing_son'] },

  // ---- Household 9: Zhao Household ----
  { name:'Zhao Tieniu', nameHanzi:'趙鐵牛', surname:'Zhao', surnameHanzi:'趙',
    givenName:'Tieniu', givenNameHanzi:'鐵牛', age:40, sex:'male',
    role:'soldier', householdIndex:8, isWang:false, qiState:'none',
    wealthTier:'comfortable', skills:['martial_arts','spear','watchmanship','survival'],
    personalitySummary:'Returned soldier. Permanent limp (arrow in knee). Scarred throat. Speaks in hoarse whisper. Only villager who has been beyond the Cangli Riverlands.',
    tensionTies:['salt_license','betrothal'] },

  // ---- Household 10: Li Household ----
  { name:'Li Asheng', nameHanzi:'李阿勝', surname:'Li', surnameHanzi:'李',
    givenName:'Asheng', givenNameHanzi:'阿勝', age:55, sex:'male',
    role:'yeoman_farmer', householdIndex:9, isWang:false, qiState:'none',
    wealthTier:'comfortable', skills:['farming','literacy','leadership'],
    personalitySummary:'Non-Wang yeoman. Second-largest landholder (15 mu). Only householder who owns printed books. Shouzheng treats him as a peer.',
    tensionTies:['salt_license','betrothal'] },

  // ---- Household 11: Wang Second Tenant ----
  { name:'Wang Shoucheng', nameHanzi:'王守誠', surname:'Wang', surnameHanzi:'王',
    givenName:'Shoucheng', givenNameHanzi:'守誠', age:52, sex:'male',
    role:'fisherman', householdIndex:10, isWang:true, qiState:'none',
    wealthTier:'poor', skills:['fishing','farming','river_knowledge'],
    personalitySummary:'Distant cousin of Shouzheng. Village\'s best fisherman. Secretive, river-superstitious, quietly bitter.',
    tensionTies:['missing_son'] },

  // ---- Household 12: Wang Bare-Stick ----
  { name:'Wang Tianfu', nameHanzi:'王天福', surname:'Wang', surnameHanzi:'王',
    givenName:'Tianfu', givenNameHanzi:'天福', age:62, sex:'male',
    role:'day_laborer', householdIndex:11, isWang:true, qiState:'none',
    wealthTier:'destitute', skills:['farming','labor'],
    personalitySummary:'Widower. Shouzheng\'s older half-brother (concubine\'s son). 40-year silent resentment over inheritance.',
    tensionTies:['betrothal'] },
  { name:'Wang Zongbao', nameHanzi:'王宗寶', surname:'Wang', surnameHanzi:'王',
    givenName:'Zongbao', givenNameHanzi:'宗寶', age:28, sex:'male',
    role:'gravedigger', householdIndex:11, isWang:true, qiState:'none',
    wealthTier:'destitute', skills:['digging','burial_rites'],
    personalitySummary:'Village gravedigger for 10 years. Gentle, melancholic. Quietly weeds the unmarked mound of Wang Xiaodi.',
    tensionTies:['missing_son'] },

  // ---- Household 13: Wang School Household ----
  { name:'Wang Lun', nameHanzi:'王倫', surname:'Wang', surnameHanzi:'王',
    givenName:'Lun', givenNameHanzi:'倫', age:41, sex:'male',
    role:'teacher', householdIndex:12, isWang:true, qiState:'none',
    wealthTier:'comfortable', skills:['literacy','divination','teaching','calligraphy','history'],
    personalitySummary:'Lineage school teacher. Failed county exam 3 times. Divines with yarrow stalks. Secretly writes a 200-page history of the Cangli Riverlands.',
    tensionTies:['salt_license','betrothal'] },

  // ---- Household 14: Wang Second Branch (Wang Meili's father) ----
  { name:'Wang Shouli', nameHanzi:'王守禮', surname:'Wang', surnameHanzi:'王',
    givenName:'Shouli', givenNameHanzi:'守禮', age:56, sex:'male',
    role:'elder', householdIndex:13, isWang:true, qiState:'none',
    wealthTier:'comfortable', skills:['farming','leadership','dispute_resolution'],
    personalitySummary:'Shouzheng\'s younger brother. Lineage elder (4th seat). Stubborn, proud, quick to judge. Disowned daughter Wang Meili.',
    tensionTies:['salt_license','betrothal'] },

  // ---- Household 15: Pan Tofu ----
  { name:'Pan Siniang', nameHanzi:'潘四娘', surname:'Pan', surnameHanzi:'潘',
    givenName:'Siniang', givenNameHanzi:'四娘', age:48, sex:'female',
    role:'tofu_maker', householdIndex:14, isWang:false, qiState:'none',
    wealthTier:'comfortable', skills:['tofu_making','trade','soy_processing'],
    personalitySummary:'Only woman who publicly defied the lineage council and won. Quiet advocate for widows and women. Long scar on left forearm.',
    tensionTies:['salt_license','missing_son'] },
];

// ============================================================================
// Procedural NPC name pools
// ============================================================================

const WANG_GIVEN_MALE = [
  'Shouyi','Shouzhi','Shoukang','Tianming','Tianyuan','Zonghua','Zongbao','Zonggui',
  'Zongshan','Zonghe','Zongcheng','Zongyuan','Zongyao','Zongping','Zongzhi',
  'Jianhua','Jianyi','Weiguo','Guoqiang','Fugui','Daming','Xiaoer','Laoda',
];

const WANG_GIVEN_FEMALE = [
  'Sanniang','Simei','Wuniang','Liuniang','Yinniang','Chunnü','Qiuniang','Baozhen',
  'Meihua','Cuihua','Xiulan','Yulan','Guiying','Fengjiao','Xiaolian','A-Xue',
];

const NON_WANG_SURNAMES = ['Li','Zhang','Liu','Chen','Zhao','Xu','Hu','Lin','Yang','Huang','Zhou','Wu','Sun','Zhu','Ma','Pan','He','Luo','Song','Tang'];

const NON_WANG_GIVEN_MALE = [
  'A-Qiao','Erniu','Daniu','Xiaosan','Laoda','Er-Gou','San-Sheng','Si-Ming',
  'Wu-Gui','Liu-Ye','Tieniu','Bao','Ding','Gouzi','Mazi',
];

const NON_WANG_GIVEN_FEMALE = [
  'Xiaomei','Yatou','Sanniu','A-Xiu','Chunhua','Qiuhua','Dongmei',"Xiu'er",
  'Yinniang',"Mei'er",'Liu-Niang','Hehua',"Cui'er",'Xiao-Lan',
];

// ============================================================================
// Procedural NPC generation
// ============================================================================

const PROCEDURAL_ROLES: NpcRole[] = [
  'tenant_farmer','yeoman_farmer','day_laborer','weaver','wife','daughter',
  'son','elder_dependent','child_dependent','apprentice','fisherman',
];

const PROCEDURAL_SKILLS: Record<NpcRole, string[]> = {
  lineage_head: ['leadership','ritual'],
  elder: ['farming','dispute_resolution'],
  teacher: ['literacy','teaching'],
  tenant_farmer: ['farming','plowing','weeding'],
  yeoman_farmer: ['farming','plowing','harvesting'],
  salt_merchant: ['trade','arithmetic'],
  carpenter: ['carpentry','repair'],
  midwife: ['herbal_medicine','midwifery'],
  ferryman: ['boat_handling','swimming'],
  charcoal_burner: ['charcoal_burning','woodcraft'],
  soldier: ['martial_arts','spear'],
  weaver: ['weaving','spinning'],
  tofu_maker: ['tofu_making','trade'],
  butcher: ['butchering','animal_husbandry'],
  gravedigger: ['digging','burial_rites'],
  day_laborer: ['farming','labor'],
  apprentice: ['learning'],
  student: ['literacy','learning'],
  fisherman: ['fishing','net_repair'],
  wife: ['weaving','cooking','childcare'],
  daughter: ['weaving','cooking'],
  son: ['farming','learning'],
  widow: ['weaving','gardening'],
  bachelor: ['farming','labor'],
  child_dependent: ['chores'],
  elder_dependent: ['advice','storytelling'],
};

function generateProceduralNpc(
  rng: () => bigint,
  entityId: EntityId,
  householdIdx: number,
  isWangHousehold: boolean,
  wealthTier: WealthTier,
  positionInHousehold: number,
): GeneratedNpc {
  const isWang = isWangHousehold && rngFloat(rng, 0, 1) < 0.85;
  const surnamePool = isWang
    ? [['Wang','Wang'] as const]
    : NON_WANG_SURNAMES.map(s => [s, s] as const);
  const [surname, surnameHanzi] = rngChoice(rng, surnamePool);

  const sex: Sex = rngChoice(rng, ['male','female']);
  const age = positionInHousehold === 0
    ? rngInt(rng, 30, 65)  // household head
    : rngInt(rng, 0, 75);

  const givenPool = isWang
    ? (sex === 'male' ? WANG_GIVEN_MALE : WANG_GIVEN_FEMALE)
    : (sex === 'male' ? NON_WANG_GIVEN_MALE : NON_WANG_GIVEN_FEMALE);
  const givenName = rngChoice(rng, givenPool);
  const givenNameHanzi = givenName;

  const role = positionInHousehold === 0
    ? (isWang ? rngChoice(rng, ['yeoman_farmer','tenant_farmer'] as NpcRole[]) : rngChoice(rng, PROCEDURAL_ROLES))
    : (age < 18
      ? (sex === 'male' ? 'son' as NpcRole : 'daughter' as NpcRole)
      : age >= 60
        ? (sex === 'male' ? 'elder_dependent' as NpcRole : 'elder_dependent' as NpcRole)
        : rngChoice(rng, ['wife','son','daughter','weaver','day_laborer','apprentice'] as NpcRole[]));

  const name = `${surname} ${givenName}`;
  const nameHanzi = `${surnameHanzi}${givenNameHanzi}`;

  const traits = generateTraits(rng, role);
  const skills = PROCEDURAL_SKILLS[role] ?? ['farming'];

  return {
    entityId,
    name,
    nameHanzi,
    surname,
    surnameHanzi,
    givenName,
    givenNameHanzi,
    age,
    sex,
    lifeStage: lifeStageFromAge(age),
    role,
    householdIndex: householdIdx,
    isWang,
    isNamed: false,
    wealthTier,
    qiState: 'none',
    traits,
    skills: [...skills],
    kinship: [],
    relationships: [],
    personalitySummary: `Procedural ${role} of household ${householdIdx}.`,
    tensionTies: [],
    metadata: {},
  };
}

// ============================================================================
// Kinship wiring for named NPCs
// ============================================================================

function wireNamedKinship(npcs: GeneratedNpc[]): void {
  // Build index by (householdIndex, name)
  const byName = new Map<string, GeneratedNpc>();
  for (const npc of npcs) {
    if (npc.isNamed) byName.set(npc.name, npc);
  }

  function link(a: string, b: string, aRole: KinshipRole, bRole: KinshipRole): void {
    const na = byName.get(a);
    const nb = byName.get(b);
    if (na && nb) {
      na.kinship.push({ targetNpcId: nb.entityId, role: aRole, targetRole: bRole });
      nb.kinship.push({ targetNpcId: na.entityId, role: bRole, targetRole: aRole });
    }
  }

  // Household 1: Wang Senior
  link('Wang Shouzheng','Lady Chen','head','wife');
  link('Wang Shouzheng','Wang Zongxian','father','son');
  link('Wang Shouzheng','Wang Zongwen','father','son');
  link('Wang Shouzheng','Wang Sanniang','father','daughter');
  link('Lady Chen','Wang Zongxian','mother','son');
  link('Lady Chen','Wang Zongwen','mother','son');
  link('Lady Chen','Wang Sanniang','mother','daughter');

  // Household 2: Wang Tenant
  link('Wang Shouye','Lady Zhao','head','wife');
  link('Wang Shouye','Wang Zongwu','father','son');
  link('Wang Shouye','Wang Zongde','father','son');
  link('Lady Zhao','Wang Zongwu','mother','son');
  link('Lady Zhao','Wang Zongde','mother','son');
  link('Wang Zongwu','Wang Zongde','brother','brother');

  // Household 3: Salt Merchant
  link('Master Hu','Lady Wang','head','wife');
  link('Master Hu','Hu Bao','father','son');
  link('Master Hu','Hu Ying','father','daughter');
  link('Lady Wang','Hu Bao','mother','son');
  link('Lady Wang','Hu Ying','mother','daughter');

  // Household 4: Lin
  link('Lin Aqiao','Lady Wang (Lin)','head','wife');
  link('Lin Aqiao','Lin Gensheng','father','son');
  link('Lin Aqiao','Lin Xiaomei','father','daughter');
  link('Lady Wang (Lin)','Lin Gensheng','mother','son');
  link('Lady Wang (Lin)','Lin Xiaomei','mother','daughter');

  // Household 5: Widow
  link('Widow Xu','Xu Erniu','mother','son');

  // Household 7: He
  link('He Laosan','Lady Ma','head','wife');
  link('He Laosan','He Yatou','father','daughter');
  link('He Laosan','He Xiaobao','father','son');
  link('Lady Ma','He Yatou','mother','daughter');
  link('Lady Ma','He Xiaobao','mother','son');

  // Cross-household: Shouzheng siblings
  link('Wang Shouzheng','Lady Wang','brother','sister');     // sister married to Hu
  link('Wang Shouzheng','Wang Shouli','brother','brother');

  // Cross-household: lineage cousins
  link('Wang Shouzheng','Wang Shouye','cousin','cousin');
  link('Wang Shouzheng','Wang Shoucheng','cousin','cousin');
  link('Wang Shouzheng','Wang Lun','cousin','cousin');
  link('Wang Shouzheng','Wang Tianfu','brother','brother');  // half-brother

  // Cross-household: nieces married out
  link('Wang Shouzheng','Lady Wang (Lin)','uncle','niece');
  link('Wang Shouzheng','Zhao Tieniu','uncle','nephew');  // through niece

  // Widow Xu - Zhou Popo bond
  // (not kinship, but a relationship edge — handled below)
}

function wireRelationships(npcs: GeneratedNpc[]): void {
  const byName = new Map<string, GeneratedNpc>();
  for (const npc of npcs) {
    if (npc.isNamed) byName.set(npc.name, npc);
  }

  function rel(a: string, b: string, label: string, wA: number, wB: number): void {
    const na = byName.get(a);
    const nb = byName.get(b);
    if (na && nb) {
      na.relationships.push({ targetNpcId: nb.entityId, label, weight: wA });
      nb.relationships.push({ targetNpcId: na.entityId, label, weight: wB });
    }
  }

  // Doc 34 §1.4 kinship map relationships
  rel('Wang Shouzheng','Master Hu','trade_partner',0.1,0.2);          // Shouzheng needs salt, Hu needs access
  rel('Wang Shouzheng','Li Asheng','peer',0.5,0.5);                  // only non-Wang peer
  rel('Wang Shouzheng','He Laosan','trade_arrangement',0.3,0.4);    // free passage for firewood
  rel('Wang Shouzheng','Wu Daniu','protection_pact',0.2,0.3);      // eyes on foothills
  rel('Wang Shouzheng','Widow Xu','charity_recipient',0.3,-0.1);    // Shouzheng ensures charity
  rel('Wang Shouzheng','Zhou Wenshu','family_friend',0.7,0.6);     // "older sister"
  rel('Wang Shouzheng','Wang Lun','cousin_employer',0.2,0.1);     // appointed Lun, grateful+resentful
  rel('Wang Shouzheng','Wang Shouli','brother_strained',0.1,-0.2);  // formal ally, privately strained
  rel('Wang Shouzheng','Pan Siniang','lineage_dispute_resolved',0.3,0.4); // unique arrangement

  rel('Master Hu','Li Asheng','trade_rival',-0.3,-0.4);             // Hu suspects Li of bidding for license
  rel('Master Hu','He Laosan','dock_neighbor',0.3,0.2);            // both at the dock
  rel('Master Hu','Pan Siniang','credit_customer',0.2,0.1);        // Pan buys salt on credit

  rel('Widow Xu','Zhou Wenshu','grief_shared',0.8,0.7);             // Zhou visits nightly
  rel('Widow Xu','Pan Siniang','mourning_support',0.6,0.5);        // Pan leaves tofu daily

  rel('Wang Sanniang','Wang Simei','friend_confidante',0.6,0.6);     // Simei hears Sanniang's reluctance

  rel('Lin Aqiao','Wu Daniu','brother_in_law',0.4,0.4);             // Lady Lin is Wu's sister

  rel('Zhao Tieniu','Wang Shouzheng','nephew_in_law',0.2,0.3);      // married Shouzheng's niece

  rel('Wang Lun','Wang Shouli','cousin',0.0,0.1);                   // distant cousin
  rel('Wang Lun','Li Asheng','book_borrower',0.3,0.2);             // Lun borrows Li's printed books

  rel('Wang Zongde','Wang Sanniang','rival_tension',-0.3,-0.2);    // "bare stick" tension
}

// ============================================================================
// Main generation function
// ============================================================================

export function generateNpcRoster(params: NpcGenParams): NpcRoster {
  const seed = params.seed;
  const rng = createRng(hashSeedToU64(seed + ':npc'));
  const totalPop = params.totalPopulation ?? 180;
  const namedOnly = params.namedOnly ?? false;
  const householdCount = params.householdCount ?? 31;

  const npcs: GeneratedNpc[] = [];
  let entityIdCounter = 0n;
  function nextEntityId(): EntityId { return entityIdCounter++; }

  // ---- 1. Generate named NPCs from doc 34 ----
  for (const tmpl of NAMED_NPCS) {
    npcs.push({
      entityId: nextEntityId(),
      name: tmpl.name,
      nameHanzi: tmpl.nameHanzi,
      surname: tmpl.surname,
      surnameHanzi: tmpl.surnameHanzi,
      givenName: tmpl.givenName,
      givenNameHanzi: tmpl.givenNameHanzi,
      age: tmpl.age,
      sex: tmpl.sex,
      lifeStage: lifeStageFromAge(tmpl.age),
      role: tmpl.role,
      householdIndex: tmpl.householdIndex,
      isWang: tmpl.isWang,
      isNamed: true,
      wealthTier: tmpl.wealthTier,
      qiState: tmpl.qiState,
      traits: generateTraits(rng, tmpl.role),
      skills: [...tmpl.skills],
      kinship: [],
      relationships: [],
      personalitySummary: tmpl.personalitySummary,
      tensionTies: [...tmpl.tensionTies],
      metadata: {},
    });
  }

  // Wire kinship and relationships among named NPCs
  wireNamedKinship(npcs);
  wireRelationships(npcs);

  if (namedOnly) {
    return {
      seed,
      tick: 0,
      totalGenerated: npcs.length,
      namedCount: npcs.length,
      proceduralCount: 0,
      npcs,
    };
  }

  // ---- 2. Generate procedural NPCs for remaining households ----
  // The first 15 households have named heads; the remaining 16 are fully procedural.
  // Each household has 3-8 members (average ~5.8 for 180 people / 31 households).
  const namedHouseholdIndices = new Set(NAMED_NPCS.map(n => n.householdIndex));
  const proceduralPopTarget = totalPop - npcs.length;
  let proceduralGenerated = 0;

  // Wealth distribution for unnamed households (mostly poor/tenant)
  const unnamedWealthTiers: WealthTier[] = ['poor','poor','poor','comfortable','destitute'];

  for (let hh = 0; hh < householdCount && proceduralGenerated < proceduralPopTarget; hh++) {
    const isNamedHH = namedHouseholdIndices.has(hh);
    const wt = isNamedHH
      ? (NAMED_NPCS.find(n => n.householdIndex === hh)?.wealthTier ?? 'poor')
      : rngChoice(rng, unnamedWealthTiers);
    const isWangHH = isNamedHH
      ? (NAMED_NPCS.some(n => n.householdIndex === hh && n.isWang))
      : (hh < 22); // 22 of 31 are Wang per doc 04

    // Count existing NPCs in this household
    const existingInHH = npcs.filter(n => n.householdIndex === hh).length;
    const targetMembers = isNamedHH
      ? rngInt(rng, 1, 4)  // add a few more members to named households
      : rngInt(rng, 3, 8);  // full household for unnamed ones

    for (let i = 0; i < targetMembers && proceduralGenerated < proceduralPopTarget; i++) {
      const npc = generateProceduralNpc(
        rng, nextEntityId(), hh, isWangHH, wt, existingInHH + i,
      );
      npcs.push(npc);
      proceduralGenerated++;
    }
  }

  return {
    seed,
    tick: 0,
    totalGenerated: npcs.length,
    namedCount: NAMED_NPCS.length,
    proceduralCount: proceduralGenerated,
    npcs,
  };
}

// ============================================================================
// Query API
// ============================================================================

export interface NpcGenApi {
  generate(params: NpcGenParams): NpcRoster;
  getLast(): NpcRoster | null;
  stats(): NpcGenStats;
  queryNpc(entityId: EntityId): GeneratedNpc | undefined;
  queryByHousehold(householdIndex: number): GeneratedNpc[];
  queryByRole(role: NpcRole): GeneratedNpc[];
  queryNamed(): GeneratedNpc[];
  queryByTension(tensionId: string): GeneratedNpc[];
  getKinshipNetwork(entityId: EntityId): { npc: GeneratedNpc; kin: GeneratedNpc[]; rels: GeneratedNpc[] };
}

export interface NpcGenStats {
  generationsRun: number;
  lastSeed: string | null;
  lastTotalNpcs: number;
  lastNamedCount: number;
}

export function createNpcGenApi(): NpcGenApi {
  let last: NpcRoster | null = null;
  let generationsRun = 0;

  return {
    generate(params: NpcGenParams): NpcRoster {
      generationsRun++;
      last = generateNpcRoster(params);
      return last;
    },
    getLast(): NpcRoster | null { return last; },
    stats(): NpcGenStats {
      return {
        generationsRun,
        lastSeed: last?.seed ?? null,
        lastTotalNpcs: last?.totalGenerated ?? 0,
        lastNamedCount: last?.namedCount ?? 0,
      };
    },
    queryNpc(entityId: EntityId): GeneratedNpc | undefined {
      return last?.npcs.find(n => n.entityId === entityId);
    },
    queryByHousehold(householdIndex: number): GeneratedNpc[] {
      return last?.npcs.filter(n => n.householdIndex === householdIndex) ?? [];
    },
    queryByRole(role: NpcRole): GeneratedNpc[] {
      return last?.npcs.filter(n => n.role === role) ?? [];
    },
    queryNamed(): GeneratedNpc[] {
      return last?.npcs.filter(n => n.isNamed) ?? [];
    },
    queryByTension(tensionId: string): GeneratedNpc[] {
      return last?.npcs.filter(n => n.tensionTies.includes(tensionId)) ?? [];
    },
    getKinshipNetwork(entityId: EntityId) {
      if (!last) return { npc: undefined as any, kin: [], rels: [] };
      const npc = last.npcs.find(n => n.entityId === entityId);
      if (!npc) return { npc: undefined as any, kin: [], rels: [] };
      const kinIds = new Set(npc.kinship.map(k => k.targetNpcId));
      const relIds = new Set(npc.relationships.map(r => r.targetNpcId));
      return {
        npc,
        kin: last.npcs.filter(n => kinIds.has(n.entityId)),
        rels: last.npcs.filter(n => relIds.has(n.entityId)),
      };
    },
  };
}

// ============================================================================
// Plugin Definition
// ============================================================================

export function createNpcGenPlugin(): Plugin {
  let api: NpcGenApi | null = null;

  return {
    id: 'ga:gen-npc',
    version: '0.1.0',
    dependencies: ['ga:determinism'],

    init(host: PluginHost) {
      api = createNpcGenApi();
      host.capabilities.register({
        capability: 'gen.npc',
        provider: 'ga:gen-npc',
        version: '0.1.0',
        instance: api,
      });
      host.setState('ga:gen-npc', api);
      console.log('[ga:gen-npc] Initialized — 1 capability registered');
    },

    destroy(host: PluginHost) {
      host.capabilities.unregister('gen.npc', 'ga:gen-npc');
      api = null;
      console.log('[ga:gen-npc] Destroyed');
    },
  };
}
