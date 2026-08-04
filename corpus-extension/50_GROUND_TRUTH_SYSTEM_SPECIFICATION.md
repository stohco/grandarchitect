# 50 — Ground Truth System Specification

**Status:** `[CANON]` Canonical invariant. Defines how the bible itself is structured, classified, and validated.

**Implements:** `engine-architecture/51_MULTIVERSE_GROUND_TRUTH_ARCHITECTURE.md`

---

## §1. Truth-Level Annotation Protocol

Every claim must be prefixed with one of five markers: `[CANON]`, `[DERIVED]`, `[ART]`, `[PROC]`, `[UNRESOLVED]`.

```markdown
> [CANON] The Cangli Riverlands occupy a basin approximately 120 km north-south.
> [DERIVED] Settlements must be within 4 km of a navigable waterway.
> [ART] The visual palette is muted earth tones with jade-green accents.
> [PROC] Village populations range from 40 to 380 souls depending on seed.
> [UNRESOLVED] Whether the southern ridge contains a dormant spirit-vein node.
```

Every `[UNRESOLVED]` tag must appear in a central registry: `/questions/unresolved.yaml`. The Grand Architect checks this registry before making any assumption.

## §2. The 20-Question Template

Every bible document describing a physical thing, place, creature, or technique must answer: What is it? Why does it exist? What is its scale? Proportions? Made from? Constructed how? Looks how? Moves how? How fast? Sounds how? Interacts with light? Terrain? Living beings? Changes over time? Permitted variations? Forbidden representations? Required engine capabilities? Required assets? Procedural systems? How validated? What's unresolved?

## §3. Document Structure Standard

Every bible document: Status (truth level), Implements (architecture docs), Dependencies, then sections with truth-level blockquotes, PhysicalSpecification blocks, Visual Truth Packet fields, MotionProfile blocks, Forbidden Interpretations, Acceptance Tests, Unresolved Questions, Implementation Dependencies.

## §4. Machine-Readable Counterpart Standard

Every prose document with physical data must have a JSON counterpart. Path mapping: `corpus-extension/14_ECOLOGY_AND_QI.md` → `data/ecology-and-qi.json`. Each JSON entry includes: id, name, truthLevel, physical (PhysicalSpecification), provenance (sourceDoc, sourceSection, definitionsInfluenced, generator, seed, compromises, validationResults), validation (acceptanceTests, goldenScenes, oracleChecks), unresolved.

## §5. Status Classification Standard

`[SPEC]` → `[PROXY]` → `[PROTO]` → `[APPROX]` → `[CANDIDATE]` → `[VALIDATED]`. Or `[REJECTED]` / `[BLOCKED]`. A `[PROXY]` may never be marked `[VALIDATED]` without passing through `[CANDIDATE]`. An `[APPROX]` must document exactly which requirements are compromised. A `[BLOCKED]` must name the missing capability.

## §6. Contradiction Detection Rules

Scale: room cannot be larger than building. Travel-time: distance/speed must be consistent. Anatomical: wingspan must clear habitat geometry. Architectural: rooms must be accessible through doors wide enough for occupants. Temporal: technique speed must agree with animation timing. Style: asset style grammar must match region/era.

## §7. Provenance Chain

Source truth (canon) → specification (prose + schema) → blueprint (semantic parts) → implementation (code/asset) → generated instance (runtime) → rendered presentation (screen) → validation evidence (test results). The Grand Architect can click anything and ask "why does this look the way it does?" The provenance chain provides the full answer.

## §8. Retrofitting Plan

Tier 1 (foundation): docs 00, 03, 04, 14. Tier 2 (world structure): docs 36, 42, 43, 33. Tier 3 (entities): docs 34, 13, 12, 16. Tier 4 (systems): docs 18, 27, 32. Each retrofit adds: truth-level markers, PhysicalSpecification blocks, VTP fields, forbidden-interpretation lists, status classifications, provenance links.

## §9. Validation Gate

No bible document is "complete" until: all applicable 20 questions answered; every claim has truth-level marker; physical measurements use SI units with confidence levels; forbidden interpretations listed; machine-readable JSON counterpart exists; acceptance tests defined; unresolved questions registered; implementation status classified; provenance chain documented; contradiction detection passes.

## §10. Claim-Level Records (Redesign)

Document-level annotation is insufficient. Every significant claim must have a claim-level record with: stable claim ID, truth level, exact statement, source/provenance, confidence, dependencies, applicable systems, contradictions, approval status. See `src/engine/architect/rcvc/claims/schema.ts` for the schema.
