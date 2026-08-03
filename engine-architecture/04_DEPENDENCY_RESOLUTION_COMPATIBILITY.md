# 04 — Dependency Resolution and Compatibility

**Status:** Normative. Specifies how the kernel decides which plugins load, in what order, and what happens when versions conflict or capabilities are missing.
**Date:** 2026-08-03

---

## 0. Scope

The kernel must answer four questions before any plugin's code is imported:

1. **Discovery** — which plugins are present?
2. **Compatibility** — which plugins declare an `engineVersionRange` the current engine satisfies?
3. **Dependency resolution** — which plugins' `dependencies` can be satisfied, and in what order must they initialize?
4. **Capability matching** — which plugins' `requires` can be satisfied by which plugins' `provides`?

This document specifies the algorithm for each, the conflict-detection rules, the failure modes, and the rejected alternatives. It implements invariant 4.5 (no silent compatibility) from `00_ENGINE_VISION_SCOPE_INVARIANTS.md`: a version mismatch or missing capability either resolves via a documented rule or fails loudly.

---

## 1. The resolution pipeline

```
[plugins.json + npm/CDN fetch]
        |
        v
   1. DISCOVERY
      - read manifests
      - dedupe by ID (highest version wins per ID)
        |
        v
   2. COMPATIBILITY FILTER
      - drop plugins whose engineVersionRange excludes the current engine
      - emit PluginIncompatible diagnostic per drop
        |
        v
   3. DEPENDENCY GRAPH BUILD
      - nodes: plugins
      - edges: A depends on B (from A.dependencies)
      - detect cycles
        |
        v
   4. CAPABILITY MATCHING
      - for each plugin's requires[], find a provider
      - record the binding (capabilityId -> providerPluginId)
        |
        v
   5. TOPOLOGICAL SORT
      - deterministic order: (depth, registration order, plugin ID)
        |
        v
   6. INIT ORDER EMITTED
      - kernel calls plugin.init() in this order
```

Each stage emits diagnostics on failure. The kernel does not proceed to the next stage until the current stage has no *fatal* failures.

---

## 2. Discovery

### 2.1 Sources

Plugins are discovered from, in priority order:

1. **Built-in plugins** — shipped with the engine build. Listed in `engine.builtinPlugins` in the config.
2. **Local plugins** — listed in `plugins.json` at the engine root. Paths are relative.
3. **npm plugins** — listed in `plugins.json` with `"source": "npm"`. Resolved via the package manager at build time, not at runtime.
4. **CDN plugins** — listed in `plugins.json` with `"source": "cdn"` and a URL. Fetched at runtime; signature-verified.

In the prototype, only sources 1 and 2 are implemented. Source 4 is gated behind the security boundary (the `network` permission).

### 2.2 Manifest reading

For each discovered plugin, the kernel fetches its manifest. The manifest is a JSON file at the plugin's entry path (e.g., `node_modules/ga-fog/manifest.json`). The kernel does *not* import the plugin's code at this stage.

### 2.3 Deduplication

If two sources provide a plugin with the same `id`, the higher `version` wins. If versions are equal, the priority order in §2.1 wins (built-in > local > npm > CDN). The loser is recorded in the diagnostics as `PluginSuperseded { pluginId, winner: source, loser: source }`.

```typescript
interface DiscoveredPlugin {
  manifest: PluginManifest;
  source: "builtin" | "local" | "npm" | "cdn";
  sourcePath: string;
  contentHash?: string;          // for CDN plugins, the verified hash
}
```

---

## 3. Compatibility filter

Each plugin's `engineVersionRange` is a semver range. The kernel computes the current engine version from the build metadata and tests each plugin's range.

```typescript
function isEngineCompatible(manifest: PluginManifest, engineVersion: string): boolean {
  return satisfies(engineVersion, manifest.engineVersionRange);
}
```

Incompatible plugins are dropped. The kernel emits `PluginIncompatible { pluginId, engineVersion, required: engineVersionRange }`. The plugin never reaches the dependency graph.

### 3.1 Why strict ranges

A plugin that declares `engineVersionRange: ">=0.1.0"` is claiming compatibility with all future engine versions. This is almost always wrong; the plugin author cannot foresee future kernel changes. The convention is to declare a bounded range: `">=0.1.0 <0.2.0"`. The kernel does not enforce this convention, but the diagnostics service warns on unbounded ranges in dev mode.

### 3.2 Engine version bumps

When the engine version bumps (e.g., 0.1.x → 0.2.0), all plugins with `engineVersionRange: ">=0.1.0 <0.2.0"` become incompatible. The operator must update each plugin's range. This is the intended behavior: a minor engine bump is a compatibility boundary, and silent acceptance would violate invariant 4.5.

---

## 4. Dependency graph build

For each surviving plugin, the kernel reads its `dependencies` array and adds edges to the graph.

```typescript
interface DependencyEdge {
  from: PluginId;                // the depending plugin
  to: PluginId;                  // the required plugin
  versionRange: string;
  optional: boolean;
}
```

### 4.1 Cycle detection

The kernel runs Tarjan's strongly-connected-components algorithm. Any SCC with more than one node is a cycle. Cycles are fatal: the kernel refuses to load any plugin in the cycle and emits `DependencyCycle { plugins: PluginId[] }`.

Self-dependencies (a plugin listing itself in `dependencies`) are caught at manifest validation (§2.1 of `03`) and never reach this stage.

### 4.2 Missing dependencies

If a plugin `A` declares a non-optional dependency on `B`, and `B` is not in the discovered set (or was dropped at compatibility filtering), the kernel:

1. Marks `A` as `dependency-failed`.
2. Recursively marks any plugin that depends on `A` as `dependency-failed`.
3. Emits `DependencyUnresolvable { pluginId: A, missing: B }` for each failed plugin.

The recursion is necessary: if `ga:combat` depends on `ga:qi-system` which depends on `ga:determinism`, and `ga:determinism` is missing, both `ga:qi-system` and `ga:combat` fail.

### 4.3 Optional dependencies

If `A` declares an *optional* dependency on `B`, and `B` is missing, `A` continues to load. The kernel emits `OptionalDependencyMissing { pluginId: A, missing: B }` as a `warn` diagnostic. `A`'s `init` must call `host.getCapability(id)` defensively (returns `undefined`) for capabilities `B` would have provided.

### 4.4 Version range matching

For each edge `(A → B)`, the kernel checks that `B.version` satisfies `A`'s declared `versionRange` for `B`. If not:

- For non-optional dependencies: fatal. `DependencyVersionMismatch { pluginId: A, dep: B, required: versionRange, found: B.version }`.
- For optional dependencies: the dependency is treated as missing (§4.3).

```typescript
function satisfiesDependency(dep: PluginDependency, provider: DiscoveredPlugin): boolean {
  return satisfies(provider.manifest.version, dep.versionRange);
}
```

---

## 5. Capability matching

After the dependency graph is built (and cycles / missing deps are rejected), the kernel matches capabilities.

### 5.1 The capability pool

The kernel collects all `provides` declarations from all surviving plugins:

```typescript
interface CapabilityPoolEntry {
  capabilityId: CapabilityId;
  version: string;
  provider: PluginId;
  interfaceId: string;
}
```

### 5.2 The matching algorithm

For each plugin `P` and each `P.requires[]`:

1. Filter the pool to entries with matching `capabilityId`.
2. Filter to entries whose `version` satisfies `P`'s declared `versionRange`.
3. If no entries match:
   - If the requirement is optional: emit `OptionalCapabilityMissing` warn; continue.
   - If the requirement is required: fatal. `CapabilityUnavailable { pluginId: P, capabilityId }`.
4. If multiple entries match: select the highest version. If tied on version, select the entry whose provider appears earliest in the discovery priority order (§2.1). This selection is deterministic.
5. Record the binding: `capabilityBindings.set(capabilityId, provider)`.

### 5.3 Conflict detection

Two plugins providing the same capability is *not* a conflict in the matching phase — it is a *choice*. The kernel selects one (§5.2 step 4) and *quiesces* the others. The quiesced providers are still loaded (their `init` runs), but their capability binding is marked `quiesced: true`, and calls to `host.getCapability(id)` from other plugins return the winning binding.

A quiesced provider's *own* code can still call its own implementation directly (it has the reference). This is intentional: a quiesced plugin may still render to an off-screen buffer for diagnostic purposes.

The kernel emits `CapabilityQuiesced { capabilityId, winner: PluginId, loser: PluginId }` for each quiescence.

### 5.4 Capability loss

If a provider plugin fails after capability matching (e.g., its `init` throws), the kernel:

1. Marks its capability bindings as `lost`.
2. Emits `CapabilityLost { capabilityId, provider: PluginId }`.
3. Does *not* auto-promote a quiesced provider. The operator must reload.

Auto-promotion was rejected because it can change determinism mid-session (the quiesced provider may have a different version, producing different state). The operator's reload is a deliberate, audited action.

---

## 6. Topological sort

After capability matching, the surviving plugins form a DAG (cycles were rejected in §4.1). The kernel topologically sorts them to determine init order.

### 6.1 Deterministic ordering

A topological sort is not unique. To make it deterministic, the kernel sorts by:

1. **Depth** — a plugin with no dependencies has depth 0; a plugin's depth is 1 + max(depth of its dependencies). Lower depth initializes first.
2. **Registration order** — the order in `plugins.json` (built-in first, then local, then npm, then CDN).
3. **Plugin ID** — alphabetical, as a final tiebreaker.

This ordering is reproducible across runs and across browsers (invariant 4.1).

```typescript
function topoSort(plugins: DiscoveredPlugin[], edges: DependencyEdge[]): PluginId[] {
  const depth = computeDepth(plugins, edges);
  return plugins
    .slice()
    .sort((a, b) => {
      if (depth[a.manifest.id] !== depth[b.manifest.id]) {
        return depth[a.manifest.id] - depth[b.manifest.id];
      }
      if (a.source !== b.source) {
        return sourcePriority(a.source) - sourcePriority(b.source);
      }
      return a.manifest.id.localeCompare(b.manifest.id);
    })
    .map(p => p.manifest.id);
}
```

### 6.2 Destroy order

Destroy order is the exact reverse of init order. The kernel maintains the init order list and reverses it at shutdown.

---

## 7. Optional dependencies and graceful degradation

A plugin that declares optional dependencies must be written to function with or without them. The pattern:

```typescript
// In the plugin's init:
const renderer = host.getCapability<Renderer>("ga:renderer/Renderer");
if (renderer) {
  // Register the visual surface
  host.registerRenderPass(myPass);
} else {
  // Headless mode: register only the simulation surface
  host.emitDiagnostic({
    level: "info",
    code: "OPTIONAL-DEP-MISSING",
    pluginId: "ga:my-plugin",
    message: "Running headless; renderer not available",
    tick: host.tick,
    timestamp: host.tick,
  });
}
```

The kernel does *not* automatically disable a plugin whose optional dependency is missing. The plugin decides its own degradation behavior.

---

## 8. Version mismatch reporting

Every version mismatch is reported with enough information to diagnose:

```typescript
interface VersionMismatchReport {
  kind: "engine" | "dependency" | "capability";
  pluginId: PluginId;
  required: string;               // the range
  found: string;                  // the actual version
  target: string;                 // engine version, dep plugin ID, or capability ID
  source: "manifest" | "runtime";
}
```

In dev mode, the kernel prints a human-readable summary at startup:

```
[Dependency Resolution]
  OK: ga:core@0.1.0
  OK: ga:determinism@0.1.0 (depends on ga:core@0.1.0)
  OK: ga:renderer@0.1.0 (depends on ga:core@0.1.0, ga:determinism@0.1.0)
  FAIL: ga:combat@0.2.0
    engineVersionRange ">=0.2.0" does not satisfy engine "0.1.3"
  FAIL: ga:advanced-fog@0.1.0
    requires ga:renderer/FogUniforms@^0.2.0, found 0.1.0
  WARN: ga:optional-stats@0.1.0
    optional dependency ga:telemetry@^0.1.0 not found; running in degraded mode
```

In production, the same information goes to the diagnostics service as structured events.

---

## 9. Failure cases (consolidated)

| Failure | Stage | Severity | Recovery |
|---|---|---|---|
| Manifest invalid | Validation (§2.1 of `03`) | Fatal for that plugin | Operator fixes manifest |
| Engine version mismatch | Compatibility filter | Fatal for that plugin | Operator updates plugin or engine |
| Dependency cycle | Graph build | Fatal for all plugins in cycle | Operator breaks the cycle |
| Missing non-optional dependency | Graph build | Fatal for depending plugin + transitives | Operator installs missing plugin |
| Missing optional dependency | Graph build | Warn | Plugin degrades |
| Dependency version mismatch | Graph build | Fatal (non-optional) or warn (optional) | Operator updates plugin |
| Missing required capability | Capability matching | Fatal for requiring plugin | Operator installs provider |
| Missing optional capability | Capability matching | Warn | Plugin degrades |
| Capability conflict (multiple providers) | Capability matching | Info (one wins, others quiesced) | None needed |
| Provider fails after matching | Runtime | Fatal for that plugin; `CapabilityLost` for dependents | Operator reloads |

### 9.1 Cascading failure

A single missing plugin can cascade. The kernel's policy is **fail loud, fail early**: a missing required dependency aborts the entire load, rather than running with a hole. This implements invariant 4.5.

The operator can override this for *optional* dependencies by marking them optional in the manifest. There is no escape hatch for required dependencies.

### 9.2 Partial load

The kernel does *not* support partial load (running with some required plugins missing). This was a rejected alternative (§11). The engine either runs with all required dependencies satisfied or it does not run.

---

## 10. Performance budget

| Operation | Budget |
|---|---|
| Manifest read (per plugin) | < 5 ms |
| Compatibility filter (100 plugins) | < 10 ms |
| Dependency graph build (100 plugins) | < 5 ms |
| Cycle detection (Tarjan, 100 plugins) | < 5 ms |
| Capability matching (100 plugins, 50 capabilities) | < 20 ms |
| Topological sort (100 plugins) | < 5 ms |
| Total resolution (100 plugins) | < 50 ms |

The resolution runs once at engine startup. It is not on the hot path.

---

## 11. Rejected alternatives

| Alternative | Why rejected |
|---|---|
| Allow plugins to declare dependencies on specific versions only (no ranges) | Makes upgrades painful; semver ranges are the industry standard. |
| Auto-install missing plugins from npm at runtime | Security risk; the engine should not have network permission by default. |
| Auto-promote quiesced capability providers when the winner fails | Can change determinism mid-session. Operator-driven reload is safer. |
| Allow partial load (run with missing required plugins) | Violates invariant 4.5 (no silent compatibility). |
| Use plugin load order from `plugins.json` instead of topological sort | Wrong: dependencies must initialize before dependents. |
| Use a SAT solver for capability matching | Overkill for the expected scale (≤ 100 plugins, ≤ 50 capabilities). Greedy with deterministic tiebreakers is sufficient and faster. |
| Allow plugins to specify "soft" version requirements (warn but don't fail) | Violates invariant 4.5. Either a version is compatible or it isn't. |
| Resolve capabilities lazily (at first call) | Delays failure to runtime, where it is harder to diagnose. Eager resolution surfaces failures at startup. |
| Allow plugins to upgrade themselves at runtime | Breaks determinism (state shape changes mid-session). Upgrades are a session-boundary operation. |

---

## 12. Tests

### 12.1 Unit tests

- `resolution-cycle-detection.test.ts`: a 3-plugin cycle is detected; all three are rejected.
- `resolution-missing-dependency.test.ts`: plugin A requires B; B is absent; A is rejected; a plugin C depending on A is also rejected.
- `resolution-optional-dependency.test.ts`: plugin A optionally depends on B; B is absent; A loads; the capability `B` would have provided is `undefined`.
- `resolution-version-mismatch.test.ts`: plugin A requires B@^0.2.0; B is at 0.1.0; A is rejected.
- `resolution-capability-conflict.test.ts`: two plugins provide `Renderer`; the higher-version one wins; the other is quiesced.
- `resolution-capability-missing.test.ts`: plugin A requires `Renderer`; no provider; A is rejected.
- `resolution-topo-sort-determinism.test.ts`: same input → same init order across 100 runs.

### 12.2 Integration tests

- `resolution-full-pipeline.test.ts`: a 20-plugin set with mixed required/optional deps and capabilities; verify init order, capability bindings, and diagnostics.
- `resolution-real-plugin-set.test.ts`: the engine's actual built-in plugin set loads without errors.

### 12.3 Property tests

- `resolution-no-cycles.test.ts`: for any random DAG, the resolver produces a valid topological order.
- `resolution-deterministic.test.ts`: for any random plugin set, the resolver produces the same init order across runs (given deterministic input).

---

## 13. What this document unlocks

- `02_KERNEL_LIFECYCLE.md`'s plugin lifecycle can assume a valid, ordered plugin set.
- `03_PLUGIN_SDK_CAPABILITY_SYSTEM.md`'s manifest fields (`dependencies`, `provides`, `requires`, `engineVersionRange`) have a defined resolution semantics.
- `05_DATA_SCHEMAS_SEMANTIC_GRAPH.md`'s definition graph can assume the lore-loader plugin has loaded before any generator plugin that consumes it.
- `06_DETERMINISM_SEEDS_REPLAY.md`'s fingerprint system can assume the plugin set is fixed for a given save (no mid-session upgrades).

The resolver is the gatekeeper. The next document specifies the data the resolver lets through.
