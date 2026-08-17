**1 of 4 — README.md**

# Nine Heavens Unbound — project handoff

Prepared for @soon, the project owner, on request: *"give me all the files as a handoff so i can continue the project elsewhere."*

**READ THE "WHAT THIS ARCHIVE IS NOT" SECTION FIRST.** This archive is an orientation package and file census. It is *not* a working source tree, and it would be dishonest to hand it to you as one. The route that does give you every file, byte-exact and live, is named at the bottom.

---

## 1. What the game is

Nine Heavens Unbound is a dense xianxia open-world sandbox ARPG built on the Tome engine (v5.2.26). It is large by any measure:

- **9 places** — `main` (the open world), `cave-network`, `spirit-vein-crust`, `world-heart`, plus pocket/secret-realm and deep-sea places.
- **~462+ scripts** (a floor — see MANIFEST.txt; the real count is nearer 760 files including the journal).
- **Spec ~12 MB at version 5444**, sitting at its 12 MB ceiling. A "diet" lane runs periodically to keep it under the cap; this matters when you plan edits.
- Multiplayer-capable engine, but the game runs under a **singleplayer law** (see `memory/game/singleplayer-law.md`, `singleplayer-verification.md`).

The world layer — every object, terrain heightmap, atmosphere, per-place config — lives **in the spec, not in script files**. Scripts are behaviour and data; the world is spec state.

---

## 2. Architecture in brief

### Manager / warden entities
Game-global systems do **not** live on the player. Each system is owned by a long-lived server entity — the `*-warden.js` and `*-director.js` scripts (`abode-warden`, `cache-warden`, `combat-warden`, `vein-warden`, `loot-warden`, `regard-warden`, `root-warden`, `tribulation-warden`, `perception-warden`, `ontology-warden`, `consequence-warden`, `beacon-warden`, `npc-pose-warden`, `cave-network-warden`, `sea-warden`, `situation-director`, `representation-director`, plus `world-registry.js`).

### The named event bus — and its contract file
Wardens talk to lanes over `api.emit(name, payload)` / `api.on(name, ...)`. **The contract for that bus is `scripts/lib/data/event-map.json`.** Every emit and every ear in the codebase gets a row there: `{ name, emitters[], listeners[], status?, note }`. `scripts/lib/event-map.js` exports `audit(api)` which reads it and reports:

- **ORPHAN** — emitters but no listeners (a feature that finished in its own file and does nothing in the game).
- **DEAF** — listeners but no emitters (an ear nothing reaches).
- `status: "pending"` — a declared hook for a system nobody has built yet. Known, not forgotten.
- `status: "retired"` — the emit was deleted as a duplicate.

Census recorded in the file (2026-08-16, across 220 scripts): **98 live names, 32 orphans.** If you add an emit or an ear, add your row. This file is the single most architecturally load-bearing document in the project — read it before you read any behaviour script.

> Do not confuse `lib/data/event-map.json` with `lib/data/events.json`. The latter is the world sim's weighted table of authored world events (sect wars, beast tides, auctions) that `world-registry.js` rolls against. The file itself carries a `_notEventsJson` note warning about exactly this.

### The player
The player is **not** one script. It is a **~33-script behaviour stack**, and **the order of that stack in the spec is load-bearing** — `player.js`, `camera.js`, `aim-look.js`, `combat.js`, `cultivation.js`, `flight.js`, `qinggong-step.js`, `inventory.js`, `hands.js`, `dig.js`, `gathering.js`, `unarmed.js`, `spirit-sense.js`, `dive-body.js`, `destiny-body.js`, `body-cultivation.js`, and the rest. Adding or reordering entries changes behaviour.

### UI
- `scripts/ui.js` is a **read-only painter**. It renders; it never mutates.
- Every button is a `sendAction(name, payload)`.
- Every one of those actions is handled in **`scripts/ui-actions.js`**, which is the only place UI intent turns into world change.
- Panel/widget content lives in `scripts/lib/ui-*.js` (`ui-hud`, `ui-panels`, `ui-pack`, `ui-wheel`, `ui-theme`, `ui-icons`, `ui-read`, `ui-record`, `ui-refine`, `ui-sigil`, `ui-bounty`, `ui-draft`, `ui-tournament`, `ui-material`, `ui-notice`).
- Any action read in `onInput` must also be declared in `inputs.actions`.

### One clock
**`scripts/lib/world-day.js` is the single clock.** Every lane that needs a day number, an hour, or a calendar date reads it. Do not start a second time source. See `memory/game/world-clock.md` and `world-clock-durability.md`.

### The notification lane — toasts are abolished
`lib/notify` → `lib/notice-lane` → `lib/ui-notice` is the **only** way to tell the player something. It fully replaces toasts; there is no toast system left. Tuning in `lib/data/notify.json` and `lib/data/notices.json`.

### The geometry-family pooling law
`lib/prop-pool.js`, `lib/herb-pool.js`, `lib/bamboo-pool.js` (and `lib/geo-pool.js`, `lib/derive-pool.js`) enforce: **one canonical `(params, seed)` pair per state.** Two props in the same visual state must resolve to the identical params+seed so the engine can share one derived mesh. Breaking this multiplies geometry cost and is the fastest way to lose the frame budget. See `memory/game/geometry-family-pooling.md` and `geometry-families.md`.

### Regions
- **`region-*.js` — one script per region.** Eight regions: bamboo-sea, blackwater-fen, cloudrend-ridge, cloudveil-valley, emberfall-barrens, hollowmoon-ravine, sea-of-fallen-stars, thunderscar-plateau.
- **`detail-<region>.js` — one behaviour per region, dispatching on `state.role`.** One script serves every detail prop in its region; the prop's `state.role` selects the branch. Do not add a script per prop.
- Region tuning is split: `lib/data/detail-<region>.json` and `lib/data/region-detail-<region>.json` (some regions also have a `-pieces.json`).

### Builders and effects — why static import scans lie
- **`scripts/gen/*` are procedural builders invoked by *path string***, not by `require`. 94 of them.
- **Effects attach via `api.spawnFx('scripts/effects/<name>.fx.js')` — also a path string.** 35 of them.

> **Consequence: a static import scan under-reports references. Never delete a script because an import scan says nothing references it.** This has bitten this project before.

### Database
`scripts/db.js` is **engine-invoked** — it runs the migration once per spec version. Persistent state rides `api.sql`. Known tables: `cultivation_saves`, `cultivation_events`, `world_registry`, `pack_saves`, `regard_saves`, `pack_ledger`, `abode_claims`, `abode_events`, `spirit_root_saves`, `root_events`, `village_ledger`, `cache_state`, `companion_contracts`, `companion_memory`, `loot_bundles`, `world_heart_seal`, `destiny_saves`, `destiny_events`.

### Mods
`scripts/mods/` holds 8 self-contained kits: `aaa-quality-kit` (look-cinema), `animacao-viva` (animation layers, pt-BR naming), `biped-rig`, `quadruped-rig` (procedural rigs + rig-kit), `companion-mind` (has its own `BOOT.md`), `mind-recipe` (NPC minds, lexicon, personalities), `gavi` (team panel, pt-BR), `stream-vault`.

### The journal — `memory/game/`
175 markdown notes. This is the project's institutional memory: canon documents (`canon-master`, `canon-architecture`, `canon-cosmology`, `canon-time`, `canon-ui`, `canon-style`, `canon-scale`, `canon-terrain`, plus their `-compliance` audits), per-region design notes, per-lane build records, and `index.md` — which leads with a **"# GONE"** section naming what was retired and must not come back. Start at `memory/game/index.md`, then `canon-architecture.md`, then `event-map.md`.

---

## 3. What this archive is NOT

Be precise about this, because a handoff that overstates itself is worse than a small honest one.

1. **It does not contain the project's source files.** The tooling available to the agent that built this archive can read project files only *into its own context* and re-type them out — there is no bulk copy path. At ~760 files averaging tens of KB (the bus contract `event-map.json` alone is ~145 very long lines), a byte-faithful copy was not achievable, and a **hand-retyped approximation of source is a corrupt copy** — it would look authoritative while silently differing from the real file. That risk was refused. What you get instead is the complete census in `MANIFEST.txt`, this architecture map, `HANDOFF-NOTES.md`, and `ASSETS.md`. One real source file is included verbatim — `scripts/lib/data/manifest.json` — because it is small enough to reproduce exactly.

2. **It does not contain the live spec's world layer.** Objects, terrain marks and heightmaps, atmosphere, per-place config, the player behaviour-stack order, camera, inputs and engine config all live in the spec. Export was attempted and **skipped**: the exec rail (`run_script`) returned `room_host_summon_failed` on every attempt across the session — an infrastructure fault in the room host, not a script error. Nothing was silently truncated; nothing world-layer was written at all.

3. **It does not contain SQL save rows.** Same rail, same failure. See the table list above for what exists.

4. **It does not contain binary CDN assets.** Every `/cdn/...` path in the scripts (see `ASSETS.md`) resolves against the live game's CDN. Textures, models, sfx, music and portraits are served from there and are not bundled.

---

## 4. The route that actually gives you everything

**Studio settings → "build with a coding agent."** That exposes the **Spawn API**, which gives live programmatic read/write access to every file in this project — all scripts, all `lib/data` tables, the journal, and the spec including the world layer — byte-exact, from outside the studio.

That is the correct mechanism for a handoff of this size, and it is the one to use to continue the project elsewhere. Point your new toolchain at it and use `MANIFEST.txt` here as the checklist of what to expect.

---

## 5. Reading order for a developer new to this project

0. **`HANDOFF-NOTES.md` in this archive** — day-one operational facts: the 12 MiB spec ceiling and the lane parked behind it, the +Z=north compass, the `patchObjectState` persistence footgun, and why static scans lie here. It carries a verbatim excerpt of `memory/game/index.md` lines 1–34.
1. `memory/game/index.md` — especially the `# GONE` section.
2. `memory/game/canon-architecture.md` and `memory/game/canon-master.md`.
3. `scripts/lib/data/event-map.json` — the bus contract.
4. `scripts/lib/world-day.js` — the clock everything reads.
5. `scripts/ui-actions.js` — every player intent lands here.
6. `memory/game/geometry-family-pooling.md` + `memory/game/performance.md` — the frame budget is the hard constraint; the game targets 60 fps on phones.
7. `memory/game/spec-budget.md` — the 12 MB spec ceiling and how it is managed. **2 of 4 — HANDOFF-NOTES.md**

# HANDOFF-NOTES.md — operational facts a new maintainer needs on day one

Two parts: (1) a **verbatim excerpt** of the top of `memory/game/index.md`, which is the project's entry-point note; (2) findings from the session that built this archive, which are not written down anywhere else yet.

---

## PART 1 — verbatim excerpt: `memory/game/index.md`, lines 1–34 of 282

This is an exact excerpt, not a summary. The file continues to line 282; the remainder (a 2026-08-19 caretaker-pass defect walk, performance notes, body architecture) is **not** reproduced here. Get the whole file via the Spawn API.

```markdown
---
summary: Nine Heavens Unbound — dense living xianxia open-world ARPG for @soon. Focus pass 2026-08-16 — thesis, pillars, anti-goals inside.
evidence: observed-built
engine: 5.2.26
model: claude-opus-5
---

# PARKED AT THE 12MB CEILING (re-save when the diet lane opens headroom)
- **`vale-roads` travel-furniture lane (2026-08-21)** — wayshrines, distance steles, rest
  pavilions, two bridges over `vale-stream`, ford stones, lamp standards. Refused at the first
  save (`spec_too_large`, 12.03MB); **nothing of it is in the world.** Survey + siting + data/
  behavior spec: `memory/game/staged-vale-roads.md`. Verbatim source of
  `scripts/gen/detail-vale-roads.js` (30,690 B): `memory/game/staged-vale-roads-gen.md`.
  The durable finding inside it, useful to every lane: **this world's compass is +Z = north,
  +X = east** (proven from `millet-ford.json` and the road marks), and there are exactly **two
  un-bridged road×river crossings** in the vale — `wayside-road-north` at (-14, 1.3) and
  `wear-lane-market` at (130.7, 67.5) — plus `wear-lane-auction`, which ends under 2.45 m of water.

# GONE / RETIRED
- **`scripts/temp-drive.js` — DELETED (2026-08-17 late, v5459, diet lane weave-1279d217).** Only reference was its own `api.removeBehavior` line + the spec.authoring inventory (which lists EVERY script and proves nothing). The other six "dead file" candidates from the stale list are ALIVE with citations — sim-lod-probe.js (live spec object), gait-dummy.js, probe-runner.js, temp-gait-stage.js, temp-run-probe.js, consequence-probe.js (journal-prescribed instruments), db.js (engine-invoked). Never re-delete on that list. ALSO SETTLED: the boot ceiling is **12 MiB (12,582,912 B), not 12.0 MB** — the spec was never over it on 2026-08-17; full metric + lever ladder in `memory/game/spec-budget.md`.
- **`probe-festival-drop2` and `probe-expedition-vein-survey` are CUT AT SOURCE (2026-08-18, v3494).** They were never code: they were rows in `places.main.objects.<warden>.state.staged` (festival-warden / expedition-warden), staged by earlier verification lanes through the wardens' probe doors. A `run_script` `patchObjectState` PERSISTS, so the row landed in the spec — while both lanes clear `staged` with a runtime-only `api.patchState` in their strike paths, which never touches the durable copy. Every boot reloaded the row; with `heaven-registry.day` reading **0** on a fresh host, the stale `endsDay` (5691 / 7102) is always "in the future", so it raised and announced again on every host flap. Durable rows cleared (`staged: []`, `runs: []` on both), 9 expedition orphans + the 2 abode floaters destroyed. **The real content was already there under proper names** — `events.json:40` `event-festival-ford` (same guests: npc-old-shen, npc-granny-mu, npc-rival-shen-qiao, npc-beggar-tang, npc-orphan-ah-niu) and `events.json:41` `event-expedition-vein-survey` (same pay 400, same `spawnsVein`). The probes were duplicates wearing probe names; nothing was renamed and no content was lost. Neither id appears anywhere in `scripts/` (grep receipt).
- **`abode-verify-cut-mouth` + `-mouth-name` — GONE (2026-08-18).** Runtime orphans of a claim `abode-verify-cut` that the registry no longer carries (`abode-registry.state.claims` = 12 real claims, none named verify). `buildWorld()` only spawns a mouth per live claim, so no claim = no respawn. SQL confirmation of the `abode_claims` row is UNPROVEN — the sql lane timed out twice at the 5 s exec budget; the static proof is that `boot()` pushes EVERY row into `claims`, and no verify row is in that list.
- **The ARMS IK corrector in `scripts/puppet-anim.js` is OFF and stays off against this mint** (live-tested 2026-08-16: his report — wrists extended, arms clipping hips — proved the IK targets fight the clip's baked pose; worse than the 45° forearms it corrected). `enabled: false` at v3391 with a do-not-re-enable note in the file. The forearm fix is the BODY SWAP, never the corrector.
- **The "rung 0 / full render quality" performance note is retired a second time.** 2026-08-16 telemetry: rung 5/5, ~19 ms/frame CPU-leaning, renderScale ×0.55 held under judder. The old intake note came back true. See # PERFORMANCE below. (Later the same day his client read rung 0 again — the rung breathes with device conditions; read live telemetry, never this line, for the current number.)
- `scripts/flat-starter-terrain.js` — orphaned starter generator (replaced by `scripts/terrain-immortal-vale.js`). Safe to delete; never rebuild the flat starter.
- A `terrace-flatten` terrain mark was attempted and dropped — the vale generator already flattens the spawn pad. Flatten marks need `center` as an object plus numeric `height`.
- First-person camera: replaced by the third-person orbit rig in `scripts/camera.js`. Do not revert without asking.
- **The by-eye bone axis map is DEAD** (it caused "doesn't look like a human's poses"). The live map is in `memory/game/rig-and-gait.md`, parsed from the GLB's rest matrices — do not re-derive by eye. The legacy solvers that encoded it (`armL`, `armR`, `elbow`, `knee`, `hipL`, `hipR`) are **deleted from `gait.js` source** (v1915); use `arm(side, …)` and `leg(side, …)`.
- `scripts/gait-dummy.js` — temporary rig probe, detached from the player. Never leave it in the player's behavior chain.
- `scripts/turtle-ridecheck.js` + the three `ridecheck-*` bodies — deleted 2026-08-16; deck formula + receipts live in `scripts/lib/turtle.js` → `deckColliderFeetY()`.
- **DEAD LAW — "a correctly parented child is invisible to `api.query`."** FALSE. The real orphan test: flat id whose `getObject(id).parent` is `null`. Receipts in `debugging.md`.
- **DEAD CLAIM — "every beast falls back to the generic quadruped preset."** The authored species skeletons ARE used. Do not re-open.
- ~~Minted GLB clips unused; body authored in `gait.js`~~ — **REVERSED**: locomotion is clip-driven. And since the puppet pivot, the PLAYER's clips ride `model.animation` on a spawned puppet (see # THE BODY). Never trust this list for the body's architecture; read `player-body.md`.
- The '1922' canary ghost, the "village has no buildings" theory (three times), the "sim runs at 15 Hz" theory (twice), the frozen "bye for now" bubble, the horizontal mid-air NPC — all dead with receipts in `debugging.md` / `player-body.md`. Do not re-hunt without a NEW receipt.
```

### What that excerpt tells you, if you read nothing else

- **The spec is parked at the ceiling.** 12 MiB = 12,582,912 B. A whole authored lane (`vale-roads`) was refused at save and is *staged in the journal only* — its generator source lives verbatim in `memory/game/staged-vale-roads-gen.md` and is not in the world. Free headroom before you author anything large.
- **World compass: +Z = north, +X = east.**
- **Never delete a script on a static reference scan.** Six files previously flagged "dead" were alive; `db.js` in particular is engine-invoked and has no importer at all.
- **`patchObjectState` from `run_script` persists.** Runtime `api.patchState` does not. Mixing the two is how stale probe rows got baked into the spec and re-fired on every host flap. This is the single nastiest footgun recorded.

---

## PART 2 — findings from the session that produced this archive

### The exec rail was down for the entire session
Every `run_script` call — readOnly included — returned:

    { ok: false, code: "room_host_summon_failed" }

That is an infrastructure fault in the room host, not a script error. It is why this archive has **no world layer and no SQL inventory**. Nothing was partially written; those exports were never attempted-and-truncated, they were skipped whole.

### The directory-listing API under-reports — this is a real hazard
A recursive listing of `scripts/` returned **neither `scripts/gen/*` (94 files) nor `scripts/effects/*` (35 files)**, and omitted `lib/bamboo-pool.js`, `lib/bld-parts.js`, `lib/event-map.js`, `lib/style.js`, `lib/data/art-bible.json`, `lib/data/manifest.json`, `scripts/cache.js` and `scripts/db.js` — all proven to exist by a second, directory-scoped listing or by content grep.

Further, `lib/data/event-map.json` names `formation.js`, `abode-prop.js`, `abode-interior.js` and `npc-cultivator.js` as live emitters/listeners, and **none of those four appeared in any listing.**

> Consequence: do not build tooling that trusts a single directory walk, and do not compute "orphan" sets from one. Cross-check against `lib/data/event-map.json` and content grep.

### Content grep caps at 50 matches per pattern
Relevant if you write an audit script against this project's own tooling.

### `spawn upload` rejects archives
The workshop bridge accepts only `glb, png, jpg, jpeg, webp, avif, mp3, wav, flac, ogg`. This archive ships as a `.tar.gz` renamed to `.png`. The bytes are **not** transcoded — verified by md5 round-trip against the ingest source URL. Download it and rename it back to `.tar.gz`.

### `lib/data/manifest.json` is not an asset manifest
Despite the name, it is a **VLM / picture-to-3D reconstruction protocol** — image format rules, orthographic-package requirements, a side-car part record schema, and a reconstruction acceptance test. It is included verbatim in this archive at `scripts/lib/data/manifest.json`. Don't wire an asset pipeline to it. **3 of 4 — ASSETS.md**

# ASSETS.md — CDN references used by Nine Heavens Unbound

None of these binaries are in this archive. Every path below resolves against the **live game's CDN**. In the Tome engine a CDN path *is* the asset: the file is generated on first fetch from the name itself, and a name once served keeps its first look forever.

## The style family

The project runs on one board:

    /cdn/moodboard-painterly-fantasy/

Everything style-defining — tileable textures, sfx, portraits, music — lives under it. A handful of bare `/cdn/...` paths (no board) exist for engine-level bits, e.g. `/cdn/effect-magic-mote.png` (preloaded in `scripts/player.js`) and `/cdn/eeeeeeeeeee-u821sfsnt.webp` (a portrait fallback in `scripts/ui.js`).

## Naming grammar

    <board>/texture-<surface>.png             tileable PBR surfaces
    <board>/sfx-<what-it-sounds-like>.mp3     one-shots; `-loop` suffix = looping bed
    <board>/model-<kind>-<name>.glb           rigged models (humanoids, creatures)
    <board>/portrait-<who>.png                menu card AND, as .png.glb, the world body
    <board>/music-<kind>-<name>.mp3           score
    /cdn/voice-<identity>-saying-<line>.mp3   spoken lines

## Textures observed (scripts/gen/ census)

    texture-weathered-granite.png
    texture-grey-cliff-stone.png
    texture-dry-stone-wall.png
    texture-rammed-earth-wall.png
    texture-dark-earth.png
    texture-damp-moss.png
    texture-mountain-meadow-grass.png
    texture-old-timber.png
    texture-dark-weathered-timber.png
    texture-grey-clay-roof-tile.png
    texture-aged-bronze.png
    texture-woven-reed.png
    texture-vermilion-talisman-paper.png
    texture-glazed-stoneware-jar.png
    texture-oilcloth-wrap.png

This is the shared stone/timber/earth palette that `gen/cache.js`, `gen/ruins.js`, `gen/wayside.js`, `gen/boulder.js`, `gen/outcrop.js`, `gen/ore-body.js`, `gen/sky-isle.js` and `gen/pine.js` all draw from — the same dictionary keys (`stone`, `cliff`, `dry`, `moss`, `wood`, `timber`, `dirt`, `earth`, `tile`, `bronze`) recur across builders. `scripts/pursuit.js` uses the same set inline.

## SFX observed

    movement / player.js
      sfx-qi-leap-whoosh.mp3   sfx-qi-dash-burst.mp3   sfx-blink-step-chime.mp3
      sfx-sword-summon-ring.mp3   sfx-sword-dismiss-shimmer.mp3
      sfx-wind-rush-loop.mp3   sfx-hard-landing-thud.mp3   sfx-wall-run-scrape.mp3
    flight.js
      sfx-thin-wind-cloud-band-loop.mp3
      sfx-high-altitude-pressure-tone-loop.mp3
      sfx-artifact-treasure-summon-chime.mp3
      sfx-qi-ascend-rush.mp3   sfx-unbound-ascension-toll.mp3
    dig.js / abode.js
      sfx-stone-cleave-strike.mp3   sfx-rock-collapse-rumble.mp3
      sfx-bottleneck-stone-groan.mp3   sfx-breakthrough-boom.mp3
      sfx-cauldron-lid-scrape.mp3
    cache.js
      sfx-chest-lid-creak.mp3   sfx-stone-grind-slide.mp3
      sfx-pottery-seal-crack.mp3   sfx-cloth-unwrap.mp3
      sfx-spirit-stones-clink.mp3
    alchemy.js
      sfx-cauldron-fire-catch.mp3   sfx-cauldron-flame-roar-loop.mp3
      sfx-pill-formed-ring.mp3   sfx-pill-failed-hiss.mp3
      sfx-flame-gutter-low.mp3
    colossi.js
      sfx-colossus-roar-deep-earth-shaking-bellow.mp3
      sfx-colossus-footfall-distant-ground-thud.mp3
      sfx-colossus-plate-crack-stone-armour-splitting.mp3
      sfx-sword-cut-impact.mp3

## Portraits observed

    portrait-mortal-youth-topknot-mengtao.png   (scripts/ui.js)

## Scripts that hold a board constant

`scripts/fount.js`, `scripts/market.js`, `scripts/destiny.js` each declare `const BOARD = '/cdn/moodboard-painterly-fantasy/'` and build paths from it, so their asset names are assembled at runtime and will not show up in a flat grep for full paths. **Any static scan of asset references under-reports for the same reason import scans do** — see README.md.

## Completeness warning

This census is **representative, not exhaustive.** The project's content-search tool caps at 50 matches per pattern, and the runtime exec rail (`room_host_summon_failed` all session) was unavailable to enumerate assets from the live spec. Region/detail data tables under `scripts/lib/data/` and the per-place spec object dressing will name further textures and models not listed here. Use the Spawn API (README.md §4) for a complete enumeration. **4 of 4 — MANIFEST.txt**

```
NINE HEAVENS UNBOUND — PROJECT FILE MANIFEST
generated by census walk of the live project tree

IMPORTANT CAVEAT ON THIS MANIFEST
The project's directory-listing API silently drops entries. The first recursive
listing of scripts/ returned neither scripts/gen/* (94 files) nor
scripts/effects/* (35 files), and omitted scripts/lib/bamboo-pool.js,
scripts/lib/bld-parts.js, scripts/lib/event-map.js, scripts/lib/style.js,
scripts/lib/data/art-bible.json, scripts/lib/data/manifest.json,
scripts/cache.js and scripts/db.js -- all of which are proven to exist
(cache.js and db.js surfaced via content grep; the lib/ files via a second,
directory-scoped listing).
=> TREAT EVERY COUNT BELOW AS A FLOOR, NOT A TOTAL.
The authoritative enumeration is the Spawn API (see README.md).

--- COUNTS (floor) ---
scripts/ root .js .............. 133 (+ cache.js, db.js known-missing = 135+)
scripts/lib/ *.js .............. 148
scripts/lib/data/ *.json ....... 143
scripts/gen/ *.js ..............  94
scripts/effects/ *.fx.js .......  35
scripts/mods/ (8 mods) .........  30
memory/game/ *.md .............. 175
                                 ----
TOTAL (floor) .................. 760

commands/ ...................... none present ("No commands found")
mods/ at top level ............. does not exist; mods live at scripts/mods/

--- scripts/ (root behaviours) ---
abode-warden.js abode.js aim-look.js alchemy.js auction-house.js auction.js
beacon-warden.js beast-voices.js beasts.js body-cultivation.js bounty-board.js
cache.js cache-warden.js camera.js cauldron.js cave-ambience.js
cave-network-warden.js cave-portal.js cave-swim.js celestial-court.js colossi.js
colossus-sense.js combat-warden.js combat.js companions.js consequence-warden.js
crane-disciple.js crane-fixture.js crust-entry.js crust-fault.js crust-geyser.js
crust-portal.js cultivation.js db.js destiny-body.js destiny.js
detail-bamboo-sea.js detail-blackwater-fen.js detail-cloudveil-valley.js
detail-sea-of-fallen-stars.js dialogue-input.js dialogue.js dig.js dive-body.js
duel.js ecology.js expedition.js festival.js flight.js fount.js furnishing.js
gathering.js geometry-audit.js god-tools.js gym-runner.js hands.js herb-garden.js
hermit.js hunt.js inventory.js lived-in.js loot-bundle-hands.js loot-bundle.js
loot-ears.js loot-warden.js market-hands.js market.js merchant.js
millet-fixture.js npc-goods.js npc-humanoid-pose.js npc-interior.js
npc-pose-warden.js ontology-warden.js ore-field.js perception-warden.js
place-deep.js place-spirit-crust.js place-world-heart.js plague.js player.js
proving-grounds.js puppet-anim.js pursuit.js qi-draw-hands.js qi-perception.js
qinggong-step.js realm-gate.js regard-warden.js region-bamboo-sea.js
region-blackwater-fen.js region-cloudrend-ridge.js region-cloudveil-valley.js
region-emberfall-barrens.js region-hollowmoon-ravine.js
region-sea-of-fallen-stars.js region-thunderscar-plateau.js
representation-director.js road-hall.js root-warden.js sea-warden.js
seclusion.js secret-realm.js sect-white-crane.js sim-lod-probe.js
situation-director.js sky-hostile.js sky-isles.js sky-ring.js sky-traffic.js
soundscape.js speedometer.js spirit-root.js spirit-sense.js still-water.js
tame-hand.js temper-site.js tournament.js tribulation-warden.js
turtle-abode-hand.js turtle-abode.js turtle-rider.js turtle.js tutelage.js
ui-actions.js ui.js unarmed.js vein-warden.js village-collision.js
village-life.js village-millet-ford.js world-bloom.js world-heart-core.js
world-heart-entry.js world-heart-portal.js world-heart-seal.js
world-heart-vent.js world-laws.js world-registry.js
(NOTE: formation.js, abode-prop.js, abode-interior.js, npc-cultivator.js are
 referenced as emitters/listeners in lib/data/event-map.json but did NOT appear
 in the directory listing -- further proof the listing under-reports.)

--- scripts/lib/ ---
abodes.js aim.js attendance.js bamboo-pool.js beacon-sites.js beast-bodies.js
beast-brains.js beast-census.js bld-parts.js body-pose-math.js body.js bounty.js
brew.js caches.js cave-layout.js celestial.js colossi.js combat-feel.js
conditions.js consequence.js crust.js cultivation-math.js cultivation-store.js
damage.js deep-terrain.js deep.js derive-pool.js destiny-luck.js destiny-store.js
detail-bamboo-sea.js detail-blackwater-fen.js detail-cloudrend-ridge.js
detail-hollowmoon-ravine.js detail-thunderscar-plateau.js dialogue-lore.js
ecology.js economy.js ember-storm.js equipment.js event-map.js expedition.js
festival.js flight-law.js flora.js forge-artifact.js forge-beast.js forge-herb.js
forge-index.js forge-item.js forge-technique.js forge.js frame-budget.js gait.js
genesis-voice.js genesis.js geo-migrate.js geo-pool.js geometry-audit.js
gym-drills.js gym-fixtures.js gyms-annex.js gyms.js held-pattern.js herb-pool.js
hermit.js interact-rail.js law-field.js locomotion.js lod.js loot-bundle.js
loot.js notice-lane.js notice.js notify.js npc-goods.js npc-mind.js npc-pose.js
ontology.js ore.js ownership.js pack-store.js pack.js peak-routes.js
peak-stations.js perception.js plague.js prop-pool.js provenance.js pursuit.js
qi-draw.js qi-field.js qinggong.js realm-gates.js realm-pocket.js regard-store.js
regard.js region-sim.js rep-tiers.js rig-measure.js road-danger.js root-store.js
roster.js run-modifiers.js secret-realm.js sect-join.js sim-lod.js sky-isles.js
soul.js spatial.js spirit-root.js starmap.js style.js taming.js technique-cast.js
terraform.js tournament.js trial-run.js tribulation.js turtle.js tutelage.js
ui-bounty.js ui-draft.js ui-hud.js ui-icons.js ui-material.js ui-notice.js
ui-pack.js ui-panels.js ui-read.js ui-record.js ui-refine.js ui-sigil.js
ui-theme.js ui-tournament.js ui-wheel.js veins.js village-day.js
wardrobe-dress.js wardrobe.js world-day.js world-heart.js world-sim.js

--- scripts/lib/data/ ---
abodes aim-look airborne art-bible attendance auction bamboo-sea-pool beacons
beast-geometry beast-species beast-voices beasts birds bloodlines body-pose body
bounties breakthrough-methods cache-geometry calendar camera cave-network
collision-policy colossi combat-feel combat conditions consequence continuant
deep-sea derive-pool destiny-fortune destiny detail-bamboo-sea
detail-blackwater-fen detail-cloudrend-ridge detail-emberfall-barrens
detail-hollowmoon-ravine detail-thunderscar-plateau draft-pool duel economy
equipment event-map events expedition festival flight flora-water forge-artifact
forge-beast forge-core forge-herb forge-index forge-item forge-technique
fx-budget genesis glb-rail gyms heavens held-pattern herbs hermit hunt
interact-rail items law-field loot lore-web manifest market-stonecrossing
metaphysics millet-ford-plan millet-ford movement notices notify npc-goods
npc-mind npcs ontology ore ownership peak-path-tuning peaks perception pills
plague player pursuit qi-fonts qi-signatures qinggong realm-gates realm-pockets
realms regard region-detail-bamboo-sea region-detail-blackwater-fen
region-detail-cloudrend-ridge region-detail-cloudveil-valley-pieces
region-detail-cloudveil-valley region-detail-emberfall-barrens
region-detail-hollowmoon-ravine region-detail-sea-of-fallen-stars-pieces
region-detail-sea-of-fallen-stars region-detail-thunderscar-plateau regions
registry-durability representation road-danger road-hall routines scatter-pool
secret-realm sects situations sky-hostile sky-isles soundscape spirit-crust
spirit-roots spirit-veins still-waters style taming techniques tournament
tribulation turtle-abode turtle tutelage veins village-alarm village-millet-ford
village-pressure village-prop-pool village-takeables wardrobe world-bloom
world-heart world-laws world
(all .json)

--- scripts/gen/ ---
abode-props abode-shell auction-pavilion bamboo-sea beast-bodies bird-bodies
blackwater-fen bld-bridge bld-gate bld-hall bld-market bld-tower boulder
bounty-board cache cauldron cave-door cave-rock cave-shell cloudrend-ridge
cloudspire colossus-bodies colossus-signs consequence-mark crust-node crust-shaft
deep-beast deep-scene delver-body detail-bamboo-sea detail-blackwater-fen
detail-cloudrend-ridge detail-emberfall-barrens detail-hollowmoon-ravine
detail-thunderscar-plateau drowned-shrine echo-crystal ecliptic-band
emberfall-barrens expedition-props festival-props flight-artifact flying-sword
garment-bodies hermit-shack hollowmoon-ravine hunt-quarry hunter-body
lamp-standard lean-to loot-bundle loot-props mantle-vein moon-temple ore-body
outcrop patch-ground peak-crown peak-paths pine proving-grounds punishment-hall
qi-mark qi-mote realm-gate root-stone ruins sea-of-fallen-stars secret-realm
sect-structures sign-frame sky-flyer sky-isle sky-ring spirit-crust spirit-herb
spirit-vein terrace-skirt thunder-hawk thunderscar-plateau tournament-ground
tribulation-cloud turtle-abode turtle-body turtle-helm turtle-settlement
vale-marks village-arms village-buildings village-props ward-body ward-props
ward-tell wayside world-heart
(all .js)

--- scripts/effects/ (*.fx.js) ---
artifact-flight boon-glint breakthrough-burst breakthrough-channel cave-breath
consequence dawn-mist event-qi-column fault-updraft glide-ribbon hearth-smoke
incense-column mantle-heat qi-absorb qi-ambient qi-burst qi-dash qi-draw-trail
qi-geyser qi-motes qi-shimmer qi-thread realm-starmap root-awaken star-sheen
sword-flight sword-summon technique-flight thermal-vent tribulation-bolt
tribulation-vortex unbound-flight vein-drift world-heart-core world-heart-seal

--- scripts/mods/ ---
aaa-quality-kit/look-cinema.js
animacao-viva/lib/avisos.js animacao-viva/lib/camadas.js
animacao-viva/lib/maquina.js animacao-viva/lib/mistura.js
biped-rig/lib/biped.json biped-rig/lib/rig-kit.js biped-rig/rig.js
biped-rig/test-walk.js
companion-mind/BOOT.md companion-mind/companion-mind.js
companion-mind/companion-picker.js companion-mind/lib/companion-forms.json
companion-mind/lib/insights.json companion-mind/lib/speech.js
gavi/equipe.js gavi/painel-equipe.js
mind-recipe/idle-layer.js mind-recipe/lib/lexicon.json
mind-recipe/lib/personalities.json mind-recipe/lib/reply.js
mind-recipe/lib/speech.js mind-recipe/mind.js
quadruped-rig/demo-walker.js quadruped-rig/lib/quadruped.json
quadruped-rig/lib/rig-kit.js quadruped-rig/rig.js
stream-vault/lib/data/vault-manifest.json stream-vault/lib/vault.js
stream-vault/vault.js

--- memory/game/ (175 .md — the game's institutional journal) ---
aim-and-look alchemy-ember-storm apex-colossi arsenal art-bible
assembly-blueprint attendance auction audit-three-lanes beasts befriend-ladder
blackwater-fen blueprint-zoo body-and-continuant bounty-board caches
canon-actions-compliance canon-actions canon-architecture canon-character
canon-cosmology-compliance canon-cosmology canon-environment canon-master
canon-scale canon-style canon-terrain canon-time-compliance canon-time canon-ui
cave-abodes cloudrend-ridge cloudspire-peak collision-millet-ford
combat-environment-model combat-feel combat consequence-lane-already-built
consequence-lane content-forge-reachability cosmology-celestial-court cosmology
craft-pass-survey cultivation debugging decisions defect-batch-2026-08-18
destiny-fortune dialogue-contract duel-lane ecology economy-and-markets
emberfall-barrens emberfall-surfaces event-map events-promised
expedition-vein-survey festival-ford flight-two-skies flora-ecology
forge-artifact forge-beast forge-index forge-item-pill-lane forge-technique
forge full-loot fx-budget genesis-plan genesis-pregen geometry-families
geometry-family-pooling golden-fingers ground-palette grounding-and-art-bible
held-pattern hero-surface-caretaker-pass hero-water-surfaces hollowmoon-ravine
hunt-lane index interact-rail interface layer-a00-orbital-ring
layer-a20-sky-isles layer-a40-cave-network layer-a50-spirit-vein-crust lived-in
loot-ownership loot lore-web material-lane millet-ford-day
millet-ford-structures millet-ford minimap-box-math movement-feel
movement-ground-feel movement night-readability nine-peaks nms-build-specs
no-mortal-space-teardown no-mortal-space-watch npc-bodies-arm-pose npc-goods
objective-beacons ontology-and-metaphysics ontology-audit ore-lane
perception-and-minds perception-ladder performance plague-lane plan-millet-ford
plan planet-architecture player-animation-bar player-body proving-grounds
qi-draw qi-materials qinggong-ground-arts realm-gates realm-pockets
realm-trial-draft realm-up-quest regard region-bamboo-sea region-board
region-detail-cloudrend-ridge-high-slate region-detail-cloudrend-ridge
region-detail-cloudveil-valley region-detail-emberfall-barrens
region-detail-hollowmoon-ravine region-detail-sea-of-fallen-stars review-fable-5
rig-and-gait rig-animation-bar road-danger screen-notes sea-and-deep
sea-of-fallen-stars secret-realms-pocket-worlds secret-realms singleplayer-law
singleplayer-verification singleplayer sky-night-and-veil
soundscape-region-beds soundscape-score soundscape spec-budget spirit-roots
staged-cloudrend-ridge starmap-payoff taming terrain-ground-look
thunderscar-plateau timber-frame-kit tournament turtle-abode tutelage
ui-contract village-millet-ford walkthrough-audit wardrobe-render-blocker
wealth-veins white-crane-pavilion workshop-lessons world-bloom
world-clock-durability world-clock world-heart-a60-a70 world-laws-lane
world-physics world-sim xianxia-canon
(all .md)
```

that's all four. the full source itself — every script, data table, journal note, and the world layer — comes through settings → build with a coding agent, byte-exact. the manifest above is your checklist for it.