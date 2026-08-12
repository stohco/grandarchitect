// evidence/sky-views.mjs — captures the village at four local times for VLM
// art-bible inspection: dawn, noon, dusk, night (glowing windows, stars).
// Run from grandarchitect while game:dev serves :5174.
import puppeteer from 'file:///C:/Users/st3v3/AppData/Local/Temp/opencode/suzaku-frontier/node_modules/puppeteer/lib/puppeteer/puppeteer.js';

const TIMES = [
  ['dawn', 0.255],
  ['noon', 0.5],
  ['dusk', 0.755],
  ['night', 0.88],
];

const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-webgl', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 720 });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
await page.goto('http://localhost:5174/', { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForFunction('window.__GAME_READY === true', { timeout: 90000 }).catch(() => {});
await new Promise((r) => setTimeout(r, 3000));

for (const [name, tod] of TIMES) {
  await page.evaluate((tod) => {
    const g = window.__game;
    window.__FREE_CAMERA = true;
    g.time.time = tod;
    const c = { x: 256, z: -128 };
    const h = g.planet.heightAt(c.x, c.z - 34);
    g.camera.position.set(c.x, h + 2.0, c.z - 34);
    g.camera.lookAt(c.x + 2, g.planet.heightAt(c.x, c.z) + 1.6, c.z - 4);
  }, tod);
  await new Promise((r) => setTimeout(r, 1800));
  await page.screenshot({ path: `evidence/sky-${name}.png` });
  console.log(`captured sky-${name}.png`);
}
console.log('errors:', errors.length ? errors.join(' | ') : 'none');
await browser.close();
