# 11 — Persistence, Saves, and Migration

**Status:** Foundation architecture. The save system: canonical format, tiered storage, migration, branching.
**Date:** 2026-08-03
**Engine:** Grand Architect (browser-native plugin host, deterministic contract)
**Depends on:** `ga:determinism` (CBOR, SHA-256, DeterminismFingerprint — `src/lib/determinism/fingerprint.ts`), `ga:core`, `07_SCHEDULER_FRAME_LOOP_TIME_DOMAINS` (tick for checkpoint stamping), `10_EVENTS_COMMANDS_QUERIES_TRANSACTIONS` (input log)
**Read with:** `17_ENGINE_ARCHITECTURE §1.4` (ga:save plugin), `07_PROCEDURAL_GENERATION_IMPLICATIONS §6.3` (determinism infrastructure: SQLite-WASM + OPFS)

---

## 0. What this document is

The save system is the engine's long-term memory. This document specifies the canonical save format (version, fingerprint, tick, seed, inputLog, pluginSlices, hash); the storage substrate (SQLite-WASM over OPFS, with warm OPFS blobs and cold IndexedDB archive); checkpoint frequency and compaction; the per-plugin schema migration hook; save versioning; corruption recovery; the DeterminismFingerprint that gates which engine can load which save; and the branching-save feature that lets a player explore a "what if" without overwriting the parent.

The central tension: **saves must be byte-stable across engine versions (so a player's 100-hour save loads after a patch), but the engine must be free to fix bugs (which change the determinism hash).** The resolution is the DeterminismFingerprint: a save records the exact fingerprint of the engine that produced it, and a save loads only in a fingerprint-compatible engine (or via a documented migration path). When the fingerprint changes, old saves are *flagged* for migration, not silently mis-loaded.

---

## 1. The canonical save format

### 1.1 The save envelope

A save is a single CBOR-encoded document with the following structure:

```typescript
interface SaveEnvelope {
  /** The save format's schema version. Bumped only on incompatible envelope changes. */
  formatVersion: string;            // '0.1.0'
  /** The fingerprint of the engine that produced this save. §6. */
  fingerprint: DeterminismFingerprint;
  /** The fixed tick at which this save was checkpointed. */
  tick: bigint;
  /** The world seed. */
  seed: bigint;
  /** The save's own SHA-256 hash, computed over everything except this field. */
  hash: string;                      // hex
  /** The hash of the parent save (for branches). Null for a root save. */
  parentHash: string | null;
  /** The branch ID. Zero for the mainline; non-zero for branches. §8. */
  branchId: bigint;
  /** The save's human-readable label. */
  label: string;                     // 'Autosave 2026-08-03 14:23'
  /** When the save was created (real time, for the UI only — NOT used by sim). */
  createdAt: string;                 // ISO 8601
  /** Spiral-of-death count since the previous checkpoint. §7 doc 07. */
  spiralDrops: number;
  /** The plugin slices. Each plugin owns one slice. */
  pluginSlices: Record<string, PluginSlice>;
  /** The input log from the parent checkpoint to this tick. May be empty
   *  if this save is itself a checkpoint. */
  inputLog: InputLogEntry[] | InputLogReference;
  /** Asset references: hashes of all assets the save depends on. */
  assetHashes: string[];
  /** Migration metadata. Populated by the migrator. §5. */
  migration: MigrationMetadata | null;
}

interface PluginSlice {
  /** The plugin's ID, e.g. 'ga:npc-sim'. */
  pluginId: string;
  /** The plugin's version, e.g. '0.2.1'. */
  pluginVersion: string;
  /** The schema hash of the plugin's state at save time. */
  schemaHash: string;
  /** The CBOR-encoded state slice. */
  state: Uint8Array;
}

interface InputLogReference {
  /** When the input log is too large to inline, it lives in a separate OPFS blob. */
  blobId: string;                    // 'inputlog-7fde855dc9d17c7b...'
  /** The tick range covered. */
  fromTick: bigint;
  toTick: bigint;
  /** The entry count, for sanity checks. */
  count: number;
  /** The hash of the blob, for integrity. */
  hash: string;
}

interface MigrationMetadata {
  /** The fingerprint the save was originally produced with. */
  fromFingerprint: DeterminismFingerprint;
  /** The fingerprint after migration. */
  toFingerprint: DeterminismFingerprint;
  /** The migration steps applied. */
  steps: MigrationStep[];
  /** When the migration ran. */
  migratedAt: string;
}
```

### 1.2 Why this shape

- **formatVersion** is the envelope's schema. It changes only when the *envelope itself* changes (a new field is added to `SaveEnvelope`). It does *not* change when plugin schemas change — that's `PluginSlice.schemaHash`.
- **fingerprint** gates cross-engine compatibility (§6). A save from fingerprint X loads only in fingerprint X (or via migration).
- **tick** is the canonical replay position. Restoring the save = restoring the state at this tick.
- **seed** is the world seed. It must match the save's parent's seed (branches share the seed).
- **hash** is computed over the CBOR encoding of the envelope *minus the hash field*. This is the determinism proof: two engines that produced the same save produce the same hash.
- **parentHash** enables branching (§8). A branch's parent is the save it forked from.
- **pluginSlices** let each plugin own its serialization. The engine does not know what's inside a slice; it only knows the slice's schema hash.
- **inputLog** is the replay record. For checkpoints (frequent), it's empty. For non-checkpoint saves, it's the log from the previous checkpoint to the save's tick.
- **assetHashes** pin the save's asset dependencies. If an asset's hash changes (the pipeline re-bakes a texture), the save flags a re-download.

---

## 2. SQLite-WASM + OPFS

### 2.1 Why SQLite-WASM

The browser offers several storage options: `localStorage` (small, synchronous, blocked), `IndexedDB` (large, async, key-value), OPFS (large, async, file-like). None of them is a *database* — they are storage. SQLite-WASM (compiled from SQLite via Emscripten) gives the engine a real relational database with transactions, queries, and crash safety, running in the browser.

The project uses the `sqlite-wasm` package with the **opfs-sahpool** VFS, which provides a file-like abstraction over OPFS. This is the only OPFS-backed VFS for SQLite-WASM that supports concurrent read/write without corruption.

### 2.2 The schema

```sql
-- The saves table: one row per save.
CREATE TABLE saves (
  hash           TEXT PRIMARY KEY,        -- SHA-256 hex
  parent_hash    TEXT,                    -- nullable
  branch_id      INTEGER NOT NULL,
  tick           INTEGER NOT NULL,        -- BigInt stored as text
  label          TEXT NOT NULL,
  created_at     TEXT NOT NULL,
  format_version TEXT NOT NULL,
  fingerprint    TEXT NOT NULL,           -- CBOR-encoded
  seed           TEXT NOT NULL,           -- BigInt as text
  spiral_drops   INTEGER NOT NULL,
  envelope_cbor  BLOB NOT NULL,           -- the full SaveEnvelope, minus inputLog
  is_checkpoint  INTEGER NOT NULL,        -- 1 if inputLog is empty
  status         TEXT NOT NULL            -- 'active' | 'archived' | 'corrupt'
);

-- The input log table: one row per log entry.
CREATE TABLE input_log (
  hash        TEXT NOT NULL,              -- the save's hash
  seq         INTEGER NOT NULL,           -- within-tick sequence
  tick        INTEGER NOT NULL,
  kind        TEXT NOT NULL,              -- 'event' | 'command'
  type        TEXT NOT NULL,
  source      TEXT NOT NULL,
  payload     BLOB NOT NULL,              -- CBOR
  result      BLOB,                       -- CBOR, for commands
  PRIMARY KEY (hash, seq)
);

-- The asset reference table: hashes that a save depends on.
CREATE TABLE save_assets (
  save_hash TEXT NOT NULL,
  asset_hash TEXT NOT NULL,
  PRIMARY KEY (save_hash, asset_hash)
);

-- The branch table: metadata for branches.
CREATE TABLE branches (
  branch_id    INTEGER PRIMARY KEY,
  parent_hash  TEXT NOT NULL,
  fork_tick    INTEGER NOT NULL,
  label        TEXT NOT NULL,
  created_at   TEXT NOT NULL
);

-- The migration registry: which migrations have been applied.
CREATE TABLE migrations (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  save_hash    TEXT NOT NULL,
  plugin_id    TEXT NOT NULL,
  from_version TEXT NOT NULL,
  to_version   TEXT NOT NULL,
  applied_at   TEXT NOT NULL
);
```

### 2.3 Why one table for saves, not one row per slice

Slices are stored *inside* the `envelope_cbor` BLOB, not in a separate `slices` table. This is because the save's hash is computed over the full envelope (including slices), and SQLite's row-level atomicity guarantees the envelope is written atomically. A separate `slices` table would require a multi-row transaction for one save, with no benefit (we never query slices independently).

---

## 3. Tiered storage

```
┌──────────────────────────────────────────────────────────────────┐
│                    TIERED STORAGE                                │
│                                                                  │
│  HOT      ── SQLite-WASM + opfs-sahpool VFS                     │
│     ▼        • The most recent N saves (default N=20)           │
│  ┌──────┐   • The active branch's input log                     │
│  │ OPFS │   • The current world state (for fast resume)         │
│  └──────┘   Access: ms                                      │
│                                                                  │
│  WARM     ── OPFS blobs (raw files, not SQLite)                  │
│     ▼        • Older saves (N+1 to N+100)                       │
│  ┌──────┐   • Larger input log segments                         │
│  │ OPFS │   • Asset blobs (glTF, KTX2, meshopt)                 │
│  └──────┘   Access: ms                                      │
│                                                                  │
│  COLD     ── IndexedDB                                            │
│     ▼        • Archived saves (N+100+)                          │
│  ┌──────┐   • Compacted input logs (after checkpoint)           │
│  │ IDB  │   • Old asset versions (for migration)                │
│  └──────┘   Access: 10-100 ms                                │
│                                                                  │
│  DOWNLOAD ── Export to user's filesystem                          │
│     ▼        • Manual backup as a .ga-save file (CBOR + assets) │
│  ┌──────┐   • Encrypted with a user-provided passphrase         │
│  │ FS   │   Access: user-initiated                             │
│  └──────┘                                                      │
└──────────────────────────────────────────────────────────────────┘
```

### 3.1 Hot tier

The hot tier is the SQLite database itself, backed by the opfs-sahpool VFS. It holds the most recent 20 saves (configurable) and the active branch's full input log. Reads and writes are sub-millisecond. This is the tier the engine reads on resume.

### 3.2 Warm tier

The warm tier is OPFS blobs (raw files accessed via `FileSystemSyncAccessHandle` from the persistence worker). It holds older saves (positions 21–100) and large input-log segments that were compacted out of the hot tier. Access is still sub-millisecond (OPFS is fast) but the engine must explicitly fetch a blob into the hot tier before reading it.

### 3.3 Cold tier

The cold tier is IndexedDB. It holds archived saves (100+) and compacted input logs. IndexedDB is slower (10–100 ms per read) but has a much larger quota than OPFS (typically multiple GB vs. OPFS's few-hundred-MB practical limit). The engine moves saves from warm to cold on a least-recently-accessed basis.

### 3.4 Downloadable backup

The player can export any save to a `.ga-save` file. The file is a self-contained CBOR envelope plus the asset blobs it depends on, encrypted with a user-provided passphrase (AES-GCM via `crypto.subtle`). The file can be imported on any engine instance (same or different browser, same or different machine), restoring the save and its asset dependencies.

---

## 4. Checkpoint frequency and compaction

### 4.1 Checkpoint frequency

The engine checkpoints every **60 fixed ticks** (one strategic tick, ~1 second of gameplay). Each checkpoint is a full `SaveEnvelope` with an empty `inputLog`. The input log between checkpoints is appended to the hot tier's `input_log` table.

Between checkpoints, the engine keeps a *rolling* input log in memory and flushes it to SQLite at each checkpoint. If the tab crashes, the engine recovers from the most recent checkpoint + the in-memory log's flushed tail (the persistence worker flushes every 10 ticks).

### 4.2 Compaction

Every **3600 fixed ticks** (~1 minute of gameplay), the engine compacts:

1. Take a new full checkpoint at the current tick.
2. Discard all input-log entries between the previous checkpoint and this one.
3. Move the previous checkpoint to the warm tier (if it's > 60 seconds old) or cold tier (if > 10 minutes old).

Compaction keeps the hot tier's `input_log` table small (typically < 60 entries). The trade-off: a save taken between checkpoints requires replaying the input log from the most recent checkpoint, which is at most 60 ticks (~1 second of replay).

### 4.3 The compaction worker

Compaction runs on the PERSISTENCE worker (doc 08). It does not block the sim. The worker receives a "compact" command, takes a snapshot of the current state (read from the frame ring buffer), serializes it to CBOR, hashes it, and writes the new checkpoint to SQLite. The sim continues running during compaction; the next checkpoint simply uses the post-compaction state.

---

## 5. Schema migration

### 5.1 The per-plugin migrate hook

Each plugin can register a `migrate` function:

```typescript
interface PluginMigration {
  /** The plugin this migration applies to. */
  pluginId: string;
  /** The version this migration migrates FROM. */
  fromVersion: string;
  /** The version this migration migrates TO. */
  toVersion: string;
  /** The schema hash this migration expects as input. */
  fromSchemaHash: string;
  /** The schema hash this migration produces. */
  toSchemaHash: string;
  /** The migration function. Takes the old state, returns the new state. */
  migrate(oldState: Uint8Array, ctx: MigrationContext): Uint8Array;
  /** Whether this migration is reversible. */
  reversible: boolean;
  /** If reversible, the downgrade function. */
  downgrade?: (newState: Uint8Array, ctx: MigrationContext) => Uint8Array;
}

interface MigrationContext {
  /** The tick at which the save was created. */
  tick: bigint;
  /** The world seed. */
  seed: bigint;
  /** A deterministic RNG, seeded from (seed, tick, pluginId). */
  rng: RngSubstream;
  /** A logger. */
  log: (level: 'info' | 'warn' | 'error', message: string) => void;
}
```

### 5.2 The migration algorithm

When the engine loads a save whose fingerprint differs from the current engine's fingerprint, the migrator:

1. Computes the *path* from the save's fingerprint to the current engine's fingerprint, by chaining `PluginMigration` records.
2. For each plugin slice in the save, finds the migration chain for that plugin.
3. Applies each migration in order. Each migration's `migrate` function takes the previous state (as CBOR bytes) and returns the new state (as CBOR bytes).
4. After all migrations, the save's fingerprint is updated to the current engine's fingerprint. The save's `migration` metadata records the chain applied.
5. The migrated save is written back to SQLite as a *new* save (the original is preserved for fallback).

### 5.3 Why migrations are explicit (not auto-derived)

A migration that adds a field with a default value *could* be auto-derived. But a migration that splits a field, merges two fields, or changes a field's semantics (e.g., "age was in years, now in days") cannot. The engine requires explicit migrations for *every* schema change. This is more work for plugin authors, but it eliminates the "silent mis-load" failure mode that the DeterminismFingerprint exists to prevent.

### 5.4 Migration failure

If a migration throws, the engine:

1. Marks the save as `status = 'corrupt'`.
2. Logs the error and the migration step that failed.
3. Offers the player the choice: revert to the pre-migration save (which loads in the old engine, if available), or abandon the save.

The engine never silently loads a partially-migrated save.

---

## 6. Save versioning and the DeterminismFingerprint

### 6.1 The fingerprint

From `src/lib/determinism/fingerprint.ts`:

```typescript
interface DeterminismFingerprint {
  schemaVersion: string;
  rng: { algorithm: string; version: string };
  transcendentals: { method: string; version: string };
  fixedPoint: { method: string; version: string };
  serialization: { format: string; version: string };
  hash: { algorithm: string; libraries: string };
  generatedAt: string;  // for debugging only
}
```

The fingerprint records the exact versions of every determinism-affecting component. A save from fingerprint X loads only in an engine with fingerprint X (strict equality, ignoring `generatedAt`).

### 6.2 When the fingerprint changes

The fingerprint changes when *any* of its components change:
- The RNG algorithm or version (e.g., xoshiro256\*\* 0.1.0 → 0.2.0)
- The transcendentals method or version (e.g., Cody-Waite → a new polynomial)
- The fixed-point method or version
- The serialization format or version
- The hash algorithm

When the fingerprint changes, *all* existing saves are flagged for migration. The migration system must provide a path from the old fingerprint to the new one. If no path exists, the saves are unreadable in the new engine (the player is informed; they can keep using the old engine).

### 6.3 The fingerprint contract

The fingerprint is the *only* thing that determines save compatibility. Plugin versions, asset versions, and engine versions are *not* part of the fingerprint — they are handled by the per-plugin migration system (§5) and the asset hash system (§1.1's `assetHashes`).

This separation is deliberate: the fingerprint is the *determinism* boundary; plugin versions are the *schema* boundary; asset hashes are the *content* boundary. Three independent systems, three independent migration paths.

---

## 7. Corruption recovery

### 7.1 Detection

The engine detects corruption in three ways:

1. **Hash mismatch.** When loading a save, the engine recomputes the hash of the envelope (minus the hash field). If it doesn't match `SaveEnvelope.hash`, the save is corrupt.
2. **CBOR decode failure.** If the envelope's CBOR cannot be decoded, the save is corrupt.
3. **Schema hash mismatch without migration.** If a plugin slice's `schemaHash` does not match the current engine's schema hash *and* no migration is registered, the save is unreadable (a special case of corruption).

### 7.2 Recovery

```
Save fails to load
  → engine checks: is there a parent save?
    → YES: load the parent, replay the input log to the failed save's tick.
       If replay succeeds, use the replayed state (the failed save's data is lost;
       the parent + log is the recovery).
       If replay fails: recurse to the parent's parent.
    → NO (the failed save is a root): mark as corrupt; offer the player
       "start a new world with the same seed" (the world's seed is recoverable
       from the save's `seed` field even if the state is not).
```

### 7.3 The checkpoint guarantee

Because the engine checkpoints every 60 ticks and flushes the input log every 10 ticks, the worst-case data loss on tab crash is **10 ticks** (~166 ms of gameplay). The player might lose a single input event; the world state is recoverable from the most recent checkpoint + the flushed log tail.

### 7.4 The backup recommendation

The engine recommends the player export a `.ga-save` backup at session boundaries (the UI nags after 30 minutes of unsaved play). The backup is encrypted and self-contained; it survives browser data clearing and machine changes.

---

## 8. Branching saves

### 8.1 The branch concept

A branch is a fork of the input log at a chosen tick. The player can create a branch, play it forward, and the parent save is untouched. Branches share the world seed but diverge from the fork tick onward.

```
Parent save (tick 60000, hash H_parent)
   │
   ├── player creates branch "what if I joined the sect?"
   │     → branch_id = 1, parent_hash = H_parent, fork_tick = 60000
   │     → new saves in branch 1 are stamped branch_id = 1
   │     → branch 1's input log is empty at fork; grows as the player plays
   │
   ├── player creates branch "what if I refused the teacher?"
   │     → branch_id = 2, parent_hash = H_parent, fork_tick = 60000
   │     → ...
   │
   └── mainline continues
         → branch_id = 0
         → parent_hash = H_parent (still)
         → tick 60001, 60002, ...
```

### 8.2 The branch interface

```typescript
interface BranchApi {
  /** Create a new branch from a save. */
  createBranch(parentHash: string, forkTick: bigint, label: string): BranchId;
  /** List all branches. */
  listBranches(): BranchInfo[];
  /** Switch the active branch. The sim loads the branch's latest save. */
  switchBranch(branchId: BranchId): Promise<void>;
  /** Merge a branch back into the mainline. DANGEROUS — see §8.4. */
  mergeBranch(branchId: BranchId, strategy: 'fast-forward' | 'three-way'): Promise<MergeResult>;
  /** Delete a branch. Its saves are moved to the cold tier for 30 days, then purged. */
  deleteBranch(branchId: BranchId): Promise<void>;
}

interface BranchInfo {
  branchId: BranchId;
  parentHash: string;
  forkTick: bigint;
  label: string;
  createdAt: string;
  /** The latest save in this branch. */
  latestSaveHash: string;
  latestSaveTick: bigint;
}
```

### 8.3 Branch determinism

Branches are deterministic: a branch's state at tick N (N > forkTick) is a function of (parent state at forkTick, branch's inputLog[forkTick..N]). Two players who create the same branch and play the same inputs see the same state.

The branch's entity IDs (doc 09 §2) carry the branch ID in the high 64 bits, so entities created in different branches never collide. An entity from the parent (referenced by ID in the branch) is *read-only* in the branch's sim — the branch cannot mutate the parent's entity, only its own copy.

### 8.4 Why merging is dangerous

Merging a branch back into the mainline is the one operation that can break the input-log invariant: the merge introduces state that is *not* a function of (parent state, mainline inputLog). The engine supports only two merge strategies:

- **Fast-forward**: the mainline has not advanced since the branch forked. The branch's input log simply appends to the mainline's. No conflicts.
- **Three-way**: the mainline has advanced. The merge replays both branches' input logs from the fork tick, attempting to interleave them. Conflicts (two events writing the same component) are reported to the player, who must resolve them manually (choose which side wins).

Three-way merge is *not* guaranteed to produce a deterministic state — it's a player-driven operation, not a sim invariant. The merge result is saved as a *new* save (not a checkpoint), with a special `mergeResult: true` flag, so the engine knows its input log is not a simple linear replay.

---

## 9. 16 questions answered

1. **What is this system?** The save system: canonical CBOR envelope, SQLite-WASM + OPFS tiered storage, per-plugin migration, DeterminismFingerprint gating, branching.

2. **What problem does it solve?** Saves must be byte-stable across versions, but the engine must be free to fix bugs. The fingerprint + migration system makes this an explicit, detectable transition instead of a silent mis-load.

3. **Core abstractions?** `SaveEnvelope`, `PluginSlice`, `InputLogEntry`, `InputLogReference`, `DeterminismFingerprint`, `PluginMigration`, `MigrationContext`, `BranchInfo`, `MergeResult`.

4. **Data flow?** Sim runs → checkpoint every 60 ticks → PERSISTENCE worker serializes slices + input log → CBOR encode → SHA-256 hash → SQLite write (hot) → age out to warm/cold. On load: SQLite read → CBOR decode → fingerprint check → migrate if needed → restore slices → replay input log to target tick.

5. **Lifecycle?** Save created (checkpoint or manual) → active (hot tier) → aging (warm tier) → archived (cold tier) → exported (downloadable backup) → deleted (after 30-day grace period in cold tier).

6. **Invariants?** (a) A save's hash is reproducible across browsers. (b) A save loads only in a fingerprint-compatible engine (or via migration). (c) Checkpoint every 60 ticks; flush every 10 ticks; worst-case crash loss is 10 ticks. (d) Branches are deterministic; merges are player-driven and flagged.

7. **Inputs?** The sim state (from the frame ring buffer), the input log (from the event bus), the asset hashes (from the asset worker), the fingerprint (from `ga:determinism`).

8. **Outputs?** Save files in SQLite/OPFS/IndexedDB, exported `.ga-save` files, migration reports, branch listings.

9. **Failure modes?** Hash mismatch (corruption), CBOR decode failure (corruption), schema mismatch without migration (unreadable), OPFS quota exceeded (move to cold tier; if full, halt with SaveFailure), migration throw (mark corrupt; offer parent fallback), branch merge conflict (player resolves).

10. **Performance budget?** Checkpoint write < 4 ms (amortized). Compaction < 50 ms (runs on PERSISTENCE worker, does not block sim). Save load < 100 ms (hot tier) or < 1 s (cold tier). Migration < 1 s per plugin slice.

11. **Test requirements?** Hash reproducibility across browsers, fingerprint compatibility check, migration idempotence (migrate forward then back = original), checkpoint+replay = full state, branching determinism, corruption recovery from parent, OPFS quota exhaustion handling.

12. **Extension points?** Plugins register `PluginMigration` records. New storage tiers require a core-engine change (the four tiers are closed). New merge strategies require a core-engine change (the two are closed).

13. **Security/isolation?** Saves are encrypted at rest (OPFS-level, optional). Downloadable backups are AES-GCM encrypted with a user passphrase. The PERSISTENCE worker is the only writer to SQLite; the sim never touches SQLite directly. Untrusted plugins cannot register migrations (migrations are core-engine-trusted).

14. **Rejected alternatives?** (a) JSON saves — rejected because JSON key ordering is not deterministic across engines. (b) One file per save — rejected because OPFS file count is limited and SQLite's transactional semantics are better. (c) Server-side saves — rejected because the engine is browser-native; the player owns their saves. (d) Auto-derived migrations — rejected because they cannot handle semantic changes. (e) Save stacking (each save is a delta from the previous) — rejected because delta chains break if any link is corrupt; checkpoints + input log is more robust. (f) Branchless saves (only mainline) — rejected because the player wants to explore "what if" without losing progress; branches are the genre's save-scumming made honest.

15. **Dependencies?** Depends on `ga:determinism` (CBOR, SHA-256, fingerprint), `ga:core`, `07_SCHEDULER` (tick boundaries), `10_EVENTS` (input log). Depended on by every gameplay plugin (for state serialization) and the WebSocket API (for `save()`/`load()`).

16. **What this enables?** 100-hour playthroughs that survive engine patches; branching exploration without loss; crash recovery with < 200 ms of lost play; cross-machine transfer via encrypted backup; and the AI's century-absence test (doc 17 §6.1), which runs the sim for 1000 years and checkpoints every strategic tick.

---

## 10. Test requirements (detailed)

### 10.1 Hash reproducibility

Create a save on Chrome. Read the raw bytes from OPFS. Repeat on Firefox and Safari. Assert byte-identical envelopes (modulo `createdAt`).

### 10.2 Fingerprint compatibility

Create a save with fingerprint X. Attempt to load in an engine with fingerprint Y (X ≠ Y). Assert the load is rejected with `FingerprintMismatch`. Assert the migrator is invoked.

### 10.3 Migration idempotence

For each registered migration, migrate a fixture save forward, then downgrade. Assert the result is byte-identical to the original (for reversible migrations). For non-reversible migrations, assert the forward-only path is documented.

### 10.4 Checkpoint + replay = full state

Run a 1000-tick sim. Checkpoint at tick 500. Continue to tick 1000. Restore the checkpoint at tick 500. Replay the input log to tick 1000. Assert the final state's hash matches the original sim's hash at tick 1000.

### 10.5 Branching determinism

Create a branch at tick 500 of a 1000-tick sim. Play the branch forward 500 ticks with a fixed input sequence. Repeat on a second browser. Assert the branch's final hash is identical.

### 10.6 Corruption recovery

Manually corrupt a save's `envelope_cbor` (flip one byte). Attempt to load. Assert the engine detects the corruption, falls back to the parent save, and replays the input log. Assert the recovered state matches the parent + log replay.

### 10.7 OPFS quota exhaustion

Fill OPFS to 95% capacity. Run the sim until the next checkpoint fails. Assert the engine moves older saves to the cold tier (IndexedDB) and retries the checkpoint. Assert no data loss.

---

## 11. Failure cases and recovery (summary table)

| Failure | Detection | Recovery |
|---|---|---|
| Hash mismatch | Recompute on load | Fall back to parent + replay log |
| CBOR decode failure | Decode throws | Fall back to parent + replay log |
| Schema mismatch without migration | Schema hash check | Mark unreadable; offer "new world with same seed" |
| OPFS quota exceeded | Write fails | Move old saves to cold tier; retry |
| SQLite-WASM crash | Worker watchdog | Restart worker; re-open database from OPFS |
| Migration throw | Try/catch in migrator | Mark corrupt; preserve pre-migration save |
| Branch merge conflict | Three-way merge detects | Player resolves manually |
| Tab crash mid-flush | Checkpoint + flushed log tail | Replay from last checkpoint + tail (≤ 10 ticks loss) |
| Browser data clearing | OPFS empty | Offer "import .ga-save backup" |

---

## 12. Rejected alternatives (summary)

- **JSON saves.** Key ordering nondeterminism. Rejected.
- **One file per save.** OPFS file-count limits; worse transactional semantics. Rejected.
- **Server-side saves.** Violates browser-native thesis. Rejected.
- **Auto-derived migrations.** Cannot handle semantic changes. Rejected.
- **Delta-stacked saves.** Brittle chains. Rejected in favor of checkpoints + input log.
- **Branchless saves.** No "what if" exploration. Rejected.
- **Per-plugin save files.** Cross-plugin transactions would require multi-file atomicity, which OPFS does not guarantee. Rejected in favor of one envelope per save.

---

## 13. What this document enables

- **100-hour playthroughs** that survive engine patches, via the fingerprint + migration system.
- **Branching exploration** via the branch API, with deterministic state and player-driven merges.
- **Crash recovery** with < 200 ms of lost play, via the 60-tick checkpoint + 10-tick flush.
- **Cross-machine transfer** via encrypted `.ga-save` backups.
- **The AI's century-absence test** (doc 17 §6.1): a 1000-year headless sim that checkpoints every strategic tick, producing a single hash that proves the sim is deterministic at century scale.

The save system is the engine's promise to the player: your world is permanent, your choices are yours, and the engine will not silently forget or rewrite what you built. The DeterminismFingerprint is the engine's promise to itself: when we change the rules, we will tell the player, not pretend nothing changed.
