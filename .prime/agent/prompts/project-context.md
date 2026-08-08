# Project Context — Live Architect Studio (Grand Architect)

> Loaded every session. This is the entire workspace map, compressed. When a
> task needs depth, open the referenced files. When it needs truth, open the
> genesis report or the corpus. When it needs style, open the art boards.

## Identity
Deterministic xianxia-multiverse RPG engine + Live Architect Studio (Next.js App
Router, React 19, three.js 0.185, Tailwind v4, zustand). The world is an original
donghua built from the Renegade-Immortal-flavored Cangwu corpus: a complete
lower-order cosmos where mortal civilization and cultivation civilization
overlap on one patchy spherical planet (Mortal Realm = complete cosmos, never
"mortal-only").

## The engine (src/)
- `src/engine/` — deterministic simulation: cosmos (cosmology-graph, time-engine,
  karma, steps-ladder), laws (law-interaction-solver, realm-law-profile,
  capability-vector, formation-core, local-law-stack, terrain-operation-clip),
  world/matter (matter-accounting, material-composition, loot, sinks),
  plugins/simulation (ga-cultivation, ga-combat, ga-combat-arts, ga-quest,
  ga-ecology, ga-economy, ga-npc, ga-history, gen-*), runtime (engine-runtime,
  deterministicId ids), frontier (terrain-plugin, character-controller),
  architect (rcvc, authorial bible-compiler, providers/prime-agent RPC),
  cosmos/frontier/fiberlab.
- `src/lib/` — determinism (canonical primitives.ts: hashNoise3, fnv1a,
  Park-Miller lcgStep, NR LCG, deterministicId, encodeFloatsForHash),
  engine (dashboard-data CONFORMANCE_FILES, definitions database 359 entries /
  30 layers), genesis (coverage gate 56 concepts, 80-pass gauntlet registry,
  emergence gauntlet, xianxia concept reviews), worldproduction (scale
  registry, set blueprint, director script + 27-shot tour, animation
  controller, interactions, coverage systems, prompt templates, zhumeng
  style, filmic grade), assets/factories (set-factory, character-factory 20-bone
  rig + 4 clips, dressing-factory, textures, sound-designer 33 cues).
- `src/components/editor/` — studio shell (EditorLayout 15 tabs incl. Director
  + Player), panels (WorldHierarchyPanel deep collapsible tree, DirectorPanel,
  DirectorPlayerPanel cinematic player with timeline/comments/narration/sound/
  click-inspect), viewport (Viewport3D + TransformControls gizmos).
- `src/app/` — pages (/, /editor, /director-render) + 58 API routes
  (architect/* incl. chat via DeepSeek, engine/*, world/*).

## Canon & truth
- `corpus-extension/` — frozen 48-doc Bible + 50-55 ground truth (VTP,
  MotionProfile/TechniquePacket, Visual Accuracy Oracle, Style Grammars, SI).
  FROZEN: no new corpus docs.
- `engine-architecture/` — 51 engineering specs (scheduler, streaming S0-S4,
  animation retargeting, GA control plane...).
- `docs/` — engineering directives (NOT corpus): emergence-directive,
  world-fabric-asset-factory-directive (the six boards' companion),
  universal-genesis-gauntlet-directive (80 passes, 60 Hz authoritative clock,
  CANON/DERIVED/DESIGN/UNRESOLVED), TOOLCHAIN_RESEARCH, AI_PROMPT_PLAYBOOK,
  gauntlet-audit.md (+ .before.md).
- Truth levels on genesis concepts: canon (corpus verbatim), derived,
  design (directive), unresolved. Machine-audited.

## Production pipeline (the episodes ARE the game factory)
1. Set blueprint (handcrafted Wang Family Bend: 14 structures, 8 rooms, 38
   props, scale-checked) -> 2. Factories (3D: set/character/dressing/textures)
   -> 3. Director script + 27-shot tour (narrator/MC VO, sound cues, camera) ->
   4. Animation controller (continuous camera, day/night, world motion) ->
   5. Player (scrub/comment/play-from-here/click-inspect) -> 6. Vision dailies
   (gemma-4 style gauntlet + detail audit) -> 7. 80-pass gauntlet audit
   (before/after scenes) -> 8. Reusable corpora (definitions, motions,
   interactions, sounds).

## Gates (run before claiming anything done)
- `bun run test:conformance` — 19 suites, ~2253 assertions (Genesis 104,
  Gauntlet 16, Definitions 19, World Production 95).
- `bun run check:genesis` — 56 concepts, 94+ required pairs bound, gauntlet
  scenarios, Universe Coverage Matrix.
- `bun run check:determinism` — no Math.random/Date.now in engine code.
- `bun run typecheck`, `bun run lint`, `bun run ai:check` (19/19).
- `bun run scripts/gauntlet-audit.ts` — regenerate the 80-pass markdown
  before/after scenes.

## Models & vision
- DeepSeek (deepseek-v4-flash) — all reasoning: GA chat (/api/architect/chat),
  prime agent roles. Key: DEEPSEEK_API_KEY (env; NOT yet set — opencode-go key
  is gateway-only).
- Gemma 4 (gemma-4-31b-it, google) — vision: style gauntlet critic, detail
  dailies audit, board captioning. Key: GEMINI_API_KEY (set in user env).
- Prime agent config: .prime/agent/settings.json (deepseek-v4-flash; browser-
  verifier role uses gemma-4-31b-it vision) + ~/.prime/agent/models.json
  (deepseek + google providers).

## Open loops / next
- Style gauntlet iteration toward art-bible scores (critic: gemma-4, harsh
  floor ~1-2 on blockout; trajectory tracked in evidence/style-gauntlet/
  summary.json).
- Motion corpus harvesting (episode -> semantic clips) + motion coverage gaps
  (carry.uneven-terrain, bow.injured, sword.draw.confined-space,
  cultivate.meditate, spirit-beast.stalk, disciple.mount-sword).
- Wiki layers: folk religion (25), stations 6-10 (45) definitions.
- Scene Universe Slice compilation (directive §43).
- Real DEEPSEEK_API_KEY needed before prime agent's deepseek role can run live.
