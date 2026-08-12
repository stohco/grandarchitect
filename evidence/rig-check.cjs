// evidence/rig-check.cjs — the lofted body's rig (arm pivots + head)
const puppeteer = require('C:/Users/st3v3/AppData/Local/Temp/opencode/suzaku-frontier/node_modules/puppeteer');
(async () => {
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-webgl', '--enable-unsafe-swiftshader'] });
  const page = await browser.newPage();
  await page.goto('http://localhost:5174/gym', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForFunction('window.__GYM_READY === true', { timeout: 90000 }).catch(() => {});
  await new Promise((r) => setTimeout(r, 4000));
  await page.evaluate(() => window.__gym.setWalk(true));
  await new Promise((r) => setTimeout(r, 800));
  const s1 = await page.evaluate(() => window.__gym.walkState);
  const arms = await page.evaluate(() => {
    const r = window.__gym.rig;
    return { hasRig: !!r, armL: !!r.armL, armR: !!r.armR, armLrot: r.armL ? +r.armL.rotation.x.toFixed(2) : 0, head: !!r.headPivot, headRot: r.headPivot ? +r.headPivot.rotation.x.toFixed(3) : 0 };
  });
  await new Promise((r) => setTimeout(r, 700));
  const s2 = await page.evaluate(() => window.__gym.walkState);
  const arms2 = await page.evaluate(() => {
    const r = window.__gym.rig;
    return { armLrot: +r.armL.rotation.x.toFixed(2), headRot: +r.headPivot.rotation.x.toFixed(3) };
  });
  console.log('RIG', JSON.stringify({ s1, s2, advances: s1 !== s2, arms, arms2 }));
  await browser.close();
})().catch((e) => { console.error('FAIL', e.message); process.exit(1); });
