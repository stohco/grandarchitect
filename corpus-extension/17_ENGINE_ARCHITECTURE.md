# 12 — Engine Architecture: The Plugin Host

**Status:** Foundation architecture. The engine is a plugin host with a deterministic contract.
**Date:** 2026-08-03

---

## 0. What this document is

This is the engine's foundational architecture. Not "the engine and its tools" — the engine, full stop. The tools are plugins. The rendering is plugins. The simulation is plugins. The asset pipeline is plugins. The determinism stack is the contract every plugin obeys. The lore documents (00-16) are the engine's configuration data.

The engine's name is **Grand Architect** — not because the engine uses cultivation metaphors in its API (it does not; the API is game-dev domain language), but because the engine's purpose is to express a universe lawfully, the way a Mahayana cultivator authors world-laws. The name is aspirational, not decorative.

### What makes this different from Godot 4.7, UE 5.8, Unity 7

| | Godot | UE 5 | Unity 7 | Grand Architect |
|---|---|---|---|---|
| Determinism | Optional, hard to achieve | Not guaranteed | Not guaranteed (DOTS helps) | **By contract. Every plugin obeys. No exceptions.** |
| AI interaction | GDScript, not AI-native | C++/Blueprints, steep learning | C#/Visual Scripts | **Headless API as first-class surface. Every parameter controllable by an AI agent.** |
| World generation | Procedural but ad-hoc | Niagara/Nanite are rendering, not world | Procedural but ad-hoc | **Lore-driven. The bible documents ARE the generator configuration.** |
| Plugin architecture | Modules, good | Plugins, good | Packages, good | **Everything is a plugin, including the core. The engine is a plugin host + a deterministic contract.** |
| Platform | Desktop, mobile, web | Desktop, console | Desktop, mobile, web | **Browser-native. WebGPU first, WebGL2 fallback. No native build required.** |
| Scope | General-purpose | General-purpose, AAA | General-purpose | **Domain-specific (xianxia RPG) with a general-purpose plugin architecture.** |

The differentiator is not any single feature. It is the combination: **determinism by contract + AI-native surfaces + lore-driven generation + plugin architecture + browser-native.** No other engine has all five.

---

## 1. The plugin system

### 1.1 What a plugin is

A plugin is a self-contained module that:
- Declares a unique ID (e.g., `ga:fog`, `ga:water`, `ga:npc-simulator`)
- Declares its dependencies (other plugins it requires)
- Declares its world-state schema (what state it owns)
- Declares its systems (what it does each frame)
- Declares its editor surfaces (what parameters it exposes)
- Obeys the deterministic contract (§3)

```typescript
interface Plugin {
  id: string;
  version: string;
  dependencies: string[];

  // Called once at engine startup. Registers state, systems, and surfaces.
  init(host: PluginHost): void;

  // Called once at engine shutdown. Cleans up.
  destroy(host: PluginHost): void;
}
```

### 1.2 The PluginHost

The PluginHost is the engine's core. It is itself a plugin (the `ga:core` plugin). It provides:

- **The world state store** (§2) — the canonical state all plugins read/write
- **The event bus** — for inter-plugin communication
- **The system scheduler** — orders plugin systems by dependency
- **The editor surface registry** — collects all plugins' tweak panels
- **The headless API** (§4) — exposes every parameter to AI agents
- **The determinism enforcer** (§3) — verifies every plugin obeys the contract

```typescript
interface PluginHost {
  // World state
  getState<T>(pluginId: string): T;
  setState<T>(pluginId: string, state: T): void;

  // Event bus
  emit(event: string, payload: unknown): void;
  on(event: string, handler: (payload: unknown) => void): void;

  // System scheduling
  registerSystem(name: string, fn: (dt: number) => void, priority: number): void;

  // Editor surfaces
  registerTweakPanel(panel: TweakPanelSpec): void;

  // Headless API
  getApi(): HeadlessApi;

  // Determinism
  checkpoint(): string; // returns hash of full world state
  verify(checkpointHash: string): boolean;
}
```

### 1.3 Plugin lifecycle

```
Engine startup
  → Load plugin manifest (JSON listing all plugins + versions)
  → Resolve dependency graph (topological sort)
  → For each plugin in dependency order:
      → plugin.init(host)
      → Register state, systems, surfaces
  → Start the render loop
  → Start the simulation loop

Engine shutdown
  → For each plugin in reverse dependency order:
      → plugin.destroy(host)
  → Serialize world state (CBOR)
  → Hash and store
```

### 1.4 The core plugins

The engine ships with these core plugins:

| Plugin ID | What it does |
|---|---|
| `ga:core` | The PluginHost itself. World state store, event bus, scheduler. |
| `ga:determinism` | RNG, transcendentals, fixed-point, CBOR, SHA-256. The contract enforcer. |
| `ga:renderer` | Three.js WebGPU/WebGL2 renderer. Render passes, shadow maps, post-processing. |
| `ga:scene` | Scene graph management. Entity registration, transforms, parenting. |
| `ga:input` | Keyboard, mouse, gamepad input. Input barriers (deterministic timestamping). |
| `ga:save` | Save/load via SQLite-WASM + OPFS. Hash-verified checkpoints. |
| `ga:assets` | glTF loading, meshoptimizer/KTX2 decoding, content-addressed cache. |
| `ga:tweak-panel` | The unified editor surface. Collects all plugins' parameters. |

These are the minimum. Everything else — fog, water, NPC simulation, combat, qi perception — is a non-core plugin that depends on the core.

---

## 2. The world state model

### 2.1 The canonical state

The world state is a single, serializable object. Every plugin owns a slice. The full state is the union of all slices.

```typescript
interface WorldState {
  // Core
  tick: number;
  seed: string;
  fingerprint: DeterminismFingerprint;

  // Plugin slices (each plugin owns its slice)
  [pluginId: string]: unknown;
}
```

Example slices:
```typescript
worldState['ga:fog'] = { density: 0.035, heightFalloff: 0.0042, color: 0x2a2a3e };
worldState['ga:npc-simulator'] = { npcs: [...], schedules: [...] };
worldState['ga:combat'] = { entities: [...], state: 'idle' };
```

### 2.2 State access rules

- **Read**: any plugin can read any other plugin's state (via `host.getState(pluginId)`). This is read-only.
- **Write**: a plugin can only write its own state (via `host.setState(pluginId, state)`). Cross-plugin writes go through the event bus.
- **Serialization**: the full world state is serializable via CBOR at any tick. This is the save format.
- **Hashing**: the full world state is hashable via SHA-256 at any tick. This is the determinism proof.

### 2.3 The entity-component model

Within the scene plugin, entities are IDs with attached components. This is a lightweight ECS (Entity-Component-System) pattern:

```typescript
interface Entity {
  id: number;
  components: Map<string, unknown>;
}
```

Components are owned by plugins. The `ga:npc-simulator` plugin attaches `NPCSchedule`, `NPCRelationships`, `NPCQiState` components. The `ga:combat` plugin attaches `CombatState`, `InjuryList` components. The `ga:renderer` plugin attaches `MeshRef`, `MaterialRef` components.

Systems (registered via `host.registerSystem`) iterate over entities with specific component combinations. The `NPCScheduleSystem` iterates over entities with `NPCSchedule` + `Transform`. The `CombatSystem` iterates over entities with `CombatState` + `Transform`.

---

## 3. The deterministic contract

### 3.1 What every plugin must obey

1. **No `Math.random()`.** Use `host.getState('ga:determinism').rng`.
2. **No `Math.sin()`/`Math.cos()`/`Math.exp()`/`Math.log()`/`Math.atan2()`/`Math.pow()` in simulation logic.** Use `det_sin`/`det_cos`/`det_exp`/`det_log`/`det_atan2`/`det_pow`. (Rendering can use `Math.*` — the GPU is not canonical.)
3. **No `Date.now()` or `performance.now()` in simulation logic.** Use `host.getState('ga:core').tick`.
4. **No non-deterministic serialization.** Use the engine's CBOR encoder. Never `JSON.stringify` for state that must be hashed.
5. **State writes go through `host.setState`.** Never mutate state directly.
6. **Every state change is hashable.** The plugin's state slice must be CBOR-serializable.

### 3.2 Enforcement

- **Dev mode**: the determinism enforcer plugin throws if any plugin calls a forbidden function (via a lint rule + runtime proxy).
- **Production mode**: the enforcer is a no-op (for performance), but the contract is still expected.
- **Verification**: at any tick, `host.checkpoint()` returns the SHA-256 hash of the full world state. Two runs with the same seed + same inputs must produce the same hash.

### 3.3 The determinism fingerprint

Every save includes a `DeterminismFingerprint` (per document 08). A save from fingerprint X loads only in an engine with fingerprint X. When a plugin version changes, the fingerprint changes, and old saves are flagged for migration.

---

## 4. The AI interaction layer

### 4.1 The headless API

Every parameter in the engine is controllable via a headless API. This is not a separate tool — it is the same API the tweak panel uses, exposed programmatically.

```typescript
interface HeadlessApi {
  // Read any plugin's parameters
  getParams(pluginId: string): Record<string, unknown>;

  // Set any plugin's parameters
  setParams(pluginId: string, params: Record<string, unknown>): void;

  // List all plugins
  listPlugins(): PluginInfo[];

  // List all entities
  listEntities(filter?: ComponentFilter): EntityInfo[];

  // Inspect a specific entity
  getEntity(id: number): EntityInfo;

  // Trigger an event
  emitEvent(event: string, payload: unknown): void;

  // Save/load
  save(): string; // returns hash
  load(hash: string): void;

  // Take a screenshot (for AI vision)
  screenshot(): Uint8Array;

  // Run the simulation for N ticks
  step(ticks: number): void;

  // Export the current preset
  exportPreset(): string; // JSON

  // Import a preset
  importPreset(json: string): void;
}
```

### 4.2 How an AI agent uses the engine

An AI agent (like me) can:

1. **Read the current state**: `api.getParams('ga:fog')` → `{ density: 0.035, ... }`
2. **Adjust a parameter**: `api.setParams('ga:fog', { density: 0.05 })` — the fog updates in real-time
3. **Step the simulation**: `api.step(100)` — advance 100 ticks
4. **Take a screenshot**: `api.screenshot()` — capture the current frame for visual analysis
5. **Export the preset**: `api.exportPreset()` — get the current parameters as JSON
6. **Import a preset**: `api.importPreset(json)` — load a tuned preset

This means an AI agent can tune the engine's feel by: adjust → step → screenshot → analyze → repeat. The same loop a human designer uses with the tweak panel, but programmatically.

### 4.3 The headless mode

The engine can run without a renderer (headless mode). In this mode:
- The simulation runs but no frames are rendered
- `api.screenshot()` returns a placeholder (or a software-rendered frame)
- The headless mode is for: running long simulations (centuries), verifying determinism across runs, training AI models on game state

This is how the "century-absence test" (document 07 §6.1) runs: headless, 1000 years, hash the result.

---

## 5. The rendering pipeline

### 5.1 Pluggable render passes

The rendering pipeline is a sequence of render passes, each owned by a plugin:

```
1. Shadow pass (ga:renderer)
2. Opaque geometry pass (ga:renderer)
3. Water pass (ga:water)
4. Transparent geometry pass (ga:renderer)
5. Qi perception pass (ga:qi-perception) — only when active
6. Post-processing pass (ga:post-processing)
   - Fog (ga:fog) — injected via shader chunk patching
   - Bloom, SSAO, tone mapping
7. UI pass (ga:ui)
```

Each pass is registered with a priority. The renderer sorts passes by priority and executes them in order.

### 5.2 The shader chunk system

Three.js's shader chunks (`ShaderChunk.fog_fragment`, etc.) are patched globally before any materials compile. This is the technique the user described: patch globally, inherit everywhere. The `ga:fog` plugin patches the fog chunks. The `ga:water` plugin patches the water chunks (when using a custom water material).

### 5.3 The material system

Materials are PBR (MeshStandardMaterial) by default. Custom shader materials are used for:
- Water (Beer-Lambert + Gerstner waves + variance roughness)
- Qi effects (the perception layer's cross-modal visual)
- Qi-residue visualization (when the player reads residue)

Each material is a plugin that registers its shader code, uniforms, and tweak-panel parameters.

---

## 6. The simulation pipeline

### 6.1 The tick loop

The simulation runs at a fixed timestep (60 Hz by default, configurable). Each tick:

```
1. Input plugin: collect inputs, stamp with tick number
2. NPC simulator: advance schedules, update locations, process reactions
3. Combat system: process combat state machines, resolve attacks
4. Qi system: update qi-residue, ambient qi, contamination
5. Event system: process queued events
6. Save system: checkpoint every N ticks (hash + store)
7. Renderer: render the current state (runs at display refresh rate, interpolated)
```

Each system is registered with a priority. The scheduler runs them in priority order. The simulation is deterministic: same seed + same inputs = same state at every tick.

### 6.2 The fidelity tiers

Per document 07 §6.1, the simulation has fidelity tiers (S0-S4). The scheduler can demote distant/unobserved entities to lower tiers (less frequent updates, aggregated state). The tiers are:

- **S4 (Detailed)**: full simulation, every tick. Player-adjacent entities.
- **S3 (Interactive)**: full state machine, reduced frequency. Visible but distant entities.
- **S2 (Regional)**: aggregate state, scheduled updates. Offscreen NPCs.
- **S1 (Historical)**: demographic/aggregate only. Distant settlements.
- **S0 (Dormant)**: frozen state, scheduled wake. Unvisited regions.

The tier transitions are deterministic and conserved (per document 07): promotion cannot create favorable facts; demotion cannot erase named entities.

---

## 7. The editor surfaces

### 7.1 The Tweak Panel (human surface)

A unified, collapsible panel (already implemented in the prototype). Organized by plugin:
- Fog (density, height falloff, color, near, far)
- Water (absorption R/G/B, wave amplitude/frequency/direction, roughness scale)
- Lighting (sun intensity, angle, ambient, exposure)
- Camera (orbit speed, radius, height)
- NPC simulator (schedule editor, state inspector)
- Combat (frame data, routing costs, reservoir)
- Qi perception (intensity, depth shift, chromatic shift, stamina drain)

Every parameter is a slider/color picker/toggle. Changes apply in real-time. "Export Preset" saves to JSON. Press H to toggle.

### 7.2 The Scene Inspector

A tree view of the scene graph. Click any entity to see its components. Select an NPC to see their schedule, state, and relationships. Select a paddy to see its ownership, crop state, and water level.

### 7.3 The Asset Browser

Lists all loaded assets (glTF models, textures, materials). Each shows its hash, size, and reference count. Click to preview in isolation.

### 7.4 The Law Author (future, Mahayana-level)

The endgame editor surface. When the player reaches Mahayana, they can author world-laws. This is the engine's meta-editor: the player writes a rule (in a domain-specific language), the engine compiles it into a law-plugin, and the world enforces it. This is the Grand Architect's tool — the player becomes a plugin author within the game.

---

## 8. The generation pipeline

### 8.1 Lore as configuration

The lore documents (00-16) are the engine's configuration data. The generation pipeline consumes them:

```
Lore documents (Markdown)
  → Parsed into structured schemas (JSON)
  → Fed to generator plugins
  → Produce world state (entities, geography, ecology, institutions)
  → Loaded into the engine
  → Rendered and simulated
```

### 8.2 The generator plugins

| Generator | Consumes | Produces |
|---|---|---|
| `ga:gen-cosmology` | 00 §1 (cosmology) | Stratum topology, spirit veins, grotto-heavens |
| `ga:gen-geography` | 04 §1 (Cangli Riverlands) | Terrain, rivers, watersheds, climate |
| `ga:gen-settlement` | 04 §1-2 (villages, households) | Buildings, compounds, lineage halls |
| `ga:gen-npc` | 04 §2 (households), 12 (institutions) | Named NPCs with schedules, relationships, qi-state |
| `ga:gen-ecology` | 14 (ecology and qi) | Spirit beasts, herbs, qi topology, food web |
| `ga:gen-economy` | 04 §6 (economy), 17 (TBD) | Markets, trade routes, prices, salt licenses |
| `ga:gen-institution` | 12 (sect institutions) | Sects, lineages, academies, temples |
| `ga:gen-event` | 04 §3 (solar terms), 06 (golden scenes) | Scheduled events, generated events, personal events |

Each generator is deterministic: same seed + same lore = same output.

### 8.3 The seed hierarchy

Per document 07 §1.1, the seed is hierarchical:
```
WorldSeed → CosmosSeed → WorldSeed → RegionSeed → VillageSeed
```

Each generator consumes its level's seed and produces the next level's seeds. The full world is reconstructible from the root seed + the lore documents.

---

## 9. The plugin SDK

### 9.1 Creating a plugin

```typescript
// my-plugin.ts
import { Plugin, PluginHost } from 'ga:core';

const MyPlugin: Plugin = {
  id: 'my:plugin',
  version: '0.1.0',
  dependencies: ['ga:core', 'ga:renderer'],

  init(host: PluginHost) {
    // Register state
    host.setState('my:plugin', { myParam: 42 });

    // Register a system (runs each tick)
    host.registerSystem('my:system', (dt: number) => {
      const state = host.getState('my:plugin');
      state.myParam += dt;
      host.setState('my:plugin', state);
    }, 100); // priority 100

    // Register a tweak panel
    host.registerTweakPanel({
      pluginId: 'my:plugin',
      title: 'My Plugin',
      controls: [
        { type: 'slider', key: 'myParam', label: 'My Param', min: 0, max: 100, step: 1 }
      ],
    });
  },

  destroy(host: PluginHost) {
    // Cleanup
  },
};

export default MyPlugin;
```

### 9.2 Plugin discovery

Plugins are listed in a manifest file (`plugins.json`):

```json
{
  "plugins": [
    { "id": "ga:core", "version": "0.1.0" },
    { "id": "ga:determinism", "version": "0.1.0" },
    { "id": "ga:renderer", "version": "0.1.0" },
    { "id": "ga:fog", "version": "0.1.0", "dependencies": ["ga:renderer"] },
    { "id": "ga:water", "version": "0.1.0", "dependencies": ["ga:renderer"] }
  ]
}
```

The engine loads the manifest, resolves dependencies, and initializes plugins in topological order.

### 9.3 Plugin distribution

Plugins are npm packages (or ES modules). The engine's plugin loader can install plugins from:
- Local file system (dev mode)
- npm registry (production)
- CDN URL (runtime, for hot-loading)

Each plugin is content-addressed (SHA-256 of its source). The engine verifies the hash before loading. This is the same determinism principle applied to code.

---

## 10. What this document enables

This document defines the engine's soul: a plugin host with a deterministic contract, AI-native surfaces, and lore-driven generation. The next steps:

1. **Refactor the existing prototype** (the inlined HTML) into the plugin architecture — the fog system becomes `ga:fog`, the water system becomes `ga:water`, the determinism stack becomes `ga:determinism`.
2. **Implement the PluginHost** — the core that manages state, scheduling, and the headless API.
3. **Implement the headless API** — so an AI agent can tune parameters programmatically.
4. **Write the lore-to-schema parser** — converts the Markdown lore documents into structured JSON the generators consume.
5. **Implement the first generator plugin** — `ga:gen-settlement`, consuming document 04 to produce Wang Family Bend.

Each step is provable: the PluginHost runs, the headless API responds, the parser produces valid JSON, the generator produces a deterministic village from a seed.

The engine is not a tool. It is the substrate that makes the universe expressible. Every system — fog, water, combat, ecology, sects, tribulation — is a plugin that expresses one facet of the lore. The lore is the configuration. The engine is the host. The determinism is the contract. The AI is the architect.
