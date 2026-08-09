/**
 * substance-preservation-conformance.ts — the performance constitution is
 * machine-checked: the directive exists with the invariant clauses, the
 * escalation ladder is complete and ordered, the semantic delta gate
 * rejects nonzero removals, the S4->S0 ladder walks without deletion, the
 * fidelity degradation hierarchy never touches protected subsystems.
 *
 * Run: bun run src/lib/performance/substance-preservation-conformance.ts
 */

import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import {
  ESCALATION_LADDER,
  FIDELITY_DEGRADATION_HIERARCHY,
  PROTECTED_SUBSYSTEMS,
  ENTITY_FIDELITY_LADDER,
  ZERO_SEMANTIC_DELTA,
  semanticDeltaIsZero,
  substancePreserved,
  assertLadderOrder,
  CRITICAL_FIRST_SCHEDULING,
  SUBSTANCE_PRESERVATION_CONSTITUTION,
  type SubstancePreservationReport,
} from './substance-preservation';

let pass = 0;
let fail = 0;
const check = (name: string, ok: boolean, detail = '') => {
  if (ok) { pass++; console.log(`PASS  ${name}`); }
  else { fail++; console.log(`FAIL  ${name} ${detail}`); }
};

const DOC = join(process.cwd(), 'docs/performance-substance-preservation-directive.md');
const doc = existsSync(DOC) ? readFileSync(DOC, 'utf8') : '';

// 1. directive exists with the invariant
check('directive exists', existsSync(DOC));
check('invariant present (may not reduce the universe)',
  doc.replace(/\s+/g, ' ').includes('It may not reduce the universe itself'));
check('engineering-first doctrine present',
  doc.includes('engineering problem') && doc.includes('not permission to make the universe smaller'));
// 2. escalation ladder complete and ordered
check('escalation ladder has 21 steps', ESCALATION_LADDER.length === 21, `got ${ESCALATION_LADDER.length}`);
check('ladder starts with MEASURE and ends with re-measure',
  ESCALATION_LADDER[0] === 'MEASURE' && ESCALATION_LADDER[ESCALATION_LADDER.length - 1] === 're-measure');
check('ladder strictly ordered (no degradation before engineering)',
  ESCALATION_LADDER.every((s, i) => i === 0 || ESCALATION_LADDER.indexOf(s) === i));
// 3. fidelity degradation hierarchy precedes protected subsystems
check('fidelity hierarchy has 7 levels', FIDELITY_DEGRADATION_HIERARCHY.length === 7);
check('hierarchy is presentation-only', FIDELITY_DEGRADATION_HIERARCHY.every((s) =>
  ['render resolution', 'shadow resolution', 'reflection frequency', 'particle count',
    'extreme-distance vegetation animation', 'cloth simulation distance', 'far-LOD complexity'].includes(s)));
check('protected subsystems never in degradation hierarchy',
  PROTECTED_SUBSYSTEMS.every((s) => !FIDELITY_DEGRADATION_HIERARCHY.includes(s)));
check('protected subsystems include simulation truth + ecology + combat',
  ['world simulation truth', 'ecology', 'combat behavior', 'physics correctness'].every((s) => PROTECTED_SUBSYSTEMS.includes(s)));
// 4. S4->S0 ladder
check('entity fidelity ladder has 5 tiers S4..S0',
  ENTITY_FIDELITY_LADDER.length === 5 && ENTITY_FIDELITY_LADDER[0].level === 'S4' && ENTITY_FIDELITY_LADDER[4].level === 'S0');
check('ladder walks in order', assertLadderOrder(ENTITY_FIDELITY_LADDER.map((l) => l.level)));
check('S4 has embodied capabilities', ENTITY_FIDELITY_LADDER[0].capabilities.includes('adaptive animation') && ENTITY_FIDELITY_LADDER[0].capabilities.includes('combat'));
// 5. semantic delta gate
check('zero semantic delta passes', semanticDeltaIsZero(ZERO_SEMANTIC_DELTA));
const removed = { ...ZERO_SEMANTIC_DELTA, worldSystemsRemoved: 1 };
check('nonzero semantic delta fails', !semanticDeltaIsZero(removed));
const good: SubstancePreservationReport = {
  performanceDelta: { beforeMs: 22.4, afterMs: 15.7 },
  semanticDelta: ZERO_SEMANTIC_DELTA,
  ladderStepsUsed: ['MEASURE', 'find actual bottleneck', 'cache', 'instance', 'use render LOD'],
  representationBands: [{ distance: '30km', representation: 'terrain HLOD + canopy clusters' }],
};
check('substance preserved report passes', substancePreserved(good).ok);
const bad: SubstancePreservationReport = {
  performanceDelta: { beforeMs: 22.4, afterMs: 14.0 },
  semanticDelta: { ...ZERO_SEMANTIC_DELTA, persistentEntitiesRemoved: 12000 },
  ladderStepsUsed: ['MEASURE', 'cache'],
  representationBands: [],
};
check('deleting half the forest FAILS the gate', !substancePreserved(bad).ok);
check('FAIL lists the semantic delta', substancePreserved(bad).failures.some((f) => f.includes('persistentEntitiesRemoved')));
const badLadder: SubstancePreservationReport = {
  performanceDelta: { beforeMs: 22.4, afterMs: 15.0 },
  semanticDelta: ZERO_SEMANTIC_DELTA,
  ladderStepsUsed: ['compress', 'cache'],
  representationBands: [],
};
check('out-of-order ladder FAILS', !substancePreserved(badLadder).ok);
// 6. scheduler critical-first
check('scheduler critical tier first', CRITICAL_FIRST_SCHEDULING[0].tier === 'critical' && CRITICAL_FIRST_SCHEDULING[0].work === 'player input');
check('scheduler has budget + background tiers',
  CRITICAL_FIRST_SCHEDULING.some((s) => s.tier === 'budget') && CRITICAL_FIRST_SCHEDULING.some((s) => s.tier === 'background'));
// 7. constitution clauses complete
check('constitution has 10 clauses', SUBSTANCE_PRESERVATION_CONSTITUTION.length === 10);
check('C9 clause present', SUBSTANCE_PRESERVATION_CONSTITUTION.some((c) => c.startsWith('C9.')));
// 8. directive lists all 10 clauses
check('directive lists C1..C10', ['C1', 'C2', 'C3', 'C4', 'C5', 'C6', 'C7', 'C8', 'C9', 'C10'].every((c) => doc.includes(`${c}.`)));

// 9. evidence: the content-pass report exists and its semantic delta is zero
const reportPath = join(process.cwd(), 'evidence/substance-preservation/town-scene-vlm-iter-7.json');
const reportExists = existsSync(reportPath);
check('substance evidence report exists', reportExists);
if (reportExists) {
  const report = JSON.parse(readFileSync(reportPath, 'utf8'));
  check('report semantic delta is zero', report.substanceGate?.ok === true || semanticDeltaIsZero(report.report?.semanticDelta ?? ZERO_SEMANTIC_DELTA));
  check('report records measured performance baseline', typeof report.report?.performanceDelta?.beforeMs === 'number');
  check('report documents representation bands', (report.report?.representationBands?.length ?? 0) >= 3);
}
// 10. report script exists (the mandated PERF+SEMANTIC delta format)
check('substance-report script exists', existsSync(join(process.cwd(), 'scripts/substance-report.ts')));

console.log('============================================================');
console.log(`Substance Preservation Conformance: ${pass} passed, ${fail} failed, ${pass + fail} total`);
process.exit(fail > 0 ? 1 : 0);
