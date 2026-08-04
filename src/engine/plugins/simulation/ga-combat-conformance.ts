/**
 * ga:combat Conformance Test
 * Tests the combat state machine, tempo economy, qi routing,
 * phase matchups, injuries, death model, and residue system.
 * No forbidden functions. No Three.js, no DOM.
 */

import {
  createCombatant,
  createCombatApi,
  createQiRouting,
  phaseMultiplier,
  conquers,
  generates,
  getRoutingEffect,
  computeDamage,
  applyDamageToDefender,
  isLethal,
  canAct,
  canRoute,
  executeAction,
  switchRouting,
  stepCombatant,
  pushInput,
  consumeInput,
  clearBuffer,
  decayResidue,
  isResidueReadable,
  injuryBlocksTransition,
  getAnchorFate,
  BARDO_WINDOW_DAYS,
  ACTION_DEFS,
  INPUT_BUFFER_SIZE,
  ROUTING_EFFECTS,
  COMBAT_SCALE_CONFIGS,
  INJURY_THRESHOLDS,
  createCombatPlugin,
  type CombatantState,
  type CombatInput,
  type CombatInstance,
  type PhaseName,
  type RoutingRegion,
  type InjuryType,
  type InjuryLocation,
  type CombatScale,
  type Realm,
  type BufferedInput,
  type ActionType,
} from './ga-combat';

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

function assertClose(actual: number, expected: number, msg: string, eps = 0.001) {
  if (Math.abs(actual - expected) < eps) { passed++; console.log(`  ✅ ${msg}`); }
  else { failed++; console.log(`  ❌ ${msg} — got ${actual}, expected ${expected}`); }
}

// ============================================================================
console.log('=== SECTION 1: Combatant creation ===');
{
  const c = createCombatant(1n, 'qi_condensation', 0.8);
  assertEq(c.state, 'Idle', 'initial state is Idle');
  assertEq(c.combatantId, 1n, 'combatant ID');
  assertEq(c.realm, 'qi_condensation', 'realm');
  assertClose(c.qiReservoir, 0.8, 'qi reservoir');
  assertEq(c.inputBuffer.length, 0, 'empty buffer');
  assertEq(c.injuries.length, 0, 'no injuries');
  assertEq(c.deviationMeter, 0, 'no deviation');
}

console.log('=== SECTION 2: Action definitions (frame costs) ===');
{
  const fast = ACTION_DEFS.attack_fast;
  assertEq(fast.startupFrames, 8, 'fast strike startup=8');
  assertEq(fast.activeFrames, 4, 'fast strike active=4');
  assertEq(fast.recoveryFrames, 12, 'fast strike recovery=12');
  assertEq(fast.totalFrames, 24, 'fast strike total=24');

  const heavy = ACTION_DEFS.attack_heavy;
  assertEq(heavy.startupFrames, 24, 'heavy startup=24');
  assertEq(heavy.activeFrames, 8, 'heavy active=8');
  assertEq(heavy.recoveryFrames, 36, 'heavy recovery=36');
  assertEq(heavy.totalFrames, 68, 'heavy total=68');

  const defend = ACTION_DEFS.defend;
  assertEq(defend.isHoldable, true, 'defend is holdable');
  assertEq(defend.startupFrames, 6, 'defend startup=6');

  const burst = ACTION_DEFS.burst_area;
  assertEq(burst.qiCost, 0.30, 'burst qi cost=0.30');
  assertEq(burst.startupFrames, 40, 'burst startup=40');
}

console.log('=== SECTION 3: Qi routing (4×5 = 20 combinations) ===');
{
  const regions: RoutingRegion[] = ['hands', 'legs', 'skin', 'senses'];
  const phases: PhaseName[] = ['wood', 'fire', 'earth', 'metal', 'water'];
  assertEq(regions.length * phases.length, 20, '20 routing combinations');

  // Test each region has 5 phases
  for (const r of regions) {
    assertEq(Object.keys(ROUTING_EFFECTS[r]).length, 5, `${r} has 5 phase effects`);
  }

  // Hands+fire has high damage (conquest)
  const handsFire = ROUTING_EFFECTS.hands.fire;
  assertClose(handsFire.damage ?? 0, 1.5, 'hands+fire damage=1.5');
  assertEq(handsFire.phaseType, 'conquest', 'hands+fire is conquest');

  // Hands+metal has highest damage
  const handsMetal = ROUTING_EFFECTS.hands.metal;
  assertClose(handsMetal.damage ?? 0, 1.8, 'hands+metal damage=1.8');

  // Skin+earth has high defense
  const skinEarth = ROUTING_EFFECTS.skin.earth;
  assertClose(skinEarth.defense ?? 0, 1.8, 'skin+earth defense=1.8');

  // Senses+water has high perception
  const sensesWater = ROUTING_EFFECTS.senses.water;
  assertClose(sensesWater.perception ?? 0, 1.6, 'senses+water perception=1.6');

  // Legs+fire has high speed
  const legsFire = ROUTING_EFFECTS.legs.fire;
  assertClose(legsFire.speed ?? 0, 1.5, 'legs+fire speed=1.5');
}

console.log('=== SECTION 4: Phase matchup multipliers (wuxing) ===');
{
  // Conquest: wood→earth
  assert(conquers('wood', 'earth'), 'wood conquers earth');
  assert(conquers('earth', 'water'), 'earth conquers water');
  assert(conquers('water', 'fire'), 'water conquers fire');
  assert(conquers('fire', 'metal'), 'fire conquers metal');
  assert(conquers('metal', 'wood'), 'metal conquers wood');

  // Not conquest
  assert(!conquers('earth', 'wood'), 'earth does not conquer wood');
  assert(!conquers('wood', 'wood'), 'same phase not conquest');

  // Generation: wood→fire
  assert(generates('wood', 'fire'), 'wood generates fire');
  assert(generates('fire', 'earth'), 'fire generates earth');
  assert(generates('earth', 'metal'), 'earth generates metal');
  assert(generates('metal', 'water'), 'metal generates water');
  assert(generates('water', 'wood'), 'water generates wood');

  // Phase multiplier
  const m1 = phaseMultiplier('wood', 'earth');
  assertEq(m1.type, 'conquest', 'wood vs earth = conquest');
  assertClose(m1.damageMult, 1.5, 'conquest damage=1.5');

  const m2 = phaseMultiplier('wood', 'fire');
  assertEq(m2.type, 'generation', 'wood vs fire = generation');
  assertClose(m2.damageMult, 0.5, 'generation damage=0.5');
  assertClose(m2.lifesteal ?? 0, 0.5, 'generation lifesteal=0.5');

  const m3 = phaseMultiplier('wood', 'wood');
  assertEq(m3.type, 'neutral', 'same phase = neutral');
  assertClose(m3.damageMult, 1.0, 'neutral damage=1.0');

  // Reverse conquest: wood is conquered by metal
  const m4 = phaseMultiplier('wood', 'metal');
  assertEq(m4.type, 'reverse_conquest', 'wood vs metal = reverse conquest');
  assertClose(m4.damageMult, 0.75, 'reverse conquest damage=0.75');
}

console.log('=== SECTION 5: Input buffer (8-frame, most-recent-wins) ===');
{
  let buf: BufferedInput[] = [];
  assertEq(buf.length, 0, 'buffer starts empty');

  buf = pushInput(buf, 'attack_fast', 0);
  assertEq(buf.length, 1, 'one input buffered');

  buf = pushInput(buf, 'defend', 1);
  assertEq(buf.length, 2, 'two inputs buffered');

  // Most recent wins
  const { input, remaining } = consumeInput(buf, 2);
  assertEq(input, 'defend', 'most recent input wins');
  assertEq(remaining.length, 2, 'remaining still has both');

  // Buffer expiry after 8 frames
  let expiredBuf: BufferedInput[] = [];
  expiredBuf = pushInput(expiredBuf, 'attack_fast', 0);
  const { input: expired } = consumeInput(expiredBuf, 9);
  assertEq(expired, null, 'expired input not consumed');

  // Clear buffer
  let clearBuf: BufferedInput[] = [];
  clearBuf = pushInput(clearBuf, 'attack_fast', 0);
  clearBuf = pushInput(clearBuf, 'defend', 1);
  const cleared = clearBuffer(clearBuf);
  const { input: clearedInput } = consumeInput(cleared, 2);
  assertEq(clearedInput, null, 'cleared buffer has no consumable input');

  assertEq(INPUT_BUFFER_SIZE, 8, 'buffer size is 8');
}

console.log('=== SECTION 6: Can-act / can-route predicates ===');
{
  const c = createCombatant(1n, 'qi_condensation', 0.5);
  assert(canAct(c, 'attack_fast'), 'can attack in Idle with qi');
  assert(canAct(c, 'defend'), 'can defend in Idle');
  assert(canAct(c, 'dodge'), 'can dodge in Idle');
  assert(canAct(c, 'yield'), 'can yield in Idle');

  // No qi for burst
  const noQi = createCombatant(2n, 'qi_condensation', 0.1);
  assert(!canAct(noQi, 'burst_area'), 'cannot burst with 0.1 qi (needs 0.30)');

  // Dead cannot act
  const dead = createCombatant(3n, 'qi_condensation', 1.0);
  dead.state = 'Dead';
  assert(!canAct(dead, 'attack_fast'), 'dead cannot act');

  // Yielded cannot attack
  const yielded = createCombatant(4n, 'qi_condensation', 1.0);
  yielded.state = 'Yielded';
  assert(!canAct(yielded, 'attack_fast'), 'yielded cannot attack');
  // Can act with yield when yielded (it's a no-op but allowed)
  const idleForYield = createCombatant(5n, 'qi_condensation', 1.0);
  assert(canAct(idleForYield, 'yield'), 'can yield when Idle');

  // Can route
  assert(canRoute(c), 'can route in Idle with qi');

  // Cannot route when not Idle
  const committed = createCombatant(5n, 'qi_condensation', 1.0);
  committed.state = 'Committed';
  assert(!canRoute(committed), 'cannot route when Committed');

  // Cannot route with no qi
  const noQiRoute = createCombatant(6n, 'qi_condensation', 0.02);
  assert(!canRoute(noQiRoute), 'cannot route with <5% qi');
}

console.log('=== SECTION 7: Execute action (Idle → Committed) ===');
{
  const c = createCombatant(1n, 'qi_condensation', 0.5);
  const result = executeAction(c, 'attack_fast', 0);
  assertEq(result.state, 'Committed', 'attack_fast → Committed');
  assertEq(result.stateFrameTarget, 8, 'startup=8 frames');
  assertClose(result.qiReservoir, 0.48, 'qi reduced by 0.02');
  assert(result.currentAction !== null, 'has current action');
  assertEq(result.currentAction!.actionType, 'attack_fast', 'action type set');

  // Defend
  const d = executeAction(c, 'defend', 0);
  assertEq(d.state, 'Committed', 'defend → Committed');
  assertEq(d.stateFrameTarget, 6, 'defend startup=6');

  // Yield
  const y = executeAction(c, 'yield', 0);
  assertEq(y.state, 'Yielded', 'yield → Yielded');

  // Cannot act when not Idle
  const committed = createCombatant(2n, 'qi_condensation', 1.0);
  committed.state = 'Recovery';
  const noAct = executeAction(committed, 'attack_fast', 0);
  assertEq(noAct.state, 'Recovery', 'no action when Recovering');
}

console.log('=== SECTION 8: State machine transitions (Committed → Active → Recovery → Idle) ===');
{
  let c = createCombatant(1n, 'qi_condensation', 0.5);
  c = executeAction(c, 'attack_fast', 0);
  assertEq(c.state, 'Committed', 'step 0: Committed');

  // Step through startup frames
  for (let f = 1; f <= 8; f++) {
    c = stepCombatant(c, null, f);
  }
  assertEq(c.state, 'Active', 'after 8 frames: Active');

  // Step through active frames
  for (let f = 9; f <= 12; f++) {
    c = stepCombatant(c, null, f);
  }
  assertEq(c.state, 'Recovery', 'after active frames: Recovery');

  // Step through recovery frames
  for (let f = 13; f <= 24; f++) {
    c = stepCombatant(c, null, f);
  }
  assertEq(c.state, 'Idle', 'after recovery frames: Idle');
}

console.log('=== SECTION 9: Stagger on hit ===');
{
  const c = createCombatant(1n, 'qi_condensation', 0.8);
  const hit = stepCombatant(c, { fromId: 2n, damage: 0.1, phase: 'metal', frame: 0 }, 0);
  assertEq(hit.state, 'Staggered', 'hit while Idle → Staggered');
  assertEq(hit.stateFrameTarget, 15, 'stagger = 15 frames');

  // Stagger recovery
  let s = hit;
  for (let f = 1; f <= 15; f++) {
    s = stepCombatant(s, null, f);
  }
  assertEq(s.state, 'Idle', 'stagger → Idle after 15 frames');

  // Counter-hit: low damage so it staggers but doesn't kill
  const committed = executeAction(createCombatant(3n, 'qi_condensation', 0.8), 'attack_medium', 0);
  const counterHit = stepCombatant(committed, { fromId: 2n, damage: 0.03, phase: 'metal', frame: 5 }, 5);
  assertEq(counterHit.state, 'Staggered', 'counter-hit → Staggered');
}

console.log('=== SECTION 10: Death from lethal damage ===');
{
  const c = createCombatant(1n, 'qi_condensation', 0.8);
  const lethal = stepCombatant(c, { fromId: 2n, damage: 0.9, phase: 'metal', frame: 0 }, 0);
  // High damage triggers multiple injuries → lethal
  assert(lethal.state === 'Dead' || lethal.injuries.length > 0, 'heavy damage causes injuries or death');
}

console.log('=== SECTION 11: Yielded + hit = death ===');
{
  const c = createCombatant(1n, 'qi_condensation', 0.8);
  c.state = 'Yielded';
  const killed = stepCombatant(c, { fromId: 2n, damage: 0.01, phase: 'metal', frame: 0 }, 0);
  assertEq(killed.state, 'Dead', 'yielded + any hit = Dead');
}

console.log('=== SECTION 12: Qi routing switch ===');
{
  const c = createCombatant(1n, 'qi_condensation', 0.8);
  const switched = switchRouting(c, 'legs', 'water', 0);
  assertEq(switched.state, 'Committed', 'routing switch → Committed');
  assertEq(switched.routing.region, 'legs', 'routing region = legs');
  assertEq(switched.routing.phase, 'water', 'routing phase = water');
  assert(switched.stateFrameTarget > 0, 'has switch cost frames');

  // Cannot switch when not Idle
  const committed = createCombatant(2n, 'qi_condensation', 0.8);
  committed.state = 'Active';
  const noSwitch = switchRouting(committed, 'senses', 'wood', 0);
  assertEq(noSwitch.state, 'Active', 'cannot switch when Active');
}

console.log('=== SECTION 13: Compute damage with all multipliers ===');
{
  const attacker = createCombatant(1n, 'qi_condensation', 0.8);
  attacker.routing = createQiRouting('hands', 'fire');
  const defender = createCombatant(2n, 'qi_condensation', 0.8);
  defender.routing = createQiRouting('skin', 'earth');

  const matchup = phaseMultiplier('fire', 'earth'); // fire conquers earth
  const routingEff = getRoutingEffect(attacker.routing);
  const damage = computeDamage(attacker, defender, ACTION_DEFS.attack_fast, matchup, routingEff);

  // fire conquers earth → 1.5×, hands+fire damage=1.5×, fast base=0.05
  assert(damage > 0, 'damage is positive');
  assert(damage < 1, 'damage is capped at 1');
}

console.log('=== SECTION 14: Injury model ===');
{
  const c = createCombatant(1n, 'qi_condensation', 0.8);
  const { updatedDefender, newInjuries } = applyDamageToDefender(c, 0.20, 0);

  // 0.20 damage should trigger cut_deep (threshold 0.15)
  assert(newInjuries.length > 0, 'damage triggers injuries');
  assert(updatedDefender.injuries.length > 0, 'injuries added to defender');

  // Same injury type doesn't duplicate
  const { updatedDefender: d2, newInjuries: ni2 } = applyDamageToDefender(updatedDefender, 0.20, 1);
  assertEq(ni2.length, 0, 'no duplicate injury type');

  // Check injury thresholds exist
  const types: InjuryType[] = [
    'cut_superficial', 'cut_deep', 'cut_tendon', 'fractured_bone',
    'meridian_inflammation', 'organ_damage', 'qi_depletion',
    'anchor_bruise', 'core_crack',
  ];
  assertEq(types.length, 9, '9 injury types defined');
  for (const t of types) {
    assert(INJURY_THRESHOLDS[t] !== undefined, `threshold for ${t} exists`);
  }
}

console.log('=== SECTION 15: Injury blocks transitions ===');
{
  const legTendon: Injury = {
    injuryId: 'test-1', injuryType: 'cut_tendon', location: 'left_leg',
    severity: 0.6, onsetTick: 0, onsetThreshold: 0.1,
    recoveryTimeDays: 135, recoveryTimeTreatedDays: 45,
    effects: [{ type: 'limb_function', magnitude: 0.75 }],
    resolved: false, resolvedAt: null,
  };
  assert(injuryBlocksTransition([legTendon], 'dodge'), 'leg tendon blocks dodge');
  assert(!injuryBlocksTransition([legTendon], 'attack_fast'), 'leg tendon does not block attack');

  const meridianInflam: Injury = {
    injuryId: 'test-2', injuryType: 'meridian_inflammation', location: 'meridian_central',
    severity: 0.5, onsetTick: 0, onsetThreshold: 0.12,
    recoveryTimeDays: 22, recoveryTimeTreatedDays: 10,
    effects: [{ type: 'routing_blocked', magnitude: 0.6 }],
    resolved: false, resolvedAt: null,
  };
  assert(injuryBlocksTransition([meridianInflam], 'route_hands'), 'meridian inflammation blocks routing');

  const resolvedInjury: Injury = { ...legTendon, resolved: true, resolvedAt: 100 };
  assert(!injuryBlocksTransition([resolvedInjury], 'dodge'), 'resolved injury does not block');
}

console.log('=== SECTION 16: Death model — anchor fate per realm ===');
{
  assertEq(getAnchorFate('mortal'), 'bardo_short', 'mortal: bardo_short');
  assertEq(getAnchorFate('qi_induction'), 'bardo_short', 'qi_induction: bardo_short');
  assertEq(getAnchorFate('qi_condensation'), 'bardo_short', 'qi_condensation: bardo_short');
  assertEq(getAnchorFate('foundation_establishment'), 'bardo_medium', 'foundation: bardo_medium');
  assertEq(getAnchorFate('core_formation'), 'bardo_long', 'core_formation: bardo_long');
  assertEq(getAnchorFate('nascent_soul'), 'anchor_flight', 'nascent_soul: anchor_flight');
  assertEq(getAnchorFate('spirit_severance'), 'domain_persist', 'spirit_severance: domain_persist');
  assertEq(getAnchorFate('void_amalgamation'), 'place_bond', 'void_amalgamation: place_bond');
  assertEq(getAnchorFate('tribulation_crossing'), 'robust', 'tribulation_crossing: robust');
  assertEq(getAnchorFate('mahayana'), 'robust', 'mahayana: robust');

  // Bardo windows
  assertEq(BARDO_WINDOW_DAYS.mortal, 1, 'mortal bardo = 1 day');
  assertEq(BARDO_WINDOW_DAYS.foundation_establishment, 7, 'foundation bardo = 7 days');
  assertEq(BARDO_WINDOW_DAYS.core_formation, 30, 'core bardo = 30 days');
  assertEq(BARDO_WINDOW_DAYS.nascent_soul, 0, 'nascent soul: no bardo window');
}

console.log('=== SECTION 17: Combat residue ===');
{
  const residue = {
    residueId: 1,
    originatingAction: 'attack_fast' as ActionType,
    bornAtFrame: 0,
    intensity: 0.5,
    halfLifeFrames: 60,
    phaseSignature: 'metal' as PhaseName,
    actorId: 1n,
  };

  // Fresh residue is readable
  assert(isResidueReadable(residue, 0.5, 0), 'fresh residue readable with perception 0.5');
  assert(!isResidueReadable(residue, 0.1, 0), 'fresh residue not readable with perception 0.1');

  // Decayed residue
  const decayed = decayResidue(residue, 120); // 2 half-lives
  assertClose(decayed.intensity, 0.125, '2 half-lives: intensity = 0.125');
  assert(!isResidueReadable(decayed, 0.5, 120), 'very decayed residue not readable');
}

console.log('=== SECTION 18: Combat scale configs ===');
{
  const scales: CombatScale[] = ['duel', 'mob', 'giant', 'battlefield', 'law_conflict'];
  for (const s of scales) {
    const config = COMBAT_SCALE_CONFIGS[s];
    assert(config !== undefined, `${s} config exists`);
    assert(config.maxCombatants > 0, `${s} has max combatants`);
  }

  assertEq(COMBAT_SCALE_CONFIGS.duel.stateMachine, 'full', 'duel: full state machine');
  assertEq(COMBAT_SCALE_CONFIGS.mob.stateMachine, 'simplified', 'mob: simplified');
  assert(COMBAT_SCALE_CONFIGS.duel.residueReadable, 'duel: residue readable');
  assert(!COMBAT_SCALE_CONFIGS.mob.residueReadable, 'mob: residue not readable');
  assert(COMBAT_SCALE_CONFIGS.duel.injuriesTracked, 'duel: injuries tracked');
  assert(!COMBAT_SCALE_CONFIGS.mob.injuriesTracked, 'mob: injuries not tracked');
}

console.log('=== SECTION 19: Combat API — create combat, add combatants ===');
{
  const api = createCombatApi();
  const combatId = api.createCombat('duel');
  assert(combatId > 0, 'combat created with id > 0');

  const c1 = createCombatant(1n, 'qi_condensation', 0.8);
  const c2 = createCombatant(2n, 'qi_condensation', 0.8);
  assert(api.addCombatant(combatId, c1), 'combatant 1 added');
  assert(api.addCombatant(combatId, c2), 'combatant 2 added');

  // Max combatants for duel = 2
  const c3 = createCombatant(3n, 'qi_condensation', 0.8);
  assert(!api.addCombatant(combatId, c3), '3rd combatant rejected (duel max=2)');

  // List combats
  assertEq(api.listCombats().length, 1, '1 combat listed');

  // Remove combatant
  assert(api.removeCombatant(combatId, 2n), 'combatant 2 removed');
  assert(api.addCombatant(combatId, c3), '3rd combatant now accepted');

  // Remove combat
  assert(api.removeCombat(combatId), 'combat removed');
  assertEq(api.listCombats().length, 0, '0 combats after removal');
}

console.log('=== SECTION 20: Combat API — queue input and step ===');
{
  const api = createCombatApi();
  const combatId = api.createCombat('duel');
  const c1 = createCombatant(1n, 'qi_condensation', 0.8);
  c1.routing = createQiRouting('hands', 'metal');
  const c2 = createCombatant(2n, 'qi_condensation', 0.8);
  c2.routing = createQiRouting('skin', 'wood');

  api.addCombatant(combatId, c1);
  api.addCombatant(combatId, c2);

  // Queue attack for combatant 1
  assert(api.queueInput(combatId, 1n, 'attack_fast', 1), 'input queued');

  // Step: input should be consumed, combatant enters Committed
  api.stepCombat(combatId);
  const combat = api.getCombat(combatId)!;
  const cs1 = combat.combatants.get('1');
  assertEq(cs1?.state, 'Committed', 'combatant 1 is Committed after step');

  // Continue stepping through startup
  for (let f = 2; f <= 9; f++) {
    api.stepCombat(combatId);
  }
  const cs1Active = combat.combatants.get('1');
  assertEq(cs1Active?.state, 'Active', 'combatant 1 is Active after startup');

  // Step through active frames (impact happens at last active frame)
  for (let f = 10; f <= 13; f++) {
    api.stepCombat(combatId);
  }
  const cs1Recovery = combat.combatants.get('1');
  assertEq(cs1Recovery?.state, 'Recovery', 'combatant 1 is in Recovery');

  // Check residues were left
  const residues = api.getResidues(combatId);
  assert(residues.length > 0, 'residue left after attack');
}

console.log('=== SECTION 21: Combat API — routing switch ===');
{
  const api = createCombatApi();
  const combatId = api.createCombat('duel');
  const c1 = createCombatant(1n, 'qi_condensation', 0.8);
  api.addCombatant(combatId, c1);

  assert(api.switchRouting(combatId, 1n, 'legs', 'water', 1), 'routing switched');
  const combat = api.getCombat(combatId)!;
  const cs1 = combat.combatants.get('1');
  assertEq(cs1?.routing.region, 'legs', 'routing region updated');
  assertEq(cs1?.routing.phase, 'water', 'routing phase updated');
}

console.log('=== SECTION 22: Combat API — stats ===');
{
  const api = createCombatApi();
  const s0 = api.stats();
  assertEq(s0.totalCombats, 0, 'no combats initially');

  const id1 = api.createCombat('duel');
  api.createCombat('mob');
  const s1 = api.stats();
  assertEq(s1.totalCombats, 2, '2 combats created');
  assertEq(s1.byScale.duel, 1, '1 duel');
  assertEq(s1.byScale.mob, 1, '1 mob');

  const c1 = createCombatant(1n, 'qi_condensation', 0.8);
  const c2 = createCombatant(2n, 'qi_condensation', 0.8);
  api.addCombatant(id1, c1);
  api.addCombatant(id1, c2);
  const s2 = api.stats();
  assertEq(s2.totalCombatants, 2, '2 combatants total');
}

console.log('=== SECTION 23: Combat API — tier management ===');
{
  const api = createCombatApi();
  api.setTier(1n, 2);
  assertEq(api.getTier(1n), 2, 'tier set to 2');
  assertEq(api.getTier(999n), 4, 'default tier is 4');
}

console.log('=== SECTION 24: Lethality checks ===');
{
  // Core crack is always lethal
  const coreCrack = {
    injuryId: 'cc', injuryType: 'core_crack' as InjuryType, location: 'core' as InjuryLocation,
    severity: 1.0, onsetTick: 0, onsetThreshold: 0.8,
    recoveryTimeDays: 1095, recoveryTimeTreatedDays: 365,
    effects: [{ type: 'catastrophic', magnitude: 0.9 }],
    resolved: false, resolvedAt: null,
  };
  assert(isLethal([coreCrack], 0.5), 'core crack is lethal');

  // Resolved injury is not lethal
  const resolved = { ...coreCrack, resolved: true, resolvedAt: 100 };
  assert(!isLethal([resolved], 0.5), 'resolved core crack not lethal');

  // 5+ unresolved injuries
  const manyInjuries: typeof coreCrack[] = [];
  for (let i = 0; i < 5; i++) {
    manyInjuries.push({
      ...coreCrack, injuryId: `inj-${i}`, injuryType: 'cut_superficial' as InjuryType,
      location: 'torso' as InjuryLocation, severity: 0.6,
    });
  }
  assert(isLethal(manyInjuries, 0.35), '5+ injuries with moderate damage is lethal');
}

console.log('=== SECTION 25: Guard hold and guard break ===');
{
  let c = createCombatant(1n, 'qi_condensation', 0.8);
  c = executeAction(c, 'defend', 0);
  assertEq(c.state, 'Committed', 'defend → Committed');

  // Step through startup
  for (let f = 1; f <= 6; f++) {
    c = stepCombatant(c, null, f);
  }
  assertEq(c.state, 'Active', 'defend → Active');

  // Incoming hit while defending — drains qi
  const defended = stepCombatant(c, { fromId: 2n, damage: 0.15, phase: 'metal', frame: 7 }, 7);
  assertEq(defended.state, 'Active', 'still Active while guarding');
  assert(defended.qiReservoir < 0.8, 'guard drains qi');
}

console.log('=== SECTION 26: Qi depletion blocks heavy actions ===');
{
  const depleted = createCombatant(1n, 'qi_condensation', 0.01);
  assert(!canAct(depleted, 'burst_area'), 'qi depletion blocks burst');
  assert(!canAct(depleted, 'attack_heavy'), 'qi depletion blocks heavy');
  assert(canAct(depleted, 'yield'), 'yield always available in Idle');
  assert(!canAct(createCombatant(1n, 'qi_condensation', 0.01), 'attack_fast'), 'qi depletion blocks fast too');
}

console.log('=== SECTION 27: Downed state ===');
{
  let c = createCombatant(1n, 'qi_condensation', 0.8);
  c.state = 'Staggered';
  c.stateFrameCount = 0;
  c.stateFrameTarget = 15;

  // Heavy hit while staggered → Downed
  const downed = stepCombatant(c, { fromId: 2n, damage: 0.25, phase: 'metal', frame: 0 }, 0);
  assertEq(downed.state, 'Downed', 'heavy hit while staggered → Downed');
  assertEq(downed.stateFrameTarget, 60, 'downed = 60 frames');

  // Getup
  let d = downed;
  for (let f = 1; f <= 60; f++) {
    d = stepCombatant(d, null, f);
  }
  assertEq(d.state, 'Idle', 'downed → Idle after 60 frames');

  // Lethal hit while downed → Dead
  const downed2 = createCombatant(3n, 'qi_condensation', 0.8);
  downed2.state = 'Downed';
  downed2.injuries.push({
    injuryId: 'pre-existing-1', injuryType: 'cut_deep' as InjuryType, location: 'torso' as InjuryLocation,
    severity: 0.6, onsetTick: 0, onsetThreshold: 0.15,
    recoveryTimeDays: 60, recoveryTimeTreatedDays: 10,
    effects: [{ type: 'pain_large', magnitude: 0.15 }],
    resolved: false, resolvedAt: null,
  });
  downed2.injuries.push({
    injuryId: 'pre-existing-2', injuryType: 'cut_deep' as InjuryType, location: 'left_arm' as InjuryLocation,
    severity: 0.6, onsetTick: 0, onsetThreshold: 0.15,
    recoveryTimeDays: 60, recoveryTimeTreatedDays: 10,
    effects: [{ type: 'pain_large', magnitude: 0.15 }],
    resolved: false, resolvedAt: null,
  });
  downed2.injuries.push({
    injuryId: 'pre-existing-3', injuryType: 'fractured_bone' as InjuryType, location: 'right_leg' as InjuryLocation,
    severity: 0.6, onsetTick: 0, onsetThreshold: 0.30,
    recoveryTimeDays: 90, recoveryTimeTreatedDays: 45,
    effects: [{ type: 'region_unusable', magnitude: 0.8 }],
    resolved: false, resolvedAt: null,
  });
  const lethalDowned = stepCombatant(downed2, { fromId: 2n, damage: 0.5, phase: 'metal', frame: 0 }, 0);
  assert(lethalDowned.state === 'Dead', 'lethal hit while downed → Dead');
}

console.log('=== SECTION 28: Plugin lifecycle ===');
{
  const capabilities = new Map<string, { capability: string; provider: string; version: string; instance: unknown }>();
  const states = new Map<string, unknown>();

  const mockHost = {
    capabilities: {
      register(entry: { capability: string; provider: string; version: string; instance: unknown }) {
        capabilities.set(entry.capability, entry);
      },
      unregister(cap: string) {
        capabilities.delete(cap);
      },
      list() { return Array.from(capabilities.values()); },
    },
    setState(key: string, state: unknown) { states.set(key, state); },
    getState(key: string) { return states.get(key); },
  };

  const plugin = createCombatPlugin();
  assertEq(plugin.id, 'ga:combat', 'plugin id');
  assertEq(plugin.version, '0.1.0', 'plugin version');
  assert(plugin.dependencies.includes('ga:determinism'), 'depends on determinism');

  plugin.init(mockHost as any);
  assertEq(capabilities.size, 3, '3 capabilities registered');
  assert(capabilities.has('combat.state-machine'), 'combat.state-machine registered');
  assert(capabilities.has('combat.injuries'), 'combat.injuries registered');
  assert(capabilities.has('combat.tiering'), 'combat.tiering registered');
  assert(states.has('ga:combat'), 'state stored');

  plugin.destroy(mockHost as any);
  assertEq(capabilities.size, 0, 'all capabilities unregistered');
}

console.log('=== SECTION 29: Residue decay at various ages ===');
{
  const residue = {
    residueId: 1, originatingAction: 'attack_heavy' as ActionType,
    bornAtFrame: 0, intensity: 1.0, halfLifeFrames: 60,
    phaseSignature: 'fire' as PhaseName, actorId: 1n,
  };

  const d0 = decayResidue(residue, 0);
  assertClose(d0.intensity, 1.0, 'age 0: full intensity');

  const d60 = decayResidue(residue, 60);
  assertClose(d60.intensity, 0.5, 'age 60 (1 half-life): 0.5');

  const d120 = decayResidue(residue, 120);
  assertClose(d120.intensity, 0.25, 'age 120 (2 half-lives): 0.25');

  const d180 = decayResidue(residue, 180);
  assertClose(d180.intensity, 0.125, 'age 180 (3 half-lives): 0.125');
}

console.log('=== SECTION 30: Full duel simulation ===');
{
  const api = createCombatApi();
  const combatId = api.createCombat('duel');

  const c1 = createCombatant(1n, 'qi_condensation', 0.8);
  c1.routing = createQiRouting('hands', 'metal'); // metal conquers wood
  const c2 = createCombatant(2n, 'qi_condensation', 0.8);
  c2.routing = createQiRouting('skin', 'wood'); // wood gets conquered by metal

  api.addCombatant(combatId, c1);
  api.addCombatant(combatId, c2);

  // Combatant 1 attacks, combatant 2 does nothing
  api.queueInput(combatId, 1n, 'attack_heavy', 1);

  // Step through the full sequence
  for (let f = 0; f < 100; f++) {
    api.stepCombat(combatId);
  }

  const combat = api.getCombat(combatId)!;
  const cs2 = combat.combatants.get('2');

  // Combatant 2 should have been hit (injuries or dead)
  assert(cs2 !== undefined, 'combatant 2 still exists');
  assert(cs2!.injuries.length > 0 || cs2!.state === 'Dead', 'combatant 2 has injuries or is dead');
  assert(combat.residues.length > 0, 'residues were generated');
}

console.log('\n============================================================');
console.log(`Combat Conformance: ${passed} passed, ${failed} failed, ${passed + failed} total`);
console.log('============================================================');

if (failed > 0) {
  process.exit(1);
}
