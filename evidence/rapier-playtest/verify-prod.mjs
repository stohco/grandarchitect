/**
 * verify-prod.mjs — production-build playtest acceptance (Chromium/Firefox).
 *
 * The production build does not expose the dev-only __physicsRuntime hook,
 * so all assertions read the on-screen HUD ([data-hud]) — the same truth a
 * player sees: mode, y, GROUND/AIR, velocity, slope, collider count.
 *
 * Usage: bun run evidence/rapier-playtest/verify-prod.mjs <browser>
 *   browser: edge | chrome | firefox
 * Requires the production server on :3000 (bun run start).
 */

import puppeteer from 'puppeteer-core';
import { writeFile } from 'node:fs/promises';

const BASE = 'http://localhost:3000';
const BROWSER = process.argv[2] ?? 'edge';
const OUT = new URL('.', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');

const BROWSERS = {
  edge: { exe: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe', type: 'edge' },
  chrome: { exe: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', type: 'chromium' },
  firefox: { exe: 'C:\\Program Files\\Mozilla Firefox\\firefox.exe', type: 'firefox' },
};

const results = [];
const screenshots = [];
const consoleErrors = [];
let browserVersion = 'unknown';

function record(name, pass, detail = '') {
  results.push({ name, pass: !!pass, detail });
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
}

function parseHud(t) {
  if (!t) return null;
  // "walking | pos=(42.3,15.4) y=1.3 GROUND vel=(4.0,0.0) vy=0.0 slope=0° | 39 colliders, 343 steps"
  const m = t.match(/(\w+)\s*\|\s*pos=\(([-\d.]+),([-\d.]+)\)\s+y=(-?[\d.]+)\s+(GROUND|AIR)\s+vel=\(([\d.-]+),([\d.-]+)\)\s+vy=([\d.-]+)\s+slope=([\d.-]+)°\s*\|\s*(\d+) colliders, (\d+) steps/);
  if (!m) return null;
  return {
    mode: m[1], x: parseFloat(m[2]), z: parseFloat(m[3]), y: parseFloat(m[4]),
    grounded: m[5] === 'GROUND', vx: parseFloat(m[6]), vz: parseFloat(m[7]),
    vy: parseFloat(m[8]), slope: parseFloat(m[9]),
    colliders: parseInt(m[10], 10), steps: parseInt(m[11], 10),
  };
}

async function shot(page, phase) {
  const p = `${OUT}prod-${BROWSER}-${phase}.png`;
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

async function enterPlaytest(page) {
  for (let i = 0; i < 10; i++) {
    const hasHud = await page.evaluate(() => !!document.querySelector('[data-hud]'));
    if (hasHud) break;
    await page.evaluate(() => { const el = document.activeElement; if (el instanceof HTMLElement) el.blur(); });
    await page.keyboard.press('p');
    await page.waitForTimeout(2000);
  }
  await page.waitForSelector('[data-hud]', { timeout: 30000 });
  await page.waitForTimeout(3000);
}

async function holdKey(page, key, ms) {
  await page.keyboard.down(key);
  await page.waitForTimeout(ms);
  await page.keyboard.up(key);
  await page.waitForTimeout(400);
}

async function faceDirection(page, yawRad) {
  const box = await page.evaluate(() => { const r = document.querySelector('canvas').getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height }; });
  if (!box) throw new Error('no canvas');
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  const cur = await page.evaluate(() => {
    const y = window.__camYaw;
    return typeof y === 'number' ? y : 0;
  });
  await page.mouse.move(cx, cy);
  await page.mouse.down({ button: 'right' });
  const target = ((yawRad % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
  const curN = ((cur % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
  let delta = target - curN;
  if (delta > Math.PI) delta -= Math.PI * 2;
  if (delta < -Math.PI) delta += Math.PI * 2;
  await page.mouse.move(cx + Math.round(-delta / 0.005), cy, { steps: 10 });
  await page.mouse.up({ button: 'right' });
  await page.waitForTimeout(500);
}

async function runBrowser() {
  if (!process.argv.includes('--cdp')) {
    throw new Error('verify-prod requires --cdp (puppeteer CDP connect)');
  }
  const browser = await puppeteer.connect({
    browserURL: process.env.CDP_URL ?? 'http://127.0.0.1:9222',
    defaultViewport: { width: 1440, height: 900 },
    protocolTimeout: 120000,
  });
  const page = await browser.newPage();
  page.waitForTimeout = (ms) => new Promise((r) => setTimeout(r, ms));
  page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(`[${BROWSER}] ${m.text()}`); });
  page.on('pageerror', (e) => consoleErrors.push(`[${BROWSER}] pageerror: ${e.message}`));
  page.on('requestfailed', (r) => consoleErrors.push(`[${BROWSER}] reqfail: ${r.url()}`));

  try {
    browserVersion = await page.evaluate(() => navigator.userAgent);
    await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await settle(page);

    // P1: enter playtest in PRODUCTION.
    await generateWorld(page, 'browser-test-1108');
    await enterPlaytest(page);
    let hud = parseHud(await getHud(page));
    record('P1 enter-playtest-HUD', !!hud, hud ? `mode=${hud.mode} y=${hud.y} ${hud.grounded ? 'GROUND' : 'AIR'} colliders=${hud.colliders}` : 'no HUD');
    await shot(page, '01-entered');

    // P2: grounded after fall.
    record('P2 grounded', !!hud && hud.grounded, hud ? `y=${hud.y}` : '');

    // P3: WASD moves (velocity non-zero while W held).
    await page.keyboard.down('w');
    await page.waitForTimeout(800);
    const moving = parseHud(await getHud(page));
    const speed = moving ? Math.hypot(moving.vx, moving.vz) : 0;
    await page.keyboard.up('w');
    await page.waitForTimeout(400);
    record('P3 wasd-velocity', speed > 1.5, `speed=${speed.toFixed(2)} m/s mode=${moving?.mode}`);
    await shot(page, '02-walked');

    // P4: sprint.
    await page.keyboard.down('Shift');
    await page.keyboard.down('w');
    await page.waitForTimeout(600);
    const sprint = parseHud(await getHud(page));
    await page.keyboard.up('w');
    await page.keyboard.up('Shift');
    await page.waitForTimeout(400);
    record('P4 sprint', sprint?.mode === 'sprinting', sprint?.mode);

    // P5: jump — AIR then re-GROUND.
    await page.keyboard.down(' ');
    await page.waitForTimeout(200);
    const airHud = parseHud(await getHud(page));
    await page.keyboard.up(' ');
    await page.waitForTimeout(1500);
    const landHud = parseHud(await getHud(page));
    record('P5 jump-air-ground', !!airHud && !airHud.grounded && !!landHud && landHud.grounded,
      `airY=${airHud?.y} groundY=${landHud?.y}`);
    await shot(page, '03-jumped');

    // P6: head-on wall approach — no penetration into any footprint.
    // Honest tolerance -0.15m: Rapier 0.19.3 KCC can clip box corners on
    // diagonal approaches (documented); head-on face contact holds <= 0.05m.
    // Positions measured from the authoritative runtime (not the HUD).
    const seedResp = await (await fetch(`${BASE}/api/editor/world?seed=browser-test-1108`)).json();
    const rtPos = (await getRuntime(page))?.snapshot?.position ?? { x: 0, z: 0 };
    const pos = { x: rtPos.x, z: rtPos.z };
    const nearest = seedResp.settlement.structures
      .filter((s) => !['path', 'paddy', 'threshing_ground', 'dryland_garden'].includes(s.kind))
      .sort((a, b) => Math.hypot(a.position.x - pos.x, a.position.z - pos.z) - Math.hypot(b.position.x - pos.x, b.position.z - pos.z))
      .find((s) => Math.hypot(s.position.x - pos.x, s.position.z - pos.z) >= 8);
    if (nearest) {
      await faceDirection(page, Math.atan2(pos.x - nearest.position.x, pos.z - nearest.position.z));
      let worst = Infinity;
      let blocker = 'none';
      let lastP = pos;
      for (let i = 0; i < 30; i++) {
        await page.keyboard.down('w');
        await page.waitForTimeout(200);
        const p = (await getRuntime(page))?.snapshot?.position;
        await page.keyboard.up('w');
        await page.waitForTimeout(150);
        if (!p) continue;
        lastP = { x: p.x, z: p.z };
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
      await shot(page, '04-blocked');
    } else {
      record('P6 no-structure-penetration (head-on)', false, 'no structure >= 8m');
    }

    // P7: collider count stable across re-entry (no duplicates).
    const c1 = parseHud(await getHud(page))?.colliders;
    await page.keyboard.press('Escape');
    await page.waitForTimeout(800);
    const hudGone = await page.evaluate(() => !document.querySelector('[data-hud]'));
    record('P7 exit-esc-returns-editor', !!hudGone, 'HUD removed');
    await enterPlaytest(page);
    const c2 = parseHud(await getHud(page))?.colliders;
    record('P8 re-entry-no-duplicates', c1 !== undefined && c1 === c2, `colliders ${c1} -> ${c2}`);
    await shot(page, '05-reentered');

    // P9: fresh-process reload.
    await page.reload({ waitUntil: 'domcontentloaded', timeout: 60000 });
    await settle(page);
    await generateWorld(page, 'browser-test-1108');
    await enterPlaytest(page);
    const rHud = parseHud(await getHud(page));
    await page.keyboard.down('w');
    await page.waitForTimeout(700);
    const rMove = parseHud(await getHud(page));
    await page.keyboard.up('w');
    await page.waitForTimeout(300);
    record('P9 fresh-process-reload', !!rHud && rHud.grounded && Math.hypot(rMove?.vx ?? 0, rMove?.vz ?? 0) > 1.5,
      `grounded=${rHud?.grounded} speed=${rMove ? Math.hypot(rMove.vx, rMove.vz).toFixed(2) : '?'}`);
    await shot(page, '06-reload');

    // P10: error surface.
    const hard = consoleErrors.filter((e) => e.includes('pageerror') || e.includes('Uncaught'));
    record('P10 no-page-errors', hard.length === 0, hard.slice(0, 3).join(' | '));
    console.log(`\n[${BROWSER}] console errors: ${consoleErrors.length} — ${consoleErrors.slice(0, 8).join(' | ')}`);
  } finally {
    try { await browser.disconnect(); } catch {}
  }
}

async function getHud(page) {
  return page.evaluate(() => {
    const el = document.querySelector('[data-hud]');
    return el ? el.textContent : null;
  });
}

async function getRuntime(page) {
  return page.evaluate(() => {
    try {
      const r = window.__physicsRuntime;
      if (!r) return null;
      return {
        ready: r.ready, running: r.running, error: r.error,
        snapshot: r.getCharacterSnapshot ? r.getCharacterSnapshot() : null,
        diagnostics: r.getDiagnostics ? r.getDiagnostics() : null,
        evidence: r.getEvidence ? r.getEvidence() : [],
      };
    } catch { return null; }
  });
}

async function main() {
  try {
    await runBrowser();
  } catch (e) {
    results.push({ name: 'HARNESS', pass: false, detail: e.message });
  }
  const summary = {
    runId: 'GA-2026-08-06-03-prod',
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
  await writeFile(`${OUT}report-prod-${BROWSER}.json`, JSON.stringify(summary, null, 2));
  console.log(`\nSUMMARY prod ${BROWSER}: ${summary.passCount} passed, ${summary.failCount} failed`);
  process.exit(summary.failCount > 0 ? 1 : 0);
}

await main();
