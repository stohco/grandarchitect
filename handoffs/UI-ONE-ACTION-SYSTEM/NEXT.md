# NEXT — UI-ONE-ACTION-SYSTEM

## Known limitations (honest)

1. **Browser invocation of HTTP-backed actions** was NOT exercised in this
   worktree (no dev server run; the interrupted run's dev-smoke server was
   killed during cleanup). The browser path (`apiOrLocal` → real fetch)
   compiles and typechecks, and the Node/local path is conformance-proven,
   but the HTTP round-trip needs a browser/dev-server acceptance pass before
   claiming browser-proven for `world.generate`, terrain/asset/animation/
   simulation/architect actions. `playtest.toggle` and the global toggles
   are store transitions (no HTTP) and are safe.
2. **`world.generate` in browser** calls `store.generateWorld(seed)` →
   GET `/api/editor/world`; in Node it runs `ga-gen-settlement` directly.
   Both paths asserted only in Node. Dev-server smoke recommended.
3. **Palette invokes via POST /api/studio-ui with `worldLoaded: true`
   hardcoded** (studio-ui/route.ts:102-110) — it can invoke world actions
   before a world exists; the individual action availability still gates.
4. **`asset.exportGlb` / `asset.projectUVs` / `asset.placeInWorld`** require
   a pre-existing asset stack (honest `PRECONDITION` failure otherwise) —
   intended, but the palette surface shows no precondition hint.
5. **`global.selectAll`** is a no-op without a settlement (store guard) and
   returns completed — minor honesty gap; acceptable (selection of empty
   set is well-defined).
6. **`simulation.step` browser path** does not flip store `simRunning`;
   stepping is engine-side only. Matches previous behavior.
7. **ai:check exit 1 is PRE-EXISTING** (stale `.ai/project.manifest.json`
   provenance: 4d6f053 vs HEAD 064a14e). Run `bun run ai:build` at merge
   point if the gate must be green.
8. **typecheck scope** — per repo convention, conformance files execute
   under `bun run` (tsx-agnostic), not under `tsc --noEmit`. They are
   type-checked by bun's transpiler at runtime.

## Suggested next work

- Dev-server + browser smoke of the 5 parity actions via `/api/studio-ui`
  POST invoke (and the palette UI), capture console output + screenshots.
- Add a redo stack (engine runtime transaction journal + store) to unblock
  `global.redo`.
- Transport handlers for `generate_lod` / `generate_collision_proxy` in
  `/api/studio` to unblock those two disabled actions.
- Wire the remaining direct store calls (any still present in panels like
  ArchitectPanel) through `dispatchAction` for full single-path compliance.
