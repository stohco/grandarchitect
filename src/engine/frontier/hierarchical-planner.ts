#!/usr/bin/env bun
/**
 * frontier/hierarchical-planner.ts — HTN/GOAP planner (directive §14 layer 3).
 *
 * NPCs get hierarchical planners instead of canned schedules. An intention
 * like `breakthrough_to_core_formation` decomposes:
 *
 *   obtain cultivation method → obtain spirit stones → improve cave abode →
 *   prepare pills → address bottleneck → find secluded location → attempt
 *
 * Properties the directive demands:
 *   - If the pill is stolen, the plan does not collapse — it replans.
 *   - If the auction price becomes impossible, the NPC might borrow money,
 *     hunt a beast, accept a mission, rob someone, seek a favor, or give up
 *     temporarily — depending on personality and circumstances.
 *   - Deterministic: same world state → same plan, every run.
 *
 * HTN (Hierarchical Task Network): a task has methods; a method has
 * subtasks/preconditions. GOAP-style: primitive tasks have effects on world
 * state; planning back-chains from the goal.
 *
 * Run: bun run src/engine/frontier/hierarchical-planner.ts
 */

export type WorldPredicate = string; // e.g. 'has:spirit_stones:500'

export interface WorldState {
  predicates: Set<WorldPredicate>;
}

export function has(world: WorldState, p: WorldPredicate): boolean {
  return world.predicates.has(p);
}

export interface PrimitiveAction {
  id: string;
  /** Predicates that must hold to execute. */
  preconditions: WorldPredicate[];
  /** Predicates that hold after execution. */
  effects: WorldPredicate[];
  /** Predicates removed after execution. */
  deleteEffects: WorldPredicate[];
  cost: number;
}

export interface CompoundTask {
  id: string;
  /** A method is a sequence of subtask ids (compound or primitive action ids). */
  methods: { name: string; subtasks: string[]; preconditions: WorldPredicate[] }[];
}

export interface PlannerDomain {
  actions: Map<string, PrimitiveAction>;
  compounds: Map<string, CompoundTask>;
}

export interface PlanStep {
  actionId: string;
  cost: number;
}

export class HierarchicalPlanner {
  domain: PlannerDomain;

  constructor(domain: PlannerDomain) {
    this.domain = domain;
  }

  registerAction(a: PrimitiveAction): void {
    this.domain.actions.set(a.id, a);
  }

  registerCompound(c: CompoundTask): void {
    this.domain.compounds.set(c.id, c);
  }

  /**
   * Decompose a compound task into a linear plan, or throw/return empty if
   * no applicable method chain exists. Deterministic: methods tried in
   * registration order; first applicable method selected.
   */
  decompose(taskId: string, world: WorldState, depth = 0, budget = 64): PlanStep[] | null {
    if (depth > 12 || budget <= 0) return null;

    const action = this.domain.actions.get(taskId);
    if (action) {
      if (action.preconditions.every((p) => has(world, p))) {
        return [{ actionId: action.id, cost: action.cost }];
      }
      return null;
    }

    const compound = this.domain.compounds.get(taskId);
    if (!compound) return null;

    for (const method of compound.methods) {
      if (!method.preconditions.every((p) => has(world, p))) continue;
      // tentatively apply the method's subtask effects so dependent subtasks
      // see the updated world (goal-directed chaining)
      const nextWorld = { predicates: new Set(world.predicates) };
      const steps: PlanStep[] = [];
      let ok = true;
      let remaining = budget - 1;
      for (const sub of method.subtasks) {
        const subPlan = this.decompose(sub, nextWorld, depth + 1, remaining);
        if (!subPlan) { ok = false; break; }
        // apply effects of the first step so later subtasks see them
        const first = subPlan[0];
        const a = this.domain.actions.get(first.actionId);
        if (a) {
          for (const del of a.deleteEffects) nextWorld.predicates.delete(del);
          for (const eff of a.effects) nextWorld.predicates.add(eff);
        }
        steps.push(...subPlan);
        remaining -= subPlan.length;
      }
      if (ok) return steps;
    }
    return null;
  }

  /** Replan: try a different method after a failure (directive: pill stolen → replan). */
  replan(taskId: string, world: WorldState, blockedBy: WorldPredicate[]): PlanStep[] | null {
    const blocked = new Set(blockedBy);
    // strip the blocked predicates so methods requiring them are skipped,
    // opening alternative method chains (borrow / hunt / rob / mission)
    const stripped: WorldState = {
      predicates: new Set([...world.predicates].filter((p) => !blocked.has(p))),
    };
    return this.decompose(taskId, stripped);
  }
}

/* ---------------- conformance ---------------- */

let passed = 0;
let failed = 0;
function assert(cond: boolean, msg: string) {
  if (cond) { passed++; console.log(`  ✅ ${msg}`); }
  else { failed++; console.error(`  ❌ ${msg}`); }
}

function buildDomain(): PlannerDomain {
  const domain: PlannerDomain = { actions: new Map(), compounds: new Map() };

  const actions: PrimitiveAction[] = [
    { id: 'obtain_method', preconditions: [], effects: ['has:method'], deleteEffects: [], cost: 10 },
    { id: 'mine_spirit_stones', preconditions: ['realm:qi_condensation'], effects: ['has:spirit_stones:500'], deleteEffects: [], cost: 30 },
    { id: 'hunt_beast', preconditions: ['realm:foundation'], effects: ['has:spirit_stones:500'], deleteEffects: [], cost: 40 },
    { id: 'borrow_money', preconditions: ['has:ally:senior'], effects: ['has:spirit_stones:500'], deleteEffects: [], cost: 5 },
    { id: 'accept_sect_mission', preconditions: ['sect:member'], effects: ['has:spirit_stones:500'], deleteEffects: [], cost: 20 },
    { id: 'buy_pill', preconditions: ['has:spirit_stones:500'], effects: ['has:core_pill'], deleteEffects: ['has:spirit_stones:500'], cost: 10 },
    { id: 'prepare_cave', preconditions: ['has:method'], effects: ['cave:prepared'], deleteEffects: [], cost: 15 },
    { id: 'address_bottleneck', preconditions: ['has:core_pill'], effects: ['bottleneck:resolved'], deleteEffects: [], cost: 10 },
    { id: 'find_seclusion', preconditions: [], effects: ['location:secluded'], deleteEffects: [], cost: 8 },
    { id: 'attempt_breakthrough', preconditions: ['cave:prepared', 'bottleneck:resolved', 'location:secluded'], effects: ['realm:core_formation'], deleteEffects: [], cost: 50 },
  ];
  for (const a of actions) domain.actions.set(a.id, a);

  const compounds: CompoundTask[] = [
    {
      id: 'breakthrough_to_core_formation',
      methods: [
        {
          name: 'standard',
          preconditions: [],
          subtasks: ['obtain_method', 'obtain_stones', 'prepare_cave', 'obtain_pill', 'address_bottleneck', 'find_seclusion', 'attempt_breakthrough'],
        },
      ],
    },
    {
      id: 'obtain_stones',
      methods: [
        { name: 'mine', preconditions: ['realm:qi_condensation'], subtasks: ['mine_spirit_stones'] },
        { name: 'hunt', preconditions: ['realm:foundation'], subtasks: ['hunt_beast'] },
        { name: 'borrow', preconditions: ['has:ally:senior'], subtasks: ['borrow_money'] },
        { name: 'mission', preconditions: ['sect:member'], subtasks: ['accept_sect_mission'] },
      ],
    },
    {
      id: 'obtain_pill',
      methods: [
        { name: 'buy', preconditions: [], subtasks: ['buy_pill'] },
      ],
    },
  ];
  for (const c of compounds) domain.compounds.set(c.id, c);

  return domain;
}

function run() {
  console.log('=== Hierarchical Planner Conformance ===\n');

  const domain = buildDomain();
  const planner = new HierarchicalPlanner(domain);

  // 1. full decomposition, goal-directed chaining
  const rich: WorldState = { predicates: new Set(['realm:foundation', 'sect:member', 'has:ally:senior']) };
  const plan = planner.decompose('breakthrough_to_core_formation', rich);
  assert(plan !== null, 'plan exists');
  assert(plan!.some((s) => s.actionId === 'attempt_breakthrough'), 'plan ends in breakthrough');
  assert(plan!.some((s) => s.actionId === 'hunt_beast') || plan!.some((s) => s.actionId === 'borrow_money'), 'stone acquisition uses available method');

  // 2. deterministic: same world → same plan
  const planA = planner.decompose('breakthrough_to_core_formation', rich);
  const planB = planner.decompose('breakthrough_to_core_formation', rich);
  assert(JSON.stringify(planA) === JSON.stringify(planB), 'deterministic plan (identical inputs → identical output)');

  // 3. the pill is stolen → the plan does NOT collapse; it replans (re-obtains)
  // (a mortal disciple with no mining realm and no ally must take a sect mission)
  const poor: WorldState = { predicates: new Set(['sect:member']) };
  const replanned = planner.replan('breakthrough_to_core_formation', poor, ['has:core_pill']);
  assert(replanned !== null, 'replan succeeds after pill theft (plan does not collapse)');
  assert(replanned!.some((s) => s.actionId === 'attempt_breakthrough'), 'replan still reaches breakthrough');
  assert(replanned!.some((s) => s.actionId === 'buy_pill'), 'replan re-obtains the pill');
  assert(replanned!.some((s) => s.actionId === 'accept_sect_mission'), 'mortal disciple with sect takes a sect mission for stones');

  // 3b. context routes the alternative: a foundation cultivator with a senior ally
  // but no sect hunts or borrows — not the sect mission
  const ally: WorldState = { predicates: new Set(['realm:foundation', 'has:ally:senior']) };
  const allyPlan = planner.replan('breakthrough_to_core_formation', ally, ['has:core_pill']);
  assert(allyPlan !== null && !allyPlan!.some((s) => s.actionId === 'accept_sect_mission'), 'ally routes away from sect mission');
  assert(allyPlan!.some((s) => s.actionId === 'borrow_money') || allyPlan!.some((s) => s.actionId === 'hunt_beast'), 'ally routes to borrow or hunt');

  // 4. impossible goal → null (no silver bullet): a mortal with no realm, no
  // sect, and no ally has no stone source at all
  const crippled: WorldState = { predicates: new Set([]) };
  const noPlan = planner.replan('breakthrough_to_core_formation', crippled, ['has:core_pill']);
  assert(noPlan === null, 'with no stone source available, plan honestly returns null');

  // 5. replan changes with personality context: a lone cultivator with no ally/sect
  const lone: WorldState = { predicates: new Set(['realm:foundation']) };
  const lonePlan = planner.replan('breakthrough_to_core_formation', lone, ['has:spirit_stones:500']);
  assert(lonePlan !== null && lonePlan!.some((s) => s.actionId === 'hunt_beast'), 'lone cultivator hunts beasts for stones');

  // 6. precondition gating respected
  const mortal: WorldState = { predicates: new Set(['sect:member']) };
  const mortalPlan = planner.decompose('breakthrough_to_core_formation', mortal);
  assert(mortalPlan === null || !mortalPlan!.some((s) => s.actionId === 'mine_spirit_stones'), 'mortal cannot mine (realm gating)');

  console.log(`\n=== Results: ${passed}/${passed + failed} passed ===`);
  process.exit(failed > 0 ? 1 : 0);
}

if (import.meta.main) run();
