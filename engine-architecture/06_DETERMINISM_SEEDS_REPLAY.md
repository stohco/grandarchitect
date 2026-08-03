# 06 — Determinism, Seeds, and Replay

**Status:** Normative. Specifies the determinism contract, the seed hierarchy, the RNG stream allocation, the forbidden functions list, the enforcement mechanism, the fingerprint system, the replay mechanism, the cross-browser verification protocol, and the headless test backend.
**Date:** 2026-08-03

---

## 0. Scope

Determinism is invariant 4.1 of `00_ENGINE_VISION_SCOPE_INVARIANTS.md`: for a fixed `(seed, fingerprint, input sequence)` tuple, the world state at every tick `t` is bit-identical across all conformant engines. This document normative-specifies how that invariant is achieved and enforced.

The existing implementation lives in `src/lib/determinism/` (rng, transcendentals, fixed-point, serialize, hash, fingerprint, harness). This document is the specification; the code is the reference.

---

## 1. The determinism contract

Every plugin that touches simulation state must obey:

1. **No `Math.random()`.** Use `host.rngStream(name)`.
2. **No non-deterministic transcendentals.** No `Math.sin`, `Math.cos`, `Math.tan`, `Math.atan2`, `Math.exp`, `Math.log`, `Math.pow`, `Math.cbrt`, `Math.hypot`, `Math.log2`, `Math.log10`, `Math.expm1`, `Math.log1p`, `Math.sinh`, `Math.cosh`, `Math.tanh`, `Math.asin`, `Math.acos`, `Math.atan`, `Math.asinh`, `Math.acosh`, `Math.atanh` in simulation code. Use `det_*` from the determinism service. (`Math.sqrt` is permitted — it is spec-mandated IEEE-754 round-to-nearest.)
3. **No `Date.now()`, `performance.now()`, `crypto.getRandomValues` in simulation code.** Use `host.tick` for time; use `host.rngStream` for randomness.
4. **No `JSON.stringify` of state that participates in a checkpoint.** Use the engine's CBOR encoder (`src/lib/determinism/serialize.ts`).
5. **No floating-point accumulation in `double` for quantities that must round-trip.** Use Q32.32 fixed-point (`src/lib/determinism/fixed-point.ts`) for positions, integrals, and any state that must survive save/reload with bit-identical result.
6. **No iteration over `Map`/`Set` whose insertion order is observable from another plugin.** Use sorted iteration or `Map` keyed by strings (string-keyed Map iteration order is deterministic across engines per ES2015 spec).
7. **No `Intl`, `toLocaleString`, `toLocaleLowerCase`, or any locale-dependent API in simulation code.** Locale data varies across engines.
8. **No `structuredClone` of state containing `Date`, `RegExp`, `Map` with non-string keys, or `Set`.** Use the CBOR encoder for deep copies.
9. **No `WeakRef`/`FinalizationRegistry` for simulation state.** Finalizer timing is non-deterministic.
10. **State writes go through `host.setState`.** Never mutate state directly.

The contract applies to *simulation* code. Render code may use `Math.*`, `performance.now`, and GPU timing — the GPU is not canonical. UI code may use `Date.now`, `Intl`, and `WeakRef` — the UI is not canonical. The boundary is the `simulation` timing domain.

---

## 2. The seed hierarchy

The world is reconstructed from a single root seed. The seed is hierarchical: each level derives a sub-seed for its children.

```
WorldSeed (string, e.g. "cangli-riverlands-v0.1.0")
   |
   |  seedFromString() → XoshiroState (root RNG)
   v
CosmosSeed = rootStream.nextDouble()
   |
   |  per-stratum substreams
   v
StratumSeed = cosmosStream.nextDouble()
   |
   |  per-region substreams
   v
RegionSeed = stratumStream.nextDouble()
   |
   |  per-village / per-sect substreams
   v
VillageSeed = regionStream.nextDouble()
   |
   |  per-NPC, per-building substreams
   v
EntitySeed = villageStream.nextDouble()
```

### 2.1 Seed derivation

Each level calls `seedFromString(parentSeed + "/" + childName + "/" + childIndex)`. The string is SHA-256-hashed and the first 8 bytes become the BigInt seed for `seedFromBigInt()`. This derivation is deterministic and reproducible: given the WorldSeed, every sub-seed is reconstructible.

```typescript
function deriveChildSeed(parentSeed: string, childName: string, childIndex: number): bigint {
  const childSeedString = `${parentSeed}/${childName}/${childIndex}`;
  const hash = nobleSha256(new TextEncoder().encode(childSeedString));
  let seed64 = 0n;
  for (let i = 0; i < 8; i++) {
    seed64 = (seed64 << 8n) | BigInt(hash[i]);
  }
  return seed64;
}
```

### 2.2 Standard questions (Seed hierarchy)

- **Owns:** the root seed string and the root RNG state.
- **Reads:** nothing. The seed is the input.
- **Modifies it:** nothing. The seed is immutable for a session.
- **Thread:** main thread.
- **Timing domain:** `realtime` (seed is set at session start).
- **Deterministic?** Yes — this is the source of determinism.
- **Saved?** Yes. The seed string is embedded in every save.
- **Versioned?** Via the fingerprint (the RNG algorithm version).
- **Extended by plugins?** Plugins consume sub-seeds via `host.rngStream(name)`. They do not derive seeds directly.
- **Failure?** A seed that fails to parse (empty string, non-UTF-8) is fatal at session start.
- **Reference plugin.** `ga:world-seed` — exposes the seed hierarchy to the headless API.

---

## 3. RNG stream allocation

The determinism service owns the root RNG state. Plugins request *named streams*:

```typescript
interface RngStream {
  nextDouble(): number;            // [0, 1)
  nextIntRange(min: number, max: number): number;  // inclusive
  nextBoolean(p: number): boolean;
  snapshot(): RngSnapshot;
  restore(snap: RngSnapshot): void;
}
```

### 3.1 Stream derivation

A named stream is derived from the root RNG state by drawing a 64-bit seed and creating a fresh `XoshiroState`:

```typescript
function deriveStream(root: XoshiroState, name: string): RngStream {
  // Mix the name into the root state deterministically.
  const nameHash = nobleSha256(new TextEncoder().encode(name));
  // Draw 4 × 64-bit state words from the root, XORed with the name hash.
  // This ensures two streams with different names produce independent sequences,
  // and the same name from the same root produces the same sequence.
  const s0 = xoshiro256starstar_next(root) ^ bytesToBigInt(nameHash, 0);
  const s1 = xoshiro256starstar_next(root) ^ bytesToBigInt(nameHash, 8);
  const s2 = xoshiro256starstar_next(root) ^ bytesToBigInt(nameHash, 16);
  const s3 = xoshiro256starstar_next(root) ^ bytesToBigInt(nameHash, 24);
  return new XoshiroStream({ s0, s1, s2, s3 });
}
```

### 3.2 Stream naming convention

Stream names are namespaced: `pluginId/streamName`. A plugin `ga:combat` might request streams `"ga:combat/attackRoll"`, `"ga:combat/deviationRoll"`, `"ga:combat/lootRoll"`. The name space is flat within a plugin; the kernel does not enforce uniqueness beyond the plugin's responsibility.

### 3.3 Stream isolation

Two streams with different names produce independent sequences. The same name from the same root produces the same sequence. This is the contract that lets plugins reason about RNG without coordinating.

A plugin that calls `host.rngStream("foo")` twice in the same tick gets the *same* stream (the kernel caches streams by name within a tick). A plugin that wants a fresh substream should append a tick or entity ID: `host.rngStream(\`ga:combat/attackRoll/${entityId}/${tick}\`)`.

### 3.4 Standard questions (RNG stream)

- **Owns:** the stream's `XoshiroState`.
- **Reads:** nothing.
- **Modifies it:** the determinism service (on `nextX` calls).
- **Thread:** main thread. Workers receive stream *snapshots* (copies).
- **Timing domain:** `simulation`.
- **Deterministic?** Yes.
- **Saved?** Yes — the stream state is part of every checkpoint.
- **Versioned?** Via the fingerprint's `rng` component.
- **Extended by plugins?** Plugins consume streams; they do not implement them.
- **Failure?** Stream name collision (same name, different plugin) is `warn` (the kernel cannot detect this; it is the plugins' responsibility).
- **Performance budget.** `nextDouble`: < 200 ns (BigInt-backed). `nextIntRange`: < 300 ns. Snapshot: < 1 µs.
- **Tests.**
  - `rng-determinism.test.ts`: same seed → same sequence across 1,000,000 draws.
  - `rng-stream-isolation.test.ts`: two streams with different names produce independent sequences.
  - `rng-snapshot-restore.test.ts`: snapshot → draw 100 → restore → draw 100 → matches the first 100.
- **Reference plugin.** `ga:determinism` — provides the `RngStream` capability.

---

## 4. The forbidden functions list

The complete list of functions forbidden in simulation code. The determinism enforcer traps these in dev mode.

### 4.1 Non-deterministic functions

| Function | Reason | Deterministic replacement |
|---|---|---|
| `Math.random()` | Engine-specific PRNG; not seedable | `host.rngStream(name).nextDouble()` |
| `crypto.getRandomValues()` | Cryptographic randomness; not seedable | `host.rngStream(name)` |
| `Date.now()` | Wall clock | `host.tick` |
| `Date.UTC()` | Time-zone-dependent (in some engines) | `host.tick` |
| `new Date()` | Wall clock | `host.tick` |
| `performance.now()` | High-resolution wall clock | `host.tick` |
| `performance.timeOrigin` | Process start time | `host.tick` |
| `Intl.DateTimeFormat` | Locale data varies across engines | (none; use engine tick) |
| `Intl.NumberFormat` | Locale data varies | (none; format manually) |
| `toLocaleString()` | Locale-dependent | (none; format manually) |
| `toLocaleLowerCase()` | Locale-dependent | `toLowerCase()` |
| `toLocaleUpperCase()` | Locale-dependent | `toUpperCase()` |
| `navigator.userAgent` | Browser-specific | (none; not used in simulation) |
| `navigator.hardwareConcurrency` | Machine-specific | (none; not used in simulation) |
| `navigator.language` | Browser-specific | (none; not used in simulation) |
| `window.devicePixelRatio` | Display-specific | (none; render concern) |

### 4.2 Non-deterministic transcendentals

Per ECMAScript spec, these are "implementation-defined approximations" and differ by 1–3 ULP across V8, SpiderMonkey, and JavaScriptCore. Over a century of in-game time, the divergence compounds.

| Forbidden | Deterministic replacement |
|---|---|
| `Math.sin(x)` | `det_sin(x)` |
| `Math.cos(x)` | `det_cos(x)` |
| `Math.tan(x)` | `det_tan(x)` |
| `Math.asin(x)` | `det_asin(x)` |
| `Math.acos(x)` | `det_acos(x)` |
| `Math.atan(x)` | `det_atan(x)` |
| `Math.atan2(y, x)` | `det_atan2(y, x)` |
| `Math.sinh(x)` | `det_sinh(x)` |
| `Math.cosh(x)` | `det_cosh(x)` |
| `Math.tanh(x)` | `det_tanh(x)` |
| `Math.asinh(x)` | `det_asinh(x)` |
| `Math.acosh(x)` | `det_acosh(x)` |
| `Math.atanh(x)` | `det_atanh(x)` |
| `Math.exp(x)` | `det_exp(x)` |
| `Math.expm1(x)` | `det_expm1(x)` |
| `Math.log(x)` | `det_log(x)` |
| `Math.log1p(x)` | `det_log1p(x)` |
| `Math.log2(x)` | `det_log2(x)` |
| `Math.log10(x)` | `det_log10(x)` |
| `Math.pow(x, y)` | `det_pow(x, y)` |
| `Math.cbrt(x)` | `det_cbrt(x)` |
| `Math.hypot(...xs)` | `det_hypot(...xs)` |

### 4.3 Permitted Math functions

These are spec-mandated IEEE-754 and are safe:

- `Math.sqrt` (spec-mandated IEEE-754 round-to-nearest)
- `Math.abs`, `Math.sign`, `Math.floor`, `Math.ceil`, `Math.round`, `Math.trunc` (integer ops, deterministic)
- `Math.min`, `Math.max` (deterministic)
- `Math.fround` (round to float32, deterministic)
- `Math.clz32`, `Math.imul` (integer ops, deterministic)

### 4.4 Non-deterministic object operations

| Forbidden | Reason |
|---|---|
| `for...in` over an object | Property order is implementation-defined for non-integer keys in older engines; safe in modern engines but discouraged |
| `Object.keys` on an object with non-integer keys | Same as above |
| `JSON.stringify` of state in a checkpoint | Key order is unspecified |
| `Map` with non-string keys, iterated | Iteration order is insertion order, but cross-plugin insertion order is not guaranteed |
| `Set` iterated where insertion order is observable cross-plugin | Same as above |
| `structuredClone` of objects with `Date`, `RegExp`, or non-string-keyed `Map` | Date and RegExp semantics vary; use CBOR |
| `WeakRef` / `FinalizationRegistry` | Finalizer timing is non-deterministic |

### 4.5 The complete forbidden list (count: 38)

The dev-mode enforcer traps these by replacing them on the global / `Math` / `crypto` objects with proxies that throw `DeterminismViolationError`. The list:

```
Math.random, crypto.getRandomValues,
Date.now, Date.UTC, new Date(),
performance.now, performance.timeOrigin,
Intl.DateTimeFormat, Intl.NumberFormat,
String.prototype.toLocaleString, String.prototype.toLocaleLowerCase, String.prototype.toLocaleUpperCase,
Number.prototype.toLocaleString,
navigator.userAgent, navigator.hardwareConcurrency, navigator.language, navigator.devicePixelRatio (alias),
Math.sin, Math.cos, Math.tan, Math.asin, Math.acos, Math.atan, Math.atan2,
Math.sinh, Math.cosh, Math.tanh, Math.asinh, Math.acosh, Math.atanh,
Math.exp, Math.expm1, Math.log, Math.log1p, Math.log2, Math.log10,
Math.pow, Math.cbrt, Math.hypot,
JSON.stringify (in checkpoint paths),
WeakRef, FinalizationRegistry
```

Total: 40 entries (the list above is the canonical enumeration; the enforcer table is generated from it).

---

## 5. Enforcement mechanism

### 5.1 Dev mode

In dev mode (`import.meta.env.DEV`), the determinism service installs traps on the global object before any plugin's `init` is called:

```typescript
function installForbiddenFnTraps() {
  const traps: Array<[object, string, unknown]> = [
    [Math, "random", Math.random],
    [Math, "sin", Math.sin],
    // ... 40 entries
    [globalThis, "WeakRef", WeakRef],
    [globalThis, "FinalizationRegistry", FinalizationRegistry],
  ];
  for (const [obj, key, original] of traps) {
    Object.defineProperty(obj, key, {
      get: () => {
        throw new DeterminismViolationError(
          `Forbidden function ${String(key)} called in simulation context. ` +
          `Use the determinism service equivalent. See 06_DETERMINISM_SEEDS_REPLAY.md §4.`
        );
      },
      configurable: false,
    });
  }
}
```

The traps are installed only in the simulation context. Render code (which runs in a separate evaluation scope or via a render-only PluginHost proxy) is exempt. UI code (which runs in the `realtime` timing domain) is exempt.

### 5.2 Production mode

In production, the traps are not installed (performance cost: ~10% overhead on hot loops). Instead, the determinism service *audits* at checkpoints:

1. Every `N` ticks (default 100), the kernel checkpoints the world state.
2. The checkpoint includes the RNG state, all plugin state slices, and all entity components.
3. The checkpoint is hashed (SHA-256).
4. The hash is compared to the expected hash (if a replay is in progress) or stored for later verification.

If a production run's checkpoint hash diverges from a known-good hash (e.g., from a CI run), the determinism service emits `DeterminismDivergence { tick, expected, actual }`. The divergence is bisected via the per-tick checkpoint log (§7).

### 5.3 Static analysis (lint rule)

A custom ESLint rule (`eslint-plugin-engine-determinism`, future) flags forbidden functions in any file under `src/plugins/**/simulation/**`. The rule is part of the build; a violation fails the build.

This is the third layer of defense: dev-mode traps catch runtime violations, production audits catch silent drift, and the lint rule catches violations before they ship.

---

## 6. The fingerprint system

A save is only valid in an engine that produced it. The `DeterminismFingerprint` records the exact versions of every determinism-affecting component.

```typescript
interface DeterminismFingerprint {
  schemaVersion: string;
  rng: { algorithm: string; version: string };
  transcendentals: { method: string; version: string };
  fixedPoint: { method: string; version: string };
  serialization: { format: string; version: string };
  hash: { algorithm: string; libraries: string };
  generatedAt: string;             // for debugging; NOT part of the equality check
}
```

### 6.1 Current values (v0.1.0)

```typescript
{
  schemaVersion: "0.1.0",
  rng: { algorithm: "xoshiro256** + splitmix64 (BigInt-backed)", version: "0.1.0" },
  transcendentals: { method: "Cody-Waite range reduction + minimax polynomials (fdlibm-derived), pure TS", version: "0.1.0" },
  fixedPoint: { method: "Q32.32 fixed-point, BigInt-backed", version: "0.1.0" },
  serialization: { format: "CBOR RFC 8949 deterministic encoding (cbor-x)", version: "0.1.0" },
  hash: { algorithm: "SHA-256", libraries: "crypto.subtle (async) + @noble/hashes (sync)" },
  generatedAt: "<ISO timestamp>",
}
```

### 6.2 Compatibility check

```typescript
function fingerprintsCompatible(a, b): { compatible: boolean; differences: string[] } {
  // strict equality on all fields except generatedAt
}
```

Two fingerprints are compatible iff every field except `generatedAt` matches. Any difference is fatal: the save is refused, and the operator must either run a migration (if registered) or start a new game.

### 6.3 Why strict equality (not semver)

The fingerprint is *not* a semver version. It is a hash of the determinism-affecting *behavior* of the engine. A change to the RNG algorithm (even a "bug fix" that changes the output sequence) bumps the fingerprint. There is no "compatible" fingerprint except an identical one. This implements invariant 4.5 (no silent compatibility).

### 6.4 Migration

When a fingerprint component changes (e.g., the RNG algorithm is upgraded from xoshiro256\*\* to xoshiro512\*\*), the engine ships a *migration*: a function that transforms a save from the old fingerprint to the new one. Migrations are rare and operator-explicit; they are not auto-applied. The operator runs `engine.migrate(save, fromFingerprint, toFingerprint)` and verifies the result before adopting it.

---

## 7. The replay mechanism

Replay is the process of reconstructing a world state from a seed + an input sequence. It is the *proof* of determinism.

### 7.1 The command log

Every deterministic mutation is recorded as a *command* in the command log. The command log is owned by the persistence kernel and is part of every save. To replay:

1. Start a fresh engine with the save's seed.
2. Replay the command log, in order, against the fresh engine.
3. At each tick, checkpoint and compare to the save's checkpoint.
4. If all checkpoints match, the replay is successful.

### 7.2 What goes in the command log

- AI actions that mutate simulation state.
- UI inputs that mutate simulation state (player movement, ability use, dialogue choices).
- Generator stage outputs (recorded once at world creation).
- Plugin-initiated commands (e.g., a system that triggers a deviation).

### 7.3 What does NOT go in the command log

- Render events (the GPU is not canonical).
- UI events that don't mutate simulation state (camera movement, menu open).
- Diagnostics.
- Asset load completions (assets are content-addressed; the hash is the input).

### 7.4 Replay determinism

A replay is deterministic iff:
- The seed matches.
- The fingerprint matches.
- The command log is replayed in order.
- No non-deterministic input is injected (the enforcer traps catch this).

The replay mechanism is the basis for the cross-browser verification protocol (§9).

---

## 8. Checkpointing

A checkpoint is a SHA-256 hash of the full world state at a given tick. It is the unit of determinism verification.

### 8.1 What is checkpointed

- The tick number.
- The root RNG state (4 × 64-bit words, as hex strings).
- Every plugin's state slice (CBOR-serialized).
- Every entity's component set (CBOR-serialized).
- The entity ID allocator state.
- The spatial node graph (transforms only; world transforms are recomputed).

### 8.2 What is NOT checkpointed

- The definition graph (immutable; re-derived at startup).
- The plugin registry (re-derived at startup).
- The asset cache (content-addressed; re-derived at startup).
- Render state (GPU buffers; not canonical).
- Diagnostics queue (observational, not state).

### 8.3 Checkpoint frequency

Default: every 100 ticks. Configurable via `engine.checkpointInterval`. Lower values increase verification granularity but increase save size.

### 8.4 Checkpoint storage

Checkpoints are stored in a circular log: the last `N` checkpoints (default 100) are retained. Older checkpoints are evicted. The full save (at the latest checkpoint) is stored separately.

### 8.5 Standard questions (Checkpoint)

- **Owns:** the checkpoint log, the current hash.
- **Reads:** the entity registry, every plugin's state slice, the RNG state.
- **Modifies it:** the determinism service (computing the hash); the persistence kernel (storing the log).
- **Thread:** main thread (serialization is synchronous; hashing is sync via `@noble/hashes` or async via `crypto.subtle`).
- **Timing domain:** `simulation`.
- **Deterministic?** Yes — this is the verification.
- **Saved?** Yes — every save embeds the latest checkpoint.
- **Versioned?** Via the fingerprint.
- **Extended by plugins?** No. Plugins register serializers (which the kernel calls); they do not participate in checkpointing directly.
- **Failure?** A serializer that throws aborts the checkpoint; `CheckpointFailed` warn. The engine continues; the next checkpoint may succeed.
- **Performance budget.** Checkpoint (1000 entities, 20 plugins): < 50 ms. Hash: < 5 ms.
- **Tests.**
  - `checkpoint-determinism.test.ts`: 1000 ticks, checkpoint, reload, 1000 ticks, checkpoint; hashes match.
  - `checkpoint-round-trip.test.ts`: save → load → checkpoint; matches pre-save.
- **Reference plugin.** `ga:save` — calls `host.checkpoint()` every 100 ticks and stores the result.

---

## 9. Cross-browser verification protocol

The protocol verifies that the determinism stack produces bit-identical results across browsers.

### 9.1 The harness

The canonical harness is `src/lib/determinism/harness.ts`. It runs a 1000-tick simulation exercising every component of the determinism stack:

1. RNG draws (`nextDouble`, `nextIntRange`, `nextBoolean`).
2. Transcendentals (`det_sin`, `det_cos`, `det_atan2`, `det_exp`, `det_log`, `det_pow`, `det_sqrt`).
3. Fixed-point accumulation (`posX += velX * dt`).
4. CBOR serialization + SHA-256 hashing every 100 ticks.

The harness uses a pinned seed string: `"xianxia-determinism-verification-v0.1.0"`. The final SHA-256 hash is the verification number.

### 9.2 The protocol

1. Run the harness in Chrome (V8). Record the final hash.
2. Run the harness in Firefox (SpiderMonkey). Record the final hash.
3. Run the harness in Safari (JavaScriptCore). Record the final hash.
4. Run the harness in Node.js (V8, server-side). Record the final hash.
5. Run the harness in Bun (JavaScriptCore, server-side). Record the final hash.
6. All five hashes must be bit-identical.

If any hash differs, the determinism stack has a bug. The per-tick checkpoint log (100 checkpoints over 1000 ticks) is used to bisect: find the first tick where the hashes diverge, then identify the operation that produced the divergence.

### 9.3 The headless test backend

The harness runs in any JavaScript environment, but the protocol uses a *headless test backend* — a minimal Node.js or Bun script that:

1. Imports the determinism stack.
2. Runs the harness.
3. Prints the fingerprint and the final hash.
4. Exits.

```bash
# Run in each environment:
node tests/determinism-headless.ts
bun tests/determinism-headless.ts
deno run tests/determinism-headless.ts
# Browser: open /determinism.html in each browser, read the displayed hash.
```

The CI pipeline runs the headless backend on every commit and compares the hash to the pinned expected hash. A mismatch fails the build.

### 9.4 Pinned expected hash

The expected hash is pinned in `tests/determinism-expected.json`:

```json
{
  "fingerprint": { "schemaVersion": "0.1.0", ... },
  "expectedHash": "<64-char hex>",
  "pinnedAt": "2026-08-03",
  "pinnedBy": "determinism-verification-protocol-v0.1.0"
}
```

When the determinism stack changes (algorithm upgrade, bug fix that changes output), the expected hash is updated *and* the fingerprint version is bumped. The two changes are atomic: a commit that updates one without the other fails review.

---

## 10. The headless test backend

The headless backend is the engine's verification infrastructure. It runs the engine without a renderer, advancing the simulation tick-by-tick and checkpointing.

### 10.1 Use cases

- **Century test.** Run the engine headless for 1000 in-game years (≈ 36,500,000 ticks at 60 Hz). Hash the final state. The same seed + same fingerprint must produce the same hash on every browser.
- **Regression test.** Run a fixed scenario (e.g., "Wang Family Bend for 1 in-game year"). Hash the final state. Compare to the pinned expected hash. Catches silent determinism drift between commits.
- **Stress test.** Run with 10,000 entities at S4 tier. Measure tick time. Verify it stays under budget.
- **Fuzz test.** Run with random seeds. Verify no crashes, no determinism violations, no budget exceedances.

### 10.2 The headless API

The headless backend uses the same `HeadlessApi` (`03` §6) as the AI agent. There is no separate "test API." This is intentional: the test backend and the AI agent exercise the same surface, so a test that passes is a guarantee that the AI agent's calls will behave identically.

### 10.3 Standard questions (Headless backend)

- **Owns:** nothing persistent. It is a runner.
- **Reads:** the engine's full state (via the headless API).
- **Modifies it:** the engine's state (via `api.step`, `api.setParams`, `api.executeAction`).
- **Thread:** main thread (Node/Bun) or a dedicated worker (browser).
- **Timing domain:** `realtime` (the backend controls the loop).
- **Deterministic?** The *runs* are deterministic. The *backend* itself is not (it uses `performance.now` for timing measurements, which are not part of the hash).
- **Saved?** The backend saves the final hash and a summary (tick count, duration, peak memory).
- **Versioned?** Via the fingerprint.
- **Extended by plugins?** No. The backend is closed.
- **Failure?** A crash in the backend aborts the run. A determinism violation in the engine fails the run.
- **Reference plugin.** N/A (the backend is not a plugin).
- **Performance budget.** Century test (1000 years, 36.5M ticks): < 1 hour on a 2024 laptop. Regression test (1 year, 36.5K ticks): < 30 seconds.
- **Tests.**
  - The century test *is* the test. It runs in CI nightly.
  - `headless-replay.test.ts`: record a command log, replay it, verify hash match.

---

## 11. Failure cases (consolidated)

| Failure | Detection | Response |
|---|---|---|
| `Math.random()` called in simulation | Dev-mode trap | Fatal: `DeterminismViolation` |
| `Math.sin()` called in simulation | Dev-mode trap | Fatal: `DeterminismViolation` |
| `Date.now()` called in simulation | Dev-mode trap | Fatal: `DeterminismViolation` |
| `JSON.stringify` in checkpoint path | Dev-mode trap (partial) + lint rule | Fatal: `DeterminismViolation` |
| Forbidden function in production (no trap) | Checkpoint divergence audit | `DeterminismDivergence` warn; bisect via checkpoint log |
| Fingerprint mismatch on save load | `fingerprintsCompatible()` | Fatal: `SaveIncompatible` |
| RNG stream name collision | None (kernel cannot detect) | (plugins' responsibility) |
| Checkpoint serializer throws | Runtime | `CheckpointFailed` warn; continue |
| Cross-browser hash mismatch | Verification protocol | P0 bug; bisect; fix; bump fingerprint |
| Replay command log mismatch | Replay mechanism | `ReplayDivergence` warn at the divergent tick |
| Migration missing for save upgrade | Load time | Fatal: `MigrationMissing` |
| Migration throws | Load time | Fatal: `MigrationFailed` |

---

## 12. Rejected alternatives

| Alternative | Why rejected |
|---|---|
| Use `Math.random` and accept non-determinism | Violates invariant 4.1; breaks the century test. |
| Use `crypto.getRandomValues` seeded from the world seed | Cryptographic PRNGs are not seedable in the browser API; we'd need a JS impl anyway. |
| Use WASM for the determinism stack | Adds a build dependency; pure-TS is fast enough for the prototype; verifiable in the browser. WASM is a future optimization. |
| Use `Math.fround` for all simulation math | Loses precision; century-scale accumulation diverges. Fixed-point is the right tool. |
| Allow `Math.sqrt` to be forbidden | `Math.sqrt` is spec-mandated IEEE-754 round-to-nearest; it is deterministic. Forbidding it adds cost without benefit. |
| Use JSON with sorted keys instead of CBOR | JSON cannot represent `Uint8Array`, `Map`, or BigInt natively; CBOR is the right tool. |
| Use `crypto.subtle` as the only hash path | `crypto.subtle` is undefined in non-secure contexts. `@noble/hashes` is the universal fallback. |
| Allow fingerprints to be "compatible" if major versions match | Violates invariant 4.5. Either the behavior is bit-identical or it isn't. |
| Auto-apply migrations on save load | Migrations can change simulation outcomes; the operator must explicitly opt in. |
| Trust the dev-mode traps to catch all violations in production | Dev mode is not production. Production needs the audit-at-checkpoint layer. |
| Use `Proxy` on every plugin's `Math` reference | Performance cost; plugins can shadow `Math` locally. The global trap + lint rule is sufficient. |
| Allow non-deterministic functions in "audit" mode without failing | "Audit" mode is for plugins that cannot be made deterministic (e.g., a future ML plugin). It does not weaken the core contract. |

---

## 13. What this document unlocks

- The kernel's determinism service (`02` §8) has a complete specification: streams, fingerprint, checkpoints, traps.
- The plugin SDK's `deterministicMode` flag (`03` §2) has a defined semantics: `strict` (dev throws), `audit` (production logs at checkpoints), `off` (kernel may refuse to load).
- The save system's fingerprint compatibility check (`02` §10) has a defined equality rule.
- The headless test backend is the verification infrastructure for the century test (the positive experience from `00` §2).

Determinism is invariant 4.1. This document is its specification. The code in `src/lib/determinism/` is its reference implementation. The harness in `src/lib/determinism/harness.ts` is its proof.

---

## 14. Citation

This document honors:
- **Part 1 (Ponytail)** — no compatibility layers (§6.3: strict fingerprint equality); simplest implementation (BigInt over two-Int32-halves); long-term decisions (the determinism stack is the foundation, not an afterthought).
- **Part 2 (Karpathy)** — surgical changes (the determinism stack is a closed subsystem); goal-driven (the goal is the century test).
- **Part 3** — ship the working thing (the harness is the working thing; the century test is the positive experience); cite the precedent (the cross-browser protocol cites V8/SpiderMonkey/JSC by name).
- **Part 4** — the headless backend is the `goal-loop` skill's target: build → test → fix → re-test until the hash matches.

This document violates:
- **Part 3's "Cite the precedent"** — the century test's "< 1 hour" budget is calibrated to a 2024 laptop but not to a specific benchmark. Calibration happens when the century test runs on actual hardware.
