# CHANGES — UI-ONE-ACTION-SYSTEM

## Canonical action layer (new files)

- `src/lib/studio-ui/action-registry.ts` — canonical `UiActionRegistry`
  singleton: register/get/list/search/shortcuts/capability access matrix.
  Added `disabledReason` to `UiActionDefinition` (the honest-disable contract).
- `src/lib/studio-ui/action-registrations.ts` — registers **59 actions**
  across world/assets/characters/animation/simulation/architect/diagnostics/
  global/playtest. Every action is available via the registry; actions with
  no backend carry `disabledReason` → `invoke` returns
  `DISABLED_WITH_REASON` (never a silent no-op).
- `src/lib/studio-ui/action-handlers.ts` — ONE `invoke` implementation per
  action id: store transitions for transient UI state (selection, transform
  mode, toggles, playtest), real API calls in the browser, and the same
  engine call locally in Node (so conformance tests run without an HTTP
  server). Abort-aware.
- `src/lib/studio-ui/conformance-test.ts` — 45 assertions, exit 0 (details
  in EVIDENCE.json).

## UI wiring (modified)

- `EditorToolbar.tsx` — every button dispatches by action ID
  (`dispatchAction`): transport (simulation.start/stop/step), playtest,
  transform modes, view toggles, select all/deselect, reset edits, fork,
  stats, console dock.
- `Viewport3D.tsx` — keyboard shortcuts ALL via registry, including the
  previously dead `Ctrl+Z`/`Ctrl+Shift+Z` (old handler bailed on every ctrl
  key); click-to-select and background deselect dispatch `global.select` /
  `global.deselect`; new registry-backed right-click context menu (select,
  toggle visibility, deselect, reset edits, fork, grid/gizmos, playtest);
  playtest-mode Escape exits via `playtest.toggle`; context menu suppressed
  in playtest (right-click = camera look).
- `OutlinerPanel.tsx` — row click → `global.select` (replace/toggle), eye
  button → `world.toggleVisibility`, new per-row context menu (registry-
  backed).
- `InspectorPanel.tsx` — transform edits → `world.applyEntityEdit`; hide/
  show → `world.toggleVisibility`.
- `ConsolePanel.tsx` — clear → `diagnostics.clearLogs`.

## Broken controls fixed

1. **Toolbar Stop illegal transition** — old code requested
   `generation_freeze` directly from `step_simulation`/`full_simulation`
   (store logs + ignores as ILLEGAL). `simulation.stop` now stops the
   scheduler then walks legal transitions `→ dormant_architect →
   generation_freeze` (action-handlers.ts `stopStoreSimulation`).
2. **Ctrl+Z / Ctrl+Shift+Z** — wired in the ctrl branch of the keydown
   handler to `global.undo` / `global.redo` (redo honestly blocked:
   no redo backend exists).
3. **Fork** — `world.fork` → `createBranch` (real branch semantics) +
   `temporary_fork` world state request; toolbar + context menu use it.
4. **Playtest chat/input focus** — both the viewport shortcut handler and
   PlaytestCharacter's movement key handler guard with `isTyping()` (INPUT/
   TEXTAREA/SELECT/contentEditable), so typing in the Architect chat/palette
   never triggers editor shortcuts or WASD movement. The Architect chat
   input is untouched and keeps working.

## DISABLED_WITH_REASON (honest, 3 actions)

- `asset.generateLOD` — /api/studio has no generate_lod transport case.
- `asset.generateCollisionProxy` — /api/studio has no
  generate_collision_proxy transport case.
- `global.redo` — no redo stack anywhere (engine runtime, API, store).

## API

- `/api/studio-ui` GET: now exposes `disabledReason` per action + the
  shortcut table; POST `invoke`/`search`/`available` route through the
  canonical registry with availability gating.
