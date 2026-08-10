#!/usr/bin/env bun
/**
 * frontier/genesis-dag.ts — Genesis Pass DAG (directive §15).
 *
 * The 80-pass taxonomy is a COVERAGE list, not an execution loop. Execution is
 * a compiler DAG:
 *
 *   scene request → scene universe slice → dependency resolver →
 *   terrain/ecology/household → dressing → Director → Vision
 *
 * Properties:
 *   - DEPENDENCY-DRIVEN: a pass runs only after its dependencies' outputs exist.
 *   - DIRTY PROPAGATION: changing the roof material invalidates only
 *     roof-dependent outputs (weather appearance, visual evidence) — NOT
 *     ecology, geology, or character generation.
 *   - APPLICABILITY ROUTING: each pass declares which scene facets it applies
 *     to; inapplicable passes are skipped without "running".
 *   - CACHEABLE OUTPUTS: pass outputs are content-hashed; unchanged inputs →
 *     cache hit → zero recompute.
 *
 * This is the machine-audited replacement for "run pass 1..80 sequentially."
 *
 * Run: bun run src/engine/frontier/genesis-dag.ts
 */

export type GenesisPassKind =
  | 'terrain' | 'ecology' | 'household' | 'economy' | 'geology' | 'water'
  | 'vegetation' | 'dressing' | 'director' | 'vision' | 'population' | 'history';

export interface GenesisPass {
  id: string;
  kind: GenesisPassKind;
  /** Pass ids whose outputs this pass consumes. */
  dependsOn: string[];
  /** Scene facets this pass produces (for dirty propagation). */
  produces: string[];
  /** Scene facets this pass reads (changes to these invalidate it). */
  reads: string[];
  /** Deterministic execution; returns an output descriptor. */
  run: (ctx: DAGContext) => string;
}

export interface DAGContext {
  tick: number;
  request: SceneRequest;
  outputs: Map<string, PassOutput>;
  changedFacets: Set<string>;
}

export interface SceneRequest {
  seed: number;
  location: { x: number; z: number };
  scope: 'village' | 'region' | 'planet';
  /** Explicitly requested facets (e.g. ['roof_material']) — everything else is resolved by the DAG. */
  requestedFacets: string[];
}

export interface PassOutput {
  passId: string;
  facets: string[];
  hash: string;
  data: string;
}

export class GenesisDAG {
  passes: Map<string, GenesisPass> = new Map();
  outputs: Map<string, PassOutput> = new Map();
  executed: string[] = [];
  cacheHits = 0;
  private skipIfInapplicable = false;

  register(p: GenesisPass): void {
    if (this.passes.has(p.id)) throw new Error(`duplicate genesis pass ${p.id}`);
    this.passes.set(p.id, p);
  }

  /**
   * Applicability closure: a pass applies if it produces a requested facet,
   * OR if any applying pass reads one of its produced facets (transitive).
   * So dressing→director→vision all apply when the roof material changes,
   * while geology/ecology stay skipped unless their own facets are requested.
   * Scope gating: household/dressing are village-scope only.
   */
  applicableClosure(request: SceneRequest, requestedFacets: Set<string>): Set<string> {
    const applying = new Set<string>();
    let changed = true;
    while (changed) {
      changed = false;
      for (const p of this.passes.values()) {
        if (applying.has(p.id)) continue;
        if (request.scope === 'planet' && ['household', 'dressing'].includes(p.kind)) continue;
        const producesRequested = p.produces.some((f) => requestedFacets.has(f));
        const feedsApplying = [...this.passes.values()].some((q) =>
          applying.has(q.id) && q.reads.some((f) => p.produces.includes(f)),
        );
        if (producesRequested || feedsApplying) {
          applying.add(p.id);
          changed = true;
        }
      }
    }
    return applying;
  }

  /** A pass applies when any of its produced facets is requested (directly or transitively). */
  appliesTo(p: GenesisPass, request: SceneRequest, requestedFacets: Set<string>): boolean {
    return this.applicableClosure(request, requestedFacets).has(p.id);
  }

  /** Which facets does the request need? Directly requested + transitively produced by applies. */
  resolveRequestedFacets(request: SceneRequest): Set<string> {
    const requested = new Set(request.requestedFacets);
    // terrain/geology/water are prerequisites of almost everything at village scope
    if (request.scope === 'village') {
      requested.add('terrain');
      requested.add('geology');
      requested.add('water');
    }
    return requested;
  }

  /**
   * Execute the DAG for a request. Returns { executed, cacheHits, outputs }.
   * Dirty propagation: pass P runs iff (a) it applies, (b) all deps ran,
   * (c) it has no cached output, or (d) a facet it reads or produces changed.
   * `changedFacets` = facets explicitly changed since the last request
   * (default: none — an identical request is a pure cache hit).
   */
  execute(request: SceneRequest, changedFacets?: Iterable<string>): { executed: string[]; cacheHits: number; outputs: Map<string, PassOutput> } {
    this.executed = [];
    this.cacheHits = 0;
    const cacheCounted = new Set<string>();
    const ctx: DAGContext = {
      tick: 1,
      request,
      outputs: this.outputs,
      changedFacets: new Set(changedFacets ?? []),
    };
    const requestedFacets = this.resolveRequestedFacets(request);

    const runPass = (p: GenesisPass, seen: Set<string>): void => {
      if (seen.has(p.id)) throw new Error(`cycle in genesis DAG at ${p.id}`);
      seen.add(p.id);
      // dependencies first (topological)
      for (const dep of p.dependsOn) {
        const d = this.passes.get(dep);
        if (!d) throw new Error(`genesis pass ${p.id} depends on missing ${dep}`);
        runPass(d, seen);
      }
      seen.delete(p.id); // per-path cycle detection — shared deps (geology) are legal
      if (!this.appliesTo(p, request, requestedFacets)) return; // applicability routing
      if (this.executed.includes(p.id)) return; // already ran via another path this request
      // dirty check: run only if a read OR produced facet changed, or no cached output exists
      const cached = this.outputs.get(p.id);
      const touched = p.reads.some((f) => ctx.changedFacets.has(f)) || p.produces.some((f) => ctx.changedFacets.has(f));
      if (cached && !touched && cached.passId === p.id) {
        if (!cacheCounted.has(p.id)) { this.cacheHits++; cacheCounted.add(p.id); }
        return; // cache hit — zero recompute
      }
      const data = p.run(ctx);
      const out: PassOutput = {
        passId: p.id,
        facets: [...p.produces],
        hash: hashStr(data),
        data,
      };
      this.outputs.set(p.id, out);
      this.executed.push(p.id);
      // propagate the facets this pass produced as changed
      for (const f of p.produces) ctx.changedFacets.add(f);
    };

    const seen = new Set<string>();
    for (const p of this.passes.values()) runPass(p, seen);
    return { executed: [...this.executed], cacheHits: this.cacheHits, outputs: this.outputs };
  }

  /** Invalidate outputs touching a facet (dirty propagation entry point). */
  invalidateFacet(facet: string): void {
    for (const [id, out] of this.outputs) {
      if (out.facets.includes(facet)) this.outputs.delete(id);
    }
  }
}

function hashStr(s: string): string {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(h, 31) + s.charCodeAt(i)) | 0;
  return h.toString(36);
}

/* ---------------- conformance ---------------- */

let passed = 0;
let failed = 0;
function assert(cond: boolean, msg: string) {
  if (cond) { passed++; console.log(`  ✅ ${msg}`); }
  else { failed++; console.error(`  ❌ ${msg}`); }
}

const pass = (id: string, kind: GenesisPassKind, dependsOn: string[], produces: string[], reads: string[], tag: string): GenesisPass => ({
  id, kind, dependsOn, produces, reads,
  run: (ctx) => `${id}:${tag}:${ctx.request.seed}`,
});

function buildDag(): GenesisDAG {
  const dag = new GenesisDAG();
  dag.register(pass('geology', 'geology', [], ['geology'], ['seed'], 'geo'));
  dag.register(pass('terrain', 'terrain', ['geology'], ['terrain'], ['geology'], 'terr'));
  dag.register(pass('water', 'water', ['terrain'], ['water'], ['terrain'], 'wat'));
  dag.register(pass('vegetation', 'vegetation', ['terrain', 'water'], ['vegetation'], ['terrain', 'water'], 'veg'));
  dag.register(pass('ecology', 'ecology', ['terrain', 'water', 'vegetation'], ['ecology'], ['terrain', 'vegetation'], 'eco'));
  dag.register(pass('household', 'household', ['terrain'], ['household'], ['terrain'], 'hh'));
  dag.register(pass('economy', 'economy', ['household', 'ecology'], ['economy'], ['household', 'ecology'], 'econ'));
  dag.register(pass('dressing', 'dressing', ['terrain', 'household', 'vegetation', 'water'], ['dressing', 'roof_material'], ['terrain', 'household', 'vegetation'], 'dress'));
  dag.register(pass('director', 'director', ['dressing', 'ecology', 'economy'], ['shot_plan'], ['roof_material', 'ecology', 'economy'], 'dir'));
  dag.register(pass('vision', 'vision', ['director'], ['visual_evidence'], ['shot_plan'], 'vis'));
  return dag;
}

function run() {
  console.log('=== Genesis Pass DAG Conformance ===\n');

  const dag = buildDag();

  // full village render: the scene slice requests its facets explicitly
  const FULL_SLICE = { seed: 42, location: { x: 0, z: 0 }, scope: 'village' as const, requestedFacets: ['roof_material', 'ecology', 'economy', 'shot_plan', 'visual_evidence'] };
  const r1 = dag.execute(FULL_SLICE);
  assert(r1.executed.length === 10, `full village runs 10 passes (ran ${r1.executed.length})`);
  assert(r1.executed.indexOf('geology') < r1.executed.indexOf('terrain'), 'geology before terrain (topological)');
  assert(r1.executed.indexOf('terrain') < r1.executed.indexOf('water'), 'terrain before water');
  assert(r1.executed.indexOf('dressing') < r1.executed.indexOf('director'), 'dressing before director');
  assert(r1.executed.indexOf('director') < r1.executed.indexOf('vision'), 'director before vision');
  assert(r1.cacheHits === 0, 'first run: no cache hits');

  // identical re-run: all cached, zero recompute
  const r2 = dag.execute(FULL_SLICE);
  assert(r2.cacheHits === 10, `re-run: 10 cache hits (got ${r2.cacheHits})`);
  assert(r2.executed.length === 0, 're-run: nothing executed');

  // ROOF MATERIAL change: only dressing/director/vision rerun — NOT ecology/geology
  const r3 = dag.execute(FULL_SLICE, ['roof_material']);
  assert(r3.executed.length === 3, `roof change reruns 3 passes (got ${r3.executed.length}: ${r3.executed.join(',')})`);
  assert(r3.executed.includes('dressing') && r3.executed.includes('director') && r3.executed.includes('vision'), 'roof change propagates dressing→director→vision');
  assert(!r3.executed.includes('ecology'), 'roof change does NOT rerun ecology');
  assert(!r3.executed.includes('geology'), 'roof change does NOT rerun geology');
  assert(!r3.executed.includes('household'), 'roof change does NOT rerun character generation');

  // ecology change: ecology + economy + director + vision, NOT geology/terrain
  dag.invalidateFacet('ecology');
  const r4 = dag.execute(FULL_SLICE, ['ecology']);
  assert(r4.executed.includes('ecology') && r4.executed.includes('economy'), 'ecology change reruns ecology+economy');
  assert(r4.executed.includes('director') && r4.executed.includes('vision'), 'ecology change propagates to director+vision');
  assert(!r4.executed.includes('terrain') && !r4.executed.includes('geology'), 'ecology change does NOT rerun terrain/geology');

  // planet scope: household/dressing inapplicable (routing)
  const r5 = dag.execute({ seed: 7, location: { x: 0, z: 0 }, scope: 'planet', requestedFacets: ['terrain'] });
  assert(!r5.executed.includes('household'), 'planet scope skips household (applicability routing)');
  assert(!r5.executed.includes('dressing'), 'planet scope skips dressing');

  // cycle detection
  const bad = new GenesisDAG();
  bad.register(pass('a', 'terrain', ['b'], ['a'], [], 'a'));
  bad.register(pass('b', 'water', ['a'], ['b'], [], 'b'));
  let cycleCaught = false;
  try { bad.execute({ seed: 1, location: { x: 0, z: 0 }, scope: 'village', requestedFacets: ['a'] }); } catch { cycleCaught = true; }
  assert(cycleCaught, 'cycle in DAG is detected');

  console.log(`\n=== Results: ${passed}/${passed + failed} passed ===`);
  process.exit(failed > 0 ? 1 : 0);
}

if (import.meta.main) run();
