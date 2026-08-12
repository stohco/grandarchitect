// evidence/stream-views.mjs — captures the stream from the bank and the
// valley from above, to verify the water + floodplain + meso relief reads.
import puppeteer from 'file:///C:/Users/st3v3/AppData/Local/Temp/opencode/suzaku-frontier/node_modules/puppeteer/lib/puppeteer/puppeteer.js';

const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-webgl', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 720 });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
await page.goto('http://localhost:5174/', { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForFunction('window.__GAME_READY === true', { timeout: 90000 }).catch(() => {});
await new Promise((r) => setTimeout(r, 3000));

// stream from the bank, looking along the channel
await page.evaluate(() => {
  const g = window.__game;
  window.__FREE_CAMERA = true;
  g.time.time = 0.5;
  g.camera.position.set(282, 58.2, -86);
  g.camera.lookAt(278, 50.5, -110);
});
await new Promise((r) => setTimeout(r, 1500));
let el = await page.$('canvas');
await el.screenshot({ path: 'evidence/stream-bank.png' });

// valley from above — the floor should roll, not be a tarp
await page.evaluate(() => {
  const g = window.__game;
  g.camera.position.set(256, 100, -128);
  g.camera.lookAt(256, 59, -110);
});
await new Promise((r) => setTimeout(r, 1500));
el = await page.$('canvas');
await el.screenshot({ path: 'evidence/valley-above.png' });
console.log('errors:', errors.length ? errors.join(' | ') : 'none');
await browser.close();
