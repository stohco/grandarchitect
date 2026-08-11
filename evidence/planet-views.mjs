// evidence/planet-views.mjs — captures fixed verification views of the planet
// for VLM inspection. Run from grandarchitect while game:dev serves :5174.
import puppeteer from 'file:///C:/Users/st3v3/AppData/Local/Temp/opencode/suzaku-frontier/node_modules/puppeteer/lib/puppeteer/puppeteer.js';

const VIEWS = {
  village_ground: (e) => {
    const p = e.__game.player.controller.position;
    return { pos: [p.x - 4, p.y + 1.9, p.z - 4], look: [p.x + 3, p.y + 1.4, p.z + 3] };
  },
  valley_overview: (e) => {
    const p = e.__game.player.controller.position;
    return { pos: [p.x, p.y + 26, p.z - 14], look: [p.x + 10, p.y, p.z + 10] };
  },
  stream_bank: (e) => {
    return { pos: [271, 59 + 1.8, -96], look: [276, 50.5, -104] };
  },
  horizon: (e) => {
    const p = e.__game.player.controller.position;
    return { pos: [p.x, p.y + 2, p.z - 2], look: [p.x + 200, p.y + 8, p.z - 60] };
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
  await page.evaluate((fnStr) => { window.__FREE_CAMERA = true;
    const e = window;
    const fn = new Function('e', `return (${fnStr})(e)`);
    const v = fn(e);
    const g = e.__game;
    g.camera.position.set(v.pos[0], v.pos[1], v.pos[2]);
    g.camera.lookAt(v.look[0], v.look[1], v.look[2]);
  }, fn.toString());
  await new Promise((r) => setTimeout(r, 1500));
  await page.screenshot({ path: `evidence/planet-${name}.png` });
  console.log(`captured planet-${name}.png`);
}
console.log('errors:', errors.length ? errors.join(' | ') : 'none');
await browser.close();

