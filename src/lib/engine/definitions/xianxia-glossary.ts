/**
 * Xianxia Glossary — the universal xianxia vocabulary registry.
 *
 * The database must read as REAL xianxia, not a cheap copy: every
 * universally understood term (Qi Condensation, Foundation Establishment,
 * Core Formation, Nascent Soul, Soul Formation, Soul Transformation,
 * Golden Core, Dantian, Meridians, Spirit Stone, Formation...) maps to its
 * corpus definition ids and hanzi. Machine-audited: every definition id
 * must exist, and the full standard realm ladder must be covered.
 */

import { ALL_DEFINITIONS } from './index';

export interface XianxiaTerm {
  term: string;
  hanzi?: string;
  definitionIds: string[];
  note?: string;
}

export const XIANXIA_GLOSSARY: XianxiaTerm[] = [
  // ---- the universal realm ladder (standard xianxia names) --------------
  { term: 'Mortal', hanzi: '凡人', definitionIds: ['realm.mortal'], note: 'station 1 — no cultivation' },
  { term: 'Qi Induction', hanzi: '引气', definitionIds: ['realm.qi_induction'], note: 'first qi perception' },
  { term: 'Qi Condensation', hanzi: '凝气', definitionIds: ['realm.qi_condensation'], note: 'first self-sustaining inner order; the genre standard' },
  { term: 'Foundation Establishment', hanzi: '筑基', definitionIds: ['realm.foundation_establishment'], note: 'body/qi/spirit integrate' },
  { term: 'Core Formation', hanzi: '金丹', definitionIds: ['realm.core_formation'], note: 'the golden core' },
  { term: 'Golden Core', hanzi: '金丹', definitionIds: ['realm.core_formation'] },
  { term: 'Nascent Soul', hanzi: '元婴', definitionIds: ['realm.nascent_soul'], note: 'the spirit is born' },
  { term: 'Soul Formation', hanzi: '化神', definitionIds: ['realm.spirit_severance'], note: 'the soul refines to autonomy (corpus: Spirit Severance)' },
  { term: 'Soul Transformation', hanzi: '合体', definitionIds: ['realm.void_amalgamation'], note: 'soul and body transform together (corpus: Void Amalgamation)' },
  { term: 'Tribulation Crossing', hanzi: '渡劫', definitionIds: ['realm.tribulation_crossing'], note: 'the heavenly tribulation' },
  { term: 'Mahayana', hanzi: '大乘', definitionIds: ['realm.mahayana'], note: 'the great vehicle' },
  { term: 'Immortal', hanzi: '仙人', definitionIds: ['realm.xianren'] },
  // ---- cultivation basics -------------------------------------------------
  { term: 'Dantian', hanzi: '丹田', definitionIds: ['essence.yin', 'essence.yang'] },
  { term: 'Meridians', hanzi: '经脉', definitionIds: ['deviation.false_circuit', 'technique.route_qi'] },
  { term: 'Spiritual Roots', hanzi: '灵根', definitionIds: ['realm.qi_induction', 'realm.qi_condensation'] },
  { term: 'Heart Demon', hanzi: '心魔', definitionIds: ['deviation.obsession', 'deviation.compulsion'] },
  { term: 'Divine Sense', hanzi: '神识', definitionIds: ['skill.perceive_anchors', 'technique.trace_anchor'] },
  { term: 'Qi Sense', hanzi: '灵觉', definitionIds: ['realm.qi_induction'] },
  { term: 'Five Phases', hanzi: '五行', definitionIds: ['essence.wood', 'essence.fire', 'essence.earth', 'essence.metal', 'essence.water'] },
  { term: 'Yin and Yang', hanzi: '阴阳', definitionIds: ['essence.yin', 'essence.yang'] },
  // ---- the world ----------------------------------------------------------
  { term: 'Spirit Vein', hanzi: '灵脉', definitionIds: ['vein.green_mirror'] },
  { term: 'Spirit Stone', hanzi: '灵石', definitionIds: ['mineral.spirit_stone', 'economy.currency_spirit_stones'] },
  { term: 'Formation', hanzi: '阵法', definitionIds: ['formation.three_jade_heart_ward', 'formation.five_phase_spirit_gathering'] },
  { term: 'Talisman', hanzi: '符箓', definitionIds: ['talisman.storage'] },
  { term: 'Pill', hanzi: '丹药', definitionIds: ['pill.return_qi', 'pill.trauma'] },
  { term: 'Grotto-Heaven', hanzi: '洞天', definitionIds: ['place.jade_void_grotto', 'place.yellow_court_grotto'] },
  { term: 'Underworld', hanzi: '地府', definitionIds: ['institution.underworld'] },
  { term: 'Ghost', hanzi: '鬼', definitionIds: ['custom.ghost'] },
  { term: 'Spirit Beast', hanzi: '灵兽', definitionIds: ['beast.spirit_wolf'] },
  { term: 'Qi', hanzi: '氣', definitionIds: ['essence.qi'] },
];

const defIds = new Set(ALL_DEFINITIONS.map((d) => d.id));

export const STANDARD_LADDER = [
  'Qi Induction', 'Qi Condensation', 'Foundation Establishment',
  'Core Formation', 'Nascent Soul', 'Soul Formation', 'Soul Transformation',
  'Tribulation Crossing', 'Mahayana', 'Immortal',
];

export function glossaryTerm(term: string): XianxiaTerm | undefined {
  return XIANXIA_GLOSSARY.find((t) => t.term === term || t.hanzi === term);
}

export function glossaryCoversLadder(): boolean {
  return STANDARD_LADDER.every((t) => XIANXIA_GLOSSARY.some((g) => g.term === t));
}

export function danglingGlossaryIds(): string[] {
  return XIANXIA_GLOSSARY.flatMap((g) =>
    g.definitionIds.filter((id) => !defIds.has(id) && !id.startsWith('canon.')),
  );
}
