/**
 * game/conformance/villagers-conformance.ts — the people gate.
 *
 *   1. Determinism — schedules and spots are pure functions of the clock.
 *   2. Grounding — villagers walk the field height, never the void.
 *   3. Favors — fulfillment consumes the goods, grants the reward, records
 *      the belief and the episode.
 *   4. Cognition — the raid propagates the wolves_at_fence belief to every
 *      villager and writes a high-stakes episode.
 *   5. Clock — the day cycle is deterministic and night is where the sky
 *      says it is.
 *
 * Run: bun run game:villagers-conformance
 */

import { PlanetHeightField } from '../planet/height-field';
import { buildVillagers, nearestVillager, broadcastRaid } from '../village/villagers';
import { PlanetTimeSystem, DAY_LENGTH_SECONDS } from '../time/planet-time';
import { Inventory, ITEMS } from '../inventory';
import { believe, recall } from '../../frontier/npc-cognition';
import { GAME_SEED } from '../bootstrap';

let passed = 0;
let failed = 0;
function assert(ok: boolean, msg: string): void {
  if (ok) { passed++; console.log(`  ✅ ${msg}`); }
  else { failed++; console.error(`  ❌ ${msg}`); }
}

console.log('villagers-conformance — the village\'s people, on the frontier cognition\n');

const field = new PlanetHeightField(GAME_SEED);
const scene = new (await import('three')).Scene();
const villagers = buildVillagers(field, scene);

// ---- 1. Determinism ----
assert(villagers.length === 12, `twelve villagers (${villagers.length})`);
assert(new Set(villagers.map((v) => v.name)).size === 12, 'villager names unique');
const time = new PlanetTimeSystem();
for (let i = 0; i < 300; i++) {
  time.update(1 / 60);
  for (const v of villagers) v.update(1 / 60, time);
}
const posA = villagers.map((v) => `${v.position.x.toFixed(6)},${v.position.z.toFixed(6)}`);
const time2 = new PlanetTimeSystem();
const v2 = buildVillagers(field, new (await import('three')).Scene());
for (let i = 0; i < 300; i++) {
  time2.update(1 / 60);
  for (const v of v2) v.update(1 / 60, time2);
}
const posB = v2.map((v) => `${v.position.x.toFixed(6)},${v.position.z.toFixed(6)}`);
assert(posA.every((p, i) => p === posB[i]), 'villager schedules deterministic (300 ticks, two runs identical)');

// ---- 2. Grounding ----
let maxGap = 0;
for (const v of villagers) {
  const gy = field.evaluate(v.position.x, v.position.z).height;
  maxGap = Math.max(maxGap, Math.abs(v.body.position.y - gy));
}
assert(maxGap < 1e-6, `villagers walk the field height (maxGap ${maxGap.toExponential(1)})`);

// ---- 3. Favors ----
const smith = villagers.find((v) => v.role === 'smith')!;
assert(smith.favor?.id === 'iron_ore', 'the smith wants iron ore');
const inv = new Inventory();
const refuse = smith.fulfill(inv);
assert(!refuse.ok, 'favor refused without the goods');
inv.add('iron_ore', 3);
const ok = smith.fulfill(inv);
assert(ok.ok, `favor fulfilled (${ok.line.slice(0, 40)}…)`);
assert(inv.count('iron_ore') === 0, 'goods consumed');
assert(inv.count('iron_sword') === 1, 'reward granted');
assert(smith.favor === null, 'favor completed');
assert(smith.relationship > 0.4, 'relationship grew');
assert(!!(smith.beliefs.beliefs.get('player_helped')?.confidence >= 0.5), 'belief recorded');
assert(smith.memory.episodes.size >= 1, 'episode recorded');
const recalled = recall(smith.memory, (e) => e.action === 'fulfilled_favor');
assert(recalled.length >= 1, 'episode recallable');

// ---- 4. Cognition: the raid ----
const before = villagers.filter((v) => believe(v.beliefs, 'wolves_at_fence')).length;
broadcastRaid(villagers, 999);
const after = villagers.filter((v) => believe(v.beliefs, 'wolves_at_fence')).length;
assert(before === 0 && after === 12, `raid belief propagates to all (${before} → ${after})`);
const elder = villagers.find((v) => v.role === 'elder')!;
assert(elder.talk().includes('wolves'), 'belief-aware dialogue: the elder speaks of the wolves');

// ---- 5. Planet time ----
assert(DAY_LENGTH_SECONDS === 3600, 'day length 3600 s (1 hour of play)');
const t2 = new PlanetTimeSystem();
t2.time = 0.8;
assert(t2.isNightAt(0, 0), 't=0.8 is night at the origin');
t2.time = 0.1;
assert(t2.isNightAt(0, 0), 't=0.1 is night at the origin');
t2.time = 0.4;
assert(!t2.isNightAt(0, 0), 't=0.4 is day at the origin');
assert(t2.phaseAt(0, 0) === 'work', 't=0.4 is work phase at the origin');
// local time: villagers on the dark side sleep while the light side works
t2.time = 0.25;
const darkX = 400_000 * 0.6;
assert(t2.isNightAt(darkX, 0) && t2.phaseAt(darkX, 0) === 'sleep', 'the dark side sleeps while the origin works');

// ---- 6. Items registry ----
assert(Object.keys(ITEMS).length === 6, `six items (${Object.keys(ITEMS).length})`);

console.log(`\n${'='.repeat(40)}`);
console.log(`Results: ${passed}/${passed + failed} passed`);
process.exit(failed > 0 ? 1 : 0);
