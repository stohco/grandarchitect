// evidence/trailer-test.mjs — records the director's cut headlessly and
// saves the WebM + manifest + director's notes to evidence/.
import puppeteer from 'file:///C:/Users/st3v3/AppData/Local/Temp/opencode/suzaku-frontier/node_modules/puppeteer/lib/puppeteer/puppeteer.js';
import fs from 'fs';

const browser = await puppeteer.launch({ headless: true, protocolTimeout: 600000, args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-webgl', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 720 });
const logs = [];
page.on('console', (m) => logs.push(m.text()));
page.on('pageerror', (e) => logs.push('PAGE_ERROR: ' + e.message));
await page.goto('http://localhost:5174/', { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForFunction('window.__GAME_READY === true', { timeout: 90000 }).catch(() => {});
await new Promise((r) => setTimeout(r, 3000));

// run the director's cut fire-and-forget, then poll until it completes
// (limited to the first 3 local shots so the headless run is fast)
await page.evaluate(() => { window.__game.editor.startDirectorCut(0.2, 3); });
let cut = null;
for (let i = 0; i < 120 && !cut; i++) {
  await new Promise((r) => setTimeout(r, 5000));
  cut = await page.evaluate(() => window.__game.editor.cutState.done);
  if (cut) break;
  const active = await page.evaluate(() => window.__game.editor.cutState.active);
  if (!active && i > 2) break;
}
if (!cut) {
  console.log('CONSOLE:', logs.slice(-10).join(' | '));
  throw new Error('director cut did not complete');
}
const result = await page.evaluate((done) => ({ blobBase64: done.blobBase64, manifest: done.manifest, notes: done.notes, samples: done.samples }), cut);

fs.mkdirSync('evidence', { recursive: true });
fs.writeFileSync('evidence/suzaku-trailer.webm', Buffer.from(result.blobBase64, 'base64'));
fs.writeFileSync('evidence/suzaku-trailer-manifest.json', JSON.stringify({ manifest: result.manifest, notes: result.notes }, null, 2));
console.log('trailer bytes:', Buffer.from(result.blobBase64, 'base64').length);
console.log('samples:', result.samples);
for (const n of result.notes) console.log(`[director] ${n.shotId}: ${n.verdict}${n.notes.length ? ' — ' + n.notes.join(' | ') : ''}`);
console.log('console:', logs.slice(-6).join(' | '));
await browser.close();
