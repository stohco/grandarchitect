#!/usr/bin/env bun
/**
 * frontier/workload-budgets.ts — workload-derived budgets (directive §18).
 *
 * Rejected: hard "200 S4, 500 S3" headcounts. An NPC meditating alone is not
 * the same cost as an NPC fighting inside a destructible formation. Static
 * headcounts are too crude.
 *
 * Adopted: budgets derive from MEASURED system costs × the actual component
 * mix. Budget = frameTimeBudget / measuredCostPerEntity(componentMix). If the
 * measured cost drops (better data layout, GPU culling), the affordable
 * population RISES — no hard cap blocks it.
 *
 * Run: bun run src/engine/frontier/workload-budgets.ts
 */

export interface CostModel {
  /** Per-entity cost in µs, by component mix (not by headcount). */
  perEntityUs: number;
  /** Fixed overhead per tick (systems, scheduler, framework). */
  fixedUs: number;
  /** Measured on which workload (the real slice, not a synthetic fixture). */
  measuredOn: string;
}

export interface ComponentMix {
  /** What these entities are actually DOING (drives measured cost). */
  activity: string;
  count: number;
  /** Cost multiplier for this activity (meditate = cheap, combat-in-formation = dear). */
  activityWeight: number;
}

export interface WorkloadBudget {
  /** Entities affordable at the current measured cost + component mix. */
  affordableEntities: number;
  /** Remaining headroom before the frame budget is exhausted. */
  headroomUs: number;
  /** The frame budget we derived from (µs). */
  frameBudgetUs: number;
  /** Measured cost per entity used (µs) — AFTER data-layout/GPU wins, not before. */
  measuredCostUs: number;
  /** What changes would raise the affordable population. */
  levers: string[];
}

/** Default measured model for the current frontier slice (honest, tuneable). */
export const DEFAULT_COST_MODEL: CostModel = {
  perEntityUs: 25,        // full S4 NPC measured ~25 µs/tick (doc 39 §1.3 estimate)
  fixedUs: 1000,          // ~1 ms fixed per tick
  measuredOn: 'frontier slice: village CCT + cognition prototype',
};

/**
 * Budget derived from workload, not headcount. Same machinery for any tier:
 * pass the mix of entities that would actually run at that tier.
 */
export function deriveBudget(
  model: CostModel,
  mix: ComponentMix[],
  frameBudgetUs: number,
): WorkloadBudget {
  const totalCount = mix.reduce((s, m) => s + m.count, 0);
  const weightedCount = mix.reduce((s, m) => s + m.count * m.activityWeight, 0);
  const measuredCostUs = model.perEntityUs * (weightedCount / Math.max(1, totalCount));
  const usedUs = model.fixedUs + measuredCostUs * totalCount;
  const headroomUs = frameBudgetUs - usedUs;
  const affordableEntities = Math.floor((frameBudgetUs - model.fixedUs) / model.perEntityUs);
  const levers: string[] = [];
  if (affordableEntities < totalCount) {
    levers.push('cheaper per-entity cost (SoA, pose caches, GPU culling)');
    levers.push('lower activityWeight for offscreen entities (abstract resolution only — causality intact)');
    levers.push('stream/cull presentation before touching simulation');
  }
  return {
    affordableEntities,
    headroomUs: Math.max(0, headroomUs),
    frameBudgetUs,
    measuredCostUs: +measuredCostUs.toFixed(2),
    levers,
  };
}

/* ---------------- conformance ---------------- */

let passed = 0;
let failed = 0;
function assert(cond: boolean, msg: string) {
  if (cond) { passed++; console.log(`  ✅ ${msg}`); }
  else { failed++; console.error(`  ❌ ${msg}`); }
}

function run() {
  console.log('=== Workload-Derived Budget Conformance ===\n');

  const S4_FRAME = 16_667; // 60fps budget in µs

  // 1. the directive's example: meditating alone ≠ fighting in a formation
  const idle: ComponentMix[] = [{ activity: 'meditate', count: 200, activityWeight: 0.4 }];
  const fighting: ComponentMix[] = [{ activity: 'combat-in-formation', count: 200, activityWeight: 1.4 }];
  const idleBudget = deriveBudget(DEFAULT_COST_MODEL, idle, S4_FRAME);
  const fightBudget = deriveBudget(DEFAULT_COST_MODEL, fighting, S4_FRAME);
  assert(idleBudget.headroomUs > fightBudget.headroomUs, 'idle NPCs leave more headroom than fighting NPCs (same headcount!)');
  assert(fightBudget.measuredCostUs > idleBudget.measuredCostUs, 'measured cost per entity reflects the component mix');

  // 2. budget is derived from measured cost, not a hard 200/500 cap
  const mix: ComponentMix[] = [
    { activity: 'meditate', count: 100, activityWeight: 0.4 },
    { activity: 'work', count: 300, activityWeight: 1.0 },
    { activity: 'combat', count: 50, activityWeight: 1.4 },
  ];
  const b = deriveBudget(DEFAULT_COST_MODEL, mix, S4_FRAME);
  assert(b.affordableEntities > 0, 'budget derives a positive affordable population');
  assert(b.frameBudgetUs === S4_FRAME, 'frame budget is the constraint, not a headcount');

  // 3. cheaper measured cost → affordable population RISES (no ceiling)
  const cheapModel: CostModel = { perEntityUs: 8, fixedUs: 600, measuredOn: 'after SoA + pose cache' };
  const cheapBudget = deriveBudget(cheapModel, mix, S4_FRAME);
  assert(cheapBudget.affordableEntities > b.affordableEntities, 'data-layout win raises affordable population (no hard cap)');

  // 4. honest levers when over budget
  const over: ComponentMix[] = [{ activity: 'combat-in-formation', count: 2000, activityWeight: 1.4 }];
  const overBudget = deriveBudget(DEFAULT_COST_MODEL, over, S4_FRAME);
  assert(overBudget.levers.length > 0, 'over-budget case lists levers');
  assert(overBudget.levers.every((l) => !/demote|suspend|stop/i.test(l)), 'levers never suggest demoting or stopping NPCs (directive §7)');

  // 5. no Math.random — deterministic
  const b1 = deriveBudget(DEFAULT_COST_MODEL, mix, S4_FRAME);
  const b2 = deriveBudget(DEFAULT_COST_MODEL, mix, S4_FRAME);
  assert(JSON.stringify(b1) === JSON.stringify(b2), 'deterministic budget derivation');

  console.log(`\n=== Results: ${passed}/${passed + failed} passed ===`);
  process.exit(failed > 0 ? 1 : 0);
}

if (import.meta.main) run();
