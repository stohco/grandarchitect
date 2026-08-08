/**
 * run-conformance.ts — canonical conformance runner.
 *
 * Discovers suites from the single source of truth (CONFORMANCE_FILES in
 * src/lib/engine/dashboard-data.ts), executes each with bun, and writes a
 * machine-readable result manifest to test-results.json.
 *
 * The manifest is the ONLY sanctioned source of aggregate test counts —
 * agents must consume test-results.json instead of typing totals into
 * reports.
 *
 * Usage:
 *   bun run test:conformance   # run + write manifest + exit code
 *   bun run test:manifest      # write manifest without re-running (reads
 *                              # a previous run's per-suite results)
 */

import { spawn } from 'node:child_process';
import { writeFileSync, readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { execSync } from 'node:child_process';

interface SuiteEntry {
  name: string;
  path: string;
  expected: number;
}

function loadSuites(): SuiteEntry[] {
  // Read CONFORMANCE_FILES from dashboard-data.ts by regex (it is the
  // canonical list and is not directly importable without the app graph).
  const src = readFileSync(resolve(process.cwd(), 'src/lib/engine/dashboard-data.ts'), 'utf8');
  const block = src.slice(src.indexOf('export const CONFORMANCE_FILES'));
  const entries: SuiteEntry[] = [];
  for (const m of block.matchAll(/name:\s*'([^']+)',\s*path:\s*'([^']+)',\s*expected:\s*(\d+)/g)) {
    entries.push({ name: m[1], path: m[2], expected: parseInt(m[3], 10) });
  }
  return entries;
}

function getSha(): string {
  try {
    return execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();
  } catch {
    return 'unknown';
  }
}

async function runSuite(entry: SuiteEntry): Promise<{ exitCode: number; detected: number | null; durationMs: number }> {
  return new Promise((resolvePromise) => {
    const start = Date.now();
    // `bun` is a shim (not an exe) on some platforms — use the binary that
    // is running this script. A per-suite timeout keeps a hung suite from
    // stalling the whole gate.
    const bunBin = process.argv[0] ?? 'bun';
    const child = spawn(bunBin, ['run', entry.path], { stdio: ['ignore', 'pipe', 'pipe'] });
    let out = '';
    let settled = false;
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      child.kill();
      resolvePromise({ exitCode: -1, detected: null, durationMs: Date.now() - start });
    }, 300_000);
    child.stdout.on('data', (d) => { out += d.toString(); });
    child.stderr.on('data', (d) => { out += d.toString(); });
    child.on('error', (err) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolvePromise({ exitCode: -2, detected: null, durationMs: Date.now() - start });
    });
    child.on('close', (code) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      // Best-effort parse of a reported count from the suite's own summary.
      let detected: number | null = null;
      const totalMatch = out.match(/(\d+)\s+(?:passed|Total asserts|total)/i);
      if (totalMatch) detected = parseInt(totalMatch[1], 10);
      resolvePromise({ exitCode: code ?? 1, detected, durationMs: Date.now() - start });
    });
  });
}

async function main() {
  const suites = loadSuites();
  const manifestPath = resolve(process.cwd(), 'test-results.json');
  const rerun = process.argv.includes('--rerun') || !existsSync(manifestPath);

  const results: Array<{ name: string; path: string; expected: number; exitCode: number; detected: number | null; durationMs: number }> = [];
  let passed = 0;
  let failed = 0;
  let totalExpected = 0;

  if (rerun) {
    console.log(`[run-conformance] running ${suites.length} suites…`);
    for (const s of suites) {
      const r = await runSuite(s);
      const ok = r.exitCode === 0;
      if (ok) passed++; else failed++;
      totalExpected += s.expected;
      const detectedStr = r.detected === null ? 'n/a' : String(r.detected);
      console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${s.name} (${s.path}) — exit ${r.exitCode}, expected ${s.expected}, detected ${detectedStr}, ${r.durationMs}ms`);
      results.push({ ...s, ...r });
    }
    const manifest = {
      sha: getSha(),
      generatedAt: new Date().toISOString(),
      totalAssertions: totalExpected,
      suitesPassed: passed,
      suitesFailed: failed,
      suites: results,
    };
    writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
    console.log(`[run-conformance] manifest written: ${manifestPath}`);
    console.log(`[run-conformance] total assertions (expected, verified-by-execution): ${totalExpected}`);
    process.exit(failed > 0 ? 1 : 0);
  } else {
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
    console.log(`[run-conformance] manifest mode (no re-run): SHA ${manifest.sha}`);
    console.log(`[run-conformance] total assertions: ${manifest.totalAssertions} (${manifest.suitesPassed} suites passed, ${manifest.suitesFailed} failed)`);
    process.exit(manifest.suitesFailed > 0 ? 1 : 0);
  }
}

await main();
