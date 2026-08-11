/**
 * scripts/game-dev.ts — build the game page with bun's bundler and serve it.
 *
 * The studio (Next.js) is dead; the game is a pure three.js page. This uses
 * only bun's built-in bundler + static server — no new packages.
 *
 * Run: bun run game:dev   → http://localhost:5174
 */

import { build, serve } from 'bun';

const PORT = 5174;
const GAME_HTML = 'src/engine/game/index.html';

const out = await build({
  entrypoints: ['src/engine/game/index.ts'],
  outdir: '.game-dist',
  target: 'browser',
  minify: false,
  sourcemap: 'inline',
});

if (!out.success) {
  console.error('game build failed:', out.logs);
  process.exit(1);
}

console.log('game bundle written:', out.outputs.map((o) => o.path).join(', '));

const server = serve({
  port: PORT,
  fetch(req) {
    const url = new URL(req.url);
    let path = url.pathname;
    if (path === '/') path = '/' + GAME_HTML;
    const file = Bun.file('.' + path);
    if (file.size > 0 && file.exists()) return new Response(file);
    // the bundle output lives under .game-dist — map index.ts → bundle
    const bundled = Bun.file('.game-dist/index.js');
    if (path.endsWith('/index.ts') && bundled.size > 0 && bundled.exists()) return new Response(bundled);
    return new Response('not found: ' + path, { status: 404 });
  },
});

console.log(`Suzaku Frontier game: http://localhost:${PORT} (${GAME_HTML})`);
process.on('SIGINT', () => { server.stop(); process.exit(0); });
