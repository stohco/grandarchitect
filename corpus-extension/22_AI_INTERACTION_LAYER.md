# 22 — AI Interaction Layer: The WebSocket Channel

**Status:** Architecture. The fastest AI↔engine channel.
**Date:** 2026-08-03

---
**Truth level:** Derived (AI interaction)
**Implements:** engine-architecture/51_MULTIVERSE_GROUND_TRUTH_ARCHITECTURE.md, corpus-extension/50_GROUND_TRUTH_SYSTEM_SPECIFICATION.md
**Implementation status:** [SPEC] — fully specified, implementation in progress

---

## Ground-Truth Annotation

> [CANON] The Grand Architect operates through the gateway/permissions/audit/tool-protocol stack. It never silently converts [UNRESOLVED] to fact.

> [DERIVED] All measurements in this document use SI units (doc 52). Visual concepts follow the VTP schema (doc 51). Moving entities follow MotionProfiles (doc 55).

> [PROC] Instance-level details (exact NPC counts, specific tree placements, weather sequences) vary by seed within canonically-defined ranges.

> [UNRESOLVED] See /questions/ registry for open questions related to this document.

**Topic:** AI interaction layer — Grand Architect protocol

---



## 0. What this document is

The fastest way for an AI to interact with a running engine is NOT through a browser. It is through a **direct WebSocket** from the AI to the engine. No browser process, no DOM, no Playwright, no rendering pipeline overhead. The AI sends JSON commands, receives JSON + base64 screenshots. This is 10-100x faster than agent-browser.

This document specifies the protocol, the screenshot pipeline (for VLM/OCR), and how the AI uses it.

---

## 1. Why not agent-browser

Agent-browser (Playwright/Puppeteer-based) is excellent for testing web UIs. But for AI→engine interaction, it has three problems:

1. **Overhead**: every command requires a browser process, a DOM traversal, an accessibility tree snapshot. For `getParams('ga:fog')`, agent-browser does: navigate → snapshot → parse → extract. The WebSocket does: send JSON → receive JSON. ~100ms vs ~1ms.

2. **Screenshot cost**: agent-browser's screenshot goes through the browser's rendering pipeline → PNG → file → read. The WebSocket's screenshot goes through WebGL `readPixels()` → canvas → `toDataURL()` → base64 → JSON. ~500ms vs ~50ms.

3. **State access**: agent-browser can only see the DOM. The WebSocket can see the engine's internal state — every body's position, every NPC's schedule, every qi-residue. The DOM is a shadow of the engine's state; the WebSocket is the state itself.

### When to use agent-browser

Agent-browser is still useful for:
- Testing the player-facing UI (does the tweak panel render correctly?)
- Verifying the browser's rendering (does the WebGL canvas show the right pixels?)
- Cross-browser testing (Chrome vs Firefox vs Safari)

The WebSocket is for **engine control** (stepping, inspecting, tuning). Agent-browser is for **rendering verification** (does it look right?).

---

## 2. The protocol

### 2.1 Connection

The engine runs a WebSocket server on port 3003 (a mini-service per the project's gateway rules). The AI connects via:

```
ws://localhost:3003?XTransformPort=3003
```

(Per the project's gateway rules: all API requests to different ports must include `XTransformPort` in the query string, and use relative paths.)

### 2.2 Message format

Every message is JSON:

```json
{
  "id": 1,
  "method": "step",
  "params": { "ticks": 100 }
}
```

The response:

```json
{
  "id": 1,
  "result": {
    "tick": 1100,
    "hash": "7fde855dc9d17c7ba11c7d40c1dda10535a10dd269af0b37149104c256213f75",
    "duration": 12.5
  }
}
```

Errors:

```json
{
  "id": 1,
  "error": { "code": -32602, "message": "Invalid params: ticks must be positive" }
}
```

### 2.3 Methods

#### Engine control

| Method | Params | Result | Description |
|---|---|---|---|
| `step` | `{ ticks: number }` | `{ tick, hash, duration }` | Advance the simulation N ticks |
| `stepUntil` | `{ condition: string }` | `{ tick, hash, duration }` | Advance until condition is met |
| `reset` | `{}` | `{ tick: 0, hash }` | Reset to initial state |
| `getTick` | `{}` | `{ tick }` | Get current tick |
| `getHash` | `{}` | `{ hash }` | Get current state hash |

#### Plugin management

| Method | Params | Result | Description |
|---|---|---|---|
| `listPlugins` | `{}` | `{ plugins: PluginInfo[] }` | List all loaded plugins |
| `getPluginState` | `{ pluginId: string }` | `{ state }` | Get a plugin's state slice |
| `setPluginParams` | `{ pluginId: string, params: object }` | `{ ok }` | Set a plugin's parameters |

#### Entity inspection

| Method | Params | Result | Description |
|---|---|---|---|
| `listEntities` | `{ filter?: object }` | `{ entities: EntityInfo[] }` | List entities (optionally filtered by component) |
| `getEntity` | `{ id: number }` | `{ entity: EntityInfo }` | Get a specific entity's full state |
| `getEntitiesInRange` | `{ center: [x,y,z], radius: number }` | `{ entities: EntityInfo[] }` | Spatial query |

#### Physics control

| Method | Params | Result | Description |
|---|---|---|---|
| `physics.step` | `{ ticks: number }` | `{ hash }` | Step physics only |
| `physics.getBody` | `{ id: number }` | `{ body: BodyState }` | Get a physics body |
| `physics.getBodies` | `{ filter?: object }` | `{ bodies: BodyState[] }` | List physics bodies |
| `physics.applyForce` | `{ id: number, force: [x,y,z] }` | `{ ok }` | Apply a force to a body |
| `physics.applyImpulse` | `{ id: number, impulse: [x,y,z] }` | `{ ok }` | Apply an impulse to a body |
| `physics.setParams` | `{ params: object }` | `{ ok }` | Set physics parameters (gravity, iterations, etc.) |
| `physics.snapshot` | `{}` | `{ hash }` | Get physics state hash |

#### Visual

| Method | Params | Result | Description |
|---|---|---|---|
| `screenshot` | `{ width?: number, height?: number }` | `{ image: string (base64 PNG) }` | Capture the current frame |
| `screenshot.region` | `{ x, y, w, h }` | `{ image: string }` | Capture a region of the frame |
| `debugRender` | `{ enable: boolean }` | `{ ok }` | Toggle Jolt's debug renderer |

#### Preset management

| Method | Params | Result | Description |
|---|---|---|---|
| `exportPreset` | `{}` | `{ preset: string (JSON) }` | Export all parameters as JSON |
| `importPreset` | `{ preset: string }` | `{ ok }` | Import a preset |

---

## 3. The screenshot pipeline (for VLM/OCR)

### 3.1 The fast path

The engine renders to a WebGL canvas. The screenshot pipeline:

```
1. WebGL renderer.render(scene, camera)
2. canvas.toDataURL('image/png') → base64 string
3. Send via WebSocket: { "image": "data:image/png;base64,..." }
4. AI receives base64, saves to /tmp/screenshot.png
5. AI calls z-ai vision to analyze
```

This takes ~50ms (render + toDataURL + WebSocket). Compare to agent-browser's ~500ms (browser screenshot + file I/O).

### 3.2 The high-resolution path

For detailed visual analysis (e.g., reading NPC facial expressions, inspecting material textures):

```
1. Render at 2x or 4x resolution
2. toDataURL
3. Send base64
4. AI analyzes with VLM at higher resolution
```

### 3.3 The debug-render path

For physics debugging, the engine can render Jolt's debug visualization (contact points, body bounds, constraints) overlaid on the scene:

```
1. Enable debug renderer: api.debugRender(true)
2. Screenshot
3. VLM analyzes: "are the contact points correct? is the stack stable?"
4. Disable: api.debugRender(false)
```

### 3.4 OCR for in-game text

The engine renders CJK text (NPC names, dialogue, signs) via Troika (per document 08). For OCR:

```
1. Screenshot the region containing text
2. Send to VLM: "Read all visible text in this image"
3. VLM returns the text
4. Engine verifies: does the rendered text match the NPC's name?
```

This is how the AI verifies that the rendering is correct — not by reading the DOM (which doesn't contain the text), but by reading the pixels.

---

## 4. The AI control panel (in-engine)

### 4.1 The panel

A special panel in the engine's UI (toggle with the `~` key) that provides the same controls as the WebSocket API, but through the GUI. This is the "special panel or button or plugin" the user asked for.

```
┌─────────────────────────────────────────┐
│  AI Control Panel                  [~]  │
├─────────────────────────────────────────┤
│  WebSocket: ● Connected (port 3003)     │
│  Tick: 1234    Hash: 7fde855...         │
├─────────────────────────────────────────┤
│  [Step 100]  [Step 1000]  [Reset]       │
│  [Screenshot] [Export Preset]           │
├─────────────────────────────────────────┤
│  Plugins:                               │
│  ▸ ga:fog          [density: 0.035]     │
│  ▸ ga:water        [amplitude: 0.15]    │
│  ▸ ga:physics      [gravity: -9.81]     │
│  ▸ ga:npc-sim      [npcs: 180]          │
├─────────────────────────────────────────┤
│  Entities:                              │
│  #1 Wang Shouzheng  [NPC, QiCondensation]│
│  #2 Lady Chen       [NPC, Mortal]       │
│  #3 Bucket          [Item, Static]      │
│  #4 Well            [Structure, Static] │
├─────────────────────────────────────────┤
│  Console:                               │
│  > step 100                             │
│  < { tick: 1334, hash: "ab12...", 8ms } │
│  > screenshot                           │
│  < { image: "data:image/png;base64,..." }│
└─────────────────────────────────────────┘
```

### 4.2 The console

The panel includes a console where the user (or the AI, via WebSocket) can type commands directly. This is the same API, just typed instead of sent over WebSocket. The console supports:

- `step 100` — advance 100 ticks
- `get ga:fog` — get fog parameters
- `set ga:fog density 0.05` — set fog density
- `screenshot` — take a screenshot
- `body 5` — inspect body 5
- `force 5 0 100 0` — apply upward force to body 5
- `export` — export preset
- `import {"fog":{"density":0.05}}` — import preset

### 4.3 The entity inspector

Click any entity in the list to see its full state:
- Transform (position, rotation, scale)
- Components (NPC schedule, qi state, combat state, physics body)
- Relationships (to other entities)
- History (recent events affecting this entity)

This is the same data the WebSocket API returns, just rendered as a GUI.

---

## 5. How the AI uses this

### 5.1 The tuning loop

```
1. AI: ws.send({ method: "screenshot" })
   Engine: { image: "data:image/png;base64,..." }
2. AI: save image, call z-ai vision: "Describe the fog density. Is it too thick?"
   VLM: "The fog is too thick. Buildings are barely visible at 20m."
3. AI: ws.send({ method: "setPluginParams", params: { pluginId: "ga:fog", params: { density: 0.02 } } })
   Engine: { ok: true }
4. AI: ws.send({ method: "screenshot" })
   Engine: { image: "data:image/png;base64,..." }
5. AI: call z-ai vision: "Is the fog better now?"
   VLM: "Yes. Buildings are visible at 30m. The fog sits in the valley."
6. AI: ws.send({ method: "exportPreset" })
   Engine: { preset: '{"fog":{"density":0.02,...}}' }
7. AI: save preset as the new default
```

This loop takes ~2 seconds (two screenshots + two VLM calls + one parameter set). The same loop via agent-browser takes ~10 seconds (two browser screenshots + two VLM calls + one DOM interaction).

### 5.2 The physics verification loop

```
1. AI: ws.send({ method: "physics.step", params: { ticks: 600 } }) // 10 seconds at 60fps
   Engine: { hash: "abc123..." }
2. AI: save hash
3. AI: ws.send({ method: "reset" })
   Engine: { tick: 0, hash: "def456..." }
4. AI: ws.send({ method: "physics.step", params: { ticks: 600 } })
   Engine: { hash: "abc123..." }
5. AI: assert hash1 == hash2 → PASS (deterministic)
```

### 5.3 The combat test loop

```
1. AI: ws.send({ method: "getEntity", params: { id: 5 } }) // the opponent
   Engine: { entity: { combatState: "idle", reservoir: 80, ... } }
2. AI: ws.send({ method: "physics.applyImpulse", params: { id: 5, impulse: [100, 0, 0] } })
   Engine: { ok: true } // simulate a hit
3. AI: ws.send({ method: "step", params: { ticks: 60 } }) // 1 second
   Engine: { hash: "..." }
4. AI: ws.send({ method: "screenshot" })
   Engine: { image: "..." }
5. AI: VLM: "Did the opponent stagger? Are they in the Recovery state?"
   VLM: "Yes, the opponent is staggered and falling backward."
6. AI: verify against combat grammar (document 13): Staggered → Recovery → Idle
```

---

## 6. Implementation

### 6.1 The WebSocket mini-service

Per the project's rules, mini-services go in `mini-services/` with their own port. The WebSocket server runs on port 3003:

```
mini-services/engine-ws/
  package.json
  index.ts        // Bun WebSocket server
```

The server:
- Listens on port 3003
- Accepts WebSocket connections
- Parses JSON commands
- Calls the engine's headless API
- Returns JSON responses

### 6.2 The engine-side bridge

The engine (running in the browser) connects to the WebSocket server (or the server connects to the engine — TBD based on browser WebSocket limitations). The bridge:

- Receives commands from the WebSocket
- Calls the engine's headless API
- Returns results

For screenshots, the bridge:
- Calls `renderer.render(scene, camera)`
- Calls `canvas.toDataURL('image/png')`
- Returns the base64 string

### 6.3 The AI-side client

A TypeScript module the AI uses:

```typescript
class EngineClient {
  constructor(url: string) { /* connect WebSocket */ }

  async step(ticks: number): Promise<{ tick: number; hash: string; duration: number }> { ... }
  async screenshot(): Promise<string> { ... } // returns base64
  async getParams(pluginId: string): Promise<Record<string, unknown>> { ... }
  async setParams(pluginId: string, params: Record<string, unknown>): Promise<void> { ... }
  async getBody(id: number): Promise<BodyState> { ... }
  async applyForce(id: number, force: [number, number, number]): Promise<void> { ... }
  async exportPreset(): Promise<string> { ... }
  async importPreset(json: string): Promise<void> { ... }
}
```

The AI creates an `EngineClient`, connects, and uses it for all engine interaction. No agent-browser needed for engine control. Agent-browser is reserved for rendering verification and cross-browser testing.

---

## 7. What this document enables

- The AI interacts with the engine 10-100x faster than agent-browser, via WebSocket
- Every engine parameter is controllable: step, inspect, adjust, screenshot
- VLM/OCR works by capturing WebGL frames directly — no browser process overhead
- The AI control panel (toggle with `~`) provides the same controls through the GUI
- The console accepts typed commands — same API, human-interactive
- The entity inspector shows every entity's full state — the same data the WebSocket returns

The WebSocket channel is not a tool. It is the engine's AI surface — the way the Grand Architect (the AI) interacts with the universe it is building. The tweak panel is the human surface. The WebSocket is the AI surface. Same parameters, same state, different interaction speed.
