import { NextResponse } from 'next/server';
import { requireDevMode } from '@/lib/editor/api-guards';
import { spawn } from 'child_process';
import { resolve } from 'path';
import { CONFORMANCE_FILES } from '@/lib/engine/dashboard-data';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Concurrency lock — only one test run at a time to prevent resource exhaustion.
let testRunInProgress = false;

const SUITE_TIMEOUT_MS = 30_000; // 30 seconds per suite
const MAX_OUTPUT_BYTES = 1_000_000; // 1 MB stdout+stderr cap

interface SuiteResult {
  name: string;
  path: string;
  expected: number;
  passed: number;
  failed: number;
  total: number;
  ok: boolean;
  exitCode: number | null;
  signal: string | null;
  timedOut: boolean;
  parseError: boolean;
  durationMs: number;
  tail: string;
}

function runOne(name: string, relPath: string, expected: number): Promise<SuiteResult> {
  const start = Date.now();
  const abs = resolve(process.cwd(), relPath);
  return new Promise((resolvePromise) => {
    const child = spawn('bun', ['run', abs], {
      cwd: process.cwd(),
      env: { ...process.env, FORCE_COLOR: '0' },
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';
    let timedOut = false;
    let outputTruncated = false;

    const timeoutHandle = setTimeout(() => {
      timedOut = true;
      try {
        child.kill('SIGTERM');
        // Force kill after 2s if still alive
        setTimeout(() => {
          try { child.kill('SIGKILL'); } catch { /* already dead */ }
        }, 2000);
      } catch { /* already dead */ }
    }, SUITE_TIMEOUT_MS);

    child.stdout.on('data', (d: Buffer) => {
      if (stdout.length < MAX_OUTPUT_BYTES) {
        stdout += d.toString();
      } else {
        outputTruncated = true;
      }
    });
    child.stderr.on('data', (d: Buffer) => {
      if (stderr.length < MAX_OUTPUT_BYTES) {
        stderr += d.toString();
      } else {
        outputTruncated = true;
      }
    });

    child.on('close', (code, signal) => {
      clearTimeout(timeoutHandle);
      const durationMs = Date.now() - start;
      const combined = stdout + '\n' + stderr;
      let passed = 0;
      let failed = 0;
      let total = 0;
      let parseError = false;

      const m = combined.match(/(\d+)\s+passed,\s+(\d+)\s+failed,\s+(\d+)\s+total/i);
      if (m) {
        passed = parseInt(m[1], 10);
        failed = parseInt(m[2], 10);
        total = parseInt(m[3], 10);
      } else {
        const pMatch = combined.match(/Passed:\s*(\d+)/i);
        const fMatch = combined.match(/Failed:\s*(\d+)/i);
        if (pMatch) passed = parseInt(pMatch[1], 10);
        if (fMatch) failed = parseInt(fMatch[1], 10);
        total = passed + failed;
        if (total === 0) parseError = true;
      }

      // Robust pass condition: exit code 0, no signal, no timeout,
      // parseable output, at least one test, zero failures, meets expected.
      const ok =
        code === 0 &&
        signal === null &&
        !timedOut &&
        !parseError &&
        total > 0 &&
        failed === 0 &&
        passed >= expected;

      const tail = (outputTruncated ? '[output truncated]\n' : '') +
        combined.trim().split('\n').slice(-12).join('\n');

      resolvePromise({
        name,
        path: relPath,
        expected,
        passed,
        failed,
        total,
        ok,
        exitCode: code,
        signal,
        timedOut,
        parseError,
        durationMs,
        tail,
      });
    });

    child.on('error', () => {
      clearTimeout(timeoutHandle);
      const durationMs = Date.now() - start;
      resolvePromise({
        name,
        path: relPath,
        expected,
        passed: 0,
        failed: 1,
        total: 0,
        ok: false,
        exitCode: null,
        signal: null,
        timedOut: false,
        parseError: true,
        durationMs,
        tail: 'Failed to spawn child process',
      });
    });
  });
}

export async function POST() {
  const devGuard = requireDevMode();
  if (devGuard) return devGuard;

  // Concurrency lock — prevent overlapping test runs.
  if (testRunInProgress) {
    return NextResponse.json(
      { ok: false, error: 'A test run is already in progress. Wait for it to finish.' },
      { status: 409 },
    );
  }
  testRunInProgress = true;

  try {
    const results: SuiteResult[] = [];
    for (const f of CONFORMANCE_FILES) {
      const r = await runOne(f.name, f.path, f.expected);
      results.push(r);
    }
    const totalPassed = results.reduce((s, r) => s + r.passed, 0);
    const totalFailed = results.reduce((s, r) => s + r.failed, 0);
    const totalDuration = results.reduce((s, r) => s + r.durationMs, 0);
    const allOk = results.every((r) => r.ok);
    return NextResponse.json({
      ok: allOk,
      totalPassed,
      totalFailed,
      totalDuration,
      suites: results,
      timestamp: new Date().toISOString(),
    });
  } finally {
    testRunInProgress = false;
  }
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    message: 'POST to this endpoint to run all conformance suites.',
    files: CONFORMANCE_FILES,
    testRunInProgress,
  });
}
