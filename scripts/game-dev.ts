/**
 * scripts/game-dev.ts — build the game page with bun's bundler and serve it.
 *
 * The studio (Next.js) is dead; the game is a pure three.js page. This uses
 * only bun's built-in bundler + static server — no new packages.
 * The CHARACTER GYM lives on the same server: http://localhost:5174/gym
 *
 * Run: bun run game:dev   → game at http://localhost:5174, gym at /gym
 */

import { build, serve } from 'bun';

const PORT = 5174;
const GAME_HTML = 'src/engine/game/index.html';

const out = await build({
  entrypoints: ['src/engine/game/index.ts', 'src/engine/gym/gym-main.ts'],
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
    if (path === '/gym') path = '/src/engine/gym/gym.html';
    // TS entrypoints serve the BUNDLES (never the raw TypeScript). The
    // two-entrypoint build nests outputs by entry directory.
    const gameBundle = Bun.file('.game-dist/game/index.js');
    if (path.endsWith('/index.ts') && gameBundle.size > 0 && gameBundle.exists()) return new Response(gameBundle);
    const gymBundle = Bun.file('.game-dist/gym/gym-main.js');
    if (path.endsWith('/gym-main.ts') && gymBundle.size > 0 && gymBundle.exists()) return new Response(gymBundle);
    const file = Bun.file('.' + path);
    if (file.size > 0 && file.exists()) return new Response(file);
    return new Response('not found: ' + path, { status: 404 });
  },
});

console.log(`Suzaku Frontier game: http://localhost:${PORT} (${GAME_HTML})`);
console.log(`Character gym:        http://localhost:${PORT}/gym`);
process.on('SIGINT', () => { server.stop(); process.exit(0); });
