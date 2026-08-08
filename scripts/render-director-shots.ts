#!/usr/bin/env bun
/**
 * scripts/render-director-shots.ts — the camera department.
 *
 * Drives the director-render stage and captures every shot to
 * evidence/director/<shotId>.png, using the camera spec from the director
 * script (cut, lens, height). Connects via CDP to a manually launched
 * browser (the repo's established pattern — see evidence/rapier-playtest):
 *
 *   msedge --headless=new --remote-debugging-port=9222 --use-gl=swiftshader
 *          --user-data-dir=C:\Temp\cdp-edge about:blank
 *   bun run scripts/render-director-shots.ts            # Episode 1
 *   EP=2 bun run scripts/render-director-shots.ts       # Episode 2 (Qinghe)
 *   EP=3 bun run scripts/render-director-shots.ts       # Episode 3 (recruitment)
 */

import puppeteer from 'puppeteer-core';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const OUT = join(process.cwd(), 'evidence', 'director');
const EP = process.env.EP ?? '1';
const URL = `http://localhost:3000/director-render?ep=${EP}`;

async function main() {
  mkdirSync(OUT, { recursive: true });

  const browser = await puppeteer.connect({
    browserURL: process.env.CDP_URL ?? 'http://127.0.0.1:9222',
    defaultViewport: { width: 1600, height: 900 },
  });
  const page = await browser.newPage();
  await page.setCacheEnabled(false);
  page.on('console', (msg) => {
    if (msg.type() === 'error') console.log(`  [page] ${msg.text()}`);
  });

  await page.goto(`${URL}${URL.includes('?') ? '&' : '?'}v=${Date.now()}`, { waitUntil: 'networkidle0', timeout: 120_000 });
  await page.waitForFunction('window.__directorShots !== undefined', { timeout: 60_000 });

  const shots = await page.evaluate(() => window.__directorShots());
  console.log(`capturing ${shots.length} shots -> ${OUT}`);

  let ok = 0;
  for (const id of shots) {
    const dataUrl = await page.evaluate((sid) => window.__directorShot(sid), id);
    if (!dataUrl) { console.log(`  FAIL ${id}: no frame`); continue; }
    const b64 = dataUrl.split(',')[1];
    writeFileSync(join(OUT, `${id}.png`), Buffer.from(b64, 'base64'));
    console.log(`  OK ${id}`);
    ok++;
  }

  await browser.disconnect();
  console.log(`done: ${ok}/${shots.length} frames captured`);
  process.exit(ok === shots.length ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
