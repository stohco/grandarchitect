// evidence/mask-ref.cjs — mask the poster's cream background to white
// (TripoSR wants a clean object on white)
const fs = require('fs');
const { PNG } = require('C:/Users/st3v3/AppData/Local/Temp/opencode/suzaku-frontier/node_modules/pngjs');
const img = PNG.sync.read(fs.readFileSync('evidence/refs/ref-base-front-4x.png'));
for (let i = 0; i < img.data.length; i += 4) {
  const r = img.data[i], g = img.data[i + 1], b = img.data[i + 2];
  // cream/white poster panel → transparent (the model composites gray)
  if (r > 215 && g > 210 && b > 170) {
    img.data[i] = 255; img.data[i + 1] = 255; img.data[i + 2] = 255;
    img.data[i + 3] = 0;
  }
}
fs.writeFileSync('C:/Users/st3v3/AppData/Local/Temp/opencode/triposr/ref-masked.png', PNG.sync.write(img));
console.log('masked', img.width + 'x' + img.height);
