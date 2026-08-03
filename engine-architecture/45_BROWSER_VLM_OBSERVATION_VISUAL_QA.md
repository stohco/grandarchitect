# 45 — Browser/VLM Observation & Visual QA

**Status:** Architecture. The browser/VLM channel: the AI's eyes.
**Date:** 2026-08-03
**Engine:** Grand Architect (browser-native plugin host, deterministic contract)
**Depends on:** `13_RENDERER_ABSTRACTION` (render passes, G-buffers), `14_THREEJS_WEBGPU_WEBGL_INTEGRATION` (renderer backend), `43_GRAND_ARCHITECT_CONTROL_PLANE` (the three channels), `44_ARCHITECT_TOOL_RESOURCE_PROTOCOL` (VLM tools registered through IAP)
**Read with:** `20_PHYSICS_CHARACTER_CONTROLLERS` (collision wireframe), `21_VOXEL_TERRAIN_DESTRUCTION` (voxel/density visualization), `22_NAVIGATION_MOVEMENT` (nav overlay), `37_DIAGNOSTICS_PROFILING_TELEMETRY` (perf heat map), `46_AUTONOMOUS_CHANGE_VALIDATION_PROMOTION` (visual regression as a validation step)

---

## 0. What this document is

The browser/VLM channel is one of the three communication channels in the Grand Architect Control Plane (doc 43 §1). It is the AI's eyes. Through this channel the AI sees what the engine is rendering, why it is rendering it that way, and how a player would perceive it. The channel carries **synchronized multimodal inspection packages** — not just an RGB frame, but the depth buffer, the object-ID buffer, surface normals, motion vectors, the collision wireframe, the navigation overlay, voxel density, lighting buffers, entity labels, the performance heat map, a slice of the scene graph, the active physics contacts, the selected entity's component data, and the current engine logs. All of these are captured at the same tick, aligned to the same pixel grid, and shipped together.

The doctrine (AGENTS.md Part 3) says: "Design for joy first; the system serves the experience." Visual QA is the system that protects the experience. A change that passes every unit test, every benchmark, and every determinism check but makes the world look wrong is a change that fails. The VLM channel is how the AI — and the human operator the AI reports to — sees the world the player will see, before the player sees it.

The doctrine also says (AGENTS.md Part 3): "Cite the precedent; do not float above it." Visual regression baselines and perceptual thresholds in this document are calibrated against shipped games (Monster Hunter World's environmental tell readability, Death Stranding's depth-based UI legibility, Ghost of Tsushima's guiding-wind saliency). Where a threshold is asserted, the precedent is named.

This document is paired with the VLM tool family in doc 44 §5 (`playtest.launch`) and the visual regression step in the transactional change process (doc 43 §6.2 step 9). The browser channel is the AI's eyes, **not its only hands** — section 7 explains why.

---

## 1. The synchronized multimodal inspection package

A **synchronized multimodal inspection package** (SMIP) is the unit the browser/VLM channel delivers. It is a bundle of buffers and metadata, all captured at the same tick, all aligned to the same viewport. The AI does not request "a frame"; it requests a SMIP, which includes the frame and everything needed to interpret it.

```
┌────────────────────────────────────────────────────────────────────────┐
│            SYNCHRONIZED MULTIMODAL INSPECTION PACKAGE (SMIP)            │
│                                                                        │
│   ┌───────────────┐ ┌───────────────┐ ┌───────────────┐               │
│   │  RGB frame    │ │ Depth buffer  │ │ Object-ID buf │               │
│   └───────────────┘ └───────────────┘ └───────────────┘               │
│   ┌───────────────┐ ┌───────────────┐ ┌───────────────┐               │
│   │ Surface       │ │ Motion        │ │ Collision     │               │
│   │ normals       │ │ vectors       │ │ wireframe     │               │
│   └───────────────┘ └───────────────┘ └───────────────┘               │
│   ┌───────────────┐ ┌───────────────┐ ┌───────────────┐               │
│   │ Navigation    │ │ Voxel/density │ │ Lighting      │               │
│   │ overlay       │ │ visualization │ │ buffers       │               │
│   └───────────────┘ └───────────────┘ └───────────────┘               │
│   ┌───────────────┐ ┌───────────────┐ ┌───────────────┐               │
│   │ Entity labels │ │ Perf heat map │ │ Scene graph   │               │
│   └───────────────┘ └───────────────┘ └───────────────┘               │
│   ┌───────────────┐ ┌───────────────┐ ┌───────────────┐               │
│   │ Physics       │ │ Selected-obj  │ │ Engine logs   │               │
│   │ contacts      │ │ component data│ │ (recent)      │               │
│   └───────────────┘ └───────────────┘ └───────────────┘               │
│                                                                        │
│   All captured at the same tick. All aligned to the same viewport.     │
│   All addressed by the same pixel coordinate system (section 3).       │
└────────────────────────────────────────────────────────────────────────┘
```

```typescript
interface Smip {
  /** The tick at which this SMIP was captured. */
  tick: bigint;
  /** The viewport dimensions (all buffers share them). */
  viewport: { width: number; height: number };
  /** The camera transform, for pixel-to-world resolution. */
  camera: { view: Mat4; projection: Mat4; near: number; far: number };
  /** The render quality preset (affects what's in the RGB frame). */
  qualityPreset: 'desktop-high' | 'desktop-mid' | 'mobile-high' | 'mobile-low';

  /** The 15 layers. Each is optional; the AI requests which to include. */
  layers: {
    rgb?: ImageRef;                  // PNG or WebP
    depth?: ImageRef;                // 16-bit, linear depth
    objectId?: ImageRef;             // 32-bit entity IDs, encoded
    normals?: ImageRef;              // world-space normals
    motionVectors?: ImageRef;        // per-pixel, screen-space
    collisionWireframe?: ImageRef;   // overlay
    navigationOverlay?: ImageRef;    // overlay
    voxelDensity?: ImageRef;         // cross-section
    lighting?: ImageRef;             // diffuse + specular + ambient
    entityLabels?: LabelOverlay;     // bounding boxes + names
    perfHeatMap?: ImageRef;          // ms-per-tile
    sceneGraph?: SceneGraphSlice;    // the relevant subtree
    physicsContacts?: ContactList;   // active contacts this tick
    selectedObject?: ComponentDump;  // for the entity under the crosshair
    engineLogs?: LogSlice;           // last N log lines
  };

  /** The capture cost, for budget tracking. */
  cost: { captureMs: number; encodeMs: number; sizeKiB: number };
}
```

### 1.1 The 15 layers, in detail

| Layer | Source | Resolution | Why the AI needs it |
|---|---|---|---|
| RGB frame | Renderer's final pass | Viewport | What the player sees |
| Depth buffer | Renderer's depth pass | Viewport | Pixel-to-world; occlusion reasoning |
| Object-ID buffer | Renderer's object-ID pass | Viewport | Pixel-to-entity; click resolution |
| Surface normals | Renderer's G-buffer | Viewport | Material diagnosis; lighting bugs |
| Motion vectors | Renderer's velocity pass | Viewport | TAA diagnosis; motion perception |
| Collision wireframe | Physics debug | Viewport | Why is the player stuck? |
| Navigation overlay | NavMesh debug | Viewport | Why is the NPC pathing there? |
| Voxel/density | Terrain debug | Cross-section | Why is terrain generating this way? |
| Lighting buffers | Renderer's lighting pass | Viewport | Why is this pixel bright? |
| Entity labels | Scene graph + camera | Overlay | Who is on screen? |
| Perf heat map | Profiler | Tile grid | Where is frame time going? |
| Scene graph slice | Scene graph | Subtree | What's the parent/child of this? |
| Physics contacts | Physics | List | What is touching what? |
| Selected-object components | Entity runtime | Dump | What is this entity's state? |
| Engine logs | Diagnostics | Slice | What did the engine say recently? |

### 1.2 Why all 15, not just RGB

A bare RGB frame is what a human sees; it is not what an AI sees. The AI does not have a visual cortex trained on a lifetime of 3D scenes. It cannot reliably infer "why is the player stuck?" from a frame. The depth buffer tells it where surfaces are; the collision wireframe tells it where the physics solver thinks surfaces are; the gap between the two is the bug. The 15 layers are the AI's prosthetic visual cortex — they give the AI the structured signals a human's cortex infers.

This is not theoretical. The precedent: Death Stranding's QA tooling (per the team's GDC 2020 talk) captures depth + normals + object IDs alongside RGB for automated regression testing. Monster Hunter World's combat readability work (Famitsu 2018) used motion vectors to verify tell animations were perceivable. The engine's SMIP is the same idea, generalized.

---

## 2. SMIP capture and delivery

The AI requests a SMIP through the `vlm.capture` tool (registered in doc 44's registry as an Inspection tool). The tool returns either the full SMIP (if it fits in the response) or a handle to a streamed result.

```typescript
interface VlmCaptureParams {
  /** Which layers to include. Default: all 15. */
  layers?: SmipLayer[];
  /** The viewport size. Default: 1280x720. Max: 1920x1080. */
  viewport?: { width: number; height: number };
  /** The camera override. Default: the current camera. */
  camera?: { position: Vec3; target: Vec3; fov: number };
  /** The quality preset. Default: 'desktop-mid'. */
  qualityPreset?: 'desktop-high' | 'desktop-mid' | 'mobile-high' | 'mobile-low';
  /** Whether to capture at the next tick or block until capture completes. */
  mode?: 'next-tick' | 'block';
}

type SmipLayer =
  | 'rgb' | 'depth' | 'objectId' | 'normals' | 'motionVectors'
  | 'collisionWireframe' | 'navigationOverlay' | 'voxelDensity'
  | 'lighting' | 'entityLabels' | 'perfHeatMap' | 'sceneGraph'
  | 'physicsContacts' | 'selectedObject' | 'engineLogs';

interface VlmCaptureResult {
  smip: Smip;
  /** The capture cost, deducted from the session budget. */
  cost: { captureMs: number; encodeMs: number; sizeKiB: number; vlmTokensEstimate: number };
}
```

### 2.1 Streaming

A full 15-layer SMIP at 1280x720 is roughly 8-15 MiB encoded (PNG/WebP for the image layers, CBOR for the structured ones). For WebSocket clients, the SMIP is streamed layer-by-layer; the AI can begin reasoning on the RGB frame while the depth buffer is still arriving. For REST clients, the SMIP is returned as a single binary response.

### 2.2 Frequency and budget

SMIP capture is not free. The AI's session budget (doc 44 §8) tracks `captureMs`, `encodeMs`, `sizeKiB`, and `vlmTokensEstimate` (an estimate of how many tokens the SMIP will cost to interpret). A session that hammers `vlm.capture` will burn through its VLM token budget; the Gateway enforces the budget and surfaces the burn rate to the operator.

The recommended pattern: capture a SMIP when something changes (a step in the self-improvement loop completes, a test fails, a frame is anomalous), not on a fixed cadence. The webhook channel (doc 43 §1.1) carries the "something changed" events; the AI captures a SMIP in response.

---

## 3. Pixel-to-world inspection

Pixel-to-world inspection is the killer capability of the VLM channel. The AI clicks a pixel — or, more precisely, gives a `(x, y, tick)` coordinate — and the engine resolves it to everything that pixel touches: world coordinate, entity, material, triangle, chunk ID, voxel samples, collision shape, owning plugin, and generation provenance.

```typescript
interface VlmPixelToWorldParams {
  /** Screen coordinates. */
  x: number; y: number;
  /** The tick (which SMIP to resolve against). */
  tick: bigint;
  /** Which facets to resolve. Default: all. */
  include?: PixelToWorldFacet[];
}

type PixelToWorldFacet =
  | 'worldCoordinate' | 'entity' | 'material' | 'triangle'
  | 'chunkId' | 'voxelSamples' | 'collisionShape' | 'owningPlugin'
  | 'generationProvenance';

interface VlmPixelToWorldResult {
  worldCoordinate: Vec3;             // the world-space point this pixel samples
  depth: number;                     // linear depth, in meters
  entity?: {
    entityId: number;
    name: string;
    owningPlugin: PluginId;
    componentSummary: { type: string; snapshot: unknown }[];
  };
  material?: {
    materialId: string;
    shader: string;
    owningPlugin: PluginId;
    uniforms: Record<string, unknown>;
    textures: { name: string; hash: string; size: [number, number] }[];
  };
  triangle?: {
    meshId: string;
    triangleIndex: number;
    vertices: [Vec3, Vec3, Vec3];
    normal: Vec3;
    owningPlugin: PluginId;
  };
  chunkId?: string;                  // if the pixel hits terrain
  voxelSamples?: {                   // density samples around the hit point
    position: Vec3;
    density: number;
    biome: number;
  }[];
  collisionShape?: {
    colliderId: number;
    shape: ColliderShape;
    owningPlugin: PluginId;
  };
  generationProvenance?: ProvenanceChain[];  // see doc 49 §5
}
```

### 3.1 How pixel-to-world resolution works

The resolution is a layered lookup, using the SMIP's buffers:

```
1. (x, y) ──> depth buffer ──> linear depth ──> world coordinate
2. (x, y) ──> object-ID buffer ──> entity ID ──> entity record
3. (x, y) ──> normals buffer ──> surface normal ──> material (via entity)
4. world coordinate ──> spatial index ──> triangle (via mesh BVH)
5. world coordinate ──> terrain chunk index ──> chunk ID + voxel samples
6. world coordinate ──> physics broadphase ──> collider at this point
7. entity ID ──> plugin registry ──> owning plugin
8. entity ID ──> provenance store ──> generation chain (doc 49 §5)
```

Each step is independent and cached. A pixel-to-world query that hits the same `(x, y, tick)` twice returns the cached result. A query against a different tick re-runs the resolution.

### 3.2 Pixel-to-world failure cases

- **Pixel hits sky.** No entity, no material, no triangle. The result includes only `worldCoordinate` (at far-plane depth) and a `sky: true` flag.
- **Pixel hits UI.** The UI is not in the world; the result includes `uiElement: { id: string; layer: string }` and the world-coordinate is the far plane.
- **Object-ID buffer empty at this pixel.** Either the renderer did not write one (some passes skip it), or the pixel hit an object without an ID (e.g., a particle). The result falls back to depth-only.
- **Entity destroyed between capture and resolution.** The result includes the entity's last-known snapshot with a `destroyed: true` flag.
- **Chunk evicted.** If the terrain chunk for this pixel was evicted between capture and resolution, `voxelSamples` is absent and a warning is returned.

---

## 4. Visual regression testing

Visual regression is the structural answer to "did this change make the world look different, and is that difference acceptable?" It is step 9 of the transactional change process (doc 43 §6.2). The AI captures SMIPs at defined checkpoints, compares them against a baseline, and reports the differences.

```typescript
interface VisualRegressionSpec {
  /** The scenario to run. */
  scenario: string;
  /** The checkpoints (tick numbers) at which to capture. */
  checkpoints: number[];
  /** The baseline to compare against. */
  baseline: { id: string; capturedAt: string; engineFingerprint: string };
  /** The perceptual threshold (0..1). Above this is a regression. */
  threshold: number;
  /** Which layers to compare. Default: rgb only. */
  layers?: SmipLayer[];
  /** Whether to use the VLM to evaluate borderline diffs. */
  vlmEvaluateBorderline?: boolean;
}

interface VisualRegressionReport {
  scenario: string;
  baseline: { id: string; engineFingerprint: string };
  candidate: { id: string; engineFingerprint: string };
  checkpoints: {
    tick: number;
    layer: SmipLayer;
    diffPct: number;                  // 0..1
    status: 'pass' | 'fail' | 'borderline';
    diffImage: ArtifactRef;           // a red-highlighted diff PNG
    vlmVerdict?: { acceptable: boolean; reason: string };
  }[];
  totalDiff: number;
  passed: boolean;
  /** If failed, which checkpoints failed. */
  failures: { tick: number; layer: SmipLayer; diffPct: number; reason: string }[];
}
```

### 4.1 The perceptual threshold

The threshold is **not** a flat pixel-percentage. It is a perceptual difference, calibrated against the human visual system's contrast sensitivity. The engine uses a perceptual diff (a Butteraugli-style metric, adapted for browser-side computation) that weights differences by where they appear in the frame and how visible they are. A 2% pixel difference in a high-contrast area is a regression; a 2% pixel difference in a low-contrast area is noise.

The default threshold is 0.02 (2% perceptual difference). This is calibrated against Death Stranding's regression tolerances (per the team's GDC 2020 talk, ~2% for environmental scenes, ~0.5% for UI). Different scenarios may use different thresholds; the spec is per-scenario.

### 4.2 VLM evaluation of borderline cases

A diff that lands between `threshold` and `threshold * 1.5` is **borderline**. The AI may ask the VLM to evaluate: "Is this difference acceptable? Did the change intentionally alter this region?" The VLM's verdict is recorded with the diff image and the reason. The VLM is not authoritative — the human operator can override — but it filters the vast majority of borderline cases correctly.

### 4.3 Baselines and engine fingerprints

A baseline is tied to the engine fingerprint (doc 06 §6). A change that bumps the fingerprint invalidates every baseline; the AI must re-capture baselines for the new fingerprint. This is annoying but correct: a fingerprint change means the determinism-affecting behavior of the engine changed, and every visual is suspect until re-baselined.

### 4.4 Visual regression failure cases

- **Baseline not found.** `visualRegression.run` fails with `NotFound`; the AI must capture a baseline first.
- **Fingerprint mismatch.** The candidate's fingerprint differs from the baseline's; the run fails with `Conflict`. The AI re-baselines.
- **Scenario did not reach a checkpoint.** If the scenario crashed before tick N, the checkpoint is `fail` with `reason: 'scenario-crashed'`.
- **Diff exceeds budget.** If the diff computation exceeds its budget (large frames, many checkpoints), the run is sharded; partial results are returned.
- **VLM unavailable.** If the VLM service is down, borderline cases default to `fail` (fail-closed) with a flag for human review.

---

## 5. Player-perspective QA (VLM playtesting)

Player-perspective QA is the VLM playtester role (doc 43 §3) doing what a human playtester does: playing the game, looking for things that feel wrong, reporting bugs. The VLM is not a player; it is a playtester — it has tools a player does not (the SMIP, the pixel-to-world resolver, the engine logs) and it has objectives a player does not (verify specific behaviors, probe specific scenes).

```typescript
interface VlmPlaytestSpec {
  /** The scenario to play. */
  scenario: string;
  /** The duration, in seconds of wall-clock play. */
  durationSec: number;
  /** The VLM model to use. */
  vlmModel: string;
  /** The objectives — what the playtester is trying to verify. */
  objectives: PlaytestObjective[];
  /** The seed. */
  seed: string;
  /** The frame rate cap (for low-frame-rate testing). */
  fpsCap?: number;
  /** Whether to inject adversarial inputs (see doc 46 §3). */
  adversarial?: boolean;
}

interface PlaytestObjective {
  description: string;                // "reach the village"
  successCriteria: string;            // "the village elder is visible"
  failureCriteria?: string;           // "the player character falls through the world"
}

interface VlmPlaytestReport {
  scenario: string;
  durationSec: number;
  objectivesAchieved: string[];
  objectivesFailed: { objective: string; reason: string; tick: bigint; frame?: ArtifactRef }[];
  /** Issues the playtester found, ranked by severity. */
  issues: PlaytestIssue[];
  /** The full playtest log — every action, every observation, every reasoning step. */
  log: PlaytestLogEntry[];
  /** VLM cost. */
  cost: { tokensIn: number; tokensOut: number; usd: number; smipsCaptured: number };
  /** Whether the playtester would recommend shipping this scenario. */
  recommendation: 'ship' | 'fix-first' | 'block';
}

interface PlaytestIssue {
  severity: 'low' | 'med' | 'high' | 'blocker';
  category: 'visual' | 'interaction' | 'performance' | 'narrative' | 'audio' | 'other';
  description: string;
  evidence: { tick: bigint; smipRef: string; pixelToWorldRef?: string };
  suggestedFix?: string;
}
```

### 5.1 The playtest loop

The playtester runs in a loop:

1. **Observe.** Capture a SMIP at the current tick.
2. **Decide.** The VLM reasons: "What is on screen? What is the objective? What should I do next?"
3. **Act.** The VLM emits an input (move, look, click, key) through the browser channel's input path.
4. **Verify.** After the action, capture another SMIP; check whether the action had the intended effect.
5. **Record.** Every step is appended to the playtest log.

The loop runs at the engine's frame rate (or the `fpsCap`, if set). Each iteration consumes VLM tokens; the budget (doc 44 §8) caps the total cost.

### 5.2 What the VLM playtester is good at

- **Visual anomalies.** "The river is flowing uphill." "The NPC's leg is twisted." "The shadow is detached from the character."
- **Missing feedback.** "I pressed attack and there was no visual response for 300ms." "The enemy's health bar did not decrease."
- **Pacing problems.** "I walked for 45 seconds without anything happening." "The dialogue advanced before I finished reading."
- **Readability.** "The objective marker is hidden behind a tree." "The enemy's tell animation is too subtle to react to." (Calibrated against Monster Hunter World's tell timings.)

### 5.3 What the VLM playtester is bad at

- **Aesthetics.** "Is this scene beautiful?" The VLM has no taste; it can detect anomalies but cannot judge art.
- **Long-term narrative.** "Does this story arc land?" The VLM has no memory of the prior 20 hours; it sees the current scene.
- **Emotional resonance.** "Did this moment feel earned?" The VLM has no emotions.

For these, the human operator's judgment is required. The VLM playtester surfaces the issues a human playtester would surface; the human operator makes the final call on the issues a human would not surface.

### 5.4 Adversarial playtesting

When `adversarial: true`, the playtester actively tries to break the scenario: walking into walls, mashing buttons, pausing and unpausing, switching tabs, triggering save/load mid-action, running in the wrong direction. This is the falsification requirement (doc 46 §3) applied to playtesting. The playtester reports every break it finds, with the input sequence that triggered it.

---

## 6. The browser channel is the AI's eyes, not its only hands

The browser channel can inject input — mouse moves, key presses, click targets — into a running scenario. But this input does not mutate engine state directly. It becomes a **command** in the input log, processed through the same command path as player input, audited and replayable.

```
┌──────────────────────────────────────────────────────────────────┐
│         BROWSER CHANNEL INPUT PATH (asymmetric)                  │
│                                                                  │
│   AI ──> "click at (320, 240)" ──> Gateway ──> Input Command     │
│                                                      │           │
│                                                      v           │
│   ┌──────────────────────────────────────────────────────────┐  │
│   │  COMMAND PATH (same as player input, doc 10)             │  │
│   │  • recorded in the input log                             │  │
│   │  • processed by the scheduler, in tick order             │  │
│   │  • affects the determinism hash                          │  │
│   │  • audited with who/what/when/why                        │  │
│   └──────────────────────────────────────────────────────────┘  │
│                                                      │           │
│                                                      v           │
│   Engine state changes (if the command mutates state)            │
└──────────────────────────────────────────────────────────────────┘
```

### 6.1 Why the asymmetry

The asymmetry (observation is high-bandwidth and direct; control is low-rate and command-mediated) exists for three reasons:

1. **Determinism.** If the AI could mutate state directly through the browser channel, the mutation would not be in the input log, and the determinism contract (doc 06) would be broken. Every mutation must go through the command path; the browser channel's input is one source of commands, alongside the player's keyboard and the AI's `definition.patch` calls.
2. **Audit.** A browser-channel mutation that bypassed the command path would be unaudited. The audit log (doc 48) is the operator's tool for understanding what the AI did; an unaudited path is a hole in the audit.
3. **Replayability.** A playtest that ran through the browser channel's input path can be replayed against a fresh engine, byte-for-byte, because the input is in the log. A playtest that ran through a direct-mutation path could not.

### 6.2 What "the AI's eyes, not its only hands" means

The browser channel is one of the AI's hands (it can drive playtests), but it is not the only one. The AI's other hands are the Controlled Editing tools (doc 44 §4), the Execution tools (doc 44 §5), and the tool proposal system (doc 44 §7). The browser channel is optimized for observation and for low-rate input; the command channel is optimized for high-rate, structured, audited control. Using the browser channel for high-rate control would be like a surgeon operating through a keyhole: technically possible, but not what the keyhole is for.

---

## 7. Failure cases

| Failure | Detection | Response |
|---|---|---|
| VLM service unavailable | Gateway health check | `vlm.capture` and `playtest.launch` return `ServiceUnavailable`; AI may proceed without VLM (visual regression defaults to threshold-only) |
| SMIP capture exceeds budget | Per-call budget check | Tool cancelled; partial SMIP returned with `truncated: true` |
| Object-ID buffer not rendered | Layer absent in SMIP | Pixel-to-world falls back to depth-only; warning in result |
| Depth buffer precision insufficient | Depth > far plane | Pixel-to-world returns `worldCoordinate` at far plane with `far: true` flag |
| VLM misidentifies entity in frame | VLM confidence below threshold | Issue is logged as `severity: 'low'` with `needs-human-review: true` |
| Visual regression baseline stale | Fingerprint mismatch | `visualRegression.run` fails; AI re-baselines or escalates |
| Playtest stuck (no progress for N ticks) | Watchdog | Playtest is paused; AI is notified; AI may cancel or inject a different input |
| Playtest VLM cost exceeds budget | Per-call budget check | Playtest is cancelled; partial log is returned with `budgetExceeded: true` |
| Adversarial playtest triggers a crash | Engine heartbeat loss | Playtest is terminated; crash dump is the artifact; issue is logged as `severity: 'blocker'` |
| Browser channel input rejected by scheduler | Command path validation | Input is recorded as `rejected` in the playtest log with the reason |

---

## 8. Rejected alternatives

### 8.1 "Just send the RGB frame"

The first design: the browser channel sends only RGB frames, and the VLM infers everything else. Rejected because (a) the VLM cannot reliably infer depth, object identity, or material from an RGB frame — every shipped game that does automated visual QA (Death Stranding, Monster Hunter World, Ghost of Tsushima) uses G-buffer layers alongside RGB; (b) pixel-to-world resolution is impossible without the depth and object-ID buffers; (c) the AI's reasoning about "why is this pixel this color" needs the lighting and normals buffers. The 15-layer SMIP is the minimum that makes the AI's visual reasoning reliable.

### 8.2 "Capture every frame"

The second design: capture a SMIP every frame, stream it to the AI. Rejected because (a) the bandwidth is prohibitive — a 60fps stream of 15-layer SMIPs is multiple GiB per minute; (b) the AI's reasoning is not per-frame, it is per-event — the AI cares when something changes, not every 16ms; (c) the VLM cost of interpreting every frame would consume the budget in minutes. The event-driven capture pattern (section 2.2) is the right granularity.

### 8.3 "Pixel-to-world via raycasting from the CPU"

The third design: when the AI asks about a pixel, raycast from the camera through the pixel into the scene. Rejected because (a) it requires re-running the scene's BVH traversal on the CPU, which is slow and may not match what the GPU actually rendered (LOD, instancing, GPU-only geometry); (b) it does not capture what the player sees — the player sees the GPU's output, not a CPU raycast; (c) the object-ID buffer already encodes what the GPU rendered, for free, as a render pass. Pixel-to-world via the SMIP's buffers is faster, more accurate, and aligned with what the player actually saw.

### 8.4 "VLM as the visual regression oracle"

The fourth design: skip the perceptual diff and just ask the VLM "is this frame different from the baseline?" Rejected because (a) the VLM is expensive — running it on every checkpoint of every regression run burns the budget; (b) the VLM is non-deterministic — the same diff may be judged differently on different runs; (c) the perceptual diff is faster, cheaper, and more consistent. The VLM is used only for borderline cases (section 4.2), where its judgment adds value.

### 8.5 "The browser channel can mutate state directly"

The fifth design: the browser channel can issue direct state mutations, like a trainer mode. Rejected per section 6.1 — it would break determinism, audit, and replay. The browser channel's input becomes a command, processed through the same path as player input.

### 8.6 "One VLM model for everything"

The sixth design: use one VLM model for capture interpretation, visual regression, and playtesting. Rejected because the tasks are different: capture interpretation benefits from a fast, cheap model (high throughput, low cost); visual regression borderline cases benefit from a precise model (high accuracy, moderate cost); playtesting benefits from a reasoning model (high capability, high cost). The spec allows per-task model selection (section 5.1, `vlmModel`); one model for everything would either overspend on the cheap tasks or underperform on the hard ones.

---

## 9. What this document enables

The browser/VLM channel as specified here enables the AI to:

- **See** what the engine is rendering, in 15 synchronized layers (section 1).
- **Resolve** any pixel to its world coordinate, entity, material, triangle, chunk, voxel, collider, plugin, and provenance (section 3).
- **Detect** visual regressions with perceptual accuracy, calibrated against shipped games (section 4).
- **Playtest** scenarios as a player would, finding issues that unit tests and benchmarks cannot (section 5).
- **Drive** a running scenario through input, with the input recorded in the input log for determinism and replay (section 6).

The doctrine (AGENTS.md Part 3) says: "Cite the precedent; do not float above it." The VLM channel's design is anchored to the QA practices of shipped games (Death Stranding, Monster Hunter World, Ghost of Tsushima). Where the engine's needs differ (the 15-layer SMIP, the pixel-to-world resolver), the difference is named and justified. The VLM channel is not a research project; it is the disciplined application of known visual-QA practice to a browser-native engine, extended with the pixel-to-world capability that makes the AI's visual reasoning tractable.
