# Frontier Technology Matrix
## Authorial Grand Architect — Capability Fabric Specification

> **Status:** Authoritative technology selection directive
> **Date:** 2026-08-06
> **Source:** Independent review of durable execution, symbolic planning, constraint solving, versioned knowledge, sandboxed plugins, simulation, planetary rendering, volumetric terrain, asset processing, animation, and verification repositories

---

## Architectural Principle

**The LLM proposes intent and plans. Durable execution, authorization, solvers, transactions, and validators decide what is actually allowed to alter the universe.**

No single repository is the "magnum opus" that becomes the Grand Architect. The optimal system is a carefully composed authorial capability fabric in which each technology performs the job it is best at.

---

## Architecture Diagram

```
You
│
▼
Authorial Grand Architect
├── intent interpretation
├── canon/style/ontology retrieval
├── narrative understanding
├── visual reasoning
└── capability selection
        │
        ▼
Durable Authorial Runtime (Restate)
        │
        ▼
Planning Router
├── Unified Planning      — action and temporal planning
├── OR-Tools CP-SAT       — scheduling, layout, allocation
├── Z3                    — hard laws and invariant checking
├── clingo                — defaults, exceptions and conflicting lore
└── learned planners      — experimental proposal providers only
        │
        ▼
Authorization and Isolation
├── Cedar                 — who may do what
├── Wasmtime/WIT          — low-level plugin boundary
└── Extism                — practical cross-language plugin hosting
        │
        ▼
Canonical StudioActionRegistry
        │
        ▼
World and Asset Runtime
├── Flecs                 — large-scale entity simulation
├── Rapier/Jolt           — embodied physics
├── Recast/Detour         — terrestrial navigation
├── 3DTilesRendererJS     — planetary/global streaming
├── custom sparse SDF     — destructible terrain
└── glTF runtime          — accepted asset delivery
        │
        ▼
Production Providers
├── OpenUSD / MaterialX
├── glTF-Transform / meshoptimizer
├── MHR / Momentum
├── Kimodo / ARDY
├── ozz-animation / ACL
└── OpenVDB / fVDB
        │
        ▼
Verification and Evidence
├── Quint
├── Z3 invariants
├── deterministic engine measurements
├── independent visual review
└── Playwright Chromium + Firefox
```

---

## S-Tier Candidates (Integrate or Benchmark Now)

### 1. Restate — Durable UnboundLoop

| Field | Value |
|-------|-------|
| **Repository** | `restatedev/sdk-typescript` |
| **Pinned Revision** | latest stable (to be pinned at integration) |
| **License** | MIT (SDK); Apache-2.0 (server) |
| **Architectural Role** | Durable authorial runtime — the "nervous system" for UnboundLoop |
| **Integration Mode** | Server-side service + TypeScript SDK client |
| **Maturity** | Production-ready |
| **Hardware Requirements** | Server-side (no browser requirement) |
| **Browser Viability** | N/A (server-side only; browser communicates via API) |
| **Authority Level** | Authoritative workflow state |
| **Expected Advantage** | Survive crashes during planning; wait days for approval; resume failed jobs; idempotency; one serialized writer per world; OpenTelemetry tracing |
| **Benchmark** | Bake-off 1: same reference workflow in Restate vs DBOS. Kill server at every stage, restart, repeat messages, delay providers, cancel jobs, change world revision, test 1000 concurrent workflows |
| **Acceptance Criteria** | Workflow survives crash at every stage; no duplicate side effects; exact recovery point visible; traces complete |
| **Rejection Conditions** | Operational burden exceeds DBOS; recovery fails on any stage; idempotency violations |

**Alternatives:**
1. Restate — Best architectural fit
2. DBOS — Best low-infrastructure alternative (PostgreSQL-backed)
3. Temporal — Best large-distributed-enterprise option

### 2. Unified Planning — Planner-Independent Planning

| Field | Value |
|-------|-------|
| **Repository** | `aibasel/unified-planning` (Python); TS adapter needed |
| **License** | Apache-2.0 |
| **Architectural Role** | Planner-independent planning language — define problems independently of solver |
| **Integration Mode** | Server-side Python service + JSON API to Next.js |
| **Maturity** | Production-ready (Python) |
| **Hardware Requirements** | Server-side Python |
| **Browser Viability** | N/A (server-side) |
| **Authority Level** | Plan construction only — does NOT execute |
| **Expected Advantage** | Translate requests into initial state + goals + actions + temporal constraints + prohibitions; select engines for classical/temporal/numeric planning |
| **Benchmark** | Bake-off 2: multi-solver planning on "Create an ancient declining sword-sect city while preserving the river and village road" |
| **Acceptance Criteria** | Fewer invalid operations than LLM-only; temporal constraints satisfied; replan after world change < 5s |
| **Rejection Conditions** | Cannot express xianxia domain actions; slower than LLM-only; no replan capability |

### 3. OR-Tools CP-SAT — Scheduling and Layout

| Field | Value |
|-------|-------|
| **Repository** | `google/or-tools` (C++/Python); `ortools` npm for JS |
| **License** | Apache-2.0 |
| **Architectural Role** | Constraint-heavy optimization: NPC schedules, settlement layout, room placement, production chains, transport routing, resource allocation |
| **Integration Mode** | Server-side Python OR npm WASM for browser |
| **Maturity** | Production-ready |
| **Hardware Requirements** | Server-side or WASM in browser |
| **Browser Viability** | Yes (WASM build available) |
| **Authority Level** | Optimization solver — proposes configurations |
| **Expected Advantage** | Solve non-overlapping spatial packing, cumulative-resource constraints, scheduling with time windows |
| **Benchmark** | Bake-off 2: place 600 outer-disciple rooms + 80 inner-disciple residences + kitchens + water + training courts subject to constraints |
| **Acceptance Criteria** | Feasible layout found < 10s; all hard constraints satisfied; triangle/draw-call budget respected |
| **Rejection Conditions** | Cannot express xianxia spatial constraints; too slow for interactive use |

### 4. Z3 — Universe-Law Verifier

| Field | Value |
|-------|-------|
| **Repository** | `Z3Prover/z3` (C++); `z3-solver` npm for WASM/JS |
| **License** | MIT |
| **Architectural Role** | SMT theorem prover — enforce hard invariants |
| **Integration Mode** | npm `z3-solver` (WASM) for browser + server |
| **Maturity** | Production-ready |
| **Hardware Requirements** | WASM in browser or server |
| **Browser Viability** | Yes (WASM) |
| **Authority Level** | Invariant checker — says "this operation contradicts the laws" |
| **Expected Advantage** | Verify: entity references valid revision; render/collision/nav same revision; mortal cannot void-survive; forbidden canon not overridden without retcon; committed plan not stale |
| **Benchmark** | Bake-off 2: hard law and revision invariant checking |
| **Acceptance Criteria** | All 7 canonical invariants checkable; violation detected < 100ms; no false positives |
| **Rejection Conditions** | WASM too large for browser; cannot express xianxia invariants; too slow |

### 5. clingo — Lore, Defaults and Exceptions

| Field | Value |
|-------|-------|
| **Repository** | `potassco/clingo` (C++/Python) |
| **License** | MIT |
| **Architectural Role** | Answer Set Programming — non-monotonic reasoning for defaults, exceptions, conflicting lore |
| **Integration Mode** | Server-side Python service + JSON API |
| **Maturity** | Production-ready |
| **Hardware Requirements** | Server-side Python |
| **Browser Viability** | N/A (server-side) |
| **Authority Level** | Lore evaluator — resolves "can_fly(X) :- cultivator(X), realm_at_least(X, core_formation), not flight_suppressed(X)" |
| **Expected Advantage** | Handle conflicting histories, rumors, institutional doctrine, uncertain identities, sect law, technique compatibility, supernatural exceptions |
| **Benchmark** | Bake-off 2: canon defaults, exceptions, institutional rules |
| **Acceptance Criteria** | Correctly resolves flight exceptions (body cultivators, artifacts, natural flight, suppressed realms, formation gravity); handles conflicting rumors |
| **Rejection Conditions** | Cannot express xianxia exception patterns; grounding too slow |

### 6. Cedar — Authorization

| Field | Value |
|-------|-------|
| **Repository** | `cedar-policy/cedar` (Rust); `@cedar-policy/cedar-wasm` npm |
| **License** | Apache-2.0 |
| **Architectural Role** | Purpose-built authorization language — RBAC, ABAC, relationship-based |
| **Integration Mode** | npm WASM for browser + server |
| **Maturity** | Production-ready |
| **Hardware Requirements** | WASM |
| **Browser Viability** | Yes (WASM) |
| **Authority Level** | Authorization boundary — policies separate from code, schema-validated, auditable |
| **Expected Advantage** | Determine: may architect inspect authorial-only mystery? invoke experimental provider? modify canon? execute destructive action? install plugin? access filesystem? |
| **Benchmark** | Bake-off 3: plugin sandbox authorization |
| **Acceptance Criteria** | Every unauthorized action fails; policies auditable; schema-validated; no policy bypass |
| **Rejection Conditions** | WASM too large; cannot express xianxia authorization patterns; performance overhead too high |

### 7. Wasmtime + WIT — Plugin ABI

| Field | Value |
|-------|-------|
| **Repository** | `bytecodealliance/wasmtime` (Rust); `bytecodealliance/wit-bindgen` |
| **License** | Apache-2.0 |
| **Architectural Role** | Low-level plugin boundary — authoritative server-side ABI |
| **Integration Mode** | Server-side Rust service + WIT contracts |
| **Maturity** | Production-ready |
| **Hardware Requirements** | Server-side |
| **Browser Viability** | N/A (server-side) |
| **Authority Level** | Strict capability isolation |
| **Expected Advantage** | Standards-compliant WebAssembly runtime with resource controls, WASI, fuzzing, security processes, Component Model |
| **Benchmark** | Bake-off 3: host malicious test plugin under Wasmtime |
| **Acceptance Criteria** | Filesystem escape blocked; network blocked; process spawn blocked; memory limited; infinite loop killed; world mutation blocked; policy alteration blocked |
| **Rejection Conditions** | Security vulnerabilities found; cannot enforce resource limits |

### 8. Extism — Cross-Language Plugin Hosting

| Field | Value |
|-------|-------|
| **Repository** | `extism/extism` (Rust/JS/Python/Go) |
| **License** | BSD-3-Clause |
| **Architectural Role** | Practical cross-language plugin framework over WebAssembly |
| **Integration Mode** | npm `@extism/extism` for JS |
| **Maturity** | Production-ready |
| **Hardware Requirements** | WASM |
| **Browser Viability** | Yes (JS SDK) |
| **Authority Level** | Provider onboarding (asset processors, experimental plugins) |
| **Expected Advantage** | Faster provider onboarding than raw Wasmtime; supports Rust, JS, Python, Go, C#, C/C++; host controls variables, config, HTTP, timers, limits |
| **Benchmark** | Bake-off 3: practical plugin onboarding |
| **Acceptance Criteria** | Plugin written in Python can be hosted from JS; host controls all capabilities; no direct memory access |
| **Rejection Conditions** | Cannot enforce security boundary; performance overhead too high |

### 9. Quint — Formal Specification

| Field | Value |
|-------|-------|
| **Repository** | `informalsystems/quint` (TypeScript) |
| **License** | Apache-2.0 |
| **Architectural Role** | Executable specification language for temporal logic invariants |
| **Integration Mode** | npm `@informalsystems/quint` |
| **Maturity** | Production-ready |
| **Hardware Requirements** | Node.js |
| **Browser Viability** | N/A (CLI/test runner) |
| **Authority Level** | Formal verification of dangerous invariants |
| **Expected Advantage** | Model: preview never mutates; matching revisions activate together; undo restores prior state; failed provider cannot promote; workflow does not commit twice after restart; retcon never mutates hard canon; only authorized principals commit |
| **Benchmark** | Run Quint specs against engine runtime |
| **Acceptance Criteria** | All 7 canonical invariants modeled; simulation passes; invariant checking passes; counterexamples found and fixed |
| **Rejection Conditions** | Cannot express xianxia invariants; too slow for CI |

### 10. Playwright — Browser Verification

| Field | Value |
|-------|-------|
| **Repository** | `microsoft/playwright` |
| **License** | Apache-2.0 |
| **Architectural Role** | Browser automation for proving Studio operability |
| **Integration Mode** | npm `playwright` (already available via agent-browser) |
| **Maturity** | Production-ready |
| **Hardware Requirements** | Node.js + browser binaries |
| **Browser Viability** | N/A (test harness) |
| **Authority Level** | Evidence collection — traces, network records, DOM snapshots, screenshots |
| **Expected Advantage** | Drive Chromium + Firefox + WebKit through one API |
| **Benchmark** | Full user path: request → grounded target → plan → preview → approval → visible transformation → undo → redo → save → fresh-process reload |
| **Acceptance Criteria** | All steps pass in both Chromium and Firefox; traces captured; no console errors; screenshots before/after |
| **Rejection Conditions** | N/A (mandatory) |

### 11. 3DTilesRendererJS — Planetary Streaming

| Field | Value |
|-------|-------|
| **Repository** | `NASA-AMMOS/3DTilesRendererJS` |
| **License** | Apache-2.0 |
| **Architectural Role** | Distant planetary streaming layer for Three.js/R3F |
| **Integration Mode** | npm `3d-tiles-renderer` |
| **Maturity** | Production-ready |
| **Hardware Requirements** | Browser WebGL2/WebGPU |
| **Browser Viability** | Yes |
| **Authority Level** | Distant streaming (not local terrain truth) |
| **Expected Advantage** | 3D Tiles hierarchy, metadata, plugin system; Mars/lunar/globe/geospatial demos |
| **Benchmark** | Bake-off 5: stand on surface → fly upward → cross atmosphere → observe curvature → enter orbital frame → travel globe → descend |
| **Acceptance Criteria** | Coordinate precision maintained; floating-origin transitions seamless; streaming stable; physics continuous; GTX 1070 frame budget met |
| **Rejection Conditions** | Precision loss; streaming stalls; frame budget exceeded |

### 12. glTF-Transform — Asset Processing

| Field | Value |
|-------|-------|
| **Repository** | `donmccurdy/glTF-Transform` |
| **License** | MIT |
| **Architectural Role** | TypeScript API for reading/editing/validating/writing glTF |
| **Integration Mode** | npm `@gltf-transform/core` + `@gltf-transform/functions` + `@gltf-transform/cli` |
| **Maturity** | Production-ready |
| **Hardware Requirements** | Node.js or browser |
| **Browser Viability** | Yes |
| **Authority Level** | Asset compiler stage |
| **Expected Advantage** | Animation resampling, deduplication, compression, texture processing — far stronger than "LOD = delete smallest faces" |
| **Benchmark** | Asset compiler: SemanticAsset → validated mesh → glTF-Transform → meshoptimizer → KTX2 textures → runtime GLB |
| **Acceptance Criteria** | 50%+ size reduction; no visual quality loss; valid glTF; KTX2 textures |
| **Rejection Conditions** | N/A (near-immediate integration) |

### 13. meshoptimizer — Mesh Optimization

| Field | Value |
|-------|-------|
| **Repository** | `zeux/meshoptimizer` |
| **License** | MIT |
| **Architectural Role** | Mesh simplification, compression, clustered LOD, meshlets, culling |
| **Integration Mode** | npm `meshoptimizer` (WASM) |
| **Maturity** | Production-ready |
| **Hardware Requirements** | WASM |
| **Browser Viability** | Yes |
| **Authority Level** | Asset compiler stage |
| **Expected Advantage** | GPU-oriented optimization; meshlets for Nanite-like rendering; clustered LOD generation — far stronger than "collision proxy = decimated mesh" |
| **Benchmark** | Bake-off 6: character LOD chain |
| **Acceptance Criteria** | LOD chain stable; < 1% popping; draw calls reduced 50%+ |
| **Rejection Conditions** | N/A (near-immediate integration) |

### 14. Rapier — Browser Physics

| Field | Value |
|-------|-------|
| **Repository** | `dimforge/rapier` (Rust); `@dimforge/rapier3d` npm |
| **License** | Apache-2.0 |
| **Architectural Role** | Browser-facing physics runtime |
| **Integration Mode** | npm `@dimforge/rapier3d-compat` 0.19.3 (WASM) |
| **Maturity** | WORKFLOW_PROVEN (2026-08-07: embodied playtest accepted in Chrome/Edge/Firefox; evidence/rapier-playtest/) |
| **Hardware Requirements** | WASM in browser |
| **Browser Viability** | Yes |
| **Authority Level** | Near-term authoritative physics |
| **Expected Advantage** | 2D/3D/f64 variants; maintained JS/TS packages; character capsules, rigid bodies, projectiles, debris, triggers, interaction volumes |
| **Benchmark** | Bake-off 5 + 7: physics continuity during planet traversal; terrain collision |
| **Acceptance Criteria** | 60fps on GTX 1070; deterministic; stable collision; no tunneling |
| **Rejection Conditions** | Performance below 60fps; WASM too large |

---

### 15. Prime Agent — RLM Harness Provider

| Field | Value |
|-------|-------|
| **Repository** | `PrimeIntellect-ai/prime-agent` (pinned revision `10fb172b`) |
| **License** | MIT (fully open source); LLM providers are external subscriptions (separate licenses) |
| **Architectural Role** | Authorial control plane runtime — the "omniscient multiverse Grand Architect" harness (RLM recursion, Continual Harness, persistent goals) |
| **Integration Mode** | Isolated native sidecar: `prime-agent --mode rpc` JSONL over stdin/stdout (implemented: `src/engine/architect/providers/prime-agent/`); alternative: in-process `@earendil-works/pi-coding-agent` (npm 0.84.1, MIT) |
| **Maturity** | EXERCISED (2026-08-07): protocol-compliant JSONL client — framing, command/response correlation, event stream — proven against the documented protocol (12/12 conformance). Prompting BLOCKED until a model is configured (`prime-agent /login`). |
| **Hardware Requirements** | Node runtime for the adapter; sidecar needs its own environment (Python runtime via uv for IPython) |
| **Browser Viability** | No — server-side sidecar only; the browser never talks to it directly |
| **Authority Level** | NONE — editor/architect-time capability; never wired into the shipped runtime |
| **Expected Advantage** | Persistent IPython reasoning, rlm() recursive children, /refine Continual Harness with rollback, persistent goals, bounded /autonomous — mapped 1:1 to the Grand Architect UnboundLoop vision |
| **Benchmark** | RLM recursion budget discipline (Prime Intellect's own findings: recursion helps decomposable large-context work; deeper recursion can reduce performance — the harness must use bounded recursion) |
| **Acceptance Criteria** | Real prompt round-trip in a disposable worktree with a configured provider; child-agent delegation via rlm(); /refine with rollback; bounded autonomous run |
| **Rejection Conditions** | Untrusted code execution without sandboxing; unbounded recursion budgets; credentials in the adapter; running against the host repo root |

**Security boundary (recorded):** Prime Agent executes model-generated code with the user's permissions — its worker/kernel processes are lifecycle isolation, NOT a security sandbox. The provider therefore requires a disposable worktree, refuses the host repo root, is dev-only, and never touches credentials. See `src/engine/architect/providers/prime-agent/prime-agent-provider.ts`.

---

## Pilot After Control Plane Works

| Role | Repository | License |
|------|-----------|---------|
| Versioned canon graph | TerminusDB | Apache-2.0 |
| Massive world simulation | Flecs | MIT |
| Ground navigation | Recast/Detour | zlib |
| Material interchange | MaterialX | Apache-2.0 |
| DCC composition | OpenUSD | Apache-2.0 |
| Sparse volumetric sidecar | OpenVDB/NanoVDB | MPL-2.0 |
| Parametric character | MHR (Momentum Human Rig) | Apache-2.0 |
| IK and retargeting | Momentum | MIT |
| Runtime animation | ozz-animation | MIT |
| Animation compression | ACL | MIT |
| Native high-end physics | Jolt Physics | MIT |

---

## Frontier Lab Only (Experimental)

| Role | Repository | License |
|------|-----------|---------|
| Offline controllable motion | Kimodo | Apache-2.0 (code); model checkpoints separate |
| Interactive streaming motion | ARDY | TBD |
| Physics-trained humanoids | ProtoMotions3 | Apache-2.0 |
| GPU whole-body optimization | cuRoboV2 | Apache-2.0 |
| GPU sparse spatial intelligence | fVDB | Apache-2.0 |
| Incremental dependency compiler | Salsa | Apache-2.0/MIT |
| Huge dynamic graph computation | Differential Dataflow | MIT |
| Graph/expression optimization | egglog | Apache-2.0 |
| **Probabilistic option evaluation** | **STOK** | **RECLASSIFIED — Frontier Lab only, NOT foundational** |
| **Exotic hierarchical time research** | **FDRS** | **RECLASSIFIED — Frontier Lab only, NOT foundational** |

---

## What NOT to Make Foundational

### Agent Frameworks (LangGraphJS, OpenAI Agents SDK, AutoGen)
- **Can host:** intent interpretation, specialist agents, visual critics, lore compilers, capability discovery
- **Must NOT own:** world truth, durable workflow state, transactions, permissions, asset acceptance, physics, canon authority
- Those responsibilities belong to Restate, Cedar, the action registry, authoritative stores, and validators
- AutoGen is in maintenance mode — do not select for new foundation

### MCP (Model Context Protocol)
- **Use for:** external Blender worker, external research provider, model service, repository tool, remote asset generator
- **Do NOT use as:** authoritative internal command protocol between Studio subsystems
- The typed StudioActionRegistry and runtime command contracts remain stronger and more specific

### DSPy
- Promising for optimizing repeated LLM programs (canon extraction, style-compliance classification)
- It is a Python model-program optimization layer — NOT the Grand Architect runtime

---

## Bake-Offs (Ordered)

### Bake-off 1: Durable Grand Architect Execution
Implement the same reference workflow in Restate and DBOS:
```
request → plan → provider job → wait for approval → execute → validate → persist decision
```
During each run: kill server at every stage, restart, repeat messages, delay provider responses, cancel jobs, change world revision, test 1000 concurrent workflows, inspect traces and recovery.
Choose based on correctness and operational burden, not demo brevity.

### Bake-off 2: Multi-Solver Authorial Planning
Use one real request: "Create an ancient declining sword-sect city while preserving the river and village road."
- Unified Planning: action order and temporal dependencies
- OR-Tools: layout, capacities and schedules
- Z3: hard law and revision invariants
- clingo: canon defaults, exceptions and institutional rules
Compare to existing LLM-only plan. Measure: invalid operations, constraint violations, explanation quality, solve latency, replan ability, reproducibility.

### Bake-off 3: Plugin Sandbox
Create one malicious test plugin that attempts: filesystem escape, network access, process spawning, excessive memory, infinite looping, world mutation, policy alteration.
Host under Wasmtime or Extism, authorize through Cedar, prove every unauthorized action fails.

### Bake-off 4: Versioned Canon (Pilot)
Compare TerminusDB with existing persistence model using 100,000 rules + 1,000,000 relationships + branches + retcons + source spans + character-knowledge projections + narrative impact queries.
Do not migrate until it clearly improves branching and provenance.

### Bake-off 5: Planet Traversal
Using 3DTilesRendererJS: stand on surface → fly upward → cross atmosphere → observe curvature → enter orbital frame → travel globe → descend elsewhere.
Test: coordinate precision, floating-origin transitions, streaming, physics continuity, day/night continuity, save/reload, GTX 1070 frame budget.

### Bake-off 6: One Production Character
MHR base body → Grand Architect stylization → equipment/body-hide schema → Momentum fitting and retargeting → Kimodo candidate locomotion → ozz runtime conversion → ACL compression → browser playback.
Prove: modular underwear base, robe/armor fitting, stable sockets, joint deformation, foot contacts, weapon alignment, LOD switching, animation blending, equipment changes without rebuilding identity.

### Bake-off 7: Destructible Planetary Terrain
Planetary streamed terrain → local sparse SDF shell → carve tunnel → local remesh → matching collision rebuild → matching navigation rebuild → walk through → undo → save → fresh-process reload.
OpenVDB/fVDB may generate or process the sparse field externally, but the browser path must remain custom and hardware-appropriate.

---

## Integration Rules

1. **Do not merge all candidates.** Create one isolated worktree and adapter per candidate.
2. **No candidate receives world authority merely because it compiles or registers a capability.**
3. **Do not add UI tabs for these experiments.** Expose through existing Frontier/Diagnostics workspace and canonical action registry.
4. **Do not label a candidate INTEGRATED unless one real authorial workflow uses it and passes its acceptance suite.**
5. **First execute three bake-offs:** Restate vs DBOS, multi-solver planning, Wasmtime/Extism + Cedar sandbox.
6. **Require real failure injection, production builds, exact provenance and Chromium/Firefox evidence.**

---

## Final Judgment

The best foundation is not STOK, FDRS, LangGraph, a world model, or any single autonomous-agent repository.

It is this combination:

- **Restate** for durable authorial execution
- **Unified Planning** for planner-independent action models
- **OR-Tools** for schedules, layouts and resources
- **Z3** for inviolable universe laws
- **clingo** for lore, defaults and exceptions
- **Cedar** for authority and permissions
- **Wasmtime/Extism** for safe capability expansion
- **TerminusDB** for an experimental versioned canon graph
- **Flecs** for large-scale living-world simulation
- **3DTilesRendererJS** for globe-scale streaming
- **OpenVDB/fVDB** for volumetric production research
- **MHR/Momentum/Kimodo/ARDY** for character and motion creation
- **glTF-Transform/meshoptimizer/ozz/ACL** for production runtime assets
- **Quint and Playwright** for proving the system rather than describing it

This gives the Grand Architect something far more powerful than an "AI that knows many tools":

> A durable authorial intelligence that can understand the universe, formally reason about what is possible, optimize complex plans, enforce canon and physical laws, invoke isolated frontier providers, operate the entire Studio through canonical actions, and prove that its changes survived execution, validation, undo and reload.
