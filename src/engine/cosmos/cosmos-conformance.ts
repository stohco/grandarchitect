/**
 * Cosmos Conformance Test
 * ========================
 *
 * Proves the deterministic cosmology core end to end:
 *
 *   1.  Steps ladder — the Five Steps map onto the canon 10-station ladder
 *       NON-destructively; grades and boundary verbs are exact.
 *   2.  Karma conservation — a debt converted to retribution conserves
 *       magnitude exactly; the ledger is conserved; conversion is idempotent.
 *   3.  Cord severing — relationships/history entries are removed and the
 *       deterministic effect lists are exact; accumulated retribution fires
 *       exactly once.
 *   4.  Karmic shielding — a shield hides a transcendent being from weaker
 *       probes and yields to stronger ones, deterministically.
 *   5.  Grotto dilation — a day in a higher plane equals a century below
 *       (1 interior day ≡ 100 exterior years, integer-exact tick math);
 *       the canon 1:365 Precelestial debt and 1:3 fast grottos hold.
 *   6.  Existential pressure — a 3rd-Step entity's ontological mass exceeds
 *       a low world's tolerance → avatar required; the avatar conforms to
 *       local laws.
 *   7.  Essence finiteness — 9 Fire holders fill the universe; a 10th cannot
 *       claim without predation; predation resolves deterministically.
 *   8.  Concept-override — a holder's declaration is accepted when authority
 *       ≥ local law resistance and REJECTED otherwise; false essences can
 *       never override law.
 *   9.  Determinism — same seed ⇒ identical cords, predation order, samsara
 *       outcomes and full state snapshots.
 *
 * Run: bun run src/engine/cosmos/cosmos-conformance.ts
 */

import {
  STEPS_LADDER,
  canonicalLadderIntact,
  gradeForRealm,
  stepDefForRealm,
  stepForRealm,
} from './steps-ladder';
import {
  createCanonicalCosmology,
  findGrotto,
  lawsBindingOn,
  ontologicalMass,
  planDescent,
  canDescendDirectly,
  setHeavenlyDaoState,
  activeLawTiers,
} from './cosmology-graph';
import { KarmaEngine } from './karma-engine';
import {
  TICKS_PER_DAY,
  advanceRegionClock,
  createTechniqueBuffer,
  daysToYears,
  exteriorTicks,
  interiorTicks,
  realmSamsaraResistance,
  recordTechniqueSnapshot,
  rewindTechnique,
  samsaraProbability,
  samsaraRecast,
  ticksToDays,
} from './time-engine';
import { EssenceRegistry, type EssenceDefinition } from './essence-registry';

let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string): void {
  if (condition) {
    passed++;
  } else {
    failed++;
    console.error(`  ❌ ${message}`);
  }
}

function approx(a: number, b: number, eps = 1e-12): boolean {
  return Math.abs(a - b) < eps;
}

async function run(): Promise<void> {
  console.log('=== Cosmos Conformance Test ===\n');

  // -------------------------------------------------------------------
  console.log('Test 1: Steps ladder — non-destructive mapping onto the canon 10-station ladder');
  {
    assert(canonicalLadderIntact(), 'canon 10-station ladder intact (REALM_LADDER unmodified)');
    assert(gradeForRealm('mortal') === 0, 'mortal is substrate-bound (grade 0)');
    assert(gradeForRealm('qi_condensation') === 0, 'qi_condensation is substrate-bound (grade 0)');
    assert(stepForRealm('foundation_establishment') === 1, 'foundation_establishment → Step 1 (Mortal Shedding begins)');
    assert(stepForRealm('core_formation') === 1, 'core_formation → Step 1 (Mortal Shedding completes)');
    assert(stepForRealm('nascent_soul') === 2, 'nascent_soul → Step 2 (Soul Forging)');
    assert(stepForRealm('spirit_severance') === 2, 'spirit_severance → Step 2 (Soul Forging)');
    assert(stepForRealm('void_amalgamation') === 3, 'void_amalgamation → Step 3 (Law Binding)');
    assert(stepForRealm('tribulation_crossing') === 3, 'tribulation_crossing → Step 3 (Law Binding)');
    assert(stepForRealm('mahayana') === 4, 'mahayana → Step 4 (Authorship)');
    assert(stepForRealm('mortal') === null, 'mortal has no Step (substrate-bound, not yet shed)');
    assert(STEPS_LADDER.length === 5, 'exactly five Steps defined');
    assert(STEPS_LADDER[4].name === 'Boundless' && STEPS_LADDER[4].grade === 5, 'Step 5+ = Boundless (grade 5)');
    assert(stepDefForRealm('core_formation')?.name === 'Mortal Shedding', 'Step 1 named "Mortal Shedding" (凡蜕)');
    const step4 = stepDefForRealm('mahayana');
    assert(
      step4 !== null && step4.boundaryVerbs.some((v) => v.startsWith('law-authorship')),
      'Step 4 boundary verb is law-authorship (doc 30 Station 10)',
    );
  }

  // -------------------------------------------------------------------
  console.log('Test 2: Karma conservation — debt → retribution conserves magnitude');
  {
    const k = new KarmaEngine();
    const debt = k.createCord({
      actor: 'A', target: 'B', magnitude: 50, kind: 'debt', tick: 100, seed: 's1',
      historyIds: ['rel_a_b', 'rec_kill_1'],
    });
    assert(debt.thickness === 50, `debt cord created with thickness 50 (got ${debt.thickness})`);
    assert(k.karmicDebt('A') === 50, 'A owes 50 before conversion');

    const ret = k.convertDebtToRetribution({ cordId: debt.cordId, tick: 200, seed: 's1' });
    assert(ret !== null, 'retribution cord created');
    if (ret) {
      assert(ret.thickness === 50, `retribution conserves magnitude exactly (50 vs ${ret.thickness})`);
      assert(ret.kind === 'retribution' && ret.from === 'B' && ret.to === 'A', 'retribution runs B → A');
    }
    assert(k.karmicDebt('A') === 0, 'A owes nothing after conversion');

    const weight = (id: string): number => {
      let w = 0;
      for (const c of k.snapshot().cords) {
        if (c.severedAt !== null) continue;
        if (c.kind === 'debt' && c.from === id) w += c.thickness;
        if (c.kind === 'retribution' && c.to === id) w += c.thickness;
      }
      return w;
    };
    assert(weight('A') === 50, 'total karmic weight conserved (50 → 50)');

    const again = k.convertDebtToRetribution({ cordId: debt.cordId, tick: 300, seed: 's1' });
    assert(again === null, 're-conversion refused (debt already severed — no double spend)');
  }

  // -------------------------------------------------------------------
  console.log('Test 3: Cord severing — deletes relationships/history; retribution fires once');
  {
    const k = new KarmaEngine();
    const debt = k.createCord({
      actor: 'A', target: 'B', magnitude: 50, kind: 'debt', tick: 100, seed: 's2',
      historyIds: ['rel_1', 'rec_1'],
    });
    const fate = k.createCord({
      actor: 'A', target: 'C', magnitude: 10, kind: 'fate', tick: 100, seed: 's2',
      historyIds: ['rel_2'],
    });
    const state = k.snapshot();
    assert(state.history.length === 3, 'three history entries tied to the two cords');

    const single = k.severCord({ cordId: fate.cordId, by: 'A', tick: 400 });
    assert(single.removedCords.length === 1 && single.removedCords[0] === fate.cordId, 'single severing removes exactly the fate cord');
    assert(single.removedRelationships.includes('rel_2'), 'relationship rel_2 removed by severing');
    assert(single.retributionFired === null, 'single-cord severing fires no retribution');
    assert(k.snapshot().cords.every((c) => c.cordId !== fate.cordId), 'fate cord gone from the graph');

    const all = k.severAll({ entityId: 'A', by: 'enemy', tick: 500, seed: 's2' });
    assert(all.removedCords.length === 1 && all.removedCords[0] === debt.cordId, 'severAll removes the remaining debt cord');
    assert(all.removedHistory.includes('rel_1') && all.removedHistory.includes('rec_1'), 'debt cord history entries removed');
    assert(all.retributionFired !== null, 'accumulated retribution fires on severAll');
    if (all.retributionFired) {
      assert(all.retributionFired.thickness === 50, `retribution magnitude = unconverted debt (50, got ${all.retributionFired.thickness})`);
    }
    assert(k.snapshot().history.length === 0, 'all severed history/relationship entries deleted from the ledger');

    const again = k.severAll({ entityId: 'A', by: 'enemy', tick: 600, seed: 's2' });
    assert(again.removedCords.length === 0 && again.retributionFired === null, 'second severAll is a no-op — retribution fired exactly once');
  }

  // -------------------------------------------------------------------
  console.log('Test 4: Karmic shielding — hides from divination/fate-tracking');
  {
    const k = new KarmaEngine();
    k.applyShield({ entityId: 'transcendent_one', source: 'dao_veil', strength: 1.0, tick: 0 });
    assert(k.isHidden('transcendent_one', { kind: 'divination', strength: 0.5 }) === true, 'weak divination probe cannot see through the veil');
    assert(k.isHidden('transcendent_one', { kind: 'fate_tracking', strength: 1.0 }) === true, 'equal-strength fate probe still blocked');
    assert(k.isHidden('transcendent_one', { kind: 'karma_scan', strength: 1.5 }) === false, 'stronger probe pierces the veil');
    assert(k.isHidden('mortal_cultivator', { kind: 'divination', strength: 0.5 }) === false, 'unshielded being remains visible');
  }

  // -------------------------------------------------------------------
  console.log('Test 5: Grotto dilation — a day in a higher plane equals a century below');
  {
    const precelestial = { regionId: 'precelestial', dilation: { num: 1, den: 365 } };
    const crimsonVow = { regionId: 'crimson_vow_city', dilation: { num: 3, den: 1 } };
    const reach = { regionId: 'reach_of_fast_time', dilation: { num: 1, den: 36500 } };
    const mortal = { regionId: 'mortal_world', dilation: { num: 1, den: 1 } };

    const t1 = exteriorTicks(precelestial, TICKS_PER_DAY);
    assert(t1 === 365 * TICKS_PER_DAY, `1 Precelestial day = 1 Acquired year (365 days, got ${t1 !== null ? ticksToDays(t1) : 'null'})`);

    const t2 = exteriorTicks(reach, TICKS_PER_DAY);
    assert(t2 === 36500 * TICKS_PER_DAY, '1 reach-day = 36,500 exterior days (tick-exact)');
    if (t2 !== null) {
      assert(ticksToDays(t2) === 36500, 'reach-day → 36,500 exterior days');
      assert(daysToYears(ticksToDays(t2)) === 100, 'a day in the higher plane equals exactly a century below');
    }

    const t3 = interiorTicks(crimsonVow, TICKS_PER_DAY);
    assert(t3 === 3 * TICKS_PER_DAY, '1:3 fast grotto — 1 exterior day = 3 interior days (doc 37 §6.2 Crimson Vow)');

    const t4 = exteriorTicks(crimsonVow, 5);
    assert(t4 === null, 'non-divisible conversion returns null — no silent rounding');

    const adv = advanceRegionClock(precelestial, TICKS_PER_DAY, mortal);
    assert(adv !== null && adv.observerDays === 365, `observer world ages 365 days while the entity spends 1 day above (got ${adv?.observerDays})`);

    const cosmos = createCanonicalCosmology();
    assert(findGrotto(cosmos, 'precelestial')?.timeDilation === 1 / 365, 'cosmology fixture: Precelestial dilation 1/365');
    assert(findGrotto(cosmos, 'reach_of_fast_time')?.timeDilation === 1 / 36500, 'cosmology fixture: Reach of Fast Time dilation 1/36,500');
  }

  // -------------------------------------------------------------------
  console.log('Test 6: Existential pressure — ontological mass vs world fabric');
  {
    const cosmos = createCanonicalCosmology();
    const mortalWorld = cosmos.regions.find((r) => r.id === 'mortal_world');
    const astral = cosmos.regions.find((r) => r.id === 'immortal_astral_continent');
    assert(mortalWorld !== undefined && astral !== undefined, 'canonical cosmology has the low world and the astral continent');

    assert(ontologicalMass(0) === 1, 'substrate mass 1');
    assert(ontologicalMass(3) === 512, '3rd-Step entity mass 512 (8^3)');
    assert(ontologicalMass(4) === 4096, '4th-Step (Mahayana) mass 4096');

    if (mortalWorld && astral) {
      assert(canDescendDirectly(512, mortalWorld.fabric.tolerance) === false, '3rd-Step mass 512 > low world tolerance 100 → no direct descent');
      const plan = planDescent(3, mortalWorld);
      assert(plan.mode === 'avatar', 'descent requires an avatar');
      assert(plan.projectedMass <= mortalWorld.fabric.tolerance, 'avatar mass capped under the world tolerance');
      assert(plan.effectiveGrade === 1, 'avatar effective grade clamped to the world gradeCap');
      assert(plan.conformsToLocalLaws === true, 'avatar conforms to local laws');
      const binding = lawsBindingOn(plan.effectiveGrade, mortalWorld);
      assert(binding.length === 2 && binding.includes('mortal') && binding.includes('body'), 'avatar bound by local mortal/body laws only');

      assert(canDescendDirectly(8, mortalWorld.fabric.tolerance) === true, '1st-Step mass 8 fits the low world directly');
      assert(planDescent(1, mortalWorld).mode === 'direct', '1st-Step entity descends directly');
      assert(planDescent(4, mortalWorld).mode === 'avatar', 'Mahayana also requires an avatar in a low world');

      assert(lawsBindingOn(0, astral).length === 0, 'substrate being in the Astral Continent is below its law floor — no active law binds it');
      assert(lawsBindingOn(4, astral).length === activeLawTiers(astral).length - 1, 'grade-4 being is bound by every Astral law except the law tier itself (which is grade 5)');
      assert(!lawsBindingOn(4, astral).includes('law'), 'the "law" tier does not bind a grade-4 being (doc 30: authorship is grade 5+)');
      assert(lawsBindingOn(4, mortalWorld).length === 2, 'grade-4 being in the low world is bound only by the world\'s own low laws');

      const broken = setHeavenlyDaoState(cosmos, 'mortal_world', 'crushed');
      assert(broken.regions.find((r) => r.id === 'mortal_world')?.heavenlyDao.state === 'crushed', 'Heavenly Dao state recorded (mortal_world → crushed)');
      assert(cosmos.regions.find((r) => r.id === 'mortal_world')?.heavenlyDao.state === 'submit', 'original graph untouched (immutable update)');
    }
  }

  // -------------------------------------------------------------------
  console.log('Test 7: Essence finiteness — 9 Fire sources; the 10th must predate');
  {
    const fire: EssenceDefinition[] = [{ essenceId: 'fire', name: 'Fire Essence', sourceCount: 9 }];
    const reg = new EssenceRegistry(fire);

    let claimed = 0;
    for (let i = 1; i <= 9; i++) {
      const r = reg.claim({ entityId: `holder_${i}`, essenceId: 'fire', authority: 0.1 * i, tick: 100, seed: 'fx' });
      if (r.ok) claimed++;
    }
    assert(claimed === 9, 'all 9 finite Fire slots claimed');
    assert(reg.holderCount('fire') === 9, '9 holders registered');

    const tenth = reg.claim({ entityId: 'holder_10', essenceId: 'fire', authority: 0.95, tick: 100, seed: 'fx' });
    assert(tenth.ok === false && tenth.reason === 'no_free_slot', 'a 10th claimant cannot claim — the universe is finite');

    const pred = reg.predate({ predator: 'holder_10', essenceId: 'fire', authority: 0.95, tick: 200, seed: 'fx' });
    assert(pred.success === true, '10th claimant acquires the essence via ontological predation');
    assert(pred.defeatedHolderId === 'holder_1', 'weakest holder (0.1) is the deterministic predation target');
    assert(reg.holderCount('fire') === 9, 'still 9 holders after predation (replace, never exceed)');
    assert(reg.isHolder('holder_10', 'fire') && !reg.isHolder('holder_1', 'fire'), 'old holder replaced by the predator');

    const weak = reg.predate({ predator: 'holder_1', essenceId: 'fire', authority: 0.05, tick: 300, seed: 'fx' });
    assert(weak.success === false && weak.reason === 'weaker_predator', 'a weaker predator is refused');
  }

  // -------------------------------------------------------------------
  console.log('Test 8: Concept-overriding-matter — authority vs local law resistance');
  {
    const registry = new EssenceRegistry([{ essenceId: 'fire', name: 'Fire Essence', sourceCount: 3 }]);
    const lawResistance = 0.5;

    const lord = registry.claim({ entityId: 'fire_lord', essenceId: 'fire', authority: 0.8, tick: 0, seed: 'cx' });
    assert(lord.ok, 'fire_lord claims Fire');
    const accepted = registry.declareConcept({
      entityId: 'fire_lord', essenceId: 'fire', concept: 'hot', mapping: 'fire_essence_standard', tick: 10,
    }, lawResistance, 10);
    assert(accepted.ok && accepted.reason === 'ok', 'declaration accepted when authority (0.8) ≥ law resistance (0.5)');

    const resolved = registry.resolveConcept('hot', 'iron');
    assert(resolved.source === 'essence_override', 'concept resolved from the essence override, not default law');
    assert(resolved.mapping === 'fire_essence_standard', 'holding Fire Essence defines what "hot" means — concept overrides matter');

    const weakHolder = registry.claim({ entityId: 'ember', essenceId: 'fire', authority: 0.3, tick: 0, seed: 'cx' });
    assert(weakHolder.ok, 'ember claims the second Fire slot');
    const rejected = registry.declareConcept({
      entityId: 'ember', essenceId: 'fire', concept: 'warm', mapping: 'ember_standard', tick: 10,
    }, lawResistance, 10);
    assert(rejected.ok === false && rejected.reason === 'law_resistance', 'declaration rejected when authority (0.3) < law resistance (0.5)');

    const forged = registry.claim({ entityId: 'fake_lord', essenceId: 'fire', authority: 0.9, origin: 'forged', tick: 0, seed: 'cx' });
    assert(forged.ok, 'a forged (false) essence can still occupy a slot');
    const forgedDecl = registry.declareConcept({
      entityId: 'fake_lord', essenceId: 'fire', concept: 'hot', mapping: 'forged_standard', tick: 10,
    }, lawResistance, 10);
    assert(forgedDecl.ok === false && forgedDecl.reason === 'false_essence', 'false essences can never override law');

    const nonHolder = registry.declareConcept({
      entityId: 'nobody', essenceId: 'fire', concept: 'ash', mapping: 'x', tick: 10,
    }, lawResistance, 10);
    assert(nonHolder.ok === false && nonHolder.reason === 'not_holder', 'non-holders cannot declare');

    assert(registry.resolveConcept('cold', 'air').source === 'default_law', 'undeclared concept falls back to default law');
    assert(registry.isTrueEssence('fire_lord', 'fire') === true, 'primordial origin is a true essence');
    assert(registry.isTrueEssence('fake_lord', 'fire') === false, 'forged origin is a false essence');
    const decayed = registry.currentAuthority('fake_lord', 'fire', 500);
    assert(approx(decayed, 0.9 * 0.5), `forged authority decays deterministically (0.45, got ${decayed})`);
  }

  // -------------------------------------------------------------------
  console.log('Test 9: Determinism — same seed ⇒ identical graphs and outcomes');
  {
    const runKarma = (seed: string): string => {
      const k = new KarmaEngine();
      k.createCord({ actor: 'X', target: 'Y', magnitude: 42, kind: 'debt', tick: 7, seed, historyIds: ['rel_xy'] });
      k.createCord({ actor: 'Y', target: 'X', magnitude: 9, kind: 'fate', tick: 8, seed, historyIds: ['rel_yx'] });
      k.convertDebtToRetribution({ cordId: k.snapshot().cords[0].cordId, tick: 20, seed });
      k.severAll({ entityId: 'Y', by: 'Z', tick: 30, seed });
      return JSON.stringify(k.snapshot());
    };
    assert(runKarma('same-seed') === runKarma('same-seed'), 'karma: same seed → byte-identical state snapshots');
    assert(runKarma('seed-a') !== runKarma('seed-b'), 'karma: different seeds → different graphs');

    const cordSeq = (seed: string): string => {
      const k = new KarmaEngine();
      k.createCord({ actor: 'X', target: 'Y', magnitude: 1, kind: 'debt', tick: 1, seed });
      return k.snapshot().cords[0].cordId;
    };
    assert(cordSeq('s') === cordSeq('s'), 'karma: cord ids deterministic');
    assert(cordSeq('s1') !== cordSeq('s2'), 'karma: different seeds → different cord ids');

    const runEssence = (seed: string): string => {
      const r = new EssenceRegistry([{ essenceId: 'fire', name: 'Fire Essence', sourceCount: 3 }]);
      const order: string[] = [];
      for (let i = 1; i <= 5; i++) {
        const res = r.predate({ predator: `p_${i}`, essenceId: 'fire', authority: 0.1 + i * 0.2, tick: i * 10, seed });
        order.push(res.defeatedHolderId ?? 'none');
      }
      return JSON.stringify({ order, state: r.snapshot() });
    };
    assert(runEssence('e') === runEssence('e'), 'essence: same seed → identical predation order and holder state');

    const attempt = {
      subjectId: 'soul_9', authority: 0.5, subjectRealm: 'core_formation' as const, riverTick: 1000, seed: 'river-1',
    };
    const r1 = samsaraRecast(attempt);
    const r2 = samsaraRecast(attempt);
    assert(r1.success === r2.success && r1.newIncarnationId === r2.newIncarnationId, 'samsara: same attempt → same outcome and incarnation');
    assert(r1.newIncarnationId !== null ? r1.newIncarnationId.startsWith('incarnation_') : true, 'recast produces a deterministic incarnation id');

    const none = samsaraRecast({ ...attempt, authority: 0 });
    assert(none.success === false && none.probability === 0, 'zero authority → recast probability 0, always fails');
    const certain = samsaraRecast({ subjectId: 'soul_10', authority: 1, subjectRealm: 'mahayana', riverTick: 2, seed: 'r' });
    assert(certain.success === true && certain.probability === 1, 'Mahayana with authority 1 → probability 1, always succeeds');
    assert(approx(samsaraProbability(0.5, 'mahayana'), 0.5), 'samsara probability exact: 0.5 × 1.0 = 0.5 (Mahayana)');
    assert(approx(samsaraProbability(0.5, 'mortal'), 0.05), 'samsara probability exact: 0.5 × 0.1 = 0.05 (mortal)');
    assert(realmSamsaraResistance('mortal') === 101 && realmSamsaraResistance('mahayana') === 11, 'realm resistance: mortals resist less than the strong bend it');

    const buffer = createTechniqueBuffer(2);
    let b = recordTechniqueSnapshot(buffer, { entityId: 'e1', techniqueId: 'ultimate_slash', tick: 100, snapshot: { power: 1 } });
    b = recordTechniqueSnapshot(b, { entityId: 'e1', techniqueId: 'ultimate_slash', tick: 200, snapshot: { power: 5 } });
    b = recordTechniqueSnapshot(b, { entityId: 'e1', techniqueId: 'ultimate_slash', tick: 300, snapshot: { power: 9 } });
    const rw1 = rewindTechnique(b, { entityId: 'e1', techniqueId: 'ultimate_slash', targetTick: 250 });
    const rw2 = rewindTechnique(b, { entityId: 'e1', techniqueId: 'ultimate_slash', targetTick: 250 });
    assert(rw1 !== null && rw1.restoredTick === 200, 'rewind restores the latest snapshot at or before the target tick');
    assert(rw1 !== null && rw1.restoredTick === rw2?.restoredTick, 'rewind is deterministic');
    if (rw1) {
      assert(rw1.essenceSpent === 200, `essence cost = rewoundTicks × essencePerTick (100 × 2 = 200, got ${rw1.essenceSpent})`);
      assert(JSON.stringify(rw1.restored) === JSON.stringify({ power: 5 }), 'restored state is the technique state at tick 200');
    }
    const belowCast = rewindTechnique(b, { entityId: 'e1', techniqueId: 'ultimate_slash', targetTick: 50 });
    assert(belowCast === null, 'rewind below the cast tick (causality floor) is refused');
  }

  // -------------------------------------------------------------------
  const total = passed + failed;
  console.log(`\n${passed} passed, ${failed} failed, ${total} total`);
  if (failed > 0) {
    console.error('COSMOS CONFORMANCE FAILED');
    process.exit(1);
  }
  console.log('COSMOS CONFORMANCE OK');
}

run().catch((err) => {
  console.error('Cosmos conformance crashed:', err);
  process.exit(1);
});
