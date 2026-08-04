# 52 — Measurement and Scale System

**Status:** `[CANON]` Defines the single authoritative metric system for the entire engine.

**Implements:** `engine-architecture/51_MULTIVERSE_GROUND_TRUTH_ARCHITECTURE.md` §2, §3

---

## §1. Base Units

| Dimension | Unit | Symbol |
|-----------|------|--------|
| Length | meter | m |
| Mass | kilogram | kg |
| Time | second | s (tick = 1/20 s) |
| Angle | radian | rad |
| Temperature | kelvin | K |
| Force | newton | N |
| Energy | joule | J |
| Qi energy | qi-volt | qV (separate unit per doc 14) |

Derived: speed m/s, acceleration m/s², angular speed rad/s, area m², volume m³, density kg/m³, pressure Pa.

## §2. PhysicalSpecification Interface

```typescript
interface PhysicalSpecification {
  dimensions?: { widthMeters?: Range; heightMeters?: Range; depthMeters?: Range; diameterMeters?: Range; lengthMeters?: Range; };
  massKilograms?: Range; densityKgPerCubicMeter?: Range;
  speedMetersPerSecond?: Range; accelerationMetersPerSecondSquared?: Range;
  angularSpeedRadiansPerSecond?: Range; durationSeconds?: Range; reactionTimeSeconds?: Range;
  temperatureKelvin?: Range; forceNewtons?: Range; energyJoules?: Range;
  measurementConfidence: 'exact' | 'derived' | 'art-directed' | 'estimated';
  rationale: string;
}
interface Range { min: number; max: number; typical?: number; }
```

Confidence levels: `exact` (canonically defined), `derived` (logically follows from canon), `art-directed` (deliberate visual choice), `estimated` (approximation pending measurement).

## §3. Scale Anchors

### Human-scale
| Anchor | Scale |
|--------|-------|
| Adult mortal (Cangli) | 1.68 m avg (1.55–1.80) |
| Adult mortal (northern) | 1.75 m avg (1.62–1.88) |
| Qi Induction cultivator | 1.75 m avg (+0–3cm post-breakthrough) |
| Foundation Establishment | 1.78 m avg |
| Core Formation | 1.80 m avg |
| Nascent Soul | 1.82 m avg |
| Spirit beast (minor) | 1–5 m length |
| Spirit beast (major) | 10–50 m length |
| Spirit beast (calamity) | 100–500 m length |

### Architectural
| Anchor | Scale |
|--------|-------|
| Village house | 5–10 m wide, 3.5–5 m tall |
| Village hall | 10–15 m wide, 5–7 m tall |
| Shrine | 3–6 m wide, 4–6 m tall |
| City gate | 15–40 m tall |
| Sect main hall | 20–40 m wide, 10–20 m tall |
| Holy land temple | 50–100 m wide, 30–60 m tall |

### Geographic
| Anchor | Scale |
|--------|-------|
| Village | 0.1–0.5 km² |
| Town | 1–5 km² |
| City | 10–100 km² |
| Mountain (Cangli) | 1–3 km relief |
| Sect mountain | 2–6 km relief |
| Cultivation world (mortal) | 6,000–12,000 km radius |
| Cultivation world (intermediate) | 50,000–200,000 km radius |
| Grotto heaven | 10–500 km interior diameter |

### Celestial
| Anchor | Scale |
|--------|-------|
| Floating island | 0.5–50 km diameter |
| Star vessel | 100 m – 10 km length |
| Law Reach zone | Variable (spatiotemporal distortion) |
| Spirit Wild | Continent-scale |

## §4. Perceptual Scale Specification

```typescript
interface PerceptualSpec {
  physicalScale: PhysicalSpecification;
  perceptualRequirements: {
    detailFrequencies: { near: string; medium: string; far: string; };
    humanScaleFeatures: string;
    atmosphericEffects: string;
    textureDensity: string;
    structuralSubdivisions: string;
    cameraConstraints: string;
    movementParallax: string;
    soundDelay: string;
    shadowBehavior: string;
    lodTransitions: string;
    comparisonAnchors: string;
  };
}
```

Example — Celestial Mountain Gate (620m): human-height doors visible at base, pillar segments every 15–25m, large material variation (not tiled microtexture), clouds intersect upper third, camera fly speed reduced in gate corridor, 1.5s reverb, LOD0 <50m / LOD1 <200m / LOD2 <1km / LOD3 <5km, cultivator figures at entrance for scale.

## §5. Editor Scale Overlays

| Overlay | Description |
|---------|-------------|
| Human silhouette | 1.75m transparent figure at cursor |
| Door reference | 2.0m door frame |
| 10m ruler | Horizontal ruler with meter marks |
| 100m grid | Ground grid with 100m cells |
| km markers | Distance markers from origin |
| Travel-time viz | Rings showing 1min/5min/1hr walking distance |
| Bounding dimensions | Label showing W×H×D in meters |
| Comparison anchors | Human/door/tree next to selected object |

## §6. Contradiction Detection Rules

Scale: room inside building cannot be larger. Travel-time: distance/speed must hold. Mass/structure: limb cross-section must support mass. Population/resource: N people need N×0.5kg/day food and N×20L/day water. Temporal: technique speed must agree with animation duration.

## §7. Unit Display in UI

| Internal | UI display | Conversion |
|----------|-----------|------------|
| meters | li (里) | 1 li = 500 m |
| meters | zhang (丈) | 1 zhang ≈ 3.33 m |
| seconds | shichen (时辰) | 1 shichen = 2 hours |
| kg | jin (斤) | 1 jin = 0.5 kg |

Conversion is display-only; all internal math uses SI.
