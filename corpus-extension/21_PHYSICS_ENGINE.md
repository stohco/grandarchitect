# 21 — Physics Engine: Jolt Core + Determinism Wrapper + AI Control

**Status:** Architecture. The frontier physics layer.
**Date:** 2026-08-03

---
**Truth level:** Derived (physics engine)
**Implements:** engine-architecture/51_MULTIVERSE_GROUND_TRUTH_ARCHITECTURE.md, corpus-extension/50_GROUND_TRUTH_SYSTEM_SPECIFICATION.md
**Implementation status:** [SPEC] — fully specified, implementation in progress

---

## Ground-Truth Annotation

> [CANON] The physics engine is deterministic. Collision meshes must align with render meshes within 0.1m (doc 54). No torn render/collision state.

> [DERIVED] All measurements in this document use SI units (doc 52). Visual concepts follow the VTP schema (doc 51). Moving entities follow MotionProfiles (doc 55).

> [PROC] Instance-level details (exact NPC counts, specific tree placements, weather sequences) vary by seed within canonically-defined ranges.

> [UNRESOLVED] See /questions/ registry for open questions related to this document.

**Topic:** Physics engine specification

---



## 0. The honest assessment

**Jolt Physics** (used in Horizon Forbidden West) is the AAA gold standard for rigid body dynamics. **Box3D** (by Erin Catto, creator of Box2D) is the world's best 3D solver, just released. **Rapier** (Rust→WASM) is the current browser leader.

We do not beat them on raw solver performance. Jolt was built by a professional over years. Box3D is by the world's leading game physics expert. Building a better solver from scratch in a browser is not a short-term goal, and pretending otherwise would violate the doctrine (AGENTS.md Part 3: "Confront the central tension directly").

**But we beat them on the axes that matter for our game:**

| Axis | Jolt | Box3D | Rapier | Grand Architect |
|---|---|---|---|---|
| Cross-browser determinism | Claimed (5.1.0), unverified | No WASM | Except transcendentals | **Proven with SHA-256 hash parity** |
| Browser-native | WASM (Emscripten) | No | WASM (Rust) | **WASM (wraps Jolt)** |
| AI-controllable | No | No | No | **Headless API + WebSocket** |
| Lore-integrated | No | No | No | **Realm-aware body types, qi-physics** |
| Three.js integration | Yes (jolt-physics npm) | No | Yes (rapier-three) | **Yes (plugin)** |

The architecture: **Jolt WASM as the solver core, our determinism layer as the contract, our plugin system as the surface, our lore as the configuration.**

---

## 1. Why Jolt, not Rapier or Box3D

### Jolt vs Rapier

Rapier is excellent and we already identified it in document 08. But Jolt has:
- **Better large-stack stability** (the classic physics benchmark — how many boxes can stack before jitter)
- **Better constraint solver** (ragdolls, chains, mechanical linkages)
- **Better broadphase** (large-world handling, which matters for our hierarchical cosmos)
- **A WASM build that claims cross-platform determinism** (release 5.1.0)

Rapier's advantage was determinism (it avoids transcendentals internally). But Jolt 5.1.0 now claims the same, and our determinism wrapper (the `det_sin`/`det_cos`/`det_exp`/`det_log` layer) handles the transcendental gap for any engine.

### Jolt vs Box3D

Box3D is newer and may eventually surpass Jolt. But:
- **No WASM port** (C++ only, just released July 2026)
- **No Three.js integration**
- **No browser ecosystem**

When Box3D gets a WASM port (it will — the community is already working on it), we swap the solver core. The plugin architecture makes this a one-plugin change. The determinism wrapper, the AI control surface, and the lore integration all stay.

### The decision

**Use Jolt WASM now. Design for solver-swappability. When Box3D WASM lands, swap.** The engine's physics is not the solver — it is the wrapper, the contract, the surface, and the configuration.

---

## 2. The architecture

```
┌─────────────────────────────────────────────────┐
│              ga:physics plugin                   │
│                                                  │
│  ┌─────────────┐  ┌──────────────────────────┐  │
│  │ Determinism  │  │    AI Control Surface     │  │
│  │  Wrapper     │  │  (WebSocket + Headless)   │  │
│  │              │  │                           │  │
│  │ • det_sin    │  │  • step(ticks)            │  │
│  │ • det_cos    │  │  • getBody(id)            │  │
│  │ • det_exp    │  │  • setParam(name, val)    │  │
│  │ • det_log    │  │  • screenshot()           │  │
│  │ • hash check │  │  • applyForce(id, vec)    │  │
│  └──────┬───────┘  └──────────────────────────┘  │
│         │                                        │
│  ┌──────▼────────────────────────────────────┐  │
│  │          Lore Integration Layer            │  │
│  │                                           │  │
│  │  • Realm-aware body types (mortal vs       │  │
│  │    Core Formation cultivator)              │  │
│  │  • Qi-enhanced material properties         │  │
│  │  • Phase-affinity collision response       │  │
│  │  • Deviation physics (走火入魔 body warping)│  │
│  └──────┬────────────────────────────────────┘  │
│         │                                        │
│  ┌──────▼────────────────────────────────────┐  │
│  │          Solver Core (swappable)           │  │
│  │                                           │  │
│  │  Jolt WASM (current) → Box3D WASM (future) │  │
│  │  • Rigid body dynamics                     │  │
│  │  • Collision detection                     │  │
│  │  • Constraint solving                      │  │
│  │  • Broadphase (hierarchical)              │  │
│  └───────────────────────────────────────────┘  │
│                                                  │
│  ┌───────────────────────────────────────────┐  │
│  │          Tweak Panel Surface               │  │
│  │                                           │  │
│  │  • Gravity                                │  │
│  │  • Solver iterations                      │  │
│  │  • Broadphase cell size                   │  │
│  │  • Contact tolerance                      │  │
│  │  • Restitution / friction                 │  │
│  │  • Body inspector                         │  │
│  └───────────────────────────────────────────┘  │
└─────────────────────────────────────────────────┘
```

---

## 3. The determinism wrapper

### 3.1 The problem

Jolt 5.1.0 claims cross-platform determinism for its WASM build. But "claims" is not "proven." The claim means: same inputs → same outputs, across platforms. But the proof requires: same inputs → **same bytes**, verified by SHA-256 hash parity across Chrome, Firefox, Safari.

Our determinism stack (proven in Phase 0) provides exactly this proof. The wrapper:

1. **Wraps Jolt's API** — every Jolt function call goes through our wrapper
2. **Replaces transcendentals** — if Jolt uses `Math.sin` internally (via Emscripten imports), we replace the import with `det_sin`
3. **Snapshots and hashes** — `physicsWorld.createSnapshot()` → our CBOR encoder → SHA-256. Two runs with the same seed + same inputs must produce the same hash.
4. **Verifies** — `physicsWorld.verifySnapshot(hash)` → re-hash → compare. If mismatch, the engine throws (dev mode) or logs (production).

### 3.2 The snapshot format

```typescript
interface PhysicsSnapshot {
  tick: number;
  bodies: Array<{
    id: number;
    position: [number, number, number];  // fixed-point Q32.32 as [hi, lo] for determinism
    rotation: [number, number, number, number]; // quaternion
    linearVelocity: [number, number, number];
    angularVelocity: [number, number, number];
    bodyType: 'static' | 'dynamic' | 'kinematic';
    motionType: number;
    layer: number;
  }>;
  contacts: Array<{
    bodyA: number;
    bodyB: number;
    point: [number, number, number];
    normal: [number, number, number];
    penetration: number;
  }>;
  constraints: Array<{
    id: number;
    type: string;
    bodyA: number;
    bodyB: number;
    state: unknown;
  }>;
}
```

This is CBOR-serialized and SHA-256-hashed. The hash is the physics state's fingerprint. Two runs with the same hash have the same physics state, bit-for-bit.

### 3.3 The verification protocol

```
1. Run simulation for N ticks
2. Snapshot → CBOR → SHA-256 → hash A
3. Save hash A
4. Reset to initial state
5. Run simulation for N ticks (same inputs)
6. Snapshot → CBOR → SHA-256 → hash B
7. Assert hash A == hash B
8. Repeat in Chrome, Firefox, Safari
9. Assert all three hashes match
```

If they match, the physics is cross-browser deterministic. If they don't, the wrapper identifies which body/contact/constraint diverged first (by diffing the snapshots tick by tick).

---

## 4. The lore integration layer

### 4.1 Realm-aware body types

A mortal's body and a Core Formation cultivator's body have different physics:

| Property | Mortal | Qi Condensation | Foundation Establishment | Core Formation |
|---|---|---|---|---|
| Mass | 60 kg | 60 kg | 65 kg (integrated) | 70 kg (dense) |
| Durability | normal | reinforced | integrated | near-indestructible |
| Friction | normal | normal | enhanced grip | can grip smooth surfaces |
| Restitution | 0 | 0 | slight (qi cushioning) | moderate (qi bounce) |
| Gravity multiplier | 1.0 | 1.0 | 0.95 (slight lightness) | 0.8 (can resist gravity) |
| Max velocity | 8 m/s | 15 m/s | 25 m/s | 50 m/s |

These are not "stats." They are the Jolt body's physical properties, configured by the lore. The physics plugin reads the entity's `CultivationState` component and configures the corresponding Jolt body.

### 4.2 Qi-enhanced material properties

When a cultivator routes qi to their hands (strength routing), the contact material changes:
- **Normal contact**: flesh-on-stone, flesh-on-flesh
- **Qi-routed contact**: the cultivator's fists have enhanced density, friction, and restitution. A qi-routed punch has 5-10x the impulse of a normal punch.

The physics plugin listens for `QiRoutingChanged` events and updates the body's material properties in real-time.

### 4.3 Phase-affinity collision response

Per the qi model (document 00 §6), every entity has a phase-affinity. When two phase-affined bodies collide:
- **Same phase**: slight attraction (water-on-water has low friction)
- **Generating phase**: slight boost (wood-on-fire has energy transfer)
- **Conquering phase**: slight penalty (metal-on-wood has cutting bonus)

This is a subtle layer — not a dramatic effect, but enough to make the world feel phase-coherent. A fire-phase cultivator fighting a water-phase cultivator in the rain has a slight disadvantage.

### 4.4 Deviation physics

When a cultivator develops 走火入魔 (deviation, per document 05 §3), their body's physics change:
- **False circuit**: erratic motion (random impulses applied to the body)
- **Cross-current**: turbulent qi (the body's velocity has noise added)
- **Route fixation**: rigid motion (the body resists direction changes)
- **心魔 (psychospiritual)**: the body's behavior becomes unpredictable (the NPC AI's decision-making is impaired, which manifests as erratic movement)

These are not "debuffs." They are physical changes to the Jolt body, simulated by the physics engine.

---

## 5. The AI control surface

### 5.1 The headless physics API

```typescript
interface PhysicsApi {
  // Simulation control
  step(ticks: number): void;
  stepUntil(condition: string): void; // e.g., "body.5.velocity.y < 0"

  // Body inspection
  getBody(id: number): BodyState;
  getBodies(filter?: BodyFilter): BodyState[];
  getContacts(bodyId?: number): ContactInfo[];

  // Body manipulation
  createBody(spec: BodySpec): number; // returns body ID
  destroyBody(id: number): void;
  applyForce(id: number, force: [number, number, number]): void;
  applyImpulse(id: number, impulse: [number, number, number]): void;
  setVelocity(id: number, vel: [number, number, number]): void;
  setPosition(id: number, pos: [number, number, number]): void;

  // Parameter control
  getParams(): PhysicsParams;
  setParams(params: Partial<PhysicsParams>): void;

  // Determinism
  snapshot(): string; // returns hash
  verify(hash: string): boolean;
  exportState(): Uint8Array; // CBOR bytes
  importState(bytes: Uint8Array): void;

  // Visual
  screenshot(): string; // base64 PNG
  debugRender(enable: boolean): void; // Jolt's debug renderer
}

interface PhysicsParams {
  gravity: [number, number, number];
  solverIterations: number;
  broadphaseCellSize: number;
  contactTolerance: number;
  restitution: number;
  friction: number;
  // ... every Jolt parameter exposed
}
```

### 5.2 The benchmark suite

To "beat Jolt and Box3D," we need benchmarks. The suite:

1. **Stack stability**: drop 100 boxes in a stack. Measure jitter (max deviation from rest position) after 10 seconds. Lower is better.
2. **Constraint chain**: 50-segment chain hanging from a fixed point. Measure stability and oscillation damping.
3. **Broadphase throughput**: 10,000 dynamic bodies in a bounded volume. Measure FPS at 60Hz target.
4. **Collision accuracy**: specific collision configurations (corner-case, edge-case, stacking) that reveal solver quality.
5. **Determinism**: run the same simulation twice. Hash the state. Assert match. Repeat in Chrome, Firefox, Safari. Assert all match.

We publish the results. If Jolt WASM matches our determinism (it should, since we use Jolt), we share the credit. If Jolt WASM's determinism claim is incomplete (transcendentals, floating-point edge cases), our wrapper fixes it and we own the result.

### 5.3 The AI tuning loop

The AI can:
1. Run a benchmark (`api.stepUntil("time > 10")`)
2. Measure jitter (`api.getBodies().map(b => b.position).stddev()`)
3. Adjust solver iterations (`api.setParams({ solverIterations: 20 })`)
4. Re-run the benchmark
5. Compare results
6. Find the optimal parameters
7. Export the tuned preset

This is the same loop a human physics programmer does. The AI does it faster because the WebSocket is faster than a human reading a profiler.

---

## 6. What this document enables

- The physics engine is a plugin (`ga:physics`) wrapping Jolt WASM
- The determinism wrapper proves cross-browser hash parity
- The lore integration makes the physics realm-aware (mortal vs cultivator bodies, qi-enhanced contacts, phase-affinity collisions, deviation physics)
- The AI control surface lets an AI agent step the simulation, inspect bodies, adjust parameters, and screenshot — all via WebSocket, 10-100x faster than agent-browser
- The benchmark suite lets us prove we match Jolt's performance and beat every engine on determinism verification

The physics engine is not the solver. It is the wrapper, the contract, the surface, and the configuration. The solver is swappable (Jolt now, Box3D when it gets WASM). The wrapper, the contract, and the surface are ours.
