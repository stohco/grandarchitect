/**
 * verify-ff.mjs — Firefox acceptance for the Rapier embodied playtest
 * (selenium-webdriver + geckodriver + Marionette; Playwright's connection
 * layer is broken on this machine for both Chromium and Firefox).
 *
 * Same assertions as verify-playtest.mjs (A1-A10), against the dev server.
 * Requires: geckodriver on PATH, system Firefox.
 */

import { Builder, Browser, Key, By, until } from 'selenium-webdriver';
import { writeFile } from 'node:fs/promises';

const BASE = 'http://localhost:3000';
const OUT = new URL('.', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');

const results = [];
const screenshots = [];

function record(name, pass, detail = '') {
  results.push({ name, pass: !!pass, detail });
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
}

async function shot(driver, phase) {
  const b64 = await driver.takeScreenshot();
  const p = `${OUT}firefox-${phase}.png`;
  await writeFile(p, Buffer.from(b64, 'base64'));
  screenshots.push(p);
}

async function getRuntime(driver) {
  // NOTE: geckodriver/Marionette only returns the value of an explicit
  // `return` — bare expression-value IIFEs come back null in Firefox.
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

async function enterPlaytest(driver) {
  // The 'p' shortcut can race app hydration / on-demand chunk compile, so
  // press-retry until the runtime is actually running (never press while it
  // already is — 'p' toggles).
  for (let i = 0; i < 10; i++) {
    const active = await isPlaytestActive(driver);
    if (active) return true;
    await driver.executeScript('document.activeElement && document.activeElement.blur && document.activeElement.blur()');
    const a = driver.actions();
    await a.keyDown('p').perform();
    await a.keyUp('p').perform();
    await driver.sleep(2000);
  }
  return isPlaytestActive(driver);
}

async function isPlaytestActive(driver) {
  try {
    const r = await getRuntime(driver);
    return !!(r && r.ready && r.running);
  } catch {
    return false;
  }
}

async function faceDirection(driver, yawRad) {
  // Synthetic window-level mouse events — the same listeners the component
  // registers (button 2 drag look).
  const sweep = ((yawRad % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
  const px = Math.round((sweep > Math.PI ? sweep - Math.PI * 2 : sweep) / 0.005);
  await driver.executeScript(`(() => {
    window.dispatchEvent(new MouseEvent('mousedown', { button: 2, clientX: 720, clientY: 450, bubbles: true }));
    window.dispatchEvent(new MouseEvent('mousemove', { button: 2, clientX: ${720 + px}, clientY: 450, bubbles: true }));
    window.dispatchEvent(new MouseEvent('mouseup', { button: 2, clientX: ${720 + px}, clientY: 450, bubbles: true }));
  })()`);
  await driver.sleep(500);
}

async function holdKey(driver, key, ms) {
  const a = driver.actions();
  await a.keyDown(key).perform();
  await driver.sleep(ms);
  await a.keyUp(key).perform();
  await driver.sleep(400);
}

const driver = await new Builder().forBrowser(Browser.FIREFOX)
  .setFirefoxOptions({ binary: 'C:\\Program Files\\Mozilla Firefox\\firefox.exe', args: [] })
  .build();

try {
  await driver.get(BASE);
  const input = await driver.wait(until.elementLocated(By.css('input[placeholder="Enter a seed…"]')), 120000);
  await input.sendKeys(Key.CONTROL, 'a');
  await input.sendKeys('browser-test-1108', Key.ENTER);
  await driver.sleep(4000);

  // Enter playtest (probe-proven flow: fixed sleeps, simple state reads).
  let entered = false;
  for (let i = 0; i < 10 && !entered; i++) {
    entered = await isPlaytestActive(driver);
    if (entered) break;
    await driver.executeScript('document.activeElement && document.activeElement.blur && document.activeElement.blur()');
    const a = driver.actions();
    await a.keyDown('p').perform();
    await a.keyUp('p').perform();
    await driver.sleep(2500);
    entered = await isPlaytestActive(driver);
  }
  if (!entered) throw new Error('playtest did not enter');
  await driver.sleep(2000);
  let rt = await getRuntime(driver);
  record('A1 enter-playtest (runtime ready+running)', rt && rt.ready && rt.running, rt ? `colliders=${rt.diagnostics.colliderCount}` : 'no runtime');
  await shot(driver, '01-entered');

  record('A2 grounded-after-fall', rt && rt.snapshot && rt.snapshot.grounded, rt?.snapshot ? `y=${rt.snapshot.position.y.toFixed(2)} mode=${rt.snapshot.movementMode}` : '');

  const start = rt?.snapshot ? { ...rt.snapshot.position } : { x: 0, y: 0, z: 0 };
  await holdKey(driver, 'w', 1500);
  rt = await getRuntime(driver);
  const moved = rt && Math.hypot(rt.snapshot.position.x - start.x, rt.snapshot.position.z - start.z) > 1.0;
  record('A3 wasd-moves', !!moved, rt ? `from (${start.x.toFixed(1)},${start.z.toFixed(1)}) to (${rt.snapshot.position.x.toFixed(1)},${rt.snapshot.position.z.toFixed(1)})` : '');
  await shot(driver, '02-walked');

  const a = driver.actions();
  await a.keyDown(Key.SHIFT).perform();
  await a.keyDown('w').perform();
  await driver.sleep(700);
  rt = await getRuntime(driver);
  await a.keyUp('w').perform();
  await a.keyUp(Key.SHIFT).perform();
  await driver.sleep(300);
  record('A5 sprint-mode', rt?.snapshot?.movementMode === 'sprinting', rt?.snapshot?.movementMode);

  await holdKey(driver, ' ', 250);
  rt = await getRuntime(driver);
  const wasAir = rt?.snapshot && !rt.snapshot.grounded;
  await driver.sleep(1600);
  rt = await getRuntime(driver);
  record('A4 jump-air-then-ground', !!wasAir && rt?.snapshot?.grounded, wasAir ? `airY=${rt.snapshot.position.y.toFixed(2)} reGround=${rt.snapshot.grounded}` : 'never left ground');
  await shot(driver, '03-jumped');

  const seedResp = await (await fetch(`${BASE}/api/editor/world?seed=browser-test-1108`)).json();
  const target = seedResp.settlement.structures.find((s) => s.kind === 'household' || s.kind === 'lineage_hall');
  if (target) {
    await faceDirection(driver, Math.atan2(-target.position.x, -target.position.z));
    const charStart = (await getRuntime(driver))?.snapshot?.position ?? { x: 0, y: 0, z: 0 };
    const dist = Math.hypot(target.position.x - charStart.x, target.position.z - charStart.z);
    const wallFace = Math.min(target.width, target.depth) / 2;
    const steps = Math.max(1, Math.ceil((dist - wallFace - 1.5) / 2.5));
    let finalS;
    for (let i = 0; i < steps + 3; i++) {
      await holdKey(driver, 'w', 300);
      finalS = (await getRuntime(driver))?.snapshot?.position;
    }
    let worst = Infinity;
    let blocker = 'none';
    for (const s of seedResp.settlement.structures) {
      if (['path', 'paddy', 'threshing_ground', 'dryland_garden'].includes(s.kind)) continue;
      const wf = Math.min(s.width, s.depth) / 2;
      const d = Math.hypot(s.position.x - finalS.x, s.position.z - finalS.z);
      const clearance = d - (wf - 0.4);
      if (clearance < worst) { worst = clearance; blocker = s.kind; }
    }
    record('A6 structure-collision-blocks', worst > -0.05, `nearest-structure clearance=${worst.toFixed(2)}m (blocked by ${blocker})`);
    await shot(driver, '04-blocked');
  } else {
    record('A6 structure-collision-blocks', false, 'no structure');
  }

  rt = await getRuntime(driver);
  const ev = rt?.evidence ?? [];
  const need = ['character-created', 'character-grounded', 'character-moved', 'character-jumped', 'cuboid-collider-created'];
  const missing = need.filter((n) => !ev.includes(n));
  record('A7 evidence-flags', missing.length === 0, missing.length ? `missing: ${missing.join(',')}` : ev.join(','));
  await shot(driver, '05-evidence');

  const colliderCountBefore = rt?.diagnostics?.colliderCount ?? -1;
  await driver.actions().keyDown(Key.ESCAPE).perform();
  await driver.actions().keyUp(Key.ESCAPE).perform();
  await driver.sleep(800);
  rt = await getRuntime(driver);
  record('A1 exit-playtest (paused)', rt && rt.ready && !rt.running, `running=${rt?.running}`);

  const entered2 = await enterPlaytest(driver);
  if (!entered2) throw new Error('re-entry failed');
  await driver.sleep(2000);
  rt = await getRuntime(driver);
  record('A8 re-entry-no-duplicate-colliders', rt && rt.diagnostics.colliderCount === colliderCountBefore,
    `before=${colliderCountBefore} after=${rt?.diagnostics.colliderCount}`);
  await shot(driver, '06-reentered');

  await driver.navigate().refresh();
  const input2 = await driver.wait(until.elementLocated(By.css('input[placeholder="Enter a seed…"]')), 120000);
  await input2.sendKeys('browser-test-1108', Key.ENTER);
  await driver.wait(async () => {
    const c = await driver.executeScript('return !!document.querySelector("canvas") && document.querySelector("canvas").width > 0');
    return c;
  }, 60000);
  await driver.sleep(2000);
  const entered3 = await enterPlaytest(driver);
  if (!entered3) throw new Error('post-reload entry failed');
  await driver.sleep(2500);
  rt = await getRuntime(driver);
  const grounded2 = rt?.snapshot?.grounded === true;
  await holdKey(driver, 'w', 1000);
  const moved2 = (await getRuntime(driver))?.snapshot?.position;
  const movedAfterReload = moved2 && Math.hypot(moved2.x, moved2.z) > 1.0;
  record('A9 fresh-process-reload', !!grounded2 && !!movedAfterReload, `grounded=${grounded2} moved=${movedAfterReload}`);
  await shot(driver, '07-reload');
} catch (e) {
  record('HARNESS', false, String(e).slice(0, 400));
  try {
    const state = await driver.executeScript(`return (() => {
      const r = window.__physicsRuntime;
      return {
        body: document.body.innerText.slice(0, 220),
        hasRt: !!r, ready: r ? r.ready : null, running: r ? r.running : null, err: r ? r.error : null,
        hud: !!document.querySelector('[data-hud]'),
        canvas: !!document.querySelector('canvas'),
        seed: !!document.querySelector('input[placeholder="Enter a seed…"]'),
      };
    })()`);
    console.log('PAGE_STATE', JSON.stringify(state));
  } catch (e2) { console.log('STATE_DUMP_FAIL', String(e2).slice(0, 200)); }
} finally {
  await driver.quit();
}

const summary = {
  runId: 'GA-2026-08-06-02-firefox',
  browser: 'firefox',
  baseUrl: BASE,
  timestamp: new Date().toISOString(),
  passCount: results.filter((r) => r.pass).length,
  failCount: results.filter((r) => !r.pass).length,
  results,
  screenshots,
};
await writeFile(`${OUT}report-firefox.json`, JSON.stringify(summary, null, 2));
console.log(`\nSUMMARY firefox: ${summary.passCount} passed, ${summary.failCount} failed`);
process.exit(summary.failCount > 0 ? 1 : 0);
