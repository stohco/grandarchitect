// evidence/gym-character.cjs — capture the base body + the croquis overlay
const puppeteer = require('C:/Users/st3v3/AppData/Local/Temp/opencode/suzaku-frontier/node_modules/puppeteer');
const fs = require('fs');
const { PNG } = require('C:/Users/st3v3/AppData/Local/Temp/opencode/suzaku-frontier/node_modules/pngjs');

/** Draw the head-unit grid + landmark dots onto a screenshot. */
function overlay(path, landmarks, color = [255, 210, 120]) {
  const img = PNG.sync.read(fs.readFileSync(path));
  const W = img.width, H = img.height;
  const set = (x, y, c) => {
    if (x < 0 || y < 0 || x >= W || y >= H) return;
    const i = (y * W + x) * 4;
    img.data[i] = c[0]; img.data[i + 1] = c[1]; img.data[i + 2] = c[2];
  };
  // horizontal head-unit lines every 0.5 units
  for (let hu = 0; hu <= 8; hu += 0.5) {
    const y = Math.round((hu / 8) * (landmarks[0].y + 0) + (1 - hu / 8) * landmarks[landmarks.length - 1].y);
    for (let x = 300; x < 980; x++) { set(x, y, [60, 70, 90]); set(x, y + 1, [60, 70, 90]); }
  }
  for (const l of landmarks) {
    const y = Math.round(l.y);
    for (let x = 470; x < 810; x++) set(x, y, color);
    for (let dy = -3; dy <= 3; dy++) { set(640 - 5, y + dy, color); set(640 + 5, y + dy, color); set(640, y + dy, color); }
  }
  fs.writeFileSync(path.replace('.png', '-grid.png'), PNG.sync.write(img));
}

(async () => {
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-webgl', '--enable-unsafe-swiftshader'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 720 });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('http://localhost:5175/', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForFunction('window.__GYM_READY === true', { timeout: 90000 }).catch(() => {});
  await new Promise((r) => setTimeout(r, 3500));
  const names = ['front', 'back', 'left', 'right', 'three-quarter', 'face'];
  for (let i = 1; i <= 6; i++) {
    await page.evaluate((n) => window.__gym.setAngle(n), i);
    await new Promise((r) => setTimeout(r, 500));
    await (await page.$('canvas')).screenshot({ path: `evidence/gym-base-${names[i - 1]}.png` });
    const lms = await page.evaluate(() => window.__gym.landmarks);
    overlay(`evidence/gym-base-${names[i - 1]}.png`, lms);
    if (i === 1) {
      const prop = await page.evaluate(() => ({ heads: window.__gym.headUnits, marks: window.__gym.landmarks }));
      console.log('PROPORTION', JSON.stringify(prop));
    }
  }
  // walk state + robe on
  await page.evaluate(() => window.__gym.setWalk(true));
  await new Promise((r) => setTimeout(r, 1000));
  const s1 = await page.evaluate(() => window.__gym.walkState);
  await new Promise((r) => setTimeout(r, 900));
  const s2 = await page.evaluate(() => window.__gym.walkState);
  await page.evaluate(() => window.__gym.setWalk(false));
  await page.evaluate(() => window.__gym.setRobe(true));
  await new Promise((r) => setTimeout(r, 800));
  await page.evaluate(() => window.__gym.setAngle(1));
  await new Promise((r) => setTimeout(r, 500));
  await (await page.$('canvas')).screenshot({ path: 'evidence/gym-robed.png' });
  const zones = await page.evaluate(() => window.__gym.zones);
  console.log('ZONES', JSON.stringify(zones));
  console.log('WALK', JSON.stringify({ s1, s2, advances: s1 !== s2 }));
  console.log('errors:', errors.length ? errors.join(' | ') : 'none');
  await browser.close();
})().catch((e) => { console.error('FAIL', e.message); process.exit(1); });
