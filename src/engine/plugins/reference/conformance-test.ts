/**
 * Phase 2 (Reference Plugins) Conformance Test
 */

import { createPluginHost } from '../../kernel/plugin-host';
import { DeterminismPlugin } from '../ga-determinism';
import { PersistencePlugin } from './ga-persistence';
import { ContentSchemaPlugin } from './ga-content-schema';
import { getFingerprint } from '../../../lib/determinism/fingerprint';
import type { SaveEnvelope } from './ga-persistence';
import type { DefinitionService, TemplateService, RuleService } from './ga-content-schema';

let P = 0, F = 0;
function a(c: boolean, m: string) { if (c) { P++; console.log('  ✅ ' + m); } else { F++; console.error('  ❌ ' + m); } }

async function run() {
  console.log('=== Phase 2 Reference Plugins Conformance Test ===\n');
  console.log('Setup: boot kernel + plugins');

  const host = createPluginHost(getFingerprint());
  let r = host.registerPlugin(DeterminismPlugin);
  a(r.ok, 'ga:determinism registered');
  r = host.registerPlugin(PersistencePlugin);
  a(r.ok, 'ga:persistence registered');
  r = host.registerPlugin(ContentSchemaPlugin);
  a(r.ok, 'ga:content-schema registered');
  a(host.listPlugins().length === 3, 'Three plugins registered');

  // === Test 1: ga:persistence capabilities ===
  console.log('\nTest 1: ga:persistence capabilities');
  a(host.capabilities.has('persistence.save'), 'persistence.save registered');
  a(host.capabilities.has('persistence.load'), 'persistence.load registered');
  a(host.capabilities.has('persistence.checkpoint'), 'persistence.checkpoint registered');
  a(host.capabilities.has('persistence.slice'), 'persistence.slice registered');
  a(host.capabilities.has('persistence.branch'), 'persistence.branch registered');

  // Slice management
  const sr = host.capabilities.resolve<{getSlice:(id:string)=>unknown;setSlice:(id:string,s:unknown)=>void;listSlices:()=>string[]}>('persistence.slice');
  a(sr.ok, 'persistence.slice resolved');
  if (sr.ok) {
    const sl = sr.value;
    sl.setSlice('test-plugin', {counter: 42, data: 'hello'});
    const v = sl.getSlice('test-plugin') as {counter:number;data:string}|undefined;
    a(v !== undefined, 'Read custom slice');
    a(v!.counter === 42, 'Slice counter correct');
    a(v!.data === 'hello', 'Slice data correct');
    const list = sl.listSlices();
    a(list.includes('test-plugin'), 'test-plugin in slice list');
    a(list.includes('ga:determinism'), 'ga:determinism in slice list');
  }

  // Branch management
  const br = host.capabilities.resolve<{createBranch:(l:string)=>string;listBranches:()=>{branchId:string;label:string}[]}>('persistence.branch');
  a(br.ok, 'persistence.branch resolved');
  if (br.ok) {
    const bid = br.value.createBranch('experiment-1');
    a(bid.length > 0, 'Branch created');
    a(bid.startsWith('branch-'), 'Branch ID starts with branch-');
    const bl = br.value.listBranches();
    a(bl.length >= 1, 'At least one branch');
    a(bl.some(b => b.label === 'experiment-1'), 'experiment-1 in branch list');
  }

  // Save
  const sv = host.capabilities.resolve<{save:(label:string,branchId?:string)=>SaveEnvelope}>('persistence.save');
  a(sv.ok, 'persistence.save resolved');
  if (sv.ok) {
    const env = sv.value.save('test-save-1');
    a(env.formatVersion === '1.0.0', 'Save version 1.0.0');
    a(env.label === 'test-save-1', 'Save label correct');
    a(env.branchId === 'main', 'Default branch is main');
    a(env.hash.length > 0, 'Save has hash');
    a(typeof env.tick === 'number', 'Save has tick');
    a(env.createdAt.length > 0, 'Save has createdAt');

    const ld = host.capabilities.resolve<{load:(e:SaveEnvelope)=>boolean;getSave:()=>SaveEnvelope|undefined}>('persistence.load');
    a(ld.ok, 'persistence.load resolved');
    if (ld.ok) {
      a(ld.value.getSave() !== undefined, 'Save exists');
      a(ld.value.getSave()!.label === 'test-save-1', 'getSave returns correct save');
    }
  }

  // Checkpoint
  const cp = host.capabilities.resolve<{checkpoint:()=>string}>('persistence.checkpoint');
  a(cp.ok, 'persistence.checkpoint resolved');
  if (cp.ok) {
    const h = cp.value.checkpoint();
    a(h.length > 0, 'Checkpoint produces hash');
  }

  // === Test 2: ga:content-schema capabilities ===
  console.log('\nTest 2: ga:content-schema capabilities');
  a(host.capabilities.has('content-schema.definitions'), 'content-schema.definitions registered');
  a(host.capabilities.has('content-schema.templates'), 'content-schema.templates registered');
  a(host.capabilities.has('content-schema.rules'), 'content-schema.rules registered');

  const dr = host.capabilities.resolve<DefinitionService>('content-schema.definitions');
  a(dr.ok, 'content-schema.definitions resolved');
  if (dr.ok) {
    const g = dr.value;
    a(g.size() > 0, 'Graph non-empty');
    a(g.size() >= 37, 'At least 37 definitions (got ' + g.size() + ')');

    const qi = g.get('essence.qi');
    a(qi !== undefined, 'essence.qi exists');
    a(qi!.name === 'Qi', 'essence.qi name is Qi');
    a(qi!.nameHanzi === '氣', 'essence.qi hanzi is 氣');
    a(qi!.kind === 'metaphysical_essence', 'essence.qi kind correct');
    a(qi!.tags.includes('fundamental'), 'essence.qi has fundamental tag');

    a(g.get('nonexistent') === undefined, 'Nonexistent returns undefined');

    const all = g.list();
    a(all.length >= 37, 'list() returns >= 37 (got ' + all.length + ')');

    const ess = g.list({kind: 'metaphysical_essence'});
    a(ess.length >= 9, '>= 9 essences (got ' + ess.length + ')');
    a(ess.every(d => d.kind === 'metaphysical_essence'), 'Filter kind correct');

    const tagged = g.list({tags: ['fundamental']});
    a(tagged.length >= 1, 'At least one fundamental definition');

    const tagAny = g.list({tagAny: ['polarity', 'phase']});
    a(tagAny.length >= 2, 'tagAny returns polarity or phase defs');

    const combat = g.list({hasHook: 'combat' as any});
    a(combat.length >= 1, 'combat hook returns defs');

    const realms = g.list({idPrefix: 'realm.'});
    a(realms.length >= 10, '>= 10 realms (got ' + realms.length + ')');
    a(realms.every(d => d.id.startsWith('realm.')), 'All realm.* IDs correct');

    const qiRels = g.queryRelations('essence.qi');
    a(qiRels.length >= 1, 'essence.qi has relations');
    const transRels = g.queryRelations('essence.qi', 'TRANSFORMS');
    a(transRels.length >= 1, 'essence.qi has TRANSFORMS');
    a(transRels[0].target === 'essence.ran', 'TRANSFORMS target is essence.ran');

    const rev = g.queryReverseRelations('essence.qi');
    a(rev.length >= 1, 'Reverse relations to qi exist');

    a(g.hasHook('essence.qi', 'cultivation' as any), 'qi has cultivation hook');
    a(g.hasHook('essence.qi', 'combat' as any), 'qi has combat hook');
    a(!g.hasHook('essence.qi', 'audio' as any), 'qi does not have audio hook');

    const combatDefs = g.listByHook('combat' as any);
    a(combatDefs.length >= 5, '>= 5 combat defs (got ' + combatDefs.length + ')');

    const traversed = g.traverse('essence.qi', ['TRANSFORMS', 'PREREQUISITE_FOR', 'EVOLVES_INTO'], 2);
    a(traversed.length >= 1, 'Traverse returns results');
    a(traversed.some(d => d.id === 'essence.qi'), 'Traverse includes start node');

    const kinds = g.kinds();
    a(kinds.length >= 3, '>= 3 kinds (got ' + kinds.length + ')');
    a(kinds.includes('metaphysical_essence' as any), 'Kinds includes metaphysical_essence');
    a(kinds.includes('realm' as any), 'Kinds includes realm');

    const relTypes = g.relationTypes();
    a(relTypes.length >= 5, '>= 5 relation types (got ' + relTypes.length + ')');
    a(relTypes.includes('REQUIRES'), 'Relation types includes REQUIRES');
    a(relTypes.includes('EVOLVES_INTO'), 'Relation types includes EVOLVES_INTO');
  }

  // Templates
  const tr = host.capabilities.resolve<TemplateService>('content-schema.templates');
  a(tr.ok, 'content-schema.templates resolved');
  if (tr.ok) {
    const t = tr.value;
    a(t.size() === 0, 'Templates start empty');
    const id = t.create({id: 'tpl:test-1', definitionId: 'location.wang_family_bend', params: {pop: 42}});
    a(id === 'tpl:test-1', 'Template created with correct ID');
    a(t.size() === 1, '1 template created');
    a(t.get('tpl:test-1') !== undefined, 'Template retrieved by ID');
    a(t.get('tpl:test-1')!.definitionId === 'location.wang_family_bend', 'Template defId correct');
    a(t.list('location.wang_family_bend').length === 1, 'List by defId returns 1');
    a(t.remove('tpl:test-1'), 'Template removed');
    a(t.size() === 0, 'Templates empty after removal');
  }

  // Rules
  const rr = host.capabilities.resolve<RuleService>('content-schema.rules');
  a(rr.ok, 'content-schema.rules resolved');
  if (rr.ok) {
    const rl = rr.value;
    a(rl.size() === 0, 'Rules start empty');
    const rid = rl.add({id: 'rule:test-1', scope: 'region', predicate: 'true', consequence: 'allow', source: 'test', version: '0.1.0'});
    a(rid === 'rule:test-1', 'Rule added');
    a(rl.size() === 1, '1 rule after add');
    a(rl.get('rule:test-1') !== undefined, 'Rule retrieved');
    a(rl.get('rule:test-1')!.scope === 'region', 'Rule scope correct');
    a(rl.list('region').length === 1, 'List by scope returns 1');
    a(rl.remove('rule:test-1'), 'Rule removed');
    a(rl.size() === 0, 'Rules empty after removal');
  }

  // === Test 3: Clean unload ===
  console.log('\nTest 3: Clean unload');
  r = host.unregisterPlugin('ga:content-schema');
  a(r.ok, 'ga:content-schema unloaded');
  a(!host.capabilities.has('content-schema.definitions'), 'Capabilities removed');
  r = host.unregisterPlugin('ga:persistence');
  a(r.ok, 'ga:persistence unloaded');
  a(!host.capabilities.has('persistence.save'), 'Persistence capabilities removed');

  // === Summary ===
  console.log('\n=== Results ===');
  console.log('Passed: ' + P);
  console.log('Failed: ' + F);
  console.log(F === 0 ? '\n✅ ALL TESTS PASSED' : '\n❌ ' + F + ' TESTS FAILED');
  return F === 0;
}

run().then(s => process.exit(s ? 0 : 1)).catch(e => { console.error('Crash:', e); process.exit(1); });
