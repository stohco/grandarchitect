# 05 — Data Schemas and Semantic Graph

**Status:** Normative. Specifies the Definition, Template, Rule, Relation, and simulation-hook types, and how the semantic graph is queried, versioned, and migrated.
**Date:** 2026-08-03

---

## 0. Scope

The engine's authored content is a *semantic graph*: nodes (Definitions) connected by typed edges (Relations), constrained by Rules, and instantiated by Templates. This graph is the parsed form of the bible (corpus-extension docs 00–49). The kernel does not know the graph's domain (sects, qi, techniques); it knows only the graph's *shape*.

This document specifies:
1. The `Definition` interface (from `src/lib/engine/definitions.ts`).
2. The `Template` interface (parameterization).
3. The `Rule` interface (constraints).
4. The `Relation` type system (typed edges).
5. The simulation-hook system (which simulation systems touch which definitions).
6. Graph queries (how plugins ask the graph questions).
7. Schema versioning and migrations.

---

## 1. The Definition interface

A Definition is a node in the authored concept graph. The existing implementation lives in `src/lib/engine/definitions.ts`; this document normative-specifies it.

```typescript
type DefinitionKind =
  | "metaphysical_essence" | "realm" | "technique" | "cultivation_practice"
  | "treasure" | "herb" | "beast" | "mineral" | "formation" | "talisman"
  | "pill" | "forging_recipe" | "manual" | "sect" | "lineage" | "location"
  | "culture" | "npc_role" | "event" | "deviation" | "institution" | "law"
  | "cosmological_feature" | "skill" | "status_effect" | "custom";

interface Definition {
  id: string;                      // namespaced: "kind.name", e.g. "essence.qi"
  kind: DefinitionKind;
  name: string;                    // English name
  nameHanzi?: string;              // original Hanzi; no pinyin with tone marks
  tags: string[];                  // free-form, for filtering
  description: string;             // one-paragraph prose
  source: string;                  // bible citation, e.g. "doc 00 §6"
  relations: Relation[];
  simulationHooks: SimulationHook[];
  renderProfile?: string;          // references a render profile asset
  version: string;                 // semver of this definition's schema
}
```

### 1.1 Standard questions (Definition)

- **Owns:** nothing at runtime. A Definition is immutable data.
- **Reads:** nothing. It is read *by* generator plugins.
- **Modifies it:** nothing at runtime. Definitions are loaded once at engine startup by `ga:lore-loader` and never mutated. (Migrations replace the whole graph; they do not patch in place.)
- **Thread:** main thread for loading; worker threads receive read-only snapshots.
- **Timing domain:** `realtime` for loading; the graph is static during `simulation`.
- **Deterministic?** Yes. The graph is a pure function of (bible, loader version, loader config). Same inputs → same graph.
- **Saved?** No. The graph is re-derived at startup. Only the *instance* state (entities, components) is saved.
- **Versioned?** Yes. Each Definition has a `version`. The graph as a whole has a `graphVersion` (the loader version).
- **Extended by plugins?** Yes. Plugins call `host.registerDefinitions(defs)` during `init`. The lore-loader plugin registers the bulk; other plugins may augment.
- **Failure?** A Definition with a duplicate ID is rejected at registration; `DefinitionConflict { id, existingProvider, newProvider }` fatal. A Definition with an unparseable `source` citation is warned (the bible citation is informational, not load-bearing).
- **Recovery?** A duplicate-ID conflict is operator-fixable (update one plugin's manifest). No auto-recovery.
- **Profiled?** The lore-loader reports parse duration and node count to the diagnostics service.
- **Debugged?** The graph is browsable via the headless API: `api.queryDefinitions(filter)`.
- **Performance budget.** Load 10,000 definitions: < 500 ms. Query by ID: < 10 µs. Query by tag: < 1 ms for 10,000 nodes.
- **Tests.**
  - `definition-load.test.ts`: load the prototype's ~200 definitions; verify count and ID uniqueness.
  - `definition-query.test.ts`: query by kind, by tag, by relation target; verify results.
  - `definition-conflict.test.ts`: two plugins register `essence.qi`; the second is rejected.
- **Reference plugin.** `ga:lore-loader` — parses the bible Markdown into `Definition[]` and registers them.
- **Behavior when absent.** If `ga:lore-loader` is absent, the graph is empty. Generator plugins that require definitions fail at `init` with `NoDefinitionsAvailable`. The engine does not run with no content.

---

## 2. The Template interface

A Template is a parameterized recipe for instantiating an entity from a Definition. Definitions carry invariants ("Burning Palm has 14/6/12 frames"); Templates carry parameters ("NPC #42 knows Burning Palm at mastery 0.3").

```typescript
interface Template<TParams = unknown> {
  id: string;                      // namespaced: "pluginId/TemplateName"
  definitionId: string;            // which Definition this instantiates
  params: TParams;                 // must be CBOR-serializable
  version: string;                 // semver of this template's schema
}
```

### 2.1 Template instantiation

A generator plugin calls:

```typescript
const entity = host.instantiate(template, ctx);
```

The kernel:
1. Looks up the template's `definitionId` in the graph.
2. Calls the definition's `instantiate(params, ctx)` hook (provided by the plugin that registered the definition's kind).
3. The hook returns an `EntityCreateSpec` (component set + initial spatial node).
4. The kernel creates the entity.

### 2.2 Template parameters

Parameters are CBOR-serializable. They must not contain functions or class instances. The schema is declared in the template's `params` and validated against the plugin's `schema` declaration (§4.7 of `03`).

### 2.3 Standard questions (Template)

- **Owns:** nothing at runtime. Templates are data.
- **Reads:** the Definition it references (to validate `params` against the definition's parameter schema).
- **Modifies it:** nothing. Templates are immutable after registration.
- **Thread:** main thread.
- **Timing domain:** `realtime` for registration; `simulation` for instantiation.
- **Deterministic?** Yes. Same template + same RNG stream = same entity.
- **Saved?** No. Templates are re-derived at startup. Instantiated entities are saved.
- **Versioned?** Yes. Each template has a `version`.
- **Extended by plugins?** Yes. Plugins call `host.registerTemplate(t)` during `init`.
- **Failure?** A template whose `definitionId` does not exist is rejected; `TemplateMissingDefinition` fatal. A template whose `params` fail schema validation is rejected; `TemplateParamsInvalid` fatal.
- **Reference plugin.** `ga:gen-settlement` — declares templates for villages, houses, and households.
- **Behavior when absent.** If no templates are registered, no entities are instantiated. The world is empty.

---

## 3. The Rule interface

A Rule is a declarative constraint the simulation must enforce. Rules are *data*, not code; a rule-evaluation plugin (`ga:rules`, future) compiles them into evaluator functions.

```typescript
interface Rule {
  id: string;                      // namespaced: "pluginId/RuleName"
  scope: "world" | "region" | "entity" | "interaction";
  predicate: string;               // expression in the rule DSL
  consequence: string;             // what happens if violated
  source: string;                  // bible citation
  version: string;
}

type RuleConsequence =
  | { kind: "forbid"; message: string }              // the action does not happen
  | { kind: "clamp"; property: string; to: string }  // the value is clamped
  | { kind: "deviation"; deviationId: string }       // a deviation is induced
  | { kind: "event"; eventType: string };            // an event is emitted
```

### 3.1 The rule DSL

The `predicate` is a small expression language:

```
predicate := comparison
comparison := expr op expr
op := "==" | "!=" | "<" | "<=" | ">" | ">=" | "in" | "contains"
expr := literal | path | func "(" args ")"
path := identifier ("." identifier)*     // e.g., "entity.realm.id"
func := "count" | "sum" | "max" | "min" | "has" | "tagged"
```

The DSL is intentionally limited. Complex logic belongs in systems, not rules. A rule that cannot be expressed in the DSL is a sign it should be a system.

### 3.2 Rule evaluation

Rules are evaluated by the `ga:rules` plugin (future). The evaluator runs:
- **World rules** once per tick (e.g., "the total qi in the world is non-negative").
- **Region rules** once per region per tick (e.g., "a region's population does not exceed carrying capacity").
- **Entity rules** once per entity per tick (e.g., "a Qi Condensation cultivator cannot split a mountain").
- **Interaction rules** on every interaction (e.g., "a mortal cannot learn a Nascent Soul technique").

### 3.3 Standard questions (Rule)

- **Owns:** nothing. Rules are data.
- **Reads:** the entity/region/world state at evaluation time.
- **Modifies it:** nothing. Rules evaluate; consequences are applied by systems.
- **Thread:** main thread (evaluation is fast).
- **Timing domain:** `simulation`.
- **Deterministic?** Yes. Same state + same rules = same consequences.
- **Saved?** No. Rules are re-derived at startup.
- **Versioned?** Yes. Each rule has a `version`.
- **Extended by plugins?** Yes. `host.registerRule(r)`.
- **Failure?** A rule whose `predicate` does not parse is rejected; `RulePredicateInvalid` fatal. A rule that throws at evaluation is marked `failed` and skipped; `RuleEvaluationFailed` warn.
- **Reference plugin.** `ga:rules-demo` — declares a "mortal lifespan ≤ 60" rule and evaluates it on every entity.
- **Behavior when absent.** If `ga:rules` is absent, no rules are evaluated. The simulation runs unconstrained. This is allowed (rules are optional) but discouraged for production.

---

## 4. The Relation type system

A Relation is a typed edge between two Definitions.

```typescript
interface Relation {
  type: string;                    // e.g., "PREREQUISITE_FOR", "OPPOSES"
  target: string;                  // Definition ID
  note?: string;                   // free-form annotation
  weight?: number;                 // 0–1, for weighted relations
}
```

### 4.1 Canonical relation types

The kernel does not enforce a fixed set of relation types — plugins may declare new ones. However, the following canonical types are reserved and have defined semantics:

| Type | Meaning | Inverse |
|---|---|---|
| `PREREQUISITE_FOR` | A is required before B can be acquired | `REQUIRES` |
| `REQUIRES` | B requires A | `PREREQUISITE_FOR` |
| `EVOLVES_INTO` | A progresses to B | `EVOLVES_FROM` |
| `EVOLVES_FROM` | B evolved from A | `EVOLVES_INTO` |
| `OPPOSES` | A and B are in tension | `OPPOSES` (symmetric) |
| `COMPATIBLE_WITH` | A and B work well together | `COMPATIBLE_WITH` (symmetric) |
| `GENERATES` | A generates B (five-phase cycle) | `GENERATED_BY` |
| `CONQUERS` | A conquers B (five-phase cycle) | `CONQUERED_BY` |
| `TRANSFORMS` | A transforms into B | `TRANSFORMED_FROM` |
| `COUNTERS` | A counters B (deviation/practice) | `COUNTERED_BY` |
| `PART_OF` | A is a sub-component of B | `CONTAINS` |
| `VASSAL_OF` | A is a vassal of B (institutions) | `VASSAL_CONTAINS` |
| `ENHANCES` | A enhances B | `ENHANCED_BY` |

### 4.2 Relation integrity

The lore-loader verifies relation integrity at load time:
- `target` must be a registered Definition ID.
- Symmetric relations (e.g., `OPPOSES`) should have a matching reverse edge; a missing reverse is a `warn`, not an error (asymmetry may be intentional).
- Weighted relations must have `weight ∈ [0, 1]`; out-of-range is a `warn`.

### 4.3 Custom relation types

Plugins may declare custom relation types via `host.registerRelationType(decl)`:

```typescript
interface RelationTypeDecl {
  type: string;
  pluginId: PluginId;
  inverse?: string;
  symmetric: boolean;
  description: string;
}
```

Custom types must be namespaced (`pluginId:TypeName`) to avoid collision with canonical types.

### 4.4 Standard questions (Relation)

- **Owns:** nothing. Relations are part of Definitions.
- **Reads:** the Definition graph.
- **Modifies it:** nothing. Relations are immutable after load.
- **Thread:** main thread.
- **Timing domain:** `realtime` for load; `simulation` for queries.
- **Deterministic?** Yes.
- **Saved?** No.
- **Versioned?** Via the Definition's `version`.
- **Extended by plugins?** Yes, via `registerRelationType`.
- **Failure?** A relation pointing to a non-existent target is `warn` (the graph may have a missing node).
- **Reference plugin.** `ga:lore-loader` (registers canonical relations); `ga:custom-relations-demo` (registers a custom type).

---

## 5. The simulation-hook system

A Definition declares which simulation systems touch it via `simulationHooks`:

```typescript
type SimulationHook =
  | "ecology" | "weather" | "combat" | "economy" | "cultivation"
  | "deviation" | "social" | "history" | "rendering" | "audio"
  | "physics" | "perception" | "save" | "migration" | "trade"
  | "politics" | "ritual" | "disease" | "aging" | "reproduction";
```

### 5.1 Hook semantics

A `simulationHook` is a *claim* by the definition: "I participate in this simulation domain." The corresponding plugin (e.g., `ga:ecology` for `ecology`) registers a handler for that hook. When a system iterates entities, it asks the graph "which definitions of kind X have hook Y?" and processes them.

### 5.2 Hook registration

```typescript
host.registerSimulationHookHandler({
  hook: "ecology",
  pluginId: "ga:ecology",
  handle(def: Definition, entity: Entity, ctx: SystemContext): void,
});
```

A hook may have only one handler per session (last-registered wins; earlier is quiesced). This prevents two ecology plugins from both touching the same entity.

### 5.3 Standard questions (SimulationHook)

- **Owns:** nothing. Hooks are part of Definitions.
- **Reads:** the Definition graph (to find entities with a given hook).
- **Modifies it:** nothing.
- **Thread:** main thread (hook handlers run in the system's thread).
- **Timing domain:** `simulation`.
- **Deterministic?** Yes, if the handler is deterministic.
- **Saved?** No.
- **Versioned?** Via the Definition's `version`.
- **Extended by plugins?** Yes, via `registerSimulationHookHandler`. Custom hook names must be namespaced.
- **Failure?** A hook with no handler is `warn` (the definition claims participation but no plugin handles it). A handler that throws is `SystemCrashed` (treated like a system failure).
- **Reference plugin.** `ga:ecology-demo` — handles the `ecology` hook for herb definitions.

---

## 6. Graph queries

Plugins query the graph via the `DefinitionGraph` capability:

```typescript
interface DefinitionGraph {
  get(id: string): Definition | undefined;
  list(filter?: DefinitionFilter): Definition[];
  queryRelations(from: string, type?: string): Relation[];
  queryReverseRelations(target: string, type?: string): Relation[];
  hasHook(defId: string, hook: SimulationHook): boolean;
  listByHook(hook: SimulationHook, kind?: DefinitionKind): Definition[];
  traverse(start: string, edgeTypes: string[], maxDepth: number): Definition[];
  graphVersion(): string;
}

interface DefinitionFilter {
  kind?: DefinitionKind | DefinitionKind[];
  tags?: string[];                 // AND: must have all tags
  tagAny?: string[];               // OR: must have at least one tag
  hasHook?: SimulationHook;
  sourcePrefix?: string;           // e.g., "doc 04"
}
```

### 6.1 Query determinism

Queries return results in a deterministic order: sorted by Definition ID (alphabetical). This is critical for systems that iterate query results in a tight loop — order must not vary across runs.

### 6.2 Performance

- `get(id)`: O(1), backed by a `Map`.
- `list(filter)`: O(n) over the filtered set; the graph maintains tag and kind indices for O(1) lookup of candidate sets.
- `queryRelations`: O(degree) of the source node.
- `traverse`: O(branching^depth). Capped at `maxDepth` to prevent runaway traversal.

### 6.3 Caching

The graph is immutable after load. Queries are memoized per (filter, sort) tuple. The cache is invalidated only when the graph itself is replaced (which happens only at session boundary, never mid-session).

---

## 7. How definitions reference each other

The reference mechanism is string IDs, not object references. This is intentional:

1. **Decoupling.** A Definition does not import the Definition it references; it names it. The graph loader resolves names to objects.
2. **Serialization.** String IDs are CBOR-friendly. Object references would require cycle handling.
3. **Stability.** A Definition's ID is stable across versions; its internal structure is not.

### 7.1 Reference integrity

At load time, the lore-loader builds an ID → Definition map. Every `Relation.target` is checked against this map. A dangling reference (target ID not in the map) is a `warn`, not an error: the graph may be loaded partially (e.g., during development when some definitions are not yet authored).

### 7.2 Reference queries

`queryRelations(from, type)` returns the Relations on `from`'s definition, optionally filtered by type. `queryReverseRelations(target, type)` returns the Relations pointing *to* `target`. The graph maintains a reverse index for this.

---

## 8. Schema versioning

### 8.1 Definition versioning

Each Definition has a `version: string` (semver). A definition's version is bumped when its *shape* changes (new required field, removed field, type change). Editorial changes (description wording, tag additions) do not bump the version.

### 8.2 Graph versioning

The graph as a whole has a `graphVersion: string`, derived from the loader's version and the set of definition versions it loaded. This is part of the determinism fingerprint's `serialization` component.

### 8.3 Save compatibility

A save's fingerprint includes the graph version. Loading a save with a different graph version requires a *definition migration* (see §9). If no migration is registered, the load fails with `DefinitionGraphIncompatible`.

---

## 9. Migrations

A migration upgrades data from an older schema to a newer one. Two kinds:

### 9.1 Definition migrations

A definition migration transforms a Definition object from version A to version B. It is a pure function:

```typescript
interface DefinitionMigration {
  pluginId: PluginId;
  definitionId: string;            // which definition this migrates
  from: string;                    // semver
  to: string;                      // semver
  migrate(def: Definition): Definition;
}
```

Definition migrations run at graph load time, before any plugin queries the graph. They are chained: v0.1 → v0.2 → v0.3.

### 9.2 Instance migrations

An instance migration transforms saved entity/component state from an older plugin version to a newer one. See `03` §4.9.

### 9.3 Migration declaration

Migrations are declared in the plugin's manifest:

```typescript
interface MigrationDeclaration {
  pluginId: PluginId;
  kind: "definition" | "instance";
  from: string;
  to: string;
  target: string;                  // definition ID (for definition) or component type ID (for instance)
}
```

The kernel builds a migration graph at startup: nodes are versions, edges are migrations. If a save's version is not reachable from the current version via a chain of migrations, the load fails.

### 9.4 Migration failure

A migration that throws is fatal: `MigrationFailed { pluginId, from, to, error }`. The load is aborted. The operator must fix the migration or downgrade.

Migrations must be deterministic. A migration that calls `Math.random()` or reads wall-clock time is a determinism violation (invariant 4.1) and is rejected in dev mode.

---

## 10. The generation pipeline

The semantic graph is consumed by generator plugins to produce world state. The pipeline is staged:

```
Stage 0: ga:gen-cosmology      (consumes: cosmological_feature, metaphysical_essence)
   |    produces: stratum topology, spirit veins, grotto-heavens
   v
Stage 1: ga:gen-geography      (consumes: location, cosmological_feature)
   |    produces: terrain, rivers, climate
   v
Stage 2: ga:gen-settlement     (consumes: location, culture, npc_role)
   |    produces: villages, buildings, households
   v
Stage 3: ga:gen-npc            (consumes: npc_role, lineage, sect)
   |    produces: named NPCs with schedules, relationships
   v
Stage 4: ga:gen-ecology        (consumes: herb, beast, mineral, essence)
   |    produces: spirit flora, fauna, qi topology
   v
Stage 5: ga:gen-economy        (consumes: location, culture, institution)
   |    produces: markets, trade routes, prices
   v
Stage 6: ga:gen-institution    (consumes: sect, lineage, institution, law)
   |    produces: sects, academies, temples
   v
Stage 7: ga:gen-event          (consumes: event, culture)
        produces: scheduled events, golden scenes
```

Each stage is a generator plugin (§4.10 of `03`). Stages declare `requires` (prior stage IDs) and `produces` (output schema). The generator scheduler runs them in topological order.

### 10.1 Stage determinism

Each stage receives a deterministic RNG stream (derived from the world seed + stage name). Same seed + same graph + same stage code = same output. The output is hashable for verification.

### 10.2 Stage failure

A stage that throws is fatal: `GeneratorStageFailed { stageId, error }`. The world is not created. The operator must fix the stage or remove it from the pipeline.

A stage that produces invalid output (failing its `produces` schema) is fatal: `GeneratorOutputInvalid`.

### 10.3 Standard questions (Generator stage)

- **Owns:** the entity set it produces.
- **Reads:** the Definition graph, prior stages' outputs, the world seed.
- **Modifies it:** the generator scheduler (advancing through stages).
- **Thread:** main thread (stages run sequentially; their internal work may parallelize via the job system).
- **Timing domain:** `realtime` (generation happens once at world creation).
- **Deterministic?** Yes. Same seed + same graph + same stage code = same output.
- **Saved?** The output (entities) is saved as part of the world state. The pipeline itself is not saved; it is re-runnable.
- **Versioned?** Via the plugin's manifest version.
- **Extended by plugins?** Yes, via `host.registerGeneratorStage(stage)`.
- **Profiled?** Per-stage duration is reported to diagnostics.
- **Debugged?** The headless API exposes `api.runGeneratorStage(stageId, seed)` for isolated testing.
- **Performance budget.** Full world generation (all 8 stages): < 5 s for a region the size of the Cangli Riverlands.
- **Tests.**
  - `generator-determinism.test.ts`: same seed → same entity set (hashable).
  - `generator-stage-failure.test.ts`: a stage that throws aborts the pipeline.
- **Reference plugin.** `ga:gen-settlement` — produces Wang Family Bend from the bible's doc 04.

---

## 11. Failure cases (consolidated)

| Failure | Detection | Response |
|---|---|---|
| Duplicate Definition ID | Registration | Fatal: `DefinitionConflict` |
| Dangling Relation target | Load time | Warn (graph may be partial) |
| Template missing Definition | Registration | Fatal: `TemplateMissingDefinition` |
| Template params invalid | Registration | Fatal: `TemplateParamsInvalid` |
| Rule predicate unparseable | Registration | Fatal: `RulePredicateInvalid` |
| Rule evaluation throws | Runtime | Warn; skip rule |
| Simulation hook with no handler | Load time | Warn (definition claims participation, no plugin handles) |
| Hook handler throws | Runtime | `SystemCrashed` |
| Definition migration missing | Load time | Fatal: `MigrationMissing` |
| Definition migration throws | Load time | Fatal: `MigrationFailed` |
| Generator stage throws | Generation | Fatal: `GeneratorStageFailed` |
| Generator output invalid | Generation | Fatal: `GeneratorOutputInvalid` |
| Graph version mismatch on save load | Load time | Fatal: `DefinitionGraphIncompatible` (or run migrations) |

---

## 12. Rejected alternatives

| Alternative | Why rejected |
|---|---|
| Object references instead of string IDs for Relations | Breaks serialization; introduces cycle handling; less stable across versions. |
| A fixed enumeration of Relation types (no custom) | Stifles domain extension. Plugins must be able to declare new relation types. |
| Rules as TypeScript code instead of a DSL | Code is hard to validate, hard to migrate, and couples the bible to the engine build. Data is decoupled. |
| A full first-order logic DSL for rules | Overkill. The simple comparison DSL handles 95% of cases; complex logic belongs in systems. |
| Mutable Definitions (plugins patch them at runtime) | Breaks determinism (graph changes mid-session); breaks save compatibility reasoning. |
| Graph stored in a database (IndexedDB) instead of in-memory | Slower query; the graph is small enough (10,000 nodes target) to fit in memory. Database is for saves, not configuration. |
| Definitions reference Templates directly | Inverts the dependency: Templates depend on Definitions, not the reverse. |
| Hot-reload of the graph mid-session | Breaks determinism. The graph is loaded once at session start. |
| Generator stages that mutate the graph | The graph is authored; generators produce entities, not definitions. |

---

## 13. What this document unlocks

- The lore-loader plugin has a defined contract: parse the bible into `Definition[]`, register them, declare relation types and simulation-hook handlers.
- Generator plugins have a defined input: the Definition graph, accessed via `DefinitionGraph`.
- The save system has a defined compatibility boundary: the graph version is part of the fingerprint.
- The determinism service has a defined scope: the graph is immutable during simulation, so it does not participate in checkpoints (only entities do).

The graph is the configuration. The next document specifies the contract that makes the configuration *expressible* across browsers and centuries.
