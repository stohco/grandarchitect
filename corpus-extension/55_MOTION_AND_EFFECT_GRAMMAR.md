# 55 — Motion, Effect, and Supernatural Grammar

**Status:** `[CANON]` Defines motion profiles, technique packets, time layers, and supernatural exception specifications.

**Implements:** `engine-architecture/51_MULTIVERSE_GROUND_TRUTH_ARCHITECTURE.md` §5, §6, §15

---

## §1. MotionProfile Interface

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

## §2. Technique Packet

```typescript
interface TechniquePacket {
  id: string; name: string;
  truthLevel: 'CANON' | 'DERIVED' | 'ART' | 'PROC' | 'UNRESOLVED';
  status: 'SPEC' | 'PROXY' | 'PROTO' | 'APPROX' | 'CANDIDATE' | 'VALIDATED' | 'REJECTED' | 'BLOCKED';
  concept: string; powerSource: string; bodyOrigin: string;
  castPosture: string; motionPath: string; targetingMode: string;
  deliveryGeometry: string; rangeMeters: Range; speedMetersPerSecond: Range;
  areaSquareMeters: Range; durationSeconds: Range;
  damageBehavior: string; forceBehavior: string;
  materialInteraction: string; terrainInteraction: string; environmentalInteraction: string;
  sound: AudioSpec; lighting: string; cameraBehavior: string; aftermath: string;
  counters: string; failureStates: string; scaling: string; realmDependentVariations: string;
  forbiddenInterpretations: string[];  // never empty
  acceptanceTests: string[];
}
```

## §3. Synchronized Timing

| Layer | Scope | Authority |
|-------|-------|-----------|
| Simulation time | Hit registration, damage | Kernel scheduler (1/20s tick) |
| Animation time | Character pose, bone transforms | Animation system |
| VFX time | Particles, trails, impacts | VFX director |
| Perceived time | Camera shake, hit stop, slow motion | Camera + audio |
| Strategic time | Travel, cultivation, economy, history | Strategic scheduler |

For a technique with anticipation 0.18s, strike 0.22s, impact pause 0.06s, recovery 0.35s — all layers must align: T=0.00 animation begins anticipation, T=0.18 strike launches + VFX trail begins + audio whoosh, T=0.40 impact frame + simulation hitbox active + VFX burst + audio impact + camera hit stop, T=0.46 recovery begins, T=0.81 recovery complete + trail fades. A technique is not valid until all five layers agree.

## §4. Technique Example: Heaven-Splitting Flame Palm

`[ART]` Fire-aspect qi palm strike. Range 15–35m, speed 60–85 m/s, area 2–30m², duration 1.2–2.5s. Delivery: expanding palm-shaped pressure surface (not sphere). Terrain: compress loose soil, fracture weak rock, scorch vegetation. Audio: deep inhale + qi hum → whoosh + crack → roaring flame → detonation + echo → sizzling embers. Camera: forward push on launch, hit stop 0.06s, shake 0.3s decay.

**Forbidden:** generic spherical explosion, blue/green fire, illegible silhouette before 0.25s, full damage beyond range, omitted anticipation, no visible body cost.

## §5. Motion Examples

**Mortal villager walking:** 1.1–1.5 m/s (1.3 typical), linear-gentle acceleration, 2.0–3.5 rad/s turn. Tags: measured, burdened, rural.

**Qi Condensation cultivator flying:** 8–15 m/s (12 typical), exponential-qi acceleration, 4.0–8.0 rad/s turn, 1.5–4.0m min turn radius. Tags: gliding, effortless, qi-enhanced.

**Foundation cultivator flying:** 15–30 m/s (22 typical), exponential-qi-strong, 5.0–10.0 rad/s turn, 1.0–3.0m min turn radius. Tags: gliding, purposeful, foundation-stage.

## §6. Supernatural Exception Specification

```typescript
interface SupernaturalException {
  id: string; name: string;
  truthLevel: 'CANON' | 'DERIVED';
  ordinaryRuleOverridden: string;
  powerEnabling: string;
  limits: string;
  visibleCues: string[];
  failureBehavior: string;
  systemInteractions: string;
}
```

### Floating mountain
**Ordinary:** Mountain mass falls under gravity. **Override:** Ancient spatial formation distributes weight into pocket domain. **Limits:** Requires 3+ formation nodes; qi supply >1000 qV/s. **Cues:** slow debris orbit, spatial distortion below, formation nodes on lower surface, 10–500m gap. **Failure:** If 3+ nodes destroyed, mountain loses altitude at 0.5–2 m/s. **Interactions:** collision remains physical; weather disrupted; flight paths avoid pocket domain boundary.

### Qi-enhanced speed
**Ordinary:** Human body cannot sustain 15+ m/s without damage. **Override:** Qi reinforces bones/tendons/joints. **Limits:** Qi cost ∝ speed²; max per realm (Qi Condensation 15, Foundation 30, Core 60, Nascent Soul 120 m/s). **Cues:** afterimage trail >8 m/s, robe/hair stream backward, qi shimmer on legs, footstep audio suppressed. **Failure:** If qi depleted, decelerate to 1.5 m/s over 0.5s. **Interactions:** full collision maintained; gait transitions to qi-gliding >8 m/s; footstep volume inversely proportional to speed.

### Storage ring
**Ordinary:** Objects cannot occupy more space than container. **Override:** Pocket-dimension formation in ring. **Limits:** Volume ∝ qi (Qi Condensation 10m³, Foundation 100m³, Core 1000m³); no living beings; no formations. **Cues:** ring glows on store/retrieve, items vanish with spatial ripple, ring weight unchanged. **Failure:** If ring destroyed, contents permanently lost; if damaged, partial spill. **Interactions:** enables bulk trade, instant weapon swap, primary cultivator storage.

## §7. Forbidden Without Exception

- `[FORBIDDEN]` Teleportation without formation or realm cost (breaks travel-time consistency)
- `[FORBIDDEN]` Time travel (breaks determinism stack)
- `[FORBIDDEN]` Resurrection without explicit realm-tier cost (breaks death stakes)
- `[FORBIDDEN]` True invisibility (spiritual detection must always be possible at equal or higher realm)
- `[FORBIDDEN]` Infinite qi (every technique must state power source and cost)

Any technique appearing to do one of these must be reclassified with explicit limits or marked `[REJECTED]`.
