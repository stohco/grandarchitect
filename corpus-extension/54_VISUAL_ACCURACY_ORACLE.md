# 54 — Visual Accuracy Oracle

**Status:** `[CANON]` Defines the service comparing intended ground truth with actual runtime output.

**Implements:** `engine-architecture/51_MULTIVERSE_GROUND_TRUTH_ARCHITECTURE.md` §8–§11, §19

---

## §1. Oracle Scope

The Visual Accuracy Oracle answers: Is this the correct size? Are proportions within range? Does silhouette match blueprint? Are materials correct? Are motions within timing specs? Does collision match visible surface? Does it read correctly at gameplay distance? Does it fit culture/environment? Does it violate any forbidden interpretation?

## §2. Oracle Inputs

```typescript
interface OracleInput {
  vtp: VisualTruthPacket;
  blueprint: BlueprintSpec;
  styleGrammar: StyleGrammar;
  worldState: WorldStateSample;
  assetMetadata: AssetMetadata;
  renderCapture: { colorBuffer; depthBuffer; normalBuffer; objectIdBuffer; camera; lighting; };
  measuredDimensions: { widthMeters; heightMeters; depthMeters; boundingBox; };
  animationState?: { currentFrame; trajectory; speedMetersPerSecond; durationSeconds; };
  collisionMesh: CollisionMesh;
  referenceViews: ReferenceView[];
  designConstraints: Constraint[];
}
```

## §3. Oracle Output

```typescript
interface OracleReport {
  assetId: string;
  status: 'accepted' | 'rejected' | 'conditional';
  passed: OracleCheck[];
  failed: OracleCheck[];
  warnings: OracleWarning[];
  verdict: string;
  recommendedActions: string[];
}
```

Example: `Asset: mountain_gate_017 · Status: rejected · Passed: height within tolerance, door dimensions valid, collision aligned · Failed: pillar width 31% below approved, ornament scale makes structure appear miniature, silhouette deviates from front view, fog hides upper profile, no character reference scale at entrance`

## §4. Check Catalog

**Scale:** height/width within tolerance (critical), proportion ratio (major), comparison anchor present (minor).

**Silhouette:** front/side view IoU match (major), gameplay-distance readability (major).

**Material:** palette match (major), surface finish (minor), weathering consistency (minor).

**Motion:** speed within range (critical), acceleration within range (major), timing synchronized (critical), anticipation present (major).

**Collision:** aligned with visible surface within 0.1m (critical), doors navigable (critical), no torn state (critical).

**Distance-band:** inspection detail (minor), interaction readability (major), gameplay readability (major), regional readability (minor).

**Style-grammar:** no forbidden motifs (critical), material hierarchy correct (major), color relationship correct (major), decoration density correct (minor).

## §5. Golden Validation Scenes

| Scene | Purpose |
|-------|---------|
| neutral-scale-studio | Baseline measurement |
| neutral-lighting-studio | Material truth |
| outdoor-noon | Hard shadow, high contrast |
| outdoor-sunset | Warm directional, long shadows |
| night | Low light, emissive dominance |
| heavy-fog | Atmospheric attenuation |
| interior-low-light | Localized illumination |
| combat-arena | Gameplay readability |
| steep-terrain | Movement and collision |
| dense-forest | Occlusion and performance |
| underwater | Distortion and audio |
| flying-camera | Aerial scale perception |
| crowded-settlement | Density and LOD |
| celestial-view | Cosmic scale |

Each important asset has stored expected captures. Changes run visual regression tests.

## §6. Distance-Band Validation

| Band | Distance | Required |
|------|----------|----------|
| Inspection | 1m | Engraving, material layers, edge construction |
| Interaction | 5m | Blade width, guard profile, color family |
| Gameplay | 20m | Silhouette, VFX identity |
| Regional | 100m | Weapon class identifiable |

## §7. Reference View Generation

**Static:** front/side/rear/top orthographic, three-quarter, close-up, gameplay camera, distant LOD, human-scale comparison, collision overlay, skeleton overlay, material-channel views, neutral lighting, target-environment.

**Animation:** side/front motion, trajectory plot, foot-contact timeline, center-of-mass path, weapon-tip path, hitbox viz, collision contacts, frame timing, slow-motion review.

**Terrain:** overhead, elevation, slope, density slice, collision mesh, navigation, material distribution, biome density, line-of-sight, player-scale walkthrough, aerial.

## §8. Reviewer Roles

| Reviewer | Focus | Rejection criteria |
|----------|-------|-------------------|
| Lore | Canon adherence, naming, timeline | Violates [CANON] claim |
| Scale | Measurements, anchors, camera | Dimensions outside VTP range |
| Technical art | Materials, meshes, LODs, perf | Material mismatch, LOD pop |
| Animation | Timing, weight, readability | Motion outside MotionProfile |
| Physics | Collision, mass, force, gravity | Collision misaligned |
| Gameplay | Silhouette, function, feedback | Unreadable at gameplay distance |
| Performance | Frame budget, draw calls, memory | Exceeds PerfBudget |
| Procedural | Variation, provenance, constraints | Provenance broken |
| VLM | Automated visual analysis | VLM detects forbidden motif |
| Adversarial | Edge cases, break attempts | Finds contradiction or exploit |

## §9. Enforcement

- `accepted`: Asset may be marked `[VALIDATED]`.
- `conditional`: Asset may be `[CANDIDATE]` with documented warnings.
- `rejected`: Asset must be revised. Cannot be `[CANDIDATE]` or `[VALIDATED]`.

The Grand Architect cannot override a `rejected` verdict.

## §10. Implementation

The Oracle runs: on every asset import, on every procedural generation, on every blueprint edit, on every golden-scene regression, and on-demand from the editor (right-click → "Validate with Oracle").
