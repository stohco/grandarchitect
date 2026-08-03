# 08 — Jobs, Workers, and Concurrency

**Status:** Foundation architecture. The engine's parallel compute substrate.
**Date:** 2026-08-03
**Engine:** Grand Architect (browser-native plugin host, deterministic contract)
**Depends on:** `ga:determinism` (RNG, CBOR, SHA-256), `ga:core` (PluginHost), `07_SCHEDULER_FRAME_LOOP_TIME_DOMAINS` (the fixed tick that stamps every job)
**Read with:** `08_THREEJS_REPOSITORY_RESEARCH` (OffscreenCanvas, Comlink, SharedArrayBuffer), `21_PHYSICS_ENGINE` (Jolt WASM), `49_CONTENT_ARCHITECTURE` (terrain revision system)

---

## 0. What this document is

The browser gives the engine `Worker`, `SharedArrayBuffer`, `Atomics`, `OffscreenCanvas`, and `Comlink`. This document specifies how the engine uses them: the six worker types, the `Job` interface that every parallel task implements, the revision system that lets terrain and destructible geometry recompute without blocking the sim, the renderer-OffscreenCanvas contract, and the cross-origin-isolation story (including the fallback for non-isolated contexts where `SharedArrayBuffer` is unavailable).

The central tension: **determinism requires single-threaded, ordered computation; performance requires parallelism.** The resolution is that *only the sim thread is canonical*. Workers compute *derived* artifacts (meshes, terrain heightmaps, baked lighting, AI lookahead, save serialization) whose results are stamped with the tick they were computed for and *rejected* if they arrive after the sim has moved past that tick. The sim never blocks on a worker; the worker never writes back to sim state directly.

---

## 1. Worker types

The engine defines six worker types. Each is a separate JS bundle (separate `Worker` constructor) so a crash in one does not take down the others. Each exposes a typed Comlink interface.

```
┌────────────────────────────────────────────────────────────────────┐
│                         WORKER POOL                                │
│                                                                    │
│   MAIN thread    ─── sim, scheduler, event bus, input barrier      │
│       │                                                            │
│       │  Comlink + SAB + Atomics                                   │
│       │                                                            │
│   ┌───┴───┬─────────┬────────┬─────────┬────────────┬─────────┐   │
│   ▼       ▼         ▼        ▼         ▼            ▼         ▼   │
│  WORLD  MESH        AI     ASSET   PERSISTENCE   RENDERER (OC)    │
│  worker  worker    worker  worker   worker        worker          │
│                                                                    │
│  terrain  LOD       NPC    glTF    SQLite-WASM    OffscreenCanvas │
│  height-  weld      look-  decode  OPFS write     WebGPU/WebGL2   │
│  maps     KTX2      ahead  cache   compaction     present         │
│  destruc  BVH       path-         migration                       │
│  tible    build     finding       branching                       │
│  geom.    light-    econom-                                       │
│           map       ics                                           │
│                                                                    │
│  1 inst   1-4 inst  1-4     1       1             1 (on MAIN if   │
│           (mesh-    inst    inst    inst           OC unsupported) │
│           heavy)                                            │
└────────────────────────────────────────────────────────────────────┘
```

### 1.1 The six types

| Type | Purpose | Concurrency | Why separate |
|---|---|---|---|
| `MAIN` | The sim thread. Runs the scheduler, event bus, PluginHost. | 1 (canonical) | Holds the authoritative world state. Cannot be parallelized. |
| `WORLD` | Terrain heightmaps, destructive-geometry recomputation, biome aggregation. | 1 | Holds the terrain revision tree (§5). Stateful. |
| `MESH` | LOD generation, meshopt decode, BVH build, lightmap baking. | 1–4 (mesh-budget-dependent) | CPU-heavy; multiple instances scale linearly. |
| `AI` | NPC lookahead, pathfinding Dijkstra/HOA, economy simulation, strategic-tier aggregation. | 1–4 (AI-budget-dependent) | Lookahead is speculative; multiple workers run parallel rollouts. |
| `ASSET` | glTF parsing, KTX2 decode, meshopt decompression, content-addressed cache management. | 1 | OPFS access is single-writer; cache coherence. |
| `PERSISTENCE` | SQLite-WASM + OPFS writes, checkpoint compaction, save migration, branching. | 1 | OPFS single-writer; serial transactions. |
| `RENDERER` (OffscreenCanvas) | Render submit, GPU command buffer. | 1 (or 0 if OC unsupported) | GPU is single-context per canvas. |

### 1.2 Worker interface

Every worker is a Comlink-exposed object implementing this surface:

```typescript
interface WorkerHandle {
  readonly type: WorkerType;
  readonly ready: Promise<void>;
  /** Submit a job. Returns a promise that resolves with the JobResult. */
  submit<I, O>(job: Job<I, O>): Promise<JobResult<O>>;
  /** Cancel all jobs with the given cancellation token. */
  cancel(token: CancellationToken): void;
  /** Ping for liveness. Used by the watchdog (§7). */
  ping(): Promise<void>;
  /** Drain the inbox. Called by MAIN's phase 2. */
  drain(): Promise<DrainResult>;
  /** Shutdown the worker. Refuses if jobs are pending. */
  shutdown(): Promise<void>;
}

type WorkerType = 'main' | 'world' | 'mesh' | 'ai' | 'asset' | 'persistence' | 'renderer';
```

---

## 2. The Job interface

A `Job` is the unit of parallel work. Every job is serializable (CBOR), has a deterministic seed derived from the tick it was issued at, and carries an input revision that the worker checks against its current revision before computing.

```typescript
interface Job<I, O> {
  /** Stable unique ID. Used for cancellation and dedup. */
  id: string;
  /** The worker type that must run this job. */
  worker: WorkerType;
  /** The kind of job, e.g. 'terrain.recompute', 'mesh.lod', 'ai.lookahead'. */
  kind: string;
  /** The fixed tick at which the MAIN thread issued this job. */
  issuedAtTick: bigint;
  /** The latest tick by which the result is still useful. */
  deadlineTick: bigint;
  /** Priority. Lower = higher priority. Same scale as SystemRegistration.priority. */
  priority: number;
  /** Deterministic RNG seed for this job, derived from (worldSeed, tick, jobKind, id). */
  seed: bigint;
  /** Cancellation token. MAIN can cancel by issuing a CancelJob with this token. */
  cancellation: CancellationToken;
  /** The input. Must be CBOR-serializable, or use transferable buffers. */
  input: I;
  /** Transferable buffers to move (not copy) to the worker. */
  transferables: Transferable[];
  /** The input revision (§5). The worker checks this against its current revision. */
  inputRevision: bigint;
  /** Time budget in ms. Worker must abort and return PartialResult if exceeded. */
  budgetMs: number;
  /** Retry policy. */
  retry: { maxAttempts: number; backoffMs: number };
  /** Fallback: if all retries fail, call this on MAIN. */
  fallback: (input: I, err: unknown) => O | Promise<O>;
}

interface JobResult<O> {
  /** The output, or null if the job failed or was cancelled. */
  output: O | null;
  /** The tick the result was computed for (= job.issuedAtTick). */
  computedForTick: bigint;
  /** The output revision (§5). */
  outputRevision: bigint;
  /** Wall-clock duration the worker spent. For profiling only. */
  durationMs: number;
  /** Whether the result is partial (budget exceeded). */
  partial: boolean;
  /** Error, if any. */
  error?: { code: string; message: string };
  /** Transferable buffers in the output (moved back to MAIN). */
  transferables: Transferable[];
}

interface CancellationToken {
  /** A 128-bit token, randomly generated per job. */
  high: bigint;
  low: bigint;
}
```

### 2.1 Deterministic seeds

Every job carries a `seed: bigint` derived deterministically from `(worldSeed, issuedAtTick, jobKind, jobId)`. The derivation uses `splitmix64` chained with the world seed:

```typescript
function jobSeed(worldSeed: bigint, tick: bigint, kind: string, id: string): bigint {
  const h = sha256(cborEncode({ worldSeed, tick, kind, id }));
  return bytesToBigInt(h.slice(0, 8));
}
```

The worker initializes its RNG substream from this seed before computing. Two runs of the same job (same `worldSeed`, `tick`, `kind`, `id`) produce the same result, bit-for-bit. This is how AI lookahead rollouts stay reproducible.

### 2.2 Stale-result rejection

When a worker finishes, the result is stamped with `computedForTick = job.issuedAtTick`. The MAIN thread, in phase 2 of the frame loop, drains the result inbox and checks:

```typescript
function acceptResult<O>(result: JobResult<O>): boolean {
  if (result.computedForTick < scheduler.fixedTick - STALE_WINDOW_TICKS) {
    metrics.staleResults++;
    return false;  // stale — sim has moved on
  }
  if (result.outputRevision < currentRevision(result.kind)) {
    metrics.staleRevisions++;
    return false;  // input has changed since this was computed
  }
  return true;
}
```

`STALE_WINDOW_TICKS` defaults to 60 (one strategic tick). A result computed for tick 1000 arriving at tick 1100 is rejected. The job is re-issued with a fresh seed if still needed.

### 2.3 Time budgets and retry/fallback

Each job has a `budgetMs`. The worker uses `performance.now()` (permitted in workers — they are not canonical) to track elapsed time. If the budget is exceeded, the worker returns a `partial: true` result and the MAIN thread decides whether to re-issue with a larger budget or accept the partial.

If a job throws (e.g., the worker's Jolt WASM module crashed), the worker pool retries up to `retry.maxAttempts` with exponential backoff. If all retries fail, the `fallback` function runs on MAIN. The fallback is *required* on every job; the type system enforces this. A job without a fallback is a contract violation — the engine must always have a degradation path.

---

## 3. Worker communication

### 3.1 The three channels

```
┌─────────────────────────────────────────────────────────────────┐
│                    MAIN ↔ WORKER                                │
│                                                                 │
│  1. Comlink (structured clone)  ── for typed RPC, small payloads│
│  2. SharedArrayBuffer + Atomics  ── for streaming buffers,      │
│                                     ring buffers, semaphores    │
│  3. MessageChannel (postMessage) ── for transferable-only data  │
│                                     (OffscreenCanvas, ImageBitmap)│
└─────────────────────────────────────────────────────────────────┘
```

**Comlink** wraps `postMessage` with a typed RPC layer. It is the default for job submission and result return. Comlink's proxy objects are used for the `WorkerHandle` interface.

**SharedArrayBuffer (SAB)** is used for:
- The *frame ring buffer*: MAIN writes the latest sim snapshot into a SAB-backed ring; workers read it without copying.
- The *terrain tile cache*: WORLD worker writes heightmap tiles; MAIN reads them for the renderer.
- The *job queue*: a SAB-backed lock-free MPSC queue per worker; MAIN enqueues, worker dequeues.
- Atomics for synchronization: `Atomics.wait`/`notify` for the worker's sleep/wake; `Atomics.compareExchange` for queue head/tail pointers.

**MessageChannel with transferables** is used when the payload cannot be shared (e.g., `ImageBitmap`, `OffscreenCanvas`, or a fresh `ArrayBuffer` that the worker should own). Comlink handles this transparently if `transferables` is set on the Job.

### 3.2 The frame ring buffer

```typescript
/** Shared between MAIN and all workers. */
interface FrameRingBuffer {
  /** The SAB itself. */
  buffer: SharedArrayBuffer;
  /** Ring capacity (snapshots). Usually 4. */
  capacity: number;
  /** Slot size in bytes (CBOR-encoded snapshot, padded). */
  slotSize: number;
  /** Head/tail pointers (atomics). */
  head: Int32Array;  // MAIN writes
  tail: Int32Array;  // workers read
  /** Per-slot tick (Int64Array, since BigInt64Array). */
  ticks: BigInt64Array;
}

function readSnapshotAtTick(ring: FrameRingBuffer, tick: bigint): Uint8Array | null {
  // Linear scan the (small) ring for a slot whose tick <= target.
  // Return a copy of the bytes. Return null if no slot qualifies.
}
```

Workers call `readSnapshotAtTick(tick)` to get a consistent sim view without a `postMessage` round-trip. This is critical for AI lookahead: the AI worker reads the snapshot at tick N, runs 100 ticks of speculative sim, and returns the result. No copy, no blocking.

### 3.3 Atomics discipline

- `Atomics.wait` is only called from workers (MAIN must never block).
- `Atomics.notify` is called by MAIN after writing a new snapshot to the ring.
- The job queue uses `Atomics.compareExchange` for head/tail — no mutex, no ABA (single producer = MAIN).
- Worker wake-up: MAIN writes a job to the queue, then `Atomics.notify(workerWaitAddr, 1)`. The worker's `Atomics.wait` returns and it dequeues.

---

## 4. OffscreenCanvas and the renderer

### 4.1 The two modes

```
┌────────────────────────────────────────────────────────────────┐
│  MODE A: OffscreenCanvas supported (Chrome, Edge, Firefox)    │
│                                                                │
│   MAIN thread                 RENDERER worker                  │
│   ───────────                 ──────────────                   │
│   sim, input, scheduler  ──►  WebGPU/WebGL2 render             │
│   (no GPU context)            OffscreenCanvas present          │
│                                │                               │
│                                ▼                               │
│                              display compositor                │
│                                                                │
│  Benefit: MAIN never blocks on GPU; sim stays smooth          │
└────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────┐
│  MODE B: OffscreenCanvas unsupported (Safari < 16.4, etc.)    │
│                                                                │
│   MAIN thread                                                  │
│   ───────────                                                  │
│   sim, input, scheduler,                                       │
│   WebGPU/WebGL2 render (canvas on MAIN)                       │
│                                                                │
│  Benefit: works everywhere                                    │
│  Cost: GPU stalls can pause the sim; mitigated by §6 budgets  │
└────────────────────────────────────────────────────────────────┘
```

### 4.2 The renderer worker contract

In Mode A, the RENDERER worker owns the `OffscreenCanvas` and the GPU context. MAIN sends render commands via Comlink:

```typescript
interface RendererWorker {
  /** Initialize with the transferred OffscreenCanvas. */
  init(canvas: OffscreenCanvas, config: RendererConfig): Promise<void>;
  /** Submit a frame. Called once per rAF (phase 10 of MAIN's loop). */
  submitFrame(snapshot: RenderSnapshot, alpha: Fixed64, camera: CameraState): Promise<FrameStats>;
  /** Resize, change material params, hot-reload shader chunks. */
  configure(patch: Partial<RendererConfig>): Promise<void>;
  /** Read pixels back for screenshots (doc 22). */
  readPixels(rect: Rect): Promise<Uint8Array>;
  /** Shutdown. */
  destroy(): Promise<void>;
}
```

The `RenderSnapshot` is a *derived* view of the sim state, not the sim state itself. MAIN produces it during phase 7 (interpolate). The renderer never sees raw sim components; it sees GPU-ready uniforms, instanced mesh parameters, and material overrides.

### 4.3 Fallback to MAIN

If `typeof OffscreenCanvas === 'undefined'`, the engine creates the renderer *in the MAIN thread* and skips spawning the RENDERER worker. The same `RendererWorker` interface is implemented by an in-process shim; the rest of the engine is unaware. The cost: GPU stalls (shader compilation, texture uploads) can pause the sim. Mitigation: pre-compile shaders at load time (the asset pipeline produces a shader manifest), and pre-upload textures at asset-load time.

---

## 5. Cross-origin isolation

### 5.1 Why it matters

`SharedArrayBuffer` requires **cross-origin isolation**: the page must be served with `Cross-Origin-Opener-Policy: same-origin` and `Cross-Origin-Embedder-Policy: require-corp`. Without these headers, the browser disables SAB (since Spectre). The engine degrades gracefully (§5.3) but loses the frame ring buffer and the SAB-backed job queue, falling back to `postMessage` with `structuredClone`.

### 5.2 The deployment requirement

Per `AGENTS.md Part 4 §vps-server-management`: COOP+COEP requires a real server (self-hosted, not GitHub Pages). The project's deployment is a VPS with the headers set:

```
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: require-corp
Cross-Origin-Resource-Policy: same-origin
```

All sub-resources (assets, scripts, fonts) must either be same-origin or carry `Cross-Origin-Resource-Policy: cross-origin`. The asset pipeline (doc 11) stamps every asset with the correct CORP header at build time.

The engine probes for isolation at startup:

```typescript
function isCrossOriginIsolated(): boolean {
  return typeof SharedArrayBuffer !== 'undefined' &&
         (crossOriginIsolated ?? false);
}
```

If false, the engine logs a warning, sets `engine.sabAvailable = false`, and switches to the non-SAB code paths. The sim is still deterministic; the cost is higher `postMessage` traffic and one extra copy per snapshot.

### 5.3 Fallback for non-isolated contexts

| Feature | Isolated (SAB) | Non-isolated (fallback) |
|---|---|---|
| Frame ring buffer | SAB-backed; zero-copy reads | `postMessage` per snapshot; structured clone |
| Job queue | SAB-backed MPSC | Comlink over `postMessage`; one round-trip per job |
| Atomics sync | `wait`/`notify` | Comlink promise resolution |
| Terrain tile cache | SAB-backed; worker writes, MAIN reads | `postMessage` transfer of `ArrayBuffer` (move semantics) |
| Renderer | OffscreenCanvas in RENDERER worker | OffscreenCanvas in RENDERER worker (still works; SAB not required for OC) — or canvas on MAIN if OC also unsupported |

The fallback is *correct but slower*. The determinism contract is preserved because all paths stamp results with `computedForTick` and apply stale-rejection.

---

## 6. The revision system

### 6.1 The problem

Terrain and destructible geometry change during play. A cultivator's Burning Palm (doc 32) scorches a hillside. A flood carves a new riverbed. A sect war razes a village. The terrain worker must recompute the affected tiles without blocking the sim, and the renderer must not display a half-recomputed tile.

### 6.2 The revision number

Every *mutable world artifact* (terrain tile, destructible mesh, baked lightmap, pathfinding navmesh) carries a `revision: bigint`. The revision is monotonic per artifact. When the sim mutates the artifact's source data (e.g., a `TerrainDeformation` event), the sim increments the *input revision* for that artifact and enqueues a recompute job.

```typescript
interface Revisioned<T> {
  /** The artifact's identity (e.g., 'terrain.tile.42.17'). */
  id: string;
  /** The current revision of the source data. */
  inputRevision: bigint;
  /** The revision of the last computed output. */
  outputRevision: bigint;
  /** The output (mesh, heightmap, etc.). Null if never computed. */
  output: T | null;
  /** The job currently recomputing this, if any. */
  pendingJob: string | null;
}

interface RevisionRegistry {
  /** Get the current input revision for an artifact. */
  getInput(id: string): bigint;
  /** Increment the input revision. Called by sim systems on mutation. */
  bumpInput(id: string, mutation: MutationSpec): bigint;
  /** Get the latest output whose revision matches the input. */
  getOutput(id: string): { revision: bigint; output: unknown } | null;
  /** True if the output matches the input (no recompute pending). */
  isCurrent(id: string): boolean;
}
```

### 6.3 The recompute flow

```
Sim mutates terrain tile 42,17
  → sim calls registry.bumpInput('terrain.tile.42.17', { kind: 'scorch', ... })
  → registry increments inputRevision: 12 → 13
  → registry enqueues Job { kind: 'terrain.recompute', input: tile_42_17_state, inputRevision: 13 }
  → WORLD worker accepts job, computes new heightmap, returns JobResult { outputRevision: 13, ... }
  → MAIN drains inbox, accepts result (outputRevision >= inputRevision), updates output
  → Renderer reads new output next frame

Meanwhile:
  → Sim continues running; tile 42,17 renders with outputRevision: 12 (one revision stale)
  → This is acceptable — the player sees a 16 ms visual lag on terrain changes
  → If the sim mutates again before the worker finishes, inputRevision: 13 → 14
  → When the worker's result (revision 13) arrives, it's rejected: outputRevision (13) < inputRevision (14)
  → A new job is enqueued for revision 14
```

### 6.4 Why this preserves determinism

The sim never *reads* the worker's output. The sim reads only its own source data (the `inputRevision`'s state). The worker's output is consumed by the *renderer*, which is non-canonical. Two runs of the same sim produce the same sequence of `bumpInput` calls; the worker's outputs may arrive at slightly different times (worker scheduling jitter), but the sequence of accepted outputs is deterministic because acceptance is keyed on revision numbers, not arrival order.

---

## 7. Failure cases and recovery

| Failure | Detection | Recovery |
|---|---|---|
| Worker crashes (OOM, uncaught exception) | Watchdog ping every 100 ms; missed 3 pings = dead | Restart worker; re-enqueue all jobs that were in-flight; log `WorkerCrash` event with stack |
| Worker stalls (long job) | Job `budgetMs` exceeded | Worker returns `partial: true`; MAIN retries with larger budget or accepts partial |
| SAB unavailable | Startup probe | Switch to `postMessage` fallback (§5.3); log performance warning |
| OffscreenCanvas unsupported | Startup probe | Renderer runs on MAIN (§4.3) |
| COOP/COEP not set | Startup probe | Engine runs in non-isolated mode; alert if deployment is supposed to be isolated |
| Stale results flooding MAIN | `metrics.staleResults > threshold` | Increase `STALE_WINDOW_TICKS`; throttle job issuance |
| Revision storm (many mutations) | `metrics.pendingRecompute > threshold` | Coalesce adjacent tile mutations into a single recompute job |
| Job queue overflow | SAB queue head/tail collision | Backpressure: MAIN pauses issuing jobs for one frame; workers drain |

### 7.1 The watchdog

Each worker is pinged every 100 ms by the MAIN thread. If a ping is not answered within 500 ms, the worker is considered stalled. If three consecutive pings fail, the worker is considered dead and is restarted. On restart, the worker's revision registry is rebuilt from MAIN's authoritative registry (workers are stateless w.r.t. revisions — they only carry the current job's input).

### 7.2 Cancellation

Jobs carry a `CancellationToken`. MAIN can cancel by issuing a `CancelJob` message with the token. The worker checks the token at every iteration of its inner loop and aborts if set. Cancellation is best-effort: a job that is already past its checkpoint will complete and its result will be rejected as stale. Cancellation is *not* a determinism violation — the cancelled job's seed is never re-used; if the work is needed again, a new job with a new seed (same `jobSeed` derivation, new `id`) is issued.

---

## 8. 16 questions answered

1. **What is this system?** The job system: six worker types, a typed `Job` interface, Comlink+SAB+Atomics communication, and a revision system for mutable world artifacts.

2. **What problem does it solve?** The browser gives the engine real parallelism (workers, SAB) but the sim must stay single-threaded and deterministic. The job system lets workers compute *derived* artifacts in parallel without ever touching the canonical sim state.

3. **Core abstractions?** `WorkerType`, `WorkerHandle`, `Job<I,O>`, `JobResult<O>`, `CancellationToken`, `FrameRingBuffer`, `RevisionRegistry`, `Revisioned<T>`.

4. **Data flow?** MAIN issues Job → Comlink transfer to worker → worker checks inputRevision → worker computes with deterministic seed → worker returns JobResult stamped with tick+revision → MAIN phase-2 drain → accept iff not stale → renderer reads updated output.

5. **Lifecycle?** Workers spawn at engine init (`initWorker(type)`); warm up (load WASM modules, prime caches); run until `shutdown()` drains their queues. MAIN's watchdog pings every 100 ms.

6. **Invariants?** (a) Sim never blocks on a worker. (b) Sim never reads worker output directly. (c) Every job has a deterministic seed. (d) Every job has a fallback. (e) Stale results are rejected, not applied. (f) Workers are revision-stateless — restartable from MAIN's registry.

7. **Inputs?** Jobs from MAIN (via Comlink or SAB queue), sim snapshots from the frame ring buffer, asset bytes from the asset worker.

8. **Outputs?** `JobResult<O>` for each completed job, transferred back to MAIN. Rendered frames from the RENDERER worker (Mode A) or MAIN (Mode B).

9. **Failure modes?** Worker crash (restart + re-enqueue), stall (budget+retry), SAB unavailable (fallback), OC unsupported (MAIN renderer), stale flooding (throttle), revision storm (coalesce), queue overflow (backpressure).

10. **Performance budget?** Job overhead < 0.5 ms per submit+drain. SAB snapshot read < 0.1 ms. AI lookahead: 4 ms per rollout. Terrain recompute: 8 ms per tile. Mesh LOD: 2 ms per instance. Persistence checkpoint: 4 ms (amortized).

11. **Test requirements?** Deterministic seed parity (same job → same output across browsers), stale-rejection correctness, revision coalescing, worker restart re-enqueue, COOP/COEP fallback path, OffscreenCanvas fallback path, cancellation propagation, budget enforcement.

12. **Extension points?** Plugins declare `worker: WorkerType` on their systems; the scheduler routes them. New worker types require a core-engine change (the six are closed). New job kinds are plugin-defined; the worker dispatches by `kind`.

13. **Security/isolation?** Workers are same-origin (no cross-origin worker scripts). SAB requires COOP+COEP. Worker code is content-addressed (hash-verified at load, doc 17 §9.3). Workers cannot postMessage to non-engine origins.

14. **Rejected alternatives?** (a) Single-threaded everything — too slow; AI lookahead and terrain recompute would block the sim. (b) WebGPU compute shaders for sim — GPU is not canonical (float drift), and compute shaders cannot write back to sim state deterministically. (c) Service Workers — wrong abstraction; they are for offline caching, not parallel compute. (d) Atomics over plain postMessage without Comlink — too error-prone; Comlid's typed RPC is worth the abstraction. (e) Worker-per-plugin — too many workers (plugin count is unbounded); the six-type closed set is simpler and matches the actual parallelism axes.

15. **Dependencies?** Depends on `ga:determinism` (RNG, CBOR), `ga:core`, `07_SCHEDULER` (tick stamping). Depended on by the renderer (Mode A), the AI system (lookahead), the terrain system (revisions), the asset pipeline (async loads), the save system (parallel compaction).

16. **What this enables?** Parallel AI lookahead without sim stalls, terrain and destructible-geometry recompute without frame hitches, GPU offload via OffscreenCanvas, parallel save compaction, and the revision system that lets the world be mutable without breaking determinism.

---

## 9. Test requirements (detailed)

### 9.1 Deterministic seed parity

For 1000 randomly generated jobs, run each on three browsers (Chrome, Firefox, Safari) and assert byte-identical outputs. The job seed derivation must produce the same `bigint` across browsers.

### 9.2 Stale-rejection

Submit a job at tick 100 with `deadlineTick: 110`. Delay the worker's response until tick 120. Assert the result is rejected and `metrics.staleResults` increments. Assert no sim state is mutated.

### 9.3 Revision coalescing

Issue 10 `bumpInput` calls on the same tile within one fixed tick. Assert only one recompute job is enqueued (revision 1 → 11 in one step). Assert the worker computes revision 11 and the output matches.

### 9.4 Worker restart re-enqueue

Kill a worker mid-job (simulate crash). Assert the watchdog detects it within 500 ms, restarts the worker, and re-enqueues the in-flight job. Assert the re-enqueued job has the same seed and produces the same output.

### 9.5 COOP/COEP fallback

Run the engine in a non-isolated context. Assert `engine.sabAvailable === false`, the frame ring buffer falls back to `postMessage`, and the sim still produces deterministic checkpoints.

### 9.6 OffscreenCanvas fallback

Run on a browser without OffscreenCanvas. Assert the renderer runs on MAIN, the same `RendererWorker` interface is used, and screenshots still work.

### 9.7 Cancellation propagation

Submit a long job, cancel it after 1 ms. Assert the worker aborts within one iteration of its inner loop (≤ 1 ms) and the result is `null`. Assert no partial state is written.

### 9.8 Budget enforcement

Submit a job with `budgetMs: 5` whose natural runtime is 20 ms. Assert the worker returns `partial: true` after 5 ms and the MAIN thread's retry policy fires.

---

## 10. Rejected alternatives (summary)

- **WebGPU compute for sim logic.** GPU is non-canonical. Compute shaders are for rendering-derived work (GPU-driven culling, particle sim), never for sim state.
- **Service workers.** Wrong scope. Service workers are for offline + push; they cannot share SAB with the page and they outlive the tab.
- **Per-plugin workers.** Unbounded. A plugin-heavy world (doc 17 §1.4 lists 8 core + many non-core plugins) would spawn 20+ workers. The six-type closed set matches the actual axes: world-state, mesh, AI, asset, persistence, render.
- **Async/await on MAIN for all parallel work.** Would block the rAF callback. Rejected.
- **Atomics over plain postMessage.** Comlink's typed RPC + transferables + SAB-coexistence is the right level of abstraction; raw Atomics is error-prone (deadlocks, lost wake-ups).
- **SharedArrayBuffer for everything.** Some payloads (ImageBitmap, OffscreenCanvas) cannot be shared. The three-channel design (Comlid + SAB + transferables) covers all cases.

---

## 11. What this document enables

- **Parallel AI lookahead** lets the AI system (doc 22) run speculative rollouts without stalling the sim.
- **Terrain and destructible-geometry recompute** (the revision system, §6) lets the world be mutable — Burning Palm scorches, floods carve, sect wars raze — without frame hitches or determinism breaks.
- **OffscreenCanvas** moves the GPU off the sim thread, so shader compilation and texture uploads never pause the gameplay loop.
- **The cross-origin-isolation story** makes the deployment requirement explicit (COOP+COEP, self-hosted VPS) and provides a graceful fallback for non-isolated contexts.
- **The revision system** is the substrate for the save system's incremental checkpointing (doc 11) and the streaming system's tier transitions (doc 12).

The job system is the engine's answer to "the browser is single-threaded for simulation." It is not: it is single-threaded for *canonical state*, and the job system exploits every other parallel axis the browser offers without breaking the determinism contract.
