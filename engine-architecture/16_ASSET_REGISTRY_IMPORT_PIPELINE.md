# 16 — Asset Registry & Import Pipeline

**Status:** Engine build-time and runtime asset system. glTF canonical. Content-addressed by SHA-256. The simulation loads by hash, never by filename.
**Date:** 2026-08-03
**Engine:** Grand Architect (browser-native plugin host, deterministic contract)
**Depends on:** `ga:determinism` (CBOR, SHA-256, DeterminismFingerprint), `ga:core`, `08_THREEJS_REPOSITORY_RESEARCH §4,§5` (glTF, glTF-Transform, KTX2/Basis, meshopt, OPFS), `06_DETERMINISM_SEEDS_REPLAY` (save parity requires hash-stable assets)
**Read with:** `17_ENGINE_ARCHITECTURE §1.4` (ga:assets plugin), `11_PERSISTENCE_SAVES_MIGRATION` (asset hash references in saves; migration on hash change), `ASSET_PIPELINE_RESEARCH.md` (the research foundation this implements)

---

## 0. What this document is

This document specifies how 3D assets (meshes, skeletons, animations, textures, materials, audio) enter the engine: the build-time import pipeline, the runtime asset registry, content-addressed storage, streaming, hot reload, memory pressure, placeholders, and asset bundles. The canonical on-disk format is glTF 2.0 / GLB. The canonical texture format is KTX2/Basis. Meshes are compressed with meshoptimizer. Build-time processing uses glTF-Transform.

The engine never loads assets by filename. Every asset is loaded by its SHA-256 content hash. Two runs that load the same hash load byte-identical bytes — critical for deterministic save parity (document 17 §3).

---

## 1. The pipeline (overview)

```
   SOURCE                IMPORT              VALIDATION           PROCESSING
   ──────                ──────              ───────────          ──────────
   .blend       ──►      glTF export   ──►   schema check  ──►   glTF-Transform:
   .fbx                  (Blender CLI)       (KHR conformance)    weld → dedup →
   .png                                                              quantise →
   .svg                                                              meshopt → KTX2
       │                                                            │
       │                                                            ▼
       │                                              PACKAGING
       │                                              ─────────
       │                                              .glb (single blob)
       │                                              + sidecar .json (AssetRecord)
       │                                              hash = SHA-256(.glb bytes)
       │                                                            │
       │                                                            ▼
       │                                              REGISTRY (build artifact)
       │                                              ───────────────────────
       │                                              assets.json: hash → AssetRecord
       │                                              bundles.json: region → [hashes]
       │                                                            │
       └────────────────────────────────────────────────────────────┘
                                                                    │
                                                                    ▼
                                                       STREAMING (runtime)
                                                       ─────────────────────
                                                       request hash →
                                                       check OPFS cache →
                                                       fetch bundle if missing →
                                                       decode (meshopt/KTX2) →
                                                       upload to GPU →
                                                       return RuntimeHandle
                                                                    │
                                                                    ▼
                                                       RUNTIME HANDLES
                                                       ───────────────
                                                       MeshHandle · SkeletonHandle
                                                       TextureHandle · MaterialRef
                                                       AudioHandle · AnimationClipHandle
```

---

## 2. The AssetRecord

Every asset has an `AssetRecord` — the metadata that describes what the asset is, where it came from, what depends on it, and how it should be loaded. The record is the contract between the build pipeline and the runtime.

```typescript
interface AssetRecord {
  /** Content hash of the packaged .glb (or individual resource blob). */
  id: string;                    // SHA-256, hex, lowercase, 64 chars
  /** Asset kind. Determines the loader. */
  type: AssetType;
  /** Where the asset came from. */
  source: AssetSource;
  /** Schema version of this AssetRecord. */
  version: string;               // semver of the record format
  /** Other asset IDs this asset needs at runtime. */
  dependencies: string[];        // e.g. a mesh depends on a skeleton, a material, textures
  /** Alternate encodings for different platforms/bandwidths. */
  variants: AssetVariant[];
  /** Free-form tags for search and bundle assembly. */
  tags: string[];                // e.g. ['character', 'humanoid', 'mortal', 'cangli-riverlands']
  /** Upper bound on GPU + CPU memory when loaded. */
  memoryBudget: number;          // bytes
  /** LOD chain: distance → variant. */
  lodProfile: LodProfile;
  /** Skeleton this asset is bound to (for skinned meshes / animations). */
  skeletonProfile?: SkeletonProfile;
  /** Collision mesh hash (separate from render mesh). */
  collisionProfile?: string;     // hash of a separate collision .glb
  /** License and attribution. */
  license: AssetLicense;
  /** Provenance chain: who made it, when, from what. */
  provenance: ProvenanceEntry[];
  /** Build-time import settings used to produce this asset. */
  importSettings: ImportSettings;
  /** Validation state (post-import). */
  validationState: ValidationState;
}

type AssetType =
  | 'mesh' | 'skeleton' | 'animation-clip' | 'texture'
  | 'material' | 'audio' | 'scene' | 'collision' | 'navmesh';

interface AssetSource {
  kind: 'blender' | 'gltf-import' | 'material-maker' | 'ez-tree' | 'procedural' | 'ambientcg' | 'polyhaven' | 'unknown';
  sourcePath: string;            // path in the source repo (e.g. /art/characters/wang.blend)
  sourceRevision: string;        // git SHA of the source
  sourceLicense: string;
  sourceUrl?: string;
}

interface AssetVariant {
  id: string;                    // 'mobile', 'desktop', 'cinematic'
  hash: string;                  // SHA-256 of this variant's blob
  quality: 'low' | 'medium' | 'high' | 'cinematic';
  memoryBudget: number;
  maxLod: number;
  textureFormat: 'ktx2-etc1s' | 'ktx2-uastc' | 'ktx2-uncompressed';
  meshCompression: 'meshopt' | 'draco' | 'none';
  platform: 'webgpu' | 'webgl2' | 'universal';
}

interface LodProfile {
  levels: Array<{
    distance: number;            // max distance at which this LOD is used
    variantId: string;           // which variant of the asset
    screenRelativeError: number; // target pixel error
  }>;
  /// If the asset is past the last level's distance, it is not rendered (culled).
  cullDistance: number;
}

interface SkeletonProfile {
  standard: 'humanoid' | 'quadruped' | 'serpentine' | 'flying' | 'multi-armed' | 'giant' | 'custom';
  boneCount: number;
  boneNames: string[];           // canonical bone names (see document 17 §3)
  facialRig: boolean;
  weaponBones: string[];         // e.g. ['hand_R', 'sheath_L']
  robeBones: string[];
}

interface AssetLicense {
  type: 'CC0' | 'CC-BY-4.0' | 'CC-BY-SA-4.0' | 'MIT' | 'Apache-2.0' | 'proprietary' | 'public-domain';
  attributionText?: string;      // required for CC-BY
  commercialUse: boolean;
  modificationsAllowed: boolean;
}

interface ProvenanceEntry {
  timestamp: string;             // ISO 8601
  actor: string;                 // artist name or agent ID
  action: 'authored' | 'imported' | 'processed' | 'modified' | 'reviewed';
  notes?: string;
  toolVersion?: string;          // e.g. 'Blender 4.2', 'glTF-Transform 4.0'
}

interface ImportSettings {
  weld: boolean;                 // merge duplicate vertices
  dedup: boolean;                // remove duplicate meshes/textures
  quantizePosition: number;      // bits (default 16)
  quantizeNormal: number;        // bits (default 8)
  quantizeTexcoord: number;      // bits (default 12)
  meshopt: boolean;              // apply EXT_meshopt_compression
  meshoptLevel: 'medium' | 'high';
  ktx2: boolean;                 // re-encode textures to KTX2/Basis
  ktx2Mode: 'etc1s' | 'uastc';
  ktx2Quality: number;           // 1–100 for uastc
  pruneUnused: boolean;          // remove unused materials/textures
  simplifyRatio: number;         // 0..1, for LOD generation
  tangentGeneration: 'mikktspace' | 'none';
}

interface ValidationState {
  status: 'pending' | 'valid' | 'invalid';
  checks: ValidationCheck[];
  blockers: string[];            // if non-empty, asset cannot ship
  warnings: string[];
}

interface ValidationCheck {
  name: string;                  // e.g. 'gltf-2.0-conformance', 'no-nan-vertices', 'uv-in-range'
  passed: boolean;
  message?: string;
}
```

---

## 3. Pipeline stages in detail

### 3.1 Source

Artists author in Blender (or generate procedurally via EZ-Tree for vegetation, Material Maker for textures). Source files live in `/art/` and are version-controlled in git. The source's git SHA is recorded in the `AssetRecord.provenance`.

### 3.2 Import

Blender is run headlessly (`blender --background --python export_gltf.py`) to export each source as glTF. The exporter uses the `glTF 2.0` format with these settings:
- Y-up (engine convention)
- Apply modifiers
- Export materials as `pbrMetallicRoughness` (engine reads `GA_material_ref` extension)
- Export animations, skeletons, morph targets
- Embed textures as separate files (KTX2 conversion happens in processing)

For non-Blender sources (ambientCG, Poly Haven), the source glTF is used directly.

### 3.3 Validation

The exported glTF is validated against:
- **glTF 2.0 conformance** (via `gltf-validator`).
- **Engine conventions**: Y-up, meters as units, no negative scale, bone names match a `SkeletonProfile` standard.
- **Sanity**: no NaN vertices, no degenerate triangles, UVs in [0,1] range (or warn), no orphan materials, no missing textures.

A failed check blocks the pipeline. The asset is not packaged until validation passes.

### 3.4 Processing (glTF-Transform)

The validated glTF is processed by glTF-Transform (TypeScript API):

```typescript
import { Document, WebIO } from '@gltf-transform/core';
import {
  weld, dedup, quantize, simplify,
  meshopt, prune, textureCompress, tangents,
} from '@gltf-transform/functions';

async function processAsset(srcPath: string, settings: ImportSettings): Promise<Buffer> {
  const io = new WebIO();
  const doc = await io.read(srcPath);

  doc.setLogger(new SilentLogger());

  await doc.transform(
    prune({ keepAttributes: ['POSITION', 'NORMAL', 'TEXCOORD_0', 'JOINTS_0', 'WEIGHTS_0'] }),
    dedup(),
    weld({ tolerance: 1e-4 }),
    tangents({ generateTangents: true }),
    quantize({
      quantizePosition: settings.quantizePosition,
      quantizeNormal: settings.quantizeNormal,
      quantizeTexcoord: settings.quantizeTexcoord,
    }),
    settings.meshopt ? meshopt({ encoder: await getMeshoptEncoder(), level: settings.meshoptLevel }) : noop(),
    textureCompress({
      encoder: await getKtx2Encoder(),
      mode: settings.ktx2Mode,
      quality: settings.ktx2Quality,
    }),
  );

  return await io.writeBinary(doc);
}
```

### 3.5 Packaging

The processed glTF is written as a single `.glb` file. The `AssetRecord` is written as a `.json` sidecar with the same basename. The hash is computed on the `.glb` bytes only (not the sidecar — the sidecar references the hash).

```
/assets/
  /blob/
    /ab/
      /cd/
        abcd1234...ef.glb        # the actual asset bytes
        abcd1234...ef.json       # the AssetRecord
  /index/
    assets.json                  # hash → AssetRecord (full table)
    bundles.json                 # region → [hashes]
```

The two-level sharded directory (`/ab/cd/...`) avoids putting 100k files in one directory (filesystem perf).

### 3.6 Registry (build artifact)

`assets.json` is the master index: every shipped asset's `AssetRecord`. It is generated at build time and shipped as a static file. At runtime, the engine loads `assets.json` once; all subsequent lookups are in-memory.

### 3.7 Streaming (runtime)

```typescript
interface AssetStream {
  request(hash: string, opts?: LoadOptions): Promise<RuntimeHandle>;
  prefetch(hashes: string[]): void;
  evict(hash: string): void;
  onEviction(handler: (hash: string) => void): void;
}

interface LoadOptions {
  variant?: string;              // 'mobile', 'desktop', 'cinematic'
  priority?: 'high' | 'normal' | 'low';
  deadline?: number;             // ms; if not loaded by then, use placeholder
  placeholder?: string;          // hash of a placeholder asset
}
```

The stream:
1. Checks the in-memory cache (loaded assets). Hit → return handle.
2. Checks the OPFS cache (`<hash>.glb` on disk). Hit → decode, upload, return.
3. Fetches from the bundle URL (CDN or local server). Downloads the bundle containing the hash. Extracts the blob. Writes to OPFS cache. Decodes. Uploads. Returns handle.

### 3.8 Runtime handles

A `RuntimeHandle` is a stable integer the simulation holds. The asset system manages the underlying GPU resource; the simulation does not know or care whether it's loaded yet. If the simulation uses a handle before the asset is loaded, the placeholder is rendered.

---

## 4. Content-addressed storage

Every asset is referenced by its SHA-256 hash. The hash is computed on the *packaged* `.glb` bytes — the post-processing output, not the source. This means:

- Two builds that process the same source with the same `ImportSettings` produce the same hash (deterministic glTF-Transform output, verified in CI).
- An asset's identity is its bytes, not its name. Renaming `wang.blend` to `old_man_wang.blend` does not change the hash.
- Two games using the same asset (e.g. an ambientCG texture) reference the same hash; the OPFS cache is shared if both are on the same origin (it isn't, by browser design, but the principle holds).
- Save files reference assets by hash. A save loaded against a different build with the same hash loads the same asset. A save loaded against a build where the asset has a different hash (the asset was re-imported with different settings) requires migration (document 17 §3.3).

The hash is the contract. The filename is convenience for the artist.

---

## 5. Hot reload

In dev mode, the engine watches the source `/art/` directory. When a source file changes:

1. The watcher triggers a re-import of that source (Blender headless, ~2–5 s).
2. The re-import runs validation → processing → packaging.
3. The new `.glb` is hashed.
4. If the hash is unchanged (the source change produced byte-identical output), nothing happens. The engine keeps the loaded asset.
5. If the hash is new, the `AssetRecord` is updated. The asset system broadcasts a `asset-replaced` event with `{ oldHash, newHash }`.
6. Every system holding the old `RuntimeHandle` is offered a swap: the renderer replaces the GPU resource, the animation system rebinds clips, the scene graph updates entity references. The swap happens at the next frame boundary.

Hot reload is dev-mode only. In production, the asset set is frozen at build time.

---

## 6. Memory-pressure eviction

The engine has a memory budget for assets (default: 1 GB GPU, 512 MB CPU). When the budget is exceeded:

1. The asset system computes a candidate-eviction list: assets with no current referencers, sorted by last-use time (LRU).
2. It evicts the oldest unreferenced assets until memory is under 80% of budget.
3. Evicted assets' GPU resources are freed. The `RuntimeHandle` remains valid (the simulation does not see the eviction); the next access re-streams.
4. The `onEviction` handler notifies systems that want to know (e.g. the VFX system cancels particles that depended on an evicted texture).

Eviction is transparent to the simulation. The simulation never explicitly frees an asset; it releases its reference (decrementing the refcount) and the asset system evicts when needed.

---

## 7. Placeholder system

When an asset is requested but not yet loaded (slow network, cold cache), the engine renders a placeholder. Placeholders are:

- **Meshes**: a 1m gray cube or a low-poly capsule (for characters).
- **Textures**: a 4×4 gray checker.
- **Skeletons**: the standard humanoid skeleton (so animation can still run).
- **Materials**: `ga:pbr` with default uniforms.
- **Audio**: silence.

The placeholder is replaced the moment the real asset is ready. The placeholder swap is a single frame; the simulation never sees it.

Placeholders are also used for failed loads (HTTP 404, decode error). The simulation runs; the asset is grey. The error is logged; the tweak panel shows the missing hashes.

---

## 8. Asset bundles by region

Assets are grouped into **bundles** — sets of hashes packaged together for download. A bundle is the unit of network fetch. Bundles are organized by region (Cangli Riverlands, Li Family Creek, Wang Family Bend, etc.) and by content type (characters, vegetation, architecture, audio).

```typescript
interface AssetBundle {
  id: string;                    // 'cangli-riverlands-v1'
  region: string;
  version: string;
  hashes: string[];              // all assets in this bundle
  totalBytes: number;
  downloadUrl: string;           // CDN URL
  checksum: string;              // SHA-256 of the bundle file
  dependencies: string[];        // other bundles this one needs
}
```

When the player enters a region, the engine requests that region's bundle. The bundle downloads as a single file; the asset system extracts each asset's blob by hash. The player sees a loading screen (or, if the bundle is prefetched before entry, no loading screen at all).

Bundles are versioned. When a bundle is updated (new assets added), the version bumps and the CDN serves the new bundle. The engine re-fetches the manifest; existing assets remain in OPFS cache (their hashes are unchanged); new assets stream in.

---

## 9. The 16 questions

**Q1. What problem does this system solve?**
Loading 3D assets deterministically, with byte-stable identity (so saves load across builds), streaming on demand (so the player isn't waiting on a 2 GB download at startup), with graceful degradation (placeholders, eviction) and version control (provenance, license tracking).

**Q2. What is the public interface?**
`AssetRecord` (§2), `AssetStream` (§3.7), `AssetBundle` (§8), `RuntimeHandle` (§3.8).

**Q3. What is the internal architecture?**
Build-time: Blender CLI → glTF-Transform → packaging → registry. Runtime: `AssetStream` (OPFS cache + fetcher + decoder + GPU uploader) + `AssetRegistry` (in-memory hash → AssetRecord) + `BundleManager` (region → bundles).

**Q4. What is the data flow?**
Source file → Blender export → glTF validation → glTF-Transform processing → packaging → SHA-256 hash → registry entry. Runtime: hash lookup → OPFS cache check → bundle fetch → decode → GPU upload → handle returned.

**Q5. What is the lifecycle?**
Build-time: source → processed asset. Runtime: `request(hash)` → loading → ready → referenced → unreferenced → evicted. Hot reload (dev): source change → re-import → hash diff → broadcast swap.

**Q6. What is the failure model?**
- Import failure (Blender crash): pipeline halts; CI fails.
- Validation failure: pipeline halts; asset is not packaged; the asset ID is logged.
- Network failure (fetch 404): placeholder used; retry with exponential backoff; logged.
- Decode failure (corrupt blob): placeholder used; the blob is removed from OPFS; re-fetch attempted once.
- GPU upload failure (out of memory): eviction triggered; retry once; if still failing, placeholder used.

**Q7. What are the invariants?**
- An asset's hash is its identity. Same bytes → same hash. Different bytes → different hash.
- A `RuntimeHandle` is valid for the simulation's lifetime; the underlying resource may come and go (eviction, re-stream) but the handle does not change.
- The `AssetRegistry` is read-only after engine startup (in production). Hot reload updates it in dev only.
- Bundles are content-addressed: a bundle's checksum is the SHA-256 of its file.
- Save files reference assets by hash, never by name or path.

**Q8. What is the performance budget?**
- Asset registry load (assets.json parse): <500 ms for 50k assets.
- Per-asset OPFS read + decode + GPU upload: <50 ms for a typical mesh, <100 ms for a 4K texture.
- Bundle download: ~10 MB/s on 4G, ~50 MB/s on broadband.
- Eviction scan: <5 ms (occurs at frame boundaries when triggered).
- Hot reload (dev): <10 s from source save to in-engine swap.

**Q9. What is the determinism contract?**
- glTF-Transform output is deterministic (CI verifies: same source + same settings → same hash).
- The asset loaded at runtime is the bytes at the hash. Two runs loading the same hash load byte-identical bytes.
- A save references assets by hash. Loading the save against a build that lacks a hash is a hard error (the asset is missing); loading against a build where the asset has a different hash requires migration.

**Q10. What is the threading/concurrency model?**
Build-time: single-threaded (the pipeline runs in CI). Runtime: the asset stream runs on a worker; OPFS reads, fetch, meshopt/KTX2 decode happen there; GPU upload happens on the renderer worker (with the adapter). The main thread sees only `RuntimeHandle` integers.

**Q11. How is it serialized?**
- `AssetRecord` is JSON (sidecar to the .glb).
- `assets.json` is the full registry (JSON).
- `bundles.json` is the bundle index (JSON).
- Save files reference assets by hash (a string field in the CBOR-encoded entity).

**Q12. How is it debugged?**
- The asset browser (bible document 11 §7.3) lists all loaded assets with hash, size, refcount.
- `?assetDebug=1` URL param logs every stream request.
- The tweak panel shows: bundle download progress, OPFS cache size, GPU memory used, eviction count.
- Missing-asset report: in dev, the engine collects all referenced-but-missing hashes and prints them at shutdown.

**Q13. How is it tested?**
- Build-time: every source file in `/art/` must produce a valid asset. CI runs the full pipeline.
- Determinism test: same source → same hash (CI runs the pipeline twice, asserts hash equality).
- Hot reload test: change a source, verify the swap event fires, verify the new hash is loaded.
- Placeholder test: request a non-existent hash, verify the placeholder is returned.
- Eviction test: load 2 GB of assets against a 1 GB budget, verify eviction keeps memory under budget.
- Bundle test: simulate a region transition, verify the bundle fetches and all assets load.

**Q14. What alternatives were rejected?**
- *Filename-based loading.* Rejected: filenames drift, renames break saves, two builds with the same filename may have different bytes. Hash-based is the only deterministic option.
- *Draco over meshopt.* Rejected: Draco's decoder is ~115 KB vs meshopt's ~3 KB, and Draco decode is slower. meshopt is the modern default for new engines (Blender, Unreal, Roblox, Bevy all use it).
- *PNG/JPEG textures.* Rejected: KTX2/Basis is 6–10× smaller and GPU-native. PNG decode is a CPU bottleneck at load.
- *Per-asset network fetch (no bundles).* Rejected: 1000 HTTP requests for a region's assets is slower than 1 bundle fetch. Bundles are the unit of network IO.
- *Embedded textures in glTF.* Rejected: KTX2 textures as separate files dedupe across meshes (the same stone texture used by 50 buildings is one texture, not 50 copies).
- *Asset hashes computed on source bytes.* Rejected: source bytes include Blender metadata, tool version stamps, etc. — not stable. Hash the *packaged output*, which is deterministic.
- *No OPFS cache (always fetch).* Rejected: re-downloading 500 MB on every session is hostile. OPFS cache gives free second loads.

**Q15. What are the known limitations?**
- OPFS storage is capped at ~60% of free disk (browsers evict under pressure). The engine calls `navigator.storage.persist()` on first save to reduce eviction risk.
- `FileSystemSyncAccessHandle` is worker-only; main-thread OPFS is async only.
- glTF-Transform's `simplify` (LOD generation) is not as high-quality as meshoptimizer's `simplify`. The engine uses glTF-Transform for build-time simplification; meshoptimizer for runtime decode.
- KTX2 transcode time (50–200 ms per texture) is non-trivial on first load. Mitigated by OPFS caching of transcoded GPU textures (planned; not in v1).
- Hot reload requires Blender on the dev machine; CI machines don't have it. CI uses pre-exported glTFs.

**Q16. What does this enable next?**
- Document 17 (animation) loads clips by hash; the skeleton the clip targets is referenced by hash in the `AssetRecord.dependencies`.
- Document 18 (VFX) loads VFX meshes, particles, and textures by hash.
- The determinism contract (document 17 §3) relies on asset hash-stability for save parity.
- The bundle system enables region streaming (the player walks from Cangli Riverlands to Li Family Creek; the next region's bundle is prefetched in the background).
- The OPFS cache makes a second session near-instant: assets are already on disk.

---

## 10. Failure cases (catalogue)

| Failure | Detection | Recovery |
|---|---|---|
| Blender export fails | Exit code non-zero | Pipeline halts; CI fails; error logged with Blender's stderr |
| glTF validation fails | gltf-validator returns errors | Asset not packaged; error logged with the validation report |
| glTF-Transform throws | Exception | Pipeline halts; the offending asset is quarantined |
| Hash collision (vanishingly unlikely) | SHA-256 collision detected (two assets, same hash, different bytes) | Hard error; the second asset's source is flagged for review |
| Bundle 404 | HTTP 404 on fetch | Retry once; if still 404, the region's assets use placeholders; UI shows "content unavailable" |
| Corrupt blob (decode fails) | meshopt/KTX2 decoder throws | Delete from OPFS; re-fetch once; if still corrupt, placeholder; log |
| GPU out of memory on upload | Allocation throws | Trigger eviction; retry once; if still failing, placeholder; log |
| OPFS quota exceeded | Write throws | Run eviction on the OPFS cache; retry once; if still failing, fall back to no-OPFS mode (re-fetch every session) |
| Hash referenced in save not in registry | Save loader can't find hash | Hard error in dev; in prod, prompt user: "Save references unknown content; load anyway with placeholders?" |
| Bundle checksum mismatch | SHA-256 of downloaded bundle != bundle.checksum | Delete download; re-fetch once; if still wrong, treat as 404 |

---

## 11. Rejected alternatives (detail)

### 11.1 "Filename-based loading"

The argument: artists and designers think in filenames. Hashes are opaque.

The rejection: filenames drift. `wang.blend` becomes `old_wang.blend` becomes `wang_v2.blend`. A save file that referenced `wang.blend` is broken. A hash-referenced save loads the same bytes regardless of filename. The asset browser (bible document 11 §7.3) shows the filename as metadata alongside the hash — humans see names, the engine sees hashes.

### 11.2 "Embedded textures in glTF"

The argument: one file per asset is simpler.

The rejection: a stone texture used by 50 buildings is duplicated 50 times in 50 .glb files. With KTX2 as separate files, it's one file, referenced by hash. The .glb references the texture by hash; the asset system dedupes.

### 11.3 "Draco compression"

The argument: Draco is widely supported.

The rejection: Draco's decoder is ~115 KB (vs meshopt's ~3 KB). Draco decode is slower. Draco's lossy quantization can drift at high compression. meshopt is the modern default; the engine uses it for all engine-authored assets. Draco is supported for consuming third-party assets that ship with Draco.

---

## 12. What this document enables

1. The asset pipeline is deterministic: same source + same settings → same hash → byte-identical asset across builds. This is what makes save parity possible (document 17 §3).
2. glTF is the canonical format; the engine never has to support proprietary binary formats.
3. KTX2/Basis + meshopt keep the asset payload small enough to stream over consumer broadband.
4. The bundle system enables region streaming: the player walks from region to region; the next region's bundle is prefetched.
5. The OPFS cache makes a second session near-instant.
6. The placeholder system means a missing asset never breaks the simulation; the player sees a grey cube, not a crash.
7. Hot reload (dev mode) means an artist sees their Blender edit in the engine in <10 s.
8. Animation (document 17) and VFX (document 18) load their assets through this same pipeline. There is no separate "animation asset system" or "VFX asset system."

The asset system is the substrate every visual system stands on. Done right, the rest of the engine trusts that assets load, dedupe, cache, and stream — and never thinks about it again.
