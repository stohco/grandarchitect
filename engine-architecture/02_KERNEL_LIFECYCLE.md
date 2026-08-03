# 02 — Kernel Lifecycle

**Status:** Normative. Specifies the minimal kernel that knows nothing about sects, immortals, or techniques.
**Date:** 2026-08-03

---

## 0. Scope

The kernel is the engine's substrate. It is the only non-plugin code. It contains twelve subsystems, each answering the standard set of questions (ownership, threading, determinism, persistence, versioning, extension, failure, recovery, profiling, debugging, performance budget, tests, reference plugin, absence behavior).

The kernel is **content-blind**. It does not know what a sect is. It does not know what qi is. It knows: plugin lifecycle, capability slots, service container, scheduler, events, entities, resources, determinism, jobs, persistence, diagnostics, configuration, security. Everything else is a plugin.

```
+-----------------------------------------------------------------------+
|                              KERNEL                                    |
| 1. Plugin Host | 2. Plugin Lifecycle | 3. Capability Registry          |
| 4. Scheduler   | 5. Entity/Runtime ID | 6. Event Infrastructure       |
| 7. Resource Manager | 8. Determinism Service | 9. Job System          |
| 10. Persistence Kernel | 11. Diagnostics | 12. Configuration          |
| 13. Security Boundary                                                  |
+-----------------------------------------------------------------------+
                              |  exposes PluginHost
                              v
                          [plugins]
```

---

## 1. Subsystem: Plugin Host

**What data does it own?** The plugin registry: `Map<PluginId, PluginInstance>`. The active host configuration (build ID, engine version, capability routing).

**What does it read?** Every plugin manifest at discovery. The capability registry to resolve `provides`/`requires`.

**What can modify it?** Only the Plugin Host itself, during plugin lifecycle transitions. Plugins cannot modify another plugin's registration.

**Which thread?** Main thread only. Worker-facing PluginHost proxies exist but route back to the main thread for registration operations.

**Which timing domain?** `realtime` (lifecycle is not deterministic; it is a one-time setup).

**Is it deterministic?** No. Lifecycle ordering is deterministic given the same plugin set, but the *decision* to load a plugin is a build-time choice, not a runtime one.

**How is it saved?** It is not. The plugin set is re-derived from the build manifest at engine startup.

**How is it versioned?** The engine version is part of the determinism fingerprint. Plugin versions are part of each plugin's manifest and feed into `04_DEPENDENCY_RESOLUTION_COMPATIBILITY.md`.

**How do plugins extend it?** They do not. The Plugin Host is closed to extension; plugins consume it.

**How does it fail?**
- Plugin throws during `init` → the plugin is marked `failed`, its provided capabilities are unregistered, dependents receive `CapabilityLost`.
- Plugin manifest is invalid → refused at validation, never enters `init`.
- Plugin version is outside the engine's range → refused at dependency resolution.

**How does it recover?** A failed plugin cannot be retried within the same engine session. The operator must fix the plugin and reload. The kernel does not auto-retry; auto-retry masks bugs.

**How is it profiled?** Per-plugin `init`/`destroy` duration is recorded by the diagnostics service. Budget: 500 ms cold per plugin, 2 s hard limit.

**How is it debugged?** The diagnostics service exposes the current plugin state (`discovered` → `validated` → `registered` → `initialized` → `started` → `suspended` → `stopped` → `disposed`).

**Performance budget.** Cold load of 20 plugins: < 2 s total. Warm restart (no re-discovery): < 500 ms.

**Automated tests.**
- `kernel-lifecycle.test.ts`: load a minimal plugin set, verify ordering, verify `init` is called in topological order.
- `kernel-lifecycle-failure.test.ts`: inject a plugin whose `init` throws; verify dependents receive `CapabilityLost`; verify no state corruption.
- `kernel-lifecycle-version-range.test.ts`: load a plugin whose `engineVersionRange` excludes the current engine; verify refusal.

**Reference plugin.** `ga:tick-counter` — registers a state slice and a single system that increments a counter each tick. Demonstrates the full lifecycle.

**Behavior when an expected plugin is absent.** The kernel refuses to enter `started`. Diagnostics emits `MissingDependency { requiredBy, capabilityId }`. The engine does not run with a hole.

```typescript
interface PluginHost {
  readonly engineVersion: string;
  readonly buildId: string;
  getState<T>(pluginId: PluginId): T;
  setState<T>(pluginId: PluginId, state: T): void;
  emit<T>(type: string, payload: T): void;
  on<T>(type: string, handler: (e: Event<T>) => void): Unsubscribe;
  registerSystem(spec: SystemSpec): void;
  registerGeneratorStage(stage: GeneratorStage): void;
  registerRenderPass(pass: RenderPass): void;
  registerComponentType(type: ComponentTypeDecl): void;
  registerSerializer(s: SerializerDecl): void;
  registerMigration(m: MigrationDecl): void;
  registerAsset(a: AssetDeclaration): void;
  getCapability<T>(id: CapabilityId): T | undefined;
  requireCapability<T>(id: CapabilityId): T; // throws if absent
  loadAsset(hash: string): Promise<AssetHandle>;
  rngStream(name: string): RngStream;
  checkpoint(): string;
  emitDiagnostic(d: Diagnostic): void;
}
```

---

## 2. Subsystem: Plugin Lifecycle

The lifecycle state machine (from `03_PLUGIN_SDK_CAPABILITY_SYSTEM.md`):

```
[discovered] --validate--> [validated]
[validated] --resolve--> [dependency-resolved]
[dependency-resolved] --register--> [registered]
[registered] --init--> [initialized]
[initialized] --attachWorld--> [world-attached]
[world-attached] --start--> [started]
[started] --suspend--> [suspended]
[suspended] --resume--> [started]
[started|suspended] --stop--> [stopped]
[stopped|failed] --dispose--> [disposed]
```

Transitions are irreversible within a session except `suspended ↔ started`. A `disposed` plugin cannot return; a new instance must be loaded.

```typescript
type PluginState =
  | "discovered" | "validated" | "dependency-resolved" | "registered"
  | "initialized" | "world-attached" | "started" | "suspended"
  | "stopped" | "disposed" | "failed";

interface PluginInstance {
  manifest: PluginManifest;
  state: PluginState;
  instance?: Plugin;            // present after registered
  initDurationMs?: number;
  failureReason?: string;
}
```

**Failure cases.**
- `validate` fails (manifest schema invalid) → `failed`, never retried.
- `dependency-resolved` fails (missing dependency or version mismatch) → `failed`, reported with the offending edge.
- `init` throws → `failed`, all registered capabilities unregistered.
- `start` throws → `failed`, world state rolled back to pre-attach snapshot.

**Rejected alternative.** Allow plugins to be re-initialized after `failed`. Rejected: a plugin that failed once may have left half-mutated state; clean reload is safer.

---

## 3. Subsystem: Capability Registry

**What data does it own?** `Map<CapabilityId, CapabilityBinding>` where `CapabilityBinding` records the providing plugin, the implementing service object, and the version.

**What does it read?** Plugin manifests at registration time.

**What can modify it?** Only the Plugin Host, during plugin `init`. Plugins register capabilities through `PluginHost` (which routes to the registry).

**Which thread?** Main thread only. Workers resolve capabilities via a synchronous proxy that marshals calls to the main thread.

**Which timing domain?** `realtime` for registration; the resolved service may be called from any domain.

**Is it deterministic?** The *registry contents* are deterministic given the same plugin set. The *resolution order* is deterministic (topological). The *runtime calls* are deterministic if the underlying service is.

**How is it saved?** Not saved. The registry is reconstructed at startup.

**How is it versioned?** Each capability declaration includes `version: string`. The resolver matches `requires` ranges to `provides` versions (see `04_DEPENDENCY_RESOLUTION_COMPATIBILITY.md`).

**How do plugins extend it?** By declaring `provides: CapabilityDeclaration[]` in their manifest and calling `host.registerCapability(id, impl)` during `init`.

**How does it fail?**
- Two plugins provide the same capability → the later one wins; the earlier one is warned and its binding quiesced (calls throw `CapabilityQuiesced`).
- A `requireCapability` call finds nothing → throws `CapabilityUnavailable`.

**How does it recover?** Capabilities do not auto-recover. If a providing plugin fails, dependents receive `CapabilityLost` and must re-resolve.

**Performance budget.** Capability resolution: < 1 ms per call (cached). Cold resolution: < 100 ms for 50 capabilities.

**Automated tests.**
- `capability-conflict.test.ts`: two plugins provide `Renderer`; the second wins; the first's binding throws on call.
- `capability-lost.test.ts`: the providing plugin fails; dependents receive the event and degrade.

**Reference plugin.** `ga:capability-demo` — provides a `Counter` capability, calls it from a system, prints the result.

```typescript
interface CapabilityDeclaration {
  id: CapabilityId;          // e.g., "ga:renderer/Renderer"
  version: string;           // semver
  interfaceId: string;       // TypeScript interface name (for tooling)
}

interface CapabilityRequirement {
  id: CapabilityId;
  versionRange: string;      // semver range
  optional?: boolean;        // if true, kernel won't refuse to load
}

interface CapabilityBinding {
  declaration: CapabilityDeclaration;
  provider: PluginId;
  service: unknown;          // the actual implementation
  quiesced: boolean;         // true if superseded or provider failed
}
```

---

## 4. Subsystem: Scheduler

**What data does it own?** The tick counter (`uint64`), the system registry (`Map<SystemId, SystemSpec>`), the per-tier update policy, the render-pass priority queue, the timing-domain clocks.

**What does it read?** System declarations (reads/writes component types, tier, priority) to compute the run order per tick.

**What can modify it?** Plugin Host during plugin `init` (registering systems). The scheduler itself advances its clocks.

**Which thread?** Main thread for system registration. System *execution* may be parallelized via the job system (read/write sets permitting).

**Which timing domain?** The scheduler owns all three timing domains: `simulation` (fixed timestep), `render` (display rate), `realtime` (wall clock). It is the *only* subsystem permitted to advance them.

**Is it deterministic?** The `simulation` domain is deterministic: fixed timestep, ordered systems, deterministic RNG. The `render` and `realtime` domains are not.

**How is it saved?** The tick counter is saved as part of every checkpoint. The system registry is re-derived at startup.

**How is it versioned?** System IDs are versioned via their plugin's manifest. Adding/removing a system changes the fingerprint (via the plugin version).

**How do plugins extend it?** `host.registerSystem(spec)` during `init`. The scheduler assigns a stable run order based on (priority, registration order).

**How does it fail?**
- A system throws → the scheduler emits `SystemCrashed`, marks the system `failed`, continues with remaining systems. The tick is *not* rolled back (a half-advanced tick is preferable to a frozen engine); the next checkpoint will diverge from a clean run.
- A system exceeds its time budget → in dev mode, `BudgetExceeded`; in production, logged.

**How does it recover?** A failed system is skipped on subsequent ticks until the operator reloads the plugin. The engine continues.

**Performance budget.** Per-tick scheduler overhead: < 0.5 ms for 100 systems. Per-tick total system execution: see invariant budgets in `00`.

**Automated tests.**
- `scheduler-determinism.test.ts`: run 1000 ticks with a fixed seed; checkpoint; reload; run 1000 ticks; checkpoint; assert hashes equal.
- `scheduler-tier-transition.test.ts`: an entity demoted S4→S2 does not lose named state; promotion S2→S4 does not fabricate state.
- `scheduler-system-crash.test.ts`: a system that throws is skipped; other systems continue.

**Reference plugin.** `ga:tick-counter` (the same reference plugin as Plugin Host — it registers a system).

```typescript
interface SystemSpec {
  id: string;
  pluginId: PluginId;
  priority: number;          // lower = earlier
  reads: ComponentTypeId[];
  writes: ComponentTypeId[];
  minTier: SimulationTier;   // runs only for entities at or above this tier
  run(ctx: SystemContext): void;
}

interface SystemContext {
  tick: number;
  dt: Fixed64;               // Q32.32, deterministic
  rng: RngStream;            // stream scoped to this system + tick
  host: PluginHost;
  entities: EntityQuery;     // filtered by reads/writes + tier
}

interface Scheduler {
  readonly tick: number;
  registerSystem(spec: SystemSpec): void;
  unregisterSystem(id: string): void;
  advanceSimulation(dt: Fixed64): void;     // called by the engine loop
  advanceRender(): void;                     // called by RAF
  advanceRealtime(): void;                   // called by RAF
}
```

---

## 5. Subsystem: Entity / Runtime Identity

**What data does it own?** The entity ID allocator (`uint32` counter), the entity registry (`Map<EntityId, Entity>`), the spatial-node registry (delegated to `ga:scene`).

**What does it read?** Component-type declarations to route component queries.

**What can modify it?** The kernel owns the entity ID allocator and the registry. Component data is owned by plugins but stored in the kernel's entity map.

**Which thread?** Main thread. Worker-side snapshots are read-only copies.

**Which timing domain?** `simulation` (entity creation during simulation is deterministic; entity creation during UI interaction is not, and is forbidden).

**Is it deterministic?** Entity ID assignment is deterministic if creation order is deterministic. Plugins must create entities in a deterministic order (e.g., from a generator stage, not in response to a UI event).

**How is it saved?** The full entity registry is CBOR-serialized at checkpoint. Entity IDs are preserved across save/load.

**How is it versioned?** Component type IDs include the plugin ID and version. A component type whose schema changes bumps its version; old saves require a migration.

**How do plugins extend it?** By registering component types and creating entities through `host.entities.create()`.

**How does it fail?**
- Entity ID overflow (`uint32` exhausted) → `EntityIdExhausted` fatal. The engine stops. (4 billion entities is far beyond budget; this is a sanity check.)
- Component type collision (two plugins register the same type ID) → `ComponentTypeConflict` fatal at registration.

**How does it recover?** It does not. Both failures are fatal.

**Performance budget.** Entity creation: < 10 µs. Component query (1000 entities, 5 component types): < 0.5 ms.

**Automated tests.**
- `entity-id-stability.test.ts`: create 1000 entities, save, reload, assert IDs preserved.
- `component-collision.test.ts`: two plugins register `ga:foo/Bar`; second registration fails fatally.

**Reference plugin.** `ga:scene` (the scene graph plugin) — creates entities with transforms.

```typescript
interface EntityManager {
  create(spec?: EntityCreateSpec): EntityId;
  destroy(id: EntityId): void;
  get(id: EntityId): Entity | undefined;
  attachComponent<T>(id: EntityId, type: ComponentTypeId, data: T): void;
  detachComponent(id: EntityId, type: ComponentTypeId): void;
  query(filter: EntityQueryFilter): EntityIterator;
}

interface EntityQueryFilter {
  allOf?: ComponentTypeId[];
  anyOf?: ComponentTypeId[];
  noneOf?: ComponentTypeId[];
  tier?: SimulationTier;
}
```

---

## 6. Subsystem: Event Infrastructure

**What data does it own?** The subscriber registry (`Map<EventType, Set<Handler>>`), the per-tick event queue, the sequence counter.

**What does it read?** Nothing persistent.

**What can modify it?** The Plugin Host during `init` (subscriptions). The event bus itself during emission.

**Which thread?** Main thread. Workers cannot emit events directly; they return values that the spawning system emits.

**Which timing domain?** `realtime` for emission and dispatch. Events are *not* deterministic. (Deterministic cross-plugin communication uses the command log, which is a separate mechanism owned by the persistence kernel.)

**Is it deterministic?** No. Events must not drive simulation state. If a plugin uses an event to drive simulation, the determinism enforcer flags it.

**How is it saved?** It is not. Events are transient.

**How is it versioned?** Event types are strings; versioning is the plugin's responsibility (suffix `_v2`).

**How do plugins extend it?** `host.on(type, handler)` and `host.emit(type, payload)`.

**How does it fail?**
- A handler throws → the event bus emits `HandlerCrashed` (a meta-event) and continues with the next handler. The original event is *not* re-dispatched.
- The event queue exceeds its budget (default 10,000 events/tick) → `EventQueueOverflow` fatal. Indicates a feedback loop.

**How does it recover?** A crashed handler is removed from the subscriber set. The plugin is marked `degraded`.

**Performance budget.** Event emission: < 5 µs. Dispatch to 1000 subscribers: < 1 ms.

**Automated tests.**
- `event-bus-ordering.test.ts`: events emitted in tick T are delivered in tick T, in emission order.
- `event-handler-crash.test.ts`: a handler that throws is removed; others still receive the event.
- `event-queue-overflow.test.ts`: 10,001 events in one tick triggers fatal.

**Reference plugin.** `ga:event-demo` — emits a `Ping` event every 100 ticks; a second handler receives it.

```typescript
type Unsubscribe = () => void;
interface EventBus {
  emit<T>(type: string, payload: T): void;
  on<T>(type: string, handler: (e: Event<T>) => void): Unsubscribe;
  once<T>(type: string, handler: (e: Event<T>) => void): Unsubscribe;
}
interface Event<T = unknown> {
  type: string;
  payload: T;
  emittedBy: PluginId;
  tick: number;
  sequence: number;
}
```

---

## 7. Subsystem: Resource Manager

**What data does it own?** The asset registry (`Map<Hash, AssetRecord>`), the in-memory cache (`Map<Hash, WeakRef<AssetBlob>>`), the loader registry (`Map<MimeType, AssetLoader>`).

**What does it read?** Asset declarations from plugin manifests. The OPFS/IndexedDB stores for persisted asset bytes.

**What can modify it?** The Plugin Host during `init` (asset declarations). The resource manager itself during load/evict.

**Which thread?** Asset *metadata* on the main thread. Asset *decoding* on worker threads (KTX2, meshoptimizer, glTF parsing). Asset *upload* to GPU on the render thread.

**Which timing domain?** `realtime` (asset loading is not deterministic; assets are content-addressed, so the *result* is deterministic, but the *timing* is not).

**Is it deterministic?** The *contents* of a loaded asset are deterministic (SHA-256 verified). The *order* of loading is not. Plugins must not depend on load order.

**How is it saved?** Asset bytes are saved in OPFS, keyed by hash. The registry is reconstructed at startup by scanning plugin manifests.

**How is it versioned?** Assets are content-addressed. A new version of an asset is a new hash. Plugins reference assets by hash, not by name; updating an asset requires updating the plugin's manifest.

**How do plugins extend it?** By declaring assets in their manifest and by registering loaders for new MIME types.

**How does it fail?**
- Hash mismatch (downloaded bytes don't match declared hash) → `AssetHashMismatch` fatal. The asset is not loaded.
- Loader unavailable for a MIME type → `LoaderMissing` fatal at registration.
- Storage quota exceeded → `StorageQuotaExceeded` warn; the resource manager evicts least-recently-used assets.

**How does it recover?** Hash mismatch is unrecoverable (the bytes are corrupt or the manifest is wrong). Storage quota is recovered by eviction.

**Performance budget.** Asset load (1 MB glTF): < 100 ms decode + < 50 ms GPU upload. Cache hit: < 1 ms.

**Automated tests.**
- `asset-hash-verify.test.ts`: load an asset; tamper with the bytes; verify refusal.
- `asset-eviction.test.ts`: load 1,000 assets with a 100-asset cache; verify LRU eviction.
- `asset-loader-missing.test.ts`: declare an asset with an unknown MIME type; verify fatal at registration.

**Reference plugin.** `ga:assets` (the core asset loader plugin) — provides the `AssetLoader` capability for glTF, KTX2, meshoptimizer.

```typescript
interface ResourceManager {
  declareAsset(decl: AssetDeclaration): void;
  loadAsset(hash: string): Promise<AssetHandle>;
  evict(hash: string): void;
  registerLoader(mimeType: string, loader: AssetLoader): void;
}
interface AssetHandle {
  hash: string;
  blob: AssetBlob;            // typed: Mesh | Texture | Material | AudioBuffer | ...
  refCount: number;
}
interface AssetLoader {
  mimeType: string;
  decode(bytes: Uint8Array, ctx: LoaderContext): Promise<AssetBlob>;
}
```

---

## 8. Subsystem: Determinism Service

**What data does it own?** The root RNG state (`XoshiroState`), the stream allocation table (`Map<StreamName, XoshiroState>`), the determinism fingerprint, the forbidden-function trap table, the checkpoint log.

**What does it read?** The fingerprint from the engine build. The entity registry and plugin state slices during checkpoint.

**What can modify it?** Only the determinism service itself. Plugins request streams via `host.rngStream(name)`; they do not touch the root state.

**Which thread?** Main thread for stream allocation and checkpoint. Workers receive stream *snapshots* (copies), not references; they return derived values.

**Which timing domain?** `simulation` (all RNG draws must occur in the simulation domain).

**Is it deterministic?** Yes. This is the contract. See `06_DETERMINISM_SEEDS_REPLAY.md` for the full specification.

**How is it saved?** The RNG state is part of every checkpoint. The fingerprint is embedded in every save.

**How is it versioned?** The fingerprint is the version. A change to any determinism-affecting component (RNG algorithm, transcendentals, fixed-point, serialization, hash) bumps the fingerprint.

**How do plugins extend it?** They do not. The determinism service is closed. Plugins consume it via `host.rngStream(name)` and `host.checkpoint()`.

**How does it fail?**
- A forbidden function is called in dev mode → `DeterminismViolation` fatal at the call site.
- Checkpoint hash mismatch (cross-browser verification) → `DeterminismDivergence` fatal.
- Stream name collision → `RngStreamConflict` fatal at allocation.

**How does it recover?** It does not. Determinism violations are fatal; the engine stops.

**Performance budget.** RNG draw: < 100 ns. Checkpoint (1000 entities): < 50 ms. Forbidden-function trap overhead (dev mode only): < 10 %.

**Automated tests.**
- The harness in `src/lib/determinism/harness.ts` is the canonical test.
- `determinism-forbidden-fn.test.ts`: call `Math.random()` in a system; verify fatal.
- `determinism-stream-isolation.test.ts`: two streams with different names produce independent sequences; same name from the same root produces the same sequence.

**Reference plugin.** `ga:determinism` (the core determinism plugin) — wires the existing `src/lib/determinism/*` modules into the kernel.

```typescript
interface DeterminismService {
  readonly fingerprint: DeterminismFingerprint;
  rngStream(name: string): RngStream;
  checkpoint(): string;       // SHA-256 hex of full world state
  verify(expectedHash: string): boolean;
  forbiddenFnTrap(): void;    // installed in dev mode
}
interface RngStream {
  nextDouble(): number;
  nextIntRange(min: number, max: number): number;
  nextBoolean(p: number): boolean;
  snapshot(): RngSnapshot;
  restore(snap: RngSnapshot): void;
}
```

---

## 9. Subsystem: Job System

**What data does it own?** The worker pool (`Worker[]`), the job queue, the dependency graph, the in-flight job map.

**What does it read?** Job declarations (reads/writes sets, dependencies) to schedule safely.

**What can modify it?** The job system itself.

**Which thread?** Main thread for scheduling; worker threads for execution.

**Which timing domain?** `simulation` (jobs are part of the simulation tick).

**Is it deterministic?** Yes, *given the same snapshot inputs*. Workers must be pure: they receive a snapshot, compute, return a result. They must not call `Math.random`, `Date.now`, or any non-deterministic API.

**How is it saved?** It is not. In-flight jobs are cancelled at checkpoint; the snapshot is taken after the tick completes.

**How is it versioned?** Via the worker script's content hash, which is part of the build fingerprint.

**How do plugins extend it?** By submitting jobs via `host.jobs.submit(spec)`.

**How does it fail?**
- A worker crashes → `WorkerCrashed`; the job is retried once on another worker; if it fails again, the tick is marked `degraded`.
- A worker calls a forbidden function → the worker is terminated; the tick is marked `degraded`.

**How does it recover?** Workers are restarted from a clean state. Lost work is recomputed on the retry.

**Performance budget.** Job dispatch overhead: < 0.1 ms. Worker startup: < 50 ms (amortized). Job execution: depends on the work; budget per job is declared in the spec.

**Automated tests.**
- `job-determinism.test.ts`: the same job submitted with the same snapshot produces bit-identical results across workers.
- `job-worker-crash.test.ts`: a worker is killed mid-job; the job is retried; the tick completes.

**Reference plugin.** `ga:job-demo` — submits a parallelizable computation (e.g., 1000 spatial queries) and aggregates results.

```typescript
interface JobSystem {
  submit<T>(spec: JobSpec<T>): Promise<T>;
  readonly workerCount: number;
}
interface JobSpec<T> {
  pluginId: PluginId;
  snapshot: unknown;          // CBOR-serializable input
  compute: (snap: unknown, rng: RngStream) => T;  // pure function
  budgetMs: number;
  rngStreamName: string;      // a fresh substream is derived for this job
}
```

---

## 10. Subsystem: Persistence Kernel

**What data does it own?** The transaction log, the atomic-write protocol state, the rollback buffer, the serializer registry.

**What does it read?** The serializer registry (ordered by plugin dependency). The entity registry and plugin state slices during save.

**What can modify it?** The persistence kernel itself.

**Which thread?** Main thread for transaction coordination. OPFS/IndexedDB writes happen on a dedicated IO worker.

**Which timing domain?** `realtime` for write timing; the *content* of a save is deterministic (it is a snapshot at a given tick).

**Is it deterministic?** The save *content* is deterministic. The save *timing* and *storage layout* are not.

**How is it saved?** Saves are written atomically: write to a temp file, fsync, rename. Old saves are retained per the retention policy (default: last 10).

**How is it versioned?** Every save embeds the determinism fingerprint. A save from fingerprint X loads only in fingerprint X (or via a registered migration).

**How do plugins extend it?** By registering serializers via `host.registerSerializer(spec)`. A serializer declares which state slice it owns and how to (de)serialize it.

**How does it fail?**
- Atomic write fails (e.g., disk full) → `SaveFailed` fatal; the engine continues from the in-memory state.
- Load fingerprint mismatch → `SaveIncompatible` fatal at load; the operator must migrate or start a new game.
- Serializer throws → `SerializerFailed`; the save is aborted; the engine continues.

**How does it recover?** Atomic writes mean a failed write never corrupts a prior save. The operator reloads from the last good save.

**Performance budget.** Full save (1000 entities, 20 plugins): < 200 ms write, < 100 ms read.

**Automated tests.**
- `persistence-atomic.test.ts`: kill the engine mid-write; the prior save is intact.
- `persistence-fingerprint-mismatch.test.ts`: load a save with an incompatible fingerprint; verify refusal.
- `persistence-round-trip.test.ts`: save → reload → checkpoint; hash matches the pre-save checkpoint.

**Reference plugin.** `ga:save` — the core save plugin, providing the `SaveStore` capability backed by OPFS.

```typescript
interface PersistenceKernel {
  save(slot: string): Promise<SaveHash>;
  load(slot: string): Promise<void>;
  listSaves(): SaveSlotInfo[];
  registerSerializer(s: SerializerDecl): void;
  registerMigration(m: MigrationDecl): void;
}
interface SerializerDecl {
  pluginId: PluginId;
  version: string;
  serialize(state: unknown): Uint8Array;        // CBOR bytes
  deserialize(bytes: Uint8Array): unknown;
}
```

---

## 11. Subsystem: Diagnostics

**What data does it own?** The diagnostic queue, the sink registry, the budget thresholds, the per-plugin error counters.

**What does it read?** Nothing persistent. It receives diagnostics from other subsystems.

**What can modify it?** The diagnostics service itself. Plugins emit via `host.emitDiagnostic(d)`.

**Which thread?** Main thread for the queue. A telemetry worker drains the queue in the background.

**Which timing domain?** `realtime` (diagnostics are not deterministic; they are observational).

**Is it deterministic?** No. Diagnostics describe *what the engine observed*, not what it did. Two runs that produce the same world state may emit different diagnostics (e.g., different timing warnings).

**How is it saved?** Diagnostics are saved to a separate log file, not the save file. They do not affect the fingerprint.

**How is it versioned?** Diagnostic codes are strings; versioning is the plugin's responsibility.

**How do plugins extend it?** By emitting diagnostics and by registering sinks (e.g., a remote telemetry sink).

**How does it fail?**
- The diagnostic queue overflows (default 100,000) → oldest entries are dropped; `DiagnosticQueueOverflow` is emitted (a meta-diagnostic).
- A sink throws → the sink is removed; remaining sinks continue.

**How does it recover?** Sinks are independent; one failing sink does not affect others.

**Performance budget.** Diagnostic emission: < 5 µs. Queue drain: < 1 ms per 1000 entries.

**Automated tests.**
- `diagnostics-overflow.test.ts`: emit 100,001 diagnostics; verify oldest dropped and meta-diagnostic emitted.
- `diagnostics-sink-crash.test.ts`: a sink that throws is removed; others continue.

**Reference plugin.** `ga:diagnostics-demo` — emits a diagnostic every 100 ticks; registers a `ConsoleSink`.

```typescript
interface DiagnosticsService {
  emit(d: Diagnostic): void;
  registerSink(s: DiagnosticSink): void;
  query(filter: DiagnosticFilter): Diagnostic[];
}
interface DiagnosticSink {
  id: string;
  write(d: Diagnostic): void;
}
```

---

## 12. Subsystem: Configuration

**What data does it own?** The merged config tree (`Map<ConfigPath, ConfigValue>`), the config schema registry, the config watchers.

**What does it read?** The default config (shipped with the build), the user config (from OPFS), the URL query string (for dev overrides).

**What can modify it?** The config service during load. Plugins can *subscribe* to changes; they cannot write config directly.

**Which thread?** Main thread.

**Which timing domain?** `realtime` (config changes are not deterministic; they are operator inputs).

**Is it deterministic?** The *contents* of the config at engine startup are part of the fingerprint (if they affect simulation). Config changes during a session are *not* part of the fingerprint and must not affect simulation state.

**How is it saved?** The user config is saved to OPFS. The default config is shipped with the build.

**How is it versioned?** Each config key has a `since: string` (engine version). Removed keys are not migrated.

**How do plugins extend it?** By declaring config keys in their manifest (`configSchema`) and subscribing to changes via `host.config.watch(key, handler)`.

**How does it fail?**
- A config value fails schema validation → `ConfigInvalid` fatal at load; the engine refuses to start.
- A plugin reads a config key it did not declare → `ConfigUndeclared` warn.

**How does it recover?** Invalid config is operator-fixable; the engine does not auto-recover.

**Performance budget.** Config read: < 1 µs (cached). Config change notification: < 1 ms for 100 watchers.

**Automated tests.**
- `config-validation.test.ts`: invalid config values are refused at load.
- `config-watch.test.ts`: a watcher receives the new value on change.

**Reference plugin.** `ga:config-demo` — declares a config key and prints its value at startup.

```typescript
interface ConfigService {
  get<T>(key: string): T | undefined;
  getOrDefault<T>(key: string, def: T): T;
  set<T>(key: string, value: T): void;          // user config only
  watch<T>(key: string, handler: (v: T) => void): Unsubscribe;
}
```

---

## 13. Subsystem: Security Boundary

**What data does it own?** The permission grant table (`Map<PluginId, PluginPermission[]>`), the capability gate (intercepts every capability call and checks permissions).

**What does it read?** Plugin manifests (declared permissions), the user's permission grants (persisted in OPFS).

**What can modify it?** The security boundary itself. Plugins cannot modify their own permissions.

**Which thread?** Main thread. Workers receive a permission-checked proxy.

**Which timing domain?** `realtime`.

**Is it deterministic?** Yes, in the sense that the same permission set produces the same capability access. The permissions are part of the engine's static configuration.

**How is it saved?** Permission grants are saved to OPFS. They are not part of the save file.

**How is it versioned?** Permission kinds are versioned with the engine. A new permission kind requires an engine version bump.

**How do plugins extend it?** They declare permissions in their manifest. They do not implement the boundary.

**How does it fail?**
- A plugin attempts a capability call it lacks permission for → `PermissionDenied` fatal at the call site.
- A plugin attempts to escalate its permissions at runtime → `PermissionEscalation` fatal.

**How does it recover?** It does not. Both failures are fatal.

**Performance budget.** Permission check: < 1 µs (cached).

**Automated tests.**
- `security-permission-denied.test.ts`: a plugin without `network` permission attempts `fetch`; fatal.
- `security-escalation.test.ts`: a plugin attempts to grant itself a permission; fatal.

**Reference plugin.** `ga:security-demo` — declares `network` permission, fetches a resource, succeeds; a second plugin without the permission fails.

```typescript
interface SecurityBoundary {
  hasPermission(pluginId: PluginId, perm: PluginPermission): boolean;
  requirePermission(pluginId: PluginId, perm: PluginPermission): void;  // throws
  grant(pluginId: PluginId, perm: PluginPermission): void;              // user-only, via UI
  revoke(pluginId: PluginId, perm: PluginPermission): void;
}
```

---

## 14. Cross-cutting: failure summary

| Subsystem | Fatal failure mode | Degrading failure mode |
|---|---|---|
| Plugin Host | Manifest invalid; init throws | Plugin unavailable (dependency missing) |
| Capability Registry | Conflict unresolvable | Capability lost (provider failed) |
| Scheduler | System registry corrupted | System crashed (skip on subsequent ticks) |
| Entity Manager | ID exhausted; component type conflict | — |
| Event Bus | Queue overflow | Handler crashed (removed) |
| Resource Manager | Hash mismatch; loader missing | Storage quota exceeded (evict) |
| Determinism Service | Forbidden function; divergence | — |
| Job System | Worker pool unavailable | Worker crashed (retry once) |
| Persistence Kernel | Atomic write fails on save | Serializer failed (abort save) |
| Diagnostics | — | Queue overflow (drop oldest); sink crash |
| Configuration | Schema invalid | — |
| Security Boundary | Permission denied; escalation | — |

The kernel is fail-loud by design. Silent failures violate invariant 4.5 (no silent compatibility). Every failure emits a diagnostic with a code, a plugin ID, and a tick.

---

## 15. What this document unlocks

- `03_PLUGIN_SDK_CAPABILITY_SYSTEM.md` can specify the plugin manifest knowing the kernel surfaces (PluginHost, capabilities, scheduler, event bus) it must declare against.
- `04_DEPENDENCY_RESOLUTION_COMPATIBILITY.md` can specify version resolution knowing the capability registry's matching rules.
- `05_DATA_SCHEMAS_SEMANTIC_GRAPH.md` can specify the Definition graph knowing the resource manager loads it and the generator scheduler consumes it.
- `06_DETERMINISM_SEEDS_REPLAY.md` can specify the determinism contract knowing the determinism service's interfaces.

The kernel is the substrate. The plugins are the facets. The next document specifies the SDK that bridges them.
