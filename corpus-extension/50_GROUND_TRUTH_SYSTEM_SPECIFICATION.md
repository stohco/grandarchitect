# 50 — Ground Truth System Specification

**Status:** `[CANON]` Canonical invariant. This document defines how the bible itself is structured, classified, and validated. All 48 existing corpus documents must be retrofitted to conform.

**Purpose:** Transform the bible from ordinary prose into a multiverse ground-truth system. Every claim is classified, measured, machine-readable, and testable.

**Implements:** `engine-architecture/51_MULTIVERSE_GROUND_TRUTH_ARCHITECTURE.md`

---

## §1. Truth-Level Annotation Protocol

Every claim, paragraph, or data point in every bible document must be prefixed with one of five truth-level markers:

### Markers

| Marker | Markdown | Meaning |
|--------|----------|---------|
| `[CANON]` | `> [CANON]` | Canonical invariant — cannot change without formally revising the universe |
| `[DERIVED]` | `> [DERIVED]` | Derived requirement — logically follows from canon |
| `[ART]` | `> [ART]` | Art-direction decision — deliberate visual/experiential choice |
| `[PROC]` | `> [PROC]` | Procedural possibility — valid range for generated instances |
| `[UNRESOLVED]` | `> [UNRESOLVED]` | Unresolved question — must not be silently invented |

### Annotation format

Use blockquotes with the marker as the first token:

```markdown
> [CANON] The Cangli Riverlands occupy a basin approximately 120 km north-south
> and 60 km east-west at the widest point.

> [DERIVED] Settlements in the riverlands must be within 4 km of a navigable
> waterway, following the feng-shui water-facing principle.

> [ART] The visual palette is muted earth tones with jade-green accents.

> [PROC] Village populations range from 40 to 380 souls depending on seed.

> [UNRESOLVED] Whether the southern ridge contains a dormant spirit-vein node.
```

### Unresolved-question registry

Every `[UNRESOLVED]` tag must also appear in a central registry: `/questions/unresolved.yaml`. The Grand Architect checks this registry before making any assumption. An unresolved question is never silently resolved.

---

## §2. The 20-Question Template

Every bible document that describes a physical thing, place, creature, or technique must answer the following 20 questions. An entry is incomplete until all applicable questions have answers.

```markdown
## [Subject Name]

### 1. What is it?
[One-paragraph identity]

### 2. Why does it exist?
[Narrative purpose, world-role, origin]

### 3. What is its scale?
[PhysicalSpecification: dimensions, mass, range, confidence]

### 4. What are its proportions?
[Ratio system, head-to-body, width-to-height, etc.]

### 5. What is it made from?
[Materials with physical properties]

### 6. How is it constructed or formed?
[Build sequence, geological formation, biological growth]

### 7. How does it look?
[Visual Truth Packet: silhouette, color, value, lighting response]

### 8. How does it move?
[MotionProfile: idle, acceleration, max speed, turn rate]

### 9. How fast does it move?
[Explicit m/s, rad/s, with ranges]

### 10. How does it sound?
[Audio profile: frequency, reverb, directional, ambient]

### 11. How does it interact with light?
[Material BRDF summary, emissive, shadow casting, transmission]

### 12. How does it interact with terrain?
[Footing, erosion, modification, collision]

### 13. How does it interact with living beings?
[Ecological role, domestication, hostility, symbiosis]

### 14. How does it change over time?
[Aging, weathering, seasonal, cultivation stages]

### 15. What variations are permitted?
[PROC ranges: regional, seed-dependent, cultural]

### 16. What representations are forbidden?
[Explicit "do not represent as..." list]

### 17. What engine capabilities does it require?
[Plugin/capability IDs from the registry]

### 18. What assets does it require?
[Mesh, texture, animation, audio asset references]

### 19. What procedural systems can alter it?
[Generator IDs and their parameters]

### 20. How is it validated?
[Acceptance test IDs, golden scenes, oracle checks]
```

---

## §3. Document Structure Standard

Every bible document follows this structure:

```markdown
# NN — [Title]

**Status:** [Candidate canon | Canonical invariant | Derived]
**Truth level:** [Overall classification for the document]
**Implements:** [Architecture docs this serves]
**Depends on:** [Other corpus docs this requires]

---

## §1. [Section]

> [CANON] ...

> [DERIVED] ...

> [PROC] ...

> [UNRESOLVED] ...

## §2. [Section]
...

## Physical Specification
[PhysicalSpecification block in code fence]

## Visual Truth Packet
[VTP fields]

## Motion Profile
[MotionProfile block if applicable]

## Forbidden Interpretations
- ...

## Acceptance Tests
- ...

## Unresolved Questions
- [Linked to /questions/ registry]

## Implementation Dependencies
- [Capability IDs]
```

---

## §4. Machine-Readable Counterpart Standard

Every prose document with physical data must have a JSON counterpart.

### Path mapping

| Prose | Data |
|-------|------|
| `corpus-extension/14_ECOLOGY_AND_QI.md` | `data/ecology-and-qi.json` |
| `corpus-extension/04_MORTAL_SUBSTRATE.md` | `data/mortal-substrate.json` |
| `corpus-extension/43_HOLY_LANDS_AND_GREAT_SECTS.md` | `data/holy-lands.json` |

### JSON schema

```json
{
  "docId": "14_ECOLOGY_AND_QI",
  "title": "Ecology and Qi Topology",
  "truthLevel": "canonical-invariant",
  "lastValidated": "2026-08-04",
  "entries": [
    {
      "id": "spirit-vein-northern-cangli",
      "name": "Northern Cangli Spirit Vein",
      "truthLevel": "CANON",
      "physical": {
        "dimensions": { "lengthMeters": { "min": 8000, "max": 12000, "typical": 10000 } },
        "depthMeters": { "min": 20, "max": 80, "typical": 45 },
        "measurementConfidence": "derived",
        "rationale": "Inferred from ley-line survey in doc 14"
      },
      "provenance": {
        "sourceDoc": "14_ECOLOGY_AND_QI.md",
        "sourceSection": "§3.2",
        "definitionsInfluenced": ["spirit-vein", "qi-topology"],
        "generator": null,
        "seed": null
      },
      "validation": {
        "acceptanceTests": ["ecology.spirit-vein.continuity", "ecology.spirit-vein.depth-range"],
        "goldenScenes": ["neutral-scale-studio", "outdoor-noon"],
        "oracleChecks": ["scale-correct", "collision-aligned"]
      },
      "unresolved": []
    }
  ]
}
```

---

## §5. Status Classification Standard

Every described thing must carry an implementation status:

| Status | When to use |
|--------|-------------|
| `[SPEC]` | Fully described in prose + schema, but no implementation exists |
| `[PROXY]` | Temporary placeholder — a stand-in until the real asset/system is built |
| `[PROTO]` | Working prototype demonstrates the concept but is not production-ready |
| `[APPROX]` | Deliberately compromises one or more requirements (documented) |
| `[CANDIDATE]` | Believed complete; awaiting validation |
| `[VALIDATED]` | All acceptance tests pass; user-approved; ready for production |
| `[REJECTED]` | Failed validation; must be revised |
| `[BLOCKED]` | Cannot be produced correctly with current engine capabilities |

### Transition rules

- A `[PROXY]` may never be marked `[VALIDATED]` without passing through `[CANDIDATE]`.
- An `[APPROX]` must document exactly which requirements are compromised.
- A `[BLOCKED]` must name the missing capability and link to a capability-gap request.
- The Grand Architect must refuse to mark anything `[VALIDATED]` while critical oracle failures remain.

---

## §6. Contradiction Detection Rules

The bible validator runs on every change and checks for:

### Scale contradictions
- A building described as 5 m wide cannot contain a room described as 8 m wide.
- A creature described as 2 m tall cannot have a stride length of 5 m.

### Travel-time contradictions
- If settlement A is 50 km from settlement B, and walking speed is 1.3 m/s, travel time must be ≥ 10.7 hours. A description claiming "a two-hour walk" is a contradiction.

### Anatomical contradictions
- A creature's wingspan must clear nearby geometry in its habitat.
- A creature's mass must be supportable by its limb cross-section (unless supernatural exception is filed).

### Architectural contradictions
- Rooms must be accessible through doors wide enough for their occupants.
- Settlements must have sufficient water and food for their population.

### Temporal contradictions
- A technique's stated speed must agree with its animation timing.
- A cultivation breakthrough's stated duration must agree with the simulation tick rate.

### Style contradictions
- An asset's style grammar must match its region/era. A Northern Cloud Monastery building with gold palace surfaces is a contradiction.

---

## §7. Provenance Chain

Every described thing must trace its lineage:

```
Source truth (canon)
  → specification (prose + schema)
    → blueprint (semantic parts)
      → implementation (code/asset)
        → generated instance (runtime)
          → rendered presentation (screen)
            → validation evidence (test results)
```

### Provenance fields

Every JSON entry includes:

```json
{
  "provenance": {
    "sourceDoc": "14_ECOLOGY_AND_QI.md",
    "sourceSection": "§3.2",
    "definitionsInfluenced": ["spirit-vein", "qi-topology"],
    "styleGrammar": "cangli-riverlands",
    "generator": "ga:gen-ecology",
    "seed": "wang-family-bend-1108",
    "compromises": [],
    "validationResults": "evidence-2026-08-04.json"
  }
}
```

The Grand Architect can click anything in the world and ask "why does this look the way it does?" The provenance chain provides the full answer.

---

## §8. Retrofitting Plan for Existing Documents

All 48 existing corpus documents must be retrofitted. Priority order:

### Tier 1 — Foundation (retrofit first)
1. `00_FOUNDATIONAL_DECISIONS.md` — add truth levels to every decision
2. `04_MORTAL_SUBSTRATE.md` — add PhysicalSpecification for terrain, settlement, population
3. `14_ECOLOGY_AND_QI.md` — add VTP for spirit veins, biomes, qi topology
4. `03_REALM_LADDER.md` — add MotionProfile and PhysicalSpecification for each realm tier

### Tier 2 — World structure
5. `36_COSMIC_GEOGRAPHY.md` — add scale anchors for worlds, continents, celestial bodies
6. `42_THE_MORTAL_WORLDS_CONTINENTS.md` — add PhysicalSpecification for continents
7. `43_HOLY_LANDS_AND_GREAT_SECTS.md` — add architecture packets for sect complexes
8. `33_CANGWU_MOUNTAINS_ECOLOGY.md` — add biome packets

### Tier 3 — Entities
9. `34_NAMED_NPCS_AND_COMPANIONS.md` — add character packets
10. `13_COMBAT_GRAMMAR.md` — add technique packets with MotionProfiles
11. `12_SECT_INSTITUTIONS.md` — add architecture packets
12. `16_FORMATIONS_TALISMANS_ALCHEMY.md` — add effect packets

### Tier 4 — Systems
13. `18_ECONOMY_SYSTEM.md` — add measurement specs for trade goods
14. `27_CULTIVATION_SYSTEMS.md` — add MotionProfile for breakthrough events
15. `32_POWER_SCALING_AND_PHASE_COMBAT.md` — add technique packets

Each retrofit adds: truth-level markers, PhysicalSpecification blocks, VTP fields, forbidden-interpretation lists, status classifications, and provenance links.

---

## §9. Validation Gate

No bible document is considered "complete" until:

- [ ] All applicable 20 questions have answers
- [ ] Every claim has a truth-level marker
- [ ] Physical measurements use SI units with confidence levels
- [ ] Forbidden interpretations are explicitly listed
- [ ] Machine-readable JSON counterpart exists (if physical data is present)
- [ ] Acceptance tests are defined
- [ ] Unresolved questions are registered
- [ ] Implementation status is classified
- [ ] Provenance chain is documented
- [ ] Contradiction detection passes

The Grand Architect enforces this gate. A document that fails the gate is marked `[SPEC]` and cannot be used to generate `[VALIDATED]` content.
