# IMAGE DIRECTIVES — the poster instructions, captured and binding
#
# Status: authoritative (2026-08-12). Source: C:\Users\st3v3\Downloads\realdeal\
# (8 infographic posters, transcribed by the vision examiner). The .md/.yaml
# files in that folder are byte-identical to docs/game-art-bibles/ — the
# POSTERS carry the additional instructions below. Where a poster conflicts
# with a bible, the poster wins and the reconciliation is recorded here.

## Source map
- I1: a_high_detail_infographic_style_guide_poster_for_1.png (Asset Factory Blueprint v1.0)
- I2: a_large_infographic_concept_art_style_design_doc_3_batch_2.png (Environment Factory v1.0)
- I3: image-gen-1.png (Master World Fabric / Asset Factory Blueprint)
- I4: image-gen-2.png (Modular Character Factory)
- I5: image-gen-3.png (Smooth Voxel Terrain Factory)
- I6: image-gen-4.png (Hybrid Structures Factory)
- I7: image-gen-5.png (UI/UX System Guide)
- I8: image-gen-6.png (Scale / Streaming / Optimization Guide)

## 1. THE ART DNA (I1, I3)
Painterly 3D render · hand-painted materials (no tiling repetition) ·
stylized silhouettes FIRST (readable in motion and at distance) · soft
edge wear · believable PBR · grounded + spiritual magic (cultivation
energy with restraint). Xianxia motifs: curved roofs with upturned eaves,
curved clouds, cranes, lotuses, Bagua/Taiji/I Ching where applicable.

## 2. CHARACTER RULES (I4) — binding for the gym work
- Hero standard height: 1.80 m, proportions consistent across ALL
  characters. RECONCILED: bible §3 male 1.82 m is within the ±8% band —
  keep 1.82 male; state 1.80 standard on variants.
- Base body = CANONICAL EQUIP BASE: complete body preserved, clothing
  added modularly, HIDE-MASK SYSTEM per slot. (We have named zones;
  bind zone IDs to slot IDs below.)
- One shared skeleton: identical bind pose/bone names, twist bones for
  shoulders/forearms/thighs/calves, secondary bones for cloth/hair.
- Pivot at pelvis, Y-up Z-forward. RECONCILED: runtime keeps the
  feet-origin root for grounding (bible §3); pelvis pivot applies when
  bones arrive.
- Slot map: HAIR, HEADWEAR, FACE, NECKLACE, INNER_GARMENT, OUTER_ROBE,
  SHOULDERS, CAPE/MANTLE, BRACERS, GLOVES, BELT, WAIST_ART_L/R,
  RING_L/R, MAIN_HAND, OFF_HAND, BACK_WEAPON, BACK_ACC_L/R,
  LOWER_ROBE_BACK/SIDES_L_R/FRONT, PANTS, BOOTS.
- NAMING (BINDING NOW): CHR_BaseBody_Male_A01, CHR_Underwear_*_A01,
  CHR_Robe_Outer_*_A01, CHR_Hair_*_A02, CHR_Headwear_Topknot_A01,
  CHR_Boots_Leather_A01, WPN_Sword_Jian_Lotus_A01, ITM_*. Our GLBs are
  renamed to match (see compliance table).
- Texture budgets: body 2K, head 2K, costumes 2K-4K, items 1K-2K
  (procedural materials: no change, recorded for the future texture pass).

## 3. TERRAIN RULES (I5, I2)
- SLOPE BANDS (binding): 0-35° walkable, 35-50° steep caution, 50+
  non-walkable. The heightfield must expose slope; conformance must pin
  the village/roads/paths ≤35°.
- MATERIAL FAMILIES with Hardness / Fracture / Qi Affinity (binding):
  soil, packed earth, granite, sacred stone, mossy rock, cliff sediment,
  cave stone, wet rock, riverbed, snow, spirit crystal ground. Our
  MATERIAL_COLORS map (0-4) extends into this table; the terrain-edit
  brush RESPECTS hardness.
- Terrain authoring stack: density field → material volumes → dual
  contouring → sculpt/carve/add → erosion → collision compile → nav
  compile. RECONCILED: the current planet is a HEIGHTFIELD (no
  overhangs). Overhangs/caves/arches are a PLANNED voxel upgrade; the
  directive is binding for that future module.
- Destruction loop (binding): debris spawn → dirty cells → recompile
  collision → update navigation. We have dirty-chunk mesh+collision
  rebuilds; DEBRIS SPAWN + DUST is a recorded gap.
- Material hardness rules: destruction and tools respect hardness.
- Seamless continuity at every resolution; no cracks; dirty-cell edits
  confined to cell bounds; LOD continuity; persistent edits.

## 4. STRUCTURE RULES (I6, I2)
- Hybrid structure logic: voxel mass for foundations/cliffs/excavation;
  modular mesh for roofs/eaves/frames/railings/doors/ornaments/cloth.
- Structural graph: terrain anchor → foundation platform → module nodes
  → prop attachments → nav/collision volumes.
- SNAP GRID: all modules on a 0.5 m / 1 m grid.
- HUMAN SCALE (binding): doors ≥2.2 m high (I1: doorway 2.40 m),
  paths ≥2.0 m wide, interior doors 120-150 cm, circulation 120-150 cm,
  ceiling 3.0-4.5 m. CONFORMANCE MUST PIN THIS.
- Stairs: rise 0.16-0.18 m, run 0.26-0.32 m, width ≥1.5 m.
- Damage states: Intact → Weathered → Battle-damaged → Partially
  collapsed → Destroyed footprint → Repair, with debris families and
  color-coded destructible zones + green repair anchors. (Planned —
  recorded.)
- Cloth/banners: wind zones + attach sockets.
- Naming: BLD_SectGate_A01, BLD_Hall_Main_A02, BLD_Pagoda_Tall_A01,
  BLD_Bridge_Stone_A01, BLD_Roof_Tile_Blue_A, BLD_Lantern_Hanging_A,
  TERR_Cliff_Granite_A, VXL_*, ENV_/PROP_/CHR_/VFX_ prefixes.

## 5. SCALE / STREAMING / OPTIMIZATION (I8, I1)
- Each scale step instantly readable and silhouette-clear at its target
  viewing distance (1.8 m cultivator … 300 m spirit vessel).
- Landmark design: value separation, atmospheric layering, landmark
  lighting, vertical landmarks above terrain clutter.
- Streaming tiers 0-4 (range-based render/animation/collision/simulation
  detail); transitions SEAMLESS (dithering, cross-fade, temporal
  loading); NEVER block the main thread; predictive streaming +
  graceful fallback.
- LOD integrity: silhouette, major forms, readable materials, scale cues
  preserved at every LOD step.
- Budgets: <1500 draw calls/area, <5M visible tris, <300 materials/area;
  LOD0 0-30 m, LOD1 30-80, LOD2 80-200, LOD3 200+; textures 2048 hero /
  1024 mid / 512 small; trim sheets; atlases; instancing & culling;
  shadow discipline (cascaded shadows, no dynamic shadows on small
  props); collision: simple convex proxies, never per-poly.

## 6. UI RULES (I7)
Clarity first · low clutter · contextual expansion · elegant typography
· restraint in color (jade, bronze, spirit-blue accents ONLY) · readable
in motion · keyboard & controller friendly.

## 7. THE WORLD FABRIC PIPELINE (I3)
Intent → Semantic World Graph → Template Library → Voxel/Scene Compiler
→ CommandBus (events/jobs) → World Repository (cells) → Dirty Cell
Recompile (async) → Atomic Bundle Activation (hot swap) → playable
result. (Our planet streaming + terrain-edit store is the current
realization; the CommandBus/atomic-activation pieces are the gap.)

## COMPLIANCE MATRIX (what the code does today)
| Directive | Status |
|---|---|
| 1.80/1.82 m character, 7.75 heads | DONE (7.79) |
| Hide-mask zones per slot | DONE (22 zones); slot-ID binding: NEXT |
| CHR_/BLD_/TERR_ naming | TODO — rename GLBs + PlacedAssetDef ids |
| Slope bands 0-35/35-50/50+ | TODO — expose slope + conformance |
| Material hardness/fracture/Qi table | TODO — extend MATERIAL_COLORS + brush |
| Doors ≥2.2 m, paths ≥2 m, stairs 0.16/0.30 | TODO — conformance pins |
| 0.5/1 m snap grid | TODO — editor snap |
| Damage states + repair anchors | PLANNED |
| Debris spawn on destruction | PLANNED |
| Overhangs/caves (voxel) | PLANNED |
| Streaming tiers + no main-thread blocking | PARTIAL (rings hitch — fix in flight) |
| UI jade/bronze/spirit-blue | PARTIAL (HUD exists; palette TODO) |
| <1500 draw calls, <5M tris | PARTIAL (no counter — add) |
