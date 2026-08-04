# 51 — Visual Truth Packet Schema

**Status:** `[CANON]` Defines the exhaustive specification format for every visual concept.

**Implements:** `engine-architecture/51_MULTIVERSE_GROUND_TRUTH_ARCHITECTURE.md` §4

---

## §1. Universal VTP Fields

```typescript
interface VisualTruthPacket {
  id: string; name: string; type: VTPType;
  truthLevel: 'CANON' | 'DERIVED' | 'ART' | 'PROC' | 'UNRESOLVED';
  status: 'SPEC' | 'PROXY' | 'PROTO' | 'APPROX' | 'CANDIDATE' | 'VALIDATED' | 'REJECTED' | 'BLOCKED';
  narrativePurpose: string; sourceDoc: string;
  physical: PhysicalSpecification;
  silhouette: SilhouetteSpec; proportions: ProportionSpec;
  constructionLogic: string; materials: MaterialSpec[];
  surfaceCondition: string; colorAndValue: ColorSpec; lightingResponse: LightingSpec;
  movement?: MotionProfile; animation?: AnimationSpec; sound?: AudioSpec; vfx?: VFXSpec;
  environmentalInteraction: string;
  damageStates?: string[]; lodRequirements?: LODSpec[]; collision?: CollisionSpec;
  gameplayReadability?: string;
  variations?: VariationSpec;
  forbiddenInterpretations: string[];  // MANDATORY — never empty
  referenceImages?: string[]; orthographicViews?: string[];
  acceptanceTests: string[]; unresolvedQuestions: string[];
  provenance: ProvenanceSpec;
}
```

## §2. Character Packet

Body height/mass ranges, head-to-body ratio, shoulder-to-hip ratio, limb lengths, hand/foot scale, center of mass, posture, walking stride length, resting stance, gait character, max ordinary speed, acceleration, turning speed, jump capability, flight posture, facial proportions, age markers, skin behavior, hair construction, clothing layering, armor attachment, equipment sockets, skeleton profile, animation range, injury/exhaustion presentation, cultivation transformations, silhouette at multiple distances.

Example — Mortal villager: height 1.55–1.80m (1.68 typical), mass 50–78kg, head ratio 1:7.2, stride 0.65–0.85m, max speed 1.1–1.5 m/s, acceleration 2.0–3.5 m/s². Forbidden: cultivator flowing robes, glowing eyes, wuxia-hero proportions (1:9), modern footwear.

## §3. Creature Packet

Anatomy, skeletal plausibility, joint limits, mass distribution, locomotion mechanics, foot placement, wing loading, turning radius, attack reach, feeding behavior, habitat, reproduction, environmental footprint, collision profile, corpse behavior, harvestable components.

Example — Cloud Serpent: length 3–8m, mass 40–180kg, speed 8–25 m/s, wing loading 0.8–2.2 kg/m². No wings — propulsion via qi-channelled body coils. Forbidden: feathered/leathery wings, Western dragon anatomy, bat-like membranes, legs.

## §4. Architecture Packet

Structural footprint, floor heights, wall thickness, door/window dimensions, roof pitch, load-bearing system, construction sequence, material sources, weathering, drainage, interior circulation, room purposes, furniture scale, cultural symbolism, defensive function, damage/collapse behavior, modular sockets, procedural variation boundaries, navigation and collision.

Example — Household compound: 5–10m wide, 3.5–5m tall, timber frame with brick noggin, grey clay tile roof. Modular sockets: foundation, main-hall, side-room, courtyard-wall, roof-frame, roof-tiles, doors, windows. Forbidden: curved temple eaves, red pillars, gold leaf, modern materials, height >5m.

## §5. Terrain and Biome Packet

Elevation, slope distribution, erosion, hydrology, soil, rock, climate, visibility, dominant shapes, vegetation density, vertical layering, ground coverage, fauna, resource distribution, settlement suitability, movement difficulty, ambient motion, audio, weather, lighting, seasonal states, supernatural modifications.

Example — Paddy biome: elevation 10–60m, vegetation density 0.15, ground cover 0.85, hydrology irrigated from river channels 5–15cm standing water. Forbidden: paddies on slopes >8°, modern concrete channels, standing water >15cm without terraced-pond justification.

## §6. Technique / Effect Packet

Concept, power source, body origin, cast posture, motion path, targeting mode, delivery geometry, range, speed, area, duration, damage behavior, force behavior, material interaction, terrain interaction, environmental interaction, sound, lighting, camera behavior, aftermath, counters, failure states, scaling, realm-dependent variations.

Example — Heaven-Splitting Flame Palm: expanding palm-shaped pressure surface, range 15–35m, speed 60–85 m/s, duration 1.2–2.5s. Terrain: compress loose soil, fracture weak rock, scorch vegetation. Forbidden: generic spherical explosion, blue/green fire, illegible silhouette before 0.25s, full damage beyond range, omitted anticipation phase, no visible body cost.

## §7. Forbidden-Interpretation Rules

Every VTP must include a non-empty `forbiddenInterpretations` array. Common patterns: "Do not represent as a generic spherical explosion", "Do not use Western dragon anatomy for Eastern spirit beasts", "Do not apply gold palace surfaces to vernacular architecture", "Do not give mortal characters glowing eyes", "Do not use curved temple eaves on household buildings", "Do not exceed stated height range", "Do not use modern materials".

## §8. Distance-Band Readability

Every VTP specifies what information must survive at each distance band: inspection (0.5–2m), interaction (2–8m), gameplay (8–30m), regional (30–500m), celestial (500m+).
