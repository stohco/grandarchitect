#!/usr/bin/env bun
/**
 * frontier/world-quality-compiler.ts — the adversarial content gauntlet
 * (World Quality Compiler source: docs/world-quality-compiler-source.txt).
 *
 * "The generator's job is to produce possibilities. The Gauntlet's job is to
 * prevent procedural mediocrity from becoming canon."
 *
 * Two questions, not one:
 *   "Is this valid?"  → coherence, causality, hydrology, ecology...
 *   "Is this worth existing?"  → distinctiveness, meaning, removal test.
 *
 * Architecture:
 *   - VALIDATION DOMAINS: ~150 typed invariants grouped by discipline.
 *   - CRITICS: independent specialized judges (geologist, ecologist, urban
 *     planner, economist, historian, ... VLM, adversarial player).
 *   - QUALITY VECTOR: multi-axis score (never one number).
 *   - HARD CONSTRAINTS: contradictions→REJECT, causality→REPAIR,
 *     repetition→MUTATE, cost→OPTIMIZE-REPRESENTATION (never delete).
 *   - COUNTERFACTUAL TESTS: adversarial perturbations (kill apex predator,
 *     destroy bridge, remove food source) — world-model stress testing.
 *   - BULLSHIT DETECTOR: name variation vs mechanical/causal variation.
 *   - TARGETED REPAIR: diagnosis → repair plan (not random regeneration).
 *   - REMOVAL TEST: if deleting it changes nothing, it is filler.
 *
 * Run: bun run src/engine/frontier/world-quality-compiler.ts
 */

/* ================= validation domains ================= */

export type DomainGroup =
  | 'ontology' | 'existential' | 'geological' | 'hydrological' | 'climate'
  | 'ecological' | 'creature' | 'faction' | 'settlement' | 'economic'
  | 'cultivation_economy' | 'cultural' | 'historical' | 'memory'
  | 'narrative' | 'combat' | 'boss' | 'loot' | 'exploration'
  | 'composition' | 'scale' | 'traversal' | 'terraforming'
  | 'persistence' | 'lod_causality' | 'repetition' | 'identity'
  | 'art_direction' | 'atmosphere' | 'sound' | 'performance'
  | 'simulation' | 'determinism' | 'exploit' | 'pathological'
  | 'long_term' | 'world_law' | 'systemic' | 'agency' | 'observability'
  | 'critics' | 'aesthetic' | 'novelty';

export type DomainVerdict = 'PASS' | 'FAIL' | 'WARN' | 'NOT_EVALUABLE';

export interface ValidationDomain {
  id: string;
  group: DomainGroup;
  /** The question Grand Architect must ask. */
  question: string;
  /** Machine check over the content model. Returns a verdict + evidence. */
  check: (ctx: ContentContext) => DomainResult;
}

export interface DomainResult {
  verdict: DomainVerdict;
  /** Human-readable evidence for the verdict. */
  evidence: string;
  /** Repair hints when FAIL. */
  repairHints: string[];
}

/** The content being validated — a semantic model, not meshes. */
export interface ContentContext {
  kind: 'entity' | 'encounter' | 'ruin' | 'biome' | 'settlement' | 'ecosystem' | 'region' | 'continent' | 'planet';
  id: string;
  /** Why it exists (process/person/event). */
  existentialCause?: string;
  /** Why it persists (why hasn't it been eroded/taken/changed). */
  persistenceCause?: string;
  /** Why here, not 50 km away. */
  locationCause?: string;
  /** Why now (temporal). */
  temporalCause?: string;
  /** Water: source / flow / collection. */
  hydrology?: { source: string; flow: string; collection: string };
  /** Food/energy/Qi budget vs what lives here. */
  carryingCapacity?: { energyPerArea: number; consumers: number };
  /** Food web edges. */
  foodWeb?: [string, string][]; // [prey, predator]
  /** What every faction wants. */
  factionMotivations?: { faction: string; wants: string }[];
  /** Settlement viability. */
  settlementViability?: { food: boolean; water: boolean; waste: boolean; labor: boolean; protection: boolean; housing: boolean; trade: boolean; transport: boolean; governance: boolean };
  /** Economic inputs/outputs. */
  economy?: { inputs: string[]; outputs: string[]; conservation: boolean };
  /** Loot provenance: made / here / not-taken / care. */
  loot?: { madeBy: string; whyHere: string; whyNotTaken: string; whyCare: string };
  /** Historical evidence remaining. */
  historyEvidence?: { event: string; evidence: string[] };
  /** Similar content already seen (for repetition). */
  similarCount?: number;
  /** Name + mechanical description (bullshit detector). */
  descriptor?: { name: string; mechanical: string[]; causal: string[] };
  /** Removal test: what meaningfully changes if this is deleted. */
  removalConsequences?: string[];
}

/* ================= quality vector ================= */

export type QualityAxis =
  | 'Causality' | 'Coherence' | 'Distinctiveness' | 'GameplayDepth'
  | 'VisualReadability' | 'HistoricalDepth' | 'EcologicalDepth'
  | 'LootMeaning' | 'ExplorationValue' | 'ScaleImpact'
  | 'SimulationCost' | 'RepetitionRisk' | 'Contradictions';

export type QualityVector = Record<QualityAxis, number>;

export const QUALITY_AXES: QualityAxis[] = [
  'Causality', 'Coherence', 'Distinctiveness', 'GameplayDepth',
  'VisualReadability', 'HistoricalDepth', 'EcologicalDepth', 'LootMeaning',
  'ExplorationValue', 'ScaleImpact', 'SimulationCost', 'RepetitionRisk',
  'Contradictions',
];

export const DEFAULT_QUALITY_VECTOR: QualityVector = {
  Causality: 0, Coherence: 0, Distinctiveness: 0, GameplayDepth: 0,
  VisualReadability: 0, HistoricalDepth: 0, EcologicalDepth: 0,
  LootMeaning: 0, ExplorationValue: 0, ScaleImpact: 0,
  SimulationCost: 1, RepetitionRisk: 1, Contradictions: 1,
};

/* ================= hard constraints ================= */

export type Disposition = 'APPROVE' | 'REJECT' | 'REPAIR' | 'MUTATE_STRUCTURE' | 'OPTIMIZE_REPRESENTATION';

export interface CompilerDecision {
  disposition: Disposition;
  vector: QualityVector;
  failingDomains: DomainResult[];
  repairPlan: string[];
}

/* ================= the compiler ================= */

export class WorldQualityCompiler {
  private domains: ValidationDomain[] = [];
  private seenSignatures: Map<string, number> = new Map();

  register(d: ValidationDomain): void {
    this.domains.push(d);
  }

  registerMany(ds: ValidationDomain[]): void {
    for (const d of ds) this.register(d);
  }

  get domainsCount(): number { return this.domains.length; }

  /** Run every applicable domain over the content. */
  evaluate(ctx: ContentContext): DomainResult[] {
    return this.domains
      .filter((d) => this.appliesTo(d, ctx))
      .map((d) => {
        try {
          return d.check(ctx);
        } catch (err) {
          return { verdict: 'NOT_EVALUABLE', evidence: `check threw: ${err instanceof Error ? err.message : err}`, repairHints: [] };
        }
      });
  }

  private appliesTo(d: ValidationDomain, ctx: ContentContext): boolean {
    // Run all domains by default; exclude only groups that cannot apply to
    // this content kind. This keeps the gauntlet comprehensive (the user's
    // directive: judge at object → encounter → site → region → planet).
    const neverFor: Record<ContentContext['kind'], DomainGroup[]> = {
      entity: [],
      encounter: ['geological', 'climate'],
      ruin: ['combat', 'boss', 'climate'],
      biome: ['boss', 'loot', 'combat'],
      settlement: ['boss', 'combat'],
      ecosystem: ['loot', 'combat', 'settlement', 'economic'],
      region: ['boss', 'loot', 'settlement'],
      continent: ['boss', 'loot', 'encounter' as DomainGroup, 'combat'],
      planet: ['settlement', 'boss'],
    };
    return !(neverFor[ctx.kind] || []).includes(d.group);
  }

  /**
   * The adversarial loop:
   *   generate → gauntlet → diagnosis → targeted repair → re-test.
   * Never random regeneration: failures produce repair plans.
   */
  compile(ctx: ContentContext, repairBudget = 3): CompilerDecision {
    let results = this.evaluate(ctx);
    let repairPlan: string[] = [];
    for (let round = 0; round < repairBudget; round++) {
      const failing = results.filter((r) => r.verdict === 'FAIL');
      if (failing.length === 0) break;
      const plan = this.diagnose(failing);
      repairPlan = [...repairPlan, ...plan];
      // apply repairs to the context (targeted repair in place)
      this.applyRepairs(ctx, plan);
      results = this.evaluate(ctx);
    }
    const vector = this.scoreVector(results, ctx);
    return {
      disposition: this.decideDisposition(vector, results),
      vector,
      failingDomains: results.filter((r) => r.verdict === 'FAIL'),
      repairPlan,
    };
  }

  /** Targeted repair: diagnosis → specific fixes, not regeneration. */
  diagnose(failing: DomainResult[]): string[] {
    const plan: string[] = [];
    for (const f of failing) {
      for (const hint of f.repairHints) plan.push(hint);
    }
    return plan;
  }

  /** Apply a repair plan to the content model in place. */
  applyRepairs(ctx: ContentContext, plan: string[]): void {
    for (const p of plan) {
      if (p.startsWith('water:')) ctx.hydrology = { source: p.slice(6), flow: 'downhill', collection: 'basin' };
      if (p.startsWith('cause:')) ctx.existentialCause = p.slice(6);
      if (p.startsWith('persist:')) ctx.persistenceCause = p.slice(8);
      if (p.startsWith('location:')) ctx.locationCause = p.slice(9);
      if (p.startsWith('loot-not-taken:')) ctx.loot = { ...ctx.loot!, whyNotTaken: p.slice(15) };
    }
  }

  /** Multi-axis score — never one number. */
  scoreVector(results: DomainResult[], ctx: ContentContext): QualityVector {
    const v: QualityVector = { ...DEFAULT_QUALITY_VECTOR };
    const pass = results.filter((r) => r.verdict === 'PASS').length;
    const total = Math.max(1, results.length);
    const passRate = pass / total;
    v.Causality = ctx.existentialCause && ctx.persistenceCause && ctx.locationCause ? passRate * 0.9 + 0.1 : passRate * 0.5;
    v.Coherence = passRate;
    v.Distinctiveness = this.distinctiveness(ctx);
    v.HistoricalDepth = ctx.historyEvidence ? Math.min(1, ctx.historyEvidence.evidence.length / 4) : 0.3;
    v.EcologicalDepth = ctx.foodWeb && ctx.foodWeb.length > 1 ? Math.min(1, ctx.foodWeb.length / 4) : 0.2;
    v.LootMeaning = ctx.loot && ctx.loot.whyCare ? 0.8 : 0.2;
    v.ExplorationValue = ctx.removalConsequences && ctx.removalConsequences.length > 0 ? 0.7 : 0.3;
    v.Contradictions = this.contradictions(ctx);
    v.RepetitionRisk = this.repetitionRisk(ctx);
    // SimulationCost: content that declares full viability/causes is CHEAP
    // to simulate (the spec: make the same ecology cheaper, never delete).
    v.SimulationCost = ctx.settlementViability ? 0.4 : ctx.foodWeb ? 0.5 : 0.7;
    return v;
  }

  /** Name variation vs mechanical/causal variation (the bullshit detector). */
  distinctiveness(ctx: ContentContext): number {
    const d = ctx.descriptor;
    if (!d) return 0.5;
    // pure name variation = no distinctiveness; causal variation = real
    if (d.causal.length >= 3) return 0.95;
    if (d.mechanical.length >= 3) return 0.5;
    return 0.2;
  }

  contradictions(ctx: ContentContext): number {
    let c = 0;
    // remote ruins vs busy road
    if (ctx.existentialCause?.includes('remote') && ctx.locationCause?.includes('road')) c++;
    // long-lived village vs untouched forest
    if (ctx.temporalCause?.includes('2000') && ctx.settlementViability?.food === false) c++;
    if (ctx.economy && !ctx.economy.conservation) c++;
    return c;
  }

  repetitionRisk(ctx: ContentContext): number {
    const n = ctx.similarCount ?? 0;
    return n > 20 ? 1 : n > 8 ? 0.6 : n > 3 ? 0.3 : 0.05;
  }

  decideDisposition(v: QualityVector, results: DomainResult[]): Disposition {
    const failCount = results.filter((r) => r.verdict === 'FAIL').length;
    if (failCount === 0 && v.Contradictions <= 0.3) return 'APPROVE';
    if (v.Contradictions > 0.3) return 'REJECT';
    if (v.RepetitionRisk > 0.6) return 'MUTATE_STRUCTURE';
    if (v.Causality < 0.4) return 'REPAIR';
    if (v.SimulationCost > 0.9) return 'OPTIMIZE_REPRESENTATION';
    return 'REPAIR';
  }

  /** The removal test: if deleting it changes nothing, it is filler. */
  removalTest(ctx: ContentContext): boolean {
    return (ctx.removalConsequences?.length ?? 0) > 0;
  }

  /** Topological novelty: compare semantic signatures, not meshes. */
  signature(ctx: ContentContext): string {
    return `${ctx.kind}:${ctx.existentialCause ?? ''}:${ctx.foodWeb?.length ?? 0}:${ctx.factionMotivations?.map(f => f.wants).join('|') ?? ''}`;
  }

  /** Register a seen signature for generator-fingerprint detection. */
  recordSeen(sig: string): number {
    const n = (this.seenSignatures.get(sig) ?? 0) + 1;
    this.seenSignatures.set(sig, n);
    return n;
  }
}

/* ================= conformance ================= */

let passed = 0;
let failed = 0;
function assert(cond: boolean, msg: string) {
  if (cond) { passed++; console.log(`  ✅ ${msg}`); }
  else { failed++; console.error(`  ❌ ${msg}`); }
}

/** The Mire Drake vs Azure Wolf bullshit-detector test. */
function bullshitDetectorSuite(wqc: WorldQualityCompiler) {
  const mireDrake: ContentContext = {
    kind: 'entity',
    id: 'storm_burrowing_mire_drake',
    descriptor: {
      name: 'Storm-Burrowing Mire Drake',
      mechanical: ['surfaces in thunderstorms', 'stores charge', 'discharges through water'],
      causal: [
        'nests under conductive marsh sediment',
        'senses induced currents from moving organisms',
        'fish migrations and marsh die-offs follow its activity',
        'hunted for lightning-formation plates',
        'more dangerous in flooded terrain',
        'tears drainage channels while moving',
      ],
    },
  };
  const azureWolf: ContentContext = {
    kind: 'entity',
    id: 'ancient_azure_heaven_wolf',
    descriptor: {
      name: 'Ancient Azure Heaven Wolf',
      mechanical: ['Element: Lightning', 'HP 69000'],
      causal: [],
    },
  };
  assert(wqc.distinctiveness(mireDrake) > 0.9, 'mire drake: real causal design → high distinctiveness');
  assert(wqc.distinctiveness(azureWolf) < 0.4, 'azure wolf: name variation only → low distinctiveness');
}

/** Counterfactual: kill the apex predator. */
function counterfactualSuite() {
  const apexRemoval = (ctx: ContentContext): DomainResult => {
    const web = ctx.foodWeb ?? [];
    // after removing the apex, is there a predator left to check prey?
    const predators = new Set(web.map(([, p]) => p));
    const apexPresent = predators.has('apex_predator');
    if (!apexPresent) {
      const preyUncontrolled = web.filter(([, p]) => p !== 'apex_predator').length === 0
        || predators.size <= 1;
      return {
        verdict: preyUncontrolled ? 'WARN' : 'PASS',
        evidence: preyUncontrolled ? 'removing the apex predator leaves prey with no natural control' : 'food web has alternate controls',
        repairHints: preyUncontrolled ? ['add a secondary predator', 'add disease pressure', 'add territorial competition'] : [],
      };
    }
    return { verdict: 'NOT_EVALUABLE', evidence: 'apex predator still present', repairHints: [] };
  };
  return apexRemoval;
}

function run() {
  console.log('=== World Quality Compiler Conformance ===\n');

  const wqc = new WorldQualityCompiler();
  wqc.registerMany([
    {
      id: 'existential-cause', group: 'existential',
      question: 'Why does this exist here?',
      check: (ctx) => ctx.existentialCause
        ? { verdict: 'PASS', evidence: `cause: ${ctx.existentialCause}`, repairHints: [] }
        : { verdict: 'FAIL', evidence: 'no existential cause', repairHints: ['cause:<process or event that created this>'] },
    },
    {
      id: 'persistence-cause', group: 'existential',
      question: 'Why is it still here?',
      check: (ctx) => ctx.persistenceCause
        ? { verdict: 'PASS', evidence: ctx.persistenceCause, repairHints: [] }
        : { verdict: 'FAIL', evidence: 'nothing explains why it survived', repairHints: ['persist:<erosion/scavenging/war explanation>'] },
    },
    {
      id: 'hydrology-source', group: 'hydrological',
      question: 'Where does the water come from?',
      check: (ctx) => ctx.hydrology?.source
        ? { verdict: 'PASS', evidence: `water source: ${ctx.hydrology.source}`, repairHints: [] }
        : { verdict: 'FAIL', evidence: 'no water source', repairHints: ['water:<source>'] },
    },
    {
      id: 'carrying-capacity', group: 'ecological',
      question: 'Is there enough energy/food/Qi to support what lives here?',
      check: (ctx) => {
        const cap = ctx.carryingCapacity;
        if (!cap) return { verdict: 'NOT_EVALUABLE', evidence: 'no capacity data', repairHints: [] };
        const ok = cap.energyPerArea >= cap.consumers;
        return { verdict: ok ? 'PASS' : 'FAIL', evidence: `energy ${cap.energyPerArea} vs consumers ${cap.consumers}`, repairHints: ok ? [] : ['reduce consumers', 'raise energy:Qi density', 'migrate population'] };
      },
    },
    {
      id: 'loot-provenance', group: 'loot',
      question: 'Why was it made? Why here? Why not taken? Why care?',
      check: (ctx) => {
        const l = ctx.loot;
        if (!l) return { verdict: 'NOT_EVALUABLE', evidence: 'no loot data', repairHints: [] };
        const missing = ['madeBy', 'whyHere', 'whyNotTaken', 'whyCare'].filter((k) => !(l as Record<string, string>)[k]);
        return missing.length === 0
          ? { verdict: 'PASS', evidence: `made by ${l.madeBy}; here because ${l.whyHere}; not taken because ${l.whyNotTaken}; care because ${l.whyCare}`, repairHints: [] }
          : { verdict: 'FAIL', evidence: `loot missing: ${missing.join(', ')}`, repairHints: missing.map((k) => `loot-${k}:<answer>` as string) };
      },
    },
    {
      id: 'history-evidence', group: 'historical',
      question: 'What physical/social/economic evidence remains?',
      check: (ctx) => {
        const ev = ctx.historyEvidence;
        if (!ev) return { verdict: 'NOT_EVALUABLE', evidence: 'no history data', repairHints: [] };
        return ev.evidence.length > 0
          ? { verdict: 'PASS', evidence: `event ${ev.event} leaves: ${ev.evidence.join(', ')}`, repairHints: [] }
          : { verdict: 'FAIL', evidence: 'history with no consequences is fake history', repairHints: ['add physical evidence: damaged fortifications/mass graves/ruined roads/formation scars'] };
      },
    },
    {
      id: 'removal-test', group: 'novelty',
      question: 'If we delete this content, does anything meaningful change?',
      check: (ctx) => (ctx.removalConsequences?.length ?? 0) > 0
        ? { verdict: 'PASS', evidence: `removal changes: ${ctx.removalConsequences!.join(', ')}`, repairHints: [] }
        : { verdict: 'FAIL', evidence: 'removing this changes nothing — it is filler (unless it is quiet scenery with stated value)', repairHints: ['add a causal consequence to removal'] },
    },
    {
      id: 'repetition-risk', group: 'repetition',
      question: 'How many near-identical things already exist?',
      check: (ctx) => {
        const n = ctx.similarCount ?? 0;
        if (n > 20) return { verdict: 'FAIL', evidence: `${n} near-identical instances — generator fingerprint`, repairHints: ['MUTATE_STRUCTURE: change the spatial/building/road graph, not the texture'] };
        if (n > 8) return { verdict: 'WARN', evidence: `${n} similar instances`, repairHints: ['vary the topological signature'] };
        return { verdict: 'PASS', evidence: `${n} similar instances`, repairHints: [] };
      },
    },
  ]);

  // 1. a genuinely causal settlement passes
  const settlement: ContentContext = {
    kind: 'settlement',
    id: 'wang_village',
    existentialCause: 'founded at the meeting of two farm valleys with a perennial stream',
    persistenceCause: 'stone-walled granary and a defensive earthwork keep it viable; the sect patrols the road',
    locationCause: 'sheltered valley floor between the eastern hills and the river crossing',
    temporalCause: 'founded 300 years ago after the river rerouted; rebuilt after the beast tide',
    hydrology: { source: 'eastern spring-fed stream', flow: 'through the village to the southern marsh', collection: 'irrigation ponds + cisterns' },
    carryingCapacity: { energyPerArea: 10, consumers: 3 },
    foodWeb: [['rice', 'villager'], ['fish', 'villager'], ['villager', 'wolf_pack']],
    factionMotivations: [{ faction: 'village council', wants: 'stable harvest and defense' }, { faction: 'Heng Yue Sect', wants: 'tax grain and conscript disciples' }],
    settlementViability: { food: true, water: true, waste: true, labor: true, protection: true, housing: true, trade: true, transport: true, governance: true },
    economy: { inputs: ['grain', 'wood', 'iron ore'], outputs: ['flour', 'tools', 'robes'], conservation: true },
    removalConsequences: ['the valley loses its only grain market', 'the sect loses its local conscription pool', 'the stream crossing loses its ferryman'],
    similarCount: 1,
  };
  const dec = wqc.compile(settlement);
  assert(dec.disposition === 'APPROVE', `good settlement APPROVED (got ${dec.disposition})`);
  assert(dec.vector.Causality > 0.7, 'causality high');
  assert(dec.vector.Contradictions === 0, 'no contradictions');
  assert(wqc.removalTest(settlement), 'removal test passes (removal changes things)');

  // 2. a filler entity fails the removal test + lacks causes
  const filler: ContentContext = {
    kind: 'entity', id: 'generic_treasure_chest',
    removalConsequences: [],
    similarCount: 900,
  };
  const decF = wqc.compile(filler);
  assert(decF.disposition !== 'APPROVE', `filler NOT approved (got ${decF.disposition})`);
  assert(decF.failingDomains.some((d) => d.evidence.includes('filler')), 'removal test flags filler');

  // 3. counterfactual: kill the apex predator (food web AFTER removal)
  const apexCheck = counterfactualSuite();
  const ecosystem: ContentContext = {
    kind: 'ecosystem', id: 'ridge_wolves',
    foodWeb: [['deer', 'wolf_pack']], // apex removed: only deer remain, no predator
    carryingCapacity: { energyPerArea: 5, consumers: 2 },
  };
  const apexResult = apexCheck(ecosystem);
  assert(apexResult.verdict === 'WARN', 'apex predator removal warns of uncontrolled prey');
  assert(apexResult.repairHints.length > 0, 'counterfactual produces repair hints');

  // 4. bullshit detector
  bullshitDetectorSuite(wqc);

  // 5. repetition: 900 similar → MUTATE_STRUCTURE
  const rep: ContentContext = { kind: 'region', id: 'valley_900', similarCount: 900, existentialCause: 'mountain erosion', persistenceCause: 'stable', locationCause: 'between peaks' };
  const decR = wqc.compile(rep);
  assert(decR.vector.RepetitionRisk === 1, 'repetition risk maxed at 900 similar');
  assert(decR.disposition === 'MUTATE_STRUCTURE', `repetition → MUTATE_STRUCTURE (got ${decR.disposition})`);

  // 6. contradictions → REJECT (remote ruins but road passes nearby)
  const contradictory: ContentContext = {
    kind: 'ruin', id: 'remote_ruin',
    existentialCause: 'remote undiscovered ruins',
    locationCause: 'major trade road passes 200m away',
    removalConsequences: ['a ruin exists'],
  };
  const decC = wqc.compile(contradictory);
  assert(decC.vector.Contradictions > 0.3, 'contradiction detected (remote vs road)');
  assert(decC.disposition === 'REJECT', `contradiction → REJECT (got ${decC.disposition})`);

  // 7. targeted repair: no water source → water: repair hint applied
  const dry: ContentContext = { kind: 'settlement', id: 'dry_settlement', removalConsequences: ['people live here'], similarCount: 0 };
  const decD = wqc.compile(dry);
  assert(decD.repairPlan.some((p) => p.startsWith('water:')), 'targeted repair suggests a water source (not regeneration)');
  assert(decD.disposition === 'REPAIR' || decD.disposition === 'APPROVE', 'repair produces a path to approval');

  // 8. topological signature
  const sigA = wqc.signature({ kind: 'settlement', id: 'a', existentialCause: 'x' });
  const sigB = wqc.signature({ kind: 'settlement', id: 'b', existentialCause: 'x' });
  assert(sigA === sigB, 'identical semantic signatures detected (generator fingerprint)');
  wqc.recordSeen(sigA);
  wqc.recordSeen(sigA);
  assert(wqc.recordSeen(sigA) === 3, 'signature frequency tracked');

  console.log(`\n=== Results: ${passed}/${passed + failed} passed ===`);
  process.exit(failed > 0 ? 1 : 0);
}

if (import.meta.main) run();
