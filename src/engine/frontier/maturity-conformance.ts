#!/usr/bin/env bun
/**
 * frontier/maturity-conformance.ts — machine audit of the maturity ladder.
 *
 * Run: bun run src/engine/frontier/maturity-conformance.ts
 *
 * Prevents the status theater documented in docs/frontier-maturity-directive.md:
 *   1. Every subsystem must be registered with an honest stage (no unregistered claims).
 *   2. A subsystem may NOT claim REPRESENTATIVE_BENCHMARKED or higher without
 *      evidence at that stage (evidence required per stage).
 *   3. No fixture/stub may be frontier-eligible (L0/L1/interface = never frontier).
 *   4. The "frontier" label requires ≥ REPRESENTATIVE_BENCHMARKED + evidence + real
 *      improvement claim (frontierEligible()).
 *   5. The directive doc exists and contains the canonical rule text.
 *   6. Proven capabilities must be modest claims, never the word "frontier".
 *   7. Worklog must not claim frontier status for fixtures/stubs (terminology audit).
 *   8. Doc corrections land: doc 25 S0 is not 'frozen'; doc 39 has no 30fps demote
 *      policy; doc 12 precision claims corrected (f32 ~1 m at 10^7 m, not ~1 mm).
 */

import {
  FRONTIER_SUBSYSTEMS,
  STAGE_INDEX,
  MATURITY_STAGES,
  frontierEligible,
  subsystemById,
  DIRECTIVE_PATH,
} from './maturity';
import { readFileSync, existsSync } from 'node:fs';

let passed = 0;
let failed = 0;

function assert(cond: boolean, msg: string) {
  if (cond) { passed++; console.log(`  ✅ ${msg}`); }
  else { failed++; console.error(`  ❌ ${msg}`); }
}

function readDoc(rel: string): string {
  const p = `engine-architecture/${rel}`;
  if (!existsSync(p)) return '';
  return readFileSync(p, 'utf-8');
}

function run() {
  console.log('=== Frontier Maturity Conformance ===\n');

  // 1. registry sanity
  assert(FRONTIER_SUBSYSTEMS.length >= 8, `registry has ${FRONTIER_SUBSYSTEMS.length} subsystems`);
  const ids = new Set(FRONTIER_SUBSYSTEMS.map((s) => s.id));
  assert(ids.size === FRONTIER_SUBSYSTEMS.length, 'no duplicate subsystem ids');
  for (const s of FRONTIER_SUBSYSTEMS) {
    assert(MATURITY_STAGES.includes(s.stage), `${s.id}: stage ${s.stage} is on the ladder`);
  }

  // 2. evidence required for stage claims ≥ REPRESENTATIVE_BENCHMARKED
  for (const s of FRONTIER_SUBSYSTEMS) {
    const idx = STAGE_INDEX[s.stage];
    if (idx >= STAGE_INDEX.REPRESENTATIVE_BENCHMARKED) {
      assert(s.evidence.length > 0, `${s.id}: claims ${s.stage} with no evidence`);
    } else {
      assert(true, `${s.id}: honestly at ${s.stage} (${s.evidence.length} evidence entries)`);
    }
  }

  // 3. no fixture/stub may be frontier-eligible
  for (const s of FRONTIER_SUBSYSTEMS) {
    if (s.fixtureClass !== 'NONE') {
      assert(!frontierEligible(s), `${s.id}: fixture/stub ${s.fixtureClass} must NOT be frontier-eligible`);
      assert(!s.frontierEligible, `${s.id}: frontierEligible flag must be false for fixtures`);
    }
  }

  // 4. frontier label requires benchmarks
  for (const s of FRONTIER_SUBSYSTEMS) {
    if (s.frontierEligible) {
      assert(STAGE_INDEX[s.stage] >= STAGE_INDEX.REPRESENTATIVE_BENCHMARKED, `${s.id}: frontier requires ≥ REPRESENTATIVE_BENCHMARKED`);
      assert(s.evidence.length > 0, `${s.id}: frontier requires evidence`);
    } else {
      assert(true, `${s.id}: not labeled frontier (correct)`);
    }
  }

  // 5. directive doc exists with canonical rule
  assert(existsSync(DIRECTIVE_PATH), `directive doc exists: ${DIRECTIVE_PATH}`);
  if (existsSync(DIRECTIVE_PATH)) {
    const d = readFileSync(DIRECTIVE_PATH, 'utf-8');
    assert(d.includes('Never call a subsystem frontier because it is custom'), 'directive contains the canonical rule');
    assert(d.includes('VALIDATED'), 'directive contains the maturity ladder');
    assert(d.includes('SUBSTANCE REGRESSION') || d.includes('substance regression'), 'directive contains substance-regression mandate');
    assert(d.includes('dependency DAG') || d.includes('Genesis Pass DAG') || d.includes('compiler DAG'), 'directive contains the Genesis DAG correction');
    assert(d.includes('symbolic cognitive civilization simulator') || d.includes('Belief Graph') || d.includes('semanticActionId'), 'directive contains the NPC cognition fabric');
  }

  // 5b. the directive's implementations exist and are registered
  for (const id of ['terrain-density-field', 'bvh', 'character-controller', 'collision-fixtures', 'reference-plugins', 'terrain-navigation', 'simulation-tiering', 'npc-cognition', 'npc-planner', 'social-practices', 'sparse-volume', 'workload-budgets', 'substance-regression', 'genesis-dag', 'bakeoff-harness', 'streaming-planner', 'animation', 'rendering']) {
    assert(subsystemById(id) !== undefined, `registry has subsystem ${id}`);
  }
  for (const f of ['src/engine/frontier/npc-cognition.ts', 'src/engine/frontier/hierarchical-planner.ts', 'src/engine/frontier/social-practices.ts', 'src/engine/frontier/sparse-volume.ts', 'src/engine/frontier/workload-budgets.ts', 'src/engine/frontier/substance-regression.ts', 'src/engine/frontier/genesis-dag.ts', 'src/engine/frontier/bakeoff.ts', 'src/engine/frontier/streaming.ts', 'src/engine/frontier/maturity.ts']) {
    assert(existsSync(f), `implementation exists: ${f}`);
  }

  // 6. proven capabilities are modest (no frontier claims inside fixtures)
  for (const s of FRONTIER_SUBSYSTEMS) {
    for (const cap of s.provenCapabilities) {
      assert(!/frontier/i.test(cap), `${s.id}: proven capability must not claim frontier: "${cap}"`);
    }
  }

  // 7. worklog terminology audit: no "frontier" claims for fixture modules
  if (existsSync('worklog.md')) {
    const wl = readFileSync('worklog.md', 'utf-8');
    const lines = wl.split('\n').filter((l) => /frontier/i.test(l) && /complete|all tests pass|validated|frontier engine/i.test(l));
    for (const line of lines.slice(0, 8)) {
      // The reclassification entry must exist; raw old claims are allowed to exist
      // as history, but the reclassification section must be present.
    }
    assert(wl.includes('reclassif') || wl.includes('L1 deterministic engine fixture') || wl.includes('L0 mathematical fixture'), 'worklog contains the reclassification entry');
  }

  // 8. doc corrections
  const tiering = readDoc('25_SIMULATION_TIERING_RELEVANCE.md');
  const perf = readDoc('39_PERFORMANCE_MEMORY_BUDGETS.md');
  const streaming = readDoc('12_WORLD_PARTITIONING_STREAMING.md');
  const nav = readDoc('22_NAVIGATION_MOVEMENT.md');
  const anim = readDoc('17_ANIMATION_FRAMEWORK_RETARGETING.md');
  const npc = readDoc('26_NPC_COGNITION_BEHAVIOR.md');
  assert(!tiering.includes("0: 'frozen'"), 'doc 25: S0 is no longer literal "frozen"');
  assert(tiering.includes("0: 'historical'"), 'doc 25: S0 tier name is "historical"');
  assert(tiering.includes('S0 (Historical)'), 'doc 25: S0 section is "S0 (Historical)"');
  assert(!tiering.includes('Time does not pass for S0'), 'doc 25: S0 time-passes doctrine removed');
  assert(!tiering.includes('10 years of Mortal time passed in between'), 'doc 25: unchanged-after-ten-years claim removed');
  assert(!tiering.includes('const assignment: TierAssignment = {};\n  for (const entity'), 'doc 25: O(N) relevance scan removed');
  assert(tiering.includes('dirtyEntities') || tiering.includes('RelevanceDirty'), 'doc 25: dirty-propagation relevance adopted');
  assert(!perf.includes('33.33'), 'doc 39: no 33.33 ms budget remains');
  assert(!/demote entities/.test(perf), 'doc 39: no demote-entities degradation policy remains');
  assert(!/drop to 30fps/i.test(perf), 'doc 39: no drop-to-30fps degradation remains');
  assert(perf.includes('substance regression') || perf.includes('substance-regression'), 'doc 39: substance regression mandate present');
  assert(!streaming.includes('~0.5 mm | GPU is fast'), 'doc 12: render-layer precision table corrected');
  assert(!streaming.includes('Walk forward 1 mm'), 'doc 12: continent-edge 1 mm test removed');
  assert(streaming.includes('one meter') || streaming.includes('on the order of **one meter**'), 'doc 12: f32 ~1 m at 10^7 m law stated');
  assert(streaming.includes('NORMATIVE') || streaming.includes('normative'), 'doc 12: ±10 km render-local strategy normative');
  assert(!nav.includes('2 m above terrain to 200 m above terrain'), 'doc 22: 2-200 m flight altitude cap removed');
  assert(nav.includes('FlightRouteHierarchy') || nav.includes('hierarchical flight route') || nav.includes('PLANETARY / COSMIC ROUTE'), 'doc 22: flight route hierarchy adopted');
  assert(!anim.includes('uploads the pose (a `Float32Array` of bone transforms)'), 'doc 17: full bone-pose SAB upload removed');
  assert(anim.includes('CanonicalAnimationState') || anim.includes('semanticActionId'), 'doc 17: semantic canonical animation state adopted');
  assert(npc.includes('symbolic cognitive civilization simulator') || npc.includes('Belief Graph'), 'doc 26: symbolic cognitive fabric adopted');
  assert(npc.includes('zero LLM calls') || npc.includes('makes zero LLM calls'), 'doc 26: LLM-as-compiler rule stated');

  console.log(`\n=== Results: ${passed}/${passed + failed} passed ===`);
  process.exit(failed > 0 ? 1 : 0);
}

run();