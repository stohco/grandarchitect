/**
 * scripts/gym-dev.ts — the CHARACTER GYM dev server (isolated scene).
 *
 * A tiny scene on its own port for iterating on the character in a tight
 * causal loop: one model, a studio ground, deterministic lights, and a
 * free camera always unlocked (orbit presets 1-6, turntable, walk, robe,
 * zone cycle).
 *
 * Run: bun run game:gym   → http://localhost:5175
 */

import { build, serve } from 'bun';

const PORT = 5175;

await build({
  entrypoints: ['src/engine/gym/gym-main.ts'],
  outdir: '.gym-dist',
  target: 'browser',
  minify: false,
  sourcemap: 'inline',
});

const server = serve({
  port: PORT,
  fetch(req) {
    const url = new URL(req.url);
    let path = url.pathname;
    if (path === '/') path = '/src/engine/gym/gym.html';
    // TS entrypoints serve the BUNDLE (never the raw TypeScript)
    const bundled = Bun.file('.gym-dist/gym/gym-main.js');
    if (path.endsWith('/gym-main.ts') && bundled.size > 0 && bundled.exists()) return new Response(bundled);
    const file = Bun.file('.' + path);
    if (file.size > 0 && file.exists()) return new Response(file);
    return new Response('not found: ' + path, { status: 404 });
  },
});

console.log(`Character gym: http://localhost:${PORT}`);
process.on('SIGINT', () => { server.stop(); process.exit(0); });
