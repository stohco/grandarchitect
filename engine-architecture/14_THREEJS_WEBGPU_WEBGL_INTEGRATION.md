# 14 — Three.js WebGPU / WebGL2 Integration

**Status:** First-renderer-backend implementation. Three.js r185 is the adapter behind the `RenderBackend` interface (document 13). TSL node materials only. No raw ShaderMaterial.
**Date:** 2026-08-03
**Engine:** Grand Architect (browser-native plugin host, deterministic contract)
**Depends on:** `13_RENDERER_ABSTRACTION` (the `RenderBackend` interface this implements), `ga:determinism` (canonical presentation inputs only — the GPU is not canonical), `08_THREEJS_REPOSITORY_RESEARCH §1,§6` (Three.js r185, TSL, Gap 4 BatchedMesh/UBO scaling, Gap 5 iOS Safari black screens)
**Read with:** `15_MATERIALS_LIGHTING_POSTPROCESSING §4` (global fog chunk patching implemented here), `17_ENGINE_ARCHITECTURE §5` (pluggable render passes), `11_ENGINE_DESIGN §1.1,§2.1` (engine wraps Three.js; global fog from the bible)

---

## 0. What this document is

This document specifies how Three.js r185 is wired into the engine as the first concrete backend. It covers: the adapter layer between engine-owned `ResourceDescriptor`s and Three.js objects; the TSL-only material policy; the WebGPU-to-WebGL2 fallback flow; global shader-chunk patching (the bible's fog/water system); known Three.js limitations and how the engine routes around them; the version-upgrade discipline; and the no-WebGPU recovery path.

This document is implementation detail for the `renderer/backends/three/` directory. The engine's public surface (document 13) does not change based on anything written here.

### Why Three.js r185

Three.js r185 (June 2026) is the first release where `three/webgpu` is production-ready with auto-fallback, where `Renderer` is the unified multi-backend entry point, where WebXR + WebGPU landed together, and where TSL (Three Shader Language) node materials are the recommended authoring path for any shader that needs to run on both WebGPU and WebGL2. r185 is the floor; the engine pins to a single minor at a time (see §7).

---

## 1. The adapter layer

The adapter lives in `renderer/backends/three/`. It implements `RenderBackend` from document 13 by translating engine-owned descriptors into Three.js objects.

```
   engine types (doc 13)             adapter (this doc)               three r185
   ─────────────────────             ─────────────────                ──────────
   MeshResourceDescriptor    ──►     ThreeMeshBuilder         ──►     THREE.BufferGeometry
   TextureResourceDescriptor ──►     ThreeTextureBuilder      ──►     THREE.Texture
   MaterialResourceDescriptor──►     ThreeMaterialBuilder     ──►     THREE.NodeMaterial (TSL)
   RenderPassNode            ──►     ThreePassAdapter         ──►     THREE.PostNode / PassNode
   ResourceHandle            ──►     HandleTable<THREE.Object> ──►    (no public type)
```

The adapter is the only directory in the engine that imports `three`. An ESLint boundary rule (`no-restricted-imports` scoped by path) enforces this. The simulation, scene, materials, lighting, VFX, and post-processing code all import from the engine's renderer-abstraction types, never from `three`.

```typescript
// renderer/backends/three/ThreeWebGPUBackend.ts
import * as THREE from 'three/webgpu';
import { RenderBackend, ResourceHandle, ResourceDescriptor } from '../../api';

export class ThreeWebGPUBackend implements RenderBackend {
  readonly id = 'three-webgpu' as const;
  readonly api = 'webgpu' as const;
  private renderer!: THREE.WebGPURenderer; // r185 unifies under Renderer; cast by api
  private handles = new HandleTable<THREE.Object3D | THREE.Material | THREE.Texture>();
  // ...
}
```

### The HandleTable

A trivial bidirectional map. Engine handles are integers; the table holds the Three.js object. Dispose removes from the table and queues `object.dispose()` for the end of the frame.

```typescript
class HandleTable<T> {
  private byHandle = new Map<number, T>();
  private byObject = new Map<T, number>();
  private next = 1;
  private pendingDispose: T[] = [];

  insert(obj: T): number {
    const h = this.next++;
    this.byHandle.set(h, obj);
    this.byObject.set(obj, h);
    return h as ResourceHandle;
  }
  get(h: number): T | undefined { return this.byHandle.get(h); }
  dispose(h: number, disposer: (t: T) => void) {
    const obj = this.byHandle.get(h);
    if (!obj) return;
    this.byHandle.delete(h);
    this.byObject.delete(obj);
    this.pendingDispose.push(obj);
  }
  flushPendingDispose(disposer: (t: T) => void) {
    for (const obj of this.pendingDispose) disposer(obj);
    this.pendingDispose.length = 0;
  }
}
```

---

## 2. TSL node materials — the only material path

The engine uses Three.js TSL (Three Shader Language) node materials exclusively. The ban on raw `THREE.ShaderMaterial` and `THREE.RawShaderMaterial` is enforced by ESLint in `renderer/backends/three/`.

### Why TSL only

A raw `ShaderMaterial` is GLSL (or WGSL) source string. It runs on exactly one backend — GLSL for WebGL2, WGSL for WebGPU. Authoring both is double the work; maintaining both is double the bug surface. TSL compiles to either GLSL or WGSL from one source. One material definition, two backends.

```typescript
// Example: the engine's jade material, authored in TSL.
import { Fn, vec3, vec4, uniform, texture, dot, normalize, mix, pow, positionWorld } from 'three/tsl';
import { NodeMaterial } from 'three/webgpu';

const jadeMaterial = new NodeMaterial();
jadeMaterial.name = 'ga:jade';

const subsurfaceColor = uniform(new THREE.Color(0x88aa99));
const density = uniform(0.6);
const lightPosition = uniform(new THREE.Vector3());

const jadeShading = Fn(([worldPos, normal, albedo]) => {
  const lightDir = normalize(lightPosition.value.sub(worldPos));
  const ndl = dot(normal, lightDir).max(0);
  const sss = pow(ndl.remainder(1.0).add(0.2), 3.0).mul(subsurfaceColor.value);
  return albedo.mul(ndl).add(sss.mul(density.value));
});

jadeMaterial.colorNode = jadeShading(positionWorld, normalLocal, vec3(0.6, 0.8, 0.7));
jadeMaterial.outputNodes = { /* ... */ };
```

The engine material registry (document 15) holds these TSL graphs. The adapter compiles them lazily on first use per backend.

### What the engine never does

- Never imports `THREE.ShaderMaterial` or `THREE.RawShaderMaterial`. ESLint error.
- Never constructs a `THREE.MeshStandardMaterial` directly with shader-string overrides. If a custom effect is needed, it goes through TSL.
- Never patches `material.onBeforeCompile` to inject GLSL strings. This was the standard Three.js pattern pre-TSL; it is brittle (the chunk names change between releases), backend-specific, and unreadable. The engine forbids it.

---

## 3. WebGPU → WebGL2 fallback flow

```
                       ┌───────────────────────┐
                       │ Engine boots           │
                       │ preferredApi = 'webgpu'│
                       └──────────┬────────────┘
                                  ▼
                       ┌───────────────────────┐
                       │ navigator.gpu defined? │
                       └──────────┬────────────┘
                            yes ──┼── no
                                  │
                      no          ▼         yes
              ┌────────────────────────────────────────┐
              │ Try ThreeWebGPUBackend.initialize()    │
              │  - request adapter                     │
              │  - request device                      │
              │  - create context                      │
              └────────────────┬───────────────────────┘
                               │
                  ok=false     │    ok=true
              ┌────────────────┴──────────────────┐
              ▼                                   ▼
   ┌──────────────────────┐            ┌─────────────────────┐
   │ Swap to               │            │ WebGPU backend      │
   │ ThreeWebGL2Backend    │            │ active              │
   │ (re-initialize)       │            └─────────────────────┘
   └──────────┬────────────┘
              │
              ▼
   ┌──────────────────────┐
   │ WebGL2 backend       │
   │ active               │
   └──────────────────────┘
```

The swap is **explicit**, not invisible. Three.js r185's `Renderer` does its own internal fallback; the engine disables that (`forceWebGPU: true` on init, catch the failure) so that:

1. `BackendCapabilities` is recomputed for the actual backend.
2. The presentation model can downgrade (compute particles → CPU vertex buffers; storage buffers → textures).
3. The user is informed (the tweak panel shows the active backend).
4. Telemetry records the fallback reason.

### What happens at runtime if WebGPU is lost mid-session

GPUs reset. Drivers crash. The engine handles `device.lost`:

```typescript
this.renderer.backend.onDeviceLost = async (info) => {
  telemetry.record('webgpu-device-lost', { reason: info.reason });
  // Try to recreate the same backend once.
  const retry = await this.tryReinit('three-webgpu');
  if (!retry.ok) {
    // Fall to WebGL2, reload the current scene.
    await this.swapBackend('three-webgl2');
    await this.reloadCurrentScene();
  }
};
```

A scene reload is mandatory — GPU resources are gone. The simulation continues; the renderer pauses for ~200 ms while the scene rebuilds. The player sees a brief stutter, not a crash.

---

## 4. Shader chunk patching (the global fog/water system)

The bible specifies a global fog and water system where every material inherits the same height-based fog and the same water model — no per-material work. The mechanism is shader-chunk patching.

### Three.js shader chunks

Three.js compiles materials from named chunks (`ShaderChunk.fog_fragment`, `ShaderChunk.lights_physical_pars`, etc.). The engine patches these chunks at module-load time, before any material compiles. Once patched, every material with `fog: true` inherits the engine's height-based fog. Every water material inherits the engine's Beer-Lambert + Gerstner + variance-roughness model.

```typescript
// renderer/backends/three/patches/applyGlobalPatches.ts
import * as THREE from 'three/webgpu';
import { heightFogFragment } from './chunks/heightFogFragment';
import { heightFogPars } from './chunks/heightFogPars';
import { waterSurface } from './chunks/waterSurface';

let applied = false;
export function applyGlobalPatches() {
  if (applied) return;
  applied = true;

  // Patch the WebGL2 path (GLSL chunks).
  THREE.ShaderChunk.fog_pars_fragment = heightFogPars.glsl;
  THREE.ShaderChunk.fog_fragment = heightFogFragment.glsl;

  // Patch the WebGPU path (TSL node override).
  THREE.TSL.fog = heightFogFragment.tsl;

  // Water: register the engine's water model as the default
  // for any material with material.ga_water = true.
  THREE.ShaderChunk.water_pars = waterSurface.glsl;
  THREE.TSL.waterPars = waterSurface.tsl;
}
```

`applyGlobalPatches()` is called once at engine startup, before any material compiles. The patched chunks are stable for the engine's lifetime. Reverting them requires an engine restart.

### Why patch globally, not per-material

1. **Inheritance for free.** Any glTF asset that loads with `fog: true` (the glTF default) gets the engine's height-based fog without the asset knowing about it. Third-party assets work.
2. **One source of truth.** The fog model, density, falloff, and color live in one TSL graph. Tuning them (via the tweak panel, doc 11 §1.2) tunes every material.
3. **Performance.** Three.js caches compiled programs by their shader source hash. Patched chunks hash to the same program across materials — one shader, many draws.
4. **The bible's intent.** Document 11 §2.1 specifies this exact mechanism. The engine implements the spec.

### Failure case: chunk name changes in Three.js upgrades

Three.js occasionally renames chunks between releases. The engine's patch system declares the chunks it depends on by name, and the patch applier asserts each name exists at startup. If a name is missing, the engine refuses to boot with a clear error: `chunk "fog_pars_fragment" not found in three r185 — engine patch out of date`. This is a hard failure, not a silent degradation.

---

## 5. Known Three.js limitations and how the engine routes around them

| Limitation | Source | Engine mitigation |
|---|---|---|
| BatchedMesh on WebGPU slower than WebGL2 for >1024 batches | Three.js issue #29580 | Prefer `InstancedMesh` for crowds/vegetation. Reserve `BatchedMesh` for WebGL2-only deployments. Capability flag `supportsBatchedMesh` reflects this. |
| UBO scaling issues beyond ~20k instances | Three.js issue #30560 | `InstancedMesh` capped at 16k instances per draw. Crowds larger than 16k split into multiple `InstancedMesh` draws. |
| Compute-shader rewrite for BatchedMesh not landed in r185 | Three.js issue #31935 | Track the issue. Expected in r187+. Engine will retest on r187 release. |
| iOS Safari WebGPU black-screen on some devices | Multiple Three.js issues | Device fingerprint detection; force WebGL2 on the affected device list. The list is updated per Three.js release. |
| WebGPU shadow regression vs WebGL r170 | Three.js r182 changelog | Shadow quality diff between backends accepted; the engine uses the same shadow settings, the visual diff is monitored. |
| `MeshStandardMaterial` sheen/clearcoat not in TSL yet | Three.js roadmap | Custom xianxia materials (jade, silk, bronze) implemented as bespoke TSL nodes (document 15), not via sheen/clearcoat. |
| KTX2 transcode time (50–200 ms per texture) | KTX-Software docs | Transcode on worker; cache transcoded GPU texture in OPFS by hash. Second load is free. |
| `OffscreenCanvas` not in Safari < 16.4 | caniuse | Backend falls back to main-thread rendering. Perf degrades; functionality preserved. |

### Per-limitation policy

For each known limitation, the engine:
1. Records it in this table with the source issue.
2. Records the mitigation in code, with a `// LIMITATION:` comment pointing back to this table.
3. Tests the mitigation in CI (e.g. the >1024-batch test runs under both backends; the WebGL2 path is allowed to be faster).
4. Re-evaluates on every Three.js minor release.

---

## 6. The 16 questions

**Q1. What problem does this system solve?**
Providing a concrete `RenderBackend` implementation that runs on real GPUs via Three.js r185, while keeping Three.js entirely inside the adapter directory. The engine gets a production renderer on day one; the simulation never sees a Three.js type.

**Q2. What is the public interface?**
The adapter exposes nothing beyond `RenderBackend` (document 13). Internally, the adapter's public surface is `ThreeWebGPUBackend`, `ThreeWebGL2Backend`, `applyGlobalPatches()`, and the `HandleTable` utility.

**Q3. What is the internal architecture?**
Three classes: `ThreeWebGPUBackend`, `ThreeWebGL2Backend` (sharing ~70% of code via a `ThreeBackendBase` abstract class), and the `ThreeMaterialBuilder` that compiles engine material descriptors into TSL node materials. Plus the patch system in `patches/`.

**Q4. What is the data flow?**
Engine `ResourceDescriptor` → `ThreeMeshBuilder` / `ThreeTextureBuilder` / `ThreeMaterialBuilder` → Three.js `BufferGeometry` / `Texture` / `NodeMaterial` → stored in `HandleTable` → returned as `ResourceHandle`. Per frame: engine `RenderPassGraph` → `ThreePassAdapter` → `renderer.renderAsync()` per pass.

**Q5. What is the lifecycle?**
Engine startup: `applyGlobalPatches()` → `backend.initialize()` → renderer created. Per frame: `beginFrame` (reset stats) → `submitScene` (sync the presentation model into the Three.js scene graph) → `executePassGraph` (issue passes) → `endFrame` (flush pending disposes, return stats). Shutdown: `backend.dispose()` → `renderer.dispose()` → all Three.js objects released.

**Q6. What is the failure model?**
Init failures (no WebGPU, no WebGL2, context creation fail) → backend swap. Shader compile failures → material falls back to a PBR default; the error is logged with the TSL source. Runtime device loss → reinit or backend swap. Resource creation failures → asset system downgrades the resource.

**Q7. What are the invariants?**
- The `three` import appears only in `renderer/backends/three/` (ESLint-enforced).
- `applyGlobalPatches()` runs exactly once, before any material compiles.
- TSL is the only material authoring path; raw `ShaderMaterial` is forbidden.
- A `ResourceHandle` always resolves to the same Three.js object for its lifetime.
- `endFrame` always flushes pending disposes.

**Q8. What is the performance budget?**
The adapter overhead (handle lookup, descriptor translation) is <5% of frame time. The Three.js scene graph sync in `submitScene` is diff-based (not rebuild) — <1 ms for 10k entities. Material compilation is amortized: compiled once per (material, backend) pair, cached by TSL source hash.

**Q9. What is the determinism contract?**
The adapter is not deterministic — the GPU is not canonical. The *inputs* to the adapter (the presentation model, the resource descriptors) are deterministic. Two runs with the same seed produce the same descriptors; the rendered pixels may differ by GPU.

**Q10. What is the threading/concurrency model?**
The adapter runs on the renderer worker (OffscreenCanvas). It receives `ResourceDescriptor`s and `RenderPassGraph`s via `postMessage` (with `Transferable` ArrayBuffers). It owns the Three.js renderer and scene graph. The main thread never touches Three.js.

**Q11. How is it serialized?**
The adapter is not serialized. Its state is reconstructed from the presentation model on load. Three.js objects are not serializable across workers — that's why the engine uses plain-data `ResourceDescriptor`s.

**Q12. How is it debugged?**
- Spector.js (WebGL2) and WebGPU Inspector capture frames.
- `renderer.debug.checkFramebufferErrors = true` in dev.
- TSL source is dumped to `/debug/shaders/<materialId>.<backend>.wgsl|glsl` when `shaderDebug: true`.
- The frame debugger (F12) shows the pass graph and per-pass GPU time.
- `HandleTable` leaks are caught by a refcount assertion in dev mode.

**Q13. How is it tested?**
- Contract tests (document 13 §4.3) — every backend passes.
- TSL compile tests: every material in the registry compiles under both backends.
- Cross-backend parity: the same scene under WebGPU and WebGL2 produces the same draw call count, pass ordering, and resource count.
- Version-pin tests: the engine boots against the pinned Three.js minor (currently r185); CI fails if a transitive dep bumps Three.js.

**Q14. What alternatives were rejected?**
- *Raw `ShaderMaterial` for custom effects.* Rejected: GLSL-only, breaks the WebGPU path, doubles the maintenance. TSL is the one-source path.
- *`onBeforeCompile` for shader injection.* Rejected: brittle, chunk-name-dependent, unreadable. The engine uses global chunk patching at startup instead.
- *Three.js's internal WebGPU→WebGL2 fallback.* Rejected: it's invisible. The engine needs to recompute capabilities and downgrade the presentation model, so the swap is explicit.
- *Pinning to a Three.js major only (r18x).* Rejected: minors ship breaking changes (r182 shadow regression, r185 `Renderer` rename). The engine pins to a single minor and upgrades deliberately (§7).
- *Forking Three.js.* Rejected: a fork is a maintenance trap. The engine patches via the public chunk API; if a patch becomes impossible, that's the signal to upgrade or swap backends.

**Q15. What are the known limitations?**
See §5. The headline limitations are: BatchedMesh WebGPU perf, UBO scaling at >16k instances, iOS Safari black screens, KTX2 transcode cost, no `OffscreenCanvas` in older Safari. The engine routes around all of them; none block shipping.

**Q16. What does this enable next?**
Document 15 builds the material, lighting, and post systems as TSL node graphs and `ResourceDescriptor`s. Document 18 (VFX) uses TSL compute nodes for GPU particles. With the adapter in place, every other rendering system is authored in engine types and compiled to TSL by the adapter — Three.js is invisible to the rest of the engine.

---

## 7. Three.js version upgrades

The engine pins Three.js to a single minor (`"three": "0.185.0"` in `package.json`, no `^` or `~`). Upgrades are deliberate, scheduled, and tested.

### Upgrade process

1. **Read the changelog.** Every Three.js minor has a `CHANGELOG.md` entry. The upgrade author reads it end-to-end and lists every breaking change.
2. **Read the migration guide.** Three.js publishes migration steps per minor. The author follows each.
3. **Update the patch table.** If a chunk name changed, the engine's patch applier (§4) is updated. The applier's startup assertion catches missing chunks.
4. **Update the limitations table.** If a known limitation was fixed (e.g. BatchedMesh compute rewrite lands in r187), the engine removes the mitigation and retests.
5. **Run the contract tests.** The `RenderBackend` contract suite (document 13 §4.3) runs against the new version. Any failure blocks the upgrade.
6. **Run the screenshot-diff suite.** A fixed set of scenes is rendered under the old and new versions. Pixel diff > 1% blocks the upgrade (visual regression).
7. **Update the pin.** `package.json` moves to the new minor. The determinism fingerprint (document 17 §3.3) changes; old saves are flagged for migration.
8. **Record the upgrade in `docs/threejs-upgrades.md`.** Date, version, breaking changes, mitigations, fingerprint delta.

### Upgrade cadence

The engine tracks Three.js releases. Three.js ships monthly. The engine upgrades **quarterly**, skipping minors in between. This balances currency (the WebGPU story is still maturing in 2026) against stability (every upgrade is a fingerprint change).

### What blocks an upgrade

- A chunk name the engine depends on was removed without replacement.
- A material compile time regressed >20%.
- A screenshot-diff scene changed >1% pixel-wise with no engine change.
- The contract tests fail.

A blocked upgrade is investigated, not deferred indefinitely. If the block cannot be resolved within one Three.js minor cycle, the engine stays on the pinned minor and the limitation is recorded in §5.

---

## 8. What happens when WebGPU is unavailable

The flow, end to end:

1. Engine boots. `preferredApi = 'webgpu'` (default).
2. `ThreeWebGPUBackend.initialize()` probes `navigator.gpu`.
3. If `navigator.gpu` is `undefined`: backend returns `{ ok: false, failureReason: 'no-webgpu', fallbackRecommended: 'three-webgl2' }`.
4. Engine calls `swapBackend('three-webgl2')`. The `ThreeWebGL2Backend` initializes.
5. `BackendCapabilities` reflects WebGL2: `supportsComputeParticles = false`, `supportsStorageBuffersInFragment = false`, `maxUniformBufferBindingSize = 16384` (iOS).
6. The presentation model downgrades:
   - GPU compute particles → CPU-driven vertex buffer particles (capped at 10k).
   - Storage-buffer-based foliage → texture-based foliage (capped at 8k instances per draw).
   - 16k instance `InstancedMesh` → 4k instance `InstancedMesh` (4 draws instead of 1).
7. The tweak panel shows: `Renderer: WebGL2 (fallback)`. The user is informed.
8. Telemetry records: `{ webgpu_available: false, webgl2_active: true, device: navigator.userAgent }`.
9. The game runs. Visual fidelity is lower (no compute particles, smaller crowds) but the simulation is identical.

The player does not see an error. They see the game. The fidelity gap is the cost of the 15% of devices that lack WebGPU; the bible (document 08 §1) mandates browser-native reach, and that means the fallback path must work.

---

## 9. Rejected alternatives (detail)

### 9.1 "Use Three.js's internal auto-fallback"

Three.js r185's `Renderer` auto-falls to WebGL2 if WebGPU is unavailable. The engine disables this.

The rejection: the engine needs to (a) recompute capabilities for the actual backend, (b) downgrade the presentation model (compute particles → CPU, storage buffers → textures), (c) inform the user, (d) record telemetry. Three.js's invisible fallback does none of these. The engine's explicit swap does all of them.

### 9.2 "Ship WebGL2 only, skip WebGPU"

The rejection: WebGPU gives 2–4× draw call throughput, compute particles for qi effects (document 18), and storage buffers for foliage crowds. The bible's vision (10k-disciple sects, qi-perception overlays, weather) is not achievable on WebGL2 at 60 Hz on midrange hardware. WebGPU is the floor for the vision; WebGL2 is the floor for reach. Both are required.

### 9.3 "Ship WebGPU only, drop WebGL2"

The rejection: 15% of users (older iOS, fragmented Android) lack WebGPU as of Aug 2026 (document 08 §1). The bible mandates browser-native reach. Dropping 15% of potential players is not the decision.

### 9.4 "Author materials in GLSL and WGSL by hand"

The rejection: doubles the maintenance, guarantees drift between backends, blocks the bible's "one material, both backends" intent. TSL is the one-source path; the engine commits to it.

---

## 10. What this document enables

With the Three.js adapter specified:

1. The engine has a working renderer on day one. WebGPU on capable hardware, WebGL2 elsewhere, headless in tests.
2. Document 15's materials, lighting, and post-processing are authored as TSL node graphs and `ResourceDescriptor`s — no Three.js types leak.
3. The fog/water global patch system (bible document 11 §2.1–2.2) has a concrete implementation path.
4. The upgrade discipline (§7) means Three.js breaking changes do not cascade into engine rewrites.
5. The fallback flow (§8) means the game runs on every browser the bible targets.

Three.js is the first adapter. The architecture (document 13) lets the engine replace it later — with a wgpu-native WASM backend, a software rasterizer for cloud streaming, or a future renderer that does not exist yet — without touching the simulation. That option is the value of the abstraction.
