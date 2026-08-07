# RAPIER-EMBODIED-PLAYTEST

**User outcome:** Pressing Play (toolbar button or `P`) in the Studio drops you
into a real embodied character — WASD movement, sprint (Shift), grounded jump
(Space), right-drag look, real collision with the village (ground + every
building, well, shrine), Esc returns to the editor. No more walking through
buildings.

**In scope:**
- Mount the authoritative Rapier `PlaytestCharacter` in the viewport; delete
  the physics-free `PlaytestController`.
- PhysicsRuntime hardening: `resetWorld()` (idempotent re-entry), slope from
  the ground contact normal (0.19.3 has no `computedSlopeAngle`), spawn
  selection (never inside a building), subscription-free playtest hot path.
- Build-enabling fixes required by acceptance: terrain/world-store route
  migration off the removed voxel-DAG API, cross-platform `cp -r`
  replacement, the 188 pre-existing TypeScript errors, tsconfig scope for
  test/diagnostic files, orphaned-panel removals.
- Browser evidence harnesses under `evidence/rapier-playtest/`.

**Out of scope:** terrain heightfield (no heightmap in the settlement model
yet — flat ground collider matches the rendered flat ground; the runtime API
`addTerrainHeightfield` is ready), Rapier ≥ 0.20 upgrade, formal
failure-injection suite (WASM-break dynamic test), engine-runtime command-path
ownership of physics, action-registry overhaul, world persistence.

**Acceptance (all proven on the final build):** see EVIDENCE.json.
