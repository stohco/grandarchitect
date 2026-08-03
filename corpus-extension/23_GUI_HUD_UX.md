# 23 — GUI, HUD, UI/UX: The Engine's Surfaces

**Status:** Design document. The player's interface and the editor's interface.
**Date:** 2026-08-03

---

## 0. What this document is

The engine has three surfaces, each for a different user:

1. **The Player HUD** — what the player sees during gameplay. Minimal, diegetic, non-intrusive.
2. **The Editor Surface** — what the designer (human or AI) sees during development. The tweak panel, scene inspector, asset browser, AI control panel.
3. **The Console** — the text interface for direct command entry. Same API as the WebSocket, typed.

All three are plugins (`ga:player-hud`, `ga:editor-surface`, `ga:console`). All three use the same underlying API (the headless API from document 17). The difference is presentation.

---

## 1. The Player HUD

### 1.1 Design principle: diegetic, minimal, non-intrusive

The player HUD is not a "UI overlay." It is part of the world. The player sees:
- **Their own body's state** (qi reservoir, routing, fatigue) as a felt sense, not a bar
- **Time of day** as the sun's position, not a clock
- **Location** as landmarks, not a minimap
- **Objectives** as world-state, not a quest log
- **Relationships** as NPC behavior, not a reputation meter

The only non-diegetic elements are:
- **The perception mode indicator** (a subtle visual shift when qi perception is active — per document 05 §1.6, the cross-modal effect IS the indicator)
- **The journal** (opened with J, contains the player's notes, the hexagram from Wang Lun, the manual from Old Chen)
- **The save/load menu** (opened with Esc, minimal)

### 1.2 The qi-state display

The player's qi-state is NOT a health bar. It is a felt sense rendered through the perception layer:

- **Reservoir full**: the player-character's hands feel warm, the vision is clear, the body feels light. Rendered as: slight warmth tint on the hands, normal camera.
- **Reservoir depleted**: the hands feel cold, the vision dims slightly, the body feels heavy. Rendered as: cool tint on the hands, slight desaturation, camera drops 5cm (the character slouches).
- **Qi routed to hands**: the hands glow faintly (only visible to the player, not to NPCs — this is the player's self-perception, not an observable effect).
- **Qi routed to senses**: the vision sharpens (slight contrast enhancement), audio gains clarity.
- **Deviation onset**: the vision warps slightly (chromatic aberration, occasional flicker). The player feels "something is wrong" before they know what.

This is the doctrine (Part 3: "Design for joy first") applied to the HUD: the player experiences their state through the body, not through a menu.

### 1.3 The journal

Opened with J. A simple document interface:

```
┌─────────────────────────────────────────┐
│  Journal                          [J]   │
├─────────────────────────────────────────┤
│  ◆ The Hexagram (Wang Lun, autumn)      │
│    "Fire over Earth. The hexagram of    │
│     Progress. But the fifth line is     │
│     changing..."                        │
│                                         │
│  ◆ The Manual (Old Chen, autumn)        │
│    "The route described is false.       │
│     The stop condition is missing.      │
│     I did not practice it."             │
│                                         │
│  ◆ People                               │
│    Wang Lun — the teacher who cannot    │
│    teach. Perceives qi faintly.         │
│                                         │
│    Old Chen — the hermit on the hill.   │
│    Qi Condensation, retired. Tests      │
│    before teaching.                     │
│                                         │
│  ◆ Places                               │
│    Wang Family Bend — home.             │
│    The well, the lineage hall, the      │
│    paddies, the graveyard.              │
│                                         │
│    Old Chen's hermitage — the hill      │
│    above Li Family Creek.               │
│                                         │
│  ◆ Open questions                       │
│    What is qi? (partially answered)     │
│    Where does it come from?             │
│    Can I heal the schistosomiasis?      │
└─────────────────────────────────────────┘
```

The journal is the player's memory. It updates automatically when the player learns something new. The player can also write their own notes (free text). The journal persists across saves.

### 1.4 The save/load menu

Opened with Esc. Minimal:

```
┌─────────────────────────────────────────┐
│  Save / Load                       [Esc]│
├─────────────────────────────────────────┤
│  Save 1: Wang Family Bend, Spring       │
│    Tick 45230 · Hash 7fde855...         │
│    [Load] [Delete]                      │
│                                         │
│  Save 2: Old Chen's Hermitage, Winter   │
│    Tick 89102 · Hash ab12cd3...         │
│    [Load] [Delete]                      │
│                                         │
│  [New Save]                             │
└─────────────────────────────────────────┘
```

Each save shows: the location name, the season, the tick count, and the hash (for determinism verification — the player can compare hashes across browsers if they want).

### 1.5 The dialogue interface

When the player talks to an NPC, the dialogue appears as text at the bottom of the screen, with the NPC's name and a portrait (or, for important NPCs, a close-up of their face). The player's dialogue choices appear as numbered options:

```
┌─────────────────────────────────────────┐
│  Wang Lun                               │
├─────────────────────────────────────────┤
│  "You've been staring at the incense    │
│   again. What do you see?"              │
│                                         │
│  1. "A depth in the sound. A second     │
│     room."                              │
│  2. "Nothing. I'm just tired."          │
│  3. "I don't know what I'm seeing."     │
│  4. [Leave]                             │
└─────────────────────────────────────────┘
```

The dialogue choices reflect the player's perception state. If the player is in "sense qi" mode, they may see additional options (e.g., "I see a faint warmth in your chest"). If the player is not in sense mode, those options are hidden.

---

## 2. The Editor Surface

### 2.1 The tweak panel (already implemented)

Toggle with H. Organized by plugin. Every parameter is a slider/color picker/toggle. Export Preset button. Already specified in document 11 §4.1.

### 2.2 The scene inspector

Toggle with I. A tree view of the scene graph:

```
┌─────────────────────────────────────────┐
│  Scene Inspector                   [I]  │
├─────────────────────────────────────────┤
│  ▾ Scene                                │
│    ▾ Wang Family Bend                   │
│      ▾ Households                       │
│        ▾ Wang Senior Household          │
│          ▸ Main House                   │
│          ▸ Kitchen                      │
│          ▸ Pigsty-Latrine               │
│          ▸ Well (shared)                │
│        ▸ Wang Tenant Household          │
│        ▸ Salt Merchant Household        │
│        ▸ Lin Household                  │
│        ▸ Widow's Household              │
│      ▾ NPCs                             │
│        ▸ #1 Wang Shouzheng (lineage head)│
│        ▸ #2 Lady Chen (mother)          │
│        ▸ #3 Wang Zongxian (elder son)   │
│        ▸ #4 Old Chen (hermit)           │
│        ▸ ... (180 more)                 │
│      ▾ Geography                        │
│        ▸ River                          │
│        ▸ Paddies (180 plots)            │
│        ▸ Graveyard Hill                 │
│        ▸ Lineage Hall                   │
└─────────────────────────────────────────┘
```

Click any entity to see:
- Transform (position, rotation, scale) — editable
- Components (NPC schedule, qi state, combat state, physics body, material)
- Relationships (to other entities)
- Recent events (last 10 events affecting this entity)

### 2.3 The asset browser

Toggle with B. Lists all loaded assets:

```
┌─────────────────────────────────────────┐
│  Asset Browser                    [B]   │
├─────────────────────────────────────────┤
│  Filter: [all ▾]                        │
├─────────────────────────────────────────┤
│  glTF Models (12)                       │
│  ▸ wang_house.glb      45 KB  ref: 3    │
│  ▸ kitchen.glb         22 KB  ref: 1    │
│  ▸ well.glb            18 KB  ref: 1    │
│  ▸ bucket.glb           8 KB  ref: 1    │
│  ▸ npc_base.glb        35 KB  ref: 180  │
│  ...                                    │
│                                         │
│  Textures (28)                          │
│  ▸ earth_diff.ktx2     12 KB  ref: 1    │
│  ▸ wall_diff.ktx2      14 KB  ref: 1    │
│  ▸ roof_diff.ktx2      11 KB  ref: 1    │
│  ...                                    │
│                                         │
│  Materials (8)                          │
│  ▸ earth               refs: 1          │
│  ▸ wall                refs: 1          │
│  ▸ roof                refs: 1          │
│  ...                                    │
└─────────────────────────────────────────┘
```

Click any asset to preview it in isolation (a small render window shows the model/texture/material on a test sphere).

### 2.4 The AI control panel

Toggle with ~ (backtick). Per document 22 §4. The WebSocket status, the console, the entity list, the quick-action buttons. This is the surface the AI uses (via WebSocket) and the human can use (via GUI).

---

## 3. The Console

### 3.1 The text interface

Toggle with / (slash). A text input at the bottom of the screen:

```
> step 100
< { tick: 4100, hash: "7fde855...", duration: 8.2ms }

> get ga:fog
< { density: 0.035, heightFalloff: 0.0042, color: "#2a2a3e" }

> set ga:fog density 0.05
< { ok: true }

> screenshot
< { image: "data:image/png;base64,iVBOR..." (saved to /tmp/shot.png) }

> body 5
< { id: 5, position: [1.2, 0.8, 3.4], velocity: [0, 0, 0], type: "dynamic" }

> force 5 0 100 0
< { ok: true }

> export
< { preset: '{"fog":{"density":0.05,...},...}' (copied to clipboard) }
```

### 3.2 Command reference

| Command | Args | Description |
|---|---|---|
| `step` | `<ticks>` | Advance simulation |
| `get` | `<pluginId>` | Get plugin parameters |
| `set` | `<pluginId> <key> <value>` | Set a parameter |
| `screenshot` | | Take a screenshot |
| `body` | `<id>` | Inspect a physics body |
| `bodies` | | List all bodies |
| `force` | `<id> <x> <y> <z>` | Apply force to body |
| `impulse` | `<id> <x> <y> <z>` | Apply impulse to body |
| `entity` | `<id>` | Inspect an entity |
| `entities` | | List entities |
| `export` | | Export preset |
| `import` | `<json>` | Import preset |
| `reset` | | Reset to initial state |
| `hash` | | Get current state hash |
| `plugins` | | List plugins |
| `help` | | Show commands |

### 3.3 Autocomplete

The console autocompletes:
- Plugin IDs (`ga:fog`, `ga:water`, etc.)
- Parameter names (from the plugin's schema)
- Entity IDs (from the scene)
- Command names

Tab completes. Up/down arrows cycle history.

---

## 4. The visual language

### 4.1 The editor theme

Dark, monospace, high-contrast. The editor is a tool, not a fashion statement:
- Background: `#09090b` (zinc-950)
- Panels: `#18181b` (zinc-900)
- Borders: `#27272a` (zinc-800)
- Text: `#fafafa` (zinc-50)
- Secondary text: `#a1a1aa` (zinc-400)
- Accent: `#4ade80` (emerald-400) — for values, hashes, success
- Warning: `#fbbf24` (amber-400)
- Error: `#f87171` (red-400)

### 4.2 The player theme

The player's HUD is diegetic — it uses the world's visual language, not the editor's:
- No panels, no borders, no backgrounds
- Text appears as if written on paper (for the journal) or spoken (for dialogue)
- The qi-state is felt, not displayed
- The only "UI element" is the subtle perception-mode visual shift

### 4.3 Typography

- **Editor**: ui-monospace (Menlo, Consolas, etc.) for all text. The editor is code, not prose.
- **Player**: a serif font for the journal (evoking classical Chinese texts), a sans-serif for dialogue (evoking speech). CJK text via Troika (per document 08).

---

## 5. What this document enables

- The player HUD is diegetic and minimal — no bars, no minimaps, no quest logs. The player experiences state through the body.
- The editor surface (tweak panel, scene inspector, asset browser, AI control panel) is the designer's toolset — every parameter is visible and adjustable.
- The console is the text interface — same API as the WebSocket, typed.
- The AI control panel (toggle with ~) is the bridge between the AI surface (WebSocket) and the human surface (GUI).
- The visual language separates editor (dark, monospace, tool) from player (diegetic, typographic, world).

The engine's surfaces are not "UI." They are the interfaces between the engine and its users — the player (who experiences the world), the designer (who tunes the feel), and the AI (who builds and verifies). Each surface is appropriate to its user. Each uses the same underlying API. Each is a plugin.
