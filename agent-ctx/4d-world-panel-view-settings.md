# Task 4d: WorldPanel + ViewSettings (Live Architect Studio editor)

## Status: COMPLETE

## Summary
Built two `'use client'` React components for the Live Architect Studio editor's Dormant World Runtime control room and viewport settings. Both read state exclusively from the `useEditorStore` Zustand store (no props, no modifications to the store contract).

## Files Created
- `/home/z/my-project/src/components/editor/world-panel.tsx` — default export `WorldPanel` (control room for the Dormant World Runtime)
- `/home/z/my-project/src/components/editor/view-settings.tsx` — default export `ViewSettings` (render/camera/display settings panel)

## Contracts Honored

### WorldPanel
Reads from store: `seed`, `seedInput`, `setSeedInput`, `generateWorld`, `loadingWorld`, `worldError`, `settlement`, `worldState`, `frozenTick`, `simRunning`, `stepping`, `domains`, `forks`, `requestWorldState`, `step`, `toggleSim`, `toggleDomain`, `forkWorld`.

Four sections (vertical, scrollable):
1. **World Generation** — mono-font seed Input, emerald Generate button (Sparkles, Loader2 spinner), rose error banner, 3 preset seed chips, post-generation stat grid (village name + hanzi, structures, households, population, tick).
2. **Execution State** — 7-state visual state machine in a 2-col grid. Each card shows icon + formatted name + one-line description. Current state highlighted (emerald border + bg). Unreachable states dimmed (`opacity-40 cursor-not-allowed`). Play/Pause toggle at top calls `toggleSim()`. Local `VALID_TRANSITIONS` map mirrors the store's.
3. **Step Simulation** — disabled (opacity-40) unless worldState ∈ {dormant_architect, selective_awakening, step_simulation}. shadcn Select with 9 granularity options encoded as `granularity|count`, cyan Step button (StepForward + stepping spinner), prominent mono frozen-tick readout, amber Fork World button (GitFork), active fork chips.
4. **Simulation Domains** — 3-col grid of 12 domain toggle chips. Active = emerald, inactive = zinc. Shows `K/12 active` counter. Each chip has its domain-specific icon.

State icon mapping: generation_freeze=Snowflake, dormant_architect=Moon, selective_awakening=Eye, step_simulation=StepForward, full_simulation=Play, player_embodiment=User, temporary_fork=GitFork.
Domain icon mapping: physics=Atom, animation=Film, ai=Brain, ecology=Leaf, economy=Coins, weather=CloudRain, history=Scroll, combat=Swords, cultivation=Flame, social=Users, audio=Volume2, navigation=Navigation.

### ViewSettings
Reads from store: `transformMode`, `setTransformMode`, `renderMode`, `setRenderMode`, `cameraPreset`, `setCameraPreset`, `showGrid`, `toggleGrid`, `showGizmos`, `toggleGizmos`, `showStats`, `toggleStats`, `snapEnabled`, `toggleSnap`, `selectedEntityIds`, `clearSelection`.

Five sections (vertical, scrollable):
1. **Transform Tool** — ToggleGroup (3): Translate (Move), Rotate (RotateCw), Scale (Maximize).
2. **Render Mode** — ToggleGroup (4): Shaded, Wireframe, Solid, Lit.
3. **Camera** — 2x2 grid of preset buttons: Perspective (Box), Top (ArrowDown), Front (ArrowRight), Side (ArrowUp).
4. **Display** — Switch rows for Grid (Grid3x3), Gizmos (Crosshair), Stats Overlay (BarChart3), Snap to Grid (Magnet).
5. **Selection footer** — "N selected" count + Clear button (disabled when N=0) bound to `clearSelection`.

ToggleGroup `onValueChange` handlers guard against the Radix single-mode empty-string emit (so the tool never deselects).

## Visual Style
- Dark engine theme: `<div className="dark">` wrapper, `bg-zinc-950 text-zinc-300 border-zinc-800`.
- Section headers: `text-[11px] font-semibold uppercase tracking-wider text-zinc-500`.
- Dense `text-xs` / `text-[11px]` / `text-[10px]` typography.
- Emerald = active/primary, amber = fork, cyan = step, rose = error.
- NO indigo/blue anywhere.
- Thin scrollbars: `[&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-zinc-700`.
- Consistent header bar (icon + uppercase title + status badge) matching the existing `Outliner` and `BottomDock` panels.

## Quality Checks
- `bun run lint`: **0 errors** (1 pre-existing warning in unrelated `OutlinerPanel.tsx`).
- `npx tsc --noEmit --skipLibCheck`: no errors in either new file (pre-existing BigInt/ES2020 errors in `src/lib/determinism/` are unrelated and pre-date this task).
- Strict TS throughout — no `any`, no forbidden functions (Math.random etc.).
- All imports use direct module paths (`@/components/ui/button`, etc.) matching the `outliner.tsx` pattern.
- shadcn/ui components used: Button, Input, Badge, Switch, Select/*, ToggleGroup/*, Separator, Label.
- Icons exclusively from `lucide-react`.

## Pattern Alignment
Both components follow the established editor-panel conventions observed in `outliner.tsx` and `bottom-dock.tsx`:
- Same dark wrapper structure (`dark flex h-full min-h-0 flex-col bg-zinc-950`).
- Same header bar pattern (icon + uppercase title + status badge).
- Same `SCROLLBAR_CLASS` constant.
- Same `cn()` utility usage for conditional class composition.
- Same `type LucideIcon` import for typed icon maps.
- Store selectors are split per-slice for optimal re-render granularity.
