import { readFileSync } from 'fs';
import { join } from 'path';

// This page is a server component that inlines a self-contained HTML file
// containing the entire determinism verification harness — SHA-256, RNG,
// transcendentals, fixed-point, CBOR encoder, the 1000-tick simulation, and
// the rendering code, all as a single <script> block with no external
// dependencies and no client-side React hydration.
//
// Why this approach:
//   The Next.js dev server (Turbopack) crashes under the preview gateway's
//   request pattern. A client component ('use client') requires the browser
//   to fetch JS chunks from the dev server, which fails when the server
//   crashes. By inlining everything into the SSR HTML, the page works even
//   if the dev server dies after the first request — the browser already
//   has everything it needs in the single HTML response.
//
// The HTML file is at public/determinism.html. It is self-contained and
// can also be opened directly as a file:// URL for offline testing.

const HTML_PATH = join(process.cwd(), 'public', 'determinism.html');
const html = readFileSync(HTML_PATH, 'utf-8');

export default function Page() {
  return (
    <div dangerouslySetInnerHTML={{ __html: html }} />
  );
}
