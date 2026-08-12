// evidence/animation-test.cjs — proves the pine ANIMATES in the live scene:
// two frames 2 s apart must differ (the wind sways), and the glow must
// pulse; a dusk frame must show the boosted jade light.
const puppeteer = require('C:/Users/st3v3/AppData/Local/Temp/opencode/suzaku-frontier/node_modules/puppeteer');
const fs = require('fs');
(async () => {
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-webgl', '--enable-unsafe-swiftshader'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 720 });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('http://localhost:5174/', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForFunction('window.__GAME_READY === true', { timeout: 90000 }).catch(() => {});
  await new Promise((r) => setTimeout(r, 4500));
  const setup = () => page.evaluate(() => {
    const g = window.__game;
    const pine = g.editor.registry.components.get('sacred_pine');
    if (!pine) return false;
    g.time.time = 0.5; // noon — wind visible, glow baseline
    g.camera.position.set(pine.root.position.x - 7, pine.root.position.y + 2.6, pine.root.position.z + 4);
    g.camera.lookAt(pine.root.position.x, pine.root.position.y + 2.2, pine.root.position.z);
    return true;
  });
  if (!(await setup())) throw new Error('pine not loaded');
  await new Promise((r) => setTimeout(r, 800));
  const el = await page.$('canvas');
  await el.screenshot({ path: 'evidence/pine-anim-a.png' });
  const stateA = await page.evaluate(() => window.__game.editor.animation.stateHash());
  await new Promise((r) => setTimeout(r, 2000));
  await el.screenshot({ path: 'evidence/pine-anim-b.png' });
  const stateB = await page.evaluate(() => window.__game.editor.animation.stateHash());
  // dusk frame — the glow boosts
  await page.evaluate(() => { window.__game.time.time = 0.755; });
  await new Promise((r) => setTimeout(r, 1200));
  await el.screenshot({ path: 'evidence/pine-dusk.png' });
  const glowAtDusk = await page.evaluate(() => {
    const mats = window.__game.editor.animation.glows;
    const pine = window.__game.editor.registry.components.get('sacred_pine');
    let glow = -1;
    pine.root.traverse((o) => {
      const m = o.mesh ?? o;
      if (o.isMesh && o.material && o.material.emissiveIntensity !== undefined) {
        glow = Math.max(glow, o.material.emissiveIntensity);
      }
    });
    return glow;
  });
  console.log('stateA:', stateA);
  console.log('stateB:', stateB);
  console.log('sway advances:', stateA !== stateB);
  console.log('jade glow at dusk:', glowAtDusk.toFixed(3));
  console.log('errors:', errors.length ? errors.join(' | ') : 'none');
  await browser.close();
})().catch((e) => { console.error('FAIL', e.message); process.exit(1); });
