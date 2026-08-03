# 18 — VFX & Technique Presentation

**Status:** Composable VFX framework. Technique presentation recipes. The separation between authoritative gameplay effects and cosmetic visual presentation. Deterministic gameplay anchors with nondeterministic cosmetic variation.
**Date:** 2026-08-03
**Engine:** Grand Architect (browser-native plugin host, deterministic contract)
**Depends on:** `ga:determinism` (canonical TechniqueAnchor; non-canonical cosmeticSeed), `13_RENDERER_ABSTRACTION` (pass graph, BackendCapabilities), `15_MATERIALS_LIGHTING_POSTPROCESSING §1.3` (ga:dissolve, ga:qi-residue material overrides), `17_ANIMATION_FRAMEWORK_RETARGETING §11` (animation events as VFX triggers), `16_ASSET_REGISTRY_IMPORT_PIPELINE` (VFX recipes + components loaded by hash)
**Read with:** `13_COMBAT_GRAMMAR` (technique framework, hit-stop, cancel windows), `15_PRECELESTIAL_AND_TRIBULATION` (technique spectacle tiers — tribulation-class VFX), `32_POWER_SCALING_AND_PHASE_COMBAT` (scale tiers map to cultivation stage)

---

## 0. What this document is

This document specifies the engine's VFX framework and how techniques (cultivation abilities — fireball, sword-qi, healing talisman, etc.) are presented visually. The central design principle is the **separation of concerns**: the simulation's authoritative gameplay effect (apply 120 fire damage in a 6m cone) is decoupled from the visual presentation (flames, heat distortion, sparks, camera shake, scorch mark). The same gameplay effect can be presented by many different VFX recipes; the same VFX recipe can present many different gameplay effects. The gameplay is canonical; the visuals are cosmetic.

The framework is **composable**: a technique's presentation is a recipe of VFX components, each independently authored and reusable. A new technique is assembled by picking components, not by writing a monolithic shader.

---

## 1. The separation (gameplay vs. presentation)

```
   ┌────────────────────────────────────────────────────────────────┐
   │                  TECHNIQUE (gameplay authoritative)              │
   │  technique.fireball.tier_1                                      │
   │  - damage: 120 fire                                             │
   │  - damageType: 'fire'                                           │
   │  - area: cone, range 8m, half-angle 30°                         │
   │  - castTime: 600ms                                              │
   │  - cooldown: 4000ms                                             │
   │  - qiCost: 30                                                   │
   │  - cancelable: true (during cast, not during release)           │
   │  - deterministic ID: hash(technique_spec)                       │
   └────────────────────────────┬───────────────────────────────────┘
                                │
                  spawnPresentation(spec, anchor)
                                │
                                ▼
   ┌────────────────────────────────────────────────────────────────┐
   │              PRESENTATION RECIPE (cosmetic, nondeterministic)   │
   │  recipe: fireball_default                                       │
   │  - cast pose: combat.sword.cast (animation event: 'vfx-spawn')  │
   │  - body aura: ga:aura/fire_t1                                   │
   │  - origin socket: hand_R                                        │
   │  - delivery geometry: sphere, 0.2m, emissive fire              │
   │  - projectile: ballistic to target, 12m/s, 0.4s travel          │
   │  - trail: ribbon, 0.15m width, fire gradient, 0.3s fade         │
   │  - environmental field: heat distortion, 4m radius, 0.6s        │
   │  - target impact: burst particles (40), scorch decal            │
   │  - terrain response: scorch mark decal, 1.5m, 8s decay          │
   │  - camera response: shake 0.3 amplitude, 200ms                  │
   │  - audio: cast_whoosh, projectile_loop, impact_boom             │
   │  - aftermath: embers (8 particles, 2s), scorch decal persists   │
   └────────────────────────────────────────────────────────────────┘
```

The recipe is **nondeterministic**: particle seeds, audio pitch jitter, scorch decal rotation are randomized per-cast (using the deterministic RNG, but seeded from a non-canonical source so two casts of the same technique look slightly different without affecting the canonical simulation state). The gameplay effect (damage, area, timing) is **deterministic**: two casts at the same tick with the same parameters produce the same damage.

---

## 2. Technique presentation recipes

A recipe is a list of VFX component instances, each with its parameters, anchored to gameplay events (cast start, cast release, impact, aftermath).

```typescript
interface TechniqueRecipe {
  id: string;                    // 'fireball_default', 'sword_qi_slash_default'
  techniqueId: string;           // the gameplay technique this presents
  scaleTier: ScaleTier;          // see §7
  qualityTier: QualityTier;      // see §8
  /// Anchored events; each spawns a set of components.
  stages: RecipeStage[];
}

interface RecipeStage {
  /// When this stage's components spawn.
  trigger: RecipeTrigger;
  /// Components to spawn at this stage.
  components: VfxComponentInstance[];
}

type RecipeTrigger =
  | { kind: 'cast-start'; offsetMs: number }
  | { kind: 'cast-release'; offsetMs: number }
  | { kind: 'animation-event'; eventName: string; bone?: string }
  | { kind: 'projectile-impact' }
  | { kind: 'area-apply' }       // when the gameplay area effect applies
  | { kind: 'aftermath'; delayMs: number };

interface VfxComponentInstance {
  componentId: string;           // references the VFX component registry
  params: Record<string, UniformValue>;
  /// Anchored to a bone socket or world position.
  socket?: string;               // 'hand_R', 'sword_tip', 'target_impact'
  /// Lifetime; 0 = one-shot, >0 = duration.
  lifetimeMs: number;
}
```

### The standard recipe stages

A technique's presentation is a sequence of stages, each spawning components:

1. **Cast pose** — the character's animation (`combat.cast.fireball`).
2. **Body aura** — qi-glow on the caster during cast (an emissive material override).
3. **Origin socket** — where the delivery geometry spawns (hand, sword tip, mouth).
4. **Delivery geometry** — the visual projectile or beam or cone that travels to the target.
5. **Projectile / trail** — the in-flight visual.
6. **Environmental field** — heat distortion, qi pressure, light bloom in the area around the projectile's path.
7. **Target impact** — burst particles, flash, decal at the impact point.
8. **Terrain response** — scorch mark, frost patch, spirit-grass growth on the affected terrain.
9. **Camera response** — shake, brief zoom, look-at target during impact.
10. **Audio** — cast whoosh, projectile loop, impact boom, aftermath crackle.
11. **Aftermath** — lingering embers, residual aura, dissipating particles.

Not every recipe uses every stage. A subtle technique (qi-perception ping) might use only stages 1, 3, 4, 7, 10. A dramatic technique (Heavenly Tribulation lightning strike) uses all 11, scaled to tier-3 magnitude.

---

## 3. VFX components

The component registry. Each component is an independently authored, reusable VFX primitive. A recipe references components by ID.

```typescript
interface VfxComponent {
  id: string;                    // 'gpu-particles-burst', 'ribbon-trail', 'beam-line', ...
  kind: VfxComponentKind;
  tslGraph?: TslGraphFactory;    // for shader-based components
  params: Record<string, UniformValue>;
  /// Memory + CPU/GPU cost estimate (used for quality-tier scaling).
  cost: VfxCost;
}

type VfxComponentKind =
  | 'gpu-particles'              // WebGPU compute particles (or CPU fallback on WebGL2)
  | 'mesh-particles'             // mesh-based particles (sparks, debris)
  | 'ribbon'                     // trail ribbon (sword trails, projectile trails)
  | 'beam'                       // beam line (lightning, sustained qi beams)
  | 'decal'                      // surface decal (scorch, frost, blood)
  | 'screen-space-effect'        // full-screen effect (flash, vignette punch)
  | 'material-override'          // temporary material override on a mesh (aura, dissolve)
  | 'dissolve'                   // noise-driven alpha dissolve
  | 'displacement'               // mesh displacement (impact dent, qi pressure wave)
  | 'distortion'                 // heat distortion, qi shimmer
  | 'lightning-graph'            // branching lightning bolts
  | 'volumetric-shape'           // volumetric cone, sphere, cylinder
  | 'procedural-glyph'           // glowing talisman/glyph drawing
  | 'domain-field'               // scalar/vector field visualizer (qi density, contamination)
  | 'audio-oneshot'              // play an audio clip
  | 'audio-loop'                 // loop an audio clip with fade
  | 'camera-shake'               // apply a shake to the camera
  | 'camera-impulse'             // brief zoom or look-at
  ;

interface VfxCost {
  cpuMs: number;                 // per-frame CPU cost
  gpuMs: number;                 // per-frame GPU cost
  memoryBytes: number;           // GPU memory
  particleCount?: number;        // for particle-based
}
```

### 3.1 GPU particles

WebGPU compute-shader-driven particles. Spawned in bursts (impact) or streams (trail). Each particle has position, velocity, lifetime, size, color; the compute shader integrates and emits vertices. Capped by capability (10k active particles on WebGPU; 1k on WebGL2 fallback via CPU vertex buffer).

```typescript
const gpuParticleBurst: VfxComponent = {
  id: 'gpu-particles-burst',
  kind: 'gpu-particles',
  tslGraph: gpuParticleBurstTsl,
  params: {
    count:        { type: 'int', value: 40, min: 1, max: 500 },
    position:     { type: 'vec3', value: [0, 0, 0] },
    velocity:     { type: 'vec3', value: [0, 1, 0] },
    spread:       { type: 'float', value: 1.0, min: 0, max: 4 },  // cone half-angle (radians)
    speed:        { type: 'float', value: 4.0, min: 0.1, max: 20 },
    lifetime:     { type: 'float', value: 0.6, min: 0.1, max: 4 },
    size:         { type: 'float', value: 0.1, min: 0.01, max: 1 },
    color:        { type: 'color', value: [1, 0.6, 0.2] },
    colorFade:    { type: 'color', value: [0.4, 0.0, 0.0] },
    gravity:      { type: 'float', value: 2.0 },
    drag:         { type: 'float', value: 0.5 },
  },
  cost: { cpuMs: 0.1, gpuMs: 0.4, memoryBytes: 256 * 1024, particleCount: 40 },
};
```

### 3.2 Ribbons

A ribbon is a camera-facing strip that follows a moving point, leaving a trail. Used for sword trails, projectile trails, qi-stream arcs. Built from a ring buffer of past positions; the shader triangulates between consecutive samples.

### 3.3 Beams

A beam is a straight (or lightning-graph-branched) line between two points, rendered with additive glow and (optionally) distortion. Used for sustained qi beams, lightning strikes, talisman-tether lines.

### 3.4 Decals

Surface decals are projected textures onto the world geometry. Used for scorch marks, frost patches, blood splatter, spirit-grass growth. Decals persist for a duration (or until cleaned); they are not part of the deterministic simulation state.

### 3.5 Material overrides

A temporary override on a mesh's material. Used for: body aura (emissive boost on the cultivator's body during a cast), dissolve (alpha dissolve on death or teleport), qi-infusion (tint shift on a weapon during a technique).

### 3.6 Lightning graphs

Procedurally-generated branching lightning. The graph is generated at spawn time (deterministic seed → deterministic shape, but the seed is non-canonical so two casts look different). Rendered as beams with additive bloom.

### 3.7 Volumetric shapes

Volumetric cones (for breath weapons), spheres (for explosions), cylinders (for area techniques). Rendered via raymarched SDFs in a screen-space post pass. Expensive; quality-tier scaling required.

### 3.8 Procedural glyphs

Talisman/glyph drawing — a 2D stroke path that draws itself over time, glowing, then dissipates. Used for technique activation, sealing talismans, formation-array nodes. Authored as SVG-like stroke paths in TSL.

### 3.9 Domain fields

Visualizes a scalar or vector field: qi density, contamination spread, formation-array influence. Rendered as a colored volume or as flowing particles along the field's gradient.

---

## 4. The technique spawn contract

```typescript
interface VfxDirector {
  /// The simulation calls this when a technique is cast.
  /// `anchor` carries the canonical gameplay facts: caster, target, area, timing.
  spawnPresentation(recipe: TechniqueRecipe, anchor: TechniqueAnchor): PresentationHandle;
  /// Cancel an in-flight presentation (e.g. technique interrupted).
  cancel(handle: PresentationHandle, fadeOutMs: number): void;
  /// Per-frame update; called from the render thread.
  update(dt: number): void;
}

interface TechniqueAnchor {
  /// The deterministic gameplay facts.
  techniqueId: string;
  casterEntity: number;
  targetEntity?: number;
  targetPosition?: Vec3;
  areaShape?: AreaShape;          // cone, sphere, cylinder
  /// Deterministic tick at cast start. Used for canonical event ordering.
  castStartTick: number;
  /// The technique's gameplay timing — VFX timing derives from this.
  castTimeMs: number;
  releaseTimeMs: number;
  impactTimeMs: number;
  /// Non-canonical RNG seed. Two casts of the same technique get different seeds.
  cosmeticSeed: number;
}

interface PresentationHandle {
  id: number;
  /// Subscribe to gameplay-driven updates (e.g. projectile position).
  onAnchorUpdate(handler: (anchor: TechniqueAnchor) => void): void;
}
```

The `cosmeticSeed` is **non-canonical** — it's generated from a separate RNG stream that is NOT part of the save state. Two saves loaded with the same canonical state may produce different particle shapes. This is intentional: the visual identity of a technique is its gameplay effect (deterministic), not its particle shapes (cosmetic).

---

## 5. The recipe → component binding

```typescript
const fireballRecipe: TechniqueRecipe = {
  id: 'fireball_default',
  techniqueId: 'technique.fireball.tier_1',
  scaleTier: 'tier-1',
  qualityTier: 'high',
  stages: [
    {
      trigger: { kind: 'cast-start', offsetMs: 0 },
      components: [
        { componentId: 'material-override-aura', params: { color: [1, 0.5, 0.2], intensity: 0.6 }, socket: 'caster_body', lifetimeMs: 600 },
        { componentId: 'audio-oneshot', params: { clip: 'cast/fireball_whoosh', pitch: 1.0 }, lifetimeMs: 0 },
      ],
    },
    {
      trigger: { kind: 'animation-event', eventName: 'vfx-spawn', bone: 'hand_R' },
      components: [
        { componentId: 'mesh-particles-spark', params: { count: 12, color: [1, 0.7, 0.3] }, socket: 'hand_R', lifetimeMs: 200 },
      ],
    },
    {
      trigger: { kind: 'cast-release', offsetMs: 0 },
      components: [
        { componentId: 'mesh-particle-projectile', params: { mesh: 'fireball_sphere', speed: 12 }, socket: 'hand_R', lifetimeMs: 700 },
        { componentId: 'ribbon-trail', params: { width: 0.15, color: [1, 0.6, 0.2] }, socket: 'projectile', lifetimeMs: 700 },
        { componentId: 'distortion-field', params: { radius: 1.5 }, socket: 'projectile', lifetimeMs: 700 },
        { componentId: 'audio-loop', params: { clip: 'cast/fireball_loop', fadeMs: 100 }, socket: 'projectile', lifetimeMs: 700 },
      ],
    },
    {
      trigger: { kind: 'projectile-impact' },
      components: [
        { componentId: 'gpu-particles-burst', params: { count: 40, color: [1, 0.6, 0.2] }, socket: 'impact', lifetimeMs: 800 },
        { componentId: 'screen-space-flash', params: { intensity: 0.4, color: [1, 0.7, 0.3] }, lifetimeMs: 150 },
        { componentId: 'camera-shake', params: { amplitude: 0.3, durationMs: 200 }, lifetimeMs: 200 },
        { componentId: 'audio-oneshot', params: { clip: 'impact/fireball_boom', pitch: 1.0 }, lifetimeMs: 0 },
      ],
    },
    {
      trigger: { kind: 'terrain-response' },
      components: [
        { componentId: 'decal-scorch', params: { size: 1.5, decaySec: 8 }, socket: 'impact', lifetimeMs: 8000 },
      ],
    },
    {
      trigger: { kind: 'aftermath', delayMs: 200 },
      components: [
        { componentId: 'gpu-particles-burst', params: { count: 8, speed: 1.0, lifetime: 2.0, color: [1, 0.4, 0.1] }, socket: 'impact', lifetimeMs: 2000 },
      ],
    },
  ],
};
```

This recipe is data. A designer edits it in the VFX editor (a node-graph UI, planned); the engine loads it by hash (asset system, document 16); the `VfxDirector` interprets it at runtime.

---

## 6. Deterministic gameplay, nondeterministic cosmetic

The cardinal rule. Two casts of `technique.fireball.tier_1` at the same tick, with the same caster, same target, same parameters, must produce:
- **Identical** damage (120 fire).
- **Identical** area (6m cone).
- **Identical** timing (cast 600ms, release, impact at 1300ms).
- **Identical** cooldown (4000ms).
- **Different** particle shapes, audio pitch jitter, scorch decal rotation, ember count (within bounds).

The gameplay facts are derived from the canonical simulation state. The cosmetic variation is derived from the `cosmeticSeed`, which is generated from a non-canonical RNG stream.

```typescript
// In the simulation (canonical):
const damage = technique.damage;          // 120 — deterministic
const impactTick = castStartTick + Math.floor((castTimeMs + travelTimeMs) / tickMs); // deterministic

// In the presentation (non-canonical):
const particleSeed = cosmeticRng.next();  // non-canonical
const audioPitch = 1.0 + (cosmeticRng.next() - 0.5) * 0.05;  // ±2.5% pitch
const decalRotation = cosmeticRng.next() * Math.PI * 2;        // random rotation
```

### Why this matters

1. **Save parity.** A save loaded against a different build (different particle shaders, different audio files) still has the same canonical state. The visuals differ; the gameplay is identical.
2. **Competitive integrity.** (Not relevant to a single-player RPG, but the principle holds.) The visual variation cannot affect combat outcomes.
3. **Visual richness.** Two casts of the same fireball look slightly different — particle shapes vary, scorch decals don't always face the same way. This is what makes a technique feel alive rather than mechanical.
4. **Performance budgeting.** Cosmetic variation can be reduced at low quality (fewer particles, no audio jitter) without affecting gameplay.

---

## 7. Scale tiers

A technique exists at multiple scales. A Foundation Establishment cultivator's fireball is small. A Nascent Soul cultivator's fireball is larger. A Mahayana-stage Heavenly Tribulation is continent-scale.

```typescript
type ScaleTier = 'tier-0' | 'tier-1' | 'tier-2' | 'tier-3' | 'tier-4';

interface ScaleTierProfile {
  /// Multiplier on particle counts.
  particleCountScale: number;
  /// Multiplier on area sizes (visual, not gameplay).
  areaVisualScale: number;
  /// Multiplier on durations (cosmetic; gameplay timing unaffected).
  durationScale: number;
  /// Camera shake intensity.
  cameraShakeScale: number;
  /// Audio loudness.
  audioLoudnessScale: number;
}
```

| Tier | Stage | Particle count | Visual area | Camera shake | Notes |
|---|---|---|---|---|---|
| tier-0 | Mortal (no cultivation) | 0.25× | 0.5× | 0.1× | Mortals can't cast techniques; this is for fakes/trinkets |
| tier-1 | Qi Condensation | 1× | 1× | 1× | The default; player's first techniques |
| tier-2 | Foundation Establishment | 2× | 1.5× | 1.5× | Noticeably more dramatic |
| tier-3 | Nascent Soul | 4× | 2.5× | 2.5× | Significant spectacle |
| tier-4 | Mahayana+ | 8× | 5× | 4× | Continent-scale; tribulation-class |

A technique's recipe specifies its tier; the director scales the components accordingly. A tier-4 fireball uses the same recipe as tier-1, just bigger.

---

## 8. Quality tiers

Independent of scale tier. Quality is determined by the backend's capabilities and the user's quality setting (low/medium/high/cinematic).

```typescript
type QualityTier = 'low' | 'medium' | 'high' | 'cinematic';

interface QualityTierProfile {
  /// Cap on active particles per technique.
  particleCap: number;
  /// Disable expensive components.
  disabledComponents: VfxComponentKind[];
  /// Volumetric resolution.
  volumetricSteps: number;
  /// Distortion enabled?
  distortion: boolean;
  /// Audio polyphony cap.
  audioPolyphony: number;
}
```

| Quality | Particles | Disabled | Volumetric | Distortion | Notes |
|---|---|---|---|---|---|
| low | 100 | volumetric-shape, domain-field, procedural-glyph | 0 (off) | off | Mobile fallback; WebGL2 |
| medium | 500 | volumetric-shape | 16 | on | Default desktop |
| high | 2000 | (none) | 32 | on | High-end desktop |
| cinematic | 10000 | (none) | 64 | on | Cutscenes only |

The director queries `backend.capabilities()` and the user setting; picks the quality tier; scales recipes accordingly. A tier-4 technique at low quality still plays (gameplay intact) but visually it's a spark where it should be a conflagration.

---

## 9. The 16 questions

**Q1. What problem does this system solve?**
Presenting techniques (cultivation abilities) with the visual richness the xianxia genre demands, composable from reusable VFX components, scaled by cultivator stage and quality setting, while keeping the authoritative gameplay effect deterministic and decoupled from the cosmetic presentation.

**Q2. What is the public interface?**
`TechniqueRecipe` (§2), `VfxComponent` (§3), `VfxDirector` (§4), `TechniqueAnchor` (§4), `ScaleTier` (§7), `QualityTier` (§8).

**Q3. What is the internal architecture?**
The `VfxDirector` runs on the renderer worker. It owns the active presentations, the component registry, and the quality/scale tier config. Per frame: update each presentation (advance particles, sample audio, decay decals), cull offscreen presentations, render via the pass graph (document 13 §3 — VFX passes registered by the `ga:vfx` plugin).

**Q4. What is the data flow?**
Simulation casts technique → `VfxDirector.spawnPresentation(recipe, anchor)` → recipe's stages spawn components at triggered times → components update per frame → components render via pass graph → components expire → presentation handle released.

**Q5. What is the lifecycle?**
Cast start: `spawnPresentation` returns a handle. Per frame: components update, expire. Impact: projectile-impact stage spawns impact components. Aftermath: lingering components decay over seconds. Cast cancel: `cancel(handle, fadeOutMs)` triggers fast fade-out.

**Q6. What is the failure model?**
- Component not in registry: skipped; logged.
- GPU particle buffer overflow: cap particle count; drop new spawns; log.
- Audio clip missing: silence; logged.
- Recipe malformed (missing stage): skip the stage; logged.
- Capability insufficient (e.g. volumetric on WebGL2): component disabled; the presentation plays without it.
- Too many active presentations: drop the oldest low-priority; log.

**Q7. What are the invariants?**
- The gameplay effect is canonical; the visual presentation is not.
- Two casts with the same anchor produce the same gameplay; their cosmetics differ.
- A recipe is data; the engine loads it by hash (document 16).
- Cancel always fades; never hard-cuts (hard-cuts are jarring).
- Quality-tier reduction never affects gameplay.

**Q8. What is the performance budget?**
- Per-presentation update: <0.2 ms (LOD-scaled).
- GPU particle simulation: <2 ms for 10k particles.
- Volumetric shapes: <3 ms each (capped at 2 active simultaneously).
- Decal projection: <0.5 ms for 50 active decals.
- Total VFX budget: <6 ms per frame at high quality; <2 ms at low.

**Q9. What is the determinism contract?**
- The `TechniqueAnchor` is canonical: caster, target, area, timing — all derived from simulation state.
- The `cosmeticSeed` is non-canonical: generated from a separate RNG stream, NOT in save state.
- Component parameters that affect gameplay (none — VFX has no gameplay effect) are not part of the canonical state.
- Two runs with the same canonical state produce the same gameplay; cosmetics may differ.

**Q10. What is the threading/concurrency model?**
The `VfxDirector` runs on the renderer worker. It receives spawn requests via `postMessage` from the simulation thread. The `TechniqueAnchor` is sent as a transferable struct. Updates happen on the renderer thread; the simulation is not blocked.

**Q11. How is it serialized?**
- Recipes are assets (JSON, loaded by hash from the asset system, document 16).
- Active presentations are NOT serialized — they're cosmetic, ephemeral. On load, in-flight techniques are not resumed (the canonical state includes the technique's effect, not its visual).
- The cosmetic RNG state is NOT serialized.

**Q12. How is it debugged?**
- The VFX inspector: list active presentations, their components, particle counts, GPU time.
- The recipe editor: edit a recipe in real-time, see changes in the engine (planned).
- Component preview: spawn a component in isolation, scrub params.
- Anchor visualizer: see the canonical anchor (caster, target, area) overlaid on the scene.

**Q13. How is it tested?**
- Component contract tests: every component spawns, updates, expires without error.
- Recipe validation: every recipe in the registry references valid components; no missing sockets.
- Anchor determinism: same anchor → same gameplay (verified by the combat grammar tests).
- Cosmetic non-determinism: same anchor, different cosmeticSeed → different particle positions (verified by hash diff).
- Quality tier scaling: a recipe at low quality produces fewer particles than at high; gameplay unchanged.

**Q14. What alternatives were rejected?**
- *Monolithic technique shaders.* Rejected: every technique is a separate shader; no reuse; maintenance nightmare. Composable components are the standard approach (Niagara, VFX Graph, Unity HDRP).
- *Gameplay tied to VFX (e.g. damage = particle count).* Rejected: violates the separation principle. Damage is canonical; particles are cosmetic.
- *Deterministic cosmetics.* Rejected: two casts of the same fireball looking identical is mechanical, not cinematic. The cosmetic RNG gives variation without affecting gameplay.
- *No quality tiers.* Rejected: WebGL2 and mobile cannot run high-quality VFX. The engine must degrade gracefully.
- *No scale tiers.* Rejected: a Mahayana tribulation and a Qi Condensation spark cannot use the same particle count. Scale tiers encode the spectacle curve.
- *VFX as part of the simulation.* Rejected: the simulation must run headless at high speed (century tests). VFX is renderer-only and skipped in headless mode.

**Q15. What are the known limitations?**
- GPU compute particles are WebGPU-only; WebGL2 falls back to CPU vertex buffers (capped at 1k).
- Volumetric shapes are expensive; capped at 2 active simultaneously.
- Procedural glyphs are 2D-only (cannot wrap to 3D surfaces, planned).
- Decals on dynamic geometry (skinned meshes) are not supported (planned).
- Audio polyphony on WebGL2 is lower; some techniques' audio will be cut at low quality.
- iOS Safari's WebGPU particle compute has driver bugs; mitigation is CPU fallback.

**Q16. What does this enable next?**
- Techniques (cultivation abilities) are presented at the spectacle the genre demands, composable from reusable parts.
- The combat grammar (document 13) drives VFX via animation events (`vfx-spawn` at `hand_R` for the fireball release).
- The animation framework (document 17) provides the cast pose and the timing anchors.
- The material system (document 15) provides `ga:dissolve`, `ga:qi-residue` for VFX material overrides.
- Cultivation stage (Foundation Establishment vs Mahayana) is visually distinct — scale tiers encode it.
- Quality tiers mean the same technique plays on every device, from a 4K desktop to a 5-year-old phone.

---

## 10. Failure cases (catalogue)

| Failure | Detection | Recovery |
|---|---|---|
| Component not in registry | `VfxComponent.get` returns undefined | Skip the component; log; continue presentation |
| Recipe references missing socket | Socket lookup fails on the caster | Skip the component; log |
| GPU particle buffer overflow | Allocation throws | Cap active particles; drop new spawns; log |
| Audio clip missing (404) | Asset system returns placeholder | Use silence; log |
| Too many active presentations | Count > cap (e.g. 64) | Drop oldest low-priority; log |
| Capability insufficient (volumetric on WebGL2) | `capabilities()` check | Disable component; presentation continues without it |
| Recipe malformed (JSON parse error) | Recipe asset loader throws | Use default recipe for that technique; log |
| Cosmetic RNG exhausted (cosmeticSeed reused) | RNG wrap | Acceptable; visual repetition at extreme counts |
| Presentation handle used after cancel | Handle invalid | No-op; log in dev |

---

## 11. Rejected alternatives (detail)

### 11.1 "Monolithic technique shaders"

The argument: one shader per technique; full control.

The rejection: the engine will have hundreds of techniques. Hundreds of monolithic shaders is unmaintainable. Composable components (the standard approach since Niagara and VFX Graph) give reuse: the same `gpu-particles-burst` component is in 50 techniques; tweaking it once tweaks all 50.

### 11.2 "Gameplay tied to VFX"

The argument: the fireball's particle count could scale with damage; visual feedback matches gameplay.

The rejection: this violates the separation. The fireball's damage is canonical (deterministic); the particle count is cosmetic (varies by quality tier, scale tier, cosmetic seed). Tying them means: low quality reduces damage (unacceptable), or Mahayana fireballs cannot be rendered (unacceptable). The separation keeps both gameplay integrity and visual flexibility.

### 11.3 "Deterministic cosmetics"

The argument: deterministic everything is simpler.

The rejection: two casts of the same fireball, pixel-identical, is mechanical. The genre demands spectacle, and spectacle includes variation. The cosmetic RNG stream gives variation without affecting the canonical state. The separation is the design.

### 11.4 "VFX as part of the simulation"

The argument: simpler architecture; one system.

The rejection: the simulation must run headless at high speed (century tests, document 17 §3.1). VFX is renderer-only; including it in the simulation would block headless runs. The separation lets the simulation run with zero VFX cost.

---

## 12. What this document enables

1. Techniques (cultivation abilities) are presented at the spectacle the xianxia genre demands, composable from reusable parts.
2. The combat grammar (document 13) drives VFX via animation events; the animation framework (document 17) provides timing anchors.
3. The material system (document 15) provides `ga:dissolve`, `ga:qi-residue` for VFX material overrides.
4. Cultivation stage is visually distinct: scale tiers encode the difference between a Qi Condensation spark and a Mahayana conflagration.
5. Quality tiers mean the same technique plays on every device — from a 4K desktop to a 5-year-old phone — with gameplay intact.
6. The separation principle (canonical gameplay, cosmetic visuals) is what makes save parity possible across builds with different VFX assets.
7. A designer authors a new technique by assembling a recipe from existing components — no shader writing, no recompile. The recipe is data, loaded by hash.

The visual layer is now composable, scalable, and decoupled. The simulation says "120 fire damage in a 6m cone." The VFX director says "flames, distortion, scorch, shake, boom." Two systems, one technique, zero coupling.
