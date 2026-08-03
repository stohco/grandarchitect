# 3D Game Asset Pipeline — Open-Source Research

**Project context:** Browser-based Xianxia RPG on **Three.js + WebGPU**. Goal: CREATE → PROCESS → SERVE 3D assets at production quality.

**Method:** Every repo below was verified live via `z-ai web_search` + `z-ai page_reader` (GitHub pages parsed for stars / forks / license / last-commit datetime). All repos confirmed to exist and load (HTTP 200). Star counts and last-activity dates are snapshot values from the live GitHub pages at research time.

> Note: GitHub's public REST API was IP-rate-limited during this session, so stars/forks/license were parsed from the rendered GitHub HTML instead (`repo-stars-counter-star`, license `<a>` link, first `relative-time datetime=`). Where a field could not be auto-detected it is marked `~`.

---

## 1. Asset Creation

| Repo | URL | ★ Stars | License | Last activity | What it does |
|---|---|---|---|---|---|
| **Blender** | https://github.com/blender/blender | ~19.5k | GPL-3.0 | 2026-08-02 (daily) | The complete open-source 3D suite — modeling, sculpting, rigging, animation, simulation, rendering. Ships a full **Python API (`bpy`)** for headless/CI asset generation, glTF export, batch processing. This is the backbone of any open-source creation step. |
| **Material Maker** | https://github.com/RodZill4/material-maker | ~5.8k | MIT | 2026-07-14 | Procedural **PBR material authoring + 3D model painting**, built on the Godot engine. Node graph workflow reminiscent of Substance Designer. Exports PBR texture sets plus presets for Godot/Unity/Unreal. v1.7 released 2026-07. **Highly relevant** for Xianxia surfaces (jade, silk, bronze, stone). |
| **EZ-Tree** | https://github.com/dgreenheck/ez-tree | ~1.5k | MIT | 2026-07-16 | **Procedural tree generator** written in JS/Three.js, 30+ tunable parameters, runs in-browser and **exports `.glb`**. Ideal for forests/scenery in a wuxia world. Actively maintained. |
| **GameRig** | https://github.com/Arminando/GameRig | ~0.33k | GPL-2.0 | 2026-02-26 | **Auto-rigging for games** as a Blender addon, built on top of Rigify. Adds game-engine-ready rigs/metarigs. Relevant for character creation in Blender → export to glTF. |
| *Honorable mentions* | photonlines/Procedural-City-Generator · Aljullu/threejs-procedural-building-generator · jeromeetienne/threex.proceduralcity | — | — | older | Building/city generators. Smaller and less maintained; usable as reference for instanced architecture but EZ-Tree's quality bar is the one to match. |

**Top 3 for the pipeline:** Blender (creation core) → Material Maker (PBR textures) → EZ-Tree (vegetation).

---

## 2. Asset Processing

| Repo | URL | ★ Stars | License | Last activity | What it does |
|---|---|---|---|---|---|
| **glTF-Transform** | https://github.com/donmccurdy/glTF-Transform | ~1.9k | MIT | 2026-08-01 | **glTF 2.0 SDK for JS/TS** (Web + Node). Read → edit → write glTF/GLB. Functions for **meshopt compression, Draco, KTX2/Basis, dedup, pruning, weld, tangents, texture resize, LOD/simplify**. The central processing brain of a modern web pipeline. CLI + programmatic API. |
| **meshoptimizer** | https://github.com/zeux/meshoptimizer | ~8.2k | MIT | 2026-07-30 | C/C++ mesh optimization: vertex cache, overdraw, fetch optimization, **simplification (LOD)**, **meshlets**, ray tracing. Ships **`gltfpack`** CLI (full-scene glTF optimization + meshopt/Draco) and `clusterlod.h` for continuous LOD. Reached v1.0. Industry-standard. |
| **Draco** | https://github.com/google/draco | ~7.4k | Apache-2.0 | 2026-07-01 | Google's library for **compressing/decompressing 3D geometric meshes & point clouds**. Compresses positions, connectivity, UVs, normals, attributes. Native decoder ships in three.js (`DRACOLoader`). |
| **KTX-Software** | https://github.com/KhronosGroup/KTX-Software | ~1.3k | Apache-2.0 (+BSD parts, transitioning) | 2026-07-30 | Khronos **KTX2 GPU texture container** + tools (`toktx`). Basis Universal supercompression → transcodes to runtime GPU format (ETC/ASTC/BC). Pairs with glTF `KHR_texture_basisu`. Decoded in-browser by three.js `KTX2Loader`. |
| **gltf-pipeline** | https://github.com/CesiumGS/gltf-pipeline | ~2.1k | Apache-2.0 | 2026-06-23 | Older Cesium glTF optimization CLI (Draco, etc.). **Mostly superseded by glTF-Transform** for greenfield projects; kept here for compatibility with Cesium-based tooling. |

**Top 3 for the pipeline:** glTF-Transform (orchestrator) → meshoptimizer / gltfpack (geometry + LOD) → KTX-Software (textures), with Draco available as an alternate/combined geometry codec.

---

## 3. Three.js Tooling (runtime + authoring)

| Repo | URL | ★ Stars | License | Last activity | What it does |
|---|---|---|---|---|---|
| **three.js** (core) | https://github.com/mrdoob/three.js | ~114k | MIT | 2026-08-02 (daily) | The runtime itself. Bundles the loaders you SERVE with: `GLTFLoader`, `DRACOLoader`, `KTX2Loader`, `MeshoptDecoder`, `BasisTextureLoader`, `WebGPURenderer` + TSL. WebGPU support is in-tree. |
| **three-mesh-bvh** | https://github.com/gkjohnson/three-mesh-bvh | ~3.4k | MIT | 2026-08-01 | **Bounding Volume Hierarchy** for three.js meshes — 10–100× faster raycasting, spatial queries, shapecasts, intersection. Essential for interaction, projectile collision, selection, foliage culling. |
| **Troika** (troika-three-text) | https://github.com/protectwise/troika | ~2k | MIT | 2026-07-24 | High-quality **SDF text rendering** in Three.js (CJK-capable). Use `troika-three-text` sub-package for in-world UI, floating Chinese names, inscriptions, talismans. |
| **pmndrs/postprocessing** | https://github.com/pmndrs/postprocessing | ~2.8k | MIT | 2026-07-27 | Effect-pass post-processing for three.js (bloom, DOF, SSAO, tone-mapping, vignette…). Auto-merges passes to minimize render ops. Pairs with WebGPU/TSL. Critical for the painterly Xianxia look. |

**Top 4 for the pipeline:** three.js core (loaders + WebGPU) → three-mesh-bvh (spatial) → pmndrs/postprocessing (look) → Troika (text).

---

## 4. Texture Libraries (CC0 PBR)

These are **websites/distributions** (not code repos) — both verified live and confirmed CC0.

| Source | URL | License | Stars/Size | What it provides |
|---|---|---|---|---|
| **ambientCG** | https://ambientcg.com | **CC0** (public domain) | 2,000+ PBR materials, HDRIs, models | One of the largest free PBR libraries — albedo/normal/roughness/metallic/AO sets up to 8K, plus HDRIs. Formerly "CC0 Textures". Direct downloadable, no attribution ever required. |
| **Poly Haven** | https://polyhaven.com | **CC0** | Textures + HDRIs + models | Hyperreal CC0 assets, "no paywalls or signup." Free, commercially usable without restrictions. The **Poly-Haven/polyhavenassets** repo (https://github.com/Poly-Haven/polyhavenassets, ~0.5k★, GPL-3.0) is a Blender addon that pulls all assets into the Blender Asset Browser. |
| *shareTextures* | https://www.sharetextures.com | CC0 | Textures + models | Useful supplementary CC0 archive (wood/stone/metal up to 4K). |

**Top 2:** ambientCG + Poly Haven together cover essentially every surface an Xianxia RPG needs, all CC0 — safe to ship commercially with zero attribution.

---

## 5. Character / Animation (rigging, skinned mesh, retargeting)

| Repo | URL | ★ Stars | License | Last activity | What it does |
|---|---|---|---|---|---|
| **Blender + Rigify/GameRig** | https://github.com/Arminando/GameRig (see §1) | ~0.33k | GPL-2.0 | 2026-02-26 | Authoring side: Rigify (Blender built-in) + GameRig produce game-ready skeletons/skins in Blender, exported as skinned glTF. |
| **Kalidokit** | https://github.com/yeemachine/kalidokit | ~5.7k | MIT | 2025-08-18 | **Blendshape + kinematics solver** for MediaPipe/TensorFlow.js face/pose/hand tracking. Drives a `THREE.SkinnedMesh` from webcam/mocap in real time. Great for VTuber-style NPCs/companions. |
| **retargeting-threejs** | https://github.com/upf-gti/retargeting-threejs | ~44 | Apache-2.0 | 2026-04-13 | **Animation & pose retargeting solver** for 3D humanoids in Three.js — retargets clips/poses between skeletons sharing a bind pose. Small but purpose-built and recently touched. |
| **ossos** | https://github.com/sketchpunklabs/ossos | ~0.5k | MIT | 2023-03-30 (stale) | Web-based character animation system (the algorithm `retargeting-threejs` derives from). Good reference; not actively maintained — prefer the three.js built-in `SkeletonUtils.retarget()`/`retargetClip()` which is being hardened in core. |
| *three.js SkeletonUtils* | https://github.com/mrdoob/three.js (examples/jsm/utils/SkeletonUtils.js) | (core) | MIT | 2026-08-02 | Built-in `retarget()` / `retargetClip()` / `clone()` for SkinnedMesh. The officially-supported path; actively improved. |

**Top 3:** Blender+GameRig (author) → three.js SkeletonUtils (runtime retarget/clone) → Kalidokit (mocap-driven characters). Add `retargeting-threejs` if you need solver-level retarget beyond core.

---

## 6. Deterministic Procedural (noise / seeded mesh generation)

| Repo | URL | ★ Stars | License | Last activity | What it does |
|---|---|---|---|---|---|
| **FastNoiseLite** | https://github.com/Auburn/FastNoiseLite | ~3.5k | MIT | 2026-06-21 | **Extremely portable noise library** — Perlin, Simplex, Cellular, Value, FBM, ping-pong, DomainWarp. Single-file ports in **C/C++/C#/JS/Rust/Go/HLSL/GLSL/Java**. Seeded & deterministic. The canonical choice for terrain/clouds/marble veins in a Xianxia world. |
| **EZ-Tree** | https://github.com/dgreenheck/ez-tree (see §1) | ~1.5k | MIT | 2026-07-16 | Seeded procedural **mesh** generation (trees → GLB). |
| *three.js + FastNoiseLite* | (composition) | — | MIT | — | Combine FastNoiseLite (deterministic field) with `THREE.BufferGeometry` / `WebGPURenderer` compute for seeded terrain & instanced foliage. No extra repo needed. |

**Top pick:** FastNoiseLite is the single deterministic-procedural primitive to adopt; everything else (terrain, mist, jade veins) is seeded mesh/shader generation layered on top with three.js + EZ-Tree.

---

# Recommended Asset Pipeline Stack

A single, fully open-source chain from authoring to the browser frame. Every link is MIT/Apache/CC0/GPL-compatible with a commercial web game.

```
                         ┌────────────────  CREATE  ────────────────┐
                         │                                              │
   Blender (bpy, headless)   Material Maker (PBR)   EZ-Tree (GLB)   ambientCG / Poly Haven (CC0)
   + Rigify/GameRig (rigs)   (jade/silk/bronze)     (forests)        (base textures/HDRIs)
                         │                                              │
                         └──────────────────┬───────────────────────┘
                                            ▼
                         ┌────────────────  PROCESS  ───────────────┐
                         │                                              │
            glTF-Transform (orchestrator: read/edit/write, dedup, weld,
                            tangents, prune, LOD/simplify, join)
                            │
              ┌─────────────┼───────────────────┐
              ▼             ▼                   ▼
        meshoptimizer   KTX-Software         Draco
        /gltfpack        (toktx → KTX2/      (alt geometry
        (vertex cache,    Basis)              codec)
         meshlets, LOD)
                         │                                              │
                         └──────────────────┬───────────────────────┘
                                            ▼
                         ┌────────────────  SERVE  ────────────────┐
                         │                                              │
   Static CDN / edge (GLB + KTX2 + Draco-meshopt binaries)
   + Range requests + immutable cache headers + Content-Encoding
   + optional glTF-Transform "join" → packed multi-scene GLB
                         │                                              │
                         └──────────────────┬───────────────────────┘
                                            ▼
                         ┌────────────────  RUNTIME  ───────────────┐
                         │                                              │
   three.js WebGPURenderer (TSL)
     ├─ GLTFLoader + DRACOLoader + KTX2Loader + MeshoptDecoder  (decompress)
     ├─ three-mesh-bvh        (raycast / collision / culling)
     ├─ pmndrs/postprocessing (bloom, DOF, SSAO, tone-map — painterly look)
     ├─ Troika troika-three-text (CJK SDF text, floating inscriptions)
     ├─ SkeletonUtils.retarget/retargetClip + Kalidokit (characters/mocap)
     └─ FastNoiseLite (seeded terrain/clouds/jade veins — CPU or TSL compute)
                         │                                              │
                         └──────────────────────────────────────────────┘
```

### Stage-by-stage rationale

**① CREATE** — *Blender* is the headless authoring engine (run `bpy` in CI to export glTF deterministically). *Material Maker* supplies procedural PBR for signature Xianxia surfaces. *EZ-Tree* generates vegetation GLBs in-browser or in CI. *ambientCG* + *Poly Haven* provide CC0 base textures/HDRIs/models — zero legal friction.

**② PROCESS** — *glTF-Transform* is the orchestrator (it can call meshopt, Draco, and KTX2 as functions and runs in Node CI). *meshoptimizer/gltfpack* handles geometry optimization, LOD/simplification, and meshlets. *KTX-Software* converts textures to KTX2/Basis for universal GPU transcoding. *Draco* is an optional alternate/complementary geometry codec. Output: a small set of optimized `.glb` + `.ktx2` artifacts.

**③ SERVE** — Serve the optimized artifacts from a static CDN/edge with immutable cache headers, HTTP range requests, and (optionally) glTF-Transform `join` to pack a whole region into one GLB to cut request count. The compressed blobs are tiny and cache-friendly.

**④ RUNTIME** — *three.js WebGPURenderer + TSL* loads assets via its built-in `GLTFLoader` configured with `DRACOLoader`, `KTX2Loader`, and `MeshoptDecoder`. *three-mesh-bvh* makes interaction/collision/culling fast. *pmndrs/postprocessing* delivers the painterly bloom/DOF/SSAO look. *Troika* renders high-quality CJK text. *SkeletonUtils* + *Kalidokit* drive characters. *FastNoiseLite* supplies the deterministic seeded procedural layer (terrain, mist, material variation) — runnable on CPU or via TSL compute.

### Verification summary
All 15 distinct repos listed above were confirmed to load (HTTP 200) via `z-ai page_reader`, with stars, license, and last-commit activity parsed directly from each GitHub page. ambientCG and Poly Haven were confirmed live as CC0 distributions. No repo in the recommended stack is stale (the oldest "last activity" among recommended primary picks is Kalidokit @ 2025-08; everything else committed in 2026).

### Next actions
1. Spike a CI script: Blender `bpy` → export GLB → `gltf-transform` (meshopt + KTX2) → measure size/draw-call delta on one Xianxia hero asset.
2. Wire `GLTFLoader` + `DRACOLoader` + `KTX2Loader` + `MeshoptDecoder` against `WebGPURenderer` and confirm decode paths on target browsers.
3. Prototype the painterly look with `pmndrs/postprocessing` + a Material Maker jade/silk set, and CJK UI text with Troika.
4. Validate retargeting on one Mixamo→custom-rig character using `SkeletonUtils.retargetClip()`; fall back to `retargeting-threejs` if core gaps appear.
5. Benchmark `three-mesh-bvh` raycasts against instanced foliage (EZ-Tree output) for the target scene density.
