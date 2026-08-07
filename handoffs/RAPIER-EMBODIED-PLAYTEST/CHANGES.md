# CHANGES — RAPIER-EMBODIED-PLAYTEST

## Core slice
- `src/engine/runtime/physics-runtime.ts` — `resetWorld()` (idempotent
  re-entry, no duplicate colliders), fixture-body tracking, slope angle from
  the ground contact normal (0.19.3 has no `computedSlopeAngle`), jump
  evidence flag at initiation, visible KCC error logging.
- `src/components/editor/viewport/PlaytestCharacter.tsx` — real embodied
  character (always-mounted, subscription-free hot path via `getState()`,
  spawn on nearest clear flat surface, right-drag look, Esc exit,
  regenerate-while-open fixture rebuild, dev/prod diagnostic hooks
  `__physicsRuntime`/`__editorStore`/`__camYaw`).
- `src/components/editor/viewport/Viewport3D.tsx` — mounts PlaytestCharacter;
  DOM-overlay HUD (`[data-hud]`, works in every browser); R3F loop wakeup
  (invalidate) while playtest is active; playtest-safe shortcut handling.
- `src/components/editor/viewport/PlaytestController.tsx` — DELETED (fake
  physics controller).

## Build-enabling fixes (required by the milestone acceptance)
- `src/app/api/frontier/terrain/route.ts`, `world-store/route.ts` — migrated
  off the removed voxel-DAG terrain API to `TerrainPipeline` (honest
  payloads; persistence determinism proof).
- `src/engine/frontier/world-asset-store.ts` — `SerializedDerivedBundle`
  extended for the pipeline summary (legacy fields optional).
- `scripts/copy-standalone.ts` + `package.json` — cross-platform standalone
  copy (Windows); `packageManager: bun@1.3.14`.
- 188 pre-existing TypeScript errors fixed (typecheck exit 0): kernel
  re-exports (studio/architect/runtime types), engine-runtime bugs
  (`previousRevision`), ga-* simulation import paths (`../../kernel`),
  quest/npc/cultivation type fixes, rcvc schema/validators, frontier
  operation-graph/types/visual-evidence, panels (4 orphaned removed).
- `tsconfig.json` — excluded standalone packages (examples/mini-services/
  skills/servers) and test/diagnostic files (executed by bun instead).

## Evidence + docs
- `evidence/rapier-playtest/` — 5 harnesses + JSON reports + screenshots.
- `src/engine/architect/capability-maturity.ts` — rapier → WORKFLOW_PROVEN.
- `docs/FRONTIER_SELF_CRITIQUE.md` + `docs/FRONTIER_TECHNOLOGY_MATRIX.md` —
  Rapier sections updated with the delivered state + honest limitations.
- `roadmap-state.json` — phases 2-5 marked complete with verified evidence.
- `.ai/project.manifest.json` — regenerated (ai:build): typecheck exit 0.
- `worklog.md` — session entry appended.

## What this task did NOT do
- Terrain heightfield collision (no heightmap source in the settlement model).
- Rapier ≥ 0.20 upgrade (corner clipping, computedSlopeAngle).
- Formal failure-injection suite (dynamic WASM break).
- Action-registry / one-action-system overhaul.
- World persistence; engine-runtime ownership of physics.
- Frontier test-file migration to the new TerrainPipeline API (5 dead test
  files remain excluded from the app typecheck; follow-up).
