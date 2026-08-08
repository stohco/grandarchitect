/**
 * Motion Corpus — harvested reusable motion from the directed episodes.
 *
 * Pass 71 (Library Harvesting): every scene is mined for reusable motion.
 * Each entry is a MotionTruthAsset-lite: the semantic action, the episode
 * shot it was harvested from (machine-verified), the performer, whether it
 * is a full performance / phrase / atom, and its harvest status. The
 * coverage matrix (coverage-systems.ts) reads this corpus to fill validated
 * variant counts and surface the remaining gaps (episode targets).
 */

import { EPISODE_1, TOUR_SHOTS, EPISODE_2, EPISODE_3 } from './director-script';

export type HarvestLevel = 'atom' | 'phrase' | 'performance';

export interface HarvestedMotion {
  id: string;
  /** semantic action (maps to a MOTION_COVERAGE row action). */
  semanticAction: string;
  /** full performance / phrase / atom. */
  level: HarvestLevel;
  /** exact episode shot that supplies this motion. */
  sourceShot: string;
  performer: string;
  status: 'harvested' | 'validated' | 'candidate';
  note: string;
}

/** All shots that can serve as sources (across episodes). */
const ALL_SHOTS = new Set([
  ...EPISODE_1.shots.map((s) => s.id),
  ...TOUR_SHOTS.map((s) => s.id),
  ...EPISODE_2.shots.map((s) => s.id),
  ...(EPISODE_3?.shots ?? []).map((s) => s.id),
]);

export const MOTION_CORPUS: HarvestedMotion[] = [
  // ---- Episode 1 + Village Tour: mortal work -----------------------------
  { id: 'motion.woman.draw-well', semanticAction: 'well.draw-water', level: 'phrase', sourceShot: 'tour.14', performer: 'mortal-woman', status: 'harvested', note: 'bucket rising with the windlass creak (well shots).' },
  { id: 'motion.widow.weave', semanticAction: 'loom.weave', level: 'performance', sourceShot: 'shot.1D', performer: 'widow-elder', status: 'harvested', note: 'the loom rhythm; the coat peg beside.' },
  { id: 'motion.ladychen.weave', semanticAction: 'loom.weave', level: 'performance', sourceShot: 'shot.1J', performer: 'mortal-woman', status: 'harvested', note: 'night weaving; bolts stacked for Widow Xu.' },
  { id: 'motion.farmer.hoe.shoulder.walk', semanticAction: 'walk', level: 'phrase', sourceShot: 'tour.11', performer: 'mortal-farmer', status: 'candidate', note: 'burdened walk through the fields aerial.' },
  { id: 'motion.tenant.sharpens', semanticAction: 'carry.light', level: 'atom', sourceShot: 'tour.18', performer: 'mortal-bare-stick', status: 'harvested', note: 'whetstone at the door; resentment in the shoulders.' },
  { id: 'motion.elder.walk.shrine', semanticAction: 'walk', level: 'phrase', sourceShot: 'tour.12', performer: 'elder-midwife', status: 'harvested', note: 'Zhou Popo\'s morning stick at the shrine.' },
  { id: 'motion.bow.formal', semanticAction: 'bow.formal', level: 'performance', sourceShot: 'shot.1H', performer: 'teacher', status: 'validated', note: 'the teacher\'s formal bow at the dais (realm of the tour).' },
  { id: 'motion.merchant.count', semanticAction: 'carry.light', level: 'atom', sourceShot: 'e2.04', performer: 'merchant', status: 'candidate', note: 'abacus counting over the ledger wall.' },
  { id: 'motion.storyteller.fan', semanticAction: 'social.gesture', level: 'atom', sourceShot: 'e2.06', performer: 'storyteller', status: 'harvested', note: 'the tea-house fan mid-rumor.' },
  { id: 'motion.compounder.mortar', semanticAction: 'craft.mortar', level: 'atom', sourceShot: 'e2.08', performer: 'apothecary', status: 'harvested', note: 'the medicine shop mortar rhythm.' },
  { id: 'motion.yamen.clerk', semanticAction: 'craft.brush', level: 'atom', sourceShot: 'e2.10', performer: 'clerk', status: 'harvested', note: 'brushes and bamboo slips under the yamen gate.' },
  { id: 'motion.magistrate.seal', semanticAction: 'social.formal', level: 'performance', sourceShot: 'e2.11', performer: 'magistrate', status: 'validated', note: 'the hand hesitating above the county seal — a full micro-performance.' },
  { id: 'motion.innkeeper.stove', semanticAction: 'craft.cook', level: 'phrase', sourceShot: 'e2.12', performer: 'innkeeper', status: 'harvested', note: 'the inn stove at dusk; the caged thrush.' },
  { id: 'motion.dock.hand', semanticAction: 'carry.heavy', level: 'phrase', sourceShot: 'e2.02', performer: 'dock-hand', status: 'harvested', note: 'barrows of salt from depot to boat.' },
  { id: 'motion.mc.observe', semanticAction: 'perception.orient.sound', level: 'atom', sourceShot: 'e2.12', performer: 'mc-cultivator', status: 'candidate', note: 'the MC at the river window reading the town (turn-hear-sound).' },
  // ---- Episode 3: recruitment day (sect verbs) ----------------------------
  { id: 'motion.disciple.mount-sword', semanticAction: 'disciple.mount-sword', level: 'performance', sourceShot: 'ep3.mount', performer: 'sect-disciple', status: 'harvested', note: 'the recruiting disciple steps onto the sword and lifts off the square.' },
  { id: 'motion.disciple.land-controlled', semanticAction: 'disciple.land-controlled', level: 'performance', sourceShot: 'ep3.land', performer: 'sect-disciple', status: 'harvested', note: 'controlled landing before the recruitment stall.' },
  { id: 'motion.disciple.greet-elder', semanticAction: 'disciple.greet-elder', level: 'performance', sourceShot: 'ep3.greet', performer: 'sect-disciple', status: 'harvested', note: 'formal greeting at the stall.' },
  { id: 'motion.mortal-watch-recruitment', semanticAction: 'mortal-watch-recruitment', level: 'performance', sourceShot: 'ep3.test', performer: 'mortal-parent', status: 'harvested', note: 'parents watching aptitude testing; fear and hope in the hands.' },
  { id: 'motion.child-line', semanticAction: 'mortal-line', level: 'phrase', sourceShot: 'ep3.line', performer: 'mortal-child', status: 'harvested', note: 'children lining up; one bites a lip.' },
  { id: 'motion.recruiter.inspect', semanticAction: 'disciple.gatekeeper-inspect', level: 'phrase', sourceShot: 'ep3.inspect', performer: 'sect-recruiter', status: 'harvested', note: 'the recruiter reads spiritual roots at the stall.' },
  { id: 'motion.gatekeeper.inspect-token', semanticAction: 'gatekeeper.inspect-token', level: 'phrase', sourceShot: 'ep3.gate', performer: 'gatekeeper', status: 'candidate', note: 'token inspection at the outer threshold.' },
  // ---- creatures & world motion -------------------------------------------
  { id: 'motion.chicken.peck', semanticAction: 'creature.chicken', level: 'atom', sourceShot: 'tour.07', performer: 'chicken', status: 'harvested', note: 'pecking between the market stalls.' },
  { id: 'motion.sparrow.takeoff', semanticAction: 'creature.sparrow', level: 'atom', sourceShot: 'tour.06', performer: 'sparrow', status: 'harvested', note: 'takeoff from the senior household eave.' },
  { id: 'motion.wolf.observe', semanticAction: 'creature.spirit-wolf', level: 'atom', sourceShot: 'tour.22', performer: 'spirit-wolf', status: 'harvested', note: 'the treeline watch; one breath, then gone.' },
  { id: 'motion.cloth.wind', semanticAction: 'world.cloth', level: 'atom', sourceShot: 'tour.02', performer: 'drying-cloth', status: 'harvested', note: 'clothesline flutter at the gate.' },
  { id: 'motion.smoke.light-wind', semanticAction: 'world.smoke', level: 'atom', sourceShot: 'tour.12', performer: 'incense-smoke', status: 'harvested', note: 'shrine incense curling in the morning light.' },
  { id: 'motion.door.swing', semanticAction: 'world.door', level: 'atom', sourceShot: 'shot.1F', performer: 'compound-gate', status: 'harvested', note: 'the senior household gate swinging at sunrise.' },
  { id: 'motion.water.surface', semanticAction: 'world.water', level: 'atom', sourceShot: 'tour.19', performer: 'black-creek', status: 'harvested', note: 'the creek\'s slow surface current under the bridge.' },
];

export const MOTION_CORPUS_COUNT = MOTION_CORPUS.length;

export function corpusShotIds(): string[] {
  return MOTION_CORPUS.map((m) => m.sourceShot);
}

/** Harvested actions available for the coverage matrix. */
export function harvestedActions(): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const m of MOTION_CORPUS) {
    counts[m.semanticAction] = (counts[m.semanticAction] ?? 0) + 1;
  }
  return counts;
}

export function corpusGaps(): string[] {
  const covered = new Set(MOTION_CORPUS.map((m) => m.semanticAction));
  return [
    'carry.uneven-terrain', 'bow.injured', 'sword.draw.confined-space',
    'cultivate.meditate', 'spirit-beast.stalk', 'cultivate.breakthrough-strain',
  ].filter((a) => !covered.has(a));
}
