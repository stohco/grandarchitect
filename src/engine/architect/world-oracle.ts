/**
 * World Oracle — searchable, AI-readable description of the entire project.
 *
 * Exposes resources at structured URIs:
 *   engine://architecture   — architecture document index
 *   engine://plugins        — loaded plugins and capabilities
 *   engine://capabilities   — all registered capabilities
 *   engine://schemas        — registered data schemas
 *   engine://tests          — test coverage and results
 *   engine://decisions      — architectural decision records
 *   world://entities        — runtime entities (when engine is running)
 *   world://entity/{id}     — specific entity state
 *   runtime://scene         — current scene graph
 *   runtime://profiler      — profiler captures
 *   runtime://logs          — engine logs
 */

import type { ArchitectResource } from './types';
import type { PluginHost } from '../kernel/plugin-host';

export interface WorldOracle {
  // Query a resource by URI
  query(uri: string): Promise<unknown>;

  // Search across all resources
  search(query: string): Promise<SearchResult[]>;

  // List all available resource URIs
  listResources(): string[];

  // Explain why something exists (provenance)
  explain(uri: string): Promise<ProvenanceRecord | null>;
}

export interface SearchResult {
  uri: string;
  snippet: string;
  relevance: number;
}

export interface ProvenanceRecord {
  uri: string;
  source: string;       // which definition/template/rule/seed
  generator?: string;   // which plugin generated it
  seedStream?: string;  // which RNG stream
  pluginVersion?: string;
  historicalModifications: string[];
  codeVersion?: string;
}

export function createWorldOracle(host: PluginHost): WorldOracle {
  const resources = new Map<string, ArchitectResource>();

  // Register built-in resources
  registerResource(resources, {
    uri: 'engine://plugins',
    description: 'List all loaded plugins and their capabilities',
    mimeType: 'application/json',
    authorityRequired: 'observe',
    async read() {
      const plugins = host.listPlugins();
      return plugins.map(id => {
        const plugin = host.getPlugin(id);
        const caps = host.capabilities.listByProvider(id);
        return {
          id,
          version: plugin?.version,
          capabilities: caps.map(c => c.capability),
        };
      });
    },
  });

  registerResource(resources, {
    uri: 'engine://capabilities',
    description: 'List all registered capabilities',
    mimeType: 'application/json',
    authorityRequired: 'observe',
    async read() {
      return host.capabilities.list().map(c => ({
        capability: c.capability,
        provider: c.provider,
        version: c.version,
      }));
    },
  });

  registerResource(resources, {
    uri: 'engine://tick',
    description: 'Current simulation tick',
    mimeType: 'application/json',
    authorityRequired: 'observe',
    async read() {
      return { tick: host.getTick() };
    },
  });

  registerResource(resources, {
    uri: 'engine://fingerprint',
    description: 'Determinism fingerprint',
    mimeType: 'application/json',
    authorityRequired: 'observe',
    async read() {
      return host.getFingerprint();
    },
  });

  registerResource(resources, {
    uri: 'engine://state',
    description: 'All plugin state slices',
    mimeType: 'application/json',
    authorityRequired: 'observe',
    async read() {
      const plugins = host.listPlugins();
      const state: Record<string, unknown> = {};
      for (const id of plugins) {
        state[id] = host.getState(id);
      }
      return state;
    },
  });

  return {
    async query(uri) {
      const resource = resources.get(uri);
      if (!resource) {
        throw new Error(`Unknown resource URI: ${uri}`);
      }
      return resource.read();
    },

    async search(query) {
      const results: SearchResult[] = [];
      const q = query.toLowerCase();

      for (const [uri, resource] of resources) {
        const desc = resource.description.toLowerCase();
        if (desc.includes(q) || uri.toLowerCase().includes(q)) {
          results.push({
            uri,
            snippet: resource.description,
            relevance: uri.toLowerCase().includes(q) ? 1.0 : 0.5,
          });
        }
      }

      return results.sort((a, b) => b.relevance - a.relevance);
    },

    listResources() {
      return Array.from(resources.keys());
    },

    async explain(uri) {
      // In a full implementation, this would trace provenance
      // through the definition graph, generator rules, and seed streams.
      // For now, return null (no provenance tracking yet).
      return null;
    },
  };
}

function registerResource(map: Map<string, ArchitectResource>, resource: ArchitectResource) {
  map.set(resource.uri, resource);
}
