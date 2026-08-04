/**
 * ga:gen-settlement Conformance Test
 * Tests deterministic settlement generation from seed.
 * Two runs with same seed must produce identical output.
 * No forbidden functions. No Three.js, no DOM.
 */

import {
  generateSettlement,
  createSettlementGenApi,
  createSettlementGenPlugin,
  type SettlementLayout,
  type GeneratedStructure,
  type HouseholdData,
  type StructureKind,
  type Vec2,
} from './ga-gen-settlement';

import { createPluginHost } from '../../kernel/plugin-host';

// ============================================================================
// Test harness
// ============================================================================

let passed = 0;
let failed = 0;

function assert(condition: boolean, msg: string) {
  if (condition) { passed++; console.log(`  ✅ ${msg}`); }
  else { failed++; console.log(`  ❌ ${msg}`); }
}

function safeStringify(obj: unknown): string {
  return JSON.stringify(obj, (_, v) => typeof v === 'bigint' ? String(v) : v);
}

function assertEq<T>(actual: T, expected: T, msg: string) {
  const a = safeStringify(actual);
  const e = safeStringify(expected);
  if (a === e) { passed++; console.log(`  ✅ ${msg}`); }
  else { failed++; console.log(`  ❌ ${msg} — expected ${e}, got ${a}`); }
}

function assertClose(actual: number, expected: number, msg: string, eps = 0.01) {
  if (Math.abs(actual - expected) < eps) { passed++; console.log(`  ✅ ${msg}`); }
  else { failed++; console.log(`  ❌ ${msg} — got ${actual}, expected ${expected}`); }
}

// ============================================================================
console.log('=== SECTION 1: Default generation ===');

{
  const layout = generateSettlement({ seed: 'test-seed-123' });
  assertEq(layout.villageName, 'Wang Family Bend', 'village name default');
  assertEq(layout.villageNameHanzi, '王 家彎', 'village name hanzi');
  assertEq(layout.seed, 'test-seed-123', 'seed preserved');
  assert(layout.householdCount === 31, 'default 31 households');
  assert(layout.population > 0, 'population > 0');
  assert(layout.structures.length > 0, 'structures generated');
}

// ============================================================================
console.log('=== SECTION 2: Determinism — same seed = same output ===');

{
  const a = generateSettlement({ seed: 'determinism-test-alpha' });
  const b = generateSettlement({ seed: 'determinism-test-alpha' });
  assertEq(safeStringify(a), safeStringify(b), 'identical output from same seed');
}

// ============================================================================
console.log('=== SECTION 3: Different seeds = different output ===');

{
  const a = generateSettlement({ seed: 'seed-A' });
  const b = generateSettlement({ seed: 'seed-B' });
  // At least some structures should differ
  const same = a.structures.length === b.structures.length &&
    a.structures.every((s, i) =>
      s.position.x === b.structures[i].position.x &&
      s.position.z === b.structures[i].position.z
    );
  assert(!same, 'different seeds produce different layouts');
}

// ============================================================================
console.log('=== SECTION 4: Required structures present ===');

{
  const layout = generateSettlement({ seed: 'structures-test' });
  const kinds = new Set(layout.structures.map(s => s.kind));

  assert(kinds.has('lineage_hall'), 'has lineage hall');
  assert(kinds.has('household'), 'has households');
  assert(kinds.has('well'), 'has well');
  assert(kinds.has('threshing_ground'), 'has threshing ground');
  assert(kinds.has('mill'), 'has mill');
  assert(kinds.has('spirit_shrine'), 'has spirit shrine');
  assert(kinds.has('dock'), 'has dock');
  assert(kinds.has('paddy'), 'has paddies');
  assert(kinds.has('dryland_garden'), 'has dryland gardens');
  assert(kinds.has('graveyard'), 'has graveyard');
  assert(kinds.has('levee'), 'has levee');
}

// ============================================================================
console.log('=== SECTION 5: Named households ===');

{
  const layout = generateSettlement({ seed: 'named-households-test' });
  const householdStructs = layout.structures.filter(s => s.kind === 'household' && s.metadata.named === true);
  assertEq(householdStructs.length, 5, '5 named household structures');

  const names = householdStructs.map(s => s.metadata.headName as string);
  assert(names.includes('Wang Shouzheng'), 'Wang Shouzheng present');
  assert(names.includes('Wang Shouye'), 'Wang Shouye present');
  assert(names.includes('Master Hu'), 'Master Hu present');
  assert(names.includes('Lin Aqiao'), 'Lin Aqiao present');
  assert(names.includes('Widow Xu'), 'Widow Xu present');
}

// ============================================================================
console.log('=== SECTION 6: Named household data integrity ===');

{
  const layout = generateSettlement({ seed: 'household-data-test' });

  // Wang Shouzheng: lineage head
  const shouzheng = layout.households[0];
  assertEq(shouzheng.headName, 'Wang Shouzheng', 'Shouzheng name');
  assertEq(shouzheng.headAge, 58, 'Shouzheng age');
  assertEq(shouzheng.isWang, true, 'Shouzheng is Wang');
  assertEq(shouzheng.wealthTier, 'comfortable', 'Shouzheng wealth tier');
  assert(shouzheng.paddyMu >= 12, 'Shouzheng has 12+ mu paddy');

  // Wang Shouye: tenant
  const shouye = layout.households[1];
  assertEq(shouye.headRole, 'tenant_farmer', 'Shouye role');
  assert(shouye.tenantedMu > 0, 'Shouye has tenanted land');
  assertEq(shouye.paddyMu, 0, 'Shouye has no owned paddy');

  // Master Hu: salt merchant, rich, non-Wang
  const hu = layout.households[2];
  assertEq(hu.isWang, false, 'Hu is not Wang');
  assertEq(hu.wealthTier, 'rich', 'Hu is rich');
  assertEq(hu.paddyMu, 0, 'Hu has no paddy');

  // Widow Xu: destitute
  const xu = layout.households[4];
  assertEq(xu.wealthTier, 'destitute', 'Widow Xu is destitute');
  assert(xu.drylandMu > 0, 'Widow Xu has dryland');
  assertEq(xu.memberCount, 2, 'Widow Xu has 2 members');
}

// ============================================================================
console.log('=== SECTION 7: Wang lineage proportion ===');

{
  const layout = generateSettlement({ seed: 'wang-proportion-test' });
  const wangHouseholds = layout.households.filter(h => h.isWang);
  const totalHouseholds = layout.households.length;
  const wangRatio = wangHouseholds.length / totalHouseholds;
  // Doc 04 says ~22/31 = ~71% Wang
  assert(wangRatio > 0.5, `Wang ratio > 50%: ${wangRatio.toFixed(2)}`);
  assert(wangRatio < 0.9, `Wang ratio < 90%: ${wangRatio.toFixed(2)}`);
}

// ============================================================================
console.log('=== SECTION 8: Paddy count ===');

{
  const layout = generateSettlement({ seed: 'paddy-test' });
  const paddies = layout.structures.filter(s => s.kind === 'paddy');
  assert(paddies.length > 100, `paddies > 100: ${paddies.length}`);
  assert(paddies.length < 300, `paddies < 300: ${paddies.length}`);
}

// ============================================================================
console.log('=== SECTION 9: Structure positions are valid ===');

{
  const layout = generateSettlement({ seed: 'position-test' });
  for (const s of layout.structures) {
    assert(Number.isFinite(s.position.x), `${s.name}: x is finite`);
    assert(Number.isFinite(s.position.z), `${s.name}: z is finite`);
    assert(s.width > 0, `${s.name}: width > 0`);
    assert(s.depth > 0, `${s.name}: depth > 0`);
  }
}

// ============================================================================
console.log('=== SECTION 10: Custom params ===');

{
  const layout = generateSettlement({
    seed: 'custom-params',
    villageName: 'Test Village',
    householdCount: 15,
    paddyCount: 50,
  });
  assertEq(layout.villageName, 'Test Village', 'custom village name');
  assert(layout.householdCount === 15, 'custom household count');
  const paddies = layout.structures.filter(s => s.kind === 'paddy');
  assertEq(paddies.length, 50, 'custom paddy count');
}

// ============================================================================
console.log('=== SECTION 11: Spatial ordering ===');

{
  const layout = generateSettlement({ seed: 'spatial-test' });
  const hall = layout.structures.find(s => s.kind === 'lineage_hall');
  const well = layout.structures.find(s => s.kind === 'well');
  const threshing = layout.structures.find(s => s.kind === 'threshing_ground');
  const graveyard = layout.structures.find(s => s.kind === 'graveyard');

  if (hall && well) {
    // Well should be near the hall (within 60m)
    const dx = hall.position.x - well.position.x;
    const dz = hall.position.z - well.position.z;
    const d = Math.sqrt(dx * dx + dz * dz);
    assert(d < 60, `well within 60m of hall: ${d.toFixed(1)}m`);
  }

  if (hall && threshing) {
    // Threshing ground should be north of hall (higher z)
    assert(threshing.position.z > hall.position.z, 'threshing ground north of hall');
  }

  if (hall && graveyard) {
    // Graveyard should be far north of hall (~1km)
    const gz = graveyard.position.z - hall.position.z;
    assert(gz > 500, `graveyard far north: ${gz.toFixed(0)}m`);
  }
}

// ============================================================================
console.log('=== SECTION 12: Household structure metadata ===');

{
  const layout = generateSettlement({ seed: 'metadata-test' });
  const householdStructs = layout.structures.filter(s => s.kind === 'household');
  for (const hs of householdStructs) {
    assert('headName' in hs.metadata, `${hs.name}: has headName`);
    assert('isWang' in hs.metadata, `${hs.name}: has isWang`);
    assert('wealthTier' in hs.metadata, `${hs.name}: has wealthTier`);
    assert('memberCount' in hs.metadata, `${hs.name}: has memberCount`);
    assert('paddyMu' in hs.metadata, `${hs.name}: has paddyMu`);
    assert(['rich', 'comfortable', 'poor', 'destitute'].includes(hs.metadata.wealthTier),
      `${hs.name}: valid wealthTier`);
  }
}

// ============================================================================
console.log('=== SECTION 13: Paddy metadata ===');

{
  const layout = generateSettlement({ seed: 'paddy-meta-test' });
  const paddies = layout.structures.filter(s => s.kind === 'paddy');
  for (const p of paddies) {
    assert('ownerId' in p.metadata, `paddy ${p.name}: has ownerId`);
    assert('cropState' in p.metadata, `paddy ${p.name}: has cropState`);
    assert('areaMu' in p.metadata, `paddy ${p.name}: has areaMu`);
    assert(p.metadata.areaMu === 1, `paddy ${p.name}: 1 mu each`);
  }
}

// ============================================================================
console.log('=== SECTION 14: River and levee ===');

{
  const layout = generateSettlement({ seed: 'river-test' });
  const river = layout.structures.find(s => s.name === 'Cangli River');
  const levee = layout.structures.find(s => s.kind === 'levee');
  assert(river !== undefined, 'river exists');
  assert(levee !== undefined, 'levee exists');
  assert(levee!.position.z > river!.position.z, 'levee north of river');
  assert(levee!.metadata.height === 1.5, 'levee height is 1.5m');
}

// ============================================================================
console.log('=== SECTION 15: Population calculation ===');

{
  const layout = generateSettlement({ seed: 'pop-test' });
  const totalMembers = layout.households.reduce((sum, h) => sum + h.memberCount, 0);
  assertEq(layout.population, totalMembers, 'population matches member sum');
  assert(layout.population > 100, `population > 100: ${layout.population}`);
  assert(layout.population < 300, `population < 300: ${layout.population}`);
}

// ============================================================================
console.log('=== SECTION 16: API wrapper ===');

{
  const api = createSettlementGenApi();
  assert(api.getLast() === null, 'getLast null initially');

  const layout = api.generate({ seed: 'api-test' });
  assert(api.getLast() !== null, 'getLast returns after generate');
  assert(api.getLast() === layout, 'getLast returns same reference');

  const stats = api.stats();
  assertEq(stats.generationsRun, 1, 'stats: 1 generation');
  assertEq(stats.lastSeed, 'api-test', 'stats: last seed');
  assert(stats.lastStructureCount > 0, 'stats: structure count > 0');
  assert(stats.lastPopulation > 0, 'stats: population > 0');

  api.generate({ seed: 'api-test-2' });
  assertEq(api.stats().generationsRun, 2, 'stats: 2 generations');
}

// ============================================================================
console.log('=== SECTION 17: Plugin lifecycle ===');

{
  const host = createPluginHost();
  const plugin = createSettlementGenPlugin();

  assertEq(plugin.id, 'ga:gen-settlement', 'plugin id');
  assertEq(plugin.version, '0.1.0', 'plugin version');
  assert(plugin.dependencies.includes('ga:determinism'), 'depends on ga:determinism');

  plugin.init(host);
  const caps = host.capabilities.list();
  assert(caps.some(c => c.capability === 'gen.settlement'), 'gen.settlement registered');

  const state = host.getState('ga:gen-settlement');
  assert(state !== undefined, 'plugin state set');

  plugin.destroy(host);
  const capsAfter = host.capabilities.list();
  assert(!capsAfter.some(c => c.capability === 'gen.settlement'), 'gen.settlement unregistered');
}

// ============================================================================
console.log('=== SECTION 18: Wealth tier distribution ===');

{
  const layout = generateSettlement({ seed: 'wealth-dist-test' });
  const tiers: Record<string, number> = { rich: 0, comfortable: 0, poor: 0, destitute: 0 };
  for (const h of layout.households) {
    tiers[h.wealthTier]++;
  }
  // Most households should be poor (doc 04 context)
  assert(tiers.poor > tiers.rich, `more poor than rich: ${tiers.poor} vs ${tiers.rich}`);
  assert(tiers.destitute >= 1, `at least 1 destitute: ${tiers.destitute}`);
}

// ============================================================================
console.log('=== SECTION 19: Structure kind counts ===');

{
  const layout = generateSettlement({ seed: 'kind-count-test' });
  const counts: Record<string, number> = {};
  for (const s of layout.structures) {
    counts[s.kind] = (counts[s.kind] || 0) + 1;
  }
  assertEq(counts['lineage_hall'], 1, 'exactly 1 lineage hall');
  assertEq(counts['mill'], 1, 'exactly 1 mill');
  assertEq(counts['graveyard'], 1, 'exactly 1 graveyard');
  assert(counts['spirit_shrine'], 1, 'exactly 1 spirit shrine');
  assert(counts['dock'], 1, 'exactly 1 dock');
  assertEq(counts['well'], 1, 'exactly 1 communal well');
  assert(counts['threshing_ground'], 1, 'exactly 1 threshing ground');
  assert(counts['household'] === 31, '31 households');
}

// ============================================================================
console.log('=== SECTION 20: Large-scale determinism (3 seeds) ===');

{
  const seeds = ['large-alpha', 'large-beta', 'large-gamma'];
  for (const seed of seeds) {
    const a = generateSettlement({ seed });
    const b = generateSettlement({ seed });
    assertEq(safeStringify(a), safeStringify(b), `determinism for ${seed}`);
  }
}

// ============================================================================

console.log('');
console.log('============================================================');
console.log(`Settlement Gen Conformance: ${passed} passed, ${failed} failed, ${passed + failed} total`);
console.log('============================================================');

if (failed > 0) {
  process.exit(1);
}
