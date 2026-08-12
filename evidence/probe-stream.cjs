const puppeteer = require('C:/Users/st3v3/AppData/Local/Temp/opencode/suzaku-frontier/node_modules/puppeteer');
(async () => {
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-webgl', '--enable-unsafe-swiftshader'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 720 });
  await page.goto('http://localhost:5174/', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForFunction('window.__GAME_READY === true', { timeout: 90000 }).catch(() => {});
  await new Promise((r) => setTimeout(r, 3000));
  await page.evaluate(() => {
    const g = window.__game;
    window.__FREE_CAMERA = true;
    g.time.time = 0.26; // dawn — the game start
    g.camera.position.set(272, 57.8, -84);
    g.camera.lookAt(277, 50.3, -104);
  });
  await new Promise((r) => setTimeout(r, 1500));
  const el = await page.$('canvas');
  await el.screenshot({ path: 'evidence/stream-dawn.png' });
  await browser.close();
})().catch((e) => { console.error('FAIL', e.message); process.exit(1); });
