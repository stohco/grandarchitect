# 23 — Procedural Generation Framework

**Status:** Engineering specification. The `ga:generator` plugin — the generation pipeline from World Seed to Three.js scene, the generator plugin interface, determinism, streaming, the seed hierarchy, save-vs-regenerate, and the lore-to-schema parser.
**Date:** 2026-08-03

---

## 0. What this document is

This document specifies how the engine turns a seed + the lore documents into a world. The bible's 48 documents (corpus-extension/) are the generator's configuration data; this document specifies the engine that consumes them. The pipeline is **deterministic** (same seed + same lore = same world, bit-for-bit), **streaming** (the world is not pre-generated; chunks generate as the player approaches), and **hierarchical** (a seed tree from the World Seed down to a single NPC's seed).

The central commitment: **the lore documents ARE the generator configuration.** This is not "a parser that reads the lore and produces a JSON config that is the actual config" — the lore-to-schema parser produces a verified, fingerprinted, content-addressed schema, and the generator plugins consume that schema directly. The schema is a derived artifact (cached, fingerprinted); the lore is the source of truth. Editing the lore and re-running the parser produces a new schema, which the generators consume to produce a new world. This is the smallest loop that makes the world authorable by editing prose (AGENTS.md Part 3: "the smallest end-to-end thing that works").

### Precedents cited (AGENTS.md Part 3: "Cite the precedent")

- **Dwarf Fortress world generation** — the layered generator (geography → climate → civilizations → history → sites). Adopted as the pipeline shape (§1).
- **Caves of Qud's faction and history layer** — history as a generation layer that retroactively constrains site generation. Adopted.
- ** Minecraft chunk generation** — deterministic per-chunk from world seed + chunk coords. Adopted as the streaming primitive (§5).
- **Elite: Dangerous Stellar Forge** — deterministic system generation from a seed hierarchy. Studied; our hierarchy is simpler (we do not need 400 billion systems).
- **RimWorld scenario system** — generators consume "defs" (XML/JSON definitions) plus runtime rules. Our `definitions.ts` (already in `src/lib/engine/`) is the same idea, extended to lore-derived schema.

---

## 1. The generation pipeline

### 1.1 The eleven stages

```
┌─────────────────────────────────────────────────────────────────────────┐
│  1. World Seed (256-bit, from player or fixed)                          │
│     ↓ derive (keyed hash)                                               │
│  2. Cosmology (the three strata, spirit veins, grotto-heavens)          │
│     ↓ derive per stratum                                                │
│  3. World (the Mortal-Stratum planet: continents, oceans, climate)      │
│     ↓ derive per region                                                 │
│  4. Region (the Cangli Riverlands: watersheds, settlements, lineages)   │
│     ↓ derive per culture                                                │
│  5. Culture (the late-imperial Chinese substrate: kinship, ritual,      │
│     economy, law)                                                       │
│     ↓ derive per settlement                                             │
│  6. Settlement (Wang Family Bend: compounds, lineages, fields)          │
│     ↓ derive per household                                              │
│  7. Ecology (paddies, animals, fish, disease, spirit herbs)             │
│     ↓ derive per NPC                                                    │
│  8. NPC (named individuals: kinship, qi-state, schedule, strategy)      │
│     ↓ derive per event                                                  │
│  9. History (the village's past: floods, deaths, marriages, disputes)   │
│     ↓ derive per tick                                                   │
│ 10. Database (the structured definition graph; doc 17 §8.2)              │
│     ↓ streaming on demand                                               │
│ 11. Streaming + Three.js (chunked load into the live scene)             │
└─────────────────────────────────────────────────────────────────────────┘
```

Stages 1–9 are **generation** — they produce canonical state. Stage 10 is **storage** — the generated state is written to the engine's database. Stage 11 is **presentation** — the state is loaded into Three.js for the player.

### 1.2 Why this ordering

The ordering respects **causal dependency**: cosmology constrains what spirit veins exist; spirit veins constrain what regions are qi-dense; qi-density constrains what sects settle there; sects constrain what cultivation is practiced; cultivation constrains what NPCs practice it. A generator cannot decide "this village has a Core Formation elder" before it has decided "this region has a spirit vein strong enough to support Core Formation."

The ordering is also the **invalidation ordering**: if the player (or a Mahayana author, doc 24 §1.1) modifies a node, only its descendants need regeneration. Modifying the Cangli Riverlands' watershed does not regenerate the cosmology; modifying a household does not regenerate the region.

### 1.3 The pipeline is not strictly sequential

Stages 1–3 run once at engine startup (cosmology + world + region generation takes ~200 ms total). Stages 4–8 run **lazily** as the player approaches (a settlement's details are generated when the player is within 1 km; an NPC's details are generated when the player is within 100 m). Stage 9 (history) runs in two passes: a coarse pass at region generation (the village's major events over the last century), and a fine pass at settlement generation (the details of each event). Stage 10 is continuous; stage 11 is the rendering loop.

---

## 2. The generator plugin interface

### 2.1 The generator contract

```typescript
interface GeneratorPlugin extends Plugin {
  id: string;                    // e.g. 'ga:gen-settlement'
  stage: GeneratorStage;         // 'cosmology' | 'world' | ... | 'history'
  consumes: DefinitionKind[];    // what definition types it reads
  produces: DefinitionKind[];    // what definition types it writes
  inputSchema: ZodSchema;        // the seed + parameters it expects
  outputSchema: ZodSchema;       // the canonical state it produces

  generate(ctx: GenerationContext, input: GeneratorInput): GeneratorOutput;
}

interface GenerationContext {
  detRng: DetRng;                       // the deterministic RNG, seeded from this stage's seed
  seed: string;                         // hex; the seed for this stage
  parentSeed: string;                   // hex; the parent stage's seed
  parentOutput: unknown;                // the parent stage's output (typed per stage)
  definitions: DefinitionDatabase;      // the full definition graph
  loreFingerprint: string;              // SHA-256 of the parsed lore schema
  worldTick: number;                    // 0 at fresh generation; > 0 at lazy generation
  logger: GenerationLogger;
}

interface GeneratorInput {
  scope: GenerationScope;               // what range this generation covers
  parameters: Record<string, unknown>;  // stage-specific
}

interface GeneratorOutput {
  definitions: Definition[];            // new definitions to add to the database
  entities: EntitySpec[];               // new entities to instantiate in the world
  state: Record<string, unknown>;       // canonical state slice for this generator
  childSeeds: Record<string, string>;   // named child seeds for the next stage
}
```

### 2.2 The generator's contract with determinism

A generator is **pure**: same `GenerationContext` + same `GeneratorInput` → same `GeneratorOutput`, bit-for-bit. This is enforced by:

1. The `detRng` is the only source of randomness. Calling `Math.random()` inside a generator throws in dev mode.
2. All transcendental functions must be `det_*`. `Math.sin` inside a generator throws.
3. The output is CBOR-serializable and hashable. A generator's output hash is recorded and compared on regeneration.
4. Generators may not read the wall clock, the network, or any non-deterministic source.

### 2.3 The generator's contract with the lore

A generator reads **only** the Definition Database — never the raw lore markdown. The lore-to-schema parser (§7) is the single path from prose to definitions. This separation means:

- The parser can be re-run independently (it's a build step, not a runtime path).
- Generators are testable against a frozen definition database.
- The lore's prose can be restructured (markdown → org-mode → anything) without touching any generator.

---

## 3. How generators consume definitions + templates + rules

### 3.1 The three input types

A generator consumes three kinds of input:

1. **Definitions** — the concept graph (e.g., the definition for `essence.fire` describes fire-phase qi). Definitions are the *what*.
2. **Templates** — concrete patterns to instantiate (e.g., a household template with 4 members, a hall, a kitchen, a well). Templates are the *how*.
3. **Rules** — constraints and probabilities (e.g., "a settlement must have at least 1 water source within 200 m"; "70% of households practice wet-rice; 30% practice dryland"). Rules are the *must* and *usually*.

```typescript
interface DefinitionDatabase {
  definitions: Map<string, Definition>;        // by id, e.g. 'essence.fire'
  byKind: Map<DefinitionKind, Definition[]>;   // indexed by kind
  byTag: Map<string, Definition[]>;            // indexed by tag
  relations: Graph<string>;                    // relations between definitions
  fingerprint: string;                         // content-addressed
}

interface Template {
  id: string;                                   // 'household.standard_4person'
  kind: 'household' | 'building' | 'event' | 'npc' | '...';
  parameters: Record<string, ZodSchema>;        // what can be customised
  instantiate: (params, ctx) => EntitySpec[];   // the template's expansion
  weight: number;                               // relative probability of this template
  constraints: TemplateConstraint[];            // when this template is valid
}

interface Rule {
  id: string;                                   // 'settlement.must_have_water_source'
  kind: 'hard' | 'soft';                        // hard = throws if violated; soft = re-rolls
  applies: (ctx) => boolean;                    // when this rule applies
  evaluate: (output, ctx) => RuleResult;        // pass / fail / re-roll
  description: string;                          // for error messages and audit
}
```

### 3.2 How a generator uses all three

The settlement generator (`ga:gen-settlement`) works like this:

```
1. Read definitions for 'settlement' kind → which settlement types exist?
2. Read templates for 'household' → which household patterns can I instantiate?
3. Read rules for 'settlement' → what constraints must the settlement satisfy?
4. Loop:
   a. Pick a settlement template (weighted by template.weight, seeded by detRng)
   b. Instantiate the template with randomised parameters
   c. Apply each rule:
      - hard rule fails → discard this instantiation, re-roll
      - soft rule fails → adjust (move the well closer to the river) and re-evaluate
   d. If all rules pass: commit; record childSeeds for each household
5. Emit definitions (the new 'location.wang_family_bend' definition),
   entities (the buildings, fields, wells), and state (the settlement slice).
```

### 3.3 The constraint-violation failure case

**Failure case (constraints):** A hard rule is violated and re-rolling 100 times does not produce a valid settlement. The generator throws `GenerationConstraintFailed` with the rule id and the last attempted output. This is a contract violation — the lore's rules are inconsistent with its templates. The fix is to revise the lore (or the templates) so the constraint is satisfiable. The engine does not silently produce a broken settlement (AGENTS.md Part 3: "Uniform 'every finding repaired' closure is the tell that no real review happened").

---

## 4. Determinism — same seed + same definitions = same output

### 4.1 The determinism stack (recap)

Per doc 07 §6.3 and doc 17 §3: xoshiro256** RNG, Q32.32 fixed-point, `det_*` transcendentals, CBOR serialization, SHA-256 hashing. Every generator uses these. No generator uses `Math.random`, `Math.sin`, `Date.now`, or any non-deterministic API.

### 4.2 The seed derivation

```typescript
function deriveSeed(parentSeed: string, childName: string): string {
  // SHA-256 of (parentSeed + ':' + childName), hex-encoded
  return det_hash_string_hex(`${parentSeed}:${childName}`);
}

// At the cosmology stage:
const cosmosSeed = deriveSeed(worldSeed, 'cosmos');
const strataSeed = deriveSeed(cosmosSeed, 'strata');
const lawSeed    = deriveSeed(cosmosSeed, 'law');
const tribSeed   = deriveSeed(cosmosSeed, 'tribulation');

// At the world stage:
const worldSeedMortal = deriveSeed(cosmosSeed, 'world:mortal');
const geographySeed   = deriveSeed(worldSeedMortal, 'geography');
const climateSeed     = deriveSeed(worldSeedMortal, 'climate');
const qiTopologySeed  = deriveSeed(worldSeedMortal, 'qi_topology');
const ecologySeed     = deriveSeed(worldSeedMortal, 'ecology');
```

Every node in the seed tree is derived deterministically from its parent. The tree is reproducible from the root alone (Ponytail §2: simplest implementation that fully meets the requirement).

### 4.3 The determinism verification

```typescript
function verifyGenerationDeterminism(worldSeed: string): boolean {
  // Run the full generation pipeline twice
  const run1 = runFullPipeline(worldSeed);
  const run2 = runFullPipeline(worldSeed);

  // Hash each stage's output
  for (const stage of GENERATOR_STAGES) {
    const hash1 = det_hash_cbor(run1[stage.id]);
    const hash2 = det_hash_cbor(run2[stage.id]);
    if (hash1 !== hash2) {
      throw new DeterminismError(`Stage ${stage.id} is non-deterministic: ${hash1} vs ${hash2}`);
    }
  }
  return true;
}
```

Run nightly in CI. Same protocol as physics (doc 20 §7.3) and terrain (doc 21 §7.3). Cross-browser hash parity is the gate.

### 4.4 The cross-browser failure case

**Failure case (cross-browser):** The cosmology generator produces a different spirit-vein layout in Chrome vs Firefox. Diff reveals the divergence is in a `det_atan2` call. The fix: the `det_atan2` implementation has a Cody-Waite reduction that loses precision near specific angles; the fix is in the determinism library (already implemented in `src/lib/determinism/transcendentals.ts`), not in the generator. This is why the determinism stack is foundational (doc 11 §1.3) — generators depend on it being correct.

---

## 5. Streaming generation — lazy generation on player approach

### 5.1 The load radius

The world is not pre-generated. Generators run lazily as the player approaches:

| Stage | Load radius | What generates |
|---|---|---|
| Cosmology | ∞ (always generated at startup) | The three strata, spirit veins, grotto-heavens |
| World | ∞ (always) | Continents, oceans, climate bands |
| Region | 10 km | The Cangli Riverlands region |
| Culture | 10 km | Cultural substrate for the region |
| Settlement | 1 km | Villages, towns, sects |
| Ecology | 500 m | Paddies, animals, fish, herbs |
| NPC | 100 m | Named NPCs with full detail |
| History | 1 km (coarse), 100 m (fine) | The region's past, the village's past |

### 5.2 The generation queue

```typescript
interface GenerationQueue {
  pending: GenerationRequest[];     // sorted by priority (distance to player)
  inFlight: GenerationRequest[];    // being generated in workers
  completed: Map<string, GeneratorOutput>;  // cached results
  evicted: Set<string>;             // outputs that were unloaded
}

interface GenerationRequest {
  stage: GeneratorStage;
  scope: GenerationScope;            // e.g., { regionId: 'cangli_riverlands' }
  seed: string;
  priority: number;                  // 1 / distanceToPlayer
  required: boolean;                 // true = block until done; false = best-effort
}
```

The queue is processed by a worker pool (one worker per CPU core, capped at 4). Each worker runs the generator pipeline for one request at a time. Generation results are cached; evicted when memory pressure exceeds threshold (LRU on `priority × recency`).

### 5.3 The streaming-determinism failure case

**Failure case (streaming):** A settlement is generated when the player is 1 km away; the player walks away; the settlement is evicted; the player walks back; the settlement is regenerated. The two generations must produce identical state. They will, because (a) the seed is deterministic, (b) the generator is pure, (c) the definition database is fingerprinted and immutable. The regeneration is bit-identical.

This is the **central** determinism requirement for streaming: lazy generation must be a pure function of `(seed, definitions, scope)`. The player's history (which settlements they have visited, what they did there) is not part of the generator's input; it is part of the canonical state, applied *after* generation. Generation is stateless; simulation is stateful.

### 5.4 The eviction failure case

**Failure case (eviction):** A settlement is evicted while the player is standing in it. The settlement's state (which NPCs are where, what time of day it is, which doors are open) must be preserved. The fix: the canonical state for a settlement is **always** in the save (it is part of the plugin slice). Eviction only unloads the **rendered** representation (the Three.js scene graph, the loaded glTF models). The canonical state stays. When the player returns, the rendered representation is rebuilt from the canonical state — not regenerated.

This distinction is critical: **generation** (creating new canonical state) is lazy and pure; **presentation** (loading canonical state into the renderer) is lazy and idempotent. They are different operations and must not be conflated.

---

## 6. The seed hierarchy — full structure

### 6.1 The tree

```
WorldSeed (256-bit, from player or fixed)
├── cosmosSeed
│   ├── strataSeed (Precelestial / Acquired / Mortal)
│   ├── lawSeed (the local laws of the Acquired Stratum)
│   └── tribulationSeed (tribulation patterns)
├── worldSeedMortal (the specific planet in the Mortal Stratum)
│   ├── geographySeed (terrain, rivers, mountains, coast)
│   ├── climateSeed (temperature, rainfall, monsoon patterns)
│   ├── qiTopologySeed (spirit veins, blessed lands, grotto-heavens)
│   └── ecologySeed (biomes, species distributions)
├── regionSeed (the Cangli Riverlands and neighbouring regions)
│   ├── watershedSeed (the Cangli River and its tributaries)
│   ├── settlementSeed (villages, towns, cities)
│   ├── lineageSeed (the Wang, Li, Lin, Hu, Xu lineages)
│   └── economySeed (markets, trade routes, salt licenses)
└── villageSeed (Wang Family Bend specifically)
    ├── householdSeed (the 31 households)
    │   └── npcSeed (per named individual)
    ├── buildingSeed (compounds, hall, mill, shrine)
    └── eventSeed (the village's history — floods, deaths, marriages, disputes)
```

This is the seed tree from doc 07 §1.1, extended to show the per-NPC leaf seeds (each named NPC has their own seed, derived from their household's seed).

### 6.2 The seed is in the save

```typescript
interface SaveFile {
  // ... (per doc 24 §1.5)
  seed: string;                  // the WorldSeed, hex
  generatorFingerprint: string;  // SHA-256 of (loreFingerprint + generatorVersions + pipelineDef)
  // ...
}
```

The save stores the WorldSeed (256-bit hex). Every child seed is derivable from the WorldSeed alone. This means: **a save can be reconstructed from the WorldSeed + the input log + the engine fingerprint.** The canonical state itself is also stored (so loading is fast), but it is *derivable* — a property used by the determinism verification.

### 6.3 The seed-replacement failure case

**Failure case (seed replacement):** The player wants to "fork" their world at tick T — take the world as it is and start a new save with a new seed from this point. The engine supports this via `exportWorldState()`, which produces a snapshot file containing the canonical state but a *new* seed. The new seed's first generation pass produces the *original* world (because the canonical state overrides the generator output); subsequent generations (new chunks, new settlements the player hasn't visited) use the new seed.

This is subtle: the new world has the original's explored areas but a different unexplored hinterland. The engine surfaces this honestly in the save dialog: "This is a forked world. Explored areas are preserved; unexplored areas will be regenerated from the new seed."

Rejected alternative: re-derive the explored areas from the new seed too. Rejected because (a) the new seed would produce a different geography, breaking continuity; (b) the player's history (which NPCs they killed, which fields they flooded) would be lost.

---

## 7. The lore-to-schema parser

### 7.1 The parser's job

The bible is 48 markdown files. The generators consume a Definition Database. The parser is the single path from one to the other:

```
corpus-extension/*.md
   ↓ parser (build step, not runtime)
parsed-schema.json + definitions.ts (the Definition Database)
   ↓ content-addressed by SHA-256 of the parsed output
fingerprint: 'a3b7c2...' (in the engine's fingerprint)
   ↓ generators consume
canonical state (the generated world)
```

### 7.2 The parser pipeline

```typescript
interface LoreParser {
  parse(markdownFiles: MarkdownFile[]): ParsedSchema;
}

interface ParsedSchema {
  definitions: Definition[];          // the concept graph (per src/lib/engine/definitions.ts)
  templates: Template[];              // concrete patterns
  rules: Rule[];                      // constraints
  sourceMap: SourceMap;               // for every definition, which doc + line it came from
  fingerprint: string;                // SHA-256 of the CBOR-serialized schema
  warnings: ParserWarning[];          // unparseable passages, ambiguities
}
```

The parser is implemented as a series of passes:

1. **Markdown AST** — parse each file into a syntax tree (headings, paragraphs, lists, code blocks).
2. **Definition extraction** — for each "## N — Title" section, extract the named concept. Hanzi in parentheses becomes `nameHanzi`. Tags from the doc's front-matter become `tags`.
3. **Relation extraction** — for each "X generates Y" or "X conquers Y" sentence, extract a typed relation. The relation vocabulary is small and explicit (PREREQUISITE_FOR, EVOLVES_INTO, GENERATES, CONQUERS, COUNTERED_BY, etc.).
4. **Template extraction** — code blocks marked ```template are parsed as Template specs.
5. **Rule extraction** — passages marked "must" or "always" become hard rules; "usually" or "often" become soft rules.
6. **Source-map construction** — every extracted entity records its source file + line range. This enables "click on a definition in the scene inspector → jump to the lore passage that defines it" (doc 23 §11.3 of the engine's editor surface).
7. **Fingerprint computation** — the schema is CBOR-serialized and SHA-256-hashed. The hash is the engine's `loreFingerprint`, included in the `DeterminismFingerprint` (doc 08).

### 7.3 The parser is a build step

The parser runs at build time, producing `parsed-schema.json` (the runtime database) and `definitions.ts` (the TypeScript type-narrowed view of the database). At runtime, the engine loads `parsed-schema.json` directly — no markdown parsing at runtime. This keeps the engine's startup fast (markdown parsing of 48 documents takes ~500 ms; loading a JSON file takes ~5 ms).

The build step is run by the asset pipeline (doc 11 §5) and the output is content-addressed. A change in the lore changes the schema's hash, which changes the engine's fingerprint, which invalidates old saves (per doc 24 §1.5). This is correct: a lore change means the generator produces a different world; an old save's state cannot be reproduced from the new lore.

### 7.4 The parser-failure case

**Failure case (parser):** A lore passage is unparseable (the sentence "the cultivator's anchor is sometimes qi, sometimes law, depending on perspective" appears in doc 24 §2.2 but the parser cannot extract a definition). The parser emits a `ParserWarning` with the file, line, and the unparseable passage. The build step surfaces all warnings at the end; the developer must resolve them (either by clarifying the lore or by extending the parser's vocabulary). The build does not fail on warnings, but the engine's CI fails if any warning is new since the last build.

This is the "exhibit reviewer voices" surface (AGENTS.md Part 3): the parser is the engine's reader of the lore, and its warnings are the engine's complaints about the lore's clarity.

### 7.5 The parser-rejection alternative

Rejected: write the definitions directly in TypeScript (skip the parser). Rejected because (a) the lore is the source of truth, and a TS-first approach would diverge from the prose over time; (b) the parser's source-map is what makes the lore navigable from the engine; (c) the parser's warnings are the engine's audit of the lore's coherence. The parser is the bridge between authored prose and engineered system; without it, the two drift.

---

## 8. Save vs regenerate — what is stored, what is regenerated

### 8.1 The rule

| State type | Stored in save? | Regenerated on load? |
|---|---|---|
| Generated canonical state (geography, settlements, NPCs, ecology) | No — regenerated from seed | Yes — from seed + definitions |
| Modified canonical state (terrain deltas, NPC deaths, marriage state) | Yes — delta log per doc 21 §8 | No — replayed from delta log |
| Player input log | Yes | Replayed to verify determinism |
| Rendered meshes, audio buffers, navmeshes | No | Regenerated from canonical state |
| Generator fingerprint, lore fingerprint, engine fingerprint | Yes | Used to refuse load if mismatched |

### 8.2 Why generated state is not stored

Generated state is **derivable** from `(seed, definitions, scope)`. Storing it would be redundant and would create two sources of truth (the stored state vs the regenerated state). The engine trusts the derivation: load = regenerate, then apply deltas, then replay inputs.

This is also a size optimisation: a generated world is megabytes of data; a seed is 256 bits. The save file contains the seed + the deltas + the input log — typically kilobytes for a fresh save, megabytes only after long play.

### 8.3 The regenerate-on-load failure case

**Failure case (regenerate-on-load):** Loading a save takes 30+ seconds because the entire world must be regenerated from the seed before the deltas can be applied. The fix: **lazy regeneration.** On load, only the player's immediate surroundings (a 256 m radius) are regenerated; the rest is regenerated lazily as the player explores. The delta log is filtered by `chunkId` / `entityId` so only the deltas relevant to the loaded region are applied. This brings load time down to ~2 seconds.

Rejected alternative: store the full canonical state in the save. Rejected because (a) it bloats the save to gigabytes, (b) it creates the two-sources-of-truth problem, (c) it removes the determinism verification (the regenerated state would not be checked against the stored state).

### 8.4 The fork-failure case

**Failure case (fork):** The player forks the world (§6.3). The new save has the original's explored areas but a different seed. When the player explores a new area, the generator runs with the new seed and produces different geography. But the *boundary* between explored and unexplored must be consistent — the village at the edge of the explored area must transition smoothly into the new geography. The fix: the generator accepts a `boundaryConstraints` parameter that specifies the explored boundary's geography, and the generator's output must match those constraints at the boundary. This is the same as doc 21's chunk-border-atomicity principle, applied at the generation layer.

---

## 9. The generator audit

### 9.1 What the generator produces is auditable

Every generated entity carries a `generatorAudit` field:

```typescript
interface GeneratorAudit {
  generatorId: string;        // 'ga:gen-settlement'
  generatorVersion: string;
  loreFingerprint: string;
  seed: string;
  parentSeed: string;
  stage: GeneratorStage;
  scope: GenerationScope;
  timestamp: number;          // tick at generation time
  outputHash: string;         // SHA-256 of the entity's CBOR
  sourceRefs: SourceRef[];    // which lore passages authorised this entity
}

interface SourceRef {
  docId: string;              // 'corpus-extension/04_MORTAL_SUBSTRATE.md'
  lineStart: number;
  lineEnd: number;
  excerpt: string;            // the relevant passage
}
```

Every generated NPC, building, field, and event can be traced back to the lore passage that authorised it. Click an NPC in the scene inspector (doc 23 §2.2) → see their `generatorAudit` → click a `sourceRef` → jump to the lore passage. This is the "Engage the primary source, not the secondary summary" principle (AGENTS.md Part 3) made operational: every generated thing has a citation.

### 9.2 The audit-failure case

**Failure case (audit):** A generated entity has no `sourceRefs`. This is a contract violation: the engine does not invent content; it derives content from the lore. The fix: the generator must produce at least one `sourceRef` per entity, or throw. Rejected alternative: allow entities with no source — would let the engine hallucinate content, breaking the lore-is-configuration principle.

---

## 10. Failure cases (consolidated)

1. **Hard rule violated during generation** — throws `GenerationConstraintFailed`; developer fixes lore or templates (§3.3).
2. **Cross-browser divergence in generator output** — determinism stack fix, not generator fix (§4.4).
3. **Eviction during visit** — canonical state preserved; only rendered representation evicted (§5.4).
4. **Forked world boundary inconsistency** — `boundaryConstraints` parameter (§8.4).
5. **Unparseable lore passage** — parser warning; CI fails on new warnings (§7.4).
6. **Load takes > 5 seconds** — lazy regeneration (§8.3).
7. **Generated entity has no source ref** — throws; contract violation (§9.2).
8. **Generator calls Math.random** — dev-mode throw (§2.2).
9. **Generator reads raw markdown at runtime** — type-system enforcement; only `DefinitionDatabase` is exposed (§2.3).
10. **Lore fingerprint mismatch on save load** — refused (per doc 24 §1.5).

---

## 11. Rejected alternatives

### 11.1 Hand-authored world (no generation)

Build Wang Family Bend by hand in Blender; place every NPC manually. Rejected because (a) the world is large (the Cangli Riverlands alone is 100 km²; the cosmos has multiple strata); (b) the genre demands replayability — different seeds produce different worlds; (c) the lore is the configuration, and configuration should generate, not be hand-placed (Ponytail §2).

### 11.2 LLM-based generation

Use a language model to generate the world from the lore. Rejected because (a) LLMs are non-deterministic across runs (same prompt → different output), violating the determinism contract; (b) LLMs hallucinate content not in the lore, violating the lore-is-configuration principle (§9.2); (c) LLM inference is too slow for streaming generation (§5). LLMs may be used in the *authoring* workflow (a writer uses an LLM to draft lore passages), but never in the *generation* pipeline.

### 11.3 One mega-generator

A single generator that takes the seed and produces the entire world. Rejected because (a) cannot be streamed — the whole world is generated at once; (b) cannot be invalidated incrementally — a lore change re-generates everything; (c) cannot be tested in isolation — a bug in any stage affects all stages. The eleven-stage pipeline (§1.1) is the modular alternative (Ponytail §4).

### 11.4 Storing generated state in the save

Rejected in §8.2 — creates two sources of truth, bloats the save, removes determinism verification.

### 11.5 Runtime markdown parsing

Parse the lore at engine startup. Rejected in §7.3 — too slow, mixes build-time and runtime concerns, exposes the parser's warnings to the player. The parser is a build step; the runtime loads the parsed schema.

---

## 12. What this document enables

- The generation pipeline has eleven stages, ordered by causal dependency, with invalidation flowing only to descendants.
- The generator plugin interface is pure: deterministic, definition-consuming, template-and-rule-driven.
- The seed hierarchy is a tree derived by keyed hashing from the WorldSeed; every node is reproducible from the root alone.
- Streaming generation is lazy: stages run as the player approaches; eviction unloads only the rendered representation, not the canonical state.
- Save files store the seed + delta log + input log; generated state is regenerated on load.
- The lore-to-schema parser is a build step; the runtime loads the parsed, fingerprinted schema; no markdown parsing at runtime.
- Every generated entity carries a `generatorAudit` with `sourceRefs` back to the lore — every generated thing is citable.
- Rejected alternatives (hand-authored, LLM-based, mega-generator, stored generated state, runtime parsing) are documented with reasons.

The next step is to extend `src/lib/engine/definitions.ts` into the full Definition Database, write the lore-to-schema parser against the existing 48 corpus documents, and implement `ga:gen-settlement` as the first generator plugin. The smallest end-to-end test: parse the lore → generate Wang Family Bend from a fixed seed → hash the output → re-generate → assert the hashes match. That is the gate.
