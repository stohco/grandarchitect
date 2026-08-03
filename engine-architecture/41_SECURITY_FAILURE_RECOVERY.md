# 41 — Security & Failure Recovery

**Status:** Architecture. The security model and the failure-mode catalog.
**Date:** 2026-08-03

---

## 0. What this document is

The engine runs in a browser tab. That tab can crash, be suspended by the OS, lose its WebGPU device, hit a storage quota, or be killed by the user. The engine's canonical state is the player's save — possibly hours of play, possibly a century of simulation. This document defines the security model that protects that state from untrusted code, and the failure recovery catalog that protects it from the browser's hostility.

The doctrine (AGENTS.md Part 3) says: "Add exits, not gates." Security is the gate (mod sandboxing, save integrity); failure recovery is the exit (the player's save survives even when the tab does not). This document covers both because they are paired: every gate needs an exit (the player can always recover), and every exit needs a gate (recovery does not bypass integrity).

The doctrine also says (Part 1): "Choose the simplest implementation that fully meets the current requirements." The security model is the simplest one that makes untrusted mods safe: a capability surface plus a sandbox (doc 35). The failure recovery is the simplest one that survives the browser's failure modes: checkpoints plus a recovery loop. There is no exotic mechanism here — just disciplined application of the basics.

---

## 1. The 16 questions

### 1.1 The security model

The security model has three principals:

1. **The engine** (trusted). The engine core, the determinism stack, the renderer, the core plugins. These run with full privileges.
2. **Mods** (untrusted). Third-party plugins, signed but not audited. These run in the sandbox (doc 35 §2.3).
3. **The user's save data** (sacred). The canonical state, the input log, the checkpoint history. This is what the security model exists to protect.

The security model's goal is: a malicious mod cannot corrupt the save, cannot exfiltrate save data, cannot crash the engine unrecoverably, and cannot violate the determinism contract.

```typescript
interface SecurityModel {
  // The trust boundary: engine plugins are trusted, mods are not.
  trustBoundary: 'engine-vs-mods';
  // The save data is sacred — every write goes through the save system,
  // which verifies integrity on every checkpoint.
  saveIntegrity: 'hash-verified-every-checkpoint';
  // The mod sandbox (doc 35 §2.3)
  modSandbox: 'capability-surface + shadow-realm-or-worker';
  // The recovery model (§1.4-1.8)
  recovery: 'checkpoint-rollback';
}
```

### 1.2 Plugin permissions

Engine plugins run with full host access. Mods run with the `SandboxedHost` (doc 35 §2.1) and a declared permission set. The permission set is the contract; the runtime enforces it.

```typescript
type ModPermission =
  | { kind: 'read-state'; pluginId: string }
  | { kind: 'emit-event'; namespace: string }   // 'com.example.spirit-fox'
  | { kind: 'patch-definition'; targetId: string }
  | { kind: 'shader-patch'; chunk: string }     // 'fog_fragment', 'water_vertex'
  | { kind: 'network'; origin: string }         // 'https://api.example.com'
  | { kind: 'storage'; quotaMiB: number }       // mod-scoped OPFS
  | { kind: 'worker'; signed: boolean };        // can spawn workers

interface PermissionCheck {
  modId: string;
  permission: ModPermission;
  granted: boolean;
  reason?: string;               // 'declared' | 'user-approved' | 'denied'
}
```

Every capability on the `SandboxedHost` checks permissions before executing. An undeclared capability call is refused and logged. The log is surfaced to the user in the mod manager's security panel.

### 1.3 Save file integrity (hash verification on load)

Every save is a CBOR blob with a SHA-256 hash. The hash is computed at save time and stored alongside the save. On load, the engine re-computes the hash and compares. If they differ, the save is corrupt (or tampered with) and the load is refused.

```typescript
interface SaveFile {
  // The fingerprint this save was made with
  fingerprint: DeterminismFingerprint;
  // The engine tick at save time
  tick: number;
  // The seed
  seed: string;
  // The loaded mods at save time (modId + version + contentHash)
  mods: { modId: string; version: string; contentHash: string }[];
  // The serialized canonical state (CBOR)
  state: Uint8Array;
  // The SHA-256 of `state`
  stateHash: string;
  // The input log up to this save (for replay)
  inputLog: InputLogEntry[];
  // The signature (Ed25519 over the entire save, signed by the engine's
  // device key — proving the save was made by this engine, not forged)
  signature: string;
}

interface SaveLoadResult =
  | { ok: true; save: SaveFile }
  | { ok: false; reason: 'hash-mismatch' | 'signature-invalid' | 'fingerprint-mismatch' | 'mod-missing' | 'corrupt-cbor' };
```

The signature is the defense against tampering. The engine generates a device-specific Ed25519 keypair on first launch (stored in OPFS, never leaves the device). Every save is signed with the private key; on load, the signature is verified with the public key. A save that was not signed by this engine (or by an engine the user has explicitly trusted) is refused.

### 1.4 Crash recovery (the last checkpoint)

When the engine crashes (uncaught exception, tab crash, OOM kill), the recovery is: load the last checkpoint.

The save system writes checkpoints on a fixed interval (default: every 1000 ticks = ~16 seconds of play). Each checkpoint is a full save (state + input log + hash + signature). On startup, the engine checks for a "crash marker" — a flag set at boot and cleared at clean shutdown. If the marker is set on boot, the engine was not shut down cleanly and offers to restore the last checkpoint.

```typescript
interface CrashRecovery {
  // The crash marker — set at boot, cleared at clean shutdown
  crashMarkerPath: 'opfs:/crash-marker';
  // The checkpoint directory
  checkpointDir: 'opfs:/checkpoints';
  // On boot, if the marker is set:
  recover(): Promise<CrashRecoveryResult>;
}

interface CrashRecoveryResult {
  lastCheckpoint?: { tick: number; savedAt: string; save: SaveFile };
  // The crash report (if captured before the crash)
  crashReport?: CrashReport;
  // The user's choice
  action: 'restore' | 'discard' | 'inspect';
}
```

The recovery UI is the first thing the player sees after a crash: "The engine did not shut down cleanly. Restore from the last save (tick 12345, 16 seconds ago)?" with options to restore, discard, or inspect the crash report.

### 1.5 Worker termination recovery

The engine uses Web Workers for: determinism verification, asset decoding, headless simulation, the divergence finder. A worker can terminate (OOM, uncaught exception, browser killing background workers). The engine detects the termination and recovers.

```typescript
interface WorkerTerminationRecovery {
  // The worker that terminated
  workerId: string;
  // The reason (if the worker reported before terminating)
  reason?: 'oom' | 'uncaught-exception' | 'browser-killed';
  // The recovery action
  action:
    | { kind: 'restart'; fromLastCheckpoint: boolean }
    | { kind: 'disable'; feature: string; fallback: string }
    | { kind: 'fatal'; reason: string };
}
```

The recovery depends on the worker:

- **Determinism verification worker.** Restart from the last checkpoint. The verification is idempotent — re-running it produces the same result. If the worker keeps terminating, the verification frequency is reduced (doc 39 §1.12) and the divergence safety net degrades.
- **Asset decoder worker.** Restart. The decode job is retried; if the asset is corrupt, the asset is marked as failed and the engine surfaces a missing-asset placeholder.
- **Headless simulation worker.** Restart from the last checkpoint. The simulation continues.
- **Divergence finder worker.** Disable for this session. The divergence finder is a debugging tool; disabling it does not affect the running game.

### 1.6 WebGPU device loss recovery

WebGPU devices can be "lost" — the GPU driver crashed, the OS reclaimed the GPU, the tab was backgrounded and the GPU context was released. The engine detects the `lost` event on the device and recovers.

```typescript
interface DeviceLossRecovery {
  // The lost event info
  reason: 'destroyed' | 'unknown';
  message: string;
  // The recovery action
  action:
    | { kind: 'recreate-device'; resnapshotAssets: boolean }
    | { kind: 'fallback-to-webgl2' }
    | { kind: 'fatal'; reason: string };
}
```

The recovery:

1. **Recreate the device.** Request a new WebGPU device. Re-create all GPU resources (textures, buffers, pipelines) from the canonical state. The canonical state is in CPU memory; the GPU state is a derived cache, so it can always be rebuilt.
2. **Resnapshot assets.** Re-upload all loaded textures and meshes to the new device. The asset cache is content-addressed, so this is a re-upload, not a re-fetch.
3. **Fallback to WebGL2.** If WebGPU is not available after the loss (e.g., the OS disabled it), the engine falls back to the WebGL2 renderer (doc 17 §1.4). The fallback is lower quality but functional.
4. **Fatal.** If both WebGPU and WebGL2 are unavailable, the engine cannot render. It surfaces a modal: "The graphics device is unavailable. Save and restart."

The device-loss recovery is silent if possible — the player sees a brief frame drop, not a modal. The modal only appears if the recovery fails.

### 1.7 Storage quota exhaustion recovery

The engine uses OPFS for: saves, checkpoints, crash reports, asset cache, mod storage. OPFS has a quota (typically a percentage of the device's free disk space, browser-specific). When the quota is exhausted, writes fail.

```typescript
interface StorageQuotaRecovery {
  // The storage that hit the quota
  storage: 'saves' | 'checkpoints' | 'crash-reports' | 'asset-cache' | 'mod-storage';
  // The current usage
  usageMiB: number;
  quotaMiB: number;
  // The recovery action
  action:
    | { kind: 'evict-lru'; target: string }
    | { kind: 'reduce-checkpoint-frequency' }
    | { kind: 'refuse-write'; message: string }
    | { kind: 'request-more'; persistent: boolean };
}
```

The recovery depends on the storage:

- **Asset cache.** Evict LRU. The asset cache is content-addressed and re-fetchable; evicting is safe.
- **Crash reports.** Evict oldest. Crash reports are useful but not sacred.
- **Checkpoints.** Reduce checkpoint frequency. Keeping fewer, older checkpoints is better than refusing new saves.
- **Saves.** Refuse the write. The player is told: "Save failed: storage full. Delete old saves or checkpoints."
- **Mod storage.** Refuse the write. The mod is told its quota is exhausted; the player is told which mod is full.

The engine also surfaces the storage usage in the settings panel, so the player can manage it before hitting the quota.

### 1.8 Browser tab suspension recovery

Mobile browsers (and some desktop browsers under memory pressure) suspend background tabs. The tab's JS execution pauses; the WebGPU device may be lost; the Workers may be terminated. When the tab is foregrounded, the engine must recover.

```typescript
interface TabSuspensionRecovery {
  // The Page Visibility API event
  visibility: 'hidden' | 'visible';
  // The wall-clock time the tab was suspended
  suspendedDurationMs: number;
  // The recovery action
  action:
    | { kind: 'resume'; fromLastCheckpoint: boolean }
    | { kind: 'recover-device-loss' }
    | { kind: 'recover-worker-termination' };
}
```

On `visibilitychange` to `visible`:

1. **Check the device.** If the WebGPU device is lost, run the device-loss recovery (§1.6).
2. **Check the workers.** Ping each worker; if it does not respond, run the worker-termination recovery (§1.5).
3. **Check the wall-clock drift.** If the tab was suspended for more than 1 second, the engine's tick counter is behind the wall clock. The engine does not catch up (the sim runs at fixed 60Hz); the player simply sees that less simulation time elapsed than wall time. This is the correct behavior for a deterministic sim — the sim runs at its own rate, not the wall clock's.
4. **Resume the render loop.** The render loop resumes; the player sees the current state.

### 1.9 The failure mode catalog

The failure mode catalog is the exhaustive list of what can fail, how it is detected, how it recovers, and what the user sees. It is the single source of truth for failure handling.

```typescript
interface FailureMode {
  id: string;                    // 'webgpu-device-loss'
  category: 'crash' | 'resource' | 'security' | 'determinism' | 'network' | 'storage';
  // What fails
  failure: string;
  // How it is detected
  detection: string;
  // How it recovers
  recovery: string;
  // What the user sees
  userImpact: string;
  // The severity: does it block play, degrade play, or is it invisible?
  severity: 'fatal' | 'degraded' | 'invisible';
}
```

The full catalog:

| ID | Failure | Detection | Recovery | User sees | Severity |
|---|---|---|---|---|---|
| `engine-crash` | Uncaught exception in a system | try/catch in scheduler | Disable the throwing system; offer checkpoint restore | "System X failed. Disabled. Restore from last save?" | degraded |
| `engine-fatal` | Uncaught exception in core | window.onerror | Capture crash report; offer checkpoint restore | "The engine crashed. Restore from last save?" | fatal |
| `worker-termination` | Worker terminates | Worker `error`/`exit` event | Restart worker from last checkpoint | (invisible if recovery succeeds) | invisible |
| `webgpu-device-loss` | GPU device lost | `device.lost` promise | Recreate device; resnapshot assets | Brief frame drop; modal only if recovery fails | invisible → fatal |
| `webgpu-unavailable` | No WebGPU at startup | `navigator.gpu` check | Fallback to WebGL2 | Lower visual quality; banner "Running on WebGL2" | degraded |
| `storage-quota` | OPFS write fails | Quota exception | Evict LRU; reduce checkpoint frequency | "Storage full. Managing space." | degraded |
| `save-hash-mismatch` | Save corrupted or tampered | Hash check on load | Refuse load; offer earlier checkpoint | "Save corrupt. Restore from earlier checkpoint?" | fatal |
| `save-signature-invalid` | Save not signed by this engine | Signature check | Refuse load | "Save signature invalid. Cannot load." | fatal |
| `save-fingerprint-mismatch` | Save from a different engine version | Fingerprint check | Refuse load; offer migration | "Save from v0.1.0. Current is v0.2.0. Migrate?" | fatal |
| `save-mod-missing` | Save used a mod that is not loaded | Mod list check | Offer to install mod; or load with ghost fingerprint | "Save used mod A. Install or load with missing content?" | degraded |
| `mod-permission-violation` | Mod does something undeclared | Runtime proxy | Block action; log; surface in security panel | Console warning; UI badge | degraded |
| `mod-crash` | Mod throws in init or system | try/catch | Disable mod; continue boot | "Mod A failed to start. Disabled." | degraded |
| `mod-determinism-violation` | Mod calls `Math.random` in dev | Dev proxy throws | Disable mod; surface divergence report | "Mod A broke determinism. Disabled. See report." | degraded |
| `determinism-divergence` | Periodic verification finds divergence | Hash comparison | Snapshot save log; warn user | "Divergence detected. Save log captured. Please report." | degraded |
| `tab-suspension` | Tab backgrounded and suspended | `visibilitychange` | Recover device, workers; resume | (invisible) | invisible |
| `network-offline` | Network requests fail | `navigator.onLine` | Queue requests; retry on reconnect | "Offline. Changes will sync when reconnected." | invisible |
| `cdn-asset-missing` | Asset 404 on CDN | Fetch 404 | Retry from origin; then surface placeholder | Missing asset (purple/black) | degraded |
| `renderer-oom` | GPU memory exhausted | Allocation failure | Drop render preset; evict GPU LRU | Quality drop; profiler warning | degraded |
| `sim-oom` | Canonical memory exhausted | Memory sampling | Demote entities; refuse new spawns | Distant NPCs simplify | degraded |
| `input-buffer-overflow` | Input log exceeds memory | Buffer cap | Flush to OPFS; continue | (invisible) | invisible |
| `checkpoint-too-slow` | Checkpoint takes >200ms | Wall-clock check | Reduce checkpoint frequency | (invisible; checkpoints less frequent) | invisible |
| `migration-failed` | Save migration fails | Migration exception | Refuse load; offer earlier checkpoint | "Save cannot be migrated. Restore from earlier checkpoint?" | fatal |

### 1.10 How are failures logged?

Every failure is logged through the structured logger (doc 37 §1.1) at the appropriate level: `warn` for degraded, `error` for fatal, `fatal` for unrecoverable. The log entry includes the failure mode ID, the recovery action taken, and the user's choice (if any). Failures are also captured by the crash reporter (doc 37 §1.5) if they meet the threshold.

### 1.11 How are failures tested?

The test framework (doc 38) includes a failure-injection suite: each failure mode is triggered in a test, and the test asserts the recovery works. Examples:

- **WebGPU device loss.** Call `device.destroy()` mid-frame; assert the engine recovers within 1 second.
- **Storage quota.** Fill OPFS to quota; assert the engine evicts LRU and continues.
- **Worker termination.** Terminate the determinism worker; assert the engine restarts it.
- **Save corruption.** Flip a byte in a save file; assert the hash check refuses the load.

The failure-injection suite is part of the conformance class (doc 38 §1.5): a plugin that cannot recover from a device loss fails conformance.

### 1.12 How does the security model interact with the determinism contract?

The security model and the determinism contract are independent but reinforcing:

- The determinism contract (doc 17 §3) is about *correctness*: same seed + same inputs = same hash.
- The security model is about *integrity*: the save is what the engine wrote, not what an attacker forged.

A mod that breaks the determinism contract is a *correctness* failure, not a *security* failure — the save is still signed, still hash-verified, still loadable; it just produces a different state than the canon. The security model catches *tampering* (a modified save file), not *buggy mods* (a mod that uses `Math.random`).

The overlap is the save signature: a mod that breaks determinism cannot forge a save that loads in a different engine, because the signature is the engine's, not the mod's.

### 1.13 How is the device key protected?

The engine's Ed25519 device key is generated on first launch and stored in OPFS. OPFS is sandboxed to the origin, so other origins cannot read it. The key is never sent off-device (it is not part of crash reports, not part of telemetry). The key is not user-visible; the user can reset it (which invalidates all previous saves — a destructive action, behind a confirmation dialog).

If the user clears the OPFS (browser settings → clear storage), the key is lost, and all previous saves become unloadable (they were signed by a key the engine no longer has). The engine detects this on boot: "The device key has been reset. Previous saves cannot be loaded."

### 1.14 How are mods revoked post-install?

The author revocation flow (doc 35 §2.13) is the security exit. When an author publishes a revocation, the engine disables the mod on next launch. The mod's state is preserved (so saves that used the mod can still load with the mod's "ghost" fingerprint), but the mod's code does not run.

The revocation is checked against the first-party registry on launch, with a cached-offline grace period (default 7 days). If the registry is unreachable for more than 7 days, the engine warns the user: "Could not check for mod revocations. Mods are running without verification."

### 1.15 How is telemetry separated from save data?

Telemetry (doc 37 §1.11) is opt-in and contains: engine fingerprint, hardware tier, frame metrics, entity counts. It does **not** contain: save data, input logs, mod content, user identifiers beyond a random UUID. The separation is enforced at the telemetry collection layer — the collector cannot read save data, only metrics. This is a code-structure enforcement, not a policy: the telemetry collector is a separate module with no import path to the save system.

### 1.16 What is the user's recovery surface?

The user has, at all times, three recovery options accessible from the pause menu:

1. **Restore last checkpoint.** Discards current state since the last checkpoint (up to 16 seconds of play); loads the checkpoint.
2. **Restore earlier save.** Opens the save list; the user picks any save to load.
3. **Export save file.** Downloads the current save as a `.ga-save` file, for backup or transfer.

These are the exits. The gates (sandbox, hash, signature, fingerprint) prevent the user from loading a save that is not theirs, but the exits always let the user go back to a state that is theirs.

---

## 2. The failure-recovery loop

```
                  ┌─────────────────────┐
                  │  Engine running      │
                  └──────────┬───────────┘
                             │
                  ┌──────────▼───────────┐
                  │  Failure detected    │
                  │  (by any detector)   │
                  └──────────┬───────────┘
                             │
                  ┌──────────▼───────────┐
                  │  Identify failure    │
                  │  mode (catalog)      │
                  └──────────┬───────────┘
                             │
              ┌──────────────┼──────────────┐
              │              │              │
        severity:invisible  severity:degraded  severity:fatal
              │              │              │
              ▼              ▼              ▼
        (silent        degrade + warn    pause sim + modal
         recovery)     (auto-recover)    (user choice)
              │              │              │
              │              │              ▼
              │              │       ┌──────────────┐
              │              │       │ Restore last │
              │              │       │ checkpoint?  │
              │              │       └──────┬───────┘
              │              │              │
              └──────────────┴──────────────┘
                             │
                  ┌──────────▼───────────┐
                  │  Log + crash report  │
                  │  (if severity ≥ warn)│
                  └──────────┬───────────┘
                             │
                  ┌──────────▼───────────┐
                  │  Resume / restart    │
                  └──────────────────────┘
```

---

## 3. Failure cases (meta — what if the recovery itself fails?)

| Failure | Detection | Recovery | User sees |
|---|---|---|---|
| Checkpoint restore fails (corrupt checkpoint) | Hash check on restore | Offer earlier checkpoint | "Last checkpoint corrupt. Restore from earlier?" |
| All checkpoints corrupt | All hashes fail | Offer to start a new game | "All checkpoints corrupt. Start a new game?" |
| Device-key reset detected on boot | Key lookup fails | Surface warning; new saves use new key | "Device key reset. Previous saves unloadable." |
| Crash report cannot be captured (OPFS full) | Storage exception | Skip crash report; log to console | (invisible; crash report lost) |
| Recovery UI itself fails to render | Renderer not available | Console-only message | "Recovery UI unavailable. See console." |
| Migration path does not exist | Migration registry miss | Refuse load; offer earlier save | "No migration path from v0.1.0 to v0.3.0. Restore from v0.1.0 save." |
| Worker restart loop (worker keeps terminating) | Restart counter | Disable worker permanently; degrade | "Worker X cannot be restarted. Feature disabled." |
| Device loss loop (GPU keeps crashing) | Device loss counter | Fallback to WebGL2 permanently | "GPU unstable. Switched to WebGL2." |

---

## 4. Rejected alternatives

- **Trusting mods with full host access (no sandbox).** Rejected: this is how every moddable game has shipped malware. The sandbox is the cost of admission for third-party code.

- **Save files without signatures.** Rejected: an unsigned save can be forged. The signature is the proof that the save was made by this engine, on this device, with this fingerprint.

- **Cloud saves as the primary save (not local).** Rejected: cloud saves are a sync feature, not a primary store. The browser-tab model requires local-first saves; cloud sync is layered on top, opt-in, and never blocks play.

- **No checkpoint history (only the latest save).** Rejected: a single corrupt save would lose everything. The checkpoint history (default 10 checkpoints, configurable) gives the player a rollback path.

- **Crash recovery that tries to resume from the in-memory state.** Rejected: the in-memory state is what crashed. The recovery must be from a checkpoint, not from the crashed state.

- **WebGL2 as the primary renderer.** Rejected: WebGPU is the future and the engine is built for it (doc 17 §1.4). WebGL2 is the fallback, used only when WebGPU is unavailable or unstable.

- **Asking the user before every recovery action.** Rejected: most recoveries are invisible (worker restart, device recreate). The user is asked only for destructive actions (restore checkpoint) or when recovery fails.

- **A custom crypto stack for save signing.** Rejected: Ed25519 via `@noble/ed25519` is established, audited, and pure-JS. Reimplementing it would violate the doctrine.

- **Trusting the mod's own crash recovery.** Rejected: a mod that crashes cannot be trusted to recover itself. The engine's try/catch around mod code is the recovery; the mod is disabled.

- **Telemetry that includes save data for "debugging."** Rejected: save data is sacred. The telemetry collector is structurally prevented from reading it (no import path). The doctrine (Part 3) says "confront the central tension directly" — the tension is "we want crash data" vs "the user's save is sacred," and the resolution is: crash data yes, save data never.

- **Per-frame checkpointing (no data loss).** Rejected: checkpointing every frame would cost ~150ms/frame (the serialize+hash cost), which is the entire frame budget. The 1000-tick interval is the calibrated tradeoff: at most 16 seconds of lost play on crash.

---

## 5. What this document enables

A security and recovery model where:
- Mods are sandboxed; the save is sacred.
- Every save is hash-verified and signature-verified on load.
- Every crash has a recovery path, and the player never loses more than ~16 seconds of play.
- Every worker termination, device loss, storage quota, and tab suspension is detected and recovered.
- The failure mode catalog is exhaustive — every failure has a documented detection, recovery, and user impact.
- The user always has three exits: restore last checkpoint, restore earlier save, export save file.
- Telemetry is structurally separated from save data — the collector cannot read what it must not send.
- The device key is local, never sent off-device, and resettable only via a destructive action.

The next steps:
1. Implement the checkpoint system with the 1000-tick interval and the 10-checkpoint history.
2. Implement the crash marker and the boot-time recovery UI.
3. Implement the WebGPU device-loss recovery (recreate + resnapshot).
4. Implement the worker-termination recovery for each worker type.
5. Implement the storage-quota recovery with the per-storage eviction policy.
6. Build the failure-injection test suite (doc 38 §1.11) — every failure mode in the catalog has a test.
