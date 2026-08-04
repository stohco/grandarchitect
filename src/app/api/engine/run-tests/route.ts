import { NextResponse } from 'next/server';
import { spawn } from 'child_process';
import { resolve } from 'path';
import { CONFORMANCE_FILES } from '@/lib/engine/dashboard-data';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

interface SuiteResult {
  name: string;
  path: string;
  expected: number;
  passed: number;
  failed: number;
  total: number;
  ok: boolean;
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
    child.stdout.on('data', (d) => { stdout += d.toString(); });
    child.stderr.on('data', (d) => { stderr += d.toString(); });
    child.on('close', () => {
      const durationMs = Date.now() - start;
      const combined = stdout + '\n' + stderr;
      let passed = 0;
      let failed = 0;
      let total = 0;
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
      }
      const ok = failed === 0 && (total === 0 || total >= expected);
      const tail = combined.trim().split('\n').slice(-12).join('\n');
      resolvePromise({ name, path: relPath, expected, passed, failed, total, ok, durationMs, tail });
    });
    child.on('error', () => {
      const durationMs = Date.now() - start;
      resolvePromise({
        name, path: relPath, expected, passed: 0, failed: 1, total: 0,
        ok: false, durationMs, tail: 'Failed to spawn child process',
      });
    });
  });
}

export async function POST() {
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
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    message: 'POST to this endpoint to run all conformance suites.',
    files: CONFORMANCE_FILES,
  });
}
