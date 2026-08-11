# GRAND ARCHITECT — SYNTHESIS v2 (CORRECTED SCOPE)
## The xianxia 3D sandbox RPG multiverse — full scope from all references

Date: 2026-08-10. Sources: all 8 reference PNGs (reviewed by vision),
Xianxia_Asset_Factory_Style_Bible.md (full), Xianxia_World_Fabric_Asset_Factory_
Master_Directive_v2.md (full, §0–§34), Asset Factory Manifest yaml, the game
constitution (xianxia scape.txt), Frontier Maturity Directive, Terrain Graph
Directive, and the live suzaku-frontier codebase.

---

## THE REAL SCOPE (not a mini game)

A **xianxia 3D sandbox RPG multiverse** — a persistent, destructible, simulated
cultivation planet (Planet Suzaku) in the Er Gen multiverse. Interactive
gameplay exceeds No Mortal Space / Oriental Immortal / Spirit Sect. Everything
built in code + three.js, painterly, readable, systems-deep.

### The production contract (from the directive — what "done" means)
- **World Fabric runtime path**: every change flows Authoritative Revision →
  Derived Artifacts (render/collision/nav/water/vegetation) → atomic activation.
  No debug-only direct insertion. Terrain edits: watertight, no cracks, atomic
  visible+collision, material-preserving cut faces, debris, realm thresholds,
  affected-cell-only invalidation.
- **Asset Gauntlet**: every asset survives 10 gates + adversarial review
  (brief → silhouette → blockout → topology → UV → texturing → rig → anim →
  LOD → collision/nav → integration → QA). Approved only with evidence.
- **Scale**: meters everywhere. 1.82 m cultivator, 0.5 m snap grid, streaming
  tiers 0–4 (interaction → landmarks → simulation-only), LOD0-3 + HLOD.
- **Performance**: 60 FPS target on the declared hardware class; budgets are
  profile classes, never excuses to remove simulation.

### The content universe (from manifest + directive)
- **24 structure kits**: mortal cottage, teahouse/inn, apothecary, blacksmith
  workshop, market/auction, shrine, town wall/gate/bridge, sect gate,
  dormitories, scripture pavilion, alchemy hall, refining hall, formation
  tower, beast pen/spirit garden, elder residence, ancestor sanctuary, cliff
  cave abode, secret-realm ruin, immortal palace, floating island complex,
  ocean sect harbor, underwater ruin, star-travel platform.
- **8 biomes** (each a full package: materials/rock/trees/plants/particles/
  water/sky/creatures/structures/loot/destruction):
  1. Mortal River Valley (current village)
  2. Cloud Immortal Peak
  3. Ancient Sword Scar
  4. Alchemy Volcanic Basin
  5. Ghost Marsh
  6. Star Desert
  7. Spirit Ocean Archipelago
  8. Frozen Tribulation Plateau
- **Creature factory**: rabbit→world-beast scale ladder; each creature answers
  anatomy/silhouette/cultivation-trait/attack-origin/harvest/movement/lifecycle.
- **VFX language**: sword intent (sharp arcs), divine sense (subtle spatial
  distortion), qi (flowing ribbons), formations (geometric world-space lines),
  tribulation (volumetric clouds + branching lightning + terrain scorch).
- **UI**: 13 HUD elements (player status, quest tracker, compass, minimap,
  target status, technique quickbar 6–8, context actions, buffs, notification
  feed, crosshair, damage feedback, world prompt) at 1920×1080, 24 px safe area,
  4.5:1 contrast, 80–150% scale, color-blind-safe, technique wheel (12
  categories, sub-wheels, slow-time), full inventory with equipment paper-doll
  + 8 accessory slots + sword-collection tab + comparison + drag/drop.
- **Traversal**: walk 2–3 m/s → sprint 6–9 → leap 10–25 → sword flight 20–60 →
  free flight 30–120+ m/s → high-realm regional traversal (predictive
  streaming + far-field landmarks + encounter-safe transitions).

---

## WHAT EXISTS NOW (verified)

Terrain (watertight heightfield, sea level 50, oceans, rivers, semantic
landforms, far LOD, collision 3183 boxes) · village (12 houses, furnished,
doors, 2 locked + 1 formation) · hero (rigged, animated, feet planted) ·
combat (120 techniques, lock-on, beasts, boss, siphon, divine sense) ·
cultivation (20 realms + seal) · wiki (76 pages) · items (50+) · assets
schema (110 geoNode graphs) · English HUD · persistence · 26/26 tests.

---

## THE GAPS (honest, prioritized)

**CRITICAL (core sandbox broken):**
1. **Destructible terrain visual bug**: carving changes collision (−5.31 m)
   but the visible mesh stays (58.85) — an invisible hole. Fix in progress
   (_editedHeight reads density; heightfield must reflect edits).

**STRUCTURAL (next):**
2. **Biome packages**: only the village biome exists. Need the other 7
   biomes as full packages (the planet is 7/8 empty).
3. **Structure kits**: 24 kits specified; we have 1 (cottage variants).
   Teahouse, apothecary, blacksmith, market, shrine, gate, sect buildings…
4. **Creature factory**: spirit beasts with the 7-question design; we have
   wolves/boars. Need the creature scale ladder + bosses + harvesting.
5. **UI**: 13 HUD elements specified; we have ~6 (status, quickbar, boss bar,
   minimap-ish, log, quest-ish). Need compass, minimap real, context actions,
   technique wheel, full inventory paper-doll.
6. **Traversal ladder**: sword flight exists (gated) but needs the speed
   ladder + predictive streaming for flight.
7. **VFX language**: sword intent/qi/formations/divine sense per the spec.
8. **NPC cognition**: schedules only → beliefs/memory/relationships/social
   practices (the symbolic fabric).
9. **Economy/factions/emergent quests**: not built.
10. **World Fabric runtime**: authoritative-revision → derived-artifact →
    atomic-activation pipeline not implemented (direct insertion today).

**PROCESS:**
11. **Asset Gauntlet**: need the 10-gate loop + evidence capture + adversarial
    review for every asset family as it's built.

---

## NEXT ACTIONS (in order)

1. **Fix destructible terrain visual** (in progress — the carve must show).
2. **Implement the World Fabric revision pipeline** (authoritative edits →
   dirty cells → derived artifacts → atomic swap) — everything else depends
   on it being real.
3. **Build the biome packages** one at a time, starting with Cloud Immortal
   Peak (the sect destination) and the coastline/port for the Spirit Ocean.
4. **Structure kit grammar**: a modular kit system (foundation/column/beam/
   wall/roof modules) so the 24 kits can be composed from parts.
5. **UI to spec**: compass, minimap, context actions, technique wheel,
   inventory paper-doll.
6. **Creature factory + traversal ladder**.
7. **NPC cognition fabric** (beliefs → memory → social practices).
8. **Economy/factions/quests** once the world systems exist.

This is a years-long AAA production scope. The honest sequence is: fix the
destructible core → make the World Fabric pipeline real → build the biome +
kit grammar → then layer simulation and content on a correct foundation.
