# Live Architect Studio — Worklog

## EDITOR-REBUILD — Claude (sole agent)

**Task:** Rebuild the Live Architect Studio editor from scratch after a `git reset` wiped all editor files. The shadcn/ui components, Three.js, Zustand, the determinism stack (`src/lib/determinism/`), and `src/lib/engine/definitions.ts` survived.

**Date:** 2026-08-04

### What was built

All work was done by a single agent in this session (no parallel subagents were needed for a focused single-flow rebuild). The work record for this task is `/agent-ctx/EDITOR-REBUILD-claude.md`.

#### 1. Editor types — `src/lib/editor/types.ts`
- `StructureKind` (10 kinds), `SerializableStructure`, `SerializableHousehold`, `SerializableSettlement`
- `WorldExecutionState` (7 modes), `SimulationDomain` (12 domains)
- `LogEntry`, `TransactionLite`, `WorldBranchLite`, `CapabilityDescriptorLite`, `PerfStats`, `EntityEdit`
- `TransformMode`, `RenderMode`, `CameraPreset`, `EditorMode`, `LogLevel`
- Centralised `STRUCTURE_COLOR` / `STRUCTURE_LABEL` / `ALL_DOMAINS` / `WORLD_STATE_LABEL` lookup tables

#### 2. API routes
- `GET /api/editor/world?seed=<string>` — deterministic village generator using the project's xoshiro256** + SHA-256 determinism stack. Layout: lineage hall at centre, 18–31 households in two rings, terraced paddies to the south, dryland gardens NE, shrine NW high ground, mill + dock + levee on the river side, graveyard downwind west, paths connecting hall to dock/shrine. Default seed `wang-family-bend-1108` → "Wang Family Bend" / 王灣村.
- `GET /api/editor/capabilities` — static catalogue of 15 Grand Architect capabilities (inspection / branching / mutation / narrative / environment / economy / cultivation / time).
- `POST /api/editor/step` — advances the world one tick deterministically (re-seeds from `seed::tickN`, nudges physics/ecology-affected structures).
- `POST /api/architect/interpret` — calls `z-ai-web-dev-sdk` to draft the Architect's reply; falls back to canned deterministic responses if the SDK is unreachable. Side-effects: `fork` intent forks the world, `step` intent advances a tick.
- `GET /api/architect/lore?q=<query>` — searches the surviving `corpus-extension/` + `engine-architecture/` markdown for excerpts.

#### 3. Zustand store — `src/lib/editor/store.ts`
Single store with all state + actions: settlement, worldState, frozenTick, domainActivations, editorMode/transformMode/renderMode/snap/grid/gizmos/stats/minimap, panel visibility, cameraPreset/Focus, outliner filter/grouping, consoleFilter, activeBottomTab, selectedEntityIds, hoveredEntityId, edits, hiddenEntityIds, logs, transactions, branches, currentBranchId, capabilities, perf, fpsHistory, presence state. Actions: generateWorld, step, toggleSim, toggleDomain, forkWorld, all toggles, selection ops, edit ops, log/clearLogs, recordTransaction/undoTransaction, createBranch/switchBranch, loadCapabilities, setPerf, presence controls. Plus `selectStructureWithEdits` and `groupStructuresByKind` selectors.

#### 4. `src/app/page.tsx`
Dynamic-imports `EditorLayout` with `ssr:false` (Three.js can't SSR), shows a branded loading spinner.

#### 5. Viewport3D — `src/components/editor/viewport/Viewport3D.tsx`
Three.js scene: PerspectiveCamera at [40,35,40], OrbitControls with damping, ambient + directional (shadow-casting) + cool fill light, shadow-catching ground plane, toggleable grid helper, kind-coloured BoxGeometry meshes (height varies by kind). Raycaster click-to-select (shift/cmd/ctrl for multi-select), hover highlight via emissive tint, TransformControls gizmo attached to primary selected entity (with snap), four render modes (shaded/wireframe/solid/pointcloud), camera presets (perspective/top/front/side), camera-focus-on-entity. FPS counter fed back to the store once per second via `renderer.info`. WebGL-availability check with graceful fallback JSX. "No world loaded" placeholder when settlement is null.

#### 6. ViewportOverlay — `src/components/editor/viewport/ViewportOverlay.tsx`
HUD: settlement card (name + hanzi + seed + tick + fork badge), world-state pill (colour per state), perf stats (fps/frame/draws/tris/entities), structure-kind colour legend, hovered-entity tooltip.

#### 7. EditorToolbar — `src/components/editor/toolbar/EditorToolbar.tsx`
Top bar: brand, WorldGenBar, editor-mode select, play/pause/step/fork buttons, transform tools (W/E/R), snap/grid/gizmos/stats/minimap toggles, render-mode select, camera-preset select, outliner/dock/inspector panel toggles. All toggles show active state in emerald.

#### 8. WorldGenBar — `src/components/editor/toolbar/WorldGenBar.tsx`
Seed input + Generate button + preset seeds dropdown (6 presets). Submits to `store.generateWorld`.

#### 9. Panels (`src/components/editor/panels/`)
- **OutlinerPanel** — grouped-by-kind tree (collapsible) or flat list, search filter, colour swatches, eye-toggle visibility, click-select / shift-toggle, footer counts.
- **InspectorPanel** — selected entity header with colour swatch, Focus + Revert buttons, editable NumberFields for pos.x/pos.z/rotation/width/depth (commits as transactions), metadata table. Empty state when nothing selected.
- **ConsolePanel** — filtered log list (level-coloured), auto-scroll to bottom, clear button, level filter via store.
- **ArchitectPanel** — chat UI posting to `/api/architect/interpret`, quick-action buttons (fork/spawn/step/weather), tool badges on replies, busy + error states, records each exchange as a transaction.
- **AssetBrowserPanel** — definition-card grid sourced from `src/lib/engine/definitions.ts`, kind-coloured, tag chips, filter input.
- **SimulationPanel** — 7-state world execution machine (single-select, colour-coded), 12-domain toggle grid (Switch per domain), step + fork buttons, active-domain count.
- **HistoryPanel** — branch tree (click to switch, current highlighted), new-branch form, transaction list per branch with undo buttons and tool/name badges.

#### 10. ArchitectPresence — `src/components/editor/ArchitectPresence.tsx`
Floating orb (bottom-right of viewport) with pulsing status-coloured glow. Click or Ctrl+K / ⌘K (platform-aware) opens a Dialog command palette with three modes: **Chat** (reuses `/api/architect/interpret`), **Actions** (5 quick world-mutations), **Lore** (debounced search of `/api/architect/lore`). Mood cycles while open. Hotkey hint shown when closed.

#### 11. EditorLayout — `src/components/editor/EditorLayout.tsx`
Three-column resizable layout (shadcn ResizablePanelGroup): Outliner 18% / Centre 58% / Inspector 24%, all toggleable and resizable. Centre column holds Viewport3D + ViewportOverlay + ArchitectPresence on top, and a 280px bottom dock with Tabs (Console / Architect / Assets / Simulation / History) on the bottom. Collapsible dock with "Show bottom dock" reveal strip. Status bar at the very bottom with settlement name, structure count, tick, world state, branch suffix, selection count, capability count, colour-coded FPS. Auto-generates the default world + loads capabilities on first mount.

### Verification
- `bun run lint` → clean (0 errors, 0 warnings)
- Dev server (Next.js 16.1.3 Turbopack) compiles and serves `/` with HTTP 200
- All API endpoints return 200:
  - `GET /api/editor/world?seed=wang-family-bend-1108` → 51 structures, 22 households, "Wang Family Bend" / 王灣村
  - `GET /api/editor/capabilities` → 15 capabilities
  - `POST /api/editor/step` → advances tick deterministically
  - `POST /api/architect/interpret` → real LLM reply via z-ai-web-dev-sdk (e.g. "This bend in the celestial river marks where the Jade Emperor's tears first fell…")
  - `GET /api/architect/lore?q=cultivation` → excerpts from 00/03/04 corpus docs
- agent-browser verification: page loads, toolbar renders all controls, outliner shows grouped structures (LINEAGE HALL 1, HOUSEHOLD 22, PADDY 14, …), clicking a structure populates the inspector with editable fields, console shows the generation log, Architect Presence palette opens with Chat/Actions/Lore tabs, chat round-trip works end-to-end, lore search returns corpus excerpts.
- Browser console: only the React DevTools info + HMR logs (no errors after fixing the `PCFSoftShadowMap` deprecation).

### Design constraints honoured
- `'use client'` on every interactive component
- All `fetch()` calls use relative paths only (`/api/editor/world`, etc.)
- Viewport3D dynamically imported with `ssr:false` (Three.js touches `window`)
- Dark theme `#1a1a2e` / `#12122a` / `#0e0e24` background, `#c8c8e0` / `#8888aa` / `#5a5a7a` text, **emerald** primary accent, **purple/amber/rose** secondary accents — **no blue/indigo** anywhere
- Full-screen editor (no footer, no sticky-footer requirement)
- Responsive (collapses labels on narrow viewports) but primarily desktop
- TypeScript strict throughout; no `console.log` in production code

### Commit
`87b82cb rebuild: Live Architect Studio editor` — 22 new files + 2 modified (page.tsx, layout.tsx).

---

## PANELS-REBUILD — 7 missing bottom-dock panels (2026-08-04)

**Task:** Rebuild 7 missing bottom-dock panels for the Live Architect Studio editor and wire them into EditorLayout.tsx.

**Status:** ✅ Complete
**Commit:** `rebuild: 7 dock panels (Conformance/Capabilities/Engine/Reasoning/Constraints/Complexity/Benchmarks)`

### Files created (7 new panels)
- `src/components/editor/panels/ConformancePanel.tsx` — POST `/api/engine/run-tests` on mount + Run All; summary banner; 7-suite table with expandable mono-font tail rows.
- `src/components/editor/panels/CapabilitiesPanel.tsx` — 15 inline plugins (Determinism/Reference/Simulation) + 8 architect roles; category filter + search; plugin cards (id/version/category badge/capability chips/LOC); collapsible Architect Roles.
- `src/components/editor/panels/EnginePanel.tsx` — Static 8-phase build timeline (DONE emerald checkmark / PENDING amber circle), 8 safety rails (scrollable, shield icon), L0-L6 autonomy horizontal ladder; TOTAL TESTS stat.
- `src/components/editor/panels/ReasoningPanel.tsx` — Text input + Interpret; POST `/api/architect/interpret` with `{request}`; 3 hypothesis cards with interpretation + specificity/confidence/reversibility bars + confirmed/assumed/unresolved lists; weakest=emerald border+WEAKEST badge; over-specified=red tint; selected-hypothesis clarifications as question cards with option buttons.
- `src/components/editor/panels/ConstraintsPanel.tsx` — Load Sample (GET) + Solve (POST); variables+constraints of loaded problem; on solve shows status banner + assignment table + proof object (recursive ✓/✗ justification tree) + solver trace + validation checks, all mono font.
- `src/components/editor/panels/ComplexityPanel.tsx` — Scale/Window/Seed selects + Sample (GET); color-coded trend diagnosis banner; 4 metric tiles (compressibility/entropy/diversity/predictive value) with sparkline SVGs; seed comparisons table.
- `src/components/editor/panels/BenchmarksPanel.tsx` — Run Benchmarks (POST) + auto-run on mount; results table (Benchmark / Our Engine / Ursus / Unity / Ratio / Verdict); our-engine cell colored emerald/amber/red; overall verdict banner.

### Files modified
- `src/components/editor/EditorLayout.tsx` — Added 7 entries to BOTTOM_TABS after 'history' (conformance/capabilities/engine/reasoning/constraints/complexity/benchmarks) with `dense: true` flag; added 7 TabsContent conditional renders; dock height now dynamic (`h-56` for dense tabs, `h-48` for original 5); TabsList gets `min-w-0 flex-1 overflow-x-auto` so 12 tabs scroll horizontally; imported 7 new lucide icons.
- `src/lib/editor/store.ts` — Extended `activeBottomTab` union to include the 7 new tab ids.
- `src/app/api/architect/interpret/route.ts` — Reads `body.request ?? body.message`; runs the RCVC hypothesis engine; returns `hypotheses` (3 scored) + `clarifications` (default = weakest-sufficient's) + `clarificationsByHypothesis` (per-hypothesis, for click-to-switch) + `selectedHypothesisId`. Existing ArchitectPanel consumers unaffected (they only read `reply/toolsUsed/intent`).
- `src/app/api/architect/constraints/route.ts` — POST now normalizes `variables` → `vars` after validation (the service expects `vars` but GET returned `variables`); GET sample rewritten as a real solvable problem (4 float position vars + 3 IR constraints: hard path-connectivity via (Δx)²+(Δz)²≤1600, hard floodplain z≥-10, soft feng-shui z≤20). Procedural solver finds a valid assignment in <10ms with softPenalty 0.5 (feng-shui intentionally violated for proof-tree demo).

### Verification
- `bun run lint` → 0 errors, 0 warnings.
- Dev server (Turbopack) compiles cleanly; no errors in dev.log.
- All 5 endpoints exercised via curl, all return HTTP 200 with the expected shape:
  - `POST /api/architect/interpret {"request":"..."}` → 3 hypotheses, selectedHypothesisId set, clarificationsByHypothesis populated (1/1/0 questions).
  - `GET /api/architect/constraints` → sample problem with float domains + IR constraints.
  - `POST /api/architect/constraints` (with sample) → solved:true, procedural solver, assignment populated, proof.root.kind='and' with 3 children, trace with 3 evaluations.
  - `GET /api/architect/complexity?scale=settlement&window=years&seed=42` → 20 samples, trend 'chaotic'.
  - `POST /api/architect/benchmark` → 5 results, first (Spawn) beats_ursus at 1.151ms vs 10ms Ursus target.
  - `POST /api/engine/run-tests` → 7 suites, ok:true, totalPassed:1278.

### Design constraints honoured
- `'use client'` on every interactive panel.
- All `fetch()` calls use relative paths only.
- Dark theme palette preserved: bg #0e0e24 / #12122a, text #c8c8e0 / #8888aa / #5a5a7a, emerald-500 primary accent, purple/amber/rose secondary — **no blue/indigo**.
- shadcn/ui components (Button, ScrollArea, Select) used where applicable.
- Mono font for proof/trace/tail output.
- Responsive: grids collapse 3→2→1 columns; tabs scroll horizontally on narrow viewports.
- TypeScript strict; no `console.log` in production code.
- Each panel self-contained: fetches its own data, manages its own loading/error state.
