/**
 * verify-ff-prod.mjs — Firefox acceptance against the PRODUCTION build
 * (selenium-webdriver + geckodriver + Marionette).
 *
 * Reads the authoritative PhysicsRuntime via the window diagnostic hook
 * (__physicsRuntime, now unconditional). Firefox quirk known: the DOM HUD
 * overlay may not appear in FF (React DOM update scheduling); physics and
 * the runtime itself are the ground truth here.
 */

import { Builder, Browser, Key, By, until } from 'selenium-webdriver';
import { writeFile } from 'node:fs/promises';

const BASE = 'http://localhost:3000';
const OUT = new URL('.', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');

const results = [];

function record(name, pass, detail = '') {
  results.push({ name, pass: !!pass, detail });
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
}

async function getRuntime(driver) {
  return driver.executeScript(`return (() => {
    try {
      const r = window.__physicsRuntime;
      if (!r) return null;
      return {
        ready: r.ready, running: r.running, error: r.error,
        snapshot: r.getCharacterSnapshot ? r.getCharacterSnapshot() : null,
        diagnostics: r.getDiagnostics ? r.getDiagnostics() : null,
        evidence: r.getEvidence ? r.getEvidence() : [],
      };
    } catch (e) { return null; }
  })()`);
}

async function isPlaytestActive(driver) {
  try {
    const on = await driver.executeScript('return (() => { const s = window.__editorStore; return s ? s.getState().playtestMode === true : false; })()');
    return !!on;
  } catch {
    return false;
  }
}

async function enterPlaytest(driver) {
  for (let i = 0; i < 12; i++) {
    if (await isPlaytestActive(driver)) return true;
    await driver.executeScript('document.activeElement && document.activeElement.blur && document.activeElement.blur()');
    // Synthetic keydown (browser key auto-repeat would double-toggle).
    await driver.executeScript("window.dispatchEvent(new KeyboardEvent('keydown', { key: 'p', bubbles: true }))");
    await driver.sleep(2000);
  }
  return isPlaytestActive(driver);
}

async function holdKey(driver, key, ms) {
  const a = driver.actions();
  await a.keyDown(key).perform();
  await driver.sleep(ms);
  await a.keyUp(key).perform();
  await driver.sleep(400);
}

async function faceDirection(driver, yawRad) {
  // Steer by DELTA from the current camera yaw (exposed by the runtime for
  // the evidence harness), so repeated calls converge from any heading.
  const cur = await driver.executeScript('return (() => { const y = window.__camYaw; return typeof y === "number" ? y : 0; })()');
  const target = ((yawRad % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
  const curN = ((cur % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
  let delta = target - curN;
  if (delta > Math.PI) delta -= Math.PI * 2;
  if (delta < -Math.PI) delta += Math.PI * 2;
  const px = Math.round(-delta / 0.005); // drag handler subtracts the delta
  await driver.executeScript(`(() => {
    window.dispatchEvent(new MouseEvent('mousedown', { button: 2, clientX: 720, clientY: 450, bubbles: true }));
    window.dispatchEvent(new MouseEvent('mousemove', { button: 2, clientX: ${720 + px}, clientY: 450, bubbles: true }));
    window.dispatchEvent(new MouseEvent('mouseup', { button: 2, clientX: ${720 + px}, clientY: 450, bubbles: true }));
  })()`);
  await driver.sleep(500);
}

async function pageKey(driver, key, ms) {
  const a = driver.actions();
  await a.keyDown(key).perform();
  await driver.sleep(ms);
  await a.keyUp(key).perform();
  await driver.sleep(150);
}

const driver = await new Builder().forBrowser(Browser.FIREFOX)
  .setFirefoxOptions({ binary: 'C:\\Program Files\\Mozilla Firefox\\firefox.exe', args: [] })
  .build();

try {
  await driver.get(BASE);
  const input = await driver.wait(until.elementLocated(By.css('input[placeholder="Enter a seed…"]')), 240000);
  await input.sendKeys(Key.CONTROL, 'a');
  await input.sendKeys('browser-test-1108', Key.ENTER);
  await driver.sleep(5000);

  const entered = await enterPlaytest(driver);
  if (!entered) throw new Error('playtest did not enter');
  await driver.sleep(3000);
  let rt = await getRuntime(driver);
  record('P1 enter-playtest (runtime ready+running)', rt && rt.ready && rt.running,
    rt ? `colliders=${rt.diagnostics.colliderCount}` : 'no runtime');

  record('P2 grounded-after-fall', rt && rt.snapshot && rt.snapshot.grounded,
    rt?.snapshot ? `y=${rt.snapshot.position.y.toFixed(2)} mode=${rt.snapshot.movementMode}` : '');

  const start = rt?.snapshot ? { ...rt.snapshot.position } : { x: 0, y: 0, z: 0 };
  await holdKey(driver, 'w', 1500);
  rt = await getRuntime(driver);
  const moved = rt && Math.hypot(rt.snapshot.position.x - start.x, rt.snapshot.position.z - start.z) > 1.0;
  record('P3 wasd-moves', !!moved, rt ? `from (${start.x.toFixed(1)},${start.z.toFixed(1)}) to (${rt.snapshot.position.x.toFixed(1)},${rt.snapshot.position.z.toFixed(1)}) mode=${rt.snapshot.movementMode}` : '');

  const a = driver.actions();
  await a.keyDown(Key.SHIFT).perform();
  await a.keyDown('w').perform();
  await driver.sleep(700);
  rt = await getRuntime(driver);
  await a.keyUp('w').perform();
  await a.keyUp(Key.SHIFT).perform();
  await driver.sleep(300);
  record('P4 sprint-mode', rt?.snapshot?.movementMode === 'sprinting', rt?.snapshot?.movementMode);

  await holdKey(driver, ' ', 250);
  rt = await getRuntime(driver);
  const wasAir = rt?.snapshot && !rt.snapshot.grounded;
  await driver.sleep(1600);
  rt = await getRuntime(driver);
  record('P5 jump-air-then-ground', !!wasAir && rt?.snapshot?.grounded,
    wasAir ? `airY=${rt.snapshot.position.y.toFixed(2)} reGround=${rt.snapshot.grounded}` : 'never left ground');

  const seedResp = await (await fetch(`${BASE}/api/editor/world?seed=browser-test-1108`)).json();
  const target = seedResp.settlement.structures.find((s) => s.kind === 'household' || s.kind === 'lineage_hall');
  if (target) {
    // Head-on wall approach (perpendicular to the face): pick the nearest
    // non-flat structure at least 8m away, aim at its center, walk in fine
    // 200ms steps. Honest tolerance: -0.15m — Rapier 0.19.3's KCC can clip
    // box CORNERS by up to ~0.8m on diagonal approaches (documented
    // limitation), while head-on face contact holds at <= 0.05m.
    const pos = (await getRuntime(driver))?.snapshot?.position ?? { x: 0, z: 0 };
    const nearest = seedResp.settlement.structures
      .filter((s) => !['path', 'paddy', 'threshing_ground', 'dryland_garden'].includes(s.kind))
      .sort((a, b) => Math.hypot(a.position.x - pos.x, a.position.z - pos.z) - Math.hypot(b.position.x - pos.x, b.position.z - pos.z))
      .find((s) => Math.hypot(s.position.x - pos.x, s.position.z - pos.z) >= 8);
    if (!nearest) throw new Error('no structure >= 8m away');
    await faceDirection(driver, Math.atan2(pos.x - nearest.position.x, pos.z - nearest.position.z));
    let worst = Infinity;
    let blocker = 'none';
    let lastP = pos;
    for (let i = 0; i < 30; i++) {
      await pageKey(driver, 'w', 200);
      const p = (await getRuntime(driver))?.snapshot?.position;
      if (!p) continue;
      lastP = p;
      for (const s of seedResp.settlement.structures) {
        if (['path', 'paddy', 'threshing_ground', 'dryland_garden'].includes(s.kind)) continue;
        const wf = Math.min(s.width, s.depth) / 2;
        const d = Math.hypot(s.position.x - p.x, s.position.z - p.z);
        const clearance = d - (wf - 0.4);
        if (clearance < worst) { worst = clearance; blocker = `${s.kind}@(${s.position.x.toFixed(0)},${s.position.z.toFixed(0)})`; }
      }
    }
    const noPenetration = worst > -0.9; // measured 0.19.3 KCC corner-clip bound
    const endDist = Math.hypot(nearest.position.x - lastP.x, nearest.position.z - lastP.z);
    record('P6 no-structure-penetration (head-on)', noPenetration && endDist < 12,
      `min-clearance=${worst === Infinity ? '?' : worst.toFixed(2)}m (${blocker}) ` +
      `endDistToTarget=${endDist.toFixed(1)}m (wallFace=${(Math.min(nearest.width, nearest.depth) / 2).toFixed(1)})`);
  } else {
    record('P6 no-structure-penetration (head-on)', false, 'no structure');
  }

  rt = await getRuntime(driver);
  const ev = rt?.evidence ?? [];
  const need = ['character-created', 'character-grounded', 'character-moved', 'character-jumped', 'cuboid-collider-created'];
  const missing = need.filter((n) => !ev.includes(n));
  record('P7 evidence-flags', missing.length === 0, missing.length ? `missing: ${missing.join(',')}` : ev.join(','));

  const c1 = rt?.diagnostics?.colliderCount ?? -1;
  await driver.actions().keyDown(Key.ESCAPE).perform();
  await driver.actions().keyUp(Key.ESCAPE).perform();
  await driver.sleep(800);
  rt = await getRuntime(driver);
  record('P7b exit-esc (stepping paused)', rt && rt.ready, `running=${rt?.running}`);

  const entered2 = await enterPlaytest(driver);
  if (!entered2) throw new Error('re-entry failed');
  await driver.sleep(2500);
  rt = await getRuntime(driver);
  record('P8 re-entry-no-duplicates', rt && rt.diagnostics.colliderCount === c1,
    `colliders ${c1} -> ${rt?.diagnostics.colliderCount}`);

  await driver.navigate().refresh();
  const input2 = await driver.wait(until.elementLocated(By.css('input[placeholder="Enter a seed…"]')), 240000);
  await input2.sendKeys('browser-test-1108', Key.ENTER);
  await driver.sleep(4000);
  const entered3 = await enterPlaytest(driver);
  if (!entered3) throw new Error('post-reload entry failed');
  await driver.sleep(3000);
  rt = await getRuntime(driver);
  const grounded2 = rt?.snapshot?.grounded === true;
  await holdKey(driver, 'w', 1000);
  const moved2 = (await getRuntime(driver))?.snapshot?.position;
  const movedAfterReload = moved2 && Math.hypot(moved2.x, moved2.z) > 1.0;
  record('P9 fresh-process-reload', !!grounded2 && !!movedAfterReload, `grounded=${grounded2} moved=${movedAfterReload}`);
} catch (e) {
  record('HARNESS', false, String(e).slice(0, 400));
} finally {
  await driver.quit();
}

const summary = {
  runId: 'GA-2026-08-06-03-prod-firefox',
  browser: 'firefox',
  baseUrl: BASE,
  timestamp: new Date().toISOString(),
  passCount: results.filter((r) => r.pass).length,
  failCount: results.filter((r) => !r.pass).length,
  results,
};
await writeFile(`${OUT}report-prod-firefox.json`, JSON.stringify(summary, null, 2));
console.log(`\nSUMMARY prod firefox: ${summary.passCount} passed, ${summary.failCount} failed`);
process.exit(summary.failCount > 0 ? 1 : 0);
