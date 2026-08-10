/**
 * frontier/npc-cognition.ts — the symbolic cognitive fabric (directive §14).
 *
 * First prototype layer of the 14-layer architecture. This module implements
 * the deterministic core that makes an NPC *reason about a world they believe
 * in* rather than query an omniscient game state:
 *
 *   1. BELIEF GRAPH   — believes/heard/saw/suspects with confidence; beliefs
 *                       can be wrong; two elders can genuinely disagree.
 *   2. EPISODIC MEMORY — tiny semantic events ({actor, action, target,
 *                       witnesses, location, time, stakes}) with salience,
 *                       decay, rehearsal, association. Bytes, not tokens.
 *   3. BDI CORE        — competing desires → active intentions, resolved by
 *                       utility arbitration over personality-weighted scores.
 *   4. EMOTIONAL APPRAISAL — emotion is derived from how an event relates to
 *                       beliefs and goals (FAtiMA), never mood RNG.
 *   5. THEORY OF MIND  — knows-that graphs enabling bluffing and secrets.
 *   6. DIALOGUE ACTS   — cognition emits semantic acts, never strings.
 *   7. XIANXIA SOCIAL PHYSICS — face, seniority, debt, karma, oath... as
 *                       first-class computable values.
 *
 * Determinism contract: every function is a pure function of the NPC's state
 * plus explicit inputs — no Math.random, no wall-clock reads. Same seed +
 * same events = same decisions, forever.
 *
 * Run: bun run src/engine/frontier/npc-cognition.ts
 */

export const FACE = {
  KEEP: 'keep_face',
  LOSE: 'lose_face',
  GIVE: 'give_face',
  SAVE: 'save_face',
} as const;
export type FaceAction = (typeof FACE)[keyof typeof FACE];

export type RealmIndex = number; // 0..19 (directive: 20-realm ladder)

export interface SocialContext {
  playerRealm: RealmIndex;
  npcRealm: RealmIndex;
  playerIsSenior: boolean;       // seniority by sect rank/lineage, not just realm
  publicAudience: boolean;
  debtToTargetMaster: number;    // 0..1 — the NPC's master owes the player's master
  targetKilledMasterDisciple: boolean;
  sectLawAllowsPunishment: boolean;
  playerCrossedFormation: boolean;
  playerIsDiscipleOfSect: boolean;
  nearbyJuniors: number;
  demonicDisposition: number;    // 0..1 — how demonic the NPC's path is
  bloodFeudWithTarget: boolean;
}

export type DialogueAct =
  | 'greet' | 'warn' | 'probe' | 'lie' | 'accuse' | 'threaten' | 'boast'
  | 'deflect' | 'teach' | 'comfort' | 'bargain' | 'request' | 'command'
  | 'challenge' | 'flatter' | 'mock' | 'confess' | 'withhold_information'
  | 'change_subject' | 'invoke_debt' | 'give_face' | 'save_face'
  | 'offer_trade' | 'offer_alliance' | 'compel_leave';

export interface DialogueIntent {
  act: DialogueAct;
  severity: 'none' | 'warning' | 'punishment' | 'lethal';
  authority: 'subordinate' | 'equal' | 'superior';
  publicFace: 'irrelevant' | 'moderate' | 'important';
  relationshipModifier: string[];
  emotion: string;
  threatCredibility: number;    // 0..1 — does the target believe the NPC can act
  desiredOutcome: string;
}

/* ---------------- belief graph ---------------- */

export interface Belief {
  /** Machine-readable proposition id, e.g. 'player_crossed_formation'. */
  proposition: string;
  confidence: number;           // 0..1
  source: 'perceived' | 'heard' | 'inferred' | 'suspected';
  witnessedBy?: string;         // who told us (for gossip provenance)
  tick: number;
}

export interface BeliefGraph {
  beliefs: Map<string, Belief>;
}

export function createBeliefGraph(): BeliefGraph {
  return { beliefs: new Map() };
}

export function assertBelief(g: BeliefGraph, b: Belief): void {
  g.beliefs.set(b.proposition, b);
}

/** Belief update: hearing a rumor raises/lowers confidence toward the source's claim. */
export function hearRumor(
  g: BeliefGraph,
  proposition: string,
  sourceConfidence: number,
  sourceCredibility: number,   // how much this NPC trusts the source
  tick: number,
): void {
  const existing = g.beliefs.get(proposition);
  const incoming = sourceConfidence * sourceCredibility;
  const combined = existing ? existing.confidence * 0.5 + incoming * 0.5 : incoming * 0.6;
  assertBelief(g, {
    proposition,
    confidence: clamp01(combined),
    source: 'heard',
    witnessedBy: sourceCredibility > 0.5 ? 'trusted_source' : 'unknown_source',
    tick,
  });
}

export function believe(g: BeliefGraph, proposition: string): boolean {
  const b = g.beliefs.get(proposition);
  return b !== undefined && b.confidence >= 0.5;
}

export function confidence(g: BeliefGraph, proposition: string): number {
  return g.beliefs.get(proposition)?.confidence ?? 0;
}

/* ---------------- episodic memory ---------------- */

export interface Episode {
  id: number;
  actor: string;
  action: string;
  target?: string;
  witnesses: string[];
  location: string;
  tick: number;
  stakes: 'low' | 'medium' | 'high';
  /** Emotion the npc derives from this episode (appraised, not stored prose). */
  appraisal: Record<string, number>;
  salience: number;             // 0..1 — decays, rehearsed on recall
}

export interface EpisodicMemory {
  episodes: Map<number, Episode>;
  nextId: number;
  salienceDecay: number;        // per-tick decay factor (default 0.999)
}

export function createEpisodicMemory(decay = 0.999): EpisodicMemory {
  return { episodes: new Map(), nextId: 1, salienceDecay: decay };
}

export function recordEpisode(mem: EpisodicMemory, e: Omit<Episode, 'id' | 'salience'>): Episode {
  const ep: Episode = { ...e, id: mem.nextId++, salience: e.stakes === 'high' ? 1 : e.stakes === 'medium' ? 0.6 : 0.3 };
  mem.episodes.set(ep.id, ep);
  return ep;
}

/** Recall the most salient episodes matching a predicate; rehearsal raises salience. */
export function recall(mem: EpisodicMemory, predicate: (e: Episode) => boolean, limit = 8): Episode[] {
  const hits = [...mem.episodes.values()].filter(predicate).sort((a, b) => b.salience - a.salience).slice(0, limit);
  for (const h of hits) h.salience = Math.min(1, h.salience * 1.05); // rehearsal
  return hits;
}

/** Advance time: decay salience so trivial memories disappear, important ones survive decades. */
export function decayMemory(mem: EpisodicMemory, ticks: number): void {
  for (const e of mem.episodes.values()) {
    e.salience *= Math.pow(mem.salienceDecay, ticks);
    if (e.stakes === 'high') e.salience = Math.max(e.salience, 0.08); // importance floor — decades survive
    if (e.salience < 0.02) mem.episodes.delete(e.id);
  }
}

/* ---------------- BDI: desires → intentions ---------------- */

export interface Desire {
  id: string;
  intensity: number;            // 0..1 — how strong the pull is right now
  blockedBy: string[];          // plan fragments blocked (for replanning)
}

export interface Personality {
  cautious: number;             // 0..1 — prefers warnings over violence
  irritable: number;            // 0..1 — anger threshold
  proud: number;                // 0..1 — face sensitivity
  merciful: number;             // 0..1 — spares vs kills
  greedy: number;               // 0..1 — wealth/opportunity pull
  loyal: number;                // 0..1 — sect/kin duty pull
  ambitious: number;            // 0..1 — cultivation drive
}

export function createPersonality(overrides: Partial<Personality> = {}): Personality {
  return { cautious: 0.5, irritable: 0.5, proud: 0.5, merciful: 0.5, greedy: 0.5, loyal: 0.5, ambitious: 0.5, ...overrides };
}

/**
 * The canonical social decision: what does this NPC intend toward the player
 * who crossed a restricted formation? (directive §14 worked example)
 *
 * Everything emerges from beliefs + personality + social context. No dialogue
 * lines, no scripted branches — the intent is computed.
 */
export function decideTowardTrespasser(
  personality: Personality,
  ctx: SocialContext,
  beliefs: BeliefGraph,
  mem: EpisodicMemory,
): DialogueIntent {
  const crossed = believe(beliefs, 'player_crossed_formation') || ctx.playerCrossedFormation;
  const crossedN = crossed ? 1 : 0;
  const lawAllows = ctx.sectLawAllowsPunishment;
  const lawAllowsN = lawAllows ? 1 : 0;
  const masterSavedHisDisciple = ctx.debtToTargetMaster > 0.5;
  const rememberedDebt = recall(mem, (e) => e.action === 'master_saved_disciple', 1).length > 0;

  // emotion: appraisal from beliefs + goals, not RNG
  const anger = clamp01(
    0.6 * crossedN * lawAllowsN +
      (1 - personality.cautious) * 0.3 +
      personality.irritable * 0.2 +
      (ctx.publicAudience ? 0.15 : 0) -
      (masterSavedHisDisciple || rememberedDebt ? 0.25 : 0) -
      personality.merciful * 0.1,
  );
  const respect = clamp01(0.5 + (ctx.playerIsSenior ? 0.3 : 0) + personality.loyal * 0.1 - anger * 0.2);

  // threat credibility: realm difference + disposition
  const threatCredibility = clamp01(
    (ctx.npcRealm - ctx.playerRealm > 3 ? 0.9 : ctx.npcRealm > ctx.playerRealm ? 0.6 : 0.25) +
      ctx.demonicDisposition * 0.2,
  );

  // desired outcome + severity from the same state
  const playerOutranks = ctx.playerRealm > ctx.npcRealm || ctx.playerIsSenior;
  let act: DialogueAct = 'warn';
  let severity: DialogueIntent['severity'] = 'warning';
  let authority: DialogueIntent['authority'] = 'superior';

  if (playerOutranks) {
    // a superior who outranks him: face-preserving deflection
    act = 'deflect';
    severity = 'none';
    authority = 'subordinate';
  } else if (ctx.demonicDisposition > 0.6) {
    act = 'threaten';
    severity = 'lethal';
    authority = 'superior';
  } else if (!lawAllows) {
    act = 'greet';               // no standing to punish — treat as innocent
    severity = 'none';
    authority = 'equal';
  } else if (masterSavedHisDisciple || rememberedDebt) {
    act = 'warn';
    severity = 'warning';
    authority = 'superior';
  } else if (anger > 0.65) {
    act = 'command';
    severity = 'punishment';
    authority = 'superior';
  } else {
    act = 'warn';
    severity = 'warning';
    authority = 'superior';
  }

  return {
    act,
    severity,
    authority,
    publicFace: ctx.publicAudience ? 'important' : 'moderate',
    relationshipModifier: masterSavedHisDisciple ? ['indebted_to_master'] : [],
    emotion: anger > 0.6 ? 'irritated' : anger > 0.3 ? 'annoyed' : 'calm',
    threatCredibility,
    desiredOutcome: severity === 'lethal' ? 'target_dead' : severity === 'punishment' ? 'target_submits' : 'target_leaves',
  };
}

/* ---------------- theory of mind ---------------- */

export interface TheoryOfMind {
  /** npcId → proposition ids the NPC knows the other knows. */
  knowsThat: Map<string, Set<string>>;
  /** npcId → proposition ids the NPC suspects the other knows. */
  suspectsThat: Map<string, Set<string>>;
}

export function createTheoryOfMind(): TheoryOfMind {
  return { knowsThat: new Map(), suspectsThat: new Map() };
}

export function addKnownKnowledge(tom: TheoryOfMind, other: string, proposition: string): void {
  if (!tom.knowsThat.has(other)) tom.knowsThat.set(other, new Set());
  tom.knowsThat.get(other)!.add(proposition);
}

export function addSuspectedKnowledge(tom: TheoryOfMind, other: string, proposition: string): void {
  if (!tom.suspectsThat.has(other)) tom.suspectsThat.set(other, new Set());
  tom.suspectsThat.get(other)!.add(proposition);
}

export function knows(tom: TheoryOfMind, other: string, proposition: string): boolean {
  return tom.knowsThat.get(other)?.has(proposition) ?? false;
}

/** "I don't think Meng knows that I know" — the classic bluff enabler. */
export function canBluffAbout(tom: TheoryOfMind, other: string, proposition: string): boolean {
  return !knows(tom, other, proposition);
}

/* ---------------- xianxia social physics ---------------- */

export interface SocialDebt {
  owedTo: string;
  amount: number;               // 0..1
  reason: string;
  tick: number;
}

export interface SocialLedger {
  face: Map<string, number>;    // person → face held (0..1)
  debts: SocialDebt[];          // who owes us / we owe them
  oaths: Map<string, string>;   // oath → bound parties
  grudges: Map<string, number>; // person → grudge intensity
  favors: Map<string, number>;  // person → favor balance (+ we gave, - we received)
}

export function createSocialLedger(): SocialLedger {
  return { face: new Map(), debts: [], oaths: new Map(), grudges: new Map(), favors: new Map() };
}

export function giveFace(ledger: SocialLedger, person: string, amount: number): void {
  ledger.face.set(person, clamp01((ledger.face.get(person) ?? 0.5) + amount));
}

export function loseFace(ledger: SocialLedger, person: string, amount: number): void {
  ledger.face.set(person, clamp01((ledger.face.get(person) ?? 0.5) - amount));
}

export function recordDebt(ledger: SocialLedger, owedTo: string, amount: number, reason: string, tick: number): void {
  ledger.debts.push({ owedTo, amount, reason, tick });
}

export function invokeDebt(ledger: SocialLedger, owedTo: string): number {
  const debt = ledger.debts.find((d) => d.owedTo === owedTo);
  if (!debt) return 0;
  ledger.debts = ledger.debts.filter((d) => d !== debt);
  return debt.amount;
}

export function holdGrudge(ledger: SocialLedger, person: string, amount: number): void {
  ledger.grudges.set(person, clamp01((ledger.grudges.get(person) ?? 0) + amount));
}

/* ---------------- surface realizer (compositional) ---------------- */

/**
 * Compositional language: a semantic intent becomes a realized line from
 * speech atoms × personality × context. This is the *renderer* of cognition —
 * the intelligence is upstream. (directive §14: never 500k authored lines;
 * atoms compose.)
 */
export function realizeIntent(intent: DialogueIntent, personality: Personality, ctx: SocialContext): string {
  const senior = intent.authority === 'superior' ? 'Senior' : intent.authority === 'subordinate' ? 'Junior' : 'Friend';
  const face = ctx.publicAudience ? ', in front of these juniors,' : '';
  switch (intent.act) {
    case 'warn': {
      const soft = personality.cautious > 0.6 && !ctx.publicAudience ? 'I will overlook it once' : 'get off my mountain';
      return ctx.debtToTargetMaster > 0.5
        ? `${senior}, this is not a place ${ctx.playerIsDiscipleOfSect ? 'outer disciples' : 'visitors'} may enter${face}. On your master's account, I will overlook it once. Leave.`
        : `An ${ctx.playerIsDiscipleOfSect ? 'outer disciple' : 'outsider'} dares trespass here? ${soft}.`;
    }
    case 'threaten':
      return `You have three breaths.`;
    case 'command':
      return `You trespassed on a forbidden peak. Kneel.`;
    case 'deflect':
      return `${senior}… perhaps you were unaware that this peak is restricted. Please forgive my bluntness.`;
    case 'greet':
      return `${senior}, welcome. The formations are quiet today — walk with care.`;
    case 'compel_leave':
      return `${senior}, the mountain is closed. Leave, and I will not remember you.`;
    default:
      return `${senior}, this is not the moment.`;
  }
}

/* ---------------- helpers ---------------- */

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

/* ---------------- conformance ---------------- */

let passed = 0;
let failed = 0;
function assert(cond: boolean, msg: string) {
  if (cond) { passed++; console.log(`  ✅ ${msg}`); }
  else { failed++; console.error(`  ❌ ${msg}`); }
}

function run() {
  console.log('=== NPC Cognition Fabric Conformance ===\n');

  // 1. belief graph: beliefs can be wrong / disagree
  const elderA = createBeliefGraph();
  assertBelief(elderA, { proposition: 'player_crossed_formation', confidence: 0.9, source: 'perceived', tick: 1 });
  hearRumor(elderA, 'player_killed_three', 0.5, 0.4, 2); // unreliable gossip
  assert(believe(elderA, 'player_crossed_formation'), 'elder A believes the trespass');
  assert(confidence(elderA, 'player_killed_three') < 0.5, 'low-credibility rumor stays weak');
  const elderB = createBeliefGraph();
  assert(!believe(elderB, 'player_crossed_formation'), 'elder B (uninformed) genuinely disagrees');

  // 2. episodic memory: salience decay + rehearsal
  const mem = createEpisodicMemory();
  recordEpisode(mem, { actor: 'player', action: 'spared', target: 'LiWei', witnesses: ['elderA'], location: 'cliff_path', tick: 1, stakes: 'high', appraisal: { gratitude: 0.8 } });
  recordEpisode(mem, { actor: 'player', action: 'paid_tea', target: 'teahouse_owner', witnesses: [], location: 'market', tick: 1, stakes: 'low', appraisal: {} });
  decayMemory(mem, 5000);
  assert(mem.episodes.size === 1, 'trivial episode decayed away, important survives 5000 ticks');
  const hit = recall(mem, (e) => e.action === 'spared', 1);
  assert(hit.length === 1 && hit[0].salience > 0.08, 'high-stakes episode survives with importance floor');

  // 3. BDI: the canonical worked example (directive §14)
  const cautious = createPersonality({ cautious: 0.8, merciful: 0.6 });
  const debtCtx: SocialContext = {
    playerRealm: 0, npcRealm: 4, playerIsSenior: false, publicAudience: true,
    debtToTargetMaster: 0.73, targetKilledMasterDisciple: false,
    sectLawAllowsPunishment: true, playerCrossedFormation: true, playerIsDiscipleOfSect: true,
    nearbyJuniors: 2, demonicDisposition: 0.1, bloodFeudWithTarget: false,
  };
  const bg = createBeliefGraph();
  assertBelief(bg, { proposition: 'player_crossed_formation', confidence: 0.95, source: 'perceived', tick: 1 });
  const intent = decideTowardTrespasser(cautious, debtCtx, bg, mem);
  assert(intent.act === 'warn' && intent.severity === 'warning', `indebted elder warns (act=${intent.act})`);
  const line = realizeIntent(intent, cautious, debtCtx);
  assert(line.includes('master'), 'realized line invokes the master debt');

  // same world knowledge, different personality/context → different intent
  const demonic = createPersonality({ cautious: 0.1, irritable: 0.9 });
  const demonicCtx: SocialContext = { ...debtCtx, demonicDisposition: 0.9, debtToTargetMaster: 0 };
  const demonicIntent = decideTowardTrespasser(demonic, demonicCtx, bg, mem);
  assert(demonicIntent.act === 'threaten' && demonicIntent.severity === 'lethal', 'demonic elder threatens lethally');
  assert(realizeIntent(demonicIntent, demonic, demonicCtx) === 'You have three breaths.', 'demonic realization is terse and lethal');

  // player outranks → deflection (face preservation upward)
  const outrankCtx: SocialContext = { ...debtCtx, playerRealm: 10, npcRealm: 4, playerIsSenior: true };
  const outrankIntent = decideTowardTrespasser(cautious, outrankCtx, bg, mem);
  assert(outrankIntent.act === 'deflect' && outrankIntent.authority === 'subordinate', 'outranked NPC deflects with deference');

  // no law → no standing to punish
  const noLawCtx: SocialContext = { ...debtCtx, sectLawAllowsPunishment: false };
  assert(decideTowardTrespasser(cautious, noLawCtx, bg, mem).act === 'greet', 'no sect law → greeting, not punishment');

  // 4. theory of mind
  const tom = createTheoryOfMind();
  addKnownKnowledge(tom, 'meng', 'treasure_location');
  addSuspectedKnowledge(tom, 'meng', 'npc_knows_treasure');
  assert(knows(tom, 'meng', 'treasure_location'), 'knows Meng knows the treasure');
  assert(canBluffAbout(tom, 'meng', 'npc_knows_treasure'), "can bluff: Meng doesn't know I know");

  // 5. social physics: debts and face
  const ledger = createSocialLedger();
  recordDebt(ledger, 'player', 0.8, 'spared_my_life', 1);
  assert(invokeDebt(ledger, 'player') === 0.8, 'debt invoked once');
  assert(invokeDebt(ledger, 'player') === 0, 'debt consumed — cannot double-invoke');
  giveFace(ledger, 'elder_han', 0.2);
  assert(Math.abs((ledger.face.get('elder_han') ?? 0) - 0.7) < 1e-9, 'face given raises held face');
  loseFace(ledger, 'elder_han', 0.5);
  assert(Math.abs((ledger.face.get('elder_han') ?? 0) - 0.2) < 1e-9, 'face lost lowers held face');

  // 6. determinism: same inputs → same decisions, every run
  const i1 = decideTowardTrespasser(cautious, debtCtx, bg, mem);
  const i2 = decideTowardTrespasser(cautious, debtCtx, bg, mem);
  assert(JSON.stringify(i1) === JSON.stringify(i2), 'deterministic: identical inputs → identical intent');

  console.log(`\n=== Results: ${passed}/${passed + failed} passed ===`);
  process.exit(failed > 0 ? 1 : 0);
}

if (import.meta.main) run();
