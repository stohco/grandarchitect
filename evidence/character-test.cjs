// evidence/character-test.cjs — the villager model: on the player, on
// the NPCs with role tints, walking with the rig.
const puppeteer = require('C:/Users/st3v3/AppData/Local/Temp/opencode/suzaku-frontier/node_modules/puppeteer');
(async () => {
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-webgl', '--enable-unsafe-swiftshader'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 720 });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('http://localhost:5174/', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForFunction('window.__GAME_READY === true', { timeout: 90000 }).catch(() => {});
  await new Promise((r) => setTimeout(r, 5000));
  const probe = await page.evaluate(() => {
    const g = window.__game;
    const p = g.player;
    const meshes = [];
    p.body.traverse((o) => { if (o.isMesh) meshes.push((o.material && o.material.name) || o.type); });
    const rigState = p.rig ? p.rig.stateHash() : 'no-rig';
    const villagers = g.villagers.map((v) => {
      const mats = [];
      v.body.traverse((o) => { if (o.isMesh && o.material && o.material.isMeshStandardMaterial && o.material.name && o.material.name.startsWith('villager_robe')) mats.push(o.material.color.getHexString()); });
      return { id: v.id.slice(0, 18), mats };
    }).filter((v) => v.mats.length > 0);
    return { meshes, rigState, villagerCount: villagers.length, sample: villagers.slice(0, 3) };
  });
  console.log('PROBE', JSON.stringify(probe, null, 1));
  if (!probe.meshes.some((m) => m.startsWith('villager_'))) throw new Error('player not wearing the villager');
  await page.evaluate(() => {
    const g = window.__game;
    window.__FREE_CAMERA = true;
    g.time.time = 0.5;
  });
  const shoot = async (name, cx, cy, cz, tx, ty, tz) => {
    await page.evaluate((a) => {
      const g = window.__game;
      g.camera.position.set(a[0], a[1], a[2]);
      g.camera.lookAt(a[3], a[4], a[5]);
    }, [cx, cy, cz, tx, ty, tz]);
    await new Promise((r) => setTimeout(r, 700));
    await (await page.$('canvas')).screenshot({ path: `evidence/${name}.png` });
  };
  // walk the player so the rig animates
  await page.evaluate(() => {
    const g = window.__game;
    window.__FREE_CAMERA = false;
    const h = g.planet.heightAt(256, -110);
    g.player.controller.position.x = 256; g.player.controller.position.z = -110; g.player.controller.position.y = h + 1;
    g.player.controller.velocity.x = 0; g.player.controller.velocity.y = 0; g.player.controller.velocity.z = 0;
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyW' }));
  });
  await new Promise((r) => setTimeout(r, 1600));
  const walkState = await page.evaluate(() => ({ h1: window.__game.player.rig.stateHash(), pos: { ...window.__game.player.controller.position }, grounded: window.__game.player.controller.grounded }));
  await new Promise((r) => setTimeout(r, 1200));
  const walkState2 = await page.evaluate(() => ({ h2: window.__game.player.rig.stateHash() }));
  await page.evaluate(() => { window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyW' })); });
  console.log('WALK', JSON.stringify({ ...walkState, ...walkState2, advances: walkState.h1 !== walkState2.h2 }));
  await shoot('char-player', 250, 63, -115, 256, 59, -110);
  await shoot('char-village', 256, 62, -125, 256, 58.5, -128);
  console.log('errors:', errors.length ? errors.join(' | ') : 'none');
  await browser.close();
})().catch((e) => { console.error('FAIL', e.message); process.exit(1); });
