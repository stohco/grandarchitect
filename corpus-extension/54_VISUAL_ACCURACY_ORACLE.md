# 54 — Visual Accuracy Oracle

**Status:** `[CANON]` Canonical invariant. Defines the service that compares intended ground truth with actual runtime output.

**Implements:** `engine-architecture/51_MULTIVERSE_GROUND_TRUTH_ARCHITECTURE.md` §8, §9, §10, §11, §19

**Purpose:** The Grand Architect must never mark an asset "validated" while critical visual failures remain. The Oracle is the automated judge.

---

## §1. Oracle Scope

The Visual Accuracy Oracle answers nine questions for every asset, generated instance, and rendered presentation:

1. Is this the correct size?
2. Are its proportions within the approved range?
3. Does the rendered silhouette match the blueprint?
4. Are materials behaving correctly?
5. Are motions within their timing specifications?
6. Does collision match the visible surface?
7. Does the object still read correctly at gameplay distance?
8. Does it fit the culture and environment?
9. Does it violate any forbidden interpretation?

---

## §2. Oracle Inputs

```typescript
interface OracleInput {
  // ---- Source truth ----
  vtp: VisualTruthPacket;              // the approved specification
  blueprint: BlueprintSpec;            // the semantic structure
  styleGrammar: StyleGrammar;          // the cultural boundary

  // ---- Runtime state ----
  worldState: WorldStateSample;
  assetMetadata: AssetMetadata;
  renderCapture: {
    colorBuffer: ArrayBuffer;
    depthBuffer: ArrayBuffer;
    normalBuffer: ArrayBuffer;
    objectIdBuffer: ArrayBuffer;
    camera: CameraState;
    lighting: LightingState;
  };

  // ---- Measurements ----
  measuredDimensions: {
    widthMeters: number;
    heightMeters: number;
    depthMeters: number;
    boundingBox: AABB;
  };

  // ---- Animation (if applicable) ----
  animationState?: {
    currentFrame: number;
    trajectory: Vec3[];
    speedMetersPerSecond: number;
    durationSeconds: number;
  };

  // ---- Collision ----
  collisionMesh: CollisionMesh;

  // ---- References ----
  referenceViews: ReferenceView[];
  designConstraints: Constraint[];
}
```

---

## §3. Oracle Output

```typescript
interface OracleReport {
  assetId: string;
  status: 'accepted' | 'rejected' | 'conditional';
  timestamp: string;

  passed: OracleCheck[];
  failed: OracleCheck[];
  warnings: OracleWarning[];

  verdict: string;                     // human-readable summary
  recommendedActions: string[];
}

interface OracleCheck {
  checkName: string;
  passed: boolean;
  message: string;
  measuredValue?: string;
  expectedValue?: string;
  deviation?: number;                  // percentage
  severity: 'critical' | 'major' | 'minor';
}
```

### Example report

```
Asset: mountain_gate_017
Status: rejected

Passed:
- Overall height within tolerance (620m measured, 620m expected)
- Door dimensions valid (2.4m measured, 2.4m expected)
- Collision aligned (deviation <0.1m)
- Materials valid (dark cedar, pale granite, oxidized bronze)
- LOD transitions within budget

Failed:
- [CRITICAL] Pillar width is 31% below approved proportion
  (measured 0.8m, expected 1.16m, deviation -31%)
- [MAJOR] Repeated ornament scale makes structure appear miniature
  (ornament at 0.3m height, expected 1.5m)
- [MAJOR] Main silhouette deviates from approved front view
  (silhouette IoU 0.62, expected >0.85)
- [MINOR] Fog hides the upper profile at the intended reveal distance
  (fog density 0.8 at 300m, expected 0.3)
- [MINOR] Character reference scale is absent from the entrance composition
```

---

## §4. Check Catalog

### Scale checks

| Check | Method | Severity |
|-------|--------|----------|
| `scale.height-within-tolerance` | Compare measured height to VTP range | critical |
| `scale.width-within-tolerance` | Compare measured width | critical |
| `scale.proportion-ratio` | Check width:height, depth:height ratios | major |
| `scale.comparison-anchor-present` | Verify human/door/tree reference exists in scene | minor |

### Silhouette checks

| Check | Method | Severity |
|-------|--------|----------|
| `silhouette.front-view-match` | IoU of front orthographic vs reference | major |
| `silhouette.side-view-match` | IoU of side orthographic vs reference | major |
| `silhouette.gameplay-distance-readable` | Silhouette legibility at 20m | major |

### Material checks

| Check | Method | Severity |
|-------|--------|----------|
| `material.palette-match` | Compare color palette to VTP | major |
| `material.surface-finish` | Check roughness/metalness match | minor |
| `material.weathering-consistent` | Weathering pattern matches style grammar | minor |

### Motion checks

| Check | Method | Severity |
|-------|--------|----------|
| `motion.speed-within-range` | Measured speed vs MotionProfile range | critical |
| `motion.acceleration-within-range` | Measured acceleration vs profile | major |
| `motion.timing-synchronized` | Animation, VFX, audio, hitbox timing agree | critical |
| `motion.anticipation-present` | Anticipation phase exists if required | major |

### Collision checks

| Check | Method | Severity |
|-------|--------|----------|
| `collision.aligned-with-visible-surface` | Collision mesh matches render mesh within 0.1m | critical |
| `collision.doors-navigable` | Door collision allows passage | critical |
| `collision.no-torn-state` | Render and collision revisions match (doc 51 §terrain-atomicity) | critical |

### Distance-band checks

| Check | Method | Severity |
|-------|--------|----------|
| `distance.inspection-readable` | Detail survives at 1m | minor |
| `distance.interaction-readable` | Function/material readable at 5m | major |
| `distance.gameplay-readable` | Silhouette readable at 20m | major |
| `distance.regional-readable` | Mass/grouping readable at 100m+ | minor |

### Style-grammar checks

| Check | Method | Severity |
|-------|--------|----------|
| `style.no-forbidden-motifs` | Scan for forbidden patterns | critical |
| `style.material-hierarchy-correct` | Material order matches grammar | major |
| `style.color-relationship-correct` | Color palette within grammar | major |
| `style.decoration-density-correct` | Decoration level within grammar | minor |

---

## §5. Golden Validation Scenes

Every important asset must pass through standardized test scenes. Each scene has defined lighting, camera, and environment parameters.

| Scene ID | Environment | Purpose |
|----------|-------------|---------|
| `neutral-scale-studio` | Neutral 3-point lighting, grey backdrop, no environment | Baseline measurement |
| `neutral-lighting-studio` | Neutral HDRI, no directional | Material truth |
| `outdoor-noon` | Sun 90°, 8000 lux, hard shadows | High-contrast readability |
| `outdoor-sunset` | Sun 5°, 2000 lux, warm 2700K, long shadows | Warm directional |
| `night` | Moonlight 0.2 lux, 4100K, emissive dominance | Low-light readability |
| `heavy-fog` | 80% fog density at 50m | Atmospheric attenuation |
| `interior-low-light` | Single oil lamp, 50 lux | Localized illumination |
| `combat-arena` | Flat arena, noon, 2 combatants | Gameplay readability |
| `steep-terrain` | 30° slope, rocky | Movement and collision |
| `dense-forest` | 75% canopy, Spirit Wild biome | Occlusion and performance |
| `underwater` | 5m depth, blue attenuation | Distortion and audio |
| `flying-camera` | Aerial 200m altitude | Aerial scale perception |
| `crowded-settlement` | 50+ NPCs, 20+ buildings | Density and LOD |
| `celestial-view` | 5km+ distance, atmosphere on | Cosmic scale |

### Expected captures

Each asset has stored expected captures per applicable golden scene. Changes run visual regression tests:

```typescript
interface ExpectedCapture {
  sceneId: string;
  assetId: string;
  captureHash: string;               // SHA-256 of the reference image
  captureDate: string;
  tolerance: number;                  // max acceptable IoU deviation
}
```

If a change produces a capture whose IoU with the expected capture falls below tolerance, the regression test fails.

---

## §6. Distance-Band Validation

Every asset is rendered at five distance bands and checked for required readability:

```typescript
interface DistanceBandCheck {
  band: 'inspection' | 'interaction' | 'gameplay' | 'regional' | 'celestial';
  distanceMeters: number;
  requiredReadable: string;           // what must survive at this distance
  measuredReadable: string;           // what the oracle detected
  passed: boolean;
}
```

### Example: Sword at distance bands

| Band | Distance | Required | Method |
|------|----------|----------|--------|
| Inspection | 1 m | Engraving, material layers, edge construction | Render at 1m, VLM describes detail |
| Interaction | 5 m | Blade width, guard profile, color family | Render at 5m, VLM describes |
| Gameplay | 20 m | Silhouette, VFX identity | Render at 20m, silhouette IoU check |
| Regional | 100 m | Weapon class identifiable | Render at 100m, VLM classifies |
| Celestial | N/A | N/A (sword is not a celestial-scale object) | Skip |

---

## §7. Reference View Generation

For every important asset, the system automatically generates and stores:

### Static views
- Front orthographic
- Side orthographic
- Rear orthographic
- Top view
- Three-quarter view
- Close-up (1m)
- Gameplay camera view (20m)
- Distant LOD view (100m)
- Human-scale comparison (asset next to 1.75m silhouette)
- Collision overlay (render mesh + collision mesh)
- Skeleton overlay (rig structure)
- Material-channel views (albedo, normal, roughness, metallic, emissive)
- Neutral lighting view
- Target-environment view (in the asset's intended biome)

### Animation views
- Side motion view
- Front motion view
- Trajectory plot (center of mass path)
- Foot-contact timeline
- Weapon-tip path (if applicable)
- Hitbox visualization
- Collision contacts
- Frame timing chart
- Slow-motion review (0.25× speed)

### Terrain views
- Overhead view
- Elevation map
- Slope map
- Density slice
- Collision mesh
- Navigation mesh
- Material distribution
- Biome density
- Line-of-sight analysis
- Player-scale walkthrough
- Aerial view

---

## §8. Reviewer Roles

The Oracle dispatches checks to specialized reviewer roles. The same AI that creates something must not be its only judge.

| Reviewer | Check domain | Rejection criteria |
|----------|-------------|-------------------|
| Lore reviewer | Canon adherence, naming, timeline | Violates a `[CANON]` claim |
| Scale reviewer | Measurements, anchors, camera | Dimensions outside VTP range |
| Technical art reviewer | Materials, meshes, LODs, perf | Material mismatch; LOD pop |
| Animation reviewer | Timing, weight, readability | Motion outside MotionProfile range |
| Physics reviewer | Collision, mass, force, gravity | Collision misaligned; mass implausible |
| Gameplay reviewer | Silhouette, function, feedback | Unreadable at gameplay distance |
| Performance reviewer | Frame budget, draw calls, memory | Exceeds PerfBudget |
| Procedural reviewer | Variation, provenance, constraints | Provenance broken; constraint violated |
| VLM visual reviewer | Automated visual analysis | VLM detects forbidden motif |
| Adversarial reviewer | Edge cases, break attempts | Finds a contradiction or exploit |

Each reviewer runs independently and produces a sub-report. The Oracle aggregates them into the final report.

---

## §9. Enforcement

The Oracle enforces its verdict:

- **`accepted`**: Asset may be marked `[VALIDATED]`.
- **`conditional`**: Asset may be marked `[CANDIDATE]` with documented warnings. Cannot be `[VALIDATED]` until warnings are resolved.
- **`rejected`**: Asset must be revised. Cannot be marked `[CANDIDATE]` or `[VALIDATED]`.

The Grand Architect cannot override a `rejected` verdict. It must fix the root cause and re-run the Oracle.

---

## §10. Oracle Implementation

The Oracle is implemented as an Architect tool (`oracle.validate`) that:

1. Collects the OracleInput (VTP, blueprint, render captures, measurements)
2. Runs each applicable check from the catalog
3. Aggregates results into an OracleReport
4. Stores the report as provenance evidence
5. Returns the verdict to the caller

The Oracle runs:
- On every asset import
- On every procedural generation
- On every blueprint edit
- On every golden-scene regression
- On-demand from the editor (right-click → "Validate with Oracle")
