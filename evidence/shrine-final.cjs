// evidence/shrine-final.cjs — door-side noon + dusk frames of the shrine
const puppeteer = require('C:/Users/st3v3/AppData/Local/Temp/opencode/suzaku-frontier/node_modules/puppeteer');
(async () => {
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-webgl', '--enable-unsafe-swiftshader'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 720 });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('http://localhost:5174/', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForFunction('window.__GAME_READY === true', { timeout: 90000 }).catch(() => {});
  await new Promise((r) => setTimeout(r, 4000));
  // door side: the door faces +X (toward the plaza) — stand at -X looking +X
  await page.evaluate(() => {
    const g = window.__game;
    const s = g.editor.registry.components.get('family_shrine');
    g.time.time = 0.5;
    g.camera.position.set(s.root.position.x - 6.0, s.root.position.y + 1.9, s.root.position.z + 1.5);
    g.camera.lookAt(s.root.position.x, s.root.position.y + 1.5, s.root.position.z);
  });
  await new Promise((r) => setTimeout(r, 1000));
  await (await page.$('canvas')).screenshot({ path: 'evidence/shrine-door-noon.png' });
  await page.evaluate(() => { window.__game.time.time = 0.755; });
  await new Promise((r) => setTimeout(r, 1400));
  await (await page.$('canvas')).screenshot({ path: 'evidence/shrine-door-dusk.png' });
  console.log('errors:', errors.length ? errors.join(' | ') : 'none');
  await browser.close();
})().catch((e) => { console.error('FAIL', e.message); process.exit(1); });
