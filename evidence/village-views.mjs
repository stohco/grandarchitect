// evidence/village-views.mjs — captures fixed verification views of the village
// for VLM inspection. Run from grandarchitect while game:dev serves :5174.
import puppeteer from 'file:///C:/Users/st3v3/AppData/Local/Temp/opencode/suzaku-frontier/node_modules/puppeteer/lib/puppeteer/puppeteer.js';

const VIEWS = {
  village_square: (g) => {
    const c = { x: 256, z: -128 };
    const h = g.planet.heightAt(c.x, c.z - 16);
    return { pos: [c.x, h + 1.8, c.z - 16], look: [c.x + 2, g.planet.heightAt(c.x, c.z) + 1.5, c.z - 3] };
  },
  house_close: (g) => {
    const h = g.village.houses.get('house_wang_ergou');
    const p = h.position;
    return { pos: [p.x + 8, p.y + 2.0, p.z + 1], look: [p.x - 1, p.y + 1.8, p.z] };
  },
  village_overview: (g) => {
    const c = { x: 256, z: -128 };
    return { pos: [c.x, g.planet.heightAt(c.x, c.z) + 30, c.z - 16], look: [c.x + 8, g.planet.heightAt(c.x, c.z), c.z + 8] };
  },
  stream_gate: (g) => {
    const c = { x: 256, z: -128 };
    return { pos: [c.x - 4, g.planet.heightAt(c.x - 4, c.z - 14) + 1.8, c.z - 14], look: [c.x + 2, g.planet.heightAt(c.x, c.z) + 1.5, c.z - 2] };
  },
};

const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-webgl', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 720 });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
await page.goto('http://localhost:5174/', { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForFunction('window.__GAME_READY === true', { timeout: 90000 }).catch(() => {});
await new Promise((r) => setTimeout(r, 3500));

for (const [name, fn] of Object.entries(VIEWS)) {
  await page.evaluate((fnStr) => {
    window.__FREE_CAMERA = true;
    const v = new Function('g', `return (${fnStr})(g)`)(window.__game);
    const g = window.__game;
    g.camera.position.set(v.pos[0], v.pos[1], v.pos[2]);
    g.camera.lookAt(v.look[0], v.look[1], v.look[2]);
  }, fn.toString());
  await new Promise((r) => setTimeout(r, 1500));
  await page.screenshot({ path: `evidence/village-${name}.png` });
  console.log(`captured village-${name}.png`);
}
console.log('errors:', errors.length ? errors.join(' | ') : 'none');
await browser.close();

