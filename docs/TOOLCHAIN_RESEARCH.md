# Toolchain Research — Animation, Rigging & Production Tools for the Xianxia Multiverse

Research date: 2026-08-07. Purpose: map the best available repos/tools/plugins per
production stage so the Grand Architect studio, the three.js runtime, and the
Blender authoring pipeline use the strongest proven methodology. Items marked
[VERIFIED] were confirmed live on GitHub this session; others are established
ecosystem knowledge (marked [KNOWLEDGE]).

## 1. Characters, rigging & modular equipment (three.js runtime)

| Tool | What it gives us | Adoption for THIS engine |
|---|---|---|
| [VERIFIED] pixiv/three-vrm (2,090★, MIT) | VRM (glTF-based) humanoid avatars: humanoid bone map, expressions, look-at, **spring bones** (cloth/hair secondary motion), first-person/second-person | Directly implements the Modular Character Factory board: shared skeleton, cloth/hair bones ("secondary bones or dynamic simulation bones"), expressions. VRM = our character container; equipment = attach mesh + hide-mask via VRM materials. |
| [KNOWLEDGE] jsantell/THREE.IK (three-iksolver) | Two-bone + CCD IK solvers for three.js | Hand IK for sword grips, foot IK on slopes (per the deep-dive scene prompt: "foot IK preserves sole contact"), interaction IK |
| [KNOWLEDGE] pmndrs ecosystem: @react-three/drei (AnimationClip, useAnimations), @react-three/rapier | Mixer-driven animation, physics character | Already in repo (rapier3d + drei). UseAnimationClips + AnimationMixer for the motion corpus; rapier KCC exists |
| [KNOWLEDGE] three.js built-ins: SkinnedMesh, AnimationMixer, MorphTargets, Bone/IK via `THREE.Bone` + `SkeletonUtils` | Retargeting (SkeletonUtils.retarget), morph-driven expressions, blend via AnimationAction crossfade | Motion corpus playback: semantic clips (locomotion.walk.forward) mapped to clips, crossfaded |
| [KNOWLEDGE] pixiv/VRM_Addon_for_Blender (MIT) | Author/export VRM from Blender: humanoid rig setup, spring bones, expressions | The authoring bridge: our Blender base body (board §2) → VRM → three-vrm runtime |

Authoring path per the board: Blender base body (1.80 m, 23-slot equipment map) →
VRM addon rig (shared skeleton, hide-mask slots as VRM toggles) → export →
three-vrm + drei in the studio viewport.

## 2. Destruction, fracturing & damage states

| Tool | What it gives us | Adoption |
|---|---|---|
| [VERIFIED] Blender Cell Fracture (built-in addon since 2.81) | Voronoi-based shattering of meshes into pieces with optional inner faces | Authoring the Hybrid Structures Factory damage ladder: pre-fractured variants per state (intact → weathered → battle-damaged → partially collapsed → destroyed footprint → repair) |
| [VERIFIED] Blender Fracture Modifier (community; scorpion81/squarednob forks, GPL) | Modifier-based fracturing with physics-ready shards | Alternative/older; built-in Cell Fracture is the primary recommendation |
| [KNOWLEDGE] Houdini RBD (reference methodology) | Rigid body destruction, constraint graphs, glue strengths | The professional reference for glue-strength hierarchies (destroy roof before walls); replicated via Blender rigid body + cell fracture + constraint parenting |
| Runtime (already built) | Voxel terrain destruction + Rapier debris (dirty cells → recompile collision → update nav) | Our runtime destruction IS the Terrain Factory board loop (debris spawn → dirty cells → recompile collision → navigation) |

Methodology: author ONE master mesh per structure; bake the damage-state ladder as
pre-fractured GLB variants (BLD_ naming per board); runtime swaps variants on
damage thresholds and spawns debris via rapier; matter conservation feeds loot.

## 3. PCG level art, arrays, splines & cables

| Tool | What it gives us | Adoption |
|---|---|---|
| [KNOWLEDGE] Blender Geometry Nodes (built-in) | Procedural scatter/array/instancing on splines: fences, fields, roofs, walls; tag-and-spline driven layouts | "Array tool for level art" + "PCG tools responding to destruction with manual control using tag and splining": geonode groups keyed by named attributes (tags) per board kit |
| [KNOWLEDGE] Houdini (SOPs, Vellum, Wire solver) | Industrial PCG, cloth, wire/cable simulation | Reference methodology for cable tools: sag, tension, bundle wiring between structures; Blender equivalent: geonodes curve-to-mesh + built-in "Add Curve: Extra Objects" / Curve Tools |
| [KNOWLEDGE] Blender built-in addons: Extra Curve Objects, Curve Tools, TinyCAD | Cable/rope/beam authoring | Village wiring: well ropes, bridge cables, lantern chains, thatch ridge lines |
| [KNOWLEDGE] Three.js curves (CatmullRomCurve3, TubeGeometry) | Runtime splines | Roads/rivers/cables in-engine follow the same spline data the set blueprint uses |

PCG rule (from the directive): artists place tags/splines; the generator respects
destruction state (a burned field stops instancing crops; a collapsed wall
stops the fence array).

## 4. Materials, rendering & shader language (AAA look per the boards)

| Tool | What it gives us | Adoption |
|---|---|---|
| [KNOWLEDGE] three.js MeshPhysicalMaterial + PMREM/IBL | Physically based, clearcoat (glazed tile), sheen (silk), transmission | "Believable PBR, painterly" target: physical base + hand-painted albedo; clearcoat for glazed roofs, sheen for robes |
| [KNOWLEDGE] drei: Environment, Lightformer, ContactShadows, MeshTransmissionMaterial | Studio lighting rigs, soft shadows | Warm sun + ambient occlusion + soft shadows (already partially in engine) |
| [KNOWLEDGE] PostProcessing (EffectComposer: SSAO, bloom, vignette, tone mapping) | Film look | Already in engine (toned-down pass); push toward "painterly 3D render" grade |
| [KNOWLEDGE] Shader per concept | Diegetic diagnostics | Spirit veins (blue-green current shader), formation fields (ripple/wireframe shader per UI board's Divine Sense mode), qi residue (decay glow), domain tint, law pressure distortion |

## 5. AI generation & prompt methodology (the "viral AI video" standard)

See docs/AI_PROMPT_PLAYBOOK.md — the full playbook. Core sources of the
methodology: Veo 3 prompting guide (camera/lens/motion vocabulary, style
references, negative prompts), Sora storyboard prompting (scene-by-scene,
character consistency), Runway Gen-4 prompting docs (subject/anchor frames,
style reference images), Kling/Hailuo/Wan community practice (shot language,
Chinese aesthetic prompts), and Anthropic's image prompting guidance
(detail density, order of importance, subject-first). Our adaptation maps
that standard onto the corpus canon + the six art boards + our director
script (which is already a storyboard).

## 6. Pipeline verdict (what to adopt next, priority order)

1. **three-vrm** for the Modular Character Factory runtime (character container,
   spring-bone cloth/hair, expressions) — highest leverage.
2. **Blender Cell Fracture** damage-ladder baking for the Hybrid Structures
   Factory (GLB variants per state) — matches existing asset pipeline
   (gltf-transform + meshopt LOD already in repo).
3. **Geometry Nodes tag-and-spline PCG** for field/fence/roof arrays; cable
   curves for village wiring.
4. **Prompt playbook** (docs/AI_PROMPT_PLAYBOOK.md) + machine prompt builder
   (src/lib/worldproduction/prompt-templates.ts) wired into the Director desk
   so every shot exports a generation-ready prompt.

Licensing notes: three-vrm MIT, VRM addon MIT, Cell Fracture is GPL-adjacent
(BLEND file exempt) — authoring-time use only, baked assets are ours.
