# ART DIRECTION — extracted from the 8 reference images (2026-08-10)

Authoritative visual targets extracted from `references/art/*.png`. The written
directives (style bible + master directive) are canonical; this file is the
palette/design EXTRACTION from the images, machine-readable.

## Master palette (the world is built from these)

| Role | Hex | Use |
|---|---|---|
| Sky top / clear | #B9CEDD → #DDE5EB | day sky gradient zenith→horizon |
| Mist / atmosphere | #B8C5D0 | distant haze, atmospheric perspective |
| Grass / moss green | #5E6C54, #4B5846, #3B4D30 | terrain, pine/forest |
| Soft grass | #787D6D, #8B9B7B | meadow, valley floor |
| Rock / cliff cool grey | #6D6A64, #4A453F, #9C9890 | cliffs, stone |
| Deep stone shadow | #2D2A26 | crevices, shadow side |
| Earth / clay path | #A39886 | beaten paths, village square |
| Architecture timber | #2D2824, #7A6652 | dark wood frames |
| Roof slate | #4A5565 | ceramic tile roofs |
| Stucco / plaster wall | #DEDAD3, #F0EAD6 | house walls |
| Gold / bronze trim | #C5A574, #B89550, #D4AF37 | accents, ornaments |
| Charcoal ink | #2D2926, #1A1A1A | deep shadows, hair |
| White robe | #F2F2F2, #D9D9D9 | cultivator robe |
| Crimson accent | #8C1A1A, #A83228 | sash, lantern, seal |
| Skin | #E6C2A8 | cultivator skin |
| Spirit cyan glow | #D8F2F7, #64A3B4 | qi, crystals, divine sense |
| Water | #9DB1C0, #2A5A70 | rivers, lakes |

## Character (hero + villagers)
- 1.80 m cultivator, 7.75 heads, athletic heroic (NOT bodybuilder)
- Triadic: black/white robes + crimson sash + gold trim
- Long top-knotted hair, back-mounted jian (straight sword), ornate guard
- Villagers: role-colored robes (elder earth-brown, farmer straw, healer
  blue-grey, smith soot-black, youth bright)

## Architecture (village + sect)
- Post-and-lintel timber frame + stucco/plaster infill panels
- Curved eaves, upturned corners, dark slate tile roofs
- Raised stone plinths; buildings integrate INTO terrain (flatten foundation)
- Doorways ≥ 2.2 m; stairs 0.16 m riser / 0.30 m tread
- Interiors: bookcases, storage, floor lanterns, kang, low tables
- Lanterns = navigation + social light

## Terrain
- Macro: sacred peaks, terraced hills, cliffs, canyons, riverbanks
- Micro: pine/bamboo, cave mouths, plateaus, fields, courtyards, streams
- Walkable 0–35°, caution 35–50°, non-walkable >50°
- Rock: vertical striations, moss patches; soft eroded tops on karst peaks

## Materials language
- Painterly: hand-painted albedo, brushwork, soft edge wear (micro-bevel with
  lighter trim), dirt in crevices, gradient vertex coloring (dark base →
  sun-bleached tops)
- No hard edges, no tiling noise, no tiny detail geometry

## Lighting
- Soft diffused day (morning/afternoon long shadows), volumetric haze,
  deep atmospheric perspective, god rays through mist
- Cascaded shadows near player; baked elsewhere
- "Grounded & Magical": spiritual elements glow softly, affecting surroundings

## UI (from the UI/UX sheet)
- Jade #4A8C8E, bronze #A88E64, spirit-blue #64A3B4 on dark #16191C
- Text #E0D8C8, danger #8C3A36
- Low clutter, contextual, elegant typography, readable at motion

## Current-game gaps vs this direction
1. Sky: use the #B9CEDD→#DDE5EB gradient (current is too dark at zenith)
2. Grass: use #5E6C54/#4B5846 (current #5a8a4a too bright/desaturated)
3. Rock: #6D6A64 family (current #8b8f98 too blue)
4. Timber: #7A6652 (current #5a3a22 too dark)
5. Roofs: #4A5565 slate (current thatch #9a7a3a — change village roofs to slate)
6. Walls: #DEDAD3 stucco (current earth #8a6a42 — change to plaster panels)
7. Character robe: #F2F2F2 white + crimson (current cream #f2ead8 close)
