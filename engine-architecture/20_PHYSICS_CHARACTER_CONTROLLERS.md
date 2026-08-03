# 20 — Physics & Character Controllers

**Status:** Engineering specification. The `ga:physics` plugin's public interface, the adapter layer to a swappable WASM solver, the separation of body roles, realm-aware material properties, phase-affinity collisions, and the determinism verification protocol.
**Date:** 2026-08-03

---

## 0. What this document is

This document specifies the physics **interface** the engine's simulation talks to. It is not the solver. The solver (Jolt WASM, per doc 21; swappable to Box3D WASM when it ships) lives behind an adapter and is replaceable without touching any plugin above. The engine's physics is the interface, the adapter, the determinism wrapper, and the lore integration — exactly as doc 21 §6 committed.

The central decision: **the simulation never holds a Rapier or Jolt rigid-body pointer.** It holds a `PhysicsBodyHandle` (an opaque integer) and reads/writes through the physics plugin's API. This is the simplest implementation that allows the solver to be swapped (Ponytail §5: long-term decisions) without forcing every consumer to be re-typed.

### Precedents cited (AGENTS.md Part 3: "Cite the precedent")

- **Unity's `Rigidbody`/`Collider` separation** — Unity separates the body (the physics thing) from the collider (the shape). We adopt this and extend it to nine roles (§3).
- **Unreal Engine 5's `UCharacterMovementComponent`** — a kinematic character controller layered on top of the solver, not a rigid body. We adopt this pattern; cultivators are kinematic, not dynamic (§5).
- **Jolt Physics character controller** — Jolt ships its own kinematic character controller; we use it for the protagonist and NPC movement.
- **Godot 4 `PhysicsServer3D`** — Godot's server-pattern hides the backend (Bullet, GodotPhysics, Jolt) behind a single interface. Our adapter is the same idea.
- **Box2D's `b2Filter`** — collision-category bits. Our `CollisionFilter` (§4.4) is the typed analogue.

---

## 1. The PhysicsBodyHandle interface

### 1.1 The handle is opaque

```typescript
type PhysicsBodyHandle = number & { __brand: 'PhysicsBodyHandle' };
```

A branded number. The simulation can compare handles for equality, store them in components (`PhysicsBodyRef`, per doc 24 §1.6), and pass them to the physics API. The simulation cannot dereference a handle into a solver object — there is no API for it.

### 1.2 The physics plugin surface

```typescript
interface PhysicsApi {
  // Body lifecycle
  createBody(spec: BodySpec): PhysicsBodyHandle;
  destroyBody(handle: PhysicsBodyHandle): void;
  bodyExists(handle: PhysicsBodyHandle): boolean;

  // Sim-component reads (canonical)
  getTransform(handle: PhysicsBodyHandle): Transform;
  getLinearVelocity(handle: PhysicsBodyHandle): Vec3;
  getAngularVelocity(handle: PhysicsBodyHandle): Vec3;
  isGrounded(handle: PhysicsBodyHandle): boolean;
  getContacts(handle: PhysicsBodyHandle): ContactInfo[];

  // Sim-component writes (canonical)
  setTransform(handle: PhysicsBodyHandle, t: Transform): void;  // teleports — use sparingly
  setLinearVelocity(handle: PhysicsBodyHandle, v: Vec3): void;
  applyImpulse(handle: PhysicsBodyHandle, impulse: Vec3, point?: Vec3): void;
  applyForce(handle: PhysicsBodyHandle, force: Vec3, point?: Vec3): void;

  // Shape management — separate roles (§3)
  setShape(handle: PhysicsBodyHandle, role: ShapeRole, shape: ShapeSpec): void;

  // Queries (do not advance the simulation)
  raycast(origin: Vec3, dir: Vec3, maxDist: number, filter?: CollisionFilter): RaycastHit | null;
  shapecast(shape: ShapeSpec, from: Transform, to: Transform, filter?: CollisionFilter): ShapecastHit[];
  overlap(shape: ShapeSpec, at: Transform, filter?: CollisionFilter): PhysicsBodyHandle[];

  // Determinism (§7)
  snapshot(): string;            // SHA-256 of CBOR-serialized PhysicsSnapshot
  verify(expectedHash: string): boolean;
  exportSnapshot(): Uint8Array;
  importSnapshot(bytes: Uint8Array): void;
}
```

The `PhysicsApi` is exposed through `host.getState('ga:physics').api` and through the WebSocket (doc 22). Reads are cheap; writes go through `host.setState` for determinism auditing.

### 1.3 The body spec

```typescript
interface BodySpec {
  motionType: 'static' | 'kinematic' | 'dynamic';
  initialTransform: Transform;
  layer: CollisionLayer;              // 32-bit, named groups
  shapes: Partial<Record<ShapeRole, ShapeSpec>>;  // which roles this body has
  material: PhysicsMaterial;          // base material; realm-aware overrides apply (§5)
  realmProfile: RealmProfile;         // mortal | qi_condensation | ... | mahayana
  mass?: number;                      // dynamic only; computed from shapes if omitted
  linearDamping: number;
  angularDamping: number;
  gravityScale: number;
  lockAngular?: [boolean, boolean, boolean];
}
```

The body spec is **CBOR-serializable** and is part of the canonical state. The body itself (the Jolt/Rapier object) is not — it is renderer-side, recreated from the spec on load (per doc 24 §1.6's sim/render split).

---

## 2. The adapter layer

### 2.1 Why an adapter

The engine has one physics interface (`PhysicsApi`); the solver behind it is swappable. The adapter implements `PhysicsApi` against a specific backend. Today: Jolt WASM. When Box3D WASM ships, a second adapter is written; the engine picks one at startup based on a manifest entry. The simulation never knows which.

```
┌──────────────────────────────────────────────────────────┐
│  Simulation plugins (combat, NPC movement, cultivator)   │
│  speak: PhysicsApi, PhysicsBodyHandle                    │
└────────────────────────┬─────────────────────────────────┘
                         │
┌────────────────────────▼─────────────────────────────────┐
│  ga:physics plugin                                       │
│  • Determinism wrapper (snapshot, hash, verify)          │
│  • Lore integration (realm profiles, phase materials)    │
│  • Shape-role separation (§3)                            │
│  • Tiering hooks (§6, doc 25)                            │
└────────────────────────┬─────────────────────────────────┘
                         │
┌────────────────────────▼─────────────────────────────────┐
│  PhysicsBackend adapter interface                        │
│  createBody / destroyBody / step / raycast / ...         │
└────────┬───────────────────────────────────┬─────────────┘
         │                                   │
┌────────▼──────────┐               ┌────────▼──────────┐
│ JoltWasmBackend   │               │ Box3dWasmBackend  │
│ (current)         │               │ (future)          │
└───────────────────┘               └───────────────────┘
```

### 2.2 The adapter interface

```typescript
interface PhysicsBackend {
  readonly id: string;                       // 'jolt-wasm-5.1.0' | 'box3d-wasm-1.0.0'
  readonly fingerprintComponent: string;     // included in DeterminismFingerprint (doc 08)
  init(config: PhysicsBackendConfig): void;
  shutdown(): void;

  createBody(spec: BackendBodySpec): BackendBodyId;
  destroyBody(id: BackendBodyId): void;
  setShape(id: BackendBodyId, role: ShapeRole, shape: BackendShapeSpec): void;

  step(dt: number, maxSubSteps: number): void;

  getTransform(id: BackendBodyId): Transform;
  setTransform(id: BackendBodyId, t: Transform): void;
  applyImpulse(id: BackendBodyId, impulse: Vec3, point?: Vec3): void;

  raycast(origin: Vec3, dir: Vec3, maxDist: number, filter: BackendFilter): BackendRayHit[];
  shapecast(...): BackendShapeHit[];
  overlap(...): BackendBodyId[];

  snapshot(): PhysicsSnapshot;               // the raw state, pre-CBOR
  restore(snap: PhysicsSnapshot): void;
}
```

The adapter translates `PhysicsBodyHandle` (engine-side, branded int) to `BackendBodyId` (solver-side, also an int but possibly with solver-specific semantics). The map is a `Map<PhysicsBodyHandle, BackendBodyId>` held by `ga:physics`; on backend swap, the map is rebuilt from the snapshot.

### 2.3 The adapter failure case

**Failure case (adapter):** A backend is loaded whose `fingerprintComponent` differs from the one in the save's `DeterminismFingerprint`. The save loader refuses to load: "this save was created with Jolt WASM 5.1.0; the current backend is Box3D WASM 1.0.0; their determinism fingerprints differ." This is the correct refusal — a save made with one solver cannot be replayed on another unless both are verified to produce identical hashes (which the verification protocol §7 must establish first). Rejected alternative: silent replay with possible divergence — violates the determinism contract.

---

## 3. The nine roles of a shape

### 3.1 The problem with "a collider"

In a naive physics setup, an NPC has one collider — say, a capsule. That capsule is used for: simulation (collide with the ground), queries (am I in attack range?), character control (am I grounded?), navigation (am I blocked by this obstacle?), hit detection (did the sword hit me?), and visual culling (is the body on-screen?). These have **different shape requirements**:

- **Simulation shape** should be a slightly smaller capsule (so the body doesn't catch on door frames).
- **Query shape** should be a larger sphere (so "in attack range" is generous).
- **Character controller shape** is a vertical capsule with specific step-up tolerance.
- **Hit-detection volume** is per-body-part (head, torso, limbs) for combat.
- **Navigation obstacle** is a rectangular footprint for the navmesh.

Using one shape for all of these produces a body that either clips through doorways or fails to detect attacks. The Unity/Unreal pattern of separating collider from trigger helps; we extend it to nine explicitly named roles.

### 3.2 The role enum

```typescript
type ShapeRole =
  | 'simulation'           // what the solver collides against the world
  | 'query'                // what raycasts/shapecasts hit
  | 'character_controller' // kinematic CCT shape (smaller radius, step tolerance)
  | 'rigid_body'           // alias for simulation when the body is dynamic
  | 'trigger'              // non-blocking; emits enter/exit events
  | 'navigation_obstacle'  // consumed by the navmesh generator (doc 22)
  | 'terrain_collider'     // the voxel terrain's collider mesh (doc 21)
  | 'hit_detection'        // per-body-part volumes for combat (doc 13)
  | 'visual_geometry';     // never queried by physics; the renderer's bounds
```

A body may have any subset. A mortal NPC has: `simulation` (capsule), `character_controller` (capsule, smaller), `query` (sphere), `hit_detection` (3–5 body parts), `navigation_obstacle` (rectangle). It does not have `terrain_collider` (that's the terrain, not the NPC) or `visual_geometry` (the renderer owns that, separate from physics).

### 3.3 The role separation diagram

```
            ┌──────────────────────┐
   Player   │ visual_geometry      │ (renderer's MeshRef bounds; never physics-queried)
            ├──────────────────────┤
            │ hit_detection        │ (5 small volumes: head, torso, 2 arms, 2 legs)
            ├──────────────────────┤
            │ character_controller │ (capsule, r=0.3, height=1.7, step=0.3)
            ├──────────────────────┤
            │ simulation           │ (capsule, r=0.35, height=1.75 — slightly larger)
            ├──────────────────────┤
            │ query                │ (sphere, r=2.0 — generous "interact" range)
            ├──────────────────────┤
            │ navigation_obstacle  │ (rect, 0.7×0.7, for navmesh carving)
            └──────────────────────┘

            ┌──────────────────────┐
   Terrain  │ visual_geometry      │ (the rendered mesh; doc 21)
            ├──────────────────────┤
            │ terrain_collider     │ (the collider mesh, lower LOD; doc 21)
            └──────────────────────┘

            ┌──────────────────────┐
   Trigger  │ trigger              │ (a box around the lineage hall entrance)
   volume   │ simulation: OFF      │
            │ query: ON            │
            └──────────────────────┘
```

### 3.4 The shape spec

```typescript
interface ShapeSpec {
  kind: 'sphere' | 'capsule' | 'box' | 'convex_hull' | 'trimesh';
  // for sphere:
  radius?: number;
  // for capsule:
  radius?: number; height?: number; axis?: 'x' | 'y' | 'z';
  // for box:
  halfExtents?: Vec3;
  // for convex_hull:
  points?: Vec3[];
  // for trimesh (terrain only):
  meshHash?: string;            // content-addressed; resolved by ga:assets

  // Common:
  offset: Transform;            // local offset from body origin
  collisionLayer: CollisionLayer;
  collisionMask: CollisionLayer;  // what this shape collides with
  isTrigger: boolean;
}
```

### 3.5 The role failure case

**Failure case (roles):** A plugin queries the `simulation` shape instead of the `query` shape and gets a too-tight result. The fix is documentation: every query API takes an explicit `role: ShapeRole` parameter. The physics plugin's TypeScript types enforce this — `raycast` without a role defaults to `'query'`, but `overlap` requires an explicit role. Rejected alternative: implicit role by query type — too easy to get wrong, too hard to debug.

---

## 4. Collision filtering

### 4.1 Collision layers

A 32-bit bitmask, grouped:

```typescript
enum CollisionLayer {
  TERRAIN        = 1 << 0,
  STATIC_PROP    = 1 << 1,
  DYNAMIC_PROP   = 1 << 2,
  PLAYER         = 1 << 3,
  NPC            = 1 << 4,
  BEAST          = 1 << 5,
  CULTIVATOR     = 1 << 6,   // qi-reinforced bodies
  PROJECTILE     = 1 << 7,
  TRIGGER        = 1 << 8,
  NAVIGATION     = 1 << 9,   // navmesh obstacles (don't block bodies)
  HIT_DETECTION  = 1 << 10,  // combat hit volumes
  QI_EFFECT      = 1 << 11,  // qi-perception query shapes
  // ... reserved bits
}
```

A body's `layer` says what it *is*; a shape's `collisionMask` says what it *collides with*. The `CULTIVATOR` layer is interesting: it collides with `TERRAIN | STATIC_PROP | DYNAMIC_PROP | CULTIVATOR` but **not** with `NPC` (a Core Formation cultivator can walk through a mortal crowd — their qi-reinforced body displaces mortals via the kinematic controller, not the solver).

### 4.2 The filter

```typescript
interface CollisionFilter {
  layerMask: number;       // match bodies whose layer is in this mask
  roleMask: ShapeRole[];   // only query these roles
  phaseMask?: Phase[];     // §6.3: only match bodies with these phase-affinities
  realmMask?: Realm[];     // only match bodies in these realm profiles
}
```

### 4.3 The collision-pair callback

When two shapes begin overlapping, the solver calls `onContactPair(a, b)`. The physics plugin routes this to:
- `simulation` overlaps → solver resolves (or, if either is a trigger, emits a `TriggerEnter` event).
- `trigger` overlaps → emits `TriggerEnter`/`TriggerExit` events on the bus.
- `hit_detection` overlaps → emits `CombatContact` events (doc 13 §2).
- `query` overlaps → never generates events; only returned by explicit queries.

### 4.4 The collision failure case

**Failure case (collision):** Two cultivators fight; both have `CULTIVATOR` layer bodies and `simulation` shapes that overlap. The solver resolves them as solid bodies, blocking movement — but cultivator combat requires passing-through strikes. The fix: during a committed strike's active frames, the attacker's `simulation` shape is replaced by a `hit_detection`-only shape (the strike volume) on the `HIT_DETECTION` layer. The defender's `simulation` shape is unaffected. This is the "ghost strike" pattern from Sekiro (cited in doc 13 §0). Rejected alternative: a global "during combat" flag that disables all collision — would let cultivators walk through walls.

---

## 5. Realm-aware body types

### 5.1 The realm profile

Every body has a `RealmProfile`. The physics plugin reads it on `createBody` and configures the backend body's mass, friction, restitution, gravity scale, max velocity, and material per the envelope table in doc 32 §1.2.

```typescript
type RealmProfile =
  | 'mortal' | 'qi_induction' | 'qi_condensation'
  | 'foundation_establishment' | 'core_formation' | 'nascent_soul'
  | 'spirit_severance' | 'void_amalgamation' | 'tribulation_crossing'
  | 'mahayana';

interface RealmPhysicsProfile {
  massMultiplier: number;          // relative to base mass
  frictionMultiplier: number;
  restitutionMultiplier: number;
  gravityScale: number;
  maxLinearVelocity: number;       // m/s, hard cap
  maxAngularVelocity: number;
  durability: DurabilityProfile;   // for injury model (doc 13 §6)
  canGripSmoothSurfaces: boolean;  // Core Formation+
  canFly: boolean;                 // Foundation Establishment+ with routing
  canPhaseThroughMortals: boolean; // Core Formation+
}
```

### 5.2 The mortal-vs-cultivator divergence

| Property | Mortal | Qi Condensation | Foundation Establishment | Core Formation |
|---|---|---|---|---|
| Mass (base 60kg) | 60 kg | 60 kg | 65 kg | 70 kg |
| Friction | 0.6 | 0.6 | 0.8 (grip) | 1.2 (smooth-surface grip) |
| Restitution | 0.0 | 0.0 | 0.05 | 0.15 |
| Gravity scale | 1.0 | 1.0 | 0.95 | 0.8 |
| Max velocity | 8 m/s | 15 m/s | 25 m/s | 50 m/s |
| Can fly | no | no | yes (with routing) | yes |
| Phase through mortals | no | no | no | yes |
| Smooth-surface grip | no | no | no | yes |

The full table through Mahayana follows doc 32 §1.2. The values are not arbitrary — they are derived from the same envelope that the combat system uses, so a cultivator's body and a cultivator's strike are coherent.

### 5.3 The realm-profile failure case

**Failure case (realm):** A cultivator breaks through to Foundation Establishment mid-step; their `RealmProfile` updates, but the backend body's mass is not refreshed. The fix: `setRealmProfile(handle, newProfile)` is an explicit API call that the breakthrough system emits as a `BreakthroughCompleted` event. The physics plugin listens, calls `setRealmProfile`, and the backend updates the body's properties in place. Rejected alternative: poll the entity's `CultivationState` every tick — wasteful, and prone to mid-tick inconsistency.

---

## 6. Qi-enhanced materials and phase-affinity collisions

### 6.1 Qi-enhanced materials

A `PhysicsMaterial` carries base properties (friction, restitution) plus qi-modifiers that activate when qi is routed through the body part the shape represents.

```typescript
interface PhysicsMaterial {
  baseFriction: number;
  baseRestitution: number;
  baseDensity: number;

  qiModifiers?: {
    activeWhenRoutedTo: RoutingRegion;   // 'hands' | 'legs' | 'senses' | 'skin' (doc 13 §4)
    frictionBoost: number;
    restitutionBoost: number;
    densityBoost: number;                 // qi-routed fists are denser → more impulse
    phaseAffinity: Phase;                 // §6.3
  };
}
```

When the player routes fire-phase qi to Hands (per doc 32 §2.2), the hand-shapes' material switches from base to qi-active: friction ×1.2, restitution ×2.0, density ×5. The impulse of a Burning Palm strike is `mass × velocity × densityBoost` — the 5–10× impulse gain cited in doc 21 §4.2 falls out of the material model.

### 6.2 The phase-affinity collision response

Per doc 21 §4.3, when two phase-affined bodies collide, the contact's friction and restitution are modified by the phase matchup table (doc 32 §2.3). The modifier is a ±30% on the contact's combined friction/restitution.

```typescript
function phaseModifier(attackerPhase: Phase, defenderPhase: Phase): number {
  if (attackerPhase === defenderPhase) return 1.0;
  if (generates(attackerPhase, defenderPhase)) return 1.3;   // parent → child
  if (conquers(attackerPhase, defenderPhase)) return 1.3;    // conqueror → conquered
  if (generates(defenderPhase, attackerPhase)) return 0.7;   // child → parent
  if (conquers(defenderPhase, attackerPhase)) return 0.7;    // conquered → conqueror
  return 1.0;  // unreachable if phases are valid
}
```

The modifier is applied in the contact-resolution callback, before the solver step. This is the simplest implementation that doesn't require the solver itself to be phase-aware (Ponytail §2).

### 6.3 The phase-collision failure case

**Failure case (phase):** A fire-routed cultivator punches a water-routed cultivator's iron-skin defense. Phase matchup: Fire × Metal = 1.3 (fire melts metal). But the defender is *water-routed*, not metal-routed — the defender's phase is Water. The fix: the `phaseAffinity` field on the **active material** is what matters, not the cultivator's root affinity. The defender routed water → their skin-shape's material is water-phase-active. Matchup: Fire × Water = 0.7 (water quenches fire). The strike is dampened. This matches doc 32 §2.4.2's worked duel.

Rejected alternative: read the cultivator's root phase from their `CultivationState` directly. Wrong — root phase is the *default*, but the routed phase is the *current*. The material carries the routed phase; the root is irrelevant for collision response.

---

## 7. The determinism wrapper and verification protocol

### 7.1 The wrapper's job

The wrapper does four things on every `step(dt)` call:

1. **Snapshot before** — capture `PhysicsSnapshot` (all bodies' positions, velocities, contacts, constraints).
2. **Step** — call `backend.step(dt, maxSubSteps)`.
3. **Snapshot after** — capture again.
4. **Hash** — `SHA-256(CBOR(snapshotAfter))`. Append to the in-memory hash log.

The hash log is a sliding window of the last N hashes (default N=1024). If any hash diverges from a recorded reference hash, the wrapper throws (dev) or logs (production).

### 7.2 The PhysicsSnapshot

```typescript
interface PhysicsSnapshot {
  tick: number;
  backendFingerprint: string;       // identifies the solver version
  bodies: Array<{
    handle: PhysicsBodyHandle;
    realmProfile: RealmProfile;
    motionType: 'static' | 'kinematic' | 'dynamic';
    position: FixedVec3;            // Q32.32 — doc 17 §3.1
    rotation: FixedQuat;            // Q32.32
    linearVelocity: FixedVec3;
    angularVelocity: FixedVec3;
    layer: number;
    activeShapes: ShapeRole[];      // which roles are currently set
  }>;
  contacts: Array<{
    a: PhysicsBodyHandle; b: PhysicsBodyHandle;
    point: FixedVec3; normal: FixedVec3; penetration: Fixed;
    phaseModifier: Fixed;            // captures the phase-affinity result
  }>;
  constraints: Array<{
    handle: number; type: string;
    a: PhysicsBodyHandle; b: PhysicsBodyHandle;
    state: unknown;                  // backend-specific; CBOR-serializable
  }>;
}
```

All values are `Fixed` (Q32.32) per doc 17 §3.1. Floating-point in the snapshot would break cross-browser hash parity (the original sin of physics determinism). The wrapper converts the backend's `f32`/`f64` outputs to `Fixed` at snapshot time.

### 7.3 The verification protocol

This is the gate from doc 24 §1.4: "the determinism claim must be verified empirically before it is trusted."

```
PROTOCOL: cross-browser physics determinism verification

1. Fixture: a deterministic scenario script (1000 ticks of a defined setup)
   - 100 stacked boxes
   - 1 cultivator striking the stack (fire-routed hands)
   - 1 water-routed defender
   - 1 terrain mesh (small)
   - 50 NPCs walking on navmesh
2. For each browser B in [Chrome, Firefox, Safari, Edge]:
   a. Load the engine in B
   b. Run the scenario for 1000 ticks
   c. At each tick, capture snapshotHash
   d. Save the 1000-tick hash log to /determinism-runs/{B}.json
3. Compare the four hash logs
4. If all four match: PASS — solver is cross-browser deterministic under our wrapper
5. If any diverge: FAIL — find the first divergent tick, diff the snapshots,
   identify which body/contact/constraint diverged first, file a solver bug
   or a wrapper bug
6. Re-run nightly in CI. Re-run on every solver version bump.
```

### 7.4 The verification failure case

**Failure case (verification):** Chrome and Firefox diverge at tick 412. Diff reveals body #47's `linearVelocity.z` differs by 1 ULP (Unit in the Last Place) at f64 level. This is exactly the kind of transcendental-induced divergence doc 21 §3.1 warned about. The fix depends on where it came from:

- If the divergence is in Jolt's own math (a `sqrt` somewhere), the wrapper can only patch it if Jolt exposes the import. If not, the project reverts to Rapier (per doc 24 §1.4's escape hatch).
- If the divergence is in our wrapper (a `Math.sin` that should be `det_sin`), fix the wrapper.

The protocol is the gate; the wrapper is the gate's lock; the snapshot is the gate's key. Without the protocol, the determinism claim is words (AGENTS.md Part 3: "Cite the precedent; do not float above it").

---

## 8. The character controller

### 8.1 The kinematic model

The protagonist and all NPCs use the **kinematic character controller (CCT)** pattern, not dynamic rigid bodies. A kinematic body is moved explicitly by `setTransform`; the solver does not apply forces to it. The CCT handles:

- Ground detection (am I on the floor?)
- Step-up (small obstacles like stairs)
- Slope limit (don't walk up 80° cliffs)
- Sliding on steep slopes
- Wall sliding (don't stick to walls)
- Depenetration (push out of overlaps with dynamic bodies)

```typescript
interface CharacterControllerSpec {
  bodyHandle: PhysicsBodyHandle;
  up: Vec3;                          // usually [0, 1, 0]
  slopeLimit: number;                // cos(angle); 0.7 = ~45°
  stepHeight: number;                // 0.3 m mortal; 0.5 m cultivator
  characterControllerShape: ShapeSpec;  // the CCT role's shape
  queryShape: ShapeSpec;
  mass: number;                      // for pushing dynamic bodies
}
```

### 8.2 The CCT move

```typescript
function cctMove(cct: CharacterControllerSpec, displacement: Vec3, dt: number): CCTMoveResult {
  // Implemented in the backend (Jolt's kinematic character controller, or our own)
  return {
    finalDisplacement: Vec3,
    grounded: boolean,
    groundNormal: Vec3 | null,
    slidThisFrame: boolean,
    blockedBy: PhysicsBodyHandle | null,
  };
}
```

The CCT does **not** advance the simulation; it produces a `finalDisplacement` that the calling system applies via `setTransform`. This keeps the CCT deterministic: same input → same output, no solver-internal state to drift.

### 8.3 Why kinematic, not dynamic

Rejected alternative: dynamic character controller (a rigid body with high friction and locked rotation). Why rejected:

1. **Predictability.** A dynamic CCT accelerates, decelerates, and is knocked around by forces. Cultivator combat (doc 13 §3 commitment model) requires that the player's input is honored exactly: press forward → move forward, no slide. A dynamic body's response is filtered through the solver; a kinematic body's response is direct.
2. **Realm coherence.** A Core Formation cultivator at 50 m/s in a dynamic body would have to fight the solver's velocity caps and broadphase cell sizes. A kinematic body has no such constraints.
3. **Precedent.** UE5's `UCharacterMovementComponent`, Godot's `CharacterBody3D`, Jolt's `Character` class — the entire industry uses kinematic for player-controlled characters. We follow the proven pattern (Ponytail §13).

---

## 9. NPC movement and physics interaction

### 9.1 The movement pipeline

```
NPC AI (doc 25 §4) decides a desired velocity
   │
   ▼
Navigation system (doc 22) computes a path or waypath
   │
   ▼
Steering: velocity → desired displacement this tick
   │
   ▼
CCT move(displacement, dt)                          ← physics
   │
   ▼
setTransform(handle, transform + finalDisplacement) ← physics
   │
   ▼
Animation system reads velocity, plays walk/run animation
```

### 9.2 Dynamic props: when the solver does the work

A bucket knocked off a table is a **dynamic** body. The solver handles it. The NPC that knocked it is a **kinematic** body. The CCT's `mass` field controls how much the kinematic body pushes the dynamic body. A mortal NPC (mass 60) knocking a bucket (mass 2) → bucket flies. A Core Formation cultivator (effective mass 70 × densityBoost 5 = 350) walking through a mortal crowd → mortals are pushed aside, but the cultivator is not slowed.

### 9.3 The interaction failure case

**Failure case (interaction):** A kinematic NPC walks into a stack of dynamic boxes. The CCT's depenetration pushes the NPC out, but the boxes — being dynamic — are also pushed. The result is the NPC walks *through* the stack over several ticks as each box is shoved aside. The fix: the CCT's `mass` field caps the push impulse per tick; if the push would exceed the cap, the CCT's `finalDisplacement` is reduced (the NPC is blocked). This is the Jolt character controller's standard behavior. Rejected alternative: ignore dynamic-body collision for CCTs — would let NPCs walk through buckets.

---

## 10. Failure cases (consolidated)

1. **Backend fingerprint mismatch on save load** — refused (§2.3).
2. **Shape role misuse** — TypeScript types + role-aware query API (§3.5).
3. **Ghost strike through walls** — strike-volume is `HIT_DETECTION` layer only (§4.4).
4. **Realm profile not refreshed on breakthrough** — explicit `setRealmProfile` call on `BreakthroughCompleted` event (§5.3).
5. **Phase mismatch: routed vs root** — material carries the routed phase; root is not consulted (§6.3).
6. **Cross-browser divergence at tick N** — verification protocol; revert to Rapier if unfixable (§7.4).
7. **CCT walks through dynamic stack** — push-impulse cap per tick (§9.3).
8. **Solver exception during step** — the wrapper catches, re-snapshots, marks the body as broken, and excludes it from the next step. The simulation continues with a degraded body (no physics); a dev-mode warning is emitted.

---

## 11. Rejected alternatives

### 11.1 Direct Jolt/Rapier API access

Exposing Jolt's `RigidBody` class directly to plugins. Rejected because (a) every plugin would be re-typed on solver swap, (b) plugins could call non-deterministic Jolt functions, (c) the determinism wrapper would have nothing to wrap. The `PhysicsBodyHandle` indirection is the price of swappability and the contract.

### 11.2 A single "shape" per body

The Unity-style one-collider pattern. Rejected in §3.1 — produces bodies that either clip or fail to detect.

### 11.3 Dynamic character controller

Rejected in §8.3 — lacks the predictability cultivator combat requires.

### 11.4 Per-frame solver-step count fixed at 1

Some engines call `solver.step(dt)` exactly once per simulation tick. Rejected because cultivator combat at 50 m/s with 0.3 m hit volumes needs sub-step resolution (a strike covers its target in 6 ms; the solver must sub-step at least 3× within that). The wrapper calls `step(dt, maxSubSteps=4)`, with `maxSubSteps` derived from the fastest body's velocity (deterministic — same fastest body → same sub-step count → same hash).

### 11.5 Phase-affinity in the solver itself

Modifying Jolt to be phase-aware. Rejected because it would lock us to a forked Jolt and break the swappability contract. The wrapper's contact-resolution modifier (§6.2) achieves the same effect from outside the solver.

---

## 12. What this document enables

- The simulation speaks `PhysicsBodyHandle` + `PhysicsApi`; the solver is behind an adapter, swappable without touching the simulation.
- Nine shape roles are explicitly named; a body has any subset; query APIs take an explicit role.
- Collision layers separate mortal, cultivator, beast, projectile, trigger, navigation, hit-detection, and qi-effect concerns.
- Realm profiles configure body properties from the doc 32 envelope; breakthroughs refresh them explicitly.
- Qi-enhanced materials carry routing-aware modifiers; phase-affinity collisions apply the doc 32 §2.3 matchup table.
- The kinematic character controller handles the protagonist and NPCs; dynamic bodies are props and debris.
- The determinism wrapper snapshots, hashes, and verifies every step; the cross-browser verification protocol is the gate.
- Rejected alternatives (direct solver access, single shape, dynamic CCT, fixed sub-steps, forked solver) are documented with reasons.

The next step is to implement the adapter against Jolt WASM 5.1.0, run the verification protocol (§7.3) on the four target browsers, and either commit to Jolt or revert to Rapier per the doc 24 §1.4 escape hatch. The smallest end-to-end test: a mortal NPC walking across a flat terrain, hashed at tick 100, must match across browsers. That is the gate; everything in this document is in service of that gate passing.
