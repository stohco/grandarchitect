// evidence/rig-debug.cjs — why is the rig null?
const puppeteer = require('C:/Users/st3v3/AppData/Local/Temp/opencode/suzaku-frontier/node_modules/puppeteer');
(async () => {
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-webgl', '--enable-unsafe-swiftshader'] });
  const page = await browser.newPage();
  const errs = [];
  page.on('pageerror', (e) => errs.push('PAGEERR: ' + e.message.slice(0, 200)));
  page.on('console', (m) => { if (m.type() === 'error') errs.push('CONSOLE: ' + m.text().slice(0, 200)); });
  await page.goto('http://localhost:5174/gym', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForFunction('window.__GYM_READY === true', { timeout: 90000 }).catch(() => {});
  await new Promise((r) => setTimeout(r, 5000));
  const state = await page.evaluate(() => ({
    rig: !!window.__gym.rig,
    zones: window.__gym.zones.length,
    charChildren: (() => {
      const c = [];
      window.__gym.character.traverse((o) => c.push(o.name || o.type));
      return c.slice(0, 12);
    })(),
  }));
  console.log('STATE', JSON.stringify(state));
  console.log('ERRS', JSON.stringify(errs.slice(0, 4)));
  await browser.close();
})().catch((e) => { console.error('FAIL', e.message); process.exit(1); });
