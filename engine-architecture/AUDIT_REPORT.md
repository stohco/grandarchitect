# Workspace Audit Report

**Date:** 2026-08-03
**Auditor:** Grand Architect (self-audit)
**Method:** Traced actual imports, file structure, runtime dependencies, and exposed APIs — not document names or line counts.

---

## 1. As-Built Architecture

### What actually exists as code

```
/home/z/my-project/
├── src/
│   ├── app/
│   │   ├── api/route.ts          ← Next.js API route (scaffold, unused)
│   │   ├── layout.tsx            ← Next.js layout (scaffold)
│   │   └── page.tsx              ← Serves iframe pointing to /determinism.html
│   ├── components/ui/             ← 48 shadcn/ui components (pre-installed scaffold, UNUSED)
│   ├── hooks/                     ← use-mobile, use-toast (scaffold, UNUSED)
│   ├── lib/
│   │   ├── db.ts                  ← Prisma client (scaffold, UNUSED)
│   │   ├── utils.ts               ← cn() helper (scaffold)
│   │   ├── determinism/           ← THE ONLY REAL ENGINE CODE (7 files)
│   │   │   ├── rng.ts             ← xoshiro256** + splitmix64, BigInt-backed
│   │   │   ├── transcendentals.ts ← det_sin/cos/tan/atan2/exp/log/pow/sqrt
│   │   │   ├── fixed-point.ts     ← Q32.32 BigInt-backed
│   │   │   ├── serialize.ts       ← CBOR via cbor-x
│   │   │   ├── hash.ts            ← SHA-256 via @noble/hashes + crypto.subtle
│   │   │   ├── fingerprint.ts     ← DeterminismFingerprint type
│   │   │   └── harness.ts         ← 1000-tick verification harness
│   │   └── engine/
│   │       └── definitions.ts     ← 37 structured definitions (FROZEN — test fixtures only)
│   └── (no other engine code)
├── mini-services/
│   └── engine-ws/
│       └── index.ts               ← Bun WebSocket server on port 3003 (prototype)
├── public/
│   └── determinism.html           ← Self-contained HTML: determinism harness + Three.js scene + tweak panel
├── corpus-extension/              ← 48 bible docs (16,709 lines) — NOT CODE
├── engine-architecture/           ← 50 architecture docs (26,500 lines) — NOT CODE
├── AGENTS.md                      ← Project doctrine (118 lines)
└── (Next.js scaffold: next.config.ts, tsconfig.json, package.json)
```

### Actual runtime dependencies (what the code imports)

| Dependency | Used by | Purpose | Status |
|---|---|---|---|
| `@noble/hashes` | rng.ts, hash.ts | SHA-256 (sync, browser-compatible) | ✅ Required, correct |
| `cbor-x` | serialize.ts | CBOR deterministic encoding | ✅ Required, correct |
| `three` | public/determinism.html (via CDN import) | WebGL rendering in the prototype | ⚠️ NOT imported in TS code — only in the HTML file via CDN URL import. The `three` npm package is installed but unused by TS. |
| Next.js 16 | page.tsx, layout.tsx | Web app framework / dev server | ⚠️ Serves only as a static file host for determinism.html. No SSR, no API routes used. |
| Prisma | db.ts | Database ORM | ❌ UNUSED — scaffold only |
| 48 shadcn/ui components | — | UI library | ❌ UNUSED — scaffold only |
| React 19 | page.tsx | UI framework | ⚠️ Used only to render an iframe. No React components for the engine. |
| All other deps (~40 packages) | — | Scaffold | ❌ UNUSED |

### Three.js direct dependencies

**Three.js is NOT imported in any TypeScript file.** It is loaded via CDN URL import inside `public/determinism.html`:
```javascript
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.185.1/build/three.module.js';
```

The `three` npm package (0.185.1) is installed but no TS file imports from it.

### Determinism violations in source

| File | Line | Violation | Severity |
|---|---|---|---|
| harness.ts | 100 | `performance.now()` | LOW — used for duration measurement only, not in simulation logic |
| harness.ts | 214 | `performance.now()` | LOW — same |
| harness.ts | 270 | `Math.sin(x)` | MEDIUM — in `crossCheckVsMath()`, used for comparison display, not in simulation. But should use det_sin for consistency. |

The core determinism stack (rng.ts, transcendentals.ts, fixed-point.ts, serialize.ts, hash.ts) is CLEAN — no forbidden functions.

### Worker usage

**None.** No Web Workers, no OffscreenCanvas, no SharedArrayBuffer, no Atomics. The `engine-ws/index.ts` runs as a separate Bun process, not a browser worker.

### Plugin/pseudo-plugin boundaries

**None.** There is no plugin system. The determinism stack is a set of plain TS modules with direct imports. The engine-ws is a standalone Bun server with in-memory state.

### Frame-loop ownership

**None.** The `public/determinism.html` has a `requestAnimationFrame` loop for the Three.js scene and a separate `run()` call for the determinism harness. No engine scheduler exists.

### Renderer ownership

The Three.js renderer is created inside `public/determinism.html`'s inline `<script>`. It is not accessible from TypeScript. It is not abstracted behind any interface.

### Asset loaders

**None.** No glTF loader, no texture loader, no asset registry. The Three.js scene uses primitive geometries (BoxGeometry, PlaneGeometry, CylinderGeometry) created inline.

### Animation code

**None.** No AnimationMixer, no skeletal animation, no state graph.

### Physics code

**None.** No Rapier, no Jolt, no collision detection.

### VFX code

**None.** No particle system, no VFX framework.

### Terrain code

**None.** No voxel terrain, no heightmap, no chunk system.

### Persistence code

**None.** No SQLite-Wasm, no OPFS, no IndexedDB. The determinism harness runs in-memory only.

### Navigation code

**None.** No Recast, no navmesh, no pathfinding.

### Audio code

**None.** No Web Audio API usage.

### Test code

**None.** No unit tests, no integration tests, no conformance tests. The `determinism.html` page IS the test — it runs the harness and displays the hash. There is no automated test runner.

### Editor/debug code

**None.** The tweak panel in `determinism.html` is inline DOM manipulation, not an engine subsystem.

---

## 2. Capability-Gap Matrix

| Capability | Required by architecture doc | Implemented? | Evidence |
|---|---|---|---|
| Determinism stack (RNG, transcendentals, fixed-point, CBOR, SHA-256) | 06 | ✅ YES | `src/lib/determinism/*.ts`, hash `7fde855...` verified |
| Determinism fingerprint | 06 | ✅ YES | `src/lib/determinism/fingerprint.ts` |
| Determinism verification harness | 06, 38 | ✅ YES | `src/lib/determinism/harness.ts`, runs 1000 ticks |
| Definition database (structured concepts) | 05 | ✅ YES (frozen) | `src/lib/engine/definitions.ts`, 37 definitions |
| Engine kernel (plugin host, lifecycle, capability registry) | 02 | ❌ NO | No code exists |
| Plugin SDK (manifest, lifecycle, registration) | 03 | ❌ NO | No code exists |
| Scheduler (time domains, frame loop) | 07 | ❌ NO | No code exists |
| Job/worker system | 08 | ❌ NO | No code exists |
| Entity-component system (sim/render split) | 09 | ❌ NO | No code exists |
| Event bus (typed events, commands, queries, transactions) | 10 | ❌ NO | No code exists |
| Persistence (save/load, SQLite-Wasm, OPFS) | 11 | ❌ NO | No code exists |
| World partitioning (spatial hierarchy, streaming) | 12 | ❌ NO | No code exists |
| Renderer abstraction (RenderBackend interface) | 13 | ❌ NO | Three.js used directly in HTML, no abstraction |
| Three.js adapter (WebGPU/WebGL2) | 14 | ⚠️ PARTIAL | CDN import in HTML, no TS adapter, no backend abstraction |
| Materials/lighting/post-processing | 15 | ⚠️ PARTIAL | Inline shader chunk patching for fog, inline materials. No system. |
| Asset registry/pipeline | 16 | ❌ NO | No asset system |
| Animation framework | 17 | ❌ NO | No animation system |
| VFX framework | 18 | ❌ NO | No VFX system |
| Audio system | 19 | ❌ NO | No audio system |
| Physics (adapter, body types, qi-enhanced materials) | 20 | ❌ NO | No physics system |
| Voxel terrain (density field, chunking, destruction) | 21 | ❌ NO | No terrain system |
| Navigation (Recast, pathfinding) | 22 | ❌ NO | No navigation system |
| Procedural generation framework | 23 | ❌ NO | No generator system |
| Cosmology/spatial topology | 24 | ❌ NO | No cosmology code |
| Simulation tiering (S0-S4) | 25 | ❌ NO | No tier system |
| NPC cognition/behavior | 26 | ❌ NO | No NPC system |
| Knowledge/memory/rumors | 27 | ❌ NO | No knowledge system |
| Ecology/demography | 28 | ❌ NO | No ecology system |
| Economy/logistics/factions | 29 | ❌ NO | No economy system |
| History/event simulation | 30 | ❌ NO | No history system |
| Cultivation/effect algebra | 31 | ❌ NO | No cultivation system |
| Combat/ability execution | 32 | ❌ NO | No combat system |
| UI/input/accessibility | 33 | ⚠️ PARTIAL | Inline tweak panel in HTML. No system. |
| Dialogue/quest/narrative | 34 | ❌ NO | No dialogue system |
| Modding/untrusted content | 35 | ❌ NO | No modding system |
| Developer tools/editors | 36 | ⚠️ PARTIAL | Inline tweak panel. No editor system. |
| Diagnostics/profiling/telemetry | 37 | ❌ NO | No diagnostics system |
| Testing/plugin conformance | 38 | ⚠️ PARTIAL | The determinism harness is a manual test. No automated runner. |
| Performance/memory budgets | 39 | ❌ NO | No budget system |
| Build/packaging/deployment | 40 | ⚠️ PARTIAL | Next.js dev server works. No production build tested. |
| Security/failure recovery | 41 | ❌ NO | No security system |
| Grand Architect Control Plane | 43 | ⚠️ PARTIAL | engine-ws/index.ts is a prototype WebSocket server. No real control plane. |
| Architect tool protocol | 44 | ⚠️ PARTIAL | engine-ws has basic API (step, getParams, setParams, screenshot, exportPreset). No typed tool protocol. |
| Browser/VLM observation | 45 | ❌ NO | No multimodal inspection. Screenshots are placeholder. |
| Autonomous change validation | 46 | ❌ NO | No sandbox/preview system |
| Research broker | 47 | ❌ NO | No research system |
| AI permissions/security/audit | 48 | ❌ NO | No permission system |
| Capability/decision graph | 49 | ❌ NO | No capability graph |

### Summary

- **Implemented and verified:** 3 capabilities (determinism stack, fingerprint, harness)
- **Implemented as frozen test fixtures:** 1 capability (definition database)
- **Partially implemented (prototype quality):** 6 capabilities (Three.js rendering, fog system, tweak panel, engine-ws, basic API, build)
- **Not implemented:** 39 capabilities

---

## 3. Migration Plan

### Files to RETAIN (as-is)

| File | Reason |
|---|---|
| `src/lib/determinism/rng.ts` | Proven, verified, correct. Will become the `ga:determinism` plugin's RNG module. |
| `src/lib/determinism/transcendentals.ts` | Proven, verified. Will become the `ga:determinism` plugin's transcendentals module. |
| `src/lib/determinism/fixed-point.ts` | Proven, verified. Will become the `ga:determinism` plugin's fixed-point module. |
| `src/lib/determinism/serialize.ts` | Proven, verified. Will become the `ga:determinism` plugin's serialization module. |
| `src/lib/determinism/hash.ts` | Proven, verified. Will become the `ga:determinism` plugin's hashing module. |
| `src/lib/determinism/fingerprint.ts` | Proven, verified. Will become the `ga:determinism` plugin's fingerprint module. |
| `src/lib/determinism/harness.ts` | Proven, verified. Will become a conformance test for the `ga:determinism` plugin. |
| `src/lib/engine/definitions.ts` | Frozen test fixtures. Will be used to prove end-to-end plugin interoperability. |
| `AGENTS.md` | Project doctrine. Governs all work. |
| `corpus-extension/*.md` | Bible. Configuration data for future content plugins. Not code. |
| `engine-architecture/*.md` | Architecture specification. The blueprint. Not code. |

### Files to ADAPT (refactor into engine structure)

| File | Current | Target | Changes needed |
|---|---|---|---|
| `public/determinism.html` | Self-contained HTML with inline Three.js + determinism + tweak panel | Reference implementation of `ga:renderer` + `ga:determinism` + `ga:tweak-panel` plugins | Extract Three.js code into TS modules behind RenderBackend interface. Extract determinism code (already in TS). Extract tweak panel into a plugin. The HTML becomes a thin entry point. |
| `mini-services/engine-ws/index.ts` | Standalone Bun WebSocket server with in-memory state | `ga:architect-gateway` plugin's WebSocket transport | Replace in-memory state with real engine state access. Add typed tool protocol. Add authentication. Add audit logging. |
| `src/app/page.tsx` | Next.js page serving an iframe | Entry point that loads the engine kernel and boots plugins | Replace iframe with engine bootstrap. The page becomes the engine's host. |
| `next.config.ts` | Next.js config with allowedDevOrigins | Engine build config | Add COOP/COEP headers. Configure asset pipeline. Configure worker bundling. |

### Files to ISOLATE (keep but don't depend on)

| File | Reason |
|---|---|
| `src/components/ui/*.tsx` (48 files) | shadcn/ui scaffold. May be useful for the editor UI plugin later. Isolate behind a `ga:ui` adapter. |
| `src/hooks/*.ts` | React hooks scaffold. May be useful for the UI plugin. |
| `src/lib/db.ts` | Prisma scaffold. May be useful for a future server-side persistence plugin. Not needed for browser-local engine. |
| `src/lib/utils.ts` | cn() helper. Trivial. Keep for UI. |

### Files to REPLACE

| File | Reason |
|---|---|
| `src/app/api/route.ts` | Unused Next.js API route scaffold. Replace with engine API routes if needed. |

### What must be BUILT (in order)

Per doc 42's implementation dependency roadmap:

**Phase 1: Kernel + Plugin SDK**
- `src/engine/kernel/plugin-host.ts` — plugin discovery, lifecycle, dependency resolution
- `src/engine/kernel/capability-registry.ts` — capability registration and matching
- `src/engine/kernel/service-container.ts` — service resolution
- `src/engine/kernel/scheduler.ts` — time domains, frame loop, fixed timestep
- `src/engine/kernel/event-bus.ts` — typed events, commands, queries, transactions
- `src/engine/kernel/entity-manager.ts` — entity IDs, component storage, queries
- `src/engine/kernel/resource-manager.ts` — asset ownership, loading, disposal
- `src/engine/kernel/determinism-service.ts` — wraps the existing determinism stack
- `src/engine/kernel/job-system.ts` — worker management, job queue, revisions
- `src/engine/kernel/persistence-kernel.ts` — save/load interface (implementation later)
- `src/engine/kernel/diagnostics.ts` — logging, metrics, tracing
- `src/engine/kernel/config.ts` — engine configuration
- `src/engine/kernel/security.ts` — plugin permissions
- `src/engine/plugin-sdk/manifest.ts` — plugin manifest interface
- `src/engine/plugin-sdk/lifecycle.ts` — lifecycle state machine
- `src/engine/plugin-sdk/types.ts` — shared types (Capability, Service, System, etc.)
- `src/engine/plugin-sdk/conformance.ts` — conformance test harness

**Phase 2: Grand Architect Control Plane**
- `src/engine/architect/gateway.ts` — the security boundary
- `src/engine/architect/tool-protocol.ts` — typed tool registry and dispatch
- `src/engine/architect/world-oracle.ts` — searchable engine/world state
- `src/engine/architect/capability-graph.ts` — capability requirements vs implementation
- `src/engine/architect/decision-ledger.ts` — architectural decision records
- `src/engine/architect/permissions.ts` — autonomy levels and approval gates
- `src/engine/architect/audit.ts` — audit trail
- `src/engine/architect/websocket-transport.ts` — persistent command channel (adapts engine-ws)

**Phase 3: Reference Plugins**
- `ga:determinism` — wraps the existing stack
- `ga:renderer` — Three.js adapter behind RenderBackend
- `ga:tweak-panel` — the editor surface
- `ga:physics` — Jolt/Rapier adapter
- `ga:terrain` — voxel density field
- `ga:animation` — state graph + blend trees
- `ga:vfx` — composable effect framework
- `ga:assets` — registry + import pipeline
- `ga:persistence` — SQLite-Wasm + OPFS
- `ga:content-schema` — definition/template/rule system

---

## 4. Risks and Unresolved Architectural Decisions

### Risks

1. **Next.js as engine host.** Next.js 16 with Turbopack is unstable in this environment (server crashes under agent-browser's request pattern). The engine may need a different host (plain Vite, Bun.serve, or a custom server). **Decision needed:** keep Next.js or switch to Vite/Bun.

2. **COOP/COEP headers.** SharedArrayBuffer and OffscreenCanvas require cross-origin isolation. Next.js dev server doesn't easily support these headers. A custom server (Bun.serve) or a service worker shim may be needed. **Decision needed:** how to serve with COOP/COEP.

3. **Three.js version coupling.** The engine architecture specifies Three.js as a backend adapter, but the current prototype loads Three.js via CDN URL import inside HTML. The TS code doesn't import Three.js at all. Moving Three.js behind a typed adapter requires either (a) importing the npm package in TS, or (b) keeping the CDN approach and wrapping it. **Decision needed:** npm import vs CDN wrapper.

4. **Worker architecture.** The engine architecture specifies 6 worker types. None exist. The current code is single-threaded. Building the worker system requires COOP/COEP (risk #2) and a job system that doesn't exist yet. **Decision needed:** start single-threaded and add workers later, or build workers first.

5. **Plugin hot-reload.** The architecture specifies plugin hot-reload. Next.js HMR works for React components but not for engine plugins. A custom HMR system may be needed. **Decision needed:** defer hot-reload or build it early.

### Unresolved architectural decisions

1. **Engine host:** Next.js vs Vite vs Bun.serve vs custom
2. **Three.js integration:** npm import in TS vs CDN wrapper in HTML
3. **COOP/COEP strategy:** service worker shim vs custom server vs defer SharedArrayBuffer
4. **Worker priority:** build workers first vs single-threaded first
5. **Plugin packaging:** ES modules vs bundled vs CDN-loaded
6. **Save system implementation:** SQLite-Wasm (requires COOP/COEP) vs IndexedDB-only (simpler, no isolation needed)
7. **Headless test backend:** Node.js vs Bun vs browser-only

---

## 5. First Kernel and Grand Architect Interfaces to Implement

### Kernel interfaces (Phase 1, in dependency order)

1. `src/engine/kernel/types.ts` — shared types (EntityId, ComponentId, CapabilityId, etc.)
2. `src/engine/kernel/capability-registry.ts` — CapabilityRegistry interface
3. `src/engine/kernel/plugin-host.ts` — PluginHost interface (init, destroy, getState, setState, emit, on, registerSystem, registerTweakPanel, checkpoint, verify)
4. `src/engine/kernel/event-bus.ts` — EventBus interface (emit, on, query, command, transaction)
5. `src/engine/kernel/scheduler.ts` — Scheduler interface (registerSystem, tick, pause, resume, timeScale)
6. `src/engine/kernel/entity-manager.ts` — EntityManager interface (create, destroy, get, query, attach, detach)
7. `src/engine/plugin-sdk/manifest.ts` — EnginePluginManifest interface
8. `src/engine/plugin-sdk/plugin.ts` — Plugin interface (id, version, dependencies, init, destroy)

### Grand Architect interfaces (Phase 2, in dependency order)

1. `src/engine/architect/types.ts` — ArchitectTool, ArchitectResource, ArchitectPermission
2. `src/engine/architect/gateway.ts` — ArchitectGateway interface (connect, disconnect, authorize, executeTool)
3. `src/engine/architect/tool-protocol.ts` — ToolRegistry interface (register, dispatch, list, describe)
4. `src/engine/architect/capability-graph.ts` — CapabilityRequirement interface, gap analysis
5. `src/engine/architect/world-oracle.ts` — WorldOracle interface (query, search, explain)
6. `src/engine/architect/decision-ledger.ts` — DecisionRecord interface, ledger

### First reference plugin

`ga:determinism` — wraps the existing `src/lib/determinism/*.ts` into a plugin that:
- Provides the `determinism.rng`, `determinism.transcendentals`, `determinism.hash`, `determinism.serialize` capabilities
- Registers the forbidden-function enforcer
- Registers the fingerprint system
- Registers the verification harness as a conformance test
- Exposes architect tools: `determinism.checkpoint()`, `determinism.verify(hash)`, `determinism.snapshot()`

This is the smallest plugin that proves the kernel contract end-to-end: it loads, registers capabilities, provides services, passes conformance tests, and exposes architect tools.
