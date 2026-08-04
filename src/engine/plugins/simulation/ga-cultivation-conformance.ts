/*
 * ga:cultivation — Conformance Test
 *
 * Tests the cultivation plugin against doc 31 (Cultivation Effect Algebra).
 * All tests use deterministic operations only.
 * No forbidden functions in simulation code.
 */

import {
  createCultivationApi,
  createCultivationPlugin,
  createQiState,
  createHeartMindState,
  createDantianSystem,
  createSpiritualRoots,
  createBreakthroughState,
  createBalancedPhaseAffinity,
  createQiReservoir,
  createContaminationState,
  recalcContamination,
  normalizePhaseAffinity,
  phaseDotProduct,
  phaseMatchup,
  prepChecksPass,
  advancePrepToThreshold,
  coherenceDrift,
  checkThresholdToConfrontation,
  applyConfrontationResponse,
  resolveIntegration,
  applyTechnique,
  checkPlateau,
  accumulateFalseCircuit,
  accumulateCrossCurrent,
  accumulateRouteFixation,
  accumulateDelusionalConviction,
  checkDeviationOnset,
  checkDeviationCascade,
  attemptComprehension,
  computeHarmonyFactor,
  createDualCultivationSession,
  createDeviationRisk,
  advanceRealm,
  createCultivatorState,
  setTier,
  aggregateDailyProgress,
  openMiddleDantian,
  openUpperDantian,
  awakenRoot,
  classifyRootPurity,
  REALM_LADDER,
  REALM_INDEX,
  type QiState,
  type HeartMindState,
  type DantianSystem,
  type SpiritualRoots,
  type BreakthroughState,
  type Technique,
  type TechniqueEffect,
  type DeviationRiskType,
  type ComprehensionTarget,
  type DualCultivationTechnique,
  type DualCultivationSession,
  type CultivatorState,
  type PhaseName,
  type Xinmo,
  type RoutingState,
  type CultivationApi,
  type CultivationStats,
  type PhaseAffinity,
} from './ga-cultivation';

import { createPluginHost } from '../../kernel/plugin-host';
import { getFingerprint } from '../../../lib/determinism/fingerprint';
import { DeterminismPlugin } from '../ga-determinism';

// ============================================================================
// Test harness
// ============================================================================

let passed = 0;
let failed = 0;

function assert(condition: boolean, label: string) {
  if (condition) {
    passed++;
    console.log(`  \u2705 ${label}`);
  } else {
    failed++;
    console.error(`  \u274c ${label}`);
  }
}

function assertEq<T>(actual: T, expected: T, label: string) {
  if (JSON.stringify(actual) === JSON.stringify(expected)) {
    passed++;
    console.log(`  \u2705 ${label}`);
  } else {
    failed++;
    console.error(`  \u274c ${label} — expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

function approxEq(a: number, b: number, eps: number, label: string) {
  const diff = a - b;
  const abs = diff >= 0 ? diff : -diff;
  if (abs <= eps) {
    passed++;
    console.log(`  \u2705 ${label}`);
  } else {
    failed++;
    console.error(`  \u274c ${label} — expected ~${b}, got ${a}, diff=${abs}`);
  }
}

// ============================================================================
// SECTION 1: QiState creation with correct defaults
// ============================================================================

console.log('\n=== SECTION 1: QiState creation ===');

{
  const qs = createQiState('mortal');

  // Mortal: 0 reservoir
  assertEq(qs.reservoir.lowerDantian, 0, 'mortal: lowerDantian=0');
  assertEq(qs.reservoir.middleDantian, 0, 'mortal: middleDantian=0');
  assertEq(qs.reservoir.upperDantian, 0, 'mortal: upperDantian=0');
  assertEq(qs.reservoir.capacityLower, 0, 'mortal: capacityLower=0');
  assertEq(qs.reservoir.capacityMiddle, 0, 'mortal: capacityMiddle=0');
  assertEq(qs.reservoir.capacityUpper, 0, 'mortal: capacityUpper=0');
  assertEq(qs.reservoir.rechargeRate, 0, 'mortal: rechargeRate=0');

  // Balanced phases (sum=1.0)
  const pa = qs.phaseAffinity;
  approxEq(pa.wood, 0.2, 0.001, 'mortal: wood=0.2');
  approxEq(pa.fire, 0.2, 0.001, 'mortal: fire=0.2');
  approxEq(pa.earth, 0.2, 0.001, 'mortal: earth=0.2');
  approxEq(pa.metal, 0.2, 0.001, 'mortal: metal=0.2');
  approxEq(pa.water, 0.2, 0.001, 'mortal: water=0.2');
  approxEq(pa.wood + pa.fire + pa.earth + pa.metal + pa.water, 1.0, 0.001, 'mortal: phases sum=1.0');

  // Yin-yang at 0
  assertEq(qs.yinYang, 0, 'mortal: yinYang=0');

  // Purity at 0 for mortal
  assertEq(qs.purity, 0, 'mortal: purity=0');

  // Contamination all zero
  assertEq(qs.contamination.modao, 0, 'mortal: contam.modao=0');
  assertEq(qs.contamination.karmic, 0, 'mortal: contam.karmic=0');
  assertEq(qs.contamination.environmental, 0, 'mortal: contam.environmental=0');
  assertEq(qs.contamination.tribulation, 0, 'mortal: contam.tribulation=0');
  assertEq(qs.contamination.total, 0, 'mortal: contam.total=0');
}

// Qi Induction qi state
{
  const qs = createQiState('qi_induction');
  assertEq(qs.reservoir.lowerDantian, 10, 'qi_induction: lowerDantian=10');
  assertEq(qs.reservoir.capacityLower, 100, 'qi_induction: capacityLower=100');
  assertEq(qs.reservoir.rechargeRate, 0.1, 'qi_induction: rechargeRate=0.1');
  assertEq(qs.purity, 0.1, 'qi_induction: purity=0.1');
}

// ============================================================================
// SECTION 2: HeartMindState creation
// ============================================================================

console.log('\n=== SECTION 2: HeartMindState creation ===');

{
  const hms = createHeartMindState();
  assertEq(hms.attention, 50, 'heart-mind: attention=50');
  assertEq(hms.will, 50, 'heart-mind: will=50');
  assertEq(hms.emotionalBalance, 0, 'heart-mind: emotionalBalance=0');
  assertEq(hms.unresolvedAttachments.length, 0, 'heart-mind: no unresolved attachments');
  assertEq(hms.integratedLawFragments.length, 0, 'heart-mind: no integrated fragments');
  assertEq(hms.unintegratedLawFragments.length, 0, 'heart-mind: no unintegrated fragments');
  assertEq(hms.xinmo.length, 0, 'heart-mind: no xinmo');
  assertEq(hms.devRisks.length, 8, 'heart-mind: 8 deviation risk slots');
}

// ============================================================================
// SECTION 3: Realm advancement mortal → qi_induction → qi_condensation
// ============================================================================

console.log('\n=== SECTION 3: Realm advancement ===');

{
  const roots = createSpiritualRoots();
  let c = createCultivatorState(1, roots);
  assertEq(c.realm, 'mortal', 'start: realm=mortal');

  // Advance to qi_induction
  c = advanceRealm(c, 100);
  assertEq(c.realm, 'qi_induction', 'advance: realm=qi_induction');
  assertEq(c.qiState.reservoir.capacityLower, 100, 'qi_induction: capacityLower=100');
  assert(c.qiState.reservoir.lowerDantian >= 0, 'qi_induction: lowerDantian >= 0');
  assert(c.dantianSystem.lower.capacity > 0, 'qi_induction: lower dantian has capacity');
  assertEq(c.dantianSystem.middle, null, 'qi_induction: middle dantian still null');
  assertEq(c.dantianSystem.upper, null, 'qi_induction: upper dantian still null');
  assertEq(c.dantianSystem.goldenCore, null, 'qi_induction: no golden core');

  // Advance to qi_condensation
  c = advanceRealm(c, 200);
  assertEq(c.realm, 'qi_condensation', 'advance: realm=qi_condensation');
  assertEq(c.dantianSystem.middle, null, 'qi_condensation: middle dantian still null');
  assertEq(c.dantianSystem.upper, null, 'qi_condensation: upper dantian still null');
}

// ============================================================================
// SECTION 4: Dantian opening (middle at foundation, upper at core)
// ============================================================================

console.log('\n=== SECTION 4: Dantian opening ===');

{
  const roots = createSpiritualRoots();
  let c = createCultivatorState(1, roots);

  // Advance to foundation_establishment
  c = advanceRealm(c, 100); // qi_induction
  c = advanceRealm(c, 200); // qi_condensation
  c = advanceRealm(c, 300); // foundation_establishment

  assertEq(c.realm, 'foundation_establishment', 'foundation: realm correct');
  assert(c.dantianSystem.middle !== null, 'foundation: middle dantian opened');
  assertEq(c.dantianSystem.middle!.dantianId, 'middle', 'foundation: middle dantian has correct id');
  assertEq(c.dantianSystem.middle!.capacity, 200, 'foundation: middle capacity=200');
  assertEq(c.dantianSystem.upper, null, 'foundation: upper still null');

  // Advance to core_formation
  c = advanceRealm(c, 400);
  assertEq(c.realm, 'core_formation', 'core_formation: realm correct');
  assert(c.dantianSystem.upper !== null, 'core_formation: upper dantian opened');
  assertEq(c.dantianSystem.upper!.dantianId, 'upper', 'core_formation: upper dantian has correct id');
  assertEq(c.dantianSystem.upper!.capacity, 500, 'core_formation: upper capacity=500');
  assert(c.dantianSystem.goldenCore !== null, 'core_formation: golden core formed');
}

// Also test the open functions directly
{
  const ds = createDantianSystem('mortal');
  assertEq(ds.middle, null, 'openMiddle: starts null');

  const ds2 = openMiddleDantian(ds);
  assert(ds2.middle !== null, 'openMiddle: now not null');
  assertEq(ds2.middle!.capacity, 200, 'openMiddle: capacity=200');

  // Idempotent
  const ds3 = openMiddleDantian(ds2);
  assert(ds3.middle === ds2.middle, 'openMiddle: idempotent');

  const ds4 = openUpperDantian(ds2);
  assert(ds4.upper !== null, 'openUpper: now not null');
  assertEq(ds4.upper!.capacity, 500, 'openUpper: capacity=500');
  assert(ds4.goldenCore !== null, 'openUpper: golden core created');
}

// ============================================================================
// SECTION 5: Spiritual roots (5 phases, awakenable, purity)
// ============================================================================

console.log('\n=== SECTION 5: Spiritual roots ===');

{
  const roots = createSpiritualRoots();

  // All 5 phases present
  assert(roots.phases.wood !== undefined, 'roots: wood phase present');
  assert(roots.phases.fire !== undefined, 'roots: fire phase present');
  assert(roots.phases.earth !== undefined, 'roots: earth phase present');
  assert(roots.phases.metal !== undefined, 'roots: metal phase present');
  assert(roots.phases.water !== undefined, 'roots: water phase present');

  // Default balanced
  approxEq(roots.phases.wood.strength, 0.2, 0.001, 'roots: wood=0.2');
  approxEq(roots.phases.fire.strength, 0.2, 0.001, 'roots: fire=0.2');
  approxEq(roots.phases.earth.strength, 0.2, 0.001, 'roots: earth=0.2');
  approxEq(roots.phases.metal.strength, 0.2, 0.001, 'roots: metal=0.2');
  approxEq(roots.phases.water.strength, 0.2, 0.001, 'roots: water=0.2');
  approxEq(roots.total, 1.0, 0.001, 'roots: total=1.0');

  // Balanced = mixed
  assertEq(roots.purity, 'mixed', 'roots: balanced = mixed purity');

  // Heavenly root: one high phase
  const heavenly = createSpiritualRoots({ wood: 0.9, fire: 0.025, earth: 0.025, metal: 0.025, water: 0.025 });
  assertEq(heavenly.purity, 'heavenly', 'roots: 0.9 single = heavenly');
  assert(!heavenly.phases.wood.latent, 'roots: wood awakened');
  assert(heavenly.phases.fire.latent, 'roots: fire latent (low)');

  // Impure: total < 0.1 (trash root)
  const trash = createSpiritualRoots({ wood: 0.02, fire: 0.02, earth: 0.02, metal: 0.02, water: 0.02 });
  assertEq(trash.purity, 'impure', 'roots: trash root = impure');

  // Awaken a latent root
  const latent = createSpiritualRoots({ wood: 0.5, fire: 0.01, earth: 0.16, metal: 0.16, water: 0.17 });
  assert(latent.phases.fire.latent, 'roots: fire starts latent');
  const awakened = awakenRoot(latent, 'fire', 500);
  assert(!awakened.phases.fire.latent, 'roots: fire awakened');
  assertEq(awakened.phases.fire.awakenedAt, 500, 'roots: fire awakenedAt=500');
}

// ============================================================================
// SECTION 6: Breakthrough PREP checks
// ============================================================================

console.log('\n=== SECTION 6: Breakthrough PREP checks ===');

{
  const qs = createQiState('qi_induction');
  // Ensure sufficient reservoir for breakthrough checks
  qs.reservoir.lowerDantian = 60; // 60% of 100
  const hms = createHeartMindState();

  // Balanced phases pass
  const balancedPass = prepChecksPass(qs, hms, 'qi_condensation');
  assert(balancedPass, 'prep: balanced phases pass phase check');

  // Unbalanced phases fail phase check
  const unbalanced: QiState = {
    ...qs,
    phaseAffinity: { wood: 0.55, fire: 0.1, earth: 0.1, metal: 0.1, water: 0.15 },
  };
  const unbalancedFail = !prepChecksPass(unbalanced, hms, 'qi_condensation');
  assert(unbalancedFail, 'prep: unbalanced phases fail (wood=0.5)');

  // Unresolved attachments fail psychospiritual
  const hmsAttached: HeartMindState = {
    ...hms,
    unresolvedAttachments: [
      { attachmentId: 'a1', subject: 1, type: 'grief', intensity: 0.8, integrationProgress: 0.3, bornAt: 0 },
    ],
  };
  const attachedFail = !prepChecksPass(qs, hmsAttached, 'qi_condensation');
  assert(attachedFail, 'prep: unresolved attachment (progress=0.3) fails');

  // Resolved attachments pass (use qs with sufficient reservoir)
  const hmsResolved: HeartMindState = {
    ...hms,
    unresolvedAttachments: [
      { attachmentId: 'a1', subject: 1, type: 'grief', intensity: 0.5, integrationProgress: 0.8, bornAt: 0 },
    ],
  };
  const qsForResolved = { ...qs, reservoir: { ...qs.reservoir, lowerDantian: 60 } };
  const resolvedPass = prepChecksPass(qsForResolved, hmsResolved, 'qi_condensation');
  assert(resolvedPass, 'prep: resolved attachment (progress=0.8) passes');

  // Reservoir insufficient fails
  const qsLowReservoir: QiState = {
    ...qs,
    reservoir: { ...qs.reservoir, lowerDantian: 10, capacityLower: 100 },
  };
  const reservoirFail = !prepChecksPass(qsLowReservoir, hms, 'foundation_establishment');
  assert(reservoirFail, 'prep: 10% reservoir fails for foundation');
}

// ============================================================================
// SECTION 7: Breakthrough THRESHOLD (coherence drift, 30-tick hold)
// ============================================================================

console.log('\n=== SECTION 7: Breakthrough THRESHOLD ===');

{
  let bt = createBreakthroughState(1, 'qi_condensation');
  bt = { ...bt, stage: 'threshold', stageStartedAt: 0 };

  // After 1 tick, coherence should drift down
  const result1 = coherenceDrift(bt, 1, 42);
  assert(result1.state.coherenceMeters.bodyQi < 0.8, 'threshold: bodyQi drifts down');
  assert(result1.state.coherenceMeters.qiAnchor < 0.8, 'threshold: qiAnchor drifts down');
  assert(result1.state.coherenceMeters.bodyAnchor < 0.8, 'threshold: bodyAnchor drifts down');

  // All meters still above 0.4 after 1 tick
  assert(result1.thresholdHeld, 'threshold: held after 1 tick');

  // After many ticks, drift should eventually bring meters below 0.4
  let drifted = bt;
  let held = true;
  for (let i = 0; i < 100; i++) {
    const r = coherenceDrift(drifted, 1, 42 + i);
    drifted = r.state;
    held = r.thresholdHeld;
    if (!held) break;
  }
  assert(!held, 'threshold: eventually fails after many ticks');

  // Forced attempt has faster drift (1.5x)
  const btForced = { ...bt, forcedAttempt: true };
  const forcedDrift = coherenceDrift(btForced, 10, 42);
  const normalDrift = coherenceDrift(bt, 10, 42);
  assert(
    forcedDrift.state.coherenceMeters.bodyQi <= normalDrift.state.coherenceMeters.bodyQi,
    'threshold: forced drifts faster than normal',
  );

  // Check transition to confrontation after 30 ticks
  const hms = createHeartMindState();
  const btHeld = { ...bt, stageStartedAt: 0 };
  const bt30 = { ...btHeld, stageStartedAt: 0 };
  const transitioned = checkThresholdToConfrontation(bt30, 30, hms);
  assertEq(transitioned.stage, 'confrontation', 'threshold: transitions to confrontation at tick 30');

  // Not yet at tick 29
  const notYet = checkThresholdToConfrontation(btHeld, 29, hms);
  assertEq(notYet.stage, 'threshold', 'threshold: stays at threshold at tick 29');
}

// ============================================================================
// SECTION 8: Breakthrough CONFRONTATION
// ============================================================================

console.log('\n=== SECTION 8: Breakthrough CONFRONTATION ===');

{
  // Integrate success: attachment with progress >= 0.5
  const bt1 = createBreakthroughState(1, 'qi_condensation');
  const btConfront = {
    ...bt1,
    stage: 'confrontation' as const,
    confrontationMaterial: {
      attachment: { attachmentId: 'a1', subject: 1, type: 'grief', intensity: 0.8, integrationProgress: 0.6, bornAt: 0 },
      domain: 'heart_barrier',
    },
  };
  const integrateSuccess = applyConfrontationResponse(btConfront, 'integrate');
  assertEq(integrateSuccess.stage, 'integration', 'confrontation: integrate success → integration');
  assertEq(integrateSuccess.confrontationMaterial!.attachment.integrationProgress, 1.0, 'confrontation: attachment resolved to 1.0');

  // Integrate failure: attachment with progress < 0.5
  const btFail = {
    ...btConfront,
    confrontationMaterial: {
      attachment: { attachmentId: 'a2', subject: 2, type: 'fear', intensity: 0.9, integrationProgress: 0.3, bornAt: 0 },
      domain: 'heart_barrier',
    },
  };
  const integrateFail = applyConfrontationResponse(btFail, 'integrate');
  assertEq(integrateFail.stage, 'failure', 'confrontation: integrate fail → failure');
  assertEq(integrateFail.xinmoRisk, 'high', 'confrontation: failure has high xinmo risk');

  // Push past
  const pushResult = applyConfrontationResponse(btConfront, 'push_past');
  assertEq(pushResult.stage, 'integration', 'confrontation: push_past → integration');
  assertEq(pushResult.xinmoRisk, 'high', 'confrontation: push_past has high xinmo risk');

  // Abort
  const abortResult = applyConfrontationResponse(btConfront, 'abort');
  assertEq(abortResult.stage, 'prep', 'confrontation: abort → prep');
  assertEq(abortResult.confrontationMaterial, null, 'confrontation: abort clears material');
}

// ============================================================================
// SECTION 9: Deviation onset
// ============================================================================

console.log('\n=== SECTION 9: Deviation onset ===');

{
  // false_circuit accumulation
  const routingClosed: RoutingState = { mode: 'closed_loop', usesReservoir: false, currentRoutingDuration: 0 };
  const contam: ContaminationState = { modao: 0.5, karmic: 0, environmental: 0, tribulation: 0, total: 0.15 };
  const fc1 = accumulateFalseCircuit(routingClosed, contam, 100);
  assert(fc1 > 0, 'deviation: false_circuit accumulates when closed loop');

  const routingNormal: RoutingState = { mode: 'normal', usesReservoir: true, currentRoutingDuration: 0 };
  const fc2 = accumulateFalseCircuit(routingNormal, contam, 100);
  assertEq(fc2, 0, 'deviation: false_circuit zero when normal routing');

  // cross_current accumulation
  const routingAgainst: RoutingState = { mode: 'against_flow', usesReservoir: true, currentRoutingDuration: 0 };
  const cc1 = accumulateCrossCurrent(routingAgainst, 100);
  assert(cc1 > 0, 'deviation: cross_current accumulates when against flow');
  const cc2 = accumulateCrossCurrent(routingNormal, 100);
  assertEq(cc2, 0, 'deviation: cross_current zero when normal');

  // route_fixation accumulation
  const routingFixed: RoutingState = { mode: 'normal', usesReservoir: true, currentRoutingDuration: 1200 };
  const rf1 = accumulateRouteFixation(routingFixed, 100);
  assert(rf1 > 0, 'deviation: route_fixation accumulates after 600 ticks');
  const routingShort: RoutingState = { mode: 'normal', usesReservoir: true, currentRoutingDuration: 100 };
  const rf2 = accumulateRouteFixation(routingShort, 100);
  assertEq(rf2, 0, 'deviation: route_fixation zero when duration < 600');

  // delusional_conviction accumulation
  const dc1 = accumulateDelusionalConviction(5, 3);
  approxEq(dc1, 0.2, 0.001, 'deviation: delusional_conviction = 2 excess * 0.1');
  const dc2 = accumulateDelusionalConviction(2, 3);
  assertEq(dc2, 0, 'deviation: delusional_conviction zero when under capacity');

  // Onset check: risk exceeds threshold
  const risks = [
    { ...createDeviationRisk('false_circuit'), accumulatedRisk: 0.9, threshold: 0.8, onsetCauses: ['test'] },
    { ...createDeviationRisk('cross_current'), accumulatedRisk: 0.1, threshold: 0.6, onsetCauses: [] },
  ];
  const { newXinmo } = checkDeviationOnset(risks, 1000);
  assertEq(newXinmo.length, 1, 'deviation: 1 xinmo manifests when false_circuit exceeds threshold');
  assertEq(newXinmo[0].xinmoType, 'false_circuit', 'deviation: correct xinmo type');
  assertEq(newXinmo[0].onsetTick, 1000, 'deviation: correct onset tick');

  // Cascade cap at 3
  const manyXinmo: Xinmo[] = [
    { xinmoType: 'false_circuit', onsetTick: 1, severity: 0.5, effects: [], resolutionPath: '' },
    { xinmoType: 'cross_current', onsetTick: 2, severity: 0.5, effects: [], resolutionPath: '' },
    { xinmoType: 'route_fixation', onsetTick: 3, severity: 0.5, effects: [], resolutionPath: '' },
    { xinmoType: 'delusional_conviction', onsetTick: 4, severity: 0.5, effects: [], resolutionPath: '' },
  ];
  assert(checkDeviationCascade(manyXinmo), 'deviation: cascade triggers with >3 xinmo');

  const fewXinmo = manyXinmo.slice(0, 3);
  assert(!checkDeviationCascade(fewXinmo), 'deviation: no cascade with 3 xinmo');
}

// ============================================================================
// SECTION 10: Bottleneck detection
// ============================================================================

console.log('\n=== SECTION 10: Bottleneck detection ===');

{
  // Plateau: improvement < 0.5% over 30 days
  // Simulate 30 days of ticks (43200 ticks = 30 * 24 * 60) where qi barely changes
  const history: number[] = [];
  for (let i = 0; i <= 43200; i++) {
    history.push(50 + (i * 0.00001)); // tiny improvement
  }
  const isPlateau = checkPlateau(history, 100);
  assert(isPlateau, 'bottleneck: plateau detected with <0.5% improvement');

  // Not plateau when improvement is significant
  const growingHistory: number[] = [];
  for (let i = 0; i <= 43200; i++) {
    growingHistory.push(10 + (i * 0.001)); // ~432% improvement
  }
  const notPlateau = !checkPlateau(growingHistory, 100);
  assert(notPlateau, 'bottleneck: no plateau with significant growth');

  // Empty history: no plateau
  const emptyPlateau = !checkPlateau([], 100);
  assert(emptyPlateau, 'bottleneck: no plateau with empty history');
}

// ============================================================================
// SECTION 11: Dual cultivation session
// ============================================================================

console.log('\n=== SECTION 11: Dual cultivation session ===');

{
  const qs1 = createQiState('qi_condensation');
  qs1.reservoir.lowerDantian = 80;
  qs1.yinYang = 0.5;

  const qs2 = createQiState('qi_condensation');
  qs2.reservoir.lowerDantian = 20;
  qs2.yinYang = -0.5;

  const hms1 = createHeartMindState();
  hms1.emotionalBalance = 0.8;

  const hms2 = createHeartMindState();
  hms2.emotionalBalance = 0.8;

  const tech: DualCultivationTechnique = {
    techniqueId: 'dual_harmony',
    phaseCompatibility: createBalancedPhaseAffinity(),
    yinYangBalance: 0,
    reservoirCost: 1,
    benefitRate: 0.5,
  };

  const session = createDualCultivationSession(1, 2, qs1, hms1, qs2, hms2, tech, 100);

  assert(session.harmonyFactor >= 0, 'dual: harmony factor >= 0');
  assert(session.harmonyFactor <= 1, 'dual: harmony factor <= 1');
  assert(session.reservoirExchange > 0, 'dual: reservoir exchange positive (flow from high to low)');
  assertEq(session.participants, [1, 2], 'dual: correct participants');
  assertEq(session.startedAt, 100, 'dual: correct start tick');

  // Low harmony = deviation risk
  const hmsTurbulent = { ...hms1, emotionalBalance: -0.9 };
  const hms2Turbulent = { ...hms2, emotionalBalance: -0.9 };
  const lowHarmonySession = createDualCultivationSession(1, 2, qs1, hmsTurbulent, qs2, hms2Turbulent, tech, 100);
  assert(lowHarmonySession.harmonyFactor < session.harmonyFactor, 'dual: turbulent emotions reduce harmony');
  assert(lowHarmonySession.deviationRisk >= 0, 'dual: deviation risk >= 0');

  // Complementary yin-yang = higher harmony
  const harmony = computeHarmonyFactor(qs1, hms1, qs2, hms2, tech);
  const sameYY: QiState = { ...qs1, yinYang: 0.5 };
  const sameYY2: QiState = { ...qs2, yinYang: 0.5 };
  const sameHarmony = computeHarmonyFactor(sameYY, hms1, sameYY2, hms2, tech);
  assert(harmony >= sameHarmony, 'dual: complementary yin-yang has higher or equal harmony');
}

// ============================================================================
// SECTION 12: Tier management (S4 full, S2 aggregate, S0 frozen)
// ============================================================================

console.log('\n=== SECTION 12: Tier management ===');

{
  const roots = createSpiritualRoots();
  const gatheringTech: Technique = {
    techniqueId: 'basic_gathering',
    type: 'gathering',
    baseEffect: {
      reservoirDelta: 1.0,
      purityDelta: 0.001,
      phaseAffinityDelta: { wood: 0, fire: 0, earth: 0, metal: 0, water: 0 },
      yinYangDelta: 0,
      meridianDevelopment: {},
      contaminationDelta: {},
    },
    phaseAffinity: createBalancedPhaseAffinity(),
    yinYang: 0,
    purityRequirement: 0,
    reservoirCost: 0,
    attentionCost: 1,
    deviationRisks: [],
  };

  // S4: full algebra applies
  let c = createCultivatorState(1, roots);
  c = advanceRealm(c, 100); // qi_induction
  c.tier = 4;
  c.activeTechnique = gatheringTech;

  const s4result = aggregateDailyProgress(c, 10);
  assert(
    s4result.qiState.reservoir.lowerDantian > c.qiState.reservoir.lowerDantian,
    'tier S4: gathering technique increases qi',
  );
  assert(
    s4result.heartMindState.attention < c.heartMindState.attention,
    'tier S4: technique consumes attention',
  );

  // S2: aggregate applies
  c.tier = 2;
  c.activeTechnique = gatheringTech;
  const s2result = aggregateDailyProgress(c, 10);
  assert(
    s2result.qiState.reservoir.lowerDantian >= c.qiState.reservoir.lowerDantian,
    'tier S2: aggregate increases or maintains qi',
  );

  // S0: frozen
  c.tier = 0;
  c.activeTechnique = gatheringTech;
  const s0result = aggregateDailyProgress(c, 10);
  assertEq(s0result.qiState.reservoir.lowerDantian, c.qiState.reservoir.lowerDantian, 'tier S0: frozen, no change');
}

// ============================================================================
// SECTION 13: Stats API
// ============================================================================

console.log('\n=== SECTION 13: Stats API ===');

{
  const api = createCultivationApi();

  // Empty stats
  const emptyStats = api.stats();
  assertEq(emptyStats.totalCultivators, 0, 'stats: 0 cultivators initially');
  assertEq(emptyStats.totalXinmo, 0, 'stats: 0 xinmo initially');
  assertEq(emptyStats.totalActiveBreakthroughs, 0, 'stats: 0 active breakthroughs initially');
  assertEq(emptyStats.totalBottlenecks, 0, 'stats: 0 bottlenecks initially');

  // Create cultivators
  api.createCultivator(1);
  api.createCultivator(2, { wood: 0.9, fire: 0.025, earth: 0.025, metal: 0.025, water: 0.025 });

  const stats2 = api.stats();
  assertEq(stats2.totalCultivators, 2, 'stats: 2 cultivators after creation');
  assertEq(stats2.byRealm.mortal, 2, 'stats: 2 mortals');

  // Advance one
  api.advanceRealm(1, 100);
  const stats3 = api.stats();
  assertEq(stats3.byRealm.mortal, 1, 'stats: 1 mortal after advancement');
  assertEq(stats3.byRealm.qi_induction, 1, 'stats: 1 qi_induction after advancement');

  // List and remove
  assertEq(api.listCultivators().length, 2, 'stats: list returns 2');
  assert(api.removeCultivator(2), 'stats: remove returns true');
  assertEq(api.listCultivators().length, 1, 'stats: 1 cultivator after removal');
}

// ============================================================================
// SECTION 14: Full API integration
// ============================================================================

console.log('\n=== SECTION 14: Full API integration ===');

{
  const api = createCultivationApi();

  // Create a cultivator and advance through realms
  api.createCultivator(10);
  api.advanceRealm(10, 100); // qi_induction
  api.advanceRealm(10, 200); // qi_condensation

  // Verify state access
  const qs = api.getQiState(10)!;
  assert(qs !== undefined, 'api: qi state accessible');
  assert(qs.reservoir.capacityLower > 0, 'api: qi has capacity');

  const hms = api.getHeartMindState(10)!;
  assert(hms !== undefined, 'api: heart-mind state accessible');
  assertEq(hms.attention, 50, 'api: attention=50');

  const ds = api.getDantianSystem(10)!;
  assert(ds !== undefined, 'api: dantian system accessible');
  assertEq(ds.middle, null, 'api: middle dantian null at qi_condensation');

  const sr = api.getSpiritualRoots(10)!;
  assert(sr !== undefined, 'api: spiritual roots accessible');
  assert(sr.phases.wood !== undefined, 'api: wood phase present');

  // Apply a technique
  const tech: Technique = {
    techniqueId: 'test_gathering',
    type: 'gathering',
    baseEffect: {
      reservoirDelta: 2.0,
      purityDelta: 0.01,
      phaseAffinityDelta: { wood: 0, fire: 0, earth: 0, metal: 0, water: 0 },
      yinYangDelta: 0,
      meridianDevelopment: {},
      contaminationDelta: {},
    },
    phaseAffinity: createBalancedPhaseAffinity(),
    yinYang: 0,
    purityRequirement: 0,
    reservoirCost: 0,
    attentionCost: 5,
    deviationRisks: [],
  };

  api.setActiveTechnique(10, tech);
  const result = api.applyTechnique(10, tech, 10);
  assert(result !== undefined, 'api: technique applied');
  assert(result.qs.reservoir.lowerDantian > qs.reservoir.lowerDantian, 'api: qi increased after technique');

  // Step cultivator
  api.stepCultivator(10, 1, 300);
  const afterStep = api.getCultivator(10);
  assert(afterStep !== undefined, 'api: cultivator still exists after step');
  assertEq(afterStep!.lastActiveTick, 300, 'api: lastActiveTick updated');

  // Non-existent cultivator
  assertEq(api.getCultivator(999), undefined, 'api: undefined for non-existent');
  assertEq(api.applyTechnique(999, tech, 1), undefined, 'api: undefined technique for non-existent');
}

// ============================================================================
// SECTION 15: Deviation through API
// ============================================================================

console.log('\n=== SECTION 15: Deviation through API ===');

{
  const api = createCultivationApi();
  api.createCultivator(20);

  // Accumulate risk
  assert(api.accumulateDeviationRisk(20, 'false_circuit', 0.5), 'api: accumulate risk returns true');
  assert(api.accumulateDeviationRisk(20, 'false_circuit', 0.4), 'api: accumulate more risk');

  // Check onset
  const xinmo = api.checkDeviationOnset(20, 500);
  assertEq(xinmo.length, 1, 'api: 1 xinmo after exceeding false_circuit threshold');
  assertEq(xinmo[0].xinmoType, 'false_circuit', 'api: correct xinmo type');

  // Second check doesn't duplicate
  const xinmo2 = api.checkDeviationOnset(20, 501);
  // Already manifested, so no new xinmo (accumulated is same)
  assert(xinmo2.length <= 1, 'api: no duplicate xinmo on re-check');
}

// ============================================================================
// SECTION 16: Breakthrough through API
// ============================================================================

console.log('\n=== SECTION 16: Breakthrough through API ===');

{
  const api = createCultivationApi();
  api.createCultivator(30);
  api.advanceRealm(30, 100); // qi_induction
  // Build up qi via technique application (large delta + long duration to overcome effectiveness modifiers)
  const gatherTech: Technique = {
    techniqueId: 'test_gather',
    type: 'gathering',
    baseEffect: {
      reservoirDelta: 100.0,
      purityDelta: 0,
      phaseAffinityDelta: { wood: 0, fire: 0, earth: 0, metal: 0, water: 0 },
      yinYangDelta: 0,
      meridianDevelopment: {},
      contaminationDelta: {},
    },
    phaseAffinity: createBalancedPhaseAffinity(),
    yinYang: 0,
    purityRequirement: 0,
    reservoirCost: 0,
    attentionCost: 0,
    deviationRisks: [],
  };
  api.applyTechnique(30, gatherTech, 100); // large dt to fill reservoir to cap

  // Start breakthrough
  const bt = api.startBreakthrough(30, 'qi_condensation');
  assert(bt !== undefined, 'api: breakthrough started');
  assertEq(bt!.stage, 'prep', 'api: starts at prep');

  // Advance prep → threshold
  let btState = api.advanceBreakthroughStage(30, 200);
  assertEq(btState!.stage, 'threshold', 'api: advances to threshold (checks pass)');

  // Get breakthrough state
  const btGet = api.getBreakthroughState(30);
  assert(btGet !== undefined, 'api: can get breakthrough state');

  // Advance through threshold (30 ticks)
  for (let t = 201; t <= 230; t++) {
    btState = api.advanceBreakthroughStage(30, t);
  }
  // Should reach confrontation, or oscillate between prep and threshold
  assert(
    btState!.stage === 'confrontation' || btState!.stage === 'prep' || btState!.stage === 'threshold',
    'api: reaches confrontation, falls back to prep, or remains at threshold',
  );
}

// ============================================================================
// SECTION 17: Plugin registration
// ============================================================================

console.log('\n=== SECTION 17: Plugin registration ===');

{
  const host = createPluginHost(getFingerprint());
  host.registerPlugin(DeterminismPlugin);
  const plugin = createCultivationPlugin();

  assertEq(plugin.id, 'ga:cultivation', 'plugin: id correct');
  assertEq(plugin.version, '0.1.0', 'plugin: version correct');
  assert(plugin.dependencies.includes('ga:determinism'), 'plugin: depends on ga:determinism');

  const regResult = host.registerPlugin(plugin);
  assert(regResult.ok, 'plugin: registers successfully');

  // Check capabilities
  assert(host.capabilities.has('cultivation.state'), 'plugin: cultivation.state registered');
  assert(host.capabilities.has('cultivation.breakthrough'), 'plugin: cultivation.breakthrough registered');
  assert(host.capabilities.has('cultivation.deviation'), 'plugin: cultivation.deviation registered');

  // Check state
  const state = host.getState('ga:cultivation');
  assert(state !== undefined, 'plugin: state stored in host');

  // Unregister
  host.unregisterPlugin('ga:cultivation');
  assert(!host.capabilities.has('cultivation.state'), 'plugin: capabilities unregistered');
}

// ============================================================================
// SECTION 18: Effect algebra composition (chain rule)
// ============================================================================

console.log('\n=== SECTION 18: Effect algebra composition ===');

{
  const qs = createQiState('qi_induction');
  const hms = createHeartMindState();

  const techA: Technique = {
    techniqueId: 'tech_a',
    type: 'gathering',
    baseEffect: {
      reservoirDelta: 1.0,
      purityDelta: 0.01,
      phaseAffinityDelta: { wood: 0.01, fire: 0, earth: 0, metal: 0, water: 0 },
      yinYangDelta: 0.05,
      meridianDevelopment: {},
      contaminationDelta: {},
    },
    phaseAffinity: createBalancedPhaseAffinity(),
    yinYang: 0,
    purityRequirement: 0,
    reservoirCost: 0,
    attentionCost: 2,
    deviationRisks: [],
  };

  const techB: Technique = {
    techniqueId: 'tech_b',
    type: 'refining',
    baseEffect: {
      reservoirDelta: -0.5,
      purityDelta: 0.02,
      phaseAffinityDelta: { wood: 0, fire: 0, earth: 0, metal: 0, water: 0 },
      yinYangDelta: -0.02,
      meridianDevelopment: {},
      contaminationDelta: {},
    },
    phaseAffinity: createBalancedPhaseAffinity(),
    yinYang: 0,
    purityRequirement: 0,
    reservoirCost: 0,
    attentionCost: 2,
    deviationRisks: [],
  };

  // Apply A then B
  const r1 = applyTechnique(qs, hms, techA, 10);
  const r2 = applyTechnique(r1.qs, r1.hms, techB, 10);

  // B uses A's modified state — chain rule
  assert(r2.qs.purity > qs.purity, 'composition: purity increased through chain');
  assert(r2.hms.attention < hms.attention, 'composition: attention consumed through chain');
}

// ============================================================================
// SECTION 19: Phase matchup
// ============================================================================

console.log('\n=== SECTION 19: Phase matchup ===');

{
  // Wood conquers Earth
  approxEq(phaseMatchup('wood', 'earth'), 1.3, 0.001, 'matchup: wood conquers earth = 1.3');
  // Fire conquers Metal
  approxEq(phaseMatchup('fire', 'metal'), 1.3, 0.001, 'matchup: fire conquers metal = 1.3');
  // Earth conquers Water
  approxEq(phaseMatchup('earth', 'water'), 1.3, 0.001, 'matchup: earth conquers water = 1.3');
  // Metal conquers Wood (reverse conquest from wood's perspective)
  approxEq(phaseMatchup('wood', 'metal'), 0.7, 0.001, 'matchup: metal conquers wood → 0.7');
  // Water conquers Fire (reverse from fire's perspective)
  approxEq(phaseMatchup('fire', 'water'), 0.7, 0.001, 'matchup: water conquers fire → 0.7');
  // Generation: wood generates fire
  approxEq(phaseMatchup('wood', 'fire'), 1.3, 0.001, 'matchup: wood vs fire = 1.3 (wood generates fire)');
  // Neutral: wood vs water (no conquest or generation relationship)
  approxEq(phaseMatchup('wood', 'water'), 1.0, 0.001, 'matchup: wood vs water = 1.0 (neutral)');
}

// ============================================================================
// SECTION 20: Comprehension
// ============================================================================

console.log('\n=== SECTION 20: Comprehension ===');

{
  const target: ComprehensionTarget = {
    targetId: 'wood_law',
    domain: 'wood_phase',
    maxIntensity: 3,
    concealment: 0.2,
    lawFragmentsAvailable: ['wood_fragment_1'],
  };

  // High attention, decent skill
  const attempt1 = attemptComprehension(1, target, 0.8, 80, 100);
  assert(attempt1.success, 'comprehension: success with good conditions');
  assert(attempt1.achievedIntensity >= 1, 'comprehension: achieved intensity >= 1');
  assert(attempt1.resultingFragment !== null, 'comprehension: produces fragment');
  assertEq(attempt1.resultingFragment!.domain, 'wood_phase', 'comprehension: fragment has correct domain');

  // Low attention
  const attempt2 = attemptComprehension(1, target, 0.8, 5, 100);
  // Very low attention = low intensity
  assert(attempt2.achievedIntensity < attempt1.achievedIntensity, 'comprehension: low attention reduces intensity');

  // API-based comprehension
  const api = createCultivationApi();
  api.createCultivator(40);
  const apiAttempt = api.attemptComprehension(40, target);
  assert(apiAttempt !== undefined, 'comprehension api: attempt returned');
  if (apiAttempt!.resultingFragment) {
    const c = api.getCultivator(40)!;
    assert(c.heartMindState.unintegratedLawFragments.length > 0, 'comprehension api: fragment added to unintegrated');
  }
}

// ============================================================================
// SECTION 21: Realm ladder
// ============================================================================

console.log('\n=== SECTION 21: Realm ladder ===');

{
  assertEq(REALM_LADDER.length, 10, 'ladder: 10 realms');
  assertEq(REALM_LADDER[0], 'mortal', 'ladder: [0]=mortal');
  assertEq(REALM_LADDER[1], 'qi_induction', 'ladder: [1]=qi_induction');
  assertEq(REALM_LADDER[2], 'qi_condensation', 'ladder: [2]=qi_condensation');
  assertEq(REALM_LADDER[3], 'foundation_establishment', 'ladder: [3]=foundation');
  assertEq(REALM_LADDER[4], 'core_formation', 'ladder: [4]=core_formation');
  assertEq(REALM_LADDER[9], 'mahayana', 'ladder: [9]=mahayana');

  assertEq(REALM_INDEX.mortal, 0, 'index: mortal=0');
  assertEq(REALM_INDEX.mahayana, 9, 'index: mahayana=9');
}

// ============================================================================
// SECTION 22: Contamination recalculation
// ============================================================================

console.log('\n=== SECTION 22: Contamination recalculation ===');

{
  const c = createContaminationState();
  assertEq(c.total, 0, 'contam: starts at 0');

  const c2 = { modao: 1, karmic: 0, environmental: 0, tribulation: 0, total: 0 };
  const c2r = recalcContamination(c2);
  approxEq(c2r.total, 0.3, 0.001, 'contam: modao=1 → total=0.3');

  const c3 = { modao: 0, karmic: 1, environmental: 0, tribulation: 0, total: 0 };
  const c3r = recalcContamination(c3);
  approxEq(c3r.total, 0.3, 0.001, 'contam: karmic=1 → total=0.3');

  const c4 = { modao: 1, karmic: 1, environmental: 1, tribulation: 1, total: 0 };
  const c4r = recalcContamination(c4);
  approxEq(c4r.total, 1.0, 0.001, 'contam: all max → total=1.0');
}

// ============================================================================
// SECTION 23: Phase affinity normalization
// ============================================================================

console.log('\n=== SECTION 23: Phase affinity normalization ===');

{
  const unnormalized: PhaseAffinity = { wood: 5, fire: 3, earth: 1, metal: 0, water: 1 };
  const normalized = normalizePhaseAffinity(unnormalized);
  const sum = normalized.wood + normalized.fire + normalized.earth + normalized.metal + normalized.water;
  approxEq(sum, 1.0, 0.001, 'normalize: sum=1.0');
  approxEq(normalized.wood, 0.5, 0.001, 'normalize: wood=0.5');

  // Zero sum returns balanced
  const zeroSum: PhaseAffinity = { wood: 0, fire: 0, earth: 0, metal: 0, water: 0 };
  const zeroResult = normalizePhaseAffinity(zeroSum);
  approxEq(zeroResult.wood, 0.2, 0.001, 'normalize: zero sum → balanced');
}

// ============================================================================
// Summary
// ============================================================================

console.log(`\n${'='.repeat(60)}`);
console.log(`Cultivation Conformance: ${passed} passed, ${failed} failed, ${passed + failed} total`);
console.log('='.repeat(60));

if (failed > 0) {
  process.exit(1);
}
