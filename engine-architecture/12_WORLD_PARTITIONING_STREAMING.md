# 12 — World Partitioning and Streaming

**Status:** Foundation architecture. The hierarchical spatial model, floating origin, large-coordinate precision, streaming, and the relevance/fidelity tiers.
**Date:** 2026-08-03
**Engine:** Grand Architect (browser-native plugin host, deterministic contract)
**Depends on:** `ga:determinism` (CBOR, SHA-256, fixed-point), `ga:core`, `07_SCHEDULER_FRAME_LOOP_TIME_DOMAINS` (strategic-tick tier transitions), `08_JOBS_WORKERS_CONCURRENCY` (WORLD/MESH workers for streaming), `09_ENTITY_RUNTIME_STATE_ARCHITECTURE` (entity's `spatialNode` field)
**Read with:** `49_CONTENT_ARCHITECTURE §4` (S0–S4 tiers and conservation), `07_PROCEDURAL_GENERATION_IMPLICATIONS §1.1` (the seed hierarchy), `36_COSMIC_GEOGRAPHY` (the cosmology the spatial hierarchy expresses), `48_HIGHER_IMMORTAL_WORLDS` (containing realities, not parallel ones)

---

## 0. What this document is

The world is not one coordinate space. It is a hierarchy of nested spaces — multiverse → cosmic domain → universe → plane → star field → stellar system → world → continent → region → locality → interior → spatial pocket — each with its own local origin, scale, and precision budget. This document specifies the `SpatialNode` interface, how nested spaces compose without one enormous coordinate space, the floating-origin technique that keeps the renderer's coordinates near zero, the large-coordinate precision strategy (Q32.32 fixed-point for sim, f32 for render with rebasing), the streaming policy (what loads, what unloads, by what priority), the S0–S4 relevance/fidelity tiers and their deterministic transitions, and how streaming interacts with the determinism contract (the sim never blocks on streaming; tier transitions are deterministic and conservation-checked).

The central tension: **the cosmology is vast (multiverse, containing realities, spatial pockets); the browser's coordinate precision is finite (f32 has ~7 decimal digits).** The resolution is the nested spatial hierarchy: each node has a local f32 coordinate space, and the renderer's "world origin" is *rebased* to the player's current node every time the player crosses a node boundary. The sim never sees world-scale coordinates; it sees only local coordinates plus a chain of node IDs.

---

## 1. The hierarchical spatial model

### 1.1 The twelve-level hierarchy

```
┌──────────────────────────────────────────────────────────────────┐
│                  HIERARCHICAL SPATIAL MODEL                      │
│                                                                  │
│  Level 0:  Multiverse                                            │
│     │  (per doc 48: the Higher Immortal World contains the       │
│     │   mortal cosmoi; not parallel realities — containing ones)│
│     ▼                                                            │
│  Level 1:  Cosmic Domain                                         │
│     │  (a containing reality: the Higher Immortal World, or the  │
│     │   mortal cosmos)                                           │
│     ▼                                                            │
│  Level 2:  Universe                                              │
│     │  (one mortal cosmos: the three-stratum lens of doc 36)     │
│     ▼                                                            │
│  Level 3:  Plane                                                 │
│     │  (a stratum: Precelestial / Acquired / Mortal)             │
│     ▼                                                            │
│  Level 4:  Star Field                                            │
│     │  (a region of the Mortal stratum's star system)            │
│     ▼                                                            │
│  Level 5:  Stellar System                                        │
│     │  (one solar system)                                        │
│     ▼                                                            │
│  Level 6:  World                                                 │
│     │  (one planet — the player's world)                         │
│     ▼                                                            │
│  Level 7:  Continent                                             │
│     │  (one of the five continents, doc 36 §2.5)                 │
│     ▼                                                            │
│  Level 8:  Region                                                │
│     │  (the Cangli Riverlands, doc 04)                           │
│     ▼                                                            │
│  Level 9:  Locality                                              │
│     │  (Wang Family Bend, the village)                           │
│     ▼                                                            │
│  Level 10: Interior                                              │
│     │  (a building's interior: the lineage hall)                 │
│     ▼                                                            │
│  Level 11: Spatial Pocket                                        │
│        (a grotto-heaven, a storage talisman's interior, a        │
│         Mahayana-authored law-space — doc 16, doc 19, doc 39)    │
└──────────────────────────────────────────────────────────────────┘
```

### 1.2 Why this hierarchy

The hierarchy is the lore's own nesting (doc 48 §1: "the Higher Immortal World contains the mortal cosmos the way the mortal cosmos contains a grotto-heaven"). Each level is a *containing* reality, not a parallel one — the engine's spatial model mirrors the cosmology's nesting directly.

The hierarchy is also the engine's precision budget. At each level, the local coordinate space is bounded (a continent is ~10,000 km; a region is ~500 km; a locality is ~5 km; an interior is ~100 m; a pocket is ~10 m to ~10 km depending on the pocket's author). The renderer never sees coordinates larger than the current level's bound, so f32 precision is sufficient within a level.

### 1.3 Why not one big coordinate space

A single coordinate space spanning the multiverse would need to represent distances from 1 m (player reaching for a bucket) to 10^30 m (the mortal cosmos's diameter). f32 has ~7 decimal digits of precision; at 10^30 m, the smallest representable step is 10^23 m — useless for gameplay. Even f64 (15 digits) is insufficient at cosmic scale, and f64 on the GPU is slow and inconsistent across browsers.

The nested hierarchy solves this: each level has its own local space, and the renderer rebases to the player's current level. The player never sees coordinates larger than ~10,000 km (a continent), and within a continent, f32 precision is ~1 mm — more than enough.

---

## 2. The SpatialNode interface

```typescript
/** A node in the spatial hierarchy. */
interface SpatialNode {
  /** The node's stable ID. Deterministic, derived from the world seed. */
  id: SpatialNodeId;
  /** The node's level (0-11). */
  level: SpatialLevel;
  /** The parent node, or null for the multiverse root. */
  parent: SpatialNodeId | null;
  /** Child nodes. Empty for leaf nodes (interiors, pockets). */
  children: SpatialNodeId[];
  /** The node's type tag. */
  kind: SpatialNodeKind;
  /** The node's local extent (bounding box in local coordinates). */
  localExtent: AABB;
  /** The transform from this node's local space to its parent's local space. */
  localToParent: Transform;
  /** The seed for this node's procedural generation. Derived from (parentSeed, childIndex). */
  seed: bigint;
  /** Whether this node is currently loaded (state in memory). */
  loaded: boolean;
  /** The node's current relevance tier (S0-S4) for the player. */
  tier: SimulationTier;
  /** The last tick this node was observed by the player. */
  lastObservedTick: bigint;
  /** For pocket nodes: the law or contract that governs the pocket. */
  pocketLaw?: string;  // definition ID
}

type SpatialLevel = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11;

type SpatialNodeKind =
  | 'multiverse' | 'cosmic_domain' | 'universe' | 'plane' | 'star_field'
  | 'stellar_system' | 'world' | 'continent' | 'region' | 'locality'
  | 'interior' | 'spatial_pocket';

interface SpatialNodeId {
  /** The level. */
  level: SpatialLevel;
  /** A 128-bit deterministic ID. */
  high: bigint;
  low: bigint;
}

interface AABB {
  min: [Fixed64, Fixed64, Fixed64];  // Q32.32 local coordinates
  max: [Fixed64, Fixed64, Fixed64];
}

interface Transform {
  /** Translation in the parent's local space (Q32.32). */
  translation: [Fixed64, Fixed64, Fixed64];
  /** Rotation as a quaternion (f64, since quaternions are unit-scale). */
  rotation: [number, number, number, number];
  /** Scale (f64). Pockets can have non-1 scale. */
  scale: [number, number, number];
}
```

### 2.1 The transform chain

To get an entity's position in the *renderer's* world space (which is the player's current node's local space, rebased), the engine composes transforms from the player's current node down to the entity's node:

```typescript
function entityToWorld(entity: Entity, playerNode: SpatialNode): Matrix4 {
  // Walk up from entity's node to the player's node (or to their LCA).
  let node = getSpatialNode(entity.spatialNode);
  let transform = Matrix4.identity();
  while (node.id !== playerNode.id && node.parent !== null) {
    transform = transform.multiply(node.localToParent);
    node = getSpatialNode(node.parent);
  }
  // Apply the entity's local transform within its node.
  return transform.multiply(entity.localTransform);
}
```

In practice, the engine precomputes the transform chain for visible nodes once per frame (during phase 9, render visibility). The chain is short (typically 2-4 levels: locality → region → continent → world, for a player on a continent).

---

## 3. How nested spaces work without one enormous coordinate space

### 3.1 The key insight

Each `SpatialNode` has its **own local coordinate system**. An entity at local `(100, 0, 50)` in Wang Family Bend is at `(100, 0, 50)` *in Wang Family Bend's local space*, not in some absolute world space. To find its position in the Cangli Riverlands' local space, the engine applies Wang Family Bend's `localToParent` transform.

The renderer never composes the full chain from the multiverse down. It composes only from the player's current "render root" (typically the locality or region level) down to the entity. Entities in other localities are not rendered (they are S0/S1 and not in the visible set).

### 3.2 The render root

The render root is the spatial node the renderer treats as "world origin." It is typically the player's current locality (level 9). When the player walks from Wang Family Bend to Li Family Creek (a neighboring locality), the render root changes; the renderer rebases (§4) all entity positions to the new root.

```
Player in Wang Family Bend:
  render root = Wang Family Bend (level 9)
  entities rendered in Wang Family Bend's local space
  (entities in Li Family Creek are S0/S1; not rendered)

Player walks to Li Family Creek:
  render root = Li Family Creek (level 9)
  entities rendered in Li Family Creek's local space
  (entities in Wang Family Bend drop to S0/S1; not rendered)
```

### 3.3 Cross-node references

An entity can reference another entity in a different node (e.g., a memory of an NPC the player met in a parent branch — doc 11 §8.3). The reference is by `EntityId` (which encodes lineage, doc 09 §2.2), not by position. The engine resolves the reference by looking up the entity's current node (which may be S0/S1/S2 — the entity exists, but is not actively simulated). This is how NPC memories work: an NPC in Wang Family Bend can remember an NPC in Li Family Creek without the latter being actively simulated.

---

## 4. Floating origin

### 4.1 The problem

Even within a single locality (~5 km), f32 precision is ~0.5 mm at the edges. That's enough for gameplay, but accumulation errors over long play sessions cause visible jitter (vertices "swim" as the camera moves). The fix is **floating origin**: keep the renderer's coordinate origin near the camera, not at the locality's center.

### 4.2 The technique

```typescript
interface FloatingOrigin {
  /** The render root (the spatial node the renderer treats as world). */
  renderRoot: SpatialNodeId;
  /** The offset within the render root's local space, in Q32.32. */
  offsetInRoot: [Fixed64, Fixed64, Fixed64];
  /** The tick this origin was last rebased. */
  rebasedAtTick: bigint;
}

function rebaseIfNeeded(camera: CameraState, origin: FloatingOrigin): FloatingOrigin {
  // If the camera has moved more than REBASE_THRESHOLD from the offset,
  // shift the offset to the camera's position and subtract from all render transforms.
  const dx = camera.position[0] - origin.offsetInRoot[0];
  const dy = camera.position[1] - origin.offsetInRoot[1];
  const dz = camera.position[2] - origin.offsetInRoot[2];
  const dist2 = dx*dx + dy*dy + dz*dz;
  if (dist2 > REBASE_THRESHOLD_SQUARED) {
    return {
      renderRoot: origin.renderRoot,
      offsetInRoot: camera.position,
      rebasedAtTick: scheduler.fixedTick,
    };
  }
  return origin;
}

// In the renderer:
//   renderPosition = entity.localPosition - origin.offsetInRoot
// This keeps renderPosition near zero, preserving f32 precision.
```

`REBASE_THRESHOLD` is typically 1 km (configurable). The rebasing is invisible to the player (the world doesn't "jump"); it's a uniform shift applied to all render transforms in one frame.

### 4.3 Why the sim doesn't need floating origin

The sim uses Q32.32 fixed-point (doc `07_PROCEDURAL_GENERATION_IMPLICATIONS §6.3`), which has 32 bits of integer precision (~4 billion km range) and 32 bits of fractional precision (~0.2 nm). The sim can represent an entire continent's coordinates without precision loss. Floating origin is purely a renderer concern.

---

## 5. Large-coordinate precision

### 5.1 The two-number system

| Layer | Coordinate type | Range | Precision | Why |
|---|---|---|---|---|
| Sim (canonical) | hierarchical integer address + locally quantized state (exact arithmetic only where determinism requires it) | planet/cosmos scale | exact where required | Determinism is a domain contract, not a BigInt-everywhere mandate (directive §10) |
| Nearby sim frame | f64 (JS number) | hundreds/thousands of meters | ~µm | Sim coordinates in a local frame; f64 is exact enough for gameplay |
| Render (derived) | f32 (GPU) | ±10 km from floating origin | ~1 mm at the 10 km edge | GPU is fast, f32 is universal; the ±10 km render-local strategy is NORMATIVE (directive §10) — beyond that, render must rebase |
| Worker transfer | f64 (JS number) | ±2^31 km | ~0.1 mm | Workers receive sim coordinates as f64 for transfer, convert to local f32 on arrival |

**Precision law (corrected per directive §10):** f32 does NOT give ~1 mm precision at continent scale. Near 10^7 m (a ~10,000 km continent), f32 spacing is on the order of **one meter**. Therefore: canonical addresses are hierarchical integers (PlanetId + Geodesic/CubeSphere CellId + local coordinate); the nearby simulation frame stays within hundreds/thousands of meters; rendering operates within ±10 km of a camera-near floating origin; celestial-scale rendering uses high/low split representation. The ±10 km render-local strategy is the enforced concept — never render at continent-scale coordinates in f32.

### 5.2 The sim-to-render conversion

```typescript
function simToRender(simPos: [Fixed64, Fixed64, Fixed64], origin: FloatingOrigin): [number, number, number] {
  // 1. Convert Q32.32 to f64 (lossless within ±2^53).
  const f64x = toDouble(simPos[0]) - toDouble(origin.offsetInRoot[0]);
  const f64y = toDouble(simPos[1]) - toDouble(origin.offsetInRoot[1]);
  const f64z = toDouble(simPos[2]) - toDouble(origin.offsetInRoot[2]);
  // 2. The renderer casts f64 to f32 when uploading to GPU.
  //    Precision loss is < 0.5 mm because f64 values are near zero (floating origin).
  return [f64x, f64y, f64z];
}
```

### 5.3 Why not f64 throughout the renderer

f64 on the GPU is slow (many GPUs run f64 at 1/32 the rate of f32) and inconsistent (some GPUs promote f64 to f32 silently). The floating-origin technique keeps render coordinates in the f32-precision range, so the renderer can use f32 universally. The sim's f64/fixed-point is the source of truth; the renderer's f32 is a derived, non-canonical view.

---

## 6. Streaming

### 6.1 What loads, what unloads

The streaming system decides, each strategic tick (1 Hz), which spatial nodes to load (promote to higher tiers) and which to unload (demote to lower tiers). The decision is based on:

1. **Player's current node and velocity** (where the player is and where they're heading).
2. **The node's distance from the player** (in the hierarchy, not in raw coordinates — a parent's sibling is closer in the hierarchy than a far descendant).
3. **The node's `lastObservedTick`** (recently-observed nodes stay loaded longer).
4. **Memory pressure** (if the engine is near its memory budget, demote aggressively).
5. **The node's `pinnedBy` bitmask** (some plugins pin nodes to keep them loaded — e.g., a quest plugin pins the quest's target node).

### 6.2 The streaming policy

```
For each spatial node N in the player's "reachable neighborhood":
  (defined as: N is the player's current node, an ancestor, a descendant,
   or a sibling within hierarchy distance 2)

  Compute a priority P(N):
    P(N) = basePriority(N.tier) - hierarchyDistance(N, player) * 100
                           + recencyBonus(N.lastObservedTick)
                           - memoryPressurePenalty(N.memoryCost)

  If P(N) > LOAD_THRESHOLD:
    Promote N to the next-higher tier (S0→S1→S2→S3→S4).
    Issue ASSET worker jobs to load N's assets (terrain, meshes, textures).
    Issue WORLD worker jobs to recompute N's terrain revisions if stale.

  If P(N) < UNLOAD_THRESHOLD:
    Demote N to the next-lower tier (S4→S3→S2→S1→S0).
    If N demotes to S0, release its assets (decrement refcounts).
    But: NEVER release a named entity's state. S0 still holds the entity's
    sim-components; it just doesn't simulate them.
```

### 6.3 The streaming interface

```typescript
interface StreamingPlanner {
  /** Called once per strategic tick (1 Hz) by the scheduler. */
  plan(ctx: SimContext): StreamingPlan;
}

interface StreamingPlan {
  /** Nodes to promote. */
  promote: Array<{ nodeId: SpatialNodeId; fromTier: SimulationTier; toTier: SimulationTier; reason: string }>;
  /** Nodes to demote. */
  demote: Array<{ nodeId: SpatialNodeId; fromTier: SimulationTier; toTier: SimulationTier; reason: string }>;
  /** Asset load requests. */
  loadAssets: Array<{ hash: string; priority: number; deadlineTick: bigint }>;
  /** Asset unload requests. */
  unloadAssets: Array<{ hash: string; reason: string }>;
}

interface StreamingBudget {
  /** Maximum bytes of assets loaded per strategic tick. */
  bytesPerTick: number;            // default 10 MB
  /** Maximum nodes promoted per strategic tick. */
  nodesPerTick: number;            // default 5
  /** Maximum total loaded memory. */
  memoryBudgetBytes: number;       // default 1 GB
}
```

### 6.4 Why streaming is per-strategic-tick, not per-fixed-tick

Streaming decisions are expensive (the planner walks the hierarchy, computes distances, checks memory). Running it every fixed tick (60 Hz) would consume ~5 ms per tick — 30% of the frame budget. Running it every strategic tick (1 Hz) costs the same total CPU but in one chunk, leaving the 60 fixed ticks free for sim work.

The trade-off: streaming decisions lag up to 1 second behind player movement. The engine mitigates this with *predictive loading*: when the player's velocity is high (running, flying), the planner pre-loads nodes in the player's direction before the player reaches them.

---

## 7. Relevance/fidelity tiers (S0–S4)

### 7.1 The five tiers

From `49_CONTENT_ARCHITECTURE §4`:

```
S4 (Detailed) — full AI, physics, animation, rendering, schedule
    ↓ player moves away
S3 (Interactive) — full state machine, reduced frequency, no rendering
    ↓ player leaves region
S2 (Regional) — aggregate state, scheduled updates, no individual AI
    ↓ region not visited for N ticks
S1 (Historical) — demographic aggregate only
    ↓ region never visited
S0 (Dormant) — frozen state, scheduled wake on player approach
```

### 7.2 Tier characteristics

| Tier | Tick rate | Rendered? | AI? | Physics? | State stored? | Example |
|---|---|---|---|---|---|---|
| S4 | 60 Hz | Yes (full) | Full | Full | All sim-components | NPCs in player's village |
| S3 | 15 Hz | No | State machine only | No | All sim-components | NPCs in adjacent village |
| S2 | 1 Hz (strategic) | No | Aggregate | No | All sim-components | NPCs in same region |
| S1 | 1/minute | No | Demographic | No | Summary only | NPCs in unvisited settlement |
| S0 | Frozen | No | None | None | All sim-components (frozen) | NPCs in unvisited region |

### 7.3 Tier transitions are deterministic

The tier of a node at tick N is a function of (player position history, node's `pinnedBy` bitmask, memory pressure). All three inputs are deterministic:

- **Player position history** is in the input log.
- **`pinnedBy`** is set by plugins via deterministic events.
- **Memory pressure** is *not* in the input log (it depends on the browser's memory limits, which vary). To preserve determinism, the streaming planner uses a *deterministic memory budget* (`StreamingBudget.memoryBudgetBytes`, set at engine init from a fixed value, not from `navigator.deviceMemory`). Real memory pressure can exceed this budget, triggering degradation (§7.5), but the tier transitions themselves are deterministic.

### 7.4 Conservation rules

From `49_CONTENT_ARCHITECTURE §4`:

- **Promotion cannot create favorable facts.** When a node promotes from S0 to S4, the engine restores the node's frozen state. It does *not* generate new favorable facts (no new gold, no new relationships, no new memories). The node's state at promotion = its state at the last demotion.
- **Demotion cannot erase named entities.** When a node demotes from S4 to S0, all named entities in the node are preserved with their full sim-components. Demotion freezes the state; it does not delete it. Only *unnamed* entities (e.g., background vegetation, ambient fish) can be discarded at demotion, and only if they can be deterministically regenerated on promotion (their existence is a function of the node's seed, not of saved state).

### 7.5 Degradation under real memory pressure

If the browser's actual memory usage exceeds the deterministic budget (e.g., the player has many tabs open), the engine degrades gracefully:

1. **First line:** demote nodes more aggressively (lower the `UNLOAD_THRESHOLD`). This is logged as a `StreamingDegradation` event.
2. **Second line:** reduce tier frequencies (S4 from 60 Hz to 30 Hz; S3 from 15 Hz to 5 Hz). This is logged and *does* affect determinism — the save records the reduced frequencies, and the replay reproduces them.
3. **Last line:** refuse to load new nodes. The player sees "the world is loading..." and the engine waits for memory to free up.

Degradation is deterministic *given the same memory pressure*, but memory pressure varies across browsers. The save's `spiralDrops` and `degradationEvents` fields record the degradation history so the replay reproduces it.

---

## 8. How streaming interacts with the determinism contract

### 8.1 The contract

The sim state at tick N is a function of (seed, N, inputLog[0..N]). Streaming must not appear in this function. Specifically:

- The sim never blocks on streaming. If a node's assets are not yet loaded when the sim needs to render it, the renderer skips the node (renders nothing or a placeholder). The sim continues.
- Tier transitions are deterministic (§7.3) and recorded in the input log (as `ga:streaming.TierChanged` events). The replay reproduces them.
- The sim's view of an entity's state is independent of the entity's tier. An S0 entity's sim-components are still queryable; they are just not *mutated* per tick. The query returns the frozen state.

### 8.2 The streaming-sim boundary

```
Streaming planner (strategic tick)
  → emits 'ga:streaming.TierChanged' events
  → sim's tier system applies the tier change to the entity's NpcProcedural.simulationTier
  → sim's scheduler reads the tier; entities at S0/S1/S2 are not iterated by S4 systems
  → renderer's visibility pass reads the tier; S0/S1/S2 entities are not in the visible set
  → asset worker loads/unloads assets in the background; results arrive asynchronously

The sim is the source of truth for tier; the streaming planner is the source of truth for
asset load/unload. The two communicate via events, never via direct state access.
```

### 8.3 The conservation check

When a node promotes from S0 to S4, the sim verifies the conservation rules:

```typescript
function verifyPromotion(node: SpatialNode, frozenState: NodeSnapshot, ctx: SimContext): void {
  // For each named entity in the node:
  for (const entity of frozenState.entities) {
    // 1. The entity must exist (was not deleted while frozen).
    if (!entityRegistry.isAlive(entity.id)) {
      throw new ConservationViolation(`Named entity ${entity.id} disappeared while frozen`);
    }
    // 2. The entity's named-NPC fields must be unchanged.
    const current = entityRegistry.get(entity.id);
    if (current.get('ga:npc-sim.NpcIdentity').__schemaHash !== entity.identitySchemaHash) {
      throw new ConservationViolation(`Schema drift on entity ${entity.id}`);
    }
    // 3. No new favorable facts: inventory, relationships, memories must match frozen state.
    //    (The frozen state is the source of truth; the live state should match.)
    //    Note: time-based fields (age, schedule) MAY advance, but only by the frozen duration.
  }
}
```

If the verification fails, the engine halts with a `ConservationViolation` error. This is a fatal bug (a plugin violated the conservation rules) and is reported to the player as "the world's laws were broken; the save is corrupt."

---

## 9. 16 questions answered

1. **What is this system?** The hierarchical spatial model (12 levels), floating origin, large-coordinate precision, streaming (load/unload by priority), and S0–S4 relevance/fidelity tiers.

2. **What problem does it solve?** The cosmology is vast (multiverse to spatial pocket); f32 precision is finite. The nested hierarchy + floating origin lets the engine represent the cosmology without precision loss, and streaming keeps memory bounded.

3. **Core abstractions?** `SpatialNode`, `SpatialNodeId`, `SpatialLevel`, `SpatialNodeKind`, `AABB`, `Transform`, `FloatingOrigin`, `StreamingPlanner`, `StreamingPlan`, `StreamingBudget`, `SimulationTier`.

4. **Data flow?** Player moves → planner runs (1 Hz) → emits TierChanged events → sim applies tier → asset worker loads/unloads → renderer reads tier for visibility → sim never blocks.

5. **Lifecycle?** Spatial nodes are generated at world init (from the seed hierarchy) and persist for the save's lifetime. They load (state in memory) and unload (state in cold storage) as the player moves. They never disappear (a node's ID is stable; its state is frozen, not deleted).

6. **Invariants?** (a) The sim never blocks on streaming. (b) Tier transitions are deterministic and logged. (c) Promotion cannot create favorable facts; demotion cannot erase named entities. (d) Floating origin keeps render coordinates within f32 precision. (e) Each node has its own local coordinate space; no global world coordinates.

7. **Inputs?** Player position (from sim), player velocity (from sim), `pinnedBy` bitmasks (from plugins), memory pressure (from browser, but used only for degradation, not for tier decisions).

8. **Outputs?** TierChanged events (to sim), asset load/unload requests (to ASSET worker), visibility set (to renderer), degradation events (to input log).

9. **Failure modes?** Conservation violation (halt + report), asset load failure (fallback to placeholder; log), memory exhaustion (degrade per §7.5), floating-origin rebasing glitch (rare; mitigated by 1 km threshold), cross-node reference to a deleted entity (impossible by construction — S0 entities are not deleted).

10. **Performance budget?** Streaming planner < 2 ms per strategic tick. Asset load < 50 MB/s sustained. Floating-origin rebase < 0.5 ms per frame (rare). Visibility pass < 1 ms per frame for 500 visible entities.

11. **Test requirements?** Conservation-rule enforcement, tier-transition determinism (across browsers), floating-origin precision (no jitter at 10 km from origin), streaming under memory pressure, cross-node entity references, pocket-node determinism (storage talisman's interior).

12. **Extension points?** Plugins can pin nodes (via `pinnedBy`) and register custom streaming planners (rare; the default planner handles standard cases). New spatial levels require a core-engine change (the 12 are closed). Pocket nodes can be created at runtime by Mahayana-level plugins (the Law Author, doc 17 §7.4).

13. **Security/isolation?** Pocket nodes (created by Mahayana-authored laws) are sandboxed: their laws cannot affect the parent node unless the parent explicitly allows it (via a LawReach contract, doc 40). Streaming does not load untrusted code; pocket-node laws are content-addressed and hash-verified.

14. **Rejected alternatives?** (a) Single global coordinate space — rejected for f32 precision loss at cosmic scale. (b) f64 throughout the renderer — rejected for GPU performance and cross-browser inconsistency. (c) Octree streaming (à la open-world games) — rejected because the cosmology's nesting is *hierarchical*, not spatial; an octree cannot represent a spatial pocket whose interior is unrelated to its parent's space. (d) Always-loaded named entities — rejected for memory cost (a 100-hour playthrough may visit thousands of NPCs; loading all is infeasible). (e) Non-deterministic streaming (load whatever fits) — rejected because tier transitions must be reproducible from the input log. (f) Time-based tier transitions (demote after N ticks unobserved) without player-position input — rejected because the player's position is the primary tier signal.

15. **Dependencies?** Depends on `ga:determinism` (fixed-point, CBOR), `ga:core`, `07_SCHEDULER` (strategic tick for planning), `08_JOBS_WORKERS` (WORLD/MESH/ASSET workers for streaming), `09_ENTITY_RUNTIME` (entity's `spatialNode` field). Depended on by every gameplay system that reads entities (via the tier filter), the renderer (via the visibility set), and the save system (which serializes loaded nodes' state).

16. **What this enables?** The full cosmology (multiverse to spatial pocket) represented without precision loss; seamless player travel between localities, regions, and continents; pocket dimensions (grotto-heavens, storage talismans, Mahayana-authored law-spaces) as first-class spatial nodes; bounded memory usage regardless of world size; and the conservation rules that make tier transitions safe (no favorable-facts creation, no named-entity erasure).

---

## 10. Test requirements (detailed)

### 10.1 Conservation-rule enforcement

Promote a node from S0 to S4. Verify every named entity's identity, relationships, and memories match the historical state. Inject a "favorable fact" (e.g., add gold to an entity's inventory while at S0). Assert the promotion throws `ConservationViolation`.

### 10.2 Tier-transition determinism

Run a 1000-tick sim with a fixed player movement pattern. Capture the sequence of `TierChanged` events. Repeat on a second browser. Assert the sequences are identical.

### 10.3 Floating-origin precision

Place the player 9 km from the render origin (within the ±10 km render-local envelope). Walk forward 1 cm. Assert the renderer's position changes with no jitter beyond f32 tolerance at that distance (~1 mm at the envelope edge, per §5.1). Walk back. Assert no accumulation error.

**Counter-test (directive §10):** place the player 10,000 km from the locality center WITHOUT a floating-origin rebase, in the old design, and walk forward 1 mm — the old design's claim of ~1 mm f32 precision at continent scale is mathematically false (f32 spacing near 10^7 m is ~1 m). The engine must therefore rebase the render origin within ±10 km (normative) and never render at continent-scale coordinates in f32.

### 10.4 Streaming under memory pressure

Fill the engine's memory to 90% of the deterministic budget. Continue playing. Assert the planner demotes nodes more aggressively and the sim does not crash. Assert the save's `degradationEvents` field records the degradation.

### 10.5 Cross-node entity references

An NPC in node A holds a memory referencing an NPC in node B. Demote node B to S0. Assert the NPC in node A can still query the NPC in node B (the reference resolves; the entity exists). Assert the NPC in node B's state reflects the historical evolution recorded at S0 (its household/cohort events), expanded consistently on promotion.

### 10.6 Pocket-node determinism

A Mahayana-authored law creates a spatial pocket (doc 39). The pocket's interior is a 1 km cube with its own laws. Enter the pocket. Place an entity inside. Exit. Re-enter. Assert the entity's state is unchanged (the pocket is a spatial node; it persists across exits).

### 10.7 Large-coordinate precision

Place an entity at coordinates (2,000,000,000 m, 0, 0) in a continent's local space (2 million km — close to the Q32.32 integer limit). Assert the entity's sim-position is exact. Assert the renderer's position (after floating-origin rebasing) is within 0.5 mm of the true position.

---

## 11. Failure cases and recovery (summary)

| Failure | Detection | Recovery |
|---|---|---|
| Conservation violation | Promotion-time check | Halt; mark save corrupt; offer parent fallback |
| Asset load failure | ASSET worker error | Retry (doc 08); fallback to placeholder mesh |
| Memory exhaustion | Browser OOM | Degrade per §7.5; if still failing, halt with SaveFailure |
| Floating-origin glitch | Render jitter detection | Force rebase next frame |
| Cross-node reference to deleted entity | Impossible by construction (S0 entities are not deleted) | N/A |
| Pocket-law violation | LawReach contract check | Halt the violating law; emit `LawViolation` event |
| Streaming planner timeout | Strategic-tick budget | Use previous tick's plan; log `StreamingPlanStale` |

---

## 12. Rejected alternatives (summary)

- **Single global coordinate space.** f32 precision loss at cosmic scale. Rejected.
- **f64 throughout the renderer.** GPU performance and cross-browser inconsistency. Rejected.
- **Octree streaming.** Cannot represent the cosmology's hierarchical nesting. Rejected.
- **Always-loaded named entities.** Memory-infeasible for long playthroughs. Rejected.
- **Non-deterministic streaming.** Breaks the input-log replay. Rejected.
- **Time-based-only tier transitions.** Ignores player position (the primary signal). Rejected.
- **Per-frame streaming.** Too expensive (5 ms/tick = 30% of frame budget). Rejected in favor of per-strategic-tick.
- **Global memory budget from `navigator.deviceMemory`.** Non-deterministic across browsers. Rejected in favor of a fixed deterministic budget (real pressure handled by degradation).

---

## 13. What this document enables

- **The full cosmology** (multiverse → spatial pocket) represented without precision loss, mirroring the lore's nesting (doc 48).
- **Seamless travel** between localities, regions, continents, worlds, and planes — each transition is a render-root rebasing, invisible to the player.
- **Pocket dimensions** (grotto-heavens, storage talismans, Mahayana-authored law-spaces) as first-class spatial nodes with their own local spaces and laws.
- **Bounded memory** regardless of world size: only the player's neighborhood is loaded; the rest is frozen at S0.
- **The conservation rules** (no favorable-facts creation on promotion; no named-entity erasure on demotion) that make tier transitions safe and reproducible.
- **The deterministic streaming contract**: the sim never blocks on streaming; tier transitions are in the input log; the replay reproduces them.

The spatial hierarchy is the engine's answer to "the cosmology is vast, the browser is finite." It is not a single space that scales; it is a nesting of spaces, each locally finite, each precisely representable, each streamable independently. The player experiences the cosmology as one continuous world; the engine represents it as a tree of bounded spaces.
