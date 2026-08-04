/**
 * Plugin Host
 *
 * The central orchestrator. Manages plugin lifecycle, provides access to
 * shared services (event bus, scheduler, capability registry, entity manager),
 * and enforces the determinism contract.
 *
 * The PluginHost knows nothing about xianxia, sects, immortals, or techniques.
 * It provides universal services required by every module.
 */

import type {
  PluginId, EntityId, Tick, Result, EngineEvent, DeterminismFingerprint,
} from './types';
import type { CapabilityRegistry } from './capability-registry';
import type { EventBus } from './event-bus';
import type { Scheduler } from './scheduler';
import { createCapabilityRegistry } from './capability-registry';
import { createEventBus } from './event-bus';
import { createScheduler } from './scheduler';

// ============================================================================
// Plugin Interface
// ============================================================================

export interface Plugin {
  id: PluginId;
  version: string;
  dependencies: PluginId[];

  /** Called once at engine startup. Register state, systems, capabilities, surfaces. */
  init(host: PluginHost): void;

  /** Called once at engine shutdown. Clean up. */
  destroy(host: PluginHost): void;
}

// ============================================================================
// Plugin Host Interface
// ============================================================================

export interface PluginHost {
  // Core services
  readonly capabilities: CapabilityRegistry;
  readonly events: EventBus;
  readonly scheduler: Scheduler;

  // Plugin management
  registerPlugin(plugin: Plugin): Result<void>;
  unregisterPlugin(pluginId: PluginId): Result<void>;
  getPlugin(pluginId: PluginId): Plugin | undefined;
  listPlugins(): PluginId[];

  // State management (per-plugin slices)
  getState<T>(pluginId: PluginId): T | undefined;
  setState<T>(pluginId: PluginId, state: T): void;

  // Determinism
  checkpoint(): string;
  verify(hash: string): boolean;
  getFingerprint(): DeterminismFingerprint;
  getTick(): Tick;

  // Lifecycle
  start(): void;
  stop(): void;
  isRunning(): boolean;
}

// ============================================================================
// Implementation
// ============================================================================

export function createPluginHost(fingerprint: DeterminismFingerprint): PluginHost {
  const capabilities = createCapabilityRegistry();
  const events = createEventBus();
  const scheduler = createScheduler();

  const plugins = new Map<PluginId, Plugin>();
  const pluginState = new Map<PluginId, unknown>();
  let running = false;

  function registerPlugin(plugin: Plugin): Result<void> {
    if (plugins.has(plugin.id)) {
      return { ok: false, error: `Plugin ${plugin.id} already registered` };
    }

    // Check dependencies
    for (const dep of plugin.dependencies) {
      if (!plugins.has(dep)) {
        return { ok: false, error: `Plugin ${plugin.id} requires ${dep}, which is not registered` };
      }
    }

    plugins.set(plugin.id, plugin);

    // Initialize the plugin
    try {
      plugin.init(host);
    } catch (e) {
      plugins.delete(plugin.id);
      return { ok: false, error: `Plugin ${plugin.id} init failed: ${e}` };
    }

    return { ok: true, value: undefined };
  }

  function unregisterPlugin(pluginId: PluginId): Result<void> {
    const plugin = plugins.get(pluginId);
    if (!plugin) {
      return { ok: false, error: `Plugin ${pluginId} not registered` };
    }

    // Check if any other plugin depends on this one
    for (const [id, p] of plugins) {
      if (p.dependencies.includes(pluginId)) {
        return { ok: false, error: `Cannot unregister ${pluginId}: ${id} depends on it` };
      }
    }

    // Destroy the plugin
    try {
      plugin.destroy(host);
    } catch (e) {
      // Log but continue
      console.error(`Plugin ${pluginId} destroy failed:`, e);
    }

    // Clean up capabilities
    const caps = capabilities.listByProvider(pluginId);
    for (const cap of caps) {
      capabilities.unregister(cap.capability, pluginId);
    }

    // Clean up state
    pluginState.delete(pluginId);

    plugins.delete(pluginId);
    return { ok: true, value: undefined };
  }

  function checkpoint(): string {
    // In a full implementation, this would:
    // 1. Serialize all plugin state slices via CBOR
    // 2. Hash the CBOR bytes via SHA-256
    // 3. Return the hash
    // For now, return a placeholder
    const state: Record<string, unknown> = {
      tick: scheduler.getTick(),
      plugins: Object.fromEntries(pluginState),
    };
    return JSON.stringify(state); // TODO: replace with CBOR + SHA-256
  }

  function verify(hash: string): boolean {
    const current = checkpoint();
    return current === hash;
  }

  const host: PluginHost = {
    capabilities,
    events,
    scheduler,

    registerPlugin,
    unregisterPlugin,

    getPlugin(pluginId) {
      return plugins.get(pluginId);
    },

    listPlugins() {
      return Array.from(plugins.keys());
    },

    getState(pluginId) {
      return pluginState.get(pluginId) as any;
    },

    setState(pluginId, state) {
      pluginState.set(pluginId, state);
    },

    checkpoint,
    verify,
    getFingerprint() {
      return fingerprint;
    },
    getTick() {
      return scheduler.getTick();
    },

    start() {
      if (running) return;
      running = true;
      scheduler.resume();
    },

    stop() {
      if (!running) return;
      running = false;
      scheduler.pause();
    },

    isRunning() {
      return running;
    },
  };

  return host;
}
