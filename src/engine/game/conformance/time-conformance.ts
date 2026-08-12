/**
 * game/conformance/time-conformance.ts — the planet time gate.
 *
 *   1. THE PHYSICS CONTRACT — local time is a function of longitude; the
 *      terminator sweeps at circumference ÷ day length; the dark side
 *      exists and is reachable by speed (the user's rule: a fast flier
 *      can outrun dusk around the planet).
 *   2. Local time monotonicity — walking east advances local time; the
 *      day/night band exists (a longitude where it is day, and another
 *      where it is night, simultaneously).
 *   3. Population scale — 5000 NPCs scheduled in one flat pass, twice,
 *      bit-identical (the scheduler scales; the determinism holds).
 *   4. Emergence — two NPCs never share a spot; the same NPC varies day to
 *      day; events (raid/festival) override the rhythm and are themselves
 *      deterministic.
 *   5. Sun direction — the sun rises in the east and sets in the west at
 *      every longitude.
 *
 * Run: bun run game:time-conformance
 */

import {
  PlanetTimeSystem, PLANET_CIRCUMFERENCE_M, DAY_LENGTH_SECONDS, terminatorSpeed, longitudePhase,
} from '../time/planet-time';
import { scheduleIntent, advancePopulation, type WorldEvent } from '../time/scheduler';

let passed = 0;
let failed = 0;
function assert(ok: boolean, msg: string): void {
  if (ok) { passed++; console.log(`  ✅ ${msg}`); }
  else { failed++; console.error(`  ❌ ${msg}`); }
}

console.log('time-conformance — the planet turns; the schedules hold\n');

// ---- 1. The physics contract ----
const speed = terminatorSpeed();
assert(Math.abs(speed - PLANET_CIRCUMFERENCE_M / DAY_LENGTH_SECONDS) < 1e-9,
  `terminator speed = circumference / day length (${speed.toFixed(1)} m/s)`);
assert(speed > 0, 'the terminator moves');
// the user's rule: a flier faster than the terminator outruns dusk.
// Documented contract: with sword flight, the dark side is escapable.
assert(speed < 200, `terminator outrunnable by high-realm flight (${speed.toFixed(1)} m/s < 200)`);
assert(longitudePhase(0) === 0 && longitudePhase(PLANET_CIRCUMFERENCE_M) === 0, 'longitude wraps');
assert(Math.abs(longitudePhase(PLANET_CIRCUMFERENCE_M / 2) - 0.5) < 1e-9, 'half circumference = half a day of phase');

const planet = new PlanetTimeSystem();
planet.time = 0.25; // just past dawn at the origin
assert(planet.isDayAt(0, 0), 'origin is day at t=0.25');
// the dark side: a longitude where local time is deep night, at the same instant
assert(planet.isNightAt(PLANET_CIRCUMFERENCE_M * 0.6, 0), 'a longitude away it is deep night — the dark side exists');
// walking east advances local time (the planet turns under the fixed sun)
const tWest = planet.localTimeAt(0, 0);
const tEast = planet.localTimeAt(PLANET_CIRCUMFERENCE_M / 4, 0);
assert(tEast > tWest, `east is later than west (${tWest.toFixed(3)} → ${tEast.toFixed(3)})`);

// ---- 2. Sun direction: east rise, west set, every longitude ----
planet.time = 0.25; // dawn at the origin
const sunDawn = planet.sunDirectionAt(0, 0);
const sunNoon = planet.sunDirectionAt(PLANET_CIRCUMFERENCE_M / 4, 0); // +90° longitude = noon
planet.time = 0; // dawn at the +90° longitude (the terminator is elsewhere)
const sunDawnEast = planet.sunDirectionAt(PLANET_CIRCUMFERENCE_M / 4, 0);
assert(sunDawn.y > -0.1, `sun above the horizon at dawn (${sunDawn.y.toFixed(2)})`);
assert(sunNoon.y > sunDawn.y, `sun higher at noon than at dawn (${sunNoon.y.toFixed(2)} > ${sunDawn.y.toFixed(2)})`);
assert(sunDawnEast.x > 0.1, `sun rises in the east at every longitude (${sunDawnEast.x.toFixed(2)})`);

// ---- 3. Population scale: 5000 NPCs, twice, bit-identical ----
function runPopulation(): string {
  const npcs = [];
  for (let i = 0; i < 5000; i++) {
    npcs.push({
      id: `npc_${i}`,
      pos: { x: 0, z: 0 },
      schedule: scheduleIntent(
        `npc_${i}`,
        { centerX: 256, centerZ: -128, homeX: 200 + (i % 12) * 10, homeZ: -140 + (i % 7) * 8, role: i % 3 === 0 ? 'farmer' : i % 3 === 1 ? 'smith' : 'healer' },
        0.45, 3, 'none',
      ),
      walkSpeed: 1.4,
      dt: 1 / 60,
    });
  }
  const walked = advancePopulation(npcs);
  return npcs.map((n) => `${n.pos.x.toFixed(6)},${n.pos.z.toFixed(6)}`).join('|') + `#${walked.toFixed(6)}`;
}
const popA = runPopulation();
const popB = runPopulation();
assert(popA === popB, '5000 NPCs scheduled + walked in one pass, twice — bit-identical');
assert(popA.length > 5000, `population pass produced state (${popA.length} chars)`);

// ---- 4. Emergence ----
const opts = { centerX: 256, centerZ: -128, homeX: 256, homeZ: -128, role: 'farmer' };
const a1 = scheduleIntent('farmer_a', opts, 0.35, 1, 'none');
const a2 = scheduleIntent('farmer_a', opts, 0.35, 2, 'none');
assert(a1.spotX !== a2.spotX || a1.spotZ !== a2.spotZ, 'the same farmer varies day to day');
const b1 = scheduleIntent('farmer_b', opts, 0.35, 1, 'none');
assert(a1.spotX !== b1.spotX || a1.spotZ !== b1.spotZ, 'two farmers never share a spot');
const raidA = scheduleIntent('farmer_a', opts, 0.35, 1, 'raid');
assert(raidA.overridden && raidA.intent === 'sleep', 'a raid scatters everyone home');
const festA = scheduleIntent('farmer_a', opts, 0.35, 1, 'festival');
assert(festA.overridden && festA.intent === 'rest', 'a festival gathers everyone');
const raidB = scheduleIntent('farmer_a', opts, 0.35, 1, 'raid');
assert(raidA.spotX === raidB.spotX && raidA.spotZ === raidB.spotZ, 'the raid override is deterministic');

// ---- 5. Phases ----
const p = new PlanetTimeSystem();
p.time = 0.4;
assert(p.phaseAt(0, 0) === 'work', 't=0.4 is work at the origin');
assert(p.isNightAt(PLANET_CIRCUMFERENCE_M / 2, 0), 'the dark side sleeps while the light side works');

console.log(`\n${'='.repeat(40)}`);
console.log(`Results: ${passed}/${passed + failed} passed`);
process.exit(failed > 0 ? 1 : 0);
