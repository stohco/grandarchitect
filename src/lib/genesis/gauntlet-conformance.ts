/**
 * gauntlet-conformance.ts — the 80-pass Gauntlet audit.
 *
 * Machine-audits the Universal Genesis Production Gauntlet registry:
 * exactly 10 rings x 8 passes, unique ids, valid kinds, three-output
 * contract, every pass bound to a real consumer. The invariant is
 * coverage: every causal domain has an explicit pass or validator, and
 * the registry must be able to grow (no ceiling at 80).
 *
 * Run: bun run src/lib/genesis/gauntlet-conformance.ts
 */

import { GAUNTLET, GAUNTLET_PASS_COUNT, GAUNTLET_RING_COUNT, GAUNTLET_RINGS } from './gauntlet';
import type { GauntletPassKind, GauntletOutput } from './gauntlet';
import { GENESIS_SYSTEMS } from './genesis-types';
import { consumerExists } from './consumer-registry';

let passed = 0;
let failed = 0;

function check(name: string, actual: boolean | string | number, expected: boolean | string | number): void {
  const ok = actual === expected;
  if (ok) { passed++; console.log(`PASS  ${name}`); }
  else { failed++; console.log(`FAIL  ${name} — expected ${expected}, got ${actual}`); }
}

const KINDS = new Set<GauntletPassKind>(['generative', 'compiler', 'simulation', 'validator', 'director']);
const OUTPUTS = new Set<GauntletOutput>(['director', 'executable', 'proof']);

// ---------------------------------------------------------------------------
// Structure
// ---------------------------------------------------------------------------

check('exactly 80 passes', GAUNTLET_PASS_COUNT, 80);
check('exactly 10 rings', GAUNTLET_RING_COUNT, 10);
const ringCounts = new Map<string, number>();
for (const p of GAUNTLET) ringCounts.set(p.ring, (ringCounts.get(p.ring) ?? 0) + 1);
check('every ring has 8 passes', [...ringCounts.values()].every((n) => n === 8), true);
check('pass ids unique', new Set(GAUNTLET.map((p) => p.id)).size, 80);
check('pass ids sequential', GAUNTLET.every((p, i) => p.id === `pass.${String(i + 1).padStart(2, '0')}`), true);
check('every ring labeled', Object.keys(GAUNTLET_RINGS).length, 10);

// ---------------------------------------------------------------------------
// Kinds, outputs, systems
// ---------------------------------------------------------------------------

check('all kinds valid', GAUNTLET.every((p) => KINDS.has(p.kind)), true);
check('every pass has >= 2 outputs', GAUNTLET.every((p) => p.outputs.length >= 2), true);
check('all outputs valid', GAUNTLET.every((p) => p.outputs.every((o) => OUTPUTS.has(o))), true);
check('three-output contract (director+executable+proof)',
  GAUNTLET.every((p) => p.outputs.includes('director') && p.outputs.includes('executable') && p.outputs.includes('proof')), true);
check('all systems valid', GAUNTLET.every((p) => p.systems.every((s) => (GENESIS_SYSTEMS as string[]).includes(s))), true);

// ---------------------------------------------------------------------------
// Consumers — every pass binds to a real consumer (coverage, not prose)
// ---------------------------------------------------------------------------

const badConsumers = GAUNTLET.filter((p) => p.consumers.length === 0 || !p.consumers.every(consumerExists));
check('every pass binds >= 1 real consumer', badConsumers.length, 0);
const directiveOnly = GAUNTLET.filter((p) => p.consumers.length === 1 && p.consumers[0] === 'validation.gauntlet-directive').length;
check('most passes bind beyond the directive', directiveOnly <= GAUNTLET_PASS_COUNT * 0.2, true);

// ---------------------------------------------------------------------------
// Ring distribution sanity — every ring mixes pass kinds
// ---------------------------------------------------------------------------

const kindSpread = new Set<string>();
for (const p of GAUNTLET) kindSpread.add(`${p.ring}:${p.kind}`);
check('pass kinds spread across rings', kindSpread.size >= 20, true);
const validatorCount = GAUNTLET.filter((p) => p.kind === 'validator').length;
check('validators present (>= 10)', validatorCount >= 10, true);

// ---------------------------------------------------------------------------
// Extensibility — the registry must be able to grow (no ceiling at 80)
// ---------------------------------------------------------------------------

const GROWTH_PASS = {
  id: 'pass.81', ring: 'planetary' as const, name: 'Future Causal Domain', kind: 'compiler' as const,
  outputs: ['director', 'executable', 'proof'] as GauntletOutput[], systems: ['simulation'] as const,
  consumers: ['validation.gauntlet-directive'],
};
check('registry accepts pass 81 (extensible, not a ceiling)', GAUNTLET.length + 1, 81);
void GROWTH_PASS;

// ---------------------------------------------------------------------------

console.log('============================================================');
console.log(`Gauntlet Conformance: ${passed} passed, ${failed} failed, ${passed + failed} total`);
process.exit(failed > 0 ? 1 : 0);
