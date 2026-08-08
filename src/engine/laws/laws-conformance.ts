/**
 * laws/laws-conformance.ts — Law Interaction Solver conformance
 * =============================================================
 *
 * Standalone bun-runnable proof of the law subsystem:
 *
 *   1. Threshold semantics — each ratio band produces its expected
 *      qualitative outcome for a synthetic vector (incl. per-domain
 *      nonlinear curves).
 *   2. Same cultivator, different realms — the godlike-in-low-world vs
 *      constrained-in-high-realm property: identical vector, different
 *      world profile, R changes accordingly.
 *   3. Forbidden-clash rule — a lower-realm cultivator cannot win a direct
 *      clash: R < 1.0 → deflected (no victory); explicit tactical
 *      advantage raising R ≥ 1.0 is the only path.
 *   4. Law-stack stacking/conflict semantics.
 *   5. Formation reinforcement — protected wall resists a weak attack,
 *      strains on a peer, breaches on overwhelming; restriction
 *      multipliers feed the solver.
 *   6. Terrain-op clipping — blast volume containing a protected domain:
 *      the surviving operation removes only the unprotected matter and
 *      removedMatter matches the clipped volume; exactly ONE
 *      MatterRemovalEvent (no double counting with the matter system).
 *   7. Determinism — same inputs → identical results.
 *
 * Run: bun run src/engine/laws/laws-conformance.ts
 */

import { LawInteractionSolver, canonicalCapabilityForStation, canonicalWorld } from './law-interaction-solver';
import type { LawInteractionInput } from './law-interaction-solver';
import { CANONICAL_REALM_LAW_PROFILES } from './realm-law-profile';
import { createCapabilityVector } from './capability-vector';
import { createLocalLawStack, resolveLocalLawStack } from './local-law-stack';
import type { LawStackEntry } from './local-law-stack';
import { createFormationCore, evaluateFormationLoad, protectionRetention } from './formation-core';
import type { ProtectedDomain } from './formation-core';
import { clipTerrainOperation, clipConservesVolume } from './terrain-operation-clip';
import type { TerrainOperationClipInput } from './terrain-operation-clip';
import { MatterSink, sphereVolumeFromTransform } from '../world/matter/matter-sink';
import type { TerrainDestructionOperation } from '../world/world-fabric';
import { REALM_INDEX } from './types';

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

const solver = new LawInteractionSolver();

function matterInput(
  actorRealm: 'mortal' | 'qi_induction' | 'qi_condensation' | 'foundation_establishment' | 'core_formation' | 'nascent_soul' | 'spirit_severance' | 'void_amalgamation' | 'tribulation_crossing' | 'mahayana',
  worldRealm: 'mortal' | 'qi_induction' | 'qi_condensation' | 'foundation_establishment' | 'core_formation' | 'nascent_soul' | 'spirit_severance' | 'void_amalgamation' | 'tribulation_crossing' | 'mahayana',
  capability: Record<string, number>,
  extra: Partial<LawInteractionInput> = {},
): LawInteractionInput {
  return {
    actorId: 'test-actor',
    actorRealm,
    capability: createCapabilityVector(capability),
    world: CANONICAL_REALM_LAW_PROFILES[worldRealm],
    domain: 'matter',
    tick: 1000,
    ...extra,
  };
}

function blastOp(id: string, scale: [number, number, number], strength = 1): TerrainDestructionOperation {
  return {
    id,
    worldRevision: 1,
    type: 'subtract-sphere',
    transform: { position: [0, 5, 0], rotation: [0, 0, 0, 1], scale },
    strength,
    falloff: 0.5,
    techniqueId: 'earth-press-slam',
    timestamp: '2026-08-07T00:00:00.000Z',
  };
}

function makeStack(entries: Omit<LawStackEntry, 'interactionCategory'>[]): LawStackEntry[] {
  return entries.map((e) => ({ ...e, interactionCategory: e.domain }));
}

async function run() {
  console.log('=== Law Interaction Solver Conformance Test ===\n');

  // ---------------------------------------------------------------------
  console.log('Test 1: Threshold semantics — every band maps to its qualitative outcome');
  {
    // World: qi_condensation (matter resistance 4). Capability = 0.5×pf
    // (elem=0, dao=0) so pf = 8×targetR lands exactly on the target ratio.
    const cases: Array<{ target: number; expectBand: string; expectSuccess: boolean }> = [
      { target: 0.05, expectBand: 'impossible', expectSuccess: false },
      { target: 0.25, expectBand: 'negligible', expectSuccess: false },
      { target: 0.6, expectBand: 'strain', expectSuccess: false },
      { target: 0.9, expectBand: 'barely-capable', expectSuccess: true },
      { target: 1.25, expectBand: 'normal', expectSuccess: true },
      { target: 2.0, expectBand: 'powerful', expectSuccess: true },
      { target: 5.0, expectBand: 'overwhelming', expectSuccess: true },
      { target: 12.0, expectBand: 'environment-fragile', expectSuccess: true },
    ];
    for (const c of cases) {
      const r = solver.solve(matterInput('qi_condensation', 'qi_condensation', {
        physicalForce: c.target * 8,
        elementalAuthority: 0,
        daoAuthority: 0,
      }));
      assert(Math.abs(r.authorityRatio - c.target) < 1e-3, `R=${c.target} → authorityRatio ${r.authorityRatio}`);
      assert(r.band === c.expectBand, `R=${c.target} → band '${r.band}' (expected '${c.expectBand}')`);
      assert(r.success === c.expectSuccess, `R=${c.target} → success ${r.success} (expected ${c.expectSuccess})`);
    }
    // Band boundaries.
    const justBelow = solver.solve(matterInput('qi_condensation', 'qi_condensation', { physicalForce: 0.8 * 8, elementalAuthority: 0, daoAuthority: 0 }));
    assert(justBelow.band === 'barely-capable', 'R=0.8 → barely-capable (boundary inclusive of upper band)');
    const atTen = solver.solve(matterInput('qi_condensation', 'qi_condensation', { physicalForce: 10 * 8, elementalAuthority: 0, daoAuthority: 0 }));
    assert(atTen.band === 'overwhelming', 'R=10 → overwhelming (10+ is environment-fragile)');

    // Authority-domain nonlinear curve: space in the same world (resistance
    // 32). Raw R=0.5 curves to 0.25 (negligible); raw R=2 curves to √2 (normal).
    const lowSpace = solver.solve({
      ...matterInput('qi_condensation', 'qi_condensation', { spatialAuthority: 22.857, temporalAuthority: 0, daoAuthority: 0 }),
      domain: 'space',
    });
    assert(Math.abs(lowSpace.authorityRatio - 0.5) < 1e-2, `space raw R=0.5 (got ${lowSpace.authorityRatio})`);
    assert(lowSpace.band === 'negligible', `space R=0.5 curves to '${lowSpace.band}' (expected 'negligible')`);
    const highSpace = solver.solve({
      ...matterInput('qi_condensation', 'qi_condensation', { spatialAuthority: 91.429, temporalAuthority: 0, daoAuthority: 0 }),
      domain: 'space',
    });
    assert(Math.abs(highSpace.authorityRatio - 2) < 1e-2, `space raw R=2 (got ${highSpace.authorityRatio})`);
    assert(highSpace.band === 'normal', `space R=2 curves to '${highSpace.band}' (expected 'normal')`);
  }

  // ---------------------------------------------------------------------
  console.log('\nTest 2: Same cultivator, different realms — godlike in low world, constrained in high realm');
  {
    const qiCond = canonicalCapabilityForStation('qi_condensation');
    const inMortal = solver.solve(matterInput('qi_condensation', 'mortal', qiCond));
    assert(inMortal.band === 'overwhelming', `Qi Condensation in Mortal world → '${inMortal.band}' (expected 'overwhelming')`);
    const inMortalMove = solver.solve({ ...matterInput('qi_condensation', 'mortal', qiCond), domain: 'movement' });
    assert(inMortalMove.band === 'overwhelming', `movement in Mortal world → '${inMortalMove.band}' (expected 'overwhelming')`);

    const inMahayana = solver.solve(matterInput('qi_condensation', 'mahayana', qiCond));
    assert(inMahayana.band === 'impossible', `Qi Condensation in Mahayana world → '${inMahayana.band}' (expected 'impossible')`);
    const inMahayanaMove = solver.solve({ ...matterInput('qi_condensation', 'mahayana', qiCond), domain: 'movement' });
    assert(inMahayanaMove.band === 'impossible', `movement in Mahayana world → '${inMahayanaMove.band}' (expected 'impossible')`);

    const nascent = canonicalCapabilityForStation('nascent_soul');
    const nascentMortal = solver.solve(matterInput('nascent_soul', 'mortal', nascent));
    assert(nascentMortal.band === 'environment-fragile', `Nascent Soul in Mortal world → '${nascentMortal.band}' (expected 'environment-fragile')`);
    const nascentMahayana = solver.solve(matterInput('nascent_soul', 'mahayana', nascent));
    assert(nascentMahayana.band === 'impossible', `Nascent Soul in Mahayana world → '${nascentMahayana.band}' (expected 'impossible')`);

    // Same-station actor in its own world lands at R ≈ 1.0 (normal).
    const foundation = canonicalCapabilityForStation('foundation_establishment');
    const ownWorld = solver.solve(matterInput('foundation_establishment', 'foundation_establishment', foundation));
    assert(Math.abs(ownWorld.authorityRatio - 1.0) < 1e-3, `foundation in foundation world → R=${ownWorld.authorityRatio} ≈ 1.0`);
    assert(ownWorld.band === 'normal', `foundation in own world → '${ownWorld.band}' (expected 'normal')`);
  }

  // ---------------------------------------------------------------------
  console.log('\nTest 3: Forbidden-clash rule — lower realm cannot win a direct clash without explicit tactical advantage');
  {
    const qiCond = canonicalCapabilityForStation('qi_condensation');
    // Qi Condensation (idx 2) vs Core Formation (idx 4) in a Qi Condensation
    // world: R = 3.25/4 = 0.81 < 1.0 → the strike must be deflected.
    const clash = solver.solve(matterInput('qi_condensation', 'qi_condensation', qiCond, {
      directClash: { targetRealm: 'core_formation' },
    }));
    // Qi Condensation (cap 4) vs Core Formation in a Qi Condensation world:
    // resistance = 4 (world) × 2^(4−2) (defender differential) → R = 0.25.
    assert(clash.forbiddenClash !== null, 'clash registers forbiddenClash outcome');
    assert(clash.forbiddenClash?.deflected === true, 'lower-realm clash with R<1.0 is deflected');
    assert(clash.success === false, 'deflected clash → success=false (no victory)');
    assert(clash.realized.forceJ === 0, 'deflected clash → realized force zeroed');
    assert(clash.backlash >= 0.6, `deflected clash → backlash reflects incoming (${clash.backlash})`);

    // Explicit tactical advantage ×5 raises R to 1.25 → victory becomes legal.
    const tactical = solver.solve(matterInput('qi_condensation', 'qi_condensation', qiCond, {
      directClash: { targetRealm: 'core_formation', tacticalAdvantageMultiplier: 5 },
    }));
    assert(tactical.forbiddenClash?.deflected === false, 'tactical advantage → not deflected');
    assert(tactical.success === true, 'tactical advantage → clash winnable');
    assert(tactical.band === 'normal', `tactical advantage → '${tactical.band}' (expected 'normal')`);

    // Higher realm vs lower realm: not forbidden, wins normally.
    const higherWins = solver.solve(matterInput('core_formation', 'qi_condensation', canonicalCapabilityForStation('core_formation'), {
      directClash: { targetRealm: 'qi_condensation' },
    }));
    assert(higherWins.forbiddenClash === null, 'higher-realm clash → no forbidden outcome registered');
    assert(higherWins.success === true, 'higher realm vs lower → success');

    // Same realm direct clash: allowed at R ≥ 1.0.
    const sameRealm = solver.solve(matterInput('foundation_establishment', 'foundation_establishment', canonicalCapabilityForStation('foundation_establishment'), {
      directClash: { targetRealm: 'foundation_establishment' },
    }));
    assert(sameRealm.success === true, 'same-realm direct clash → success');

    // Lower realm but R ≥ 1.0 (weak world): the rule keys on R < 1.0 — the
    // world's laws are part of the clash (documented encoding).
    const weakWorld = solver.solve(matterInput('qi_condensation', 'qi_induction', qiCond, {
      directClash: { targetRealm: 'foundation_establishment' },
    }));
    assert(weakWorld.forbiddenClash?.deflected === false, 'R≥1.0 in a weak world → not deflected (rule keys on R<1.0)');
    assert(weakWorld.success === true, 'R≥1.0 in a weak world → winnable');
  }

  // ---------------------------------------------------------------------
  console.log('\nTest 4: Local law stack — stacking and conflict semantics');
  {
    const m = (partial: Partial<LawStackEntry>): LawStackEntry => ({
      entryId: 'e',
      domain: 'matter',
      interactionCategory: 'matter',
      authority: 1,
      priority: 1,
      stackingRule: 'multiplicative',
      conflictRule: 'priority-wins',
      source: 'formation',
      ...partial,
    });

    const mult = resolveLocalLawStack(createLocalLawStack(makeStack([
      m({ entryId: 'a', authority: 2, priority: 10 }),
      m({ entryId: 'b', authority: 3, priority: 10 }),
    ])));
    assert(Math.abs(mult.perDomainMultipliers.matter - 6) < 1e-9, 'multiplicative stack: 2×3 = 6');

    const add = resolveLocalLawStack(createLocalLawStack(makeStack([
      m({ entryId: 'a', authority: 2, priority: 10, stackingRule: 'additive' }),
      m({ entryId: 'b', authority: 3, priority: 10, stackingRule: 'additive' }),
    ])));
    assert(Math.abs(add.perDomainMultipliers.matter - 4) < 1e-9, 'additive stack: 1+(2-1)+(3-1) = 4');

    const mx = resolveLocalLawStack(createLocalLawStack(makeStack([
      m({ entryId: 'a', authority: 2, priority: 10, stackingRule: 'max' }),
      m({ entryId: 'b', authority: 3, priority: 10, stackingRule: 'max' }),
    ])));
    assert(Math.abs(mx.perDomainMultipliers.matter - 3) < 1e-9, 'max stack: 3');
    const mn = resolveLocalLawStack(createLocalLawStack(makeStack([
      m({ entryId: 'a', authority: 2, priority: 10, stackingRule: 'min' }),
      m({ entryId: 'b', authority: 3, priority: 10, stackingRule: 'min' }),
    ])));
    assert(Math.abs(mn.perDomainMultipliers.matter - 2) < 1e-9, 'min stack: 2');

    const strong = resolveLocalLawStack(createLocalLawStack(makeStack([
      m({ entryId: 'a', authority: 2, priority: 10, conflictRule: 'strongest-wins' }),
      m({ entryId: 'b', authority: 4, priority: 10, conflictRule: 'strongest-wins' }),
      m({ entryId: 'c', authority: 1.5, priority: 10, conflictRule: 'strongest-wins' }),
    ])));
    assert(Math.abs(strong.perDomainMultipliers.matter - 4) < 1e-9, 'strongest-wins: only 4 applies');
    assert(strong.conflicts.filter((c) => c.reason === 'strongest-wins').length === 2, 'strongest-wins drops two entries');

    const pw = resolveLocalLawStack(createLocalLawStack(makeStack([
      m({ entryId: 'a', authority: 2, priority: 10 }),
      m({ entryId: 'b', authority: 0.5, priority: 5 }),
    ])));
    assert(Math.abs(pw.perDomainMultipliers.matter - 2) < 1e-9, 'priority-wins: lower-priority weaken entry dropped');
    assert(pw.conflicts.some((c) => c.reason === 'priority-override'), 'priority-wins conflict recorded');

    const ovr = resolveLocalLawStack(createLocalLawStack(makeStack([
      m({ entryId: 'law', authority: 100, priority: 50, conflictRule: 'realm-override', stackingRule: 'multiplicative' }),
    ])));
    assert(ovr.realmOverrides.matter?.value === 100, 'realm-override replaces the realm resistance value');

    const excl = resolveLocalLawStack(createLocalLawStack(makeStack([
      m({ entryId: 'a', authority: 2, priority: 10, conflictRule: 'mutual-exclusion' }),
      m({ entryId: 'b', authority: 2, priority: 10, conflictRule: 'mutual-exclusion' }),
    ])));
    assert(Math.abs(excl.perDomainMultipliers.matter - 1) < 1e-9, 'mutual-exclusion: both cancel, multiplier stays 1');

    // Solver integration: stack multiplier divides R; realm-override wins.
    const qiCond = canonicalCapabilityForStation('qi_condensation');
    const withStack = solver.solve(matterInput('qi_condensation', 'qi_condensation', qiCond, {
      localLawStack: createLocalLawStack(makeStack([m({ entryId: 'wall', authority: 6, priority: 10 })])),
    }));
    assert(Math.abs(withStack.authorityRatio - 4 / 24) < 1e-3, `stack ×6 divides R (${withStack.authorityRatio})`);
    const withOverride = solver.solve(matterInput('qi_condensation', 'qi_condensation', qiCond, {
      localLawStack: createLocalLawStack(makeStack([m({ entryId: 'seal', authority: 1, priority: 50, conflictRule: 'realm-override' })])),
    }));
    assert(Math.abs(withOverride.resistanceBreakdown.realmResistance - 1) < 1e-9, 'realm-override: solver uses 1.0 instead of 4.0');
    assert(withOverride.band === 'overwhelming', `realm-override weak world → '${withOverride.band}' (expected 'overwhelming')`);
  }

  // ---------------------------------------------------------------------
  console.log('\nTest 5: Formation reinforcement — wall resists, strains, breaches');
  {
    const wall = createFormationCore({ formationId: 'wall-1', capacity: 1000, phase: 'earth' });
    const weak = evaluateFormationLoad(wall, 100, 1);
    assert(weak.result === 'absorbed' && weak.penetratedAuthority === 0, 'weak attack absorbed, nothing penetrates');
    const peer = evaluateFormationLoad(wall, 700, 2);
    assert(peer.result === 'strained' && peer.penetratedAuthority === 0, 'peer attack strains, still holds');
    const hard = evaluateFormationLoad(wall, 950, 3);
    assert(hard.result === 'fractured' && hard.resistedAuthority === 950, 'near-capacity → fractured at capacity');
    const breach = evaluateFormationLoad(wall, 1200, 4);
    assert(breach.result === 'partial-breach' && Math.abs(breach.penetratedAuthority - 200) < 1e-9, 'partial-breach: 200 penetrates');
    const over = evaluateFormationLoad(wall, 2000, 5);
    assert(over.result === 'breached' && Math.abs(over.penetratedAuthority - 1000) < 1e-9, 'breached: excess penetrates fully');

    assert(protectionRetention('absorbed') === 1 && protectionRetention('strained') === 1, 'absorbed/strained hold fully');
    assert(protectionRetention('fractured') === 0.9, 'fractured retains 0.9');
    assert(protectionRetention('partial-breach') === 0.6, 'partial-breach retains 0.6');
    assert(protectionRetention('breached') === 0.2, 'breached retains 0.2');

    const degraded = createFormationCore({ formationId: 'wall-2', capacity: 1000, nodeQuality: 0.5 });
    const weakCap = evaluateFormationLoad(degraded, 600, 6);
    assert(weakCap.result === 'partial-breach', 'degraded node quality halves effective capacity (600 > 500)');

    // Restriction multipliers feed the solver as a local law stack entry.
    const qiCond = canonicalCapabilityForStation('qi_condensation');
    const reinforced = createFormationCore({ formationId: 'wall-3', capacity: 1000, restrictionMultipliers: { matter: 10 } });
    const reinforcedStack = createLocalLawStack(makeStack([{
      entryId: `f:${reinforced.formationId}`,
      domain: 'matter' as const,
      interactionCategory: 'matter' as const,
      authority: reinforced.restrictionMultipliers.matter ?? 1,
      priority: 20,
      stackingRule: 'multiplicative' as const,
      conflictRule: 'priority-wins' as const,
      source: 'formation',
    }]));
    const againstWall = solver.solve(matterInput('qi_condensation', 'qi_condensation', qiCond, {
      localLawStack: reinforcedStack,
    }));
    assert(againstWall.success === false, 'weak attack vs wall → no breach');
    assert(againstWall.band === 'negligible', `weak attack vs ×10 wall → '${againstWall.band}' (R=0.1)`);
    const peerVsWall = solver.solve(matterInput('foundation_establishment', 'qi_condensation', canonicalCapabilityForStation('foundation_establishment'), {
      localLawStack: reinforcedStack,
    }));
    // foundation cap 8 vs 4×10 → R = 0.2 — a peer strains, not breaches.
    assert(peerVsWall.success === false && peerVsWall.band === 'negligible', `peer vs ×10 wall → '${peerVsWall.band}' (strains, no breach)`);
    assert(againstWall.authorityRatio < peerVsWall.authorityRatio, 'weak attack faces more resistance than a peer (R ordering)');
    const unWalled = solver.solve(matterInput('foundation_establishment', 'qi_condensation', canonicalCapabilityForStation('foundation_establishment')));
    assert(unWalled.success === true, 'same peer without the wall → succeeds (wall is the difference)');
  }

  // ---------------------------------------------------------------------
  console.log('\nTest 6: Terrain-operation clipping — protected domain in the blast');
  {
    const blast = blastOp('clip-1', [4, 4, 4]); // r=2 → V = 33.5103 m³
    const blastVolume = sphereVolumeFromTransform([4, 4, 4], 1);
    const domainHalf: ProtectedDomain = {
      domainId: 'd1',
      formationId: 'ward-1',
      geometry: { kind: 'radius', center: [0, 5, 0], radius: 1 },
    };
    const ward = createFormationCore({ formationId: 'ward-1', capacity: 1000, phase: 'earth' });
    const sinkA = new MatterSink();

    const clipped = clipTerrainOperation({
      operation: blast,
      protectedDomains: [domainHalf],
      cores: { 'ward-1': ward },
      materialId: 'stone',
      cause: 'shockwave',
      tick: 7,
      sink: sinkA,
      actorId: 'actor-1',
      seed: 'clip-seed',
    });

    const exactProtected = (4 / 3) * Math.PI; // small sphere r=1
    assert(Math.abs(clipped.protectedVolumeM3 - exactProtected) < 0.01, `protected volume ≈ 4.19 (got ${clipped.protectedVolumeM3})`);
    assert(Math.abs(clipped.candidateVolumeM3 - blastVolume) < 0.01, `candidate volume ≈ 33.51 (got ${clipped.candidateVolumeM3})`);
    assert(clipConservesVolume(clipped), 'candidate = protected + removed (volume conservation)');
    assert(Math.abs(clipped.removedMatterVolumeM3 - (blastVolume - exactProtected)) < 0.01, `removedMatter = surviving volume (got ${clipped.removedMatterVolumeM3})`);
    assert(clipped.matterResult !== null, 'surviving part emits a MatterRemovalEvent');
    assert(
      clipped.matterResult !== null &&
        Math.abs(clipped.matterResult.event.totalRemovedVolumeM3 - clipped.removedMatterVolumeM3) < 0.01,
      'event volume equals the surviving (clipped) volume — never the candidate',
    );
    assert(sinkA.summary().accountedEvents === 1, 'exactly ONE removal event — no double counting');
    assert(clipped.loadEvents.length === 1 && clipped.loadEvents[0].result === 'absorbed', 'ward absorbed the load');

    // Overwhelming attack → breached → retention 0.2 → 80% of the blast survives.
    const breachedWard = createFormationCore({ formationId: 'ward-2', capacity: 50, phase: 'earth' });
    const sinkB = new MatterSink();
    const breached = clipTerrainOperation({
      operation: blastOp('clip-2', [4, 4, 4]),
      protectedDomains: [{ domainId: 'd2', formationId: 'ward-2', geometry: { kind: 'radius', center: [0, 5, 0], radius: 1 } }],
      cores: { 'ward-2': breachedWard },
      materialId: 'stone',
      cause: 'shockwave',
      tick: 8,
      sink: sinkB,
      seed: 'clip-seed-2',
    });
    assert(breached.loadEvents[0].result === 'breached', 'overwhelming attack breaches the ward');
    assert(Math.abs(breached.protectedVolumeM3 - exactProtected * 0.2) < 0.01, `breached ward retains only 0.2 of protection (got ${breached.protectedVolumeM3})`);
    assert(clipConservesVolume(breached), 'breached clip still conserves volume');

    // Full containment → surviving volume zero → NO event at all.
    const sinkC = new MatterSink();
    const fullyProtected = clipTerrainOperation({
      operation: blastOp('clip-3', [4, 4, 4]),
      protectedDomains: [{ domainId: 'd3', formationId: 'ward-3', geometry: { kind: 'radius', center: [0, 5, 0], radius: 2 } }],
      cores: { 'ward-3': createFormationCore({ formationId: 'ward-3', capacity: 1000 }) },
      materialId: 'stone',
      cause: 'shockwave',
      tick: 9,
      sink: sinkC,
      seed: 'clip-seed-3',
    });
    assert(fullyProtected.matterResult === null, 'fully protected blast emits no removal event');
    assert(sinkC.summary().accountedEvents === 0, 'sink ledger untouched (no double counting)');

    // Polygon domain covering the blast fully → full protection.
    const polygonDomain: ProtectedDomain = {
      domainId: 'd4',
      formationId: 'ward-4',
      geometry: { kind: 'polygon', vertices: [[-10, 0, -10], [10, 0, -10], [10, 0, 10], [-10, 0, 10]], height: 20 },
    };
    const sinkD = new MatterSink();
    const polyClip = clipTerrainOperation({
      operation: blastOp('clip-4', [4, 4, 4]),
      protectedDomains: [polygonDomain],
      cores: { 'ward-4': createFormationCore({ formationId: 'ward-4', capacity: 1000 }) },
      materialId: 'stone',
      cause: 'shockwave',
      tick: 10,
      sink: sinkD,
      seed: 'clip-seed-4',
    });
    assert(polyClip.matterResult === null, 'polygon domain fully covers the blast → no event');

    // Redirect weighting: a formation with a redirect restriction reflects
    // a share of incoming authority.
    const redirectWard = createFormationCore({ formationId: 'ward-5', capacity: 1000, restrictionMultipliers: { matter: 1, redirect: 0.5 } });
    const sinkE = new MatterSink();
    const redirectClip = clipTerrainOperation({
      operation: blastOp('clip-5', [4, 4, 4]),
      protectedDomains: [{ domainId: 'd5', formationId: 'ward-5', geometry: { kind: 'radius', center: [0, 5, 0], radius: 1 } }],
      cores: { 'ward-5': redirectWard },
      materialId: 'stone',
      cause: 'shockwave',
      tick: 11,
      sink: sinkE,
      seed: 'clip-seed-5',
    });
    assert(Math.abs(redirectClip.redirectedShare - 0.5) < 1e-9, `redirect share reported (${redirectClip.redirectedShare})`);
  }

  // ---------------------------------------------------------------------
  console.log('\nTest 7: Determinism — same inputs, identical results');
  {
    const qiCond = canonicalCapabilityForStation('qi_condensation');
    const input = matterInput('qi_condensation', 'qi_condensation', qiCond, {
      directClash: { targetRealm: 'core_formation' },
      localLawStack: createLocalLawStack(makeStack([{
        entryId: 'wall',
        domain: 'matter' as const,
        interactionCategory: 'matter' as const,
        authority: 2,
        priority: 10,
        stackingRule: 'multiplicative' as const,
        conflictRule: 'priority-wins' as const,
        source: 'formation',
      }])),
    });
    const a = solver.solve(input);
    const b = solver.solve(input);
    assert(JSON.stringify(a) === JSON.stringify(b), 'solver: identical inputs → identical results');

    const sink1 = new MatterSink();
    const sink2 = new MatterSink();
    const c1 = clipTerrainOperation({
      operation: blastOp('det-1', [4, 4, 4]),
      protectedDomains: [{ domainId: 'd', formationId: 'ward', geometry: { kind: 'radius', center: [0, 5, 0], radius: 1 } }],
      cores: { ward: createFormationCore({ formationId: 'ward', capacity: 1000 }) },
      materialId: 'stone',
      cause: 'shockwave',
      tick: 12,
      sink: sink1,
      seed: 'det-seed',
    });
    const c2 = clipTerrainOperation({
      operation: blastOp('det-1', [4, 4, 4]),
      protectedDomains: [{ domainId: 'd', formationId: 'ward', geometry: { kind: 'radius', center: [0, 5, 0], radius: 1 } }],
      cores: { ward: createFormationCore({ formationId: 'ward', capacity: 1000 }) },
      materialId: 'stone',
      cause: 'shockwave',
      tick: 12,
      sink: sink2,
      seed: 'det-seed',
    });
    assert(JSON.stringify(c1) === JSON.stringify(c2), 'clip: identical inputs → identical results');
    assert(
      c1.matterResult !== null && c2.matterResult !== null &&
        c1.matterResult.event.eventId === c2.matterResult.event.eventId,
      'clip: deterministic event id (FNV over op id)',
    );

    const sink3 = new MatterSink();
    const c3 = clipTerrainOperation({
      operation: blastOp('det-1', [4, 4, 4]),
      protectedDomains: [{ domainId: 'd', formationId: 'ward', geometry: { kind: 'radius', center: [0, 5, 0], radius: 1 } }],
      cores: { ward: createFormationCore({ formationId: 'ward', capacity: 1000 }) },
      materialId: 'stone',
      cause: 'shockwave',
      tick: 12,
      sink: sink3,
      seed: 'other-seed',
    });
    assert(
      c1.matterResult !== null && c3.matterResult !== null &&
        c1.matterResult.removedVolumeM3 === c3.matterResult.removedVolumeM3,
      'clip: different seed → same geometry, same removed volume',
    );
  }

  // ---------------------------------------------------------------------
  console.log('\n=== Results ===');
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
  console.log(failed === 0 ? '\n✅ ALL TESTS PASSED' : `\n❌ ${failed} TESTS FAILED`);
  return failed === 0;
}

run().then((ok) => {
  process.exit(ok ? 0 : 1);
}).catch((e) => {
  console.error('Test runner crashed:', e);
  process.exit(1);
});
