# 52 — Measurement and Scale System

**Status:** `[CANON]` Canonical invariant. Defines the single authoritative metric system for the entire engine.

**Implements:** `engine-architecture/51_MULTIVERSE_GROUND_TRUTH_ARCHITECTURE.md` §2, §3

**Purpose:** Prevent scale inconsistency across documents, assets, and generators. Every physical and temporal quantity uses explicit SI units with confidence levels.

---

## §1. Base Units

| Dimension | Unit | Symbol | Notes |
|-----------|------|--------|-------|
| Length | meter | m | Internal unit. UI may display li (里, 500m) or zhang (丈, ~3.3m) with conversion. |
| Mass | kilogram | kg | |
| Time | second | s | Simulation tick = 1/20 s. Game-time day = 86,400 s. |
| Angle | radian | rad | UI may display degrees. |
| Temperature | kelvin | K | UI may display celsius. |
| Force | newton | N | |
| Energy | joule | J | Cultivation energy (qi) uses a separate unit (qi-volt, qV) defined in doc 14. |
| Luminous intensity | candela | cd | |

### Derived units

| Quantity | Unit | In base units |
|----------|------|---------------|
| Speed | m/s | m · s⁻¹ |
| Acceleration | m/s² | m · s⁻² |
| Angular speed | rad/s | rad · s⁻¹ |
| Area | m² | m² |
| Volume | m³ | m³ |
| Density | kg/m³ | kg · m⁻³ |
| Pressure | Pa | kg · m⁻¹ · s⁻² |

---

## §2. PhysicalSpecification Interface

```typescript
interface PhysicalSpecification {
  dimensions?: {
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
  measurementConfidence: 'exact' | 'derived' | 'art-directed' | 'estimated';
  rationale: string;
}

interface Range {
  min: number;
  max: number;
  typical?: number;
}
```

### Confidence levels

| Level | Meaning | Example |
|-------|---------|---------|
| `exact` | Canonically defined exact value | "The capital wall is exactly 12 m thick" |
| `derived` | Logically follows from canon | "Door height = 2× occupant height = 2×1.2m = 2.4m" |
| `art-directed` | Deliberate visual choice, not physically derived | "Cloud serpent mass is lower than biology would suggest" |
| `estimated` | Reasonable approximation pending measurement | "Mountain relief approximately 2-4 km" |

---

## §3. Scale Anchors

The AI and user judge dimensions visually using familiar anchors. Every editor viewport offers optional scale overlays.

### Human-scale anchors

| Anchor | Scale | Notes |
|--------|-------|-------|
| Adult mortal (Cangli) | 1.68 m avg | Range 1.55–1.80 m |
| Adult mortal (northern) | 1.75 m avg | Range 1.62–1.88 m |
| Qi Induction cultivator | 1.75 m avg | Post-breakthrough height increase: +0–3 cm |
| Foundation Establishment | 1.78 m avg | Slight increase from qi densification |
| Core Formation+ | 1.80 m avg | Body refinement continues |
| Spirit beast (minor) | 1–5 m length | Cloud serpents, spirit foxes |
| Spirit beast (major) | 10–50 m length | Mountain-class beasts |
| Spirit beast (calamity) | 100–500 m length | Region-threatening entities |

### Architectural anchors

| Anchor | Scale | Notes |
|--------|-------|-------|
| Village house | 5–10 m wide, 3.5–5 m tall | Household compound |
| Village hall | 10–15 m wide, 5–7 m tall | Lineage hall, meeting hall |
| Shrine | 3–6 m wide, 4–6 m tall | Spirit shrine |
| City gate | 15–40 m tall | Defensive gatehouse |
| Sect main hall | 20–40 m wide, 10–20 m tall | Foundation-stage sect |
| Holy land temple | 50–100 m wide, 30–60 m tall | Celestial-scale architecture |

### Geographic anchors

| Anchor | Scale | Notes |
|--------|-------|-------|
| Village | 0.1–0.5 km² | Including fields |
| Town | 1–5 km² | |
| City | 10–100 km² | |
| Mountain (Cangli range) | 1–3 km relief | |
| Sect mountain | 2–6 km relief | |
| Cultivation world (mortal) | 6,000–12,000 km radius | Earth-like |
| Cultivation world (intermediate) | 50,000–200,000 km radius | Larger than Earth |
| Grotto heaven | 10–500 km interior diameter | Pocket dimension |

### Celestial anchors

| Anchor | Scale | Notes |
|--------|-------|-------|
| Floating island | 0.5–50 km diameter | |
| Star vessel | 100 m – 10 km length | Inter-world travel |
| Law Reach zone | Variable | Spatiotemporal distortion |
| Spirit Wild | Continent-scale | Uncontained wilderness |

---

## §4. Perceptual Scale Specification

Correct measurements alone do not guarantee correct perceived scale. A kilometer-wide fortress looks like a toy if it has oversized windows, repetitive textures, or no human-scale reference nearby.

### PerceptualSpec interface

```typescript
interface PerceptualSpec {
  physicalScale: PhysicalSpecification;
  perceptualRequirements: {
    detailFrequencies: {
      near: string;                   // "individual brick texture at 2m"
      medium: string;                 // "structural bays every 5-8m"
      far: string;                    // "large material variation, not tiled microtexture"
    };
    humanScaleFeatures: string;        // "doors remain visible at base"
    atmosphericEffects: string;        // "clouds intersect upper third"
    textureDensity: string;            // "50-80 texels per meter at LOD0"
    structuralSubdivisions: string;    // "pillar segments every 15-25m"
    cameraConstraints: string;         // "fly speed reduced in gate corridor"
    movementParallax: string;          // "lateral motion reveals depth"
    soundDelay: string;                // "impact sound delayed 0.5s per 170m"
    shadowBehavior: string;            // "shadow distance 2000m for mega-structures"
    lodTransitions: string;            // "LOD0 <50m, LOD1 <200m, LOD2 <1km, LOD3 <5km"
    comparisonAnchors: string;         // "footstep-scale props at ground level"
  };
}
```

### Example: Celestial Mountain Gate

```json
{
  "physicalScale": {
    "dimensions": { "heightMeters": { "typical": 620 } },
    "measurementConfidence": "art-directed",
    "rationale": "Holy-land gate; monumentally scaled for Core Formation+ cultivators"
  },
  "perceptualRequirements": {
    "detailFrequencies": {
      "near": "Individual stone blocks, door grain, pillar carving at 2m",
      "medium": "Structural bays every 15-25m; pillar segments visible",
      "far": "Large material variation zones (3-5 distinct stone types), not tiled microtexture"
    },
    "humanScaleFeatures": "Human-height doors (2.4m) remain visible at the base; stair treads are 0.2m tall",
    "atmosphericEffects": "Clouds intersect the upper third (400m+); atmospheric haze begins at 300m",
    "structuralSubdivisions": "Pillars segmented every 15-25m with visible capital bands",
    "cameraConstraints": "Camera fly speed reduced from 30 m/s to 8 m/s while entering the gate corridor",
    "soundDelay": "Footstep echo 1.5s reverb; distant impacts delayed 0.5s per 170m",
    "lodTransitions": "LOD0 <50m (full detail), LOD1 <200m (structural detail), LOD2 <1km (silhouette), LOD3 <5km (mass)",
    "comparisonAnchors": "Cultivator figures (1.8m) placed at entrance for scale; banners 3m wide"
  }
}
```

---

## §5. Editor Scale Overlays

Every editor viewport offers optional scale overlays that can be toggled:

| Overlay | Description |
|---------|-------------|
| Human silhouette | 1.75m transparent figure at cursor |
| Door reference | 2.0m door frame at cursor |
| 10m ruler | Horizontal ruler with meter marks |
| 100m grid | Ground grid with 100m cells |
| km markers | Distance markers from origin |
| Travel-time viz | Rings showing 1min, 5min, 1hr walking distance |
| Bounding dimensions | Label showing object W×H×D in meters |
| Comparison anchors | Toggle to show human/door/tree next to selected object |

### Implementation

The Live Architect Studio viewport (doc 50) implements these as toggleable overlays in the View Settings panel. The Grand Architect uses them when validating scale.

---

## §6. Contradiction Detection Rules

The measurement validator checks:

### Scale consistency
- A room inside a building cannot be larger than the building.
- A creature's stride length cannot exceed ~1.5× its leg length (unless supernatural exception is filed).
- A door must be tall enough for its occupant (door height ≥ 1.3× occupant height).

### Travel-time consistency
- `distance / speed = time` must hold. If doc A says settlement B is 50 km away, and doc B says walking speed is 1.3 m/s, then travel time must be ≥ 10.7 hours. A claim of "2 hours" is a contradiction.

### Mass/structure consistency
- A creature's mass must be supportable by its limb cross-section (unless supernatural exception filed).
- A building's height must be supportable by its wall thickness and material.

### Population/resource consistency
- A settlement of N people requires ≥ N × 0.5 kg/day food and ≥ N × 20 L/day water.
- A region's arable land must produce enough to feed its settlements.

### Temporal consistency
- A technique's stated speed must agree with its animation duration.
- A cultivation stage's stated duration must agree with the simulation tick rate.

---

## §7. Unit Display in UI

The engine uses SI units internally. The UI may display culturally appropriate units with conversion:

| Internal | UI display | Conversion |
|----------|-----------|------------|
| meters | li (里) | 1 li = 500 m |
| meters | zhang (丈) | 1 zhang ≈ 3.33 m |
| meters | chi (尺) | 1 chi ≈ 0.33 m |
| seconds | shichen (时辰) | 1 shichen = 2 hours = 7200 s |
| seconds | ke (刻) | 1 ke = 15 min = 900 s |
| kg | jin (斤) | 1 jin = 0.5 kg |

The conversion is display-only; all internal math uses SI.
