# 21 — Voxel Terrain & Destruction

**Status:** Engineering specification. The `ga:terrain` plugin — authoritative density/material field, meshing pipeline, revision-checked atomic replacement, plugin responsibilities, shared renderer/physics consumption, border rebuilds, and save/load of deformed terrain.
**Date:** 2026-08-03

---

## 0. What this document is

Terrain in this engine is a **voxel field** — a 3D grid of density + material values — meshed into a render mesh and a collider mesh on demand. This is the Minecraft model extended to continuous density (transvoxel/dual-contouring) and multi-material blending, chosen because the engine must support cultivation-scale destruction: a Core Formation cultivator's strike (1–5 MJ, per doc 32 §1.2) splits a hillside; a Spirit Severance domain reshapes a region. Heightmap terrain cannot express this; a voxel field can.

The central architectural commitment: **the renderer and the physics solver consume the SAME terrain revision.** There is no "render terrain" + "physics terrain" maintained separately. There is one authoritative field, meshed once per revision, with the render mesh and collider mesh produced from the same density data, stamped with the same revision number, and swapped atomically. A misalignment between what you see and what you walk on is a contract violation; the architecture prevents it by construction.

### Precedents cited (AGENTS.md Part 3: "Cite the precedent")

- **Minecraft chunk system** — 16×16×384 column chunks, meshed independently, dirty-flagged on modification. Adopted as the spatial decomposition.
- **VoxelFarm / Atomontage** — continuous-density voxel engines with material blending. Studied for the meshing algorithms; we use the simpler transvoxel variant (below) to keep the WASM budget reasonable.
- **Dual Contouring (Tao Ju et al., 2002)** — the academic reference for crisp-feature meshing. Used for rock formations with sharp edges; transvoxel is used for organic terrain.
- **Unreal Engine 5 Nanite** — the LOD-stitching model (per-pixel LOD with crack-free seams). Adopted in spirit: terrain LOD stitches at chunk borders via a deterministic skirt/apron approach (§6.5).
- **Godot 4 `VoxelTool`** — the editing API shape (`set_voxel`, `do_sphere`). Adopted with extensions for material blending and revision tracking.

---

## 1. The authoritative terrain pipeline

### 1.1 The pipeline

```
┌────────────────────────────────────────────────────────────────────┐
│  1. AUTHORITATIVE FIELD (canonical)                                │
│  DensityField[chunk]  +  MaterialField[chunk]  +  RevisionMap      │
│  Modified by: generator (init), destructible events, cultivation   │
└──────────────────────────┬─────────────────────────────────────────┘
                           │
                           ▼  dirty propagation
┌────────────────────────────────────────────────────────────────────┐
│  2. MESHING REQUEST (per dirty chunk + border chunks)              │
│  Input: density subvolume + material subvolume + LOD level         │
│  Output: render mesh + collider mesh + navmesh-relevant geometry   │
└──────────────────────────┬─────────────────────────────────────────┘
                           │
                           ▼  worker pool
┌────────────────────────────────────────────────────────────────────┐
│  3. REVISION-CHECKED ATOMIC REPLACEMENT                            │
│  For each chunk: if request.revision === field.revision[chunk]:    │
│    swap render mesh + collider mesh + bump visibleRevision         │
│  Else: drop the meshed result; a newer request is in flight        │
└──────────────────────────┬─────────────────────────────────────────┘
                           │
              ┌────────────┴────────────┐
              ▼                         ▼
   ┌────────────────────┐    ┌──────────────────────┐
   │ ga:renderer        │    │ ga:physics           │
   │ reads render mesh  │    │ reads collider mesh  │
   │ by visibleRevision │    │ by visibleRevision   │
   └────────────────────┘    └──────────────────────┘
```

### 1.2 The field types

```typescript
interface TerrainField {
  // Per-chunk storage. Chunks are 16×16×16 voxels by default.
  chunks: Map<ChunkId, ChunkData>;
  revisions: Map<ChunkId, number>;            // monotonic per-chunk revision counter
  visibleRevisions: Map<ChunkId, number>;     // the revision currently presented to renderer + physics
  dirtyQueue: ChunkId[];                      // chunks awaiting re-meshing
  dirtyBorderQueue: ChunkId[];                // border chunks of modified chunks
}

interface ChunkData {
  id: ChunkId;                                // (x, y, z) chunk coordinates
  density: Float32Array;                      // 16×16×16 = 4096 values, range [-1, 1], negative = solid
  material: Uint8Array;                       // 16×16×16 = 4096 indices into MaterialTable
  materialBlend: Uint8Array;                  // optional: 4096 × maxMaterials blend weights
  initialized: boolean;                       // generator has filled this chunk
  destroyed: boolean;                         // chunk unloaded (memory pressure)
  revision: number;                           // == TerrainField.revisions[id]
}
```

Density convention: negative = inside the terrain (solid), positive = outside (air), zero = the surface. This is the standard implicit-surface convention; it makes the meshing algorithm's sign test unambiguous.

### 1.3 The chunk ID

```typescript
type ChunkId = string;  // encoded as `${x}_${y}_${z}`, e.g. "12_-3_7"
```

A string ID is hashable, CBOR-serializable, and human-readable in the scene inspector. A `number` would be faster but loses debuggability (Ponytail §2: simplest implementation that fully meets the requirement; debuggability is a requirement).

---

## 2. The terrain plugin's responsibilities

The `ga:terrain` plugin owns eleven distinct jobs. Each is named explicitly because the doctrine (AGENTS.md Part 3: "Build the engine, not just the brake") demands that every forbidding rule be paired with a positive specification of what is being built.

### 2.1 Density storage

In-memory: `Float32Array` per chunk (16 KB per chunk). On-disk: delta-compressed against the generator's baseline (§9). The plugin never stores density as a JS `Array` — typed arrays are 8× smaller and hash-stable across browsers.

### 2.2 Initialized/destroyed state

A chunk is `initialized` once the generator has filled its density + material fields. It is `destroyed` (memory pressure) only when the player is more than `unloadRadius` (default 256 m) away and the chunk has no pending meshing requests. A destroyed chunk's *field state* is recoverable from the save's delta log; only the in-memory copy is dropped.

### 2.3 Chunk borders

Each chunk shares its 1-voxel-thick border with its six neighbours. The meshing algorithm needs density values one voxel beyond the chunk's bounds (to compute surface normals at the boundary). The plugin maintains a **border apron**: each chunk stores its own 16³ plus a 1-voxel apron copied from its neighbours. When a chunk modifies its border voxel, it propagates a `border-dirty` event to the six neighbours, which refresh their apron from the modified chunk.

### 2.4 Dirty propagation

When a voxel is modified, the plugin:

1. Marks the chunk itself dirty (`dirtyQueue`).
2. If the modified voxel is on the chunk's outer 1-voxel shell, marks each overlapping neighbour dirty (`dirtyBorderQueue`).
3. If the modification crosses a region boundary (e.g., a chunk that borders a different LOD level), marks the lower-LOD neighbour dirty too (§6.4 LOD stitching).

### 2.5 Meshing

The plugin submits a meshing request to a worker pool (one worker per CPU core, capped at 4 to avoid audio/GPU contention). Each request carries:

```typescript
interface MeshRequest {
  chunkId: ChunkId;
  revision: number;          // the field revision at request time
  lod: number;               // 0 = full res, 1 = half res, 2 = quarter res, 3 = eighth res
  densitySubvolume: Float32Array;  // 18³ = the chunk + 1-voxel apron
  materialSubvolume: Uint8Array;
  meshAlgorithm: 'transvoxel' | 'dual_contour';
}
```

The worker returns a `MeshResult` (render mesh + collider mesh + navmesh-relevant edges). The plugin compares `result.revision` to `field.revisions[chunkId]`; if they differ, the result is dropped (a newer modification happened during meshing).

### 2.6 LOD stitching

When chunks at different LOD levels are adjacent, the mesh has T-junctions (cracks) at the border. The plugin uses the **transvoxel skirt** approach: each chunk's mesh includes a 1-voxel-thick "skirt" of degenerate triangles at its boundary, which the next LOD level's mesh overlaps. The skirt is invisible (it points downward and is occluded by the terrain itself) but closes the crack. This is the simplest implementation that meets the requirement; the alternative (vertex welding across LODs) requires cross-LOD coordination that breaks the per-chunk independence (Ponytail §2).

### 2.7 Collider generation

The collider mesh is a **lower-detail** version of the render mesh: same surface, fewer triangles (decimated to ~25% of render density). This is the standard approach in voxel engines because:
- The physics solver's broadphase cost scales with triangle count.
- Players cannot perceive collider-vs-render mismatch below ~10 cm.
- The collider mesh is rebuilt less frequently than the render mesh (only on `simulation`-role-affecting modifications).

The collider mesh is registered with `ga:physics` as a `terrain_collider` shape role (doc 20 §3.2) on a dedicated `TERRAIN` collision layer.

### 2.8 Navigation invalidation

When a chunk's collider mesh is replaced, the plugin emits a `TerrainColliderChanged` event with the chunk's world-space bounds. The `ga:navigation` plugin (doc 22) receives this and marks the corresponding navmesh tile for rebuild. The navmesh is **not** rebuilt by the terrain plugin — separation of concerns (Ponytail §4).

### 2.9 Save deltas

The plugin records every voxel modification as a `TerrainDelta` entry:

```typescript
interface TerrainDelta {
  tick: number;
  chunkId: ChunkId;
  voxelIndex: number;        // 0..4095, index into the chunk's 16³ grid
  oldDensity: number;
  newDensity: number;
  oldMaterial: number;
  newMaterial: number;
  cause: string;             // 'cultivator.strike' | 'generator.init' | 'flood.erosion' | ...
}
```

The save file stores only the deltas against the generator's baseline (§9). A save at tick T contains every delta from tick 0 to T.

### 2.10 Material drops

When a voxel is destroyed (density set to positive = air), the plugin determines whether a material drop is appropriate:

```typescript
interface MaterialDrop {
  itemId: string;            // 'earth.dirt' | 'stone.granite' | 'herb.spirit_root' | ...
  position: Vec3;
  quantity: number;
}
```

The drop is emitted as a `SpawnItem` event on the bus; the `ga:items` plugin handles it. The terrain plugin's job is only to compute the drop — same material as the destroyed voxel, quantity scaled by the destroyed volume. Spirit herbs (wood-phase, dense qi areas) get rarer drops; this is data-driven from the ecology definitions (doc 14).

### 2.11 Terrain effects

Modifications can trigger visual effects: dust puffs for soft material, sparks for metal-phase rock, qi-residue flares for spirit-vein-bearing voxels. The plugin emits `TerrainEffect` events; the renderer and audio plugins consume them. The effects themselves are not canonical — they are renderer-side responses to canonical modification events.

### 2.12 Debug visualization

In dev mode (`?debug=terrain`), the plugin renders:
- Chunk boundaries (wireframe boxes)
- Dirty chunks (red highlight)
- Border-apron refreshes (yellow flash on the affected neighbour)
- Density field (heat map, optional)
- Material field (per-material colour, optional)
- Active meshing requests (blue dots on chunks in the worker queue)

This is the "exhibit reviewer voices" surface (AGENTS.md Part 3): when a chunk flickers or a collider desyncs, the debug viz makes the bug visible immediately.

---

## 3. How the renderer and physics consume the SAME revision

### 3.1 The visibleRevision contract

```typescript
function commitMeshedChunk(chunkId: ChunkId, result: MeshResult): void {
  const field = host.getState('ga:terrain');
  if (result.revision !== field.revisions.get(chunkId)) {
    return;  // stale; drop
  }
  // Atomically swap:
  field.renderMeshes.set(chunkId, result.renderMesh);
  field.colliderMeshes.set(chunkId, result.colliderMesh);
  field.visibleRevisions.set(chunkId, result.revision);

  // Emit a single event with the new revision:
  host.emit('terrain.chunkVisibleRevisionChanged', { chunkId, revision: result.revision });
}
```

The renderer and physics plugins both listen to `terrain.chunkVisibleRevisionChanged` and re-fetch their mesh by the new revision. Neither can race ahead of the other — the event is emitted *after* both meshes are in the maps, and the listeners run in the same tick.

### 3.2 The atomic-swap failure case

**Failure case (atomic swap):** The renderer picks up the new render mesh at tick T, but the physics plugin is mid-step and still holds a reference to the old collider mesh. The player sees the new terrain but walks on the old collider for one tick. The fix: the swap is **double-buffered**. The `renderMeshes` and `colliderMeshes` maps hold the *current* revision; the *next* revision is held in `pendingMeshes` and committed at the start of the next simulation tick, before any plugin reads. This guarantees that within a single tick, all readers see the same revision.

Rejected alternative: a single global revision lock — would force every reader to acquire the lock, defeating the per-chunk granularity that makes streaming terrain feasible.

### 3.3 The revision log

The plugin maintains a per-chunk revision log (sliding window of 64 revisions per chunk, used for delta computation and determinism verification). The log is CBOR-serializable and part of the canonical state.

---

## 4. How modifications rebuild affected borders atomically

### 4.1 The modification entry point

```typescript
function modifyVoxel(
  worldPos: Vec3,
  newDensity: number,
  newMaterial: number,
  cause: string,
): void {
  const chunkId = worldToChunkId(worldPos);
  const localIdx = worldToVoxelIndex(worldPos);
  const field = host.getState('ga:terrain');

  const chunk = field.chunks.get(chunkId);
  if (!chunk || !chunk.initialized || chunk.destroyed) {
    throw new Error(`Cannot modify ${chunkId}: not initialized`);
  }

  const oldDensity = chunk.density[localIdx];
  const oldMaterial = chunk.material[localIdx];

  // 1. Apply the modification
  chunk.density[localIdx] = newDensity;
  chunk.material[localIdx] = newMaterial;
  chunk.revision = (field.revisions.get(chunkId) ?? 0) + 1;
  field.revisions.set(chunkId, chunk.revision);

  // 2. Record the delta
  field.deltaLog.push({
    tick: host.getState('ga:core').tick,
    chunkId, voxelIndex: localIdx, oldDensity, newDensity, oldMaterial, newMaterial, cause,
  });

  // 3. Mark dirty (self)
  field.dirtyQueue.push(chunkId);

  // 4. Mark border-dirty (neighbours)
  if (isOnBorder(localIdx)) {
    for (const nId of neighbourChunkIds(chunkId, localIdx)) {
      field.dirtyBorderQueue.push(nId);
    }
  }

  // 5. Emit
  host.emit('terrain.voxelModified', { chunkId, voxelIndex: localIdx, cause });
}
```

### 4.2 The border-rebuild atomicity

The `dirtyBorderQueue` is processed in the **same meshing batch** as the `dirtyQueue`. The plugin does not let a chunk remesh without also remeshing its border-affected neighbours in the same atomic swap. This guarantees that if chunk A's modification changes the surface near its border with chunk B, the renderer sees both A's new mesh and B's new mesh in the same tick — no one-tick seam.

### 4.3 The batch-commit

```typescript
function processDirtyQueue(): void {
  const batch = collectBatch();  // drains dirtyQueue + dirtyBorderQueue
  const results = meshingPool.submitAll(batch);

  // Commit only after ALL results return (or timeout):
  for (const result of results) {
    if (result) commitMeshedChunk(result.chunkId, result);
  }
}
```

If any meshing request in the batch fails (worker crash, OOM), the entire batch is retried on the next tick. Partial commits would create the seam we are trying to prevent.

### 4.4 The border-atomicity failure case

**Failure case (border atomicity):** Chunk A is meshed and committed; chunk B (its neighbour) is still meshing. The renderer displays A's new mesh and B's old mesh. The shared border now has a T-junction. The fix: the batch-commit (§4.3) waits for all results before committing any. If a meshing request takes > 16 ms (one tick), the entire batch is deferred to the next tick — the renderer keeps showing the old meshes for both A and B until both are ready. Rejected alternative: commit per-chunk as soon as ready — faster but creates the seam.

---

## 5. Material blending

### 5.1 The material table

```typescript
const MATERIAL_TABLE: Material[] = [
  { id: 0, name: 'air',        phaseAffinity: null,    hardness: 0,    dropItemId: null },
  { id: 1, name: 'dirt',       phaseAffinity: 'earth', hardness: 0.3,  dropItemId: 'earth.dirt' },
  { id: 2, name: 'clay',       phaseAffinity: 'earth', hardness: 0.5,  dropItemId: 'earth.clay' },
  { id: 3, name: 'stone',      phaseAffinity: 'metal', hardness: 0.8,  dropItemId: 'stone.granite' },
  { id: 4, name: 'granite',    phaseAffinity: 'metal', hardness: 0.9,  dropItemId: 'stone.granite' },
  { id: 5, name: 'sandstone',  phaseAffinity: 'earth', hardness: 0.6,  dropItemId: 'stone.sandstone' },
  { id: 6, name: 'spirit_vein',phaseAffinity: 'wood',  hardness: 0.7,  dropItemId: 'herb.spirit_root' },
  { id: 7, name: 'water_spring',phaseAffinity:'water', hardness: 0.0,  dropItemId: null },
  // ... extended by content packs
];
```

Hardness scales the energy required to destroy a voxel (cultivator strike energy / hardness → voxels destroyed). This is the link between the physics strike (doc 32 §1.2) and the terrain destruction: a Qi Condensation strike (5–20 kJ) destroys ~20–80 granite voxels per strike; a Core Formation strike (1–5 MJ) destroys ~4000–25000.

### 5.2 Material blending at the surface

At a surface voxel (density near 0), the material is blended with adjacent materials. The meshing algorithm produces per-vertex material weights; the renderer uses these to blend textures. The collider does not care about material — only density. The navmesh cares only about surface walkability (slope, material friction).

### 5.3 The material failure case

**Failure case (material):** A spirit-vein voxel (material 6) is destroyed; the drop is computed as `dropItemId: 'herb.spirit_root'`. But the spirit vein was feeding a grotto-heaven (doc 19 §2.3) through this anchor. Destroying the voxel doesn't destroy the vein — the vein persists below — but it severs the anchor's surface trace. The plugin emits `SpiritVeinAnchorSevered` event; the grotto-heaven plugin (if loaded) handles sealing the grotto. This is the cross-plugin coordination doc 19 §2.3 promised.

---

## 6. LOD and streaming

### 6.1 LOD levels

```
LOD 0: full resolution (1 voxel = 0.5 m)   — within 64 m of player
LOD 1: half resolution (1 voxel = 1.0 m)   — 64–128 m
LOD 2: quarter resolution (1 voxel = 2.0 m) — 128–256 m
LOD 3: eighth resolution (1 voxel = 4.0 m)  — 256–512 m
Beyond 512 m: terrain not loaded (memory budget)
```

The LOD level for a chunk is determined by the player's distance to the chunk's center, computed deterministically each tick (per doc 17 §3.1: no `Date.now()`, no `performance.now()` in the simulation).

### 6.2 LOD transition

When a chunk crosses an LOD boundary, the plugin:
1. Submits a new meshing request at the target LOD.
2. When the new mesh arrives, commits it (revision-checked swap).
3. The renderer crossfades between the old and new mesh over 4 ticks (66 ms) to avoid pop-in.

The crossfade is renderer-side, not canonical. The field's `visibleRevision` updates instantly; the renderer's blend is a transient visual.

### 6.3 Streaming

Chunks load as the player approaches. The plugin maintains a `loadQueue` of chunks within `loadRadius` (default 384 m) that are not yet `initialized`. The generator plugin (doc 23) consumes the load queue, fills the density + material fields, marks `initialized: true`, and pushes to `dirtyQueue`. The meshing pipeline then takes over.

Streaming is **lazy generation** (doc 23 §5): the generator does not pre-generate the entire world; it generates chunks on approach. The seed hierarchy guarantees the same chunk is generated identically every time.

### 6.4 LOD stitching (recap)

Per §2.6: transvoxel skirts close T-junctions. The skirt is a 1-voxel-thick band of degenerate triangles at the chunk boundary, pointing downward. Adjacent LODs' skirts overlap; the renderer's depth buffer resolves the overlap.

### 6.5 The LOD failure case

**Failure case (LOD):** A cultivator at 100 m altitude (LOD 2 territory for the chunks below) drops a strike that destroys voxels at LOD 0 detail. The modification goes to the LOD 0 field (the canonical field is always LOD 0; LODs 1+ are derived). The LOD 0 chunk is marked dirty even though the player is far away. The meshing request is submitted at LOD 0 (full resolution) because the chunk is now "interesting" (recently modified). The chunk's LOD is recomputed as `min(distance-based LOD, modification-boosted LOD)` for 60 seconds after the last modification, ensuring recently-deformed terrain stays sharp.

---

## 7. Determinism

### 7.1 The voxel field is canonical

Every voxel's density and material at tick T is a function of (generator output at tick 0) + (every modification from tick 0 to T). Both are deterministic. Therefore the field at tick T is deterministic.

### 7.2 The meshing is not canonical

The render mesh and collider mesh are *derived* from the field via an algorithm (transvoxel). Two runs with the same field but different meshing algorithms would produce different meshes — but the same canonical state. The meshing algorithm is part of the engine's `DeterminismFingerprint` (doc 08), so a save made with transvoxel cannot be loaded by an engine using dual contouring. This is correct: the meshes would differ, and the player would see different terrain.

### 7.3 The determinism check

```typescript
function verifyTerrainDeterminism(): boolean {
  const field = host.getState('ga:terrain');
  const hash = det_hash_cbor({
    chunks: Array.from(field.chunks.entries()).sort(byChunkId),
    revisions: Array.from(field.revisions.entries()).sort(byChunkId),
  });
  return hash === field.lastVerifiedHash;
}
```

Run nightly in CI; same protocol as the physics verification (doc 20 §7.3).

---

## 8. Save and load of deformed terrain

### 8.1 The delta log

The save file contains:

```typescript
interface TerrainSaveSlice {
  chunkRevisions: Record<ChunkId, number>;          // current revision per chunk
  deltaLog: TerrainDelta[];                         // every modification since tick 0
  materialTableHash: string;                        // content-addressed; rejects save if mismatched
  meshingAlgorithm: 'transvoxel' | 'dual_contour';  // part of fingerprint
  generatorFingerprint: string;                     // the generator that produced the baseline
}
```

The delta log is the canonical state. The chunk fields themselves are **not** in the save — they are rebuilt on load by replaying the generator + applying the deltas.

### 8.2 The load path

```
1. Read save file
2. Verify fingerprint (engine, meshing algorithm, generator, material table)
3. For each chunk in chunkRevisions:
   a. Run the generator for that chunk (deterministic, same seed)
   b. Apply every delta in deltaLog whose chunkId matches
   c. The chunk's density/material now matches the saved state
   d. Mark dirty (forces re-meshing)
4. The meshing pipeline remeshes every dirty chunk
5. visibleRevisions catch up to chunkRevisions
6. The save's hash should match the engine's hash at the save's tick
```

### 8.3 The save failure case

**Failure case (save):** The save's delta log is corrupted (a single delta is missing or has wrong values). The replayed field does not match the save's recorded `chunkRevisions`. The engine detects this on load: the field's hash after replay is compared to the save's hash; mismatch throws. Rejected alternative: ignore the mismatch and load anyway — would silently produce a different world, violating the determinism contract.

### 8.4 The save-compression failure case

The delta log can grow large for a long play session (millions of deltas). Compression strategies:

1. **Coalesce adjacent deltas** — if the same voxel was modified 100 times in one session, only the final state matters. Coalescing reduces the log by ~80%.
2. **Snapshot every N deltas** — every 10,000 deltas, write a full chunk snapshot. On load, find the latest snapshot before the save tick, apply deltas from there. Reduces load time from minutes to seconds.
3. **Discard deltas for unloaded chunks** — if a chunk was modified, then unloaded, then never revisited, its deltas can be replaced with a single "regenerate from generator + apply final state" entry. Risky: if the generator changes (fingerprint bump), the final state cannot be reconstructed. Disabled by default.

The save format version field allows future formats without backward compatibility (Ponytail §1: do not preserve backward compatibility — old saves are flagged for migration, not silently loaded).

---

## 9. The destruction event flow

### 9.1 A cultivator strikes a hillside

```
1. Combat system resolves strike (doc 13 §2)
2. Strike volume overlaps terrain_collider (doc 20 §4)
3. Combat system computes energy at contact: 1.2 MJ (Core Formation heavy strike)
4. Combat system calls terrain.modifySphere(contactPoint, radius, energy):
   a. For each voxel in the sphere:
      - voxels_destroyed = energy / (voxel_volume × material.hardness)
      - if voxels_destroyed > 0: set density to +1 (air), decrement energy
   b. For each destroyed voxel:
      - If material.dropItemId: emit SpawnItem event
      - If material.name === 'spirit_vein': emit SpiritVeinSevered event
   c. Emit TerrainEffect event (dust, sparks)
5. The modified chunks are dirty; meshing pipeline kicks in
6. visibleRevision updates; renderer + physics swap to new meshes
7. navmesh invalidation fires; navigation plugin rebuilds affected tiles
```

### 9.2 The energy-budget failure case

**Failure case (energy):** A cultivator's strike claims 1.2 MJ, but the terrain only has 0.4 MJ of destructible material in the strike volume. The remaining 0.8 MJ must go somewhere. The fix: the modifySphere call returns the *remaining* energy, which the combat system applies as residual force (the cultivator's strike continues through the destroyed terrain and hits whatever is behind it). This is the Sekiro/Monster Hunter "committed strike" pattern (doc 13 §0): the strike does not stop at the terrain; it passes through.

---

## 10. Failure cases (consolidated)

1. **Renderer/physics desync** — atomic double-buffered swap (§3.2).
2. **Border T-junction after modification** — batch-commit waits for all results (§4.4).
3. **Material drop miscalculation** — material table is content-addressed; mismatches refuse save load (§8.1).
4. **Spirit vein severed without grotto-heaven response** — `SpiritVeinSevered` event; grotto plugin handles sealing (§5.3).
5. **LOD transition pop-in** — 4-tick crossfade (§6.2).
6. **Recently-modified terrain at low LOD looks wrong** — 60-second LOD boost (§6.5).
7. **Meshing algorithm mismatch on save load** — fingerprint refuses load (§7.2).
8. **Corrupted delta log** — hash mismatch throws on load (§8.3).
9. **Delta log unbounded growth** — coalesce + snapshot every N deltas (§8.4).
10. **Strike energy not consumed by terrain** — residual energy passes through (§9.2).

---

## 11. Rejected alternatives

### 11.1 Heightmap terrain

The classic approach: a 2D heightmap per region. Rejected because (a) cannot express caves, overhangs, or destruction below the surface; (b) cannot express grotto-heaven anchors (caves behind waterfalls); (c) cannot express the cultivator-scale deformation the genre demands. Voxel terrain is more complex but is the only tool that fits the requirement.

### 11.2 One mega-mesh for the whole world

A single non-chunked mesh. Rejected because (a) cannot be modified incrementally — every modification would require remeshing the entire world; (b) cannot stream — the whole mesh must be in memory; (c) cannot LOD — there is no per-region granularity.

### 11.3 Per-voxel physics colliders

Each voxel is its own collider. Rejected because (a) a 16³ chunk has 4096 voxels — 4096 colliders per chunk × 100 visible chunks = 409,600 colliders, far beyond any solver's budget; (b) the solver's broadphase would spend all its time on terrain. The collider mesh is the right granularity — one mesh per chunk, ~100–500 triangles.

### 11.4 GPU-only density

Storing density in a 3D texture and meshing on the GPU. Rejected because (a) the density field is canonical and must be CPU-readable for determinism verification; (b) WebGPU compute is not yet universal (doc 08); (c) CPU meshing in workers is fast enough (16 ms per chunk at LOD 0 on a 4-core machine, well within the streaming budget).

### 11.5 Octree instead of uniform chunks

An octree (variable-size voxels) would reduce memory in sparse areas. Rejected because (a) the chunk-neighbour border logic becomes a sparse-graph problem instead of a fixed 6-neighbour problem; (b) the determinism verification has to walk a tree instead of a flat array; (c) the memory savings are modest for a player-localised terrain (most chunks within view are at LOD 0). Uniform chunks are the simplest implementation that fully meets the requirement (Ponytail §2).

---

## 12. What this document enables

- The terrain is an authoritative voxel field (density + material) chunked at 16³, modified by generator and destructible events.
- The terrain plugin owns eleven responsibilities, each named explicitly: density storage, init/destroy state, borders, dirty propagation, meshing, LOD stitching, collider generation, navmesh invalidation, save deltas, material drops, terrain effects, debug viz.
- The renderer and physics consume the SAME terrain revision via double-buffered atomic swap.
- Modifications rebuild affected borders atomically via batch-commit.
- LOD is distance-based with a 60-second modification boost.
- Save format is a delta log against the generator's baseline; coalesced and snapshotted for size.
- Determinism is enforced by hashing the field; meshing algorithm is part of the fingerprint.
- Rejected alternatives (heightmap, mega-mesh, per-voxel colliders, GPU-only, octree) are documented with reasons.

The next step is to implement the `ga:terrain` plugin against this spec, starting with a single 16³ chunk, a transvoxel mesher in a Web Worker, and the atomic-swap path. The smallest end-to-end test: a chunk is meshed, displayed, and walked on; a modification triggers a remesh; the renderer and physics both see the new revision at the same tick. That is the gate.
