/**
 * A minimal, robust static file server for the built Next.js app.
 *
 * Why this exists:
 *   The Next.js dev server (next dev) and production server (next start)
 *   crash under request load in this environment. The standalone server
 *   (bun .next/standalone/server.js) also crashes on chunk 404s.
 *   This server serves the pre-built static files directly, with no
 *   compilation, no HMR, no RSC streaming — just files. It is rock-solid.
 *
 * What it serves:
 *   - /_next/static/*  →  .next/standalone/.next/static/*
 *   - /                →  .next/standalone/.next/server/app/index.html
 *   - Any other route  →  index.html (client-side routing handles it)
 *
 * The page is a client component ('use client') that hydrates from the
 * HTML shell. The JS chunks contain the React + page code. As long as
 * both are served, the page works.
 */

import { existsSync, statSync, readFileSync } from 'fs';
import { join, extname, normalize } from 'path';

const PORT = 3000;
const HOST = '0.0.0.0';

const STATIC_ROOT = join(process.cwd(), '.next/standalone/.next/static');
const APP_HTML = join(process.cwd(), '.next/standalone/.next/server/app/index.html');

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

function serve(req: Request): Response {
  const url = new URL(req.url);
  let pathname = decodeURIComponent(url.pathname);

  // Serve _next/static/* from the static root
  if (pathname.startsWith('/_next/static/')) {
    const rel = pathname.slice('/_next/static/'.length);
    const filePath = join(STATIC_ROOT, normalize(rel));
    // Prevent path traversal
    if (!filePath.startsWith(STATIC_ROOT)) {
      return new Response('Forbidden', { status: 403 });
    }
    if (existsSync(filePath) && statSync(filePath).isFile()) {
      const ext = extname(filePath);
      const mime = MIME[ext] || 'application/octet-stream';
      const body = readFileSync(filePath);
      return new Response(body, {
        headers: {
          'Content-Type': mime,
          'Cache-Control': 'public, max-age=31536000, immutable',
        },
      });
    }
    return new Response('Not Found', { status: 404 });
  }

  // Serve other _next/* paths (e.g., _next/data/*) — return 404 for now
  // since this is a static-only server.
  if (pathname.startsWith('/_next/')) {
    return new Response('Not Found', { status: 404 });
  }

  // For all other routes, serve the index.html (client-side routing).
  // The page is a client component that hydrates from this shell.
  if (existsSync(APP_HTML)) {
    const body = readFileSync(APP_HTML);
    return new Response(body, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-cache',
      },
    });
  }

  return new Response('Not Found', { status: 404 });
}

const server = Bun.serve({
  port: PORT,
  hostname: HOST,
  fetch: serve,
});

console.log(`Static server running at http://${HOST}:${PORT}`);
console.log(`Static root: ${STATIC_ROOT}`);
console.log(`App HTML: ${APP_HTML}`);
