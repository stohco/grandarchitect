/**
 * ga:gen-npc Conformance Test
 * Tests deterministic NPC generation from seed.
 * Two runs with same seed must produce identical output.
 * No forbidden functions. No Three.js, no DOM.
 */

import {
  generateNpcRoster,
  createNpcGenApi,
  createNpcGenPlugin,
  type GeneratedNpc,
  type NpcRoster,
  type NpcGenApi,
  type NpcTraits,
  type NpcRole,
  type Sex,
  type LifeStage,
  type WealthTier,
  type QiState,
  type KinshipRole,
} from './ga-gen-npc';

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

function assertGt(actual: number, threshold: number, msg: string) {
  if (actual > threshold) { passed++; console.log(`  ✅ ${msg}`); }
  else { failed++; console.log(`  ❌ ${msg} — got ${actual}, need > ${threshold}`); }
}

function assertIncludes(arr: string[], val: string, msg: string) {
  if (arr.includes(val)) { passed++; console.log(`  ✅ ${msg}`); }
  else { failed++; console.log(`  ❌ ${msg} — ${val} not in ${JSON.stringify(arr)}`); }
}

function assertNotIncludes(arr: string[], val: string, msg: string) {
  if (!arr.includes(val)) { passed++; console.log(`  ✅ ${msg}`); }
  else { failed++; console.log(`  ❌ ${msg} — ${val} found unexpectedly`); }
}

// ============================================================================
console.log('=== SECTION 1: Named NPC templates (doc 04 + doc 34) ===');
{
  const roster = generateNpcRoster({ seed: 's1', namedOnly: true });
  const named = roster.npcs;

  // 1.1 Correct named NPC count
  assertEq(roster.totalGenerated, roster.namedCount, 'Total equals named count in namedOnly mode');
  assertEq(roster.proceduralCount, 0, 'No procedural NPCs in namedOnly mode');
  assertGt(roster.namedCount, 30, 'At least 30 named NPCs');

  // 1.2 Five original households from doc 04 exist
  const names = named.map(n => n.name);
  assertIncludes(names, 'Wang Shouzheng', 'Wang Shouzheng exists');
  assertIncludes(names, 'Wang Shouye', 'Wang Shouye exists');
  assertIncludes(names, 'Master Hu', 'Master Hu exists');
  assertIncludes(names, 'Lin Aqiao', 'Lin Aqiao exists');
  assertIncludes(names, 'Widow Xu', 'Widow Xu exists');

  // 1.3 Ten newly-named households from doc 34 exist
  assertIncludes(names, 'Zhou Wenshu', 'Zhou Wenshu (midwife) exists');
  assertIncludes(names, 'He Laosan', 'He Laosan (ferryman) exists');
  assertIncludes(names, 'Wu Daniu', 'Wu Daniu (charcoal-burner) exists');
  assertIncludes(names, 'Zhao Tieniu', 'Zhao Tieniu (soldier) exists');
  assertIncludes(names, 'Li Asheng', 'Li Asheng (yeoman) exists');
  assertIncludes(names, 'Wang Shoucheng', 'Wang Shoucheng (fisherman) exists');
  assertIncludes(names, 'Wang Tianfu', 'Wang Tianfu (bare-stick) exists');
  assertIncludes(names, 'Wang Lun', 'Wang Lun (teacher) exists');
  assertIncludes(names, 'Wang Shouli', 'Wang Shouli (elder) exists');
  assertIncludes(names, 'Pan Siniang', 'Pan Siniang (tofu-maker) exists');

  // 1.4 All named NPCs have isNamed=true
  for (const npc of named) {
    assert(npc.isNamed, `${npc.name} is marked as named`);
  }

  // 1.5 Household members from doc 04 households
  const hh1 = named.filter(n => n.householdIndex === 0).map(n => n.name);
  assertIncludes(hh1, 'Wang Shouzheng', 'Senior HH has Shouzheng');
  assertIncludes(hh1, 'Lady Chen', 'Senior HH has Lady Chen');
  assertIncludes(hh1, 'Wang Zongxian', 'Senior HH has Zongxian');
  assertIncludes(hh1, 'Wang Zongwen', 'Senior HH has Zongwen');
  assertIncludes(hh1, 'Wang Sanniang', 'Senior HH has Sanniang');

  const hh3 = named.filter(n => n.householdIndex === 2).map(n => n.name);
  assertIncludes(hh3, 'Master Hu', 'Salt merchant HH has Master Hu');
  assertIncludes(hh3, 'Lady Wang', 'Salt merchant HH has Lady Wang');
  assertIncludes(hh3, 'Hu Bao', 'Salt merchant HH has Hu Bao');
  assertIncludes(hh3, 'Hu Ying', 'Salt merchant HH has Hu Ying');
}

// ============================================================================
console.log('=== SECTION 2: NPC fields correctness ===');
{
  const roster = generateNpcRoster({ seed: 's2', namedOnly: true });
  const sz = roster.npcs.find(n => n.name === 'Wang Shouzheng')!;

  // 2.1 Basic fields
  assertEq(sz.name, 'Wang Shouzheng', 'Shouzheng name');
  assertEq(sz.nameHanzi, '王守正', 'Shouzheng nameHanzi');
  assertEq(sz.surname, 'Wang', 'Shouzheng surname');
  assertEq(sz.givenName, 'Shouzheng', 'Shouzheng givenName');
  assertEq(sz.age, 58, 'Shouzheng age');
  assertEq(sz.sex, 'male' as Sex, 'Shouzheng sex');
  assertEq(sz.role, 'lineage_head' as NpcRole, 'Shouzheng role');
  assertEq(sz.isWang, true, 'Shouzheng is Wang');
  assertEq(sz.wealthTier, 'comfortable' as WealthTier, 'Shouzheng wealth tier');
  assertEq(sz.qiState, 'none' as QiState, 'Shouzheng qiState');
  assertEq(sz.householdIndex, 0, 'Shouzheng household');

  // 2.2 Life stage derivation
  assertEq(sz.lifeStage, 'elder' as LifeStage, '58 = elder');
  const xiaomei = roster.npcs.find(n => n.name === 'Lin Xiaomei')!;
  assertEq(xiaomei.lifeStage, 'youth' as LifeStage, '12 = youth');
  const zhou = roster.npcs.find(n => n.name === 'Zhou Wenshu')!;
  assertEq(zhou.lifeStage, 'elder' as LifeStage, '66 = elder');

  // 2.3 Skills are non-empty arrays
  for (const npc of roster.npcs) {
    assert(Array.isArray(npc.skills), `${npc.name} skills is array`);
    assertGt(npc.skills.length, 0, `${npc.name} has at least 1 skill`);
  }

  // 2.4 Personality summary is a non-empty string
  for (const npc of roster.npcs) {
    assert(typeof npc.personalitySummary === 'string', `${npc.name} personalitySummary is string`);
    assert(npc.personalitySummary.length > 0, `${npc.name} personalitySummary non-empty`);
  }

  // 2.5 Tension ties are arrays
  for (const npc of roster.npcs) {
    assert(Array.isArray(npc.tensionTies), `${npc.name} tensionTies is array`);
  }

  // 2.6 Kinship and relationships are arrays
  for (const npc of roster.npcs) {
    assert(Array.isArray(npc.kinship), `${npc.name} kinship is array`);
    assert(Array.isArray(npc.relationships), `${npc.name} relationships is array`);
  }
}

// ============================================================================
console.log('=== SECTION 3: Trait generation ===');
{
  // 3.1 Traits are generated for all NPCs
  const roster = generateNpcRoster({ seed: 's3', namedOnly: true });
  const traitKeys = ['desires','fears','loyalties','grudges','ambitions','riskTolerance',
    'generosity','greed','jealousy','pride','patience','deception','gratitude','curiosity','conformity'] as const;

  for (const npc of roster.npcs) {
    for (const k of traitKeys) {
      assert(typeof npc.traits[k] === 'number', `${npc.name}.${k} is number`);
      assert(npc.traits[k] >= -1.0 && npc.traits[k] <= 1.0, `${npc.name}.${k} in [-1,1]`);
    }
  }

  // 3.2 Role-specific trait bias: lineage_head has higher loyalties than average
  const heads = roster.npcs.filter(n => n.role === 'lineage_head');
  const others = roster.npcs.filter(n => n.role !== 'lineage_head');
  const avgHeadLoyalty = heads.reduce((s,n) => s + n.traits.loyalties, 0) / heads.length;
  const avgOtherLoyalty = others.reduce((s,n) => s + n.traits.loyalties, 0) / others.length;
  assert(avgHeadLoyalty > avgOtherLoyalty, `lineage_head loyalty (${avgHeadLoyalty.toFixed(2)}) > avg (${avgOtherLoyalty.toFixed(2)})`);

  // 3.3 Different roles produce different traits (statistical)
  const teacher = roster.npcs.find(n => n.role === 'teacher')!;
  const soldier = roster.npcs.find(n => n.role === 'soldier')!;
  assert(teacher.traits.curiosity !== soldier.traits.curiosity, 'Teacher and soldier have different curiosity');
}

// ============================================================================
console.log('=== SECTION 4: Determinism ===');
{
  // 4.1 Same seed produces identical output
  const r1 = generateNpcRoster({ seed: 'det-test', totalPopulation: 180 });
  const r2 = generateNpcRoster({ seed: 'det-test', totalPopulation: 180 });
  assertEq(r1.totalGenerated, r2.totalGenerated, 'Determinism: total count matches');
  assertEq(r1.namedCount, r2.namedCount, 'Determinism: named count matches');
  assertEq(r1.proceduralCount, r2.proceduralCount, 'Determinism: procedural count matches');

  // 4.2 All NPC fields match
  for (let i = 0; i < r1.npcs.length; i++) {
    const a = r1.npcs[i], b = r2.npcs[i];
    assertEq(a.name, b.name, `Determinism: NPC ${i} name`);
    assertEq(a.age, b.age, `Determinism: NPC ${i} age`);
    assertEq(a.sex, b.sex, `Determinism: NPC ${i} sex`);
    assertEq(a.role, b.role, `Determinism: NPC ${i} role`);
    assertEq(safeStringify(a.traits), safeStringify(b.traits), `Determinism: NPC ${i} traits`);
    assertEq(a.householdIndex, b.householdIndex, `Determinism: NPC ${i} household`);
  }

  // 4.3 Different seeds produce different output
  const r3 = generateNpcRoster({ seed: 'other-seed', totalPopulation: 180 });
  const traitsDiffer = safeStringify(r1.npcs[0].traits) !== safeStringify(r3.npcs[0].traits);
  assert(traitsDiffer, 'Different seeds produce different traits');

  // 4.4 namedOnly produces same named NPCs regardless of other params
  const rn1 = generateNpcRoster({ seed: 'x', namedOnly: true });
  const rn2 = generateNpcRoster({ seed: 'x', namedOnly: true, totalPopulation: 500 });
  assertEq(rn1.totalGenerated, rn2.totalGenerated, 'namedOnly ignores totalPopulation');
}

// ============================================================================
console.log('=== SECTION 5: Kinship wiring ===');
{
  const roster = generateNpcRoster({ seed: 's5', namedOnly: true });
  const sz = roster.npcs.find(n => n.name === 'Wang Shouzheng')!;

  // 5.1 Shouzheng has kinship edges
  assertGt(sz.kinship.length, 5, 'Shouzheng has more than 5 kinship edges');

  // 5.2 Shouzheng is linked to Lady Chen as wife
  const chen = roster.npcs.find(n => n.name === 'Lady Chen')!;
  const chenEdge = sz.kinship.find(k => k.targetNpcId === chen.entityId);
  assert(chenEdge !== undefined, 'Shouzheng linked to Lady Chen');
  assertEq(chenEdge!.role, 'head' as KinshipRole, 'Shouzheng role to Chen is head');
  assertEq(chenEdge!.targetRole, 'wife' as KinshipRole, 'Chen role to Shouzheng is wife');

  // 5.3 Reciprocal kinship
  const szEdge = chen.kinship.find(k => k.targetNpcId === sz.entityId);
  assert(szEdge !== undefined, 'Lady Chen linked back to Shouzheng');
  assertEq(szEdge!.role, 'wife', 'Chen role to Shouzheng is wife');
  assertEq(szEdge!.targetRole, 'head', 'Shouzheng role to Chen is head');

  // 5.4 Shouzheng linked to children
  const childRoles = sz.kinship
    .filter(k => k.role === 'father')
    .map(k => roster.npcs.find(n => n.entityId === k.targetNpcId)?.name);
  assertIncludes(childRoles, 'Wang Zongxian', 'Shouzheng father of Zongxian');
  assertIncludes(childRoles, 'Wang Zongwen', 'Shouzheng father of Zongwen');
  assertIncludes(childRoles, 'Wang Sanniang', 'Shouzheng father of Sanniang');

  // 5.5 Household 2 family links
  const sy = roster.npcs.find(n => n.name === 'Wang Shouye')!;
  const syChildRoles = sy.kinship.filter(k => k.role === 'father').map(k =>
    roster.npcs.find(n => n.entityId === k.targetNpcId)?.name);
  assertIncludes(syChildRoles, 'Wang Zongwu', 'Shouye father of Zongwu');
  assertIncludes(syChildRoles, 'Wang Zongde', 'Shouye father of Zongde');

  // 5.6 Widow Xu linked to Xu Erniu
  const wx = roster.npcs.find(n => n.name === 'Widow Xu')!;
  const wxChild = wx.kinship.find(k => k.targetNpcId === roster.npcs.find(n => n.name === 'Xu Erniu')!.entityId);
  assert(wxChild !== undefined, 'Widow Xu linked to Xu Erniu');
  assertEq(wxChild!.role, 'mother', 'Widow Xu is mother of Erniu');

  // 5.7 Cross-household kinship: Shouzheng to Wang Shouli (brother)
  const shouli = roster.npcs.find(n => n.name === 'Wang Shouli')!;
  const brotherEdge = sz.kinship.find(k => k.targetNpcId === shouli.entityId);
  assert(brotherEdge !== undefined, 'Shouzheng linked to Shouli as brother');

  // 5.8 Cross-household kinship: Shouzheng to Lady Wang (Salt) as sister
  const ladyWang = roster.npcs.find(n => n.name === 'Lady Wang')!;
  const sisterEdge = sz.kinship.find(k => k.targetNpcId === ladyWang.entityId);
  assert(sisterEdge !== undefined, 'Shouzheng linked to Lady Wang as sister');
}

// ============================================================================
console.log('=== SECTION 6: Relationship wiring (doc 34 §1.4) ===');
{
  const roster = generateNpcRoster({ seed: 's6', namedOnly: true });
  const sz = roster.npcs.find(n => n.name === 'Wang Shouzheng')!;
  const hu = roster.npcs.find(n => n.name === 'Master Hu')!;
  const li = roster.npcs.find(n => n.name === 'Li Asheng')!;
  const wx = roster.npcs.find(n => n.name === 'Widow Xu')!;

  // 6.1 Shouzheng has relationships
  assertGt(sz.relationships.length, 5, 'Shouzheng has >5 relationship edges');

  // 6.2 Shouzheng-Hu trade_partner
  const huRel = sz.relationships.find(r => r.targetNpcId === hu.entityId);
  assert(huRel !== undefined, 'Shouzheng has relationship with Master Hu');
  assertEq(huRel!.label, 'trade_partner', 'Shouzheng-Hu label is trade_partner');

  // 6.3 Shouzheng-Li peer
  const liRel = sz.relationships.find(r => r.targetNpcId === li.entityId);
  assert(liRel !== undefined, 'Shouzheng has relationship with Li Asheng');
  assertEq(liRel!.label, 'peer', 'Shouzheng-Li label is peer');
  assert(liRel!.weight > 0, 'Shouzheng-Li weight positive');

  // 6.4 Hu-Li trade_rival (negative)
  const huLiRel = hu.relationships.find(r => r.targetNpcId === li.entityId);
  assert(huLiRel !== undefined, 'Hu has relationship with Li Asheng');
  assertEq(huLiRel!.label, 'trade_rival', 'Hu-Li label is trade_rival');
  assert(huLiRel!.weight < 0, 'Hu-Li weight negative');

  // 6.5 Widow Xu-Zhou Wenshu grief_shared (positive)
  const zhou = roster.npcs.find(n => n.name === 'Zhou Wenshu')!;
  const wxZhou = wx.relationships.find(r => r.targetNpcId === zhou.entityId);
  assert(wxZhou !== undefined, 'Widow Xu has relationship with Zhou Wenshu');
  assertEq(wxZhou!.label, 'grief_shared', 'Widow Xu-Zhou label is grief_shared');
  assert(wxZhou!.weight > 0.5, 'Widow Xu-Zhou weight high positive');

  // 6.6 Reciprocal relationships
  const szHu = hu.relationships.find(r => r.targetNpcId === sz.entityId);
  assert(szHu !== undefined, 'Hu has reciprocal relationship with Shouzheng');
  assertEq(szHu!.label, 'trade_partner', 'Hu-Shouzheng label matches');
}

// ============================================================================
console.log('=== SECTION 7: Tension ties ===');
{
  const roster = generateNpcRoster({ seed: 's7', namedOnly: true });

  // 7.1 salt_license tension touches expected NPCs
  const saltNpcs = roster.npcs.filter(n => n.tensionTies.includes('salt_license'));
  assertIncludes(saltNpcs.map(n=>n.name), 'Master Hu', 'salt_license: Master Hu');
  assertIncludes(saltNpcs.map(n=>n.name), 'Wang Shouzheng', 'salt_license: Shouzheng');
  assertIncludes(saltNpcs.map(n=>n.name), 'Li Asheng', 'salt_license: Li Asheng');
  assertIncludes(saltNpcs.map(n=>n.name), 'Wang Lun', 'salt_license: Wang Lun');

  // 7.2 missing_son tension touches expected NPCs
  const sonNpcs = roster.npcs.filter(n => n.tensionTies.includes('missing_son'));
  assertIncludes(sonNpcs.map(n=>n.name), 'Widow Xu', 'missing_son: Widow Xu');
  assertIncludes(sonNpcs.map(n=>n.name), 'He Laosan', 'missing_son: He Laosan');
  assertIncludes(sonNpcs.map(n=>n.name), 'Zhou Wenshu', 'missing_son: Zhou Wenshu');

  // 7.3 betrothal tension touches expected NPCs
  const betroNpcs = roster.npcs.filter(n => n.tensionTies.includes('betrothal'));
  assertIncludes(betroNpcs.map(n=>n.name), 'Wang Sanniang', 'betrothal: Wang Sanniang');
  assertIncludes(betroNpcs.map(n=>n.name), 'Wang Shouzheng', 'betrothal: Shouzheng');
  assertIncludes(betroNpcs.map(n=>n.name), 'Wang Lun', 'betrothal: Wang Lun');

  // 7.4 Some NPCs have no tension ties
  const noTension = roster.npcs.filter(n => n.tensionTies.length === 0);
  assertGt(noTension.length, 5, 'Some named NPCs have no tension ties');
}

// ============================================================================
console.log('=== SECTION 8: Procedural generation ===');
{
  const roster = generateNpcRoster({ seed: 's8', totalPopulation: 180 });

  // 8.1 Total population near target
  assert(roster.totalGenerated >= 100, `Total ${roster.totalGenerated} >= 100`);
  assert(roster.totalGenerated <= 250, `Total ${roster.totalGenerated} <= 250`);

  // 8.2 Named + procedural = total
  assertEq(roster.totalGenerated, roster.namedCount + roster.proceduralCount, 'Named + procedural = total');

  // 8.3 Procedural NPCs have isNamed=false
  const proc = roster.npcs.filter(n => !n.isNamed);
  assertEq(proc.length, roster.proceduralCount, 'Procedural count matches filter');

  // 8.4 Procedural NPCs have valid fields
  for (const npc of proc) {
    assert(typeof npc.name === 'string' && npc.name.length > 0, `Proc NPC has name`);
    assert(typeof npc.age === 'number' && npc.age >= 0, `Proc NPC ${npc.name} age valid`);
    assert(npc.sex === 'male' || npc.sex === 'female', `Proc NPC ${npc.name} sex valid`);
    assert(typeof npc.role === 'string', `Proc NPC ${npc.name} role is string`);
    assert(typeof npc.traits === 'object' && npc.traits !== null, `Proc NPC ${npc.name} has traits object`);
    assert(npc.traits.desires >= -1 && npc.traits.desires <= 1, `Proc NPC ${npc.name} traits bounded`);
    assert(npc.kinship.length === 0, `Proc NPC ${npc.name} has no kinship (procedural)`);
    assert(npc.relationships.length === 0, `Proc NPC ${npc.name} has no relationships (procedural)`);
    assert(npc.tensionTies.length === 0, `Proc NPC ${npc.name} has no tension ties`);
    assert(npc.qiState === 'none', `Proc NPC ${npc.name} qiState is none`);
    assert(npc.entityId >= 0n, `Proc NPC ${npc.name} entityId is bigint >= 0`);
  }

  // 8.5 Entity IDs are unique and sequential
  const ids = roster.npcs.map(n => n.entityId);
  const uniqueIds = new Set(ids);
  assertEq(uniqueIds.size, ids.length, 'All entity IDs are unique');
  assertEq(ids[0], 0n, 'First entity ID is 0');
}

// ============================================================================
console.log('=== SECTION 9: API and query functions ===');
{
  const api = createNpcGenApi();

  // 9.1 generate populates last
  assert(api.getLast() === null, 'getLast is null before generate');
  const roster = api.generate({ seed: 'api-test', totalPopulation: 100 });
  assert(api.getLast() === roster, 'getLast returns last roster');
  assertEq(api.stats().generationsRun, 1, 'Stats: 1 generation');
  assertEq(api.stats().lastSeed, 'api-test', 'Stats: last seed correct');
  assertEq(api.stats().lastTotalNpcs, roster.totalGenerated, 'Stats: total NPCs correct');

  // 9.2 queryNpc
  const npc0 = api.queryNpc(0n);
  assert(npc0 !== undefined, 'queryNpc(0n) returns NPC');
  assertEq(npc0!.name, roster.npcs[0].name, 'queryNpc returns correct NPC');
  assert(api.queryNpc(9999n) === undefined, 'queryNpc(9999n) returns undefined');

  // 9.3 queryByHousehold
  const hh0 = api.queryByHousehold(0);
  assertGt(hh0.length, 0, 'queryByHousehold(0) has members');
  for (const n of hh0) assertEq(n.householdIndex, 0, `NPC ${n.name} in HH 0`);

  // 9.4 queryByRole
  const teachers = api.queryByRole('teacher');
  assertGt(teachers.length, 0, 'queryByRole(teacher) returns results');
  for (const n of teachers) assertEq(n.role, 'teacher', `NPC ${n.name} is teacher`);

  // 9.5 queryNamed
  const named = api.queryNamed();
  assertGt(named.length, 0, 'queryNamed returns results');
  for (const n of named) assert(n.isNamed, `NPC ${n.name} is named`);

  // 9.6 queryByTension
  const saltNpcs = api.queryByTension('salt_license');
  assertGt(saltNpcs.length, 0, 'queryByTension(salt_license) returns results');
  for (const n of saltNpcs) assert(n.tensionTies.includes('salt_license'), `${n.name} has salt_license`);

  // 9.7 getKinshipNetwork
  const sz = api.queryNpc(0n)!;
  const net = api.getKinshipNetwork(0n);
  assertEq(net.npc.entityId, 0n, 'Network npc is correct');
  assertEq(net.kin.length, sz.kinship.length, 'Network kin count matches');
  assertEq(net.rels.length, sz.relationships.length, 'Network rels count matches');

  // 9.8 Network returns empty for missing NPC
  const emptyNet = api.getKinshipNetwork(9999n);
  assertEq(emptyNet.kin.length, 0, 'Missing NPC network kin is empty');
  assertEq(emptyNet.rels.length, 0, 'Missing NPC network rels is empty');

  // 9.9 Second generation updates stats
  api.generate({ seed: 'api-test-2' });
  assertEq(api.stats().generationsRun, 2, 'Stats: 2 generations after second run');
}

// ============================================================================
console.log('=== SECTION 10: Plugin lifecycle ===');
{
  const host = createPluginHost();
  const plugin = createNpcGenPlugin();

  // 10.1 Plugin has correct metadata
  assertEq(plugin.id, 'ga:gen-npc', 'Plugin ID is ga:gen-npc');
 assertEq(plugin.version, '0.1.0', 'Plugin version is 0.1.0');
  assert(plugin.dependencies.includes('ga:determinism'), 'Depends on ga:determinism');

  // 10.2 Init registers capability
  plugin.init(host);
  const cap = host.capabilities.get('gen.npc');
  assert(cap !== null, 'Capability gen.npc registered after init');
  assertEq(cap!.provider, 'ga:gen-npc', 'Capability provider is ga:gen-npc');
  assert(cap!.instance !== null, 'Capability has instance');

  // 10.3 State is set
  const state = host.getState('ga:gen-npc');
  assert(state !== null, 'State set after init');

  // 10.4 Destroy unregisters
  plugin.destroy(host);
  const capAfter = host.capabilities.get('gen.npc');
  assert(capAfter === undefined, 'Capability unregistered after destroy');
}

// ============================================================================
console.log('=== SECTION 11: Wealth tier distribution ===');
{
  const roster = generateNpcRoster({ seed: 's11', totalPopulation: 180 });
  const tiers = roster.npcs.reduce((acc, n) => {
    acc[n.wealthTier] = (acc[n.wealthTier] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // 11.1 All four tiers present in full generation
  assert(tiers['rich'] !== undefined, 'Rich tier exists');
  assert(tiers['comfortable'] !== undefined, 'Comfortable tier exists');
  assert(tiers['poor'] !== undefined, 'Poor tier exists');
  assert(tiers['destitute'] !== undefined, 'Destitute tier exists');

  // 11.2 Poor + destitute > rich (mortal village)
  assert((tiers['poor'] || 0) + (tiers['destitute'] || 0) > tiers['rich'], 'More poor+destitute than rich');

  // 11.3 Named NPCs have correct wealth tiers from lore
  const hu = roster.npcs.find(n => n.name === 'Master Hu')!;
  assertEq(hu.wealthTier, 'rich', 'Master Hu is rich');
  const wx = roster.npcs.find(n => n.name === 'Widow Xu')!;
  assertEq(wx.wealthTier, 'destitute', 'Widow Xu is destitute');
  const sy = roster.npcs.find(n => n.name === 'Wang Shouye')!;
  assertEq(sy.wealthTier, 'poor', 'Wang Shouye is poor');
}

// ============================================================================
console.log('=== SECTION 12: Wang proportion ===');
{
  const roster = generateNpcRoster({ seed: 's12', totalPopulation: 180 });
  const wangCount = roster.npcs.filter(n => n.isWang).length;
  const ratio = wangCount / roster.totalGenerated;

  // 12.1 Wang proportion is roughly 22/31 ≈ 0.71 (doc 04)
  assert(ratio > 0.35, `Wang ratio ${ratio.toFixed(2)} > 0.35`);
  assert(ratio < 0.95, `Wang ratio ${ratio.toFixed(2)} < 0.95`);

  // 12.2 All named Wang NPCs are Wang
  const namedWangs = roster.npcs.filter(n => n.isNamed && n.isWang);
  for (const n of namedWangs) {
    assert(n.surname === 'Wang', `Named Wang NPC ${n.name} has Wang surname`);
  }

  // 12.3 Non-Wang named NPCs exist
  const namedNonWang = roster.npcs.filter(n => n.isNamed && !n.isWang);
  assertGt(namedNonWang.length, 5, 'At least 5 named non-Wang NPCs');
}

// ============================================================================
console.log('=== SECTION 13: Life stage correctness ===');
{
  const roster = generateNpcRoster({ seed: 's13' });
  const stages: Record<LifeStage, number> = { infant:0, child:0, youth:0, adult:0, elder:0, ancient:0 };
  for (const n of roster.npcs) stages[n.lifeStage]++;

  // 13.1 All stages represented (except infant may be 0 in full gen)
  assertGt(stages.child, 0, 'Children exist');
  assertGt(stages.youth, 0, 'Youth exist');
  assertGt(stages.adult, 0, 'Adults exist');
  assertGt(stages.elder, 0, 'Elders exist');

  // 13.2 Named NPC life stages match lore ages
  const sanniang = roster.npcs.find(n => n.name === 'Wang Sanniang')!;
  assertEq(sanniang.lifeStage, 'adult' as LifeStage, 'Sanniang (22) is adult');
  const gensheng = roster.npcs.find(n => n.name === 'Lin Gensheng')!;
  assertEq(gensheng.lifeStage, 'youth' as LifeStage, 'Gensheng (16) is youth');
  const tianfu = roster.npcs.find(n => n.name === 'Wang Tianfu')!;
  assertEq(tianfu.lifeStage, 'elder' as LifeStage, 'Tianfu (62) is elder');
}

// ============================================================================
console.log('=== SECTION 14: Metadata and extensibility ===');
{
  const roster = generateNpcRoster({ seed: 's14', namedOnly: true });

  // 14.1 All NPCs have metadata object
  for (const npc of roster.npcs) {
    assert(typeof npc.metadata === 'object', `${npc.name} has metadata object`);
    assert(Array.isArray(npc.metadata) === false, `${npc.name} metadata is plain object`);
  }

  // 14.2 Entity IDs are BigInt
  for (const npc of roster.npcs) {
    assert(typeof npc.entityId === 'bigint', `${npc.name} entityId is bigint`);
  }

  // 14.3 Seed is preserved in output
  assertEq(roster.seed, 's14', 'Seed preserved in output');
  assertEq(roster.tick, 0, 'Tick is 0 for fresh generation');
}

// ============================================================================
console.log('=== Results ===');
console.log(`Passed: ${passed}`);
console.log(`Failed: ${failed}`);
if (failed === 0) console.log('✅ ALL TESTS PASSED');
else { console.log(`❌ ${failed} TEST(S) FAILED`); process.exit(1); }
