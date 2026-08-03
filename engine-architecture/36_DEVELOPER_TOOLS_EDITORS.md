# 36 — Developer Tools & Editors

**Status:** Architecture. The editor suite that ships with the engine.
**Date:** 2026-08-03

---

## 0. What this document is

Every parameter in the engine is controllable by an AI agent (doc 17 §4) and by a human designer. The editor suite is the human surface. It is also the AI surface: every editor is a thin React/IMGUI shell over the headless API, so an AI agent can drive the same editors a human drives, programmatically. This is not a separate "dev tools" subsystem bolted on; it is the same API the simulation uses, exposed.

The doctrine (AGENTS.md Part 1) says: "Grow the system in layers. Start from the smallest version that works end to end." The editor suite grows in the same order: the tweak panel and scene inspector first (they are the smallest end-to-end useful thing), then the asset browser, then the generators, then the determinism debugger. Every editor below has a working prototype path through the headless API before it has a UI.

---

## 1. The 16 questions

### 1.1 The Tweak Panel (real-time parameter tuning, export presets)

The tweak panel is the engine's first editor surface (already prototyped in the determinism harness). It is a unified, collapsible panel organized by plugin. Every parameter is a slider/color picker/toggle. Changes apply in real time. "Export Preset" saves the current parameter set to JSON; "Import Preset" loads one.

```typescript
interface TweakPanelSpec {
  pluginId: string;
  title: string;
  controls: TweakControl[];
}

type TweakControl =
  | { type: 'slider';   key: string; label: string; min: number; max: number; step: number }
  | { type: 'color';    key: string; label: string; format: 'rgb' | 'hex' }
  | { type: 'toggle';   key: string; label: string }
  | { type: 'select';   key: string; label: string; options: { value: string; label: string }[] }
  | { type: 'vector3';  key: string; label: string; min: number; max: number; step: number }
  | { type: 'curve';    key: string; label: string; points: [number, number][] };

interface Preset {
  engineFingerprint: string;   // presets are fingerprint-scoped
  values: Record<string, Record<string, unknown>>;  // pluginId → { key: value }
  timestamp: string;
  note?: string;
}
```

Presets are fingerprint-scoped: a preset exported on fingerprint X applies to fingerprint X only. Loading a preset on a different fingerprint is refused with a diff of what changed.

The tweak panel is also the persistence surface for "what does the designer like": every preset is a candidate for canonization into a definition (doc 36 §8). The "Promote to Definition" button turns a preset's values into a definition patch.

### 1.2 The Scene Inspector (entity tree, component viewer)

A tree view of the scene graph. Click any entity to see its components. Select an NPC to see their schedule, state, and relationships. Select a paddy to see its ownership, crop state, and water level.

```typescript
interface SceneInspectorView {
  tree: SceneTreeNode[];
  selected?: EntityInfo;
}

interface SceneTreeNode {
  entityId: number;
  name: string;                  // derived from a Name component if present
  children: SceneTreeNode[];
  componentCount: number;
  tier: 'S4' | 'S3' | 'S2' | 'S1' | 'S0';  // simulation tier (doc 17 §6.2)
}

interface EntityInfo {
  id: number;
  components: { pluginId: string; name: string; state: unknown }[];
  parent?: number;
  bounds?: AABB;
  // The inspector also surfaces the entity's recent event log (last 50 events)
  recentEvents: { tick: number; event: string; payload: unknown }[];
}
```

The inspector is read-mostly. Editing a component's state inline is allowed in dev mode and triggers a `host.setState` call; in production it is read-only. The inspector highlights entities whose tier has changed this frame (a tier transition is a meaningful event per doc 17 §6.2).

### 1.3 The Asset Browser (registry, preview, import)

Lists every loaded asset (glTF models, KTX2 textures, materials, audio). Each entry shows its content hash, byte size, reference count, and the asset's source (engine, mod, user-imported). Click to preview in isolation (a 3D viewport for models, a 2D viewer for textures, a waveform for audio).

```typescript
interface AssetBrowserEntry {
  hash: string;                  // content-addressed
  type: 'gltf' | 'ktx2' | 'material' | 'audio' | 'json';
  sizeBytes: number;
  refCount: number;
  source: { kind: 'engine' | 'mod'; id: string } | { kind: 'user-import'; path: string };
  preview: AssetPreview;
  // For imported assets, the import params that produced this asset
  importParams?: AssetImportParams;
}

interface AssetImportParams {
  sourcePath: string;            // .blend, .png, .wav
  pipeline: 'gltf-transform' | 'ktx2-enc' | 'audio-enc';
  options: Record<string, unknown>;
}
```

The Import button takes a source file (Blender `.blend`, PNG, WAV), runs the asset pipeline (doc 40 §2), and registers the result. The import params are persisted so the asset can be rebuilt when the source changes. The browser surfaces orphaned assets (refCount = 0) for cleanup.

### 1.4 The World Generator Editor (seed, parameters, preview)

The world generator editor drives `ga:gen-*` plugins (doc 17 §8.2). The designer picks a seed, sets generator parameters (cosmology, geography, settlement, NPC, ecology, economy), and previews the output. Preview is incremental: changing the village seed does not regenerate the cosmology.

```typescript
interface WorldGenEditorState {
  seedHierarchy: {
    cosmos: string;
    world: string;              // derived from cosmos + world index
    region: string;             // derived from world + region index
    village: string;            // derived from region + village index
  };
  generatorParams: {
    cosmology?: CosmosGenParams;
    geography?: GeographyGenParams;
    settlement?: SettlementGenParams;
    npc?: NpcGenParams;
    ecology?: EcologyGenParams;
    economy?: EconomyGenParams;
  };
  preview: {
    output: 'cosmos' | 'world' | 'region' | 'village';
    format: 'map' | 'list' | 'scene';
    hash: string;               // the generator's output hash, for reproducibility
  };
}
```

The editor's "Lock Seed" button pins the seed hierarchy so parameter tweaks regenerate the same world with different parameters, isolating the effect. The "Verify Determinism" button regenerates from the same seed + params in a headless worker and asserts the hash matches (doc 38 §3).

### 1.5 The Animation Graph Editor

The animation graph editor authors `AnimationGraph` assets. A graph is a node-based editor: state nodes (idle, walk, run, attack), transition edges with conditions and blend times, and parameter inputs.

```typescript
interface AnimationGraph {
  id: string;
  parameters: { name: string; type: 'bool' | 'float' | 'int' | 'trigger' }[];
  nodes: AnimGraphNode[];
  transitions: AnimTransition[];
  entryNode: string;
}

interface AnimGraphNode {
  id: string;
  kind: 'clip' | 'blend' | 'state-machine' | 'ik-target';
  clipRef?: string;              // asset hash for 'clip' nodes
  blendMode?: 'linear' | 'additive';
  children?: string[];           // for 'state-machine' nodes
}

interface AnimTransition {
  from: string;
  to: string;
  durationMs: number;
  conditions: { param: string; op: '==' | '>' | '<' | 'trigger'; value: unknown }[];
  exitTime?: number;             // normalized [0,1] of source clip
}
```

The editor previews the graph on a skinned mesh in isolation. It records a hash of the graph (CBOR + SHA-256) so animation assets are content-addressed and reproducible.

### 1.6 The VFX Recipe Editor

The VFX recipe editor authors `VfxRecipe` assets. A recipe is a deterministic particle/effect specification: emitter shape, particle lifetime, force fields, color ramps, mesh/sprite references.

```typescript
interface VfxRecipe {
  id: string;
  emitter: {
    shape: 'point' | 'sphere' | 'box' | 'mesh-surface';
    rate: number;                // particles per second (deterministic)
    bounds: AABB;
  };
  particle: {
    lifetime: [number, number];  // min, max — sampled from RNG
    initialVelocity: Vec3Range;
    size: Curve;
    colorRamp: { t: number; color: [number, number, number, number] }[];
  };
  forces: VfxForce[];            // gravity, wind, attractor
  renderMode: 'billboard' | 'mesh' | 'ribbon';
  meshRef?: string;              // asset hash for 'mesh' mode
  // RNG seed offset — the recipe's RNG is seeded from the world seed + this offset
  seedOffset: bigint;
}
```

VFX is rendering-only — it never touches canonical simulation state — so VFX can use `Math.random` freely. But the recipe itself is content-addressed (CBOR + SHA-256) and the seed offset is recorded so a recipe is reproducible. A recipe attached to a cultivator's tribulation effect is the same recipe every time the tribulation fires, with the same particles.

### 1.7 The Terrain Editor (brushes, density painting)

The terrain editor paints terrain modifications: height brushes, biome brushes, density brushes (for foliage, spirit herbs, NPC spawn density), and material brushes (texture layer weights).

```typescript
interface TerrainEditorState {
  activeLayer: 'height' | 'biome' | 'density' | 'material';
  brush: {
    shape: 'circle' | 'square' | 'stamp';
    radius: number;              // world units
    falloff: Curve;              // [0,1] → [0,1]
    strength: number;            // [0,1]
    stampRef?: string;           // for 'stamp' shape, a heightmap asset
  };
  // The terrain editor's writes go through host.setState('ga:terrain', ...)
  // so they are part of canonical state and hashable.
  pendingPatches: TerrainPatch[];
}

interface TerrainPatch {
  layer: 'height' | 'biome' | 'density' | 'material';
  region: AABB;                  // world-space bounds of the patch
  op: 'add' | 'set' | 'multiply';
  data: Float32Array;            // grid of values, dimensions from region
  source: 'user-brush' | 'generator' | 'mod';
}
```

Terrain edits are canonical state — they are part of the world hash. This means a designer's terrain edits are part of the save and reproducible. The editor surfaces the hash delta after each stroke so the designer sees the determinism cost of an edit.

### 1.8 The Definition Editor (create/patch definitions)

The definition editor creates and patches definitions. A definition is a typed configuration record: an NPC definition (`npc:wang-elder`), a sect definition (`sect:cloud-sword`), a spirit beast definition (`beast:nine-tails-fox`), a technique definition, a material definition.

```typescript
interface Definition {
  id: string;                    // namespaced: 'npc:wang-elder'
  type: string;                  // 'npc' | 'sect' | 'beast' | 'technique' | 'material' | ...
  schemaVersion: string;
  fields: Record<string, unknown>;
  source: { kind: 'canon' | 'mod' | 'user'; id: string };
  // The definition's hash, for content-addressing and conflict detection
  hash: string;
}

interface DefinitionPatch {
  targetId: string;
  op: 'add' | 'patch' | 'remove';
  fields?: Record<string, unknown>;
  reason?: string;               // surfaced in the conflict UI
}
```

The editor presents a form for each definition type (driven by the type's JSON Schema). Patches are recorded, not applied in place: the canon definition is preserved, and the patch is layered on top. This means a mod's patch and a user's patch can coexist; the conflict resolver (doc 35 §2.4) merges them in load order.

### 1.9 The Template Editor

A template is a parameterized entity recipe: "a mortal village household with N members, a paddy, and a lineage hall." Templates are instantiated by generators (doc 17 §8.2) and by the player (the Mahayana Law Author surface).

```typescript
interface Template {
  id: string;                    // 'village:household-mortal'
  parameters: { name: string; type: string; default: unknown; range?: [number, number] }[];
  entities: TemplateEntity[];    // entities to instantiate
  constraints: TemplateConstraint[];  // 'paddy must be within 50m of hall'
  // The template's RNG draws from the instantiating seed, so the same template
  // + same seed = same instance.
  seedUsage: 'deterministic';
}

interface TemplateEntity {
  definitionRef: string;         // 'npc:mortal-farmer'
  parameterBindings?: Record<string, string>;  // template param → entity field
  transform?: 'fixed' | 'scatter' | 'grid';
}
```

The template editor previews an instantiation with sample parameters. The "Verify Determinism" button instantiates the template with a fixed seed in a worker and asserts the resulting entity set hashes identically across runs.

### 1.10 The Rule Editor

A rule is a conditional transformation on world state: "when a mortal NPC reaches age 60, schedule a longevity banquet event." Rules are the engine's reactive layer.

```typescript
interface Rule {
  id: string;                    // 'rule:longevity-banquet'
  trigger: {
    kind: 'on-tick' | 'on-event' | 'on-state-change';
    predicate: RulePredicate;    // JSON-Logic or a typed expression
  };
  effect: RuleEffect;            // emit event, set state, spawn entity, ...
  priority: number;
  cooldown?: { ticks: number; per?: 'entity' | 'global' };
  // Rules are deterministic by construction: the effect's RNG draws from
  // the world seed + the rule's ID hash, so the same trigger always produces
  // the same effect.
  determinism: 'deterministic';
}
```

The rule editor uses a node-based UI for predicates and effects (no raw code). This is deliberate: rules are authored by designers and mods, not by programmers, and the node UI enforces the determinism contract by construction (every node is a typed, hashable operation).

### 1.11 The Profiler

The profiler captures per-system execution time, per-frame. It is the runtime view of the metrics in doc 37 §2. The profiler surfaces:

- A flame graph of the last frame's systems and their sub-calls.
- A rolling 60-second chart of frame time, sim time, render time, memory.
- Per-plugin cost ranking (which plugin's systems cost the most).
- A "determinism cost" view: which systems touched canonical state this frame.

```typescript
interface ProfilerFrame {
  tick: number;
  total: number;                 // ms
  systems: { name: string; pluginId: string; cost: number; stateTouched: boolean }[];
  render: { pass: string; cost: number; drawCalls: number; triangles: number }[];
  memory: { canonical: number; presentation: number; gpu: number };
  // The profiler also captures the checkpoint hash delta — if the hash
  // changed this frame, which plugin's state slice caused it.
  hashDelta?: { pluginId: string; bytesChanged: number };
}
```

### 1.12 The Determinism Debugger (divergence finder)

The determinism debugger is the engine's most distinctive tool. When two runs of the same seed + inputs produce different hashes, this tool finds the first diverging byte.

```typescript
interface DivergenceFinder {
  // Run A and Run B are two save logs (tick-by-tick state hashes + serialized state)
  runA: SaveLog;
  runB: SaveLog;
  // The finder binary-searches the tick range for the first tick where hashes differ,
  // then diffs the serialized state at that tick to find the first differing plugin slice,
  // then diffs the slice to find the first differing field.
  find(): DivergenceReport;
}

interface DivergenceReport {
  firstDivergingTick: number;
  pluginId: string;              // the slice that diverged
  fieldPath: string[];           // path to the first differing field
  valueA: unknown;
  valueB: unknown;
  // The system that ran at that tick and wrote to that field
  suspectedSystem: string;
}
```

The debugger runs two headless instances side-by-side (doc 38 §3), feeds them the same input log, and compares hashes every tick. On divergence, it walks back to the last matching checkpoint and re-runs tick-by-tick, capturing per-system state before and after, until it pinpoints the system and field. See doc 37 §6 for the full pipeline.

### 1.13 What does each editor share?

Every editor is built on the same three primitives:

1. **The headless API** (doc 17 §4). Every read and write goes through `api.getParams` / `api.setParams` / `api.step` / etc. The editor never touches engine internals directly.
2. **The undo/redo stack.** Every editor's writes go through a command pattern; the stack is shared so Ctrl-Z in the terrain editor can undo a tweak panel change.
3. **The preset/export surface.** Every editor's state is exportable to JSON and importable on another engine instance, scoped by fingerprint.

### 1.14 How are editors registered?

Editors are plugins. Each editor is a `ga:editor-*` plugin that registers a React component with the editor shell. The shell is a thin frame: tabs, menu bar, the undo stack, the headless API connection. Editors do not get to bypass the shell.

```typescript
interface EditorPlugin {
  id: string;                    // 'ga:editor-tweak-panel'
  title: string;
  icon: string;
  component: React.ComponentType<EditorProps>;
  // Editors can declare they only appear in dev mode (e.g. the determinism debugger)
  devOnly?: boolean;
}
```

### 1.15 How are editors persisted?

Editor layout (which tabs are open, where panels are docked) is part of the user profile, separate from save state. Editor *content* (presets, definitions, templates, rules) is content-addressed and stored in OPFS. Editor state is never part of canonical world state — it is meta-state.

### 1.16 How do editors interact with mods?

Mods can register their own editors (via the `ga:editor-*` plugin pattern), and mods can extend existing editors (e.g. a mod that adds a new definition type extends the definition editor's schema list). The extension surface is the same `registerEditor` / `registerDefinitionSchema` API. A mod's editor runs in the same sandbox as the mod (doc 35 §2.3) — it can read/write through the `SandboxedHost` but cannot touch the editor shell's frame.

---

## 2. The editor shell architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Editor Shell                              │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐     │
│  │ Tweak    │  │ Scene    │  │ Asset    │  │ World    │ ... │
│  │ Panel    │  │ Inspector│  │ Browser  │  │ Gen Edit │     │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘     │
│       │             │             │             │            │
│       └─────────────┴─────────────┴─────────────┘            │
│                          │                                    │
│                   ┌──────▼──────┐                             │
│                   │ Headless API │  (doc 17 §4)               │
│                   └──────┬──────┘                             │
│                          │                                    │
│                   ┌──────▼──────┐                             │
│                   │ Plugin Host  │  (doc 17 §1.2)             │
│                   └─────────────┘                             │
└─────────────────────────────────────────────────────────────┘
```

The shell is the only path from UI to engine. There is no "editor mode" vs "game mode" — the shell is always present, toggled with a hotkey (H). In production builds, the shell's dev-only editors (determinism debugger, profiler) are hidden but the headless API is still wired for AI control.

---

## 3. Failure cases

| Failure | Detection | Recovery | User sees |
|---|---|---|---|
| Editor writes to a fingerprint-incompatible preset | Fingerprint check at import | Refuse import | "Preset was made for fingerprint X. Current is Y." |
| Tweak panel control targets a missing plugin | Plugin ID lookup | Hide control, warn | "Plugin 'ga:fog' not loaded. Control hidden." |
| Scene inspector selects an entity that was just destroyed | Frame-stale selection | Clear selection | "Entity 1234 no longer exists." |
| Asset browser import fails (Blender not available, etc.) | Pipeline error | Surface error log | "Import failed: Blender 4.2+ required." |
| World gen editor preview OOMs | Worker memory limit | Kill worker, fallback to list view | "Preview too large. Showing list view." |
| Animation graph has a cycle | Graph validation at save | Refuse save | "Cycle detected: A → B → A." |
| VFX recipe references missing mesh | Asset hash lookup | Refuse play | "Mesh 'abc123' not found." |
| Terrain brush exceeds entity budget (doc 39 §3) | Budget check at stroke | Refuse stroke | "Stroke would exceed S4 entity budget (200)." |
| Definition patch conflicts with another mod | Loader conflict check | Surface conflict UI | "Mods A and B both patch 'npc:wang-elder'." |
| Template instantiation exceeds spawn budget | Budget check | Partial spawn + warn | "Template spawned 8/12 entities. Spawn budget exhausted." |
| Rule predicate evaluation throws | Try/catch in rule engine | Disable rule, log | "Rule 'rule:longevity-banquet' disabled: predicate error." |
| Profiler capture exceeds memory | Ring buffer cap | Drop oldest frames | (silent — ring buffer is the design) |
| Determinism debugger runs out of tick budget | Configurable tick limit | Stop at limit, report partial | "Divergence not found in first 10000 ticks. Increase limit?" |

---

## 4. Rejected alternatives

- **Per-editor ad-hoc state, no shared undo stack.** Rejected: the undo stack is the difference between a tool that feels like a tool and one that feels like a prototype. Sharing it across editors is a small cost; not sharing it produces a thousand paper cuts.

- **Editors with direct engine access (no headless API).** Rejected: this is how every legacy engine's editor becomes a maintenance horror. The headless API is the contract; the editor is a client. The same API serves the AI agent and the human designer.

- **A separate "editor build" vs "game build."** Rejected: the shell is always present. Dev-only editors are hidden by a flag, not stripped from the build. This means a player who reports a bug can be talked through opening the determinism debugger in their production build — no special build needed.

- **Code-based rules (designers write JS).** Rejected: rules are the most-modded surface and the most likely to break determinism. A node-based rule editor with typed, hashable operations enforces the contract by construction.

- **Terrain editing in presentation-only state.** Rejected: terrain edits are canonical state. The doctrine (doc 17 §2.2) is that canonical state is hashable; if terrain edits were presentation-only, a save would not capture them and the world would not be reproducible.

- **In-place definition editing (no patches).** Rejected: patches preserve the canon definition and let mods coexist. In-place editing makes every mod a fork.

- **A separate animation graph format per use case.** Rejected: one graph format, content-addressed, used for NPCs, spirit beasts, and the player. The format is small enough that one serves all.

- **Profiling via instrumentation in every function.** Rejected: per-function instrumentation is the cost of every profiler that ships in a legacy engine. We instrument at the system boundary (per `registerSystem` call), which is coarse but cheap, and rely on the browser's built-in profiler for finer work.

---

## 5. What this document enables

An editor suite where:
- Every parameter is tunable in real time and exportable as a fingerprint-scoped preset.
- Every asset is content-addressed, previewable, and rebuildable from its source.
- Every generator's output is verifiable against its seed + params, in a headless worker, in seconds.
- Every definition, template, and rule is a content-addressed record that mods can extend without forking.
- Every terrain stroke is canonical state with a visible determinism cost.
- Every frame's cost is attributable to a plugin and a system.
- Every divergence between two runs is findable to the byte, the system, and the field.

The next steps:
1. Promote the existing tweak panel prototype to the headless-API-backed shell.
2. Build the scene inspector (the second-smallest end-to-end useful editor).
3. Build the determinism debugger (the engine's distinctive tool — ship it early, ship it small).
4. Build the definition editor and the rule editor together (they share the schema-validation layer).
5. Wire the world generator editor to the first generator plugin (`ga:gen-settlement`).
