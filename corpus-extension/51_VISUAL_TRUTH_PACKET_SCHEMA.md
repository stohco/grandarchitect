# 51 — Visual Truth Packet Schema

**Status:** `[CANON]` Canonical invariant. Defines the exhaustive specification format for every visual concept in the multiverse.

**Implements:** `engine-architecture/51_MULTIVERSE_GROUND_TRUTH_ARCHITECTURE.md` §4

**Purpose:** Replace prose-only descriptions with structured specification packets that the engine, asset pipeline, procedural generators, and Visual Accuracy Oracle can all consume.

---

## §1. Universal VTP Fields

Every Visual Truth Packet, regardless of type, includes these fields where applicable:

```typescript
interface VisualTruthPacket {
  // ---- Identity ----
  id: string;                          // unique slug
  name: string;                        // human-readable name
  type: VTPType;                       // character | creature | architecture | biome | technique | ...
  truthLevel: 'CANON' | 'DERIVED' | 'ART' | 'PROC' | 'UNRESOLVED';
  status: 'SPEC' | 'PROXY' | 'PROTO' | 'APPROX' | 'CANDIDATE' | 'VALIDATED' | 'REJECTED' | 'BLOCKED';

  // ---- Narrative ----
  narrativePurpose: string;
  sourceDoc: string;                   // e.g. "14_ECOLOGY_AND_QI.md §3.2"

  // ---- Physical ----
  physical: PhysicalSpecification;

  // ---- Visual ----
  silhouette: SilhouetteSpec;
  proportions: ProportionSpec;
  constructionLogic: string;
  materials: MaterialSpec[];
  surfaceCondition: string;
  colorAndValue: ColorSpec;
  lightingResponse: LightingSpec;

  // ---- Behavioral ----
  movement?: MotionProfile;
  animation?: AnimationSpec;
  sound?: AudioSpec;
  vfx?: VFXSpec;
  environmentalInteraction: string;

  // ---- Technical ----
  damageStates?: string[];
  lodRequirements?: LODSpec[];
  collision?: CollisionSpec;
  gameplayReadability?: string;

  // ---- Procedural ----
  variations?: VariationSpec;
  forbiddenInterpretations: string[];   // MANDATORY — never empty
  referenceImages?: string[];
  orthographicViews?: string[];

  // ---- Validation ----
  acceptanceTests: string[];
  unresolvedQuestions: string[];

  // ---- Provenance ----
  provenance: ProvenanceSpec;
}
```

---

## §2. Character Packet

```typescript
interface CharacterVTP extends VisualTruthPacket {
  type: 'character';

  // ---- Body ----
  bodyHeight: Range;                   // meters
  bodyMass: Range;                     // kilograms
  headToBodyRatio: number;             // e.g. 1/8.2
  shoulderToHipRatio: number;
  limbLengths: {
    upperArm: Range;
    forearm: Range;
    thigh: Range;
    shin: Range;
  };
  handScale: Range;                    // hand length in meters
  footScale: Range;
  centerOfMassHeight: Range;           // meters from ground

  // ---- Posture & gait ----
  posture: string;                     // "upright", "stooped", "floating"
  walkingStrideLength: Range;          // meters
  restingStance: string;
  gaitCharacter: string;               // "measured", "gliding", "predatory"
  maximumOrdinarySpeed: Range;         // m/s
  acceleration: Range;                 // m/s²
  turningSpeed: Range;                 // rad/s
  jumpCapability: Range;               // meters vertical
  flightPosture?: string;

  // ---- Face & skin ----
  facialProportions: string;
  ageMarkers: string;
  skinBehavior: string;
  hairConstruction: string;

  // ---- Equipment ----
  clothingLayering: string;
  armorAttachment: string;
  equipmentSockets: string[];          // ["left_hand", "right_hand", "waist", "back"]

  // ---- Skeleton & animation ----
  skeletonProfile: string;
  animationRange: string;
  injuryPresentation: string;
  exhaustionPresentation: string;
  cultivationTransformations?: string[];

  // ---- Distance readability ----
  silhouetteAtDistance: {
    at1m: string;
    at5m: string;
    at20m: string;
    at100m: string;
  };
}
```

### Example: Mortal villager (Wang Family Bend)

```json
{
  "id": "character-mortal-villager-cangli",
  "name": "Cangli Riverlands Mortal Villager",
  "type": "character",
  "truthLevel": "CANON",
  "status": "SPEC",

  "bodyHeight": { "min": 1.55, "max": 1.80, "typical": 1.68 },
  "bodyMass": { "min": 50, "max": 78, "typical": 62 },
  "headToBodyRatio": 7.2,
  "shoulderToHipRatio": 1.35,
  "walkingStrideLength": { "min": 0.65, "max": 0.85, "typical": 0.74 },
  "maximumOrdinarySpeed": { "min": 1.1, "max": 1.5, "typical": 1.3 },
  "acceleration": { "min": 2.0, "max": 3.5, "typical": 2.8 },
  "turningSpeed": { "min": 2.0, "max": 3.5, "typical": 2.8 },

  "gaitCharacter": "measured, slightly burdened; rural laborer's walk",
  "posture": "upright but not rigid; shoulders forward when carrying loads",

  "clothingLayering": "inner undergarment → middle robe → outer jacket; straw sandals; wide-brimmed hat in fields",
  "equipmentSockets": ["left_hand", "right_hand", "back", "waist"],

  "forbiddenInterpretations": [
    "Do not represent as a cultivator with flowing robes",
    "Do not give glowing eyes or supernatural aura",
    "Do not use wuxia-hero proportions (1:9 head ratio)",
    "Do not use modern footwear"
  ],

  "silhouetteAtDistance": {
    "at1m": "Fabric weave, skin texture, individual fingers, tool construction visible",
    "at5m": "Clothing layers, body proportion, tool type, posture visible",
    "at20m": "Human silhouette, clothing color family, tool silhouette visible",
    "at100m": "Dot on path; movement identifies as human pedestrian"
  }
}
```

---

## §3. Creature Packet

```typescript
interface CreatureVTP extends VisualTruthPacket {
  type: 'creature';

  // ---- Anatomy ----
  anatomy: string;
  skeletalPlausibility: string;
  jointLimits: string;
  massDistribution: string;

  // ---- Locomotion ----
  locomotionMechanics: string;
  footPlacement: string;
  wingLoading?: Range;                 // kg/m² for flying creatures
  turningRadius: Range;                // meters
  attackReach: Range;                  // meters

  // ---- Ecology ----
  feedingBehavior: string;
  habitat: string;
  reproduction: string;
  environmentalFootprint: string;

  // ---- Game systems ----
  collisionProfile: string;
  corpseBehavior: string;
  harvestableComponents: string[];
}
```

### Example: Cloud Serpent (minor spirit beast)

```json
{
  "id": "creature-cloud-serpent-minor",
  "name": "Minor Cloud Serpent",
  "type": "creature",
  "truthLevel": "DERIVED",
  "status": "SPEC",

  "physical": {
    "dimensions": {
      "lengthMeters": { "min": 3.0, "max": 8.0, "typical": 5.5 },
      "diameterMeters": { "min": 0.15, "max": 0.35, "typical": 0.24 }
    },
    "massKilograms": { "min": 40, "max": 180, "typical": 95 },
    "speedMetersPerSecond": { "min": 8, "max": 25, "typical": 15 },
    "measurementConfidence": "art-directed",
    "rationale": "Spirit beast; mass is lower than biological equivalent due to qi-infused buoyancy"
  },

  "wingLoading": { "min": 0.8, "max": 2.2, "typical": 1.4 },
  "turningRadius": { "min": 1.5, "max": 4.0, "typical": 2.5 },
  "attackReach": { "min": 1.0, "max": 3.0, "typical": 2.0 },

  "locomotionMechanics": "Aerial sinuous undulation; no wings — propulsion via qi-channelled body coils",
  "habitat": "Mid-altitude cloud layers above 800m elevation; descends to feed during qi-tides",
  "feedingBehavior": "Filters ambient qi and small spirit insects from cloud mass",
  "harvestableComponents": ["cloud-serpent-scale", "cloud-serpent-core", "cloud-serpent- tendon"],

  "forbiddenInterpretations": [
    "Do not represent with feathered or leathery wings — it has no wings",
    "Do not represent as a Western dragon — sinuous Eastern serpent form only",
    "Do not use bat-like wing membranes",
    "Do not give it legs"
  ]
}
```

---

## §4. Architecture Packet

```typescript
interface ArchitectureVTP extends VisualTruthPacket {
  type: 'architecture';

  // ---- Structure ----
  structuralFootprint: { widthMeters: Range; depthMeters: Range };
  floorHeights: Range[];               // per floor
  wallThickness: Range;                // meters
  doorDimensions: { heightMeters: Range; widthMeters: Range };
  windowDimensions: { heightMeters: Range; widthMeters: Range };
  roofPitch: Range;                    // degrees from horizontal

  // ---- Construction ----
  loadBearingSystem: string;
  constructionSequence: string;
  materialSources: string;
  weathering: string;
  drainage: string;

  // ---- Interior ----
  interiorCirculation: string;
  roomPurposes: string[];
  furnitureScale: string;

  // ---- Cultural ----
  culturalSymbolism: string;
  defensiveFunction: string;

  // ---- Technical ----
  damageAndCollapseBehavior: string;
  modularSockets: string[];            // semantic parts for Architect editing
  proceduralVariationBoundaries: string;
  navigationAndCollision: string;
}
```

### Example: Village household compound (Cangli Riverlands)

```json
{
  "id": "arch-village-household-cangli",
  "name": "Cangli Riverlands Household Compound",
  "type": "architecture",
  "truthLevel": "CANON",
  "status": "SPEC",

  "physical": {
    "dimensions": {
      "widthMeters": { "min": 5, "max": 10, "typical": 7 },
      "depthMeters": { "min": 4, "max": 8, "typical": 6 },
      "heightMeters": { "min": 3.5, "max": 5.0, "typical": 4.2 }
    },
    "measurementConfidence": "derived",
    "rationale": "Sized for mortal occupation (1.68m avg) with 2x ceiling clearance"
  },

  "structuralFootprint": {
    "widthMeters": { "min": 5, "max": 10 },
    "depthMeters": { "min": 4, "max": 8 }
  },
  "floorHeights": [{ "min": 2.8, "max": 3.5, "typical": 3.1 }],
  "wallThickness": { "min": 0.25, "max": 0.40, "typical": 0.32 },
  "doorDimensions": {
    "heightMeters": { "min": 1.9, "max": 2.2, "typical": 2.05 },
    "widthMeters": { "min": 0.8, "max": 1.2, "typical": 0.95 }
  },
  "roofPitch": { "min": 25, "max": 38, "typical": 30 },

  "loadBearingSystem": "Timber frame with brick noggin infill; no interior load-bearing walls",
  "constructionSequence": "foundation → timber posts → beams → roof frame → roof tiles → walls → floor → doors/windows",
  "modularSockets": ["foundation", "main-hall", "side-room", "courtyard-wall", "roof-frame", "roof-tiles", "doors", "windows"],

  "forbiddenInterpretations": [
    "Do not use curved temple eaves — this is a household, not a shrine",
    "Do not use red pillars — reserved for official/sect buildings",
    "Do not exceed 5m height — taller buildings are sect/official class",
    "Do not use stone walls — timber-frame with infill is the riverlands vernacular"
  ]
}
```

---

## §5. Terrain and Biome Packet

```typescript
interface BiomeVTP extends VisualTruthPacket {
  type: 'biome';

  // ---- Geology ----
  elevation: Range;                    // meters above sea level
  slopeDistribution: string;           // "0-15° dominant, 15-30° common on ridges"
  erosion: string;
  hydrology: string;
  soil: string;
  rock: string;

  // ---- Climate ----
  climate: string;
  weather: string;
  lighting: string;
  seasonalStates: string;

  // ---- Vegetation ----
  vegetationDensity: number;           // 0-1
  dominantTreeHeight?: Range;          // meters
  understoryVisibility: Range;         // meters
  groundCoverOccupancy: number;        // 0-1
  averageTrunkSeparation?: Range;      // meters

  // ---- Ecology ----
  fauna: string;
  resourceDistribution: string;

  // ---- Gameplay ----
  settlementSuitability: string;
  movementDifficulty: string;
  traversalCorridors?: { minWidthMeters: number };

  // ---- Presentation ----
  ambientMotion: string;
  audio: string;
  supernaturalModifications?: string;
}
```

### Example: Cangli Riverlands Paddy biome

```json
{
  "id": "biome-cangli-paddy",
  "name": "Cangli Riverlands Rice Paddy",
  "type": "biome",
  "truthLevel": "CANON",
  "status": "SPEC",

  "elevation": { "min": 10, "max": 60, "typical": 30 },
  "vegetationDensity": 0.15,
  "groundCoverOccupancy": 0.85,
  "understoryVisibility": { "min": 80, "max": 200, "typical": 120 },

  "hydrology": "Irrigated from river channels; standing water 5-15cm depth during growing season",
  "soil": "Alluvial clay loam, high water retention",
  "climate": "Subtropical monsoon; 1200-1600mm annual rainfall; hot humid summers, mild winters",

  "settlementSuitability": "High — flat, watered, fertile. Primary settlement zone.",
  "movementDifficulty": "Low on paths; moderate off-path due to bunds and water",
  "traversalCorridors": { "minWidthMeters": 1.2 },

  "forbiddenInterpretations": [
    "Do not place paddies on slopes > 8° — terracing is a separate biome",
    "Do not use modern concrete irrigation channels — earth and timber only",
    "Do not exceed 15cm standing water depth without explicit terraced-pond justification"
  ]
}
```

---

## §6. Technique / Effect Packet

```typescript
interface TechniqueVTP extends VisualTruthPacket {
  type: 'technique';

  // ---- Concept ----
  concept: string;
  powerSource: string;                 // qi type, realm, formation
  bodyOrigin: string;                  // dantian, meridian, palm, sword
  castPosture: string;
  motionPath: string;
  targetingMode: string;

  // ---- Delivery ----
  deliveryGeometry: string;            // "expanding palm-shaped pressure surface"
  range: Range;                        // meters
  speed: Range;                        // m/s
  area: Range;                         // square meters
  duration: Range;                     // seconds

  // ---- Interaction ----
  damageBehavior: string;
  forceBehavior: string;
  materialInteraction: string;
  terrainInteraction: string;
  environmentalInteraction: string;

  // ---- Presentation ----
  sound: string;
  lighting: string;
  cameraBehavior: string;
  aftermath: string;

  // ---- Combat ----
  counters: string;
  failureStates: string;
  scaling: string;                     // how it changes with realm
  realmDependentVariations: string;
}
```

### Example: Heaven-Splitting Flame Palm

```json
{
  "id": "technique-heaven-splitting-flame-palm",
  "name": "Heaven-Splitting Flame Palm (裂天焰掌)",
  "type": "technique",
  "truthLevel": "ART",
  "status": "SPEC",

  "concept": "A palm strike that channels fire-aspect qi into an expanding pressure surface",
  "powerSource": "Fire-aspect qi from the lower dantian, Qi Condensation realm minimum",
  "bodyOrigin": "Right palm, projected forward",
  "deliveryGeometry": "Expanding palm-shaped pressure surface",
  "range": { "min": 15, "max": 35, "typical": 24 },
  "speed": { "min": 60, "max": 85, "typical": 70 },
  "area": { "min": 2, "max": 30, "typical": 12 },
  "duration": { "min": 1.2, "max": 2.5, "typical": 1.8 },

  "terrainInteraction": "Compress loose soil; fracture weak rock; scorch vegetation; no permanent effect on protected materials",

  "forbiddenInterpretations": [
    "Do not represent as a generic spherical explosion",
    "Do not use blue or green fire — fire-aspect qi is red-orange-gold spectrum only",
    "Do not make the palm silhouette illegible before 0.25s from combat camera",
    "Do not apply full damage beyond stated range"
  ]
}
```

---

## §7. Forbidden-Interpretation Rules

Every VTP must include a non-empty `forbiddenInterpretations` array. This is mandatory because generative systems converge on generic fantasy shorthand without explicit prohibitions.

### Common forbidden patterns

- "Do not represent as a generic spherical explosion"
- "Do not use Western dragon anatomy for Eastern spirit beasts"
- "Do not apply gold palace surfaces to vernacular architecture"
- "Do not give mortal characters glowing eyes or supernatural aura"
- "Do not use curved temple eaves on household buildings"
- "Do not exceed the stated height range"
- "Do not use modern materials (concrete, steel, plastic)"
- "Do not use generic fantasy runes"

---

## §8. Distance-Band Readability

Every VTP specifies what information must survive at each distance band:

| Band | Range | What must be readable |
|------|-------|----------------------|
| Inspection | 0.5–2 m | Fine detail, material layers, construction |
| Interaction | 2–8 m | Function, material, surface condition |
| Gameplay | 8–30 m | Silhouette, action, VFX identity |
| Regional | 30–500 m | Mass, grouping, landmark identity |
| Celestial | 500 m+ | Macro-shape, atmosphere, light |

A model can be accurate up close and completely unreadable at the gameplay camera distance. The VTP states what must survive each band.
