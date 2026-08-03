# 38 — Testing & Plugin Conformance

**Status:** Architecture. The test framework and conformance contract.
**Date:** 2026-08-03

---

## 0. What this document is

The engine's defining property is determinism (doc 17 §3). Determinism is not a runtime property you can verify once; it is a property that must be verified continuously, across every browser, on every commit, for every plugin. This document defines the test framework that does that verification. The framework has seven test classes: unit, integration, determinism, conformance, visual regression, performance, and a seed matrix that multiplies them all. It also defines the headless test backend that lets the whole thing run in CI without a browser window.

The doctrine (AGENTS.md Part 1) says: "Grow the system in layers." The test framework grows in the same order as the engine: determinism tests first (the contract is the foundation), then unit tests per plugin, then integration tests across plugins, then conformance tests for the contract, then visual and performance tests last. The seed matrix is a multiplier, applied to every test class.

The precedent cited (AGENTS.md Part 3): the existing determinism harness at `/public/determinism.html` is the prototype for the determinism test class. It runs 1000 ticks, hashes the result, and asserts the hash is identical in Chrome, Firefox, and Safari. The current hash is `7fde855dc9d17c7ba11c7d40c1dda10535a10dd269af0b37149104c256213f75`. Every test below that asserts determinism is a generalization of that one harness.

---

## 1. The 16 questions

### 1.1 The test framework

The test framework is a thin runner that orchestrates the seven test classes. It is not a general-purpose test framework (we use Vitest for that); it is the engine-specific layer that knows about seeds, fingerprints, and the headless backend.

```typescript
interface TestFramework {
  register(suite: TestSuite): void;
  run(filter?: TestFilter): Promise<TestReport>;
}

interface TestSuite {
  id: string;                    // 'determinism:engine'
  class: TestClass;
  seeds?: number[];              // for the seed matrix (§1.8)
  tests: TestCase[];
}

type TestClass =
  | 'unit' | 'integration' | 'determinism' | 'conformance'
  | 'visual' | 'performance';

interface TestCase {
  name: string;
  fn: (ctx: TestContext) => Promise<void> | void;
  // Budget assertions (for performance tests)
  budget?: TestBudget;
}

interface TestContext {
  // The headless backend (§1.9) — an engine instance without a renderer
  engine: HeadlessEngine;
  // A deterministic RNG seeded from the test's seed
  rng: DetRng;
  // The seed for this test instance (from the seed matrix)
  seed: bigint;
  // Snapshot helpers for visual regression
  snapshot: (name: string) => Promise<void>;
  // Assert helpers that produce deterministic, CBOR-serializable failures
  assert: TestAssert;
}

interface TestReport {
  pass: boolean;
  suites: SuiteResult[];
  // The fingerprint under which the tests ran
  fingerprint: DeterminismFingerprint;
  durationMs: number;
}
```

### 1.2 Unit tests (per-plugin)

Unit tests verify a single plugin in isolation. The test context provides a `HeadlessEngine` with only the plugin under test and its declared dependencies loaded. Every other plugin is stubbed.

```typescript
// Example: a unit test for ga:fog
suite: {
  id: 'unit:ga:fog',
  class: 'unit',
  tests: [
    {
      name: 'density clamps to [0, 1]',
      fn: (ctx) => {
        ctx.engine.api.setParams('ga:fog', { density: 2.0 });
        const params = ctx.engine.api.getParams('ga:fog');
        ctx.assert.equal(params.density, 1.0);
      }
    },
    {
      name: 'state slice is CBOR-serializable',
      fn: (ctx) => {
        const slice = ctx.engine.host.getState('ga:fog');
        const bytes = ctx.engine.host.serialize(slice);
        ctx.assert.ok(bytes.length > 0);
        ctx.assert.equal(ctx.engine.host.deserialize(bytes), slice);
      }
    }
  ]
}
```

Unit tests do not assert determinism directly (that is the determinism test class, §1.3) but they do assert the preconditions: state is serializable, parameters clamp correctly, systems run without throwing. A plugin with failing unit tests cannot progress to integration tests.

### 1.3 Determinism tests (same seed + inputs = same hash, across browsers)

Determinism tests are the engine's distinctive test class. A determinism test runs the engine for N ticks with a fixed seed and a fixed input log, then asserts the final hash matches a known-good baseline hash. The baseline is recorded once (in Chrome, on the lead developer's machine, on the canonical fingerprint) and checked into the repo. Every subsequent run, in every browser, must produce the same hash.

```typescript
interface DeterminismTestCase {
  name: string;
  seed: bigint;
  inputLog: InputLogEntry[];
  ticks: number;
  // Baseline hashes, one per browser. The test passes if the current
  // browser's hash matches its baseline.
  baselines: { chrome: string; firefox: string; safari: string };
  // Optional: hashes at intermediate checkpoints, for the divergence finder
  intermediateHashes?: { tick: number; hash: string }[];
}

// Example: the engine-level determinism test (generalized from /public/determinism.html)
const engineDeterminism: DeterminismTestCase = {
  name: 'engine:1000-ticks',
  seed: 0x...n,
  inputLog: [],                 // no inputs — pure sim
  ticks: 1000,
  baselines: {
    chrome:  '7fde855dc9d17c7ba11c7d40c1dda10535a10dd269af0b37149104c256213f75',
    firefox: '7fde855dc9d17c7ba11c7d40c1dda10535a10dd269af0b37149104c256213f75',
    safari:  '7fde855dc9d17c7ba11c7d40c1dda10535a10dd269af0b37149104c256213f75',
  },
  intermediateHashes: [
    { tick: 100,  hash: '...' },
    { tick: 500,  hash: '...' },
    { tick: 900,  hash: '...' },
  ],
};
```

The intermediate hashes are for the divergence finder (doc 37 §1.6): if the final hash differs, the intermediate hashes pin the divergence to a tick range.

A determinism test failure is a release blocker. There is no "fix it later" — a failing determinism test means a save made in one browser will not load in another, which is a contract violation.

### 1.4 Integration tests (cross-plugin)

Integration tests verify that two or more plugins cooperate correctly. The test context provides a `HeadlessEngine` with all the plugins under integration loaded. Integration tests assert cross-plugin invariants: "after the NPC simulator runs, the combat system sees the updated NPC positions," "after the save system checkpoints, the load system can restore the state and the hash matches."

```typescript
// Example: an integration test for ga:npc-simulator + ga:save
{
  name: 'save and load produces identical hash',
  fn: async (ctx) => {
    ctx.engine.api.step(1000);
    const hashBefore = ctx.engine.host.checkpoint();
    const saveData = ctx.engine.host.serialize(ctx.engine.host.getStateFull());
    // Reset and reload
    ctx.engine.reset();
    ctx.engine.host.loadFromSerialized(saveData);
    const hashAfter = ctx.engine.host.checkpoint();
    ctx.assert.equal(hashAfter, hashBefore);
  }
}
```

Integration tests use the real engine, real plugins, real (deterministic) RNG. They are slower than unit tests but faster than determinism tests because they do not need to run in three browsers — they run in one (Chrome in CI) and rely on the determinism tests for cross-browser coverage.

### 1.5 Conformance tests (does a plugin obey the contract?)

Conformance tests verify that a plugin obeys the determinism contract (doc 17 §3) and the plugin contract (doc 17 §1). They are not written by the plugin author; they are written by the engine team and applied to every plugin, including mods.

```typescript
interface ConformanceTest {
  // The contract being verified
  contract: 'determinism' | 'plugin-lifecycle' | 'state-ownership' | 'event-namespace' | 'permission-declaration';
  test: (ctx: TestContext) => Promise<void>;
}

// Example: the determinism conformance test
const determinismConformance: ConformanceTest = {
  contract: 'determinism',
  test: async (ctx) => {
    // 1. The plugin must not call Math.random
    //    (verified by static analysis at load, but also at runtime in dev mode)
    ctx.engine.devMode = true;
    ctx.engine.api.setParams(ctx.pluginId, { /* exercise all paths */ });
    ctx.engine.api.step(100);
    // If the plugin called Math.random, the dev-mode proxy would have thrown.

    // 2. The plugin's state slice must be CBOR-serializable at every tick
    for (let t = 0; t < 100; t++) {
      ctx.engine.api.step(1);
      const slice = ctx.engine.host.getState(ctx.pluginId);
      const bytes = ctx.engine.host.serialize(slice);
      ctx.assert.ok(bytes.length > 0);
      const restored = ctx.engine.host.deserialize(bytes);
      ctx.assert.deepEqual(restored, slice);
    }

    // 3. The plugin's system must produce identical state across two runs
    ctx.engine.reset();
    ctx.engine.api.step(100);
    const hashA = ctx.engine.host.checkpoint();
    ctx.engine.reset();
    ctx.engine.api.step(100);
    const hashB = ctx.engine.host.checkpoint();
    ctx.assert.equal(hashA, hashB);
  }
};
```

The conformance suite is non-negotiable. A plugin that fails conformance cannot ship. A mod that fails conformance cannot install (the loader runs the conformance suite at install time, doc 35 §2.7).

### 1.6 Visual regression tests (screenshot comparison)

Visual regression tests render a frame and compare it to a baseline screenshot. They are for the renderer, the VFX recipes, the shader chunks — anything where the *output pixels* matter.

```typescript
interface VisualTestCase {
  name: string;
  scene: 'isolated' | 'village-morning' | 'tribulation' | string;
  params: Record<string, Record<string, unknown>>;  // pluginId → params
  camera: { position: [number, number, number]; target: [number, number, number] };
  // The baseline PNG hash (per browser, per GPU tier — pixels are not deterministic
  // across GPUs, only within a GPU family)
  baselines: { chromeDesktop: string; chromeMobile: string; firefoxDesktop: string };
  // Tolerance: max per-channel RMS difference
  tolerance: number;
}
```

Visual tests are explicitly **not** part of the determinism contract. The renderer can use `Math.*` freely (doc 17 §3.1); the GPU is not canonical. Visual tests use a perceptual hash (pHash) plus a per-channel RMS comparison, with a per-test tolerance. Baselines are recorded per browser-family × GPU-tier, not globally.

A visual test failure is not a release blocker but it is a review flag. The CI attaches the diff image to the PR; a human reviews.

### 1.7 Performance tests (frame budget, memory budget)

Performance tests assert that a scenario stays within the budget (doc 39). They run the scenario for N frames, sample the metrics (doc 37 §1.2), and assert the percentiles.

```typescript
interface PerformanceTestCase {
  name: string;
  scenario: 'village-morning' | 'combat-50-npcs' | 'century-headless' | string;
  durationFrames: number;
  budget: {
    frameTimeMs: { p50: number; p95: number; p99: number };
    memoryCanonical: number;     // bytes, max
    memoryGpu: number;           // bytes, max
    entitiesS4: number;          // max
  };
  // The hardware tier the budget applies to (doc 39 §6)
  tier: 'desktop-high' | 'desktop-low' | 'mobile';
}

// Example: the village-morning performance test on desktop-high
const villageMorningPerf: PerformanceTestCase = {
  name: 'village-morning:60fps',
  scenario: 'village-morning',
  durationFrames: 600,           // 10 seconds at 60fps
  budget: {
    frameTimeMs: { p50: 14, p95: 16, p99: 18 },  // 16.67ms = 60fps
    memoryCanonical: 768 * 1024 * 1024,
    memoryGpu: 2 * 1024 * 1024 * 1024,
    entitiesS4: 200,
  },
  tier: 'desktop-high',
};
```

Performance tests are run on a fixed set of CI hardware (one desktop-high, one desktop-low, one mobile emulation). They are not run on developer laptops — local hardware varies too much. A performance test failure is a review flag, not always a release blocker; the team decides whether the regression is acceptable.

### 1.8 The test seed matrix (run the same test with N seeds)

Every determinism, integration, and conformance test is run multiple times with different seeds. The seed matrix is the multiplier that catches seed-specific bugs.

```typescript
interface SeedMatrix {
  // The seeds to run each test with. The default matrix is 8 seeds:
  // 0, 1, 2, 3, 0xDEADBEEF, 0xCAFEBABE, a random seed, and a hash of the
  // current commit (so each commit gets a fresh seed).
  seeds: bigint[];
  // For determinism tests, the baseline hash is recorded per (test, seed, browser).
  // A test passes if all 8 seeds produce their respective baselines.
}
```

A bug that only manifests on certain seeds (e.g., an RNG sequence that produces an edge case) is caught by the matrix. The matrix multiplies test count by 8, which is why the headless backend (§1.9) is essential — the full matrix cannot run in a browser window in reasonable time.

### 1.9 The headless test backend (run without a browser renderer)

The headless backend is a `HeadlessEngine` that runs without a WebGPU device, without a DOM, without requestAnimationFrame. It runs the simulation, the systems, the state, the RNG, the hashing — everything except the pixels. It runs in Node.js (via a Vitest worker) and in the browser (in a Web Worker, for tests that need to run in a real browser engine).

```typescript
interface HeadlessEngine {
  host: PluginHost;              // the real host, no renderer attached
  api: HeadlessApi;              // the real headless API
  devMode: boolean;              // enables the determinism proxy
  reset(): void;                 // reset to initial state, same seed
  // No screenshot() — visual tests use a separate RenderedEngine
  // No requestAnimationFrame — the test calls step() explicitly
}
```

The headless backend runs in two modes:

- **Node mode.** For unit, integration, determinism, and conformance tests. No browser, no WebGPU. Runs in CI in seconds. The hash assertions are valid because the determinism stack is pure JS (BigInt-backed RNG, pure-TS transcendentals, CBOR, SHA-256 via `@noble/hashes`).
- **Browser mode.** For visual tests and browser-specific determinism tests (the cross-browser assertion). Runs in Chrome, Firefox, Safari via Playwright. Slower but necessary.

```
┌──────────────────────────────────────────────────────────┐
│                     Test Runner                            │
│   ┌────────────────┐  ┌────────────────┐                  │
│   │ Node Mode      │  │ Browser Mode   │                  │
│   │ (Vitest worker)│  │ (Playwright)   │                  │
│   │                │  │                │                  │
│   │ • unit         │  │ • determinism  │                  │
│   │ • integration  │  │   (cross-brws) │                  │
│   │ • determinism  │  │ • visual       │                  │
│   │   (single-brws)│  │ • performance  │                  │
│   │ • conformance  │  │                │                  │
│   │ • performance  │  │                │                  │
│   │   (CPU only)   │  │                │                  │
│   └───────┬────────┘  └───────┬────────┘                  │
│           │                   │                            │
│           └─────────┬─────────┘                            │
│                     ▼                                      │
│              HeadlessEngine                                │
│           (no WebGPU, no DOM)                              │
└──────────────────────────────────────────────────────────┘
```

### 1.10 How are baselines recorded and updated?

Baselines (determinism hashes, visual screenshots) are recorded once and checked into the repo. Updating a baseline is a deliberate act:

- **Determinism baseline update.** Run the test in Chrome, Firefox, and Safari. If all three produce the same new hash, the baseline is updated. If they differ, the divergence must be fixed before the baseline can be updated. A baseline update is a code change, reviewed like any other.
- **Visual baseline update.** The CI attaches the new screenshot and the diff to the PR. A human reviews and approves the update. The baseline is per browser-family × GPU-tier.

Baselines are never auto-updated. A silently auto-updated baseline is a silently lost regression.

### 1.11 How are flaky tests handled?

Flaky tests are bugs. The framework does not support "retry on failure" — a flaky test is treated as a failing test until the flakiness is fixed. This is deliberate: in a deterministic engine, flakiness is always either (a) a determinism bug (the test depends on something non-deterministic) or (b) a timing bug (the test depends on wall-clock). Both must be fixed, not papered over.

### 1.12 How are tests run in CI?

CI runs the full matrix on every PR:

1. **Node mode** (fast, ~30 seconds): unit, integration, single-browser determinism, conformance, CPU performance.
2. **Browser mode** (slow, ~5 minutes): cross-browser determinism (Chrome, Firefox, Safari via Playwright), visual regression, GPU performance.
3. **Full seed matrix** (8 seeds, multiplies the above): only on `main` pushes and release tags, not on every PR.

A PR is mergeable when node-mode passes and browser-mode passes (the matrix runs overnight on main).

### 1.13 How does the framework handle the fingerprint?

Every test report records the fingerprint under which it ran. A test that passes on fingerprint X is not valid evidence for fingerprint Y. When the fingerprint changes (e.g., the RNG version bumps), all determinism baselines must be re-recorded. The framework refuses to run determinism tests against a fingerprint with no baselines — it surfaces a "baselines missing for this fingerprint" error and prompts the developer to record new ones.

### 1.14 How are mods tested?

Mods are subject to the conformance suite at install time (doc 35 §2.7). Additionally, mod authors can ship their own test suites (unit, integration) in the mod bundle. The framework runs them in Node mode at install, with the mod's dependencies loaded. A mod whose own tests fail is still installable (the user is warned) but a mod whose conformance tests fails is not.

### 1.15 What is the test-to-engine-code ratio target?

The doctrine (AGENTS.md Part 3) says: "Audit the ratio: every page of apparatus should produce at least one page of experience." For tests, the ratio target is: the test suite should be at least 30% of the engine code by line count, with the determinism and conformance classes being the largest. Tests are not apparatus-for-its-own-sake; they are the apparatus that makes the determinism contract shippable.

### 1.16 How does the framework integrate with the determinism debugger?

When a determinism test fails, the framework automatically invokes the divergence finder (doc 37 §1.6) on the failing test's save log. The divergence report is attached to the CI failure, so the developer does not have to reproduce locally to see *where* the divergence happened. This is the load-bearing integration: a determinism test failure without a divergence report is just "it broke"; with the report, it is "it broke at tick 12345 in plugin X field Y."

---

## 2. The test pyramid

```
                    ┌──────────┐
                    │ Visual + │   ← slowest, browser-only, per-GPU-tier
                    │ Perf     │
                    └────┬─────┘
                ┌────────▼────────┐
                │  Determinism    │   ← cross-browser, baseline-locked
                │  (cross-browser)│
                └────────┬────────┘
            ┌────────────▼────────────┐
            │  Integration +          │   ← multi-plugin, single-browser
            │  Conformance (×8 seeds) │
            └────────────┬────────────┘
        ┌────────────────▼────────────────┐
        │  Unit (per-plugin, ×8 seeds)    │   ← fastest, Node-only
        └─────────────────────────────────┘
```

The pyramid is upside-down by cost: unit tests are the most numerous and the cheapest; visual and performance tests are the fewest and the most expensive. The seed matrix multiplies unit, integration, and conformance; it does not multiply visual (pixels are not seed-dependent) or performance (budgets are not seed-dependent).

---

## 3. Failure cases

| Failure | Detection | Recovery | User sees |
|---|---|---|---|
| Determinism test fails (hash mismatch) | Hash comparison | Block merge; auto-run divergence finder | CI failure with divergence report attached |
| Determinism baseline missing for new fingerprint | Framework check | Refuse run; prompt to record | "No baselines for fingerprint 0.2.0. Record new baselines?" |
| Visual regression exceeds tolerance | pHash + RMS comparison | Flag for review, attach diff | CI warning with diff image |
| Performance test exceeds budget | Percentile check | Flag for review, attach metrics | CI warning with metrics chart |
| Conformance test fails (Math.random used) | Dev-mode proxy throws | Block plugin/mod load | "Plugin X violated determinism contract: Math.random at line Y" |
| Conformance test fails (state not serializable) | CBOR encode throws | Block plugin/mod load | "Plugin X state slice is not CBOR-serializable" |
| Test exceeds time budget | CI timeout | Mark as failed | "Test timed out after 300s" |
| Flaky test (passes on retry) | No retry supported — treated as fail | Must be fixed | "Test is flaky. Fix the determinism or timing bug." |
| Headless engine crashes | Uncaught exception | Capture as test failure | Stack trace + last checkpoint hash |
| Browser not available (Safari in CI) | Playwright launch fails | Skip with warning | "Safari tests skipped. Run locally before merge." |
| Mod's own test suite fails | Mod install-time run | Warn, allow install | "Mod X's tests failed. Install anyway?" |
| Mod's conformance test fails | Mod install-time run | Refuse install | "Mod X violates the determinism contract. Install blocked." |
| Seed matrix finds seed-specific bug | One seed fails, others pass | Block merge | "Test fails on seed 0xDEADBEEF. Investigate." |

---

## 4. Rejected alternatives

- **Jest instead of Vitest.** Rejected: Vitest is faster, has native ESM, and integrates with Vite (which the dev build uses, doc 40 §3). Jest's CommonJS-first model is friction.

- **Retry on flaky tests.** Rejected: in a deterministic engine, flakiness is a bug. Retrying hides the bug. The doctrine (AGENTS.md Part 1) says "Choose the simplest implementation that fully meets the current requirements" — but the requirement here is *determinism*, and retry is a non-deterministic patch for a non-deterministic bug.

- **Running all tests in the browser.** Rejected: the browser is slow, the seed matrix multiplies test count by 8, and most tests do not need a browser. Node mode runs in seconds; browser mode runs in minutes. Splitting them is the cost-effective path.

- **Snapshot testing for state.** Rejected: state is hashable, not snapshot-able. A snapshot is a string comparison; a hash is a 32-byte comparison. The determinism contract is hash-based; the tests should be too.

- **Auto-updating baselines.** Rejected: a silently updated baseline is a silently lost regression. Baseline updates are deliberate, reviewed, and per-fingerprint.

- **A custom assertion library.** Rejected: Vitest's `expect` is sufficient. The framework adds only the engine-specific helpers (determinism assertions, budget assertions, divergence-finder integration).

- **Testing only on the latest Chrome.** Rejected: the determinism contract is cross-browser. A determinism test that only runs in Chrome proves nothing about Firefox or Safari. The browser-mode run is the load-bearing one.

- **Performance tests on developer laptops.** Rejected: local hardware varies. Performance tests run on fixed CI hardware with declared tiers (doc 39 §6). A developer can run them locally for a sanity check, but the merge gate is the CI result.

- **Skipping the conformance suite for engine plugins.** Rejected: engine plugins are not above the contract. The conformance suite applies to `ga:renderer` as much as to a mod's spirit-fox plugin. If the renderer touched canonical state with `Math.random`, the contract would be broken.

---

## 5. What this document enables

A test framework where:
- Every plugin is unit-tested in isolation.
- Every cross-plugin interaction is integration-tested.
- Every determinism claim is verified by hash, in three browsers, on every commit.
- Every plugin (including mods) passes the conformance suite before it ships.
- Every visual change is reviewable as a diff against a baseline.
- Every performance regression is caught against a declared budget, on declared hardware.
- The seed matrix multiplies coverage eightfold without multiplying browser time.
- The headless backend runs the bulk of the suite in Node, in seconds.
- Every determinism test failure comes with a divergence report, automatically.

The next steps:
1. Promote the existing `/public/determinism.html` harness into the determinism test class (it is the first test case).
2. Implement the headless backend in Node mode (smallest end-to-end useful piece).
3. Implement the conformance suite (the four contract tests).
4. Wire the divergence finder into determinism test failures (the load-bearing integration).
5. Add the seed matrix and the browser-mode run via Playwright.
