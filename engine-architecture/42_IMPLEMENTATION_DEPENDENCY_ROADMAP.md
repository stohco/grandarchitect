# 42 — Implementation & Dependency Roadmap

**Status:** Architecture. The phased plan, with exit criteria and the dependency graph.
**Date:** 2026-08-03

---

## 0. What this document is

This is the implementation order. Seven phases, each with a working thing at the end, each with declared exit criteria, each gated on the previous phase's exits. Phase 0 (the determinism stack) is done — the hash `7fde855dc9d17c7ba11c7d40c1dda10535a10dd269af0b37149104c256213f75` is the proof, on the determinism page, identical in Chrome, Firefox, and Safari. Phases 1 through 6 are the work ahead.

The doctrine (AGENTS.md Part 3) is the spine of this plan:

- **"Authorize the smallest end-to-end thing that works."** Each phase ends with a working thing, not a partial thing. Phase 1 ends with a kernel that boots and a plugin that runs. Phase 6 ends with a vertical slice a player can play for an hour.
- **"Ship the working thing before the perfect thing."** The vertical slice (Phase 6) is the load-bearing deliverable. Every prior phase exists to enable it. If a phase's exit criteria are not met, the next phase does not start.
- **"Add exits, not gates."** Each phase has declared exit criteria. The exit is the gate's complement: instead of "you cannot proceed until X," it is "you may proceed once X is demonstrably true." The demonstration is the gate.
- **"State the calendar and the budget."** This document does not name a calendar (that is the project plan's job), but it names the *order* and the *dependencies*. The calendar is the residue of the order and the team's velocity.

---

## 1. The 16 questions

### 1.1 The implementation order

The order is:

- **Phase 0:** Determinism stack. (DONE.)
- **Phase 1:** Kernel + plugin SDK.
- **Phase 2:** Reference plugins (renderer, physics, terrain, animation, VFX).
- **Phase 3:** Simulation systems (NPC, ecology, economy, history).
- **Phase 4:** Game systems (cultivation, combat, quests).
- **Phase 5:** Content generation (definitions, templates, rules).
- **Phase 6:** Vertical slice (One Mortal Morning).

Each phase is a layer on the previous. No phase skips ahead. No phase starts before the previous phase's exit criteria are met.

### 1.2 Phase 0: determinism stack (DONE)

**What it is.** The `src/lib/determinism/` directory: RNG (xoshiro256** + splitmix64, BigInt-backed), transcendentals (Cody-Waite + minimax polynomials, pure TS), fixed-point (Q32.32, BigInt-backed), serialization (CBOR RFC 8949 deterministic encoding), hash (SHA-256 via crypto.subtle + @noble/hashes), fingerprint (the schema-versioned record of every determinism-affecting component).

**Exit criteria (met).**

- The determinism harness at `/public/determinism.html` runs 1000 ticks from a fixed seed and produces a final hash.
- The hash is identical in Chrome (V8), Firefox (SpiderMonkey), and Safari (JavaScriptCore).
- The hash is `7fde855dc9d17c7ba11c7d40c1dda10535a10dd269af0b37149104c256213f75`.
- The fingerprint is recorded and embedded in every save.
- The intermediate checkpoint hashes (every 100 ticks) are also identical across browsers.

**What it proves.** The century-spanning deterministic simulation is possible in a browser, across engines. This is the foundation; everything else is built on it.

### 1.3 Phase 1: kernel + plugin SDK

**What it is.** The `PluginHost` (doc 17 §1.2), the world state store (doc 17 §2), the system scheduler, the event bus, the editor surface registry, the headless API (doc 17 §4), the determinism enforcer (doc 17 §3.2), and the plugin SDK (doc 17 §9). The kernel is itself a plugin (`ga:core`).

```typescript
// Phase 1 deliverables:
interface Phase1Deliverables {
  kernel: PluginHost;            // the core, itself a plugin
  pluginLoader: PluginLoader;    // manifest resolution, dependency topological sort
  headlessApi: HeadlessApi;      // doc 17 §4
  determinismEnforcer: DeterminismEnforcer;  // doc 17 §3.2
  pluginSdk: {
    types: 'ga:core types package';
    examplePlugin: 'ga:fog (promoted from the determinism prototype)';
  };
  editorShell: 'minimal — tweak panel only';
  testFramework: 'doc 38 — unit + determinism classes only';
}
```

**Exit criteria.**

- The kernel boots, loads the `ga:fog` plugin (promoted from the determinism prototype), and runs a system every tick.
- `host.checkpoint()` returns the SHA-256 hash of the full world state.
- Two runs with the same seed + same inputs produce the same hash, in Node mode (doc 38 §1.9).
- The headless API responds to `getParams`, `setParams`, `step`, `screenshot` (placeholder), `save`, `load`.
- The tweak panel renders the `ga:fog` parameters and applies changes in real time.
- The unit-test class and the determinism-test class (single-browser, Node mode) pass.
- The conformance suite (doc 38 §1.5) passes for `ga:fog`.

**What it enables.** Every subsequent phase can build plugins against a stable host. The determinism contract is enforced, not just hoped for. The headless API is the surface the AI agent (and the test framework) uses.

### 1.4 Phase 2: reference plugins (renderer, physics, terrain, animation, VFX)

**What it is.** The five reference plugins that prove the architecture works for real game systems:

| Plugin | What it does | Precedent |
|---|---|---|
| `ga:renderer` | Three.js WebGPU/WebGL2 renderer. Render passes, shadow maps, post-processing. | Three.js docs, doc 17 §5 |
| `ga:physics` | Jolt WASM wrapper + determinism layer. Rigid body, constraints, broadphase. | doc 21 |
| `ga:terrain` | Terrain mesh, brushes, density painting, biome layers. | doc 36 §1.7 |
| `ga:animation` | Animation graph, state machines, blend trees, IK targets. | doc 36 §1.5 |
| `ga:vfx` | VFX recipe runtime, particle emitters, force fields, ribbon trails. | doc 36 §1.6 |

**Exit criteria.**

- `ga:renderer` renders the determinism prototype's scene (the fog + water demo) via the plugin system, not the inlined HTML. Frame time ≤16ms on `desktop-high`.
- `ga:physics` simulates 500 rigid bodies at 60Hz, deterministically. Two runs from the same seed produce the same hash, in Node mode.
- `ga:terrain` renders a 1km × 1km terrain with brushes that write to canonical state. Terrain edits are part of the world hash.
- `ga:animation` plays an animation graph on a skinned mesh. Graph assets are content-addressed.
- `ga:vfx` plays a VFX recipe. Recipes are content-addressed.
- The integration-test class (doc 38 §1.4) passes for every pair of reference plugins.
- The performance-test class (doc 38 §1.7) passes for the `village-morning` scenario on `desktop-high`.

**What it enables.** The engine can render, simulate physics, paint terrain, animate, and emit VFX. This is the "engine" in the ordinary sense — it can make a scene. Phases 3 and 4 build the *game* on top of it.

### 1.5 Phase 3: simulation systems (NPC, ecology, economy, history)

**What it is.** The simulation systems that make the world alive:

| System | What it does | Precedent |
|---|---|---|
| `ga:npc-simulator` | NPC schedules, relationships, qi-state, tier transitions. | doc 17 §6, doc 22 |
| `ga:ecology` | Spirit beasts, herbs, qi topology, food web, seasonal cycles. | doc 14 |
| `ga:economy` | Markets, trade routes, prices, salt licenses, production. | doc 18 |
| `ga:history` | Event recording, demographic aggregation, the S2/S1/S0 tier simulation. | doc 17 §6.2, doc 26 |

**Exit criteria.**

- `ga:npc-simulator` runs 200 S4 NPCs + 500 S3 + 5000 S2 within the 5ms sim budget on `desktop-high`. Tier transitions are deterministic.
- `ga:ecology` simulates a 10km × 10km region's ecology at S2 aggregate, with deterministic seasonal cycles.
- `ga:economy` runs a market simulation with 50 goods, 10 villages, deterministic price evolution.
- `ga:history` aggregates the century-timescale simulation: 1000 years of demography in headless mode, with the S1/S0 tiers. The 1000-year hash is reproducible (this is the "century-absence test" of doc 07 §6.1).
- The determinism-test class passes for each system, in Node mode.
- The conformance suite passes for each system.

**What it enables.** The world is alive: NPCs have schedules, ecologies cycle, economies fluctuate, history accumulates. The player can walk through a world that is doing things without them.

### 1.6 Phase 4: game systems (cultivation, combat, quests)

**What it is.** The game systems the player directly interacts with:

| System | What it does | Precedent |
|---|---|---|
| `ga:cultivation` | Cultivation state machine, realm transitions, tribulation, deviation. | docs 15, 20, 27 |
| `ga:combat` | Combat grammar, frame data, qi reservoir, injury model. | doc 13 |
| `ga:quests` | Quest state machines, triggers, consequences. | doc 26 |

**Exit criteria.**

- `ga:cultivation` models the mortal → Qi Condensation → Foundation → Core Formation realm ladder. Realm transitions are deterministic events.
- `ga:combat` runs the combat grammar (doc 13) with frame data and qi reservoir. Two runs with the same inputs produce the same combat outcomes.
- `ga:quests` runs quest state machines with triggers and consequences. Quest state is part of the canonical state hash.
- The integration-test class passes for `ga:combat` + `ga:cultivation` + `ga:npc-simulator`.
- The conformance suite passes for each system.

**What it enables.** The player can cultivate, fight, and pursue quests. The game loop closes: the player has something to do, the world responds, the consequences persist.

### 1.7 Phase 5: content generation (definitions, templates, rules)

**What it is.** The content authoring and generation systems:

| System | What it does | Precedent |
|---|---|---|
| `ga:definitions` | The definition registry, patch system, conflict resolution. | doc 36 §1.8 |
| `ga:templates` | The template system, instantiation, parameter binding. | doc 36 §1.9 |
| `ga:rules` | The rule engine, predicate evaluation, effect dispatch. | doc 36 §1.10 |
| `ga:gen-settlement` | The settlement generator (consumes lore doc 04). | doc 17 §8.2 |
| `ga:gen-npc` | The NPC generator (consumes lore docs 04, 12). | doc 17 §8.2 |
| `ga:gen-ecology` | The ecology generator (consumes lore doc 14). | doc 17 §8.2 |

**Exit criteria.**

- `ga:definitions` loads canon definitions from lore, applies patches from mods, and surfaces conflicts in the editor.
- `ga:templates` instantiates a template with a seed and produces a deterministic entity set.
- `ga:rules` evaluates a rule's predicate and dispatches its effect, deterministically.
- `ga:gen-settlement` generates Wang Family Bend from the lore (doc 04) and a seed, deterministically. Two runs from the same seed produce the same village, in Node mode.
- `ga:gen-npc` generates the named NPCs of Wang Family Bend (doc 34).
- The world-generator editor (doc 36 §1.4) drives the generators with seed + parameters and previews output.
- The determinism-test class passes for each generator.

**What it enables.** The world is generated from the lore. The engine's claim — "the lore documents ARE the generator configuration" (doc 17 §8.1) — is now demonstrably true.

### 1.8 Phase 6: vertical slice (One Mortal Morning)

**What it is.** The vertical slice: a playable hour in Wang Family Bend, on the morning the protagonist's mortal life ends and their cultivation life begins. The smallest end-to-end working product (per AGENTS.md Part 3).

```typescript
interface VerticalSlice {
  // The scenario: one mortal morning in Wang Family Bend
  scenario: 'one-mortal-morning';
  // The playtime target: 1 hour
  targetPlaytimeMinutes: 60;
  // The first verb: ? (the design corpus says this must be defined before
  // the vertical slice can ship — doc 28 names the village in medias res)
  firstVerb: 'to-be-defined-in-doc-28';
  // The systems exercised (all must be online)
  systems: [
    'ga:renderer', 'ga:physics', 'ga:terrain', 'ga:animation', 'ga:vfx',
    'ga:npc-simulator', 'ga:ecology', 'ga:economy', 'ga:history',
    'ga:cultivation', 'ga:combat', 'ga:quests',
    'ga:definitions', 'ga:templates', 'ga:rules',
    'ga:gen-settlement', 'ga:gen-npc', 'ga:gen-ecology',
  ];
  // The exit: a player can play for an hour, save, reload, and continue.
  exit: 'playable-end-to-end';
}
```

**Exit criteria.**

- A player can launch the engine, generate Wang Family Bend from a seed, and walk through it for an hour.
- The first verb (defined in doc 28) is implemented and feels good (the doctrine: "Design for joy first").
- The player can save and reload; the save loads in Chrome, Firefox, and Safari with the same fingerprint.
- The frame budget holds (p95 ≤ 16ms on `desktop-high`).
- The canonical memory holds (≤ 768 MiB).
- The determinism contract holds (the save's hash reproduces in a headless re-run).
- The mod system works: a content mod (a spirit-fox pack) can be installed and adds a spirit fox to the village.
- The crash recovery works: killing the tab mid-play and reopening offers the checkpoint restore.
- The performance test passes for `one-mortal-morning` on `desktop-high`.

**What it enables.** The doctrine's load-bearing deliverable: "A mortal village that runs in a browser for one hour, with one verb that feels good" (AGENTS.md Part 3). If this ships and feels hollow, the doctrine says "you have learned the most important thing you could learn — and you have learned it now, not after another year of governance."

### 1.9 The dependency graph between phases

```
Phase 0 (DONE)
  │
  │  determinism stack
  ▼
Phase 1
  │
  │  kernel + plugin SDK
  ▼
Phase 2 ────────────────┐
  │  reference plugins   │
  │  (renderer, physics, │
  │   terrain, anim, VFX)│
  ▼                      │
Phase 3 ────────────────┤
  │  simulation systems  │
  │  (NPC, ecology,      │
  │   economy, history)  │
  ▼                      │
Phase 4 ────────────────┤
  │  game systems        │  (all of phase 2-5
  │  (cultivation,       │   feeds phase 6)
  │   combat, quests)    │
  ▼                      │
Phase 5 ────────────────┤
  │  content generation  │
  │  (definitions,       │
  │   templates, rules,  │
  │   generators)        │
  ▼                      │
Phase 6 ◄────────────────┘
   vertical slice
   (one mortal morning)
```

The graph is linear: each phase depends on the previous. There is no parallelism in the *order* (Phase 3 cannot start before Phase 2 ends), but there is parallelism *within* a phase (the five reference plugins in Phase 2 can be built in parallel; the four simulation systems in Phase 3 can be built in parallel).

### 1.10 Within-phase parallelism

| Phase | Parallel tracks |
|---|---|
| 1 | (sequential — the kernel is one piece) |
| 2 | `ga:renderer`, `ga:physics`, `ga:terrain`, `ga:animation`, `ga:vfx` (5 tracks) |
| 3 | `ga:npc-simulator`, `ga:ecology`, `ga:economy`, `ga:history` (4 tracks) |
| 4 | `ga:cultivation`, `ga:combat`, `ga:quests` (3 tracks) |
| 5 | `ga:definitions`, `ga:templates`, `ga:rules`, `ga:gen-settlement`, `ga:gen-npc`, `ga:gen-ecology` (6 tracks) |
| 6 | (sequential — the vertical slice integrates everything) |

The parallel tracks within a phase are independent: each can be built, tested, and merged without blocking the others. The phase ends when all tracks meet their exit criteria.

### 1.11 Cross-phase dependencies (the fine print)

Some Phase N+1 work depends on specific Phase N deliverables:

- Phase 3's `ga:npc-simulator` depends on Phase 2's `ga:animation` (NPCs need to animate).
- Phase 3's `ga:ecology` depends on Phase 2's `ga:terrain` (ecology lives on terrain).
- Phase 4's `ga:combat` depends on Phase 2's `ga:physics` (combat uses physics for hit detection) and Phase 3's `ga:npc-simulator` (combat affects NPCs).
- Phase 5's `ga:gen-npc` depends on Phase 3's `ga:npc-simulator` (the generator produces NPC entities the simulator consumes).
- Phase 6 depends on everything.

These dependencies are why the phases are ordered, not parallel. The within-phase parallelism is real; the cross-phase parallelism is limited to non-dependent work.

### 1.12 What is explicitly deferred?

The doctrine (AGENTS.md Part 1) says "Avoid speculative abstractions." The following are deferred because they are speculative until the vertical slice proves the engine works:

- **The Mahayana Law Author surface** (doc 17 §7.4). This is the endgame meta-editor. It is designed but not built; it depends on the engine being shippable first.
- **The full mod ecosystem** (doc 35). The vertical slice needs only one content mod to prove the mod system works; the full registry, signing infrastructure, and curated portal are post-slice.
- **The cross-century simulation** (1000-year headless). Phase 3's `ga:history` proves the 1000-year hash is reproducible; the *gameplay* of century-spanning play is post-slice.
- **The full determinism debugger UI** (doc 37 §1.6). The backend (divergence finder) is built in Phase 1; the editor UI is built when the first real divergence needs debugging.
- **Mobile and `desktop-low` tier support.** The vertical slice targets `desktop-high`. Lower tiers are post-slice; the tier scaling (doc 39 §6) is designed but not calibrated until the slice runs.

### 1.13 What is the smallest end-to-end thing that works at each phase?

| Phase | Smallest end-to-end thing |
|---|---|
| 0 | The determinism page: 1000 ticks, cross-browser hash. (DONE.) |
| 1 | The kernel boots, runs `ga:fog`, hash reproduces in Node. |
| 2 | A scene renders with physics, terrain, animation, VFX, at 60fps. |
| 3 | A village of 200 NPCs lives for 10 minutes, with ecology and economy running. |
| 4 | The player can cultivate, fight, and pursue a quest, with consequences. |
| 5 | The village generates from lore + seed, deterministically, in the editor. |
| 6 | The player plays One Mortal Morning for an hour, end to end. |

Each phase's smallest thing is shippable as a research artifact, even if the next phase never starts. This is the doctrine's "authorize narrowly scoped prototypes as research artifacts" (Part 3).

### 1.14 How is progress measured?

Each phase's exit criteria are the measurement. The criteria are binary: met or not met. There is no "80% done." The test framework (doc 38) is the arbiter: a phase's exit criteria are met when the relevant test classes pass on the declared hardware.

The dashboards:

- **Phase exit dashboard.** A checklist of exit criteria per phase, with the test results that prove each.
- **Dependency graph dashboard.** The current phase, the tracks in progress, the tracks blocked.
- **Vertical slice readiness dashboard.** A projection: which Phase 6 exit criteria are already met by work in earlier phases, which are not yet started.

### 1.15 What is the calendar?

The doctrine (AGENTS.md Part 3) says "State the calendar and the budget." This document does not name the calendar — that is the project plan's job, and it depends on staffing the doctrine also demands honesty about. What this document names is the *order* and the *dependencies*. The calendar is: Phase 1 starts when staffing is named; each subsequent phase starts when the previous phase's exit criteria are met. The honest answer about how long that takes is the project plan's, not this document's.

### 1.16 What is the exit from the roadmap itself?

The roadmap exits when the vertical slice ships and is played. The doctrine (Part 3) says: "If the valley feels hollow, you have learned the most important thing you could learn." The vertical slice is the valley. After it ships, the next roadmap is written — informed by what the slice taught, not by what this document predicted.

---

## 2. The phase exit-criteria matrix

```
Phase  │ Exit criteria (binary, test-arbitrated)
───────┼──────────────────────────────────────────────────────────────
0      │ ✅ Determinism harness: 1000-tick hash identical in
(DONE) │    Chrome, Firefox, Safari. Hash: 7fde855...
       │
1      │ □ Kernel boots, ga:fog runs
       │ □ host.checkpoint() returns SHA-256 of full state
       │ □ Two runs, same seed + inputs, same hash (Node)
       │ □ Headless API responds to getParams/setParams/step/save/load
       │ □ Tweak panel renders ga:fog params, real-time
       │ □ Unit + determinism test classes pass
       │ □ Conformance suite passes for ga:fog
       │
2      │ □ ga:renderer renders prototype scene via plugin system
       │ □ ga:physics: 500 bodies, deterministic, Node
       │ □ ga:terrain: 1km² terrain, brushes write canonical state
       │ □ ga:animation: graph plays on skinned mesh, content-addressed
       │ □ ga:vfx: recipe plays, content-addressed
       │ □ Integration-test class passes for every plugin pair
       │ □ Performance-test class passes for village-morning (desktop-high)
       │
3      │ □ ga:npc-simulator: 200 S4 + 500 S3 + 5000 S2 in 5ms sim budget
       │ □ ga:ecology: 10km² region, deterministic seasonal cycles
       │ □ ga:economy: 50 goods, 10 villages, deterministic prices
       │ □ ga:history: 1000-year headless, reproducible hash
       │ □ Determinism + conformance classes pass for each
       │
4      │ □ ga:cultivation: mortal → Core Formation realm ladder
       │ □ ga:combat: grammar + frame data + qi reservoir, deterministic
       │ □ ga:quests: state machines, triggers, consequences, hashable
       │ □ Integration-test class passes for combat+cultivation+npc
       │ □ Conformance suite passes for each
       │
5      │ □ ga:definitions: canon load + mod patches + conflict UI
       │ □ ga:templates: instantiate with seed, deterministic entity set
       │ □ ga:rules: predicate eval + effect dispatch, deterministic
       │ □ ga:gen-settlement: Wang Family Bend from lore + seed
       │ □ ga:gen-npc: named NPCs from lore docs 04, 12, 34
       │ □ World-generator editor drives generators, previews output
       │ □ Determinism-test class passes for each generator
       │
6      │ □ Player generates Wang Family Bend, walks it for 1 hour
       │ □ First verb (doc 28) implemented, feels good
       │ □ Save/reload works in Chrome, Firefox, Safari (same fingerprint)
       │ □ Frame budget holds (p95 ≤ 16ms on desktop-high)
       │ □ Canonical memory holds (≤ 768 MiB)
       │ □ Determinism contract holds (hash reproduces headless)
       │ □ Mod system works (spirit-fox content mod)
       │ □ Crash recovery works (kill tab, reopen, restore checkpoint)
       │ □ Performance test passes for one-mortal-morning (desktop-high)
```

---

## 3. Failure cases (what blocks a phase?)

| Blocker | Detection | Recovery | Impact |
|---|---|---|---|
| Phase 1 exit criteria not met (kernel unstable) | Test framework | Do not start Phase 2; fix Phase 1 | Phase 2 delayed |
| Cross-browser determinism breaks (a Phase 2 plugin uses Math.sin) | Determinism test | Block phase exit; fix the plugin | Phase exit delayed |
| Performance budget cannot be met (Phase 3 NPC sim too slow) | Performance test | Reduce entity budget or optimize | Phase exit delayed, or budget revised |
| Asset pipeline cannot produce required assets (Blender version drift) | Asset pipeline build | Pin Blender version; rebuild assets | Phase 2 or 5 delayed |
| Lore-to-schema parser fails on a lore document | Parser test | Fix parser or revise lore | Phase 5 delayed |
| Vertical slice feels hollow (first verb not fun) | Playtest | Revise the first verb; loop (the doctrine's loop) | Phase 6 delayed — this is the doctrine's predicted lesson |
| Staffing insufficient for parallel tracks | Project plan | Serialize the tracks; extend calendar | Phase duration extends |
| A phase's exit criteria are ambiguously met | Test framework | Refine the criteria to be binary | Phase cannot exit until criteria are unambiguous |

---

## 4. Rejected alternatives

- **Parallel phases (skip ahead).** Rejected: the doctrine (AGENTS.md Part 1) says "Grow the system in layers. Start from the smallest version that works end to end, and add each new capability on top of a product that already works." Skipping ahead produces a product that does not work end to end at any intermediate point.

- **Big-bang integration (build everything, integrate at the end).** Rejected: this is the doctrine's explicit failure mode. The vertical slice is the integration point; every prior phase is a partial integration that already works.

- **Phase 6 (vertical slice) before Phase 5 (content generation).** Rejected: the vertical slice needs Wang Family Bend, which needs the generators. Building the slice without the generators means hand-placing the village, which is not the engine's claim ("the lore documents ARE the generator configuration").

- **Phase 5 before Phase 3 (simulation systems).** Rejected: the generators produce entities the simulation systems consume. Building generators first produces entities that nothing simulates.

- **Deferring the determinism contract to "later."** Rejected: this is the engine's defining property. Phase 0 is done first precisely because it is the foundation; deferring it would mean building on sand.

- **Deferring the mod system to post-slice.** Rejected for the *system*, accepted for the *ecosystem*. The mod system (sandbox, signing, conflict resolution) is built in Phase 1 (kernel) and exercised in Phase 6 (one content mod). The full registry and portal are post-slice.

- **Building all reference plugins (Phase 2) before any simulation (Phase 3).** Accepted: this is the plan. The reference plugins are the substrate the simulation runs on. Building simulation before rendering would mean simulating blind.

- **Calibrating budgets (doc 39) before the reference plugins exist.** Rejected: budgets are calibrated against measurements. The Phase 1 budget is provisional; the Phase 2 budget is calibrated; the Phase 6 budget is final. Calibrating earlier would be guessing.

- **A "research mode" gate that blocks production until "measured evidence" is provided.** Rejected: this is the doctrine's explicit failure mode (AGENTS.md Part 3: "A binary 'research / production' gate with a 'measured evidence required' exit is a closed loop if measurement requires code"). The vertical slice is the research artifact that produces the measured evidence. There is no separate research mode; every phase's exit criteria are measured.

- **Skipping the playtest for the vertical slice.** Rejected: the doctrine (Part 3) says "Design for joy first." The playtest is the measurement of joy. A slice that is not playtested is a slice that has not met its exit criteria.

---

## 5. What this document enables

A roadmap where:

- Phase 0 is done. The hash proves it.
- Each subsequent phase has declared, binary, test-arbitrated exit criteria.
- Each phase ends with a working thing, not a partial thing.
- The phases are ordered by dependency, with parallelism within each phase.
- The vertical slice (Phase 6) is the load-bearing deliverable; every prior phase exists to enable it.
- The doctrine's predicted failure mode — "if the valley feels hollow" — is built into the plan as Phase 6's playtest, not as an afterthought.
- The calendar is honest about being the residue of order and staffing, not a number this document invents.
- The roadmap exits when the slice ships and is played; the next roadmap is written after, informed by what the slice taught.

The next steps:

1. **Phase 1 starts.** Staffing is named; the kernel is built; the `ga:fog` plugin is promoted from the determinism prototype; the unit + determinism test classes are wired.
2. **Phase 1 exit criteria are met.** The kernel boots, the hash reproduces, the headless API responds, the conformance suite passes for `ga:fog`.
3. **Phase 2 starts.** The five reference plugins are built in parallel; the integration and performance test classes are wired.
4. **... and so on, through Phase 6.**
5. **Phase 6 ships.** A player plays One Mortal Morning for an hour. The doctrine's lesson is learned.
