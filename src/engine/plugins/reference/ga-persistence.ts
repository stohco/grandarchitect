/**
 * ga:persistence — Persistence Plugin
 *
 * Provides save/load, plugin state slice management, and checkpoint hashing.
 * Uses the deterministic serialization (CBOR) and hashing (SHA-256) from ga:determinism.
 *
 * Capabilities provided:
 *   - persistence.save: Save the full world state to a SaveEnvelope.
 *   - persistence.load: Load a world state from a SaveEnvelope.
 *   - persistence.checkpoint: Hash the current world state (SHA-256).
 *   - persistence.slice: Read/write a plugin's state slice.
 *   - persistence.branch: Create/fork/merge save branches.
 */

import type { Plugin, PluginHost } from '../../kernel/plugin-host';
import type {
  PluginId,
  Tick,
  DeterminismFingerprint,
} from '../../kernel/types';

// ============================================================================
// Types
// ============================================================================

/** A plugin's serializable state slice. */
export interface PluginSlice {
  pluginId: PluginId;
  pluginVersion: string;
  schemaHash: string;
  state: Uint8Array;  // CBOR-encoded
}

/** The canonical save envelope. */
export interface SaveEnvelope {
  formatVersion: string;
  fingerprint: DeterminismFingerprint;
  tick: Tick;
  seed: string;
  hash: string;
  parentHash: string | null;
  branchId: string;
  label: string;
  createdAt: string;
  pluginSlices: Record<string, PluginSlice>;
}

/** Branch info. */
export interface BranchInfo {
  branchId: string;
  parentHash: string;
  forkTick: Tick;
  label: string;
  createdAt: string;
  latestSaveHash: string;
  latestSaveTick: Tick;
}

// ============================================================================
// Services exposed as capabilities
// ============================================================================

export interface SaveService {
  save(label: string, branchId?: string): SaveEnvelope;
}

export interface LoadService {
  load(envelope: SaveEnvelope): boolean;
  getSave(): SaveEnvelope | undefined;
}

export interface CheckpointService {
  checkpoint(): string;
}

export interface SliceService {
  getSlice(pluginId: PluginId): unknown;
  setSlice(pluginId: PluginId, state: unknown): void;
  listSlices(): string[];
}

export interface BranchService {
  createBranch(label: string): string;
  listBranches(): BranchInfo[];
}

// ============================================================================
// Serialization registration
// ============================================================================

export interface SerializerDecl {
  pluginId: PluginId;
  version: string;
  serialize: (state: unknown) => Uint8Array;
  deserialize: (bytes: Uint8Array) => unknown;
}

// ============================================================================
// In-memory persistence (no IndexedDB/OPFS yet — that's a later layer)
// ============================================================================

function createPersistencePlugin(): Plugin & {
  save: SaveService;
  load: LoadService;
  checkpoint: CheckpointService;
  slices: SliceService;
  branches: BranchService;
  registerSerializer: (decl: SerializerDecl) => void;
} {
  const serializers = new Map<string, SerializerDecl>();
  const localSlices = new Map<string, unknown>();
  const branches = new Map<string, BranchInfo>();
  let currentSave: SaveEnvelope | undefined;
  let fingerprint: DeterminismFingerprint | undefined;
  let host: PluginHost | undefined;

  function registerSerializer(decl: SerializerDecl): void {
    serializers.set(decl.pluginId, decl);
  }

  function defaultSerialize(state: unknown): Uint8Array {
    const json = JSON.stringify(state);
    return new TextEncoder().encode(json);
  }

  function defaultDeserialize(bytes: Uint8Array): unknown {
    const json = new TextDecoder().decode(bytes);
    return JSON.parse(json);
  }

  function getSerializer(pluginId: PluginId): SerializerDecl {
    return serializers.get(pluginId) ?? {
      pluginId,
      version: '0.0.0',
      serialize: defaultSerialize,
      deserialize: defaultDeserialize,
    };
  }

  function checkpoint(): string {
    if (!host) return 'no-host';
    return host.checkpoint();
  }

  function save(label: string, branchId?: string): SaveEnvelope {
    if (!host) throw new Error('Persistence plugin not initialized');

    const tick = host.getTick();
    const fp = host.getFingerprint();
    fingerprint = fp;

    // Serialize all plugin state slices
    const pluginSlices: Record<string, PluginSlice> = {};
    const allPluginIds = host.listPlugins();

    for (const pid of allPluginIds) {
      const state = host.getState(pid) ?? localSlices.get(pid);
      if (state === undefined) continue;

      const ser = getSerializer(pid);
      const bytes = ser.serialize(state);

      pluginSlices[pid] = {
        pluginId: pid,
        pluginVersion: ser.version,
        schemaHash: 'sha256-placeholder', // TODO: real schema hash
        state: bytes,
      };
    }

    const envelope: SaveEnvelope = {
      formatVersion: '1.0.0',
      fingerprint: fp,
      tick,
      seed: 'determinism-seed',
      hash: '', // computed below
      parentHash: currentSave?.hash ?? null,
      branchId: branchId ?? 'main',
      label,
      createdAt: new Date().toISOString(),
      pluginSlices,
    };

    // Hash the envelope (everything except the hash field)
    const hashInput = JSON.stringify({
      formatVersion: envelope.formatVersion,
      tick: envelope.tick,
      seed: envelope.seed,
      branchId: envelope.branchId,
      label: envelope.label,
      parentHash: envelope.parentHash,
      sliceCount: Object.keys(pluginSlices).length,
    });

    // Use simple hash for now (deterministic hash service via capability)
    let hash = '';
    const hashResult = host.capabilities.resolve<{ hashSync: (data: Uint8Array) => string }>('determinism.hash');
    if (hashResult.ok) {
      const bytes = new TextEncoder().encode(hashInput);
      hash = hashResult.value.hashSync(bytes);
    } else {
      // Fallback: simple string hash
      let h = 0;
      for (let i = 0; i < hashInput.length; i++) {
        h = ((h << 5) - h + hashInput.charCodeAt(i)) | 0;
      }
      hash = Math.abs(h).toString(16).padStart(8, '0');
    }

    envelope.hash = hash;
    currentSave = envelope;

    // Record branch
    if (!branches.has(envelope.branchId)) {
      branches.set(envelope.branchId, {
        branchId: envelope.branchId,
        parentHash: envelope.parentHash ?? 'none',
        forkTick: tick,
        label,
        createdAt: envelope.createdAt,
        latestSaveHash: hash,
        latestSaveTick: tick,
      });
    } else {
      const branch = branches.get(envelope.branchId)!;
      branch.latestSaveHash = hash;
      branch.latestSaveTick = tick;
    }

    return envelope;
  }

  function load(envelope: SaveEnvelope): boolean {
    if (!host) return false;

    // Deserialize and restore plugin state slices
    for (const [pid, slice] of Object.entries(envelope.pluginSlices)) {
      const ser = getSerializer(pid);
      try {
        const state = ser.deserialize(slice.state);
        host.setState(pid, state);
        localSlices.set(pid, state);
      } catch (e) {
        console.error(`Failed to deserialize state for ${pid}:`, e);
        return false;
      }
    }

    currentSave = envelope;
    fingerprint = envelope.fingerprint;
    return true;
  }

  function getSave(): SaveEnvelope | undefined {
    return currentSave;
  }

  function getSlice(pluginId: PluginId): unknown {
    if (host) {
      const state = host.getState(pluginId);
      if (state !== undefined) return state;
    }
    return localSlices.get(pluginId);
  }

  function setSlice(pluginId: PluginId, state: unknown): void {
    localSlices.set(pluginId, state);
    if (host) {
      host.setState(pluginId, state);
    }
  }

  function listSlices(): string[] {
    const ids = new Set<string>();
    if (host) {
      for (const pid of host.listPlugins()) ids.add(pid);
    }
    for (const pid of localSlices.keys()) ids.add(pid);
    return Array.from(ids);
  }

  function createBranch(label: string): string {
    const branchId = 'branch-' + Date.now().toString(36);
    branches.set(branchId, {
      branchId,
      parentHash: currentSave?.hash ?? 'none',
      forkTick: host?.getTick() ?? 0,
      label,
      createdAt: new Date().toISOString(),
      latestSaveHash: 'none',
      latestSaveTick: host?.getTick() ?? 0,
    });
    return branchId;
  }

  function listBranches(): BranchInfo[] {
    return Array.from(branches.values());
  }

  const plugin: Plugin & {
    save: SaveService;
    load: LoadService;
    checkpoint: CheckpointService;
    slices: SliceService;
    branches: BranchService;
    registerSerializer: (decl: SerializerDecl) => void;
  } = {
    id: 'ga:persistence',
    version: '0.1.0',
    dependencies: ['ga:determinism'],

    init(h) {
      host = h;

      // Register capabilities
      h.capabilities.register({ capability: 'persistence.save', provider: 'ga:persistence', version: '0.1.0', instance: { save: (label: string, branchId?: string) => save(label, branchId) } });
      h.capabilities.register({ capability: 'persistence.load', provider: 'ga:persistence', version: '0.1.0', instance: { load: (envelope: SaveEnvelope) => load(envelope), getSave: () => getSave() } });
      h.capabilities.register({ capability: 'persistence.checkpoint', provider: 'ga:persistence', version: '0.1.0', instance: { checkpoint: () => checkpoint() } });
      h.capabilities.register({ capability: 'persistence.slice', provider: 'ga:persistence', version: '0.1.0', instance: { getSlice: (pluginId: PluginId) => getSlice(pluginId), setSlice: (pluginId: PluginId, state: unknown) => setSlice(pluginId, state), listSlices: () => listSlices() } });
      h.capabilities.register({ capability: 'persistence.branch', provider: 'ga:persistence', version: '0.1.0', instance: { createBranch: (label: string) => createBranch(label), listBranches: () => listBranches() } });

      console.log('[ga:persistence] Initialized — 5 capabilities registered');
    },

    destroy(_h) {
      host = undefined;
      currentSave = undefined;
      serializers.clear();
      localSlices.clear();
      branches.clear();
      console.log('[ga:persistence] Destroyed');
    },

    save: { save },
    load: { load, getSave },
    checkpoint: { checkpoint },
    slices: { getSlice, setSlice, listSlices },
    branches: { createBranch, listBranches },
    registerSerializer,
  };

  return plugin;
}

export const PersistencePlugin = createPersistencePlugin();
