# 22 — Navigation & Movement

**Status:** Engineering specification. The `ga:navigation` plugin — navmesh generation via Recast Navigation, baking at load time, terrain-modification invalidation, tier-based nav (S4 full pathfinding → S0 none), character controller movement, kinematic vs dynamic NPC movement, cultivator flight (3D pathfinding above terrain), and protagonist movement.
**Date:** 2026-08-03

---

## 0. What this document is

This document specifies how anything in the world decides where to move and how it moves there. The split is: **navigation** (where to go — the pathfinding problem) and **movement** (how to get there — the character controller and physics problem). Navigation is its own plugin (`ga:navigation`) so it can be invalidated, re-baked, and tier-demoted independently of physics. Movement is a partnership between the navigation output, the NPC AI (doc 25), and the physics plugin (doc 20).

The central commitment: **navigation is tier-aware.** A merchant 100 km away does not pathfind to market; an S4 NPC beside the player does. A cultivator in flight uses 3D pathfinding above the terrain, not 2D navmesh with a fly flag. The protagonist's movement is direct input → character controller, never pathfinding. These four regimes share the navigation plugin's spatial indices but consume them differently per tier.

### Precedents cited (AGENTS.md Part 3: "Cite the precedent")

- **Recast Navigation (Mikko Mononen, 2009+)** — the open-source navmesh library used by Unity, Unreal, Godot, and most AAA engines. Adopted as the generator; no alternative comes close for quality + browser-WASM support (`recast-navigation` npm package, Rust→WASM).
- **Unreal Engine 5 NavMesh / Smart Objects** — the tiered navigation model (full navmesh, hierarchical, crowd). Adopted in spirit; the tier system (§4) is our equivalent.
- **Godot 4 `NavigationAgent3D` / `NavigationServer3D`** — the server pattern (queries against a baked navmesh). Adopted: the navigation plugin exposes a server API, navigation agents are components on entities.
- **StarCraft II's flow-field pathfinding** — for S2 aggregate movement (doc 25 §3): hundreds of units share a flow field rather than individual paths. Adopted for offscreen NPC aggregates.
- **Dragon Age: Origins waypath system** — for S2 waypath movement: precomputed route graphs between landmarks. Adopted.

---

## 1. The navigation mesh — what it is and how it is generated

### 1.1 The navmesh

A navmesh is a triangulated walkable surface. Each triangle is a region the navigator can stand on; the graph of triangles (with cost-weighted edges between adjacent triangles) is the search space for A* pathfinding.

```typescript
interface NavMesh {
  tiles: Map<TileId, NavMeshTile>;
  tileBounds: Map<TileId, AABB>;            // world-space bounds per tile
  revision: number;                          // bumped when any tile changes
  tileRevisions: Map<TileId, number>;        // per-tile revision
}

interface NavMeshTile {
  id: TileId;
  vertices: Float32Array;                    // x,y,z triples
  triangles: Uint32Array;                    // vertex indices, 3 per triangle
  triangleAreas: Uint8Array;                 // area type (walkable, road, water, etc.)
  adjacency: Uint32Array;                    // triangle → neighbour triangle, 3 per triangle
  polygonIds: Uint32Array;                   // per-triangle polygon ID (for off-mesh links)
  offMeshLinks: OffMeshLink[];               // jump points, doors, ladders, qi-flight launches
}

interface OffMeshLink {
  from: Vec3; to: Vec3;
  radius: number;                            // bidirectional radius
  cost: number;                              // traversal cost
  linkType: 'jump' | 'drop' | 'climb' | 'door' | 'flight_launch' | 'flight_land';
  requiredRealm?: Realm;                     // e.g., flight_launch requires Foundation Establishment+
}
```

### 1.2 Generation via Recast

The plugin uses Recast's standard pipeline:

```
1. VOXELIZE: rasterize input colliders into a heightfield
   - Input: terrain_collider meshes (doc 21) + static_prop colliders + navigation_obstacle shapes (doc 20 §3)
   - Voxel size: 0.25 m × 0.25 m × 0.5 m (cell size × cell height)
2. FILTER: mark walkable voxels by slope (≤ 45°) and step height (≤ 0.3 m mortal; 0.5 m cultivator)
3. REGION: partition walkable voxels into regions (monotone partitioning)
4. CONTOUR: trace region boundaries into polygons
5. POLYMESH: simplify contours into a polygon mesh
6. DETAILMESH: subdivide polygons for accurate surface height
7. OFFMESHLINKS: add authored jump/drop/climb/door/flight links
8. BVH: build a bounding-volume hierarchy over triangles for spatial queries
```

The output is the `NavMeshTile` for the input region. Recast is run per-tile (default tile size 32×32 m) so that re-baking after a localised terrain modification only re-runs on the affected tile, not the whole world.

### 1.3 Recast is run in a Web Worker

The `recast-navigation` WASM module runs in a worker. The plugin submits a `BakeTileRequest`; the worker returns a `NavMeshTile`. Multiple workers (one per CPU core, capped at 4) bake in parallel. A bake of a 32×32 m tile at 0.25 m voxel size takes ~50–150 ms on a 2024 laptop; with 4 workers, 4 tiles bake concurrently.

### 1.4 The bake is deterministic

Recast's output is a pure function of its inputs (collider meshes + parameters). Same inputs → same navmesh, bit-for-bit. The navmesh is part of the canonical state? **No** — the navmesh is derived from the colliders, which are derived from the terrain, which is canonical. The navmesh is **regenerated** on load (§3.3), not stored. This avoids storing a derived artifact that would have to be hash-verified separately (Ponytail §2).

---

## 2. Baking at load time

### 2.1 The bake pipeline

```
Engine startup
  → Load generators (doc 23) produce terrain chunks near player
  → ga:terrain commits collider meshes for those chunks
  → ga:navigation listens for terrain.chunkVisibleRevisionChanged events
  → For each new/changed chunk, identify which navmesh tiles overlap
  → Submit BakeTileRequest for each affected tile to the worker pool
  → On result, swap into NavMesh.tiles and bump tileRevisions[tileId]
  → Emit navmesh.tileReady event (consumed by NPC navigation agents)
```

### 2.2 Initial bake vs incremental bake

On a fresh load, the player's surroundings (a 256 m radius circle) need to be baked before any NPC can navigate. The plugin prioritises tiles by distance to player; the closest 16 tiles (the immediate surroundings) bake first. NPCs beyond the baked radius use S2 waypath navigation (§4.3) until their local tiles are ready.

### 2.3 The bake-failure case

**Failure case (bake):** A tile's bake takes > 1 second (very complex geometry, e.g., a collapsed building). The worker is marked as blocked; the tile is queued for retry on the next tick. NPCs that would have used that tile fall back to S2 waypath navigation around the unbaked tile. Rejected alternative: block the simulation until the bake completes — would freeze the game for 1+ seconds, breaking the 60 Hz budget.

---

## 3. Invalidation by terrain modification

### 3.1 The invalidation event

When `ga:terrain` commits a new collider mesh (doc 21 §3.1), it emits `terrain.chunkVisibleRevisionChanged`. The navigation plugin receives this and:

```typescript
function onTerrainChunkChanged(chunkId: ChunkId, revision: number): void {
  const chunkBounds = chunkWorldBounds(chunkId);
  const affectedTiles = queryTilesOverlapping(chunkBounds);
  for (const tileId of affectedTiles) {
    if (!this.tiles.has(tileId)) continue;       // not yet baked; will bake fresh later
    this.invalidateTile(tileId);
  }
}

function invalidateTile(tileId: TileId): void {
  this.staleTiles.add(tileId);
  this.tileRevisions.set(tileId, this.tileRevisions.get(tileId)! + 1);
  // Cancel any in-flight bake for this tile
  this.workerPool.cancel(tileId);
  // Re-bake with high priority
  this.submitBake(tileId, priority: 'high');
}
```

### 3.2 The invalidation-while-navigating failure case

**Failure case (invalidation):** An NPC is mid-path across a tile that gets invalidated (the cultivator just collapsed a bridge). The NPC's path now references triangles that no longer exist. The fix:

1. Every path references the navmesh revision it was computed against.
2. When a tile is invalidated, all paths crossing that tile are marked stale.
3. On the NPC's next navigation update, the stale path is detected and a re-path is forced.
4. The re-path uses the *new* tile (if available) or falls back to a path *around* the invalidated tile.

Rejected alternative: paths hold direct pointers to triangles and crash on invalidation. The indirection (path → revision → triangle lookup) is the price of safe invalidation.

### 3.3 The re-bake race

A tile is invalidated and re-baking. The player crosses into it. The NPC following the player needs the new tile. The plugin exposes:

```typescript
function isTileNavigable(tileId: TileId): boolean {
  const tile = this.tiles.get(tileId);
  return tile !== undefined && !this.staleTiles.has(tileId);
}
```

NPCs that need to enter a non-navigable tile are routed around it (via the surrounding tiles' adjacency) until the re-bake completes.

---

## 4. Navigation across simulation tiers

### 4.1 The tier → nav mode map

| Tier | Nav mode | Description |
|---|---|---|
| **S4** | Full A* on navmesh | Detailed pathfinding, replanned every 30 ticks (0.5 s) or on event |
| **S3** | Full A*, reduced frequency | Same algorithm, replanned every 120 ticks (2 s) |
| **S2** | Waypath | Follow a precomputed route between landmarks; no per-step pathfinding |
| **S1** | Aggregate | The settlement's population is a number; no individual movement |
| **S0** | None | Frozen; the entity's position is fixed until promoted |

### 4.2 S4 full pathfinding

```typescript
interface PathRequest {
  start: Vec3;
  goal: Vec3;
  agentProfile: AgentProfile;     // mortal | cultivator | beast | flying_cultivator
  areaCosts: Record<AreaType, number>;  // road: 1.0, grass: 1.5, water: 5.0 (mortal), 0.0 (cultivator-flying)
  maxPathLength: number;          // reject if path exceeds
  reuseIfValid: boolean;
}

interface PathResult {
  waypoints: Vec3[];              // corridor of triangles, simplified to corners
  length: number;
  navmeshRevision: number;        // the revision this path was computed against
  status: 'success' | 'partial' | 'failed';
}
```

A* runs in the worker; the result is cached per `(start_tile, goal_tile, agentProfile)` for 60 ticks. Most NPCs share paths (the merchant and his apprentice go to the same market).

### 4.3 S2 waypath

A waypath is a precomputed route between two landmarks. The plugin maintains a waypath graph:

```typescript
interface WaypathGraph {
  landmarks: Map<LandmarkId, Vec3>;             // wells, gates, bridges, crossroads
  routes: Map<RouteId, { from: LandmarkId; to: LandmarkId; waypoints: Vec3[]; travelTimeTicks: number }>;
  adjacency: Map<LandmarkId, RouteId[]>;        // Dijkstra on this for inter-landmark paths
}
```

An S2 NPC that needs to travel from village A to village B follows the waypath: walk to A's nearest landmark, follow the route to B's nearest landmark, walk to destination. The route is precomputed at generation time (doc 23) and stored as canonical state. No per-step pathfinding — the NPC moves along the route at a constant speed.

The waypath is **not** terrain-aware. If a flood destroys the bridge on the route, the waypath is still followed until an S4 observer notices and the route is updated (an S2 event that promotes the route to "needs repair"). This is the conserved-invariant trade-off from doc 25: S2 cannot perceive terrain modifications directly; an S4 event must propagate the change down.

### 4.4 S1 / S0 — no movement

S1 entities (a distant village's population) have no per-individual movement. Their movement is aggregated: "the village's population travels to the market on day 5; the market's population swells by 200." S0 entities are frozen; their position is fixed until promoted to S1+.

### 4.5 The tier-transition failure case

**Failure case (tier transition):** An S2 NPC following a waypath is promoted to S4 (the player approached). The waypath's current position becomes the S4 path's `start`. The S4 path is computed to the waypath's `goal`. The NPC's perception updates from "I am on a route" to "I am pathfinding in a navmesh." The transition is instantaneous (one tick). The NPC's speed may change (S4 movement is more careful around obstacles), but the goal does not. Per doc 25 §5: promotion cannot create favorable facts — the NPC does not get a faster route or a closer goal because it was promoted.

Rejected alternative: smooth the transition with a fade. Rejected because the simulation is tick-based; partial states break the determinism contract. The transition is atomic, even if visually abrupt (the renderer can interpolate position for one frame, but the simulation sees an instantaneous change).

---

## 5. Character controller movement

### 5.1 The movement pipeline (recap from doc 20 §8)

```
Navigation produces desired velocity (Vec3, m/s)
   │
   ▼
Steering: velocity × dt → desired displacement (Vec3)
   │
   ▼
CCT.move(displacement, dt)  (doc 20 §8.2)
   │
   ▼
setTransform(handle, transform + finalDisplacement)
   │
   ▼
Animation system reads velocity, plays walk/run
```

### 5.2 The navigation agent component

```typescript
interface NavigationAgent {
  bodyHandle: PhysicsBodyHandle;
  currentPath?: PathResult;
  currentWaypath?: RouteId;
  currentWaypathProgress: number;            // 0..1 along the route
  desiredVelocity: Vec3;
  maxSpeed: number;
  arrivalDistance: number;                   // 0.5 m default
  replanIntervalTicks: number;               // 30 (S4), 120 (S3), 0 (S2/S1/S0 — not used)
  lastReplanTick: number;
  tier: SimulationTier;                      // S0..S4
  stuck: boolean;                            // anti-stuck detection
  stuckTimeTicks: number;
}
```

### 5.3 Anti-stuck

If an NPC's `finalDisplacement` is below 0.01 m for 30 consecutive ticks while `desiredVelocity` is non-zero, the NPC is `stuck`. The response:

1. Replan the path (the obstacle may be new).
2. If still stuck after replan, try a small lateral nudge (0.2 m to the right, then left).
3. If still stuck, mark the NPC as `blocked` and emit a `NavigationBlocked` event — the AI system (doc 25) may decide the NPC should give up, wait, or teleport (the last only if the NPC is an S1+ aggregate, never S4).

### 5.4 The movement failure case

**Failure case (movement):** Two NPCs try to occupy the same navmesh triangle's center; both steer toward it; both slow down; both stop; both are now stuck. This is local crowding. The fix: the navigation plugin implements a simple **velocity obstacle** (RVO) layer for S4 NPCs within 4 m of each other. Each NPC's `desiredVelocity` is adjusted by a small repulsion vector from nearby NPCs. The RVO layer is not a full crowd simulator (too expensive); it is the lightest-touch solution that prevents deadlocks. Rejected alternative: a full ORCA solver — 5× the cost, marginal benefit at the NPC densities the engine targets (max ~30 S4 NPCs near the player).

---

## 6. Kinematic vs dynamic NPC movement

### 6.1 The default is kinematic

NPCs are kinematic bodies (doc 20 §8.1). They move via `setTransform` after the CCT computes a final displacement. They are not pushed by forces, do not fall (the CCT handles ground-following), and do not transfer momentum to other bodies (except via the CCT's `mass`-based push on dynamic props).

### 6.2 When NPCs go dynamic

Two cases:

1. **Ragdoll on death.** An NPC dies (combat, disease, fall). Their body switches from kinematic to dynamic, ragdoll physics take over, the body falls naturally. After 30 seconds (or on save), the ragdoll is frozen and the body is removed from the simulation (the corpse becomes a static prop).
2. **Knocked back by a cultivator strike.** A mortal NPC hit by a cultivator strike is briefly dynamic: an impulse is applied, the NPC flies, lands, and after 2 seconds reverts to kinematic (if alive) or ragdoll (if dead). This is the Sekiro stagger pattern: brief dynamic phase, then back to kinematic.

```typescript
function setMotionType(handle: PhysicsBodyHandle, type: 'kinematic' | 'dynamic'): void;
```

### 6.3 The kinematic-dynamic failure case

**Failure case (kinematic-dynamic):** An NPC is mid-stride (kinematic, moving at 1.5 m/s) when struck and switched to dynamic. The dynamic body's velocity starts at zero — the NPC appears to stop and then be knocked back, which looks wrong. The fix: when switching kinematic → dynamic, the body's `linearVelocity` is initialised from the NPC's last `desiredVelocity`. The struck NPC continues forward momentum and then takes the strike impulse on top. This is what real physics does, and what cultivator combat (doc 13 §0, Sekiro precedent) expects.

---

## 7. Cultivator flight (3D pathfinding above terrain)

### 7.1 The problem

A Foundation Establishment cultivator can fly (doc 32 §1.2: "canFly: true"). Flight is not "walking with gravity off" — flight is 3D movement above and around terrain, with its own constraints (qi cost, no-fly zones near spirit veins, terrain obstacles above the cultivator). 2D navmesh with a fly flag is wrong: it cannot express "fly over the mountain, then descend into the valley on the other side."

### 7.2 The flight navmesh

The navigation plugin maintains a **separate navmesh for flight**, generated alongside the walking navmesh:

```typescript
interface FlightNavMesh {
  // A 3D voxel grid (32 m × 32 m × 8 m tiles) marking navigable air volume
  tiles: Map<TileId, FlightNavTile>;
  // Tiles cover the air column from 2 m above terrain to 200 m above terrain
}

interface FlightNavTile {
  id: TileId;
  voxelGrid: Uint8Array;        // 0 = blocked (inside terrain, inside building, no-fly zone), 1 = free
  blockSize: number;            // 2 m default; cultivators don't need finer
  terrainHeightField: Float32Array;  // for ground-avoidance during descent
  noFlyZones: AABB[];           // spirit-vein proximity, sect treasuries, courts of heaven
}
```

### 7.3 3D pathfinding

The flight navmesh is searched with A* on the 3D voxel graph. The cost function:

```
cost(step) = distance(step) × terrainProximityPenalty(step) × qiCostPenalty(step)
```

Where:
- `terrainProximityPenalty` is high within 5 m of terrain (encourages altitude), low at 20+ m.
- `qiCostPenalty` is proportional to altitude (climbing costs qi per doc 32 §1.2: Foundation Establishment sustains 30 qwu/min; flight at 25 m/s costs ~10 qwu/min, so a 100 km flight costs ~30 qwu — a meaningful chunk of the 600–1500 qwu reservoir).

### 7.4 The flight movement model

A flying cultivator is **not** using the walking CCT. They use a `FlightController`:

```typescript
interface FlightController {
  bodyHandle: PhysicsBodyHandle;
  maxSpeed: number;             // 25 m/s Foundation, 50 Core Formation, ...
  maxAcceleration: number;
  qiDrainPerMeter: number;
  currentQiReservoir: number;
  grounded: boolean;            // true when within 0.5 m of terrain and descending
}

function flightMove(fc: FlightController, desiredVelocity: Vec3, dt: number): void {
  // Accelerate toward desiredVelocity, capped by maxAcceleration
  // Apply gravity scale of 0 (cultivator resists gravity)
  // Set linearVelocity on the dynamic body
  // Drain qi: drain = distance × qiDrainPerMeter
  // If qi depleted: revert to walking CCT (gravity scale → 1, grounded check resumes)
}
```

Flying cultivators are **dynamic** bodies, not kinematic. This is the opposite of walking NPCs (§6.1) because flight needs force-based control (acceleration, momentum, gravity when qi runs out). The dynamic body's velocity is set directly each tick — this is "pseudo-kinematic" (the solver doesn't apply forces beyond gravity, which is zeroed), but the body type is dynamic so it can interact with projectiles and other dynamic bodies correctly.

### 7.5 The flight failure case

**Failure case (flight):** A flying cultivator runs out of qi mid-flight. Their gravity scale snaps from 0 to 1, and they fall. If they are over a deep canyon, they may die on impact (survivability check per doc 32 §1.2). The fix is the design itself: flight is a commitment (doc 13 §3), not a free action. Cultivators monitor their qi reservoir; running out mid-flight is a player mistake with consequences. The engine does not prevent this — it enforces it.

Rejected alternative: auto-land when qi is low. Rejected because it removes the consequence and breaks the genre's flight-as-commitment pattern.

### 7.6 Higher-realm flight

Above Foundation Establishment, flight becomes faster, longer, and eventually effortless (Core Formation is qi-self-sustaining, doc 32 §1.2). The model is the same; only the parameters change. At Spirit Severance, flight transitions to "domain-step" — the cultivator teleports within their domain. The navigation plugin handles domain-step as a special off-mesh link with zero cost and zero travel time.

---

## 8. Protagonist movement

### 8.1 No pathfinding for the protagonist

The protagonist is **never pathfinding**. Player input → desired velocity → CCT.move → setTransform. The player is in direct control; the engine does not interpret their intent ("I think you meant to go around the wall"). This is the Sekiro / Monster Hunter / Souls precedent (doc 13 §0): direct control, commitment, no automation.

### 8.2 The input → movement pipeline

```
1. ga:input collects keyboard/mouse/gamepad state, stamps with tick (doc 17 §6.1)
2. ga:player-input translates input → desired velocity:
   - WASD / left stick → desired horizontal velocity
   - Shift / A button → sprint multiplier
   - Space / B button → jump (vertical impulse, with cultivator "qi-jump" multiplier)
   - Ctrl / X button → crouch
   - Q / E → rotate camera (does not affect movement direction; movement is camera-relative)
3. ga:player-input calls ga:physics.cctMove(handle, displacement, dt)
4. ga:physics returns finalDisplacement
5. ga:player-input calls ga:physics.setTransform(handle, transform + finalDisplacement)
6. ga:animation reads velocity, plays walk/run/jump/crouch animation
```

### 8.3 The cultivator protagonist's movement envelope

The protagonist's `RealmProfile` (doc 20 §5) controls their max velocity, gravity scale, and jump height. At Mortal, 8 m/s sprint, 0.4 m jump, gravity scale 1.0. At Qi Condensation, 12 m/s sprint, 2–4 m jump (qi-reinforced legs), gravity scale 1.0. At Foundation Establishment, 20 m/s sprint, 8–15 m jump, gravity scale 0.95 (slight lightness), flight unlocked.

The transition is **gradual**: a cultivator at the peak of Qi Condensation sprints at 12 m/s; the moment they break through to Foundation Establishment, the cap rises to 15 m/s (the lower bound of the new envelope). They do not instantly gain 20 m/s — they grow into it as their Foundation Establishment matures. This is the doc 32 §1.2 envelope's intent.

### 8.4 The protagonist-failure case

**Failure case (protagonist):** The player presses forward into a wall. The CCT returns `finalDisplacement = (0, 0, 0)`. The animation system plays "idle" instead of "walk" (velocity is zero). The player sees their character not moving. The fix is the design: the player is in direct control; the engine does not auto-route around the wall. The player must turn and walk around it themselves. This is the genre's commitment model (doc 13 §0).

Rejected alternative: auto-pathfind around obstacles when the player holds forward into a wall. Rejected because (a) it removes player agency, (b) it conflicts with the commitment model, (c) it would require the protagonist to have a NavigationAgent, which the spec explicitly forbids.

### 8.5 Click-to-move is not supported

The engine does not support click-to-move. The protagonist is WASD / left-stick only. This is a deliberate choice: click-to-move implies pathfinding, which implies the engine interpreting intent, which violates the direct-control commitment. The doctrine (AGENTS.md Part 3: "Confront the central tension directly") — the tension is "modern players expect click-to-move; the genre demands direct control." The genre wins, because direct control is what makes the cultivator combat readable (doc 13 §0).

---

## 9. Crowd movement for events

### 9.1 The market-day crowd

A market day brings 200+ NPCs to the market town. Each NPC cannot have an individual S4 path (too expensive). The plugin uses **flow fields**:

```typescript
interface FlowField {
  tileId: TileId;
  directions: Uint8Array;       // per-cell direction, packed as (dx, dz) in 4 bits each
  target: Vec3;                  // the goal (the market square)
}
```

A flow field is computed once per goal per tile (Dijkstra from the goal, store the gradient). Each NPC reads the flow field at their position and steers along it. 200 NPCs share one flow field; cost is O(1) per NPC per tick.

### 9.2 The crowd failure case

**Failure case (crowd):** A cultivator walks through the crowd. The crowd does not react; they keep flowing. The cultivator's CCT pushes them aside (kinematic mass). The fix: this is correct behaviour. Mortals in a market do not perceive a Foundation Establishment cultivator as anything other than "a person walking." The cultivator does not exist as a "Cultivator" in their perception until they demonstrate. The crowd flows around the cultivator's body via the RVO layer (§5.4); the cultivator is unaffected. This is the genre's "the powerful move among the powerless unnoticed" trope, emergent from the physics.

---

## 10. Failure cases (consolidated)

1. **Bake takes too long** — non-blocking; NPCs fall back to S2 waypath (§2.3).
2. **Path across invalidated tile** — paths carry revision; re-path on stale (§3.2).
3. **Tier promotion creates favorable fact** — forbidden; promotion uses same goal as before (§4.5).
4. **NPC stuck in crowd** — RVO layer prevents deadlock (§5.4).
5. **Kinematic→dynamic switch loses momentum** — initialise `linearVelocity` from `desiredVelocity` (§6.3).
6. **Cultivator runs out of qi mid-flight** — fall; consequences enforced (§7.5).
7. **Protagonist presses into wall** — no auto-route; player must turn (§8.4).
8. **Click-to-move requested** — not supported; design choice (§8.5).
9. **Navmesh worker crashes** — tile is marked failed; NPCs route around; re-bake attempted on next tick.
10. **Off-mesh link traversed by wrong realm** — `requiredRealm` gate; traversal refused.

---

## 11. Rejected alternatives

### 11.1 Grid-based pathfinding

A uniform grid with A* over grid cells. Rejected because (a) memory cost — a 1 km² area at 0.25 m resolution is 16M cells; (b) path quality — grid paths have visible zig-zag; (c) no industry precedent for serious 3D games. Navmesh is the standard for good reasons (Ponytail §13: prefer established libraries).

### 11.2 Single navmesh for all entity types

One navmesh shared by mortals, beasts, cultivators, and flying cultivators. Rejected because their movement capabilities differ radically (a Core Formation cultivator can grip smooth surfaces; a beast can jump 3 m; a flying cultivator ignores terrain entirely). Separate navmeshes per `AgentProfile` is the standard solution (Unreal, Godot both do this).

### 11.3 Pathfinding on the render mesh

Use the terrain's render mesh directly as the navmesh. Rejected because (a) render mesh is too dense (millions of triangles); (b) render mesh is not walkability-aware (vertical cliffs are triangles, not walls); (c) render mesh changes with LOD; navmesh would have to be re-baked on every LOD transition. Navmesh is a derived, lower-detail, walkability-aware artifact. That is what Recast produces.

### 11.4 Navigation as part of the physics plugin

Fold navmesh into `ga:physics`. Rejected because (a) navmesh has its own invalidation, baking, and tiering logic; (b) physics is about forces and collisions, navigation is about paths and routes; (c) the doctrine (Ponytail §4: keep components modular). Two plugins, one interface.

### 11.5 Protagonist auto-follow roads

When the protagonist walks on a road, snap them to the road centerline. Rejected because (a) removes player agency; (b) breaks the direct-control commitment (§8.4); (c) the genre's roads are not highways — they are dirt paths. The player walks where they walk.

---

## 12. What this document enables

- The navigation mesh is generated by Recast Navigation in Web Workers, baked per-tile at load time and on terrain modification.
- Invalidation is event-driven: terrain commits propagate to navigation, which re-bakes affected tiles; paths carry revision tags and re-path on stale.
- Navigation is tier-aware: S4 full A*, S3 reduced frequency, S2 waypath, S1 aggregate, S0 none.
- Character controller movement is the partnership between navigation (desired velocity), the CCT (final displacement), and physics (setTransform).
- NPCs are kinematic by default; dynamic only for ragdoll and knockback.
- Cultivator flight uses a separate 3D flight navmesh and a `FlightController`; flight is a commitment with qi cost.
- The protagonist is never pathfinding; player input → CCT → setTransform directly.
- Click-to-move is rejected; direct control is the genre's commitment model.
- Rejected alternatives (grid, single navmesh, render mesh, nav-in-physics, road-snap) are documented.

The next step is to integrate `recast-navigation` WASM, bake the first 16 tiles around Wang Family Bend, and verify that a mortal NPC can walk from the well to the lineage hall without stuck states. That is the gate; everything else is in service of the gate passing.
