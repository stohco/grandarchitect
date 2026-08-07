/**
 * copy-standalone.ts — cross-platform replacement for the POSIX
 * `cp -r` steps in the build script (Windows has no `cp -r`).
 * Mirrors the original: copies .next/static and public into the
 * standalone output so `bun run start` can serve it.
 */
import { cpSync, existsSync } from 'node:fs';

const root = process.cwd();
const standalone = `${root}/.next/standalone`;

if (!existsSync(`${standalone}/server.js`)) {
  console.log('[copy-standalone] standalone output not found — skipping copy');
  process.exit(0);
}

cpSync(`${root}/.next/static`, `${standalone}/.next/static`, { recursive: true });
if (existsSync(`${root}/public`)) {
  cpSync(`${root}/public`, `${standalone}/public`, { recursive: true });
}
console.log('[copy-standalone] static + public copied into .next/standalone');
