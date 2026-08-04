/**
 * GET /api/architect/lore?q=<query>
 *
 * Search the surviving corpus + engine-architecture docs for lore snippets
 * matching a query. Returns up to N short excerpts. This is a server-side
 * mini search so the client never reads the corpus directly.
 */

import { NextRequest, NextResponse } from 'next/server';
import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const CORPUS_DIR = join(process.cwd(), 'corpus-extension');
const ARCH_DIR = join(process.cwd(), 'engine-architecture');
const MAX_EXCERPTS = 6;
const EXCERPT_RADIUS = 220; // chars each side of the match

interface LoreHit {
  file: string;
  query: string;
  excerpt: string;
}

async function loadCorpus(): Promise<{ file: string; text: string }[]> {
  const out: { file: string; text: string }[] = [];
  const dirs = [CORPUS_DIR, ARCH_DIR];
  for (const dir of dirs) {
    let names: string[] = [];
    try {
      names = await readdir(dir);
    } catch {
      continue;
    }
    for (const name of names) {
      if (!name.endsWith('.md')) continue;
      try {
        const text = await readFile(join(dir, name), 'utf8');
        out.push({ file: name, text });
      } catch {
        // skip unreadable
      }
    }
  }
  return out;
}

function excerptAround(text: string, idx: number): string {
  const start = Math.max(0, idx - EXCERPT_RADIUS);
  const end = Math.min(text.length, idx + EXCERPT_RADIUS);
  let slice = text.slice(start, end).replace(/\s+/g, ' ').trim();
  if (start > 0) slice = '… ' + slice;
  if (end < text.length) slice = slice + ' …';
  return slice;
}

export async function GET(req: NextRequest) {
  const q = (req.nextUrl.searchParams.get('q') ?? '').trim().toLowerCase();
  if (!q) {
    return NextResponse.json({ hits: [], count: 0 });
  }
  const corpus = await loadCorpus();
  const hits: LoreHit[] = [];
  for (const { file, text } of corpus) {
    if (hits.length >= MAX_EXCERPTS) break;
    const lower = text.toLowerCase();
    let i = lower.indexOf(q);
    if (i === -1) continue;
    hits.push({ file, query: q, excerpt: excerptAround(text, i) });
  }
  return NextResponse.json(
    { hits, count: hits.length },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
