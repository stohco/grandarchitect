# 55 — Motion, Effect, and Supernatural Grammar

**Status:** `[CANON]` Canonical invariant. Defines motion profiles, technique packets, time layers, and supernatural exception specifications.

**Implements:** `engine-architecture/51_MULTIVERSE_GROUND_TRUTH_ARCHITECTURE.md` §5, §6, §15

**Purpose:** Ensure that every moving entity, technique, and supernatural phenomenon is explicitly specified with synchronized timing across animation, VFX, audio, hitbox, and terrain response.

---

## §1. MotionProfile Interface

Every moving entity or effect has a motion profile:

```typescript
interface MotionProfile {
  idleBehavior: MotionDescription;
  startDelaySeconds: Range;
  accelerationCurve: CurveId;           // reference to a curve asset
  maximumSpeedMetersPerSecond: Range;
  decelerationCurve: CurveId;
  turnRateRadiansPerSecond: Range;
  minimumTurnRadiusMeters?: Range;
  anticipationSeconds?: Range;
  recoverySeconds?: Range;
  motionStyleTags: string[];
  cameraPresentation?: CameraMotionProfile;
}

interface MotionDescription {
  posture: string;
  microMovements: string;               // breathing, weight shift
  ambientMotion: string;                // tail sway, hair, cloth
}

interface CameraMotionProfile {
  followMode: 'rigid' | 'spring' | 'cinematic';
  followDistanceMeters: Range;
  followHeightMeters: Range;
  lagSeconds: Range;
  fovDegrees: Range;
  shakeProfile?: string;
}
```

---

## §2. Technique Packet

Every cultivation technique, martial move, formation activation, or supernatural effect has a technique packet:

```typescript
interface TechniquePacket {
  id: string;
  name: string;
  truthLevel: 'CANON' | 'DERIVED' | 'ART' | 'PROC' | 'UNRESOLVED';
  status: 'SPEC' | 'PROXY' | 'PROTO' | 'APPROX' | 'CANDIDATE' | 'VALIDATED' | 'REJECTED' | 'BLOCKED';

  // ---- Concept ----
  concept: string;
  powerSource: string;                  // qi type, realm, formation
  bodyOrigin: string;                   // dantian, meridian, palm, sword
  castPosture: string;
  motionPath: string;                   // trajectory description
  targetingMode: 'self' | 'directional' | 'targeted' | 'area' | 'omnidirectional';

  // ---- Delivery ----
  deliveryGeometry: string;             // "expanding palm-shaped pressure surface"
  rangeMeters: Range;
  speedMetersPerSecond: Range;
  areaSquareMeters: Range;
  durationSeconds: Range;

  // ---- Interaction ----
  damageBehavior: string;
  forceBehavior: string;                // newtons
  materialInteraction: string;
  terrainInteraction: string;
  environmentalInteraction: string;     // weather, flora, fauna response

  // ---- Presentation ----
  sound: AudioSpec;
  lighting: string;
  cameraBehavior: string;
  aftermath: string;

  // ---- Combat ----
  counters: string;
  failureStates: string;
  scaling: string;                      // how it changes with realm
  realmDependentVariations: string;

  // ---- Mandatory ----
  forbiddenInterpretations: string[];   // never empty
  acceptanceTests: string[];
}
```

---

## §3. Synchronized Timing

The visual effect, hit detection, animation, sound, and terrain response must agree on the same temporal structure.

### Time layers

| Layer | Scope | Authority |
|-------|-------|-----------|
| Simulation time | Authoritative event timing (hit registration, damage) | Kernel scheduler (1/20 s tick) |
| Animation time | Character pose, bone transforms | Animation system |
| VFX time | Particles, trails, impacts, aftermath | VFX director |
| Perceived time | Camera shake, hit stop, slow motion, sound timing | Camera + audio |
| Strategic time | Travel, cultivation, economy, history | Strategic scheduler |

### Synchronization contract

For a technique with:
- Anticipation: 0.18 s
- Strike duration: 0.22 s
- Impact pause: 0.06 s
- Recovery: 0.35 s

All layers must align:

```
T=0.00s  Animation: anticipation pose begins
T=0.00s  VFX: charging glow begins (subtle)
T=0.18s  Animation: strike launch
T=0.18s  VFX: trail begins
T=0.18s  Audio: whoosh begins
T=0.40s  Animation: impact frame
T=0.40s  Simulation: hitbox active, damage calculated
T=0.40s  VFX: impact burst
T=0.40s  Audio: impact sound
T=0.40s  Camera: hit stop (0.06s freeze)
T=0.40s  Terrain: surface effect (within 1 tick)
T=0.46s  Animation: recovery begins
T=0.46s  Camera: shake decay
T=0.81s  Animation: recovery complete
T=0.81s  VFX: trail fades
T=0.81s  Audio: recovery breath
```

A technique is not valid until all five layers agree on this timeline.

---

## §4. Technique Example: Heaven-Splitting Flame Palm

> `[ART]` This technique is art-directed for dramatic combat readability. Its physical parameters are not biologically realistic but are explicitly specified.

```json
{
  "id": "technique-heaven-splitting-flame-palm",
  "name": "Heaven-Splitting Flame Palm (裂天焰掌)",
  "truthLevel": "ART",
  "status": "SPEC",

  "concept": "A palm strike that channels fire-aspect qi into an expanding pressure surface",
  "powerSource": "Fire-aspect qi from lower dantian; Qi Condensation realm minimum",
  "bodyOrigin": "Right palm, projected forward along the arm meridian",
  "castPosture": "Horse stance, right palm thrust forward, left hand at hip",
  "motionPath": "Palm thrust forward → qi projects as expanding palm-shaped surface",
  "targetingMode": "directional",

  "deliveryGeometry": "Expanding palm-shaped pressure surface (not a sphere)",
  "rangeMeters": { "min": 15, "max": 35, "typical": 24 },
  "speedMetersPerSecond": { "min": 60, "max": 85, "typical": 70 },
  "areaSquareMeters": { "min": 2, "max": 30, "typical": 12 },
  "durationSeconds": { "min": 1.2, "max": 2.5, "typical": 1.8 },

  "damageBehavior": "Fire-aspect burn damage; reduces over distance; full damage in first 50% of range, 60% at 75%, 30% at max range",
  "forceBehavior": "800-2000N outward pressure at center, decreasing radially",
  "materialInteraction": "Ignites flammable materials; melts thin metal; no effect on fire-resistant formations",
  "terrainInteraction": "Compress loose soil; fracture weak rock; scorch vegetation; no permanent effect on protected materials",
  "environmentalInteraction": "Displaces fog; dries standing water within 5m; startles fauna within 100m",

  "sound": {
    "cast": "Deep inhale + qi circulation hum (200Hz, 0.18s)",
    "launch": "Whoosh + crack (500Hz → 2000Hz, 0.1s)",
    "flight": "Roaring flame (300-800Hz, sustained)",
    "impact": "Detonation (broadband, 0.3s) + echo (1.5s reverb)",
    "aftermath": "Sizzling + crackling embers (2-4s)"
  },
  "lighting": "Warm orange-gold additive light; radius 8-15m; intensity proportional to remaining duration",
  "cameraBehavior": "Slight forward push on launch (0.5m); hit stop 0.06s on impact; shake 0.3s decay",
  "aftermath": "Scorch mark on terrain (fades over 60s); residual heat shimmer for 10s",

  "counters": "Water-aspect techniques extinguish at 1.5× qi cost; earth-aspect walls block if realm-equal or higher",
  "failureStates": "If qi insufficient: palm glows but does not project (0.3s wasted); if interrupted during anticipation: qi scatters harmlessly",
  "scaling": "Range +10% per realm above Qi Condensation; area +15% per realm; damage +25% per realm",
  "realmDependentVariations": "Foundation Establishment: palm leaves lingering fire field (3s); Core Formation: palm can be curved mid-flight (30° max); Nascent Soul: double-palm variant available",

  "forbiddenInterpretations": [
    "Do not represent as a generic spherical explosion",
    "Do not use blue or green fire — fire-aspect qi is red-orange-gold spectrum only",
    "Do not make the palm silhouette illegible before 0.25s from combat camera",
    "Do not apply full damage beyond stated range",
    "Do not omit the anticipation phase — it is mandatory for readability",
    "Do not use the technique without visible body cost (perspiration, breath, muscle tension)"
  ],

  "acceptanceTests": [
    "technique.timing.synchronized",
    "technique.damage.falloff-correct",
    "technique.visual.silhouette-legible-at-0.25s",
    "technique.audio.impact-aligned",
    "technique.terrain.scorch-present",
    "technique.no-spherical-explosion"
  ]
}
```

---

## §5. Motion Examples by Entity Class

### Mortal villager walking

```json
{
  "idleBehavior": { "posture": "upright, weight shifted slightly forward", "microMovements": "breathing, occasional weight shift", "ambientMotion": "cloth sway, hat brim in wind" },
  "maximumSpeedMetersPerSecond": { "min": 1.1, "max": 1.5, "typical": 1.3 },
  "accelerationCurve": "linear-gentle",
  "decelerationCurve": "linear-gentle",
  "turnRateRadiansPerSecond": { "min": 2.0, "max": 3.5, "typical": 2.8 },
  "motionStyleTags": ["measured", "burdened", "rural"]
}
```

### Qi Condensation cultivator (flying)

```json
{
  "idleBehavior": { "posture": "upright, hovering 0.2m above ground", "microMovements": "qi circulation shimmer", "ambientMotion": "robe sway, hair lift" },
  "maximumSpeedMetersPerSecond": { "min": 8, "max": 15, "typical": 12 },
  "accelerationCurve": "exponential-qi",
  "decelerationCurve": "inverse-qi",
  "turnRateRadiansPerSecond": { "min": 4.0, "max": 8.0, "typical": 6.0 },
  "minimumTurnRadiusMeters": { "min": 1.5, "max": 4.0, "typical": 2.5 },
  "motionStyleTags": ["gliding", "effortless", "qi-enhanced"],
  "cameraPresentation": { "followMode": "spring", "followDistanceMeters": { "typical": 6 }, "lagSeconds": { "typical": 0.08 } }
}
```

### Spirit beast (cloud serpent) flight

```json
{
  "idleBehavior": { "posture": "sinuous coils, floating", "microMovements": "body undulation", "ambientMotion": "cloud-wisp trail" },
  "maximumSpeedMetersPerSecond": { "min": 8, "max": 25, "typical": 15 },
  "accelerationCurve": "serpentine-spiral",
  "turnRateRadiansPerSecond": { "min": 3.0, "max": 7.0, "typical": 5.0 },
  "minimumTurnRadiusMeters": { "min": 1.5, "max": 4.0, "typical": 2.5 },
  "motionStyleTags": ["sinuous", "aerial", "spirit-beast"]
}
```

---

## §6. Supernatural Exception Specification

Xianxia does not need to obey ordinary physics everywhere. It does need to obey its own rules. For each supernatural exception, the bible defines:

```typescript
interface SupernaturalException {
  id: string;
  name: string;
  truthLevel: 'CANON' | 'DERIVED';

  ordinaryRuleOverridden: string;       // what physics is being violated
  powerEnabling: string;                // what cultivation/formation power
  limits: string;                       // when it stops working
  visibleCues: string[];                // how the player perceives the exception
  failureBehavior: string;              // what happens when power is removed
  systemInteractions: string;           // how it interacts with other systems
}
```

### Example: Floating mountain

```json
{
  "id": "supernatural-floating-mountain",
  "name": "Floating Mountain",
  "truthLevel": "CANON",

  "ordinaryRuleOverridden": "Mountain mass would fall under local gravity",
  "powerEnabling": "Ancient spatial formation distributes effective weight into a pocket domain; formation powered by ambient qi from the world's spirit vein",
  "limits": "Requires minimum 3 formation nodes; qi supply must exceed 1000 qV/s; fails if pocket domain is destabilized by rival formation",
  "visibleCues": [
    "Slow debris orbit around the mountain's lower surface",
    "Localized spatial distortion below the mountain (visual ripple)",
    "Formation nodes embedded along the lower surface as glowing geometric marks",
    "No direct ground contact — gap of 10-500m visible"
  ],
  "failureBehavior": "If 3+ major nodes are destroyed, mountain gradually loses altitude at 0.5-2 m/s until it makes ground contact; impact damage proportional to remaining height",
  "systemInteractions": "Collision: mountain remains physical; only gravitational support is altered. Weather: cloud formation disrupted by spatial distortion. Navigation: flight paths must avoid the pocket domain boundary."
}
```

### Example: Qi-enhanced speed

```json
{
  "id": "supernatural-qi-speed",
  "name": "Qi-Enhanced Movement Speed",
  "truthLevel": "CANON",

  "ordinaryRuleOverridden": "Human body cannot sustain 15+ m/s movement without skeletal-muscular damage",
  "powerEnabling": "Qi circulation reinforces bones, tendons, and joints; Qi Condensation realm minimum",
  "limits": "Qi cost scales with speed squared; cannot exceed realm-specific maximum (Qi Condensation: 15 m/s, Foundation: 30 m/s, Core Formation: 60 m/s); fails if qi depleted",
  "visibleCues": [
    "Afterimage trail at speeds above 8 m/s",
    "Robe and hair stream backward",
    "Faint qi shimmer on legs",
    "Footstep audio suppressed at high speed (qi cushions impact)"
  ],
  "failureBehavior": "If qi depleted mid-movement: immediate deceleration to mortal speed (1.5 m/s) over 0.5s; no damage but vulnerable",
  "systemInteractions": "Collision: full physical collision maintained. Animation: gait transitions to qi-gliding pose above 8 m/s. Audio: footstep volume inversely proportional to speed."
}
```

### Example: Spatial storage (storage ring)

```json
{
  "id": "supernatural-storage-ring",
  "name": "Storage Ring (储物戒)",
  "truthLevel": "CANON",

  "ordinaryRuleOverridden": "Objects cannot occupy more space than their container",
  "powerEnabling": "Pocket-dimension formation embedded in a ring; Qi Condensation realm to activate",
  "limits": "Volume proportional to qi invested (Qi Condensation: 10 m³, Foundation: 100 m³, Core Formation: 1000 m³); cannot store living beings; cannot store formations",
  "visibleCues": [
    "Ring glows briefly when items are stored/retrieved",
    "Stored items vanish/appear with a faint spatial ripple",
    "Ring weight does not change regardless of contents"
  ],
  "failureBehavior": "If ring is destroyed: contents are permanently lost in the pocket dimension (cannot be recovered); if ring is damaged but not destroyed: contents may partially spill",
  "systemInteractions": "Economy: enables bulk trade. Combat: allows instant weapon swap. Inventory: primary storage system for cultivators."
}
```

---

## §7. Forbidden Without Exception

Some "supernatural" shortcuts are forbidden entirely because they break the world's internal logic:

- `[FORBIDDEN]` Teleportation without formation or realm cost (breaks travel-time consistency)
- `[FORBIDDEN]` Time travel (breaks the determinism stack — doc 06)
- `[FORBIDDEN]` Resurrection without explicit realm-tier cost (breaks death stakes)
- `[FORBIDDEN]` True invisibility (spiritual detection must always be possible at equal or higher realm)
- `[FORBIDDEN]` Infinite qi (every technique must state its power source and cost)

Any technique or formation that appears to do one of these must either:
1. Be reclassified with explicit limits, or
2. Be marked `[REJECTED]` as a world-breaking concept.
