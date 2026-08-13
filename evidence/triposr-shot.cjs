// evidence/triposr-shot.cjs — frame the TripoSR figure in the gym
const puppeteer = require('C:/Users/st3v3/AppData/Local/Temp/opencode/suzaku-frontier/node_modules/puppeteer');
(async () => {
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-webgl', '--enable-unsafe-swiftshader'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 720 });
  const errs = [];
  page.on('pageerror', (e) => errs.push(e.message.slice(0, 120)));
  await page.goto('http://localhost:5174/gym', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForFunction('window.__GYM_READY === true', { timeout: 90000 }).catch(() => {});
  await new Promise((r) => setTimeout(r, 5000));
  await page.evaluate(() => window.__gym.setAngle(7));
  await new Promise((r) => setTimeout(r, 800));
  const canvas = await page.$('canvas');
  if (!canvas) throw new Error('no canvas');
  await canvas.screenshot({ path: 'evidence/triposr-gym.png' });
  console.log('SHOT ok; errors:', errs.length ? errs.join(' | ') : 'none');
  await browser.close();
})().catch((e) => { console.error('FAIL', e.message); process.exit(1); });
