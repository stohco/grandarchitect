/**
 * game/conformance/director-conformance.ts — the director gate.
 *
 *   1. GRAMMAR — every beat composes into a well-formed shot (>= 2 sorted
 *      keyframes, finite positions, duration >= 1 s, timeOfDay in 0..1).
 *   2. DETERMINISM — the same beats compose to the same shots, twice.
 *   3. PHYSICS — the terminator beat flies east across longitudes, so the
 *      local time shifts through the day/night terminator.
 *   4. REVIEW — the director's dailies pass checks: a night beat with a
 *      bright sky is flagged; a stream beat without water is flagged; a
 *      clean beat passes.
 *   5. The composed cut IS the cinematic's shot list (director -> rig).
 *
 * Run: bun run game:director-conformance
 */

import { Director, DIRECTOR_BEATS, type FrameSample } from '../cinematic/director';

let passed = 0;
let failed = 0;
function assert(ok: boolean, msg: string): void {
  if (ok) { passed++; console.log(`  ✅ ${msg}`); }
  else { failed++; console.error(`  ❌ ${msg}`); }
}

console.log('director-conformance — the studio director is lawful\n');

const director = new Director();

// ---- 1. Grammar ----
const shots = director.compose();
assert(shots.length === DIRECTOR_BEATS.length, `every beat composes (${shots.length})`);
let grammarOk = true;
for (const s of shots) {
  if (s.duration < 1) grammarOk = false;
  if (s.timeOfDay < 0 || s.timeOfDay >= 1) grammarOk = false;
  if (s.keyframes.length < 2) grammarOk = false;
  for (let i = 1; i < s.keyframes.length; i++) {
    if (s.keyframes[i].t <= s.keyframes[i - 1].t) grammarOk = false;
  }
  for (const k of s.keyframes) {
    for (const v of [...k.pos, ...k.look]) {
      if (!Number.isFinite(v)) grammarOk = false;
    }
  }
}
assert(grammarOk, 'all shots are well-formed (durations, times, sorted finite keyframes)');

// ---- 2. Determinism ----
const shots2 = director.compose();
assert(JSON.stringify(shots) === JSON.stringify(shots2), 'compose is deterministic (two runs identical)');

// ---- 3. Physics: the terminator beat crosses longitudes ----
const terminator = shots.find((s) => s.id === 'terminator')!;
const startX = terminator.keyframes[0].pos[0];
const endX = terminator.keyframes[terminator.keyframes.length - 1].pos[0];
assert(endX - startX > 150_000, `the terminator flight spans 200 km of longitude (${(endX - startX).toFixed(0)} m)`);
// local time at the end of the flight differs from the start (the planet
// turned under the fixed sun while we flew east)
const { PlanetTimeSystem } = await import('../time/planet-time');
const clock = new PlanetTimeSystem();
clock.time = terminator.timeOfDay;
const tStart = clock.localTimeAt(startX, 0);
const tEnd = clock.localTimeAt(endX, 0);
assert(tEnd !== tStart, `crossing longitudes shifts local time (${tStart.toFixed(3)} → ${tEnd.toFixed(3)})`);

// ---- 4. Review ----
const daySample: FrameSample = { t: 0.5, shotId: 'dawn_village', skyLum: 0.55, horizonRoverB: 1.1, darkFrac: 0.05, blueFrac: 0.1, paleFrac: 0.3 };
const daySample2: FrameSample = { ...daySample, t: 0.9 };
const cleanVillage = director.review([daySample, daySample2]);
assert(cleanVillage[0].verdict === 'pass', 'a clean village beat passes');
const brightNight: FrameSample = { t: 0.5, shotId: 'night_raid', skyLum: 0.6, horizonRoverB: 1.2, darkFrac: 0.1, blueFrac: 0.3, paleFrac: 0.2 };
const nightNotes = director.review([brightNight, { ...brightNight, t: 0.9 }]);
const nightNote = nightNotes.find((n) => n.shotId === 'night_raid')!;
assert(nightNote.notes.some((n) => n.includes('too bright')), 'a night beat with a bright sky is flagged');
const dryStream: FrameSample = { t: 0.5, shotId: 'noon_stream', skyLum: 0.6, horizonRoverB: 1.1, darkFrac: 0.05, blueFrac: 0.001, paleFrac: 0.05 };
const streamNotes = director.review([dryStream, { ...dryStream, t: 0.9 }]);
const streamNote = streamNotes.find((n) => n.shotId === 'noon_stream')!;
assert(streamNote.notes.some((n) => n.includes('no water')), 'a stream beat without water is flagged');
const blackFrame: FrameSample = { t: 0.5, shotId: 'dusk_square', skyLum: 0.05, horizonRoverB: 1.0, darkFrac: 0.95, blueFrac: 0, paleFrac: 0 };
const blackNotes = director.review([blackFrame, { ...blackFrame, t: 0.9 }]);
const blackNote = blackNotes.find((n) => n.shotId === 'dusk_square')!;
assert(blackNote.notes.some((n) => n.includes('black')), 'a black frame is an artifact, flagged');

// ---- 5. The director's cut is the rig's shot list ----
const cut = director.cut([]);
assert(JSON.stringify(cut.shots) === JSON.stringify(shots), 'the director\'s cut feeds the cinematic rig');

console.log(`\n${'='.repeat(40)}`);
console.log(`Results: ${passed}/${passed + failed} passed`);
process.exit(failed > 0 ? 1 : 0);
