/**
 * ga:content-schema — Content Schema Plugin
 *
 * Provides the DefinitionGraph: a queryable semantic graph over the frozen
 * definition database. Definitions are immutable at runtime (they come from
 * the bible); only the graph queries are mutable.
 *
 * Capabilities provided:
 *   - content-schema.definitions: Access the definition graph.
 *   - content-schema.templates: Template management.
 *   - content-schema.rules: Rule evaluation.
 */

import type { Plugin, PluginHost } from '../../kernel/plugin-host';
import type { PluginId, SimulationHook } from '../../kernel/types';
import {
  type Definition,
  type DefinitionKind,
  type Relation,
  ALL_DEFINITIONS,
} from '../../../lib/engine/definitions';

// ============================================================================
// Types
// ============================================================================

export interface DefinitionFilter {
  kind?: DefinitionKind | DefinitionKind[];
  tags?: string[];
  tagAny?: string[];
  hasHook?: SimulationHook;
  sourcePrefix?: string;
  idPrefix?: string;
}

export interface DefinitionGraph {
  get(id: string): Definition | undefined;
  list(filter?: DefinitionFilter): Definition[];
  queryRelations(from: string, type?: string): Relation[];
  queryReverseRelations(target: string, type?: string): Relation[];
  hasHook(defId: string, hook: SimulationHook): boolean;
  listByHook(hook: SimulationHook, kind?: DefinitionKind): Definition[];
  traverse(start: string, edgeTypes: string[], maxDepth: number): Definition[];
  size(): number;
  kinds(): DefinitionKind[];
  relationTypes(): string[];
}

export interface TemplateEntry {
  id: string;
  definitionId: string;
  params: Record<string, unknown>;
  version: string;
}

export interface RuleEntry {
  id: string;
  scope: 'world' | 'region' | 'entity' | 'interaction';
  predicate: string;
  consequence: string;
  source: string;
  version: string;
}

export interface DefinitionService {
  get(id: string): Definition | undefined;
  list(filter?: DefinitionFilter): Definition[];
  queryRelations(from: string, type?: string): Relation[];
  queryReverseRelations(target: string, type?: string): Relation[];
  hasHook(defId: string, hook: SimulationHook): boolean;
  listByHook(hook: SimulationHook, kind?: DefinitionKind): Definition[];
  traverse(start: string, edgeTypes: string[], maxDepth: number): Definition[];
  size(): number;
  kinds(): DefinitionKind[];
  relationTypes(): string[];
}

export interface TemplateService {
  create(template: Omit<TemplateEntry, 'version'>): string;
  get(id: string): TemplateEntry | undefined;
  list(definitionId?: string): TemplateEntry[];
  remove(id: string): boolean;
  size(): number;
}

export interface RuleService {
  add(rule: Omit<RuleEntry, 'version'>): string;
  get(id: string): RuleEntry | undefined;
  list(scope?: string): RuleEntry[];
  remove(id: string): boolean;
  size(): number;
}

// ============================================================================
// Implementation
// ============================================================================

function createContentSchemaPlugin(): Plugin & {
  definitions: DefinitionService;
  templates: TemplateService;
  rules: RuleService;
} {
  // Build the graph from frozen definitions
  const defMap = new Map<string, Definition>();
  const reverseIndex = new Map<string, { from: string; rel: Relation }[]>();
  const relationTypeSet = new Set<string>();
  const kindSet = new Set<DefinitionKind>();
  const templates = new Map<string, TemplateEntry>();
  const rules = new Map<string, RuleEntry>();

  // Index all definitions
  for (const def of ALL_DEFINITIONS) {
    defMap.set(def.id, def);
    kindSet.add(def.kind);

    for (const rel of def.relations) {
      relationTypeSet.add(rel.type);
      const existing = reverseIndex.get(rel.target) ?? [];
      existing.push({ from: def.id, rel });
      reverseIndex.set(rel.target, existing);
    }
  }

  // --- Definition Graph ---

  function get(id: string): Definition | undefined {
    return defMap.get(id);
  }

  function list(filter?: DefinitionFilter): Definition[] {
    let results = Array.from(defMap.values());

    if (filter?.kind) {
      const kinds = Array.isArray(filter.kind) ? filter.kind : [filter.kind];
      results = results.filter(d => kinds.includes(d.kind));
    }
    if (filter?.tags) {
      results = results.filter(d =>
        filter.tags!.every(t => d.tags.includes(t))
      );
    }
    if (filter?.tagAny) {
      results = results.filter(d =>
        filter.tagAny!.some(t => d.tags.includes(t))
      );
    }
    if (filter?.hasHook) {
      results = results.filter(d =>
        d.simulationHooks.includes(filter.hasHook!)
      );
    }
    if (filter?.sourcePrefix) {
      results = results.filter(d =>
        d.source.startsWith(filter.sourcePrefix!)
      );
    }
    if (filter?.idPrefix) {
      results = results.filter(d =>
        d.id.startsWith(filter.idPrefix!)
      );
    }

    return results;
  }

  function queryRelations(from: string, type?: string): Relation[] {
    const def = defMap.get(from);
    if (!def) return [];
    if (type) return def.relations.filter(r => r.type === type);
    return def.relations;
  }

  function queryReverseRelations(target: string, type?: string): Relation[] {
    const incoming = reverseIndex.get(target) ?? [];
    if (type) {
      return incoming.filter(e => e.rel.type === type).map(e => e.rel);
    }
    return incoming.map(e => e.rel);
  }

  function hasHook(defId: string, hook: SimulationHook): boolean {
    const def = defMap.get(defId);
    return def?.simulationHooks.includes(hook) ?? false;
  }

  function listByHook(hook: SimulationHook, kind?: DefinitionKind): Definition[] {
    let results = Array.from(defMap.values()).filter(d =>
      d.simulationHooks.includes(hook)
    );
    if (kind) {
      results = results.filter(d => d.kind === kind);
    }
    return results;
  }

  function traverse(start: string, edgeTypes: string[], maxDepth: number): Definition[] {
    const visited = new Set<string>();
    const result: Definition[] = [];
    const queue: { id: string; depth: number }[] = [{ id: start, depth: 0 }];

    while (queue.length > 0) {
      const { id, depth } = queue.shift()!;
      if (visited.has(id)) continue;
      visited.add(id);

      const def = defMap.get(id);
      if (!def) continue;
      result.push(def);

      if (depth >= maxDepth) continue;

      for (const rel of def.relations) {
        if (edgeTypes.length === 0 || edgeTypes.includes(rel.type)) {
          queue.push({ id: rel.target, depth: depth + 1 });
        }
      }
    }

    return result;
  }

  function size(): number {
    return defMap.size;
  }

  function kinds(): DefinitionKind[] {
    return Array.from(kindSet);
  }

  function relationTypes(): string[] {
    return Array.from(relationTypeSet);
  }

  // --- Templates ---

  function createTemplate(t: Omit<TemplateEntry, 'version'>): string {
    const entry: TemplateEntry = { ...t, version: '0.1.0' };
    templates.set(entry.id, entry);
    return entry.id;
  }

  function getTemplate(id: string): TemplateEntry | undefined {
    return templates.get(id);
  }

  function listTemplates(definitionId?: string): TemplateEntry[] {
    let results = Array.from(templates.values());
    if (definitionId) {
      results = results.filter(t => t.definitionId === definitionId);
    }
    return results;
  }

  function removeTemplate(id: string): boolean {
    return templates.delete(id);
  }

  function templateSize(): number {
    return templates.size;
  }

  // --- Rules ---

  function addRule(r: Omit<RuleEntry, 'version'>): string {
    const entry: RuleEntry = { ...r, version: '0.1.0' };
    rules.set(entry.id, entry);
    return entry.id;
  }

  function getRule(id: string): RuleEntry | undefined {
    return rules.get(id);
  }

  function listRules(scope?: string): RuleEntry[] {
    let results = Array.from(rules.values());
    if (scope) {
      results = results.filter(r => r.scope === scope);
    }
    return results;
  }

  function removeRule(id: string): boolean {
    return rules.delete(id);
  }

  function ruleSize(): number {
    return rules.size;
  }

  // --- Plugin ---

  const definitionService: DefinitionService = {
    get, list, queryRelations, queryReverseRelations,
    hasHook, listByHook, traverse, size, kinds, relationTypes,
  };

  const templateService: TemplateService = {
    create: createTemplate,
    get: getTemplate,
    list: listTemplates,
    remove: removeTemplate,
    size: templateSize,
  };

  const ruleService: RuleService = {
    add: addRule,
    get: getRule,
    list: listRules,
    remove: removeRule,
    size: ruleSize,
  };

  const plugin: Plugin & {
    definitions: DefinitionService;
    templates: TemplateService;
    rules: RuleService;
  } = {
    id: 'ga:content-schema',
    version: '0.1.0',
    dependencies: [],

    init(h) {
      h.capabilities.register({ capability: 'content-schema.definitions', provider: 'ga:content-schema', version: '0.1.0', instance: definitionService });
      h.capabilities.register({ capability: 'content-schema.templates', provider: 'ga:content-schema', version: '0.1.0', instance: templateService });
      h.capabilities.register({ capability: 'content-schema.rules', provider: 'ga:content-schema', version: '0.1.0', instance: ruleService });
      console.log(`[ga:content-schema] Initialized — ${defMap.size} definitions indexed, 3 capabilities registered`);
    },

    destroy(_h) {
      templates.clear();
      rules.clear();
      console.log('[ga:content-schema] Destroyed');
    },

    definitions: definitionService,
    templates: templateService,
    rules: ruleService,
  };

  return plugin;
}

export const ContentSchemaPlugin = createContentSchemaPlugin();
