# 13 — Renderer Abstraction

**Status:** Foundation architecture. The renderer is a backend behind an engine-owned interface. The simulation never imports Three.js.
**Date:** 2026-08-03
**Engine:** Grand Architect (browser-native plugin host, deterministic contract)
**Depends on:** `ga:core`, `ga:determinism` (canonical presentation model — CBOR-serializable, hash-stable), `08_JOBS_WORKERS_CONCURRENCY` (renderer worker, OffscreenCanvas, SharedArrayBuffer), `09_ENTITY_RUNTIME_STATE_ARCHITECTURE` (entity `presentationNode` field)
**Read with:** `08_THREEJS_REPOSITORY_RESEARCH §1,§6` (Three.js r185, WebGPU adoption, Gap 4 BatchedMesh/UBO scaling), `17_ENGINE_ARCHITECTURE §5` (pluggable render passes), `11_ENGINE_DESIGN §1.1` (the engine wraps Three.js; it does not wrap around it)

---

## 0. What this document is

This document specifies the engine's renderer abstraction. The engine's simulation, scene graph, materials, lighting, and post-processing all speak engine-owned types. Three.js (and the underlying WebGPU / WebGL2 backend) is a swappable adapter behind the `RenderBackend` interface. Three backends are shipped: `ThreeWebGPUBackend`, `ThreeWebGL2Backend`, and `HeadlessTestBackend`. The simulation never imports `three` and never names a Three.js class.

This is the layer that makes the rest of the engine renderer-agnostic. Every other rendering document (14, 15, 18) builds on top of the types declared here.

### Why an abstraction at all

Three.js is excellent and is the first backend (see document 14). But Three.js ships monthly, breaks APIs across releases, and ties the engine to one library's notion of materials, lights, and passes. Wrapping it behind engine types lets the engine survive Three.js upgrades, swap WebGPU out for WebGL2 at runtime, and run headless in tests without a GPU. The cost of the abstraction is paid for by the cost of the alternatives — a tight coupling that forces every system rewrite on every Three.js breaking change.

---

## 1. The separation

```
   ┌─────────────────────────────────────────────────────────────┐
   │                    SIMULATION WORLD                          │
   │  (deterministic, fixed-point, no Three.js imports)           │
   │  Entities · transforms · combat state · qi state · schedules │
   └──────────────────────────┬──────────────────────────────────┘
                              │ host.extractPresentation()
                              ▼
   ┌─────────────────────────────────────────────────────────────┐
   │                  PRESENTATION MODEL                          │
   │  (engine-owned types, plain data, GC-friendly)               │
   │  PresentationEntity · MeshRef · MaterialRef · LightRef       │
   │  CameraRig · SkyModel · FogState · PostStack                 │
   └──────────────────────────┬──────────────────────────────────┘
                              │ RenderExtractor.run()
                              ▼
   ┌─────────────────────────────────────────────────────────────┐
   │              RENDER EXTRACTION (per-frame)                   │
   │  Diff presentation model against last frame                 │
   │  Produce RenderCommandList + RenderPassGraph                 │
   │  (renderer-independent — no Three.js types here either)      │
   └──────────────────────────┬──────────────────────────────────┘
                              │ backend.submitScene(graph)
                              ▼
   ┌─────────────────────────────────────────────────────────────┐
   │                  RENDERBACKEND (interface)                   │
   │  initialize · beginFrame · submitScene · executePassGraph    │
   │  endFrame · capabilities · createResource · disposeResource  │
   └──────────────────────────┬──────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        ▼                     ▼                     ▼
  ┌──────────┐         ┌──────────┐         ┌──────────────┐
  │ ThreeWeb │         │ ThreeWeb │         │ HeadlessTest │
  │ GPU      │         │ GL2      │         │ Backend      │
  │ Backend  │         │ Backend  │         │              │
  └────┬─────┘         └────┬─────┘         └──────────────┘
       │                    │
       ▼                    ▼
  ┌──────────┐         ┌──────────┐
  │ WebGPU   │         │ WebGL2   │
  │ (native) │         │ (native) │
  └──────────┘         └──────────┘
```

Five hard rules enforce the separation:

1. **Simulation code never imports `three`.** Enforced by an ESLint rule (`no-restricted-imports`) on the `sim/` directory. The build fails on violation.
2. **Presentation model types are plain data.** No methods, no class hierarchy, no Three.js objects. They are structs that survive CBOR serialization.
3. **Render commands are renderer-independent.** A `DrawMeshCommand` references a `MeshHandle` and `MaterialHandle`, both opaque integers. The backend resolves them.
4. **The backend is the only code that touches `three`.** It lives in `renderer/backends/`. It is the adapter. It is replaceable.
5. **Capabilities are queried, not assumed.** Code that needs WebGPU asks `backend.capabilities()`; code that needs a feature tests `backend.capabilities().supportsComputeParticles`.

---

## 2. The RenderBackend interface

```typescript
/**
 * The renderer backend. Implemented by ThreeWebGPUBackend,
 * ThreeWebGL2Backend, and HeadlessTestBackend. This is the only
 * interface the engine's rendering code depends on.
 */
interface RenderBackend {
  /** Static identity, queried before initialize(). */
  readonly id: 'three-webgpu' | 'three-webgl2' | 'headless-test';
  readonly api: 'webgpu' | 'webgl2' | 'none';

  /** One-time setup. Returns false if the backend cannot run on this device. */
  initialize(config: RenderBackendConfig): Promise<BackendInitResult>;

  /** Query hardware caps. Stable for the lifetime of the backend. */
  capabilities(): BackendCapabilities;

  /** Frame lifecycle. Called in this order, every frame. */
  beginFrame(frame: FrameDescriptor): void;
  submitScene(scene: SubmittedScene): void;
  executePassGraph(graph: RenderPassGraph): void;
  endFrame(): FrameStats;

  /** Resource lifecycle. Handles are engine-owned integers. */
  createResource(desc: ResourceDescriptor): ResourceHandle;
  disposeResource(handle: ResourceHandle): void;

  /** Readback, for screenshots, picking, and debug. Async. */
  readPixels(rect: PixelRect): Promise<Uint8Array>;
  readDepth(rect: PixelRect): Promise<Float32Array>;

  /** Resize, context loss, shutdown. */
  resize(width: number, height: number, dpr: number): void;
  onContextLost(handler: () => void): void;
  dispose(): void;
}

interface RenderBackendConfig {
  canvas: HTMLCanvasElement | OffscreenCanvas | null; // null = headless
  powerPreference: 'high-performance' | 'low-power';
  antialias: boolean;
  preserveDrawingBuffer: boolean; // true for screenshots in tests
  forcedApi?: 'webgpu' | 'webgl2' | 'none'; // for tests
  maxTextureSize?: number;
  shaderDebug: boolean; // emits TSL source for inspection
}

interface BackendInitResult {
  ok: boolean;
  api: 'webgpu' | 'webgl2' | 'none';
  failureReason?: 'no-webgpu' | 'no-webgl2' | 'context-creation-failed' | 'shader-compile-failed' | 'insufficient-features';
  fallbackRecommended?: 'three-webgl2' | 'headless-test';
  actualRenderer?: string; // e.g. "WebKit WebGPU"
}

interface BackendCapabilities {
  api: 'webgpu' | 'webgl2' | 'none';
  maxTextureSize: number;
  maxUniformBufferBindingSize: number; // critical: 16384 on iOS, 65536 on desktop
  maxStorageBufferBindingSize: number;
  maxComputeWorkgroupsPerDimension: number;
  supportsComputeParticles: boolean;
  supportsStorageBuffersInFragment: boolean;
  supportsBptcTextures: boolean;
  supportsAstcTextures: boolean;
  supportsInstancedMesh: boolean;
  supportsBatchedMesh: boolean;
  supportsShadowCascades: boolean;
  maxSamplesPerPixel: number; // MSAA cap
  timestampQuery: boolean; // GPU timer queries
}
```

### Resource handles

Resources (meshes, textures, materials, framebuffers, samplers) are created by the backend and referenced by integer handles. The engine never holds Three.js `BufferGeometry` or `Material` objects directly.

```typescript
type ResourceHandle = number & { readonly __brand: 'ResourceHandle' };

type ResourceDescriptor =
  | MeshResourceDescriptor
  | TextureResourceDescriptor
  | MaterialResourceDescriptor
  | SamplerResourceDescriptor
  | FramebufferResourceDescriptor;

interface MeshResourceDescriptor {
  kind: 'mesh';
  vertices: Float32Array;
  indices: Uint32Array;
  attributes: AttributeLayout[];
  morphTargets?: MorphTargetData[];
  skeleton?: SkeletonData;
  lodChain?: LodLevel[];
  bounds: AABB;
}

interface TextureResourceDescriptor {
  kind: 'texture';
  source: Ktx2Blob | ImageBitmap | Uint8Array; // engine never decodes PNG/JPEG itself
  format: 'ktx2' | 'rgba8' | 'r16f' | 'rg16f' | 'rgba16f' | 'depth24';
  srgb: boolean;
  generateMipmaps: boolean;
  wrapS: 'repeat' | 'clamp' | 'mirror';
  wrapT: 'repeat' | 'clamp' | 'mirror';
  filter: 'linear' | 'nearest';
  anisotropy: number;
}

interface MaterialResourceDescriptor {
  kind: 'material';
  materialId: string; // references engine material registry (see doc 15)
  uniforms: Record<string, number | number[] | Float32Array>;
  textures: Record<string, ResourceHandle>;
  defines: Record<string, string | number | boolean>;
  renderQueue: RenderQueue; // opaque, transparent, custom
  doubleSided: boolean;
  depthWrite: boolean;
  depthTest: boolean;
  blendMode?: BlendMode;
}
```

---

## 3. The render pass graph

Every frame, the renderer builds a `RenderPassGraph` — a directed acyclic graph of passes, each with declared inputs (textures, framebuffers) and outputs. The backend executes passes in topological order, inserting barriers automatically. This is the same model as Unreal's RDG, Bevy's render graph, and Three.js's `NodeFrame` — the proven approach.

```typescript
interface RenderPassGraph {
  passes: RenderPassNode[];
  persistentResources: ResourceHandle[]; // not freed between frames
}

interface RenderPassNode {
  id: string; // e.g. "shadow-cascade-0", "opaque-geometry", "water", "post-bloom"
  priority: number;
  inputs: PassInput[];
  outputs: PassOutput[];
  execute: (ctx: PassContext) => void;
  debugColor?: string; // for the frame debugger
}

interface PassInput {
  handle: ResourceHandle;
  access: 'read' | 'read-write';
  stage: 'vertex' | 'fragment' | 'compute';
}

interface PassOutput {
  handle: ResourceHandle;
  access: 'write' | 'read-write';
  clear?: [number, number, number, number];
}

interface PassContext {
  bindMesh(handle: ResourceHandle): void;
  bindMaterial(handle: ResourceHandle): void;
  drawIndexed(indexCount: number, instanceCount: number, firstIndex: number): void;
  setViewport(x: number, y: number, w: number, h: number): void;
  setScissor(x: number, y: number, w: number, h: number): void;
  pushMarker(name: string): void; // GPU debug marker
  popMarker(): void;
}
```

### Default pass graph (per frame)

```
┌─────────────────────────────────────────────────────────────┐
│ 1. shadow-cascade-{0..3}  (depth-only, orthographic splits) │
│ 2. depth-prepass          (early-Z, alpha-tested only)      │
│ 3. opaque-geometry        (PBR + custom materials)          │
│ 4. water                  (custom shader, doc 15)           │
│ 5. transparent-geometry   (back-to-front)                   │
│ 6. qi-perception          (only when active, document 18)   │
│ 7. post-ssao              (depth + normals from pass 3)     │
│ 8. post-bloom             (bright-pass extract + blur)      │
│ 9. post-dof               (depth-based)                     │
│ 10. post-fog              (doc 15; chunk-patched)           │
│ 11. post-tonemap          (ACES / filmic)                   │
│ 12. ui                    (ortho overlay)                   │
└─────────────────────────────────────────────────────────────┘
```

Passes are owned by plugins via the `ga:renderer` priority registry. Plugins register passes at init; the renderer sorts and executes per frame. A pass can be conditionally skipped (e.g. qi-perception is skipped when the player is not perceiving qi).

---

## 4. The three backends

### 4.1 ThreeWebGPUBackend

The default backend. Uses Three.js r185's `Renderer` from `three/webgpu` with TSL node materials (see document 14). Best performance on capable hardware. Falls back to WebGL2 automatically if WebGPU context creation fails — but the engine treats this fallback as a deliberate backend swap, not an invisible Three.js behavior, so that capabilities are recomputed.

### 4.2 ThreeWebGL2Backend

The fallback backend. Used when:
- The browser reports no WebGPU (`navigator.gpu` is undefined).
- WebGPU context creation throws.
- The user has set `forcedApi: 'webgl2'` (low-power devices, older iOS Safari).
- A WebGPU shader compile failure cascades — recover by reloading the scene under WebGL2.

Same `RenderBackend` interface; different capabilities. Compute particles fall back to CPU-driven vertex buffers; storage buffers in fragment fall back to textures.

### 4.3 HeadlessTestBackend

No GPU. No canvas. Used by:
- The determinism test harness (century-long sim runs, no rendering cost).
- Unit tests for the renderer abstraction itself.
- The CI pipeline.
- The AI headless API when running in step mode without a display.

It produces no pixels. `readPixels` returns a deterministic pattern derived from `frame.tick` and the submitted scene hash. This makes screenshot-diff tests possible without a GPU — useful for regression-checking the presentation model.

```typescript
class HeadlessTestBackend implements RenderBackend {
  readonly id = 'headless-test' as const;
  readonly api = 'none' as const;

  capabilities(): BackendCapabilities {
    return {
      api: 'none',
      maxTextureSize: 4096,
      maxUniformBufferBindingSize: 65536,
      maxStorageBufferBindingSize: 1 << 27,
      maxComputeWorkgroupsPerDimension: 0,    // no compute
      supportsComputeParticles: false,
      supportsStorageBuffersInFragment: false,
      supportsBptcTextures: false,
      supportsAstcTextures: false,
      supportsInstancedMesh: true,
      supportsBatchedMesh: true,
      supportsShadowCascades: true,
      maxSamplesPerPixel: 1,
      timestampQuery: false,
    };
  }

  async readPixels(rect: PixelRect): Promise<Uint8Array> {
    // Deterministic placeholder. Hash of (rect, tick, sceneHash).
    return deterministicPattern(rect, this.currentTick, this.lastSceneHash);
  }
}
```

---

## 5. The 16 questions

**Q1. What problem does this system solve?**
Decoupling the simulation and presentation layers from any specific rendering library, so the engine can survive Three.js upgrades, swap WebGPU out for WebGL2, run headless for tests, and let future backends (wgpu-native via WASM, a custom renderer) be added without touching the simulation.

**Q2. What is the public interface?**
`RenderBackend` (§2), `ResourceDescriptor` (§2), `RenderPassGraph` (§3), and the five separation rules in §1.

**Q3. What is the internal architecture?**
A `Renderer` service owns the active backend, the resource registry, the frame loop, and the pass graph builder. The `RenderExtractor` diffs the presentation model into a `RenderCommandList` per frame. The backend consumes the command list and the pass graph.

**Q4. What is the data flow?**
Simulation state → `host.extractPresentation()` → presentation model → `RenderExtractor.run()` → command list + pass graph → `backend.beginFrame` / `submitScene` / `executePassGraph` / `endFrame` → GPU. Readback (screenshots, picking) flows back async.

**Q5. What is the lifecycle?**
Engine startup: `backend.initialize(config)` → if `ok=false`, fall to the recommended fallback backend. Per frame: `beginFrame → submitScene → executePassGraph → endFrame`. Resource lifecycle: `createResource` returns a handle; `disposeResource` frees it; the backend defers actual GPU free until end of frame to avoid mid-frame destruction. Engine shutdown: `backend.dispose()`.

**Q6. What is the failure model?**
Three classes of failure. (a) *Init failure* — WebGPU unavailable, context creation throws: `BackendInitResult.ok = false`, engine swaps backend. (b) *Runtime failure* — shader compile error, GPU reset: backend emits a `contextLost` event, renderer unloads the scene, reloads under the fallback backend. (c) *Resource failure* — texture too large, unsupported format: `createResource` throws `ResourceCreationError` with a structured payload; the asset system downgrades the asset (smaller texture, different format) and retries.

**Q7. What are the invariants?**
- The simulation never imports `three` (ESLint-enforced).
- `ResourceHandle` values are unique within a backend's lifetime and never reused after disposal.
- A pass graph is a DAG — cycles are a hard error caught at build time.
- `beginFrame` and `endFrame` always pair. Mismatch throws in dev mode.
- `capabilities()` returns the same object reference for the backend's lifetime (so callers can cache fields).

**Q8. What is the performance budget?**
Frame budget 16.6 ms (60 Hz). Backend overhead target: <1 ms on desktop, <2 ms on mobile. Render extraction (diff + command list build): <1.5 ms for 10k entities. Resource creation is amortized across frames; no `createResource` in a hot loop. Dispose is deferred.

**Q9. What is the determinism contract?**
The renderer is *not* deterministic — the GPU is not part of the canonical state (per doc 17 §3.1). The presentation model that feeds the renderer IS deterministic (it's derived from simulation state via deterministic extraction). Two runs with the same seed produce the same presentation model; the rendered pixels may differ by GPU vendor. The HeadlessTestBackend's `readPixels` is deterministic by construction, used for screenshot-diff tests.

**Q10. What is the threading/concurrency model?**
Main thread: simulation, presentation model, render extraction, command list build. Worker (OffscreenCanvas): backend frame execution, GPU submission. Communication via `postMessage` with `Transferable` (ArrayBuffer, ImageBitmap). The backend runs on the worker; the simulation does not block on it. If the worker is unavailable (no OffscreenCanvas), the backend runs on the main thread at a perf cost.

**Q11. How is it serialized?**
The renderer is not serialized — it is reconstructed from the presentation model on load. The presentation model IS serialized as part of the save (CBOR). Resource handles are not serialized; they are recreated by the asset system on load.

**Q12. How is it debugged?**
- The frame debugger (F12 in dev mode) shows the pass graph, GPU time per pass, draw call count, and per-pass texture contents.
- `backend.capabilities()` is exposed in the tweak panel.
- `shaderDebug: true` in config emits TSL source per material to a `/debug/shaders/` folder.
- GPU debug markers (`pushMarker`/`popMarker`) are visible in Spector.js / WebGPU Inspector.
- The HeadlessTestBackend logs every draw call at verbose level.

**Q13. How is it tested?**
- Contract tests: every backend must pass the same suite of `RenderBackend` contract tests (create/dispose, frame lifecycle, pass graph execution, readback).
- Screenshot-diff tests under HeadlessTestBackend: deterministic placeholder patterns hash-compared against golden images.
- Cross-backend parity tests: a fixed presentation model rendered under both WebGPU and WebGL2 backends; structural equality on draw call count and pass ordering (pixels may differ).
- Performance regression tests: frame time percentiles tracked in CI.

**Q14. What alternatives were rejected?**
- *Direct Three.js everywhere.* Rejected: every Three.js breaking change cascades through the whole engine; the simulation cannot run headless; WebGPU/WebGL2 swap requires rewriting client code. (See §0.)
- *A full custom renderer (no Three.js).* Rejected: building a competitive WebGPU renderer is man-years of work; Three.js r185 already has TSL, WebGPU, KTX2, meshopt. The abstraction gives us the option to replace Three.js later without touching the simulation — that option is exercised only if Three.js stagnates.
- *WebGPU-only, no fallback.* Rejected: 15% of users (older iOS, fragmented Android) lack WebGPU. The bible mandates browser-native reach.
- *WebGL2-only, no WebGPU.* Rejected: WebGPU gives 2-4× draw call throughput and compute particles. The bible's qi-effects and weather need it.
- *Pass graph as a flat list, not a DAG.* Rejected: a flat list cannot express "post-bloom needs the bright-pass texture from this frame and the depth from the geometry pass." A DAG is the proven model (Unreal RDG, Bevy).
- *Resources as objects, not handles.* Rejected: object references block GC, leak across worker boundaries, and force every system to know Three.js types. Handles are integers; integers transfer across workers trivially.

**Q15. What are the known limitations?**
- WebGPU BatchedMesh is slower than WebGL2 for >1024 batches (Three.js issue #29580). Workaround: prefer InstancedMesh; reserve BatchedMesh for WebGL2-only deployments.
- iOS Safari WebGPU has black-screen bugs on some devices (Three.js issue tracker, multiple). Mitigation: detect the device, force WebGL2.
- The HeadlessTestBackend produces no real pixels — visual fidelity bugs cannot be caught by it; they require a real GPU in CI (a headless Chrome with SwiftShader).
- Pass graph rebuild cost is non-trivial at >50 passes; the renderer caches graphs keyed by their structural hash.
- Cross-backend pixel parity is impossible (different GPUs rasterize differently). Tests assert structural parity, not pixel parity.

**Q16. What does this enable next?**
Document 14 (Three.js integration) implements the WebGPU and WebGL2 backends concretely. Document 15 (materials/lighting/post) builds the material and post systems on top of `ResourceDescriptor` and the pass graph. Document 18 (VFX) registers VFX passes through the same graph. Future backends (a wgpu-native WASM renderer, a server-side software renderer for cloud streaming) plug in without touching the simulation.

---

## 6. Failure cases (catalogue)

| Failure | Detection | Recovery |
|---|---|---|
| `navigator.gpu` undefined | Init probe | Swap to ThreeWebGL2Backend, log to telemetry |
| WebGPU adapter request rejects | `adapter.request()` throws | Swap to ThreeWebGL2Backend |
| Device lost (GPU reset) | `device.lost` promise resolves | Surface error to UI; reload scene under fallback backend |
| Shader compile error | TSL compile throws | Log shader source; degrade material to PBR fallback; continue |
| Texture too large | `createResource` throws | Asset system downgrades to next-lower mip; retry |
| Out of memory (allocation) | Allocation throws | Trigger memory-pressure eviction (doc 16); retry once |
| Pass graph cycle | Build-time topological sort fails | Hard error in dev; in prod, drop the offending pass, log |
| `beginFrame`/`endFrame` mismatch | Frame counter | Throw in dev; in prod, force-end the frame and warn |
| Worker (OffscreenCanvas) unavailable | Feature detection | Backend runs on main thread; perf degrades gracefully |
| Context loss (WebGL2) | `webglcontextlost` event | Dispose backend, recreate from config, reload scene |

---

## 7. Rejected alternatives (detail)

### 7.1 "Just use Three.js directly"

The argument: Three.js is the renderer; abstracting it adds indirection cost.

The rejection: Three.js has shipped ~14 breaking-change releases since 2020. Every time `MeshStandardMaterial`'s constructor changes, every system that constructs one rewrites. The abstraction costs ~1 μs per draw call (the handle→object lookup) and 0 cognitive load on the simulation team — they never see a Three.js type. The cost is paid once, by the backend.

### 7.2 "Build a custom WebGPU renderer"

The argument: We control everything; no library tax.

The rejection: A competitive WebGPU renderer needs TSL-equivalent shader composition, KTX2 transcoding, meshopt decode, glTF loading, shadow cascades, post-processing — all of which Three.js r185 has. Reimplementing these is man-years. The abstraction lets us defer this decision; if Three.js stagnates we replace the backend, not the engine.

### 7.3 "One backend, runtime-checked"

The argument: One codebase with `if (webgpu) { ... } else { ... }` branches.

The rejection: Branches in hot paths cost more than the v-table indirection of separate backends. Worse, the branches propagate into every system: materials, lighting, post. Three backends with a shared interface keeps the branching in one place.

### 7.4 "Skip the HeadlessTestBackend, use a real GPU in CI"

The argument: SwiftShader gives real WebGPU in CI.

The rejection: SwiftShader is ~50× slower than a real GPU. A 1000-year century sim takes 30 minutes on SwiftShader vs 30 seconds headless. The HeadlessTestBackend exists for the long-running determinism tests where rendering is irrelevant.

---

## 8. What this document enables

The renderer abstraction is the contract every rendering system obeys. With it in place:

1. Document 14 implements the Three.js adapter without leaking Three.js into the rest of the engine.
2. Document 15 builds materials, lighting, and post as `ResourceDescriptor`s and `RenderPassNode`s — no Three.js types in the public interface.
3. Document 18 (VFX) registers VFX passes through the same graph.
4. The simulation team never sees a Three.js import. The asset team never sees one. The combat team never sees one. Only the `renderer/backends/` directory does.
5. The HeadlessTestBackend lets the determinism harness run centuries of sim in seconds, with no GPU.
6. A future backend — wgpu-native via WASM, a software rasterizer for cloud streaming, a ray-traced backend for the Mahayana-stage "law authoring" mode — plugs in by implementing `RenderBackend`. The simulation does not change.

The engine is renderer-agnostic. Three.js is the first adapter, not the architecture.
