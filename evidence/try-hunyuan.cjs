// evidence/try-hunyuan.cjs — call the hosted Hunyuan3D-2 inference API
const fs = require('fs');
const { PNG } = require('C:/Users/st3v3/AppData/Local/Temp/opencode/suzaku-frontier/node_modules/pngjs');

// upscale the reference crop 4x (the model needs pixels)
const src = PNG.sync.read(fs.readFileSync('evidence/refs/ref-base-front.png'));
const scale = 4;
const big = new PNG({ width: src.width * scale, height: src.height * scale });
for (let y = 0; y < big.height; y++) {
  for (let x = 0; x < big.width; x++) {
    const sx = Math.min(src.width - 1, x >> 2);
    const sy = Math.min(src.height - 1, y >> 2);
    const si = (sy * src.width + sx) * 4;
    const di = (y * big.width + x) * 4;
    big.data[di] = src.data[si];
    big.data[di + 1] = src.data[si + 1];
    big.data[di + 2] = src.data[si + 2];
    big.data[di + 3] = src.data[si + 3];
  }
}
const inputPath = 'evidence/refs/ref-base-front-4x.png';
fs.writeFileSync(inputPath, PNG.sync.write(big));

(async () => {
  const model = process.argv[2] || 'tencent/Hunyuan3D-2';
  const body = fs.readFileSync(inputPath);
  console.log('calling', model, 'with', body.length, 'bytes...');
  const t0 = Date.now();
  try {
    const r = await fetch(`https://api-inference.huggingface.co/models/${model}`, {
      method: 'POST',
      headers: { 'Content-Type': 'image/png' },
      body,
      signal: AbortSignal.timeout(300000),
    });
    console.log('status', r.status, 'after', ((Date.now() - t0) / 1000).toFixed(0) + 's');
    const ct = r.headers.get('content-type');
    console.log('content-type:', ct);
    if (r.ok) {
      const buf = Buffer.from(await r.arrayBuffer());
      const out = 'evidence/hunyuan-out.glb';
      fs.writeFileSync(out, buf);
      console.log('saved', out, buf.length, 'bytes');
    } else {
      const t = await r.text();
      console.log('body:', t.slice(0, 400));
    }
  } catch (e) {
    console.log('FAIL', e.message);
  }
})();
