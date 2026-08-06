# Engine Module Instructions

Scope: `src/engine/**` (kernel, plugin SDK, architect control plane,
simulation, frontier, studio, production, world, fiberlab).

## Authority

- Engine modules mutate authoritative state **only through the runtime
  command/transaction path** (`src/engine/studio/transactions.ts`,
  `src/engine/kernel/event-bus.ts`).
- React and Zustand are **not** authoritative engine stores. The Zustand
  store at `src/lib/editor/store.ts` is transient UI state only.
- `PhysicsRuntime` (`src/engine/runtime/physics-runtime.ts`) is the
  authoritative physics service. It is a **plain TypeScript class**, not a
  React hook. React reads snapshots; it does not own simulation state.

## Determinism (non-negotiable)

- Do **not** use `Math.random()` in simulation code. Use
  `src/lib/determinism/rng.ts` (LCG).
- Do **not** use `Math.sin`, `Math.cos`, `Math.tan` in simulation code. Use
  `src/lib/determinism/transcendentals.ts`.
- Record source revision on derived artifacts.
- Do **not** activate render, collision, or navigation artifacts from
  mismatched source revisions.
- Fixed timestep: 60 Hz with accumulator and `MAX_SUBSTEPS=4`.

## Plugin architecture

- Plugins register capabilities via
  `src/engine/kernel/capability-registry.ts`.
- Plugin lifecycle is managed by `src/engine/kernel/plugin-host.ts`:
  init, start, stop, checkpoint, verify.
- The architect control plane (`src/engine/architect/`) authorizes tool
  dispatch via `gateway.ts` and logs every dispatch to the tamper-evident
  `audit.ts` chain.
- Authority levels: Observe → Diagnose → Sandbox → Branch → Integrate →
  Release. Never silently expand an agent's own authority.

## Frozen assets

- `corpus-extension/` (Bible) — frozen. No new docs.
- `engine-architecture/` (spec) — frozen. No new docs.
- `src/lib/engine/definitions.ts` — frozen as test fixtures (37 definitions,
  80 relations).

## Required validation

Changes under `src/engine/` require:

1. `bun run lint` (clean, warnings OK).
2. `bun run typecheck` (currently fails on `src/engine/studio/*` — fix
   errors in your changed files; do not add new ones).
3. The relevant conformance test:
   - `src/engine/conformance-test.ts` (top-level)
   - `src/engine/kernel/conformance-test.ts` (37 tests)
   - `src/engine/architect/conformance-test.ts` (113 tests)
   - `src/engine/plugins/reference/conformance-test.ts` (252 tests)
   - `src/engine/plugins/simulation/conformance-test.ts` (247 tests)
   - `src/engine/plugins/simulation/ga-{quest,cultivation,combat}-conformance.ts`
   - `src/engine/studio/conformance-test.ts`
4. A deterministic replay test if you touched simulation or physics.
5. Any affected browser workflow (Rapier, terrain, editor).

## Frontier technology honesty

Frontier technologies use the maturity ladder in
`src/engine/architect/capability-maturity.ts` (13 states). Current honest
states:

| Tech | Maturity |
|------|----------|
| Rapier | INSTANTIATED (debug-level cubes on approximate boxes) |
| Z3 | BLOCKED_RUNTIME_INITIALIZATION (WASM threading) |
| Cedar | EXERCISED (WASM works; policies are rubber stamps) |
| 3D Tiles | IMPORTABLE (no tiles rendered) |
| glTF-Transform | EXERCISED_ON_TRIVIAL_FIXTURE (cube only) |
| Planning Router | SPECIFIED_ONLY |
| Multi-Solver | HARDCODED_REFERENCE_FIXTURE |

**Do not promote maturity without evidence.** A package import is not
integration. An API route that returns 200 is not behavior. A VLM description
is not correctness.

## What NOT to do

- Do not add new top-level subdirectories under `src/engine/` without an
  accepted ADR.
- Do not add a new conformance test that duplicates an existing one.
- Do not register a capability without an owning module.
- Do not use React state in the physics or simulation hot path.
