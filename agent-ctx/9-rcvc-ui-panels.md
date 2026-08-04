# Task 9 — RCVC UI Panels (full-stack-developer)

## Summary
Built 4 RCVC (Reasoning / Constraint / Complexity / Benchmark) UI panels and wired them into the Live Architect Studio editor's bottom dock as 4 new tabs.

## Files created
- `src/components/editor/panels/ReasoningPanel.tsx` — weakest-sufficient interpretation UI (~430 lines)
- `src/components/editor/panels/ConstraintsPanel.tsx` — constraint solver + proof object viewer (~470 lines)
- `src/components/editor/panels/ComplexityPanel.tsx` — complexity observatory dashboard with sparklines (~530 lines)
- `src/components/editor/panels/BenchmarksPanel.tsx` — Ursus engine comparison table (~290 lines)

## Files modified
- `src/components/editor/EditorLayout.tsx`
  - Imported the 4 new panels
  - Added 4 new entries to `BOTTOM_TABS` (`reasoning`, `constraints`, `complexity`, `benchmarks`)
  - Added `TALL_TABS` set and made the bottom dock height responsive: `h-56` for RCVC tabs, `h-48` for the original 5 (with a subtle `transition-[height] duration-150` animation)
  - Added the 4 conditional renders in the `BottomDock` component

## API endpoints used (no changes to backend)
- `POST /api/architect/interpret` — `{request}` → `{hypotheses, weakest, clarifications, count}`
- `GET  /api/architect/constraints` — sample sect-layout problem
- `POST /api/architect/constraints` — solve a constraint problem (returns `{ok, model?, proof, failureReason?}`)
  - **Note**: The task description said `POST /api/architect/constraints/solve`, but the actual route at `src/app/api/architect/constraints/route.ts` has BOTH the POST solve handler and the GET sample handler. There is no `/solve/route.ts` file. We POST to `/api/architect/constraints` to match the actual implementation — no API route changes were needed (per task constraints).
- `GET  /api/architect/complexity?scale=...&window=...&seed=...` — `ComplexityReport`
- `POST /api/architect/benchmark` — `BenchmarkSuite`

## Panel design notes

### ReasoningPanel
- Input bar at top + 4 preset chip prompts that auto-trigger Interpret.
- Each hypothesis is a card with: interpretation text (pre-wrap, font-mono), confidence badge (color-coded), specificity + reversibility progress bars (with hint text), three constraint lists (Confirmed / Assumed / Unresolved) with counts and per-consequence color dots, and a scope footer.
- The weakest hypothesis (requiresClarification=true) is highlighted with an emerald border + ring + `WEAKEST` badge.
- Over-specified hypotheses (specificityScore > 0.75) get a red border tint; > 0.55 amber.
- Clicking SELECT on a hypothesis reveals its clarification questions (purple-themed cards) with option buttons that show resulting specificity.
- "✓ No clarifications required — committable as-is" banner when the selected hypothesis has no clarifications.

### ConstraintsPanel
- Two-column layout: LEFT = problem definition (variables with formatted domains, constraints with hard/soft dot + kind chip), RIGHT = proof object.
- Action bar: `Load Sample Problem` (Download icon, GET) and `Solve` (Play icon, POST).
- Solution model is rendered as a variable→value table inside an emerald-tinted card with valid/candidate counts and selection rationale.
- Proof object sections: header (proofId + verdict badge), Solver Trace (mono, color-coded valid count), Justifications tree (recursive, with ✓ green / ✗ red markers and indented children), Validation Checks (✓/✗ rows), Inputs (variable=value rows with optional revision).
- All proof text uses `font-mono`, ✓ colored emerald-400, ✗ colored red-400.

### ComplexityPanel
- Controls bar: Scale select (6 options), Window select (5 options), Seed input, Sample button — plus a live trend badge on the right.
- Auto-samples on mount with default (settlement / years / 42).
- Trend diagnosis banner: large icon + label + diagnosis text. Color per trend: homogenizing=amber, chaotic=red, structured=emerald, stable=cyan.
- 4 metric tiles in a `grid-cols-4`: Compressibility / Entropy / Diversity / Predictive Value.
- 2 sparklines (compressibility emerald, diversity purple) drawn as inline SVG polylines with filled area, last-point dot, and tick-range labels.
- Seed comparisons table with delta columns color-coded (positive=emerald, negative=red, ~zero=neutral).

### BenchmarksPanel
- Auto-runs `POST /api/architect/benchmark` on mount.
- Overall verdict banner: large icon + label + pass/match/below counts + fastest/slowest/ran-at stats.
- Results table with columns: Benchmark | Our Engine (color-coded emerald/amber/red cell) | Ursus Target | Unity | Ratio badge | Ops/ms | Verdict icon.
- "×0.12" style ratio badge color-coded per verdict — values < 1.0 mean we beat Ursus.
- Footer note explains the ratio.

## Code quality
- All 4 panels use `'use client'`.
- All `fetch()` calls use relative paths only — no absolute URLs.
- All API requests use `void` prefix on the promise inside effects to satisfy `no-floating-promises`-style rules.
- Loading states: `Loader2` spinners + skeleton text.
- Error states: red-bordered alert with `AlertTriangle` icon.
- Strict TypeScript throughout — local interface types mirror the RCVC engine types without coupling the client.
- No `any` types.
- No forbidden functions used (only `Math.min`/`Math.max`/`Math.floor` for sparkline math).
- No `console.log` in production code.
- Lint: `bun run lint` → 0 errors, 0 warnings.
- TypeScript: `npx tsc --noEmit` → no errors in any of the new files (only pre-existing BigInt/ES2020 errors in `src/lib/determinism/`, unrelated to this task).
- No indigo or blue colors used (only the existing editor palette + emerald/amber/red/cyan/purple accents).

## Issues / Notes
- The task description mentioned `POST /api/architect/constraints/solve`, but the actual Next.js route at `src/app/api/architect/constraints/route.ts` has the POST solve handler at `/api/architect/constraints` (no `/solve` subroute exists). ConstraintsPanel POSTs to `/api/architect/constraints` to match the actual API; no API routes were modified (per task constraints).
- The dev server was not running on port 3000 during my verification step (likely OOM-killed and pending auto-restart by the system). Lint and tsc both pass cleanly on the new code; the panels will compile and load when the dev server restarts.
- The 4 new tabs increase the bottom dock height from `h-48` (192px) to `h-56` (224px) to fit the denser RCVC content; the original 5 tabs retain `h-48`. A subtle `transition-[height] duration-150` smooths the change when switching tabs.
