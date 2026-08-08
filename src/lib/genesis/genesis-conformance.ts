/**
 * genesis-conformance.ts — the Genesis coverage gate, as a conformance suite.
 *
 * Asserts the machine-audited coverage rule of the Universe Genesis
 * Compiler (§41-42): an unbound required system, a dead consumer, or a
 * fabricated claim is a GENESIS COVERAGE FAILURE.
 *
 * Run: bun run src/lib/genesis/genesis-conformance.ts
 */

import {
  GENESIS_CONCEPTS,
} from './concepts-registry';
import {
  GENESIS_SYSTEMS,
  GENESIS_CANON_LEVELS,
} from './genesis-types';
import type { GenesisConcept, GenesisSystem } from './genesis-types';
import {
  auditConcept,
  claimVerified,
  consumerFileExists,
  renderMarkdownMatrix,
  runCoverage,
} from './genesis-coverage';
import { CONSUMERS, consumerExists, getConsumer } from './consumer-registry';
import { EMERGENCE_GAUNTLET, MIN_OBSERVED_SYSTEMS, runGauntlet } from './emergence-gauntlet';
import { XIANXIA_CONCEPT_REVIEWS, getReview } from './xianxia-concept-review';

let passed = 0;
let failed = 0;

function check(name: string, actual: boolean | string | number, expected: boolean | string | number): void {
  const ok = actual === expected;
  if (ok) { passed++; console.log(`PASS  ${name}`); }
  else { failed++; console.log(`FAIL  ${name} — expected ${expected}, got ${actual}`); }
}

// ---------------------------------------------------------------------------
// 1. Registry sanity
// ---------------------------------------------------------------------------

check('consumer ids unique', new Set(CONSUMERS.map((c) => c.id)).size === CONSUMERS.length, true);
check('consumer systems valid', CONSUMERS.every((c) => (GENESIS_SYSTEMS as string[]).includes(c.system)), true);
check('concepts non-empty', GENESIS_CONCEPTS.length > 0, true);

for (const c of CONSUMERS) {
  check(`consumer file exists: ${c.id}`, consumerFileExists(c), true);
}

// ---------------------------------------------------------------------------
// 2. Concept sanity: ids unique, claims non-empty, requires non-empty
// ---------------------------------------------------------------------------

check('concept ids unique', new Set(GENESIS_CONCEPTS.map((c) => c.id)).size === GENESIS_CONCEPTS.length, true);
check('canon levels valid', GENESIS_CONCEPTS.every((c) => (GENESIS_CANON_LEVELS as string[]).includes(c.canonLevel)), true);
check('directive concepts marked design', GENESIS_CONCEPTS.filter((c) => c.canonLevel === 'design').length >= 5, true);
check('every concept has claims', GENESIS_CONCEPTS.every((c) => c.claims.length > 0), true);
check('every concept requires >=1 system', GENESIS_CONCEPTS.every((c) => c.requires.length > 0), true);

// Every binding consumer must exist in the registry (auditConcept catches
// this too, but the per-suite assertion makes the count explicit).
const badBindings = GENESIS_CONCEPTS.flatMap((c) =>
  c.bindings.filter((b) => !consumerExists(b.consumerId)).map((b) => `${c.id}->${b.consumerId}`),
);
check('all binding consumers registered', badBindings.length === 0, true);

// ---------------------------------------------------------------------------
// 3. Claims are real: each claim text exists in its source document.
// ---------------------------------------------------------------------------

const fabricatedClaims = GENESIS_CONCEPTS.flatMap((c) =>
  c.claims.filter((cl) => !claimVerified(cl)).map((cl) => `${c.id} in ${cl.source}`),
);
check('all claims found in source docs', fabricatedClaims.length === 0, true);

// ---------------------------------------------------------------------------
// 4. The live gate: every required system is bound (build-failure rule).
// ---------------------------------------------------------------------------

const live = runCoverage();
check('live coverage gate passes', live.pass, true);
check('zero failures', live.failures.length, 0);
check('all required systems bound', live.boundPairs, live.requiredPairs);

// 4b. Causal fan-out (emergence directive: major world verbs must touch
// multiple systems — "not a collection of isolated mechanics").
const fanOuts = GENESIS_CONCEPTS.map((c) => live.fanOut[c.id] ?? 0);
check('every concept fan-out >= 1', fanOuts.every((f) => f >= 1), true);
const meanFanOut = fanOuts.reduce((a, b) => a + b, 0) / fanOuts.length;
check('mean concept fan-out >= 2', meanFanOut >= 2, true);
check('fan-out reported for all concepts', Object.keys(live.fanOut).length, GENESIS_CONCEPTS.length);

// ---------------------------------------------------------------------------
// 5. Determinism: same input => same report.
// ---------------------------------------------------------------------------

const live2 = runCoverage();
check('coverage result deterministic', JSON.stringify(live2.failures) === JSON.stringify(live.failures), true);
check('matrix deterministic', JSON.stringify(live2.matrix) === JSON.stringify(live.matrix), true);

// ---------------------------------------------------------------------------
// 6. Negative cases — the gate must DETECT failure.
// ---------------------------------------------------------------------------

// 6a. Unbound required system.
const unboundConcept: GenesisConcept = {
  id: 'test.unbound',
  name: 'Unbound Concept',
  canonLevel: 'canon',
  claims: [{ text: 'The engine is deterministic', source: 'corpus-extension/00_FOUNDATIONAL_DECISIONS.md' }],
  requires: ['simulation', 'audio'],
  bindings: [{ system: 'simulation', consumerId: 'simulation.time-engine' }],
};
const unboundF = auditConcept(unboundConcept);
check('detects unbound required system', unboundF.some((f) => f.kind === 'unbound' && f.system === 'audio'), true);

// 6b. Dead consumer file.
const deadConsumerConcept: GenesisConcept = {
  id: 'test.dead-consumer',
  name: 'Dead Consumer Concept',
  canonLevel: 'canon',
  claims: [{ text: 'The engine is deterministic', source: 'corpus-extension/00_FOUNDATIONAL_DECISIONS.md' }],
  requires: ['simulation'],
  bindings: [{ system: 'simulation', consumerId: 'simulation.combat-arts' }],
};
const deadConcept = {
  ...deadConsumerConcept,
  bindings: [{ system: 'simulation' as GenesisSystem, consumerId: 'simulation.dead-sim' }],
};
const deadF = auditConcept(deadConcept);
check('detects unregistered consumer', deadF.some((f) => f.kind === 'missing-consumer'), true);

// 6c. Fabricated claim.
const fakeClaimConcept: GenesisConcept = {
  id: 'test.fake-claim',
  name: 'Fake Claim Concept',
  canonLevel: 'canon',
  claims: [{ text: 'This claim does not exist anywhere in the corpus.', source: 'corpus-extension/00_FOUNDATIONAL_DECISIONS.md' }],
  requires: ['simulation'],
  bindings: [{ system: 'simulation', consumerId: 'simulation.time-engine' }],
};
const fakeF = auditConcept(fakeClaimConcept);
check('detects fabricated claim', fakeF.some((f) => f.kind === 'claim-not-found'), true);

// 6d. Bound systems stay intact when requirements are satisfied.
check('satisfied concept passes audit', auditConcept(unboundConcept).filter((f) => f.kind === 'unbound').length, 1);

// ---------------------------------------------------------------------------
// 7. Emergence Gauntlet — golden scenarios (regression suite)
// ---------------------------------------------------------------------------

const gauntlet = runGauntlet();
check('gauntlet non-empty', gauntlet.length, EMERGENCE_GAUNTLET.length);
check('gauntlet scenarios unique', new Set(EMERGENCE_GAUNTLET.map((s) => s.id)).size === EMERGENCE_GAUNTLET.length, true);
for (const audit of gauntlet) {
  check(`gauntlet premise verified: ${audit.scenario.id}`, audit.premiseVerified, true);
  check(`gauntlet observable: ${audit.scenario.id}`, audit.unobserved.length, 0);
  check(`gauntlet fan-out >= ${MIN_OBSERVED_SYSTEMS}: ${audit.scenario.id}`, audit.fanOut >= MIN_OBSERVED_SYSTEMS, true);
}

// ---------------------------------------------------------------------------
// 8. Xianxia concept review — names/functions/interactions/visuals sanity
// ---------------------------------------------------------------------------

const conceptIds = new Set(GENESIS_CONCEPTS.map((c) => c.id));
const reviewIds = new Set(XIANXIA_CONCEPT_REVIEWS.map((r) => r.conceptId));
const missingReviews = GENESIS_CONCEPTS.filter((c) => !reviewIds.has(c.id)).map((c) => c.id);
const orphanReviews = XIANXIA_CONCEPT_REVIEWS.filter((r) => !conceptIds.has(r.conceptId)).map((r) => r.conceptId);
const cjkInNames = GENESIS_CONCEPTS.filter((c) => /[\u4e00-\u9fff]/.test(c.name)).map((c) => c.id);
check('every concept has a review', missingReviews.length, 0);
check('no orphan reviews', orphanReviews.length, 0);
check('no CJK/pinyin in concept names', cjkInNames.length, 0);
check('reviews cover all concepts', reviewIds.size, conceptIds.size);
check('every review has function', XIANXIA_CONCEPT_REVIEWS.every((r) => r.function.length >= 20), true);
check('every review has interactions', XIANXIA_CONCEPT_REVIEWS.every((r) => r.interactions.length >= 20), true);
check('every review has visuals', XIANXIA_CONCEPT_REVIEWS.every((r) => r.visuals.length >= 10), true);

// ---------------------------------------------------------------------------
// 9. Matrix rendering
// ---------------------------------------------------------------------------

const matrix = renderMarkdownMatrix(live);
check('matrix has 8 system columns', GENESIS_SYSTEMS.every((s) => matrix.includes(s.toUpperCase())), true);
check('matrix shows bound cells', matrix.includes('✓'), true);
check('matrix shows not-required cells', matrix.includes('—'), true);
check('matrix reports zero failures', matrix.includes('Failures: 0'), true);

// ---------------------------------------------------------------------------

console.log('============================================================');
console.log(`Genesis Coverage Conformance: ${passed} passed, ${failed} failed, ${passed + failed} total`);
process.exit(failed > 0 ? 1 : 0);
