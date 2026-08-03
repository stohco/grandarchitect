# 09 — Entity Runtime State Architecture

**Status:** Foundation architecture. The entity-component model that separates what is simulated from what is rendered.
**Date:** 2026-08-03
**Engine:** Grand Architect (browser-native plugin host, deterministic contract)
**Depends on:** `ga:determinism` (CBOR, SHA-256, RNG), `ga:core` (PluginHost), `07_SCHEDULER_FRAME_LOOP_TIME_DOMAINS` (the fixed tick that bounds component mutations)
**Read with:** `49_CONTENT_ARCHITECTURE §4` (the NPC simulation record), `17_ENGINE_ARCHITECTURE §2.3` (the entity-component model overview)

---

## 0. What this document is

The entity runtime is the data layer every plugin reads and writes. This document specifies: the split between **sim-components** (serializable, hashed, authoritative) and **render-components** (non-serializable, derived, non-authoritative); the entity ID system (stable, persistent, recyclable); the three storage layouts the engine uses (archetype for hot sim queries, sparse-set for transient render state, `Map` for ad-hoc lookups); the query API; the component lifecycle (attach/detach/destroy callbacks); how the renderer derives render-components from sim-components each frame; and the NPC simulation record (from `49_CONTENT_ARCHITECTURE §4`) as the canonical example of a fully-realized entity.

The central tension: **the renderer needs GPU-friendly, mutable, non-serializable state; the determinism contract needs CBOR-serializable, immutable-per-tick, hashable state.** The resolution is the sim/render split: sim-components are the source of truth; render-components are *derived* from them every frame and never written back.

---

## 1. Sim-components vs render-components

### 1.1 The split

```
┌──────────────────────────────────────────────────────────────────┐
│                       ENTITY (id: 0x4a17)                        │
│                                                                  │
│   ┌────────────────────────────────┐  ┌────────────────────────┐ │
│   │  SIM-COMPONENTS                │  │  RENDER-COMPONENTS     │ │
│   │  (serializable, hashed,        │  │  (non-serializable,    │ │
│   │   authoritative)               │  │   derived, non-author) │ │
│   │                                │  │                        │ │
│   │  • Transform (Q32.32 fixed)    │  │  • MeshRef (Three.js)  │ │
│   │  • NpcSchedule (state machine) │  │  • SkinnedMeshRef      │ │
│   │  • QiState (reservoir, phase)  │  │  • MaterialRef         │ │
│   │  • CombatState (frame data)    │  │  • BoneMatrices        │ │
│   │  • RelationshipRecord[]        │  │  • ParticleSystemRef   │ │
│   │  • InventorySeed               │  │  • AudioEmitterRef     │ │
│   │  • SimulationTier (S0-S4)      │  │  • LodBias             │ │
│   │                                │  │                        │ │
│   │  Serialized in save.           │  │  Re-derived each frame │ │
│   │  Hashed at checkpoint.         │  │  Never serialized.     │ │
│   │  Mutated only in phase 3.      │  │  Mutated in phase 7-8. │ │
│   └────────────────────────────────┘  └────────────────────────┘ │
└──────────────────────────────────────────────────────────────────┘
```

### 1.2 TypeScript interfaces

```typescript
/** Marker: every sim-component implements this. */
interface SimComponent {
  /** The component's type tag, e.g. 'ga:npc-sim.NpcSchedule'. */
  readonly __type: string;
  /** A stable hash of the component's *type schema* (not the data).
   *  Used by the determinism fingerprint to detect schema drift. */
  readonly __schemaHash: string;
  /** CBOR-serialize this component. Must be deterministic. */
  __serialize(encoder: CborEncoder): void;
}

/** Marker: every render-component implements this. Not serializable. */
interface RenderComponent {
  readonly __type: string;
  /** Called by the renderer when this component is detached.
   *  Releases GPU resources, removes from scene graph. */
  __dispose(): void;
}

/** An entity is an ID plus two bags of components. */
interface Entity {
  /** Stable, persistent, recyclable (§3). */
  id: EntityId;
  /** The sim-components, keyed by type tag. */
  sim: Map<string, SimComponent>;
  /** The render-components, keyed by type tag. Derived from `sim`. */
  render: Map<string, RenderComponent>;
  /** The spatial node this entity is currently parented to (doc 12). */
  spatialNode: SpatialNodeId;
  /** The entity's current simulation tier (S0-S4). */
  simulationTier: SimulationTier;
  /** A bitmask of which plugins have an interest in this entity.
   *  Used by the streaming system to prevent premature unload. */
  pinnedBy: bigint;
}
```

### 1.3 The contract

1. **Sim-components are the only canonical state.** Every gameplay-relevant fact about an entity lives in its sim-components. The save system serializes only sim-components.
2. **Render-components are derived.** Every frame (phase 7), the renderer walks entities, reads their sim-components, and produces/updates render-components. Render-components are never read by sim systems.
3. **Render-components never write back.** If the renderer needs to change sim state (e.g., a click selects an entity), it emits an event (doc 10) and the sim handles it in phase 3.
4. **Sim-components are CBOR-serializable and hashable.** The determinism enforcer can serialize and hash any entity's sim bag at any tick. Non-serializable fields (function references, Three.js objects, GPU buffers) are forbidden in sim-components — enforced by a lint rule and a runtime proxy in dev mode.
5. **SchemaHash is immutable per type.** When a plugin changes its component's schema (adds a field, changes a type), the `__schemaHash` changes. This invalidates old saves (doc 11 §6) — there is no silent migration.

---

## 2. The entity ID system

### 2.1 Properties

Entity IDs are:
- **Stable**: an entity's ID never changes during its lifetime.
- **Persistent**: the ID is part of the save; reloading the save produces entities with the same IDs.
- **Recyclable**: when an entity is destroyed, its ID is *not* reused for at least 2^64 - 1 ticks (effectively never within a save's lifetime). IDs are 128-bit to make collision vanishingly unlikely even across branches (doc 11 §8).
- **Deterministic**: IDs are assigned by the RNG substream, not by `Date.now()` or allocation order. The same generator run produces the same IDs.

### 2.2 The ID format

```typescript
/** 128-bit entity ID. Stored as two BigInts for portability. */
interface EntityId {
  /** High 64 bits: encodes the origin (which generator, which branch). */
  high: bigint;
  /** Low 64 bits: the entity's unique number within that origin. */
  low: bigint;
}

/** The ID allocator. One per spatial node, seeded deterministically. */
interface EntityIdAllocator {
  /** Allocate the next ID. Deterministic given the seed. */
  next(): EntityId;
  /** Mark an ID as destroyed. It will not be reused. */
  destroy(id: EntityId): void;
  /** Check liveness. */
  isAlive(id: EntityId): boolean;
}
```

The high 64 bits encode a *lineage*: which world seed, which branch, which spatial node. This makes cross-branch entity references (e.g., a memory of an NPC the player met in a parent branch) unambiguous.

### 2.3 ID allocation

IDs are allocated per spatial node (doc 12) by an allocator seeded from `(worldSeed, branchId, spatialNodeId)`:

```typescript
function makeAllocator(worldSeed: bigint, branchId: bigint, nodeId: SpatialNodeId): EntityIdAllocator {
  const seed = jobSeed(worldSeed, branchId, 'entity-id-allocator', nodeId.toString());
  const rng = newXoshiro(seed);
  let counter = 0n;
  const destroyed = new Set<bigint>();
  return {
    next() {
      const low = (rng.next() << 32n) | rng.next();
      // Sanity: assert low !== 0 (0 is reserved for "null entity")
      return { high: encodeLineage(worldSeed, branchId, nodeId), low };
    },
    destroy(id) { destroyed.add(id.low); },
    isAlive(id) { return !destroyed.has(id.low); },
  };
}
```

Two runs of the same world produce the same ID sequence. A save that branches (doc 11 §8) keeps the parent's ID space intact; new entities in the branch get a different `branchId` in the high 64 bits.

### 2.4 The null entity

`EntityId { high: 0n, low: 0n }` is the null entity. It is never alive. Sim systems use it as a sentinel for "no entity" (e.g., a `targetId` field on a combat component when no target is set).

---

## 3. Component storage

The engine uses **three storage layouts**, chosen per component type based on access pattern. The query API (§4) hides the layout from callers.

### 3.1 The three layouts

```
┌──────────────────────────────────────────────────────────────────┐
│                    STORAGE LAYOUTS                               │
│                                                                  │
│  ARCHETYPE         ── entities with the same sim-component set   │
│     ▼                  stored contiguously. Best for hot         │
│  ┌──────────┐          iteration over a fixed component combo.  │
│  │ A: T,R,Q │          Example: all entities with Transform +   │
│  │ A: T,R,Q │          NpcSchedule + QiState (the NPC archetype).│
│  │ A: T,R,Q │                                                   │
│  └──────────┘                                                   │
│                                                                  │
│  SPARSE-SET        ── entities with a specific sim-component,    │
│     ▼                  stored as a packed array + sparse index.  │
│  ┌────────────────┐  Best for add/remove-heavy components       │
│  │ dense: [3,8,2] │  (e.g., CombatState, which is attached      │
│  │ sparse: {3:0,  │  only during combat).                       │
│  │   8:1, 2:2}    │                                            │
│  └────────────────┘                                            │
│                                                                  │
│  MAP               ── a plain Map<EntityId, Component>. Best for │
│     ▼                  ad-hoc lookups by ID (e.g., 'get this    │
│  ┌────────────────┐    NPC's schedule'). Used for components    │
│  │ id → component │    with rare iteration.                     │
│  └────────────────┘                                            │
└──────────────────────────────────────────────────────────────────┘
```

### 3.2 When to use which

| Layout | When | Why |
|---|---|---|
| Archetype | Hot-path systems that iterate "all entities with {T, R, Q}" | Cache-friendly linear scan; no pointer chase |
| Sparse-set | Components frequently attached/detached (CombatState, StatusEffect) | O(1) add/remove; O(n) iteration with swap-remove |
| Map | Components looked up by ID rarely, or only by external systems (the WebSocket API, the scene inspector) | Simpler; pays the indirection cost only when used |

The plugin declares the layout at component-registration time. The engine verifies the choice is sensible (e.g., a component iterated by 5 systems should not be a `Map`).

### 3.3 Archetype storage detail

```typescript
interface Archetype {
  /** The signature: sorted set of component type tags. */
  signature: string[];
  /** Columnar storage. Each column is a typed array of one component type. */
  columns: Map<string, SimComponent[]>;
  /** The entity IDs in this archetype, parallel to the columns. */
  entities: EntityId[];
  /** Index from EntityId → row, for O(1) lookup. */
  index: Map<string, number>;  // key = entityIdToString(id)
}

/** When a component is added/removed, the entity moves between archetypes. */
function moveEntityBetweenArchetypes(
  entity: Entity,
  from: Archetype,
  to: Archetype,
  addedOrRemoved: { type: string; op: 'add' | 'remove'; component?: SimComponent }
): void {
  // 1. Copy all shared components from `from` to `to`.
  // 2. Add/remove the changed component.
  // 3. Remove from `from`, append to `to`.
  // 4. Fire lifecycle callbacks (§5).
}
```

Archetype transitions are amortized O(n) per move, but they are infrequent (only on component add/remove, not per-tick). Hot per-tick iteration is O(n) over the archetype's columns with linear memory access.

### 3.4 Sparse-set detail

```typescript
interface SparseSet<T> {
  dense: T[];           // packed; components stored contiguously
  denseIds: EntityId[]; // parallel to dense
  sparse: Map<string, number>;  // entityId → index in dense
}

const combatStates: SparseSet<CombatState> = {
  dense: [], denseIds: [], sparse: new Map(),
};

function attach(s: SparseSet<CombatState>, id: EntityId, c: CombatState) {
  if (s.sparse.has(idToString(id))) return;  // already attached
  s.sparse.set(idToString(id), s.dense.length);
  s.dense.push(c);
  s.denseIds.push(id);
}

function detach(s: SparseSet<CombatState>, id: EntityId) {
  const idx = s.sparse.get(idToString(id));
  if (idx === undefined) return;
  // swap-remove
  const last = s.dense.length - 1;
  s.dense[idx] = s.dense[last];
  s.denseIds[idx] = s.denseIds[last];
  s.sparse.set(idToString(s.denseIds[idx]), idx);
  s.dense.pop();
  s.denseIds.pop();
  s.sparse.delete(idToString(id));
}
```

---

## 4. The Query API

Systems query entities by component signature. The query API hides the storage layout and returns an iterator that is valid for the duration of the system's execution (entities added/removed during the system's run are not visible to that system — they appear next tick).

```typescript
interface QuerySpec {
  /** Components the entity must have. */
  all?: string[];        // AND
  /** Components the entity must not have. */
  none?: string[];       // NOT
  /** Components of which the entity must have at least one. */
  any?: string[];        // OR
  /** Optional filter on tier (e.g., 'S3+'). */
  tierGte?: SimulationTier;
  /** Optional spatial filter (doc 12). */
  inSpatialNode?: SpatialNodeId | { withinRadius: number; of: EntityId };
}

interface QueryResult {
  /** Iterate entities matching the spec. */
  [Symbol.iterator](): Iterator<{
    id: EntityId;
    sim: Readonly<Map<string, SimComponent>>;
    tier: SimulationTier;
  }>;
  /** Get one component for one entity. Throws if absent. */
  get<T extends SimComponent>(id: EntityId, type: string): T;
  /** Try-get. Returns undefined if absent. */
  tryGet<T extends SimComponent>(id: EntityId, type: string): T | undefined;
  /** Count without iterating. */
  count(): number;
}

interface QueryApi {
  /** Compile a query spec into a reusable QueryResult. */
  query(spec: QuerySpec): QueryResult;
  /** Watch a query: fires when entities enter/leave the result set. */
  watch(spec: QuerySpec, handler: (delta: { added: EntityId[]; removed: EntityId[] }) => void): Unsubscribe;
}
```

### 4.1 Query compilation

Queries are compiled once (at system registration) and re-executed each tick. The compiler picks the cheapest layout:

- If `spec.all` matches an archetype signature exactly, iterate the archetype.
- If `spec.all` has one component, iterate that component's sparse-set (or Map, with a warning).
- Otherwise, pick the smallest column and iterate, filtering by the rest of the spec.

The compiler caches the choice. A query that does not match any efficient layout falls back to scanning all entities (rare; flagged in dev mode).

### 4.2 Watch queries

`watch` is for systems that need to react to entity creation/destruction (e.g., the renderer attaches a MeshRef when an entity gains a Transform). Watchers fire at the end of each fixed tick, not mid-tick, so sim systems see a consistent view during their own execution.

---

## 5. Component lifecycle

Components have lifecycle callbacks. The engine fires them at well-defined points in the frame loop, never mid-system.

```typescript
interface ComponentLifecycle<T extends SimComponent> {
  /** Called when the component is attached to an entity.
   *  Runs at the end of the fixed tick in which the attach happened. */
  onAttach?(entity: EntityId, component: T, ctx: SimContext): void;
  /** Called when the component is detached.
   *  Runs at the end of the fixed tick. */
  onDetach?(entity: EntityId, component: T, ctx: SimContext): void;
  /** Called when the entity is destroyed.
   *  Runs once per component on the entity, in reverse-registration order. */
  onDestroy?(entity: EntityId, component: T, ctx: SimContext): void;
  /** Called once when the component type is registered, for static init. */
  onRegister?(host: PluginHost): void;
}
```

### 5.1 Lifecycle ordering

```
Entity creation (in a system, mid-tick N)
  → component attached (in archetype, immediately)
  → ... other systems run ...
  → end of tick N:
      → onAttach fired for each newly-attached component, in registration order
  → tick N+1:
      → systems see the new entity via queries

Entity destruction (in a system, mid-tick M)
  → entity marked for destruction
  → ... other systems run ...
  → end of tick M:
      → onDestroy fired for each component, in reverse-registration order
      → entity removed from all storage
  → tick M+1:
      → entity gone from queries
```

### 5.2 Why callbacks fire at tick end, not mid-tick

Mid-tick callback firing would mean a system sees an entity mid-creation (some components attached, others not). This breaks the query contract (§4.1: "queries are valid for the duration of the system's execution"). By deferring callbacks to tick end, every system sees a consistent snapshot.

### 5.3 Lifecycle for render-components

Render-components have a simpler lifecycle: `onDerive` (called each frame in phase 7 if the sim-component changed), `onDispose` (called when the sim-component is detached or the entity is destroyed). There is no `onAttach` because render-components are *derived*, not attached.

---

## 6. How the renderer derives render-components

### 6.1 The derive pass (phase 7 of the frame loop)

```
For each entity in the visible set (from phase 9 of the previous frame):
  1. Read the entity's sim-components (Transform, NpcSchedule, QiState, etc.)
  2. Compute a SimHash: a cheap hash of the sim-component values that affect rendering.
     - If SimHash === lastSimHash, skip: the render-components are still valid.
     - If SimHash !== lastSimHash, re-derive:
       a. For each render-component type the entity has:
          - Call derive(simComponents, prevRenderComponent) → newRenderComponent
          - If newRenderComponent is structurally identical, reuse prev (no GPU update)
          - Else, dispose prev, attach new, mark for GPU upload
       b. For each render-component type the entity should have but doesn't:
          - Create it via the registered derive function
       c. For each render-component the entity has but shouldn't:
          - Dispose it
  3. Update lastSimHash.
```

The SimHash is a 32-bit FNV-1a over the CBOR bytes of the sim-components that affect rendering. It is *not* the determinism hash (which is 256-bit SHA-256 over all sim-components). It is a fast cache-invalidator.

### 6.2 The derive function registry

```typescript
interface DeriveFunction<S extends SimComponent, R extends RenderComponent> {
  /** The sim-component type(s) this derive reads. */
  reads: string[];
  /** The render-component type this derive writes. */
  writes: string;
  /** The derive. Reads sim, returns a fresh render-component (or updates the prev). */
  derive(sim: Readonly<Map<string, SimComponent>>, prev: R | null, ctx: RenderContext): R;
}

interface RenderContext {
  /** The interpolated alpha (doc 07 §3.3). */
  alpha: Fixed64;
  /** The renderer's asset cache (for mesh/material lookups). */
  assets: AssetCache;
  /** The current camera (for LOD selection). */
  camera: CameraState;
  /** The frame's GPU upload budget. Derive must not exceed. */
  uploadBudgetBytes: number;
}
```

### 6.3 Example: NPC derivation

```typescript
// ga:npc-sim registers this derive.
const npcMeshDerive: DeriveFunction<NpcSchedule, SkinnedMeshRef> = {
  reads: ['ga:scene.Transform', 'ga:npc-sim.NpcSchedule', 'ga:npc-sim.AppearanceSeed'],
  writes: 'ga:renderer.SkinnedMeshRef',
  derive(sim, prev, ctx) {
    const transform = sim.get('ga:scene.Transform') as Transform;
    const schedule = sim.get('ga:npc-sim.NpcSchedule') as NpcSchedule;
    const appearance = sim.get('ga:npc-sim.AppearanceSeed') as AppearanceSeed;

    // If transform hasn't moved and schedule's activity hasn't changed,
    // reuse prev (no GPU update).
    if (prev && prev.activity === schedule.currentActivity &&
        prev.transformStamp === transform.stamp) {
      prev.matrixWorld = transform.matrixWorld;  // cheap update
      return prev;
    }

    // Otherwise, pick the right animation clip based on activity.
    const clip = activityToClip(schedule.currentActivity);
    if (prev && prev.clip === clip) {
      prev.activity = schedule.currentActivity;
      prev.transformStamp = transform.stamp;
      prev.matrixWorld = transform.matrixWorld;
      return prev;
    }

    // Clip changed: we need a new SkinnedMeshRef (or at least a clip swap).
    if (prev) prev.__dispose();
    const mesh = ctx.assets.getSkinnedMesh(appearance.meshHash);
    mesh.clip = clip;
    mesh.matrixWorld = transform.matrixWorld;
    return { __type: 'ga:renderer.SkinnedMeshRef', clip, mesh, activity: schedule.currentActivity, transformStamp: transform.stamp, __dispose: () => mesh.dispose() };
  },
};
```

### 6.4 What the renderer never does

- **Never reads sim-components directly during render submit.** It reads only render-components. (Render submit is phase 10; derive is phase 7. The two are separate.)
- **Never writes sim-components.** If the renderer needs to change sim state, it queues an event (doc 10) that the sim processes next tick.
- **Never holds references to sim-components across frames.** Render-components hold *copies* of the data they need (e.g., a `matrixWorld` matrix, not a reference to the Transform component). This prevents use-after-free when a sim-component is mutated next tick.

---

## 7. The NPC simulation record (canonical example)

From `49_CONTENT_ARCHITECTURE §4`. This is the fully-realized entity: an NPC with identity, state, social, procedural, and determinism fields.

```typescript
/** The NPC entity's sim-components. Each is a separate SimComponent
 *  so systems can query subsets (e.g., 'all NPCs with schedules' without
 *  loading their relationships). */

interface NpcIdentity extends SimComponent {
  __type: 'ga:npc-sim.NpcIdentity';
  __schemaHash: 'b7c1...';  // pinned at registration
  id: EntityId;
  name: string;
  appearanceSeed: bigint;
  cultureId: string;
}

interface NpcState extends SimComponent {
  __type: 'ga:npc-sim.NpcState';
  __schemaHash: 'a3f2...';
  locationId: SpatialNodeId;
  realmId: string;
  age: number;                  // in in-game days
  health: HealthState;
  qiState: QiState;            // reservoir, phase-affinity, yin-yang, contamination
  heartMind: HeartMindState;   // attention, will, emotional_balance, attachments
}

interface NpcSocial extends SimComponent {
  __type: 'ga:npc-sim.NpcSocial';
  __schemaHash: '9e84...';
  factionId?: EntityId;
  householdId?: EntityId;
  relationships: RelationshipRecord[];
  goals: GoalState[];
  memories: MemoryRecord[];
}

interface NpcProcedural extends SimComponent {
  __type: 'ga:npc-sim.NpcProcedural';
  __schemaHash: '5d11...';
  inventorySeed: bigint;
  scheduleSeed: bigint;
  simulationTier: SimulationTier;
}

interface NpcDeterminism extends SimComponent {
  __type: 'ga:npc-sim.NpcDeterminism';
  __schemaHash: '1c9a...';
  rngStream: string;  // hex — the NPC's deterministic RNG substream
}

/** RelationshipRecord, GoalState, MemoryRecord — per doc 49 §4. */
interface RelationshipRecord {
  targetId: EntityId;
  type: 'kin' | 'teacher' | 'student' | 'rival' | 'ally' | 'enemy' | 'spouse' | 'debtor' | 'creditor' | 'sworn_brother';
  strength: number;     // 0-100
  sentiment: number;    // -100 to 100
  history: EventRef[];
}
```

### 7.1 Why five components, not one

The NPC could be a single `Npc` component. It is split into five because:

1. **Queries are narrow.** The scheduler system only reads `NpcSchedule` and `NpcState`. The relationship system only reads `NpcSocial`. Splitting lets each system iterate the smallest possible column.
2. **Tier transitions touch only one component.** When an NPC demotes from S4 to S3, only `NpcProcedural.simulationTier` and (possibly) `NpcState.locationId` change. The other components are untouched.
3. **Save serialization can skip.** The save system (doc 11) can serialize only the components that changed since the last checkpoint (incremental save). Splitting makes this granularity useful.

### 7.2 The simulation tier field

`NpcProcedural.simulationTier` is one of S0–S4 (doc 12, `49_CONTENT_ARCHITECTURE §4`). The scheduler reads this field to decide how often to tick the NPC's systems:

- **S4**: every fixed tick (60 Hz). Full AI, physics, animation, schedule.
- **S3**: every 4th fixed tick (15 Hz). Full state machine, reduced frequency, no rendering.
- **S2**: every 60th fixed tick (1 Hz, strategic). Aggregate state, scheduled updates, no individual AI.
- **S1**: every 3600th fixed tick (once per in-game minute). Demographic aggregate only.
- **S0**: frozen. Wake only on player approach.

Tier transitions are deterministic and conservation-checked (no promotion creates favorable facts; no demotion erases named entities — `49 §4`).

---

## 8. 16 questions answered

1. **What is this system?** The entity runtime: the sim/render component split, the entity ID system, three storage layouts, the query API, lifecycle callbacks, and the derive pass.

2. **What problem does it solve?** The renderer needs GPU-friendly mutable state; the determinism contract needs CBOR-serializable hashable state. The split lets both coexist.

3. **Core abstractions?** `SimComponent`, `RenderComponent`, `Entity`, `EntityId`, `Archetype`, `SparseSet`, `QuerySpec`, `QueryResult`, `DeriveFunction`, `ComponentLifecycle`.

4. **Data flow?** Sim systems mutate sim-components (phase 3) → derive pass produces render-components (phase 7) → renderer submits (phase 10). Render never writes back.

5. **Lifecycle?** Component registered at plugin init → attached/detached at tick boundaries → destroyed at tick boundaries → type unregistered at plugin destroy.

6. **Invariants?** (a) Sim-components are CBOR-serializable and hashable. (b) Render-components never write back. (c) Entity IDs are stable, persistent, recyclable, deterministic. (d) Queries are snapshot-consistent for the duration of a system's execution. (e) SchemaHash is immutable per type.

7. **Inputs?** Sim systems write sim-components (via the host); the derive pass reads sim-components and the prev render-components.

8. **Outputs?** Render-components consumed by the renderer; query results consumed by sim systems.

9. **Failure modes?** SchemaHash drift (save rejection), archetype-fragmentation (too many archetypes — mitigated by component-set discipline), derive-pass budget overflow (graceful degradation: skip re-derive for distant entities), use-after-free (prevented by render-components holding copies, not references).

10. **Performance budget?** Derive pass < 1 ms per frame for 500 visible entities. Query iteration < 0.1 ms per archetype scan. Archetype transition < 0.01 ms per move.

11. **Test requirements?** SchemaHash stability, sim/render non-interference (render mutation never affects sim), ID determinism, archetype-fragmentation ceiling, derive-pass budget, lifecycle callback ordering.

12. **Extension points?** Plugins register component types (with `__schemaHash` and lifecycle), derive functions, and systems that query. The runtime is closed to new storage layouts (three is enough).

13. **Security/isolation?** Render-components cannot call sim APIs (enforced by TypeScript types and runtime proxy in dev mode). Sim-components cannot hold GPU resources (enforced by lint).

14. **Rejected alternatives?** (a) Single-component NPC — rejected for query narrowness and save granularity. (b) ECS with no sim/render split — rejected because render-components (Three.js objects) are not serializable. (c) Immutable components (a la Rust ECS) — rejected because JS lacks cheap persistent data structures; the sim/render split achieves the same invariant (render never reads mid-mutation) via the derive pass. (d) Reactive bindings (sim → render via observables) — rejected because the derive pass is simpler and batched per-frame, avoiding reactive cascade costs. (e) Foreign-key-style references (entity IDs as indexes into a global table) — rejected in favor of explicit `EntityId` 128-bit values, which survive save/load and branch.

15. **Dependencies?** Depends on `ga:determinism` (CBOR, hash), `ga:core`, `07_SCHEDULER` (phase boundaries), `12_WORLD_PARTITIONING` (spatial node for entity). Depended on by every gameplay plugin, the renderer, the save system, and the WebSocket API.

16. **What this enables?** The save system (doc 11) can serialize any entity's sim bag at any tick. The streaming system (doc 12) can demote an entity to S0 by freezing its sim-components. The renderer can render 500+ NPCs at 60 Hz because the derive pass is incremental (SimHash caching). The AI agent (doc 22) can inspect any entity via `getEntity(id)` and see the same sim-components the sim sees.

---

## 9. Test requirements (detailed)

### 9.1 SchemaHash stability

For each component type, register it 1000 times across 1000 engine restarts. Assert the `__schemaHash` is identical every time. A failure indicates the schema hash is being computed from non-deterministic inputs (e.g., field declaration order in a Map).

### 9.2 Sim/render non-interference

Spawn an entity with sim and render components. From a render system, attempt to call `host.setState` on a sim-component. Assert the call throws (dev mode) or is silently dropped (production). Assert the sim-component is unchanged.

### 9.3 ID determinism

Run the world generator twice with the same seed. Assert the entity IDs are identical. Branch the save (doc 11 §8); assert new entities in the branch have different `high` bits.

### 9.4 Archetype fragmentation ceiling

Run a 1000-tick sim that attaches/detaches components randomly. Assert the number of distinct archetypes stays below 50 (tunable). A higher number indicates component-set indiscipline.

### 9.5 Derive-pass budget

Spawn 500 NPCs in the visible set. Assert the derive pass (phase 7) completes in < 1 ms. Assert SimHash caching skips > 90% of NPCs on a frame where no NPC's sim-components changed.

### 9.6 Lifecycle callback ordering

Attach three components (A, B, C) to an entity in registration order. Destroy the entity. Assert `onDestroy` fires in order C, B, A. Attach A, B, C, then attach D. Assert `onAttach` for D fires after A, B, C's `onAttach`.

### 9.7 Tier transition conservation

Demote an S4 NPC to S1. Assert the entity is still queryable. Assert the named-NPC fields (NpcIdentity, NpcSocial) are unchanged. Assert only `simulationTier` and `locationId` changed. Promote back to S4. Assert no new favorable facts (no new gold, no new relationships, no new memories) were created by the promotion.

---

## 10. Rejected alternatives (summary)

- **Single-bag ECS (no sim/render split).** Fails the determinism contract (Three.js objects are not serializable).
- **Immutable components.** JS lacks cheap persistent data structures; the derive pass achieves the same invariant.
- **Reactive bindings.** Cascade cost; harder to reason about per-frame budgets.
- **Global entity table with int IDs.** Fails across save/load (an ID in a save must be unambiguous). 128-bit IDs with lineage encoding solve this.
- **World-space Transform only.** Fails for the hierarchical spatial model (doc 12) where an entity can be in a spatial pocket whose coordinate space is unrelated to its parent's. Transform must carry its `spatialNode` reference.
- **Reactive render-component re-derivation on every sim mutation.** Too expensive. The SimHash + per-frame batched derive is cheaper and amortizes cache misses.

---

## 11. What this document enables

- **The save system (doc 11)** can serialize any entity's sim bag at any tick, knowing render-components are not in the save.
- **The streaming system (doc 12)** can demote an entity by freezing its sim-components (set `simulationTier = S0`); the derive pass naturally skips S0 entities.
- **The event system (doc 10)** can target entities by ID across ticks and branches, because IDs are stable and persistent.
- **The renderer** can render 500+ NPCs at 60 Hz because the derive pass is incremental and cache-aware.
- **The NPC simulation record** (`49_CONTENT_ARCHITECTURE §4`) is the canonical example: five components, each queryable independently, each serializable, each hashable.

The entity runtime is the substrate every gameplay plugin reads and writes. With it specified, the event bus (doc 10), the save system (doc 11), and the streaming system (doc 12) can be built on top of a stable, serializable, hashable foundation.
