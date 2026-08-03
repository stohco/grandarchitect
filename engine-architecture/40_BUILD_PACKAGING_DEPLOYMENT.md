# 40 — Build, Packaging & Deployment

**Status:** Architecture. The build system and deployment model.
**Date:** 2026-08-03

---

## 0. What this document is

The engine is browser-native (doc 17). "Browser-native" is not a deployment detail; it is a set of hard constraints: the engine needs SharedArrayBuffer (for workers), which needs COOP/COEP headers, which needs a real hosting origin (not GitHub Pages). The build system is the layer that turns the source tree into a deployable set of static assets + a service worker + a manifest, with the headers configured at the edge.

The doctrine (AGENTS.md Part 1) says: "Prefer established, well-maintained libraries when they reduce overall complexity." The build system uses Vite (dev server + bundler), esbuild (transpile), rollup (production bundle), glTF-Transform (asset pipeline), KTX2-encoder (texture compression), and Workbox (service worker). None of these are reimplemented. The build's job is to orchestrate them.

The doctrine (Part 3) also says: "Cite the precedent." The precedent for COOP+COEP on a static host is the Three.js project's own documentation (researched in doc 08) — they explicitly say GitHub Pages will not work and self-hosting with correct headers is required.

---

## 1. The 16 questions

### 1.1 The build system

The build system is a Vite-based pipeline. Vite serves the dev build (ES modules, hot-reload) and produces the production build (rollup-bundled, hashed filenames, tree-shaken). The engine's build config adds three engine-specific steps: the asset pipeline (§1.2), the service worker generation (§1.4), and the headless build (§1.9).

```typescript
interface BuildConfig {
  // The Vite root
  root: string;
  // The fingerprint this build produces (baked into the bundle, part of every save)
  fingerprint: DeterminismFingerprint;
  // The asset pipeline config
  assets: AssetPipelineConfig;
  // The service worker config
  serviceWorker: ServiceWorkerConfig;
  // The build mode (affects what is included)
  mode: 'dev' | 'production' | 'headless';
  // The hardware tier default (the user can override at runtime)
  defaultTier: HardwareTier;
}
```

### 1.2 The asset pipeline (Blender → glTF-Transform → meshopt/KTX2 → GLB)

The asset pipeline turns source assets (Blender files, PNGs, WAVs) into engine-ready assets (GLB with meshopt-compressed meshes, KTX2 textures, Opus audio). It is content-addressed: every output asset's filename is its SHA-256 hash, so identical inputs produce identical outputs and the CDN cache hits.

```
Source                  Pipeline stage             Output
────────                ──────────────             ──────
foo.blend        ──►   Blender CLI export   ──►   foo.gltf (temp)
foo.gltf         ──►   glTF-Transform       ──►   foo.optimized.gltf
                       (dedupe, prune,
                        weld, rename)
foo.optimized    ──►   meshopt encoder      ──►   foo.meshopt.gltf
foo.meshopt      ──►   KTX2 encoder         ──►   foo.final.glb
                       (textures → KTX2,
                        embed in GLB)
foo.final.glb    ──►   SHA-256 hash         ──►   <hash>.glb

bar.png          ──►   KTX2 encoder         ──►   <hash>.ktx2
baz.wav          ──►   Opus encoder         ──►   <hash>.opus
```

```typescript
interface AssetPipelineConfig {
  // The source directories (watched in dev, processed in build)
  sources: { blend: string; png: string; wav: string };
  // The output directory (content-addressed)
  output: string;
  // The KTX2 encoder options
  ktx2: { mode: 'uastc' | 'etc1s'; quality: number; mipmaps: boolean };
  // The meshopt compression level
  meshopt: { level: 'medium' | 'high' };
  // The Opus bitrate
  opus: { bitrate: 64000 };
}
```

The pipeline is idempotent and content-addressed: re-running on unchanged inputs produces no new outputs (the hashes match). The build tracks source → output mappings in a manifest, so only changed sources are re-processed. This is what makes the asset pipeline fast enough for dev iteration.

### 1.3 Code bundling (esbuild/rollup)

Vite uses esbuild for dev (transpile-only, fast) and rollup for production (tree-shake, code-split, hash filenames). The engine's code bundling has three concerns:

1. **Worker bundling.** Each Web Worker is a separate entry point. Vite's worker plugin handles this; the engine configures the worker format as ES modules (required for the determinism stack's BigInt usage).
2. **WASM bundling.** Jolt WASM and the KTX2 decoder are loaded as `WebAssembly.instantiateStreaming` from hashed URLs. The build emits them as assets.
3. **Plugin bundling.** Engine plugins are bundled into the main chunk; mods are loaded at runtime (not bundled).

```typescript
interface CodeBundleConfig {
  entries: {
    main: 'src/main.ts';
    workers: {
      determinism: 'src/workers/determinism.ts';
      assetDecoder: 'src/workers/asset-decoder.ts';
      headlessSim: 'src/workers/headless-sim.ts';
    };
  };
  // The fingerprint is baked in as a constant — it cannot be a runtime
  // computation because that would make the build non-reproducible.
  fingerprintInjection: true;
  // Tree-shaking is aggressive in production
  treeshake: 'production' ? 'smallest' : false;
}
```

### 1.4 The service worker (COOP/COEP headers for SharedArrayBuffer)

SharedArrayBuffer requires a cross-origin-isolated context, which requires COOP (`Cross-Origin-Opener-Policy: same-origin`) and COEP (`Cross-Origin-Embedder-Policy: require-corp`) headers. These are response headers, set by the hosting server, not by the bundle. The service worker's job is to:

1. Cache the static assets for offline play (§1.6).
2. Act as a fallback for the COEP header on hosts that do not set it (the service worker can inject the header on cached responses, but only if the host already serves with COOP — see §1.7).

```typescript
interface ServiceWorkerConfig {
  // The precache manifest (generated by Workbox from the build output)
  precache: { url: string; revision: string }[];
  // The runtime cache strategies
  runtimeCaching: [
    { urlPattern: /\/assets\//, handler: 'CacheFirst',  options: { cacheName: 'assets' } },
    { urlPattern: /\/mods\//,    handler: 'StaleWhileRevalidate', options: { cacheName: 'mods' } },
    { urlPattern: /\/api\//,     handler: 'NetworkFirst', options: { cacheName: 'api' } },
  ];
  // The COEP header to inject on cached responses (for hosts that don't set it)
  injectCoep: boolean;
}
```

The service worker is generated by Workbox from the build output. The precache manifest lists every static asset with its content hash; on install, the service worker fetches and caches them all. On subsequent loads, the service worker serves from cache, falling back to network for stale-while-revalidate.

### 1.5 Progressive loading (initial payload, streamed assets)

The initial payload is the smallest set of assets needed to render the loading screen and start the engine bootstrap. Everything else streams in.

```typescript
interface ProgressiveLoadingPlan {
  // The initial payload — must load before the engine can boot
  initial: {
    html: 'index.html';
    main: 'main.<hash>.js';      // the engine bootstrap + core plugins
    css: 'main.<hash>.css';
    fingerprint: 'fingerprint.json';
    // The minimum assets to render the loading screen and bootstrap the
    // first scene (the player's starting village)
    assets: string[];            // ~5 MiB total
  };
  // The streamed assets — fetched on demand as the engine needs them
  streamed: {
    // The first village's full asset set (~50 MiB)
    village: string[];
    // The region's asset set (~200 MiB)
    region: string[];
    // The world's asset set (streamed as the player travels)
    world: string[];
  };
  // The boot sequence
  boot: [
    'load initial payload',
    'show loading screen',
    'init engine + core plugins',
    'fetch village assets (parallel)',
    'when village assets ready, start scene',
    'continue fetching region assets in background',
  ];
}
```

The initial payload is bounded at 5 MiB (gzip). This is enough for the engine bootstrap, the core plugins, and the starting village's geometry + textures. The loading screen renders as soon as the initial payload is down; the village loads in the background and the scene starts when the village assets are ready.

### 1.6 PWA support (offline play)

The engine is a PWA. After the first visit, the service worker has the initial payload cached; the player can launch the engine offline. The full offline experience (all assets for all regions the player has visited) is cached as the player travels — the engine caches every asset it fetches, so the regions the player has explored are playable offline.

```typescript
interface PwaManifest {
  name: 'Grand Architect';
  short_name: 'Grand Architect';
  // The display mode — fullscreen for the game, standalone for the editor
  display: 'fullscreen';
  // The start_url — the entry point
  start_url: '/';
  // The icons (multiple sizes, content-addressed)
  icons: { src: string; sizes: string; type: string }[];
  // The background color (shown during splash)
  background_color: '#09090b';
  theme_color: '#09090b';
}
```

The PWA install prompt is offered after the player's first save (so the player has invested before being asked to install). The install size grows as the player explores — the engine does not pre-download the entire world.

### 1.7 Self-hosting requirements (vs GitHub Pages limitations)

GitHub Pages does not support COOP/COEP headers, so it cannot host the engine. The self-hosting requirements are:

| Requirement | Why | How |
|---|---|---|
| COOP: `same-origin` | SharedArrayBuffer | Set in the web server config |
| COEP: `require-corp` | SharedArrayBuffer | Set in the web server config |
| HTTPS | Service worker, WebGPU, COEP | TLS certificate (Let's Encrypt) |
| Custom headers on `/.well-known/` | PWA, COEP reports | Server config |
| Range request support | Asset streaming | Standard on all real web servers |
| Brotli/gzip compression | Initial payload size | Standard |
| HTTP/2 or HTTP/3 | Parallel asset fetches | Standard on modern servers |

The reference deployment is Caddy (the `Caddyfile` is in the project root). Caddy sets headers, terminates TLS automatically, and supports HTTP/3. The doctrine (AGENTS.md Part 1) says "Prefer established, well-maintained libraries" — Caddy is the established, well-maintained choice for this exact use case.

```caddy
# Caddyfile (simplified)
grand-architect.engine {
  header {
    Cross-Origin-Opener-Policy "same-origin"
    Cross-Origin-Embedder-Policy "require-corp"
    Cross-Origin-Resource-Policy "same-origin"
    # Long-cache content-addressed assets
    Cache-Control "public, max-age=31536000, immutable"
  }
  root * /var/www/grand-architect
  file_server
  # SPA fallback
  try_files {path} /index.html
}
```

### 1.8 The production build vs dev build

| Aspect | Dev build | Production build |
|---|---|---|
| Bundler | Vite dev server (ES modules, no bundling) | Rollup (bundled, tree-shaken, hashed) |
| Source maps | Inline | External, hidden |
| Hot reload | On (Vite HMR) | Off |
| Determinism enforcer | On (proxy throws on `Math.random`) | Off (no-op, but periodic checkpoint still runs) |
| Editor shell | All editors visible | Dev-only editors hidden |
| Asset pipeline | Watched (re-process on change) | One-shot (all assets processed at build) |
| Service worker | Disabled (cache would interfere with HMR) | Enabled |
| Source map for plugins | Available | Not included (size) |
| Logging level | trace+ | warn+ |
| Tracing | Available, opt-in | Available, opt-in |
| Save log | Available, opt-in | Available, opt-in |

The dev build is for development; the production build is what ships. They share the same source — the build mode is a Vite env variable that the code reads (`import.meta.env.DEV`). The engine does not have separate "dev" and "production" codepaths beyond the enforcer toggle and the editor visibility.

### 1.9 The headless build (for CI/testing)

The headless build is a Node-runnable bundle of the engine, without the renderer, without the DOM, without the service worker. It is what the test framework (doc 38 §1.9) uses for Node-mode tests.

```typescript
interface HeadlessBuildConfig {
  entry: 'src/headless.ts';
  // The fingerprint (same as the browser build — the determinism stack is shared)
  fingerprint: DeterminismFingerprint;
  // No WebGPU, no DOM, no service worker
  excludes: ['renderer', 'dom', 'service-worker'];
  // The output is a single CommonJS or ESM bundle
  format: 'esm';
  // The bundle includes the determinism stack, the plugin host, the core plugins
  // (minus renderer), and the headless API
  include: ['determinism', 'core', 'plugin-host', 'headless-api'];
}
```

The headless build is produced by the same Vite config, with a different entry point and a different externals list. It is published as an npm package (`@grand-architect/headless`) so CI can install it without rebuilding. The package's version is the fingerprint schemaVersion — a headless build at `0.1.0` produces the same hashes as a browser build at `0.1.0`.

### 1.10 How is the fingerprint baked into the build?

The fingerprint is computed at build time from the source (the determinism stack's source files are hashed, and the hash is part of the fingerprint). The fingerprint is then injected as a constant in the bundle:

```typescript
// In the built bundle, this is a literal object, not a runtime computation.
export const FINGERPRINT: DeterminismFingerprint = {
  schemaVersion: '0.1.0',
  rng: { algorithm: 'xoshiro256** + splitmix64 (BigInt-backed)', version: '0.1.0' },
  // ...
  // The build hash — a SHA-256 of the source files that produce this fingerprint
  buildHash: 'abc123...',
};
```

This means two builds from the same source produce the same fingerprint, and the fingerprint is part of every save. A save from build A loads in build B if and only if the fingerprints match (per doc 08).

### 1.11 How are mods packaged?

Mods are packaged as CBOR archives (doc 35 §2.6). The build system does not package mods — mods are authored separately, signed by their authors, and published to the first-party registry. The engine's build only produces the engine itself; mods are a separate distribution channel.

The mod tooling (a separate npm package, `@grand-architect/mod-tools`) provides:

- `mod-tools build` — compile a mod's TypeScript, bundle its assets, produce the CBOR archive.
- `mod-tools sign` — sign the archive with the author's Ed25519 key.
- `mod-tools publish` — upload the signed archive to the first-party registry.

### 1.12 How is the build reproducible?

The build is reproducible: two builds from the same source, on the same Vite version, produce byte-identical output. This is enforced by:

1. **Deterministic asset hashing.** The content-addressed asset filenames are SHA-256 of the asset bytes; identical inputs produce identical filenames.
2. **No timestamps in the bundle.** The build time is not embedded; the fingerprint's `generatedAt` is set at runtime, not build time.
3. **Pinned dependency versions.** The `package-lock.json` is committed; CI uses `npm ci` (not `npm install`).
4. **Pinned Vite version.** Vite's output is stable across patch versions but not necessarily across minor versions; the engine pins a specific Vite minor.

A reproducibility test (part of the test framework, doc 38) asserts that two builds of the same commit produce identical bundle hashes.

### 1.13 How is the build deployed?

The deployment is a static file copy: the production build's `dist/` directory is copied to the web server's root. No server-side code. The Caddyfile sets the headers; the files are served as-is.

The deployment pipeline (CI):

1. On tag `v*`, build the production bundle.
2. Build the headless bundle (separate job).
3. Run the test suite (doc 38).
4. If tests pass, upload `dist/` to the web server via rsync.
5. Invalidate the CDN cache (the assets are content-addressed, so cache invalidation is per-asset — only changed assets need invalidation).

There is no blue-green deployment, no canary, no rollback machinery. The assets are content-addressed; a rollback is reverting `index.html` (which points to the new asset hashes) to the previous version. The old assets are still on the server, still cached, still loadable.

### 1.14 How is the dev build served?

`npm run dev` starts the Vite dev server. The dev server proxies API requests to the engine's WebSocket service (the `mini-services/engine-ws` in the project). The dev server does not set COOP/COEP headers (Vite does not support them natively), so SharedArrayBuffer is not available in dev mode — the engine falls back to a non-SharedArrayBuffer worker mode for dev. This is a known limitation; the doctrine (AGENTS.md Part 3) says "Confront the central tension directly" — the tension is "fast dev iteration vs. accurate production behavior," and the resolution is to test cross-browser determinism on a production build, not in dev.

### 1.15 How are source maps handled?

Dev build: inline source maps (fast iteration). Production build: external source maps, hidden (not served to end users, but uploaded to the crash reporting endpoint). The crash report includes the source map reference; the crash endpoint resolves the stack trace server-side, so the user's crash report does not expose source code.

### 1.16 How is the build versioned?

The build version is the fingerprint schemaVersion (currently `0.1.0`). The git tag (`v0.1.0`) is the human-friendly version. The build hash (SHA-256 of the source) is the precise version. All three are surfaced in the engine's About box, in the crash report, and in the save file's metadata.

A save from `v0.1.0` loads in `v0.1.0` and in `v0.1.1` (patch) if the fingerprint is unchanged. A save from `v0.1.0` does not load in `v0.2.0` (minor) if the fingerprint changed — the user is told "This save was made with engine v0.1.0. Current engine is v0.2.0. The save cannot be loaded without migration."

---

## 2. The build pipeline

```
Source tree
   │
   ├── src/                      ← engine source (TypeScript)
   ├── assets/                   ← source assets (.blend, .png, .wav)
   ├── mods/                     ← mod sources (separate packages)
   │
   ▼
┌──────────────────────────────────────────────────────────────┐
│  Vite build                                                  │
│   ├── esbuild transpile (dev) / rollup bundle (production)   │
│ ├── asset pipeline (Blender CLI, glTF-Transform, KTX2, Opus)│
│   ├── Workbox service worker generation                      │
│   └── fingerprint injection                                  │
└────────────────┬─────────────────────────────────────────────┘
                 │
        ┌────────┴────────┐
        ▼                 ▼
   dist/                headless/
   (browser build)      (Node build)
        │                 │
        ▼                 ▼
   rsync to web       npm publish
   server             @grand-architect/headless
```

---

## 3. Failure cases

| Failure | Detection | Recovery | User sees |
|---|---|---|---|
| Asset pipeline: Blender not installed | Build step fails | Surface error | "Blender 4.2+ required for asset build." |
| Asset pipeline: source file missing | Build step fails | Surface error | "Source 'foo.blend' not found." |
| Asset pipeline: KTX2 encoder OOMs | Process crash | Retry with lower quality, then fail | "KTX2 encode failed for 'bar.png'. Try lower quality." |
| Bundle too large (>10 MiB initial) | Build warning | Surface warning, suggest code-split | "Initial bundle is 12 MiB. Consider code-splitting." |
| Service worker generation fails | Workbox error | Build fails | "Service worker generation failed: <error>." |
| COOP/COEP not set on host | Runtime check (SharedArrayBuffer undefined) | Surface error, refuse to boot | "This host does not set COOP/COEP. SharedArrayBuffer unavailable. See docs." |
| CDN cache miss on content-addressed asset | 404 | Re-fetch from origin | (invisible — CDN re-fetches) |
| Headless build fingerprint mismatch | Test assertion | Build fails | "Headless build fingerprint differs from browser build. Investigate." |
| Build not reproducible | Reproducibility test | Build fails | "Build output differs from previous build of same commit." |
| Mod packaging fails (unsigned, etc.) | `mod-tools build` | Surface error | "Mod build failed: <error>." |
| Deploy: rsync fails | CI step | Retry, then fail | "Deploy failed. Investigate." |
| Deploy: CDN invalidation fails | CI step | Retry, then warn | "CDN invalidation partial. Some users may see stale assets." |
| Source map upload fails | CI step (non-blocking) | Skip upload, log | (invisible to user; crash reports lose stack resolution) |

---

## 4. Rejected alternatives

- **Webpack instead of Vite.** Rejected: Vite is faster (esbuild transpile), has native ESM, and integrates cleanly with the worker and WASM bundling. Webpack's configuration model is more complex for no benefit here.

- **Hosting on GitHub Pages.** Rejected: GitHub Pages does not support COOP/COEP, so SharedArrayBuffer is unavailable, so the engine cannot run. This is researched and documented in doc 08. Self-hosting with Caddy is the simplest path that meets the requirement.

- **Hosting on Vercel/Netlify.** Rejected for the production deployment: they support COOP/COEP but their free tiers have bandwidth limits that the engine's content-addressed asset streaming will exceed. They are acceptable for staging; the production deployment is self-hosted.

- **A custom asset pipeline.** Rejected: glTF-Transform, KTX2 encoder, and meshopt are established, well-maintained libraries. Reimplementing them would violate the doctrine (AGENTS.md Part 1).

- **Bundling mods into the engine build.** Rejected: mods are a separate distribution channel (doc 35). Bundling them would couple mod releases to engine releases and break the modding model.

- **A custom service worker.** Rejected: Workbox handles the precache manifest, runtime caching strategies, and versioning. A custom service worker would reimplement this.

- **No headless build (run tests in browser only).** Rejected: the seed matrix (doc 38 §1.8) multiplies test count by 8; running all of them in a browser is too slow for CI. The headless build is the cost-effective path.

- **Embedding the build time in the bundle.** Rejected: a build timestamp breaks reproducibility. The fingerprint's `generatedAt` is set at runtime, not build time.

- **A custom web server.** Rejected: Caddy is the established choice. It handles TLS, headers, HTTP/3, and static serving. A custom server would reimplement this.

- **Source maps served to end users.** Rejected: source maps expose engine internals. They are uploaded to the crash endpoint and resolved server-side; users see resolved stack traces in their crash reports, not source code.

---

## 5. What this document enables

A build and deployment system where:
- Source assets (Blender, PNG, WAV) are transformed into engine-ready, content-addressed assets.
- The dev build is fast (Vite HMR) and the production build is small (rollup tree-shake) and reproducible.
- The service worker enables offline play and caches every asset the player explores.
- The hosting sets the COOP/COEP headers required for SharedArrayBuffer.
- The initial payload is small (5 MiB) and the rest streams in.
- The headless build runs the test suite in Node, in seconds.
- The fingerprint is baked in, so every save is traceable to a specific build.
- The build is reproducible: same source + same Vite version = same output.
- The deployment is a static file copy, with content-addressed assets that cache forever.

The next steps:
1. Set up the Vite config with the asset pipeline and the worker bundling.
2. Configure the Caddyfile for the reference deployment.
3. Generate the service worker with Workbox.
4. Build the headless bundle as a separate npm package.
5. Wire the reproducibility test into CI.
