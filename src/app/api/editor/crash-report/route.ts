/**
 * POST /api/editor/crash-report
 *   Receives a crash diagnostic bundle from the Crash Observatory and
 *   persists it to disk under `crash-reports/crash-{timestamp}-{id}.json`.
 *   Returns 200 with the saved filename.
 *
 * GET /api/editor/crash-report
 *   Lists all persisted crash reports (filename + size + mtime), newest first.
 */

import { NextRequest, NextResponse } from 'next/server';
import { mkdir, writeFile, readdir, stat } from 'fs/promises';
import { join } from 'path';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const REPORTS_DIR = join(process.cwd(), 'crash-reports');

interface CrashRequestBody {
  bundle?: unknown;
  crashIds?: string[];
}

interface CrashFileMeta {
  filename: string;
  size: number;
  mtime: number;
}

async function ensureReportsDir(): Promise<void> {
  try {
    await mkdir(REPORTS_DIR, { recursive: true });
  } catch {
    // mkdir is idempotent with recursive: true; any other error will
    // surface on the subsequent writeFile call.
  }
}

/** Sanitize an id so it is safe to embed in a filename. */
function safeId(id: unknown): string {
  if (typeof id !== 'string' || id.length === 0) {
    return Math.random().toString(36).slice(2, 10);
  }
  // Allow alphanumerics + dashes only; collapse everything else.
  const cleaned = id.replace(/[^a-zA-Z0-9-]/g, '').slice(0, 64);
  return cleaned.length > 0 ? cleaned : Math.random().toString(36).slice(2, 10);
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as CrashRequestBody;
    if (!body || typeof body !== 'object') {
      return NextResponse.json(
        { ok: false, error: 'Invalid body: expected JSON object' },
        { status: 400 }
      );
    }

    // The bundle is the canonical payload from buildDiagnosticBundle().
    // We persist the whole request body so analysts can also see which
    // crash ids triggered this submission.
    const bundle = body.bundle ?? body;
    const sessionId =
      typeof bundle === 'object' &&
      bundle !== null &&
      'sessionId' in bundle &&
      typeof (bundle as { sessionId?: unknown }).sessionId === 'string'
        ? safeId((bundle as { sessionId: string }).sessionId)
        : safeId(undefined);

    const timestamp = new Date()
      .toISOString()
      .replace(/[:.]/g, '-')
      .slice(0, 23);
    const shortId = sessionId.slice(0, 8);
    const filename = `crash-${timestamp}-${shortId}.json`;

    await ensureReportsDir();
    const filePath = join(REPORTS_DIR, filename);
    const payload = {
      savedAt: Date.now(),
      filename,
      crashIds: body.crashIds ?? [],
      bundle,
    };
    await writeFile(filePath, JSON.stringify(payload, null, 2), 'utf-8');

    return NextResponse.json({ ok: true, filename });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { ok: false, error: message },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    await ensureReportsDir();
    let files: string[];
    try {
      files = (await readdir(REPORTS_DIR)).filter(
        (f) => f.startsWith('crash-') && f.endsWith('.json')
      );
    } catch {
      files = [];
    }

    const metas: CrashFileMeta[] = [];
    for (const filename of files) {
      try {
        const st = await stat(join(REPORTS_DIR, filename));
        metas.push({
          filename,
          size: st.size,
          mtime: st.mtimeMs,
        });
      } catch {
        // file may have been deleted between readdir and stat — skip
      }
    }

    // Newest first.
    metas.sort((a, b) => b.mtime - a.mtime);

    return NextResponse.json({
      ok: true,
      count: metas.length,
      reports: metas,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { ok: false, error: message },
      { status: 500 }
    );
  }
}
