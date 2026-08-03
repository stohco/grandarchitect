# 00 — Engine Vision, Scope, and Invariants

**Status:** Foundation. Defines what the engine *is*, what it *is not*, and the invariants no future commit may violate.
**Engine codename:** Grand Architect (the engine itself speaks game-dev domain language, not xianxia vocabulary).
**Date:** 2026-08-03

---

## 0. Purpose of this document

This document is the engine's constitution. Every other engine-architecture document (01 through 06) derives from it. If a later document conflicts with this one, this one wins. If a code change conflicts with this one, the code change is rejected.

This document is **not** a product pitch. It is an engineering specification with invariants, scopes, rejection criteria, and the positive experience it exists to deliver. Per AGENTS.md Part 3, the engine must be paired with a positive account of what the player gets; that account is §2 below.

---

## 1. What the engine is

Grand Architect is a **browser-native, plugin-driven, deterministic-by-contract, AI-native** game and simulation engine, built to express a procedurally generated xianxia multiverse.

Each qualifier is load-bearing:

| Qualifier | Operational meaning |
|---|---|
| Browser-native | First-class deployment target is the web browser. WebGPU first, WebGL2 fallback. No native build step is required to ship the game. Workers (Web Worker, SharedArrayBuffer, WASM) are first-class. |
| Plugin-driven | Everything except the kernel is a plugin — including the renderer, the scene graph, the determinism stack, the save system, and the asset loader. Plugins are npm/ESM modules discovered at runtime. |
| Deterministic-by-contract | Same seed + same inputs + same fingerprint = bit-identical world state across every browser, every run, every save/reload. Enforced, not optional. |
| AI-native | Every consequential parameter has a programmatic (headless) surface indistinguishable from the UI surface. An AI agent can tune the engine the same way a human designer does. |
| Xianxia multiverse | The engine is domain-shaped but domain-agnostic. The kernel knows nothing about sects, immortals, or techniques. The xianxia content is *configuration* the engine consumes, not code the engine contains. |

The kernel is the *substrate*. Plugins are the *facets*. The lore is the *configuration*. Determinism is the *contract*.

---

## 2. The positive experience (Part 3 compliance)

Per AGENTS.md Part 3: "Build the engine, not just the brake." Every invariant below exists in service of an experience. State it.

**The first hour.** The player wakes in Wang Family Bend, a village of 31 households on the Cangli river. One verb works *well*: route qi. The first dawn has height-fog, Gerstner waves on the river, and a Qi Condensation cultivator's palm that takes 14 startup / 6 active / 12 recovery frames and feels like Monster Hunter's commit. The player fails once — a false-circuit deviation from impatience — and learns.

**The tenth hour.** The player walks to Cangwu Sect. The same seed reproduces the same 30 disciples, the same Green Mirror Vein water-phase spirit vein, the same dusk lighting. A save from session 1 loads in session 10 with the same hash.

**The hundredth hour.** The player leaves the village for a year of in-game time. Headless simulation runs the village's economy, social network, and ecology at S2 tier. The player returns and no favorable facts have been fabricated; no named NPC has been erased. The world *continued without them*.

**The century test.** The player, now Nascent Soul, returns to the village after 100 years. Headless simulation has advanced the village through deaths, births, lineage shifts, and economic drift. The same seed + same fingerprint produces bit-identical results on every browser.

If the engine cannot deliver the first hour, no amount of system rigor saves it. If it cannot deliver the century test, it is not deterministic in the way the bible requires.

---

## 3. The three architecture structures

```
+---------------------------------------------------------------------------+
|                          ENGINE (the kernel)                              |
|  Plugin host | Capability registry | Service container | Scheduler        |
|  Event bus   | Resource manager    | Determinism svc    | Job system      |
|  Persistence | Diagnostics         | Config             | Security gate   |
+---------------------------------------------------------------------------+
                                |  loads
                                v
+---------------------------------------------------------------------------+
|                      CONTENT (plugins + assets)                            |
|  ga:core  ga:determinism  ga:renderer  ga:scene  ga:input  ga:save         |
|  ga:assets  ga:gen-settlement  ga:gen-ecology  ga:combat  ga:fog  ga:water |
|  Definitions (essence/realm/technique/...) | Templates | Rules | Migrations|
+---------------------------------------------------------------------------+
                                |  renders to
                                v
+---------------------------------------------------------------------------+
|                  PRESENTATION (the browser)                                |
|  WebGPU/WebGL2 canvas | Web Audio | Input devices | Storage (OPFS)         |
|  Workers (sim headless, asset decode, AI bridge)                           |
+---------------------------------------------------------------------------+
```

### 3.1 Engine (kernel)
The kernel is the only code that ships as non-plugin. It owns: plugin lifecycle, capability registry, service container, scheduler, event bus, resource manager, determinism service, job system, persistence kernel, diagnostics, configuration, security boundary. It is specified in `02_KERNEL_LIFECYCLE.md`.

### 3.2 Content (plugins + authored data)
Content is everything the kernel loads: core plugins, generator plugins, render plugins, simulation plugins, the definition database, templates, rules, migrations, assets. Content is versioned, content-addressed, and may be absent. The kernel must run with zero content plugins and report a defined failure when expected content is missing (see §6.4).

### 3.3 Presentation (the browser)
The browser is the deployment surface, not a plugin. The kernel targets the browser's primitives: `Worker`, `SharedArrayBuffer`, `WebGPU`, `crypto.subtle`, `IndexedDB`/`OPFS`, `MessageChannel`. No Electron, no native shell.

### 3.4 The xianxia bible relationship

The bible (corpus-extension docs 00–49) is **not** engine code. It is **not** a plugin. It is **authoritative configuration data**, parsed into the `Definition` graph (`src/lib/engine/definitions.ts`) and consumed by generator plugins.

```
Bible (Markdown, 49 docs)
   |  parsed by: ga:lore-loader (a plugin)
   v
Definition graph (typed TS objects, ~6,000–10,000 nodes target)
   |  consumed by: ga:gen-* plugins
   v
World state (entities, components, simulation state)
   |  simulated by: ga:core systems
   v
Rendered by: ga:renderer
```

The bible cannot violate an engine invariant. If a bible entry requires non-deterministic behavior (e.g., "the sect master's mood depends on the real weather"), the engine refuses to load that entry and emits a diagnostics event. The bible is the configuration; the engine is the contract.

---

## 4. Invariants

An invariant is a property that no commit, no plugin, no bible entry may violate. Violating an invariant is a merge-blocking bug. The list is short and irreducible.

### 4.1 Determinism invariant
**Statement.** For a fixed `(seed, fingerprint, input sequence)` tuple, the world state at every tick `t` is bit-identical across all conformant engines.

**Implications.**
- No `Math.random()`, `Date.now()`, `performance.now()`, `crypto.getRandomValues` in simulation code paths.
- No `Math.sin/cos/tan/exp/log/pow/atan2` in simulation code paths. Use `det_*` from the determinism service.
- No `JSON.stringify` of state that participates in a checkpoint. Use the CBOR deterministic encoder.
- No iteration over `Map`/`Set` whose insertion order is observable from another plugin. Use sorted iteration or `Map` keyed by strings.
- No floating-point accumulation in `double` for quantities that must round-trip (positions, integrals). Use Q32.32 fixed-point.

**Enforcement.** See `06_DETERMINISM_SEEDS_REPLAY.md`. Dev mode throws on violation. Production audits at checkpoints.

**Failure to enforce is a P0 bug.**

### 4.2 Plugin modularity invariant
**Statement.** The kernel contains zero references to xianxia domain types. No `Sect`, no `Cultivator`, no `Qi`, no `Tribulation` appears in the kernel's TypeScript. Domain types live in plugins.

**Implications.**
- A plugin that imports a kernel symbol and a kernel symbol that imports a plugin symbol are both merge-blocking.
- The kernel provides capability *slots*; plugins provide capability *implementations*.

**Test.** A grep for `Sect|Cultivator|Qi|Tribulation|Xianxia` in `src/lib/engine/kernel/` must return zero matches.

### 4.3 Browser-native invariant
**Statement.** The engine runs in a conformant web browser with no native runtime. WebGPU is the primary renderer; WebGL2 is the fallback. No Electron, no Tauri, no node-only modules in the runtime path.

**Implications.**
- All file I/O goes through `OPFS`, `IndexedDB`, or `fetch`. No `fs` at runtime.
- All multi-threading goes through `Worker` and `SharedArrayBuffer`. No `worker_threads`.
- WASM is allowed (sqlite-wasm, meshoptimizer) but must be loaded via the standard browser WASM API.

**COOP+COEP requirement.** SharedArrayBuffer requires cross-origin isolation. GitHub Pages cannot serve these headers; the engine must be self-hosted (see AGENTS.md Part 4 — `vps-server-management`). This is a deployment constraint, not an engine constraint.

### 4.4 AI-native invariant
**Statement.** Every parameter exposed through the UI surface is also exposed through the headless API surface. No UI-only knobs. No API-only knobs.

**Implications.**
- The TweakPanel and the HeadlessApi read from the same `ParameterRegistry`.
- A new parameter added to a plugin's tweak panel is automatically available to the AI agent.
- The engine can run headless (no renderer) and still respond to every parameter.

**Test.** A fuzzing harness drives the engine headlessly, exercising every parameter through the API. If a parameter is reachable in the UI but not the API, the test fails.

### 4.5 No silent compatibility invariant
**Statement.** A save from fingerprint X loaded into engine fingerprint Y either (a) succeeds via a registered migration, or (b) fails with a diagnostic. It never silently mis-loads.

**Implications.**
- Every save embeds a `DeterminismFingerprint` (see `06_DETERMINISM_SEEDS_REPLAY.md`).
- Every plugin declares `engineVersionRange` and `dependencies`. The dependency resolver refuses to load a plugin outside its declared range.
- No "best-effort loading." Per AGENTS.md Part 1: do not preserve backward compatibility; remove obsolete paths instead of adding compatibility layers.

### 4.6 Smallest-end-to-end invariant (Part 3)
**Statement.** Every kernel subsystem has a "smallest end-to-end thing that works" — a reference plugin that exercises its contract. A subsystem with no reference plugin is not done.

**Implications.**
- The scheduler is demonstrated by `ga:tick-counter`.
- The capability registry is demonstrated by `ga:capability-demo`.
- The determinism service is demonstrated by the harness in `src/lib/determinism/harness.ts`.
- A subsystem added without a reference plugin is rejected at review.

---

## 5. Scope — what the engine is not

Be explicit. Drift begins with "well, while we're here..."

### 5.1 Not a general-purpose engine
The engine is domain-shaped toward xianxia simulation. Its schedule tiers (S0–S4), its generator pipeline, its render-pass priorities, and its component catalog reflect this. A team building a racing game should not use Grand Architect.

**Rejected alternative.** Build a general-purpose engine like Godot, then build xianxia on top. Rejected: a general-purpose engine carries abstractions whose cost is paid by every plugin forever. Domain shape is a feature, not a limitation.

### 5.2 Not a server-authoritative multiplayer engine
The kernel has no networking. A future `ga:network` plugin may add it; the kernel's hooks (event bus, command log) are designed to *permit* this without *requiring* it.

**Rejected alternative.** Build server authority into the kernel. Rejected: it adds latency to a single-player simulation that does not need it, and it complicates determinism (server clock vs. client clock). Per Part 1: do not add speculative abstraction.

### 5.3 Not a mobile engine
The engine targets desktop browsers. Mobile browsers may run it but are not a deployment target. Touch input is a future plugin, not a kernel concern.

### 5.4 Not a no-code engine
The Law Author (the Mahayana-level editor surface in corpus doc 17 §7.4) is a *future* surface that compiles a DSL to law-plugins. It is not the primary way to author content. Plugins are authored in TypeScript. The bible is authored in Markdown. No visual scripting in the kernel.

### 5.5 Not a replacement for the bible
The engine cannot generate lore. It consumes the bible's `Definition` graph. If the bible is wrong, the world is wrong. The engine's job is to express the bible lawfully, not to fix it.

---

## 6. Failure modes and responses

Every invariant implies a failure mode. State the failure, the detection, the response, and the recovery.

| Invariant | Failure | Detection | Response | Recovery |
|---|---|---|---|---|
| Determinism | Plugin calls `Math.random()` | Dev-mode proxy trap | Throw `DeterminismViolationError` at call site | Plugin fix required; no fallback |
| Determinism | Save fingerprint mismatch on load | `fingerprintsCompatible()` returns false | Refuse load, emit `SaveIncompatible` diagnostic | Migration path or new game |
| Plugin modularity | Kernel imports a domain type | Build-time type check + grep test | Build fails | Kernel refactor |
| Browser-native | Code uses `fs` at runtime | Bundle analyzer + integration test | Build fails | Replace with OPFS/IndexedDB |
| AI-native | UI parameter lacks API mirror | Fuzz test on `ParameterRegistry` | Test fails | Add API binding |
| No silent compat | Plugin version mismatch | Dependency resolver | Refuse to initialize plugin | Update plugin or downgrade engine |
| Smallest end-to-end | New subsystem, no reference plugin | Review checklist | PR blocked | Author reference plugin |

### 6.1 Catastrophic failure (browser OOM, worker crash)
The kernel's worker supervisor restarts the failed worker from the last checkpoint. The simulation loses at most `checkpointInterval` ticks (default 100). The renderer continues from the last known good frame.

### 6.2 Partial failure (one plugin crashes)
The kernel isolates plugin state. A crash in `ga:fog` does not corrupt `ga:combat` state. The crashed plugin is marked `disposed` and emits a `PluginCrashed` event. Other plugins that depend on its capabilities receive `CapabilityLost` and may either degrade or suspend.

### 6.3 Determinism divergence (cross-browser mismatch)
If the cross-browser verification protocol (see `06_DETERMINISM_SEEDS_REPLAY.md` §9) detects a hash mismatch, the engine flags the divergence as a P0 bug. The engine does not "fix it live" — it bisects to the offending operation via the per-tick checkpoint log.

### 6.4 Missing asset or plugin
When the loader cannot resolve a required plugin or asset, the kernel emits a `MissingDependency` diagnostic and refuses to enter the `started` state. The engine does not run with a hole; it does not run.

---

## 7. Performance budgets (top-level)

Per-subsystem budgets live in each subsystem's document. Top-level budgets:

| Budget | Target | Hard limit |
|---|---|---|
| Frame time (60 Hz target) | 16.6 ms | 33 ms (30 Hz floor) |
| Simulation tick (S4 entities ≤ 100) | 2 ms | 5 ms |
| Render frame (WebGPU) | 10 ms | 25 ms |
| Save checkpoint (1000 entities) | 50 ms | 200 ms |
| Plugin load (cold) | 500 ms | 2 s |
| Headless API round-trip | 5 ms | 20 ms |

Budgets are enforced by the diagnostics service. A budget violation in dev mode emits a `BudgetExceeded` diagnostic; in production it is logged for post-hoc analysis.

---

## 7.5 Operating principles (daily guidance)

The invariants above are constitutional. The principles below are operational — they guide every commit, every review, every fork in the road.

1. **Fail loud, fail early.** A missing dependency, a version mismatch, a forbidden function call: all abort the engine rather than running with a hole. Silent degradation is forbidden (invariant 4.5).
2. **The smallest end-to-end thing ships first.** A subsystem without a reference plugin is not done (invariant 4.6). A working village with one verb is worth more than ten thousand lines of doctrine about a multiverse (Part 3).
3. **Make decisions; do not defer.** Per Part 3: "defer / select none" is not intellectual honesty when it is the answer to every fork. Close a door. If the decision is wrong, the world will tell you.
4. **Cite the precedent.** Every claim about feel, pacing, or readability is anchored to a shipped product (Monster Hunter, Sekiro, etc.). Uncalibrated thresholds are aspiration dressed as engineering (Part 3).
5. **Add exits, not gates.** A new gate that depends on three other unresolved gates multiplies closure time. A new exit that lets one subsystem proceed while others wait divides it (Part 3).
6. **Audit the apparatus-to-work ratio.** Every page of governance (this document, the glossary, the kernel spec) should produce at least one page of experience. If apparatus grows and work does not, the project is building a cathedral of governance for a faith with no congregation (Part 3).
7. **The bible is configuration, not code.** The engine cannot generate lore. If the bible is wrong, the world is wrong. The engine's job is to express the bible lawfully, not to fix it.
8. **Determinism is a contract, not a setting.** There is no `deterministicMode: "off"` for the kernel. Plugins may declare `audit` or `off` mode (see `03`), but the kernel is always strict.

---

## 8. Rejected alternatives (consolidated)

| Alternative | Why rejected |
|---|---|
| Use Godot 4.7 / UE 5 / Unity 7 | None guarantee determinism by contract; none are browser-native at parity with desktop; none are AI-native in the sense defined here. |
| Build a single-purpose xianxia engine (no plugin architecture) | The xianxia bible will change. A monolithic engine must be rewritten for every change. A plugin engine reconfigures. |
| Build a general-purpose engine, then add xianxia | Pays abstraction tax forever (§5.1). |
| Server-authoritative multiplayer in the kernel | Adds latency and complicates determinism (§5.2). |
| Float-based simulation state | Compounds ULP divergence across engines over century-scale time (see determinism docs). |
| JSON for state serialization | JSON has unspecified key ordering; not bit-stable across engines. CBOR RFC 8949 deterministic encoding is. |
| `crypto.subtle` as the only hash path | `crypto.subtle` is undefined in non-secure contexts. `@noble/hashes` is the universal fallback. |
| Native binaries (Rust/WASM) for the determinism stack | A pure-TS stack is verifiable in the browser, bit-identical across engines, and fast enough for the prototype. WASM is a future optimization, not a foundation. |

---

## 9. Relationship to AGENTS.md

This document honors:
- **Part 1 (Ponytail)** — no compatibility layers; smallest implementation; layers; long-term decisions.
- **Part 2 (Karpathy)** — simplicity first; surgical changes; goal-driven (the goal is §2's experience).
- **Part 3** — engine not just brake (§2's positive account); confront the central tension (the determinism-vs-patching tension, resolved by the fingerprint system); ship the working thing (§4.6's smallest-end-to-end invariant).
- **Part 4** — skills are tools; this document does not invoke them but defers their use to specific later moments (`/before-building` before implementing a kernel subsystem; `/decisions` after; `/next-decision` when a fork is unresolved).

This document violates:
- **Part 3's "Cite the precedent"** — the feel targets in §2 ("like Monster Hunter's commit") are named but not yet calibrated. Calibration happens when the combat plugin is built. The uncalibrated state is documented here, not hidden.

---

## 10. What this document unlocks

- `01_TERMINOLOGY_GLOSSARY.md` can use the words "kernel," "plugin," "capability" without re-defining them.
- `02_KERNEL_LIFECYCLE.md` can specify the kernel knowing the invariants it must preserve.
- `03_PLUGIN_SDK_CAPABILITY_SYSTEM.md` can specify the SDK knowing the determinism and modularity contracts.
- `04_DEPENDENCY_RESOLUTION_COMPATIBILITY.md` can specify version resolution knowing "no silent compat" is invariant.
- `05_DATA_SCHEMAS_SEMANTIC_GRAPH.md` can specify the Definition graph knowing the bible is configuration, not code.
- `06_DETERMINISM_SEEDS_REPLAY.md` can specify the determinism contract knowing it is invariant #1.

The next document defines the vocabulary. This one defines the soul.
