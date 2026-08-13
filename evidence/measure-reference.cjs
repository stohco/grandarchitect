// evidence/measure-reference.cjs — pixel-measure the canonical reference
const fs = require('fs');
const { PNG } = require('C:/Users/st3v3/AppData/Local/Temp/opencode/suzaku-frontier/node_modules/pngjs');

const img = PNG.sync.read(fs.readFileSync('evidence/refs/character-reference.png'));
const W = img.width, H = img.height;

// the poster's cream background (256,256,224) — the figure is everything else
const isFig = (x, y) => {
  const i = (y * W + x) * 4;
  const r = img.data[i], g = img.data[i + 1], b = img.data[i + 2];
  return !(r > 232 && g > 230 && b > 200);
};

// figure bbox
let top = H, bottom = 0;
for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    if (isFig(x, y)) { if (y < top) top = y; if (y > bottom) bottom = y; }
  }
}
const figH = bottom - top;
console.log('figure rows:', top, '->', bottom, 'height px:', figH);

// the vision agent's landmark fractions from the TOP
const landmarks = [
  ['hairline', 0.10], ['eye', 0.15], ['chin', 0.25], ['shoulder', 0.30],
  ['chest', 0.38], ['waist', 0.48], ['hip', 0.55], ['crotch', 0.58],
  ['knee', 0.77], ['ankle', 0.95],
];
// ALSO scan every 2% row to catch the real widest/narrowest bands
const profile = [];
for (let k = 0; k <= 50; k++) {
  const frac = k / 50;
  const y = Math.round(top + frac * figH);
  let min = W, max = -1;
  for (let x = 0; x < W; x++) if (isFig(x, y)) { min = Math.min(min, x); max = Math.max(max, x); }
  profile.push({ frac: +(frac).toFixed(2), width: max >= min ? (max - min) / figH : 0 });
}
const widthAt = (frac) => {
  let best = profile[0];
  for (const p of profile) if (Math.abs(p.frac - frac) < Math.abs(best.frac - frac)) best = p;
  return best.width;
};
for (const [name, frac] of landmarks) {
  console.log(name.padEnd(9), 'frac', frac.toFixed(2), '-> width', widthAt(frac).toFixed(3), 'of height');
}
// the true widest/narrowest bands
let wMax = profile.reduce((a, b) => (b.width > a.width ? b : a));
let wMin = profile.reduce((a, b) => (b.width < a.width && b.frac > 0.3 && b.frac < 0.62 && b.width > 0 ? b : a));
console.log('widest band:', wMax.frac, wMax.width.toFixed(3), '| narrowest (torso):', wMin.frac, wMin.width.toFixed(3));

// skin pixels: the tan clusters
const skin = [];
for (let y = top + Math.round(0.34 * figH); y < top + Math.round(0.6 * figH); y += 2) {
  for (let x = 0; x < W; x += 2) {
    if (!isFig(x, y)) continue;
    const i = (y * W + x) * 4;
    const r = img.data[i], g = img.data[i + 1], b = img.data[i + 2];
    if (r > 150 && r < 250 && g > 110 && g < 210 && b > 80 && b < 180 && r > g && g > b) skin.push([r, g, b]);
  }
}
const med = (arr, k) => arr.map((c) => c[k]).sort((a, b) => a - b)[Math.floor(arr.length / 2)];
console.log('skin samples:', skin.length, 'median rgb:', med(skin, 0), med(skin, 1), med(skin, 2));
// hair (darkest figure pixels)
const dark = [];
for (let y = top; y < top + Math.round(0.3 * figH); y += 2) {
  for (let x = 0; x < W; x += 2) {
    if (!isFig(x, y)) continue;
    const i = (y * W + x) * 4;
    const r = img.data[i], g = img.data[i + 1], b = img.data[i + 2];
    if (r < 90 && g < 80 && b < 80) dark.push([r, g, b]);
  }
}
console.log('hair samples:', dark.length, 'median rgb:', dark.length ? [med(dark, 0), med(dark, 1), med(dark, 2)] : 'n/a');
