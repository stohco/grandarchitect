# 03 — Plugin SDK and Capability System

**Status:** Normative. Specifies the plugin manifest, lifecycle, registration surface, and safe-failure rules.
**Date:** 2026-08-03

---

## 0. Scope

A plugin is the unit of extension. Everything except the kernel is a plugin: the renderer, the determinism stack, the save system, the asset loader, the generators, the simulation systems. This document specifies:

1. The **plugin manifest** — what a plugin declares about itself.
2. The **plugin lifecycle** — the state machine the kernel runs a plugin through.
3. The **registration surface** — what a plugin can register with the kernel.
4. **Safe failure** — how incompatible or broken plugins are isolated without corrupting the engine.

This document does *not* specify dependency resolution (see `04`) or determinism enforcement (see `06`). It assumes both.

---

## 1. The plugin contract

A plugin is a TypeScript module whose default export is a `Plugin` object:

```typescript
interface Plugin {
  readonly manifest: PluginManifest;
  init(host: PluginHost): Promise<void> | void;
  destroy(host: PluginHost): Promise<void> | void;
}
```

The `manifest` is a static object the kernel reads *before* importing the plugin's code. The kernel validates the manifest, resolves dependencies, and *only then* calls `init`. A plugin whose manifest is invalid never has its code imported.

---

## 2. The plugin manifest

```typescript
interface PluginManifest {
  /** Globally unique plugin ID, namespaced: "author:name". */
  id: PluginId;

  /** Semantic version. The kernel uses this for dependency matching. */
  version: string;

  /** Semver range restricting compatible engine versions. */
  engineVersionRange: string;

  /** Other plugins this plugin requires. */
  dependencies: PluginDependency[];

  /** Capabilities this plugin provides. */
  provides: CapabilityDeclaration[];

  /** Capabilities this plugin requires to function. */
  requires: CapabilityRequirement[];

  /** Entry points — code paths the kernel imports lazily. */
  entryPoints: PluginEntryPoints;

  /** Permissions the plugin requests. Reviewed at install. */
  permissions: PluginPermission[];

  /** Determinism mode. "strict" = dev-mode throws on forbidden fn; "audit" = log only; "off" = unchecked (kernel may refuse). */
  deterministicMode: "strict" | "audit" | "off";

  /** Whether the plugin's code can run in a Web Worker. */
  workerCompatible: boolean;

  /** Schemas the plugin declares (component types, state slice, config). */
  schemas: SchemaDeclaration[];

  /** Assets the plugin ships (referenced by hash). */
  assets: AssetDeclaration[];

  /** Migrations the plugin provides (for save-file upgrades). */
  migrations: MigrationDeclaration[];

  /** Human-readable metadata. Not used by the kernel. */
  meta: PluginMeta;
}

interface PluginDependency {
  id: PluginId;
  versionRange: string;
  optional?: boolean;
}

interface PluginEntryPoints {
  /** Main thread entry. Imported at init. */
  main: string;                  // ESM module path
  /** Worker entry. Imported when the plugin submits a job. Optional. */
  worker?: string;
  /** Headless entry. Imported when the engine runs without a renderer. */
  headless?: string;
}

interface PluginMeta {
  name: string;
  description: string;
  author: string;
  license: string;
  homepage?: string;
  bibleRefs?: string[];          // citations to corpus docs, e.g. "doc 04 §1"
}
```

### 2.1 Manifest validation

The kernel validates the manifest before importing the plugin's code:

1. `id` matches `^[a-z][a-z0-9-]*:[a-z][a-z0-9-]*$` (author:name, lowercase).
2. `version` is valid semver.
3. `engineVersionRange` is a valid semver range and matches the current engine version.
4. `dependencies` references no plugin by its own ID.
5. `provides` has no duplicate capability IDs.
6. `requires` has no duplicate capability IDs.
7. `entryPoints.main` is a non-empty string.
8. `permissions` contains no unrecognized permission kinds.
9. `schemas` references no schema ID owned by another plugin (no schema squatting).
10. `migrations` have monotonically increasing `from` versions and a non-empty `to` version.

Any violation aborts validation. The plugin never enters the code-loading phase.

---

## 3. The plugin lifecycle

```
[discovered]
   |  manifest read from plugins.json or npm/CDN fetch
   v
[validated]
   |  schema check (§2.1) + signature verification
   v
[dependency-resolved]
   |  topological sort + version range matching (see 04)
   v
[registered]
   |  capability declarations recorded in the registry (no code yet)
   v
[initialized]
   |  entryPoints.main imported; plugin.init(host) called
   v
[world-attached]
   |  plugin's state slice created in the world store
   v
[started]
   |  plugin's systems begin receiving ticks
   v
[suspended]  <--->  [started]
   |  (operator action; deterministic pause)
   v
[stopped]
   |  plugin's systems unregistered; no more ticks
   v
[disposed]
   |  plugin.destroy(host) called; state slice removed; capabilities unregistered
```

### 3.1 State transition rules

| From | To | Trigger | Reversible? |
|---|---|---|---|
| discovered | validated | manifest schema check passes | No |
| validated | dependency-resolved | all `requires` satisfied, all `dependencies` resolvable | No |
| dependency-resolved | registered | capability declarations recorded | No |
| registered | initialized | `entryPoints.main` imported, `init()` returns | No |
| initialized | world-attached | state slice allocated, serializers registered | No |
| world-attached | started | scheduler accepts the plugin's systems | Yes (suspend) |
| started | suspended | operator or kernel pause | Yes (resume) |
| started/suspended | stopped | operator stop or engine shutdown | No |
| stopped | disposed | `destroy()` returns | No |
| *any* | failed | validation, dependency, init, or runtime error | No (within session) |

### 3.2 The `init` contract

`init(host)` is called exactly once. Inside `init`, the plugin may:
- Register state slices (`host.setState(pluginId, initialState)`).
- Register systems (`host.registerSystem(spec)`).
- Register generator stages (`host.registerGeneratorStage(stage)`).
- Register render passes (`host.registerRenderPass(pass)`).
- Register component types (`host.registerComponentType(type)`).
- Register serializers (`host.registerSerializer(s)`).
- Register migrations (`host.registerMigration(m)`).
- Register asset loaders (`host.loadAsset` is for use; loader registration is via the resource manager capability).
- Subscribe to events (`host.on(type, handler)`).
- Resolve and cache capabilities (`host.getCapability(id)`).

`init` must not:
- Mutate another plugin's state (use the event bus).
- Spawn workers (the job system handles workers).
- Block on IO (use `async` and `await`).
- Call `host.checkpoint()` (the kernel calls it; the plugin reads the result via events if needed).

If `init` throws, the plugin transitions to `failed`. All registrations it made during `init` are rolled back. The kernel emits `PluginInitFailed { pluginId, error }`.

### 3.3 The `destroy` contract

`destroy(host)` is called exactly once, in reverse dependency order. Inside `destroy`, the plugin must:
- Release any external resources (GPU buffers, file handles, worker ports).
- Unsubscribe from events (the kernel also forcibly unsubscribes, but explicit is preferred).
- Leave the state slice in a serializable state (the kernel will read it for the final checkpoint).

`destroy` must not:
- Mutate another plugin's state.
- Throw. If it does, the kernel emits `PluginDestroyFailed` and continues with the next plugin.

### 3.4 The `headless` entry point

If `entryPoints.headless` is declared, the kernel imports it instead of `entryPoints.main` when running headless. The headless entry must register the *same* state slice, systems, and serializers, but must *not* register render passes or other renderer-dependent surfaces. The kernel verifies this by diffing the registrations of `main` and `headless` in dev mode.

---

## 4. What a plugin can register

Plugins extend the engine by registering one or more of the following. Each registration is a typed declaration; the kernel stores it and routes calls through the appropriate subsystem.

### 4.1 Components

```typescript
interface ComponentTypeDecl<TData = unknown> {
  typeId: ComponentTypeId;        // "pluginId/ComponentName"
  pluginId: PluginId;
  schema: JsonSchema;             // CBOR-serializable shape
  version: string;
  defaultData: () => TData;
}
```

Components are the data half of ECS. A plugin registers a component type once (during `init`) and attaches instances to entities.

### 4.2 Systems

```typescript
interface SystemSpec {
  id: string;                     // "pluginId/SystemName"
  pluginId: PluginId;
  priority: number;
  reads: ComponentTypeId[];
  writes: ComponentTypeId[];
  minTier: SimulationTier;
  run(ctx: SystemContext): void;
}
```

Systems run each tick (or per-tier frequency). They are the behavior half of ECS.

### 4.3 Services

A plugin *provides* a service by declaring a capability in `provides` and registering the implementation during `init`:

```typescript
host.registerCapability("ga:renderer/Renderer", new WebGPURenderer(host));
```

Only one service per capability per session (last-registered wins; earlier is quiesced).

### 4.4 Commands

Commands are ordered, deterministic, replayable mutations. The command log is owned by the persistence kernel; plugins declare command types and handlers:

```typescript
interface CommandDecl<TPayload = unknown> {
  typeId: string;                 // "pluginId/CommandName"
  pluginId: PluginId;
  schema: JsonSchema;
  apply(state: unknown, payload: TPayload, ctx: CommandContext): void;
}
```

Commands are the *only* sanctioned way for an AI action or UI input to mutate simulation state. Direct `host.setState` from outside a system is forbidden in production (warned in dev).

### 4.5 Events

Events are not registered — they are emitted by string type. However, plugins may declare *event schemas* for documentation and validation:

```typescript
interface EventSchemaDecl {
  type: string;                   // "pluginId/EventName"
  pluginId: PluginId;
  schema: JsonSchema;
}
```

In dev mode, the event bus validates payloads against the schema. In production, validation is skipped.

### 4.6 Definitions

Plugins may contribute to the definition graph by registering definitions during `init`:

```typescript
host.registerDefinitions(myDefinitions);  // Definition[]
```

Definitions are content; plugins that ship definitions (e.g., `ga:lore-loader`) typically load them from the bible rather than hard-coding. See `05_DATA_SCHEMAS_SEMANTIC_GRAPH.md`.

### 4.7 Schemas

A plugin declares JSON Schemas for its component types, state slice, config keys, and command payloads. The kernel uses these for validation (dev mode) and for the headless API's introspection surface.

```typescript
interface SchemaDeclaration {
  id: string;                     // "pluginId/SchemaName"
  pluginId: PluginId;
  kind: "component" | "state" | "config" | "command" | "event";
  schema: JsonSchema;
  version: string;
}
```

### 4.8 Serializers

Plugins that own state must register a serializer. The persistence kernel calls serializers in topological order during save.

```typescript
interface SerializerDecl {
  pluginId: PluginId;
  version: string;
  serialize(state: unknown): Uint8Array;        // CBOR bytes
  deserialize(bytes: Uint8Array): unknown;
}
```

### 4.9 Migrations

A migration upgrades a save from an older plugin version to a newer one. Migrations are pure functions over CBOR bytes.

```typescript
interface MigrationDecl {
  pluginId: PluginId;
  from: string;                   // semver
  to: string;                     // semver
  migrate(bytes: Uint8Array): Uint8Array;
}
```

Migrations are chained: if a save is at plugin v0.1.0 and the current plugin is v0.3.0, the kernel applies the v0.1→v0.2 migration, then v0.2→v0.3. If any link in the chain is missing, the load fails with `MigrationMissing`.

### 4.10 Generator stages

```typescript
interface GeneratorStage {
  id: string;                     // "pluginId/StageName"
  pluginId: PluginId;
  requires: string[];             // prior stage IDs
  produces: string;               // output schema name
  run(ctx: GeneratorContext): Promise<GeneratorOutput>;
}
```

Generator stages run once at world creation, in topological order. See `05` §7.

### 4.11 AI actions

```typescript
interface AIActionDecl<TParams = unknown, TResult = unknown> {
  id: string;                     // "pluginId/ActionName"
  pluginId: PluginId;
  schema: JsonSchema;             // params schema
  cost: { simulationTicks: number; gpuMs: number; apiBudget: number };
  execute(params: TParams, ctx: AIActionContext): Promise<TResult>;
}
```

AI actions are the headless surface. See §6.

### 4.12 Animation nodes

Animation nodes are registered by the `ga:animation` plugin (or a future equivalent). The registration shape is forward-declared here; the animation plugin owns the contract.

### 4.13 Effect types

Effect types are registered by the `ga:effects` plugin. Same forward-declaration pattern.

### 4.14 Render passes

```typescript
interface RenderPass {
  id: string;                     // "pluginId/PassName"
  pluginId: PluginId;
  priority: number;
  inputs: RenderTargetId[];
  outputs: RenderTargetId[];
  execute(ctx: RenderContext): void;
}
```

### 4.15 Materials

Materials are registered as assets (content-addressed). A plugin declares a material by declaring an asset with `mimeType: "application/x-ga-material"`.

### 4.16 Terrain brushes

Terrain brushes are registered by the `ga:terrain` plugin. Forward-declared.

### 4.17 Physics shapes

Physics shapes are registered by the `ga:physics` plugin. Forward-declared.

### 4.18 Editor panels

```typescript
interface EditorPanelDecl {
  id: string;                     // "pluginId/PanelName"
  pluginId: PluginId;
  title: string;
  controls: EditorControl[];
}
interface EditorControl {
  key: string;                    // config key or state path
  label: string;
  type: "slider" | "color" | "toggle" | "select" | "vector3" | "text";
  min?: number; max?: number; step?: number;
  options?: { value: string; label: string }[];
}
```

Every editor panel control is automatically mirrored in the headless API (invariant 4.4).

### 4.19 Diagnostics

Plugins do not register diagnostics; they emit them via `host.emitDiagnostic(d)`. However, plugins may register *diagnostic sinks* (e.g., a remote telemetry endpoint).

### 4.20 Tests

Plugins may declare self-tests:

```typescript
interface PluginTestDecl {
  id: string;                     // "pluginId/TestName"
  pluginId: PluginId;
  category: "unit" | "integration" | "determinism" | "fuzz";
  run(ctx: TestContext): Promise<TestResult>;
}
```

The kernel runs plugin self-tests in dev mode at startup. Failures are reported as diagnostics; they do not block engine startup.

---

## 5. The capability system

### 5.1 Capability declaration vs. requirement

A capability is a typed interface. A plugin *declares* it provides a capability in its manifest; the kernel *matches* it against requirements from other plugins.

```typescript
interface CapabilityDeclaration {
  id: CapabilityId;               // "pluginId/CapabilityName"
  version: string;
  interfaceId: string;            // TypeScript interface name (for tooling)
}

interface CapabilityRequirement {
  id: CapabilityId;
  versionRange: string;
  optional?: boolean;
}
```

### 5.2 Resolution

See `04_DEPENDENCY_RESOLUTION_COMPATIBILITY.md` for the full algorithm. Summary:

1. Collect all `provides` from all validated plugins.
2. For each `requires`, find a provider whose `version` satisfies the `versionRange`.
3. If multiple providers satisfy, choose the highest version (deterministic).
4. If no provider satisfies an *optional* requirement, log a warning and continue.
5. If no provider satisfies a *required* requirement, refuse to load the requiring plugin.

### 5.3 Capability loss

If a plugin that provides a capability fails or is disposed, the kernel emits `CapabilityLost { capabilityId, providerPluginId }`. Plugins that depend on the capability must either:
- Degrade gracefully (continue with reduced functionality).
- Suspend themselves (transition to `suspended`).

A plugin that neither degrades nor suspends and continues to call a lost capability receives `CapabilityUnavailable` fatal at the call site.

---

## 6. The AI action surface

Every consequential parameter and operation in the engine is exposed through AI actions. The headless API is the programmatic mirror of the UI.

```typescript
interface HeadlessApi {
  listPlugins(): PluginInfo[];
  listActions(): AIActionDecl[];
  executeAction<T>(id: string, params: unknown): Promise<T>;
  getParams(pluginId: PluginId): Record<string, unknown>;
  setParams(pluginId: PluginId, params: Record<string, unknown>): void;
  listEntities(filter?: EntityQueryFilter): EntityInfo[];
  getEntity(id: EntityId): EntityInfo;
  emitEvent(type: string, payload: unknown): void;
  save(slot: string): Promise<SaveHash>;
  load(slot: string): Promise<void>;
  screenshot(): Uint8Array;       // software-rendered in headless mode
  step(ticks: number): void;
  exportPreset(): string;
  importPreset(json: string): void;
}
```

### 6.1 AI action contract

An AI action must:
- Be deterministic (same params + same state = same result).
- Declare its cost (simulation ticks, GPU ms, API budget).
- Validate its params against its schema before execution.
- Not mutate state outside its declared scope.

A non-deterministic AI action (e.g., "generate a random NPC name") must draw from a declared RNG stream and log the stream name in its result.

---

## 7. Safe failure: incompatible plugins

### 7.1 Manifest incompatibility

A plugin whose `engineVersionRange` excludes the current engine version is refused at validation. The kernel emits `PluginIncompatible { pluginId, engineVersion, required: engineVersionRange }`.

A plugin whose `dependencies` cannot be satisfied is refused at dependency resolution. The kernel emits `DependencyUnresolvable { pluginId, missing: PluginId }`.

### 7.2 Capability conflict

If two plugins provide the same capability:
- The higher-version provider wins.
- If versions are equal, the registration order wins (the one whose manifest appeared first in `plugins.json`).
- The losing provider is *not* failed; its `provides` declaration is recorded as `quiesced`. If the winning provider later fails, the kernel does *not* auto-promote the quiesced one — the operator must reload.

### 7.3 Runtime failure

If a plugin throws during `init`, the kernel:
1. Rolls back all registrations the plugin made during `init`.
2. Marks the plugin `failed`.
3. Emits `PluginInitFailed { pluginId, error }`.
4. Notifies dependents via `CapabilityLost` for each capability the failed plugin was providing.
5. Continues with the remaining plugins.

If a plugin throws during a system `run`, the kernel:
1. Marks the system `failed`.
2. Skips the system on subsequent ticks.
3. Emits `SystemCrashed { systemId, error }`.
4. Continues with remaining systems in the same tick.

The engine does *not* auto-restart failed plugins or systems. Auto-restart masks bugs.

### 7.4 Quarantine

A plugin that fails repeatedly across sessions (detected by the operator or a future telemetry review) can be quarantined. A quarantined plugin is loaded but never reaches `started`; its `init` is called, but its systems are not registered. This allows the operator to inspect its state slice without running its code.

Quarantine is operator-initiated (via the config); the kernel does not auto-quarantine.

---

## 8. Reference plugins

| Plugin | Demonstrates |
|---|---|
| `ga:tick-counter` | Minimal plugin: state slice + system + manifest. |
| `ga:capability-demo` | Providing and requiring a capability. |
| `ga:event-demo` | Subscribing to and emitting events. |
| `ga:job-demo` | Submitting parallelizable work to the job system. |
| `ga:diagnostics-demo` | Emitting diagnostics and registering a sink. |
| `ga:config-demo` | Declaring a config key and watching changes. |
| `ga:security-demo` | Requesting and using a permission. |
| `ga:determinism` | The core determinism plugin (real). |
| `ga:save` | The core save plugin (real). |
| `ga:renderer` | The core renderer plugin (real). |
| `ga:lore-loader` | Loading the bible into the definition graph. |
| `ga:gen-settlement` | A generator plugin producing Wang Family Bend. |

Every kernel subsystem (§1–13 of `02`) has at least one reference plugin. A subsystem added without a reference plugin is rejected at review (invariant 4.6).

---

## 9. Failure cases (consolidated)

| Failure | Detection | Response |
|---|---|---|
| Invalid manifest | Validation phase (§2.1) | Refuse to load; emit `ManifestInvalid` |
| Engine version mismatch | Validation phase | Refuse; emit `PluginIncompatible` |
| Missing dependency | Resolution phase | Refuse; emit `DependencyUnresolvable` |
| Missing required capability | Resolution phase | Refuse; emit `CapabilityUnavailable` |
| Init throws | Runtime | Rollback; emit `PluginInitFailed`; notify dependents |
| System throws | Runtime | Skip system; emit `SystemCrashed`; continue tick |
| Destroy throws | Runtime | Log; continue with next plugin |
| Capability conflict | Registration | Quiesce loser; emit `CapabilityQuiesced` |
| Forbidden function (dev) | Determinism trap | Fatal at call site; emit `DeterminismViolation` |
| Permission denied | Security gate | Fatal at call site; emit `PermissionDenied` |
| Plugin exceeds time budget | Diagnostics | Emit `BudgetExceeded`; in strict mode, fail plugin |

---

## 10. Rejected alternatives

| Alternative | Why rejected |
|---|---|
| Dynamic plugin loading without manifests | No way to validate before importing code; security risk. |
| Allow plugins to import kernel internals | Breaks modularity invariant (4.2). |
| Allow multiple services per capability | Ambiguous; hard to reason about. Last-wins is simpler. |
| Auto-restart failed plugins | Masks bugs (AGENTS.md Part 1: no compatibility layers). |
| Schema-less components | Breaks save/load and headless API introspection. |
| Visual scripting instead of TypeScript plugins | Adds a translation layer; TypeScript is already the lingua franca. |
| Plugin inheritance (one plugin extends another) | Composition via capabilities is cleaner; inheritance creates coupling. |
| Hot-reload of plugins during simulation | Breaks determinism (state shape changes mid-tick). Reload only at session boundary. |
| Allow plugins to spawn workers directly | Bypasses the job system's deterministic stream allocation. |

---

## 11. What this document unlocks

- `04_DEPENDENCY_RESOLUTION_COMPATIBILITY.md` can specify the resolver knowing the manifest shape and capability declaration/requirement surface.
- `05_DATA_SCHEMAS_SEMANTIC_GRAPH.md` can specify the Definition graph knowing how plugins register definitions.
- `06_DETERMINISM_SEEDS_REPLAY.md` can specify the determinism contract knowing the `deterministicMode` flag and the forbidden-function trap.

The plugin SDK is the contract between the kernel and the facets. The next document specifies how the kernel decides which facets load and in what order.
