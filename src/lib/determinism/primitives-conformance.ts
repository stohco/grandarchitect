/**
 * primitives-conformance.ts — golden-vector pinning for the canonical
 * deterministic primitives (FNV-1a + Park-Miller LCG).
 *
 * Golden vectors pin the ALGORITHM, not just "same seed => same result":
 * a corrupted implementation (e.g. Math.imul truncation in Park-Miller)
 * replays the same wrong sequence forever, and only external reference
 * values can catch that.
 *
 * Run: bun run src/lib/determinism/primitives-conformance.ts
 */

import { fnv1a, hashToNumber, lcgStep, deterministicId } from './primitives';

let passed = 0;
let failed = 0;

function check(name: string, actual: string | number, expected: string | number): void {
  const ok = actual === expected;
  if (ok) { passed++; console.log(`PASS  ${name}`); }
  else { failed++; console.log(`FAIL  ${name} — expected ${expected}, got ${actual}`); }
}

// ---------------------------------------------------------------------------
// FNV-1a golden vectors (well-known reference values)
// ---------------------------------------------------------------------------

check('fnv1a("")', fnv1a(''), '811c9dc5');
check('fnv1a("a")', fnv1a('a'), 'e40c292c');
check('fnv1a("foobar")', fnv1a('foobar'), 'bf9cf968');
check('fnv1a("wang lin")', fnv1a('wang lin'), '10a564b1');
check('hashToNumber("a") is uint32', hashToNumber('a'), parseInt('e40c292c', 16));

// ---------------------------------------------------------------------------
// Park-Miller LCG golden vectors (state starts at 1)
// ---------------------------------------------------------------------------

const pmSteps: Array<[number, number]> = [
  [1, 48271],
  [48271, 182605794],
  [182605794, 1291394886],
  [1291394886, 1914720637],
  [1914720637, 2078669041],
];
let state = 1;
for (let i = 0; i < pmSteps.length; i++) {
  state = lcgStep(state);
  check(`lcgStep[${i + 1}]`, state, pmSteps[i][1]);
}

// Long-run sanity: the sequence must stay inside [1, 2^31-1] and must not
// degenerate (e.g. to 0).
let s = 1;
let degenerate = false;
for (let i = 0; i < 100_000; i++) {
  s = lcgStep(s);
  if (s <= 0 || s >= 2147483647) { degenerate = true; break; }
}
check('lcg 100k steps stay in range', degenerate ? 'degenerate' : 'ok', 'ok');

// ---------------------------------------------------------------------------
// deterministicId
// ---------------------------------------------------------------------------

check('deterministicId stable', deterministicId('cord', 's1', ['a', 1]), deterministicId('cord', 's1', ['a', 1]));
const idChanged = deterministicId('cord', 's1', ['a', 1]) !== deterministicId('cord', 's1', ['a', 2]);
check('deterministicId changes on parts', idChanged ? 'changed' : 'same', 'changed');

// ---------------------------------------------------------------------------

console.log('============================================================');
console.log(`Determinism Primitives Conformance: ${passed} passed, ${failed} failed, ${passed + failed} total`);
process.exit(failed > 0 ? 1 : 0);
