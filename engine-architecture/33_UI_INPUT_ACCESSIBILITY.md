# 33 — UI, Input, and Accessibility

**Status:** Foundation. The player's interface (diegetic HUD), the editor's interface (tweak panel, scene inspector, asset browser, AI control panel), the console (text interface with same API as WebSocket), the input system (keyboard, mouse, gamepad, touch), the input barriers (deterministic timestamping), the accessibility layer (visual equivalents for audio, audio equivalents for visual, colorblind modes, motor assistance), the DOM-overlay vs. in-world diegetic rendering split, and the tweak-panel export/import system.
**Date:** 2026-08-03

---

## 0. What this document is and why it exists

The prior corpus (doc 23: GUI/HUD/UX; doc 17: engine architecture; doc 22: AI interaction layer) specified the surfaces at design resolution: a diegetic player HUD, a tweak panel for designers, a console for direct command entry. It did not specify the *implementation*: how the HUD is rendered (DOM overlay vs. in-world), how input is captured and timestamped deterministically, how accessibility is wired into the rendering pipeline, how the tweak panel exports and imports presets, and how the AI control panel exposes the same API as the WebSocket.

This document specifies the implementation. It obeys the doctrine (AGENTS.md Part 3: "Design for joy first") by making the HUD diegetic — the player experiences their qi-state through the body, not through a menu — and obeys the doctrine's accessibility commitment (per AGENTS.md Part 3: "the system serves the experience") by specifying visual equivalents for audio, audio equivalents for visual, colorblind modes, and motor assistance as first-class subsystems, not afterthoughts.

### Precedents cited

- **Death Stranding (Kojima Productions, 2019)** — diegetic UI. Most information is rendered in-world (the backpack, the BB pod, the terrain). This document adopts the diegetic-first principle.
- **Tunic (Andrew Shouldice, 2022)** — the in-game manual as the primary interface. The player discovers the UI by playing. This document adopts the discoverable-UI principle for the journal.
- **Web Content Accessibility Guidelines (WCAG) 2.2 (W3C, 2023)** — the canonical accessibility specification. This document adopts WCAG's four principles (perceivable, operable, understandable, robust) for the engine's accessibility layer.
- **Godot 4.7 / Unity 7 inspector panels** — the per-component inspector. This document adopts the per-entity inspector pattern for the scene inspector.
- **Chrome DevTools (Google)** — the console-as-first-class-surface pattern. This document adopts the console as a peer of the WebSocket.

---

## 1. The player HUD (diegetic, minimal)

Per doc 23 §1, the player HUD is diegetic — it is part of the world, not an overlay. The player experiences their state through the body and the world, not through menus.

```typescript
interface PlayerHUDConfig {
  // The HUD has no "elements" in the traditional sense. It is a set of
  // rendering modifiers applied to the world, plus a small DOM overlay for
  // the journal and the save/load menu.
  renderingModifiers: RenderingModifier[];
  domOverlay: DOMOverlayElement[];  // journal, save/load, dialogue
  visible: boolean;
}

interface RenderingModifier {
  modifierId: string;
  target: 'hands' | 'vision' | 'camera' | 'audio' | 'post_processing';
  effect: RenderingEffect;
  intensity: number;                // 0..1, derived from player's qi-state
}

// Example modifiers:
//   qi_reservoir_full  → { target: 'hands', effect: 'warmth_tint', intensity: 0.3 }
//   qi_reservoir_low    → { target: 'vision', effect: 'desaturation', intensity: 0.2 }
//                        + { target: 'camera', effect: 'drop_5cm', intensity: 1.0 }
//   qi_routed_hands     → { target: 'hands', effect: 'faint_glow', intensity: 0.4 }
//   deviation_onset     → { target: 'vision', effect: 'chromatic_aberration', intensity: 0.6 }
//                        + { target: 'vision', effect: 'occasional_flicker', intensity: 0.4 }
```

**The felt-sense rule.** The player's qi-state is rendered as felt sense (per doc 23 §1.2): reservoir full = warm hands and clear vision; reservoir depleted = cold hands, dim vision, slouching camera; deviation onset = chromatic aberration and flicker. The player learns to read their state from the body, not from a bar.

**The non-diegetic exceptions.** Only three DOM overlay elements are non-diegetic:
1. The journal (J key) — the player's notes and learned knowledge (per doc 23 §1.3).
2. The save/load menu (Esc key) — minimal (per doc 23 §1.4).
3. The dialogue interface — when the player talks to an NPC (per doc 23 §1.5).

**Failure case — UI clutter.** The HUD must not accumulate elements. The simulator enforces a `max_dom_overlay_elements` cap (default 8) per scene. Plugins that try to register more are rejected; they must use rendering modifiers instead.

---

## 2. The editor surface

The editor surface is the designer's interface (human or AI). It is a plugin (`ga:editor-surface`) that registers four sub-surfaces.

```typescript
interface EditorSurface {
  tweakPanel: TweakPanel;
  sceneInspector: SceneInspector;
  assetBrowser: AssetBrowser;
  aiControlPanel: AIControlPanel;
  visible: boolean;
  activeSubSurface: 'tweak' | 'inspector' | 'assets' | 'ai';
}
```

### 2.1 The tweak panel (H key)

Per doc 23 §2.1 and doc 17 §7.1. Every parameter in the engine is a slider/color picker/toggle. Organized by plugin. Real-time updates. Export/Import preset (per §8).

```typescript
interface TweakPanel {
  pluginSections: TweakPanelSection[];
  searchFilter: string;
  exportPreset: () => string;      // JSON
  importPreset: (json: string) => void;
  visible: boolean;
}

interface TweakPanelSection {
  pluginId: string;
  title: string;
  controls: TweakControl[];
}

interface TweakControl {
  controlType: 'slider' | 'color' | 'toggle' | 'dropdown' | 'vec3' | 'curve';
  key: string;                     // dot-path to the parameter
  label: string;
  min?: number; max?: number; step?: number;
  defaultValue: unknown;
  currentValue: unknown;
  dirty: boolean;                  // modified from default?
}
```

### 2.2 The scene inspector (I key)

Per doc 23 §2.2 and doc 17 §7.2. A tree view of the scene graph. Click any entity to see its components and their values.

```typescript
interface SceneInspector {
  sceneTree: SceneTreeNode;
  selectedEntityId: number | null;
  inspectedComponents: InspectedComponent[];
}

interface SceneTreeNode {
  entityId: number;
  name: string;
  children: SceneTreeNode[];
  componentCount: number;
  visible: boolean;
}

interface InspectedComponent {
  pluginId: string;
  componentName: string;
  fields: { key: string; value: unknown; type: string }[];
}
```

### 2.3 The asset browser (A key)

Per doc 23 §2.3 and doc 17 §7.3. Lists all loaded assets (glTF models, textures, materials). Each shows its hash, size, and reference count. Click to preview in isolation.

```typescript
interface AssetBrowser {
  assets: AssetEntry[];
  filterByType: string | null;
  selectedAssetHash: string | null;
  previewMode: 'isolated' | 'in_scene';
}

interface AssetEntry {
  hash: string;                    // content-addressed (per doc 17 §9.3)
  type: 'gltf' | 'texture' | 'material' | 'audio' | 'shader';
  sizeBytes: number;
  referenceCount: number;
  path: string;                    // original load path
  previewThumbnail: string;        // data URL
}
```

### 2.4 The AI control panel (P key)

Per doc 22 and doc 17 §4. Exposes the headless API to a human-readable panel for AI agents (and human designers acting as AI). Same API as the WebSocket.

```typescript
interface AIControlPanel {
  api: HeadlessApi;                // per doc 17 §4.1
  commandHistory: CommandHistoryEntry[];
  watchExpressions: WatchExpression[];
  breakpointList: Breakpoint[];
}

interface CommandHistoryEntry {
  tick: number;
  command: string;
  result: string;
  durationMs: number;
}

interface WatchExpression {
  expression: string;              // e.g., "worldState['ga:npc-simulator'].npcs[42].goalStack[0]"
  currentValue: string;
  lastUpdateTick: number;
}
```

---

## 3. The console (text interface, same API as WebSocket)

Per doc 23 §3 and doc 17 §4, the console is a text interface that exposes the headless API. It is a peer of the WebSocket: the same commands work in both.

```typescript
interface Console {
  inputBuffer: string;
  history: string[];
  historyIndex: number;
  output: ConsoleOutputLine[];
  api: HeadlessApi;                // same API as WebSocket and AI control panel
  visible: boolean;
}

interface ConsoleOutputLine {
  tick: number;
  text: string;
  level: 'input' | 'output' | 'error' | 'warning' | 'info';
}

// Example commands (same syntax works via WebSocket):
//   > get ga:fog
//   < { density: 0.035, heightFalloff: 0.0042, color: 0x2a2a3e }
//   > set ga:fog.density 0.05
//   < ok
//   > step 100
//   < stepped 100 ticks; new tick = 45330
//   > screenshot
//   < saved screenshot-45330.png (1920×1080, 2.3MB)
//   > exportPreset
//   < { /* JSON */ }
//   > listEntities --filter has:NPCSchedule
//   < [42, 43, 44, 47, ...]
```

**The unified API rule.** The console, the WebSocket, and the AI control panel all call the same `HeadlessApi` (per doc 17 §4.1). There is no separate console API, WebSocket API, or AI API. This is the doctrine's "the apparatus is the work" applied: one API, three presentations.

**Failure case — API drift.** If a plugin adds a parameter but does not expose it via the headless API, the parameter is invisible to console/WebSocket/AI. The simulator enforces: every `TweakControl` registered with `ga:tweak-panel` must have a corresponding headless-API path. The build fails otherwise.

---

## 4. The input system

The input system captures keyboard, mouse, gamepad, and touch inputs, stamps them with deterministic timestamps (per doc 17 §6.1, the input barrier), and routes them to the appropriate system.

```typescript
interface InputSystem {
  keyboards: KeyboardState[];
  mice: MouseState[];
  gamepads: GamepadState[];
  touches: TouchState[];
  inputBarrier: InputBarrier;      // §5
  bindings: InputBinding[];
}

interface InputBinding {
  action: string;                  // 'attack_fast', 'route_hands', 'open_journal', etc.
  triggers: InputTrigger[];
  contexts: InputContext[];        // when this binding is active
}

interface InputTrigger {
  device: 'keyboard' | 'mouse' | 'gamepad' | 'touch';
  input: string;                   // e.g., 'Space', 'Mouse0', 'ButtonA', 'Touch0'
  modifiers?: string[];            // e.g., ['Shift', 'Ctrl']
  edge: 'pressed' | 'released' | 'held';
}

type InputContext = 'combat' | 'dialogue' | 'menu' | 'world' | 'editor';
```

### 4.1 Default bindings

The default bindings follow genre conventions (per Monster Hunter: World and Sekiro):

| Action | Keyboard | Gamepad | Touch |
|---|---|---|---|
| Move | WASD | Left stick | Left virtual stick |
| Camera | Mouse | Right stick | Right virtual stick (drag) |
| Fast attack | LMB | RB | Right tap |
| Heavy attack | Shift+LMB | RT | Right long-press |
| Defend | RMB | LB | Left tap (hold) |
| Dodge | Space | B | Swipe |
| Route hands | 1 | D-pad up | Top-left button |
| Route legs | 2 | D-pad right | Top-right button |
| Route skin | 3 | D-pad down | Bottom-left button |
| Route senses | 4 | D-pad left | Bottom-right button |
| Read residue | Q | Y | Center tap |
| Yield | Y | Back | Long-press yield |
| Open journal | J | Start | Menu button |
| Toggle HUD | H | (n/a — editor only) | (n/a) |
| Save/load | Esc | Start+Select | Menu long-press |

**Rebinding.** All bindings are user-rebindable via the settings menu (per §6 accessibility). The rebinds persist across saves.

---

## 5. Input barriers (deterministic timestamping)

Per doc 17 §6.1, every input is stamped with the tick it was received. This is the *input barrier*: inputs are not processed immediately; they are queued and processed at the next tick boundary.

```typescript
interface InputBarrier {
  pendingInputs: TimestampedInput[];
  barrierTick: number;             // the tick at which pending inputs will be applied
  maxInputsPerTick: number;        // default 16; prevents input flooding
}

interface TimestampedInput {
  input: InputTrigger;
  receivedAtWallClock: number;     // for diagnostics only; not used in simulation
  receivedAtTick: number;          // the deterministic timestamp
  appliedAtTick: number;           // when it was actually applied (≥ receivedAtTick)
}
```

**The barrier rule.** Inputs received between tick N and tick N+1 are all stamped with tick N+1. They are applied at the start of tick N+1's processing. This guarantees that two runs with the same seed and the same input timing (to tick resolution) produce identical simulation state.

**Failure case — input flooding.** A malfunctioning device (or a malicious client) could send hundreds of inputs per tick. The barrier caps at `maxInputsPerTick` (default 16); excess inputs are dropped with a warning. This protects the simulator from input-driven non-determinism.

**Failure case — tick-skew.** If the renderer runs at 144 Hz but the simulation runs at 60 Hz, the renderer sees 2.4 frames per simulation tick. Inputs received during those 2.4 frames are all stamped with the same tick. The simulator does not see sub-tick input order; the renderer may interpolate between ticks to smooth visual response, but the simulation is tick-discrete.

---

## 6. Accessibility (first-class subsystem)

Accessibility is not a feature flag; it is a subsystem wired into the rendering and audio pipelines. The engine obeys WCAG 2.2's four principles: perceivable, operable, understandable, robust.

```typescript
interface AccessibilityConfig {
  visual: VisualAccessibility;
  audio: AudioAccessibility;
  motor: MotorAccessibility;
  cognitive: CognitiveAccessibility;
  colorBlindMode: ColorBlindMode;
  textSize: number;                // 1.0 = default; 1.5 = large; 2.0 = extra large
  highContrast: boolean;
  reducedMotion: boolean;
}

interface VisualAccessibility {
  // Audio equivalents for visual cues (WCAG: perceivable)
  audioCuesForVisualEvents: boolean;
  audioCueVolume: number;
  // Subtitles for in-world dialogue
  subtitlesEnabled: boolean;
  subtitleBackground: number;      // 0..1 opacity
}

interface AudioAccessibility {
  // Visual equivalents for audio cues (WCAG: perceivable)
  visualIndicatorsForAudioEvents: boolean;
  indicatorStyle: 'icon' | 'text' | 'border_flash';
  // Audio ducking for screen readers
  audioDuckingEnabled: boolean;
  duckingLevel: number;            // dB reduction when screen reader speaks
}

interface MotorAccessibility {
  // Input hold toggles (no need to hold a button)
  holdToToggle: boolean;
  // Input slow-mo (per Celeste's Assist Mode)
  inputSlowMo: boolean;
  inputSlowMoFactor: number;       // 0.5 = half speed
  // Aim assist for ranged qi-actions
  aimAssist: boolean;
  aimAssistStrength: number;       // 0..1
  // One-handed mode (remap all actions to one hand)
  oneHandedMode: boolean;
  oneHandedLayout: 'left' | 'right';
}

interface CognitiveAccessibility {
  // Combat slow-mo (per Celeste)
  combatSlowMo: boolean;
  combatSlowMoFactor: number;      // 0.7 = 70% speed
  // Pause-on-buffer (the input buffer pauses when full)
  pauseOnBufferFull: boolean;
  // Objective reminders (the journal surfaces the current goal every N minutes)
  objectiveReminders: boolean;
  reminderIntervalMinutes: number;
}

type ColorBlindMode = 'none' | 'protanopia' | 'deuteranopia' | 'tritanopia' | 'achromatopsia';
```

### 6.1 Colorblind modes

The engine applies color-correction shaders based on the chosen mode. The correction uses the *Daltonization* algorithm (per Machado et al., 2009), which preserves luminance while shifting hues into the perceivable range.

```typescript
// Colorblind correction shader (applied as a post-processing pass)
const colorblindShaders: Record<ColorBlindMode, ShaderSource> = {
  none: passthroughShader,
  protanopia: daltonizeShader(0.0, 0.0, 1.0),  // simulate, then correct
  deuteranopia: daltonizeShader(1.0, 0.0, 0.0),
  tritanopia: daltonizeShader(0.0, 1.0, 0.0),
  achromatopsia: achromatopsiaShader,
};
```

### 6.2 Audio cues for visual events

When `audioCuesForVisualEvents` is true, every visual event that conveys gameplay information also produces a distinct audio cue:

```typescript
interface AudioCueMapping {
  visualEvent: string;             // 'qi_reservoir_low', 'deviation_onset', 'incoming_attack', etc.
  audioCue: AudioCue;
}

interface AudioCue {
  soundId: string;
  volume: number;
  pitch: number;
  pan: number;                     // -1 (left) .. +1 (right)
  duration: number;
}
```

### 6.3 Visual indicators for audio events

When `visualIndicatorsForAudioEvents` is true, every audio cue that conveys gameplay information also produces a visual indicator (an icon, a text label, or a screen-border flash):

```typescript
interface VisualIndicatorMapping {
  audioEvent: string;              // 'footstep_left', 'qi_residue_decay', 'npc_speech', etc.
  visualIndicator: VisualIndicator;
}

interface VisualIndicator {
  style: 'icon' | 'text' | 'border_flash';
  position: 'top_left' | 'top_right' | 'bottom_left' | 'bottom_right' | 'screen_border';
  color: number;
  duration: number;
}
```

### 6.4 Motor assistance

- **Hold-to-toggle**: buttons that normally require holding (defend, route-skin) can be toggled on/off with a single press.
- **Input slow-mo**: the simulation runs at reduced speed (per Celeste's Assist Mode). Determinism is preserved: the slow-mo is a render-time dilation, not a tick-rate change.
- **Aim assist**: ranged qi-actions snap to the nearest target within an assist cone. The assist is configurable from 0 (off) to 1 (full lock-on).
- **One-handed mode**: all actions remap to a single hand's keys (left or right). The default layout is one-handed-friendly; the mode is for players who need it.

**Failure case — accessibility-determinism conflict.** Some accessibility features (input slow-mo, aim assist) modify the player's effective input. The simulator preserves determinism: the *applied* inputs (after accessibility modifications) are what the simulation sees. Two runs with the same accessibility config and the same raw inputs produce identical simulation state. Different accessibility configs may produce different simulation states from the same raw inputs — that is acceptable (the player chose the config).

---

## 7. Rendering: DOM overlay vs. in-world diegetic

The engine has two rendering surfaces: the WebGPU/WebGL2 canvas (in-world) and the DOM overlay (menus, text). The split is principled:

```typescript
interface RenderingSurfaces {
  canvas: CanvasSurface;           // in-world; per doc 17 §5
  domOverlay: DOMOverlay;          // menus, text, journal
  splitRule: RenderingSplitRule;
}

interface RenderingSplitRule {
  // What goes in the canvas:
  inWorld: 'world_geometry' | 'player_body' | 'npcs' | 'qi_effects' | 'residue_visuals'
         | 'weather' | 'terrain' | 'diegetic_ui_elements';
  // What goes in the DOM overlay:
  domOverlay: 'journal' | 'save_load_menu' | 'dialogue_text' | 'console' | 'editor_surface'
            | 'subtitles' | 'accessibility_indicators' | 'tweak_panel';
}
```

**The principle.** Diegetic information (the player's body state, the world's qi, the NPC's visible behavior) goes in the canvas. Non-diegetic information (the journal, menus, dialogue text, the editor) goes in the DOM overlay. The DOM overlay is HTML/CSS (accessible by default, screen-reader-friendly, scalable); the canvas is WebGPU (high-performance, not accessible by default).

**Diegetic UI elements.** A small class of UI elements is rendered in the canvas as part of the world: a signpost the player reads, a book the player opens, a formation diagram the player inscribes. These are diegetic — they exist in the world, the player's character interacts with them, and they are rendered with the same pipeline as other world geometry.

**Failure case — DOM-overlay overload.** A plugin that tries to render gameplay-critical information in the DOM overlay (e.g., a "qi health bar") is rejected. Gameplay-critical information goes in the canvas as a rendering modifier (per §1). The DOM overlay is for menus and text only.

---

## 8. The tweak-panel export/import system

The tweak panel's export/import system is the engine's preset mechanism. A preset is a JSON document containing every parameter's value, keyed by plugin and dot-path.

```typescript
interface TweakPreset {
  presetId: string;                // UUID
  name: string;
  description: string;
  engineVersion: string;           // for compatibility checking
  determinismFingerprint: string;  // per doc 08; must match for the preset to load
  plugins: Record<string, PluginPreset>;
  exportedAt: string;              // ISO 8601
  exportedBy: string;              // user or agent name
}

interface PluginPreset {
  pluginId: string;
  pluginVersion: string;
  parameters: Record<string, unknown>;  // dot-path → value
}

// Example preset fragment:
// {
//   "presetId": "uuid-...",
//   "name": "Golden Scene 3 - Final Tuning",
//   "engineVersion": "0.4.2",
//   "determinismFingerprint": "sha256:...",
//   "plugins": {
//     "ga:fog": {
//       "pluginId": "ga:fog",
//       "pluginVersion": "0.1.0",
//       "parameters": {
//         "density": 0.042,
//         "heightFalloff": 0.005,
//         "color": "#2a2a3e"
//       }
//     },
//     "ga:combat": {
//       "pluginId": "ga:combat",
//       "pluginVersion": "0.2.1",
//       "parameters": {
//         "frameData.fastStrike.startup": 8,
//         "frameData.fastStrike.active": 4,
//         "frameData.fastStrike.recovery": 12
//       }
//     }
//   }
// }
```

### 8.1 Export

`exportPreset()` walks every registered `TweakControl`, reads its `currentValue`, and serializes the result to JSON. The preset includes the engine version and the determinism fingerprint (per doc 08) so that loading can detect compatibility issues.

### 8.2 Import

`importPreset(json)` parses the JSON, checks the engine version and fingerprint, and applies each parameter via `host.setParams`. Compatibility checking:

```typescript
function checkPresetCompatibility(preset: TweakPreset, currentEngine: EngineInfo): CompatibilityReport {
  const report: CompatibilityReport = { compatible: true, warnings: [], errors: [] };

  if (preset.engineVersion !== currentEngine.version) {
    report.warnings.push(`Preset was made for engine ${preset.engineVersion}; current is ${currentEngine.version}.`);
  }

  if (preset.determinismFingerprint !== currentEngine.determinismFingerprint) {
    report.errors.push(`Determinism fingerprint mismatch: preset is ${preset.determinismFingerprint}, engine is ${currentEngine.determinismFingerprint}.`);
    report.compatible = false;
  }

  for (const [pluginId, pluginPreset] of Object.entries(preset.plugins)) {
    const currentPlugin = currentEngine.plugins[pluginId];
    if (!currentPlugin) {
      report.warnings.push(`Plugin ${pluginId} not loaded; its parameters will be skipped.`);
      continue;
    }
    if (pluginPreset.pluginVersion !== currentPlugin.version) {
      report.warnings.push(`Plugin ${pluginId} version mismatch: preset ${pluginPreset.pluginVersion}, current ${currentPlugin.version}.`);
    }
  }

  return report;
}
```

**Failure case — preset drift.** A preset made for engine 0.3 may reference parameters that no longer exist in engine 0.4 (renamed, removed, restructured). The import applies what it can and logs warnings for what it cannot. The preset is not silently corrupted; the user sees the warnings and can decide.

**Failure case — fingerprint mismatch.** A preset made for a different determinism fingerprint cannot be loaded into the current engine (per doc 08 — the fingerprint is the contract). The import refuses with an error. This prevents subtle determinism bugs from preset incompatibility.

---

## 9. The DOM overlay's accessibility (screen-reader support)

The DOM overlay is HTML/CSS and is screen-reader-accessible by default. The canvas is not. The engine bridges the gap by exposing canvas-state descriptions via ARIA live regions:

```typescript
interface AriaBridge {
  liveRegions: AriaLiveRegion[];
  updateInterval: number;          // ms; default 1000
}

interface AriaLiveRegion {
  regionId: string;
  ariaLive: 'polite' | 'assertive';
  description: string;             // human-readable, updated each interval
  // Example: "Qi reservoir 73% full. Routing: hands, fire phase.
  //          Deviation risk: low. Nearby: Wang Family Bend, dawn."
}
```

**The description generator.** Each interval, the engine composes a description from the player's qi-state, routing, deviation risk, and location. The description is concise (under 200 characters) and uses the player's configured language. A screen-reader user hears the description at the configured interval.

**Failure case — description spam.** If the description updates too frequently, the screen-reader user is overwhelmed. The `updateInterval` defaults to 1000ms (1 second) and is user-configurable. Critical events (deviation onset, incoming attack) trigger an immediate `ariaLive: 'assertive'` update outside the interval.

---

## 10. The 1:365 time ratio and the UI

Per doc 15 §3, the Acquired stratum runs at 1:365 (1 real second = 1 game day). The UI must communicate this without confusing the player.

```typescript
interface TimeRatioUI {
  currentStratum: 'mortal' | 'acquired' | 'precelestial';
  timeRatio: number;               // 1, 365, or 1 (Precelestial)
  // The HUD shows in-world time cues (sun position, season) rather than a clock.
  // The journal shows the in-game date (year, month, solar term).
  // The save/load menu shows the tick count and the in-game date.
  // The console shows both wall-clock and in-game time.
}
```

**The diegetic time rule.** The player does not see a clock; they see the sun, the moon, the seasonal foliage, the NPCs' schedules. The in-game date is in the journal, not on the HUD. This is the doctrine's "design for joy first" applied: the player experiences time as the world's rhythm, not as a number.

**Failure case — time confusion.** A player who does not realize the time ratio may be confused that a year passes in a real-time day. The engine's tutorial (the first hour) makes the ratio explicit: the player's first full in-game day passes in ~4 minutes of real time, and the journal notes "Spring, Year 1" at the start. The ratio is felt before it is explained.

---

## 11. Tier simulation (the UI does not degrade)

The UI does not degrade by tier. The player always sees the full HUD (per §1) regardless of the simulation's tier. The editor surface is always available (in dev mode) regardless of tier. The console is always available.

What *does* degrade by tier is the *information available* to the UI:
- At S4, the scene inspector shows every entity in the player's vicinity.
- At S2 (the player absent from a region), the scene inspector shows the region's aggregate state (population counts, faction summary) but not individual entities.
- At S0 (the region frozen), the scene inspector shows the frozen state with a "frozen" badge.

**Failure case — inspector overload.** A region with 1000+ entities at S4 would overwhelm the inspector. The inspector paginates (default 100 entities per page) and supports search/filter. The simulator enforces `max_inspector_entities_per_frame` (default 256) to keep the UI responsive.

---

## 12. Determinism contract for the UI

The UI itself is not part of the simulation's determinism contract. The HUD's rendering modifiers are derived from the simulation state, not from wall-clock time. The DOM overlay's contents are derived from the simulation state and from user input (which is deterministically timestamped per §5).

**The hash verification.** The simulation's hash (per doc 17 §3.2) does not include UI state. Two runs with the same seed and the same inputs produce the same simulation hash, regardless of UI differences (different window sizes, different accessibility configs, different inspector selections). The UI is presentation; the simulation is canonical.

**The input determinism.** Inputs are timestamped at the tick boundary (per §5). Two runs with the same seed and the same input timing (to tick resolution) produce identical simulation state. Sub-tick input ordering is not preserved; this is acceptable because the simulation is tick-discrete.

---

## 13. Rejected alternatives

- **Traditional HUD with health bar, minimap, quest log.** Rejected: violates the diegetic principle (per doc 23 §1.1). The player experiences state through the body, not through menus.
- **Heavy AAA-style UI (Diablo-style inventory grids, skill trees).** Rejected: wrong feel for xianxia. The genre's UI is sparse; the world is the interface.
- **VR-only UI.** Rejected: VR is not the engine's target platform (per doc 17: browser-native, WebGPU first). VR may be a future plugin but not the default.
- **Mobile-only UI (touch-first, no keyboard).** Rejected: the engine targets desktop-first with touch as an alternative (per §4.1). Mobile-only would constrain the design.
- **Auto-generated UI from data schemas.** Rejected: produces generic, ugly UI. The HUD is hand-designed; the editor surface is hand-designed; only the tweak panel is auto-generated from `TweakControl` registrations (and even then, the section organization is hand-curated).
- **Accessibility as a post-launch patch.** Rejected: accessibility is a first-class subsystem (per §6), wired into the rendering and audio pipelines from day one. Post-launch accessibility patches are the historical failure mode the doctrine forbids.

---

## 14. Open decisions (surfaced for review)

1. **The 8-element DOM overlay cap (§1).** Invented. May be too tight (some scenes need more) or too loose (clutter).
2. **The default input bindings (§4.1).** Decided but likely needs tuning after playtesting. Genre conventions are a starting point, not a final word.
3. **The 16-inputs-per-tick cap (§5).** Invented. May be too low (some accessibility configs need more inputs) or too high (input flooding risk).
4. **The 1000ms ARIA update interval (§9).** Inherited from WCAG guidance. May be too slow (the player misses events) or too fast (description spam).
5. **The combat slow-mo factor of 0.7 (§6.3).** Invented. Per Celeste's precedent, slow-mo should be configurable. 0.7 is the default; the player can adjust.
6. **The one-handed mode layout (§6.4).** Decided: left-hand or right-hand, default left. The exact key mapping needs playtesting with one-handed players.
7. **The 100-entities-per-page inspector pagination (§11).** Invented. May need to scale with screen size.

---

## 15. Doctrine compliance

- **Build the engine, not just the brake:** the prior corpus's GUI doc (23) was the substrate; this document specifies the implementation: the rendering split, the input barrier, the accessibility subsystem, the tweak-panel export/import, the ARIA bridge.
- **Make decisions; do not defer:** the diegetic-first principle, the rendering split, the input barrier, the four accessibility subsystems, the preset format, the ARIA bridge are all decided. §14 are tuning parameters, not forks.
- **Cite the precedent:** Death Stranding, Tunic, WCAG 2.2, Godot 4.7, Unity 7, Chrome DevTools are named and their contributions specified.
- **Design for joy first:** the first hour's joy is the felt-sense HUD — the player experiences their qi-state through the body, not through a bar. The world is the interface; the menus are minimal.
- **Authorize the smallest end-to-end thing:** this document specifies enough to implement the player HUD, the editor surface (tweak panel + scene inspector + asset browser + AI control panel), the console, the input system, and the accessibility layer as the first prototype.

This document is the UI bible. It is the surface engine the prior corpus was missing.
