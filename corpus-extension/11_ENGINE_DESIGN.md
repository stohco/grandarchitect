# 11 — Engine Design: The Integrated Framework

**Status:** Design document. The engine is one thing, not "engine + tools."
**Date:** 2026-08-03

---
**Truth level:** Derived (engine design)
**Implements:** engine-architecture/51_MULTIVERSE_GROUND_TRUTH_ARCHITECTURE.md, corpus-extension/50_GROUND_TRUTH_SYSTEM_SPECIFICATION.md
**Implementation status:** [SPEC] — fully specified, implementation in progress

---

## Ground-Truth Annotation

> [CANON] The engine is deterministic, plugin-based, and capability-driven. No forbidden functions in simulation code.

> [DERIVED] All measurements in this document use SI units (doc 52). Visual concepts follow the VTP schema (doc 51). Moving entities follow MotionProfiles (doc 55).

> [PROC] Instance-level details (exact NPC counts, specific tree placements, weather sequences) vary by seed within canonically-defined ranges.

> [UNRESOLVED] See /questions/ registry for open questions related to this document.

**Topic:** Engine architecture decisions

---



## 0. What this document is

This is the engine design. Not "the engine and its tools" — the engine, full stop. The tools are the engine's own surfaces. The asset pipeline is the engine's build process. The tweak UIs are the engine's editor. The determinism stack is the engine's foundation. One framework, one vocabulary, one architecture.

The vocabulary is game-dev domain language: materials, meshes, draw calls, LOD, frustum culling, shadow maps, shader chunks, render passes, frame budgets. Not cultivation metaphors. The Grand Architect framing belongs to the lore and the player's experience; the engine's API speaks the language of graphics engineering.

---

## 1. Architectural principles

### 1.1 The engine wraps Three.js; it does not wrap around it

Three.js is the rendering layer. The engine is everything that uses Three.js: the scene graph management, the material system, the lighting model, the fog and atmosphere, the water and terrain, the NPC simulation, the qi perception layer, the combat system, the save/load, the determinism. Three.js is a dependency; the engine is the product.

### 1.2 Every consequential parameter is a real-time tweakable

This is the core design principle. Every system exposes its parameters through a unified tweak UI. The workflow:

1. Implement the system with correct math
2. Expose every consequential setting as a named parameter with min/max/default
3. Build a UI panel (sliders, color pickers, toggles) for those parameters
4. Run the engine, tweak in real-time, find the feel
5. Export the tweaked values as a JSON preset
6. The engine loads the preset as its default on next run

This means the "feel" of the game is data, not code. A designer tunes without recompiling. The shipped game runs with tuned defaults. The tweak UI is available in dev mode and stripped in production.

### 1.3 The determinism stack is the foundation, not an afterthought

Every system — rendering, simulation, RNG, save/load — uses the determinism stack (proven in Phase 0). The RNG (xoshiro256\*\*), transcendentals (Cody-Waite + minimax), fixed-point (Q32.32), CBOR serialization, and SHA-256 hashing are the engine's bedrock. No system uses `Math.random()`, `Math.sin()`, or non-deterministic serialization.

### 1.4 The asset pipeline is the engine's build process

Assets are not "loaded by the engine." Assets are processed by the engine's build step (glTF-Transform + meshoptimizer + KTX2) into deterministic, content-addressed blobs. The engine loads these blobs by hash. The pipeline is documented in the engine's build system, not in a separate "tools" folder.

### 1.5 Game-dev domain language throughout

The engine's API uses standard graphics-engine vocabulary. Systems are named: Renderer, SceneManager, MaterialLibrary, LightingSystem, FogSystem, WaterSystem, TerrainSystem, NPCSimulator, QiPerceptionLayer, CombatSystem, SaveSystem. Parameters are named: `fogDensity`, `fogFalloffHeight`, `waterAbsorptionRed`, `waveAmplitude`, `shadowMapSize`. No cultivation metaphors in the API.

---

## 2. The rendering systems

### 2.1 Fog and Atmosphere System

**The problem:** Three.js's built-in fog is uniform density. Real atmosphere has height falloff — denser in valleys, thinner on ridges. Uniform fog flattens depth perception and looks fake.

**The implementation:** Patch Three.js's global fog shader chunks (`fog_pars_fragment`, `fog_fragment`) before any material compiles. Every material with `fog: true` inherits the height-based fog model. No per-material work.

**The model:**

```
fogFactor = exp(-density * heightFalloff * (cameraHeight - fragmentHeight))
fogFactor = clamp(fogFactor, 0, 1)
finalColor = mix(fogColor, fragmentColor, fogFactor)
```

Where:
- `density` — base fog density at sea level (tweakable: 0.0 to 0.1)
- `heightFalloff` — how quickly fog thins with altitude (tweakable: 0.0 to 0.01)
- `fogColor` — shifts with time of day (warm at dawn, gray at noon, cold at dusk)
- `cameraHeight` — the camera's Y position
- `fragmentHeight` — the fragment's world-space Y

**The tweak UI:**
- Density slider (0.0 – 0.1)
- Height falloff slider (0.0 – 0.01)
- Fog color picker (with time-of-day curve)
- Fog near/far distance (for artistic control)
- Export to `fog.json` preset

**Why it matters for the xianxia RPG:** The Cangli Riverlands has dawn mist in the paddies, river micro-fog, and the hill above Li Family Creek rising above the fog line. Height-based fog makes these distinct. When the player perceives qi for the first time, the fog's qi-residue should be visible through the fog system — a cross-modal layer on the same shader.

### 2.2 Water System (Beer-Lambert + Analytic Waves + Variance Roughness)

**The problem:** Flat-plane water with a normal map is the amateur approach. Real water has depth-dependent color (Beer-Lambert absorption), real surface geometry (wave displacement), and distance-dependent roughness (variance-driven reflections).

**The implementation:** A custom shader material with three integrated systems:

**A. Beer-Lambert absorption:**

Light passing through water is absorbed exponentially: `I = I₀ · e^(-α·d)` where `α` is the wavelength-dependent absorption coefficient and `d` is the water depth at the fragment. Different wavelengths absorb at different rates:

- Red (α_red ≈ 0.6/m) — absorbs fast, gone within ~2m
- Green (α_green ≈ 0.04/m) — absorbs slowly
- Blue (α_blue ≈ 0.01/m) — barely absorbs

This gives water its color gradient for free: shallow water shows all wavelengths (clear/green), deep water loses red then green (blue-dark). No hand-painted water color texture needed.

**Parameters (tweakable):**
- `absorptionRed`, `absorptionGreen`, `absorptionBlue` — per-wavelength coefficients
- `depthOffset` — the water body's base depth (river vs. paddy vs. well)
- `turbidity` — suspended particles (green algae in paddies, silt in the river)

**B. Analytic wave field:**

Vertices are displaced by a sum of directional Gerstner waves:

```
P.x += Σᵢ (amplitudeᵢ · directionᵢ.x · cos(dot(directionᵢ, P.xz) · frequencyᵢ + phaseᵢ + time · speedᵢ))
P.y += Σᵢ (amplitudeᵢ · sin(dot(directionᵢ, P.xz) · frequencyᵢ + phaseᵢ + time · speedᵢ))
```

The analytic slope (derivative of the wave function) gives the surface normal without finite differences:

```
N = normalize(cross(dP/du, dP/dv))
```

This is exact, fast, and artifact-free. No normal map sampling.

**Parameters (tweakable):**
- Per-wave: `amplitude`, `direction`, `frequency`, `speed`, `phase`
- `waveCount` — number of wave components (2-8)
- `choppiness` — horizontal displacement amount (steepness control)

**C. Variance-driven reflection roughness:**

The wave field's slope variance over a screen-space area drives the roughness:

```
variance = computeSlopeVariance(waveField, fragmentScreenArea)
roughness = clamp(variance * roughnessScale, minRoughness, maxRoughness)
```

Close waves have low variance (distinct facets, sharp reflections). Distant waves have high variance (averaged ripples, rough reflections). This happens automatically — no distance-based roughness hack.

**Parameters (tweakable):**
- `roughnessScale` — how strongly variance drives roughness
- `minRoughness`, `maxRoughness` — clamps
- `reflectionStrength` — overall reflection intensity

**The tweak UI:** A single "Water" panel with collapsible sections for Absorption, Waves, and Reflection. Every parameter is a slider. A "preset" dropdown lets you switch between River, Paddy, and Well configurations. Export to `water.json`.

**Why it matters:** The Cangli River is deep brown-blue with directional flow. The paddies are shallow green with wind ripples. The well is still, dark, nearly black. Each water body has its own preset. When the player draws water from the well, the bucket's interaction with the water surface uses the same wave field — the displacement from the bucket is a local wave source added to the ambient field.

### 2.3 Lighting System

Dawn light (warm, low angle, long shadows) — already implemented in the Phase 4 prototype. Extends to:

- **Time-of-day curve:** sun angle, color temperature, and intensity change with the solar term. Lichun (early spring) dawn is cold and blue; Mangzhong (grain in ear) noon is hot and white; Dongzhi (winter solstice) is dim and long-shadowed.
- **Shadow quality:** PCFSoftShadowMap (already on), with tweakable shadow map size, bias, and camera bounds.
- **Indirect lighting:** Hemisphere light for sky/ground bounce (already on), plus a future SSAO or GTAO pass for contact shadows.

**Tweak UI:** Time-of-day slider (0-24h), sun intensity, sun color temperature, ambient color, shadow map size, shadow bias. Export to `lighting.json`.

### 2.4 Material System

MeshStandardMaterial for PBR (already used). Extends to:

- **Custom shader materials** for qi effects (the perception layer's cross-modal visual: depth shift, chromatic shift, volumetric haze).
- **Material library:** named materials (earth, wall, roof, wood, stone, paper) with tweakable parameters (color, roughness, metalness, emissive).
- **Material variation:** per-instance color/roughness variation for instanced meshes (so 100 roof tiles don't look identical).

**Tweak UI:** Material editor with live preview sphere. Every PBR parameter is a slider. Save material as a named preset. Export to `materials.json`.

---

## 3. The simulation systems

### 3.1 NPC Simulator

Every NPC has a state machine (per document 07 §2). The simulator ticks all NPCs each frame, advancing their schedules, updating their locations, and processing their reactions to events. The simulator is deterministic — same seed + same inputs = same NPC behavior.

**Tweak UI:** NPC schedule editor. Visual timeline of an NPC's day. Drag activities to adjust times. Add/remove activities. See the NPC's current state in real-time. Export to `npc_schedules.json`.

### 3.2 Qi Perception Layer

The cross-modal perception system (per document 05 §1). When the player activates qi perception, the rendering pipeline adds a perception pass: depth-of-field shift, chromatic shift, volumetric haze, audio resonance. The perception has a stamina cost and is fallible (emotional state colors perception).

**Tweak UI:** Perception intensity, depth shift amount, chromatic shift color, haze density, stamina drain rate, fallibility threshold. Export to `qi_perception.json`.

### 3.3 Combat System (future)

The combat grammar (per document 03, the "verbs not numbers" test). Routing qi to hands/legs/sensory/resistance is a committed action with a stamina cost. Attacks are committed (no instant cancel). Defense costs qi. Reading residue costs attention.

**Tweak UI:** Frame data editor (startup, active, recovery frames per attack). Routing switch time. Reservoir drain rates. Stamina costs. Export to `combat.json`.

---

## 4. The editor surfaces

### 4.1 The Tweak Panel

A unified, collapsible panel (dat.GUI-style or custom) that appears in dev mode. Organized by system: Fog, Water, Lighting, Materials, NPCs, Qi Perception, Combat. Every parameter is a named control with min/max/default. Changes apply in real-time. A "Save Preset" button exports the current values to a JSON file.

**The export format:**

```json
{
  "fog": { "density": 0.035, "heightFalloff": 0.0042, ... },
  "water": { "absorptionRed": 0.6, "waveAmplitude": 0.15, ... },
  "lighting": { "timeOfDay": 6.5, "sunIntensity": 1.2, ... }
}
```

The engine loads this file on startup. In production, the file is bundled. In dev, it is hot-reloaded.

### 4.2 The Scene Inspector

A tree view of the current scene graph. Click any object to see its transform, materials, and components. Select an NPC to see their schedule, state, and relationships. Select a paddy to see its ownership, crop state, and water level.

### 4.3 The Asset Browser

A panel listing all loaded assets (glTF models, textures, materials). Each asset shows its hash, size, and reference count. Click an asset to preview it in isolation. This is the runtime view of the asset pipeline's output.

---

## 5. The asset pipeline (the engine's build process)

### 5.1 Creation

Assets are created in Blender (open-source, Python-scriptable for procedural generation). The engine's build system calls Blender headlessly to:
- Export models to glTF
- Bake lightmaps and AO
- Generate LOD meshes
- Pack textures into atlases

### 5.2 Processing

The build system runs glTF-Transform on every exported glTF:
- weld (merge duplicate vertices)
- dedup (remove duplicate materials/meshes)
- quantize (compress vertex positions to 16-bit)
- meshopt-compress (encode index/vertex buffers)
- KTX2-reencode (compress textures to Basis Universal)
- precompute BVH (bake spatial acceleration into a custom extension)

Output: one `.glb` per asset, with a content-addressed hash (SHA-256 of the file bytes).

### 5.3 Serving

The engine loads assets by hash from OPFS (if available) or fetches them over HTTP and caches. The asset manifest maps logical names ("wang_family_house") to hashes. When an asset changes, its hash changes, and the engine fetches the new version.

### 5.4 Runtime

The engine's SceneManager loads glTF files via GLTFLoader, applies the meshoptimizer WASM decoder and KTX2Loader for decompression, and registers meshes in the scene graph. InstancedMesh is used for repeated assets (roof tiles, wall segments, NPC crowds). BatchedMesh is reserved for WebGL2-only until WebGPU BatchedMesh lands (per document 08, Gap 4).

---

## 6. The determinism contract

Every system in the engine must obey the determinism contract:

- **No `Math.random()`.** Use the engine's RNG (xoshiro256\*\*).
- **No `Math.sin()`/`Math.cos()`/`Math.exp()`/`Math.log()`.** Use `det_sin`/`det_cos`/`det_exp`/`det_log`.
- **No `Date.now()` or `performance.now()` in simulation logic.** These are for profiling only.
- **No non-deterministic serialization.** Use the engine's CBOR encoder.
- **Every state change is hashable.** The engine can snapshot and hash its state at any tick.

The engine enforces this via a lint rule and a runtime check: if any system calls a forbidden function, the engine throws in dev mode.

---

## 7. What this document enables

This document specifies the engine as one integrated framework. The next steps:

1. **Implement the Fog System** (§2.1) with the global shader chunk patch and tweak UI
2. **Implement the Water System** (§2.2) with Beer-Lambert, analytic waves, and variance roughness
3. **Build the Tweak Panel** (§4.1) as the engine's editor surface
4. **Wire the determinism contract** (§6) into every system
5. **Set up the asset pipeline** (§5) with glTF-Transform + meshoptimizer + KTX2

Each step is provable: the Fog System renders correctly with height falloff, the Water System renders correctly with depth-dependent color and real waves, the Tweak Panel exports a JSON preset that the engine loads as defaults.

The four rendering techniques the user described are not "nice to have." They are the engine's first four systems. The tweak-panel workflow is not a feature. It is the engine's core design principle.
