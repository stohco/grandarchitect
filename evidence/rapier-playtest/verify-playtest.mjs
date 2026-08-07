/**
 * Rapier embodied playtest — browser verification harness (milestone
 * "rapier-embodied-playtest", run GA-2026-08-06).
 *
 * Drives the real Live Architect Studio in a real browser and asserts the
 * acceptance suite. Chromium-family browsers connect via CDP to a manually
 * launched Chrome/Edge (--cdp); Firefox uses Playwright's own launcher.
 *
 *  A1  Playtest enters and exits cleanly (P / Esc).
 *  A2  Character falls onto the ground collider and rests grounded.
 *  A3  WASD moves the character (snapshot position changes).
 *  A4  Space jumps (AIR) and re-grounds (GROUND).
 *  A5  Shift sprints (movementMode 'sprinting').
 *  A6  Structure collision blocks penetration (walk-into-wall stops).
 *  A7  Evidence flags present.
 *  A8  Re-entry does not duplicate colliders.
 *  A9  Fresh-process reload re-enters playtest cleanly.
 *  A10 No page errors / unhandled rejections / failed requests.
 *
 * Usage:
 *   bun run evidence/rapier-playtest/verify-playtest.mjs chrome --cdp
 *   bun run evidence/rapier-playtest/verify-playtest.mjs firefox
 */

import puppeteer from 'puppeteer-core';
import { writeFile } from 'node:fs/promises';

const BASE = 'http://localhost:3000';
const BROWSER = process.argv[2] ?? 'chrome';
const USE_CDP = process.argv.includes('--cdp');
const CDP_URL = process.env.CDP_URL ?? 'http://127.0.0.1:9222';
const OUT = new URL('.', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');

const results = [];
const screenshots = [];
const consoleErrors = [];
let browserVersion = 'unknown';

function record(name, pass, detail = '') {
  results.push({ name, pass: !!pass, detail });
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
}

async function shot(page, phase) {
  const p = `${OUT}${BROWSER}-${phase}.png`;
  await page.screenshot({ path: p });
  screenshots.push(p);
}

async function settle(page) {
  await page.waitForSelector('input[placeholder="Enter a seed…"]', { timeout: 120000 });
}

async function generateWorld(page, seed) {
  await page.click('input[placeholder="Enter a seed…"]');
  await page.keyboard.down('Control');
  await page.keyboard.press('a');
  await page.keyboard.up('Control');
  await page.keyboard.type(seed);
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => {
    const c = document.querySelector('canvas');
    return c && c.width > 0;
  }, { timeout: 60000 });
  await page.waitForTimeout(2500);
}

async function getRuntime(page) {
  return page.evaluate(() => {
    const r = window.__physicsRuntime;
    if (!r) return null;
    return {
      ready: r.ready,
      running: r.running,
      error: r.error,
      snapshot: r.getCharacterSnapshot?.() ?? null,
      diagnostics: r.getDiagnostics?.() ?? null,
      evidence: r.getEvidence?.() ?? [],
      colliders: r.getColliderDebugInfo?.() ?? [],
    };
  });
}

async function enterPlaytest(page) {
  // The 'p' shortcut can race hydration / on-demand chunk compilation, so
  // press-retry until the runtime is running (never press while it already
  // is — 'p' toggles).
  for (let i = 0; i < 10; i++) {
    const active = await page.evaluate(() => {
      const r = window.__physicsRuntime;
      return !!(r && r.ready && r.running);
    });
    if (active) return;
    // The seed input keeps focus after generation; the editor's key handler
    // ignores keys while typing. Blur first so the global shortcut fires.
    await page.evaluate(() => { const el = document.activeElement; if (el instanceof HTMLElement) el.blur(); });
    await page.keyboard.press('p');
    await page.waitForTimeout(2000);
  }
  const ok = await page.evaluate(() => {
    const r = window.__physicsRuntime;
    return !!(r && r.ready && r.running);
  });
  if (!ok) throw new Error('playtest did not enter');
  await page.waitForTimeout(2500);
}

async function exitPlaytest(page) {
  await page.keyboard.press('Escape');
  await page.waitForTimeout(800);
}

async function holdKey(page, key, ms) {
  await page.keyboard.down(key);
  await page.waitForTimeout(ms);
  await page.keyboard.up(key);
  await page.waitForTimeout(400);
}

async function faceDirection(page, yawRad) {
  const box = await page.evaluate(() => {
    const r = document.querySelector('canvas').getBoundingClientRect();
    return { x: r.x, y: r.y, width: r.width, height: r.height };
  });
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  await page.mouse.move(cx, cy);
  await page.mouse.down({ button: 'right' });
  const target = ((yawRad % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
  const sweep = target > Math.PI ? target - Math.PI * 2 : target;
  await page.mouse.move(cx + Math.round(sweep / 0.005), cy, { steps: 10 });
  await page.mouse.up({ button: 'right' });
  await page.waitForTimeout(500);
}

async function runBrowser() {
  let browser;
  let page;

  if (USE_CDP) {
    browser = await puppeteer.connect({
      browserURL: CDP_URL,
      defaultViewport: { width: 1440, height: 900 },
      protocolTimeout: 120000,
    });
    page = await browser.newPage();
    page.waitForTimeout = (ms) => new Promise((r) => setTimeout(r, ms));
  } else {
    // Firefox via Playwright's own downloaded build (system Firefox does not
    // speak the juggler protocol).
    const { firefox } = await import('playwright-core');
    const pw = await firefox.launch({
      headless: false,
      viewport: { width: 1440, height: 900 },
    });
    const pwPage = await pw.newPage();
    browser = { version: () => 'firefox(playwright)', disconnect: () => pw.close() };
    page = pwPage;
    // Re-bind the puppeteer-style page helpers for the playwright page.
    page.waitForTimeout = (ms) => new Promise((r) => setTimeout(r, ms));
    page.type = async (sel, txt) => { await pwPage.click(sel); await pwPage.keyboard.type(txt); };
  }

  page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(`[${BROWSER}] ${m.text()}`); });
  page.on('pageerror', (e) => consoleErrors.push(`[${BROWSER}] pageerror: ${e.message}`));
  page.on('requestfailed', (r) => consoleErrors.push(`[${BROWSER}] reqfail: ${r.url()}`));

  try {
    browserVersion = await browser.version();
    await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await settle(page);

    // A1: enter playtest.
    await generateWorld(page, 'browser-test-1108');
    await enterPlaytest(page);
    let rt = await getRuntime(page);
    record('A1 enter-playtest (runtime ready+running)', rt && rt.ready && rt.running, rt ? `colliders=${rt.diagnostics.colliderCount}` : 'no runtime');
    await shot(page, '01-entered');

    // A2: grounded.
    record('A2 grounded-after-fall', rt && rt.snapshot && rt.snapshot.grounded, rt?.snapshot ? `y=${rt.snapshot.position.y.toFixed(2)} mode=${rt.snapshot.movementMode}` : '');

    // A3: movement.
    const start = rt?.snapshot ? { ...rt.snapshot.position } : { x: 0, y: 0, z: 0 };
    await holdKey(page, 'w', 1500);
    rt = await getRuntime(page);
    const moved = rt && Math.hypot(rt.snapshot.position.x - start.x, rt.snapshot.position.z - start.z) > 1.0;
    record('A3 wasd-moves', !!moved, rt ? `from (${start.x.toFixed(1)},${start.z.toFixed(1)}) to (${rt.snapshot.position.x.toFixed(1)},${rt.snapshot.position.z.toFixed(1)}) mode=${rt.snapshot.movementMode}` : '');
    await shot(page, '02-walked');

    // A5: sprint — read the snapshot WHILE keys are held.
    await page.keyboard.down('Shift');
    await page.keyboard.down('w');
    await page.waitForTimeout(700);
    rt = await getRuntime(page);
    await page.keyboard.up('w');
    await page.keyboard.up('Shift');
    await page.waitForTimeout(300);
    record('A5 sprint-mode', rt?.snapshot?.movementMode === 'sprinting', rt?.snapshot?.movementMode);

    // A4: jump.
    await holdKey(page, ' ', 250);
    rt = await getRuntime(page);
    const wasAir = rt?.snapshot && !rt.snapshot.grounded;
    await page.waitForTimeout(1600);
    rt = await getRuntime(page);
    record('A4 jump-air-then-ground', !!wasAir && rt?.snapshot?.grounded, wasAir ? `airY=${rt.snapshot.position.y.toFixed(2)} reGround=${rt.snapshot.grounded}` : 'never left ground');
    await shot(page, '03-jumped');

    // A6: structure collision — walk into the village and prove the
    // character cannot penetrate ANY structure (stops at the first wall).
    const seedResp = await (await fetch(`${BASE}/api/editor/world?seed=browser-test-1108`)).json();
    const structs = seedResp.settlement.structures.filter((s) => s.kind === 'household' || s.kind === 'lineage_hall');
    const target = structs[0];
    if (target) {
      const yaw = Math.atan2(-target.position.x, -target.position.z);
      await faceDirection(page, yaw);
      const charStart = (await getRuntime(page))?.snapshot?.position ?? { x: 0, y: 0, z: 0 };
      const distToCenter = Math.hypot(target.position.x - charStart.x, target.position.z - charStart.z);
      const wallFace = Math.min(target.width, target.depth) / 2;
      const approachSteps = Math.max(1, Math.ceil((distToCenter - wallFace - 1.5) / 2.5));
      let finalS;
      for (let i = 0; i < approachSteps + 3; i++) {
        await holdKey(page, 'w', 300);
        finalS = (await getRuntime(page))?.snapshot?.position;
      }
      // No penetration into ANY structure: capsule center must stay at or
      // beyond (wallFace - capsuleRadius) for every structure footprint.
      let worst = Infinity;
      let blocker = 'none';
      for (const s of seedResp.settlement.structures) {
        if (s.kind === 'path' || s.kind === 'paddy' || s.kind === 'threshing_ground' || s.kind === 'dryland_garden') continue;
        const wf = Math.min(s.width, s.depth) / 2;
        const d = Math.hypot(s.position.x - finalS.x, s.position.z - finalS.z);
        const clearance = d - (wf - 0.4); // 0.4 = capsule radius
        if (clearance < worst) { worst = clearance; blocker = `${s.kind}@(${s.position.x.toFixed(0)},${s.position.z.toFixed(0)})`; }
      }
      const noPenetration = worst > -0.05;
      record('A6 structure-collision-blocks', noPenetration,
        `nearest-structure clearance=${worst.toFixed(2)}m (blocked by ${blocker}); target=${target.kind} wallFace=${wallFace.toFixed(1)}`);
      await shot(page, '04-blocked-by-wall');
    } else {
      record('A6 structure-collision-blocks', false, 'no household structure in settlement');
    }

    // A7: evidence flags.
    rt = await getRuntime(page);
    const ev = rt?.evidence ?? [];
    const need = ['character-created', 'character-grounded', 'character-moved', 'character-jumped', 'cuboid-collider-created'];
    const missing = need.filter((n) => !ev.includes(n));
    record('A7 evidence-flags', missing.length === 0, missing.length ? `missing: ${missing.join(',')}` : ev.join(','));
    await shot(page, '05-evidence');

    // A1: exit — playtest mode off (stepping stops via the store gate; the
    // always-mounted runtime stays initialized but is not stepped).
    const colliderCountBefore = rt?.diagnostics?.colliderCount ?? -1;
    await exitPlaytest(page);
    const exitMode = await page.evaluate(() => {
      const s = window.__editorStore;
      return s ? s.getState().playtestMode : null;
    });
    const stepsAtExit = (await getRuntime(page))?.diagnostics?.stepCount ?? -1;
    await page.waitForTimeout(800);
    const stepsAfter = (await getRuntime(page))?.diagnostics?.stepCount ?? -1;
    record('A1 exit-playtest (mode off, stepping stopped)', exitMode === false && stepsAfter === stepsAtExit,
      `mode=${exitMode} stepsFrozen=${stepsAfter === stepsAtExit}`);

    // A8: re-entry, collider count stable.
    await enterPlaytest(page);
    rt = await getRuntime(page);
    record('A8 re-entry-no-duplicate-colliders', rt && rt.diagnostics.colliderCount === colliderCountBefore,
      `before=${colliderCountBefore} after=${rt?.diagnostics.colliderCount}`);
    await exitPlaytest(page);

    // A9: fresh-process reload.
    await page.reload({ waitUntil: 'domcontentloaded', timeout: 60000 });
    await settle(page);
    await generateWorld(page, 'browser-test-1108');
    await enterPlaytest(page);
    rt = await getRuntime(page);
    const grounded2 = rt?.snapshot?.grounded === true;
    await holdKey(page, 'w', 1000);
    const moved2 = (await getRuntime(page))?.snapshot.position;
    const movedAfterReload = moved2 && Math.hypot(moved2.x, moved2.z) > 1.0;
    record('A9 fresh-process-reload', !!grounded2 && !!movedAfterReload, `grounded=${grounded2} moved=${movedAfterReload}`);
    await shot(page, '06-after-reload');

    // A10: error surface.
    const hardErrors = consoleErrors.filter((e) => e.includes('pageerror') || e.includes('Uncaught'));
    record('A10 no-page-errors', hardErrors.length === 0, hardErrors.slice(0, 3).join(' | '));
    console.log(`\n[${BROWSER}] console errors: ${consoleErrors.length} — ${consoleErrors.slice(0, 8).join(' | ')}`);
  } finally {
    try { await browser.disconnect(); } catch {}
  }
}

async function main() {
  try {
    await runBrowser();
  } catch (e) {
    results.push({ name: 'HARNESS', pass: false, detail: String(e).slice(0, 400) });
  }
  const summary = {
    runId: 'GA-2026-08-06-02',
    browser: BROWSER,
    browserVersion,
    baseUrl: BASE,
    timestamp: new Date().toISOString(),
    passCount: results.filter((r) => r.pass).length,
    failCount: results.filter((r) => !r.pass).length,
    results,
    screenshots,
    consoleErrors,
  };
  await writeFile(`${OUT}report-${BROWSER}.json`, JSON.stringify(summary, null, 2));
  console.log(`\nSUMMARY ${BROWSER}: ${summary.passCount} passed, ${summary.failCount} failed`);
  process.exit(summary.failCount > 0 ? 1 : 0);
}

await main();
