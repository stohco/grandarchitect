# 01 — Terminology Glossary

**Status:** Normative. Every other engine-architecture document uses these terms with the meanings defined here. If a term is not in this glossary, it is not an engine term.
**Date:** 2026-08-03

---

## 0. How to read this document

Each entry has four parts: (1) a one-line definition, (2) what it owns, (3) what it is not, (4) where it is specified. When two terms are easily confused (e.g., *capability* vs. *service*), the entry notes the distinction. Pinyin is given without tone marks, in lowercase, as a parenthetical — used only for terms whose Chinese form is canonically cited in the bible.

A term marked **[KERNEL]** lives in the kernel and must not reference xianxia domain types. A term marked **[PLUGIN]** is provided by a plugin. A term marked **[CONTENT]** is authored data, not code.

---

## A–C

### Adapter [PLUGIN]
A plugin that exposes an external system (e.g., WebGPU, IndexedDB, a hardware input device) as a kernel-compatible capability. The adapter owns the binding to the external system; the capability owns the contract.

- **Owns:** the binding layer (handles, contexts, device pointers).
- **Is not:** a *capability* — the capability is the abstract contract; the adapter is the concrete bridge.
- **Specified in:** `03_PLUGIN_SDK_CAPABILITY_SYSTEM.md`.

### AI Action [PLUGIN]
A named, typed operation exposed through the headless API. The AI agent calls AI actions to mutate world state. Each action has a deterministic effect and a declared cost (simulation ticks, GPU budget, API budget).

- **Owns:** nothing — it operates on world state via the service container.
- **Is not:** a *command* — commands are queued and ordered by the scheduler; AI actions are synchronous API calls.
- **Specified in:** `03_PLUGIN_SDK_CAPABILITY_SYSTEM.md` §6.

### Asset Record [CONTENT]
A content-addressed entry in the asset registry. Each record has: a SHA-256 hash, a MIME type, a byte size, a list of dependent plugins, and a loader. The loader produces an in-memory representation (mesh, texture, material, glTF scene, audio buffer).

```typescript
interface AssetRecord {
  hash: string;          // SHA-256 hex
  mimeType: string;
  byteSize: number;
  declaredBy: PluginId;  // which plugin registered the asset
  loader: AssetLoaderId; // which loader handles this MIME type
  refCount: number;      // kernel-tracked, never set by plugins
}
```

- **Owns:** the bytes (in OPFS or IndexedDB), the metadata, the in-memory cache slot.
- **Is not:** an *entity* — assets are not simulated. An entity references an asset.
- **Specified in:** `02_KERNEL_LIFECYCLE.md` §7 (resource manager).

### Capability [KERNEL]
An abstract contract published by the kernel and implemented by a plugin. Capabilities are typed interfaces: `Renderer`, `SaveStore`, `RngStream`, `SpatialIndex`, etc. The capability registry maps a capability ID to the plugin currently implementing it.

- **Owns:** the contract (a TypeScript interface). The implementing plugin owns the runtime state.
- **Is not:** a *service* — a service is a concrete object retrieved from the service container; a capability is the abstract slot the service fills.
- **Specified in:** `02_KERNEL_LIFECYCLE.md` §3 (capability registry), `03_PLUGIN_SDK_CAPABILITY_SYSTEM.md` §4.

### Component [PLUGIN]
A typed data bag attached to an entity. Components are owned by plugins; the kernel stores them opaquely. Components are the data half of ECS; systems are the behavior half.

```typescript
interface Component<TData> {
  typeId: string;        // e.g., "ga:combat/CombatState"
  pluginId: PluginId;    // the owning plugin
  data: TData;           // must be CBOR-serializable
}
```

- **Owns:** a slice of an entity's state.
- **Is not:** an *entity* (an entity is an ID + a set of components) or a *definition* (a definition is authored content; a component is runtime state).
- **Specified in:** `05_DATA_SCHEMAS_SEMANTIC_GRAPH.md` §3.

---

## D–F

### Definition [CONTENT]
A node in the authored concept graph. The bible is parsed into `Definition` objects (see `src/lib/engine/definitions.ts`). Definitions reference each other by typed `Relation`s and declare which `SimulationHook`s they participate in.

```typescript
interface Definition {
  id: string;            // namespaced, e.g. "essence.qi"
  kind: DefinitionKind;  // "realm" | "technique" | ...
  name: string;
  nameHanzi?: string;    // pinyin-free, original Hanzi
  tags: string[];
  description: string;
  source: string;        // bible citation, e.g. "doc 00 §6"
  relations: Relation[];
  simulationHooks: SimulationHook[];
  renderProfile?: string;
  version: string;       // semver
}
```

- **Owns:** nothing at runtime — it is data. Generator plugins read definitions and produce entities.
- **Is not:** a *template* (a template instantiates an entity from a definition + parameters) or a *rule* (a rule constrains simulation behavior, not authored content).
- **Specified in:** `05_DATA_SCHEMAS_SEMANTIC_GRAPH.md` §1.

### Determinism Service [KERNEL]
The kernel service that owns the RNG stream allocation, the determinism fingerprint, the forbidden-function enforcement, and the checkpoint hash computation. It is the contract enforcer for invariant 4.1.

- **Owns:** the root RNG state, the stream allocation table, the fingerprint, the forbidden-function trap table.
- **Is not:** the *persistence kernel* — the determinism service computes hashes; the persistence kernel stores them.
- **Specified in:** `06_DETERMINISM_SEEDS_REPLAY.md`, `02_KERNEL_LIFECYCLE.md` §8.

### Diagnostics [KERNEL]
The kernel subsystem that collects structured events (warnings, errors, budget violations, determinism violations) and routes them to sinks (dev console, in-game overlay, telemetry worker). Plugins emit diagnostics; they do not write to sinks directly.

```typescript
type DiagnosticLevel = "debug" | "info" | "warn" | "error" | "fatal";
interface Diagnostic {
  level: DiagnosticLevel;
  code: string;          // e.g., "DET-FORBIDDEN-FN"
  pluginId?: PluginId;
  message: string;
  data?: unknown;
  tick: number;
  timestamp: number;     // engine tick, not wall clock
}
```

- **Owns:** the diagnostic queue, the sink registry, the budget thresholds.
- **Is not:** `console.log` — diagnostics are structured, versioned, and replayable.
- **Specified in:** `02_KERNEL_LIFECYCLE.md` §12.

---

## E–F (cont.)

### Entity [PLUGIN]
A runtime identifier with attached components. Entities are created by the scene plugin (`ga:scene`) and live until destroyed. An entity ID is a `uint32` assigned by the kernel; it is stable across save/load.

```typescript
interface Entity {
  id: EntityId;                    // uint32, kernel-assigned
  components: Map<ComponentTypeId, Component<unknown>>;
  spatialNode?: SpatialNodeId;     // present if entity participates in the spatial graph
  simulationTier: SimulationTier;  // S0–S4
}
```

- **Owns:** its component set, its spatial node reference, its tier.
- **Is not:** a *definition* (definitions are authored; entities are runtime). An entity is *instantiated from* a template, which references a definition.
- **Specified in:** `02_KERNEL_LIFECYCLE.md` §5 (entity/runtime identity).

### Event [KERNEL]
A typed, ordered message on the kernel event bus. Events are the only sanctioned cross-plugin communication channel for non-deterministic signals (UI updates, asset load completion, plugin lifecycle). Events used for *deterministic* simulation go through the command log instead.

```typescript
interface Event<TPayload = unknown> {
  type: string;          // e.g., "ga:combat/AttackLanded"
  payload: TPayload;
  emittedBy: PluginId;
  tick: number;          // engine tick at emission
  sequence: number;      // monotonic within a tick
}
```

- **Owns:** nothing — events are transient.
- **Is not:** a *command* — commands are deterministic and replayable; events are advisory.
- **Specified in:** `02_KERNEL_LIFECYCLE.md` §6 (event infrastructure).

---

## G–I

### Generator Stage [PLUGIN]
A named step in the world-generation pipeline. Each stage consumes the output of prior stages and the definition graph, and produces entities. Stages are ordered by the generator scheduler; a stage's output is hashable for verification.

```typescript
interface GeneratorStage {
  id: string;            // e.g., "ga:gen-settlement/PlaceHouses"
  requires: string[];    // prior stage IDs
  produces: string;      // output schema name
  run(ctx: GeneratorContext): Promise<GeneratorOutput>;
}
```

- **Owns:** the entity set it produces.
- **Is not:** a *system* — systems run every tick; generator stages run once at world creation.
- **Specified in:** `05_DATA_SCHEMAS_SEMANTIC_GRAPH.md` §7.

### Instance [PLUGIN]
A materialized runtime object created from a *template* and a *definition*. An instance of a `technique` definition is a technique an NPC knows; an instance of a `location` definition is a placed village. The instance carries the runtime state; the definition carries the authored contract.

- **Owns:** runtime state (cooldowns, wear, mutation, learned progress).
- **Is not:** a *definition* (authored) or a *template* (parameterization).
- **Specified in:** `05_DATA_SCHEMAS_SEMANTIC_GRAPH.md` §2.

---

## J–M

### Job System [KERNEL]
The kernel subsystem that schedules short, deterministic units of work across Web Workers. Jobs are pure functions over snapshot data; they cannot mutate shared state directly. The job system owns the worker pool, the work-stealing queue, and the dependency graph between jobs.

- **Owns:** the worker pool, the job queue, the dependency graph.
- **Is not:** the *scheduler* — the scheduler orders systems within a tick; the job system parallelizes work *within* a system.
- **Specified in:** `02_KERNEL_LIFECYCLE.md` §10.

### Kernel [KERNEL]
The minimal non-plugin code that hosts plugins. The kernel contains: plugin host, capability registry, service container, scheduler, event bus, resource manager, determinism service, job system, persistence kernel, diagnostics, configuration, security boundary. The kernel is specified in `02_KERNEL_LIFECYCLE.md`. It contains zero references to xianxia domain types (invariant 4.2).

- **Owns:** plugin lifecycle, capability slots, the scheduler's clock, the root RNG, the persistence transactions.
- **Is not:** the *engine* — the engine is the kernel + all loaded plugins + presentation. The kernel is the substrate.

### Manifest [CONTENT]
The declaration file a plugin ships describing itself: ID, version, engine version range, dependencies, provided capabilities, required capabilities, entry points, permissions, deterministic mode, worker compatibility, schemas, assets, migrations. The manifest is the unit of plugin validation; a plugin without a valid manifest is refused.

```typescript
interface PluginManifest {
  id: PluginId;
  version: string;                 // semver
  engineVersionRange: string;      // e.g., ">=0.1.0 <0.2.0"
  dependencies: PluginDependency[];
  provides: CapabilityDeclaration[];
  requires: CapabilityRequirement[];
  entryPoints: PluginEntryPoints;
  permissions: PluginPermission[];
  deterministicMode: "strict" | "audit" | "off";
  workerCompatible: boolean;
  schemas: SchemaDeclaration[];
  assets: AssetDeclaration[];
  migrations: MigrationDeclaration[];
}
```

- **Owns:** its own static declaration.
- **Specified in:** `03_PLUGIN_SDK_CAPABILITY_SYSTEM.md` §2.

---

## N–P

### Permission [KERNEL]
A declared, reviewable grant a plugin requests in its manifest. Permissions gate access to browser primitives and to kernel services that have side effects (network, OPFS, IndexedDB, clipboard, worker spawn). The security boundary (§13 of `02`) enforces permissions at the capability boundary.

```typescript
type PluginPermission =
  | { kind: "network"; hosts: string[] }
  | { kind: "storage"; backends: ("opfs" | "indexeddb" | "memory")[] }
  | { kind: "worker"; maxWorkers: number }
  | { kind: "clipboard"; read: boolean; write: boolean }
  | { kind: "gpu"; preferWebGPU: boolean };
```

- **Owns:** the declaration; the kernel owns the enforcement.
- **Specified in:** `02_KERNEL_LIFECYCLE.md` §13.

### Persistence Kernel [KERNEL]
The kernel subsystem that owns save/load transactions. It is *not* the save format — the format is CBOR + the determinism fingerprint. The persistence kernel owns the transaction log, the atomic write protocol, and the rollback mechanism. Plugins register serializers; the persistence kernel calls them in topological order during a save.

- **Owns:** the transaction log, the atomic write protocol, the rollback buffer.
- **Is not:** the *determinism service* — the determinism service computes hashes; the persistence kernel stores bytes.
- **Specified in:** `02_KERNEL_LIFECYCLE.md` §11.

### Plugin [PLUGIN]
A self-contained module that implements one or more capabilities. Plugins declare a manifest, expose entry points, and obey the determinism contract. Everything except the kernel is a plugin — including the renderer, the determinism stack (the implementation; the contract is the kernel's), and the save system.

- **Owns:** its state slice, its component types, its systems, its asset declarations, its serializers.
- **Is not:** the *kernel* — plugins cannot import kernel internals; they consume the `PluginHost` interface.
- **Specified in:** `03_PLUGIN_SDK_CAPABILITY_SYSTEM.md`.

### Plugin Host [KERNEL]
The kernel interface every plugin receives at initialization. It is the *only* kernel surface plugins are permitted to call. It exposes: state access, event bus, scheduler registration, capability queries, resource manager, determinism service, diagnostics emitter.

```typescript
interface PluginHost {
  // State
  getState<T>(pluginId: PluginId): T;
  setState<T>(pluginId: PluginId, state: T): void;
  // Events
  emit<T>(type: string, payload: T): void;
  on<T>(type: string, handler: (e: Event<T>) => void): Unsubscribe;
  // Scheduler
  registerSystem(spec: SystemSpec): void;
  registerGeneratorStage(stage: GeneratorStage): void;
  // Capabilities
  getCapability<T>(id: CapabilityId): T | undefined;
  // Resources
  loadAsset(hash: string): Promise<AssetHandle>;
  // Determinism
  rngStream(name: string): RngStream;
  checkpoint(): string;
  // Diagnostics
  emitDiagnostic(d: Diagnostic): void;
}
```

- **Specified in:** `02_KERNEL_LIFECYCLE.md` §2.

---

## R–S

### Render Pass [PLUGIN]
A named, priority-ordered stage of the rendering pipeline. The renderer plugin (`ga:renderer`) sorts passes by priority and executes them in order. Each pass declares its inputs (render targets, depth buffer) and outputs.

```typescript
interface RenderPass {
  id: string;            // e.g., "ga:water/WaterSurface"
  priority: number;      // lower = earlier
  inputs: RenderTargetId[];
  outputs: RenderTargetId[];
  execute(ctx: RenderContext): void;
}
```

- **Owns:** its render targets, its material bindings.
- **Is not:** a *system* — systems run in the simulation tick; render passes run in the render frame.
- **Specified in:** `02_KERNEL_LIFECYCLE.md` §4 (scheduler) and the renderer plugin doc (future).

### Rule [CONTENT]
A declarative constraint that the simulation must enforce. Rules are authored data, not code; the rule-evaluation plugin (a future `ga:rules`) compiles them into evaluator functions. A rule might say: "a Qi Condensation cultivator cannot split a mountain" or "a Foundation Establishment cultivator's lifespan is at most 200 years."

```typescript
interface Rule {
  id: string;
  scope: "world" | "region" | "entity" | "interaction";
  predicate: string;      // expression in the rule DSL
  consequence: string;    // what happens if violated
  source: string;         // bible citation
  version: string;
}
```

- **Owns:** nothing at runtime — it is data.
- **Is not:** a *definition* (definitions describe what things are; rules describe what is forbidden) or a *system* (systems run code; rules are interpreted).
- **Specified in:** `05_DATA_SCHEMAS_SEMANTIC_GRAPH.md` §4.

### Scheduler [KERNEL]
The kernel subsystem that orders systems within a tick. The scheduler owns the tick clock (a deterministic `uint64` advanced by the simulation loop), the system registry, and the per-tier update policy (S0–S4 frequency).

- **Owns:** the tick clock, the system registry, the per-tier policy.
- **Is not:** the *job system* — the scheduler decides *what runs when*; the job system decides *what runs on which worker*.
- **Specified in:** `02_KERNEL_LIFECYCLE.md` §4.

### Service [KERNEL]
A concrete object retrieved from the service container that implements a capability. Where a capability is the abstract contract, a service is the runtime instance. Only one service per capability per kernel instance (last-registered wins; earlier registrations are warned and quiesced).

```typescript
interface ServiceContainer {
  resolve<T>(id: CapabilityId): T;        // throws if unimplemented
  tryResolve<T>(id: CapabilityId): T | undefined;
  register<T>(id: CapabilityId, impl: T): void;  // plugin-only, via PluginHost
}
```

- **Owns:** the registry of capability → implementation.
- **Specified in:** `02_KERNEL_LIFECYCLE.md` §3.

### Simulation Tier [KERNEL]
The fidelity level at which an entity is simulated. Tiers are S0 (dormant) through S4 (detailed). Tier transitions are deterministic and conserved: promotion cannot create favorable facts; demotion cannot erase named entities.

```typescript
type SimulationTier = 0 | 1 | 2 | 3 | 4;
// 0: Dormant (frozen, scheduled wake)
// 1: Historical (demographic/aggregate only)
// 2: Regional (aggregate state, scheduled updates)
// 3: Interactive (full state machine, reduced frequency)
// 4: Detailed (full simulation, every tick)
```

- **Owns:** the per-entity tier field. The scheduler owns the transition policy.
- **Specified in:** `02_KERNEL_LIFECYCLE.md` §4.

### Spatial Node [PLUGIN]
A node in the spatial graph owned by the `ga:scene` plugin. Each spatial node has a transform (Q32.32 fixed-point position + quaternion rotation) and a parent. Entities reference spatial nodes to participate in spatial queries.

```typescript
interface SpatialNode {
  id: SpatialNodeId;
  parentId: SpatialNodeId | null;
  localPosition: Fixed64Vec3;     // Q32.32
  localRotation: Quat;            // double-precision, but never accumulated
  worldTransform: AffineMatrix;   // recomputed each tick; never serialized
}
```

- **Owns:** its local transform.
- **Is not:** an *entity* — an entity has at most one spatial node, but a spatial node may exist without an entity (e.g., a camera anchor).
- **Specified in:** `02_KERNEL_LIFECYCLE.md` §5, the spatial-index capability doc (future).

### System [PLUGIN]
A registered callback that runs each tick (or per tier frequency). Systems are the behavior half of ECS; components are the data half. A system declares the component types it reads and writes; the scheduler uses these for parallelization.

```typescript
interface SystemSpec {
  id: string;            // e.g., "ga:combat/ResolveAttacks"
  priority: number;
  reads: ComponentTypeId[];
  writes: ComponentTypeId[];
  tier: SimulationTier;  // minimum tier at which this system runs
  run(ctx: SystemContext): void;
}
```

- **Owns:** nothing — it mutates component state through the system context.
- **Is not:** a *generator stage* (generator stages run once at world creation; systems run every tick).
- **Specified in:** `02_KERNEL_LIFECYCLE.md` §4.

---

## T–Z

### Template [CONTENT]
A parameterized recipe for instantiating an entity from a definition. Templates carry the parameters that vary across instances (a village's name, a technique's mastery level, an NPC's starting qi). Definitions carry the invariants.

```typescript
interface Template<TParams = unknown> {
  id: string;
  definitionId: string;       // which Definition this instantiates
  params: TParams;            // must be CBOR-serializable
  version: string;
}
```

- **Owns:** nothing at runtime — it is data.
- **Specified in:** `05_DATA_SCHEMAS_SEMANTIC_GRAPH.md` §2.

### Timing Domain [KERNEL]
A named clock the scheduler advances independently. The engine has three timing domains: `simulation` (fixed-timestep, deterministic), `render` (display-rate, non-deterministic), `realtime` (wall-clock, non-deterministic, used only for UI). Simulation code may only read `simulation`; render code may read `simulation` and `render`; UI code may read all three.

- **Owns:** nothing — the scheduler owns the clocks.
- **Is not:** a *simulation tier* — timing domains are about *when* code runs; tiers are about *how often* an entity is updated.
- **Specified in:** `02_KERNEL_LIFECYCLE.md` §4.

### Worker [KERNEL]
A Web Worker spawned by the kernel's job system. Workers are deterministic: they receive a snapshot, compute, return a result. Workers cannot emit events directly; they return values that the spawning system emits.

- **Owns:** their isolated state.
- **Is not:** a *thread* — workers do not share address space; they communicate by message passing.
- **Specified in:** `02_KERNEL_LIFECYCLE.md` §10.

---

## Ambiguity resolutions

| Confused pair | Distinction |
|---|---|
| Capability vs. Service | Capability = abstract contract (interface). Service = concrete instance. The capability `Renderer` is an interface; the `ga:renderer` plugin's `WebGPURenderer` is the service. |
| Definition vs. Template | Definition = authored invariants. Template = parameterization for instantiation. A `technique` definition says "Burning Palm has 14/6/12 frames"; a template says "NPC #42 knows Burning Palm at mastery 0.3." |
| Template vs. Instance | Template = authored recipe. Instance = runtime object produced by instantiating a template. The template lives in the asset registry; the instance lives in the entity's component set. |
| Rule vs. System | Rule = declarative constraint (data). System = imperative behavior (code). A rule says "Qi Condensation cannot split mountains"; a system enforces it. |
| Event vs. Command | Event = advisory, non-deterministic signal (UI update). Command = ordered, deterministic, replayable mutation. Simulation uses commands; presentation uses events. |
| Plugin vs. Adapter | Plugin = any module that provides capabilities. Adapter = a plugin whose specific job is bridging an external system (WebGPU, OPFS) to a capability. All adapters are plugins; not all plugins are adapters. |
| Spatial Node vs. Entity | Spatial node = transform in the spatial graph. Entity = runtime identity with components. An entity has at most one spatial node; a spatial node may exist without an entity. |
| Job vs. System | System = runs every tick (or per-tier). Job = a one-shot unit of parallel work submitted *by* a system to the job system. |
| Timing Domain vs. Simulation Tier | Timing domain = when code runs. Simulation tier = how often an entity is updated. The render timing domain runs at 60 Hz; an S2 entity's systems run at 1 Hz. |

---

## What this document unlocks

The remaining documents can use these terms without redefinition. Every interface in `02`–`06` references at least one term defined here; the glossary is the contract for what those terms mean.
