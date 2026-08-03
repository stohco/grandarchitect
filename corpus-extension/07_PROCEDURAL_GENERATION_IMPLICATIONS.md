# 07 — Procedural Generation Implications

**Status:** Candidate canon. The generator specification extracted from documents 00-06.
**Date:** 2026-08-03

---

## 0. What this document is for

Every piece of lore in documents 00-06 has a procedural implication. This document extracts them into a single specification so a programmer could begin building the generator. It is organized by generator system, not by lore document, because the generator must produce a coherent world, not a set of disconnected features.

For each system, this document specifies:
- **Inputs** — what the generator takes (seed, parameters, dependencies)
- **Outputs** — what the generator produces (entities, state, geometry)
- **Determinism requirements** — what must be reproducible
- **Three.js implications** — what the renderer needs

---

## 1. The world generator

### 1.1 The seed hierarchy

The world is generated from a hierarchical seed:

```
WorldSeed (256-bit, from player or fixed)
├── CosmosSeed (deterministic derivation)
│   ├── StrataSeed (Precelestial / Acquired / Mortal)
│   ├── LawSeed (the local laws of the Acquired Stratum)
│   └── TribulationSeed (the tribulation patterns)
├── WorldSeed (the specific planet-scale world in the Mortal Stratum)
│   ├── GeographySeed (terrain, rivers, mountains, coast)
│   ├── ClimateSeed (temperature, rainfall, monsoon patterns)
│   ├── QiTopologySeed (spirit veins, blessed lands, grotto-heavens)
│   └── EcologySeed (biomes, species distributions)
├── RegionSeed (the Cangli Riverlands and neighboring regions)
│   ├── WatershedSeed (the Cangli River and its tributaries)
│   ├── SettlementSeed (villages, towns, cities)
│   ├── LineageSeed (the Wang, Li, Lin, Hu, Xu lineages)
│   └── EconomySeed (markets, trade routes, salt licenses)
└── VillageSeed (Wang Family Bend specifically)
    ├── HouseholdSeed (the 31 households)
    ├── NPCTreeSeed (the named individuals, their kinship, their states)
    ├── BuildingSeed (the compounds, the hall, the mill, the shrine)
    └── EventSeed (the village's history — floods, deaths, marriages, disputes)
```

**Determinism requirement:** Every node in this tree is derived deterministically from its parent via a keyed hash (SHA-256 of parent seed + node name). The same WorldSeed always produces the same world. Changing any parameter at a node re-derives only its subtree.

**RNG:** xoshiro256** initialized from each seed (split into 4 × 64-bit words). Substreams derived via splitmix64. (Per the Three.js research — no adequate library exists; implement inline, ~40 lines.)

### 1.2 Outputs

The world generator produces, at the village level (the prototype's scope):

**Geographic entities:**
- River segment (geometry, flow direction, fordability, flood history)
- Levee (geometry, maintenance state, failure history)
- Path network (nodes, edges, surface type, traffic)
- Paddy plots (100-300, each with: geometry, ownership, tenancy, crop state, water level, soil quality)
- Dryland gardens (geometry, ownership, crops)
- Graveyard hill (geometry, orientation, ownership, graves)

**Built entities:**
- Lineage hall (geometry, orientation, ownership, sub-rooms, ancestor tablets, qi-residue density)
- Households (20-40, each a compound with: gate, courtyard, main house, side houses, kitchen, pigsty-latrine, well)
- Communal well (geometry, depth, water quality, social state)
- Threshing ground (geometry, surface, current use)
- Mill (geometry, power source, ownership, operational state)
- Spirit shrine (geometry, dedicated deity, maintenance state, incense state)

**Social entities:**
- Lineages (1-3, each with: members, hall, fields, genealogy, rules, elder council)
- Households (20-40, each with: members, holding, obligations, production, consumption, strategy)
- Named individuals (100-300, each with: name, age, sex, kinship, health, skills, obligations, qi-state, psychospiritual state)
- Institutions (lineage, village council, baojia, state)

**Economic entities:**
- Markets (the market town, with: schedule, goods, prices, traders)
- Trade routes (river, road, with: traffic, goods, risks)
- Salt license (holder, terms, price)
- Currency state (cash/silver/grain ratios, price fluctuations)

**Ecological entities:**
- Crops (rice, wheat, rapeseed, vegetables, hemp, mulberry, with: growth state, yield, disease)
- Animals (pigs, chickens, water buffalo, with: population, health, ownership)
- Wild ecology (fish, birds, insects, with: populations, seasonal patterns)
- Disease (schistosomiasis, malaria, TB, smallpox, with: prevalence, infection state)

**Qi entities:**
- Ambient qi (per location, with: density, phase-affinity, yin-yang signature, flow, contamination)
- Spirit veins (if any, with: location, density, phase, accessibility)
- Qi-residue (per significant event, with: location, nature, age, intensity, fade schedule)
- Ancestor tablet qi (in the lineage hall, accumulated density)

### 1.3 Three.js implications

- **Terrain:** The village terrain is a small (~200m × 200m) heightmap, generated from the GeographySeed. Rendered as a single mesh with detail. The river is a shader-animated plane. The paddies are instanced sub-meshes with water-level and crop-growth state.
- **Buildings:** Modular glTF assets (gate, courtyard, main house, side house, kitchen, pigsty-latrine, well), instanced with per-instance variation (roof color, wall material, weathering). The lineage hall is a hero asset (higher detail, custom geometry).
- **NPCs:** InstancedMesh for distant/background NPCs (up to 100 visible at once). Full skinned meshes for interactable NPCs (~10-20 at a time). Each NPC has a persistent state (location, activity, qi-state, relationship to player).
- **Vegetation:** Instanced grass and crops (per paddy), instanced trees (around the village), with wind animation (GPU compute on WebGPU, vertex shader on WebGL2).
- **Water:** The river is a plane with flow shader. The paddies are planes with water-level state. Rain is a particle system. Flood is a geometry/water-level change.
- **Weather:** Particle systems for rain, snow, fog. Post-processing for atmosphere (haze, depth-of-field). Sun/moon/stars keyed to the solar term calendar.

---

## 2. The NPC generator

### 2.1 The individual

Every named individual is generated with:

- **Identity:** name (generated from the lineage's naming rules), sex, birth date, kinship relations (parents, siblings, spouse, children)
- **Body:** age, health state (disease, injury, disability), qi-state (reservoir, meridians, phase-affinities, yin-yang signature, contamination), psychospiritual state (emotional conditions, unresolved attachments, 心魔 risk)
- **Skills:** labor skills (farming, weaving, carpentry, etc.), literacy, cultivation level (if any)
- **Social:** household membership, lineage membership, obligations (tax, rent, corvée, lineage dues, debts, ritual), relationships (with every other named individual, tracked as a relationship state)
- **Strategy:** the NPC's current goals and plans (marry off a daughter, save for a pig, seek a teacher, avenge a slight)

### 2.2 The daily schedule

Every NPC has a daily schedule keyed to the solar term:

- **Pre-dawn (卯時, 5-7 AM):** rise, draw water, cook breakfast, feed animals
- **Morning (辰時, 7-9 AM):** eat, begin labor (paddy, dryland, workshop, market)
- **Mid-morning (巳時, 9-11 AM):** labor continues
- **Noon (午時, 11 AM-1 PM):** rest, eat, socialize (the communal well is the social center)
- **Afternoon (未時, 1-3 PM):** labor resumes
- **Late afternoon (申時, 3-5 PM):** labor winds down, children return from school
- **Evening (酉時, 5-7 PM):** cook dinner, eat, household tasks (weaving, repairs)
- **Night (戌時, 7-9 PM):** socialize, lineage affairs (if scheduled), sleep
- **Deep night (亥時-寅時, 9 PM-5 AM):** sleep

The schedule varies by season (longer labor hours in Mangzhong, shorter in Major Cold), by weather (indoor work in rain), by household role (women weave in the evening, men repair tools), and by individual circumstance (the sick rest, the grieving withdraw).

### 2.3 The life course

NPCs age, marry, have children, fall ill, recover, and die. The life course is generated lawfully:

- **Birth:** conception (lawful, within marriage or not), gestation, birth (with child mortality risk)
- **Childhood:** growth, disease risk, education (if lineage member, at the school), play
- **Adolescence:** labor begins, marriage negotiations begin (for girls, early; for boys, later), apprenticeship (if a trade)
- **Adulthood:** marriage, household establishment, children, labor, lineage obligations
- **Old age:** declining labor, dependency on children, ritual authority (the elderly preside at rites)
- **Death:** by disease, injury, old age, or (rarely) violence. Funeral rites. Transition to ancestor status (tablet installed, genealogy updated).

### 2.4 Three.js implications

- **NPC rendering:** InstancedMesh for background NPCs (simple geometry, no animation). Full skinned meshes for interactable NPCs (skeletal animation, facial animation for dialogue).
- **NPC AI:** The schedule is a state machine, not a behavior tree. Each NPC has a current state (location, activity) and transitions based on time, weather, relationships, and events. The state machine is deterministic (same seed + same inputs = same behavior).
- **NPC persistence:** Every NPC's state is persisted. The simulation tracks ~180 villagers, but only ~30-50 are "active" (simulated in detail) at any time; the rest are "dormant" (their state advances by schedule, but their individual actions are not simulated). This is the F0-F4 fidelity tier system, applied at the NPC level.

---

## 3. The qi generator

### 3.1 Ambient qi

Every location in the world has an ambient qi state:

- **Density:** how much qi is present (thin in mortal areas, dense in sacred places)
- **Phase-affinity:** the dominant phase (wood in forests, water in rivers, fire in volcanic areas, metal in mines, earth in mountains)
- **Yin-yang signature:** the polarity (yin in cold/dark/still places, yang in hot/bright/active places)
- **Flow:** how the qi moves (along rivers, up from spirit veins, down from the sun, still in accumulated places)
- **Contamination:** what's wrong with it (metal-contaminated near ironworks, grief-stained near murder sites, stagnant in diseased areas)

The ambient qi is generated from the GeographySeed + EcologySeed + EventSeed. It changes with time (day/night, season), weather (rain clears some contamination, concentrates others), and events (a death stains the location with grief-residue; a rite purifies the lineage hall).

### 3.2 Qi-residue

Every significant event leaves a qi-residue:

- **Motion:** a person walking through leaves a faint trace of their passage (phase, yin-yang, intent)
- **Emotion:** a strong emotion felt at a location leaves a residue (grief, anger, joy, fear)
- **Violence:** a fight leaves a residue (the qi discharged, the injuries inflicted, the intent)
- **Rites:** a rite leaves a residue (the incense, the intention, the lineage's accumulated presence)
- **Death:** a death leaves a residue (the departing anchor's trace, the survivors' grief)

Each residue has:
- **Location** (precise)
- **Nature** (what kind of residue)
- **Intensity** (how strong)
- **Age** (how long since the event)
- **Fade schedule** (how it diminishes over time — motion fades in hours, violence in days, rites in months, death in years, lineage accumulation in generations)

### 3.3 Three.js implications

- **Ambient qi rendering:** Not a visual overlay. A cross-modal perception (per Phenomenology §1.6): post-processing (depth, chromatic, volumetric), audio (resonance, sub-bass), haptics (if supported). Rendered only when the player is in "sense qi" mode.
- **Qi-residue rendering:** When the player "reads residue" at a location, the residue is rendered as a faint, location-bound effect — a shimmer, a color-quality, a sound. The effect's intensity reflects the residue's intensity; the effect's nature reflects the residue's type.
- **The qi layer is a separate render pass,** toggled by the player's perception mode. It does not modify the base scene; it adds a perception layer on top.

---

## 4. The event generator

### 4.1 Scheduled events

The solar term calendar (document 04 §3.1) and the festival calendar (§3.3) produce scheduled events:

- **Agricultural events:** plowing, transplanting, weeding, harvesting, milling — keyed to the terms
- **Ritual events:** spring and autumn ancestor rites, Qingming tomb-sweeping, Spirit Festival offerings, winter solstice genealogy update — keyed to the terms and festivals
- **Market events:** the market town's 1-6 schedule — keyed to the lunar calendar
- **Weather events:** plum rain, thunderstorms, first frost, first snow — keyed to the terms with deterministic variation

### 4.2 Generated events

Beyond the scheduled, the generator produces:

- **Household events:** marriages (negotiated, with betrothal gifts and dowries), births (with child mortality), deaths (by disease, old age, injury), disputes (heard by the elder council), migrations (a son leaves for the county, a daughter marries out)
- **Village events:** floods (the levee fails), fires (a compound burns), bandits (a group passes through), yamen runners (the state appears), epidemics (smallpox, malaria outbreak)
- **Cultivation events:** a traveling cultivator passes through (may teach, may rob, may ignore), a spirit beast is sighted in the hills, a tribulation is seen in the distance (a Core Formation cultivator crossing)
- **Personal events (for the player):** the sibling's death (a generated event based on the disease regime), the first teacher encounter, the first duel, the breakthrough attempts

### 4.3 Three.js implications

- **Events are state changes, not cutscenes.** A flood is a water-level change in the paddies and river, with NPC reactions (running, evacuating, repairing). A marriage is a gathering at the lineage hall, with specific NPCs present and specific rites performed. A bandit attack is a combat encounter, with the bandits as NPCs and the villagers reacting.
- **Events are witnessed.** The village's NPCs are present for events and remember them. A flood 11 years ago is still discussed; a marriage 5 years ago is still remembered; a death is mourned for years. The event generator must produce not just the event but the memory of the event.

---

## 5. The cultivation generator

### 5.1 The player's qi-system

The player's qi-system is generated from the VillageSeed + NPCTreeSeed:

- **Meridian layout:** a unique topology of meridian paths, gates, and reservoirs. Different layouts favor different routings. The player learns their layout over time.
- **Phase-affinities:** a vector of sensitivity, admission, and conversion rates for each of the five phases. Develops over time with practice.
- **Yin-yang signature:** the player's baseline polarity. Affects which practices are easier.
- **Spiritual roots (靈根):** the developing topology of access and discrimination (per document 00 §6). Not a fixed score; a developable profile.
- **Reservoir capacity:** the amount of qi the player can hold. Develops with practice.
- **Psychospiritural baseline:** the player's emotional tendencies, attachment patterns, and 心魔 risk factors. Develops with experience.

### 5.2 The protagonist advantage

The protagonist's Residual Error Sense (per document 00 §5) is a generated trait:

- **The player perceives their own qi-residue more faithfully than ordinary cultivators.** Mechanically: when the player attempts a practice and reviews the attempt, the residue they perceive is clearer, more detailed, and more persistent than what an ordinary cultivator would perceive.
- **The advantage is discoverable in-fiction.** The player may not know they have it until a teacher (Old Chen, in Scene 2) notices their unusual feedback pattern.
- **The advantage is bounded.** It applies only to the player's own attempts, only to practices that leave traceable residue, and only within the player's current realm's perception capacity.

### 5.3 Three.js implications

- **The qi-system is not a UI; it is a perception.** When the player "attends inward" (the "sense self" verb), they perceive their meridian layout, reservoir, phase-affinities, and psychospiritual state through the same cross-modal perception as ambient qi. This is rendered as an inner scene, not a stat screen.
- **The protagonist advantage is a rendering enhancement,** not a stat bonus. When the player reviews their own attempt, the residue is rendered with higher fidelity (more detail, more persistence, more clarity) than when they read others' residue.
- **Cultivation practices are long verbs,** not instant techniques. The player commits to a practice (a route, a breathing pattern, a meditative focus) and maintains it over time (minutes to hours of real-time, days to months of in-game time). The practice's effect accumulates; the player perceives the accumulation.

---

## 6. The determinism requirements

### 6.1 What must be reproducible

- **The world:** the same WorldSeed produces the same village, the same NPCs, the same history.
- **The simulation:** the same WorldSeed + the same player inputs produce the same world state at any future time.
- **The save:** a save file contains the WorldSeed, the player's inputs (as an event log), and the current world state hash. Loading the save and replaying the inputs produces the same state.
- **The hash:** the world state is hashed (SHA-256 of canonical CBOR serialization) at every checkpoint. Two runs with the same seed + same inputs produce the same hash.

### 6.2 What must NOT be deterministic

- **The player's choices.** The player can choose differently, and the world diverges.
- **The player's perception.** The player perceives what they attend to; they do not perceive everything. The perception is fallible (per Phenomenology §1.4).

### 6.3 The determinism infrastructure

Per the Three.js research (document 08):

- **RNG:** xoshiro256** + splitmix64, inline TS implementation
- **Fixed-point math:** Q32.32 ported from FixedMathSharp's design
- **Transcendentals:** custom WASM module with Cody-Waite + minimax polynomials (the single biggest determinism risk — must be built early)
- **Serialization:** CBOR (RFC 8949 deterministic encoding) via cbor-x
- **Hashing:** crypto.subtle.digest('SHA-256') for checkpoints; @noble/hashes for synchronous in-worker hashing
- **Storage:** SQLite-WASM with opfs-sahpool VFS (hot state), OPFS blobs (assets), IndexedDB (cold archive)

---

## 7. What this document enables

This document extracts every generator requirement from the lore into a single specification. A programmer could read this and begin building:

1. The seed hierarchy and RNG (§1.1)
2. The world generator (§1.2)
3. The NPC generator (§2)
4. The qi generator (§3)
5. The event generator (§4)
6. The cultivation generator (§5)
7. The determinism infrastructure (§6)

The next document (08_THREEJS_REPOSITORY_RESEARCH) compiles the Three.js ecosystem research into a single reference. The synthesis (09) ties the lore, the generator, and the Three.js systems into the smallest end-to-end prototype that would prove the engine works.
