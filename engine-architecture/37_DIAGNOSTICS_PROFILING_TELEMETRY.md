# 37 — Diagnostics, Profiling & Telemetry

**Status:** Architecture. The observability stack for the engine.
**Date:** 2026-08-03

---

## 0. What this document is

An engine whose defining feature is determinism (doc 17 §3) needs observability that can answer, with byte-level precision, "why did this run diverge?" The diagnostics stack is that observability. It has four layers — logging, metrics, tracing, profiling — plus two debuggers unique to this engine: the determinism divergence finder and the replay debugger. There is also crash reporting and the instrumentation hooks that let any plugin participate.

The doctrine (AGENTS.md Part 3) says: "Cite the precedent." The precedents here are: Chrome DevTools Performance panel (flame graph), OpenTelemetry (structured logs + traces), and the unique-to-this-engine determinism harness (the `7fde855...` hash on the determinism page). The browser already has good profiling tools; this stack does not reimplement them, it complements them with the determinism-specific layer the browser cannot provide.

---

## 1. The 16 questions

### 1.1 Logging (structured, leveled, searchable)

Logs are structured records, not strings. Every log entry is a CBOR-serializable record with a level, a source, a tick, and a payload. The log sink is a ring buffer in memory (default 100k entries) with optional persistence to OPFS for crash forensics.

```typescript
type LogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal';

interface LogEntry {
  ts: number;                    // engine tick, not wall clock (deterministic)
  level: LogLevel;
  source: { pluginId: string; system?: string; entity?: number };
  message: string;               // human-readable
  fields: Record<string, unknown>;  // structured, CBOR-serializable
  // The checkpoint hash at the time of the log, for correlation with the
  // determinism divergence finder
  checkpointHash?: string;
}

interface Logger {
  trace(message: string, fields?: Record<string, unknown>): void;
  debug(message: string, fields?: Record<string, unknown>): void;
  info(message: string, fields?: Record<string, unknown>): void;
  warn(message: string, fields?: Record<string, unknown>): void;
  error(message: string, fields?: Record<string, unknown>): void;
  fatal(message: string, fields?: Record<string, unknown>): void;
  // Scoped logger — adds the source fields automatically
  scoped(scope: Partial<LogEntry['source']>): Logger;
}
```

Logs are searchable in the editor shell's log view. The view supports filtering by level, by plugin, by tick range, and by structured field query (e.g. `fields.entityId = 1234`). The search is over the in-memory ring buffer; for older logs, the persisted OPFS log is searchable by loading the file.

Logs are **deterministic by construction**: every field is CBOR-serializable, the timestamp is the engine tick (not wall clock), and the checkpoint hash lets a log entry be correlated to a save. Two runs with the same seed + inputs produce identical logs.

### 1.2 Metrics (frame time, sim time, render time, memory, entity count, draw calls)

Metrics are numeric time series, sampled per frame. The metrics collector is the runtime backing for the profiler (doc 36 §1.11) and the budget enforcer (doc 39 §5).

```typescript
interface FrameMetrics {
  tick: number;
  frameTimeMs: number;           // total, wall clock
  breakdown: {
    input: number;
    sim: number;                 // sum of all sim systems
    physics: number;
    render: number;              // sum of all render passes
    gc: number;                  // estimated GC pause
  };
  memory: {
    canonical: number;           // bytes, the world state slice
    presentation: number;        // bytes, render-only state (meshes, textures)
    gpu: number;                 // bytes, GPU memory (estimated)
    jsHeap: number;              // bytes, performance.memory.usedJSHeapSize
  };
  entities: { s4: number; s3: number; s2: number; s1: number; s0: number };
  drawCalls: number;
  triangles: number;
  // The checkpoint hash delta for this frame
  hashChanged: boolean;
}
```

The metrics collector samples every frame and keeps a rolling 60-second window (3600 samples at 60fps) in a ring buffer. Longer windows are downsampled to 1Hz and persisted to OPFS. The metrics are the input to the budget enforcer — if `frameTimeMs` exceeds the budget (doc 39 §1) for N consecutive frames, the enforcer triggers.

### 1.3 Tracing (per-system execution traces)

Tracing is finer than metrics: it captures per-system execution with begin/end markers and hierarchical spans. Traces are exported in the Chrome Trace Event format (JSON) so they can be opened in `chrome://tracing` or the DevTools Performance panel.

```typescript
interface TraceSpan {
  name: string;                  // 'ga:npc-simulator.schedule-system'
  cat: 'sim' | 'render' | 'asset' | 'io';
  ph: 'B' | 'E' | 'X';           // begin, end, complete (begin+end with dur)
  ts: number;                    // microseconds, wall clock (traces are not deterministic)
  dur?: number;
  pid: number;                   // 0 = main, 1..N = workers
  tid: number;                   // thread id
  args?: Record<string, unknown>;
}

interface Tracer {
  beginSpan(name: string, cat: TraceSpan['cat'], args?: Record<string, unknown>): TraceSpanHandle;
  endSpan(handle: TraceSpanHandle, args?: Record<string, unknown>): void;
  // Flush the trace buffer to a downloadable JSON file
  flush(): string;               // JSON in chrome://tracing format
}
```

Traces are wall-clock, not deterministic — they measure *how long* things took, not *what* they produced. This is intentional: tracing is a performance tool, not a determinism tool. The determinism tool is the divergence finder (§1.6).

Tracing is opt-in. When enabled, every `registerSystem` call is wrapped in a span. Plugins can add nested spans for finer detail. The trace buffer is bounded (default 64 MiB); when full, the oldest spans are dropped.

### 1.4 Profiling (CPU/GPU frame analyzer)

The profiler (doc 36 §1.11) is the editor view over metrics + traces. The CPU side uses the trace spans (§1.3). The GPU side uses WebGPU's timestamp queries (where available) and falls back to per-pass wall-clock timing where not.

```typescript
interface GpuProfile {
  pass: string;                  // 'shadow' | 'opaque' | 'water' | ...
  gpuTimeMs: number;             // from timestamp query, if available
  wallTimeMs: number;            // fallback
  drawCalls: number;
  triangles: number;
  // Per-bind-group allocation cost (useful for spotting over-binding)
  bindGroups: number;
  // Per-pipeline barrier count (useful for spotting pipeline thrash)
  barriers: number;
}
```

GPU timestamp queries have a known quantization floor (typically 1µs on desktop, higher on mobile) and are not available in all browsers (Safari lagged until late 2026). Where unavailable, the profiler surfaces wall-clock timing with a "GPU timing unavailable" badge and does not pretend to precision it does not have.

### 1.5 Crash reports

When the engine crashes — an uncaught exception in a system, a Worker termination, a WebGPU device loss — the crash reporter captures:

```typescript
interface CrashReport {
  ts: string;                    // ISO timestamp (wall clock — crash reports are not deterministic)
  engineFingerprint: DeterminismFingerprint;
  loadedMods: { modId: string; version: string; contentHash: string }[];
  tick: number;                  // the engine tick at crash
  lastCheckpointHash: string;    // the last successful checkpoint
  exception: {
    message: string;
    stack: string;
    pluginId?: string;
    system?: string;
  };
  metrics: FrameMetrics;         // the last frame's metrics
  logTail: LogEntry[];           // last 100 log entries
  // The input log up to the crash — so the crash is reproducible
  inputLog: InputLogEntry[];
}
```

Crash reports are persisted to OPFS and offered for upload to a first-party crash collection endpoint (with user consent). The report is sufficient to reproduce the crash: load the fingerprint, install the mods, replay the input log. The determinism contract is what makes crash reports *reproducible* — a non-deterministic engine's crash report is just a stack trace; ours is a full reproduction recipe.

### 1.6 The determinism divergence debugger

The divergence debugger is the engine's distinctive tool. When two runs of the same seed + inputs produce different hashes, this tool finds the first diverging byte. It is a separate process from the profiler and the tracer — it does not measure time, it measures *state*.

```typescript
interface DivergenceFinder {
  // Two save logs: tick-by-tick state hashes, plus serialized state at intervals
  runA: SaveLog;
  runB: SaveLog;
  find(): DivergenceReport;
}

interface SaveLog {
  seed: string;
  fingerprint: DeterminismFingerprint;
  inputLog: InputLogEntry[];
  // Hashes at every tick (cheap) and serialized state at intervals (expensive)
  tickHashes: string[];
  // Serialized state at every Nth tick (default N=100)
  serializedStates: { tick: number; cbor: Uint8Array }[];
}

interface DivergenceReport {
  firstDivergingTick: number;
  // The plugin slice that diverged at that tick
  pluginId: string;
  // The path to the first differing field within the slice
  fieldPath: string[];
  valueA: unknown;
  valueB: unknown;
  // The system that ran at that tick and could have written to that field
  suspectedSystems: string[];
  // The last matching checkpoint (for the replay debugger to start from)
  lastMatchingCheckpoint: number;
}
```

The algorithm:

1. **Tick-range binary search.** Compare `tickHashes` between runs. Binary-search for the first tick where the hashes differ. This narrows the divergence to one tick.
2. **Slice-level diff.** At the diverging tick, find the nearest serialized state (within N ticks). Re-run from the last matching serialized state to the diverging tick, capturing per-system state before and after each system. Diff the per-system state to find which system's slice changed.
3. **Field-level diff.** Within the diverging slice, walk the CBOR bytewise to find the first differing byte. Map that byte to a field path via the slice's schema.

The result is a report that says: "At tick 12345, the `ga:npc-simulator` slice diverged. The first differing field is `npcs[7].schedule.currentTask`. Run A has `'sleep'`, run B has `'eat'`. The suspected system is `ga:npc-simulator.schedule-system`." The replay debugger (§1.7) can then take the designer to that tick and let them step through.

### 1.7 The replay debugger (step through the input log)

The replay debugger takes a save log and lets the designer step through it: forward by tick, forward by system, backward by checkpoint. It is the engine's "DVR."

```typescript
interface ReplayDebugger {
  loadLog(log: SaveLog): void;
  // Step forward by N ticks, replaying the input log
  step(ticks: number): void;
  // Step forward by one system, capturing state before and after
  stepSystem(): { system: string; before: unknown; after: unknown };
  // Jump to the nearest checkpoint at or before tick T
  jumpTo(tick: number): void;
  // Inspect any plugin's state at the current tick
  inspect(pluginId: string): unknown;
  // The current tick and hash (must match the log)
  current(): { tick: number; hash: string };
}
```

The replay debugger is deterministic: stepping forward always produces the same state, because the input log is fixed and the engine is deterministic. This is the load-bearing property — a non-deterministic engine cannot have a replay debugger, only a "best-effort reenactment."

The replay debugger is the partner of the divergence finder: the finder tells you *where* the divergence happened; the replay lets you *watch it happen* tick by tick.

### 1.8 Performance instrumentation hooks

Plugins instrument themselves through two hooks:

```typescript
interface InstrumentationHooks {
  // Register a metric (sampled per frame)
  metric(name: string, value: number): void;
  // Begin/end a trace span (only active when tracing is enabled)
  span(name: string, cat: 'sim' | 'render' | 'asset' | 'io'): SpanHandle;
}
```

These are exposed on the `PluginHost` (and the `SandboxedHost` for mods). The hooks are no-ops when instrumentation is disabled, so production builds pay no cost. When enabled, the metric/span is routed to the metrics collector (§1.2) and the tracer (§1.3).

### 1.9 How are logs, metrics, traces, and profiles related?

```
┌─────────────────────────────────────────────────────────────┐
│                     Editor Shell                              │
│   ┌────────────┐  ┌────────────┐  ┌──────────────────────┐   │
│   │ Log View   │  │ Profiler   │  │ Divergence Debugger  │   │
│   │ (filter)   │  │ (flame)    │  │ (byte-level diff)    │   │
│   └─────┬──────┘  └─────┬──────┘  └──────────┬───────────┘   │
│         │                │                     │               │
│   ┌─────▼──────┐  ┌─────▼──────┐  ┌──────────▼───────────┐   │
│   │ Log Ring   │  │ Metrics +  │  │ Save Log (tick hashes │   │
│   │ Buffer     │  │ Trace Buf. │  │ + serialized states)  │   │
│   └─────┬──────┘  └─────┬──────┘  └──────────┬───────────┘   │
│         │                │                     │               │
│         └────────────────┴─────────────────────┘               │
│                          │                                     │
│                   ┌──────▼──────┐                              │
│                   │ Plugin Host  │  (every plugin emits here) │
│                   └─────────────┘                              │
└─────────────────────────────────────────────────────────────┘
```

The four layers share the engine tick as their common key. A log entry, a metric sample, a trace span, and a save-log entry at tick T can all be correlated. The `checkpointHash` field on a log entry ties it to a save; the `tick` field on a metric ties it to a log; the `args.tick` on a trace span ties it to both. This correlation is what makes the divergence debugger work: it can show you the metric spike, the log warning, and the trace span at the diverging tick, all at once.

### 1.10 What is sampled always vs opt-in?

| Layer | Always on | Opt-in |
|---|---|---|
| Logging | warn+ level, ring buffer 100k | trace/debug level, OPFS persistence |
| Metrics | Frame metrics, 60s ring buffer | Long-window 1Hz sampling to OPFS |
| Tracing | Off by default (cost) | On, with bounded 64 MiB buffer |
| Profiling | Off by default | On, GPU timestamp queries where available |
| Save log | Off by default (cost — serializing every 100th tick) | On, with configurable interval |
| Crash reports | Always captured to OPFS | Upload to first-party endpoint (opt-in) |

The defaults are conservative: the engine runs at full speed in production with only warn+ logging and frame metrics. The expensive layers (tracing, save log) are enabled when the designer is debugging.

### 1.11 How is telemetry shipped off-device?

Telemetry is opt-in and two-tier:

- **Crash reports.** Uploaded to the first-party crash endpoint with user consent. The report is a complete reproduction recipe (§1.5). No PII is included; the user's profile ID is a random UUID generated at first launch.
- **Anonymous performance telemetry.** Frame metrics, downsampled to 1Hz, uploaded in batches. Includes: engine fingerprint, hardware tier (doc 39 §6), frame time percentiles, entity counts by tier, draw calls. No state, no inputs, no save data.

Both are disabled by default. The first-launch dialog asks the user to opt in, with a clear explanation of what is sent.

### 1.12 How does the determinism enforcer use diagnostics?

The determinism enforcer (doc 17 §3.2) in dev mode throws on forbidden function calls. The throw is a `DeterminismViolation` exception with the violating call, the plugin, and the system. The exception is routed to the log as `fatal` and to the crash reporter. In production, the enforcer is a no-op but the periodic checkpoint comparison (§1.13) catches divergence post hoc.

### 1.13 How is divergence caught in production?

In production, the engine periodically (default: every 1000 ticks) re-runs the last 1000 ticks in a headless worker from the last checkpoint, with the same input log, and compares the resulting hash to the live hash. If they differ, the engine:

1. Logs a `fatal` divergence event with the tick range.
2. Snapshots a save log for the divergence debugger.
3. Surfaces a non-blocking warning to the user: "A determinism divergence was detected. The save log has been captured. Please report this."

This is the production safety net. It does not throw (the game continues) but it does not silently swallow the divergence either.

### 1.14 How are workers instrumented?

Worker threads (the headless sim, the determinism verification worker, the asset decoder) emit their own logs, metrics, and traces over a `MessagePort`. The main thread aggregates them into the same ring buffers, tagged with `pid` (the worker's index). The trace exporter uses the Chrome Trace Event `pid` field to separate workers in the flame graph.

### 1.15 How is the diagnostics stack itself tested?

The diagnostics stack is itself subject to the determinism contract: the log records are CBOR-serializable, the metrics are numeric, the save log is hashable. The test suite (doc 38 §3) includes a "diagnostics determinism" test: two runs with the same seed + inputs produce identical logs (modulo wall-clock timestamps in trace spans, which are explicitly non-deterministic and tagged as such).

### 1.16 What is the overhead?

| Layer | Production (default) | With everything on |
|---|---|---|
| Logging | <0.1ms/frame (warn+ ring buffer) | ~0.3ms/frame (trace+ + OPFS flush) |
| Metrics | <0.05ms/frame (per-frame sample) | ~0.1ms/frame (with 1Hz OPFS write) |
| Tracing | 0 (off) | ~0.5-1ms/frame (span overhead) |
| Save log | 0 (off) | ~2-5ms/frame (every-100th-tick serialize) |
| Crash reports | 0 (no crash) | N/A (only on crash) |

The save log is the most expensive layer by far, which is why it is off by default. The designer turns it on when reproducing a divergence, then turns it off.

---

## 2. The divergence-finding pipeline

```
Run A (Chrome)        Run B (Firefox)         CI baseline
     │                      │                      │
     ▼                      ▼                      ▼
 SaveLog A              SaveLog B              SaveLog baseline
 (tick hashes +        (tick hashes +         (tick hashes +
  serialized states)    serialized states)    serialized states)
     │                      │                      │
     └──────────┬───────────┘                      │
                ▼                                  │
       DivergenceFinder.find()                     │
                │                                  │
                ▼                                  │
       DivergenceReport                            │
       (firstDivergingTick: 12345,                 │
        pluginId: 'ga:npc-simulator',              │
        fieldPath: ['npcs', 7, 'schedule',         │
                   'currentTask'],                  │
        valueA: 'sleep', valueB: 'eat')            │
                │                                  │
                ▼                                  │
       ReplayDebugger.loadLog(SaveLog A)           │
       ReplayDebugger.jumpTo(12300)                │
       ReplayDebugger.step(45)                     │
       → watch the schedule system run             │
       → confirm the field divergence              │
```

This pipeline is the load-bearing argument for the entire determinism stack. Without it, "determinism" is a claim; with it, determinism is a debuggable property.

---

## 3. Failure cases

| Failure | Detection | Recovery | User sees |
|---|---|---|---|
| Log ring buffer overflow | Buffer cap | Drop oldest | (silent — ring buffer is the design) |
| OPFS persistence fails (quota) | Storage exception | Drop persistence, keep ring buffer | Warning toast: "Logs cannot be persisted. OPFS full." |
| Metric sample exceeds frame | Ring buffer cap | Drop oldest | (silent) |
| Trace buffer overflow | Buffer cap | Drop oldest spans | (silent — buffer is bounded by design) |
| GPU timestamp query unsupported | WebGPU feature check | Fallback to wall-clock | Badge in profiler: "GPU timing unavailable" |
| Crash report too large for OPFS | Size check | Truncate log tail, keep exception | Warning in crash dialog |
| Divergence finder cannot find divergence in tick budget | Tick limit reached | Stop, report partial | "Divergence not found in first 10000 ticks. Increase limit?" |
| Save log serialization fails | CBOR encode error | Stop save log, log error | "Save log disabled: serialization error in plugin X." |
| Worker instrumentation message port closes | MessagePort close event | Mark worker as uninstrumented | Warning in log view: "Worker 2 instrumentation lost." |
| Production divergence detected | Periodic checkpoint comparison | Snapshot save log, warn user | Non-blocking toast: "Divergence detected. Save log captured." |
| Telemetry upload fails | Network error | Retry with backoff, drop after N | (silent — telemetry is best-effort) |

---

## 4. Rejected alternatives

- **String-based logging (console.log).** Rejected: strings are not searchable by structured field, not CBOR-serializable, not part of the determinism contract. Structured logs are a small upfront cost for a large downstream payoff.

- **Wall-clock timestamps on log entries.** Rejected: the engine tick is the deterministic time. Wall-clock timestamps would make logs non-reproducible and break the divergence debugger's correlation. Trace spans use wall-clock because they measure *duration*, not state — a deliberate split.

- **Sampling-based profiling only.** Rejected: sampling profilers (the browser's built-in) are good for hotspots but cannot attribute cost to a specific system in a specific frame. The system-boundary instrumentation is cheap and answers the question "which plugin cost what."

- **A custom trace format.** Rejected: the Chrome Trace Event format is open, well-documented, and viewable in `chrome://tracing` and the DevTools Performance panel. Reusing it saves the cost of a custom viewer.

- **Always-on save log.** Rejected: serializing every 100th tick costs 2-5ms/frame, which is a meaningful chunk of the frame budget (doc 39 §1). The save log is a debugging tool, not a production cost.

- **Telemetry on by default.** Rejected: the doctrine (AGENTS.md Part 3) says "confront the central tension directly." The tension here is "we want crash data to improve the engine" vs "the user's save data is sacred." The resolution: crash reports are opt-in, telemetry is opt-in, no save data is ever sent without explicit user action.

- **Using `performance.now()` in simulation logic.** Rejected: this is forbidden by the determinism contract (doc 17 §3.1). `performance.now()` is fine for trace spans (they measure duration) but never for simulation decisions.

- **Reimplementing the divergence finder in native code.** Rejected: the finder runs in JS, in a Web Worker, on the same engine it is debugging. Reimplementing it in WASM or native would mean maintaining a second implementation of the state-diff logic, which is a maintenance cost and a determinism risk (the finder itself must be deterministic).

---

## 5. What this document enables

A diagnostics stack where:
- Every log entry is structured, deterministic, and correlated to a checkpoint hash.
- Every frame's cost is attributable to a plugin, a system, and a render pass.
- Every crash is reproducible from its report (fingerprint + mods + input log).
- Every divergence between two runs is findable to the byte, the system, and the field.
- Every replay is a deterministic step-through, not a best-effort reenactment.
- Every plugin can instrument itself through two cheap hooks.
- The engine in production runs at full speed, with the expensive layers off until they are needed.

The next steps:
1. Implement the structured logger and the ring buffer (the smallest useful piece).
2. Implement the per-frame metrics collector and the 60-second ring buffer.
3. Implement the save log (off by default) and the divergence finder.
4. Wire the replay debugger to the existing determinism harness (the `7fde855...` page is its first user).
5. Add the periodic production divergence check (the safety net).
