// evidence/roof-fix.mjs — verifies the roof + grounding fixes visually.
import puppeteer from 'file:///C:/Users/st3v3/AppData/Local/Temp/opencode/suzaku-frontier/node_modules/puppeteer/lib/puppeteer/puppeteer.js';

const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-webgl', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 720 });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
await page.goto('http://localhost:5174/', { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForFunction('window.__GAME_READY === true', { timeout: 90000 }).catch(() => {});
await new Promise((r) => setTimeout(r, 3000));
await page.evaluate(() => {
  const g = window.__game;
  window.__FREE_CAMERA = true;
  g.time.time = 0.5;
  const h = g.village.houses.get('house_wang_ergou');
  const p = h.position;
  g.camera.position.set(p.x + 9, p.y + 2.6, p.z + 2);
  g.camera.lookAt(p.x, p.y + 2.2, p.z);
});
await new Promise((r) => setTimeout(r, 1500));
const el = await page.$('canvas');
await el.screenshot({ path: 'evidence/roof-fixed.png' });
console.log('errors:', errors.length ? errors.join(' | ') : 'none');
await browser.close();
