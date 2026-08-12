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
  const probe = await page.evaluate(() => {
    const g = window.__game;
    const ed = g.editor;
    const pine = ed.registry.components.get('sacred_pine');
    const report = ed.validator.validate();
    if (pine) {
      ed.flyTo(pine.root.position.x - 6, pine.root.position.y + 2.4, pine.root.position.z + 4,
        pine.root.position.x, pine.root.position.y + 2, pine.root.position.z);
    }
    return {
      pineLoaded: !!pine,
      pinePos: pine ? [pine.root.position.x.toFixed(1), pine.root.position.y.toFixed(1), pine.root.position.z.toFixed(1)] : null,
      pineMeshes: pine ? (() => { let n = 0; pine.root.traverse((o) => { if (o.isMesh) n++; }); return n; })() : 0,
      pineParams: pine ? pine.params.map((p) => p.id) : null,
      lawsPass: report.passed,
      violations: report.grounded.map((v) => v.diagnosis),
    };
  });
  console.log('PINE PROBE:', JSON.stringify(probe, null, 1));
  await new Promise((r) => setTimeout(r, 1200));
  const el = await page.$('canvas');
  await el.screenshot({ path: 'evidence/sacred-pine.png' });
  console.log('errors:', errors.length ? errors.join(' | ') : 'none');
  await browser.close();
})().catch((e) => { console.error('FAIL', e.message); process.exit(1); });
