# 35 — Modding & Untrusted Content

**Status:** Architecture. The security and content model for third-party mods.
**Date:** 2026-08-03

---

## 0. What this document is

The engine is a plugin host (per doc 17). Every system — renderer, physics, NPC simulator — is a plugin. A **mod** is just a plugin whose author we do not trust. This document defines the security boundary between trusted engine plugins and untrusted mod plugins, the sandbox that enforces it, the dependency and distribution model, and the interaction with the determinism contract.

The doctrine (AGENTS.md Part 3) says: "Add exits, not gates." The modding system is the engine's largest single exit. A mod that cannot use `Math.random` is still a mod that can add a sect, a spirit beast, a combat technique, a shader, or a UI panel. The gate is narrow (the determinism contract); the exit is wide (everything that does not touch canonical state).

---

## 1. What a mod is

A mod is a plugin (the `Plugin` interface from doc 17 §1.1) packaged for distribution, signed by its author, and loaded into a restricted `PluginHost` surface. The only structural difference between an engine plugin and a mod is the trust level: engine plugins run with the full host, mods run with the `SandboxedHost`.

```typescript
interface ModManifest {
  modId: string;                  // e.g. 'com.example.spirit-fox-pack'
  version: string;                // semver
  engineVersion: string;          // compatible engine fingerprint schemaVersion
  displayName: string;
  author: { name: string; contact?: string };
  permissions: ModPermission[];
  dependencies: ModDependency[];
  conflicts: ModConflict[];
  contentHash: string;            // SHA-256 of the mod bundle
  signature: string;              // Ed25519 over the contentHash
  assets: AssetRef[];             // content-addressed
  entrypoint: string;             // ES module URL inside the bundle
  // The determinism contract declaration (§7)
  determinism: ModDeterminismDeclaration;
}

interface ModDependency {
  modId: string;
  versionRange: string;           // semver range
  optional?: boolean;
}

interface ModConflict {
  modId: string;
  reason: string;                 // 'overrides-same-asset' | 'patches-same-definition' | ...
}
```

The mod loader refuses to load a manifest that is unsigned, has a signature that does not verify against the author's published key, or whose `contentHash` does not match the bytes on disk.

---

## 2. The 16 questions

### 2.1 How do mods work?

A mod is loaded the same way a plugin is — the engine's plugin loader treats the mod bundle as an ES module. The difference is the surface the mod receives at `init(host)`. Engine plugins receive the full `PluginHost`; mods receive a `SandboxedHost` that proxies every capability through a permission check.

```typescript
interface SandboxedHost {
  // Read-only access to other plugins' state (filtered by permission)
  getState<T>(pluginId: string): T;
  // Write only to the mod's own slice
  setState<T>(state: T): void;
  // Event bus, scoped — the mod can only emit events it declares
  emit(event: string, payload: unknown): void;
  on(event: string, handler: (payload: unknown) => void): void;
  // System registration, scheduled by the host
  registerSystem(name: string, fn: (dt: number) => void, priority: number): void;
  // Determined RNG — never Math.random
  rng: DetRng;
  // Asset access, scoped to declared assets + the engine's shared library
  assets: SandboxAssetAccess;
  // Headless API surface, filtered by permission
  api: SandboxApi;
}
```

A mod never receives a reference to `window`, `globalThis`, the WebGPU device, or any unproxied engine object. The `SandboxedHost` is constructed by the loader and handed to the mod's `init` function.

### 2.2 What is the security boundary?

| Capability | Engine plugin | Mod |
|---|---|---|
| Read any plugin state | Yes | Yes (with declared read-permission) |
| Write own state | Yes | Yes |
| Write other plugin state | Yes (via event bus) | No (only via declared events) |
| Direct DOM access | Yes | **No** |
| Direct WebGPU device | Yes | **No** (only via renderer proxies) |
| Network requests | Yes | **Only to declared origins** |
| `Math.random`, `Date.now` | Forbidden in sim | Forbidden everywhere; replaced |
| File system (OPFS) | Yes | **Only to mod-scoped quota** |
| Spawn workers | Yes | **Only with declared permission + signed worker code** |
| Load further ES modules | Yes | **Only from the mod's own bundle** |
| Patch shader chunks | Yes | **Only if `shader-patch` permission declared** |
| Author definitions / templates / rules | Yes | **Yes** — this is the primary modding surface |

The rule of thumb: a mod may *add content* (definitions, templates, rules, assets, shaders with permission) but may not *override engine behavior* (no swapping the renderer, no replacing the physics solver, no editing the determinism stack). The "Law Author" surface (doc 17 §7.4) is the in-game path to law-level edits, gated by player progression, not by mod installation.

### 2.3 How is untrusted content sandboxed?

Three layers, defense in depth:

```
┌──────────────────────────────────────────────────────────┐
│  Layer 1: Capability surface (SandboxedHost)              │
│   • The mod can only call methods on the host it receives │
│   • No references to window, document, device, fetch      │
│   • Every method proxies through a permission check       │
└──────────────────────────────────────────────────────────┘
                            │
┌──────────────────────────────────────────────────────────┐
│  Layer 2: Code isolation (Realm / Worker)                 │
│   • Mod code runs in a ShadowRealm (TC39 proposal) or a   │
│     dedicated Web Worker, depending on the browser        │
│   • The worker has no DOM, no fetch, only a message port  │
│   • The message port is the only channel to the host      │
└──────────────────────────────────────────────────────────┘
                            │
┌──────────────────────────────────────────────────────────┐
│  Layer 3: Static analysis + signed manifest               │
│   • Before load, the mod's source is scanned for forbidden│
│     references (window, globalThis, eval, Function ctor)  │
│   • The manifest signature must verify against the        │
│     author's published Ed25519 key                        │
│   • The content hash must match                           │
└──────────────────────────────────────────────────────────┘
```

Layer 2 is the load-bearing one. The ShadowRealm proposal (Stage 3 in late 2026) gives us a synchronous sandbox with a clean global; where it is unavailable, we fall back to a Worker with a synchronous message-port shim. The determinism contract is preserved because the mod's RNG calls are proxied back into the engine's `DetRng`, never generated in the worker.

### 2.4 How are mod conflicts detected?

A conflict exists when two mods claim the same resource. The loader detects three classes at install time, before any mod code runs:

```typescript
type ConflictClass =
  | 'asset-id-collision'         // both mods declare asset 'fox.spirit'
  | 'definition-patch-target'    // both mods patch definition 'npc:wang-elder'
  | 'event-namespace-collision'; // both mods emit on 'com.example:my-event'

interface ConflictReport {
  class: ConflictClass;
  modA: string;  // modId
  modB: string;
  resource: string;
  resolution: 'refuse-load' | 'last-wins' | 'merge';
}
```

- **Asset collisions** are always `refuse-load`. The user must disable one mod.
- **Definition patch collisions** default to `last-wins` in load order, but the user can pin a load order in the mod manager UI. The engine logs every patch applied so the user can audit.
- **Event namespace collisions** are `refuse-load`. Event names must be namespaced by mod ID (`com.example.spirit-fox:summoned`).

The loader writes a conflict report to the mod manager UI before the engine boots. The user resolves conflicts; the engine never silently picks.

### 2.5 How do mod dependencies work?

Mod dependencies are declared in the manifest and resolved by topological sort, exactly like engine plugins (doc 17 §1.3). The differences:

- **Version ranges** are semver, not exact versions. A mod can declare `^1.2.0`.
- **Optional dependencies** are allowed; if mod B is missing, mod A's `init` is told so via `host.isModPresent('modB')`.
- **Cyclic dependencies** are refused at install time. The loader refuses to install a mod whose dependency graph has a cycle.
- **Missing dependencies** refuse to load. The mod manager offers to install them.

```typescript
interface ResolvedModGraph {
  order: string[];                // topological load order
  missing: { modId: string; requiredBy: string }[];
  cycles: string[][];
  versionConflicts: { modId: string; requested: string; present: string }[];
}
```

### 2.6 How are mods distributed?

Mods are signed bundles. The bundle is a CBOR archive (the same serialization the engine uses for saves) containing:

1. The manifest (`ModManifest`)
2. The ES module source (one or more `.js` files)
3. Assets (glTF GLBs, KTX2 textures, JSON definitions)
4. The author's public key (so the signature can be verified offline)

Distribution channels:

| Channel | Use case | Verification |
|---|---|---|
| First-party registry (`mods.grand-architect.engine`) | The official mod portal | Signed + curator-reviewed |
| Direct URL (any HTTPS origin) | Self-hosted mod pages | Signed (author key) only |
| Local file | Dev mode, private mods | Unsigned allowed only in dev mode |

The engine never loads a mod whose signature does not verify against an author key it trusts. The trust store is populated by: (a) the first-party registry's published keys, (b) keys the user manually trusts (with a prominent warning UI), (c) dev-mode bypass (disabled in production builds).

### 2.7 How do mods interact with the determinism contract?

The determinism contract (doc 17 §3) applies to mods as strictly as to engine plugins, with one extra wrinkle: a mod that uses `Math.random` does not just break its own determinism — it breaks every save made with that mod loaded.

The contract is enforced three ways:

```typescript
interface ModDeterminismDeclaration {
  // The mod declares which engine determinism APIs it uses.
  usesRng: boolean;
  usesTranscendentals: boolean;
  usesFixedPoint: boolean;
  // The mod declares it does not call Math.random, Date.now, etc.
  // This is verified by static analysis at install.
  attestation: 'no-nondeterminism' | 'simulation-only-det';
}
```

1. **Static analysis at install time.** The loader scans the mod's source for `Math.random`, `Date.now`, `performance.now`, `crypto.getRandomValues`, and `new Date()` constructor calls. If found and not declared, install is refused. If declared, the user is warned that the mod breaks save compatibility.

2. **Runtime proxy in dev mode.** The `SandboxedHost` proxies `Math` and `Date` in dev mode; calls to `Math.random` throw. In production, the proxy is a no-op for performance, but a periodic checkpoint hash comparison catches divergence (see doc 37 §6).

3. **Fingerprint extension.** Each loaded mod extends the engine's `DeterminismFingerprint` (doc 08). A save made with mod A loaded carries a fingerprint that includes mod A's `modId@version`. Loading that save without mod A fails the fingerprint check.

### 2.8 What is the mod manifest schema?

(See §1.) The manifest is CBOR-serialized and signed. The signature covers every byte of the manifest except the signature field itself.

### 2.9 How is mod integrity verified?

`contentHash` (SHA-256 of the bundle) is verified at every load, not just install. If the bundle's bytes change after install, the engine refuses to load it and surfaces a tamper warning. This catches both malicious tampering and accidental corruption.

### 2.10 How is mod load order decided?

Topological sort by dependency, then user-pinned order for unrelated mods. The mod manager UI exposes a drag-and-drop list. The engine persists the resolved order in the user's profile so it is reproducible.

### 2.11 How are mod versions managed?

Semver. A mod's manifest declares its version and the engine version it targets. The fingerprint schema version (currently `0.1.0`) is the contract; a mod targeting `0.1.0` will not load in an engine with schema `0.2.0` unless the mod author re-attests. This prevents silent breakage when the determinism stack changes.

### 2.12 What is the mod loading lifecycle?

```
1. User selects mod bundle in the mod manager
2. Loader computes contentHash, verifies against manifest
3. Loader verifies signature against trust store
4. Static analysis pass (forbidden references, determinism attestation)
5. Conflict resolution against already-installed mods
6. Dependency resolution (topological sort)
7. Manifest persisted to user profile (with resolved order)
8. On engine boot: for each mod in order,
     a. Instantiate in ShadowRealm / Worker
     b. Hand the SandboxedHost to init()
     c. Mod registers state, systems, surfaces
9. Engine starts the sim loop; mods participate as first-class plugins
```

### 2.13 How are mods revoked?

Two paths:

- **Author revocation.** The author publishes a revocation record to the first-party registry. The engine checks the registry on launch (with a cached-offline grace period) and disables any mod whose key has been revoked. The user is told why.
- **User revocation.** The user disables a mod in the mod manager. Saves made with that mod are still loadable (the mod is preserved as a "ghost" entry in the fingerprint), but the mod does not run.

### 2.14 How are mods debugged?

The mod manager exposes a per-mod debug panel: registered systems, declared events, asset references, recent log output. A "verify determinism" button runs the mod alone with a fixed seed for 1000 ticks and compares the hash against the mod author's published reference hash. If the hashes differ, the mod has a determinism bug.

### 2.15 How is the mod permissions UI presented?

At install time, the mod manager shows a permissions panel listing every capability the mod requests, grouped by risk. The user must explicitly approve. Permissions are not granted silently. Examples:

```
This mod requests:
  [LOW]  Read access to: ga:npc-simulator state
  [LOW]  Register a system (runs every tick)
  [MED]  Patch definitions: npc:wang-elder, npc:li-matriarch
  [MED]  Add assets: 4 glTF models, 12 KTX2 textures
  [HIGH] Shader chunk patching (ga:fog, ga:water)
  [HIGH] Network requests to: api.example.com
```

### 2.16 What is the installation UX?

One-click install from the first-party registry, with a permissions review screen before activation. For direct-URL mods, the user pastes the URL, the engine fetches the manifest, verifies the signature, and presents the same permissions review. Local dev mods are drag-and-drop into the mod manager, with a prominent "DEV MODE — UNSIGNED" warning.

---

## 3. The content modding surface

Mods that only add content (no systems, no shaders) are the common case and the safest. They use a declarative surface:

```typescript
interface ContentMod {
  definitions?: DefinitionPatch[];   // doc 36 §8
  templates?: TemplateRef[];          // doc 36 §9
  rules?: RuleRef[];                  // doc 36 §10
  assets?: AssetRef[];                // GLB, KTX2, JSON
  spawnRules?: SpawnRule[];           // 'place spirit-fox in spirit-wilds biomes'
}

interface DefinitionPatch {
  targetId: string;                   // 'npc:wang-elder'
  op: 'add' | 'patch' | 'remove';
  fields?: Record<string, unknown>;
}
```

A content mod never runs code. The loader applies the patches to the definition registry at boot. Content mods are always determinism-safe (they only modify configuration data, never behavior) and are not subject to the static analysis pass.

---

## 4. Failure cases

| Failure | Detection | Recovery | User sees |
|---|---|---|---|
| Unsigned mod in production | Signature check at load | Refuse load | "This mod is not signed. Install blocked." |
| Tampered bundle | contentHash mismatch | Refuse load | "Mod files have changed since install. Re-install or disable." |
| Mod uses `Math.random` (static analysis) | Install-time scan | Refuse install unless attested | "This mod breaks the determinism contract. Saves made with it will not be cross-engine portable." |
| Mod uses `Math.random` at runtime (dev mode) | Proxied Math throws | Stack trace surfaced | Dev console error with mod ID |
| Conflict (asset ID collision) | Loader at install | Refuse load | "Mods A and B both define asset 'fox.spirit'. Disable one." |
| Conflict (definition patch) | Loader at boot | Last-wins (user-pinnable) | Warning in mod manager; patched field logged |
| Cyclic dependency | Topological sort fails | Refuse install | "Mods A → B → A. Cannot install." |
| Missing dependency | Resolution fails | Offer to install from registry | "Mod A requires mod B ^1.2.0. Install?" |
| Mod crashes at init | Try/catch around init() | Disable mod, continue boot | "Mod A failed to start. Disabled. See log." |
| Mod throws in a system | Try/catch around system fn | Disable mod for this session | One-frame warning toast; mod paused |
| Mod exceeds its OPFS quota | Storage quota exception | Refuse further writes | "Mod A is out of storage. Free up space or disable." |
| Mod makes undeclared network call | Network proxy | Block + warn | Console warning + UI badge |
| Save made with mod that is now disabled | Fingerprint check | Load with ghost fingerprint, content missing | "Save used mod A. Mod not loaded. Some content may be missing." |
| Author key revoked | Registry check on launch | Disable mod, tell user | "Mod A's author key was revoked. Mod disabled." |

---

## 5. Rejected alternatives

- **WebAssembly-only mods.** Rejected: WASM is harder to author, harder to debug, and the static analysis pass on JS already catches the dangerous references. WASM does not add security here; it adds friction. The ShadowRealm/Worker isolation is sufficient.

- **Capability-based permissions without a manifest.** Rejected: the user must see, at install time, what a mod will do. A pure capability model where the mod requests capabilities at runtime produces a stream of permission prompts (the Android-6 problem). The manifest declares intent upfront.

- **Allowing mods to override engine plugins.** Rejected: a mod that swaps `ga:renderer` can leak any GPU state. The "engine plugins are trusted, mods are not" line is load-bearing. The Law Author surface (doc 17 §7.4) is the in-game path to law-level edits, gated by progression.

- **JSON-only mods (no code).** Rejected: a mod that adds a new combat technique needs code (the technique's effect function). Pure content mods are the common case and get the declarative surface (§3), but code mods are first-class.

- **Loading mods from any URL without signature.** Rejected: this is how every mod ecosystem has shipped malware. The signature requirement is the cost of admission.

- **Per-frame permission prompts.** Rejected: the manifest declares intent. The user approves once. If the mod does something undeclared, the runtime proxy blocks it and logs.

- **Mod hot-reload in production.** Rejected: hot-reload breaks the determinism fingerprint (the mod's version is part of the fingerprint). Dev mode supports hot-reload; production does not.

---

## 6. What this document enables

A mod ecosystem where:
- Content mods (definitions, templates, rules, assets) are trivially safe and trivially authored.
- Code mods (new systems, new shaders) are sandboxed, signed, and audited.
- The determinism contract is never silently broken — a mod that breaks it must declare so, and the user must accept the consequence.
- Conflicts are detected before boot, never silently resolved.
- Saves are traceable: a save's fingerprint records every mod that was loaded, and a save loads only in an engine that can reproduce that fingerprint.

The next steps:
1. Implement the `SandboxedHost` and the ShadowRealm/Worker isolation layer.
2. Implement the static analysis pass and the manifest signature verification.
3. Build the mod manager UI (permissions review, conflict resolution, load order).
4. Publish the first-party registry with the Ed25519 key trust store.
5. Author the first content mod (a spirit-fox pack) as the reference for the declarative surface.
