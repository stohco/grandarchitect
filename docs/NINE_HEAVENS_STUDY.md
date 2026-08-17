# NINE HEAVENS UNBOUND — the full study, every aspect

The owner's verdict: "this project has done better terrain building than
you." Studied in full (the orientation archive, not the source). The truth
is broader than terrain. This is the aspect-by-aspect honest audit: what
they do better, what we do better, what we adopt, what we refuse.

THEIR SCALE: ~760 files, 9 places, 8 regions, 94 gen-builders, 35 effects,
175 journal notes, a 12 MiB spec at its ceiling, targeting 60 fps on
phones. Ours: ~50 game files, 1 village, 1 planet, 15 gates, a gym, a
Blender pipeline. They are building the same game — denser, older,
disciplined differently.

## ASPECT 1 — ARCHITECTURE: they win on structure, we win on verification

THEIRS (better):
- WARDEN/DIRECTOR OWNERSHIP: every game-global system is owned by a
  long-lived server entity (combat-warden, vein-warden, regard-warden,
  situation-director, representation-director... ~17 wardens). Systems
  never ride the player. OURS: bootstrap.ts IS the warden — a 500-line
  monolith owning time, sky, raids, validation, assets, streaming.
- THE EVENT BUS + ITS CONTRACT: wardens talk over api.emit/api.on, and
  EVERY emit and listener has a row in event-map.json with ORPHAN
  (emitters, no listeners) and DEAF (listeners, no emitters) auditing.
  98 live names, 32 orphans, census'd. OURS: modules import each other
  directly. No bus. No contract. No orphan detection.
- THE PLAYER AS A BEHAVIOR STACK: the player is ~33 scripts whose ORDER
  IN THE SPEC is load-bearing (player, camera, aim-look, combat,
  cultivation, flight, qinggong, inventory, hands, dig, gathering...).
  Adding a capability = adding one script in the right slot. OURS: the
  player is one class + one rig.
- UI DISCIPLINE: ui.js is a READ-ONLY PAINTER. Every button is a
  sendAction; every action lands in ONE file (ui-actions.js). OURS: the
  gym panel + game HUD mix read and write freely.
- ONE CLOCK: world-day.js is the single time source, with a durability
  doc. OURS: PlanetTimeSystem is single ✓ (we match, independently).

OURS (better):
- THE GATE CULTURE: 15 executable gates (conformance suites, tsc, lint,
  ai:check, maturity 156) run per change with exit codes. Their archive
  describes journal receipts but no executable gate suite.
- DETERMINISM AS LAW: our heightfield/rig/animation are seeded and
  reproducible by construction; their gen/ builders are seeded too
  (we match) but their world layer lives in spec state we can't audit.

ADOPT: (1) the warden decomposition of bootstrap.ts — one owner module
per system (time-warden, sky-warden, stream-warden, raid-warden);
(2) an event contract JSON + an ORPHAN/DEAF audit script over our
modules; (3) ui read-only painter + one actions file for the gym/game
HUD.

## ASPECT 2 — CONTENT DENSITY: they win outright

THEIRS: 8 regions each with a behavior + detail dispatcher + data tables;
94 gen-builders covering rocks, ruins, bridges, gates, halls, markets,
towers, pines, sky-isles, turtle settlements, moon temples; 35 fx;
loot/vein/ore/ecology/festival/duel/tournament lanes; 9 places including
a cave NETWORK, a spirit-vein CRUST, a world-heart, deep-sea, pocket
realms. OURS: 1 village, 1 stream, 1 shrine, 1 pine, 12 villagers.

THE HONEST TAKE: this is not a technique gap — it is a volume gap. Their
gen/ pattern (deterministic (params, seed) builders invoked by path) is
HOW they got the volume. We adopted the Blender pipeline for hero assets
but have no dressing-builder class at all.

ADOPT: the gen-builder law — every dressing class (rock, grass tuft,
terrace skirt, path stone, ruin chunk) becomes a deterministic seeded
code builder with the pooling law (identical visual states share one
derived geometry). Their geometry-family-pooling doc is the frame-budget
law we lack entirely.

## ASPECT 3 — TERRAIN: they win on SURFACE, we match on FORM

THEIRS: flat vertex colors are NOT their ground — every surface draws
from the 15-texture painterly board (weathered-granite, cliff-stone,
moss, meadow-grass, rammed-earth, old-timber...), shared via one
dictionary across every builder. Terrain marks live in the spec; the
vale generator flattens spawn pads; terrace-flatten was tried and
dropped as duplicate.
OURS: the heightfield FORM is authored (regions/peaks/valleys/rivers —
their canon-terrain says the same thing: form is authored, not noise)
but our SURFACE is flat vertex color. That is why their ground reads as
ground and ours reads as a colored veil.

ADOPT: the tileable texture family generated in code (canvas →
CanvasTexture, the art-bible palette, deterministic) splatted by
material. This is adoption item A from TERRAIN_LESSONS.md — still the
single biggest visual lever.

## ASPECT 4 — CHARACTER/RIG: they win on process maturity

THEIRS: a GLB-driven puppet with clip-driven locomotion; a rig whose
bone-axis map is PARSED FROM THE GLB'S REST MATRICES (never by eye —
the by-eye map is in their GONE section with a receipt); an arms-IK
corrector that was live-tested, found WORSE than the baked pose, and
disabled WITH a do-not-re-enable note; the biped-rig/quadruped-rig mods
as procedural rig kits; npc-pose-warden for NPC animation.
OURS: the pivot-reparenting rig that kept breaking; the MetaHuman-style
skinned-skeleton rebuild just started (skeleton.ts). We are behind —
and their lesson (parse the rest matrices, never eyeball axes; test IK
against the baked mint and keep receipts) is directly load-bearing for
our rebuild.

ADOPT: the rig receipts discipline — every rig decision gets a mint
test + a written verdict, including the failures (their disabled-IK
note is the model). Our skeleton.ts follows their bone-hierarchy
instinct with our measured positions.

## ASPECT 5 — SOUND + FX: they win; we have almost nothing

THEIRS: 35 fx scripts + a full sfx/music census with a naming grammar
(sfx-what-it-sounds-like, -loop suffix) + per-region soundscape beds +
a score. OURS: zero audio. Nothing to compare. ADOPT (later): the sfx
naming grammar when we add audio via WebAudio.

## ASPECT 6 — MEMORY/JOURNAL: they win on discipline

THEIRS: 175 notes; canon-master/architecture/cosmology/time/ui/style/
scale/terrain + COMPLIANCE AUDITS per canon; a GONE section that kills
dead ideas WITH RECEIPTS (the 1922 canary ghost, the by-eye bone map,
the IK corrector) and a rule: "do not re-hunt without a NEW receipt."
OURS: OptMem (46 entries) + worklog + WORLD_STATE — the same instinct,
a tenth the discipline. The receipts culture is the part worth stealing
whole.

ADOPT: WORLD_STATE.md gains a # GONE section; every lane's failures get
receipts; OptMem entries cite the evidence files.

## ASPECT 7 — PERFORMANCE: they target phones; we target a dev box

THEIRS: frame-budget.js, sim-lod, rung telemetry (5/5 quality, ~19ms,
renderScale 0.55 under judder), geometry pooling as THE cost law, the
12 MiB spec ceiling with a diet lane. OURS: the perf HUD exists; no
frame budget law; no LOD discipline beyond the far rings; no spec-size
concept. ADOPT: the frame budget as a named law (our perf HUD is the
meter; add the budget line).

## ASPECT 8 — THE FOOTGUNS THEY RECORDED (free lessons for us)

- patchObjectState PERSISTS; runtime patchState does not. Mixing them
  baked stale probe rows into their spec that re-fired every host flap.
  OURS-equivalent: the terrain-edit deltas persist; runtime-only state
  must never pretend to be authored. We already obey this — keep it.
- The directory-listing API under-reports; static import scans lie
  (94 gen files invisible to one walk). OURS-equivalent: never trust a
  single file walk — our gates grep content, not listings. Keep.
- The spec ceiling is 12 MiB = 12,582,912 B (not 12.0 MB). Precision
  in limits is a discipline, not pedantry.

## THE VERDICT

They are ahead in: content volume, surface treatment, structural
decomposition, audio, journal discipline, phone performance.
We are ahead in: executable verification (15 gates), the deterministic
engine core, and the asset-pipeline formality (Blender GATE 3 + the
forge ledger).
Same game, same instincts (authored form over noise, receipts,
determinism) — they are further along the content axis, we are further
along the verification axis.

THE ADOPTION ORDER (by leverage):
1. bootstrap → wardens (structure unblocks everything)
2. the event contract + ORPHAN/DEAF audit
3. the code texture family on the terrain chunks (visuals)
4. the gen-builder + pooling law for dressing (density)
5. the journal receipts + GONE section (discipline)
6. the frame budget law (performance)
