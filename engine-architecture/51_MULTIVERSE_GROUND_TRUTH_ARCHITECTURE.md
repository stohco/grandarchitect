# 51 — Multiverse Ground Truth, Visual Fidelity, and Validation Architecture

**Status:** `[CANON]` Canonical invariant. This document amends the architecture baseline. All bible documents, engine subsystems, asset pipelines, procedural generators, the editor, and the Grand Architect must conform to this specification.

**Purpose:** Ensure that all spatial, visual, physical, temporal, behavioral, architectural, environmental, biological, supernatural, animation, VFX, audio, and gameplay representations are explicitly specified, machine-readable, measurable, traceable, and testable.

**Core principle:** You cannot guarantee literal perfection across an infinite procedural universe, but you can guarantee that every visible, physical, temporal, and behavioral result is traceable to explicit specifications, measured in consistent units, validated against references, and rejected when the engine cannot prove that it satisfies the intended design.

The bible cannot remain ordinary prose. It must become a multiverse ground-truth system that simultaneously serves as: a creative design bible; a visual reference bible; a physical-scale specification; a simulation contract; a machine-readable schema; an asset-production standard; a procedural-generation grammar; an engine-capability specification; a validation and acceptance-test catalog.

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

The Grand Architect must never silently convert an unresolved question into a permanent fact. Every unresolved issue needs one of: ask the user; preserve as variable; create labeled alternatives; use a temporary proxy marked noncanonical; block final production until resolved.

## §2. Authoritative Measurement System

Everything must use a consistent world metric standard. Use meters, seconds, kilograms, radians, Kelvin, and explicit game-time units internally.

### PhysicalSpecification interface

```typescript
interface PhysicalSpecification {
  dimensions: { widthMeters?: Range; heightMeters?: Range; depthMeters?: Range; diameterMeters?: Range; lengthMeters?: Range; };
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
```

### Scale anchors

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

Every editor viewport must offer optional scale overlays: human silhouette, door, 10m ruler, 100m grid, km markers, travel-time viz, bounding dimensions.

## §3. Physical Scale vs. Perceptual Scale

Correct measurements alone do not guarantee correct perceived scale. A kilometer-wide fortress can look like a toy if it has oversized windows, repetitive textures, or no human-scale reference nearby.

For every massive object, document: near/medium/far detail frequencies; recognizable human-scale features; atmospheric effects; texture density; structural subdivisions; camera constraints; movement parallax; sound delay; shadow behavior; LOD transitions; comparison anchors.

## §4. Visual Truth Packets

Every important visual concept receives a Visual Truth Packet (VTP). A VTP is not merely a paragraph saying something looks ancient, elegant, or terrifying. It contains: identity, narrative purpose, physical measurements, silhouette, proportions, construction logic, materials, surface condition, color and value structure, lighting response, movement, animation, sound, VFX, environmental interaction, damage states, LOD requirements, collision, gameplay readability, variations, **forbidden interpretations**, reference images, orthographic views, acceptance tests.

Character packets include: body height/mass, head-to-body ratio, limb lengths, stride length, walking/max speed, acceleration, turn rate, jump capability, posture, gait character, facial proportions, clothing layering, equipment sockets, skeleton profile, animation range, injury/exhaustion presentation, cultivation transformations, silhouette at multiple distances.

Creature packets add: anatomy, skeletal plausibility, joint limits, mass distribution, locomotion mechanics, foot placement, wing loading, turning radius, attack reach, feeding behavior, habitat, reproduction, collision profile, corpse behavior, harvestable components.

Architecture packets include: structural footprint, floor heights, wall thickness, door/window dimensions, roof pitch, load-bearing system, construction sequence, material sources, weathering, drainage, interior circulation, room purposes, furniture scale, cultural symbolism, defensive function, damage/collapse behavior, modular sockets, procedural variation boundaries, navigation and collision.

Terrain/biome packets include: elevation, slope distribution, erosion, hydrology, soil, rock, climate, visibility, dominant shapes, vegetation density, vertical layering, ground coverage, fauna, resource distribution, settlement suitability, movement difficulty, ambient motion, audio, weather, lighting, seasonal states, supernatural modifications.

## §5. Motion and Effect Grammar

Every moving entity or effect needs a MotionProfile: idleBehavior, startDelaySeconds, accelerationCurve, maximumSpeedMetersPerSecond, decelerationCurve, turnRateRadiansPerSecond, minimumTurnRadiusMeters, anticipationSeconds, recoverySeconds, motionStyleTags, cameraPresentation.

The visual effect, hit detection, animation, sound, and terrain response must agree on the same temporal structure. Time layers: simulation time, animation time, VFX time, perceived time, strategic time.

## §6. Universal Effect and Presentation Grammar

Techniques must not be stored as prose only. Store: concept, power source, body origin, cast posture, motion path, targeting mode, delivery geometry, range, speed, area, duration, damage behavior, force behavior, material interaction, terrain interaction, environmental interaction, sound, lighting, camera behavior, aftermath, counters, failure states, scaling, realm-dependent variations. Every technique needs a `FORBIDDEN` field — generative systems converge on generic fantasy shorthand without explicit prohibitions.

## §7. Editable Semantic Blueprints

Final meshes are not enough. Assets must retain source blueprints with semantic parts. A temple blueprint: foundation → central hall → side halls → courtyard → roof structure → pillars → stairs → doors → windows → ornament → damage → weathering → vegetation → interior connectivity. The Architect edits roof parameters rather than scaling arbitrary vertices. Every asset preserves: source specification, generated components, procedural seed, editable parameters, dependency graph, material assignments, skeleton/structural hierarchy, collision settings, LOD settings, validation results, revision history.

## §8. Visual Accuracy Oracle

A dedicated service compares intended truth with actual output. It answers: Is this the correct size? Are proportions within range? Does silhouette match blueprint? Are materials correct? Are motions within timing specs? Does collision match visible surface? Does it read correctly at gameplay distance? Does it fit culture/environment? Does it violate any forbidden interpretation?

Output is a structured report with passed/failed checks and severity levels. The AI must not mark an asset complete while critical failures remain.

## §9. Reference Views and Measurement Captures

For every important asset, generate: front/side/rear/top orthographic, three-quarter, close-up, gameplay camera, distant LOD, human-scale comparison, collision overlay, skeleton overlay, material-channel views, neutral lighting, target-environment view. For animations: trajectory plot, foot-contact timeline, center-of-mass path, weapon-tip path, hitbox viz, frame timing, slow-motion review. For terrain: overhead, elevation, slope, density slice, collision mesh, navigation, biome density, line-of-sight.

## §10. Golden Validation Scenes

Standardized test scenes: neutral scale studio, neutral lighting, outdoor noon, outdoor sunset, night, heavy fog, interior low light, combat arena, steep terrain, dense forest, underwater, flying camera, crowded settlement, large-scale celestial view. Each important asset has stored expected captures. Changes run visual regression tests.

## §11. Distance Bands

| Band | Range | What must survive |
|------|-------|-------------------|
| Inspection | 0.5–2 m | Fine details, material layers, edge construction |
| Interaction | 2–8 m | Function, material, surface condition |
| Gameplay | 8–30 m | Silhouette, action readability, VFX identity |
| Regional | 30–500 m | Mass, grouping, landmark identity |
| Celestial | 500 m+ | Macro-shape, atmosphere, light relationships |

## §12. Style Grammars

Terms like "xianxia," "ancient Chinese," "immortal" are too broad. Each culture/faction/world/era/craft tradition must have a design grammar specifying: preferred proportions, structural shapes, curvature, symmetry, material hierarchy, surface finish, color relationships, motifs, negative space, decoration density, craftsmanship, weathering, lighting, movement language, sound language, **forbidden motifs**, permitted influences, regional variants, historical evolution.

## §13. Procedural Generation Accuracy

Pipeline: world truth → culture grammar → environmental constraints → historical state → functional requirement → structural blueprint → candidate generation → constraint solving → visual preview → validation → accepted runtime instance. Every generated object retains provenance: which definitions influenced it, which grammar shaped it, which generator produced it, which constraints were active, which seed stream was used, which compromises were made, which tests passed.

## §14. Contradiction Detection

Detect: inconsistent scale, impossible travel times, incompatible species proportions, buildings too small for users, weapons larger than animation reach, creatures whose wings cannot clear geometry, planets whose gravity conflicts with movement, techniques whose speed disagrees with animation, rooms inaccessible through doors, settlements without sufficient water/food, VFX brighter than art direction permits, impossible material combinations, styles appearing outside valid regions/eras.

## §15. Physical Truth vs. Supernatural Truth

Xianxia does not need to obey ordinary physics everywhere. It does need to obey its own rules. For each supernatural exception, define: what ordinary rule is overridden, what power enables the exception, what limits apply, what visible cues communicate it, what happens when power is removed, how it interacts with other systems.

## §16. Prose and Machine-Readable Counterparts

Each subject produces: human-readable specification (markdown), machine-readable schema (JSON), reference package, acceptance-test package, unresolved-question list, implementation dependencies.

## §17. Structured Verbosity

"Heavily verbose" means exhaustively specified, not padded with adjectives. Every bible document answers: What is it? Why does it exist? What is its scale? Proportions? Made from? Constructed how? Looks how? Moves how? How fast? Sounds how? Interacts with light/terrain/living beings? Changes over time? Permitted variations? Forbidden representations? Required engine capabilities? Required assets? Procedural systems? How validated? What's unresolved?

## §18. Implementation Status Classification

| Status | Meaning |
|--------|---------|
| `[SPEC]` | Fully described but not implemented |
| `[PROXY]` | Temporary placeholder |
| `[PROTO]` | Demonstrates the concept |
| `[APPROX]` | Deliberately compromises requirements |
| `[CANDIDATE]` | Believed complete; awaiting validation |
| `[VALIDATED]` | All tests and approvals passed |
| `[REJECTED]` | Failed requirements |
| `[BLOCKED]` | Current tools cannot produce it correctly |

Never call a proxy "finished." When capability is missing, explain the gap and propose building the missing capability as a reusable plugin.

## §19. Multiple AI Review Roles

The same AI that creates something must not be its only judge. Reviewers: lore/consistency, scale/proportion, technical art, animation, physics, gameplay readability, performance, procedural-generation, VLM visual, adversarial defect. Each has explicit rejection criteria.

## §20. The Complete Accuracy Loop

1. Establish source truth → 2. Identify unresolved questions → 3. Define physical measurements → 4. Define perceptual requirements → 5. Define visual grammar → 6. Define behavior and motion → 7. Define engine dependencies → 8. Create blueprint → 9. Create proxy → 10. Review proxy in-world → 11. Produce asset/generator → 12. Validate geometry → 13. Validate materials → 14. Validate animation/speed → 15. Validate collision/physics → 16. Validate gameplay readability → 17. Validate performance → 18. Validate procedural compatibility → 19. Compare against references → 20. Adversarial visual review → 21. Revise → 22. Obtain user approval → 23. Mark validated production.

An entry is complete only when the engine can trace: Source truth → specification → blueprint → implementation → generated instance → rendered presentation → validation evidence.
