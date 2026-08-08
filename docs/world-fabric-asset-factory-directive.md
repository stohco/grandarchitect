# World Fabric / Asset Factory Master Directive v2

> Engineering directive (user-pasted, 2026-08; written companion to the Six Reference
> Boards in upload/, captioned via gemma-4-31b-it into upload/image-captions/). Not a
> corpus document — the Bible is frozen. Machine-audited by the Genesis gate.

Xianxia_World_Fabric_Asset_Factory_Master_Directive_v2.md
Xianxia Open-World RPG — World Fabric Asset Factory & Visual Production Bible
GLM 5.2 / z.ai Agent Master Directive — Written Companion to the Six Reference Boards

Status: authoritative production specification and gauntlet-loop contract
Project identity: standalone custom xianxia open-world RPG using the World Fabric runtime and smooth destructible volumetric terrain
Visual references: the six generated boards—Master World Fabric Blueprint, Modular Character Factory, Smooth Voxel Terrain Factory, Hybrid Structures Factory, UI/UX System Guide, and Scale/Streaming/Optimization Guide—plus the original user reference board
Authority rule: this written document is canonical. The images communicate appearance and layout; this text controls dimensions, topology, systems, naming, budgets, and acceptance tests. Any garbled or contradictory text inside an image must be ignored.
Important correction: this is not a Minecraft mod. The old “N64 / Ocarina of Time” target is rejected. Preserve the reference board’s clarity, modularity, and painterly xianxia identity, but use the beautiful high-quality gameplay render as the target.
0. Non-Negotiable Visual Target

The game uses a three-layer visual language:

    Stylized mid-poly form design

        Strong silhouettes, clean planes, graceful xianxia proportions, readable equipment, and simplified secondary forms.

        More detail than low-poly retro art, but less noisy than photogrammetry or hyper-real AAA scans.

        Characters and structures must remain recognizable at gameplay distance.

    Hand-painted, authored material language

        Painterly color variation, edge accents, cloth weave, carved motifs, weathering, and subtle brush-shaped breakup.

        Textures may be physically based, but they must look intentionally painted rather than scanned or procedurally generic.

        Never bake directional lighting or hard shadows into base color.

    Modern high-quality rendering

        Physically plausible lighting, global illumination or a credible approximation, atmospheric scattering, volumetric fog/clouds, contact shadows, soft cascaded shadows, reflections, controlled bloom, temporal anti-aliasing, and high-quality color grading.

        The final result is lush, beautiful, and cinematic while remaining performant and readable.

        It is not retro, not N64-like, not cel-shaded anime, not photoreal, not plastic, and not a generic “Chinese fantasy asset pack.”

The intended result is a painterly high-fidelity xianxia world: elegant, colorful, atmospheric, and grounded enough that materials, scale, and combat remain believable.


0A. Project Identity and Hard Exclusions

This project is a standalone third-person xianxia open-world RPG built on a custom Three.js/WebGL2/WebGPU-ready engine architecture. The world is not a decorative scene wrapped around a character controller. It is a persistent, streamed, destructible, simulated world in which terrain, structures, collision, navigation, ecology, NPC behavior, cultivation powers, and save-state revisions all agree on the same authoritative state.

The project must support:

    Smooth, non-cubic volumetric terrain with caves, arches, overhangs, tunnels, ravines, floating landmasses, and persistent deformation.

    Cultivation-gated destruction, construction, terraforming, flight, divine-sense inspection, and large-scale traversal.

    Modular characters whose complete base bodies exist beneath independently swappable garments and equipment.

    Hybrid structures combining volumetric foundations and terrain mass with precise modular architectural meshes.

    A living simulation for NPC schedules, factions, ecology, trade, repair, destruction, rumors, quests, and off-screen progression.

    Seamless world streaming, LOD/HLOD, asynchronous derived-artifact compilation, and atomic activation.

    A clean exploratory UI influenced by the density and placement philosophy of No Mortal Space, while remaining an original xianxia interface.

Hard exclusions:

    No Minecraft, Forge, block-grid art, or mod-specific assumptions.

    No N64, Ocarina of Time, retro low-poly, pixel-art, or deliberately crude visual target.

    No cel-shaded anime look.

    No photogrammetry-first or hyper-photoreal asset language.

    No fused player outfit that prevents visible equipment replacement.

    No generic fantasy-marketplace asset-pack appearance.

    No interface copied pixel-for-pixel from another game.

    No asset accepted only because a beauty render looks attractive.

0B. The Authoritative World Fabric Runtime Path

All player, architect, simulation, destruction, building, and world-generation changes must pass through one authoritative path:

User / Architect / Simulation intention
    -> ArchitectGateway authentication, authorization, and audit
    -> CommandBus.submit() validation and command normalization
    -> WorldRepository.applyTransaction() authoritative revision update
    -> DerivedArtifactCoordinator.invalidateCell() for affected cells only
    -> JobSystem schedules render / collision / navigation / water / vegetation rebuilds
    -> CoordinatorHandle verifies all derived artifacts target the same revision
    -> activateBundle() performs an atomic hot swap
    -> visible, collidable, navigable, simulated result appears together

Supporting runtime components:

    WorldRepository: authoritative world state, revisions, snapshots, restore, and persistent deltas.

    CommandBus: validated commands and transactions with forward and inverse operations.

    ArchitectGateway: security boundary, authentication, authorization, rate policy, and audit history.

    DerivedArtifactCoordinator: dirty-region tracking and revision-consistent derived-artifact compilation.

    CoordinatorHandle: readiness checks and atomic bundle activation.

    JobSystem: queued, running, completed, failed, cancelled, and retryable asynchronous jobs.

    Scheduler: deterministic tick scheduling, simulation tiers, and frame-independent systems.

    PluginHost: controlled registration of engine systems without creating alternate authority paths.

No subsystem may bypass CommandBus and mutate the visible world directly. A terrain edit is not complete when the density field changes; it is complete only when render mesh, collision, navigation, water boundaries, vegetation validity, persistence, and simulation references are activated at the same revision.
0C. Two-Level World Generation Contract

The art and asset factory feeds a two-level world-generation model:

Canon and world-design intention
    -> Semantic World Graph
    -> Template / Kit / Material / Creature libraries
    -> Voxel and Scene Compiler
    -> Initial authoritative WorldRepository state
    -> Living simulation and persistent player deltas

The Semantic World Graph defines meaning: settlements, sects, roads, spirit veins, watersheds, faction ownership, ecology, narrative landmarks, traversal gates, and cultivation-law regions. Templates define reusable realization rules. The compiler converts those meanings into volumetric terrain, structure instances, props, vegetation, nav surfaces, encounter anchors, and simulation entities. The renderer displays the result; it does not become the source of truth.
1. Agent Interpretation Rules

GLM 5.2 must treat this document as the source of truth even when no VLM is available.

    Do not infer dimensions, topology, slot names, or style from a single image. Use the numeric rules in this document.

    Every generated visual asset must also have a text manifest.

    Every concept sheet must use large numbered panels and stable IDs.

    Never place critical information only inside tiny image text.

    If a requested asset conflicts with this guide, stop and report the conflict before generating production assets.

    Do not create a single fused outfit mesh for the player. The player is a modular body wearing independently swappable equipment.

    The base player must exist as a complete, rigged, modest underwear model so every clothing slot can be equipped, removed, hidden, recolored, or replaced.

    Do not copy another game’s interface. Use the requested clean, low-clutter cultivation-survival HUD philosophy while retaining this project’s own visual identity.

2. Reference Sheet Package

Generate the following image package at 3840×2160 or larger. Each sheet must have a plain light neutral background, high-contrast dark labels, large panel numbers, and a 1-meter scale ruler.
Sheet ID	Required contents
SHEET_01_CHARACTER_FACTORY	Base underwear model, proportions, topology, face, hands, feet, skeleton, equipment slots, body-hide zones, cloth bones, texture channels, LOD examples
SHEET_02_TERRAIN_NATURE_FACTORY	Terrain macro/meso/micro forms, destructible surface examples, biome kits, cliffs, caves, roads, water, vegetation, scatter rules, material blends, LOD rings
SHEET_03_STRUCTURE_PROP_FACTORY	Mortal village, city, sect, palace, cave abode, floating architecture, modular grid, roof grammar, interiors, collision, damage states, props
SHEET_04_GAMEPLAY_UI_RENDER	Beautiful third-person gameplay render, clean HUD, quest panel, compass, minimap, quick techniques, contextual prompts, inventory/equipment mockup
SHEET_05_CREATURE_EFFECT_FACTORY	Mortal wildlife, spirit beasts, demons, flying creatures, bosses, scale comparison, anatomy, topology, VFX attachment points
SHEET_06_ANIMATION_FACTORY	Idle, walk, run, sprint, jump, fall, land, climb, swim, fly, sword chains, unarmed chains, techniques, hit reactions, death, cloth behavior
SHEET_07_LIGHTING_WEATHER	Morning, noon, sunset, moonlight, storm, cloud sea, spirit aurora, tribulation, interior lantern lighting, exposure reference
SHEET_08_UI_DOM_MAP	Annotated HUD rectangles, stable DOM IDs, anchors, z-order, dimensions, state variants, accessibility rules


2A. How to Use the Six Reference Boards

Supply this document beside the six images. The image set is a visual index; the written specification is the operational contract.
SHEET_00_MASTER_WORLD_FABRIC

Use the master board to establish the overall painterly in-game target, World Fabric pipeline, visual pillars, asset categories, and shared production principles. It is not a topology sheet and must not be used to infer exact dimensions.
SHEET_01_MODULAR_CHARACTER_FACTORY

Use this sheet to identify the target character silhouette, base-underwear requirement, modular slot layout, shared skeleton concept, costume family, hair/face variants, and weapon family. Exact slot IDs, body-hide zones, proportions, topology, texture channels, budgets, and QA rules come from this document.
SHEET_02_SMOOTH_VOXEL_TERRAIN_FACTORY

Use this sheet to understand the visual relationship among density fields, smooth surface extraction, material volumes, sculpt/carve/add operations, erosion, collision, navigation, destruction, terrain scale, and xianxia biome identity. The rendered cube diagrams are conceptual pipeline icons, not a requirement that the world appear cubic.
SHEET_03_HYBRID_STRUCTURES_FACTORY

Use this sheet to understand the division between volumetric terrain mass and modular architectural precision, the structural graph, exploded kit anatomy, damage states, repair anchors, and module families. Exact grid, dimensions, collision, nav, LOD, and destruction rules come from this document.
SHEET_04_UI_UX_SYSTEM_GUIDE

Use this sheet for density, hierarchy, layout philosophy, exploration/combat distinction, divine-sense and terraform overlays, inventory/loot arrangement, technique wheel, and restrained xianxia accent language. It is not permission to copy another game’s interface.
SHEET_05_SCALE_STREAMING_OPTIMIZATION

Use this sheet for relative scale, traversal-speed progression, streaming tiers, LOD/HLOD silhouettes, dirty-cell awareness, asynchronous compilation, and atomic activation. Performance values in this document are initial production targets and must be verified by profiling on representative hardware.
VLM and text-only parity

A VLM may use the images to verify shape, spacing, material mood, and hierarchy. A text-only GLM must still be able to build the same asset from the IDs, measurements, manifests, and acceptance rules here. Critical data must never exist only inside an image.
VLM-safe layout rules

    Maximum 12 major panels per sheet.

    Panel heading: at least 52 px at 4K.

    Body labels: at least 28 px at 4K.

    Every figure receives an ID such as CHR_BASE_M_01_FRONT.

    Never overlap labels with silhouettes.

    Use orthographic front/side/back views for production references.

    Use perspective only for beauty renders and gameplay demonstrations.

    Include one wireframe view, one flat-material view, and one final shaded view where topology matters.

    All measurements must be written in meters or centimeters, not vague terms.

    Export a matching .yaml or .json sidecar using the same IDs.

PART I — CHARACTER ASSET FACTORY
3. Canonical Player Scale and Proportions

The authoritative gameplay scale is real-world meters. Engine-specific units must be converted at import.
Measurement	Male base	Female base	Notes
Standing height	1.82 m	1.72 m	Variants may deviate ±8%, but equipment must declare supported ranges
Head count	7.75 heads	7.5 heads	Heroic but not exaggerated superhero anatomy
Shoulder width	0.46 m	0.40 m	Measured acromion to acromion
Hip width	0.34 m	0.36 m	Neutral stance
Hand length	0.19 m	0.175 m	Wrist crease to middle fingertip
Foot length	0.27 m	0.245 m	Used for boot fit
Eye line	~1.70 m	~1.61 m	Used for camera and interaction traces
Root origin	Ground center between feet	Ground center between feet	Forward axis must be documented

Default cultivators should look healthy, elegant, and capable. Avoid bodybuilding extremes, tiny waists, oversized hands, or excessively long fashion-model limbs.
4. Base Underwear Model

Create two production-ready base bodies: CHR_PLAYER_BASE_M_01 and CHR_PLAYER_BASE_F_01.

The base body must include:

    Complete head, neck, torso, arms, hands, legs, and feet.

    Modest fitted undergarments with no exposed genitals or nipples.

    Neutral skin material and separate eye, brow/lash, hair, and underwear materials.

    Anatomically credible shoulder, elbow, wrist, hip, knee, ankle, neck, jaw, and finger deformation.

    Clean body-hide zones so clothes do not rely on deleting the source body.

    No sculpted clothing folds on the naked body.

    No permanent belt, boots, bracers, robe, jewelry, or hairstyle.

    A bald scalp-cap version and standardized hairline.

    Optional facial-hair socket, but no permanent facial hair.

    Correct foot soles and toes because sandals and barefoot states are valid.

Body-hide zones

Every wearable declares which zones it hides. Use these exact IDs:

HEAD_SCALP, NECK, CHEST_UPPER, CHEST_LOWER, BACK_UPPER, BACK_LOWER, SHOULDER_L, SHOULDER_R, UPPER_ARM_L, UPPER_ARM_R, FOREARM_L, FOREARM_R, HAND_L, HAND_R, PELVIS, GLUTE, THIGH_L, THIGH_R, CALF_L, CALF_R, FOOT_L, FOOT_R.

Body masking must be reversible at runtime. Never permanently remove vertices from the canonical base mesh.
5. Modular Equipment Slots

Use separate visible meshes and deterministic layering.
Layer	Slot ID	Examples	Occlusion priority
0	BODY_BASE	Skin and underwear	0
1	INNER_TORSO	Undershirt, binding cloth	10
1	INNER_LEGS	Trousers, leggings	10
2	FEET_INNER	Socks, foot wraps	20
2	HANDS_INNER	Hand wraps	20
3	TORSO_ARMOR	Tunic, cuirass, inner robe	30
3	LEGS_ARMOR	Skirt panels, armored trousers	30
4	BOOTS	Shoes, boots, greaves	40
4	GLOVES	Gloves, bracers, gauntlets	40
5	OUTER_ROBE	Long robe, coat, mantle	50
5	WAIST	Belt, sash, hanging talismans	55
6	SHOULDERS	Pauldrons, shoulder cloth	60
6	CAPE_BACK	Cape, cloak, back banners	60
7	HEADGEAR	Crown, hat, hood	70
7	HAIR	Modular hairstyle	70
8	FACE	Mask, veil, eyewear	80
9	ACCESSORY_01–ACCESSORY_08	Jade, rings, gourds, beads, relics	90
10	WEAPON_MAIN, WEAPON_OFF, WEAPON_BACK_01–04	Sword, saber, staff, fan, sheath	100

The system must support at least eight accessory/artifact slots while preventing transform conflicts. Each accessory declares a socket, scale class, collision behavior, dye channels, and whether it is hidden in combat/cutscenes.
6. Character Topology
Deforming topology

    Use mostly quad edge flow before export.

    Add circular deformation loops around shoulders, elbows, wrists, hips, knees, ankles, neck, jaw, eyelids, and mouth.

    Shoulder topology must support arms-down, T-pose, overhead reach, sword draw, crossed arms, and flight poses.

    Elbows and knees require at least three supporting loops across the bend.

    Hips must support deep crouch, horse stance, high kick, meditation pose, and robe-compatible stride.

    Fingers must support sword grips, open-palm techniques, two-finger sword gestures, alchemy handling, inventory interaction, and climbing.

    Mouth topology must support speech phonemes and emotional facial animation.

    Eyelids must close cleanly over the eyeball without clipping.

    Keep density gradual. Do not place dense facial topology next to extremely sparse neck topology.

Cloth topology

    Long robe panels are separate meshes from the body.

    Hem edges need enough segmentation to bend smoothly; avoid one enormous rigid polygon.

    Model visible thickness on hems, collars, belts, armor plates, and sleeves.

    Create low-resolution cloth simulation proxies separate from render meshes.

    Use pin maps at shoulders, waist, upper back, cuffs, and armor attachment points.

    Long robes must be split intelligently so legs can move without explosive cloth simulation.

    Provide a fallback bone-driven version for distant LODs and low-performance settings.

Hard-surface topology

    Armor and ornaments use clean weighted normals or equivalent shading.

    Avoid microscopic bevels that disappear in gameplay.

    Preserve silhouette-changing bevels.

    Jade, metal, and carved accessories need real thickness.

    Weapon blades must have a readable spine, edge, guard, grip, and pommel.

7. Triangle and Texture Budgets

The previous 700–800 triangle target is obsolete.
Asset	LOD0	LOD1	LOD2	LOD3 / far
Player base body + head	28k–42k	16k–24k	7k–12k	2k–4k
Player hair	8k–16k	4k–8k	1.5k–3k	cards/impostor
Full player outfit	24k–55k	12k–28k	5k–12k	1.5k–4k
Full visible player target	60k–100k	30k–55k	12k–25k	4k–8k
Important named NPC	35k–75k	18k–38k	8k–16k	3k–6k
Generic NPC	20k–45k	10k–24k	4k–10k	1.5k–4k
Crowd NPC	6k–15k	3k–7k	1k–3k	impostor
Normal creature	18k–55k	9k–28k	4k–12k	1.5k–4k
Major boss	60k–180k	30k–90k	12k–40k	4k–12k
Hero weapon	6k–18k	3k–9k	1k–4k	300–1k

Texture targets:

    Player head: 2048² base color, normal, ORM; optional 1024² detail normal.

    Player body: 2048²; body may share a standardized atlas.

    Outfit set: one or two 2048² sets; 4096² only for cinematic hero assets.

    Hair: 1024² or 2048².

    Named NPC: 2048².

    Generic NPC: 1024²–2048².

    Crowd: 512²–1024².

    Weapons: 1024²–2048².

    Never use 4K merely because it is available. Texel density must be consistent.

Recommended target texel density: 512–768 px per meter for hero characters, 256–512 px per meter for normal NPCs, and 128–256 px per meter for distant world assets.
8. Character Materials

Use these channels:

    BaseColor

    Normal

    ORM packed as R=AO, G=Roughness, B=Metallic

    Emissive

    DyeMask

    Optional DetailMask, SubsurfaceMask, and DamageMask

Material guidance:
Material	Roughness target	Notes
Cotton/linen	0.65–0.88	Broad soft highlights, visible woven breakup
Silk	0.32–0.55	Directional sheen, never mirror-like
Leather	0.45–0.72	Edge wear, compressed creases
Lacquered wood	0.30–0.55	Painted grain beneath varnish
Iron/steel	0.18–0.42	Controlled wear; avoid chrome
Bronze	0.24–0.48	Warm metal with selective patina
Jade	0.20–0.42	Slight depth/transmission impression, soft internal color variation
Spirit crystal	0.08–0.30	Refractive/emissive accents, restrained bloom
Skin	0.42–0.62	Subtle subsurface response; do not look waxy
Hair	0.30–0.55	Anisotropic highlight or authored strand response

All base color maps must remain readable under neutral unlit preview. Do not paint bright specular streaks or ambient shadows into them.
PART II — RIGGING AND ANIMATION
9. Skeleton Standard

Use a single humanoid retarget skeleton for all normal human characters.

Required hierarchy includes:

    root

    pelvis

    spine chain of at least 4 bones

    neck and head

    clavicles

    upper/lower arms

    hands

    finger chains

    upper/lower legs

    feet and toes

    jaw

    eyes

    optional facial blend shapes or facial bones

    weapon sockets

    robe/cape/hair secondary bones

Required sockets:

SOCKET_HAND_R, SOCKET_HAND_L, SOCKET_BACK_CENTER, SOCKET_BACK_L, SOCKET_BACK_R, SOCKET_WAIST_L, SOCKET_WAIST_R, SOCKET_HEAD_TOP, SOCKET_FACE, SOCKET_CHEST, SOCKET_SHOULDER_L, SOCKET_SHOULDER_R, SOCKET_FX_PALM_L, SOCKET_FX_PALM_R, SOCKET_FX_CHEST, SOCKET_FX_FEET, SOCKET_FX_WEAPON.

Skinning:

    Maximum four bone influences per vertex unless the engine proves a higher limit is safe.

    Normalize all weights.

    No unweighted vertices.

    No hidden scale animation on deform bones.

    Maintain consistent bind pose across all modular garments.

    Cloth and hair physics bones must have deterministic names and declared parent bones.

10. Animation Set

Every character set must contain:

    locomotion: idle, relaxed idle variants, walk, jog, run, sprint, strafe, turn-in-place, start/stop, jump, fall, land, crouch

    traversal: step-up, mantle, climb, ladder, swim, underwater swim, controlled flight, fast flight, hover, landing from flight

    social: talk, point, bow, sit, kneel, meditate, eat, drink, craft, gather, carry, read, inspect

    combat: unarmed, one-handed sword, two-handed sword, saber, spear, staff, fan, bow if supported

    defense: block, parry, dodge in eight directions, stagger, knockdown, get-up

    techniques: palm projection, sword-wave release, divine-sense focus, artifact activation, talisman cast, formation placement, alchemy interaction

    state: injured locomotion, exhausted, poisoned, frozen, burning, stunned

    death: front, back, side, airborne, ragdoll transition

Motion must show cultivation mastery through efficiency, balance, and controlled acceleration—not constant exaggerated spinning.

Use hand motions as animation only. Do not implement hand seals as a required gameplay mechanic.
PART III — TERRAIN AND NATURAL WORLD FACTORY
11. Terrain Form Language

Terrain must read at three scales simultaneously:

    Macro scale, 256 m–8 km: mountain ranges, basins, river systems, coastlines, cloud seas, floating islands, crater fields, giant ruins.

    Meso scale, 8–256 m: cliffs, ridges, terraces, ravines, waterfalls, roads, cave mouths, cultivation fields, settlement shelves.

    Micro scale, 1 cm–8 m: rock breakup, roots, gravel, erosion, moss, cracks, small ledges, rubble, tracks, flowers.

Do not generate terrain as random noise. Every landform must have a readable geological or supernatural cause.

Examples:

    River valleys follow drainage.

    Roads choose traversable slopes and bridge choke points.

    Sects occupy defensible spiritual nodes and command views.

    Waterfalls require believable upstream water.

    Floating islands show broken underside strata, roots, chains, formations, or spiritual lift effects.

    Giant sword scars, tribulation craters, corpse mountains, and formation-cut plateaus are intentional narrative landmarks.

12. Destructible Terrain Representation

For destructible terrain, separate simulation from presentation:

    Authoritative terrain state: signed density field, sparse voxel field, or equivalent volumetric representation.

    Derived visible surface: smooth generated mesh.

    Derived collision: simplified collision mesh or distance-field collision.

    Derived navigation: rebuilt only for affected cells.

    Derived vegetation: invalidated only where terrain changes.

    Derived water boundaries: updated only when topology requires it.

Near-player surface resolution target: 0.25–0.5 m cells for ordinary terrain. Use finer detail decals or local micro-meshes for visual detail rather than making the entire world extremely dense.

Terrain edits must:

    produce continuous watertight surfaces

    avoid transparent cracks

    update collision before or atomically with the visible mesh

    preserve material assignment across new cut surfaces

    spawn debris based on material and impact energy

    respect terrain strength and cultivation-realm damage thresholds

    invalidate only affected cells/chunks

Newly exposed cut faces must use a subsurface material appropriate to soil, stone, ore, ice, bone, wood, or supernatural matter.
13. Terrain Materials

Each biome uses a layered material stack driven by slope, height, curvature, moisture, world law, and authored masks.

Required layers:

    topsoil/ground cover

    exposed earth

    base rock

    cliff face

    wet/darkened variant

    moss/lichen

    snow/ash/sand where relevant

    supernatural influence layer

    destruction cut-face layer

Prevent tiling using:

    macro color variation at 8–64 m

    medium breakup at 1–8 m

    micro normals at 2–30 cm

    tri-planar projection on steep slopes

    rotated texture sampling

    decals and clustered unique meshes at landmarks

Do not turn the world into a noisy material collage. Large shapes remain calm; detail concentrates near traversal paths, landmarks, and interactable spaces.
14. Biome Production Examples

Each biome package must include terrain materials, rock set, tree set, shrubs, ground plants, ambient particles, water treatment, sky/fog profile, creatures, structures, loot ecology, and destruction behavior.

Minimum example kits:

    Mortal River Valley

        farm terraces, pine and deciduous mix, muddy banks, slate cliffs, villages, bridges, shrines

    Cloud Immortal Peak

        pale granite, cloud waterfalls, wind-bent pines, suspended bridges, sect halls, glowing spiritual veins

    Ancient Sword Scar

        kilometre-scale cleft, vitrified rock, metallic dust, sword-intent particles, ruined watchtowers

    Alchemy Volcanic Basin

        sulfur terraces, obsidian, red grasses, geothermal pools, herb gardens, pill furnaces

    Ghost Marsh

        black water, drowned trees, corpse lanterns, pale reeds, mist layers, hidden paths

    Star Desert

        giant dunes, glass fields, meteor iron, buried cities, aurora night sky

    Spirit Ocean Archipelago

        limestone towers, coral shelves, sea caves, moving islands, ship routes, deep abyss entrances

    Frozen Tribulation Plateau

        blue ice, snow shelves, lightning scars, frozen beasts, exposed black stone

15. Vegetation Factory

Create vegetation in ecological families rather than isolated decorative assets.

For each tree species produce:

    sapling

    young

    mature A/B/C

    ancient

    dead

    fallen log

    stump

    broken/destructed

    seasonal or spiritual variant if needed

Use believable root contact. Trees must not float, intersect roads arbitrarily, or grow through structures unless narratively intended.

LOD:

    LOD0 full branch cards/meshes

    LOD1 simplified crown

    LOD2 merged crown

    LOD3 billboard/impostor

    distance shadow simplification

    wind response reduced with distance

PART IV — STRUCTURE AND PROP FACTORY
16. Universal Scale Grid

Use a 0.5 m snap grid for architecture and a 0.1 m sub-grid for props.
Element	Standard
Interior door	1.0–1.2 m wide, 2.2–2.5 m high
Grand sect door	3–8 m wide, 5–15 m high
Corridor	1.5–2.5 m domestic; 3–8 m public
Stair riser	0.15–0.18 m
Stair tread	0.28–0.34 m
Handrail	0.9–1.05 m
Ceiling	2.7–3.4 m domestic; 5–20 m ceremonial
Column spacing	3–5 m ordinary; 6–12 m monumental
Roof eave overhang	0.8–1.8 m
Village room module	3×3 m or 4×4 m
Sect hall bay	4×4 m, 6×6 m, or 8×8 m
Road	2–3 m foot path; 4–7 m cart road; 8–16 m processional
Bridge railing	1.0–1.2 m
Market stall counter	0.85–1.0 m
17. Architectural Grammar

Every kit must contain:

    foundation

    floor

    column

    beam

    bracket

    wall

    door

    window

    roof corner

    roof edge

    roof ridge

    stair

    railing

    balcony

    trim

    interior partition

    destruction pieces

    collision proxy

    LODs

Structures must be assembled according to load and hierarchy. Roofs cannot float above walls. Columns must appear to carry beams. Stone foundations must meet terrain.

Xianxia hierarchy must be visible:

    mortal cottages use simple timber, plaster, tile, and thatch

    prosperous towns add lacquer, carved stone, courtyards, signs, and denser roofs

    sect buildings use stronger axial composition, terraces, gates, symbolic motifs, formations, and views

    elder and ancestor spaces are more secluded, restrained, and spiritually charged

    imperial or immortal architecture uses monumental scale, rare materials, impossible spans, floating components, and controlled supernatural effects

Avoid making every building a palace. Contrast creates progression.
18. Required Structure Kits

    Mortal cottage and farm

    Teahouse and inn

    Apothecary and herb store

    Blacksmith and artifact workshop

    Market stalls and auction house

    Village shrine and ancestral hall

    Town wall, gate, tower, and bridge

    Sect mountain gate

    Outer disciple dormitory

    Inner disciple courtyard

    Scripture pavilion/library

    Alchemy hall

    Artifact-refining hall

    Formation tower

    Beast pen and spirit garden

    Elder residence

    Ancestor peak sanctuary

    Cliff cave abode

    Secret-realm ruin

    Immortal palace

    Floating island complex

    Ocean sect harbor

    Underwater ruin

    Star-travel platform

Each kit must include clean, aged, damaged, ruined, and spiritually transformed variants where applicable.
19. Props and Interaction Readability

Props are grouped into families:

    furniture

    food and utensils

    alchemy tools

    artifact-refining tools

    formation components

    talismans and paper goods

    weapons and racks

    books and scrolls

    storage containers

    market goods

    farming tools

    transport

    ritual objects

    signs and banners

    corpse/loot containers where appropriate

Interactable props need:

    readable silhouette

    designated interaction point

    collision

    opening/activation animation if needed

    empty/full/broken states

    icon render

    world tooltip name

    inventory dimensions/stack rules

    sound category

    VFX socket

PART V — CREATURE FACTORY
20. Creature Style Rules

Creatures combine recognizable anatomy with one dominant supernatural idea.

A design must answer:

    What real anatomy makes it believable?

    What silhouette makes it recognizable at 50 m?

    What cultivation trait changes it?

    Where do attacks originate?

    What parts can be damaged or harvested?

    How does it move on terrain, in water, or in air?

    What is its juvenile, mature, elder, corrupted, and boss form?

Avoid random horn-and-spike accumulation. Every major feature must serve locomotion, defense, attack, display, cultivation, or ecology.

Scale examples:

    rabbit/fox: 0.25–0.8 m

    wolf/tiger: 0.8–1.4 m shoulder height

    spirit bear: 1.8–3.0 m

    flying crane: 2–5 m wingspan

    serpent: 3–40 m common, 100 m+ boss

    mountain guardian: 8–30 m

    world beast: 100 m–kilometres, represented with specialized streaming and encounter logic

PART VI — LIGHTING, RENDERING, AND VFX
21. Lighting Target

Lighting must preserve material readability while creating atmosphere.

    Use a clear dominant sun/moon direction.

    Maintain readable face lighting in normal gameplay.

    Use fog to separate foreground, middle ground, and background.

    Volumetric effects must guide the eye, not obscure all geometry.

    Shadows need stable cascades and contact detail near the player.

    Bloom is restricted to genuinely bright emissive and spiritual phenomena.

    Color grading must retain natural skin tones and material separation.

    Avoid crushed blacks and clipped white clouds.

    Interior spaces need motivated windows, lanterns, braziers, crystals, or formation light.

Required lighting references:

    cool dawn with warm horizon

    clear noon

    golden sunset

    moonlit cloud sea

    rainstorm

    snowstorm

    ghost fog

    volcanic glow

    underwater caustics

    tribulation lightning

    interior lantern warmth

    secret realm unnatural sky

22. VFX Language

VFX must show power through shape, timing, and interaction rather than filling the screen with opaque particles.

    Sword intent: sharp arcs, compressed air, fine directional fragments.

    Divine sense: subtle spatial distortion, radial pressure, focused light lines, environmental reaction.

    Qi: flowing ribbons, vapor, dust lift, garment response.

    Formation: geometric world-space lines, runes, anchors, layered activation.

    Talisman: paper motion, ink illumination, burn/disintegrate sequence.

    Tribulation: volumetric cloud buildup, branching lightning, terrain scorch and deformation.

    High-realm attacks: large-scale environmental response with controlled central readability.

Every effect requires an LOD, maximum screen coverage, lifetime, overdraw budget, and color-blind readability test.
PART VII — UI STYLE AND DOM SPECIFICATION
23. UI Direction

The UI uses a clean modern cultivation-survival presentation inspired by the user’s requested No Mortal Space-like density and placement philosophy, but it must not be a pixel-for-pixel copy.

Visual language:

    dark translucent glass/ink panels

    restrained bronze, jade, silver, and spirit-blue accents

    thin borders and soft inner shadows

    sparse ornamental corners, not giant carved frames

    high-contrast readable text

    iconography based on silhouettes and simple elemental geometry

    low clutter during exploration; details expand on hover or in full menus

Do not use parchment everywhere. Do not cover the screen with ornate MMO frames.
24. Gameplay HUD at 1920×1080
DOM ID	Anchor	Nominal size	Contents
HUD_ROOT	full screen	1920×1080	Root overlay
HUD_PLAYER_STATUS	top-left 24,24	360×132	portrait, realm level, health, qi, stamina
HUD_QUEST_TRACKER	left 24,180	380×220 max	current objective and optional sub-objectives
HUD_COMPASS	top-center	620×46	direction, marked targets, distance
HUD_MINIMAP	top-right -24,24	236×236	terrain, icons, player arrow, zoom
HUD_TARGET_STATUS	top-center y=82	420×76	target name, realm, health, status
HUD_TECHNIQUE_QUICKBAR	bottom-center y=-28	620×104	6–8 techniques, cooldowns, qi costs
HUD_CONTEXT_ACTIONS	bottom-right -24,-28	300×150	interact, loot, talk, contextual commands
HUD_BUFFS	right beneath minimap	260×180	buffs/debuffs with timers
HUD_NOTIFICATION_FEED	right-center	420×220	loot, discoveries, warnings
HUD_CROSSHAIR	center	48×48	context-sensitive reticle
HUD_DAMAGE_FEEDBACK	near center	dynamic	compact directional feedback
HUD_WORLD_PROMPT	center-bottom	520×72	interaction or location prompt

Safe area: 24 px at 1080p. All placements must scale relative to viewport, not absolute-only.
25. Typography and Accessibility

At 1920×1080:

    primary body text: 18–22 px

    secondary text: 16–18 px

    headings: 24–32 px

    major location/realm title: 38–56 px

    minimum icon: 40×40 px

    normal quick-slot icon: 56–64 px

    body text contrast target: at least 4.5:1

    never place text directly on noisy scenery without backing

    allow UI scale 80%–150%

    provide color-blind-safe state icons in addition to color

    cooldowns need numeric and radial representation

    locked techniques require lock icon plus text reason

26. Technique Wheel

Hold the technique-wheel input to slow time in single-player and open a 12-slot radial selector.

First ring categories:

    cultivator attack

    cultivator defense

    body arts

    movement

    divine sense

    sword arts

    flying swords

    artifacts

    formations

    talismans

    alchemy/utilities

    summons/beasts

Selecting a category opens a sub-wheel. The wheel must be readable with mouse, keyboard, and controller.
27. Inventory and Equipment UI

Full-screen inventory uses a clean side-by-side layout:

    player inventory grid

    target/container/corpse inventory grid when looting

    equipment paper-doll panel

    eight accessory/artifact slots

    head, torso, legs, gloves, boots, inner/outer robe, belt, cape/back, main/off-hand

    separate sword collection tab for autonomous divine-sense-controlled swords

    item comparison card

    drag/drop

    shift-click transfer

    take all

    deposit all

    sort and filter

    search

    protected/favorite items

    locked quest items

    encumbrance or storage-ring capacity display

28. DOM Tree

HUD_ROOT
├── HUD_PLAYER_STATUS
│   ├── PLAYER_PORTRAIT
│   ├── PLAYER_REALM_BADGE
│   ├── PLAYER_HEALTH_BAR
│   ├── PLAYER_QI_BAR
│   └── PLAYER_STAMINA_BAR
├── HUD_QUEST_TRACKER
│   ├── QUEST_TITLE
│   └── QUEST_OBJECTIVE_LIST
├── HUD_COMPASS
│   └── COMPASS_MARKERS
├── HUD_MINIMAP
│   ├── MINIMAP_TERRAIN
│   ├── MINIMAP_PLAYER_ARROW
│   ├── MINIMAP_ICONS
│   └── MINIMAP_FRAME
├── HUD_TARGET_STATUS
├── HUD_TECHNIQUE_QUICKBAR
│   └── TECHNIQUE_SLOT_01..08
├── HUD_CONTEXT_ACTIONS
├── HUD_BUFFS
├── HUD_NOTIFICATION_FEED
├── HUD_CROSSHAIR
└── HUD_WORLD_PROMPT

Every UI element must have:

    stable ID

    parent ID

    anchor

    pivot

    z-order

    size policy

    visibility condition

    input action

    data binding

    accessibility label

    state variants

    localization-safe text bounds

PART VII-B — WORLD SCALE, STREAMING, AND OPTIMIZATION
28A. Canonical World Scale

All gameplay and asset measurements use real-world meters.
Element	Target scale
Cultivator	1.72–1.82 m canonical bases
Ordinary doorway	1.0–1.2 m wide; 2.2–2.5 m high
Domestic room	3–8 m across; 2.7–3.4 m ceiling
Public hall	8–30 m across; 5–20 m ceremonial height
Foot path	2–3 m wide
Cart road	4–7 m wide
Sect processional road	8–16 m wide
Ordinary bridge	4–20 m span
Major sect bridge	20–80 m span
Village street	6–20 m wide
Sect gate	5–15 m high ordinary; 15–40 m monumental
Pagoda	20–80 m depending on hierarchy
Cliff ledge	2 m minimum walkable width unless intentionally hazardous
Regional cliff	20–300 m
Sacred peak	200 m–6 km relative relief
Floating fragment	50 m–several kilometres
Spirit vessel	3 m skiff to city-scale platform

Scale progression must remain legible. Mortal villages need intimate spaces; sect architecture needs disciplined monumentality; immortal regions may use impossible spans and floating masses. Not every location should be enormous.
28B. Traversal Scale

The world must support multiple movement regimes without becoming visually unreadable:

    Walk: approximately 2–3 m/s.

    Sprint: approximately 6–9 m/s.

    Cultivator leap and burst movement: approximately 10–25 m/s depending on realm and technique.

    Climb and mantle: slow, contact-rich traversal.

    Sword flight: approximately 20–60 m/s in early implementations.

    Free flight: approximately 30–120 m/s depending on progression.

    High-realm regional traversal: may exceed 120 m/s and therefore requires predictive streaming, far-field landmarks, and encounter-safe transition rules.

Do not hardcode these as universal balance values; expose them to progression data. The visual rule is that paths, gates, peaks, towers, cloud layers, rivers, and faction silhouettes remain recognizable at the speed and distance where the player encounters them.
28C. Streaming Tiers

Use interest-based streaming centered on the player, camera, high-priority targets, and predicted movement corridor.
Tier	Typical range	Render	Animation	Collision	Simulation
Tier 0 — interaction	0–50 m	LOD0, full materials	full update	accurate simple/compound	full local fidelity
Tier 1 — near field	50–250 m	LOD1	reduced where safe	simplified	high fidelity
Tier 2 — mid/far field	250–1,500 m	LOD2 / clusters	sparse updates	coarse or none unless needed	abstracted medium fidelity
Tier 3 — landmarks	1.5–10 km+	HLOD, impostor, macro terrain	none/minimal	none	low-frequency state
Tier 4 — simulation only	outside rendered interest	not rendered	none	none	statistical/event-driven state

Ranges are starting points, not rigid laws. Terrain altitude, flight speed, camera FOV, combat, weather, and hardware can expand or contract them.
28D. LOD and HLOD Rules

Every major asset family requires LOD0, LOD1, LOD2, and either LOD3 or an HLOD/impostor strategy. Preserve in this order:

    silhouette

    proportion and scale cue

    landmark-specific negative space

    major material separation

    faction or biome identity

    only then secondary ornament

LOD transitions must not alter collision, nav, or authoritative state. Dithered cross-fade, temporal loading, and stable material response are preferred over obvious pop-in. HLODs may merge static structure clusters, vegetation groups, and props but must preserve doors, bridges, towers, and other gameplay-significant silhouettes.
28E. Dirty Cells, Derived Artifacts, and Atomic Activation

World cells are revisioned containers, not merely render chunks. When a command changes terrain or structures:

    Determine the precise affected cell set plus required neighbor border cells.

    Apply the authoritative transaction.

    Mark only dependent artifacts dirty: render, collision, nav, vegetation, water, occlusion, structure graph, or other registered output.

    Compile asynchronously.

    Validate watertight borders, revision equality, and dependency readiness.

    Atomically activate the complete bundle.

    Retire old GPU/physics resources safely after the swap.

Never show a hole before collision changes. Never activate new collision beneath an old visible mesh. Never activate nav for a revision that is not yet visible and collidable.
28F. Performance Budgets

Budgets are profile classes, not excuses to lower quality blindly.

    Player visible target: approximately 60k–100k triangles at LOD0 including body, hair, outfit, and visible equipment.

    Important NPC: approximately 35k–75k LOD0.

    Generic NPC: approximately 20k–45k LOD0.

    Crowd NPC: approximately 6k–15k LOD0 with aggressive distance simplification.

    Normal creature: approximately 18k–55k LOD0.

    Major boss: approximately 60k–180k LOD0 depending on screen presence.

    Hero weapon: approximately 6k–18k LOD0.

Environment performance must be measured in representative scenes rather than by per-asset triangle count alone. Track visible triangles, draw calls, material switches, shadow casters, overdraw, skinning cost, active cloth, animation evaluation, collision shapes, nav rebuild time, dirty-cell compile latency, GPU memory, and frame-time percentiles.

Primary goal: stable 60 FPS gameplay on the chosen target hardware class, with quality settings that scale down shadows, volumetrics, vegetation density, simulation presentation, and far-field detail without changing authoritative gameplay.
PART VIII — ASSET FACTORY PIPELINE


29A. The Asset Gauntlet Loop

The reference pictures are not sufficient by themselves. Every asset must survive a repeatable evidence-driven gauntlet. GLM 5.2 must run this loop until the asset passes or produces a clear blocking report.
Step 1 — Parse the brief

Create an AssetBrief containing:

    stable asset ID

    gameplay purpose

    lore/faction/biome role

    canonical dimensions

    expected viewing distances

    silhouette keywords

    materials and palette

    interaction behavior

    modular slots or snap rules

    animation/rig requirements

    destruction and repair behavior

    collision and nav requirements

    streaming and LOD class

    performance budget

    reference image IDs

    explicit rejection criteria

Do not begin final modeling when any required field is unknown.
Step 2 — Produce proof silhouettes

Render black silhouettes from gameplay camera distances and orthographic views. Compare against existing assets to prevent duplicates. Reject the concept when the subject cannot be identified quickly, when important negative spaces collapse, or when the shape depends on tiny ornament.
Step 3 — Build an in-engine scale blockout

Place the blockout beside the canonical 1.82 m male, 1.72 m female, standard doorway, stairs, camera, traversal capsule, and relevant vehicles or creatures. Validate reach, clearance, cover, jump, flight, interaction, and interior navigation.
Step 4 — Validate system architecture before polish

For characters, prove skeleton compatibility, body-hide masks, sockets, garment layering, and extreme poses. For terrain, prove density edits, watertight meshing, material continuity, collision, nav, and persistence. For structures, prove snap grid, foundations, structural support graph, damage states, repair anchors, collision, nav portals, and terrain blending. For UI, prove stable DOM IDs, anchors, scaling, data binding, and input navigation.
Step 5 — Produce the asset

Complete topology, UVs, materials, rigging, animation, cloth/hair setup, LODs, collision, nav markers, destruction states, VFX/audio sockets, icon renders, and machine-readable manifest. Source files, intermediate files, and runtime exports remain separate.
Step 6 — Integrate through the authoritative runtime

The asset must enter the world through the same World Fabric path as every other asset. No debug-only direct scene insertion is accepted as final integration. The asset must survive save/load, snapshot/restore, cell unload/reload, and revision activation.
Step 7 — Capture evidence

For each candidate, generate:

    neutral-light beauty render

    gameplay-light beauty render

    front/side/back orthographic views

    wireframe view

    flat material-ID view

    UV layout

    LOD comparison at actual switch distances

    collision visualization

    nav visualization where relevant

    destruction/repair sequence where relevant

    equipment swap and extreme-pose sheet for wearables

    frame-time, draw-call, memory, and compile-latency capture

    manifest validation result

Step 8 — Adversarial review

Run separate review roles:

    Art director: style, silhouette, material language, xianxia identity.

    Character technical artist: deformation, masks, sockets, cloth, LOD.

    Environment technical artist: scale, modularity, terrain contact, materials, destruction.

    Runtime engineer: authoritative path, revisions, jobs, resource lifetime, failure handling.

    Performance reviewer: frame time, draw calls, memory, streaming, compile spikes.

    Gameplay reviewer: interaction readability, traversal, collision, targeting, combat visibility.

    VLM parser test: can every panel and ID be correctly identified from the sheet?

    Text-only reconstruction test: can the asset be reconstructed without seeing the image?

Each reviewer returns PASS, FAIL, or BLOCKED, with evidence and exact corrective actions. A majority vote is not enough; every required discipline must pass.
Step 9 — Regression gauntlet

Test at minimum:

    clear noon

    dawn or sunset

    night

    heavy fog/cloud

    rain or snow where relevant

    close camera

    far camera

    high-speed movement

    combat effects

    equipment swap

    extreme animation poses

    destruction and repair

    save/load

    unload/reload

    low-quality settings

    target hardware performance profile

Step 10 — Approve or loop

An asset is approved only when all mandatory gates pass. Otherwise, return to the earliest failed gate rather than hiding architectural problems with extra detail. Every new correction must rerun downstream tests. The final approval record includes asset version, manifest hash, screenshots, profiler capture, reviewer results, and known limitations.
Gauntlet failure rules

Immediately reject or return for revision when:

    the asset visually conflicts with the triple-layer art style

    critical requirements exist only in image text

    a modular garment changes the canonical skeleton

    the complete underwear base cannot be shown

    body clipping is hidden by deleting source vertices permanently

    terrain edits create cracks, delayed collision, stale nav, or lost materials

    structures float, lack support logic, or cannot transition through damage states

    UI becomes unreadable against scenery or requires color alone

    LOD changes destroy silhouette or landmark identity

    the asset bypasses the authoritative runtime path

    profiling evidence is missing

29. Production Gates
Gate 1 — Brief

Define asset ID, gameplay purpose, lore, dimensions, material family, biome/faction, interaction, destruction, animation, LOD, collision, and performance class.
Gate 2 — Silhouette

Produce black silhouettes at gameplay distance. Reject assets that cannot be identified or that duplicate an existing silhouette.
Gate 3 — Blockout

Check real scale in-engine beside the canonical 1.82 m human, door, stair, weapon, and camera.
Gate 4 — Topology

Confirm deformation loops, shading, thickness, pivots, modular seams, and material assignments.
Gate 5 — UV

No unintended overlaps. Consistent texel density. Mirroring only where asymmetry is not required. Provide a second lightmap UV if the renderer needs one.
Gate 6 — Texturing

Neutral-light review, roughness review, material separation, dye masks, damage masks, and distance readability.
Gate 7 — Rigging

Bind pose, retarget test, cloth/hair behavior, sockets, weight normalization, extreme-pose test.
Gate 8 — Animation

Foot locking, hand-to-weapon alignment, root motion policy, transitions, cancellation windows, hit frames, and cloth stability.
Gate 9 — LOD/Impostor

Visual error check at actual switching distance. Preserve silhouette and material identity.
Gate 10 — Collision/Nav

Simple collision, walkable surfaces, interaction volumes, destructible state, and nav rebuild behavior.
Gate 11 — Integration

Naming, folder location, prefab/entity setup, material instances, thumbnails, icon, metadata, sound, VFX sockets.
Gate 12 — QA

Test daylight, night, fog, rain, close camera, far camera, combat, equipment swap, animation extremes, destruction, save/load, multiplayer replication if applicable, and low settings.

No asset passes by appearance alone.
30. Naming Convention

[TYPE]_[FACTION/BIOME]_[CATEGORY]_[NAME]_[VARIANT]_[LOD]

Examples:

CHR_PLAYER_BASE_M_01
CHR_SECT_CLOUD_DISCIPLE_M_03
EQP_SECT_CLOUD_OUTERROBE_WHITE_A
WPN_SWORD_JADE_RAIN_01
CRE_GHOST_MARSH_SERPENT_ELDER
STR_SECT_CLOUD_GATE_GRAND_A
PROP_ALCHEMY_FURNACE_BRONZE_02
TER_CLOUDPEAK_CLIFF_GRANITE_A
VEG_MORTALVALLEY_PINE_MATURE_B
UI_HUD_TECHNIQUE_SLOT_ACTIVE
VFX_TRIBULATION_LIGHTNING_TIER_03
ANM_SWORD_LIGHT_COMBO_01

31. Folder Convention

/Art
  /Characters
    /BaseBodies
    /NPC
    /Hair
    /Equipment
  /Creatures
  /Weapons
  /Environment
    /Terrain
    /Vegetation
    /Structures
    /Props
  /Materials
  /Textures
  /VFX
  /Animations
  /UI
/Data
  /AssetManifests
  /EquipmentDefinitions
  /BiomeDefinitions
  /StructureKits
  /UI
/Prefabs_or_Entities
/Tests
/Reference

Source files, exports, and generated runtime assets must not be mixed in one directory.
PART IX — MACHINE-READABLE ASSET EXAMPLES
32. Character Manifest Example

asset_id: CHR_PLAYER_BASE_M_01
asset_type: character_base
height_m: 1.82
style_profile: XIANXIA_TRIPLE_LAYER_V1
bind_pose: A_POSE
skeleton: SKEL_HUMANOID_XIANXIA_V1
lod_triangles: [42000, 24000, 11000, 4000]
materials:
  - MAT_SKIN_PLAYER
  - MAT_EYE_STANDARD
  - MAT_UNDERWEAR_BASE
body_hide_zones:
  - HEAD_SCALP
  - NECK
  - CHEST_UPPER
  - CHEST_LOWER
  - BACK_UPPER
  - BACK_LOWER
  - SHOULDER_L
  - SHOULDER_R
  - UPPER_ARM_L
  - UPPER_ARM_R
  - FOREARM_L
  - FOREARM_R
  - HAND_L
  - HAND_R
  - PELVIS
  - GLUTE
  - THIGH_L
  - THIGH_R
  - CALF_L
  - CALF_R
  - FOOT_L
  - FOOT_R
qa:
  extreme_pose_test: required
  equipment_swap_test: required
  cloth_collision_test: required
  lod_pop_test: required

33. Structure Manifest Example

asset_id: KIT_SECT_CLOUD_01
asset_type: modular_structure_kit
grid_m: 0.5
theme: cloud_peak_sect
materials:
  - white_plaster
  - dark_lacquered_timber
  - blue_gray_roof_tile
  - pale_granite
  - bronze
  - jade_accent
modules:
  - foundation
  - floor
  - column
  - beam
  - bracket
  - wall
  - door
  - window
  - roof_corner
  - roof_edge
  - roof_ridge
  - stair
  - railing
  - balcony
  - interior_partition
states: [clean, aged, damaged, ruined, spirit_charged]
requirements:
  collision_proxy: true
  nav_surface: true
  interior_support: true
  destruction_variants: true
  lods: 4

34. Terrain Manifest Example

asset_id: BIO_CLOUD_IMMORTAL_PEAK_01
asset_type: biome
macro_features:
  - granite_mountain_range
  - cloud_sea
  - suspended_waterfalls
  - floating_islands
meso_features:
  - sect_terraces
  - cliff_paths
  - rope_and_stone_bridges
  - cave_abodes
materials:
  - granite
  - pale_soil
  - moss
  - snow
  - wet_rock
  - spirit_vein
vegetation:
  - wind_pine
  - cloud_grass
  - white_spirit_flower
weather_profiles:
  - clear_high_altitude
  - cloud_surge
  - thunder_tribulation
destruction:
  density_cell_near_m: 0.25
  cut_face_material: granite_fresh
  debris_family: pale_granite

PART X — ACCEPTANCE TEST

The asset factory is accepted only when all of the following are true:

    A VLM can identify every panel, view, asset ID, and scale reference.

    A text-only GLM can reconstruct the same requirements from this document and YAML.

    The player can remove all equipment and display the complete underwear base model.

    Any compatible garment can be swapped without changing the skeleton or breaking animation.

    Hidden body zones prevent clipping while remaining reversible.

    Terrain, buildings, props, characters, creatures, UI, VFX, and lighting visibly belong to one shared art direction.

    The game looks painterly and high quality, not retro and not photoreal.

    The HUD is clean enough for exploration but complete enough for combat and cultivation.

    All assets have LOD, collision, material, scale, naming, and QA data.

    Gameplay beauty renders match the high-quality reference image rather than the rejected N64 wording.

    Every terrain or structure edit follows the authoritative CommandBus -> WorldRepository -> dirty-cell compile -> atomic activation path.

    No visible revision is activated with mismatched collision or navigation.

    Every approved asset has an evidence package from the gauntlet loop, not only a beauty render.

    The six reference boards remain readable visual indexes, while this document and sidecar manifests preserve exact implementation detail.