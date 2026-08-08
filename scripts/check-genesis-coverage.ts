#!/usr/bin/env bun
/**
 * scripts/check-genesis-coverage.ts
 *
 * `bun run check:genesis`
 *
 * The Genesis coverage gate (Universe Genesis Compiler §41-42):
 * an unbound required system, a dead consumer, or a fabricated claim is a
 * GENESIS COVERAGE FAILURE — this script exits 1, the build fails.
 *
 * Writes genesis-coverage-report.json (machine-readable) and prints the
 * auto-generated Universe Coverage Matrix.
 */

import { writeFileSync } from 'node:fs';
import { runCoverage, renderMarkdownMatrix } from '../src/lib/genesis/genesis-coverage';
import { GENESIS_CONCEPTS } from '../src/lib/genesis/concepts-registry';
import { SYSTEM_LABELS } from '../src/lib/genesis/genesis-types';
import { runGauntlet } from '../src/lib/genesis/emergence-gauntlet';

const report = runCoverage(GENESIS_CONCEPTS);

console.log('check:genesis — Genesis Coverage Gate');
console.log('='.repeat(60));
console.log(`Concepts: ${report.conceptCount}`);
console.log(`Required system pairs: ${report.requiredPairs}`);
console.log(`Bound pairs: ${report.boundPairs}`);
console.log('');

if (report.failures.length > 0) {
  console.log(`GENESIS COVERAGE FAILURE — ${report.failures.length} issue(s):`);
  for (const f of report.failures) {
    const sys = f.system ? ` [${SYSTEM_LABELS[f.system]}]` : '';
    console.log(`  ✗ ${f.conceptId}${sys} (${f.kind}) — ${f.detail}`);
  }
} else {
  console.log('All concepts fully bound. No unbound canonical concept.');
}

console.log('');
console.log(renderMarkdownMatrix(report));

// Emergence Gauntlet summary.
const gauntlet = runGauntlet();
const gauntletPass = gauntlet.every((a) => a.pass);
console.log('');
console.log(`Emergence Gauntlet: ${gauntlet.filter((a) => a.pass).length}/${gauntlet.length} scenarios observable`);
for (const a of gauntlet) {
  const mark = a.pass ? '✓' : '✗';
  console.log(`  ${mark} ${a.scenario.id} — fan-out ${a.fanOut} systems${a.unobserved.length ? `; unobserved: ${a.unobserved.join(', ')}` : ''}${a.premiseVerified ? '' : '; premise NOT verified'}`);
}

// Machine-readable report (like test-results.json for conformance).
writeFileSync(
  'genesis-coverage-report.json',
  JSON.stringify(
    {
      concepts: report.concepts.map((c) => ({
        id: c.id,
        canonLevel: c.canonLevel,
        requires: c.requires,
        bindings: c.bindings,
      })),
      failures: report.failures,
      matrix: report.matrix,
      fanOut: report.fanOut,
      conceptCount: report.conceptCount,
      boundPairs: report.boundPairs,
      requiredPairs: report.requiredPairs,
      gauntlet: gauntlet.map((a) => ({
        id: a.scenario.id,
        premiseVerified: a.premiseVerified,
        observedSystems: a.scenario.observedSystems,
        fanOut: a.fanOut,
        pass: a.pass,
      })),
    },
    null,
    2,
  ),
);

process.exit(report.pass && gauntletPass ? 0 : 1);
