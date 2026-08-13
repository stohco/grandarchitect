// evidence/welded-shot.cjs — capture the welded body
const puppeteer = require('C:/Users/st3v3/AppData/Local/Temp/opencode/suzaku-frontier/node_modules/puppeteer');
(async () => {
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-webgl', '--enable-unsafe-swiftshader'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 720 });
  const errs = [];
  page.on('pageerror', (e) => errs.push(e.message.slice(0, 150)));
  await page.goto('http://localhost:5174/gym', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForFunction('window.__GYM_READY === true', { timeout: 120000 }).catch(() => {});
  await new Promise((r) => setTimeout(r, 6000));
  await page.evaluate(() => window.__gym.setAngle(1));
  await new Promise((r) => setTimeout(r, 600));
  const canvas = await page.$('canvas');
  if (!canvas) throw new Error('no canvas');
  await canvas.screenshot({ path: 'evidence/welded-front.png' });
  console.log('shot ok; errors:', errs.length ? errs.join(' | ') : 'none');
  await browser.close();
})().catch((e) => { console.error('FAIL', e.message); process.exit(1); });
