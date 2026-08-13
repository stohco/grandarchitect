// evidence/pass4-check.cjs — verify the winding/double-side fix
const puppeteer = require('C:/Users/st3v3/AppData/Local/Temp/opencode/suzaku-frontier/node_modules/puppeteer');
(async () => {
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-webgl', '--enable-unsafe-swiftshader'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 720 });
  const errs = [];
  page.on('pageerror', (e) => errs.push(e.message.slice(0, 120)));
  await page.goto('http://localhost:5174/gym', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForFunction('window.__GYM_READY === true', { timeout: 90000 }).catch(() => {});
  await new Promise((r) => setTimeout(r, 4500));
  await page.evaluate(() => window.__gym.setAngle(1));
  await new Promise((r) => setTimeout(r, 600));
  const canvas = await page.$('canvas');
  if (!canvas) throw new Error('no canvas');
  await canvas.screenshot({ path: 'evidence/pass4-front.png' });
  const info = await page.evaluate(() => {
    let d = 0, t = 0;
    window.__gym.character.traverse((o) => {
      if (o.isMesh) { t++; if (o.material && o.material.side === 2) d++; }
    });
    return { heads: window.__gym.headUnits.toFixed(2), doubleSide: d + '/' + t };
  });
  console.log('PASS4', JSON.stringify(info));
  console.log('errors:', errs.length ? errs.join(' | ') : 'none');
  await browser.close();
})().catch((e) => { console.error('FAIL', e.message); process.exit(1); });
