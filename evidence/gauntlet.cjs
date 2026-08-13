// evidence/gauntlet.cjs — the A/B blind critic gauntlet.
//
// For every canonical angle: render OUR character in the gym, crop it to
// its silhouette, and compose an A/B plate against the reference crop
// from the poster — sides randomly swapped per round so the critic is
// BLIND to which figure is ours. A scoring card asks the critic to rate
// BOTH figures on the reference's dimensions and list the top deltas for
// each. The deltas come back to the builder; the loop repeats.
//
// Usage: node evidence/gauntlet.cjs <round>
const puppeteer = require('C:/Users/st3v3/AppData/Local/Temp/opencode/suzaku-frontier/node_modules/puppeteer');
const fs = require('fs');
const { PNG } = require('C:/Users/st3v3/AppData/Local/Temp/opencode/suzaku-frontier/node_modules/pngjs');

const round = process.argv[2] || '1';
const outDir = `evidence/gauntlet/round-${round}`;
fs.mkdirSync(outDir, { recursive: true });

// angle name → [gym preset, reference crop]
const ANGLES = [
  ['front', 1, 'evidence/refs/character-reference.png'],
  ['left', 3, 'evidence/refs/ref-robed-side.png'],
  ['back', 2, 'evidence/refs/ref-robed-back.png'],
];

/** Crop a frame to a FIXED window (the subject detector drops dark parts —
 * the legs and briefs against the dark studio floor). The presets frame
 * the character predictably, so the window is stable per angle. */
function cropToSubject(frame, bgTol = 30) {
  const img = PNG.sync.read(fs.readFileSync(frame));
  // fixed window: the character fills the frame's middle third at every
  // canonical preset
  const x0 = Math.round(img.width * 0.37), x1 = Math.round(img.width * 0.63);
  const y0 = Math.round(img.height * 0.06), y1 = Math.round(img.height * 0.94);
  const w = x1 - x0, h = y1 - y0;
  const out = new PNG({ width: w, height: h });
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const si = ((y0 + y) * img.width + (x0 + x)) * 4;
      const di = (y * w + x) * 4;
      out.data[di] = img.data[si];
      out.data[di + 1] = img.data[si + 1];
      out.data[di + 2] = img.data[si + 2];
      out.data[di + 3] = img.data[si + 3];
    }
  }
  return { img: out, x0, y0, x1, y1 };
}

/** Silhouette metrics: subject mask + width profile (head/shoulder/waist/
 * hip/knee/ankle) — the QUANTITATIVE fidelity record. The critic only
 * verifies these numbers, per docs/VISUAL_QA.md. */
/** The reference's MEASURED anatomy (evidence/measure-reference.cjs +
 * the vision intake): the figures are sampled at THESE rows (fractions
 * from the BOTTOM) so the comparison is apples-to-apples. */
const LANDMARK_FRACTIONS = [
  ['head_max', 0.94], ['eye', 0.85], ['chin', 0.75], ['shoulder', 0.7],
  ['chest', 0.62], ['waist', 0.52], ['hip', 0.45], ['crotch', 0.42],
  ['knee', 0.23], ['ankle', 0.05],
];

function silhouette(src, tol = 60) {
  const img = PNG.sync.read(fs.readFileSync(src));
  const isBody = (x, y) => {
    const i = (y * img.width + x) * 4;
    const r = img.data[i], g = img.data[i + 1], b = img.data[i + 2];
    // body-ish: warm skin OR dark hair/cloth — exclude the pale poster
    // panel (cream 256,256,224), the gym's near-black studio floor, and
    // the COOL rim-lit disc edge (blue-grey, not warm body)
    return (r + g + b > 100 && r + g + b < 660) && !(r > 230 && g > 230 && b > 200)
      && !(r < 45 && g < 50 && b < 55) && !(b > r + 6 && b >= g);
  };
  let top = img.height, bottom = 0, left = img.width, right = 0;
  for (let y = 0; y < img.height; y += 1) {
    for (let x = 0; x < img.width; x += 1) {
      if (isBody(x, y)) {
        if (y < top) top = y;
        if (y > bottom) bottom = y;
        if (x < left) left = x;
        if (x > right) right = x;
      }
    }
  }
  if (bottom <= top) return { top: 0, bottom: img.height, height: img.height, widths: new Array(LANDMARK_FRACTIONS.length).fill(0) };
  const height = bottom - top;
  const widths = new Array(LANDMARK_FRACTIONS.length).fill(0);
  for (let k = 0; k < LANDMARK_FRACTIONS.length; k++) {
    // sample a 3-row band around the landmark row for stability
    const yF = LANDMARK_FRACTIONS[k][1];
    let min = Infinity, max = -1;
    for (let dy = -1; dy <= 1; dy++) {
      const y = top + Math.round((1 - yF) * height) + dy;
      for (let x = left; x <= right; x++) {
        if (isBody(x, y)) { min = Math.min(min, x); max = Math.max(max, x); }
      }
    }
    widths[k] = max >= min ? max - min : 0;
  }
  return { top, bottom, height, widths };
}

function profileDiff(a, b) {
  const norm = (w) => w.map((v) => v / (w.reduce((m, x) => Math.max(m, x), 1) || 1));
  const na = norm(a.widths), nb = norm(b.widths);
  let d = 0, n = 0;
  for (let k = 0; k < 10; k++) {
    if (na[k] === 0 || nb[k] === 0) continue; // the zero bands (hair/dark) don't count
    d += Math.abs(na[k] - nb[k]);
    n++;
  }
  return { meanWidthDelta: n ? +(d / n).toFixed(3) : NaN, profileA: na.map((v) => +v.toFixed(2)), profileB: nb.map((v) => +v.toFixed(2)) };
}

/** Compose the A/B plate: two figures side by side, scaled to the same height. */
function compose(outPath, ours, ref, swap) {
  const scale = (img, targetH) => {
    const w = Math.max(1, Math.round(img.width * targetH / img.height));
    const out = new PNG({ width: w, height: targetH });
    for (let y = 0; y < targetH; y++) {
      for (let x = 0; x < w; x++) {
        const sx = Math.min(img.width - 1, Math.round(x * img.width / w));
        const sy = Math.min(img.height - 1, Math.round(y * img.height / targetH));
        const si = (sy * img.width + sx) * 4;
        const di = (y * w + x) * 4;
        out.data[di] = img.data[si];
        out.data[di + 1] = img.data[si + 1];
        out.data[di + 2] = img.data[si + 2];
        out.data[di + 3] = img.data[si + 3];
      }
    }
    return out;
  };
  const H = 620;
  const left = swap ? ref : ours;
  const right = swap ? ours : ref;
  const L = scale(left, H);
  const R = scale(right, H);
  const gap = 24;
  const W = L.width + R.width + gap;
  const out = new PNG({ width: W, height: H });
  out.data.fill(26);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < L.width; x++) {
      const si = (y * L.width + x) * 4;
      const di = (y * W + x) * 4;
      out.data[di] = L.data[si];
      out.data[di + 1] = L.data[si + 1];
      out.data[di + 2] = L.data[si + 2];
      out.data[di + 3] = L.data[si + 3];
    }
  }
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < R.width; x++) {
      const si = (y * R.width + x) * 4;
      const di = (y * W + (L.width + gap + x)) * 4;
      out.data[di] = R.data[si];
      out.data[di + 1] = R.data[si + 1];
      out.data[di + 2] = R.data[si + 2];
      out.data[di + 3] = R.data[si + 3];
    }
  }
  fs.writeFileSync(outPath, PNG.sync.write(out));
  return { leftIsOurs: !swap };
}

(async () => {
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-webgl', '--enable-unsafe-swiftshader'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 720 });
  await page.goto('http://localhost:5174/gym', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForFunction('window.__GYM_READY === true', { timeout: 90000 }).catch(() => {});
  await new Promise((r) => setTimeout(r, 4000));

  const cards = [];
  for (const [name, preset, refPath] of ANGLES) {
    await page.evaluate((n) => window.__gym.setAngle(n), preset);
    await new Promise((r) => setTimeout(r, 500));
    const frame = `${outDir}/ours-${name}.png`;
    await (await page.$('canvas')).screenshot({ path: frame });
    const ours = cropToSubject(frame).img;
    const ref = PNG.sync.read(fs.readFileSync(refPath));
    // the QUANTITATIVE record: width-profile delta between the two figures
    const oursSil = silhouette(frame);
    const refSil = silhouette(refPath);
    const prof = profileDiff(oursSil, refSil);
    const swap = (cards.length % 2) === 1; // alternate blindness
    const side = compose(`${outDir}/plate-${name}.png`, ours, ref, swap);
    cards.push({
      angle: name,
      plate: `plate-${name}.png`,
      ourSide: side.leftIsOurs ? 'LEFT' : 'RIGHT',
      reference: refPath,
      profile: prof,
    });
  }
  await browser.close();

  const card = `# BLIND CRITIC CARD — round ${round}

You are shown A/B plates (two figures per plate, LEFT and RIGHT). You do
NOT know which figure is the render and which is the painting. Judge BOTH
figures against the reference dimensions below, then list the deltas.

For each plate, per figure (LEFT then RIGHT), rate 1-5:
  1. Proportions (~7.5-8 heads tall)
  2. Silhouette clarity (iconic, readable shape)
  3. Torso: visible lean chest + abdomen definition
  4. Limb taper (shoulder→wrist, hip→ankle)
  5. Posture naturalness (relaxed, arms at sides)
  6. Face: stylized, sharp, youthful
  7. Hair: long, black, tied back
  8. Underwear: matte black, form-fitting boxer shorts
  9. Skin tone: fair
 10. Painterly fidelity to the reference style
Then: top 3 CONCRETE deltas to bring EACH figure to the reference
(shape/size/color/position — be specific enough to act on).

Plates:
${cards.map((c) => `- ${c.plate} (angle ${c.angle})`).join('\n')}

QUANTITATIVE RECORD (measured width profiles, normalized, 12 bands
head→feet; the mean band delta between the two figures):
${cards.map((c) => `- ${c.angle}: meanWidthDelta ${c.profile.meanWidthDelta}; profile A ${JSON.stringify(c.profile.profileA)}; profile B ${JSON.stringify(c.profile.profileB)}`).join('\n')}

Verify against the plates: which figure has a NARROWER waist band relative to its shoulders? Which has a longer leg section (knee band lower)? Do NOT rely on memory of earlier rounds — judge only these plates.
`;
  fs.writeFileSync(`${outDir}/card.md`, card);
  fs.writeFileSync(`${outDir}/key.json`, JSON.stringify({ ourSides: cards.map((c) => [c.angle, c.ourSide]) }));
  console.log(JSON.stringify({ outDir, plates: cards.map((c) => c.plate) }, null, 1));
})().catch((e) => { console.error('FAIL', e.message); process.exit(1); });
