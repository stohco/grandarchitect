/**
 * Capability Registry
 *
 * Tracks what capabilities are provided by which plugins, and allows
 * plugins to request capabilities from each other through a stable
 * interface rather than direct imports.
 */

import type { CapabilityId, PluginId, Result } from './types';

export interface CapabilityRegistration {
  capability: CapabilityId;
  provider: PluginId;
  version: string;
  instance: unknown; // The actual service object
}

export interface CapabilityRegistry {
  /** Register a capability. Returns error if already registered by another plugin. */
  register(reg: CapabilityRegistration): Result<void>;

  /** Unregister a capability (when provider plugin unloads). */
  unregister(capability: CapabilityId, provider: PluginId): Result<void>;

  /** Check if a capability is available. */
  has(capability: CapabilityId): boolean;

  /** Get a capability's provider info. */
  get(capability: CapabilityId): CapabilityRegistration | undefined;

  /** Request a capability's instance (typed by caller). */
  resolve<T>(capability: CapabilityId): Result<T>;

  /** List all registered capabilities. */
  list(): CapabilityRegistration[];

  /** List capabilities provided by a specific plugin. */
  listByProvider(pluginId: PluginId): CapabilityRegistration[];
}

export function createCapabilityRegistry(): CapabilityRegistry {
  const registry = new Map<CapabilityId, CapabilityRegistration>();
  const byProvider = new Map<PluginId, Set<CapabilityId>>();

  return {
    register(reg) {
      const existing = registry.get(reg.capability);
      if (existing && existing.provider !== reg.provider) {
        return { ok: false, error: `Capability ${reg.capability} already registered by ${existing.provider}` };
      }
      registry.set(reg.capability, reg);
      if (!byProvider.has(reg.provider)) {
        byProvider.set(reg.provider, new Set());
      }
      byProvider.get(reg.provider)!.add(reg.capability);
      return { ok: true, value: undefined };
    },

    unregister(capability, provider) {
      const existing = registry.get(capability);
      if (!existing) {
        return { ok: false, error: `Capability ${capability} not found` };
      }
      if (existing.provider !== provider) {
        return { ok: false, error: `Capability ${capability} not owned by ${provider}` };
      }
      registry.delete(capability);
      byProvider.get(provider)?.delete(capability);
      return { ok: true, value: undefined };
    },

    has(capability) {
      return registry.has(capability);
    },

    get(capability) {
      return registry.get(capability);
    },

    resolve<T>(capability: CapabilityId): Result<T> {
      const reg = registry.get(capability);
      if (!reg) {
        return { ok: false, error: `Capability ${capability} not registered` };
      }
      return { ok: true, value: reg.instance as T };
    },

    list() {
      return Array.from(registry.values());
    },

    listByProvider(pluginId) {
      const caps = byProvider.get(pluginId);
      if (!caps) return [];
      return Array.from(caps)
        .map(c => registry.get(c)!)
        .filter(Boolean);
    },
  };
}
