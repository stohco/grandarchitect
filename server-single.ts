/**
 * Rock-solid single-file server.
 *
 * Serves /home/z/my-project/public/determinism.html at the root.
 * No Next.js, no Turbopack, no RSC streaming, no chunks to fetch.
 * One HTML file with everything inlined. Cannot crash.
 */

import { readFileSync } from 'fs';

const PORT = 3000;
const HOST = '0.0.0.0';
const HTML = readFileSync('/home/z/my-project/public/determinism.html', 'utf-8');

const server = Bun.serve({
  port: PORT,
  hostname: HOST,
  fetch(req) {
    const url = new URL(req.url);
    // Serve the determinism page for all routes
    return new Response(HTML, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-cache',
      },
    });
  },
});

console.log(`Determinism page server running at http://${HOST}:${PORT}`);
console.log(`Serving: /home/z/my-project/public/determinism.html (${HTML.length} bytes)`);
