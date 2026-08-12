// evidence/crop-refs.cjs — crop the reference character panels from the posters
const fs = require('fs');
const { PNG } = require('C:/Users/st3v3/AppData/Local/Temp/opencode/suzaku-frontier/node_modules/pngjs');

function crop(src, out, box) {
  const img = PNG.sync.read(fs.readFileSync(src));
  const [x0, y0, x1, y1] = box;
  const w = x1 - x0, h = y1 - y0;
  const outImg = new PNG({ width: w, height: h });
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const si = ((y0 + y) * img.width + (x0 + x)) * 4;
      const di = (y * w + x) * 4;
      outImg.data[di] = img.data[si];
      outImg.data[di + 1] = img.data[si + 1];
      outImg.data[di + 2] = img.data[si + 2];
      outImg.data[di + 3] = img.data[si + 3];
    }
  }
  fs.mkdirSync('evidence/refs', { recursive: true });
  fs.writeFileSync(out, PNG.sync.write(outImg));
  console.log('cropped', out, `${w}x${h}`);
}

// poster: image-gen-2.png (Modular Character Factory)
const poster2 = 'C:/Users/st3v3/Downloads/realdeal/image-gen-2.png';
// base body figure + the robed front view + hero render from poster 1
crop(poster2, 'evidence/refs/ref-base-front.png', [460, 130, 535, 380]);
crop(poster2, 'evidence/refs/ref-robed-front.png', [20, 130, 125, 380]);
crop(poster2, 'evidence/refs/ref-robed-side.png', [140, 130, 235, 380]);
crop(poster2, 'evidence/refs/ref-robed-back.png', [240, 130, 345, 380]);
crop('C:/Users/st3v3/Downloads/realdeal/a_high_detail_infographic_style_guide_poster_for_1.png',
  'evidence/refs/ref-hero-scene.png', [20, 20, 360, 340]);
