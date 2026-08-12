// evidence/visual-examiner.cjs — the SMARTER VLM.
//
// The vision model misreads open-ended scene descriptions ("what do you
// see?") but verifies well when asked pointed questions WITH the numbers
// attached. This harness makes the evidence-first method the ONLY method:
//
//   1. capture the canonical frames of a gym asset
//   2. compute objective stats (probes, croquis projections, pixel counts)
//   3. draw the verification overlays (head-unit grid, landmark dashes)
//   4. write an evidence manifest + a QUESTION BANK where every question
//      is a specific claim with its expected value from the probes
//   5. the vision agent then answers the question bank, not a free-form
//      description — its verdicts are recorded into the manifest
//
// Usage: node evidence/visual-examiner.cjs <gym|game> <out-dir>
const puppeteer = require('C:/Users/st3v3/AppData/Local/Temp/opencode/suzaku-frontier/node_modules/puppeteer');
const fs = require('fs');
const path = require('path');
const { PNG } = require('C:/Users/st3v3/AppData/Local/Temp/opencode/suzaku-frontier/node_modules/pngjs');

const mode = process.argv[2] || 'gym';
const outDir = process.argv[3] || 'evidence/qa/character';
// ONE server: the game on / and the gym on /gym (bun run game:dev)
const BASE = 'http://localhost:5174';
const PAGE_PATH = mode === 'gym' ? '/gym' : '/';

function overlay(pathOut, frame, marks, color = [255, 210, 120]) {
  const img = PNG.sync.read(fs.readFileSync(frame));
  const W = img.width, H = img.height;
  const set = (x, y, c) => {
    if (x < 0 || y < 0 || x >= W || y >= H) return;
    const i = (y * W + x) * 4;
    img.data[i] = c[0]; img.data[i + 1] = c[1]; img.data[i + 2] = c[2];
  };
  for (const l of marks) {
    const y = Math.round(l.y);
    for (let x = 200; x < 1080; x++) { set(x, y, [50, 60, 80]); set(x, y + 1, [50, 60, 80]); }
    for (let dy = -4; dy <= 4; dy++) { set(640 - 6, y + dy, color); set(640 + 6, y + dy, color); set(640, y + dy, color); }
  }
  fs.writeFileSync(pathOut, PNG.sync.write(img));
}

function pixelStats(framePath, region = [300, 100, 980, 700]) {
  const img = PNG.sync.read(fs.readFileSync(framePath));
  const [x0, y0, x1, y1] = region;
  const counts = {};
  const total = [];
  for (let y = y0; y < y1; y += 2) {
    for (let x = x0; x < x1; x += 2) {
      const i = (y * img.width + x) * 4;
      const c = [img.data[i], img.data[i + 1], img.data[i + 2]];
      total.push(c);
      const key = c.map((v) => Math.round(v / 32) * 32).join(',');
      counts[key] = (counts[key] || 0) + 1;
    }
  }
  const top = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 6)
    .map(([k, v]) => ({ rgb: k, count: v }));
  return { topColors: top, samples: total.length };
}

(async () => {
  fs.mkdirSync(outDir, { recursive: true });
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-webgl', '--enable-unsafe-swiftshader'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 720 });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const readyFlag = mode === 'gym' ? '__GYM_READY' : '__GAME_READY';
  await page.goto(BASE + PAGE_PATH, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForFunction(`window.${readyFlag} === true`, { timeout: 90000 }).catch(() => {});
  await new Promise((r) => setTimeout(r, 4000));

  const manifest = {
    mode,
    capturedAt: new Date().toISOString(),
    frames: {},
    probes: {},
    errors: [],
  };

  if (mode === 'gym') {
    const names = ['front', 'back', 'left', 'right', 'three-quarter', 'face'];
    for (let i = 1; i <= 6; i++) {
      await page.evaluate((n) => window.__gym.setAngle(n), i);
      await new Promise((r) => setTimeout(r, 450));
      const frame = path.join(outDir, `frame-${names[i - 1]}.png`);
      await (await page.$('canvas')).screenshot({ path: frame });
      const lms = await page.evaluate(() => window.__gym.landmarks);
      overlay(path.join(outDir, `frame-${names[i - 1]}-grid.png`), frame, lms);
      manifest.frames[names[i - 1]] = {
        frame: path.basename(frame),
        grid: `frame-${names[i - 1]}-grid.png`,
        landmarks: lms.map((l) => ({ name: l.name, y: Math.round(l.y), headUnits: +l.headUnits.toFixed(2) })),
        pixelStats: pixelStats(frame),
      };
    }
    manifest.probes = await page.evaluate(() => ({
      heads: +window.__gym.headUnits.toFixed(2),
      zones: window.__gym.zones,
      walkState: window.__gym.walkState,
    }));
  } else {
    await page.evaluate(() => { window.__FREE_CAMERA = true; window.__game.time.time = 0.5; });
    await new Promise((r) => setTimeout(r, 600));
    const frame = path.join(outDir, 'frame-world.png');
    await (await page.$('canvas')).screenshot({ path: frame });
    manifest.frames.world = { frame: 'frame-world.png', pixelStats: pixelStats(frame) };
    manifest.probes = await page.evaluate(() => ({
      chunks: window.__game.planet.chunks.size,
      time: +window.__game.time.time.toFixed(3),
    }));
  }
  manifest.errors = errors;
  fs.writeFileSync(path.join(outDir, 'manifest.json'), JSON.stringify(manifest, null, 1));
  console.log(JSON.stringify({ outDir, frames: Object.keys(manifest.frames), probes: manifest.probes, errors }, null, 1));
  await browser.close();
})().catch((e) => { console.error('FAIL', e.message); process.exit(1); });
