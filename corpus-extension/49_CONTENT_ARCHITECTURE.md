# 49 — Content Architecture: From Lore to Living Universe

**Status:** Foundation architecture. This is the bridge between the bible (authored lore) and the engine (procedural generation).
**Date:** 2026-08-03

---
**Truth level:** Derived (content architecture)
**Implements:** engine-architecture/51_MULTIVERSE_GROUND_TRUTH_ARCHITECTURE.md, corpus-extension/50_GROUND_TRUTH_SYSTEM_SPECIFICATION.md
**Implementation status:** [SPEC] — fully specified, implementation in progress

---

## Ground-Truth Annotation

> [CANON] Content organization follows the machine-readable counterpart standard (doc 50 §4). Each subject has prose plus JSON plus tests plus questions.

> [DERIVED] All measurements in this document use SI units (doc 52). Visual concepts follow the VTP schema (doc 51). Moving entities follow MotionProfiles (doc 55).

> [PROC] Instance-level details (exact NPC counts, specific tree placements, weather sequences) vary by seed within canonically-defined ranges.

> [UNRESOLVED] See /questions/ registry for open questions related to this document.

**Topic:** Content architecture and organization

---



## 0. What this document is

The bible has 47 documents, 16,160 lines of authored lore. The critic rated it 9.0+ for depth and coherence, 4/10 for content volume. The problem is not that we need to write more documents — it's that we need to build the SYSTEM that generates content from the documents.

This document defines the four-tier content architecture, the data schemas, the generator rule format, and the production targets. It is the blueprint for turning authored lore into a living universe.

---

## 1. The four-tier content architecture

### Tier 1: Definitions (authored concepts)

These are the fundamental authored concepts — the "Fire Essence," "Nascent Soul," "Tribulation Crossing" entries. Each definition is a deeply connected node in a semantic graph, not an isolated name.

**Target: 25,000 definitions** (currently ~500 across the bible)

Each definition has:
- `id` — stable identifier (e.g., `essence.fire`, `realm.nascent_soul`, `technique.burning_palm`)
- `kind` — category (metaphysical_essence, realm, technique, treasure, herb, beast, formation, talisman, pill, sect, location, culture, event, npc_role, etc.)
- `tags` — cross-cutting labels (material, elemental, destructive, healing, defensive, offensive, etc.)
- `opposes` — what this concept counters or is countered by
- `supports` — what systems this concept participates in (alchemy, combat, ecology, economy, cultivation, etc.)
- `environmentalEffects` — how this concept affects the world when present
- `compatibleForms` — what shapes/expressions this concept can take
- `acquisitionRules` — how this concept is obtained/learned/manifested
- `simulationHooks` — which engine systems query this definition
- `renderProfile` — which visual/audio profile to use
- `relations` — typed edges to other definitions (REQUIRES, PRODUCES, CONSUMES, COUNTERS, TRANSFORMS, etc.)

**Example: Fire Essence definition**

```typescript
{
  id: "essence.fire",
  kind: "metaphysical_essence",
  tags: ["material", "elemental", "destructive", "transformative", "yang"],
  opposes: ["essence.water", "essence.extreme_cold"],
  generates: ["essence.earth"],  // fire generates earth in wuxing
  conquers: ["essence.metal"],   // fire conquers metal in wuxing
  supports: ["alchemy", "artifact_refining", "body_tempering", "combat", "ecology"],
  environmentalEffects: [
    "increase_temperature",
    "alter_local_species_toward_fire_phase",
    "ignite_flammables",
    "thin_water_phase_qi",
    "strengthen_yang_dominant_practices"
  ],
  compatibleTechniqueForms: ["projectile", "aura", "domain", "weapon_imbuement", "body_enhancement"],
  compatiblePillRoles: ["catalyst", "active_ingredient", "purifier"],
  compatibleFormationRoles: ["energy_source", "offensive_node", "barrier_component"],
  acquisitionRules: ["comprehension", "inheritance", "natural_source_refinement", "vein_absorption"],
  simulationHooks: ["ecology", "weather", "combat", "economy", "cultivation", "deviation"],
  renderProfile: "essence_fire_standard",
  relations: [
    { type: "REQUIRES", target: "realm.qi_condensation", note: "minimum realm to consciously wield" },
    { type: "COUNTERS", target: "essence.metal", note: "fire conquers metal" },
    { type: "GENERATES", target: "essence.earth", note: "fire generates earth" },
    { type: "COUNTERED_BY", target: "essence.water", note: "water conquers fire" },
    { type: "ENHANCES", target: "technique.burning_palm", note: "phase-coherence bonus" },
    { type: "DEVIATION_RISK", target: "deviation.false_circuit", note: "fire-phase over-accumulation" }
  ]
}
```

### Tier 2: Templates (content families)

Templates describe families of content — the archetypes that generators combine and instantiate.

**Target: 8,000 templates** (currently ~0 — the bible has instances, not templates)

Each template has:
- `id` — stable identifier (e.g., `template.frontier_mountain_sect`)
- `kind` — what it generates (sect, ruin, beast, pill, formation, technique, settlement, culture, etc.)
- `slots` — variable components that the generator fills
- `constraints` — rules that govern slot-filling (e.g., "cold_region → ice/water phase only")
- `weight` — generation probability modifier
- `prerequisites` — what must exist before this template can instantiate
- `produces` — what definitions this template creates when instantiated

**Example: Frontier Mountain Sect template**

```typescript
{
  id: "template.frontier_mountain_sect",
  kind: "sect",
  slots: {
    phase_affinity: { type: "phase", constraint: "must_match_local_vein" },
    sect_master_name: { type: "name", constraint: "local_naming_convention" },
    sect_master_realm: { type: "realm", constraint: "qi_condensation_to_core_formation" },
    spirit_vein: { type: "vein_ref", constraint: "must_exist_in_region" },
    disciple_count: { type: "int", constraint: "20-50" },
    signature_technique: { type: "technique_ref", constraint: "must_match_phase" },
    grotto_heaven: { type: "grotto_ref", constraint: "optional, 30% chance" },
    current_conflict: { type: "conflict_ref", constraint: "from_conflict_pool" }
  },
  constraints: [
    "phase_affinity must match the dominant phase of the local spirit vein",
    "sect_master_realm must be at least one tier above the vein's output tier",
    "if grotto_heaven present, disciple_count increases by 50%",
    "signature_technique must have phase_affinity matching sect phase_affinity"
  ],
  weight: 1.2, // frontier mountain sects are slightly more common
  prerequisites: ["at least one spirit vein in region", "mortal settlement within 50 li"],
  produces: ["sect instance", "npc instances (sect master + disciples)", "technique instance (signature)"]
}
```

### Tier 3: Generator rules (how definitions and templates combine)

These determine how definitions and templates combine to produce coherent content.

**Target: 3,000 generator rules** (currently ~0)

Each rule has:
- `id` — stable identifier
- `condition` — when this rule applies
- `effect` — what it does
- `priority` — override order
- `scope` — what generation stage it applies to

**Example: Cold-region sect rule**

```typescript
{
  id: "rule.cold_region_sect_phase",
  condition: "region.climate == 'cold' || region.climate == 'frozen'",
  effect: "sect.phase_affinity ∈ ['water', 'metal', 'earth'] with weights [0.5, 0.3, 0.2]",
  priority: 10,
  scope: "settlement_generation"
}
```

**Example: Fire vein ecology rule**

```typescript
{
  id: "rule.fire_vein_ecology",
  condition: "vein.phase == 'fire' && vein.tier >= 2",
  effect: [
    "increase fire_phase_beast_spawn_rate by 3x",
    "increase fire_phase_herb_spawn_rate by 2x",
    "decrease water_phase_beast_spawn_rate by 0.5x",
    "enable fire_phase_mineral_generation",
    "if region.temperature < 20°C, increase ambient temperature by vein.tier * 2°C"
  ],
  priority: 15,
  scope: "ecology_generation"
}
```

### Tier 4: Runtime instances (generated during play)

These are produced during world generation and play. They are NOT authored — they are generated from definitions + templates + rules.

**Scale: millions** (NPCs, locations, items, events)

The generator produces:
- Named sects (from sect templates + region definitions + vein definitions)
- Named NPCs (from NPC templates + culture definitions + relationship rules)
- Named techniques (from technique grammar + phase definitions + sect definitions)
- Named treasures (from treasure templates + material definitions + history rules)
- Named locations (from location templates + geography definitions + ecology rules)
- Historical events (from event templates + faction definitions + timeline rules)

---

## 2. The generation pipeline

```
World Seed (256-bit)
   ↓
Cosmology Generator (consumes: doc 36, 37, 48)
   → Stratum topology, spirit vein network, grotto-heaven anchors, Law Reach placement
   ↓
World / Realm Generator (consumes: doc 36, 42)
   → Continent shapes, mountain ranges, river systems, climate bands, ocean currents
   ↓
Region Generator (consumes: doc 04, 33, 42)
   → Regional geography, biomes, settlement sites, resource deposits, danger zones
   ↓
Culture + Faction Generator (consumes: doc 04, 12, 20, 25)
   → Cultures (naming systems, calendars, customs, taboos, architecture styles)
   → Factions (sects, lineages, guilds, courts, alliances)
   ↓
Settlement + Ecology Generator (consumes: doc 04, 14, 33, 34)
   → Settlements (villages, towns, cities with buildings, NPCs, schedules)
   → Ecology (food webs, beast populations, herb stands, mineral deposits)
   ↓
NPC + History Simulation (consumes: doc 26, 28, 34, 37)
   → NPC life courses (birth, education, marriage, cultivation, death)
   → Historical events (wars, migrations, discoveries, sect collapses, beast tides)
   ↓
Persistent World Database (SQLite-WASM + OPFS)
   → All generated state, queryable, hashable, saveable
   ↓
Streaming / Relevance Layer (consumes: doc 07, 17)
   → Fidelity tier assignment (S0-S4) per entity per frame
   → Asset loading/unloading by hash
   ↓
Three.js Scene Representation
   → Only nearby entities become full Object3Ds
   → Distant entities are database records + coarse simulation
```

---

## 3. The technique grammar (example of a generator)

The technique generator produces named techniques from components:

```typescript
interface TechniqueGrammar {
  // Components
  power_source: Definition[];      // qi, anchor, domain-qi, place-qi, Precelestial-qi, ran
  delivery_method: Definition[];   // palm, fist, sword, finger, breath, gaze, domain, law
  targeting_form: Definition[];    // single-target, area, cone, sphere, line, self, domain-wide
  phase: Definition[];             // wood, fire, earth, metal, water (or balanced)
  secondary_effect: Definition[];  // burn, freeze, poison, knockback, stun, pierce, drain, heal
  movement_geometry: Definition[]; // forward thrust, circular sweep, upward slash, downward crush, projectile, wave
  range: Definition[];             // touch, short (2m), medium (10m), long (50m), domain (100m+)
  duration: Definition[];          // instant, sustained, persistent, permanent
  cost: Definition[];              // low qwu, medium qwu, high qwu, reservoir-percentage, heart-mind, lifespan
  risk: Definition[];              // none, deviation_risk, reservoir_drain, meridian_strain, heart_mind_perturbation
  realm_requirement: Definition[]; // mortal, qi_induction, qi_condensation, ..., mahayana
  visual_style: Definition[];      // flame, ice_crystal, metal_shard, wood_vine, water_wave, void_distortion, law_inscription
  cultural_origin: Definition[];   // sect_id, region_id, lost_civilization_id
  upgrade_path: Definition[];      // technique_id[] (what this technique can evolve into)
}
```

**Generator rule: technique coherence**

```
CONSTRAINT: phase == fire → visual_style ∈ [flame, ash, smoke, ember, lava]
CONSTRAINT: delivery_method == sword → movement_geometry ∈ [thrust, slash, sweep, pierce, parry]
CONSTRAINT: realm_requirement >= core_formation → range can be "domain"
CONSTRAINT: secondary_effect == heal → phase ∈ [wood, water] (fire/metal cannot heal directly)
CONSTRAINT: power_source == anchor → realm_requirement >= nascent_soul
CONSTRAINT: cost == lifespan → risk must include "heart_mind_perturbation"
CONSTRAINT: cultural_origin == sect.x → phase must match sect.phase_affinity
```

This grammar can describe 25 × 12 × 10 × 8 × 10 × 6 × 8 × 10 × 6 × 4 × 10 × 8 × 10 = **billions of combinations** — but the constraints reduce this to thousands of coherent, balanced techniques. The generator produces techniques that FEEL authored because they follow the same rules a human author would follow.

---

## 4. The NPC simulation record

The authoritative NPC is NOT a Three.js Object3D. It is a simulation record:

```typescript
interface NpcState {
  // Identity
  id: bigint;
  name: string;
  appearanceSeed: bigint;
  cultureId: string;

  // State
  locationId: bigint;
  realmId: string;           // cultivation station
  age: number;
  health: HealthState;
  qiState: QiState;          // reservoir, phase-affinity, yin-yang, contamination
  heartMind: HeartMindState; // attention, will, emotional_balance, unresolved_attachments

  // Social
  factionId?: bigint;
  householdId?: bigint;
  relationships: RelationshipRecord[];
  goals: GoalState[];
  memories: MemoryRecord[];

  // Procedural
  inventorySeed: bigint;
  scheduleSeed: bigint;
  simulationTier: SimulationTier; // S0-S4

  // Determinism
  rngStream: string; // hex — the NPC's deterministic RNG substream
}

interface RelationshipRecord {
  targetId: bigint;
  type: "kin" | "teacher" | "student" | "rival" | "ally" | "enemy" | "spouse" | "debtor" | "creditor" | "sworn_brother";
  strength: number;     // 0-100
  sentiment: number;    // -100 to 100 (hatred to love)
  history: EventRef[];  // key events that shaped this relationship
}

interface GoalState {
  type: "seek_master" | "recruit_disciple" | "breakthrough" | "avenge" | "protect_family" |
        "steal_inheritance" | "establish_sect" | "find_herb" | "kill_rival" | "repay_debt" |
        "comprehend_dao" | "survive_tribulation" | "author_law" | "tend_place" | "wander";
  targetId?: bigint;
  priority: number;
  status: "active" | "blocked" | "completed" | "abandoned";
  deadline?: number; // tick
}

interface MemoryRecord {
  tick: number;
  type: "combat" | "social" | "cultivation" | "loss" | "discovery" | "betrayal" | "kindness" | "failure";
  summary: string;          // generated text
  emotionalWeight: number;  // affects heart-mind state
  participants: bigint[];
  locationId: bigint;
}
```

**Simulation tier transitions:**

```
S4 (Detailed) — full AI, physics, animation, rendering, schedule
    ↓ player moves away
S3 (Interactive) — full state machine, reduced frequency, no rendering
    ↓ player leaves region
S2 (Regional) — aggregate state, scheduled updates, no individual AI
    ↓ region not visited for N ticks
S1 (Historical) — demographic aggregate only
    ↓ region never visited
S0 (Dormant) — frozen state, scheduled wake on player approach
```

---

## 5. The definition schema (TypeScript)

```typescript
// The universal definition interface — every authored concept implements this
interface Definition {
  id: string;                    // stable, namespaced (e.g., "essence.fire")
  kind: DefinitionKind;
  name: string;                  // display name
  nameHanzi?: string;            // Chinese characters
  tags: string[];                // cross-cutting labels
  description: string;           // authored prose
  source: string;                // which bible document, section
  
  // Relations — the connective tissue
  relations: Relation[];
  
  // System participation
  simulationHooks: SimulationHook[];
  renderProfile?: string;
  
  // Generator participation
  templates: string[];           // which templates reference this definition
  generatorRules: string[];      // which rules reference this definition
  
  // Versioning
  version: string;
  fingerprint: string;           // hash of the definition's content
}

type DefinitionKind =
  | "metaphysical_essence"    // qi, phases, yin-yang, ran
  | "realm"                   // cultivation stations
  | "technique"               // combat techniques
  | "cultivation_practice"    // non-combat practices
  | "treasure"                // weapons, artifacts, tools
  | "herb"                    // spirit herbs
  | "beast"                   // spirit beasts, yao
  | "mineral"                 // spirit stones, ores
  | "formation"               // formation patterns
  | "talisman"                // talisman patterns
  | "pill"                    // pill recipes
  | "forging_recipe"          // weapon forging
  | "manual"                  // cultivation manuals
  | "sect"                    // sect definitions
  | "lineage"                 // lineage definitions
  | "location"                // geographic locations
  | "culture"                 // cultural systems
  | "npc_role"                // NPC behavior archetypes
  | "event"                   // historical event types
  | "deviation"               // deviation types
  | "institution"             // courts, alliances, academies
  | "law"                     // cosmic laws
  | "cosmological_feature"    // strata, reaches, wilds
  | "skill"                   // non-combat skills
  | "status_effect"           // buffs, debuffs, conditions
  | "custom";

interface Relation {
  type: "REQUIRES" | "PRODUCES" | "CONSUMES" | "COUNTERS" | "TRANSFORMS" |
        "ENHANCES" | "INHIBITS" | "EVOLVES_INTO" | "VARIANT_OF" |
        "OPPOSES" | "GENERATES" | "CONQUERS" | "COUNTERED_BY" |
        "COMPATIBLE_WITH" | "INCOMPATIBLE_WITH" | "PREREQUISITE_FOR";
  target: string;               // definition id
  note?: string;
  weight?: number;              // for probabilistic relations
}

type SimulationHook =
  | "ecology" | "weather" | "combat" | "economy" | "cultivation"
  | "deviation" | "social" | "history" | "rendering" | "audio"
  | "physics" | "perception" | "save" | "migration" | "trade"
  | "politics" | "ritual" | "disease" | "aging" | "reproduction";
```

---

## 6. Production targets

### Phase 1: Early complete prototype (6,000-10,000 definitions)

| Domain | Target definitions | Target templates | Target rules | Source |
|---|---|---|---|---|
| Cosmology & topology | 200 | 20 | 50 | Docs 00, 15, 36, 48 |
| Geology, climate, biomes | 300 | 50 | 100 | Docs 04, 33, 36 |
| Ecology (flora, fauna, resources) | 800 | 100 | 150 | Docs 14, 33 |
| Cultivation (realms, paths, bottlenecks) | 300 | 30 | 80 | Docs 03, 27, 30 |
| Dao, laws, metaphysics | 200 | 10 | 30 | Docs 00, 24, 44 |
| Combat (techniques, status effects) | 500 | 80 | 100 | Docs 13, 32, 49 |
| Treasures & equipment | 800 | 100 | 80 | Doc 50 |
| Alchemy, formations, talismans, forging | 1,000 | 150 | 120 | Docs 16, 35, 51 |
| Cultures, factions, politics | 400 | 50 | 80 | Docs 04, 12, 20, 25 |
| Economy, professions, markets | 300 | 40 | 60 | Doc 18 |
| NPC roles, motives, memories | 500 | 80 | 100 | Docs 28, 34 |
| Settlements, architecture, ruins | 400 | 60 | 80 | Docs 04, 19 |
| History, events, rumors | 500 | 50 | 80 | Docs 37, 28 |
| Languages, names, visual culture | 200 | 30 | 50 | Doc 04 |
| Animation, VFX, audio, feedback | 300 | 40 | 60 | Docs 05, 23 |
| Simulation rules & generation metadata | 0 | 0 | 200 | This doc |
| **Total** | **~6,700** | **~800** | **~1,470** | |

### Phase 2: Strong full game (18,000-30,000 definitions)

Triple the Phase 1 targets. Add:
- All 5 continents' full ecology (4x current)
- All 14 great sects' full rosters (14x current)
- All 5 holy lands' full depth (5x current)
- 250+ named techniques across all 10 stations
- 200+ named treasures
- 80+ pills, 50+ formations, 50+ talismans, 20+ forging recipes
- 40+ cultivation manuals
- 200+ named beasts, 150+ named herbs
- Full NPC behavior system (desires, fears, loyalties, action policies)
- Full history generator (wars, migrations, sect collapses, beast tides)
- Full economy simulator (supply, demand, trade routes, price formation)

### Phase 3: Encyclopedic (30,000-50,000 definitions)

The long tail. Every named technique, every beast variant, every herb phase-variant, every cultural custom, every architectural style. The point of diminishing returns where stronger generators and better interactions produce more value than adding more definitions.

---

## 7. What this means for the bible

The 47 existing bible documents are the **source material** for definitions, not the definitions themselves. The next step is to build a **parser** that converts the bible's prose into structured definitions:

```
Bible prose: "Fire-phase qi is hot, bright, and pressing. It generates earth and conquers metal."
    ↓ Parse
Definition: { id: "essence.fire", tags: ["hot","bright","pressing","yang"], generates: ["essence.earth"], conquers: ["essence.metal"] }
```

This is the lore-to-schema parser specified in doc 17 §10 #4 — the single largest unbuilt subsystem. It is now the highest priority.

### Mapping existing documents to definition categories

| Bible document | Definitions to extract | Estimated count |
|---|---|---|
| 00 Foundational Decisions | Cosmology, realms, qi model, karma, anchor | ~80 |
| 03 Realm Ladder | 10 station definitions + verbs | ~50 |
| 04 Mortal Substrate | Locations, households, NPCs, calendar, economy | ~200 |
| 05 Phenomenology | Perception modes, deviation types, experience states | ~30 |
| 06 Golden Scenes | Event templates, scene structures | ~25 |
| 12 Sect Institutions | Institution types, oath types, ranking systems | ~60 |
| 13 Combat Grammar | Combat states, transitions, frame data, injury types | ~80 |
| 14 Ecology | Beast types, herb types, qi climate patterns | ~100 |
| 15 Precelestial | Courts, reaches, wilds, tribulation forms | ~60 |
| 16 Crafts | Formation types, talisman types, pill types | ~80 |
| 25 Folk Religion | Ghost types, spirit types, yao types, demonic types | ~50 |
| 26 Narrative Spine | Event templates, ending definitions | ~30 |
| 27 Cultivation Systems | Breakthrough stages, bottleneck types, dantian, roots | ~60 |
| 32 Power Scaling | Technique definitions (23), injury definitions, phase routing | ~100 |
| 33 Cangwu Mountains | Beast definitions (15), herb definitions (14), locations | ~50 |
| 34 Named NPCs | NPC role definitions, companion archetypes | ~40 |
| 35 Craft Catalog | Formation defs (6), talisman defs (10), pill defs (9) | ~25 |
| 36 Cosmic Geography | Stratum defs, interface defs, travel-grammar defs | ~40 |
| 37 Cosmic History | Epoch defs, event defs, civilization defs | ~50 |
| 38 Courts of Heaven | Minister defs, faction defs, office defs | ~40 |
| 39 Mahayana Pantheon | 9 Mahayana defs, Dao defs, law defs | ~30 |
| 40 Law Reaches | 9 reach defs | ~10 |
| 41 Spirit Wilds | Region defs, being defs, inheritance defs | ~40 |
| 42-43 Continents & Sects | Location defs, sect defs, holy land defs | ~100 |
| 44 Dao & Origin | Dao defs, Origin defs, touching defs | ~20 |
| 45 Stations 6-10 Content | Place defs, being defs, conflict defs | ~60 |
| 46 Ancestral Courts | Court defs, ancestor defs | ~30 |
| 47 Cosmic Economy | Resource defs, currency defs | ~30 |
| 48 Higher Immortal Worlds | Higher realm defs, ran-substrate defs | ~40 |
| **Total from existing bible** | | **~1,500** |

1,500 definitions from 16,160 lines of bible. The target is 25,000. The gap is 23,500 definitions — which means the bible needs to grow by ~15x, OR the generator rules need to produce the remaining definitions procedurally from the 1,500 seeds.

The answer is both: grow the bible's authored definitions to ~6,000-10,000 (Phase 1 target), and write generator rules that produce the remaining ~15,000-19,000 from combinations of the authored seeds.

---

## 8. The constraint system (why quality > quantity)

The critic's key insight: "Procedural quality comes from constrained possibility, not unrestricted randomness."

The constraint system is the set of rules that prevent the generator from producing incoherent content. Examples:

```
CONSTRAINT: A slaughter-phase technique cannot produce healing effects.
CONSTRAINT: A soul-targeting technique requires soul perception (Core Formation+).
CONSTRAINT: A persistent world-scale effect requires an anchor or continued power source.
CONSTRAINT: A mortal technique cannot directly manipulate time.
CONSTRAINT: Techniques from the same culture share naming, movement, and visual conventions.
CONSTRAINT: A cold-region sect favors ice, water, and preservation arts.
CONSTRAINT: A fire-phase vein increases fire-aligned beasts, ores, and disasters.
CONSTRAINT: A defensive formation must have: energy source, boundary, trigger, effect, failure condition.
CONSTRAINT: A pill's ingredients must be phase-compatible (wuxing generation/conquest cycles).
CONSTRAINT: An NPC's goals must be consistent with their realm, culture, and relationships.
CONSTRAINT: A sect's signature technique must match the sect's phase affinity.
CONSTRAINT: A historical event must have: cause, actors, intent, method, cost, witnesses, consequences.
CONSTRAINT: A beast's ecology must include: habitat, diet, predators, reproduction, cultivation path.
```

These constraints are the difference between a random name generator and a world generator. 3,000 well-written constraints will produce a more convincing universe than 100,000 disconnected names.

---

## 9. What this document enables

This document is the pivot from lore-writing to system-building. The next steps are:

1. **Build the definition database** — extract ~1,500 definitions from the existing bible using the parser
2. **Write the template library** — 800 templates for Phase 1
3. **Write the constraint/rules library** — 1,500 rules for Phase 1
4. **Build the generator pipeline** — the code that runs definitions + templates + rules to produce runtime instances
5. **Build the NPC simulation** — the system that gives NPCs goals, memories, relationships, and action policies
6. **Build the history generator** — the system that produces coherent historical events with persistent consequences
7. **Build the economy simulator** — the system that models supply, demand, trade, and price formation
8. **Build the ecology simulator** — the system that models food webs, populations, and cascades

Each of these is a plugin in the engine architecture (doc 17). Each consumes definitions and produces runtime instances. Each obeys the determinism contract.

The bible is the seed. The content architecture is the soil. The engine is the gardener. The universe is the harvest.
