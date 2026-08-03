# 07 — Scheduler, Frame Loop, and Time Domains

**Status:** Foundation architecture. Specifies how the engine keeps a 35 FPS player and a 144 FPS player on the same simulated world line.
**Date:** 2026-08-03
**Engine:** Grand Architect (browser-native plugin host, deterministic contract)
**Depends on:** `ga:determinism` (RNG, transcendentals, fixed-point, CBOR, SHA-256 — doc 17 §3), `ga:core` (PluginHost — doc 17 §1)
**Read with:** `00_FOUNDATIONAL_DECISIONS §TIME-DOMAIN` (non-uniform time rates forbidden to form closed timelike curves), `21_PHYSICS_ENGINE` (Jolt wrapper), `49_CONTENT_ARCHITECTURE §4` (NPC sim record and S0–S4 tiers)

---

## 0. What this document is

The scheduler is the engine's heartbeat. It owns five distinct clocks, a 12-step frame loop, and the contract that **simulation state is a pure function of (seed, tick, inputLog) — never of display refresh rate**. This document specifies the five timing domains, the frame loop's twelve phases, the fixed-timestep algorithm that produces identical ticks on a 35 Hz panel and a 144 Hz panel, the interpolation layer that smooths the renderer between sim ticks, and the frame budget allocation that holds the project's 16.6 ms / 60 Hz target on mid-tier laptops.

The central claim — that two players on different display hardware experience the *same* outcomes — is the doctrine's central tension (AGENTS.md Part 3): the determinism contract forbids frame-rate coupling; the genre's combat feel demands frame-perfect responsiveness. The architecture resolves it by separating the simulation clock (fixed, authoritative, deterministic) from the render clock (variable, smooth, non-authoritative).

---

## 1. The five timing domains

The engine never has "one clock." It has five. Each domain advances at its own rate, has its own monotonic counter, and is the canonical time source for one class of system. Mixing domains is a contract violation caught by the determinism enforcer in dev mode.

```
┌────────────────────────────────────────────────────────────────────┐
│                       TIME DOMAINS                                 │
├──────────────────────┬─────────────┬──────────────┬───────────────┤
│ Domain               │ Unit        │ Rate         │ Used by       │
├──────────────────────┼─────────────┼──────────────┼───────────────┤
│ REAL TIME            │ ms (double) │ wall clock   │ profiling,    │
│                      │             │              │ input latency │
│                      │             │              │ measurement   │
├──────────────────────┼─────────────┼──────────────┼───────────────┤
│ RENDER TIME          │ frameIndex  │ display Hz   │ interpolation │
│                      │ (uint64)    │ (35–240)     │ animation     │
│                      │             │              │ tweening      │
├──────────────────────┼─────────────┼──────────────┼───────────────┤
│ FIXED GAME TIME      │ tick (u64)  │ 60 Hz fixed  │ NPC sim, qi,  │
│                      │             │ (16.6 ms)    │ combat, AI,   │
│                      │             │              │ economy       │
├──────────────────────┼─────────────┼──────────────┼───────────────┤
│ STRATEGIC TIME       │ tick (u64)  │ 1 Hz fixed   │ season        │
│                      │             │ (1000 ms)    │ advancement,  │
│                      │             │              │ demography,   │
│                      │             │              │ tier demo-    │
│                      │             │              │ tion/promo    │
├──────────────────────┼─────────────┼──────────────┼───────────────┤
│ HISTORICAL TIME      │ day (u64)   │ event-driven │ chronicle,    │
│                      │             │ (advance on  │ genealogy,    │
│                      │             │ save/branch) │ ancestor      │
│                      │             │              │ rolls         │
└──────────────────────┴─────────────┴──────────────┴───────────────┘
```

### 1.1 TypeScript interfaces

```typescript
/** The five time domains. Each system declares which domain it consumes. */
type TimeDomain =
  | 'real'        // wall clock — profiling only, never simulation
  | 'render'      // display refresh — never authoritative
  | 'fixed'       // 60 Hz sim tick — authoritative for gameplay
  | 'strategic'   // 1 Hz long-term — authoritative for demography
  | 'historical'; // event-driven — authoritative for the chronicle

interface ClockState {
  /** The domain this clock serves. */
  domain: TimeDomain;
  /** Monotonic counter in this domain's unit. */
  now: bigint;
  /** Accumulator for fixed-step clocks (fixed, strategic). */
  accumulator: bigint; // Q32.32 fixed-point milliseconds
  /** The fixed step size, in this domain's unit. */
  step: bigint;
  /** Total wall-clock time consumed by this domain's last tick, for profiling. */
  lastTickDurationMs: number;
}

interface TimeService {
  /** The fixed-timestep game tick. Increments only via the frame loop. */
  readonly fixedTick: bigint;
  /** The strategic tick (advances once per 60 fixed ticks). */
  readonly strategicTick: bigint;
  /** The render frame counter. Increments once per rAF callback. */
  readonly renderFrame: bigint;
  /** Real-time, for profiling only. NEVER read in simulation. */
  readonly realNowMs: number;
  /** The historical day counter. Advances on save/branch/epoch transitions. */
  readonly historicalDay: bigint;

  /** Convert fixed ticks to in-game days (60 ticks = 1 minute sim time). */
  ticksToDays(ticks: bigint): bigint;
  /** Strategic ticks → in-game seasons (90 strategic ticks = 1 season). */
  strategicTicksToSeasons(s: bigint): bigint;
}
```

### 1.2 What each domain is for

**REAL TIME** is the wall clock (`performance.now()`). It is permitted only inside the profiling subsystem and the input-latency measurer. Any system that reads real time inside a simulation step is a determinism violation. The enforcer wraps `performance.now` with a poisoned proxy in dev mode that throws if called from a sim system's call stack.

**RENDER TIME** is the display refresh counter. It advances once per `requestAnimationFrame` callback. The renderer uses it to interpolate the most recent two sim snapshots; nothing else. The renderer never writes back to sim state.

**FIXED GAME TIME** is the simulation tick at 60 Hz (16.6 ms per tick). All gameplay — NPC schedules, qi routing, combat frames, AI decisions, economy transactions — happens here. The fixed timestep is the determinism contract's spine.

**STRATEGIC TIME** advances once per 60 fixed ticks (i.e., once per real second at full rate). It governs slow, aggregable systems: seasonal agricultural transitions, demographic drift (births, deaths, marriages), tier demotion/promotion decisions, and the relevance/streaming planner's coarse pass. Strategic ticks are *derived* from fixed ticks (`strategicTick = fixedTick / 60n`), not independently clocked, so they cannot drift.

**HISTORICAL TIME** is event-driven. It advances one day when the player sleeps, when a save is checkpointed, when a save branch is created, or when an epoch transition fires (e.g., a tribulation crossing observed by the player). It governs the chronicle (genealogies, ancestor rolls, sect histories). Historical time is deterministic: the *sequence* of historical-day advances is reproducible from the input log.

### 1.3 The contract: no closed timelike curves

Per `00_FOUNDATIONAL_DECISIONS §TIME-DOMAIN`: the time-domain contract permits non-uniform time *rates* (the five domains run at different rates) but forbids closed timelike curves (no retroactive edits), retroactive branches that exchange resources with their own past, and any path by which a system reads future state. The enforcer checks this:

- Every system call that reads `TimeService.fixedTick` returns the same `bigint` for the duration of one fixed tick. Calling `advanceFixedTick()` mid-system is a fatal error.
- Branching saves (doc 11) create a *new* historical-day lineage; they do not modify the parent's chronicle.
- No system reads `historicalDay > now.historicalDay`. The historical projector only ever *writes* future days; readers see only past and present.

---

## 2. The 12-step frame loop

Each `requestAnimationFrame` callback runs the following twelve phases in order. Phases 3–5 may run zero, one, or many times per frame depending on the accumulator (§3). The other phases run exactly once per frame.

```
┌──────────────────────────────────────────────────────────────────┐
│                    FRAME LOOP (per rAF callback)                 │
│                                                                  │
│  1. POLL INPUT        ─── collect device state, timestamp        │
│  2. DRAIN MESSAGES    ─── apply WebSocket + worker inbox         │
│  3. FIXED SIM STEPS   ─── 0..N ticks @ 60 Hz (§3)                │
│  4. PHYSICS           ─── Jolt step, fixed dt, per sim tick      │
│  5. AUTHORITATIVE STATE ── snapshot + hash (every Kth tick)      │
│  6. STREAMING/RELEVANCE ── tier reassignment, asset IO enqueue   │
│  7. INTERPOLATE       ─── blend prev/next sim snapshot           │
│  8. ANIMATION         ─── advance skeletal + procedural anims    │
│  9. RENDER VISIBILITY ─── frustum + occlusion + tier cull        │
│ 10. SUBMIT RENDER     ─── WebGPU/WebGL2 command buffer           │
│ 11. DEFERRED DISPOSAL ─── release GPU buffers, deref assets      │
│ 12. PROFILING         ─── emit frame metrics to the dev overlay  │
│                                                                  │
│  Total budget: 16.6 ms (60 Hz). See §5 for allocation.           │
└──────────────────────────────────────────────────────────────────┘
```

### 2.1 Phase 1 — Poll input

The input plugin (`ga:input`) collects keyboard, mouse, gamepad, and touch state. Each input event is stamped with the *fixed tick* during which it was observed — never the render frame — and pushed to the input log. Input is the *only* system permitted to read real time, and only to measure latency for the dev overlay.

```typescript
interface InputEvent {
  /** The fixed tick this input is committed to. */
  tick: bigint;
  /** The device and code, e.g. 'keyboard.KeyW'. */
  source: string;
  /** The input kind: press, release, axis, pointer. */
  kind: 'press' | 'release' | 'axis' | 'pointer';
  /** Payload — float array for axes, [x,y] for pointer, [] for press/release. */
  payload: number[];
  /** Real-time latency, for the dev overlay only. NEVER read by sim. */
  observedRealLatencyMs: number;
}
```

Inputs are *barriered*: the input plugin collects events during the rAF callback but does not commit them until phase 3 begins. An input that arrives between two fixed ticks is committed to the next tick. This is the input barrier that makes the input log reproducible.

### 2.2 Phase 2 — Drain messages

External channels — the AI WebSocket (doc 22), worker inboxes (doc 08), and the headless API — have queued commands during the previous frame. Phase 2 drains these queues in arrival order. Each command is either an *input event* (injected into the input log with the next fixed tick) or a *parameter change* (queued for the next save migration). No command may mutate sim state directly; all go through the event bus (doc 10).

### 2.3 Phase 3 — Fixed sim steps

The accumulator-based fixed timestep (§3) determines how many 60 Hz ticks to run this frame. Each tick runs all registered sim systems in priority order. The scheduler holds a topologically sorted system list (built once at plugin init, rebuilt on plugin load/unload).

```typescript
interface SystemRegistration {
  id: string;                  // 'ga:npc-sim.schedule'
  pluginId: string;            // 'ga:npc-sim'
  fn: (ctx: SimContext) => void;
  priority: number;            // 0 = first, 1000 = last
  domain: TimeDomain;          // 'fixed' or 'strategic'
  reads: string[];             // component types this system reads
  writes: string[];            // component types this system writes
  estimatedCostUs: number;     // for budget enforcement
}

interface SimContext {
  tick: bigint;
  dt: bigint;                  // Q32.32 fixed-point seconds
  rng: RngSubstream;           // the tick's deterministic RNG window
  host: PluginHost;
  emit: (event: SimEvent) => void;   // queued for phase-3 within-tick dispatch
  query: <T>(q: QuerySpec) => T[];
}
```

The scheduler runs all `priority < 500` systems (input, AI, qi), then the physics step (phase 4), then all `priority >= 500` systems (combat resolution, economy, save checkpoint). The split lets physics consume AI decisions in the same tick.

### 2.4 Phase 4 — Physics

The Jolt WASM wrapper (doc 21) steps once per fixed tick with a pinned `dt = 1/60 s`. Physics is *not* sub-stepped beyond the fixed tick; if the simulation falls behind (§3.4 spiral-of-death), the physics step is skipped for the surplus ticks and the snapshot's `physicsSkipped` flag is set. This is preferable to sub-stepping, which would change the integration result and break determinism.

### 2.5 Phase 5 — Authoritative state snapshot

Every `K`th tick (default `K = 60`, i.e., once per strategic tick), the scheduler asks the determinism enforcer to snapshot the full world state to CBOR and compute SHA-256. The hash is written to the input log and emitted as an `AuthoritativeState` event. This is the *only* hash the save system (doc 11) uses for checkpoint verification. Intermediate ticks can be re-derived from the input log + the most recent checkpoint.

### 2.6 Phase 6 — Streaming and relevance

The streaming planner (doc 12) re-evaluates entity fidelity tiers (S0–S4) based on the player's current spatial node and velocity. Demotions and promotions are queued as transactions (doc 10) and applied at the next strategic tick boundary, never mid-fixed-tick, to keep tier transitions deterministic and conservation-checked (no promotion creates favorable facts; no demotion erases named entities — `49_CONTENT_ARCHITECTURE §4`).

### 2.7 Phase 7 — Interpolate

The renderer holds the two most recent authoritative snapshots (tick N-1 and tick N) and blends them by an `alpha ∈ [0, 1)` derived from the accumulator:

```typescript
function interpolate(alpha: Fixed64): RenderSnapshot {
  // For every entity present in both snapshots:
  //   position = lerp(prev.position, next.position, alpha)
  //   rotation = slerp(prev.rotation, next.rotation, alpha)
  // For entities only in next: snap (they were spawned this tick).
  // For entities only in prev: snap (they will be disposed this frame).
  return blend(prevSnapshot, nextSnapshot, alpha);
}
```

`alpha` is computed as `accumulator / step`. A 144 Hz panel sees alpha advance by ~0.42 per frame; a 35 Hz panel sees alpha advance by ~1.71 (clamped to 1.0 with one extra fixed tick to catch up). The simulation does not know which one is rendering it.

### 2.8 Phase 8 — Animation

Skeletal animation (skinned meshes) advances on render time, not fixed time, because animation playback rate is a *display* concern. The animation system reads the interpolated sim snapshot for the entity's *intent* (e.g., "is the NPC walking?") and advances the clip clock by the real `dt` since the last frame. This decouples animation smoothness from the 60 Hz sim.

### 2.9 Phase 9 — Render visibility

Frustum cull, occlusion cull, tier-based cull (entities at S0/S1 render as a billboard or not at all; S2 as a low-LOD mesh; S3/S4 as full skinned meshes), and shadow-caster cull. The visibility pass writes a draw list that the render submit pass consumes.

### 2.10 Phase 10 — Submit render

Build the WebGPU command buffer (or WebGL2 draw calls), submit, present. The renderer is allowed to use `Math.sin`, `Math.cos`, and GPU intrinsics freely (doc 17 §3.1) — the GPU is not canonical.

### 2.11 Phase 11 — Deferred disposal

GPU buffers, asset references, and worker-returned transferables that were marked for disposal during the frame are released here, *after* the render submit. This prevents the GPU from binding a deleted buffer mid-frame.

### 2.12 Phase 12 — Profiling

Per-phase durations, fixed-tick count, accumulator depth, draw call count, and memory pressure are written to a ring buffer. The dev overlay (toggle with F1) renders the last 120 frames as a flame chart. Profiling is the *only* subsystem permitted to read REAL TIME inside the frame loop.

---

## 3. The fixed timestep

### 3.1 The algorithm

```typescript
const FIXED_STEP_MS = 16n << 32n;       // 16.6 ms as Q32.32 (rounded down)
const MAX_TICKS_PER_FRAME = 5n;          // spiral-of-death guard

function frameLoop(realDtMs: number) {
  clock.accumulator += fromDouble(realDtMs);
  let ticksRun = 0n;
  while (clock.accumulator >= FIXED_STEP_MS && ticksRun < MAX_TICKS_PER_FRAME) {
    clock.fixedTick += 1n;
    if (clock.fixedTick % 60n === 0n) clock.strategicTick += 1n;
    runFixedTick(clock.fixedTick);
    clock.accumulator -= FIXED_STEP_MS;
    ticksRun += 1n;
  }
  if (clock.accumulator >= FIXED_STEP_MS) {
    // Spiral-of-death: we are too far behind. Drop the surplus and log.
    metrics.spiralDrops++;
    clock.accumulator = 0n;
  }
  const alpha = clock.accumulator / FIXED_STEP_MS;
  renderFrame(alpha);
}
```

### 3.2 Why 35 FPS and 144 FPS produce the same outcomes

A 35 Hz panel calls rAF every ~28.5 ms. The accumulator gains ~28.5 ms per frame, so each frame runs *one* or *two* fixed ticks (alternating), averaging 35 × 1.71 ≈ 60 ticks/second. A 144 Hz panel calls rAF every ~6.94 ms; the accumulator gains ~6.94 ms per frame, so most frames run *zero* fixed ticks and every ~2.4th frame runs *one*, averaging 144 × 0.417 ≈ 60 ticks/second. Both panels produce the *same* sequence of fixed ticks because the accumulator's *contents* are real-time-independent — only the *pace* at which the accumulator drains varies.

The sim state at fixed tick N is a pure function of (seed, N, inputLog[0..N]). Render rate does not appear in that function.

### 3.3 Interpolation between sim ticks

On a 144 Hz panel, the renderer renders ~2.4 frames per fixed tick. Without interpolation, the player would see the world "stutter" at 60 Hz despite the panel's 144 Hz. Phase 7's interpolation fixes this: the renderer always renders a blend of tick N-1 and tick N, where alpha is the fractional part of `fixedTick + accumulator/step`.

```typescript
// Pseudocode — the renderer's view of the world.
const prev = snapshots[tickN - 1n];
const next = snapshots[tickN];
const alpha = accumulator / FIXED_STEP_MS; // Q32.32 → [0, 1)
for (const entity of visibleEntities) {
  const p = prev.entities.get(entity.id);
  const n = next.entities.get(entity.id);
  if (p && n) entity.transform = lerp(p.transform, n.transform, alpha);
  else if (n) entity.transform = n.transform; // spawned this tick
  // (entities only in p are skipped; they were disposed)
}
```

### 3.4 The spiral of death

If a single fixed tick takes longer than 16.6 ms (e.g., the player entered a 200-NPC village and the AI cost spiked), the accumulator grows. Left unchecked, the next frame runs *more* ticks, each of which is also slow, and the accumulator grows without bound. The `MAX_TICKS_PER_FRAME = 5` cap breaks the spiral: after five ticks the surplus is dropped and `spiralDrops` is logged. The sim slows down (time appears to dilate for the player) but never freezes.

The save system records `spiralDrops` in the save header. A save with `spiralDrops > 0` is still deterministic — the input log + checkpoint reproduces it exactly — but it indicates the engine is running past its performance budget, which is a tuning signal, not a correctness bug.

### 3.5 Pausing and unpausing

When the player opens a menu or tabs out, the frame loop continues running (rAF still fires), but the accumulator is *not* incremented. The sim freezes. On unpause, the accumulator resumes from zero. The input log records `Pause` and `Unpause` events so a replay correctly freezes and unfreezes at the same ticks.

---

## 4. How the simulation never depends on render frame rate

The contract has three enforcement points:

1. **The fixed tick is the only time the sim reads.** Sim systems receive `SimContext.tick` and `SimContext.dt`. They never see `renderFrame` or `realNowMs`. The TypeScript types make this structural — there is no field on `SimContext` for render time.

2. **Inputs are barriered to fixed ticks, not render frames.** An input event recorded at render frame 1440 on a 144 Hz panel and one recorded at render frame 350 on a 35 Hz panel both carry `tick: 600` if they happened during the same fixed tick. The replay sees the same input at the same tick.

3. **The hash is computed on the fixed tick, not the frame.** A save taken on a 35 Hz panel and a 144 Hz panel at "the same moment in gameplay" produces the same hash because both panels reach the same `fixedTick` value at the same wall-clock instant (give or take one tick).

### 4.1 The replay invariant

```typescript
/** The determinism proof. */
function replay(seed: bigint, inputLog: InputEvent[]): Hash {
  const sim = initSim(seed);
  for (const input of inputLog) {
    sim.advanceToTick(input.tick);    // run zero or more fixed ticks
    sim.applyInput(input);
  }
  sim.advanceToFinalTick();
  return sim.hash();
}
// replays on Chrome 144Hz, Firefox 60Hz, Safari 35Hz → identical hash
```

This is the test in §7.3. It is run on every CI build across three browsers.

---

## 5. Frame budget allocation

The 16.6 ms / 60 Hz target decomposes as follows. These are *budgets*, not measurements; the profiling overlay (§2.12) reports actuals per frame.

| Phase                          | Budget (ms) | %    | Notes |
|--------------------------------|-------------|------|-------|
| 1. Poll input                  | 0.2         | 1%   | Trivial; device-state read |
| 2. Drain messages              | 0.3         | 2%   | WebSocket + worker inbox |
| 3. Fixed sim steps (1 tick)    | 4.0         | 24%  | NPC AI, qi, combat, economy |
| 4. Physics (Jolt step)         | 2.5         | 15%  | One Jolt WASM step @ 60 Hz |
| 5. Authoritative snapshot (1/K)| 0.5         | 3%   | Amortized over 60 ticks |
| 6. Streaming/relevance         | 0.5         | 3%   | Tier reassignment, IO enqueue |
| 7. Interpolate                 | 0.5         | 3%   | Lerp/slerp visible entities |
| 8. Animation                   | 1.0         | 6%   | Skeletal + procedural |
| 9. Render visibility           | 1.0         | 6%   | Frustum + occlusion + tier cull |
| 10. Submit render              | 5.0         | 30%  | WebGPU command buffer |
| 11. Deferred disposal          | 0.3         | 2%   | GPU buffer release |
| 12. Profiling                  | 0.3         | 2%   | Ring buffer write |
| **Total**                      | **16.6**    | 100% | 60 Hz target |

### 5.1 Budget enforcement

Each phase is wrapped in a budget guard. If a phase exceeds 1.5× its budget for three consecutive frames, the dev overlay flashes red and the engine emits a `BudgetViolation` event. In production, the same signal triggers *graceful degradation*: the renderer lowers LOD, the AI reduces its horizon, physics reduces solver iterations. Degradation choices are recorded in the input log so the replay matches.

### 5.2 The 35 Hz fallback

On a 35 Hz panel, one frame has ~28.5 ms — enough for *two* fixed ticks (2 × 6.5 ms sim) plus one render (~16 ms). The budget for a two-tick frame is therefore: phases 3+4+5 doubled (= 14 ms), phase 10 still ~16 ms — total ~30 ms, which fits in 28.5 ms only with degradation. The scheduler detects sustained 35 Hz operation and pre-emptively reduces physics iterations from 10 to 6 and AI horizon from 8 to 4. This is logged in the save header so the replay reproduces the same reduced-iteration physics.

---

## 6. 16 questions answered

1. **What is this system?** The scheduler is the engine's heartbeat: five clocks, a 12-step frame loop, and a fixed-timestep algorithm that decouples simulation from display refresh.

2. **What problem does it solve?** The determinism contract requires that two players on different hardware see the same outcomes; the genre requires frame-perfect feel. The scheduler resolves both by separating the authoritative fixed clock from the smooth render clock.

3. **Core abstractions?** `TimeDomain`, `ClockState`, `TimeService`, `SystemRegistration`, `SimContext`, the accumulator-based `frameLoop`.

4. **Data flow?** rAF → poll input → drain messages → (accumulator drives N fixed ticks) → snapshot → streaming → interpolate → animate → cull → submit → dispose → profile.

5. **Lifecycle?** `initScheduler()` builds the topologically sorted system list; `frameLoop()` runs once per rAF until `shutdownScheduler()` drains the accumulator to zero and emits the final hash.

6. **Invariants?** (a) Sim state at tick N is a function of (seed, N, inputLog[0..N]). (b) No sim system reads render or real time. (c) The hash at tick N is reproducible across browsers. (d) No closed timelike curves (no system reads future state).

7. **Inputs?** Device events (phase 1), external commands (phase 2), and the prior frame's accumulator.

8. **Outputs?** The visible frame (phase 10), the dev overlay metrics (phase 12), and the per-tick authoritative hash (phase 5).

9. **Failure modes?** Spiral of death (§3.4) — capped at 5 ticks/frame; budget overflow (§5.1) — graceful degradation; tab-out — pause-on-blur; worker stall — phase 2 timeout falls back to main-thread sim for one tick.

10. **Performance budget?** 16.6 ms / 60 Hz; phase allocation in §5.

11. **Test requirements?** Cross-browser hash parity (§7.3), spiral-of-death cap, pause/resume determinism, budget-violation detection, fixed-tick-count parity across 35/60/144 Hz panels.

12. **Extension points?** Plugins register systems with `(priority, domain, reads, writes)`; the scheduler topologically sorts and runs them. New time domains cannot be added (the five are closed); new clocks *within* a domain can be added via the `ClockState` interface.

13. **Security/isolation?** Input events are barriered to fixed ticks so a malicious WebSocket cannot inject mid-tick state. Real-time reads are poisoned in dev mode. Worker messages are validated against the command schema before phase 2 drains them.

14. **Rejected alternatives?** (a) Variable timestep (`dt` per frame) — rejected because float drift breaks the hash. (b) Single clock with rate scaling — rejected because combat feel demands 60 Hz; demography demands 1 Hz; conflating them produces janky combat or wasted demography CPU. (c) Sub-stepping physics on slow frames — rejected because it changes integration results and breaks determinism. (d) Frame-rate-dependent AI — rejected because two players would see different NPC decisions.

15. **Dependencies?** Depends on `ga:determinism` (RNG, CBOR, SHA-256), `ga:core` (PluginHost), `ga:input` (input barrier). Depended on by every sim system, the renderer (for interpolation), the save system (for checkpoints), and the WebSocket API (for `step(ticks)`).

16. **What this enables?** Cross-browser determinism proof (the project's central technical thesis), AI-tunable combat feel, the century-absence test (doc 17 §6.1), and the branching-save system (doc 11) — all of which require the simulation to be frame-rate-independent.

---

## 7. Test requirements

### 7.1 Unit tests

- `accumulator` math: given `(realDtMs, prevAccumulator)`, assert `(nextAccumulator, ticksRun)` matches the spec for 1000 random `(realDtMs, prevAccumulator)` pairs.
- `ticksToDays` / `strategicTicksToSeasons` conversions: exact BigInt equality.
- Pause/unpause: a 1000-tick sim with a pause at tick 500 produces the same final hash as a continuous sim.

### 7.2 Integration tests

- The 12-phase frame loop runs end-to-end with a no-op renderer; assert all 12 phases execute in order and `fixedTick` advances by the expected count.
- A frame with `realDtMs = 100` (simulating a 6-second tab-out) does *not* run 360 fixed ticks; it runs 5 and drops the surplus.

### 7.3 Cross-browser determinism test

The canonical test (doc 17 §3.2). Seed pinned to `HARNESS_SEED_STRING`. Input log pinned to a 10,000-event fixture. Run the sim for 60,000 ticks (1000 seconds at 60 Hz). Hash the final state. Assert hash parity across Chrome, Firefox, Safari on three platforms (macOS, Windows, Linux). This test runs on every CI build. A failure blocks the merge.

### 7.4 Frame-rate parity test

Run the same 60,000-tick sim at three simulated display rates (35 Hz, 60 Hz, 144 Hz) by mocking rAF cadence. Assert all three runs produce the same final hash and the same `inputLog` shape (same events at the same ticks).

### 7.5 Spiral-of-death test

Inject a synthetic system that takes 30 ms per tick. Assert `MAX_TICKS_PER_FRAME` is honored, `spiralDrops` increments, and the save's `spiralDrops` field is non-zero. Assert the sim does not freeze.

### 7.6 Budget-violation test

Inject a system that takes 1.5× its budget for three consecutive frames. Assert `BudgetViolation` event fires and graceful degradation reduces physics iterations.

---

## 8. Failure cases and recovery

| Failure                              | Detection                | Recovery                                            |
|--------------------------------------|--------------------------|-----------------------------------------------------|
| rAF not firing (tab hidden)          | `document.visibilityState` | Pause accumulator; resume on visible              |
| Worker stall (phase 2 timeout)       | 4 ms deadline per drain  | Fall back to main-thread sim for one tick          |
| Single tick > 16 ms                  | Phase timing             | Allow up to 5 ticks/frame; then spiral-drop         |
| Hash mismatch on checkpoint          | Determinism enforcer     | Roll back to previous checkpoint; log deviation    |
| Strategic tick drift                 | `fixedTick % 60` invariant | Recompute `strategicTick` from `fixedTick`         |
| Player sets system clock back        | Real-time monotonic guard | Ignore non-monotonic real-time readings            |

---

## 9. Rejected alternatives (summary)

- **Variable timestep.** Float drift accumulates. Two browsers diverge within minutes. Rejected.
- **Single clock.** Conflates combat (60 Hz) with demography (1 Hz). Wastes CPU or jitters combat. Rejected.
- **Physics sub-stepping on slow frames.** Changes integration. Breaks the hash. Rejected.
- **Render-rate-driven AI.** Two players see different NPC decisions. Rejected.
- **Lock-step networking model.** Irrelevant — the engine is single-player with deterministic replay, not multiplayer lock-step. The frame loop is simpler for it. (Multiplayer, if ever added, is a separate deterministic-replay channel, not a scheduler change.)
- **Game-clock-from-real-clock.** `Date.now()` in sim. Forbidden by the contract (doc 17 §3.1). Rejected.

---

## 10. What this document enables

The scheduler is the spine the rest of the runtime hangs from. With it specified:

- **Doc 08 (Jobs/Workers)** can dispatch deterministic jobs that read `SimContext.tick` and produce results stamped with the tick they were computed for.
- **Doc 09 (Entity Runtime)** can register components whose lifecycle callbacks (`onAttach`, `onDetach`) fire inside phase 3, in priority order.
- **Doc 10 (Events)** can guarantee in-tick event ordering because the tick is a discrete, ordered unit.
- **Doc 11 (Persistence)** can checkpoint at every Kth fixed tick and reproduce any state by replaying the input log from the nearest checkpoint.
- **Doc 12 (Streaming)** can demote/promote tiers at strategic-tick boundaries without mid-tick inconsistency.

The 35 FPS player and the 144 FPS player get the same outcomes. The 60 Hz player gets the smoothest motion. The save file is the same on all three. This is the contract the rest of the engine obeys.
