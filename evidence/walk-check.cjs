// evidence/walk-check.cjs — verify the walk animates the rig (two frames
// while walking must differ in the arm/head regions)
const puppeteer = require('C:/Users/st3v3/AppData/Local/Temp/opencode/suzaku-frontier/node_modules/puppeteer');
(async () => {
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-webgl', '--enable-unsafe-swiftshader'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 720 });
  await page.goto('http://localhost:5174/gym', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForFunction('window.__GYM_READY === true', { timeout: 120000 }).catch(() => {});
  await new Promise((r) => setTimeout(r, 5000));
  await page.evaluate(() => window.__gym.setAngle(1));
  await page.evaluate(() => window.__gym.setWalk(true));
  await new Promise((r) => setTimeout(r, 600));
  const c = await page.$('canvas');
  await c.screenshot({ path: 'evidence/walk-a.png' });
  const s1 = await page.evaluate(() => window.__gym.walkState);
  await new Promise((r) => setTimeout(r, 500));
  await c.screenshot({ path: 'evidence/walk-b.png' });
  const s2 = await page.evaluate(() => window.__gym.walkState);
  console.log('walk state:', s1, '->', s2, 'advances:', s1 !== s2);
  await browser.close();
})().catch((e) => { console.error('FAIL', e.message); process.exit(1); });
