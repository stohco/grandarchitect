# 17 — Animation Framework & Retargeting

**Status:** Engine animation layer above Three.js AnimationMixer. Semantic clip naming, skeleton standards, state graphs, blend trees, additive layers, masks, root motion, motion warping, IK, hit-stop, cancel windows, animation events, retargeting, LOD, pose caching, procedural overlays.
**Date:** 2026-08-03
**Engine:** Grand Architect (browser-native plugin host, deterministic contract)
**Depends on:** `ga:determinism` (canonical pose data; AnimationController state is canonical), `13_RENDERER_ABSTRACTION` (renderer worker, SharedArrayBuffer for pose upload), `16_ASSET_REGISTRY_IMPORT_PIPELINE §2` (SkeletonProfile, animation-clip asset type loaded by hash), `09_ENTITY_RUNTIME_STATE_ARCHITECTURE` (entity animation state)
**Read with:** `13_COMBAT_GRAMMAR` (cancel windows, hit-stop, hit-frame events), `11_ENGINE_DESIGN §1.2` (real-time tweakables), `08_THREEJS_REPOSITORY_RESEARCH §5` (retargeting-threejs, three.js SkeletonUtils)

---

## 0. What this document is

This document specifies the engine's animation framework. It sits above Three.js's `AnimationMixer` (used internally for clip sampling and interpolation) and below the simulation's combat, locomotion, and behavior systems. The framework provides: semantic clip naming, skeleton standards across creature types, animation state graphs with blend trees, additive layers and body masks, root motion, motion warping, IK, hit-stop and cancel windows (the combat grammar's animation side), animation events, retargeting, animation LOD, pose caching, and procedural overlays.

The simulation drives animation through this framework. Three.js's `AnimationMixer` is an implementation detail, hidden behind engine interfaces.

---

## 1. The layer above AnimationMixer

Three.js's `AnimationMixer` is a clip player. It samples a clip at time T, applies the sampled pose to a `SkinnedMesh`'s skeleton, and that's it. The engine needs more: state graphs, blend trees, additive layers, masks, root motion, IK, procedural overlays, retargeting. These live in the engine's `AnimationController`, which owns an `AnimationMixer` internally.

```
   Simulation (combat, locomotion, behavior)
        │
        │  anim.setState('combat.sword.light.01')
        │  anim.setParam('speed', 4.2)
        │  anim.setParam('aim', vec3)
        ▼
   AnimationController (engine-owned)
   - StateGraph (current state, transitions, blend trees)
   - Additive layers (breathing, injury, aura)
   - Body masks (upper, lower, arm-only)
   - Root motion extraction
   - Motion warping
   - IK solvers (foot, hand, terrain)
   - Procedural overlays
   - Pose cache
        │
        │  pose = stateGraph.sample(dt)
        │  pose = applyAdditives(pose, additiveLayers)
        │  pose = applyMasks(pose, masks)
        │  pose = applyIK(pose, ikTargets)
        │  pose = applyProcedural(pose, overlays)
        ▼
   AnimationMixer (Three.js, hidden)
   - clip sampling
   - interpolation
        │
        ▼
   SkinnedMesh (Three.js)
```

```typescript
interface AnimationController {
  setState(clipName: string, opts?: TransitionOpts): void;
  getState(): string;
  setParam(name: string, value: number | Vec3): number | Vec3;
  getParam(name: string): number | Vec3;
  playAdditive(layerName: string, clipName: string, weight: number, mask?: BodyMask): void;
  setAdditiveWeight(layerName: string, weight: number): void;
  setIkTarget(name: string, target: IkTarget): void;
  setProceduralOverlay(name: string, overlay: ProceduralOverlay): void;
  setRootMotionMode(mode: 'extract' | 'lock'): void;
  warpTo(target: Vec3, durationMs: number): void;
  /** Per-frame update; called by the simulation tick. */
  update(dt: number): AnimationUpdateResult;
}

interface AnimationUpdateResult {
  pose: Pose;
  rootMotionDelta: { translation: Vec3; rotation: Quat };
  events: AnimationEvent[];     // fired this frame
  transitions: TransitionLog[]; // state changes this frame
}
```

---

## 2. Semantic clip naming

Clips are named with a dotted hierarchical scheme. Every system that references a clip (combat grammar, behavior trees, VFX timing) references the name, not the file. Names are stable across assets; the underlying clip can be re-imported without breaking references.

```
domain.action.variant.[index]

locomotion.walk.forward
locomotion.walk.backward
locomotion.run.forward
locomotion.idle.relaxed
locomotion.idle.combat
locomotion.jump.start
locomotion.jump.apex
locomotion.jump.land

combat.sword.light.01
combat.sword.light.02
combat.sword.light.03
combat.sword.heavy.01
combat.sword.dodge.back
combat.sword.parry.success
combat.sword.parry.fail
combat.sword.sheathe
combat.sword.draw

technique.channel.ground       // qigong gathering from the earth
technique.channel.sky          // qigong gathering from the sky
technique.fireball.cast
technique.fireball.release
technique.shield.raise
technique.shield.break

reaction.hit.light
reaction.hit.heavy
reaction.hit.stagger
reaction.death.default
reaction.knockdown.forward
reaction.getup.front

social.bow.formal
social.bow.deep
social.wave
social.sit.chair
social.sit.floor
social.drink.tea

craft.alchemy.stir
craft.alchemy.pour
craft.swordforge.hammer
craft.swordforge.quench
```

### Naming rules

- **domain**: the high-level category (`locomotion`, `combat`, `technique`, `reaction`, `social`, `craft`).
- **action**: the specific action (`walk`, `run`, `light`, `heavy`, `cast`, `release`).
- **variant**: a distinguishing modifier (`forward`, `backward`, `01`, `02`, `success`, `fail`).
- **index** (optional): for sequences (light.01, light.02, light.03 — a combo chain).

The combat grammar (bible document 13) references these names directly: `combat.sword.light.01` is the canonical name for the first light attack in the sword moveset. The animation framework resolves the name to a clip hash via the asset system (document 16).

---

## 3. Skeleton standards

The engine defines canonical skeleton profiles. Every skinned asset conforms to one. Retargeting (§10) is only possible because both source and target share a profile.

### 3.1 Humanoid base (the default)

```
root
└── hips
    ├── spine
    │   └── chest
    │       └── upper_chest
    │           ├── neck → head
    │           │           └── [facial bones if present]
    │           ├── shoulder_L → upper_arm_L → lower_arm_L → hand_L
    │           │                                                  ├── [weapon_bone_L]
    │           │                                                  └── [finger bones]
    │           └── shoulder_R → upper_arm_R → lower_arm_R → hand_R
    │                                                      ├── [weapon_bone_R]
    │                                                      └── [finger bones]
    ├── thigh_L → calf_L → foot_L → toe_L
    └── thigh_R → calf_R → foot_R → toe_R
```

The humanoid base has ~24 mandatory bones (root, hips, spine, chest, upper_chest, neck, head, shoulder_L/R, upper_arm_L/R, lower_arm_L/R, hand_L/R, thigh_L/R, calf_L/R, foot_L/R, toe_L/R) and ~30 optional bones (fingers, facial, weapon bones, robe bones).

### 3.2 The other profiles

| Profile | Use case | Mandatory bones |
|---|---|---|
| `humanoid` | Player, NPCs, cultivators | 24 (above) |
| `quadruped` | Spirit beasts (horse, tiger, ox) | root, hips, spine×3, neck, head, shoulder_L/R, upper_arm_L/R, lower_arm_L/R, hand_L/R, thigh_L/R, calf_L/R, foot_L/R, toe_L/R, tail |
| `serpentine` | Snakes, dragons (long-body) | root, spine×N (chain), neck, head, jaw |
| `flying` | Birds, flying swords | root, hips, spine, neck, head, wing_L/R (each: upper, mid, tip), tail |
| `multi-armed` | Asuras, devas (4–8 arms) | humanoid base + secondary arm chains from upper_chest |
| `giant` | Giant cultivators (3–10m tall) | humanoid base, scaled; foot IK mandatory for terrain |
| `custom` | Anything else | declared in `SkeletonProfile.boneNames` |

### 3.3 Optional bone groups

- **Weapon bones**: `weapon_bone_R`, `weapon_bone_L`, `sheath_back`, `sheath_hip_L`. Present on combat-capable skeletons. The combat grammar (document 13) attaches weapons to these via constraints.
- **Robe bones**: `robe_01..robe_N` — a chain hanging from hips, simulated by skirt-solver physics. Present on robed characters.
- **Facial rig**: `jaw`, `eye_L`, `eye_R`, `brow_L`, `brow_R`, `mouth_L`, `mouth_R`, plus morph targets for expressions. Present on dialogue-capable NPCs.

```typescript
interface SkeletonProfile {
  standard: 'humanoid' | 'quadruped' | 'serpentine' | 'flying' | 'multi-armed' | 'giant' | 'custom';
  boneCount: number;
  boneNames: string[];           // canonical names, in binding order
  facialRig: boolean;
  weaponBones: string[];
  robeBones: string[];
  /** Scale: 1.0 = 1.8m tall (humanoid default). Giants: 3.0–10.0. */
  scale: number;
}
```

---

## 4. Animation state graphs

Each entity has a `StateGraph` — a finite state machine where states are animation clips (or blend trees) and transitions are conditions on parameters.

```typescript
interface StateGraph {
  states: GraphState[];
  transitions: GraphTransition[];
  initialState: string;
  parameters: Record<string, GraphParam>;
}

interface GraphState {
  name: string;                  // matches a semantic clip name, or a blend tree name
  kind: 'clip' | 'blend-tree' | 'additive-layer';
  clipName?: string;             // for kind: 'clip'
  blendTree?: BlendTree;         // for kind: 'blend-tree'
  speed: number;                 // playback rate
  loop: boolean;
  /// Events emitted at specific times in this state.
  events: AnimationEventDef[];
}

interface GraphTransition {
  from: string;
  to: string;
  durationMs: number;            // crossfade duration
  condition: (params: Record<string, number | Vec3>) => boolean;
  /// If true, the transition can interrupt the source state mid-clip.
  canInterrupt: boolean;
  /// Exit time (0..1) — only allow transition after this fraction of the clip has played.
  exitTime?: number;
}

interface GraphParam {
  name: string;
  type: 'float' | 'vec3' | 'bool';
  default: number | Vec3 | boolean;
}
```

### Example: combat state graph

```
                          ┌──────────────────┐
              speed>0.5   │                  │  speed<0.1
        ┌────────────────►│   run.forward    │──────────────┐
        │                 │                  │              │
        │                 └──────────────────┘              │
        │                                                   ▼
   ┌────────┐  speed>0.1         ┌──────────────────┐   ┌────────┐
   │  idle  │──────────────────► │   walk.forward   │   │  idle  │
   └────┬───┘                    └──────────────────┘   └────────┘
        │                                                      
        │ input.attack                                          
        ▼                                                      
   ┌────────────────┐    hit   ┌──────────────────┐           
   │ sword.light.01 │─────────►│  sword.light.02  │           
   └────┬───────────┘          └──────────────────┘           
        │ no input within cancel window                        
        ▼                                                      
   ┌────────┐                                                  
   │  idle  │                                                  
   └────────┘                                                  
```

### Cancel windows (the combat grammar connection)

Each combat state declares a `cancelWindow` — the time range during which the player can interrupt this state with a follow-up action. Outside the window, the state plays to completion. This is the bridge between the combat grammar (document 13) and the animation framework.

```typescript
interface CancelWindow {
  startMs: number;               // from clip start
  endMs: number;
  /// Tags of actions that can cancel during this window.
  cancelableWith: string[];      // e.g. ['sword.light', 'sword.dodge', 'sword.parry']
}
```

---

## 5. Blend trees

A `BlendTree` blends multiple clips by parameters. Used for locomotion (idle ↔ walk ↔ run by `speed` parameter) and aim blending (look up / forward / down by `aim` parameter).

```typescript
interface BlendTree {
  type: '1d' | '2d' | 'simple-directional';
  /// Input parameters.
  parameters: string[];
  /// Child nodes (clips or sub-blend-trees) with their threshold positions.
  children: BlendTreeNode[];
}

interface BlendTreeNode {
  clipName: string;
  threshold: number[];           // 1 value for 1D, 2 for 2D
  weight?: number;               // for 2D directional
}
```

A 1D blend tree for locomotion: 3 children (idle at 0, walk at 0.5, run at 1.0), parameter `speed` in [0, 1]. A 2D blend tree for directional locomotion: 5 children (idle at center, forward/back/left/right at cardinal positions), parameters `moveX`, `moveY`.

---

## 6. Additive layers and body masks

Additive layers apply a delta pose on top of the base. Used for breathing, injury limping, aim offset, social emotes that play while walking.

```typescript
interface AdditiveLayer {
  name: string;                  // 'breathing', 'injury-leg', 'aim-offset'
  clipName: string;
  weight: number;                // 0..1
  mask?: BodyMask;
  /// How the additive is applied.
  mode: 'additive' | 'override'; // override ignores base; additive adds delta
}

interface BodyMask {
  /// Bones included (others are weight 0).
  include: string[];
  /// Or, excluded.
  exclude: string[];
  /// Per-bone weight (0..1). Default 1 for included.
  weights?: Record<string, number>;
}
```

### Upper/lower-body masks

The engine ships two standard masks:
- **UpperBody**: `spine`, `chest`, `upper_chest`, `neck`, `head`, both arm chains. Excludes legs.
- **LowerBody**: `hips`, both leg chains. Excludes spine and arms.

Used for: the player aims a bow (upper body) while walking (lower body). Two animation states run in parallel: `locomotion.walk.forward` on LowerBody, `aim.bow.draw` on UpperBody, blended via the masks.

---

## 7. Root motion

Some clips move the character (walk, run, dodge). Others don't (idle, attack). The engine extracts root motion from the clip's hip translation and feeds it back to the simulation as a `rootMotionDelta`.

```typescript
interface RootMotionConfig {
  mode: 'extract' | 'lock' | 'lock-y-only';
  /// Bone to extract from. Usually 'hips' or 'root'.
  sourceBone: string;
  /// Apply to physics, to animation, or both.
  applyTo: 'physics' | 'animation' | 'both';
}
```

- `extract`: the clip's hip translation is fed to the physics body; the visual skeleton stays centered on the hip.
- `lock`: the clip plays in place; the physics body doesn't move.
- `lock-y-only`: the clip's XZ motion extracts; Y stays at the physics body's height (for terrain alignment).

Root motion is **authoritative** for combat dodges and technique dashes (the simulation trusts the clip's distance). For locomotion, the simulation sets the velocity; the clip's root motion is matched to that velocity (motion warping, §8).

---

## 8. Motion warping

Motion warping adjusts a clip's root motion so the character ends at a specific position. Used for: vault-over-cover (end at the cover's far side), leap attacks (end at the target), precision landings.

```typescript
interface MotionWarp {
  /// The bone whose trajectory is warped (usually 'hips').
  bone: string;
  /// Target world position at the warp's end time.
  targetPosition: Vec3;
  /// Optional target rotation.
  targetRotation?: Quat;
  /// Clip time at which the warp starts and ends.
  startMs: number;
  endMs: number;
  /// Curve shape: 'ease-in-out' default; 'linear' for steady drift.
  easing: 'linear' | 'ease-in-out' | 'ease-out';
}
```

The warper samples the clip's original trajectory, computes the delta to the target, and applies the delta along the easing curve. The visual result: the character plays the clip's animation but lands at the target instead of the original endpoint.

---

## 9. IK (inverse kinematics)

Two-bone IK for foot and hand placement. The engine's IK is per-limb, per-target, and runs after the base pose and additives.

```typescript
interface IkTarget {
  /// Bone chain: e.g. ['thigh_L', 'calf_L', 'foot_L'] for foot IK.
  chain: string[];
  /// Target world position for the end effector.
  position: Vec3;
  /// Optional target rotation for the end effector (pole vector for the chain).
  rotation?: Quat;
  /// Weight 0..1 (allows blending IK in/out).
  weight: number;
}

interface IkConfig {
  /// Foot IK: align feet to terrain. Sampled from terrain heightfield.
  footIk: boolean;
  /// Hand IK: place hand on weapon, on a grab target, on a knock target.
  handIk: boolean;
  /// Terrain heightfield reference (for foot IK).
  terrain?: TerrainHeightfield;
}
```

### Foot IK (terrain alignment)

The character's feet follow the terrain's slope. Per frame:
1. Sample the terrain height at each foot's projected position.
2. Sample the terrain normal at that point.
3. Set the foot IK target to `(foot.x, terrainHeight, foot.z)` with rotation aligned to the normal.
4. Blend IK weight in/out so it's not active during jumps or dodges.

Without foot IK, characters on slopes have one foot floating and one foot clipping. With it, both feet plant. This is the difference between an amateur and a professional look.

### Hand IK (weapon / grab / place)

The hand reaches a target: a weapon grip, a knock point on an enemy, a grabbable edge. Hand IK is driven by the combat grammar (document 13) and the technique framework (document 18).

---

## 10. Retargeting

A clip authored for skeleton A can play on skeleton B if both share a `SkeletonProfile` standard. The engine retargets the clip: bone names are mapped, proportions are scaled, foot IK re-plants the feet.

```typescript
interface RetargetConfig {
  sourceProfile: SkeletonProfile;
  targetProfile: SkeletonProfile;
  /// Per-bone name mapping (usually identity for same standard).
  boneMapping: Record<string, string>;
  /// Scale: how to translate source proportions to target.
  scaleMode: 'uniform' | 'per-bone';
  /// Apply foot IK after retarget to re-plant on terrain.
  applyFootIk: boolean;
  /// Root motion scale: 1.0 = preserve; >1 = amplify.
  rootMotionScale: number;
}
```

### How it works

1. The source clip's per-bone poses are read.
2. Each bone is mapped to the target skeleton via `boneMapping` (identity for same-standard).
3. Translations are scaled by the proportion ratio: `targetBoneLength / sourceBoneLength`.
4. Rotations are preserved (the bone's local rotation is the animation's intent).
5. Root motion is scaled by `rootMotionScale` (a tall giant's walk covers more ground than a mortal's).
6. Foot IK re-plants the feet on the terrain (the scaled proportions will have shifted foot positions).

This is how a library of mortal animation clips plays correctly on a giant, a child, an old person, a tall cultivator — all humanoid-standard, all sharing the clip library.

---

## 11. Animation events

Clips carry events — named markers at specific times. The framework fires events during `update()`. The simulation subscribes.

```typescript
interface AnimationEventDef {
  name: string;                  // 'footstep', 'hit-activate', 'sheathe-point', 'vfx-spawn'
  timeMs: number;
  payload?: unknown;             // event-specific data
}

interface AnimationEvent {
  name: string;
  payload: unknown;
  /// The clip that fired it.
  sourceClip: string;
  /// The bone the event is anchored to (for VFX socket spawning).
  bone?: string;
}
```

Standard event names:
- `footstep` — for footstep audio (left/right distinguishes foot)
- `hit-activate` — combat hit frame (the combat grammar registers for this; damage applies here, not at clip start)
- `hit-deactivate` — hit frame end (the attack's collision is no longer active)
- `vfx-spawn` — spawn a VFX component at a bone socket
- `audio-spawn` — play a one-shot audio
- `sheathe-point` — the moment a weapon can be visually sheathed
- `draw-point` — the moment a weapon can be visually drawn
- `cancel-window-open` / `cancel-window-close` — marks the cancel window (§4)

---

## 12. Hit-stop and cancel windows

Hit-stop is the brief freeze on a successful hit — the attacker and defender both pause for 40–120 ms. This is the "weight" of an attack (Sekiro, Monster Hunter, Street Fighter all use it).

```typescript
interface HitStopConfig {
  /// When a hit lands, freeze the attacker and defender for this duration.
  durationMs: number;
  /// Scale by hit weight: light=40ms, heavy=80ms, technique=120ms.
  weightScale: Record<'light' | 'heavy' | 'technique', number>;
  /// Whether the camera also freezes (subtle zoom-in).
  cameraFreeze: boolean;
}
```

During hit-stop, the `AnimationController.update()` returns a pose at the same timestamp as the previous frame — the animation appears frozen. The simulation continues (so damage applies, particles spawn) but the poses hold. After `durationMs`, normal playback resumes.

Cancel windows (§4) determine when a state can be interrupted by a new input. Hit-stop overlaps cancel windows: a hit landed during the cancel window consumes the cancel and triggers hit-stop on the target.

---

## 13. Animation LOD

Distant characters use simplified animation. The engine has three LOD tiers:

| Tier | Distance | Behavior |
|---|---|---|
| `LOD0` | <30 m | Full state graph, additive layers, IK, retargeting, facial |
| `LOD1` | 30–80 m | State graph, no additive layers, no IK, no facial |
| `LOD2` | 80–200 m | Single clip per state (no blend trees), no IK |
| `LOD3` | >200 m | Billboard or static pose; no animation updates |

LOD transitions are hysteresis-based (use LOD1 at 30m; only demote to LOD2 at 50m) to avoid thrashing at the boundary.

---

## 14. Pose caching

For LOD2+ crowds (a sect of 1000 disciples at 100m+), each running an `AnimationController` per frame is too expensive. The engine caches sampled poses per (clipName, timeBucket) and shares them across entities.

```typescript
class PoseCache {
  /// Buckets: clip sampled at 5 Hz, 20 frames per second of clip.
  /// Pose identity: (clipHash, floor(time / 50ms)).
  private cache: Map<string, Pose> = new Map();

  getOrSample(clipHash: string, timeMs: number, skeleton: SkeletonProfile): Pose {
    const bucket = Math.floor(timeMs / 50);
    const key = `${clipHash}:${bucket}`;
    let pose = this.cache.get(key);
    if (!pose) {
      pose = sampleClip(clipHash, bucket * 50, skeleton);
      this.cache.set(key, pose);
    }
    return pose;
  }
}
```

1000 disciples all playing `locomotion.walk.forward` at slightly different times share ~20 sampled poses (one per 50ms bucket). The cost is 20 samples, not 1000.

---

## 15. Procedural overlays

Procedural overlays apply per-frame procedural animation on top of the clip + additive + IK pose. The engine ships:

- **Breathing**: a sinusoid on the spine and chest, parameters `breathRate`, `breathDepth`. Always active; the depth scales with exertion.
- **Injury limp**: per-leg, weight driven by injury state. The leg's rotation is offset by a noise-driven sinusoid; the timing matches the footstep event.
- **Cultivation aura**: a subtle floating motion (root bone bobbing at ~0.2 Hz) for cultivators above Qi Condensation. Players above Nascent Soul get a stronger aura.
- **Look-at (head/eye)**: the head and eyes track a target (an NPC the player is talking to, an enemy in combat, a point of interest). Driven by the behavior system.
- **Foot planting on slopes**: technically part of foot IK, but it's procedural in nature.

```typescript
interface ProceduralOverlay {
  name: string;
  /// Per-frame, modifies the pose in-place.
  apply(pose: Pose, ctx: ProceduralContext): void;
  weight: number;
}

interface ProceduralContext {
  tick: number;                  // engine tick (deterministic)
  entity: EntityRef;
  skeleton: SkeletonProfile;
  terrain?: TerrainHeightfield;
  target?: Vec3;                // look-at target, IK target
  state: Record<string, number | Vec3>; // per-overlay state (phase, etc.)
}
```

---

## 16. The 16 questions

**Q1. What problem does this system solve?**
Driving character animation with the richness the xianxia setting demands: combat with cancel windows and hit-stop, locomotion with blend trees and terrain-aligned feet, technique casting with VFX timing, social emotes, all retargetable across humanoids/giants/multi-armed asuras, with LOD for distant crowds — all without leaking Three.js types.

**Q2. What is the public interface?**
`AnimationController` (§1), `StateGraph` (§4), `BlendTree` (§5), `AdditiveLayer` (§6), `BodyMask` (§6), `IkTarget` (§9), `RetargetConfig` (§10), `AnimationEvent` (§11), `HitStopConfig` (§12), `ProceduralOverlay` (§15).

**Q3. What is the internal architecture?**
`AnimationController` owns a `StateGraph`, a set of `AdditiveLayer`s, a set of `IkTarget`s, a `PoseCache`, and a list of `ProceduralOverlay`s. It owns an `AnimationMixer` internally (Three.js) for clip sampling. Per `update(dt)`: sample state graph → apply additives with masks → apply IK → apply procedural → emit events → return pose + root motion.

**Q4. What is the data flow?**
Simulation sets state and params → state graph transitions → blend tree samples clips via `AnimationMixer` → pose assembled → additives applied with masks → IK adjusts limbs → procedural overlays add breathing/limp/aura → pose + root motion + events returned to simulation.

**Q5. What is the lifecycle?**
Entity spawn: `AnimationController` created, state graph loaded, mixer bound to `SkinnedMesh`. Per tick: `update(dt)` → pose applied to skeleton. Entity despawn: controller disposed, pose cache entries remain (shared across entities).

**Q6. What is the failure model?**
- Clip missing (hash not in registry): the state plays the placeholder clip (a 1-frame T-pose); the simulation continues; logged.
- State graph missing: controller falls back to a single-state graph (idle); logged.
- IK solver diverges (target unreachable): IK weight fades to 0 over 100ms; the limb stays at the clip's pose.
- Retarget mismatch (source and target profiles differ): retarget falls back to identity mapping; the result is janky but not crashing; logged.

**Q7. What are the invariants?**
- Semantic clip names are stable; the underlying clip hash can change but the name does not.
- Root motion is authoritative for combat dodges and technique dashes.
- Hit-stop freezes both attacker and defender's animation; the simulation continues.
- Cancel windows are part of the clip metadata; the combat grammar reads them.
- LOD transitions are hysteresis-based (no thrashing).

**Q8. What is the performance budget?**
- Per-entity `update`: <0.1 ms at LOD0, <0.02 ms at LOD2 (pose cache hit).
- IK solve: <0.05 ms per limb.
- Retarget: <0.1 ms per clip per skeleton.
- Pose cache hit rate >95% for crowds.
- 1000 animated entities at LOD2: <2 ms total.

**Q9. What is the determinism contract?**
The animation state, the parameters, and the procedural overlay state are all part of the deterministic simulation. The clip sampling is deterministic (same clip + same time = same pose). Two runs with the same seed produce the same poses at the same tick. The visual result (interpolation, GPU skinning) may differ by GPU, but the pose data is canonical.

**Q10. What is the threading/concurrency model?**
The `AnimationController` runs on the simulation thread (deterministic). The `AnimationMixer` and `SkinnedMesh` live on the renderer worker. Per frame, the controller uploads the pose (a `Float32Array` of bone transforms) to the renderer via SharedArrayBuffer. GPU skinning happens on the renderer.

**Q11. How is it serialized?**
- State graph: part of the entity definition (a string ID referencing a graph asset, loaded by hash from the asset system).
- Current state, parameters, additive weights: part of the entity's save state (CBOR).
- Pose cache: not serialized; rebuilt on load.
- IK targets: derived from runtime state (terrain, targets), not serialized.

**Q12. How is it debugged?**
- The animation inspector: select an entity, see the current state graph, current state, blend tree weights, parameter values, active additives, IK targets.
- The pose visualizer: overlay bone axes on the skinned mesh.
- The event log: animation events fired per frame.
- Clip preview: load a clip in isolation, scrub the timeline, see the pose.
- Cancel window overlay: visualize the cancel window on the timeline.

**Q13. How is it tested?**
- Clip hash stability: same clip + same time = same pose (CI verifies).
- Retarget parity: a clip retargeted across humanoid/giant/multi-armed produces structurally similar poses (bone rotations equal within tolerance).
- State graph contract tests: every state has at least one transition; the graph has no dead-end states.
- IK reachability test: target within the limb's reach → IK converges; target outside → weight fades.
- Hit-stop determinism: same hit at same tick → same hit-stop duration.

**Q14. What alternatives were rejected?**
- *Direct AnimationMixer use.* Rejected: `AnimationMixer` is a clip player, not a state machine. The engine needs state graphs, blend trees, additives, masks, IK, procedural overlays — none of which AnimationMixer provides.
- *Custom animation runtime (no Three.js).* Rejected: AnimationMixer's sampling and interpolation are correct, fast, and battle-tested. Reimplementing is man-weeks. The engine wraps it.
- *Mecanim-style state graphs (Unity).* Rejected as the *only* option: they're great for characters but the engine needs the combat grammar (document 13) to drive transitions, which Mecanim's parameter model doesn't support cleanly. The engine's state graph is parameter-driven but combat-grammar-aware.
- *Per-bone masks via string matching.* Rejected: string matching is slow and error-prone. The engine uses `BodyMask` with explicit include/exclude lists, validated against the `SkeletonProfile`.
- *Root motion always extracted.* Rejected: some clips (attacks, techniques) should play in place. The mode is per-state.
- *No pose cache.* Rejected: 1000-disciple sects are unplayable without it. The cache is the difference between 16ms and 60ms frames.

**Q15. What are the known limitations?**
- Two-bone IK only. Three-bone chains (e.g. spine) use forward kinematics + procedural overlay, not full IK.
- Retargeting across skeleton standards (humanoid → quadruped) is not supported. Within a standard, retargeting works.
- Pose cache buckets at 50ms mean very fast clips (sub-50ms) sample every frame, not cached.
- Procedural overlays are limited to bone transforms; they cannot inject morph-target animation (planned).
- iOS Safari's GPU skinning is slower than desktop; LOD demotes earlier on mobile.

**Q16. What does this enable next?**
- The combat grammar (document 13) drives state transitions; cancel windows and hit-stop are the animation half of the combat feel.
- VFX (document 18) spawns at animation events (`vfx-spawn`) anchored to bones.
- The technique framework (document 18) plays casting clips with motion warping to the target.
- The crowd simulation (1000-disciple sects) is feasible because of pose caching and LOD.
- Cultivation aura, injury limps, and breathing are the visual language of cultivation stage and injury — driven by simulation state, applied procedurally.

---

## 17. Failure cases (catalogue)

| Failure | Detection | Recovery |
|---|---|---|
| Clip hash not in registry | Asset system returns placeholder | Use placeholder clip (1-frame T-pose); log |
| State graph asset missing | Controller init fails | Fall back to single-state idle graph; log |
| Blend tree parameter missing | `setParam` called before param defined | Define the param with default value; warn |
| IK target unreachable | Solver doesn't converge in N iterations | Fade IK weight to 0 over 100ms; log |
| Retarget profile mismatch | `sourceProfile.standard !== targetProfile.standard` | Fall back to identity mapping (janky); log; do not crash |
| Pose cache miss storm | Cache hit rate <50% | Expand bucket size to 100ms; retest |
| Animation event handler throws | Handler callback throws | Catch, log, continue; do not crash the tick |
| Hit-stop overlaps state transition | Transition fires during hit-stop | Delay the transition until hit-stop ends |

---

## 18. Rejected alternatives (detail)

### 18.1 "Use AnimationMixer directly"

The argument: it's already there; wrapping it adds overhead.

The rejection: `AnimationMixer` does not have state graphs, blend trees, additive layers, body masks, root motion extraction, motion warping, IK, procedural overlays, hit-stop, or cancel windows. The engine needs all of these. Wrapping AnimationMixer for sampling + interpolation is correct; using it as the animation system is not.

### 18.2 "Mecanim-style visual state graphs"

The argument: Unity's Mecanim is the industry standard; copy it.

The rejection: Mecanim's parameter model is float/bool/trigger. The combat grammar needs cancel windows, hit-frame events, motion warping targets — none fit cleanly. The engine's state graph is parameter-driven but exposes cancel windows and events as first-class. Mecanim is a reference, not a spec.

### 18.3 "Always extract root motion"

The argument: simpler model; clips always move the character.

The rejection: attacks and techniques should play in place (the character doesn't slide forward when swinging a sword). Some clips move (dodge, dash); others don't (idle, attack). The mode is per-state.

---

## 19. What this document enables

1. Characters move with the richness the xianxia setting demands: combat with weight (hit-stop), locomotion with terrain alignment (foot IK), technique casting with VFX timing (events).
2. A library of humanoid clips plays correctly on mortals, giants, and multi-armed asuras — retargeting handles the proportions.
3. Crowds of 1000 disciples are feasible — pose caching and LOD keep the frame budget.
4. The combat grammar (document 13) drives animation; the animation framework exposes the hooks (cancel windows, hit-stop, events) the grammar needs.
5. VFX (document 18) spawns at animation events, anchored to bones (`vfx-spawn` at `hand_R` for a fireball release).
6. Cultivation stage, injury state, and exertion are visible — procedural overlays encode them.

Animation is the visible half of the simulation. The simulation says "the character is walking, injured, at stage Foundation Establishment, aiming a fireball at the target." The animation framework turns that into a pose.
