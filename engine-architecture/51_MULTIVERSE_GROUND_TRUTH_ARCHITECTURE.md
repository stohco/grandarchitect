# 51 — Multiverse Ground Truth, Visual Fidelity, and Validation Architecture

**Status:** Canonical invariant. This document amends the architecture baseline. All bible documents, engine subsystems, asset pipelines, procedural generators, the editor, and the Grand Architect must conform to this specification.

**Purpose:** Ensure that all spatial, visual, physical, temporal, behavioral, architectural, environmental, biological, supernatural, animation, VFX, audio, and gameplay representations are explicitly specified, machine-readable, measurable, traceable, and testable.

**Core principle:** You cannot guarantee literal perfection across an infinite procedural universe, but you can guarantee that every visible, physical, temporal, and behavioral result is traceable to explicit specifications, measured in consistent units, validated against references, and rejected when the engine cannot prove that it satisfies the intended design.

The bible cannot remain ordinary prose. It must become a multiverse ground-truth system that simultaneously serves as:

1. A creative design bible
2. A visual reference bible
3. A physical-scale specification
4. A simulation contract
5. A machine-readable schema
6. An asset-production standard
7. A procedural-generation grammar
8. An engine-capability specification
9. A validation and acceptance-test catalog

The engine, asset pipeline, procedural generators, editor, and Grand Architect all consume the same ground truth.

---

## §1. Hierarchy of Truth

Every claim in the bible must be classified. Otherwise the AI will mix firm requirements, aesthetic ideas, approximations, and generated details as though they were equally authoritative.

### Five truth levels

| Level | Marker | Meaning |
|-------|--------|---------|
| Canonical invariant | `[CANON]` | Cannot be changed without formally revising the universe |
| Derived requirement | `[DERIVED]` | Logically follows from one or more canonical invariants |
| Art-direction decision | `[ART]` | Deliberate visual or experiential interpretation |
| Procedural possibility | `[PROC]` | Valid range from which generated instances may vary |
| Unresolved question | `[UNRESOLVED]` | Not yet established and must not be silently invented |

### Example

> `[CANON]` The capital city is constructed for beings averaging 2.4 meters tall.
>
> `[DERIVED]` Doors, stairs, furniture, ceiling heights, weapons, and camera framing must reflect that body scale.
>
> `[ART]` The architecture should feel monumental but still inhabited.
>
> `[PROC]` Ordinary door heights may vary from 3.0 to 3.8 meters depending on region.
>
> `[UNRESOLVED]` Whether ceremonial buildings use larger symbolic proportions.

### Unresolved-question protocol

The Grand Architect must never silently convert an unresolved question into a permanent fact. Every unresolved issue needs one of these responses:

1. Ask the user
2. Preserve it as a variable
3. Create several labeled alternatives
4. Use a temporary proxy marked as noncanonical
5. Block final production until resolved

---

## §2. Authoritative Measurement System

Everything must use a consistent world metric standard. Do not let one document describe a mountain as "enormous," another asset use arbitrary Blender units, and a generator choose a different scale.

### Base units

Use meters, seconds, kilograms, radians, Kelvin, and explicit game-time units internally. The player does not need to see SI units in the UI; the engine needs them to preserve consistency.

### PhysicalSpecification interface

Every physical entry should define:

```typescript
interface PhysicalSpecification {
  dimensions: {
    widthMeters?: Range;
    heightMeters?: Range;
    depthMeters?: Range;
    diameterMeters?: Range;
    lengthMeters?: Range;
  };
  massKilograms?: Range;
  densityKgPerCubicMeter?: Range;
  speedMetersPerSecond?: Range;
  accelerationMetersPerSecondSquared?: Range;
  angularSpeedRadiansPerSecond?: Range;
  durationSeconds?: Range;
  reactionTimeSeconds?: Range;
  temperatureKelvin?: Range;
  forceNewtons?: Range;
  energyJoules?: Range;
  measurementConfidence: "exact" | "derived" | "art-directed" | "estimated";
  rationale: string;
}

interface Range {
  min: number;
  max: number;
  typical?: number;
}
```

### Scale anchors

Define familiar anchors so the AI and user can judge dimensions visually:

| Anchor | Scale |
|--------|-------|
| Human reference | 1.75 m average adult |
| Ordinary room | 3 m ceiling |
| Village house | 5–10 m wide |
| Ancient tree | 20–50 m tall |
| City gate | 15–40 m tall |
| Sect mountain | 1–6 km relief |
| Floating island | 0.5–50 km diameter |
| Cultivation world | Explicit radius and gravity model |
| Star vessel | Explicit length, interior volume, travel capability |

### Editor scale overlays

Every editor viewport must offer optional scale overlays:

- Human silhouette
- Door
- Ten-meter ruler
- One-hundred-meter grid
- Kilometer markers
- Travel-time visualization
- Object bounding dimensions

This prevents visually impressive assets from quietly being five or fifty times the intended size.

---

## §3. Physical Scale vs. Perceptual Scale

Correct measurements alone do not guarantee that something feels correctly scaled.

A kilometer-wide fortress can look like a toy if it has oversized windows, repetitive textures, insufficient surface detail, a wide field of view, overly fast camera motion, no atmospheric perspective, tiny shadow distances, or no people/objects nearby for comparison.

The bible therefore needs two scale specifications per massive object:

### Physical scale
The measurable dimensions of the object.

### Perceptual scale
The visual cues required for the player to correctly perceive those dimensions.

For every massive object, document:

- Near, medium, and far detail frequencies
- Recognizable human-scale features
- Atmospheric effects
- Texture density
- Structural subdivisions
- Camera constraints
- Movement parallax
- Sound delay or reverberation
- Shadow behavior
- LOD transition requirements
- Comparison anchors

### Example

> **OBJECT:** Celestial Mountain Gate
>
> **Physical height:** 620 meters
>
> **Perceptual requirements:**
> - Human-height doors remain visible at the base.
> - Main pillars include structural segments every 15–25 meters.
> - Far surfaces use large material variation rather than tiled microtexture.
> - Clouds may intersect the upper third.
> - Footstep-scale props exist at ground level.
> - Camera fly speed is reduced while entering the gate corridor.
> - Audio uses long reverberation and delayed distant impacts.

---

## §4. Visual Truth Packets

Every important visual concept receives a Visual Truth Packet (VTP). A VTP is not merely a paragraph saying something looks ancient, elegant, or terrifying. It contains exhaustive specification fields.

### Universal VTP fields

- Identity
- Narrative purpose
- Physical measurements
- Silhouette
- Proportions
- Construction logic
- Materials
- Surface condition
- Color and value structure
- Lighting response
- Movement
- Animation
- Sound
- VFX
- Environmental interaction
- Damage states
- LOD requirements
- Collision
- Gameplay readability
- Variations
- Forbidden interpretations
- Reference images
- Orthographic views
- Acceptance tests

### Character packet (additional fields)

- Overall height and body-mass range
- Head-to-body ratio
- Shoulder-to-hip ratio
- Limb lengths
- Hand and foot scale
- Center of mass
- Posture
- Walking stride length
- Resting stance
- Gait character
- Maximum ordinary speed
- Acceleration
- Turning speed
- Jump capability
- Flight posture
- Facial proportions
- Age markers
- Skin behavior
- Hair construction
- Clothing layering
- Armor attachment
- Equipment sockets
- Skeleton profile
- Animation range
- Injury and exhaustion presentation
- Cultivation transformations
- Silhouette at multiple distances

Descriptions like "slender," "towering," or "inhumanly graceful" need measurable interpretations.

**Example:**

> Body height: 1.92 m
> Head height ratio: 1:8.2
> Shoulder width: 0.46 m
> Average walking speed: 1.3 m/s
> Deliberate walking speed: 0.85 m/s
> Combat lateral acceleration: 8–11 m/s²
> Ordinary turn rate: 180°/s
> Combat turn rate: 540°/s

Those values can be art-directed rather than biologically realistic, but they must be explicit.

### Creature packet (additional fields)

- Anatomy
- Skeletal plausibility
- Joint limits
- Mass distribution
- Locomotion mechanics
- Foot placement
- Wing loading
- Turning radius
- Attack reach
- Feeding behavior
- Habitat
- Reproduction
- Environmental footprint
- Collision profile
- Corpse behavior
- Harvestable components

A giant flying creature should not move like a weightless hummingbird unless the metaphysics specifically explains it.

### Architecture packet (additional fields)

- Structural footprint
- Floor heights
- Wall thickness
- Door and window dimensions
- Roof pitch
- Load-bearing system
- Construction sequence
- Material sources
- Weathering
- Drainage
- Interior circulation
- Room purpose
- Furniture scale
- Cultural symbolism
- Defensive function
- Damage and collapse behavior
- Modular sockets
- Procedural variation boundaries
- Navigation and collision

Architecture should look as though it could have been constructed by its inhabitants, even when supernatural techniques were involved.

### Terrain and biome packet (additional fields)

- Elevation
- Slope distribution
- Erosion
- Hydrology
- Soil
- Rock
- Climate
- Visibility
- Dominant shapes
- Vegetation density
- Vertical layering
- Ground coverage
- Fauna
- Resource distribution
- Settlement suitability
- Movement difficulty
- Ambient motion
- Audio
- Weather
- Lighting
- Seasonal states
- Supernatural modifications

"This is a mystical forest" is insufficient. A usable entry:

> Canopy coverage: 65–80%
> Dominant tree height: 28–44 m
> Understory visibility: 20–45 m
> Ground-cover occupancy: 55–70%
> Average trunk separation: 6–11 m
> Traversal corridors: minimum 4 m clear width
> Fog base height: 0.2–1.4 m
> Fog visibility under calm weather: 80–140 m
> Spirit-light occurrence: 0–3 visible sources per 1,000 m²

---

## §5. Motion and Effect Grammar

### MotionProfile interface

Every moving entity or effect needs a motion profile:

```typescript
interface MotionProfile {
  idleBehavior: MotionDescription;
  startDelaySeconds: Range;
  accelerationCurve: CurveId;
  maximumSpeedMetersPerSecond: Range;
  decelerationCurve: CurveId;
  turnRateRadiansPerSecond: Range;
  minimumTurnRadiusMeters?: Range;
  anticipationSeconds?: Range;
  recoverySeconds?: Range;
  motionStyleTags: string[];
  cameraPresentation?: CameraMotionProfile;
}
```

### Technique example

A sword technique requires:

- Anticipation: 0.18 seconds
- Initial weapon acceleration: 90 m/s²
- Peak blade speed: 38 m/s
- Strike duration: 0.22 seconds
- Impact pause: 0.06 seconds
- Recovery: 0.35 seconds
- Projectile speed: 120 m/s
- Visible trail persistence: 0.3 seconds
- Terrain effect delay: less than 1 simulation tick

The visual effect, hit detection, animation, sound, and terrain response must agree on the same temporal structure.

### Time layers

Document time at several levels:

| Layer | Scope |
|-------|-------|
| Simulation time | Authoritative event timing |
| Animation time | Character pose and movement |
| VFX time | Particles, trails, impacts, aftermath |
| Perceived time | Camera shake, hit stop, slow motion, sound timing |
| Strategic time | Travel, cultivation, economies, history |

A technique can be physically fast but visually readable through anticipation and lingering aftermath.

---

## §6. Universal Effect and Presentation Grammar

The bible must describe techniques in a way the engine can produce them accurately.

### Forbidden: prose-only storage

Do not store only:

> Name: Heaven-Splitting Flame Palm
> Description: A mighty palm that burns the heavens.

### Required: technique packet

Store: concept, power source, body origin, cast posture, motion path, targeting mode, delivery geometry, range, speed, area, duration, damage behavior, force behavior, material interaction, terrain interaction, environmental interaction, sound, lighting, camera behavior, aftermath, counters, failure states, scaling, realm-dependent variations.

### Example

> **DELIVERY:** Expanding palm-shaped pressure surface
>
> **INITIAL WIDTH:** 1.4 m
>
> **EXPANSION RATE:** 18 m/s
>
> **MAXIMUM WIDTH:** 24 m
>
> **FORWARD VELOCITY:** 70 m/s
>
> **ACTIVE DURATION:** 1.8 s
>
> **TERRAIN RESPONSE:** Compress loose soil; fracture weak rock; scorch vegetation; leave no permanent effect on protected materials
>
> **VISUAL RULE:** The palm silhouette must remain legible for at least 0.25 s from the normal combat camera.
>
> **FORBIDDEN:** Do not represent it as a generic spherical explosion.

The `FORBIDDEN` field is crucial. Every important definition needs a forbidden-interpretations section because generative systems often converge on generic fantasy shorthand.

---

## §7. Editable Semantic Blueprints

Final meshes are not enough. Assets must retain source blueprints whenever practical.

### Blueprint types

- Character blueprint
- Creature blueprint
- Architecture blueprint
- Vegetation blueprint
- Weapon blueprint
- Terrain feature blueprint
- VFX blueprint
- Animation blueprint
- Audio blueprint
- Settlement blueprint
- Celestial-body blueprint

### Blueprint structure

A blueprint contains semantic parts. For a temple:

`foundation → central hall → side halls → courtyard → roof structure → pillars → stairs → doors → windows → ornament → damage → weathering → vegetation → interior connectivity`

Then the Architect can highlight the roof and say: *"Make this roof broader without changing the lower structure."* The Architect edits the roof parameters rather than scaling arbitrary vertices.

### Every asset preserves

- Source specification
- Generated or authored components
- Procedural seed
- Editable parameters
- Dependency graph
- Material assignments
- Skeleton or structural hierarchy
- Collision generation settings
- LOD generation settings
- Validation results
- Revision history

---

## §8. Visual Accuracy Oracle

The Grand Architect needs a dedicated service that compares intended truth with actual output.

### Oracle queries

The Visual Accuracy Oracle answers:

1. Is this the correct size?
2. Are its proportions within the approved range?
3. Does the rendered silhouette match the blueprint?
4. Are materials behaving correctly?
5. Are motions within their timing specifications?
6. Does collision match the visible surface?
7. Does the object still read correctly at gameplay distance?
8. Does it fit the culture and environment?
9. Does it violate any forbidden interpretation?

### Oracle inputs

- World-state data
- Asset metadata
- Blueprint
- Render captures
- Depth
- Normals
- Object IDs
- Animation state
- Collision
- Camera
- Lighting
- Measured dimensions
- Reference views
- Design constraints

### Oracle output (structured report)

```
Asset: mountain_gate_017
Status: rejected

Passed:
- Overall height within tolerance
- Door dimensions valid
- Collision aligned
- Materials valid
- LOD transitions within budget

Failed:
- Pillar width is 31% below approved proportion
- Repeated ornament scale makes structure appear miniature
- Main silhouette deviates from approved front view
- Fog hides the upper profile at the intended reveal distance
- Character reference scale is absent from the entrance composition
```

The AI must not be allowed to mark the asset complete while critical failures remain.

---

## §9. Reference Views and Measurement Captures

For every important asset, automatically generate:

### Static asset captures

- Front orthographic
- Side orthographic
- Rear orthographic
- Top view
- Three-quarter view
- Close-up
- Gameplay camera view
- Distant LOD view
- Human-scale comparison
- Collision overlay
- Skeleton overlay
- Material-channel views
- Neutral lighting view
- Target-environment view

### Animation captures

- Side motion view
- Front motion view
- Trajectory plot
- Foot-contact timeline
- Center-of-mass path
- Weapon-tip path
- Hitbox visualization
- Collision contacts
- Frame timing
- Slow-motion review

### Terrain captures

- Overhead view
- Elevation
- Slope
- Density slice
- Collision mesh
- Navigation
- Material distribution
- Biome density
- Line-of-sight
- Player-scale walkthrough
- Aerial view

The system measures rather than relies solely on visual judgment.

---

## §10. Golden Validation Scenes

Create standardized test scenes that every asset and system must pass.

| Scene | Purpose |
|-------|---------|
| Neutral scale studio | Baseline measurement |
| Neutral lighting studio | Material truth |
| Outdoor noon | Hard shadow, high contrast |
| Outdoor sunset | Warm directional, long shadows |
| Night | Low light, emissive dominance |
| Heavy fog | Atmospheric attenuation |
| Interior low light | Localized illumination |
| Combat arena | Gameplay readability |
| Steep terrain | Movement and collision |
| Dense forest | Occlusion and performance |
| Underwater | Distortion and audio |
| Flying camera | Aerial scale perception |
| Crowded settlement | Density and LOD |
| Large-scale celestial view | Cosmic scale |

A character may look correct in a neutral studio but fail badly under normal gameplay FOV, dynamic shadows, dense VFX, motion, extreme distance, crowded scenes, or different body proportions. Golden scenes make visual comparisons repeatable.

Each important asset has stored expected captures. Changes run visual regression tests against them.

---

## §11. Distance Bands

Every visible thing needs distance bands:

| Band | Range | What must survive |
|------|-------|-------------------|
| Inspection | 0.5–2 m | Fine details, material layers, edge construction |
| Interaction | 2–8 m | Function, material, surface condition |
| Gameplay | 8–30 m | Silhouette, action readability, VFX identity |
| Regional | 30–500 m | Mass, grouping, landmark identity |
| Celestial | 500 m+ | Macro-shape, atmosphere, light relationships |

A model can be accurate up close and completely unreadable at the normal camera distance. The bible states what information must survive each distance.

### Example: sword

> **At 1 meter:** Engraving, material layers, edge construction visible.
> **At 5 meters:** Blade width, guard profile, color family visible.
> **At 20 meters:** Recognizable silhouette and VFX identity visible.
> **During high-speed combat:** Trail identifies direction, reach, technique category.

---

## §12. Style Grammars (Not Generic Fantasy Tags)

Terms such as "xianxia," "ancient Chinese," "immortal," and "celestial" are far too broad. Each culture, faction, world, era, and craft tradition must have a design grammar.

### Grammar fields

- Preferred proportions
- Structural shapes
- Curvature
- Symmetry
- Material hierarchy
- Surface finish
- Color relationships
- Motifs
- Negative space
- Decoration density
- Craftsmanship
- Weathering
- Lighting
- Movement language
- Sound language
- Forbidden motifs
- Permitted influences
- Regional variants
- Historical evolution

### Example

> **CULTURE:** Northern Cloud Monasteries
>
> **Architecture:** Strong vertical hierarchy; narrow lower structures widening toward rooflines; exposed dark structural timber; light mineral roof surfaces; low ornament density; long horizontal eaves.
>
> **Materials:** Dark cedar, pale stone, oxidized bronze, cloud-gray ceramic.
>
> **Motion language:** Slow anticipation, minimal wasted movement, sharp final acceleration.
>
> **VFX:** Low particle density, broad mist volumes, pale desaturated light, no saturated rainbow effects.
>
> **Forbidden:** Generic gold palace surfaces, dense glowing runes, floating crystal decoration, excessively curved fantasy roofs.

Procedural generation then has specific boundaries.

---

## §13. Accuracy for Procedural Generation

A procedural generator must never generate directly from vague tags.

### Authoritative pipeline

```
World truth
  → culture grammar
    → environmental constraints
      → historical state
        → functional requirement
          → structural blueprint
            → candidate generation
              → constraint solving
                → visual preview
                  → validation
                    → accepted runtime instance
```

### Provenance retention

Every generated object must retain provenance:

- Which definitions influenced it?
- Which style grammar shaped it?
- Which generator produced it?
- Which constraints were active?
- Which seed stream was used?
- Which compromises were made?
- Which validation tests passed?

The Grand Architect must be able to click anything and explain why it looks the way it does.

---

## §14. Contradiction Detection

A giant bible will inevitably contradict itself unless continuously validated. The system must detect:

- Inconsistent scale
- Impossible travel times
- Incompatible species proportions
- Buildings too small for their users
- Weapons larger than animation reach allows
- Creatures whose wings cannot clear nearby geometry
- Planets whose gravity conflicts with movement
- Techniques whose stated speed disagrees with animation
- Rooms inaccessible through their doors
- Settlements without sufficient water or food
- VFX brighter than established art direction permits
- Material combinations impossible under the world's rules
- Asset styles appearing outside valid regions or eras

Every bible change runs validation.

---

## §15. Physical Truth vs. Supernatural Truth

Xianxia does not need to obey ordinary physics everywhere. It does need to obey its own rules.

For each supernatural exception, define:

1. What ordinary rule is being overridden?
2. What power enables the exception?
3. What limits apply?
4. What visible cues communicate the exception?
5. What happens when the power is removed?
6. How does the exception interact with other systems?

### Example: Floating mountain

> **Ordinary expectation:** Mountain mass would fall under local gravity.
>
> **Override:** Ancient spatial formation distributes effective weight into a pocket domain.
>
> **Visible cues:** Slow debris orbit; localized distortion below the mountain; formation nodes embedded along the lower surface.
>
> **Failure:** If three major nodes are destroyed, the mountain gradually loses altitude.
>
> **Gameplay:** The mountain remains physical; only its gravitational support is altered.

This creates believable supernatural phenomena rather than arbitrary spectacle.

---

## §16. Prose and Machine-Readable Counterparts

Do not write only enormous markdown documents. Each subject produces:

| Artifact | Path pattern | Purpose |
|----------|-------------|---------|
| Human-readable specification | `/docs/species/cloud_serpent.md` | Communicates intent |
| Machine-readable schema | `/data/species/cloud_serpent.json` | Drives the engine |
| Reference package | `/references/species/cloud_serpent/` | Visual references |
| Acceptance-test package | `/tests/species/cloud_serpent.spec.ts` | Proves compliance |
| Unresolved-question list | `/questions/species/cloud_serpent.yaml` | Tracks unknowns |
| Implementation dependencies | `/deps/species/cloud_serpent.txt` | Engine capabilities |

The prose communicates intent. The data drives the engine. The tests prove compliance.

---

## §17. Structured Verbosity

"Heavily verbose" means exhaustively specified, not padded with adjectives.

### The 20 questions

Every bible document answers the same questions:

1. What is it?
2. Why does it exist?
3. What is its scale?
4. What are its proportions?
5. What is it made from?
6. How is it constructed or formed?
7. How does it look?
8. How does it move?
9. How fast does it move?
10. How does it sound?
11. How does it interact with light?
12. How does it interact with terrain?
13. How does it interact with living beings?
14. How does it change over time?
15. What variations are permitted?
16. What representations are forbidden?
17. What engine capabilities does it require?
18. What assets does it require?
19. What procedural systems can alter it?
20. How is it validated?

An entry is not complete until applicable questions have answers.

---

## §18. Implementation Status Classification

The agent must classify every output:

| Status | Marker | Meaning |
|--------|--------|---------|
| Specification only | `[SPEC]` | Fully described but not implemented |
| Proxy | `[PROXY]` | Temporary placeholder |
| Prototype | `[PROTO]` | Demonstrates the concept |
| Approximation | `[APPROX]` | Deliberately compromises requirements |
| Production candidate | `[CANDIDATE]` | Believed complete; awaiting validation |
| Validated production | `[VALIDATED]` | All required tests and approvals passed |
| Rejected | `[REJECTED]` | Failed requirements |
| Blocked | `[BLOCKED]` | Current tools cannot produce it correctly |

The agent must never call a proxy "finished."

### When capability is missing

When the current engine lacks a capability required to produce an accurate result, the agent must say:

> The requested result requires capability X.
> The current engine provides only Y.
> Using Y would compromise A, B, and C.
> I recommend implementing capability X as a reusable plugin.

Then it builds the missing capability through the sandbox process.

---

## §19. Multiple AI Review Roles

The same AI that creates something must not be its only judge. Use distinct evaluation passes:

| Reviewer | Focus |
|----------|-------|
| Lore and consistency reviewer | Canon adherence, timeline, naming |
| Scale and proportion reviewer | Measurements, anchors, camera distortion |
| Technical art reviewer | Materials, meshes, LODs, performance |
| Animation reviewer | Timing, weight, readability |
| Physics reviewer | Collision, mass, force, gravity |
| Gameplay readability reviewer | Silhouette, function, feedback |
| Performance reviewer | Frame budget, draw calls, memory |
| Procedural-generation reviewer | Variation, provenance, constraint satisfaction |
| VLM visual reviewer | Automated visual analysis |
| Adversarial defect reviewer | Attempts to break and find edge cases |

Each reviewer has explicit rejection criteria. The scale reviewer does not care whether the model is beautiful — it asks: Are the measurements correct? Are comparison anchors present? Do repeated details communicate the intended scale? Are camera and FOV distorting perception? Does animation speed match body scale?

---

## §20. The Complete Accuracy Loop

Every major object, place, creature, technique, or visual system follows:

1. Establish source truth
2. Identify unresolved questions
3. Define physical measurements
4. Define perceptual requirements
5. Define visual grammar
6. Define behavior and motion
7. Define engine dependencies
8. Create blueprint
9. Create proxy
10. Review proxy in-world
11. Produce asset or generator
12. Validate geometry and proportions
13. Validate materials
14. Validate animation and speed
15. Validate collision and physics
16. Validate gameplay readability
17. Validate performance
18. Validate procedural compatibility
19. Compare against references
20. Perform adversarial visual review
21. Revise
22. Obtain user approval
23. Mark validated production

An entry is complete only when the engine can trace:

```
Source truth → specification → blueprint → implementation → generated instance → rendered presentation → validation evidence
```

---

## Implementation mandate

This document is a controlled amendment to the architecture baseline. All subsequent bible documents, engine subsystems, asset pipelines, procedural generators, editor features, and Grand Architect operations must conform to this specification. Existing documents must be retrofitted with truth-level annotations, measurement specifications, and status classifications.

The objective is not merely a large bible. The objective is a compiled, queryable, and testable multiverse specification from which the engine, procedural generators, asset pipelines, editor, and Grand Architect all derive the same reality.
