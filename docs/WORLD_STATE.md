# WORLD STATE — what is in the world, and how to look at it
#
# Status: living document (2026-08-12). Read this before touching the game.
# Boot: bun run scripts/game-dev.ts → http://localhost:5174/

## Controls
- WASD: walk (camera-relative — W is always away from the camera)
- Space: jump · Tab: edit mode (gizmos/terrain brush) · **V: free camera**
- Free camera: WASD move, left-drag look, Q/E down/up, Shift sprint,
  wheel speed, V or ESC to return — the god's eye for inspections/edits

## What the world IS (current)
- The planet: a deterministic heightfield (seed → identical world every
  run). Fine chunks (3 m cells, 165 m radius around the player) + two
  far-LOD rings (12 m cells to 900 m, 48 m to 2400 m) that now use the
  EXACT same palette as the fine chunks + height shading + distance haze
  (the old dim haze palette read as a flat green "veil" over the map).
- Wang Family Village at (256,-128): 12 houses (house-kit), well, gate,
  painted ground strips (square/road/fields/graveyard), the stream.
- The Village Stream: carved 2.8 m deep (was 11 m — a canyon with
  invisible water). Water is per-river: it fills the lowest point of each
  course to 1.2 m depth (village water at y≈58.1, banks ≈58.3 — a small
  wadeable stream you can see across). The blood river keeps its gorge.
- THE FAMILY SHRINE (祠): Blender GLB at (248,-128), door faces the
  square, incense smoke ribbon breathes, lantern glows (authored
  strength preserved, dusk-boosted). The sacred pine at its spirit node
  (244,-130) sways in the wind (height-growing bend) and glows jade.
- THE CHARACTER: the Blender-built villager (1.82 m, 7.75 heads, indigo
  robe, rope sash, topknot + pin, straw sandals) — the player wears it
  (placeholder capsule is gone) and all 12 villagers wear it with their
  role's robe tint; the rig walks (bob + lean + robe micro-sway, feet
  anchored to the terrain).

## The asset pipeline (docs/ASSET_PIPELINE.md — six gates)
describe → concept → Blender (tools/blender/build_asset.py, deterministic)
→ iterate → import (gltf-assets.ts: grounded, editable, law-checked) →
ship (game:assets-conformance). Assets: sacred_pine, family_shrine,
villager.

## Gates (all must stay green)
9 conformance suites (village 59, villagers 23, assets 33, validator 12,
editor 10, time 20, sky 14, director 10, game 19) + tsc + lint +
ai:check + frontier maturity 156.

## How to inspect (evidence harnesses)
- evidence/*.cjs files set window.__FREE_CAMERA = true, fly the camera,
  screenshot. The game exposes window.__game (player, planet, time,
  editor.registry, editor.fly, villagers, scene...).
- window.__game.editor.fly.flyTo(x,y,z,lx,ly,lz) — programmatic eye.
- The vision model misreads these stylized scenes at this fidelity; the
  pixel probes + geometry probes + registry probes are the evidence of
  record.

## Next
- More assets through the pipeline (props, trees, sect pieces)
- Character detail pass (eyes/face readability, walk cycle polish)
- Water collision/wading feel
