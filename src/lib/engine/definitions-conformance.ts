/**
 * definitions-conformance.ts — wiki-scale Definition Database audit.
 *
 * Audits the authored canon content database (the "wiki schema" layer):
 * unique ids, valid kinds, valid simulation hooks, present sources,
 * non-trivial descriptions, and NO dangling relation targets (a harsh
 * critic: a relation to a nonexistent entry is a canon integrity failure).
 *
 * Run: bun run src/lib/engine/definitions-conformance.ts
 */

import {
  ALL_DEFINITIONS,
  DEFINITION_TOTAL,
} from './definitions/index';
import type { Definition } from './definitions';

let passed = 0;
let failed = 0;

function check(name: string, actual: boolean | string | number, expected: boolean | string | number): void {
  const ok = actual === expected;
  if (ok) { passed++; console.log(`PASS  ${name}`); }
  else { failed++; console.log(`FAIL  ${name} — expected ${expected}, got ${actual}`); }
}

const KINDS = new Set([
  'metaphysical_essence', 'realm', 'technique', 'cultivation_practice',
  'treasure', 'herb', 'beast', 'mineral', 'formation', 'talisman',
  'pill', 'forging_recipe', 'manual', 'sect', 'lineage', 'location',
  'culture', 'npc_role', 'event', 'deviation', 'institution', 'law',
  'cosmological_feature', 'skill', 'status_effect', 'custom',
]);

const HOOKS = new Set([
  'ecology', 'weather', 'combat', 'economy', 'cultivation', 'deviation',
  'social', 'history', 'rendering', 'audio', 'physics', 'perception',
  'save', 'migration', 'trade', 'politics', 'ritual', 'disease', 'aging',
  'reproduction',
]);

// ---------------------------------------------------------------------------
// 1. Database scale (wiki ambition: hundreds now, thousands target)
// ---------------------------------------------------------------------------

check('database non-empty', DEFINITION_TOTAL > 0, true);
check('database grew to wiki scale (>= 250)', DEFINITION_TOTAL >= 250, true);
check('every kind used is registered', ALL_DEFINITIONS.every((d) => KINDS.has(d.kind)), true);
check('every hook used is registered', ALL_DEFINITIONS.every((d) => d.simulationHooks.every((h) => HOOKS.has(h))), true);

// ---------------------------------------------------------------------------
// 2. Structural integrity
// ---------------------------------------------------------------------------

const ids = ALL_DEFINITIONS.map((d) => d.id);
const dupes = ids.filter((id, i) => ids.indexOf(id) !== i);
check('ids unique', dupes.length, 0);
check('every id namespaced (domain.)', ALL_DEFINITIONS.every((d) => /^[a-z_]+\./.test(d.id)), true);
check('every description >= 20 chars', ALL_DEFINITIONS.every((d) => d.description.length >= 20), true);
check('every source present', ALL_DEFINITIONS.every((d) => (d.source ?? '').length > 0), true);
check('every version present', ALL_DEFINITIONS.every((d) => (d.version ?? '').length > 0), true);
check('every entry has >= 1 hook', ALL_DEFINITIONS.every((d) => d.simulationHooks.length > 0), true);

// ---------------------------------------------------------------------------
// 3. Relation integrity (no dangling targets)
// ---------------------------------------------------------------------------

const idSet = new Set(ids);
const dangling = ALL_DEFINITIONS.flatMap((d) =>
  d.relations
    .filter((r) => !idSet.has(r.target))
    .map((r) => `${d.id} -> ${r.type}:${r.target}`),
);
check('no dangling relation targets', dangling.length, 0);
if (dangling.length > 0) {
  for (const d of dangling.slice(0, 20)) console.log(`      dangling: ${d}`);
}

// ---------------------------------------------------------------------------
// 4. Layer coverage (each wiki layer contributed)
// ---------------------------------------------------------------------------

const layerCounts: Record<string, number> = {};
for (const d of ALL_DEFINITIONS) {
  const prefix = d.id.split('.')[0];
  layerCounts[prefix] = (layerCounts[prefix] ?? 0) + 1;
}
const layerOrder = ['essence', 'realm', 'deviation', 'technique', 'practice', 'location', 'npc', 'pill', 'talisman', 'formation', 'treasure', 'beast', 'herb', 'mineral', 'sect', 'region', 'vein', 'place', 'lineage', 'institution', 'event', 'skill'];
const missingLayers = layerOrder.filter((l) => !layerCounts[l]);
check('no canonical layer empty', missingLayers.length, 0);
check('npc layer populated', (layerCounts['npc'] ?? 0) >= 20, true);
check('beast layer populated', (layerCounts['beast'] ?? 0) >= 10, true);
check('herb layer populated', (layerCounts['herb'] ?? 0) >= 10, true);
check('pill layer populated', (layerCounts['pill'] ?? 0) >= 5, true);
check('talisman layer populated', (layerCounts['talisman'] ?? 0) >= 5, true);
check('sect layer populated', (layerCounts['sect'] ?? 0) >= 5, true);
check('place/region layer populated', ((layerCounts['place'] ?? 0) + (layerCounts['region'] ?? 0)) >= 10, true);

// ---------------------------------------------------------------------------

console.log('============================================================');
console.log(`Definition Database Conformance: ${passed} passed, ${failed} failed, ${passed + failed} total`);
console.log(`Definitions: ${DEFINITION_TOTAL} (layers: ${Object.entries(layerCounts).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k}=${v}`).join(' ')})`);
process.exit(failed > 0 ? 1 : 0);
