/**
 * ga:assets — Asset Plugin
 *
 * Content-addressed asset registry. Assets are identified by SHA-256 hash,
 * never by filename. The headless stub provides in-memory storage only;
 * real implementation uses OPFS caching and CDN delivery.
 *
 * Capabilities provided:
 *   - assets.stream: AssetStream — request, prefetch, evict assets.
 *   - assets.registry: AssetRegistry — register, query, list asset metadata.
 */

import type { Plugin, PluginHost } from '../../kernel/plugin-host';
import type { PluginManifest } from '../../kernel/types';

// ============================================================================
// Asset Types (from architecture doc 16)
// ============================================================================

export type AssetType =
  | 'mesh' | 'skeleton' | 'animation-clip' | 'texture' | 'material'
  | 'audio' | 'scene' | 'collision' | 'navmesh';

export type SkeletonProfile =
  | 'humanoid' | 'quadruped' | 'serpentine' | 'flying' | 'multi-armed' | 'giant' | 'custom';

export interface AssetRecord {
  id: string;               // SHA-256 hex, 64 chars
  type: AssetType;
  source: string;            // original file path
  version: string;
  dependencies: string[];    // SHA-256 hashes of dependent assets
  variants: AssetVariant[];
  tags: string[];
  memoryBudget: number;      // bytes
  skeletonProfile?: SkeletonProfile;
  license: string;
}

export interface AssetVariant {
  id: string;
  name: string;              // 'mobile', 'desktop', 'cinematic'
  sizeBytes: number;
}

export interface AssetBundle {
  id: string;
  region: string;
  version: string;
  hashes: string[];
  totalBytes: number;
  dependencies: string[];
}

export interface LoadOptions {
  variant?: string;
  priority?: 'high' | 'normal' | 'low';
  deadline?: number;
  placeholder?: string;
}

export interface RuntimeHandle {
  assetId: string;
 loaded: boolean;
 error: string | null;
 variant: string;
 loadTimeMs: number;
}

export interface AssetStream {
  request(hash: string, opts?: LoadOptions): Promise<RuntimeHandle>;
  prefetch(hashes: string[]): void;
  evict(hash: string): void;
  onEviction(handler: (hash: string) => void): void;
  getLoaded(hash: string): RuntimeHandle | undefined;
  loadedCount(): number;
}

export interface AssetRegistry {
  register(record: AssetRecord): void;
  get(id: string): AssetRecord | undefined;
  has(id: string): boolean;
  list(filter?: { type?: AssetType; tag?: string }): AssetRecord[];
  getDependencies(id: string): AssetRecord[];
  registerBundle(bundle: AssetBundle): void;
  getBundle(id: string): AssetBundle | undefined;
  listBundles(): AssetBundle[];
  size(): number;
}

// ============================================================================
// Asset Stream Implementation (headless, in-memory)
// ============================================================================

function createAssetStream(registry: AssetRegistry): AssetStream {
  const loaded = new Map<string, RuntimeHandle>();
  const evictionHandlers: ((hash: string) => void)[] = [];

  async function request(hash: string, opts?: LoadOptions): Promise<RuntimeHandle> {
    const record = registry.get(hash);
    if (!record) {
      const handle: RuntimeHandle = {
        assetId: hash,
        loaded: false,
        error: `Asset not found: ${hash}`,
        variant: opts?.variant ?? 'desktop',
        loadTimeMs: 0,
      };
      return handle;
    }

    // Simulate load (headless: just record metadata)
    const handle: RuntimeHandle = {
      assetId: hash,
      loaded: true,
      error: null,
      variant: opts?.variant ?? 'desktop',
      loadTimeMs: 0,
    };
    loaded.set(hash, handle);
    return handle;
  }

  function prefetch(hashes: string[]): void {
    // Headless: no-op (no real I/O)
    for (const hash of hashes) {
      if (!loaded.has(hash)) {
        loaded.set(hash, {
          assetId: hash,
          loaded: false,
          error: null,
          variant: 'desktop',
          loadTimeMs: 0,
        });
      }
    }
  }

  function evict(hash: string): void {
    if (loaded.delete(hash)) {
      for (const handler of evictionHandlers) {
        handler(hash);
      }
    }
  }

  function onEviction(handler: (hash: string) => void): void {
    evictionHandlers.push(handler);
  }

  function getLoaded(hash: string): RuntimeHandle | undefined {
    return loaded.get(hash);
  }

  function loadedCount(): number {
    return loaded.size;
  }

  return { request, prefetch, evict, onEviction, getLoaded, loadedCount };
}

// ============================================================================
// Asset Registry Implementation
// ============================================================================

function createAssetRegistry(): AssetRegistry {
  const assets = new Map<string, AssetRecord>();
  const bundles = new Map<string, AssetBundle>();

  function register(record: AssetRecord): void {
    assets.set(record.id, record);
  }

  function get(id: string): AssetRecord | undefined {
    return assets.get(id);
  }

  function has(id: string): boolean {
    return assets.has(id);
  }

  function list(filter?: { type?: AssetType; tag?: string }): AssetRecord[] {
    let results = Array.from(assets.values());
    if (filter?.type) {
      results = results.filter(a => a.type === filter.type);
    }
    if (filter?.tag) {
      results = results.filter(a => a.tags.includes(filter.tag!));
    }
    return results;
  }

  function getDependencies(id: string): AssetRecord[] {
    const record = assets.get(id);
    if (!record) return [];
    return record.dependencies
      .map(depId => assets.get(depId))
      .filter((a): a is AssetRecord => a !== undefined);
  }

  function registerBundle(bundle: AssetBundle): void {
    bundles.set(bundle.id, bundle);
  }

  function getBundle(id: string): AssetBundle | undefined {
    return bundles.get(id);
  }

  function listBundles(): AssetBundle[] {
    return Array.from(bundles.values());
  }

  function size(): number {
    return assets.size;
  }

  return { register, get, has, list, getDependencies, registerBundle, getBundle, listBundles, size };
}

// ============================================================================
// The Plugin
// ============================================================================

function createAssetPlugin(): Plugin & {
  stream: AssetStream;
  registry: AssetRegistry;
} {
  const registry = createAssetRegistry();
  const stream = createAssetStream(registry);

  const plugin: Plugin & {
    stream: AssetStream;
    registry: AssetRegistry;
  } = {
    id: 'ga:assets',
    version: '0.1.0',
    dependencies: [],

    init(h) {
      h.capabilities.register({ capability: 'assets.stream', provider: 'ga:assets', version: '0.1.0', instance: stream });
      h.capabilities.register({ capability: 'assets.registry', provider: 'ga:assets', version: '0.1.0', instance: registry });
      console.log('[ga:assets] Initialized — 2 capabilities registered (headless backend)');
    },

    destroy(_h) {
      console.log('[ga:assets] Destroyed');
    },

    stream,
    registry,
  };

  return plugin;
}

export const AssetPlugin = createAssetPlugin();

export const AssetPluginManifest: PluginManifest = {
  id: 'ga:assets',
  version: '0.1.0',
  engineVersionRange: '>=0.1.0',
  dependencies: [],
  optionalDependencies: [],
  provides: ['assets.stream', 'assets.registry'],
  requires: [],
  permissions: ['filesystem'],
  deterministicMode: 'supported',
  workerCompatible: true,
};
