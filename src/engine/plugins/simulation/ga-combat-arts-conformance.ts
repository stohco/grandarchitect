/**
 * ga:combat-arts Conformance Test
 *
 * Proves the deterministic combat arts core:
 * - divine-sense pool math (capacity / consumption / regeneration / overload)
 * - flying-sword vector-curving + karmic-tether snapping
 * - body cultivation mass / impact weight / shockwave numbers
 * - life-essence combustion tradeoff (health cost equals stated)
 * - stance shift + cancel semantics (phantom-clone continuation)
 * - artifact gating (bludgeon-only below minRealm; unlock at minRealm; qi drain)
 * - blood-refining over-draft (health cost equals stated)
 * - the five status afflictions (slow, mirror, cast-break+stagger,
 *   input scramble, spell-lock) + cleanse rules
 * - determinism: same seed -> identical results
 *
 * Run: bun run src/engine/plugins/simulation/ga-combat-arts-conformance.ts
 */

import {
  createDivineSensePool,
  activateTracking,
  stepDivineSensePool,
  applySoulAttack,
  createVectorCurve,
  evaluateQuadBezier,
  stepVectorCurve,
  createKarmicTether,
  stepKarmicTether,
  createBlade,
  deployBlades,
  applyVectorCurve,
  stepBlade,
  snapKarmicTether,
  crashBlades,
  BLADE_COUNT,
  DIVINE_SENSE_CAPACITY,
  DIVINE_SENSE_OVERLOAD_FRAMES,
  DIVINE_SENSE_CONSUMPTION_PER_TARGET,
  createBodyCultivation,
  computeImpactWeight,
  dashThroughStructure,
  triggerShockwave,
  igniteLifeEssence,
  stepBodyCultivation,
  BODY_MASS_MULTIPLIER,
  SHOCKWAVE_RADIUS,
  createStanceState,
  shiftStance,
  mapFaceButton,
  combatInputForButton,
  updateStanceTimers,
  STANCE_ACTION_SET,
  IDLE_SHIFT_LOCK_FRAMES,
  RECOVERY_SHIFT_LOCK_FRAMES,
  STANCE_DANCE_RETURN_LOCK_FRAMES,
  createTechniqueProfile,
  combineProfileWithArtifact,
  getArtifactUnlock,
  bludgeonStrike,
  activateArtifactFunction,
  BLUDGEON_DAMAGE,
  applyStatusEffect,
  stepStatusEffects,
  cleanseStatusEffect,
  computeStatusDeltas,
  breakCast,
  resolveScrambledInput,
  canActWithEffects,
  isSpellLocked,
  STATUS_EFFECT_MECHANICS,
  STATUS_EFFECT_IDS,
  SOUL_FREEZE_SLOW_MAX,
  KARMIC_MIRROR_MAX,
  TRIBULATION_STAGGER_BASE,
  TRIBULATION_STAGGER_PER_MAG,
  createCombatArtsState,
  stepArtsState,
  createCombatArtsApi,
  createCombatArtsPlugin,
  hashString64,
  type FlyingSwordState,
  type StatusEffectState,
  type ArtifactState,
  type ArtifactUseResult,
} from './ga-combat-arts';
import { createCombatant, type CombatInput } from './ga-combat';
import { createPluginHost } from '../../kernel/plugin-host';
import { getFingerprint } from '../../../lib/determinism/fingerprint';
import { DeterminismPlugin } from '../ga-determinism';
import { createCombatPlugin } from './ga-combat';

let passed = 0;
let failed = 0;

function assert(condition: boolean, msg: string) {
  if (condition) { passed++; console.log(`  ✅ ${msg}`); }
  else { failed++; console.log(`  ❌ ${msg}`); }
}

function assertEq<T>(actual: T, expected: T, msg: string) {
  if (actual === expected) { passed++; console.log(`  ✅ ${msg}`); }
  else { failed++; console.log(`  ❌ ${msg} — got ${actual}, expected ${expected}`); }
}

function assertClose(actual: number, expected: number, msg: string, eps = 0.0001) {
  if (Math.abs(actual - expected) < eps) { passed++; console.log(`  ✅ ${msg}`); }
  else { failed++; console.log(`  ❌ ${msg} — got ${actual}, expected ${expected}`); }
}

function vEq(a: number[], b: number[]): boolean {
  return Math.abs(a[0] - b[0]) < 1e-9 && Math.abs(a[1] - b[1]) < 1e-9 && Math.abs(a[2] - b[2]) < 1e-9;
}

// ============================================================================
console.log('=== SECTION 1: Divine sense pool — capacity by realm ===');
{
  assertEq(DIVINE_SENSE_CAPACITY.mortal, 0, 'mortal has no pool');
  assertEq(DIVINE_SENSE_CAPACITY.qi_condensation, 100, 'qi condensation pool = 100');
  assertEq(DIVINE_SENSE_CAPACITY.foundation_establishment, 250, 'foundation pool = 250');
  assertEq(DIVINE_SENSE_CAPACITY.nascent_soul, 5000, 'nascent soul pool = 5000');
  assertEq(DIVINE_SENSE_CAPACITY.mahayana, 1280000, 'mahayana pool = 1280000');

  const pool = createDivineSensePool('qi_condensation');
  assertEq(pool.capacity, 100, 'created pool capacity');
  assertEq(pool.current, 100, 'created pool full');
  assertClose(pool.regenerationPerFrame, 0.04, 'regen = capacity × 0.0004');
  assertClose(pool.activeConsumptionPerTarget, 0.25, 'consumption per target = 0.25');
  assertEq(pool.overloadState, 'none', 'not overloaded initially');
}

console.log('=== SECTION 2: Divine sense pool — tracking activation ===');
{
  const pool = createDivineSensePool('qi_condensation');
  const weave = activateTracking(pool, 'telekinetic-weave', 2, 'qi_condensation');
  assertEq(weave.ok, false, 'telekinetic-weave realm-gated below foundation');
  assertEq(weave.reason, 'realm-gated', 'reason = realm-gated');

  const foundationPool = createDivineSensePool('foundation_establishment');
  const ok = activateTracking(foundationPool, 'telekinetic-weave', 2, 'foundation_establishment');
  assertEq(ok.ok, true, 'telekinetic-weave unlocked at foundation');
  assertClose(ok.pool.current, 250 - 250 * 0.05 * 2, 'activation drains 5% × capacity × targets');
  assertEq(ok.pool.trackingMode, 'telekinetic-weave', 'mode set');
  assertEq(ok.pool.trackedTargets, 2, '2 targets tracked');

  const conceptual = activateTracking(foundationPool, 'conceptual-lock', 1, 'foundation_establishment');
  assertEq(conceptual.ok, false, 'conceptual-lock realm-gated below spirit severance');
  assertEq(conceptual.reason, 'realm-gated', 'reason = realm-gated');

  const ssPool = createDivineSensePool('spirit_severance');
  const lock = activateTracking(ssPool, 'conceptual-lock', 1, 'spirit_severance');
  assertEq(lock.ok, true, 'conceptual-lock unlocked at spirit severance');
  assertEq(lock.pool.trackingMode, 'conceptual-lock', 'conceptual-lock mode set');

  const release = activateTracking(lock.pool, null, 0, 'spirit_severance');
  assertEq(release.reason, 'released', 'release clears mode');
  assertEq(release.pool.trackingMode, null, 'mode cleared');
}

console.log('=== SECTION 3: Divine sense pool — consumption, regen, overload ===');
{
  // 2 targets at 0.25/frame → 0.5/frame drain, 0.04/frame regen → net -0.46/frame
  const pool = createDivineSensePool('qi_condensation');
  const s1 = stepDivineSensePool(pool, 2, 10);
  assertClose(s1.current, 100 - 10 * (0.25 * 2 - 0.04), '10 frames at 2 targets: net drain math');
  assertEq(s1.overloadState, 'none', 'not overloaded yet');

  // Exhaust the pool: drain everything
  let drained = s1;
  for (let i = 0; i < 30; i++) drained = stepDivineSensePool(drained, 2, 10);
  assertEq(drained.overloadState, 'overloaded', 'pool exhaustion → overload');
  assert(drained.overloadFrames > 0 && drained.overloadFrames <= DIVINE_SENSE_OVERLOAD_FRAMES, 'overload timer within window (ticks down during drain loop)');
  assertEq(drained.current, 0, 'current zeroed on overload');

  // Overload ticks down; no regen during overload
  const t1 = stepDivineSensePool(drained, 2, 100);
  assertEq(t1.overloadState, 'overloaded', 'still overloaded after 100 frames');
  assertEq(t1.current, 0, 'no regen during overload');
  const t2 = stepDivineSensePool(drained, 2, 240);
  assertEq(t2.overloadState, 'none', 'overload cleared after 240 frames');
  assertEq(t2.current, 0, 'recovered pool starts empty');

  // Regen fills toward capacity (not beyond)
  let regen = t2;
  for (let i = 0; i < 1000; i++) regen = stepDivineSensePool(regen, 0, 10);
  assertClose(regen.current, 100, 'regen restores to capacity');
  const over = stepDivineSensePool(regen, 0, 100000);
  assertEq(over.current, 100, 'regen capped at capacity');
}

console.log('=== SECTION 4: Soul attack → mental overload ===');
{
  const pool = createDivineSensePool('nascent_soul');
  const mild = applySoulAttack(pool, 0.5);
  assertEq(mild.mentalOverload, false, 'severity 0.5 does not overload');
  assertEq(mild.pool.overloadState, 'none', 'pool unaffected by mild attack');

  const heavy = applySoulAttack(pool, 1.0);
  assertEq(heavy.mentalOverload, true, 'severity 1.0 → mental overload');
  assertEq(heavy.pool.overloadState, 'overloaded', 'pool overloaded');

  const mid = applySoulAttack(pool, 0.7);
  assertEq(mid.mentalOverload, false, 'severity 0.7 → strain 70 < 100, no overload');
}

console.log('=== SECTION 5: VectorCurve primitive ===');
{
  const curve = createVectorCurve([0, 0, 0], [5, 10, 0], [10, 0, 0], 0.5);
  const p0 = evaluateQuadBezier(curve, 0);
  assert(vEq(p0, [0, 0, 0]), 'bezier at t=0 = p0');
  const p1 = evaluateQuadBezier(curve, 1);
  assert(vEq(p1, [10, 0, 0]), 'bezier at t=1 = p2');
  const pm = evaluateQuadBezier(curve, 0.5);
  assertClose(pm[0], 5, 'bezier midpoint x = 5');
  assertClose(pm[1], 5, 'bezier midpoint y = 5 (apex pull)');

  const stepped = stepVectorCurve(curve, 20);
  assert(stepped.complete, 'curve completes after enough frames');
  assert(vEq(stepped.position, [10, 0, 0]), 'completed curve ends at p2');

  const half = stepVectorCurve(curve, 1);
  assertClose(half.curve.t, 0.05, 't advances by speed/chord = 0.5/10 per frame');
  assert(!half.complete, 'not complete after one frame');
}

console.log('=== SECTION 6: Flying swords — realm blade counts ===');
{
  assertEq(BLADE_COUNT.mortal, 0, 'mortal: 0 blades');
  assertEq(BLADE_COUNT.qi_condensation, 2, 'qi condensation: 2 blades');
  assertEq(BLADE_COUNT.foundation_establishment, 4, 'foundation: 4 blades');
  assertEq(BLADE_COUNT.core_formation, 8, 'core formation: 8 blades');
  assertEq(BLADE_COUNT.nascent_soul, 16, 'nascent soul: 16 blades');
  assertEq(BLADE_COUNT.spirit_severance, 32, 'spirit severance: 32 blades');
  assertEq(BLADE_COUNT.mahayana, 256, 'mahayana: 256 blades');

  const blades = deployBlades('foundation_establishment');
  assertEq(blades.length, 4, 'deploy 4 blades');
  assertEq(blades[0].phase, 'sheathed', 'blades start sheathed');
}

console.log('=== SECTION 7: Vector-curving — trajectory modification is deterministic ===');
{
  // Straight flight, no curve
  let straight = createBlade(0, [0, 0, 0]);
  straight = { ...straight, velocity: [1, 0, 0], phase: 'weaving' };
  const s0 = stepBlade(straight, null, 0);
  assert(vEq(s0.blade.position, [1, 0, 0]), 'ballistic flight: position += velocity');

  // Curvature 0 → velocity unchanged
  const c0 = applyVectorCurve(straight, 0, [0, 1, 0]);
  assert(vEq(c0.velocity, [1, 0, 0]), 'curvature 0 leaves velocity unchanged');

  // Curvature 1 → velocity fully aligned with target vector
  const c1 = applyVectorCurve(straight, 1, [0, 1, 0]);
  assert(vEq(c1.velocity, [0, 1, 0]), 'curvature 1 aligns velocity to target');

  // Curvature 0.5 → halfway blend
  const c05 = applyVectorCurve(straight, 0.5, [0, 1, 0]);
  assertClose(c05.velocity[0], Math.SQRT1_2, 'curvature 0.5: x = cos(45°)');
  assertClose(c05.velocity[1], Math.SQRT1_2, 'curvature 0.5: y = sin(45°)');

  // Determinism: same inputs twice → identical velocity
  const r1 = applyVectorCurve(straight, 0.37, [0.4, 0.8, 0.3]);
  const r2 = applyVectorCurve(straight, 0.37, [0.4, 0.8, 0.3]);
  assert(vEq(r1.velocity, r2.velocity), 'vector-curving is deterministic');
}

console.log('=== SECTION 8: Karmic tether — always tracks, snaps on close ===');
{
  const owner = createBlade(0, [0, 0, 0]);
  const blade = snapKarmicTether({ ...owner, velocity: [1, 0, 0], phase: 'weaving' },
    createKarmicTether(1n, 2n, 1.0, 2.0, 0.001));
  assertEq(blade.phase, 'weaving', 'tethered blade weaves');
  assert(blade.karmicTether !== null, 'tether attached');

  // Target drifts BEHIND the blade (would be lost without tether)
  const target: [number, number, number] = [-5, 0, 0];
  let b: FlyingSwordState = blade;
  let tracked = false;
  for (let i = 0; i < 40; i++) {
    const r = stepBlade(b, target, i);
    if (r.hit) { tracked = true; break; }
    b = r.blade;
    // velocity must point toward target (tracking)
    const dirX = Math.sign(target[0] - b.position[0]);
    if (Math.sign(b.velocity[0]) !== dirX && Math.abs(b.velocity[0]) > 0.01) {
      break;
    }
  }
  assert(tracked, 'karmic tether pulls the blade back to an evading target');

  // Snap: tether step at close range snaps immediately
  const tether = createKarmicTether(1n, 2n, 1.0, 2.0, 0.001);
  const snap = stepKarmicTether(tether, [0, 0, 0], [1.5, 0, 0], 1);
  assertEq(snap.snapped, true, 'tether snaps inside maxSnapDistance');

  const far = stepKarmicTether(tether, [0, 0, 0], [100, 0, 0], 10);
  assertEq(far.snapped, false, 'tether does not snap beyond range');
  assertClose(far.tether.strength, 1.0 - 0.001 * 10, 'tether strength decays deterministically');
}

console.log('=== SECTION 9: Overload crashes every blade ===');
{
  const blades = deployBlades('core_formation', 3).map(b => ({ ...b, phase: 'weaving' as const, velocity: [2, 0, 0] as [number, number, number] }));
  const crashed = crashBlades(blades);
  assertEq(crashed.length, 3, 'all blades affected');
  assert(crashed.every(b => b.phase === 'crashed'), 'all blades crashed');
  assert(crashed.every(b => b.velocity[0] === 0 && b.velocity[1] === 0 && b.velocity[2] === 0), 'all velocity zeroed');
}

console.log('=== SECTION 10: Body cultivation — mass multiplier + impact weight ===');
{
  assertEq(BODY_MASS_MULTIPLIER.mortal, 1, 'mortal mass = 1×');
  assertEq(BODY_MASS_MULTIPLIER.qi_condensation, 2, 'qi condensation mass = 2×');
  assertEq(BODY_MASS_MULTIPLIER.core_formation, 8, 'core formation mass = 8×');
  assertEq(BODY_MASS_MULTIPLIER.nascent_soul, 16, 'nascent soul mass = 16×');
  assertEq(BODY_MASS_MULTIPLIER.mahayana, 256, 'mahayana mass = 256×');

  const body = createBodyCultivation('core_formation');
  assertEq(body.massMultiplier, 8, 'body mass multiplier');
  assertEq(body.shockwaveRadius, SHOCKWAVE_RADIUS.core_formation, 'shockwave radius from realm table');
  assertEq(body.shockwaveRadius, 12, 'core formation shockwave = 12 m');

  const impact = computeImpactWeight(body, 10);
  assertEq(impact, 80, 'impact weight = mass × speed = 80');

  // Dash through structures
  const weakWall = dashThroughStructure(body, impact, 50);
  assertEq(weakWall.passed, true, 'impact 80 > resistance 50 → dash through');
  assertClose(weakWall.momentumLoss, 50 / 8, 'momentum loss = resistance / mass');

  const mountain = dashThroughStructure(body, impact, 500);
  assertEq(mountain.passed, false, 'impact 80 < resistance 500 → blocked');
}

console.log('=== SECTION 11: Shockwave — radius / falloff / stagger ===');
{
  const body = createBodyCultivation('qi_condensation');
  assertEq(body.shockwaveRadius, 5, 'qi condensation shockwave radius = 5 m');

  const hits = triggerShockwave(body, [0, 0, 0], 1.0, [
    { id: 1n, position: [0, 0, 0] },
    { id: 2n, position: [2.5, 0, 0] },
    { id: 3n, position: [5, 0, 0] },
    { id: 4n, position: [10, 0, 0] },
  ]);
  assertEq(hits.length, 3, '3 targets within radius');
  assertClose(hits[0].damage, 1.0, 'center target takes full damage');
  assertClose(hits[0].staggerFrames, 30, 'center target staggers 30 frames');
  assertClose(hits[1].damage, 0.25, 'half-radius target: (1 - 0.5)^2 = 0.25');
  assertEq(hits[1].staggerFrames, 8, 'half-radius stagger = round(30 × 0.25) = 8');
  assertClose(hits[2].damage, 0, 'edge target: (1 - 1)^2 = 0');
  assertEq(hits[2].staggerFrames, 0, 'edge target: no stagger');
}

console.log('=== SECTION 12: Life-essence combustion tradeoff ===');
{
  const body = createBodyCultivation('foundation_establishment');
  const ignite = igniteLifeEssence(body, 0.2, 120);
  assertEq(ignite.ignited, true, 'ignition succeeds');
  assertClose(ignite.body.lifeEssence, 0.8, 'health cost equals stated 0.2');
  assertClose(ignite.healthCost, 0.2, 'reported health cost = 0.2');
  assertEq(ignite.body.combustionActive, true, 'combustion active');
  assertEq(ignite.body.statusImmunity, true, 'status immunity while combusting');

  // Cannot ignite below health cost
  const broke = createBodyCultivation('foundation_establishment');
  broke.lifeEssence = 0.05;
  const denied = igniteLifeEssence(broke, 0.2, 120);
  assertEq(denied.ignited, false, 'cannot ignite with insufficient essence');
  assertClose(denied.body.lifeEssence, 0.05, 'no health deducted on failure');

  // Combustion timer
  const t1 = stepBodyCultivation(ignite.body, 60);
  assertEq(t1.combustionActive, true, 'still combusting at 60/120 frames');
  assertEq(t1.statusImmunity, true, 'still immune');
  const t2 = stepBodyCultivation(ignite.body, 120);
  assertEq(t2.combustionActive, false, 'combustion ends after stated frames');
  assertEq(t2.statusImmunity, false, 'immunity expires with combustion');
}

console.log('=== SECTION 13: Stance framework — per-stance face-button mapping ===');
{
  const stance = createStanceState('heavenly-dao');
  assertEq(stance.activeStance, 'heavenly-dao', 'default stance = heavenly-dao');
  assertEq(mapFaceButton(stance, 'north').actionId, 'dao-palm', 'heavenly-dao north = dao-palm (spell)');
  assertEq(mapFaceButton(stance, 'south').castClass, 'array', 'heavenly-dao south = array cast');
  assertEq(combatInputForButton(stance, 'south'), 'burst_area', 'heavenly-dao south → burst_area');

  const asura = createStanceState('asura-battlefield');
  assertEq(mapFaceButton(asura, 'north').actionId, 'iron-fist', 'asura north = iron-fist (weapon)');
  assertEq(mapFaceButton(asura, 'south').actionId, 'shockwave-slam', 'asura south = shockwave-slam');
  assertEq(combatInputForButton(asura, 'west'), 'dodge', 'asura west → dodge');
  assertEq(combatInputForButton(asura, 'north'), 'attack_fast', 'asura north → attack_fast');

  // Same button, different stance → different action (modifier-key switching)
  assert(mapFaceButton(stance, 'south').actionId !== mapFaceButton(asura, 'south').actionId, 'same face button, different action across stances');
  assert(combatInputForButton(stance, 'north') !== combatInputForButton(asura, 'north'), 'same face button produces different ga-combat inputs');
}

console.log('=== SECTION 14: Stance shift — Idle is free; commitment blocks ===');
{
  const stance = createStanceState('heavenly-dao');
  const idleCombatant = createCombatant(1n, 'qi_condensation', 1.0);

  const shift = shiftStance(stance, 'asura-battlefield', idleCombatant, 0);
  assertEq(shift.result, 'shifted', 'shift from Idle succeeds');
  assertEq(shift.state.activeStance, 'asura-battlefield', 'stance changed');
  assertEq(shift.state.previousStance, 'heavenly-dao', 'previous stance recorded');
  assertEq(shift.state.shiftLockExpiresAt, IDLE_SHIFT_LOCK_FRAMES, 'idle shift lock = 8 frames');
  assertEq(shift.phantom, null, 'no phantom on idle shift');

  // Committed action → no cancel (doc 13 §3.1 commitment model)
  const committed = createCombatant(2n, 'qi_condensation', 1.0);
  committed.state = 'Committed';
  const denied = shiftStance(createStanceState('heavenly-dao'), 'asura-battlefield', committed, 5);
  assertEq(denied.result, 'committed', 'shift denied while Committed (no-cancel rule)');
  assertEq(denied.state.activeStance, 'heavenly-dao', 'stance unchanged after denial');

  // Active strike → no cancel
  const active = createCombatant(3n, 'qi_condensation', 1.0);
  active.state = 'Active';
  const deniedActive = shiftStance(createStanceState('heavenly-dao'), 'asura-battlefield', active, 5);
  assertEq(deniedActive.result, 'committed', 'shift denied while Active');

  // Staggered / Downed / Yielded
  const staggered = createCombatant(4n, 'qi_condensation', 1.0);
  staggered.state = 'Staggered';
  assertEq(shiftStance(createStanceState('heavenly-dao'), 'asura-battlefield', staggered, 5).result, 'stunned', 'shift denied while Staggered');
  const yielded = createCombatant(5n, 'qi_condensation', 1.0);
  yielded.state = 'Yielded';
  assertEq(shiftStance(createStanceState('heavenly-dao'), 'asura-battlefield', yielded, 5).result, 'yielded', 'shift denied while Yielded');

  // Shift lock itself
  const lockedCheck = shiftStance(createStanceState('heavenly-dao'), 'asura-battlefield', createCombatant(6n, 'qi_condensation', 1.0), 0);
  const locked = shiftStance(lockedCheck.state, 'heavenly-dao', createCombatant(7n, 'qi_condensation', 1.0), 5);
  assertEq(locked.result, 'locked', 'shift inside lock window denied');
}

console.log('=== SECTION 15: Stance shift from Recovery — phantom-clone continuation ===');
{
  const stance = createStanceState('heavenly-dao');
  stance.lastAction = STANCE_ACTION_SET['heavenly-dao'].north; // dao-palm: cancelable

  const recovering = createCombatant(1n, 'qi_condensation', 1.0);
  recovering.state = 'Recovery';
  recovering.stateFrameCount = 5;
  recovering.stateFrameTarget = 20;

  const shift = shiftStance(stance, 'asura-battlefield', recovering, 10);
  assertEq(shift.result, 'shifted-with-phantom', 'cancelable recovery → shift with phantom');
  assert(shift.phantom !== null, 'phantom spawned');
  assertEq(shift.phantom!.originStance, 'heavenly-dao', 'phantom carries origin stance');
  assertEq(shift.phantom!.actionId, 'dao-palm', 'phantom continues the cancelled action');
  assertEq(shift.phantom!.remainingFrames, 15, 'phantom carries remaining recovery frames');
  assertEq(shift.phantom!.dealsDamage, false, 'recovery phantom deals no damage');
  assertEq(shift.state.shiftLockExpiresAt, 10 + RECOVERY_SHIFT_LOCK_FRAMES, 'recovery shift lock = 30 frames');

  // Non-cancelable recovery action → plain abort (still allowed: doc 13 §1.4)
  const hardStance = createStanceState('heavenly-dao');
  hardStance.lastAction = STANCE_ACTION_SET['heavenly-dao'].south; // formation-array: not cancelable
  const hard = shiftStance(hardStance, 'asura-battlefield', recovering, 10);
  assertEq(hard.result, 'shifted', 'non-cancelable recovery → plain abort shift');
  assertEq(hard.phantom, null, 'no phantom for non-cancelable action');
}

console.log('=== SECTION 16: Stance-dance cancelling rules ===');
{
  const stance = createStanceState('heavenly-dao');
  const idle = createCombatant(1n, 'qi_condensation', 1.0);

  // Shift A→B at frame 0
  const s1 = shiftStance(stance, 'asura-battlefield', idle, 0);
  assertEq(s1.result, 'shifted', 'first shift ok');

  // Shift B→A at frame 2: inside idle lock (8)
  const s2 = shiftStance(s1.state, 'heavenly-dao', idle, 2);
  assertEq(s2.result, 'locked', 'rapid re-shift blocked by shift lock');

  // Shift B→A at frame 20: outside lock but inside return lock (60) → dance-denied
  const s3 = shiftStance(s1.state, 'heavenly-dao', idle, 20);
  assertEq(s3.result, 'dance-denied', 'returning to previous stance within 60 frames denied');

  // Shift B→C? only 2 stances — at frame 20 shifting to heavenly-dao is dance-denied,
  // shifting to the SAME stance is a noop
  const s4 = shiftStance(s1.state, 'asura-battlefield', idle, 20);
  assertEq(s4.result, 'noop', 'same-stance shift is a noop');

  // After 60+ frames the return is allowed
  const s5 = shiftStance(s1.state, 'heavenly-dao', idle, 70);
  assertEq(s5.result, 'shifted', 'return to previous stance allowed after 60 frames');
  assertEq(s5.state.activeStance, 'heavenly-dao', 'stance returned');

  // Phantom clones are pruned when their lifetime expires
  let pruned = s1.state;
  pruned = { ...pruned, phantomClones: [{ originStance: 'heavenly-dao', actionId: 'dao-palm', remainingFrames: 10, spawnedAtFrame: 0, dealsDamage: false }] };
  assertEq(updateStanceTimers(pruned, 5).phantomClones.length, 1, 'phantom alive at 5/10');
  assertEq(updateStanceTimers(pruned, 10).phantomClones.length, 1, 'phantom alive at 10/10 (inclusive)');
  assertEq(updateStanceTimers(pruned, 11).phantomClones.length, 0, 'phantom pruned after lifetime');
}

console.log('=== SECTION 17: Technique interaction profiles + artifact combine ===');
{
  const profile = createTechniqueProfile({
    techniqueId: 'burning-palm',
    physicalForce: 0.4,
    penetration: 0.2,
    qiPressure: 0.3,
    spatialAuthority: 0,
    soulAuthority: 0,
    affectedRadius: 1,
    terrainInteraction: 'none',
    materialRecovery: 0,
  });
  assertEq(profile.techniqueId, 'burning-palm', 'profile identity');
  assertEq(profile.terrainInteraction, 'none', 'default terrain interaction');

  const combined = combineProfileWithArtifact(profile, {
    physicalForce: 0.2,
    penetration: 0.5,
    terrainInteraction: 'sunder',
  });
  assertClose(combined.physicalForce, 0.6, 'physicalForce 0.4 + 0.2 = 0.6');
  assertClose(combined.penetration, 0.7, 'penetration 0.2 + 0.5 = 0.7');
  assertEq(combined.terrainInteraction, 'sunder', 'artifact terrain interaction overrides');
  assertClose(combined.qiPressure, 0.3, 'untouched channel unchanged');

  const clamped = combineProfileWithArtifact(profile, { physicalForce: 0.8 });
  assertClose(clamped.physicalForce, 1, 'channels clamp at 1');
}

console.log('=== SECTION 18: Artifact gating — bludgeon-only below minRealm ===');
{
  const sword: ArtifactState = {
    artifactId: 'sword-of-cangwu',
    name: 'Sword of Cangwu',
    slot: 'attack',
    minRealm: 'core_formation',
    qiConsumptionScale: 0.25,
    bloodRefiningOverDraft: 0.15,
    modifiers: { penetration: 0.3 },
    functions: [{
      functionId: 'cleave',
      minRealm: 'core_formation',
      qiCost: 20,
      profile: createTechniqueProfile({ techniqueId: 'cleave', physicalForce: 0.6, penetration: 0.4 }),
    }],
  };

  assertEq(getArtifactUnlock(sword, 'qi_condensation'), 'bludgeon-only', 'below minRealm → bludgeon-only');
  assertEq(getArtifactUnlock(sword, 'core_formation'), 'unlocked', 'at minRealm → unlocked');
  assertEq(getArtifactUnlock(sword, 'nascent_soul'), 'unlocked', 'above minRealm → unlocked');

  const bludgeon = bludgeonStrike();
  assertEq(bludgeon.damage, BLUDGEON_DAMAGE, 'bludgeon strike damage = 0.05');

  const gated = activateArtifactFunction(sword, sword.functions[0], 'qi_condensation', 100);
  assertEq(gated.ok, false, 'function use denied below minRealm');
  assertEq(gated.reason, 'bludgeon-only', 'reason = bludgeon-only');
}

console.log('=== SECTION 19: Artifact qi drain scaling ===');
{
  const sword: ArtifactState = {
    artifactId: 'sword-of-cangwu',
    name: 'Sword of Cangwu',
    slot: 'attack',
    minRealm: 'core_formation',
    qiConsumptionScale: 0.25,
    bloodRefiningOverDraft: 0.15,
    modifiers: {},
    functions: [{ functionId: 'cleave', minRealm: 'core_formation', qiCost: 20, profile: createTechniqueProfile({ techniqueId: 'cleave' }) }],
  };
  const fn = sword.functions[0];

  // At minRealm (core_formation, index 4): no scale → 20
  const atMin = activateArtifactFunction(sword, fn, 'core_formation', 100);
  assertEq(atMin.ok, true, 'function works at minRealm');
  assertClose(atMin.qiCost, 20, 'qi cost unscaled at minRealm');

  // One realm above (nascent_soul, index 5): 20 × (1 + 0.25 × 1) = 25
  const above1 = activateArtifactFunction(sword, fn, 'nascent_soul', 100);
  assertClose(above1.qiCost, 25, 'qi cost scales × (1 + 0.25 × 1) one step above');

  // Three realms above (tribulation_crossing, index 8 − 4 = 4 steps): 20 × (1 + 0.25 × 4) = 40
  const above3 = activateArtifactFunction(sword, fn, 'tribulation_crossing', 100);
  assertClose(above3.qiCost, 40, 'qi cost scales × (1 + 0.25 × 4) four steps above');
}

console.log('=== SECTION 20: Blood-refining over-draft — health cost equals stated ===');
{
  const bloodArtifact: ArtifactState = {
    artifactId: 'blood-banner',
    name: 'Blood Banner',
    slot: 'defensive',
    minRealm: 'foundation_establishment',
    qiConsumptionScale: 0.1,
    bloodRefiningOverDraft: 0.2,
    modifiers: { physicalForce: 0.1 },
    functions: [{ functionId: 'ward', minRealm: 'foundation_establishment', qiCost: 50, profile: createTechniqueProfile({ techniqueId: 'ward' }) }],
  };
  const fn = bloodArtifact.functions[0];

  // Insufficient qi + blood-refining → forced activation
  const forced = activateArtifactFunction(bloodArtifact, fn, 'foundation_establishment', 10);
  assertEq(forced.ok, true, 'forced activation succeeds');
  assertEq(forced.healthCost, 0.2, 'health cost equals stated over-draft 0.2');
  assertEq(forced.qiCost, 10, 'forced activation spends ALL remaining qi');

  // No over-draft configured → refused
  const cleanArtifact: ArtifactState = { ...bloodArtifact, bloodRefiningOverDraft: 0 };
  const refused = activateArtifactFunction(cleanArtifact, fn, 'foundation_establishment', 10);
  assertEq(refused.ok, false, 'no over-draft → activation refused');
  assertEq(refused.reason, 'insufficient-qi', 'reason = insufficient-qi');
}

console.log('=== SECTION 21: Status effects — the five afflictions exist with mechanics ===');
{
  assertEq(STATUS_EFFECT_IDS.length, 5, 'exactly 5 afflictions');
  assertEq(STATUS_EFFECT_MECHANICS.soul_freeze.kind, 'slow', 'soul_freeze = slow');
  assertEq(STATUS_EFFECT_MECHANICS.karmic_ignition.kind, 'mirror', 'karmic_ignition = mirror');
  assertEq(STATUS_EFFECT_MECHANICS.dao_tribulation_stun.kind, 'cast-break-stagger', 'tribulation stun = cast-break+stagger');
  assertEq(STATUS_EFFECT_MECHANICS.dao_heart_corrosion.kind, 'input-scramble', 'heart corrosion = input scramble');
  assertEq(STATUS_EFFECT_MECHANICS.qi_deviation.kind, 'spell-lock', 'qi deviation = spell-lock');
}

console.log('=== SECTION 22: Status effect deltas ===');
{
  let effects: StatusEffectState[] = [];
  effects = applyStatusEffect(effects, 'soul_freeze', 1.0, 60, 0, 1n);
  effects = applyStatusEffect(effects, 'karmic_ignition', 0.5, 60, 0, 1n);

  const deltas = computeStatusDeltas(effects);
  assertClose(deltas.movementSpeedMult, 1 - SOUL_FREEZE_SLOW_MAX, 'soul_freeze full magnitude → 40% speed');
  assertClose(deltas.mirrorDamageFraction, KARMIC_MIRROR_MAX * 0.5, 'karmic ignition 0.5 → 25% mirror');
  assertEq(deltas.castBroken, false, 'no tribulation stun yet');
  assertEq(deltas.inputScrambleActive, false, 'no corrosion yet');
  assertEq(deltas.spellLocked, false, 'no deviation yet');

  effects = applyStatusEffect(effects, 'dao_tribulation_stun', 1.0, 90, 0, 1n);
  effects = applyStatusEffect(effects, 'dao_heart_corrosion', 0.8, 120, 0, 1n);
  effects = applyStatusEffect(effects, 'qi_deviation', 0.7, 300, 0, 1n);
  const full = computeStatusDeltas(effects);
  assertEq(full.castBroken, true, 'tribulation stun present');
  assertEq(full.staggerFrames, TRIBULATION_STAGGER_BASE + TRIBULATION_STAGGER_PER_MAG, 'stun → 40 stagger frames at mag 1');
  assertEq(full.inputScrambleActive, true, 'corrosion scrambles inputs');
  assertEq(full.spellLocked, true, 'deviation spell-locks');
}

console.log('=== SECTION 23: Cast-break + stagger on tribulation stun ===');
{
  // Qi-bearing cast in Committed → broken
  const casting = createCombatant(1n, 'qi_condensation', 1.0);
  casting.state = 'Committed';
  casting.currentAction = { actionType: 'burst_area', startedAtFrame: 0, phase: 'fire', routingRegion: 'hands' };
  const broken = breakCast(casting, 1.0);
  assertEq(broken.broken, true, 'qi cast broken');
  assertEq(broken.updatedState!.state, 'Staggered', 'cast-break forces Staggered');
  assertEq(broken.updatedState!.stateFrameTarget, TRIBULATION_STAGGER_BASE + TRIBULATION_STAGGER_PER_MAG, 'stagger = 40 frames at mag 1');
  assertEq(broken.updatedState!.currentAction, null, 'action cleared');

  // Half magnitude → 30 frames
  const brokenHalf = breakCast(casting, 0.5);
  assertEq(brokenHalf.updatedState!.stateFrameTarget, 30, 'stagger = 20 + 20×0.5 = 30');

  // No current action → nothing to break (guard case)
  const noAction = createCombatant(2n, 'qi_condensation', 1.0);
  noAction.state = 'Active';
  noAction.currentAction = null;
  const noBreak = breakCast(noAction, 1.0);
  assertEq(noBreak.broken, false, 'no current action → no cast to break');

  // Idle → not broken
  const idle = createCombatant(3n, 'qi_condensation', 1.0);
  assertEq(breakCast(idle, 1.0).broken, false, 'idle is never cast-broken');
}

console.log('=== SECTION 24: Spell-lock — qi_deviation blocks qi actions ===');
{
  const effects = applyStatusEffect([], 'qi_deviation', 1.0, 300, 0, 1n);
  assert(isSpellLocked(effects), 'qi_deviation spell-locks');
  const combatant = createCombatant(1n, 'qi_condensation', 1.0);
  assertEq(canActWithEffects(combatant, 'attack_fast', effects), false, 'qi-bearing fast attack blocked');
  assertEq(canActWithEffects(combatant, 'burst_area', effects), false, 'burst blocked');
  assertEq(canActWithEffects(combatant, 'dodge', effects), false, 'dodge costs qi → blocked');
  assertEq(canActWithEffects(combatant, 'yield', effects), true, 'yield (0 qi) always allowed');
}

console.log('=== SECTION 25: Input scramble — deterministic remap ===');
{
  const corrosion: StatusEffectState = { effectId: 'dao_heart_corrosion', magnitude: 1, remainingFrames: 120, appliedAtFrame: 0, sourceId: 1n };
  const seed = 42n;

  const s1 = resolveScrambledInput(corrosion, 'attack_fast', 10, seed);
  const s2 = resolveScrambledInput(corrosion, 'attack_fast', 10, seed);
  assertEq(s1, s2, 'same seed + frame → identical scramble');
  assert(s1 !== 'attack_fast', 'attack_fast is scrambled away from itself');
  const candidates: CombatInput[] = ['attack_medium', 'defend', 'dodge'];
  assert(candidates.includes(s1), 'scramble picks from the candidate set');

  // The frame IS part of the scramble key (scramble shifts over time)
  const frameChanged = resolveScrambledInput(corrosion, 'attack_fast', 11, seed);
  assert(frameChanged !== s2, 'frame changes the scramble');

  // Different seeds: over a scan, at least two distinct outcomes occur
  const outcomes = new Set<string>();
  for (let s = 1n; s < 50n; s++) {
    outcomes.add(resolveScrambledInput(corrosion, 'attack_fast', 10, s));
  }
  assert(outcomes.size >= 2, 'seed space produces varied scrambles');
}

console.log('=== SECTION 26: Status effect stacking, expiry, cleanse ===');
{
  let effects: StatusEffectState[] = [];
  effects = applyStatusEffect(effects, 'soul_freeze', 0.4, 30, 0, 1n);
  effects = applyStatusEffect(effects, 'soul_freeze', 0.9, 10, 5, 1n);
  assertEq(effects.length, 1, 'same effect does not duplicate');
  assertClose(effects[0].magnitude, 0.9, 'magnitude refreshes to max');
  assertEq(effects[0].remainingFrames, 30, 'duration refreshes to max');

  const { effects: stepped, expired } = stepStatusEffects(effects, 40);
  assertEq(stepped.length, 0, 'effect expires after duration');
  assertEq(expired.length, 1, 'expiry reported');

  // Cleanse rules
  const frost = applyStatusEffect([], 'soul_freeze', 0.5, 60, 0, 1n);
  assertEq(cleanseStatusEffect(frost, 'soul_freeze', 'fire_qi_vent').length, 0, 'fire qi vent cleanses soul freeze');
  assertEq(cleanseStatusEffect(frost, 'soul_freeze', 'karmic_purge').length, 1, 'wrong condition does not cleanse');
  const karmic = applyStatusEffect([], 'karmic_ignition', 0.5, 60, 0, 1n);
  assertEq(cleanseStatusEffect(karmic, 'karmic_ignition', 'combat_end').length, 0, 'combat end cleanses karmic ignition');
  const dev = applyStatusEffect([], 'qi_deviation', 0.5, 60, 0, 1n);
  assertEq(cleanseStatusEffect(dev, 'qi_deviation', 'rest').length, 0, 'rest cleanses qi deviation');
}

console.log('=== SECTION 27: Determinism — same seed produces identical full traces ===');
{
  function trace(seed: bigint): string {
    const out: string[] = [];
    const pool = createDivineSensePool('core_formation');
    let p = pool;
    for (let f = 0; f < 20; f++) p = stepDivineSensePool(p, 2, 1);
    out.push(`pool:${p.current.toFixed(6)}:${p.overloadState}`);

    let blade = createBlade(0, [0, 0, 0]);
    blade = { ...blade, velocity: [1, 0, 0], phase: 'weaving' };
    blade = snapKarmicTether(blade, createKarmicTether(1n, 2n, 0.8, 2, 0.001));
    for (let f = 0; f < 30; f++) {
      blade = stepBlade(blade, [3, 0, 0], f).blade;
    }
    out.push(`blade:${blade.position[0].toFixed(6)}:${blade.position[1].toFixed(6)}:${blade.phase}`);

    const corrosion: StatusEffectState = { effectId: 'dao_heart_corrosion', magnitude: 1, remainingFrames: 120, appliedAtFrame: 0, sourceId: 1n };
    const scrambled: string[] = [];
    for (let f = 0; f < 10; f++) scrambled.push(resolveScrambledInput(corrosion, 'attack_medium', f, seed));
    out.push(`scramble:${scrambled.join(',')}`);

    const sword: ArtifactState = {
      artifactId: 'sword-of-cangwu', name: 'Sword of Cangwu', slot: 'attack',
      minRealm: 'core_formation', qiConsumptionScale: 0.25, bloodRefiningOverDraft: 0.15,
      modifiers: {},
      functions: [{ functionId: 'cleave', minRealm: 'core_formation', qiCost: 20, profile: createTechniqueProfile({ techniqueId: 'cleave' }) }],
    };
    const uses: ArtifactUseResult[] = [0, 0.5, 0.25, 0.75, 0.1].map(q => activateArtifactFunction(sword, sword.functions[0], 'nascent_soul', q));
    out.push(`artifact:${uses.map(u => `${u.ok}:${u.qiCost.toFixed(4)}:${u.healthCost}`).join(',')}`);

    const stance = createStanceState('heavenly-dao');
    const idle = createCombatant(1n, 'qi_condensation', 1.0);
    const s1 = shiftStance(stance, 'asura-battlefield', idle, 0);
    const s2 = shiftStance(s1.state, 'heavenly-dao', idle, 20);
    out.push(`stance:${s1.result}:${s2.result}`);

    return out.join('|');
  }

  const t1 = trace(42n);
  const t2 = trace(42n);
  assertEq(t1, t2, 'same seed → identical full trace');
  assert(t1.length > 0, 'trace is non-empty');
  const t3 = trace(43n);
  assert(t3 !== t1, 'different seed → different trace (scramble differs)');
}

console.log('=== SECTION 28: hashString64 determinism ===');
{
  assertEq(hashString64('attack_fast'), hashString64('attack_fast'), 'string hash is deterministic');
  assert(hashString64('attack_fast') !== hashString64('attack_medium'), 'different strings hash differently');
  const a = hashString64('burning-palm');
  const b = hashString64('burning-palm');
  assertEq(a, b, 'cross-call stability');
}

console.log('=== SECTION 29: CombatArtsState + stepArtsState ===');
{
  const state = createCombatArtsState(1n, 'foundation_establishment');
  assertEq(state.blades.length, 4, 'state deploys realm blades');
  assertEq(state.divineSense.capacity, 250, 'state pool from realm');
  assertEq(state.body.massMultiplier, 4, 'state body mass from realm');

  const s1 = stepArtsState(state, 1);
  assertClose(s1.divineSense.current, 250, 'full pool clamped at capacity');
  state.divineSense.current = 249.5;
  const s2 = stepArtsState(state, 1);
  assertClose(s2.divineSense.current, 249.6, 'step regens pool when not full');
  assertEq(s2.effects.length, 0, 'no effects to step');
}

console.log('=== SECTION 30: CombatArtsApi ===');
{
  const api = createCombatArtsApi();
  const state = createCombatArtsState(1n, 'nascent_soul');
  assert(api.register(state), 'register succeeds');
  assert(!api.register(state), 'duplicate register rejected');
  assertEq(api.get(1n)!.realm, 'nascent_soul', 'get returns state');
  assert(api.step(1n, 1) !== undefined, 'step works');

  api.setTier(1n, 2);
  assertEq(api.getTier(1n), 2, 'tier set');
  assertEq(api.getTier(999n), 4, 'default tier 4');

  const stats = api.stats();
  assertEq(stats.totalCultivators, 1, '1 cultivator registered');
  assertEq(stats.totalBlades, 16, '16 blades deployed');
  assertEq(stats.totalOverloaded, 0, 'no overload');

  assert(api.remove(1n), 'remove succeeds');
  assertEq(api.stats().totalCultivators, 0, 'cleared');
}

console.log('=== SECTION 31: Plugin lifecycle (real host, dependency graph) ===');
{
  const host = createPluginHost(getFingerprint());
  const determinismPlugin = DeterminismPlugin;
  const combatPlugin = createCombatPlugin();
  const artsPlugin = createCombatArtsPlugin();

  // Dependency order: ga:determinism → ga:combat → ga:combat-arts
  assertEq(combatPlugin.id, 'ga:combat', 'combat plugin id');
  assertEq(artsPlugin.id, 'ga:combat-arts', 'combat-arts plugin id');
  assert(artsPlugin.dependencies.includes('ga:combat'), 'declares dependency on ga:combat');
  assert(artsPlugin.dependencies.includes('ga:determinism'), 'declares dependency on ga:determinism');

  // Registering ga:combat-arts without its dependencies fails (dependency validation)
  const premature = host.registerPlugin(artsPlugin);
  assertEq(premature.ok, false, 'register without dependency rejected');

  const regDet = host.registerPlugin(determinismPlugin);
  assertEq(regDet.ok, true, 'ga:determinism registered');

  const regCombat = host.registerPlugin(combatPlugin);
  assertEq(regCombat.ok, true, 'ga:combat registered');

  const regArts = host.registerPlugin(artsPlugin);
  assertEq(regArts.ok, true, 'ga:combat-arts registered after dependencies');

  const caps = host.capabilities.list();
  const artsCaps = caps.filter(c => c.provider === 'ga:combat-arts');
  assertEq(artsCaps.length, 7, '7 capabilities registered');
  assert(caps.some(c => c.capability === 'combat.divine-sense'), 'combat.divine-sense registered');
  assert(caps.some(c => c.capability === 'combat.flying-sword'), 'combat.flying-sword registered');
  assert(caps.some(c => c.capability === 'combat.body-cultivation'), 'combat.body-cultivation registered');
  assert(caps.some(c => c.capability === 'combat.stance'), 'combat.stance registered');
  assert(caps.some(c => c.capability === 'combat.technique-profiles'), 'combat.technique-profiles registered');
  assert(caps.some(c => c.capability === 'combat.artifacts'), 'combat.artifacts registered');
  assert(caps.some(c => c.capability === 'combat.status-effects'), 'combat.status-effects registered');

  const api = host.getState<ReturnType<typeof createCombatArtsApi>>('ga:combat-arts');
  assert(api !== undefined, 'state stored on host');
  assertEq(api!.stats().totalCultivators, 0, 'api live through host');

  const unreg = host.unregisterPlugin('ga:combat-arts');
  assertEq(unreg.ok, true, 'unregister succeeds');
  assertEq(host.listPlugins().includes('ga:combat'), true, 'ga:combat still registered');
  assertEq(host.listPlugins().includes('ga:combat-arts'), false, 'ga:combat-arts removed');
}

console.log('=== SECTION 32: Extension does not break ga-combat — sanity replay ===');
{
  // The arts state rides ALONGSIDE a ga-combat combatant; the extension only
  // reads ga-combat state (stance legality) and never mutates it invalidly.
  const combatant = createCombatant(1n, 'qi_condensation', 1.0);
  const arts = createCombatArtsState(1n, 'qi_condensation');
  const shifted = shiftStance(arts.stance, 'asura-battlefield', combatant, 0);
  assertEq(shifted.result, 'shifted', 'stance shifts over an idle ga-combat combatant');
  assertEq(combatant.state, 'Idle', 'ga-combat state untouched by extension');
}

console.log('\n============================================================');
console.log(`Combat Arts Conformance: ${passed} passed, ${failed} failed, ${passed + failed} total`);
console.log('============================================================');

if (failed > 0) {
  process.exit(1);
}
