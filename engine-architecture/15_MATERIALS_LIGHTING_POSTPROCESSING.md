# 15 — Materials, Lighting, Post-Processing

**Status:** Engine systems above the renderer abstraction. Authored in engine types; compiled to TSL by the adapter. No Three.js types in the public interface.
**Date:** 2026-08-03
**Engine:** Grand Architect (browser-native plugin host, deterministic contract)
**Depends on:** `13_RENDERER_ABSTRACTION` (ResourceDescriptor, RenderPassGraph), `14_THREEJS_WEBGPU_WEBGL_INTEGRATION §2,§4` (TSL node materials, global chunk patching), `16_ASSET_REGISTRY_IMPORT_PIPELINE §2` (AssetRecord.skeletonProfile, GA_material_ref glTF extension), `09_ENTITY_RUNTIME_STATE_ARCHITECTURE` (entity material references)
**Read with:** `11_ENGINE_DESIGN §2.1,§2.2` (bible fog + water systems), `17_ENGINE_ARCHITECTURE §5.2,§5.3` (shader chunk system, material system), `08_THREEJS_REPOSITORY_RESEARCH §3` (InstancedMesh / BatchedMesh for per-instance variation)

---

## 0. What this document is

This document specifies the three rendering systems that sit above the `RenderBackend` interface (document 13) and below the Three.js adapter (document 14):

1. **The material system** — PBR base, custom xianxia materials (jade, silk, bronze, spirit-wood), the material library, per-instance variation, registration, glTF referencing, serialization.
2. **The lighting system** — sun, ambient, hemisphere, time-of-day curve, shadow cascades, SSAO/GTAO.
3. **The post-processing pipeline** — bloom, tone mapping, fog/atmosphere, depth-of-field, outline/selection, the global fog-chunk patch.

All three are authored in engine-owned types. The Three.js adapter compiles them to TSL node materials and post passes. The simulation, the scene graph, and the asset pipeline never see a `THREE.Material` or `THREE.Light`.

---

## 1. The material system

### 1.1 The MaterialRegistry

Materials are identified by string ID (`ga:pbr`, `ga:jade`, `ga:silk`, `ga:bronze`, `ga:spirit-wood`, `ga:water-river`, `ga:water-paddy`, `ga:qi-residue`, `ga:foliage-card`, `ga:dissolve`). The registry maps IDs to `MaterialDefinition`s. The renderer (via the adapter) compiles each definition to a TSL node material lazily on first use.

```typescript
interface MaterialRegistry {
  register(def: MaterialDefinition): void;
  get(materialId: string): MaterialDefinition | undefined;
  list(): MaterialDefinition[];
  /** Called by the asset pipeline when a glTF references a material by ID. */
  resolveReference(ref: MaterialRef): MaterialDefinition;
}

interface MaterialDefinition {
  id: string;
  version: string;
  base: 'pbr' | 'unlit' | 'custom';
  /** TSL node graph, authored in engine types (see §1.4). */
  tslGraph: TslGraphFactory;
  /** Default uniforms; overridable per-instance. */
  defaultUniforms: Record<string, UniformValue>;
  /** Default texture slots; overridable per-instance. */
  defaultTextures: Record<string, TextureSlot>;
  /** Static defines that affect compilation. */
  staticDefines: Record<string, string | number | boolean>;
  renderQueue: RenderQueue;
  doubleSided: boolean;
  /** For the asset pipeline: which glTF material extension key references this. */
  gltfExtension?: string;
  /** Memory budget for the compiled program + uniform buffer. */
  memoryBudget: number;
}

type RenderQueue = 'opaque' | 'transparent' | 'alpha-test' | 'custom-overlay';

interface UniformValue {
  type: 'float' | 'vec2' | 'vec3' | 'vec4' | 'color' | 'mat4' | 'int';
  value: number | number[] | Float32Array;
  min?: number; max?: number; // for the tweak panel
}

interface TextureSlot {
  kind: 'albedo' | 'normal' | 'roughness' | 'metallic' | 'emissive' | 'orm' | 'data';
  srgb: boolean;
  defaultHandle?: number; // a fallback texture handle if no texture bound
}
```

### 1.2 The PBR base

`ga:pbr` is the default material for any mesh that does not specify otherwise. It is a standard PBR model: metal-roughness workflow, GGX BRDF, energy-conserving specular, Lambertian diffuse. Authored as a TSL graph that wraps Three.js's built-in physical lighting nodes.

```typescript
const pbrDefinition: MaterialDefinition = {
  id: 'ga:pbr',
  version: '1.0.0',
  base: 'pbr',
  tslGraph: pbTslGraph,         // wraps three/tsl's lightingPhysical
  defaultUniforms: {
    baseColor:   { type: 'color', value: [0.7, 0.7, 0.7] },
    roughness:   { type: 'float', value: 0.6, min: 0, max: 1 },
    metallic:    { type: 'float', value: 0.0, min: 0, max: 1 },
    emissive:    { type: 'color', value: [0, 0, 0] },
    emissiveStrength: { type: 'float', value: 0, min: 0, max: 16 },
    alphaCutoff: { type: 'float', value: 0.5, min: 0, max: 1 },
  },
  defaultTextures: {
    albedo:    { kind: 'albedo',    srgb: true },
    normal:    { kind: 'normal',    srgb: false },
    orm:       { kind: 'orm',       srgb: false }, // AO/rough/metal packed
    emissive:  { kind: 'emissive',  srgb: true },
  },
  staticDefines: { ALPHA_TEST: false },
  renderQueue: 'opaque',
  doubleSided: false,
  gltfExtension: 'GA_material_pbr',
  memoryBudget: 4096, // bytes per uniform buffer
};
```

### 1.3 Custom xianxia materials

The engine ships a curated library of materials specific to the xianxia setting. These are not generic PBR — they encode the visual language of the world.

| Material ID | Purpose | Key model |
|---|---|---|
| `ga:jade` | Jade pendants, ritual implements, jade plaques | Subsurface scattering + anisotropic specular; light bleeds through thin edges |
| `ga:silk` | Cultivator robes, formal wear | Two-layer velvet specular + anisotropic stretch along warp direction; flow map for wind |
| `ga:bronze` | Ritual vessels, weapon fittings, mirrors | Patina layer + base metal; oxidation mask grows over in-game time |
| `ga:spirit-wood` | Sect building frames, sword scabbards | Grain anisotropy + faint inner glow when qi-imbued |
| `ga:water-river` | Rivers, streams | Beer-Lambert + Gerstner + variance roughness (bible doc 11 §2.2) |
| `ga:water-paddy` | Flooded paddies | Shallow-water variant; turbidity + albedo tints; reflective of sky |
| `ga:qi-residue` | Qi perception overlay | Additive screen-blend; visible only when qi-perception pass is active |
| `ga:foliage-card` | Grass, crops, distant trees | Two-axis billboarding + wind TSL; alpha-tested |
| `ga:dissolve` | Death/teleport exits | Noise-driven alpha; edge glow; used by VFX (doc 18) |

Each material is a `MaterialDefinition` with a TSL graph. The graphs are authored in `renderer/materials/` — engine code, not adapter code. The adapter compiles them.

### 1.4 The TSL graph factory

A `TslGraphFactory` is a function that returns a TSL node graph given a `MaterialBuildContext`. The build context provides uniform accessors, texture samplers, and the world-space inputs (position, normal, tangent, uv).

```typescript
type TslGraphFactory = (ctx: MaterialBuildContext) => MaterialOutputNodes;

interface MaterialBuildContext {
  uniforms: UniformAccessor;       // uniform('baseColor') → TSL uniform node
  textures: TextureAccessor;       // texture('albedo') → TSL texture node
  defines: Record<string, boolean>;
  worldPos: TslNode;               // positionWorld
  worldNormal: TslNode;            // normalWorld
  worldTangent: TslNode;
  uv: TslNode;
  vertexColor: TslNode;
  time: TslNode;                   // engine-synchronized time (NOT performance.now())
}

interface MaterialOutputNodes {
  colorNode: TslNode;              // final albedo + lighting
  normalNode?: TslNode;            // perturbed normal (e.g. normal map)
  emissiveNode?: TslNode;
  alphaNode?: TslNode;
  metalnessNode?: TslNode;
  roughnessNode?: TslNode;
}

type TslNode = unknown; // opaque; the adapter casts to three/tsl nodes
```

The factory is called once per (materialId, backend) pair, then cached. Re-calling it on a uniform change would recompile — wasteful. Uniforms are accessed via the accessor and bound at runtime, not compile-time.

### 1.5 Per-instance variation

A single material definition (`ga:jade`) may be instantiated thousands of times (every jade pendant in the world). Per-instance variation (color tint, roughness range, emissive strength) is handled by per-instance uniform overrides, not by recompiling.

```typescript
interface MaterialInstance {
  materialId: string;           // references the registry
  uniformOverrides: Record<string, UniformValue>;
  textureOverrides: Record<string, ResourceHandle>;
}

// Adapter compiles ga:jade ONCE. Instances share the compiled program.
// Per-instance uniforms are uploaded to a uniform buffer per draw.
```

For crowds (10k disciples), per-instance variation uses `InstancedBufferAttribute` for the per-instance uniforms — one draw call, 10k uniform sets in a single buffer.

### 1.6 Material registration and glTF referencing

Materials are registered at engine startup (via the `ga:renderer` plugin's `init`):

```typescript
host.materials.register(pbrDefinition);
host.materials.register(jadeDefinition);
host.materials.register(silkDefinition);
// ...
```

glTF assets reference materials by ID via a custom extension:

```json
{
  "materials": [
    {
      "name": "pendant-jade",
      "extensions": {
        "GA_material_ref": {
          "materialId": "ga:jade",
          "uniformOverrides": {
            "baseColor": [0.6, 0.85, 0.7],
            "subsurface": 0.7
          }
        }
      }
    }
  ]
}
```

If `GA_material_ref` is present, the asset pipeline (document 16) uses the referenced material; the glTF material block is ignored (or used as a fallback for non-engine viewers). If absent, the pipeline falls back to the glTF material's `pbrMetallicRoughness`, mapped to `ga:pbr` with the glTF textures.

This means: an artist exports a jade pendant from Blender with a placeholder material. The glTF carries `GA_material_ref: ga:jade`. The engine renders it with the real jade TSL graph. A non-engine viewer (e.g. a glTF preview tool) renders the placeholder.

### 1.7 Serialization

Material instances are serialized as part of the entity's presentation model:

```typescript
// In CBOR:
{
  "mesh": 12345,                    // ResourceHandle (resolved on load)
  "material": {
    "materialId": "ga:jade",
    "uniformOverrides": { "baseColor": [0.6, 0.85, 0.7], "subsurface": 0.7 },
    "textureOverrides": {}
  }
}
```

On load: the asset system resolves the mesh handle; the material system resolves the material ID via the registry; the adapter compiles the material (or fetches from cache); the uniform overrides are uploaded.

---

## 2. The lighting system

### 2.1 The LightingState

```typescript
interface LightingState {
  sun: SunLight;
  ambient: AmbientLight;
  hemisphere: HemisphereLight;
  localLights: LocalLight[];     // torches, lanterns, qi-glow, projectiles
  skyModel: SkyModel;
  timeOfDay: TimeOfDayCurve;     // 0..24 hours
  shadowCascades: ShadowCascadeConfig;
  ssao: SsaoConfig;
  exposure: number;
}

interface SunLight {
  direction: Vec3;               // computed from timeOfDay
  color: Color;                  // warm at dawn/dusk, white at noon
  intensity: number;             // 0 at night, peaks at noon
  castShadow: boolean;
  shadowBias: number;
  shadowNormalBias: number;
}

interface SkyModel {
  mode: 'preetham' | 'hosek-wilkie' | 'procedural';
  turbidity: number;
  groundAlbedo: Color;
}
```

### 2.2 The time-of-day curve

Time of day is not a single scalar — it's a curve. Each parameter (sun intensity, sun color, ambient intensity, fog color, sky color, exposure) has its own 24-hour curve.

```typescript
interface TimeOfDayCurve {
  hour: number;                  // 0..24, fractional
  sunIntensity: AnimationCurve;  // 0 at 6:00/18:00, peak at 12:00
  sunColor: ColorCurve;          // 0xff7733 dawn, 0xffffff noon, 0xff4400 dusk
  ambientIntensity: AnimationCurve;
  ambientColor: ColorCurve;
  fogColor: ColorCurve;
  fogDensity: AnimationCurve;    // higher at dawn (mist)
  skyColor: ColorCurve;
  exposure: AnimationCurve;      // raised at night for night-vision feel
}

type AnimationCurve = {
  keys: Array<{ t: number; value: number; interpolation: 'step' | 'linear' | 'bezier' }>;
};
```

The curves are authored in the tweak panel (document 11 §1.2) and exported as JSON presets. A designer tunes the day/night cycle in real-time, exports, ships.

### 2.3 Shadow cascades

The engine uses 4-cascade shadow maps for the sun. Cascades split the camera frustum by depth (10%, 25%, 50%, 100% of far plane), each rendered at independent resolution. Close-ups get high-resolution shadows; distant geometry gets coarse shadows.

```typescript
interface ShadowCascadeConfig {
  cascadeCount: 4;
  splitRatios: [0.05, 0.15, 0.40, 1.0]; // of camera far plane
  resolutions: [2048, 2048, 1024, 1024]; // per-cascade map size
  blend: number;                 // 0..1, soft blend between cascades
  bias: number;
  normalBias: number;
}
```

Local lights (torches, lanterns) cast single-map shadows, capped at 4 shadow-casting locals simultaneously (perf budget). Non-shadow-casting locals are unlimited (capped by uniform buffer size, ~32 active per frame).

### 2.4 SSAO / GTAO

Screen-space ambient occlusion is computed from the depth+normals pass (output of the opaque pass) and applied as a multiplier on the ambient term. The engine uses GTAO (ground-truth ambient occlusion) on WebGPU; SSAO (cheaper) on WebGL2.

```typescript
interface SsaoConfig {
  mode: 'gtao' | 'ssao' | 'off';
  radius: number;                // world units; 0.5m default
  bias: number;                  // to avoid self-occlusion
  thickness: number;             // max occluder distance
  quality: 'low' | 'medium' | 'high'; // sample count
}
```

GTAO is a post-pass node in the pass graph (document 13 §3). It reads the depth and normal textures, writes an AO texture, which the lighting pass samples.

---

## 3. The post-processing pipeline

### 3.1 The PostStack

Post-processing is a stack of passes, each a node in the pass graph. The stack is authored in engine types; the adapter compiles each to a TSL post node.

```typescript
interface PostStack {
  passes: PostPassInstance[];
  order: string[];               // pass IDs in execution order
}

interface PostPassInstance {
  passId: string;                // 'bloom', 'tonemap', 'fog', 'dof', 'outline', 'vignette'
  enabled: boolean;
  params: Record<string, UniformValue>;
  inputs: string[];              // other pass IDs whose output this consumes
  outputs: string[];             // pass IDs that consume this output
}
```

### 3.2 The default stack

```
   opaque color (HDR)  ──┬──►  ssao/gtao  ──┐
                         │                   │
                         └──►  bright-pass ──►  bloom  ──┐
                                                         │
   depth  ───────────────────────────────────►  dof  ──┤
                                                         │
   ──────────────────────────────────────────────────►  fog  ──┤
                                                                │
                                                                ▼
                                                          tonemap (ACES)
                                                                │
                                                                ▼
                                                         outline (selection)
                                                                │
                                                                ▼
                                                          vignette + grain
                                                                │
                                                                ▼
                                                          LDR output → screen
```

### 3.3 Bloom

The engine's bloom is a threshold-bright-pass + separable Gaussian pyramid + additive composite. The threshold, intensity, and radius are tweakable. Bloom runs in HDR (before tonemapping) so bright qi-emissive surfaces bloom correctly.

```typescript
const bloomDefinition: PostPassDefinition = {
  passId: 'bloom',
  tslGraph: bloomTslGraph,
  defaultParams: {
    threshold: { type: 'float', value: 0.9, min: 0, max: 4 },
    intensity: { type: 'float', value: 0.6, min: 0, max: 4 },
    radius:    { type: 'float', value: 0.4, min: 0, max: 1 },
  },
  inputs: ['opaque-color'],
  outputs: ['bloom-result'],
};
```

### 3.4 Tone mapping

ACES filmic tonemap by default. The engine supports:
- ACES filmic (default; matches the bible's cinematic look)
- AgX (alternative; flatter, more filmic)
- Reinhard (simple, fallback)
- Linear (for debug)

Exposure is part of the time-of-day curve (§2.2), not the tonemap. Tonemap converts HDR scene-referred to LDR display-referred.

### 3.5 Fog and atmosphere

This is the global fog system from the bible (document 11 §2.1). Fog is **not** a post pass — it's chunk-patched into every material (§4 below). The "post-fog" pass in the pass graph is for atmospheric height fog rendered as a screen-space volumetric layer when the player is above the fog layer (looking down at a mist-filled valley).

The two fog systems coexist:
- **Material-fog** (chunk-patched): every fragment mixes with fog color based on density × distance × height-falloff. Cheap, uniform, inherited by all materials.
- **Volumetric-fog** (post pass): a screen-space raymarch for the god-ray / valley-mist effect. Expensive, optional, only enabled when the camera is positioned to see it.

### 3.6 Depth of field

DOF is a depth-based blur, with a focus distance, focus range, and bokeh shape. Used for cinematics (cutscenes, dialogue close-ups). Disabled in gameplay (the player needs to see clearly).

### 3.7 Outline / selection

The selection outline is a post pass: render selected entity IDs to a stencil/ID buffer, blur, threshold, composite as a colored rim. Used for the player's current target, the cursor hover, the qi-perception focus.

---

## 4. The global fog chunk patch

This is the mechanism described in the bible (document 11 §2.1) and the integration document (document 14 §4). The engine patches Three.js's fog shader chunks at startup, before any material compiles. Every material with `fog: true` inherits the engine's height-based fog model.

### 4.1 The patched chunks

```typescript
// renderer/backends/three/patches/chunks/heightFogPars.ts (GLSL, for WebGL2)
export const heightFogParsGlsl = /* glsl */`
  uniform float fogDensity;
  uniform float fogHeightFalloff;
  uniform vec3  fogColor;
  uniform float cameraHeight;
  varying float vFogHeight;
  float gaFogFactor(vec3 worldPos) {
    float h = worldPos.y;
    float dh = max(0.0, cameraHeight - h);
    float f = exp(-fogDensity * fogHeightFalloff * dh);
    return clamp(f, 0.0, 1.0);
  }
`;

// renderer/backends/three/patches/chunks/heightFogFragment.ts (GLSL)
export const heightFogFragmentGlsl = /* glsl */`
  float gaFactor = gaFogFactor(vWorldPosition.xyz);
  gl_FragColor.rgb = mix(fogColor, gl_FragColor.rgb, gaFactor);
`;

// renderer/backends/three/patches/chunks/heightFogTsl.ts (TSL, for WebGPU)
import { Fn, vec3, float, uniform, exp, max, clamp, mix, positionWorld } from 'three/tsl';

export const heightFogTsl = Fn(() => {
  const density = uniform(0.035, 'fogDensity');
  const falloff = uniform(0.0042, 'fogHeightFalloff');
  const color = uniform(vec3(0.16, 0.16, 0.24), 'fogColor');
  const cameraH = uniform(0.0, 'cameraHeight');

  const dh = max(0.0, cameraH.sub(positionWorld.y));
  const factor = exp(density.mul(falloff).mul(dh).negate()).clamp(0.0, 1.0);
  return mix(color, /* incoming color */ null, factor);
});
```

### 4.2 The patch application

At engine startup, `applyGlobalPatches()` (document 14 §4) overwrites Three.js's `ShaderChunk.fog_pars_fragment`, `ShaderChunk.fog_fragment`, and the TSL `fog` node. From that point, every material compiled by Three.js uses the engine's height-based fog.

The fog uniforms (`fogDensity`, `fogHeightFalloff`, `fogColor`, `cameraHeight`) are global uniforms, updated once per frame by the lighting system from the `LightingState.fogColor` and `LightingState.fogDensity` (which are part of the time-of-day curve, §2.2).

### 4.3 Why this works

- **Inheritance for free.** Every glTF asset with `fog: true` (the glTF default) gets the engine's height fog.
- **One source of truth.** The fog model lives in one TSL graph. The tweak panel adjusts the uniforms; every material sees the change.
- **Cache-friendly.** Three.js caches compiled programs by shader source hash. All materials sharing the patched chunk share one program.
- **The bible's intent.** Document 11 §2.1 specifies this exact mechanism.

---

## 5. The 16 questions

**Q1. What problem does this system solve?**
Providing a coherent visual language (jade, silk, bronze, spirit-wood, water, qi) for the xianxia world; a lighting model that respects the day/night cycle and the genre's atmospheric mood; and a post-processing pipeline that produces the bible's cinematic look — all without leaking Three.js types into engine code.

**Q2. What is the public interface?**
`MaterialRegistry`, `MaterialDefinition`, `MaterialInstance`, `LightingState`, `PostStack`, `PostPassInstance` (§1–3).

**Q3. What is the internal architecture?**
The `ga:renderer` plugin owns the `MaterialRegistry`, the `LightingSystem`, and the `PostStack`. The adapter (document 14) compiles them to Three.js objects. The simulation reads lighting state (for qi-perception, NPC schedules); the renderer reads all three.

**Q4. What is the data flow?**
Designer authors material TSL graphs → registry → adapter compiles on first use → cached. Per frame: `LightingSystem` updates sun direction from time-of-day curve → sun uniforms uploaded → shadow cascades rendered → opaque pass samples sun/ambient/hemisphere → post stack runs → output to screen.

**Q5. What is the lifecycle?**
Engine startup: register materials, build post stack, apply global fog patches. Per frame: update lighting from time-of-day, render shadow cascades, render opaque, run post stack. Shutdown: dispose compiled materials and post passes.

**Q6. What is the failure model?**
Material TSL compile failure → fall back to `ga:pbr` for that material; log the error. Texture missing → use the slot's `defaultHandle` (a 4×4 gray texture). Shadow cascade allocation failure → drop the highest cascade, log. Post pass failure → disable that pass for the frame, log.

**Q7. What are the invariants?**
- The fog chunks are patched exactly once, before any material compiles.
- A material's TSL graph is compiled at most once per backend.
- Per-instance uniform overrides do not recompile the material.
- The lighting state is part of the deterministic simulation (the sun direction is computed from the tick, not from wall clock).
- Post-pass order is fixed at startup; passes cannot be added mid-frame.

**Q8. What is the performance budget?**
Lighting update: <0.5 ms per frame. Shadow cascade render: 2–4 ms (4 cascades at 2k×2k). SSAO/GTAO: 1.5–3 ms. Bloom: 0.8 ms. DOF: 1.2 ms (when enabled). Volumetric fog: 2 ms (when enabled). Total post: <8 ms on desktop, <12 ms on mobile.

**Q9. What is the determinism contract?**
The `LightingState` (including the time-of-day hour, the sun direction, the fog density) is deterministic — derived from the simulation tick. The pixels rendered are not (GPU is not canonical). The time-of-day curve keys are part of the save; two runs produce the same lighting state at the same tick.

**Q10. What is the threading/concurrency model?**
The lighting system runs on the main thread (it's part of the simulation step). The post stack and material compilation run on the renderer worker (with the adapter). The MaterialRegistry is shared (read-only after init); per-frame uniform uploads happen on the worker.

**Q11. How is it serialized?**
- Material instances: per-entity, in the presentation model (§1.7).
- Lighting state: in the world state slice (time-of-day hour, fog density, exposure).
- Post stack: in the engine config (not the save); the same stack is used across saves.
- Material definitions: not serialized; they're code, registered at init.

**Q12. How is it debugged?**
- Tweak panel: every material uniform, lighting parameter, post-pass param is a slider.
- Material inspector: select an entity, see its material ID, uniform overrides, compiled TSL source.
- Frame debugger: per-pass GPU time, per-pass texture contents.
- Shader debug dump: TSL source emitted to `/debug/shaders/` when `shaderDebug: true`.

**Q13. How is it tested?**
- Material compile tests: every material in the registry compiles under both backends.
- Visual regression: screenshot-diff scenes per material under HeadlessTestBackend.
- Lighting curve tests: at tick T, sun direction matches the expected vector to 1e-6.
- Fog uniform tests: at tick T, fog density matches the curve.
- Post-stack contract tests: every post pass produces an output texture of the expected format.

**Q14. What alternatives were rejected?**
- *Per-material fog.* Rejected: bible document 11 §2.1 mandates the global patch. Per-material is 1000× the work and inconsistent.
- *Three.js's built-in fog.* Rejected: uniform density, no height falloff. The bible requires height-based.
- *Raw ShaderMaterial for custom xianxia materials.* Rejected: see document 14 §2; TSL is the one-source path.
- *Forward-only rendering (no post stack).* Rejected: the bible's cinematic look (bloom on qi-emissive, ACES tonemap, DOF in cinematics) requires post.
- *Deferred rendering.* Rejected: WebGPU deferred is feasible but the engine's material diversity (transparency, foliage cards, qi-residue additive) is hostile to G-buffer formats. Forward + post is the standard for this material mix.
- *TAA (temporal anti-aliasing) by default.* Rejected: TAA smears qi-particle effects. MSAA where supported; FXAA fallback. TAA is opt-in for cinematics.

**Q15. What are the known limitations?**
- TSL's `MeshStandardMaterial`-equivalent does not yet expose sheen/clearcoat (Three.js roadmap). Custom materials bypass this.
- 4-cascade shadows are expensive on mobile; the engine drops to 2 cascades at low quality.
- GTAO is WebGPU-only; SSAO fallback is lower quality.
- Volumetric fog (god rays) is expensive; disabled on mobile and on WebGL2.
- DOF bokeh is a simple disc shape on WebGL2; hexagonal on WebGPU.

**Q16. What does this enable next?**
Document 18 (VFX) uses the material system's `ga:dissolve`, `ga:qi-residue`, and per-instance overrides for technique presentation. Document 17 (animation) drives material parameters (e.g. emissive strength during a charge-up animation). The lighting system's time-of-day curve is what makes the bible's "dawn mist in the paddies" (document 11 §2.1) actually visible.

---

## 6. Failure cases (catalogue)

| Failure | Detection | Recovery |
|---|---|---|
| Material TSL compile error | Adapter throws on first use | Fall back to `ga:pbr` for that material; log shader source |
| Material not in registry | `MaterialRegistry.get` returns undefined | Fall back to `ga:pbr`; log missing ID |
| Texture missing / failed to load | Asset system returns placeholder handle | Use the slot's `defaultHandle` (4×4 gray) |
| Shadow cascade map allocation fail | Adapter throws | Drop highest cascade; render 3 cascades |
| Time-of-day curve malformed | Parser rejects | Use default curve (bible-spec values); log |
| Post-pass compile error | Adapter throws on first use | Disable that pass; warn in tweak panel |
| Fog chunk patch failed (chunk name changed) | Startup assertion | Hard error: refuse to boot (Three.js upgrade pending) |
| Too many local lights active | Uniform buffer overflow | Cap at 32; drop the dimmest; log |

---

## 7. Rejected alternatives (detail)

### 7.1 "Per-material fog authored in each material"

The argument: each material controls its own fog.

The rejection: the bible (document 11 §2.1) explicitly mandates the global patch. Per-material fog is 1000 materials × fog code = 1000 places to maintain the fog model. The global patch is one TSL graph, inherited everywhere, tuned in one place.

### 7.2 "Deferred rendering for the lighting"

The argument: deferred handles many lights cheaply.

The rejection: the engine's material diversity (transparency for qi-residue, alpha-test for foliage, additive for VFX, anisotropic for silk) is hostile to a fixed G-buffer layout. Forward + post handles all of these. The engine has at most ~32 active local lights per frame (perf budget), well within forward's range.

### 7.3 "TAA by default"

The argument: TAA is the modern standard for AA.

The rejection: TAA smears particles. The bible's qi-effects (document 18) are particle-heavy; TAA makes them look muddy. MSAA where supported; FXAA fallback. TAA is opt-in for cinematics where particle smearing is acceptable.

### 7.4 "Author lighting in Three.js's GUI"

The argument: Three.js has lighting helpers.

The rejection: the bible (document 11 §1.2) mandates every parameter be a real-time tweakable exposed through the engine's tweak panel. Three.js's GUI is its own thing; the engine's tweak panel is the unified surface. Lighting is authored in engine types, tuned in the engine panel.

---

## 8. What this document enables

1. The visual language of the xianxia world is encoded: jade, silk, bronze, spirit-wood, water, qi-residue — each a TSL graph in the registry.
2. The day/night cycle is a tunable curve: a designer sets the mood for dawn, noon, dusk, night; the engine interpolates.
3. The post stack produces the bible's cinematic look (bloom, ACES, DOF in cinematics).
4. The fog system (bible document 11 §2.1) has a concrete implementation: global chunk patch + post-pass volumetric for god rays.
5. glTF assets reference materials by ID via `GA_material_ref`; the asset pipeline (document 16) honors this.
6. Animation (document 17) drives material parameters; VFX (document 18) uses material overrides for dissolve/qi-residue.

The visual world is now authored in engine types. Three.js compiles it. The simulation drives it. The tweak panel tunes it.
