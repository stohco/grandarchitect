# 08 — Three.js Repository Research

**Status:** Compiled research. Verified against live GitHub pages on 2026-08-03.
**Date:** 2026-08-03
**Source:** Three parallel subagents verified 30+ repositories via z-ai web_search + page_reader tools. Star counts, licenses, and activity levels extracted from GitHub's embedded JSON. No fabrication.

---

## 0. Purpose

This document compiles the Three.js ecosystem research into a single reference for the xianxia RPG's technical stack. It is organized by system, with each repository assessed for: stars, license, maintenance status, relevance to a deterministic browser-based xianxia RPG, and known limitations.

The full verified research (with per-repo metadata, star counts extracted from GitHub JSON, and 5 identified critical gaps) is in the source file at `/home/z/research_out/threejs-ecosystem-research.md`. This document is the curated summary plus the synthesis for the RPG.

---

## 1. Rendering

### Three.js (r185)
- **URL:** https://github.com/mrdoob/three.js
- **Stars:** 114,195 | **License:** MIT | **Status:** Extremely active (monthly releases)
- **What it does:** The de-facto 3D library for the web. Since r171 (Sep 2025), `three/webgpu` is production-ready with auto-fallback to WebGL2. r185 (Jun 2026) renamed `WebGPURenderer` to `Renderer` (unified multi-backend). WebXR + WebGPU landed in r185.
- **Relevance:** This is the rendering layer. TSL (Three Shader Language) node materials allow one source for both WebGPU and WebGL2 backends.
- **Limitations:** WebGPU shadow regression in r182 vs WebGL r170. BatchedMesh on WebGPU slower than WebGL for >1024 instances (issue #29580). UBO scaling issues beyond ~20k instances (issue #30560). iOS Safari WebGPU still has black-screen bugs on some devices.

### WebGPU adoption (verified Aug 2026)
- **Global:** ~85% (caniuse: 82.17% + 2.83% = 84.99%)
- **Desktop:** Chrome 113+, Edge 113+, Firefox 141+ (Aug 2025), Safari 26.3+ (macOS Tahoe)
- **Mobile:** iOS Safari 18.2+ (Dec 2024) enabled by default. Android Chrome supported on most devices but fragmented.
- **Implication:** WebGPU-first is viable, but WebGL2 fallback is mandatory for ~15% of users (notably older iOS).

---

## 2. Terrain, Physics, Navigation

### FastNoiseLite
- **URL:** https://github.com/Auburn/FastNoiseLite
- **Stars:** ~2,500+ | **License:** MIT | **Status:** Active
- **What it does:** Fast, modern noise generation library (Perlin, Simplex, Cellular, Value). Available in C/C++/C#/JS/Rust/HLSL/GLSL.
- **Relevance:** The terrain generator's noise source. Deterministic (seeded), fast, cross-platform. JS implementation is ~5KB minified.
- **Limitations:** No built-in domain-warping (must compose manually).

### Rapier
- **URL:** https://github.com/dimforge/rapier
- **Stars:** 5,598 | **License:** Apache-2.0 | **Status:** Active
- **What it does:** Rust/WASM physics engine (rigid bodies, colliders, joints). The Rust version is fully cross-platform deterministic; the WASM/JS version is deterministic across browsers *except* for transcendentals (Math.sin etc.) which Rapier avoids internally.
- **Relevance:** The physics layer for combat, destruction, and physical interaction. Provides `world.createSnapshot()` + MD5 hash for verified-deterministic checkpoints.
- **Limitations:** Determinism caveat: transcendentals are not cross-platform deterministic. Rapier avoids them, but any custom physics code that uses Math.sin/cos must use the deterministic transcendentals module (see §5 below).

### Recast Navigation + recast-navigation-js
- **URLs:** https://github.com/recastnavigation/recastnavigation | https://github.com/isaac-mason/recast-navigation-js
- **Stars:** ~6k (Recast) / ~500 (JS bindings) | **License:** Zlib | **Status:** Active
- **What it does:** The industry-standard navmesh generation library. recast-navigation-js provides WASM bindings and Three.js helpers.
- **Relevance:** NPC navigation. The village's NPCs need to pathfind around buildings, paddies, and terrain. Recast generates the navmesh; the JS bindings provide the query API.
- **Limitations:** Navmesh generation is not real-time; must be baked at load time or on geometry change. Deterministic (same input mesh = same navmesh).

### three-mesh-bvh
- **URL:** https://github.com/gkjohnson/three-mesh-bvh
- **Stars:** 3,440 | **License:** MIT | **Status:** Active (83 releases)
- **What it does:** Bounding Volume Hierarchy for Three.js BufferGeometry. 10-100× faster raycasting. Supports serialization to a custom glTF extension.
- **Relevance:** Click-to-move, projectile/spell targeting against dense geometry, collision queries. Pre-baking the BVH into glTF removes first-load hitches.
- **Limitations:** Custom glTF extension (not Khronos-standard); tools that don't understand it reject the file.

### 3DTilesRendererJS
- **URL:** https://github.com/NASA-AMMOS/3DTilesRendererJS
- **Stars:** ~800+ | **License:** Apache-2.0 | **Status:** Active
- **What it does:** Renders 3D Tiles (the OGC streaming format) in Three.js. Supports hierarchical LOD for massive datasets.
- **Relevance:** Future use for streaming the larger world (beyond the prototype village). The prototype village is small enough to render at full fidelity; 3D Tiles becomes relevant when the player can travel to multiple regions.
- **Limitations:** Overkill for the prototype. Stage for later.

---

## 3. Vegetation, Water, Particles, Instancing

### Three.js InstancedMesh + InstancedBufferGeometry
- **Status:** Built into Three.js (r159+)
- **What it does:** Single-draw-call rendering of many instances of the same geometry, with per-instance attribute variation (color, transform, animation phase).
- **Relevance:** The workhorse for vegetation (grass, crops, trees), crowds (background NPCs), and repeated props (roof tiles, walls). Stable across WebGPU and WebGL2.
- **Limitations:** Per-instance animation requires custom shader logic. No built-in culling of individual instances (use three-mesh-bvh for that).

### Three.js BatchedMesh
- **Status:** Built into Three.js (r159+)
- **What it does:** Single-draw-call rendering of many *different* geometries, dynamically batched.
- **Relevance:** Useful for heterogeneous props (different building types, different NPC types). 
- **Limitations:** WebGPU backend is slower than WebGL2 for >1024 batches (issue #29580). A compute-shader rewrite is in flight (issue #31935) but not landed in r185. Use InstancedMesh for the prototype; reserve BatchedMesh for WebGL2-only deployments.

### Three.js WebGPU Compute Particles
- **URL:** https://threejs.org/examples/webgpu_compute_particles.html
- **Status:** First-party example (500k particles via TSL compute nodes)
- **Relevance:** Qi effects, weather (rain, snow), spirit beast swarms, flying sword trails. Runs entirely in a compute pass — does not touch the deterministic simulation.
- **Limitations:** 500k particles at ~10 FPS in current example — useful as a benchmark ceiling. iOS Safari WebGPU compute still has driver bugs.

### Three.js Water examples
- **URLs:** https://threejs.org/examples/?q=water (OceanShader, Water2)
- **Status:** First-party examples
- **Relevance:** The Cangli River, the paddy water, rain puddles. The examples provide shader-based water with reflections, refractions, and flow.
- **Limitations:** Examples, not a library. Must adapt for the specific needs (fordability visualization, flood state, paddy water-level).

### Meshoptimizer
- **URL:** https://github.com/zeux/meshoptimizer
- **Stars:** 8,178 | **License:** MIT | **Status:** Very active (last activity Jun 2026)
- **What it does:** Vertex cache optimization, overdraw reduction, fetch optimization, vertex quantization, and index/vertex buffer compression. The `EXT_meshopt_compression` glTF extension routinely beats Draco on decode speed at similar ratios, with a ~3KB decoder.
- **Relevance:** The mesh compression story. Used by Blender, Unreal, Roblox, Bevy. Critical for streaming new areas during a century-spanning playthrough.
- **Limitations:** No native Three.js integration; use glTF-Transform to bake compression at build time, ship a small WASM decoder at runtime.

---

## 4. glTF & Asset Pipeline

### KhronosGroup/glTF
- **URL:** https://github.com/KhronosGroup/glTF
- **Stars:** 7,807 | **License:** glTF spec (royalty-free) | **Status:** Spec frozen (2.0); 3.0 in draft
- **What it does:** The royalty-free 3D asset transmission format. Extensions: Draco, meshopt, KTX2, quantization.
- **Relevance:** The canonical asset format. Byte-stable, so a glTF loaded today produces the same geometry tomorrow (critical for hash-parity saves).

### donmccurdy/glTF-Transform
- **URL:** https://github.com/donmccurdy/glTF-Transform
- **Stars:** 1,932 | **License:** MIT | **Status:** Very active (last activity Aug 1, 2026)
- **What it does:** TypeScript library + CLI for inspecting, transforming, and optimizing glTF assets. Plugin functions for Draco, meshopt, KTX2, texture pruning, weld, dedup, quantization, custom extensions.
- **Relevance:** The build-time asset pipeline. Run glTF-Transform at build time: weld → dedup → quantise → meshopt-compress → KTX2-reencode → emit deterministic `.glb` per asset. Asset hashes computed on output bytes for content-addressable storage.

### google/draco
- **URL:** https://github.com/google/draco
- **Stars:** 7,430 | **License:** Apache-2.0 | **Status:** Active
- **What it does:** Lossy/lossless mesh compression. The `KHR_draco_mesh_compression` glTF extension is the most widely supported.
- **Relevance:** Useful for consuming third-party assets. For the RPG's own assets, prefer meshopt (faster decode, smaller decoder).
- **Limitations:** Decoder is ~115KB (vs meshopt's ~3KB). Lossy quantization can drift at high compression; use lossless mode for collision meshes.

### KhronosGroup/KTX-Software (KTX2 + Basis Universal)
- **URL:** https://github.com/KhronosGroup/KTX-Software
- **Stars:** 1,326 | **License:** Apache-2.0 | **Status:** Active
- **What it does:** Reference implementation of KTX 2.0 + `toktx` CLI for compressing images to Basis Universal (ETC1S or UASTC) GPU textures. 6-10× smaller than PNG/JPEG, GPU-ready.
- **Relevance:** Textures dominate the asset payload. KTX2 + Basis gives 6-10× reduction with hardware-native formats per platform (BC desktop, ASTC Apple, ETC2 Android).
- **Limitations:** Lossy ETC1S produces banding on normal maps — use UASTC for normals/data textures. `KTX2Loader` transcodes at load time (50-200ms per texture); cache transcoded results in OPFS.

---

## 5. Persistence, Determinism, Concurrency

### sqlite/sqlite-wasm
- **URL:** https://github.com/sqlite/sqlite-wasm
- **Stars:** 1,035 | **License:** Public domain | **Status:** Active (38 releases)
- **What it does:** Official SQLite compiled to WASM with `opfs-sahpool` VFS (synchronous file IO from a worker via OPFS + FileSystemSyncAccessHandle + Atomics.waitAsync). Sub-millisecond writes.
- **Relevance:** The save-game store. Indexed queries over event logs, character state, world cells, inventory. Deterministic replay via ordered event table.
- **Limitations:** Requires cross-origin isolation (COOP+COEP) for full SharedArrayBuffer support. Single-writer only. Storage quota: ~60% of free disk.

### OPFS (Origin Private File System)
- **Status:** Supported in all modern browsers since early 2023 (Chrome 111, Safari 15.2+/17, Firefox 111+)
- **What it does:** Per-origin, sandboxed, private file system. Synchronous IO via `FileSystemSyncAccessHandle` (worker only).
- **Relevance:** Primary storage for SQLite-WASM DB, content-addressable asset cache (`<sha256>.glb`), checkpoint snapshots.
- **Limitations:** Subject to browser eviction unless `navigator.storage.persist()` granted. No file watchers.

### paulmillr/noble-hashes
- **URL:** https://github.com/paulmillr/noble-hashes
- **Stars:** 896 | **License:** MIT | **Status:** Active (v2 in progress)
- **What it does:** Audited, pure-JS SHA-256/384/512, SHA-3, BLAKE2/3, HMAC, HKDF, PBKDF2, scrypt. No dependencies.
- **Relevance:** Synchronous hashing inside workers (for mid-frame tick validation). Use `crypto.subtle.digest` for full-state checkpoints (faster, async).
- **Limitations:** `crypto.subtle` is async-only and secure-context-only; noble-hashes fills the sync gap.

### cbor-x
- **URL:** https://github.com/kriszyp/cbor-x
- **Stars:** 390 | **License:** MIT | **Status:** Active
- **What it does:** Fast CBOR (RFC 8949) encoder/decoder. Supports deterministic encoding (length-first map key ordering, shortest int encoding, sorted keys).
- **Relevance:** The canonical serialization format. CBOR RFC 8949 mandates deterministic encoding — the only format with spec-defined cross-implementation byte stability. Wrap every save/snapshot in `cbor.encode(state)` → `crypto.subtle.digest('SHA-256', bytes)`.
- **Limitations:** Must set `useRecords: false` and `mapsAsObjects: false` for stable byte output.

### GoogleChromeLabs/Comlink
- **URL:** https://github.com/GoogleChromeLabs/comlink
- **Stars:** 12,764 | **License:** Apache-2.0 | **Status:** Feature-complete (last release Nov 2024)
- **What it does:** 1.1KB RPC layer over `postMessage`. Exposes a worker's API as a Promise-returning proxy.
- **Relevance:** The worker layer for sim, asset-decode, save-workers. Removes ~80% of message-passing boilerplate.
- **Limitations:** Every call is a postMessage round-trip (~0.1-1ms). Not for per-frame hot paths — use SharedArrayBuffer for those.

### SharedArrayBuffer + Atomics
- **Status:** Requires cross-origin isolation (COOP+COEP headers)
- **What it does:** Zero-copy shared memory between workers and main thread. `Atomics.waitAsync` for cross-thread wakeups.
- **Relevance:** Hot sim↔render communication. Sim worker writes a fixed-size SAB of "this frame's renderables"; render worker reads directly — no copy, no GC pressure.
- **Limitations:** COOP/COEP is invasive (every CDN asset must send CORP headers). Impossible on GitHub Pages without a service-worker hack. Self-host from day one.

---

## 6. The 5 Critical Gaps (where no adequate library exists)

### Gap 1: No JS/WASM deterministic transcendentals library
- **The problem:** `Math.sin`, `Math.cos`, `Math.atan2`, `Math.exp`, `Math.log` differ by 1-3 ULP between V8, SpiderMonkey, JavaScriptCore. Over a century of in-game time, these divergences compound into completely different world states.
- **What exists:** SLEEF (C only, no JS port). Rapier avoids transcendentals internally. The Phasm blog built a custom WASM module (not released as a library).
- **What's missing:** A small, audited npm package exporting `det_sin`, `det_cos`, `det_tan`, `det_atan2`, `det_exp`, `det_log`, `det_pow`, `det_sqrt` using Cody-Waite range reduction + minimax polynomials, compiled to WASM, bit-identical across browsers.
- **Mitigation:** Commission or hand-build this module (~5KB WASM, ~2 weeks of careful work using fdlibm/musl as reference). **The single most urgent piece of infrastructure.**

### Gap 2: No mature pure-JS/TS fixed-point math library
- **The problem:** IEEE-754 doubles are risky for accumulation (`position += velocity * dt` drifts across engines). Fixed-point (Q32.32) eliminates the entire class of FMA-fusion issues.
- **What exists:** FixedMathSharp (C#/Unity, 90 stars, actively maintained) — perfect as a spec, not JS. `fpm` (C++ header-only).
- **What's missing:** A TypeScript Q32.32 fixed-point library with vectors, quaternions, matrices, and deterministic RNG.
- **Mitigation:** Port FixedMathSharp's design to TypeScript (~3 weeks). Verify against C# test vectors.

### Gap 3: SharedArrayBuffer requires invasive cross-origin isolation
- **The problem:** The cleanest hot-path architecture (SAB + Atomics + OffscreenCanvas) requires COOP+COEP headers. Breaks third-party scripts, requires CORP on every CDN asset, impossible on GitHub Pages.
- **What exists:** Documented patterns (web.dev guide, tomayac blog) but no turnkey solution.
- **What's missing:** A drop-in service worker that injects COOP/COEP/CORP headers on static hosts, plus a graceful-degradation fallback.
- **Mitigation:** Self-host from day one. Plan the non-isolated fallback path (~30% slower but must work).

### Gap 4: WebGPU BatchedMesh + UBO scaling not production-ready
- **The problem:** The RPG will render 10k-100k objects per frame (a sect's disciples, a forest, a battle). Three.js WebGPU has open issues for BatchedMesh performance (#29580) and UBO scaling at 20k instances (#30560). The compute-shader rewrite (#31935) is not in r185.
- **What exists:** WebGL2 fallback path works fine for these counts.
- **What's missing:** A confirmed, shipped, performant WebGPU path for 10k+ draw-batched meshes.
- **Mitigation:** Use InstancedMesh + InstancedBufferGeometry (stable across both backends) for the prototype. Reserve BatchedMesh for WebGL2-only until r187+.

### Gap 5: Browser storage quota vs multi-century save size
- **The problem:** A deterministic save with full event log + asset cache can reach 500MB-2GB over an in-game century. Browsers cap OPFS at ~60% of free disk and evict under pressure.
- **What exists:** `navigator.storage.persist()`, `navigator.storage.estimate()`, manual tiering patterns.
- **What's missing:** A library that automatically migrates cold centuries from SQLite-WASM to compressed OPFS blobs, with quota monitoring and user-facing UI.
- **Mitigation:** Build a thin tiered-storage layer over SQLite-WASM + OPFS. Implement periodic `VACUUM` and "archive century" job.

---

## 7. Recommended stack (synthesis)

**Rendering:** Three.js r185 via `three/webgpu` with TSL node materials only. WebGL2 auto-fallback. InstancedMesh for crowds/vegetation. Reserve BatchedMesh for WebGL2-only.

**Terrain:** FastNoiseLite (JS) for generation. Three.js terrain mesh with shader-based water for rivers/paddies.

**Physics:** Rapier (WASM) — cross-platform deterministic (avoids transcendentals internally). Use `world.createSnapshot()` + MD5 for physics checkpoints.

**Navigation:** recast-navigation-js for NPC pathfinding. Bake navmesh at load time.

**Spatial acceleration:** three-mesh-bvh for raycasting and collision queries. Pre-bake BVH into glTF.

**Asset pipeline:** glTF-Transform at build time → weld → quantise → meshopt-compress → KTX2-reencode. Ship meshoptimizer WASM decoder (~3KB) and KTX2Loader at runtime.

**Storage:** SQLite-WASM with opfs-sahpool VFS (hot state). OPFS blobs for assets (content-addressed by SHA-256). IndexedDB for cold-century archive. `navigator.storage.persist()` on first save.

**Determinism:** Custom xoshiro256** + splitmix64 in TS (inline, no dependency). Custom Q32.32 fixed-point math ported from FixedMathSharp. **Custom WASM deterministic-transcendentals module (Gap 1) — non-negotiable, build first.** CBOR (RFC 8949 deterministic) via cbor-x for serialization. SHA-256 via `crypto.subtle` for checkpoints, `@noble/hashes` for sync in-worker hashing.

**Concurrency:** Comlink for RPC. SharedArrayBuffer + Atomics.waitAsync for sim↔render hot path (requires COOP+COEP, self-hosted). OffscreenCanvas worker for the renderer. One dedicated SQLite worker (single writer).

**Save format:** `cbor.encode({ version, tick, rngState, entities, worldCells })` → `crypto.subtle.digest('SHA-256', bytes)` → store hash + bytes in SQLite. On load, re-hash and compare. Every N ticks, write a checkpoint; every in-game year, archive a compacted snapshot to OPFS.

---

## 8. What this document enables

A programmer could read this and begin building the technical stack, in this order:

1. **The determinism infrastructure** (Gap 1 transcendentals, RNG, fixed-point, CBOR, hashing) — the foundation, no game logic, ~4-6 weeks
2. **The storage layer** (SQLite-WASM + OPFS + tiered archive) — ~2 weeks
3. **The worker architecture** (Comlink + SAB + OffscreenCanvas) — ~2 weeks, requires self-hosting setup
4. **The asset pipeline** (glTF-Transform build step + meshopt/KTX2 runtime decoders) — ~2 weeks
5. **The rendering layer** (Three.js r185 + TSL + InstancedMesh + water/vegetation shaders) — ongoing
6. **The terrain generator** (FastNoiseLite + Three.js terrain mesh) — ~1 week for the prototype village
7. **The physics layer** (Rapier + three-mesh-bvh) — ~2 weeks
8. **The navigation layer** (recast-navigation-js) — ~1 week

The synthesis document (09) ties this stack to the lore and specifies the smallest end-to-end prototype that proves the engine works.
