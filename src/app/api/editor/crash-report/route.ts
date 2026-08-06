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
<<<<<<< HEAD
=======
import { requireDevMode, checkCrashReportRate, CRASH_REPORT_MAX_BYTES } from '@/lib/editor/api-guards';
>>>>>>> 7a4f5e29fb7830ff0142679ec9c1732b964d1184

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
<<<<<<< HEAD
  try {
    const body = (await req.json()) as CrashRequestBody;
=======
  // Dev-only guard + rate limiting + body size cap for crash reports.
  const devGuard = requireDevMode();
  if (devGuard) return devGuard;

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  if (!checkCrashReportRate(ip)) {
    return NextResponse.json(
      { ok: false, error: 'Rate limit exceeded: max 20 crash reports per minute per IP' },
      { status: 429 },
    );
  }

  // Enforce Content-Length BEFORE reading the body. Reading req.text()
  // allocates the full string in memory — we must reject oversized payloads
  // before any parsing to prevent memory exhaustion.
  const contentLength = parseInt(req.headers.get('content-length') ?? '0', 10);
  if (contentLength > CRASH_REPORT_MAX_BYTES) {
    return NextResponse.json(
      { ok: false, error: `Content-Length ${contentLength} exceeds max ${CRASH_REPORT_MAX_BYTES} bytes` },
      { status: 413 },
    );
  }

  try {
    const rawText = await req.text();
    if (rawText.length > CRASH_REPORT_MAX_BYTES) {
      return NextResponse.json(
        { ok: false, error: `Body too large: ${rawText.length} bytes, max ${CRASH_REPORT_MAX_BYTES}` },
        { status: 413 },
      );
    }
    let body: CrashRequestBody;
    try {
      body = JSON.parse(rawText) as CrashRequestBody;
    } catch {
      return NextResponse.json(
        { ok: false, error: 'Invalid JSON' },
        { status: 400 },
      );
    }
>>>>>>> 7a4f5e29fb7830ff0142679ec9c1732b964d1184
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
<<<<<<< HEAD
=======
  // Dev-only guard — crash reports may contain console output, store state,
  // error stacks, URLs, and potentially user-entered text. Not for production.
  const devGuard = requireDevMode();
  if (devGuard) return devGuard;

>>>>>>> 7a4f5e29fb7830ff0142679ec9c1732b964d1184
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
