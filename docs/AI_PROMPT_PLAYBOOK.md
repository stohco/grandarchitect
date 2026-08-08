# AI Prompt Playbook — the Xianxia Multiverse

How to write generation prompts at the level of the best AI filmmaking
workflows today — adapted to THIS corpus, THIS art direction, THIS camera
language. Every prompt is a machine-auditable contract: it can only describe
canon, it must reference an art board, and its camera block must come from
the director script.

## 1. Prompt anatomy — the 8 blocks (the standard used by Veo/Sora/Runway-class workflows)

Viral-quality AI video prompts share the same skeleton. Ours adds two blocks
that are unique to this project: **Canon** and **Diegetic Diagnostics**.

```
1. SUBJECT   — who/what, identity, costume (from npc.* / set blueprint)
2. ACTION    — one clear action (Motion/Effect Grammar: one action per shot)
3. SETTING   — where, from set blueprint (structure/room/prop ids, scale)
4. CAMERA    — cut, lens mm, height, movement, duration (from director script)
5. LIGHTING  — motivation + time of day (from director script / boards)
6. ATMOSPHERE— fog/dust/smoke/particles (diegetic only)
7. STYLE     — art-board reference ("painterly 3D render, hand-painted materials")
8. NEGATIVE  — what the Oracle would reject (see §5)
+ CANON     — the rule this scene obeys (realm, law, scale)
+ DIAGNOSTIC — what the world is showing (flickering nodes, dimming stones...)
```

Order matters: subject first, then action, then setting; style last. Detail
density high but only canon-true detail (a harsh critic audits every token).

## 2. Xianxia vocabulary bank (from the concept reviews — diegetic, not generic)

| Concept | Prompt vocabulary (approved tokens) |
|---|---|
| Divine Sense | blue-tinted X-ray overlay; spirit-vein currents; ore and herb-cluster highlights; residue gradients; dead formation nodes |
| Spirit Veins | luminous blue-green currents under the terrain; node and spring densification; dimming when drained |
| Qi Sense | faint flowing qi currents; phase colors (river cool/yin/water, sun hot/yang/fire) |
| Formation | geometric qi-circuits with node/edge topology; rippling translucent barrier; flickering nodes; dimming spirit stones; spreading ripples on failure |
| Domain | bounded region where light bends to its rules; physics visibly defer; faint spatial boundary shimmer |
| Realm aura | station rank reads in aura pressure; higher realms = effortless motion, denser qi glow |
| Heart Demons | aura reads wrong; shadow-presence in the qi; disturbed countenance |
| Soul Anchor | condensed humanoid light-form; projection leaves the body still and dim |
| World-Law Pressure | shallow scars; absorbed blasts; suppressed flight; technique dissipation |
| Grotto-Heaven | folded space at the anchor; time bleed at boundaries |
| Traces | faint luminous glyph, decaying; readable only through qi sense |
| Spirit stones | translucent stones with inner light; quality in clarity/glow |
| Sect rank | vestment color/trim hierarchy; inner disciples carry better gear |
| Storage | items shimmer and collapse into talisman/ring; unfolding light on release |

Never: glowing wireframe HUD overlays (that is the Divine Sense MENU, not the
diegesis), neon, RGB accents, generic "magic" sparkles without a phase color.

## 3. Camera language (locked to the director script + scale board)

| Cut | Meaning | Lens | Use |
|---|---|---|---|
| extreme-wide / aerial | landscape, 5,000 m landmark readability | 24-35 mm | establishing, scale truth |
| wide | subject + context (person at 2-3 m/s walking pace) | 28-50 mm | scene setup |
| medium | action readable (gesture, bow depth) | 50-85 mm | dialogue/action |
| close | emotion (eyes, hands) | 85-100 mm | reaction |
| extreme-close / insert | proof (the coat on the peg, the license seal) | 100-135 mm | evidence |
| pov | subjective (eyeline match) | 50-85 mm | empathy |

Movement: static, dolly-in/out, track (speed = traversal speed: walk 2-3 m/s),
crane-down/up (scale reveal), push-in (tension). Continuity rules: 180° line,
eyeline matching, light continuity (sun stays on one side), one action per shot.

## 4. Style block (from the six art boards)

- Master board: "painterly 3D render, hand-painted materials, believable PBR;
  ethereal teals, soft blues, forest greens; gold/brass lantern accents;
  deep red sparingly; purple/magenta reserved for spiritual energy"
- Character board: "white outer robe with deep red lining, black inner layers,
  dark belt with gold accents; long black hair; 1.80 m hero scale"
- Terrain board: "karst peaks, layered cliffs, terraces & fields, waterfall
  basins, caves & arches, smooth transitions, sect foundations"
- Structures board: "voxel mass + modular mesh; weathered timber, rammed earth,
  thatch; damage states intact → destroyed"
- UI board (for UI/menus only): "cream/parchment, charcoal, burnished gold,
  jade-green and spirit-blue accents, clarity first, low clutter"
- Scale board: "correct 1.8 m-to-5,000 m relativity; sword flight 80-200+ m/s"

## 5. Negative block (what the Visual Accuracy Oracle would reject)

No Western/European armor or architecture; no neon/RGB; no cyberpunk;
no chromatic aberration; no lens flare; no floating glow orbs without a
diegetic source; no wrong-scale subjects (a 3 m doorway); no modern objects;
no inconsistent robes (locked character sheet); no animated-wireframe HUD in
the world; no double subjects (one action per shot); no invented characters
(canon names only).

## 6. Worked examples (Episode 1, generation-ready)

**Shot 1B — North Gate (dawn)**
> "Wide crane-down shot, 50 mm lens, camera descending from 12 m, 10 seconds.
> A weathered pine-and-stone village gate with lichen on its pillars, at
> dawn; the first warm band of light touches the beam while the road still
> lies in cool blue shadow; the main road recedes toward a village square
> with canvas market stalls. A single rooster sound, wind in the beam.
> Painterly 3D render, hand-painted materials, believable PBR; ethereal
> blues and gold; ancient-sacred weathering (moss, patina), restrained
> ornament. Village gate at 6 m — deliberately one-fifth sect-gate scale.
> No western architecture, no neon, no lens flare, no wrong-scale figures."

**Shot 1D — Widow Xu's loom**
> "Medium shot, 85 mm, static, 9 seconds. A white-haired widow in hemp
> clothes at a frame loom inside a dim single-room house; a single oil lamp
> lights her hands, the loom shadows climb the rammed-earth wall; behind her,
> out of focus, a boy's coat hangs on a peg. The loom stops; silence; the
> faintest low hum from underground, a bell struck far away. Painterly 3D
> render; warm-in-cold lighting; poverty reads in scale (the room barely
> admits the loom). No modern objects, no wireframe, no glow orbs, no
> invented family members."

**Shot 1M — POV toward the foothills**
> "POV over rooftops, 85 mm, static, 7 seconds. A village square seen from
> a compound gate; beyond the thatch roofs, hazy karst foothills rise in
> blue distance, one sacred peak at 800 m; a single bird crosses the sky;
> incense smoke from a stone stele curls in the foreground light. The low
> underground hum continues, in-world. Painterly 3D render; sacred-peak
> scale truth; landmark readability at 5 km. No HUD, no neon, no modern
> elements, no scale errors."

## 7. Consistency techniques (why the director script is your storyboard)

1. **Storyboard first**: the director script IS the multi-shot prompt; never
   generate scenes out of shot order.
2. **Locked character sheets**: one canonical description per npc (from the
   definition database); repeat it verbatim in every shot that character
   appears in.
3. **Locked lighting language**: same sun position, same fog character for
   consecutive shots.
4. **One action per shot** (Motion/Effect Grammar): the action block contains
   exactly one verb.
5. **Machine prompts**: `buildShotPrompt()` (src/lib/worldproduction/
   prompt-templates.ts) emits these prompts deterministically from the set +
   script — the Grand Architect and the human director get identical briefs.
