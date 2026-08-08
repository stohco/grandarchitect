/**
 * vision-contract-conformance.ts — the Perceptual Evidence Examiner is a
 * formal evidence provider, so its contract must be machine-checked:
 * obligations bound to real gauntlet passes, the manifest builder working,
 * the constitution on disk, the harness wiring, honest NOT_EVALUABLE
 * declarations, and no pass marked PASS by description alone.
 *
 * Run: bun run src/lib/worldproduction/vision-contract-conformance.ts
 */

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { GAUNTLET } from '../genesis/gauntlet';
import {
  VISUAL_OBLIGATIONS,
  applicablePassesForLocation,
  buildInspectionManifest,
  renderInspectionManifest,
} from './vision-contract';
import { compileSceneSlice } from './scene-universe-slice';

let pass = 0;
let fail = 0;
const check = (name: string, ok: boolean, detail = '') => {
  if (ok) { pass++; console.log(`PASS  ${name}`); }
  else { fail++; console.log(`FAIL  ${name} ${detail}`); }
};

const GAUNTLET_IDS = new Set(GAUNTLET.map((p) => p.id));
const OBLIGATIONS = VISUAL_OBLIGATIONS;

// 1. every obligation binds a REAL gauntlet pass
check('every visual obligation binds a real gauntlet pass',
  OBLIGATIONS.every((o) => GAUNTLET_IDS.has(o.passId)),
  OBLIGATIONS.filter((o) => !GAUNTLET_IDS.has(o.passId)).map((o) => o.passId).join(','));
// 2. display ids unique and sequential P## format
check('display ids unique', new Set(OBLIGATIONS.map((o) => o.displayId)).size === OBLIGATIONS.length);
check('display ids match pass ids', OBLIGATIONS.every((o) => o.displayId === `P${o.passId.slice(5)}`));
// 3. obligations are non-trivial (real perceptual requirements)
check('obligations are non-trivial', OBLIGATIONS.every((o) => o.visualObligation.length >= 40));
// 4. every ring is represented
check('rings represented', new Set(OBLIGATIONS.map((o) => o.ring)).size >= 8,
  [...new Set(OBLIGATIONS.map((o) => o.ring))].join(','));
// 5. NOT_EVALUABLE honesty — simulation-only passes are declared, not faked
const ne = OBLIGATIONS.filter((o) => o.notVisuallyEvaluable);
check('NOT_EVALUABLE passes are declared', ne.length >= 1 && ne.some((o) => o.displayId === 'P53'));
check('no obligation is both evaluable and fake', OBLIGATIONS.filter((o) => !o.notVisuallyEvaluable).every((o) => !o.visualObligation.includes('simulation runs')));
// 6. manifest builder works
const m = buildInspectionManifest({ inspectionId: 'test.001', worldRevision: 1, timestamp: 1, locationId: 'structure.cache_hill' });
check('manifest has applicable passes', m.applicablePasses.length >= 5);
check('manifest includes universal P67 + P72', m.applicablePasses.some((p) => p.id === 'P67') && m.applicablePasses.some((p) => p.id === 'P72'));
check('manifest render is JSON', (() => { try { JSON.parse(renderInspectionManifest(m)); return true; } catch { return false; } })());
// 7. location-driven selection works (cache = formation/ecology/materials passes)
const cachePasses = applicablePassesForLocation('structure.cache_hill').map((p) => p.id);
check('cache slice selects formation passes', cachePasses.includes('P29'));
check('cache slice selects ecology passes', cachePasses.includes('P14'));
check('cache slice selects gameplay affordances', cachePasses.includes('P33'));
// 8. no phantom pass ids in the manifest
check('manifest passes all bound', m.applicablePasses.every((p) => OBLIGATIONS.some((o) => o.displayId === p.id)));
// 9. contract doc + harness exist on disk
check('contract doc exists', existsSync(join(process.cwd(), 'docs/vision-inspection-contract.md')));
check('harness exists', existsSync(join(process.cwd(), 'scripts/vision-inspect.ts')));
// 10. constitution integrity: authority rules present (custom canon, not Er Gen)
const contract = existsSync(join(process.cwd(), 'docs/vision-inspection-contract.md'))
  ? readFileSync(join(process.cwd(), 'docs/vision-inspection-contract.md'), 'utf8') : '';
check('contract enforces custom canon', contract.includes('ORIGINAL CUSTOM XIANXIA UNIVERSE'));
check('contract has blind-read phase', contract.includes('BLIND PLAYER READ'));
check('contract has genesis pass coverage phase', contract.includes('PHASE X'));
check('contract has edit-scope diagnosis', contract.includes('EDIT-SCOPE'));
check('contract has anti-self-deception rules', contract.includes('ANTI-SELF-DECEPTION'));
check('contract has AAA completeness question', contract.includes('AAA COMPLETENESS'));
check('contract has channel split', contract.includes('VISION') && contract.includes('PHYSICS'));
// 11. every scene slice compiles for manifest location selection
check('slice compile works for manifest', compileSceneSlice('structure.cache_hill').sections.length >= 16);

console.log('============================================================');
console.log(`Vision Contract Conformance: ${pass} passed, ${fail} failed, ${pass + fail} total`);
process.exit(fail > 0 ? 1 : 0);
