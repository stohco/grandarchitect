# ASSET PIPELINE — from description to playable stylized asset
#
# Status: authoritative engineering directive (2026-08-11)
# Sources: Xianxia_Asset_Factory_Style_Bible.md, ART_DIRECTION.md,
#          Xianxia_World_Fabric_Asset_Factory_Master_Directive_v2.md,
#          ASSET_PIPELINE_RESEARCH.md (Blender/glTF-Transform/three.js),
#          corpus-extension (the xianxia canon the assets must evoke).
#
# The pipeline has six gates. EVERY asset passes all six before it enters
# the playable scene — this is how the planet gets populated meticulously,
# one lawful stylized thing at a time.

# ---------------------------------------------------------------------------
# GATE 1 — DESCRIBE (natural language)
# ---------------------------------------------------------------------------
# Write the asset as a paragraph: what it is, where it lives, what it does
# in the world, its materials, its silhouette at 50 m. It must name its
# CAUSE (why it exists here) — the law-checker enforces grounding and
# semantics, and every placed asset carries its cause into the world.
#
# Example (the first asset through the pipeline):
#   THE SACRED PINE — a wind-bent pine at the village shrine, the spirit
#   node where the valley's qi pools. Twisted dark-timber trunk with a
#   root flare, layered flattened canopy plates in moss green with a faint
#   jade glow at dusk, needles like ink strokes. It exists because the
#   shrine was built at the node — the tree marks the spot the villagers
#   would never cut.

# ---------------------------------------------------------------------------
# GATE 2 — CONCEPT (visual verification BEFORE modeling)
# ---------------------------------------------------------------------------
# The description is rendered/checked by the vision model against the art
# bible: silhouette at gameplay distance, material language, xianxia
# grammar. No modeling until the concept passes.

# ---------------------------------------------------------------------------
# GATE 3 — BUILD (deterministic Blender)
# ---------------------------------------------------------------------------
# tools/blender/build_asset.py — headless Blender 4.2, seeded and
# deterministic: same seed -> same asset, every run. Materials are the art
# bible palette (linear). One asset per module, no hidden state.

# ---------------------------------------------------------------------------
# GATE 4 — ITERATE (evidence loop)
# ---------------------------------------------------------------------------
# The exported GLB is rendered in the game and inspected by the vision
# model against the concept + bible; notes go back into the builder until
# the asset passes (silhouette, materials, scale, grounding).

# ---------------------------------------------------------------------------
# GATE 5 — IMPORT (runtime + editor + law)
# ---------------------------------------------------------------------------
# src/engine/game/assets/gltf-assets.ts loads the GLB, registers it as a
# selectable component (movable/scalable in edit mode), and the
# law-checker validates it: grounded (root on the terrain), sane bounds,
# cause recorded. Placement is authored data, not decoration.

# ---------------------------------------------------------------------------
# GATE 6 — SHIP (playable + conformance)
# ---------------------------------------------------------------------------
# The asset is placed in the world, passes the world law-check, and the
# pipeline conformance asserts the GLB loads, the geometry is valid, and
# the placement obeys the laws. Evidence: a fixed-view screenshot.

# ---------------------------------------------------------------------------
# THE RULE
# ---------------------------------------------------------------------------
# The planet gets populated one GATE-6 asset at a time. Every asset is
# describable, inspectable, lawful, and editable — the world grows
# meticulously, and the director's trailer films it all.
