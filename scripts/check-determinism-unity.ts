/**
 * check-determinism-unity.ts — scans for violations of rule DET-1
 * (subsystem-local deterministic primitives are forbidden).
 *
 * Flags:
 *   - local PRNG/LCG/hash implementations outside src/lib/determinism
 *   - Math.imul-based LCGs (the Park-Miller truncation bug class)
 *   - 'Math.random(' in engine code
 *
 * Run: bun run check:determinism
 */

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

const ROOT = resolve(process.cwd(), 'src/engine');
const VIOLATION_PATTERNS: Array<{ label: string; re: RegExp }> = [
  // Park-Miller via Math.imul is the truncation bug; FNV-1a's imul is
  // spec-correct and NOT a violation.
  { label: 'Park-Miller LCG via Math.imul (truncating multiply)', re: /Math\.imul\([^)]*48271/ },
  { label: 'Math.random in engine code', re: /Math\.random\(/ },
  { label: 'local fnv1a/lcgStep/hashToNumber definition', re: /export (function|const) (fnv1a|fnv1aHash|lcgStep|hashToNumber|deterministicId)\b/ },
];

const violations: Array<{ file: string; line: number; label: string }> = [];

function walk(dir: string): void {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      if (full.endsWith('node_modules')) continue;
      walk(full);
    } else if (full.endsWith('.ts') || full.endsWith('.tsx')) {
      const lines = readFileSync(full, 'utf8').split('\n');
      lines.forEach((line, i) => {
        const trimmed = line.trim();
        // Skip comment lines (the rule is about code, not documentation).
        if (trimmed.startsWith('*') || trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*/')) return;
        for (const v of VIOLATION_PATTERNS) {
          if (v.re.test(line)) {
            violations.push({ file: full.replace(ROOT, 'src/engine'), line: i + 1, label: v.label });
          }
        }
      });
    }
  }
}

walk(ROOT);

if (violations.length > 0) {
  console.log(`[check-determinism] ${violations.length} violation(s) found:`);
  for (const v of violations) console.log(`  ${v.file}:${v.line} — ${v.label}`);
  process.exit(1);
}
console.log('[check-determinism] clean — no subsystem-local deterministic primitives found.');
