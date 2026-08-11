// evidence/game-boot-probe.mjs — boots the game page, checks gate + render.
// Run from grandarchitect: node evidence/game-boot-probe.mjs
import puppeteer from 'file:///C:/Users/st3v3/AppData/Local/Temp/opencode/suzaku-frontier/node_modules/puppeteer/lib/puppeteer/puppeteer.js';

const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-webgl', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 720 });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });

await page.goto('http://localhost:5174/', { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForFunction('window.__GAME_READY === true', { timeout: 90000 }).catch(() => {});
await new Promise((r) => setTimeout(r, 3000));

const probe = await page.evaluate(() => {
  const g = window.__game;
  if (!g) return { ready: false };
  return {
    ready: true,
    gateDisposition: g.gate.decision.disposition,
    repairPlan: g.gate.decision.repairPlan.length,
    constitutionCoverage: g.gate.constitution.coverage.toFixed(2),
    justifiedAbsences: g.gate.constitution.justifiedAbsences.length,
    triangles: g.terrain.mesh.triangleCount,
    vertices: g.terrain.mesh.vertexCount,
    playerPos: [g.player.controller.position.x.toFixed(2), g.player.controller.position.y.toFixed(2), g.player.controller.position.z.toFixed(2)],
    grounded: g.player.controller.grounded,
    canvas: !!g.renderer.domElement,
  };
});
console.log('PROBE:', JSON.stringify(probe, null, 1));
await page.screenshot({ path: 'evidence/game-boot.png' });
console.log('errors:', errors.length ? errors.join(' | ') : 'none');
await browser.close();
process.exit(probe && probe.ready && errors.length === 0 ? 0 : 1);
