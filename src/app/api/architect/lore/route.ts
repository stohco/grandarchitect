/**
 * GET /api/architect/lore?q=<query>&doc=<filename>
 *
 * The Architect's knowledge of the xianxia multiverse.
 * Reads the frozen bible (corpus-extension/) so the Architect
 * "knows all about xianxia" and can design the universe meticulously.
 *
 * Query params:
 *   q:     search string (case-insensitive, matches title or body)
 *   doc:   specific doc filename (e.g. "03_REALM_LADDER.md")
 *
 * Returns:
 *   { query, totalDocs, matches: [{filename, title, status, excerpt, relevance}] }
 *
 * If no q or doc: returns the full index (all 48 docs with title + status + first line).
 */

import { NextRequest, NextResponse } from 'next/server';
import { readFile, readdir } from 'fs/promises';
import { join } from 'path';

export const runtime = 'nodejs';

const CORPUS_DIR = join(process.cwd(), 'corpus-extension');

interface LoreDoc {
  filename: string;
  title: string;
  status: string;
  excerpt: string;
  relevance?: number;
}

async function readCorpusIndex(): Promise<LoreDoc[]> {
  let files: string[];
  try {
    files = (await readdir(CORPUS_DIR)).filter(f => f.endsWith('.md'));
  } catch {
    return [];
  }
  const docs: LoreDoc[] = [];
  for (const filename of files) {
    try {
      const content = await readFile(join(CORPUS_DIR, filename), 'utf-8');
      const lines = content.split('\n');
      const title = lines.find(l => l.startsWith('# '))?.replace(/^#\s+/, '').trim() ?? filename;
      const statusLine = lines.find(l => l.toLowerCase().includes('**status:**'));
      const status = statusLine?.replace(/.*\*\*status:\*\*\s*/i, '').trim() ?? 'unspecified';
      const excerpt = lines.slice(0, 40).join('\n').slice(0, 800);
      docs.push({ filename, title, status, excerpt });
    } catch {
      // skip unreadable
    }
  }
  return docs.sort((a, b) => a.filename.localeCompare(b.filename));
}

async function searchCorpus(query: string): Promise<LoreDoc[]> {
  const q = query.toLowerCase().trim();
  if (!q) return readCorpusIndex();
  let files: string[];
  try {
    files = (await readdir(CORPUS_DIR)).filter(f => f.endsWith('.md'));
  } catch {
    return [];
  }
  const matches: LoreDoc[] = [];
  for (const filename of files) {
    try {
      const content = await readFile(join(CORPUS_DIR, filename), 'utf-8');
      const lower = content.toLowerCase();
      const lines = content.split('\n');
      const title = lines.find(l => l.startsWith('# '))?.replace(/^#\s+/, '').trim() ?? filename;
      const statusLine = lines.find(l => l.toLowerCase().includes('**status:**'));
      const status = statusLine?.replace(/.*\*\*status:\*\*\s*/i, '').trim() ?? 'unspecified';

      let relevance = 0;
      // Title match is strongest
      if (title.toLowerCase().includes(q)) relevance += 10;
      // Body match count
      const bodyMatches = lower.split(q).length - 1;
      relevance += Math.min(bodyMatches, 20);
      // Status match
      if (status.toLowerCase().includes(q)) relevance += 3;

      if (relevance > 0) {
        // Find the first matching paragraph for the excerpt
        let excerpt = '';
        const paragraphs = content.split(/\n\n+/);
        for (const p of paragraphs) {
          if (p.toLowerCase().includes(q)) {
            excerpt = p.slice(0, 600);
            break;
          }
        }
        if (!excerpt) excerpt = lines.slice(0, 30).join('\n').slice(0, 600);
        matches.push({ filename, title, status, excerpt, relevance });
      }
    } catch {
      // skip
    }
  }
  return matches.sort((a, b) => (b.relevance ?? 0) - (a.relevance ?? 0));
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get('q') ?? '';
    const doc = searchParams.get('doc');

    // Specific doc requested
    if (doc) {
      try {
        const content = await readFile(join(CORPUS_DIR, doc), 'utf-8');
        const lines = content.split('\n');
        const title = lines.find(l => l.startsWith('# '))?.replace(/^#\s+/, '').trim() ?? doc;
        return NextResponse.json({ doc, title, content, lineCount: lines.length });
      } catch {
        return NextResponse.json({ error: `Doc not found: ${doc}` }, { status: 404 });
      }
    }

    // Search or index
    const matches = q ? await searchCorpus(q) : await readCorpusIndex();
    return NextResponse.json({
      query: q,
      totalDocs: matches.length,
      corpusSize: 48,
      matches,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
