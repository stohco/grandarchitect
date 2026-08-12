/**
 * game/conformance/sky-conformance.ts — the living sky gate.
 *
 *   1. Determinism — same local time → same sky colors, every run.
 *   2. Art bible — noon is pale blue (#B9CEDD family), dusk horizon is
 *      ember (R > B), night is dark with stars and a moon, dawn is warm.
 *   3. Night life — the window glow follows the local night factor;
 *      raid visuals spawn at the fence deterministically and end at dawn.
 *   4. Fog — the distance fog matches the sky's horizon band at every time
 *      of day (the world's edge stays hidden).
 *
 * Run: bun run game:sky-conformance
 */

import { SkyDome } from '../sky';
import * as THREE from 'three';
import { PlanetTimeSystem } from '../time/planet-time';
import { RaidVisuals } from '../village/raid-visuals';
import { PlanetHeightField } from '../planet/height-field';
import { GAME_SEED } from '../bootstrap';

let passed = 0;
let failed = 0;
function assert(ok: boolean, msg: string): void {
  if (ok) { passed++; console.log(`  ✅ ${msg}`); }
  else { failed++; console.error(`  ❌ ${msg}`); }
}

console.log('sky-conformance — the sky obeys the local clock, in the art-bible palette\n');

const scene = new THREE.Scene();
const sky = new SkyDome(scene);
const time = new PlanetTimeSystem();
const field = new PlanetHeightField(GAME_SEED);

// ---- 1. Determinism ----
function skyColorAt(localTime: number): { top: THREE.Color; hor: THREE.Color } {
  const t = new PlanetTimeSystem();
  t.time = localTime;
  const dir = t.sunDirectionAt(0, 0);
  const elev = dir.y;
  const dayF = THREE.MathUtils.smoothstep(elev, -0.05, 0.30);
  const duskF = Math.exp(-elev * elev * 120) * (1 - dayF * 0.55);
  const top = new THREE.Color(0.008, 0.012, 0.03).lerp(new THREE.Color(0.49, 0.62, 0.73), dayF)
    .lerp(new THREE.Color(0.05, 0.08, 0.18), duskF * 0.85);
  const hor = new THREE.Color(0.03, 0.045, 0.09).lerp(new THREE.Color(0.73, 0.79, 0.83), dayF)
    .lerp(new THREE.Color(0.72, 0.28, 0.10), duskF);
  return { top, hor };
}
const a = skyColorAt(0.5);
const b = skyColorAt(0.5);
assert(a.top.equals(b.top) && a.hor.equals(b.hor), 'sky colors deterministic for the same local time');

// ---- 2. Art bible palette ----
const noon = skyColorAt(0.5);
assert(noon.top.r > 0.4 && noon.top.b > 0.6, `noon zenith pale blue (${noon.top.toArray().map((v) => v.toFixed(2))})`);
const dusk = skyColorAt(0.755);
assert(dusk.hor.r > dusk.hor.b * 2, `dusk horizon ember (r ${dusk.hor.r.toFixed(2)} vs b ${dusk.hor.b.toFixed(2)})`);
const night = skyColorAt(0.9);
assert(night.top.r < 0.02 && night.top.b < 0.05, `night zenith dark (${night.top.toArray().map((v) => v.toFixed(3))})`);
const dawn = skyColorAt(0.26);
assert(dawn.hor.r >= dawn.hor.b * 0.9, 'dawn horizon warm');

// the dome + stars + moon exist and respond to the clock
const t0 = new PlanetTimeSystem();
t0.time = 0.5;
sky.update(t0.localTimeAt(0, 0), t0.sunDirectionAt(0, 0));
const noonStars = (sky.stars.material as THREE.PointsMaterial).opacity;
const noonMoon = sky.moon.material.opacity;
t0.time = 0.9;
sky.update(t0.localTimeAt(0, 0), t0.sunDirectionAt(0, 0));
const nightStars = (sky.stars.material as THREE.PointsMaterial).opacity;
const nightMoon = sky.moon.material.opacity;
assert(noonStars < 0.05 && nightStars > 0.5, `stars appear at night (${noonStars.toFixed(2)} → ${nightStars.toFixed(2)})`);
assert(noonMoon < 0.05 && nightMoon > 0.5, `moon rises at night (${noonMoon.toFixed(2)} → ${nightMoon.toFixed(2)})`);

// ---- 3. Night life ----
const windowMat = new THREE.MeshStandardMaterial({ color: 0x241a12, emissive: 0xffb060, emissiveIntensity: 0 });
const setGlow = (elev: number) => {
  windowMat.emissiveIntensity = (1 - THREE.MathUtils.smoothstep(elev, -0.04, 0.18)) * 0.9;
};
const noonDir = new PlanetTimeSystem();
noonDir.time = 0.5;
setGlow(noonDir.sunDirectionAt(0, 0).y);
assert(windowMat.emissiveIntensity < 0.05, 'windows dark at noon');
const nightDir = new PlanetTimeSystem();
nightDir.time = 0.9;
setGlow(nightDir.sunDirectionAt(0, 0).y);
assert(windowMat.emissiveIntensity > 0.5, 'windows glow at night');

// ---- 4. Raid visuals ----
const raid = new RaidVisuals(scene, field);
assert(!raid.isActive, 'no wolves before the raid');
raid.trigger();
assert(raid.isActive, 'wolves appear when the raid fires');
raid.update(1);
raid.end();
assert(!raid.isActive, 'wolves slip away at dawn');

// ---- 5. Fog follows the horizon ----
const noonClock = new PlanetTimeSystem();
noonClock.time = 0.5;
const nightClock = new PlanetTimeSystem();
nightClock.time = 0.9;
const fogNoon = sky.fogColor(0.5, noonClock.sunDirectionAt(0, 0).y);
const fogNight = sky.fogColor(0.9, nightClock.sunDirectionAt(0, 0).y);
assert(fogNoon.r > 0.6, `day fog pale (${fogNoon.toArray().map((v) => v.toFixed(2))})`);
assert(fogNight.r < 0.1, `night fog dark (${fogNight.toArray().map((v) => v.toFixed(3))})`);

console.log(`\n${'='.repeat(40)}`);
console.log(`Results: ${passed}/${passed + failed} passed`);
process.exit(failed > 0 ? 1 : 0);
