# Task 4c — Bottom Dock (Live Architect Studio)

**Agent:** full-stack-developer (Bottom Dock)
**File:** `src/components/editor/bottom-dock.tsx`
**Default export:** `BottomDock` — a `'use client'` React component, no props.

## Contract review
- Read `src/lib/editor/store.ts` (Zustand store) — subscribed to:
  - `activeBottomTab`, `setActiveBottomTab`
  - `logs`, `consoleFilter`, `setConsoleFilter`, `clearLogs`
  - `transactions`, `branches`, `currentBranchId`, `frozenTick`, `undoTransaction`, `createBranch`, `switchBranch`
  - `capabilities`, `capabilitiesLoading`, `loadCapabilities`
  - `perf`, `fpsHistory`
  - `settlement`, `seed`, `log()`
- Read `src/lib/editor/types.ts` — confirmed `LogLevel`, `LogEntry`, `TransactionLite`, `WorldBranchLite`, `CapabilityDescriptorLite`, `PerfStats` shapes.
- Read `src/lib/engine/dashboard-data.ts` — reused `PHASES`, `PLUGINS`, `SAFETY_RAILS`, `CONFORMANCE_FILES`, `TOTAL_TESTS`.
- Read `src/app/api/engine/run-tests/route.ts` — confirmed response shape `{ok, totalPassed, totalFailed, totalDuration, suites:[{name,path,expected,passed,failed,total,ok,durationMs,tail}], timestamp}`.

## Implementation
- Root: `<div className="dark">` → `bg-zinc-950 border-t border-zinc-800 flex flex-col`.
- Custom tab bar (no shadcn `Tabs`) — 6 buttons with icon + label + optional count badge. Active state: `bg-zinc-900 text-zinc-100 border-t-2 border-emerald-500 -mt-px`. Inactive: `text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900/50`. Tab bar horizontally scrollable on narrow viewports.
- Fixed `h-[220px]` content area; each panel manages its own scroll.
- Shared `SCROLLBAR_CLASS` constant — thin custom scrollbar (`w-1.5`, `bg-zinc-700` thumb).

## Panels
1. **Console** — filter row (All/Info/Success/Warn/Error/Debug/Architect chips with colored dots, Clear button right-aligned); monospace log rows with `[tick]` + level dot + `[source]` + message; auto-scrolls to bottom on new logs (ref + `useEffect`); filters by `consoleFilter`.
2. **History** — 60/40 flex split. Left: reverse-chronological transaction cards (id, permissionClass badge colored, requestedBy with User/Bot icon, affectedSystems chips, diff count, Undo button or UNDONE badge; architect_power shows "locked"). Right: branches list with current-branch highlight (`bg-emerald-500/15 border-l-2 border-emerald-500`), inline New-Branch form using `Input` + `Button`.
3. **Capabilities** — calls `loadCapabilities()` on mount when empty; header shows count + total tools; 2-column grid (1 on narrow) of cards with capabilityId (emerald mono), description, tool stat chips (inspect/preview/mutation/generation with Eye/Search/Wrench/Sparkles icons, color-coded cyan/amber/rose/fuchsia), selection count, editable props count, three support badges (undo/live/fork — emerald when true, zinc when false), permissionClass badge.
4. **Performance** — 6 stat tiles (FPS color-coded emerald/amber/rose based on ≥55/≥30/<30); inline SVG polyline FPS sparkline (last 120 samples, emerald stroke, min/avg/max text); settlement sub-section (structures, households, population, tick, seed).
5. **Conformance** — Run All Suites button (Play icon, emerald); POST `/api/engine/run-tests`; summary bar with `✓ ALL PASS` or `✗ FAILURES`, passed/failed counts, duration; list of suites with status dot, name, `passed/expected`, duration; expandable to show `tail` output in a `<pre className="font-mono text-[10px] … max-h-32 overflow-y-auto">`.
6. **Engine** — 4 summary tiles (phases done, total tests, plugins, safety rails); phases list (done = emerald dot, pending = zinc dot, with test counts); plugins by category chips; safety rails as scrollable chip list (max-h-24).

## Verification
- `bun run lint` → EXIT=0 (clean).
- Dev server compiled cleanly (no errors in `dev.log`).
- No `any`, no forbidden functions (`Math.random` etc.); `Math.min/max` used only for sparkline normalization.
- `'use client'` directive present.
- No props on default export.

## Notes for downstream agents
- The dock is a self-contained client component. To mount, simply render `<BottomDock />` in the editor layout.
- The Conformance panel keeps its own local state (results, running, error, expanded). Other panels are pure store-driven.
- Capabilities auto-load on first mount of that tab.
