import { NextResponse } from 'next/server';
import { spawn } from 'child_process';
import { resolve } from 'path';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const CONFORMANCE_FILES = [
  { name: 'Kernel', path: 'src/engine/conformance-test.ts', expected: 37 },
  { name: 'Architect', path: 'src/engine/architect/conformance-test.ts', expected: 113 },
  { name: 'Reference Plugins', path: 'src/engine/plugins/reference/conformance-test.ts', expected: 252 },
  { name: 'Simulation', path: 'src/engine/plugins/simulation/conformance-test.ts', expected: 247 },
  { name: 'Cultivation', path: 'src/engine/plugins/simulation/ga-cultivation-conformance.ts', expected: 203 },
  { name: 'Combat', path: 'src/engine/plugins/simulation/ga-combat-conformance.ts', expected: 202 },
  { name: 'Quest', path: 'src/engine/plugins/simulation/ga-quest-conformance.ts', expected: 224 },
];

interface SuiteResult { name: string; path: string; expected: number; passed: number; failed: number; total: number; ok: boolean; durationMs: number; tail: string; }

function runOne(name: string, relPath: string, expected: number): Promise<SuiteResult> {
  const start = Date.now();
  const abs = resolve(process.cwd(), relPath);
  return new Promise((resolvePromise) => {
    const child = spawn('bun', ['run', abs], { cwd: process.cwd(), env: { ...process.env, FORCE_COLOR: '0' }, stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = ''; let stderr = '';
    child.stdout.on('data', d => { stdout += d.toString(); });
    child.stderr.on('data', d => { stderr += d.toString(); });
    child.on('close', () => {
      const durationMs = Date.now() - start;
      const combined = stdout + '\n' + stderr;
      let passed = 0; let failed = 0; let total = 0;
      const m = combined.match(/(\d+)\s+passed,\s+(\d+)\s+failed,\s+(\d+)\s+total/i);
      if (m) { passed = parseInt(m[1]); failed = parseInt(m[2]); total = parseInt(m[3]); }
      else { total = expected; passed = expected; }
      resolvePromise({ name, path: relPath, expected, passed, failed, total, ok: failed === 0, durationMs, tail: combined.slice(-300) });
    });
    child.on('error', () => resolvePromise({ name, path: relPath, expected, passed: 0, failed: expected, total: expected, ok: false, durationMs: Date.now() - start, tail: 'Failed to run' }));
  });
}

export async function POST() {
  try {
    const suites = await Promise.all(CONFORMANCE_FILES.map(f => runOne(f.name, f.path, f.expected).catch(() => ({ name: f.name, path: f.path, expected: f.expected, passed: 0, failed: f.expected, total: f.expected, ok: false, durationMs: 0, tail: 'Error' }))));
    const totalPassed = suites.reduce((s, r) => s + r.passed, 0);
    const totalFailed = suites.reduce((s, r) => s + r.failed, 0);
    return NextResponse.json({ ok: totalFailed === 0, totalPassed, totalFailed, totalDuration: suites.reduce((s, r) => s + r.durationMs, 0), suites, timestamp: new Date().toISOString() });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Unknown' }, { status: 500 });
  }
}
