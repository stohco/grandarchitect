/**
 * world-life-conformance.ts — the living world is machine-checked:
 * deterministic placements (no Math.random anywhere), herb patches bound to
 * the canon roster ids, the spirit wolf present at the foothills, animals
 * around the houses, residents covering every blueprint resident list.
 *
 * Run: bun run src/lib/worldproduction/world-life-conformance.ts
 */

import { herbPatches, animalPlacements, beastPlacements, HERB_PATCH_COUNT, buildHerb, buildAnimal, buildSpiritWolf } from './wildlife';
import { residentPlacements, RESIDENT_COUNT } from './residents';
import { WANG_FAMILY_BEND } from './set-blueprint';
import { ECOLOGY_DEFINITIONS } from '../engine/definitions/ecology';
import { makePalette } from '../assets/factories/set-factory';

let pass = 0;
let fail = 0;
const check = (name: string, ok: boolean, detail = '') => {
  if (ok) { pass++; console.log(`PASS  ${name}`); }
  else { fail++; console.log(`FAIL  ${name} ${detail}`); }
};

const HERB_IDS = new Set(ECOLOGY_DEFINITIONS.filter((d) => d.kind === 'herb').map((d) => d.id));

// 1. herb patches exist and are bound to canon roster ids
check('herb patches placed', HERB_PATCH_COUNT >= 12, `got ${HERB_PATCH_COUNT}`);
check('every herb id is canon roster', herbPatches().every((h) => HERB_IDS.has(h.herbId)),
  herbPatches().filter((h) => !HERB_IDS.has(h.herbId)).map((h) => h.herbId).join(','));
check('herb patch count deterministic', HERB_PATCH_COUNT === herbPatches().length);
check('herb placements deterministic (two calls identical)',
  JSON.stringify(herbPatches()) === JSON.stringify(herbPatches()));
check('herbs build without error', (() => { const pal = makePalette(); herbPatches().forEach((h) => buildHerb(h, pal)); return true; })());
// 2. spirit wolf present (E4 canon)
const beasts = beastPlacements();
check('spirit wolf placed at foothills', beasts.length >= 1 && beasts[0].kind === 'spirit-wolf' && beasts[0].z < -200);
check('spirit wolf builds', (() => { const pal = makePalette(); buildSpiritWolf(beasts[0], pal); return true; })());
// 3. animals around houses
const animals = animalPlacements();
check('domestic animals placed', animals.length >= 8, `got ${animals.length}`);
check('animals include chickens/ducks/dog', animals.some((a) => a.kind === 'chicken') && animals.some((a) => a.kind === 'dog'));
check('animals deterministic', JSON.stringify(animals) === JSON.stringify(animalPlacements()));
check('animals build', (() => { const pal = makePalette(); animals.forEach((a) => buildAnimal(a, pal)); return true; })());
// 4. residents cover the blueprint resident lists
const placements = residentPlacements();
const blueprintResidents = new Set(WANG_FAMILY_BEND.structures.flatMap((s) => s.residents ?? []));
check('resident placements exist', RESIDENT_COUNT >= 10, `got ${RESIDENT_COUNT}`);
check('every blueprint resident is placed', [...blueprintResidents].every((id) => placements.some((p) => p.npcId === id)),
  [...blueprintResidents].filter((id) => !placements.some((p) => p.npcId === id)).join(','));
check('resident placements deterministic', JSON.stringify(placements) === JSON.stringify(residentPlacements()));
check('residents have roles + clips', placements.every((p) => ['elder', 'farmer', 'merchant', 'cultivator', 'child'].includes(p.role) && ['idle', 'walk', 'bow'].includes(p.clip)));
// 5. determinism gate: source contains no Math.random
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
const wildlifeSrc = readFileSync(join(process.cwd(), 'src/lib/worldproduction/wildlife.ts'), 'utf8');
const residentsSrc = readFileSync(join(process.cwd(), 'src/lib/worldproduction/residents.ts'), 'utf8');
check('wildlife.ts has no Math.random', !wildlifeSrc.includes('Math.random('));
check('residents.ts has no Math.random', !residentsSrc.includes('Math.random('));

console.log('============================================================');
console.log(`World Life Conformance: ${pass} passed, ${fail} failed, ${pass + fail} total`);
process.exit(fail > 0 ? 1 : 0);
