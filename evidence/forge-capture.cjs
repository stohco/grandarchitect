// evidence/forge-capture.cjs — capture the 5 canonical angles
const puppeteer = require('C:/Users/st3v3/AppData/Local/Temp/opencode/suzaku-frontier/node_modules/puppeteer');
(async () => {
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-webgl', '--enable-unsafe-swiftshader'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 720 });
  const errs = [];
  page.on('pageerror', (e) => errs.push(e.message.slice(0, 120)));
  await page.goto('http://localhost:5174/gym', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForFunction('window.__GYM_READY === true', { timeout: 120000 }).catch(() => {});
  await new Promise((r) => setTimeout(r, 5000));
  const angles = [['front', 1], ['back', 2], ['left', 3], ['right', 4], ['three', 5]];
  for (const [name, i] of angles) {
    await page.evaluate((x) => window.__gym.setAngle(x), i);
    await new Promise((r) => setTimeout(r, 450));
    const canvas = await page.$('canvas');
    if (canvas) await canvas.screenshot({ path: `evidence/forge-${name}.png` });
  }
  console.log('captured', angles.length, 'frames; errors:', errs.length ? errs.join(' | ') : 'none');
  await browser.close();
})().catch((e) => { console.error('FAIL', e.message); process.exit(1); });
