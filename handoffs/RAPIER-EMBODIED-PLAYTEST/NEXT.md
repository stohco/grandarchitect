# NEXT — RAPIER-EMBODIED-PLAYTEST

## One bounded next step

**Rapier 0.19.3 → 0.20+ upgrade on `slice/rapier-embodied-playtest`** (or a
fresh slice): verifies the KCC corner-clip limitation (~0.8 m, measured and
documented in EVIDENCE.json) against Rapier's newer character-controller
(which also restores `computedSlopeAngle`), re-runs the full acceptance
matrix (5 harnesses, 3 browsers, dev+prod), and promotes the maturity ladder
entry from WORKFLOW_PROVEN toward ACCEPTANCE_PASSED (which additionally needs
the formal failure-injection suite).

## Follow-ups (separate tasks)
1. Formal failure-injection suite: dynamic WASM-break test (serve a broken
   rapier wasm → assert the DOM HUD error state + no crash), rapid
   Play/Stop × 25 with collider/body counts, tab-suspension resume.
2. Terrain heightfield: add a heightmap source to the settlement model
   (e.g., a per-cell height field from the world API) → use
   `addTerrainHeightfield` so collision matches real terrain.
3. Migrate the 5 dead frontier test files (`*test.ts`, `spawn-diagnostic.ts`)
   to the current `TerrainPipeline` API and re-include them in the app
   typecheck scope.
4. Move physics ownership under the engine-runtime command path
   (`executeCommand` / transactions) per the architecture spec.
5. One-action-system: wire the toolbar/playtest toggle through the UI Action
   Registry (`src/lib/studio-ui/action-registry.ts`) so buttons, palette,
   shortcuts, and Architect discovery resolve to the same action.
