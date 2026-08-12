// evidence/shrine-test.cjs — the family shrine in the LIVE scene:
// probe (registered, kind shrine, law-clean), two frames 1.5 s apart
// (the incense ribbon must move), a dusk frame (lantern glow boosted).
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
  await new Promise((r) => setTimeout(r, 4000));
  const probe = await page.evaluate(() => {
    const g = window.__game;
    const comp = g.editor.registry.components.get('family_shrine');
    if (!comp) return null;
    const root = comp.root;
    let meshes = 0; const names = [];
    root.traverse((o) => { if (o.isMesh) { meshes++; names.push(o.name || o.type); } });
    return { meshes, names, kind: comp.type, label: comp.label, pos: [root.position.x, root.position.y, root.position.z], ry: root.rotation.y, height: (root.position.y - g.planet.heightAt(root.position.x, root.position.z)).toFixed(3) };
  });
  console.log('PROBE', JSON.stringify(probe));
  if (!probe) throw new Error('shrine not registered');
  const frame = async (name) => {
    await page.evaluate(() => {
      const g = window.__game;
      const s = g.editor.registry.components.get('family_shrine');
      g.time.time = 0.5;
      g.camera.position.set(s.root.position.x - 6.5, s.root.position.y + 1.8, s.root.position.z - 3.2);
      g.camera.lookAt(s.root.position.x, s.root.position.y + 1.4, s.root.position.z);
    });
    await new Promise((r) => setTimeout(r, 900));
    await (await page.$('canvas')).screenshot({ path: `evidence/${name}.png` });
  };
  await frame('shrine-a');
  const smokeA = await page.evaluate(() => {
    const g = window.__game;
    const s = g.editor.registry.components.get('family_shrine');
    const r = s.root.getObjectByName('shrine_smoke');
    return r ? { y: +r.position.y.toFixed(3), sy: +r.scale.y.toFixed(3), op: +r.material.opacity.toFixed(3) } : null;
  });
  await new Promise((r) => setTimeout(r, 1500));
  await frame('shrine-b');
  const smokeB = await page.evaluate(() => {
    const g = window.__game;
    const s = g.editor.registry.components.get('family_shrine');
    const r = s.root.getObjectByName('shrine_smoke');
    return r ? { y: +r.position.y.toFixed(3), sy: +r.scale.y.toFixed(3), op: +r.material.opacity.toFixed(3) } : null;
  });
  await page.evaluate(() => { window.__game.time.time = 0.755; });
  await new Promise((r) => setTimeout(r, 1200));
  await (await page.$('canvas')).screenshot({ path: 'evidence/shrine-dusk.png' });
  const lanternGlow = await page.evaluate(() => {
    const g = window.__game;
    const s = g.editor.registry.components.get('family_shrine');
    let glow = -1;
    s.root.traverse((o) => {
      if (o.isMesh && o.material && o.material.emissiveIntensity !== undefined) glow = Math.max(glow, o.material.emissiveIntensity);
    });
    return glow;
  });
  console.log('smokeA', JSON.stringify(smokeA), 'smokeB', JSON.stringify(smokeB));
  console.log('smoke moves:', JSON.stringify(smokeA) !== JSON.stringify(smokeB));
  console.log('lantern glow at dusk:', lanternGlow.toFixed(3));
  console.log('errors:', errors.length ? errors.join(' | ') : 'none');
  await browser.close();
})().catch((e) => { console.error('FAIL', e.message); process.exit(1); });
