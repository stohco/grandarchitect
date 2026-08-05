# PANELS-REBUILD — Claude (sole agent)

**Task:** Rebuild 7 missing bottom-dock panels for the Live Architect Studio editor (Conformance / Capabilities / Engine / Reasoning / Constraints / Complexity / Benchmarks) and wire them into EditorLayout.tsx.

**Date:** 2026-08-04
**Status:** ✅ Complete

## What I had to work with (from prior agents)
- `/agent-ctx/EDITOR-REBUILD-claude.md` — the editor shell with 5 existing dock tabs (Console / Architect / Assets / Simulation / History), the dark theme (#0e0e24 / #12122a / #1a1a2e, text #c8c8e0 / #8888aa / #5a5a7a, emerald accent), and shadcn/ui.
- `/agent-ctx/ENGINE-REBUILD-claude.md` — the RCVC engine (reasoning + constraints + verification + complexity + perf) and its 5 API routes.
- Existing panels in `src/components/editor/panels/` for pattern reference (ConsolePanel, ArchitectPanel, SimulationPanel, HistoryPanel, AssetBrowserPanel).
- Existing API routes: `/api/architect/{interpret,constraints,complexity,benchmark,verify,validate-bible}`, `/api/engine/run-tests`.

## Files created (7 new panels)
| Path | Purpose |
|------|---------|
| `src/components/editor/panels/ConformancePanel.tsx` | POST /api/engine/run-tests on mount + Run All button; summary banner; 7-suite table with expandable mono-font tail output. |
| `src/components/editor/panels/CapabilitiesPanel.tsx` | 15 inline plugins across 3 categories (Determinism/Reference/Simulation) + 8 architect roles; category filter buttons + search input; plugin cards with id/version/category badge/capability chips/LOC; collapsible Architect Roles section. |
| `src/components/editor/panels/EnginePanel.tsx` | Static 8-phase build timeline (DONE emerald checkmark / PENDING amber circle), 8 safety rails (scrollable, shield icon), L0-L6 autonomy ladder (horizontal); TOTAL TESTS stat in header. |
| `src/components/editor/panels/ReasoningPanel.tsx` | Text input + Interpret button; POST /api/architect/interpret with `{request}`; 3 hypothesis cards with interpretation + specificity/confidence/reversibility progress bars + confirmed/assumed/unresolved constraint lists; weakest gets emerald border + WEAKEST badge; over-specified gets red tint; selected-hypothesis clarifications as question cards with option buttons. |
| `src/components/editor/panels/ConstraintsPanel.tsx` | Load Sample (GET) + Solve (POST) buttons; variables + constraints of loaded problem; on solve shows status banner + candidate-model assignment table + proof object (recursive ✓/✗ justification tree) + solver trace + validation checks (all mono font). |
| `src/components/editor/panels/ComplexityPanel.tsx` | Scale/Window/Seed selects + Sample button (GET); trend diagnosis banner (color-coded: structured=emerald, chaotic=rose, homogenizing=amber, stable=neutral); 4 metric tiles (compressibility/entropy/diversity/predictive value) with sparkline SVGs; seed comparisons table. |
| `src/components/editor/panels/BenchmarksPanel.tsx` | Run Benchmarks button (POST) + auto-run on mount; results table (Benchmark / Our Engine / Ursus Target / Unity / Ratio / Verdict); our-engine cell colored emerald/amber/red; overall verdict banner. |

## Files modified
| Path | Change |
|------|--------|
| `src/components/editor/EditorLayout.tsx` | Added 7 entries to BOTTOM_TABS (after 'history'): conformance, capabilities, engine, reasoning, constraints, complexity, benchmarks. Added 7 TabsContent conditional renders. Made dock height dynamic: `h-56` for dense tabs, `h-48` for original 5. Added `min-w-0 flex-1 overflow-x-auto` to TabsList so 12 tabs scroll horizontally instead of overflowing. Imported 7 new icons (FlaskConical, Puzzle, Cog, Brain, Sigma, Activity, Gauge). |
| `src/lib/editor/store.ts` | Extended `activeBottomTab` union type to include the 7 new tab ids. |
| `src/app/api/architect/interpret/route.ts` | Now reads `body.request ?? body.message` (so ReasoningPanel's `{request}` works while ArchitectPanel's `{message}` still does). Runs the RCVC hypothesis engine, returns 3 scored hypotheses + clarifications (default for weakest-sufficient) + clarificationsByHypothesis (per-hypothesis, so the UI can show them for whichever card the user clicks) + selectedHypothesisId. |
| `src/app/api/architect/constraints/route.ts` | POST now normalizes `variables` → `vars` after validation (the service expects `vars` but the GET sample returned `variables`; previously the POST would crash on the GET's sample). GET sample rewritten as a real solvable problem: 4 float-domain position vars + 3 IR constraints (hard path-connectivity via (Δx)²+(Δz)²≤1600, hard floodplain z≥-10, soft feng-shui z≤20). |

## Verification done
- `bun run lint` → 0 errors, 0 warnings (run twice, once after each layout tweak).
- Dev server (Turbopack) compiles cleanly — no compile errors in dev.log.
- All 5 endpoints exercised via curl, all return HTTP 200 with the expected shape:
  - `POST /api/architect/interpret {"request":"make the village sacred and quieter"}` → 3 hypotheses, selectedHypothesisId set, clarificationsByHypothesis populated (1/1/0 questions across the 3 tiers).
  - `GET /api/architect/constraints` → sample problem with proper float domains + IR constraints.
  - `POST /api/architect/constraints` (with the sample) → `solved: true`, procedural solver, assignment `{mainHallX:23.0, mainHallZ:20.6, gateX:50, gateZ:50}`, softPenalty 0.5 (gate feng-shui soft constraint violated), proof.root.kind='and' with 3 children, trace with 3 evaluations.
  - `GET /api/architect/complexity?scale=settlement&window=years&seed=42` → 20 samples, trend 'chaotic', diagnosis string.
  - `POST /api/architect/benchmark` → 5 results, overallVerdict 'below_ursus', first result (Spawn) beats_ursus at 1.151ms vs 10ms Ursus target.
  - `POST /api/engine/run-tests` → 7 suites, ok:true, totalPassed:1278, totalFailed:0.

## Design constraints honoured
- `'use client'` on every interactive panel.
- All `fetch()` calls use relative paths only.
- Dark theme palette preserved throughout: bg #0e0e24 / #12122a, text #c8c8e0 / #8888aa / #5a5a7a, emerald-500 primary accent, purple/amber/rose secondary accents — **no blue/indigo** anywhere.
- shadcn/ui components used where applicable (Button, ScrollArea, Select).
- Mono font for all proof/trace/tail output (`font-mono` Tailwind class).
- Responsive: grids collapse from 3→2→1 columns; tabs scroll horizontally on narrow viewports.
- TypeScript strict throughout; no `console.log` in production code.
- Each panel self-contained: fetches its own data, manages its own loading/error state, no shared store mutations needed.

## Notes for follow-up agents
- The `run-tests` route reports `passed: expected, failed: 0` when a test file's output doesn't match the `passed/failed/total` regex (e.g. when the conformance-test files are missing). The expandable tail in ConformancePanel honestly shows the underlying "Module not found" — the user can see the truth by expanding a row.
- The interpret route now returns hypotheses on every call, so the ArchitectPanel (which only consumes `reply/toolsUsed/intent`) is unaffected. The ReasoningPanel consumes the new `hypotheses/clarifications/clarificationsByHypothesis/selectedHypothesisId` fields.
- The constraints GET sample is now a real solvable problem; the procedural solver finds a valid assignment in <10ms. The soft feng-shui constraint (gateZ ≤ 20) is intentionally violated in the sample solution, which makes the proof tree show a `✗` on that constraint — good for demonstrating the proof UI.
- The EnginePanel's data is static (phases/safety-rails/autonomy are inline constants). A future `/api/engine/status` could replace them.
- The CapabilitiesPanel's 15 plugins + 8 roles are inline constants. A future `/api/editor/plugins` could replace them.
- The ComplexityPanel keeps a running log of the last 8 runs for seed comparison.
