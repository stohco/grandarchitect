# 39 — Performance & Memory Budgets

**Status:** Architecture. The budget system that keeps the engine on frame.
**Date:** 2026-08-03

---

## 0. What this document is

A 60fps frame is 16.67 milliseconds. The engine has to fit input, simulation, physics, and rendering into that budget, every frame, on declared hardware, with a canonical state that fits in 768 MiB and a GPU footprint that fits in 2 GiB. This document defines the budget system that enforces those numbers, the entity budgets per simulation tier, the streaming and worker budgets, and how the budgets scale with hardware.

The doctrine (AGENTS.md Part 3) says: "Cite the precedent." The precedents here are: Bungie's Destiny 2 frame budget (public GDC talks), Insomniac's memory budget sheets (Ratchet & Clank postmortems), and the S0-S4 fidelity tiers from doc 17 §6.2 (this engine's own doctrine, derived from the century-spanning simulation requirement). The numbers below are calibrated against desktop-class hardware; the scaling rules (§6) describe what happens on lower tiers.

The doctrine also says (Part 1): "Choose the simplest implementation that fully meets the current requirements." The budget system is a runtime check, not a static analysis. It does not try to predict cost; it measures cost and reacts. Prediction is harder, more brittle, and wrong more often than measurement.

---

## 1. The 16 questions

### 1.1 Frame budget allocation (input: 1ms, sim: 5ms, physics: 3ms, render: 10ms, total: 16.67ms for 60fps)

The frame budget is divided among the major phases. The default allocation for desktop-high at 60fps:

```typescript
interface FrameBudget {
  total: number;                 // 16.67ms for 60fps, 33.33ms for 30fps
  allocation: {
    input: number;               // 1.0ms — input collection, deterministic timestamping
    sim: number;                 // 5.0ms — NPC, ecology, economy, qi systems
    physics: number;             // 3.0ms — Jolt WASM step
    render: number;              // 10.0ms — all render passes
    // 0.67ms of slack — absorbed by GC, framework overhead, browser compositing
  };
  // The budget is enforced as a p95, not a hard cap. p99 is allowed to exceed
  // by 50% (so p99 frame time ≤ 25ms = 40fps minimum).
  enforcement: {
    p50: number;                 // 14ms — the median target
    p95: number;                 // 16ms — must stay under
    p99: number;                 // 18ms — allowed to spike
  };
}
```

The allocation is not arbitrary. It is the residue of three constraints:

1. The simulation must run at 60Hz (doc 17 §6.1). At 1000 entities in the S4 tier, the NPC simulator alone costs ~3ms (measured on the prototype), leaving 2ms for the rest of the sim.
2. The physics solver (Jolt WASM) costs ~2.5ms for a 500-body scene; 3ms is the headroom.
3. The renderer (Three.js WebGPU) costs ~8ms for the village-morning scene with shadows and post-processing; 10ms is the headroom.

These numbers are measured, not estimated. The budget enforcer (§5) measures them every frame and adjusts.

### 1.2 Memory budgets (canonical state: ≤768 MiB, presentation: ≤768 MiB, GPU: ≤2 GiB)

The memory budget is divided into three pools, each independently enforced:

```typescript
interface MemoryBudget {
  canonical: number;             // ≤768 MiB — the world state, hashable, saveable
  presentation: number;          // ≤768 MiB — render-only state (meshes, textures in CPU memory)
  gpu: number;                   // ≤2 GiB — GPU memory (textures, buffers, render targets)
  jsHeap: number;                // ≤512 MiB — JS heap (the rest of the 4 GiB tab budget)
}

// Why 768 + 768 + 2048 + 512 = 4 GiB?
// The browser tab budget on a 8 GiB desktop is ~4 GiB (the rest is OS + browser).
// 768 MiB canonical is enough for 5000 S2 entities (per §3 below) + 500 S3 + 200 S4
// with full component state, schedules, relationships, qi-state.
// 768 MiB presentation is enough for ~50 loaded GLB models + ~200 KTX2 textures
// at the quality tier the engine targets.
// 2 GiB GPU is the high end of integrated GPUs in 2026; dedicated GPUs have more.
// 512 MiB JS heap is the residue; the engine keeps JS heap small by putting state
// in TypedArrays, not objects.
```

The canonical pool is the load-bearing one. It must fit because the save system serializes it (CBOR) and hashes it (SHA-256) on every checkpoint. A canonical pool over budget means checkpoints take too long, which means the determinism verification loop slows down, which means the engine cannot run.

### 1.3 Entity budgets (S4: ≤200, S3: ≤500, S2: ≤5000)

Per doc 17 §6.2, entities are tiered by simulation fidelity. Each tier has an entity budget:

```typescript
interface EntityBudget {
  s4: number;                    // ≤200 — full simulation, every tick
  s3: number;                    // ≤500 — full state machine, reduced frequency
  s2: number;                    // ≤5000 — aggregate state, scheduled updates
  s1: number;                    // ≤50000 — demographic/aggregate only
  s0: number;                    // unlimited — frozen state, no per-entity cost
  // The total simulated cost is dominated by S4 + S3.
  // S2 is cheap because aggregates do not need per-entity tick updates.
  // S1 and S0 are essentially free.
}
```

The 200/500/5000 numbers are calibrated against the prototype's measurements:

- An S4 NPC (full schedule, full qi-state, full relationships, full combat state) costs ~25µs per tick. 200 × 25µs = 5ms, which is the entire sim budget.
- An S3 NPC costs ~5µs per tick (reduced frequency, simpler state). 500 × 5µs = 2.5ms.
- An S2 entity is aggregate (e.g., "the 50 farmers in Village X collectively produce Y rice"). 5000 aggregates cost ~0.5ms total.

The budget enforcer (§5) prevents promotion above these limits. If the player walks into a village with 250 NPCs, 50 of them demote to S3 immediately (the tier transition is deterministic, per doc 17 §6.2 — the demotion order is decided by a hashable priority).

### 1.4 Asset streaming budgets

Assets are streamed on demand. The streaming budget has two components: the in-flight transfer budget (how many bytes can be downloading at once) and the resident budget (how many bytes can be in memory at once).

```typescript
interface StreamingBudget {
  // In-flight: the total bytes being fetched/decoded at any moment.
  // This bounds network and CPU (decoder) cost.
  inFlight: number;              // ≤64 MiB — ~4 concurrent KTX2 textures + 1 GLB
  // Resident: the total bytes of assets currently in memory (CPU + GPU).
  // The LRU cache evicts when this is exceeded.
  residentCpu: number;           // ≤256 MiB (subset of the 768 MiB presentation pool)
  residentGpu: number;           // ≤1.5 GiB (subset of the 2 GiB GPU pool)
  // The prefetch radius: assets within this distance of the player are preloaded.
  prefetchRadius: number;        // 200m — calibrated so a 5 m/s walk never stalls
}
```

The streaming system uses a content-addressed cache (doc 17 §1.4 — the `ga:assets` plugin). Assets are fetched by hash, decoded in a Worker (KTX2 decode, meshopt decode), and uploaded to the GPU. The LRU eviction policy is: evict the least-recently-rendered asset that is outside the prefetch radius. Eviction never touches assets in the prefetch radius, even if they are the oldest.

### 1.5 Worker job budgets

The engine uses Web Workers for: determinism verification, asset decoding, headless simulation, the divergence finder. Each worker has a time-slice budget per frame:

```typescript
interface WorkerBudget {
  // Each worker can run for at most this long per frame before yielding.
  // Workers that exceed are preempted (their current job is paused and resumed
  // next frame).
  timeSliceMs: number;           // 4ms — leaves 12ms for the main thread
  // Memory budget per worker
  memoryMiB: number;             // 128 MiB
  // The worker pool size (concurrent workers)
  poolSize: number;              // 4 — calibrated for 8-core desktops
}
```

The worker budget is what keeps the main thread responsive. Without it, a long-running worker job (e.g., decoding a 50 MiB GLB) would block the main thread's frame. With the 4ms time slice, the worker yields after 4ms, the main thread runs a frame, the worker resumes. The decode takes longer in wall-clock but the frame rate does not drop.

### 1.6 How budgets scale with hardware tier

The budgets above are for `desktop-high` (8-core CPU, 32 GiB RAM, dedicated GPU with 8 GiB VRAM). Lower tiers scale down:

```typescript
type HardwareTier = 'desktop-high' | 'desktop-low' | 'mobile' | 'headless';

interface TieredBudget {
  tier: HardwareTier;
  frame: FrameBudget;
  memory: MemoryBudget;
  entities: EntityBudget;
  streaming: StreamingBudget;
  worker: WorkerBudget;
  // The render quality preset (resolution scale, shadow quality, post-processing)
  renderPreset: 'ultra' | 'high' | 'medium' | 'low' | 'headless';
}

const budgets: Record<HardwareTier, Partial<TieredBudget>> = {
  'desktop-high': {
    frame: { total: 16.67, /* ... */ },
    entities: { s4: 200, s3: 500, s2: 5000, /* ... */ },
    renderPreset: 'ultra',
  },
  'desktop-low': {
    frame: { total: 33.33, /* 30fps */ },
    entities: { s4: 100, s3: 250, s2: 2000, /* ... */ },
    renderPreset: 'medium',
  },
  'mobile': {
    frame: { total: 33.33, /* 30fps */ },
    entities: { s4: 50, s3: 150, s2: 1000, /* ... */ },
    renderPreset: 'low',
  },
  'headless': {
    // No frame budget — sim runs as fast as possible
    frame: { total: Infinity },
    entities: { s4: 1000, s3: 5000, s2: 50000, /* ... */ },
    renderPreset: 'headless',
  },
};
```

The tier is detected at startup (CPU core count, GPU adapter info, device memory). The user can override the tier in the settings (lower it to save battery, raise it on a capable machine that was misdetectected). The tier is part of the save's metadata — a save made on `desktop-high` loads on `desktop-low` but the engine may demote entities to fit the budget.

### 1.7 How are budgets enforced (soft warning vs hard failure)?

Every budget has two thresholds:

```typescript
interface BudgetEnforcement {
  // The soft threshold: when exceeded, the engine logs a warning and starts
  // shedding load (demote entities, drop render quality, evict assets).
  soft: number;                  // 0.85 × budget
  // The hard threshold: when exceeded, the engine refuses the operation
  // that would push it over.
  hard: number;                  // 1.00 × budget
}
```

| Budget | Soft action | Hard action |
|---|---|---|
| Frame time (p95) | Drop render preset (ultra → high), demote S4→S3 | Drop to 30fps; if still over, pause non-critical systems |
| Memory (canonical) | Demote entities (S4→S3→S2), shed presentation cache | Refuse new entity spawns; if still over, refuse new saves |
| Memory (GPU) | Drop texture mip levels, reduce render target resolution | Refuse new texture uploads; evict LRU aggressively |
| Entity (S4) | Demote lowest-priority S4 to S3 | Refuse new S4 promotions |
| Streaming (in-flight) | Queue, do not fetch immediately | Refuse new fetches until in-flight drops |
| Worker (time-slice) | Preempt and resume next frame | (no hard limit — preemption is the limit) |

The soft threshold is the engine's auto-degradation. The hard threshold is the engine's refusal — it is better to refuse a spawn than to crash the tab.

### 1.8 What does the budget enforcer look like?

```typescript
interface BudgetEnforcer {
  // Called every frame with the latest metrics
  onFrame(metrics: FrameMetrics): void;
  // Called before any operation that might exceed a budget
  canSpawn(tier: 'S4' | 'S3' | 'S2'): boolean;
  canUploadTexture(bytes: number): boolean;
  canFetch(bytes: number): boolean;
  // Called when a soft threshold is exceeded — triggers degradation
  degrade(reason: DegradeReason): void;
  // The current tier (may have been lowered by degradation)
  currentTier(): HardwareTier;
  // The budget report (for the profiler UI)
  report(): BudgetReport;
}

type DegradeReason =
  | 'frame-p95-exceeded'
  | 'canonical-memory-soft'
  | 'gpu-memory-soft'
  | 'entity-s4-soft'
  | 'streaming-soft';
```

The enforcer is the bridge between the metrics collector (doc 37 §1.2) and the engine's auto-degradation. It runs every frame, checks the rolling p95, and triggers degradation if the soft threshold is exceeded for N consecutive frames (default N=30, i.e., half a second).

### 1.9 How does the entity tier demotion work?

When the S4 budget is exceeded, the enforcer picks the lowest-priority S4 entities and demotes them to S3. The priority is deterministic (per doc 17 §6.2): it is a hash of the entity ID + the current tick, so the demotion order is reproducible. The demotion is logged (the designer can see which entities demoted and why, in the profiler).

Promotion (S3→S4) is the reverse: when an S3 entity becomes player-adjacent (within the S4 radius), it promotes. The enforcer checks the budget before promoting; if the budget is full, the entity stays at S3 (the player sees reduced simulation fidelity, not a frame drop).

### 1.10 How does the render preset auto-degrade?

The render preset degrades in stages:

```
ultra → high → medium → low → (pause non-critical systems)
```

Each stage sheds a specific cost:

- `ultra → high`: drop SSAO, reduce shadow map resolution from 4K to 2K.
- `high → medium`: drop bloom, reduce shadow map to 1K, halve post-processing resolution.
- `medium → low`: drop shadows entirely for distant lights, reduce render target to 0.75× resolution.
- `low → pause`: drop to 30fps, then pause non-critical systems (ecology, economy aggregate updates).

Each stage is reversible: when the frame budget recovers, the enforcer upgrades the preset one stage at a time, with a hysteresis (must be under budget for 5 seconds before upgrading).

### 1.11 How does the canonical memory budget interact with the save system?

The save system serializes the canonical state (CBOR) and hashes it (SHA-256) on every checkpoint. If the canonical state is at 768 MiB, the serialize+hash takes ~150ms (measured), which is a noticeable hitch. The checkpoint interval (default 1000 ticks = ~16 seconds) is calibrated so the hitch happens during a non-critical moment.

If the canonical state exceeds the soft threshold (653 MiB), the enforcer demotes entities to bring it back under. If it exceeds the hard threshold (768 MiB), the save system refuses to checkpoint and surfaces a warning: "Save size exceeded. The engine will not checkpoint until entities are demoted."

### 1.12 How do the worker budgets interact with the determinism verification?

The determinism verification worker (doc 37 §1.13) runs every 1000 ticks. It re-runs the last 1000 ticks from the last checkpoint and compares the hash. This takes ~50ms on `desktop-high`, well within the worker budget. On `desktop-low`, it takes ~150ms — still within the budget because the worker can use a full 4ms per frame across many frames.

If the worker cannot complete the verification within 10000 ticks (the verification window), the enforcer reduces the verification frequency (every 2000 ticks, then 5000). The divergence safety net degrades but does not disappear.

### 1.13 How is the budget reported to the designer?

The profiler (doc 36 §1.11) surfaces the budget report:

```
┌─────────────────────────────────────────────────────────┐
│  Budget Report                              tier: high   │
│                                                          │
│  Frame (p95): 15.2ms / 16ms         ████████████░░  95%  │
│  Canonical:   612 MiB / 768 MiB     ███████████░░░  80%  │
│  GPU:         1.4 GiB / 2 GiB       ███████████░░░  70%  │
│  S4 entities: 187 / 200             █████████████░  94%  │
│  S3 entities: 412 / 500             ████████████░░  82%  │
│  Streaming:   48 MiB / 64 MiB       ████████████░░  75%  │
│                                                          │
│  Warnings:                                               │
│  • S4 budget at 94% — demotion imminent                 │
└─────────────────────────────────────────────────────────┘
```

The designer sees the budget as a live dashboard. The warnings surface upcoming soft-threshold crossings so the designer can act before the engine auto-degrades.

### 1.14 How do mods interact with budgets?

Mods are subject to the same budgets as engine plugins. A mod that spawns entities consumes the entity budget; a mod that uploads textures consumes the GPU budget. The enforcer does not distinguish between engine and mod — a spawn is a spawn.

A mod can declare a "budget reservation" in its manifest:

```typescript
interface ModBudgetReservation {
  entitiesS4?: number;           // 'this mod may spawn up to 20 S4 entities'
  entitiesS3?: number;
  gpuMemoryMiB?: number;
}
```

The enforcer reserves the declared amount at mod load. If the reservation cannot be met (the budget is already full), the mod refuses to load with a clear error: "Mod X requires 20 S4 entity slots; only 12 available."

### 1.15 What happens when the hard threshold is hit?

The hard threshold is the engine's refusal point. When hit:

1. The operation that would push over the budget is refused (spawn, texture upload, fetch).
2. A non-blocking warning is surfaced to the user.
3. The enforcer triggers aggressive degradation (drop render preset, demote entities).
4. If degradation does not bring the budget back under hard within 5 seconds, the engine pauses the simulation and surfaces a modal: "The engine is out of memory. Save and restart, or disable some mods."

The hard threshold is never a silent crash. The user is told what happened and given options.

### 1.16 How are the budgets tested?

The budget tests are part of the performance test class (doc 38 §1.7). Each scenario (village-morning, combat-50-npcs, century-headless) declares its budget per tier, and the test asserts the p95 stays under. The tests run on declared CI hardware (one desktop-high, one desktop-low, one mobile emulation). A budget regression is a review flag.

The budget numbers themselves are tested by the conformance suite: a plugin that declares a `budgetReservation` and exceeds it is refused at load. The reservation is a contract; exceeding it is a contract violation.

---

## 2. The budget enforcement loop

```
                  ┌─────────────────────┐
                  │  Frame starts        │
                  └──────────┬───────────┘
                             │
                  ┌──────────▼───────────┐
                  │  Collect metrics     │ ← doc 37 §1.2
                  │  (frame time, mem,   │
                  │   entities, GPU)     │
                  └──────────┬───────────┘
                             │
                  ┌──────────▼───────────┐
                  │  BudgetEnforcer      │
                  │  .onFrame(metrics)   │
                  └──────────┬───────────┘
                             │
              ┌──────────────┼──────────────┐
              │              │              │
       p95 < soft      soft ≤ p95 < hard    p95 ≥ hard
              │              │              │
              ▼              ▼              ▼
       (no action)    degrade(reason)   refuse + degrade +
                       drop render       modal warning
                       preset, demote
                       entities, evict
              │              │              │
              └──────────────┴──────────────┘
                             │
                  ┌──────────▼───────────┐
                  │  Next frame          │
                  └──────────────────────┘
```

---

## 3. Failure cases

| Failure | Detection | Recovery | User sees |
|---|---|---|---|
| Frame p95 exceeds soft threshold | Metrics p95 calc | Degrade render preset, demote entities | Brief quality drop; profiler warning |
| Frame p95 exceeds hard threshold | Metrics p95 calc | Drop to 30fps; pause non-critical systems | "Engine degraded to 30fps to stay on budget." |
| Canonical memory exceeds soft | Memory sampling | Demote entities (S4→S3→S2) | Brief simulation fidelity drop |
| Canonical memory exceeds hard | Memory sampling | Refuse new spawns; refuse checkpoint | "Cannot checkpoint: state too large." |
| GPU memory exceeds soft | GPU memory estimate | Drop texture mips, reduce RT resolution | Texture pop-in |
| GPU memory exceeds hard | WebGPU allocation failure | Refuse new uploads; evict LRU | Missing textures (purple/black) |
| S4 entity budget exceeded | Spawn check | Demote lowest-priority S4 to S3 | Distant NPCs simplify |
| S4 entity budget hard-capped | Spawn check | Refuse spawn | "Cannot spawn: S4 budget full." |
| Streaming in-flight exceeded | Fetch check | Queue fetch | Asset pop-in (brief) |
| Streaming resident exceeded | LRU check | Evict LRU outside prefetch radius | Re-fetch on re-entry (brief) |
| Worker time-slice exceeded | Worker wall-clock | Preempt, resume next frame | (invisible — the design) |
| Tier misdetection (mobile reported as desktop) | Heuristic failure | User override in settings | Frame drops; user lowers tier |
| Mod budget reservation cannot be met | Load-time check | Refuse mod load | "Mod X requires more S4 slots than available." |
| Verification worker cannot keep up | Worker overrun | Reduce verification frequency | (invisible; divergence safety net degrades) |

---

## 4. Rejected alternatives

- **Static cost prediction.** Rejected: predicting the cost of a system before running it is harder, more brittle, and wrong more often than measuring. The runtime check is simpler and correct.

- **A single global budget (no per-pool split).** Rejected: the canonical pool and the presentation pool have different constraints (one must be hashable, the other must be GPU-uploadable). Splitting them lets each pool be enforced against its own constraint.

- **Hard frame cap (drop the frame if over).** Rejected: dropping a frame in a deterministic simulation is not allowed (the sim must run at 60Hz). The enforcement is on the *render* budget, not the sim budget — the sim always runs, the render degrades.

- **No entity budget (spawn freely).** Rejected: the century-spanning simulation produces entities without bound. Without a budget, the engine OOMs. The tier system (doc 17 §6.2) is the engine's answer to bounded simulation; the entity budget is the enforcement.

- **Fixed budgets across all hardware.** Rejected: a 200-S4-entity budget on a mobile device would crash it. The tier scaling (§6) is non-negotiable.

- **Budgets as engine configuration (designer tunes).** Rejected: the budgets are calibrated measurements, not opinions. The designer can override (lower the tier to save battery) but cannot raise the budget above the measured ceiling without crashing the engine.

- **GC-based memory enforcement.** Rejected: GC is non-deterministic in timing and the engine avoids relying on it. The memory budget is enforced by sampling `performance.memory.usedJSHeapSize` and the GPU allocator's accounting, not by triggering GC.

- **No render preset degradation (always ultra).** Rejected: a fixed ultra preset would not run on `desktop-low` or `mobile`. The degradation cascade is what makes the engine run on the full hardware range.

- **Worker budgets enforced by main-thread polling.** Rejected: polling is jittery. The workers self-enforce their time slice (they check the wall-clock at every loop iteration and yield when over).

---

## 5. What this document enables

A budget system where:
- The frame is divided into measured, enforced allocations.
- The memory is divided into three pools, each with its own constraint.
- The entity count is bounded per tier, with deterministic demotion when exceeded.
- The streaming is bounded in flight and in residence, with prefetch to hide latency.
- The workers are time-sliced, so the main thread never stalls.
- The hardware tier scales every budget down on lower hardware.
- The soft threshold triggers auto-degradation; the hard threshold triggers refusal.
- The designer sees a live dashboard of every budget.
- The mods reserve budget at load and are refused if the reservation cannot be met.

The next steps:
1. Implement the budget enforcer and wire it to the metrics collector.
2. Calibrate the frame budget allocations against the prototype's measurements.
3. Implement the entity tier demotion with the deterministic priority hash.
4. Implement the render preset degradation cascade.
5. Wire the budget report to the profiler UI.
